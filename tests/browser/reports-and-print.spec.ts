import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DatabaseContext } from '../../src/db/database';
import { createBuildReportFixture } from '../integration/reports/build-report-fixture';
import { createPrintableListFixture } from '../integration/reports/printable-list-fixture';

const schema = readFileSync(
  new URL('../../src/db/schema.sql', import.meta.url),
  'utf8',
);

interface FixtureImage {
  readonly bytes: number[];
  readonly characterId: number;
  readonly ids: Readonly<Record<string, number>>;
}

async function fixtureImage(
  kind: 'report' | 'print',
): Promise<FixtureImage> {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const reportFixture =
    kind === 'report' ? createBuildReportFixture(db) : null;
  const printFixture =
    kind === 'print' ? createPrintableListFixture(db) : null;
  const bytes = Array.from(
    sqlite3.capi.sqlite3_js_db_export(connection),
  );
  const ids =
    reportFixture !== null
      ? {
          invalid: reportFixture.invalidSlotIds[1]!,
          orphaned: reportFixture.invalidSlotIds[0]!,
          override: reportFixture.invalidSlotIds[2]!,
        }
      : {
          command: printFixture!.spellIds.command,
          goodberry: printFixture!.spellIds.goodberry,
          mistyStep: printFixture!.spellIds.mistyStep,
        };
  const characterId =
    reportFixture?.characterId ?? printFixture!.characterId;
  connection.close();
  return { bytes, characterId, ids };
}

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

async function installFixture(
  page: Page,
  fixture: FixtureImage,
): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(
    (bytes) => window.staticApp.replaceDatabase(Uint8Array.from(bytes)),
    fixture.bytes,
  );
}

async function databaseState(page: Page): Promise<{
  readonly bytes: number[];
  readonly characters: unknown[];
  readonly slots: unknown[];
}> {
  return page.evaluate(async () => ({
    bytes: Array.from(await window.staticApp.exportDatabase()),
    characters: await window.staticApp.inspectRows('characters'),
    slots: await window.staticApp.inspectRows('spell_selection_slots'),
  }));
}

test('build report route presents source, route, duplicate, and invalid annotations without persisted writes', async ({
  page,
}) => {
  // Measured alone at 34.9–35.8s after D91-R added the sheet projection.
  test.setTimeout(60_000);
  const fixture = await fixtureImage('report');
  await installFixture(page, fixture);
  const before = await databaseState(page);

  await page.goto(`/characters/${fixture.characterId}/report`);
  await expect(
    page.locator('[data-screen="build-report"]'),
  ).toBeVisible();
  await expect(page).toHaveTitle('R40 Golden build report');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'R40 Golden',
  );
  await expect(
    page.getByTestId('preparation-callout'),
  ).toContainText(
    'shared Spellcasting slots through 2nd level and Pact Magic slots at 3rd level',
  );

  const mageHandRoutes = page
    .locator('.route-table tbody tr')
    .filter({ hasText: 'Mage Hand' });
  await expect(mageHandRoutes).toHaveCount(2);
  await expect(mageHandRoutes.nth(0)).toContainText(
    'Magic Initiate: Wizard',
  );
  await expect(mageHandRoutes.nth(0)).toContainText(
    'Slot feat-cantrip:1',
  );
  await expect(mageHandRoutes.nth(1)).toContainText('Wizard 1');
  await expect(
    page.locator('.route-table tbody tr').filter({ hasText: 'Detect Magic' }),
  ).toContainText('Capability route');

  const conflicting = page.locator(
    '.duplicate-card[data-category="conflicting_version"]',
  );
  await expect(conflicting).toHaveAttribute('role', 'alert');
  await expect(conflicting).toContainText('Shield (2014)');
  await expect(conflicting).toContainText('Shield (2024)');
  await expect(
    page.locator('.duplicate-card[data-category="wasteful"]').filter({
      hasText: 'Mage Hand',
    }),
  ).toContainText('Sources: Magic Initiate: Wizard, Wizard 1 · Slots:');
  await expect(page.locator('.invalid-list')).toContainText(
    'Selected spell is outside the slot level range.',
  );
  await expect(page.locator('.invalid-list')).toContainText(
    'grant_rule_removed',
  );

  expect(before.characters).toEqual([
    expect.objectContaining({
      id: fixture.characterId,
      name: 'R40 Golden',
      revision: 0,
    }),
  ]);
  expect(before.slots).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: fixture.ids.invalid,
        selection_eligibility: 'invalid',
      }),
      expect.objectContaining({
        id: fixture.ids.orphaned,
        state: 'orphaned',
      }),
      expect.objectContaining({
        id: fixture.ids.override,
        state: 'kept_override',
      }),
    ]),
  );
  expect(await databaseState(page)).toEqual(before);

  await page.reload();
  await expect(
    page.locator('[data-screen="build-report"]'),
  ).toBeVisible();
  expect(await databaseState(page)).toEqual(before);
});

test('reference and full printable routes preserve data and expose accessible print CSS', async ({
  page,
}) => {
  const fixture = await fixtureImage('print');
  await installFixture(page, fixture);
  const before = await databaseState(page);

  await page.goto(`/characters/${fixture.characterId}/print`);
  const printable = page.locator('[data-screen="printable-list"]');
  await expect(printable).toHaveAttribute('data-variant', 'reference');
  await expect(page).toHaveTitle('P50 Printable spell list');
  await expect(page.getByLabel('Print variant')).toHaveValue('reference');
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  await expect(page.locator('.text-notice')).toHaveCount(0);
  await expect(page.locator('.spell-description')).toHaveCount(0);
  await expect(
    page.locator('.source-section > .source-heading > h2').allTextContents(),
  ).resolves.toEqual([
    'Cleric 1',
    'Druid 1',
    'Gift 2',
    'Gift 10',
    'Wizard 1',
  ]);

  const command = page.locator(
    `.spell-card[data-spell-version="${fixture.ids.command}"]`,
  ).first();
  await expect(command).toContainText('Access: With Slots · WIS');
  await expect(command).toContainText('Saving throw: DC 12 · WIS');
  const mistyStep = page.locator(
    `.spell-card[data-spell-version="${fixture.ids.mistyStep}"]`,
  );
  await expect(mistyStep).toContainText(
    'Access: Slots And Free Cast · CHA',
  );

  await page.getByLabel('Print variant').selectOption('full');
  await page.getByRole('button', { name: 'Change variant' }).click();
  await expect(page).toHaveURL(
    `/characters/${fixture.characterId}/print?variant=full`,
  );
  await expect(printable).toHaveAttribute('data-variant', 'full');
  await expect(page.getByTestId('text-partial')).toHaveText(
    'Some spell descriptions are unavailable. Missing text is identified on the affected spells.',
  );
  await expect(command.locator('.spell-description')).toHaveText(
    'A one-word supernatural command.',
  );
  await expect(
    page
      .locator(
        `.spell-card[data-spell-version="${fixture.ids.goodberry}"]`,
      )
      .locator('.spell-description'),
  ).toHaveText('Description unavailable.');

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-controls')).toHaveCSS(
    'display',
    'none',
  );
  await expect(command).toHaveCSS('break-inside', 'avoid');
  const fullColumns = await page
    .locator('.spell-grid')
    .first()
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(fullColumns.trim().split(/\s+/)).toHaveLength(1);

  expect(before.characters).toEqual([
    expect.objectContaining({
      id: fixture.characterId,
      name: 'P50 Printable',
      revision: 0,
    }),
  ]);
  expect(before.slots).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(Number),
        fixed_spell_version_id: fixture.ids.mistyStep,
        free_cast:
          '{"uses":1,"recovery":"long_rest","pool_scope":"per_spell"}',
      }),
    ]),
  );
  expect(await databaseState(page)).toEqual(before);
});
