import type { Page } from '@playwright/test';
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
  // Budget: max(HA-8 14.8s, HA-9 18.2s, BHC 21.0s) = 21.0s.
  // The required x1.5 reserve is 10.5s, totaling 31.5s; round up to 32s.
  test.setTimeout(32_000);
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
  await page.getByRole('button', { name: 'Apply to all listed characters' }).click();
  await expect(page.getByRole('heading', { name: 'Character fixes applied' }))
    .toBeVisible();

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
  await page.getByRole('button', {
    name: 'Archive creation and all listed characters',
  }).click();
  await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
  await expect(page.getByText('Purge Journey Hero', { exact: true })).toBeVisible();

  await page.getByRole('button', {
    name: 'Restore creation and all listed characters',
  }).click();
  await expect(page.getByText('The archive is empty.')).toBeVisible();
  expect(await page.evaluate(async (id) =>
    (await window.staticApp.inspectRows('characters'))
      .some((row) => row['id'] === id),
  characterId)).toBe(true);

  // Permanent purge is archive-only, so the restored set is archived again.
  await open(page, '/homebrew');
  await publishedCard(page, 'Purge Journey Species Revised')
    .getByRole('link', { name: 'Delete' })
    .click();
  await page.getByRole('button', {
    name: 'Archive creation and all listed characters',
  }).click();
  await expect(page.getByRole('heading', { name: 'Archive' })).toBeVisible();
  await page.getByRole('button', {
    name: 'Permanently purge Purge Journey Species Revised and its entire version lineage',
  }).click();
  await expect(page.getByText('The archive is empty.')).toBeVisible();

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
