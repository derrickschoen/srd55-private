import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import type { HiddenRollCategory } from '../../../src/combat/roll-visibility';
import { encounterSessionId, type EncounterSessionId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import { IndexedDbBrowserSessionStore, type StoredBrowserSave } from '../../../src/vtt/local-session-store';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { encounterSeed } from '../../../src/vtt/session-seed';
import {
  decodeSavedSessionFingerprint,
  exportSavedSession,
  MemoryBrowserSessionStore,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';

// FOOTPRINT fix3 (codex r3 P1). A legacy localStorage session save was written to its session's IndexedDB revision
// keys and then deleted from localStorage, whatever IndexedDB already held under that session id: a stored stream
// that differs from it lost its revisions (a longer one kept a mixed tail of both). Now nothing IndexedDB holds is
// written over. A save whose revisions IndexedDB already holds (identical, or a prefix) adds nothing; one that extends
// the stored stream adds only its revisions past it; one that diverges is KEPT whole as a save of its own, listed,
// exported and restored like an own_save autosave, beside the untouched stored session: a named save under an id
// naming its text's sha256 (so a resumed migration writes it again and another legacy save is kept beside it), which
// a delete of the stored session leaves. The legacy keys go only once that is committed.
//
// Every history here is recorded by the app (a DM host, then its journal's revisions), so both sides are current
// saves of the same session id; expectations are hand-derived from which revisions each side recorded.

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const SESSION = encounterSessionId('session:footprint-legacy-collision');
const SESSION_ROW = `session:${SESSION}`;

/** The storage id of the kept copy of the legacy save `bytes`: named by the sha256 of its text. */
function keptOf(bytes: string): string {
  return `legacy_session:${SESSION}:${sha256(bytes)}`;
}

/**
 * A history the app records for the session: the encounter started with `seed`, interrupted, then each of `hidden`
 * made hidden, one revision each (so 2 + hidden.length revisions).
 */
async function recorded(seed: number, hidden: readonly HiddenRollCategory[]): Promise<readonly SessionRevision[]> {
  const memory = new MemoryBrowserSessionStore();
  const host = new DmEncounterHost(SESSION, memory, { offerEnvironment: OFFER_ENVIRONMENT, initialSeed: encounterSeed(seed) });
  host.interrupt();
  for (const category of hidden) await host.setHiddenRollCategory(category, true);
  host.close();
  const revisions = memory.revisions(SESSION);
  expect(revisions.map((revision) => revision.transition.kind)[0]).toBe('session_started');
  expect(revisions).toHaveLength(2 + hidden.length);
  return revisions;
}

/** The save the app exports for exactly `revisions`. */
function saveOf(revisions: readonly SessionRevision[]): string {
  const store = new MemoryBrowserSessionStore();
  store.appendAll(revisions);
  return exportSavedSession(store, revisions[0]!.sessionId);
}

function checksums(revisions: readonly SessionRevision[]): readonly string[] {
  return revisions.map((revision) => revision.checksum);
}

/** A database holding `revisions` as its session, imported and flushed by the IndexedDB store, optionally renamed. */
async function storedDatabase(name: string, revisions: readonly SessionRevision[], renamed?: string): Promise<IDBFactory> {
  const indexedDb = new IDBFactory();
  const store = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), { databaseName: name });
  store.import(saveOf(revisions));
  await store.flush();
  const sessionId = revisions[0]!.sessionId;
  if (renamed !== undefined) await store.renameStored(`session:${sessionId}`, sessionId, renamed);
  store.close();
  return indexedDb;
}

/** Legacy localStorage holding `bytes` as the session's save, with its metadata (and the truncation marker). */
function legacySession(sessionId: EncounterSessionId, bytes: string, options: { readonly truncated?: boolean } = {}): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(`srd55:vtt-session:${sessionId}`, bytes);
  storage.setItem(`srd55:vtt-session-metadata:${sessionId}`, JSON.stringify({
    name: 'Legacy campaign', updatedAt: '2026-08-20T10:00:00.000Z', retention: { kind: 'named' },
  }));
  if (options.truncated === true) storage.setItem(`srd55:vtt-session-truncated:${sessionId}`, 'quota-exceeded');
  return storage;
}

function openStore(indexedDb: IDBFactory, name: string, storage: Storage = new MemoryStorage()): Promise<IndexedDbBrowserSessionStore> {
  return IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName: name });
}

/** The listed save `storageId`, which must be listed exactly once. */
function listed(store: IndexedDbBrowserSessionStore, storageId: string): StoredBrowserSave {
  const rows = store.savedSessions().filter((save) => save.storageId === storageId);
  expect(rows.map((row) => row.storageId)).toEqual([storageId]);
  return rows[0]!;
}

function rawDatabase(indexedDb: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** The record the snapshots store keeps under `storageId`, read from IndexedDB directly. */
async function snapshotRecord(indexedDb: IDBFactory, name: string, storageId: string): Promise<Readonly<Record<string, unknown>>> {
  const database = await rawDatabase(indexedDb, name);
  const request = database.transaction('snapshots', 'readonly').objectStore('snapshots').get(storageId);
  const value = await new Promise<unknown>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  if (typeof value !== 'object' || value === null) throw new Error(`No snapshot record ${storageId}.`);
  return value as Readonly<Record<string, unknown>>;
}

/** `record` written to the snapshots store under `storageId`, directly. */
async function putSnapshotRecord(indexedDb: IDBFactory, name: string, storageId: string, record: unknown): Promise<void> {
  const database = await rawDatabase(indexedDb, name);
  const transaction = database.transaction('snapshots', 'readwrite');
  transaction.objectStore('snapshots').put(record, storageId);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

describe('FOOTPRINT fix3: a legacy localStorage session never writes over the session IndexedDB holds', () => {
  it('divergent saves sharing an id: the stored session is untouched and the legacy save is kept as its own save, across reopening', async () => {
    // Stored: seed 7, interrupted, death saves hidden (3 revisions). Legacy: the same start and interruption, then
    // monster attack rolls hidden instead: revisions 1-2 equal, revision 3 differs. Neither holds the other.
    const stored = await recorded(7, ['death_saves']);
    const legacy = await recorded(7, ['monster_attack_rolls']);
    expect(checksums(legacy).slice(0, 2)).toEqual(checksums(stored).slice(0, 2));
    expect(legacy[2]!.checksum).not.toBe(stored[2]!.checksum);
    const legacyBytes = saveOf(legacy);
    const keptId = keptOf(legacyBytes);
    const name = 'footprint-legacy-collision-divergent';
    const indexedDb = await storedDatabase(name, stored);
    const storage = legacySession(SESSION, legacyBytes);

    const expectBoth = (store: IndexedDbBrowserSessionStore): void => {
      expect(checksums(store.revisions(SESSION))).toEqual(checksums(stored));
      expect(store.exported(SESSION)).toBe(saveOf(stored));
      // Both are listed: the session (autosave retention, as imported) and the kept copy beside it.
      expect(listed(store, SESSION_ROW)).toMatchObject({ revisionCount: 3, retention: { kind: 'autosave', pool: 'per_round' } });
      expect(listed(store, keptId)).toEqual({
        ...decodeSavedSessionFingerprint(legacyBytes, store.recordingEngine),
        storageId: keptId,
        name: 'Legacy campaign (kept legacy copy)',
        updatedAt: '2026-08-20T10:00:00.000Z',
        retention: { kind: 'named' },
        migrationStatus: 'complete',
      });
      expect(store.exportedStored(keptId, SESSION)).toBe(legacyBytes);
    };
    const store = await openStore(indexedDb, name, storage);
    expectBoth(store);
    expect(storage.length).toBe(0);
    store.close();

    const reopened = await openStore(indexedDb, name);
    expectBoth(reopened);
    // Restoring the kept copy: the session becomes the legacy history, durably; the kept copy stays.
    await expect(reopened.restoreStored(keptId, SESSION)).resolves.toBeUndefined();
    expect(checksums(reopened.revisions(SESSION))).toEqual(checksums(legacy));
    reopened.close();
    const restored = await openStore(indexedDb, name);
    expect(checksums(restored.revisions(SESSION))).toEqual(checksums(legacy));
    expect(restored.exported(SESSION)).toBe(legacyBytes);
    expect(restored.exportedStored(keptId, SESSION)).toBe(legacyBytes);
    // The session keeps its own name and retention, and takes the kept copy's migration status (it was 'native').
    expect(listed(restored, SESSION_ROW)).toMatchObject({
      name: SESSION, retention: { kind: 'autosave', pool: 'per_round' }, migrationStatus: 'complete',
    });
    restored.close();
  });

  it('divergent from the first revision, either side longer: kept, truncation carried on the kept copy only', async () => {
    // Other seeds diverge at revision 1. A: the stored stream is the shorter (2 revisions), the legacy the longer
    // (3), so the legacy is not an extension of it. B: the stored stream is the longer, the legacy the shorter, so
    // the legacy is not a prefix of it. The legacy save carries the truncation marker.
    const shorter = await recorded(11, []);
    const longer = await recorded(12, ['death_saves']);
    expect(shorter[0]!.checksum).not.toBe(longer[0]!.checksum);
    for (const [label, stored, legacy] of [['A', shorter, longer], ['B', longer, shorter]] as const) {
      const keptId = keptOf(saveOf(legacy));
      const name = `footprint-legacy-collision-first-${label}`;
      const indexedDb = await storedDatabase(name, stored);
      const store = await openStore(indexedDb, name, legacySession(SESSION, saveOf(legacy), { truncated: true }));
      expect(checksums(store.revisions(SESSION)), label).toEqual(checksums(stored));
      expect(listed(store, keptId), label).toMatchObject({ revisionCount: legacy.length, migrationStatus: 'truncated' });
      expect(listed(store, SESSION_ROW).migrationStatus, label).toBe('native');
      expect(store.exportedStored(keptId, SESSION), label).toBe(saveOf(legacy));
      store.close();
    }
  });

  it('a migration interrupted after the kept copy is committed: resumed, one kept copy, the stored session still untouched', async () => {
    const stored = await recorded(21, ['death_saves']);
    const legacy = await recorded(22, ['monster_saving_throws']);
    const keptId = keptOf(saveOf(legacy));
    const name = 'footprint-legacy-collision-resumed';
    const indexedDb = await storedDatabase(name, stored);
    const storage = legacySession(SESSION, saveOf(legacy));
    storage.failRemovalOf = `srd55:vtt-session:${SESSION}`;
    await expect(openStore(indexedDb, name, storage)).rejects.toMatchObject({ operation: 'migration' });
    expect(storage.getItem(`srd55:vtt-session:${SESSION}`)).toBe(saveOf(legacy));

    const resumed = await openStore(indexedDb, name, storage);
    expect(storage.length).toBe(0);
    expect(checksums(resumed.revisions(SESSION))).toEqual(checksums(stored));
    expect(resumed.savedSessions().map((save) => save.storageId).sort()).toEqual([keptId, SESSION_ROW].sort());
    expect(resumed.exportedStored(keptId, SESSION)).toBe(saveOf(legacy));
    resumed.close();
  });

  it('a later migration with another divergent legacy save keeps it beside the first kept copy, never over it', async () => {
    const stored = await recorded(71, []);
    const first = saveOf(await recorded(72, []));
    const second = saveOf(await recorded(73, []));
    const name = 'footprint-legacy-collision-second';
    const indexedDb = await storedDatabase(name, stored);
    (await openStore(indexedDb, name, legacySession(SESSION, first))).close();
    const store = await openStore(indexedDb, name, legacySession(SESSION, second));
    expect(checksums(store.revisions(SESSION))).toEqual(checksums(stored));
    const keptTexts = store.savedSessions().filter((save) => save.storageId.startsWith('legacy_session:'))
      .map((save) => store.exportedStored(save.storageId, SESSION));
    expect(keptTexts.sort()).toEqual([first, second].sort());
    expect(store.savedSessions().map((save) => save.storageId).sort()).toEqual([keptOf(first), keptOf(second), SESSION_ROW].sort());
    expect(store.exportedStored(keptOf(first), SESSION)).toBe(first);
    expect(store.exportedStored(keptOf(second), SESSION)).toBe(second);
    store.close();
  });

  it('deleting the stored session leaves the kept copy, which restores the session', async () => {
    const stored = await recorded(31, []);
    const legacy = await recorded(32, []);
    const keptId = keptOf(saveOf(legacy));
    const name = 'footprint-legacy-collision-delete';
    const indexedDb = await storedDatabase(name, stored);
    const store = await openStore(indexedDb, name, legacySession(SESSION, saveOf(legacy), { truncated: true }));
    await store.removeStored(SESSION_ROW, SESSION);
    expect(store.revisions(SESSION)).toEqual([]);
    expect(store.savedSessions().map((save) => save.storageId)).toEqual([keptId]);
    store.close();
    const reopened = await openStore(indexedDb, name);
    expect(reopened.savedSessions().map((save) => save.storageId)).toEqual([keptId]);
    await reopened.restoreStored(keptId, SESSION);
    expect(checksums(reopened.revisions(SESSION))).toEqual(checksums(legacy));
    // No session metadata is left: the restored session is named by its id, a named save, truncated as the copy was.
    expect(listed(reopened, SESSION_ROW)).toMatchObject({ name: SESSION, retention: { kind: 'named' }, migrationStatus: 'truncated' });
    reopened.close();
  });

  it('a legacy save the stored session already holds (identical, or a prefix) merges: nothing kept, the session and its name untouched', async () => {
    const full = await recorded(41, ['death_saves']);
    for (const [label, legacy] of [['identical', full], ['prefix', full.slice(0, 2)]] as const) {
      const name = `footprint-legacy-collision-held-${label}`;
      const indexedDb = await storedDatabase(name, full, 'Stored campaign');
      const storage = legacySession(SESSION, saveOf(legacy));
      const store = await openStore(indexedDb, name, storage);
      expect(storage.length, label).toBe(0);
      expect(checksums(store.revisions(SESSION)), label).toEqual(checksums(full));
      expect(store.savedSessions().map((save) => [save.storageId, save.name]), label).toEqual([[SESSION_ROW, 'Stored campaign']]);
      store.close();
    }
  });

  it('a legacy save that extends the stored session merges: only its later revisions are added, the name untouched', async () => {
    // Stored: revisions 1-2; legacy: 1-4. A legacy autosave at revision 3 is then a live point into the extended
    // session (it is not one into the stored two revisions alone).
    const full = await recorded(51, ['death_saves', 'monster_attack_rolls']);
    const name = 'footprint-legacy-collision-extends';
    const indexedDb = await storedDatabase(name, full.slice(0, 2), 'Stored campaign');
    const storage = legacySession(SESSION, saveOf(full));
    const autosave = `per_round:${SESSION}:000000000003:round_boundary`;
    storage.setItem(`srd55:vtt-autosave:${autosave}`, JSON.stringify({
      storageId: autosave, sessionId: SESSION, trigger: 'round_boundary', pool: 'per_round', name: autosave,
      updatedAt: '2026-08-20T10:03:00.000Z', bytes: saveOf(full.slice(0, 3)), retention: { kind: 'autosave', pool: 'per_round' },
    }));
    const store = await openStore(indexedDb, name, storage);
    expect(storage.length).toBe(0);
    expect(checksums(store.revisions(SESSION))).toEqual(checksums(full));
    expect(listed(store, SESSION_ROW).name).toBe('Stored campaign');
    expect(store.savedSessions().map((save) => save.storageId).sort()).toEqual([autosave, SESSION_ROW].sort());
    store.close();
    expect(await snapshotRecord(indexedDb, name, autosave)).toMatchObject({ restorePoint: { kind: 'live', headChecksum: full[2]!.checksum } });
    const reopened = await openStore(indexedDb, name);
    expect(reopened.exported(SESSION)).toBe(saveOf(full));
    reopened.close();
  });

  it('a kept copy record that is not a named own save with a migration status, or a record of another kind, is refused on open', async () => {
    const stored = await recorded(61, []);
    const legacy = await recorded(62, []);
    const keptId = keptOf(saveOf(legacy));
    const name = 'footprint-legacy-collision-malformed';
    const indexedDb = await storedDatabase(name, stored);
    (await openStore(indexedDb, name, legacySession(SESSION, saveOf(legacy)))).close();
    const record = await snapshotRecord(indexedDb, name, keptId);
    expect(record).toMatchObject({
      kind: 'kept_legacy_session', retention: { kind: 'named' }, migrationStatus: 'complete', restorePoint: { kind: 'own_save', text: saveOf(legacy) },
    });
    const kept = 'Stored kept legacy session save is malformed.';
    const tampered: readonly (readonly [string, Readonly<Record<string, unknown>>, string])[] = [
      ['a live point', { ...record, restorePoint: { kind: 'live', headChecksum: stored[1]!.checksum } }, kept],
      ['autosave retention', { ...record, retention: { kind: 'autosave', pool: 'per_round' } }, kept],
      ['no migration status', { ...record, migrationStatus: 'migrated' }, kept],
      ['another kind', { ...record, kind: 'imported_copy' }, 'Stored browser autosave is malformed.'],
    ];
    for (const [label, value, message] of tampered) {
      await putSnapshotRecord(indexedDb, name, keptId, value);
      await expect(openStore(indexedDb, name), label).rejects.toMatchObject({
        operation: 'migration', cause: expect.objectContaining({ message }),
      });
    }
    await putSnapshotRecord(indexedDb, name, keptId, record);
    const store = await openStore(indexedDb, name);
    expect(store.exportedStored(keptId, SESSION)).toBe(saveOf(legacy));
    store.close();
  });
});

/** A minimal Storage for the IndexedDB store's legacy localStorage scan. */
class MemoryStorage implements Storage {
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
