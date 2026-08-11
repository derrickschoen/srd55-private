import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CharacterRow {
  readonly id: number;
  readonly revision: number;
}

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
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute('aria-busy', 'false');
}

test('authors and applies a background with persisted skill grants and a flat effect', async ({ page }) => {
  // Measured alone on PLAYWRIGHT_PORT=5040 at 18.6s with the human preview
  // and authored-card casing pins. 18.6s × 1.5 = 27.9s.
  test.setTimeout(27_900);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);

  await page.getByRole('link', { name: 'Homebrew library', exact: true }).click();
  await page.getByRole('tab', { name: 'Backgrounds', exact: true }).click();
  await page.getByRole('button', { name: 'New background', exact: true }).click();
  await expect(page.getByLabel('Background authoring form', { exact: true })).toBeVisible();

  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Journey Wayfarer');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('2024');
  await page.getByRole('checkbox', { name: 'Intelligence', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Wisdom', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Dexterity', exact: true }).check();
  const originFeat = page.getByRole('combobox', {
    name: 'Installed Origin feat',
    exact: true,
  });
  await originFeat.selectOption({ label: 'Alert (2024 rules)' });
  expect(await originFeat.evaluate((select) => {
    const selected = (select as HTMLSelectElement).selectedOptions[0];
    return selected?.parentElement instanceof HTMLOptGroupElement
      ? selected.parentElement.label
      : null;
  })).toBe('SRD · bundled layer');
  await page.getByRole('checkbox', { name: 'Investigation', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Survival', exact: true }).check();
  await page.getByRole('textbox', { name: 'Tool reference text (optional)', exact: true })
    .fill('Navigator tools');
  await page.getByRole('textbox', { name: 'Equipment option A description', exact: true })
    .fill('Club and navigator tools');
  await page.getByRole('textbox', { name: 'Equipment option B description', exact: true })
    .fill('Leather Armor and navigator tools');
  await page.getByRole('button', { name: 'Add effect', exact: true }).click();
  const effect = page.getByRole('group', { name: 'Effect 1 of 1: Armor Class bonus', exact: true });
  await effect.getByRole('textbox', { name: 'Label', exact: true }).fill('Wayfarer ward');
  await effect.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('2');

  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.background-authoring-status')).toContainText('Saved revision 1.');
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Publish preview', exact: true })).toBeVisible();
  await expect(page.getByLabel('Background effect preview', { exact: true })).toContainText('Wayfarer ward');
  await expect(page.getByLabel('Grant preview', { exact: true })).toContainText(
    'Gain Alert · SRD · bundled layer, including its configured grants.',
  );
  await expect(page.getByLabel('Background effect preview', { exact: true })).toContainText(
    'Wayfarer ward: +2 Armor Class.',
  );
  await expect(page.locator('.background-publish-preview code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Publish background', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Background published', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View background library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Journey Wayfarer', exact: true })).toBeVisible();
  await expect(page.getByText('Background · published homebrew version', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
  await page.getByRole('link', { name: 'Create a character', exact: true }).click();
  await page.getByRole('button', {
    name: 'Fighter',
    exact: true,
  }).click();
  await page.getByRole('textbox', { name: 'Character name', exact: true }).fill('Background Journey Hero');
  await page.getByRole('button', { name: 'Create character', exact: true }).click();
  await page.getByRole('radio', { name: 'Manual entry', exact: true }).check();
  await page.getByRole('button', { name: 'Set ability scores', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Human', exact: true }).click();
  const authoredBackgroundCard = page.locator('.guided-background-card').filter({
    has: page.getByRole('radio', { name: 'Journey Wayfarer', exact: true }),
  });
  const bundledBackgroundCard = page.locator('.guided-background-card').filter({
    has: page.getByRole('radio', { name: 'Acolyte', exact: true }),
  });
  await expect(authoredBackgroundCard.locator('.guided-background-printed')).toHaveText(
    'Printed defaults: Intelligence, Wisdom, Dexterity; Alert.',
  );
  await expect(bundledBackgroundCard.locator('.guided-background-printed')).toHaveText(
    /Printed defaults: [A-Z][a-z]+, [A-Z][a-z]+, [A-Z][a-z]+;/u,
  );
  await page.getByRole('radio', { name: 'Journey Wayfarer', exact: true }).check();
  const disclosure = page.locator('.guided-background-apply-disclosure');
  await expect(disclosure).toContainText('What Apply changes now');
  await expect(disclosure).toContainText(
    'Investigation and Survival as skill proficiencies',
  );
  await expect(disclosure).toContainText(
    'Alert · SRD · bundled layer as your Origin feat',
  );
  await expect(disclosure).toContainText(
    'Wayfarer ward · Homebrew · external layer as a configured background effect',
  );
  await expect(disclosure).toContainText(
    'Navigator tools · Homebrew · external layer is recorded as tool reference text; no tool proficiency is mechanically applied.',
  );
  await expect(disclosure).toContainText(
    'The starting equipment package is chosen and mechanically applied at the equipment step, not by Apply background.',
  );
  await page.getByRole('button', { name: 'Apply background', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose skills', exact: true })).toBeVisible();

  const persisted = await page.evaluate(async () => {
    const characters = await window.staticApp.inspectRows('characters');
    const applied = characters.find((row) => row['name'] === 'Background Journey Hero');
    const appliedId = Number(applied?.['id']);
    if (!Number.isSafeInteger(appliedId)) throw new Error('Applied character was not persisted.');
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly name: string; readonly content_key: string }[]
    >('queries.characters.guidedClassOptions', {});
    const fighter = classes.find((candidate) => candidate.name === 'Fighter');
    if (fighter === undefined) throw new Error('Bundled Fighter is missing.');
    const baseline = await window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      CharacterRow
    >('queries.characters.createGuided', {
      name: 'Background Journey Baseline',
      class_content_key: fighter.content_key,
    });
    const baselineGrants = await window.staticApp.inspectRows(
      'character_skill_grants', { character_id: baseline.id },
    );
    return {
      appliedId,
      baselineId: baseline.id,
      effects: await window.staticApp.inspectRows('character_effects', { character_id: appliedId }),
      grants: await window.staticApp.inspectRows('character_skill_grants', { character_id: appliedId }),
      proficiencies: await window.staticApp.inspectRows(
        'character_skill_proficiencies', { character_id: appliedId },
      ),
      items: await window.staticApp.inspectRows(
        'character_items', { character_id: appliedId },
      ),
      background: await window.staticApp.inspectRows(
        'character_background', { character_id: appliedId },
      ),
      baselineEffects: await window.staticApp.inspectRows('character_effects', { character_id: baseline.id }),
      baselineAuthoredGrants: baselineGrants.filter((row) =>
        row['skill'] === 'investigation' || row['skill'] === 'survival'),
    };
  });

  expect(persisted.effects).toEqual(expect.arrayContaining([
    expect.objectContaining({
      character_id: persisted.appliedId,
      effect_kind: 'armor_class_bonus',
      amount: 2,
      label: 'Wayfarer ward',
      template_ref: expect.stringMatching(/^background_template_effects:/u),
    }),
  ]));
  expect(persisted.grants).toEqual(expect.arrayContaining([
    expect.objectContaining({ character_id: persisted.appliedId, skill: 'investigation', state: 'active' }),
    expect.objectContaining({ character_id: persisted.appliedId, skill: 'survival', state: 'active' }),
  ]));
  expect(persisted.proficiencies.map((row) => row['skill']).sort()).toEqual([
    'investigation',
    'survival',
  ]);
  expect(persisted.items).toEqual([]);
  expect(persisted.background).toEqual([
    expect.objectContaining({ tool_proficiency: 'Navigator tools' }),
  ]);
  expect(persisted.baselineEffects).toEqual([]);
  expect(persisted.baselineAuthoredGrants).toEqual([]);

  await page.goto('/homebrew?tab=background');
  await homebrewReady(page);
  await page.reload();
  await homebrewReady(page);
  expect(await page.evaluate((characterId) => window.staticApp.inspectRows(
    'character_effects', { character_id: characterId },
  ), persisted.appliedId)).toEqual(persisted.effects);
  expect(await page.evaluate((characterId) => window.staticApp.inspectRows(
    'character_skill_grants', { character_id: characterId },
  ), persisted.appliedId)).toEqual(persisted.grants);
  expect(await page.evaluate((characterId) => window.staticApp.inspectRows(
    'character_effects', { character_id: characterId },
  ), persisted.baselineId)).toEqual([]);
  expect(await page.evaluate(async (characterId) => (await window.staticApp.inspectRows(
    'character_skill_grants', { character_id: characterId },
  )).filter((row) => row['skill'] === 'investigation' || row['skill'] === 'survival'),
  persisted.baselineId)).toEqual([]);

  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
});
