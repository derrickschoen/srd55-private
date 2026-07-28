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
  const fixture = createBuildReportFixture(
    new DatabaseContext(connection),
  );
  const bytes = Array.from(
    sqlite3.capi.sqlite3_js_db_export(connection),
  );
  connection.close();
  return { bytes, fixture };
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
