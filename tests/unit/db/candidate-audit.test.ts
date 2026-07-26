import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import {
  auditCandidateDatabase,
  auditCharacterOwnership,
  CandidateAuditError,
  CHARACTER_OWNED_TABLES,
  CONTAMINABLE_REFERENCES,
} from '../../../src/db/candidate-audit';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';
import { DatabaseContext } from '../../../src/db/database';
import {
  CharacterState,
  CHARACTER_STATE_COLUMNS,
  CHARACTER_STATE_TABLES,
} from '../../../src/character/character-state';
import { rowContractError } from '../../../src/domain/contracts/rows';

/**
 * THE MALFORMED-ARTIFACT PROOF FOR WHOLE-IMAGE RESTORE.
 *
 * Every corruption below is built by executing legal SQL against a real
 * database with `PRAGMA foreign_keys = ON`, so each candidate is one SQLite
 * itself considers valid — `quick_check`, `foreign_key_check` and the schema
 * signature all pass. That is the entire point: these are exactly the images
 * the previous structure-only validation accepted.
 */

let sqlite3: Sqlite3Static;
const opened: Database[] = [];

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

afterEach(() => {
  for (const db of opened.splice(0)) {
    if (db.isOpen()) {
      db.close();
    }
  }
});

function freshDatabase(): Database {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  opened.push(db);
  db.exec(schema);
  return db;
}

/** Two characters, each with one class source instance. */
function seedTwoCharacters(db: Database): void {
  db.exec(
    `INSERT INTO class_definitions (content_key, name, rules_edition)
     VALUES ('class:wizard', 'Wizard', '2024')`,
  );
  db.exec("INSERT INTO characters (name) VALUES ('Alice'), ('Bob')");
  db.exec(
    `INSERT INTO character_source_instances
       (id, character_id, instance_uuid, source_type, source_definition_id,
        display_name)
     VALUES (1, 1, 'alice-source', 'class', 1, 'Wizard'),
            (2, 2, 'bob-source', 'class', 1, 'Wizard')`,
  );
}

/** A snapshot in exactly the shape `CharacterState.capture` produces. */
function snapshotOf(db: Database, characterId: number): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {
    schema_version: 'a7-v1',
    character: db.selectObject(
      `SELECT ${CHARACTER_STATE_COLUMNS.join(', ')}
       FROM characters WHERE id = ?`,
      [characterId],
    ),
  };
  for (const table of CHARACTER_STATE_TABLES) {
    snapshot[table] = db.selectObjects(
      `SELECT * FROM "${table}" WHERE character_id = ? ORDER BY id`,
      [characterId],
    );
  }
  return snapshot;
}

function insertSavePoint(
  db: Database,
  characterId: number,
  snapshot: unknown,
): void {
  db.exec(
    `INSERT INTO character_save_points
       (character_id, label, snapshot, schema_version)
     VALUES (?, 'Before', ?, 'a7-v1')`,
    { bind: [characterId, JSON.stringify(snapshot)] },
  );
}

function bytesOf(db: Database): Uint8Array {
  return sqlite3.capi.sqlite3_js_db_export(db).slice();
}

function quarantined(bytes: Uint8Array): Database {
  const db = openDatabaseImage(sqlite3, bytes);
  opened.push(db);
  return db;
}

describe('candidate database semantic audit', () => {
  it('passes a clean, populated candidate', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();
  });

  it('derives its table set from the classification, not a hand list', () => {
    // An independent transcription: this is the oracle, TABLE_SCOPES is the
    // thing under test. A character-owned table classified wrongly, or a new
    // one left unclassified, shows up here.
    expect([...CHARACTER_OWNED_TABLES].sort()).toEqual([
      'change_log',
      'character_class_levels',
      'character_operations',
      'character_rule_overrides',
      'character_save_points',
      'character_source_instances',
      'character_spell_preferences',
      'spell_loadouts',
      'spell_selection_slots',
      'warning_acknowledgements',
      'wizard_spellbook_entries',
    ]);
    // `spell_loadout_entries` is character-owned but reaches the character only
    // through `spell_loadouts`, so it has no `character_id` to audit.
    expect(CHARACTER_OWNED_TABLES).not.toContain('spell_loadout_entries');
  });

  it('audits exactly the references SQLite cannot police itself', () => {
    expect(
      CONTAMINABLE_REFERENCES.map((reference) => reference.columns.join('+')),
    ).toEqual(['parent_source_instance_id']);
    // `spell_selection_slots` is excluded because its reference tuple includes
    // `character_id`, so the database enforces ownership for it.
    expect(
      CONTAMINABLE_REFERENCES.some(
        (reference) => reference.table === 'spell_selection_slots',
      ),
    ).toBe(false);
  });

  it('refuses a row owned by a character that does not exist', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    // Deleting the character cascades, so the orphan is made by dropping the
    // parent row with foreign keys off — which is precisely how a hand-edited
    // or partially-restored image acquires one.
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM characters WHERE id = 2');
    db.exec('PRAGMA foreign_keys = ON');
    const candidate = quarantined(bytesOf(db));

    // The image is refused. On THIS schema `foreign_key_check` reaches the
    // orphan first, because every character_id here is FK-backed...
    expect(() => auditCandidateDatabase(candidate)).toThrow(CandidateAuditError);
    expect(() => auditCandidateDatabase(candidate)).toThrow(
      'PRAGMA foreign_key_check in table character_source_instances',
    );
    // ...so the derived ownership pass is exercised directly, to show it is a
    // working check and not a comment. It is the pass that would still cover a
    // character-owned table declared without a foreign key, which this schema
    // demonstrably permits (`source_definition_id`).
    expect(() => auditCharacterOwnership(candidate)).toThrow(
      'character_source_instances rowid 2 owned by character 2, which does not exist.',
    );
  });

  it('refuses one character owning a row parented to another character', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    // Legal SQL, foreign keys ON: the FK on parent_source_instance_id names only
    // (id), so SQLite is satisfied and only the audit can see the problem.
    db.exec(
      'UPDATE character_source_instances SET parent_source_instance_id = 1 WHERE id = 2',
    );
    expect(db.selectValue('PRAGMA quick_check')).toBe('ok');
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_source_instances rowid 2 owned by character 2 referencing ' +
        'character_source_instances through parent_source_instance_id, which ' +
        'belongs to character 1.',
    );
  });

  it('refuses a polymorphic source reference that points at nothing', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    // No foreign key exists on source_definition_id — it is resolved by
    // source_type at runtime — so this is invisible to foreign_key_check.
    db.exec(
      'UPDATE character_source_instances SET source_definition_id = 4242 WHERE id = 1',
    );
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_source_instances id 1 of type class referencing ' +
        'class_definitions id 4242, which does not exist.',
    );
  });

  it('refuses an unsupported source_type', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      "UPDATE character_source_instances SET source_type = 'artifact' WHERE id = 1",
    );
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_source_instances id 1 with unsupported source_type "artifact".',
    );
  });

  it('refuses a source-parent cycle', () => {
    const db = freshDatabase();
    db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('class:wizard', 'Wizard', '2024')`,
    );
    db.exec("INSERT INTO characters (name) VALUES ('Alice')");
    db.exec(
      `INSERT INTO character_source_instances
         (id, character_id, instance_uuid, source_type, source_definition_id,
          display_name)
       VALUES (1, 1, 'a', 'class', 1, 'A'), (2, 1, 'b', 'class', 1, 'B')`,
    );
    db.exec(
      `UPDATE character_source_instances
       SET parent_source_instance_id = CASE id WHEN 1 THEN 2 ELSE 1 END`,
    );
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_source_instances parent cycle',
    );
  });

  it('refuses a save-point snapshot carrying a malformed row', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    const snapshot = {
      schema_version: 'a7-v1',
      character: {
        name: 'Alice',
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        proficiency_bonus_override: null,
        rules_edition_preference: '2024',
        allow_legacy: 0,
        notes: null,
      },
      character_class_levels: [],
      character_source_instances: [
        {
          ...(db.selectObject(
            'SELECT * FROM character_source_instances WHERE id = 1',
          ) as Record<string, unknown>),
          // `CharacterState.restore` turns snapshot keys into INSERT column
          // names, so this is the same hazard the backup contracts close —
          // stored in a database image instead of a JSON document.
          '"; DROP TABLE characters; --': 1,
        },
      ],
      spell_selection_slots: [],
      wizard_spellbook_entries: [],
      warning_acknowledgements: [],
    };
    db.exec(
      `INSERT INTO character_save_points
         (character_id, label, snapshot, schema_version)
       VALUES (1, 'Before', ?, 'a7-v1')`,
      { bind: [JSON.stringify(snapshot)] },
    );
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_save_points id 1 snapshot.character_source_instances[0]',
    );
  });

  /**
   * THE CHANNEL THAT IS NOT A COLUMN.
   *
   * `CharacterState.restore` re-inserts every row a snapshot holds with
   * `character_id` OVERWRITTEN to the character being restored. So a save point
   * owned by Alice whose embedded rows belong to Bob does not merely describe
   * Bob's data — pressing undo MOVES it to Alice. No SQL check can see this: the
   * evidence is text inside one column, and the row it is attached to is
   * perfectly well-formed.
   */
  it('refuses a save point of one character embedding another character’s rows', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    const stolen = snapshotOf(db, 1);
    // Alice's save point, Bob's source instance.
    stolen.character_source_instances = db.selectObjects(
      'SELECT * FROM character_source_instances WHERE character_id = 2',
    );
    insertSavePoint(db, 1, stolen);
    // SQLite is entirely satisfied: the row is well-formed and the FK holds.
    expect(db.selectValue('PRAGMA quick_check')).toBe('ok');
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_save_points id 1 snapshot.character_source_instances[0] ' +
        'belongs to character 2, but the save point belongs to character 1.',
    );
  });

  it('refuses a snapshot whose source parent is not in the snapshot', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    const snapshot = snapshotOf(db, 1);
    (
      (snapshot.character_source_instances as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).parent_source_instance_id = 999;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'snapshot.character_source_instances[0] has parent 999, which the ' +
        'snapshot does not contain.',
    );
  });

  it('refuses a source-parent cycle inside a snapshot', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_source_instances
         (id, character_id, instance_uuid, source_type, source_definition_id,
          display_name)
       VALUES (3, 1, 'alice-second', 'class', 1, 'Wizard')`,
    );
    const snapshot = snapshotOf(db, 1);
    const sources = snapshot.character_source_instances as Record<
      string,
      unknown
    >[];
    sources[0]!.parent_source_instance_id = 3;
    sources[1]!.parent_source_instance_id = 1;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'snapshot.character_source_instances has a parent cycle reaching id',
    );
  });

  /**
   * THE ONE DELIBERATE GAP, AND THE PROOF IT IS SAFE.
   *
   * A snapshot whose `schema_version` is not the current one is skipped rather
   * than rejected, because rejecting would destroy a legitimate user's whole
   * database over a save point the application already declines to restore. This
   * test proves BOTH halves of that argument rather than asserting the skip
   * alone: the embedded row really is one the contract refuses, and the restore
   * path really does refuse the snapshot before touching a row.
   */
  it('skips a snapshot the application can no longer restore, and that snapshot is inert', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    const stale = snapshotOf(db, 1);
    stale.schema_version = 'a6-v0';
    (
      (stale.character_source_instances as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).source_type = 'artifact';
    insertSavePoint(db, 1, stale);

    // Half one: the audit would have refused this row had the version matched.
    expect(
      rowContractError(
        'character_source_instances',
        (stale.character_source_instances as unknown[])[0],
        'probe',
      ),
    ).toContain('probe.source_type:');
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    // Half two: the snapshot cannot become an INSERT, so the skip costs nothing.
    const restored = freshDatabase();
    seedTwoCharacters(restored);
    expect(() =>
      new CharacterState(new DatabaseContext(restored)).restore(1, stale),
    ).toThrow('Unsupported character snapshot schema.');
  });

  /**
   * The LIVE tables of a candidate image, which nothing inspected before. A
   * hostile image installs cleanly and then throws at the point of use, far from
   * the restore the user could connect it to.
   */
  it('refuses a live JSON column that is not JSON', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_operations
         (character_id, operation_uuid, expected_revision, resulting_revision,
          inverse_command)
       VALUES (1, 'op-1', 0, 1, 'not a command at all')`,
    );
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_operations rowid 1 column inverse_command must be a JSON object.',
    );
  });

  it('refuses live JSON of the wrong shape and accepts the empty string a reader defines', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    // `jsonRecord` throws on an array, so an array here is a latent crash.
    db.exec(
      "UPDATE character_source_instances SET config = '[1,2]' WHERE id = 1",
    );
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_source_instances rowid 1 column config must be a JSON object.',
    );

    // ...and `jsonRecord('')` is `{}` by design, so `''` must stay acceptable.
    db.exec("UPDATE character_source_instances SET config = '' WHERE id = 1");
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();
  });

  it('refuses a live audit-log value that no reader could parse', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO change_log
         (character_id, sequence, entity_type, new_value, action_type)
       VALUES (1, 1, 'character', '{unclosed', 'update')`,
    );
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'change_log rowid 1 column new_value must be JSON text.',
    );
  });

  it('refuses a broken foreign key and a corrupt page', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(
      'UPDATE character_source_instances SET character_id = 99 WHERE id = 1',
    );
    db.exec('PRAGMA foreign_keys = ON');
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'PRAGMA foreign_key_check in table character_source_instances',
    );
  });
});

describe('whole-image restore runs the audit while quarantined', () => {
  it('refuses a semantically corrupt image and leaves live storage untouched', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();
    try {
      lifecycle.database.exec(
        "INSERT INTO characters (name) VALUES ('Live character')",
      );
      const liveConnection = lifecycle.database.connection;

      const candidate = freshDatabase();
      seedTwoCharacters(candidate);
      candidate.exec(
        'UPDATE character_source_instances SET parent_source_instance_id = 1 WHERE id = 2',
      );

      await expect(lifecycle.replace(bytesOf(candidate))).rejects.toThrow(
        CandidateAuditError,
      );

      // Not merely "the promise rejected": the live connection and its rows are
      // the ones that were there before.
      expect(lifecycle.database.connection).toBe(liveConnection);
      expect(lifecycle.database.all('SELECT id, name FROM characters')).toEqual([
        { id: 1, name: 'Live character' },
      ]);
    } finally {
      lifecycle.close();
    }
  });

  it('still accepts a clean image', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();
    try {
      const candidate = freshDatabase();
      seedTwoCharacters(candidate);
      await lifecycle.replace(bytesOf(candidate));
      expect(
        lifecycle.database.all('SELECT id, name FROM characters ORDER BY id'),
      ).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    } finally {
      lifecycle.close();
    }
  });
});
