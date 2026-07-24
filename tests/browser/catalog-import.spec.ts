import { expect, test } from '@playwright/test';

function record(overrides: Record<string, unknown> = {}) {
  return {
    identityKey: 'browser-spell',
    versionKey: '2024:browser-spell',
    name: 'Browser Spell',
    edition: '2024',
    level: 1,
    school: 'Evocation',
    castingTime: 'Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    attackModes: ['ranged_spell'],
    saveAbilities: [],
    effectReliabilityCategory: 'attack_roll',
    spellLists: ['Wizard'],
    sourceBooks: ['Browser Book'],
    sourcePage: 12,
    sourceSlug: 'browser-spell',
    ...overrides,
  };
}

async function ready(page: import('@playwright/test').Page) {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

test('catalog RPC dry-runs, commits atomically, tombstones, and persists across reloads', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  const catalog = JSON.stringify([record()]);

  const dryRun = await page.evaluate(async (document) => {
    await window.staticApp.reset();
    return window.appRpc.call<
      { documents: string[]; dryRun: boolean },
      { created: number }
    >('catalog.import', { documents: [document], dryRun: true });
  }, catalog);
  expect(dryRun.created).toBe(1);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
  ).toEqual([]);

  await page.evaluate(
    (document) =>
      window.appRpc.call('catalog.import', { documents: [document] }),
    catalog,
  );
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:browser-spell',
      display_name: 'Browser Spell',
      is_active: 1,
    }),
  ]);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_version_publications'),
    ),
  ).toEqual([
    expect.objectContaining({
      source_book: 'Browser Book',
      source_page: 12,
    }),
  ]);

  const failed = await page.evaluate(async (documents) => {
    try {
      await window.appRpc.call('catalog.import', { documents });
      return false;
    } catch {
      return true;
    }
  }, [
    JSON.stringify([
      record({
        identityKey: 'conflict',
        versionKey: '2024:conflict-a',
        name: 'Conflict A',
      }),
      record({
        identityKey: 'conflict',
        versionKey: '2024:conflict-b',
        name: 'Conflict B',
      }),
    ]),
  ]);
  expect(failed).toBe(true);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:browser-spell',
      is_active: 1,
    }),
  ]);

  await page.reload();
  await ready(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:browser-spell',
      is_active: 1,
    }),
  ]);

  await page.evaluate(() =>
    window.appRpc.call('catalog.import', { documents: ['[]'] }),
  );
  await page.reload();
  await ready(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:browser-spell',
      is_active: 0,
    }),
  ]);
});
