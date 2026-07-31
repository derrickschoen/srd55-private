import { expect, test } from '@playwright/test';

const CHARACTER_NAME = 'Acceptance Arcanist';

export const LEVEL_UP_WIZARD_ROUTE_SEAM =
  '/characters/:characterId/level-up';

test('an unassisted sitting creates a caster through the current guided level 1 journey', async ({
  page,
}) => {
  // Measured at 9.9s through fifteen real picker writes, sheet, and reload.
  test.setTimeout(30_000);
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
    page.getByRole('heading', { name: 'Choose level 1 spells' }),
  ).toBeVisible();
  const cantrips = [
    'Mage Hand',
    'Ray of Frost',
    'Light',
    'True Strike',
    'Dancing Lights',
    'Fire Bolt',
    'Mending',
    'Message',
  ];
  const preparedSpells = [
    'Mage Armor',
    'Magic Missile',
    'Shield',
    'Sleep',
    'Thunderwave',
  ];
  const spellbookSpells = [
    'Detect Magic',
    'Feather Fall',
    'Find Familiar',
    'Grease',
    'Jump',
    'Longstrider',
  ];
  let spellChoicesMade = 0;
  while (
    await page
      .getByRole('heading', { name: 'Choose level 1 spells' })
      .isVisible()
      .catch(() => false)
  ) {
    const pickers = page.getByRole('combobox');
    const choiceCount = await pickers.count();
    const picker = pickers.first();
    const label = await picker.getAttribute('aria-label');
    const search =
      label?.includes('cantrips') === true
        ? cantrips.shift()
        : label?.startsWith('Wizard spellbook') === true
          ? spellbookSpells.shift()
          : preparedSpells.shift();
    if (search === undefined) {
      throw new Error(`No walkthrough spell remains for ${label ?? 'choice'}.`);
    }
    await picker.fill(search);
    const option = page.getByRole('option', {
      name: new RegExp(`^${search}\\b`),
    });
    await expect(option).toBeVisible();
    await option.click();
    await expect(pickers).toHaveCount(choiceCount - 1);
    spellChoicesMade += 1;
    if (spellChoicesMade > 20) {
      throw new Error('Guided spell choices did not converge.');
    }
  }
  expect(spellChoicesMade).toBeGreaterThan(0);

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
  await expect(page.getByText('nothing outstanding')).toBeVisible();

  await page.getByRole('link', { name: 'Open workspace' }).click();
  await page.getByRole('link', { name: 'Character sheet' }).click();
  await expect(
    page.getByRole('heading', {
      name: `Character sheet — ${CHARACTER_NAME}`,
    }),
  ).toBeVisible();

  const numericIds = [
    'armor_class',
    'hit_points',
    'initiative',
    'proficiency_bonus',
  ] as const;
  const sheetNumbers: string[] = [];
  for (const id of numericIds) {
    const figure = page.locator(`[data-sheet-value="${id}"]`);
    await expect(figure).toHaveText(/^[+-]?\d+$/);
    sheetNumbers.push((await figure.textContent()) ?? '');
  }
  await expect(page.locator('[data-screen="character-sheet"]')).not.toContainText(
    /NaN|undefined/,
  );
  await expect(
    page.locator('[data-sheet-id="damage_resistances"]'),
  ).toContainText('Poison');
  await expect(
    page.getByRole('heading', { name: 'Features and traits' }),
  ).toBeVisible();
  await expect(page.getByText(/Sage — Tool Proficiency/)).toBeVisible();
  await expect(
    page.getByText('Languages and tool proficiencies are not modelled'),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: `Character sheet — ${CHARACTER_NAME}`,
    }),
  ).toBeVisible();
  for (const [index, id] of numericIds.entries()) {
    await expect(page.locator(`[data-sheet-value="${id}"]`)).toHaveText(
      sheetNumbers[index] ?? '',
    );
  }
});
