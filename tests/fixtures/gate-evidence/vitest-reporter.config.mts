import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/fixtures/gate-evidence/*.gate-fixture.ts'],
    passWithNoTests: process.env.DND_GATE_FIXTURE_PASS_WITH_NO_TESTS === '1',
  },
});
