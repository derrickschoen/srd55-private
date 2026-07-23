import { expect, test } from '@playwright/test';
async function waitForWorker(page: import('@playwright/test').Page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

test('OPFS data persists across reload and worker connections enforce schema guards', async ({
  page,
}) => {
  await page.goto('/');
  await waitForWorker(page);

  const info = await page.evaluate(() => window.staticApp.info());
  console.log(`SQLITE_BUILD_EVIDENCE ${JSON.stringify(info)}`);
  expect(info.crossOriginIsolated).toBe(false);
  expect(info.vfsName).toBe('dnd-multiclass-spells-sahpool');
  expect(info.filename).toBe('/dnd-multiclass-spells.sqlite3');
  expect(info.foreignKeys).toBe(1);
  expect(info.journalMode).toBe('delete');

  await page.evaluate(() => window.staticApp.reset());
  await page.evaluate(() =>
    window.staticApp.writeCharacter('Persists across a full reload'),
  );
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: 1,
      name: 'Persists across a full reload',
      revision: 0,
    }),
  ]);

  await page.reload();
  await waitForWorker(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: 1,
      name: 'Persists across a full reload',
      revision: 0,
    }),
  ]);

  const trigger = await page.evaluate(() =>
    window.staticApp.attemptTriggerViolation(),
  );
  expect(trigger).toEqual({
    rejected: true,
    message:
      'SQLITE_CONSTRAINT_TRIGGER: sqlite3 result code 1811: ' +
      'a spell slot cannot hold both a fixed grant and a user selection',
  });

  const foreignKey = await page.evaluate(() =>
    window.staticApp.attemptForeignKeyViolation(),
  );
  expect(foreignKey).toEqual({
    rejected: true,
    message:
      'SQLITE_CONSTRAINT_FOREIGNKEY: sqlite3 result code 787: ' +
      'FOREIGN KEY constraint failed',
  });
});
