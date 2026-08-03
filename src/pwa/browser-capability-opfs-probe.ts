import type { BrowserCapabilityOutcome } from './browser-capability';

const PROBE_DIRECTORY_PREFIX = 'srd55-capability-probe';
const PROBE_FILE = 'sync-access-handle.probe';

export interface BrowserCapabilitySyncAccessHandle {
  close(): void;
}

export interface BrowserCapabilityProbeFile {
  readonly createSyncAccessHandle?: () => Promise<
    BrowserCapabilitySyncAccessHandle
  >;
}

export interface BrowserCapabilityProbeDirectory {
  getFileHandle(
    name: string,
    options: { readonly create: true },
  ): Promise<BrowserCapabilityProbeFile>;
  removeEntry(name: string): Promise<void>;
}

export interface BrowserCapabilityProbeRoot {
  getDirectoryHandle(
    name: string,
    options: { readonly create: true },
  ): Promise<BrowserCapabilityProbeDirectory>;
  removeEntry(
    name: string,
    options: { readonly recursive: true },
  ): Promise<void>;
}

export interface BrowserCapabilityProbeStorage {
  getDirectory(): Promise<BrowserCapabilityProbeRoot>;
}

/**
 * Exercise OPFS without sharing an exclusive-access target with another tab.
 * Each worker gets a throwaway directory of its own; cleanup is deliberately
 * best-effort because availability has already been proved once the handle
 * opens and closes successfully.
 */
export async function exerciseSyncAccessHandle(
  storage: BrowserCapabilityProbeStorage,
  createProbeId: () => string = () => crypto.randomUUID(),
): Promise<BrowserCapabilityOutcome> {
  const probeDirectory = `${PROBE_DIRECTORY_PREFIX}-${createProbeId()}`;
  let root: BrowserCapabilityProbeRoot | undefined;
  let directory: BrowserCapabilityProbeDirectory | undefined;
  let handle: BrowserCapabilitySyncAccessHandle | undefined;
  let outcome: BrowserCapabilityOutcome = 'unavailable';

  try {
    root = await storage.getDirectory();
    directory = await root.getDirectoryHandle(probeDirectory, {
      create: true,
    });
    const file = await directory.getFileHandle(PROBE_FILE, {
      create: true,
    });
    if (typeof file.createSyncAccessHandle === 'function') {
      handle = await file.createSyncAccessHandle();
      handle.close();
      handle = undefined;
      outcome = 'available';
    }
  } catch {
    outcome = 'unavailable';
  } finally {
    try {
      handle?.close();
    } catch {
      // A failed close means the probe did not record availability.
    }
    if (directory !== undefined) {
      try {
        await directory.removeEntry(PROBE_FILE);
      } catch {
        // Cleanup cannot change a result already established by open + close.
      }
    }
    if (root !== undefined) {
      try {
        await root.removeEntry(probeDirectory, { recursive: true });
      } catch {
        // A unique throwaway path makes failed cleanup safe for later probes.
      }
    }
  }

  return outcome;
}
