import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  exerciseSyncAccessHandle,
  type BrowserCapabilityProbeDirectory,
  type BrowserCapabilityProbeFile,
  type BrowserCapabilityProbeRoot,
  type BrowserCapabilityProbeStorage,
  type BrowserCapabilitySyncAccessHandle,
} from '../../../src/pwa/browser-capability-opfs-probe';
import { browserCapabilityProbeFromWorker } from '../../../src/pwa/browser-capability-worker-port';

const workerSource = readFileSync(
  fileURLToPath(
    new URL('../../../src/pwa/browser-capability-worker.ts', import.meta.url),
  ),
  'utf8',
);
const portSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../src/pwa/browser-capability-worker-port.ts',
      import.meta.url,
    ),
  ),
  'utf8',
);
const opfsProbeSource = readFileSync(
  fileURLToPath(
    new URL(
      '../../../src/pwa/browser-capability-opfs-probe.ts',
      import.meta.url,
    ),
  ),
  'utf8',
);

function exclusiveProbeStorage(cleanupThrows = false): {
  readonly directoryNames: string[];
  readonly storage: BrowserCapabilityProbeStorage;
} {
  const activePaths = new Set<string>();
  const directoryNames: string[] = [];
  const root: BrowserCapabilityProbeRoot = {
    async getDirectoryHandle(
      name: string,
    ): Promise<BrowserCapabilityProbeDirectory> {
      directoryNames.push(name);
      const directory: BrowserCapabilityProbeDirectory = {
        async getFileHandle(
          fileName: string,
        ): Promise<BrowserCapabilityProbeFile> {
          return {
            async createSyncAccessHandle(): Promise<BrowserCapabilitySyncAccessHandle> {
              const path = `${name}/${fileName}`;
              if (activePaths.has(path)) {
                throw new Error('exclusive handle already open');
              }
              activePaths.add(path);
              return {
                close(): void {
                  activePaths.delete(path);
                },
              };
            },
          };
        },
        async removeEntry(): Promise<void> {
          if (cleanupThrows) {
            throw new Error('file cleanup failed');
          }
        },
      };
      return directory;
    },
    async removeEntry(): Promise<void> {
      if (cleanupThrows) {
        throw new Error('directory cleanup failed');
      }
    },
  };
  const storage: BrowserCapabilityProbeStorage = {
    async getDirectory(): Promise<BrowserCapabilityProbeRoot> {
      return root;
    },
  };
  return { directoryNames, storage };
}

describe('dedicated browser capability worker', () => {
  it('opens a real OPFS sync access handle and closes it', () => {
    expect(workerSource).toContain('exerciseSyncAccessHandle(navigator.storage)');
    expect(opfsProbeSource).toContain('storage.getDirectory()');
    expect(opfsProbeSource).toContain('file.createSyncAccessHandle()');
    expect(opfsProbeSource).toContain('handle.close()');
    expect(opfsProbeSource).toContain('removeEntry(PROBE_FILE)');
    expect(opfsProbeSource).toContain('removeEntry(probeDirectory');
  });

  it('BROWSER-PROBE-TOUCHES-NO-DB-FILE: has its own directory and no database path', () => {
    expect(opfsProbeSource).toContain("'srd55-capability-probe'");
    const completeSource = `${workerSource}\n${opfsProbeSource}`;
    expect(completeSource).not.toContain('dnd-multiclass-spells-sahpool');
    expect(completeSource).not.toContain('dnd-multiclass-spells.sqlite3');
    expect(completeSource).not.toContain('sqlite');
  });

  it('BROWSER-PROBE-CONCURRENT-UNIQUE-PATHS: two concurrent probes both report available', async () => {
    const { directoryNames, storage } = exclusiveProbeStorage();
    let nextProbeId = 0;
    const createProbeId = (): string => String(++nextProbeId);

    await expect(
      Promise.all([
        exerciseSyncAccessHandle(storage, createProbeId),
        exerciseSyncAccessHandle(storage, createProbeId),
      ]),
    ).resolves.toEqual(['available', 'available']);
    expect(directoryNames).toEqual([
      'srd55-capability-probe-1',
      'srd55-capability-probe-2',
    ]);
  });

  it('BROWSER-PROBE-CLEANUP-FAILURE-STILL-AVAILABLE: removal throwing after success still reports available', async () => {
    const { storage } = exclusiveProbeStorage(true);

    await expect(
      exerciseSyncAccessHandle(storage, () => 'cleanup-failure'),
    ).resolves.toBe('available');
  });

  it('constructs a separate module worker without importing the sqlite worker', () => {
    expect(portSource).toContain("new URL('./browser-capability-worker.ts'");
    expect(portSource).toMatch(/\{\s*type: 'module',?\s*\}/u);
    expect(portSource).not.toContain("'../db/worker'");
    expect(workerSource).not.toContain('@sqlite.org');
  });

  it('maps worker construction failure to probe-failed', async () => {
    const probe = browserCapabilityProbeFromWorker(() => {
      throw new Error('worker unavailable');
    });
    await expect(probe()).resolves.toBe('probe-failed');
  });

  it('maps a worker error event to probe-failed', async () => {
    class FailingWorker extends EventTarget {
      terminate(): void {}
    }
    const worker = new FailingWorker();
    const probe = browserCapabilityProbeFromWorker(
      () => worker as unknown as Worker,
    );
    const result = probe();
    worker.dispatchEvent(new Event('error'));
    await expect(result).resolves.toBe('probe-failed');
  });
});
