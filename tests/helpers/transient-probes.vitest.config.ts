import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import { TRANSIENT_PROBES } from '../../scripts/transient-probes.mjs';
import rootConfig from '../../vitest.config';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Vitest config used ONLY to run probes a test wrote in TRANSIENT_PROBES:
 * tests/unit/test-input-boundary.test.ts runs one under the test-input audit
 * and tests/unit/verdict-recorder-inputs.test.ts runs its own under the
 * verdict recorder. The root config leaves that directory out, so a probe a
 * killed run leaves behind is in no suite; this config includes that
 * directory and nothing else, so it never runs a test of the regular suite.
 * Everything else is the root config (setup files, global setups,
 * environment), resolved from the repository root as there.
 *
 * `exclude` is set, not merged: mergeConfig concatenates arrays, and the root
 * config's exclusion of TRANSIENT_PROBES would then exclude every probe.
 */
export default defineConfig({
  ...rootConfig,
  root: repositoryRoot,
  test: {
    ...rootConfig.test,
    include: [`${TRANSIENT_PROBES}/**/*.test.ts`],
    exclude: [...configDefaults.exclude],
  },
});
