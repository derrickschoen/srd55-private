import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

const CHARACTER_NAME = 'Rowan Tablefighter';

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
}

test('a player builds, reviews, shares, and the DM imports and selects the character', async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);

  const guide = page.getByRole('link', { name: 'New player? Start here' });
  await expect(guide).toHaveAttribute('href', '/guides/player-build-and-share');
  await guide.click();
  await expect(
    page.getByRole('heading', { name: 'Build and share your 2024 character' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to characters' }).click();

  await page.getByRole('link', { name: 'Create a character' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a class' })).toBeVisible();
  await page.getByRole('button', { name: 'Fighter', exact: true }).click();
  await page.getByLabel('Character name').fill(CHARACTER_NAME);
  await page.getByRole('button', { name: 'Create character' }).click();

  await expect(page.getByRole('heading', { name: 'Set ability scores' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Standard array' })).toBeChecked();
  await page.getByRole('button', { name: 'Set ability scores' }).click();

  await expect(page.getByRole('heading', { name: 'Choose a species' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose Dwarf' }).click();

  await expect(page.getByRole('heading', { name: 'Choose a background' })).toBeVisible();
  await page.getByRole('radio', { name: 'Soldier' }).check();
  await page.getByRole('button', { name: 'Apply background' }).click();

  await expect(page.getByRole('heading', { name: 'Choose skills' })).toBeVisible();
  await page.getByLabel('Fighter skill 1').selectOption({ label: 'Perception' });
  await page.getByRole('button', { name: 'Choose Fighter skill 1' }).click();
  await expect(page.getByLabel('Fighter skill 1')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Choose skills' })).toBeFocused();
  await page.getByLabel('Fighter skill 2').selectOption({ label: 'Survival' });
  await expect(
    page.getByRole('button', { name: 'Choose Fighter skill 2' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Choose Fighter skill 2' }).click();

  await expect(
    page.getByRole('heading', { name: 'Confirm starting equipment' }),
  ).toBeVisible();
  const classPackage = page.locator('[data-equipment-source="class"]');
  await expect(
    classPackage.getByRole('heading', { name: /Class package — Fighter/u }),
  ).toBeVisible();
  await classPackage.getByRole('button', { name: 'Take option A' }).click();
  await expect(classPackage.getByText('Recorded: option A.')).toBeVisible();
  const backgroundPackage = page.locator('[data-equipment-source="background"]');
  await expect(
    backgroundPackage.getByRole('heading', { name: /Background package — Soldier/u }),
  ).toBeVisible();
  await backgroundPackage.getByRole('button', { name: 'Take this package' }).click();
  await expect(page.getByText(
    'Both equipment packages are recorded. Required Fighter choices remain before level 1 is complete.',
    { exact: true },
  )).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Required Fighter choices/u }),
  ).toBeVisible();

  await page.getByLabel('Fighting Style').selectOption({ label: 'Archery' });
  await expect(
    page.getByRole('button', { name: 'Choose Fighting Style' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Choose Fighting Style' }).click();
  await expect(page.getByText(
    'Fighting Style recorded: Archery — SRD · bundled layer',
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weapon Mastery' })).toBeVisible();
  for (const weapon of ['Flail', 'Greatsword', 'Javelin']) {
    await page.getByRole('button', { name: `Choose mastery: ${weapon}` }).click();
    await expect(
      page.getByRole('button', { name: `Remove mastery: ${weapon}` }),
    ).toBeVisible();
  }
  await expect(page.getByText(
    'Both equipment packages are recorded. Every guided level 1 step is complete. ' +
      'Check the character card or planner for choices outside this guided path.',
    { exact: true },
  )).toBeVisible();

  await page.getByRole('link', { name: 'Back to characters' }).click();
  await expect(page.getByRole('heading', { name: CHARACTER_NAME })).toBeVisible();
  await page.getByRole('link', { name: 'Open workspace' }).click();
  await page.getByRole('link', { name: 'Character sheet' }).click();
  await expect(
    page.getByRole('heading', { name: `Character sheet — ${CHARACTER_NAME}` }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open planner' })).toBeVisible();
  await page.getByRole('link', { name: 'All characters' }).click();

  await page.getByRole('button', {
    name: `Share ${CHARACTER_NAME} by link`,
  }).click();
  for (const label of [
    'Include warning acknowledgements',
    'Include loadouts',
    'Include my written text (alignment, appearance, backstory, notes)',
  ]) {
    await expect(page.getByLabel(label)).not.toBeChecked();
  }
  await page.getByRole('button', { name: 'Create share link' }).click();
  const generated = page.getByLabel('Generated character share link');
  await expect(generated).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
  const link = await generated.inputValue();

  const dmContext = await browser.newContext();
  try {
    const dm = await dmContext.newPage();
    await dm.goto(link);
    await ready(dm);
    await expect(dm.getByLabel('Shared character preview')).toBeVisible();
    await expect(dm.getByRole('heading', { name: CHARACTER_NAME })).toBeVisible();
    await dm.getByRole('button', { name: 'Add to my characters' }).click();
    await expect(dm.locator('.share-status')).toHaveText(
      `${CHARACTER_NAME} was added. Open character.`,
    );
    await expect(dm.getByRole('link', { name: 'Open character' })).toBeVisible();

    await dm.goto('/vtt');
    await dm.getByRole('link', {
      name: 'Compose a rules encounter from stored characters',
    }).click();
    await expect(
      dm.getByRole('heading', { name: 'Build an encounter from stored characters' }),
    ).toBeVisible();
    await expect(dm.getByRole('group', { name: 'Stored characters' })).toBeVisible();
    const partyMember = dm.getByRole('checkbox', {
      name: `${CHARACTER_NAME} — Fighter 1`,
    });
    await partyMember.check();
    await expect(partyMember).toBeChecked();
    await expect(dm.getByRole('button', { name: 'Start DM encounter' })).toBeVisible();
  } finally {
    await dmContext.close();
  }
});
