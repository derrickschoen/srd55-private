-- GENERATED FILE — DO NOT EDIT BY HAND.
-- Source of truth: db/schema/*.ts (tables, indexes, constraints) and
-- db/schema/triggers.sql (triggers). Regenerate with `npm run db:schema`.
-- tests/unit/schema-generation.test.ts fails if this file drifts.

PRAGMA foreign_keys = ON;

-- Final browser schema corresponding to the final state of every Laravel
-- migration. Laravel-only infrastructure tables remain represented so
-- database import/export can round-trip a complete project database without
-- data loss.

CREATE TABLE `background_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`repeatable` TINYINT(1) DEFAULT '0' NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

CREATE UNIQUE INDEX `background_definitions_content_key_unique` ON `background_definitions` (`content_key`);
CREATE UNIQUE INDEX `background_definitions_name_rules_edition_unique` ON `background_definitions` (`name`,`rules_edition`);
CREATE TABLE `cache` (
	`key` VARCHAR PRIMARY KEY NOT NULL,
	`value` TEXT NOT NULL,
	`expiration` integer NOT NULL
);

CREATE INDEX `cache_expiration_index` ON `cache` (`expiration`);
CREATE TABLE `cache_locks` (
	`key` VARCHAR PRIMARY KEY NOT NULL,
	`owner` VARCHAR NOT NULL,
	`expiration` integer NOT NULL
);

CREATE INDEX `cache_locks_expiration_index` ON `cache_locks` (`expiration`);
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
	`reversible` TINYINT(1) DEFAULT '1' NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `change_log_character_id_sequence_unique` ON `change_log` (`character_id`,`sequence`);
CREATE INDEX `change_log_character_id_group_id_index` ON `change_log` (`character_id`,`group_id`);
CREATE INDEX `change_log_operation_uuid_index` ON `change_log` (`operation_uuid`);
CREATE TABLE `character_class_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`class_definition_id` integer NOT NULL,
	`subclass_definition_id` integer,
	`level` integer DEFAULT '1' NOT NULL,
	`is_starting_class` TINYINT(1) DEFAULT '0' NOT NULL,
	`spellcasting_ability_override` VARCHAR,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subclass_definition_id`,`class_definition_id`) REFERENCES `subclass_definitions`(`id`,`class_definition_id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `character_class_levels_character_id_class_definition_id_unique` ON `character_class_levels` (`character_id`,`class_definition_id`);
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
CREATE TABLE `character_spell_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`spell_version_id` integer NOT NULL,
	`favourite` TINYINT(1) DEFAULT '0' NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `character_spell_preferences_character_id_spell_version_id_unique` ON `character_spell_preferences` (`character_id`,`spell_version_id`);
CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` VARCHAR NOT NULL,
	`strength` integer DEFAULT '10' NOT NULL,
	`dexterity` integer DEFAULT '10' NOT NULL,
	`constitution` integer DEFAULT '10' NOT NULL,
	`intelligence` integer DEFAULT '10' NOT NULL,
	`wisdom` integer DEFAULT '10' NOT NULL,
	`charisma` integer DEFAULT '10' NOT NULL,
	`proficiency_bonus_override` integer,
	`rules_edition_preference` VARCHAR DEFAULT '2024' NOT NULL,
	`allow_legacy` TINYINT(1) DEFAULT '0' NOT NULL,
	`revision` integer DEFAULT '0' NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

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
	`supports_ritual_casting` TINYINT(1) DEFAULT '0' NOT NULL,
	`ritual_casting_mode` VARCHAR,
	`primary_ability_expression` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

CREATE UNIQUE INDEX `class_definitions_content_key_unique` ON `class_definitions` (`content_key`);
CREATE UNIQUE INDEX `class_definitions_name_rules_edition_unique` ON `class_definitions` (`name`,`rules_edition`);
CREATE TABLE `class_progressions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`cantrips_known` integer DEFAULT '0' NOT NULL,
	`prepared_count` integer DEFAULT '0' NOT NULL,
	`slots` TEXT,
	`pact_slots` TEXT,
	`grant_rules` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `class_progressions_class_definition_id_class_level_unique` ON `class_progressions` (`class_definition_id`,`class_level`);
CREATE TABLE `failed_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` VARCHAR NOT NULL,
	`connection` VARCHAR NOT NULL,
	`queue` VARCHAR NOT NULL,
	`payload` TEXT NOT NULL,
	`exception` TEXT NOT NULL,
	`failed_at` DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX `failed_jobs_uuid_unique` ON `failed_jobs` (`uuid`);
CREATE INDEX `failed_jobs_connection_queue_failed_at_index` ON `failed_jobs` (`connection`,`queue`,`failed_at`);
CREATE TABLE `feat_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`repeatable` TINYINT(1) DEFAULT '0' NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

CREATE UNIQUE INDEX `feat_definitions_content_key_unique` ON `feat_definitions` (`content_key`);
CREATE UNIQUE INDEX `feat_definitions_name_rules_edition_unique` ON `feat_definitions` (`name`,`rules_edition`);
CREATE TABLE `job_batches` (
	`id` VARCHAR PRIMARY KEY NOT NULL,
	`name` VARCHAR NOT NULL,
	`total_jobs` integer NOT NULL,
	`pending_jobs` integer NOT NULL,
	`failed_jobs` integer NOT NULL,
	`failed_job_ids` TEXT NOT NULL,
	`options` TEXT,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`finished_at` integer
);

CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`queue` VARCHAR NOT NULL,
	`payload` TEXT NOT NULL,
	`attempts` integer NOT NULL,
	`reserved_at` integer,
	`available_at` integer NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX `jobs_queue_index` ON `jobs` (`queue`);
CREATE TABLE `password_reset_tokens` (
	`email` VARCHAR PRIMARY KEY NOT NULL,
	`token` VARCHAR NOT NULL,
	`created_at` DATETIME
);

CREATE TABLE `sessions` (
	`id` VARCHAR PRIMARY KEY NOT NULL,
	`user_id` integer,
	`ip_address` VARCHAR,
	`user_agent` TEXT,
	`payload` TEXT NOT NULL,
	`last_activity` integer NOT NULL
);

CREATE INDEX `sessions_user_id_index` ON `sessions` (`user_id`);
CREATE INDEX `sessions_last_activity_index` ON `sessions` (`last_activity`);
CREATE TABLE `species_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`category` VARCHAR,
	`repeatable` TINYINT(1) DEFAULT '0' NOT NULL,
	`prerequisites` TEXT,
	`grant_rules` TEXT,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

CREATE UNIQUE INDEX `species_definitions_content_key_unique` ON `species_definitions` (`content_key`);
CREATE UNIQUE INDEX `species_definitions_name_rules_edition_unique` ON `species_definitions` (`name`,`rules_edition`);
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
	`ordinal` integer DEFAULT '0' NOT NULL,
	`bucket` VARCHAR NOT NULL,
	`eligibility_kind` VARCHAR NOT NULL,
	`fixed_spell_version_id` integer,
	`current_spell_version_id` integer,
	`label` VARCHAR,
	`spell_level_min` integer DEFAULT '0' NOT NULL,
	`spell_level_max` integer DEFAULT '9' NOT NULL,
	`allowed_spell_lists` TEXT,
	`allowed_schools` TEXT,
	`allowed_tags` TEXT,
	`always_prepared` TINYINT(1) DEFAULT '0' NOT NULL,
	`with_slots` TINYINT(1) DEFAULT '1' NOT NULL,
	`free_cast` TEXT,
	`counts_against_limit` TINYINT(1) DEFAULT '1' NOT NULL,
	`required` TINYINT(1) DEFAULT '0' NOT NULL,
	`is_locked` TINYINT(1) DEFAULT '0' NOT NULL,
	`state` VARCHAR DEFAULT 'active' NOT NULL,
	`orphan_reason_code` VARCHAR,
	`orphaned_by_change_group_id` integer,
	`orphaned_at` DATETIME,
	`prior_config` TEXT,
	`override_note` TEXT,
	`sort_order` integer DEFAULT '0' NOT NULL,
	`notes` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	`selection_collection` VARCHAR,
	`selection_eligibility` VARCHAR DEFAULT 'unselected' NOT NULL,
	`selection_invalid_reason` TEXT,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fixed_spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_instance_id`,`character_id`) REFERENCES `character_source_instances`(`id`,`character_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "spell_slots_exclusive_assignment_check" CHECK(fixed_spell_version_id IS NULL OR current_spell_version_id IS NULL)
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
CREATE TABLE `spell_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_key` VARCHAR NOT NULL,
	`spell_identity_id` integer NOT NULL,
	`display_name` VARCHAR NOT NULL,
	`rules_edition` VARCHAR NOT NULL,
	`level` integer NOT NULL,
	`school` VARCHAR NOT NULL,
	`ritual` TINYINT(1) DEFAULT '0' NOT NULL,
	`concentration` TINYINT(1) DEFAULT '0' NOT NULL,
	`casting_time` VARCHAR,
	`action_type` VARCHAR,
	`range` VARCHAR,
	`duration` VARCHAR,
	`components` VARCHAR,
	`material_component_summary` TEXT,
	`healing` TINYINT(1) DEFAULT '0' NOT NULL,
	`short_summary` TEXT,
	`upcast_type` VARCHAR,
	`upcast_summary` TEXT,
	`requires_mod_for_effect` TINYINT(1) DEFAULT '0' NOT NULL,
	`effect_reliability_category` VARCHAR DEFAULT 'fixed_effect' NOT NULL,
	`provenance` VARCHAR DEFAULT 'import' NOT NULL,
	`seed_version` VARCHAR,
	`is_active` TINYINT(1) DEFAULT '1' NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`spell_identity_id`) REFERENCES `spell_identities`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `spell_versions_content_key_unique` ON `spell_versions` (`content_key`);
CREATE UNIQUE INDEX `spell_versions_spell_identity_id_rules_edition_unique` ON `spell_versions` (`spell_identity_id`,`rules_edition`);
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
	FOREIGN KEY (`class_definition_id`) REFERENCES `class_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `subclass_definitions_content_key_unique` ON `subclass_definitions` (`content_key`);
CREATE UNIQUE INDEX `subclass_definitions_class_definition_id_name_rules_edition_unique` ON `subclass_definitions` (`class_definition_id`,`name`,`rules_edition`);
CREATE UNIQUE INDEX `subclass_definitions_id_class_definition_id_unique` ON `subclass_definitions` (`id`,`class_definition_id`);
CREATE TABLE `subclass_progressions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subclass_definition_id` integer NOT NULL,
	`class_level` integer NOT NULL,
	`cantrips_known` integer DEFAULT '0' NOT NULL,
	`prepared_count` integer DEFAULT '0' NOT NULL,
	`max_spell_level` integer DEFAULT '0' NOT NULL,
	`slots` TEXT,
	`grant_rules` TEXT,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`subclass_definition_id`) REFERENCES `subclass_definitions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `subclass_progressions_subclass_definition_id_class_level_unique` ON `subclass_progressions` (`subclass_definition_id`,`class_level`);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` VARCHAR NOT NULL,
	`email` VARCHAR NOT NULL,
	`email_verified_at` DATETIME,
	`password` VARCHAR NOT NULL,
	`remember_token` VARCHAR,
	`created_at` DATETIME,
	`updated_at` DATETIME
);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
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
CREATE TABLE `wizard_spellbook_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`spell_version_id` integer NOT NULL,
	`created_at` DATETIME,
	`updated_at` DATETIME,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`spell_version_id`) REFERENCES `spell_versions`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX `wizard_spellbook_entries_character_id_spell_version_id_unique` ON `wizard_spellbook_entries` (`character_id`,`spell_version_id`);

-- Browser-product invariants that Drizzle cannot represent.
--
-- These are NOT Laravel parity: they enforce, at the storage layer, that a
-- spell slot never holds both a fixed grant and a user selection. The named
-- CHECK constraint on spell_selection_slots covers INSERT/UPDATE of NULLs;
-- these triggers produce the specific error message the product surfaces.
--
-- This file is appended verbatim as the postlude of the generated schema by
-- scripts/compose-schema.ts.

CREATE TRIGGER spell_slots_exclusive_assignment_insert
    BEFORE INSERT ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;

CREATE TRIGGER spell_slots_exclusive_assignment_update
    BEFORE UPDATE ON spell_selection_slots
    WHEN NEW.fixed_spell_version_id IS NOT NULL
      AND NEW.current_spell_version_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'a spell slot cannot hold both a fixed grant and a user selection');
END;
