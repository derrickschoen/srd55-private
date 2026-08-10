import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';
import { readGuidedSeam } from './fixtures/guided-seam';
import {
  announcedMessages,
  clearAnnouncements,
  installAnnouncementRecorder,
} from './fixtures/announcements';

async function ready(page: Page): Promise<void> {
  // The four-worker pool measured this file's slowest caller at 25.2s; 65s
  // gives this load-sensitive readiness wait at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

async function resetHome(page: Page): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);
}

async function expectNoPlannerRouteAnchors(page: Page): Promise<void> {
  const hrefs = await page.locator('a').evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href')),
  );
  for (const href of hrefs) {
    expect(href).not.toBeNull();
    if (href !== null) {
      const segments = new URL(href, page.url()).pathname
        .split('/')
        .filter((segment) => segment.length > 0);
      const matchesPlannerRoute =
        segments.length === 2 &&
        segments[0] === 'characters' &&
        /^\d+$/.test(segments[1] ?? '');
      expect(matchesPlannerRoute).toBe(false);
    }
  }
}

async function expectPhoneWidth(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
  }));
  expect(widths.innerWidth).toBe(390);
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.innerWidth);
}

async function expectHorizontallyContained(
  page: Page,
  control: Locator,
): Promise<void> {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
}

test('a phone-width guided journey keeps the first level 1 screens and controls usable', async ({
  page,
}) => {
  // The four-worker parallel pool measured 12.1s on Chromium at 390x844;
  // 35s preserves at least 2.5x wall-clock headroom under pool contention.
  test.setTimeout(35_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await resetHome(page);

  const seam = await readGuidedSeam(page);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await expect(
    page.locator(`[${seam.panelAttribute}="${seam.classChooserPanel}"]`),
  ).toBeVisible();
  await expectPhoneWidth(page);

  const fighter = page
    .locator('[data-class-option]')
    .filter({ hasText: 'Fighter' })
    .first();
  await expectHorizontallyContained(page, fighter);
  await fighter.click();

  const name = page.getByLabel('Character name');
  const create = page.getByRole('button', { name: 'Create character' });
  await expectHorizontallyContained(page, name);
  await expectHorizontallyContained(page, create);
  await expectPhoneWidth(page);
  await name.fill('Phone Hero');
  await create.click();

  const persisted = await page.evaluate(() =>
    window.staticApp.inspectRows('characters'),
  );
  const characterId = Number(persisted[0]?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const persistedSeam = await readGuidedSeam(page, characterId);
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.abilitiesStepPanel}"]`,
    ),
  ).toBeVisible();

  const manual = page.locator(
    `[${persistedSeam.abilityMethodAttribute}="manual"]`,
  );
  await expectHorizontallyContained(page, manual);
  await manual.check();
  const warning = page.locator(
    `[${persistedSeam.abilityWarningAttribute}="weak_scores"]`,
  );
  const abilitySubmit = page.locator(
    `[${persistedSeam.abilitySubmitAttribute}]`,
  );
  await expect(warning).toBeVisible();
  await expectHorizontallyContained(page, abilitySubmit);
  await expectPhoneWidth(page);
  await abilitySubmit.click();

  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.speciesStepPanel}"]`,
    ),
  ).toBeVisible();
  const dwarf = page.getByRole('button', { name: 'Choose Dwarf' });
  await expectHorizontallyContained(page, dwarf);
  await expectPhoneWidth(page);
  await dwarf.click();

  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.backgroundStepPanel}"]`,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Choose a background' }),
  ).toBeVisible();
  await expectPhoneWidth(page);
});

test('an unchosen Elf lineage stays non-gating while the sheet changes from UNKNOWN to its chosen High Elf cantrip', async ({
  page,
}) => {
  // Measured alone at 24.0s on Chromium; 24.0 × 1.5 = 36.0s.
  test.setTimeout(36_000);
  await installAnnouncementRecorder(page);
  await resetHome(page);

  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.getByRole('button', { name: /^Wizard\b/u }).click();
  await page.getByLabel('Character name').fill('Truthful Lineage Wizard');
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('button', { name: 'Set ability scores' }).click();
  await page.getByRole('button', { name: 'Choose Elf' }).click();

  const character = (
    await page.evaluate(() => window.staticApp.inspectRows('characters'))
  ).find((row) => row['name'] === 'Truthful Lineage Wizard');
  const characterId = Number(character?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  await expect(
    page.getByRole('heading', { name: 'Choose a background' }),
  ).toBeVisible();

  await page.goto(`/characters/${String(characterId)}/sheet`);
  await expect(page.locator('[data-screen="character-sheet"]')).toBeVisible();
  await expect(page.getByText('Walking speed', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Darkvision', { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-sheet-value="walking_speed_feet"]'))
    .toHaveText('UNKNOWN');
  await expect(page.locator('[data-sheet-value="lineage_darkvision"]'))
    .toHaveText('UNKNOWN');
  await expect(
    page.getByText('Elf — Elven Lineage not chosen', { exact: true }),
  ).toHaveCount(1);
  const displayedCantrip = page
    .locator('.sheet-spells dt')
    .filter({ hasText: /^Prestidigitation$/u });
  await expect(displayedCantrip).toHaveCount(0);

  const buildPath = `/characters/${String(characterId)}/build/levels/1`;
  await page.goto(buildPath);
  await expect(
    page.getByRole('heading', { name: 'Choose a background' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Species', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Review Elf choices' }),
  ).toBeVisible();
  await expect(page.getByText('Darkvision: 120 feet.', { exact: true }))
    .toBeVisible();
  await expect(
    page.getByText(
      'Dancing Lights · SRD · bundled layer at character level 1.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText('Speed: +5 feet — Wood Elf Speed.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Pass without Trace · SRD · bundled layer at character level 5.',
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Continue guided build' }).click();
  await expect(
    page.getByRole('heading', { name: 'Choose a background' }),
  ).toBeVisible();

  await page.goto(`/characters/${String(characterId)}`);
  const completeness = page.locator('.outstanding-panel');
  const remedy = completeness.getByRole('link', {
    name: 'Return to the guided Species step to review this required choice.',
  });
  await expect(remedy).toBeVisible();
  await remedy.click();
  await expect(
    page.getByRole('heading', { name: 'Review Elf choices' }),
  ).toBeVisible();

  await page.getByRole('radio', { name: 'High Elf', exact: true }).check();
  await page.getByLabel('Elven Lineage spellcasting ability')
    .selectOption('intelligence');
  const cantrip = page.getByRole('combobox', {
    name: 'High Elf cantrip',
  });
  await expect(page.locator('label').filter({ hasText: /^High Elf cantrip$/u }))
    .toBeVisible();
  await expect(cantrip).toHaveValue('Prestidigitation');
  await cantrip.fill('Mage Hand');
  await page.getByRole('option', { name: /^Mage Hand\b/u }).click();

  await clearAnnouncements(page);
  await page.getByRole('button', { name: 'Save Elven Lineage' }).click();
  const change = page.getByRole('button', { name: 'Change Elven Lineage' });
  await expect(change).toBeVisible();
  await expect(change).toBeFocused();
  await expect.poll(() => announcedMessages(page)).toContain(
    'High Elf selected for Elven Lineage.',
  );
  await expect(page.getByText('High Elf — Intelligence', { exact: true }))
    .toBeVisible();
  await expect(page.getByText('High Elf cantrip: Mage Hand', { exact: true }))
    .toBeVisible();

  await clearAnnouncements(page);
  await change.click();
  await expect(page.getByRole('radio', { name: 'Drow', exact: true }))
    .toBeFocused();
  await expect.poll(() => announcedMessages(page)).toContain(
    'Choose a replacement for High Elf.',
  );

  await page.goto(`/characters/${String(characterId)}/sheet`);
  await expect(page.locator('[data-screen="character-sheet"]')).toBeVisible();
  await expect(page.getByText('Walking speed', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Darkvision', { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-sheet-value="walking_speed_feet"]'))
    .toHaveText('30 feet');
  await expect(page.locator('[data-sheet-value="lineage_darkvision"]'))
    .toHaveText('60 feet');
  await expect(displayedCantrip).toHaveCount(0);
  await expect(
    page.locator('.sheet-spells dt').filter({ hasText: /^Mage Hand$/u }),
  ).toHaveCount(1);
  await expect(
    page.getByText('Elf — Elven Lineage not chosen', { exact: true }),
  ).toHaveCount(0);

  const facts = JSON.parse(
    (await page.locator('#character-sheet-facts').textContent()) ?? '{}',
  ) as Record<string, unknown>;
  expect(facts).toMatchObject({
    walking_speed_feet: 30,
    lineage_darkvision_feet: 60,
  });
});

test('Elf Wizard skills finish top to bottom and spell choices stay labelled and visible', async ({
  page,
}) => {
  // Measured alone at 11.9s on Chromium; this load-sensitive journey keeps a
  // 20s hang guard without changing shared Playwright configuration.
  test.setTimeout(20_000);
  await installAnnouncementRecorder(page);
  await resetHome(page);

  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.getByRole('button', { name: /^Wizard\b/u }).click();
  await page.getByLabel('Character name').fill('Visible Choice Wizard');
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('button', { name: 'Set ability scores' }).click();
  await page.getByRole('button', { name: 'Choose Elf' }).click();

  await page.getByRole('radio', { name: 'Sage' }).check();
  await page.getByLabel('Magic Initiate spell list').selectOption('Cleric');
  await page.getByRole('button', { name: 'Apply background' }).click();

  const skillLabels = page.locator('.guided-skill-choice-label span');
  await expect(skillLabels).toHaveText([
    'Elf Keen Senses skill',
    'Wizard skill 1',
    'Wizard skill 2',
  ]);
  await page
    .getByLabel('Elf Keen Senses skill')
    .selectOption({ label: 'Perception' });
  await page
    .getByRole('button', { name: 'Choose Elf Keen Senses skill' })
    .click();
  await expect(page.getByLabel('Elf Keen Senses skill')).toHaveCount(0);
  await page
    .getByLabel('Wizard skill 1')
    .selectOption({ label: 'Investigation' });
  await page
    .getByRole('button', { name: 'Choose Wizard skill 1' })
    .click();
  await expect(page.getByLabel('Wizard skill 1')).toHaveCount(0);
  await page
    .getByLabel('Wizard skill 2')
    .selectOption({ label: 'Medicine' });
  await page
    .getByRole('button', { name: 'Choose Wizard skill 2' })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Choose level 1 spells' }),
  ).toBeVisible();
  const pickers = page.getByRole('combobox');
  await expect(pickers).toHaveCount(16);
  await expect(page.getByText('Wizard cantrip 2 of 3', { exact: true }))
    .toBeVisible();
  await expect(
    page.getByText('Magic Initiate — Cleric cantrip 1 of 2', { exact: true }),
  ).toBeVisible();
  const pickerNames = await pickers.evaluateAll((controls) =>
    controls.map((control) => control.getAttribute('aria-label')),
  );
  expect(pickerNames).not.toContain('wizard-cantrips');
  expect(pickerNames).not.toContain('wizard-prepared');
  expect(pickerNames).not.toContain('magic-initiate-cantrips');

  await clearAnnouncements(page);
  const firstPicker = page.getByRole('combobox', {
    name: 'Wizard cantrip 1 of 3',
  });
  await firstPicker.fill('Mage Hand');
  await page.getByRole('option', { name: /^Mage Hand\b/u }).click();

  const summary = page.locator('.guided-spell-summary').filter({
    hasText: 'Mage Hand — Wizard cantrip 1 of 3',
  });
  await expect(summary).toBeVisible();
  await expect(pickers).toHaveCount(15);
  const change = summary.getByRole('button', { name: 'Change' });
  await expect(change).toBeFocused();
  await expect.poll(() => announcedMessages(page)).toContain(
    'Mage Hand selected for Wizard cantrip 1 of 3.',
  );

  await clearAnnouncements(page);
  await change.click();
  await expect(firstPicker).toBeVisible();
  await expect(firstPicker).toBeFocused();
  await expect.poll(() => announcedMessages(page)).toContain(
    'Choose a replacement for Mage Hand in Wizard cantrip 1 of 3.',
  );
});

test('the empty-database front door chooses class first, persists once named, and survives reload without a planner escape', async ({
  page,
}) => {
  // The four-worker parallel pool measured 25.2s; 65s preserves at least
  // 2.5x wall-clock headroom under parallel-pool contention.
  test.setTimeout(65_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await resetHome(page);

  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([]);

  const seam = await readGuidedSeam(page);
  const primaryAction = page.getByRole('link', {
    name: 'Create a character',
  });
  await expect(primaryAction).toHaveAttribute('href', seam.newRoute);

  const blankEscape = page.locator('details.advanced-create');
  await expect(blankEscape).not.toHaveAttribute('open', '');
  await expect(
    page.getByRole('button', { name: 'Create blank character' }),
  ).not.toBeVisible();
  await page
    .getByText('Advanced: create a blank character', { exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Create blank character' }),
  ).toBeVisible();
  await page
    .getByText('Advanced: create a blank character', { exact: true })
    .click();

  await primaryAction.click();
  await expect(page).toHaveURL(new URL(seam.newRoute, page.url()).href);
  await expect(
    page.locator(
      `[${seam.panelAttribute}="${seam.classChooserPanel}"]`,
    ),
  ).toBeVisible();
  await expectPhoneWidth(page);

  await expect(page.locator('input')).toHaveCount(0);
  await expectNoPlannerRouteAnchors(page);

  // FIGHTER, deliberately: the S-C exit is "a Fighter with a background that
  // grants two skills still owes two class choices", asserted end to end at
  // the bottom of this journey.
  const fighterCard = page
    .locator('[data-class-option]')
    .filter({ hasText: 'Fighter' })
    .first();
  await expect(fighterCard.locator('.guided-class-name')).not.toHaveText('');
  await expect(fighterCard.locator('.guided-class-hit-die')).toHaveText(
    /^Hit die: (?:d[1-9]\d*|unknown)$/,
  );
  await fighterCard.click();

  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([]);
  await expect(page.locator('input')).toHaveCount(1);
  await expectNoPlannerRouteAnchors(page);

  await page.getByLabel('Character name').fill('Front Door Hero');
  await page.getByRole('button', { name: 'Create character' }).click();

  const persisted = await page.evaluate(() =>
    window.staticApp.inspectRows('characters'),
  );
  expect(persisted).toEqual([
    expect.objectContaining({
      name: 'Front Door Hero',
      revision: 0,
    }),
  ]);
  const characterId = Number(persisted[0]?.['id']);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  const persistedSeam = await readGuidedSeam(page, characterId);
  if (persistedSeam.buildPath === null) {
    throw new Error('The guided seam returned no persisted build path.');
  }
  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.abilitiesStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectPhoneWidth(page);
  await expect(
    page.locator(
      `[${persistedSeam.abilityMethodAttribute}="standard_array"]`,
    ),
  ).toBeChecked();
  await expect(
    page.locator(`[${persistedSeam.abilityMethodAttribute}]`),
  ).toHaveCount(3);
  await expect(page.getByText('Roll in Order', { exact: false })).toHaveCount(0);

  await page.locator(
    `[${persistedSeam.abilityMethodAttribute}="manual"]`,
  ).check();
  const abilityInputs = page.locator(
    `[${persistedSeam.abilityInputAttribute}]`,
  );
  await expect(abilityInputs).toHaveCount(6);
  for (const input of await abilityInputs.all()) {
    await expect(input).toHaveValue('10');
  }
  await expect(
    page.locator(
      `[${persistedSeam.abilityWarningAttribute}="non_standard_method"]`,
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      `[${persistedSeam.abilityWarningAttribute}="weak_scores"]`,
    ),
  ).toBeVisible();
  const abilitySubmit = page.locator(
    `[${persistedSeam.abilitySubmitAttribute}]`,
  );
  await expect(abilitySubmit).toBeEnabled();
  await abilitySubmit.click();

  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.speciesStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectPhoneWidth(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: characterId,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      ability_allocation_method: 'manual',
      revision: 1,
    }),
  ]);
  await expectNoPlannerRouteAnchors(page);

  await page.reload();

  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.getByRole('heading', { name: 'Guided character builder' }),
  ).toBeVisible();
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.speciesStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      id: characterId,
      name: 'Front Door Hero',
      ability_allocation_method: 'manual',
      revision: 1,
    }),
  ]);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_class_levels'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
      level: 1,
      is_starting_class: 1,
    }),
  ]);

  const dwarf = page.getByRole('button', { name: 'Choose Dwarf' });
  await expect(dwarf).toBeVisible();
  await dwarf.click();

  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.backgroundStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectPhoneWidth(page);
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_species'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
    }),
  ]);
  expect(
    (
      await page.evaluate(() =>
        window.staticApp.inspectRows('character_species_traits'),
      )
    ).length,
  ).toBeGreaterThan(0);
  expect(
    (
      await page.evaluate(() =>
        window.staticApp.inspectRows('character_effects'),
      )
    ).length,
  ).toBeGreaterThan(0);

  await page.reload();
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.backgroundStepPanel}"]`,
    ),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);

  // B3's form: choose ACOLYTE (its two printed skills, Insight and Religion,
  // are the exit fixture's held skills — and Insight sits in the Fighter's
  // own pool, which is the plan's §3.3 worked case), keep the suggested
  // pairing the step prefills, and submit the one atomic apply.
  const acolyte = page
    .locator('.guided-background-choice')
    .filter({ hasText: 'Acolyte' })
    .locator('input');
  await expect(acolyte).toBeVisible();
  await acolyte.check();
  await page.locator('[data-background-submit]').click();

  await expect(page).toHaveURL(
    new URL(persistedSeam.buildPath, page.url()).href,
  );
  // S-C: the REAL skills step renders — the terminal "not built" panel for
  // this step is retired.
  const skillsPanel = page.locator(
    `[${persistedSeam.panelAttribute}="${persistedSeam.skillsStepPanel}"]`,
  );
  await expect(skillsPanel).toBeVisible();
  await expectPhoneWidth(page);
  await expectNoPlannerRouteAnchors(page);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_background'),
    ),
  ).toEqual([
    expect.objectContaining({
      character_id: characterId,
    }),
  ]);

  // THE EXIT (plan §5, dispatch S-C): the background handed this Fighter two
  // skills — shown as ALREADY GRANTED — and the Fighter STILL owes exactly
  // two class choices. A count-based step would have advanced right past
  // this panel.
  const granted = page.locator(`[${persistedSeam.skillGrantedAttribute}]`);
  await expect(granted).toHaveCount(2);
  const choices = page.locator(`[${persistedSeam.skillChoiceAttribute}]`);
  await expect(choices).toHaveCount(2);
  // §3.3's worked case: Insight is held (Acolyte), so the first ordinal's
  // list offers 8 of the Fighter's 9 — Insight gone because it is already
  // held, Religion never in the pool.
  const firstSelect = choices
    .first()
    .locator(`[${persistedSeam.skillSelectAttribute}]`);
  const firstOptions = await firstSelect.locator('option').allTextContents();
  expect(firstOptions).toHaveLength(9); // placeholder + 8 available
  expect(firstOptions).not.toContain('Insight');
  expect(firstOptions).not.toContain('Religion');
  expect(firstOptions).toContain('Athletics');

  await firstSelect.focus();
  await page.keyboard.type('Athletics');
  await choices
    .first()
    .locator(`[${persistedSeam.skillFillAttribute}]`)
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Choose skills' })).toBeFocused();
  await expect(granted).toHaveCount(3);
  await expect(choices).toHaveCount(1);

  // A reload re-derives the same step from the database: one class ordinal
  // is still unfilled, so the step holds.
  await page.reload();
  await expect(skillsPanel).toBeVisible();
  await expect(
    page.locator(`[${persistedSeam.skillChoiceAttribute}]`),
  ).toHaveCount(1);
  await expectNoPlannerRouteAnchors(page);

  const lastChoice = page
    .locator(`[${persistedSeam.skillChoiceAttribute}]`)
    .first();
  await lastChoice
    .locator(`[${persistedSeam.skillSelectAttribute}]`)
    .focus();
  await page.keyboard.type('Perception');
  await lastChoice
    .locator(`[${persistedSeam.skillFillAttribute}]`)
    .focus();
  await page.keyboard.press('Enter');

  // GF-2: Acolyte's default Magic Initiate (Cleric) choices are part of the
  // guided journey, using the same search and durable assignment path as the
  // planner.
  await expect(
    page.getByRole('heading', { name: 'Choose level 1 spells' }),
  ).toBeVisible();
  await expectPhoneWidth(page);
  const cantrips = ['Guidance', 'Light'];
  const levelOne = ['Bless'];
  while (
    await page
      .getByRole('heading', { name: 'Choose level 1 spells' })
      .isVisible()
      .catch(() => false)
  ) {
    const pickers = page.getByRole('combobox');
    const count = await pickers.count();
    const picker = pickers.first();
    const label = await picker.getAttribute('aria-label');
    const search =
      label?.includes('cantrip') === true
        ? cantrips.shift()
        : levelOne.shift();
    if (search === undefined) {
      throw new Error(`No guided spell remains for ${label ?? 'choice'}.`);
    }
    const pickerOptions = picker.locator('..').locator('[role="listbox"] [role="option"]');
    await picker.focus();
    await expect.poll(() =>
      pickerOptions.allTextContents()
    ).not.toEqual([]);
    const initialSpellOptions = await pickerOptions.allTextContents();
    await page.keyboard.type(search);
    await expect.poll(() => pickerOptions.allTextContents())
      .not.toEqual(initialSpellOptions);
    const option = page.getByRole('option', {
      name: new RegExp(`^${search}\\b`),
    });
    await expect(option).toBeVisible();
    await expect(option).toHaveAccessibleDescription(/SRD · bundled layer/u);
    const optionIndex = await pickerOptions.allTextContents()
      .then((options) => options.findIndex((optionText) => optionText.startsWith(search)));
    expect(optionIndex).toBeGreaterThanOrEqual(0);
    for (let optionNumber = 0; optionNumber < optionIndex; optionNumber += 1) {
      await page.keyboard.press('ArrowDown');
    }
    await page.keyboard.press('Enter');
    await expect(pickers).toHaveCount(count - 1);
    if (count === 1) {
      await expect(
        page.getByRole('heading', { name: 'Confirm starting equipment' }),
      ).toBeFocused();
    } else {
      await expect(
        page.locator('.guided-spell-summary')
          .filter({ hasText: search })
          .getByRole('button', { name: 'Change' }),
      ).toBeFocused();
    }
  }

  // E-B: every class ordinal is filled and the REAL equipment step renders —
  // the terminal "not built" panel for this step is retired.
  const equipmentPanel = page.locator(
    `[${persistedSeam.panelAttribute}="${persistedSeam.equipmentStepPanel}"]`,
  );
  await expect(equipmentPanel).toBeVisible();
  await expectPhoneWidth(page);
  await expectNoPlannerRouteAnchors(page);

  // FIGHTER IS THE ONLY CLASS WITH A REAL CHOICE (§0c): options A and B are
  // offered, the gold-only C is suppressed, and the Acolyte background has
  // exactly its option A — its "50 GP" option B is suppressed too.
  const classSection = page.locator(
    `[${persistedSeam.equipmentSourceAttribute}="class"]`,
  );
  await expect(
    classSection.locator(`[${persistedSeam.equipmentOptionAttribute}]`),
  ).toHaveCount(2);
  const backgroundSection = page.locator(
    `[${persistedSeam.equipmentSourceAttribute}="background"]`,
  );
  await expect(
    backgroundSection.locator(`[${persistedSeam.equipmentOptionAttribute}]`),
  ).toHaveCount(1);

  // NO GOLD ANYWHERE ON THE STEP (D56): the seeded coin lines — Fighter A's
  // "4 GP", B's "11 GP", the Acolyte's "50 GP" — never render, while the
  // package's GEAR does (displayed, never owned — D65).
  const equipmentText = await equipmentPanel.textContent();
  expect(equipmentText).not.toBeNull();
  expect(equipmentText).not.toMatch(/\d+\s+GP/);
  expect(equipmentText).toContain('Dungeoneer’s Pack');
  expect(equipmentText).toContain('not tracked individually');

  // Confirm Fighter option A. The mint writes PLAIN rows (D69: no
  // provenance stamp) — the proof is the rows themselves, on disk.
  await classSection
    .locator(`[${persistedSeam.equipmentChooseAttribute}="a"]`)
    .click();
  await expect(
    page.locator(`[${persistedSeam.equipmentRecordedAttribute}="a"]`),
  ).toBeVisible();
  const mintedWeapons = (await page.evaluate(() =>
    window.staticApp.inspectRows('character_weapons'),
  )) as ReadonlyArray<Record<string, unknown>>;
  expect(mintedWeapons.map((row) => row['name']).sort()).toEqual([
    'Flail',
    'Greatsword',
    ...Array.from({ length: 8 }, () => 'Javelin'),
  ].sort());
  expect(
    (await page.evaluate(() =>
      window.staticApp.inspectRows('character_armor'),
    )) as ReadonlyArray<Record<string, unknown>>,
  ).toEqual([
    expect.objectContaining({
      name: 'Chain Mail',
      slot: 'worn',
    }),
  ]);

  // One source alone is not completeness (§3): both are required.
  await expect(
    page.locator(`[${persistedSeam.equipmentCompleteAttribute}]`),
  ).toHaveCount(0);

  // Confirm the Acolyte package. Its option A carries no weapon or armour,
  // so it mints nothing and ONLY records the choice — and the whole level 1
  // journey is complete.
  await backgroundSection
    .locator(`[${persistedSeam.equipmentChooseAttribute}="a"]`)
    .click();
  await expect(
    page.locator(`[${persistedSeam.equipmentCompleteAttribute}]`),
  ).toBeVisible();
  await expectNoPlannerRouteAnchors(page);

  // D116's one-time hint is tied to this exact terminal read state. It is an
  // inline hint, not a condition-bound warning or modal, and both actions are
  // ordinary labelled buttons reachable by keyboard.
  const backupHint = page.locator('[data-backup-hint]');
  await expect(backupHint).toBeVisible();
  await expect(backupHint).toContainText(
    'characters live only in this browser — download a backup',
  );
  await expect(
    backupHint.getByRole('button', { name: 'Download a backup' }),
  ).toBeVisible();
  await backupHint
    .getByRole('button', { name: 'Dismiss backup hint' })
    .click();
  await expect(backupHint).toBeHidden();

  // The provenance is on disk, per grant: two FILLED background grants under
  // the background's source, two FILLED class grants under the Fighter's —
  // and the projection derived all four.
  const grants = (await page.evaluate(() =>
    window.staticApp.inspectRows('character_skill_grants'),
  )) as ReadonlyArray<Record<string, unknown>>;
  expect(grants).toHaveLength(4);
  expect(
    grants.map((row) => [row['grant_key'], row['skill'], row['state']]).sort(),
  ).toEqual([
    ['background_skill', 'insight', 'active'],
    ['background_skill', 'religion', 'active'],
    ['class_skill', 'athletics', 'active'],
    ['class_skill', 'perception', 'active'],
  ]);
  expect(
    (
      (await page.evaluate(() =>
        window.staticApp.inspectRows('character_skill_proficiencies'),
      )) as ReadonlyArray<Record<string, unknown>>
    )
      .map((row) => row['skill'])
      .sort(),
  ).toEqual(['athletics', 'insight', 'perception', 'religion']);

  // A reload re-derives from the database alone: the finished character
  // rests on the equipment step with both choices shown as recorded.
  await page.reload();
  await expect(
    page.locator(
      `[${persistedSeam.panelAttribute}="${persistedSeam.equipmentStepPanel}"]`,
    ),
  ).toBeVisible();
  await expect(
    page.locator(`[${persistedSeam.equipmentRecordedAttribute}]`),
  ).toHaveCount(2);
  await expect(
    page.locator(`[${persistedSeam.equipmentCompleteAttribute}]`),
  ).toBeVisible();
  await expect(page.locator('[data-backup-hint]')).toHaveCount(0);
  await expectNoPlannerRouteAnchors(page);
});

test('the guided Rogue expertise disclosure is keyboard-associated and keeps route focus', async ({
  page,
}) => {
  // Measured alone after implementation; 65s matches the guided route's
  // established load-sensitive envelope.
  test.setTimeout(65_000);
  await resetHome(page);

  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.getByRole('button', { name: /^Rogue\b/u }).click();
  await page.getByLabel('Character name').fill('Keyboard Rogue');
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('button', { name: 'Set ability scores' }).click();
  await page.getByRole('button', { name: 'Choose Dwarf' }).click();
  await page.getByRole('radio', { name: 'Criminal' }).check();
  await page.getByRole('button', { name: 'Apply background' }).click();

  await expect(page.getByRole('heading', { name: 'Choose skills' })).toBeFocused();
  while (await page.getByRole('heading', { name: 'Choose skills' }).isVisible()) {
    const allChoices = page.locator('[data-skill-choice]');
    const choiceCount = await allChoices.count();
    const choice = allChoices.first();
    const select = choice.locator('[data-skill-select]');
    await expect(select).toHaveAccessibleDescription('SRD · bundled layer');
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await choice.locator('[data-skill-fill]').focus();
    await page.keyboard.press('Enter');
    await expect(allChoices).toHaveCount(choiceCount - 1);
  }

  const heading = page.getByRole('heading', { name: 'Choose Expertise' });
  await expect(heading).toBeFocused();
  const choices = page.locator('.guided-expertise-choice');
  const count = await choices.count();
  expect(count).toBeGreaterThan(0);
  const first = choices.first();
  const expertise = first.getByRole('combobox');
  await expect(expertise).toHaveAccessibleDescription('SRD · bundled layer');
  await expertise.focus();
  await page.keyboard.press('ArrowDown');
  await first.getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(choices).toHaveCount(count - 1);
  await expect(heading).toBeFocused();
});
