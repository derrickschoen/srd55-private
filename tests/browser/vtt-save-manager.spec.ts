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
    const stored = localStorage.getItem(`srd55:vtt-autosave:${storageId}`);
    if (stored === null) throw new Error('Per-round autosave is missing from browser storage.');
    const snapshot: unknown = JSON.parse(stored);
    if (typeof snapshot !== 'object' || snapshot === null) {
      throw new Error('Per-round autosave snapshot is malformed.');
    }
    const bytes = Reflect.get(snapshot, 'bytes');
    if (typeof bytes !== 'string') throw new Error('Per-round autosave has no bundle.');
    const bundle: unknown = JSON.parse(bytes);
    if (typeof bundle !== 'object' || bundle === null) {
      throw new Error('Per-round autosave bundle is malformed.');
    }
    const revisions = Reflect.get(bundle, 'revisions');
    if (!Array.isArray(revisions)) throw new Error('Per-round autosave has no revision history.');
    return revisions.length;
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
