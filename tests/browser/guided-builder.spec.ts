import { expect, test, type Page } from '@playwright/test';
import { readGuidedSeam } from './fixtures/guided-seam';

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
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

test('the empty-database front door chooses class first, persists once named, and survives reload without a planner escape', async ({
  page,
}) => {
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

  await firstSelect.selectOption('athletics');
  await choices
    .first()
    .locator(`[${persistedSeam.skillFillAttribute}]`)
    .click();
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
    .selectOption('perception');
  await lastChoice
    .locator(`[${persistedSeam.skillFillAttribute}]`)
    .click();

  // E-B: every class ordinal is filled and the REAL equipment step renders —
  // the terminal "not built" panel for this step is retired.
  const equipmentPanel = page.locator(
    `[${persistedSeam.panelAttribute}="${persistedSeam.equipmentStepPanel}"]`,
  );
  await expect(equipmentPanel).toBeVisible();
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
  await expectNoPlannerRouteAnchors(page);
});
