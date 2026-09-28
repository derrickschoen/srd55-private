import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { EncounterState } from '../../../src/combat/encounter';
import { combatantId, type CombatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { IndexedDbBrowserSessionStore, RestorePointUnavailableError } from '../../../src/vtt/local-session-store';
import {
  importSavedSession,
  MemoryBrowserSessionStore,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import { declareTestInputs } from '../../helpers/test-inputs';

// FOOTPRINT fix1 (codex r1 P1, owner D919). A stored stream v13 cannot express migrates to ONE archived root, so the
// autosaves the v12 app took before its last revision would point past the new stream. They are re-pointed: a point
// before the old head becomes an ARCHIVED point (the first k stored revisions the root archived, bound to the sha256
// of revision k's stored text), and restoring or exporting it gives that prefix migrated as a save of its own; the
// point at the head is the migrated root. Every point is bound to its revision, so a point whose history a restore
// discarded is refused (RestorePointUnavailableError), never resolved to another state at the same position.
//
// Inputs are v12 saves produced at the base commit 0d3ef291 by the v12 engine (tests/fixtures/session-v12-footprint,
// provenance.json). Every expectation about them is hand-derived here from the fixture revisions.

const DIR = 'tests/fixtures/session-v12-footprint';
const MIXED = `${DIR}/mixed.stored-stream.v11-v12.json`;
const LR_SQUEEZED = `${DIR}/lr-squeezed.revisions.v12.json`;
const inputs = declareTestInputs({ fixtures: [MIXED, LR_SQUEEZED] });

type StoredRevision = { readonly sessionId: string; readonly revision: number; readonly schemaVersion: number; readonly encounterState: { readonly round: number; readonly tokens: readonly { readonly combatantId: string; readonly position: object }[] }; readonly rngState: { readonly initialSeed: number } };

/** The fixture's revisions as the v12 app stored them. */
function storedRevisions(path: typeof MIXED | typeof LR_SQUEEZED): readonly StoredRevision[] {
  const parsed = JSON.parse(inputs.fixtures.readText(path)) as StoredRevision[] | { revisions: StoredRevision[] };
  return Array.isArray(parsed) ? parsed : parsed.revisions;
}

/** `value` with every object's keys in reverse order: the same JSON value, other bytes. */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reversedKeys((value as Record<string, unknown>)[key])]));
}

async function gzip(text: string): Promise<ArrayBuffer> {
  return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

interface V12Autosave {
  readonly storageId: string;
  readonly revisionCount: number;
  readonly trigger: 'encounter_start' | 'round_boundary';
  readonly retention: { readonly kind: 'named' } | { readonly kind: 'autosave'; readonly pool: 'per_round' | 'encounter_boundary' };
  readonly restorePoint?: unknown;
}

/**
 * A browser database as the v12 app left it: the stream's revisions (gzip of each stored text, keyed as the store
 * keys them), the session's metadata, and autosave records in the v12 shape (no restore point field).
 */
async function v12Database(
  name: string,
  revisions: readonly StoredRevision[],
  texts: readonly string[],
  autosaves: readonly V12Autosave[],
): Promise<IDBFactory> {
  const indexedDb = new IDBFactory();
  (await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorageLike(), { databaseName: name })).close();
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const encoded = await Promise.all(texts.map(gzip));
  const write = database.transaction(['revisions', 'sessions', 'snapshots'], 'readwrite');
  const sessionId = revisions[0]!.sessionId;
  revisions.forEach((revision, index) => {
    write.objectStore('revisions').put(encoded[index], `${sessionId}\u0000${String(revision.revision).padStart(12, '0')}`);
  });
  write.objectStore('sessions').put({
    sessionId, name: 'v12 campaign', updatedAt: '2026-09-20T10:00:00.000Z', retention: { kind: 'named' }, migrationStatus: 'native',
  }, sessionId);
  for (const autosave of autosaves) {
    const at = revisions[autosave.revisionCount - 1]!;
    const pool = autosave.retention.kind === 'autosave' ? autosave.retention.pool : 'per_round';
    write.objectStore('snapshots').put({
      sessionId, fingerprint: `v12-export-fingerprint-${String(autosave.revisionCount)}`, revisionCount: autosave.revisionCount,
      room: null, round: at.encounterState.round, initialSeed: at.rngState.initialSeed,
      storageId: autosave.storageId, trigger: autosave.trigger, pool, name: autosave.storageId,
      updatedAt: `2026-09-20T10:0${String(autosave.revisionCount)}:00.000Z`, retention: autosave.retention,
      ...(autosave.restorePoint === undefined ? {} : { restorePoint: autosave.restorePoint }),
    }, autosave.storageId);
  }
  await done(write);
  database.close();
  return indexedDb;
}

function openStore(indexedDb: IDBFactory, name: string): Promise<IndexedDbBrowserSessionStore> {
  return IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorageLike(), { databaseName: name });
}

/** A save's revisions, imported into a fresh store. */
function revisionsOf(bytes: string): readonly SessionRevision[] {
  const store = new MemoryBrowserSessionStore();
  return store.revisions(importSavedSession(store, bytes));
}

function positionOf(state: EncounterState, id: CombatantId): unknown {
  return state.tokens.find((token) => token.combatantId === id)?.position;
}

function archivedTextsOf(root: SessionRevision | undefined): readonly string[] {
  if (root?.transition.kind !== 'session_migrated' || root.transition.archive.source.kind !== 'stored_stream') {
    throw new Error(`Expected a session_migrated root archiving a stored stream, got ${String(root?.transition.kind)}.`);
  }
  return root.transition.archive.source.revisions.map((revision) => revision.text);
}

function thrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

const HUGE = combatantId('combatant:w21-mixed-huge');
const PC = combatantId('combatant:w21-mixed-pc');

describe('FOOTPRINT fix1: autosave restore points survive a migration by archive', () => {
  it('mixed v11 + v12 stream: points before the head are archived, export and restore their own prefix; the head is the root', async () => {
    // Stored: r1 v11 session_started (the Huge at (17,3) past the 19-column grid, the PC at (0,0)), r2 v12
    // initiative, r3 v12 the PC to (1,0). Every prefix holds the overhang, so each migrates by archive, the Huge
    // repaired to (16,2) (D514, as W21a derives). Autosaves: S1 at r1, S2 at r2, S3 (named) at r3, the head.
    const revisions = storedRevisions(MIXED);
    const texts = revisions.map((revision) => canonicalJson(revision));
    const sessionId = revisions[0]!.sessionId as SessionRevision['sessionId'];
    const S1 = 'encounter_boundary:session:footprint-mixed:000000000001:encounter_start';
    const S2 = 'per_round:session:footprint-mixed:000000000002:round_boundary';
    const S3 = 'per_round:session:footprint-mixed:000000000003:round_boundary';
    const name = 'footprint-restore-mixed';
    const indexedDb = await v12Database(name, revisions, texts, [
      { storageId: S1, revisionCount: 1, trigger: 'encounter_start', retention: { kind: 'autosave', pool: 'encounter_boundary' } },
      { storageId: S2, revisionCount: 2, trigger: 'round_boundary', retention: { kind: 'autosave', pool: 'per_round' } },
      { storageId: S3, revisionCount: 3, trigger: 'round_boundary', retention: { kind: 'named' } },
    ]);
    const store = await openStore(indexedDb, name);
    expect(store.revisions(sessionId).map((revision) => revision.transition.kind)).toEqual(['session_migrated']);

    // S3, the head: the migrated root itself, a one-revision live point.
    expect(store.exportedStored(S3, sessionId)).toBe(store.exported(sessionId));
    expect(store.savedSessions().find((save) => save.storageId === S3)?.revisionCount).toBe(1);

    // S2: its own save, the first two stored texts archived, the state of r2 repaired: the PC still at (0,0).
    const s2 = revisionsOf(store.exportedStored(S2, sessionId));
    expect(s2).toHaveLength(1);
    expect(archivedTextsOf(s2[0])).toEqual(texts.slice(0, 2));
    expect(positionOf(s2[0]!.encounterState, HUGE)).toEqual({ column: 16, row: 2 });
    expect(positionOf(s2[0]!.encounterState, PC)).toEqual({ column: 0, row: 0 });
    expect(s2[0]!.encounterState.round).toBe(revisions[1]!.encounterState.round);
    // S1: the first stored text archived, recorded under v11 alone.
    const s1 = revisionsOf(store.exportedStored(S1, sessionId));
    expect(archivedTextsOf(s1[0])).toEqual(texts.slice(0, 1));
    expect(s1[0]?.transition.kind === 'session_migrated' ? s1[0].transition.archive.recordedSchemaVersions : null).toEqual([11]);
    expect(s1[0]!.encounterState.round).toBe(revisions[0]!.encounterState.round);

    // Restoring S2: the live stream is S2's own migrated stream.
    await store.restoreStored(S2, sessionId);
    const live = store.revisions(sessionId);
    expect(live.map((revision) => revision.transition.kind)).toEqual(['session_migrated']);
    expect(archivedTextsOf(live[0])).toEqual(texts.slice(0, 2));
    expect(positionOf(live[0]!.encounterState, PC)).toEqual({ column: 0, row: 0 });
    expect(store.exportedStored(S2, sessionId)).toBe(store.exported(sessionId));
    // S1 still resolves against the new root's archive; S3 pointed into the replaced stream and is refused.
    expect(archivedTextsOf(revisionsOf(store.exportedStored(S1, sessionId))[0])).toEqual(texts.slice(0, 1));
    const s3 = thrown(() => store.exportedStored(S3, sessionId));
    expect(s3).toBeInstanceOf(RestorePointUnavailableError);
    await expect(store.restoreStored(S3, sessionId)).rejects.toBeInstanceOf(RestorePointUnavailableError);
    store.close();

    // The re-pointed records are durable.
    const reopened = await openStore(indexedDb, name);
    expect(reopened.exportedStored(S2, sessionId)).toBe(reopened.exported(sessionId));
    expect(archivedTextsOf(revisionsOf(reopened.exportedStored(S1, sessionId))[0])).toEqual(texts.slice(0, 1));
    reopened.close();
  });

  it('a stream whose prefix v13 can express: restoring that point gives the bumped live revisions, and earlier points turn live', async () => {
    // lr-squeezed (W21f-sq): r1 session_started and r2 initiative place whole bodies; r3 holds a pending v12
    // legendary-resistance checkpoint, which v13 cannot express, so the stream migrates by archive. The prefix of
    // two migrates by the version bump: two live v13 revisions, the states unchanged.
    const revisions = storedRevisions(LR_SQUEEZED);
    const texts = revisions.map((revision) => canonicalJson(revision));
    const sessionId = revisions[0]!.sessionId as SessionRevision['sessionId'];
    const S1 = `encounter_boundary:${sessionId}:000000000001:encounter_start`;
    const S2 = `per_round:${sessionId}:000000000002:round_boundary`;
    const S3 = `per_round:${sessionId}:000000000003:round_boundary`;
    const name = 'footprint-restore-bump';
    const indexedDb = await v12Database(name, revisions, texts, [
      { storageId: S1, revisionCount: 1, trigger: 'encounter_start', retention: { kind: 'autosave', pool: 'encounter_boundary' } },
      { storageId: S2, revisionCount: 2, trigger: 'round_boundary', retention: { kind: 'autosave', pool: 'per_round' } },
      { storageId: S3, revisionCount: 3, trigger: 'round_boundary', retention: { kind: 'named' } },
    ]);
    const store = await openStore(indexedDb, name);
    expect(store.revisions(sessionId).map((revision) => revision.transition.kind)).toEqual(['session_migrated']);

    const s2 = revisionsOf(store.exportedStored(S2, sessionId));
    expect(s2.map((revision) => [revision.schemaVersion, revision.transition.kind])).toEqual([[13, 'session_started'], [13, 'reducer_applied']]);
    expect(canonicalJson(s2[1]!.encounterState)).toBe(canonicalJson(revisions[1]!.encounterState));

    await store.restoreStored(S2, sessionId);
    const live = store.revisions(sessionId);
    expect(live.map((revision) => revision.transition.kind)).toEqual(['session_started', 'reducer_applied']);
    expect(canonicalJson(live[1]!.encounterState)).toBe(canonicalJson(revisions[1]!.encounterState));
    // S1 and S2 are live prefixes of the restored stream now; S3's history was discarded.
    expect(revisionsOf(store.exportedStored(S1, sessionId)).map((revision) => revision.checksum)).toEqual([live[0]!.checksum]);
    expect(store.exportedStored(S2, sessionId)).toBe(store.exported(sessionId));
    expect(thrown(() => store.exportedStored(S3, sessionId))).toBeInstanceOf(RestorePointUnavailableError);
    store.close();

    const reopened = await openStore(indexedDb, name);
    expect(revisionsOf(reopened.exportedStored(S1, sessionId)).map((revision) => revision.checksum)).toEqual([live[0]!.checksum]);
    await reopened.restoreStored(S1, sessionId);
    expect(reopened.revisions(sessionId).map((revision) => revision.checksum)).toEqual([live[0]!.checksum]);
    reopened.close();
  });

  it('an archived point resolves only against the exact stored revision it was taken from', async () => {
    // The same mixed history stored in other bytes (every key order reversed): the archive holds those bytes, so a
    // point bound to the canonical text of r2 does not resolve against it, although revision 2 is there.
    const revisions = storedRevisions(MIXED);
    const texts = revisions.map((revision) => JSON.stringify(reversedKeys(revision)));
    const sessionId = revisions[0]!.sessionId as SessionRevision['sessionId'];
    const bound = 'per_round:session:footprint-mixed:000000000002:round_boundary';
    const name = 'footprint-restore-bound';
    const indexedDb = await v12Database(name, revisions, texts, [{
      storageId: bound, revisionCount: 2, trigger: 'round_boundary', retention: { kind: 'autosave', pool: 'per_round' },
      restorePoint: { kind: 'archived', archivedRevisionSha256: sha256(canonicalJson(revisions[1])) },
    }]);
    const store = await openStore(indexedDb, name);
    expect(archivedTextsOf(store.revisions(sessionId)[0])).toEqual(texts);
    expect(thrown(() => store.exportedStored(bound, sessionId))).toBeInstanceOf(RestorePointUnavailableError);
    store.close();
  });
});

/** A minimal Storage for the IndexedDB store's legacy scan (none here). */
class MemoryStorageLike implements Storage {
  readonly #values = new Map<string, string>();
  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void { this.#values.delete(key); }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}
