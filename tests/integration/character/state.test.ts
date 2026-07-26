import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CharacterState,
  CHARACTER_STATE_COLUMNS,
  CHARACTER_STATE_TABLES,
  type CharacterStateSnapshot,
} from '../../../src/character/character-state';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';

type MutableSnapshot = Record<string, any>;

const createdAt = '2024-01-02 03:04:05';
const updatedAt = '2024-06-07 08:09:10';

let connection: Database;
let db: DatabaseContext;
let state: CharacterState;
let characterId: number;
let activeSpellId: number;
let inactiveSpellId: number;

function seedCharacter(name = 'Snapshot Hero'): number {
  return db.exec(
    `INSERT INTO characters (
       name, strength, dexterity, constitution, intelligence, wisdom,
       charisma, proficiency_bonus_override, rules_edition_preference,
       allow_legacy, notes, created_at, updated_at
     ) VALUES (?, 15, 14, 13, 12, 11, 10, 4, '2024', 1, ?, ?, ?)`,
    [name, 'preserve this note', createdAt, updatedAt],
  ).lastInsertId;
}

function seedFixture(): void {
  db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name, created_at, updated_at)
     VALUES
       ('spell:active', 'Active Spell', 'active spell', ?, ?),
       ('spell:inactive', 'Inactive Spell', 'inactive spell', ?, ?)`,
    [createdAt, updatedAt, createdAt, updatedAt],
  );
  activeSpellId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition, level,
       school, is_active, created_at, updated_at
     ) VALUES ('2024:active', 1, 'Active Spell', '2024', 1, 'Evocation',
       1, ?, ?)`,
    [createdAt, updatedAt],
  ).lastInsertId;
  inactiveSpellId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition, level,
       school, is_active, created_at, updated_at
     ) VALUES ('2024:inactive', 2, 'Inactive Spell', '2024', 2,
       'Illusion', 0, ?, ?)`,
    [createdAt, updatedAt],
  ).lastInsertId;

  const classDefinitionId = db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, created_at, updated_at
     ) VALUES ('class:wizard', 'Wizard', '2024', ?, ?)`,
    [createdAt, updatedAt],
  ).lastInsertId;
  characterId = seedCharacter();
  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, level, is_starting_class,
       notes, created_at, updated_at
     ) VALUES (?, ?, 2, 1, 'class row', ?, ?)`,
    [characterId, classDefinitionId, createdAt, updatedAt],
  );

  const rootSourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, display_name, config,
       acquired_at_character_level, notes, created_at, updated_at
     ) VALUES (?, 'source-root', 'class', 'Wizard 2', '{"school":"abjuration"}',
       1, 'root row', ?, ?)`,
    [characterId, createdAt, updatedAt],
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, parent_source_instance_id, source_type,
       display_name, config, acquired_at_character_level, notes, created_at,
       updated_at
     ) VALUES (?, 'source-child', ?, 'feat', 'Magic Initiate',
       '{"ability":"intelligence"}', 2, 'child row', ?, ?)`,
    [characterId, rootSourceId, createdAt, updatedAt],
  );
  db.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, ordinal, bucket,
       eligibility_kind, current_spell_version_id, label, spell_level_min,
       spell_level_max, allowed_spell_lists, required, sort_order, notes,
       created_at, updated_at, selection_collection, selection_eligibility
     ) VALUES (?, ?, 'wizard-known-1', 'wizard-known', 1, 'known',
       'choice_from_query', ?, 'Known spell', 1, 1, '["Wizard"]', 1, 20,
       'slot row', ?, ?, 'wizard-known', 'valid')`,
    [characterId, rootSourceId, activeSpellId, createdAt, updatedAt],
  );
  db.exec(
    `INSERT INTO wizard_spellbook_entries
       (character_id, spell_version_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [characterId, activeSpellId, createdAt, updatedAt],
  );
  db.exec(
    `INSERT INTO warning_acknowledgements (
       character_id, warning_fingerprint, note, invalidated_at, created_at,
       updated_at
     ) VALUES (?, 'warning:one', 'accepted', NULL, ?, ?)`,
    [characterId, createdAt, updatedAt],
  );
  db.exec(
    `INSERT INTO character_weapons (
       character_id, name, damage_dice, damage_type, finesse, light,
       mastery_property, mastery_selected, notes, created_at, updated_at
     ) VALUES (?, 'Shortsword', '1d6', 'Piercing', 1, 1, 'Vex', 1,
       'weapon row', ?, ?)`,
    [characterId, createdAt, updatedAt],
  );
}

function mutableCapture(): MutableSnapshot {
  return structuredClone(state.capture(characterId)) as MutableSnapshot;
}

function persistedCharacterState(id = characterId): Record<string, unknown> {
  return {
    character: db.one('SELECT * FROM characters WHERE id = ?', [id]),
    ...Object.fromEntries(
      CHARACTER_STATE_TABLES.map((table) => [
        table,
        db.all(
          `SELECT * FROM "${table}" WHERE character_id = ? ORDER BY id`,
          [id],
        ),
      ]),
    ),
  };
}

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
  state = new CharacterState(db);
  seedFixture();
});

afterEach(() => {
  connection.close();
});

describe('capture and deterministic diff', () => {
  it('captures every restorable persisted row in id order', () => {
    const snapshot = state.capture(characterId);

    expect(Object.keys(snapshot)).toEqual([
      'schema_version',
      'character',
      ...CHARACTER_STATE_TABLES,
    ]);
    // a7-v2 is the version that also captures character_weapons. Written out
    // rather than compared against the exported constant: a version identifier
    // is a wire fact that other stored data is matched against, so a test that
    // reads it from the module under test could never notice it changing.
    expect(snapshot.schema_version).toBe('a7-v2');
    expect(Object.keys(snapshot.character)).toEqual(CHARACTER_STATE_COLUMNS);
    expect(snapshot.character).toEqual({
      name: 'Snapshot Hero',
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 11,
      charisma: 10,
      proficiency_bonus_override: 4,
      rules_edition_preference: '2024',
      allow_legacy: 1,
      notes: 'preserve this note',
    });
    expect(snapshot.character_class_levels).toHaveLength(1);
    expect(snapshot.character_source_instances.map((row) => row.id)).toEqual([
      1, 2,
    ]);
    expect(snapshot.spell_selection_slots).toHaveLength(1);
    expect(snapshot.wizard_spellbook_entries).toHaveLength(1);
    expect(snapshot.warning_acknowledgements).toHaveLength(1);
    expect(snapshot.character_weapons).toHaveLength(1);
    expect(snapshot.character_weapons[0]).toMatchObject({
      name: 'Shortsword',
      mastery_property: 'Vex',
      mastery_selected: 1,
    });
    for (const table of CHARACTER_STATE_TABLES) {
      expect(snapshot[table]).toEqual(
        db.all(
          `SELECT * FROM "${table}" WHERE character_id = ? ORDER BY id`,
          [characterId],
        ),
      );
      expect(snapshot[table][0]).toMatchObject({ created_at: createdAt, updated_at: updatedAt });
    }
  });

  it('reports changed persisted row identities in stable table and numeric-id order', () => {
    // These fixtures carry no `schema_version`, so `diff` holds them to the
    // CURRENT table set — every state table must be present. That is the strict
    // reading and the one to keep: a caller handing `diff` an object that has
    // simply forgotten a table should hear about it.
    const emptyTables = {
      spell_selection_slots: [],
      wizard_spellbook_entries: [{ id: 8, spell_version_id: 10 }],
      warning_acknowledgements: [],
      character_weapons: [],
    };
    const before = {
      character: { name: 'Before' },
      character_class_levels: [
        { id: 9, level: 3 },
        { id: 2, level: 1 },
      ],
      character_source_instances: [{ id: 4, state: 'active' }],
      ...emptyTables,
    };
    const after = {
      character: { name: 'After' },
      character_class_levels: [
        { id: 9, level: 4 },
        { id: 2, level: 2 },
      ],
      character_source_instances: [],
      spell_selection_slots: [
        { id: 12, state: 'active' },
        { id: 6, state: 'active' },
      ],
      wizard_spellbook_entries: [{ id: 8, spell_version_id: 10 }],
      warning_acknowledgements: [],
      character_weapons: [],
    };

    expect(state.diff(before, after)).toEqual([
      {
        entity_type: 'character',
        entity_id: null,
        previous_value: { name: 'Before' },
        new_value: { name: 'After' },
      },
      {
        entity_type: 'character_class_levels',
        entity_id: 2,
        previous_value: { id: 2, level: 1 },
        new_value: { id: 2, level: 2 },
      },
      {
        entity_type: 'character_class_levels',
        entity_id: 9,
        previous_value: { id: 9, level: 3 },
        new_value: { id: 9, level: 4 },
      },
      {
        entity_type: 'character_source_instances',
        entity_id: 4,
        previous_value: { id: 4, state: 'active' },
        new_value: null,
      },
      {
        entity_type: 'spell_selection_slots',
        entity_id: 6,
        previous_value: null,
        new_value: { id: 6, state: 'active' },
      },
      {
        entity_type: 'spell_selection_slots',
        entity_id: 12,
        previous_value: null,
        new_value: { id: 12, state: 'active' },
      },
    ]);
  });

  it('does not invent weapon changes when only one side recorded weapons', () => {
    // DEFENSIVE, AND DELIBERATELY SO. Nothing in the current pipeline produces
    // a mixed pair: `CharacterAuditLog.append` is the only caller, and the
    // executor captures both sides in one process, so both are `a7-v2`. The
    // guard is kept because the SHAPE of the failure is silent — an `a7-v1`
    // snapshot has no `character_weapons` key at all, so diffing it against a
    // current one would report every weapon the character owns as newly ADDED
    // and write change_log rows for an edit nobody made.
    //
    // Reached directly here, because `diff` is public and the audit log is not
    // the only thing entitled to call it.
    const beforeV1 = {
      schema_version: 'a7-v1',
      character: { name: 'Hero' },
      character_class_levels: [{ id: 9, level: 3 }],
      character_source_instances: [],
      spell_selection_slots: [],
      wizard_spellbook_entries: [],
      warning_acknowledgements: [],
    };
    const afterV2 = {
      ...beforeV1,
      schema_version: 'a7-v2',
      character_weapons: [{ id: 1, name: 'Longsword' }],
    };

    expect(state.diff(beforeV1, afterV2)).toEqual([]);
    // Symmetric: the other direction must not report a REMOVAL either.
    expect(state.diff(afterV2, beforeV1)).toEqual([]);
    // The shared tables are still diffed — the skip is per table, not a bail.
    expect(
      state.diff(beforeV1, { ...afterV2, character: { name: 'Renamed' } }),
    ).toEqual([
      {
        entity_type: 'character',
        entity_id: null,
        previous_value: { name: 'Hero' },
        new_value: { name: 'Renamed' },
      },
    ]);
  });

  it('rejects capture for a missing character', () => {
    expect(() => state.capture(characterId + 100)).toThrow(
      `Character ${characterId + 100} does not exist.`,
    );
  });

  it('rejects malformed diff table rows', () => {
    expect(() =>
      state.diff(
        {
          character: {},
          character_class_levels: {},
        },
        {
          character: {},
          character_class_levels: [],
        },
      ),
    ).toThrow('Snapshot table character_class_levels must be a list.');
  });
});

describe('snapshot validation before writes', () => {
  const malformedCases: readonly [
    string,
    (snapshot: MutableSnapshot, characterId: number) => void,
    string,
  ][] = [
    [
      'schema version',
      (snapshot) => {
        snapshot.schema_version = 'old';
      },
      'Unsupported character snapshot schema.',
    ],
    [
      'character object',
      (snapshot) => {
        snapshot.character = 'invalid';
      },
      'Character snapshot is missing character data.',
    ],
    [
      'missing character field',
      (snapshot) => {
        delete snapshot.character.notes;
      },
      'Character snapshot is missing notes.',
    ],
    [
      'table is not a list',
      (snapshot) => {
        snapshot.character_class_levels = { bad: [] };
      },
      'Snapshot table character_class_levels must be a list.',
    ],
    [
      'row is not an object',
      (snapshot) => {
        snapshot.character_source_instances[0] = 'bad';
      },
      'Snapshot table character_source_instances contains an invalid row.',
    ],
    [
      'missing row owner',
      (snapshot) => {
        delete snapshot.spell_selection_slots[0].character_id;
      },
      'Snapshot table spell_selection_slots contains a row belonging to another character.',
    ],
    [
      'wrong row owner type',
      (snapshot) => {
        snapshot.wizard_spellbook_entries[0].character_id = String(characterId);
      },
      'Snapshot table wizard_spellbook_entries contains a row belonging to another character.',
    ],
    [
      'wrong row owner',
      (snapshot, id) => {
        snapshot.character_class_levels[0].character_id = id + 1;
      },
      'Snapshot table character_class_levels contains a row belonging to another character.',
    ],
    [
      'zero selected spell',
      (snapshot) => {
        snapshot.spell_selection_slots[0].current_spell_version_id = 0;
      },
      'Snapshot table spell_selection_slots contains an invalid current_spell_version_id.',
    ],
    [
      'string fixed spell',
      (snapshot) => {
        snapshot.spell_selection_slots[0].fixed_spell_version_id = '1';
      },
      'Snapshot table spell_selection_slots contains an invalid fixed_spell_version_id.',
    ],
    [
      'zero spellbook spell',
      (snapshot) => {
        snapshot.wizard_spellbook_entries[0].spell_version_id = 0;
      },
      'Snapshot table wizard_spellbook_entries contains an invalid spell_version_id.',
    ],
    [
      'inactive selected spell',
      (snapshot) => {
        snapshot.spell_selection_slots[0].current_spell_version_id =
          inactiveSpellId;
      },
      'Character snapshot references inactive spell version 2.',
    ],
    [
      'missing spell version',
      (snapshot) => {
        snapshot.wizard_spellbook_entries[0].spell_version_id = 999_999;
      },
      'Character snapshot references inactive spell version 999999.',
    ],
  ];

  it.each(malformedCases)(
    'rejects %s without changing persisted character rows',
    (_label, mutate, message) => {
      const snapshot = mutableCapture();
      const before = persistedCharacterState();
      mutate(snapshot, characterId);

      expect(() => state.restore(characterId, snapshot)).toThrow(message);
      expect(persistedCharacterState()).toEqual(before);
    },
  );
});

describe('atomic restore', () => {
  it('restores all persisted IDs and timestamps while refreshing character metadata time', () => {
    const snapshot = mutableCapture() as CharacterStateSnapshot;
    db.exec(
      `UPDATE characters
       SET name = 'Changed Hero', notes = NULL, updated_at = '2000-01-01 00:00:00'
       WHERE id = ?`,
      [characterId],
    );
    db.exec(
      `UPDATE character_class_levels
       SET level = 9, updated_at = '2000-01-01 00:00:00'
       WHERE character_id = ?`,
      [characterId],
    );
    db.exec(
      `UPDATE character_source_instances
       SET config = '{}', updated_at = '2000-01-01 00:00:00'
       WHERE character_id = ?`,
      [characterId],
    );
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = NULL, selection_eligibility = 'unselected',
           updated_at = '2000-01-01 00:00:00'
       WHERE character_id = ?`,
      [characterId],
    );
    db.exec(
      'DELETE FROM wizard_spellbook_entries WHERE character_id = ?',
      [characterId],
    );
    db.exec(
      `INSERT INTO warning_acknowledgements
       (character_id, warning_fingerprint, note, created_at, updated_at)
       VALUES (?, 'warning:stale', 'remove me', ?, ?)`,
      [characterId, createdAt, updatedAt],
    );

    state.restore(characterId, snapshot);

    const persisted = persistedCharacterState();
    expect(persisted.character).toMatchObject(snapshot.character);
    expect((persisted.character as Record<string, unknown>).updated_at).not.toBe(
      '2000-01-01 00:00:00',
    );
    for (const table of CHARACTER_STATE_TABLES) {
      expect(persisted[table]).toEqual(snapshot[table]);
    }
  });

  it('accepts active spell version id one at slot and spellbook boundaries', () => {
    expect(activeSpellId).toBe(1);
    const snapshot = mutableCapture();
    snapshot.spell_selection_slots[0].current_spell_version_id = activeSpellId;
    snapshot.wizard_spellbook_entries[0].spell_version_id = activeSpellId;

    state.restore(characterId, snapshot);

    expect(
      db.scalar(
        `SELECT current_spell_version_id
         FROM spell_selection_slots WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(1);
    expect(
      db.scalar(
        `SELECT spell_version_id
         FROM wizard_spellbook_entries WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(1);
  });

  it('rolls back metadata, deletes, and inserts when a restored ID conflicts', () => {
    const snapshot = mutableCapture();
    const otherCharacterId = seedCharacter('Other Character');
    const conflictingSourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name, created_at,
         updated_at
       ) VALUES (?, 'other-source', 'feat', 'Other Source', ?, ?)`,
      [otherCharacterId, createdAt, updatedAt],
    ).lastInsertId;
    snapshot.character.name = 'Must Roll Back';
    snapshot.character_source_instances[0].id = conflictingSourceId;
    const before = persistedCharacterState();

    expect(() => state.restore(characterId, snapshot)).toThrow(
      'UNIQUE constraint failed: character_source_instances.id',
    );

    expect(persistedCharacterState()).toEqual(before);
    expect(
      db.scalar('SELECT display_name FROM character_source_instances WHERE id = ?', [
        conflictingSourceId,
      ]),
    ).toBe('Other Source');
  });
});

describe('restoring a snapshot written by an older build', () => {
  /**
   * An `a7-v1` snapshot, built by REMOVING the weapons key from a live capture.
   *
   * Never obtained by asking current code for one — nothing can produce an
   * `a7-v1` snapshot any more — and never written as `character_weapons: []`,
   * because that is a different claim: "there were none" rather than "this was
   * not recorded".
   */
  function legacySnapshot(): MutableSnapshot {
    const snapshot = mutableCapture();
    snapshot.schema_version = 'a7-v1';
    delete snapshot.character_weapons;
    return snapshot;
  }

  it('restores what it recorded and leaves weapons alone', () => {
    const snapshot = legacySnapshot();
    expect(Object.hasOwn(snapshot, 'character_weapons')).toBe(false);

    db.exec('UPDATE characters SET name = ? WHERE id = ?', [
      'Renamed since',
      characterId,
    ]);
    db.exec(
      `INSERT INTO character_weapons (character_id, name)
       VALUES (?, 'Bought since')`,
      [characterId],
    );

    state.restore(characterId, snapshot);

    // Recorded, so rolled back.
    expect(
      db.scalar('SELECT name FROM characters WHERE id = ?', [characterId]),
    ).toBe('Snapshot Hero');
    // NOT recorded, so untouched — both the weapon that existed when the
    // snapshot was taken and the one added afterwards are still here. Treating
    // the absent key as an empty list would have deleted both.
    expect(
      db.all(
        'SELECT name FROM character_weapons WHERE character_id = ? ORDER BY id',
        [characterId],
      ),
    ).toEqual([{ name: 'Shortsword' }, { name: 'Bought since' }]);
  });

  it('still replaces weapons when the snapshot did record them', () => {
    // The contrast that makes the case above a decision rather than an
    // oversight: a current snapshot DOES speak for weapons, so restoring it
    // removes one added afterwards.
    const snapshot = mutableCapture();
    expect(snapshot.schema_version).toBe('a7-v2');
    db.exec(
      `INSERT INTO character_weapons (character_id, name)
       VALUES (?, 'Bought since')`,
      [characterId],
    );

    state.restore(characterId, snapshot);

    expect(
      db.all(
        'SELECT name FROM character_weapons WHERE character_id = ? ORDER BY id',
        [characterId],
      ),
    ).toEqual([{ name: 'Shortsword' }]);
  });

  it('refuses a version it cannot read, before touching a row', () => {
    const snapshot = mutableCapture();
    snapshot.schema_version = 'a6-v0';
    const before = persistedCharacterState();
    expect(() => state.restore(characterId, snapshot)).toThrow(
      'Unsupported character snapshot schema.',
    );
    expect(persistedCharacterState()).toEqual(before);
  });
});
