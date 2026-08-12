import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../../../src/character/character-state';
import { AcknowledgeWarningCommand } from '../../../src/commands/acknowledge-warning';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { RestoreSnapshotCommand } from '../../../src/commands/restore-snapshot';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import type {
  AcknowledgeWarningCommand as AcknowledgeWarningPayload,
  UpdateClassCommand as UpdateClassPayload,
} from '../../../src/domain/command-contracts';
import type { StoredRestoreSnapshotInverse as RestoreSnapshotPayload } from '../../../src/commands/stored-inverses';
import { DuplicateWarningDetector } from '../../../src/duplicates/duplicate-warning-detector';
import { SpellSelectionService } from '../../../src/eligibility/spell-selection-service';
import { openTestDatabase } from '../../helpers/open-db';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

const integrityKey = 'C43-test-integrity-key';

describe('warning, class, and snapshot commands', () => {
  let connection: Database;
  let db: DatabaseContext;
  let integrity: CharacterCommandIntegrity;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    integrity = new CharacterCommandIntegrity(integrityKey);
  });

  afterEach(() => {
    connection.close();
  });

  function character(name = 'C43 Character'): number {
    return db.exec(
      `INSERT INTO characters (
         name, allow_legacy, strength, dexterity, intelligence,
         wisdom, charisma
       ) VALUES (?, 1, 13, 13, 13, 13, 13)`,
      [name],
    ).lastInsertId;
  }

  function classDefinition(
    name: string,
    progressions: Readonly<
      Record<number, readonly Record<string, unknown>[]>
    > = { 1: [] },
    ability: string | null = 'intelligence',
  ): number {
    const contentKey = `class:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey, name, keyKind: 'bundled-stable',
    });
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, spellcasting_ability,
         progression_type, primary_ability_expression
       ) VALUES (?, ?, '2024', ?, 'full', ?)`,
      [
        contentKey,
        name,
        ability,
        ability === null
          ? null
          : JSON.stringify({ kind: 'all_of', abilities: [ability] }),
      ],
    ).lastInsertId;
    for (const [level, rules] of Object.entries(progressions)) {
      db.exec(
        `INSERT INTO class_progressions (
           class_definition_id, class_level, grant_rules
         ) VALUES (?, ?, ?)`,
        [classId, Number(level), JSON.stringify(rules)],
      );
    }
    return classId;
  }

  function subclassDefinition(
    classId: number,
    name: string,
    rules: readonly Record<string, unknown>[] = [],
  ): number {
    const contentKey = `subclass:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey, name, keyKind: 'bundled-stable',
    });
    return db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         spellcasting_ability, grant_rules
       ) VALUES (?, ?, ?, '2024', 'intelligence', ?)`,
      [
        contentKey,
        classId,
        name,
        JSON.stringify(rules),
      ],
    ).lastInsertId;
  }

  function spellIdentityVersions(name: string): readonly [number, number] {
    const identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name
       ) VALUES (?, ?, ?)`,
      [`identity:${crypto.randomUUID()}`, name, name.toLowerCase()],
    ).lastInsertId;
    const ids = (['2014', '2024'] as const).map((edition) => {
      const contentKey = `${edition}:${name.toLowerCase()}`;
      registerFixtureContentIdentity(db, {
        kind: 'spell', contentKey, name, keyKind: 'bundled-stable',
      });
      return db.exec(
        `INSERT INTO spell_versions (
           content_key, spell_identity_id, display_name, rules_edition,
           level, school, is_active
         ) VALUES (?, ?, ?, ?, 1, 'Evocation', 1)`,
        [contentKey, identityId, name, edition],
      ).lastInsertId;
    });
    return [ids[0]!, ids[1]!];
  }

  function activeConflict(characterId: number): string {
    const classId = classDefinition('Conflict Route Class');
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 1, 1)`,
      [characterId, classId],
    );
    const versions = spellIdentityVersions('Conflict Spell');
    for (const [index, versionId] of versions.entries()) {
      const name = `Conflict source ${index + 1}`;
      const contentKey = `feat:${crypto.randomUUID()}`;
      registerFixtureContentIdentity(db, {
        kind: 'feat', contentKey, name, keyKind: 'bundled-stable',
      });
      const featId = db.exec(
        `INSERT INTO feat_definitions (
           content_key, name, rules_edition, grant_rules
         ) VALUES (?, ?, '2024', '[]')`,
        [
          contentKey,
          name,
        ],
      ).lastInsertId;
      const sourceId = db.exec(
        `INSERT INTO character_source_instances (
           character_id, instance_uuid, source_type,
           source_definition_id, display_name, config
         ) VALUES (?, ?, 'feat', ?, ?, '{}')`,
        [
          characterId,
          crypto.randomUUID(),
          featId,
          `Conflict source ${index + 1}`,
        ],
      ).lastInsertId;
      db.exec(
        `INSERT INTO spell_selection_slots (
           character_id, source_instance_id, slot_key, rule_key, ordinal,
           bucket, eligibility_kind, current_spell_version_id,
           spell_level_min, spell_level_max, state,
           selection_eligibility
         ) VALUES (?, ?, ?, 'conflict', ?, 'known', 'choice_from_query',
           ?, 0, 9, 'active', 'valid')`,
        [
          characterId,
          sourceId,
          `conflict:${index + 1}`,
          index + 1,
          versionId,
        ],
      );
    }
    const warning = new DuplicateWarningDetector()
      .classify(new SpellAccessBuilder(db).buildForCharacter(characterId))
      .find((assessment) => assessment.category === 'conflicting_version');
    expect(warning?.warning_fingerprint).toMatch(
      /^conflicting_versions:[a-f0-9]{64}$/,
    );
    return warning!.warning_fingerprint!;
  }

  // `update_class` no longer carries a level (level-up plan §3): entry is at
  // level 1, removal is `remove: true`, and where a fixture needs a higher
  // level it is a direct fixture write (`raiseClassLevelForTest`) — the
  // guarded levelling path has its own test file.
  async function runClass(
    characterId: number,
    payload:
      | {
          class_definition_id: number;
          subclass_definition_id?: number | null;
        }
      | { class_definition_id: number; remove: true },
  ): Promise<UpdateClassCommand> {
    const command = new UpdateClassCommand(
      db,
      { type: 'update_class', ...payload } as UpdateClassPayload,
      integrity,
    );
    command.apply(characterId);
    return command;
  }

  async function restorePayload(
    characterId: number,
    snapshot: CharacterStateSnapshot,
  ): Promise<RestoreSnapshotPayload> {
    return integrity.attach(characterId, {
      type: 'restore_snapshot',
      snapshot,
    }) as unknown as Promise<RestoreSnapshotPayload>;
  }

  it('persists, updates, deletes, and restores a live warning acknowledgement', async () => {
    const characterId = character();
    const fingerprint = activeConflict(characterId);
    const acknowledge = new AcknowledgeWarningCommand(
      db,
      {
        type: 'acknowledge_warning',
        warning_fingerprint: `  ${fingerprint}  `,
        note: '  Intentional conflict.  ',
      },
      integrity,
    );

    await acknowledge.apply(characterId);

    expect(
      db.oneRaw(
        `SELECT warning_fingerprint, note, invalidated_at
         FROM warning_acknowledgements
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      warning_fingerprint: fingerprint,
      note: 'Intentional conflict.',
      invalidated_at: null,
    });
    const deletePayload = await acknowledge.inverse();
    expect(deletePayload).toMatchObject({
      type: 'acknowledge_warning',
      mode: 'delete',
      warning_fingerprint: `  ${fingerprint}  `,
    });
    await expect(
      integrity.isValid(characterId, deletePayload),
    ).resolves.toBe(true);

    const deletion = new AcknowledgeWarningCommand(
      db,
      deletePayload,
      integrity,
    );
    await deletion.apply(characterId);
    expect(
      db.scalar(
        `SELECT count(*) FROM warning_acknowledgements
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(0);
    const restore = await deletion.inverse();
    expect(restore).toEqual({
      type: 'acknowledge_warning',
      warning_fingerprint: `  ${fingerprint}  `,
      note: 'Intentional conflict.',
    });

    const restored = new AcknowledgeWarningCommand(
      db,
      restore,
      integrity,
    );
    await restored.apply(characterId);
    db.exec(
      `UPDATE warning_acknowledgements
       SET invalidated_at = '2000-01-01 00:00:00'
       WHERE character_id = ?`,
      [characterId],
    );
    const update = new AcknowledgeWarningCommand(
      db,
      {
        type: 'acknowledge_warning',
        warning_fingerprint: fingerprint,
        note: 'Updated note.',
      },
      integrity,
    );
    await update.apply(characterId);
    expect(
      db.oneRaw(
        `SELECT note, invalidated_at
         FROM warning_acknowledgements
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({ note: 'Updated note.', invalidated_at: null });
    expect(await update.inverse()).toEqual({
      type: 'acknowledge_warning',
      warning_fingerprint: fingerprint,
      note: 'Intentional conflict.',
    });
  });

  it('rejects inactive fingerprints and cannot delete another character acknowledgement', async () => {
    const characterId = character('Warning actor');
    const otherCharacterId = character('Warning owner');
    const fingerprint = 'conflicting_versions:shared-fingerprint';
    db.exec(
      `INSERT INTO warning_acknowledgements (
         character_id, warning_fingerprint, note
       ) VALUES (?, ?, 'Other character note')`,
      [otherCharacterId, fingerprint],
    );
    const deletePayload = await integrity.attach(characterId, {
      type: 'acknowledge_warning',
      mode: 'delete',
      warning_fingerprint: fingerprint,
    } as const);
    const deletion = new AcknowledgeWarningCommand(
      db,
      deletePayload,
      integrity,
    );

    await expect(deletion.apply(characterId)).rejects.toThrow(
      'Warning acknowledgement does not belong to this character.',
    );
    expect(
      db.oneRaw(
        `SELECT character_id, note
         FROM warning_acknowledgements
         WHERE warning_fingerprint = ?`,
        [fingerprint],
      ),
    ).toEqual({
      character_id: otherCharacterId,
      note: 'Other character note',
    });

    const inactive = new AcknowledgeWarningCommand(
      db,
      {
        type: 'acknowledge_warning',
        warning_fingerprint:
          'conflicting_versions:not-an-active-warning',
        note: 'No.',
      },
      integrity,
    );
    await expect(inactive.apply(characterId)).rejects.toThrow(
      'The conflicting-version warning is no longer active.',
    );
    expect(
      db.scalar(
        `SELECT count(*) FROM warning_acknowledgements
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(0);
  });

  it('regenerates stable class rows and selected slots across level loss and return', async () => {
    const characterId = character();
    const [spellId] = spellIdentityVersions('Stable Spell');
    db.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (?, 'Stable Mage')`,
      [spellId],
    );
    const rules = {
      1: [],
      2: [
        {
          kind: 'choice_from_list',
          rule_key: 'level-two-choice',
          count: 1,
          bucket: 'known',
          list: 'Stable Mage',
          level_min: 1,
          level_max: 1,
        },
      ],
    };
    const classId = classDefinition('Stable Mage', rules);

    const added = await runClass(characterId, {
      class_definition_id: classId,
      subclass_definition_id: null,
    });
    raiseClassLevelForTest(db, characterId, classId, 2);
    const slotId = Number(
      db.scalar('SELECT id FROM spell_selection_slots'),
    );
    new SpellSelectionService(db).select(slotId, spellId);
    const original = db.oneRaw(
      `SELECT id, slot_key, current_spell_version_id
       FROM spell_selection_slots WHERE id = ?`,
      [slotId],
    );

    // Level LOSS is outside every command since the strip (levelling down is
    // out of the unit's scope, plan §10); the slot lifecycle it exercises is
    // the generator's, so the fixture write drives the same regeneration.
    raiseClassLevelForTest(db, characterId, classId, 1);
    expect(
      db.oneRaw(
        `SELECT id, slot_key, current_spell_version_id, state,
                selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      ...original,
      state: 'orphaned',
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selection preserved because its grant rule is no longer active.',
    });

    raiseClassLevelForTest(db, characterId, classId, 2);
    expect(
      db.oneRaw(
        `SELECT id, slot_key, current_spell_version_id, state,
                selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      ...original,
      state: 'active',
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
    expect(
      db.oneRaw(
        `SELECT level, subclass_definition_id, is_starting_class
         FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, classId],
      ),
    ).toEqual({
      level: 2,
      subclass_definition_id: null,
      is_starting_class: 1,
    });
    const addedInverse = await added.inverse();
    expect(addedInverse).toMatchObject({
      type: 'internal_snapshot_restore',
    });
    expect(addedInverse).not.toHaveProperty('integrity');

    const state = new CharacterState(db);
    const beforeRemoval = state.capture(characterId);
    const removed = await runClass(characterId, {
      class_definition_id: classId,
      remove: true,
    });
    expect(
      db.scalar(
        `SELECT count(*) FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, classId],
      ),
    ).toBe(0);
    expect(
      db.oneRaw(
        `SELECT source.state AS source_state, slot.id, slot.slot_key,
                slot.current_spell_version_id, slot.state AS slot_state
         FROM character_source_instances AS source
         INNER JOIN spell_selection_slots AS slot
           ON slot.source_instance_id = source.id
         WHERE source.character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      source_state: 'tombstoned',
      id: slotId,
      slot_key: original!.slot_key,
      current_spell_version_id: spellId,
      slot_state: 'orphaned',
    });
    const removalInverse = await removed.inverse();
    expect(removalInverse).toMatchObject({
      type: 'internal_snapshot_restore',
    });
    expect(removalInverse).not.toHaveProperty('integrity');
    state.restore(characterId, removalInverse.snapshot);
    expect(state.capture(characterId)).toEqual(beforeRemoval);
  });

  it('enforces subclass and total-level constraints while preserving source config on switches', async () => {
    const characterId = character();
    const classId = classDefinition('Switch Mage');
    const otherClassId = classDefinition('Other Class');
    const firstSubclassId = subclassDefinition(classId, 'First School');
    const secondSubclassId = subclassDefinition(classId, 'Second School');
    const foreignSubclassId = subclassDefinition(
      otherClassId,
      'Foreign School',
    );

    await expect(
      runClass(characterId, {
        class_definition_id: classId,
        subclass_definition_id: foreignSubclassId,
      }),
    ).rejects.toThrow(
      'That subclass does not belong to the selected class.',
    );
    expect(
      db.scalar(
        `SELECT count(*) FROM character_class_levels
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(0);

    await runClass(characterId, {
      class_definition_id: classId,
      subclass_definition_id: firstSubclassId,
    });
    const firstSourceId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE source_type = 'subclass'
           AND source_definition_id = ?`,
        [firstSubclassId],
      ),
    );
    db.exec(
      `UPDATE character_source_instances
       SET config = '{"custom":"preserved"}'
       WHERE id = ?`,
      [firstSourceId],
    );
    await runClass(characterId, {
      class_definition_id: classId,
      subclass_definition_id: secondSubclassId,
    });
    await runClass(characterId, {
      class_definition_id: classId,
      subclass_definition_id: firstSubclassId,
    });
    // The stored level never moved through any of those switches — that is
    // the strip itself, asserted where it used to be exercised.
    raiseClassLevelForTest(db, characterId, classId, 5);

    expect(
      db.allRaw(
        `SELECT source_definition_id, state, config
         FROM character_source_instances
         WHERE character_id = ? AND source_type = 'subclass'
         ORDER BY source_definition_id`,
        [characterId],
      ),
    ).toEqual([
      {
        source_definition_id: firstSubclassId,
        state: 'active',
        config:
          '{"custom":"preserved","spellcasting_ability":"intelligence"}',
      },
      {
        source_definition_id: secondSubclassId,
        state: 'tombstoned',
        config: '{"spellcasting_ability":"intelligence"}',
      },
    ]);
    // ENTRY refuses the 21st level: with the first class raised to 20, a
    // second class's level-1 entry would exceed the cap.
    raiseClassLevelForTest(db, characterId, classId, 20);
    await expect(
      runClass(characterId, {
        class_definition_id: otherClassId,
        subclass_definition_id: null,
      }),
    ).rejects.toThrow('A character cannot exceed level 20.');
    expect(
      db.scalar(
        `SELECT count(*) FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, otherClassId],
      ),
    ).toBe(0);

    raiseClassLevelForTest(db, characterId, classId, 5);
    await runClass(characterId, {
      class_definition_id: otherClassId,
      subclass_definition_id: null,
    });
    raiseClassLevelForTest(db, characterId, otherClassId, 15);
    expect(
      db.allRaw(
        `SELECT class_definition_id, level, is_starting_class
         FROM character_class_levels
         WHERE character_id = ?
         ORDER BY class_definition_id`,
        [characterId],
      ),
    ).toEqual([
      {
        class_definition_id: classId,
        level: 5,
        is_starting_class: 1,
      },
      {
        class_definition_id: otherClassId,
        level: 15,
        is_starting_class: 0,
      },
    ]);
    // Levelling past 20 is the guarded path's own refusal now — see the
    // `level_up_class` cap case in level-up-class.test.ts.
  });

  it('rolls back every class write when regeneration fails', async () => {
    const characterId = character();
    const brokenClassId = classDefinition('Broken Mage', {
      1: [
        {
          kind: 'choice_from_list',
          rule_key: 'broken-choice',
          count: 1,
          bucket: 'known',
          list: '',
          level_min: 0,
          level_max: 1,
        },
      ],
    });
    const before = new CharacterState(db).capture(characterId);

    await expect(
      runClass(characterId, {
        class_definition_id: brokenClassId,
        subclass_definition_id: null,
      }),
    ).rejects.toThrow(
      "Grant rule field 'list' must be a non-empty string.",
    );
    expect(new CharacterState(db).capture(characterId)).toEqual(before);
    expect(
      db.scalar(
        `SELECT count(*) FROM character_source_instances
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(0);
  });

  it('restores exact persisted rows, signs redo, and rejects inactive references without writes', async () => {
    const characterId = character();
    const classId = classDefinition('Snapshot Mage');
    await runClass(characterId, {
      class_definition_id: classId,
      subclass_definition_id: null,
    });
    const sourceId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ?`,
        [characterId],
      ),
    );
    const [spellId] = spellIdentityVersions('Snapshot Spell');
    db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key, ordinal,
         bucket, eligibility_kind, current_spell_version_id,
         selection_eligibility, created_at, updated_at
       ) VALUES (?, ?, 'snapshot-slot', 'snapshot-rule', 1, 'known',
         'choice_from_query', ?, 'valid', '2024-01-01', '2024-01-02')`,
      [characterId, sourceId, spellId],
    );
    const state = new CharacterState(db);
    const snapshot = state.capture(characterId);
    db.exec(
      `UPDATE characters SET name = 'Changed' WHERE id = ?`,
      [characterId],
    );
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = NULL,
           selection_eligibility = 'unselected'
       WHERE character_id = ?`,
      [characterId],
    );
    const changed = state.capture(characterId);
    const restore = new RestoreSnapshotCommand(
      db,
      await restorePayload(characterId, snapshot),
      integrity,
    );

    await restore.apply(characterId);

    expect(state.capture(characterId)).toEqual(snapshot);
    const redoPayload = await restore.inverse();
    await expect(
      integrity.isValid(characterId, redoPayload),
    ).resolves.toBe(true);
    const redo = new RestoreSnapshotCommand(
      db,
      redoPayload,
      integrity,
    );
    await redo.apply(characterId);
    expect(state.capture(characterId)).toEqual(changed);

    db.exec(
      'UPDATE spell_versions SET is_active = 0 WHERE id = ?',
      [spellId],
    );
    const beforeRejectedRestore = state.capture(characterId);
    const rejected = new RestoreSnapshotCommand(
      db,
      await restorePayload(characterId, snapshot),
      integrity,
    );
    await expect(rejected.apply(characterId)).rejects.toThrow(
      `Character snapshot references inactive spell version ${spellId}.`,
    );
    expect(state.capture(characterId)).toEqual(beforeRejectedRestore);
  });

  it('rejects a restore signature issued for another character', async () => {
    const characterId = character('Restore target');
    const otherCharacterId = character('Restore signer');
    const snapshot = new CharacterState(db).capture(characterId);
    const payload = await restorePayload(otherCharacterId, snapshot);
    const command = new RestoreSnapshotCommand(
      db,
      payload,
      integrity,
    );
    const before = new CharacterState(db).capture(characterId);

    await expect(command.apply(characterId)).rejects.toThrow(
      'This internal character command is invalid or belongs to another character.',
    );
    expect(new CharacterState(db).capture(characterId)).toEqual(before);
  });
});
