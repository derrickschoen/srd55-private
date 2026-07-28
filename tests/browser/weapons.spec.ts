import { expect, test, type Page } from '@playwright/test';

/**
 * The weapons panel, driven the way a browser AI extension would drive it:
 * entirely through roles and accessible names, never through CSS internals or
 * synthetic events. If a step here needs a selector that is not a role plus a
 * name, that is the control failing its own requirement.
 */

async function openPlanner(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.evaluate(async (characterName) => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter(characterName);
  }, name);
  await page.goto('/characters/1');
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

function weaponRows(page: Page) {
  return page.evaluate(() =>
    window.staticApp.inspectRows('character_weapons', { character_id: 1 }),
  );
}

async function addFighterLevel(page: Page): Promise<void> {
  await page
    .getByRole('combobox', { name: 'Class to add' })
    .selectOption({ label: 'Fighter' });
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  await expect(page.getByTestId('weapon-mastery-status')).toContainText(
    'Fighter',
    { timeout: 15_000 },
  );
}

function templateRows(page: Page) {
  return page.evaluate(() => window.staticApp.inspectRows('weapon_templates'));
}

test('a weapon is added from a reference template, then edited without touching the template', async ({
  page,
}) => {
  await openPlanner(page, 'Weapon Bearer');

  const panel = page.getByTestId('weapons-panel');
  await expect(panel).toBeVisible();
  // The portability notice is GONE, and this asserts its absence rather than
  // merely dropping the old assertion: weapons now travel in backups, share
  // links and save points, so a warning that they do not would be a false
  // statement rendered to the user.
  await expect(page.getByTestId('weapon-portability-notice')).toHaveCount(0);
  await expect(panel).not.toContainText('not yet included in exported backups');
  await expect(panel).toContainText('No weapons recorded');

  const longswordBefore = (await templateRows(page)).find(
    (row) => row.name === 'Longsword',
  );
  expect(longswordBefore).toMatchObject({
    damage_dice: '1d8',
    versatile_damage_dice: '1d10',
    mastery_property: 'Sap',
  });

  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  await expect(form).toBeVisible();

  // Chosen by OPTION TEXT — no id, no index. The picker exposes all 38 options
  // to the accessibility tree at once, which is why it is a <select>.
  await form
    .getByLabel('Start from a reference weapon')
    .selectOption({ label: 'Longsword' });

  // Pre-fill: every field below now carries the template's value...
  await expect(form.getByLabel('Name', { exact: true })).toHaveValue(
    'Longsword',
  );
  await expect(form.getByLabel('Damage dice', { exact: true })).toHaveValue(
    '1d8',
  );
  await expect(form.getByLabel('Damage type', { exact: true })).toHaveValue(
    'Slashing',
  );
  await expect(form.getByLabel('Versatile damage dice')).toHaveValue('1d10');
  await expect(form.getByLabel('Mastery property')).toHaveValue('Sap');

  // ...and every one is still editable. Changing two of them before saving is
  // the whole point of storing values instead of a template reference.
  await form.getByLabel('Name', { exact: true }).fill('Family longsword');
  await form.getByLabel('Damage dice', { exact: true }).fill('1d10');
  await form.getByLabel('Reach').check();
  await form.getByLabel('Notes').fill('Reforged after the siege.');
  await form.getByRole('button', { name: 'Add weapon' }).click();

  await expect.poll(() => weaponRows(page)).toEqual([
    expect.objectContaining({
      name: 'Family longsword',
      damage_dice: '1d10',
      damage_type: 'Slashing',
      versatile_damage_dice: '1d10',
      reach: 1,
      mastery_property: 'Sap',
      mastery_selected: 0,
      notes: 'Reforged after the siege.',
    }),
  ]);

  // THE CATALOG IS UNTOUCHED. Editing a weapon cannot reach the template,
  // because the weapon holds no reference to one.
  const longswordAfter = (await templateRows(page)).find(
    (row) => row.name === 'Longsword',
  );
  expect(longswordAfter).toEqual(longswordBefore);
  expect(await templateRows(page)).toHaveLength(38);

  // The row is readable, and the row actions name the weapon.
  await expect(page.getByTestId('weapon-table')).toContainText(
    '1d10 Slashing (Versatile 1d10)',
  );
  await expect(
    page.getByRole('button', { name: 'Edit Family longsword' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Remove Family longsword' }),
  ).toBeVisible();

  // Editing again through the row action persists, and leaves the rest alone.
  await page.getByRole('button', { name: 'Edit Family longsword' }).click();
  await page
    .getByTestId('weapon-form')
    .getByLabel('Damage type', { exact: true })
    .fill('Radiant');
  await page.getByRole('button', { name: 'Save weapon' }).click();
  await expect
    .poll(() => weaponRows(page))
    .toEqual([
      expect.objectContaining({
        name: 'Family longsword',
        damage_type: 'Radiant',
        notes: 'Reforged after the siege.',
      }),
    ]);
});

test('a custom weapon needs no template, and mastery selection is keyboard-reachable', async ({
  page,
}) => {
  await openPlanner(page, 'Weapon Bearer');

  // Give the character a Fighter level so the mastery column exists at all.
  await addFighterLevel(page);
  await expect(page.getByTestId('weapon-mastery-status')).toContainText(
    'Weapon Mastery: 0 of 3 chosen (Fighter, level 1)',
  );

  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  // The picker is left on "Custom weapon" — nothing is chosen from the catalog.
  await expect(form.getByLabel('Start from a reference weapon')).toHaveValue('');
  await form.getByLabel('Name', { exact: true }).fill('Grandfather’s sword');
  await form.getByLabel('Mastery property').selectOption('Topple');
  await form.getByRole('button', { name: 'Add weapon' }).click();

  await expect.poll(() => weaponRows(page)).toEqual([
    expect.objectContaining({
      name: 'Grandfather’s sword',
      // Half-entered is a real state: no damage was typed and none was invented.
      damage_dice: null,
      damage_type: null,
      mastery_property: 'Topple',
      mastery_selected: 0,
    }),
  ]);

  const mastery = page.getByRole('checkbox', {
    name: 'Select Topple mastery for Grandfather’s sword',
  });
  // Reached by keyboard, not by click: focus it and toggle with the keyboard.
  await mastery.focus();
  await expect(mastery).toBeFocused();
  await page.keyboard.press('Space');
  await expect
    .poll(() => weaponRows(page))
    .toEqual([expect.objectContaining({ mastery_selected: 1 })]);
  await expect(page.getByTestId('weapon-mastery-status')).toContainText(
    '1 of 3 chosen',
  );

  // Ctrl+Z is the planner's undo, and it covers weapons like anything else.
  await page.locator('body').click();
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => weaponRows(page))
    .toEqual([expect.objectContaining({ mastery_selected: 0 })]);
});

test('over-selecting mastery warns and never blocks', async ({ page }) => {
  await openPlanner(page, 'Weapon Bearer');
  await addFighterLevel(page);

  // Fighter 1 allows three, so add four and select all four.
  for (const name of ['Longsword', 'Greatsword', 'Mace', 'Rapier']) {
    await page.getByRole('button', { name: 'Add weapon' }).click();
    const form = page.getByTestId('weapon-form');
    await form
      .getByLabel('Start from a reference weapon')
      .selectOption({ label: name });
    await form.getByRole('button', { name: 'Add weapon' }).click();
    await expect(page.getByTestId('weapon-form')).toHaveCount(0);
  }
  await expect.poll(async () => (await weaponRows(page)).length).toBe(4);

  await expect(page.getByTestId('weapon-mastery-warning')).toHaveCount(0);
  for (const name of ['Longsword', 'Greatsword', 'Mace', 'Rapier']) {
    await page
      .getByRole('checkbox', { name: new RegExp(`mastery for ${name}$`) })
      .check();
  }

  // All four selections took — nothing was refused...
  await expect
    .poll(async () =>
      (await weaponRows(page)).filter((row) => row.mastery_selected === 1)
        .length,
    )
    .toBe(4);
  // ...and the application says so instead of pretending it is fine.
  await expect(page.getByTestId('weapon-mastery-warning')).toContainText(
    'More weapons have mastery selected than this character’s allowance',
  );
  await expect(page.getByTestId('weapon-mastery-status')).toContainText(
    '4 of 3 chosen',
  );
});

test('a weapon can be removed, and the panel says nothing about the licensor', async ({
  page,
}) => {
  await openPlanner(page, 'Weapon Bearer');
  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  // Checked while the picker is OPEN, so its four group headings are in the
  // accessibility tree: they are the strings most at risk of carrying a
  // wordmark, and attribution.spec.ts only ever sees the page with it closed.
  const picker = form.getByLabel('Start from a reference weapon');
  const groupLabels = await picker.evaluate((select) =>
    Array.from(
      (select as HTMLSelectElement).querySelectorAll('optgroup'),
      (group) => group.label,
    ),
  );
  expect(groupLabels).toEqual([
    'Simple Melee',
    'Simple Ranged',
    'Martial Melee',
    'Martial Ranged',
  ]);
  for (const label of groupLabels) {
    expect(label).not.toMatch(/D&D|Dungeons|Wizards/);
  }
  // All 38 reference weapons plus the "Custom weapon" first option.
  await expect(picker.locator('option')).toHaveCount(39);
  const openBody = await page.locator('body').innerText();
  expect(openBody).not.toMatch(/D&D|Dungeons|Wizards/);

  await form
    .getByLabel('Start from a reference weapon')
    .selectOption({ label: 'Blowgun' });
  await form.getByRole('button', { name: 'Add weapon' }).click();
  await expect.poll(async () => (await weaponRows(page)).length).toBe(1);

  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/D&D|Dungeons|Wizards/);

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Remove Blowgun' }).click();
  await expect.poll(() => weaponRows(page)).toEqual([]);
});

/**
 * THE ATTACK PROFILES, DRIVEN BY ROLE AND ACCESSIBLE NAME.
 *
 * The vitest suite runs in the `node` environment, so this is the only place
 * the rendered controls exist at all: the accessible names, the live
 * recomputation when a choice changes, and D15's display rule on a real screen.
 *
 * Ability scores are not editable from this screen, so every score here is the
 * schema default of 10 — modifier 0. That makes the proficiency bonus the whole
 * of the to-hit number, which is exactly what a level change should move.
 */
test('the attack profiles derive from the weapon, the class and nothing stored', async ({
  page,
}) => {
  await openPlanner(page, 'Weapon Bearer');
  await addFighterLevel(page);

  const profiles = page.getByTestId('attack-profiles');
  await expect(profiles).toBeVisible();
  // No weapons and neither cantrip: the panel says so rather than showing a
  // blank area that could be mistaken for a bug.
  await expect(profiles).toContainText('No attack profiles');

  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  await form
    .getByLabel('Start from a reference weapon')
    .selectOption({ label: 'Longsword' });
  await form.getByRole('button', { name: 'Add weapon' }).click();
  await expect.poll(async () => (await weaponRows(page)).length).toBe(1);

  // Fighter 1: proficiency bonus +2, every ability score 10 so every modifier
  // is 0. To hit is therefore +2 and the damage line carries no modifier.
  const numbers = page.getByTestId('attack-profile-numbers').first();
  await expect(numbers).toHaveText(
    'To hit: +2 (Strength) · Damage: 1d8 Slashing',
  );
  await expect(profiles).toContainText('The Attack action gives one attack.');

  // The ability control is a real <select> named for its profile and weapon.
  const ability = page.getByRole('combobox', {
    name: 'Ability for Attack with Longsword',
  });
  await ability.selectOption('dexterity');
  await expect(numbers).toHaveText(
    'To hit: +2 (Dexterity) · Damage: 1d8 Slashing',
  );

  // The two facts the application cannot check are ON THE PAGE, not hidden.
  await expect(profiles).toContainText(
    'does not record whether a weapon is melee or ranged',
  );
  // THE PROFICIENCY DECISION IS ON THE PAGE, and it is a decision now rather
  // than a deferral. A Fighter IS proficient with a Longsword, so the +2 above
  // INCLUDES the proficiency bonus and the page says which of the two answers
  // it gave.
  await expect(profiles).toContainText('The Proficiency Bonus is included');
  // NEITHER retired sentence may come back. The first sent a reader looking for
  // a column that exists; the second admitted a contradiction with the
  // character sheet that no longer exists either.
  await expect(profiles).not.toContainText(
    'does not record which weapons a character is proficient with',
  );
  await expect(profiles).not.toContainText('this number does not yet read it');

  // D15's display rule, on a real screen: Fighter 5 grants Extra Attack, and
  // the profile's own count moves with it.
  await page.getByRole('spinbutton', { name: 'Fighter level' }).fill('5');
  await page.getByRole('spinbutton', { name: 'Fighter level' }).blur();
  await expect(profiles).toContainText('The Attack action gives 2 attacks.', {
    timeout: 15_000,
  });
  // Level 5 also moves the proficiency bonus to +3.
  await expect(page.getByTestId('attack-profile-numbers').first()).toHaveText(
    'To hit: +3 (Strength) · Damage: 1d8 Slashing',
  );

  // Nothing was written to produce any of it.
  const rows = await weaponRows(page);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ name: 'Longsword', damage_dice: '1d8' });

  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/D&D|Dungeons|Wizards/);
});

/**
 * THE ONE NUMBER D28 §1 IS ABOUT, ON A REAL SCREEN, ON BOTH SCREENS.
 *
 * A Wizard holding a Greatsword. Every ability score is the schema default of
 * 10 — modifier 0 — so the proficiency bonus is the WHOLE of the to-hit number
 * and the two possible answers are +2 and +0. Nothing subtler could tell them
 * apart.
 *
 * IT EXISTS BECAUSE A REVIEW COULD INVERT THE SHEET'S WHOLE PROFICIENCIES
 * SECTION — including labelling a NOT-proficient weapon "Proficient" — with
 * every browser test still green. There was no browser coverage of that section
 * at all, and the planner beside it was printing the bonus anyway.
 */
test('a Wizard’s Greatsword loses the proficiency bonus, and both screens say so', async ({
  page,
}) => {
  await openPlanner(page, 'Unqualified Wielder');
  await page
    .getByRole('combobox', { name: 'Class to add' })
    .selectOption({ label: 'Wizard' });
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  await expect(page.getByTestId('weapons-panel')).toBeVisible();

  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  await form
    .getByLabel('Start from a reference weapon')
    .selectOption({ label: 'Greatsword' });
  await form.getByRole('button', { name: 'Add weapon' }).click();
  await expect.poll(async () => (await weaponRows(page)).length).toBe(1);

  const profiles = page.getByTestId('attack-profiles');
  // +0, NOT +2. A Wizard's Core Traits row grants Simple weapons only, and a
  // Greatsword is Martial — which the picker recorded on the weapon itself.
  await expect(page.getByTestId('attack-profile-numbers').first()).toHaveText(
    'To hit: +0 (Strength) · Damage: 2d6 Slashing',
  );
  await expect(profiles).toContainText('The Proficiency Bonus is NOT included');
  await expect(profiles).toContainText(
    'no class this character has grants this weapon’s category',
  );

  // AND THE SHEET AGREES, in the section that says so in words. Two screens,
  // one weapon, one answer.
  await page.goto('/characters/1/sheet');
  await expect(page.locator('[data-screen="character-sheet"]')).toBeVisible();
  await expect(
    page.locator('[data-sheet-value="weapon_verdict:Greatsword"]'),
  ).toHaveText('Not proficient');
  await expect(page.locator('[data-screen="character-sheet"]')).toContainText(
    'they do not add their proficiency bonus to the attack',
  );
});

/**
 * THE DAMAGE-TYPE CHOICE, ON A REAL `<select>`.
 *
 * This is the only place the second control exists at all — the vitest suite
 * runs in the `node` environment, so nothing there can observe what a browser
 * shows for an untouched `<select>`, which is its FIRST option. That is exactly
 * how the two sides drifted: the number line resolved the choice to the
 * weapon's own type while the control beside it displayed the spell's, and no
 * test in either suite could see the two disagree.
 *
 * The cantrip has to be REAL for the profile to exist. True Strike now ships in
 * the read-only SRD layer, and selecting that bundled row into the character's
 * own Wizard cantrip slot is the route by which `recogniseAttackCantrips` sees
 * it.
 */
test('the damage-type choice is undecided on both sides until it is made', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  const trueStrikeId = await page.evaluate(async () => {
    const row = (await window.staticApp.inspectRows('spell_versions')).find(
      (spell) =>
        spell.content_key === '2024:true-strike' &&
        spell.provenance === 'srd',
    );
    return Number(row?.id);
  });
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Cantrip Bearer');
  });
  await page.goto('/characters/1');
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  await page
    .getByRole('combobox', { name: 'Class to add' })
    .selectOption({ label: 'Wizard' });
  await page.getByRole('button', { name: 'Add class', exact: true }).click();

  // Slot 1 is the class's first cantrip slot. Selecting the spell there is what
  // gives the character a spell access route, which is the only input the
  // cantrip recogniser reads.
  const picker = page.getByLabel('Spell selection for slot 1');
  await expect(picker).toBeVisible({ timeout: 15_000 });
  await picker.fill('True Strike');
  await page.getByRole('option', { name: /True Strike/ }).first().click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.staticApp.inspectRows('spell_selection_slots', { id: 1 }),
        ),
      { timeout: 15_000 },
    )
    .toEqual([
      expect.objectContaining({
        current_spell_version_id: trueStrikeId,
      }),
    ]);

  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  await form
    .getByLabel('Start from a reference weapon')
    .selectOption({ label: 'Longsword' });
  await form.getByRole('button', { name: 'Add weapon' }).click();
  await expect.poll(async () => (await weaponRows(page)).length).toBe(1);

  const trueStrikeBlock = page
    .locator('[data-testid="attack-profile"][data-kind="true_strike"]')
    .first();
  await expect(trueStrikeBlock).toBeVisible({ timeout: 15_000 });

  const control = page.getByRole('combobox', {
    name: 'Damage type for True Strike with Longsword',
  });
  const numbers = trueStrikeBlock.getByTestId('attack-profile-numbers');

  // WHAT THE BROWSER SHOWS BEFORE ANYTHING IS TOUCHED. The control's value is
  // its first option, and that option and the number line say the same thing:
  // neither side has been picked. Every ability score is the schema default of
  // 10, and below level 5 there is no extra Radiant clause to muddy which type
  // is on the line.
  //
  // TO HIT IS +0 AND NOT +2, AND THE REASON IS SOURCED RATHER THAN OBSERVED.
  // Wizard 1 does carry a +2 proficiency bonus, but a Wizard's Core Traits row
  // grants SIMPLE weapons and a Longsword is Martial — so D28 §1 withholds the
  // bonus, here as on the plain attack, and True Strike is a weapon attack like
  // any other. This line read +2 until the profiles started reading the
  // verdict, which is the defect and not the baseline.
  await expect(control).toHaveValue('');
  await expect(numbers).toHaveText(
    'To hit: +0 (Intelligence) · Damage: 1d8 Radiant or Slashing',
  );

  // Each side, picked in turn, recomputes the line and NOTHING ELSE claims the
  // other type.
  await control.selectOption('Radiant');
  await expect(numbers).toHaveText(
    'To hit: +0 (Intelligence) · Damage: 1d8 Radiant',
  );
  await expect(numbers).not.toContainText('Slashing');

  await control.selectOption('Slashing');
  await expect(numbers).toHaveText(
    'To hit: +0 (Intelligence) · Damage: 1d8 Slashing',
  );
  await expect(numbers).not.toContainText('Radiant');

  // And the undecided state is REACHABLE AGAIN, which is why it is a real entry
  // in the control rather than the absence of one.
  await control.selectOption('');
  await expect(numbers).toHaveText(
    'To hit: +0 (Intelligence) · Damage: 1d8 Radiant or Slashing',
  );

  // The Versatile note the plain attack carries is on the True Strike row too:
  // the cantrip rolls the weapon's own dice.
  await expect(trueStrikeBlock).toContainText(
    'Versatile: 1d10 when wielded with two hands.',
  );

  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/D&D|Dungeons|Wizards/);
});

/**
 * THE IGNORANCE, ON A REAL SCREEN.
 *
 * D19's weapon-scoped grant is the one number this application refuses to give:
 * a Warlock 5 may have taken Thirsting Blade and may be holding their pact
 * weapon, and this schema records neither. The derivation therefore answers ONE
 * attack and states what it could not count — and both halves of that statement
 * are rendered here and nowhere else, because the vitest suite runs in the
 * `node` environment and has no DOM at all.
 *
 * Two places say it, and they say different things: the panel-level warning
 * names the feature and prints every reason; the per-profile list says WHICH
 * WEAPON ROW the missing attack would have belonged to.
 */
test('a grant it cannot apply is stated on the page, not folded into the number', async ({
  page,
}) => {
  await openPlanner(page, 'Blade Pact');

  await page
    .getByRole('combobox', { name: 'Class to add' })
    .selectOption({ label: 'Warlock' });
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  // Waited on the class's own level control rather than on the mastery status:
  // no Warlock row grants Weapon Mastery, so that panel correctly keeps saying
  // none of this character's classes do.
  await expect(
    page.getByRole('spinbutton', { name: 'Warlock level' }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole('spinbutton', { name: 'Warlock level' }).fill('5');
  await page.getByRole('spinbutton', { name: 'Warlock level' }).blur();

  await page.getByRole('button', { name: 'Add weapon' }).click();
  const form = page.getByTestId('weapon-form');
  await form
    .getByLabel('Start from a reference weapon')
    .selectOption({ label: 'Heavy Crossbow' });
  await form.getByRole('button', { name: 'Add weapon' }).click();
  await expect.poll(async () => (await weaponRows(page)).length).toBe(1);

  const profiles = page.getByTestId('attack-profiles');
  // ONE attack for the crossbow. A character-wide 2 is the new wrong answer the
  // scoped model exists to avoid, and this is the row it would have been wrong
  // on.
  await expect(profiles).toContainText('The Attack action gives one attack.', {
    timeout: 15_000,
  });
  await expect(profiles).toContainText(
    'features this application cannot apply are listed below',
  );

  // The panel-level statement: named, and with both reasons.
  const warning = page
    .getByTestId('attack-profile-warning')
    .filter({ hasText: 'Thirsting Blade' });
  await expect(warning).toHaveAttribute('data-code', 'unresolved_extra_attack');
  await expect(warning).toContainText('would give 2 attacks');
  await expect(warning).toContainText(
    'does not record which optional class features',
  );
  await expect(warning).toContainText('one bonded weapon only');
  await expect(warning).toContainText('never the sum');

  // The per-profile statement, on the weapon row itself.
  const weapon = page.getByTestId('attack-weapon').first();
  await expect(weapon).toContainText('One attack.');
  await expect(weapon).toContainText('Thirsting Blade would give 2 attacks.');

  // Nothing was written to produce any of it, and the licensor is unnamed.
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('named_features')),
  ).toHaveLength(2);
  const body = await page.locator('body').innerText();
  expect(body).not.toMatch(/D&D|Dungeons|Wizards/);
});
