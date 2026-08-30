import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { canonicalJson } from '../../src/commands/canonical-json';
import {
  parseArenaArgs,
  runArena,
  type ArenaConfig,
  type ArenaRow,
} from '../ai-dm-arena';
import { COMBAT_MODELS, type CombatModel } from '../ai-dm-conversation';
import {
  ROOM_INITIATIVE_PROFILES,
  type RoomInitiativeProfile,
} from '../../src/vtt/room-generator';
import { readRepoCommit } from './repo-commit';

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
  readonly timeoutMs: number;
  readonly basis: 'standard' | 'hard';
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

export interface GenerateDataManifest {
  readonly format: 'arena-rl-batch-v1';
  readonly range: SeedRange;
  readonly reps: number;
  readonly model: 'gpt-5.6-luna';
  readonly effort: 'low';
  readonly adapterCliName: 'codex';
  readonly adapterCliVersion: string | null;
  readonly kbId: 'K6';
  readonly kbHash: string;
  readonly repoCommit: string;
  readonly toolArgv: readonly string[];
  readonly flapPolicy: 'arena-retry-then-resume-seed';
  readonly basis: 'standard' | 'hard';
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
  let timeoutMs = 120_000;
  let resume = false;
  let basis: GenerateDataConfig['basis'] = 'standard';
  let combatModel: CombatModel = 'monster_block_v1';
  let initiativeProfile: RoomInitiativeProfile = 'legacy';
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--resume') { resume = true; continue; }
    if (![
      '--seed-range', '--reps', '--target-dir', '--timeout-ms', '--basis', '--combat-model',
      '--initiative-profile',
    ].includes(option ?? '')) {
      throw new TypeError(`Unknown generate-data option ${option ?? '<missing>'}.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
    if (option === '--seed-range') ranges.push(seedRange(value));
    else if (option === '--reps') reps = positiveInteger(value, '--reps');
    else if (option === '--target-dir') targetDirectory = resolve(value);
    else if (option === '--timeout-ms') timeoutMs = positiveInteger(value, '--timeout-ms');
    else if (option === '--basis') {
      if (value !== 'standard' && value !== 'hard') throw new TypeError('--basis must be standard or hard.');
      basis = value;
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
    timeoutMs,
    basis,
    toolArgv: [...args],
  };
}

function manifestName(range: SeedRange): string {
  return `batch-${String(range.start)}-${String(range.end)}.manifest.json`;
}

async function existingManifest(
  path: string,
  config: GenerateDataConfig,
  range: SeedRange,
  provenance: ManifestProvenance,
): Promise<GenerateDataManifest | null> {
  if (!config.resume) return null;
  let source: string;
  try { source = await readFile(path, 'utf8'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
  const decoded = JSON.parse(source) as GenerateDataManifest;
  if (decoded.format !== 'arena-rl-batch-v1' || decoded.range.start !== range.start ||
    decoded.range.end !== range.end || decoded.reps !== config.reps || decoded.basis !== config.basis ||
    decoded.combatModel !== config.combatModel ||
    decoded.initiativeProfile !== config.initiativeProfile ||
    decoded.model !== 'gpt-5.6-luna' || decoded.effort !== 'low' || decoded.kbId !== 'K6' ||
    decoded.kbHash !== provenance.kbHash || decoded.repoCommit !== provenance.repoCommit ||
    decoded.adapterCliName !== provenance.adapterCliName ||
    decoded.adapterCliVersion !== provenance.adapterCliVersion) {
    throw new Error(`Resume manifest ${path} does not match this batch configuration.`);
  }
  return { ...decoded, toolArgv: [...config.toolArgv] };
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
    format: 'arena-rl-batch-v1',
    range,
    reps: config.reps,
    model: 'gpt-5.6-luna',
    effort: 'low',
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
    '--model', 'gpt-5.6-luna',
    '--effort', 'low',
    '--out', outPath,
    '--timeout-ms', String(config.timeoutMs),
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
      heartbeat(`seed=${String(seed)} status=start`);
      try {
        const rows = await arenaRunner(arenaConfig(config, seed, outputPath));
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
  'Usage: rl:generate-data --seed-range START-END [--seed-range START-END ...] --reps N --target-dir PATH [--basis standard|hard] [--combat-model monster_block_v1|initiative_segments_v1] [--initiative-profile legacy|derived_v1] [--timeout-ms N] [--resume]';

async function runCli(): Promise<void> {
  try { await main(); }
  catch (error) {
    process.stderr.write(`${GENERATE_DATA_USAGE}\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.env['VITEST'] !== 'true') await runCli();
