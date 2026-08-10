import type { CatalogImportSummary } from '../../../catalog/catalog-importer';
import type {
  CatalogImportCommitResult,
  CatalogImportResult,
} from '../../../catalog/catalog-importer';
import type { CatalogClient } from '../../../catalog/client';
import { createCatalogClient } from '../../../catalog/client';
import type {
  CharacterBackupDocument,
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
import { encodePartyDocument } from '../../../party/storage/document-bytes';
import { element, listen, type Cleanup } from '../../dom';
import type {
  ContentImportEntryOutcome,
  ContentImportPlan,
} from '../../../catalog/content-adoption';
import { createContentAdoptionDialog } from '../../content-adoption-dialog';
import type { BundledHomebrewClient } from '../../../authoring/client';
import { createAuthoringClient } from '../../../authoring/client';
import type { BundledHomebrewInstallPlan } from '../../../authoring/bundled-homebrew-installer';
import { LIBRARY_EXPORT_FORMAT } from '../../../backup/portable-content';

export const LIBRARY_IMPORT_ROUTE = '/?import=library';

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
  readonly catalog: Pick<CatalogClient, 'importCatalog'> & Partial<Pick<
    CatalogClient,
    'planImport' | 'commitImport' | 'listMatchDecisions' | 'forgetMatchDecision'
  >>;
  readonly backup: Pick<
    BackupClient,
    | 'exportDatabase'
    | 'importDatabase'
    | 'exportCharacter'
    | 'planCharacterImport'
    | 'commitCharacterImport'
  > & Partial<Pick<
    BackupClient,
    'importLibrary' | 'planLibraryImport' | 'commitLibraryImport'
  >>;
  readonly authoring?: Pick<
    BundledHomebrewClient,
    'previewBundledHomebrew' | 'installBundledHomebrew'
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
  focusLibraryImport(): void;
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
    authoring: createAuthoringClient(rpc),
    confirm: (message) => window.confirm(message),
    save: saveBrowserFile,
    now: () => new Date().toISOString(),
  };
}

export class ImportBackupController {
  constructor(private readonly services: ImportBackupServices) {}

  async importCatalog(files: readonly ReadableFile[]): Promise<string> {
    const prepared = await this.prepareCatalogImport(files);
    if (isContentImportPlan(prepared.result)) {
      throw new TypeError('Catalog import requires content-adoption review.');
    }
    return catalogSummary(prepared.result);
  }

  async prepareCatalogImport(files: readonly ReadableFile[]): Promise<{
    readonly documents: readonly string[];
    readonly result: CatalogImportResult;
  }> {
    if (files.length === 0) {
      throw new TypeError('Choose at least one catalog JSON file.');
    }
    const documents = await Promise.all(files.map((file) => file.text()));
    if (documents.some(isLibraryExportText)) {
      throw new TypeError(
        'This file is a library export. Use the Library JSON importer.',
      );
    }
    return {
      documents,
      result: await this.services.catalog.importCatalog(documents),
    };
  }

  async prepareLibraryImport(file: ReadableFile): Promise<{
    readonly document: unknown;
    readonly plan: Awaited<ReturnType<BackupClient['planLibraryImport']>>;
  }> {
    if (this.services.backup.planLibraryImport === undefined) {
      throw new TypeError('Library import services are unavailable.');
    }
    let document: unknown;
    try {
      document = JSON.parse(await file.text());
    } catch {
      throw new TypeError('Library export must contain valid JSON.');
    }
    if (Array.isArray(document)) {
      throw new TypeError(
        'This file is a catalog document. Use the Catalog JSON importer.',
      );
    }
    return {
      document,
      plan: await this.services.backup.planLibraryImport(document, {}),
    };
  }

  async exportDatabase(): Promise<void> {
    const backup = await this.services.backup.exportDatabase();
    this.services.save({
      filename: `srd-55-database-${backup.exported_at.slice(0, 10)}.sqlite3`,
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
      contents: new Blob([encodePartyDocument(document).slice()], {
        type: 'application/json',
      }),
    });
  }

  async prepareCharacterImport(file: ReadableFile): Promise<{
    readonly document: CharacterBackupDocument;
    readonly plan: ContentImportPlan;
  }> {
    const document = await this.readCharacterDocument(file);
    return {
      document,
      plan: await this.services.backup.planCharacterImport(document, {}),
    };
  }

  private async readCharacterDocument(
    file: ReadableFile,
  ): Promise<CharacterBackupDocument> {
    let document: unknown;
    try {
      document = JSON.parse(await file.text());
    } catch {
      throw new TypeError('Character backup must contain valid JSON.');
    }
    return document as CharacterBackupDocument;
  }
}

function isLibraryExportText(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === 'object' &&
      !Array.isArray(value) &&
      Reflect.get(value, 'format') === LIBRARY_EXPORT_FORMAT;
  } catch {
    return false;
  }
}

export function isContentImportPlan(
  value: CatalogImportResult,
): value is ContentImportPlan {
  return 'token' in value && Array.isArray(value.reviews) &&
    Array.isArray(value.outcomes);
}

/**
 * THE THREE SPELL NUMBERS ALWAYS, AND THE SUBCLASS NUMBERS ONLY WHEN THERE ARE
 * ANY.
 *
 * Adding "0 subclasses" to every spell import would be noise on the overwhelming
 * majority of imports, and folding subclasses into `created` would make the
 * spell count wrong — see `CatalogImportSummary`. The clause is appended rather
 * than interleaved so the sentence a user has read for every previous import is
 * unchanged when nothing new happened.
 */
/**
 * `1 subclass`, `0 subclasses`, `2 subclasses`. The three spell numbers carry no
 * noun and so need none of this; the subclass clauses do, and "1 subclasses
 * created" is the string a user actually sees on the common case of importing
 * one homebrew subclass.
 */
function subclasses(count: number): string {
  return `${count} subclass${count === 1 ? '' : 'es'}`;
}

export function catalogSummary(summary: CatalogImportSummary): string {
  const parts = [
    `${summary.created} created`,
    `${summary.updated} updated`,
    `${summary.tombstoned} tombstoned`,
  ];
  if (summary.subclasses_created > 0 || summary.subclasses_updated > 0) {
    parts.push(
      `${subclasses(summary.subclasses_created)} created`,
      `${subclasses(summary.subclasses_updated)} updated`,
    );
  }
  const equipmentCreated =
    summary.weapons_created + summary.armors_created + summary.items_created;
  const equipmentMatched =
    summary.weapons_matched + summary.armors_matched + summary.items_matched;
  if (equipmentCreated > 0 || equipmentMatched > 0) {
    parts.push(
      `${String(equipmentCreated)} equipment definitions created`,
      `${String(equipmentMatched)} equipment definitions matched`,
    );
  }
  const sourcesCreated =
    summary.feats_created + summary.species_created + summary.backgrounds_created;
  const sourcesMatched =
    summary.classes_matched + summary.feats_matched + summary.species_matched +
    summary.backgrounds_matched;
  if (sourcesCreated > 0 || sourcesMatched > 0) {
    parts.push(
      `${String(sourcesCreated)} source definitions created`,
      `${String(sourcesMatched)} source definitions matched`,
    );
  }
  return parts.join(', ');
}

export function librarySummary(
  outcomes: readonly ContentImportEntryOutcome[],
): string {
  const created = outcomes.filter((outcome) => outcome.kind === 'create').length;
  const matched = outcomes.filter((outcome) =>
    outcome.kind === 'match' || outcome.kind === 'remembered-match' ||
    outcome.kind === 'remembered-clone' || outcome.kind === 'review'
  ).length;
  return `${String(created)} published, ${String(matched)} matched existing`;
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
  let adoptionCleanup: Cleanup | undefined;
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
  const libraryInput = element('input', {
    attributes: {
      type: 'file',
      accept: 'application/json,.json',
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
        const prepared = await controller.prepareCatalogImport(files(catalogInput));
        if (!isContentImportPlan(prepared.result)) {
          await options.onPersistedChange();
          catalogInput.value = '';
          return `Catalog imported: ${catalogSummary(prepared.result)}.`;
        }
        if (prepared.result.reviews.length === 0) {
          throw new TypeError('Catalog import was refused before adoption review.');
        }
        if (
          services.catalog.planImport === undefined ||
          services.catalog.commitImport === undefined
        ) {
          throw new TypeError('Catalog adoption services are unavailable.');
        }
        adoptionCleanup?.();
        const rendered = createContentAdoptionDialog({
          mount: root,
          plan: prepared.result,
          replan: (choices) => services.catalog.planImport!(
            prepared.documents,
            choices,
          ),
          commit: (plan, choices) => services.catalog.commitImport!(
            prepared.documents,
            plan.token,
            choices,
          ),
          onCommitted: async (result) => {
            const catalogResult = result as typeof result &
              Extract<CatalogImportCommitResult, { readonly kind: 'committed' }>;
            await options.onPersistedChange();
            catalogInput.value = '';
            announce(`Catalog imported: ${catalogSummary(catalogResult.summary)}.`);
          },
          onCancel: () => announce('Catalog import cancelled.'),
        });
        adoptionCleanup = rendered.cleanup;
        return 'Review each matching catalog entry before importing.';
      });
    }),
  );

  const libraryButton = element('button', {
    text: 'Import library',
    attributes: { type: 'button' },
  });
  cleanups.push(
    listen(libraryButton, 'click', () => {
      void run(libraryButton, async () => {
        const [file] = files(libraryInput);
        if (file === undefined) {
          throw new TypeError('Choose a library JSON export.');
        }
        const prepared = await controller.prepareLibraryImport(file);
        const directImport = services.backup.importLibrary;
        const replan = services.backup.planLibraryImport;
        const commit = services.backup.commitLibraryImport;
        if (
          directImport === undefined || replan === undefined ||
          commit === undefined
        ) {
          throw new TypeError('Library import services are unavailable.');
        }
        const hasRefusal = prepared.plan.outcomes.some(
          (outcome) => outcome.kind === 'refused',
        );
        if (prepared.plan.reviews.length === 0 && !hasRefusal) {
          const result = await directImport(prepared.document);
          await options.onPersistedChange();
          libraryInput.value = '';
          return `Library imported: ${librarySummary(result.outcomes)}.`;
        }
        adoptionCleanup?.();
        const rendered = createContentAdoptionDialog({
          mount: root,
          plan: prepared.plan,
          replan: (choices) => replan(prepared.document, choices),
          commit: (plan, choices) => commit(
            prepared.document,
            plan.token,
            choices,
          ),
          onCommitted: async (result) => {
            await options.onPersistedChange();
            libraryInput.value = '';
            announce(`Library imported: ${librarySummary(result.outcomes)}.`);
          },
          onCancel: () => announce('Library import cancelled.'),
        });
        adoptionCleanup = rendered.cleanup;
        return prepared.plan.reviews.length === 0
          ? 'Review the refused library import before continuing.'
          : 'Review each colliding library entry before importing.';
      });
    }),
  );

  const bundledHomebrewButton = element('button', {
    text: 'Import bundled homebrew',
    attributes: { type: 'button' },
  });

  function bundledEntrySummary(plan: BundledHomebrewInstallPlan): HTMLElement {
    const summary = element('section', {
      className: 'bundled-homebrew-entry-summary',
      attributes: { 'aria-label': 'Bundled homebrew entries' },
    }, [element('h3', { text: 'Entries' })]);
    const list = element('ul');
    for (const entry of plan.entries) {
      list.append(element('li', {
        text: `${entry.name} — ${entry.kind}; external homebrew; ${entry.outcome.replaceAll('_', ' ')}` +
          (entry.error === null ? '' : `; ${entry.error}`),
      }));
    }
    summary.append(list);
    return summary;
  }

  cleanups.push(listen(bundledHomebrewButton, 'click', () => {
    if (bundledHomebrewButton.disabled) return;
    bundledHomebrewButton.disabled = true;
    announce('Previewing bundled homebrew…');
    const authoring = services.authoring;
    if (authoring === undefined) {
      announce('Bundled homebrew services are unavailable.', true);
      bundledHomebrewButton.disabled = false;
      return;
    }
    void authoring.previewBundledHomebrew().then((plan) => {
      adoptionCleanup?.();
      const rendered = createContentAdoptionDialog({
        mount: root,
        plan,
        replan: () => authoring.previewBundledHomebrew(),
        commit: (submitted) => authoring.installBundledHomebrew({ token: submitted.token }),
        renderPlanDetails: (submitted) => bundledEntrySummary(
          submitted as BundledHomebrewInstallPlan,
        ),
        onCommitted: async (result) => {
          await options.onPersistedChange();
          const matched = result.outcomes.filter((outcome) =>
            outcome.kind === 'match' || outcome.kind === 'remembered-match').length;
          const created = result.outcomes.filter((outcome) => outcome.kind === 'create').length;
          announce(`Bundled homebrew imported: ${String(created)} published, ${String(matched)} matched existing.`);
          bundledHomebrewButton.disabled = false;
        },
        onCancel: () => {
          announce('Bundled homebrew import cancelled.');
          bundledHomebrewButton.disabled = false;
        },
      });
      adoptionCleanup = rendered.cleanup;
      announce('Review three bundled homebrew entries before importing.');
    }).catch((error: unknown) => {
      announce(errorMessage(error), true);
      bundledHomebrewButton.disabled = false;
    });
  }));

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
        const prepared = await controller.prepareCharacterImport(file);
        const showAdoptionDialog = (plan: ContentImportPlan): void => {
          adoptionCleanup?.();
          const rendered = createContentAdoptionDialog({
            mount: root,
            plan,
            replan: (choices) => services.backup.planCharacterImport(
              prepared.document,
              choices,
            ),
            commit: (submitted, choices) => services.backup.commitCharacterImport(
              prepared.document,
              submitted.token,
              choices,
            ),
            onCommitted: async (result) => {
              const committed = result as Extract<
                Awaited<ReturnType<BackupClient['commitCharacterImport']>>,
                { readonly kind: 'committed' }
              >;
              await options.onPersistedChange();
              characterInput.value = '';
              announce(`Character imported as #${committed.result.characterId}.`);
            },
            onCancel: () => announce('Character import cancelled.'),
          });
          adoptionCleanup = rendered.cleanup;
        };
        const hasRefusal = prepared.plan.outcomes.some(
          (outcome) => outcome.kind === 'refused',
        );
        if (prepared.plan.reviews.length === 0 && !hasRefusal) {
          const committed = await services.backup.commitCharacterImport(
            prepared.document,
            prepared.plan.token,
            {},
          );
          if (committed.kind === 'stale-plan') {
            showAdoptionDialog(committed.freshPlan);
            return 'The catalog changed. Review the refreshed character import.';
          }
          if (committed.kind === 'refused') {
            throw new TypeError('Character import was refused; no changes were committed.');
          }
          await options.onPersistedChange();
          characterInput.value = '';
          return `Character imported as #${committed.result.characterId}.`;
        }
        showAdoptionDialog(prepared.plan);
        return prepared.plan.reviews.length === 0
          ? 'Review the refused character JSON preview before importing.'
          : 'Review each matching content entry before importing.';
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
    element('p', {
      text: 'Character JSON backups include the character and its complete referenced external content. Share links include referenced external content when it fits and warn when it does not.',
    }),
    element('div', { className: 'transfer-grid' }, [
      element('div', { className: 'transfer-control' }, [
        element('label', {}, [element('span', { text: 'Catalog JSON' }), catalogInput]),
        element('div', { className: 'transfer-control-actions' }, [
          catalogButton,
          bundledHomebrewButton,
        ]),
      ]),
      control('Restore complete database', databaseInput, databaseImportButton),
      element('div', { className: 'transfer-control' }, [
        element('span', { text: 'Back up complete database' }),
        databaseExportButton,
      ]),
      control('Import complete character JSON', characterInput, characterImportButton),
      element('div', { className: 'transfer-control' }, [
        element('label', {}, [
          element('span', { text: 'Back up complete character JSON' }),
          characterSelect,
        ]),
        characterExportButton,
      ]),
      control('Library JSON', libraryInput, libraryButton),
    ]),
    status,
  ]);

  const receiptSelect = element('select', {
    attributes: { 'aria-label': 'Remembered catalog match choice' },
  });
  receiptSelect.disabled = true;
  const forgetReceipt = element('button', {
    text: 'Forget remembered choice',
    attributes: { type: 'button' },
  });
  forgetReceipt.disabled = true;
  const refreshReceipts = async (): Promise<void> => {
    receiptSelect.disabled = true;
    forgetReceipt.disabled = true;
    if (services.catalog.listMatchDecisions === undefined) {
      return;
    }
    const receipts = await services.catalog.listMatchDecisions();
    receiptSelect.replaceChildren(...receipts.map((receipt) => element('option', {
      text: `${receipt.kind}: ${receipt.decision} → ${receipt.targetContentKey} ` +
        `(${receipt.scheme} ${receipt.digest.slice(0, 12)}…, reviewed ${receipt.reviewedAt})`,
      attributes: {
        value: JSON.stringify({
          kind: receipt.kind,
          scheme: receipt.scheme,
          digest: receipt.digest,
        }),
      },
    })));
    receiptSelect.disabled = receipts.length === 0;
    forgetReceipt.disabled = receipts.length === 0;
  };
  root.querySelector('.transfer-grid')?.append(element('div', {
    className: 'transfer-control',
  }, [
    element('label', {}, [element('span', { text: 'Remembered catalog choices' }), receiptSelect]),
    forgetReceipt,
  ]));
  cleanups.push(listen(forgetReceipt, 'click', () => {
    void (async () => {
      await run(forgetReceipt, async () => {
        if (services.catalog.forgetMatchDecision === undefined) {
          throw new TypeError('Catalog receipt service is unavailable.');
        }
        const input = JSON.parse(receiptSelect.value) as Parameters<
          NonNullable<typeof services.catalog.forgetMatchDecision>
        >[0];
        const result = await services.catalog.forgetMatchDecision(input);
        return result.forgotten
          ? 'Remembered catalog choice forgotten.'
          : 'That remembered catalog choice no longer exists.';
      });
      try {
        await refreshReceipts();
      } catch (error) {
        announce(errorMessage(error), true);
      }
    })();
  }));
  void refreshReceipts().catch((error: unknown) => announce(errorMessage(error), true));

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
    focusLibraryImport: () => {
      root.open = true;
      root.scrollIntoView?.({ block: 'start' });
      libraryInput.focus();
    },
    cleanup: () => {
      adoptionCleanup?.();
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
