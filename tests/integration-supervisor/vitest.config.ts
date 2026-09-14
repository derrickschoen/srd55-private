import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  root: repositoryRoot,
  test: {
    // This dedicated supervisor-only probe performs a real production build twice.
    // Its process-level waits remain independently bounded and always enter cleanup.
    testTimeout: 5 * 60_000,
    hookTimeout: 2 * 60_000,
    environment: 'node',
    include: [
      'tests/integration-supervisor/heldout-runtime-guard-isolation.test.ts',
      'tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts',
    ],
    isolate: true,
    maxWorkers: 1,
  },
});
