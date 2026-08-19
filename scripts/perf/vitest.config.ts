import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/perf/measure-seed-profiles.test.ts'],
    environment: 'node',
  },
});
