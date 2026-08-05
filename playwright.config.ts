import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  playwrightWorkers,
  workerOrigin,
  workerPort,
  workerViteCacheDir,
} from './tests/browser/fixtures/worker-origin';

/**
 * The dev-server port, overridable per checkout.
 *
 * PLAYWRIGHT_PORT is the first port in this checkout's worker pool. Parallel
 * slot N owns base port + N, and every server refuses reuse so another process
 * cannot silently become the suite's application server.
 *
 * Concurrent checkouts must still choose non-overlapping base-port ranges.
 * PLAYWRIGHT_WORKERS=1 restores the former single-server/single-worker model.
 */
const webServers = Array.from(
  { length: playwrightWorkers },
  (_, parallelIndex) => ({
    command:
      'npm run dev -- --host 127.0.0.1 --port ' +
      String(workerPort(parallelIndex)),
    url: workerOrigin(parallelIndex),
    reuseExistingServer: false,
    /**
     * The dev-only AI bridge spawns a deterministic offline stand-in instead of
     * the real `claude` CLI. Each server also owns its Vite dependency cache so
     * concurrently starting the pool cannot perturb another server's optimizer.
     */
    env: {
      AI_BRIDGE_FAKE: '1',
      STATIC_APP_CACHE_DIR: workerViteCacheDir(parallelIndex),
    },
  }),
);

export default defineConfig({
  testDir: './tests/browser',
  // Files share a slot's OPFS origin sequentially; only files run in parallel.
  fullyParallel: false,
  workers: playwrightWorkers,
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-playwright'),
  use: {
    baseURL: workerOrigin(0),
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: webServers,
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
