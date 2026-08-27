import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import type { GridCell } from '../src/combat/grid';
import { combatantId, type CombatantId } from '../src/combat/values';
import {
  arenaCombatant,
  arenaMonsterActions,
  arenaPathCost,
  arenaReachCheck,
  arenaTokenPosition,
  declareArenaIntent,
  type ArenaIntent,
  type ArenaIntentChoice,
} from '../src/vtt/arena-legality';

const MCP_PROTOCOL_VERSION = '2025-03-26';

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id?: JsonRpcId;
  readonly method: string;
  readonly params?: unknown;
}

interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
}

interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

const CELL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['column', 'row'],
  properties: {
    column: { type: 'integer', minimum: 0 },
    row: { type: 'integer', minimum: 0 },
  },
} as const;

const INTENT_CHOICE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'targetId', 'maxMovementFeet', 'acceptMelee'],
  properties: {
    action: { type: 'string', minLength: 1 },
    targetId: { type: 'string', minLength: 1 },
    maxMovementFeet: { type: 'integer', minimum: 0, multipleOf: 5 },
    acceptMelee: { type: 'boolean' },
  },
} as const;

export const ENGINE_MCP_TOOLS: readonly McpTool[] = [
  {
    name: 'state_summary',
    description: 'Summarize combatants, hit points, positions, terrain, and the current round.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'combatant_options',
    description: 'List a combatant statblock actions, movement budget, and current constraints.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id'],
      properties: { id: { type: 'string', minLength: 1 } },
    },
  },
  {
    name: 'path_cost',
    description: 'Resolve the terrain- and occupancy-aware path cost to a grid cell.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'to'],
      properties: {
        id: { type: 'string', minLength: 1 },
        to: CELL_SCHEMA,
      },
    },
  },
  {
    name: 'reach_check',
    description: 'Check whether a named statblock action can reach a hostile target now.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'targetId', 'action'],
      properties: {
        id: { type: 'string', minLength: 1 },
        targetId: { type: 'string', minLength: 1 },
        action: { type: 'string', minLength: 1 },
      },
    },
  },
  {
    name: 'declare_intent',
    description: 'Validate and geometrically resolve a primary combat intent and declarative fallback without mutating state.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'intent'],
      properties: {
        id: { type: 'string', minLength: 1 },
        intent: {
          ...INTENT_CHOICE_SCHEMA,
          required: [...INTENT_CHOICE_SCHEMA.required, 'fallback'],
          properties: {
            ...INTENT_CHOICE_SCHEMA.properties,
            fallback: { oneOf: [{ type: 'null' }, INTENT_CHOICE_SCHEMA] },
          },
        },
      },
    },
  },
] as const;

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function stringField(value: Readonly<Record<string, unknown>>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string' || field.trim().length === 0) {
    throw new TypeError(`${key} must be a non-empty string.`);
  }
  return field;
}

function integerField(value: Readonly<Record<string, unknown>>, key: string): number {
  const field = value[key];
  if (!Number.isSafeInteger(field)) throw new TypeError(`${key} must be a safe integer.`);
  return field as number;
}

function booleanField(value: Readonly<Record<string, unknown>>, key: string): boolean {
  const field = value[key];
  if (typeof field !== 'boolean') throw new TypeError(`${key} must be a boolean.`);
  return field;
}

function decodeCell(value: unknown): GridCell {
  const candidate = record(value, 'to');
  return { column: integerField(candidate, 'column'), row: integerField(candidate, 'row') };
}

function decodeIntentChoice(value: unknown, label: string): ArenaIntentChoice {
  const candidate = record(value, label);
  return {
    action: stringField(candidate, 'action'),
    targetId: stringField(candidate, 'targetId'),
    maxMovementFeet: integerField(candidate, 'maxMovementFeet'),
    acceptMelee: booleanField(candidate, 'acceptMelee'),
  };
}

export function decodeArenaIntent(value: unknown): ArenaIntent {
  const candidate = record(value, 'intent');
  const fallback = candidate['fallback'];
  if (fallback === undefined) throw new TypeError('intent.fallback is required.');
  return {
    ...decodeIntentChoice(candidate, 'intent'),
    fallback: fallback === null ? null : decodeIntentChoice(fallback, 'intent.fallback'),
  };
}

function stateSummary(state: EncounterState): unknown {
  return {
    round: state.round,
    bounds: state.bounds,
    combatants: state.combatants.map((subject) => ({
      id: subject.profile.id,
      name: subject.profile.name,
      side: subject.profile.kind,
      hitPoints: subject.hitPoints,
      hitPointMaximum: subject.profile.rules.hitPointMaximum,
      life: subject.life,
      position: arenaTokenPosition(state, subject.profile.id),
    })),
    terrainFeatures: {
      blockedCells: state.blockedCells,
      difficultTerrain: state.environment.difficultTerrainRegions,
      worldObjects: state.worldObjects.map((object) => ({
        id: object.id,
        name: object.name,
        kind: object.kind,
        footprint: object.footprint,
        blocksMovement: object.blocking.movement,
      })),
    },
  };
}

function combatantOptions(state: EncounterState, id: CombatantId): unknown {
  const subject = arenaCombatant(state, id);
  if (subject === null) return { legal: false, refusals: [`${id}: combatant is absent`] };
  return {
    legal: true,
    id,
    actions: arenaMonsterActions(state, id),
    movementBudget: subject.profile.rules.speed,
    currentConstraints: {
      life: subject.life,
      placed: arenaTokenPosition(state, id) !== null,
      effects: state.effects
        .filter((effect) => effect.targets.includes(id))
        .map((effect) => ({ id: effect.id, kind: effect.payload.kind })),
      pendingDecisions: state.pendingDecisions
        .filter((decision) => decision.combatant === id)
        .map((decision) => ({ id: decision.id, kind: decision.kind })),
    },
  };
}

export function callEngineTool(
  state: EncounterState,
  name: string,
  argumentsValue: unknown,
): unknown {
  const args = record(argumentsValue, `${name} arguments`);
  switch (name) {
    case 'state_summary': return stateSummary(state);
    case 'combatant_options': return combatantOptions(state, combatantId(stringField(args, 'id')));
    case 'path_cost': {
      const id = combatantId(stringField(args, 'id'));
      const destination = decodeCell(args['to']);
      const path = arenaPathCost(state, id, destination);
      return path === null
        ? { legal: false, refusals: [`${id}: destination is blocked, occupied, outside the grid, or unreachable`] }
        : { legal: true, cost: path.cost, resolvedPath: path.cells };
    }
    case 'reach_check':
      return arenaReachCheck(
        state,
        combatantId(stringField(args, 'id')),
        combatantId(stringField(args, 'targetId')),
        stringField(args, 'action'),
      );
    case 'declare_intent':
      return declareArenaIntent(
        state,
        combatantId(stringField(args, 'id')),
        decodeArenaIntent(args['intent']),
      );
    default: throw new RangeError(`Unknown engine tool ${name}.`);
  }
}

function parseRequest(value: unknown): JsonRpcRequest {
  const candidate = record(value, 'JSON-RPC request');
  if (candidate['jsonrpc'] !== '2.0') throw new TypeError('jsonrpc must equal 2.0.');
  const method = stringField(candidate, 'method');
  const id = candidate['id'];
  if (id !== undefined && id !== null && typeof id !== 'string' && typeof id !== 'number') {
    throw new TypeError('JSON-RPC id must be a string, number, or null.');
  }
  return {
    jsonrpc: '2.0',
    ...(id === undefined ? {} : { id }),
    method,
    ...(candidate['params'] === undefined ? {} : { params: candidate['params'] }),
  };
}

function toolResult(value: unknown): unknown {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

export function handleMcpRequest(
  state: EncounterState,
  request: JsonRpcRequest,
): JsonRpcResponse | null {
  if (request.id === undefined) return null;
  switch (request.method) {
    case 'initialize': {
      const params = request.params === undefined ? {} : record(request.params, 'initialize params');
      const requestedVersion = params['protocolVersion'];
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: typeof requestedVersion === 'string' ? requestedVersion : MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'dnd-wt-vtt-engine', version: '1.0.0' },
        },
      };
    }
    case 'ping': return { jsonrpc: '2.0', id: request.id, result: {} };
    case 'tools/list': return { jsonrpc: '2.0', id: request.id, result: { tools: ENGINE_MCP_TOOLS } };
    case 'tools/call': {
      try {
        const params = record(request.params, 'tools/call params');
        const name = stringField(params, 'name');
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: toolResult(callEngineTool(state, name, params['arguments'] ?? {})),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            isError: true,
            content: [{ type: 'text', text: message }],
          },
        };
      }
    }
    default:
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      };
  }
}

export async function loadArenaFixture(path: string): Promise<EncounterState> {
  const decoded: unknown = JSON.parse(await readFile(path, 'utf8'));
  const root = record(decoded, 'arena fixture');
  const encounter = record(root['encounter'], 'arena fixture encounter');
  const state = record(encounter['state'], 'arena fixture encounter state');
  if (!Array.isArray(state['combatants']) || !Array.isArray(state['tokens']) ||
    typeof state['round'] !== 'number') {
    throw new TypeError('Arena fixture encounter state is incomplete.');
  }
  return state as unknown as EncounterState;
}

export async function runEngineMcpServer(fixturePath: string): Promise<void> {
  const state = await loadArenaFixture(resolve(fixturePath));
  const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    let response: JsonRpcResponse | null;
    try {
      response = handleMcpRequest(state, parseRequest(JSON.parse(line) as unknown));
    } catch (error) {
      response = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
    if (response !== null) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

async function main(): Promise<void> {
  const fixturePath = process.argv[2];
  if (fixturePath === undefined) throw new TypeError('Usage: engine-mcp-server.ts <arena-fixture.json>');
  await runEngineMcpServer(fixturePath);
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/engine-mcp-server.ts') ||
  invokedPath.endsWith('\\engine-mcp-server.ts') ||
  ((
    invokedPath.endsWith('/vite-node') ||
    invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') ||
    invokedPath.endsWith('\\vite-node.mjs')
  ) && process.argv[2]?.endsWith('.json') === true)
)) await main();
