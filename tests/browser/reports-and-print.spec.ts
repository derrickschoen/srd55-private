import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DatabaseContext } from '../../src/db/database';
import { createBuildReportFixture } from '../integration/reports/build-report-fixture';

const schema = readFileSync(
  new URL('../../src/db/schema.sql', import.meta.url),
  'utf8',
);

interface FixtureImage {
  readonly bytes: number[];
  readonly characterId: number;
  readonly ids: Readonly<Record<string, number>>;
}

async function fixtureImage(): Promise<FixtureImage> {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const reportFixture = createBuildReportFixture(db);
  const bytes = Array.from(
    sqlite3.capi.sqlite3_js_db_export(connection),
  );
  const ids = {
    invalid: reportFixture.invalidSlotIds[1]!,
    orphaned: reportFixture.invalidSlotIds[0]!,
    override: reportFixture.invalidSlotIds[2]!,
  };
  const characterId = reportFixture.characterId;
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
  // Measured at 31.6s alone on Chromium; this ceiling is for concurrent-lane
  // contention.
  test.setTimeout(90_000);
  const fixture = await fixtureImage();
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
  const sheetLink = page.getByRole('link', { name: 'Character sheet' });
  await expect(sheetLink).toHaveAttribute(
    'href',
    `/characters/${String(fixture.characterId)}/sheet`,
  );
  await expect(page.getByRole('link', { name: 'Printable spell list' }))
    .toHaveCount(0);

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
