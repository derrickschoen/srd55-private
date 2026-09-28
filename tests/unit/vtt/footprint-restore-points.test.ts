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
  VTT_SESSION_MIGRATIONS,
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

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

/** An export of `storageId` that must succeed. */
function exportOf(store: IndexedDbBrowserSessionStore, storageId: string, sessionId: SessionRevision['sessionId']): string {
  return accepted(() => store.exportedStored(storageId, sessionId));
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
    expect(exportOf(store, S3, sessionId)).toBe(store.exported(sessionId));
    expect(store.savedSessions().find((save) => save.storageId === S3)?.revisionCount).toBe(1);

    // S2: its own save, the first two stored texts archived, the state of r2 repaired: the PC still at (0,0).
    const s2 = revisionsOf(exportOf(store, S2, sessionId));
    expect(s2).toHaveLength(1);
    expect(archivedTextsOf(s2[0])).toEqual(texts.slice(0, 2));
    expect(positionOf(s2[0]!.encounterState, HUGE)).toEqual({ column: 16, row: 2 });
    expect(positionOf(s2[0]!.encounterState, PC)).toEqual({ column: 0, row: 0 });
    expect(s2[0]!.encounterState.round).toBe(revisions[1]!.encounterState.round);
    // S1: the first stored text archived, recorded under v11 alone.
    const s1 = revisionsOf(exportOf(store, S1, sessionId));
    expect(archivedTextsOf(s1[0])).toEqual(texts.slice(0, 1));
    expect(s1[0]?.transition.kind === 'session_migrated' ? s1[0].transition.archive.recordedSchemaVersions : null).toEqual([11]);
    expect(s1[0]!.encounterState.round).toBe(revisions[0]!.encounterState.round);

    // Restoring S2: the live stream is S2's own migrated stream.
    await expect(store.restoreStored(S2, sessionId)).resolves.toBeUndefined();
    const live = store.revisions(sessionId);
    expect(live.map((revision) => revision.transition.kind)).toEqual(['session_migrated']);
    expect(archivedTextsOf(live[0])).toEqual(texts.slice(0, 2));
    expect(positionOf(live[0]!.encounterState, PC)).toEqual({ column: 0, row: 0 });
    expect(exportOf(store, S2, sessionId)).toBe(store.exported(sessionId));
    // S1 still resolves against the new root's archive; S3 pointed into the replaced stream and is refused.
    expect(archivedTextsOf(revisionsOf(exportOf(store, S1, sessionId))[0])).toEqual(texts.slice(0, 1));
    const s3 = thrown(() => store.exportedStored(S3, sessionId));
    expect(s3).toBeInstanceOf(RestorePointUnavailableError);
    await expect(store.restoreStored(S3, sessionId)).rejects.toBeInstanceOf(RestorePointUnavailableError);
    store.close();

    // The re-pointed records are durable.
    const reopened = await openStore(indexedDb, name);
    expect(exportOf(reopened, S2, sessionId)).toBe(reopened.exported(sessionId));
    expect(archivedTextsOf(revisionsOf(exportOf(reopened, S1, sessionId))[0])).toEqual(texts.slice(0, 1));
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

    const s2 = revisionsOf(exportOf(store, S2, sessionId));
    expect(s2.map((revision) => [revision.schemaVersion, revision.transition.kind])).toEqual([[13, 'session_started'], [13, 'reducer_applied']]);
    expect(canonicalJson(s2[1]!.encounterState)).toBe(canonicalJson(revisions[1]!.encounterState));

    await expect(store.restoreStored(S2, sessionId)).resolves.toBeUndefined();
    const live = store.revisions(sessionId);
    expect(live.map((revision) => revision.transition.kind)).toEqual(['session_started', 'reducer_applied']);
    expect(canonicalJson(live[1]!.encounterState)).toBe(canonicalJson(revisions[1]!.encounterState));
    // S1 and S2 are live prefixes of the restored stream now; S3's history was discarded.
    expect(revisionsOf(exportOf(store, S1, sessionId)).map((revision) => revision.checksum)).toEqual([live[0]!.checksum]);
    expect(exportOf(store, S2, sessionId)).toBe(store.exported(sessionId));
    expect(thrown(() => store.exportedStored(S3, sessionId))).toBeInstanceOf(RestorePointUnavailableError);
    store.close();

    const reopened = await openStore(indexedDb, name);
    expect(revisionsOf(exportOf(reopened, S1, sessionId)).map((revision) => revision.checksum)).toEqual([live[0]!.checksum]);
    await expect(reopened.restoreStored(S1, sessionId)).resolves.toBeUndefined();
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

/** A v12 app's revision-bundle save of `revisions`: canonical JSON, fingerprinted over the rest of the bundle. */
function v12Save(revisions: readonly StoredRevision[]): string {
  const body = { format: 'vtt-session-revisions', schemaVersion: 12, sessionId: revisions[0]!.sessionId, revisions };
  return canonicalJson({ ...body, fingerprint: sha256(canonicalJson(body)) });
}

/** A v11 revision as the v12 app held it: migrated by the registered v11 -> v12 migration. */
function asV12(revision: StoredRevision): StoredRevision {
  const migration = VTT_SESSION_MIGRATIONS.find((candidate) => candidate.from === 11 && candidate.to === 12);
  if (migration === undefined || revision.schemaVersion !== 11) throw new Error('Expected a v11 revision and the v11 -> v12 migration.');
  const body = { format: 'vtt-session-revisions', schemaVersion: 11, sessionId: revision.sessionId, revisions: [revision] };
  const migrated = migration.migrate({ ...body, fingerprint: sha256(canonicalJson(body)) }) as { readonly revisions: readonly StoredRevision[] };
  return migrated.revisions[0]!;
}

/**
 * Legacy localStorage as the pre-IndexedDB app left it: a session's save (none when `sessionBytes` is null) and its
 * metadata, then autosave saves, in that key order.
 */
function legacyStorage(
  sessionBytes: string | null,
  sessionId: string,
  autosaves: readonly { readonly storageId: string; readonly trigger: 'encounter_start' | 'round_boundary'; readonly bytes: string }[],
): MemoryStorageLike {
  const storage = new MemoryStorageLike();
  if (sessionBytes !== null) {
    storage.setItem(`srd55:vtt-session:${sessionId}`, sessionBytes);
    storage.setItem(`srd55:vtt-session-metadata:${sessionId}`, JSON.stringify({
      name: 'Legacy campaign', updatedAt: '2026-08-20T10:00:00.000Z', retention: { kind: 'named' },
    }));
  }
  for (const autosave of autosaves) {
    const pool = autosave.trigger === 'encounter_start' ? 'encounter_boundary' : 'per_round';
    storage.setItem(`srd55:vtt-autosave:${autosave.storageId}`, JSON.stringify({
      storageId: autosave.storageId, sessionId, trigger: autosave.trigger, pool, name: autosave.storageId,
      updatedAt: '2026-08-20T09:00:00.000Z', bytes: autosave.bytes, retention: { kind: 'autosave', pool },
    }));
  }
  return storage;
}

/**
 * The mixed history as the v12 app saved it: r1 (recorded under v11, migrated to v12 by the registered migration),
 * r2 initiative, r3 the PC to (1,0); the session's save holds all three, its encounter-start autosave r1.
 */
function mixedLegacy(): {
  readonly sessionId: SessionRevision['sessionId'];
  readonly sessionBytes: string;
  readonly autosaveBytes: string;
  readonly S1: string;
} {
  const stored = storedRevisions(MIXED);
  const history = [asV12(stored[0]!), stored[1]!, stored[2]!];
  const sessionId = history[0]!.sessionId as SessionRevision['sessionId'];
  return {
    sessionId,
    sessionBytes: v12Save(history),
    autosaveBytes: v12Save(history.slice(0, 1)),
    S1: `encounter_boundary:${sessionId}:000000000001:encounter_start`,
  };
}

/** The autosave record the store keeps for `storageId`, read from IndexedDB directly. */
async function storedSnapshot(indexedDb: IDBFactory, name: string, storageId: string): Promise<unknown> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const request = database.transaction('snapshots', 'readonly').objectStore('snapshots').get(storageId);
  const value = await new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

/** The save text a migrated root archives. */
function archivedSaveOf(root: SessionRevision | undefined): string {
  if (root?.transition.kind !== 'session_migrated' || root.transition.archive.source.kind !== 'saved_session') {
    throw new Error(`Expected a session_migrated root archiving a save, got ${String(root?.transition.kind)}.`);
  }
  return root.transition.archive.source.save.text;
}

describe('FOOTPRINT fix2: a legacy localStorage autosave never writes over its session', () => {
  // codex r2 P1. Legacy localStorage held a session's save and each autosave's save, whole. The session migrates
  // first; each autosave then wrote its migrated revisions to the SAME revision keys, harmless while an autosave's
  // stream was a prefix of its session's. Since D919 an autosave can migrate differently from its session (one by
  // archive, the other by the version bump, or to two archives), and its write replaced the session's head. Now an
  // autosave writes no revision of a session that has one: a prefix of the session is a live point into it; any
  // other keeps its own save text, byte for byte, as its restore point (its state: that save migrated on its own).

  it('a session and an earlier autosave that migrate to two archive roots: the session keeps its head, the autosave its own save', async () => {
    // The mixed history as the v12 app saved it: r1 (recorded under v11, migrated to v12 by the registered
    // migration), r2 initiative, r3 the PC to (1,0). The session's save holds all three; the autosave taken at the
    // encounter start holds r1. Each holds the Huge at (17,3) past the 19-column grid, so each migrates by archive:
    // the session to r3's state (PC (1,0)), the autosave to r1's (PC (0,0)); the Huge repaired to (16,2) in both.
    const { sessionId, sessionBytes, autosaveBytes, S1 } = mixedLegacy();
    const name = 'footprint-legacy-two-roots';
    const indexedDb = new IDBFactory();
    const storage = legacyStorage(sessionBytes, sessionId, [{ storageId: S1, trigger: 'encounter_start', bytes: autosaveBytes }]);
    const expectBoth = (store: IndexedDbBrowserSessionStore): void => {
      const session = store.revisions(sessionId);
      expect(session).toHaveLength(1);
      expect(archivedSaveOf(session[0])).toBe(sessionBytes);
      expect(positionOf(session[0]!.encounterState, PC)).toEqual({ column: 1, row: 0 });
      expect(positionOf(session[0]!.encounterState, HUGE)).toEqual({ column: 16, row: 2 });
      const own = revisionsOf(exportOf(store, S1, sessionId));
      expect(own).toHaveLength(1);
      expect(archivedSaveOf(own[0])).toBe(autosaveBytes);
      expect(positionOf(own[0]!.encounterState, PC)).toEqual({ column: 0, row: 0 });
      expect(positionOf(own[0]!.encounterState, HUGE)).toEqual({ column: 16, row: 2 });
    };
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName: name });
    expectBoth(store);
    expect(storage.length).toBe(0);
    store.close();
    expect(await storedSnapshot(indexedDb, name, S1)).toMatchObject({ restorePoint: { kind: 'own_save', text: autosaveBytes } });

    const reopened = await openStore(indexedDb, name);
    expectBoth(reopened);
    // Restoring the autosave: the live stream becomes its own migrated save, durably.
    await expect(reopened.restoreStored(S1, sessionId)).resolves.toBeUndefined();
    expect(archivedSaveOf(reopened.revisions(sessionId)[0])).toBe(autosaveBytes);
    reopened.close();
    const restored = await openStore(indexedDb, name);
    expect(restored.revisions(sessionId)).toHaveLength(1);
    expect(archivedSaveOf(restored.revisions(sessionId)[0])).toBe(autosaveBytes);
    expect(positionOf(restored.revisions(sessionId)[0]!.encounterState, PC)).toEqual({ column: 0, row: 0 });
    restored.close();
  });

  it('a session migrated by archive and an autosave whose prefix migrates by the version bump: neither replaces the other', async () => {
    // lr-squeezed as the v12 app exported it: r1 and r2 place whole bodies, r3 holds a v12 legendary-resistance
    // checkpoint v13 cannot express. The session's save (the fixture's own bytes) migrates by archive to one root;
    // the round-boundary autosave holds r1-r2 and migrates by the bump to two live v13 revisions.
    const revisions = storedRevisions(LR_SQUEEZED);
    const sessionId = revisions[0]!.sessionId as SessionRevision['sessionId'];
    const sessionBytes = inputs.fixtures.readText(LR_SQUEEZED);
    expect(v12Save(revisions)).toBe(sessionBytes);
    const autosaveBytes = v12Save(revisions.slice(0, 2));
    const S2 = `per_round:${sessionId}:000000000002:round_boundary`;
    const name = 'footprint-legacy-bump-prefix';
    const indexedDb = new IDBFactory();
    const expectBoth = (store: IndexedDbBrowserSessionStore): void => {
      const session = store.revisions(sessionId);
      expect(session.map((revision) => revision.transition.kind)).toEqual(['session_migrated']);
      expect(archivedSaveOf(session[0])).toBe(sessionBytes);
      const own = revisionsOf(exportOf(store, S2, sessionId));
      expect(own.map((revision) => [revision.schemaVersion, revision.transition.kind])).toEqual([[13, 'session_started'], [13, 'reducer_applied']]);
      expect(canonicalJson(own[1]!.encounterState)).toBe(canonicalJson(revisions[1]!.encounterState));
    };
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, legacyStorage(sessionBytes, sessionId, [
      { storageId: S2, trigger: 'round_boundary', bytes: autosaveBytes },
    ]), { databaseName: name });
    expectBoth(store);
    store.close();
    expect(await storedSnapshot(indexedDb, name, S2)).toMatchObject({ restorePoint: { kind: 'own_save', text: autosaveBytes } });
    const reopened = await openStore(indexedDb, name);
    expectBoth(reopened);
    await expect(reopened.restoreStored(S2, sessionId)).resolves.toBeUndefined();
    expect(reopened.revisions(sessionId).map((revision) => revision.transition.kind)).toEqual(['session_started', 'reducer_applied']);
    reopened.close();
  });

  it('an autosave whose stream is a prefix of its session\'s is a live point into it and keeps no save of its own', async () => {
    // lr-squeezed r1-r2 as the session, r1 as the encounter-start autosave: both migrate by the bump, and the
    // autosave's one revision is the session's first, checksum for checksum.
    const revisions = storedRevisions(LR_SQUEEZED);
    const sessionId = revisions[0]!.sessionId as SessionRevision['sessionId'];
    const S1 = `encounter_boundary:${sessionId}:000000000001:encounter_start`;
    const name = 'footprint-legacy-live-prefix';
    const indexedDb = new IDBFactory();
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, legacyStorage(v12Save(revisions.slice(0, 2)), sessionId, [
      { storageId: S1, trigger: 'encounter_start', bytes: v12Save(revisions.slice(0, 1)) },
    ]), { databaseName: name });
    const session = store.revisions(sessionId);
    expect(session.map((revision) => revision.transition.kind)).toEqual(['session_started', 'reducer_applied']);
    expect(revisionsOf(exportOf(store, S1, sessionId)).map((revision) => revision.checksum)).toEqual([session[0]!.checksum]);
    store.close();
    expect(await storedSnapshot(indexedDb, name, S1)).toMatchObject({ restorePoint: { kind: 'live', headChecksum: session[0]!.checksum } });
  });

  it('a legacy migration interrupted after the session moved: resumed, the autosave still never writes over the stored session', async () => {
    // The first open commits the mixed session and its autosave's record, then fails to remove the autosave's
    // localStorage key. The resumed open finds that key again, and the session is one the database already holds.
    const { sessionId, sessionBytes, autosaveBytes, S1 } = mixedLegacy();
    const name = 'footprint-legacy-resumed';
    const indexedDb = new IDBFactory();
    const storage = legacyStorage(sessionBytes, sessionId, [{ storageId: S1, trigger: 'encounter_start', bytes: autosaveBytes }]);
    storage.failRemovalOf = `srd55:vtt-autosave:${S1}`;
    await expect(IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName: name })).rejects.toMatchObject({ operation: 'migration' });
    expect(storage.getItem(`srd55:vtt-session:${sessionId}`)).toBeNull();
    expect(storage.getItem(`srd55:vtt-autosave:${S1}`)).not.toBeNull();
    const resumed = await IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName: name });
    expect(storage.length).toBe(0);
    expect(resumed.revisions(sessionId)).toHaveLength(1);
    expect(archivedSaveOf(resumed.revisions(sessionId)[0])).toBe(sessionBytes);
    expect(positionOf(resumed.revisions(sessionId)[0]!.encounterState, PC)).toEqual({ column: 1, row: 0 });
    expect(archivedSaveOf(revisionsOf(exportOf(resumed, S1, sessionId))[0])).toBe(autosaveBytes);
    resumed.close();
  });

  it('autosaves without their session: the longest is the session; a shorter one that migrated differently keeps its own save', async () => {
    // lr-squeezed with no session key: a round-boundary autosave holds r1-r2 (the version bump) and a later one
    // holds r1-r3 (by archive). The shorter comes first in localStorage key order; the session is still the longest
    // history, and the longer autosave is a live point at its root.
    const revisions = storedRevisions(LR_SQUEEZED);
    const sessionId = revisions[0]!.sessionId as SessionRevision['sessionId'];
    const fullBytes = inputs.fixtures.readText(LR_SQUEEZED);
    const shorterBytes = v12Save(revisions.slice(0, 2));
    const shorter = `per_round:${sessionId}:000000000002:round_boundary`;
    const longer = `per_round:${sessionId}:000000000003:round_boundary`;
    const name = 'footprint-legacy-longest-first';
    const indexedDb = new IDBFactory();
    const storage = legacyStorage(null, sessionId, [
      { storageId: shorter, trigger: 'round_boundary', bytes: shorterBytes },
      { storageId: longer, trigger: 'round_boundary', bytes: fullBytes },
    ]);
    expect(storage.key(0)).toBe(`srd55:vtt-autosave:${shorter}`);
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName: name });
    const session = store.revisions(sessionId);
    expect(session.map((revision) => revision.transition.kind)).toEqual(['session_migrated']);
    expect(archivedSaveOf(session[0])).toBe(fullBytes);
    expect(revisionsOf(exportOf(store, shorter, sessionId)).map((revision) => revision.transition.kind)).toEqual(['session_started', 'reducer_applied']);
    store.close();
    expect(await storedSnapshot(indexedDb, name, shorter)).toMatchObject({ restorePoint: { kind: 'own_save', text: shorterBytes } });
    expect(await storedSnapshot(indexedDb, name, longer)).toMatchObject({ restorePoint: { kind: 'live', headChecksum: session[0]!.checksum } });
  });

  it('an autosave whose save belongs to another session is refused, at migration and when its stored record says so', async () => {
    // At migration: a legacy autosave record naming one session with another session's save.
    const revisions = storedRevisions(LR_SQUEEZED);
    const misfiled = legacyStorage(null, 'session:footprint-someone-else', [
      { storageId: 'per_round:session:footprint-someone-else:000000000003:round_boundary', trigger: 'round_boundary', bytes: inputs.fixtures.readText(LR_SQUEEZED) },
    ]);
    expect(revisions[0]!.sessionId).not.toBe('session:footprint-someone-else');
    await expect(IndexedDbBrowserSessionStore.open(new IDBFactory(), misfiled, { databaseName: 'footprint-legacy-misfiled' })).rejects.toMatchObject({
      operation: 'migration',
      cause: expect.objectContaining({ message: 'Stored browser autosave identity does not match its session.' }),
    });
    // Stored: the mixed session's own-save record, its text replaced by lr-squeezed's save.
    const { sessionId, sessionBytes, autosaveBytes, S1 } = mixedLegacy();
    const name = 'footprint-own-save-misfiled';
    const indexedDb = new IDBFactory();
    (await IndexedDbBrowserSessionStore.open(indexedDb, legacyStorage(sessionBytes, sessionId, [
      { storageId: S1, trigger: 'encounter_start', bytes: autosaveBytes },
    ]), { databaseName: name })).close();
    const record = await storedSnapshot(indexedDb, name, S1) as Record<string, unknown>;
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const write = database.transaction('snapshots', 'readwrite');
    write.objectStore('snapshots').put({ ...record, restorePoint: { kind: 'own_save', text: inputs.fixtures.readText(LR_SQUEEZED) } }, S1);
    await done(write);
    database.close();
    const store = await openStore(indexedDb, name);
    expect(() => store.exportedStored(S1, sessionId)).toThrow('Browser autosave save belongs to another session.');
    await expect(store.restoreStored(S1, sessionId)).rejects.toThrow('Browser autosave save belongs to another session.');
    expect(archivedSaveOf(store.revisions(sessionId)[0])).toBe(sessionBytes);
    store.close();
  });
});

/** A minimal Storage for the IndexedDB store's legacy localStorage scan. */
class MemoryStorageLike implements Storage {
  readonly #values = new Map<string, string>();
  /** A key whose next removal fails once, as an interruption after the IndexedDB commit. */
  failRemovalOf: string | null = null;
  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void {
    if (key === this.failRemovalOf) {
      this.failRemovalOf = null;
      throw new Error('simulated interruption after the IndexedDB commit');
    }
    this.#values.delete(key);
  }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}
