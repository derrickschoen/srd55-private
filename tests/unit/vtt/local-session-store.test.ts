import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import { LocalStorageBrowserSessionStore } from '../../../src/vtt/local-session-store';

class MemoryStorage implements Storage {
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

describe('local durable VTT session adapter', () => {
  it('starts empty and isolates session keys', () => {
    const storage = new MemoryStorage();
    const store = new LocalStorageBrowserSessionStore(storage);

    expect(store.revisions(encounterSessionId('session:one'))).toEqual([]);
    expect(store.revisions(encounterSessionId('session:two'))).toEqual([]);
  });

  it('RELOAD-REHYDRATES-INCREMENT-5-STORE restores the latest durable coordinator state', () => {
    const storage = new MemoryStorage();
    const firstStore = new LocalStorageBrowserSessionStore(storage);
    const first = new DmEncounterHost('session:reload', firstStore);
    first.interrupt();
    const before = first.snapshot();
    first.close();

    const reopened = new DmEncounterHost(
      'session:reload',
      new LocalStorageBrowserSessionStore(storage),
    );
    const after = reopened.snapshot();

    expect(after.dm.encounter).toEqual(before.dm.encounter);
    expect(after.dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    expect(after.dm.history.length).toBe(before.dm.history.length);
    reopened.close();
  });
});
