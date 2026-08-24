import { describe, expect, it, vi } from 'vitest';
import { REACTION_KINDS } from '../../../src/combat/encounter';
import { combatantId, encounterSessionId } from '../../../src/combat/values';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import { LocalStorageBrowserSessionStore } from '../../../src/vtt/local-session-store';
import {
  SaveManagerController,
  buildSaveManagerViewModel,
  type SaveManagerEntry,
  type SaveManagerOperations,
} from '../../../src/vtt/save-manager';
import type { PartySessionState } from '../../../src/vtt/party-session-state';

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void { this.#values.delete(key); }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}

const PARTY_COMBATANTS = [1, 2, 3].map((index) => combatantId(`combatant:save-${String(index)}`));
const PARTY_STATE: PartySessionState = {
  schemaVersion: 1,
  rulesEdition: '2024',
  room: 1,
  characters: PARTY_COMBATANTS.map((id, index) => ({
    characterId: index + 1,
    combatantId: id,
    currentHitPoints: 10,
    hitPointMaximum: 10,
    constitutionModifier: 0,
    life: 'living',
    deathSaves: null,
    spellSlots: [],
    limitedResources: [],
    hitDice: [{ sides: 8, maximum: 1, remaining: 1 }],
    consumables: [],
    equipment: null,
  })),
  reactionPolicies: PARTY_COMBATANTS.flatMap((combatant) =>
    REACTION_KINDS.map((reactionKind) => ({ combatant, reactionKind, policy: 'ask' as const }))),
};

function browserFixture(): {
  readonly store: LocalStorageBrowserSessionStore;
  readonly saves: readonly SaveManagerEntry[];
} {
  const storage = new MemoryStorage();
  const store = new LocalStorageBrowserSessionStore(storage);
  for (const [session, name, updatedAt] of [
    ['session:browser-old', 'Browser old', '2042-08-24T10:00:00.000Z'],
    ['session:browser-new', 'Browser new', '2042-08-24T12:00:00.000Z'],
  ] as const) {
    const host = new DmEncounterHost(session, store, { initialPartyState: PARTY_STATE });
    host.close();
    store.rename(encounterSessionId(session), name);
    storage.setItem(
      `srd55:vtt-session-metadata:${session}`,
      JSON.stringify({ name, updatedAt }),
    );
  }
  return {
    store,
    saves: store.savedSessions().map((save) => ({
      ...save,
      id: `browser:${save.sessionId}`,
      source: 'browser',
    })),
  };
}

function folderSave(
  source: SaveManagerEntry,
  name: string,
  updatedAt: string,
): SaveManagerEntry {
  return {
    ...source,
    id: `folder:${name}.vtt.json`,
    source: 'folder',
    name,
    updatedAt,
  };
}

describe('DM save manager', () => {
  it('newest_last: unifies two autosaves and two folder saves newest-first with decoded summaries', () => {
    const fixture = browserFixture();
    const [oldBrowser, newBrowser] = [...fixture.saves].sort(
      (left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt),
    );
    if (oldBrowser === undefined || newBrowser === undefined) {
      throw new Error('Browser save fixture is incomplete.');
    }
    const folder = [
      folderSave(oldBrowser, 'Folder old', '2042-08-24T11:00:00.000Z'),
      folderSave(newBrowser, 'Folder newest', '2042-08-24T13:00:00.000Z'),
    ];

    const model = buildSaveManagerViewModel({
      browser: fixture.saves,
      folder,
      mode: { kind: 'folder', folderName: 'Campaign saves', permission: 'granted' },
    });

    expect(model.rows.map((row) => row.name)).toEqual([
      'Folder newest',
      'Browser new',
      'Folder old',
      'Browser old',
    ]);
    expect(model.rows.map((row) => row.summary)).toEqual([
      'Room 1 · Round 0',
      'Room 1 · Round 0',
      'Room 1 · Round 0',
      'Room 1 · Round 0',
    ]);
    expect(model.lastAutosaveAt).toBe('2042-08-24T12:00:00.000Z');
    expect(model.rows.every((row) => row.fingerprint.length === 64)).toBe(true);
  });

  it('foreign_source_badge: keeps folder and browser provenance visible on unified rows', () => {
    const fixture = browserFixture();
    const source = fixture.saves[0];
    if (source === undefined) throw new Error('Browser save fixture is incomplete.');
    const model = buildSaveManagerViewModel({
      browser: [source],
      folder: [folderSave(source, 'Folder copy', '2042-08-24T14:00:00.000Z')],
      mode: { kind: 'folder', folderName: 'Campaign saves', permission: 'granted' },
    });

    expect(model.rows.map((row) => [row.name, row.badge])).toEqual([
      ['Folder copy', 'folder'],
      [source.name, 'browser'],
    ]);
  });

  it('dispatches load, rename, export, and typed-confirmed delete to their store operations', async () => {
    const fixture = browserFixture();
    const save = fixture.saves[0];
    if (save === undefined) throw new Error('Browser save fixture is incomplete.');
    const operations: SaveManagerOperations = {
      load: vi.fn(),
      rename: vi.fn(),
      delete: vi.fn(),
      exportCopy: vi.fn(),
      saveNow: vi.fn(),
      chooseFolder: vi.fn(),
      uploadFile: vi.fn(),
    };
    const controller = new SaveManagerController(new Map([[save.id, save]]), operations);

    await controller.dispatch({ kind: 'load', saveId: save.id });
    await controller.dispatch({ kind: 'rename', saveId: save.id, name: 'Renamed save' });
    await controller.dispatch({ kind: 'export_copy', saveId: save.id });
    await controller.dispatch({ kind: 'request_delete', saveId: save.id });
    await controller.dispatch({ kind: 'confirm_delete', saveId: save.id, typedName: save.name });

    expect(operations.load).toHaveBeenCalledWith(save);
    expect(operations.rename).toHaveBeenCalledWith(save, 'Renamed save');
    expect(operations.exportCopy).toHaveBeenCalledWith(save);
    expect(operations.delete).toHaveBeenCalledWith(save);
  });

  it('delete_without_confirm: requesting or mistyping confirmation never dispatches delete', async () => {
    const fixture = browserFixture();
    const save = fixture.saves[0];
    if (save === undefined) throw new Error('Browser save fixture is incomplete.');
    const deleteOperation = vi.fn();
    const controller = new SaveManagerController(new Map([[save.id, save]]), {
      load: vi.fn(), rename: vi.fn(), delete: deleteOperation, exportCopy: vi.fn(),
      saveNow: vi.fn(), chooseFolder: vi.fn(), uploadFile: vi.fn(),
    });

    await controller.dispatch({ kind: 'request_delete', saveId: save.id });
    expect(deleteOperation).not.toHaveBeenCalled();
    expect(controller.pendingDelete()).toEqual({ saveId: save.id, requiredText: save.name });
    await controller.dispatch({ kind: 'confirm_delete', saveId: save.id, typedName: 'wrong' });
    expect(deleteOperation).not.toHaveBeenCalled();
  });

  it('fallback mode exposes download and upload intents without a directory handle', () => {
    const model = buildSaveManagerViewModel({
      browser: [],
      folder: [],
      mode: { kind: 'fallback', reason: 'unsupported' },
    });

    expect(model.mode).toEqual({ kind: 'fallback', reason: 'unsupported' });
    expect(model.primarySaveIntent).toBe('download_current');
    expect(model.transferIntents).toEqual(['choose_folder', 'upload_file']);
  });
});
