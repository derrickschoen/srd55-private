import { expect, test, type Page } from '@playwright/test';
import { readGuidedSeam } from './fixtures/guided-seam';

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

async function resetHome(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);
}

async function expectNoPlannerRouteAnchors(page: Page): Promise<void> {
  const hrefs = await page.locator('a').evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href')),
  );
  for (const href of hrefs) {
    expect(href).not.toBeNull();
    if (href !== null) {
      const segments = new URL(href, page.url()).pathname
        .split('/')
        .filter((segment) => segment.length > 0);
      const matchesPlannerRoute =
        segments.length === 2 &&
        segments[0] === 'characters' &&
        /^\d+$/.test(segments[1] ?? '');
      expect(matchesPlannerRoute).toBe(false);
    }
  }
}

test('the empty-database front door chooses class first, persists once named, and survives reload without a planner escape', async ({
  page,
}) => {
  await resetHome(page);

  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([]);

  const seam = await readGuidedSeam(page);
  const primaryAction = page.getByRole('link', {
    name: 'Create a character',
  });
  await expect(primaryAction).toHaveAttribute('href', seam.newRoute);

  const blankEscape = page.locator('details.advanced-create');
  await expect(blankEscape).not.toHaveAttribute('open', '');
  await expect(
    page.getByRole('button', { name: 'Create blank character' }),
  ).not.toBeVisible();
  await page
    .getByText('Advanced: create a blank character', { exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Create blank character' }),
  ).toBeVisible();
  await page
    .getByText('Advanced: create a blank character', { exact: true })
    .click();

  await primaryAction.click();
  await expect(page).toHaveURL(new URL(seam.newRoute, page.url()).href);
  await expect(
    page.locator(
      `[${seam.panelAttribute}="${seam.classChooserPanel}"]`,
    ),
  ).toBeVisible();

  await expect(page.locator('input')).toHaveCount(0);
  await expectNoPlannerRouteAnchors(page);

  const firstClass = page.locator('[data-class-option]').first();
  await expect(firstClass.locator('.guided-class-name')).not.toHaveText('');
  await expect(firstClass.locator('.guided-class-hit-die')).toHaveText(
    /^Hit die: (?:d[1-9]\d*|unknown)$/,
  );
  await firstClass.click();

  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([]);
  await expect(page.locator('input')).toHaveCount(1);
  await expectNoPlannerRouteAnchors(page);

  await page.getByLabel('Character name').fill('Front Door Hero');
  await page.getByRole('button', { name: 'Create character' }).click();

  const persisted = await page.evaluate(() =>
    window.staticApp.inspectRows('characters'),
  );
  expect(persisted).toEqual([
    expect.objectContaining({
      name: 'Front Door Hero',
      revision: 0,
    }),
  ]);
  const characterId = Number(persisted[0]?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const persistedSeam = await readGuidedSeam(page, characterId);
  if (persistedSeam.buildPath === null) {
    throw new Error('The guided seam returned no persisted build path.');
  }
  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.abilitiesStepPanel}"]`,
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      `[${persistedSeam.abilityMethodAttribute}="standard_array"]`,
    ),
  ).toBeChecked();
  await expect(
    page.locator(`[${persistedSeam.abilityMethodAttribute}]`),
  ).toHaveCount(3);
  await expect(page.getByText('Roll in Order', { exact: false })).toHaveCount(0);

  await page.locator(
    `[${persistedSeam.abilityMethodAttribute}="manual"]`,
  ).check();
  const abilityInputs = page.locator(
    `[${persistedSeam.abilityInputAttribute}]`,
  );
  await expect(abilityInputs).toHaveCount(6);
  for (const input of await abilityInputs.all()) {
    await expect(input).toHaveValue('10');
  }
  await expect(
    page.locator(
      `[${persistedSeam.abilityWarningAttribute}="non_standard_method"]`,
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      `[${persistedSeam.abilityWarningAttribute}="weak_scores"]`,
    ),
  ).toBeVisible();
  const abilitySubmit = page.locator(
    `[${persistedSeam.abilitySubmitAttribute}]`,
  );
  await expect(abilitySubmit).toBeEnabled();
  await abilitySubmit.click();

  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.speciesStepPanel}"]`,
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: characterId,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      ability_allocation_method: 'manual',
      revision: 1,
    }),
  ]);
  await expectNoPlannerRouteAnchors(page);

  await page.reload();

  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.getByRole('heading', { name: 'Guided character builder' }),
  ).toBeVisible();
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.speciesStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: characterId,
      name: 'Front Door Hero',
      ability_allocation_method: 'manual',
      revision: 1,
    }),
  ]);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_class_levels'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
      level: 1,
      is_starting_class: 1,
    }),
  ]);

  const dwarf = page.getByRole('button', { name: 'Choose Dwarf' });
  await expect(dwarf).toBeVisible();
  await dwarf.click();

  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.backgroundStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_species'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
    }),
  ]);
  expect(
    (
      await page.evaluate(() =>
        window.staticApp.inspectRows('character_species_traits'),
      )
    ).length,
  ).toBeGreaterThan(0);
  expect(
    (
      await page.evaluate(() =>
        window.staticApp.inspectRows('character_effects'),
      )
    ).length,
  ).toBeGreaterThan(0);

  await page.reload();
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.backgroundStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);

  const firstBackground = page.locator('[data-background-option]').first();
  await expect(firstBackground).toBeVisible();
  await firstBackground.click();

  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.getByRole('heading', {
      name: 'The Skills step is not built yet',
    }),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_background'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
    }),
  ]);

  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'The Skills step is not built yet',
    }),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_background'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
    }),
  ]);
});
