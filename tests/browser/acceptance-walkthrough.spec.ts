import { expect, test } from '@playwright/test';

const CHARACTER_NAME = 'Acceptance Arcanist';

export const LEVEL_UP_WIZARD_ROUTE_SEAM =
  '/characters/:characterId/level-up';

test('an unassisted sitting creates a caster through the current guided level 1 journey', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole('heading', { name: 'No characters yet' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Create a character' }).click();
  await expect(
    page.getByRole('heading', { name: 'Choose a class' }),
  ).toBeVisible();
  await expect(page.getByLabel('Character name')).toHaveCount(0);

  await page.getByRole('button', { name: /^Wizard\b/ }).click();
  await expect(page.getByText('Chosen class: Wizard')).toBeVisible();
  await page.getByLabel('Character name').fill(CHARACTER_NAME);
  await page.getByRole('button', { name: 'Create character' }).click();

  await expect(
    page.getByRole('heading', { name: 'Set ability scores' }),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: 'Standard array' }),
  ).toBeChecked();
  const standardArray = [
    ['Strength', '15'],
    ['Dexterity', '14'],
    ['Constitution', '13'],
    ['Intelligence', '12'],
    ['Wisdom', '10'],
    ['Charisma', '8'],
  ] as const;
  for (const [ability, score] of standardArray) {
    await expect(page.getByLabel(ability, { exact: true })).toHaveValue(score);
  }
  await page.getByRole('button', { name: 'Set ability scores' }).click();

  await expect(
    page.getByRole('heading', { name: 'Choose a species' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Choose Dwarf' }).click();

  await expect(
    page.getByRole('heading', { name: 'Choose a background' }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Sage' }).check();
  await expect(page.getByLabel('Ability receiving +2')).toHaveValue(
    'constitution',
  );
  await expect(page.getByLabel('Ability receiving +1')).toHaveValue(
    'intelligence',
  );
  await expect(page.getByLabel('Origin feat')).toHaveValue(
    '2024:feat:magic-initiate',
  );
  await expect(page.getByLabel('Magic Initiate spell list')).toHaveValue(
    'Wizard',
  );
  await page.getByRole('button', { name: 'Apply background' }).click();

  await expect(
    page.getByRole('heading', { name: 'Choose skills' }),
  ).toBeVisible();
  await expect(page.getByText('Arcana — Sage')).toBeVisible();
  await expect(page.getByText('History — Sage')).toBeVisible();

  await page
    .getByLabel('Wizard skill 1')
    .selectOption({ label: 'Investigation' });
  await page
    .getByRole('button', { name: 'Choose Wizard skill 1' })
    .click();
  await expect(page.getByLabel('Wizard skill 1')).toHaveCount(0);

  await page.getByLabel('Wizard skill 2').selectOption({ label: 'Medicine' });
  await page
    .getByRole('button', { name: 'Choose Wizard skill 2' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Confirm starting equipment' }),
  ).toBeVisible();
  const takePackage = page.getByRole('button', {
    name: 'Take this package',
  });
  await expect(takePackage).toHaveCount(2);
  await takePackage.first().click();
  await expect(takePackage).toHaveCount(1);
  await takePackage.click();

  await expect(
    page.getByText(
      'Both equipment packages are recorded. Every level 1 step is complete.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      'characters live only in this browser — download a backup',
    ),
  ).toBeVisible();

  // Item 3 seam: when the Level Up button and wizard exist, this same sitting
  // will continue through LEVEL_UP_WIZARD_ROUTE_SEAM. Until then this test
  // makes no assertion about level-up.

  await page.getByRole('link', { name: 'Back to characters' }).click();
  await expect(
    page.getByRole('heading', { name: CHARACTER_NAME }),
  ).toBeVisible();
  await expect(page.getByText('Level 1', { exact: true })).toBeVisible();

  // FINDING — D87 dead-end. No spell-choice screen appeared before the guide
  // declared level 1 complete. The front door now says four choices remain,
  // with no guided continuation. Stop here rather than escaping into the
  // advanced planner or navigating directly to a hidden route.
  await expect(page.getByText('4 unfinished choices')).toBeVisible();
});
