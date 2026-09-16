import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import { IndexedDbBrowserSessionStore } from '../../../src/vtt/local-session-store';
import {
  IndexedDbSessionLifecycle,
  type ActiveSessionBinding,
  type SessionLifecycleStore,
} from '../../../src/vtt/session-lifecycle';
import { encounterSeed } from '../../../src/vtt/session-seed';
import {
  MemoryBrowserSessionStore,
  exportSavedSession,
} from '../../../src/vtt/session-persistence';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();
  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void { this.#values.delete(key); }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}

function savedSession(sessionKey: string, seed = 1): {
  readonly sessionId: ReturnType<typeof encounterSessionId>;
  readonly bytes: string;
} {
  const sessionId = encounterSessionId(sessionKey);
  const store = new MemoryBrowserSessionStore();
  const host = new DmEncounterHost(sessionKey, store, {
    initialSeed: encounterSeed(seed),
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  host.interrupt();
  host.close();
  return { sessionId, bytes: exportSavedSession(store, sessionId) };
}

function inactiveBinding(events: string[] = []): ActiveSessionBinding {
  return {
    sessionId: () => null,
    close: () => { events.push('close'); },
  };
}

describe('typed IndexedDB session lifecycle', () => {
  it('orders active deletion as close, flush, remove, then navigation', async () => {
    const events: string[] = [];
    const sessionId = encounterSessionId('session:lifecycle-active-delete');
    const store = {
      savedSessions: () => [],
      renameStored: async () => undefined,
      removeStored: async () => { events.push('remove'); },
      restoreStored: async () => undefined,
      revisions: () => [],
      import: () => sessionId,
      exported: () => '',
      exportedStored: () => '',
      flush: async () => { events.push('flush'); },
    } satisfies SessionLifecycleStore;
    const lifecycle = new IndexedDbSessionLifecycle(store, {
      sessionId: () => sessionId,
      close: () => { events.push('close'); },
    });

    const result = await lifecycle.dispatch({
      kind: 'delete',
      storageId: `session:${sessionId}`,
      sessionId,
    });

    expect(events).toEqual(['close', 'flush', 'remove']);
    expect(result).toEqual({
      kind: 'deleted',
      navigation: { kind: 'open_new_session', deletedSessionId: sessionId },
    });
  });

  it('does not close or navigate when deleting a non-active save', async () => {
    const events: string[] = [];
    const sessionId = encounterSessionId('session:lifecycle-inactive-delete');
    const store = {
      savedSessions: () => [],
      renameStored: async () => undefined,
      removeStored: async () => { events.push('remove'); },
      restoreStored: async () => undefined,
      revisions: () => [],
      import: () => sessionId,
      exported: () => '',
      exportedStored: () => '',
      flush: async () => { events.push('flush'); },
    } satisfies SessionLifecycleStore;
    const lifecycle = new IndexedDbSessionLifecycle(store, inactiveBinding(events));

    await expect(lifecycle.dispatch({
      kind: 'delete', storageId: `session:${sessionId}`, sessionId,
    })).resolves.toEqual({ kind: 'deleted', navigation: null });
    expect(events).toEqual(['flush', 'remove']);
  });

  it('flushes before export and restore and propagates a failed boundary', async () => {
    const events: string[] = [];
    const sessionId = encounterSessionId('session:lifecycle-order');
    let rejectFlush = false;
    const store = {
      savedSessions: () => [],
      renameStored: async () => undefined,
      removeStored: async () => undefined,
      restoreStored: async () => { events.push('restore'); },
      revisions: () => [],
      import: () => sessionId,
      exported: () => '',
      exportedStored: () => { events.push('export'); return 'durable-bytes'; },
      flush: async () => {
        events.push('flush');
        if (rejectFlush) throw new Error('durability failed');
      },
    } satisfies SessionLifecycleStore;
    const lifecycle = new IndexedDbSessionLifecycle(store, inactiveBinding());

    await expect(lifecycle.dispatch({
      kind: 'export', storageId: `session:${sessionId}`, sessionId,
    })).resolves.toEqual({ kind: 'exported', bytes: 'durable-bytes' });
    await expect(lifecycle.dispatch({
      kind: 'restore', storageId: `session:${sessionId}`, sessionId,
    })).resolves.toEqual({ kind: 'restored', activeSession: false });
    expect(events).toEqual(['flush', 'export', 'flush', 'restore']);

    rejectFlush = true;
    await expect(lifecycle.dispatch({
      kind: 'export', storageId: `session:${sessionId}`, sessionId,
    })).rejects.toThrow('durability failed');
    expect(events).toEqual(['flush', 'export', 'flush', 'restore', 'flush']);
  });

  it('distinguishes identical imports, fingerprint conflicts, and corrupt bytes', async () => {
    const indexedDb = new IDBFactory();
    const original = savedSession('session:lifecycle-conflict', 11);
    const conflicting = savedSession('session:lifecycle-conflict', 12);
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, new MemoryStorage(), {
      databaseName: 'lifecycle-conflict',
    });
    const lifecycle = new IndexedDbSessionLifecycle(store, inactiveBinding());

    await expect(lifecycle.dispatch({ kind: 'import', bytes: original.bytes }))
      .resolves.toEqual({ kind: 'imported', sessionId: original.sessionId });
    await expect(lifecycle.dispatch({ kind: 'import', bytes: original.bytes }))
      .resolves.toEqual({ kind: 'duplicate', sessionId: original.sessionId });
    await expect(lifecycle.dispatch({ kind: 'import', bytes: conflicting.bytes }))
      .resolves.toMatchObject({
        kind: 'conflict',
        sessionId: original.sessionId,
      });
    await expect(lifecycle.dispatch({ kind: 'import', bytes: '{broken' })).rejects.toThrow();
    expect(store.exported(original.sessionId)).toBe(original.bytes);
    store.close();
  });

  it('durably imports and preserves the checksummed revision stream after reopen', async () => {
    const indexedDb = new IDBFactory();
    const source = savedSession('session:lifecycle-reopen', 21);
    const storage = new MemoryStorage();
    const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage, {
      databaseName: 'lifecycle-reopen',
    });
    const lifecycle = new IndexedDbSessionLifecycle(store, inactiveBinding());
    await lifecycle.dispatch({ kind: 'import', bytes: source.bytes });
    const checksums = store.revisions(source.sessionId).map((revision) => revision.checksum);
    store.close();

    const reopened = await IndexedDbBrowserSessionStore.open(indexedDb, storage, {
      databaseName: 'lifecycle-reopen',
    });
    expect(reopened.revisions(source.sessionId).map((revision) => revision.checksum)).toEqual(checksums);
    expect(reopened.exported(source.sessionId)).toBe(source.bytes);
    reopened.close();
  });
});
