import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

async function globalReady(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

async function homebrewReady(page: Page): Promise<void> {
  await expect(page.locator('.homebrew-status')).toHaveText(
    'Homebrew library loaded.',
    { timeout: 65_000 },
  );
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function publishSpecies(page: Page): Promise<void> {
  await page.goto('/homebrew?tab=species');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New species', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('HA10 Starling');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('expanded');
  await page.getByRole('combobox', { name: 'Creature type', exact: true }).fill('Astral');
  await page.getByRole('combobox', { name: 'Primary size', exact: true }).fill('Medium');
  await page.getByRole('spinbutton', { name: 'Walking speed (feet)', exact: true }).fill('30');
  await page.getByRole('button', { name: 'Add trait', exact: true }).click();
  await page.getByRole('textbox', { name: 'Trait name', exact: true }).fill('Starlit Memory');
  await page.getByRole('textbox', { name: 'Trait description', exact: true })
    .fill('You remember the paths between constellations.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish species', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Species published', exact: true })).toBeVisible();
}

async function publishBackground(page: Page): Promise<void> {
  await page.goto('/homebrew?tab=background');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New background', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('HA10 Wayfinder');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('2024');
  await page.getByRole('checkbox', { name: 'Strength', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Dexterity', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Constitution', exact: true }).check();
  await page.getByRole('combobox', { name: 'Installed Origin feat', exact: true })
    .selectOption({ label: 'Alert (2024 rules)' });
  await page.getByRole('checkbox', { name: 'Athletics', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Survival', exact: true }).check();
  await page.getByRole('textbox', { name: 'Equipment option A description', exact: true })
    .fill('A walking staff and a map case.');
  await page.getByRole('textbox', { name: 'Equipment option B description', exact: true })
    .fill('A lantern and a weathered atlas.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish background', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Background published', exact: true })).toBeVisible();
}

async function publishSubclass(page: Page): Promise<void> {
  await page.goto('/homebrew?tab=subclass');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New subclass', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('HA10 Horizon Guard');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('expanded');
  await page.getByRole('combobox', { name: 'Parent bundled class', exact: true })
    .selectOption({ label: 'Fighter' });
  await page.getByRole('combobox', { name: 'Progression mode', exact: true })
    .selectOption('inherit_parent');
  await page.getByRole('combobox', { name: 'Timeline level', exact: true }).selectOption('3');
  await page.getByRole('button', { name: 'Add level', exact: true }).click();
  await page.getByRole('button', { name: 'Add feature at level 3', exact: true }).click();
  const level = page.getByRole('region', { name: 'Level 3', exact: true });
  await level.getByRole('textbox', { name: 'Feature name', exact: true }).fill('Horizon Watch');
  await level.getByRole('textbox', { name: 'Feature description', exact: true })
    .fill('You keep watch where the familiar road ends.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish subclass', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Subclass published', exact: true })).toBeVisible();
}

test('published origins and subclass cut over to ordinary consumers with catalog disclosure', async ({ page }) => {
  // Measured precedents: species 17.7s + subclass 14.8s + background 18.2s
  // + the 17.4s level-up/sheet precedent = 68.1s. The required x1.5 reserve
  // is 102.15s; 110s leaves 7.85s additional headroom.
  test.setTimeout(110_000);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);

  await publishSpecies(page);
  await publishBackground(page);
  await publishSubclass(page);

  await page.goto('/');
  await globalReady(page);
  await page.getByRole('link', { name: 'Create a character', exact: true }).click();
  const classCatalog = page.getByRole('list', { name: 'Bundled classes', exact: true });
  await expect(classCatalog.getByText('Homebrew · external layer', { exact: true })).toHaveCount(0);
  await page.getByRole('button', {
    name: 'Fighter',
    exact: true,
  }).click();
  await page.getByRole('textbox', { name: 'Character name', exact: true }).fill('HA10 Cutover Hero');
  await page.getByRole('button', { name: 'Create character', exact: true }).click();
  await page.getByRole('radio', { name: 'Manual entry', exact: true }).check();
  await page.getByRole('button', { name: 'Set ability scores', exact: true }).click();

  const speciesCard = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: 'HA10 Starling', exact: true }),
  });
  await expect(speciesCard.getByText('Homebrew · external layer', { exact: true })).toBeVisible();
  const chooseSpecies = speciesCard.getByRole('button', {
    name: 'Choose HA10 Starling',
    exact: true,
  });
  await chooseSpecies.focus();
  await chooseSpecies.press('Enter');

  const backgroundCard = page.getByRole('listitem').filter({
    has: page.getByRole('radio', { name: 'HA10 Wayfinder', exact: true }),
  });
  await expect(backgroundCard.getByText('Homebrew · external layer', { exact: true })).toBeVisible();
  const chooseBackground = backgroundCard.getByRole('radio', {
    name: 'HA10 Wayfinder',
    exact: true,
  });
  await chooseBackground.focus();
  await chooseBackground.press('Space');
  await expect(chooseBackground).toBeChecked();
  const applyBackground = page.getByRole('button', { name: 'Apply background', exact: true });
  await applyBackground.focus();
  await applyBackground.press('Enter');

  const characters = await page.evaluate(() => window.staticApp.inspectRows('characters'));
  const stored = characters.find((row) => row['name'] === 'HA10 Cutover Hero');
  const characterId = Number(stored?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);

  await page.goto(`/characters/${String(characterId)}/level-up`);
  await expect(page.getByRole('heading', { name: 'Level up — HA10 Cutover Hero', exact: true }))
    .toBeFocused({ timeout: 45_000 });
  await page.locator('[data-level-up-next]').click();
  await page.locator('[data-level-up-next]').click();
  await page.locator('[data-level-up-confirm]').click();
  await expect(page.getByRole('heading', { name: 'Fighter level 2 complete', exact: true }))
    .toBeFocused({ timeout: 45_000 });

  await page.goto(`/characters/${String(characterId)}/level-up`);
  await expect(page.getByRole('heading', { name: 'Level up — HA10 Cutover Hero', exact: true }))
    .toBeFocused({ timeout: 45_000 });
  await page.locator('[data-level-up-next]').click();
  await page.locator('[data-level-up-next]').click();
  const chooseSubclass = page.getByRole('radio', {
    name: 'HA10 Horizon Guard — Fighter, expanded rules',
    exact: true,
  });
  await chooseSubclass.focus();
  await chooseSubclass.press('Space');
  await expect(chooseSubclass).toBeChecked();
  await expect(chooseSubclass).toHaveAccessibleDescription('Homebrew · external layer');
  const reviewSubclass = page.locator('[data-level-up-next]');
  await reviewSubclass.focus();
  await reviewSubclass.press('Enter');
  await expect(
    page.getByText('HA10 Horizon Guard — Homebrew · external layer', {
      exact: true,
    }),
  ).toBeVisible();
  await page.locator('[data-level-up-confirm]').click();
  await expect(page.getByRole('heading', { name: 'Fighter level 3 complete', exact: true }))
    .toBeFocused({ timeout: 45_000 });
  await expect(
    page.getByText(
      'Subclass: HA10 Horizon Guard — Homebrew · external layer.',
      { exact: true },
    ),
  ).toBeVisible();

  await page.goto('/');
  await globalReady(page);
  const characterCard = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: 'HA10 Cutover Hero', exact: true }),
  });
  await expect(
    characterCard.getByText('Fighter 3 — SRD · bundled layer', { exact: true }),
  ).toBeVisible();

  await page.goto(`/characters/${String(characterId)}/sheet`);
  await expect(page.locator('[data-screen="character-sheet"]')).toBeVisible();
  for (const [kind, name] of [
    ['subclass', 'HA10 Horizon Guard'],
    ['species', 'HA10 Starling'],
    ['background', 'HA10 Wayfinder'],
  ] as const) {
    const row = page.locator(`[data-sheet-id^="catalog_source:${kind}:"]`);
    await expect(row).toContainText(name);
    await expect(row).toContainText('Homebrew · external layer');
  }

  await page.goto(`/characters/${String(characterId)}/report`);
  await expect(page.getByRole('heading', { name: 'Catalog provenance', exact: true })).toBeVisible();
  for (const [kind, name] of [
    ['subclass', 'HA10 Horizon Guard'],
    ['species', 'HA10 Starling'],
    ['background', 'HA10 Wayfinder'],
  ] as const) {
    const row = page.locator(`[data-catalog-kind="${kind}"]`);
    await expect(row).toContainText(name);
    await expect(row).toContainText('Homebrew · external layer');
  }

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Catalog provenance', exact: true })).toBeVisible();
  await expect(page.locator('[data-catalog-kind="subclass"]')).toContainText(
    'HA10 Horizon Guard · Subclass · Homebrew · external layer',
  );

  await page.goto('/homebrew?tab=subclass');
  await homebrewReady(page);
  await page.reload();
  await homebrewReady(page);
  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
});
