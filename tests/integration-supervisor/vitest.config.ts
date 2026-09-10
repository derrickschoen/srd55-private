import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  root: repositoryRoot,
  test: {
    environment: 'node',
    include: ['tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts'],
    isolate: true,
    maxWorkers: 1,
  },
});
