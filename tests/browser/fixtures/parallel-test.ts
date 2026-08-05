import { expect, test as base } from '@playwright/test';
import { workerOrigin } from './worker-origin';

export { expect };

/**
 * A Playwright parallel slot always talks to its own origin. OPFS is scoped by
 * origin, so files running at the same time cannot open the same database.
 * `parallelIndex` is stable across worker restarts and bounded by the configured
 * worker count, unlike the monotonically increasing `workerIndex`.
 */
export const test = base.extend({
  baseURL: async ({}, use, testInfo) => {
    await use(workerOrigin(testInfo.parallelIndex));
  },
});
