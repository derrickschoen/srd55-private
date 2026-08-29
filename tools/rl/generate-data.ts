import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { canonicalJson } from '../../src/commands/canonical-json';
import {
  parseArenaArgs,
  runArena,
  type ArenaConfig,
  type ArenaRow,
} from '../ai-dm-arena';

export interface SeedRange {
  readonly start: number;
  readonly end: number;
}

export interface GenerateDataConfig {
  readonly seedRanges: readonly SeedRange[];
  readonly reps: number;
  readonly targetDirectory: string;
  readonly resume: boolean;
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly basis: 'standard' | 'hard';
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
  readonly kb: 'K6';
  readonly flapPolicy: 'arena-retry-then-resume-seed';
  readonly basis: 'standard' | 'hard';
  readonly seeds: readonly SeedManifestEntry[];
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
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--resume') { resume = true; continue; }
    if (!['--seed-range', '--reps', '--target-dir', '--timeout-ms', '--basis'].includes(option ?? '')) {
      throw new TypeError(`Unknown generate-data option ${option ?? '<missing>'}.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
    if (option === '--seed-range') ranges.push(seedRange(value));
    else if (option === '--reps') reps = positiveInteger(value, '--reps');
    else if (option === '--target-dir') targetDirectory = resolve(value);
    else if (option === '--timeout-ms') timeoutMs = positiveInteger(value, '--timeout-ms');
    else if (value === 'standard' || value === 'hard') basis = value;
    else throw new TypeError('--basis must be standard or hard.');
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
    seedRanges: ranges,
    reps,
    targetDirectory,
    resume,
    cwd: resolve(cwd),
    timeoutMs,
    basis,
  };
}

function manifestName(range: SeedRange): string {
  return `batch-${String(range.start)}-${String(range.end)}.manifest.json`;
}

async function existingManifest(
  path: string,
  config: GenerateDataConfig,
  range: SeedRange,
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
    decoded.model !== 'gpt-5.6-luna' || decoded.effort !== 'low' || decoded.kb !== 'K6') {
    throw new Error(`Resume manifest ${path} does not match this batch configuration.`);
  }
  return decoded;
}

function emptyManifest(config: GenerateDataConfig, range: SeedRange): GenerateDataManifest {
  return {
    format: 'arena-rl-batch-v1',
    range,
    reps: config.reps,
    model: 'gpt-5.6-luna',
    effort: 'low',
    kb: 'K6',
    flapPolicy: 'arena-retry-then-resume-seed',
    basis: config.basis,
    seeds: [],
  };
}

function replaceSeed(
  manifest: GenerateDataManifest,
  entry: SeedManifestEntry,
): GenerateDataManifest {
  return {
    ...manifest,
    seeds: [...manifest.seeds.filter((candidate) => candidate.seed !== entry.seed), entry]
      .sort((left, right) => left.seed - right.seed),
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
  const completed: GenerateDataManifest[] = [];
  for (const range of config.seedRanges) {
    heartbeat(`batch start=${String(range.start)} end=${String(range.end)}`);
    const batchDirectory = join(config.targetDirectory, `batch-${String(range.start)}-${String(range.end)}`);
    await mkdir(batchDirectory, { recursive: true });
    const manifestPath = join(config.targetDirectory, manifestName(range));
    let manifest = await existingManifest(manifestPath, config, range) ?? emptyManifest(config, range);
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
        manifest = replaceSeed(manifest, {
          seed,
          outputPath,
          status: 'failed',
          rows: 0,
          flapRetries: 0,
          serviceNullRows: 0,
          error: error instanceof Error ? error.message : String(error),
        });
        heartbeat(`seed=${String(seed)} status=failed`);
        await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, 'utf8');
        throw error;
      }
      await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, 'utf8');
    }
    heartbeat(
      `batch start=${String(range.start)} end=${String(range.end)} status=complete ` +
      `seeds=${String(manifest.seeds.length)}`,
    );
    completed.push(manifest);
  }
  return completed;
}

async function main(): Promise<void> {
  const scriptIndex = process.argv.findIndex((argument) =>
    argument.endsWith('/generate-data.ts') || argument.endsWith('\\generate-data.ts'));
  const args = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
  const manifests = await generateData(parseGenerateDataArgs(args));
  const completed = manifests.flatMap((manifest) => manifest.seeds)
    .filter((entry) => entry.status === 'complete').length;
  const flapped = manifests.flatMap((manifest) => manifest.seeds)
    .filter((entry) => entry.status === 'flapped').length;
  process.stdout.write(`batches=${String(manifests.length)} completed_seeds=${String(completed)} flapped_seeds=${String(flapped)}\n`);
}

const GENERATE_DATA_USAGE =
  'Usage: rl:generate-data --seed-range START-END [--seed-range START-END ...] --reps N --target-dir PATH [--basis standard|hard] [--timeout-ms N] [--resume]';

async function runCli(): Promise<void> {
  try { await main(); }
  catch (error) {
    process.stderr.write(`${GENERATE_DATA_USAGE}\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.env['VITEST'] !== 'true') await runCli();
