import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  cacheDir:
    process.env.STATIC_APP_CACHE_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-vitest'),
  test: {
    environment: 'node',
    // Run BOTH unit and integration .test.ts under vitest. Browser tests are
    // .spec.ts under tests/browser and belong to Playwright (npm run test:browser).
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
  },
});
