import type { Page } from '@playwright/test';
import { readGuidedSeam } from './fixtures/guided-seam';
import { readLevelUpSeam } from './fixtures/level-up-seam';
import { expect, test } from './fixtures/parallel-test';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  // The four-worker pool measured this file's slowest caller at 19.5s; 50s
  // gives this load-sensitive readiness wait at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 50_000 },
  );
}

async function resetHome(
  page: Page,
): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);
}

async function createThroughGuidedBuilder(
  page: Page,
  name: string,
): Promise<number> {
  const seam = await readGuidedSeam(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await expect(page).toHaveURL(new URL(seam.newRoute, page.url()).href);
  await expect(page.locator('input')).toHaveCount(0);
  await page.locator('[data-class-option]').first().click();
  await page.getByLabel('Character name').fill(name);
  await page.getByRole('button', { name: 'Create character' }).click();

  const characters = await page.evaluate(() =>
    window.staticApp.inspectRows('characters'),
  );
  const characterId = Number(characters[0]?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const persistedSeam = await readGuidedSeam(page, characterId);
  if (persistedSeam.buildPath === null) {
    throw new Error('The guided seam returned no persisted build path.');
  }
  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  return characterId;
}

async function downloadBytes(
  download: import('@playwright/test').Download,
): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function catalogRecord(): string {
  return JSON.stringify([
    {
      identityKey: 'ui-catalog-spell',
      versionKey: '2024:ui-catalog-spell',
      name: 'UI Catalog Spell',
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
      sourceBooks: ['UI Test Book'],
      sourcePage: 70,
      sourceSlug: 'ui-catalog-spell',
    },
  ]);
}

test('character shell creates, opens, confirms deletion, and persists every flow', async ({
  page,
}) => {
  await resetHome(page);

  await expect(page.getByRole('heading', { name: 'No characters yet' })).toBeVisible();
  await expect(page.locator('#status')).toContainText('Local database ready.');
  const characterId = await createThroughGuidedBuilder(
    page,
    '  Selene, spellblade  ',
  );
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: characterId,
      name: 'Selene, spellblade',
      revision: 0,
    }),
  ]);

  await page.goto('/');
  await ready(page);
  await expect(page.getByRole('heading', { name: 'Selene, spellblade' })).toBeVisible();
  await page.getByRole('link', { name: 'Open workspace' }).click();
  await expect(page).toHaveURL(
    new URL(`/characters/${characterId}`, page.url()).href,
  );

  await page.goto('/');
  await ready(page);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete Selene, spellblade' }).click();
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: characterId,
      name: 'Selene, spellblade',
    }),
  ]);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Selene, spellblade' }).click();
  await expect(page.getByRole('heading', { name: 'No characters yet' })).toBeVisible();
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([]);
});

test('W-ENTRY-BOTH every character card and the sheet use the exact primary Level Up route', async ({
  page,
}) => {
  await resetHome(page);
  const characters = await page.evaluate(async () => {
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.guidedClassOptions', {});
    const fighter = classes.find((candidate) => candidate.name === 'Fighter');
    if (fighter === undefined) throw new Error('Bundled Fighter was not found.');
    const create = (name: string) => window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      { readonly id: number; readonly name: string }
    >('queries.characters.createGuided', {
      name,
      class_content_key: fighter.content_key,
    });
    return [await create('First Entry'), await create('Second Entry')];
  });
  await page.reload();
  await ready(page);

  for (const character of characters) {
    const seam = await readLevelUpSeam(page, character.id);
    const card = page.locator('.character-card').filter({
      has: page.getByRole('heading', { name: character.name }),
    });
    const actions = card.locator('.card-actions a');
    await expect(actions).toHaveCount(2);
    await expect(actions.nth(0)).toHaveText('Level Up');
    await expect(actions.nth(0)).toHaveAttribute('href', seam.path);
    await expect(actions.nth(0)).toHaveClass(/button-primary/);
    await expect(actions.nth(1)).toHaveText('Open workspace');
    await expect(actions.nth(1)).toHaveAttribute(
      'href',
      `/characters/${String(character.id)}`,
    );
    await expect(actions.nth(1)).toHaveClass(/button-secondary/);
  }

  const first = characters[0];
  if (first === undefined) throw new Error('No entry character was created.');
  const firstSeam = await readLevelUpSeam(page, first.id);
  await page
    .locator('.character-card')
    .filter({ has: page.getByRole('heading', { name: first.name }) })
    .getByRole('link', { name: 'Open workspace' })
    .click();
  await page.getByRole('link', { name: 'Character sheet' }).click();
  const sheetLinks = page.locator('.sheet-header a');
  await expect(sheetLinks).toHaveCount(3);
  await expect(sheetLinks.nth(1)).toHaveText('Level Up');
  await expect(sheetLinks.nth(1)).toHaveAttribute('href', firstSeam.path);
  await expect(sheetLinks.nth(1)).toHaveClass(/button-primary/);
  await expect(sheetLinks.nth(2)).toHaveText('Open planner');
  await expect(sheetLinks.nth(2)).toHaveClass(/button-secondary/);
  await sheetLinks.nth(1).click();
  await expect(page).toHaveURL(new URL(firstSeam.path, page.url()).href);
  await expect(page.locator('.level-up-route')).toBeVisible();
});

test('catalog, complete database, and character backup controls preserve durable state and show errors', async ({
  page,
}) => {
  await resetHome(page);
  const characterId = await createThroughGuidedBuilder(page, 'Backup Hero');
  await page.goto('/');
  await ready(page);
  await page.getByText('Import and backups').click();

  const [databaseDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download database backup' }).click(),
  ]);
  const databaseBytes = await downloadBytes(databaseDownload);
  await page.evaluate(() => window.staticApp.writeCharacter('Discarded'));
  await page.getByLabel('Restore complete database').setInputFiles({
    name: 'backup.sqlite3',
    mimeType: 'application/vnd.sqlite3',
    buffer: databaseBytes,
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Restore database backup' }).click();
  await expect(page.locator('.transfer-status')).toContainText(
    'Database backup restored.',
  );
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: characterId, name: 'Backup Hero' }),
  ]);

  const [characterDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download character backup' }).click(),
  ]);
  const characterBytes = await downloadBytes(characterDownload);
  await page.getByLabel('Import complete character JSON').setInputFiles({
    name: 'backup-hero.json',
    mimeType: 'application/json',
    buffer: characterBytes,
  });
  await page.getByRole('button', { name: 'Import character backup' }).click();
  await expect(page.locator('.transfer-status')).toContainText(
    'Character imported as #2.',
  );
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: characterId, name: 'Backup Hero' }),
    expect.objectContaining({
      id: characterId + 1,
      name: 'Backup Hero',
    }),
  ]);

  await page.getByLabel('Catalog JSON').setInputFiles({
    name: 'catalog.json',
    mimeType: 'application/json',
    buffer: Buffer.from(catalogRecord()),
  });
  await page.getByRole('button', { name: 'Import catalog' }).click();
  await expect(page.locator('.transfer-status')).toContainText(
    'Catalog imported: 1 created',
  );
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:ui-catalog-spell',
      display_name: 'UI Catalog Spell',
      is_active: 1,
    }),
  ]);

  await page.getByLabel('Catalog JSON').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not json'),
  });
  await page.getByRole('button', { name: 'Import catalog' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Invalid Tier 1 catalog document',
  );
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:ui-catalog-spell',
      is_active: 1,
    }),
  ]);

  await page.reload();
  await ready(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toHaveLength(2);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('spell_versions', {
        provenance: 'import',
      }),
    ),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:ui-catalog-spell',
      is_active: 1,
    }),
  ]);
});

test('the advanced blank-character escape hatch remains reachable without becoming the primary action', async ({
  page,
}) => {
  await resetHome(page);

  const seam = await readGuidedSeam(page);
  await expect(
    page.getByRole('link', { name: 'Create a character' }),
  ).toHaveAttribute('href', seam.newRoute);
  const details = page.locator('details.advanced-create');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(
    page.getByRole('button', { name: 'Create blank character' }),
  ).not.toBeVisible();

  await page
    .getByText('Advanced: create a blank character', { exact: true })
    .click();
  await page.getByLabel('Character name').fill('Blank Escape Hero');
  await page
    .getByRole('button', { name: 'Create blank character' })
    .click();

  await expect(page).toHaveURL(/\/characters\/1$/);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: 1,
      name: 'Blank Escape Hero',
      revision: 0,
    }),
  ]);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_class_levels'),
    ),
  ).toEqual([]);
});
