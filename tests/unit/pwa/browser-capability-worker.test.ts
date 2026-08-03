import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
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

describe('dedicated browser capability worker', () => {
  it('opens a real OPFS sync access handle and closes it', () => {
    expect(workerSource).toContain('navigator.storage.getDirectory()');
    expect(workerSource).toContain('file.createSyncAccessHandle()');
    expect(workerSource).toContain('handle.close()');
    expect(workerSource).toContain('removeEntry(PROBE_FILE)');
    expect(workerSource).toContain('removeEntry(PROBE_DIRECTORY');
  });

  it('BROWSER-PROBE-TOUCHES-NO-DB-FILE: has its own directory and no database path', () => {
    expect(workerSource).toContain("'srd55-capability-probe'");
    expect(workerSource).not.toContain('dnd-multiclass-spells-sahpool');
    expect(workerSource).not.toContain('dnd-multiclass-spells.sqlite3');
    expect(workerSource).not.toContain('sqlite');
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
