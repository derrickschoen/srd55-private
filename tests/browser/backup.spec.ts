import { expect, test } from '@playwright/test';

async function waitForWorker(page: import('@playwright/test').Page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

test('typed backup RPC round-trips both durable formats and rejects before persisted writes', async ({
  page,
}) => {
  await page.goto('/');
  await waitForWorker(page);

  const initial = await page.evaluate(async () => {
    await window.staticApp.reset();
    const created = await window.staticApp.writeCharacter('Portable Browser Hero');
    const character = await window.appRpc.call<
      { characterId: number },
      {
        source_character_id: number;
        character: Record<string, unknown>;
      }
    >('backup.exportCharacter', { characterId: created.id });
    const database = await window.appRpc.call<
      Record<string, never>,
      {
        format: string;
        version: number;
        sqlite: Uint8Array;
      }
    >('backup.exportDatabase', {});
    await window.staticApp.writeCharacter('Removed by database restore');
    await window.appRpc.call('backup.importDatabase', { backup: database });
    const imported = await window.appRpc.call<
      { document: typeof character },
      { characterId: number }
    >('backup.importCharacter', { document: character });
    return {
      characterFormat: String(
        (character as { format?: unknown }).format,
      ),
      sourceCharacterId: character.source_character_id,
      databaseFormat: database.format,
      databaseVersion: database.version,
      importedId: imported.characterId,
    };
  });

  expect(initial).toEqual({
    characterFormat: 'dnd-multiclass-spells/character',
    sourceCharacterId: 1,
    databaseFormat: 'dnd-multiclass-spells/database',
    databaseVersion: 1,
    importedId: 2,
  });
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Portable Browser Hero' }),
    expect.objectContaining({ id: 2, name: 'Portable Browser Hero' }),
  ]);

  const rejected = await page.evaluate(async () => {
    const document = await window.appRpc.call<
      { characterId: number },
      Record<string, any>
    >('backup.exportCharacter', { characterId: 1 });
    document.character.id = 999;
    try {
      await window.appRpc.call('backup.importCharacter', { document });
      return { rejected: false, message: null };
    } catch (error) {
      return {
        rejected: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
  expect(rejected).toEqual({
    rejected: true,
    message: 'Character backup character belongs to another character.',
  });
  expect(
    await page.evaluate(() => window.staticApp.countCharacters()),
  ).toBe(2);

  const corruptDatabase = await page.evaluate(async () => {
    try {
      await window.appRpc.call('backup.importDatabase', {
        backup: {
          format: 'dnd-multiclass-spells/database',
          version: 1,
          exported_at: new Date().toISOString(),
          sqlite: new TextEncoder().encode('not sqlite'),
        },
      });
      return false;
    } catch {
      return true;
    }
  });
  expect(corruptDatabase).toBe(true);
  expect(
    await page.evaluate(() => window.staticApp.countCharacters()),
  ).toBe(2);

  await page.reload();
  await waitForWorker(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ id: 1, name: 'Portable Browser Hero' }),
    expect.objectContaining({ id: 2, name: 'Portable Browser Hero' }),
  ]);
});
