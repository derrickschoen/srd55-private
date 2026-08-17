import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * `tests/live/*.live-test.ts` probe the real `claude` CLI to check that the
 * bridge's invocation is still capability-free. They cost money, need an
 * authenticated login and need the network, so they are OPT-IN via
 * `npm run test:live`.
 *
 * Note the direction: setting the flag ADDS a suite and clearing it removes only
 * that suite. Nothing in the default set is excluded, skipped or relaxed by this
 * switch — the ordinary run is exactly the run it has always been. (The `-test`
 * suffix does not match the `.test.ts` pattern below, so these files are opt-in
 * by name as well as by flag; verified, not assumed.)
 */
const liveInclusions =
  process.env.AI_BRIDGE_LIVE === '1'
    ? ['tests/live/**/*.live-test.ts']
    : [];

export default defineConfig({
  cacheDir:
    process.env.STATIC_APP_CACHE_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-vitest'),
  test: {
    environment: 'node',
    // Run BOTH unit and integration .test.ts under vitest. Browser tests are
    // .spec.ts under tests/browser and belong to Playwright (npm run test:browser).
    include: ['tests/**/*.test.ts', ...liveInclusions],
    /**
     * Derives the SRD spell-source parse ONCE, before any worker is forked,
     * and hands the workers a file path and a key. It is a pure-parse cache
     * and nothing else: the worker re-checks the key against the corpus it is
     * actually holding, re-runs every freeze and every mint itself, and a
     * change to either corpus file or to `spell-source-reader.ts` is a miss
     * and a full re-derivation.
     *
     * Like the live-suite switch above, this adds no suite, excludes nothing
     * and relaxes nothing — it only moves work that already ran 38 times into
     * running once. The reasoning lives in the setup file; the guarantee lives
     * in `src/simulation/spell-source-parse-cache.ts`.
     */
    globalSetup: ['tests/helpers/spell-source-parse-cache-global-setup.ts'],
    clearMocks: true,
  },
});
