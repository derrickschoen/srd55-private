import { expect, test } from '@playwright/test';

type WorkerInfo = {
  sqliteVersion: string;
  compileOptions: string[];
  foreignKeys: number;
  journalMode: string;
  vfsName: string;
  filename: string;
  crossOriginIsolated: boolean;
  poolCapacity: number;
};

type Rejection = {
  rejected: boolean;
  message: string | null;
};

declare global {
  interface Window {
    spikeDb: {
      info(): Promise<WorkerInfo>;
      reset(): Promise<{ reset: boolean }>;
      writeCharacter(name: string): Promise<{ id: number; name: string }>;
      countCharacters(): Promise<number>;
      attemptTriggerViolation(): Promise<Rejection>;
      attemptForeignKeyViolation(): Promise<Rejection>;
    };
  }
}

async function waitForWorker(page: import('@playwright/test').Page) {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

test('sahpool persists across reload and enforces guards through worker RPC', async ({
  page,
}) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  expect(response!.headers()['cross-origin-opener-policy']).toBeUndefined();
  expect(response!.headers()['cross-origin-embedder-policy']).toBeUndefined();
  await waitForWorker(page);

  const info = await page.evaluate(() => window.spikeDb.info());
  console.log(`SQLITE_BUILD_EVIDENCE ${JSON.stringify(info)}`);
  expect(info.crossOriginIsolated).toBe(false);
  expect(info.vfsName).toBe('dnd-static-spike-sahpool');
  expect(info.filename).toBe('/dnd-static-spike.sqlite3');
  expect(info.foreignKeys).toBe(1);
  expect(info.journalMode).toBe('delete');
  expect(info.poolCapacity).toBeGreaterThanOrEqual(2);

  await page.evaluate(() => window.spikeDb.reset());
  expect(await page.evaluate(() => window.spikeDb.countCharacters())).toBe(0);

  await page.evaluate(() =>
    window.spikeDb.writeCharacter('Persists across a full reload'),
  );
  expect(await page.evaluate(() => window.spikeDb.countCharacters())).toBe(1);

  await page.reload();
  await waitForWorker(page);
  expect(await page.evaluate(() => window.spikeDb.countCharacters())).toBe(1);

  const trigger = await page.evaluate(() =>
    window.spikeDb.attemptTriggerViolation(),
  );
  expect(trigger.rejected).toBe(true);
  expect(trigger.message).toBe(
    'SQLITE_CONSTRAINT_TRIGGER: sqlite3 result code 1811: ' +
      'a spell slot cannot hold both a fixed grant and a user selection',
  );

  const foreignKey = await page.evaluate(() =>
    window.spikeDb.attemptForeignKeyViolation(),
  );
  expect(foreignKey.rejected).toBe(true);
  expect(foreignKey.message).toBe(
    'SQLITE_CONSTRAINT_FOREIGNKEY: sqlite3 result code 787: ' +
      'FOREIGN KEY constraint failed',
  );
});
