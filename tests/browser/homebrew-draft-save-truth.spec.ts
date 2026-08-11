import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

type DraftKind = 'species' | 'background' | 'subclass';

const routeByKind: Readonly<Record<DraftKind, string>> = {
  species: '/homebrew',
  background: '/homebrew?tab=background',
  subclass: '/homebrew?tab=subclass',
};

const labelByKind: Readonly<Record<DraftKind, string>> = {
  species: 'Species',
  background: 'Background',
  subclass: 'Subclass',
};

async function globalReady(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

async function reset(page: Page): Promise<void> {
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);
}

async function openNewDraft(page: Page, kind: DraftKind): Promise<void> {
  await page.goto(routeByKind[kind]);
  await expect(page.locator('.homebrew-status')).toHaveText(
    'Homebrew library loaded.',
    { timeout: 65_000 },
  );
  await page.getByRole('button', { name: `New ${kind}`, exact: true }).click();
  await expect(page.getByLabel(`${labelByKind[kind]} authoring form`, { exact: true }))
    .toBeVisible();
}

test('refused saves are terminal and human, then every shell refreshes from success', async ({
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5030 at 17.9s. 17.9s × 1.5 = 26.85s,
  // rounded up to the required 100ms boundary.
  test.setTimeout(26_900);
  await reset(page);

  for (const kind of ['species', 'background', 'subclass'] as const) {
    await openNewDraft(page, kind);
    const name = page.getByRole('textbox', { name: 'Name', exact: true });
    const status = page.locator(`.${kind}-authoring-status`);
    const save = page.getByRole('button', { name: 'Save draft', exact: true });

    if (kind === 'species') {
      const speed = page.getByRole('spinbutton', {
        name: 'Walking speed (feet)',
        exact: true,
      });
      await speed.fill('-99');
      await save.click();
      await expect(status).toHaveText('Draft not saved.');
      await expect(status).not.toHaveText(/RPC|worker|handler|transport|Zod/i);
      const speedSummary = page.getByRole('alert', { name: 'Fix these fields' });
      await expect(speedSummary).toContainText('Walking speed must be at least 1 foot.');
      await expect(speedSummary).not.toContainText(
        /code points|too small|expected number/iu,
      );
      await expect(speed).toBeFocused();
      await speed.fill('30');
    }

    await name.fill('🐲'.repeat(121));
    await save.click();
    await expect(status).toHaveText('Draft not saved.');
    await expect(status).not.toHaveText(/RPC|worker|handler|transport|Zod/i);
    const nameSummary = page.getByRole('alert', { name: 'Fix these fields' });
    await expect(nameSummary).toContainText('Name must be 120 characters or fewer.');
    await expect(nameSummary).not.toContainText(
      /code points|too small|expected (?:number|string)/iu,
    );
    await expect(name).toBeFocused();

    const savedName = `${labelByKind[kind]} <img data-s4-browser-hostile src=x> 🐲`;
    await name.fill(savedName);
    await save.click();
    await expect(status).toHaveText('Saved revision 1.');
    await expect(page.locator('.homebrew-draft-heading h2')).toHaveText(savedName);
    await expect(page.locator('.homebrew-draft-revision')).toHaveText('Saved revision 1.');
    await expect(page.locator('.authoring-validation-summary')).toHaveCount(0);
    await expect(page.locator('[data-s4-browser-hostile]')).toHaveCount(0);
  }
});

test('a transport-error save ends in an explicit not-saved alert', async ({ page }) => {
  // Measured alone on PLAYWRIGHT_PORT=5030 at 12.7s. 12.7s × 1.5 = 19.05s,
  // rounded up to the required 100ms boundary.
  test.setTimeout(19_100);
  await reset(page);
  await openNewDraft(page, 'species');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Transport proof');

  await page.evaluate(() => window.appRpc.close());
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();

  const status = page.locator('.species-authoring-status');
  await expect(status).toHaveText(
    'Draft not saved. The app lost its connection to storage — reload the page and try again.',
  );
  await expect(status).not.toHaveText(/RPC|worker|handler|transport|Zod/i);
  await expect(status).toHaveAttribute('role', 'alert');
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
});
