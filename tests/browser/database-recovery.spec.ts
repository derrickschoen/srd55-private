import type { Download, Page } from '@playwright/test';
import { STALE_CATALOG_MARKER } from '../fixtures/stale-catalog-marker';
import { expect, test } from './fixtures/parallel-test';
import type { PlantResult } from './fixtures/stale-catalog-marker-worker';

/**
 * PC-EXPORT-TRUTH fix 2 (codex r2 P1). The owner accepted a local database
 * reset for a database whose catalog data marker predates this build (D923
 * Q11). This is the end-to-end witness that the reset is COMPLETABLE in the
 * app: the boot stops on a screen that names the stale update, the rescue
 * copy downloads, a declined confirmation deletes nothing, and a confirmed
 * reset starts the application on a fresh database that stays fresh across a
 * reload.
 *
 * The stale database is the real one: the app creates and seeds its own image,
 * then a test-only worker rewrites the single marker row to the checksum an
 * image created before this unit carries
 * (fixtures/stale-catalog-marker-worker.ts).
 */
const MARKER = STALE_CATALOG_MARKER.migrationId;
const PRE_UNIT_CHECKSUM = STALE_CATALOG_MARKER.preUnitChecksum;
/** src/db/worker.ts: the pool and file the application worker opens. */
const POOL_NAME = 'dnd-multiclass-spells-sahpool';
const DATABASE_FILENAME = '/dnd-multiclass-spells.sqlite3';
const CHARACTER = 'Built before the reset';

async function waitForReady(page: Page): Promise<void> {
  // A cold boot seeds the whole catalog; the database-lifecycle spec's 35 s
  // budget is reused for the same work.
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 35_000,
  });
}

async function markerChecksum(page: Page): Promise<unknown> {
  const rows = await page.evaluate(
    (id) => window.staticApp.inspectRows('catalog_data_migrations', { id }),
    MARKER,
  );
  expect(rows).toHaveLength(1);
  return rows[0]?.checksum;
}

async function plantStaleMarker(page: Page): Promise<PlantResult> {
  return page.evaluate(async (request) => {
    const worker = new Worker('/tests/browser/fixtures/stale-catalog-marker-worker.ts', {
      type: 'module',
    });
    try {
      return await new Promise<PlantResult>((resolve, reject) => {
        worker.addEventListener('message', (event: MessageEvent<PlantResult>) => resolve(event.data), {
          once: true,
        });
        worker.addEventListener('error', (event) => reject(new Error(event.message || 'The plant worker failed to load.')), {
          once: true,
        });
        worker.postMessage(request);
      });
    } finally {
      worker.terminate();
    }
  }, {
    poolName: POOL_NAME,
    filename: DATABASE_FILENAME,
    migrationId: MARKER,
    checksum: PRE_UNIT_CHECKSUM,
  });
}

async function downloadBytes(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('a database whose catalog marker predates this build boots to a recovery screen whose export and reset complete', async ({
  page,
}) => {
  // Two cold boots with a full catalog seed (the first visit and the reset),
  // one degraded boot and one stamped reboot; each boot alone is budgeted 35 s.
  test.setTimeout(150_000);

  await page.goto('/');
  await waitForReady(page);
  const registered = await markerChecksum(page);
  expect(registered).toMatch(/^[0-9a-f]{64}$/u);
  expect(registered).not.toBe(PRE_UNIT_CHECKSUM);
  await page.evaluate((name) => window.staticApp.writeCharacter(name), CHARACTER);

  // The licence route never opens the database, so from here nothing but the
  // test worker holds the pool.
  await page.goto('/legal');
  await expect(page.locator('[data-testid="srd-attribution"]')).toBeVisible();
  expect(await plantStaleMarker(page)).toEqual({
    ok: true,
    changed: 1,
    stored: PRE_UNIT_CHECKSUM,
  });

  await page.goto('/');
  const shell = page.locator('main[data-boot-failure="local_database_needs_reset"]');
  await expect(shell).toBeVisible({ timeout: 35_000 });
  await expect(shell).toHaveAttribute('data-degraded-reason', 'catalog_data_marker_disagreement');
  await expect(page.getByRole('heading', {
    name: 'Your local database was made by an earlier build',
  })).toBeVisible();
  const status = page.locator('#status');
  await expect(status).toContainText(`"${MARKER}"`);
  await expect(status).toHaveAttribute('data-ready', 'false');
  await expect(status).not.toContainText('Failed:');
  const progress = page.getByTestId('database-recovery-progress');

  // Export: the rescued file is the stale image itself, user row included.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-local-database').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^srd-55-local-database-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.sqlite3$/u,
  );
  const rescued = await downloadBytes(download);
  expect(rescued.subarray(0, 16).toString('latin1')).toBe('SQLite format 3\u0000');
  expect(rescued.includes(Buffer.from(PRE_UNIT_CHECKSUM, 'latin1'))).toBe(true);
  expect(rescued.includes(Buffer.from(CHARACTER, 'latin1'))).toBe(true);
  await expect(progress).toContainText('Nothing was deleted.');
  await expect(shell).toBeVisible();

  // A declined confirmation deletes nothing and leaves the screen in place.
  page.once('dialog', (dialog) => {
    void dialog.dismiss();
  });
  await page.getByTestId('reset-local-database').click();
  await expect(progress).toHaveText('Reset cancelled. Nothing was deleted.');
  await expect(shell).toBeVisible();

  // A confirmed reset starts the application on this build's database.
  let confirmation = '';
  page.once('dialog', (dialog) => {
    confirmation = dialog.message();
    void dialog.accept();
  });
  await page.getByTestId('reset-local-database').click();
  await waitForReady(page);
  await expect(shell).toHaveCount(0);
  expect(confirmation).toContain('permanently deletes');
  expect(await page.evaluate(() => window.staticApp.inspectRows('characters'))).toEqual([]);
  expect(await markerChecksum(page)).toBe(registered);

  // And the recovery is durable: a reload boots straight to the application.
  await page.reload();
  await waitForReady(page);
  await expect(shell).toHaveCount(0);
  expect(await markerChecksum(page)).toBe(registered);
});
