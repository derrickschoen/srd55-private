import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

async function waitForReady(page: Page): Promise<void> {
  await page.locator('#status[data-ready="true"]').waitFor();
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
  );
}

test.describe.serial('bundled digest reload readiness', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('/');
    await waitForReady(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  for (let run = 1; run <= 3; run += 1) {
    test(`warm boot sample ${String(run)} stays behind readiness`, async () => {
      const startedAt = performance.now();
      await page.reload();
      await waitForReady(page);
      const elapsed = Math.round(performance.now() - startedAt);

      console.log(`BOOT_TO_READY_RUN_${String(run)}_MS=${String(elapsed)}`);
      await expect(page.getByText('Local database ready.')).toBeVisible();
    });
  }
});
