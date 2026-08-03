import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DatabaseContext } from '../../src/db/database';
import { createBuildReportFixture } from '../integration/reports/build-report-fixture';

const schema = readFileSync(
  new URL('../../src/db/schema.sql', import.meta.url),
  'utf8',
);

async function plannerFixture() {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const fixture = createBuildReportFixture(db);
  db.exec(
    `INSERT INTO character_items (
       character_id, name, quantity, requires_attunement
     ) VALUES (?, 'Healing Potion', 2, 0)`,
    [fixture.characterId],
  );
  const bytes = Array.from(
    sqlite3.capi.sqlite3_js_db_export(connection),
  );
  connection.close();
  return { bytes, fixture };
}

async function contributionPlannerFixture() {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const fixture = createBuildReportFixture(db);
  db.exec(
    'UPDATE characters SET intelligence = 15 WHERE id = ?',
    [fixture.characterId],
  );
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, ability, amount, maximum,
       source_instance_id, label
     ) VALUES (
       ?, 1, 'ability_increase', 'intelligence', 2, 20, ?,
       'Background training'
     )`,
    [fixture.characterId, fixture.featSourceId],
  );
  const bytes = Array.from(
    sqlite3.capi.sqlite3_js_db_export(connection),
  );
  connection.close();
  return { bytes, fixture };
}

async function attunementPlannerFixture() {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const characterId = db.exec(
    "INSERT INTO characters (name) VALUES ('Attunement keyboard test')",
  ).lastInsertId;
  const itemIds = ['Crown', 'Cloak', 'Ring', 'Boots'].map((name) =>
    db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement
       ) VALUES (?, ?, 1)`,
      [characterId, name],
    ).lastInsertId,
  );
  db.exec(
    `INSERT INTO character_attunement_slots (
       character_id, slot_1_item_id, slot_2_item_id, slot_3_item_id
     ) VALUES (?, ?, ?, ?)`,
    [characterId, itemIds[0], itemIds[1], itemIds[2]],
  );
  const bytes = Array.from(
    sqlite3.capi.sqlite3_js_db_export(connection),
  );
  connection.close();
  return { bytes, characterId, itemIds };
}

async function catalogItemPlannerFixture() {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const characterId = db.exec(
    "INSERT INTO characters (name) VALUES ('Catalog item picker')",
  ).lastInsertId;
  db.exec(
    `INSERT INTO item_definitions (
       content_key, name, rules_edition, description, requires_attunement
     ) VALUES (
       'expanded:legacy:browser-belt', 'Browser Giant Belt', 'expanded',
       'Catalog-only definition', 1
     );
     INSERT INTO item_definition_effects (
       item_definition_id, sort_order, effect_kind, ability, maximum,
       label, notes
     ) VALUES (
       1, 1, 'ability_override', 'strength', 23,
       'Browser giant strength', 'Copied effect'
     );`,
  );
  const bytes = Array.from(sqlite3.capi.sqlite3_js_db_export(connection));
  connection.close();
  return { bytes, characterId };
}

async function persistedCharacter(
  page: import('@playwright/test').Page,
) {
  return page.evaluate(() =>
    window.staticApp.inspectRows('characters', { id: 1 }),
  );
}

test('planner editors, history, focus, keyboard, and responsive state persist', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Browser Planner');
  });
  await page.goto('/characters/1');
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole('heading', { name: 'Browser Planner' }),
  ).toBeVisible();

  const wisdom = page.locator('[data-focus-key="ability-wisdom"]');
  await wisdom.fill('17');
  await wisdom.press('Enter');
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({ wisdom: 17, revision: 1 }),
    ]);
  await expect(wisdom).toBeFocused();

  const legacy = page.locator('[data-focus-key="allow-legacy"]');
  await legacy.click();
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        wisdom: 17,
        allow_legacy: 1,
        revision: 2,
      }),
    ]);
  await expect(legacy).toBeFocused();

  await page.getByRole('button', { name: '↶ Undo' }).click();
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        allow_legacy: 0,
        revision: 3,
      }),
    ]);
  await expect(
    page.getByText('Level undetermined · revision 3'),
  ).toBeVisible();

  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Control+Shift+Z');
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        allow_legacy: 1,
        revision: 4,
      }),
    ]);
  await expect(
    page.getByText('Level undetermined · revision 4'),
  ).toBeVisible();

  await page
    .locator('[data-focus-key="save-point-label"]')
    .fill('Before browser experiment');
  await page.getByRole('button', { name: 'Save snapshot' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('character_save_points', {
          character_id: 1,
        }),
      ),
    )
    .toEqual([
      expect.objectContaining({ label: 'Before browser experiment' }),
    ]);

  await page.setViewportSize({ width: 375, height: 760 });
  await expect(page.locator('.planner-layout')).toHaveCSS(
    'grid-template-columns',
    '351px',
  );
  await expect(page.getByText('No slots match these filters')).toBeVisible();

  await page.reload();
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        wisdom: 17,
        allow_legacy: 1,
        revision: 4,
      }),
    ]);
  await expect(
    page.getByText('Before browser experiment'),
  ).toBeVisible();
});

test('B2-EDIT displays base before editing and keeps the resolved total separate', async ({
  page,
}) => {
  const { bytes, fixture } = await contributionPlannerFixture();
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(
    (database) =>
      window.staticApp.replaceDatabase(Uint8Array.from(database)),
    bytes,
  );
  await page.goto(`/characters/${fixture.characterId}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  const intelligence = page.locator(
    '[data-focus-key="ability-intelligence"]',
  );
  const intelligenceField = intelligence.locator('..');

  // LOAD-BEARING PRE-EDIT OBSERVABLE. Base is 15 and its +2 contribution
  // resolves to 17. A mutant feeding totals into the editor shows 17 here;
  // the later write assertions cannot distinguish that mutant on their own.
  await expect(intelligence).toHaveValue('15');
  await expect(intelligenceField.locator('.ability-total')).toHaveText(
    'total 17 (+3)',
  );

  await intelligence.fill('16');
  await intelligence.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(
        (characterId) =>
          window.staticApp.inspectRows('characters', { id: characterId }),
        fixture.characterId,
      ),
    )
    .toEqual([
      expect.objectContaining({
        intelligence: 16,
        revision: 1,
      }),
    ]);
  await expect(intelligence).toHaveValue('16');
  await expect(intelligenceField.locator('.ability-total')).toHaveText(
    'total 18 (+4)',
  );
});

test('the item editor authors an ability override that resolves on the sheet', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Belt Test');
  });
  await page.goto('/characters/1');
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  const items = page.locator('[data-testid="items-panel"]');
  await items.getByRole('button', { name: 'Add item' }).click();
  await items.getByLabel('Name').fill('Belt of Giant Strength');
  await expect(items.getByLabel('Effect kind')).toHaveValue(
    'ability_override',
  );
  await items.getByRole('button', { name: 'Add effect' }).click();
  await items.getByLabel('Ability').selectOption('strength');
  await items.getByLabel('Set score to').fill('24');
  await items.getByLabel('Source label').fill('Belt of Giant Strength');
  await items.getByRole('button', { name: 'Add item' }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('character_effects', {
          character_id: 1,
        }),
      ),
    )
    .toEqual([
      expect.objectContaining({
        effect_kind: 'ability_override',
        ability: 'strength',
        amount: null,
        maximum: 24,
        label: 'Belt of Giant Strength',
        character_item_id: expect.any(Number),
      }),
    ]);

  await page.getByRole('link', { name: 'Character sheet' }).click();
  const strength = page.locator('[data-sheet-id="ability:strength"]');
  await expect(strength).toContainText('strength 24');
  await expect(strength).toContainText(
    'Belt of Giant Strength sets the score to 24 and is the winning override.',
  );
});

test('the item picker copies catalog values and effects without a live definition link', async ({
  page,
}) => {
  // Measured at 12.2s alone on Chromium; database replacement dominates.
  // The two readiness assertions each allow 30s, so the test envelope must
  // remain comfortably above their combined worst-case allowance.
  test.setTimeout(90_000);
  const { bytes, characterId } = await catalogItemPlannerFixture();
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.evaluate(
    (database) => window.staticApp.replaceDatabase(Uint8Array.from(database)),
    bytes,
  );
  await page.goto(`/characters/${String(characterId)}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  const picker = page.locator('[data-testid="item-catalog-picker"]');
  await expect(picker.getByLabel('Item definition')).toHaveValue(
    'expanded:legacy:browser-belt',
  );
  await picker.getByRole('button', { name: 'Add catalog item' }).click();

  await expect.poll(() => page.evaluate(async () => ({
    items: await window.staticApp.inspectRows('character_items'),
    effects: await window.staticApp.inspectRows('character_effects'),
  }))).toEqual({
    items: [expect.objectContaining({
      name: 'Browser Giant Belt',
      description: 'Catalog-only definition',
      quantity: 1,
      requires_attunement: 1,
    })],
    effects: [expect.objectContaining({
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Browser giant strength',
      template_ref: null,
    })],
  });
  expect(
    await page.evaluate(async () =>
      Object.keys((await window.staticApp.inspectRows('character_items'))[0] ?? {}),
    ),
  ).not.toContain('item_definition_id');
});

test('the attunement replacement modal traps, cancels, and restores keyboard focus', async ({
  page,
}) => {
  // Measured at 9.1s alone on Chromium; keep local contention below this test.
  test.setTimeout(20_000);
  const { bytes, characterId, itemIds } = await attunementPlannerFixture();
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(
    (database) =>
      window.staticApp.replaceDatabase(Uint8Array.from(database)),
    bytes,
  );
  await page.goto(`/characters/${characterId}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  const invoker = page.locator(
    `[data-focus-key="item-attunement-${String(itemIds[3])}"]`,
  );
  await expect(invoker).toHaveAccessibleName('Attune Boots');
  await invoker.focus();
  await invoker.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Replace an attuned item',
  });
  await expect(dialog).toBeVisible();
  const firstChoice = dialog.getByRole('button', {
    name: 'Replace Crown with Boots',
  });
  const cancel = dialog.getByRole('button', { name: 'Cancel' });
  await expect(firstChoice).toBeFocused();
  await firstChoice.press('Shift+Tab');
  await expect(cancel).toBeFocused();
  await cancel.press('Tab');
  await expect(firstChoice).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();

  await invoker.press('Enter');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();

  await invoker.press('Enter');
  await dialog
    .getByRole('button', { name: 'Replace Cloak with Boots' })
    .click();
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();
  await expect(invoker).toHaveAccessibleName('Unattune Boots');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('character_attunement_slots'),
      ),
    )
    .toEqual([
      expect.objectContaining({
        slot_1_item_id: itemIds[0],
        slot_2_item_id: itemIds[3],
        slot_3_item_id: itemIds[2],
      }),
    ]);
});

test('planner parity flows persist override, clear, selection, acknowledgement, and source edits', async ({
  page,
}) => {
  const { bytes, fixture } = await plannerFixture();
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(
    (database) =>
      window.staticApp.replaceDatabase(Uint8Array.from(database)),
    bytes,
  );
  await page.goto(`/characters/${fixture.characterId}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  await expect(page.getByText('Pact Magic: 2 × level 3')).toBeVisible();
  const wizard = page
    .getByRole('heading', { name: 'Wizard spellbook access' })
    .locator('..');
  await expect(wizard).toContainText('In my book · 3');
  await expect(wizard).toContainText('Detect Magic');
  await expect(
    page.getByText('Composition and table assumptions'),
  ).toBeVisible();
  await expect(page.getByLabel('Added-d8 cap')).toBeVisible();

  // THE DIE-SIZE CONTROL OFFERS THE VOCABULARY AND NOTHING ELSE.
  //
  // This list is the owner's, transcribed here by hand rather than imported:
  // "We only should have 4,6,8,10,12,20,100." The control is populated from
  // `dieSizes` in `src/domain/enums.ts`, and this is the only place the
  // rendered options can be seen at all — vitest runs the unit suite under
  // `environment: 'node'`, so no unit test can call the renderer. A `<select>`
  // is also why the closed set costs nothing here: the user PICKS, and cannot
  // type a d7 for the calculator to compute a plausible wrong average from.
  const dieSize = page.getByLabel('Die size');
  await expect(dieSize).toHaveValue('8');
  await expect(
    dieSize.locator('option'),
  ).toHaveText(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);
  // The VALUES as well as the labels: `d8` is rendered from the number, so a
  // label check alone could pass while the option carried something else.
  expect(
    await dieSize.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    ),
  ).toEqual(['4', '6', '8', '10', '12', '20', '100']);

  await page.getByLabel('Attack profile').selectOption(
    'manual-chromatic-orb',
  );
  await expect(page.getByLabel('Spell slot level')).toBeVisible();
  await expect(
    page.getByText(/chance the first attack both hits and leaps/),
  ).toBeVisible();

  await page.getByLabel('Acknowledgement for Shield').fill(
    'Intentional browser conflict',
  );
  await page
    .getByRole('button', { name: 'Acknowledge warning' })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('warning_acknowledgements', {
          character_id: 1,
        }),
      ),
    )
    .toEqual([
      expect.objectContaining({
        note: 'Intentional browser conflict',
        invalidated_at: null,
      }),
    ]);
  await expect(page.getByText('Level 8 · revision 1')).toBeVisible();
  await expect(page.locator('#planner-status')).toHaveText('Autosaved');

  const invalidSlotId = fixture.invalidSlotIds[1]!;
  const attention = page.locator(
    `tr[data-slot-id="${invalidSlotId}"] + tr`,
  );
  await attention
    .getByLabel(`Override note for slot ${invalidSlotId}`)
    .fill('Allowed at this table');
  await attention
    .getByRole('button', { name: 'Keep as override' })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.staticApp.inspectRows('spell_selection_slots', {
            id,
          }),
        invalidSlotId,
      ),
    )
    .toEqual([
      expect.objectContaining({
        state: 'kept_override',
        override_note: 'Allowed at this table',
      }),
    ]);
  await expect(page.getByText('Level 8 · revision 2')).toBeVisible();
  await expect(page.locator('#planner-status')).toHaveText('Autosaved');

  page.once('dialog', (dialog) => dialog.accept());
  await page
    .locator(`tr[data-slot-id="${invalidSlotId}"] + tr`)
    .getByRole('button', { name: 'Clear', exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.staticApp.inspectRows('spell_selection_slots', {
            id,
          }),
        invalidSlotId,
      ),
    )
    .toEqual([
      expect.objectContaining({
        current_spell_version_id: null,
        state: 'active',
        selection_eligibility: 'unselected',
        override_note: null,
      }),
    ]);
  await expect(page.getByText('Level 8 · revision 3')).toBeVisible();
  await expect(page.locator('#planner-status')).toHaveText('Autosaved');

  const picker = page.getByLabel(
    `Spell selection for slot ${invalidSlotId}`,
  );
  const fixtureMageHandId = await page.evaluate(async () => {
    const row = (await window.staticApp.inspectRows('spell_versions')).find(
      (spell) =>
        spell.display_name === 'Mage Hand' &&
        spell.school === 'Abjuration',
    );
    return Number(row?.id);
  });
  await picker.fill('Mage Hand');
  const fixtureMageHandOption = page.getByRole('option', {
    name: /Mage Hand L0 · Abjuration/,
  });
  await expect(fixtureMageHandOption).toBeVisible();
  await fixtureMageHandOption.click();
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window.staticApp.inspectRows('spell_selection_slots', {
            id,
          }),
        invalidSlotId,
      ),
    )
    .toEqual([
      expect.objectContaining({
        current_spell_version_id: fixtureMageHandId,
        state: 'active',
        selection_eligibility: 'valid',
      }),
    ]);
  await expect(page.getByText('Level 8 · revision 4')).toBeVisible();
  await expect(page.locator('#planner-status')).toHaveText('Autosaved');

  const itemQuantity = page.getByLabel('Quantity for Healing Potion');
  await expect(itemQuantity).toHaveValue('2');
  await itemQuantity.fill('5');
  await itemQuantity.press('Tab');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('character_items', {
          character_id: 1,
        }),
      ),
    )
    .toEqual([
      expect.objectContaining({
        name: 'Healing Potion',
        quantity: 5,
      }),
    ]);
  await expect(page.getByText('Level 8 · revision 5')).toBeVisible();

  await page.getByLabel('Source to add').selectOption({
    label: 'Magic Initiate',
  });
  await page
    .getByRole('button', { name: 'Add Magic Initiate' })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('character_source_instances', {
          character_id: 1,
          source_type: 'feat',
        }),
      ),
    )
    .toHaveLength(2);

  await page.reload();
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await expect(
    page.getByText('Acknowledged: Intentional browser conflict'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (id) =>
        window.staticApp.inspectRows('spell_selection_slots', { id }),
      invalidSlotId,
    ),
  ).toEqual([
    expect.objectContaining({
      current_spell_version_id: fixture.spellIds.mageHand,
      selection_eligibility: 'valid',
    }),
  ]);
});

test('surfaces unfinished choices separately from warnings on both screens', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Outstanding Hero');
  });
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );

  const card = page.locator('.character-card').first();
  await expect(card.locator('.status-outstanding')).toHaveText(
    '1 unfinished choice',
  );
  await expect(card.locator('.status-warning, .status-ok')).toHaveText(
    '✓ 0 warnings',
  );

  await page.goto('/characters/1');
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  const panel = page.locator('.outstanding-panel');
  await expect(panel.locator('h2').first()).toHaveText(
    'Not chosen yet — 1 item',
  );
  await expect(panel.locator('ol > li > h3')).toHaveText([
    'No class added yet',
  ]);
  await expect(panel.locator('ol > li > p')).toHaveText([
    'This character has no class levels, so no class spellcasting is set up.',
    'Use Add source in the planner to add a class and its level.',
  ]);
  expect(await panel.locator('[role="alert"]').count()).toBe(0);
  expect(await panel.innerText()).not.toContain('⚠');
});
