import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import { reduceEncounter } from '../../../src/combat/encounter';
import { REFERENCE_MONSTER_ID } from '../../../src/vtt/reference-encounter';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import {
  BrowserSessionWriteError,
  IndexedDbBrowserSessionStore,
  importBrowserSessionDurably,
} from '../../../src/vtt/local-session-store';
import {
  MemoryBrowserSessionStore,
  exportSavedSession,
} from '../../../src/vtt/session-persistence';
import {
  loadExternalPartyPack,
  type ExternalPartyPackV2,
  type LoadedPartyMember,
} from '../../../src/vtt/party-pack';
import { composeStoredCharacterEncounter } from '../../../src/vtt/stored-character-encounter';

it('upload import acknowledgement waits for the durable flush before resolving', async () => {
  const events: string[] = [];
  let acknowledge: (() => void) | undefined;
  const flush = new Promise<void>((resolveFlush) => {
    acknowledge = resolveFlush;
  });
  const sessionId = encounterSessionId('session:durable-upload-unit');
  const importing = importBrowserSessionDurably({
    import: (bytes) => {
      events.push(`import:${bytes}`);
      return sessionId;
    },
    flush: async () => {
      events.push('flush:start');
      await flush;
      events.push('flush:acknowledged');
    },
  }, 'fixture-save-bytes').then((resolved) => {
    events.push('resolved');
    return resolved;
  });

  await Promise.resolve();
  expect(events).toEqual(['import:fixture-save-bytes', 'flush:start']);
  acknowledge?.();
  await expect(importing).resolves.toBe(sessionId);
  expect(events).toEqual([
    'import:fixture-save-bytes',
    'flush:start',
    'flush:acknowledged',
    'resolved',
  ]);
});

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();
  failNextRemoval = false;

  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void {
    if (this.failNextRemoval) {
      this.failNextRemoval = false;
      throw new Error('simulated interruption after IndexedDB commit');
    }
    this.#values.delete(key);
  }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}

function legacySession(session: string): {
  readonly id: ReturnType<typeof encounterSessionId>;
  readonly bytes: string;
} {
  const id = encounterSessionId(session);
  const memory = new MemoryBrowserSessionStore();
  const host = new DmEncounterHost(session, memory);
  host.interrupt();
  host.close();
  return { id, bytes: exportSavedSession(memory, id) };
}

function putLegacySession(storage: Storage, session: ReturnType<typeof legacySession>): void {
  storage.setItem(`srd55:vtt-session:${session.id}`, session.bytes);
  storage.setItem(`srd55:vtt-session-metadata:${session.id}`, JSON.stringify({
    name: 'Legacy campaign',
    updatedAt: '2042-08-24T12:00:00.000Z',
    retention: { kind: 'named' },
  }));
}

function putLegacyAutosave(
  storage: Storage,
  session: ReturnType<typeof legacySession>,
  input: {
    readonly storageId: string;
    readonly trigger?: string;
    readonly pool?: string;
    readonly name?: string;
    readonly updatedAt?: string;
    readonly bytes?: string;
    readonly retention?: unknown;
  },
): void {
  const pool = input.pool ?? 'per_round';
  storage.setItem(`srd55:vtt-autosave:${input.storageId}`, JSON.stringify({
    storageId: input.storageId,
    sessionId: session.id,
    trigger: input.trigger ?? 'round_boundary',
    pool,
    name: input.name ?? input.storageId,
    updatedAt: input.updatedAt ?? '2042-08-24T12:00:00.000Z',
    bytes: input.bytes ?? session.bytes,
    retention: input.retention ?? { kind: 'autosave', pool },
  }));
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error), { once: true });
  });
}

async function readStoredValue(
  indexedDb: IDBFactory,
  databaseName: string,
  storeName: string,
  key: IDBValidKey,
): Promise<unknown> {
  const opening = indexedDb.open(databaseName, 1);
  const database = await requestValue(opening);
  const transaction = database.transaction(storeName, 'readonly');
  const value: unknown = await requestValue(transaction.objectStore(storeName).get(key));
  await completed(transaction);
  database.close();
  return value;
}

async function readAllStoredValues(
  indexedDb: IDBFactory,
  databaseName: string,
  storeName: string,
): Promise<unknown[]> {
  const opening = indexedDb.open(databaseName, 1);
  const database = await requestValue(opening);
  const transaction = database.transaction(storeName, 'readonly');
  const values: unknown[] = await requestValue(transaction.objectStore(storeName).getAll());
  await completed(transaction);
  database.close();
  return values;
}

async function readAllStoredKeys(
  indexedDb: IDBFactory,
  databaseName: string,
  storeName: string,
): Promise<IDBValidKey[]> {
  const opening = indexedDb.open(databaseName, 1);
  const database = await requestValue(opening);
  const transaction = database.transaction(storeName, 'readonly');
  const keys = await requestValue(transaction.objectStore(storeName).getAllKeys());
  await completed(transaction);
  database.close();
  return keys;
}

async function seedStoredRevision(
  indexedDb: IDBFactory,
  databaseName: string,
  value: unknown,
): Promise<void> {
  const opening = indexedDb.open(databaseName, 1);
  opening.addEventListener('upgradeneeded', () => {
    opening.result.createObjectStore('revisions');
    opening.result.createObjectStore('sessions');
    opening.result.createObjectStore('snapshots');
  }, { once: true });
  const database = await requestValue(opening);
  const transaction = database.transaction('revisions', 'readwrite');
  transaction.objectStore('revisions').put(value, 'malformed\u0000000000000001');
  await completed(transaction);
  database.close();
}

interface ListenerRegistration {
  readonly target: string;
  readonly type: string;
  readonly options: boolean | AddEventListenerOptions | undefined;
}

class RecordedEventTarget extends EventTarget {
  constructor(
    private readonly label: string,
    private readonly registrations: ListenerRegistration[],
  ) {
    super();
  }

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.registrations.push({ target: this.label, type, options });
    super.addEventListener(type, callback, options);
  }
}

function controlledIndexedDb(outcome: 'success' | 'open_error' | 'request_error' | 'transaction_abort' | 'transaction_error') {
  const registrations: ListenerRegistration[] = [];
  const transactionTarget = new RecordedEventTarget('transaction', registrations);
  const transactionError = new DOMException('controlled transaction failure', 'AbortError');
  const requests = Array.from({ length: 3 }, (_unused, index) => {
    const request = new RecordedEventTarget(`request-${String(index)}`, registrations);
    return Object.assign(request, {
      result: [] as unknown[],
      error: new DOMException('controlled request failure', 'UnknownError'),
    });
  });
  let requestIndex = 0;
  const transaction = Object.assign(transactionTarget, {
    error: transactionError,
    objectStore: () => ({
      getAll: () => requests[requestIndex++] as unknown as IDBRequest<unknown[]>,
    }),
  }) as unknown as IDBTransaction;
  const database = {
    close: vi.fn(),
    transaction: () => {
      queueMicrotask(() => {
        for (const [index, request] of requests.entries()) {
          request.dispatchEvent(new Event(outcome === 'request_error' && index === 0 ? 'error' : 'success'));
        }
        globalThis.setTimeout(() => {
          const type = outcome === 'transaction_abort'
            ? 'abort'
            : outcome === 'transaction_error'
              ? 'error'
              : 'complete';
          transactionTarget.dispatchEvent(new Event(type));
        }, 0);
      });
      return transaction;
    },
  } as unknown as IDBDatabase;
  const openingTarget = new RecordedEventTarget('opening', registrations);
  const opening = Object.assign(openingTarget, {
    result: database,
    error: new DOMException('controlled opening failure', 'UnknownError'),
  }) as unknown as IDBOpenDBRequest;
  const indexedDb = {
    open: () => {
      queueMicrotask(() => openingTarget.dispatchEvent(new Event(outcome === 'open_error' ? 'error' : 'success')));
      return opening;
    },
  } as unknown as IDBFactory;
  return { indexedDb, registrations };
}

function padSavedSession(bytes: string, length: number): string {
  const paddingPropertyLength = ',"padding":""'.length;
  if (bytes.length + paddingPropertyLength > length) throw new Error('Saved session exceeds target length.');
  return `${bytes.slice(0, -1)},"padding":"${'x'.repeat(length - bytes.length - paddingPropertyLength)}"}`;
}

function boundaryPartyMembers(): readonly LoadedPartyMember[] {
  const member = (index: number): ExternalPartyPackV2['members'][number] => ({
    combatantId: `combatant:boundary-${String(index)}`,
    tokenId: `token:boundary-${String(index)}`,
    characterId: index,
    classes: [{ classId: 'Fighter', level: 2 }],
    hitDice: [{ sides: 10, maximum: 2 }],
    abilities: {
      strength: 16, dexterity: 12, constitution: 14,
      intelligence: 10, wisdom: 10, charisma: 8,
    },
    armorClass: 16,
    hitPointMaximum: 20,
    sizeCategory: 'Medium',
    walkingSpeedFeet: 30,
    initiativeBonus: index,
    savingThrowBonuses: {
      strength: 5, dexterity: 1, constitution: 4,
      intelligence: 0, wisdom: 0, charisma: -1,
    },
    attacksPerAction: 1,
    attacks: [{
      attackId: `attack:boundary-${String(index)}`,
      kind: 'melee',
      attackBonus: 5,
      criticalFloor: 20,
      reachFeet: 5,
      rangeFeet: 5,
      damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 3 }],
    }],
    startingConditions: [],
  });
  const loaded = loadExternalPartyPack({
    schemaVersion: 2,
    partyId: 'party:boundary-classification',
    allowPartial: false,
    members: [member(1), member(2), member(3)],
  });
  if (loaded.status !== 'loaded') throw new Error(`Boundary party refused: ${loaded.refusal.reason}.`);
  return loaded.party.members;
}

describe('IndexedDB durable VTT session adapter', () => {
  it('opens the exact default database and stores, and close delegates to IndexedDB', async () => {
    const indexedDb = new IDBFactory();
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage());

    expect(await indexedDb.databases()).toEqual([
      { name: 'srd55-vtt-sessions', version: 1 },
    ]);
    expect(transactions).toHaveBeenCalledTimes(2);
    expect(transactions.mock.calls[1]).toEqual([
      ['revisions', 'sessions', 'snapshots'],
      'readonly',
    ]);
    store.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it('registers exact one-shot success and failure listeners for opening, requests, and transactions', async () => {
    const controlled = controlledIndexedDb('success');
    const store = await IndexedDbBrowserSessionStore.open(controlled.indexedDb, new MemoryStorage());

    expect(controlled.registrations.map(({ target, type, options }) => ({ target, type, options })))
      .toEqual([
        { target: 'opening', type: 'upgradeneeded', options: undefined },
        { target: 'opening', type: 'success', options: { once: true } },
        { target: 'opening', type: 'error', options: { once: true } },
        { target: 'request-0', type: 'success', options: { once: true } },
        { target: 'request-0', type: 'error', options: { once: true } },
        { target: 'request-1', type: 'success', options: { once: true } },
        { target: 'request-1', type: 'error', options: { once: true } },
        { target: 'request-2', type: 'success', options: { once: true } },
        { target: 'request-2', type: 'error', options: { once: true } },
        { target: 'transaction', type: 'complete', options: { once: true } },
        { target: 'transaction', type: 'abort', options: { once: true } },
        { target: 'transaction', type: 'error', options: { once: true } },
      ]);
    store.close();
  }, 1_000);

  it.each([
    ['open_error', 'open'],
    ['request_error', 'migration'],
    ['transaction_abort', 'migration'],
    ['transaction_error', 'migration'],
  ] as const)('settles the %s event path as an exact %s failure', async (outcome, operation) => {
    const controlled = controlledIndexedDb(outcome);

    await expect(IndexedDbBrowserSessionStore.open(controlled.indexedDb, new MemoryStorage()))
      .rejects.toMatchObject({
        name: 'BrowserSessionWriteError',
        operation,
        quotaExceeded: false,
      });
  }, 1_000);

  it('bulk-imports every revision, persists exact keys, and reloads the export', async () => {
    const indexedDb = new IDBFactory();
    const source = legacySession('session:bulk-import-contract');
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'bulk-import-contract',
    });

    expect(store.import(source.bytes)).toBe(source.id);
    await store.flush();
    expect(store.revisions(source.id)).toHaveLength(2);
    expect(store.exported(source.id)).toBe(source.bytes);
    store.close();
    expect(await readAllStoredKeys(indexedDb, 'bulk-import-contract', 'revisions')).toEqual([
      `${source.id}\u0000000000000001`,
      `${source.id}\u0000000000000002`,
    ]);

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'bulk-import-contract',
    });
    expect(reopened.revisions(source.id).map((revision) => revision.revision)).toEqual([1, 2]);
    expect(reopened.exported(source.id)).toBe(source.bytes);
    reopened.close();
  });

  it('renames, exports, restores, and removes session saves through exact session ids', async () => {
    const indexedDb = new IDBFactory();
    const source = legacySession('session:session-save-operations');
    const missing = encounterSessionId('session:session-save-missing');
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'session-save-operations',
    });
    store.import(source.bytes);
    await store.flush();
    const storageId = `session:${source.id}`;

    await expect(store.renameStored(storageId, source.id, '   ')).rejects.toThrow(
      'A save name cannot be empty.',
    );
    await expect(store.renameStored(`session:${missing}`, missing, 'Missing')).rejects.toThrow(
      'Browser save does not exist.',
    );
    await store.renameStored(storageId, source.id, '  Named campaign  ');
    expect(store.savedSessions()).toEqual([
      expect.objectContaining({
        storageId,
        name: 'Named campaign',
        retention: { kind: 'named' },
      }),
    ]);
    expect(store.exportedStored(storageId, source.id)).toBe(source.bytes);
    await store.restoreStored(storageId, source.id);
    expect(store.revisions(source.id)).toHaveLength(2);

    await store.removeStored(storageId, source.id);
    expect(store.revisions(source.id)).toEqual([]);
    expect(store.savedSessions()).toEqual([]);
    store.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'session-save-operations',
    });
    expect(reopened.revisions(source.id)).toEqual([]);
    reopened.close();
  });

  it('renames, exports, restores, and removes one autosave without touching another session', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const source = legacySession('session:snapshot-save-operations');
    const other = legacySession('session:snapshot-save-other');
    putLegacyAutosave(storage, source, {
      storageId: 'per_round:snapshot-save-operations:000000000002:round_boundary',
    });
    putLegacyAutosave(storage, other, {
      storageId: 'per_round:snapshot-save-other:000000000002:round_boundary',
    });
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, {
      databaseName: 'snapshot-save-operations',
    });
    const snapshot = store.savedSessions().find((save) => save.sessionId === source.id);
    if (snapshot === undefined) throw new Error('Expected migrated autosave snapshot.');

    await expect(store.renameStored(snapshot.storageId, source.id, '  ')).rejects.toThrow(
      'A save name cannot be empty.',
    );
    await expect(store.renameStored('missing:snapshot', source.id, 'Missing')).rejects.toThrow(
      'Browser autosave does not exist.',
    );
    await expect(store.renameStored(snapshot.storageId, other.id, 'Wrong session')).rejects.toThrow(
      'Browser autosave does not exist.',
    );
    await store.renameStored(snapshot.storageId, source.id, '  Restorable point  ');
    expect(store.savedSessions()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        storageId: snapshot.storageId,
        name: 'Restorable point',
        retention: { kind: 'named' },
      }),
    ]));
    expect(store.exportedStored(snapshot.storageId, source.id)).toBe(source.bytes);
    expect(() => store.exportedStored('missing:snapshot', source.id)).toThrow(
      'Browser autosave does not exist.',
    );
    expect(() => store.exportedStored(snapshot.storageId, other.id)).toThrow(
      'Browser autosave does not exist.',
    );

    const host = new DmEncounterHost('session:snapshot-save-operations', store);
    host.adjudicate({
      type: 'adjudicate',
      target: REFERENCE_MONSTER_ID,
      subject: 'Snapshot restore mutation fixture',
      reasoning: 'Append one revision beyond the migrated snapshot.',
      consequence: { kind: 'hit_point_delta', amount: 0 },
    });
    await store.flush();
    expect(store.revisions(source.id).length).toBeGreaterThan(2);
    await store.restoreStored(snapshot.storageId, source.id);
    expect(store.revisions(source.id)).toHaveLength(2);
    await expect(store.restoreStored('missing:snapshot', source.id)).rejects.toThrow(
      'Browser autosave does not exist.',
    );
    await expect(store.restoreStored(snapshot.storageId, other.id)).rejects.toThrow(
      'Browser autosave does not exist.',
    );
    host.close();

    await store.removeStored(snapshot.storageId, source.id);
    expect(store.savedSessions().some((save) => save.storageId === snapshot.storageId)).toBe(false);
    expect(store.revisions(other.id)).toHaveLength(2);
    await store.remove(source.id);
    expect(store.revisions(source.id)).toEqual([]);
    expect(store.revisions(other.id)).toHaveLength(2);
    store.close();
  });

  it('persists snapshot removal and both rename paths across reopen', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const source = legacySession('session:durable-save-operations');
    const removed = legacySession('session:durable-save-removed');
    putLegacyAutosave(storage, source, {
      storageId: 'per_round:durable-save-operations:000000000002:round_boundary',
    });
    putLegacyAutosave(storage, removed, {
      storageId: 'per_round:durable-save-removed:000000000002:round_boundary',
    });
    const databaseName = 'durable-save-operations';
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName });
    const sourceSnapshot = store.savedSessions().find((save) => save.sessionId === source.id);
    const removedSnapshot = store.savedSessions().find((save) => save.sessionId === removed.id);
    if (sourceSnapshot === undefined || removedSnapshot === undefined) {
      throw new Error('Expected both durable autosave fixtures.');
    }

    await store.renameStored(sourceSnapshot.storageId, source.id, 'Durable snapshot name');
    await store.renameStored(`session:${source.id}`, source.id, 'Durable session name');
    await store.removeStored(removedSnapshot.storageId, removed.id);
    store.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName });
    expect(reopened.savedSessions()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        storageId: sourceSnapshot.storageId,
        name: 'Durable snapshot name',
        retention: { kind: 'named' },
      }),
      expect.objectContaining({
        storageId: `session:${source.id}`,
        name: 'Durable session name',
        retention: { kind: 'named' },
      }),
    ]));
    expect(reopened.savedSessions().some((save) => save.storageId === removedSnapshot.storageId))
      .toBe(false);
    expect(reopened.revisions(removed.id)).toHaveLength(2);
    reopened.close();
  });

  it('removes only the selected session snapshots from durable storage', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const selected = legacySession('session:remove-selected-snapshots');
    const retained = legacySession('session:remove-retained-snapshots');
    putLegacyAutosave(storage, selected, { storageId: 'per_round:remove-selected:one' });
    putLegacyAutosave(storage, selected, { storageId: 'encounter_boundary:remove-selected:two' });
    putLegacyAutosave(storage, retained, { storageId: 'per_round:remove-retained:one' });
    const databaseName = 'remove-selected-snapshots';
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, { databaseName });

    await store.remove(selected.id);
    store.close();

    const snapshots = await readAllStoredValues(indexedDb, databaseName, 'snapshots');
    expect(snapshots).toEqual([
      expect.objectContaining({ sessionId: retained.id, storageId: 'per_round:remove-retained:one' }),
    ]);
  });

  it('turns direct IndexedDB failures into a sticky typed operation failure', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage(), {
      databaseName: 'direct-write-failure',
    });
    const failure = new DOMException('delete quota', 'QuotaExceededError');
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(() => {
      throw failure;
    });
    const sessionId = encounterSessionId('session:direct-write-failure');

    await expect(store.remove(sessionId)).rejects.toMatchObject({
      name: 'BrowserSessionWriteError',
      operation: 'delete',
      quotaExceeded: true,
      cause: failure,
    });
    await expect(store.remove(sessionId)).rejects.toMatchObject({
      operation: 'delete',
      quotaExceeded: true,
    });
    store.close();
  });

  it.each([
    new Error('ordinary open failure'),
    new DOMException('wrong DOM failure', 'InvalidStateError'),
  ])('preserves an exact non-quota open failure for %s', async (cause) => {
    const indexedDb = {
      open: () => { throw cause; },
    } as unknown as IDBFactory;

    await expect(IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage())).rejects
      .toMatchObject({
        name: 'BrowserSessionWriteError',
        kind: 'browser_session_write_failed',
        operation: 'open',
        quotaExceeded: false,
        message: 'Browser session storage failed. This revision was not saved; export a copy before continuing.',
        cause,
      });
  });

  it('ignores sparse and unrelated legacy-storage keys', async () => {
    const sparse = {
      length: 1,
      clear: () => undefined,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => undefined,
    } satisfies Storage;
    const sparseStore = await IndexedDbBrowserSessionStore.open(new IDBFactory(), sparse, {
      databaseName: 'sparse-legacy-keys',
    });
    expect(sparseStore.savedSessions()).toEqual([]);
    sparseStore.close();

    const unrelated = new MemoryStorage();
    unrelated.setItem('unrelated:browser-setting', JSON.stringify({ enabled: true }));
    const unrelatedStore = await IndexedDbBrowserSessionStore.open(new IDBFactory(), unrelated, {
      databaseName: 'unrelated-legacy-key',
    });
    expect(unrelatedStore.savedSessions()).toEqual([]);
    expect(unrelated.getItem('unrelated:browser-setting')).toBe('{"enabled":true}');
    unrelatedStore.close();
  });

  it.each([
    null,
    [],
    42,
    { name: 42, updatedAt: '2042-08-24T12:00:00.000Z' },
    { name: 'Legacy', updatedAt: 42 },
  ])('falls back safely for malformed legacy metadata %#', async (metadata) => {
    const storage = new MemoryStorage();
    const source = legacySession(`session:malformed-metadata-${JSON.stringify(metadata)}`);
    storage.setItem(`srd55:vtt-session:${source.id}`, source.bytes);
    storage.setItem(`srd55:vtt-session-metadata:${source.id}`, JSON.stringify(metadata));

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: `malformed-metadata-${JSON.stringify(metadata)}`,
    });
    expect(store.savedSessions()).toEqual([
      expect.objectContaining({
        sessionId: source.id,
        name: source.id,
        updatedAt: new Date(0).toISOString(),
        retention: { kind: 'autosave', pool: 'per_round' },
      }),
    ]);
    store.close();
  });

  it.each([
    [{ kind: 'named' }, { kind: 'named' }],
    [{ kind: 'autosave', pool: 'per_round' }, { kind: 'autosave', pool: 'per_round' }],
    [{ kind: 'autosave', pool: 'encounter_boundary' }, { kind: 'autosave', pool: 'encounter_boundary' }],
    [{ kind: 'autosave', pool: 'unknown' }, { kind: 'autosave', pool: 'per_round' }],
    [{ kind: 'unknown', pool: 'encounter_boundary' }, { kind: 'autosave', pool: 'per_round' }],
  ] as const)('decodes legacy retention %# as %#', async (encoded, expected) => {
    const storage = new MemoryStorage();
    const source = legacySession(`session:retention-${JSON.stringify(encoded)}`);
    storage.setItem(`srd55:vtt-session:${source.id}`, source.bytes);
    storage.setItem(`srd55:vtt-session-metadata:${source.id}`, JSON.stringify({
      name: 'Retention fixture',
      updatedAt: '2042-08-24T12:00:00.000Z',
      retention: encoded,
    }));

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: `retention-${JSON.stringify(encoded)}`,
    });
    expect(store.savedSessions()[0]?.retention).toEqual(expected);
    store.close();
  });

  it('rejects every malformed legacy autosave field with the exact migration cause', async () => {
    const source = legacySession('session:malformed-autosave-fields');
    const valid: Readonly<Record<string, unknown>> = {
      storageId: 'per_round:malformed:000000000002:round_boundary',
      sessionId: source.id,
      trigger: 'round_boundary',
      pool: 'per_round',
      name: 'Malformed autosave fixture',
      updatedAt: '2042-08-24T12:00:00.000Z',
      bytes: source.bytes,
      retention: { kind: 'autosave', pool: 'per_round' },
    };
    const malformed: readonly unknown[] = [
      null,
      [],
      'not-an-object',
      { ...valid, storageId: 1 },
      { ...valid, sessionId: 1 },
      { ...valid, trigger: 1 },
      { ...valid, pool: 1 },
      { ...valid, name: 1 },
      { ...valid, updatedAt: 1 },
      { ...valid, bytes: 1 },
      { ...valid, trigger: 'unknown_boundary' },
      { ...valid, pool: 'unknown_pool' },
      { ...valid, pool: 'unknown_pool', retention: { kind: 'named' } },
      { ...valid, retention: { kind: 'autosave', pool: 'encounter_boundary' } },
    ];

    for (const [index, value] of malformed.entries()) {
      const storage = new MemoryStorage();
      storage.setItem(`srd55:vtt-autosave:malformed-${String(index)}`, JSON.stringify(value));
      await expect(IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
        databaseName: `malformed-autosave-${String(index)}`,
      })).rejects.toMatchObject({
        operation: 'migration',
        cause: expect.objectContaining({ message: 'Stored browser autosave is malformed.' }),
      });
    }
  });

  it('normalizes both historical rest triggers and retains the direct trigger variants', async () => {
    const storage = new MemoryStorage();
    const expected = [
      ['round_boundary', 'round_boundary'],
      ['encounter_start', 'encounter_start'],
      ['encounter_end', 'encounter_end'],
      ['rest_boundary', 'rest_boundary'],
      ['rest_interruption', 'rest_interruption'],
      ['short_rest_boundary', 'rest_boundary'],
      ['long_rest_boundary', 'rest_boundary'],
    ] as const;
    for (const [index, [trigger]] of expected.entries()) {
      const source = legacySession(`session:legacy-trigger-${String(index)}`);
      putLegacyAutosave(storage, source, {
        storageId: `per_round:legacy-trigger:${String(index)}`,
        trigger,
      });
    }

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: 'legacy-trigger-normalization',
    });
    expect(store.savedSessions().map((save) => ({
      name: save.name,
      trigger: 'trigger' in save ? save.trigger : null,
    }))).toEqual(expected.map(([trigger, normalized], index) => ({
      name: `per_round:legacy-trigger:${String(index)}`,
      trigger: normalized,
    })));
    store.close();
  });

  it('preserves a valid named legacy autosave retention', async () => {
    const storage = new MemoryStorage();
    const source = legacySession('session:named-legacy-autosave');
    putLegacyAutosave(storage, source, {
      storageId: 'per_round:named-legacy-autosave:point',
      retention: { kind: 'named' },
    });

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: 'named-legacy-autosave',
    });
    expect(store.savedSessions()).toContainEqual(expect.objectContaining({
      storageId: 'per_round:named-legacy-autosave:point',
      retention: { kind: 'named' },
    }));
    store.close();
  });

  it('rejects a legacy session whose embedded identity differs from its storage key', async () => {
    const storage = new MemoryStorage();
    const source = legacySession('session:identity-source');
    const wrongId = encounterSessionId('session:identity-key');
    storage.setItem(`srd55:vtt-session:${wrongId}`, source.bytes);

    await expect(IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: 'legacy-identity-mismatch',
    })).rejects.toMatchObject({
      operation: 'migration',
      cause: expect.objectContaining({
        message: 'Stored VTT session identity does not match its storage key.',
      }),
    });
  });

  it.each([
    null,
    [],
    { sessionId: 1, revision: 1, checksum: 'checksum' },
    { sessionId: 'session:malformed', revision: 1.5, checksum: 'checksum' },
    { sessionId: 'session:malformed', revision: 1, checksum: 1 },
  ])('rejects malformed preloaded revisions %# with the exact decoder error', async (value) => {
    const indexedDb = new IDBFactory();
    const databaseName = `malformed-preload-${JSON.stringify(value)}`;
    await seedStoredRevision(indexedDb, databaseName, value);

    await expect(IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName,
    })).rejects.toMatchObject({
      operation: 'migration',
      cause: expect.objectContaining({ message: 'Stored VTT session revision is malformed.' }),
    });
  });

  it('keeps the first autosave metadata when later snapshots share its session', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const source = legacySession('session:existing-autosave-metadata');
    putLegacyAutosave(storage, source, {
      storageId: 'per_round:existing-metadata:first',
      updatedAt: '2042-08-24T12:00:00.000Z',
    });
    putLegacyAutosave(storage, source, {
      storageId: 'encounter_boundary:existing-metadata:second',
      trigger: 'encounter_start',
      pool: 'encounter_boundary',
      updatedAt: '2042-08-25T12:00:00.000Z',
    });
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, {
      databaseName: 'existing-autosave-metadata',
    });
    store.close();

    expect(await readStoredValue(
      indexedDb,
      'existing-autosave-metadata',
      'sessions',
      source.id,
    )).toMatchObject({
      sessionId: source.id,
      updatedAt: '2042-08-24T12:00:00.000Z',
      retention: { kind: 'autosave', pool: 'per_round' },
    });
  });

  it('exports only the snapshot prefix after later revisions exist', async () => {
    const storage = new MemoryStorage();
    const source = legacySession('session:snapshot-prefix');
    putLegacyAutosave(storage, source, {
      storageId: 'per_round:snapshot-prefix:000000000002:round_boundary',
    });
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: 'snapshot-prefix',
    });
    const snapshot = store.savedSessions()[0];
    if (snapshot === undefined) throw new Error('Expected snapshot prefix fixture.');
    const host = new DmEncounterHost('session:snapshot-prefix', store);
    host.adjudicate({
      type: 'adjudicate',
      target: REFERENCE_MONSTER_ID,
      subject: 'Snapshot prefix mutation fixture',
      reasoning: 'Create a later revision that must not enter the stored prefix.',
      consequence: { kind: 'hit_point_delta', amount: 0 },
    });
    await store.flush();

    expect(store.revisions(source.id)).toHaveLength(3);
    expect(store.exportedStored(snapshot.storageId, source.id)).toBe(source.bytes);
    host.close();
    await store.flush();
    store.close();
  });

  it('prunes by timestamp even when storage-id order points the other way', async () => {
    const storage = new MemoryStorage();
    for (let index = 0; index < 12; index += 1) {
      const source = legacySession(`session:timestamp-prune-${String(index)}`);
      putLegacyAutosave(storage, source, {
        storageId: `per_round:timestamp-prune:${String(99 - index).padStart(3, '0')}`,
        name: `timestamp-${String(index)}`,
        updatedAt: new Date(Date.UTC(2042, 7, 24, 0, 0, index)).toISOString(),
      });
    }

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: 'timestamp-prune-order',
    });
    expect(store.savedSessions()
      .filter((save) => !save.storageId.startsWith('session:'))
      .map((save) => save.name)
      .sort()).toEqual(
      Array.from({ length: 10 }, (_unused, offset) => `timestamp-${String(offset + 2)}`).sort(),
    );
    store.close();
  });

  it('breaks equal-timestamp pruning ties by descending storage id', async () => {
    const storage = new MemoryStorage();
    const ids = ['05', '00', '11', '03', '09', '01', '10', '04', '08', '02', '07', '06'];
    for (const id of ids) {
      const source = legacySession(`session:tie-prune-${id}`);
      putLegacyAutosave(storage, source, {
        storageId: `per_round:tie-prune:${id}`,
        name: `tie-${id}`,
        updatedAt: '2042-08-24T12:00:00.000Z',
      });
    }

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage, {
      databaseName: 'tie-prune-order',
    });
    expect(store.savedSessions()
      .filter((save) => !save.storageId.startsWith('session:'))
      .map((save) => save.name)
      .sort()).toEqual(
      ['tie-02', 'tie-03', 'tie-04', 'tie-05', 'tie-06', 'tie-07', 'tie-08', 'tie-09', 'tie-10', 'tie-11'],
    );
    store.close();
  });

  it('emits exact start, short-rest, room, long-rest, and interruption autosave labels', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage(), {
      databaseName: 'autosave-trigger-contract',
    });
    const members = boundaryPartyMembers();
    const encounter = composeStoredCharacterEncounter(members);
    if (encounter.partyState === null) throw new Error('Autosave trigger encounter has no party state.');
    const host = new DmEncounterHost('session:autosave-trigger-contract', store, {
      initialState: encounter.state,
      initialPartyState: encounter.partyState,
      partyMembers: members,
      partyDisplayNames: encounter.displayNames,
      initialControllers: encounter.controllers,
      playerIds: encounter.playerIds,
      turnLegalActions: encounter.turnLegalActions,
    });
    await store.flush();
    expect(store.savedSessions().map((save) => save.name)).toEqual([
      'Encounter boundary — encounter start — r0',
    ]);

    await host.finishRoom([]);
    await host.resolveRestInterruption({ kind: 'no_benefit' });
    await host.finishAdventuringDay();
    await store.flush();
    const names = store.savedSessions().map((save) => save.name);
    expect(names).toEqual([
      'Encounter boundary — encounter start — r0',
      'Encounter boundary — rest boundary — r0',
      'Encounter boundary — encounter start — r0',
      'Round — round boundary — r1',
      'Encounter boundary — rest interruption — r1',
      'Encounter boundary — rest boundary — r1',
    ]);
    host.close();
    await store.flush();
    store.close();
  });

  it('creates one round-boundary snapshot and does not repeat it within the new round', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage(), {
      databaseName: 'round-boundary-trigger-contract',
    });
    const members = boundaryPartyMembers();
    const encounter = composeStoredCharacterEncounter(members);
    if (encounter.partyState === null) throw new Error('Round trigger encounter has no party state.');
    const started = reduceEncounter(encounter.state, { type: 'roll_initiative' }, () => 0.5).state;
    const host = new DmEncounterHost('session:round-boundary-trigger-contract', store, {
      initialState: started,
      initialPartyState: encounter.partyState,
      partyMembers: members,
      partyDisplayNames: encounter.displayNames,
      initialControllers: encounter.controllers,
      playerIds: encounter.playerIds,
      turnLegalActions: encounter.turnLegalActions,
    });
    const combatantCount = started.initiative.length;
    for (let index = 0; index <= combatantCount; index += 1) await host.skipTurn();
    await store.flush();

    const roundBoundary = store.savedSessions().filter(
      (save) => save.name === 'Round — round boundary — r2',
    );
    expect(roundBoundary).toHaveLength(1);
    expect(roundBoundary[0]?.storageId).toContain(':0000000000');
    host.close();
    await store.flush();
    store.close();
  });

  it('sorts preloaded revisions by revision number rather than IndexedDB key order', async () => {
    const indexedDb = new IDBFactory();
    const source = legacySession('session:preload-sort-contract');
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'preload-sort-contract',
    });
    store.import(source.bytes);
    await store.flush();
    store.close();

    const opening = indexedDb.open('preload-sort-contract', 1);
    const database = await requestValue(opening);
    const readTransaction = database.transaction('revisions', 'readonly');
    const stored = await requestValue(readTransaction.objectStore('revisions').getAll());
    await completed(readTransaction);
    expect(stored).toHaveLength(2);
    const writeTransaction = database.transaction('revisions', 'readwrite');
    writeTransaction.objectStore('revisions').clear();
    writeTransaction.objectStore('revisions').put(stored[0], 'z:last-key');
    writeTransaction.objectStore('revisions').put(stored[1], 'a:first-key');
    await completed(writeTransaction);
    database.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'preload-sort-contract',
    });
    expect(reopened.revisions(source.id).map((revision) => revision.revision)).toEqual([1, 2]);
    reopened.close();
  });
  it('starts empty and isolates session keys', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage());

    expect(store.revisions(encounterSessionId('session:one'))).toEqual([]);
    expect(store.revisions(encounterSessionId('session:two'))).toEqual([]);
    store.close();
  });

  it('RELOAD-REHYDRATES-INCREMENT-5-STORE restores committed coordinator state', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const firstStore = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    const first = new DmEncounterHost('session:reload', firstStore);
    first.interrupt();
    const before = first.snapshot();
    await firstStore.flush();
    first.close();
    firstStore.close();

    const reopenedStore = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    const reopened = new DmEncounterHost('session:reload', reopenedStore);
    const after = reopened.snapshot();

    expect(after.dm.encounter).toEqual(before.dm.encounter);
    expect(after.dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    expect(after.dm.history.length).toBe(before.dm.history.length);
    reopened.close();
    reopenedStore.close();
  });

  it('batches synchronous journal appends into one IndexedDB transaction before flush acknowledgement', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage());
    const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
    const host = new DmEncounterHost('session:batched-writes', store);
    for (let index = 0; index < 5; index += 1) {
      host.adjudicate({
        type: 'adjudicate',
        target: REFERENCE_MONSTER_ID,
        subject: `batch-${String(index)}`,
        reasoning: 'One synchronous pulse should share one durable transaction.',
        consequence: { kind: 'hit_point_delta', amount: 0 },
      });
    }

    await store.flush();
    expect(transactions).toHaveBeenCalledTimes(1);
    expect(store.revisions(encounterSessionId('session:batched-writes'))).toHaveLength(6);
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 10));
    expect(transactions).toHaveBeenCalledTimes(1);
    transactions.mockRestore();
    host.close();
    await store.flush();
    store.close();
  });

  it('schedules a write enqueued while the preceding batch transaction is publishing', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage(), {
      databaseName: 'reentrant-write-scheduling',
    });
    const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
    let host: DmEncounterHost | null = null;
    let appendedDuringPublish = false;
    const originalPut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      const request = Reflect.apply(originalPut, this, key === undefined ? [value] : [value, key]);
      if (!appendedDuringPublish && value instanceof ArrayBuffer && host !== null) {
        appendedDuringPublish = true;
        host.adjudicate({
          type: 'adjudicate',
          target: REFERENCE_MONSTER_ID,
          subject: 'Reentrant durable write fixture',
          reasoning: 'Queue the next revision while the first batch is publishing.',
          consequence: { kind: 'hit_point_delta', amount: 0 },
        });
      }
      return request;
    });
    host = new DmEncounterHost('session:reentrant-write-scheduling', store);

    await store.flush();
    await store.flush();
    expect(appendedDuringPublish).toBe(true);
    expect(store.revisions(encounterSessionId('session:reentrant-write-scheduling'))).toHaveLength(2);
    expect(transactions).toHaveBeenCalledTimes(2);
    host.close();
    await store.flush();
    store.close();
  });

  it('stores a large synchronous journal burst durably in one transaction', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
    const puts = vi.spyOn(IDBObjectStore.prototype, 'put');
    const host = new DmEncounterHost('session:bounded-write-batches', store);
    for (let index = 0; index < 65; index += 1) {
      host.adjudicate({
        type: 'adjudicate',
        target: REFERENCE_MONSTER_ID,
        subject: `bounded-batch-${String(index)}`,
        reasoning: 'Prepared durable encodings should retain synchronous transaction coalescing.',
        consequence: { kind: 'hit_point_delta', amount: 0 },
      });
    }

    await store.flush();
    expect(transactions).toHaveBeenCalledTimes(1);
    expect(puts.mock.calls.filter(([value]) => value instanceof ArrayBuffer)).toHaveLength(66);
    expect(store.revisions(encounterSessionId('session:bounded-write-batches'))).toHaveLength(66);
    transactions.mockRestore();
    puts.mockRestore();
    host.close();
    await store.flush();
    store.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    expect(reopened.revisions(encounterSessionId('session:bounded-write-batches'))).toHaveLength(66);
    reopened.close();
  });

  it('LARGE-REVISION-ROUNDTRIP stores a journal larger than 5MB and reloads its compact export', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    const host = new DmEncounterHost('session:large', store);
    const payload = 'large-revision-sentinel-'.repeat(6_000);
    for (let index = 0; index < 14; index += 1) {
      host.adjudicate({
        type: 'adjudicate',
        target: REFERENCE_MONSTER_ID,
        subject: `large-session-${String(index)}`,
        reasoning: `${String(index)}:${payload}`,
        consequence: { kind: 'hit_point_delta', amount: 0 },
      });
    }
    await store.flush();
    const expected = store.exported(encounterSessionId('session:large'));
    const journalBytes = new TextEncoder().encode(JSON.stringify(
      store.revisions(encounterSessionId('session:large')),
    )).byteLength;
    const exportBytes = new TextEncoder().encode(expected).byteLength;
    expect(journalBytes).toBeGreaterThan(5 * 1024 * 1024);
    expect(exportBytes).toBeLessThan(journalBytes);
    host.close();
    store.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    expect(reopened.exported(encounterSessionId('session:large'))).toBe(expected);
    reopened.close();
  });

  it('MIGRATION-COPY-BEFORE-DELETE moves legacy localStorage and is idempotent', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const legacy = legacySession('session:migrate');
    putLegacySession(storage, legacy);

    const migrated = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    expect(migrated.exported(legacy.id)).toBe(legacy.bytes);
    expect(migrated.savedSessions()).toEqual([
      expect.objectContaining({ name: 'Legacy campaign', migrationStatus: 'complete' }),
    ]);
    expect(storage.getItem(`srd55:vtt-session:${legacy.id}`)).toBeNull();
    expect(storage.getItem(`srd55:vtt-session-metadata:${legacy.id}`)).toBeNull();
    expect(storage.getItem(`srd55:vtt-session-truncated:${legacy.id}`)).toBeNull();
    migrated.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    expect(reopened.exported(legacy.id)).toBe(legacy.bytes);
    expect(reopened.revisions(legacy.id)).toHaveLength(2);
    reopened.close();
  });

  it('MIGRATION-RESUMES after interruption between commit and localStorage cleanup', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const legacy = legacySession('session:resume-migration');
    putLegacySession(storage, legacy);
    storage.failNextRemoval = true;

    await expect(IndexedDbBrowserSessionStore.open(indexedDb, storage)).rejects.toBeInstanceOf(
      BrowserSessionWriteError,
    );
    expect(storage.getItem(`srd55:vtt-session:${legacy.id}`)).toBe(legacy.bytes);

    const resumed = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
    expect(resumed.exported(legacy.id)).toBe(legacy.bytes);
    expect(resumed.revisions(legacy.id)).toHaveLength(2);
    expect(storage.getItem(`srd55:vtt-session:${legacy.id}`)).toBeNull();
    resumed.close();
  });

  it('migration_deletes_first keeps legacy bytes when the IndexedDB copy fails', async () => {
    const indexedDb = new IDBFactory();
    const storage = new MemoryStorage();
    const legacy = legacySession('session:copy-fails');
    putLegacySession(storage, legacy);
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('simulated quota', 'QuotaExceededError');
    });

    await expect(IndexedDbBrowserSessionStore.open(indexedDb, storage)).rejects.toMatchObject({
      kind: 'browser_session_write_failed',
      quotaExceeded: true,
    });
    expect(storage.getItem(`srd55:vtt-session:${legacy.id}`)).toBe(legacy.bytes);
    put.mockRestore();
  });

  it('truncated_marked_complete preserves a quota-truncated prefix and flags it', async () => {
    const storage = new MemoryStorage();
    const legacy = legacySession('session:truncated-prefix');
    putLegacySession(storage, legacy);
    storage.setItem(`srd55:vtt-session-truncated:${legacy.id}`, 'quota-exceeded');

    const migrated = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage);
    expect(migrated.exported(legacy.id)).toBe(legacy.bytes);
    expect(migrated.savedSessions()).toEqual([
      expect.objectContaining({ migrationStatus: 'truncated' }),
    ]);
    expect(storage.getItem(`srd55:vtt-session-truncated:${legacy.id}`)).toBeNull();
    migrated.close();
  });

  it('flags legacy autosaves at the localStorage truncation boundary but not just below it', async () => {
    const storage = new MemoryStorage();
    const truncationBoundary = 4 * 1024 * 1024;
    const atBoundary = legacySession('session:autosave-at-truncation-boundary');
    const belowBoundary = legacySession('session:autosave-below-truncation-boundary');
    const atBoundaryBytes = padSavedSession(atBoundary.bytes, truncationBoundary);
    const belowBoundaryBytes = padSavedSession(belowBoundary.bytes, truncationBoundary - 1);

    for (const [session, bytes, label] of [
      [atBoundary, atBoundaryBytes, 'at-boundary'],
      [belowBoundary, belowBoundaryBytes, 'below-boundary'],
    ] as const) {
      const storageId = `per_round:${session.id}:${label}`;
      storage.setItem(`srd55:vtt-autosave:${storageId}`, JSON.stringify({
        storageId,
        sessionId: session.id,
        trigger: 'round_boundary',
        pool: 'per_round',
        name: label,
        updatedAt: '2042-08-24T12:00:00.000Z',
        bytes,
        retention: { kind: 'autosave', pool: 'per_round' },
      }));
    }

    expect(atBoundaryBytes).toHaveLength(truncationBoundary);
    expect(belowBoundaryBytes).toHaveLength(truncationBoundary - 1);

    const migrated = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage);
    expect(migrated.savedSessions()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'at-boundary', migrationStatus: 'truncated' }),
      expect.objectContaining({ name: 'below-boundary', migrationStatus: 'complete' }),
    ]));
    migrated.close();
  });

  it('write_error_swallowed returns a typed quota failure from the flush acknowledgement', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage());
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('simulated quota', 'QuotaExceededError');
    });
    const host = new DmEncounterHost('session:write-fails', store);

    let failure: unknown;
    try {
      await store.flush();
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toMatchObject({
      name: 'BrowserSessionWriteError',
      kind: 'browser_session_write_failed',
      operation: 'write',
      quotaExceeded: true,
      message: expect.stringContaining('not saved'),
    });
    put.mockRestore();
    expect(() => host.close()).toThrow(BrowserSessionWriteError);
    store.close();
  });

  it('rest interruption mid-fight has its own boundary label and only actual victory ends the encounter', async () => {
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage());
    const members = boundaryPartyMembers();
    const encounter = composeStoredCharacterEncounter(members);
    if (encounter.partyState === null) throw new Error('Boundary encounter has no party state.');
    const host = new DmEncounterHost('session:boundary-classification', store, {
      initialState: encounter.state,
      initialPartyState: encounter.partyState,
      partyMembers: members,
      partyDisplayNames: encounter.displayNames,
      initialControllers: encounter.controllers,
      playerIds: encounter.playerIds,
      turnLegalActions: encounter.turnLegalActions,
    });
    host.interrupt();

    for (const partyMember of members) {
      host.adjudicate({
        type: 'adjudicate',
        target: partyMember.profile.id,
        subject: 'Mid-fight rest-interruption boundary fixture',
        reasoning: 'Leave the player character dying but not dead.',
        consequence: {
          kind: 'hit_point_delta',
          amount: -partyMember.profile.rules.hitPointMaximum,
        },
      });
    }
    await host.resolveRestInterruption({ kind: 'no_benefit' });
    await store.flush();

    const beforeVictory = store.savedSessions().map((save) => save.name);
    expect(beforeVictory).toContain('Encounter boundary — rest interruption — r0');
    expect(beforeVictory.some((name) => name.includes('encounter end'))).toBe(false);

    host.adjudicate({
      type: 'adjudicate',
      target: REFERENCE_MONSTER_ID,
      subject: 'Actual encounter victory boundary fixture',
      reasoning: 'Defeat the final enemy.',
      consequence: { kind: 'hit_point_delta', amount: -80 },
    });
    await store.flush();

    expect(store.savedSessions().map((save) => save.name)).toContain(
      'Encounter boundary — encounter end — r0',
    );
    host.close();
    store.close();
  });

  it('never prunes a named snapshot even when its autosave pool is over capacity', async () => {
    const storage = new MemoryStorage();
    const legacy = legacySession('session:named-prune-boundary');
    for (let index = 0; index < 11; index += 1) {
      const storageId = `per_round:${legacy.id}:${String(index).padStart(12, '0')}:round_boundary`;
      storage.setItem(`srd55:vtt-autosave:${storageId}`, JSON.stringify({
        storageId,
        sessionId: legacy.id,
        trigger: 'round_boundary',
        pool: 'per_round',
        name: `named-prune-${String(index)}`,
        updatedAt: new Date(Date.UTC(2042, 7, 24, 0, 0, index)).toISOString(),
        bytes: legacy.bytes,
        retention: index === 0 ? { kind: 'named' } : { kind: 'autosave', pool: 'per_round' },
      }));
    }

    const indexedDb = new IDBFactory();
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, {
      databaseName: 'named-prune-boundary',
    });
    expect(store.savedSessions()).toHaveLength(11);
    expect(store.savedSessions()).toContainEqual(expect.objectContaining({
      name: 'named-prune-0', retention: { kind: 'named' },
    }));
    store.close();
    expect(await readAllStoredValues(indexedDb, 'named-prune-boundary', 'snapshots')).toHaveLength(11);
  });

  it('prune_cross_pool retains exactly 10 snapshots in each IndexedDB autosave pool', async () => {
    const storage = new MemoryStorage();
    const legacy = legacySession('session:pool-pruning');
    for (const [pool, trigger] of [
      ['per_round', 'round_boundary'],
      ['encounter_boundary', 'encounter_start'],
    ] as const) {
      for (let index = 0; index < 25; index += 1) {
        const storageId = `${pool}:${legacy.id}:${String(index).padStart(12, '0')}:${trigger}`;
        storage.setItem(`srd55:vtt-autosave:${storageId}`, JSON.stringify({
          storageId,
          sessionId: legacy.id,
          trigger,
          pool,
          name: `${pool}-${String(index)}`,
          updatedAt: new Date(Date.UTC(2042, 7, 24, 0, 0, index)).toISOString(),
          bytes: legacy.bytes,
          retention: { kind: 'autosave', pool },
        }));
      }
    }

    const indexedDb = new IDBFactory();
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, {
      databaseName: 'prune-cross-pool-durable',
    });
    const saves = store.savedSessions();
    expect(saves.filter((save) => save.retention.kind === 'autosave' && save.retention.pool === 'per_round')).toHaveLength(10);
    expect(saves.filter((save) => save.retention.kind === 'autosave' && save.retention.pool === 'encounter_boundary')).toHaveLength(10);
    expect(saves.map((save) => save.name).sort()).toEqual([
      ...Array.from({ length: 10 }, (_unused, offset) => `encounter_boundary-${String(offset + 15)}`),
      ...Array.from({ length: 10 }, (_unused, offset) => `per_round-${String(offset + 15)}`),
    ].sort());
    store.close();
    expect(await readAllStoredValues(indexedDb, 'prune-cross-pool-durable', 'snapshots'))
      .toHaveLength(20);
  });
});
