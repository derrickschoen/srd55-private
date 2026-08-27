import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from './vitest.config';

/**
 * Vitest config used ONLY by Stryker mutation runs (stryker.conf.json points
 * here). Identical to the root config except that test files asserting REAL
 * wall-clock deadlines are excluded: instrumented code runs many times slower,
 * so a 75ms table budget cannot hold and the dry run fails on timing, not on
 * correctness. Those files run unchanged in every normal gate (npm test);
 * nothing is skipped or relaxed there.
 *
 * Current exclusions and why:
 * - tests/unit/vtt/soak-runner.test.ts — subprocess soak tables with 75ms
 *   request/table deadlines and abort-reason assertions.
 * - tests/unit/vtt/experiment-orchestrator.test.ts — synthetic E02-E04 tables
 *   executed in setup under requestTimeoutMs 2000 / tableTimeoutMs 15000;
 *   instrumented runs blow the table budget and flip status to aborted. The
 *   orchestrator is not in the mutate scope, so no kill signal is lost.
 */
export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      // Spread the defaults: a bare override REPLACES them and would pull
      // node_modules into the run.
      exclude: [
        ...configDefaults.exclude,
        'tests/unit/vtt/soak-runner.test.ts',
        'tests/unit/vtt/experiment-orchestrator.test.ts',
      ],
    },
  }),
);
