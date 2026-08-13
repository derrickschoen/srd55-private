import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CharacterRow {
  readonly id: number;
  readonly revision: number;
}

interface CommandResult {
  readonly revision: number;
}

interface BuildReportResult {
  readonly caster: {
    readonly caster_level: number;
    readonly slots: readonly { readonly level: number; readonly count: number }[];
  };
}

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
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function openTransferPanel(page: Page): Promise<void> {
  const panel = page.locator('details.transfer-panel');
  if (await panel.getAttribute('open') === null) {
    await panel.locator('summary').click();
  }
  await expect(panel).toHaveAttribute('open', '');
}

async function importBundledHomebrew(
  page: Page,
  expectedSummary: string,
): Promise<void> {
  await openTransferPanel(page);
  const trigger = page.getByRole('button', {
    name: 'Import bundled homebrew',
    exact: true,
  });
  await trigger.click();
  await expect(trigger).toBeDisabled();
  const dialog = page.getByRole('dialog', {
    name: 'Review content import',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('region', {
    name: 'Bundled homebrew entries',
    exact: true,
  })).toContainText('external homebrew');
  await dialog.getByRole('button', {
    name: 'Import with these choices',
    exact: true,
  }).click();
  await expect(page.locator('.transfer-status')).toHaveText(expectedSummary);
  await expect(trigger).toBeEnabled();
}

function publishedCard(page: Page, name: string) {
  return page.getByRole('article').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
}

test('imports bundled homebrew through publish, applies derived third-caster slots, and repeats as a no-op', async ({
  page,
}) => {
  // Measured alone at 23.5s after adding both picker controls; 60s retains
  // more than the required x1.5 contention headroom.
  test.setTimeout(60_000);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);

  await importBundledHomebrew(
    page,
    'Bundled homebrew imported: 3 added to your library, 0 matched existing.',
  );

  await page.getByRole('link', { name: 'Homebrew library', exact: true }).click();
  await page.getByRole('tab', { name: 'Subclasses', exact: true }).click();
  await homebrewReady(page);
  for (const [name, versionCount] of [
    ['Veteran (Bundled revision 3)', 3],
    ['Warrior of the Barbed Court (Bundled revision 4)', 4],
    ['Spell Student (Bundled revision 2)', 2],
  ] as const) {
    const card = publishedCard(page, name);
    await expect(card).toBeVisible();
    await expect(card.getByText('Homebrew', { exact: true })).toBeVisible();
    await expect(card.getByText('Subclass · Built into the app', { exact: true }))
      .toBeVisible();
    await expect(card.getByText(
      `${String(versionCount)} versions · 0 character attachments`,
      { exact: true },
    )).toBeVisible();
    await expect(card).toContainText(`History — ${String(versionCount)} versions`);
  }
  await expect(page.locator('.homebrew-grid > .homebrew-card')).toHaveCount(3);

  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
  await page.getByRole('link', { name: 'Create a character', exact: true }).click();
  await page.getByRole('button', { name: 'Fighter', exact: true }).click();
  await page.getByRole('textbox', { name: 'Character name', exact: true })
    .fill('Bundled Spell Student');
  await page.getByRole('button', { name: 'Create character', exact: true }).click();

  const persisted = await page.evaluate(async () => {
    const characters = await window.staticApp.inspectRows('characters', {
      name: 'Bundled Spell Student',
    });
    const characterId = Number(characters[0]?.['id']);
    const revision = Number(characters[0]?.['revision']);
    const classes = await window.staticApp.inspectRows('class_definitions', { name: 'Fighter' });
    const subclasses = await window.staticApp.inspectRows(
      'subclass_definitions',
      { name: 'Spell Student (Bundled revision 2)' },
    );
    const classId = Number(classes[0]?.['id']);
    const subclassId = Number(subclasses[0]?.['id']);
    const subclassKey = String(subclasses[0]?.['content_key']);
    if (
      !Number.isSafeInteger(characterId) ||
      !Number.isSafeInteger(revision) ||
      !Number.isSafeInteger(classId) ||
      !Number.isSafeInteger(subclassId)
    ) {
      throw new Error('The imported Spell Student character inputs were not persisted.');
    }
    await window.appRpc.call('queries.characters.allocateAbilities', {
      character_id: characterId,
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
      expected_revision: revision,
    });
    const allocated = await window.appRpc.call<
      { readonly character_id: number },
      CharacterRow
    >('queries.characters.get', { character_id: characterId });
    const afterTwo = await window.appRpc.call<
      {
        readonly character_id: number;
        readonly operation_uuid: string;
        readonly expected_revision: number;
        readonly command: {
          readonly type: 'level_up_class';
          readonly class_definition_id: number;
          readonly target_level: 2;
        };
      },
      CharacterRow
    >('commands.execute', {
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: allocated.revision,
      command: {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 2,
      },
    });
    await window.appRpc.call('commands.execute', {
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: afterTwo.revision,
      command: {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 3,
        subclass_content_key: subclassKey,
      },
    });
    const report = await window.appRpc.call<
      { readonly character_id: number },
      BuildReportResult
    >('queries.reports.build', { character_id: characterId });
    const classRows = await window.staticApp.inspectRows('character_class_levels', {
      character_id: characterId,
    });
    const choiceSlots = (await window.staticApp.inspectRows('spell_selection_slots', {
      character_id: characterId,
    })).filter((slot) => String(slot.rule_key).startsWith('spell-student-'))
      .sort((left, right) => String(left.rule_key).localeCompare(String(right.rule_key)));
    return { characterId, subclassId, report, classRows, choiceSlots };
  });

  expect(persisted.classRows).toEqual([
    expect.objectContaining({
      character_id: persisted.characterId,
      level: 3,
      subclass_definition_id: persisted.subclassId,
    }),
  ]);
  expect(persisted.report.caster).toMatchObject({
    caster_level: 1,
    slots: [{ level: 1, count: 2 }],
  });
  expect(persisted.choiceSlots).toEqual([expect.objectContaining({
    rule_key: 'spell-student-cantrips',
    spell_level_min: 0,
    spell_level_max: 0,
  }), expect.objectContaining({
    rule_key: 'spell-student-spells',
    spell_level_min: 1,
    spell_level_max: 1,
  })]);

  await page.goto(`/characters/${String(persisted.characterId)}`);
  await expect(page.getByRole('heading', { name: 'Bundled Spell Student', exact: true }))
    .toBeVisible();
  const cantripSlotId = Number(persisted.choiceSlots[0]?.['id']);
  const leveledSlotId = Number(persisted.choiceSlots[1]?.['id']);
  const cantripRow = page.locator(`tr[data-slot-id="${String(cantripSlotId)}"]`);
  const leveledRow = page.locator(`tr[data-slot-id="${String(leveledSlotId)}"]`);
  await expect(cantripRow).toContainText('L0–0');
  await expect(leveledRow).toContainText('L1–1');

  const cantripPicker = cantripRow.getByLabel(`Spell selection for slot ${String(cantripSlotId)}`);
  await cantripPicker.fill('Shield');
  await expect(cantripRow.getByText('No eligible spells match this search.', { exact: true }))
    .toBeVisible();
  await expect(cantripRow.getByRole('option', { name: 'Shield', exact: true })).toHaveCount(0);
  await cantripPicker.fill('Mage Hand');
  await cantripRow.getByRole('option', { name: 'Mage Hand', exact: true }).click();

  const leveledPicker = leveledRow.getByLabel(`Spell selection for slot ${String(leveledSlotId)}`);
  await leveledPicker.fill('Mage Hand');
  await expect(leveledRow.getByText('No eligible spells match this search.', { exact: true }))
    .toBeVisible();
  await expect(leveledRow.getByRole('option', { name: 'Mage Hand', exact: true })).toHaveCount(0);
  await leveledPicker.fill('Shield');
  await leveledRow.getByRole('option', { name: 'Shield', exact: true }).click();
  await expect.poll(() => page.evaluate((ids) =>
    window.staticApp.inspectRows('spell_selection_slots').then((slots) => slots
      .filter((slot) => ids.includes(Number(slot.id)))
      .sort((left, right) => String(left.rule_key).localeCompare(String(right.rule_key)))
      .map((slot) => ({
        rule_key: slot.rule_key,
        spell_level_min: slot.spell_level_min,
        spell_level_max: slot.spell_level_max,
        selection_eligibility: slot.selection_eligibility,
      }))), [cantripSlotId, leveledSlotId])).toEqual([{
        rule_key: 'spell-student-cantrips',
        spell_level_min: 0,
        spell_level_max: 0,
        selection_eligibility: 'valid',
      }, {
        rule_key: 'spell-student-spells',
        spell_level_min: 1,
        spell_level_max: 1,
        selection_eligibility: 'valid',
      }]);

  await page.goto('/');
  await globalReady(page);
  await importBundledHomebrew(
    page,
    'Bundled homebrew imported: 0 added to your library, 3 matched existing.',
  );

  await page.getByRole('link', { name: 'Homebrew library', exact: true }).click();
  await page.getByRole('tab', { name: 'Subclasses', exact: true }).click();
  await homebrewReady(page);
  await page.reload();
  await homebrewReady(page);
  for (const name of [
    'Veteran (Bundled revision 3)',
    'Warrior of the Barbed Court (Bundled revision 4)',
    'Spell Student (Bundled revision 2)',
  ]) {
    await expect(publishedCard(page, name)).toBeVisible();
  }
  await expect(page.locator('.homebrew-grid > .homebrew-card')).toHaveCount(3);
  expect(await page.evaluate((characterId) => window.staticApp.inspectRows(
    'character_class_levels',
    { character_id: characterId },
  ), persisted.characterId)).toEqual(persisted.classRows);
  const reloadedReport = await page.evaluate(
    (characterId) => window.appRpc.call<
      { readonly character_id: number },
      BuildReportResult
    >('queries.reports.build', { character_id: characterId }),
    persisted.characterId,
  );
  expect(reloadedReport.caster).toEqual(persisted.report.caster);

  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
});

test('Veteran v3 sheet values and the v2-to-v3 replacement review are visible', async ({
  page,
}) => {
  test.setTimeout(65_000);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);
  await importBundledHomebrew(
    page,
    'Bundled homebrew imported: 3 added to your library, 0 matched existing.',
  );

  const characters = await page.evaluate(async () => {
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.guidedClassOptions', {});
    const rogue = classes.find((entry) => entry.name === 'Rogue');
    if (rogue === undefined) throw new Error('Bundled Rogue is missing.');
    const classRows = await window.staticApp.inspectRows('class_definitions', { name: 'Rogue' });
    const classDefinitionId = Number(classRows[0]?.['id']);
    const v2Rows = await window.staticApp.inspectRows(
      'subclass_definitions',
      { name: 'Veteran (Bundled revision 2)' },
    );
    const v3Rows = await window.staticApp.inspectRows(
      'subclass_definitions',
      { name: 'Veteran (Bundled revision 3)' },
    );
    const v2Key = String(v2Rows[0]?.['content_key']);
    const v3Key = String(v3Rows[0]?.['content_key']);
    if (!Number.isSafeInteger(classDefinitionId) || v2Key === '' || v3Key === '') {
      throw new Error('Veteran lineage fixtures are missing.');
    }
    const create = async (name: string) => {
      const created = await window.appRpc.call<
        { readonly name: string; readonly class_content_key: string },
        CharacterRow
      >('queries.characters.createGuided', {
        name,
        class_content_key: rogue.content_key,
      });
      await window.appRpc.call<
        {
          readonly character_id: number;
          readonly method: 'manual';
          readonly scores: Record<string, number>;
          readonly operation_uuid: string;
          readonly expected_revision: number;
        },
        unknown
      >('queries.characters.allocateAbilities', {
        character_id: created.id,
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
        expected_revision: created.revision,
      });
      return window.appRpc.call<
        { readonly character_id: number },
        CharacterRow
      >('queries.characters.get', { character_id: created.id });
    };
    const advance = async (
      current: CharacterRow,
      targetLevel: number,
      subclassContentKey?: string,
    ): Promise<CharacterRow> => {
      const result = await window.appRpc.call<Record<string, unknown>, CommandResult>(
        'commands.execute',
        {
          character_id: current.id,
          operation_uuid: crypto.randomUUID(),
          expected_revision: current.revision,
          command: {
            type: 'level_up_class',
            class_definition_id: classDefinitionId,
            target_level: targetLevel,
            ...(subclassContentKey === undefined
              ? {}
              : { subclass_content_key: subclassContentKey }),
            ...([4, 8, 10, 12].includes(targetLevel)
              ? {
                  feat_choice: {
                    kind: 'feat',
                    feat_content_key: '2024:feat:ability-score-improvement',
                    config: {},
                    ability_increases: [{ ability: 'dexterity', amount: 2 }],
                  },
                }
              : {}),
          },
        },
      );
      return { id: current.id, revision: result.revision };
    };
    let current = await create('Veteran v3 sheet oracle');
    for (let level = 2; level <= 8; level += 1) {
      current = await advance(current, level, level === 3 ? v3Key : undefined);
    }
    let historical = await create('Veteran v2 replacement oracle');
    for (let level = 2; level <= 13; level += 1) {
      historical = await advance(
        historical,
        level,
        level === 3 ? v2Key : undefined,
      );
    }
    let kept = await create('Veteran v2 keep oracle');
    kept = await advance(kept, 2);
    kept = await advance(kept, 3, v2Key);
    return {
      v3CharacterId: current.id,
      v3Revision: current.revision,
      v2CharacterId: historical.id,
      keptCharacterId: kept.id,
      classDefinitionId,
      v2Key,
      v3Key,
    };
  });

  await page.goto(`/characters/${String(characters.v3CharacterId)}/sheet`);
  const sneakAttack = page.locator('[data-sheet-id="feature-value:sneak_attack"]');
  await expect(sneakAttack.locator('[data-sheet-value="feature-value:sneak_attack"]'))
    .toHaveText('4d6 + 1d6 (Deeper Cuts)');
  await expect(sneakAttack).toContainText('Deeper Cuts contributes 1d6.');

  await page.evaluate(async (fixture) => {
    let revision = fixture.revision;
    for (let level = 9; level <= 13; level += 1) {
      const updated = await window.appRpc.call<
        Record<string, unknown>,
        CommandResult
      >('commands.execute', {
        character_id: fixture.characterId,
        operation_uuid: crypto.randomUUID(),
        expected_revision: revision,
        command: {
          type: 'level_up_class',
          class_definition_id: fixture.classDefinitionId,
          target_level: level,
          ...([10, 12].includes(level)
            ? {
                feat_choice: {
                  kind: 'feat',
                  feat_content_key: '2024:feat:ability-score-improvement',
                  config: {},
                  ability_increases: [{ ability: 'dexterity', amount: 2 }],
                },
              }
            : {}),
        },
      });
      revision = updated.revision;
    }
  }, {
    characterId: characters.v3CharacterId,
    revision: characters.v3Revision,
    classDefinitionId: characters.classDefinitionId,
  });
  await page.reload();
  await expect(sneakAttack.locator('[data-sheet-value="feature-value:sneak_attack"]'))
    .toHaveText("7d6 + 6d6 (Veteran's Strike)");
  await expect(sneakAttack).toContainText("Veteran's Strike contributes 6d6.");
  await expect(sneakAttack).toContainText(
    'Deeper Cuts would contribute 1d6 but is superseded.',
  );
  const reflexes = page.locator('[data-sheet-id^="resource:authored:"]').filter({
    hasText: 'Veteran Reflexes',
  });
  await expect(reflexes).toContainText('Veteran Reflexes');
  await expect(reflexes.locator('.sheet-resource-box')).toHaveCount(5);

  await page.goto('/homebrew?tab=subclass');
  const veteranCard = page.locator('.homebrew-card').filter({
    has: page.getByRole('heading', {
      name: 'Veteran (Bundled revision 3)',
      exact: true,
    }),
  });
  await expect(veteranCard).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Veteran', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', {
    name: 'Veteran (Bundled revision 2)', exact: true,
  })).toHaveCount(0);
  await veteranCard.getByText('History — 3 versions', { exact: true }).click();
  const reviewUpdate = veteranCard.locator('.homebrew-available-updates').getByRole(
    'link',
    { name: 'Review next version for 2 characters' },
  );
  await expect(reviewUpdate).toBeVisible();
  await reviewUpdate.click();
  await expect(page.locator('.homebrew-status')).toHaveText('Replacement review loaded.');
  const review = page.getByRole('region', { name: 'Fix affected characters' });
  await expect(review).toContainText('Veteran v2 replacement oracle');
  await expect(review).toContainText('Veteran v2 keep oracle');
  await expect(review).toContainText('Before: Veteran (Bundled revision 2)');
  await expect(review).toContainText('After Apply: Veteran (Bundled revision 3)');
  const updatedCharacter = review.getByRole('heading', {
    name: 'Veteran v2 replacement oracle',
  }).locator('..');
  await expect(updatedCharacter.locator('.replacement-rules-changes > *')).toHaveText([
    'Sneak Attack',
    'Current sheet: UNKNOWN',
    'With this update: 13d6',
    'Veteran Reflexes',
    'Current sheet: UNKNOWN',
    'With this update: 5 uses',
  ]);
  await updatedCharacter.getByLabel('Apply the new version').check();
  const keptCharacter = review.getByRole('heading', {
    name: 'Veteran v2 keep oracle',
  }).locator('..');
  await keptCharacter.getByLabel('Keep the current version').check();
  const applySelected = review.getByRole('button', { name: 'Apply selected updates' });
  await expect(applySelected).toBeEnabled();
  await applySelected.click();
  await expect(review).toContainText(
    '1 character(s) now use the new version; 1 kept the current version.',
  );
  expect(await page.evaluate(async (fixture) => {
    const levels = await window.staticApp.inspectRows('character_class_levels');
    const subclasses = await window.staticApp.inspectRows('subclass_definitions');
    const keysById = new Map(subclasses.map((row) => [
      Number(row.id),
      String(row.content_key),
    ]));
    const versionKeys = [fixture.updated, fixture.kept].map((characterId) => {
      const row = levels.find((candidate) =>
        Number(candidate.character_id) === characterId &&
        candidate.subclass_definition_id !== null
      );
      return row === undefined
        ? null
        : keysById.get(Number(row.subclass_definition_id)) ?? null;
    });
    const choices = await window.staticApp.inspectRows(
      'catalog_content_replacement_choices',
    );
    return {
      versionKeys,
      keptChoices: choices.map((choice) => ({
        characterId: Number(choice.character_id),
        oldKey: String(choice.superseded_content_key),
        newKey: String(choice.successor_content_key),
      })),
    };
  }, {
    updated: characters.v2CharacterId,
    kept: characters.keptCharacterId,
  })).toEqual({
    versionKeys: [characters.v3Key, characters.v2Key],
    keptChoices: [{
      characterId: characters.keptCharacterId,
      oldKey: characters.v2Key,
      newKey: characters.v3Key,
    }],
  });
});
