import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const rawPort = process.env.PLAYWRIGHT_PORT;
if (rawPort === undefined || !/^\d+$/u.test(rawPort)) {
  throw new Error('PLAYWRIGHT_PORT is required for the VTT handoff Worker spec.');
}
const port = Number(rawPort);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535 || port === 4_173) {
  throw new Error(`PLAYWRIGHT_PORT must be a valid non-4173 port; received "${rawPort}".`);
}
export const vttHandoffBrowserOrigin = `http://127.0.0.1:${String(port)}`;
if (process.env.PLAYWRIGHT_WORKERS !== undefined && process.env.PLAYWRIGHT_WORKERS !== '1') {
  throw new Error('The VTT handoff Worker spec requires PLAYWRIGHT_WORKERS=1.');
}
const artifact = process.env.VTT_HANDOFF_ARTIFACT;
if (artifact !== 'dev' && artifact !== 'dist') {
  throw new Error('VTT_HANDOFF_ARTIFACT must be either dev or dist.');
}
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const cacheDirectory = join(tmpdir(), `dnd-vtt-handoff-playwright-${rawPort}-${String(process.pid)}`);

export default defineConfig({
  testDir: resolve(repositoryRoot, 'tests/browser/vtt-handoff'),
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: vttHandoffBrowserOrigin,
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    cwd: repositoryRoot,
    command: artifact === 'dev'
      ? `npm run dev -- --host 127.0.0.1 --port ${rawPort} --strictPort`
      : `node tools/vtt-handoff/serve-existing-dist.mjs --port ${rawPort}`,
    url: `http://127.0.0.1:${rawPort}/vtt-handoff`,
    reuseExistingServer: false,
    env: {
      AI_BRIDGE_FAKE: '1',
      STATIC_APP_CACHE_DIR: cacheDirectory,
    },
  },
});
