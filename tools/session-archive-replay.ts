import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { canonicalJson } from '../src/commands/canonical-json';
import { engineCommit, type EngineCommit, type UnknownRecordedCommitReason } from '../src/vtt/engine-build';
import {
  decodeSessionHistoryArchiveDocument,
  importSavedSession,
  MemoryBrowserSessionStore,
  SessionHistoryArchiveError,
  verifySessionHistoryArchive,
  type SessionHistoryArchive,
} from '../src/vtt/session-persistence';
import { SESSION_ARCHIVE_REPLAY_DRIVER_PATH, type DriverReport, type DriverTurn } from './session-archive-replay-driver';

/**
 * OFFLINE ARCHIVE VERIFICATION (FOOTPRINT fix1; owner D919 "verifiable with the rules it was recorded under, on
 * demand"; D929). The app checks an archive's hash chain (session-persistence.ts verifySessionHistoryArchive);
 * rules change without a schema bump, so replaying the archived turns needs the engine they were recorded by.
 *
 * Given an archive (an archive document, or a save whose root is a migrated root), this tool:
 *   1. runs the in-app check: every archived text against its sha256 (a save: the full verifySessionHistoryArchive);
 *   2. takes the commit the archive records (`recordedEngine`). A history recorded before revisions named their
 *      engine build (session schema 12 and older) has none: the typed result is `recorded_commit_unknown`, and
 *      nothing is replayed unless the operator names a commit (`--assume-commit`), reported as operator_assumed;
 *   3. extracts that commit's src/ and docs/srd/ from this repository (git archive) into a throwaway directory,
 *      copies tools/session-archive-replay-driver.ts beside them, bundles it with esbuild against THAT src/, and
 *      runs it with node: the driver loads the archived texts with that commit's loader and replays every turn
 *      with that commit's reducer, reporting pass or fail per turn;
 *   4. deletes the throwaway directory.
 * It never writes to the repository, its index or its worktrees. Packages resolve from this checkout's
 * node_modules, so a commit whose dependencies differ runs against today's: a stated limit.
 *
 * CLI: vite-node tools/session-archive-replay.ts -- <archive-or-save.json> [--assume-commit <sha>]
 * Prints the report as canonical JSON. Exit 0: every turn replayed. 1: a turn failed, the archive was refused or
 * the replay could not run. 3: no commit to replay at (unknown, or not in this repository).
 */

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Whose word names the commit a replay ran at. */
export type ReplayBasis = 'recorded' | 'operator_assumed';

export type ArchiveReplayReport =
  | { readonly kind: 'archive_refused'; readonly error: string }
  | {
      readonly kind: 'recorded_commit_unknown';
      readonly reason: UnknownRecordedCommitReason;
      readonly recordedSchemaVersions: readonly number[];
    }
  | { readonly kind: 'recorded_commit_unavailable'; readonly commit: EngineCommit; readonly basis: ReplayBasis }
  | {
      readonly kind: 'replay_not_run';
      readonly commit: EngineCommit;
      readonly basis: ReplayBasis;
      readonly stage: 'checkout' | 'bundle' | 'driver';
      readonly error: string;
    }
  | {
      readonly kind: 'replayed';
      readonly commit: EngineCommit;
      readonly basis: ReplayBasis;
      readonly verdict: 'pass' | 'fail';
      /** Whether that commit's loader accepted the archived texts at all; if not, no turn was replayed. */
      readonly load: { readonly kind: 'loaded' } | { readonly kind: 'refused'; readonly error: string };
      readonly turns: readonly DriverTurn[];
    };

export interface ReplayOptions {
  /** The commit to replay at when the archive records none: the operator's assumption, reported as such. */
  readonly assumeCommit?: EngineCommit;
  /** The repository whose commits are replayed (default: this checkout). */
  readonly repositoryRoot?: string;
}

function described(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * The archive a file holds, after the in-app check: an archive document (every text against its sha256), or a
 * save whose root is a migrated root (verifySessionHistoryArchive: hashes, the recorded versions' integrity rules,
 * and the root re-derived). SessionHistoryArchiveError, or the save loader's own error, when it does not verify.
 */
export function archiveOfFile(text: string): SessionHistoryArchive {
  const value: unknown = JSON.parse(text);
  if (typeof value === 'object' && value !== null && Reflect.get(value, 'kind') === 'vtt_session_history_archive') {
    return decodeSessionHistoryArchiveDocument(text);
  }
  const store = new MemoryBrowserSessionStore();
  const root = store.revisions(importSavedSession(store, text))[0];
  if (root === undefined) throw new SessionHistoryArchiveError('The save holds no revision.');
  return verifySessionHistoryArchive(root);
}

function isTurn(value: unknown): value is DriverTurn {
  if (typeof value !== 'object' || value === null) return false;
  const status = Reflect.get(value, 'status');
  return Number.isSafeInteger(Reflect.get(value, 'revision')) && typeof Reflect.get(value, 'transition') === 'string' && (
    status === 'pass' ||
    (status === 'fail' && typeof Reflect.get(value, 'error') === 'string') ||
    (status === 'not_checked' && Reflect.get(value, 'reason') === 'after_a_failed_turn'));
}

function driverReport(stdout: string): DriverReport {
  const value: unknown = JSON.parse(stdout);
  if (typeof value === 'object' && value !== null) {
    const loaded = Reflect.get(value, 'loaded');
    const turns: unknown = Reflect.get(value, 'turns');
    if (loaded === true && Array.isArray(turns) && turns.length > 0 && turns.every(isTurn)) return { loaded: true, turns };
    const error: unknown = Reflect.get(value, 'error');
    if (loaded === false && typeof error === 'string') return { loaded: false, error };
  }
  throw new TypeError('The replay driver wrote a malformed report.');
}

/** The throwaway checkout: `commit`'s src/ and docs/srd/, extracted by git archive, plus this checkout's driver. */
function extractCommit(repositoryRoot: string, commit: EngineCommit, directory: string): string | null {
  const tree = spawnSync('git', ['archive', '--format=tar', commit, 'src', 'docs/srd'], {
    cwd: repositoryRoot, maxBuffer: 1024 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  if (tree.error !== undefined || tree.status !== 0) return `git archive: ${tree.error?.message ?? tree.stderr.toString('utf8')}`;
  const untar = spawnSync('tar', ['-x', '-C', directory], { input: tree.stdout });
  if (untar.error !== undefined || untar.status !== 0) return `tar: ${untar.error?.message ?? untar.stderr.toString('utf8')}`;
  mkdirSync(join(directory, 'tools'), { recursive: true });
  copyFileSync(join(REPOSITORY_ROOT, SESSION_ARCHIVE_REPLAY_DRIVER_PATH), join(directory, SESSION_ARCHIVE_REPLAY_DRIVER_PATH));
  return null;
}

async function bundleDriver(repositoryRoot: string, directory: string, outfile: string): Promise<void> {
  await esbuild.build({
    absWorkingDir: directory,
    entryPoints: [join(directory, SESSION_ARCHIVE_REPLAY_DRIVER_PATH)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    nodePaths: [join(repositoryRoot, 'node_modules')],
    banner: { js: "import { createRequire as __replayRequire } from 'node:module'; const require = __replayRequire(import.meta.url);" },
    plugins: [{
      name: 'vite-raw-text',
      setup(build) {
        // Vite's `?raw` import: the file's text (the engine reads SRD text this way at some commits). esbuild
        // filters are Go regular expressions, which take no `u` flag.
        build.onResolve({ filter: /\?raw$/ }, (args) => ({
          path: resolve(args.resolveDir, args.path.slice(0, -'?raw'.length)),
          namespace: 'vite-raw-text',
        }));
        build.onLoad({ filter: /.*/, namespace: 'vite-raw-text' }, (args) => ({
          contents: readFileSync(args.path, 'utf8'),
          loader: 'text',
        }));
      },
    }],
  });
}

/** Replays `archive` at the commit it records (or the operator's assumed one), in a throwaway checkout. */
export async function replaySessionArchive(
  archive: SessionHistoryArchive,
  options: ReplayOptions = {},
): Promise<ArchiveReplayReport> {
  const repositoryRoot = options.repositoryRoot ?? REPOSITORY_ROOT;
  const recorded = archive.recordedEngine;
  if (recorded.kind === 'engine_commit' && options.assumeCommit !== undefined && options.assumeCommit !== recorded.commit) {
    throw new Error(`The archive records commit ${recorded.commit}; an assumed commit is only for an archive that records none.`);
  }
  let target: { readonly commit: EngineCommit; readonly basis: ReplayBasis };
  if (recorded.kind === 'engine_commit') target = { commit: recorded.commit, basis: 'recorded' };
  else if (options.assumeCommit !== undefined) target = { commit: options.assumeCommit, basis: 'operator_assumed' };
  else return { kind: 'recorded_commit_unknown', reason: recorded.reason, recordedSchemaVersions: archive.recordedSchemaVersions };
  const present = spawnSync('git', ['cat-file', '-e', `${target.commit}^{commit}`], { cwd: repositoryRoot });
  if (present.error !== undefined || present.status !== 0) return { kind: 'recorded_commit_unavailable', ...target };
  const directory = mkdtempSync(join(tmpdir(), 'vtt-archive-replay-'));
  try {
    const checkout = extractCommit(repositoryRoot, target.commit, directory);
    if (checkout !== null) return { kind: 'replay_not_run', ...target, stage: 'checkout', error: checkout };
    const bundle = join(directory, 'session-archive-replay-driver.mjs');
    try {
      await bundleDriver(repositoryRoot, directory, bundle);
    } catch (error) {
      return { kind: 'replay_not_run', ...target, stage: 'bundle', error: described(error) };
    }
    const archivePath = join(directory, 'archive.json');
    writeFileSync(archivePath, canonicalJson({ source: archive.source }));
    const run = spawnSync(process.execPath, [bundle, archivePath], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    if (run.error !== undefined || run.status !== 0) {
      return { kind: 'replay_not_run', ...target, stage: 'driver', error: run.error?.message ?? run.stderr };
    }
    let report: DriverReport;
    try {
      report = driverReport(run.stdout);
    } catch (error) {
      return { kind: 'replay_not_run', ...target, stage: 'driver', error: described(error) };
    }
    if (!report.loaded) {
      return { kind: 'replayed', ...target, verdict: 'fail', load: { kind: 'refused', error: report.error }, turns: [] };
    }
    return {
      kind: 'replayed',
      ...target,
      verdict: report.turns.every((turn) => turn.status === 'pass') ? 'pass' : 'fail',
      load: { kind: 'loaded' },
      turns: report.turns,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** The whole tool on one file: the in-app check, then the replay. */
export async function replaySessionArchiveFile(text: string, options: ReplayOptions = {}): Promise<ArchiveReplayReport> {
  let archive: SessionHistoryArchive;
  try {
    archive = archiveOfFile(text);
  } catch (error) {
    return { kind: 'archive_refused', error: described(error) };
  }
  return replaySessionArchive(archive, options);
}

export function exitCodeOf(report: ArchiveReplayReport): 0 | 1 | 3 {
  switch (report.kind) {
    case 'replayed': return report.verdict === 'pass' ? 0 : 1;
    case 'archive_refused':
    case 'replay_not_run': return 1;
    case 'recorded_commit_unknown':
    case 'recorded_commit_unavailable': return 3;
  }
}

export async function runSessionArchiveReplayCommand(args: readonly string[]): Promise<ArchiveReplayReport> {
  const [path, flag, commit, ...rest] = args;
  if (path === undefined || rest.length > 0 || (flag !== undefined && (flag !== '--assume-commit' || commit === undefined))) {
    throw new Error('Usage: vite-node tools/session-archive-replay.ts -- <archive-or-save.json> [--assume-commit <sha>]');
  }
  return replaySessionArchiveFile(readFileSync(path, 'utf8'), commit === undefined ? {} : { assumeCommit: engineCommit(commit) });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  runSessionArchiveReplayCommand(process.argv.slice(2))
    .then((report) => {
      process.stdout.write(`${canonicalJson(report)}\n`);
      process.exitCode = exitCodeOf(report);
    })
    .catch((error: unknown) => {
      process.stderr.write(`${described(error)}\n`);
      process.exitCode = 1;
    });
}
