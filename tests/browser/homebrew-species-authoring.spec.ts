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

async function resetHome(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);
}

test('authors, previews, publishes, lists, and applies a homebrew species', async ({
  page,
}) => {
  // Budget derivation (pool measurement belongs to the supervisor): the guided
  // journey measured 25.2s + 15s reserved for this spec's second app boot +
  // 15s reserved for authoring/publish/grant interactions = 55.2s. Multiplying
  // by 1.6 for pool contention gives 88.32s, rounded up to 90s. If the measured
  // pool run exceeds 36s (40%), D200 discipline requires a measured revision.
  test.setTimeout(90_000);
  await resetHome(page);

  await page.getByRole('link', { name: 'Homebrew library' }).click();
  await page.getByRole('button', { name: 'New species' }).click();
  await expect(page.getByLabel('Species authoring form')).toBeVisible();

  await page.getByLabel('Name').fill('Clockwork Voyager');
  await page.getByLabel('Rules edition').selectOption('expanded');
  await page.getByLabel('Creature type').fill('Clockwork');
  await page.getByLabel('Primary size').fill('Colossal');
  await page.getByLabel('Alternate size (optional)').fill('Small');
  await page.getByLabel('Walking speed (feet)').fill('35');
  await page
    .getByLabel('Reference text for mechanics not applied to the sheet')
    .fill('Its winding key is reference prose and changes no sheet number.');

  await page.getByRole('button', { name: 'Add trait' }).click();
  const trait = page.locator('.species-trait-card').first();
  await trait.getByLabel('Trait name').fill('Void Ward');
  await trait.getByLabel('Trait description').fill('A ward against impossible space.');
  await trait.getByRole('button', { name: 'Add effect' }).click();
  const effect = trait.locator('.authoring-effect-card').first();
  await effect.getByLabel('Label').fill('Void resistance');
  await effect.getByLabel('Damage type').fill('Void');

  await page.getByRole('button', { name: 'Add grant' }).click();
  const grant = page.locator('.species-grant-card').first();
  await grant.getByLabel('Rule key').fill('clockwork-lore');
  await grant.getByLabel('Number of skills to choose').fill('1');
  await grant.getByLabel('Arcana', { exact: true }).check();
  await grant.getByLabel('History', { exact: true }).check();

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.species-authoring-status')).toContainText('Saved revision 1.');
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await expect(page.getByRole('heading', { name: 'Publish preview' })).toBeVisible();
  await expect(page.getByLabel('Trait preview')).toContainText('Void Ward');
  await expect(page.getByLabel('Grant preview')).toContainText('clockwork-lore');
  await page.getByRole('button', { name: 'Publish species' }).click();
  await expect(page.getByRole('heading', { name: 'Species published' })).toBeVisible();
  await expect(page.getByText('Homebrew', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'View species library' }).click();
  const published = page.locator('.homebrew-card').filter({
    has: page.getByRole('heading', { name: 'Clockwork Voyager' }),
  });
  await expect(published).toBeVisible();
  await expect(published.getByText('Homebrew', { exact: true })).toBeVisible();

  await page.goto('/');
  await ready(page);
  const seam = await readGuidedSeam(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').filter({ hasText: 'Fighter' }).first().click();
  await page.getByLabel('Character name').fill('Species Form Hero');
  await page.getByRole('button', { name: 'Create character' }).click();
  const characters = await page.evaluate(() => window.staticApp.inspectRows('characters'));
  const characterId = Number(characters[0]?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const persistedSeam = await readGuidedSeam(page, characterId);
  await page.locator(
    `[${persistedSeam.abilityMethodAttribute}="manual"]`,
  ).check();
  await page.locator(
    `[${persistedSeam.abilitySubmitAttribute}]`,
  ).click();
  await expect(page.locator(
    `[${persistedSeam.panelAttribute}="${persistedSeam.speciesStepPanel}"]`,
  )).toBeVisible();
  await page.getByRole('button', { name: 'Choose Clockwork Voyager' }).click();
  await expect(page.locator(
    `[${persistedSeam.panelAttribute}="${persistedSeam.backgroundStepPanel}"]`,
  )).toBeVisible();

  const acolyte = page
    .locator('.guided-background-choice')
    .filter({ hasText: 'Acolyte' })
    .locator('input');
  await acolyte.check();
  await page.locator('[data-background-submit]').click();
  await expect(page.locator(
    `[${persistedSeam.panelAttribute}="${persistedSeam.skillsStepPanel}"]`,
  )).toBeVisible();

  const authoredGrant = page.getByLabel(
    'Clockwork Voyager skill grant skill',
    { exact: true },
  );
  await expect(authoredGrant.locator('option')).toHaveText([
    'Choose a skill',
    'Arcana',
    'History',
  ]);
  await authoredGrant.selectOption('arcana');
  await page.getByRole('button', {
    name: 'Choose Clockwork Voyager skill grant skill',
    exact: true,
  }).click();
  await expect(page.locator(
    `[${persistedSeam.skillGrantedAttribute}="arcana"]`,
  )).toContainText('Arcana — Clockwork Voyager (skill grant)');

  expect(
    await page.evaluate(() => window.staticApp.inspectRows('character_species')),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
      name: 'Clockwork Voyager',
      creature_type: 'Clockwork',
      size: 'Colossal',
      base_speed_feet: 35,
    }),
  ]);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('character_species_traits')),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
      name: 'Void Ward',
    }),
  ]);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('character_effects')),
  ).toEqual(expect.arrayContaining([
    expect.objectContaining({
      character_id: characterId,
      effect_kind: 'damage_resistance',
      damage_type: 'Void',
      label: 'Void resistance',
    }),
  ]));
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('character_skill_grants')),
  ).toEqual(expect.arrayContaining([
    expect.objectContaining({
      character_id: characterId,
      grant_key: 'clockwork-lore',
      ordinal: 1,
      skill: 'arcana',
      state: 'active',
    }),
  ]));
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_skill_proficiencies'),
    ),
  ).toEqual(expect.arrayContaining([
    expect.objectContaining({ character_id: characterId, skill: 'arcana' }),
  ]));
});
