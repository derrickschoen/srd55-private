import {
  databaseBootFailureMessage,
  type DatabaseBootFailure,
} from '../db/database-worker-boot';

/**
 * THE RECOVERY SCREEN FOR A DEGRADED BOOT.
 *
 * The worker boots degraded when the stored image is one this build will not
 * open — for a catalog data update whose frozen sources changed, the owner
 * accepted a local reset rather than a migration (D923 Q11). While degraded
 * the worker keeps exactly two methods dispatchable, `system.exportDatabase`
 * and `system.reset`. Before this screen existed nothing in the app could
 * call either: the boot rendered "Failed: …", every route stayed behind the
 * database gate, and the accepted reset was reachable only from a developer
 * console. This screen is the owner's way through: it names what is stale,
 * offers the rescue copy, and resets only on an explicit confirmation.
 *
 * It never resets by itself. A degraded image can equally be a damaged one,
 * and discarding it is the owner's decision, made after reading what it
 * deletes.
 */
export type LocalDatabaseNeedsReset = Extract<
  DatabaseBootFailure,
  { kind: 'local_database_needs_reset' }
>;

export interface SavedDatabaseFile {
  readonly filename: string;
  readonly contents: Blob;
}

export interface DatabaseRecoveryServices {
  /** `system.exportDatabase`: the raw stored bytes, readable while degraded. */
  exportDatabase(): Promise<Uint8Array>;
  /** `system.reset`: replaces the stored image with a fresh one. */
  resetDatabase(): Promise<{ readonly reset: true }>;
  confirm(message: string): boolean;
  save(file: SavedDatabaseFile): void;
  now(): Date;
  /** Called once, after the worker confirmed the reset. */
  recovered(): void;
}

export interface DatabaseRecoveryShell {
  /** Settles when the action a click started has finished. */
  idle(): Promise<void>;
}

export const LOCAL_DATABASE_RESET_CONFIRMATION =
  'Reset the local database? This permanently deletes everything in the ' +
  'local database of this browser, including your characters and homebrew ' +
  'content. Choose Cancel and then Export database first if you want a copy.';

export const LOCAL_DATABASE_MIME_TYPE = 'application/vnd.sqlite3';

/** `2026-09-27T21:05:09.123Z` → `srd-55-local-database-2026-09-27T21-05-09Z.sqlite3`. */
export function localDatabaseExportFilename(now: Date): string {
  const stamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/u, 'Z')
    .replaceAll(':', '-');
  return `srd-55-local-database-${stamp}.sqlite3`;
}

export function saveDatabaseFileInBrowser(file: SavedDatabaseFile): void {
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

function actionButton(label: string, testId: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.testid = testId;
  button.textContent = label;
  return button;
}

export function renderDatabaseRecoveryShell(
  root: HTMLElement,
  failure: LocalDatabaseNeedsReset,
  services: DatabaseRecoveryServices,
): DatabaseRecoveryShell {
  const shell = document.createElement('main');
  shell.className = 'error-shell';
  shell.dataset.bootFailure = failure.kind;
  shell.dataset.degradedReason = failure.reason.kind;
  const heading = document.createElement('h1');
  heading.textContent = failure.headline;
  const status = document.createElement('output');
  status.id = 'status';
  status.setAttribute('role', 'status');
  status.value = failure.explanation;
  status.dataset.ready = 'false';
  const remedy = document.createElement('p');
  remedy.textContent = failure.remedy;
  const actions = document.createElement('div');
  actions.className = 'database-recovery-actions';
  const exportButton = actionButton('Export database', 'export-local-database');
  const resetButton = actionButton('Reset local database', 'reset-local-database');
  actions.append(exportButton, resetButton);
  const progress = document.createElement('p');
  progress.dataset.testid = 'database-recovery-progress';
  progress.setAttribute('aria-live', 'polite');
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Technical details';
  const detail = document.createElement('p');
  detail.textContent = failure.detail;
  details.append(summary, detail);
  shell.append(heading, status, remedy, actions, progress, details);
  root.replaceChildren(shell);
  root.setAttribute('aria-busy', 'false');

  let pending: Promise<void> = Promise.resolve();
  const busy = (value: boolean): void => {
    exportButton.disabled = value;
    resetButton.disabled = value;
  };

  const exportCopy = async (): Promise<void> => {
    busy(true);
    progress.textContent = 'Exporting the local database…';
    try {
      const bytes = await services.exportDatabase();
      const filename = localDatabaseExportFilename(services.now());
      services.save({
        filename,
        contents: new Blob([bytes.slice()], { type: LOCAL_DATABASE_MIME_TYPE }),
      });
      progress.textContent =
        `Saved ${filename} (${String(bytes.byteLength)} bytes). Nothing was deleted.`;
    } catch (error: unknown) {
      progress.textContent = `Export failed: ${databaseBootFailureMessage(error)}`;
    } finally {
      busy(false);
    }
  };

  const reset = async (): Promise<void> => {
    busy(true);
    progress.textContent = 'Resetting the local database…';
    try {
      await services.resetDatabase();
    } catch (error: unknown) {
      progress.textContent = `Reset failed: ${databaseBootFailureMessage(error)}`;
      busy(false);
      return;
    }
    services.recovered();
  };

  exportButton.addEventListener('click', () => {
    pending = exportCopy();
  });
  resetButton.addEventListener('click', () => {
    if (!services.confirm(LOCAL_DATABASE_RESET_CONFIRMATION)) {
      progress.textContent = 'Reset cancelled. Nothing was deleted.';
      return;
    }
    pending = reset();
  });

  return { idle: () => pending };
}
