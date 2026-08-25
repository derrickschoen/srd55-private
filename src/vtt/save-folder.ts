import {
  decodeSavedSessionFingerprint,
} from './session-persistence';
import type { SaveManagerEntry, SaveManagerMode } from './save-manager';

const DATABASE_NAME = 'srd55-vtt-save-manager';
const STORE_NAME = 'directory-handles';
const DEFAULT_HANDLE_KEY = 'default-save-folder';
const SAVE_SUFFIX = '.vtt.json';

type DirectoryPermissionHandle = FileSystemDirectoryHandle & {
  queryPermission?: (options: { readonly mode: 'readwrite' }) => Promise<PermissionState>;
};

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<readonly [string, FileSystemHandle]>;
};

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker(options?: {
    readonly id?: string;
    readonly mode?: 'read' | 'readwrite';
  }): Promise<FileSystemDirectoryHandle>;
}

export interface DirectoryHandlePersistence {
  load(): Promise<FileSystemDirectoryHandle | null>;
  save(handle: FileSystemDirectoryHandle): Promise<void>;
}

function request<T>(
  transaction: IDBTransaction,
  operation: IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.addEventListener('success', () => resolve(operation.result), { once: true });
    operation.addEventListener('error', () => reject(operation.error), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error), { once: true });
  });
}

export class IndexedDbDirectoryHandlePersistence implements DirectoryHandlePersistence {
  constructor(private readonly indexedDb: IDBFactory) {}

  async load(): Promise<FileSystemDirectoryHandle | null> {
    const database = await this.#open();
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const value = await request(
        transaction,
        transaction.objectStore(STORE_NAME).get(DEFAULT_HANDLE_KEY),
      );
      return this.#isDirectoryHandle(value) ? value : null;
    } finally {
      database.close();
    }
  }

  async save(handle: FileSystemDirectoryHandle): Promise<void> {
    const database = await this.#open();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      await request(
        transaction,
        transaction.objectStore(STORE_NAME).put(handle, DEFAULT_HANDLE_KEY),
      );
    } finally {
      database.close();
    }
  }

  #open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const opening = this.indexedDb.open(DATABASE_NAME, 1);
      opening.addEventListener('upgradeneeded', () => {
        if (!opening.result.objectStoreNames.contains(STORE_NAME)) {
          opening.result.createObjectStore(STORE_NAME);
        }
      });
      opening.addEventListener('success', () => resolve(opening.result), { once: true });
      opening.addEventListener('error', () => reject(opening.error), { once: true });
    });
  }

  #isDirectoryHandle(value: unknown): value is FileSystemDirectoryHandle {
    return typeof value === 'object' && value !== null &&
      Reflect.get(value, 'kind') === 'directory' &&
      typeof Reflect.get(value, 'getFileHandle') === 'function';
  }
}

export class SaveFolderRepository {
  #handle: FileSystemDirectoryHandle | null = null;
  #mode: SaveManagerMode;

  constructor(
    private readonly persistence: DirectoryHandlePersistence,
    private readonly windowObject: Window,
  ) {
    this.#mode = this.#supportsPicker()
      ? { kind: 'fallback', reason: 'not_selected' }
      : { kind: 'fallback', reason: 'unsupported' };
  }

  mode(): SaveManagerMode {
    return this.#mode;
  }

  async restore(): Promise<SaveManagerMode> {
    if (!this.#supportsPicker()) return this.#mode;
    const handle = await this.persistence.load();
    if (handle === null) return this.#mode;
    const permission = await this.#permission(handle);
    if (permission !== 'granted') {
      this.#mode = { kind: 'fallback', reason: 'permission_denied' };
      return this.#mode;
    }
    this.#accept(handle);
    return this.#mode;
  }

  async choose(): Promise<SaveManagerMode> {
    if (!this.#supportsPicker()) return this.#mode;
    const handle = await (this.windowObject as unknown as DirectoryPickerWindow)
      .showDirectoryPicker({ id: 'srd55-vtt-saves', mode: 'readwrite' });
    this.#accept(handle);
    await this.persistence.save(handle);
    return this.#mode;
  }

  async list(): Promise<readonly SaveManagerEntry[]> {
    if (this.#handle === null) return [];
    const saves: SaveManagerEntry[] = [];
    for await (const [filename, handle] of (
      this.#handle as unknown as IterableDirectoryHandle
    ).entries()) {
      if (handle.kind !== 'file' || !filename.endsWith(SAVE_SUFFIX)) continue;
      const file = await (handle as FileSystemFileHandle).getFile();
      const bytes = await file.text();
      const decoded = decodeSavedSessionFingerprint(bytes);
      saves.push({
        ...decoded,
        id: `folder:${filename}`,
        source: 'folder',
        name: filename.slice(0, -SAVE_SUFFIX.length),
        updatedAt: new Date(file.lastModified).toISOString(),
        bytes,
      });
    }
    return saves;
  }

  async write(name: string, bytes: string): Promise<string> {
    const directory = this.#requireHandle();
    const filename = this.#filename(name);
    const file = await directory.getFileHandle(filename, { create: true });
    const writable = await file.createWritable();
    await writable.write(bytes);
    await writable.close();
    return filename;
  }

  async rename(save: SaveManagerEntry, name: string): Promise<void> {
    if (save.source !== 'folder') throw new Error('Only folder saves can be renamed here.');
    if (save.bytes === undefined) throw new Error('Folder save has no file contents.');
    const oldFilename = save.id.slice('folder:'.length);
    const requestedFilename = this.#filename(name);
    if (requestedFilename !== oldFilename && await this.#fileExists(requestedFilename)) {
      throw new Error(`A folder save named ${name.trim()} already exists.`);
    }
    const newFilename = await this.write(name, save.bytes);
    if (newFilename !== oldFilename) await this.#requireHandle().removeEntry(oldFilename);
  }

  async delete(save: SaveManagerEntry): Promise<void> {
    if (save.source !== 'folder') throw new Error('Only folder saves can be deleted here.');
    await this.#requireHandle().removeEntry(save.id.slice('folder:'.length));
  }

  #supportsPicker(): boolean {
    return typeof Reflect.get(this.windowObject, 'showDirectoryPicker') === 'function';
  }

  async #permission(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
    const query = (handle as DirectoryPermissionHandle).queryPermission;
    return query === undefined ? 'granted' : query.call(handle, { mode: 'readwrite' });
  }

  #accept(handle: FileSystemDirectoryHandle): void {
    this.#handle = handle;
    this.#mode = { kind: 'folder', folderName: handle.name, permission: 'granted' };
  }

  #requireHandle(): FileSystemDirectoryHandle {
    if (this.#handle === null) throw new Error('No default save folder is available.');
    return this.#handle;
  }

  async #fileExists(filename: string): Promise<boolean> {
    try {
      await this.#requireHandle().getFileHandle(filename);
      return true;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return false;
      throw error;
    }
  }

  #filename(name: string): string {
    const safe = name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-');
    if (safe.length === 0) throw new Error('A save name cannot be empty.');
    return `${safe}${SAVE_SUFFIX}`;
  }
}
