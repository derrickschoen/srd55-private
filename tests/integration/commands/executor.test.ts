import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AcknowledgeWarningCommand } from '../../../src/commands/acknowledge-warning';
import { AddSourceCommand } from '../../../src/commands/add-source';
import type {
  CharacterAuditWriter,
} from '../../../src/commands/audit-log';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandFactory } from '../../../src/commands/character-command-factory';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { RemoveSourceCommand } from '../../../src/commands/remove-source';
import { ClearSlotCommand } from '../../../src/commands/set-slot/clear';
import { KeepOverrideSlotCommand } from '../../../src/commands/set-slot/keep-override';
import { RestoreSlotCommand } from '../../../src/commands/set-slot/restore';
import { SelectSlotCommand } from '../../../src/commands/set-slot/select';
import { UpdateAbilityCommand } from '../../../src/commands/update-ability';
import { UpdateCharacterRulesCommand } from '../../../src/commands/update-character-rules';
import { UpdateCharacterFlavorCommand } from '../../../src/commands/update-character-flavor';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { UpdateSourceConfigCommand } from '../../../src/commands/update-source-config';
import { CharacterCommandPayloadError } from '../../../src/commands/payload-validator';
import { DatabaseContext } from '../../../src/db/database';
import type {
  CharacterCommandPayload,
} from '../../../src/domain/command-contracts';
import { CHARACTER_TEXT_LIMITS } from '../../../src/domain/character-limits';
import { openTestDatabase } from '../../helpers/open-db';

const key = 'X50-executor-integration-key';
const firstOperation = '11111111-1111-4111-8111-111111111111';
const undoOperation = '22222222-2222-4222-8222-222222222222';

describe('character command factory and executor', () => {
  let connection: Database;
  let db: DatabaseContext;
  let integrity: CharacterCommandIntegrity;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    integrity = new CharacterCommandIntegrity(key);
  });

  afterEach(() => connection.close());

  function character(name = 'X50 Character'): number {
    return db.exec(
      `INSERT INTO characters
         (name, wisdom, created_at, updated_at)
       VALUES (?, 13, '2000-01-01T00:00:00.000Z',
         '2000-01-01T00:00:00.000Z')`,
      [name],
    ).lastInsertId;
  }

  it('constructs every public command variant and refuses both stored-only restore forms', async () => {
    const factory = new CharacterCommandFactory(db, integrity);
    const characterId = 41;
    const slotState = {
      current_spell_version_id: null,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'unselected' as const,
      selection_invalid_reason: null,
      state: 'active' as const,
      override_note: null,
    };
    const protectedRestore = await integrity.attach(characterId, {
      type: 'set_slot' as const,
      slot_id: 1,
      mode: 'restore' as const,
      state: slotState,
    });
    const protectedDelete = await integrity.attach(characterId, {
      type: 'acknowledge_warning' as const,
      mode: 'delete' as const,
      warning_fingerprint: 'conflicting_versions:test',
    });
    const variants: readonly [
      CharacterCommandPayload,
      abstract new (...args: never[]) => object,
    ][] = [
      [
        { type: 'update_ability', ability: 'wisdom', score: 16 },
        UpdateAbilityCommand,
      ],
      [
        { type: 'set_slot', slot_id: 1, mode: 'select', spell_version_id: 1 },
        SelectSlotCommand,
      ],
      [
        { type: 'set_slot', slot_id: 1, mode: 'clear' },
        ClearSlotCommand,
      ],
      [
        { type: 'set_slot', slot_id: 1, mode: 'keep_override', note: 'Kept' },
        KeepOverrideSlotCommand,
      ],
      [protectedRestore, RestoreSlotCommand],
      [
        { type: 'update_character_rules', allow_legacy: true },
        UpdateCharacterRulesCommand,
      ],
      [
        {
          type: 'update_character_flavor',
          alignment: null,
          appearance: null,
          backstory: null,
          notes: null,
        },
        UpdateCharacterFlavorCommand,
      ],
      [
        {
          type: 'update_source_config',
          source_instance_id: 1,
          chosen_list: 'Cleric',
        },
        UpdateSourceConfigCommand,
      ],
      [
        {
          type: 'add_source',
          source_type: 'feat',
          source_definition_id: 1,
          config: {},
        },
        AddSourceCommand,
      ],
      [
        { type: 'remove_source', source_instance_id: 1 },
        RemoveSourceCommand,
      ],
      [
        {
          type: 'acknowledge_warning',
          warning_fingerprint: 'conflicting_versions:test',
          note: 'Reviewed',
        },
        AcknowledgeWarningCommand,
      ],
      [protectedDelete, AcknowledgeWarningCommand],
      [
        { type: 'update_class', class_definition_id: 1 },
        UpdateClassCommand,
      ],
    ];

    expect(variants).toHaveLength(13);
    for (const [payload, expected] of variants) {
      expect(await factory.make(characterId, payload)).toBeInstanceOf(expected);
    }

    await expect(
      factory.make(characterId + 1, protectedRestore),
    ).rejects.toThrow(
      'This internal character command is invalid or belongs to another character.',
    );
    await expect(factory.make(characterId, {
      type: 'update_character_flavor',
      mode: 'restore',
      alignment: null,
      appearance: '   ',
      backstory: null,
      notes: '',
      integrity: '0'.repeat(64),
    })).rejects.toThrow('Unknown command field: mode.');
    await expect(factory.make(characterId, {
      type: 'restore_snapshot',
      snapshot: { schema_version: 'a7-v1' },
      integrity: '0'.repeat(64),
    })).rejects.toThrow('Unknown character command type.');
  });

  it('update_character_flavor stores a current inverse and refuses the legacy stored-row fixture without writes', async () => {
    const characterId = character();
    db.exec(
      `UPDATE characters
       SET alignment = ?, appearance = ?, backstory = ?, notes = ?
       WHERE id = ?`,
      [
        'Lawful Neutral',
        'Old appearance',
        'Old backstory',
        'Old notes',
        characterId,
      ],
    );
    const executor = new CharacterCommandExecutor(db, integrity, {
      clock: () => '2026-08-04T12:00:00.000Z',
      randomUuid: () => undoOperation,
    });
    const result = await executor.execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        alignment: '  Chaotic Good  ',
        appearance: 'Silver hair\nGreen cloak',
        backstory: null,
        notes: 'Ask about the brass key.',
        reason: 'One details save',
      },
    });

    expect(result).toMatchObject({
      inverse: {
        type: 'internal_flavor_restore',
        alignment: 'Lawful Neutral',
        appearance: 'Old appearance',
        backstory: 'Old backstory',
        notes: 'Old notes',
      },
      operation_uuid: firstOperation,
      revision: 1,
      idempotent_replay: false,
    });
    expect(
      db.oneRaw(
        `SELECT alignment, appearance, backstory, notes, revision, updated_at
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      alignment: '  Chaotic Good  ',
      appearance: 'Silver hair\nGreen cloak',
      backstory: null,
      notes: 'Ask about the brass key.',
      revision: 1,
      updated_at: '2026-08-04T12:00:00.000Z',
    });
    expect(
      db.allRaw(
        `SELECT expected_revision, resulting_revision, inverse_command
         FROM character_operations`,
      ),
    ).toEqual([
      {
        expected_revision: 0,
        resulting_revision: 1,
        inverse_command: JSON.stringify(result.inverse),
      },
    ]);
    const changes = db.allRaw(
      `SELECT sequence, group_id, operation_uuid, action_type, reason,
              reversible, previous_value, new_value
       FROM change_log`,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      sequence: 1,
      operation_uuid: firstOperation,
      action_type: 'update_character_flavor',
      reason: 'One details save',
      reversible: 1,
    });
    expect(String(changes[0]?.group_id)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,
    );
    expect(JSON.parse(String(changes[0]?.previous_value))).toMatchObject({
      alignment: 'Lawful Neutral',
      appearance: 'Old appearance',
      backstory: 'Old backstory',
      notes: 'Old notes',
    });
    expect(JSON.parse(String(changes[0]?.new_value))).toMatchObject({
      alignment: '  Chaotic Good  ',
      appearance: 'Silver hair\nGreen cloak',
      backstory: null,
      notes: 'Ask about the brass key.',
    });

    const frozenSignedInverse = JSON.stringify({
      type: 'update_character_flavor',
      mode: 'restore',
      alignment: 'Lawful Neutral',
      appearance: 'Old appearance',
      backstory: 'Old backstory',
      notes: 'Old notes',
      integrity: 'already-persisted-signature-bytes',
    });
    db.exec(
      `UPDATE character_operations SET inverse_command = ?
       WHERE operation_uuid = ?`,
      [frozenSignedInverse, firstOperation],
    );
    const undo = await executor.undo({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 1,
    });
    expect(undo).toEqual({
      status: 'refused',
      reason: 'legacy_operation',
      current_revision: 1,
    });
    expect(
      db.oneRaw(
        `SELECT alignment, appearance, backstory, notes, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      alignment: '  Chaotic Good  ',
      appearance: 'Silver hair\nGreen cloak',
      backstory: null,
      notes: 'Ask about the brass key.',
      revision: 1,
    });
    expect(Number(db.scalar('SELECT count(*) FROM character_operations'))).toBe(1);
    expect(Number(db.scalar('SELECT count(*) FROM change_log'))).toBe(1);
    expect(db.scalar(
      `SELECT inverse_command FROM character_operations
       WHERE operation_uuid = ?`,
      [firstOperation],
    )).toBe(frozenSignedInverse);
  });

  it('update_character_flavor preserves nonblank bytes and stores whitespace-only as null', async () => {
    const characterId = character();
    const executor = new CharacterCommandExecutor(db, integrity, {
      randomUuid: () => undoOperation,
    });
    await executor.execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        alignment: '  Neutral Good  ',
        appearance: '\n  Silver hair\nGreen cloak  \n',
        backstory: '\t \n',
        notes: '',
      },
    });

    expect(
      db.oneRaw(
        `SELECT alignment, appearance, backstory, notes
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      alignment: '  Neutral Good  ',
      appearance: '\n  Silver hair\nGreen cloak  \n',
      backstory: null,
      notes: null,
    });
  });

  it('edits another field without validating or changing grandfathered note bytes', async () => {
    const characterId = character();
    const prefix = 'e\u0301\u0001\0🧙';
    const grandfathered = `${prefix}${'x'.repeat(25_000 - [...prefix].length)}`;
    const expectedBytes = new TextEncoder().encode(grandfathered);
    expect([...grandfathered]).toHaveLength(25_000);
    db.exec(
      `UPDATE characters SET alignment = 'Neutral', notes = ? WHERE id = ?`,
      [grandfathered, characterId],
    );
    const executor = new CharacterCommandExecutor(db, integrity);

    const result = await executor.execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        alignment: 'Chaotic Good',
      },
    });

    const stored = db.oneRaw(
      `SELECT alignment, notes, revision FROM characters WHERE id = ?`,
      [characterId],
    );
    expect(stored).toEqual({
      alignment: 'Chaotic Good',
      notes: grandfathered,
      revision: 1,
    });
    expect(new TextEncoder().encode(String(stored?.notes))).toEqual(
      expectedBytes,
    );
    expect(Number(db.scalar('SELECT count(*) FROM character_operations'))).toBe(1);
    expect(Number(db.scalar('SELECT count(*) FROM change_log'))).toBe(1);
    expect(result.inverse).toMatchObject({
      type: 'internal_flavor_restore',
      alignment: 'Neutral',
      notes: grandfathered,
    });
  });

  it('undo restores null, empty-string, and whitespace-only bytes exactly', async () => {
    const characterId = character();
    db.exec(
      `UPDATE characters
       SET alignment = NULL, appearance = '   ', backstory = NULL, notes = ''
       WHERE id = ?`,
      [characterId],
    );
    const executor = new CharacterCommandExecutor(db, integrity);
    const result = await executor.execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        alignment: 'Lawful Good',
      },
    });

    expect(
      db.oneRaw(
        `SELECT alignment, appearance, backstory, notes
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      alignment: 'Lawful Good',
      appearance: '   ',
      backstory: null,
      notes: '',
    });

    await executor.undo({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 1,
    });
    const restored = db.oneRaw(
      `SELECT alignment, appearance, backstory, notes, revision
       FROM characters WHERE id = ?`,
      [characterId],
    );
    expect(restored).toEqual({
      alignment: null,
      appearance: '   ',
      backstory: null,
      notes: '',
      revision: 2,
    });
    expect(new TextEncoder().encode(String(restored?.appearance))).toEqual(
      new Uint8Array([32, 32, 32]),
    );
    expect(new TextEncoder().encode(String(restored?.notes))).toEqual(
      new Uint8Array([]),
    );
    expect(restored?.backstory).toBeNull();
    expect(restored?.notes).not.toBeNull();
  });

  it('refuses NUL anywhere in all four fields as a typed refusal before SQLite starts a write', async () => {
    const characterId = character();
    const executor = new CharacterCommandExecutor(db, integrity);
    for (const field of ['alignment', 'appearance', 'backstory', 'notes'] as const) {
      const execution = executor.execute({
        character_id: characterId,
        operation_uuid: firstOperation,
        expected_revision: 0,
        command: {
          type: 'update_character_flavor',
          [field]: 'visible\0suffix',
        } as unknown as CharacterCommandPayload,
      });

      await expect(execution).rejects.toBeInstanceOf(CharacterCommandPayloadError);
      await expect(execution).rejects.toThrow(
        `${field} must not contain NUL.`,
      );
    }
    expect(
      db.oneRaw('SELECT appearance, revision FROM characters WHERE id = ?', [
        characterId,
      ]),
    ).toEqual({ appearance: null, revision: 0 });
    expect(Number(db.scalar('SELECT count(*) FROM character_operations'))).toBe(0);
    expect(Number(db.scalar('SELECT count(*) FROM change_log'))).toBe(0);
  });

  it('update_character_flavor is all-or-nothing', async () => {
    const characterId = character();
    db.exec(
      `UPDATE characters SET alignment = 'Original', backstory = 'Original story'
       WHERE id = ?`,
      [characterId],
    );
    const executor = new CharacterCommandExecutor(db, integrity);

    await expect(
      executor.execute({
        character_id: characterId,
        operation_uuid: firstOperation,
        expected_revision: 0,
        command: {
          type: 'update_character_flavor',
          alignment: 'Changed too early',
          appearance: null,
          backstory: 'x'.repeat(CHARACTER_TEXT_LIMITS.backstory + 1),
          notes: null,
        },
      }),
    ).rejects.toThrow(
      `backstory must not exceed ${String(CHARACTER_TEXT_LIMITS.backstory)} characters.`,
    );
    expect(
      db.oneRaw(
        `SELECT alignment, appearance, backstory, notes, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      alignment: 'Original',
      appearance: null,
      backstory: 'Original story',
      notes: null,
      revision: 0,
    });
    expect(Number(db.scalar('SELECT count(*) FROM character_operations'))).toBe(0);
    expect(Number(db.scalar('SELECT count(*) FROM change_log'))).toBe(0);
  });

  it('update_character_flavor accepts the code-point boundary and refuses limit+1 by field name', async () => {
    const characterId = character();
    const executor = new CharacterCommandExecutor(db, integrity);
    const astral = '🧙';
    const boundary = astral.repeat(CHARACTER_TEXT_LIMITS.backstory);
    await executor.execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_flavor',
        alignment: null,
        appearance: null,
        backstory: boundary,
        notes: null,
      },
    });
    expect(
      db.scalar('SELECT backstory FROM characters WHERE id = ?', [characterId]),
    ).toBe(boundary);

    await expect(
      executor.execute({
        character_id: characterId,
        operation_uuid: undoOperation,
        expected_revision: 1,
        command: {
          type: 'update_character_flavor',
          alignment: null,
          appearance: null,
          backstory: `${boundary}${astral}`,
          notes: null,
        },
      }),
    ).rejects.toThrow(
      `backstory must not exceed ${String(CHARACTER_TEXT_LIMITS.backstory)} characters.`,
    );
    expect(
      db.oneRaw(
        'SELECT backstory, revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({ backstory: boundary, revision: 1 });
  });

  it('persists mutation, inverse, one revision, and grouped reversible audit rows, then undoes it', async () => {
    const characterId = character();
    const executor = new CharacterCommandExecutor(db, integrity, {
      clock: () => '2026-07-23T12:00:00.000Z',
      randomUuid: () => undoOperation,
    });
    const result = await executor.execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 18,
        reason: 'Level-up choice',
      },
    });

    expect(result).toEqual({
      inverse: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 13,
      },
      operation_uuid: firstOperation,
      revision: 1,
      idempotent_replay: false,
    });
    expect(
      db.oneRaw(
        `SELECT wisdom, revision, updated_at
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      wisdom: 18,
      revision: 1,
      updated_at: '2026-07-23T12:00:00.000Z',
    });
    const operation = db.oneRaw(
      `SELECT character_id, operation_uuid, expected_revision,
              resulting_revision, inverse_command
       FROM character_operations`,
    );
    expect(operation).toEqual({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      resulting_revision: 1,
      inverse_command: JSON.stringify(result.inverse),
    });
    const audit = db.allRaw(
      `SELECT sequence, group_id, operation_uuid, entity_type, entity_id,
              previous_value, new_value, reason, action_type, reversible
       FROM change_log`,
    );
    expect(audit).toHaveLength(1);
    const auditRow = audit[0]!;
    expect(auditRow).toMatchObject({
      sequence: 1,
      operation_uuid: firstOperation,
      entity_type: 'character',
      entity_id: null,
      reason: 'Level-up choice',
      action_type: 'update_ability',
      reversible: 1,
    });
    expect(String(auditRow.group_id)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(JSON.parse(String(auditRow.previous_value))).toMatchObject({
      wisdom: 13,
    });
    expect(JSON.parse(String(auditRow.new_value))).toMatchObject({
      wisdom: 18,
    });

    await executor.undo({
      character_id: characterId,
      operation_uuid: result.operation_uuid,
      expected_revision: 1,
    });
    expect(
      db.oneRaw(
        'SELECT wisdom, revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({ wisdom: 13, revision: 2 });
    expect(
      Number(db.scalar('SELECT count(*) FROM character_operations')),
    ).toBe(2);
    expect(Number(db.scalar('SELECT count(*) FROM change_log'))).toBe(2);
    expect(
      Number(
        db.scalar(
          `SELECT count(DISTINCT group_id)
           FROM change_log
           WHERE operation_uuid IN (?, ?)`,
          [firstOperation, undoOperation],
        ),
      ),
    ).toBe(2);
  });

  it('assigns every row from one multi-entity command to one audit group', async () => {
    const characterId = character();
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES ('x50:legacy-identity', 'Legacy Spell', 'legacy spell')`,
    ).lastInsertId;
    const spellId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school
       ) VALUES ('x50:legacy-spell', ?, 'Legacy Spell', '2014',
         0, 'Evocation')`,
      [identityId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO spell_list_memberships
         (spell_version_id, spell_list_key)
       VALUES (?, 'Wizard')`,
      [spellId],
    );
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 'x50:group-source', 'feat', 'Group Source')`,
      [characterId],
    ).lastInsertId;
    const slotId = db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key,
         bucket, eligibility_kind, current_spell_version_id,
         allowed_spell_lists, selection_eligibility,
         selection_invalid_reason
       ) VALUES (?, ?, 'x50:group-slot', 'x50:group-rule', 'known',
         'choice_from_query', ?, '["Wizard"]', 'invalid',
         'Enable legacy rules before selecting a 2014 spell version.')`,
      [characterId, sourceId, spellId],
    ).lastInsertId;

    await new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: firstOperation,
      expected_revision: 0,
      command: {
        type: 'update_character_rules',
        allow_legacy: true,
      },
    });

    expect(
      db.oneRaw(
        `SELECT allow_legacy, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ allow_legacy: 1, revision: 1 });
    expect(
      db.oneRaw(
        `SELECT selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
    const audit = db.allRaw(
      `SELECT sequence, group_id, operation_uuid, entity_type, entity_id
       FROM change_log ORDER BY sequence`,
    );
    expect(audit).toHaveLength(2);
    expect(new Set(audit.map((row) => row.group_id)).size).toBe(1);
    expect(audit.map((row) => row.operation_uuid)).toEqual([
      firstOperation,
      firstOperation,
    ]);
    expect(audit.map((row) => [row.entity_type, row.entity_id])).toEqual([
      ['character', null],
      ['spell_selection_slots', slotId],
    ]);
  });

  it('rolls back command, revision, audit, and operation when audit persistence fails', async () => {
    const characterId = character();
    const failingAudit: CharacterAuditWriter = {
      append: () => {
        throw new Error('Injected audit failure.');
      },
    };
    const executor = new CharacterCommandExecutor(db, integrity, {
      audit: failingAudit,
    });

    await expect(
      executor.execute({
        character_id: characterId,
        operation_uuid: firstOperation,
        expected_revision: 0,
        command: {
          type: 'update_ability',
          ability: 'wisdom',
          score: 18,
        },
      }),
    ).rejects.toThrow('Injected audit failure.');

    expect(
      db.oneRaw(
        `SELECT wisdom, revision, updated_at
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      wisdom: 13,
      revision: 0,
      updated_at: '2000-01-01T00:00:00.000Z',
    });
    expect(
      Number(db.scalar('SELECT count(*) FROM character_operations')),
    ).toBe(0);
    expect(Number(db.scalar('SELECT count(*) FROM change_log'))).toBe(0);
  });
});
