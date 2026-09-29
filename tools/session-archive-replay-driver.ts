import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { EngineBuild, EngineCommit } from '../src/vtt/engine-build';
import {
  importSavedSession,
  MemoryBrowserSessionStore,
  migrateStoredSessionRevisions,
  replaySessionRevisions,
  type ArchivedSource,
  type SessionRevision,
} from '../src/vtt/session-persistence';

/**
 * THE REPLAY DRIVER of tools/session-archive-replay.ts (FOOTPRINT fix1, owner D919, D929).
 *
 * It is not run from this checkout. The tool copies it into a throwaway checkout of the commit an archive was
 * recorded under (to tools/session-archive-replay-driver.ts there), esbuild bundles it against THAT commit's src/,
 * and node runs the bundle: every archived turn replays with that commit's reducer, never this checkout's. It
 * uses only session-persistence exports the commits it replays at share: importSavedSession,
 * MemoryBrowserSessionStore, migrateStoredSessionRevisions and replaySessionRevisions. A commit before fix1 took
 * a stored stream as parsed revisions rather than texts; the driver passes texts, then the parsed revisions if
 * those are refused as malformed.
 *
 * It replays at the build it is given (SAVE-COMPAT, D929/D946): the recording commit, passed as the running build, so
 * a turn that does not replay there is an integrity fault of the save. A commit before SAVE-COMPAT ignores the
 * argument (its replay takes none).
 *
 * argv[2]: a JSON file { "source": ArchivedSource, "replayAt": EngineCommit }. stdout: one line of JSON, a
 * DriverReport.
 */

/**
 * Where the driver lives in a checkout: the tool copies this checkout's driver to the same path in the throwaway
 * checkout, so its `../src/...` imports resolve to THAT commit's src/. The tool imports this value, which also makes
 * the driver a runtime import of the tool for every import-graph reader (it is otherwise only copied and spawned).
 */
export const SESSION_ARCHIVE_REPLAY_DRIVER_PATH = 'tools/session-archive-replay-driver.ts';

export type DriverTurn =
  | { readonly revision: number; readonly transition: string; readonly status: 'pass' }
  | { readonly revision: number; readonly transition: string; readonly status: 'fail'; readonly error: string }
  | { readonly revision: number; readonly transition: string; readonly status: 'not_checked'; readonly reason: 'after_a_failed_turn' };

export type DriverReport =
  | { readonly loaded: true; readonly turns: readonly DriverTurn[] }
  | { readonly loaded: false; readonly error: string };

/** What a replay records nothing with: a replay appends no revision, but the stored-stream loader takes a build. */
const REPLAY_RECORDS_NOTHING: EngineBuild = { kind: 'unrecorded', reason: 'build_without_commit' };

function described(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** The archived revisions, loaded by this commit's own loader. */
function loadedRevisions(source: ArchivedSource): readonly SessionRevision[] {
  switch (source.kind) {
    case 'saved_session': {
      const store = new MemoryBrowserSessionStore();
      return store.revisions(importSavedSession(store, source.save.text));
    }
    case 'stored_stream': {
      const texts = source.revisions.map((revision) => revision.text);
      try {
        return migrateStoredSessionRevisions(texts, REPLAY_RECORDS_NOTHING);
      } catch (error) {
        // By message: this is a TypeError at the commits it is for, a typed integrity error since SAVE-COMPAT.
        if (!(error instanceof Error) || !error.message.includes('Stored VTT session revision stream is malformed')) throw error;
        // A commit before fix1: its stored-stream loader takes parsed revisions.
        const parsed = texts.map((text): unknown => JSON.parse(text)) as unknown as readonly string[];
        return migrateStoredSessionRevisions(parsed, REPLAY_RECORDS_NOTHING);
      }
    }
  }
}

/** Null when the first `count` revisions replay under this commit's reducer, run as `replayAt`, else why not. */
function prefixRefusal(revisions: readonly SessionRevision[], count: number, replayAt: EngineBuild): string | null {
  try {
    replaySessionRevisions(revisions.slice(0, count), replayAt);
    return null;
  } catch (error) {
    return described(error);
  }
}

/**
 * Every turn's verdict. A turn replays from its parent's recorded state, so the first failing turn is found by the
 * smallest failing prefix (binary search; the prefix verdict is monotone). Turns after it are not checked: their
 * parent chain holds a turn that does not replay.
 */
export function replayedTurns(revisions: readonly SessionRevision[], replayAt: EngineBuild): readonly DriverTurn[] {
  let failedAt = revisions.length + 1;
  let failure: string | null = prefixRefusal(revisions, revisions.length, replayAt);
  if (failure !== null) {
    let low = 1;
    let high = revisions.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (prefixRefusal(revisions, middle, replayAt) === null) low = middle + 1;
      else high = middle;
    }
    failedAt = low;
    failure = prefixRefusal(revisions, low, replayAt);
  }
  return revisions.map((revision, index): DriverTurn => {
    const at = { revision: revision.revision, transition: revision.transition.kind };
    if (index + 1 < failedAt) return { ...at, status: 'pass' };
    if (index + 1 === failedAt) return { ...at, status: 'fail', error: failure ?? 'the turn did not replay' };
    return { ...at, status: 'not_checked', reason: 'after_a_failed_turn' };
  });
}

function driverReport(archivePath: string): DriverReport {
  const { source, replayAt } = JSON.parse(readFileSync(archivePath, 'utf8')) as {
    readonly source: ArchivedSource;
    readonly replayAt: EngineCommit;
  };
  let revisions: readonly SessionRevision[];
  try {
    revisions = loadedRevisions(source);
  } catch (error) {
    return { loaded: false, error: described(error) };
  }
  return { loaded: true, turns: replayedTurns(revisions, { kind: 'engine_commit', commit: replayAt }) };
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  const archivePath = process.argv[2];
  if (archivePath === undefined) throw new Error('usage: session-archive-replay-driver <archive.json>');
  process.stdout.write(`${JSON.stringify(driverReport(archivePath))}\n`);
}
