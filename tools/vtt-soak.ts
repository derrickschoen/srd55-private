import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../src/commands/canonical-json';
import { combatToken } from '../src/combat/combatant';
import {
  AlgorithmController,
  ControllerRegistry,
  type Controller,
} from '../src/combat/controllers';
import { TurnCoordinator } from '../src/combat/coordinator';
import {
  createEncounter,
  isInitiativeMode,
  type InitiativeMode,
} from '../src/combat/encounter';
import { mulberry32 } from '../src/combat/random';
import {
  encounterSessionId,
  type CodexSessionId,
  type EncounterSessionId,
} from '../src/combat/values';
import { LocalhostDmBridgeClient, type BridgeFetch } from '../src/vtt/dm-bridge/client';
import {
  DEFAULT_DM_MODEL,
  DEFAULT_DM_REASONING_EFFORT,
  type DmBridgeExchange,
  type DmBridgeModelConfig,
} from '../src/vtt/dm-bridge/contracts';
import {
  DmRoundPlanController,
  DmRoundPlanSession,
} from '../src/vtt/dm-bridge/decision-program';
import { projectDmBoard } from '../src/vtt/encounter-projections';
import type { FleetTelemetry } from '../src/vtt/fleet-telemetry';
import {
  loadPartySource,
  type LoadedExternalPartyPack,
  type PartyPackLoadResult,
} from '../src/vtt/party-pack';
import {
  createReplayBundle,
  exportReplayBundle,
  replayBundle,
  type ReplayBundle,
  type ReplayProof,
} from '../src/vtt/replay';
import { recordScriptedReferenceSkirmish } from '../src/vtt/scripted-skirmish';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../src/vtt/test-approved-first-skirmish';
import type { GapReport } from '../src/vtt/srd-gap-report';
import { referenceEncounterSetup } from '../src/vtt/reference-encounter';

export type SoakPartySource = 'reference' | { readonly packFile: string };
export type SoakBridgeConfig =
  | { readonly mode: 'fake' }
  | { readonly mode: 'real' };

export const DEFAULT_SOAK_REQUEST_TIMEOUT_MS = 120_000;
export const DEFAULT_SOAK_TABLE_TIMEOUT_MS = 900_000;

export interface VttSoakConfig {
  readonly tables: number;
  readonly seed: number;
  readonly rounds: number;
  readonly outDirectory: string;
  readonly packFile: string;
  readonly bridge: SoakBridgeConfig;
  readonly dmModel: string;
  readonly dmEffort: DmBridgeModelConfig['reasoningEffort'];
  readonly requestTimeoutMs: number;
  readonly tableTimeoutMs: number;
  readonly initiativeMode: InitiativeMode;
}

export type SoakBridgeLifecycleEvent =
  | { readonly kind: 'spawned'; readonly tableIndex: number; readonly pid: number }
  | { readonly kind: 'terminated'; readonly tableIndex: number; readonly pid: number };

/** Test seam for a scripted Codex executable; production callers need no overrides. */
export interface VttSoakRuntime {
  readonly bridgeScript?: string;
  readonly codexBinary?: string;
  readonly bridgeEnvironment?: Readonly<Record<string, string>>;
  readonly onBridgeLifecycle?: (event: SoakBridgeLifecycleEvent) => void;
}

export interface VttSoakTableSummary {
  readonly tableIndex: number;
  readonly seed: number;
  readonly partySource: 'reference' | 'external-pack';
  readonly replayFile: string;
  readonly gapCount: number;
  readonly coordinatorPartySize: number;
  readonly status: 'completed' | 'aborted';
  readonly exitCode: 0 | 1;
  readonly abortReason: string | null;
  readonly bridgeTelemetry: readonly FleetTelemetry[];
  readonly proof: ReplayProof;
}

export interface VttSoakSummary {
  readonly schemaVersion: 2;
  readonly seed: number;
  readonly configuredRounds: number;
  readonly bridge: SoakBridgeConfig;
  readonly dmModel: string;
  readonly dmEffort: DmBridgeModelConfig['reasoningEffort'];
  readonly requestTimeoutMs: number;
  readonly tableTimeoutMs: number;
  readonly initiativeMode: InitiativeMode;
  readonly tables: readonly VttSoakTableSummary[];
  readonly gapReports: readonly GapReport[];
}

function positiveInteger(value: number, label: string, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${label} must be an integer from 1 through ${String(maximum)}.`);
  }
  return value;
}

function unsignedSeed(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError('seed must be an unsigned 32-bit integer.');
  }
  return value;
}

export function partySourceForTable(tableIndex: number, packFile: string): SoakPartySource {
  if (!Number.isSafeInteger(tableIndex) || tableIndex < 0) {
    throw new RangeError('tableIndex must be a non-negative safe integer.');
  }
  return tableIndex % 2 === 0 ? 'reference' : { packFile };
}

function seedForTable(seed: number, tableIndex: number): number {
  return (seed + Math.imul(tableIndex + 1, 0x9e37_79b9)) >>> 0;
}

interface DmControllerBinding {
  readonly exchange: DmBridgeExchange;
  readonly encounterId: EncounterSessionId;
  readonly codexSessionId: CodexSessionId;
  readonly model: DmBridgeModelConfig;
}

function tableCoordinator(
  source: SoakPartySource,
  externalParty: LoadedExternalPartyPack,
  seed: number,
  initiativeMode: InitiativeMode,
  dm?: DmControllerBinding,
): TurnCoordinator {
  const reference = referenceEncounterSetup();
  const referenceMonster = reference.combatants.find((profile) => profile.kind === 'monster');
  if (referenceMonster === undefined) throw new Error('Reference encounter has no soak opponent.');
  const playerProfiles = source === 'reference'
    ? reference.combatants.filter((profile) => profile.kind === 'player_character')
    : externalParty.members.map((member) => member.profile);
  const combatants = [...playerProfiles, referenceMonster];
  const positions = [
    { column: 1, row: 1 },
    { column: 1, row: 2 },
    { column: 1, row: 3 },
    { column: 2, row: 1 },
    { column: 2, row: 2 },
    { column: 4, row: 2 },
  ] as const;
  const state = createEncounter({
    config: { initiativeMode },
    bounds: reference.bounds,
    blockedCells: reference.blockedCells,
    foggedCells: reference.foggedCells,
    dmNotes: [],
    combatants,
    tokens: combatants.map((profile, index) => combatToken(profile, positions[index]!)),
  });
  let coordinator: TurnCoordinator | null = null;
  const roundPlan = dm === undefined ? null : new DmRoundPlanSession(dm.exchange, dm.model);
  const controllerFor = (profile: (typeof combatants)[number]): Controller => {
    if (profile.kind !== 'monster' || roundPlan === null || dm === undefined) {
      return new AlgorithmController();
    }
    return new DmRoundPlanController(roundPlan, () => {
      if (coordinator === null) throw new Error('Soak coordinator is not initialized.');
      return {
        encounterId: dm.encounterId,
        codexSessionId: dm.codexSessionId,
        projection: projectDmBoard({
          state: coordinator.state(),
          coordinator: coordinator.coordinatorState(),
          controllers: registry.identities(),
          history: [],
        }),
        history: [],
        initiativeMode: coordinator.state().config.initiativeMode,
      };
    });
  };
  const registry = new ControllerRegistry(combatants.map((profile) => ({
    combatantId: profile.id,
    controller: controllerFor(profile),
    controllerId: profile.kind === 'monster' && dm !== undefined
      ? `${profile.id}:soak-dm-bridge`
      : `${profile.id}:soak-algorithm`,
  })));
  coordinator = new TurnCoordinator(state, registry, mulberry32(seed), {
    turnLegalActions: (_state, actor) => ({ actions: [{ type: 'end_turn', actor }] }),
  });
  return coordinator;
}

function boundedBundle(
  source: ReplayBundle,
  maximumRounds: number,
  gaps: readonly GapReport[],
  tableIndex: number,
  telemetry: FleetTelemetry | null,
  aborted: boolean,
): ReplayBundle {
  const firstAboveBound = source.revisions.findIndex(
    (entry) => entry.revision.encounterState.round > maximumRounds,
  );
  const selected = firstAboveBound === -1
    ? source.revisions
    : source.revisions.slice(0, firstAboveBound);
  const revisions = selected.map((entry) => entry.revision);
  const lastEncounterRevision = revisions.at(-1)?.encounterState.revision;
  if (lastEncounterRevision === undefined) throw new Error('Soak replay has no bounded revision.');
  const transcripts = source.transcripts
    .filter((record) => record.encounterRevision <= lastEncounterRevision)
    .map((record) => telemetry !== null && record.controller.kind === 'agent'
      ? { ...record, fleet: telemetry }
      : record);
  return createReplayBundle({
    fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE,
    revisions,
    transcripts,
    build: {
      buildId: `vtt-soak-table-${String(tableIndex).padStart(4, '0')}${aborted ? '-aborted' : ''}`,
      commit: 'supervisor-owned',
    },
    protocolVersions: source.protocolVersions,
    licensingVersions: source.licensingVersions,
    gapReports: gaps,
  });
}

function requireLoadedPack(result: PartyPackLoadResult): Extract<PartyPackLoadResult, { status: 'loaded' }> {
  if (result.status === 'refused') {
    throw new Error(`External party pack refused: ${result.refusal.reason}.`);
  }
  return result;
}

function validateEffort(value: string): DmBridgeModelConfig['reasoningEffort'] {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh') return value;
  throw new TypeError('--dm-effort must be low, medium, high, or xhigh.');
}

interface RunningBridge {
  readonly pid: number;
  readonly ready: Promise<string>;
  stop(): Promise<void>;
}

function launchBridge(
  config: VttSoakConfig,
  runtime: VttSoakRuntime,
  tableIndex: number,
): RunningBridge {
  const bridgeScript = runtime.bridgeScript ?? fileURLToPath(
    new URL('./discord-launcher/codex-dm-bridge.mjs', import.meta.url),
  );
  const child = spawn(process.execPath, [bridgeScript], {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...runtime.bridgeEnvironment,
      DM_BRIDGE_PORT: '0',
      DM_BRIDGE_DATA_DIR: `${config.outDirectory}/bridge-table-${String(tableIndex).padStart(4, '0')}`,
      DM_BRIDGE_REQUEST_TIMEOUT_MS: String(config.requestTimeoutMs),
      DM_BRIDGE_BUILD_ID: `vtt-soak-table-${String(tableIndex).padStart(4, '0')}`,
      DM_BRIDGE_COMMIT: 'supervisor-owned',
      DM_BRIDGE_LOAD_LEVEL: 'ai-only-playtest',
      ...(runtime.codexBinary === undefined ? {} : { DM_BRIDGE_CODEX_BIN: runtime.codexBinary }),
    },
  });
  const pid = child.pid;
  if (pid === undefined) throw new Error('DM bridge child did not receive a process id.');
  runtime.onBridgeLifecycle?.({ kind: 'spawned', tableIndex, pid });
  let stderr = '';
  let stdout = '';
  let readySettled = false;
  let resolveReady: (endpoint: string) => void = () => undefined;
  let rejectReady: (error: Error) => void = () => undefined;
  const ready = new Promise<string>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString('utf8')).slice(-16_384);
  });
  child.stdout.on('data', (chunk: Buffer) => {
    stdout = (stdout + chunk.toString('utf8')).slice(-16_384);
    const match = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(stdout);
    if (match?.[1] !== undefined && !readySettled) {
      readySettled = true;
      resolveReady(match[1]);
    }
  });
  let resolveExit: () => void = () => undefined;
  const exited = new Promise<void>((resolve) => { resolveExit = resolve; });
  child.once('error', (error) => {
    if (!readySettled) {
      readySettled = true;
      rejectReady(error);
    }
  });
  child.once('exit', (code, signal) => {
    if (!readySettled) {
      readySettled = true;
      rejectReady(new Error(
        `DM bridge exited before readiness (code ${code ?? 'null'}, signal ${signal ?? 'none'}): ${stderr}`,
      ));
    }
    resolveExit();
  });
  let stopping = false;
  return {
    pid,
    ready,
    async stop(): Promise<void> {
      if (stopping) return exited;
      stopping = true;
      const signalGroup = (signal: NodeJS.Signals): void => {
        try {
          if (process.platform === 'win32') child.kill(signal);
          else process.kill(-pid, signal);
        } catch (error: unknown) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
        }
      };
      if (child.exitCode === null && child.signalCode === null) signalGroup('SIGTERM');
      let timer: ReturnType<typeof setTimeout> | undefined;
      const graceful = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), 2_000);
      });
      const result = await Promise.race([exited.then(() => 'exited' as const), graceful]);
      if (timer !== undefined) clearTimeout(timer);
      if (result === 'timeout') {
        signalGroup('SIGKILL');
        await exited;
      }
      runtime.onBridgeLifecycle?.({ kind: 'terminated', tableIndex, pid });
    },
  };
}

function timeoutFetch(timeoutMs: number): BridgeFetch {
  return async (url, init) => {
    const controller = new AbortController();
    const abortFromCaller = (): void => controller.abort(init.signal?.reason);
    if (init.signal?.aborted === true) abortFromCaller();
    else init.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const timer = setTimeout(
      () => controller.abort(new Error(`DM bridge request exceeded ${String(timeoutMs)}ms.`)),
      timeoutMs,
    );
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', abortFromCaller);
    }
  };
}

async function runCoordinatorToRoundBound(coordinator: TurnCoordinator, rounds: number): Promise<void> {
  const maximumSteps = (coordinator.state().combatants.length + 1) * rounds + 2;
  for (let stepIndex = 0; stepIndex < maximumSteps; stepIndex += 1) {
    if (coordinator.state().round > rounds) return;
    const result = await coordinator.step();
    if (result.kind === 'refused') throw new Error(`Soak coordinator refused: ${result.reason}`);
  }
  if (coordinator.state().round <= rounds) {
    throw new Error('Soak coordinator exceeded its deterministic step bound.');
  }
}

async function runRealTable(
  config: VttSoakConfig,
  runtime: VttSoakRuntime,
  tableIndex: number,
  partySource: SoakPartySource,
  party: LoadedExternalPartyPack,
  seed: number,
): Promise<{ readonly coordinator: TurnCoordinator; readonly telemetry: readonly FleetTelemetry[] }> {
  const bridge = launchBridge(config, runtime, tableIndex);
  const abort = new AbortController();
  let coordinator: TurnCoordinator | null = null;
  const operation = (async () => {
    const endpoint = await bridge.ready;
    const telemetry: FleetTelemetry[] = [];
    const failures: unknown[] = [];
    const client = new LocalhostDmBridgeClient(
      endpoint,
      timeoutFetch(config.requestTimeoutMs),
      (error) => failures.push(error),
      (entry) => telemetry.push(entry),
    );
    const encounterId = encounterSessionId(`encounter:vtt-soak:${String(tableIndex)}:${String(seed)}`);
    const model: DmBridgeModelConfig = {
      model: config.dmModel,
      reasoningEffort: config.dmEffort,
    };
    const sessionId = await client.createSession(encounterId, abort.signal, model);
    coordinator = tableCoordinator(partySource, party, seed, config.initiativeMode, {
      exchange: client,
      encounterId,
      codexSessionId: sessionId,
      model,
    });
    await runCoordinatorToRoundBound(coordinator, config.rounds);
    if (failures.length > 0) throw failures[0];
    return { coordinator, telemetry };
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timed = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      abort.abort(new Error(`Soak table exceeded ${String(config.tableTimeoutMs)}ms.`));
      coordinator?.interrupt();
      reject(new Error(`Soak table exceeded ${String(config.tableTimeoutMs)}ms.`));
    }, config.tableTimeoutMs);
  });
  try {
    return await Promise.race([operation, timed]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    await bridge.stop();
  }
}

export async function runVttSoak(
  config: VttSoakConfig,
  runtime: VttSoakRuntime = {},
): Promise<VttSoakSummary> {
  positiveInteger(config.tables, 'tables', 1_000);
  positiveInteger(config.rounds, 'rounds', 100);
  unsignedSeed(config.seed);
  if (config.outDirectory.trim().length === 0) throw new TypeError('outDirectory is required.');
  if (config.packFile.trim().length === 0) throw new TypeError('packFile is required.');
  if (config.dmModel.trim().length === 0) throw new TypeError('dmModel is required.');
  validateEffort(config.dmEffort);
  if (!isInitiativeMode(config.initiativeMode)) {
    throw new TypeError('initiativeMode must be per_combatant, shared_enemy, or side_alternating.');
  }
  positiveInteger(config.requestTimeoutMs, 'requestTimeoutMs', 3_600_000);
  positiveInteger(config.tableTimeoutMs, 'tableTimeoutMs', 86_400_000);

  const externalSource = await loadPartySource(
    { packFile: config.packFile },
    (packFile) => readFile(packFile, 'utf8'),
  );
  if (externalSource.kind !== 'external-pack') throw new Error('External soak source was not loaded.');
  const loadedPack = requireLoadedPack(externalSource.result);
  await mkdir(config.outDirectory, { recursive: true });

  const tables: VttSoakTableSummary[] = [];
  const runGaps: GapReport[] = [];
  for (let tableIndex = 0; tableIndex < config.tables; tableIndex += 1) {
    const partySource = partySourceForTable(tableIndex, config.packFile);
    const tableSeed = seedForTable(config.seed, tableIndex);
    const gaps = partySource === 'reference' ? [] : loadedPack.gaps;
    let coordinator = tableCoordinator(
      partySource,
      loadedPack.party,
      tableSeed,
      config.initiativeMode,
    );
    let telemetry: readonly FleetTelemetry[] = [];
    let abortReason: string | null = null;
    if (config.bridge.mode === 'real') {
      try {
        const result = await runRealTable(
          config,
          runtime,
          tableIndex,
          partySource,
          loadedPack.party,
          tableSeed,
        );
        coordinator = result.coordinator;
        telemetry = result.telemetry;
      } catch (error: unknown) {
        abortReason = error instanceof Error ? error.message : String(error);
      }
    } else {
      await runCoordinatorToRoundBound(coordinator, config.rounds);
    }
    const source = recordScriptedReferenceSkirmish(
      tableSeed,
      'engine:hit-points',
      config.initiativeMode,
    ).bundle;
    const bundle = boundedBundle(
      source,
      config.rounds,
      gaps,
      tableIndex,
      telemetry.at(-1) ?? null,
      abortReason !== null,
    );
    const proof = replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const replayFile = `table-${String(tableIndex).padStart(4, '0')}.replay.json`;
    await writeFile(
      `${config.outDirectory}/${replayFile}`,
      exportReplayBundle(bundle),
      { encoding: 'utf8', flag: 'wx' },
    );
    runGaps.push(...gaps);
    tables.push({
      tableIndex,
      seed: tableSeed,
      partySource: partySource === 'reference' ? 'reference' : 'external-pack',
      replayFile,
      gapCount: gaps.length,
      coordinatorPartySize: coordinator.state().combatants.filter(
        (combatant) => combatant.profile.kind === 'player_character',
      ).length,
      status: abortReason === null ? 'completed' : 'aborted',
      exitCode: abortReason === null ? 0 : 1,
      abortReason,
      bridgeTelemetry: telemetry,
      proof,
    });
  }

  const summary: VttSoakSummary = {
    schemaVersion: 2,
    seed: config.seed,
    configuredRounds: config.rounds,
    bridge: config.bridge,
    dmModel: config.dmModel,
    dmEffort: config.dmEffort,
    requestTimeoutMs: config.requestTimeoutMs,
    tableTimeoutMs: config.tableTimeoutMs,
    initiativeMode: config.initiativeMode,
    tables,
    gapReports: runGaps,
  };
  await writeFile(
    `${config.outDirectory}/gap-report-summary.json`,
    canonicalJson(summary),
    { encoding: 'utf8', flag: 'wx' },
  );
  return summary;
}

function optionValues(argv: readonly string[]): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith('--')) throw new TypeError(`Unexpected positional argument ${token}.`);
    const equals = token.indexOf('=');
    if (equals !== -1) {
      values.set(token.slice(2, equals), token.slice(equals + 1));
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${token} needs a value.`);
    values.set(token.slice(2), value);
    index += 1;
  }
  return values;
}

function required(options: ReadonlyMap<string, string>, name: string): string {
  const value = options.get(name);
  if (value === undefined || value.length === 0) throw new TypeError(`--${name} is required.`);
  return value;
}

export function decodeVttSoakArguments(argv: readonly string[]): VttSoakConfig {
  const options = optionValues(argv);
  const allowed = new Set([
    'tables',
    'seed',
    'rounds',
    'out',
    'pack',
    'bridge',
    'dm-model',
    'dm-effort',
    'request-timeout-ms',
    'table-timeout-ms',
    'initiative',
  ]);
  for (const name of options.keys()) {
    if (!allowed.has(name)) throw new TypeError(`Unknown option --${name}.`);
  }
  const bridgeMode = options.get('bridge') ?? 'fake';
  const bridge: SoakBridgeConfig = bridgeMode === 'fake'
    ? { mode: 'fake' }
    : bridgeMode === 'real'
      ? { mode: 'real' }
      : (() => { throw new TypeError('--bridge must be fake or real.'); })();
  const dmEffort = validateEffort(options.get('dm-effort') ?? DEFAULT_DM_REASONING_EFFORT);
  const initiativeMode = options.get('initiative') ?? 'shared_enemy';
  if (!isInitiativeMode(initiativeMode)) {
    throw new TypeError('--initiative must be per_combatant, shared_enemy, or side_alternating.');
  }
  const config: VttSoakConfig = {
    tables: Number(required(options, 'tables')),
    seed: Number(required(options, 'seed')),
    rounds: Number(required(options, 'rounds')),
    outDirectory: required(options, 'out'),
    packFile: required(options, 'pack'),
    bridge,
    dmModel: options.get('dm-model') ?? DEFAULT_DM_MODEL,
    dmEffort,
    requestTimeoutMs: Number(
      options.get('request-timeout-ms') ?? String(DEFAULT_SOAK_REQUEST_TIMEOUT_MS),
    ),
    tableTimeoutMs: Number(
      options.get('table-timeout-ms') ?? String(DEFAULT_SOAK_TABLE_TIMEOUT_MS),
    ),
    initiativeMode,
  };
  positiveInteger(config.tables, 'tables', 1_000);
  positiveInteger(config.rounds, 'rounds', 100);
  unsignedSeed(config.seed);
  positiveInteger(config.requestTimeoutMs, 'requestTimeoutMs', 3_600_000);
  positiveInteger(config.tableTimeoutMs, 'tableTimeoutMs', 86_400_000);
  return config;
}

const invokedPath = process.argv[1];
if (
  process.env.npm_lifecycle_event === 'vtt:soak' ||
  (
    invokedPath !== undefined &&
    (invokedPath.endsWith('/vtt-soak.ts') || invokedPath.endsWith('\\vtt-soak.ts'))
  )
) {
  try {
    const summary = await runVttSoak(decodeVttSoakArguments(process.argv.slice(2)));
    process.stdout.write(`${canonicalJson(summary)}\n`);
    if (summary.tables.some((table) => table.exitCode !== 0)) process.exitCode = 1;
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
