import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import { encounterBranchId, encounterSessionId } from '../src/combat/values';
import type { EngineProposalEnvelope, NarrationEnvelope } from '../src/vtt/engine-envelopes';
import { createEngineStateCapsule, projectEngineEncounterState, type RuleReference } from '../src/vtt/engine-state-capsule';
import { canonicalEngineQueryPort, engineActionRegistry } from '../src/vtt/engine-query-port';
import { pureIntentResolver } from '../src/vtt/intent-resolver';
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

function assertNoDuplicateJsonKeys(source: string): void {
  let offset = 0;
  const whitespace = (): void => {
    while (/\s/u.test(source[offset] ?? '')) offset += 1;
  };
  const stringValue = (): string => {
    if (source[offset] !== '"') throw new SyntaxError('Expected JSON string.');
    const start = offset;
    offset += 1;
    while (offset < source.length) {
      const character = source[offset];
      if (character === '"') {
        offset += 1;
        const decoded: unknown = JSON.parse(source.slice(start, offset));
        if (typeof decoded !== 'string') throw new SyntaxError('Expected JSON string.');
        return decoded;
      }
      offset += character === '\\' ? 2 : 1;
    }
    throw new SyntaxError('Unterminated JSON string.');
  };
  const value = (): void => {
    whitespace();
    const character = source[offset];
    if (character === '{') {
      offset += 1;
      whitespace();
      const keys = new Set<string>();
      if (source[offset] === '}') { offset += 1; return; }
      for (;;) {
        const key = stringValue();
        if (keys.has(key)) throw new SyntaxError(`Duplicate JSON object key: ${key}`);
        keys.add(key);
        whitespace();
        if (source[offset] !== ':') throw new SyntaxError('Expected JSON object colon.');
        offset += 1;
        value();
        whitespace();
        if (source[offset] === '}') { offset += 1; return; }
        if (source[offset] !== ',') throw new SyntaxError('Expected JSON object comma.');
        offset += 1;
        whitespace();
      }
    }
    if (character === '[') {
      offset += 1;
      whitespace();
      if (source[offset] === ']') { offset += 1; return; }
      for (;;) {
        value();
        whitespace();
        if (source[offset] === ']') { offset += 1; return; }
        if (source[offset] !== ',') throw new SyntaxError('Expected JSON array comma.');
        offset += 1;
      }
    }
    if (character === '"') { stringValue(); return; }
    const match = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/u.exec(source.slice(offset));
    if (match === null) throw new SyntaxError('Invalid JSON value.');
    offset += match[0].length;
  };
  value();
  whitespace();
  if (offset !== source.length) throw new SyntaxError('Trailing JSON input.');
}

export function parseEngineMcpJsonLine(line: string): unknown {
  if (line.includes('\uFFFD')) throw new SyntaxError('Invalid UTF-8 input.');
  assertNoDuplicateJsonKeys(line);
  return JSON.parse(line) as unknown;
}

async function writeJsonLine(value: unknown): Promise<void> {
  if (process.stdout.write(`${JSON.stringify(value)}\n`)) return;
  await once(process.stdout, 'drain');
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
    readonly revision?: number;
    readonly phase?: 'initial' | 'correction';
    readonly correctionNumber?: 0 | 1;
    readonly room?: number | null;
    readonly historyKind?: string;
  } = {},
): EngineMcpRuntime {
  const candidates = state.combatants
    .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
    .map((candidate) => candidate.profile.id)
    .sort();
  const actors = candidates.slice(0, options.requestedActorCount ?? candidates.length);
  if (actors.length === 0) throw new RangeError('Encounter has no living monster for the engine request.');
  const revision = options.revision ?? 1;
  const phase = options.phase ?? 'initial';
  const correctionNumber = options.correctionNumber ?? (phase === 'correction' ? 1 : 0);
  const capsule = createEngineStateCapsule({
    runId: encounterSessionId('encounter:engine-mcp'),
    branchId: encounterBranchId('branch:engine-mcp'),
    revision,
    generatedAt: '2026-08-27T12:00:00.000Z',
    request: { requestId: 'request:engine-mcp', phase, correctionNumber, actors },
    projection: projectEngineEncounterState(state, engineActionRegistry(state), options.room ?? 1),
    historyDelta: options.historyKind === undefined ? [] : [{
      revision,
      kind: options.historyKind,
      branchStatus: 'active',
      encounterRound: state.round,
    }],
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

export async function runEngineMcpServer(
  fixturePath: string,
  options: Parameters<typeof createEngineMcpRuntime>[1] = {},
): Promise<void> {
  const state = await loadArenaFixture(resolve(fixturePath));
  const handler = createEngineMcpRuntime(state, options).handler;
  const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    let decoded: unknown;
    try { decoded = parseEngineMcpJsonLine(line); }
    catch { await writeJsonLine(jsonRpcParseError()); continue; }
    const response = handler.handle(decoded);
    if (response !== null) await writeJsonLine(response);
    for (const notification of handler.drainNotifications()) await writeJsonLine(notification);
  }
}

async function main(): Promise<void> {
  const fixturePath = process.argv[2];
  if (fixturePath === undefined) throw new TypeError('Usage: engine-mcp-server.ts <arena-fixture.json>');
  const thirdArgument = process.argv[3];
  const scenario = thirdArgument?.startsWith('--') === true ? thirdArgument : undefined;
  if (thirdArgument !== undefined && scenario === undefined && (thirdArgument.length < 16 || thirdArgument.length > 300)) {
    throw new TypeError('Engine MCP launcher token must contain 16 to 300 characters.');
  }
  const options: Parameters<typeof runEngineMcpServer>[1] = scenario === '--correction'
    ? { revision: 2, phase: 'correction' as const, correctionNumber: 1, historyKind: 'intent_correction_requested' }
    : scenario === '--room-transition'
      ? { revision: 3, room: 2, historyKind: 'room_transition' }
      : {};
  if (scenario !== undefined && scenario !== '--correction' && scenario !== '--room-transition') {
    throw new TypeError('Unknown engine MCP fixture scenario.');
  }
  await runEngineMcpServer(fixturePath, options);
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/engine-mcp-server.ts') || invokedPath.endsWith('\\engine-mcp-server.ts') ||
  (((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') || invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs'))) && process.argv[2]?.endsWith('.json') === true)
)) await main();
