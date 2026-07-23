import { expect, test } from '@playwright/test';
async function waitForWorker(page: import('@playwright/test').Page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

test('whole-image replacement is durable and invalid input preserves the live database', async ({
  page,
}) => {
  await page.goto('/');
  await waitForWorker(page);
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Snapshot character');
    window.lifecycleSnapshot = await window.staticApp.exportDatabase();
    await window.staticApp.writeCharacter('Removed by replacement');
    await window.staticApp.replaceDatabase(window.lifecycleSnapshot);
  });

  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Snapshot character' }),
  ]);

  const invalidReplacement = await page.evaluate(async () => {
    try {
      await window.staticApp.replaceDatabase(
        new TextEncoder().encode('invalid sqlite image'),
      );
      return { rejected: false, message: null };
    } catch (error) {
      return {
        rejected: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
  expect(invalidReplacement.rejected).toBe(true);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Snapshot character' }),
  ]);

  await page.reload();
  await waitForWorker(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Snapshot character' }),
  ]);
});
