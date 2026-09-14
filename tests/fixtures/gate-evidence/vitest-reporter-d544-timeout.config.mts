import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts'],
    teardownTimeout: 50,
  },
});
