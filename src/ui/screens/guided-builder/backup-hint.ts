import { clear, element, listen, type Cleanup } from '../../dom';

export const BACKUP_HINT_STORAGE_KEY = 'backup-hint-level-one-v1';

const SHOWN = 'shown';
const DISMISSED = 'dismissed';

export interface BackupHintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BackupHintDeps {
  readonly storage: BackupHintStorage;
  readonly exportBackup: () => Promise<void>;
}

export interface BackupHint {
  readonly element: HTMLElement | null;
  readonly cleanup: Cleanup;
}

/**
 * Atomically claims the one browser-profile appearance.
 *
 * The marker is written before anything renders, rather than only after the
 * dismiss click, because D116 says the hint never repeats. If local storage is
 * unavailable, the hint stays absent: showing something we cannot remember
 * would turn a one-time hint into a recurring warning.
 */
export function claimBackupHint(
  levelOneComplete: boolean,
  storage: BackupHintStorage,
): boolean {
  if (!levelOneComplete) {
    return false;
  }
  try {
    if (storage.getItem(BACKUP_HINT_STORAGE_KEY) !== null) {
      return false;
    }
    storage.setItem(BACKUP_HINT_STORAGE_KEY, SHOWN);
    return true;
  } catch {
    return false;
  }
}

export function persistBackupHintDismissal(storage: BackupHintStorage): void {
  try {
    storage.setItem(BACKUP_HINT_STORAGE_KEY, DISMISSED);
  } catch {
    // The earlier claim already prevents a repeat when reads still work.
  }
}

export function createBackupHint(
  levelOneComplete: boolean,
  deps: BackupHintDeps,
): BackupHint {
  if (!claimBackupHint(levelOneComplete, deps.storage)) {
    return { element: null, cleanup: () => undefined };
  }

  const cleanups: Cleanup[] = [];
  const status = element('p', {
    className: 'guided-backup-hint-status',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const download = element('button', {
    className: 'guided-backup-hint-download',
    text: 'Download a backup',
    attributes: { type: 'button' },
  });
  const dismiss = element('button', {
    className: 'guided-backup-hint-dismiss',
    text: 'Dismiss',
    attributes: {
      type: 'button',
      'aria-label': 'Dismiss backup hint',
    },
  });
  const hint = element(
    'aside',
    {
      className: 'guided-backup-hint',
      attributes: {
        'aria-label': 'Backup hint',
        'data-backup-hint': '',
      },
    },
    [
      element('p', {
        text: 'characters live only in this browser — download a backup',
      }),
      element('div', { className: 'guided-backup-hint-actions' }, [
        download,
        dismiss,
      ]),
      status,
    ],
  );

  const hide = (): void => {
    persistBackupHintDismissal(deps.storage);
    hint.hidden = true;
  };

  cleanups.push(
    listen(dismiss, 'click', hide),
    listen(download, 'click', () => {
      if (download.disabled) {
        return;
      }
      download.disabled = true;
      clear(status);
      status.setAttribute('role', 'status');
      status.textContent = 'Downloading backup…';
      void deps
        .exportBackup()
        .then(() => hide())
        .catch((error: unknown) => {
          status.textContent =
            error instanceof Error ? error.message : String(error);
          status.setAttribute('role', 'alert');
          download.disabled = false;
        });
    }),
  );

  return {
    element: hint,
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
