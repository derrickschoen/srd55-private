import { expect, test } from '@playwright/test';

test('classic top-down UI commits a revision-bound offered move in process', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#status')?.getAttribute('data-ready') === 'true');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => window.staticApp.reset());
  await page.goto('/vtt?encounter=d365');
  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible();
  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();
  await page.waitForFunction(() => document.querySelector('.dm-encounter') !== null);
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible();

  const shell = page.locator('.dm-encounter');
  const offeredMoves = page.locator(
    '.dm-pending-request button[data-offered-action-id][data-destination-column][data-destination-row]',
  );
  await expect(offeredMoves.first()).toBeEnabled();
  const moveIndex = await offeredMoves.evaluateAll((buttons) => buttons.findIndex((button) => {
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
    return button.dataset.destinationColumn !== button.dataset.anchorColumn ||
      button.dataset.destinationRow !== button.dataset.anchorRow;
  }));
  expect(moveIndex).toBeGreaterThanOrEqual(0);
  const move = offeredMoves.nth(moveIndex);
  const offer = await move.evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Offered move is not a button.');
    const read = (name: string): string => {
      const value = button.dataset[name];
      if (value === undefined) throw new Error(`Missing offered-move ${name}.`);
      return value;
    };
    return {
      actorId: read('actorId'),
      offeredActionId: read('offeredActionId'),
      revision: Number(read('encounterRevision')),
      anchor: [Number(read('anchorColumn')), Number(read('anchorRow'))],
      destination: [Number(read('destinationColumn')), Number(read('destinationRow'))],
    };
  });
  expect(offer.offeredActionId).toMatch(/^turn:.+:option:\d+$/u);
  expect(offer.destination).not.toEqual(offer.anchor);
  await expect(page.locator('[data-offered-action-id="not-an-engine-offer"]')).toHaveCount(0);

  await move.click();
  await expect.poll(async () => Number(await shell.getAttribute('data-session-revision')))
    .toBeGreaterThan(offer.revision);
  const movedToken = page.locator(`.encounter-token[data-combatant-id="${offer.actorId}"]`);
  await expect(movedToken).toHaveAttribute('data-column', String(offer.destination[0]));
  await expect(movedToken).toHaveAttribute('data-row', String(offer.destination[1]));

  const record = `artifact=dev page=${page.url()} offered=${offer.offeredActionId} ` +
    `destination=${offer.destination.join(',')}`;
  await testInfo.attach('vtt-top-down-artifact', { body: record, contentType: 'text/plain' });
  console.log(record);
});
