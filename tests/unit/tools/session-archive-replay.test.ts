import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { encounterBranchId, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { engineCommit, RUNNING_ENGINE_BUILD } from '../../../src/vtt/engine-build';
import { referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
import {
  decodeSessionHistoryArchiveDocument,
  EncounterSessionJournal,
  exportSavedSession,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  SessionHistoryArchiveMetadataError,
  sessionHistoryArchiveDocument,
  sessionHistoryArchiveOf,
  type SessionHistoryArchive,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import {
  exitCodeOf,
  replaySessionArchive,
  replaySessionArchiveFile,
  sessionArchiveReplayArguments,
} from '../../../tools/session-archive-replay';
import { mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';

// FOOTPRINT fix1 (codex r1 P2; owner D919 "verifiable with the rules it was recorded under, on demand"; D929). The
// offline tool replays an archive at the engine commit its revisions were recorded by, in a throwaway checkout of
// that commit (git archive of its src/ and docs/srd/, the driver bundled against THAT src/), turn by turn.
//
// The recorded save is made HERE, by a store that records the current commit (git rev-parse HEAD): "a save recorded
// at the current commit". Its archive names that commit; replayed there, every turn passes. The tampered copy has
// every hash recomputed, so the in-app hash chain passes, and only the replay can refuse it.

const DIR = 'tests/fixtures/session-v12-footprint';
const OVERHANG = `${DIR}/overhang.revisions.v12.json`;
const MIXED = `${DIR}/mixed.stored-stream.v11-v12.json`;
const PROVENANCE = `${DIR}/provenance.json`;
const inputs = declareTestInputs({ fixtures: [OVERHANG, MIXED, PROVENANCE] });

function head(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git rev-parse HEAD failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** A four-revision session recorded by a store that records `commit`: started, initiative, a Dodge, its turn ended. */
function recordedAt(commit: string): readonly SessionRevision[] {
  const store = new MemoryBrowserSessionStore({ kind: 'engine_commit', commit: engineCommit(commit) });
  const sessionId = encounterSessionId('session:archive-replay');
  const rng = mulberry32(6_203_041);
  const coordinatorState = { requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' as const }, pause: null };
  const journal = EncounterSessionJournal.create({
    sessionId, branchId: encounterBranchId('branch:main'), encounterState: createEncounter(referenceEncounterSetup()),
    coordinatorState, controllers: [], rng, store, mirror: new MemoryMirrorSink(),
  });
  let state: EncounterState = store.revisions(sessionId)[0]!.encounterState;
  const step = (command: (current: EncounterState) => EncounterCommand): void => {
    const next = command(state);
    const reduction = reduceEncounter(state, next, rng);
    journal.record({ transition: { kind: 'reducer_applied', command: next, events: reduction.events }, encounterState: reduction.state, coordinatorState, controllers: [] });
    state = reduction.state;
  };
  const active = (current: EncounterState): CombatantId => {
    if (current.activeCombatant === null) throw new Error('Expected an active combatant.');
    return current.activeCombatant;
  };
  step(() => ({ type: 'roll_initiative' }));
  step((current) => ({ type: 'dodge', actor: active(current) }));
  step((current) => ({ type: 'end_turn', actor: active(current) }));
  return store.revisions(sessionId);
}

/** A v13 revision-bundle save of `revisions`, fingerprinted as the loader reads it. */
function revisionBundle(revisions: readonly unknown[]): string {
  const first = revisions[0] as { readonly sessionId: string };
  const body = { format: 'vtt-session-revisions', schemaVersion: 13, sessionId: first.sessionId, revisions };
  return canonicalJson({ ...body, fingerprint: sha256(canonicalJson(body)) });
}

function thrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

function migratedArchive(bytes: string): SessionHistoryArchive {
  const store = new MemoryBrowserSessionStore();
  const root = store.revisions(importSavedSession(store, bytes))[0];
  if (root?.transition.kind !== 'session_migrated') throw new Error('Expected a migrated root.');
  return root.transition.archive;
}

describe('FOOTPRINT fix1: an archive replays offline at the commit it was recorded under', () => {
  it('a save recorded at the current commit: its archive names that commit, and every turn replays there', async () => {
    const commit = head();
    const revisions = recordedAt(commit);
    expect(revisions.map((revision) => revision.recordedBy)).toEqual(Array(4).fill({ kind: 'engine_commit', commit }));
    // The save as the app exports it (a journal DAG).
    const exporter = new MemoryBrowserSessionStore();
    exporter.appendAll(revisions);
    const text = exportSavedSession(exporter, revisions[0]!.sessionId);
    const archive = sessionHistoryArchiveOf({ kind: 'saved_session', text });
    expect(archive.recordedEngine).toEqual({ kind: 'engine_commit', commit });
    expect(archive.recordedSchemaVersions).toEqual([13]);
    const report = await replaySessionArchive(archive);
    expect(report).toEqual({
      kind: 'replayed', commit, basis: 'recorded', verdict: 'pass', load: { kind: 'loaded' },
      turns: [
        { revision: 1, transition: 'session_started', status: 'pass' },
        { revision: 2, transition: 'reducer_applied', status: 'pass' },
        { revision: 3, transition: 'reducer_applied', status: 'pass' },
        { revision: 4, transition: 'reducer_applied', status: 'pass' },
      ],
    });
    expect(exitCodeOf(report)).toBe(0);
  });

  it('the same save tampered at turn 3 with every hash recomputed: the hash chain passes, the replay fails that turn', async () => {
    const commit = head();
    const tampered = recordedAt(commit).map((revision) => {
      if (revision.revision !== 3 || revision.transition.kind !== 'reducer_applied') return revision;
      // The Dodge's recorded events, each written twice: the revision checksum and the save's fingerprint are
      // recomputed, and the encounter state (what the branch fingerprint covers) is untouched.
      const { checksum: _checksum, ...body } = structuredClone(revision);
      const edited = { ...body, transition: { ...revision.transition, events: [...revision.transition.events, ...revision.transition.events] } };
      return { ...edited, checksum: sha256(canonicalJson(edited)) };
    });
    const text = revisionBundle(tampered);
    // The app loads it: every hash the save carries is consistent.
    const loaded = new MemoryBrowserSessionStore();
    expect(loaded.revisions(importSavedSession(loaded, text))).toHaveLength(4);
    const archive = sessionHistoryArchiveOf({ kind: 'saved_session', text });
    expect(decodeSessionHistoryArchiveDocument(sessionHistoryArchiveDocument(archive))).toEqual(archive);
    const report = await replaySessionArchive(archive);
    if (report.kind !== 'replayed') throw new Error(`Expected a replay, got ${report.kind}.`);
    expect(report).toMatchObject({ commit, basis: 'recorded', verdict: 'fail', load: { kind: 'loaded' } });
    expect(report.turns.map((turn) => [turn.revision, turn.status])).toEqual([[1, 'pass'], [2, 'pass'], [3, 'fail'], [4, 'not_checked']]);
    const failed = report.turns[2];
    expect(failed?.status === 'fail' ? failed.error : '').toContain('reducer events');
    expect(exitCodeOf(report)).toBe(1);
  });

  it('a history recorded before engine recording (v12): recorded commit unknown, typed, and nothing is replayed', async () => {
    const archive = migratedArchive(inputs.fixtures.readText(OVERHANG));
    expect(archive.recordedEngine).toEqual({ kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording' });
    const unknown = { kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording', recordedSchemaVersions: [12] };
    expect(await replaySessionArchive(archive)).toEqual(unknown);
    // The same through the file entry, from the migrated save the app exports (the in-app check runs first).
    const store = new MemoryBrowserSessionStore();
    const sessionId = importSavedSession(store, inputs.fixtures.readText(OVERHANG));
    const report = await replaySessionArchiveFile(exportSavedSession(store, sessionId));
    expect(report).toEqual(unknown);
    expect(exitCodeOf(report)).toBe(3);
  });

  it('an operator-assumed commit: the v12 histories replay at the base commit that produced them (provenance.json)', async () => {
    const provenance = JSON.parse(inputs.fixtures.readText(PROVENANCE)) as { readonly baseCommit: string };
    const base = engineCommit(provenance.baseCommit);
    const saved = await replaySessionArchive(migratedArchive(inputs.fixtures.readText(OVERHANG)), { assumeCommit: base });
    expect(saved).toEqual({
      kind: 'replayed', commit: base, basis: 'operator_assumed', verdict: 'pass', load: { kind: 'loaded' },
      turns: [{ revision: 1, transition: 'session_started', status: 'pass' }],
    });
    // The mixed v11 + v12 stored stream: the base's own stored-stream loader, then three turns.
    const stored = (JSON.parse(inputs.fixtures.readText(MIXED)) as unknown[]).map((revision) => canonicalJson(revision));
    const archive = sessionHistoryArchiveOf({ kind: 'stored_stream', texts: stored });
    expect(archive.recordedEngine).toEqual({ kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording' });
    const report = await replaySessionArchive(archive, { assumeCommit: base });
    expect(report).toMatchObject({ kind: 'replayed', basis: 'operator_assumed', verdict: 'pass' });
    expect(report.kind === 'replayed' ? report.turns.map((turn) => [turn.revision, turn.transition, turn.status]) : [])
      .toEqual([[1, 'session_started', 'pass'], [2, 'reducer_applied', 'pass'], [3, 'reducer_applied', 'pass']]);
  });

  it('an archive document whose text no longer matches its sha256 is refused by the in-app check before any replay', async () => {
    const archive = sessionHistoryArchiveOf({ kind: 'saved_session', text: inputs.fixtures.readText(OVERHANG) });
    const document = JSON.parse(sessionHistoryArchiveDocument(archive)) as { source: { save: { text: string } } };
    document.source.save.text = `${document.source.save.text} `;
    const report = await replaySessionArchiveFile(JSON.stringify(document));
    expect(report.kind).toBe('archive_refused');
    expect(report.kind === 'archive_refused' ? report.error : '').toContain('does not match its recorded sha256');
    expect(exitCodeOf(report)).toBe(1);
  });

  it('fix2: the recorded commit is derived from the archived revisions; metadata naming another is refused, typed', async () => {
    // codex r2 P1. A v12 history names no engine build, so its archive records no commit. The same archive with only
    // its metadata edited to name the base commit (every archived text and sha256 intact) was replayed at that commit
    // as 'recorded'. The recording is derived from the archived texts, and metadata that disagrees is refused.
    const base = engineCommit((JSON.parse(inputs.fixtures.readText(PROVENANCE)) as { readonly baseCommit: string }).baseCommit);
    const archive = migratedArchive(inputs.fixtures.readText(OVERHANG));
    const claimed = { recordedSchemaVersions: [12], recordedEngine: { kind: 'engine_commit', commit: base } } as const;
    const mismatch = {
      kind: 'archive_metadata_mismatch',
      claimed,
      derived: { recordedSchemaVersions: [12], recordedEngine: { kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording' } },
    };
    // (a) An archive document with its recordedEngine edited.
    const document = JSON.parse(sessionHistoryArchiveDocument(archive)) as Record<string, unknown>;
    document.recordedEngine = claimed.recordedEngine;
    const fromDocument = await replaySessionArchiveFile(JSON.stringify(document));
    expect(fromDocument).toEqual(mismatch);
    expect(exitCodeOf(fromDocument)).toBe(1);
    // (b) The same archive handed to the tool in memory: the tool re-reads it and never selects by the field.
    expect(await replaySessionArchive({ ...archive, recordedEngine: claimed.recordedEngine })).toEqual(mismatch);
    // (c) A migrated save whose root's archive metadata is edited, the root checksum and the save's fingerprint
    // recomputed: the app refuses to load it, so the tool does too.
    const store = new MemoryBrowserSessionStore();
    const [root] = store.revisions(importSavedSession(store, inputs.fixtures.readText(OVERHANG)));
    const transition = root?.transition;
    if (root === undefined || transition?.kind !== 'session_migrated') throw new Error('Expected a session_migrated root.');
    // The deliberate edit, checked against the revision's own shape: only the archive's recordedEngine differs.
    const { checksum: _checksum, ...unedited } = root;
    const body = {
      ...unedited,
      transition: { ...transition, archive: { ...transition.archive, recordedEngine: claimed.recordedEngine } },
    } satisfies Omit<SessionRevision, 'checksum'>;
    const edited = revisionBundle([{ ...body, checksum: sha256(canonicalJson(body)) }]);
    const refused = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), edited));
    expect(refused).toBeInstanceOf(SessionHistoryArchiveMetadataError);
    expect(refused).toMatchObject({ claimed: mismatch.claimed, derived: mismatch.derived });
    expect(await replaySessionArchiveFile(edited)).toEqual(mismatch);
  });

  it('fix2: every archived revision names its engine build inside its own checksum, and they must agree', async () => {
    // The recorded save's revision 2 re-attributed to the base commit. The archive's metadata keeps naming HEAD, the
    // one commit the save named before the edit.
    const commit = head();
    const base = engineCommit((JSON.parse(inputs.fixtures.readText(PROVENANCE)) as { readonly baseCommit: string }).baseCommit);
    const revisions = recordedAt(commit);
    const reattributed = (rehash: boolean): string => revisionBundle(revisions.map((revision) => {
      if (revision.revision !== 2) return revision;
      const { checksum, ...body } = structuredClone(revision);
      const moved = { ...body, recordedBy: { kind: 'engine_commit', commit: base } };
      return { ...moved, checksum: rehash ? sha256(canonicalJson(moved)) : checksum };
    }));
    const documentOf = (text: string, recordedEngine: unknown): string => canonicalJson({
      kind: 'vtt_session_history_archive',
      source: { kind: 'saved_session', save: { text, sha256: sha256(text) } },
      recordedSchemaVersions: [13],
      recordedEngine,
    });
    const claimed = { kind: 'engine_commit', commit };
    // (a) The recordedBy edited outside its checksum: the edit is not what revision 2 recorded, refused.
    const outside = await replaySessionArchiveFile(documentOf(reattributed(false), claimed));
    expect(outside.kind).toBe('archive_refused');
    expect(outside.kind === 'archive_refused' ? outside.error : '').toContain('Saved revision 2 checksum does not cover its recorded engine build');
    // (b) Inside its checksum: the revisions name two commits, so there is no one recorded commit; the metadata
    // naming HEAD disagrees and is refused.
    const several = { kind: 'recorded_commit_unknown', reason: 'recorded_by_several_commits' } as const;
    expect(await replaySessionArchiveFile(documentOf(reattributed(true), claimed))).toEqual({
      kind: 'archive_metadata_mismatch',
      claimed: { recordedSchemaVersions: [13], recordedEngine: claimed },
      derived: { recordedSchemaVersions: [13], recordedEngine: several },
    });
    // (c) Metadata that says so: typed unknown, nothing replayed.
    const unknown = await replaySessionArchiveFile(documentOf(reattributed(true), several));
    expect(unknown).toEqual({ kind: 'recorded_commit_unknown', reason: 'recorded_by_several_commits', recordedSchemaVersions: [13] });
    expect(exitCodeOf(unknown)).toBe(3);
  });

  it('fix2: the documented command runs under vite-node: the typed report on stdout, and its exit code', () => {
    // fix1's direct-run check compared this module's URL with argv[1], which under vite-node is vite-node's own path,
    // so the documented command printed nothing and exited 0. Spawned here as documented, outside the test runner's
    // environment, on the v12 archive document with its metadata edited to name the base commit.
    const base = engineCommit((JSON.parse(inputs.fixtures.readText(PROVENANCE)) as { readonly baseCommit: string }).baseCommit);
    const document = JSON.parse(sessionHistoryArchiveDocument(migratedArchive(inputs.fixtures.readText(OVERHANG)))) as Record<string, unknown>;
    document.recordedEngine = { kind: 'engine_commit', commit: base };
    const directory = mkdtempSync(join(tmpdir(), 'archive-replay-command-'));
    try {
      const path = join(directory, 'edited-archive.json');
      writeFileSync(path, JSON.stringify(document));
      const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('VITEST')));
      const run = spawnSync(process.execPath, ['node_modules/vite-node/vite-node.mjs', 'tools/session-archive-replay.ts', '--', '--archive', path], {
        encoding: 'utf8', env: environment,
      });
      expect(run.status, run.stderr).toBe(1);
      expect(run.stdout).not.toBe('');
      expect(JSON.parse(run.stdout)).toEqual({
        kind: 'archive_metadata_mismatch',
        claimed: { recordedSchemaVersions: [12], recordedEngine: { kind: 'engine_commit', commit: base } },
        derived: { recordedSchemaVersions: [12], recordedEngine: { kind: 'recorded_commit_unknown', reason: 'recorded_before_engine_recording' } },
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fix2: the command takes --archive once and --assume-commit at most once', () => {
    const base = engineCommit((JSON.parse(inputs.fixtures.readText(PROVENANCE)) as { readonly baseCommit: string }).baseCommit);
    expect(sessionArchiveReplayArguments(['--archive', 'a.json'])).toEqual({ path: 'a.json', options: {} });
    expect(sessionArchiveReplayArguments(['--assume-commit', base, '--archive', 'a.json'])).toEqual({ path: 'a.json', options: { assumeCommit: base } });
    const refused: readonly (readonly string[])[] = [
      [], ['a.json'], ['--archive'], ['--archive', 'a.json', '--archive', 'b.json'], ['--assume-commit', base],
      ['--archive', 'a.json', '--assume-commit', base, '--assume-commit', base], ['--archive', 'a.json', '--other', 'x'],
    ];
    for (const args of refused) {
      expect(() => sessionArchiveReplayArguments(args), args.join(' ')).toThrow('Usage: vite-node tools/session-archive-replay.ts -- --archive');
    }
  });

  it('the running build of a test run records no commit', () => {
    expect(RUNNING_ENGINE_BUILD).toEqual({ kind: 'unrecorded', reason: 'build_without_commit' });
  });
});
