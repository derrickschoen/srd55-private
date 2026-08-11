import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CharacterRow {
  readonly id: number;
  readonly revision: number;
}

const HOSTILE_SUBCLASS_NAME =
  '<img data-s4-share-hostile src=x onerror=window.s4Xss=1> S4 Subclass';

async function ready(page: Page): Promise<void> {
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
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

test('authors a subclass timeline, preserves threshold effects, and previews its inert name', async ({
  browser,
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5080 at 20.6s after adding the recipient
  // hostile-name preview (x1.5 = 30.9s); the picker-round measurement on 5090
  // was 15.4s (x1.5 = 23.1s). The merged spec carries both additions, so the
  // larger reserve governs.
  test.setTimeout(30_900);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);

  await page.getByRole('link', { name: 'Homebrew library' }).click();
  await page.getByRole('tab', { name: 'Subclasses' }).click();
  await page.getByRole('button', { name: 'New subclass' }).click();
  await expect(page.getByLabel('Subclass authoring form')).toBeVisible();

  await page.getByLabel('Name').fill(HOSTILE_SUBCLASS_NAME);
  await page.getByLabel('Rules edition').selectOption('expanded');
  await page.getByLabel('Parent bundled class').selectOption({
    label: 'Fighter',
  });
  await page.getByLabel('Progression mode').selectOption('override');
  await page.getByLabel('Spellcasting ability (optional)').selectOption('intelligence');
  await page.getByLabel('Caster contribution').selectOption('third_down');
  await expect(page.getByLabel('Levels 1 through 20 spellcasting progression grid'))
    .toContainText('Class levels 1–20 — unchanged run; expand to edit');
  await page.getByText('Class levels 1–20 — unchanged run; expand to edit').click();
  const levelThreeProgression = page.getByRole('group', {
    name: 'Class level 3 progression',
  });
  await levelThreeProgression.getByRole('button', { name: 'Add spell grant' }).click();
  const spellGrant = levelThreeProgression.getByRole('group', {
    name: 'Spell grant 1 at class level 3',
  });
  const spellPicker = spellGrant.getByLabel('Spell', { exact: true });
  await expect(spellPicker.locator('optgroup').first()).toHaveAttribute(
    'label', /SRD · bundled layer/u,
  );
  await spellPicker.selectOption({ label: 'Light' });
  await expect(spellGrant.getByLabel('Stable grant label')).toHaveValue('fixed-light');
  await page.getByText('Class levels 4–20 — unchanged run; expand to edit').click();
  const levelTwentyProgression = page.getByRole('group', { name: 'Class level 20 progression' });
  await levelTwentyProgression.getByLabel('Cantrips known').fill('1');

  await page.getByLabel('Timeline level').selectOption('3');
  await page.getByRole('button', { name: 'Add level' }).click();
  await page.getByRole('button', { name: 'Add feature at level 3' }).click();
  const levelThree = page.getByRole('region', { name: 'Level 3', exact: true });
  await levelThree.getByLabel('Feature name').fill('Threshold Ward');
  await levelThree.getByLabel('Feature description').fill('The ward becomes mechanical at Fighter level 3.');
  await levelThree.getByRole('button', { name: 'Add effect' }).click();
  const armor = levelThree.locator('.authoring-effect-card').first();
  await armor.getByLabel('Label').fill('Threshold armor');
  await armor.getByLabel('Amount').fill('2');
  await levelThree.getByRole('button', { name: 'Add effect' }).click();
  const hitPoints = levelThree.locator('.authoring-effect-card').nth(1);
  await hitPoints.getByLabel('Effect kind').selectOption('hp_modifier');
  await hitPoints.getByLabel('Label').fill('Threshold vitality');
  await hitPoints.getByLabel('Flat hit points').fill('3');

  await page.getByLabel('Timeline level').selectOption('6');
  await page.getByRole('button', { name: 'Add level' }).click();
  await page.getByRole('button', { name: 'Add feature at level 6' }).click();
  const levelSix = page.getByRole('region', { name: 'Level 6', exact: true });
  await levelSix.getByLabel('Feature name').fill('Later Ward');
  await levelSix.getByLabel('Feature description').fill('This later mechanic must not exist at Fighter level 3.');
  await levelSix.getByRole('button', { name: 'Add effect' }).click();
  const later = levelSix.locator('.authoring-effect-card').first();
  await later.getByLabel('Label').fill('Later armor');
  await later.getByLabel('Amount').fill('5');

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.locator('.subclass-authoring-status')).toContainText('Saved revision 1.');
  await page.getByRole('button', { name: 'Preview publish' }).click();
  await expect(page.getByRole('heading', { name: 'Publish preview' })).toBeVisible();
  await expect(page.getByLabel('Subclass feature preview')).toContainText('Threshold Ward');
  await expect(page.getByLabel('Subclass feature preview')).toContainText('Later Ward');
  await page.getByRole('button', { name: 'Publish subclass' }).click();
  await expect(page.getByRole('heading', { name: 'Subclass published' })).toBeVisible();
  await page.getByRole('link', { name: 'View subclass library' }).click();
  const publishedCard = page.locator('.homebrew-card').filter({
    hasText: HOSTILE_SUBCLASS_NAME,
  });
  await expect(publishedCard.getByRole('heading', {
    name: HOSTILE_SUBCLASS_NAME,
  })).toBeVisible();
  await expect(publishedCard).toContainText('Subclass · read-only published version');

  const journey = await page.evaluate(async (subclassName) => {
    const classes = await window.staticApp.inspectRows('class_definitions', { name: 'Fighter' });
    const fighterId = Number(classes[0]?.['id']);
    const subclasses = await window.staticApp.inspectRows(
      'subclass_definitions',
      { name: subclassName },
    );
    const subclassId = Number(subclasses[0]?.['id']);
    const subclassKey = String(subclasses[0]?.['content_key']);
    if (!Number.isSafeInteger(fighterId) || !Number.isSafeInteger(subclassId)) {
      throw new Error('Published Fighter subclass was not persisted.');
    }
    const levelTwentyProgressions = await window.staticApp.inspectRows(
      'subclass_progressions',
      { subclass_definition_id: subclassId, class_level: 20 },
    );
    const options = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly name: string; readonly content_key: string }[]
    >('queries.characters.guidedClassOptions', {});
    const fighter = options.find((candidate) => candidate.name === 'Fighter');
    if (fighter === undefined) throw new Error('Bundled Fighter option is missing.');
    const character = await window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      CharacterRow
    >('queries.characters.createGuided', {
      name: 'Threshold Journey Hero',
      class_content_key: fighter.content_key,
    });
    await window.appRpc.call('queries.characters.allocateAbilities', {
      character_id: character.id,
      method: 'manual',
      scores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: character.revision,
    });
    const allocated = await window.appRpc.call<
      { readonly character_id: number },
      CharacterRow
    >('queries.characters.get', { character_id: character.id });
    await window.appRpc.call('commands.execute', {
      character_id: character.id,
      operation_uuid: crypto.randomUUID(),
      expected_revision: allocated.revision,
      command: {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 2,
      },
    });
    const afterLevelTwo = await window.staticApp.inspectRows(
      'character_effects',
      { character_id: character.id },
    );
    const levelTwoCharacter = await window.staticApp.inspectRows('characters', { id: character.id });
    const revisionTwo = Number(levelTwoCharacter[0]?.['revision']);
    await window.appRpc.call('commands.execute', {
      character_id: character.id,
      operation_uuid: crypto.randomUUID(),
      expected_revision: revisionTwo,
      command: {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 3,
        subclass_content_key: subclassKey,
      },
    });
    const afterLevelThree = await window.staticApp.inspectRows(
      'character_effects',
      { character_id: character.id },
    );
    const classLevels = await window.staticApp.inspectRows(
      'character_class_levels',
      { character_id: character.id },
    );
    const spellSlots = await window.staticApp.inspectRows(
      'spell_selection_slots',
      { character_id: character.id, rule_key: 'fixed-light' },
    );
    const sheet = await window.appRpc.call<
      { readonly character_id: number },
      {
        readonly armor_class: {
          readonly bonuses: readonly { readonly label: string; readonly amount: number }[];
        };
      }
    >('queries.characters.sheet', { character_id: character.id });
    return {
      characterId: character.id,
      subclassId,
      subclassKey,
      levelTwentyCantrips: Number(levelTwentyProgressions[0]?.['cantrips_known']),
      afterLevelTwo,
      afterLevelThree,
      classLevels,
      spellSlots,
      armorBonuses: sheet.armor_class.bonuses,
    };
  }, HOSTILE_SUBCLASS_NAME);

  expect(journey.afterLevelTwo).toEqual([]);
  expect(journey.levelTwentyCantrips).toBe(1);
  expect(journey.classLevels).toEqual([
    expect.objectContaining({
      character_id: journey.characterId,
      class_definition_id: expect.any(Number),
      level: 3,
      subclass_definition_id: journey.subclassId,
    }),
  ]);
  expect(journey.afterLevelThree).toEqual([
    expect.objectContaining({
      character_id: journey.characterId,
      effect_kind: 'armor_class_bonus',
      amount: 2,
      label: 'Threshold armor',
      template_ref: expect.stringMatching(/^subclass_feature_effects:/u),
    }),
    expect.objectContaining({
      character_id: journey.characterId,
      effect_kind: 'hp_modifier',
      hit_points_flat: 3,
      label: 'Threshold vitality',
      template_ref: expect.stringMatching(/^subclass_feature_effects:/u),
    }),
  ]);
  expect(journey.spellSlots).toEqual([
    expect.objectContaining({
      character_id: journey.characterId,
      rule_key: 'fixed-light',
      selection_eligibility: 'valid',
    }),
  ]);
  expect(journey.afterLevelThree).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Later armor' }),
  ]));
  expect(journey.armorBonuses).toEqual(expect.arrayContaining([
    expect.objectContaining({ label: 'Threshold armor', amount: 2 }),
  ]));

  // The boot shell's #status is replaced by the mounted route. Homebrew owns
  // its readiness signal through the loaded status and settled tab panel.
  await page.reload();
  await homebrewReady(page);
  expect(await page.evaluate((characterId) => window.staticApp.inspectRows(
    'character_effects',
    { character_id: characterId },
  ), journey.characterId)).toEqual(journey.afterLevelThree);

  await page.getByRole('link', { name: '← Characters' }).click();
  await ready(page);
  await page.getByRole('button', {
    name: 'Share Threshold Journey Hero by link',
  }).click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  const link = await output.inputValue();

  const recipientProfile = await browser.newContext();
  try {
    const recipient = await recipientProfile.newPage();
    await recipient.goto(link);
    await ready(recipient);
    await expect(recipient.locator('.share-preview-classes')).toHaveText(
      `Fighter / ${HOSTILE_SUBCLASS_NAME} 3`,
    );
    await expect(recipient.locator('.share-preview-layers')).toHaveText(
      `Fighter — SRD · bundled layer / ${HOSTILE_SUBCLASS_NAME} — ` +
      'Homebrew · external layer',
    );
    await expect(recipient.locator('.share-preview')).not.toContainText(
      '2024:class:fighter',
    );
    await expect(recipient.locator('.share-preview')).not.toContainText(
      journey.subclassKey,
    );
    await expect(recipient.locator('[data-s4-share-hostile]')).toHaveCount(0);
    await expect(recipient.getByRole('region', {
      name: 'Embedded external content',
    }).getByRole('listitem').filter({ hasText: HOSTILE_SUBCLASS_NAME }))
      .toHaveText(
        `${HOSTILE_SUBCLASS_NAME} — subclass — Homebrew · external layer`,
      );
  } finally {
    await recipientProfile.close();
  }
});
