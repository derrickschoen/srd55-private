import type { Page } from '@playwright/test';
import { readGuidedSeam } from './fixtures/guided-seam';
import { readLevelUpSeam } from './fixtures/level-up-seam';
import {
  announcedMessages,
  clearAnnouncements,
  installAnnouncementRecorder,
} from './fixtures/announcements';
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

test('U1 incomplete cards resume durable ability work while allocated level-up state remains ready', async ({
  page,
}) => {
  await resetHome(page);
  const character = await page.evaluate(async () => {
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.guidedClassOptions', {});
    const paladin = classes.find((candidate) => candidate.name === 'Paladin');
    if (paladin === undefined) throw new Error('Bundled Paladin was not found.');
    return window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      { readonly id: number; readonly name: string }
    >('queries.characters.createGuided', {
      name: 'Guided Integrity Paladin',
      class_content_key: paladin.content_key,
    });
  });
  await page.reload();
  await ready(page);

  const card = page.locator('.character-card').filter({
    has: page.getByRole('heading', { name: character.name }),
  });
  const guidedSeam = await readGuidedSeam(page, character.id);
  const levelUpSeam = await readLevelUpSeam(page, character.id);
  if (guidedSeam.buildPath === null) {
    throw new Error('The guided seam returned no persisted build path.');
  }
  await expect(card.getByRole('link', { name: 'Resume build' })).toHaveAttribute(
    'href',
    guidedSeam.buildPath,
  );
  await expect(card.getByRole('link', { name: 'Level Up' })).toHaveCount(0);

  await page.goto(levelUpSeam.path);
  await expect(
    page.getByRole('heading', { name: 'Finish level 1 before leveling up' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Resume build' })).toHaveAttribute(
    'href',
    guidedSeam.buildPath,
  );
  await expect(page.locator('main.level-up-shell')).not.toContainText('16');
  await page.getByRole('link', { name: 'Resume build' }).click();

  await page.getByRole('radio', { name: 'Manual entry' }).check();
  const scores = [
    ['Strength', '8'],
    ['Dexterity', '9'],
    ['Constitution', '10'],
    ['Intelligence', '11'],
    ['Wisdom', '12'],
    ['Charisma', '13'],
  ] as const;
  for (const [ability, score] of scores) {
    await page.getByLabel(ability, { exact: true }).fill(score);
  }
  await expect.poll(async () => page.evaluate(() =>
    window.staticApp.inspectRows('character_rule_overrides'),
  )).toEqual([
    expect.objectContaining({
      rule_key: 'guided_ability_draft_v1',
      value: JSON.stringify({
        method: 'manual',
        scores: {
          strength: 8,
          dexterity: 9,
          constitution: 10,
          intelligence: 11,
          wisdom: 12,
          charisma: 13,
        },
      }),
    }),
  ]);

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Manual entry' })).toBeChecked();
  for (const [ability, score] of scores) {
    await expect(page.getByLabel(ability, { exact: true })).toHaveValue(score);
  }
  await page.getByRole('button', { name: 'Set ability scores' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a species' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() =>
    window.staticApp.inspectRows('character_rule_overrides'),
  )).toEqual([]);

  await page.goto('/');
  await ready(page);
  const allocatedCard = page.locator('.character-card').filter({
    has: page.getByRole('heading', { name: character.name }),
  });
  await expect(allocatedCard.getByRole('link', { name: 'Resume build' })).toHaveAttribute(
    'href',
    guidedSeam.buildPath,
  );
  await expect(allocatedCard.getByRole('link', { name: 'Level Up' })).toHaveCount(0);
  await allocatedCard.getByRole('link', { name: 'Open workspace' }).click();
  await page.getByRole('link', { name: 'Character sheet' }).click();
  const sheetLinks = page.locator('.sheet-header a');
  await expect(sheetLinks).toHaveCount(3);
  await expect(sheetLinks.nth(1)).toHaveText('Level Up');
  await expect(sheetLinks.nth(1)).toHaveAttribute('href', levelUpSeam.path);
  await expect(sheetLinks.nth(1)).toHaveClass(/button-primary/);
  await expect(sheetLinks.nth(2)).toHaveText('Open planner');
  await expect(sheetLinks.nth(2)).toHaveClass(/button-secondary/);
  await sheetLinks.nth(1).click();
  await expect(page).toHaveURL(new URL(levelUpSeam.path, page.url()).href);
  await expect(page.locator('.level-up-route')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `Level up — ${character.name}` }),
  ).toBeFocused();
});

test('catalog, complete database, and character backup controls preserve durable state and show errors', async ({
  page,
}) => {
  await installAnnouncementRecorder(page);
  await resetHome(page);
  const characterId = await createThroughGuidedBuilder(page, 'Backup Hero');
  await page.goto('/');
  await ready(page);
  const transferSummary = page.getByText('Import and backups', { exact: true });
  await transferSummary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details.transfer-panel')).toHaveAttribute('open', '');
  await expect(transferSummary).toBeFocused();

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
  await clearAnnouncements(page);
  await page.getByRole('button', { name: 'Import catalog' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText(
    'Invalid Tier 1 catalog document',
  );
  await expect.poll(async () =>
    (await announcedMessages(page)).some((message) =>
      message.includes('Invalid Tier 1 catalog document')
    )
  ).toBe(true);
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

  const summary = page.getByText('Advanced: create a blank character', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Tab');
  const name = page.getByLabel('Character name');
  await expect(name).toBeFocused();
  await page.keyboard.type('Blank Escape Hero');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Create blank character' })).toBeFocused();
  await page.keyboard.press('Enter');

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
