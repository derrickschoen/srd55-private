import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemaSources } from '../helpers/schema-sources';
import preDrizzleSchema from '../fixtures/schema-pre-drizzle.sql?raw';

type SqlRow = Record<string, string | number | bigint | null>;

/**
 * THE LARAVEL 38. Transcribed from the Laravel migrations, frozen, and NEVER
 * regenerated from this project's own output. `laravelColumnMetadataHash` below
 * is computed over exactly these tables and no others, so the parity claim
 * survives the arrival of native tables undiluted: any drift in a Laravel
 * table's columns, types, nullability, defaults or order still moves the hash.
 */
const expectedColumns: Record<string, string[]> = {
  background_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'category', 'repeatable',
    'prerequisites', 'grant_rules', 'notes', 'created_at', 'updated_at',
  ],
  change_log: [
    'id', 'character_id', 'sequence', 'group_id', 'operation_uuid',
    'entity_type', 'entity_id', 'previous_value', 'new_value', 'reason',
    'action_type', 'reversible', 'created_at', 'updated_at',
  ],
  character_class_levels: [
    'id', 'character_id', 'class_definition_id', 'subclass_definition_id',
    'level', 'is_starting_class', 'spellcasting_ability_override', 'notes',
    'created_at', 'updated_at',
  ],
  character_operations: [
    'id', 'character_id', 'operation_uuid', 'expected_revision',
    'resulting_revision', 'inverse_command', 'created_at', 'updated_at',
  ],
  character_rule_overrides: [
    'id', 'character_id', 'rule_key', 'value', 'note', 'created_at',
    'updated_at',
  ],
  character_save_points: [
    'id', 'character_id', 'label', 'snapshot', 'schema_version', 'created_at',
    'updated_at',
  ],
  character_source_instances: [
    'id', 'character_id', 'instance_uuid', 'parent_source_instance_id',
    'source_type', 'source_definition_id', 'display_name', 'config',
    'acquired_at_character_level', 'state', 'notes', 'created_at', 'updated_at',
  ],
  character_spell_preferences: [
    'id', 'character_id', 'spell_version_id', 'favourite', 'notes',
    'created_at', 'updated_at',
  ],
  characters: [
    'id', 'name', 'strength', 'dexterity', 'constitution', 'intelligence',
    'wisdom', 'charisma', 'proficiency_bonus_override',
    'rules_edition_preference', 'allow_legacy', 'revision', 'notes',
    'created_at', 'updated_at',
  ],
  class_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'spellcasting_ability',
    'progression_type', 'caster_fraction', 'caster_rounding',
    'prepares_or_knows', 'supports_ritual_casting', 'ritual_casting_mode',
    'primary_ability_expression', 'notes', 'created_at', 'updated_at',
  ],
  class_progressions: [
    'id', 'class_definition_id', 'class_level', 'cantrips_known',
    'prepared_count', 'slots', 'pact_slots', 'grant_rules', 'created_at',
    'updated_at',
  ],
  feat_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'category', 'repeatable',
    'prerequisites', 'grant_rules', 'notes', 'created_at', 'updated_at',
  ],
  species_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'category', 'repeatable',
    'prerequisites', 'grant_rules', 'notes', 'created_at', 'updated_at',
  ],
  spell_identities: [
    'id', 'content_key', 'canonical_name', 'normalized_name', 'notes',
    'created_at', 'updated_at',
  ],
  spell_identity_aliases: [
    'id', 'spell_identity_id', 'alias', 'normalized_alias', 'created_at',
    'updated_at',
  ],
  spell_list_memberships: [
    'id', 'spell_version_id', 'spell_list_key', 'created_at', 'updated_at',
  ],
  spell_loadout_entries: [
    'id', 'spell_loadout_id', 'spell_version_id', 'role', 'created_at',
    'updated_at',
  ],
  spell_loadouts: [
    'id', 'character_id', 'name', 'notes', 'created_at', 'updated_at',
  ],
  spell_selection_slots: [
    'id', 'character_id', 'source_instance_id', 'slot_key', 'rule_key',
    'ordinal', 'bucket', 'eligibility_kind', 'fixed_spell_version_id',
    'current_spell_version_id', 'label', 'spell_level_min', 'spell_level_max',
    'allowed_spell_lists', 'allowed_schools', 'allowed_tags',
    'always_prepared', 'with_slots', 'free_cast', 'counts_against_limit',
    'required', 'is_locked', 'state',
    'orphan_reason_code', 'orphaned_by_change_group_id', 'orphaned_at',
    'prior_config', 'override_note', 'sort_order', 'notes', 'created_at',
    'updated_at', 'selection_collection', 'selection_eligibility',
    'selection_invalid_reason',
  ],
  spell_version_attack_modes: ['id', 'spell_version_id', 'attack_mode'],
  spell_version_conditions: ['id', 'spell_version_id', 'condition_type'],
  spell_version_damage_types: ['id', 'spell_version_id', 'damage_type'],
  spell_version_publications: [
    'id', 'spell_version_id', 'source_book', 'source_page',
    'source_reference', 'created_at', 'updated_at',
  ],
  spell_version_save_abilities: ['id', 'spell_version_id', 'save_ability'],
  spell_version_tags: ['id', 'spell_version_id', 'tag'],
  spell_versions: [
    'id', 'content_key', 'spell_identity_id', 'display_name', 'rules_edition',
    'level', 'school', 'ritual', 'concentration', 'casting_time', 'action_type',
    'range', 'duration', 'components', 'material_component_summary', 'healing',
    'short_summary', 'upcast_type', 'upcast_summary',
    'requires_mod_for_effect', 'effect_reliability_category', 'provenance',
    'seed_version', 'is_active', 'created_at', 'updated_at',
  ],
  subclass_definitions: [
    'id', 'content_key', 'class_definition_id', 'name', 'rules_edition',
    'spellcasting_ability', 'caster_fraction', 'caster_rounding', 'grant_rules',
    'created_at', 'updated_at',
  ],
  subclass_progressions: [
    'id', 'subclass_definition_id', 'class_level', 'cantrips_known',
    'prepared_count', 'max_spell_level', 'slots', 'grant_rules', 'created_at',
    'updated_at',
  ],
  warning_acknowledgements: [
    'id', 'character_id', 'warning_fingerprint', 'note', 'invalidated_at',
    'created_at', 'updated_at',
  ],
  wizard_spellbook_entries: [
    'id', 'character_id', 'spell_version_id', 'created_at', 'updated_at',
  ],
};

/**
 * SHA-256 of the ordered `PRAGMA table_info` metadata — declared types,
 * nullability, defaults, primary keys and column order — over every table.
 *
 * THE DERIVATION CHAIN, WHICH IS WHAT KEEPS THIS AN INDEPENDENT ORACLE.
 * The 38-table value was recorded by running the LARAVEL MIGRATIONS against an
 * in-memory SQLite database, before any of this existed. Dropping the eight
 * Laravel-only tables invalidates it, and recomputing it from our own generated
 * artifact would turn the assertion into a tautology — the one thing a parity
 * oracle may never become. So it is re-derived from the FROZEN pre-Drizzle
 * artifact instead (`tests/fixtures/schema-pre-drizzle.sql`, the hand-written
 * file transcribed from those migrations, untouched by this change), and the
 * test below proves all three links:
 *
 *   fa0e4e9f… = signature(pre-Drizzle fixture, all 38 tables)
 *               → the fixture really is the artifact the Laravel value came from
 *   d83f8a8d… = signature(pre-Drizzle fixture, minus the eight)
 *               → the new expectation, still Laravel-derived
 *             = signature(schema.sql)
 *               → what is actually under test
 *
 * THE FOUR NATIVE WEAPON TABLES ARE EXCLUDED, NOT REHASHED. They reproduce no
 * Laravel migration, so folding them in would move a constant whose whole
 * value is that it came from somewhere else. They are held to hand-written
 * expectations instead, and filtering rather than regenerating is what lets
 * this constant stay frozen: no Laravel table's metadata can drift without
 * moving it.
 */
const laravelColumnMetadataHash =
  'd83f8a8d32c1ccef3317e8935b634268ff9adb575724bedd2370f6cfc5716329';

/** The same value before the eight Laravel-only tables were dropped. */
const laravelColumnMetadataHashWithInfrastructure =
  'fa0e4e9f2af9531e8b66b296660b5db7e28a5c6c2ceda00859c904fe6a4d1b11';

/**
 * THE NATIVE TABLES — everything this project added that reproduces no Laravel
 * migration.
 *
 * Held to the same standard as the Laravel 38 and by the same means: these
 * lists are hand-transcribed from `.claude/plans/weapons-design.md` §4, which
 * was written before `db/schema/weapons.ts` existed. They are an expectation,
 * not an echo, and they must not be regenerated from `PRAGMA table_info`
 * either — a test that reprints our own output cannot fail.
 */
const expectedNativeColumns: Record<string, string[]> = {
  character_weapons: [
    'id', 'character_id', 'name', 'damage_dice', 'damage_type',
    'versatile_damage_dice', 'finesse', 'heavy', 'light', 'loading', 'reach',
    'thrown', 'two_handed', 'ammunition', 'ammunition_kind',
    'range_normal_feet', 'range_long_feet', 'mastery_property',
    'mastery_selected', 'other_properties', 'notes', 'created_at',
    'updated_at',
  ],
  class_weapon_mastery_counts: [
    'id', 'class_definition_id', 'class_level', 'mastery_count', 'created_at',
    'updated_at',
  ],
  class_weapon_mastery_grants: [
    'id', 'class_definition_id', 'grant', 'created_at', 'updated_at',
  ],
  weapon_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'srd_group', 'damage_dice',
    'damage_type', 'versatile_damage_dice', 'finesse', 'heavy', 'light',
    'loading', 'reach', 'thrown', 'two_handed', 'ammunition',
    'ammunition_kind', 'range_normal_feet', 'range_long_feet',
    'mastery_property', 'other_properties', 'created_at', 'updated_at',
  ],
  // The six origins tables, transcribed the same way from the origins design
  // rather than read back out of `PRAGMA table_info`.
  species_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'creature_type', 'size',
    'alternate_size', 'base_speed_feet', 'created_at', 'updated_at',
  ],
  species_template_traits: [
    'id', 'species_template_id', 'sort_order', 'name', 'description',
    'effect_kind', 'effect_damage_type', 'effect_hit_points_flat',
    'effect_hit_points_per_level', 'effect_speed_bonus_feet', 'created_at',
    'updated_at',
  ],
  character_species: [
    'id', 'character_id', 'name', 'creature_type', 'size', 'base_speed_feet',
    'notes', 'created_at', 'updated_at',
  ],
  character_species_traits: [
    'id', 'character_id', 'sort_order', 'name', 'description', 'effect_kind',
    'effect_damage_type', 'effect_hit_points_flat',
    'effect_hit_points_per_level', 'effect_speed_bonus_feet', 'notes',
    'created_at', 'updated_at',
  ],
  background_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'ability_score_1',
    'ability_score_2', 'ability_score_3', 'feat_name', 'skill_proficiency_1',
    'skill_proficiency_2', 'tool_proficiency', 'equipment_option_a',
    'equipment_option_b', 'created_at', 'updated_at',
  ],
  character_background: [
    'id', 'character_id', 'name', 'ability_score_1', 'ability_score_2',
    'ability_score_3', 'feat_name', 'skill_proficiency_1',
    'skill_proficiency_2', 'tool_proficiency', 'equipment_option_a',
    'equipment_option_b', 'notes', 'created_at', 'updated_at',
  ],
  // --- SHEET CORE (D11 part 1, D12) ---------------------------------------
  // Seven class-content tables plus the armour catalog. Transcribed by reading
  // the declarations in `db/schema/sheet.ts`, for the same reason the weapon
  // lists above are transcribed rather than generated: an expectation produced
  // from `PRAGMA table_info` reprints our own output and cannot fail.
  armor_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'category', 'armor_class',
    'dex_bonus', 'dex_bonus_max', 'strength_requirement',
    'stealth_disadvantage', 'created_at', 'updated_at',
  ],
  class_armor_training: [
    'id', 'class_definition_id', 'category', 'created_at', 'updated_at',
  ],
  class_extra_attack_grants: [
    'id', 'class_definition_id', 'class_level', 'attack_count', 'created_at',
    'updated_at',
  ],
  class_martial_arts_dice: [
    'id', 'class_definition_id', 'class_level', 'martial_arts_die',
    'created_at', 'updated_at',
  ],
  class_saving_throw_proficiencies: [
    'id', 'class_definition_id', 'ability', 'created_at', 'updated_at',
  ],
  class_sheet_traits: [
    'id', 'class_definition_id', 'hit_die', 'skill_choice_count',
    'skill_choice_from_any', 'created_at', 'updated_at',
  ],
  class_skill_options: [
    'id', 'class_definition_id', 'skill', 'created_at', 'updated_at',
  ],
  class_weapon_proficiencies: [
    'id', 'class_definition_id', 'category', 'property_qualifier', 'created_at',
    'updated_at',
  ],
  // D19's two class-feature tables, transcribed from the declarations in
  // `db/schema/catalog-classes.ts` for the same reason every list here is
  // transcribed: an expectation produced from `PRAGMA table_info` reprints our
  // own output and cannot fail.
  named_features: [
    'id', 'content_key', 'class_definition_id', 'name', 'rules_edition',
    'prerequisite', 'description', 'class_level', 'effect_kind',
    'effect_attack_count', 'effect_weapon_scope', 'created_at', 'updated_at',
  ],
  subclass_features: [
    'id', 'subclass_definition_id', 'class_level', 'sort_order', 'name',
    'description', 'effect_kind', 'effect_attack_count', 'effect_weapon_scope',
    'created_at', 'updated_at',
  ],
  // The four STORED SHEET INPUTS, transcribed from the declarations in
  // `db/schema/sheet-inputs.ts` for the same reason every list here is
  // transcribed: an expectation produced from `PRAGMA table_info` reprints our
  // own output and cannot fail.
  //
  // `character_armor`'s fillable columns are deliberately the SAME NAMES as
  // `armor_templates`' above, because picking a template is a column-wise copy
  // (D1b) — plus `slot`, which is where the user put it rather than what it is,
  // and `notes`.
  character_armor: [
    'id', 'character_id', 'slot', 'name', 'category', 'armor_class',
    'dex_bonus', 'dex_bonus_max', 'strength_requirement',
    'stealth_disadvantage', 'notes', 'created_at', 'updated_at',
  ],
  character_hit_point_rolls: [
    'id', 'character_id', 'class_name', 'class_level', 'rolled_value',
    'created_at', 'updated_at',
  ],
  // NO `proficient` COLUMN, and its absence is the assertion: presence of the
  // row IS the value, so a `proficient = 0` row cannot exist to mean the same
  // thing as no row.
  character_skill_proficiencies: [
    'id', 'character_id', 'skill', 'created_at', 'updated_at',
  ],
  character_sheet_adjustments: [
    'id', 'character_id', 'armor_class_adjustment',
    'armor_class_adjustment_note', 'created_at', 'updated_at',
  ],
};

const expectedNativeNotNull: Record<string, string[]> = {
  // `damage_dice`, `damage_type` and `mastery_property` are NULLABLE here and
  // NOT NULL on the template: a half-entered user weapon is a first-class
  // state, and an invented weapon need not have a mastery property at all.
  character_weapons: [
    'id', 'character_id', 'name', 'finesse', 'heavy', 'light', 'loading',
    'reach', 'thrown', 'two_handed', 'ammunition', 'mastery_selected',
  ],
  class_weapon_mastery_counts: [
    'id', 'class_definition_id', 'class_level', 'mastery_count',
  ],
  class_weapon_mastery_grants: ['id', 'class_definition_id', 'grant'],
  weapon_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'srd_group', 'damage_dice',
    'damage_type', 'finesse', 'heavy', 'light', 'loading', 'reach', 'thrown',
    'two_handed', 'ammunition', 'mastery_property',
  ],
  // Same asymmetry as the weapon pair, and for the same reason: the TEMPLATE
  // is NOT NULL where every printed species states a value, the CHARACTER'S
  // copy is nullable because half-entered is a first-class state.
  species_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'creature_type', 'size',
    'base_speed_feet',
  ],
  species_template_traits: [
    'id', 'species_template_id', 'sort_order', 'name', 'description',
  ],
  character_species: ['id', 'character_id', 'name'],
  character_species_traits: ['id', 'character_id', 'sort_order', 'name'],
  background_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'ability_score_1',
    'ability_score_2', 'ability_score_3', 'feat_name', 'skill_proficiency_1',
    'skill_proficiency_2', 'tool_proficiency', 'equipment_option_a',
    'equipment_option_b',
  ],
  character_background: ['id', 'character_id', 'name'],
  // Sheet core. `dex_bonus_max` and `strength_requirement` are the only
  // nullable columns across all eight, and both are D6b limb 2 — the source
  // genuinely prints no value (Light armour has no Dex cap, Heavy has no Dex
  // term at all, and ten of thirteen rows print an em-dash for Strength).
  // `property_qualifier` is the third, null for the ten classes whose weapon
  // proficiency carries no "that have the Light property" qualification.
  armor_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'category', 'armor_class',
    'dex_bonus', 'stealth_disadvantage',
  ],
  class_armor_training: ['id', 'class_definition_id', 'category'],
  class_extra_attack_grants: [
    'id', 'class_definition_id', 'class_level', 'attack_count',
  ],
  class_martial_arts_dice: [
    'id', 'class_definition_id', 'class_level', 'martial_arts_die',
  ],
  class_saving_throw_proficiencies: ['id', 'class_definition_id', 'ability'],
  class_sheet_traits: [
    'id', 'class_definition_id', 'hit_die', 'skill_choice_count',
    'skill_choice_from_any',
  ],
  class_skill_options: ['id', 'class_definition_id', 'skill'],
  class_weapon_proficiencies: ['id', 'class_definition_id', 'category'],
  // The four stored sheet inputs. `dex_bonus_max` and `strength_requirement`
  // are nullable on `character_armor` for exactly the reason they are nullable
  // on `armor_templates` — D6b limb 2, the source prints no value — and
  // `character_armor.notes` and `character_sheet_adjustments`
  // `.armor_class_adjustment_note` are nullable because a user may record
  // armour or an adjustment without explaining it.
  //
  // `character_sheet_adjustments.armor_class_adjustment` IS NOT NULL with a
  // default of 0, and that pairing is what makes an absent ROW and a stored
  // zero mean the same thing rather than two different things.
  character_armor: [
    'id', 'character_id', 'slot', 'name', 'category', 'armor_class',
    'dex_bonus', 'stealth_disadvantage',
  ],
  character_hit_point_rolls: [
    'id', 'character_id', 'class_name', 'class_level', 'rolled_value',
  ],
  character_skill_proficiencies: ['id', 'character_id', 'skill'],
  character_sheet_adjustments: [
    'id', 'character_id', 'armor_class_adjustment',
  ],
  // D19, and the ABSENCE of the three `effect_*` columns from both lists is the
  // assertion that matters: `description` is NOT NULL on both tables and every
  // effect column is nullable on both, which IS the D12 shape — a feature is
  // free text plus an OPTIONAL mechanical effect, and most features have none.
  // `named_features.prerequisite` is NOT NULL for the reason spelled out on the
  // column: a row exists in that table only because it is conditional, so an
  // absent condition is a parse that missed a line.
  named_features: [
    'id', 'content_key', 'class_definition_id', 'name', 'rules_edition',
    'prerequisite', 'description', 'class_level',
  ],
  subclass_features: [
    'id', 'subclass_definition_id', 'class_level', 'sort_order', 'name',
    'description',
  ],
};

const laravelTableNames = new Set(Object.keys(expectedColumns));

/** The eight tables this schema no longer declares, named rather than derived. */
const droppedInfrastructureTables = [
  'cache',
  'cache_locks',
  'failed_jobs',
  'job_batches',
  'jobs',
  'password_reset_tokens',
  'sessions',
  'users',
];

const expectedNotNull: Record<string, string[]> = {
  background_definitions: ['id', 'content_key', 'name', 'rules_edition', 'repeatable'],
  change_log: ['id', 'character_id', 'sequence', 'entity_type', 'action_type', 'reversible'],
  character_class_levels: ['id', 'character_id', 'class_definition_id', 'level', 'is_starting_class'],
  character_operations: ['id', 'character_id', 'operation_uuid', 'expected_revision', 'resulting_revision', 'inverse_command'],
  character_rule_overrides: ['id', 'character_id', 'rule_key', 'value'],
  character_save_points: ['id', 'character_id', 'label', 'snapshot', 'schema_version'],
  character_source_instances: ['id', 'character_id', 'instance_uuid', 'source_type', 'display_name', 'state'],
  character_spell_preferences: ['id', 'character_id', 'spell_version_id', 'favourite'],
  characters: [
    'id', 'name', 'strength', 'dexterity', 'constitution', 'intelligence',
    'wisdom', 'charisma', 'rules_edition_preference', 'allow_legacy', 'revision',
  ],
  class_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'progression_type',
    'supports_ritual_casting',
  ],
  class_progressions: ['id', 'class_definition_id', 'class_level', 'cantrips_known', 'prepared_count'],
  feat_definitions: ['id', 'content_key', 'name', 'rules_edition', 'repeatable'],
  species_definitions: ['id', 'content_key', 'name', 'rules_edition', 'repeatable'],
  spell_identities: ['id', 'content_key', 'canonical_name', 'normalized_name'],
  spell_identity_aliases: ['id', 'spell_identity_id', 'alias', 'normalized_alias'],
  spell_list_memberships: ['id', 'spell_version_id', 'spell_list_key'],
  spell_loadout_entries: ['id', 'spell_loadout_id', 'spell_version_id', 'role'],
  spell_loadouts: ['id', 'character_id', 'name'],
  spell_selection_slots: [
    'id', 'character_id', 'source_instance_id', 'slot_key', 'rule_key',
    'ordinal', 'bucket', 'eligibility_kind', 'spell_level_min',
    'spell_level_max', 'always_prepared', 'with_slots',
    'counts_against_limit', 'required', 'is_locked', 'state', 'sort_order',
    'selection_eligibility',
  ],
  spell_version_attack_modes: ['id', 'spell_version_id', 'attack_mode'],
  spell_version_conditions: ['id', 'spell_version_id', 'condition_type'],
  spell_version_damage_types: ['id', 'spell_version_id', 'damage_type'],
  spell_version_publications: ['id', 'spell_version_id', 'source_book'],
  spell_version_save_abilities: ['id', 'spell_version_id', 'save_ability'],
  spell_version_tags: ['id', 'spell_version_id', 'tag'],
  spell_versions: [
    'id', 'content_key', 'spell_identity_id', 'display_name', 'rules_edition',
    'level', 'school', 'ritual', 'concentration', 'healing',
    'requires_mod_for_effect', 'effect_reliability_category', 'provenance',
    'is_active',
  ],
  subclass_definitions: ['id', 'content_key', 'class_definition_id', 'name', 'rules_edition'],
  subclass_progressions: [
    'id', 'subclass_definition_id', 'class_level', 'cantrips_known',
    'prepared_count', 'max_spell_level',
  ],
  warning_acknowledgements: ['id', 'character_id', 'warning_fingerprint'],
  wizard_spellbook_entries: ['id', 'character_id', 'spell_version_id'],
};

/** Every table in the database, Laravel and native alike. */
const allExpectedColumns: Record<string, string[]> = {
  ...expectedColumns,
  ...expectedNativeColumns,
};

const allExpectedNotNull: Record<string, string[]> = {
  ...expectedNotNull,
  ...expectedNativeNotNull,
};

const expectedNamedIndexes: Record<string, string> = {
  background_definitions_content_key_unique:
    'background_definitions:content_key:unique',
  background_definitions_name_rules_edition_unique:
    'background_definitions:name,rules_edition:unique',
  change_log_character_id_group_id_index: 'change_log:character_id,group_id',
  change_log_character_id_sequence_unique:
    'change_log:character_id,sequence:unique',
  change_log_operation_uuid_index: 'change_log:operation_uuid',
  character_operations_character_id_resulting_revision_index:
    'character_operations:character_id,resulting_revision',
  character_operations_operation_uuid_unique:
    'character_operations:operation_uuid:unique',
  character_weapons_character_id_index: 'character_weapons:character_id',
  class_weapon_mastery_counts_class_definition_id_class_level_unique:
    'class_weapon_mastery_counts:class_definition_id,class_level:unique',
  class_weapon_mastery_grants_class_definition_id_unique:
    'class_weapon_mastery_grants:class_definition_id:unique',
  weapon_templates_content_key_unique: 'weapon_templates:content_key:unique',
  species_templates_content_key_unique: 'species_templates:content_key:unique',
  species_templates_name_rules_edition_unique:
    'species_templates:name,rules_edition:unique',
  species_template_traits_template_sort_unique:
    'species_template_traits:species_template_id,sort_order:unique',
  species_template_traits_template_name_unique:
    'species_template_traits:species_template_id,name:unique',
  named_features_content_key_unique: 'named_features:content_key:unique',
  named_features_class_name_rules_edition_unique:
    'named_features:class_definition_id,name,rules_edition:unique',
  subclass_features_subclass_sort_unique:
    'subclass_features:subclass_definition_id,sort_order:unique',
  subclass_features_subclass_name_unique:
    'subclass_features:subclass_definition_id,name:unique',
  background_templates_content_key_unique:
    'background_templates:content_key:unique',
  background_templates_name_rules_edition_unique:
    'background_templates:name,rules_edition:unique',
  character_species_character_id_unique:
    'character_species:character_id:unique',
  character_species_traits_character_id_index:
    'character_species_traits:character_id',
  character_background_character_id_unique:
    'character_background:character_id:unique',
  // --- THE FOUR STORED SHEET INPUTS ---------------------------------------
  // Every one is UNIQUE and there is no plain index beside any of them: each
  // unique index already serves the `WHERE character_id = ?` read, and the
  // uniqueness is a cardinality claim the derivation depends on — one row per
  // slot, one roll per (class, level), one row per skill, one adjustment per
  // character.
  character_armor_character_id_slot_unique:
    'character_armor:character_id,slot:unique',
  character_hit_point_rolls_character_id_class_name_class_level_unique:
    'character_hit_point_rolls:character_id,class_name,class_level:unique',
  character_skill_proficiencies_character_id_skill_unique:
    'character_skill_proficiencies:character_id,skill:unique',
  character_sheet_adjustments_character_id_unique:
    'character_sheet_adjustments:character_id:unique',
  // --- SHEET CORE (D11/D12) -----------------------------------------------
  // The set tables are keyed on (class, member) so a class cannot be given the
  // same saving throw, skill, armour category or weapon category twice; the two
  // progressions on (class, level) exactly as the mastery counts are; and
  // `class_sheet_traits` on the class alone, because it is 1:0..1 and its row's
  // EXISTENCE is what records that the class was parsed at all.
  armor_templates_content_key_unique: 'armor_templates:content_key:unique',
  class_sheet_traits_class_definition_id_unique:
    'class_sheet_traits:class_definition_id:unique',
  class_saving_throw_proficiencies_class_definition_id_ability_unique:
    'class_saving_throw_proficiencies:class_definition_id,ability:unique',
  class_skill_options_class_definition_id_skill_unique:
    'class_skill_options:class_definition_id,skill:unique',
  class_armor_training_class_definition_id_category_unique:
    'class_armor_training:class_definition_id,category:unique',
  class_weapon_proficiencies_class_definition_id_category_unique:
    'class_weapon_proficiencies:class_definition_id,category:unique',
  class_extra_attack_grants_class_definition_id_class_level_unique:
    'class_extra_attack_grants:class_definition_id,class_level:unique',
  class_martial_arts_dice_class_definition_id_class_level_unique:
    'class_martial_arts_dice:class_definition_id,class_level:unique',
  character_rule_overrides_character_id_rule_key_unique:
    'character_rule_overrides:character_id,rule_key:unique',
  character_class_levels_character_id_class_definition_id_unique:
    'character_class_levels:character_id,class_definition_id:unique',
  character_source_instances_character_id_state_index:
    'character_source_instances:character_id,state',
  character_source_instances_id_character_id_unique:
    'character_source_instances:id,character_id:unique',
  character_source_instances_instance_uuid_unique:
    'character_source_instances:instance_uuid:unique',
  character_spell_preferences_character_id_spell_version_id_unique:
    'character_spell_preferences:character_id,spell_version_id:unique',
  class_definitions_content_key_unique:
    'class_definitions:content_key:unique',
  class_definitions_name_rules_edition_unique:
    'class_definitions:name,rules_edition:unique',
  class_progressions_class_definition_id_class_level_unique:
    'class_progressions:class_definition_id,class_level:unique',
  feat_definitions_content_key_unique: 'feat_definitions:content_key:unique',
  feat_definitions_name_rules_edition_unique:
    'feat_definitions:name,rules_edition:unique',
  slots_character_collection_index:
    'spell_selection_slots:character_id,selection_collection',
  species_definitions_content_key_unique:
    'species_definitions:content_key:unique',
  species_definitions_name_rules_edition_unique:
    'species_definitions:name,rules_edition:unique',
  spell_identities_content_key_unique: 'spell_identities:content_key:unique',
  spell_identities_normalized_name_index:
    'spell_identities:normalized_name',
  spell_list_memberships_spell_list_key_index:
    'spell_list_memberships:spell_list_key',
  spell_identity_aliases_normalized_alias_unique:
    'spell_identity_aliases:normalized_alias:unique',
  spell_list_memberships_spell_version_id_spell_list_key_unique:
    'spell_list_memberships:spell_version_id,spell_list_key:unique',
  spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique:
    'spell_loadout_entries:spell_loadout_id,spell_version_id,role:unique',
  spell_selection_slots_character_id_slot_key_unique:
    'spell_selection_slots:character_id,slot_key:unique',
  spell_selection_slots_character_id_bucket_index:
    'spell_selection_slots:character_id,bucket',
  spell_selection_slots_character_id_state_index:
    'spell_selection_slots:character_id,state',
  spell_version_attack_modes_attack_mode_index:
    'spell_version_attack_modes:attack_mode',
  spell_version_attack_modes_spell_version_id_attack_mode_unique:
    'spell_version_attack_modes:spell_version_id,attack_mode:unique',
  spell_version_conditions_condition_type_index:
    'spell_version_conditions:condition_type',
  spell_version_conditions_spell_version_id_condition_type_unique:
    'spell_version_conditions:spell_version_id,condition_type:unique',
  spell_version_damage_types_damage_type_index:
    'spell_version_damage_types:damage_type',
  spell_version_damage_types_spell_version_id_damage_type_unique:
    'spell_version_damage_types:spell_version_id,damage_type:unique',
  spell_version_publications_spell_version_id_source_book_unique:
    'spell_version_publications:spell_version_id,source_book:unique',
  spell_version_save_abilities_save_ability_index:
    'spell_version_save_abilities:save_ability',
  spell_version_save_abilities_spell_version_id_save_ability_unique:
    'spell_version_save_abilities:spell_version_id,save_ability:unique',
  spell_version_tags_spell_version_id_tag_unique:
    'spell_version_tags:spell_version_id,tag:unique',
  spell_version_tags_tag_index: 'spell_version_tags:tag',
  spell_versions_is_active_index: 'spell_versions:is_active',
  spell_versions_content_key_unique: 'spell_versions:content_key:unique',
  spell_versions_rules_edition_level_index:
    'spell_versions:rules_edition,level',
  spell_versions_spell_identity_id_rules_edition_unique:
    'spell_versions:spell_identity_id,rules_edition:unique',
  subclass_definitions_class_definition_id_name_rules_edition_unique:
    'subclass_definitions:class_definition_id,name,rules_edition:unique',
  subclass_definitions_content_key_unique:
    'subclass_definitions:content_key:unique',
  subclass_definitions_id_class_definition_id_unique:
    'subclass_definitions:id,class_definition_id:unique',
  subclass_progressions_subclass_definition_id_class_level_unique:
    'subclass_progressions:subclass_definition_id,class_level:unique',
  warning_acknowledgements_character_id_warning_fingerprint_unique:
    'warning_acknowledgements:character_id,warning_fingerprint:unique',
  wizard_spellbook_entries_character_id_spell_version_id_unique:
    'wizard_spellbook_entries:character_id,spell_version_id:unique',
};

const expectedUniqueGroups: Record<string, string[]> = {
  background_definitions: ['content_key', 'name,rules_edition'],
  change_log: ['character_id,sequence'],
  character_class_levels: ['character_id,class_definition_id'],
  character_operations: ['operation_uuid'],
  character_rule_overrides: ['character_id,rule_key'],
  character_source_instances: ['id,character_id', 'instance_uuid'],
  character_spell_preferences: ['character_id,spell_version_id'],
  class_definitions: ['content_key', 'name,rules_edition'],
  class_progressions: ['class_definition_id,class_level'],
  class_weapon_mastery_counts: ['class_definition_id,class_level'],
  class_weapon_mastery_grants: ['class_definition_id'],
  weapon_templates: ['content_key'],
  species_templates: ['content_key', 'name,rules_edition'],
  species_template_traits: [
    'species_template_id,name', 'species_template_id,sort_order',
  ],
  background_templates: ['content_key', 'name,rules_edition'],
  character_species: ['character_id'],
  character_background: ['character_id'],
  character_armor: ['character_id,slot'],
  character_hit_point_rolls: ['character_id,class_name,class_level'],
  character_skill_proficiencies: ['character_id,skill'],
  character_sheet_adjustments: ['character_id'],
  // Sheet core. The set tables are keyed on (class, member) so a class cannot
  // hold the same saving throw, skill or category twice; the two progressions
  // on (class, level); and `class_sheet_traits` on the class alone, since it is
  // 1:0..1 and its row's existence records that the class was parsed.
  armor_templates: ['content_key'],
  class_sheet_traits: ['class_definition_id'],
  class_saving_throw_proficiencies: ['class_definition_id,ability'],
  class_skill_options: ['class_definition_id,skill'],
  class_armor_training: ['class_definition_id,category'],
  class_weapon_proficiencies: ['class_definition_id,category'],
  class_extra_attack_grants: ['class_definition_id,class_level'],
  class_martial_arts_dice: ['class_definition_id,class_level'],
  // D19. `named_features` repeats the `(owner, name, edition)` triple
  // `subclass_definitions` uses, so the seeder's upsert can yield a slot it
  // does not own rather than overwrite it; `subclass_features` is unique on
  // sort order AND on name, so neither the printed order nor the feature list
  // can carry a duplicate.
  named_features: ['class_definition_id,name,rules_edition', 'content_key'],
  subclass_features: [
    'subclass_definition_id,name', 'subclass_definition_id,sort_order',
  ],
  feat_definitions: ['content_key', 'name,rules_edition'],
  species_definitions: ['content_key', 'name,rules_edition'],
  spell_identities: ['content_key'],
  spell_identity_aliases: ['normalized_alias'],
  spell_list_memberships: ['spell_version_id,spell_list_key'],
  spell_loadout_entries: ['spell_loadout_id,spell_version_id,role'],
  spell_selection_slots: ['character_id,slot_key'],
  spell_version_attack_modes: ['spell_version_id,attack_mode'],
  spell_version_conditions: ['spell_version_id,condition_type'],
  spell_version_damage_types: ['spell_version_id,damage_type'],
  spell_version_publications: ['spell_version_id,source_book'],
  spell_version_save_abilities: ['spell_version_id,save_ability'],
  spell_version_tags: ['spell_version_id,tag'],
  spell_versions: ['content_key', 'spell_identity_id,rules_edition'],
  subclass_definitions: [
    'class_definition_id,name,rules_edition', 'content_key',
    'id,class_definition_id',
  ],
  subclass_progressions: ['subclass_definition_id,class_level'],
  warning_acknowledgements: ['character_id,warning_fingerprint'],
  wizard_spellbook_entries: ['character_id,spell_version_id'],
};

const expectedDefaults: Record<string, Record<string, string>> = {
  change_log: { reversible: "'1'" },
  character_class_levels: { is_starting_class: "'0'", level: "'1'" },
  character_source_instances: { state: "'active'" },
  character_spell_preferences: { favourite: "'0'" },
  characters: {
    allow_legacy: "'0'", charisma: "'10'", constitution: "'10'",
    dexterity: "'10'", intelligence: "'10'", revision: "'0'",
    rules_edition_preference: "'2024'", strength: "'10'", wisdom: "'10'",
  },
  class_definitions: {
    progression_type: "'none'", supports_ritual_casting: "'0'",
  },
  class_progressions: { cantrips_known: "'0'", prepared_count: "'0'" },
  // The eight property toggles plus the mastery flag. Every one of them
  // defaults to off, because "this weapon is not Finesse" is the overwhelming
  // majority case and a NULL there would mean nothing a user could act on.
  character_weapons: {
    ammunition: "'0'", finesse: "'0'", heavy: "'0'", light: "'0'",
    loading: "'0'", mastery_selected: "'0'", reach: "'0'", thrown: "'0'",
    two_handed: "'0'",
  },
  weapon_templates: {
    ammunition: "'0'", finesse: "'0'", heavy: "'0'", light: "'0'",
    loading: "'0'", reach: "'0'", rules_edition: "'2024'", thrown: "'0'",
    two_handed: "'0'",
  },
  feat_definitions: { repeatable: "'0'" },
  species_definitions: { repeatable: "'0'" },
  background_definitions: { repeatable: "'0'" },
  spell_selection_slots: {
    always_prepared: "'0'", counts_against_limit: "'1'",
    is_locked: "'0'", ordinal: "'0'", required: "'0'",
    selection_eligibility: "'unselected'", sort_order: "'0'",
    spell_level_max: "'9'", spell_level_min: "'0'", state: "'active'",
    with_slots: "'1'",
  },
  spell_versions: {
    concentration: "'0'", effect_reliability_category: "'fixed_effect'",
    healing: "'0'", is_active: "'1'", provenance: "'import'",
    requires_mod_for_effect: "'0'", ritual: "'0'",
  },
  subclass_progressions: {
    cantrips_known: "'0'", max_spell_level: "'0'", prepared_count: "'0'",
  },
};

const expectedForeignKeys: Record<string, string[]> = {
  change_log: ['character_id->characters.id|CASCADE'],
  character_class_levels: [
    'character_id->characters.id|CASCADE',
    'class_definition_id->class_definitions.id|NO ACTION',
    'subclass_definition_id,class_definition_id->subclass_definitions.id,class_definition_id|NO ACTION',
  ],
  character_operations: ['character_id->characters.id|CASCADE'],
  character_weapons: ['character_id->characters.id|CASCADE'],
  class_weapon_mastery_counts: [
    'class_definition_id->class_definitions.id|CASCADE',
  ],
  class_weapon_mastery_grants: [
    'class_definition_id->class_definitions.id|CASCADE',
  ],
  // Sheet core: seven identical cascading edges into class_definitions. Losing
  // a class takes its sheet content with it, which is right — the content is
  // meaningless without the class. `armor_templates` has NO foreign key, by
  // D1b: the catalog points at nothing, exactly as `weapon_templates` does not.
  class_sheet_traits: ['class_definition_id->class_definitions.id|CASCADE'],
  class_saving_throw_proficiencies: [
    'class_definition_id->class_definitions.id|CASCADE',
  ],
  class_skill_options: ['class_definition_id->class_definitions.id|CASCADE'],
  class_armor_training: ['class_definition_id->class_definitions.id|CASCADE'],
  class_weapon_proficiencies: [
    'class_definition_id->class_definitions.id|CASCADE',
  ],
  class_extra_attack_grants: [
    'class_definition_id->class_definitions.id|CASCADE',
  ],
  class_martial_arts_dice: [
    'class_definition_id->class_definitions.id|CASCADE',
  ],
  character_rule_overrides: ['character_id->characters.id|CASCADE'],
  character_save_points: ['character_id->characters.id|CASCADE'],
  character_source_instances: [
    'character_id->characters.id|CASCADE',
    'parent_source_instance_id->character_source_instances.id|SET NULL',
  ],
  character_spell_preferences: [
    'character_id->characters.id|CASCADE',
    'spell_version_id->spell_versions.id|NO ACTION',
  ],
  class_progressions: ['class_definition_id->class_definitions.id|CASCADE'],
  spell_identity_aliases: [
    'spell_identity_id->spell_identities.id|CASCADE',
  ],
  spell_list_memberships: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_loadout_entries: [
    'spell_loadout_id->spell_loadouts.id|CASCADE',
    'spell_version_id->spell_versions.id|NO ACTION',
  ],
  spell_loadouts: ['character_id->characters.id|CASCADE'],
  spell_selection_slots: [
    'character_id->characters.id|CASCADE',
    'current_spell_version_id->spell_versions.id|NO ACTION',
    'fixed_spell_version_id->spell_versions.id|NO ACTION',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
  ],
  spell_version_attack_modes: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_conditions: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_damage_types: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_publications: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_save_abilities: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_version_tags: ['spell_version_id->spell_versions.id|CASCADE'],
  spell_versions: ['spell_identity_id->spell_identities.id|CASCADE'],
  subclass_definitions: ['class_definition_id->class_definitions.id|CASCADE'],
  subclass_progressions: [
    'subclass_definition_id->subclass_definitions.id|CASCADE',
  ],
  // D19. A subclass feature cascades from its subclass; a named feature
  // cascades from the class whose LEVEL its prerequisite counts. Both are
  // meaningless without their parent, so both go with it.
  subclass_features: ['subclass_definition_id->subclass_definitions.id|CASCADE'],
  named_features: ['class_definition_id->class_definitions.id|CASCADE'],
  species_template_traits: [
    'species_template_id->species_templates.id|CASCADE',
  ],
  character_species: ['character_id->characters.id|CASCADE'],
  character_species_traits: ['character_id->characters.id|CASCADE'],
  character_background: ['character_id->characters.id|CASCADE'],
  // ONE EDGE EACH, and `character_hit_point_rolls` having only this one is the
  // assertion that matters: it holds a class NAME and deliberately NOT a
  // foreign key to `character_class_levels`, so deleting a class cannot cascade
  // away a die the player physically rolled.
  character_armor: ['character_id->characters.id|CASCADE'],
  character_hit_point_rolls: ['character_id->characters.id|CASCADE'],
  character_skill_proficiencies: ['character_id->characters.id|CASCADE'],
  character_sheet_adjustments: ['character_id->characters.id|CASCADE'],
  warning_acknowledgements: ['character_id->characters.id|CASCADE'],
  wizard_spellbook_entries: [
    'character_id->characters.id|CASCADE',
    'spell_version_id->spell_versions.id|NO ACTION',
  ],
};

let sqlite3: Sqlite3Static;
const openDatabases: Database[] = [];

function openDb(schemaSql: string): Database {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  openDatabases.push(db);
  db.exec(schemaSql);
  return db;
}

function rows(db: Database, sql: string): SqlRow[] {
  return db.selectObjects(sql) as SqlRow[];
}

function indexColumns(db: Database, indexName: string): string {
  return rows(db, `PRAGMA index_info("${indexName}")`)
    .sort((left, right) => Number(left.seqno) - Number(right.seqno))
    .map((row) => String(row.name))
    .join(',');
}

function uniqueGroups(db: Database, table: string): string[] {
  return rows(db, `PRAGMA index_list("${table}")`)
    .filter((row) => Number(row.unique) === 1 && row.origin !== 'pk')
    .map((row) => indexColumns(db, String(row.name)))
    .sort();
}

function foreignKeys(db: Database, table: string): string[] {
  const grouped = new Map<number, SqlRow[]>();
  for (const row of rows(db, `PRAGMA foreign_key_list("${table}")`)) {
    const id = Number(row.id);
    grouped.set(id, [...(grouped.get(id) ?? []), row]);
  }

  return [...grouped.values()]
    .map((group) => {
      const ordered = group.sort(
        (left, right) => Number(left.seq) - Number(right.seq),
      );
      const from = ordered.map((row) => String(row.from)).join(',');
      const to = ordered.map((row) => String(row.to)).join(',');
      return `${from}->${String(ordered[0]!.table)}.${to}|${String(ordered[0]!.on_delete)}`;
    })
    .sort();
}

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
});

afterAll(() => {
  for (const db of openDatabases) {
    db.close();
  }
});

// Every expectation above is transcribed from the Laravel migrations and is
// independent of how the artifact is produced. Running the SAME expectations
// against each artifact is what makes the generated schema's parity provable
// rather than assumed.
for (const [sourceLabel, schemaSql] of schemaSources) {
describe(`complete final migration schema (${sourceLabel})`, () => {
  it('creates the exact 30-table Laravel inventory plus the twenty-four named native tables, and every column of both', () => {
    const db = openDb(schemaSql);
    const tables = db.selectValues(
      `SELECT name
       FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    );

    // The claim is no longer "exactly the Laravel migrations" but "exactly the
    // SURVIVING Laravel migrations PLUS these named native tables". A table in
    // neither list still fails, which is the property that mattered.
    //
    // Both halves are counted, because a single total would let one grow while
    // the other shrank: 30 Laravel tables (38 less the eight infrastructure
    // ones that were pruned) and 24 native — 4 weapons, 6 origins, 8 sheet
    // core, 2 class features and the 4 stored sheet inputs.
    expect(tables).toEqual(Object.keys(allExpectedColumns).sort());
    expect(Object.keys(expectedColumns)).toHaveLength(30);
    expect(Object.keys(expectedNativeColumns)).toHaveLength(24);
    // ones that were pruned) and 12 native — the four weapon tables plus the
    // eight of the sheet core.
    expect(tables).toEqual(Object.keys(allExpectedColumns).sort());
    expect(Object.keys(expectedColumns)).toHaveLength(30);

    for (const [table, columns] of Object.entries(allExpectedColumns)) {
      const metadata = rows(db, `PRAGMA table_info("${table}")`);
      expect(
        metadata.map((row) => row.name),
        `columns for ${table}`,
      ).toEqual(columns);
      expect(
        metadata
          .filter((row) => Number(row.notnull) === 1)
          .map((row) => String(row.name)),
        `NOT NULL columns for ${table}`,
      ).toEqual(allExpectedNotNull[table]);
    }
    // Computed over the Laravel subset ONLY. Filtering rather than rehashing is
    // what lets the frozen constant stay frozen: the native tables are held to
    // the hand-written expectations above instead, and no Laravel table's
    // metadata can drift without moving this.
    const laravelTables = tables.filter((table) =>
      laravelTableNames.has(String(table)),
    );
    expect(laravelTables).toHaveLength(30);
    const metadataSignature = laravelTables.map((table) => [
      table,
      rows(db, `PRAGMA table_info("${String(table)}")`).map((column) => [
        column.name,
        String(column.type).toLowerCase(),
        Number(column.notnull),
        column.dflt_value,
        Number(column.pk),
      ]),
    ]);
    expect(
      createHash('sha256')
        .update(JSON.stringify(metadataSignature))
        .digest('hex'),
    ).toBe(laravelColumnMetadataHash);

    for (const dropped of droppedInfrastructureTables) {
      expect(tables).not.toContain(dropped);
    }
    expect(tables).not.toContain('wizard_prepared_entries');
    expect(expectedColumns.wizard_spellbook_entries).not.toContain('acquisition');
    expect(expectedColumns.spell_selection_slots).toContain(
      'selection_eligibility',
    );
  });

  it('materializes every named index, unique key, and migrated default', () => {
    const db = openDb(schemaSql);
    const actualNamedIndexes: Record<string, string> = {};
    for (const index of rows(
      db,
      `SELECT name, tbl_name
       FROM sqlite_schema
       WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )) {
      const name = String(index.name);
      const unique = rows(
        db,
        `PRAGMA index_list("${String(index.tbl_name)}")`,
      ).find((candidate) => candidate.name === name)?.unique;
      actualNamedIndexes[name] =
        `${String(index.tbl_name)}:${indexColumns(db, name)}` +
        (Number(unique) === 1 ? ':unique' : '');
    }
    expect(actualNamedIndexes).toEqual(expectedNamedIndexes);

    for (const table of Object.keys(allExpectedColumns)) {
      expect(uniqueGroups(db, table), `unique keys for ${table}`).toEqual(
        [...(expectedUniqueGroups[table] ?? [])].sort(),
      );
    }

    for (const [table, expected] of Object.entries(expectedDefaults)) {
      const actual = Object.fromEntries(
        rows(db, `PRAGMA table_info("${table}")`)
          .filter((row) => row.dflt_value !== null)
          .map((row) => [String(row.name), String(row.dflt_value)]),
      );
      expect(actual, `defaults for ${table}`).toEqual(expected);
    }
  });

  it('declares every migrated foreign key with its composite shape and action', () => {
    const db = openDb(schemaSql);
    for (const table of Object.keys(allExpectedColumns)) {
      expect(foreignKeys(db, table), `foreign keys for ${table}`).toEqual(
        [...(expectedForeignKeys[table] ?? [])].sort(),
      );
    }
  });

  it('persists SET NULL and CASCADE effects and rejects duplicate operations', () => {
    const db = openDb(schemaSql);
    db.exec(`
      INSERT INTO characters (name) VALUES ('Schema Character');
      INSERT INTO character_source_instances
        (character_id, instance_uuid, source_type, display_name)
      VALUES (1, 'parent', 'species', 'Human');
      INSERT INTO character_source_instances
        (character_id, instance_uuid, parent_source_instance_id, source_type, display_name)
      VALUES (1, 'child', 1, 'feat', 'Magic Initiate');
      INSERT INTO character_operations
        (character_id, operation_uuid, expected_revision, resulting_revision, inverse_command)
      VALUES (1, 'operation-1', 0, 1, '{"type":"restore_snapshot"}');
      DELETE FROM character_source_instances WHERE id = 1;
    `);

    expect(
      rows(
        db,
        `SELECT id, parent_source_instance_id
         FROM character_source_instances`,
      ),
    ).toEqual([{ id: 2, parent_source_instance_id: null }]);

    expect(() =>
      db.exec(`
        INSERT INTO character_operations
          (character_id, operation_uuid, expected_revision, resulting_revision, inverse_command)
        VALUES (1, 'operation-1', 1, 2, '{}');
      `),
    ).toThrow(/UNIQUE constraint failed: character_operations\.operation_uuid/);

    db.exec('DELETE FROM characters WHERE id = 1');
    expect(
      db.selectValue('SELECT count(*) FROM character_source_instances'),
    ).toBe(0);
    expect(db.selectValue('SELECT count(*) FROM character_operations')).toBe(0);
  });
});
}

/**
 * THE PROOF THAT THE PRUNED HASH IS STILL LARAVEL-DERIVED.
 *
 * Dropping the eight Laravel-only tables invalidated a constant that came from
 * running the Laravel migrations. The replacement is NOT recomputed from the
 * artifact it judges — that would be an expectation regenerated from our own
 * output, which is exactly what a parity oracle must never be. It is recomputed
 * from the frozen hand-written artifact, which this change does not touch, and
 * the link back to the original Laravel value is asserted rather than assumed.
 *
 * Both links can fail: change a column type in `db/schema/*.ts` and the third
 * assertion breaks; edit the fixture and the first one does.
 */
describe('the pruned column-metadata hash is derived from Laravel, not from us', () => {
  function metadataHash(schemaSql: string, skip: readonly string[]): string {
    const db = openDb(schemaSql);
    const tables = db
      .selectValues(
        `SELECT name
         FROM sqlite_schema
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .map(String)
      .filter((table) => !skip.includes(table));
    const signature = tables.map((table) => [
      table,
      rows(db, `PRAGMA table_info("${table}")`).map((column) => [
        column.name,
        String(column.type).toLowerCase(),
        Number(column.notnull),
        column.dflt_value,
        Number(column.pk),
      ]),
    ]);
    return createHash('sha256').update(JSON.stringify(signature)).digest('hex');
  }

  it('reproduces the original 38-table Laravel value from the frozen fixture', () => {
    expect(metadataHash(preDrizzleSchema, [])).toBe(
      laravelColumnMetadataHashWithInfrastructure,
    );
  });

  it('yields the pruned value from that same fixture, minus the eight tables', () => {
    expect(metadataHash(preDrizzleSchema, droppedInfrastructureTables)).toBe(
      laravelColumnMetadataHash,
    );
  });

  /*
   * The third link. The ten native tables — four weapons, six origins — are
   * excluded because they
   * reproduce no Laravel migration and the constant on the right is
   * Laravel-derived; including them would force the constant to be recomputed
   * from our own artifact, which is the tautology this whole chain exists to
   * avoid. They are not thereby unchecked — `expectedNativeColumns` and
   * `expectedNativeNotNull` hold them to hand-written expectations transcribed
   * from the design, and the exclusion list is asserted to be exactly those
   * twenty-four, so a twenty-fifth native table cannot slip past unhashed AND
   * unexpected.
   */
  it('and the generated artifact matches it, skipping only the twenty-four native tables', () => {
    // 4 weapons + 8 sheet core + 6 origins + 2 class features + 4 sheet inputs.
    // Excluded because
    // they reproduce no Laravel migration; the constant on the right is
    // Laravel-derived, and folding them in would force it to be recomputed from
    // our own artifact.
    const nativeTables = Object.keys(expectedNativeColumns);
    expect(nativeTables).toHaveLength(24);
    for (const [, schemaSql] of schemaSources) {
      expect(metadataHash(schemaSql, nativeTables)).toBe(
        laravelColumnMetadataHash,
      );
    }
  });
});
