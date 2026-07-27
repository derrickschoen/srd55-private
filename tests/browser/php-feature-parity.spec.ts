import { expect, test, type Page } from '@playwright/test';
import {
  catalogBaseFixtureImage,
  catalogRecord,
  printableFixtureImage,
  reportFixtureImage,
  workspaceFixtureImage,
  type FixtureImage,
  type PrintableFixtureIds,
  type ReportFixtureIds,
  type SourceCatalogIds,
  type WorkspaceFixtureIds,
} from './fixtures/php-parity';

type Row = Record<string, any>;
type CommandResult = {
  inverse: Record<string, any>;
  revision: number;
  idempotent_replay: boolean;
};

let workspaceImage: FixtureImage<WorkspaceFixtureIds>;
let reportImage: FixtureImage<ReportFixtureIds>;
let printableImage: FixtureImage<PrintableFixtureIds>;
let catalogImage: FixtureImage<SourceCatalogIds>;

test.beforeAll(async () => {
  [workspaceImage, reportImage, printableImage, catalogImage] =
    await Promise.all([
      workspaceFixtureImage(),
      reportFixtureImage(),
      printableFixtureImage(),
      catalogBaseFixtureImage(),
    ]);
});

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

async function install(
  page: Page,
  fixture: FixtureImage<object>,
): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(
    (bytes) => window.staticApp.replaceDatabase(Uint8Array.from(bytes)),
    fixture.bytes,
  );
  await page.reload();
  await ready(page);
}

async function rpc<T>(
  page: Page,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    ({ rpcMethod, rpcParams }) =>
      window.appRpc.call(rpcMethod, rpcParams),
    { rpcMethod: method, rpcParams: params },
  ) as Promise<T>;
}

async function rejectedRpc(
  page: Page,
  method: string,
  params: Record<string, unknown>,
): Promise<{ code: unknown; message: string; data: unknown }> {
  return page.evaluate(
    async ({ rpcMethod, rpcParams }) => {
      try {
        await window.appRpc.call(rpcMethod, rpcParams);
        return { code: null, message: 'not rejected', data: null };
      } catch (error) {
        return {
          code: (error as { code?: unknown }).code ?? null,
          message: error instanceof Error ? error.message : String(error),
          data: (error as { data?: unknown }).data ?? null,
        };
      }
    },
    { rpcMethod: method, rpcParams: params },
  );
}

async function rows(page: Page, table: string): Promise<Row[]> {
  return page.evaluate(
    (name) => window.staticApp.inspectRows(name),
    table,
  ) as Promise<Row[]>;
}

async function databaseBytes(page: Page): Promise<number[]> {
  return page.evaluate(async () =>
    Array.from(await window.staticApp.exportDatabase()),
  );
}

function operation(index: number): string {
  return `81000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

async function execute(
  page: Page,
  characterId: number,
  expectedRevision: number,
  command: Record<string, unknown>,
  index: number,
): Promise<CommandResult> {
  return rpc<CommandResult>(page, 'commands.execute', {
    character_id: characterId,
    operation_uuid: operation(index),
    expected_revision: expectedRevision,
    command,
  });
}

function forCharacter(allRows: Row[], characterId: number): Row[] {
  return allRows.filter((row) => row.character_id === characterId);
}

async function portableTableCounts(
  page: Page,
  characterId: number,
): Promise<Record<string, number>> {
  const loadouts = forCharacter(
    await rows(page, 'spell_loadouts'),
    characterId,
  );
  const loadoutIds = new Set(loadouts.map((row) => row.id));
  return {
    character_class_levels: forCharacter(
      await rows(page, 'character_class_levels'),
      characterId,
    ).length,
    character_rule_overrides: forCharacter(
      await rows(page, 'character_rule_overrides'),
      characterId,
    ).length,
    character_save_points: forCharacter(
      await rows(page, 'character_save_points'),
      characterId,
    ).length,
    character_source_instances: forCharacter(
      await rows(page, 'character_source_instances'),
      characterId,
    ).length,
    character_spell_preferences: forCharacter(
      await rows(page, 'character_spell_preferences'),
      characterId,
    ).length,
    spell_loadout_entries: (await rows(page, 'spell_loadout_entries'))
      .filter((row) => loadoutIds.has(row.spell_loadout_id)).length,
    // Weapons joined the portable document when they stopped being dropped from
    // backups; a document that does not carry them fails the comparison below.
    character_weapons: forCharacter(
      await rows(page, 'character_weapons'),
      characterId,
    ).length,
    // The character's origin joined it on the same terms.
    character_species: forCharacter(
      await rows(page, 'character_species'),
      characterId,
    ).length,
    character_species_traits: forCharacter(
      await rows(page, 'character_species_traits'),
      characterId,
    ).length,
    // ...and the character's own EFFECTS, which used to be five columns on the
    // trait rows above. A document that does not carry them silently loses
    // every resistance and hit point bonus the player has.
    character_effects: forCharacter(
      await rows(page, 'character_effects'),
      characterId,
    ).length,
    // And the four stored sheet inputs, on the same terms again: a document
    // that does not carry them is a document that silently loses a player's
    // armour, their rolled hit points and the skills they chose.
    character_armor: forCharacter(
      await rows(page, 'character_armor'),
      characterId,
    ).length,
    character_hit_point_rolls: forCharacter(
      await rows(page, 'character_hit_point_rolls'),
      characterId,
    ).length,
    character_skill_proficiencies: forCharacter(
      await rows(page, 'character_skill_proficiencies'),
      characterId,
    ).length,
    character_sheet_adjustments: forCharacter(
      await rows(page, 'character_sheet_adjustments'),
      characterId,
    ).length,
    character_background: forCharacter(
      await rows(page, 'character_background'),
      characterId,
    ).length,
    spell_loadouts: loadouts.length,
    spell_selection_slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      characterId,
    ).length,
    warning_acknowledgements: forCharacter(
      await rows(page, 'warning_acknowledgements'),
      characterId,
    ).length,
    wizard_spellbook_entries: forCharacter(
      await rows(page, 'wizard_spellbook_entries'),
      characterId,
    ).length,
  };
}

test('serves the seeded character list and editable workspace', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const cards = await rpc<any[]>(page, 'queries.characters.list', {});
  const workspace = await rpc<any>(
    page,
    'queries.characters.workspace',
    { character_id: workspaceImage.ids.character },
  );

  expect(cards).toEqual([
    {
      id: workspaceImage.ids.character,
      name: 'R40 Golden',
      level: 8,
      classes: ['Paladin 1', 'Ranger 1', 'Warlock 5', 'Wizard 1'],
      warning_count: 4,
    },
  ]);
  expect(workspace).toMatchObject({
    revision: 0,
    report: {
      character: {
        name: 'R40 Golden',
        character_level: 8,
        proficiency_bonus: 3,
      },
      caster: { pact_magic: { count: 2, level: 3 } },
      summary: {
        unique_spells: 8,
        access_routes: 9,
        warning_count: 4,
      },
    },
    spell_lists: ['Cleric', 'Druid', 'Wizard'],
    save_points: [],
  });
  expect(workspace.source_catalog.feat).toContainEqual(
    expect.objectContaining({ configuration_kind: 'magic_initiate' }),
  );
  expect(workspace.source_catalog.species).toContainEqual(
    expect.objectContaining({
      configuration_kind: 'origin_feat_magic_initiate',
    }),
  );
  expect(workspace.source_catalog.background).toContainEqual(
    expect.objectContaining({
      configuration_kind: 'origin_feat_magic_initiate',
    }),
  );
  expect(workspace.order_sources).toEqual([]);
  expect(workspace.slots.map((slot: Row) => slot.id).sort((a: number, b: number) => a - b))
    .toEqual(
      forCharacter(
        await rows(page, 'spell_selection_slots'),
        workspaceImage.ids.character,
      ).map((row) => row.id).sort((a, b) => a - b),
    );

  await page.goto(`/characters/${workspaceImage.ids.character}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'R40 Golden' })).toBeVisible();
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ name: 'R40 Golden', revision: 0 });
  expect(await databaseBytes(page)).toEqual(before);
});

test('builds the complete character list card contract in deterministic order', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const first = await rpc<any[]>(page, 'queries.characters.list', {});
  const second = await rpc<any[]>(page, 'queries.characters.list', {});
  expect(first).toEqual(second);
  expect(first.map((card) => card.name)).toEqual(['R40 Golden']);
  expect(first).toEqual([{
    id: workspaceImage.ids.character,
    name: 'R40 Golden',
    level: 8,
    classes: ['Paladin 1', 'Ranger 1', 'Warlock 5', 'Wizard 1'],
    warning_count: 4,
  }]);
  expect(
    forCharacter(
      await rows(page, 'character_class_levels'),
      workspaceImage.ids.character,
    ),
  ).toHaveLength(4);
  expect(await databaseBytes(page)).toEqual(before);
});

test('builds the complete workspace editing contract for the seeded character', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const workspace = await rpc<any>(
    page,
    'queries.characters.workspace',
    { character_id: workspaceImage.ids.character },
  );
  expect(Object.keys(workspace)).toEqual([
    'revision',
    'report',
    'classes',
    'available_classes',
    'allow_legacy',
    'configurable_sources',
    'order_sources',
    'source_catalog',
    'removable_sources',
    'spell_lists',
    'slots',
    'placeholder_spells',
    'weapons',
    'save_points',
  ]);
  expect(workspace.revision).toBe(0);
  expect(workspace.allow_legacy).toBe(false);
  expect(workspace.spell_lists).toEqual(['Cleric', 'Druid', 'Wizard']);
  expect(workspace.save_points).toEqual([]);
  expect(workspace.report.summary).toEqual({
    unique_spells: 8,
    access_routes: 9,
    warning_count: 4,
  });
  expect(workspace.classes.map((item: any) => item.name)).toEqual([
    'Paladin',
    'Ranger',
    'Warlock',
    'Wizard',
  ]);
  expect(workspace.available_classes.map((item: any) => item.name)).toEqual([
    'Barbarian',
    'Bard',
    'Cleric',
    'Druid',
    'Fighter',
    'Monk',
    'Paladin',
    'Ranger',
    'Rogue',
    'Sorcerer',
    'Warlock',
    'Wizard',
  ]);
  expect(workspace.configurable_sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        display_name: 'Magic Initiate: Wizard',
        chosen_list: 'Wizard',
      }),
      expect.objectContaining({
        display_name: 'Magic Initiate: Cleric',
        chosen_list: 'Cleric',
      }),
      expect.objectContaining({
        display_name: 'Magic Initiate: Druid',
        chosen_list: 'Druid',
      }),
    ]),
  );
  expect(
    workspace.configurable_sources
      .map((source: Row) => ({
        display_name: source.display_name,
        chosen_list: source.chosen_list,
        spellcasting_ability: source.spellcasting_ability,
      }))
      .sort((a: Row, b: Row) =>
        String(a.display_name).localeCompare(String(b.display_name))),
  ).toEqual([
    {
      display_name: 'Magic Initiate: Cleric',
      chosen_list: 'Cleric',
      spellcasting_ability: 'wisdom',
    },
    {
      display_name: 'Magic Initiate: Druid',
      chosen_list: 'Druid',
      spellcasting_ability: 'intelligence',
    },
    {
      display_name: 'Magic Initiate: Wizard',
      chosen_list: 'Wizard',
      spellcasting_ability: 'intelligence',
    },
    {
      display_name: 'Wisdom parity source',
      chosen_list: 'Druid',
      spellcasting_ability: 'wisdom',
    },
  ]);
  expect(workspace.slots[0]).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      slot_key: expect.any(String),
      state: expect.any(String),
      eligibility: expect.any(String),
    }),
  );
  expect(
    forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ).map((row) => row.id),
  ).toEqual(
    expect.arrayContaining([
      workspaceImage.ids.magicInitiateSource,
      workspaceImage.ids.nestedRoot,
      workspaceImage.ids.nestedChild,
    ]),
  );
  expect(await databaseBytes(page)).toEqual(before);
});

test('returns an exact eligible-spell DTO and treats wildcard characters literally', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const exact = await rpc<any[]>(
    page,
    'queries.eligibleSpells.search',
    {
      character_id: workspaceImage.ids.character,
      slot_id: workspaceImage.ids.targetSlot,
      query: 'Parity Replacement',
    },
  );
  expect(exact).toEqual([
    {
      id: workspaceImage.ids.replacementSpell,
      name: 'Parity Replacement',
      level: 0,
      school: 'Abjuration',
      ritual: false,
      concentration: false,
      edition: '2024',
    },
  ]);
  for (const query of ['%', '_']) {
    expect(
      await rpc<any[]>(page, 'queries.eligibleSpells.search', {
        character_id: workspaceImage.ids.character,
        slot_id: workspaceImage.ids.targetSlot,
        query,
      }),
    ).toEqual([]);
  }
  expect(
    (await rows(page, 'spell_versions')).find(
      (row) => row.id === workspaceImage.ids.replacementSpell,
    ),
  ).toMatchObject({
    content_key: '2024:parity-replacement',
    display_name: 'Parity Replacement',
    is_active: 1,
  });
  expect(await databaseBytes(page)).toEqual(before);
});

test('captures every restorable character table and reports exact state differences', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const document = await rpc<any>(page, 'backup.exportCharacter', {
    characterId: workspaceImage.ids.character,
  });
  expect(document).toMatchObject({
    format: 'dnd-multiclass-spells/character',
    version: 1,
    source_character_id: workspaceImage.ids.character,
    character: { name: 'R40 Golden', revision: 0 },
  });
  for (const table of [
    'character_class_levels',
    'character_source_instances',
    'spell_selection_slots',
    'wizard_spellbook_entries',
    'warning_acknowledgements',
    'character_weapons',
    'character_species',
    'character_species_traits',
    'character_background',
    'character_armor',
    'character_hit_point_rolls',
    'character_skill_proficiencies',
    'character_sheet_adjustments',
    'character_effects',
  ]) {
    expect(document.tables[table]).toEqual(
      forCharacter(await rows(page, table), workspaceImage.ids.character),
    );
  }
  expect(Object.keys(document.tables).sort()).toEqual([
    // Added when the four stored sheet inputs became portable, for exactly the
    // reason the weapons and origin keys were added: a backup without them
    // silently loses the player's armour, rolls and skill choices.
    'character_armor',
    // Added when the character's origin became portable, for the same reason
    // the weapons key was: a backup without it silently loses the species.
    'character_background',
    'character_class_levels',
    // Added when the effect model was inverted: an effect is a row of the
    // character's own now, and a backup without this key silently loses every
    // resistance and hit point bonus they have.
    'character_effects',
    'character_hit_point_rolls',
    'character_rule_overrides',
    'character_save_points',
    'character_sheet_adjustments',
    'character_skill_proficiencies',
    'character_source_instances',
    'character_species',
    'character_species_traits',
    'character_spell_preferences',
    // Added when weapons became portable. A backup that does not carry this key
    // is a backup that silently loses the user's weapons.
    'character_weapons',
    'spell_loadout_entries',
    'spell_loadouts',
    'spell_selection_slots',
    'warning_acknowledgements',
    'wizard_spellbook_entries',
  ]);
  for (const table of [
    'character_rule_overrides',
    'character_save_points',
    'character_spell_preferences',
    'spell_loadout_entries',
    'spell_loadouts',
    'character_weapons',
    'character_species',
    'character_species_traits',
    'character_background',
    'character_armor',
    'character_hit_point_rolls',
    'character_skill_proficiencies',
    'character_sheet_adjustments',
    'character_effects',
  ]) {
    expect(document.tables[table], `${table} is captured exactly`).toEqual([]);
  }
  expect(await databaseBytes(page)).toEqual(before);

  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_ability',
      ability: 'wisdom',
      score: 15,
      reason: 'State diff parity.',
    },
    5,
  );
  const diff = (await rows(page, 'change_log')).filter(
    (row) => row.operation_uuid === operation(5),
  );
  expect(diff).toHaveLength(1);
  expect(diff[0]).toMatchObject({
    entity_type: 'character',
    entity_id: null,
    action_type: 'update_ability',
    reason: 'State diff parity.',
  });
  expect(JSON.parse(String(diff[0]!.previous_value))).toMatchObject({
    wisdom: 14,
  });
  expect(JSON.parse(String(diff[0]!.new_value))).toMatchObject({
    wisdom: 15,
  });
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ wisdom: 15, revision: 1 });
});

test('creates and opens an empty character without additional setup', async ({
  page,
}) => {
  await install(page, catalogImage);
  const created = await rpc<any>(page, 'queries.characters.create', {
    name: 'Fresh Build',
  });
  const workspace = await rpc<any>(
    page,
    'queries.characters.workspace',
    { character_id: created.id },
  );
  expect(workspace.report.character).toMatchObject({
    name: 'Fresh Build',
    character_level: 0,
  });
  expect(workspace.slots).toEqual([]);
  expect(await rows(page, 'characters')).toEqual([
    expect.objectContaining({
      id: created.id,
      name: 'Fresh Build',
      revision: 0,
    }),
  ]);
  await page.reload();
  await ready(page);
  expect(await rows(page, 'characters')).toEqual([
    expect.objectContaining({ id: created.id, name: 'Fresh Build' }),
  ]);
});

test('changes one slot while leaving every other slot byte-identical', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = forCharacter(
    await rows(page, 'spell_selection_slots'),
    workspaceImage.ids.character,
  );
  const result = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.replacementSpell,
    },
    7,
  );
  expect(result.revision).toBe(1);
  const after = forCharacter(
    await rows(page, 'spell_selection_slots'),
    workspaceImage.ids.character,
  );
  expect(after.filter((row) => row.id !== workspaceImage.ids.targetSlot))
    .toEqual(before.filter((row) => row.id !== workspaceImage.ids.targetSlot));
  expect(
    after.find((row) => row.id === workspaceImage.ids.targetSlot),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.replacementSpell,
    state: 'active',
    selection_eligibility: 'valid',
  });
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 1 });
});

test('undo restores the prior spell selection', async ({ page }) => {
  await install(page, workspaceImage);
  const original = (await rows(page, 'spell_selection_slots')).find(
    (row) => row.id === workspaceImage.ids.targetSlot,
  )!;
  const changed = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.replacementSpell,
    },
    8,
  );
  expect(changed.inverse).toEqual({
    type: 'set_slot',
    slot_id: workspaceImage.ids.targetSlot,
    mode: 'restore',
    state: {
      current_spell_version_id: workspaceImage.ids.originalSpell,
      selection_eligibility: original.selection_eligibility,
      selection_invalid_reason: original.selection_invalid_reason,
      state: original.state,
      override_note: original.override_note,
    },
    integrity: expect.any(String),
  });
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    changed.inverse,
    80,
  );
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === workspaceImage.ids.targetSlot,
    ),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.originalSpell,
    state: 'active',
    selection_eligibility: 'valid',
  });
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 2 });
  expect(
    forCharacter(
      await rows(page, 'character_operations'),
      workspaceImage.ids.character,
    ),
  ).toHaveLength(2);
});

test('clears, overrides, and reselects a slot with exact persisted state', async ({
  page,
}) => {
  await install(page, workspaceImage);
  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'clear',
    },
    9,
  );
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === workspaceImage.ids.targetSlot,
    ),
  ).toMatchObject({
    current_spell_version_id: null,
    selection_eligibility: 'unselected',
    selection_invalid_reason: null,
    state: 'active',
    override_note: null,
  });
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.originalSpell,
    },
    90,
  );
  await execute(
    page,
    workspaceImage.ids.character,
    2,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'keep_override',
      note: '  Deliberate exception.  ',
    },
    91,
  );
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === workspaceImage.ids.targetSlot,
    ),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.originalSpell,
    state: 'kept_override',
    override_note: 'Deliberate exception.',
  });
  await execute(
    page,
    workspaceImage.ids.character,
    3,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.replacementSpell,
    },
    92,
  );
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === workspaceImage.ids.targetSlot,
    ),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.replacementSpell,
    state: 'active',
    selection_eligibility: 'valid',
    override_note: null,
  });
  await page.reload();
  await ready(page);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 4 });
});

test('round-trips a named save point through the mutation path', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const saved = await rpc<any>(page, 'queries.savePoints.create', {
    character_id: workspaceImage.ids.character,
    label: 'Before experiment',
  });
  expect(saved.save_points).toEqual([
    expect.objectContaining({ label: 'Before experiment' }),
  ]);
  const point = forCharacter(
    await rows(page, 'character_save_points'),
    workspaceImage.ids.character,
  )[0]!;
  expect(point).toMatchObject({
    label: 'Before experiment',
    // a7-v7 is the snapshot version whose weapon rows carry tagged ranges.
    schema_version: 'a7-v7',
  });
  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_ability',
      ability: 'intelligence',
      score: 20,
    },
    10,
  );
  const restore = await rpc<Record<string, unknown>>(
    page,
    'queries.savePoints.restoreCommand',
    {
      character_id: workspaceImage.ids.character,
      save_point_id: point.id,
    },
  );
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    restore,
    100,
  );
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ intelligence: 16, revision: 2 });
  await page.reload();
  await ready(page);
  expect(
    forCharacter(
      await rows(page, 'character_save_points'),
      workspaceImage.ids.character,
    ),
  ).toHaveLength(1);
});

test('changing an ability score recomputes only mechanically relevant casting math', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const beforeSlots = forCharacter(
    await rows(page, 'spell_selection_slots'),
    workspaceImage.ids.character,
  );
  const initial = await rpc<any>(
    page,
    'queries.characters.workspace',
    { character_id: workspaceImage.ids.character },
  );
  expect(
    initial.slots.find(
      (slot: any) => slot.id === workspaceImage.ids.attackSlot,
    ),
  ).toMatchObject({ attack_bonus: 5, save_dc: null });
  expect(
    initial.slots.find(
      (slot: any) => slot.id === workspaceImage.ids.saveSlot,
    ),
  ).toMatchObject({ attack_bonus: null, save_dc: 13 });

  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_ability',
      ability: 'wisdom',
      score: 18,
    },
    11,
  );
  const changed = await rpc<any>(
    page,
    'queries.characters.workspace',
    { character_id: workspaceImage.ids.character },
  );
  expect(
    changed.slots.find(
      (slot: any) => slot.id === workspaceImage.ids.attackSlot,
    ),
  ).toMatchObject({ attack_bonus: 7, save_dc: null });
  expect(
    changed.slots.find(
      (slot: any) => slot.id === workspaceImage.ids.saveSlot,
    ),
  ).toMatchObject({ attack_bonus: null, save_dc: 15 });
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  ).toEqual(beforeSlots);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ wisdom: 18, intelligence: 16, revision: 1 });
});

test('returns the exact mutation envelope, inverse, operation, and reversible audit contract', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const result = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_ability',
      ability: 'wisdom',
      score: 16,
      reason: 'Mutation contract.',
    },
    12,
  );
  expect(result).toEqual({
    inverse: {
      type: 'update_ability',
      ability: 'wisdom',
      score: 14,
    },
    revision: 1,
    idempotent_replay: false,
  });
  expect(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === operation(12),
    ),
  ).toMatchObject({
    character_id: workspaceImage.ids.character,
    expected_revision: 0,
    resulting_revision: 1,
    inverse_command: JSON.stringify(result.inverse),
  });
  expect(
    (await rows(page, 'change_log')).find(
      (row) => row.operation_uuid === operation(12),
    ),
  ).toMatchObject({
    sequence: 1,
    reason: 'Mutation contract.',
    action_type: 'update_ability',
    reversible: 1,
  });
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ wisdom: 16, revision: 1 });
});

test('adding a class level generates new slots without disturbing existing slots', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = forCharacter(
    await rows(page, 'spell_selection_slots'),
    workspaceImage.ids.character,
  );
  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_class',
      class_definition_id: workspaceImage.ids.sorcererClass,
      level: 1,
      subclass_definition_id: null,
    },
    13,
  );
  const after = forCharacter(
    await rows(page, 'spell_selection_slots'),
    workspaceImage.ids.character,
  );
  expect(after.filter((row) => before.some((old) => old.id === row.id)))
    .toEqual(before);
  const addedSlots = after.filter(
    (row) => !before.some((old) => old.id === row.id),
  );
  expect(addedSlots).toHaveLength(6);
  expect(
    forCharacter(
      await rows(page, 'character_class_levels'),
      workspaceImage.ids.character,
    ).find(
      (row) =>
        row.class_definition_id === workspaceImage.ids.sorcererClass,
    ),
  ).toMatchObject({
    level: 1,
    is_starting_class: 0,
    subclass_definition_id: null,
  });
  expect(
    forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ).find(
      (row) =>
        row.source_definition_id === workspaceImage.ids.sorcererClass,
    ),
  ).toMatchObject({
    display_name: 'Sorcerer 1',
    acquired_at_character_level: 9,
    state: 'active',
    config: '{"spellcasting_ability":"charisma"}',
  });
  expect(new Set(addedSlots.map((row) => row.source_instance_id))).toEqual(
    new Set([
      forCharacter(
        await rows(page, 'character_source_instances'),
        workspaceImage.ids.character,
      ).find(
        (row) =>
          row.source_definition_id === workspaceImage.ids.sorcererClass,
      )!.id,
    ]),
  );
});

test('undoes a structural class change through its snapshot inverse', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = {
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      workspaceImage.ids.character,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  };
  const changed = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_class',
      class_definition_id: workspaceImage.ids.sorcererClass,
      level: 1,
      subclass_definition_id: null,
    },
    14,
  );
  expect(changed.inverse).toMatchObject({
    type: 'restore_snapshot',
    snapshot: { schema_version: 'a7-v7' },
    integrity: expect.any(String),
  });
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    changed.inverse,
    140,
  );
  expect({
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      workspaceImage.ids.character,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  }).toEqual(before);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 2 });
});

test('rejects stale revisions and replays an operation idempotently', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const command = {
    type: 'update_ability',
    ability: 'wisdom',
    score: 16,
  };
  const first = await execute(
    page,
    workspaceImage.ids.character,
    0,
    command,
    15,
  );
  const replay = await execute(
    page,
    workspaceImage.ids.character,
    999,
    { type: 'update_ability', ability: 'wisdom', score: 30 },
    15,
  );
  expect(replay).toEqual({ ...first, idempotent_replay: true });
  const stale = await rejectedRpc(page, 'commands.execute', {
    character_id: workspaceImage.ids.character,
    operation_uuid: operation(150),
    expected_revision: 0,
    command: { type: 'update_ability', ability: 'wisdom', score: 18 },
  });
  expect(stale).toEqual({
    code: 'handler_error',
    message:
      'This character changed in another tab. Reload before trying again.',
    data: { current_revision: 1 },
  });
  expect(
    forCharacter(
      await rows(page, 'character_operations'),
      workspaceImage.ids.character,
    ),
  ).toEqual([
    expect.objectContaining({
      operation_uuid: operation(15),
      resulting_revision: 1,
    }),
  ]);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ wisdom: 16, revision: 1 });
});

test('round-trips character rules and rejects legacy selection while legacy rules are disabled', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const enabled = await execute(
    page,
    workspaceImage.ids.character,
    0,
    { type: 'update_character_rules', allow_legacy: true },
    16,
  );
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ allow_legacy: 1, revision: 1 });
  const rulesAudit = (await rows(page, 'change_log')).filter(
    (row) => row.operation_uuid === operation(16),
  );
  expect(rulesAudit).toHaveLength(1);
  expect(new Set(rulesAudit.map((row) => row.group_id)).size).toBe(1);
  expect(rulesAudit.map((row) => row.action_type)).toEqual([
    'update_character_rules',
  ]);
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    enabled.inverse,
    160,
  );
  const rejected = await rejectedRpc(page, 'commands.execute', {
    character_id: workspaceImage.ids.character,
    operation_uuid: operation(161),
    expected_revision: 2,
    command: {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.legacySpell,
    },
  });
  expect(rejected.message).toBe(
    'Enable legacy rules before selecting a 2014 spell version.',
  );
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ allow_legacy: 0, revision: 2 });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === workspaceImage.ids.targetSlot,
    ),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.originalSpell,
  });
  expect(
    forCharacter(
      await rows(page, 'character_operations'),
      workspaceImage.ids.character,
    ),
  ).toHaveLength(2);
  expect(
    (await rows(page, 'change_log')).filter(
      (row) => row.operation_uuid === operation(161),
    ),
  ).toEqual([]);
});

test('round-trips source configuration with one audit group and rejects unsupported Magic Initiate lists', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const before = {
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  };
  const bad = await rejectedRpc(page, 'commands.execute', {
    character_id: workspaceImage.ids.character,
    operation_uuid: operation(17),
    expected_revision: 0,
    command: {
      type: 'update_source_config',
      source_instance_id: workspaceImage.ids.nestedChild,
      chosen_list: 'Bard',
    },
  });
  expect(bad.message).toBe(
    'Magic Initiate must use the Cleric, Druid, or Wizard spell list.',
  );
  expect(
    forCharacter(
      await rows(page, 'character_operations'),
      workspaceImage.ids.character,
    ),
  ).toEqual([]);
  expect({
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  }).toEqual(before);

  const changed = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_source_config',
      source_instance_id: workspaceImage.ids.nestedChild,
      chosen_list: 'Wizard',
    },
    170,
  );
  const sources = await rows(page, 'character_source_instances');
  expect(
    sources.find((row) => row.id === workspaceImage.ids.nestedChild),
  ).toMatchObject({
    display_name: 'Magic Initiate: Wizard',
    config:
      '{"chosen_list":"Wizard","spellcasting_ability":"intelligence"}',
  });
  expect(
    JSON.parse(
      String(
        sources.find((row) => row.id === workspaceImage.ids.nestedRoot)!
          .config,
      ),
    ).origin_feat_config,
  ).toEqual({
    chosen_list: 'Wizard',
    spellcasting_ability: 'intelligence',
  });
  expect(
    (await rows(page, 'spell_selection_slots'))
      .filter(
        (row) => row.source_instance_id === workspaceImage.ids.nestedChild,
      )
      .map((row) => row.allowed_spell_lists),
  ).toEqual(['["Wizard"]', '["Wizard"]', '["Wizard"]']);
  const audit = (await rows(page, 'change_log')).filter(
    (row) => row.operation_uuid === operation(170),
  );
  expect(audit.length).toBeGreaterThan(1);
  expect(new Set(audit.map((row) => row.group_id)).size).toBe(1);
  expect(new Set(audit.map((row) => row.action_type))).toEqual(
    new Set(['update_source_config']),
  );
  const after = {
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  };
  const replay = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_source_config',
      source_instance_id: workspaceImage.ids.nestedChild,
      chosen_list: 'Cleric',
    },
    170,
  );
  expect(replay).toMatchObject({
    revision: 1,
    idempotent_replay: true,
  });
  expect({
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  }).toEqual(after);
  expect(
    forCharacter(
      await rows(page, 'character_operations'),
      workspaceImage.ids.character,
    ),
  ).toHaveLength(1);
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    changed.inverse,
    171,
  );
  expect({
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      workspaceImage.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ),
  }).toEqual(before);
});

test('updates a standalone Magic Initiate source and regenerates its slot constraints', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const character = await rpc<any>(page, 'queries.characters.create', {
    name: 'Standalone Magic Initiate',
  });
  await execute(
    page,
    character.id,
    0,
    {
      type: 'add_source',
      source_type: 'feat',
      source_definition_id: workspaceImage.ids.magicInitiateDefinition,
      config: {
        chosen_list: 'Cleric',
        spellcasting_ability: 'wisdom',
      },
    },
    18,
  );
  const source = forCharacter(
    await rows(page, 'character_source_instances'),
    character.id,
  )[0]!;
  await execute(
    page,
    character.id,
    1,
    {
      type: 'update_source_config',
      source_instance_id: source.id,
      chosen_list: 'Wizard',
    },
    180,
  );
  expect(
    (await rows(page, 'character_source_instances')).find(
      (row) => row.id === source.id,
    ),
  ).toMatchObject({
    parent_source_instance_id: null,
    display_name: 'Magic Initiate: Wizard',
    config:
      '{"chosen_list":"Wizard","spellcasting_ability":"intelligence"}',
  });
  const generated = (await rows(page, 'spell_selection_slots')).filter(
    (row) =>
      row.source_instance_id === source.id &&
      String(row.rule_key).startsWith('magic-initiate-'),
  );
  expect(generated).toHaveLength(3);
  expect(generated.map((row) => row.allowed_spell_lists)).toEqual([
    '["Wizard"]',
    '["Wizard"]',
    '["Wizard"]',
  ]);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === character.id,
    ),
  ).toMatchObject({ revision: 2 });
});

test('adds a class source through the command with its level, DSL slots, and spellbook atomically', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const character = await rpc<any>(page, 'queries.characters.create', {
    name: 'Class Source Command',
  });
  const added = await execute(
    page,
    character.id,
    0,
    {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: workspaceImage.ids.sorcererClass,
      config: { level: 1 },
    },
    19,
  );
  expect(
    forCharacter(await rows(page, 'character_class_levels'), character.id),
  ).toEqual([
    expect.objectContaining({
      class_definition_id: workspaceImage.ids.sorcererClass,
      level: 1,
      is_starting_class: 1,
    }),
  ]);
  const sorcererSource = forCharacter(
    await rows(page, 'character_source_instances'),
    character.id,
  ).find(
    (row) => row.source_definition_id === workspaceImage.ids.sorcererClass,
  )!;
  expect(sorcererSource).toMatchObject({
    display_name: 'Sorcerer 1',
    config: '{"spellcasting_ability":"charisma"}',
    acquired_at_character_level: 1,
  });
  expect(
    (await rows(page, 'spell_selection_slots')).filter(
      (row) => row.source_instance_id === sorcererSource.id,
    ),
  ).toHaveLength(6);

  const afterSorcerer = {
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      character.id,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      character.id,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      character.id,
    ),
  };
  const duplicate = await rejectedRpc(page, 'commands.execute', {
    character_id: character.id,
    operation_uuid: operation(189),
    expected_revision: 1,
    command: {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: workspaceImage.ids.sorcererClass,
      config: { level: 1 },
    },
  });
  expect(duplicate.message).toBe('Sorcerer is not repeatable.');
  expect({
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      character.id,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      character.id,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      character.id,
    ),
  }).toEqual(afterSorcerer);

  const invalid = await rejectedRpc(page, 'commands.execute', {
    character_id: character.id,
    operation_uuid: operation(190),
    expected_revision: 1,
    command: {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: workspaceImage.ids.wizardClass,
      config: { level: 1, wizard_spellbook_acquisitions: [{}] },
    },
  });
  expect(invalid.message).toContain(
    "Spellbook rule 'wizard-spellbook' acquisition 0",
  );
  expect({
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      character.id,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      character.id,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      character.id,
    ),
  }).toEqual(afterSorcerer);

  await execute(
    page,
    character.id,
    1,
    {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: workspaceImage.ids.wizardClass,
      config: {
        level: 1,
        wizard_spellbook_acquisitions: [
          { spell_version_key: '2024:parity-shield' },
        ],
      },
    },
    191,
  );
  const wizardSource = forCharacter(
    await rows(page, 'character_source_instances'),
    character.id,
  ).find(
    (row) => row.source_definition_id === workspaceImage.ids.wizardClass,
  )!;
  expect(wizardSource).toMatchObject({
    display_name: 'Wizard 1',
    acquired_at_character_level: 2,
    config:
      '{"spellcasting_ability":"intelligence","wizard_spellbook_acquisitions":[{"spell_version_key":"2024:parity-shield"}]}',
  });
  expect(forCharacter(
    await rows(page, 'wizard_spellbook_entries'),
    character.id,
  )).toEqual([
    expect.objectContaining({
      spell_version_id: workspaceImage.ids.acquisitionSpell,
    }),
  ]);
  expect(
    new Set(
      (await rows(page, 'change_log'))
        .filter((row) => row.character_id === character.id)
        .map((row) => row.action_type),
    ),
  ).toEqual(new Set(['add_source']));
  await execute(page, character.id, 2, added.inverse, 192);
  expect(
    forCharacter(await rows(page, 'character_class_levels'), character.id),
  ).toEqual([]);
  expect(
    forCharacter(
      await rows(page, 'character_source_instances'),
      character.id,
    ),
  ).toEqual([]);
  expect(
    forCharacter(await rows(page, 'spell_selection_slots'), character.id),
  ).toEqual([]);
  expect(
    (await rows(page, 'characters')).find((row) => row.id === character.id),
  ).toMatchObject({ revision: 3 });
});

test('adds species and background roots with nested Magic Initiate chains and rejects non-repeatable duplicates', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const character = await rpc<any>(page, 'queries.characters.create', {
    name: 'Nested Source Test',
  });
  const invalid = await rejectedRpc(page, 'commands.execute', {
    character_id: character.id,
    operation_uuid: operation(20),
    expected_revision: 0,
    command: {
      type: 'add_source',
      source_type: 'species',
      source_definition_id: workspaceImage.ids.humanDefinition,
      config: {
        origin_feat_key: '2024:feat:magic-initiate',
        origin_feat_config: {
          chosen_list: 'Bard',
          spellcasting_ability: 'charisma',
        },
      },
    },
  });
  expect(invalid.message).toBe(
    'Magic Initiate must use the Cleric, Druid, or Wizard spell list.',
  );
  expect(
    forCharacter(
      await rows(page, 'character_source_instances'),
      character.id,
    ),
  ).toEqual([]);

  const humanConfig = {
    origin_feat_key: '2024:feat:magic-initiate',
    origin_feat_config: {
      chosen_list: 'Wizard',
      spellcasting_ability: 'charisma',
    },
  };
  await execute(
    page,
    character.id,
    0,
    {
      type: 'add_source',
      source_type: 'species',
      source_definition_id: workspaceImage.ids.humanDefinition,
      config: humanConfig,
    },
    200,
  );
  const duplicate = await rejectedRpc(page, 'commands.execute', {
    character_id: character.id,
    operation_uuid: operation(201),
    expected_revision: 1,
    command: {
      type: 'add_source',
      source_type: 'species',
      source_definition_id: workspaceImage.ids.humanDefinition,
      config: humanConfig,
    },
  });
  expect(duplicate.message).toBe('Human is not repeatable.');
  await execute(
    page,
    character.id,
    1,
    {
      type: 'add_source',
      source_type: 'background',
      source_definition_id: workspaceImage.ids.backgroundDefinition,
      config: {
        origin_feat_key: '2024:feat:magic-initiate',
        origin_feat_config: {
          chosen_list: 'Druid',
          spellcasting_ability: 'intelligence',
        },
      },
    },
    202,
  );
  const sources = forCharacter(
    await rows(page, 'character_source_instances'),
    character.id,
  );
  const roots = sources.filter(
    (row) => row.parent_source_instance_id === null,
  );
  const children = sources.filter(
    (row) => row.parent_source_instance_id !== null,
  );
  expect(roots.map((row) => row.source_type)).toEqual([
    'species',
    'background',
  ]);
  expect(children.map((row) => row.display_name)).toEqual([
    'Magic Initiate: Wizard',
    'Magic Initiate: Druid',
  ]);
  for (const child of children) {
    expect(
      (await rows(page, 'spell_selection_slots')).filter(
        (row) => row.source_instance_id === child.id,
      ),
    ).toHaveLength(3);
  }
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === character.id,
    ),
  ).toMatchObject({ revision: 2 });
});

test('removes a root source through the command and cascades to its nested feat', async ({
  page,
}) => {
  await install(page, workspaceImage);
  for (const [index, rootId, childId] of [
    [
      0,
      workspaceImage.ids.nestedRoot,
      workspaceImage.ids.nestedChild,
    ],
    [
      1,
      workspaceImage.ids.backgroundRoot,
      workspaceImage.ids.backgroundChild,
    ],
  ] as const) {
    const sourceBefore = (await rows(page, 'character_source_instances'))
      .filter((row) => [rootId, childId].includes(row.id));
    const slotBefore = (await rows(page, 'spell_selection_slots')).filter(
      (row) => row.source_instance_id === childId,
    );
    const expectedRevision = index * 2;
    const removed = await execute(
      page,
      workspaceImage.ids.character,
      expectedRevision,
      {
        type: 'remove_source',
        source_instance_id: rootId,
      },
      21 + index,
    );
    expect(
      (await rows(page, 'character_source_instances'))
        .filter((row) => [rootId, childId].includes(row.id))
        .map((row) => row.state),
    ).toEqual(['tombstoned', 'tombstoned']);
    expect(
      (await rows(page, 'spell_selection_slots'))
        .filter((row) => row.source_instance_id === childId)
        .map((row) => row.state),
    ).toEqual(['orphaned', 'orphaned', 'orphaned']);
    await execute(
      page,
      workspaceImage.ids.character,
      expectedRevision + 1,
      removed.inverse,
      210 + index,
    );
    expect(
      (await rows(page, 'character_source_instances')).filter((row) =>
        [rootId, childId].includes(row.id),
      ),
    ).toEqual(sourceBefore);
    expect(
      (await rows(page, 'spell_selection_slots')).filter(
        (row) => row.source_instance_id === childId,
      ),
    ).toEqual(slotBefore);
  }
});

test('round-trips warning acknowledgement with idempotent replay and grouped audit rows', async ({
  page,
}) => {
  await install(page, workspaceImage);
  await execute(
    page,
    workspaceImage.ids.character,
    0,
    { type: 'update_character_rules', allow_legacy: true },
    219,
  );
  const report = await rpc<any>(page, 'queries.reports.build', {
    character_id: workspaceImage.ids.character,
  });
  const warning = report.duplicate_assessments.find(
    (item: any) => item.category === 'conflicting_version',
  );
  expect(warning.warning_fingerprint).toMatch(
    /^conflicting_versions:[a-f0-9]{64}$/,
  );
  const changed = await execute(
    page,
    workspaceImage.ids.character,
    1,
    {
      type: 'acknowledge_warning',
      warning_fingerprint: warning.warning_fingerprint,
      note: 'Intentional.',
    },
    22,
  );
  expect(changed.inverse).toEqual({
    type: 'acknowledge_warning',
    mode: 'delete',
    warning_fingerprint: warning.warning_fingerprint,
    integrity: expect.any(String),
  });
  expect(
    forCharacter(
      await rows(page, 'warning_acknowledgements'),
      workspaceImage.ids.character,
    ),
  ).toEqual([
    expect.objectContaining({
      warning_fingerprint: warning.warning_fingerprint,
      note: 'Intentional.',
      invalidated_at: null,
    }),
  ]);
  const replay = await execute(
    page,
    workspaceImage.ids.character,
    1,
    {
      type: 'acknowledge_warning',
      warning_fingerprint: warning.warning_fingerprint,
      note: 'Changed.',
    },
    22,
  );
  expect(replay).toMatchObject({ revision: 2, idempotent_replay: true });
  expect(
    forCharacter(
      await rows(page, 'warning_acknowledgements'),
      workspaceImage.ids.character,
    )[0],
  ).toMatchObject({ note: 'Intentional.' });
  const audit = (await rows(page, 'change_log')).filter(
    (row) => row.operation_uuid === operation(22),
  );
  expect(audit).toHaveLength(1);
  expect(audit[0]).toMatchObject({
    action_type: 'acknowledge_warning',
    reversible: 1,
  });
  const deleted = await execute(
    page,
    workspaceImage.ids.character,
    2,
    changed.inverse,
    220,
  );
  expect(deleted.inverse).toEqual({
    type: 'acknowledge_warning',
    warning_fingerprint: warning.warning_fingerprint,
    note: 'Intentional.',
  });
  expect(
    forCharacter(
      await rows(page, 'warning_acknowledgements'),
      workspaceImage.ids.character,
    ),
  ).toEqual([]);
  await execute(
    page,
    workspaceImage.ids.character,
    3,
    deleted.inverse,
    221,
  );
  expect(
    forCharacter(
      await rows(page, 'warning_acknowledgements'),
      workspaceImage.ids.character,
    ),
  ).toEqual([
    expect.objectContaining({
      warning_fingerprint: warning.warning_fingerprint,
      note: 'Intentional.',
      invalidated_at: null,
    }),
  ]);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 4 });
});

test('merges a stale slot edit only when intervening operations left that slot untouched', async ({
  page,
}) => {
  await install(page, workspaceImage);
  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.replacementSpell,
    },
    23,
  );
  const merged = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'set_slot',
      slot_id: workspaceImage.ids.secondSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.alternateSpell,
    },
    230,
  );
  expect(merged.revision).toBe(2);
  const collision = await rejectedRpc(page, 'commands.execute', {
    character_id: workspaceImage.ids.character,
    operation_uuid: operation(231),
    expected_revision: 0,
    command: {
      type: 'set_slot',
      slot_id: workspaceImage.ids.targetSlot,
      mode: 'select',
      spell_version_id: workspaceImage.ids.alternateSpell,
    },
  });
  expect(collision).toMatchObject({
    message:
      'This character changed in another tab. Reload before trying again.',
    data: { current_revision: 2 },
  });
  const slots = await rows(page, 'spell_selection_slots');
  expect(
    slots.find((row) => row.id === workspaceImage.ids.targetSlot),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.replacementSpell,
  });
  expect(
    slots.find((row) => row.id === workspaceImage.ids.secondSlot),
  ).toMatchObject({
    current_spell_version_id: workspaceImage.ids.alternateSpell,
  });
  expect(
    forCharacter(
      await rows(page, 'character_operations'),
      workspaceImage.ids.character,
    ),
  ).toHaveLength(2);
});

test('builds the golden read-only report values and duplicate classifications', async ({
  page,
}) => {
  await install(page, reportImage);
  const before = await databaseBytes(page);
  const report = await rpc<any>(page, 'queries.reports.build', {
    character_id: reportImage.ids.character,
  });
  expect(report.character).toEqual({
    id: reportImage.ids.character,
    name: 'R40 Golden',
    character_level: 8,
    proficiency_bonus: 3,
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 16,
      wisdom: 14,
      charisma: 18,
    },
  });
  expect(report.caster).toEqual({
    caster_level: 3,
    slots: [
      { level: 1, count: 4 },
      { level: 2, count: 2 },
    ],
    pact_magic: { count: 2, level: 3 },
  });
  expect(
    report.classes.map((entry: Row) => ({
      name: entry.name,
      subclass: entry.subclass,
      level: entry.class_level,
      ability: entry.spellcasting_ability,
      progression: entry.progression_type,
      prepared: entry.prepared_count,
      maximum: entry.max_preparable_level,
    })),
  ).toEqual([
    {
      name: 'Paladin',
      subclass: null,
      level: 1,
      ability: 'charisma',
      progression: 'half_up',
      prepared: 2,
      maximum: 1,
    },
    {
      name: 'Ranger',
      subclass: null,
      level: 1,
      ability: 'wisdom',
      progression: 'half_up',
      prepared: 2,
      maximum: 1,
    },
    {
      name: 'Warlock',
      subclass: null,
      level: 5,
      ability: 'charisma',
      progression: 'pact',
      prepared: 6,
      maximum: 3,
    },
    {
      name: 'Wizard',
      subclass: null,
      level: 1,
      ability: 'intelligence',
      progression: 'full',
      prepared: 4,
      maximum: 1,
    },
  ]);
  expect(report.preparation_callout).toBe(
    'This build possesses shared Spellcasting slots through 2nd level and Pact Magic slots at 3rd level. Either pool can cast an eligible prepared spell. Class-specific preparation limits reach 3rd-level spells; a slot from either pool does not unlock higher-level choices for another class.',
  );
  expect(
    report.access_routes
      .filter((route: any) => route.spell_name === 'Mage Hand')
      .map((route: any) => route.source_name),
  ).toEqual(['Magic Initiate: Wizard', 'Wizard 1']);
  expect(
    report.duplicate_assessments.find(
      (item: any) => item.spell_name === 'Mage Hand',
    ),
  ).toMatchObject({
    category: 'wasteful',
    selection_count: 2,
    sources: ['Magic Initiate: Wizard', 'Wizard 1'],
    acknowledgement: null,
  });
  expect(
    report.duplicate_assessments.find(
      (item: any) => item.spell_name === 'Shield',
    ),
  ).toMatchObject({
    category: 'conflicting_version',
    versions: [
      expect.objectContaining({ edition: '2014' }),
      expect.objectContaining({ edition: '2024' }),
    ],
    selection_count: 2,
    acknowledgement: null,
  });
  expect(
    report.duplicate_assessments.find(
      (item: Row) => item.spell_name === 'Magic Missile',
    ),
  ).toMatchObject({
    category: 'none',
    selection_count: 1,
  });
  expect(
    report.wizard.spellbook.map((entry: Row) => ({
      name: entry.spell_name,
      prepared: entry.prepared,
      active: entry.active,
    })),
  ).toEqual([
    { name: 'Detect Magic', prepared: false, active: true },
    { name: 'Mage Armor', prepared: true, active: true },
    { name: 'Magic Missile', prepared: true, active: true },
  ]);
  expect(report.wizard.prepared.map((entry: Row) => entry.spell_name)).toEqual([
    'Mage Armor',
    'Magic Missile',
    'Shield',
    'Shield',
  ]);
  expect(
    report.wizard.ritual_only.map((entry: Row) => entry.spell_name),
  ).toEqual(['Detect Magic']);
  expect(report.wizard.explanation).toContain(
    'consumes no preparation capacity',
  );
  expect(
    report.invalid_selections.map((slot: Row) => ({
      id: slot.id,
      state: slot.state,
      eligibility: slot.eligibility,
      reason: slot.invalid_reason ?? slot.orphan_reason,
    })),
  ).toEqual([
    {
      id: reportImage.ids.invalidSlots[0],
      state: 'orphaned',
      eligibility: 'unselected',
      reason: 'grant_rule_removed',
    },
    {
      id: reportImage.ids.invalidSlots[1],
      state: 'active',
      eligibility: 'invalid',
      reason: 'Selected spell is outside the slot level range.',
    },
    {
      id: reportImage.ids.invalidSlots[2],
      state: 'kept_override',
      eligibility: 'invalid',
      reason: 'Selected spell is outside the slot level range.',
    },
  ]);
  expect(
    (await rows(page, 'spell_selection_slots'))
      .filter((row) => reportImage.ids.invalidSlots.includes(row.id))
      .map((row) => row.state),
  ).toEqual(['active', 'orphaned', 'kept_override']);
  await page.goto(`/characters/${reportImage.ids.character}/report`);
  await expect(page.locator('[data-screen="build-report"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'R40 Golden',
  );
  await expect(page.getByTestId('preparation-callout')).toContainText(
    'shared Spellcasting slots through 2nd level and Pact Magic slots at 3rd level',
  );
  await expect(
    page.locator('.duplicate-card[data-category="conflicting_version"]'),
  ).toContainText('Shield (2014)');
  expect(await databaseBytes(page)).toEqual(before);
});

test('builds Mutt printable sources with complete facts and only the mechanically relevant number', async ({
  page,
}) => {
  await install(page, printableImage);
  const before = await databaseBytes(page);
  const printable = await rpc<any>(page, 'queries.reports.printable', {
    character_id: printableImage.ids.character,
    variant: 'reference',
  });
  expect(printable.variant).toBe('reference');
  expect(printable.text_status).toBe('not_requested');
  expect(printable.source_groups.map((group: any) => group.source)).toEqual([
    'Cleric 1',
    'Druid 1',
    'Gift 2',
    'Gift 10',
    'Wizard 1',
  ]);
  expect(
    printable.source_groups.map((group: Row) => ({
      source: group.source,
      ability: group.ability,
      attack_bonus: group.attack_bonus,
      save_dc: group.save_dc,
    })),
  ).toEqual([
    {
      source: 'Cleric 1',
      ability: 'wisdom',
      attack_bonus: 4,
      save_dc: 12,
    },
    {
      source: 'Druid 1',
      ability: 'wisdom',
      attack_bonus: 4,
      save_dc: 12,
    },
    {
      source: 'Gift 2',
      ability: 'charisma',
      attack_bonus: 6,
      save_dc: 14,
    },
    {
      source: 'Gift 10',
      ability: 'charisma',
      attack_bonus: 6,
      save_dc: 14,
    },
    {
      source: 'Wizard 1',
      ability: 'intelligence',
      attack_bonus: 5,
      save_dc: 13,
    },
  ]);
  const command = printable.source_groups
    .flatMap((group: any) => group.spells)
    .find((spell: any) => spell.spell_version_id === printableImage.ids.command);
  expect(command).toEqual({
    spell_version_id: printableImage.ids.command,
    spell_identity_id: expect.any(Number),
    name: 'Command',
    edition: '2024',
    level: 1,
    school: 'Enchantment',
    casting_time: 'Action',
    action_type: 'Action',
    range: '60 feet',
    duration: '1 round',
    concentration: false,
    ritual: false,
    components: 'V',
    spellcasting_ability: 'wisdom',
    attack_bonus: null,
    save_dc: 12,
    attack_modes: [],
    casting_mode: 'with_slots',
    save_abilities: ['wisdom'],
    description: null,
    // BOTH progressions, ABSENT rather than empty-because-we-checked. The
    // parity fixture's catalog record carries neither `upcastLevels` nor
    // `cantripUpgradeLevels`, which is what every catalog document already in
    // the wild looks like — and the printable card prints no line at all for
    // either, rather than an em-dash that would claim the spell cannot be
    // upcast.
    upcast_levels: [],
    upcast_summary: null,
    cantrip_upgrade_levels: [],
    cantrip_upgrade_summary: null,
  });
  const thornWhip = printable.source_groups
    .flatMap((group: Row) => group.spells)
    .find((spell: Row) => spell.name === 'Thorn Whip');
  expect(thornWhip).toMatchObject({
    action_type: 'Bonus Action',
    spellcasting_ability: 'wisdom',
    attack_bonus: 4,
    save_dc: null,
    attack_modes: ['melee_spell', 'ranged_spell'],
    save_abilities: [],
    casting_mode: 'at_will',
  });
  const mistyStep = printable.source_groups
    .flatMap((group: any) => group.spells)
    .find(
      (spell: any) =>
        spell.spell_version_id === printableImage.ids.mistyStep,
    );
  expect(mistyStep).toMatchObject({
    name: 'Misty Step',
    casting_mode: 'slots_and_free_cast',
    spellcasting_ability: 'charisma',
    attack_bonus: null,
    save_dc: null,
  });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === printableImage.ids.mistyStepSlot,
    ),
  ).toMatchObject({
    fixed_spell_version_id: printableImage.ids.mistyStep,
    with_slots: 1,
    free_cast:
      '{"uses":1,"recovery":"long_rest","pool_scope":"per_spell"}',
  });
  await page.goto(`/characters/${printableImage.ids.character}/print`);
  await expect(page.locator('[data-screen="printable-list"]')).toBeVisible();
  await expect(
    page.locator(
      `.spell-card[data-spell-version="${printableImage.ids.command}"]`,
    ).first(),
  ).toContainText('Saving throw: DC 12 · WIS');
  await expect(
    page.locator(
      `.spell-card[data-spell-version="${printableImage.ids.mistyStep}"]`,
    ),
  ).toContainText('Access: Slots And Free Cast · CHA');
  expect(await databaseBytes(page)).toEqual(before);
});

test('imports the real index into identities versions publications and normalized pivots idempotently', async ({
  page,
}) => {
  await install(page, catalogImage);
  const legacy = catalogRecord({
    versionKey: '2014:php-parity-spell',
    edition: '2014',
    name: 'PHP Parity Spell',
    sourceBooks: ['Legacy Book'],
    attackModes: ['ranged_spell'],
    spellLists: ['Wizard'],
  });
  const modernA = catalogRecord({
    sourceBooks: ['Modern A'],
    sourcePage: 81,
  });
  const modernB = catalogRecord({
    sourceBooks: ['Modern B'],
    sourcePage: 82,
    spellLists: ['Cleric', 'Wizard'],
    attackModes: ['melee_spell', 'ranged_spell'],
    tags: ['beta', 'parity'],
  });
  const documents = [
    JSON.stringify([legacy, modernA]),
    JSON.stringify([modernB]),
  ];
  const first = await rpc<any>(page, 'catalog.import', { documents });
  expect(first).toMatchObject({
    created: 2,
    identities_created: 1,
    publications_created: 3,
    memberships_created: 3,
    attack_modes_created: 3,
    save_abilities_created: 2,
  });
  const versions = await rows(page, 'spell_versions');
  expect(
    versions.map((row) => ({
      content_key: row.content_key,
      rules_edition: row.rules_edition,
      spell_identity_id: row.spell_identity_id,
    })),
  ).toEqual([
    {
      content_key: '2014:php-parity-spell',
      rules_edition: '2014',
      spell_identity_id: 1,
    },
    {
      content_key: '2024:php-parity-spell',
      rules_edition: '2024',
      spell_identity_id: 1,
    },
  ]);
  expect(
    (await rows(page, 'spell_version_publications')).map(
      (row) => ({
        version: versions.find((version) => version.id === row.spell_version_id)!
          .content_key,
        book: row.source_book,
        page: row.source_page,
      }),
    ),
  ).toEqual([
    { version: '2014:php-parity-spell', book: 'Legacy Book', page: 81 },
    { version: '2024:php-parity-spell', book: 'Modern A', page: 81 },
    { version: '2024:php-parity-spell', book: 'Modern B', page: 82 },
  ]);
  expect(
    (await rows(page, 'spell_list_memberships')).map((row) => ({
      version: versions.find((version) => version.id === row.spell_version_id)!
        .content_key,
      list: row.spell_list_key,
    })),
  ).toEqual([
    { version: '2014:php-parity-spell', list: 'Wizard' },
    { version: '2024:php-parity-spell', list: 'Cleric' },
    { version: '2024:php-parity-spell', list: 'Wizard' },
  ]);
  expect(
    (await rows(page, 'spell_version_attack_modes')).map((row) => ({
      version: versions.find((version) => version.id === row.spell_version_id)!
        .content_key,
      mode: row.attack_mode,
    })),
  ).toEqual([
    { version: '2014:php-parity-spell', mode: 'ranged_spell' },
    { version: '2024:php-parity-spell', mode: 'melee_spell' },
    { version: '2024:php-parity-spell', mode: 'ranged_spell' },
  ]);
  expect(
    (await rows(page, 'spell_version_save_abilities')).map((row) => ({
      version: versions.find((version) => version.id === row.spell_version_id)!
        .content_key,
      ability: row.save_ability,
    })),
  ).toEqual([
    { version: '2014:php-parity-spell', ability: 'wisdom' },
    { version: '2024:php-parity-spell', ability: 'wisdom' },
  ]);
  expect(
    new Set(
      (await rows(page, 'spell_version_tags'))
        .filter(
          (row) =>
            versions.find((version) => version.id === row.spell_version_id)!
              .content_key === '2024:php-parity-spell',
        )
        .map((row) => row.tag),
    ),
  ).toEqual(new Set(['beta', 'concentration', 'parity', 'ritual']));
  const ids = versions.map((row) => ({
    id: row.id,
    content_key: row.content_key,
  }));
  expect(
    await rpc<any>(page, 'catalog.import', { documents }),
  ).toMatchObject({
    created: 0,
    updated: 0,
    tombstoned: 0,
    publications_created: 0,
    memberships_created: 0,
    tags_created: 0,
    attack_modes_created: 0,
    save_abilities_created: 0,
  });
  expect(
    (await rows(page, 'spell_versions')).map((row) => ({
      id: row.id,
      content_key: row.content_key,
    })),
  ).toEqual(ids);
  await page.reload();
  await ready(page);
  expect(await rows(page, 'spell_versions')).toHaveLength(2);
});

test('whole-database and portable-character export/import round-trip, corrupt-version rollback, and reload', async ({
  page,
}) => {
  await install(page, workspaceImage);
  const initialRows = await rows(page, 'characters');
  const exported = await page.evaluate(async (characterId) => {
    const character = await window.appRpc.call<
      { characterId: number },
      any
    >('backup.exportCharacter', { characterId });
    const database = await window.appRpc.call<
      Record<string, never>,
      any
    >('backup.exportDatabase', {});
    return { character, database };
  }, workspaceImage.ids.character);
  expect(exported.character).toMatchObject({
    format: 'dnd-multiclass-spells/character',
    version: 1,
    source_character_id: workspaceImage.ids.character,
  });
  expect(exported.database).toMatchObject({
    format: 'dnd-multiclass-spells/database',
    version: 1,
  });

  await rpc(page, 'queries.characters.create', { name: 'Discarded' });
  await rpc(page, 'backup.importDatabase', {
    backup: exported.database,
  });
  expect(await rows(page, 'characters')).toEqual(initialRows);

  const imported = await rpc<any>(page, 'backup.importCharacter', {
    document: exported.character,
  });
  expect(imported.characterId).not.toBe(workspaceImage.ids.character);
  expect((await rows(page, 'characters')).map((row) => row.name)).toEqual([
    'R40 Golden',
    'R40 Golden',
  ]);
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      imported.characterId,
    ).length,
  ).toBe(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ).length,
  );
  expect(await portableTableCounts(page, imported.characterId)).toEqual(
    Object.fromEntries(
      Object.entries(exported.character.tables).map(([table, tableRows]) => [
        table,
        (tableRows as Row[]).length,
      ]),
    ),
  );

  const countBeforeCorruption = (await rows(page, 'characters')).length;
  const beforeCorruption = await databaseBytes(page);
  const corruptCharacter = structuredClone(exported.character);
  corruptCharacter.version = 99;
  expect(
    (
      await rejectedRpc(page, 'backup.importCharacter', {
        document: corruptCharacter,
      })
    ).message,
  ).toBe('Unsupported character backup version 99.');
  const corruptDatabase = structuredClone(exported.database);
  corruptDatabase.version = 99;
  expect(
    (
      await rejectedRpc(page, 'backup.importDatabase', {
        backup: corruptDatabase,
      })
    ).message,
  ).toBe('Unsupported database backup version 99.');
  expect(await databaseBytes(page)).toEqual(beforeCorruption);
  expect(await rows(page, 'characters')).toHaveLength(countBeforeCorruption);
  await page.reload();
  await ready(page);
  expect(await rows(page, 'characters')).toHaveLength(2);
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      imported.characterId,
    ).length,
  ).toBeGreaterThan(0);
});

test('fresh-profile catalog import → create/use → export → reload durability journey', async ({
  page,
}) => {
  await install(page, catalogImage);
  const imported = await rpc<any>(page, 'catalog.import', {
    documents: [
      JSON.stringify([
        catalogRecord({
          identityKey: 'journey-spell',
          versionKey: '2024:journey-spell',
          name: 'Journey Spell',
          level: 0,
          concentration: false,
          ritual: false,
          tags: [],
          saveAbilities: [],
          sourceBooks: ['Journey Book'],
          sourceSlug: 'journey-spell',
        }),
      ]),
    ],
  });
  expect(imported.created).toBe(1);
  const spell = (await rows(page, 'spell_versions')).find(
    (row) => row.content_key === '2024:journey-spell',
  )!;
  const character = await rpc<any>(page, 'queries.characters.create', {
    name: 'Fresh Journey',
  });
  const wizardClass = (await rows(page, 'class_definitions')).find(
    (row) => row.name === 'Wizard',
  )!;
  await execute(
    page,
    character.id,
    0,
    {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: wizardClass.id,
      config: { level: 1 },
    },
    28,
  );
  const slot = forCharacter(
    await rows(page, 'spell_selection_slots'),
    character.id,
  ).find(
    (row) =>
      row.rule_key === 'wizard-cantrips' && row.ordinal === 1,
  )!;
  expect(
    await rpc<any[]>(page, 'queries.eligibleSpells.search', {
      character_id: character.id,
      slot_id: slot.id,
      query: 'Journey Spell',
    }),
  ).toEqual([
    {
      id: spell.id,
      name: 'Journey Spell',
      level: 0,
      school: 'Evocation',
      ritual: false,
      concentration: false,
      edition: '2024',
    },
  ]);
  await execute(
    page,
    character.id,
    1,
    {
      type: 'set_slot',
      slot_id: slot.id,
      mode: 'select',
      spell_version_id: spell.id,
    },
    280,
  );
  const backups = await page.evaluate(async (characterId) => ({
    character: await window.appRpc.call('backup.exportCharacter', {
      characterId,
    }),
    database: await window.appRpc.call('backup.exportDatabase', {}),
  }), character.id);
  expect(backups.character).toMatchObject({
    format: 'dnd-multiclass-spells/character',
    source_character_id: character.id,
  });
  expect(backups.database).toMatchObject({
    format: 'dnd-multiclass-spells/database',
    version: 1,
  });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === slot.id,
    ),
  ).toMatchObject({
    current_spell_version_id: spell.id,
    selection_eligibility: 'valid',
  });

  await page.reload();
  await ready(page);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === character.id,
    ),
  ).toMatchObject({ name: 'Fresh Journey', revision: 2 });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === slot.id,
    ),
  ).toMatchObject({ current_spell_version_id: spell.id });
  const clone = await rpc<any>(page, 'backup.importCharacter', {
    document: backups.character,
  });
  expect(await rows(page, 'characters')).toHaveLength(2);
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      clone.characterId,
    ).some((row) => row.current_spell_version_id === spell.id),
  ).toBe(true);
});
