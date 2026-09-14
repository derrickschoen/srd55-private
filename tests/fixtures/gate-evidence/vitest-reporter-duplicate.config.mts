import { defineConfig } from 'vitest/config';

const fixture = 'tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'project-a', include: [fixture] } },
      { test: { name: 'project-b', include: [fixture] } },
    ],
  },
});
