import type { BootVerificationStampStore } from './boot-verification-stamp';

/**
 * The OPFS half of the D283 stamp — the only part that needs a browser.
 *
 * The interfaces below are declared structurally rather than taken from
 * `lib.dom`, following `src/pwa/browser-capability-opfs-probe.ts`: the OPFS
 * sync-access-handle surface is not uniformly typed across TypeScript releases,
 * and naming exactly the four methods used keeps a fake in a unit test honest
 * about what production actually calls.
 *
 * Sync access handles (rather than `createWritable`) because this runs in the
 * database worker, which already requires them for the SAH pool VFS.
 */
export interface BootStampSyncAccessHandle {
  read(buffer: Uint8Array, options: { readonly at: number }): number;
  write(buffer: Uint8Array, options: { readonly at: number }): number;
  truncate(newSize: number): void;
  getSize(): number;
  flush(): void;
  close(): void;
}

export interface BootStampFileHandle {
  createSyncAccessHandle(): Promise<BootStampSyncAccessHandle>;
}

export interface BootStampDirectory {
  getFileHandle(
    name: string,
    options?: { readonly create: boolean },
  ): Promise<BootStampFileHandle>;
}

export interface BootStampStorage {
  getDirectory(): Promise<BootStampDirectory>;
}

async function withHandle<T>(
  file: BootStampFileHandle,
  use: (handle: BootStampSyncAccessHandle) => T,
): Promise<T> {
  const handle = await file.createSyncAccessHandle();
  try {
    return use(handle);
  } finally {
    handle.close();
  }
}

/**
 * A stamp store in one OPFS file beside the database image.
 *
 * Neither method defends against its own failures: `planBootVerification`
 * treats a throwing read as "no stamp" and a throwing write as "no fast boot
 * next time". Swallowing here as well would hide a real OPFS regression behind
 * two layers of silence.
 */
export function opfsBootVerificationStampStore(
  storage: BootStampStorage,
  fileName: string,
): BootVerificationStampStore {
  return {
    read: async () => {
      const root = await storage.getDirectory();
      const file = await root.getFileHandle(fileName);
      return withHandle(file, (handle) => {
        const size = handle.getSize();
        if (size === 0) {
          return null;
        }
        const buffer = new Uint8Array(size);
        const read = handle.read(buffer, { at: 0 });
        return new TextDecoder().decode(buffer.subarray(0, read));
      });
    },
    write: async (text) => {
      const root = await storage.getDirectory();
      const file = await root.getFileHandle(fileName, { create: true });
      await withHandle(file, (handle) => {
        const bytes = new TextEncoder().encode(text);
        // Truncate FIRST: a shorter stamp written over a longer one would
        // otherwise leave trailing bytes that make the JSON unparseable —
        // tolerated by the reader, but a needless lost fast boot.
        handle.truncate(0);
        handle.write(bytes, { at: 0 });
        handle.flush();
      });
    },
  };
}
