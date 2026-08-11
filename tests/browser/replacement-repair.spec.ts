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

async function openHomebrew(page: Page): Promise<void> {
  await page.goto('/homebrew');
  await expect(page.getByRole('heading', { name: 'Homebrew library' })).toBeVisible();
}

async function publishSpellSpecies(
  page: Page,
  name: string,
  maximumSpellLevel: number,
  listName = 'Wizard',
): Promise<void> {
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Rules edition').selectOption('expanded');
  await page.getByLabel('Creature type').fill('Humanoid');
  await page.getByLabel('Primary size').fill('Medium');
  await page.getByLabel('Walking speed (feet)').fill('30');
  const grants = page.locator('.species-grant-card');
  if (await grants.count() === 0) {
    await page.getByRole('button', { name: 'Add grant' }).click();
  }
  const grant = grants.first();
  await grant.getByLabel('Grant kind').selectOption('choice_from_list');
  await grant.getByLabel('Stable grant label').fill('retarget-spell-choice');
  await grant.getByLabel('Spell list').selectOption({ label: listName });
  await grant.getByLabel('Number of spells').fill('1');
  await grant.getByLabel('Minimum spell level (optional)').fill(
    String(maximumSpellLevel),
  );
  await grant.getByLabel('Maximum spell level (optional)').fill(
    String(maximumSpellLevel),
  );
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.species-authoring-status')).toContainText('Saved revision');
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await expect(page.getByRole('heading', { name: 'Publish preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Publish species' }).click();
  await expect(page.getByRole('heading', { name: 'Species published' })).toBeVisible();
}

function publishedCard(page: Page, name: string) {
  return page.locator('.homebrew-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
}

test('discloses a narrowing spell replacement before apply and repairs the exact choice', async ({
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5090 at 18.9s after the picker change.
  // The required x1.5 reserve is 28.35s, rounded up to 100ms.
  test.setTimeout(28_400);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());

  await openHomebrew(page);
  await page.getByRole('button', { name: 'New species' }).click();
  await publishSpellSpecies(page, 'Retarget Spell Species', 1);

  await page.goto('/');
  await ready(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').filter({ hasText: 'Fighter' }).first().click();
  await page.getByLabel('Character name').fill('Retarget Spell Hero');
  await page.getByRole('button', { name: 'Create character' }).click();
  const characterId = await page.evaluate(async () => Number(
    (await window.staticApp.inspectRows('characters')).find(
      (row) => row['name'] === 'Retarget Spell Hero',
    )?.['id'],
  ));
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const seam = await readGuidedSeam(page, characterId);
  await page.locator(`[${seam.abilityMethodAttribute}="manual"]`).check();
  await page.locator(`[${seam.abilitySubmitAttribute}]`).click();
  await expect(page.locator(
    `[${seam.panelAttribute}="${seam.speciesStepPanel}"]`,
  )).toBeVisible();
  await page.getByRole('button', { name: 'Choose Retarget Spell Species' }).click();

  await page.evaluate(async (id) => {
    const character = (await window.staticApp.inspectRows('characters', { id }))[0];
    const slot = (await window.staticApp.inspectRows('spell_selection_slots', {
      character_id: id,
      rule_key: 'retarget-spell-choice',
    }))[0];
    const magicMissile = (await window.staticApp.inspectRows('spell_versions')).find(
      (row) => row['display_name'] === 'Magic Missile' && row['is_active'] === 1,
    );
    if (character === undefined || slot === undefined || magicMissile === undefined) {
      throw new Error('Replacement browser fixture is incomplete.');
    }
    await window.appRpc.call('queries.characters.assignGuidedSpell', {
      character_id: id,
      address: { kind: 'slot_selection', id: Number(slot['id']) },
      spell_version_id: Number(magicMissile['id']),
      operation_uuid: crypto.randomUUID(),
      expected_revision: Number(character['revision']),
    });
  }, characterId);

  await openHomebrew(page);
  await publishedCard(page, 'Retarget Spell Species')
    .getByRole('button', { name: /Edit .* as a new version/u })
    .click();
  await expect(page.getByLabel('Species authoring form')).toBeVisible();
  await publishSpellSpecies(page, 'Retarget Spell Species Revised', 0);
  await page.getByRole('link', { name: 'Review character fixes' }).click();

  const review = page.getByLabel('Fix affected characters');
  await expect(review).toContainText('Retarget Spell Hero');
  await expect(review).toContainText('Selections that will become invalid');
  const consequence =
    'Magic Missile — SRD · bundled layer in retarget-spell-choice became ' +
    'invalid because the replacement allows only level 0 spells.';
  await expect(review).toContainText(consequence);
  await expect(review.getByRole('link', { name: 'Repair selection' })).toHaveCount(0);

  await expect(review).toContainText(
    'Before: Retarget Spell Species — Homebrew · external layer',
  );
  await expect(review).toContainText(
    'After Apply: Retarget Spell Species Revised — Homebrew · external layer',
  );
  await expect(review.getByRole('radio')).toHaveCount(0);
  await expect(review.getByLabel('Private copy name')).toHaveCount(0);
  await expect(review).not.toContainText(/certif/iu);
  const apply = review.getByRole('button', { name: 'Apply to all listed characters' });
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page.getByRole('heading', { name: 'Character fixes applied' })).toBeVisible();
  await expect(review).toContainText(consequence);
  const repair = review.getByRole('link', { name: 'Repair selection' });
  await expect(repair).toBeVisible();
  await repair.click();

  await expect(page).toHaveURL(/\/characters\/\d+\/build\/levels\/1\?step=spells&repair=slot_selection-\d+$/u);
  const picker = page.locator('[data-repair-target] .spell-picker-input');
  await expect(picker).toBeVisible();
  await expect(picker).toBeFocused();
  await picker.fill('Light');
  await page.getByRole('option', { name: 'Light', exact: true }).click();

  await expect.poll(async () => page.evaluate(async (id) => {
    const slots = await window.staticApp.inspectRows('spell_selection_slots', {
      character_id: id,
      rule_key: 'retarget-spell-choice',
      state: 'active',
    });
    const versions = await window.staticApp.inspectRows('spell_versions');
    const slot = slots[0];
    const selected = versions.find(
      (row) => Number(row['id']) === Number(slot?.['current_spell_version_id']),
    );
    return {
      eligibility: slot?.['selection_eligibility'],
      spell: selected?.['display_name'],
    };
  }, characterId)).toEqual({ eligibility: 'valid', spell: 'Light' });
});

test('a Level Up catalog gap opens and focuses the real Catalog JSON importer', async ({
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5090 at 16.5s. The required x1.5
  // reserve is 24.75s, rounded up to 100ms.
  test.setTimeout(24_800);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());

  await openHomebrew(page);
  await page.getByRole('button', { name: 'New species' }).click();
  await publishSpellSpecies(page, 'Catalog Gap Species', 0, 'Paladin');

  await page.goto('/');
  await ready(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').filter({ hasText: 'Fighter' }).first().click();
  await page.getByLabel('Character name').fill('Catalog Gap Hero');
  await page.getByRole('button', { name: 'Create character' }).click();
  const characterId = await page.evaluate(async () => Number(
    (await window.staticApp.inspectRows('characters')).find(
      (row) => row['name'] === 'Catalog Gap Hero',
    )?.['id'],
  ));
  const seam = await readGuidedSeam(page, characterId);
  await page.locator(`[${seam.abilityMethodAttribute}="manual"]`).check();
  await page.locator(`[${seam.abilitySubmitAttribute}]`).click();
  await page.getByRole('button', { name: 'Choose Catalog Gap Species' }).click();

  await page.goto(`/characters/${String(characterId)}/level-up`);
  const warning = page.locator('[data-level-up-warning="catalog_gap"]');
  await expect(warning).toContainText(
    'No eligible Paladin cantrips in your catalog',
  );
  const importAction = warning.getByRole('link', {
    name: 'Import a catalog with eligible spells',
  });
  await expect(importAction).toHaveAttribute('href', '/?import=catalog');
  await importAction.click();

  await expect(page).toHaveURL(/\/?\?import=catalog$/u);
  await ready(page);
  await expect(page.locator('details.transfer-panel')).toHaveAttribute('open', '');
  await expect(page.getByLabel('Catalog JSON')).toBeFocused();
});

test('a species spell-list picker grant publishes, attaches, and is chosen in Level Up', async ({
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5090 at 16.7s. The required x1.5
  // reserve is 25.05s, rounded up to 100ms.
  test.setTimeout(25_100);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());

  await openHomebrew(page);
  await page.getByRole('button', { name: 'New species' }).click();
  await publishSpellSpecies(page, 'Catalog Picker Species', 1);

  await page.goto('/');
  await ready(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').filter({ hasText: 'Fighter' }).first().click();
  await page.getByLabel('Character name').fill('Catalog Picker Hero');
  await page.getByRole('button', { name: 'Create character' }).click();
  const characterId = await page.evaluate(async () => Number(
    (await window.staticApp.inspectRows('characters')).find(
      (row) => row['name'] === 'Catalog Picker Hero',
    )?.['id'],
  ));
  const seam = await readGuidedSeam(page, characterId);
  await page.locator(`[${seam.abilityMethodAttribute}="manual"]`).check();
  await page.locator(`[${seam.abilitySubmitAttribute}]`).click();
  await page.getByRole('button', { name: 'Choose Catalog Picker Species' }).click();

  await page.goto(`/characters/${String(characterId)}/level-up`);
  await expect(page.getByRole('heading', { name: 'Level up — Catalog Picker Hero' }))
    .toBeFocused();
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Gains' })).toBeFocused();
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Choose spells' })).toBeFocused();
  const picker = page.getByRole('combobox', {
    name: 'New spell choice — Required from Catalog Picker Species',
  });
  await picker.fill('Magic Missile');
  const option = page.getByRole('option', { name: 'Magic Missile', exact: true });
  await expect(option).toHaveAccessibleDescription(/SRD · bundled layer/u);
  await option.click();
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeFocused();
  await page.locator('[data-level-up-confirm]').click();
  await expect(page.getByRole('heading', { name: 'Fighter level 2 complete' })).toBeFocused();

  await expect.poll(async () => page.evaluate(async (id) => {
    const slot = (await window.staticApp.inspectRows('spell_selection_slots', {
      character_id: id,
      rule_key: 'retarget-spell-choice',
    }))[0];
    const spell = (await window.staticApp.inspectRows('spell_versions')).find(
      (row) => Number(row['id']) === Number(slot?.['current_spell_version_id']),
    );
    return spell?.['display_name'];
  }, characterId)).toBe('Magic Missile');
});
