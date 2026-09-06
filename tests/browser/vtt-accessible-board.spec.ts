import { expect, test } from './fixtures/parallel-test';
import { readFile } from 'node:fs/promises';

test('DM and player toggle the screen-reader board and read creature rows by role', async ({ page }) => {
  await page.goto('/vtt?encounter=reference&view=player&session=accessible-board-browser');
  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible();

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open local DM window' }).click();
  const dm = await popup;
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible();
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute('data-state', 'connected');

  for (const boardPage of [dm, page]) {
    const toggle = boardPage.getByRole('button', { name: 'Screen-reader board', exact: true });
    await toggle.focus();
    await toggle.press('Enter');
    await expect(boardPage.locator('.accessible-board')).toBeVisible();
    await expect(boardPage.getByRole('row', { name: /Reference Fighter/u })).toContainText('(2,3)');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toBeFocused();
    await expect(boardPage.getByRole('button', { name: 'Export board as HTML', exact: true })).toBeVisible();
  }

  const pendingDownload = dm.waitForEvent('download');
  await dm.getByRole('button', { name: 'Export board as HTML', exact: true }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe('board.html');
  expect(await download.failure()).toBeNull();
  const downloadPath = await download.path();
  if (downloadPath === null) throw new Error('Accessible board download has no local path.');
  const html = await readFile(downloadPath, 'utf8');
  expect(html).toContain('<!doctype html>');
  expect(html).toContain('data-creature-id="combatant:fighter"');

  await dm.reload();
  await expect(dm.locator('.accessible-board')).toBeVisible();
  await expect(dm.getByRole('row', { name: /Training Brute/u })).toContainText('(3,3)');
});
