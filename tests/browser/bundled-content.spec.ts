import { expect, test } from './fixtures/parallel-test';

const SRD_CLASSES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
];

async function waitForWorker(page: import('@playwright/test').Page) {
  // The four-worker pool measured the caller at 12.1s; 35s gives this
  // load-sensitive worker wait at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 35_000,
  });
}

async function classNames(page: import('@playwright/test').Page) {
  const rows = await page.evaluate(() =>
    window.staticApp.inspectRows('class_definitions'),
  );
  return rows.map((row) => String(row.name)).sort();
}

async function countRows(
  page: import('@playwright/test').Page,
  table: string,
) {
  const rows = await page.evaluate(
    (name) => window.staticApp.inspectRows(name),
    table,
  );
  return rows.length;
}

test('a fresh OPFS install carries the bundled classes and keeps them across reset and reload', async ({
  page,
}) => {
  await page.goto('/');
  await waitForWorker(page);

  // The unit suite exercises this over an in-memory VFS. This is the storage
  // that actually ships, so the seed is proved on opfs-sahpool as well.
  expect(await classNames(page)).toEqual(SRD_CLASSES);
  console.log(`OPFS_BUNDLED_CLASSES ${JSON.stringify(await classNames(page))}`);

  // A reset rebuilds the image from schema.sql alone; leaving the user with no
  // classes afterwards would be a bug, so the seed has to run on that path too.
  await page.evaluate(() => window.staticApp.reset());
  expect(await classNames(page)).toEqual(SRD_CLASSES);
  expect(await countRows(page, 'class_progressions')).toBe(240);
  expect(await countRows(page, 'subclass_definitions')).toBe(2);

  // The read-only SRD spell layer ships beside the classes.
  expect(await countRows(page, 'spell_versions')).toBe(339);

  await page.reload();
  await waitForWorker(page);

  // Re-opening the stored image must neither duplicate the content nor lose it.
  expect(await classNames(page)).toEqual(SRD_CLASSES);
  expect(await countRows(page, 'class_progressions')).toBe(240);
});
