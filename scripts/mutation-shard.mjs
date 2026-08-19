#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STRYKER_CONFIG_PATH = resolve(PROJECT_ROOT, 'stryker.config.json');
const ARTIFACT_ROOT = resolve(PROJECT_ROOT, 'reports/mutation-shards');
const MANIFEST_PATH = resolve(ARTIFACT_ROOT, 'manifest.json');
const AGGREGATE_PATH = resolve(PROJECT_ROOT, 'mutation-report.json');
const BOX_LOCK_WRAPPER = resolve(PROJECT_ROOT, 'scripts/with-box-lock.sh');
const DEFAULT_SHARD_COUNT = 8;
const BASE_CONCURRENCY = 4;
const CONCURRENCY_ENV = 'MUTATION_SHARD_CONCURRENCY';
const REQUIRED_PLUGINS = [
  '@stryker-mutator/typescript-checker',
  '@stryker-mutator/vitest-runner',
];
const PATCH_MARKER = 'Test file(s) failed to load:';
const PATCHED_RUNNER_PATH = resolve(
  PROJECT_ROOT,
  'node_modules/@stryker-mutator/vitest-runner/dist/src/vitest-test-runner.js',
);
const STATUS_NAMES = [
  'Killed',
  'Survived',
  'NoCoverage',
  'CompileError',
  'RuntimeError',
  'Timeout',
  'Ignored',
  'Pending',
];

function usage() {
  console.log(`Usage:
  node scripts/mutation-shard.mjs plan [--shards N]
  node scripts/mutation-shard.mjs run --shard K [--shards N] [--concurrency N] [--chunk-files N] [--rerun]
  node scripts/mutation-shard.mjs run-all [--shards N] [--concurrency N] [--chunk-files N] [--rerun]
  node scripts/mutation-shard.mjs merge [--shards N] [--rerun]

The default shard count is ${DEFAULT_SHARD_COUNT}. Shard numbers are one-based.
Run concurrency defaults to stryker.config.json (${BASE_CONCURRENCY} today) and can
also be set with ${CONCURRENCY_ENV}; --concurrency takes precedence.
--chunk-files limits each Stryker invocation to N mutate files. Chunked runs
acquire the shared box lock as class long once per chunk and release it between
chunks, so invoke them directly rather than wrapping the runner itself. Omit the
flag to retain the unwrapped single-invocation behavior.
--rerun is the D308 iteration mode: enables ignoreStatic on top of the
per-shard incremental cache. Rerun reports live below each shard's rerun/
directory; the incremental cache remains at the shard root. Full audits omit
the flag and stay at the legacy shard-root paths. merge selects exactly the
requested layer and refuses incomplete or mixed layers.
Reports are stored under reports/mutation-shards/ and the merged report is
written to mutation-report.json.`);
}

function fail(message) {
  throw new Error(message);
}

function parsePositiveInteger(raw, flagName) {
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    fail(`${flagName} must be a positive integer; received ${JSON.stringify(raw)}.`);
  }
  return parsed;
}

function parseArguments(argv) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    return { command: 'help', shardCount: DEFAULT_SHARD_COUNT };
  }

  const command = argv[0];
  if (!['plan', 'run', 'run-all', 'merge'].includes(command)) {
    fail(`Unknown command ${JSON.stringify(command)}.`);
  }

  let shardCount = DEFAULT_SHARD_COUNT;
  let shardIndex;
  let concurrency;
  let chunkFiles;
  let rerun = false;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--shards') {
      shardCount = parsePositiveInteger(argv[index + 1], '--shards');
      index += 1;
    } else if (argument === '--shard') {
      shardIndex = parsePositiveInteger(argv[index + 1], '--shard');
      index += 1;
    } else if (argument === '--concurrency') {
      concurrency = parsePositiveInteger(argv[index + 1], '--concurrency');
      index += 1;
    } else if (argument === '--chunk-files') {
      chunkFiles = parsePositiveInteger(argv[index + 1], '--chunk-files');
      index += 1;
    } else if (argument === '--rerun') {
      rerun = true;
    } else {
      fail(`Unknown argument ${JSON.stringify(argument)}.`);
    }
  }

  if (command === 'run' && shardIndex === undefined) {
    fail('The run command requires --shard K.');
  }
  if (command !== 'run' && shardIndex !== undefined) {
    fail('--shard is only valid with the run command.');
  }
  if (shardIndex !== undefined && shardIndex > shardCount) {
    fail(`--shard ${shardIndex} exceeds the configured shard count ${shardCount}.`);
  }
  if (!['run', 'run-all'].includes(command) && concurrency !== undefined) {
    fail('--concurrency is only valid with the run and run-all commands.');
  }
  if (!['run', 'run-all'].includes(command) && chunkFiles !== undefined) {
    fail('--chunk-files is only valid with the run and run-all commands.');
  }
  if (!['run', 'run-all', 'merge'].includes(command) && rerun) {
    fail('--rerun is only valid with the run, run-all, and merge commands.');
  }
  if (['run', 'run-all'].includes(command) && concurrency === undefined) {
    const environmentConcurrency = process.env[CONCURRENCY_ENV];
    if (environmentConcurrency !== undefined) {
      concurrency = parsePositiveInteger(environmentConcurrency, CONCURRENCY_ENV);
    }
  }

  return { command, shardCount, shardIndex, concurrency, chunkFiles, rerun };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function slashPath(value) {
  return value.split(sep).join('/');
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

function globToRegExp(glob) {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === '*') {
      if (glob[index + 1] === '*') {
        index += 1;
        if (glob[index + 1] === '/') {
          index += 1;
          pattern += '(?:.*/)?';
        } else {
          pattern += '.*';
        }
      } else {
        pattern += '[^/]*';
      }
    } else if (character === '?') {
      pattern += '[^/]';
    } else {
      pattern += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }
  }
  return new RegExp(`${pattern}$`);
}

function staticGlobRoot(glob) {
  const normalized = glob.startsWith('!') ? glob.slice(1) : glob;
  const wildcardIndex = normalized.search(/[?*[{]/);
  const prefix = wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
  const root = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix.replace(/\/[^/]*$/, '');
  return root || '.';
}

async function collectFiles(path) {
  const pathStat = await stat(path).catch(() => undefined);
  if (pathStat === undefined) {
    return [];
  }
  if (pathStat.isFile()) {
    return [path];
  }
  if (!pathStat.isDirectory()) {
    return [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const childPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(childPath)));
    } else if (entry.isFile()) {
      files.push(childPath);
    }
  }
  return files;
}

async function resolveMutateFiles(patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some((entry) => typeof entry !== 'string')) {
    fail('stryker.config.json must contain a non-empty string array named mutate.');
  }

  const positivePatterns = patterns.filter((pattern) => !pattern.startsWith('!'));
  const negativePatterns = patterns.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));
  if (positivePatterns.length === 0) {
    fail('At least one positive mutate glob is required.');
  }

  const positiveMatchers = positivePatterns.map(globToRegExp);
  const negativeMatchers = negativePatterns.map(globToRegExp);
  const roots = [...new Set(positivePatterns.map(staticGlobRoot))].sort();
  const candidates = new Set();
  for (const root of roots) {
    const absoluteRoot = resolve(PROJECT_ROOT, root);
    if (relative(PROJECT_ROOT, absoluteRoot).startsWith('..')) {
      fail(`Mutate glob resolves outside the project: ${root}.`);
    }
    for (const file of await collectFiles(absoluteRoot)) {
      candidates.add(slashPath(relative(PROJECT_ROOT, file)));
    }
  }

  const files = [...candidates]
    .filter((file) => positiveMatchers.some((matcher) => matcher.test(file)))
    .filter((file) => !negativeMatchers.some((matcher) => matcher.test(file)))
    .sort();
  if (files.length === 0) {
    fail(`The mutate globs resolved to zero files: ${patterns.join(', ')}.`);
  }
  return files;
}

async function createManifest(shardCount) {
  const configText = await readFile(STRYKER_CONFIG_PATH, 'utf8');
  const config = JSON.parse(configText);
  if (config.concurrency !== BASE_CONCURRENCY) {
    fail(
      `Expected stryker.config.json concurrency ${BASE_CONCURRENCY}; found ${JSON.stringify(config.concurrency)}. ` +
        'Refusing to run with an unreviewed machine-load setting.',
    );
  }

  const files = await resolveMutateFiles(config.mutate);
  const hashOrderedFiles = [...files].sort((left, right) => {
    const hashComparison = sha256(left).localeCompare(sha256(right));
    return hashComparison || left.localeCompare(right);
  });
  const shards = Array.from({ length: shardCount }, (_, index) => ({
    index: index + 1,
    name: `shard-${String(index + 1).padStart(3, '0')}`,
    files: [],
  }));
  for (const [index, file] of hashOrderedFiles.entries()) {
    shards[index % shardCount].files.push(file);
  }
  for (const shard of shards) {
    shard.files.sort();
  }

  const manifestCore = {
    version: 1,
    shardCount,
    configFile: 'stryker.config.json',
    configHash: sha256(configText),
    mutatePatterns: config.mutate,
    fileListHash: sha256(files.join('\n')),
    totalFiles: files.length,
    shards,
  };
  const manifest = {
    ...manifestCore,
    fingerprint: sha256(stableStringify(manifestCore)),
  };
  await writeJsonAtomic(MANIFEST_PATH, manifest);
  return { config, manifest };
}

function shardPaths(shard, rerun = false, artifactRoot = ARTIFACT_ROOT) {
  const shardDirectory = resolve(artifactRoot, shard.name);
  const directory = rerun ? resolve(shardDirectory, 'rerun') : shardDirectory;
  return {
    shardDirectory,
    directory,
    config: resolve(directory, 'stryker.config.json'),
    rawSources: resolve(directory, 'raw-sources.json'),
    report: resolve(directory, 'mutation.json'),
    // Audit and rerun layers intentionally share incremental state (D308).
    incremental: resolve(shardDirectory, 'incremental.json'),
    metadata: resolve(directory, 'run.json'),
    vitestConfig: resolve(directory, 'vitest.config.mjs'),
  };
}

function chunkPaths(paths, chunkIndex) {
  const name = `chunk-${String(chunkIndex + 1).padStart(3, '0')}`;
  const directory = resolve(paths.directory, 'chunks', name);
  return {
    name,
    directory,
    config: resolve(directory, 'stryker.config.json'),
    report: resolve(directory, 'mutation.json'),
    tempDirName: `.stryker-tmp/${slashPath(relative(ARTIFACT_ROOT, directory))}`,
  };
}

function splitIntoChunks(files, maximumFiles) {
  if (maximumFiles === undefined) {
    return [files];
  }
  const chunks = [];
  for (let index = 0; index < files.length; index += maximumFiles) {
    chunks.push(files.slice(index, index + maximumFiles));
  }
  return chunks;
}

function createStrykerRunConfig(
  config,
  concurrency,
  rerun,
  files,
  incrementalPath,
  reportPath,
  tempDirName,
  vitestConfigPath,
) {
  const runConfig = {
    ...config,
    $schema: undefined,
    concurrency,
    disableBail: false,
    incremental: true,
    // Stryker 9.6.1 deliberately carries cached mutants that are outside the
    // current mutate scope into the next report (incremental-differ.js), and
    // then overwrites the incremental file with that combined report
    // (mutation-test-report-helper.js). One shard cache therefore tolerates
    // partial chunk mutate lists without discarding other chunks. The JSON
    // reporter receives that combined result too, so isolateChunkReport trims
    // each durable per-chunk report back to the files that chunk actually ran.
    incrementalFile: incrementalPath,
    // D308: iteration re-runs skip static mutants; full audits keep them.
    ignoreStatic: rerun,
    dryRunTimeoutMinutes: 15,
    mutate: files,
    plugins: REQUIRED_PLUGINS,
    reporters: ['json'],
    jsonReporter: { fileName: reportPath },
    tempDirName,
    disableTypeChecks: `{${files.join(',')}}`,
    vitest: {
      ...(config.vitest ?? {}),
      configFile: vitestConfigPath,
    },
  };
  delete runConfig.$schema;
  return runConfig;
}

function stockWorkerAllocation(concurrency, checkerCount) {
  if (checkerCount === 0) {
    return { total: concurrency, checkers: 0, testRunners: concurrency };
  }
  return {
    total: concurrency,
    checkers: Math.max(Math.ceil(concurrency / 2), 1),
    testRunners: Math.max(Math.floor(concurrency / 2), 1),
  };
}

async function snapshotRawSourceImports(snapshotPath) {
  const sourceFiles = (await collectFiles(resolve(PROJECT_ROOT, 'src')))
    .filter((file) => file.endsWith('.ts'))
    .sort();
  const rawSourceFiles = new Set();
  const importPatterns = [
    /\bfrom\s+(['"])([^'"]+\?raw)\1/g,
    /\bimport\s*\(\s*(['"])([^'"]+\?raw)\1\s*\)/g,
  ];
  for (const importer of sourceFiles) {
    const source = await readFile(importer, 'utf8');
    for (const pattern of importPatterns) {
      pattern.lastIndex = 0;
      for (const match of source.matchAll(pattern)) {
        const specifier = match[2];
        if (!specifier.startsWith('.')) {
          continue;
        }
        const importedPath = resolve(dirname(importer), specifier.slice(0, specifier.indexOf('?')));
        const relativePath = slashPath(relative(PROJECT_ROOT, importedPath));
        if (relativePath.startsWith('../')) {
          fail(`Raw import ${specifier} from ${slashPath(relative(PROJECT_ROOT, importer))} escapes the project.`);
        }
        rawSourceFiles.add(relativePath);
      }
    }
  }

  const snapshot = {};
  for (const file of [...rawSourceFiles].sort()) {
    snapshot[file] = await readFile(resolve(PROJECT_ROOT, file), 'utf8');
  }
  await writeJsonAtomic(snapshotPath, snapshot);
  return snapshot;
}

async function writeMutationVitestConfig(paths, rawSources) {
  const configSource = `import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from ${JSON.stringify(pathToFileURL(resolve(PROJECT_ROOT, 'vitest.config.ts')).href)};

const projectRoot = ${JSON.stringify(PROJECT_ROOT)};
const rawSources = JSON.parse(readFileSync(${JSON.stringify(paths.rawSources)}, 'utf8'));
const originals = new Map(
  Object.entries(rawSources).map(([file, source]) => [resolve(projectRoot, file), source]),
);

const preserveOriginalRawSources = {
  name: 'mutation-preserve-original-raw-sources',
  enforce: 'pre',
  load(id) {
    const queryIndex = id.indexOf('?');
    if (queryIndex === -1) return undefined;
    const query = id.slice(queryIndex + 1).split('&');
    if (!query.includes('raw')) return undefined;
    const source = originals.get(id.slice(0, queryIndex));
    if (source === undefined) return undefined;
    return { code: \`export default \${JSON.stringify(source)};\`, map: null };
  },
};

export default mergeConfig(
  baseConfig,
  defineConfig({ plugins: [preserveOriginalRawSources] }),
);
`;
  await writeFile(paths.vitestConfig, configSource, 'utf8');
  console.log(`Preserving ${Object.keys(rawSources).length} original ?raw source(s) for ${paths.directory}.`);
}

async function assertRunnerPatch() {
  const runner = await readFile(PATCHED_RUNNER_PATH, 'utf8').catch(() => undefined);
  if (runner === undefined || !runner.includes(PATCH_MARKER)) {
    fail(
      'The local stryker-js #6150 Vitest runner patch is not applied. ' +
        'Run node scripts/patch-stryker-vitest-runner.mjs before mutation testing.',
    );
  }
}

async function runProcess(executable, args, environment = process.env) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd: PROJECT_ROOT,
      env: environment,
      stdio: 'inherit',
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => resolvePromise({ code, signal }));
  });
}

async function runShard(
  config,
  manifest,
  shardIndex,
  concurrencyOverride,
  chunkFileLimit,
  rerun = false,
) {
  if (chunkFileLimit !== undefined && process.env.DND_BOX_LOCK_HELD !== undefined) {
    fail(
      '--chunk-files manages the box lock between chunks; invoke mutation-shard.mjs directly, ' +
        'not through with-box-lock.sh.',
    );
  }
  await assertRunnerPatch();
  const shard = manifest.shards[shardIndex - 1];
  if (shard === undefined || shard.files.length === 0) {
    fail(`Shard ${shardIndex} has no files; use no more than ${manifest.totalFiles} shards.`);
  }

  const paths = shardPaths(shard, rerun);
  await mkdir(paths.directory, { recursive: true });
  await rm(paths.report, { force: true });
  await rm(paths.metadata, { force: true });

  const rawSources = await snapshotRawSourceImports(paths.rawSources);
  await writeMutationVitestConfig(paths, rawSources);
  // Stryker's incremental differ treats a cached Ignored (static-skipped)
  // result as reusable when mutant coverage is missing — only perTest
  // coverage guarantees a later full audit re-measures what a --rerun
  // skipped. Refuse anything else rather than risk a silent inherit.
  // Stryker 9's schema default is "perTest" (schema/stryker-schema.json).
  if ((config.coverageAnalysis ?? 'perTest') !== 'perTest') {
    fail('Shard runs require coverageAnalysis "perTest" in stryker.config.json (D308 cache-safety).');
  }
  const concurrency = concurrencyOverride ?? config.concurrency;
  const workers = stockWorkerAllocation(concurrency, config.checkers.length);
  const chunks = splitIntoChunks(shard.files, chunkFileLimit);
  const isChunked = chunkFileLimit !== undefined;
  const completedChunkReports = [];
  let runtimeMs = 0;
  let lastResult = { code: 0, signal: null };
  const strykerExecutable = resolve(
    PROJECT_ROOT,
    `node_modules/.bin/stryker${process.platform === 'win32' ? '.cmd' : ''}`,
  );
  const fullShardConfig = createStrykerRunConfig(
    config,
    concurrency,
    rerun,
    shard.files,
    paths.incremental,
    paths.report,
    `.stryker-tmp/${shard.name}`,
    paths.vitestConfig,
  );
  if (isChunked) {
    await writeJsonAtomic(paths.config, fullShardConfig);
  }

  console.log(`\n=== ${shard.name}: ${shard.files.length} files in ${chunks.length} chunk(s) ===`);
  console.log(
    `Stock concurrency ${workers.total}: ${workers.testRunners} test runner(s) + ` +
      `${workers.checkers} checker(s).`,
  );
  console.log(`Incremental results: ${slashPath(relative(PROJECT_ROOT, paths.incremental))}`);

  for (const [chunkIndex, files] of chunks.entries()) {
    const currentPaths = isChunked ? chunkPaths(paths, chunkIndex) : {
      name: shard.name,
      directory: paths.directory,
      config: paths.config,
      report: paths.report,
      tempDirName: `.stryker-tmp/${shard.name}`,
    };
    await mkdir(currentPaths.directory, { recursive: true });
    await rm(currentPaths.report, { force: true });

    const chunkConfig = isChunked
      ? createStrykerRunConfig(
          config,
          concurrency,
          rerun,
          files,
          paths.incremental,
          currentPaths.report,
          currentPaths.tempDirName,
          paths.vitestConfig,
        )
      : fullShardConfig;
    await writeJsonAtomic(currentPaths.config, chunkConfig);

    console.log(
      `\n--- ${shard.name} ${currentPaths.name}: ${files.length} file(s) ` +
        `(${chunkIndex + 1}/${chunks.length}) ---`,
    );
    if (rerun) {
      console.log(
        'D308 RERUN MODE: static-only mutants are SKIPPED (Ignored) and count ' +
          'as UNMEASURED, not covered; hybrid static/per-test mutants still ' +
          'run, and previously measured statics may be reused from the ' +
          'incremental cache. Full-audit scores need a run without --rerun.',
      );
    }

    const startedAt = Date.now();
    lastResult = isChunked
      ? await runProcess(
          BOX_LOCK_WRAPPER,
          [strykerExecutable, 'run', currentPaths.config],
          { ...process.env, DND_BOX_LOCK_CLASS: 'long' },
        )
      : await runProcess(strykerExecutable, ['run', currentPaths.config]);
    const chunkRuntimeMs = Date.now() - startedAt;
    runtimeMs += chunkRuntimeMs;

    if (lastResult.signal !== null || lastResult.code !== 0) {
      break;
    }
    const report = JSON.parse(
      await readFile(currentPaths.report, 'utf8').catch(() =>
        fail(`${shard.name} ${currentPaths.name} exited successfully but produced no JSON report.`),
      ),
    );
    const isolatedReport = isolateChunkReport(report, files, `${shard.name} ${currentPaths.name}`);
    if (isChunked) {
      await writeJsonAtomic(currentPaths.report, isolatedReport);
    }
    completedChunkReports.push({ name: currentPaths.name, files, report: isolatedReport });
    console.log(`${shard.name} ${currentPaths.name} completed in ${formatDuration(chunkRuntimeMs)}.`);
  }

  const metadata = {
    shard: shard.index,
    name: shard.name,
    manifestFingerprint: manifest.fingerprint,
    fileListHash: sha256(shard.files.join('\n')),
    fileCount: shard.files.length,
    workers,
    incremental: true,
    incrementalFile: slashPath(relative(PROJECT_ROOT, paths.incremental)),
    rerun,
    ignoreStatic: rerun,
    runtimeMs,
    exitCode: lastResult.code,
    signal: lastResult.signal,
  };
  await writeJsonAtomic(paths.metadata, metadata);

  if (lastResult.signal !== null || lastResult.code !== 0) {
    fail(
      `${shard.name} failed after ${formatDuration(runtimeMs)} ` +
        `(exit ${String(lastResult.code)}, signal ${String(lastResult.signal)}).`,
    );
  }
  if (isChunked) {
    const mergedReport = mergeChunkReports(completedChunkReports, shard.files);
    mergedReport.config = {
      ...mergedReport.config,
      mutate: fullShardConfig.mutate,
      jsonReporter: fullShardConfig.jsonReporter,
      tempDirName: fullShardConfig.tempDirName,
      disableTypeChecks: fullShardConfig.disableTypeChecks,
    };
    await writeJsonAtomic(paths.report, mergedReport);
  }
  console.log(`${shard.name} completed in ${formatDuration(runtimeMs)}.`);
}

function normalizeReportFileName(fileName, projectRoot) {
  const normalized = slashPath(fileName);
  if (isAbsolute(fileName)) {
    return slashPath(relative(PROJECT_ROOT, fileName));
  }
  if (typeof projectRoot === 'string' && projectRoot.length > 0) {
    const normalizedRoot = slashPath(projectRoot).replace(/\/$/, '');
    if (normalized.startsWith(`${normalizedRoot}/`)) {
      return normalized.slice(normalizedRoot.length + 1);
    }
  }
  return normalized.replace(/^\.\//, '');
}

function isolateChunkReport(report, expectedFiles, label) {
  const expected = new Set(expectedFiles);
  const files = {};
  for (const [fileName, fileResult] of Object.entries(report.files)) {
    const normalizedName = normalizeReportFileName(fileName, report.projectRoot);
    if (expected.has(normalizedName)) {
      files[normalizedName] = fileResult;
    }
  }
  const missingFiles = expectedFiles.filter((file) => files[file] === undefined);
  if (missingFiles.length > 0) {
    fail(`${label} omitted mutated files: ${missingFiles.join(', ')}.`);
  }
  return { ...report, files };
}

function countStatuses(mutants) {
  const counts = Object.fromEntries(STATUS_NAMES.map((status) => [status, 0]));
  for (const mutant of mutants) {
    if (!(mutant.status in counts)) {
      fail(`Unknown mutant status ${JSON.stringify(mutant.status)}.`);
    }
    counts[mutant.status] += 1;
  }
  return counts;
}

function mergeTestFiles(target, incoming) {
  for (const [fileName, testFile] of Object.entries(incoming ?? {})) {
    const normalizedName = normalizeReportFileName(fileName);
    const existing = target[normalizedName];
    if (existing === undefined) {
      target[normalizedName] = testFile;
      continue;
    }
    if (existing.source !== testFile.source) {
      fail(`Conflicting test source while merging ${normalizedName}.`);
    }
    const testsById = new Map(existing.tests.map((test) => [test.id, test]));
    for (const test of testFile.tests) {
      const duplicate = testsById.get(test.id);
      if (duplicate === undefined) {
        existing.tests.push(test);
        testsById.set(test.id, test);
      } else if (stableStringify(duplicate) !== stableStringify(test)) {
        fail(`Conflicting definition for test id ${test.id} in ${normalizedName}.`);
      }
    }
    existing.tests.sort((left, right) => left.id.localeCompare(right.id));
  }
}

function namespaceShardReport(report, namespace, label = namespace) {
  const normalizedTestFiles = {};
  mergeTestFiles(normalizedTestFiles, report.testFiles);

  const definitionsById = new Map();
  const testFiles = {};
  for (const [fileName, testFile] of Object.entries(normalizedTestFiles)) {
    const namespacedFileName = `${namespace}:${fileName}`;
    const tests = testFile.tests.map((test) => {
      const rawId = String(test.id);
      const definition = stableStringify({ fileName, test });
      const existing = definitionsById.get(rawId);
      if (existing !== undefined && existing !== definition) {
        fail(`Conflicting definition for test id ${rawId} within ${label}.`);
      }
      definitionsById.set(rawId, definition);
      return { ...test, id: `${namespace}:${rawId}` };
    });
    testFiles[namespacedFileName] = { ...testFile, tests };
  }

  const namespaceReferences = (references, mutantId, property) => {
    if (references === undefined) {
      return undefined;
    }
    return references.map((id) => {
      const rawId = String(id);
      if (!definitionsById.has(rawId)) {
        fail(`${label} mutant ${mutantId} has unknown ${property} test id ${rawId}.`);
      }
      return `${namespace}:${rawId}`;
    });
  };
  const files = Object.fromEntries(
    Object.entries(report.files).map(([fileName, fileResult]) => [
      fileName,
      {
        ...fileResult,
        mutants: fileResult.mutants.map((mutant) => ({
          ...mutant,
          coveredBy: namespaceReferences(mutant.coveredBy, mutant.id, 'coveredBy'),
          killedBy: namespaceReferences(mutant.killedBy, mutant.id, 'killedBy'),
        })),
      },
    ]),
  );

  return {
    ...report,
    files,
    ...(Object.keys(testFiles).length > 0 ? { testFiles } : {}),
  };
}

function sumPerformance(target, performance) {
  if (performance === undefined) {
    return target;
  }
  const result = target ?? { setup: 0, initialRun: 0, mutation: 0 };
  result.setup += performance.setup;
  result.initialRun += performance.initialRun;
  result.mutation += performance.mutation;
  return result;
}

function mergeChunkReports(chunks, expectedFiles) {
  if (chunks.length === 0) {
    fail('Cannot merge zero chunk reports.');
  }

  const files = {};
  const testFiles = {};
  let performance;
  const firstReport = chunks[0].report;
  for (const chunk of chunks) {
    const report = chunk.report;
    if (report.schemaVersion !== firstReport.schemaVersion) {
      fail(
        `${chunk.name} uses mutation report schema ${report.schemaVersion}; ` +
          `expected ${firstReport.schemaVersion}.`,
      );
    }
    if (stableStringify(report.thresholds) !== stableStringify(firstReport.thresholds)) {
      fail(`${chunk.name} has thresholds that differ from prior chunks.`);
    }
    performance = sumPerformance(performance, report.performance);
    mergeTestFiles(testFiles, report.testFiles);

    for (const [fileName, fileResult] of Object.entries(report.files)) {
      if (!chunk.files.includes(fileName)) {
        fail(`${chunk.name} reported unexpected mutated file ${fileName}.`);
      }
      if (files[fileName] !== undefined) {
        fail(`Mutated file ${fileName} appears in more than one chunk report.`);
      }
      files[fileName] = {
        ...fileResult,
        mutants: fileResult.mutants.map((mutant) => ({
          ...mutant,
          id: `${chunk.name}:${mutant.id}`,
        })),
      };
    }
  }

  const missingFiles = expectedFiles.filter((file) => files[file] === undefined);
  if (missingFiles.length > 0) {
    fail(`Chunk reports omitted mutated files: ${missingFiles.join(', ')}.`);
  }

  const merged = {
    ...firstReport,
    files: Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right))),
  };
  if (Object.keys(testFiles).length > 0) {
    merged.testFiles = Object.fromEntries(
      Object.entries(testFiles).sort(([left], [right]) => left.localeCompare(right)),
    );
  } else {
    delete merged.testFiles;
  }
  if (performance === undefined) {
    delete merged.performance;
  } else {
    merged.performance = performance;
  }
  return merged;
}

function formatDuration(runtimeMs) {
  const totalSeconds = Math.round(runtimeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours > 0 ? `${hours}h` : undefined, minutes > 0 ? `${minutes}m` : undefined, `${seconds}s`]
    .filter(Boolean)
    .join(' ');
}

async function loadReportLayer(manifest, rerun, artifactRoot) {
  const layerName = rerun ? 'rerun' : 'audit';
  const available = [];
  const unavailable = [];
  const loaded = new Map();

  for (const shard of manifest.shards) {
    const paths = shardPaths(shard, rerun, artifactRoot);
    const [metadataText, reportText] = await Promise.all([
      readFile(paths.metadata, 'utf8').catch(() => undefined),
      readFile(paths.report, 'utf8').catch(() => undefined),
    ]);
    const missing = [
      ...(metadataText === undefined ? ['run.json'] : []),
      ...(reportText === undefined ? ['mutation.json'] : []),
    ];
    if (missing.length > 0) {
      unavailable.push(`${shard.name} (missing ${missing.join(' and ')})`);
      continue;
    }

    let metadata;
    let report;
    try {
      metadata = JSON.parse(metadataText);
      report = JSON.parse(reportText);
    } catch (error) {
      unavailable.push(
        `${shard.name} (invalid JSON: ${error instanceof Error ? error.message : String(error)})`,
      );
      continue;
    }
    if ((metadata.rerun === true) !== rerun) {
      unavailable.push(
        `${shard.name} (run.json marks ${metadata.rerun === true ? 'rerun' : 'audit'})`,
      );
      continue;
    }
    available.push(shard.name);
    loaded.set(shard.name, { metadata, report });
  }

  if (unavailable.length > 0) {
    fail(
      `Missing requested ${layerName} layer for ${unavailable.join(', ')}. ` +
        `Shards with the ${layerName} layer: ${available.length > 0 ? available.join(', ') : 'none'}.`,
    );
  }
  return loaded;
}

async function mergeReports(
  manifest,
  {
    rerun = false,
    artifactRoot = ARTIFACT_ROOT,
    aggregatePath = AGGREGATE_PATH,
    write = true,
  } = {},
) {
  const files = {};
  const testFiles = {};
  const shardRuntimesMs = {};
  const shardRunSettings = {};
  const rerunShards = [];
  let schemaVersion;
  let thresholds;
  let framework;
  let system;
  let performance;
  const reportLayer = await loadReportLayer(manifest, rerun, artifactRoot);

  for (const shard of manifest.shards) {
    const { metadata, report } = reportLayer.get(shard.name);
    if (metadata.exitCode !== 0 || metadata.signal !== null) {
      fail(`${shard.name} did not complete successfully; re-run it before merging.`);
    }
    if (metadata.manifestFingerprint !== manifest.fingerprint) {
      fail(`${shard.name} belongs to a stale shard manifest; re-run it before merging.`);
    }
    if (metadata.fileListHash !== sha256(shard.files.join('\n'))) {
      fail(`${shard.name} metadata has the wrong file-list hash.`);
    }
    shardRuntimesMs[shard.name] = metadata.runtimeMs;
    shardRunSettings[shard.name] = {
      workers: metadata.workers ?? stockWorkerAllocation(BASE_CONCURRENCY, 1),
      incremental: metadata.incremental ?? false,
      incrementalFile: metadata.incrementalFile ?? null,
      rerun: metadata.rerun ?? false,
    };
    if (metadata.rerun === true) {
      rerunShards.push(shard.name);
    }

    schemaVersion ??= report.schemaVersion;
    thresholds ??= report.thresholds;
    framework ??= report.framework;
    system ??= report.system;
    if (report.schemaVersion !== schemaVersion) {
      fail(`${shard.name} uses mutation report schema ${report.schemaVersion}; expected ${schemaVersion}.`);
    }
    if (stableStringify(report.thresholds) !== stableStringify(thresholds)) {
      fail(`${shard.name} has thresholds that differ from prior shards.`);
    }
    performance = sumPerformance(performance, report.performance);
    const namespacedReport = namespaceShardReport(report, shard.name, `${shard.name} report`);
    mergeTestFiles(testFiles, namespacedReport.testFiles);

    const reportedFileNames = [];
    for (const [fileName, fileResult] of Object.entries(namespacedReport.files)) {
      const normalizedName = normalizeReportFileName(fileName, report.projectRoot);
      reportedFileNames.push(normalizedName);
      if (!shard.files.includes(normalizedName)) {
        fail(`${shard.name} reported unexpected mutated file ${normalizedName}.`);
      }
      if (files[normalizedName] !== undefined) {
        fail(`Mutated file ${normalizedName} appears in more than one shard report.`);
      }
      files[normalizedName] = {
        ...fileResult,
        mutants: fileResult.mutants.map((mutant) => ({
          ...mutant,
          id: `${shard.name}:${mutant.id}`,
        })),
      };
    }
    const missingFiles = shard.files.filter((file) => !reportedFileNames.includes(file));
    if (missingFiles.length > 0) {
      fail(`${shard.name} omitted mutated files: ${missingFiles.join(', ')}.`);
    }
  }

  const orderedFiles = Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right)));
  const perFile = {};
  const allMutants = [];
  for (const [fileName, fileResult] of Object.entries(orderedFiles)) {
    const counts = countStatuses(fileResult.mutants);
    const valid = counts.Killed + counts.Timeout + counts.Survived + counts.NoCoverage;
    perFile[fileName] = {
      total: fileResult.mutants.length,
      mutationScore: valid > 0 ? ((counts.Killed + counts.Timeout) / valid) * 100 : null,
      ...counts,
    };
    allMutants.push(...fileResult.mutants);
  }
  const statusTotals = countStatuses(allMutants);
  const totalValid =
    statusTotals.Killed + statusTotals.Timeout + statusTotals.Survived + statusTotals.NoCoverage;
  const mutationScore =
    totalValid > 0 ? ((statusTotals.Killed + statusTotals.Timeout) / totalValid) * 100 : null;

  const aggregate = {
    schemaVersion,
    thresholds,
    projectRoot: PROJECT_ROOT,
    config: {
      sharding: {
        shardCount: manifest.shardCount,
        reportLayer: rerun ? 'rerun' : 'audit',
        manifestFingerprint: manifest.fingerprint,
        fileListHash: manifest.fileListHash,
        runs: shardRunSettings,
      },
      mutate: manifest.mutatePatterns,
    },
    files: orderedFiles,
    ...(Object.keys(testFiles).length > 0
      ? { testFiles: Object.fromEntries(Object.entries(testFiles).sort(([left], [right]) => left.localeCompare(right))) }
      : {}),
    ...(performance === undefined ? {} : { performance }),
    ...(framework === undefined ? {} : { framework }),
    ...(system === undefined ? {} : { system }),
    summary: {
      shardCount: manifest.shardCount,
      sourceFileCount: manifest.totalFiles,
      totalMutants: allMutants.length,
      mutationScore,
      statusTotals,
      perFile,
      shardRuntimesMs,
      totalShardRuntimeMs: Object.values(shardRuntimesMs).reduce((total, runtime) => total + runtime, 0),
      // D308 provenance: a merge containing any --rerun shard is NOT a full
      // audit; its Ignored static-only mutants are unmeasured.
      rerunShards,
      fullAudit: rerunShards.length === 0,
    },
  };
  if (write) {
    await writeJsonAtomic(aggregatePath, aggregate);
  }
  console.log(
    `\nMerged ${allMutants.length} mutants from ${manifest.shardCount} shards` +
      `${write ? ` into ${slashPath(relative(PROJECT_ROOT, aggregatePath))}` : ' (dry run)'}.`,
  );
  console.log(
    `${STATUS_NAMES.map((status) => `${status} ${statusTotals[status]}`).join('; ')}; ` +
      `score ${mutationScore === null ? 'n/a' : `${mutationScore.toFixed(2)}%`}.`,
  );
  if (rerunShards.length > 0) {
    console.log(
      `D308 WARNING: NOT A FULL AUDIT. ${String(rerunShards.length)} shard(s) ran in --rerun ` +
        `mode (${rerunShards.join(', ')}); their Ignored static-only mutants are UNMEASURED, ` +
        `not covered. Re-run those shards without --rerun for an audit-grade score.`,
    );
  }
  for (const shard of manifest.shards) {
    console.log(`${shard.name}: ${formatDuration(shardRuntimesMs[shard.name])}`);
  }
  return aggregate;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.command === 'help') {
    usage();
    return;
  }

  const { config, manifest } = await createManifest(options.shardCount);
  if (options.command === 'plan') {
    console.log(
      `Planned ${manifest.totalFiles} files in ${manifest.shardCount} deterministic shards ` +
        `(fingerprint ${manifest.fingerprint}).`,
    );
    for (const shard of manifest.shards) {
      console.log(`${shard.name}: ${shard.files.length} files`);
    }
  } else if (options.command === 'run') {
    await runShard(
      config,
      manifest,
      options.shardIndex,
      options.concurrency,
      options.chunkFiles,
      options.rerun,
    );
  } else if (options.command === 'run-all') {
    for (const shard of manifest.shards) {
      await runShard(
        config,
        manifest,
        shard.index,
        options.concurrency,
        options.chunkFiles,
        options.rerun,
      );
    }
    await mergeReports(manifest, { rerun: options.rerun });
  } else {
    await mergeReports(manifest, { rerun: options.rerun });
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export { mergeReports, namespaceShardReport, parseArguments, shardPaths };
