import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CharacterRecord {
  readonly id: number;
  readonly revision: number;
}

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

test('Wizard preparation UI rejects an out-of-book spell and accepts an in-book spell', async ({
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5030 at 12.3s. The required x1.5
  // reserve is 18.45s, rounded up to 100ms.
  test.setTimeout(18_500);
  await page.goto('/');
  await ready(page);
  const setup = await page.evaluate(async () => {
    await window.staticApp.reset();
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly name: string; readonly content_key: string }[]
    >('queries.characters.guidedClassOptions', {});
    const wizard = classes.find((candidate) => candidate.name === 'Wizard');
    if (wizard === undefined) throw new Error('Bundled Wizard is missing.');
    const character = await window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      CharacterRecord
    >('queries.characters.createGuided', {
      name: 'Bookbound Wizard',
      class_content_key: wizard.content_key,
    });
    await window.appRpc.call('queries.characters.allocateAbilities', {
      character_id: character.id,
      method: 'manual',
      scores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 16,
        wisdom: 10,
        charisma: 10,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: character.revision,
    });

    const bookNames: string[] = [];
    while (bookNames.length < 6) {
      const step = await window.appRpc.call<
        { readonly character_id: number },
        {
          readonly revision: number;
          readonly choices: readonly {
            readonly kind: 'slot_selection' | 'spellbook_acquisition';
            readonly id: number;
            readonly selected_spell_name: string | null;
          }[];
        }
      >('queries.characters.spellsStep', { character_id: character.id });
      const choice = step.choices.find(
        (candidate) =>
          candidate.kind === 'spellbook_acquisition' &&
          candidate.selected_spell_name === null,
      );
      if (choice === undefined) {
        throw new Error('Wizard did not expose six spellbook acquisitions.');
      }
      const address = { kind: choice.kind, id: choice.id };
      const eligible = await window.appRpc.call<
        {
          readonly character_id: number;
          readonly address: typeof address;
          readonly query: string;
        },
        readonly { readonly id: number; readonly name: string }[]
      >('queries.characters.guidedEligibleSpells', {
        character_id: character.id,
        address,
        query: '',
      });
      const selected = eligible.find(
        (spell) => spell.name !== 'Shield' && !bookNames.includes(spell.name),
      );
      if (selected === undefined) {
        throw new Error('Wizard spellbook fixture has no distinct spell.');
      }
      await window.appRpc.call('queries.characters.assignGuidedSpell', {
        character_id: character.id,
        address,
        spell_version_id: selected.id,
        operation_uuid: crypto.randomUUID(),
        expected_revision: step.revision,
      });
      bookNames.push(selected.name);
    }
    return {
      characterId: character.id,
      inBookName: bookNames[0]!,
      bookNames,
    };
  });
  expect(setup.bookNames).toHaveLength(6);
  expect(setup.bookNames).not.toContain('Shield');

  await page.goto(`/characters/${String(setup.characterId)}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
  const preparedRow = page
    .locator('.planner-grid tbody tr')
    .filter({ hasText: 'Prepared' })
    .first();
  await expect(preparedRow).toBeVisible();
  const slotId = await preparedRow.getAttribute('data-slot-id');
  expect(slotId).not.toBeNull();
  const picker = preparedRow.locator('.spell-picker-input');

  await picker.fill('Shield');
  await expect(
    preparedRow.locator('.spell-options-status'),
  ).toHaveText('No eligible spells match this search.');
  await page.keyboard.press('Enter');
  expect(
    await page.evaluate(async ({ characterId, selectedSlotId }) => {
      const rows = await window.staticApp.inspectRows(
        'spell_selection_slots',
        { id: Number(selectedSlotId), character_id: characterId },
      );
      return rows[0]?.['current_spell_version_id'] ?? null;
    }, { characterId: setup.characterId, selectedSlotId: slotId }),
  ).toBeNull();

  await picker.fill(setup.inBookName);
  await preparedRow
    .getByRole('option', { name: setup.inBookName, exact: true })
    .click();
  await expect(page.locator('#planner-status')).toHaveText('Autosaved');
  await expect(
    page.locator(`tr[data-slot-id="${slotId!}"] .spell-picker-input`),
  ).toHaveValue(setup.inBookName);
});

test('removing Dwarf retcons Monk 3 hit points from 24 to 21 and reload keeps 21', async ({
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5030 at 17.9s. The required x1.5
  // reserve is 26.85s, rounded up to 100ms.
  test.setTimeout(26_900);
  await page.goto('/');
  await ready(page);
  const characterId = await page.evaluate(async () => {
    await window.staticApp.reset();
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly name: string; readonly content_key: string }[]
    >('queries.characters.guidedClassOptions', {});
    const monk = classes.find((candidate) => candidate.name === 'Monk');
    if (monk === undefined) throw new Error('Bundled Monk is missing.');
    const character = await window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      CharacterRecord
    >('queries.characters.createGuided', {
      name: 'Human Monk Retcon',
      class_content_key: monk.content_key,
    });
    await window.appRpc.call('queries.characters.allocateAbilities', {
      character_id: character.id,
      method: 'manual',
      scores: {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 10,
        wisdom: 16,
        charisma: 10,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: character.revision,
    });
    const origins = await window.appRpc.call<
      { readonly kind: 'species' },
      readonly { readonly name: string; readonly content_key: string }[]
    >('queries.characters.originOptions', { kind: 'species' });
    const dwarf = origins.find((candidate) => candidate.name === 'Dwarf');
    if (dwarf === undefined) throw new Error('Bundled Dwarf is missing.');
    await window.appRpc.call('queries.characters.applyOrigin', {
      character_id: character.id,
      kind: 'species',
      content_key: dwarf.content_key,
    });

    const classRows = await window.staticApp.inspectRows(
      'class_definitions',
      { name: 'Monk' },
    );
    const classDefinitionId = Number(classRows[0]?.['id']);
    for (const targetLevel of [2, 3]) {
      const current = await window.appRpc.call<
        { readonly character_id: number },
        CharacterRecord
      >('queries.characters.get', { character_id: character.id });
      await window.appRpc.call('commands.execute', {
        character_id: character.id,
        operation_uuid: crypto.randomUUID(),
        expected_revision: current.revision,
        command: {
          type: 'level_up_class',
          class_definition_id: classDefinitionId,
          target_level: targetLevel,
        },
      });
    }

    const humanRows = await window.staticApp.inspectRows(
      'species_definitions',
      { name: 'Human' },
    );
    const humanDefinitionId = Number(humanRows[0]?.['id']);
    const current = await window.appRpc.call<
      { readonly character_id: number },
      CharacterRecord
    >('queries.characters.get', { character_id: character.id });
    await window.appRpc.call('commands.execute', {
      character_id: character.id,
      operation_uuid: crypto.randomUUID(),
      expected_revision: current.revision,
      command: {
        type: 'add_source',
        source_type: 'species',
        source_definition_id: humanDefinitionId,
        config: {},
      },
    });
    return character.id;
  });

  const before = await page.evaluate(async (id) => {
    const sheet = await window.appRpc.call<
      { readonly character_id: number },
      {
        readonly class_hit_points_subtotal: { readonly value: number };
        readonly species_hit_points: { readonly value: number } | null;
        readonly hit_point_maximum: { readonly value: number };
      }
    >('queries.characters.sheet', { character_id: id });
    return {
      classSubtotal: sheet.class_hit_points_subtotal.value,
      species: sheet.species_hit_points?.value ?? 0,
      maximum: sheet.hit_point_maximum.value,
    };
  }, characterId);
  expect(before).toEqual({ classSubtotal: 21, species: 3, maximum: 24 });

  await page.goto(`/characters/${String(characterId)}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove Dwarf', exact: true }).click();
  await expect(page.locator('#planner-status')).toHaveText('Autosaved');

  expect(await page.evaluate(async (id) => {
    const sheet = await window.appRpc.call<
      { readonly character_id: number },
      { readonly hit_point_maximum: { readonly value: number } }
    >('queries.characters.sheet', { character_id: id });
    const dwarfSources = (await window.staticApp.inspectRows(
      'character_source_instances',
      { character_id: id, display_name: 'Dwarf' },
    )).map((row) => Number(row['id']));
    const effects = await window.staticApp.inspectRows('character_effects');
    return {
      maximum: sheet.hit_point_maximum.value,
      dwarfEffectCount: effects.filter((row) =>
        dwarfSources.includes(Number(row['source_instance_id'])),
      ).length,
    };
  }, characterId)).toEqual({ maximum: 21, dwarfEffectCount: 0 });

  await page.goto(`/characters/${String(characterId)}/sheet`);
  await expect(page.locator('[data-sheet-value="hit_point_maximum"]')).toHaveText(
    '21',
  );
  await page.reload();
  await expect(page.locator('[data-sheet-value="hit_point_maximum"]')).toHaveText(
    '21',
  );
});
