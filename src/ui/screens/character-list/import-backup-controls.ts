import type { CatalogImportSummary } from '../../../catalog/catalog-importer';
import type { CatalogClient } from '../../../catalog/client';
import { createCatalogClient } from '../../../catalog/client';
import type {
  CharacterBackupDocument,
  CharacterImportResult,
} from '../../../backup/character-backup';
import type { BackupClient } from '../../../backup/client';
import { createBackupClient } from '../../../backup/client';
import {
  DATABASE_BACKUP_FORMAT,
  DATABASE_BACKUP_VERSION,
} from '../../../backup/backup-version';
import type { DatabaseBackup } from '../../../backup/database-backup';
import type { CharacterSummary } from '../../../domain/read-models';
import type { RpcClient } from '../../../rpc/client';
import { element, listen, type Cleanup } from '../../dom';

export interface ReadableFile {
  readonly name: string;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface SavedFile {
  readonly filename: string;
  readonly contents: Blob;
}

export interface ImportBackupServices {
  readonly catalog: Pick<CatalogClient, 'importCatalog'>;
  readonly backup: Pick<
    BackupClient,
    | 'exportDatabase'
    | 'importDatabase'
    | 'exportCharacter'
    | 'importCharacter'
  >;
  readonly confirm: (message: string) => boolean;
  readonly save: (file: SavedFile) => void;
  readonly now: () => string;
}

export interface ImportBackupControlsOptions {
  readonly rpc: RpcClient;
  readonly characters: readonly CharacterSummary[];
  readonly onPersistedChange: () => void | Promise<void>;
  readonly services?: ImportBackupServices;
}

export interface ImportBackupControls {
  readonly element: HTMLElement;
  updateCharacters(characters: readonly CharacterSummary[]): void;
  readonly cleanup: Cleanup;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeFilename(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || 'character';
}

function saveBrowserFile(file: SavedFile): void {
  const url = URL.createObjectURL(file.contents);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function defaultImportBackupServices(
  rpc: RpcClient,
): ImportBackupServices {
  return {
    catalog: createCatalogClient(rpc),
    backup: createBackupClient(rpc),
    confirm: (message) => window.confirm(message),
    save: saveBrowserFile,
    now: () => new Date().toISOString(),
  };
}

export class ImportBackupController {
  constructor(private readonly services: ImportBackupServices) {}

  async importCatalog(files: readonly ReadableFile[]): Promise<string> {
    if (files.length === 0) {
      throw new TypeError('Choose at least one catalog JSON file.');
    }
    const summary = await this.services.catalog.importCatalog(
      await Promise.all(files.map((file) => file.text())),
    );
    return catalogSummary(summary);
  }

  async exportDatabase(): Promise<void> {
    const backup = await this.services.backup.exportDatabase();
    this.services.save({
      filename: `spell-planner-database-${backup.exported_at.slice(0, 10)}.sqlite3`,
      contents: new Blob([backup.sqlite.slice()], {
        type: 'application/vnd.sqlite3',
      }),
    });
  }

  async importDatabase(file: ReadableFile): Promise<boolean> {
    if (
      !this.services.confirm(
        'Restore this database backup? This replaces every local character and catalog entry.',
      )
    ) {
      return false;
    }
    const backup: DatabaseBackup = {
      format: DATABASE_BACKUP_FORMAT,
      version: DATABASE_BACKUP_VERSION,
      exported_at: this.services.now(),
      sqlite: new Uint8Array(await file.arrayBuffer()),
    };
    await this.services.backup.importDatabase(backup);
    return true;
  }

  async exportCharacter(
    character: Pick<CharacterSummary, 'id' | 'name'>,
  ): Promise<void> {
    const document = await this.services.backup.exportCharacter(character.id);
    this.services.save({
      filename: `${safeFilename(character.name)}-character.json`,
      contents: new Blob([JSON.stringify(document, null, 2)], {
        type: 'application/json',
      }),
    });
  }

  async importCharacter(file: ReadableFile): Promise<CharacterImportResult> {
    let document: unknown;
    try {
      document = JSON.parse(await file.text());
    } catch {
      throw new TypeError('Character backup must contain valid JSON.');
    }
    return this.services.backup.importCharacter(
      document as CharacterBackupDocument,
    );
  }
}

export function catalogSummary(summary: CatalogImportSummary): string {
  return [
    `${summary.created} created`,
    `${summary.updated} updated`,
    `${summary.tombstoned} tombstoned`,
  ].join(', ');
}

function files(input: HTMLInputElement): File[] {
  return input.files === null ? [] : Array.from(input.files);
}

export function createImportBackupControls(
  options: ImportBackupControlsOptions,
): ImportBackupControls {
  const services =
    options.services ?? defaultImportBackupServices(options.rpc);
  const controller = new ImportBackupController(services);
  let characters = [...options.characters];
  const cleanups: Cleanup[] = [];
  const status = element('p', {
    className: 'transfer-status',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const catalogInput = element('input', {
    attributes: {
      type: 'file',
      accept: 'application/json,.json',
      multiple: '',
    },
  });
  const databaseInput = element('input', {
    attributes: {
      type: 'file',
      accept: '.sqlite,.sqlite3,application/vnd.sqlite3',
    },
  });
  const characterInput = element('input', {
    attributes: {
      type: 'file',
      accept: 'application/json,.json',
    },
  });
  const characterSelect = element('select', {
    attributes: {
      'aria-label': 'Character to export',
    },
  });

  function announce(message: string, error = false): void {
    status.textContent = message;
    status.classList.toggle('transfer-error', error);
    status.setAttribute('role', error ? 'alert' : 'status');
  }

  async function run(
    button: HTMLButtonElement,
    action: () => Promise<string>,
  ): Promise<void> {
    if (button.disabled) {
      return;
    }
    button.disabled = true;
    announce('Working…');
    try {
      announce(await action());
    } catch (error) {
      announce(errorMessage(error), true);
    } finally {
      button.disabled = false;
    }
  }

  const catalogButton = element('button', {
    text: 'Import catalog',
    attributes: { type: 'button' },
  });
  cleanups.push(
    listen(catalogButton, 'click', () => {
      void run(catalogButton, async () => {
        const message = await controller.importCatalog(files(catalogInput));
        await options.onPersistedChange();
        catalogInput.value = '';
        return `Catalog imported: ${message}.`;
      });
    }),
  );

  const databaseExportButton = element('button', {
    text: 'Download database backup',
    attributes: { type: 'button' },
  });
  cleanups.push(
    listen(databaseExportButton, 'click', () => {
      void run(databaseExportButton, async () => {
        await controller.exportDatabase();
        return 'Database backup downloaded.';
      });
    }),
  );

  const databaseImportButton = element('button', {
    text: 'Restore database backup',
    attributes: { type: 'button' },
  });
  cleanups.push(
    listen(databaseImportButton, 'click', () => {
      void run(databaseImportButton, async () => {
        const [file] = files(databaseInput);
        if (file === undefined) {
          throw new TypeError('Choose a SQLite database backup.');
        }
        const imported = await controller.importDatabase(file);
        if (!imported) {
          return 'Database restore cancelled.';
        }
        await options.onPersistedChange();
        databaseInput.value = '';
        return 'Database backup restored.';
      });
    }),
  );

  const characterExportButton = element('button', {
    text: 'Download character backup',
    attributes: { type: 'button' },
  });
  cleanups.push(
    listen(characterExportButton, 'click', () => {
      void run(characterExportButton, async () => {
        const characterId = Number(characterSelect.value);
        const character = characters.find(
          (candidate) => candidate.id === characterId,
        );
        if (character === undefined) {
          throw new TypeError('Choose a character to export.');
        }
        await controller.exportCharacter(character);
        return 'Character backup downloaded.';
      });
    }),
  );

  const characterImportButton = element('button', {
    text: 'Import character backup',
    attributes: { type: 'button' },
  });
  cleanups.push(
    listen(characterImportButton, 'click', () => {
      void run(characterImportButton, async () => {
        const [file] = files(characterInput);
        if (file === undefined) {
          throw new TypeError('Choose a character JSON backup.');
        }
        const imported = await controller.importCharacter(file);
        await options.onPersistedChange();
        characterInput.value = '';
        return `Character imported as #${imported.characterId}.`;
      });
    }),
  );

  const control = (
    title: string,
    input: HTMLElement,
    button: HTMLButtonElement,
  ): HTMLElement =>
    element('div', { className: 'transfer-control' }, [
      element('label', {}, [element('span', { text: title }), input]),
      button,
    ]);

  const root = element('details', { className: 'transfer-panel' }, [
    element('summary', { text: 'Import and backups' }),
    element('div', { className: 'transfer-grid' }, [
      control('Catalog JSON', catalogInput, catalogButton),
      control('Restore complete database', databaseInput, databaseImportButton),
      element('div', { className: 'transfer-control' }, [
        element('span', { text: 'Back up complete database' }),
        databaseExportButton,
      ]),
      control('Import one character', characterInput, characterImportButton),
      element('div', { className: 'transfer-control' }, [
        element('label', {}, [
          element('span', { text: 'Back up one character' }),
          characterSelect,
        ]),
        characterExportButton,
      ]),
    ]),
    status,
  ]);

  const updateCharacters = (
    nextCharacters: readonly CharacterSummary[],
  ): void => {
    characters = [...nextCharacters];
    clearSelect(characterSelect, characters);
    const empty = characters.length === 0;
    characterSelect.disabled = empty;
    characterExportButton.disabled = empty;
  };
  updateCharacters(characters);

  return {
    element: root,
    updateCharacters,
    cleanup: () => {
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
    },
  };
}

function clearSelect(
  select: HTMLSelectElement,
  characters: readonly CharacterSummary[],
): void {
  select.replaceChildren();
  if (characters.length === 0) {
    select.append(element('option', { text: 'No characters' }));
    return;
  }
  for (const character of characters) {
    select.append(
      element('option', {
        text: character.name,
        attributes: { value: String(character.id) },
      }),
    );
  }
}
