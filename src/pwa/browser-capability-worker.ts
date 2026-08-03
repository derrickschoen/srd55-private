/// <reference lib="webworker" />

import type { BrowserCapabilityOutcome } from './browser-capability';

const scope = self as DedicatedWorkerGlobalScope;
const PROBE_DIRECTORY = 'srd55-capability-probe';
const PROBE_FILE = 'sync-access-handle.probe';

type SyncAccessCapableFile = FileSystemFileHandle & {
  readonly createSyncAccessHandle?: () => Promise<FileSystemSyncAccessHandle>;
};

async function exerciseSyncAccessHandle(): Promise<BrowserCapabilityOutcome> {
  let root: FileSystemDirectoryHandle | undefined;
  let directory: FileSystemDirectoryHandle | undefined;
  let handle: FileSystemSyncAccessHandle | undefined;
  try {
    root = await navigator.storage.getDirectory();
    directory = await root.getDirectoryHandle(PROBE_DIRECTORY, {
      create: true,
    });
    const file = (await directory.getFileHandle(PROBE_FILE, {
      create: true,
    })) as SyncAccessCapableFile;
    if (typeof file.createSyncAccessHandle !== 'function') {
      return 'unavailable';
    }
    handle = await file.createSyncAccessHandle();
    handle.close();
    handle = undefined;
    await directory.removeEntry(PROBE_FILE);
    await root.removeEntry(PROBE_DIRECTORY);
    directory = undefined;
    root = undefined;
    return 'available';
  } catch {
    return 'unavailable';
  } finally {
    handle?.close();
    if (directory !== undefined) {
      try {
        await directory.removeEntry(PROBE_FILE);
      } catch {
        // The primary result already records the failure; cleanup continues.
      }
    }
    if (root !== undefined) {
      try {
        await root.removeEntry(PROBE_DIRECTORY, { recursive: true });
      } catch {
        // A failed best-effort cleanup cannot hide the primary probe result.
      }
    }
  }
}

void exerciseSyncAccessHandle().then((outcome) => scope.postMessage(outcome));
