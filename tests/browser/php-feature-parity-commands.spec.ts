import { expect, test } from './fixtures/parallel-test';
import {
  workspaceFixtureImage,
  catalogBaseFixtureImage,
  type FixtureImage,
  type WorkspaceFixtureIds,
  type SourceCatalogIds,
} from './fixtures/php-parity';
import {
  execute,
  forCharacter,
  install,
  operation,
  ready,
  rejectedRpc,
  restoreSavePoint,
  rows,
  rpc,
  undo,
} from './fixtures/php-feature-parity-helpers';

let workspaceImage: FixtureImage<WorkspaceFixtureIds>;
let multiclassWorkspaceImage: FixtureImage<WorkspaceFixtureIds>;
let catalogImage: FixtureImage<SourceCatalogIds>;

test.beforeAll(async () => {
  [workspaceImage, multiclassWorkspaceImage, catalogImage] =
    await Promise.all([
      workspaceFixtureImage(),
      workspaceFixtureImage({
        primaryCharacterAbilities: { strength: 13, dexterity: 13 },
      }),
      catalogBaseFixtureImage(),
    ]);
});

test('creates and opens an empty character without additional setup', async ({
  page,
}) => {
  // Measured at 18.2s alone on Chromium; allow for concurrent-suite contention.
  test.setTimeout(60_000);
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
    character_level: null,
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
  // Measured at 15.9s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  // Measured at 16.1s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  const storedInverse = JSON.parse(String(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === changed.operation_uuid,
    )?.inverse_command,
  ));
  expect(storedInverse).toEqual({
    type: 'set_slot',
    slot_id: workspaceImage.ids.targetSlot,
    mode: 'restore',
    state: {
      current_spell_version_id: workspaceImage.ids.originalSpell,
      selection_acquired_at_class_level:
        original.selection_acquired_at_class_level,
      selection_eligibility: original.selection_eligibility,
      selection_invalid_reason: original.selection_invalid_reason,
      state: original.state,
      override_note: original.override_note,
    },
    integrity: expect.any(String),
  });
  await undo(
    page,
    workspaceImage.ids.character,
    1,
    changed.operation_uuid,
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
  // Measured at 16.0s alone on Chromium; allow for concurrent-suite contention.
  test.setTimeout(60_000);
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
  // Measured at 16.1s alone on Chromium; allow for concurrent-suite contention.
  test.setTimeout(60_000);
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
    // a7-v15 adds durable level-feat provenance; a7-v14 remains frozen before
    // that table became character state.
    schema_version: 'a7-v16',
  });
  expect(point.schema_version).not.toBe('a7-v15');
  const pointSnapshot = JSON.parse(String(point.snapshot)) as {
    character_items: Array<Record<string, unknown>>;
  };
  expect(Object.keys(pointSnapshot.character_items[0]!)).toEqual([
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
  const restored = await restoreSavePoint(
    page,
    workspaceImage.ids.character,
    point.id,
    1,
  );
  expect(restored).toMatchObject({ status: 'applied', revision: 2 });
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
  // Measured at 15.2s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  // Measured at 15.3s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
  await install(page, workspaceImage);
  await rpc(page, 'queries.characters.allocateAbilities', {
    character_id: workspaceImage.ids.character,
    method: 'manual',
    scores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 16,
      wisdom: 14,
      charisma: 18,
    },
    operation_uuid: operation(120),
    expected_revision: 0,
  });
  const result = await execute(
    page,
    workspaceImage.ids.character,
    1,
    {
      type: 'update_ability',
      ability: 'wisdom',
      score: 16,
      reason: 'Mutation contract.',
    },
    12,
  );
  expect(result).toEqual({
    operation_uuid: operation(12),
    revision: 2,
    idempotent_replay: false,
  });
  expect(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === operation(12),
    ),
  ).toMatchObject({
    character_id: workspaceImage.ids.character,
    expected_revision: 1,
    resulting_revision: 2,
    inverse_command: JSON.stringify({
      type: 'update_ability',
      ability: 'wisdom',
      score: 14,
    }),
  });
  expect(
    (await rows(page, 'change_log')).find(
      (row) => row.operation_uuid === operation(12),
    ),
  ).toMatchObject({
    sequence: 2,
    reason: 'Mutation contract.',
    action_type: 'update_ability',
    reversible: 1,
  });
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({
    wisdom: 16,
    ability_allocation_method: 'manual',
    revision: 2,
  });
});

test('first workspace edit stores a snapshot inverse whose undo restores an unclaimed allocation', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await install(page, workspaceImage);
  const changed = await execute(
    page,
    workspaceImage.ids.character,
    0,
    {
      type: 'update_ability',
      ability: 'wisdom',
      score: 16,
    },
    121,
  );
  const storedInverse = JSON.parse(String(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === changed.operation_uuid,
    )?.inverse_command,
  )) as Record<string, unknown>;
  expect(Object.keys(storedInverse).sort()).toEqual(['snapshot', 'type']);
  expect(storedInverse).toMatchObject({
    type: 'internal_snapshot_restore',
    snapshot: expect.any(Object),
  });

  await undo(
    page,
    workspaceImage.ids.character,
    1,
    changed.operation_uuid,
  );
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === workspaceImage.ids.character,
    ),
  ).toMatchObject({
    wisdom: 14,
    ability_allocation_method: null,
    revision: 2,
  });
});

test('adding a class level generates new slots without disturbing existing slots', async ({
  page,
}) => {
  // Measured at 15.5s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
  const image = multiclassWorkspaceImage;
  await install(page, image);
  const before = forCharacter(
    await rows(page, 'spell_selection_slots'),
    image.ids.character,
  );
  await execute(
    page,
    image.ids.character,
    0,
    {
      type: 'update_class',
      class_definition_id: image.ids.sorcererClass,
      subclass_definition_id: null,
    },
    13,
  );
  const after = forCharacter(
    await rows(page, 'spell_selection_slots'),
    image.ids.character,
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
      image.ids.character,
    ).find(
      (row) =>
        row.class_definition_id === image.ids.sorcererClass,
    ),
  ).toMatchObject({
    level: 1,
    is_starting_class: 0,
    subclass_definition_id: null,
  });
  expect(
    forCharacter(
      await rows(page, 'character_source_instances'),
      image.ids.character,
    ).find(
      (row) =>
        row.source_definition_id === image.ids.sorcererClass,
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
        image.ids.character,
      ).find(
        (row) =>
          row.source_definition_id === image.ids.sorcererClass,
      )!.id,
    ]),
  );
});

test('undoes a structural class change through its snapshot inverse', async ({
  page,
}) => {
  // Measured at 15.2s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
  const image = multiclassWorkspaceImage;
  await install(page, image);
  const before = {
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      image.ids.character,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      image.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      image.ids.character,
    ),
  };
  const changed = await execute(
    page,
    image.ids.character,
    0,
    {
      type: 'update_class',
      class_definition_id: image.ids.sorcererClass,
      subclass_definition_id: null,
    },
    14,
  );
  const storedClassInverse = JSON.parse(String(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === changed.operation_uuid,
    )?.inverse_command,
  )) as { type: string; snapshot: { schema_version: string } };
  expect(storedClassInverse).toEqual({
    type: 'internal_snapshot_restore',
    snapshot: expect.objectContaining({ schema_version: 'a7-v16' }),
  });
  expect(storedClassInverse.snapshot.schema_version).not.toBe('a7-v15');
  await undo(
    page,
    image.ids.character,
    1,
    changed.operation_uuid,
  );
  expect({
    levels: forCharacter(
      await rows(page, 'character_class_levels'),
      image.ids.character,
    ),
    sources: forCharacter(
      await rows(page, 'character_source_instances'),
      image.ids.character,
    ),
    slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      image.ids.character,
    ),
  }).toEqual(before);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === image.ids.character,
    ),
  ).toMatchObject({ revision: 2 });
});

test('rejects stale revisions and replays an operation idempotently', async ({
  page,
}) => {
  // Measured at 15.3s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  // Measured at 15.1s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  await undo(
    page,
    workspaceImage.ids.character,
    1,
    enabled.operation_uuid,
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
