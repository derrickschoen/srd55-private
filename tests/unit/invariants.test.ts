import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemaSources } from '../helpers/schema-sources';
import { DatabaseContext } from '../../src/db/database';
import {
  encodeBoolean,
  encodeJson,
  sqlBoolean,
  sqlInteger,
  sqlJson,
  sqlString,
} from '../../src/db/codecs';

const triggerMessage =
  'a spell slot cannot hold both a fixed grant and a user selection';
const checkName = 'spell_slots_exclusive_assignment_check';
const triggerError = `SQLITE_CONSTRAINT_TRIGGER: sqlite3 result code 1811: ${triggerMessage}`;
const foreignKeyError =
  'SQLITE_CONSTRAINT_FOREIGNKEY: sqlite3 result code 787: FOREIGN KEY constraint failed';
const checkError = `SQLITE_CONSTRAINT_CHECK: sqlite3 result code 275: CHECK constraint failed: ${checkName}`;

let sqlite3: Sqlite3Static;
const openDatabases: Database[] = [];

function openDb(schemaSql: string, applySchema = true): Database {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  openDatabases.push(db);
  if (applySchema) {
    db.exec(schemaSql);
  }
  return db;
}

function seedSpell(db: Database): number {
  db.exec(`
    INSERT INTO spell_identities
      (content_key, canonical_name, normalized_name)
    VALUES ('spell:test', 'Test Spell', 'test spell');
    INSERT INTO spell_versions
      (content_key, spell_identity_id, display_name, rules_edition, level, school)
    VALUES ('2024:spell:test', 1, 'Test Spell', '2024', 1, 'Evocation');
  `);
  return Number(db.selectValue('SELECT id FROM spell_versions'));
}

function seedCharacter(db: Database, name: string): number {
  db.exec({
    sql: 'INSERT INTO characters (name) VALUES (?)',
    bind: [name],
  });
  return Number(db.selectValue('SELECT last_insert_rowid()'));
}

function seedSource(db: Database, characterId: number, suffix: string): number {
  db.exec({
    sql: `INSERT INTO character_source_instances
      (character_id, instance_uuid, source_type, display_name)
      VALUES (?, ?, 'feat', 'Magic Initiate')`,
    bind: [characterId, `source-${suffix}`],
  });
  return Number(db.selectValue('SELECT last_insert_rowid()'));
}

function insertSlot(
  db: Database,
  characterId: number,
  sourceId: number,
  key: string,
  fixedSpellId: number | null = null,
  currentSpellId: number | null = null,
): void {
  db.exec({
    sql: `INSERT INTO spell_selection_slots (
      character_id, source_instance_id, slot_key, rule_key, bucket,
      eligibility_kind, fixed_spell_version_id, current_spell_version_id
    ) VALUES (?, ?, ?, 'spike-rule', 'automatic', 'fixed_spell', ?, ?)`,
    bind: [
      characterId,
      sourceId,
      key,
      fixedSpellId,
      currentSpellId,
    ],
  });
}

function caughtErrorMessage(action: () => void): string {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    throw error;
  }
  throw new Error('Expected SQLite operation to throw');
}

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

afterAll(() => {
  for (const db of openDatabases) {
    db.close();
  }
});

// The browser-product invariants (both named triggers, the named CHECK, the
// composite foreign keys, PRAGMA state) are NOT Laravel parity — they are
// product guarantees. Each schema artifact must satisfy all of them.
for (const [sourceLabel, schemaSql] of schemaSources) {
describe(`connection prerequisites (${sourceLabel})`, () => {
  it('observes foreign keys OFF by default and enables them through schema bootstrap', () => {
    const db = openDb(schemaSql, false);
    expect(db.selectValue('PRAGMA foreign_keys')).toBe(0);

    db.exec(schemaSql);

    expect(db.selectValue('PRAGMA foreign_keys')).toBe(1);
  });
});

describe(`typed synchronous persistence primitives (${sourceLabel})`, () => {
  it('decodes persisted scalar, boolean, and JSON values without leaking SQLite rows', () => {
    const context = new DatabaseContext(openDb(schemaSql));
    const id = context.exec(
      `INSERT INTO characters (name, allow_legacy, notes)
       VALUES (?, ?, ?)`,
      ['Codec Character', encodeBoolean(true), encodeJson({ source: 'test' })],
    ).lastInsertId;

    const stored = context.one(
      `SELECT id, name, allow_legacy, notes
       FROM characters WHERE id = ?`,
      [id],
      (row) => ({
        id: sqlInteger(row, 'id'),
        name: sqlString(row, 'name'),
        allowLegacy: sqlBoolean(row, 'allow_legacy'),
        notes: sqlJson(row, 'notes'),
      }),
    );

    expect(stored).toEqual({
      id,
      name: 'Codec Character',
      allowLegacy: true,
      notes: { source: 'test' },
    });
    expect(context.scalar('SELECT allow_legacy FROM characters WHERE id = ?', [id]))
      .toBe(1);
    expect(context.scalar('SELECT notes FROM characters WHERE id = ?', [id]))
      .toBe('{"source":"test"}');
  });

  it('uses savepoints for nested work and persists only the successful writes', () => {
    const context = new DatabaseContext(openDb(schemaSql));

    context.transaction((outer) => {
      outer.exec("INSERT INTO characters (name) VALUES ('Outer before')");
      expect(() =>
        outer.transaction((inner) => {
          inner.exec("INSERT INTO characters (name) VALUES ('Nested rollback')");
          throw new Error('rollback nested');
        }),
      ).toThrow('rollback nested');
      outer.exec("INSERT INTO characters (name) VALUES ('Outer after')");
    });

    expect(
      context.allRaw('SELECT name FROM characters ORDER BY id'),
    ).toEqual([
      { name: 'Outer before' },
      { name: 'Outer after' },
    ]);
    expect(context.transactionDepth).toBe(0);
  });

  it('rolls back the complete outer transaction when its callback fails', () => {
    const context = new DatabaseContext(openDb(schemaSql));
    expect(() =>
      context.transaction((db) => {
        db.exec("INSERT INTO characters (name) VALUES ('Never persisted')");
        throw new Error('rollback outer');
      }),
    ).toThrow('rollback outer');

    expect(context.scalar('SELECT count(*) FROM characters')).toBe(0);
  });
});

describe(`ported persistence invariants (${sourceLabel})`, () => {
  it('rejects fixed-grant plus user-selection through both exact ABORT triggers', () => {
    const db = openDb(schemaSql);
    const spellId = seedSpell(db);
    const characterId = seedCharacter(db, 'Trigger Test');
    const sourceId = seedSource(db, characterId, 'trigger');

    expect(
      caughtErrorMessage(() =>
        insertSlot(
          db,
          characterId,
          sourceId,
          'trigger-insert',
          spellId,
          spellId,
        ),
      ),
    ).toBe(triggerError);

    insertSlot(
      db,
      characterId,
      sourceId,
      'trigger-update',
      spellId,
      null,
    );
    expect(
      caughtErrorMessage(() =>
        db.exec({
          sql: `UPDATE spell_selection_slots
                SET current_spell_version_id = ?
                WHERE slot_key = 'trigger-update'`,
          bind: [spellId],
        }),
      ),
    ).toBe(triggerError);

    expect(
      db.selectValues(
        `SELECT name FROM sqlite_schema
         WHERE type = 'trigger'
         ORDER BY name`,
      ),
    ).toEqual([
      'catalog_register_armor_identity_before_insert',
      'catalog_register_background_definition_identity_before_insert',
      'catalog_register_background_template_identity_before_insert',
      'catalog_register_class_identity_before_insert',
      'catalog_register_feat_identity_before_insert',
      'catalog_register_item_identity_before_insert',
      'catalog_register_species_definition_identity_before_insert',
      'catalog_register_species_template_identity_before_insert',
      'catalog_register_spell_identity_before_insert',
      'catalog_register_subclass_identity_before_insert',
      'catalog_register_weapon_identity_before_insert',
      'character_items_clear_attunement_slots_before_delete',
      'character_sources_clear_level_feat_choices_before_delete',
      'spell_slots_exclusive_assignment_insert',
      'spell_slots_exclusive_assignment_update',
    ]);
  });

  it('rejects both cross-character source and wrong-class subclass composite FKs', () => {
    const db = openDb(schemaSql);
    const aliceId = seedCharacter(db, 'Alice');
    const bobId = seedCharacter(db, 'Bob');
    const bobSourceId = seedSource(db, bobId, 'bob');

    expect(
      caughtErrorMessage(() =>
        insertSlot(db, aliceId, bobSourceId, 'foreign-source'),
      ),
    ).toBe(foreignKeyError);

    db.exec(`
      INSERT INTO class_definitions
        (content_key, name, rules_edition, progression_type)
      VALUES
        ('class:wizard', 'Wizard', '2024', 'full'),
        ('class:fighter', 'Fighter', '2024', 'none');
      INSERT INTO subclass_definitions
        (content_key, class_definition_id, name, rules_edition)
      VALUES
        ('subclass:eldritch-knight', 2, 'Eldritch Knight', '2024');
    `);

    expect(
      caughtErrorMessage(() =>
        db.exec({
          sql: `INSERT INTO character_class_levels
            (character_id, class_definition_id, subclass_definition_id, level)
            VALUES (?, 1, 1, 3)`,
          bind: [aliceId],
        }),
      ),
    ).toBe(foreignKeyError);
  });

  it('rejects the exclusive-assignment CHECK when triggers are absent', () => {
    const db = openDb(schemaSql);
    const spellId = seedSpell(db);
    const characterId = seedCharacter(db, 'Check Test');
    const sourceId = seedSource(db, characterId, 'check');

    // Isolate the CHECK: otherwise the BEFORE trigger intentionally wins first.
    db.exec(`
      DROP TRIGGER spell_slots_exclusive_assignment_insert;
      DROP TRIGGER spell_slots_exclusive_assignment_update;
    `);

    expect(
      caughtErrorMessage(() =>
        insertSlot(
          db,
          characterId,
          sourceId,
          'check-insert',
          spellId,
          spellId,
        ),
      ),
    ).toBe(checkError);
  });
});
}
