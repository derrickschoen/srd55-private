import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { canonicalJson } from '../../src/commands/canonical-json';
import {
  ARENA_BASES,
  parseArenaArgs,
  runArena,
  type ArenaBasis,
  type ArenaConfig,
  type ArenaRow,
} from '../ai-dm-arena';
import { COMBAT_MODELS, type CombatModel } from '../ai-dm-conversation';
import {
  ROOM_INITIATIVE_PROFILES,
  type RoomInitiativeProfile,
} from '../../src/vtt/room-generator';
import { HISTORICAL_LUNA_MODEL, LUNA_MODEL, liftRefusal, type LunaEffort } from '../model-routes';
import { readRepoCommit } from './repo-commit';

/** The batch manifest schema: v2 batches run on gpt-6-luna (LUNA6); v1 batches ran on the historical Luna route. */
const GENERATE_DATA_MANIFEST_FORMAT = 'arena-rl-batch-v2';
const HISTORICAL_MANIFEST_FORMAT = 'arena-rl-batch-v1';
/**
 * D887 (b): the RL corpus is an effort study, so it moves to gpt-6-luna at its stated low effort. D890 (a) and the
 * owner's 2026-09-24 18:58 answer lift its round wall: the arena argv carries no --timeout-ms, and the arena gives
 * every call the 30 min per-call hang guard.
 */
const GENERATE_DATA_EFFORT = 'low' satisfies LunaEffort;

export interface SeedRange {
  readonly start: number;
  readonly end: number;
}

export interface GenerateDataConfig {
  readonly combatModel: CombatModel;
  readonly initiativeProfile: RoomInitiativeProfile;
  readonly seedRanges: readonly SeedRange[];
  readonly reps: number;
  readonly targetDirectory: string;
  readonly resume: boolean;
  readonly cwd: string;
  readonly basis: ArenaBasis;
  readonly toolArgv: readonly string[];
}

interface SeedManifestEntry {
  readonly seed: number;
  readonly outputPath: string;
  readonly status: 'complete' | 'flapped' | 'failed';
  readonly rows: number;
  readonly flapRetries: number;
  readonly serviceNullRows: number;
  readonly error: string | null;
}

interface GenerateDataManifestBody {
  readonly range: SeedRange;
  readonly reps: number;
  readonly adapterCliName: 'codex';
  readonly adapterCliVersion: string | null;
  readonly kbId: 'K6';
  readonly kbHash: string;
  readonly repoCommit: string;
  readonly toolArgv: readonly string[];
  readonly flapPolicy: 'arena-retry-then-resume-seed';
  readonly basis: ArenaBasis;
  readonly combatModel: CombatModel;
  readonly initiativeProfile: RoomInitiativeProfile;
  readonly seeds: readonly SeedManifestEntry[];
  readonly totals: {
    readonly seeds: number;
    readonly completeSeeds: number;
    readonly flappedSeeds: number;
    readonly failedSeeds: number;
    readonly rows: number;
    readonly flapRetries: number;
    readonly serviceNullRows: number;
  };
}

export interface GenerateDataManifest extends GenerateDataManifestBody {
  readonly format: typeof GENERATE_DATA_MANIFEST_FORMAT;
  readonly model: typeof LUNA_MODEL;
  readonly effort: typeof GENERATE_DATA_EFFORT;
}

/** A batch written before LUNA6, on the historical Luna route. Resume refuses it and never rewrites its file. */
export interface HistoricalGenerateDataManifest extends GenerateDataManifestBody {
  readonly format: typeof HISTORICAL_MANIFEST_FORMAT;
  readonly model: typeof HISTORICAL_LUNA_MODEL;
  readonly effort: 'low';
}

/** LUNA6 (plan r5 §1.2): a v1 batch is never resumed into a v2 batch, which would mix two routes in one batch. */
export class HistoricalLunaBatchResumeError extends Error {
  override readonly name = 'HistoricalLunaBatchResumeError' as const;

  constructor(readonly manifestPath: string, stored: HistoricalGenerateDataManifest) {
    super(
      `LUNA6: ${manifestPath} is an ${stored.format} ${stored.model} ${stored.effort} batch; this generator ` +
      `writes ${GENERATE_DATA_MANIFEST_FORMAT} ${LUNA_MODEL} ${GENERATE_DATA_EFFORT} batches (D887 b) and never ` +
      'resumes a v1 batch into v2, which would mix the two routes in one batch. Start a new --target-dir.',
    );
  }
}

/** LUNA6: a fresh v2 run never replaces a v1 batch's manifest, which is that batch's only provenance record. */
export class HistoricalLunaBatchOverwriteError extends Error {
  override readonly name = 'HistoricalLunaBatchOverwriteError' as const;

  constructor(readonly manifestPath: string, stored: HistoricalGenerateDataManifest) {
    super(
      `LUNA6: ${manifestPath} is an ${stored.format} ${stored.model} ${stored.effort} batch; a fresh ` +
      `${GENERATE_DATA_MANIFEST_FORMAT} ${LUNA_MODEL} ${GENERATE_DATA_EFFORT} run never overwrites it, which would ` +
      'lose its provenance. Start a new --target-dir.',
    );
  }
}

export type ArenaBatchRunner = (config: ArenaConfig) => Promise<readonly Pick<
  ArenaRow,
  'serviceNull' | 'outcome' | 'flapRetries'
>[]>;

export interface GenerateDataDependencies {
  readonly arenaRunner?: ArenaBatchRunner;
  readonly heartbeat?: (line: string) => void;
}

function stdoutHeartbeat(line: string): void {
  process.stdout.write(`[rl-generate] ${line}\n`);
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${option} must be a positive integer.`);
  return parsed;
}

function seedRange(value: string): SeedRange {
  const match = /^(\d+)-(\d+)$/u.exec(value);
  if (match === null) throw new TypeError('--seed-range must use START-END syntax.');
  const start = positiveInteger(match[1]!, '--seed-range start');
  const end = positiveInteger(match[2]!, '--seed-range end');
  if (end < start) throw new TypeError('--seed-range end must be greater than or equal to start.');
  return { start, end };
}

export function parseGenerateDataArgs(
  argv: readonly string[],
  cwd = process.cwd(),
): GenerateDataConfig {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const ranges: SeedRange[] = [];
  let reps: number | null = null;
  let targetDirectory: string | null = null;
  let resume = false;
  let basis: GenerateDataConfig['basis'] = 'standard';
  let combatModel: CombatModel = 'initiative_segments_v1';
  let initiativeProfile: RoomInitiativeProfile = 'derived_v1';
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--resume') { resume = true; continue; }
    if (option === '--timeout-ms') {
      // LUNA6 (plan r5 §1.2): removed. A gpt-6-luna low batch keeps only the arena's 30 min per-call hang guard.
      throw liftRefusal([GENERATE_DATA_EFFORT], `--timeout-ms ${args[index + 1] ?? '<missing>'}`);
    }
    if (![
      '--seed-range', '--reps', '--target-dir', '--basis', '--combat-model',
      '--initiative-profile',
    ].includes(option ?? '')) {
      throw new TypeError(`Unknown generate-data option ${option ?? '<missing>'}.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
    if (option === '--seed-range') ranges.push(seedRange(value));
    else if (option === '--reps') reps = positiveInteger(value, '--reps');
    else if (option === '--target-dir') targetDirectory = resolve(value);
    else if (option === '--basis') {
      if (!ARENA_BASES.includes(value as ArenaBasis)) {
        throw new TypeError('--basis must be standard, hard, or brutal.');
      }
      basis = value as ArenaBasis;
    } else if (option === '--combat-model') {
      if (!COMBAT_MODELS.includes(value as CombatModel)) {
        throw new TypeError('--combat-model must be monster_block_v1 or initiative_segments_v1.');
      }
      combatModel = value as CombatModel;
    } else {
      if (!ROOM_INITIATIVE_PROFILES.includes(value as RoomInitiativeProfile)) {
        throw new TypeError('--initiative-profile must be legacy or derived_v1.');
      }
      initiativeProfile = value as RoomInitiativeProfile;
    }
    index += 1;
  }
  if (ranges.length === 0) throw new TypeError('At least one --seed-range is required.');
  if (reps === null) throw new TypeError('--reps is required.');
  if (targetDirectory === null) throw new TypeError('--target-dir is required.');
  const seen = new Set<number>();
  for (const range of ranges) {
    for (let seed = range.start; seed <= range.end; seed += 1) {
      if (seen.has(seed)) throw new TypeError(`Seed ranges overlap at ${String(seed)}.`);
      seen.add(seed);
    }
  }
  return {
    combatModel,
    initiativeProfile,
    seedRanges: ranges,
    reps,
    targetDirectory,
    resume,
    cwd: resolve(cwd),
    basis,
    toolArgv: [...args],
  };
}

function manifestName(range: SeedRange): string {
  return `batch-${String(range.start)}-${String(range.end)}.manifest.json`;
}

/**
 * The manifest a run continues from: with --resume, the stored v2 manifest of this exact batch configuration; without
 * it, none. Either way a stored manifest is read first, and a v1 manifest, or one that does not parse, stops the run
 * before anything is written over it (LUNA6: a v1 batch is never resumed into v2 and never overwritten by v2).
 */
async function existingManifest(
  path: string,
  config: GenerateDataConfig,
  range: SeedRange,
  provenance: ManifestProvenance,
): Promise<GenerateDataManifest | null> {
  let source: string;
  try { source = await readFile(path, 'utf8'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
  const stored = JSON.parse(source) as GenerateDataManifest | HistoricalGenerateDataManifest;
  if (!config.resume) {
    if (stored.format === HISTORICAL_MANIFEST_FORMAT) throw new HistoricalLunaBatchOverwriteError(path, stored);
    return null;
  }
  if (stored.format === HISTORICAL_MANIFEST_FORMAT) throw new HistoricalLunaBatchResumeError(path, stored);
  if (stored.format !== GENERATE_DATA_MANIFEST_FORMAT || stored.range.start !== range.start ||
    stored.range.end !== range.end || stored.reps !== config.reps || stored.basis !== config.basis ||
    stored.combatModel !== config.combatModel ||
    stored.initiativeProfile !== config.initiativeProfile ||
    stored.model !== LUNA_MODEL || stored.effort !== GENERATE_DATA_EFFORT || stored.kbId !== 'K6' ||
    stored.kbHash !== provenance.kbHash || stored.repoCommit !== provenance.repoCommit ||
    stored.adapterCliName !== provenance.adapterCliName ||
    stored.adapterCliVersion !== provenance.adapterCliVersion) {
    throw new Error(`Resume manifest ${path} does not match this batch configuration.`);
  }
  return { ...stored, toolArgv: [...config.toolArgv] };
}

interface ManifestProvenance {
  readonly adapterCliName: 'codex';
  readonly adapterCliVersion: string | null;
  readonly kbHash: string;
  readonly repoCommit: string;
}

async function manifestProvenance(config: GenerateDataConfig): Promise<ManifestProvenance> {
  const kbBytes = await readFile(resolve(config.cwd, 'tests/fixtures/ai-dm-kb/k6.txt'));
  return {
    adapterCliName: 'codex',
    adapterCliVersion: null,
    kbHash: createHash('sha256').update(kbBytes).digest('hex'),
    repoCommit: await readRepoCommit(config.cwd),
  };
}

function emptyManifest(
  config: GenerateDataConfig,
  range: SeedRange,
  provenance: ManifestProvenance,
): GenerateDataManifest {
  return {
    format: GENERATE_DATA_MANIFEST_FORMAT,
    range,
    reps: config.reps,
    model: LUNA_MODEL,
    effort: GENERATE_DATA_EFFORT,
    adapterCliName: provenance.adapterCliName,
    adapterCliVersion: provenance.adapterCliVersion,
    kbId: 'K6',
    kbHash: provenance.kbHash,
    repoCommit: provenance.repoCommit,
    toolArgv: [...config.toolArgv],
    flapPolicy: 'arena-retry-then-resume-seed',
    basis: config.basis,
    combatModel: config.combatModel,
    initiativeProfile: config.initiativeProfile,
    seeds: [],
    totals: {
      seeds: 0, completeSeeds: 0, flappedSeeds: 0, failedSeeds: 0,
      rows: 0, flapRetries: 0, serviceNullRows: 0,
    },
  };
}

function manifestTotals(seeds: readonly SeedManifestEntry[]): GenerateDataManifest['totals'] {
  return {
    seeds: seeds.length,
    completeSeeds: seeds.filter((entry) => entry.status === 'complete').length,
    flappedSeeds: seeds.filter((entry) => entry.status === 'flapped').length,
    failedSeeds: seeds.filter((entry) => entry.status === 'failed').length,
    rows: seeds.reduce((total, entry) => total + entry.rows, 0),
    flapRetries: seeds.reduce((total, entry) => total + entry.flapRetries, 0),
    serviceNullRows: seeds.reduce((total, entry) => total + entry.serviceNullRows, 0),
  };
}

function replaceSeed(
  manifest: GenerateDataManifest,
  entry: SeedManifestEntry,
): GenerateDataManifest {
  const seeds = [...manifest.seeds.filter((candidate) => candidate.seed !== entry.seed), entry]
    .sort((left, right) => left.seed - right.seed);
  return {
    ...manifest,
    seeds,
    totals: manifestTotals(seeds),
  };
}

function arenaConfig(config: GenerateDataConfig, seed: number, outPath: string): ArenaConfig {
  return parseArenaArgs([
    '--rooms', '1',
    '--reps', String(config.reps),
    '--seed', String(seed),
    '--cli', 'codex',
    '--model', LUNA_MODEL,
    '--effort', GENERATE_DATA_EFFORT,
    '--out', outPath,
    '--kb', resolve(config.cwd, 'tests/fixtures/ai-dm-kb/k6.txt'),
    '--basis', config.basis,
    '--combat-model', config.combatModel,
    '--initiative-profile', config.initiativeProfile,
    '--capture-rl-data',
    '--generate-missing-rooms',
  ], config.cwd);
}

export async function generateData(
  config: GenerateDataConfig,
  dependencies: GenerateDataDependencies = {},
): Promise<readonly GenerateDataManifest[]> {
  const arenaRunner = dependencies.arenaRunner ?? runArena;
  const heartbeat = dependencies.heartbeat ?? stdoutHeartbeat;
  heartbeat(
    `start batches=${String(config.seedRanges.length)} reps=${String(config.reps)} ` +
    `target=${config.targetDirectory}`,
  );
  await mkdir(config.targetDirectory, { recursive: true });
  const provenance = await manifestProvenance(config);
  const completed: GenerateDataManifest[] = [];
  for (const range of config.seedRanges) {
    heartbeat(`batch start=${String(range.start)} end=${String(range.end)}`);
    const batchDirectory = join(config.targetDirectory, `batch-${String(range.start)}-${String(range.end)}`);
    await mkdir(batchDirectory, { recursive: true });
    const manifestPath = join(config.targetDirectory, manifestName(range));
    let manifest = await existingManifest(manifestPath, config, range, provenance) ??
      emptyManifest(config, range, provenance);
    const alreadyComplete = new Set(manifest.seeds
      .filter((entry) => entry.status === 'complete')
      .map((entry) => entry.seed));
    for (let seed = range.start; seed <= range.end; seed += 1) {
      if (alreadyComplete.has(seed)) {
        heartbeat(`seed=${String(seed)} status=skipped-complete`);
        continue;
      }
      const outputPath = join(batchDirectory, `seed-${String(seed)}.jsonl`);
      // A refused arena argv is a configuration error of the whole batch, not a seed failure: it stops the batch.
      const arena = arenaConfig(config, seed, outputPath);
      heartbeat(`seed=${String(seed)} status=start`);
      try {
        const rows = await arenaRunner(arena);
        const serviceNullRows = rows.filter((row) => row.serviceNull || row.outcome === 'service_null').length;
        manifest = replaceSeed(manifest, {
          seed,
          outputPath,
          status: serviceNullRows === 0 ? 'complete' : 'flapped',
          rows: rows.length,
          flapRetries: rows.reduce((total, row) => total + row.flapRetries, 0),
          serviceNullRows,
          error: null,
        });
        heartbeat(
          `seed=${String(seed)} status=${serviceNullRows === 0 ? 'complete' : 'flapped'} ` +
          `rows=${String(rows.length)}`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        manifest = replaceSeed(manifest, {
          seed,
          outputPath,
          status: 'failed',
          rows: 0,
          flapRetries: 0,
          serviceNullRows: 0,
          error: errorMessage,
        });
        heartbeat(`seed=${String(seed)} status=failed error=${JSON.stringify(errorMessage)}`);
        await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, 'utf8');
        continue;
      }
      await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, 'utf8');
    }
    heartbeat(
      `batch start=${String(range.start)} end=${String(range.end)} status=complete ` +
      `seeds=${String(manifest.seeds.length)}`,
    );
    completed.push(manifest);
  }
  const seeds = completed.flatMap((manifest) => manifest.seeds);
  if (seeds.length > 0 && seeds.every((entry) => entry.status === 'failed')) {
    throw new Error('Every seed in the generation batch failed.');
  }
  return completed;
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/generate-data.ts') || argument.endsWith('\\generate-data.ts'));
  const args = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  const manifests = await generateData(parseGenerateDataArgs(args));
  const seeds = manifests.flatMap((manifest) => manifest.seeds);
  const completed = seeds
    .filter((entry) => entry.status === 'complete').length;
  const flapped = seeds
    .filter((entry) => entry.status === 'flapped').length;
  process.stdout.write(`batches=${String(manifests.length)} completed_seeds=${String(completed)} flapped_seeds=${String(flapped)}\n`);
}

const GENERATE_DATA_USAGE =
  'Usage: rl:generate-data --seed-range START-END [--seed-range START-END ...] --reps N --target-dir PATH [--basis standard|hard|brutal] [--combat-model monster_block_v1|initiative_segments_v1] [--initiative-profile legacy|derived_v1] [--resume]';

async function runCli(): Promise<void> {
  try { await main(); }
  catch (error) {
    process.stderr.write(`${GENERATE_DATA_USAGE}\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.env['VITEST'] !== 'true') await runCli();
