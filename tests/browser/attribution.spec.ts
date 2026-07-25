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
  await page.goto('/not-a-screen');

  await expect(page.locator('.empty-shell')).toBeVisible();
  await expect(attributionLink(page)).toBeVisible();
});

test('no licensor wordmark appears outside the notice', async ({ page }) => {
  const wordmark = /D&D|Dungeons|Wizards/;

  await page.goto('/not-a-screen');
  await expect(page.locator('.empty-shell')).toBeVisible();
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
  await page.route('**/*.wasm', (route) => route.abort());

  await page.goto('/');
  await expect(page.locator('#status')).toContainText('Failed:', {
    timeout: 30_000,
  });

  // The boot failure leaves the footer link a plain anchor, so this is a full
  // navigation: the licence route must render without asking for a database.
  await attributionLink(page).click();

  await expect(page).toHaveURL(/\/legal$/);
  await expect(page.locator('[data-testid="srd-attribution"]')).toHaveText(
    NOTICE,
  );
});
