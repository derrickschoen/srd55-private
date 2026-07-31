import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemaSources } from '../helpers/schema-sources';

/**
 * AUTOINCREMENT is invisible to every other structural suite.
 *
 * `PRAGMA table_info` cannot distinguish `INTEGER PRIMARY KEY NOT NULL` from
 * `INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL` — both report
 * `type=INTEGER, notnull=1, pk=1` — so nothing in `tests/unit/schema.test.ts`
 * would move if AUTOINCREMENT were dropped from every table. This file reads
 * the DDL TEXT instead, which is the only place the keyword survives.
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
  // ...and these SEVEN from `db/schema/origins.ts`. The seventh,
  // `background_equipment_items`, carries a surrogate key even though
  // (template, option, sort_order) is a perfectly good natural one: an
  // equipment LINE has no identity across a re-cut of the extract, so the
  // seeder deletes and re-inserts rather than upserting, and a natural key
  // would invite the upsert that leaves a shortened package carrying its tail.
  'background_equipment_items',
  'class_equipment_items',
  'background_templates',
  'character_background',
  'character_species',
  'character_species_traits',
  'species_template_traits',
  'species_templates',
  // ...and the two the effect model adds, one per side of the split: what a
  // template GRANTS and what a character HAS.
  'character_effects',
  'species_template_trait_effects',
  // AC-1 (D72): the character's own items, a surrogate key for the same
  // backup-remap reason every character-owned table above carries one.
  'character_items',
  // Sheet core (D11/D12): seven class-content tables plus the armour catalog.
  // Every one carries a surrogate autoincrementing key, so the claim below —
  // that `naturalKeyTables` is empty — still holds after they arrive.
  'armor_templates',
  'class_armor_training',
  'class_extra_attack_grants',
  'class_martial_arts_dice',
  'class_saving_throw_proficiencies',
  'class_sheet_traits',
  'class_skill_options',
  'class_weapon_proficiencies',
  // D19: the two class-feature tables. Both carry a surrogate autoincrementing
  // key rather than a natural one — `named_features.content_key` is UNIQUE and
  // would have served, but a catalog row's key is user-editable content and a
  // foreign key onto it would move when the content was corrected.
  'named_features',
  'subclass_features',
  // AC-2a: automatic, optional named, and subclass feature mechanics live in
  // child rows. Each child has its own identity for template_ref and cascades.
  'class_feature_effects',
  'named_feature_effects',
  'subclass_feature_effects',
  // The four STORED SHEET INPUTS. Each carries a surrogate autoincrementing key
  // even though each has a natural one — (character, slot), (character, class,
  // level), (character, skill), (character) — because a save-point snapshot
  // names rows by `id` when it restores them, and `character-backup.ts` remaps
  // those ids on import. A natural key would leave nothing to remap.
  'character_armor',
  'character_hit_point_rolls',
  'character_sheet_adjustments',
  // The skill grants (skills plan, S-A), in this group's sorted position. Its
  // surrogate key is the same backup-remap argument as its neighbours', plus
  // one of its own: the fill command addresses a grant BY id, and a natural
  // key would change under the row when the skill is chosen.
  'character_skill_grants',
  'character_skill_expertise_grants',
  'character_level_feat_choices',
  'character_skill_proficiencies',
  // The two progression ladders — SLOT levels and the Cantrip Upgrade's
  // CHARACTER levels. A surrogate key each, for the reason
  // `spell_version_tags` and the other spell pivots have one: the importer
  // replaces the whole list per spell rather than reconciling rows.
  'spell_version_upcast_levels',
  'spell_version_cantrip_upgrade_levels',
] as const;

const allAutoIncrementTables = [
  ...autoIncrementTables,
  ...nativeAutoIncrementTables,
].sort();

/**
 * The tables whose primary key is a natural key rather than a rowid alias, and
 * which therefore cannot carry AUTOINCREMENT.
 *
 * CI-2a's four recipient-local registry tables are keyed by their content or
 * fingerprint tuples, and CI-2b's applied marker is keyed by its immutable
 * migration id, just as D92's one-row-per-character attunement slots are keyed
 * by character_id. A table added with a natural primary key fails here and
 * forces the decision to be made deliberately.
 */
const naturalKeyTables = [
  'catalog_content_aliases',
  'catalog_content_fingerprints',
  'catalog_content_identities',
  'catalog_content_match_decisions',
  'catalog_data_migrations',
  'character_attunement_slots',
] as const;

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

    it('declares AUTOINCREMENT on exactly the 30 Laravel and 37 native surrogate-key tables', () => {
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
      // 30 surviving Laravel tables plus 36 native: 4 weapons, 8 sheet core,
      // 7 origins (the seventh is `background_equipment_items`), 2 effects,
      // 2 class features, 4 stored sheet inputs, the TWO progression
      // ladders on the catalog side (`spell_version_upcast_levels` and
      // `spell_version_cantrip_upgrade_levels`), the ONE
      // skills-with-provenance table, `character_skill_grants`, the GF-2
      // Expertise grant table, and the ONE
      // AC-1 (D72) items table, `character_items`, and AC-2a's three feature
      // effect tables. Counted in parts so one group shrinking while another
      // grows cannot pass unnoticed. D92's slot row uses character_id as its
      // natural primary key and therefore belongs in `naturalKeyTables`.
      expect(declared).toHaveLength(67);
      expect(autoIncrementTables).toHaveLength(30);
      expect(nativeAutoIncrementTables).toHaveLength(37);

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
