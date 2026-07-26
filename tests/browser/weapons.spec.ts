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
