export type PersistentStorageState =
  | 'granted'
  | 'refused'
  | 'unavailable';

type PersistenceCapableStorage = Pick<StorageManager, 'persist'>;

/**
 * Request protection rather than inferring it. A false result is a normal,
 * honest refusal state; an absent API or thrown browser error is unavailable.
 */
export async function requestPersistentStorage(
  storage: PersistenceCapableStorage | undefined,
): Promise<PersistentStorageState> {
  if (storage === undefined || typeof storage.persist !== 'function') {
    return 'unavailable';
  }
  try {
    return (await storage.persist()) ? 'granted' : 'refused';
  } catch {
    return 'unavailable';
  }
}

export function persistentStorageLabel(
  state: PersistentStorageState,
): string {
  switch (state) {
    case 'granted':
      return 'Browser eviction protection is on.';
    case 'refused':
      return 'Browser eviction protection was not granted; keep backups.';
    case 'unavailable':
      return 'Browser eviction protection is unavailable; keep backups.';
  }
}
