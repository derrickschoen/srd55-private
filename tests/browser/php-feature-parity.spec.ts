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
    expect.objectContaining({
      id: workspaceImage.ids.character,
      name: 'R40 Golden',
      level: 8,
      classes: ['Paladin 1', 'Ranger 1', 'Warlock 5', 'Wizard 1'],
    }),
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
    },
  });
  expect(workspace.source_catalog.feat).toContainEqual(
    expect.objectContaining({ configuration_kind: 'magic_initiate' }),
  );
  expect(workspace.source_catalog.species).toContainEqual(
    expect.objectContaining({
      configuration_kind: 'origin_feat_magic_initiate',
    }),
  );
  expect(workspace.slots.length).toBeGreaterThan(10);

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
  expect(first[0]).toMatchObject({
    level: 8,
    classes: ['Paladin 1', 'Ranger 1', 'Warlock 5', 'Wizard 1'],
  });
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
    'save_points',
  ]);
  expect(workspace.revision).toBe(0);
  expect(workspace.allow_legacy).toBe(false);
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
  ]) {
    expect(document.tables[table]).toEqual(
      forCharacter(await rows(page, table), workspaceImage.ids.character),
    );
  }
  expect(Object.keys(document.tables).sort()).toEqual([
    'character_class_levels',
    'character_rule_overrides',
    'character_save_points',
    'character_source_instances',
    'character_spell_preferences',
    'spell_loadout_entries',
    'spell_loadouts',
    'spell_selection_slots',
    'warning_acknowledgements',
    'wizard_spellbook_entries',
  ]);
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
  expect(changed.inverse).toMatchObject({
    type: 'set_slot',
    slot_id: workspaceImage.ids.targetSlot,
    mode: 'restore',
    state: {
      current_spell_version_id: workspaceImage.ids.originalSpell,
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
    schema_version: 'a7-v1',
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
  expect(after.length).toBeGreaterThan(before.length);
  expect(
    forCharacter(
      await rows(page, 'character_class_levels'),
      workspaceImage.ids.character,
    ).find(
      (row) =>
        row.class_definition_id === workspaceImage.ids.sorcererClass,
    ),
  ).toMatchObject({ level: 1, is_starting_class: 0 });
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
  });
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
    snapshot: { schema_version: 'a7-v1' },
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
  await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_source_config',
      source_instance_id: workspaceImage.ids.magicInitiateSource,
      chosen_list: 'Cleric',
    },
    18,
  );
  expect(
    (await rows(page, 'character_source_instances')).find(
      (row) => row.id === workspaceImage.ids.magicInitiateSource,
    ),
  ).toMatchObject({
    display_name: 'Magic Initiate: Cleric',
    config:
      '{"chosen_list":"Cleric","spellcasting_ability":"wisdom"}',
  });
  const generated = (await rows(page, 'spell_selection_slots')).filter(
    (row) =>
      row.source_instance_id === workspaceImage.ids.magicInitiateSource &&
      String(row.rule_key).startsWith('magic-initiate-'),
  );
  expect(generated).toHaveLength(3);
  expect(generated.map((row) => row.allowed_spell_lists)).toEqual([
    '["Cleric"]',
    '["Cleric"]',
    '["Cleric"]',
  ]);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 1 });
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

  const beforeBadWizard = {
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
  }).toEqual(beforeBadWizard);

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
  expect(
    forCharacter(
      await rows(page, 'wizard_spellbook_entries'),
      character.id,
    ),
  ).toEqual([
    expect.objectContaining({
      spell_version_id: workspaceImage.ids.acquisitionSpell,
    }),
  ]);
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
  const sourceBefore = (await rows(page, 'character_source_instances'))
    .filter((row) =>
      [workspaceImage.ids.nestedRoot, workspaceImage.ids.nestedChild]
        .includes(row.id),
    );
  const slotBefore = (await rows(page, 'spell_selection_slots')).filter(
    (row) => row.source_instance_id === workspaceImage.ids.nestedChild,
  );
  const removed = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'remove_source',
      source_instance_id: workspaceImage.ids.nestedRoot,
    },
    21,
  );
  expect(
    (await rows(page, 'character_source_instances'))
      .filter((row) =>
        [workspaceImage.ids.nestedRoot, workspaceImage.ids.nestedChild]
          .includes(row.id),
      )
      .map((row) => row.state),
  ).toEqual(['tombstoned', 'tombstoned']);
  expect(
    (await rows(page, 'spell_selection_slots'))
      .filter(
        (row) => row.source_instance_id === workspaceImage.ids.nestedChild,
      )
      .map((row) => row.state),
  ).toEqual(['orphaned', 'orphaned', 'orphaned']);
  await execute(
    page,
    workspaceImage.ids.character,
    1,
    removed.inverse,
    210,
  );
  expect(
    (await rows(page, 'character_source_instances')).filter((row) =>
      [workspaceImage.ids.nestedRoot, workspaceImage.ids.nestedChild]
        .includes(row.id),
    ),
  ).toEqual(sourceBefore);
  expect(
    (await rows(page, 'spell_selection_slots')).filter(
      (row) => row.source_instance_id === workspaceImage.ids.nestedChild,
    ),
  ).toEqual(slotBefore);
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
  await execute(
    page,
    workspaceImage.ids.character,
    2,
    changed.inverse,
    220,
  );
  expect(
    forCharacter(
      await rows(page, 'warning_acknowledgements'),
      workspaceImage.ids.character,
    ),
  ).toEqual([]);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({ revision: 3 });
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
    report.access_routes
      .filter((route: any) => route.spell_name === 'Mage Hand')
      .map((route: any) => route.source_name),
  ).toEqual(['Magic Initiate: Wizard', 'Wizard 1']);
  expect(
    report.duplicate_assessments.find(
      (item: any) => item.spell_name === 'Mage Hand',
    ),
  ).toMatchObject({ category: 'wasteful' });
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
  });
  expect(report.invalid_selections.map((slot: any) => slot.id)).toEqual(
    reportImage.ids.invalidSlots,
  );
  expect(
    (await rows(page, 'spell_selection_slots'))
      .filter((row) => reportImage.ids.invalidSlots.includes(row.id))
      .map((row) => row.state),
  ).toEqual(['active', 'orphaned', 'kept_override']);
  await page.goto(`/characters/${reportImage.ids.character}/report`);
  await expect(page.locator('[data-screen="build-report"]')).toBeVisible();
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
  const command = printable.source_groups
    .flatMap((group: any) => group.spells)
    .find((spell: any) => spell.spell_version_id === printableImage.ids.command);
  expect(command).toMatchObject({
    name: 'Command',
    spellcasting_ability: 'wisdom',
    attack_bonus: null,
    save_dc: 12,
    casting_mode: 'with_slots',
    save_abilities: ['wisdom'],
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
      (row) => row.source_book,
    ),
  ).toEqual(['Legacy Book', 'Modern A', 'Modern B']);
  expect(
    new Set(
      (await rows(page, 'spell_list_memberships')).map(
        (row) => row.spell_list_key,
      ),
    ),
  ).toEqual(new Set(['Cleric', 'Wizard']));
  expect(
    new Set(
      (await rows(page, 'spell_version_tags')).map((row) => row.tag),
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

  const countBeforeCorruption = (await rows(page, 'characters')).length;
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
    expect.objectContaining({ id: spell.id, name: 'Journey Spell' }),
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
