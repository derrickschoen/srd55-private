import { expect, test } from './fixtures/parallel-test';
import {
  workspaceFixtureImage,
  type FixtureImage,
  type WorkspaceFixtureIds,
} from './fixtures/php-parity';
import {
  execute,
  forCharacter,
  install,
  operation,
  rejectedRpc,
  restoreSavePoint,
  rows,
  rpc,
  undo,
} from './fixtures/php-feature-parity-helpers';

let workspaceImage: FixtureImage<WorkspaceFixtureIds>;

test.beforeAll(async () => {
  workspaceImage = await workspaceFixtureImage();
});

test('round-trips source configuration with one audit group and rejects unsupported Magic Initiate lists', async ({
  page,
}) => {
  // Measured at 15.5s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  await undo(
    page,
    workspaceImage.ids.character,
    1,
    changed.operation_uuid,
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
  // Measured at 15.6s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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

test('adds a class source with planned slots and addressed spellbook acquisitions atomically (strict superset of the replaced config-acquisition case)', async ({
  page,
}) => {
  // Measured at 15.4s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
  await install(page, workspaceImage);
  const character = await rpc<any>(page, 'queries.characters.create', {
    name: 'Class Source Command',
  });
  await rpc<unknown>(page, 'queries.savePoints.create', {
    character_id: character.id,
    label: 'Before class-source experiment',
  });
  const cleanSlate = forCharacter(
    await rows(page, 'character_save_points'),
    character.id,
  )[0]!;
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
    spellbook: forCharacter(
      await rows(page, 'wizard_spellbook_entries'),
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
    spellbook: forCharacter(
      await rows(page, 'wizard_spellbook_entries'),
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
      config: { level: 20 },
    },
  });
  expect(invalid.message).toBe('A character cannot exceed level 20.');
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
    spellbook: forCharacter(
      await rows(page, 'wizard_spellbook_entries'),
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
      config: { level: 1 },
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
    config: '{"spellcasting_ability":"intelligence"}',
  });
  const acquisitions = forCharacter(
    await rows(page, 'wizard_spellbook_entries'),
    character.id,
  );
  expect(acquisitions).toHaveLength(6);
  expect(
    acquisitions.map((entry) => ({
      source_instance_id: entry.source_instance_id,
      rule_key: entry.rule_key,
      ordinal: entry.ordinal,
      acquired_at_class_level: entry.acquired_at_class_level,
      spell_version_id: entry.spell_version_id,
      spell_level_min: entry.spell_level_min,
      spell_level_max: entry.spell_level_max,
      allowed_spell_lists: entry.allowed_spell_lists,
      state: entry.state,
      selection_eligibility: entry.selection_eligibility,
    })),
  ).toEqual(
    [1, 2, 3, 4, 5, 6].map((ordinal) => ({
      source_instance_id: wizardSource.id,
      rule_key: 'wizard-spellbook',
      ordinal,
      acquired_at_class_level: 1,
      spell_version_id: null,
      spell_level_min: 1,
      spell_level_max: 1,
      allowed_spell_lists: '["Wizard"]',
      state: 'active',
      selection_eligibility: 'unselected',
    })),
  );
  expect(
    new Set(
      (await rows(page, 'change_log'))
        .filter((row) => row.character_id === character.id)
        .map((row) => row.action_type),
    ),
  ).toEqual(new Set(['add_source']));
  expect(await undo(page, character.id, 2, added.operation_uuid)).toEqual({
    status: 'refused',
    reason: 'operation_not_latest',
    current_revision: 2,
  });
  const restored = await restoreSavePoint(
    page,
    character.id,
    cleanSlate.id,
    2,
  );
  expect(restored).toMatchObject({ status: 'applied', revision: 3 });
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
  // Measured at 15.1s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  expect(duplicate.message).toBe('Parity Human is not repeatable.');
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
  // Measured at 15.6s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
    await undo(
      page,
      workspaceImage.ids.character,
      expectedRevision + 1,
      removed.operation_uuid,
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
  // Measured at 15.4s alone on Chromium; this ceiling is for concurrent-lane contention.
  test.setTimeout(60_000);
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
  expect(JSON.parse(String(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === changed.operation_uuid,
    )?.inverse_command,
  ))).toEqual({
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
  const deleted = await undo(
    page,
    workspaceImage.ids.character,
    2,
    changed.operation_uuid,
  );
  expect(deleted.status).toBe('applied');
  if (deleted.status !== 'applied') {
    throw new Error(`Undo refused: ${deleted.reason}`);
  }
  expect(JSON.parse(String(
    (await rows(page, 'character_operations')).find(
      (row) => row.operation_uuid === deleted.operation_uuid,
    )?.inverse_command,
  ))).toEqual({
    type: 'internal_operation_undo',
    action: 'undo',
    target_operation_uuid: operation(22),
    command: {
      type: 'acknowledge_warning',
      warning_fingerprint: warning.warning_fingerprint,
      note: 'Intentional.',
    },
  });
  expect(
    forCharacter(
      await rows(page, 'warning_acknowledgements'),
      workspaceImage.ids.character,
    ),
  ).toEqual([]);
  await undo(
    page,
    workspaceImage.ids.character,
    3,
    deleted.operation_uuid,
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
