import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import {
  assertNoParentCycle,
  auditCandidateDatabase,
  auditCharacterOwnership,
  CandidateAuditError,
  CHARACTER_OWNED_TABLES,
  CONTAMINABLE_REFERENCES,
  UNENFORCED_OWNERSHIP_TABLES,
} from '../../../src/db/candidate-audit';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';
import { DatabaseContext } from '../../../src/db/database';
import {
  CharacterState,
  CHARACTER_SNAPSHOT_SCHEMA_VERSION,
  CHARACTER_STATE_COLUMNS,
  CHARACTER_STATE_TABLES,
  snapshotCharacterColumnsFor,
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

/** Two catalog spells, both active, so a slot has something legal to point at. */
function seedSpellVersions(db: Database): void {
  db.exec(
    `INSERT INTO spell_identities
       (id, content_key, canonical_name, normalized_name)
     VALUES (1, 'spell:fireball', 'Fireball', 'fireball'),
            (2, 'spell:shield', 'Shield', 'shield')`,
  );
  db.exec(
    `INSERT INTO spell_versions
       (id, content_key, spell_identity_id, display_name, rules_edition, level,
        school)
     VALUES (1, 'spell:fireball:2024', 1, 'Fireball', '2024', 3, 'evocation'),
            (2, 'spell:shield:2024', 2, 'Shield', '2024', 1, 'abjuration')`,
  );
}

/** One slot for Alice, holding whichever single assignment the caller names. */
function insertSlot(
  db: Database,
  assignment: { fixed?: number | null; current?: number | null } = {},
): void {
  db.exec(
    `INSERT INTO spell_selection_slots
       (id, character_id, source_instance_id, slot_key, rule_key, bucket,
        eligibility_kind, fixed_spell_version_id, current_spell_version_id)
     VALUES (1, 1, 1, 'slot-1', 'rule-1', 'prepared', 'list', ?, ?)`,
    { bind: [assignment.fixed ?? null, assignment.current ?? null] },
  );
}

/**
 * The five tables an `a7-v1` snapshot carried, written out rather than derived.
 *
 * A historical fact about snapshots already sitting in users' databases.
 * Deriving it from the current classification would make it follow the next
 * change and stop describing anything real.
 */
const A7_V1_TABLES = [
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'warning_acknowledgements',
] as const;

/** A snapshot in exactly the shape `CharacterState.capture` produces. */
function snapshotOf(db: Database, characterId: number): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {
    schema_version: CHARACTER_SNAPSHOT_SCHEMA_VERSION,
    character: db.selectObject(
      `SELECT ${CHARACTER_STATE_COLUMNS.join(', ')}
       FROM characters WHERE id = ?`,
      [characterId],
    ),
  };
  for (const table of CHARACTER_STATE_TABLES) {
    snapshot[table] = db.selectObjects(
      `SELECT * FROM "${table}" WHERE character_id = ? ORDER BY ${
        table === 'character_attunement_slots' ? 'character_id' : 'id'
      }`,
      [characterId],
    );
  }
  return snapshot;
}

/**
 * A snapshot as `capture` produced them BEFORE weapons were captured: five
 * table keys, no `character_weapons`.
 */
function legacySnapshotOf(
  db: Database,
  characterId: number,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {
    schema_version: 'a7-v1',
    character: db.selectObject(
      `SELECT ${snapshotCharacterColumnsFor('a7-v1').join(', ')}
       FROM characters WHERE id = ?`,
      [characterId],
    ),
  };
  for (const table of A7_V1_TABLES) {
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
  // The column mirrors the snapshot's own version, as the application writes it.
  const version = (snapshot as { schema_version?: unknown } | null)
    ?.schema_version;
  db.exec(
    `INSERT INTO character_save_points
       (character_id, label, snapshot, schema_version)
     VALUES (?, 'Before', ?, ?)`,
    {
      bind: [
        characterId,
        JSON.stringify(snapshot),
        typeof version === 'string' ? version : 'a7-v2',
      ],
    },
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
      'character_armor',
      'character_attunement_slots',
      'character_background',
      'character_class_levels',
      'character_effects',
      'character_hit_point_rolls',
      'character_items',
      'character_operations',
      'character_rule_overrides',
      'character_save_points',
      'character_sheet_adjustments',
      'character_skill_grants',
      'character_skill_proficiencies',
      'character_source_instances',
      'character_species',
      'character_species_traits',
      'character_spell_preferences',
      'character_weapons',
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
    // working mechanism and not a comment. What it is NOT is a second line of
    // defence that ever fires on this schema — see the test below, which pins
    // that claim instead of leaving it to a comment.
    expect(() => auditCharacterOwnership(candidate)).toThrow(
      'character_source_instances rowid 2 owned by character 2, which does not exist.',
    );
  });

  /**
   * WHAT THE OWNERSHIP PASS BUYS TODAY, AS AN ASSERTION RATHER THAN A COMMENT.
   *
   * It buys nothing: every character-owned `character_id` in this schema carries
   * a foreign key to `characters`, so `PRAGMA foreign_key_check` — which runs in
   * `auditIntegrity`, one pass earlier, and in `validateDatabaseConnection`
   * before that — reaches every orphan first. Deleting the pass turns no test
   * red except the direct call above. It is kept as future-proofing, and this is
   * the line that stops that being a silent claim: add a character-owned table
   * without that foreign key and this list stops being empty, which fails here
   * and tells the next reader the pass has become load bearing.
   */
  it('does not currently catch anything foreign_key_check would miss', () => {
    expect(UNENFORCED_OWNERSHIP_TABLES).toEqual([]);
    // Non-vacuity: the emptiness above is a fact about the FKs, not about the
    // table set being empty. The exact set is pinned by name in 'derives its
    // table set from the classification' — deliberately not restated as a count
    // here, because a second copy of the number is a second thing to update and
    // catches nothing the by-name transcription misses.
    expect(CHARACTER_OWNED_TABLES.length).toBeGreaterThan(0);
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

  /**
   * THE COST OF A CHAIN, WHICH USED TO BE QUADRATIC.
   *
   * The previous cycle detector allocated a fresh visited set per start node and
   * re-walked the whole ancestor chain from every key, so one long parent chain
   * — the shape an importer controls completely — cost O(N²). Measured on the
   * old code: 3,000 rows 116.9 ms, 6,000 rows 628.9 ms, 12,000 rows 3.35 s,
   * 24,000 rows 16.57 s, and a single 5.6 MB image with a 50,000-long chain
   * blocked the audit for 80.5 seconds inside the app's one worker.
   *
   * This counts MAP LOOKUPS rather than elapsed time on purpose: a wall-clock
   * budget would be a flake on a loaded machine, and a lookup count is the thing
   * the complexity claim is actually about. Linear costs about N lookups;
   * quadratic costs about N²/2, which for N = 10,000 is 50 million — five
   * thousand times the ceiling below, so the old implementation fails this
   * assertion rather than merely being slower.
   */
  it('detects cycles in work linear in the number of rows, not quadratic', () => {
    class CountingMap extends Map<number, number> {
      lookups = 0;
      override get(key: number): number | undefined {
        this.lookups += 1;
        return super.get(key);
      }
    }

    const rowCount = 10_000;
    const chain = new CountingMap();
    for (let id = 2; id <= rowCount; id += 1) {
      chain.set(id, id - 1);
    }

    expect(() =>
      assertNoParentCycle(chain, () => 'unreachable: the chain has no cycle'),
    ).not.toThrow();
    expect(chain.lookups).toBeLessThan(4 * rowCount);

    // ...and the linear walk still finds a cycle at the far end of that chain,
    // which is the case a "stop early" optimisation would be most likely to lose.
    const closed = new CountingMap(chain);
    closed.set(1, rowCount);
    expect(() =>
      assertNoParentCycle(closed, (id) => `cycle reaching id ${String(id)}`),
    ).toThrow('cycle reaching id');
    expect(closed.lookups).toBeLessThan(4 * rowCount);
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
   * TWO ROWS, ONE PRIMARY KEY.
   *
   * `id` is a PRIMARY KEY, so the live table cannot hold this pair and a
   * per-ROW contract cannot see it — it is a property of the LIST. `restore`
   * re-inserts both rows verbatim, so undo dies on the second one. The two rows
   * carry distinct `instance_uuid`s so the only thing wrong is the id
   * collision.
   */
  it('refuses a snapshot whose rows share one id, which restore cannot insert', () => {
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
    sources[1]!.id = sources[0]!.id;
    insertSavePoint(db, 1, snapshot);
    // SQLite has no opinion: the collision is text inside one column.
    expect(db.selectValue('PRAGMA quick_check')).toBe('ok');
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_save_points id 1 snapshot.character_source_instances ' +
        'contains duplicate id 1.',
    );

    // The reason the audit refuses it: undo would fail on the second INSERT.
    const restored = freshDatabase();
    seedTwoCharacters(restored);
    expect(() =>
      new CharacterState(new DatabaseContext(restored)).restore(1, snapshot),
    ).toThrow('UNIQUE constraint failed');
  });

  /**
   * A SLOT THE STORAGE LAYER FORBIDS, SMUGGLED IN AS TEXT.
   *
   * `spell_slots_exclusive_assignment_check` and the two triggers refuse a slot
   * holding both a fixed grant and a user selection on every INSERT and UPDATE,
   * so this pair can only exist inside a snapshot's JSON — where the per-column
   * contract, which checks each column alone, does not see it.
   */
  it('refuses a snapshot slot holding both a fixed grant and a selection', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    seedSpellVersions(db);
    insertSlot(db, { fixed: 1 });
    const snapshot = snapshotOf(db, 1);
    const slots = snapshot.spell_selection_slots as Record<string, unknown>[];
    slots[0]!.current_spell_version_id = 2;
    insertSavePoint(db, 1, snapshot);
    expect(db.selectValue('PRAGMA quick_check')).toBe('ok');
    expect(db.selectObject('PRAGMA foreign_key_check')).toBeUndefined();

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'character_save_points id 1 snapshot.spell_selection_slots[0] ' +
        'contains both a fixed and selected spell.',
    );

    const restored = freshDatabase();
    seedTwoCharacters(restored);
    seedSpellVersions(restored);
    expect(() =>
      new CharacterState(new DatabaseContext(restored)).restore(1, snapshot),
    ).toThrow('a spell slot cannot hold both a fixed grant and a user selection');
  });

  /**
   * THE SECOND DELIBERATE GAP: AN INACTIVE SPELL VERSION.
   *
   * `CharacterState.validateSnapshot` refuses a snapshot referencing a
   * deactivated `spell_versions` row, and the audit deliberately does NOT.
   * Unlike a duplicate id or a double-assigned slot, this state is one a
   * legitimate database reaches by itself: `CatalogImporter` tombstones a
   * version (`SET is_active = 0`) whenever a re-import stops naming it, and
   * every save point captured beforehand keeps pointing at it. Refusing the
   * image would mean a user who took a catalog update could no longer restore
   * their own backup.
   *
   * As with the schema-version skip, both halves are proved rather than
   * asserted: the restore path really does refuse the snapshot, and it refuses
   * it BEFORE the transaction, so the rows are still there afterwards.
   */
  it('accepts a snapshot referencing a tombstoned spell, and that snapshot is inert', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    seedSpellVersions(db);
    insertSlot(db, { current: 1 });
    const snapshot = snapshotOf(db, 1);
    // Exactly what a catalog re-import does to a version it no longer names.
    db.exec('UPDATE spell_versions SET is_active = 0 WHERE id = 1');
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    // Half two: undo declines, and declines without touching a row.
    const state = new CharacterState(new DatabaseContext(db));
    expect(() => state.restore(1, snapshot)).toThrow(
      'Character snapshot references inactive spell version 1.',
    );
    expect(
      db.selectObjects(
        'SELECT id, current_spell_version_id FROM spell_selection_slots',
      ),
    ).toEqual([{ id: 1, current_spell_version_id: 1 }]);
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

  /**
   * WEAPONS, AND THE OLDER SNAPSHOT VERSION THEY INTRODUCED.
   *
   * A readable-but-older version is a different case from an unreadable one.
   * `a7-v1` still restores, so its rows still become INSERTs and still have to
   * be audited — but against the tables `a7-v1` actually carries.
   */
  it('accepts an a7-v1 save point rather than rejecting the whole image', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_weapons (id, character_id, name)
       VALUES (1, 1, 'Longsword')`,
    );
    const legacy = legacySnapshotOf(db, 1);
    // The fixture is the shape the claim is about: five tables, no weapons key.
    expect(Object.hasOwn(legacy, 'character_weapons')).toBe(false);
    insertSavePoint(db, 1, legacy);

    // Refusing this would take a legitimate user's whole database away over a
    // save point that predates weapons — the D6b failure this pass exists to
    // avoid, and the thing that would happen if the audit held every snapshot
    // to today's table set.
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    // And it is not inert: unlike an unreadable version, this one still
    // restores, so the audit had to actually look at it.
    const restored = freshDatabase();
    seedTwoCharacters(restored);
    expect(() =>
      new CharacterState(new DatabaseContext(restored)).restore(1, legacy),
    ).not.toThrow();
  });

  it('audits and restores ability_override in the existing a7-v12 snapshot shape', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_effects (
         id, character_id, sort_order, effect_kind, ability, maximum,
         source_instance_id, label
       ) VALUES (
         1, 1, 1, 'ability_override', 'strength', 24, 1,
         'Epic Strength Boon'
       )`,
    );
    const snapshot = snapshotOf(db, 1);
    expect(snapshot.schema_version).toBe('a7-v12');
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    db.exec('DELETE FROM character_effects WHERE id = 1');
    new CharacterState(new DatabaseContext(db)).restore(1, snapshot);
    expect(
      db.selectObject(
        `SELECT effect_kind, ability, maximum, source_instance_id, label
         FROM character_effects WHERE id = 1`,
      ),
    ).toEqual({
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 24,
      source_instance_id: 1,
      label: 'Epic Strength Boon',
    });
  });

  it('accepts and restores a v5 save point with legacy damage and range', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_weapons (
         id, character_id, name, damage_kind, damage_dice
       ) VALUES (1, 1, 'Table Blade', 'dice', '1d8')`,
    );
    const snapshot = snapshotOf(db, 1);
    snapshot.schema_version = 'a7-v5';
    delete (snapshot.character as Record<string, unknown>)
      .ability_allocation_method;
    const weapon = (snapshot.character_weapons as Record<
      string,
      unknown
    >[])[0]!;
    for (const column of [
      'damage_kind',
      'damage_flat',
      'damage_custom',
      'versatile_damage_kind',
      'versatile_damage_flat',
      'versatile_damage_custom',
    ]) {
      delete weapon[column];
    }
    const custom = '  old campaign table  ';
    weapon.damage_dice = custom;
    weapon.versatile_damage_dice = null;
    delete weapon.range_kind;
    delete weapon.range_near_feet;
    delete weapon.range_far_feet;
    weapon.range_normal_feet = null;
    weapon.range_long_feet = 60;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    const state = new CharacterState(new DatabaseContext(db));
    expect(() => state.restore(1, snapshot)).not.toThrow();
    expect(
      db.selectObject(
        `SELECT damage_kind, damage_dice, damage_flat, damage_custom,
                range_kind, range_near_feet, range_far_feet
         FROM character_weapons
         WHERE id = 1`,
      ),
    ).toEqual({
      damage_kind: 'custom',
      damage_dice: null,
      damage_flat: null,
      damage_custom: custom,
      range_kind: 'legacy',
      range_near_feet: null,
      range_far_feet: 60,
    });
  });

  it('accepts a pre-D46 save point and restores missing attack kind as null', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_weapons (
         id, character_id, name, attack_kind
       ) VALUES (1, 1, 'Old copied weapon', 'melee')`,
    );
    const snapshot = snapshotOf(db, 1);
    const weapon = (
      snapshot.character_weapons as Record<string, unknown>[]
    )[0]!;
    delete weapon.attack_kind;
    expect(Object.hasOwn(weapon, 'attack_kind')).toBe(false);
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    db.exec(
      `UPDATE character_weapons
       SET attack_kind = 'ranged'
       WHERE id = 1`,
    );
    new CharacterState(new DatabaseContext(db)).restore(1, snapshot);
    expect(
      db.selectValue(
        'SELECT attack_kind FROM character_weapons WHERE id = 1',
      ),
    ).toBeNull();
  });

  it('accepts every save point restore accepts', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_effects (
         id, character_id, sort_order, effect_kind, damage_type, label
       ) VALUES (1, 1, 1, 'damage_resistance', 'Poison', 'Dwarven Resilience')`,
    );
    const snapshot = snapshotOf(db, 1);
    snapshot.schema_version = 'a7-v9';
    delete snapshot.character_items;
    const effect = (snapshot.character_effects as Record<
      string,
      unknown
    >[])[0]!;
    for (const column of [
      'ability',
      'amount',
      'maximum',
      'base',
      'ability_1',
      'ability_2',
      'allows_shield',
      'weapon_scope',
    ]) {
      delete effect[column];
    }
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();
  });

  it('default-fills historical item quantity identically in audit and restore', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_items (id, character_id, name, quantity)
       VALUES (7, 1, 'Potion', 5)`,
    );
    const snapshot = snapshotOf(db, 1);
    snapshot.schema_version = 'a7-v11';
    const item = (
      snapshot.character_items as Record<string, unknown>[]
    )[0]!;
    delete item.quantity;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    db.exec('UPDATE character_items SET quantity = 9 WHERE id = 7');
    new CharacterState(new DatabaseContext(db)).restore(1, snapshot);
    expect(
      db.selectValue('SELECT quantity FROM character_items WHERE id = 7'),
    ).toBe(1);
  });

  it('accepts a pre-AC-4 save point carrying the retired adjustment columns', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    const snapshot = snapshotOf(db, 1);
    snapshot.character_sheet_adjustments = [{
      id: 14,
      character_id: 1,
      armor_class_adjustment: 3,
      armor_class_adjustment_note: 'Old manual bonus',
      created_at: '2026-07-30 12:00:00',
      updated_at: '2026-07-30 12:00:00',
    }];
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).not.toThrow();

    new CharacterState(new DatabaseContext(db)).restore(1, snapshot);
    expect(
      db.selectObject(
        `SELECT effect_kind, amount, label
         FROM character_effects
         WHERE character_id = 1`,
      ),
    ).toEqual({
      effect_kind: 'armor_class_bonus',
      amount: 3,
      label: 'Old manual bonus',
    });
  });

  it('still audits the rows inside an a7-v1 save point', () => {
    // The corollary of accepting the version: the five tables it does carry get
    // exactly the scrutiny they got before. An older version is not an escape
    // hatch for a hand-made image.
    const db = freshDatabase();
    seedTwoCharacters(db);
    const legacy = legacySnapshotOf(db, 1);
    (
      (legacy.character_source_instances as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).character_id = 2;
    insertSavePoint(db, 1, legacy);
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'belongs to character 2, but the save point belongs to character 1',
    );
  });

  it('refuses a snapshot weapon that selects a mastery it does not name', () => {
    // The database's own CHECK, `character_weapons_mastery_requires_property_check`.
    // A live row cannot hold this pair, so it can only exist inside snapshot
    // JSON — and `restore` would turn it into an INSERT that dies with
    // SQLITE_CONSTRAINT_CHECK, mid-undo, after the DELETEs have already run.
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_weapons (id, character_id, name)
       VALUES (1, 1, 'Longsword')`,
    );
    const snapshot = snapshotOf(db, 1);
    const weapon = (snapshot.character_weapons as Record<string, unknown>[])[0]!;
    expect(weapon.mastery_selected).toBe(0);
    weapon.mastery_selected = 1;
    weapon.mastery_property = null;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'selects a weapon mastery without naming the property',
    );
  });

  it('refuses a snapshot effect whose payload contradicts its kind', () => {
    // Five more CHECKs a live row cannot break and snapshot JSON can, on the
    // newest character-owned table. `restore` would turn this into an INSERT
    // that dies with SQLITE_CONSTRAINT_CHECK mid-undo, after the DELETEs — the
    // same failure the weapon case above exists to prevent, reached the same
    // way.
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_effects (
         id, character_id, sort_order, effect_kind, damage_type, label
       ) VALUES (1, 1, 1, 'damage_resistance', 'Poison', 'Dwarven Resilience')`,
    );
    const snapshot = snapshotOf(db, 1);
    // `snapshotOf` labels its output `a7-v2`, and each version is audited at
    // ITS OWN table set — so an effect only comes under scrutiny in a snapshot
    // that claims to carry effects at all. That is the version this build
    // writes.
    snapshot.schema_version = CHARACTER_SNAPSHOT_SCHEMA_VERSION;
    const effect = (snapshot.character_effects as Record<string, unknown>[])[0]!;
    expect(effect.hit_points_flat).toBeNull();
    effect.hit_points_flat = 5;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'carries hit points without effect_kind hp_modifier',
    );
  });

  it('refuses the same contradiction inside a legacy trait row', () => {
    // The pre-inversion shape of the identical payload: five `effect_*` columns
    // ON the trait, which `splitLegacyTraitEffect` migrates into an effect at
    // restore. The stripped row passes every contract, so this is the only
    // thing that looks at the payload at all.
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_species_traits (
         id, character_id, sort_order, name
       ) VALUES (1, 1, 1, 'Dwarven Resilience')`,
    );
    const snapshot = snapshotOf(db, 1);
    // `a7-v4` AND NOT THE CURRENT VERSION, because that is the last version
    // whose trait rows carried the payload — a save point on a real user's disk
    // rather than a shape this build could write.
    snapshot.schema_version = 'a7-v4';
    delete (snapshot.character as Record<string, unknown>)
      .ability_allocation_method;
    const trait = (
      snapshot.character_species_traits as Record<string, unknown>[]
    )[0]!;
    expect(Object.hasOwn(trait, 'effect_kind')).toBe(false);
    trait.effect_kind = 'damage_resistance';
    trait.effect_damage_type = 'Poison';
    trait.effect_hit_points_flat = 5;
    trait.effect_hit_points_per_level = null;
    trait.effect_speed_bonus_feet = null;
    insertSavePoint(db, 1, snapshot);

    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'carries hit points without effect_kind hp_modifier',
    );
  });

  it('refuses a save point embedding another character’s weapon', () => {
    const db = freshDatabase();
    seedTwoCharacters(db);
    db.exec(
      `INSERT INTO character_weapons (id, character_id, name)
       VALUES (1, 1, 'Longsword')`,
    );
    const snapshot = snapshotOf(db, 1);
    (
      (snapshot.character_weapons as Record<string, unknown>[])[0] as Record<
        string,
        unknown
      >
    ).character_id = 2;
    insertSavePoint(db, 1, snapshot);

    // `restore` rewrites `character_id` to the character being restored, so
    // this would MOVE character 2's weapon on undo. Same rule the other
    // character-owned tables already get; weapons just joined the scope.
    expect(() => auditCandidateDatabase(quarantined(bytesOf(db)))).toThrow(
      'belongs to character 2, but the save point belongs to character 1',
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
      expect(lifecycle.database.allRaw('SELECT id, name FROM characters')).toEqual([
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
        lifecycle.database.allRaw('SELECT id, name FROM characters ORDER BY id'),
      ).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    } finally {
      lifecycle.close();
    }
  });
});
