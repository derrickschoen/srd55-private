import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const rawPort = process.env.PLAYWRIGHT_PORT ?? '4860';
const port = Number(rawPort);
if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`PLAYWRIGHT_PORT must be a valid port; received "${rawPort}".`);
}
const origin = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: '.',
  testMatch: 'serving.spec.ts',
  fullyParallel: false,
  workers: 1,
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-serving-playwright'),
  use: {
    baseURL: origin,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run serve -- --port ${String(port)}`,
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
