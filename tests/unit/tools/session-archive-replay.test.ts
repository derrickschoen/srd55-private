import { spawnSync } from 'node:child_process';
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
  sessionHistoryArchiveDocument,
  sessionHistoryArchiveOf,
  type SessionHistoryArchive,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import {
  exitCodeOf,
  replaySessionArchive,
  replaySessionArchiveFile,
} from '../../../tools/session-archive-replay';
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

  it('the running build of a test run records no commit', () => {
    expect(RUNNING_ENGINE_BUILD).toEqual({ kind: 'unrecorded', reason: 'build_without_commit' });
  });
});
