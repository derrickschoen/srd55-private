import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(StorageManager.prototype, 'persist', {
      configurable: true,
      value: async () => false,
    });
  });
});

test('links the install manifest, registers the worker, and reports refused persistence', async ({
  page,
}) => {
  await page.goto('/');

  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute('href', '/manifest.webmanifest');
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: 'SRD-55',
    short_name: 'SRD-55',
    display: 'standalone',
    start_url: './',
  });

  await expect(page.locator('#persistence-status')).toHaveAttribute(
    'data-persistence-state',
    'refused',
  );
  await expect(page.locator('#persistence-status')).toHaveText(
    'Browser eviction protection was not granted; keep backups.',
  );

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.scriptURL ?? null;
      }),
    )
    .toMatch(/\/service-worker\.js$/);
});
