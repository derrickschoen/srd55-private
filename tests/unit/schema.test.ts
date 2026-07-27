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
 * THE COLUMN INVENTORY — every table this schema declares, one hand-written
 * entry each.
 *
 * This is NOT a parity record and no longer splits Laravel-inherited tables
 * from native ones; D7 retired that goal and F10 measured what the split was
 * costing. What survives is the one thing this inventory catches that nothing
 * else in the suite does: a SURPLUS column. A MISSING column breaks an
 * integration test or a row contract, but 29 of the 56 tables have no row
 * contract at all, so a column that appears and is read by nothing is invisible
 * everywhere else.
 *
 * Column ORDER is deliberately NOT pinned — both sides are sorted before
 * comparison. Measured: nothing in this codebase can observe it. There is no
 * positional `INSERT INTO t VALUES (…)` anywhere in `src/`, backup export is
 * `SELECT *` into keyed JSON validated by `z.strictObject`, and the only hash
 * over row data hashes content keys rather than column positions. Freezing the
 * order was Laravel's requirement, not this project's.
 *
 * These lists are transcribed by hand and must NEVER be regenerated from
 * `PRAGMA table_info`: an expectation reprinted from the artifact under test
 * cannot fail.
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

  // --- TABLES THIS PROJECT ADDED -------------------------------------------
  // These used to live in a separate `expectedNativeColumns` object for one
  // reason only: the Laravel column-metadata hash was computed over the tables
  // above and these had to be filtered out of its input. That hash no longer
  // judges the generated schema, so the split has nothing left to mean and
  // there is one inventory.
  //
  // The four weapon lists are transcribed from `.claude/plans/weapons-design.md`
  // §4, written before `db/schema/weapons.ts` existed. The rest are transcribed
  // from the declarations in `db/schema/*.ts` — an honest weakness, since a
  // hand-copy of the code under test catches a change made in one place and not
  // the other but not a change made in both. It is recorded here rather than
  // dressed up.
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
    'created_at', 'updated_at',
  ],
  // The CATALOG half of the inverted effect model: what a printed trait GRANTS.
  // The five `effect_*` columns that used to sit on the trait row above are
  // here, one row per effect, so a trait granting two is two rows.
  species_template_trait_effects: [
    'id', 'species_template_trait_id', 'sort_order', 'effect_kind',
    'damage_type', 'hit_points_flat', 'hit_points_per_level',
    'speed_bonus_feet', 'created_at', 'updated_at',
  ],
  character_species: [
    'id', 'character_id', 'name', 'creature_type', 'size', 'base_speed_feet',
    'notes', 'created_at', 'updated_at',
  ],
  character_species_traits: [
    'id', 'character_id', 'sort_order', 'name', 'description', 'notes',
    'created_at', 'updated_at',
  ],
  // The CHARACTER half: what this character HAS. Keyed on `character_id` and
  // not on the trait, which is what lets a feat or a subclass grant one and
  // what stops a trait being the thing an effect hangs from.
  character_effects: [
    'id', 'character_id', 'sort_order', 'effect_kind', 'damage_type',
    'hit_points_flat', 'hit_points_per_level', 'speed_bonus_feet',
    'source_instance_id', 'label', 'notes', 'created_at', 'updated_at',
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

/**
 * WHICH COLUMNS REJECT A NULL WRITE. Behaviour, not inventory: NOT NULL is the
 * only property here that refuses a statement outright, and it is recorded
 * nowhere else that is not generated from these same declarations.
 *
 * Compared as a SET, for the same reason the column inventory is: the position
 * a NOT NULL column occupies in the table is not something any caller can see.
 */
const expectedNotNull: Record<string, string[]> = {
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
  // `effect_kind` is NOT NULL on both effect tables where it was nullable on
  // the trait row it replaced: a trait with no mechanical effect is now the
  // ABSENCE of a row rather than a row of nulls.
  species_template_trait_effects: [
    'id', 'species_template_trait_id', 'sort_order', 'effect_kind',
  ],
  character_species: ['id', 'character_id', 'name'],
  character_species_traits: ['id', 'character_id', 'sort_order', 'name'],
  character_effects: [
    'id', 'character_id', 'sort_order', 'effect_kind', 'label',
  ],
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

  // --- THE TABLES INHERITED FROM THE ORIGINAL MIGRATIONS -------------------
  // Merged into the list above for the same reason the column inventory was:
  // the two halves were kept apart to feed a hash that no longer runs.
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
  // UNIQUE on `(trait, sort_order)` on the CATALOG side, where the character
  // side below gets a plain index — the same asymmetry the trait tables
  // already carry, and for the same reason: the source's order is dense and a
  // repeat means a mis-parse, while a user mid-reorder is not a corrupt row.
  species_template_trait_effects_trait_sort_unique:
    'species_template_trait_effects:species_template_trait_id,sort_order:unique',
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
  character_effects_character_id_index: 'character_effects:character_id',
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
  species_template_trait_effects: ['species_template_trait_id,sort_order'],
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
  species_template_trait_effects: [
    'species_template_trait_id->species_template_traits.id|CASCADE',
  ],
  character_species: ['character_id->characters.id|CASCADE'],
  character_species_traits: ['character_id->characters.id|CASCADE'],
  // TWO edges, and the composite one is the point: a bare
  // `source_instance_id` would pass `PRAGMA foreign_key_check` while pointing
  // at ANOTHER character's source instance. Including `character_id` in the
  // tuple is what makes the database refuse that, and it is the second use of
  // the `(id, character_id)` unique index `character_source_instances` carries
  // for exactly this purpose — `spell_selection_slots` above being the first.
  character_effects: [
    'character_id->characters.id|CASCADE',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
  ],
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

// The expectations above are hand-written and independent of how the artifact
// is produced, which is what lets the same ones be run against any candidate
// artifact. The parameterisation is one entry today.
for (const [sourceLabel, schemaSql] of schemaSources) {
describe(`schema (${sourceLabel})`, () => {
  it('declares exactly the inventoried tables and exactly their columns', () => {
    const db = openDb(schemaSql);
    const tables = db.selectValues(
      `SELECT name
       FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    );

    // A table in neither half of the inventory fails, which was always the
    // property that mattered. What is gone is the table COUNT that used to sit
    // beside this: a hand-maintained number that could only ever restate what
    // the set equality already fixes.
    expect(tables).toEqual(Object.keys(expectedColumns).sort());
    // Non-vacuity: every inventoried table must also carry a NOT NULL
    // expectation, so a new table cannot get its nullability check for free.
    expect(Object.keys(expectedNotNull).sort()).toEqual(
      Object.keys(expectedColumns).sort(),
    );

    for (const [table, columns] of Object.entries(expectedColumns)) {
      const metadata = rows(db, `PRAGMA table_info("${table}")`);
      expect(
        metadata.map((row) => String(row.name)).sort(),
        `columns for ${table}`,
      ).toEqual([...columns].sort());
      expect(
        metadata
          .filter((row) => Number(row.notnull) === 1)
          .map((row) => String(row.name))
          .sort(),
        `NOT NULL columns for ${table}`,
      ).toEqual([...(expectedNotNull[table] ?? [])].sort());
    }

    // Three specific absences and one presence, each asserted against the
    // DATABASE. Two of them used to be asserted against the `expectedColumns`
    // literal a few hundred lines above in this same file, so only editing that
    // literal could break them — they could not fail for the reason they were
    // written.
    const columnsOf = (table: string) =>
      rows(db, `PRAGMA table_info("${table}")`).map((row) => String(row.name));
    expect(tables).not.toContain('wizard_prepared_entries');
    expect(columnsOf('wizard_spellbook_entries')).not.toContain('acquisition');
    expect(columnsOf('spell_selection_slots')).toContain(
      'selection_eligibility',
    );
  });

  it('materializes every named index, unique key, and declared default', () => {
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

    for (const table of Object.keys(expectedColumns)) {
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
    for (const table of Object.keys(expectedColumns)) {
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
 * THE FROZEN HISTORICAL FIXTURE IS UNEDITED — and that is now the whole claim.
 *
 * These two hashes were derived by running the ORIGINAL MIGRATIONS against an
 * in-memory SQLite database, before any of this existed. They no longer judge
 * the generated schema: D7 retired fidelity to the app this replaced, and the
 * third link — `metadataHash(schema.sql, nativeTables)` against the same
 * constant — went with the rest of that machinery (F10). It was the assertion
 * that made every column, type, default and reorder in `db/schema/*.ts` a
 * hash-moving event.
 *
 * What remains is a guard on `tests/fixtures/schema-pre-drizzle.sql`, which is
 * NOT retired. D9 records why it stays, and `tests/unit/db/schema-signature.test.ts`
 * is why it matters: that suite builds a real database image out of this
 * fixture to prove such an image is REJECTED cleanly, with the export-and-reset
 * recovery path still reachable. A fixture quietly edited to make something
 * pass would hollow that test out from underneath. These assertions are what
 * make editing it loud.
 *
 * Both can fail: change one byte of the fixture's DDL and one or both move.
 */
describe('the frozen pre-Drizzle fixture still hashes to its recorded values', () => {
  const preDrizzleMetadataHashWithInfrastructure =
    'fa0e4e9f2af9531e8b66b296660b5db7e28a5c6c2ceda00859c904fe6a4d1b11';

  /** The same fixture, minus the eight tables this schema never declared. */
  const preDrizzleMetadataHashWithoutInfrastructure =
    'd83f8a8d32c1ccef3317e8935b634268ff9adb575724bedd2370f6cfc5716329';

  /**
   * Named rather than derived, so the second hash cannot be made to pass by a
   * skip list that quietly grew. That these eight are ABSENT from the live
   * schema is asserted independently, and against the database rather than
   * against a literal, in `tests/unit/contracts/table-scopes.test.ts`.
   */
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

  it('reproduces the recorded 38-table value from the frozen fixture', () => {
    expect(metadataHash(preDrizzleSchema, [])).toBe(
      preDrizzleMetadataHashWithInfrastructure,
    );
  });

  it('yields the pruned value from that same fixture, minus the eight tables', () => {
    expect(metadataHash(preDrizzleSchema, droppedInfrastructureTables)).toBe(
      preDrizzleMetadataHashWithoutInfrastructure,
    );
  });
});
