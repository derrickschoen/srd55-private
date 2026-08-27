import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import { encounterBranchId, encounterSessionId } from '../src/combat/values';
import type { EngineProposalEnvelope, NarrationEnvelope } from '../src/vtt/engine-envelopes';
import { createEngineStateCapsule, projectEngineDmProjection, type RuleReference } from '../src/vtt/engine-state-capsule';
import { canonicalEngineQueryPort, engineActionRegistry } from '../src/vtt/engine-query-port';
import { pureIntentResolver } from '../src/vtt/intent-resolver';
import { projectDmBoard } from '../src/vtt/encounter-projections';
import {
  createEngineMcpApplication,
  MutableEngineCapsuleFeed,
  type AdjudicationEnvelope,
  type AllowlistedRulesSource,
} from '../src/vtt/mcp/engine-server';
import { jsonRpcParseError, type JsonRpcResponse, type McpHandler } from '../src/vtt/mcp/handler';

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Readonly<Record<string, unknown>>;
}

export interface EngineMcpRuntime {
  readonly handler: McpHandler;
  readonly feed: MutableEngineCapsuleFeed;
  readonly proposals: readonly EngineProposalEnvelope[];
  readonly narrations: readonly NarrationEnvelope[];
  readonly adjudications: readonly AdjudicationEnvelope[];
}

export function createEngineMcpRuntime(
  state: EncounterState,
  options: {
    readonly maximumToolResultBytes?: number;
    readonly maximumResourceBytes?: number;
    readonly listPageSize?: number;
    readonly requestedActorCount?: number;
    readonly rulesIndex?: readonly RuleReference[];
    readonly rules?: AllowlistedRulesSource;
  } = {},
): EngineMcpRuntime {
  const actors = state.combatants
    .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
    .map((candidate) => candidate.profile.id)
    .sort()
    .slice(0, options.requestedActorCount);
  if (actors.length === 0) throw new RangeError('Encounter has no living monster for the engine request.');
  const projection = projectDmBoard({
    view: { audience: 'dm', state },
    coordinator: { requestSequence: 0, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' }, pause: null },
    controllers: [],
    history: [],
  });
  const capsule = createEngineStateCapsule({
    runId: encounterSessionId('encounter:engine-mcp'),
    branchId: encounterBranchId('branch:engine-mcp'),
    revision: 1,
    generatedAt: '2026-08-27T12:00:00.000Z',
    request: { requestId: 'request:engine-mcp', phase: 'initial', correctionNumber: 0, actors },
    projection: projectEngineDmProjection(projection, engineActionRegistry(state), 1),
    ...(options.rulesIndex === undefined ? {} : { rulesIndex: options.rulesIndex }),
  });
  const feed = new MutableEngineCapsuleFeed(capsule);
  const proposals: EngineProposalEnvelope[] = [];
  const narrations: NarrationEnvelope[] = [];
  const adjudications: AdjudicationEnvelope[] = [];
  const handler = createEngineMcpApplication({
    state,
    stateSource: feed,
    queries: canonicalEngineQueryPort,
    intents: pureIntentResolver,
    proposals: { append: (envelope) => { proposals.push(envelope); } },
    narration: { append: (envelope) => { narrations.push(envelope); } },
    adjudications: { append: (envelope) => { adjudications.push(envelope); } },
    rules: options.rules ?? { get: () => null },
    ...(options.maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes: options.maximumToolResultBytes }),
    ...(options.maximumResourceBytes === undefined ? {} : { maximumResourceBytes: options.maximumResourceBytes }),
    ...(options.listPageSize === undefined ? {} : { listPageSize: options.listPageSize }),
  });
  return { handler, feed, proposals, narrations, adjudications };
}

export function createEngineMcpHandler(state: EncounterState, maximumToolResultBytes?: number): McpHandler {
  return createEngineMcpRuntime(state, maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes }).handler;
}

export function handleMcpRequest(state: EncounterState, message: unknown): JsonRpcResponse | null {
  return createEngineMcpHandler(state).handle(message);
}

export async function loadArenaFixture(path: string): Promise<EncounterState> {
  const decoded: unknown = JSON.parse(await readFile(path, 'utf8'));
  const root = record(decoded, 'arena fixture');
  const encounter = record(root['encounter'], 'arena fixture encounter');
  const state = record(encounter['state'], 'arena fixture encounter state');
  if (!Array.isArray(state['combatants']) || !Array.isArray(state['tokens']) || typeof state['round'] !== 'number') throw new TypeError('Arena fixture encounter state is incomplete.');
  return state as unknown as EncounterState;
}

export async function runEngineMcpServer(fixturePath: string): Promise<void> {
  const state = await loadArenaFixture(resolve(fixturePath));
  const handler = createEngineMcpHandler(state);
  const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    let decoded: unknown;
    try { decoded = JSON.parse(line) as unknown; }
    catch { process.stdout.write(`${JSON.stringify(jsonRpcParseError())}\n`); continue; }
    const response = handler.handle(decoded);
    if (response !== null) process.stdout.write(`${JSON.stringify(response)}\n`);
    for (const notification of handler.drainNotifications()) process.stdout.write(`${JSON.stringify(notification)}\n`);
  }
}

async function main(): Promise<void> {
  const fixturePath = process.argv[2];
  if (fixturePath === undefined) throw new TypeError('Usage: engine-mcp-server.ts <arena-fixture.json>');
  await runEngineMcpServer(fixturePath);
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/engine-mcp-server.ts') || invokedPath.endsWith('\\engine-mcp-server.ts') ||
  (((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') || invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs'))) && process.argv[2]?.endsWith('.json') === true)
)) await main();
