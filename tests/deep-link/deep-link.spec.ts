import { expect, test } from '@playwright/test';

test('boots the production app from a direct nested character route', async ({
  page,
}) => {
  test.setTimeout(30_000);

  const entryResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return /\/assets\/index-[^/]+\.js$/.test(url.pathname);
  });
  const documentResponse = await page.goto('/characters/1');
  const entryResponse = await entryResponsePromise;

  expect(documentResponse).not.toBeNull();
  expect(documentResponse?.headers()['content-type']).toContain('text/html');
  expect(new URL(entryResponse.url()).pathname).toMatch(
    /^\/assets\/index-[^/]+\.js$/,
  );
  expect(entryResponse.headers()['content-type']).toContain('text/javascript');
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false', {
    timeout: 20_000,
  });
  await expect(page).toHaveURL(/\/characters\/1$/);
});
