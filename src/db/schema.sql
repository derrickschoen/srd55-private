-- GENERATED FILE — DO NOT EDIT BY HAND.
-- Source of truth: db/schema/*.ts (tables, indexes, constraints) and
-- db/schema/triggers.sql (triggers). Regenerate with `npm run db:schema`.
-- tests/unit/schema-generation.test.ts fails if this file drifts.

PRAGMA foreign_keys = ON;

CREATE TABLE `armor_templates` (
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

CREATE UNIQUE INDEX `armor_templates_content_key_unique` ON `armor_templates` (`content_key`);
CREATE TABLE `background_definitions` (
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

CREATE UNIQUE INDEX `background_definitions_content_key_unique` ON `background_definitions` (`content_key`);
CREATE INDEX `background_definitions_name_rules_edition_index` ON `background_definitions` (`name`,`rules_edition`);
CREATE TABLE `background_equipment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`background_template_id` integer NOT NULL,
	`option` VARCHAR NOT NULL,
	`sort_order` integer NOT NULL,
	`quantity` integer NOT NULL,
	`item_name` VARCHAR NOT NULL,
	`item_kind` VARCHAR NOT NULL,
	`weapon_template_id` integer,
	`armor_template_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`background_template_id`) REFERENCES `background_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_template_id`) REFERENCES `weapon_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`armor_template_id`) REFERENCES `armor_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "background_equipment_items_option_check" CHECK(`option` IN ('a', 'b')),
	CONSTRAINT "background_equipment_items_item_kind_check" CHECK(`item_kind` IN ('gear', 'weapon', 'armor')),
	CONSTRAINT "background_equipment_items_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1),
	CONSTRAINT "background_equipment_items_quantity_check" CHECK(typeof(`quantity`) = 'integer' AND `quantity` >= 1),
	CONSTRAINT "background_equipment_items_payload_check" CHECK(CASE `item_kind`
        WHEN 'weapon' THEN `weapon_template_id` IS NOT NULL
          AND `armor_template_id` IS NULL
        WHEN 'armor' THEN `armor_template_id` IS NOT NULL
          AND `weapon_template_id` IS NULL
        ELSE `weapon_template_id` IS NULL AND `armor_template_id` IS NULL
      END)
);

CREATE UNIQUE INDEX `background_equipment_items_template_option_sort_order_unique` ON `background_equipment_items` (`background_template_id`,`option`,`sort_order`);
CREATE INDEX `background_equipment_items_background_template_id_index` ON `background_equipment_items` (`background_template_id`);
CREATE TABLE `background_template_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`background_template_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`background_template_id`) REFERENCES `background_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "background_template_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "background_template_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "background_template_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "background_template_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "background_template_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "background_template_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "background_template_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "background_template_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "background_template_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "background_template_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "background_template_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "background_template_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "background_template_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "background_template_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "background_template_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "background_template_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "background_template_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "background_template_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "background_template_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "background_template_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "background_template_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "background_template_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "background_template_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "background_template_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "background_template_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "background_template_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `background_template_effects_template_sort_unique` ON `background_template_effects` (`background_template_id`,`sort_order`);
CREATE INDEX `background_template_effects_background_template_id_index` ON `background_template_effects` (`background_template_id`);
CREATE TABLE `background_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`rules_edition` VARCHAR DEFAULT '2024' NOT NULL,
	`name` VARCHAR NOT NULL,
	`ability_score_1` VARCHAR NOT NULL,
	`ability_score_2` VARCHAR NOT NULL,
	`ability_score_3` VARCHAR NOT NULL,
	`feat_name` VARCHAR NOT NULL,
	`default_origin_feat_content_key` VARCHAR,
	`skill_proficiency_1` VARCHAR NOT NULL,
	`skill_proficiency_2` VARCHAR NOT NULL,
	`tool_proficiency` VARCHAR NOT NULL,
	`equipment_option_a` TEXT NOT NULL,
	`equipment_option_b` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_origin_feat_content_key`) REFERENCES `feat_definitions`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "background_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

CREATE UNIQUE INDEX `background_templates_content_key_unique` ON `background_templates` (`content_key`);
CREATE INDEX `background_templates_name_rules_edition_index` ON `background_templates` (`name`,`rules_edition`);
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
CREATE TABLE `catalog_content_archive_members` (
	`content_kind` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`character_id` integer NOT NULL,
	`character_revision` integer NOT NULL,
	`character_name` VARCHAR NOT NULL,
	`archived_at` DATETIME NOT NULL,
	PRIMARY KEY(`content_kind`, `content_key`, `character_id`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_archive_members_kind_check" CHECK(`content_kind` IN ('species', 'subclass', 'background')),
	CONSTRAINT "catalog_content_archive_members_character_id_check" CHECK(typeof("catalog_content_archive_members"."character_id") = 'integer' AND "catalog_content_archive_members"."character_id" >= 1),
	CONSTRAINT "catalog_content_archive_members_character_revision_check" CHECK(typeof("catalog_content_archive_members"."character_revision") = 'integer' AND "catalog_content_archive_members"."character_revision" >= 0),
	CONSTRAINT "catalog_content_archive_members_archived_at_check" CHECK(typeof("catalog_content_archive_members"."archived_at") = 'text')
);

CREATE TABLE `catalog_content_drafts` (
	`draft_uuid` VARCHAR PRIMARY KEY NOT NULL,
	`content_kind` VARCHAR NOT NULL,
	`document_version` integer NOT NULL,
	`base_content_key` VARCHAR,
	`revision` integer DEFAULT 0 NOT NULL,
	`document_json` TEXT NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`content_kind`,`base_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "catalog_content_drafts_uuid_check" CHECK(length("catalog_content_drafts"."draft_uuid") > 0),
	CONSTRAINT "catalog_content_drafts_kind_check" CHECK(`content_kind` IN ('species', 'subclass', 'background')),
	CONSTRAINT "catalog_content_drafts_document_version_check" CHECK(typeof("catalog_content_drafts"."document_version") = 'integer' AND "catalog_content_drafts"."document_version" >= 1),
	CONSTRAINT "catalog_content_drafts_revision_check" CHECK(typeof("catalog_content_drafts"."revision") = 'integer' AND "catalog_content_drafts"."revision" >= 0),
	CONSTRAINT "catalog_content_drafts_document_size_check" CHECK(length(CAST("catalog_content_drafts"."document_json" AS BLOB)) BETWEEN 1 AND 524288)
);

CREATE INDEX `catalog_content_drafts_kind_updated_index` ON `catalog_content_drafts` (`content_kind`,`updated_at`,`draft_uuid`);
CREATE INDEX `catalog_content_drafts_base_content_index` ON `catalog_content_drafts` (`content_kind`,`base_content_key`);
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
	CONSTRAINT "catalog_content_fingerprints_scheme_check" CHECK("catalog_content_fingerprints"."fingerprint_scheme" IN ('content-v1', 'content-v2')),
	CONSTRAINT "catalog_content_fingerprints_digest_check" CHECK(length("catalog_content_fingerprints"."fingerprint_digest") = 64
        AND "catalog_content_fingerprints"."fingerprint_digest" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "catalog_content_fingerprints_role_check" CHECK("catalog_content_fingerprints"."fingerprint_role"
        IN ('current', 'compatible', 'bundled-historical'))
);

CREATE UNIQUE INDEX `catalog_content_fingerprints_current_unique` ON `catalog_content_fingerprints` (`content_key`) WHERE "catalog_content_fingerprints"."fingerprint_role" = 'current';
CREATE INDEX `catalog_content_fingerprints_resolution_index` ON `catalog_content_fingerprints` (`content_kind`,`fingerprint_scheme`,`fingerprint_digest`);
CREATE TABLE `catalog_content_identities` (
	`content_key` VARCHAR PRIMARY KEY NOT NULL,
	`content_kind` VARCHAR NOT NULL,
	`key_kind` VARCHAR NOT NULL,
	`catalog_layer` VARCHAR NOT NULL,
	`normalized_name` VARCHAR NOT NULL,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`archived_at` DATETIME,
	CONSTRAINT "catalog_content_identities_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_identities_key_kind_check" CHECK("catalog_content_identities"."key_kind" IN ('derived', 'asserted', 'bundled-stable')),
	CONSTRAINT "catalog_content_identities_catalog_layer_check" CHECK("catalog_content_identities"."catalog_layer" IN ('bundled', 'external')),
	CONSTRAINT "catalog_content_identities_normalized_name_check" CHECK(length("catalog_content_identities"."normalized_name") > 0),
	CONSTRAINT "catalog_content_identities_archived_at_check" CHECK("catalog_content_identities"."archived_at" IS NULL OR typeof("catalog_content_identities"."archived_at") = 'text'),
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
        OR ("catalog_content_identities"."key_kind" = 'asserted'
          AND "catalog_content_identities"."catalog_layer" = 'external'
          -- Exact grammar shared with isAssertedExternalContentKey:
          -- edition:name, or edition:dotted.owner:name. Every component is a
          -- lowercase alphanumeric/hyphen slug with no empty hyphen segment.
          AND length("catalog_content_identities"."content_key") > 2
          AND "catalog_content_identities"."content_key" NOT GLOB '*[^a-z0-9:.-]*'
          AND instr("catalog_content_identities"."content_key", ':') > 1
          AND substr("catalog_content_identities"."content_key", 1, 1) NOT IN ('-', '.', ':')
          AND substr("catalog_content_identities"."content_key", -1, 1) NOT IN ('-', '.', ':')
          AND instr("catalog_content_identities"."content_key", '::') = 0
          AND instr("catalog_content_identities"."content_key", '..') = 0
          AND instr("catalog_content_identities"."content_key", '--') = 0
          AND instr("catalog_content_identities"."content_key", ':.') = 0
          AND instr("catalog_content_identities"."content_key", '.:') = 0
          AND instr("catalog_content_identities"."content_key", ':-') = 0
          AND instr("catalog_content_identities"."content_key", '-:') = 0
          AND instr("catalog_content_identities"."content_key", '.-') = 0
          AND instr("catalog_content_identities"."content_key", '-.') = 0
          AND (
            (length("catalog_content_identities"."content_key") - length(replace("catalog_content_identities"."content_key", ':', '')) = 1
              AND instr("catalog_content_identities"."content_key", '.') = 0)
            OR
            (length("catalog_content_identities"."content_key") - length(replace("catalog_content_identities"."content_key", ':', '')) = 2
              AND instr(substr("catalog_content_identities"."content_key", instr("catalog_content_identities"."content_key", ':') + 1), ':') > 1
              AND instr(substr("catalog_content_identities"."content_key", 1, instr("catalog_content_identities"."content_key", ':') - 1), '.') = 0
              AND instr(substr(
                "catalog_content_identities"."content_key",
                instr("catalog_content_identities"."content_key", ':') + 1,
                instr(substr("catalog_content_identities"."content_key", instr("catalog_content_identities"."content_key", ':') + 1), ':') - 1
              ), '.') > 1
              AND instr(substr(
                "catalog_content_identities"."content_key",
                instr("catalog_content_identities"."content_key", ':') +
                  instr(substr("catalog_content_identities"."content_key", instr("catalog_content_identities"."content_key", ':') + 1), ':') + 1
              ), '.') = 0)
          ))
        OR ("catalog_content_identities"."key_kind" = 'bundled-stable'
          AND "catalog_content_identities"."catalog_layer" = 'bundled')
      ))
);

CREATE UNIQUE INDEX `catalog_content_identities_kind_key_unique` ON `catalog_content_identities` (`content_kind`,`content_key`);
CREATE INDEX `catalog_content_identities_layer_kind_index` ON `catalog_content_identities` (`catalog_layer`,`content_kind`);
CREATE INDEX `catalog_content_identities_name_index` ON `catalog_content_identities` (`content_kind`,`normalized_name`);
CREATE INDEX `catalog_content_identities_archive_list_index` ON `catalog_content_identities` ("archived_at" desc,`content_kind`,`normalized_name`,`content_key`);
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
	CONSTRAINT "catalog_content_match_decisions_scheme_check" CHECK("catalog_content_match_decisions"."incoming_fingerprint_scheme" IN ('content-v1', 'content-v2')),
	CONSTRAINT "catalog_content_match_decisions_digest_check" CHECK(length("catalog_content_match_decisions"."incoming_fingerprint_digest") = 64
        AND "catalog_content_match_decisions"."incoming_fingerprint_digest" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "catalog_content_match_decisions_decision_check" CHECK("catalog_content_match_decisions"."decision" IN ('match', 'clone'))
);

CREATE TABLE `catalog_content_provenance` (
	`content_kind` VARCHAR NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`origin_kind` VARCHAR NOT NULL,
	`received` TINYINT(1) NOT NULL,
	`local_derivation` TINYINT(1) NOT NULL,
	`author_label` VARCHAR,
	`source_label` VARCHAR,
	`license_label` VARCHAR,
	`attribution_text` TEXT,
	`recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `content_key`),
	FOREIGN KEY (`content_kind`,`content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_provenance_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_provenance_origin_kind_check" CHECK(`origin_kind` IN ('authored_here', 'built_in', 'unknown')),
	CONSTRAINT "catalog_content_provenance_received_check" CHECK("catalog_content_provenance"."received" IN (0, 1)),
	CONSTRAINT "catalog_content_provenance_local_derivation_check" CHECK("catalog_content_provenance"."local_derivation" IN (0, 1)),
	CONSTRAINT "catalog_content_provenance_labels_check" CHECK(("catalog_content_provenance"."author_label" IS NULL OR length("catalog_content_provenance"."author_label") BETWEEN 1 AND 200)
        AND ("catalog_content_provenance"."source_label" IS NULL OR length("catalog_content_provenance"."source_label") BETWEEN 1 AND 200)
        AND ("catalog_content_provenance"."license_label" IS NULL OR length("catalog_content_provenance"."license_label") BETWEEN 1 AND 200)
        AND ("catalog_content_provenance"."attribution_text" IS NULL OR length(CAST("catalog_content_provenance"."attribution_text" AS BLOB)) BETWEEN 1 AND 4096))
);

CREATE INDEX `catalog_content_provenance_received_index` ON `catalog_content_provenance` (`received`,`origin_kind`,`content_kind`);
CREATE TABLE `catalog_content_replacement_choices` (
	`content_kind` VARCHAR NOT NULL,
	`superseded_content_key` VARCHAR NOT NULL,
	`successor_content_key` VARCHAR NOT NULL,
	`character_id` integer NOT NULL,
	`decided_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `superseded_content_key`, `successor_content_key`, `character_id`),
	FOREIGN KEY (`content_kind`,`superseded_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_kind`,`successor_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "catalog_content_replacement_choices_kind_check" CHECK(`content_kind` IN ('species', 'subclass', 'background')),
	CONSTRAINT "catalog_content_replacement_choices_distinct_keys_check" CHECK("catalog_content_replacement_choices"."superseded_content_key" <> "catalog_content_replacement_choices"."successor_content_key"),
	CONSTRAINT "catalog_content_replacement_choices_character_id_check" CHECK(typeof("catalog_content_replacement_choices"."character_id") = 'integer' AND "catalog_content_replacement_choices"."character_id" >= 1),
	CONSTRAINT "catalog_content_replacement_choices_decided_at_check" CHECK(typeof("catalog_content_replacement_choices"."decided_at") = 'text')
);

CREATE INDEX `catalog_content_replacement_choices_character_index` ON `catalog_content_replacement_choices` (`character_id`,`content_kind`);
CREATE TABLE `catalog_content_supersessions` (
	`content_kind` VARCHAR NOT NULL,
	`superseded_content_key` VARCHAR NOT NULL,
	`successor_content_key` VARCHAR NOT NULL,
	`recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`content_kind`, `superseded_content_key`),
	FOREIGN KEY (`content_kind`,`superseded_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`content_kind`,`successor_content_key`) REFERENCES `catalog_content_identities`(`content_kind`,`content_key`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "catalog_content_supersessions_content_kind_check" CHECK(`content_kind` IN ('class', 'subclass', 'feat', 'species', 'background', 'spell', 'weapon', 'armor', 'item')),
	CONSTRAINT "catalog_content_supersessions_distinct_keys_check" CHECK("catalog_content_supersessions"."superseded_content_key" <> "catalog_content_supersessions"."successor_content_key")
);

CREATE INDEX `catalog_content_supersessions_successor_index` ON `catalog_content_supersessions` (`content_kind`,`successor_content_key`);
CREATE TABLE `catalog_data_migrations` (
	`id` VARCHAR PRIMARY KEY NOT NULL,
	`scheme` VARCHAR NOT NULL,
	`checksum` VARCHAR NOT NULL,
	`applied_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "catalog_data_migrations_id_check" CHECK(length("catalog_data_migrations"."id") > 0),
	CONSTRAINT "catalog_data_migrations_scheme_check" CHECK("catalog_data_migrations"."scheme" IN ('content-v1', 'content-v2')),
	CONSTRAINT "catalog_data_migrations_checksum_check" CHECK(length("catalog_data_migrations"."checksum") = 64
        AND "catalog_data_migrations"."checksum" NOT GLOB '*[^0-9a-f]*')
);

CREATE TABLE `change_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`sequence` integer NOT NULL,
	`group_id` VARCHAR,
	`operation_uuid` VARCHAR,
	`entity_type` VARCHAR NOT NULL,
	`entity_id` integer,
	`previous_value` TEXT,
	`new_value` TEXT,
	`reason` VARCHAR,
	`action_type` VARCHAR NOT NULL,
	`reversible` TINYINT(1) DEFAULT true NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `change_log_character_id_sequence_unique` ON `change_log` (`character_id`,`sequence`);
CREATE INDEX `change_log_character_id_group_id_index` ON `change_log` (`character_id`,`group_id`);
CREATE INDEX `change_log_operation_uuid_index` ON `change_log` (`operation_uuid`);
CREATE TABLE `character_armor` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`slot` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`category` VARCHAR NOT NULL,
	`armor_class` integer NOT NULL,
	`dex_bonus` VARCHAR NOT NULL,
	`dex_bonus_max` integer,
	`strength_requirement` integer,
	`stealth_disadvantage` TINYINT(1) DEFAULT false NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_armor_slot_check" CHECK(`slot` IN ('worn', 'shield')),
	CONSTRAINT "character_armor_category_check" CHECK(`category` IN ('light', 'medium', 'heavy', 'shield')),
	CONSTRAINT "character_armor_dex_bonus_check" CHECK(`dex_bonus` IN ('full', 'capped', 'none')),
	CONSTRAINT "character_armor_dex_bonus_max_check" CHECK((`dex_bonus` = 'capped') = (`dex_bonus_max` IS NOT NULL) AND (`dex_bonus_max` IS NULL OR (typeof(`dex_bonus_max`) = 'integer' AND `dex_bonus_max` >= 0))),
	CONSTRAINT "character_armor_shield_check" CHECK(`category` <> 'shield' OR `dex_bonus` = 'none'),
	CONSTRAINT "character_armor_armor_class_check" CHECK(typeof(`armor_class`) = 'integer' AND `armor_class` >= 1),
	CONSTRAINT "character_armor_strength_requirement_check" CHECK((`strength_requirement` IS NULL OR (typeof(`strength_requirement`) = 'integer' AND `strength_requirement` >= 1)))
);

CREATE UNIQUE INDEX `character_armor_character_id_slot_unique` ON `character_armor` (`character_id`,`slot`);
CREATE TABLE `character_attunement_slots` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`slot_1_item_id` integer,
	`slot_2_item_id` integer,
	`slot_3_item_id` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`slot_1_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_2_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_3_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "character_attunement_slots_distinct_check" CHECK(
        (slot_1_item_id IS NULL OR slot_2_item_id IS NULL OR slot_1_item_id <> slot_2_item_id)
        AND (slot_1_item_id IS NULL OR slot_3_item_id IS NULL OR slot_1_item_id <> slot_3_item_id)
        AND (slot_2_item_id IS NULL OR slot_3_item_id IS NULL OR slot_2_item_id <> slot_3_item_id)
      )
);

CREATE TABLE `character_background` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`ability_score_1` VARCHAR,
	`ability_score_2` VARCHAR,
	`ability_score_3` VARCHAR,
	`feat_name` VARCHAR,
	`skill_proficiency_1` VARCHAR,
	`skill_proficiency_2` VARCHAR,
	`tool_proficiency` VARCHAR,
	`equipment_option_a` TEXT,
	`equipment_option_b` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `character_background_character_id_unique` ON `character_background` (`character_id`);
CREATE TABLE `character_class_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`class_definition_id` integer NOT NULL,
	`subclass_definition_id` integer,
	`level` integer DEFAULT 1 NOT NULL,
	`is_starting_class` TINYINT(1) DEFAULT false NOT NULL,
	`spellcasting_ability_override` VARCHAR,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subclass_definition_id`,`class_definition_id`) REFERENCES `subclass_definitions`(`id`,`class_definition_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "character_class_levels_spellcasting_ability_override_check" CHECK((`spellcasting_ability_override` IS NULL OR `spellcasting_ability_override` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')))
);

CREATE UNIQUE INDEX `character_class_levels_character_id_class_definition_id_unique` ON `character_class_levels` (`character_id`,`class_definition_id`);
CREATE UNIQUE INDEX `character_class_levels_id_character_id_unique` ON `character_class_levels` (`id`,`character_id`);
CREATE TABLE `character_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`source_instance_id` integer,
	`character_item_id` integer,
	`character_weapon_id` integer,
	`template_ref` TEXT,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_item_id`,`character_id`) REFERENCES `character_items`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_weapon_id`,`character_id`) REFERENCES `character_weapons`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "character_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "character_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "character_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "character_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "character_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "character_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "character_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "character_effects_ability_increase_source_check" CHECK(effect_kind IS NOT 'ability_increase' OR source_instance_id IS NOT NULL),
	CONSTRAINT "character_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "character_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "character_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "character_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "character_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "character_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "character_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "character_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "character_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "character_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "character_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "character_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "character_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "character_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE INDEX `character_effects_character_id_index` ON `character_effects` (`character_id`);
CREATE INDEX `character_effects_character_item_id_index` ON `character_effects` (`character_item_id`);
CREATE INDEX `character_effects_character_weapon_id_index` ON `character_effects` (`character_weapon_id`);
CREATE TABLE `character_hit_point_rolls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`class_name` VARCHAR NOT NULL,
	`class_level` integer NOT NULL,
	`rolled_value` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_hit_point_rolls_check" CHECK(`class_level` BETWEEN 1 AND 20 AND typeof(`rolled_value`) = 'integer' AND `rolled_value` >= 1 AND `rolled_value` <= 12)
);

CREATE UNIQUE INDEX `character_hit_point_rolls_character_id_class_name_class_level_unique` ON `character_hit_point_rolls` (`character_id`,`class_name`,`class_level`);
CREATE TABLE `character_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`description` TEXT,
	`quantity` integer DEFAULT 1 NOT NULL,
	`requires_attunement` TINYINT(1) DEFAULT false NOT NULL,
	`source_instance_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_items_quantity_check" CHECK(typeof(`quantity`) = 'integer' AND `quantity` >= 1)
);

CREATE INDEX `character_items_character_id_index` ON `character_items` (`character_id`);
CREATE UNIQUE INDEX `character_items_id_character_id_unique` ON `character_items` (`id`,`character_id`);
CREATE TABLE `character_level_feat_choices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`character_class_level_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`choice_kind` VARCHAR NOT NULL,
	`feat_source_instance_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_class_level_id`,`character_id`) REFERENCES `character_class_levels`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feat_source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "character_level_feat_choices_class_level_check" CHECK(typeof("character_level_feat_choices"."class_level") = 'integer' AND "character_level_feat_choices"."class_level" BETWEEN 1 AND 20),
	CONSTRAINT "character_level_feat_choices_choice_kind_check" CHECK(`choice_kind` IN ('asi_level_feat', 'epic_boon'))
);

CREATE UNIQUE INDEX `character_level_feat_choices_class_level_kind_unique` ON `character_level_feat_choices` (`character_class_level_id`,`class_level`,`choice_kind`);
CREATE INDEX `character_level_feat_choices_character_id_index` ON `character_level_feat_choices` (`character_id`);
CREATE TABLE `character_operations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`operation_uuid` VARCHAR NOT NULL,
	`expected_revision` integer NOT NULL,
	`resulting_revision` integer NOT NULL,
	`inverse_command` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `character_operations_operation_uuid_unique` ON `character_operations` (`operation_uuid`);
CREATE INDEX `character_operations_character_id_resulting_revision_index` ON `character_operations` (`character_id`,`resulting_revision`);
CREATE TABLE `character_rule_overrides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`rule_key` VARCHAR NOT NULL,
	`value` TEXT NOT NULL,
	`note` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `character_rule_overrides_character_id_rule_key_unique` ON `character_rule_overrides` (`character_id`,`rule_key`);
CREATE TABLE `character_save_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`label` VARCHAR NOT NULL,
	`snapshot` TEXT NOT NULL,
	`schema_version` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `character_share_receipts` (
	`character_id` integer PRIMARY KEY NOT NULL,
	`local_document_id` VARCHAR NOT NULL,
	`received_document_id` VARCHAR,
	`received_revision` integer,
	`baseline_character_revision` integer,
	`created_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_share_receipts_local_document_id_check" CHECK(length("character_share_receipts"."local_document_id") > 0),
	CONSTRAINT "character_share_receipts_received_document_id_check" CHECK("character_share_receipts"."received_document_id" IS NULL OR length("character_share_receipts"."received_document_id") > 0),
	CONSTRAINT "character_share_receipts_received_pair_check" CHECK(("character_share_receipts"."received_document_id" IS NULL
            AND "character_share_receipts"."received_revision" IS NULL
            AND "character_share_receipts"."baseline_character_revision" IS NULL)
          OR ("character_share_receipts"."received_document_id" IS NOT NULL
            AND typeof("character_share_receipts"."received_revision") = 'integer'
            AND "character_share_receipts"."received_revision" >= 0
            AND typeof("character_share_receipts"."baseline_character_revision") = 'integer'
            AND "character_share_receipts"."baseline_character_revision" >= 0))
);

CREATE UNIQUE INDEX `character_share_receipts_local_document_id_unique` ON `character_share_receipts` (`local_document_id`);
CREATE UNIQUE INDEX `character_share_receipts_received_document_id_unique` ON `character_share_receipts` (`received_document_id`);
CREATE TABLE `character_sheet_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `character_sheet_adjustments_character_id_unique` ON `character_sheet_adjustments` (`character_id`);
CREATE TABLE `character_skill_expertise_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`source_instance_id` integer NOT NULL,
	`grant_key` VARCHAR NOT NULL,
	`ordinal` integer NOT NULL,
	`granted_at_class_level` integer NOT NULL,
	`skill` VARCHAR,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_at` DATETIME,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_skill_expertise_grants_skill_check" CHECK((`skill` IS NULL OR `skill` IN ('acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'))),
	CONSTRAINT "character_skill_expertise_grants_state_check" CHECK(`state` IN ('active', 'orphaned')),
	CONSTRAINT "character_skill_expertise_grants_ordinal_check" CHECK(typeof(`ordinal`) = 'integer' AND `ordinal` >= 1),
	CONSTRAINT "character_skill_expertise_grants_level_check" CHECK(typeof(granted_at_class_level) = 'integer'
        AND granted_at_class_level BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX `character_skill_expertise_grants_source_grant_ordinal_unique` ON `character_skill_expertise_grants` (`source_instance_id`,`grant_key`,`ordinal`);
CREATE UNIQUE INDEX `character_skill_expertise_grants_character_skill_unique` ON `character_skill_expertise_grants` (`character_id`,`skill`) WHERE skill IS NOT NULL AND state = 'active';
CREATE INDEX `character_skill_expertise_grants_character_state_index` ON `character_skill_expertise_grants` (`character_id`,`state`);
CREATE TABLE `character_skill_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`source_instance_id` integer NOT NULL,
	`grant_key` VARCHAR NOT NULL,
	`ordinal` integer NOT NULL,
	`skill` VARCHAR,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_at` DATETIME,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_skill_grants_skill_check" CHECK((`skill` IS NULL OR `skill` IN ('acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'))),
	CONSTRAINT "character_skill_grants_state_check" CHECK(`state` IN ('active', 'orphaned')),
	CONSTRAINT "character_skill_grants_ordinal_check" CHECK(typeof(`ordinal`) = 'integer' AND `ordinal` >= 1)
);

CREATE UNIQUE INDEX `character_skill_grants_source_grant_ordinal_unique` ON `character_skill_grants` (`source_instance_id`,`grant_key`,`ordinal`);
CREATE UNIQUE INDEX `character_skill_grants_character_id_skill_unique` ON `character_skill_grants` (`character_id`,`skill`) WHERE skill IS NOT NULL AND state = 'active';
CREATE INDEX `character_skill_grants_character_id_state_index` ON `character_skill_grants` (`character_id`,`state`);
CREATE TABLE `character_skill_proficiencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`skill` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_skill_proficiencies_skill_check" CHECK(`skill` IN ('acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'))
);

CREATE UNIQUE INDEX `character_skill_proficiencies_character_id_skill_unique` ON `character_skill_proficiencies` (`character_id`,`skill`);
CREATE TABLE `character_source_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`instance_uuid` VARCHAR NOT NULL,
	`parent_source_instance_id` integer,
	`source_type` VARCHAR NOT NULL,
	`source_definition_id` integer,
	`display_name` VARCHAR NOT NULL,
	`config` TEXT,
	`acquired_at_character_level` integer,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_source_instance_id`) REFERENCES `character_source_instances`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX `character_source_instances_instance_uuid_unique` ON `character_source_instances` (`instance_uuid`);
CREATE INDEX `character_source_instances_character_id_state_index` ON `character_source_instances` (`character_id`,`state`);
CREATE UNIQUE INDEX `character_source_instances_id_character_id_unique` ON `character_source_instances` (`id`,`character_id`);
CREATE TABLE `character_species` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`creature_type` VARCHAR,
	`size` VARCHAR,
	`base_speed_feet` integer,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_species_base_speed_check" CHECK((`base_speed_feet` IS NULL OR (typeof(`base_speed_feet`) = 'integer' AND `base_speed_feet` >= 1)))
);

CREATE UNIQUE INDEX `character_species_character_id_unique` ON `character_species` (`character_id`);
CREATE TABLE `character_species_traits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`description` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_species_traits_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE INDEX `character_species_traits_character_id_index` ON `character_species_traits` (`character_id`);
CREATE TABLE `character_spell_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`spell_version_id` integer NOT NULL,
	`favourite` TINYINT(1) DEFAULT false NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `character_spell_preferences_character_id_spell_version_id_unique` ON `character_spell_preferences` (`character_id`,`spell_version_id`);
CREATE TABLE `character_weapons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`proficiency_category` VARCHAR,
	`attack_kind` VARCHAR,
	`damage_kind` VARCHAR DEFAULT 'not_recorded' NOT NULL,
	`damage_dice` VARCHAR,
	`damage_flat` integer,
	`damage_custom` VARCHAR,
	`damage_type` VARCHAR,
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
	`mastery_property` VARCHAR,
	`mastery_selected` TINYINT(1) DEFAULT false NOT NULL,
	`other_properties` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "character_weapons_damage_check" CHECK((
        (damage_kind = 'dice' AND damage_dice IS NOT NULL AND damage_flat IS NULL AND damage_custom IS NULL)
        OR (damage_kind = 'flat' AND damage_dice IS NULL AND damage_flat IS NOT NULL AND damage_flat >= 0 AND damage_custom IS NULL)
        OR (damage_kind = 'custom' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NOT NULL)
        OR (damage_kind = 'not_recorded' AND damage_dice IS NULL AND damage_flat IS NULL AND damage_custom IS NULL)
      )),
	CONSTRAINT "character_weapons_versatile_damage_check" CHECK((
        (versatile_damage_kind = 'dice' AND versatile_damage_dice IS NOT NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'flat' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NOT NULL AND versatile_damage_flat >= 0 AND versatile_damage_custom IS NULL)
        OR (versatile_damage_kind = 'custom' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NOT NULL)
        OR (versatile_damage_kind = 'not_applicable' AND versatile_damage_dice IS NULL AND versatile_damage_flat IS NULL AND versatile_damage_custom IS NULL)
      )),
	CONSTRAINT "character_weapons_range_check" CHECK((
        (range_near_feet IS NULL OR (typeof(range_near_feet) = 'integer' AND range_near_feet BETWEEN 0 AND 100000))
        AND (range_far_feet IS NULL OR (typeof(range_far_feet) = 'integer' AND range_far_feet BETWEEN 0 AND 100000))
        AND (
          (range_kind = 'none' AND range_near_feet IS NULL AND range_far_feet IS NULL)
          OR (range_kind = 'ranged' AND range_near_feet IS NOT NULL AND (range_far_feet IS NULL OR range_far_feet >= range_near_feet))
          OR (range_kind = 'legacy' AND range_far_feet IS NOT NULL AND (range_near_feet IS NULL OR range_far_feet < range_near_feet))
        )
      )),
	CONSTRAINT "character_weapons_mastery_requires_property_check" CHECK(mastery_selected = 0 OR mastery_property IS NOT NULL),
	CONSTRAINT "character_weapons_mastery_property_check" CHECK((`mastery_property` IS NULL OR `mastery_property` IN ('Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Slow', 'Topple', 'Vex'))),
	CONSTRAINT "character_weapons_proficiency_category_check" CHECK((`proficiency_category` IS NULL OR `proficiency_category` IN ('simple', 'martial'))),
	CONSTRAINT "character_weapons_attack_kind_check" CHECK((`attack_kind` IS NULL OR `attack_kind` IN ('melee', 'ranged')))
);

CREATE UNIQUE INDEX `character_weapons_id_character_id_unique` ON `character_weapons` (`id`,`character_id`);
CREATE INDEX `character_weapons_character_id_index` ON `character_weapons` (`character_id`);
CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` VARCHAR NOT NULL,
	`strength` integer DEFAULT 10 NOT NULL,
	`dexterity` integer DEFAULT 10 NOT NULL,
	`constitution` integer DEFAULT 10 NOT NULL,
	`intelligence` integer DEFAULT 10 NOT NULL,
	`wisdom` integer DEFAULT 10 NOT NULL,
	`charisma` integer DEFAULT 10 NOT NULL,
	`ability_allocation_method` VARCHAR,
	`proficiency_bonus_override` integer,
	`rules_edition_preference` VARCHAR DEFAULT '2024' NOT NULL,
	`allow_legacy` TINYINT(1) DEFAULT false NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`alignment` TEXT,
	`appearance` TEXT,
	`backstory` TEXT,
	`notes` TEXT,
	`archived_at` DATETIME,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	CONSTRAINT "characters_ability_scores_check" CHECK(strength BETWEEN 1 AND 30
      AND dexterity BETWEEN 1 AND 30
      AND constitution BETWEEN 1 AND 30
      AND intelligence BETWEEN 1 AND 30
      AND wisdom BETWEEN 1 AND 30
      AND charisma BETWEEN 1 AND 30),
	CONSTRAINT "characters_ability_allocation_method_check" CHECK((`ability_allocation_method` IS NULL OR `ability_allocation_method` IN ('standard_array', 'point_buy', 'manual'))),
	CONSTRAINT "characters_rules_edition_preference_check" CHECK(`rules_edition_preference` IN ('2014', '2024', 'expanded')),
	CONSTRAINT "characters_proficiency_bonus_override_check" CHECK((`proficiency_bonus_override` IS NULL OR (typeof(`proficiency_bonus_override`) = 'integer' AND `proficiency_bonus_override` >= 1))),
	CONSTRAINT "characters_revision_check" CHECK(typeof(`revision`) = 'integer' AND `revision` >= 0),
	CONSTRAINT "characters_alignment_check" CHECK((`alignment` IS NULL OR (typeof(`alignment`) = 'text' AND length(`alignment`) BETWEEN 1 AND 120))),
	CONSTRAINT "characters_appearance_check" CHECK((`appearance` IS NULL OR (typeof(`appearance`) = 'text' AND length(`appearance`) BETWEEN 1 AND 4000))),
	CONSTRAINT "characters_backstory_check" CHECK((`backstory` IS NULL OR (typeof(`backstory`) = 'text' AND length(`backstory`) BETWEEN 1 AND 20000))),
	CONSTRAINT "characters_archived_at_check" CHECK(archived_at IS NULL OR typeof(archived_at) = 'text')
);

CREATE INDEX `characters_archive_list_index` ON `characters` ("archived_at" desc,`name`,`id`);
CREATE TABLE `class_armor_training` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`category` VARCHAR NOT NULL,
	`granted_on_multiclass_entry` TINYINT(1) DEFAULT false NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_armor_training_category_check" CHECK(`category` IN ('light', 'medium', 'heavy', 'shield'))
);

CREATE UNIQUE INDEX `class_armor_training_class_definition_id_category_unique` ON `class_armor_training` (`class_definition_id`,`category`);
CREATE TABLE `class_definitions` (
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

CREATE UNIQUE INDEX `class_definitions_content_key_unique` ON `class_definitions` (`content_key`);
CREATE INDEX `class_definitions_name_rules_edition_index` ON `class_definitions` (`name`,`rules_edition`);
CREATE TABLE `class_equipment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`option` VARCHAR NOT NULL,
	`sort_order` integer NOT NULL,
	`quantity` integer NOT NULL,
	`item_name` VARCHAR NOT NULL,
	`item_kind` VARCHAR NOT NULL,
	`weapon_template_id` integer,
	`armor_template_id` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_template_id`) REFERENCES `weapon_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`armor_template_id`) REFERENCES `armor_templates`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "class_equipment_items_option_check" CHECK(`option` IN ('a', 'b', 'c')),
	CONSTRAINT "class_equipment_items_item_kind_check" CHECK(`item_kind` IN ('gear', 'weapon', 'armor')),
	CONSTRAINT "class_equipment_items_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1),
	CONSTRAINT "class_equipment_items_quantity_check" CHECK(typeof(`quantity`) = 'integer' AND `quantity` >= 1),
	CONSTRAINT "class_equipment_items_payload_check" CHECK(CASE `item_kind`
        WHEN 'weapon' THEN `weapon_template_id` IS NOT NULL
          AND `armor_template_id` IS NULL
        WHEN 'armor' THEN `armor_template_id` IS NOT NULL
          AND `weapon_template_id` IS NULL
        ELSE `weapon_template_id` IS NULL AND `armor_template_id` IS NULL
      END)
);

CREATE UNIQUE INDEX `class_equipment_items_class_option_sort_order_unique` ON `class_equipment_items` (`class_definition_id`,`option`,`sort_order`);
CREATE INDEX `class_equipment_items_class_definition_id_index` ON `class_equipment_items` (`class_definition_id`);
CREATE TABLE `class_extra_attack_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`attack_count` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_extra_attack_grants_check" CHECK(class_level BETWEEN 1 AND 20 AND typeof(`attack_count`) = 'integer' AND `attack_count` >= 2)
);

CREATE UNIQUE INDEX `class_extra_attack_grants_class_definition_id_class_level_unique` ON `class_extra_attack_grants` (`class_definition_id`,`class_level`);
CREATE TABLE `class_feature_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`attack_count` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
	CONSTRAINT "class_feature_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "class_feature_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "class_feature_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "class_feature_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "class_feature_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "class_feature_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "class_feature_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "class_feature_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "class_feature_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "class_feature_effects_attack_count_kind_check" CHECK(attack_count IS NULL OR effect_kind IS 'extra_attack'),
	CONSTRAINT "class_feature_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "class_feature_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "class_feature_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "class_feature_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "class_feature_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "class_feature_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_extra_attack_payload_check" CHECK(effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "class_feature_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "class_feature_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "class_feature_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "class_feature_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "class_feature_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "class_feature_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "class_feature_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "class_feature_effects_attack_count_check" CHECK((`attack_count` IS NULL OR (typeof(`attack_count`) = 'integer' AND `attack_count` >= 2))),
	CONSTRAINT "class_feature_effects_class_level_check" CHECK(class_level BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX `class_feature_effects_class_name_level_unique` ON `class_feature_effects` (`class_definition_id`,`name`,`class_level`);
CREATE TABLE `class_feature_value_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`contribution_key` VARCHAR NOT NULL,
	`label` VARCHAR NOT NULL,
	`target_kind` VARCHAR NOT NULL,
	`target_key` VARCHAR NOT NULL,
	`op` VARCHAR NOT NULL,
	`active_from_level` integer NOT NULL,
	`active_to_level` integer NOT NULL,
	`value_json` TEXT NOT NULL,
	`supersedes_ref` TEXT,
	`resource_display_label` VARCHAR,
	`resource_marking_shape` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_feature_value_contributions_contribution_key_check" CHECK(typeof(contribution_key) = 'text' AND length(contribution_key) BETWEEN 1 AND 200),
	CONSTRAINT "class_feature_value_contributions_label_check" CHECK(typeof(label) = 'text' AND length(label) BETWEEN 1 AND 200),
	CONSTRAINT "class_feature_value_contributions_target_kind_check" CHECK(`target_kind` IN ('feature_dice_count', 'resource_maximum')),
	CONSTRAINT "class_feature_value_contributions_op_check" CHECK(`op` IN ('add')),
	CONSTRAINT "class_feature_value_contributions_target_payload_check" CHECK((
        target_kind IS 'feature_dice_count'
        AND target_key IS 'sneak_attack'
        AND op IS 'add'
        AND resource_display_label IS NULL
        AND resource_marking_shape IS NULL
      ) OR (
        target_kind IS 'resource_maximum'
        AND typeof(target_key) = 'text'
        AND length(target_key) BETWEEN 1 AND 200
        AND op IS 'add'
        AND typeof(resource_display_label) = 'text'
        AND length(resource_display_label) BETWEEN 1 AND 200
        AND resource_marking_shape IN ('boxes', 'remaining')
      )),
	CONSTRAINT "class_feature_value_contributions_active_level_band_check" CHECK(typeof(active_from_level) = 'integer'
        AND typeof(active_to_level) = 'integer'
        AND active_from_level BETWEEN 1 AND 20
        AND active_to_level BETWEEN active_from_level AND 20),
	CONSTRAINT "class_feature_value_contributions_value_json_check" CHECK(json_valid(value_json)
        AND json_type(value_json) IS 'object'
        AND length(CAST(value_json AS BLOB)) BETWEEN 1 AND 4096),
	CONSTRAINT "class_feature_value_contributions_supersedes_ref_check" CHECK(supersedes_ref IS NULL OR (
        json_valid(supersedes_ref)
        AND json_type(supersedes_ref) IS 'object'
        AND length(CAST(supersedes_ref AS BLOB)) BETWEEN 1 AND 512
      ))
);

CREATE UNIQUE INDEX `class_feature_value_contributions_owner_key_unique` ON `class_feature_value_contributions` (`class_definition_id`,`contribution_key`);
CREATE TABLE `class_martial_arts_dice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`martial_arts_die` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_martial_arts_dice_check" CHECK(class_level BETWEEN 1 AND 20 AND typeof(`martial_arts_die`) = 'integer' AND `martial_arts_die` IN (6, 8, 10, 12))
);

CREATE UNIQUE INDEX `class_martial_arts_dice_class_definition_id_class_level_unique` ON `class_martial_arts_dice` (`class_definition_id`,`class_level`);
CREATE TABLE `class_progressions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`cantrips_known` integer DEFAULT 0 NOT NULL,
	`prepared_count` integer DEFAULT 0 NOT NULL,
	`slots` TEXT,
	`pact_slots` TEXT,
	`grant_rules` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_progressions_class_level_check" CHECK(class_level BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX `class_progressions_class_definition_id_class_level_unique` ON `class_progressions` (`class_definition_id`,`class_level`);
CREATE TABLE `class_resource_formulas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`resource_kind` VARCHAR NOT NULL,
	`formula_kind` VARCHAR NOT NULL,
	`minimum_class_level` integer NOT NULL,
	`fixed_count` integer,
	`ability` VARCHAR,
	`multiplier` integer,
	`later_fixed_count_steps` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_resource_formulas_resource_kind_check" CHECK(`resource_kind` IN ('persistent_rage_recovery', 'bardic_inspiration', 'divine_intervention', 'wild_resurgence_conversion', 'nature_magician_conversion', 'action_surge', 'indomitable', 'uncanny_metabolism', 'lay_on_hands', 'paladins_smite', 'faithful_steed', 'tireless', 'natures_veil', 'stroke_of_luck', 'innate_sorcery', 'sorcerous_restoration', 'magical_cunning', 'contact_patron')),
	CONSTRAINT "class_resource_formulas_formula_kind_check" CHECK(`formula_kind` IN ('fixed_count', 'fixed_count_by_class_level', 'ability_modifier_minimum_one', 'class_level_multiple')),
	CONSTRAINT "class_resource_formulas_level_check" CHECK(typeof(minimum_class_level) = 'integer' AND minimum_class_level BETWEEN 1 AND 20),
	CONSTRAINT "class_resource_formulas_fixed_count_check" CHECK((`fixed_count` IS NULL OR (typeof(`fixed_count`) = 'integer' AND `fixed_count` >= 1))),
	CONSTRAINT "class_resource_formulas_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('charisma', 'wisdom'))),
	CONSTRAINT "class_resource_formulas_multiplier_check" CHECK((`multiplier` IS NULL OR (typeof(`multiplier`) = 'integer' AND `multiplier` >= 1))),
	CONSTRAINT "class_resource_formulas_payload_check" CHECK((
        formula_kind IS 'fixed_count'
        AND fixed_count IS NOT NULL
        AND ability IS NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NULL
      ) OR (
        formula_kind IS 'fixed_count_by_class_level'
        AND fixed_count IS NOT NULL
        AND ability IS NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NOT NULL
      ) OR (
        formula_kind IS 'ability_modifier_minimum_one'
        AND fixed_count IS NULL
        AND ability IS NOT NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NULL
      ) OR (
        formula_kind IS 'class_level_multiple'
        AND fixed_count IS NULL
        AND ability IS NULL
        AND multiplier IS NOT NULL
        AND later_fixed_count_steps IS NULL
      )),
	CONSTRAINT "class_resource_formulas_steps_json_check" CHECK(later_fixed_count_steps IS NULL OR (
        json_valid(later_fixed_count_steps)
        AND json_type(later_fixed_count_steps) IS 'array'
        AND json_array_length(later_fixed_count_steps) > 0
      ))
);

CREATE UNIQUE INDEX `class_resource_formulas_class_definition_id_resource_kind_unique` ON `class_resource_formulas` (`class_definition_id`,`resource_kind`);
CREATE TABLE `class_resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`resource_kind` VARCHAR NOT NULL,
	`maximum` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_resources_kind_check" CHECK(`resource_kind` IN ('rage', 'channel_divinity', 'wild_shape', 'second_wind', 'focus_points', 'favored_enemy', 'sorcery_points')),
	CONSTRAINT "class_resources_level_maximum_check" CHECK(typeof(class_level) = 'integer' AND class_level BETWEEN 1 AND 20 AND typeof(`maximum`) = 'integer' AND `maximum` >= 0)
);

CREATE UNIQUE INDEX `class_resources_class_definition_id_class_level_resource_kind_unique` ON `class_resources` (`class_definition_id`,`class_level`,`resource_kind`);
CREATE TABLE `class_saving_throw_proficiencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`ability` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_saving_throw_proficiencies_ability_check" CHECK(`ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))
);

CREATE UNIQUE INDEX `class_saving_throw_proficiencies_class_definition_id_ability_unique` ON `class_saving_throw_proficiencies` (`class_definition_id`,`ability`);
CREATE TABLE `class_sheet_traits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`hit_die` integer NOT NULL,
	`skill_choice_count` integer NOT NULL,
	`skill_choice_from_any` TINYINT(1) DEFAULT false NOT NULL,
	`multiclass_skill_choice_count` integer DEFAULT 0 NOT NULL,
	`multiclass_skill_choice_pool` VARCHAR DEFAULT 'none' NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_sheet_traits_check" CHECK(typeof(`hit_die`) = 'integer' AND `hit_die` IN (6, 8, 10, 12) AND typeof(`skill_choice_count`) = 'integer' AND `skill_choice_count` >= 1),
	CONSTRAINT "class_sheet_traits_multiclass_skill_choice_check" CHECK(typeof(`multiclass_skill_choice_count`) = 'integer' AND ((`multiclass_skill_choice_pool` IN ('none') AND `multiclass_skill_choice_count` = 0) OR (`multiclass_skill_choice_pool` IN ('class_list', 'any') AND `multiclass_skill_choice_count` >= 1)))
);

CREATE UNIQUE INDEX `class_sheet_traits_class_definition_id_unique` ON `class_sheet_traits` (`class_definition_id`);
CREATE TABLE `class_skill_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`skill` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_skill_options_skill_check" CHECK(`skill` IN ('acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival'))
);

CREATE UNIQUE INDEX `class_skill_options_class_definition_id_skill_unique` ON `class_skill_options` (`class_definition_id`,`skill`);
CREATE TABLE `class_weapon_mastery_counts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`mastery_count` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_weapon_mastery_counts_check" CHECK(class_level BETWEEN 1 AND 20 AND typeof(`mastery_count`) = 'integer' AND `mastery_count` >= 0)
);

CREATE UNIQUE INDEX `class_weapon_mastery_counts_class_definition_id_class_level_unique` ON `class_weapon_mastery_counts` (`class_definition_id`,`class_level`);
CREATE TABLE `class_weapon_mastery_grants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`grant` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_weapon_mastery_grants_grant_check" CHECK(`grant` IN ('not_granted', 'counts_known', 'counts_unsourced'))
);

CREATE UNIQUE INDEX `class_weapon_mastery_grants_class_definition_id_unique` ON `class_weapon_mastery_grants` (`class_definition_id`);
CREATE TABLE `class_weapon_proficiencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`category` VARCHAR NOT NULL,
	`property_qualifier` VARCHAR,
	`granted_on_multiclass_entry` TINYINT(1) DEFAULT false NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "class_weapon_proficiencies_category_check" CHECK(`category` IN ('simple', 'martial'))
);

CREATE UNIQUE INDEX `class_weapon_proficiencies_class_definition_id_category_unique` ON `class_weapon_proficiencies` (`class_definition_id`,`category`);
CREATE TABLE `feat_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`min_level` integer,
	`ability_points` integer DEFAULT 0 NOT NULL,
	`ability_increase_abilities` TEXT,
	`ability_increase_maximum` integer,
	`repeatable` TINYINT(1) DEFAULT false NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "feat_definitions_min_level_check" CHECK(`min_level` IS NULL OR (typeof(`min_level`) = 'integer' AND `min_level` BETWEEN 1 AND 20)),
	CONSTRAINT "feat_definitions_ability_points_check" CHECK(typeof(`ability_points`) = 'integer' AND `ability_points` IN (0, 1, 2)),
	CONSTRAINT "feat_definitions_ability_increase_maximum_check" CHECK(`ability_increase_maximum` IS NULL OR (typeof(`ability_increase_maximum`) = 'integer' AND `ability_increase_maximum` BETWEEN 1 AND 30))
);

CREATE UNIQUE INDEX `feat_definitions_content_key_unique` ON `feat_definitions` (`content_key`);
CREATE INDEX `feat_definitions_name_rules_edition_index` ON `feat_definitions` (`name`,`rules_edition`);
CREATE TABLE `item_definition_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_definition_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`item_definition_id`) REFERENCES `item_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "item_definition_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "item_definition_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "item_definition_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "item_definition_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "item_definition_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "item_definition_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "item_definition_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "item_definition_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "item_definition_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "item_definition_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "item_definition_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "item_definition_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "item_definition_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "item_definition_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "item_definition_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "item_definition_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "item_definition_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "item_definition_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "item_definition_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "item_definition_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "item_definition_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "item_definition_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "item_definition_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "item_definition_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "item_definition_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "item_definition_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `item_definition_effects_definition_sort_unique` ON `item_definition_effects` (`item_definition_id`,`sort_order`);
CREATE INDEX `item_definition_effects_definition_index` ON `item_definition_effects` (`item_definition_id`);
CREATE TABLE `item_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`description` TEXT NOT NULL,
	`requires_attunement` TINYINT(1) DEFAULT false NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_definitions_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

CREATE UNIQUE INDEX `item_definitions_content_key_unique` ON `item_definitions` (`content_key`);
CREATE INDEX `item_definitions_name_index` ON `item_definitions` (`name`);
CREATE TABLE `named_feature_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`named_feature_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`attack_count` integer,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`named_feature_id`) REFERENCES `named_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "named_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
	CONSTRAINT "named_feature_effects_damage_type_check" CHECK((`damage_type` IS NULL OR `damage_type` IN ('Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'))),
	CONSTRAINT "named_feature_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "named_feature_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "named_feature_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "named_feature_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "named_feature_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "named_feature_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "named_feature_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "named_feature_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "named_feature_effects_attack_count_kind_check" CHECK(attack_count IS NULL OR effect_kind IS 'extra_attack'),
	CONSTRAINT "named_feature_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "named_feature_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "named_feature_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "named_feature_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "named_feature_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "named_feature_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_extra_attack_payload_check" CHECK(effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "named_feature_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "named_feature_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "named_feature_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "named_feature_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "named_feature_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "named_feature_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "named_feature_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "named_feature_effects_attack_count_check" CHECK((`attack_count` IS NULL OR (typeof(`attack_count`) = 'integer' AND `attack_count` >= 2))),
	CONSTRAINT "named_feature_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `named_feature_effects_feature_sort_unique` ON `named_feature_effects` (`named_feature_id`,`sort_order`);
CREATE TABLE `named_features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`class_definition_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`prerequisite` TEXT NOT NULL,
	`description` TEXT NOT NULL,
	`class_level` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "named_features_class_level_check" CHECK(class_level BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX `named_features_content_key_unique` ON `named_features` (`content_key`);
CREATE UNIQUE INDEX `named_features_class_name_rules_edition_unique` ON `named_features` (`class_definition_id`,`name`,`rules_edition`);
CREATE TABLE `party_document_states` (
	`forge` VARCHAR NOT NULL,
	`repository` VARCHAR NOT NULL,
	`observed_ref` VARCHAR,
	`path` VARCHAR NOT NULL,
	`document_kind` VARCHAR NOT NULL,
	`publication_id` VARCHAR,
	`character_id` integer,
	`last_observed_remote_revision` VARCHAR,
	`last_imported_revision` VARCHAR,
	`last_published_local_revision` integer,
	`last_successful_refresh_at` DATETIME,
	`observation_state` VARCHAR NOT NULL,
	PRIMARY KEY(`forge`, `repository`, `path`),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "party_document_states_forge_check" CHECK(`forge` IN ('github', 'gitlab', 'codeberg')),
	CONSTRAINT "party_document_states_kind_check" CHECK(`document_kind` IN ('library', 'character')),
	CONSTRAINT "party_document_states_observation_state_check" CHECK(`observation_state` IN ('Never published', 'Unpublished local changes', 'Published at revision N from this device', 'Published' || char(59) || ' refresh required before another publish', 'No longer published', 'Never refreshed', 'Last refreshed successfully', 'Latest refresh attempt')),
	CONSTRAINT "party_document_states_local_revision_check" CHECK(last_published_local_revision IS NULL OR typeof(`last_published_local_revision`) = 'integer' AND `last_published_local_revision` >= 0)
);

CREATE TABLE `species_definitions` (
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

CREATE UNIQUE INDEX `species_definitions_content_key_unique` ON `species_definitions` (`content_key`);
CREATE INDEX `species_definitions_name_rules_edition_index` ON `species_definitions` (`name`,`rules_edition`);
CREATE TABLE `species_template_trait_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_template_trait_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`species_template_trait_id`) REFERENCES `species_template_traits`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "species_template_trait_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'ability_override', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "species_template_trait_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "species_template_trait_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "species_template_trait_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'ability_override', 'attack_ability_override')),
	CONSTRAINT "species_template_trait_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IN ('ability_increase', 'ability_override')),
	CONSTRAINT "species_template_trait_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "species_template_trait_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "species_template_trait_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_ability_override_payload_check" CHECK(effect_kind IS NOT 'ability_override' OR (ability IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "species_template_trait_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "species_template_trait_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "species_template_trait_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "species_template_trait_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "species_template_trait_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "species_template_trait_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "species_template_trait_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `species_template_trait_effects_trait_sort_unique` ON `species_template_trait_effects` (`species_template_trait_id`,`sort_order`);
CREATE TABLE `species_template_traits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`species_template_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`description` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`species_template_id`) REFERENCES `species_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "species_template_traits_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `species_template_traits_template_sort_unique` ON `species_template_traits` (`species_template_id`,`sort_order`);
CREATE UNIQUE INDEX `species_template_traits_template_name_unique` ON `species_template_traits` (`species_template_id`,`name`);
CREATE TABLE `species_templates` (
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
	CONSTRAINT "species_templates_base_speed_check" CHECK(typeof(`base_speed_feet`) = 'integer' AND `base_speed_feet` >= 1)
);

CREATE UNIQUE INDEX `species_templates_content_key_unique` ON `species_templates` (`content_key`);
CREATE INDEX `species_templates_name_rules_edition_index` ON `species_templates` (`name`,`rules_edition`);
CREATE TABLE `spell_identities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`canonical_name` VARCHAR NOT NULL,
	`normalized_name` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

CREATE UNIQUE INDEX `spell_identities_content_key_unique` ON `spell_identities` (`content_key`);
CREATE INDEX `spell_identities_normalized_name_index` ON `spell_identities` (`normalized_name`);
CREATE TABLE `spell_identity_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_identity_id` integer NOT NULL,
	`alias` VARCHAR NOT NULL,
	`normalized_alias` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`spell_identity_id`) REFERENCES `spell_identities`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_identity_aliases_normalized_alias_unique` ON `spell_identity_aliases` (`normalized_alias`);
CREATE TABLE `spell_list_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`spell_list_key` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_list_memberships_spell_version_id_spell_list_key_unique` ON `spell_list_memberships` (`spell_version_id`,`spell_list_key`);
CREATE INDEX `spell_list_memberships_spell_list_key_index` ON `spell_list_memberships` (`spell_list_key`);
CREATE TABLE `spell_loadout_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_loadout_id` integer NOT NULL,
	`spell_version_id` integer NOT NULL,
	`role` VARCHAR NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`spell_loadout_id`) REFERENCES `spell_loadouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique` ON `spell_loadout_entries` (`spell_loadout_id`,`spell_version_id`,`role`);
CREATE TABLE `spell_loadouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `spell_selection_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`source_instance_id` integer NOT NULL,
	`slot_key` VARCHAR NOT NULL,
	`rule_key` VARCHAR NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL,
	`bucket` VARCHAR NOT NULL,
	`eligibility_kind` VARCHAR NOT NULL,
	`fixed_spell_version_id` integer,
	`current_spell_version_id` integer,
	`label` VARCHAR,
	`spell_level_min` integer DEFAULT 0 NOT NULL,
	`spell_level_max` integer DEFAULT 9 NOT NULL,
	`allowed_spell_lists` TEXT,
	`allowed_schools` TEXT,
	`allowed_tags` TEXT,
	`always_prepared` TINYINT(1) DEFAULT false NOT NULL,
	`with_slots` TINYINT(1) DEFAULT true NOT NULL,
	`free_cast` TEXT,
	`counts_against_limit` TINYINT(1) DEFAULT true NOT NULL,
	`required` TINYINT(1) DEFAULT false NOT NULL,
	`is_locked` TINYINT(1) DEFAULT false NOT NULL,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_at` DATETIME,
	`prior_config` TEXT,
	`override_note` TEXT,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	`selection_collection` VARCHAR,
	`selection_eligibility` VARCHAR DEFAULT 'unselected' NOT NULL,
	`selection_invalid_reason` TEXT,
	`selection_acquired_at_class_level` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fixed_spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "spell_slots_exclusive_assignment_check" CHECK(fixed_spell_version_id IS NULL OR current_spell_version_id IS NULL),
	CONSTRAINT "spell_selection_slots_bucket_check" CHECK(`bucket` IN ('cantrip_known', 'prepared', 'known', 'spellbook', 'automatic')),
	CONSTRAINT "spell_selection_slots_state_check" CHECK(`state` IN ('active', 'orphaned', 'discarded', 'kept_override')),
	CONSTRAINT "spell_selection_slots_selection_eligibility_check" CHECK(`selection_eligibility` IN ('valid', 'invalid', 'unselected')),
	CONSTRAINT "spell_selection_slots_level_window_check" CHECK(spell_level_min BETWEEN 0 AND 9
        AND spell_level_max BETWEEN 0 AND 9
        AND spell_level_min <= spell_level_max)
);

CREATE UNIQUE INDEX `spell_selection_slots_character_id_slot_key_unique` ON `spell_selection_slots` (`character_id`,`slot_key`);
CREATE INDEX `spell_selection_slots_character_id_state_index` ON `spell_selection_slots` (`character_id`,`state`);
CREATE INDEX `spell_selection_slots_character_id_bucket_index` ON `spell_selection_slots` (`character_id`,`bucket`);
CREATE INDEX `slots_character_collection_index` ON `spell_selection_slots` (`character_id`,`selection_collection`);
CREATE TABLE `spell_version_attack_modes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`attack_mode` VARCHAR NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_version_attack_modes_spell_version_id_attack_mode_unique` ON `spell_version_attack_modes` (`spell_version_id`,`attack_mode`);
CREATE INDEX `spell_version_attack_modes_attack_mode_index` ON `spell_version_attack_modes` (`attack_mode`);
CREATE TABLE `spell_version_cantrip_upgrade_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`level` integer NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "spell_version_cantrip_upgrade_levels_level_check" CHECK(typeof(`level`) = 'integer' AND `level` BETWEEN 1 AND 20)
);

CREATE UNIQUE INDEX `spell_version_cantrip_upgrade_levels_spell_version_id_level_unique` ON `spell_version_cantrip_upgrade_levels` (`spell_version_id`,`level`);
CREATE TABLE `spell_version_conditions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`condition_type` VARCHAR NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_version_conditions_spell_version_id_condition_type_unique` ON `spell_version_conditions` (`spell_version_id`,`condition_type`);
CREATE INDEX `spell_version_conditions_condition_type_index` ON `spell_version_conditions` (`condition_type`);
CREATE TABLE `spell_version_damage_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`damage_type` VARCHAR NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_version_damage_types_spell_version_id_damage_type_unique` ON `spell_version_damage_types` (`spell_version_id`,`damage_type`);
CREATE INDEX `spell_version_damage_types_damage_type_index` ON `spell_version_damage_types` (`damage_type`);
CREATE TABLE `spell_version_publications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`source_book` VARCHAR NOT NULL,
	`source_page` integer,
	`source_reference` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_version_publications_spell_version_id_source_book_unique` ON `spell_version_publications` (`spell_version_id`,`source_book`);
CREATE TABLE `spell_version_save_abilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`save_ability` VARCHAR NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_version_save_abilities_spell_version_id_save_ability_unique` ON `spell_version_save_abilities` (`spell_version_id`,`save_ability`);
CREATE INDEX `spell_version_save_abilities_save_ability_index` ON `spell_version_save_abilities` (`save_ability`);
CREATE TABLE `spell_version_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`tag` VARCHAR NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_version_tags_spell_version_id_tag_unique` ON `spell_version_tags` (`spell_version_id`,`tag`);
CREATE INDEX `spell_version_tags_tag_index` ON `spell_version_tags` (`tag`);
CREATE TABLE `spell_version_upcast_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`spell_version_id` integer NOT NULL,
	`level` integer NOT NULL,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "spell_version_upcast_levels_level_check" CHECK(typeof(`level`) = 'integer' AND `level` BETWEEN 1 AND 9)
);

CREATE UNIQUE INDEX `spell_version_upcast_levels_spell_version_id_level_unique` ON `spell_version_upcast_levels` (`spell_version_id`,`level`);
CREATE TABLE `spell_versions` (
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

CREATE UNIQUE INDEX `spell_versions_content_key_unique` ON `spell_versions` (`content_key`);
CREATE INDEX `spell_versions_spell_identity_id_rules_edition_index` ON `spell_versions` (`spell_identity_id`,`rules_edition`);
CREATE INDEX `spell_versions_rules_edition_level_index` ON `spell_versions` (`rules_edition`,`level`);
CREATE INDEX `spell_versions_is_active_index` ON `spell_versions` (`is_active`);
CREATE TABLE `subclass_definitions` (
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
	`notes` TEXT,
	FOREIGN KEY (`content_key`) REFERENCES `catalog_content_identities`(`content_key`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `subclass_definitions_content_key_unique` ON `subclass_definitions` (`content_key`);
CREATE INDEX `subclass_definitions_class_definition_id_name_rules_edition_index` ON `subclass_definitions` (`class_definition_id`,`name`,`rules_edition`);
CREATE UNIQUE INDEX `subclass_definitions_id_class_definition_id_unique` ON `subclass_definitions` (`id`,`class_definition_id`);
CREATE TABLE `subclass_feature_effects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_feature_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`effect_kind` VARCHAR NOT NULL,
	`damage_type` VARCHAR,
	`hit_points_flat` integer,
	`hit_points_per_level` integer,
	`speed_bonus_feet` integer,
	`ability` VARCHAR,
	`amount` integer,
	`maximum` integer,
	`base` integer,
	`ability_1` VARCHAR,
	`ability_2` VARCHAR,
	`allows_shield` TINYINT(1),
	`weapon_scope` VARCHAR,
	`attack_count` integer,
	`label` VARCHAR NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_feature_id`) REFERENCES `subclass_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_feature_effects_kind_check" CHECK(`effect_kind` IN ('damage_resistance', 'hp_modifier', 'speed', 'ability_increase', 'armor_class_bonus', 'armor_class_formula', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus', 'extra_attack')),
	CONSTRAINT "subclass_feature_effects_damage_type_kind_check" CHECK(damage_type IS NULL OR effect_kind IS 'damage_resistance'),
	CONSTRAINT "subclass_feature_effects_hit_points_kind_check" CHECK((hit_points_flat IS NULL AND hit_points_per_level IS NULL) OR effect_kind IS 'hp_modifier'),
	CONSTRAINT "subclass_feature_effects_speed_kind_check" CHECK(speed_bonus_feet IS NULL OR effect_kind IS 'speed'),
	CONSTRAINT "subclass_feature_effects_ability_kind_check" CHECK(ability IS NULL OR effect_kind IN ('ability_increase', 'attack_ability_override')),
	CONSTRAINT "subclass_feature_effects_amount_kind_check" CHECK(amount IS NULL OR effect_kind IN ('ability_increase', 'armor_class_bonus', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "subclass_feature_effects_maximum_kind_check" CHECK(maximum IS NULL OR effect_kind IS 'ability_increase'),
	CONSTRAINT "subclass_feature_effects_base_kind_check" CHECK(base IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_ability_1_kind_check" CHECK(ability_1 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_ability_2_kind_check" CHECK(ability_2 IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_allows_shield_kind_check" CHECK(allows_shield IS NULL OR effect_kind IS 'armor_class_formula'),
	CONSTRAINT "subclass_feature_effects_weapon_scope_kind_check" CHECK(weapon_scope IS NULL OR effect_kind IN ('extra_attack', 'attack_ability_override', 'weapon_attack_bonus', 'weapon_damage_bonus')),
	CONSTRAINT "subclass_feature_effects_attack_count_kind_check" CHECK(attack_count IS NULL OR effect_kind IS 'extra_attack'),
	CONSTRAINT "subclass_feature_effects_hp_modifier_payload_check" CHECK(effect_kind IS NOT 'hp_modifier' OR hit_points_flat IS NOT NULL OR hit_points_per_level IS NOT NULL),
	CONSTRAINT "subclass_feature_effects_speed_payload_check" CHECK(effect_kind IS NOT 'speed' OR speed_bonus_feet IS NOT NULL),
	CONSTRAINT "subclass_feature_effects_ability_increase_payload_check" CHECK(effect_kind IS NOT 'ability_increase' OR (ability IS NOT NULL AND amount IS NOT NULL AND maximum IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_armor_class_bonus_payload_check" CHECK(effect_kind IS NOT 'armor_class_bonus' OR amount IS NOT NULL),
	CONSTRAINT "subclass_feature_effects_armor_class_formula_payload_check" CHECK(effect_kind IS NOT 'armor_class_formula' OR (base IS NOT NULL AND ability_1 IS NOT NULL AND allows_shield IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_attack_ability_override_payload_check" CHECK(effect_kind IS NOT 'attack_ability_override' OR (ability IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_weapon_attack_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_attack_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_weapon_damage_bonus_payload_check" CHECK(effect_kind IS NOT 'weapon_damage_bonus' OR (amount IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_extra_attack_payload_check" CHECK(effect_kind IS NOT 'extra_attack' OR (attack_count IS NOT NULL AND weapon_scope IS NOT NULL)),
	CONSTRAINT "subclass_feature_effects_ability_check" CHECK((`ability` IS NULL OR `ability` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "subclass_feature_effects_amount_check" CHECK(amount IS NULL OR (typeof(amount) = 'integer' AND amount <> 0)),
	CONSTRAINT "subclass_feature_effects_maximum_check" CHECK(maximum IS NULL OR (typeof(maximum) = 'integer' AND maximum BETWEEN 1 AND 30)),
	CONSTRAINT "subclass_feature_effects_base_check" CHECK((`base` IS NULL OR (typeof(`base`) = 'integer' AND `base` >= 1))),
	CONSTRAINT "subclass_feature_effects_ability_1_check" CHECK((`ability_1` IS NULL OR `ability_1` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "subclass_feature_effects_ability_2_check" CHECK((`ability_2` IS NULL OR `ability_2` IN ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'))),
	CONSTRAINT "subclass_feature_effects_weapon_scope_check" CHECK((`weapon_scope` IS NULL OR `weapon_scope` IN ('any_weapon', 'one_bonded_weapon'))),
	CONSTRAINT "subclass_feature_effects_attack_count_check" CHECK((`attack_count` IS NULL OR (typeof(`attack_count`) = 'integer' AND `attack_count` >= 2))),
	CONSTRAINT "subclass_feature_effects_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `subclass_feature_effects_feature_sort_unique` ON `subclass_feature_effects` (`subclass_feature_id`,`sort_order`);
CREATE TABLE `subclass_feature_value_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_feature_id` integer NOT NULL,
	`contribution_key` VARCHAR NOT NULL,
	`label` VARCHAR NOT NULL,
	`target_kind` VARCHAR NOT NULL,
	`target_key` VARCHAR NOT NULL,
	`op` VARCHAR NOT NULL,
	`active_from_level` integer NOT NULL,
	`active_to_level` integer NOT NULL,
	`value_json` TEXT NOT NULL,
	`supersedes_ref` TEXT,
	`resource_display_label` VARCHAR,
	`resource_marking_shape` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_feature_id`) REFERENCES `subclass_features`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_feature_value_contributions_contribution_key_check" CHECK(typeof(contribution_key) = 'text' AND length(contribution_key) BETWEEN 1 AND 200),
	CONSTRAINT "subclass_feature_value_contributions_label_check" CHECK(typeof(label) = 'text' AND length(label) BETWEEN 1 AND 200),
	CONSTRAINT "subclass_feature_value_contributions_target_kind_check" CHECK(`target_kind` IN ('feature_dice_count', 'resource_maximum')),
	CONSTRAINT "subclass_feature_value_contributions_op_check" CHECK(`op` IN ('add')),
	CONSTRAINT "subclass_feature_value_contributions_target_payload_check" CHECK((
        target_kind IS 'feature_dice_count'
        AND target_key IS 'sneak_attack'
        AND op IS 'add'
        AND resource_display_label IS NULL
        AND resource_marking_shape IS NULL
      ) OR (
        target_kind IS 'resource_maximum'
        AND typeof(target_key) = 'text'
        AND length(target_key) BETWEEN 1 AND 200
        AND op IS 'add'
        AND typeof(resource_display_label) = 'text'
        AND length(resource_display_label) BETWEEN 1 AND 200
        AND resource_marking_shape IN ('boxes', 'remaining')
      )),
	CONSTRAINT "subclass_feature_value_contributions_active_level_band_check" CHECK(typeof(active_from_level) = 'integer'
        AND typeof(active_to_level) = 'integer'
        AND active_from_level BETWEEN 1 AND 20
        AND active_to_level BETWEEN active_from_level AND 20),
	CONSTRAINT "subclass_feature_value_contributions_value_json_check" CHECK(json_valid(value_json)
        AND json_type(value_json) IS 'object'
        AND length(CAST(value_json AS BLOB)) BETWEEN 1 AND 4096),
	CONSTRAINT "subclass_feature_value_contributions_supersedes_ref_check" CHECK(supersedes_ref IS NULL OR (
        json_valid(supersedes_ref)
        AND json_type(supersedes_ref) IS 'object'
        AND length(CAST(supersedes_ref AS BLOB)) BETWEEN 1 AND 512
      ))
);

CREATE UNIQUE INDEX `subclass_feature_value_contributions_owner_key_unique` ON `subclass_feature_value_contributions` (`subclass_feature_id`,`contribution_key`);
CREATE TABLE `subclass_features` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`name` VARCHAR NOT NULL,
	`description` TEXT NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_definition_id`) REFERENCES `subclass_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_features_class_level_check" CHECK(class_level BETWEEN 1 AND 20),
	CONSTRAINT "subclass_features_sort_order_check" CHECK(typeof(`sort_order`) = 'integer' AND `sort_order` >= 1)
);

CREATE UNIQUE INDEX `subclass_features_subclass_sort_unique` ON `subclass_features` (`subclass_definition_id`,`sort_order`);
CREATE UNIQUE INDEX `subclass_features_subclass_level_name_unique` ON `subclass_features` (`subclass_definition_id`,`class_level`,`name`);
CREATE TABLE `subclass_progressions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`cantrips_known` integer DEFAULT 0 NOT NULL,
	`prepared_count` integer DEFAULT 0 NOT NULL,
	`max_spell_level` integer DEFAULT 0 NOT NULL,
	`slots` TEXT,
	`grant_rules` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_definition_id`) REFERENCES `subclass_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "subclass_progressions_class_level_check" CHECK(class_level BETWEEN 1 AND 20),
	CONSTRAINT "subclass_progressions_max_spell_level_check" CHECK(max_spell_level BETWEEN 0 AND 9)
);

CREATE UNIQUE INDEX `subclass_progressions_subclass_definition_id_class_level_unique` ON `subclass_progressions` (`subclass_definition_id`,`class_level`);
CREATE TABLE `warning_acknowledgements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`warning_fingerprint` VARCHAR NOT NULL,
	`note` TEXT,
	`invalidated_at` DATETIME,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `warning_acknowledgements_character_id_warning_fingerprint_unique` ON `warning_acknowledgements` (`character_id`,`warning_fingerprint`);
CREATE TABLE `weapon_templates` (
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
	CONSTRAINT "weapon_templates_srd_group_check" CHECK(`srd_group` IN ('simple_melee', 'simple_ranged', 'martial_melee', 'martial_ranged')),
	CONSTRAINT "weapon_templates_rules_edition_check" CHECK(`rules_edition` IN ('2014', '2024', 'expanded'))
);

CREATE UNIQUE INDEX `weapon_templates_content_key_unique` ON `weapon_templates` (`content_key`);
CREATE TABLE `wizard_spellbook_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`source_instance_id` integer,
	`rule_key` VARCHAR,
	`ordinal` integer,
	`acquired_at_class_level` integer,
	`spell_version_id` integer,
	`spell_level_min` integer DEFAULT 1 NOT NULL,
	`spell_level_max` integer DEFAULT 9 NOT NULL,
	`allowed_spell_lists` TEXT,
	`allowed_schools` TEXT,
	`allowed_tags` TEXT,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_at` DATETIME,
	`selection_eligibility` VARCHAR DEFAULT 'unselected' NOT NULL,
	`selection_invalid_reason` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wizard_spellbook_entries_logical_address_check" CHECK((
        source_instance_id IS NULL
        AND rule_key IS NULL
        AND ordinal IS NULL
      ) OR (
        source_instance_id IS NOT NULL
        AND rule_key IS NOT NULL
        AND ordinal IS NOT NULL
      )),
	CONSTRAINT "wizard_spellbook_entries_ordinal_check" CHECK(ordinal IS NULL OR (typeof(ordinal) = 'integer' AND ordinal >= 1)),
	CONSTRAINT "wizard_spellbook_entries_acquisition_level_check" CHECK(acquired_at_class_level IS NULL OR (
        typeof(acquired_at_class_level) = 'integer'
        AND acquired_at_class_level BETWEEN 1 AND 20
      )),
	CONSTRAINT "wizard_spellbook_entries_level_window_check" CHECK(spell_level_min BETWEEN 0 AND 9
        AND spell_level_max BETWEEN 0 AND 9
        AND spell_level_min <= spell_level_max),
	CONSTRAINT "wizard_spellbook_entries_state_check" CHECK(`state` IN ('active', 'orphaned')),
	CONSTRAINT "wizard_spellbook_entries_selection_eligibility_check" CHECK(`selection_eligibility` IN ('valid', 'invalid', 'unselected'))
);

CREATE UNIQUE INDEX `wizard_spellbook_entries_source_rule_ordinal_unique` ON `wizard_spellbook_entries` (`source_instance_id`,`rule_key`,`ordinal`);
CREATE UNIQUE INDEX `wizard_spellbook_entries_character_id_spell_version_id_unique` ON `wizard_spellbook_entries` (`character_id`,`spell_version_id`) WHERE spell_version_id IS NOT NULL AND state = 'active';
CREATE INDEX `wizard_spellbook_entries_character_id_state_index` ON `wizard_spellbook_entries` (`character_id`,`state`);

-- Browser-product invariants that Drizzle cannot represent: immutable,
-- acyclic version lineage plus cross-row character/catalog guards.
--
-- These are NOT Laravel parity. The spell triggers enforce, at storage, that a
-- spell slot never holds both a fixed grant and a user selection. The named
-- CHECK constraint on spell_selection_slots covers INSERT/UPDATE of NULLs;
-- these triggers produce the specific error message the product surfaces.
--
-- This file is appended verbatim as the postlude of the generated schema by
-- scripts/compose-schema.ts.

-- CI-7 version lineage is historical evidence. An old key gets exactly one
-- successor, and no later writer may rewrite that edge.
CREATE TRIGGER catalog_content_supersessions_refuse_update_before_update
BEFORE UPDATE ON catalog_content_supersessions
BEGIN
  SELECT RAISE(ABORT, 'catalog content supersession lineage is immutable');
END;

-- Both identity foreign keys are ON DELETE RESTRICT, not CASCADE: installed
-- identities that participate in history cannot be uninstalled. A direct
-- edge delete therefore has no legitimate cascade exception and must always
-- refuse, closing DELETE+INSERT as a successor-rewrite path.
CREATE TRIGGER catalog_content_supersessions_refuse_delete_before_delete
BEFORE DELETE ON catalog_content_supersessions
BEGIN
  SELECT RAISE(ABORT, 'catalog content supersession lineage is immutable');
END;

-- Walk the same-kind successor chain before accepting a new edge. UNION (not
-- UNION ALL) also terminates safely if this guard is installed over damaged
-- legacy data; the candidate edge is refused when its successor reaches its
-- own superseded key.
CREATE TRIGGER catalog_content_supersessions_prevent_cycle_before_insert
BEFORE INSERT ON catalog_content_supersessions
WHEN NEW.superseded_content_key <> NEW.successor_content_key
 AND EXISTS (
  WITH RECURSIVE successor_chain(content_key) AS (
    SELECT NEW.successor_content_key
    UNION
    SELECT lineage.successor_content_key
    FROM catalog_content_supersessions AS lineage
    INNER JOIN successor_chain AS chain
      ON lineage.content_kind = NEW.content_kind
     AND lineage.superseded_content_key = chain.content_key
  )
  SELECT 1 FROM successor_chain
  WHERE content_key = NEW.superseded_content_key
)
BEGIN
  SELECT RAISE(ABORT, 'catalog content supersession would create a cycle');
END;

CREATE TRIGGER spell_slots_exclusive_assignment_insert
    BEFORE INSERT ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;

-- D92's slot row uses composite ownership references. SQLite's SET NULL
-- action would null both columns in each composite key, including the
-- non-null character primary key, so clear only the matching item positions
-- before the item delete reaches foreign-key enforcement.
CREATE TRIGGER character_items_clear_attunement_slots_before_delete
    BEFORE DELETE ON character_items
BEGIN
    UPDATE character_attunement_slots
       SET slot_1_item_id = CASE
             WHEN slot_1_item_id = OLD.id THEN NULL ELSE slot_1_item_id END,
           slot_2_item_id = CASE
             WHEN slot_2_item_id = OLD.id THEN NULL ELSE slot_2_item_id END,
           slot_3_item_id = CASE
             WHEN slot_3_item_id = OLD.id THEN NULL ELSE slot_3_item_id END
     WHERE character_id = OLD.character_id
       AND OLD.id IN (slot_1_item_id, slot_2_item_id, slot_3_item_id);
END;

-- LU-1's feat pointer uses the same composite ownership guard. Clear only the
-- nullable source half before deletion; the character half remains the row's
-- non-null aggregate owner.
CREATE TRIGGER character_sources_clear_level_feat_choices_before_delete
    BEFORE DELETE ON character_source_instances
BEGIN
    UPDATE character_level_feat_choices
       SET feat_source_instance_id = NULL,
           updated_at = CURRENT_TIMESTAMP
     WHERE character_id = OLD.character_id
       AND feat_source_instance_id = OLD.id;
END;

CREATE TRIGGER spell_slots_exclusive_assignment_update
    BEFORE UPDATE ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;

-- CI-2a/CI-4 registry guards. Every aggregate root, including a spell, must
-- pass through the asserted/bundled registration seam first.
CREATE TRIGGER catalog_register_class_identity_before_insert
BEFORE INSERT ON class_definitions
BEGIN
  SELECT RAISE(ABORT, 'class content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'class'
  );
  SELECT RAISE(ABORT, 'class content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'class'
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
  SELECT RAISE(ABORT, 'subclass content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'subclass'
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
  SELECT RAISE(ABORT, 'feat content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'feat'
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
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'species'
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
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'background'
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
  SELECT RAISE(ABORT, 'spell content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'spell'
  );
END;

CREATE TRIGGER catalog_register_species_template_identity_before_insert
BEFORE INSERT ON species_templates
BEGIN
  SELECT RAISE(ABORT, 'species content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'species'
  );
  SELECT RAISE(ABORT, 'species content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'species'
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
  SELECT RAISE(ABORT, 'background content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'background'
  );
  SELECT RAISE(ABORT, 'background default Origin feat key must name an installed Origin feat')
  WHERE NEW.default_origin_feat_content_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feat_definitions
      WHERE content_key = NEW.default_origin_feat_content_key
        AND category = 'origin'
    );
END;

CREATE TRIGGER background_default_origin_feat_before_update
BEFORE UPDATE OF default_origin_feat_content_key ON background_templates
BEGIN
  SELECT RAISE(ABORT, 'background default Origin feat key must name an installed Origin feat')
  WHERE NEW.default_origin_feat_content_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM feat_definitions
      WHERE content_key = NEW.default_origin_feat_content_key
        AND category = 'origin'
    );
END;

CREATE TRIGGER feat_category_preserves_background_default_before_update
BEFORE UPDATE OF category ON feat_definitions
WHEN OLD.category = 'origin' AND NEW.category <> 'origin'
BEGIN
  SELECT RAISE(ABORT, 'referenced background default feat must remain an Origin feat')
  WHERE EXISTS (
    SELECT 1 FROM background_templates
    WHERE default_origin_feat_content_key = OLD.content_key
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
  SELECT RAISE(ABORT, 'armor content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'armor'
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
  SELECT RAISE(ABORT, 'weapon content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'weapon'
  );
END;

CREATE TRIGGER catalog_register_item_identity_before_insert
BEFORE INSERT ON item_definitions
BEGIN
  SELECT RAISE(ABORT, 'item content key is registered for another kind')
  WHERE EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind <> 'item'
  );
  SELECT RAISE(ABORT, 'item content key must be registered before insert')
  WHERE NOT EXISTS (
    SELECT 1 FROM catalog_content_identities
    WHERE content_key = NEW.content_key AND content_kind = 'item'
  );
END;
