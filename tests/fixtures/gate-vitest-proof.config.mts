import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/fixtures/gate-vitest-*.fixture.ts'],
    globalSetup: ['tests/fixtures/gate-vitest-post-report-global-setup.mjs'],
    passWithNoTests: false,
  },
});
