import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import { REFERENCE_MONSTER_ID } from '../../../src/vtt/reference-encounter';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import {
  BrowserSessionWriteError,
  IndexedDbBrowserSessionStore,
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

  it('LARGE-REVISION-ROUNDTRIP stores and reloads a revision stream larger than 5MB', async () => {
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
    expect(new TextEncoder().encode(expected).byteLength).toBeGreaterThan(5 * 1024 * 1024);
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

    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), storage);
    const saves = store.savedSessions();
    expect(saves.filter((save) => save.retention.kind === 'autosave' && save.retention.pool === 'per_round')).toHaveLength(10);
    expect(saves.filter((save) => save.retention.kind === 'autosave' && save.retention.pool === 'encounter_boundary')).toHaveLength(10);
    expect(saves.map((save) => save.name).sort()).toEqual([
      ...Array.from({ length: 10 }, (_unused, offset) => `encounter_boundary-${String(offset + 15)}`),
      ...Array.from({ length: 10 }, (_unused, offset) => `per_round-${String(offset + 15)}`),
    ].sort());
    store.close();
  });
});
