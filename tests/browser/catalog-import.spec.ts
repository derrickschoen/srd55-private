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
  // Measured 10.4s alone on CI-3b; reloads and worker persistence dominate.
  test.setTimeout(20_000);
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
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
  ).toEqual([]);

  await page.evaluate(
    (document) =>
      window.appRpc.call('catalog.import', { documents: [document] }),
    catalog,
  );
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
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
        identityKey: 'magic-missile',
        versionKey: '2024:magic-missile',
        name: 'Magic Missile',
      }),
    ]),
  ]);
  expect(failed).toBe(true);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:browser-spell',
      is_active: 1,
    }),
  ]);

  await page.reload();
  await ready(page);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
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
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:browser-spell',
      is_active: 0,
    }),
  ]);
});

/**
 * THE SUBCLASS RECORD KIND, THROUGH THE REAL WORKER AND ACROSS A RELOAD.
 *
 * The integration suite drives the importer in-process. This drives it through
 * the worker, the RPC boundary and the persisted database image, which is where
 * a durability defect would actually show up — and it asserts the property that
 * makes the two record kinds safe to ship together: a LATER SPELL IMPORT, which
 * is a full replacement of the spell catalog, must not take the subclass with
 * it.
 */
test('a subclass import lands, survives a reload, and outlives a spell replacement', async ({
  page,
}) => {
  // Measured 10.6s alone on CI-3b; this includes three persistence reloads.
  test.setTimeout(20_000);
  await page.goto('/');
  await ready(page);

  const subclass = JSON.stringify([
    {
      kind: 'subclass',
      contentKey: '2024:browser.homebrew:choir-of-the-iron-hymn',
      parentClassKey: '2024:class:bard',
      name: 'Choir of the Iron Hymn',
      edition: '2024',
      features: [
        {
          classLevel: 3,
          name: 'Notebook and Nail',
          description: 'You write one-handed while the room is still shouting.',
        },
        {
          classLevel: 6,
          name: 'Hammered Cadence',
          description: 'Your rehearsal is a drill, and the beat is where your feet go.',
          effect: {
            kind: 'extra_attack',
            attackCount: 2,
            weaponScope: 'any_weapon',
          },
        },
      ],
    },
  ]);

  const summary = await page.evaluate(async (document) => {
    await window.staticApp.reset();
    return window.appRpc.call<
      { documents: string[] },
      { subclasses_created: number; subclass_features_created: number }
    >('catalog.import', { documents: [document] });
  }, subclass);
  expect(summary.subclasses_created).toBe(1);
  expect(summary.subclass_features_created).toBe(2);

  const stored = async () =>
    page.evaluate(() =>
      window.staticApp.inspectRows('subclass_definitions', {
        content_key: '2024:browser.homebrew:choir-of-the-iron-hymn',
      }),
    );
  expect(await stored()).toEqual([
    expect.objectContaining({
      content_key: '2024:browser.homebrew:choir-of-the-iron-hymn',
      name: 'Choir of the Iron Hymn',
      rules_edition: '2024',
    }),
  ]);

  await page.reload();
  await ready(page);
  expect(await stored()).toHaveLength(1);
  // The seeder runs at every boot and upserts its own two subclasses. An
  // imported row parked beside them must be neither overwritten nor swept.
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('subclass_definitions'),
    ),
  ).toHaveLength(3);

  // A spell import is a FULL REPLACEMENT of the spell catalog. It must not
  // reach the subclass — this is the silent-data-loss case.
  await page.evaluate(
    (document) =>
      window.appRpc.call('catalog.import', { documents: [document] }),
    JSON.stringify([record()]),
  );
  expect(await stored()).toHaveLength(1);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('subclass_features')),
  ).toHaveLength(2);

  // And the reverse: emptying the spell catalog leaves the subclass alone too.
  await page.evaluate(() =>
    window.appRpc.call('catalog.import', { documents: ['[]'] }),
  );
  await page.reload();
  await ready(page);
  expect(await stored()).toHaveLength(1);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', { is_active: 0 }),
    ),
  ).toHaveLength(1);
});

test('a feat aggregate imports through RPC under a derived identity and survives reload', async ({
  page,
}) => {
  // Measured 7.8s alone on CI-3b; worker boot plus one reload dominates.
  test.setTimeout(20_000);
  await page.goto('/');
  await ready(page);
  const feat = JSON.stringify([{
    kind: 'feat',
    aggregate: {
      kind: 'feat',
      name: 'Browser Keen Memory',
      rules_edition: 'expanded',
      category: 'general',
      min_level: null,
      ability_points: 0,
      ability_increase_abilities: null,
      ability_increase_maximum: null,
      repeatable: false,
      prerequisites: [],
      grants: [],
      notes: 'Remembers the browser boundary.',
    },
  }]);
  const summary = await page.evaluate(async (document) => {
    await window.staticApp.reset();
    return window.appRpc.call<
      { documents: string[] },
      { feats_created: number }
    >('catalog.import', { documents: [document] });
  }, feat);
  expect(summary.feats_created).toBe(1);
  const stored = async () => page.evaluate(() =>
    window.staticApp.inspectRows('feat_definitions', {
      name: 'Browser Keen Memory',
    })
  );
  expect(await stored()).toEqual([
    expect.objectContaining({
      content_key: expect.stringMatching(/^expanded:content\.v1:[0-9a-f]{64}$/),
      notes: 'Remembers the browser boundary.',
    }),
  ]);
  await page.reload();
  await ready(page);
  expect(await stored()).toHaveLength(1);
});
