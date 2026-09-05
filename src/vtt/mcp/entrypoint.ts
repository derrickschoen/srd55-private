import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { appendFileSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { EncounterState } from '../../combat/encounter';
import { creatureSizes } from '../../domain/enums';
import { BUNDLED_MONSTER_ROSTER } from '../../combat/statblocks/roster';
import {
  encounterBranchId,
  encounterSessionId,
  type EncounterBranchId,
  type EncounterSessionId,
} from '../../combat/values';
import type { EngineProposalEnvelope, NarrationEnvelope } from '../engine-envelopes';
import type {
  HostScenario,
  HostSplitCandidate,
  QueuedSpeculativePlanEnvelope,
} from '../speculative-plan-types';
import {
  createEngineStateCapsule,
  projectEngineEncounterState,
  type EngineCapsuleRequest,
  type EngineInitiativeProjection,
  type EngineOrdinaryRequestKind,
  type EnginePlanAdjustmentMetadata,
  type RuleReference,
} from '../engine-state-capsule';
import { canonicalEngineQueryPort, engineActionRegistry } from '../engine-query-port';
import { pureTurnProposalResolver } from '../intent-resolver';
import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../monster-planning-state';
import {
  rendererProfileSchema,
  type CircumstanceFeatureVector,
  type RendererProfile,
  type RendererRemovalCounts,
} from '../renderer-profile';
import {
  createEngineMcpApplication,
  DEFAULT_OVERRIDE_POLICY,
  MutableEngineCapsuleFeed,
  type AdjudicationEnvelope,
  type AllowlistedRulesSource,
  type EngineMcpToolProfile,
  type EngineToolSurface,
  type OverridePolicy,
  type TurnContextDeltaBase,
} from './engine-server';
import { jsonRpcParseError, type JsonRpcResponse, type McpHandler } from './handler';
import {
  decodeKbReadRecords,
  isKbSubjectSources,
  KbReadBudget,
  type KbReadCallPhase,
  type KbReadRecord,
  type KbSubjectSources,
} from './knowledge-base';

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
  readonly toolSurface: EngineToolSurface;
  readonly feed: MutableEngineCapsuleFeed;
  readonly proposals: readonly EngineProposalEnvelope[];
  readonly speculativePlans: readonly QueuedSpeculativePlanEnvelope[];
  readonly narrations: readonly NarrationEnvelope[];
  readonly adjudications: readonly AdjudicationEnvelope[];
}

export interface EngineMcpLauncherManifest {
  readonly format: 'engine-mcp-launcher-v1';
  readonly fixturePath: string;
  readonly proposalSpoolPath: string;
  readonly turnContextSpoolPath?: string;
  readonly kbReadSpoolPath?: string;
  readonly kbSubjectSources?: KbSubjectSources;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly requestId: string;
  readonly phase: 'initial' | 'correction' | 'speculative';
  readonly correctionNumber: 0 | 1;
  readonly overridePolicy?: OverridePolicy;
  readonly room: number;
  readonly historyKind: string;
  /** Optional on disk so pre-Phase-2 launchers decode as round_plan. */
  readonly requestKind?: EngineOrdinaryRequestKind;
  readonly requestedActorIds?: readonly import('../../combat/values').CombatantId[];
  readonly planAdjustment?: EnginePlanAdjustmentMetadata;
  readonly speculativeRequest?: {
    readonly targetRoom: number;
    readonly targetMonsterRound: number;
    readonly refreshGeneration: 0 | 1 | 2;
    readonly scenarioMenu: readonly HostSplitCandidate[];
    readonly scenarios: readonly HostScenario[];
  };
  readonly toolProfile?: EngineMcpToolProfile;
  readonly turnContextDeltaBase?: TurnContextDeltaBase;
  readonly rendererProfile?: RendererProfile;
  readonly initiativeProjection?: EngineInitiativeProjection;
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
    readonly phase?: 'initial' | 'correction' | 'speculative';
    readonly correctionNumber?: 0 | 1;
    readonly room?: number | null;
    readonly historyKind?: string;
    readonly runId?: EncounterSessionId;
    readonly branchId?: EncounterBranchId;
    readonly requestId?: string;
    readonly requestKind?: EngineOrdinaryRequestKind;
    readonly requestedActorIds?: readonly import('../../combat/values').CombatantId[];
    readonly planAdjustment?: EnginePlanAdjustmentMetadata;
    readonly speculativeRequest?: EngineMcpLauncherManifest['speculativeRequest'];
    readonly onProposal?: (proposal: EngineProposalEnvelope) => void;
    readonly onSpeculativePlan?: (plan: QueuedSpeculativePlanEnvelope) => void;
    readonly toolProfile?: EngineMcpToolProfile;
    readonly turnContextDeltaBase?: TurnContextDeltaBase;
    readonly rendererProfile?: RendererProfile;
    readonly turnContextMaximumBytes?: number;
    readonly onTurnContextRendered?: (result: {
      readonly preTrimBytes: number;
      readonly postTrimBytes: number;
      readonly features: CircumstanceFeatureVector;
      readonly removals: RendererRemovalCounts;
    }) => void;
    readonly initiativeProjection?: EngineInitiativeProjection;
    readonly onTurnContext?: (context: Readonly<Record<string, unknown>>) => void;
    readonly kbReadBudget?: KbReadBudget;
    readonly kbReadCallPhase?: KbReadCallPhase;
    readonly overridePolicy?: OverridePolicy;
  } = {},
): EngineMcpRuntime {
  const candidates = state.combatants
    .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
    .map((candidate) => candidate.profile.id)
    .sort();
  const actors = options.requestedActorIds === undefined
    ? candidates.slice(0, options.requestedActorCount ?? candidates.length)
    : [...options.requestedActorIds];
  if (actors.length === 0) throw new RangeError('Encounter has no living monster for the engine request.');
  if (new Set(actors).size !== actors.length || actors.some((actorId) => !candidates.includes(actorId))) {
    throw new RangeError('Engine request actors must be unique living monsters.');
  }
  const planningState = projectFutureMonsterTurns(state, actors);
  const revision = options.revision ?? 1;
  const phase = options.phase ?? 'initial';
  const correctionNumber = options.correctionNumber ?? (phase === 'correction' ? 1 : 0);
  let request: EngineCapsuleRequest;
  if (phase === 'speculative') {
    const speculative = options.speculativeRequest;
    if (speculative === undefined) {
      throw new TypeError('Speculative engine requests require a scenario menu.');
    }
    request = {
      requestId: options.requestId ?? 'request:engine-mcp-speculative',
      phase: 'speculative',
      correctionNumber: 0,
      actors,
      ...speculative,
    };
  } else if (options.requestKind === 'plan_adjustment') {
    const metadata = options.planAdjustment;
    if (metadata === undefined) {
      throw new TypeError('Plan-adjustment engine requests require correlation metadata.');
    }
    request = {
      kind: 'plan_adjustment',
      requestId: options.requestId ?? 'request:engine-mcp',
      phase,
      correctionNumber,
      actors,
      ...metadata,
    };
  } else {
    if (options.planAdjustment !== undefined || options.speculativeRequest !== undefined) {
      throw new TypeError('Round-plan engine requests cannot carry plan-adjustment metadata.');
    }
    request = {
      ...(options.requestKind === 'round_plan' ? { kind: 'round_plan' as const } : {}),
      requestId: options.requestId ?? 'request:engine-mcp',
      phase,
      correctionNumber,
      actors,
    };
  }
  const capsule = createEngineStateCapsule({
    runId: options.runId ?? encounterSessionId('encounter:engine-mcp'),
    branchId: options.branchId ?? encounterBranchId('branch:engine-mcp'),
    revision,
    generatedAt: '2026-08-27T12:00:00.000Z',
    request,
    projection: projectEngineEncounterState(
      planningState,
      engineActionRegistry(planningState, revision),
      options.initiativeProjection ?? {
        policy: 'initiative-intel-v1',
        timeline: {
          phase: structuredClone(planningState.phase),
          round: planningState.round,
          currentCombatant: null,
          initiative: [],
          upcoming: [],
          roundBoundaries: [],
          branchPoints: [],
        },
      },
      options.room ?? 1,
    ),
    historyDelta: options.historyKind === undefined ? [] : [{
      revision,
      kind: options.historyKind,
      branchStatus: 'active',
      encounterRound: planningState.round,
    }],
    ...(options.rulesIndex === undefined ? {} : { rulesIndex: options.rulesIndex }),
  });
  const feed = new MutableEngineCapsuleFeed(capsule);
  const proposals: EngineProposalEnvelope[] = [];
  const speculativePlans: QueuedSpeculativePlanEnvelope[] = [];
  const narrations: NarrationEnvelope[] = [];
  const adjudications: AdjudicationEnvelope[] = [];
  const application = createEngineMcpApplication({
    state: planningState,
    stateSource: feed,
    queries: canonicalEngineQueryPort,
    turnProposals: pureTurnProposalResolver,
    proposals: {
      append: (envelope) => {
        proposals.push(envelope);
        options.onProposal?.(structuredClone(envelope));
      },
    },
    speculativePlans: { append: (envelope) => {
      speculativePlans.push(envelope);
      options.onSpeculativePlan?.(structuredClone(envelope));
    } },
    narration: { append: (envelope) => { narrations.push(envelope); } },
    adjudications: { append: (envelope) => { adjudications.push(envelope); } },
    rules: options.rules ?? { get: () => null },
    ...(options.maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes: options.maximumToolResultBytes }),
    ...(options.maximumResourceBytes === undefined ? {} : { maximumResourceBytes: options.maximumResourceBytes }),
    ...(options.listPageSize === undefined ? {} : { listPageSize: options.listPageSize }),
    ...(options.toolProfile === undefined ? {} : { toolProfile: options.toolProfile }),
    ...(options.turnContextDeltaBase === undefined ? {} : {
      turnContextDeltaBase: structuredClone(options.turnContextDeltaBase),
    }),
    ...(options.rendererProfile === undefined ? {} : { rendererProfile: options.rendererProfile }),
    ...(options.turnContextMaximumBytes === undefined ? {} : {
      turnContextMaximumBytes: options.turnContextMaximumBytes,
    }),
    ...(options.onTurnContextRendered === undefined ? {} : {
      onTurnContextRendered: options.onTurnContextRendered,
    }),
    ...(options.onTurnContext === undefined ? {} : { onTurnContext: options.onTurnContext }),
    ...(options.kbReadBudget === undefined ? {} : { kbReadBudget: options.kbReadBudget }),
    ...(options.kbReadCallPhase === undefined ? {} : { kbReadCallPhase: options.kbReadCallPhase }),
    ...(options.overridePolicy === undefined ? {} : { overridePolicy: options.overridePolicy }),
  });
  return {
    handler: application,
    toolSurface: application.toolSurface,
    feed,
    proposals,
    speculativePlans,
    narrations,
    adjudications,
  };
}

export function createEngineMcpHandler(state: EncounterState, maximumToolResultBytes?: number): McpHandler {
  return createEngineMcpRuntime(state, maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes }).handler;
}

export function handleMcpRequest(state: EncounterState, message: unknown): JsonRpcResponse | null {
  return createEngineMcpHandler(state).handle(message);
}

export function decodeArenaFixture(decoded: unknown): EncounterState {
  const root = record(decoded, 'arena fixture');
  const encounter = record(root['encounter'], 'arena fixture encounter');
  const state = record(encounter['state'], 'arena fixture encounter state');
  if (!Array.isArray(state['combatants']) || !Array.isArray(state['tokens']) || typeof state['round'] !== 'number') throw new TypeError('Arena fixture encounter state is incomplete.');
  const explicitLegacyPlayerSizes: ReadonlyMap<string, (typeof creatureSizes)[number]> = new Map([
    ['combatant:fighter', 'Medium'],
    ['combatant:cleric', 'Medium'],
    ['combatant:wizard', 'Medium'],
  ] as const);
  const combatants = state['combatants'].map((value) => {
    const combatant = record(value, 'arena fixture combatant');
    const profile = record(combatant['profile'], 'arena fixture combatant profile');
    const rules = record(profile['rules'], 'arena fixture combatant rules');
    const sourced = rules['sizeCategory'];
    const statblockId = String(profile['statblockId']);
    const sourcedStatblockSize = BUNDLED_MONSTER_ROSTER.find((entry) => entry.id === statblockId)
      ?.statblock.sourceDetails.classification;
    const firstStatblockSize = sourcedStatblockSize?.kind === 'present'
      ? sourcedStatblockSize.value.sizes.find((size) => creatureSizes.includes(size as (typeof creatureSizes)[number]))
      : undefined;
    const carried = typeof sourced === 'string' && creatureSizes.includes(sourced as (typeof creatureSizes)[number])
      ? sourced as (typeof creatureSizes)[number]
      : explicitLegacyPlayerSizes.get(String(profile['id'])) ?? firstStatblockSize as (typeof creatureSizes)[number] | undefined;
    if (carried === undefined) throw new TypeError(`Arena fixture combatant ${String(profile['id'])} has no known mechanical size.`);
    return { ...combatant, profile: { ...profile, rules: { ...rules, sizeCategory: carried } } };
  });
  const sizes = new Map(combatants.map((combatant) => {
    const profile = record(combatant['profile'], 'arena fixture combatant profile');
    const rules = record(profile['rules'], 'arena fixture combatant rules');
    return [String(profile['id']), rules['sizeCategory'] as (typeof creatureSizes)[number]] as const;
  }));
  const tokens = state['tokens'].map((value) => {
    const token = record(value, 'arena fixture token');
    const size = sizes.get(String(token['combatantId']));
    if (size === undefined) throw new TypeError(`Arena fixture token ${String(token['id'])} has no known mechanical size.`);
    return { ...token, placementMode: { kind: 'normal' as const, actual: size } };
  });
  const environment = record(state['environment'], 'arena fixture environment');
  return {
    ...state,
    combatants,
    tokens,
    environment: { ...environment, narrowOpeningRegions: [] },
    sharedSpaceRelations: [],
    adjudicationPending: [],
  } as unknown as EncounterState;
}

export function decodeArenaFixtureText(text: string): EncounterState {
  return decodeArenaFixture(JSON.parse(text) as unknown);
}

export async function loadArenaFixture(path: string): Promise<EncounterState> {
  return decodeArenaFixtureText(await readFile(path, 'utf8'));
}

export { freshMonsterPlanningState, projectFutureMonsterTurns } from '../monster-planning-state';

export async function runEngineMcpServer(
  fixturePath: string,
  options: Parameters<typeof createEngineMcpRuntime>[1] = {},
  directFixturePlanning = false,
): Promise<void> {
  const loaded = await loadArenaFixture(resolve(fixturePath));
  const state = directFixturePlanning ? freshMonsterPlanningState(loaded) : loaded;
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

function isLauncherManifest(value: unknown): value is EngineMcpLauncherManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const input = value as Readonly<Record<string, unknown>>;
  return input['format'] === 'engine-mcp-launcher-v1' &&
    typeof input['fixturePath'] === 'string' && input['fixturePath'].length > 0 &&
    typeof input['proposalSpoolPath'] === 'string' && input['proposalSpoolPath'].length > 0 &&
    (input['turnContextSpoolPath'] === undefined ||
      typeof input['turnContextSpoolPath'] === 'string' && input['turnContextSpoolPath'].length > 0) &&
    ((input['kbReadSpoolPath'] === undefined && input['kbSubjectSources'] === undefined) ||
      typeof input['kbReadSpoolPath'] === 'string' && input['kbReadSpoolPath'].length > 0 &&
      isKbSubjectSources(input['kbSubjectSources'])) &&
    typeof input['runId'] === 'string' && input['runId'].length > 0 &&
    typeof input['branchId'] === 'string' && input['branchId'].length > 0 &&
    Number.isSafeInteger(input['revision']) && typeof input['revision'] === 'number' && input['revision'] >= 1 &&
    typeof input['requestId'] === 'string' && input['requestId'].length > 0 &&
    (input['phase'] === 'initial' || input['phase'] === 'correction' || input['phase'] === 'speculative') &&
    (input['correctionNumber'] === 0 || input['correctionNumber'] === 1) &&
    (input['overridePolicy'] === undefined || input['overridePolicy'] === 'strict' ||
      input['overridePolicy'] === 'typed_reason') &&
    Number.isSafeInteger(input['room']) && typeof input['room'] === 'number' && input['room'] >= 1 &&
    typeof input['historyKind'] === 'string' && input['historyKind'].length > 0 &&
    (input['requestKind'] === undefined || input['requestKind'] === 'round_plan' ||
      input['requestKind'] === 'plan_adjustment') &&
    (input['requestedActorIds'] === undefined ||
      Array.isArray(input['requestedActorIds']) && input['requestedActorIds'].length > 0 &&
      input['requestedActorIds'].every((actorId) => typeof actorId === 'string') &&
      new Set(input['requestedActorIds']).size === input['requestedActorIds'].length) &&
    (input['phase'] === 'speculative'
      ? input['correctionNumber'] === 0 && typeof input['speculativeRequest'] === 'object' &&
        input['speculativeRequest'] !== null && !Array.isArray(input['speculativeRequest']) &&
        input['planAdjustment'] === undefined
      : input['speculativeRequest'] === undefined) &&
    (input['requestKind'] === 'plan_adjustment'
      ? typeof input['planAdjustment'] === 'object' && input['planAdjustment'] !== null &&
        !Array.isArray(input['planAdjustment']) && Array.isArray(input['requestedActorIds'])
      : input['planAdjustment'] === undefined) &&
    (input['initiativeProjection'] === undefined || (() => {
      const projection = input['initiativeProjection'];
      if (typeof projection !== 'object' || projection === null || Array.isArray(projection)) return false;
      const candidate = projection as Readonly<Record<string, unknown>>;
      const timeline = candidate['timeline'];
      return candidate['policy'] === 'initiative-intel-v1' &&
        typeof timeline === 'object' && timeline !== null && !Array.isArray(timeline) &&
        Array.isArray((timeline as Readonly<Record<string, unknown>>)['initiative']);
    })()) &&
    (input['turnContextDeltaBase'] === undefined || (() => {
      const base = input['turnContextDeltaBase'];
      if (typeof base !== 'object' || base === null || Array.isArray(base)) return false;
      const candidate = base as Readonly<Record<string, unknown>>;
      return Number.isSafeInteger(candidate['revision']) && typeof candidate['revision'] === 'number' &&
        candidate['revision'] >= 1 && typeof candidate['context'] === 'object' &&
        candidate['context'] !== null && !Array.isArray(candidate['context']) &&
        (candidate['context'] as Readonly<Record<string, unknown>>)['granularity'] === 'full';
    })()) &&
    (input['toolProfile'] === undefined || input['toolProfile'] === 'full' || input['toolProfile'] === 'dm') &&
    (input['rendererProfile'] === undefined || rendererProfileSchema.safeParse(input['rendererProfile']).success);
}

export type DecodedEngineMcpLauncherManifest = EngineMcpLauncherManifest & {
  readonly requestKind: EngineOrdinaryRequestKind;
  readonly overridePolicy: OverridePolicy;
};

export function decodeEngineMcpLauncherManifest(value: unknown): DecodedEngineMcpLauncherManifest | null {
  if (!isLauncherManifest(value)) return null;
  return {
    ...value,
    requestKind: value.requestKind ?? 'round_plan',
    overridePolicy: value.overridePolicy ?? DEFAULT_OVERRIDE_POLICY,
  };
}

async function launcherManifest(path: string): Promise<DecodedEngineMcpLauncherManifest | null> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(await readFile(resolve(path), 'utf8')) as unknown;
  } catch {
    return null;
  }
  return decodeEngineMcpLauncherManifest(decoded);
}

function kbReadRecords(path: string): readonly KbReadRecord[] {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return []; }
  return decodeKbReadRecords(source);
}

export function createLauncherKbReadBudget(input: {
  readonly kbReadSpoolPath?: string;
  readonly kbSubjectSources?: KbSubjectSources;
}): KbReadBudget | undefined {
  if (input.kbReadSpoolPath === undefined || input.kbSubjectSources === undefined) return undefined;
  return new KbReadBudget(
    input.kbSubjectSources,
    kbReadRecords(input.kbReadSpoolPath),
    (record) => appendFileSync(input.kbReadSpoolPath ?? '', `${JSON.stringify(record)}\n`, 'utf8'),
  );
}

export async function runEngineMcpEntrypoint(argv: readonly string[] = process.argv): Promise<void> {
  const profileArguments = argv.slice(2).filter((argument) => argument.startsWith('--agent-profile='));
  if (profileArguments.length > 1) throw new TypeError('Engine MCP accepts at most one agent profile flag.');
  const profileValue = profileArguments[0]?.slice('--agent-profile='.length);
  if (profileValue !== undefined && profileValue !== 'dm' && profileValue !== 'full') {
    throw new TypeError(`Unknown engine MCP agent profile ${profileValue}.`);
  }
  const positional = argv.slice(2).filter((argument) => !argument.startsWith('--agent-profile='));
  const launcherPath = positional[0];
  if (launcherPath === undefined) throw new TypeError('Usage: engine-mcp-server.ts [--agent-profile=full|dm] <arena-fixture-or-launcher.json>');
  const selectedProfile = profileValue as EngineMcpToolProfile | undefined;
  const manifest = await launcherManifest(launcherPath);
  if (manifest !== null) {
    const kbReadBudget = createLauncherKbReadBudget(manifest);
    await runEngineMcpServer(manifest.fixturePath, {
      runId: manifest.runId,
      branchId: manifest.branchId,
      revision: manifest.revision,
      requestId: manifest.requestId,
      phase: manifest.phase,
      correctionNumber: manifest.correctionNumber,
      overridePolicy: manifest.overridePolicy,
      room: manifest.room,
      historyKind: manifest.historyKind,
      ...(manifest.requestKind === 'plan_adjustment' ? {
        requestKind: manifest.requestKind,
        requestedActorIds: manifest.requestedActorIds,
        planAdjustment: manifest.planAdjustment,
      } : {}),
      ...(manifest.phase === 'speculative' ? {
        requestedActorIds: manifest.requestedActorIds,
        speculativeRequest: manifest.speculativeRequest,
      } : {}),
      ...(manifest.turnContextDeltaBase === undefined ? {} : {
        turnContextDeltaBase: manifest.turnContextDeltaBase,
      }),
      ...(manifest.rendererProfile === undefined ? {} : {
        rendererProfile: manifest.rendererProfile,
      }),
      ...(manifest.initiativeProjection === undefined ? {} : {
        initiativeProjection: manifest.initiativeProjection,
      }),
      ...((selectedProfile ?? manifest.toolProfile) === undefined
        ? {}
        : { toolProfile: selectedProfile ?? manifest.toolProfile }),
      ...(kbReadBudget === undefined ? {} : {
        kbReadBudget,
        kbReadCallPhase: manifest.requestKind === 'plan_adjustment'
          ? 'adjustment' as const
          : manifest.phase === 'correction' ? 'correction' as const : 'initial' as const,
      }),
      onProposal: (proposal) => {
        appendFileSync(manifest.proposalSpoolPath, `${JSON.stringify(proposal)}\n`, 'utf8');
      },
      onSpeculativePlan: (plan) => {
        appendFileSync(manifest.proposalSpoolPath, `${JSON.stringify(plan)}\n`, 'utf8');
      },
      ...(manifest.turnContextSpoolPath === undefined ? {} : {
        onTurnContext: (context: Readonly<Record<string, unknown>>) => {
          appendFileSync(manifest.turnContextSpoolPath ?? '', `${JSON.stringify(context)}\n`, 'utf8');
        },
      }),
    });
    return;
  }
  const fixturePath = launcherPath;
  const thirdArgument = positional[1];
  const scenario = thirdArgument?.startsWith('--') === true ? thirdArgument : undefined;
  if (thirdArgument !== undefined && scenario === undefined && (thirdArgument.length < 16 || thirdArgument.length > 300)) {
    throw new TypeError('Engine MCP launcher token must contain 16 to 300 characters.');
  }
  const options: Parameters<typeof runEngineMcpServer>[1] = scenario === '--correction'
    ? { revision: 2, phase: 'correction' as const, correctionNumber: 1, historyKind: 'proposal_correction_requested', ...(selectedProfile === undefined ? {} : { toolProfile: selectedProfile }) }
    : scenario === '--room-transition'
      ? { revision: 3, room: 2, historyKind: 'room_transition', ...(selectedProfile === undefined ? {} : { toolProfile: selectedProfile }) }
      : selectedProfile === undefined ? {} : { toolProfile: selectedProfile };
  if (scenario !== undefined && scenario !== '--correction' && scenario !== '--room-transition') {
    throw new TypeError('Unknown engine MCP fixture scenario.');
  }
  await runEngineMcpServer(fixturePath, options, true);
}
