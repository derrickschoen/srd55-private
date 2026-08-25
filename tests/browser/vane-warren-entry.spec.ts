import { expect, test } from './fixtures/parallel-test';

test('a reset session mounts the first Vane Warren fight in a real browser', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
  await page.evaluate(async () => window.staticApp.reset());
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });

  await page.goto('/vtt?encounter=vane-warren');
  await page.getByRole('button', { name: 'Start the Vane Warren', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 65_000,
  });
  await expect(page.locator('.adventuring-day-status')).toHaveAttribute('data-room', '1');
  await expect(page.locator('.adventuring-day-status')).toContainText(
    'The Vane Warren — encounter 1 of 3',
  );
});
