import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { encounterSessionId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { SaveFolderRepository, FolderSaveCollisionError } from '../../../src/vtt/save-folder';
import { decodeSavedSessionRevisions, exportSavedSession, MemoryBrowserSessionStore, importSavedSession } from '../../../src/vtt/session-persistence';
import { BUILD_A, BUILD_B, bundle, bundleNotRehashed, e1, LR_SQUEEZED_V12, OVERHANG_V12, recordS, rehashed, type Plain } from '../../helpers/save-compat-fixtures';
import { MemoryStorageLike, openStore, putSnapshot, rawTexts, seedStream } from '../../helpers/save-compat-storage';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12, LR_SQUEEZED_V12] });
const s = (): Plain[] => recordS(BUILD_A, inputs.fixtures.readText(OVERHANG_V12)).plain;
const texts = (revisions: readonly Plain[]): string[] => revisions.map(canonicalJson);

async function writableFolder(files: Map<string, string>): Promise<SaveFolderRepository> {
  const handle = {
    kind: 'directory', name: 'campaigns',
    async getFileHandle(filename: string, options?: { create?: boolean }) {
      if (!files.has(filename) && options?.create !== true) throw new DOMException('Missing file', 'NotFoundError');
      if (options?.create === true && !files.has(filename)) files.set(filename, '');
      return {
        kind: 'file',
        getFile: async () => ({ text: async () => files.get(filename)!, lastModified: 0 }),
        createWritable: async () => {
          let pending = '';
          return { write: async (bytes: string) => { pending = bytes; }, close: async () => { files.set(filename, pending); } };
        },
      };
    },
    async *entries() {
      for (const filename of files.keys()) yield [filename, await this.getFileHandle(filename)] as const;
    },
  };
  const folder = new SaveFolderRepository(
    { load: async () => handle as unknown as FileSystemDirectoryHandle, save: async () => undefined },
    { showDirectoryPicker: () => undefined } as unknown as Window,
  );
  await folder.restore();
  return folder;
}

async function rawRecord(indexedDb: IDBFactory, name: string, key: IDBValidKey): Promise<ArrayBuffer> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<ArrayBuffer>((resolve, reject) => {
      const request = database.transaction('revisions', 'readonly').objectStore('revisions').get(key);
      request.onsuccess = () => resolve(request.result as ArrayBuffer);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function putRawRecord(indexedDb: IDBFactory, name: string, key: IDBValidKey, value: ArrayBuffer): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('revisions', 'readwrite');
      transaction.objectStore('revisions').put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function moveRawRecord(indexedDb: IDBFactory, name: string, from: string, to: string): Promise<void> {
  const bytes = await rawRecord(indexedDb, name, from);
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('revisions', 'readwrite');
      transaction.objectStore('revisions').delete(from);
      transaction.objectStore('revisions').put(bytes, to);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function rawRecordCount(indexedDb: IDBFactory, name: string, key: string): Promise<number> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<number>((resolve, reject) => {
      const request = database.transaction('revisions', 'readonly').objectStore('revisions').count(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function gzip(text: string): Promise<ArrayBuffer> {
  return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
}

describe('SAVE-COMPAT branch review fixes', () => {
  it('F1 refused folder file survives Save now; same-session loadable file can be overwritten', async () => {
    const plain = s();
    const id = encounterSessionId(String(plain[0]!.sessionId));
    const current = bundle(plain);
    const refused = bundle(e1(plain));
    const otherStore = new MemoryBrowserSessionStore(BUILD_A);
    const otherId = importSavedSession(otherStore, inputs.fixtures.readText(LR_SQUEEZED_V12));
    const other = exportSavedSession(otherStore, otherId);
    const files = new Map([['campaign.vtt.json', refused]]);
    const folder = await writableFolder(files);
    for (const protectedBytes of [refused, 'not JSON', other]) {
      files.set('campaign.vtt.json', protectedBytes);
      await expect(folder.write('campaign', current, BUILD_B)).rejects.toMatchObject({
        name: 'FolderSaveCollisionError', filename: 'campaign.vtt.json',
      } satisfies Partial<FolderSaveCollisionError>);
      expect(files.get('campaign.vtt.json')).toBe(protectedBytes);
    }
    files.set('campaign.vtt.json', bundle(plain.slice(0, 1)));
    await expect(folder.write('campaign', current, BUILD_B)).resolves.toBe('campaign.vtt.json');
    expect(files.get('campaign.vtt.json')).toBe(current);
    expect(decodeSavedSessionRevisions(current, BUILD_B)[0]?.sessionId).toBe(id);
  });

  it('F2 keeps a loadable legacy prefix when the longer stored stream is refused', async () => {
    const indexedDb = new IDBFactory();
    const plain = s();
    const id = String(plain[0]!.sessionId);
    const stored = texts(rehashed(e1(plain)));
    await seedStream(indexedDb, 'review-f2', stored, 'stored campaign', BUILD_B);
    const legacyBytes = bundleNotRehashed(plain.slice(0, 1));
    expect(decodeSavedSessionRevisions(legacyBytes, BUILD_B)[0]?.checksum).toBe((JSON.parse(stored[0]!) as Plain).checksum);
    const legacy = new MemoryStorageLike();
    legacy.setItem(`srd55:vtt-session:${id}`, legacyBytes);
    const store = await openStore(indexedDb, 'review-f2', BUILD_B, legacy);
    const keptId = `legacy_session:${id}:${sha256(legacyBytes)}`;
    const kept = store.savedSessions().find((save) => save.storageId === keptId);
    expect(kept?.load).toEqual({ kind: 'loadable' });
    expect(store.savedSessions().find((save) => save.storageId === `session:${id}`)?.load.kind).toBe('refused');
    expect(await rawTexts(indexedDb, 'review-f2', id)).toEqual(stored);
    const reader = new MemoryBrowserSessionStore(BUILD_B);
    expect(importSavedSession(reader, store.exportedStored(keptId, encounterSessionId(id)))).toBe(encounterSessionId(id));
    expect(reader.revisions(encounterSessionId(id))).toHaveLength(1);
    store.close();
    expect(legacy.length).toBe(0);
  });

  it.each(['corrupt gzip', 'missing checksum'] as const)('F3 %s record does not block a sound session', async (damage) => {
    const indexedDb = new IDBFactory();
    const bad = s();
    const badId = String(bad[0]!.sessionId);
    const badTexts = texts(bad);
    await seedStream(indexedDb, `review-f3-${damage}`, badTexts, 'damaged campaign', BUILD_B);
    const goodRecorder = new MemoryBrowserSessionStore(BUILD_A);
    const goodId = importSavedSession(goodRecorder, inputs.fixtures.readText(LR_SQUEEZED_V12));
    const good = goodRecorder.revisions(goodId).map(canonicalJson);
    await seedStream(indexedDb, `review-f3-${damage}`, good, 'sound campaign', BUILD_B);
    const key = `${badId}\u0000000000000001`;
    const broken = damage === 'corrupt gzip'
      ? new Uint8Array([0, 1, 2, 3]).buffer
      : await gzip(canonicalJson(Object.fromEntries(Object.entries(bad[0]!).filter(([field]) => field !== 'checksum'))));
    await putRawRecord(indexedDb, `review-f3-${damage}`, key, broken);
    const rawBefore = new Uint8Array(await rawRecord(indexedDb, `review-f3-${damage}`, key));
    const opened = await openStore(indexedDb, `review-f3-${damage}`, BUILD_B).catch((error: unknown) => error);
    expect(opened).toHaveProperty('savedSessions');
    const store = opened as Awaited<ReturnType<typeof openStore>>;
    expect(store.savedSessions().find((save) => save.storageId === `session:${goodId}`)?.load).toEqual({ kind: 'loadable' });
    expect(store.savedSessions().find((save) => save.storageId === `session:${badId}`)).toMatchObject({
      contents: 'undecodable', load: { kind: 'refused', refusal: { kind: 'load_failed' } },
    });
    expect(() => store.exportedStored(`session:${badId}`, encounterSessionId(badId))).toThrow();
    store.close();
    expect(new Uint8Array(await rawRecord(indexedDb, `review-f3-${damage}`, key))).toEqual(rawBefore);
  });

  it('F3 malformed storage key is listed under a named unreadable entry and retained', async () => {
    const indexedDb = new IDBFactory();
    const name = 'review-f3-invalid-key';
    const badKey = 'not-a-revision-key';
    const bytes = await gzip('{"unreadable":true}');
    (await openStore(indexedDb, name, BUILD_B)).close();
    await putRawRecord(indexedDb, name, badKey, bytes);
    const store = await openStore(indexedDb, name, BUILD_B);
    expect(store.savedSessions()).toEqual([expect.objectContaining({
      name: `Unreadable revision key (${badKey})`, contents: 'undecodable',
      load: { kind: 'refused', refusal: expect.objectContaining({ kind: 'load_failed' }) },
    })]);
    store.close();
    expect(new Uint8Array(await rawRecord(indexedDb, name, badKey))).toEqual(new Uint8Array(bytes));
  });

  it('B1 foreign revision at A canonical key blocks A import and preserves B bytes', async () => {
    const indexedDb = new IDBFactory();
    const name = 'review-b1-foreign-key';
    const a = s();
    const aId = encounterSessionId(String(a[0]!.sessionId));
    const bRecorder = new MemoryBrowserSessionStore(BUILD_A);
    const bId = importSavedSession(bRecorder, inputs.fixtures.readText(LR_SQUEEZED_V12));
    await seedStream(indexedDb, name, [canonicalJson(bRecorder.revisions(bId)[0]!)], 'B campaign', BUILD_B);
    const bKey = `${bId}\u0000000000000001`;
    const aKey = `${aId}\u0000000000000001`;
    await moveRawRecord(indexedDb, name, bKey, aKey);
    const bBytes = new Uint8Array(await rawRecord(indexedDb, name, aKey));
    const store = await openStore(indexedDb, name, BUILD_B);
    let refused = false;
    try { store.import(bundle(a)); } catch { refused = true; }
    await store.flush();
    const heldA = store.heldSession(aId);
    const heldB = store.heldSession(bId);
    const saves = store.savedSessions();
    store.close();
    expect(refused).toBe(true);
    expect(heldA).toEqual({ kind: 'undecodable' });
    expect(heldB).toEqual({ kind: 'undecodable' });
    expect(saves.find((save) => save.storageId === `session:${aId}`)?.load.kind).toBe('refused');
    expect(saves.find((save) => save.storageId === `session:${bId}`)?.load.kind).toBe('refused');
    expect(new Uint8Array(await rawRecord(indexedDb, name, aKey))).toEqual(bBytes);
  });

  it('B1 deleting a stream removes its actual noncanonical revision key', async () => {
    const indexedDb = new IDBFactory();
    const name = 'review-b1-delete-key';
    const bRecorder = new MemoryBrowserSessionStore(BUILD_A);
    const bId = importSavedSession(bRecorder, inputs.fixtures.readText(LR_SQUEEZED_V12));
    await seedStream(indexedDb, name, [canonicalJson(bRecorder.revisions(bId)[0]!)], 'B campaign', BUILD_B);
    const orphanKey = 'orphan-revision-key';
    await moveRawRecord(indexedDb, name, `${bId}\u0000000000000001`, orphanKey);
    const store = await openStore(indexedDb, name, BUILD_B);
    expect(store.savedSessions().find((save) => save.storageId === `session:${bId}`)?.load).toEqual({ kind: 'loadable' });
    await store.remove(bId);
    store.close();
    expect(await rawRecordCount(indexedDb, name, orphanKey)).toBe(0);
  });

  it('B1 replacing a stream removes its actual noncanonical revision key', async () => {
    const indexedDb = new IDBFactory();
    const name = 'review-b1-replace-key';
    const bRecorder = new MemoryBrowserSessionStore(BUILD_A);
    const bId = importSavedSession(bRecorder, inputs.fixtures.readText(LR_SQUEEZED_V12));
    await seedStream(indexedDb, name, [canonicalJson(bRecorder.revisions(bId)[0]!)], 'B campaign', BUILD_B);
    const orphanKey = 'orphan-revision-key';
    const canonicalKey = `${bId}\u0000000000000001`;
    await moveRawRecord(indexedDb, name, canonicalKey, orphanKey);
    const storageId = `per_round:${bId}:000000000001:encounter_start`;
    await putSnapshot(indexedDb, name, {
      sessionId: bId, fingerprint: 'f'.repeat(64), revisionCount: 1, room: null, round: 0, initialSeed: 0,
      storageId, trigger: 'encounter_start', pool: 'per_round', name: 'Start',
      updatedAt: '2026-09-20T10:01:00.000Z', retention: { kind: 'named' },
      restorePoint: { kind: 'own_save', text: exportSavedSession(bRecorder, bId) },
    });
    const store = await openStore(indexedDb, name, BUILD_B);
    expect(store.savedSessions().find((save) => save.storageId === `session:${bId}`)?.load).toEqual({ kind: 'loadable' });
    await store.restoreStored(storageId, bId);
    store.close();
    expect(await rawRecordCount(indexedDb, name, orphanKey)).toBe(0);
    expect(await rawRecordCount(indexedDb, name, canonicalKey)).toBe(1);
  });
});
