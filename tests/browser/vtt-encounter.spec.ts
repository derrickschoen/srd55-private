import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

async function confirmChoice(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm choice' }).click();
}

async function expectActive(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('heading', { name: `Active PC: ${name}` })).toBeVisible();
  await expect(page.locator('.encounter-token[data-active="true"]')).toHaveText(name);
}

test('M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/vtt?encounter=reference&view=player&session=increment-6-browser');
  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible({
    timeout: 60_000,
  });

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open local DM window' }).click();
  const dm = await popup;
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute(
    'data-state',
    'connected',
  );

  await expect(page.getByRole('button', { name: 'Undo last' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Apply ADJUDICATED override' })).toHaveCount(0);

  await expectActive(page, 'Reference Fighter');
  await confirmChoice(page, 'Attack');
  await confirmChoice(page, 'End turn');

  await expectActive(page, 'Reference Cleric');
  await confirmChoice(page, 'Sacred Flame');
  await confirmChoice(page, 'End turn');

  await expectActive(page, 'Reference Wizard');
  await page.getByRole('button', { name: 'Shatter', exact: true }).click();
  const board = page.locator('.encounter-board');
  const box = await board.boundingBox();
  if (box === null) throw new Error('Player encounter board has no layout box.');
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * (3 / 7), {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.locator('.encounter-cell[data-preview="true"]')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm choice' }).click();
  await confirmChoice(page, 'End turn');

  await expect(dm.getByRole('button', { name: 'Move to 4,3', exact: true })).toBeVisible();
  await dm.getByRole('button', { name: 'Move to 4,3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use reaction', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use reaction', exact: true }).click();
  await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
  await expect(
    dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]'),
  ).toHaveText('Training Brute');
  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();

  await dm.getByLabel('Adjudication target').selectOption({ label: 'Reference Fighter' });
  await dm.getByLabel('Hit Point delta').fill('-999');
  await dm.getByLabel('DM reasoning').fill('DM-only collapse reasoning sentinel');
  await dm.getByRole('button', { name: 'Apply ADJUDICATED override' }).click();
  await expect(dm.locator('[data-pause="adjudicated"]')).toBeVisible();
  await expect(dm.locator('.dm-log [data-event-type="adjudicated"]')).toContainText(
    'DM-only collapse reasoning sentinel',
  );
  await expect(dm.locator('.encounter-token[data-adjudicated="true"]')).toHaveText(
    'Reference Fighter',
  );
  await expect(page.locator('.encounter-log [data-event-type="adjudicated"]')).toContainText(
    'ADJUDICATED — visible consequence',
  );
  await expect(page.locator('.player-encounter')).not.toContainText(
    'DM-only collapse reasoning sentinel',
  );

  await dm.getByRole('button', { name: 'Resume' }).click();
  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
  await dm.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(dm.locator('[data-hidden-roll="death-save"]')).toBeVisible();
  await expect(page.locator('.player-encounter')).not.toContainText('Hidden death save');
  await expect(page.locator('.player-encounter')).not.toContainText('death save');

  await dm.getByRole('button', { name: 'Interrupt' }).click();
  await expect(dm.locator('[data-pause="interrupted"]')).toBeVisible();
  await dm.getByRole('button', { name: 'Undo last' }).click();
  await dm.getByText('Full revision history').click();
  await expect(dm.locator('[data-void="true"]')).not.toHaveCount(0);

  await dm.getByRole('button', { name: 'Interrupt' }).click();
  const historyCount = await dm.locator('[data-revision]').count();
  await dm.reload();
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(dm.locator('[data-pause="interrupted"]')).toBeVisible();
  await dm.getByText('Full revision history').click();
  await expect(dm.locator('[data-revision]')).toHaveCount(historyCount);
  await dm.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
});
