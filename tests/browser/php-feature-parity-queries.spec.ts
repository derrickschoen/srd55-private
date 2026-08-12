import { expect, test } from './fixtures/parallel-test';
import {
  workspaceFixtureImage,
  type FixtureImage,
  type WorkspaceFixtureIds,
} from './fixtures/php-parity';
import {
  databaseBytes,
  execute,
  forCharacter,
  install,
  operation,
  ready,
  rows,
  rpc,
  type Row,
} from './fixtures/php-feature-parity-helpers';

let workspaceImage: FixtureImage<WorkspaceFixtureIds>;

test.beforeAll(async () => {
  workspaceImage = await workspaceFixtureImage();
});

test('serves the seeded character list and editable workspace', async ({
  page,
}) => {
  // The four-worker parallel pool measured 39.3s; 100s preserves at least
  // 2.5x wall-clock headroom under parallel-pool contention.
  test.setTimeout(100_000);
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
      level_one_complete: false,
      level: 8,
      classes: [
        { name: 'Paladin', level: 1, catalog_layer: 'bundled' },
        { name: 'Ranger', level: 1, catalog_layer: 'bundled' },
        { name: 'Warlock', level: 5, catalog_layer: 'bundled' },
        { name: 'Wizard', level: 1, catalog_layer: 'bundled' },
      ],
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
  // The four-worker parallel pool measured 35.1s; 90s preserves at least 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(90_000);
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const first = await rpc<any[]>(page, 'queries.characters.list', {});
  const second = await rpc<any[]>(page, 'queries.characters.list', {});
  expect(first).toEqual(second);
  expect(first.map((card) => card.name)).toEqual(['R40 Golden']);
  expect(first).toEqual([{
    id: workspaceImage.ids.character,
    name: 'R40 Golden',
    level_one_complete: false,
    level: 8,
    classes: [
      { name: 'Paladin', level: 1, catalog_layer: 'bundled' },
      { name: 'Ranger', level: 1, catalog_layer: 'bundled' },
      { name: 'Warlock', level: 5, catalog_layer: 'bundled' },
      { name: 'Wizard', level: 1, catalog_layer: 'bundled' },
    ],
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
  // The four-worker parallel pool measured 35.2s; 90s preserves at least 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(90_000);
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
    'starting_class_resolution',
    'available_classes',
    'allow_legacy',
    'multiclass_prerequisite_house_rule',
    'flavor',
    'configurable_sources',
    'order_sources',
    'source_catalog',
    'removable_sources',
    'spell_lists',
    'slots',
    'placeholder_spells',
    'weapons',
    'items',
    'save_points',
  ]);
  expect(workspace.starting_class_resolution).toEqual({
    class_level_id: workspace.classes[0].id,
    warnings: [
      expect.objectContaining({ code: 'no_starting_class' }),
    ],
  });
  expect(workspace.revision).toBe(0);
  expect(workspace.allow_legacy).toBe(false);
  expect(workspace.multiclass_prerequisite_house_rule).toEqual({ status: 'off' });
  expect(workspace.flavor).toEqual({
    alignment: null,
    appearance: null,
    backstory: null,
    notes: null,
  });
  expect(workspace.spell_lists).toEqual(['Cleric', 'Druid', 'Wizard']);
  expect(workspace.save_points).toEqual([]);
  expect(workspace.items).toEqual({
    definitions: [],
    items: [{
      id: expect.any(Number),
      name: 'Healing Potion',
      description: 'Browser parity possession',
      quantity: 4,
      requires_attunement: false,
      source_instance_id: null,
      attunement_slot: null,
      effects: [],
    }],
  });
  expect(workspace.report.summary).toEqual({
    unique_spells: 8,
    access_routes: 9,
    warning_count: 4,
  });
  expect(workspace.classes.map((item: Row) => ({
    name: item.name,
    is_starting_class: item.is_starting_class,
  }))).toEqual([
    { name: 'Wizard', is_starting_class: false },
    { name: 'Paladin', is_starting_class: false },
    { name: 'Ranger', is_starting_class: false },
    { name: 'Warlock', is_starting_class: false },
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
        display_name: 'Report Fixture Feat: Cleric',
        chosen_list: 'Cleric',
      }),
      expect.objectContaining({
        display_name: 'Report Fixture Feat: Druid',
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
      display_name: 'Magic Initiate: Wizard',
      chosen_list: 'Wizard',
      spellcasting_ability: 'intelligence',
    },
    {
      display_name: 'Report Fixture Feat: Cleric',
      chosen_list: 'Cleric',
      spellcasting_ability: 'wisdom',
    },
    {
      display_name: 'Report Fixture Feat: Druid',
      chosen_list: 'Druid',
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
  // The four-worker parallel pool measured 35.4s; 90s preserves at least 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(90_000);
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
      catalog_layer: 'bundled',
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
  // The four-worker parallel pool measured 35.2s; 90s preserves at least 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(90_000);
  await install(page, workspaceImage);
  const before = await databaseBytes(page);
  const document = await rpc<any>(page, 'backup.exportCharacter', {
    characterId: workspaceImage.ids.character,
  });
  expect(document).toMatchObject({
    format: 'dnd-multiclass-spells/character',
    version: 6,
    source_character_id: workspaceImage.ids.character,
    character: { name: 'R40 Golden', revision: 0 },
  });
  for (const table of [
    'character_class_levels',
    'character_level_feat_choices',
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
    'character_attunement_slots',
    'character_items',
    'character_skill_expertise_grants',
  ]) {
    expect(document.tables[table]).toEqual(
      forCharacter(await rows(page, table), workspaceImage.ids.character),
    );
  }
  expect(Object.keys(document.tables.character_items[0])).toEqual([
    'id',
    'character_id',
    'name',
    'description',
    'quantity',
    'requires_attunement',
    'source_instance_id',
    'created_at',
    'updated_at',
  ]);
  expect(Object.keys(document.tables).sort()).toEqual([
    // Added when the four stored sheet inputs became portable, for exactly the
    // reason the weapons and origin keys were added: a backup without them
    // silently loses the player's armour, rolls and skill choices.
    'character_armor',
    // D92 makes attunement a fixed character-owned row. A backup without it
    // keeps the possessions but silently loses which item effects apply.
    'character_attunement_slots',
    // Added when the character's origin became portable, for the same reason
    // the weapons key was: a backup without it silently loses the species.
    'character_background',
    'character_class_levels',
    // Added when the effect model was inverted: an effect is a row of the
    // character's own now, and a backup without this key silently loses every
    // resistance and hit point bonus they have.
    'character_effects',
    'character_hit_point_rolls',
    // Added when the AC-1 (D72) items table joined the portable document: a
    // backup without this key silently loses every thing the player owns
    // that only modifies.
    'character_items',
    // LU-1 provenance is character state; omitting it turns a resolved feat
    // back into an owed choice (or loses the occurrence entirely).
    'character_level_feat_choices',
    'character_rule_overrides',
    'character_save_points',
    'character_sheet_adjustments',
    'character_skill_expertise_grants',
    // Added when skill grants became the source of truth (S-A): a backup
    // without them silently loses every choice's provenance, keeping only
    // the flat projection.
    'character_skill_grants',
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
    'character_attunement_slots',
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
