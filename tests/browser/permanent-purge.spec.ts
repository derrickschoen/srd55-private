import type { Page } from '@playwright/test';
import {
  announcedMessages,
  clearAnnouncements,
  installAnnouncementRecorder,
} from './fixtures/announcements';
import { expect, test } from './fixtures/parallel-test';
import { readGuidedSeam } from './fixtures/guided-seam';

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  if (path === '/') {
    await ready(page);
  } else {
    await expect(page.getByRole('heading', { name: 'Homebrew library' }))
      .toBeVisible();
  }
}

async function publishSpecies(
  page: Page,
  name: string,
  speed: number,
): Promise<void> {
  await open(page, '/homebrew');
  await page.getByRole('button', { name: 'New species' }).click();
  await expect(page.getByLabel('Species authoring form')).toBeVisible();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Rules edition').selectOption('expanded');
  await page.getByLabel('Creature type').fill('Humanoid');
  await page.getByLabel('Primary size').fill('Medium');
  await page.getByLabel('Walking speed (feet)').fill(String(speed));
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.species-authoring-status')).toContainText(
    'Saved revision 1.',
  );
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await page.getByRole('button', { name: 'Publish species' }).click();
  await expect(page.getByRole('heading', { name: 'Species published' })).toBeVisible();
}

function publishedCard(page: Page, name: string) {
  return page.locator('.homebrew-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
}

test('publishes, versions, archives, restores, and permanently purges a whole lineage', async ({
  page,
}) => {
  // Measured alone at 28.4s. It is now the slowest authoring-journey
  // precedent; the required x1.5 contention reserve is 42.6s, rounded up.
  test.setTimeout(43_000);
  await installAnnouncementRecorder(page);
  await open(page, '/');
  await page.evaluate(() => window.staticApp.reset());

  await publishSpecies(page, 'Purge Journey Species', 30);
  await publishSpecies(page, 'Purge Journey Neighbour', 35);

  await open(page, '/');
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').filter({ hasText: 'Fighter' }).first().click();
  await page.getByLabel('Character name').fill('Purge Journey Hero');
  await page.getByRole('button', { name: 'Create character' }).click();
  const characters = await page.evaluate(() => window.staticApp.inspectRows('characters'));
  const characterId = Number(characters.find(
    (row) => row['name'] === 'Purge Journey Hero',
  )?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const seam = await readGuidedSeam(page, characterId);
  await page.locator(`[${seam.abilityMethodAttribute}="manual"]`).check();
  await page.locator(`[${seam.abilitySubmitAttribute}]`).click();
  await expect(page.locator(
    `[${seam.panelAttribute}="${seam.speciesStepPanel}"]`,
  )).toBeVisible();
  await page.getByRole('button', { name: 'Choose Purge Journey Species' }).click();

  await open(page, '/homebrew');
  await publishedCard(page, 'Purge Journey Species')
    .getByRole('button', { name: /Edit .* as a new version/ })
    .click();
  await expect(page.getByLabel('Species authoring form')).toBeVisible();
  await page.getByLabel('Name').fill('Purge Journey Species Revised');
  await page.getByLabel('Walking speed (feet)').fill('40');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.species-authoring-status')).toContainText('Saved revision');
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await page.getByRole('button', { name: 'Publish species' }).click();
  await expect(page.getByRole('heading', { name: 'Species published' })).toBeVisible();
  await page.getByRole('link', { name: 'Review character fixes' }).click();
  await expect(page.getByLabel('Fix affected characters')).toContainText(
    'Purge Journey Hero',
  );
  await clearAnnouncements(page);
  await expect(page.getByRole('radio', {
    name: 'Match — Uses the existing local entry; this attached character moves to it.',
  })).toBeChecked();
  const applyFixes = page.getByRole('button', { name: 'Apply to all listed characters' });
  await expect(applyFixes).toBeEnabled();
  await applyFixes.focus();
  await applyFixes.press('Enter');
  await expect(page.getByRole('heading', { name: 'Character fixes applied' }))
    .toBeVisible();
  await expect.poll(() => announcedMessages(page)).toEqual(expect.arrayContaining([
    'Applying every reviewed replacement…',
    'All listed characters were updated.',
  ]));

  const lineageKeys = await page.evaluate(async () =>
    (await window.staticApp.inspectRows('species_definitions'))
      .filter((row) => String(row['name']).startsWith('Purge Journey Species'))
      .map((row) => String(row['content_key']))
      .sort()
  );
  expect(lineageKeys).toHaveLength(2);

  await open(page, '/homebrew');
  await publishedCard(page, 'Purge Journey Species Revised')
    .getByRole('link', { name: 'Delete' })
    .click();
  await expect(page.getByRole('heading', {
    name: 'Delete creation and attached characters',
  })).toBeVisible();
  await expect(page.getByText('Purge Journey Hero', { exact: true })).toBeVisible();
  await clearAnnouncements(page);
  const archive = page.getByRole('button', {
    name: 'Archive creation and all listed characters',
  });
  await archive.focus();
  await archive.press('Enter');
  await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
  await expect(page.getByText('Purge Journey Hero', { exact: true })).toBeVisible();
  await expect.poll(() => announcedMessages(page))
    .toContain('Archiving the reviewed set…');

  await clearAnnouncements(page);
  const restore = page.getByRole('button', {
    name: 'Restore creation and all listed characters',
  });
  await restore.focus();
  await restore.press('Enter');
  await expect(page.getByText('The archive is empty.')).toBeVisible();
  await expect.poll(() => announcedMessages(page)).toEqual(expect.arrayContaining([
    'Restoring the complete set…',
    'Creation and all listed characters restored.',
  ]));
  expect(await page.evaluate(async (id) =>
    (await window.staticApp.inspectRows('characters'))
      .some((row) => row['id'] === id),
  characterId)).toBe(true);

  // Permanent purge is archive-only, so the restored set is archived again.
  await open(page, '/homebrew');
  await publishedCard(page, 'Purge Journey Species Revised')
    .getByRole('link', { name: 'Delete' })
    .click();
  const archiveAgain = page.getByRole('button', {
    name: 'Archive creation and all listed characters',
  });
  await archiveAgain.focus();
  await archiveAgain.press('Enter');
  await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
  await clearAnnouncements(page);
  const purge = page.getByRole('button', {
    name: 'Permanently purge Purge Journey Species Revised and its entire version lineage',
  });
  const beforeCancel = await page.evaluate(async ({ keys, id }) => ({
    lineage: (await window.staticApp.inspectRows('catalog_content_identities'))
      .filter((row) => keys.includes(String(row['content_key'])))
      .map((row) => String(row['content_key'])).sort(),
    character: (await window.staticApp.inspectRows('characters'))
      .filter((row) => row['id'] === id),
    edges: (await window.staticApp.inspectRows('catalog_content_supersessions'))
      .filter((row) =>
        keys.includes(String(row['superseded_content_key'])) ||
        keys.includes(String(row['successor_content_key']))
      ),
  }), { keys: lineageKeys, id: characterId });
  await purge.click();
  const confirmation = page.getByRole('dialog', {
    name: 'Permanently purge “Purge Journey Species Revised”?',
  });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText('2 revisions in this lineage');
  await expect(confirmation.getByText('Purge Journey Hero', { exact: true })).toBeVisible();
  const cancelPurge = confirmation.getByRole('button', {
    name: 'Cancel — keep everything',
  });
  const confirmPurge = confirmation.getByRole('button', {
    name: 'Permanently purge named victims',
  });
  await expect(cancelPurge).toBeFocused();
  await cancelPurge.press('Shift+Tab');
  await expect(confirmPurge).toBeFocused();
  await confirmPurge.press('Tab');
  await expect(cancelPurge).toBeFocused();
  await cancelPurge.click();
  await expect(confirmation).toHaveCount(0);
  await expect(purge).toBeFocused();
  expect(await page.evaluate(async ({ keys, id }) => ({
    lineage: (await window.staticApp.inspectRows('catalog_content_identities'))
      .filter((row) => keys.includes(String(row['content_key'])))
      .map((row) => String(row['content_key'])).sort(),
    character: (await window.staticApp.inspectRows('characters'))
      .filter((row) => row['id'] === id),
    edges: (await window.staticApp.inspectRows('catalog_content_supersessions'))
      .filter((row) =>
        keys.includes(String(row['superseded_content_key'])) ||
        keys.includes(String(row['successor_content_key']))
      ),
  }), { keys: lineageKeys, id: characterId })).toEqual(beforeCancel);
  await expect.poll(() => announcedMessages(page)).toEqual(expect.arrayContaining([
    'Permanent purge confirmation opened for Purge Journey Species Revised. Nothing has been deleted.',
    'Permanent purge cancelled. Nothing was deleted.',
  ]));

  await clearAnnouncements(page);
  await purge.focus();
  await purge.press('Enter');
  await expect(cancelPurge).toBeFocused();
  expect(await page.evaluate(async (keys) =>
    (await window.staticApp.inspectRows('catalog_content_identities'))
      .filter((row) => keys.includes(String(row['content_key']))).length,
  lineageKeys)).toBe(2);
  await page.keyboard.press('Escape');
  await expect(confirmation).toHaveCount(0);
  await expect(purge).toBeFocused();

  await purge.click();
  await expect(cancelPurge).toBeFocused();
  await confirmPurge.click();
  await expect(page.getByText('The archive is empty.')).toBeVisible();
  await expect.poll(() => announcedMessages(page)).toEqual(expect.arrayContaining([
    'Permanently purging the complete version lineage…',
    'Entire version lineage permanently purged.',
  ]));

  expect(await page.evaluate(async ({ keys, id }) => ({
    remainingLineage: (await window.staticApp.inspectRows('catalog_content_identities'))
      .filter((row) => keys.includes(String(row['content_key']))),
    remainingCharacter: (await window.staticApp.inspectRows('characters'))
      .filter((row) => row['id'] === id),
    remainingEdges: (await window.staticApp.inspectRows('catalog_content_supersessions'))
      .filter((row) =>
        keys.includes(String(row['superseded_content_key'])) ||
        keys.includes(String(row['successor_content_key']))
      ),
    neighbour: (await window.staticApp.inspectRows('species_definitions'))
      .filter((row) => row['name'] === 'Purge Journey Neighbour'),
  }), { keys: lineageKeys, id: characterId })).toEqual({
    remainingLineage: [],
    remainingCharacter: [],
    remainingEdges: [],
    neighbour: [expect.objectContaining({ name: 'Purge Journey Neighbour' })],
  });
});
