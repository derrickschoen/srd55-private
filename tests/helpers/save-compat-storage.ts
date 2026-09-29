/**
 * SAVE-COMPAT storage seams for the witnesses: a stored stream is SEEDED by raw IndexedDB writes, exactly as an
 * earlier build left it (the store's own import refuses what these witnesses need stored), and read back raw, so a
 * witness sees the bytes the store holds, not the store's view of them.
 */
import { IDBKeyRange, type IDBFactory } from 'fake-indexeddb';
import type { EngineBuild } from '../../src/vtt/engine-build';
import { IndexedDbBrowserSessionStore } from '../../src/vtt/local-session-store';
import { SaveFolderRepository } from '../../src/vtt/save-folder';

export class MemoryStorageLike implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number {
    return this.#values.size;
  }

  clear(): void {
    this.#values.clear();
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value);
  }
}

export function openStore(
  indexedDb: IDBFactory,
  databaseName: string,
  recordingEngine: EngineBuild,
  legacy: Storage = new MemoryStorageLike(),
): Promise<IndexedDbBrowserSessionStore> {
  return IndexedDbBrowserSessionStore.open(indexedDb, legacy, { databaseName, recordingEngine });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function rawDatabase(indexedDb: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requested<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function gzip(text: string): Promise<ArrayBuffer> {
  return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
}

async function gunzip(value: ArrayBuffer): Promise<string> {
  return new Response(new Blob([value]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

function revisionKey(sessionId: string, revision: number): string {
  return `${sessionId}\u0000${String(revision).padStart(12, '0')}`;
}

/**
 * Writes `texts` (one stored revision each, as an earlier build stored it: gzip of the text) and a NAMED session
 * metadata record straight into IndexedDB, after the store created its database once. Returns the session id.
 */
export async function seedStream(
  indexedDb: IDBFactory,
  databaseName: string,
  texts: readonly string[],
  label: string,
  recordingEngine: EngineBuild,
): Promise<string> {
  (await openStore(indexedDb, databaseName, recordingEngine)).close();
  const revisions = texts.map((text) => JSON.parse(text) as { readonly sessionId: string; readonly revision: number });
  const sessionId = revisions[0]!.sessionId;
  const zipped = await Promise.all(texts.map(gzip));
  const database = await rawDatabase(indexedDb, databaseName);
  const write = database.transaction(['revisions', 'sessions'], 'readwrite');
  revisions.forEach((revision, index) => {
    write.objectStore('revisions').put(zipped[index], revisionKey(sessionId, revision.revision));
  });
  write.objectStore('sessions').put({
    sessionId, name: label, updatedAt: '2026-09-20T10:00:00.000Z', retention: { kind: 'named' }, migrationStatus: 'native',
  }, sessionId);
  await done(write);
  database.close();
  return sessionId;
}

/** The texts IndexedDB holds for `sessionId`'s revisions, in key (revision) order. */
export async function rawTexts(indexedDb: IDBFactory, databaseName: string, sessionId: string): Promise<string[]> {
  const database = await rawDatabase(indexedDb, databaseName);
  const read = database.transaction('revisions', 'readonly');
  const values = await requested(read.objectStore('revisions')
    .getAll(IDBKeyRange.bound(`${sessionId}\u0000`, `${sessionId}\u0001`)) as IDBRequest<ArrayBuffer[]>);
  database.close();
  return Promise.all(values.map(gunzip));
}

/** The session metadata record IndexedDB holds for `sessionId`, or undefined. */
export async function rawMetadata(indexedDb: IDBFactory, databaseName: string, sessionId: string): Promise<unknown> {
  const database = await rawDatabase(indexedDb, databaseName);
  const read = database.transaction('sessions', 'readonly');
  const value: unknown = await requested(read.objectStore('sessions').get(sessionId));
  database.close();
  return value;
}

/** Writes one snapshot record straight into IndexedDB. */
export async function putSnapshot(
  indexedDb: IDBFactory,
  databaseName: string,
  record: Readonly<Record<string, unknown>> & { readonly storageId: string },
): Promise<void> {
  const database = await rawDatabase(indexedDb, databaseName);
  const write = database.transaction('snapshots', 'readwrite');
  write.objectStore('snapshots').put(record, record.storageId);
  await done(write);
  database.close();
}

/** A save folder holding `files` (name -> text), through the repository's own listing. */
export async function folderHolding(files: ReadonlyMap<string, string>): Promise<SaveFolderRepository> {
  const handle = {
    kind: 'directory',
    name: 'saves',
    getFileHandle: async () => {
      throw new Error('This folder is read only in the witness.');
    },
    async *entries() {
      for (const [filename, text] of files) {
        yield [filename, { kind: 'file', getFile: async () => ({ text: async () => text, lastModified: 0 }) }] as const;
      }
    },
  };
  const repository = new SaveFolderRepository(
    { load: async () => handle as unknown as FileSystemDirectoryHandle, save: async () => undefined },
    { showDirectoryPicker: () => undefined } as unknown as Window,
  );
  await repository.restore();
  return repository;
}
