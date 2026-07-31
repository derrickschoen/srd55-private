PRAGMA foreign_keys=OFF;

CREATE TABLE `catalog_content_identities` (
	`content_key` VARCHAR PRIMARY KEY NOT NULL,
	`content_kind` VARCHAR NOT NULL,
	`key_kind` VARCHAR NOT NULL,
	`catalog_layer` VARCHAR NOT NULL,
	`normalized_name` VARCHAR NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "catalog_content_identities_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_identities_key_kind_check" CHECK("catalog_content_identities"."key_kind" IN ('derived', 'bundled-stable', 'legacy-opaque')),
	CONSTRAINT "catalog_content_identities_catalog_layer_check" CHECK("catalog_content_identities"."catalog_layer" IN ('bundled', 'external')),
	CONSTRAINT "catalog_content_identities_normalized_name_check" CHECK(length("catalog_content_identities"."normalized_name") > 0),
	CONSTRAINT "catalog_content_identities_key_layer_check" CHECK((
        ("catalog_content_identities"."key_kind" = 'derived'
          AND "catalog_content_identities"."catalog_layer" = 'external'
          AND instr("catalog_content_identities"."content_key", ':content.v1:') > 1
          AND substr(
            "catalog_content_identities"."content_key",
            1,
            instr("catalog_content_identities"."content_key", ':content.v1:') - 1
          ) NOT GLOB '*[^a-z0-9-]*'
          AND substr("catalog_content_identities"."content_key", 1, 1) <> '-'
          AND substr(
            "catalog_content_identities"."content_key",
            instr("catalog_content_identities"."content_key", ':content.v1:') - 1,
            1
          ) <> '-'
          AND instr(
            substr(
              "catalog_content_identities"."content_key",
              1,
              instr("catalog_content_identities"."content_key", ':content.v1:') - 1
            ),
            '--'
          ) = 0
          AND length(substr(
            "catalog_content_identities"."content_key",
            instr("catalog_content_identities"."content_key", ':content.v1:') + 12
          )) = 64
          AND substr(
            "catalog_content_identities"."content_key",
            instr("catalog_content_identities"."content_key", ':content.v1:') + 12
          ) NOT GLOB '*[^0-9a-f]*')
        OR ("catalog_content_identities"."key_kind" = 'bundled-stable'
          AND "catalog_content_identities"."catalog_layer" = 'bundled')
        OR ("catalog_content_identities"."key_kind" = 'legacy-opaque'
          AND "catalog_content_identities"."catalog_layer" = 'external')
      ))
);

CREATE UNIQUE INDEX `catalog_content_identities_kind_key_unique` ON `catalog_content_identities` (`content_kind`,`content_key`);
CREATE INDEX `catalog_content_identities_layer_kind_index` ON `catalog_content_identities` (`catalog_layer`,`content_kind`);
CREATE INDEX `catalog_content_identities_name_index` ON `catalog_content_identities` (`content_kind`,`normalized_name`);
CREATE TABLE `catalog_content_fingerprints` (
	`content_kind` VARCHAR NOT NULL,
	`fingerprint_scheme` VARCHAR NOT NULL,
	`fingerprint_digest` VARCHAR NOT NULL,
	`canonical_json` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`fingerprint_role` VARCHAR NOT NULL,
	PRIMARY KEY(`content_kind`, `fingerprint_scheme`, `fingerprint_digest`, `content_key`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_fingerprints_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_fingerprints_scheme_check" CHECK("catalog_content_fingerprints"."fingerprint_scheme" IN ('content-v1')),
	CONSTRAINT "catalog_content_fingerprints_digest_check" CHECK(length("catalog_content_fingerprints"."fingerprint_digest") = 64
        AND "catalog_content_fingerprints"."fingerprint_digest" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "catalog_content_fingerprints_role_check" CHECK("catalog_content_fingerprints"."fingerprint_role"
        IN ('current', 'compatible', 'bundled-historical'))
);

CREATE UNIQUE INDEX `catalog_content_fingerprints_current_scheme_unique` ON `catalog_content_fingerprints` (`content_key`,`fingerprint_scheme`) WHERE "catalog_content_fingerprints"."fingerprint_role" = 'current';
CREATE INDEX `catalog_content_fingerprints_resolution_index` ON `catalog_content_fingerprints` (`content_kind`,`fingerprint_scheme`,`fingerprint_digest`);
CREATE TABLE `catalog_content_aliases` (
	`content_kind` VARCHAR NOT NULL,
	`alias_key` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`alias_kind` VARCHAR NOT NULL,
	PRIMARY KEY(`content_kind`, `alias_key`, `content_key`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_aliases_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_aliases_alias_kind_check" CHECK("catalog_content_aliases"."alias_kind"
        IN ('declared-legacy', 'rekeyed-primary', 'bundled-legacy'))
);

CREATE INDEX `catalog_content_aliases_resolution_index` ON `catalog_content_aliases` (`content_kind`,`alias_key`);
CREATE TABLE `catalog_content_match_decisions` (
	`content_kind` VARCHAR NOT NULL,
	`incoming_fingerprint_scheme` VARCHAR NOT NULL,
	`incoming_fingerprint_digest` VARCHAR NOT NULL,
	`decision` VARCHAR NOT NULL,
	`target_content_key` VARCHAR NOT NULL,
	`reviewed_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `incoming_fingerprint_scheme`, `incoming_fingerprint_digest`),
	FOREIGN KEY (`content_kind`,`target_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "catalog_content_match_decisions_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_match_decisions_scheme_check" CHECK("catalog_content_match_decisions"."incoming_fingerprint_scheme" IN ('content-v1')),
	CONSTRAINT "catalog_content_match_decisions_digest_check" CHECK(length("catalog_content_match_decisions"."incoming_fingerprint_digest") = 64
        AND "catalog_content_match_decisions"."incoming_fingerprint_digest" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "catalog_content_match_decisions_decision_check" CHECK("catalog_content_match_decisions"."decision" IN ('match', 'clone'))
);

-- SQL can register the keys already present, but cannot run the semantic
-- TypeScript projectors or safely classify provenance. Every pre-0020 root is
-- therefore external + legacy-opaque until CI-4b performs the checked
-- bundled/external classification and semantic rekey.
INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'class', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM class_definitions;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'subclass', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM subclass_definitions;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'feat', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM feat_definitions;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'species', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM species_definitions;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'background', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM background_definitions;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT version.content_key, 'spell', 'legacy-opaque', 'external',
       identity.normalized_name,
       COALESCE(version.created_at, CURRENT_TIMESTAMP)
FROM spell_versions AS version
JOIN spell_identities AS identity ON identity.id = version.spell_identity_id;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'species', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM species_templates AS template
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_content_identities AS identity
  WHERE identity.content_key = template.content_key
    AND identity.content_kind = 'species'
);

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'background', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM background_templates AS template
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_content_identities AS identity
  WHERE identity.content_key = template.content_key
    AND identity.content_kind = 'background'
);

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'armor', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM armor_templates;

INSERT INTO catalog_content_identities (
  content_key, content_kind, key_kind, catalog_layer, normalized_name, created_at
)
SELECT content_key, 'weapon', 'legacy-opaque', 'external', lower(name),
       COALESCE(created_at, CURRENT_TIMESTAMP)
FROM weapon_templates;

CREATE TABLE `__new_class_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`spellcasting_ability` VARCHAR,
	`progression_type` VARCHAR DEFAULT 'none' NOT NULL,
	`caster_fraction` VARCHAR,
	`caster_rounding` VARCHAR,
	`prepares_or_knows` VARCHAR,
	`supports_ritual_casting` TINYINT(1) DEFAULT false NOT NULL,
	`ritual_casting_mode` VARCHAR,
	`primary_ability_expression` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "class_definitions_progression_type_check" CHECK(`progression_type` IN ('full', 'half_up', 'half_down', 'third_up', 'third_down', 'pact', 'none')),
	CONSTRAINT "class_definitions_spellcasting_ability_check" CHECK((`spellcasting_ability` IS NULL OR `spellcasting_ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')))
);

INSERT INTO `__new_class_definitions`("id", "content_key", "name", "rules_edition", "spellcasting_ability", "progression_type", "caster_fraction", "caster_rounding", "prepares_or_knows", "supports_ritual_casting", "ritual_casting_mode", "primary_ability_expression", "notes", "created_at", "updated_at") SELECT "id", "content_key", "name", "rules_edition", "spellcasting_ability", "progression_type", "caster_fraction", "caster_rounding", "prepares_or_knows", "supports_ritual_casting", "ritual_casting_mode", "primary_ability_expression", "notes", "created_at", "updated_at" FROM `class_definitions`;
DROP TABLE `class_definitions`;
ALTER TABLE `__new_class_definitions` RENAME TO `class_definitions`;
CREATE UNIQUE INDEX `class_definitions_content_key_unique` ON `class_definitions` (`content_key`);
CREATE INDEX `class_definitions_name_rules_edition_index` ON `class_definitions` (`name`,`rules_edition`);
CREATE TABLE `__new_subclass_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`class_definition_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`spellcasting_ability` VARCHAR,
	`caster_fraction` VARCHAR,
	`caster_rounding` VARCHAR,
	`grant_rules` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_subclass_definitions`("id", "content_key", "class_definition_id", "name", "rules_edition", "spellcasting_ability", "caster_fraction", "caster_rounding", "grant_rules", "created_at", "updated_at") SELECT "id", "content_key", "class_definition_id", "name", "rules_edition", "spellcasting_ability", "caster_fraction", "caster_rounding", "grant_rules", "created_at", "updated_at" FROM `subclass_definitions`;
DROP TABLE `subclass_definitions`;
ALTER TABLE `__new_subclass_definitions` RENAME TO `subclass_definitions`;
CREATE UNIQUE INDEX `subclass_definitions_content_key_unique` ON `subclass_definitions` (`content_key`);
CREATE INDEX `subclass_definitions_class_definition_id_name_rules_edition_index` ON `subclass_definitions` (`class_definition_id`,`name`,`rules_edition`);
CREATE UNIQUE INDEX `subclass_definitions_id_class_definition_id_unique` ON `subclass_definitions` (`id`,`class_definition_id`);
CREATE TABLE `__new_feat_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`min_level` integer,
	`ability_points` integer DEFAULT 0 NOT NULL,
	`repeatable` TINYINT(1) DEFAULT false NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "feat_definitions_min_level_check" CHECK(`min_level` IS NULL OR (typeof(`min_level`) = 'integer' AND `min_level` BETWEEN 1 AND 20)),
	CONSTRAINT "feat_definitions_ability_points_check" CHECK(typeof(`ability_points`) = 'integer' AND `ability_points` IN (0, 1, 2))
);

INSERT INTO `__new_feat_definitions`("id", "content_key", "name", "rules_edition", "category", "min_level", "ability_points", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at") SELECT "id", "content_key", "name", "rules_edition", "category", "min_level", "ability_points", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at" FROM `feat_definitions`;
DROP TABLE `feat_definitions`;
ALTER TABLE `__new_feat_definitions` RENAME TO `feat_definitions`;
CREATE UNIQUE INDEX `feat_definitions_content_key_unique` ON `feat_definitions` (`content_key`);
CREATE INDEX `feat_definitions_name_rules_edition_index` ON `feat_definitions` (`name`,`rules_edition`);
CREATE TABLE `__new_species_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`repeatable` TINYINT(1) DEFAULT false NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `__new_species_definitions`("id", "content_key", "name", "rules_edition", "category", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at") SELECT "id", "content_key", "name", "rules_edition", "category", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at" FROM `species_definitions`;
DROP TABLE `species_definitions`;
ALTER TABLE `__new_species_definitions` RENAME TO `species_definitions`;
CREATE UNIQUE INDEX `species_definitions_content_key_unique` ON `species_definitions` (`content_key`);
CREATE INDEX `species_definitions_name_rules_edition_index` ON `species_definitions` (`name`,`rules_edition`);
CREATE TABLE `__new_background_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`repeatable` TINYINT(1) DEFAULT false NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action
);

INSERT INTO `__new_background_definitions`("id", "content_key", "name", "rules_edition", "category", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at") SELECT "id", "content_key", "name", "rules_edition", "category", "repeatable", "prerequisites", "grant_rules", "notes", "created_at", "updated_at" FROM `background_definitions`;
DROP TABLE `background_definitions`;
ALTER TABLE `__new_background_definitions` RENAME TO `background_definitions`;
CREATE UNIQUE INDEX `background_definitions_content_key_unique` ON `background_definitions` (`content_key`);
CREATE INDEX `background_definitions_name_rules_edition_index` ON `background_definitions` (`name`,`rules_edition`);
CREATE TABLE `__new_spell_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`spell_identity_id` integer NOT NULL,
	`display_name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`level` integer NOT NULL,
	`school` VARCHAR NOT NULL,
	`ritual` TINYINT(1) DEFAULT false NOT NULL,
	`concentration` TINYINT(1) DEFAULT false NOT NULL,
	`casting_time` VARCHAR,
	`action_type` VARCHAR,
	`range` VARCHAR,
	`range_kind` VARCHAR,
	`range_feet` integer,
	`area_shape` VARCHAR,
	`area_feet` integer,
	`duration` VARCHAR,
	`components` VARCHAR,
	`material_component_summary` TEXT,
	`material_cost_copper` integer,
	`material_cost_kind` VARCHAR,
	`healing` TINYINT(1) DEFAULT false NOT NULL,
	`short_summary` TEXT,
	`upcast_summary` TEXT,
	`cantrip_upgrade_summary` TEXT,
	`requires_mod_for_effect` TINYINT(1) DEFAULT false NOT NULL,
	`effect_reliability_category` VARCHAR DEFAULT 'fixed_effect' NOT NULL,
	`provenance` VARCHAR DEFAULT 'import' NOT NULL,
	`seed_version` VARCHAR,
	`is_active` TINYINT(1) DEFAULT true NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	`forked_from_content_key` VARCHAR,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spell_identity_id`) REFERENCES `spell_identities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "spell_versions_level_check" CHECK(provenance IS 'placeholder' OR level BETWEEN 0 AND 9),
	CONSTRAINT "spell_versions_effect_reliability_category_check" CHECK(`effect_reliability_category` IN ('attack_roll', 'saving_throw', 'fixed_effect', 'modifier_scaled', 'ritual_utility', 'mixed')),
	CONSTRAINT "spell_versions_range_kind_check" CHECK((`range_kind` IS NULL OR `range_kind` IN ('self', 'touch', 'ranged', 'sight', 'unlimited', 'special'))),
	CONSTRAINT "spell_versions_range_feet_check" CHECK((`range_feet` IS NULL OR (typeof(`range_feet`) = 'integer' AND `range_feet` >= 0))
        AND (`range_feet` IS NULL OR `range_kind` IS 'ranged')),
	CONSTRAINT "spell_versions_area_shape_check" CHECK((`area_shape` IS NULL OR `area_shape` IN ('sphere', 'cylinder', 'cone', 'line'))),
	CONSTRAINT "spell_versions_area_check" CHECK((`area_feet` IS NULL OR (typeof(`area_feet`) = 'integer' AND `area_feet` >= 1))
        AND ((`area_shape` IS NULL) = (`area_feet` IS NULL))),
	CONSTRAINT "spell_versions_material_cost_check" CHECK((`material_cost_copper` IS NULL OR (typeof(`material_cost_copper`) = 'integer' AND `material_cost_copper` >= 0))
        AND (`material_cost_kind` IS NULL OR `material_cost_kind` IN ('exact', 'minimum'))
        AND ((`material_cost_copper` IS NULL) = (`material_cost_kind` IS NULL)))
);

INSERT INTO `__new_spell_versions`("id", "content_key", "spell_identity_id", "display_name", "rules_edition", "level", "school", "ritual", "concentration", "casting_time", "action_type", "range", "range_kind", "range_feet", "area_shape", "area_feet", "duration", "components", "material_component_summary", "material_cost_copper", "material_cost_kind", "healing", "short_summary", "upcast_summary", "cantrip_upgrade_summary", "requires_mod_for_effect", "effect_reliability_category", "provenance", "seed_version", "is_active", "created_at", "updated_at", "forked_from_content_key") SELECT "id", "content_key", "spell_identity_id", "display_name", "rules_edition", "level", "school", "ritual", "concentration", "casting_time", "action_type", "range", "range_kind", "range_feet", "area_shape", "area_feet", "duration", "components", "material_component_summary", "material_cost_copper", "material_cost_kind", "healing", "short_summary", "upcast_summary", "cantrip_upgrade_summary", "requires_mod_for_effect", "effect_reliability_category", "provenance", "seed_version", "is_active", "created_at", "updated_at", "forked_from_content_key" FROM `spell_versions`;
DROP TABLE `spell_versions`;
ALTER TABLE `__new_spell_versions` RENAME TO `spell_versions`;
CREATE UNIQUE INDEX `spell_versions_content_key_unique` ON `spell_versions` (`content_key`);
CREATE INDEX `spell_versions_spell_identity_id_rules_edition_index` ON `spell_versions` (`spell_identity_id`,`rules_edition`);
CREATE INDEX `spell_versions_rules_edition_level_index` ON `spell_versions` (`rules_edition`,`level`);
CREATE INDEX `spell_versions_is_active_index` ON `spell_versions` (`is_active`);
CREATE TABLE `__new_species_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`creature_type` VARCHAR NOT NULL,
	`size` VARCHAR NOT NULL,
	`alternate_size` VARCHAR,
	`base_speed_feet` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "species_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded')),
	CONSTRAINT "species_templates_creature_type_check" CHECK(`creature_type` IN ('Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead')),
	CONSTRAINT "species_templates_size_check" CHECK(`size` IN ('Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan')),
	CONSTRAINT "species_templates_alternate_size_check" CHECK((`alternate_size` IS NULL OR `alternate_size` IN ('Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'))),
	CONSTRAINT "species_templates_base_speed_check" CHECK(typeof(`base_speed_feet`) = 'integer' AND `base_speed_feet` >= 1)
);

INSERT INTO `__new_species_templates`("id", "content_key", "rules_edition", "name", "creature_type", "size", "alternate_size", "base_speed_feet", "created_at", "updated_at") SELECT "id", "content_key", "rules_edition", "name", "creature_type", "size", "alternate_size", "base_speed_feet", "created_at", "updated_at" FROM `species_templates`;
DROP TABLE `species_templates`;
ALTER TABLE `__new_species_templates` RENAME TO `species_templates`;
CREATE UNIQUE INDEX `species_templates_content_key_unique` ON `species_templates` (`content_key`);
CREATE INDEX `species_templates_name_rules_edition_index` ON `species_templates` (`name`,`rules_edition`);
CREATE TABLE `__new_background_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`ability_score_1` VARCHAR NOT NULL,
	`ability_score_2` VARCHAR NOT NULL,
	`ability_score_3` VARCHAR NOT NULL,
	`feat_name` VARCHAR NOT NULL,
	`skill_proficiency_1` VARCHAR NOT NULL,
	`skill_proficiency_2` VARCHAR NOT NULL,
	`tool_proficiency` VARCHAR NOT NULL,
	`equipment_option_a` TEXT NOT NULL,
	`equipment_option_b` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "background_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

INSERT INTO `__new_background_templates`("id", "content_key", "rules_edition", "name", "ability_score_1", "ability_score_2", "ability_score_3", "feat_name", "skill_proficiency_1", "skill_proficiency_2", "tool_proficiency", "equipment_option_a", "equipment_option_b", "created_at", "updated_at") SELECT "id", "content_key", "rules_edition", "name", "ability_score_1", "ability_score_2", "ability_score_3", "feat_name", "skill_proficiency_1", "skill_proficiency_2", "tool_proficiency", "equipment_option_a", "equipment_option_b", "created_at", "updated_at" FROM `background_templates`;
DROP TABLE `background_templates`;
ALTER TABLE `__new_background_templates` RENAME TO `background_templates`;
CREATE UNIQUE INDEX `background_templates_content_key_unique` ON `background_templates` (`content_key`);
CREATE INDEX `background_templates_name_rules_edition_index` ON `background_templates` (`name`,`rules_edition`);
CREATE TABLE `__new_armor_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`category` VARCHAR NOT NULL,
	`armor_class` integer NOT NULL,
	`dex_bonus` VARCHAR NOT NULL,
	`dex_bonus_max` integer,
	`strength_requirement` integer,
	`stealth_disadvantage` TINYINT(1) DEFAULT false NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "armor_templates_category_check" CHECK(`category` IN ('light', 'medium', 'heavy', 'shield')),
	CONSTRAINT "armor_templates_dex_bonus_check" CHECK(`dex_bonus` IN ('full', 'capped', 'none')),
	CONSTRAINT "armor_templates_dex_bonus_max_check" CHECK((`dex_bonus` = 'capped') = (`dex_bonus_max` IS NOT NULL) AND (`dex_bonus_max` IS NULL OR (typeof(`dex_bonus_max`) = 'integer' AND `dex_bonus_max` >= 0))),
	CONSTRAINT "armor_templates_shield_check" CHECK(`category` <> 'shield' OR `dex_bonus` = 'none'),
	CONSTRAINT "armor_templates_armor_class_check" CHECK(typeof(`armor_class`) = 'integer' AND `armor_class` >= 1),
	CONSTRAINT "armor_templates_strength_requirement_check" CHECK((`strength_requirement` IS NULL OR (typeof(`strength_requirement`) = 'integer' AND `strength_requirement` >= 1))),
	CONSTRAINT "armor_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

INSERT INTO `__new_armor_templates`("id", "content_key", "rules_edition", "name", "category", "armor_class", "dex_bonus", "dex_bonus_max", "strength_requirement", "stealth_disadvantage", "created_at", "updated_at") SELECT "id", "content_key", "rules_edition", "name", "category", "armor_class", "dex_bonus", "dex_bonus_max", "strength_requirement", "stealth_disadvantage", "created_at", "updated_at" FROM `armor_templates`;
DROP TABLE `armor_templates`;
ALTER TABLE `__new_armor_templates` RENAME TO `armor_templates`;
CREATE UNIQUE INDEX `armor_templates_content_key_unique` ON `armor_templates` (`content_key`);
CREATE TABLE `__new_weapon_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`srd_group` VARCHAR NOT NULL,
	`damage_kind` VARCHAR NOT NULL,
	`damage_dice` VARCHAR,
	`damage_flat` integer,
	`damage_custom` VARCHAR,
	`damage_type` VARCHAR NOT NULL,
	`versatile_damage_kind` VARCHAR DEFAULT 'not_applicable' NOT NULL,
	`versatile_damage_dice` VARCHAR,
	`versatile_damage_flat` integer,
	`versatile_damage_custom` VARCHAR,
	`finesse` TINYINT(1) DEFAULT false NOT NULL,
	`heavy` TINYINT(1) DEFAULT false NOT NULL,
	`light` TINYINT(1) DEFAULT false NOT NULL,
	`loading` TINYINT(1) DEFAULT false NOT NULL,
	`reach` TINYINT(1) DEFAULT false NOT NULL,
	`thrown` TINYINT(1) DEFAULT false NOT NULL,
	`two_handed` TINYINT(1) DEFAULT false NOT NULL,
	`ammunition` TINYINT(1) DEFAULT false NOT NULL,
	`ammunition_kind` VARCHAR,
	`range_kind` VARCHAR DEFAULT 'none' NOT NULL,
	`range_near_feet` integer,
	`range_far_feet` integer,
	`mastery_property` VARCHAR NOT NULL,
	`other_properties` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weapon_templates_damage_check" CHECK((
        (damage_kind = 'dice' AND damage_dice IS NOT NULL AND damage_flat IS NULL AND damage_custom IS NULL)
        OR (damage_kind = 'flat' AND damage_dice IS NULL AND damage_flat IS NOT NULL AND damage_flat >= 0 AND damage_custom IS NULL)
        OR (damage_kind = 'custom' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NOT NULL)
        OR (damage_kind = 'not_recorded' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NULL)
      )),
	CONSTRAINT "weapon_templates_versatile_damage_check" CHECK((
        (versatile_damage_kind = 'dice' AND versatile_damage_dice IS NOT NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'flat' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NOT NULL AND versatile_damage_flat >= 0 AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'custom' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NOT NULL)
        OR (versatile_damage_kind = 'not_applicable' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
      )),
	CONSTRAINT "weapon_templates_range_check" CHECK((
        (range_near_feet IS NULL OR (typeof(range_near_feet) = 'integer' AND range_near_feet BETWEEN 0 AND 100000))
        AND (range_far_feet IS NULL OR (typeof(range_far_feet) = 'integer' AND range_far_feet BETWEEN 0 AND 100000))
        AND (
          (range_kind = 'none' AND range_near_feet IS NULL AND range_far_feet IS NULL)
          OR (range_kind = 'ranged' AND range_near_feet IS NOT NULL AND (range_far_feet IS NULL OR range_far_feet >= range_near_feet))
        )
      )),
	CONSTRAINT "weapon_templates_mastery_property_check" CHECK(`mastery_property` IN ('Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex')),
	CONSTRAINT "weapon_templates_damage_type_check" CHECK(`damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder')),
	CONSTRAINT "weapon_templates_srd_group_check" CHECK(`srd_group` IN ('simple_melee', 'simple_ranged', 'martial_melee', 'martial_ranged')),
	CONSTRAINT "weapon_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

INSERT INTO `__new_weapon_templates`("id", "content_key", "rules_edition", "name", "srd_group", "damage_kind", "damage_dice", "damage_flat", "damage_custom", "damage_type", "versatile_damage_kind", "versatile_damage_dice", "versatile_damage_flat", "versatile_damage_custom", "finesse", "heavy", "light", "loading", "reach", "thrown", "two_handed", "ammunition", "ammunition_kind", "range_kind", "range_near_feet", "range_far_feet", "mastery_property", "other_properties", "created_at", "updated_at") SELECT "id", "content_key", "rules_edition", "name", "srd_group", "damage_kind", "damage_dice", "damage_flat", "damage_custom", "damage_type", "versatile_damage_kind", "versatile_damage_dice", "versatile_damage_flat", "versatile_damage_custom", "finesse", "heavy", "light", "loading", "reach", "thrown", "two_handed", "ammunition", "ammunition_kind", "range_kind", "range_near_feet", "range_far_feet", "mastery_property", "other_properties", "created_at", "updated_at" FROM `weapon_templates`;
DROP TABLE `weapon_templates`;
ALTER TABLE `__new_weapon_templates` RENAME TO `weapon_templates`;
CREATE UNIQUE INDEX `weapon_templates_content_key_unique` ON `weapon_templates` (`content_key`);

PRAGMA foreign_keys=ON;

-- CI-2a registry guards. Aggregate roots cannot outrun their content-key
-- parent. These BEFORE INSERT triggers are the SQL boundary for the existing
-- seed/import writers while CI-3x replaces those writers with semantic
-- projectors. Every identity minted here is deliberately legacy-opaque:
-- neither a key's spelling nor a legacy row's source metadata proves its
-- provenance, and these triggers create no fingerprint.
CREATE TRIGGER catalog_register_class_identity_before_insert
BEFORE INSERT ON class_definitions
BEGIN
  SELECT RAISE(ABORT, 'class content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'class'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'class', 'legacy-opaque', 'external',
    lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_subclass_identity_before_insert
BEFORE INSERT ON subclass_definitions
BEGIN
  SELECT RAISE(ABORT, 'subclass content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'subclass'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'subclass', 'legacy-opaque', 'external',
    lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_feat_identity_before_insert
BEFORE INSERT ON feat_definitions
BEGIN
  SELECT RAISE(ABORT, 'feat content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'feat'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'feat', 'legacy-opaque', 'external',
    lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_species_definition_identity_before_insert
BEFORE INSERT ON species_definitions
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'species', 'legacy-opaque', 'external',
    lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_background_definition_identity_before_insert
BEFORE INSERT ON background_definitions
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'background'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'background', 'legacy-opaque', 'external',
    lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_spell_identity_before_insert
BEFORE INSERT ON spell_versions
BEGIN
  SELECT RAISE(ABORT, 'spell content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'spell'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  )
  SELECT
    NEW.content_key, 'spell', 'legacy-opaque', 'external',
    normalized_name
  FROM spell_identities
  WHERE id = NEW.spell_identity_id;
END;

CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'species', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_background_template_identity_before_insert
BEFORE INSERT ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'background'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'background', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_armor_identity_before_insert
BEFORE INSERT ON armor_templates
BEGIN
  SELECT RAISE(ABORT, 'armor content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'armor'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'armor', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;

CREATE TRIGGER catalog_register_weapon_identity_before_insert
BEFORE INSERT ON weapon_templates
BEGIN
  SELECT RAISE(ABORT, 'weapon content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'weapon'
  );
  INSERT OR IGNORE INTO catalog_content_identities (
    content_key, content_kind, key_kind, catalog_layer, normalized_name
  ) VALUES (
    NEW.content_key, 'weapon', 'legacy-opaque', 'external', lower(NEW.name)
  );
END;
