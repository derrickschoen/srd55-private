import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BACKUP_HINT_STORAGE_KEY,
  claimBackupHint,
  createBackupHint,
  persistBackupHintDismissal,
  type BackupHintStorage,
} from '../../../src/ui/screens/guided-builder/backup-hint';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

class MemoryStorage implements BackupHintStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  vi.restoreAllMocks();
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe('the one-time backup hint', () => {
  it('claims exactly one appearance only after level 1 is complete', () => {
    const storage = new MemoryStorage();

    expect(claimBackupHint(false, storage)).toBe(false);
    expect(storage.values).toEqual(new Map());

    expect(claimBackupHint(true, storage)).toBe(true);
    expect(storage.values.get(BACKUP_HINT_STORAGE_KEY)).toBe('shown');
    expect(claimBackupHint(true, storage)).toBe(false);

    persistBackupHintDismissal(storage);
    expect(storage.values.get(BACKUP_HINT_STORAGE_KEY)).toBe('dismissed');
    expect(claimBackupHint(true, storage)).toBe(false);
  });

  it('stays absent when localStorage cannot guarantee the one-time claim', () => {
    const unavailable: BackupHintStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(claimBackupHint(true, unavailable)).toBe(false);
  });

  it('renders the ruled copy with labelled actions and uses the backup export', async () => {
    const storage = new MemoryStorage();
    const exportBackup = vi.fn(() => Promise.resolve());
    const hint = createBackupHint(true, { storage, exportBackup });
    const view = interactiveElement(hint.element!);

    expect(elementText(hint.element!)).toContain(
      'characters live only in this browser — download a backup',
    );
    expect(
      view.querySelector('[aria-label="Dismiss backup hint"]'),
    ).not.toBeNull();

    view.querySelector('.guided-backup-hint-download')!.click();
    await settle();

    expect(exportBackup).toHaveBeenCalledTimes(1);
    expect(view.hidden).toBe(true);
    expect(storage.values.get(BACKUP_HINT_STORAGE_KEY)).toBe('dismissed');
    hint.cleanup();
  });

  it('dismisses through its keyboard-reachable labelled button', () => {
    const storage = new MemoryStorage();
    const hint = createBackupHint(true, {
      storage,
      exportBackup: () => Promise.resolve(),
    });
    const view = interactiveElement(hint.element!);

    view.querySelector('[aria-label="Dismiss backup hint"]')!.click();

    expect(view.hidden).toBe(true);
    expect(storage.values.get(BACKUP_HINT_STORAGE_KEY)).toBe('dismissed');
    hint.cleanup();
  });
});
