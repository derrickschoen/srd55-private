import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterState } from '../../../src/character/character-state';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import type {
  RestoreCharacterSavePointRequest,
  UndoCharacterOperationRequest,
} from '../../../src/domain/command-contracts';
import type {
  RestoreCharacterSavePointResult,
  UndoCharacterOperationResult,
} from '../../../src/commands/character-command-executor';
import {
  COMMAND_INTEGRITY_KEY,
  handlers as commandHandlers,
} from '../../../src/worker/handlers/commands';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedFeatContent } from '../../../src/rules/feats-srd';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

const flavorOperation = '10000000-0000-4000-8000-000000000001';

function operation(index: number): string {
  return `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

describe('internal operation undo RPC', () => {
  let harness: RpcHarness;
  let characterId: number;

  beforeEach(async () => {
    harness = await createRpcHarness(commandHandlers);
    characterId = harness.context.db.exec(
      `INSERT INTO characters (name, alignment)
       VALUES ('Undo RPC Hero', 'Neutral')`,
    ).lastInsertId;
  });

  afterEach(() => harness.close());

  async function writeFlavor(notes?: string) {
    return harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        alignment: 'Chaotic Good',
        ...(notes === undefined ? {} : { notes }),
      },
    });
  }

  function undo(request: UndoCharacterOperationRequest) {
    return harness.call<
      UndoCharacterOperationRequest,
      UndoCharacterOperationResult
    >('commands.undo', request);
  }

  function restoreSavePoint(request: RestoreCharacterSavePointRequest) {
    return harness.call<
      RestoreCharacterSavePointRequest,
      RestoreCharacterSavePointResult
    >('commands.restoreSavePoint', request);
  }

  function featDefinition(
    contentKey: string,
    name: string,
  ): number {
    registerFixtureContentIdentity(harness.context.db, {
      kind: 'feat', contentKey, name, keyKind: 'bundled-stable',
    });
    return harness.context.db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, ?, '2024', 0, '[]')`,
      [contentKey, name],
    ).lastInsertId;
  }

  function sourceInstance(
    definitionId: number,
    displayName: string,
    config: Readonly<Record<string, unknown>> = {},
  ): number {
    return harness.context.db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, state
       ) VALUES (?, ?, 'feat', ?, ?, ?, 'active')`,
      [
        characterId,
        crypto.randomUUID(),
        definitionId,
        displayName,
        JSON.stringify(config),
      ],
    ).lastInsertId;
  }

  function expectCurrentSnapshotInverse(operationUuid: string): void {
    const encoded = harness.context.db.scalar(
      `SELECT inverse_command FROM character_operations
       WHERE operation_uuid = ?`,
      [operationUuid],
    );
    expect(typeof encoded).toBe('string');
    const inverse: unknown = JSON.parse(String(encoded));
    expect(inverse).toMatchObject({ type: 'internal_snapshot_restore' });
    expect(inverse).not.toHaveProperty('integrity');
  }

  async function expectUndoRedoRestores(
    operationUuid: string,
    before: ReturnType<CharacterState['capture']>,
    after: ReturnType<CharacterState['capture']>,
  ): Promise<void> {
    const state = new CharacterState(harness.context.db);
    const undone = await undo({
      character_id: characterId,
      operation_uuid: operationUuid,
      expected_revision: 1,
    });
    expect(undone).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 2 },
    });
    expect(state.capture(characterId)).toEqual(before);
    if (!undone.ok || undone.result.status !== 'applied') {
      throw new Error('Snapshot undo unexpectedly failed.');
    }

    const redone = await undo({
      character_id: characterId,
      operation_uuid: undone.result.operation_uuid,
      expected_revision: 2,
    });
    expect(redone).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 3 },
    });
    expect(state.capture(characterId)).toEqual(after);
  }

  it('undoes and redoes add_source with the current internal snapshot inverse', async () => {
    const state = new CharacterState(harness.context.db);
    const featId = featDefinition('test:undo-add-source', 'Undo Add Source');
    const before = state.capture(characterId);
    const operationUuid = operation(201);

    const executed = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operationUuid,
      expected_revision: 0,
      command: {
        type: 'add_source',
        source_type: 'feat',
        source_definition_id: featId,
        config: {},
      },
    });
    expect(executed).toMatchObject({
      ok: true,
      result: { operation_uuid: operationUuid, revision: 1 },
    });
    expect(harness.context.db.scalar(
      `SELECT state FROM character_source_instances
       WHERE character_id = ? AND source_definition_id = ?`,
      [characterId, featId],
    )).toBe('active');
    const after = state.capture(characterId);
    expectCurrentSnapshotInverse(operationUuid);

    await expectUndoRedoRestores(operationUuid, before, after);
  });

  it('undoes and redoes remove_source with the current internal snapshot inverse', async () => {
    const state = new CharacterState(harness.context.db);
    const featId = featDefinition('test:undo-remove-source', 'Undo Remove Source');
    const sourceId = sourceInstance(featId, 'Undo Remove Source');
    const before = state.capture(characterId);
    const operationUuid = operation(202);

    const executed = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operationUuid,
      expected_revision: 0,
      command: {
        type: 'remove_source',
        source_instance_id: sourceId,
      },
    });
    expect(executed).toMatchObject({
      ok: true,
      result: { operation_uuid: operationUuid, revision: 1 },
    });
    expect(harness.context.db.scalar(
      'SELECT state FROM character_source_instances WHERE id = ?',
      [sourceId],
    )).toBe('tombstoned');
    const after = state.capture(characterId);
    expectCurrentSnapshotInverse(operationUuid);

    await expectUndoRedoRestores(operationUuid, before, after);
  });

  it('undoes and redoes update_source_config with the current internal snapshot inverse', async () => {
    const db = harness.context.db;
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'test:undo-cleric', name: 'Cleric',
      keyKind: 'bundled-stable',
    });
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'test:undo-wizard', name: 'Wizard',
      keyKind: 'bundled-stable',
    });
    db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, spellcasting_ability,
         progression_type
       ) VALUES
         ('test:undo-cleric', 'Cleric', '2024', 'wisdom', 'full'),
         ('test:undo-wizard', 'Wizard', '2024', 'intelligence', 'full')`,
    );
    const featId = Number(
      db.scalar(
        `SELECT id FROM feat_definitions
         WHERE content_key = '2024:feat:magic-initiate'`,
      ),
    );
    const sourceId = sourceInstance(featId, 'Magic Initiate: Wizard', {
      chosen_list: 'Wizard',
      spellcasting_ability: 'intelligence',
    });
    const state = new CharacterState(db);
    const before = state.capture(characterId);
    const operationUuid = operation(203);

    const executed = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operationUuid,
      expected_revision: 0,
      command: {
        type: 'update_source_config',
        source_instance_id: sourceId,
        chosen_list: 'Cleric',
      },
    });
    if (!executed.ok) {
      throw new Error(JSON.stringify(executed.error));
    }
    expect(executed).toMatchObject({
      ok: true,
      result: { operation_uuid: operationUuid, revision: 1 },
    });
    expect(db.oneRaw(
      `SELECT display_name, config FROM character_source_instances
       WHERE id = ?`,
      [sourceId],
    )).toEqual({
      display_name: 'Magic Initiate: Cleric',
      config: '{"chosen_list":"Cleric","spellcasting_ability":"wisdom"}',
    });
    const after = state.capture(characterId);
    expectCurrentSnapshotInverse(operationUuid);

    await expectUndoRedoRestores(operationUuid, before, after);
  });

  it('undoes and redoes resolve_level_feat_choice with the current internal snapshot inverse', async () => {
    const db = harness.context.db;
    seedClassProgressions(db);
    seedFeatContent(db);
    const fighterId = Number(
      db.scalar("SELECT id FROM class_definitions WHERE name = 'Fighter'"),
    );
    const classLevelId = db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 19, 1)`,
      [characterId, fighterId],
    ).lastInsertId;
    const choiceId = db.exec(
      `INSERT INTO character_level_feat_choices (
         character_id, character_class_level_id, class_level, choice_kind
       ) VALUES (?, ?, 19, 'epic_boon')`,
      [characterId, classLevelId],
    ).lastInsertId;
    const state = new CharacterState(db);
    const before = state.capture(characterId);
    const operationUuid = operation(204);

    const executed = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operationUuid,
      expected_revision: 0,
      command: {
        type: 'resolve_level_feat_choice',
        character_level_feat_choice_id: choiceId,
        feat_choice: {
          kind: 'feat',
          feat_content_key: '2024:feat:boon-of-fate',
          config: {},
          ability_increases: [{ ability: 'strength', amount: 1 }],
        },
      },
    });
    if (!executed.ok) {
      throw new Error(JSON.stringify(executed.error));
    }
    expect(executed).toMatchObject({
      ok: true,
      result: { operation_uuid: operationUuid, revision: 1 },
    });
    expect(db.scalar(
      `SELECT feat_source_instance_id FROM character_level_feat_choices
       WHERE id = ?`,
      [choiceId],
    )).not.toBeNull();
    const after = state.capture(characterId);
    expectCurrentSnapshotInverse(operationUuid);

    await expectUndoRedoRestores(operationUuid, before, after);
  });

  it('undoes the most recent operation and returns an operation identifier without inverse bytes', async () => {
    const grandfatheredNotes = 'legacy\0note bytes';
    harness.context.db.exec(
      'UPDATE characters SET notes = ? WHERE id = ?',
      [grandfatheredNotes, characterId],
    );
    const written = await writeFlavor('replacement notes');
    expect(written).toMatchObject({
      ok: true,
      result: {
        operation_uuid: flavorOperation,
        revision: 1,
        idempotent_replay: false,
      },
    });
    if (!written.ok) throw new Error('Flavor write unexpectedly failed.');
    expect(written.result).not.toHaveProperty('inverse');

    const undone = await undo({
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 1,
    });
    expect(undone).toMatchObject({
      ok: true,
      result: {
        status: 'applied',
        operation_uuid: expect.stringMatching(/^[0-9a-f-]{36}$/u),
        revision: 2,
      },
    });
    expect(
      harness.context.db.oneRaw(
        'SELECT alignment, notes, revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({
      alignment: 'Neutral',
      notes: grandfatheredNotes,
      revision: 2,
    });
    if (
      !undone.ok ||
      undone.result.status !== 'applied'
    ) {
      throw new Error('Undo unexpectedly failed.');
    }
    const redone = await undo({
      character_id: characterId,
      operation_uuid: undone.result.operation_uuid,
      expected_revision: 2,
    });
    expect(redone).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 3 },
    });
    expect(
      harness.context.db.oneRaw(
        'SELECT alignment, notes, revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({
      alignment: 'Chaotic Good',
      notes: 'replacement notes',
      revision: 3,
    });
  });

  it('refuses an older stack top after compensation and only follows the operation that produced the current revision', async () => {
    await writeFlavor();
    await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operation(1),
      expected_revision: 1,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 17,
      },
    });

    const undoAbility = await undo({
      character_id: characterId,
      operation_uuid: operation(1),
      expected_revision: 2,
    });
    expect(undoAbility).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 3 },
    });
    if (!undoAbility.ok || undoAbility.result.status !== 'applied') {
      throw new Error('Ability undo unexpectedly failed.');
    }

    const refusedFlavor = await undo({
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 3,
    });
    expect(refusedFlavor).toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'operation_not_latest',
        current_revision: 3,
      },
    });
    expect(harness.context.db.oneRaw(
      'SELECT alignment, wisdom, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ alignment: 'Chaotic Good', wisdom: 10, revision: 3 });

    const redoAbility = await undo({
      character_id: characterId,
      operation_uuid: undoAbility.result.operation_uuid,
      expected_revision: 3,
    });
    expect(redoAbility).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 4 },
    });
    if (!redoAbility.ok || redoAbility.result.status !== 'applied') {
      throw new Error('Ability redo unexpectedly failed.');
    }
    const undoRedoCompensation = await undo({
      character_id: characterId,
      operation_uuid: redoAbility.result.operation_uuid,
      expected_revision: 4,
    });
    expect(undoRedoCompensation).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 5 },
    });
    expect(harness.context.db.oneRaw(
      'SELECT alignment, wisdom, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ alignment: 'Chaotic Good', wisdom: 10, revision: 5 });
  });

  it('replays a retried undo response without applying the inverse twice', async () => {
    await writeFlavor();
    const request = {
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 1,
    };
    const first = await undo(request);
    const replay = await undo(request);
    expect(first).toMatchObject({
      ok: true,
      result: {
        status: 'applied',
        revision: 2,
        idempotent_replay: false,
      },
    });
    if (!first.ok || first.result.status !== 'applied') {
      throw new Error('Initial undo unexpectedly failed.');
    }
    expect(replay).toMatchObject({
      ok: true,
      result: {
        status: 'applied',
        operation_uuid: first.result.operation_uuid,
        revision: 2,
        idempotent_replay: true,
      },
    });
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM character_operations WHERE character_id = ?',
      [characterId],
    )).toBe(2);
  });

  it('returns a typed refusal for stale expected_revision instead of throwing', async () => {
    await writeFlavor();

    await expect(undo({
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 0,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'revision_mismatch',
        current_revision: 1,
      },
    });
  });

  it('refuses the revision-0 flavor inverse at revision 10 because it is not latest', async () => {
    await writeFlavor();
    for (let revision = 1; revision < 10; revision += 1) {
      const result = await harness.call('commands.execute', {
        character_id: characterId,
        operation_uuid: operation(revision),
        expected_revision: revision,
        command: {
          type: 'update_ability',
          ability: 'wisdom',
          score: 10 + revision,
        },
      });
      expect(result).toMatchObject({ ok: true });
    }

    await expect(undo({
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 10,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'operation_not_latest',
        current_revision: 10,
      },
    });
    expect(
      harness.context.db.oneRaw(
        'SELECT alignment, revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({ alignment: 'Chaotic Good', revision: 10 });
  });

  it('returns a typed refusal when the operation belongs to another character', async () => {
    await writeFlavor();
    const otherCharacterId = harness.context.db.exec(
      "INSERT INTO characters (name) VALUES ('Other Undo Hero')",
    ).lastInsertId;

    await expect(undo({
      character_id: otherCharacterId,
      operation_uuid: flavorOperation,
      expected_revision: 0,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'operation_character_mismatch',
        current_revision: 0,
      },
    });
  });

  it('returns typed refusals for a missing operation and a missing character', async () => {
    await expect(undo({
      character_id: characterId,
      operation_uuid: operation(404),
      expected_revision: 0,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'operation_not_found',
        current_revision: 0,
      },
    });
    await expect(undo({
      character_id: 999_999,
      operation_uuid: operation(404),
      expected_revision: 0,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'character_not_found',
        current_revision: null,
      },
    });
  });

  it('returns a typed command refusal for a new flavor write containing NUL', async () => {
    await expect(harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operation(99),
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        notes: 'visible\0suffix',
      },
    })).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: {
          reason: 'invalid_character_flavor',
          field: 'notes',
          issue: 'contains_nul',
        },
      },
    });
    expect(
      harness.context.db.oneRaw(
        'SELECT notes, revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({ notes: null, revision: 0 });
  });

  it('restores a real save point by id and returns typed ownership, revision, and identity refusals', async () => {
    const snapshot = new CharacterState(harness.context.db).capture(characterId);
    const savePointId = harness.context.db.exec(
      `INSERT INTO character_save_points
         (character_id, label, snapshot, schema_version)
       VALUES (?, 'Before experiment', ?, ?)`,
      [characterId, JSON.stringify(snapshot), snapshot.schema_version],
    ).lastInsertId;
    await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operation(100),
      expected_revision: 0,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 18,
      },
    });

    const restored = await restoreSavePoint({
      character_id: characterId,
      save_point_id: savePointId,
      expected_revision: 1,
    });
    expect(restored).toMatchObject({
      ok: true,
      result: {
        status: 'applied',
        revision: 2,
        idempotent_replay: false,
      },
    });
    if (!restored.ok || restored.result.status !== 'applied') {
      throw new Error('Save-point restore unexpectedly failed.');
    }
    expect(restored.result).not.toHaveProperty('inverse');
    expect(restored.result).not.toHaveProperty('snapshot');
    expect(harness.context.db.oneRaw(
      'SELECT wisdom, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ wisdom: 10, revision: 2 });

    const undoRestore = await undo({
      character_id: characterId,
      operation_uuid: restored.result.operation_uuid,
      expected_revision: 2,
    });
    expect(undoRestore).toMatchObject({
      ok: true,
      result: { status: 'applied', revision: 3 },
    });
    expect(harness.context.db.oneRaw(
      'SELECT wisdom, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ wisdom: 18, revision: 3 });

    const otherCharacterId = harness.context.db.exec(
      "INSERT INTO characters (name) VALUES ('Other Save Point Hero')",
    ).lastInsertId;
    await expect(restoreSavePoint({
      character_id: otherCharacterId,
      save_point_id: savePointId,
      expected_revision: 0,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'save_point_character_mismatch',
        current_revision: 0,
      },
    });
    await expect(restoreSavePoint({
      character_id: characterId,
      save_point_id: savePointId,
      expected_revision: 2,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'revision_mismatch',
        current_revision: 3,
      },
    });
    await expect(restoreSavePoint({
      character_id: characterId,
      save_point_id: 999_999,
      expected_revision: 3,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'save_point_not_found',
        current_revision: 3,
      },
    });
  });

  it('refuses the legacy restore_snapshot stored-row fixture through the public undo RPC without writes', async () => {
    const snapshot = new CharacterState(harness.context.db).capture(characterId);
    const legacyInverse = JSON.stringify({
      type: 'restore_snapshot',
      snapshot,
      integrity: 'legacy-signature-bytes-are-inert',
    });
    harness.context.db.exec(
      'UPDATE characters SET wisdom = 18, revision = 1 WHERE id = ?',
      [characterId],
    );
    harness.context.db.exec(
      `INSERT INTO character_operations
         (character_id, operation_uuid, expected_revision,
          resulting_revision, inverse_command)
       VALUES (?, ?, 0, 1, ?)`,
      [
        characterId,
        operation(101),
        legacyInverse,
      ],
    );

    await expect(undo({
      character_id: characterId,
      operation_uuid: operation(101),
      expected_revision: 1,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'legacy_operation',
        current_revision: 1,
      },
    });
    expect(harness.context.db.oneRaw(
      'SELECT wisdom, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ wisdom: 18, revision: 1 });
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM character_operations WHERE character_id = ?',
      [characterId],
    )).toBe(1);
    expect(harness.context.db.scalar(
      'SELECT inverse_command FROM character_operations WHERE operation_uuid = ?',
      [operation(101)],
    )).toBe(legacyInverse);
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM change_log WHERE character_id = ?',
      [characterId],
    )).toBe(0);
  });

  it('refuses redo when its stored envelope contains a legacy inverse without writes', async () => {
    const legacyCommand = {
      type: 'update_character_flavor',
      mode: 'restore',
      alignment: 'Lawful Neutral',
      appearance: 'Old appearance',
      backstory: 'Old backstory',
      notes: 'Old notes',
      integrity: 'already-persisted-signature-bytes',
    };
    const legacyEnvelope = JSON.stringify({
      type: 'internal_operation_undo',
      action: 'undo',
      target_operation_uuid: operation(103),
      command: legacyCommand,
    });
    harness.context.db.exec(
      `UPDATE characters
       SET alignment = 'Neutral Evil', revision = 1
       WHERE id = ?`,
      [characterId],
    );
    harness.context.db.exec(
      `INSERT INTO character_operations
         (character_id, operation_uuid, expected_revision,
          resulting_revision, inverse_command)
       VALUES (?, ?, 0, 1, ?)`,
      [characterId, operation(104), legacyEnvelope],
    );

    await expect(undo({
      character_id: characterId,
      operation_uuid: operation(104),
      expected_revision: 1,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'legacy_operation',
        current_revision: 1,
      },
    });
    expect(harness.context.db.oneRaw(
      'SELECT alignment, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ alignment: 'Neutral Evil', revision: 1 });
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM character_operations WHERE character_id = ?',
      [characterId],
    )).toBe(1);
    expect(harness.context.db.scalar(
      'SELECT inverse_command FROM character_operations WHERE operation_uuid = ?',
      [operation(104)],
    )).toBe(legacyEnvelope);
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM change_log WHERE character_id = ?',
      [characterId],
    )).toBe(0);
  });

  it("refuses the legacy update_character_flavor mode:'restore' stored-row fixture through the public undo RPC without writes", async () => {
    const frozenSignedInverse = JSON.stringify({
      type: 'update_character_flavor',
      mode: 'restore',
      alignment: 'Lawful Neutral',
      appearance: 'Old appearance',
      backstory: 'Old backstory',
      notes: 'Old notes',
      integrity: 'already-persisted-signature-bytes',
    });
    harness.context.db.exec(
      `UPDATE characters
       SET alignment = 'Chaotic Good', notes = 'replacement notes', revision = 1
       WHERE id = ?`,
      [characterId],
    );
    harness.context.db.exec(
      `INSERT INTO character_operations
         (character_id, operation_uuid, expected_revision,
          resulting_revision, inverse_command)
       VALUES (?, ?, 0, 1, ?)`,
      [characterId, operation(103), frozenSignedInverse],
    );

    await expect(undo({
      character_id: characterId,
      operation_uuid: operation(103),
      expected_revision: 1,
    })).resolves.toMatchObject({
      ok: true,
      result: {
        status: 'refused',
        reason: 'legacy_operation',
        current_revision: 1,
      },
    });
    expect(harness.context.db.oneRaw(
      'SELECT alignment, notes, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({
      alignment: 'Chaotic Good',
      notes: 'replacement notes',
      revision: 1,
    });
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM character_operations WHERE character_id = ?',
      [characterId],
    )).toBe(1);
    expect(harness.context.db.scalar(
      'SELECT inverse_command FROM character_operations WHERE operation_uuid = ?',
      [operation(103)],
    )).toBe(frozenSignedInverse);
    expect(harness.context.db.scalar(
      'SELECT COUNT(*) FROM change_log WHERE character_id = ?',
      [characterId],
    )).toBe(0);
  });

  it('rejects a signed crafted snapshot with NUL flavor bytes through commands.execute', async () => {
    const captured = new CharacterState(harness.context.db).capture(characterId);
    const crafted = {
      ...captured,
      character: {
        ...captured.character,
        notes: 'crafted\0snapshot note',
      },
    };
    const signed = await new CharacterCommandIntegrity(
      COMMAND_INTEGRITY_KEY,
    ).attach(characterId, {
      type: 'restore_snapshot',
      snapshot: crafted,
    });

    await expect(harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operation(102),
      expected_revision: 0,
      command: signed,
    })).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        message: 'Unknown character command type.',
      },
    });
    expect(harness.context.db.oneRaw(
      'SELECT notes, revision FROM characters WHERE id = ?',
      [characterId],
    )).toEqual({ notes: null, revision: 0 });
  });

  it('rejects externally supplied inverse bytes at the RPC parameter seam', async () => {
    await expect(harness.call('commands.undo', {
      character_id: characterId,
      operation_uuid: flavorOperation,
      expected_revision: 0,
      command: {
        type: 'internal_flavor_restore',
        alignment: 'bytes supplied by caller',
        appearance: null,
        backstory: null,
        notes: null,
      },
    })).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
  });
});
