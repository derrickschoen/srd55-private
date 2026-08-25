import { expect, test } from './fixtures/parallel-test';

test('DM Long Rest ends the adventuring day and logs a cited autosaved summary', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/vtt?encounter=d365');
  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible({
    timeout: 65_000,
  });
  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 65_000,
  });

  await page.getByRole('button', { name: 'Complete Long Rest and end adventuring day' }).click();

  await expect(page.locator('.adventuring-day-status')).toHaveAttribute(
    'data-status',
    'ended_by_long_rest',
  );
  await expect(page.locator('.adventuring-day-status')).toContainText(
    'Adventuring day ended by Long Rest',
  );
  const card = page.locator('.long-rest-summary-card');
  await expect(card.getByRole('heading', { name: 'Long Rest completed — 8 hours' })).toBeVisible();
  await expect(card.locator('li')).toHaveCount(4);
  await expect(card.locator('.long-rest-citations')).toContainText(
    'docs/srd/full/srd-5.2.1.txt:11901-11913',
  );
  await expect(card.locator('.long-rest-citations')).toContainText(
    'docs/srd/full/srd-5.2.1.txt:11915-11917',
  );
  await expect(card).toContainText('Interruption handling is deferred.');
  await expect(page.getByRole('button', { name: 'End room and enter next room' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Short Rest before next room' })).toHaveCount(0);
  const browserSaves = page.locator('.dm-save-row[data-source="browser"]');
  const browserPoolLabels = browserSaves.locator('.dm-save-pool');
  const perRoundSaves = browserSaves.filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^Per-round autosave$/u }),
  });
  const encounterBoundarySaves = browserSaves.filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^Encounter-boundary autosave$/u }),
  });
  await expect(browserSaves).toHaveCount(3);
  await expect(browserPoolLabels).toHaveText([
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
  ]);
  await expect(perRoundSaves).toHaveCount(1);
  await expect(encounterBoundarySaves).toHaveCount(2);

  await page.getByText('Full revision history').click();
  await expect(page.getByText(/long_rest_completed/u)).toBeVisible();
});
