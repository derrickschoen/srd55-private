import { expect, test } from '@playwright/test';

const NOTICE =
  'This work includes material from the System Reference Document 5.2 ' +
  '("SRD 5.2") by Wizards of the Coast LLC, available at ' +
  'https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative ' +
  'Commons Attribution 4.0 International License, available at ' +
  'https://creativecommons.org/licenses/by/4.0/legalcode.';

function attributionLink(page: import('@playwright/test').Page) {
  return page
    .locator('.site-footer')
    .getByRole('link', { name: 'Licences and attribution' });
}

test('the footer reaches the SRD notice without reloading the application', async ({
  page,
}) => {
  let loads = 0;
  page.on('load', () => {
    loads += 1;
  });

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await attributionLink(page).click();

  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.locator('[data-testid="srd-attribution"]')).toHaveText(
    NOTICE,
  );
  expect(loads).toBe(1);
});

/**
 * The footer is static markup in index.html, so it paints and becomes clickable
 * long before the worker has finished opening the database. Every other test
 * here waits for the application to announce itself ready first, which waits
 * the whole vulnerable window out; this one clicks inside it deliberately.
 *
 * The window is held open by a barrier, not by a guessed delay: the sqlite wasm
 * response is stalled, so the database provably cannot open, and it is released
 * only once the assertions that depend on it have run.
 */
test('a footer click made before the database opens is routed, not reloaded', async ({
  page,
}) => {
  let loads = 0;
  page.on('load', () => {
    loads += 1;
  });

  let releaseWasm = (): void => {};
  const wasmHeld = new Promise<void>((resolve) => {
    releaseWasm = resolve;
  });
  await page.route('**/*.wasm', async (route) => {
    await wasmHeld;
    await route.continue();
  });

  try {
    await page.goto('/');

    // Proof that the click below lands before the boot gate fires: #app still
    // carries the served pre-boot shell, which the application replaces the
    // moment it starts.
    await expect(page.locator('#status')).toHaveText('Starting local database…');
    await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'true');
    await expect(attributionLink(page)).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).preBootDocument = true;
    });

    await attributionLink(page).click();

    await expect(page).toHaveURL(/\/legal$/);
    await expect(page.locator('[data-testid="srd-attribution"]')).toHaveText(
      NOTICE,
    );

    // A full navigation would have thrown this document away, and with it the
    // worker that was part way through opening the database.
    const sameDocument = await page.evaluate(
      () =>
        (window as unknown as Record<string, unknown>).preBootDocument === true,
    );
    expect(sameDocument).toBe(true);
    expect(loads).toBe(1);
  } finally {
    releaseWasm();
  }
});

test('the SRD notice is real text served on a deep link', async ({ page }) => {
  await page.goto('/legal');

  const notice = page.locator('[data-testid="srd-attribution"]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText(NOTICE);
  await expect(
    notice.getByRole('link', {
      name: 'https://creativecommons.org/licenses/by/4.0/legalcode',
    }),
  ).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/legalcode',
  );
  await expect(notice.locator('img')).toHaveCount(0);
});

test('the footer survives screens the router does not match', async ({
  page,
}) => {
  test.setTimeout(20_000);
  await page.goto('/not-a-screen');

  await expect(page.locator('.empty-shell')).toBeVisible({ timeout: 20_000 });
  await expect(attributionLink(page)).toBeVisible();
});

test('no licensor wordmark appears outside the notice', async ({ page }) => {
  test.setTimeout(20_000);
  const wordmark = /D&D|Dungeons|Wizards/;

  await page.goto('/not-a-screen');
  await expect(page.locator('.empty-shell')).toBeVisible({ timeout: 20_000 });
  expect(await page.title()).not.toMatch(wordmark);
  expect(await page.locator('body').innerText()).not.toMatch(wordmark);

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  expect(await page.title()).not.toMatch(wordmark);
  expect(await page.locator('body').innerText()).not.toMatch(wordmark);
});

test('the notice stays reachable when the database never starts', async ({
  page,
}) => {
  let loads = 0;
  page.on('load', () => {
    loads += 1;
  });

  await page.route('**/*.wasm', (route) => route.abort());

  await page.goto('/');
  await expect(page.locator('#status')).toContainText('Failed:', {
    timeout: 30_000,
  });

  // The boot failure means the gate never starts the application, so this
  // exercises the footer's own routing in isolation: the licence route must
  // render without asking for a database.
  await attributionLink(page).click();

  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.locator('[data-testid="srd-attribution"]')).toHaveText(
    NOTICE,
  );
  expect(loads).toBe(1);
});
