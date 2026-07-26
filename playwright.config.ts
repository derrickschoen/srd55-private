import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The dev-server port, overridable per checkout.
 *
 * Every git worktree of this repository ran its browser suite on the same
 * hard-coded 4173, so two checkouts testing at once either collided outright
 * — `reuseExistingServer: false` makes that a hard error, not a silent reuse —
 * or perturbed each other. That contention is the only condition under which
 * the flake recorded as F5 has ever reproduced.
 *
 * The default is unchanged, so a lone checkout behaves exactly as before and
 * F5 stays reproducible on demand by starting a second dev server by hand.
 * This only gives concurrent checkouts a way to stop sharing one port.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-playwright'),
  use: {
    baseURL: origin,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: origin,
    reuseExistingServer: false,
    /**
     * The dev-only AI bridge spawns a deterministic offline stand-in instead of
     * the real `claude` CLI. The stand-in speaks the genuine stream-json shape,
     * init event included, so the browser suite exercises the real spawn,
     * containment-assertion, parse, stream and kill paths without needing the
     * network, an authenticated login, or a paid API call.
     */
    env: { AI_BRIDGE_FAKE: '1' },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
