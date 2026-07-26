import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemaSources } from '../helpers/schema-sources';

/**
 * AUTOINCREMENT is invisible to the existing parity oracle.
 *
 * `PRAGMA table_info` cannot distinguish `INTEGER PRIMARY KEY NOT NULL` from
 * `INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL` — both report
 * `type=INTEGER, notnull=1, pk=1` — so `laravelColumnMetadataHash` would not
 * move if AUTOINCREMENT were dropped from every table.
 *
 * It is nevertheless load-bearing. Only an AUTOINCREMENT table gets a
 * `sqlite_sequence` row, and `src/backup/character-backup.ts` reads and writes
 * `sqlite_sequence` to reserve save-point ids across a restore. Without it,
 * SQLite reuses the highest free rowid and a restore can silently collide with
 * ids the backup document still references.
 *
 * PROVENANCE: the names below were transcribed from the hand-written,
 * Laravel-derived `src/db/schema.sql` as it stood BEFORE any Drizzle
 * generation existed. They are not derived from Drizzle output and must never
 * be regenerated from it. Three of the original 33 — `failed_jobs`, `jobs` and
 * `users` — were removed with the eight Laravel-only tables; the remaining 30
 * are the untouched transcription.
 */
const autoIncrementTables = [
  'background_definitions',
  'change_log',
  'character_class_levels',
  'character_operations',
  'character_rule_overrides',
  'character_save_points',
  'character_source_instances',
  'character_spell_preferences',
  'characters',
  'class_definitions',
  'class_progressions',
  'feat_definitions',
  'species_definitions',
  'spell_identities',
  'spell_identity_aliases',
  'spell_list_memberships',
  'spell_loadout_entries',
  'spell_loadouts',
  'spell_selection_slots',
  'spell_version_attack_modes',
  'spell_version_conditions',
  'spell_version_damage_types',
  'spell_version_publications',
  'spell_version_save_abilities',
  'spell_version_tags',
  'spell_versions',
  'subclass_definitions',
  'subclass_progressions',
  'warning_acknowledgements',
  'wizard_spellbook_entries',
] as const;

/**
 * The NATIVE tables — no Laravel migration produced them. Kept in their own
 * list so the provenance claim above is not quietly absorbed: those names came
 * from the pre-Drizzle hand-written artifact, and these four come from
 * `db/schema/weapons.ts`.
 *
 * They carry AUTOINCREMENT for the same reason every other surrogate-key table
 * does — the id-reuse hazard `sqlite_sequence` exists to close does not care
 * which migration a table came from.
 */
const nativeAutoIncrementTables = [
  'character_weapons',
  'class_weapon_mastery_counts',
  'class_weapon_mastery_grants',
  'weapon_templates',
  // ...and these six from `db/schema/origins.ts`.
  'background_templates',
  'character_background',
  'character_species',
  'character_species_traits',
  'species_template_traits',
  'species_templates',
] as const;

const allAutoIncrementTables = [
  ...autoIncrementTables,
  ...nativeAutoIncrementTables,
].sort();

/**
 * The tables whose primary key is a natural key rather than a rowid alias, and
 * which therefore cannot carry AUTOINCREMENT.
 *
 * EMPTY NOW, AND STILL WORTH ASSERTING. All five — `cache`, `cache_locks`,
 * `job_batches`, `password_reset_tokens`, `sessions` — were Laravel-only tables
 * and left with the other eight, so the "33 of 38 from both directions" framing
 * is genuinely gone and is not pretended otherwise. What the empty list still
 * says is a real, failable claim about the schema as it stands: EVERY table has
 * a surrogate autoincrementing key, the four native weapon tables and the six
 * native origins tables included. A
 * table added with a natural primary key fails here and forces the decision to
 * be made deliberately, which is the only thing the second direction ever
 * bought.
 */
const naturalKeyTables = [] as const;

let sqlite3: Sqlite3Static;
const openDatabases: Database[] = [];

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

afterAll(() => {
  for (const db of openDatabases) {
    db.close();
  }
});

for (const [sourceLabel, schemaSql] of schemaSources) {
  describe(`autoincrement primary keys (${sourceLabel})`, () => {
    function openDb(): Database {
      const db = new sqlite3.oo1.DB(':memory:', 'c');
      openDatabases.push(db);
      db.exec(schemaSql);
      return db;
    }

    it('declares AUTOINCREMENT on exactly the 30 Laravel and 10 native surrogate-key tables', () => {
      const db = openDb();
      const declared = db
        .selectValues(
          `SELECT name
           FROM sqlite_schema
           WHERE type = 'table'
             AND name NOT LIKE 'sqlite_%'
             AND sql LIKE '%AUTOINCREMENT%'
           ORDER BY name`,
        )
        .map(String);

      expect(declared).toEqual(allAutoIncrementTables);
      expect(declared).toHaveLength(40);
      expect(autoIncrementTables).toHaveLength(30);
      expect(nativeAutoIncrementTables).toHaveLength(10);

      const withoutAutoIncrement = db
        .selectValues(
          `SELECT name
           FROM sqlite_schema
           WHERE type = 'table'
             AND name NOT LIKE 'sqlite_%'
             AND sql NOT LIKE '%AUTOINCREMENT%'
           ORDER BY name`,
        )
        .map(String);
      expect(withoutAutoIncrement).toEqual([...naturalKeyTables]);
    });

    it('materializes sqlite_sequence, which the save-point id reservation depends on', () => {
      const db = openDb();

      // sqlite_sequence exists as soon as any AUTOINCREMENT table is declared,
      // and gains a row per table on first insert.
      expect(
        db.selectValue(
          `SELECT count(*) FROM sqlite_schema
           WHERE type = 'table' AND name = 'sqlite_sequence'`,
        ),
      ).toBe(1);
      expect(db.selectValue('SELECT count(*) FROM sqlite_sequence')).toBe(0);

      db.exec("INSERT INTO characters (name) VALUES ('Sequence Character')");
      db.exec(
        `INSERT INTO character_save_points
           (character_id, label, snapshot, schema_version)
         VALUES (1, 'first', '{}', '1')`,
      );

      expect(
        db.selectValue(
          "SELECT seq FROM sqlite_sequence WHERE name = 'character_save_points'",
        ),
      ).toBe(1);

      // And the reservation behaviour itself: bumping sqlite_sequence makes the
      // next insert skip the reserved range instead of reusing a free rowid.
      db.exec(
        "UPDATE sqlite_sequence SET seq = 500 WHERE name = 'character_save_points'",
      );
      db.exec(
        `INSERT INTO character_save_points
           (character_id, label, snapshot, schema_version)
         VALUES (1, 'second', '{}', '1')`,
      );
      expect(
        db.selectValue(
          "SELECT max(id) FROM character_save_points",
        ),
      ).toBe(501);
    });
  });
}
