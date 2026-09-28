import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  pendingPlacementLegalAnchors,
  PendingPlacementRuleError,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { OffGridBodyError } from '../../../src/combat/grid';
import { restoreMulberry32 } from '../../../src/combat/random';
import { V12CheckpointError } from '../../../src/combat/token-placement';
import { combatantId, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { DatabaseContext } from '../../../src/db/database';
import { IndexedDbBrowserSessionStore } from '../../../src/vtt/local-session-store';
import {
  EncounterSessionJournal,
  exportSavedSession,
  exportSessionHistoryArchive,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  migrateStoredSessionRevisions,
  SqliteBrowserSessionStore,
  replaySessionRevisions,
  SessionHistoryArchiveError,
  verifySessionHistoryArchive,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import { openTestDatabase } from '../../helpers/open-db';
import { declareTestInputs } from '../../helpers/test-inputs';

// FOOTPRINT session v13 (owner rulings D907 Q6 and D919). The inputs are v12 saves produced AT THE BASE COMMIT
// 0d3ef291 with the v12 engine (tests/fixtures/session-v12-footprint/provenance.json: generator sha, and each
// save's v12 import + replay PASS there). Every expectation about them is hand-derived here.
//
// D919: a v12 (or older) save that v13 cannot express has its CURRENT state repaired by the D514 rule; its old
// history is kept byte-for-byte as a read-only archive, verifiable on demand under the rules it was recorded
// under; new history starts at the repair point; no old turn is re-reduced under the new rules.

const DIR = 'tests/fixtures/session-v12-footprint';
const FILES = {
  overhangRevisions: `${DIR}/overhang.revisions.v12.json`,
  overhangDag: `${DIR}/overhang.dag.v12.json`,
  mixed: `${DIR}/mixed.stored-stream.v11-v12.json`,
  noAnchor: `${DIR}/no-anchor.dag.v12.json`,
  lrSqueezed: `${DIR}/lr-squeezed.dag.v12.json`,
  lrAmbiguous: `${DIR}/lr-ambiguous.dag.v12.json`,
  mismatch: `${DIR}/mismatch.stored-stream.v12.json`,
  provenance: `${DIR}/provenance.json`,
} as const;
const inputs = declareTestInputs({ fixtures: Object.values(FILES) });
const text = (key: keyof typeof FILES): string => inputs.fixtures.readText(FILES[key]);

const HUGE = combatantId('combatant:w21-huge');
const PC = combatantId('combatant:w21-pc');

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

function imported(bytes: string): { readonly store: MemoryBrowserSessionStore; readonly revisions: readonly SessionRevision[] } {
  const store = new MemoryBrowserSessionStore();
  const sessionId = accepted(() => importSavedSession(store, bytes));
  return { store, revisions: store.revisions(sessionId) };
}

function rootOf(revisions: readonly SessionRevision[]): SessionRevision & { readonly transition: Extract<SessionRevision['transition'], { readonly kind: 'session_migrated' }> } {
  const root = revisions[0];
  if (root?.transition.kind !== 'session_migrated') throw new Error(`Expected a session_migrated root, got ${String(root?.transition.kind)}.`);
  return root as never;
}

function tokenAt(state: EncounterState, id: CombatantId) {
  return state.tokens.find((token) => token.combatantId === id);
}

/** A stored stream fixture as its store holds it: each revision's text (the SQLite store writes canonical JSON). */
function storedTexts(key: 'mixed' | 'mismatch'): readonly string[] {
  return (JSON.parse(text(key)) as unknown[]).map((revision) => canonicalJson(revision));
}

/** `value` with every object's keys in reverse order: the same JSON value, other bytes. */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reversedKeys((value as Record<string, unknown>)[key])]));
}

/** A valid save in non-canonical bytes: keys reversed, two-space indentation, a trailing newline. */
function nonCanonical(bytes: string): string {
  return `${JSON.stringify(reversedKeys(JSON.parse(bytes)), null, 2)}\n`;
}

/** A v13 'vtt-session-revisions' save of `revisions`, fingerprinted as the loader reads it. */
function v13Save(revisions: readonly unknown[]): string {
  const first = revisions[0] as { readonly sessionId: string };
  const body = { format: 'vtt-session-revisions', schemaVersion: 13, sessionId: first.sessionId, revisions };
  return canonicalJson({ ...body, fingerprint: sha256(canonicalJson(body)) });
}

/** `revision` with its checksum recomputed after `edit` (a tamperer who recomputes what the format hashes). */
function rehashed(revision: unknown, edit: (body: Record<string, any>) => void): Record<string, unknown> {
  const { checksum: _checksum, ...body } = structuredClone(revision) as Record<string, any>;
  edit(body);
  return { ...body, checksum: sha256(canonicalJson(body)) };
}

function thrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('FOOTPRINT session v13: a save v13 cannot express is repaired and archived (D919)', () => {
  it('W21a: a v12 revision bundle with a Huge at (17,3) on 19 x 20 becomes one root with the Huge at (16,2)', () => {
    // Huge (3 x 3) at (17,3) covers columns 17-19; column 19 is off a 19-column grid. D514: the nearest anchor by
    // Chebyshev distance, then row-major. Distance 0 is (17,3) itself; distance 1 starts with row 2: (16,2) covers
    // columns 16-18, rows 2-4, all on the grid, no wall, clear of the PC at (0,0). So (16,2).
    const { revisions } = imported(text('overhangRevisions'));
    expect(revisions).toHaveLength(1);
    const root = rootOf(revisions);
    expect(root).toMatchObject({ schemaVersion: 13, revision: 1, parentRevision: null, activeHeadRevision: 1 });
    expect(tokenAt(root.encounterState, HUGE)).toMatchObject({ position: { column: 16, row: 2 }, placementMode: { kind: 'normal', actual: 'Huge' } });
    expect(tokenAt(root.encounterState, PC)).toMatchObject({ position: { column: 0, row: 0 } });
    expect(root.transition.placementRepair).toEqual([{
      kind: 'relocated', combatant: HUGE, from: { column: 17, row: 3 }, to: { column: 16, row: 2 },
      placementMode: { kind: 'normal', actual: 'Huge' },
    }]);
    expect(root.transition.archive).toMatchObject({ kind: 'vtt_session_history_archive', source: { kind: 'saved_session' }, recordedSchemaVersions: [12] });
    // Every field but the state is carried from the v12 head.
    const head = (JSON.parse(text('overhangRevisions')) as { revisions: Record<string, unknown>[] }).revisions.at(-1)!;
    for (const field of ['sessionId', 'branchId', 'rngState', 'coordinatorState', 'controllers', 'partyState', 'agentSession'] as const) {
      expect(canonicalJson(root[field]), field).toBe(canonicalJson(head[field]));
    }
    expect(replaySessionRevisions(revisions)).toBe(root);
  });

  it('W21b: the same save as a v12 journal DAG gives the same repaired root, archiving the DAG', () => {
    const fromDag = rootOf(imported(text('overhangDag')).revisions);
    const fromRevisions = rootOf(imported(text('overhangRevisions')).revisions);
    expect(canonicalJson(fromDag.encounterState)).toBe(canonicalJson(fromRevisions.encounterState));
    expect(fromDag.transition.placementRepair).toEqual(fromRevisions.transition.placementRepair);
    expect(fromDag.transition.archive.source.kind).toBe('saved_session');
    expect(fromDag.transition.archive.source.kind === 'saved_session' ? fromDag.transition.archive.source.save.text : null).toBe(text('overhangDag'));
    expect((JSON.parse(text('overhangDag')) as { format?: unknown }).format).toBe('vtt-session-journal-dag');
  });

  it('D919 archive bytes: the archive is the imported save byte for byte, and exports back to it', () => {
    for (const key of ['overhangRevisions', 'overhangDag'] as const) {
      const bytes = text(key);
      const root = rootOf(imported(bytes).revisions);
      expect(root.transition.archive.source, key).toEqual({ kind: 'saved_session', save: { text: bytes, sha256: sha256(bytes) } });
      expect(exportSessionHistoryArchive(root), key).toEqual([bytes]);
    }
  });

  it('D919 archive bytes, fix1: a valid save in non-canonical bytes is archived and exported as those bytes, not re-serialized', () => {
    // codex r1 P1. The same save with every key order reversed, indented, and a trailing newline: its checksums and
    // fingerprint are over canonical JSON, so it loads; the archive must hold these bytes, not canonical ones.
    for (const key of ['overhangRevisions', 'overhangDag'] as const) {
      const bytes = nonCanonical(text(key));
      expect(bytes, key).not.toBe(text(key));
      expect(canonicalJson(JSON.parse(bytes)), key).toBe(text(key));
      const root = rootOf(imported(bytes).revisions);
      expect(root.transition.archive.source, key).toEqual({ kind: 'saved_session', save: { text: bytes, sha256: sha256(bytes) } });
      expect(exportSessionHistoryArchive(root), key).toEqual([bytes]);
      expect(verifySessionHistoryArchive(root).recordedSchemaVersions, key).toEqual([12]);
      // Only the archive differs from the canonical import: the repaired state is the same.
      expect(canonicalJson(root.encounterState), key).toBe(canonicalJson(rootOf(imported(text(key)).revisions).encounterState));
    }
    // A stored stream's revisions, each stored in non-canonical text: the archive keeps each text exactly.
    const stored = storedTexts('mixed').map(nonCanonical);
    const root = rootOf(accepted(() => migrateStoredSessionRevisions(stored)));
    expect(root.transition.archive.source).toEqual({
      kind: 'stored_stream', revisions: stored.map((revision) => ({ text: revision, sha256: sha256(revision) })),
    });
    expect(exportSessionHistoryArchive(root)).toEqual(stored);
  });

  it('D919 verification: the archive verifies under its recorded rules, and those bytes replayed under v12 at the base', () => {
    const provenance = JSON.parse(text('provenance')) as { baseCommit: string; files: Record<string, string>; pass: string[] };
    expect(provenance.baseCommit).toBe('0d3ef2916e7fc4cd44eb7aca295850a3cd03ca6e');
    for (const [key, name] of [['overhangRevisions', 'overhang.revisions.v12.json'], ['overhangDag', 'overhang.dag.v12.json']] as const) {
      const root = rootOf(imported(text(key)).revisions);
      const verified = verifySessionHistoryArchive(root).source;
      expect(verified.kind === 'saved_session' ? verified.save.sha256 : null, key).toBe(provenance.files[name]);
      expect(provenance.pass, key).toContain(`${name}: v12 import + replay PASS (revisions 1, head 1)`);
    }
  });

  it('D919 continued play: new history starts at the repair point, and export -> import is byte-stable', () => {
    const { store, revisions } = imported(text('overhangRevisions'));
    const root = rootOf(revisions);
    const resumed = EncounterSessionJournal.resume(root.sessionId, store, new MemoryMirrorSink());
    const rng = restoreMulberry32(root.rngState);
    // The PC (initiative first) steps from (0,0) to (1,0).
    const reduction = reduceEncounter(resumed.encounterState, { type: 'move', actor: PC, path: [{ column: 1, row: 0 }], cause: 'voluntary' }, rng);
    resumed.journal.record({
      transition: { kind: 'reducer_applied', command: { type: 'move', actor: PC, path: [{ column: 1, row: 0 }], cause: 'voluntary' }, events: reduction.events },
      encounterState: reduction.state,
      coordinatorState: resumed.coordinatorState,
      controllers: resumed.controllers,
    });
    const played = store.revisions(root.sessionId);
    expect(played.map((revision) => [revision.revision, revision.transition.kind])).toEqual([[1, 'session_migrated'], [2, 'reducer_applied']]);
    expect(tokenAt(played[1]!.encounterState, PC)?.position).toEqual({ column: 1, row: 0 });
    expect(tokenAt(played[1]!.encounterState, HUGE)?.position).toEqual({ column: 16, row: 2 });
    const exported = exportSavedSession(store, root.sessionId);
    const again = imported(exported);
    expect(again.revisions).toHaveLength(2);
    expect(exportSavedSession(again.store, root.sessionId)).toBe(exported);
    expect(exportSessionHistoryArchive(rootOf(again.revisions))).toEqual([text('overhangRevisions')]);
  });

  it('D919 tampering: an edited archive is refused on load, and a recomputed one on demand', () => {
    const root = rootOf(imported(text('overhangRevisions')).revisions);
    // The archived save with revision 1's round set to 7, re-serialized as the fixture is (canonical JSON).
    const editedSave = (() => {
      const save = JSON.parse(text('overhangRevisions')) as { revisions: Array<{ encounterState: { round: number } }> };
      save.revisions[0]!.encounterState.round = 7;
      return canonicalJson(save);
    })();
    // (a) The archived text edited, its sha left as recorded: the load refuses it.
    const sourceEdited = rehashed(root, (body) => { body.transition.archive.source.save.text = editedSave; });
    const onLoad = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), v13Save([sourceEdited])));
    expect(onLoad).toBeInstanceOf(SessionHistoryArchiveError);
    expect(String(onLoad)).toContain('does not match its recorded sha256');
    // (b) The same edit with the archive sha, the root checksum and the fingerprint recomputed: the archived v12
    // revision no longer matches its own v12 checksum, so on-demand verification refuses it.
    const recomputed = rehashed(root, (body) => {
      body.transition.archive.source.save = { text: editedSave, sha256: sha256(editedSave) };
    });
    const loaded = rootOf(imported(v13Save([recomputed])).revisions);
    const refused = thrown(() => verifySessionHistoryArchive(loaded));
    expect(refused).toBeInstanceOf(SessionHistoryArchiveError);
    expect(String(refused)).toContain('checksum mismatch');
    // (c) The archive intact, the recorded repair edited (to (15,2)) with the checksums recomputed: it loads, and
    // the root no longer follows from its archive.
    const recordEdited = rehashed(root, (body) => { body.transition.placementRepair[0].to = { column: 15, row: 2 }; });
    const recordLoaded = rootOf(imported(v13Save([recordEdited])).revisions);
    const unbound = thrown(() => verifySessionHistoryArchive(recordLoaded));
    expect(unbound).toBeInstanceOf(SessionHistoryArchiveError);
    expect(String(unbound)).toContain('does not follow from its archived history');
    // (d) The repaired state edited (the Huge at (15,2)): its branch fingerprint no longer matches, refused at load.
    const stateEdited = rehashed(root, (body) => { body.encounterState.tokens[0].position = { column: 15, row: 2 }; });
    expect(String(thrown(() => importSavedSession(new MemoryBrowserSessionStore(), v13Save([stateEdited])))))
      .toContain('fingerprint mismatch');
  });

  it('D919 mixed versions: a stored v11 + v12 stream is one save, one archive of every stored revision', () => {
    // Revision 1 (session_started, the overhang) was recorded under v11, revisions 2 (initiative) and 3 (the PC to
    // (1,0)) under v12. The current state is revision 3's: the Huge still at (17,3) -> (16,2), the PC at (1,0).
    const stream = JSON.parse(text('mixed')) as unknown[];
    const migrated = accepted(() => migrateStoredSessionRevisions(storedTexts('mixed')));
    expect(migrated).toHaveLength(1);
    const root = rootOf(migrated);
    expect(root.transition.archive).toMatchObject({ source: { kind: 'stored_stream' }, recordedSchemaVersions: [11, 12] });
    expect(exportSessionHistoryArchive(root)).toEqual(storedTexts('mixed'));
    expect(tokenAt(root.encounterState, combatantId('combatant:w21-mixed-huge'))?.position).toEqual({ column: 16, row: 2 });
    expect(tokenAt(root.encounterState, combatantId('combatant:w21-mixed-pc'))?.position).toEqual({ column: 1, row: 0 });
    expect(root.encounterState.round).toBe((stream[2] as { encounterState: { round: number } }).encounterState.round);
    expect(verifySessionHistoryArchive(root).recordedSchemaVersions).toEqual([11, 12]);
  });

  it('W21c: the local store rewrites a stored v12 stream to its archived root and drops the stale revisions', async () => {
    const indexedDb = new IDBFactory();
    const first = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorageLike(), { databaseName: 'footprint-w21c' });
    first.close();
    const stream = JSON.parse(text('mixed')) as { sessionId: string; revision: number }[];
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb.open('footprint-w21c');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const write = database.transaction('revisions', 'readwrite');
    for (const revision of stream) {
      write.objectStore('revisions').put(revision, `${revision.sessionId}\u0000${String(revision.revision).padStart(12, '0')}`);
    }
    await new Promise<void>((resolve, reject) => { write.oncomplete = () => resolve(); write.onerror = () => reject(write.error); });
    database.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorageLike(), { databaseName: 'footprint-w21c' });
    const sessionId = encounterSessionId('session:footprint-mixed');
    expect(reopened.revisions(sessionId).map((revision) => revision.transition.kind)).toEqual(['session_migrated']);
    reopened.close();
    const check = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb.open('footprint-w21c');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = check.transaction('revisions', 'readonly');
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = read.objectStore('revisions').getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    check.close();
    expect(keys).toEqual([`session:footprint-mixed\u0000${'1'.padStart(12, '0')}`]);
  });

  it('W21c (SQLite): the SQLite store rewrites stored v11 + v12 rows to the archived root row', async () => {
    const connection = await openTestDatabase();
    try {
      const database = new DatabaseContext(connection);
      const stream = JSON.parse(text('mixed')) as { sessionId: string; revision: number; schemaVersion: number; checksum: string }[];
      for (const revision of stream) {
        database.exec(
          `INSERT INTO vtt_session_revisions (session_id, revision, schema_version, payload_json, payload_checksum)
           VALUES ($sessionId, $revision, $schemaVersion, $payload, $checksum)`,
          { $sessionId: revision.sessionId, $revision: revision.revision, $schemaVersion: revision.schemaVersion, $payload: canonicalJson(revision), $checksum: revision.checksum },
        );
      }
      const store = new SqliteBrowserSessionStore(database);
      const sessionId = encounterSessionId('session:footprint-mixed');
      expect(accepted(() => store.revisions(sessionId)).map((revision) => revision.transition.kind)).toEqual(['session_migrated']);
      expect(database.allRaw('SELECT revision, schema_version FROM vtt_session_revisions ORDER BY revision'))
        .toEqual([{ revision: 1, schema_version: 13 }]);
      expect(store.revisions(sessionId)).toHaveLength(1);
    } finally {
      connection.close();
    }
  });

  it('W21e: a Huge with no whole-body anchor anywhere goes to the DM at its fixed size', () => {
    // 5 x 3 with walls filling column 2; every 3 x 3 square of a 5 x 3 grid covers column 2. The Huge was at (3,0).
    const root = rootOf(imported(text('noAnchor')).revisions);
    const huge = combatantId('combatant:w21-trapped-huge');
    expect(tokenAt(root.encounterState, huge)).toBeUndefined();
    expect(root.encounterState.adjudicationPending).toEqual([{
      kind: 'whole_body_placement_pending', combatant: huge, reason: 'no_whole_body_anchor',
      formerAnchor: { column: 3, row: 0 }, size: 'Huge', candidateModes: [],
      originatingToken: { id: 'token:w21-trapped-huge', combatantId: huge, position: { column: 3, row: 0 } },
    }]);
    expect(root.encounterState.phase).toMatchObject({ kind: 'awaiting_placement', combatantId: huge, reason: 'whole_body_placement_pending' });
    expect(root.transition.placementRepair).toEqual([{
      kind: 'pending', combatant: huge, reason: 'no_whole_body_anchor', from: { column: 3, row: 0 }, size: 'Huge',
    }]);
    expect(pendingPlacementLegalAnchors(root.encounterState, 'Huge')).toEqual([]);
    const otherSize = thrown(() => reduceEncounter(root.encounterState, {
      type: 'resolve_pending_placement', combatant: huge, reason: 'whole_body_placement_pending', size: 'Large', anchor: { column: 3, row: 0 },
    }, () => 0.5));
    expect(otherSize instanceof PendingPlacementRuleError && otherSize.code === 'size_not_allowed', String(otherSize)).toBe(true);
    // W9 (pending placement): at its own size, the former anchor (3,0) is refused with the typed outside_bounds code.
    const edge = thrown(() => reduceEncounter(root.encounterState, {
      type: 'resolve_pending_placement', combatant: huge, reason: 'whole_body_placement_pending', size: 'Huge', anchor: { column: 3, row: 0 },
    }, () => 0.5));
    expect(edge instanceof PendingPlacementRuleError && edge.code === 'outside_bounds', String(edge)).toBe(true);
  });

  it('W21f-sq: a pending v12 checkpoint whose geometry allows one mode is recorded squeezed, and the spend restores it', () => {
    // The W13b map: at (2,1) a normal Large would cover the walls (2,2) and (3,2); a squeezed Large controls the
    // Medium square (2,1), inside the Medium opening {(2,1), (3,1)}. One candidate: squeezed.
    const root = rootOf(imported(text('lrSqueezed')).revisions);
    const large = combatantId('combatant:lr-squeezed-large');
    const squeezed = { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' } as const;
    const decision = root.encounterState.pendingDecisions.find((candidate) => candidate.kind === 'legendary_resistance');
    expect(decision?.kind === 'legendary_resistance' ? decision.checkpoint.tokenPlacement : null)
      .toEqual({ kind: 'recorded', anchor: { column: 2, row: 1 }, placementMode: squeezed });
    expect(root.transition.placementRepair).toEqual([{
      kind: 'checkpoint_recorded', combatant: large, decisionId: decision?.id, anchor: { column: 2, row: 1 }, placementMode: squeezed,
    }]);
    expect(tokenAt(root.encounterState, large)).toMatchObject({ position: { column: 2, row: 1 }, placementMode: { kind: 'normal', actual: 'Medium' } });
    const spent = accepted(() => reduceEncounter(root.encounterState, { type: 'resolve_pending_decision', decisionId: decision?.id ?? '', optionId: 'spend' }, () => 0.5).state);
    expect(tokenAt(spent, large)).toMatchObject({ position: { column: 2, row: 1 }, placementMode: squeezed });
  });

  it('W21f-unres: a pending v12 checkpoint whose geometry allows both modes is not guessed; the spend hands it to the DM', () => {
    // 6 x 4 open map, a Medium opening {(2,1)}: a normal Large at (2,1) covers (2,1) (3,1) (2,2) (3,2), all open; a
    // squeezed Large controls (2,1), inside the opening. Two candidates: unknown_v12.
    const root = rootOf(imported(text('lrAmbiguous')).revisions);
    const large = combatantId('combatant:lr-ambiguous-large');
    const candidates = [{ kind: 'normal', actual: 'Large' }, { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' }];
    const decision = root.encounterState.pendingDecisions.find((candidate) => candidate.kind === 'legendary_resistance');
    expect(decision?.kind === 'legendary_resistance' ? decision.checkpoint.tokenPlacement : null)
      .toEqual({ kind: 'unknown_v12', anchor: { column: 2, row: 1 }, size: 'Large', candidateModes: candidates });
    const spent = accepted(() => reduceEncounter(root.encounterState, { type: 'resolve_pending_decision', decisionId: decision?.id ?? '', optionId: 'spend' }, () => 0.5).state);
    expect(tokenAt(spent, large)).toBeUndefined();
    expect(spent.adjudicationPending).toEqual([{
      kind: 'whole_body_placement_pending', combatant: large, reason: 'placement_mode_unknown',
      formerAnchor: { column: 2, row: 1 }, size: 'Large', candidateModes: candidates,
      originatingToken: { id: 'token:lr-ambiguous-large', combatantId: large, position: { column: 2, row: 1 } },
    }]);
    expect(spent.phase).toMatchObject({ kind: 'awaiting_placement', combatantId: large, reason: 'whole_body_placement_pending' });
    expect(spent.combatants.find((entry) => entry.profile.id === large)?.profile.rules.sizeCategory).toBe('Large');
  });

  it('W21f-mismatch: a v12 mode of another size is re-moded from geometry (the v12 spend could never save one)', () => {
    // The W13b map with the Large held {normal, Medium} at (2,1): as for W21f-sq, only squeezed fits at (2,1).
    const root = rootOf(accepted(() => migrateStoredSessionRevisions(storedTexts('mismatch'))));
    const large = combatantId('combatant:mismatch-large');
    const squeezed = { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' } as const;
    expect(tokenAt(root.encounterState, large)).toMatchObject({ position: { column: 2, row: 1 }, placementMode: squeezed });
    expect(root.transition.placementRepair).toEqual([{
      kind: 're_moded', combatant: large, anchor: { column: 2, row: 1 }, from: { kind: 'normal', actual: 'Medium' }, to: squeezed,
    }]);
  });

  it('W21g: a v13 save with a planted overhang or a v12-shape checkpoint is refused, never silently repaired', () => {
    const root = rootOf(imported(text('overhangRevisions')).revisions);
    const planted = rehashed(root, (body) => { body.encounterState.tokens[0].position = { column: 17, row: 3 }; });
    const overhang = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), v13Save([planted])));
    expect(overhang instanceof OffGridBodyError && overhang.label === 'Persisted encounter tokens[0]', String(overhang)).toBe(true);
    const lr = rootOf(imported(text('lrSqueezed')).revisions);
    const v12Checkpoint = rehashed(lr, (body) => {
      const decision = body.encounterState.pendingDecisions[0];
      const { tokenPlacement, ...rest } = decision.checkpoint;
      decision.checkpoint = { ...rest, tokenPosition: tokenPlacement.anchor };
    });
    const refused = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), v13Save([v12Checkpoint])));
    expect(refused).toBeInstanceOf(V12CheckpointError);
  });
});

/** A minimal Storage for the IndexedDB store's legacy-autosave scan (none here). */
class MemoryStorageLike implements Storage {
  readonly #values = new Map<string, string>();
  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void { this.#values.delete(key); }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}
