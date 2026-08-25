import { expect, test } from './fixtures/parallel-test';

test('fallback manual save downloads when no directory handle is selected', async ({ page }) => {
  await page.goto('/vtt?encounter=reference&view=dm&session=savemgr-fallback');
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({ timeout: 60_000 });

  const manager = page.locator('.dm-save-manager');
  await expect(manager).toHaveAttribute('data-mode', 'fallback');
  const pendingDownload = page.waitForEvent('download');
  await manager.getByRole('button', { name: 'Download save now', exact: true }).click();
  const download = await pendingDownload;

  expect(download.suggestedFilename()).toMatch(/\.vtt\.json$/u);
  expect(await download.failure()).toBeNull();
  await expect(manager.getByRole('button', { name: 'Upload save file', exact: true })).toBeVisible();
  await expect(manager.locator('.dm-save-row[data-source="folder"]')).toHaveCount(0);
});

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
  const browserSaves = manager.locator('.dm-save-row[data-source="browser"]');
  const perRoundSaves = browserSaves.filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^Per-round autosave$/u }),
  });
  const encounterBoundarySaves = browserSaves.filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^Encounter-boundary autosave$/u }),
  });
  await expect(manager).toHaveAttribute('data-mode', 'fallback');
  await expect(browserSaves).toHaveCount(2);
  await expect(browserSaves.locator('.dm-save-pool')).toHaveText([
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
  ]);
  await expect(perRoundSaves).toHaveCount(1);
  await expect(encounterBoundarySaves).toHaveCount(1);
  await manager.getByRole('button', { name: 'Choose default folder' }).click();
  await expect(manager).toHaveAttribute('data-mode', 'folder');
  await manager.getByRole('button', { name: 'Save now', exact: true }).click();

  await expect(manager.locator('.dm-save-row')).toHaveCount(3);
  await expect(browserSaves).toHaveCount(2);
  await expect(manager.locator('.dm-save-row[data-source="folder"]')).toHaveCount(1);
  await expect(manager.locator('.dm-save-row[data-source="folder"] .dm-save-pool')).toHaveText('File save');
  await expect(perRoundSaves).toContainText('Round');
  await expect(manager.locator('.dm-save-row[data-source="folder"]')).toContainText('Round');

  await page.getByRole('button', { name: 'Interrupt' }).click();
  await expect(page.locator('[data-pause="interrupted"]')).toBeVisible();
  await page.getByText('Full revision history').click();
  const revisionCount = await page.locator('[data-revision]').count();

  await manager.locator('.dm-save-row[data-source="folder"]').filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^File save$/u }),
  })
    .getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('[data-pause="interrupted"]')).toBeVisible();
  await page.getByText('Full revision history').click();
  await expect(page.locator('[data-revision]')).toHaveCount(revisionCount);

  const perRoundSaveId = await perRoundSaves.getAttribute('data-save-id');
  if (perRoundSaveId === null) throw new Error('Per-round autosave row has no save ID.');
  const perRoundRevisionCount = await page.evaluate((saveId) => {
    const storageId = saveId.replace(/^browser:/u, '');
    return new Promise<number>((resolve, reject) => {
      const opening = indexedDB.open('srd55-vtt-sessions', 1);
      opening.addEventListener('error', () => reject(opening.error), { once: true });
      opening.addEventListener('success', () => {
        const database = opening.result;
        const request = database.transaction('snapshots', 'readonly').objectStore('snapshots').get(storageId);
        request.addEventListener('error', () => reject(request.error), { once: true });
        request.addEventListener('success', () => {
          const snapshot: unknown = request.result;
          database.close();
          const revisionCount = snapshot === null || typeof snapshot !== 'object'
            ? undefined
            : Reflect.get(snapshot, 'revisionCount');
          if (typeof revisionCount !== 'number') {
            reject(new Error('Per-round autosave snapshot is malformed.'));
            return;
          }
          resolve(revisionCount);
        }, { once: true });
      }, { once: true });
    });
  }, perRoundSaveId);

  await perRoundSaves.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('[data-pause="interrupted"]')).toBeVisible();
  await page.getByText('Full revision history').click();
  // Restoring an unpaused autosave preserves its history and appends the resumable interruption.
  await expect(page.locator('[data-revision]')).toHaveCount(perRoundRevisionCount + 1);
});
