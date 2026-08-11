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

async function publishSpecies(
  page: Page,
  name: string,
  walkingSpeedFeet: number,
): Promise<void> {
  await page.goto('/homebrew');
  await expect(page.getByRole('heading', { name: 'Homebrew library' }))
    .toBeVisible();
  await page.getByRole('button', { name: 'New species' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Rules edition').selectOption('expanded');
  await page.getByLabel('Creature type').fill('Humanoid');
  await page.getByLabel('Primary size').fill('Medium');
  await page.getByLabel('Walking speed (feet)').fill(String(walkingSpeedFeet));
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.species-authoring-status')).toContainText(
    'Saved revision 1.',
  );
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await page.getByRole('button', { name: 'Publish species' }).click();
  await expect(page.getByRole('heading', { name: 'Species published' }))
    .toBeVisible();
}

async function createCharacterAtSpeciesStep(
  page: Page,
  name: string,
): Promise<number> {
  await page.goto('/');
  await ready(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').filter({ hasText: 'Fighter' })
    .first()
    .click();
  await page.getByLabel('Character name').fill(name);
  await page.getByRole('button', { name: 'Create character' }).click();
  const characters = await page.evaluate(() =>
    window.staticApp.inspectRows('characters')
  );
  const characterId = Number(characters.find((row) => row['name'] === name)?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const seam = await readGuidedSeam(page, characterId);
  await page.locator(`[${seam.abilityMethodAttribute}="manual"]`).check();
  await page.locator(`[${seam.abilitySubmitAttribute}]`).click();
  await expect(page.locator(
    `[${seam.panelAttribute}="${seam.speciesStepPanel}"]`,
  )).toBeVisible();
  return characterId;
}

function publishedCard(page: Page, name: string) {
  return page.locator('.homebrew-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
}

test('superseded species leave fresh selection while replacement characters still resolve', async ({
  page,
}) => {
  // Measured alone at 23.3s on 2026-08-10. The required x1.5 reserve is
  // 34.95s, rounded up to the next 100ms.
  test.setTimeout(35_000);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());

  await publishSpecies(page, 'Fresh Picker Species', 30);
  const existingCharacterId = await createCharacterAtSpeciesStep(
    page,
    'Existing Revision Hero',
  );
  await page.getByRole('button', { name: 'Choose Fresh Picker Species' })
    .click();

  await page.goto('/homebrew');
  await publishedCard(page, 'Fresh Picker Species')
    .getByRole('button', { name: /Edit .* as a new version/ })
    .click();
  await page.getByLabel('Name').fill('Fresh Picker Species Revised');
  await page.getByLabel('Walking speed (feet)').fill('35');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.species-authoring-status')).toContainText(
    'Saved revision',
  );
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await page.getByRole('button', { name: 'Publish species' }).click();
  await expect(page.getByRole('heading', { name: 'Species published' }))
    .toBeVisible();

  await page.getByRole('link', { name: 'Review character fixes' }).click();
  await expect(page.getByLabel('Fix affected characters')).toContainText(
    'Existing Revision Hero',
  );
  await expect(page.getByRole('radio', {
    name: 'Match — Uses the existing local entry; this attached character moves to it.',
  })).toBeChecked();
  const apply = page.getByRole('button', { name: 'Apply to all listed characters' });
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(page.getByRole('heading', { name: 'Character fixes applied' }))
    .toBeVisible();

  await page.goto(`/characters/${String(existingCharacterId)}/sheet`);
  await expect(page.getByText('Fresh Picker Species Revised', { exact: true }))
    .toBeVisible();

  await createCharacterAtSpeciesStep(page, 'Fresh Choice Hero');
  await expect(page.getByRole('button', {
    name: 'Choose Fresh Picker Species',
    exact: true,
  })).toHaveCount(0);
  await expect(page.getByRole('button', {
    name: 'Choose Fresh Picker Species Revised',
    exact: true,
  })).toBeVisible();
});
