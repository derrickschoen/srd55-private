import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Database,
  Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  databaseSchemaSignature,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import type { DatabaseContext } from '../../../src/db/database';
import {
  DATABASE_MIGRATIONS,
  databaseSchemaChecksum,
  type DatabaseMigration,
} from '../../../src/db/migrations';
import { sha256 } from '../../../src/crypto/sha256';
import { CHARACTER_SNAPSHOT_SCHEMA_VERSION } from '../../../src/character/character-state';
import { verifyMigrations } from '../../../scripts/verify-migrations';
import { bootDatabase } from '../../../src/worker/boot';
import {
  ACTIVE_CHARACTER_LIST_QUERY,
  ARCHIVED_CHARACTER_LIST_QUERY,
} from '../../../src/queries/character-lifecycle-queries';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const FIRST_INDEX =
  'CREATE INDEX migration_probe_first ON characters(name);';
const SECOND_INDEX =
  'CREATE INDEX migration_probe_second ON characters(notes);';
const REFERENCED_TABLES = `
CREATE TABLE migration_parent (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE migration_child (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL
    REFERENCES migration_parent(id) ON DELETE RESTRICT
);`;
const REBUILT_REFERENCED_TABLES = `
CREATE TABLE "migration_parent" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rebuilt INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE migration_child (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL
    REFERENCES migration_parent(id) ON DELETE RESTRICT
);`;
const REBUILD_REFERENCED_PARENT = `
CREATE TABLE "__new_migration_parent" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rebuilt INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "__new_migration_parent" (id, name)
  SELECT id, name FROM migration_parent;
DROP TABLE migration_parent;
ALTER TABLE "__new_migration_parent" RENAME TO migration_parent;`;

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

function migration(
  id: string,
  sql: string,
  resultSchemaChecksum: string,
): DatabaseMigration {
  return Object.freeze({
    id,
    sql,
    checksum: sha256(sql),
    resultSchemaChecksum,
  });
}

function schemaChecksum(sql: string): string {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return databaseSchemaChecksum(databaseSchemaSignature(db));
  } finally {
    db.close();
  }
}

function schemaSignature(sql: string): string {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return databaseSchemaSignature(db);
  } finally {
    db.close();
  }
}

function image(sql: string): Uint8Array {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return sqlite3.capi.sqlite3_js_db_export(db).slice();
  } finally {
    db.close();
  }
}

const SCHEMA_BEFORE_COIN_RETIREMENT = DATABASE_MIGRATIONS
  .slice(0, 4)
  .map((entry) => entry.sql)
  .join('\n');

const SCHEMA_BEFORE_WEAPON_ATTACK_KIND = DATABASE_MIGRATIONS
  .slice(0, 6)
  .map((entry) => entry.sql)
  .join('\n');

const SCHEMA_BEFORE_FEAT_MODEL = DATABASE_MIGRATIONS
  .slice(0, 7)
  .map((entry) => entry.sql)
  .join('\n');

const SCHEMA_BEFORE_ITEM_DEFINITIONS = DATABASE_MIGRATIONS
  .slice(0, DATABASE_MIGRATIONS.findIndex((entry) => entry.id === '0031_item_definitions'))
  .map((entry) => entry.sql)
  .join('\n');

const SCHEMA_BEFORE_CHARACTER_ARCHIVE = DATABASE_MIGRATIONS
  .slice(
    0,
    DATABASE_MIGRATIONS.findIndex(
      (entry) => entry.id === '0032_character_archive',
    ),
  )
  .map((entry) => entry.sql)
  .join('\n');

const SCHEMA_BEFORE_ASSERTED_CONTENT_KEYS = DATABASE_MIGRATIONS
  .slice(
    0,
    DATABASE_MIGRATIONS.findIndex(
      (entry) => entry.id === '0033_asserted_content_keys',
    ),
  )
  .map((entry) => entry.sql)
  .join('\n');

// These rows are hand-seeded because the tables' non-character foreign keys
// and CHECK-specific payloads need valid domain values. The schema-derived
// equality assertion below makes this inventory complete: adding a 27th
// direct child fails until its fixture row is added here too.
const SEEDED_CHARACTER_CHILD_TABLES = Object.freeze([
  'change_log',
  'character_armor',
  'character_attunement_slots',
  'character_background',
  'character_class_levels',
  'character_effects',
  'character_hit_point_rolls',
  'character_items',
  'character_level_feat_choices',
  'character_operations',
  'character_rule_overrides',
  'character_save_points',
  'character_sheet_adjustments',
  'character_skill_expertise_grants',
  'character_skill_grants',
  'character_skill_proficiencies',
  'character_source_instances',
  'character_species',
  'character_species_traits',
  'character_spell_preferences',
  'character_weapons',
  'party_document_states',
  'spell_loadouts',
  'spell_selection_slots',
  'warning_acknowledgements',
  'wizard_spellbook_entries',
] as const);

function directCharacterChildTables(db: Database): string[] {
  return db
    .selectValues(
      `SELECT name FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .map(String)
    .filter((table) =>
      db
        .selectObjects(`PRAGMA foreign_key_list("${table}")`)
        .some((row) => row.table === 'characters'),
    );
}

const CHARACTER_ARCHIVE_CHILD_FIXTURE = `
INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name
) VALUES
  ('migration:class', 'class', 'legacy-opaque', 'external', 'migration class'),
  ('migration:spell', 'spell', 'legacy-opaque', 'external', 'migration spell');
INSERT INTO class_definitions (
  id, content_key, name, rules_edition
) VALUES (8, 'migration:class', 'Migration Class', '2024');
INSERT INTO spell_identities (
  id, content_key, canonical_name, normalized_name
) VALUES (9, 'migration:spell-identity', 'Migration Spell', 'migration spell');
INSERT INTO spell_versions (
  id, content_key, spell_identity_id, display_name, rules_edition, level,
  school
) VALUES (
  10, 'migration:spell', 9, 'Migration Spell', '2024', 1, 'Evocation'
);

INSERT INTO character_source_instances (
  id, character_id, instance_uuid, source_type, source_definition_id,
  display_name
) VALUES (11, 42, 'migration-source', 'class', 8, 'Migration Class');
INSERT INTO character_class_levels (
  id, character_id, class_definition_id, level
) VALUES (12, 42, 8, 1);
INSERT INTO character_items (id, character_id, name)
VALUES (13, 42, 'Migration Item');

INSERT INTO change_log (
  character_id, sequence, entity_type, action_type
) VALUES (42, 1, 'character', 'update');
INSERT INTO character_armor (
  character_id, slot, name, category, armor_class, dex_bonus
) VALUES (42, 'worn', 'Migration Armor', 'light', 12, 'full');
INSERT INTO character_attunement_slots (character_id) VALUES (42);
INSERT INTO character_background (character_id, name)
VALUES (42, 'Migration Background');
INSERT INTO character_effects (
  character_id, sort_order, effect_kind, amount, label
) VALUES (42, 1, 'armor_class_bonus', 1, 'Migration Effect');
INSERT INTO character_hit_point_rolls (
  character_id, class_name, class_level, rolled_value
) VALUES (42, 'Migration Class', 1, 6);
INSERT INTO character_level_feat_choices (
  character_id, character_class_level_id, class_level, choice_kind
) VALUES (42, 12, 1, 'asi_level_feat');
INSERT INTO character_operations (
  character_id, operation_uuid, expected_revision, resulting_revision,
  inverse_command
) VALUES (42, 'migration-operation', 8, 9, '{}');
INSERT INTO character_rule_overrides (character_id, rule_key, value)
VALUES (42, 'migration-rule', '{}');
INSERT INTO character_save_points (
  id, character_id, label, snapshot, schema_version
) VALUES (
  7, 42, 'Before archive', '{}',
  '${CHARACTER_SNAPSHOT_SCHEMA_VERSION}'
);
INSERT INTO character_sheet_adjustments (character_id) VALUES (42);
INSERT INTO character_skill_expertise_grants (
  character_id, source_instance_id, grant_key, ordinal,
  granted_at_class_level, skill
) VALUES (42, 11, 'migration-expertise', 1, 1, 'arcana');
INSERT INTO character_skill_grants (
  character_id, source_instance_id, grant_key, ordinal, skill
) VALUES (42, 11, 'migration-skill', 1, 'history');
INSERT INTO character_skill_proficiencies (character_id, skill)
VALUES (42, 'perception');
INSERT INTO character_species (character_id, name)
VALUES (42, 'Migration Species');
INSERT INTO character_species_traits (
  character_id, sort_order, name
) VALUES (42, 1, 'Migration Trait');
INSERT INTO character_spell_preferences (
  character_id, spell_version_id
) VALUES (42, 10);
INSERT INTO character_weapons (character_id, name)
VALUES (42, 'Migration Weapon');
INSERT INTO party_document_states (
  forge, repository, path, document_kind, character_id, observation_state
) VALUES (
  'github', 'migration/repository', 'characters/42.json', 'character', 42,
  'Never published'
);
INSERT INTO spell_loadouts (character_id, name)
VALUES (42, 'Migration Loadout');
INSERT INTO spell_selection_slots (
  character_id, source_instance_id, slot_key, rule_key, bucket,
  eligibility_kind
) VALUES (
  42, 11, 'migration-slot', 'migration-rule', 'known', 'choice_from_list'
);
INSERT INTO warning_acknowledgements (
  character_id, warning_fingerprint
) VALUES (42, 'migration-warning');
INSERT INTO wizard_spellbook_entries (character_id) VALUES (42);
`;

const HISTORICAL_BACKGROUND_ROWS = `
INSERT INTO background_templates (
  id, content_key, rules_edition, name,
  ability_score_1, ability_score_2, ability_score_3, feat_name,
  skill_proficiency_1, skill_proficiency_2, tool_proficiency,
  equipment_option_a, equipment_option_b
) VALUES
  (1, '2024:background:acolyte', '2024', 'Acolyte',
   'Intelligence', 'Wisdom', 'Charisma', 'Magic Initiate (Cleric)',
   'Insight', 'Religion', 'Calligrapher’s Supplies', 'A', '50 GP'),
  (2, '2024:background:criminal', '2024', 'Criminal',
   'Dexterity', 'Constitution', 'Intelligence', 'Alert',
   'Sleight of Hand', 'Stealth', 'Thieves’ Tools', 'A', '50 GP'),
  (3, '2024:background:sage', '2024', 'Sage',
   'Constitution', 'Intelligence', 'Wisdom', 'Magic Initiate (Wizard)',
   'Arcana', 'History', 'Calligrapher’s Supplies', 'A', '50 GP'),
  (4, '2024:background:soldier', '2024', 'Soldier',
   'Strength', 'Dexterity', 'Constitution', 'Savage Attacker',
   'Athletics', 'Intimidation', 'Choose one kind of Gaming Set', 'A', '50 GP');
INSERT INTO background_equipment_items (
  id, background_template_id, option, sort_order, quantity, item_name,
  item_kind, coin_copper
) VALUES
  (101, 1, 'a', 1, 1, 'stale', 'coin', 800),
  (102, 1, 'b', 1, 1, 'stale', 'coin', 5000),
  (201, 2, 'a', 1, 1, 'stale', 'coin', 1600),
  (202, 2, 'b', 1, 1, 'stale', 'coin', 5000),
  (301, 3, 'a', 1, 1, 'stale', 'coin', 800),
  (302, 3, 'b', 1, 1, 'stale', 'coin', 5000),
  (401, 4, 'a', 1, 1, 'stale', 'coin', 1400),
  (402, 4, 'b', 1, 1, 'stale', 'coin', 5000);`;

async function storageHolding(sql: string): Promise<MemoryDatabaseStorage> {
  const storage = new MemoryDatabaseStorage(sqlite3);
  await storage.replaceFile(image(sql));
  return storage;
}

class ProbedStorage extends MemoryDatabaseStorage {
  migrationExecutions = 0;

  override open(): Database {
    const db = super.open();
    db.createFunction('migration_probe', () => {
      this.migrationExecutions += 1;
      return null;
    });
    return db;
  }
}

function probedRegistry(targetSchema: string): readonly DatabaseMigration[] {
  return Object.freeze([
    migration('0000_test_current', schema, schemaChecksum(schema)),
    migration(
      '0001_test_probe',
      `SELECT migration_probe();\n${FIRST_INDEX}`,
      schemaChecksum(targetSchema),
    ),
  ]);
}

describe('database migration chain', () => {
  it('0033 preserves legacy identities and requires external roots to assert portable keys first', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_ASSERTED_CONTENT_KEYS}
       INSERT INTO item_definitions (
         content_key, rules_edition, name, description, requires_attunement
       ) VALUES (
         'expanded:preserved-belt', 'expanded', 'Preserved Belt', '', 0
       );`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();
    try {
      expect(lifecycle.database.oneRaw(
        `SELECT content_kind, key_kind, catalog_layer
         FROM catalog_content_identities
         WHERE content_key = 'expanded:preserved-belt'`,
      )).toEqual({
        content_kind: 'item',
        key_kind: 'legacy-opaque',
        catalog_layer: 'external',
      });
      expect(() => lifecycle.database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (
           'expanded:content.item:new-belt', 'expanded', 'New Belt', '', 0
         )`,
      )).toThrow(/content key must be registered before insert/u);
      expect(() => lifecycle.database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (
           'fresh-unrecognized-root', 'expanded', 'Fresh Root', '', 0
         )`,
      )).toThrow(/content key must be registered before insert/u);
      expect(lifecycle.database.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE content_key = 'fresh-unrecognized-root'
           OR key_kind = 'legacy-opaque'
             AND content_key <> 'expanded:preserved-belt'`,
      )).toBe(0);

      lifecycle.database.exec(
        `INSERT INTO catalog_content_identities (
           content_key, content_kind, key_kind, catalog_layer, normalized_name
         ) VALUES (
           'expanded:content.item:new-belt', 'item', 'asserted', 'external',
           'new belt'
         )`,
      );
      lifecycle.database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (
           'expanded:content.item:new-belt', 'expanded', 'New Belt', '', 0
         )`,
      );
      expect(lifecycle.database.scalar<number>(
        `SELECT count(*) FROM item_definitions
         WHERE content_key = 'expanded:content.item:new-belt'`,
      )).toBe(1);
    } finally {
      lifecycle.close();
    }
  });

  it('0032 preserves a replacement image and makes historical roots active', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_CHARACTER_ARCHIVE}
       INSERT INTO characters (
         id, name, strength, dexterity, constitution, intelligence, wisdom,
         charisma, ability_allocation_method, proficiency_bonus_override,
         rules_edition_preference, allow_legacy, revision, alignment,
         appearance, backstory, notes, created_at, updated_at
       ) VALUES
         (
           42, 'Preserved Root', 8, 14, 13, 18, 12, 11, 'manual', 4,
           'expanded', 1, 9, 'Chaotic Good', 'Silver cloak', 'Old tower',
           'Keep every root value.', '2040-01-02T03:04:05.000Z',
           '2041-02-03T04:05:06.000Z'
         ),
         (
           100, 'Deleted High Water', 10, 10, 10, 10, 10, 10, NULL, NULL,
           '2024', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL
         );
       DELETE FROM characters WHERE id = 100;
       ${CHARACTER_ARCHIVE_CHILD_FIXTURE}`,
    );
    const beforeMigration = openDatabaseImage(
      sqlite3,
      await storage.exportFile(),
    );
    try {
      // A live maximum equal to sqlite_sequence would let a broken rebuild
      // reset both to the same value and keep this test green. The deleted id
      // makes the high-water mark observably different from the live maximum.
      expect(
        beforeMigration.selectValue('SELECT max(id) FROM characters'),
      ).toBe(42);
      expect(
        beforeMigration.selectValue(
          "SELECT seq FROM sqlite_sequence WHERE name = 'characters'",
        ),
      ).toBe(100);

      const childTables = directCharacterChildTables(beforeMigration);
      expect(childTables).toEqual([...SEEDED_CHARACTER_CHILD_TABLES]);
      for (const table of childTables) {
        expect(
          beforeMigration.selectValue(
            `SELECT count(*) FROM "${table}" WHERE character_id = 42`,
          ),
          table,
        ).toBe(1);
      }
    } finally {
      beforeMigration.close();
    }
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(lifecycle.database.oneRaw(
      `SELECT id, name, strength, dexterity, constitution, intelligence,
              wisdom, charisma, ability_allocation_method,
              proficiency_bonus_override, rules_edition_preference,
              allow_legacy, revision, alignment, appearance, backstory, notes,
              archived_at, created_at, updated_at
       FROM characters WHERE id = 42`,
    )).toEqual({
      id: 42,
      name: 'Preserved Root',
      strength: 8,
      dexterity: 14,
      constitution: 13,
      intelligence: 18,
      wisdom: 12,
      charisma: 11,
      ability_allocation_method: 'manual',
      proficiency_bonus_override: 4,
      rules_edition_preference: 'expanded',
      allow_legacy: 1,
      revision: 9,
      alignment: 'Chaotic Good',
      appearance: 'Silver cloak',
      backstory: 'Old tower',
      notes: 'Keep every root value.',
      archived_at: null,
      created_at: '2040-01-02T03:04:05.000Z',
      updated_at: '2041-02-03T04:05:06.000Z',
    });
    expect(lifecycle.database.oneRaw(
      'SELECT id, character_id, label FROM character_save_points WHERE id = 7',
    )).toEqual({ id: 7, character_id: 42, label: 'Before archive' });

    const migratedChildTables = directCharacterChildTables(
      lifecycle.database.connection,
    );
    expect(migratedChildTables).toEqual([...SEEDED_CHARACTER_CHILD_TABLES]);
    for (const table of migratedChildTables) {
      expect(
        lifecycle.database.scalar(
          `SELECT count(*) FROM "${table}" WHERE character_id = ?`,
          [42],
        ),
        table,
      ).toBe(1);
    }

    expect(
      lifecycle.database.exec(
        "INSERT INTO characters (name) VALUES ('After Migration')",
      ).lastInsertId,
    ).toBe(101);
    lifecycle.close();
  });

  it('uses the archive-list index for both lifecycle orderings', () => {
    const db = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      db.exec(schema);
      expect(
        db.selectObjects(
          `EXPLAIN QUERY PLAN ${ACTIVE_CHARACTER_LIST_QUERY}`,
        ),
      ).toEqual([
        expect.objectContaining({
          detail:
            'SEARCH characters USING COVERING INDEX characters_archive_list_index (archived_at=?)',
        }),
      ]);
      expect(
        db.selectObjects(
          `EXPLAIN QUERY PLAN ${ARCHIVED_CHARACTER_LIST_QUERY}`,
        ),
      ).toEqual([
        expect.objectContaining({
          detail:
            'SEARCH characters USING COVERING INDEX characters_archive_list_index (archived_at>?)',
        }),
      ]);
    } finally {
      db.close();
    }
  });

  it('0031 preserves weapon rows while opening item definitions and passthrough damage', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_ITEM_DEFINITIONS}
       INSERT INTO weapon_templates (
         id, content_key, rules_edition, name, srd_group,
         damage_kind, damage_dice, damage_type, versatile_damage_kind,
         finesse, heavy, light, loading, reach, thrown, two_handed,
         ammunition, range_kind, mastery_property, other_properties,
         created_at, updated_at
       ) VALUES (
         731, 'expanded:legacy:preserved-pike', 'expanded', 'Preserved Pike',
         'martial_melee', 'dice', '1d8', 'Piercing', 'not_applicable',
         0, 0, 0, 0, 1, 0, 0, 0, 'none', 'Vex', 'Keep every byte.',
         '2040-01-02T03:04:05.000Z', '2041-02-03T04:05:06.000Z'
       );`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    expect(lifecycle.database.oneRaw(
      `SELECT id, content_key, rules_edition, name, damage_kind, damage_dice,
              damage_type, reach, mastery_property, other_properties,
              created_at, updated_at
       FROM weapon_templates WHERE id = 731`,
    )).toEqual({
      id: 731,
      content_key: 'expanded:legacy:preserved-pike',
      rules_edition: 'expanded',
      name: 'Preserved Pike',
      damage_kind: 'dice',
      damage_dice: '1d8',
      damage_type: 'Piercing',
      reach: 1,
      mastery_property: 'Vex',
      other_properties: 'Keep every byte.',
      created_at: '2040-01-02T03:04:05.000Z',
      updated_at: '2041-02-03T04:05:06.000Z',
    });
    lifecycle.database.exec(
      `INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES (
         'expanded:content.weapon:storm-pike', 'weapon', 'asserted', 'external',
         'stormpike'
       );
       INSERT INTO weapon_templates (
         content_key, name, srd_group, damage_kind, damage_dice, damage_type,
         range_kind, mastery_property
       ) VALUES (
         'expanded:content.weapon:storm-pike', 'Storm Pike', 'martial_melee',
         'dice', '1d8', 'Storm Fire', 'none', 'Vex'
       )`,
    );
    expect(lifecycle.database.scalar(
      `SELECT count(*) FROM sqlite_schema
       WHERE type = 'table' AND name IN ('item_definitions', 'item_definition_effects')`,
    )).toBe(2);
    lifecycle.close();
  });

  it('builds the exact fresh-schema signature from empty', async () => {
    const result = await verifyMigrations(sqlite3);

    expect(result.migrationCount).toBe(DATABASE_MIGRATIONS.length);
    expect(result.signature).toBe(schemaSignature(schema));
  });

  it('preserves pre-0028 effects while opening authored storage', async () => {
    const beforeAuthorableEffects = DATABASE_MIGRATIONS
      .slice(0, DATABASE_MIGRATIONS.findIndex((entry) => entry.id === '0028_authorable_effect_storage'))
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(beforeAuthorableEffects);
    const old = storage.open();
    old.exec(`
      INSERT INTO species_templates (
        id, content_key, rules_edition, name, creature_type, size,
        base_speed_feet
      ) VALUES (
        10, 'expanded:species:migration', 'expanded', 'Migration Species',
        'Humanoid', 'Medium', 30
      );
      INSERT INTO species_template_traits (
        id, species_template_id, sort_order, name, description
      ) VALUES (11, 10, 1, 'Old Ward', 'Preserved description.');
      INSERT INTO species_template_trait_effects (
        id, species_template_trait_id, sort_order, effect_kind, damage_type
      ) VALUES (12, 11, 1, 'damage_resistance', 'Fire');
      INSERT INTO class_definitions (
        id, content_key, name, rules_edition, progression_type
      ) VALUES (20, 'expanded:class:migration', 'Migration Class', 'expanded', 'none');
      INSERT INTO subclass_definitions (
        id, content_key, class_definition_id, name, rules_edition
      ) VALUES (
        21, 'expanded:subclass:migration', 20, 'Migration Subclass', 'expanded'
      );
      INSERT INTO subclass_features (
        id, subclass_definition_id, class_level, sort_order, name, description
      ) VALUES (22, 21, 3, 1, 'Echo', 'Original threshold.');
      INSERT INTO subclass_feature_effects (
        id, subclass_feature_id, sort_order, effect_kind, damage_type
      ) VALUES (23, 22, 1, 'damage_resistance', 'Cold');
    `);
    old.close();

    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
    );
    lifecycle.open();
    expect(lifecycle.database.oneRaw(`
      SELECT effect_kind, damage_type, ability, amount, maximum, label, notes
      FROM species_template_trait_effects WHERE id = 12
    `)).toEqual({
      effect_kind: 'damage_resistance',
      damage_type: 'Fire',
      ability: null,
      amount: null,
      maximum: null,
      label: 'Old Ward',
      notes: null,
    });
    expect(lifecycle.database.oneRaw(`
      SELECT effect_kind, damage_type, label, notes
      FROM subclass_feature_effects WHERE id = 23
    `)).toEqual({
      effect_kind: 'damage_resistance',
      damage_type: 'Cold',
      label: 'Echo',
      notes: null,
    });

    lifecycle.database.exec(`
      UPDATE species_templates SET
        creature_type = 'Clockwork  Humanoid',
        size = 'Minuscule',
        alternate_size = 'Smáll'
      WHERE id = 10;
      INSERT INTO species_template_trait_effects (
        species_template_trait_id, sort_order, effect_kind, damage_type, label
      ) VALUES (11, 2, 'damage_resistance', 'Void  Fire', 'Void ward');
      INSERT INTO catalog_content_identities (
        content_key, content_kind, key_kind, catalog_layer, normalized_name
      ) VALUES (
        'expanded:content.background:migration', 'background', 'asserted',
        'external', 'migrationbackground'
      );
      INSERT INTO background_templates (
        id, content_key, rules_edition, name,
        ability_score_1, ability_score_2, ability_score_3, feat_name,
        skill_proficiency_1, skill_proficiency_2, tool_proficiency,
        equipment_option_a, equipment_option_b
      ) VALUES (
        30, 'expanded:content.background:migration', 'expanded', 'Migration Background',
        'Strength', 'Dexterity', 'Constitution', 'Alert', 'Acrobatics',
        'Stealth', 'Astrolabe', 'Astrolabe', '50 GP'
      );
      INSERT INTO background_template_effects (
        background_template_id, sort_order, effect_kind, damage_type, label
      ) VALUES (30, 1, 'damage_resistance', 'void', 'Lowercase ward');
      INSERT INTO subclass_features (
        subclass_definition_id, class_level, sort_order, name, description
      ) VALUES (21, 7, 2, 'Echo', 'Later threshold.');
      UPDATE subclass_feature_effects
      SET damage_type = 'Steam', label = 'Steam ward', notes = 'Exact notes.'
      WHERE id = 23;
    `);

    expect(lifecycle.database.oneRaw(`
      SELECT creature_type, size, alternate_size FROM species_templates
      WHERE id = 10
    `)).toEqual({
      creature_type: 'Clockwork  Humanoid',
      size: 'Minuscule',
      alternate_size: 'Smáll',
    });
    expect(lifecycle.database.allRaw(`
      SELECT class_level, name FROM subclass_features
      WHERE subclass_definition_id = 21 ORDER BY class_level
    `)).toEqual([
      { class_level: 3, name: 'Echo' },
      { class_level: 7, name: 'Echo' },
    ]);
    expect(lifecycle.database.oneRaw(`
      SELECT damage_type, label FROM background_template_effects
      WHERE background_template_id = 30
    `)).toEqual({ damage_type: 'void', label: 'Lowercase ward' });
    expect(lifecycle.database.scalar<number>(
      'SELECT count(*) FROM pragma_foreign_key_check',
    )).toBe(0);
    lifecycle.close();
  });

  it('adds nullable subclass reference text while preserving existing rows', async () => {
    const beforeSubclassReferenceText = DATABASE_MIGRATIONS
      .slice(0, DATABASE_MIGRATIONS.findIndex((entry) => entry.id === '0030_subclass_reference_text'))
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(`${beforeSubclassReferenceText}
      INSERT INTO class_definitions (
        id, content_key, name, rules_edition, progression_type
      ) VALUES (1, 'expanded:class:notes', 'Notes Class', 'expanded', 'none');
      INSERT INTO subclass_definitions (
        id, content_key, class_definition_id, name, rules_edition, grant_rules
      ) VALUES (
        2, 'expanded:subclass:notes', 1, 'Notes Subclass', 'expanded', '[]'
      );`);

    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    expect(lifecycle.database.oneRaw(`
      SELECT name, grant_rules, notes FROM subclass_definitions WHERE id = 2
    `)).toEqual({
      name: 'Notes Subclass',
      grant_rules: '[]',
      notes: null,
    });
    lifecycle.close();
  });

  it('registers every pre-0020 root as legacy opaque before adding root foreign keys', async () => {
    const beforeContentRegistry = DATABASE_MIGRATIONS
      .slice(0, 20)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeContentRegistry}
       INSERT INTO class_definitions (
         id, content_key, name, rules_edition
       ) VALUES (1, '2024:class:test', 'Test Class', '2024');
       INSERT INTO species_definitions (
         id, content_key, name, rules_edition
       ) VALUES (2, '2024:species:test', 'Test Species', '2024');
       INSERT INTO species_templates (
         id, content_key, rules_edition, name, creature_type, size,
         base_speed_feet
       ) VALUES (
         3, '2024:species:test', '2024', 'Test Species', 'Humanoid',
         'Medium', 30
       );
       INSERT INTO spell_identities (
         id, content_key, canonical_name, normalized_name
       ) VALUES (4, 'test-spell-group', 'Test Spell', 'test spell');
       INSERT INTO spell_versions (
         id, content_key, spell_identity_id, display_name, rules_edition,
         level, school, provenance
       ) VALUES (
         5, '2024:test-spell', 4, 'Test Spell', '2024', 1, 'Evocation',
         'srd'
       );`,
    );

    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    const db = lifecycle.open();

    expect(
      db.allRaw(
        `SELECT
           content_key, content_kind, key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities
         ORDER BY content_key`,
      ),
    ).toEqual([
      {
        content_key: '2024:class:test',
        content_kind: 'class',
        key_kind: 'legacy-opaque',
        catalog_layer: 'external',
        normalized_name: 'test class',
      },
      {
        content_key: '2024:species:test',
        content_kind: 'species',
        key_kind: 'legacy-opaque',
        catalog_layer: 'external',
        normalized_name: 'test species',
      },
      {
        content_key: '2024:test-spell',
        content_kind: 'spell',
        key_kind: 'legacy-opaque',
        catalog_layer: 'external',
        normalized_name: 'test spell',
      },
    ]);
    expect(
      db.scalar<number>(
        `SELECT count(*) FROM pragma_foreign_key_check`,
      ),
    ).toBe(0);
    lifecycle.close();
  });

  // Measured 2.3s alone; 20s leaves headroom for full-suite contention.
  it('refuses a pre-0020 key shared by roots of different kinds without changing the image', async () => {
    const beforeContentRegistry = DATABASE_MIGRATIONS
      .slice(0, 20)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeContentRegistry}
       INSERT INTO class_definitions (
         id, content_key, name, rules_edition
       ) VALUES (1, '2024:shared-key', 'Collision Class', '2024');
       INSERT INTO species_templates (
         id, content_key, rules_edition, name, creature_type, size,
         base_speed_feet
       ) VALUES (
         2, '2024:shared-key', '2024', 'Collision Species', 'Humanoid',
         'Medium', 30
       );`,
    );
    const before = await storage.exportFile();
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    expect(() => lifecycle.open()).toThrow(
      'UNIQUE constraint failed: catalog_content_identities.content_key',
    );
    expect(await storage.exportFile()).toEqual(before);
  }, 20_000);

  it('moves every inline class-feature effect into its child table', async () => {
    const beforeAc2a = DATABASE_MIGRATIONS
      .slice(0, 14)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeAc2a}
       INSERT INTO class_definitions (
         id, content_key, name, rules_edition, progression_type
       ) VALUES (1, 'test:class', 'Migration Class', 'expanded', 'none');
       INSERT INTO subclass_definitions (
         id, content_key, class_definition_id, name, rules_edition
       ) VALUES (2, 'test:subclass', 1, 'Migration Subclass', 'expanded');
       INSERT INTO subclass_features (
         id, subclass_definition_id, class_level, sort_order, name,
         description, effect_kind, effect_attack_count, effect_weapon_scope
       ) VALUES (
         3, 2, 5, 1, 'Subclass Attack', 'Migrated subclass payload.',
         'extra_attack', 2, 'any_weapon'
       );
       INSERT INTO named_features (
         id, content_key, class_definition_id, name, rules_edition,
         prerequisite, description, class_level, effect_kind,
         effect_attack_count, effect_weapon_scope
       ) VALUES (
         4, 'test:named', 1, 'Named Attack', 'expanded', 'Level 5+',
         'Migrated named payload.', 5, 'extra_attack', 3,
         'one_bonded_weapon'
       );`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();
    expect(
      lifecycle.database.allRaw(
        `SELECT subclass_feature_id, effect_kind, attack_count, weapon_scope
         FROM subclass_feature_effects`,
      ),
    ).toEqual([
      {
        subclass_feature_id: 3,
        effect_kind: 'extra_attack',
        attack_count: 2,
        weapon_scope: 'any_weapon',
      },
    ]);
    expect(
      lifecycle.database.allRaw(
        `SELECT named_feature_id, effect_kind, attack_count, weapon_scope
         FROM named_feature_effects`,
      ),
    ).toEqual([
      {
        named_feature_id: 4,
        effect_kind: 'extra_attack',
        attack_count: 3,
        weapon_scope: 'one_bonded_weapon',
      },
    ]);
    lifecycle.close();
  });

  it('retires each non-zero Armor Class adjustment into one manual effect', async () => {
    const beforeAc4 = DATABASE_MIGRATIONS
      .slice(0, 16)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeAc4}
       INSERT INTO characters (id, name) VALUES
         (1, 'Labelled adjustment'),
         (2, 'Unlabelled adjustment');
       INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, label
       ) VALUES (1, 4, 'armor_class_bonus', 1, 'Existing bonus');
       INSERT INTO character_sheet_adjustments (
         character_id, armor_class_adjustment, armor_class_adjustment_note
       ) VALUES
         (1, 3, 'House rule'),
         (2, -2, NULL);`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT character_id, sort_order, effect_kind, amount, label,
                source_instance_id, character_item_id, character_weapon_id,
                template_ref
         FROM character_effects
         WHERE label <> 'Existing bonus'
         ORDER BY character_id`,
      ),
    ).toEqual([
      {
        character_id: 1,
        sort_order: 5,
        effect_kind: 'armor_class_bonus',
        amount: 3,
        label: 'House rule',
        source_instance_id: null,
        character_item_id: null,
        character_weapon_id: null,
        template_ref: null,
      },
      {
        character_id: 2,
        sort_order: 1,
        effect_kind: 'armor_class_bonus',
        amount: -2,
        label: 'Manual Armor Class adjustment',
        source_instance_id: null,
        character_item_id: null,
        character_weapon_id: null,
        template_ref: null,
      },
    ]);
    expect(
      lifecycle.database.allRaw('SELECT * FROM character_sheet_adjustments'),
    ).toEqual([]);
    lifecycle.close();
  });

  it('drops a zero Armor Class adjustment and its named note without creating an effect', async () => {
    const beforeAc4 = DATABASE_MIGRATIONS
      .slice(0, 16)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeAc4}
       INSERT INTO characters (id, name) VALUES (1, 'Zero adjustment');
       INSERT INTO character_sheet_adjustments (
         character_id, armor_class_adjustment, armor_class_adjustment_note
       ) VALUES (1, 0, 'This zero-with-note is deliberately dropped');`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT effect_kind, amount, label
         FROM character_effects WHERE character_id = 1`,
      ),
    ).toEqual([]);
    expect(
      lifecycle.database
        .allRaw('SELECT name FROM pragma_table_info(?)', [
          'character_sheet_adjustments',
        ])
        .map((row) => row.name),
    ).toEqual(['id', 'character_id', 'created_at', 'updated_at']);
    lifecycle.close();
  });

  it('keeps only the first three historically attuned items by id and drops every later attunement', async () => {
    const beforeAttunementSlots = DATABASE_MIGRATIONS
      .slice(0, 17)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeAttunementSlots}
       INSERT INTO characters (id, name) VALUES (1, 'Four-item history');
       INSERT INTO character_items (
         id, character_id, name, requires_attunement, attuned
       ) VALUES
         (9, 1, 'Fourth by id', 1, 1),
         (2, 1, 'First by id', 1, 1),
         (7, 1, 'Third by id', 1, 1),
         (4, 1, 'Second by id', 1, 1),
         (11, 1, 'Never attuned', 1, 0);`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.oneRaw(
        `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
         FROM character_attunement_slots
         WHERE character_id = 1`,
      ),
    ).toEqual({
      slot_1_item_id: 2,
      slot_2_item_id: 4,
      slot_3_item_id: 7,
    });
    expect(
      lifecycle.database.allRaw(
        `SELECT item.id, item.name
         FROM character_items AS item
         LEFT JOIN character_attunement_slots AS slots
           ON slots.character_id = item.character_id
          AND item.id IN (
            slots.slot_1_item_id, slots.slot_2_item_id, slots.slot_3_item_id
          )
         WHERE item.character_id = 1
           AND slots.character_id IS NULL
         ORDER BY item.id`,
      ),
    ).toEqual([
      { id: 9, name: 'Fourth by id' },
      { id: 11, name: 'Never attuned' },
    ]);
    expect(
      lifecycle.database
        .allRaw('SELECT name FROM pragma_table_info(?)', ['character_items'])
        .map((row) => row.name),
    ).not.toContain('attuned');
    lifecycle.close();
  });

  it('fills every pre-0018 item quantity with one and preserves it after reopen', async () => {
    const beforeQuantity = DATABASE_MIGRATIONS
      .slice(0, 18)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeQuantity}
       INSERT INTO characters (id, name) VALUES (1, 'Historical collector');
       INSERT INTO character_items (id, character_id, name)
       VALUES (4, 1, 'Potion'), (9, 1, 'Rope');`,
    );

    const migrated = new DatabaseLifecycle(sqlite3, storage, schema);
    migrated.open();
    expect(
      migrated.database.allRaw(
        'SELECT id, name, quantity FROM character_items ORDER BY id',
      ),
    ).toEqual([
      { id: 4, name: 'Potion', quantity: 1 },
      { id: 9, name: 'Rope', quantity: 1 },
    ]);
    expect(
      migrated.database.exec(
        `INSERT INTO character_items (character_id, name)
         VALUES (1, 'New possession')`,
      ).lastInsertId,
    ).toBe(10);
    migrated.close();

    const reopened = new DatabaseLifecycle(sqlite3, storage, schema);
    reopened.open();
    expect(
      reopened.database.allRaw(
        'SELECT id, name, quantity FROM character_items ORDER BY id',
      ),
    ).toEqual([
      { id: 4, name: 'Potion', quantity: 1 },
      { id: 9, name: 'Rope', quantity: 1 },
      { id: 10, name: 'New possession', quantity: 1 },
    ]);
    reopened.close();
  });

  it('widens character effects for ability_override without changing existing rows', async () => {
    const beforeD83 = DATABASE_MIGRATIONS
      .slice(0, 19)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforeD83}
       INSERT INTO characters (id, name) VALUES (1, 'Before D83');
       INSERT INTO character_effects (
         id, character_id, sort_order, effect_kind, amount, label
       ) VALUES (7, 1, 3, 'armor_class_bonus', 2, 'Existing bonus');`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    expect(
      lifecycle.database.oneRaw(
        `SELECT id, character_id, sort_order, effect_kind, amount, label
         FROM character_effects WHERE id = 7`,
      ),
    ).toEqual({
      id: 7,
      character_id: 1,
      sort_order: 3,
      effect_kind: 'armor_class_bonus',
      amount: 2,
      label: 'Existing bonus',
    });
    lifecycle.database.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, maximum, label
       ) VALUES (
         1, 4, 'ability_override', 'strength', 24, 'Giant strength'
       )`,
    );
    expect(
      lifecycle.database.scalar(
        `SELECT maximum FROM character_effects
         WHERE effect_kind = 'ability_override'`,
      ),
    ).toBe(24);
    lifecycle.close();
  });

  it('migrates every pre-0022 selected Wizard spell byte-for-row with its logical acquisition provenance', async () => {
    const beforePlannedGrants = DATABASE_MIGRATIONS
      .slice(0, 22)
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(
      `${beforePlannedGrants}
       INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES
         ('class:wizard-migration', 'class', 'legacy-opaque', 'external',
          'wizard'),
         ('spell:one', 'spell', 'legacy-opaque', 'external', 'spell one'),
         ('spell:two', 'spell', 'legacy-opaque', 'external', 'spell two');
       INSERT INTO characters (id, name)
       VALUES (1, 'Historical Wizard');
       INSERT INTO class_definitions (
         id, content_key, name, rules_edition, progression_type
       ) VALUES (
         2, 'class:wizard-migration', 'Wizard', '2024', 'full'
       );
       INSERT INTO character_class_levels (
         id, character_id, class_definition_id, level
       ) VALUES (3, 1, 2, 2);
       INSERT INTO character_source_instances (
         id, character_id, instance_uuid, source_type,
         source_definition_id, display_name, config
       ) VALUES (
         4, 1, 'historical-wizard-source', 'class', 2, 'Wizard 2',
         '{"wizard_spellbook_acquisitions":[
           {"spell_version_id":12},{"spell_version_key":"spell:two"}
         ]}'
       );
       INSERT INTO spell_identities (
         id, content_key, canonical_name, normalized_name
       ) VALUES
         (10, 'identity:one', 'Spell One', 'spell one'),
         (11, 'identity:two', 'Spell Two', 'spell two');
       INSERT INTO spell_versions (
         id, content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES
         (12, 'spell:one', 10, 'Spell One', '2024', 1, 'Abjuration', 1),
         (13, 'spell:two', 11, 'Spell Two', '2024', 1, 'Evocation', 1);
       INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (12, 'Wizard'), (13, 'Wizard');
       INSERT INTO wizard_spellbook_entries (
         id, character_id, spell_version_id, created_at, updated_at
       ) VALUES
         (20, 1, 12, '2030-01-01T00:00:00.000Z',
          '2030-01-02T00:00:00.000Z'),
         (21, 1, 13, '2030-02-01T00:00:00.000Z',
          '2030-02-02T00:00:00.000Z');`,
    );
    const before = openDatabaseImage(
      sqlite3,
      await storage.exportFile(),
    );
    const selectedRowBytes = before.selectArrays(
      `SELECT hex(CAST(json_array(
         id, character_id, spell_version_id, created_at, updated_at
       ) AS BLOB))
       FROM wizard_spellbook_entries ORDER BY id`,
    );
    before.close();

    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();
    expect(
      lifecycle.database.connection.selectArrays(
        `SELECT hex(CAST(json_array(
           id, character_id, spell_version_id, created_at, updated_at
         ) AS BLOB))
         FROM wizard_spellbook_entries
         WHERE spell_version_id IS NOT NULL ORDER BY id`,
      ),
    ).toEqual(selectedRowBytes);
    expect(
      lifecycle.database.allRaw(
        `SELECT id, source_instance_id, rule_key, ordinal,
                acquired_at_class_level, spell_version_id
         FROM wizard_spellbook_entries ORDER BY id`,
      ),
    ).toEqual([
      {
        id: 20,
        source_instance_id: 4,
        rule_key: 'wizard-spellbook',
        ordinal: 1,
        acquired_at_class_level: 1,
        spell_version_id: 12,
      },
      {
        id: 21,
        source_instance_id: 4,
        rule_key: 'wizard-spellbook',
        ordinal: 2,
        acquired_at_class_level: 1,
        spell_version_id: 13,
      },
    ]);
    expect(
      lifecycle.database.scalar(
        `SELECT json_type(config, '$.wizard_spellbook_acquisitions')
         FROM character_source_instances WHERE id = 4`,
      ),
    ).toBeNull();
    lifecycle.close();
  });

  it('adds feat numbers without losing an existing definition', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_FEAT_MODEL}
       INSERT INTO feat_definitions (
         id, content_key, name, rules_edition, category, repeatable,
         prerequisites, grant_rules, notes, created_at, updated_at
       ) VALUES (
         71, 'homebrew:feat:migration', 'Migration Feat', 'expanded',
         'homebrew-group', 1, '{"feature":"Migration Feature"}',
         '[{"kind":"migration-grant"}]', 'Migration notes',
         '2040-01-02T03:04:05.000Z', '2041-02-03T04:05:06.000Z'
       );`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    expect(
      lifecycle.database.oneRaw(
        `SELECT * FROM feat_definitions WHERE id = 71`,
      ),
    ).toEqual({
      id: 71,
      content_key: 'homebrew:feat:migration',
      name: 'Migration Feat',
      rules_edition: 'expanded',
      category: 'homebrew-group',
      min_level: null,
      ability_points: 0,
      ability_increase_abilities: null,
      ability_increase_maximum: null,
      repeatable: 1,
      prerequisites: '{"feature":"Migration Feature"}',
      grant_rules: '[{"kind":"migration-grant"}]',
      notes: 'Migration notes',
      created_at: '2040-01-02T03:04:05.000Z',
      updated_at: '2041-02-03T04:05:06.000Z',
    });
    lifecycle.close();
  });

  it('backfills every template group without inferring custom or ranged-distance rows', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_WEAPON_ATTACK_KIND}
       INSERT INTO characters (id, name) VALUES (1, 'Attack-kind migration');
       INSERT INTO weapon_templates (
         content_key, name, srd_group, damage_kind, damage_dice, damage_type,
         thrown, ammunition, range_kind, range_near_feet, range_far_feet,
         mastery_property
       ) VALUES
         ('test:spear', 'Spear', 'simple_melee', 'dice', '1d6', 'Piercing',
          1, 0, 'ranged', 20, 60, 'Sap'),
         ('test:shortbow', 'Shortbow', 'simple_ranged', 'dice', '1d6',
          'Piercing', 0, 1, 'ranged', 20, 60, 'Vex'),
         ('test:glaive', 'Glaive', 'martial_melee', 'dice', '1d10',
          'Slashing', 0, 0, 'none', NULL, NULL, 'Graze'),
         ('test:longbow', 'Longbow', 'martial_ranged', 'dice', '1d8',
          'Piercing', 0, 1, 'ranged', 150, 600, 'Slow');
       INSERT INTO character_weapons (
         character_id, name, proficiency_category, damage_kind, damage_dice,
         damage_type, finesse, heavy, light, loading, reach, thrown,
         two_handed, ammunition, ammunition_kind, range_kind, range_near_feet,
         range_far_feet, mastery_property, other_properties
       )
       SELECT
         1, name,
         CASE srd_group
           WHEN 'simple_melee' THEN 'simple'
           WHEN 'simple_ranged' THEN 'simple'
           WHEN 'martial_melee' THEN 'martial'
           WHEN 'martial_ranged' THEN 'martial'
         END,
         damage_kind, damage_dice, damage_type, finesse, heavy, light, loading,
         reach, thrown, two_handed, ammunition, ammunition_kind, range_kind,
         range_near_feet, range_far_feet, mastery_property, other_properties
       FROM weapon_templates;
       INSERT INTO character_weapons (
         character_id, name, proficiency_category, damage_kind, damage_dice,
         damage_type, thrown, range_kind, range_near_feet, range_far_feet,
         mastery_property
       ) VALUES (
         1, 'Custom thrown range twin', 'simple', 'dice', '1d6', 'Piercing',
         1, 'ranged', 20, 60, 'Sap'
       );`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT name, attack_kind
         FROM character_weapons
         ORDER BY id`,
      ),
    ).toEqual([
      { name: 'Spear', attack_kind: 'melee' },
      { name: 'Shortbow', attack_kind: 'ranged' },
      { name: 'Glaive', attack_kind: 'melee' },
      { name: 'Longbow', attack_kind: 'ranged' },
      { name: 'Custom thrown range twin', attack_kind: null },
    ]);
    lifecycle.close();
  });

  it('maps all five historical weapon range pairs without losing a value', async () => {
    const storage = await storageHolding(
      `${DATABASE_MIGRATIONS[0]!.sql}
       INSERT INTO characters (id, name) VALUES (1, 'Range migration');
       INSERT INTO character_weapons
         (id, character_id, name, range_normal_feet, range_long_feet)
       VALUES
         (1, 1, 'None', NULL, NULL),
         (2, 1, 'Near only', 20, NULL),
         (3, 1, 'Ordinary', 20, 60),
         (4, 1, 'Long only', NULL, 60),
         (5, 1, 'Inverted', 60, 20);`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT id, range_kind, range_near_feet, range_far_feet
         FROM character_weapons ORDER BY id`,
      ),
    ).toEqual([
      { id: 1, range_kind: 'none', range_near_feet: null, range_far_feet: null },
      { id: 2, range_kind: 'ranged', range_near_feet: 20, range_far_feet: null },
      { id: 3, range_kind: 'ranged', range_near_feet: 20, range_far_feet: 60 },
      { id: 4, range_kind: 'legacy', range_near_feet: null, range_far_feet: 60 },
      { id: 5, range_kind: 'legacy', range_near_feet: 60, range_far_feet: 20 },
    ]);
    lifecycle.close();
  });

  // Measured 2.2-2.9s alone; 20s leaves headroom for full-suite contention.
  it('renders every historical background coin row as its exact GP gear line and round-trips the migrated database', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_COIN_RETIREMENT}\n${HISTORICAL_BACKGROUND_ROWS}`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();

    const expected = [
      { background: 'Acolyte', option: 'a', item_name: '8 GP', item_kind: 'gear' },
      { background: 'Acolyte', option: 'b', item_name: '50 GP', item_kind: 'gear' },
      { background: 'Criminal', option: 'a', item_name: '16 GP', item_kind: 'gear' },
      { background: 'Criminal', option: 'b', item_name: '50 GP', item_kind: 'gear' },
      { background: 'Sage', option: 'a', item_name: '8 GP', item_kind: 'gear' },
      { background: 'Sage', option: 'b', item_name: '50 GP', item_kind: 'gear' },
      { background: 'Soldier', option: 'a', item_name: '14 GP', item_kind: 'gear' },
      { background: 'Soldier', option: 'b', item_name: '50 GP', item_kind: 'gear' },
    ];
    const read = (database: DatabaseContext) =>
      database.allRaw(
        `SELECT template.name AS background, item.option, item.item_name,
                item.item_kind
         FROM background_equipment_items AS item
         JOIN background_templates AS template
           ON template.id = item.background_template_id
         ORDER BY template.id, item.option`,
      );
    expect(read(lifecycle.database)).toEqual(expected);
    expect(
      lifecycle.database.allRaw(
        `SELECT name, equipment_option_b
         FROM background_templates ORDER BY id`,
      ),
    ).toEqual([
      { name: 'Acolyte', equipment_option_b: '50 GP' },
      { name: 'Criminal', equipment_option_b: '50 GP' },
      { name: 'Sage', equipment_option_b: '50 GP' },
      { name: 'Soldier', equipment_option_b: '50 GP' },
    ]);

    const migratedBytes = await lifecycle.exportBytes();
    const imported = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
    );
    imported.open();
    await imported.replace(migratedBytes);
    expect(read(imported.database)).toEqual(expected);
    expect(await imported.exportBytes()).toEqual(migratedBytes);
    imported.close();
    lifecycle.close();
  }, 20_000);

  // Measured 1.8s alone; 20s leaves headroom for full-suite contention.
  it('aborts on an unrenderable historical copper value, naming the row and preserving the image', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_COIN_RETIREMENT}
       ${HISTORICAL_BACKGROUND_ROWS}
       UPDATE background_equipment_items
       SET coin_copper = 5050
       WHERE id = 302;`,
    );
    const before = await storage.exportFile();
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    expect(() => lifecycle.open()).toThrow(
      'background_equipment_items id 302 coin_copper=5050 cannot be rendered as whole GP',
    );
    expect(await storage.exportFile()).toEqual(before);
  }, 20_000);

  it('renders a large whole-GP value without clamping it', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_COIN_RETIREMENT}
       ${HISTORICAL_BACKGROUND_ROWS}
       UPDATE background_equipment_items
       SET coin_copper = 12345678900
       WHERE id = 101;`,
    );
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

    lifecycle.open();

    expect(
      lifecycle.database.scalar(
        'SELECT item_name FROM background_equipment_items WHERE id = 101',
      ),
    ).toBe('123456789 GP');
    lifecycle.close();
  });

  it.each([
    ['range_normal_feet', '100001'],
    ['range_normal_feet', '-1'],
    ['range_normal_feet', '1.5'],
    ['range_long_feet', '100001'],
    ['range_long_feet', '-1'],
    ['range_long_feet', '1.5'],
  ] as const)(
    'refuses historical %s=%s and leaves the image byte-identical',
    async (column, value) => {
      const storage = await storageHolding(
        `${DATABASE_MIGRATIONS[0]!.sql}
         INSERT INTO characters (id, name) VALUES (1, 'Range preflight');
         INSERT INTO character_weapons (id, character_id, name, ${column})
         VALUES (37, 1, 'Outlier', ${value});`,
      );
      const before = await storage.exportFile();
      const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);

      expect(() => lifecycle.open()).toThrow(
        `character_weapons id 37 ${column}=${value}`,
      );

      expect(await storage.exportFile()).toEqual(before);
    },
  );

  it('does not execute migrations for a current image, after proving the probe is live', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const registry = probedRegistry(targetSchema);

    const oldStorage = new ProbedStorage(sqlite3);
    await oldStorage.replaceFile(image(schema));
    const oldLifecycle = new DatabaseLifecycle(
      sqlite3,
      oldStorage,
      targetSchema,
      () => undefined,
      registry,
    );
    oldLifecycle.open();
    expect(oldStorage.migrationExecutions).toBe(1);
    oldLifecycle.close();

    const currentStorage = new ProbedStorage(sqlite3);
    await currentStorage.replaceFile(image(targetSchema));
    const currentLifecycle = new DatabaseLifecycle(
      sqlite3,
      currentStorage,
      targetSchema,
      () => undefined,
      registry,
    );
    currentLifecycle.open();
    expect(currentStorage.migrationExecutions).toBe(0);
    currentLifecycle.close();
  });

  it('does not execute migrations for an empty image', () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const storage = new ProbedStorage(sqlite3);
    const probe = storage.open();
    probe.exec('SELECT migration_probe()');
    probe.close();
    expect(storage.migrationExecutions).toBe(1);
    storage.migrationExecutions = 0;

    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      probedRegistry(targetSchema),
    );

    lifecycle.open();

    expect(storage.migrationExecutions).toBe(0);
    lifecycle.close();
  });

  it('keeps a child row and its reference intact while rebuilding its parent table', async () => {
    const sourceSchema = `${schema}\n${REFERENCED_TABLES}\n`;
    const targetSchema = `${schema}\n${REBUILT_REFERENCED_TABLES}\n`;
    const registry = Object.freeze([
      migration(
        '0000_test_referenced_tables',
        REFERENCED_TABLES,
        schemaChecksum(sourceSchema),
      ),
      migration(
        '0001_test_rebuild_referenced_parent',
        REBUILD_REFERENCED_PARENT,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(
      `${sourceSchema}
       INSERT INTO migration_parent (id, name) VALUES (7, 'Longbow');
       INSERT INTO migration_child (id, parent_id) VALUES (1, 7);`,
    );
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT child.id, child.parent_id, parent.name, parent.rebuilt
         FROM migration_child AS child
         JOIN migration_parent AS parent ON parent.id = child.parent_id`,
      ),
    ).toEqual([{
      id: 1,
      parent_id: 7,
      name: 'Longbow',
      rebuilt: 1,
    }]);
    lifecycle.close();
  });

  it('leaves an unknown signature at schema_mismatch', async () => {
    const storage = await storageHolding(
      `${schema}\nCREATE INDEX unregistered_schema_change ON characters(id);\n`,
    );
    const boot = bootDatabase(
      new DatabaseLifecycle(sqlite3, storage, schema),
    );

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    expect(boot.detail).toBe(
      'Database image schema does not match the application schema.',
    );
  });

  it('rolls a mid-chain failure back to the original signature and bytes', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n${SECOND_INDEX}\n`;
    const registry = Object.freeze([
      migration('0000_test_current', schema, schemaChecksum(schema)),
      migration(
        '0001_test_first',
        FIRST_INDEX,
        schemaChecksum(`${schema}\n${FIRST_INDEX}\n`),
      ),
      migration(
        '0002_test_failure',
        `${SECOND_INDEX}\nSELECT value FROM migration_failure_injected;`,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(schema);
    const original = await storage.exportFile();
    const originalDb = openDatabaseImage(sqlite3, original);
    const originalSignature = databaseSchemaSignature(originalDb);
    originalDb.close();
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );

    expect(() => lifecycle.open()).toThrow('migration_failure_injected');

    const after = await storage.exportFile();
    expect(after).toEqual(original);
    const inspect = openDatabaseImage(sqlite3, after);
    try {
      expect(databaseSchemaSignature(inspect)).toBe(originalSignature);
      expect(
        inspect.selectValue(
          `SELECT count(*) FROM sqlite_schema
           WHERE name IN ('migration_probe_first', 'migration_probe_second')`,
        ),
      ).toBe(0);
    } finally {
      inspect.close();
    }
  });

  it('migrates once and performs no second migration after reopen', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const storage = new ProbedStorage(sqlite3);
    await storage.replaceFile(image(schema));
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      probedRegistry(targetSchema),
    );

    lifecycle.open();
    expect(storage.migrationExecutions).toBe(1);
    lifecycle.reopen();
    expect(storage.migrationExecutions).toBe(1);
    lifecycle.close();
  });

  it('migrates a known-old import while quarantined and exports it stably', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const registry = Object.freeze([
      migration('0000_test_current', schema, schemaChecksum(schema)),
      migration(
        '0001_test_import',
        FIRST_INDEX,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(targetSchema);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );
    lifecycle.open();

    const old = openDatabaseImage(sqlite3, image(schema), {
      readonly: false,
    });
    let oldBytes: Uint8Array;
    try {
      old.exec("INSERT INTO characters (name) VALUES ('Migrated import')");
      oldBytes = sqlite3.capi.sqlite3_js_db_export(old).slice();
    } finally {
      old.close();
    }

    await lifecycle.replace(oldBytes);
    const firstExport = await lifecycle.exportBytes();
    lifecycle.reopen();
    const secondExport = await lifecycle.exportBytes();

    expect(secondExport).toEqual(firstExport);
    expect(
      lifecycle.database.allRaw('SELECT name FROM characters'),
    ).toEqual([{ name: 'Migrated import' }]);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM sqlite_schema
         WHERE type = 'index' AND name = 'migration_probe_first'`,
      ),
    ).toBe(1);
    lifecycle.close();
  });

  it('rejects a checksum mismatch before touching the image', () => {
    const shipped = DATABASE_MIGRATIONS[0]!;
    const corrupted = Object.freeze([
      {
        ...shipped,
        sql: `${shipped.sql}\nSELECT 1;`,
      },
    ]);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
      () => undefined,
      corrupted,
    );

    expect(() => lifecycle.open()).toThrow(
      `Database migration "${shipped.id}" checksum mismatch`,
    );
  });
});
