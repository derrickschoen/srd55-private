import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

async function resetHome(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);
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
  await page.getByLabel('Character name').fill('  Selene, spellblade  ');
  await page.getByRole('button', { name: 'Create character' }).click();
  await expect(page).toHaveURL(/\/characters\/1$/);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Selene, spellblade', revision: 0 }),
  ]);

  await page.goto('/');
  await ready(page);
  await expect(page.getByRole('heading', { name: 'Selene, spellblade' })).toBeVisible();
  await page.getByRole('link', { name: 'Open workspace' }).click();
  await expect(page).toHaveURL(/\/characters\/1$/);

  await page.goto('/');
  await ready(page);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete Selene, spellblade' }).click();
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Selene, spellblade' }),
  ]);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Selene, spellblade' }).click();
  await expect(page.getByRole('heading', { name: 'No characters yet' })).toBeVisible();
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([]);
});

test('catalog, complete database, and character backup controls preserve durable state and show errors', async ({
  page,
}) => {
  await resetHome(page);
  await page.getByLabel('Character name').fill('Backup Hero');
  await page.getByRole('button', { name: 'Create character' }).click();
  await expect(page).toHaveURL(/\/characters\/1$/);
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
    expect.objectContaining({ id: 1, name: 'Backup Hero' }),
  ]);

  const [characterDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download character backup' }).click(),
  ]);
  const characterBytes = await downloadBytes(characterDownload);
  await page.getByLabel('Import one character').setInputFiles({
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
    expect.objectContaining({ id: 1, name: 'Backup Hero' }),
    expect.objectContaining({ id: 2, name: 'Backup Hero' }),
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
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
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
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
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
    await page.evaluate(() => window.staticApp.inspectRows('spell_versions')),
  ).toEqual([
    expect.objectContaining({
      content_key: '2024:ui-catalog-spell',
      is_active: 1,
    }),
  ]);
});
