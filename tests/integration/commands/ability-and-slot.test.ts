import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterAll, describe, expect, it } from 'vitest';
import { CharacterState } from '../../../src/character/character-state';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { UpdateAbilityCommand } from '../../../src/commands/update-ability';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { ClearSlotCommand } from '../../../src/commands/set-slot/clear';
import { KeepOverrideSlotCommand } from '../../../src/commands/set-slot/keep-override';
import { RestoreSlotCommand } from '../../../src/commands/set-slot/restore';
import { SelectSlotCommand } from '../../../src/commands/set-slot/select';
import type {
  RestoreSlotPayload,
} from '../../../src/commands/set-slot/shared';
import { DatabaseContext } from '../../../src/db/database';
import { eligibilityInvalidReasons } from '../../../src/eligibility/spell-selection-eligibility';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

const integrityKey = 'C41-command-integrity-key';
const oldTimestamp = '2000-01-01T00:00:00.000Z';
const changedTimestamp = '2026-07-23T12:00:00.000Z';
const restoredTimestamp = '2026-07-23T12:01:00.000Z';
const openDatabases: Database[] = [];

interface Fixture {
  readonly connection: Database;
  readonly db: DatabaseContext;
  readonly integrity: CharacterCommandIntegrity;
  readonly characterId: number;
  readonly otherCharacterId: number;
  readonly sourceId: number;
  readonly slotId: number;
  readonly originalSpellId: number;
  readonly replacementSpellId: number;
  readonly legacySpellId: number;
  readonly inactiveSpellId: number;
  readonly wrongListSpellId: number;
}

function clock(value: string): () => string {
  return () => value;
}

function addSpell(
  db: DatabaseContext,
  key: string,
  options: {
    edition?: '2014' | '2024';
    active?: boolean;
    list?: string;
  } = {},
): number {
  registerFixtureContentIdentity(db, {
    kind: 'spell', contentKey: `version:${key}`, name: key,
    keyKind: 'bundled-stable',
  });
  const identityId = db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES (?, ?, ?)`,
    [`identity:${key}`, key, key.toLowerCase()],
  ).lastInsertId;
  const spellId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, is_active
     ) VALUES (?, ?, ?, ?, 0, 'Evocation', ?)`,
    [
      `version:${key}`,
      identityId,
      key,
      options.edition ?? '2024',
      options.active === false ? 0 : 1,
    ],
  ).lastInsertId;
  if (options.list !== undefined) {
    db.exec(
      `INSERT INTO spell_list_memberships
         (spell_version_id, spell_list_key)
       VALUES (?, ?)`,
      [spellId, options.list],
    );
  }
  return spellId;
}

async function fixture(): Promise<Fixture> {
  const connection = await openTestDatabase();
  openDatabases.push(connection);
  const db = new DatabaseContext(connection);
  const characterId = db.exec(
    `INSERT INTO characters (
       name, wisdom, allow_legacy, ability_allocation_method,
       created_at, updated_at
     ) VALUES ('Command Character', 13, 1, 'point_buy', ?, ?)`,
    [oldTimestamp, oldTimestamp],
  ).lastInsertId;
  const otherCharacterId = db.exec(
    "INSERT INTO characters (name) VALUES ('Other Character')",
  ).lastInsertId;
  const sourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, display_name, state,
       created_at, updated_at
     ) VALUES (?, 'c41-source', 'feat', 'C41 Source', 'active', ?, ?)`,
    [characterId, oldTimestamp, oldTimestamp],
  ).lastInsertId;
  const originalSpellId = addSpell(db, 'Original', { list: 'Wizard' });
  const replacementSpellId = addSpell(db, 'Replacement', {
    list: 'Wizard',
  });
  const legacySpellId = addSpell(db, 'Legacy', {
    edition: '2014',
    list: 'Wizard',
  });
  const inactiveSpellId = addSpell(db, 'Inactive', {
    active: false,
    list: 'Wizard',
  });
  const wrongListSpellId = addSpell(db, 'Wrong List', {
    list: 'Cleric',
  });
  const slotId = db.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, ordinal,
       bucket, eligibility_kind, current_spell_version_id,
       spell_level_min, spell_level_max, allowed_spell_lists,
       state, override_note, selection_eligibility,
       selection_invalid_reason, created_at, updated_at
     ) VALUES (
       ?, ?, 'c41-slot', 'c41-rule', 1, 'cantrip_known',
       'choice_from_list', ?, 0, 0, '["Wizard"]', 'active', NULL,
       'valid', NULL, ?, ?
     )`,
    [
      characterId,
      sourceId,
      originalSpellId,
      oldTimestamp,
      oldTimestamp,
    ],
  ).lastInsertId;

  return {
    connection,
    db,
    integrity: new CharacterCommandIntegrity(integrityKey),
    characterId,
    otherCharacterId,
    sourceId,
    slotId,
    originalSpellId,
    replacementSpellId,
    legacySpellId,
    inactiveSpellId,
    wrongListSpellId,
  };
}

function storedSlot(db: DatabaseContext, slotId: number) {
  return db.oneRaw(
    `SELECT current_spell_version_id, selection_acquired_at_class_level,
            selection_eligibility,
            selection_invalid_reason, state, override_note, updated_at
     FROM spell_selection_slots
     WHERE id = ?`,
    [slotId],
  );
}

async function applyRestore(
  test: Fixture,
  characterId: number,
  payload: RestoreSlotPayload,
  timestamp = restoredTimestamp,
): Promise<RestoreSlotCommand> {
  await test.integrity.assertValid(characterId, payload);
  const command = new RestoreSlotCommand(
    test.db,
    payload,
    test.integrity,
    undefined,
    clock(timestamp),
  );
  command.apply(characterId);
  return command;
}

afterAll(() => {
  for (const database of openDatabases) {
    database.close();
  }
});

describe('update_ability command', () => {
  it('persists one bounded ability and timestamp, supplies its exact inverse, and produces the audit diff input', async () => {
    const test = await fixture();
    const state = new CharacterState(test.db);
    const before = state.capture(test.characterId);
    const command = new UpdateAbilityCommand(
      test.db,
      { type: 'update_ability', ability: 'wisdom', score: 18 },
      clock(changedTimestamp),
    );

    command.apply(test.characterId);
    const after = state.capture(test.characterId);

    expect(
      test.db.oneRaw(
        `SELECT wisdom, intelligence, ability_allocation_method, updated_at
         FROM characters WHERE id = ?`,
        [test.characterId],
      ),
    ).toEqual({
      wisdom: 18,
      intelligence: 10,
      ability_allocation_method: 'point_buy',
      updated_at: changedTimestamp,
    });
    const inversePayload = command.inverse();
    expect(inversePayload).toEqual({
      type: 'update_ability',
      ability: 'wisdom',
      score: 13,
    });
    if (inversePayload.type !== 'update_ability') {
      throw new Error('An already-allocated ability edit must use a precise inverse.');
    }
    expect(state.diff(before, after)).toEqual([
      {
        entity_type: 'character',
        entity_id: null,
        previous_value: before.character,
        new_value: after.character,
      },
    ]);

    const inverse = new UpdateAbilityCommand(
      test.db,
      inversePayload,
      clock(restoredTimestamp),
    );
    inverse.apply(test.characterId);
    expect(
      test.db.oneRaw(
        `SELECT wisdom, ability_allocation_method, updated_at
         FROM characters WHERE id = ?`,
        [test.characterId],
      ),
    ).toEqual({
      wisdom: 13,
      ability_allocation_method: 'point_buy',
      updated_at: restoredTimestamp,
    });

    const persistedBeforeRejection = test.db.oneRaw(
      'SELECT * FROM characters WHERE id = ?',
      [test.characterId],
    );
    expect(() =>
      new UpdateAbilityCommand(
        test.db,
        {
          type: 'update_ability',
          ability: 'wisdom',
          score: 0,
        },
      ).apply(test.characterId),
    ).toThrow('Ability scores must be between 1 and 30.');
    expect(
      test.db.oneRaw('SELECT * FROM characters WHERE id = ?', [
        test.characterId,
      ]),
    ).toEqual(persistedBeforeRejection);
  });

  it('claims untouched scores as manual on the first workspace edit and undo restores NULL with the score', async () => {
    const test = await fixture();
    test.db.exec(
      'UPDATE characters SET ability_allocation_method = NULL WHERE id = ?',
      [test.characterId],
    );
    const executor = new CharacterCommandExecutor(test.db, test.integrity);

    const result = await executor.execute({
      character_id: test.characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 18,
      },
    });

    expect(result.inverse).toMatchObject({
      type: 'internal_snapshot_restore',
    });
    expect(
      test.db.oneRaw(
        `SELECT wisdom, ability_allocation_method, revision
         FROM characters WHERE id = ?`,
        [test.characterId],
      ),
    ).toEqual({
      wisdom: 18,
      ability_allocation_method: 'manual',
      revision: 1,
    });
    expect(
      test.db.scalar(
        'SELECT count(*) FROM character_operations WHERE character_id = ?',
        [test.characterId],
      ),
    ).toBe(1);

    await executor.undo({
      character_id: test.characterId,
      operation_uuid: result.operation_uuid,
      expected_revision: 1,
    });
    expect(
      test.db.oneRaw(
        `SELECT wisdom, ability_allocation_method, revision
         FROM characters WHERE id = ?`,
        [test.characterId],
      ),
    ).toEqual({
      wisdom: 13,
      ability_allocation_method: null,
      revision: 2,
    });
  });
});

describe('set_slot select and inverse', () => {
  it('persists a valid active selection, clears an override, signs prior state, and exposes one exact slot audit diff', async () => {
    const test = await fixture();
    test.db.exec(
      `UPDATE spell_selection_slots
       SET state = 'kept_override', override_note = 'Old exception'
       WHERE id = ?`,
      [test.slotId],
    );
    const state = new CharacterState(test.db);
    const before = state.capture(test.characterId);
    const command = new SelectSlotCommand(
      test.db,
      {
        type: 'set_slot',
        slot_id: test.slotId,
        mode: 'select',
        spell_version_id: test.replacementSpellId,
      },
      test.integrity,
      undefined,
      clock(changedTimestamp),
    );

    command.apply(test.characterId);
    const after = state.capture(test.characterId);

    expect(storedSlot(test.db, test.slotId)).toEqual({
      current_spell_version_id: test.replacementSpellId,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: 'active',
      override_note: null,
      updated_at: changedTimestamp,
    });
    const inverse = await command.inverse();
    expect(inverse).toMatchObject({
      type: 'set_slot',
      slot_id: test.slotId,
      mode: 'restore',
      state: {
        current_spell_version_id: test.originalSpellId,
        selection_eligibility: 'valid',
        selection_invalid_reason: null,
        state: 'kept_override',
        override_note: 'Old exception',
      },
    });
    await expect(
      test.integrity.assertValid(test.characterId, inverse),
    ).resolves.toBeUndefined();

    const diff = state.diff(before, after);
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({
      entity_type: 'spell_selection_slots',
      entity_id: test.slotId,
      previous_value: before.spell_selection_slots[0],
      new_value: after.spell_selection_slots[0],
    });

    const restore = await applyRestore(test, test.characterId, inverse);
    expect(storedSlot(test.db, test.slotId)).toEqual({
      current_spell_version_id: test.originalSpellId,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: 'kept_override',
      override_note: 'Old exception',
      updated_at: restoredTimestamp,
    });
    const redo = await restore.inverse();
    expect(redo.state).toMatchObject({
      current_spell_version_id: test.replacementSpellId,
      state: 'active',
      override_note: null,
    });
    await expect(
      test.integrity.assertValid(test.characterId, redo),
    ).resolves.toBeUndefined();
  });

  it('rejects inactive and ineligible candidates without changing persisted slot bytes', async () => {
    const test = await fixture();
    const before = test.db.oneRaw(
      'SELECT * FROM spell_selection_slots WHERE id = ?',
      [test.slotId],
    );

    for (const [spellVersionId, message] of [
      [test.inactiveSpellId, eligibilityInvalidReasons.inactive],
      [test.wrongListSpellId, eligibilityInvalidReasons.list],
    ] as const) {
      const command = new SelectSlotCommand(
        test.db,
        {
          type: 'set_slot',
          slot_id: test.slotId,
          mode: 'select',
          spell_version_id: spellVersionId,
        },
        test.integrity,
      );
      expect(() => command.apply(test.characterId)).toThrow(message);
      expect(
        test.db.oneRaw(
          'SELECT * FROM spell_selection_slots WHERE id = ?',
          [test.slotId],
        ),
      ).toEqual(before);
    }
  });
});

describe('set_slot clear and keep_override', () => {
  it('persists clear/discard and trimmed override states with signed round-trip inverses', async () => {
    const test = await fixture();
    const clear = new ClearSlotCommand(
      test.db,
      { type: 'set_slot', slot_id: test.slotId, mode: 'clear' },
      test.integrity,
      undefined,
      clock(changedTimestamp),
    );
    clear.apply(test.characterId);
    expect(storedSlot(test.db, test.slotId)).toEqual({
      current_spell_version_id: null,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'unselected',
      selection_invalid_reason: null,
      state: 'active',
      override_note: null,
      updated_at: changedTimestamp,
    });

    const clearedRow = test.db.oneRaw(
      'SELECT * FROM spell_selection_slots WHERE id = ?',
      [test.slotId],
    );
    expect(() =>
      new KeepOverrideSlotCommand(
        test.db,
        {
          type: 'set_slot',
          slot_id: test.slotId,
          mode: 'keep_override',
          note: 'Not possible yet',
        },
        test.integrity,
      ).apply(test.characterId),
    ).toThrow('Choose a spell before keeping an override.');
    expect(
      test.db.oneRaw('SELECT * FROM spell_selection_slots WHERE id = ?', [
        test.slotId,
      ]),
    ).toEqual(clearedRow);

    await applyRestore(test, test.characterId, await clear.inverse());
    const keep = new KeepOverrideSlotCommand(
      test.db,
      {
        type: 'set_slot',
        slot_id: test.slotId,
        mode: 'keep_override',
        note: '  Deliberate exception.  ',
      },
      test.integrity,
      undefined,
      clock(changedTimestamp),
    );
    keep.apply(test.characterId);
    expect(storedSlot(test.db, test.slotId)).toEqual({
      current_spell_version_id: test.originalSpellId,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: 'kept_override',
      override_note: 'Deliberate exception.',
      updated_at: changedTimestamp,
    });
    expect((await keep.inverse()).state).toEqual({
      current_spell_version_id: test.originalSpellId,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: 'active',
      override_note: null,
    });

    test.db.exec(
      `UPDATE spell_selection_slots
       SET state = 'orphaned',
           orphan_reason_code = 'rule_no_longer_active'
       WHERE id = ?`,
      [test.slotId],
    );
    const discard = new ClearSlotCommand(
      test.db,
      { type: 'set_slot', slot_id: test.slotId, mode: 'clear' },
      test.integrity,
    );
    discard.apply(test.characterId);
    expect(
      test.db.oneRaw(
        `SELECT current_spell_version_id, state, selection_eligibility
         FROM spell_selection_slots WHERE id = ?`,
        [test.slotId],
      ),
    ).toEqual({
      current_spell_version_id: null,
      state: 'discarded',
      selection_eligibility: 'unselected',
    });
  });
});

describe('set_slot restore revalidation', () => {
  it('restores a stale inverse selection but persists current invalid eligibility', async () => {
    const test = await fixture();
    test.db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?
       WHERE id = ?`,
      [test.legacySpellId, test.slotId],
    );
    const clear = new ClearSlotCommand(
      test.db,
      { type: 'set_slot', slot_id: test.slotId, mode: 'clear' },
      test.integrity,
    );
    clear.apply(test.characterId);
    const inverse = await clear.inverse();
    test.db.exec(
      'UPDATE characters SET allow_legacy = 0 WHERE id = ?',
      [test.characterId],
    );

    await applyRestore(test, test.characterId, inverse);

    expect(storedSlot(test.db, test.slotId)).toEqual({
      current_spell_version_id: test.legacySpellId,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'invalid',
      selection_invalid_reason: eligibilityInvalidReasons.legacy,
      state: 'active',
      override_note: null,
      updated_at: restoredTimestamp,
    });
  });

  it('keeps newly orphaned inverse selections orphaned with both exact persisted reasons', async () => {
    const test = await fixture();
    const restoreState = {
      current_spell_version_id: test.originalSpellId,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: 'kept_override',
      override_note: 'Historical exception',
    } as const;

    for (const [orphanCode, reason] of [
      [
        'rule_no_longer_active',
        'Selection preserved because its grant rule is no longer active.',
      ],
      [
        'source_no_longer_active',
        'Selection preserved because its source is no longer active.',
      ],
    ] as const) {
      test.db.exec(
        `UPDATE spell_selection_slots
         SET state = 'orphaned', orphan_reason_code = ?,
             selection_eligibility = 'invalid',
             selection_invalid_reason = NULL,
             current_spell_version_id = NULL,
             override_note = NULL, updated_at = ?
         WHERE id = ?`,
        [orphanCode, oldTimestamp, test.slotId],
      );
      const payload = await test.integrity.attach(
        test.characterId,
        {
          type: 'set_slot',
          slot_id: test.slotId,
          mode: 'restore',
          state: restoreState,
        } as const,
      );

      await applyRestore(
        test,
        test.characterId,
        payload,
        changedTimestamp,
      );

      expect(storedSlot(test.db, test.slotId)).toEqual({
        current_spell_version_id: test.originalSpellId,
        selection_acquired_at_class_level: null,
        selection_eligibility: 'invalid',
        selection_invalid_reason: reason,
        state: 'orphaned',
        override_note: 'Historical exception',
        updated_at: changedTimestamp,
      });
    }
  });
});

describe('set_slot ownership, lock, and inactive inverse guards', () => {
  it('rejects cross-character, locked, and inactive restore writes byte-for-byte', async () => {
    const test = await fixture();
    const before = test.db.oneRaw(
      'SELECT * FROM spell_selection_slots WHERE id = ?',
      [test.slotId],
    );
    const otherCharacterClear = new ClearSlotCommand(
      test.db,
      { type: 'set_slot', slot_id: test.slotId, mode: 'clear' },
      test.integrity,
    );
    expect(() =>
      otherCharacterClear.apply(test.otherCharacterId),
    ).toThrow('Spell slot does not belong to this character.');
    expect(
      test.db.oneRaw('SELECT * FROM spell_selection_slots WHERE id = ?', [
        test.slotId,
      ]),
    ).toEqual(before);

    test.db.exec(
      'UPDATE spell_selection_slots SET is_locked = 1 WHERE id = ?',
      [test.slotId],
    );
    const lockedBefore = test.db.oneRaw(
      'SELECT * FROM spell_selection_slots WHERE id = ?',
      [test.slotId],
    );
    expect(() =>
      new ClearSlotCommand(
        test.db,
        { type: 'set_slot', slot_id: test.slotId, mode: 'clear' },
        test.integrity,
      ).apply(test.characterId),
    ).toThrow('This spell slot is locked.');
    expect(
      test.db.oneRaw('SELECT * FROM spell_selection_slots WHERE id = ?', [
        test.slotId,
      ]),
    ).toEqual(lockedBefore);

    test.db.exec(
      'UPDATE spell_selection_slots SET is_locked = 0 WHERE id = ?',
      [test.slotId],
    );
    const inactivePayload = await test.integrity.attach(
      test.characterId,
      {
        type: 'set_slot',
        slot_id: test.slotId,
        mode: 'restore',
        state: {
          current_spell_version_id: test.inactiveSpellId,
          selection_acquired_at_class_level: null,
          selection_eligibility: 'valid',
          selection_invalid_reason: null,
          state: 'active',
          override_note: null,
        },
      } as const,
    );
    const inactiveBefore = test.db.oneRaw(
      'SELECT * FROM spell_selection_slots WHERE id = ?',
      [test.slotId],
    );
    await expect(
      applyRestore(test, test.characterId, inactivePayload),
    ).rejects.toThrow(
      `Slot restore references inactive spell version ${test.inactiveSpellId}.`,
    );
    expect(
      test.db.oneRaw('SELECT * FROM spell_selection_slots WHERE id = ?', [
        test.slotId,
      ]),
    ).toEqual(inactiveBefore);
  });
});
