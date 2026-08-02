import { afterEach, beforeEach, expect } from 'vitest';
import type { RecordedForgeFixture } from './types';
import { createRecordedFixtureFetch } from './mock-fetch';

/** Installs a fixture-only fetch for the containing suite. There is no fallback. */
export function installForgeNetworkGuard(
  fixtures: readonly RecordedForgeFixture[] = [],
): void {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = createRecordedFixtureFetch(
      fixtures,
      () => expect.getState().currentTestName ?? '<unknown vitest test>',
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
}
