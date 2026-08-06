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
  applyMigrationSuffix,
  DATABASE_MIGRATIONS,
  databaseSchemaChecksum,
  type DatabaseMigration,
} from '../../../src/db/migrations';
import { sha256 } from '../../../src/crypto/sha256';
import { CHARACTER_SNAPSHOT_SCHEMA_VERSION } from '../../../src/character/character-state';
import { verifyMigrations } from '../../../scripts/verify-migrations';
import { bootDatabase } from '../../../src/worker/boot';
import { applicationSeed } from '../../../src/db/bootstrap';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
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

const CI4B_NEGATIVE_ID_CENSUS_TABLES = [
  'character_effects',
  'character_skill_proficiencies',
  'character_skill_grants',
  'character_skill_expertise_grants',
  'character_level_feat_choices',
  'character_class_levels',
  'spell_loadout_entries',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'character_spell_preferences',
  'character_items',
  'character_source_instances',
  'subclass_feature_effects',
  'subclass_features',
  'subclass_progressions',
  'named_feature_effects',
  'named_features',
  'class_armor_training',
  'class_extra_attack_grants',
  'class_feature_effects',
  'class_martial_arts_dice',
  'class_progressions',
  'class_resource_formulas',
  'class_resources',
  'class_saving_throw_proficiencies',
  'class_sheet_traits',
  'class_skill_options',
  'class_weapon_mastery_counts',
  'class_weapon_mastery_grants',
  'class_weapon_proficiencies',
  'class_equipment_items',
  'background_equipment_items',
  'background_template_effects',
  'species_template_trait_effects',
  'species_template_traits',
  'item_definition_effects',
  'spell_list_memberships',
  'spell_version_attack_modes',
  'spell_version_cantrip_upgrade_levels',
  'spell_version_conditions',
  'spell_version_damage_types',
  'spell_version_publications',
  'spell_version_save_abilities',
  'spell_version_tags',
  'spell_version_upcast_levels',
  'subclass_definitions',
  'class_definitions',
  'feat_definitions',
  'species_definitions',
  'species_templates',
  'background_definitions',
  'background_templates',
  'spell_versions',
  'weapon_templates',
  'armor_templates',
  'item_definitions',
] as const;

let sqlite3: Sqlite3Static;

function expectTriggerRefusal(action: () => void, message: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({
      name: 'SQLite3Error',
      resultCode: 1811,
      message:
        `SQLITE_CONSTRAINT_TRIGGER: sqlite3 result code 1811: ${message}`,
    });
    return;
  }
  throw new Error('Expected SQLite trigger refusal');
}

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

const ASSERTED_CONTENT_KEYS_MIGRATION_COUNT =
  DATABASE_MIGRATIONS.findIndex(
    (entry) => entry.id === '0033_asserted_content_keys',
  ) + 1;
const SCHEMA_AFTER_ASSERTED_CONTENT_KEYS = DATABASE_MIGRATIONS
  .slice(0, ASSERTED_CONTENT_KEYS_MIGRATION_COUNT)
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

function historicalLifecycleThrough0033(
  storage: MemoryDatabaseStorage,
): DatabaseLifecycle {
  return new DatabaseLifecycle(
    sqlite3,
    storage,
    SCHEMA_AFTER_ASSERTED_CONTENT_KEYS,
    () => undefined,
    DATABASE_MIGRATIONS.slice(0, ASSERTED_CONTENT_KEYS_MIGRATION_COUNT),
  );
}

const CI4B_SURVIVOR_CLASS_KEY =
  'expanded:content.v1:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
const CI4B_SURVIVOR_FEAT_KEY =
  'expanded:content.v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const CI4B_THROUGH_0032_FIXTURE = `
INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
) VALUES
  ('2024:class:wizard', 'class', 'legacy-opaque', 'external', 'wizard', '2031-01-01'),
  ('ci4b:discarded-class', 'class', 'legacy-opaque', 'external', 'discarded class', '2031-01-02'),
  ('ci4b:legacy-subclass', 'subclass', 'legacy-opaque', 'external', 'legacy subclass', '2031-01-03'),
  ('ci4b:legacy-feat', 'feat', 'legacy-opaque', 'external', 'legacy feat', '2031-01-04'),
  ('ci4b:legacy-species', 'species', 'legacy-opaque', 'external', 'legacy species', '2031-01-05'),
  ('ci4b:legacy-background', 'background', 'legacy-opaque', 'external', 'legacy background', '2031-01-06'),
  ('2024:acid-splash', 'spell', 'legacy-opaque', 'external', 'acid splash', '2031-01-07'),
  ('ci4b:legacy-weapon', 'weapon', 'legacy-opaque', 'external', 'legacy weapon', '2031-01-08'),
  ('ci4b:legacy-armor', 'armor', 'legacy-opaque', 'external', 'legacy armor', '2031-01-09'),
  ('ci4b:legacy-item', 'item', 'legacy-opaque', 'external', 'legacy item', '2031-01-10'),
  ('${CI4B_SURVIVOR_CLASS_KEY}', 'class', 'derived', 'external', 'survivor class', '2031-01-11'),
  ('${CI4B_SURVIVOR_FEAT_KEY}', 'feat', 'derived', 'external', 'survivor feat', '2031-01-12');

INSERT INTO class_definitions (id, content_key, name, rules_edition, progression_type)
VALUES
  (-101, '2024:class:wizard', 'Wizard', '2024', 'full'),
  (-102, 'ci4b:discarded-class', 'Discarded Class', 'expanded', 'none'),
  (120, '${CI4B_SURVIVOR_CLASS_KEY}', 'Survivor Class', 'expanded', 'none');
INSERT INTO subclass_definitions (
  id, content_key, class_definition_id, name, rules_edition
) VALUES (-103, 'ci4b:legacy-subclass', 120, 'Legacy Subclass', 'expanded');
INSERT INTO feat_definitions (
  id, content_key, name, rules_edition, repeatable
) VALUES
  (-105, 'ci4b:legacy-feat', 'Legacy Feat', 'expanded', 0),
  (103, '${CI4B_SURVIVOR_FEAT_KEY}', 'Survivor Feat', 'expanded', 1);
INSERT INTO species_definitions (id, content_key, name, rules_edition)
VALUES (-106, 'ci4b:legacy-species', 'Legacy Species', 'expanded');
INSERT INTO species_templates (
  id, content_key, rules_edition, name, creature_type, size, base_speed_feet
) VALUES (-107, 'ci4b:legacy-species', 'expanded', 'Legacy Species', 'Humanoid', 'Medium', 30);
INSERT INTO background_definitions (id, content_key, name, rules_edition)
VALUES (-108, 'ci4b:legacy-background', 'Legacy Background', 'expanded');
INSERT INTO background_templates (
  id, content_key, rules_edition, name, ability_score_1, ability_score_2,
  ability_score_3, feat_name, skill_proficiency_1, skill_proficiency_2,
  tool_proficiency, equipment_option_a, equipment_option_b
) VALUES (
  -109, 'ci4b:legacy-background', 'expanded', 'Legacy Background',
  'Strength', 'Dexterity', 'Constitution', 'Legacy Feat', 'Arcana', 'History',
  'Legacy Tools', 'A', 'B'
);
INSERT INTO spell_identities (id, content_key, canonical_name, normalized_name)
VALUES (-110, 'migration:acid-splash', 'Acid Splash', 'acid splash');
INSERT INTO spell_versions (
  id, content_key, spell_identity_id, display_name, rules_edition, level,
  school, provenance
) VALUES (
  -111, '2024:acid-splash', -110, 'Acid Splash', '2024', 0, 'Evocation', 'srd'
);
INSERT INTO weapon_templates (
  id, content_key, rules_edition, name, srd_group, damage_kind, damage_dice,
  damage_type, mastery_property
) VALUES (
  -112, 'ci4b:legacy-weapon', 'expanded', 'Legacy Weapon', 'simple_melee',
  'dice', '1d6', 'Slashing', 'Sap'
);
INSERT INTO armor_templates (
  id, content_key, rules_edition, name, category, armor_class, dex_bonus
) VALUES (-113, 'ci4b:legacy-armor', 'expanded', 'Legacy Armor', 'light', 11, 'full');
INSERT INTO item_definitions (
  id, content_key, rules_edition, name, description, requires_attunement
) VALUES (-114, 'ci4b:legacy-item', 'expanded', 'Legacy Item', 'Debris', 0);

INSERT INTO class_progressions (id, class_definition_id, class_level)
VALUES (-121, -102, 1);
INSERT INTO class_equipment_items (
  id, class_definition_id, option, sort_order, quantity, item_name, item_kind,
  weapon_template_id, armor_template_id
) VALUES
  (-122, -102, 'a', 1, 1, 'Legacy Weapon', 'weapon', -112, NULL),
  (-123, -102, 'a', 2, 1, 'Legacy Armor', 'armor', NULL, -113);
INSERT INTO named_features (
  id, content_key, class_definition_id, name, rules_edition, prerequisite,
  description, class_level
) VALUES (-124, 'ci4b:named-feature', -102, 'Legacy Feature', 'expanded', '', 'Debris', 1);
INSERT INTO named_feature_effects (
  id, named_feature_id, sort_order, effect_kind, damage_type
) VALUES (-125, -124, 1, 'damage_resistance', 'Cold');
INSERT INTO subclass_features (
  id, subclass_definition_id, class_level, sort_order, name, description
) VALUES (-126, -103, 3, 1, 'Legacy Subclass Feature', 'Debris');
INSERT INTO subclass_feature_effects (
  id, subclass_feature_id, sort_order, effect_kind, damage_type, label
) VALUES (-127, -126, 1, 'damage_resistance', 'Fire', 'Legacy ward');
INSERT INTO species_template_traits (
  id, species_template_id, sort_order, name, description
) VALUES (-128, -107, 1, 'Legacy Trait', 'Debris');
INSERT INTO species_template_trait_effects (
  id, species_template_trait_id, sort_order, effect_kind, speed_bonus_feet, label
) VALUES (-129, -128, 1, 'speed', 5, 'Legacy speed');
INSERT INTO background_template_effects (
  id, background_template_id, sort_order, effect_kind, speed_bonus_feet, label
) VALUES (-130, -109, 1, 'speed', 5, 'Legacy pace');
INSERT INTO background_equipment_items (
  id, background_template_id, option, sort_order, quantity, item_name,
  item_kind, weapon_template_id
) VALUES (-131, -109, 'a', 1, 1, 'Legacy Weapon', 'weapon', -112);
INSERT INTO item_definition_effects (
  id, item_definition_id, sort_order, effect_kind, damage_type, label
) VALUES (-132, -114, 1, 'damage_resistance', 'Cold', 'Legacy item ward');
INSERT INTO spell_version_tags (id, spell_version_id, tag)
VALUES (-133, -111, 'acid');
INSERT INTO catalog_content_aliases (
  content_kind, alias_key, content_key, alias_kind
) VALUES ('item', 'ci4b:old-item', 'ci4b:legacy-item', 'declared-legacy');
INSERT INTO catalog_content_fingerprints (
  content_kind, fingerprint_scheme, fingerprint_digest, canonical_json,
  content_key, fingerprint_role
) VALUES (
  'item', 'content-v1',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'ci4b-item-bytes', 'ci4b:legacy-item', 'current'
);
INSERT INTO catalog_content_match_decisions (
  content_kind, incoming_fingerprint_scheme, incoming_fingerprint_digest,
  decision, target_content_key
) VALUES (
  'spell', 'content-v1',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  'match', '2024:acid-splash'
);

INSERT INTO characters (id, name) VALUES (107, 'Disposable links');
INSERT INTO character_source_instances (
  id, character_id, instance_uuid, parent_source_instance_id, source_type,
  source_definition_id, display_name
) VALUES
  (-201, 107, 'ci4b-class-source', NULL, 'class', -101, 'Wizard'),
  (-203, 107, 'ci4b-feat-source', NULL, 'feat', -105, 'Legacy Feat'),
  (-204, 107, 'ci4b-species-source', NULL, 'species', -106, 'Legacy Species'),
  (-205, 107, 'ci4b-background-source', NULL, 'background', -108, 'Legacy Background'),
  (-206, 107, 'ci4b-subclass-source', NULL, 'subclass', -103, 'Legacy Subclass');
INSERT INTO character_effects (
  id, character_id, sort_order, effect_kind, damage_type, source_instance_id, label
) VALUES (-207, 107, 1, 'damage_resistance', 'Cold', -201, 'Active class ward');
INSERT INTO character_skill_grants (
  id, character_id, source_instance_id, grant_key, ordinal, skill, state
) VALUES (-208, 107, -201, 'ci4b-skill', 1, 'arcana', 'active');
INSERT INTO character_skill_proficiencies (id, character_id, skill)
VALUES (-209, 107, 'arcana');
INSERT INTO character_skill_expertise_grants (
  id, character_id, source_instance_id, grant_key, ordinal,
  granted_at_class_level, skill, state
) VALUES (-210, 107, -201, 'ci4b-expertise', 1, 1, 'history', 'active');
INSERT INTO character_class_levels (
  id, character_id, class_definition_id, level
) VALUES (-211, 107, -101, 1);
INSERT INTO spell_loadouts (id, character_id, name)
VALUES (-212, 107, 'Disposable loadout');
INSERT INTO spell_loadout_entries (
  id, spell_loadout_id, spell_version_id, role
) VALUES (-213, -212, -111, 'prepared');
INSERT INTO spell_selection_slots (
  id, character_id, source_instance_id, slot_key, rule_key, bucket,
  eligibility_kind, current_spell_version_id
) VALUES (
  -214, 107, -201, 'ci4b-slot', 'ci4b-rule', 'known',
  'choice_from_list', -111
);
INSERT INTO wizard_spellbook_entries (
  id, character_id, source_instance_id, rule_key, ordinal, spell_version_id
) VALUES (-215, 107, -201, 'ci4b-book', 1, -111);
INSERT INTO character_spell_preferences (
  id, character_id, spell_version_id, favourite
) VALUES (-216, 107, -111, 1);
INSERT INTO character_save_points (
  id, character_id, label, snapshot, schema_version
) VALUES (
  219, 107, 'Before CI-4b', '{"class_definition_id":-101}',
  '${CHARACTER_SNAPSHOT_SCHEMA_VERSION}'
);
INSERT INTO character_operations (
  id, character_id, operation_uuid, expected_revision, resulting_revision,
  inverse_command
) VALUES (
  220, 107, 'ci4b-operation', 0, 1,
  '{"type":"ci4b_restore","source_definition_id":-101}'
);
INSERT INTO characters (id, name) VALUES (108, 'Historical links only');
INSERT INTO character_save_points (
  id, character_id, label, snapshot, schema_version
) VALUES
  (221, 108, 'Legacy id only', '{"source_definition_id":-105}',
   '${CHARACTER_SNAPSHOT_SCHEMA_VERSION}'),
  (223, 108, 'Clean sibling in affected timeline', '{"note":"clean"}',
   '${CHARACTER_SNAPSHOT_SCHEMA_VERSION}');
INSERT INTO character_operations (
  id, character_id, operation_uuid, expected_revision, resulting_revision,
  inverse_command
) VALUES (
  222, 108, 'ci4b-history-only-operation', 0, 1,
  '{"type":"ci4b_restore","content_key":"ci4b:legacy-feat"}'
);`;

const CI4B_AFTER_0033_EDGE_FIXTURE = `
INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name
) VALUES (
  'expanded:ci4b-child', 'subclass', 'asserted', 'external', 'ci4b child'
);
INSERT INTO subclass_definitions (
  id, content_key, class_definition_id, name, rules_edition
) VALUES (-104, 'expanded:ci4b-child', -102, 'Asserted Child', 'expanded');
INSERT INTO subclass_progressions (
  id, subclass_definition_id, class_level
) VALUES (-134, -104, 1);
INSERT INTO character_source_instances (
  id, character_id, instance_uuid, parent_source_instance_id, source_type,
  source_definition_id, display_name
) VALUES (
  -202, 107, 'ci4b-asserted-child-source', -201, 'subclass', -104,
  'Asserted Child'
);
INSERT INTO character_items (
  id, character_id, name, source_instance_id
) VALUES (-217, 107, 'Child-granted item', -202);
INSERT INTO character_attunement_slots (character_id, slot_1_item_id)
VALUES (107, -217);
INSERT INTO character_effects (
  id, character_id, sort_order, effect_kind, speed_bonus_feet,
  character_item_id, label
) VALUES (-218, 107, 2, 'speed', 5, -217, 'Child item speed');
INSERT INTO character_class_levels (
  id, character_id, class_definition_id, subclass_definition_id, level
) VALUES (-219, 107, -102, -104, 2);
INSERT INTO character_level_feat_choices (
  id, character_id, character_class_level_id, class_level, choice_kind,
  feat_source_instance_id
) VALUES (-220, 107, -219, 2, 'asi_level_feat', -203);`;

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
  it('0033 preserves legacy identities before 0034 wipes them and closes the vocabulary', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_ASSERTED_CONTENT_KEYS}
       INSERT INTO item_definitions (
         content_key, rules_edition, name, description, requires_attunement
       ) VALUES (
         'expanded:preserved-belt', 'expanded', 'Preserved Belt', '', 0
       );`,
    );
    const historical = new DatabaseLifecycle(
      sqlite3,
      storage,
      SCHEMA_AFTER_ASSERTED_CONTENT_KEYS,
      () => undefined,
      DATABASE_MIGRATIONS.slice(0, ASSERTED_CONTENT_KEYS_MIGRATION_COUNT),
    );
    historical.open();
    try {
      expect(historical.database.oneRaw(
        `SELECT content_kind, key_kind, catalog_layer
         FROM catalog_content_identities
         WHERE content_key = 'expanded:preserved-belt'`,
      )).toEqual({
        content_kind: 'item',
        key_kind: 'legacy-opaque',
        catalog_layer: 'external',
      });
      expectTriggerRefusal(() => historical.database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (
           'expanded:content.item:new-belt', 'expanded', 'New Belt', '', 0
         )`,
      ),
        'item content key must be registered before insert',
      );
      expectTriggerRefusal(() => historical.database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (
           'fresh-unrecognized-root', 'expanded', 'Fresh Root', '', 0
         )`,
      ),
        'item content key must be registered before insert',
      );
      expect(historical.database.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE content_key = 'fresh-unrecognized-root'
           OR key_kind = 'legacy-opaque'
             AND content_key <> 'expanded:preserved-belt'`,
      )).toBe(0);

      historical.database.exec(
        `INSERT INTO catalog_content_identities (
           content_key, content_kind, key_kind, catalog_layer, normalized_name
         ) VALUES (
           'expanded:content.item:new-belt', 'item', 'asserted', 'external',
           'new belt'
         )`,
      );
      historical.database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description, requires_attunement
         ) VALUES (
           'expanded:content.item:new-belt', 'expanded', 'New Belt', '', 0
         )`,
      );
      expect(historical.database.scalar<number>(
        `SELECT count(*) FROM item_definitions
         WHERE content_key = 'expanded:content.item:new-belt'`,
      )).toBe(1);
    } finally {
      historical.close();
    }

    const current = new DatabaseLifecycle(sqlite3, storage, schema);
    current.open();
    try {
      expect(current.database.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE key_kind = 'legacy-opaque'`,
      )).toBe(0);
      expect(current.database.scalar<number>(
        `SELECT count(*) FROM item_definitions
         WHERE content_key = 'expanded:preserved-belt'`,
      )).toBe(0);
      expect(current.database.scalar<number>(
        `SELECT count(*) FROM item_definitions
         WHERE content_key = 'expanded:content.item:new-belt'`,
      )).toBe(1);
      expect(() => current.database.exec(
        `INSERT INTO catalog_content_identities (
           content_key, content_kind, key_kind, catalog_layer, normalized_name
         ) VALUES (
           'expanded:forbidden-legacy', 'item', 'legacy-opaque', 'external',
           'forbidden legacy'
         )`,
      )).toThrow('catalog_content_identities_key_kind_check');
    } finally {
      current.close();
    }
  });

  it('0034 wipes hand-authored legacy aggregates and next boot reseeds bundled roots under stable keys', async () => {
    const survivorKey =
      'expanded:content.v1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_ASSERTED_CONTENT_KEYS}
       INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer,
         normalized_name, created_at
       ) VALUES
         ('2024:class:wizard', 'class', 'legacy-opaque', 'external',
          'wizard', '2031-01-01T00:00:00.000Z'),
         ('expanded:discarded-class', 'class', 'legacy-opaque', 'external',
          'discarded class', '2031-01-02T00:00:00.000Z'),
         ('2024:acid-splash', 'spell', 'legacy-opaque', 'external',
          'acid splash', '2031-01-03T00:00:00.000Z'),
         ('expanded:orphaned-item', 'item', 'legacy-opaque', 'external',
          'orphaned item', '2031-01-04T00:00:00.000Z'),
         ('${survivorKey}', 'feat', 'derived', 'external',
          'survivor feat', '2031-01-05T00:00:00.000Z');
       INSERT INTO class_definitions (
         id, content_key, name, rules_edition, progression_type
       ) VALUES
         (101, '2024:class:wizard', 'Wizard', '2024', 'full'),
         (102, 'expanded:discarded-class', 'Discarded Class', 'expanded',
          'none');
       INSERT INTO feat_definitions (
         id, content_key, name, rules_edition, repeatable, created_at
       ) VALUES (
         103, '${survivorKey}', 'Survivor Feat', 'expanded', 1,
         '2031-02-01T00:00:00.000Z'
       );
       INSERT INTO item_definitions (
         id, content_key, rules_edition, name, description,
         requires_attunement
       ) VALUES (
         104, 'expanded:orphaned-item', 'expanded', 'Orphaned Item',
         'No item reseeder owns this row.', 0
       );
       INSERT INTO item_definition_effects (
         id, item_definition_id, sort_order, effect_kind, damage_type, label
       ) VALUES (116, 104, 1, 'damage_resistance', 'Cold', 'Discarded ward');
       INSERT INTO class_progressions (
         id, class_definition_id, class_level
       ) VALUES (117, 102, 1);
       INSERT INTO spell_identities (
         id, content_key, canonical_name, normalized_name
       ) VALUES (105, 'migration:acid-splash', 'Acid Splash', 'acid splash');
       INSERT INTO spell_versions (
         id, content_key, spell_identity_id, display_name, rules_edition,
         level, school, provenance
       ) VALUES (
         106, '2024:acid-splash', 105, 'Acid Splash', '2024', 0,
         'Evocation', 'srd'
       );
       INSERT INTO spell_version_tags (spell_version_id, tag)
       VALUES (106, 'acid');
       INSERT INTO catalog_content_aliases (
         content_kind, alias_key, content_key, alias_kind
       ) VALUES (
         'item', 'expanded:old-orphaned-item', 'expanded:orphaned-item',
         'declared-legacy'
       );
       INSERT INTO catalog_content_fingerprints (
         content_kind, fingerprint_scheme, fingerprint_digest,
         canonical_json, content_key, fingerprint_role
       ) VALUES (
         'item', 'content-v1',
         'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
         'hand-authored-item-bytes', 'expanded:orphaned-item', 'current'
       );
       INSERT INTO catalog_content_match_decisions (
         content_kind, incoming_fingerprint_scheme,
         incoming_fingerprint_digest, decision, target_content_key
       ) VALUES (
         'spell', 'content-v1',
         'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
         'match', '2024:acid-splash'
       );
       INSERT INTO characters (id, name) VALUES (107, 'Disposable links');
       INSERT INTO character_source_instances (
         id, character_id, instance_uuid, source_type,
         source_definition_id, display_name
       ) VALUES (
         108, 107, 'ci4b-disposable-source', 'class', 101, 'Wizard'
       );
       INSERT INTO character_class_levels (
         id, character_id, class_definition_id, level
       ) VALUES
         (109, 107, 101, 1),
         (110, 107, 102, 1);
       INSERT INTO spell_loadouts (id, character_id, name)
       VALUES (111, 107, 'Disposable loadout');
       INSERT INTO spell_loadout_entries (
         id, spell_loadout_id, spell_version_id, role
       ) VALUES (112, 111, 106, 'prepared');
       INSERT INTO spell_selection_slots (
         id, character_id, source_instance_id, slot_key, rule_key, bucket,
         eligibility_kind, current_spell_version_id
       ) VALUES (
         113, 107, 108, 'ci4b-slot', 'ci4b-rule', 'known',
         'choice_from_list', 106
       );
       INSERT INTO wizard_spellbook_entries (
         id, character_id, spell_version_id
       ) VALUES (114, 107, 106);
       INSERT INTO character_spell_preferences (
         id, character_id, spell_version_id, favourite
       ) VALUES (115, 107, 106, 1);`,
    );

    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      applicationSeed,
    );
    lifecycle.open();
    try {
      const db = lifecycle.database;
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE key_kind = 'legacy-opaque'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM sqlite_schema
         WHERE sql LIKE '%legacy-opaque%'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE key_kind = 'bundled-stable' AND catalog_layer = 'bundled'`,
      )).toBe(447);
      expect(db.oneRaw(
        `SELECT identity.key_kind, identity.catalog_layer, root.name
         FROM catalog_content_identities AS identity
         JOIN class_definitions AS root
           ON root.content_key = identity.content_key
         WHERE identity.content_key = '2024:class:wizard'`,
      )).toEqual({
        key_kind: 'bundled-stable',
        catalog_layer: 'bundled',
        name: 'Wizard',
      });
      expect(db.oneRaw(
        `SELECT identity.key_kind, identity.catalog_layer, root.display_name
         FROM catalog_content_identities AS identity
         JOIN spell_versions AS root
           ON root.content_key = identity.content_key
         WHERE identity.content_key = '2024:acid-splash'`,
      )).toEqual({
        key_kind: 'bundled-stable',
        catalog_layer: 'bundled',
        display_name: 'Acid Splash',
      });
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE content_key IN (
           'expanded:discarded-class', 'expanded:orphaned-item'
         )`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM class_definitions
         WHERE content_key = 'expanded:discarded-class'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM item_definitions
         WHERE content_key = 'expanded:orphaned-item'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_aliases
         WHERE content_key = 'expanded:orphaned-item'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_fingerprints
         WHERE content_key = 'expanded:orphaned-item'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_match_decisions
         WHERE incoming_fingerprint_digest =
           'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'`,
      )).toBe(0);
      expect(db.scalar<number>(
        'SELECT count(*) FROM class_progressions WHERE id = 117',
      )).toBe(0);
      expect(db.scalar<number>(
        'SELECT count(*) FROM item_definition_effects WHERE id = 116',
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM spell_version_tags
         WHERE spell_version_id = 106 AND tag = 'acid'`,
      )).toBe(0);
      expect(db.oneRaw(
        `SELECT content_key, content_kind, key_kind, catalog_layer,
                normalized_name, created_at
         FROM catalog_content_identities WHERE content_key = ?`,
        [survivorKey],
      )).toEqual({
        content_key: survivorKey,
        content_kind: 'feat',
        key_kind: 'derived',
        catalog_layer: 'external',
        normalized_name: 'survivor feat',
        created_at: '2031-01-05T00:00:00.000Z',
      });
      expect(db.oneRaw(
        `SELECT id, content_key, name, rules_edition, repeatable, created_at
         FROM feat_definitions WHERE content_key = ?`,
        [survivorKey],
      )).toEqual({
        id: 103,
        content_key: survivorKey,
        name: 'Survivor Feat',
        rules_edition: 'expanded',
        repeatable: 1,
        created_at: '2031-02-01T00:00:00.000Z',
      });
      for (const table of [
        'character_class_levels',
        'spell_loadout_entries',
        'spell_selection_slots',
        'wizard_spellbook_entries',
        'character_spell_preferences',
      ]) {
        expect(db.scalar<number>(`SELECT count(*) FROM ${table}`), table).toBe(0);
      }
      expect(() => db.exec(
        `INSERT INTO catalog_content_identities (
           content_key, content_kind, key_kind, catalog_layer, normalized_name
         ) VALUES (
           'expanded:legacy-rejected', 'feat', 'legacy-opaque', 'external',
           'legacy rejected'
         )`,
      )).toThrow('catalog_content_identities_key_kind_check');
      expect(db.scalar<number>('SELECT count(*) FROM pragma_foreign_key_check')).toBe(0);
    } finally {
      lifecycle.close();
    }
  });

  it('0034 closes catalog and polymorphic subtrees and removes affected history before reseeding', async () => {
    const storage = await storageHolding(
      `${SCHEMA_BEFORE_ASSERTED_CONTENT_KEYS}
       ${CI4B_THROUGH_0032_FIXTURE}`,
    );

    // The base image is genuinely through 0032. Apply 0033 alone, then add the
    // one adjudicated mixed-classification edge that only 0033 can represent:
    // an asserted subclass whose parent class is legacy-opaque.
    const through0033 = historicalLifecycleThrough0033(storage);
    through0033.open();
    try {
      through0033.database.exec(CI4B_AFTER_0033_EDGE_FIXTURE);
      expect(through0033.database.oneRaw(
        `SELECT child.content_key, identity.key_kind, parent.content_key AS parent_key
         FROM subclass_definitions AS child
         JOIN catalog_content_identities AS identity
           ON identity.content_key = child.content_key
         JOIN class_definitions AS parent
           ON parent.id = child.class_definition_id
         WHERE child.id = -104`,
      )).toEqual({
        content_key: 'expanded:ci4b-child',
        key_kind: 'asserted',
        parent_key: 'ci4b:discarded-class',
      });
    } finally {
      through0033.close();
    }

    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      applicationSeed,
    );
    lifecycle.open();
    // Reopen from the exported image: the asserted child disappearing is a
    // committed migration result, not an observation made before rollback.
    lifecycle.reopen();
    try {
      const db = lifecycle.database;

      // Every id-bearing table explicitly deleted by 0034 participates in the
      // sentinel census. Bundled reseeding uses positive ids, so it cannot
      // manufacture this expectation from the migration's own output.
      for (const table of CI4B_NEGATIVE_ID_CENSUS_TABLES) {
        expect(
          db.scalar<number>(`SELECT count(*) FROM ${table} WHERE id < 0`),
          table,
        ).toBe(0);
      }
      expect(db.scalar<number>(
        `SELECT count(*) FROM character_save_points
         WHERE id IN (219, 221, 223)`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM character_operations
         WHERE id IN (220, 222)`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_match_decisions
         WHERE incoming_fingerprint_digest =
           'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_aliases
         WHERE alias_key = 'ci4b:old-item'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_fingerprints
         WHERE canonical_json = 'ci4b-item-bytes'`,
      )).toBe(0);
      expect(db.scalar<number>(
        `SELECT count(*) FROM catalog_content_identities
         WHERE key_kind = 'legacy-opaque'
            OR content_key = 'expanded:ci4b-child'`,
      )).toBe(0);

      // character_attunement_slots is updated, not deleted: the sourced item
      // is gone and the existing trigger clears the surviving aggregate slot.
      expect(db.oneRaw(
        `SELECT character_id, slot_1_item_id, slot_2_item_id, slot_3_item_id
         FROM character_attunement_slots WHERE character_id = 107`,
      )).toEqual({
        character_id: 107,
        slot_1_item_id: null,
        slot_2_item_id: null,
        slot_3_item_id: null,
      });

      // A pre-0034 save-point id now reaches the typed not-found refusal. It
      // cannot parse/replay stale raw ids and therefore cannot surface an FK
      // failure after the migration.
      expect(new CharacterCommandExecutor(
        db,
        new CharacterCommandIntegrity('ci4b-migration-test-integrity'),
      ).restoreSavePoint({
        character_id: 108,
        save_point_id: 221,
        expected_revision: 0,
      })).toEqual({
        status: 'refused',
        reason: 'save_point_not_found',
        current_revision: 0,
      });

      expect(db.oneRaw(
        `SELECT identity.key_kind, identity.catalog_layer, root.name
         FROM catalog_content_identities AS identity
         JOIN class_definitions AS root ON root.content_key = identity.content_key
         WHERE identity.content_key = '2024:class:wizard'`,
      )).toEqual({
        key_kind: 'bundled-stable',
        catalog_layer: 'bundled',
        name: 'Wizard',
      });
      expect(db.oneRaw(
        `SELECT id, name FROM class_definitions WHERE content_key = ?`,
        [CI4B_SURVIVOR_CLASS_KEY],
      )).toEqual({ id: 120, name: 'Survivor Class' });
      expect(db.oneRaw(
        `SELECT id, name FROM feat_definitions WHERE content_key = ?`,
        [CI4B_SURVIVOR_FEAT_KEY],
      )).toEqual({ id: 103, name: 'Survivor Feat' });
      expect(db.scalar<number>(
        `SELECT count(*) FROM sqlite_temp_schema
         WHERE name LIKE 'ci4b_%'`,
      )).toBe(0);
      expect(db.scalar<number>(
        'SELECT count(*) FROM pragma_foreign_key_check',
      )).toBe(0);
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
    const lifecycle = historicalLifecycleThrough0033(storage);

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

  it('0036 preserves published identities as active and adds creation archive storage', async () => {
    const beforeCatalogArchive = DATABASE_MIGRATIONS
      .slice(0, DATABASE_MIGRATIONS.findIndex(
        (entry) => entry.id === '0036_catalog_content_archive',
      ))
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(`${beforeCatalogArchive}
      INSERT INTO catalog_content_identities (
        content_key, content_kind, key_kind, catalog_layer, normalized_name,
        created_at
      ) VALUES (
        'expanded:content.feat:preserved', 'feat', 'asserted', 'external',
        'preserved', '2040-01-02T03:04:05.000Z'
      );`);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
    );
    lifecycle.open();
    expect(lifecycle.database.oneRaw(
      `SELECT content_key, content_kind, key_kind, catalog_layer,
              normalized_name, created_at, archived_at
       FROM catalog_content_identities
       WHERE content_key = 'expanded:content.feat:preserved'`,
    )).toEqual({
      content_key: 'expanded:content.feat:preserved',
      content_kind: 'feat',
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: 'preserved',
      created_at: '2040-01-02T03:04:05.000Z',
      archived_at: null,
    });
    lifecycle.database.exec(
      `UPDATE catalog_content_identities
       SET archived_at = '2042-03-04T05:06:07.000Z'
       WHERE content_key = 'expanded:content.feat:preserved'`,
    );
    expect(lifecycle.database.scalar<string>(
      `SELECT archived_at FROM catalog_content_identities
       WHERE content_key = 'expanded:content.feat:preserved'`,
    )).toBe('2042-03-04T05:06:07.000Z');
    lifecycle.close();
  });

  it('Q6 0037 keys exactly one Origin match and leaves no-match or ambiguity NULL', async () => {
    const beforeKeyedBackgroundFeat = DATABASE_MIGRATIONS
      .slice(0, DATABASE_MIGRATIONS.findIndex(
        (entry) => entry.id === '0037_background_default_origin_feat_key',
      ))
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(`${beforeKeyedBackgroundFeat}
      INSERT INTO catalog_content_identities (
        content_key, content_kind, key_kind, catalog_layer, normalized_name
      ) VALUES
        ('expanded:migration.fixture:unique-feat', 'feat', 'asserted', 'external', 'unique feat'),
        ('expanded:migration.fixture:ambiguous-feat-a', 'feat', 'asserted', 'external', 'shared feat'),
        ('expanded:migration.fixture:ambiguous-feat-b', 'feat', 'asserted', 'external', 'shared feat'),
        ('expanded:migration.fixture:same-name-general', 'feat', 'asserted', 'external', 'unique feat general'),
        ('expanded:migration.fixture:unique-background', 'background', 'asserted', 'external', 'unique background'),
        ('expanded:migration.fixture:ambiguous-background', 'background', 'asserted', 'external', 'ambiguous background'),
        ('expanded:migration.fixture:no-match-background', 'background', 'asserted', 'external', 'no match background');
      INSERT INTO feat_definitions (
        content_key, name, rules_edition, category
      ) VALUES
        ('expanded:migration.fixture:unique-feat', 'Unique Feat', 'expanded', 'origin'),
        ('expanded:migration.fixture:same-name-general', 'Unique Feat', 'expanded', 'general'),
        ('expanded:migration.fixture:ambiguous-feat-a', 'Shared Feat', 'expanded', 'origin'),
        ('expanded:migration.fixture:ambiguous-feat-b', 'Shared Feat', 'expanded', 'origin');
      INSERT INTO background_templates (
        id, content_key, rules_edition, name, ability_score_1,
        ability_score_2, ability_score_3, feat_name, skill_proficiency_1,
        skill_proficiency_2, tool_proficiency, equipment_option_a,
        equipment_option_b
      ) VALUES
        (41, 'expanded:migration.fixture:unique-background', 'expanded',
         'Unique Background', 'Strength', 'Dexterity', 'Constitution',
         'Unique Feat', 'Athletics', 'Acrobatics', 'Tools', 'A', 'B'),
        (42, 'expanded:migration.fixture:ambiguous-background', 'expanded',
         'Ambiguous Background', 'Strength', 'Dexterity', 'Constitution',
         'Shared Feat', 'Athletics', 'Acrobatics', 'Tools', 'A', 'B'),
        (43, 'expanded:migration.fixture:no-match-background', 'expanded',
         'No Match Background', 'Strength', 'Dexterity', 'Constitution',
         'Missing Feat', 'Athletics', 'Acrobatics', 'Tools', 'A', 'B');`);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
    );
    lifecycle.open();
    expect(lifecycle.database.allRaw(
      `SELECT id, content_key, default_origin_feat_content_key
       FROM background_templates ORDER BY id`,
    )).toEqual([
      {
        id: 41,
        content_key: 'expanded:migration.fixture:unique-background',
        default_origin_feat_content_key: 'expanded:migration.fixture:unique-feat',
      },
      {
        id: 42,
        content_key: 'expanded:migration.fixture:ambiguous-background',
        default_origin_feat_content_key: null,
      },
      {
        id: 43,
        content_key: 'expanded:migration.fixture:no-match-background',
        default_origin_feat_content_key: null,
      },
    ]);
    lifecycle.close();
  });

  it('CI7 0038 adds same-kind immutable lineage without rewriting catalog roots', async () => {
    const beforeSupersessions = DATABASE_MIGRATIONS
      .slice(0, DATABASE_MIGRATIONS.findIndex(
        (entry) => entry.id === '0038_catalog_content_supersessions',
      ))
      .map((entry) => entry.sql)
      .join('\n');
    const storage = await storageHolding(`${beforeSupersessions}
      INSERT INTO catalog_content_identities (
        content_key, content_kind, key_kind, catalog_layer, normalized_name
      ) VALUES
        ('expanded:migration.fixture:version-one', 'species', 'asserted', 'external', 'version one'),
        ('expanded:migration.fixture:version-two', 'species', 'asserted', 'external', 'version two');`);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
    );
    lifecycle.open();

    expect(lifecycle.database.scalar<number>(
      `SELECT count(*) FROM catalog_content_identities
       WHERE content_key LIKE 'expanded:migration.fixture:version-%'`,
    )).toBe(2);
    lifecycle.database.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key
       ) VALUES ('species', 'expanded:migration.fixture:version-one',
                 'expanded:migration.fixture:version-two')`,
    );
    expect(lifecycle.database.oneRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key
       FROM catalog_content_supersessions`,
    )).toEqual({
      content_kind: 'species',
      superseded_content_key: 'expanded:migration.fixture:version-one',
      successor_content_key: 'expanded:migration.fixture:version-two',
    });
    expect(() => lifecycle.database.exec(
      `DELETE FROM catalog_content_identities
       WHERE content_key = 'expanded:migration.fixture:version-one'`,
    )).toThrow('FOREIGN KEY constraint failed');
    lifecycle.close();
  });

  it('Q4 rejects General background keys and reverse category mutation', () => {
    const database = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      database.exec(schema);
      database.exec(`
        INSERT INTO catalog_content_identities (
          content_key, content_kind, key_kind, catalog_layer, normalized_name
        ) VALUES
          ('expanded:content.feat:origin-feat', 'feat', 'asserted', 'external', 'same named feat origin'),
          ('expanded:content.feat:general-feat', 'feat', 'asserted', 'external', 'same named feat general'),
          ('expanded:content.background:origin-scholar', 'background', 'asserted', 'external', 'origin scholar');
        INSERT INTO feat_definitions (content_key, name, rules_edition, category)
        VALUES
          ('expanded:content.feat:origin-feat', 'Same Named Feat', 'expanded', 'origin'),
          ('expanded:content.feat:general-feat', 'Same Named Feat', 'expanded', 'general');
      `);
      const templateInsert = (key: string) => database.exec(`
        INSERT INTO background_templates (
          content_key, rules_edition, name, ability_score_1, ability_score_2,
          ability_score_3, feat_name, default_origin_feat_content_key,
          skill_proficiency_1, skill_proficiency_2, tool_proficiency,
          equipment_option_a, equipment_option_b
        ) VALUES (
          'expanded:content.background:origin-scholar', 'expanded', 'Origin Scholar',
          'Strength', 'Dexterity', 'Constitution', 'Same Named Feat', '${key}',
          'Athletics', 'Acrobatics', 'Tools', 'A', 'B'
        )
      `);
      expectTriggerRefusal(
        () => templateInsert('expanded:content.feat:general-feat'),
        'background default Origin feat key must name an installed Origin feat',
      );
      templateInsert('expanded:content.feat:origin-feat');
      expectTriggerRefusal(
        () => database.exec(`
          UPDATE background_templates
          SET default_origin_feat_content_key = 'expanded:content.feat:general-feat'
          WHERE content_key = 'expanded:content.background:origin-scholar'
        `),
        'background default Origin feat key must name an installed Origin feat',
      );
      expect(database.selectValue(
        `SELECT default_origin_feat_content_key FROM background_templates
         WHERE content_key = 'expanded:content.background:origin-scholar'`,
      )).toBe('expanded:content.feat:origin-feat');
      expectTriggerRefusal(
        () => database.exec(`
          UPDATE feat_definitions
          SET category = 'general'
          WHERE content_key = 'expanded:content.feat:origin-feat'
        `),
        'referenced background default feat must remain an Origin feat',
      );
      expect(database.selectValue(
        `SELECT category FROM feat_definitions
         WHERE content_key = 'expanded:content.feat:origin-feat'`,
      )).toBe('origin');
    } finally {
      database.close();
    }
  });

  it('Q5 explicitly replaying 0037 preserves populated background data', () => {
    const database = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      database.exec(schema);
      database.exec(`
        INSERT INTO catalog_content_identities (
          content_key, content_kind, key_kind, catalog_layer, normalized_name
        ) VALUES
          ('expanded:content.feat:replay-feat', 'feat', 'asserted', 'external', 'replay feat'),
          ('expanded:content.background:replay-background', 'background', 'asserted', 'external', 'replay background');
        INSERT INTO feat_definitions (content_key, name, rules_edition, category)
        VALUES ('expanded:content.feat:replay-feat', 'Replay Feat', 'expanded', 'origin');
        INSERT INTO background_templates (
          id, content_key, rules_edition, name, ability_score_1, ability_score_2,
          ability_score_3, feat_name, default_origin_feat_content_key,
          skill_proficiency_1, skill_proficiency_2, tool_proficiency,
          equipment_option_a, equipment_option_b
        ) VALUES (
          901, 'expanded:content.background:replay-background', 'expanded', 'Replay Background',
          'Strength', 'Dexterity', 'Constitution', 'Authored Replay Feat',
          'expanded:content.feat:replay-feat', 'Athletics', 'Acrobatics', 'Tools', 'A', 'B'
        );
        INSERT INTO background_equipment_items (
          background_template_id, option, sort_order, quantity, item_name, item_kind
        ) VALUES (901, 'a', 1, 3, 'Preserved chalk', 'gear');
      `);
      const migration0037 = DATABASE_MIGRATIONS.find(
        (entry) => entry.id === '0037_background_default_origin_feat_key',
      );
      if (migration0037 === undefined) throw new Error('0037 is not registered.');
      const signature = databaseSchemaSignature(database);

      applyMigrationSuffix(
        database,
        [migration0037],
        0,
        signature,
        databaseSchemaSignature,
      );

      expect(database.selectObject(`
        SELECT template.feat_name, template.default_origin_feat_content_key,
               item.quantity, item.item_name
        FROM background_templates AS template
        JOIN background_equipment_items AS item
          ON item.background_template_id = template.id
        WHERE template.id = 901
      `)).toEqual({
        feat_name: 'Authored Replay Feat',
        default_origin_feat_content_key: 'expanded:content.feat:replay-feat',
        quantity: 3,
        item_name: 'Preserved chalk',
      });
      expect(databaseSchemaSignature(database)).toBe(signature);
    } finally {
      database.close();
    }
  });

  it('defaults migration replay policy off and executes a matching-schema migration', () => {
    const database = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      database.exec(`
        CREATE TABLE replay_policy_probe (
          id INTEGER PRIMARY KEY,
          note TEXT NOT NULL
        );
      `);
      const signature = databaseSchemaSignature(database);
      const ordinaryMigration = migration(
        'ordinary_replay_policy_probe',
        "INSERT INTO replay_policy_probe (id, note) VALUES (1, 'executed')",
        databaseSchemaChecksum(signature),
      );

      applyMigrationSuffix(
        database,
        [ordinaryMigration],
        0,
        signature,
        databaseSchemaSignature,
      );

      expect(ordinaryMigration.replayPolicy).toBeUndefined();
      expect(database.selectObject(
        'SELECT id, note FROM replay_policy_probe',
      )).toEqual({ id: 1, note: 'executed' });
    } finally {
      database.close();
    }
  });

  it('uses the archive-list indexes for character and creation lifecycle orderings', () => {
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
      expect(db.selectObjects(
        `EXPLAIN QUERY PLAN
         SELECT content_key FROM catalog_content_identities
         WHERE archived_at IS NULL
         ORDER BY archived_at DESC, content_kind, normalized_name, content_key`,
      )).toEqual([
        expect.objectContaining({
          detail:
            'SEARCH catalog_content_identities USING COVERING INDEX catalog_content_identities_archive_list_index (archived_at=?)',
        }),
      ]);
      expect(db.selectObjects(
        `EXPLAIN QUERY PLAN
         SELECT content_key FROM catalog_content_identities
         WHERE archived_at IS NOT NULL
         ORDER BY archived_at DESC, content_kind, normalized_name, content_key`,
      )).toEqual([
        expect.objectContaining({
          detail:
            'SEARCH catalog_content_identities USING COVERING INDEX catalog_content_identities_archive_list_index (archived_at>?)',
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
    const lifecycle = historicalLifecycleThrough0033(storage);
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

    const lifecycle = historicalLifecycleThrough0033(storage);
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

    const lifecycle = historicalLifecycleThrough0033(storage);
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

    const lifecycle = historicalLifecycleThrough0033(storage);
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
    const lifecycle = historicalLifecycleThrough0033(storage);

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
    const lifecycle = historicalLifecycleThrough0033(storage);
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

    const lifecycle = historicalLifecycleThrough0033(storage);
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
    const lifecycle = historicalLifecycleThrough0033(storage);
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
    const lifecycle = historicalLifecycleThrough0033(storage);
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
    const imported = historicalLifecycleThrough0033(
      new MemoryDatabaseStorage(sqlite3),
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
    const lifecycle = historicalLifecycleThrough0033(storage);

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
