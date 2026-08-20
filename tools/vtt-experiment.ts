import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../src/commands/canonical-json';
import { ControllerRegistry, AlgorithmController, type Controller } from '../src/combat/controllers';
import { TurnCoordinator } from '../src/combat/coordinator';
import { createEncounter, reduceEncounter } from '../src/combat/encounter';
import type { EncounterCommand } from '../src/combat/events';
import { mulberry32 } from '../src/combat/random';
import { encounterSessionId, type EncounterSessionId } from '../src/combat/values';
import { LocalhostDmBridgeClient, type BridgeFetch } from '../src/vtt/dm-bridge/client';
import {
  DEFAULT_DM_MODEL,
  DEFAULT_DM_REASONING_EFFORT,
  decodeRoundPlanReply,
  e01RoundPlanReplyContract,
  type DecodedRoundPlanReply,
  type DmBridgeExchange,
  type DmBridgeModelConfig,
  type DmBridgeRequest,
  type E01PromptVariant,
  type RoundPlanCorrectionRequest,
  type RoundPlanRequest,
} from '../src/vtt/dm-bridge/contracts';
import { DmRoundPlanController, DmRoundPlanSession } from '../src/vtt/dm-bridge/decision-program';
import { projectDmBoard } from '../src/vtt/encounter-projections';
import {
  aggregateExperimentRecords,
  computeTacticalRegretFromCaptures,
  decodeExperimentTableRecord,
  VTT_EXPERIMENT_SCHEMA_VERSION,
  type ExperimentCallRecord,
  type ExperimentTableRecord,
  type PromptComponentTelemetry,
  type RolloutInputCapture,
} from '../src/vtt/experiment-telemetry';
import type { FleetTelemetry } from '../src/vtt/fleet-telemetry';
import {
  approvedFixtureTurnLegalActions,
  encounterStateFromApprovedFixture,
} from '../src/vtt/generated-encounter-fixtures';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../src/vtt/test-approved-first-skirmish';

export type ExperimentId = 'E01';

export interface ExperimentArmDefinition {
  readonly id: E01PromptVariant;
  readonly description: string;
}

export interface ExperimentDefinition {
  readonly id: ExperimentId;
  readonly version: '1';
  readonly hypothesis: string;
  readonly arms: readonly ExperimentArmDefinition[];
  readonly seedCount: 24;
  readonly replicates: 2;
  readonly rounds: 5;
  readonly enemyCount: 4;
}

export const EXPERIMENT_REGISTRY: Readonly<Record<ExperimentId, ExperimentDefinition>> = Object.freeze({
  E01: Object.freeze({
    id: 'E01',
    version: '1',
    hypothesis: 'Removing duplicated contract data cuts input tokens and latency without increasing invalid replies.',
    arms: Object.freeze([
      { id: 'duplicated-full-contract', description: 'Repeat the strict schema and example in every request.' },
      { id: 'contract-once-by-id', description: 'Send the strict contract once per fresh session, then address it by id.' },
      { id: 'compact-grammar', description: 'Send the compact JSON grammar while retaining the same strict validator.' },
    ] satisfies readonly ExperimentArmDefinition[]),
    seedCount: 24,
    replicates: 2,
    rounds: 5,
    enemyCount: 4,
  }),
});

export interface ExperimentScheduleEntry {
  readonly experimentId: ExperimentId;
  readonly armId: E01PromptVariant;
  readonly seed: number;
  readonly replicate: 1 | 2;
  readonly batchId: 'batch-1' | 'batch-2';
  readonly pairId: string;
  readonly tableIndex: number;
  readonly randomizedArmOrdinal: number;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function e01Seed(seedIndex: number): number {
  if (!Number.isSafeInteger(seedIndex) || seedIndex < 0 || seedIndex >= 24) {
    throw new RangeError('E01 seed index must be from 0 through 23.');
  }
  return Number.parseInt(sha256(`D320:E01:v1:paired-seed:${String(seedIndex)}`).slice(0, 8), 16) >>> 0;
}

export function seededArmOrder(
  arms: readonly E01PromptVariant[],
  seed: number,
  replicate: 1 | 2,
): readonly E01PromptVariant[] {
  const rng = mulberry32((seed ^ Math.imul(replicate, 0x9e37_79b9)) >>> 0);
  const shuffled = [...arms];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(rng() * (index + 1));
    const held = shuffled[index];
    shuffled[index] = shuffled[selected]!;
    shuffled[selected] = held!;
  }
  return shuffled;
}

export function buildExperimentSchedule(id: ExperimentId): readonly ExperimentScheduleEntry[] {
  const definition = EXPERIMENT_REGISTRY[id];
  const armIds = definition.arms.map((arm) => arm.id);
  const schedule: ExperimentScheduleEntry[] = [];
  let tableIndex = 0;
  for (const replicate of [1, 2] as const) {
    for (let seedIndex = 0; seedIndex < definition.seedCount; seedIndex += 1) {
      const seed = e01Seed(seedIndex);
      const order = seededArmOrder(armIds, seed, replicate);
      for (const [randomizedArmOrdinal, armId] of order.entries()) {
        schedule.push({
          experimentId: id,
          armId,
          seed,
          replicate,
          batchId: replicate === 1 ? 'batch-1' : 'batch-2',
          pairId: `${id}:seed:${String(seed)}:batch:${String(replicate)}`,
          tableIndex,
          randomizedArmOrdinal,
        });
        tableIndex += 1;
      }
    }
  }
  return schedule;
}

export interface VttExperimentConfig {
  readonly experimentId: ExperimentId;
  readonly outDirectory: string;
  readonly skipRegret: boolean;
  readonly codexBinary: string;
  readonly model: string;
  readonly reasoningEffort: DmBridgeModelConfig['reasoningEffort'];
  readonly requestTimeoutMs: number;
  readonly tableTimeoutMs: number;
}

export interface ExperimentPreregistration {
  readonly schemaVersion: 1;
  readonly programVersion: 'D320-v1';
  readonly experimentId: ExperimentId;
  readonly experimentVersion: '1';
  readonly hypothesis: string;
  readonly arms: readonly ExperimentArmDefinition[];
  readonly fixtures: readonly string[];
  readonly holdouts: readonly string[];
  readonly seedList: readonly number[];
  readonly runOrder: readonly ExperimentScheduleEntry[];
  readonly modelId: string;
  readonly reasoningEffort: string;
  readonly promptComponentHashes: Readonly<Record<E01PromptVariant, string>>;
  readonly controllerConfiguration: string;
  readonly initiativeConfiguration: string;
  readonly primaryMetrics: readonly string[];
  readonly secondaryMetrics: readonly string[];
  readonly noninferiorityMargins: Readonly<Record<string, number>>;
  readonly timeouts: { readonly requestMs: number; readonly tableMs: number };
  readonly exclusions: readonly string[];
  readonly infrastructureRerunRule: string;
  readonly analysisCodeDigest: string;
  readonly digest: string;
}

function promptHash(variant: E01PromptVariant): string {
  return sha256(canonicalJson([
    e01RoundPlanReplyContract(variant, 0),
    e01RoundPlanReplyContract(variant, 1),
  ]));
}

export function preregisterExperiment(config: VttExperimentConfig): ExperimentPreregistration {
  const definition = EXPERIMENT_REGISTRY[config.experimentId];
  const withoutDigest = {
    schemaVersion: 1 as const,
    programVersion: 'D320-v1' as const,
    experimentId: definition.id,
    experimentVersion: definition.version,
    hypothesis: definition.hypothesis,
    arms: definition.arms,
    fixtures: ['experiment-fixture:E01:approved-first-skirmish-first-four-monsters:v1'],
    holdouts: [],
    seedList: Array.from({ length: definition.seedCount }, (_value, index) => e01Seed(index)),
    runOrder: buildExperimentSchedule(definition.id),
    modelId: config.model,
    reasoningEffort: config.reasoningEffort,
    promptComponentHashes: Object.fromEntries(
      definition.arms.map((arm) => [arm.id, promptHash(arm.id)]),
    ) as Readonly<Record<E01PromptVariant, string>>,
    controllerConfiguration: 'dm-full-model-round-plan;pc-algorithm;fresh-session-per-table',
    initiativeConfiguration: 'shared_enemy;deterministic-within-side-order',
    primaryMetrics: ['completedRoundsPerHour', 'normalizedTacticalRegret'],
    secondaryMetrics: ['latencyMs', 'tokenCounts', 'correctionRate', 'reconsultRate', 'round5HpDifferential'],
    noninferiorityMargins: { normalizedTacticalRegret: 0.02, correctionPercentagePoints: 2 },
    timeouts: { requestMs: config.requestTimeoutMs, tableMs: config.tableTimeoutMs },
    exclusions: [],
    infrastructureRerunRule: 'Only an infrastructure-classified failure may rerun, once, under identical manifest bytes.',
    analysisCodeDigest: sha256('E01-analysis-v1:linear-interpolated-quartiles:aborts-retained'),
  };
  return { ...withoutDigest, digest: sha256(canonicalJson(withoutDigest)) };
}

interface RunningBridge {
  readonly endpoint: Promise<string>;
  stop(): Promise<void>;
}

function launchBridge(config: VttExperimentConfig, entry: ExperimentScheduleEntry): RunningBridge {
  const script = fileURLToPath(new URL('./discord-launcher/codex-dm-bridge.mjs', import.meta.url));
  const dataDirectory = `${config.outDirectory}/bridge/table-${String(entry.tableIndex).padStart(4, '0')}`;
  const child = spawn(process.execPath, [script], {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      DM_BRIDGE_PORT: '0',
      DM_BRIDGE_DATA_DIR: dataDirectory,
      DM_BRIDGE_REQUEST_TIMEOUT_MS: String(config.requestTimeoutMs),
      DM_BRIDGE_BUILD_ID: `vtt-experiment-${entry.experimentId}-${String(entry.tableIndex).padStart(4, '0')}`,
      DM_BRIDGE_COMMIT: 'supervisor-owned',
      DM_BRIDGE_LOAD_LEVEL: 'sequential-experiment',
      DM_BRIDGE_CODEX_BIN: config.codexBinary,
    },
  });
  const pid = child.pid;
  if (pid === undefined) throw new Error('Experiment bridge did not receive a process id.');
  let stderr = '';
  let resolveEndpoint: (endpoint: string) => void = () => undefined;
  let rejectEndpoint: (error: Error) => void = () => undefined;
  let endpointSettled = false;
  const endpoint = new Promise<string>((resolve, reject) => {
    resolveEndpoint = resolve;
    rejectEndpoint = reject;
  });
  child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString('utf8')).slice(-16_384); });
  child.stdout.on('data', (chunk: Buffer) => {
    const match = /listening on (http:\/\/127\.0\.0\.1:\d+)/u.exec(chunk.toString('utf8'));
    if (match?.[1] !== undefined && !endpointSettled) {
      endpointSettled = true;
      resolveEndpoint(match[1]);
    }
  });
  let resolveExit: () => void = () => undefined;
  const exited = new Promise<void>((resolve) => { resolveExit = resolve; });
  child.once('error', (error) => {
    if (!endpointSettled) {
      endpointSettled = true;
      rejectEndpoint(error);
    }
  });
  child.once('exit', (code, signal) => {
    if (!endpointSettled) {
      endpointSettled = true;
      rejectEndpoint(new Error(`Experiment bridge exited before readiness (code ${code ?? 'null'}, signal ${signal ?? 'none'}): ${stderr}`));
    }
    resolveExit();
  });
  return {
    endpoint,
    async stop(): Promise<void> {
      const send = (signal: NodeJS.Signals): void => {
        try {
          if (process.platform === 'win32') child.kill(signal);
          else process.kill(-pid, signal);
        } catch (error: unknown) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
        }
      };
      if (child.exitCode === null && child.signalCode === null) send('SIGTERM');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const outcome = await Promise.race([
        exited.then(() => 'exited' as const),
        new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), 2_000); }),
      ]);
      if (timer !== undefined) clearTimeout(timer);
      if (outcome === 'timeout') {
        send('SIGKILL');
        await exited;
      }
    },
  };
}

function timeoutFetch(timeoutMs: number): BridgeFetch {
  return async (url, init) => {
    const controller = new AbortController();
    const relay = (): void => controller.abort(init.signal?.reason);
    if (init.signal?.aborted === true) relay();
    else init.signal?.addEventListener('abort', relay, { once: true });
    const timer = setTimeout(() => controller.abort(new Error(`Experiment request exceeded ${String(timeoutMs)}ms.`)), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', relay);
    }
  };
}

function component(content: string, version: string | null): PromptComponentTelemetry {
  const bytes = new TextEncoder().encode(content).length;
  return { version, digest: content.length === 0 ? null : sha256(content), bytes, estimatedTokens: Math.ceil(bytes / 4) };
}

function validatorCategory(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('unexpected field')) return 'unrecognized_key';
  if (message.includes('stale or malformed')) return 'stale_envelope';
  if (message.includes('exactly one program')) return 'monster_set_mismatch';
  if (message.includes('outside the DM projection')) return 'unknown_combatant_reference';
  return 'structural_validation';
}

function programMetrics(decoded: DecodedRoundPlanReply | null): {
  readonly nodes: number | null;
  readonly depth: number | null;
  readonly branches: number | null;
} {
  if (decoded === null) return { nodes: null, depth: null, branches: null };
  const walk = (program: DecodedRoundPlanReply['plan']['monsters'][number]['program']): { nodes: number; depth: number; branches: number } => {
    if (program.kind === 'action') return { nodes: 1, depth: 1, branches: 0 };
    if (program.kind === 'if') {
      const thenMetrics = walk(program.then);
      const elseMetrics = walk(program.else);
      return {
        nodes: 1 + thenMetrics.nodes + elseMetrics.nodes,
        depth: 1 + Math.max(thenMetrics.depth, elseMetrics.depth),
        branches: 1 + thenMetrics.branches + elseMetrics.branches,
      };
    }
    const children = program.choices.map(walk);
    return {
      nodes: 1 + children.reduce((sum, child) => sum + child.nodes, 0),
      depth: 1 + Math.max(...children.map((child) => child.depth)),
      branches: Math.max(0, program.choices.length - 1) + children.reduce((sum, child) => sum + child.branches, 0),
    };
  };
  const metrics = decoded.plan.monsters.map((monster) => walk(monster.program));
  return {
    nodes: metrics.reduce((sum, value) => sum + value.nodes, 0),
    depth: Math.max(...metrics.map((value) => value.depth)),
    branches: metrics.reduce((sum, value) => sum + value.branches, 0),
  };
}

class RecordingE01Exchange implements DmBridgeExchange {
  readonly calls: ExperimentCallRecord[] = [];
  #callIndex = 0;

  constructor(
    private readonly delegate: LocalhostDmBridgeClient,
    private readonly telemetry: FleetTelemetry[],
    private readonly entry: ExperimentScheduleEntry,
    private readonly bridgeDataDirectory: string,
  ) {}

  async exchange(request: DmBridgeRequest, signal: AbortSignal): Promise<unknown> {
    if (request.kind === 'steering_round_request') return this.delegate.exchange(request, signal);
    const callIndex = this.#callIndex;
    this.#callIndex += 1;
    const contract = e01RoundPlanReplyContract(this.entry.armId, callIndex);
    const wire: RoundPlanRequest | RoundPlanCorrectionRequest | Extract<DmBridgeRequest, { readonly kind: 'monster_reconsult_request' }> = {
      ...request,
      replyContract: contract,
    };
    const logicalCallId = `${this.entry.pairId}:${this.entry.armId}:call:${String(callIndex)}`;
    const parentCallId = wire.kind === 'round_plan_correction_request'
      ? this.calls.find((call) => call.requestId === wire.originalRequestId)?.logicalCallId ?? null
      : null;
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    const beforeTelemetry = this.telemetry.length;
    let reply: unknown = null;
    let exchangeError: unknown = null;
    try {
      reply = await this.delegate.exchange(wire, signal);
    } catch (error: unknown) {
      exchangeError = error;
    }
    const finished = Date.now();
    const fleet = this.telemetry[beforeTelemetry] ?? null;
    let decoded: DecodedRoundPlanReply | null = null;
    let validationError: unknown = null;
    if (exchangeError === null) {
      try {
        decoded = decodeRoundPlanReply(reply, wire);
      } catch (error: unknown) {
        validationError = error;
      }
    }
    const source = canonicalJson(reply);
    const projection = canonicalJson(wire.projection);
    const history = canonicalJson(wire.history);
    const schemaGrammar = contract.delivery === 'full'
      ? canonicalJson(contract.jsonSchema)
      : contract.delivery === 'compact' ? contract.grammar : contract.contractId;
    const example = contract.delivery === 'full' || contract.delivery === 'compact'
      ? canonicalJson(contract.canonicalExample)
      : '';
    const metrics = programMetrics(decoded);
    const stateHash = sha256(canonicalJson(wire.projection.encounter));
    const legalActions = wire.projection.pendingRequest?.legalActions ?? [];
    const failed = exchangeError ?? validationError;
    const call: ExperimentCallRecord = {
      logicalCallId,
      parentCallId,
      transcriptId: `${logicalCallId}:transcript`,
      telemetryLink: `${this.bridgeDataDirectory}/exchange-cache/${sha256(`${wire.encounterId}\0${wire.requestId}`)}.json`,
      requestId: wire.requestId,
      phase: wire.kind === 'round_plan_correction_request'
        ? 'correction'
        : wire.kind === 'monster_reconsult_request' ? 'reconsult' : 'initial_plan',
      requestKind: wire.kind,
      attemptIndex: wire.correctionAttempt,
      round: wire.round,
      actorIds: wire.kind === 'monster_reconsult_request' ? [wire.monsterId] : wire.kind === 'round_plan_request' ? [...wire.livingMonsterIds] : [...wire.requestedMonsterIds],
      livingMonsterIds: wire.projection.encounter.combatants.filter((subject) => subject.kind === 'monster' && subject.life === 'living').map((subject) => subject.id),
      startedAt,
      finishedAt: new Date(finished).toISOString(),
      firstTokenMs: null,
      processStartupMs: null,
      queueMs: null,
      exchangeMs: fleet?.latencyMs ?? finished - started,
      modelWaitMs: fleet?.latencyMs ?? null,
      algorithmMs: null,
      validationMs: 0,
      compileMs: 0,
      executionMs: null,
      latencyMs: fleet?.latencyMs ?? finished - started,
      estimatedCallCostUsd: null,
      promptComponents: {
        instructions: component('You are the DM decision engine. Return exactly one JSON object and no markdown.', 'e01-terse-v1'),
        schemaGrammar: component(schemaGrammar, contract.contractId),
        examples: component(example, example.length === 0 ? null : 'round-plan-canonical-v1'),
        skills: component('', null),
        library: component('', null),
        projection: component(projection, 'dm-full-v1'),
        history: component(history, 'revision-history-v1'),
      },
      contractId: contract.contractId,
      fullStateHash: stateHash,
      transmittedViewHash: sha256(projection),
      snapshotBytes: new TextEncoder().encode(projection).length,
      deltaBytes: 0,
      historySentCount: wire.history.length,
      historyOmittedCount: 0,
      cacheAgeMs: null,
      cacheRatio: fleet === null || fleet.tokenCounts === null || fleet.tokenCounts.input === 0 ? null : fleet.tokenCounts.cachedInput / fleet.tokenCounts.input,
      reconstructionMatched: true,
      referencedCombatantIds: wire.projection.encounter.combatants.map((subject) => subject.id),
      referencedResourceIds: [],
      outputBytes: new TextEncoder().encode(source).length,
      inputTokens: fleet?.tokenCounts?.input ?? 0,
      cachedInputTokens: fleet?.tokenCounts?.cachedInput ?? 0,
      outputTokens: fleet?.tokenCounts?.output ?? 0,
      reasoningTokens: fleet?.tokenCounts?.reasoning ?? 0,
      reasoningTokenShare: fleet?.tokenCounts === null || fleet?.tokenCounts === undefined || fleet.tokenCounts.output === 0 ? null : fleet.tokenCounts.reasoning / fleet.tokenCounts.output,
      firstPassValid: wire.correctionAttempt === 0 && failed === null,
      validationResult: exchangeError !== null ? 'not_run' : validationError === null ? 'valid' : 'invalid',
      validatorErrorCategory: validationError === null ? null : validatorCategory(validationError),
      compileErrorCategory: null,
      failedSchemaPath: validationError instanceof Error ? /^round plan([^ ]*)/u.exec(validationError.message)?.[1] ?? null : null,
      correctionAttempt: wire.correctionAttempt,
      correctionBudget: 2,
      correctionOfCallId: parentCallId,
      reconsultReason: wire.kind === 'monster_reconsult_request' ? wire.invalidation : null,
      invalidationEvent: wire.kind === 'monster_reconsult_request' ? wire.invalidation : null,
      abortCategory: exchangeError === null ? null : 'bridge_exchange',
      abortReason: exchangeError === null ? null : exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
      sourceChars: source.length,
      sourceBytes: new TextEncoder().encode(source).length,
      sourceTokenEstimate: Math.ceil(new TextEncoder().encode(source).length / 4),
      sourceHash: sha256(source),
      astNodeCount: metrics.nodes,
      astHash: decoded === null ? null : sha256(canonicalJson(decoded.plan)),
      programDepth: metrics.depth,
      branchCount: metrics.branches,
      branchCoverage: null,
      compileValid: decoded !== null,
      sandboxStepCount: null,
      sandboxTimeMs: null,
      boundViolation: false,
      ambientAuthorityViolation: false,
      chosenBranchTrace: [],
      emittedAction: null,
      emittedActionValid: decoded !== null,
      legalActionSetHash: sha256(canonicalJson(legalActions)),
      preStateHash: stateHash,
      postStateHash: stateHash,
      executionDry: false,
      phaseBoundary: 'enemy_block',
      batchSize: wire.kind === 'monster_reconsult_request' ? 1 : wire.kind === 'round_plan_request' ? wire.livingMonsterIds.length : wire.requestedMonsterIds.length,
      callActivationFanout: wire.kind === 'monster_reconsult_request' ? 1 : wire.kind === 'round_plan_request' ? wire.livingMonsterIds.length : wire.requestedMonsterIds.length,
      planAgeRevisions: 0,
      algorithmRankedActions: [],
      algorithmExpectedValues: [],
      triggerReason: 'every_round',
      stance: null,
      proposedOverride: null,
      overrideEditCount: 0,
      overrideChars: 0,
      overrideAccepted: false,
      fallbackUsed: false,
      activationsWithoutModel: 0,
      normalizedPatternHash: null,
      clusterFrequency: null,
      promotionEpoch: null,
      libraryFunction: null,
      libraryParameters: null,
      libraryHit: false,
      expansionHash: null,
      expandedTokenEstimate: 0,
      expansionEquivalent: true,
      parameterError: null,
      sourceProjection: wire.projection,
      generatedSource: reply,
      parsedOrCompiled: decoded?.plan ?? null,
      expandedLibraryForm: null,
      replayProof: null,
    };
    this.calls.push(call);
    if (exchangeError !== null) throw exchangeError;
    return reply;
  }
}

function fourEnemyState() {
  const source = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
  const players = source.combatants.filter((subject) => subject.profile.kind === 'player_character');
  const monsters = source.combatants.filter((subject) => subject.profile.kind === 'monster').slice(0, 4);
  const selected = [...players, ...monsters];
  const ids = new Set(selected.map((subject) => subject.profile.id));
  return createEncounter({
    config: { initiativeMode: 'shared_enemy' },
    bounds: source.bounds,
    blockedCells: source.blockedCells,
    foggedCells: source.foggedCells,
    dmNotes: source.dmNotes,
    combatants: selected.map((subject) => subject.profile),
    tokens: source.tokens.filter((token) => ids.has(token.combatantId)),
  });
}

export async function runE01Table(
  entry: ExperimentScheduleEntry,
  config: VttExperimentConfig,
  preregistration: ExperimentPreregistration,
): Promise<ExperimentTableRecord> {
  const wallStarted = Date.now();
  const bridge = launchBridge(config, entry);
  const abort = new AbortController();
  const telemetry: FleetTelemetry[] = [];
  const decisions: { readonly round: number; readonly command: unknown }[] = [];
  const replayCommands: EncounterCommand[] = [];
  let coordinator: TurnCoordinator | null = null;
  let recording: RecordingE01Exchange | null = null;
  let abortReason: string | null = null;
  let timeoutCount = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const endpoint = await bridge.endpoint;
    const client = new LocalhostDmBridgeClient(endpoint, timeoutFetch(config.requestTimeoutMs), () => undefined, (value) => telemetry.push(value));
    const encounterId: EncounterSessionId = encounterSessionId(`encounter:experiment:${entry.experimentId}:${String(entry.tableIndex)}:${String(entry.seed)}`);
    const model = { model: config.model, reasoningEffort: config.reasoningEffort };
    const sessionId = await client.createSession(encounterId, abort.signal, model);
    const bridgeDirectory = `${config.outDirectory}/bridge/table-${String(entry.tableIndex).padStart(4, '0')}`;
    recording = new RecordingE01Exchange(client, telemetry, entry, bridgeDirectory);
    const session = new DmRoundPlanSession(recording, model);
    const state = fourEnemyState();
    let registry: ControllerRegistry;
    const controllerFor = (id: (typeof state.combatants)[number]): Controller => id.profile.kind === 'monster'
      ? new DmRoundPlanController(session, () => {
          if (coordinator === null) throw new Error('Experiment coordinator is not initialized.');
          return {
            encounterId,
            codexSessionId: sessionId,
            projection: projectDmBoard({
              state: coordinator.state(),
              coordinator: coordinator.coordinatorState(),
              controllers: registry.identities(),
              history: [],
            }),
            history: [],
            initiativeMode: coordinator.state().config.initiativeMode,
          };
        })
      : new AlgorithmController();
    registry = new ControllerRegistry(state.combatants.map((subject) => ({
      combatantId: subject.profile.id,
      controller: controllerFor(subject),
      controllerId: `${subject.profile.id}:${subject.profile.kind === 'monster' ? 'experiment-dm' : 'experiment-algorithm'}`,
    })));
    coordinator = new TurnCoordinator(state, registry, mulberry32(entry.seed), {
      turnLegalActions: approvedFixtureTurnLegalActions,
      persistence: {
        record: ({ transition, encounterState }) => {
          if (transition.kind === 'controller_response_received') {
            const actor = 'actor' in transition.decision.action ? transition.decision.action.actor : null;
            const subject = actor === null
              ? undefined
              : encounterState.combatants.find((candidate) => candidate.profile.id === actor);
            if (subject?.profile.kind === 'monster') {
              decisions.push({ round: encounterState.round, command: transition.decision.action });
            }
          }
          if (transition.kind === 'reducer_applied') {
            replayCommands.push(transition.command);
          }
        },
      },
    });
    const operation = (async () => {
      const maximumSteps = (state.combatants.length + 1) * 5 + 2;
      for (let step = 0; step < maximumSteps; step += 1) {
        if (coordinator!.state().round > 5) return;
        const result = await coordinator!.step();
        if (result.kind === 'refused') throw new Error(`Experiment coordinator refused: ${result.reason}`);
      }
      if (coordinator!.state().round <= 5) throw new Error('Experiment table exceeded its deterministic step bound.');
    })();
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        timeoutCount += 1;
        abort.abort(new Error(`Experiment table exceeded ${String(config.tableTimeoutMs)}ms.`));
        coordinator?.interrupt();
        reject(new Error(`Experiment table exceeded ${String(config.tableTimeoutMs)}ms.`));
      }, config.tableTimeoutMs);
    });
    await Promise.race([operation, deadline]);
  } catch (error: unknown) {
    abortReason = error instanceof Error ? error.message : String(error);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    await bridge.stop();
  }
  const calls = recording?.calls ?? [];
  const finalStateHash = sha256(canonicalJson(coordinator?.state() ?? null));
  let replayState = fourEnemyState();
  const replayRng = mulberry32(entry.seed);
  for (const command of replayCommands) replayState = reduceEncounter(replayState, command, replayRng).state;
  const replayProofPassed = coordinator !== null && canonicalJson(replayState) === canonicalJson(coordinator.state());
  const replayProof = {
    commandCount: replayCommands.length,
    finalStateHash: sha256(canonicalJson(replayState)),
    matched: replayProofPassed,
  };
  const effectiveAbortReason = abortReason ?? (replayProofPassed ? null : 'Deterministic replay proof failed.');
  const completedRounds = Math.min(5, Math.max(0, (coordinator?.state().round ?? 1) - 1));
  const finalizedCalls = calls.map((call, index): ExperimentCallRecord => {
    const next = calls.slice(index + 1).find((candidate) => candidate.phase === 'initial_plan');
    const roundDecisions = decisions.filter((decision) => decision.round === call.round).map((decision) => decision.command);
    return {
      ...call,
      emittedAction: roundDecisions.length === 0 ? call.emittedAction : roundDecisions,
      emittedActionValid: call.validationResult === 'valid' && roundDecisions.length > 0,
      postStateHash: next?.preStateHash ?? finalStateHash,
      executionDry: call.validationResult === 'valid' && roundDecisions.length === 0,
      replayProof,
    };
  });
  const captures: RolloutInputCapture[] = finalizedCalls
    .filter((call) => call.phase === 'initial_plan' && call.validationResult === 'valid')
    .map((call) => ({
      logicalCallId: call.logicalCallId,
      stateHash: call.preStateHash,
      legalActionSetHash: call.legalActionSetHash,
      selectedAction: call.emittedAction,
      input: { projection: call.sourceProjection, parsedProgram: call.parsedOrCompiled },
    }));
  if (!config.skipRegret) computeTacticalRegretFromCaptures(captures);
  const wallMs = Date.now() - wallStarted;
  const correctionCount = finalizedCalls.filter((call) => call.phase === 'correction').length;
  const initialCalls = finalizedCalls.filter((call) => call.phase === 'initial_plan').length;
  const state = coordinator?.state();
  const monsterHp = state?.combatants.filter((subject) => subject.profile.kind === 'monster').reduce((sum, subject) => sum + subject.hitPoints, 0) ?? 0;
  const playerHp = state?.combatants.filter((subject) => subject.profile.kind === 'player_character').reduce((sum, subject) => sum + subject.hitPoints, 0) ?? 0;
  const fixtureDigest = sha256(canonicalJson(fourEnemyState()));
  const partyDigest = sha256(canonicalJson(fourEnemyState().combatants.filter((subject) => subject.profile.kind === 'player_character').map((subject) => subject.profile)));
  return decodeExperimentTableRecord({
    schemaVersion: VTT_EXPERIMENT_SCHEMA_VERSION,
    programVersion: preregistration.programVersion,
    experimentId: entry.experimentId,
    experimentVersion: preregistration.experimentVersion,
    preregistrationDigest: preregistration.digest,
    armId: entry.armId,
    batchId: entry.batchId,
    pairId: entry.pairId,
    replicate: entry.replicate,
    tableIndex: entry.tableIndex,
    seed: entry.seed,
    randomizedArmOrdinal: entry.randomizedArmOrdinal,
    fixtureId: preregistration.fixtures[0],
    fixtureDigest,
    matchupFamily: 'approved-first-skirmish-first-four',
    enemyCountStratum: 4,
    partySource: 'reference',
    partyDigest,
    configurationManifestDigest: sha256(canonicalJson({ armId: entry.armId, model: config.model, effort: config.reasoningEffort, rounds: 5 })),
    controllerSide: 'dm',
    controllerMode: 'full_model_round_plan',
    modelId: config.model,
    reasoningEffort: config.reasoningEffort,
    initiativeMode: 'shared_enemy',
    initiativeOrder: state?.initiative.map((initiative) => initiative.combatant) ?? [],
    promptVariant: entry.armId,
    schemaVariant: 'round-plan-json-ast-v1',
    exampleCount: 1,
    instructionVersion: 'e01-terse-v1',
    skillSetVersion: 'none-v1',
    planSurface: 'json_ast',
    projectionMode: 'full',
    libraryVersion: 'none-v1',
    correctionBudget: 2,
    pricingVersion: 'unpriced-v1',
    buildId: telemetry.at(-1)?.buildId ?? null,
    commit: telemetry.at(-1)?.commit ?? null,
    loadLevelTag: telemetry.at(-1)?.loadLevelTag ?? null,
    status: effectiveAbortReason === null ? 'completed' : 'aborted',
    completedRounds,
    resolutionRound: null,
    winner: null,
    dmCalls: finalizedCalls.length,
    pcCalls: 0,
    callsPerRound: completedRounds === 0 ? 0 : finalizedCalls.length / completedRounds,
    completedRoundsPerHour: wallMs === 0 ? 0 : completedRounds * 3_600_000 / wallMs,
    correctionCount,
    correctionExhausted: effectiveAbortReason?.includes('corrections') ?? false,
    reconsultCount: finalizedCalls.filter((call) => call.phase === 'reconsult').length,
    staleReferenceCount: finalizedCalls.filter((call) => call.validatorErrorCategory === 'stale_envelope').length,
    dryProgramCount: finalizedCalls.filter((call) => call.executionDry).length,
    damageBySide: { dm: 0, pc: 0 },
    hpCurveBySide: { dm: [monsterHp], pc: [playerHp] },
    firstDownRound: null,
    firstDeathRound: null,
    resourceAvailableCount: 0,
    resourceUseCount: 0,
    wastedTurnCount: 0,
    bridgeRestartCount: 0,
    timeoutCount,
    gapCount: 0,
    replayBundleDigest: sha256(canonicalJson(replayCommands)),
    replayProofPassed,
    totalWallMs: wallMs,
    idleWaitMs: 0,
    estimatedTableCostUsd: null,
    calls: finalizedCalls,
    quality: {
      rolloutOracleVersion: null,
      rolloutHorizon: null,
      rolloutCount: null,
      rolloutSeedDigest: null,
      candidateActionProgramHashes: [],
      candidateUtilities: [],
      selectedUtility: null,
      bestUtility: null,
      normalizedTacticalRegret: null,
      targetOracleVerdict: null,
      targetOracleViolation: null,
      simBaselineVersion: null,
      simExpectedDamage: null,
      tacticalEfficiencyRatio: null,
      resourceDisciplineRatio: null,
      expectedResolutionBand: null,
      fightShapeDelta: null,
      narrationSampleIds: [],
      blindAssignment: null,
      raterModel: null,
      raterEffort: null,
      raterPromptHash: null,
      dimensionScores: [],
      disagreementStatus: null,
      adjudicationStatus: null,
      rolloutInputCaptures: captures,
      regretStatus: 'deferred',
    },
  });
}

export interface VttExperimentRuntime {
  readonly runTable?: (
    entry: ExperimentScheduleEntry,
    config: VttExperimentConfig,
    preregistration: ExperimentPreregistration,
  ) => Promise<ExperimentTableRecord>;
}

export interface ExperimentReport {
  readonly schemaVersion: 1;
  readonly experimentId: ExperimentId;
  readonly experimentVersion: '1';
  readonly preregistrationDigest: string;
  readonly tableCount: number;
  readonly aggregates: ReturnType<typeof aggregateExperimentRecords>;
}

function markdownReport(report: ExperimentReport): string {
  const lines = [
    `# ${report.experimentId} experiment summary`,
    '',
    `Pre-registration: \`${report.preregistrationDigest}\``,
    '',
    '| Arm | Tables | Completed | Aborted | Completion | Wall median (IQR) ms | Latency median (IQR) ms | Correction rate | Input / cached / output / reasoning tokens |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const arm of report.aggregates) {
    lines.push(`| ${arm.armId} | ${String(arm.tableCount)} | ${String(arm.completedCount)} | ${String(arm.abortedCount)} | ${(arm.completionRate * 100).toFixed(1)}% | ${arm.totalWallMs.median?.toFixed(1) ?? 'n/a'} (${arm.totalWallMs.iqr?.toFixed(1) ?? 'n/a'}) | ${arm.latencyMs.median?.toFixed(1) ?? 'n/a'} (${arm.latencyMs.iqr?.toFixed(1) ?? 'n/a'}) | ${(arm.correctionRate * 100).toFixed(2)}% | ${String(arm.tokenTotals.input)} / ${String(arm.tokenTotals.cachedInput)} / ${String(arm.tokenTotals.output)} / ${String(arm.tokenTotals.reasoning)} |`);
  }
  return `${lines.join('\n')}\n`;
}

export async function runVttExperiment(
  config: VttExperimentConfig,
  runtime: VttExperimentRuntime = {},
): Promise<ExperimentReport> {
  if (config.outDirectory.trim().length === 0) throw new TypeError('--out is required.');
  if (!config.skipRegret) computeTacticalRegretFromCaptures([]);
  const preregistration = preregisterExperiment(config);
  await mkdir(config.outDirectory, { recursive: true });
  await writeFile(`${config.outDirectory}/preregistration.json`, canonicalJson(preregistration), { encoding: 'utf8', flag: 'wx' });
  const records: ExperimentTableRecord[] = [];
  const execute = runtime.runTable ?? runE01Table;
  for (const entry of preregistration.runOrder) {
    const record = decodeExperimentTableRecord(await execute(entry, config, preregistration));
    if (
      record.experimentId !== entry.experimentId || record.armId !== entry.armId ||
      record.seed !== entry.seed || record.replicate !== entry.replicate ||
      record.tableIndex !== entry.tableIndex || record.randomizedArmOrdinal !== entry.randomizedArmOrdinal
    ) {
      throw new Error(`Experiment executor returned a record for the wrong scheduled table ${String(entry.tableIndex)}.`);
    }
    records.push(record);
    await writeFile(
      `${config.outDirectory}/table-${String(entry.tableIndex).padStart(4, '0')}.json`,
      canonicalJson(record),
      { encoding: 'utf8', flag: 'wx' },
    );
  }
  const report: ExperimentReport = {
    schemaVersion: 1,
    experimentId: config.experimentId,
    experimentVersion: EXPERIMENT_REGISTRY[config.experimentId].version,
    preregistrationDigest: preregistration.digest,
    tableCount: records.length,
    aggregates: aggregateExperimentRecords(records),
  };
  await writeFile(`${config.outDirectory}/report.json`, canonicalJson(report), { encoding: 'utf8', flag: 'wx' });
  await writeFile(`${config.outDirectory}/report.md`, markdownReport(report), { encoding: 'utf8', flag: 'wx' });
  return report;
}

function options(argv: readonly string[]): ReadonlyMap<string, string | true> {
  const result = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith('--')) throw new TypeError(`Unexpected positional argument ${token}.`);
    const equals = token.indexOf('=');
    if (equals !== -1) {
      result.set(token.slice(2, equals), token.slice(equals + 1));
      continue;
    }
    if (token === '--skip-regret') {
      result.set('skip-regret', true);
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${token} needs a value.`);
    result.set(token.slice(2), value);
    index += 1;
  }
  return result;
}

function optionText(values: ReadonlyMap<string, string | true>, name: string, fallback?: string): string {
  const value = values.get(name) ?? fallback;
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`--${name} is required.`);
  return value;
}

function positiveInteger(value: string, label: string): number {
  const decoded = Number(value);
  if (!Number.isSafeInteger(decoded) || decoded < 1) throw new TypeError(`${label} must be a positive integer.`);
  return decoded;
}

export function decodeVttExperimentArguments(argv: readonly string[]): VttExperimentConfig {
  const values = options(argv);
  const allowed = new Set(['experiment', 'out', 'skip-regret', 'codex-bin', 'model', 'effort', 'request-timeout-ms', 'table-timeout-ms']);
  for (const name of values.keys()) if (!allowed.has(name)) throw new TypeError(`Unknown option --${name}.`);
  const experiment = optionText(values, 'experiment');
  if (experiment !== 'E01') throw new TypeError('--experiment must name a registered experiment (currently E01).');
  const effort = optionText(values, 'effort', DEFAULT_DM_REASONING_EFFORT);
  if (effort !== 'low' && effort !== 'medium' && effort !== 'high' && effort !== 'xhigh') {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  return {
    experimentId: experiment,
    outDirectory: optionText(values, 'out'),
    skipRegret: values.get('skip-regret') === true,
    codexBinary: optionText(values, 'codex-bin', 'codex'),
    model: optionText(values, 'model', DEFAULT_DM_MODEL),
    reasoningEffort: effort,
    requestTimeoutMs: positiveInteger(optionText(values, 'request-timeout-ms', '120000'), '--request-timeout-ms'),
    tableTimeoutMs: positiveInteger(optionText(values, 'table-timeout-ms', '900000'), '--table-timeout-ms'),
  };
}

const invokedPath = process.argv[1];
if (
  process.env.npm_lifecycle_event === 'vtt:experiment' ||
  (invokedPath !== undefined && (invokedPath.endsWith('/vtt-experiment.ts') || invokedPath.endsWith('\\vtt-experiment.ts')))
) {
  try {
    const report = await runVttExperiment(decodeVttExperimentArguments(process.argv.slice(2)));
    process.stdout.write(`${canonicalJson(report)}\n`);
    if (report.aggregates.some((arm) => arm.abortedCount > 0)) process.exitCode = 1;
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
