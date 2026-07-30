import { describe, expect, it } from 'vitest';
import {
  persistentStorageLabel,
  requestPersistentStorage,
} from '../../../src/pwa/storage-persistence';

describe('persistent browser storage UI state', () => {
  it('maps a granted request to an exact protection claim', async () => {
    await expect(
      requestPersistentStorage({ persist: async () => true }),
    ).resolves.toBe('granted');
    expect(persistentStorageLabel('granted')).toBe(
      'Browser eviction protection is on.',
    );
  });

  it('states refusal plainly and recommends backups', async () => {
    await expect(
      requestPersistentStorage({ persist: async () => false }),
    ).resolves.toBe('refused');
    expect(persistentStorageLabel('refused')).toBe(
      'Browser eviction protection was not granted; keep backups.',
    );
  });

  it('never claims protection when the API is absent or fails', async () => {
    await expect(requestPersistentStorage(undefined)).resolves.toBe(
      'unavailable',
    );
    await expect(
      requestPersistentStorage({
        persist: () => Promise.reject(new Error('blocked')),
      }),
    ).resolves.toBe('unavailable');
    expect(persistentStorageLabel('unavailable')).toBe(
      'Browser eviction protection is unavailable; keep backups.',
    );
  });
});
