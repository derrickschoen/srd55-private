import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { EncounterState } from '../src/combat/encounter';
import type { GridCell } from '../src/combat/grid';
import { combatantId, type CombatantId } from '../src/combat/values';
import {
  canonicalEngineQueryPort,
} from '../src/vtt/engine-query-port';
import {
  resolvePrototypeIntent,
  type PrototypeIntent,
  type PrototypeIntentChoice,
} from '../src/vtt/intent-resolver';
import {
  createMcpHandler,
  jsonRpcParseError,
  type JsonRpcResponse,
  type McpHandler,
  type McpToolBinding,
  type McpToolDescriptor,
  type SchemaViolation,
} from '../src/vtt/mcp/handler';

const EMPTY_ARGUMENTS_SCHEMA = z.object({}).strict();
const CELL_SCHEMA = z.object({
  column: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
}).strict();
const INTENT_CHOICE_SCHEMA = z.object({
  action: z.string().min(1),
  targetId: z.string().min(1),
  maxMovementFeet: z.number().int().nonnegative().multipleOf(5),
  acceptMelee: z.boolean(),
}).strict();
const ARENA_INTENT_SCHEMA = INTENT_CHOICE_SCHEMA.extend({
  fallback: z.union([z.null(), INTENT_CHOICE_SCHEMA]),
}).strict();
const COMBATANT_ARGUMENTS_SCHEMA = z.object({ id: z.string().min(1) }).strict();
const PATH_ARGUMENTS_SCHEMA = z.object({
  id: z.string().min(1),
  to: CELL_SCHEMA,
}).strict();
const REACH_ARGUMENTS_SCHEMA = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
  action: z.string().min(1),
}).strict();
const INTENT_ARGUMENTS_SCHEMA = z.object({
  id: z.string().min(1),
  intent: ARENA_INTENT_SCHEMA,
}).strict();
const OUTPUT_OBJECT_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
} as const);

function jsonSchema(schema: z.ZodType<unknown>): Readonly<Record<string, unknown>> {
  return Object.freeze(z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' }));
}

interface PrototypeToolSpec {
  readonly descriptor: McpToolDescriptor;
  readonly argumentsSchema: z.ZodType<unknown>;
}

const ENGINE_MCP_TOOL_SPECS: readonly PrototypeToolSpec[] = [
  {
    descriptor: {
      name: 'state_summary',
      description: 'Summarize combatants, hit points, positions, terrain, and the current round.',
      inputSchema: jsonSchema(EMPTY_ARGUMENTS_SCHEMA),
      outputSchema: OUTPUT_OBJECT_SCHEMA,
    },
    argumentsSchema: EMPTY_ARGUMENTS_SCHEMA,
  },
  {
    descriptor: {
      name: 'combatant_options',
      description: 'List a combatant statblock actions, movement budget, and current constraints.',
      inputSchema: jsonSchema(COMBATANT_ARGUMENTS_SCHEMA),
      outputSchema: OUTPUT_OBJECT_SCHEMA,
    },
    argumentsSchema: COMBATANT_ARGUMENTS_SCHEMA,
  },
  {
    descriptor: {
      name: 'path_cost',
      description: 'Resolve the terrain- and occupancy-aware path cost to a grid cell.',
      inputSchema: jsonSchema(PATH_ARGUMENTS_SCHEMA),
      outputSchema: OUTPUT_OBJECT_SCHEMA,
    },
    argumentsSchema: PATH_ARGUMENTS_SCHEMA,
  },
  {
    descriptor: {
      name: 'reach_check',
      description: 'Check whether a named statblock action can reach a hostile target now.',
      inputSchema: jsonSchema(REACH_ARGUMENTS_SCHEMA),
      outputSchema: OUTPUT_OBJECT_SCHEMA,
    },
    argumentsSchema: REACH_ARGUMENTS_SCHEMA,
  },
  {
    descriptor: {
      name: 'declare_intent',
      description: 'Validate and geometrically resolve a primary combat intent and declarative fallback without mutating state.',
      inputSchema: jsonSchema(INTENT_ARGUMENTS_SCHEMA),
      outputSchema: OUTPUT_OBJECT_SCHEMA,
    },
    argumentsSchema: INTENT_ARGUMENTS_SCHEMA,
  },
] as const;

export const ENGINE_MCP_TOOLS: readonly McpToolDescriptor[] = Object.freeze(
  ENGINE_MCP_TOOL_SPECS.map((spec) => spec.descriptor),
);

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

function decodeIntentChoice(value: unknown, label: string): PrototypeIntentChoice {
  const candidate = record(value, label);
  return {
    action: stringField(candidate, 'action'),
    targetId: stringField(candidate, 'targetId'),
    maxMovementFeet: integerField(candidate, 'maxMovementFeet'),
    acceptMelee: booleanField(candidate, 'acceptMelee'),
  };
}

export function decodeArenaIntent(value: unknown): PrototypeIntent {
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
      position: canonicalEngineQueryPort.tokenPosition(state, subject.profile.id),
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
  const subject = canonicalEngineQueryPort.combatant(state, id);
  if (subject === null) return { legal: false, refusals: [`${id}: combatant is absent`] };
  return {
    legal: true,
    id,
    actions: canonicalEngineQueryPort.actions(state, id),
    movementBudget: subject.profile.rules.speed,
    currentConstraints: {
      life: subject.life,
      placed: canonicalEngineQueryPort.tokenPosition(state, id) !== null,
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
      const path = canonicalEngineQueryPort.path(state, {
        actorId: id,
        destination,
        movement: 'normal',
        maximumFeet: state.bounds.columns * state.bounds.rows * 10,
      });
      return !path.legal
        ? { legal: false, refusals: [`${id}: destination is blocked, occupied, outside the grid, or unreachable`] }
        : { legal: true, cost: path.costFeet, resolvedPath: path.cells };
    }
    case 'reach_check':
      {
        const actorId = combatantId(stringField(args, 'id'));
        const targetId = combatantId(stringField(args, 'targetId'));
        const actionId = stringField(args, 'action');
        const result = canonicalEngineQueryPort.reach(state, { actorId, targetId, actionId });
        return result.legal
          ? result
          : {
              legal: false,
              refusals: result.codes.map((code) =>
                code === 'target_out_of_range'
                  ? `${actorId}: target is outside ${actionId} reach/range`
                  : `${actorId}: ${code}`),
            };
      }
    case 'declare_intent':
      return resolvePrototypeIntent(
        state,
        combatantId(stringField(args, 'id')),
        decodeArenaIntent(args['intent']),
      );
    default: throw new RangeError(`Unknown engine tool ${name}.`);
  }
}

function jsonPointer(path: readonly PropertyKey[]): string {
  if (path.length === 0) return '$';
  return path.reduce<string>((pointer, segment) => {
    const escaped = String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
    return `${pointer}/${escaped}`;
  }, '');
}

function validateArguments(
  schema: z.ZodType<unknown>,
  value: unknown,
): readonly SchemaViolation[] {
  const decoded = schema.safeParse(value);
  if (decoded.success) return [];
  return decoded.error.issues.map((issue) => ({
    path: jsonPointer(issue.path),
    keyword: issue.code,
    message: issue.message,
  }));
}

function validateOutput(value: unknown): readonly SchemaViolation[] {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? []
    : [{ path: '$', keyword: 'type', message: 'must be an object.' }];
}

export function createEngineMcpHandler(
  state: EncounterState,
  maximumToolResultBytes?: number,
): McpHandler {
  const tools: readonly McpToolBinding[] = ENGINE_MCP_TOOL_SPECS.map((spec) => ({
    descriptor: spec.descriptor,
    validateArguments: (value: unknown) => validateArguments(spec.argumentsSchema, value),
    validateOutput,
    execute: (value: unknown) => callEngineTool(state, spec.descriptor.name, value),
  }));
  return createMcpHandler({
    tools,
    ...(maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes }),
  });
}

export function handleMcpRequest(state: EncounterState, message: unknown): JsonRpcResponse | null {
  return createEngineMcpHandler(state).handle(message);
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
  const handler = createEngineMcpHandler(state);
  const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    let decoded: unknown;
    try {
      decoded = JSON.parse(line) as unknown;
    } catch {
      process.stdout.write(`${JSON.stringify(jsonRpcParseError())}\n`);
      continue;
    }
    const response = handler.handle(decoded);
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
