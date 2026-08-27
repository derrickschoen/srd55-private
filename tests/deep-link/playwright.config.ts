import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const port = 4310;
const origin = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: '.',
  testMatch: 'deep-link.spec.ts',
  fullyParallel: false,
  workers: 1,
  outputDir: join(tmpdir(), 'srd-55-deep-link-playwright'),
  use: {
    baseURL: origin,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    // Playwright's webServer cwd is THIS config's directory by default;
    // build and preview must run from the repo root or preview serves 404s.
    cwd: repoRoot,
    command:
      `node tools/dist-build-cache.mjs && npx vite preview --host 127.0.0.1 --port ${String(port)} ` +
      '--strictPort --configLoader runner',
    url: origin,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1_280, height: 720 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
