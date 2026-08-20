import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { canonicalJson } from '../src/commands/canonical-json';
import { combatToken } from '../src/combat/combatant';
import { AlgorithmController, ControllerRegistry } from '../src/combat/controllers';
import { TurnCoordinator } from '../src/combat/coordinator';
import { createEncounter } from '../src/combat/encounter';
import { mulberry32 } from '../src/combat/random';
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
  | { readonly mode: 'real'; readonly endpoint: string };

export interface VttSoakConfig {
  readonly tables: number;
  readonly seed: number;
  readonly rounds: number;
  readonly outDirectory: string;
  readonly packFile: string;
  readonly bridge: SoakBridgeConfig;
}

export interface VttSoakTableSummary {
  readonly tableIndex: number;
  readonly seed: number;
  readonly partySource: 'reference' | 'external-pack';
  readonly replayFile: string;
  readonly gapCount: number;
  readonly coordinatorPartySize: number;
  readonly proof: ReplayProof;
}

export interface VttSoakSummary {
  readonly schemaVersion: 1;
  readonly seed: number;
  readonly configuredRounds: number;
  readonly bridge: SoakBridgeConfig;
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

function tableCoordinator(
  source: SoakPartySource,
  externalParty: LoadedExternalPartyPack,
  seed: number,
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
    bounds: reference.bounds,
    blockedCells: reference.blockedCells,
    foggedCells: reference.foggedCells,
    dmNotes: [],
    combatants,
    tokens: combatants.map((profile, index) => combatToken(profile, positions[index]!)),
  });
  const registry = new ControllerRegistry(combatants.map((profile) => ({
    combatantId: profile.id,
    controller: new AlgorithmController(),
    controllerId: `${profile.id}:soak-algorithm`,
  })));
  return new TurnCoordinator(state, registry, mulberry32(seed), {
    turnLegalActions: (_state, actor) => ({ actions: [{ type: 'end_turn', actor }] }),
  });
}

function boundedBundle(
  source: ReplayBundle,
  maximumRounds: number,
  gaps: readonly GapReport[],
  tableIndex: number,
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
  const transcripts = source.transcripts.filter(
    (record) => record.encounterRevision <= lastEncounterRevision,
  );
  return createReplayBundle({
    fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE,
    revisions,
    transcripts,
    build: {
      buildId: `vtt-soak-table-${String(tableIndex).padStart(4, '0')}`,
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

function validateBridge(config: SoakBridgeConfig): void {
  if (config.mode === 'fake') return;
  const endpoint = new URL(config.endpoint);
  if (
    endpoint.protocol !== 'http:' &&
    endpoint.protocol !== 'https:' &&
    endpoint.protocol !== 'ws:' &&
    endpoint.protocol !== 'wss:'
  ) {
    throw new TypeError('Real bridge endpoint must use HTTP or WebSocket transport.');
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)) {
    throw new TypeError('Real bridge endpoint must be local.');
  }
}

export async function runVttSoak(config: VttSoakConfig): Promise<VttSoakSummary> {
  positiveInteger(config.tables, 'tables', 1_000);
  positiveInteger(config.rounds, 'rounds', 100);
  unsignedSeed(config.seed);
  if (config.outDirectory.trim().length === 0) throw new TypeError('outDirectory is required.');
  if (config.packFile.trim().length === 0) throw new TypeError('packFile is required.');
  validateBridge(config.bridge);
  if (config.bridge.mode === 'real') {
    throw new Error('Real bridge mode is configuration-only; headless execution requires fake mode.');
  }

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
    const coordinator = tableCoordinator(partySource, loadedPack.party, tableSeed);
    await coordinator.step();
    const source = recordScriptedReferenceSkirmish(tableSeed).bundle;
    const bundle = boundedBundle(source, config.rounds, gaps, tableIndex);
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
      proof,
    });
  }

  const summary: VttSoakSummary = {
    schemaVersion: 1,
    seed: config.seed,
    configuredRounds: config.rounds,
    bridge: config.bridge,
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
  const allowed = new Set(['tables', 'seed', 'rounds', 'out', 'pack', 'bridge', 'bridge-endpoint']);
  for (const name of options.keys()) {
    if (!allowed.has(name)) throw new TypeError(`Unknown option --${name}.`);
  }
  const bridgeMode = options.get('bridge') ?? 'fake';
  const bridge: SoakBridgeConfig = bridgeMode === 'fake'
    ? { mode: 'fake' }
    : bridgeMode === 'real'
      ? { mode: 'real', endpoint: required(options, 'bridge-endpoint') }
      : (() => { throw new TypeError('--bridge must be fake or real.'); })();
  const config: VttSoakConfig = {
    tables: Number(required(options, 'tables')),
    seed: Number(required(options, 'seed')),
    rounds: Number(required(options, 'rounds')),
    outDirectory: required(options, 'out'),
    packFile: required(options, 'pack'),
    bridge,
  };
  positiveInteger(config.tables, 'tables', 1_000);
  positiveInteger(config.rounds, 'rounds', 100);
  unsignedSeed(config.seed);
  validateBridge(config.bridge);
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
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
