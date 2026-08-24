import { expect, test } from './fixtures/parallel-test';

test('DM sees browser and folder saves and loads through the resumable encounter path', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    Reflect.set(window, 'showDirectoryPicker', async () => navigator.storage.getDirectory());
  });
  await page.goto('/vtt?encounter=reference&view=dm&session=savemgr-browser');
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });

  const manager = page.locator('.dm-save-manager');
  await expect(manager).toHaveAttribute('data-mode', 'fallback');
  await expect(manager.locator('.dm-save-row[data-source="browser"]')).toHaveCount(1);
  await manager.getByRole('button', { name: 'Choose default folder' }).click();
  await expect(manager).toHaveAttribute('data-mode', 'folder');
  await manager.getByRole('button', { name: 'Save now', exact: true }).click();

  await expect(manager.locator('.dm-save-row')).toHaveCount(2);
  await expect(manager.locator('.dm-save-row[data-source="browser"]')).toHaveCount(1);
  await expect(manager.locator('.dm-save-row[data-source="folder"]')).toHaveCount(1);
  await expect(manager.locator('.dm-save-row[data-source="browser"]')).toContainText('Round');
  await expect(manager.locator('.dm-save-row[data-source="folder"]')).toContainText('Round');

  await page.getByRole('button', { name: 'Interrupt' }).click();
  await expect(page.locator('[data-pause="interrupted"]')).toBeVisible();
  await page.getByText('Full revision history').click();
  const revisionCount = await page.locator('[data-revision]').count();

  await manager.locator('.dm-save-row[data-source="browser"]')
    .getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('[data-pause="interrupted"]')).toBeVisible();
  await page.getByText('Full revision history').click();
  await expect(page.locator('[data-revision]')).toHaveCount(revisionCount);
});
