import type { Page } from '@playwright/test';
import {
  announcedMessages,
  clearAnnouncements,
  installAnnouncementRecorder,
} from './fixtures/announcements';
import { expect, test } from './fixtures/parallel-test';

async function globalReady(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

async function homebrewReady(page: Page): Promise<void> {
  await expect(page.locator('.homebrew-status')).toHaveText(
    'Homebrew library loaded.',
    { timeout: 65_000 },
  );
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute('aria-busy', 'false');
}

async function expectAnnouncement(page: Page, message: string): Promise<void> {
  await expect.poll(() => announcedMessages(page)).toContain(message);
}

async function expectDurablePublish(
  page: Page,
  expected: {
    readonly kind: 'species' | 'background' | 'subclass';
    readonly name: string;
    readonly heading: string;
  },
): Promise<void> {
  await expect(page).toHaveURL((url) =>
    url.pathname === '/homebrew' &&
    url.searchParams.get('publishOutcome') === 'created' &&
    url.searchParams.get('publishedName') === expected.name &&
    (expected.kind === 'species'
      ? url.searchParams.get('tab') === null
      : url.searchParams.get('tab') === expected.kind));
  const heading = page.getByRole('heading', { name: expected.heading, exact: true });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page.getByText('Untitled draft', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Saved revision 0.', { exact: true })).toHaveCount(0);
  await expectAnnouncement(
    page,
    `${expected.heading}: ${expected.name}. Homebrew library loaded.`,
  );
  const durableUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(durableUrl);
  await expect(page.getByRole('heading', { name: expected.heading, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: expected.name, exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL((url) =>
    url.pathname === '/homebrew' &&
    url.searchParams.get('publishOutcome') === null &&
    url.searchParams.get('notice') === null);
  await page.goForward();
  await expect(page).toHaveURL(durableUrl);
}

async function publishSpecies(page: Page): Promise<string> {
  await page.goto('/homebrew');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New species', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('U3 Durable Species');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('expanded');
  await page.getByRole('combobox', { name: 'Creature type', exact: true }).fill('Astral');
  await page.getByRole('combobox', { name: 'Primary size', exact: true }).fill('Medium');
  await page.getByRole('spinbutton', { name: 'Walking speed (feet)', exact: true }).fill('30');
  await page.getByRole('button', { name: 'Add trait', exact: true }).click();
  await page.getByRole('textbox', { name: 'Trait name', exact: true }).fill('Durable Step');
  await page.getByRole('textbox', { name: 'Trait description', exact: true })
    .fill('The route survives publication.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const draftUrl = page.url();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await clearAnnouncements(page);
  await page.getByRole('button', { name: 'Publish species', exact: true }).click();
  await expectDurablePublish(page, {
    kind: 'species', name: 'U3 Durable Species', heading: 'Species published',
  });
  return draftUrl;
}

async function publishBackground(page: Page): Promise<void> {
  await page.goto('/homebrew?tab=background');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New background', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('U3 Durable Background');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('2024');
  await page.getByRole('checkbox', { name: 'Strength', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Dexterity', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Constitution', exact: true }).check();
  await page.getByRole('combobox', { name: 'Installed Origin feat', exact: true })
    .selectOption({ label: 'Alert (2024 rules)' });
  await page.getByRole('checkbox', { name: 'Athletics', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Survival', exact: true }).check();
  await page.getByRole('textbox', { name: 'Equipment option A description', exact: true })
    .fill('A route map.');
  await page.getByRole('textbox', { name: 'Equipment option B description', exact: true })
    .fill('A reload map.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await clearAnnouncements(page);
  await page.getByRole('button', { name: 'Publish background', exact: true }).click();
  await expectDurablePublish(page, {
    kind: 'background', name: 'U3 Durable Background', heading: 'Background published',
  });
}

async function publishSubclass(page: Page): Promise<void> {
  await page.goto('/homebrew?tab=subclass');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New subclass', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('U3 Durable Subclass');
  await page.getByRole('combobox', { name: 'Rules edition', exact: true }).selectOption('expanded');
  await page.getByRole('combobox', { name: 'Parent bundled class', exact: true })
    .selectOption({ label: 'Fighter' });
  await page.getByRole('combobox', { name: 'Progression mode', exact: true })
    .selectOption('inherit_parent');
  await page.getByRole('combobox', { name: 'Timeline level', exact: true }).selectOption('3');
  await page.getByRole('button', { name: 'Add level', exact: true }).click();
  await page.getByRole('button', { name: 'Add feature at level 3', exact: true }).click();
  const level = page.getByRole('region', { name: 'Level 3', exact: true });
  await level.getByRole('textbox', { name: 'Feature name', exact: true }).fill('Durable Route');
  await level.getByRole('textbox', { name: 'Feature description', exact: true })
    .fill('This publication route survives reload.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await clearAnnouncements(page);
  await page.getByRole('button', { name: 'Publish subclass', exact: true }).click();
  await expectDurablePublish(page, {
    kind: 'subclass', name: 'U3 Durable Subclass', heading: 'Subclass published',
  });
}

test('publishing every authoring kind navigates to a reload-safe library result and deleted drafts recover', async ({
  page,
}) => {
  // Measured alone at 34.3s on port 4890. The x1.5 contention reserve is
  // 51.45s, rounded up to a 52s per-test hang guard.
  test.setTimeout(52_000);
  await installAnnouncementRecorder(page);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);

  const deletedSpeciesDraftUrl = await publishSpecies(page);
  await publishBackground(page);
  await publishSubclass(page);

  await clearAnnouncements(page);
  await page.goto(deletedSpeciesDraftUrl);
  await expect(page).toHaveURL(
    /\/homebrew\?tab=drafts&notice=draft-no-longer-exists$/u,
  );
  const missingHeading = page.getByRole('heading', {
    name: 'Draft no longer exists',
    exact: true,
  });
  await expect(missingHeading).toBeVisible();
  await expect(missingHeading).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Drafts', exact: true })).toBeVisible();
  await expectAnnouncement(page, 'Draft no longer exists. Homebrew library loaded.');
  await page.reload();
  await expect(missingHeading).toBeVisible();
  await expect(page.locator('.empty-shell')).toHaveCount(0);
});
