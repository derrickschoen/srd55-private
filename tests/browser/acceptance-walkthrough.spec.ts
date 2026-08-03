import { expect, test, type Locator, type Page } from '@playwright/test';
import { ACCEPTANCE_WIZARD_2_CHOICES } from './fixtures/level-up-characters';

const CHARACTER_NAME = 'Acceptance Arcanist';

export const LEVEL_UP_WIZARD_ROUTE_SEAM =
  '/characters/:characterId/level-up';

function levelUpFact(page: Page, label: string): Locator {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return page
    .locator('.level-up-panel dt')
    .filter({ hasText: new RegExp(`^${escapedLabel}$`, 'u') })
    .locator('xpath=following-sibling::dd[1]');
}

async function selectLevelUpSpell(
  page: Page,
  accessibleName: string,
  index: number,
  spellName: string,
): Promise<void> {
  const input = page.getByRole('combobox', { name: accessibleName }).nth(index);
  await input.fill(spellName);
  const option = page.getByRole('option').filter({ hasText: spellName });
  await expect(option).toBeVisible();
  await option.click();
  await expect(input).toHaveValue(spellName);
}

async function expectLevelTwoAcceptanceSheet(page: Page): Promise<void> {
  await expect(page.locator('[data-sheet-id="total_level"] .sheet-figure')).toHaveText('2');
  await expect(page.locator('[data-sheet-id="class:Wizard"] .sheet-figure')).toHaveText('2');
  await expect(
    page.locator('[data-sheet-value="hit_points_with_species"]'),
  ).toHaveText('16');
  await expect(page.locator('[data-sheet-value="proficiency_bonus"]')).toHaveText('+2');
  const arcana = page.locator('[data-sheet-id="skill:arcana"]');
  await expect(arcana).toContainText('Arcana (Expertise)');
  await expect(arcana.locator('.sheet-figure')).toHaveText('+5');
  for (const choice of ACCEPTANCE_WIZARD_2_CHOICES.spells) {
    const row = page
      .locator(
        choice.kind === 'spellbook_acquisition'
          ? '[data-sheet-id^="spellbook:"]'
          : '[data-sheet-id^="spell:"]',
      )
      .filter({
        has: page.getByText(choice.spell_name, { exact: true }),
      })
      .first();
    await expect(row).toBeVisible();
    if (choice.kind === 'spellbook_acquisition') {
      await expect(row).toContainText(
        `${choice.spell_name}Level 1Spellbook`,
      );
      await expect(row).not.toContainText('Prepared');
      await expect(row).not.toContainText('Known');
      await expect(
        page.locator('[data-sheet-id^="spell:"]').filter({
          has: page.getByText(choice.spell_name, { exact: true }),
        }),
      ).toHaveCount(0);
    }
  }
}

test('an unassisted sitting creates a caster through the current guided level 1 journey', async ({
  page,
}) => {
  // Measured at 13.5s alone through fifteen level-1 writes and the level-2 pass.
  test.setTimeout(20_000);
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

  // Item 3 is exercised below, after the current level-1 sheet baseline.

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
  for (const id of numericIds) {
    const figure = page.locator(`[data-sheet-value="${id}"]`);
    await expect(figure).toHaveText(/^[+-]?\d+$/);
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

  const beforeLevelUp = await page.evaluate(async (name) => {
    const characters = await window.staticApp.inspectRows('characters');
    const character = characters.find((row) => row['name'] === name);
    if (character === undefined) {
      throw new Error(`Acceptance character ${name} was not found.`);
    }
    const id = Number(character['id']);
    const revision = Number(character['revision']);
    if (!Number.isSafeInteger(id) || !Number.isSafeInteger(revision)) {
      throw new Error('Acceptance character id or revision was invalid.');
    }
    return { id, revision };
  }, CHARACTER_NAME);
  await expect(
    page.locator('[data-sheet-value="hit_points_with_species"]'),
  ).toHaveText('9');

  await page.getByRole('link', { name: 'Level Up' }).click();
  const levelUpUrl = new URL(
    LEVEL_UP_WIZARD_ROUTE_SEAM.replace(
      ':characterId',
      String(beforeLevelUp.id),
    ),
    page.url(),
  ).href;
  await expect(page).toHaveURL(levelUpUrl);
  await expect(
    page.getByRole('radio', { name: /Wizard 1 → 2/ }),
  ).toBeChecked();

  for (const absentStep of ['subclass', 'feat', 'epic_boon', 'skills']) {
    await expect(
      page.locator(`[data-level-up-step="${absentStep}"]`),
    ).toHaveCount(0);
  }
  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Review level gains' }),
  ).toBeFocused();
  await expect(levelUpFact(page, 'Class HP change (minimum 1)')).toHaveText('+6');
  await expect(levelUpFact(page, 'Dwarven Toughness')).toHaveText('1 → 2 (+1)');
  await expect(levelUpFact(page, 'Projected maximum HP')).toHaveText('16');

  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Choose Expertise' }),
  ).toBeFocused();
  const expertiseChoice = ACCEPTANCE_WIZARD_2_CHOICES.expertise[0];
  if (expertiseChoice === undefined) {
    throw new Error('The Wizard-2 acceptance oracle has no Expertise choice.');
  }
  await page
    .getByRole('combobox', {
      name: 'Scholar expertise choice, rule class_expertise_2, ordinal 1',
    })
    .selectOption({ label: 'Arcana' });
  expect(expertiseChoice.skill).toBe('arcana');

  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Choose spells' }),
  ).toBeFocused();
  let spellbookIndex = 0;
  for (const choice of ACCEPTANCE_WIZARD_2_CHOICES.spells) {
    if (choice.kind === 'slot_selection') {
      await selectLevelUpSpell(
        page,
        'New spell choice — Required from Wizard',
        0,
        choice.spell_name,
      );
    } else {
      await selectLevelUpSpell(
        page,
        'Spellbook acquisition — Required from Wizard',
        spellbookIndex,
        choice.spell_name,
      );
      spellbookIndex += 1;
    }
  }

  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeFocused();
  await expect(levelUpFact(page, 'Hit point maximum')).toHaveText('9 → 16');
  await expect(page.getByText('Arcana — Wizard — Scholar', { exact: true })).toBeVisible();
  for (const choice of ACCEPTANCE_WIZARD_2_CHOICES.spells) {
    await expect(
      page.getByText(`${choice.spell_name} — Wizard`, { exact: true }),
    ).toBeVisible();
  }
  await page.locator('[data-level-up-confirm]').click();
  await expect(
    page.getByRole('heading', { name: 'Wizard level 2 complete' }),
  ).toBeFocused();
  const revisionAfter = await page.evaluate(async (id) => {
    const characters = await window.staticApp.inspectRows('characters', { id });
    return Number(characters[0]?.['revision']);
  }, beforeLevelUp.id);
  expect(revisionAfter).toBe(beforeLevelUp.revision + 1);

  await page.getByRole('link', { name: 'Open character sheet' }).click();
  await expect(
    page.getByRole('heading', {
      name: `Character sheet — ${CHARACTER_NAME}`,
    }),
  ).toBeVisible();
  await expectLevelTwoAcceptanceSheet(page);

  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: `Character sheet — ${CHARACTER_NAME}`,
    }),
  ).toBeVisible();
  await expectLevelTwoAcceptanceSheet(page);
});
