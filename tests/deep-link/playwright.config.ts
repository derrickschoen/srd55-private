import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
    command:
      `npm run build && npx vite preview --host 127.0.0.1 --port ${String(port)} ` +
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
