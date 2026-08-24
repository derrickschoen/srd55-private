import type { EncounterSessionId } from '../combat/values';

export type SaveSource = 'browser' | 'folder';

export type SaveManagerMode =
  | {
      readonly kind: 'folder';
      readonly folderName: string;
      readonly permission: 'granted';
    }
  | {
      readonly kind: 'fallback';
      readonly reason: 'unsupported' | 'not_selected' | 'permission_denied';
    };

export interface SaveManagerEntry {
  readonly id: string;
  readonly source: SaveSource;
  readonly name: string;
  readonly updatedAt: string;
  readonly sessionId: EncounterSessionId;
  readonly fingerprint: string;
  readonly revisionCount: number;
  readonly room: number | null;
  readonly round: number;
  readonly bytes: string;
}

export interface SaveManagerRow extends SaveManagerEntry {
  readonly badge: SaveSource;
  readonly summary: string;
  readonly timestampLabel: string;
  readonly actions: readonly ['load', 'rename', 'delete', 'export_copy'];
}

export interface SaveManagerViewModel {
  readonly mode: SaveManagerMode;
  readonly rows: readonly SaveManagerRow[];
  readonly lastAutosaveAt: string | null;
  readonly pendingDelete: null | {
    readonly saveId: string;
    readonly requiredText: string;
  };
  readonly primarySaveIntent: 'save_now_to_folder' | 'download_current';
  readonly transferIntents: readonly ('choose_folder' | 'upload_file')[];
}

export function buildSaveManagerViewModel(input: {
  readonly browser: readonly SaveManagerEntry[];
  readonly folder: readonly SaveManagerEntry[];
  readonly mode: SaveManagerMode;
  readonly pendingDelete?: SaveManagerViewModel['pendingDelete'];
}): SaveManagerViewModel {
  const rows = [...input.browser, ...input.folder]
    .sort((left, right) => {
      const newest = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      return newest === 0 ? left.id.localeCompare(right.id) : newest;
    })
    .map((save): SaveManagerRow => ({
      ...save,
      badge: save.source,
      summary: save.room === null
        ? `Round ${String(save.round)}`
        : `Room ${String(save.room)} · Round ${String(save.round)}`,
      timestampLabel: new Date(save.updatedAt).toLocaleString('en-US'),
      actions: ['load', 'rename', 'delete', 'export_copy'],
    }));
  const lastAutosaveAt = input.browser
    .map((save) => save.updatedAt)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  return {
    mode: input.mode,
    rows,
    lastAutosaveAt,
    pendingDelete: input.pendingDelete ?? null,
    primarySaveIntent: input.mode.kind === 'folder'
      ? 'save_now_to_folder'
      : 'download_current',
    transferIntents: input.mode.kind === 'folder'
      ? []
      : ['choose_folder', 'upload_file'],
  };
}

export type SaveManagerIntent =
  | { readonly kind: 'load'; readonly saveId: string }
  | { readonly kind: 'rename'; readonly saveId: string; readonly name: string }
  | { readonly kind: 'request_delete'; readonly saveId: string }
  | { readonly kind: 'confirm_delete'; readonly saveId: string; readonly typedName: string }
  | { readonly kind: 'cancel_delete' }
  | { readonly kind: 'export_copy'; readonly saveId: string }
  | { readonly kind: 'save_now' }
  | { readonly kind: 'choose_folder' }
  | { readonly kind: 'upload_file' };

export interface SaveManagerOperations {
  load(save: SaveManagerEntry): void | Promise<void>;
  rename(save: SaveManagerEntry, name: string): void | Promise<void>;
  delete(save: SaveManagerEntry): void | Promise<void>;
  exportCopy(save: SaveManagerEntry): void | Promise<void>;
  saveNow(): void | Promise<void>;
  chooseFolder(): void | Promise<void>;
  uploadFile(): void | Promise<void>;
}

export class SaveManagerController {
  #pendingDelete: SaveManagerViewModel['pendingDelete'] = null;

  constructor(
    private readonly saves: ReadonlyMap<string, SaveManagerEntry>,
    private readonly operations: SaveManagerOperations,
  ) {}

  pendingDelete(): SaveManagerViewModel['pendingDelete'] {
    return this.#pendingDelete;
  }

  async dispatch(intent: SaveManagerIntent): Promise<void> {
    switch (intent.kind) {
      case 'load':
        await this.operations.load(this.#save(intent.saveId));
        return;
      case 'rename':
        await this.operations.rename(this.#save(intent.saveId), intent.name);
        return;
      case 'request_delete': {
        const save = this.#save(intent.saveId);
        this.#pendingDelete = { saveId: save.id, requiredText: save.name };
        return;
      }
      case 'confirm_delete': {
        const pending = this.#pendingDelete;
        if (
          pending === null ||
          pending.saveId !== intent.saveId ||
          pending.requiredText !== intent.typedName
        ) {
          return;
        }
        this.#pendingDelete = null;
        await this.operations.delete(this.#save(intent.saveId));
        return;
      }
      case 'cancel_delete':
        this.#pendingDelete = null;
        return;
      case 'export_copy':
        await this.operations.exportCopy(this.#save(intent.saveId));
        return;
      case 'save_now':
        await this.operations.saveNow();
        return;
      case 'choose_folder':
        await this.operations.chooseFolder();
        return;
      case 'upload_file':
        await this.operations.uploadFile();
        return;
    }
  }

  #save(saveId: string): SaveManagerEntry {
    const save = this.saves.get(saveId);
    if (save === undefined) throw new Error(`Unknown save-manager row ${saveId}.`);
    return save;
  }
}
