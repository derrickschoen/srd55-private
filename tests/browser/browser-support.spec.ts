import { expect, test } from '@playwright/test';

const CAPABILITY_WARNING =
  'This browser cannot open the local data store. SRD-55 is tested only in Chromium; continuing may not work and may lose data. Keep backup exports.';
const UNTESTED_FIREFOX_WARNING =
  'Firefox is not tested here. SRD-55 is tested only in Chromium; it may not work and may lose data. Keep backup exports.';
const UNTESTED_CRIOS_WARNING =
  'Chrome on iOS is not tested here. SRD-55 is tested only in Chromium; it may not work and may lose data. Keep backup exports.';

async function expectInsideInitialViewport(
  locator: import('@playwright/test').Locator,
): Promise<void> {
  const bounds = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
}

async function injectProbeFailure(
  page: import('@playwright/test').Page,
  failure: 'unavailable' | 'never',
): Promise<void> {
  await page.addInitScript((injectedFailure) => {
    Object.defineProperty(
      window,
      '__SRD55_BROWSER_CAPABILITY_PROBE_FAILURE__',
      {
        configurable: true,
        value: injectedFailure,
      },
    );
  }, failure);
}

async function injectLateAvailableProbe(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.addInitScript(() => {
    let releaseProbe: () => void = () => {};
    const release = new Promise<void>((resolve) => {
      releaseProbe = resolve;
    });
    Object.defineProperty(
      window,
      '__SRD55_BROWSER_CAPABILITY_PROBE_FAILURE__',
      {
        configurable: true,
        value: {
          kind: 'late-available',
          release,
          releaseProbe,
        },
      },
    );
  });
}

async function spoofUserAgent(
  page: import('@playwright/test').Page,
  userAgent: string,
): Promise<void> {
  await page.addInitScript((spoofedUserAgent) => {
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: spoofedUserAgent,
    });
  }, userAgent);
}

test('BROWSER-PROBE-CHROMIUM-SILENT: Chromium boots unchanged when the capability is available', async ({
  page,
}) => {
  // Measured alone at 5.5 s: sqlite wasm and the real OPFS pool also boot.
  test.setTimeout(20_000);
  await page.goto('/');

  await expect(page.locator('#browser-support-notice')).toBeHidden();
  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'supported',
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
});

test('BROWSER-PROBE-FAILS-SHOWS-NOTICE: an unavailable capability holds boot with the exact warning', async ({
  page,
}) => {
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/');

  const notice = page.locator('#browser-support-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute(
    'data-browser-support-state',
    'capability-unavailable',
  );
  await expect(page.locator('#browser-support-message')).toHaveText(
    CAPABILITY_WARNING,
  );
  await expect(page.locator('#app')).toContainText(
    'Application start is paused.',
  );
  await expect(page.locator('#app')).not.toContainText(
    'Starting local database…',
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'false');
});

test('BROWSER-PROBE-HOLD-PREVENTS-DATABASE-WORKER-CONSTRUCTION: pending injected probe constructs no database worker before its result', async ({
  page,
}) => {
  const databaseWorkerUrls = new Set<string>();
  page.on('worker', (worker) => {
    if (/\/src\/db\/worker\.ts(?:\?|$)/u.test(worker.url())) {
      databaseWorkerUrls.add(worker.url());
    }
  });
  await injectProbeFailure(page, 'never');
  await page.goto('/');

  await page.waitForFunction(() => 'appRpc' in window);
  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'checking',
  );
  // Close the dormant RPC boundary before asserting. Under the eager-worker
  // negative control this terminates the wrongly constructed worker too, so a
  // failing proof does not leave an OPFS initialization racing test teardown.
  await page.evaluate(() => window.appRpc.close());
  expect([...databaseWorkerUrls]).toEqual([]);
});

test('BROWSER-PROBE-HOLD-ACTION-IN-INITIAL-VIEWPORT: warning and Continue fit without scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/');

  const notice = page.locator('#browser-support-notice');
  const proceed = page.getByRole('button', { name: 'Continue anyway' });
  await expect(notice).toHaveAttribute(
    'data-browser-support-state',
    'capability-unavailable',
    { timeout: 10_000 },
  );
  await expectInsideInitialViewport(notice);
  await expectInsideInitialViewport(proceed);
});

test('BROWSER-PROBE-HANG-NOT-DEAD-SCREEN: a missing reply reaches the warning deadline', async ({
  page,
}) => {
  // Measured alone at 1.9 s with the final 1,276 ms probe deadline.
  test.setTimeout(20_000);
  await injectProbeFailure(page, 'never');
  await page.goto('/');

  const notice = page.locator('#browser-support-notice');
  await expect(notice).toBeVisible({ timeout: 5_000 });
  await expect(notice).toHaveAttribute(
    'data-browser-support-state',
    'capability-probe-failed',
  );
  await expect(page.locator('#browser-support-message')).toHaveText(
    CAPABILITY_WARNING,
  );
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('#app')).not.toContainText(
    'Starting local database…',
  );
});

test('BROWSER-PROBE-LATE-OK-WITHDRAWS: late capability success removes the warning and releases boot', async ({
  page,
}) => {
  // Measured alone at 5.1 s: this covers the deadline and then sqlite boot.
  test.setTimeout(20_000);
  await injectLateAvailableProbe(page);
  await page.goto('/');

  const notice = page.locator('#browser-support-notice');
  await expect(notice).toBeVisible({ timeout: 5_000 });
  await expect(notice).toHaveAttribute(
    'data-browser-support-state',
    'capability-probe-failed',
  );
  await expect(page.locator('#app')).toContainText(
    'Application start is paused.',
  );

  await page.evaluate(() => {
    const seam = Reflect.get(
      window,
      '__SRD55_BROWSER_CAPABILITY_PROBE_FAILURE__',
    );
    const releaseProbe =
      seam !== null && typeof seam === 'object'
        ? Reflect.get(seam, 'releaseProbe')
        : undefined;
    if (typeof releaseProbe === 'function') {
      releaseProbe();
    }
  });

  await expect(notice).toBeHidden({ timeout: 5_000 });
  await expect(notice).toHaveAttribute(
    'data-browser-support-state',
    'supported',
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 20_000,
  });
});

test('BROWSER-PROBE-PROCEED-ANYWAY: keyboard proceed starts the app and leaves the notice visible', async ({
  page,
}) => {
  // Measured alone at 5.3 s: proceeding intentionally starts sqlite boot.
  test.setTimeout(20_000);
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/');

  const notice = page.locator('#browser-support-notice');
  const proceed = page.getByRole('button', { name: 'Continue anyway' });
  await expect(notice).toBeVisible();
  await proceed.focus();
  await expect(proceed).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute(
    'data-browser-support-state',
    'capability-unavailable',
  );
});

test('BROWSER-PROBE-NO-DISMISS-STATE: reload after Continue holds again with no stored acknowledgement', async ({
  page,
}) => {
  // Measured alone at 5.6 s: this includes one sqlite boot before the reload.
  test.setTimeout(20_000);
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/');

  const notice = page.locator('#browser-support-notice');
  await page.getByRole('button', { name: 'Continue anyway' }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 20_000,
  });

  await page.reload();
  await expect(notice).toBeVisible();
  await expect(page.locator('#app')).toContainText(
    'Application start is paused.',
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'false');
});

test('BROWSER-PROBE-UA-NEVER-SUPPRESSES: Chrome-shaped UA cannot hide capability failure', async ({
  page,
}) => {
  await spoofUserAgent(
    page,
    'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36',
  );
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/');

  await expect(page.locator('#browser-support-notice')).toBeVisible();
  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'capability-unavailable',
  );
});

test('BROWSER-PROBE-UNTESTED-ENGINE-NOTICE: passing capability on Firefox-shaped UA warns without holding boot', async ({
  page,
}) => {
  // Measured alone at 5.3 s: this arm boots sqlite without waiting for input.
  test.setTimeout(20_000);
  await spoofUserAgent(page, 'Mozilla/5.0 Gecko/20100101 Firefox/142.0');
  await page.goto('/');

  await expect(page.locator('#browser-support-notice')).toBeVisible();
  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'untested-engine',
  );
  await expect(page.locator('#browser-support-message')).toHaveText(
    UNTESTED_FIREFOX_WARNING,
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
});

test('BROWSER-PROBE-CRIOS-IS-WEBKIT: Chrome on iOS receives the untested-engine banner', async ({
  page,
}) => {
  test.setTimeout(40_000);
  await spoofUserAgent(
    page,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1',
  );
  await page.goto('/');

  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'untested-engine',
  );
  await expect(page.locator('#browser-support-message')).toHaveText(
    UNTESTED_CRIOS_WARNING,
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
});

test('/legal renders under a failing probe without waiting for Continue anyway', async ({
  page,
}) => {
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/legal');

  await expect(page.locator('[data-testid="srd-attribution"]')).toBeVisible();
  await expect(page.locator('#browser-support-notice')).toBeVisible();
  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'capability-unavailable',
  );
});

test('BROWSER-PROBE-LEGAL-CONTINUE-ACKNOWLEDGES: Continue directly on /legal releases a later database route', async ({
  page,
}) => {
  test.setTimeout(20_000);
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/legal');

  await expect(page.locator('[data-testid="srd-attribution"]')).toBeVisible();
  await expect(page.locator('#browser-support-notice')).toHaveAttribute(
    'data-browser-support-state',
    'capability-unavailable',
  );
  await page.getByRole('button', { name: 'Continue anyway' }).click();
  await page.getByRole('link', { name: 'Back to characters' }).click();

  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 20_000,
  });
});

test('BROWSER-PROBE-LEGAL-RETURN-REGATES: leaving an initial legal route requires Continue before database boot', async ({
  page,
}) => {
  test.setTimeout(20_000);
  await injectProbeFailure(page, 'unavailable');
  await page.goto('/legal');

  await expect(page.locator('[data-testid="srd-attribution"]')).toBeVisible();
  await page.getByRole('link', { name: 'Back to characters' }).click();
  await expect(page.locator('#app')).toContainText(
    'Application start is paused.',
  );
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'false');

  await page.getByRole('button', { name: 'Continue anyway' }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 20_000,
  });
});
