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
 * THE STORAGE CLASS A COLUMN IMPOSES ON WHAT IS WRITTEN TO IT.
 *
 * SQLite has no column types, only AFFINITIES, and the affinity is what
 * actually changes stored data: writing the string `'2024'` to a TEXT-affinity
 * column stores the three characters, and writing it to an INTEGER-affinity
 * column stores the number 2024. `expectedColumns` below groups every column by
 * the affinity its declaration produces, so that a retype which moves a column
 * between these groups has to be a deliberate edit here.
 *
 * `numeric` is the affinity of `DATETIME`, which every timestamp in this schema
 * is declared as. It holds ISO-8601 text because that text converts to no
 * number, but it is a distinct affinity from `text` and is recorded as one
 * rather than being quietly folded in.
 *
 * `real` and `blob` are absent because no column has them; the classifier still
 * returns them, so a column that acquired one would fail to match any group.
 */
type ColumnAffinity = 'integer' | 'text' | 'numeric' | 'real' | 'blob';

type ColumnsByAffinity = Partial<Record<ColumnAffinity, string[]>>;

/**
 * THE COLUMN INVENTORY — every table this schema declares, one hand-written
 * entry each, with every column filed under the affinity it must have.
 *
 * This is NOT a parity record and no longer splits Laravel-inherited tables
 * from native ones; D7 retired that goal and F10 measured what the split was
 * costing. What survives is the one thing this inventory catches that nothing
 * else in the suite does: a SURPLUS column. A MISSING column breaks an
 * integration test or a row contract, but 30 of the 57 tables have no row
 * contract at all, so a column that appears and is read by nothing is invisible
 * everywhere else.
 *
 * WHAT THE GROUPING PINS, AND WHAT IT DELIBERATELY DOES NOT. The DECLARED TYPE
 * KEYWORD is not pinned anywhere and must not be: D7 names
 * `VARCHAR`/`DATETIME`/`TINYINT(1)` as inherited MVP spellings and licenses
 * renaming them freely. What is pinned is the AFFINITY those keywords resolve
 * to, which is behaviour rather than inheritance. So `VARCHAR` -> `TEXT` costs
 * nothing here, and `VARCHAR` -> `integer` — which silently converts every
 * numeric-looking string ever written to that column — costs one deliberate
 * line. The distinction is the whole point: the third hash link F10 deleted was
 * the only thing left reading a declared type, and deleting it left the
 * affinity of all 535 columns with no oracle at all.
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
const expectedColumns: Record<string, ColumnsByAffinity> = {
  catalog_content_identities: {
    text: [
      'content_key', 'content_kind', 'key_kind', 'catalog_layer',
      'normalized_name',
    ],
    numeric: ['created_at'],
  },
  catalog_content_fingerprints: {
    text: [
      'content_kind', 'fingerprint_scheme', 'fingerprint_digest',
      'canonical_json', 'content_key', 'fingerprint_role',
    ],
  },
  catalog_content_aliases: {
    text: ['content_kind', 'alias_key', 'content_key', 'alias_kind'],
  },
  catalog_content_match_decisions: {
    text: [
      'content_kind', 'incoming_fingerprint_scheme',
      'incoming_fingerprint_digest', 'decision', 'target_content_key',
    ],
    numeric: ['reviewed_at'],
  },
  catalog_data_migrations: {
    text: ['id', 'scheme', 'checksum'],
    numeric: ['applied_at'],
  },
  background_definitions: {
    integer: ['id', 'repeatable'],
    text: [
      'content_key', 'name', 'rules_edition', 'category', 'prerequisites',
      'grant_rules', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  change_log: {
    integer: ['id', 'character_id', 'sequence', 'entity_id', 'reversible'],
    text: [
      'group_id', 'operation_uuid', 'entity_type', 'previous_value',
      'new_value', 'reason', 'action_type',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  character_class_levels: {
    integer: [
      'id', 'character_id', 'class_definition_id', 'subclass_definition_id',
      'level', 'is_starting_class',
    ],
    text: ['spellcasting_ability_override', 'notes'],
    numeric: ['created_at', 'updated_at'],
  },
  character_operations: {
    integer: ['id', 'character_id', 'expected_revision', 'resulting_revision'],
    text: ['operation_uuid', 'inverse_command'],
    numeric: ['created_at', 'updated_at'],
  },
  character_rule_overrides: {
    integer: ['id', 'character_id'],
    text: ['rule_key', 'value', 'note'],
    numeric: ['created_at', 'updated_at'],
  },
  character_save_points: {
    integer: ['id', 'character_id'],
    text: ['label', 'snapshot', 'schema_version'],
    numeric: ['created_at', 'updated_at'],
  },
  character_source_instances: {
    integer: [
      'id', 'character_id', 'parent_source_instance_id',
      'source_definition_id', 'acquired_at_character_level',
    ],
    text: [
      'instance_uuid', 'source_type', 'display_name', 'config', 'state',
      'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  character_spell_preferences: {
    integer: ['id', 'character_id', 'spell_version_id', 'favourite'],
    text: ['notes'],
    numeric: ['created_at', 'updated_at'],
  },
  characters: {
    integer: [
      'id', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom',
      'charisma', 'proficiency_bonus_override', 'allow_legacy', 'revision',
    ],
    text: [
      'name', 'ability_allocation_method', 'rules_edition_preference', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  class_definitions: {
    integer: ['id', 'supports_ritual_casting'],
    text: [
      'content_key', 'name', 'rules_edition', 'spellcasting_ability',
      'progression_type', 'caster_fraction', 'caster_rounding',
      'prepares_or_knows', 'ritual_casting_mode',
      'primary_ability_expression', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  class_progressions: {
    integer: [
      'id', 'class_definition_id', 'class_level', 'cantrips_known',
      'prepared_count',
    ],
    text: ['slots', 'pact_slots', 'grant_rules'],
    numeric: ['created_at', 'updated_at'],
  },
  feat_definitions: {
    integer: ['id', 'min_level', 'ability_points', 'repeatable'],
    text: [
      'content_key', 'name', 'rules_edition', 'category', 'prerequisites',
      'grant_rules', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  species_definitions: {
    integer: ['id', 'repeatable'],
    text: [
      'content_key', 'name', 'rules_edition', 'category', 'prerequisites',
      'grant_rules', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  spell_identities: {
    integer: ['id'],
    text: ['content_key', 'canonical_name', 'normalized_name', 'notes'],
    numeric: ['created_at', 'updated_at'],
  },
  spell_identity_aliases: {
    integer: ['id', 'spell_identity_id'],
    text: ['alias', 'normalized_alias'],
    numeric: ['created_at', 'updated_at'],
  },
  spell_list_memberships: {
    integer: ['id', 'spell_version_id'],
    text: ['spell_list_key'],
    numeric: ['created_at', 'updated_at'],
  },
  spell_loadout_entries: {
    integer: ['id', 'spell_loadout_id', 'spell_version_id'],
    text: ['role'],
    numeric: ['created_at', 'updated_at'],
  },
  spell_loadouts: {
    integer: ['id', 'character_id'],
    text: ['name', 'notes'],
    numeric: ['created_at', 'updated_at'],
  },
  spell_selection_slots: {
    integer: [
      'id', 'character_id', 'source_instance_id', 'ordinal',
      'fixed_spell_version_id', 'current_spell_version_id', 'spell_level_min',
      'spell_level_max', 'always_prepared', 'with_slots',
      'counts_against_limit', 'required', 'is_locked', 'sort_order',
      'selection_acquired_at_class_level',
    ],
    text: [
      'slot_key', 'rule_key', 'bucket', 'eligibility_kind', 'label',
      'allowed_spell_lists', 'allowed_schools', 'allowed_tags', 'free_cast',
      'state', 'orphan_reason_code', 'prior_config', 'override_note', 'notes',
      'selection_collection', 'selection_eligibility',
      'selection_invalid_reason',
    ],
    numeric: ['orphaned_at', 'created_at', 'updated_at'],
  },
  spell_version_attack_modes: {
    integer: ['id', 'spell_version_id'],
    text: ['attack_mode'],
  },
  spell_version_conditions: {
    integer: ['id', 'spell_version_id'],
    text: ['condition_type'],
  },
  spell_version_damage_types: {
    integer: ['id', 'spell_version_id'],
    text: ['damage_type'],
  },
  spell_version_publications: {
    integer: ['id', 'spell_version_id', 'source_page'],
    text: ['source_book', 'source_reference'],
    numeric: ['created_at', 'updated_at'],
  },
  spell_version_save_abilities: {
    integer: ['id', 'spell_version_id'],
    text: ['save_ability'],
  },
  spell_version_tags: {
    integer: ['id', 'spell_version_id'],
    text: ['tag'],
  },
  spell_versions: {
    integer: [
      'id', 'spell_identity_id', 'level', 'ritual', 'concentration',
      'range_feet', 'area_feet', 'material_cost_copper',
      'healing', 'requires_mod_for_effect', 'is_active',
    ],
    text: [
      'content_key', 'display_name', 'rules_edition', 'school',
      'casting_time', 'action_type', 'range', 'range_kind', 'area_shape',
      'duration', 'components',
      'material_component_summary', 'material_cost_kind', 'short_summary',
      'upcast_summary', 'cantrip_upgrade_summary',
      'effect_reliability_category', 'provenance',
      'seed_version', 'forked_from_content_key',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  spell_version_upcast_levels: {
    integer: ['id', 'spell_version_id', 'level'],
    text: [],
    numeric: [],
  },
  spell_version_cantrip_upgrade_levels: {
    integer: ['id', 'spell_version_id', 'level'],
    text: [],
    numeric: [],
  },
  subclass_definitions: {
    integer: ['id', 'class_definition_id'],
    text: [
      'content_key', 'name', 'rules_edition', 'spellcasting_ability',
      'caster_fraction', 'caster_rounding', 'grant_rules',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  subclass_progressions: {
    integer: [
      'id', 'subclass_definition_id', 'class_level', 'cantrips_known',
      'prepared_count', 'max_spell_level',
    ],
    text: ['slots', 'grant_rules'],
    numeric: ['created_at', 'updated_at'],
  },
  warning_acknowledgements: {
    integer: ['id', 'character_id'],
    text: ['warning_fingerprint', 'note'],
    numeric: ['invalidated_at', 'created_at', 'updated_at'],
  },
  wizard_spellbook_entries: {
    integer: [
      'id', 'character_id', 'source_instance_id', 'ordinal',
      'acquired_at_class_level', 'spell_version_id', 'spell_level_min',
      'spell_level_max',
    ],
    text: [
      'rule_key', 'allowed_spell_lists', 'allowed_schools', 'allowed_tags',
      'state', 'orphan_reason_code', 'selection_eligibility',
      'selection_invalid_reason',
    ],
    numeric: ['orphaned_at', 'created_at', 'updated_at'],
  },

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
  character_weapons: {
    integer: [
      // NO `source_instance_id`: E-A's equipment-provenance column was
      // struck by owner ruling D69 (migration 0012).
      'id', 'character_id', 'finesse', 'heavy', 'light',
      'loading', 'reach',
      'thrown', 'two_handed', 'ammunition', 'range_near_feet',
      'range_far_feet', 'mastery_selected', 'damage_flat',
      'versatile_damage_flat',
    ],
    text: [
      'name', 'proficiency_category', 'attack_kind', 'damage_kind', 'damage_dice',
      'damage_custom', 'damage_type', 'versatile_damage_kind',
      'versatile_damage_dice', 'versatile_damage_custom', 'ammunition_kind',
      'range_kind',
      'mastery_property', 'other_properties', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  class_weapon_mastery_counts: {
    integer: ['id', 'class_definition_id', 'class_level', 'mastery_count'],
    numeric: ['created_at', 'updated_at'],
  },
  class_weapon_mastery_grants: {
    integer: ['id', 'class_definition_id'],
    text: ['grant'],
    numeric: ['created_at', 'updated_at'],
  },
  weapon_templates: {
    integer: [
      'id', 'finesse', 'heavy', 'light', 'loading', 'reach', 'thrown',
      'two_handed', 'ammunition', 'range_near_feet', 'range_far_feet',
      'damage_flat', 'versatile_damage_flat',
    ],
    text: [
      'content_key', 'rules_edition', 'name', 'srd_group', 'damage_kind',
      'damage_dice', 'damage_custom', 'damage_type',
      'versatile_damage_kind', 'versatile_damage_dice',
      'versatile_damage_custom', 'ammunition_kind', 'range_kind', 'mastery_property',
      'other_properties',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  // The six origins tables, transcribed the same way from the origins design
  // rather than read back out of `PRAGMA table_info`.
  species_templates: {
    integer: ['id', 'base_speed_feet'],
    text: [
      'content_key', 'rules_edition', 'name', 'creature_type', 'size',
      'alternate_size',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  species_template_traits: {
    integer: ['id', 'species_template_id', 'sort_order'],
    text: ['name', 'description'],
    numeric: ['created_at', 'updated_at'],
  },
  // The CATALOG half of the inverted effect model: what a printed trait GRANTS.
  // The five `effect_*` columns that used to sit on the trait row above are
  // here, one row per effect, so a trait granting two is two rows.
  species_template_trait_effects: {
    integer: [
      'id', 'species_template_trait_id', 'sort_order', 'hit_points_flat',
      'hit_points_per_level', 'speed_bonus_feet', 'base', 'allows_shield',
    ],
    text: [
      'effect_kind', 'damage_type', 'ability_1', 'ability_2', 'weapon_scope',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  character_species: {
    integer: ['id', 'character_id', 'base_speed_feet'],
    text: ['name', 'creature_type', 'size', 'notes'],
    numeric: ['created_at', 'updated_at'],
  },
  character_species_traits: {
    integer: ['id', 'character_id', 'sort_order'],
    text: ['name', 'description', 'notes'],
    numeric: ['created_at', 'updated_at'],
  },
  // The CHARACTER half: what this character HAS. Keyed on `character_id` and
  // not on the trait, which is what lets a feat or a subclass grant one and
  // what stops a trait being the thing an effect hangs from.
  character_effects: {
    integer: [
      'id', 'character_id', 'sort_order', 'hit_points_flat',
      'hit_points_per_level', 'speed_bonus_feet', 'amount', 'maximum',
      // AC-1 (D72): `base` and `allows_shield` are the two new integer-
      // affinity columns (allows_shield is TINYINT(1), integer affinity).
      'base', 'allows_shield',
      'source_instance_id', 'character_item_id', 'character_weapon_id',
    ],
    text: [
      'effect_kind', 'damage_type', 'ability', 'template_ref', 'label', 'notes',
      // AC-1 (D72): the three new text-affinity columns.
      'ability_1', 'ability_2', 'weapon_scope',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  // The character's own ITEMS (AC-1, D72): things that only modify, speaking
  // through `character_effects` above rather than carrying their own
  // modifier columns — see `db/schema/items.ts`.
  character_items: {
    integer: [
      'id', 'character_id', 'quantity', 'requires_attunement',
      'source_instance_id',
    ],
    text: ['name', 'description'],
    numeric: ['created_at', 'updated_at'],
  },
  character_attunement_slots: {
    integer: [
      'character_id', 'slot_1_item_id', 'slot_2_item_id', 'slot_3_item_id',
    ],
    text: [],
    numeric: [],
  },
  background_templates: {
    integer: ['id'],
    text: [
      'content_key', 'rules_edition', 'name', 'ability_score_1',
      'ability_score_2', 'ability_score_3', 'feat_name',
      'skill_proficiency_1', 'skill_proficiency_2', 'tool_proficiency',
      'equipment_option_a', 'equipment_option_b',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  background_equipment_items: {
    integer: [
      'id', 'background_template_id', 'sort_order', 'quantity',
      'weapon_template_id', 'armor_template_id',
    ],
    text: ['option', 'item_name', 'item_kind'],
    numeric: ['created_at', 'updated_at'],
  },
  class_equipment_items: {
    integer: [
      'id', 'class_definition_id', 'sort_order', 'quantity',
      'weapon_template_id', 'armor_template_id',
    ],
    text: ['option', 'item_name', 'item_kind'],
    numeric: ['created_at', 'updated_at'],
  },
  character_background: {
    integer: ['id', 'character_id'],
    text: [
      'name', 'ability_score_1', 'ability_score_2', 'ability_score_3',
      'feat_name', 'skill_proficiency_1', 'skill_proficiency_2',
      'tool_proficiency', 'equipment_option_a', 'equipment_option_b', 'notes',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  // --- SHEET CORE (D11 part 1, D12) ---------------------------------------
  // Seven class-content tables plus the armour catalog. Transcribed by reading
  // the declarations in `db/schema/sheet.ts`, for the same reason the weapon
  // lists above are transcribed rather than generated: an expectation produced
  // from `PRAGMA table_info` reprints our own output and cannot fail.
  armor_templates: {
    integer: [
      'id', 'armor_class', 'dex_bonus_max', 'strength_requirement',
      'stealth_disadvantage',
    ],
    text: ['content_key', 'rules_edition', 'name', 'category', 'dex_bonus'],
    numeric: ['created_at', 'updated_at'],
  },
  class_armor_training: {
    integer: ['id', 'class_definition_id', 'granted_on_multiclass_entry'],
    text: ['category'],
    numeric: ['created_at', 'updated_at'],
  },
  class_extra_attack_grants: {
    integer: ['id', 'class_definition_id', 'class_level', 'attack_count'],
    numeric: ['created_at', 'updated_at'],
  },
  class_martial_arts_dice: {
    integer: ['id', 'class_definition_id', 'class_level', 'martial_arts_die'],
    numeric: ['created_at', 'updated_at'],
  },
  class_saving_throw_proficiencies: {
    integer: ['id', 'class_definition_id'],
    text: ['ability'],
    numeric: ['created_at', 'updated_at'],
  },
  class_sheet_traits: {
    integer: [
      'id', 'class_definition_id', 'hit_die', 'skill_choice_count',
      'skill_choice_from_any', 'multiclass_skill_choice_count',
    ],
    text: ['multiclass_skill_choice_pool'],
    numeric: ['created_at', 'updated_at'],
  },
  class_skill_options: {
    integer: ['id', 'class_definition_id'],
    text: ['skill'],
    numeric: ['created_at', 'updated_at'],
  },
  class_weapon_proficiencies: {
    integer: ['id', 'class_definition_id', 'granted_on_multiclass_entry'],
    text: ['category', 'property_qualifier'],
    numeric: ['created_at', 'updated_at'],
  },
  // D19's two class-feature tables, transcribed from the declarations in
  // `db/schema/catalog-classes.ts` for the same reason every list here is
  // transcribed: an expectation produced from `PRAGMA table_info` reprints our
  // own output and cannot fail.
  named_features: {
    integer: ['id', 'class_definition_id', 'class_level'],
    text: [
      'content_key', 'name', 'rules_edition', 'prerequisite', 'description',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  subclass_features: {
    integer: ['id', 'subclass_definition_id', 'class_level', 'sort_order'],
    text: ['name', 'description'],
    numeric: ['created_at', 'updated_at'],
  },
  class_feature_effects: {
    integer: [
      'id', 'class_definition_id', 'class_level', 'hit_points_flat',
      'hit_points_per_level', 'speed_bonus_feet', 'amount', 'maximum', 'base',
      'allows_shield', 'attack_count',
    ],
    text: [
      'name', 'effect_kind', 'damage_type', 'ability', 'ability_1', 'ability_2',
      'weapon_scope',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  named_feature_effects: {
    integer: [
      'id', 'named_feature_id', 'sort_order', 'hit_points_flat',
      'hit_points_per_level', 'speed_bonus_feet', 'amount', 'maximum', 'base',
      'allows_shield', 'attack_count',
    ],
    text: [
      'effect_kind', 'damage_type', 'ability', 'ability_1', 'ability_2',
      'weapon_scope',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  subclass_feature_effects: {
    integer: [
      'id', 'subclass_feature_id', 'sort_order', 'hit_points_flat',
      'hit_points_per_level', 'speed_bonus_feet', 'amount', 'maximum', 'base',
      'allows_shield', 'attack_count',
    ],
    text: [
      'effect_kind', 'damage_type', 'ability', 'ability_1', 'ability_2',
      'weapon_scope',
    ],
    numeric: ['created_at', 'updated_at'],
  },
  // The four STORED SHEET INPUTS, transcribed from the declarations in
  // `db/schema/sheet-inputs.ts` for the same reason every list here is
  // transcribed: an expectation produced from `PRAGMA table_info` reprints our
  // own output and cannot fail.
  //
  // `character_armor`'s fillable columns are deliberately the SAME NAMES as
  // `armor_templates`' above, because picking a template is a column-wise copy
  // (D1b) — plus `slot`, which is where the user put it rather than what it is,
  // and `notes`.
  character_armor: {
    integer: [
      // NO `source_instance_id`, on exactly `character_weapons`' terms
      // (D69, migration 0012).
      'id', 'character_id', 'armor_class',
      'dex_bonus_max',
      'strength_requirement', 'stealth_disadvantage',
    ],
    text: ['slot', 'name', 'category', 'dex_bonus', 'notes'],
    numeric: ['created_at', 'updated_at'],
  },
  character_hit_point_rolls: {
    integer: ['id', 'character_id', 'class_level', 'rolled_value'],
    text: ['class_name'],
    numeric: ['created_at', 'updated_at'],
  },
  // NO `proficient` COLUMN, and its absence is the assertion: presence of the
  // row IS the value, so a `proficient = 0` row cannot exist to mean the same
  // thing as no row.
  character_skill_proficiencies: {
    integer: ['id', 'character_id'],
    text: ['skill'],
    numeric: ['created_at', 'updated_at'],
  },
  // THE SKILL GRANTS (skills plan, S-A). `skill` NULLABLE ON PURPOSE — the
  // defended "granted but unfilled" null — beside a NOT NULL `state` whose
  // two-member vocabulary carries the tombstone lifecycle (§3.8).
  character_skill_grants: {
    integer: ['id', 'character_id', 'source_instance_id', 'ordinal'],
    text: ['grant_key', 'skill', 'state', 'orphan_reason_code'],
    numeric: ['orphaned_at', 'created_at', 'updated_at'],
  },
  character_sheet_adjustments: {
    integer: ['id', 'character_id'],
    numeric: ['created_at', 'updated_at'],
  },
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
  catalog_content_identities: [
    'content_key', 'content_kind', 'key_kind', 'catalog_layer',
    'normalized_name', 'created_at',
  ],
  catalog_content_fingerprints: [
    'content_kind', 'fingerprint_scheme', 'fingerprint_digest',
    'canonical_json', 'content_key', 'fingerprint_role',
  ],
  catalog_content_aliases: [
    'content_kind', 'alias_key', 'content_key', 'alias_kind',
  ],
  catalog_content_match_decisions: [
    'content_kind', 'incoming_fingerprint_scheme',
    'incoming_fingerprint_digest', 'decision', 'target_content_key',
    'reviewed_at',
  ],
  catalog_data_migrations: [
    'id', 'scheme', 'checksum', 'applied_at',
  ],
  // `damage_dice`, `damage_type` and `mastery_property` are NULLABLE here and
  // NOT NULL on the template: a half-entered user weapon is a first-class
  // state, and an invented weapon need not have a mastery property at all.
  // `proficiency_category` and `attack_kind` are NOT in this list: null means
  // NOT STATED / NOT RECORDED. A hand-entered or older shared weapon genuinely
  // has neither fact.
  character_weapons: [
    'id', 'character_id', 'name', 'damage_kind', 'versatile_damage_kind',
    'finesse', 'heavy', 'light', 'loading', 'reach', 'thrown', 'two_handed',
    'ammunition', 'range_kind', 'mastery_selected',
  ],
  class_weapon_mastery_counts: [
    'id', 'class_definition_id', 'class_level', 'mastery_count',
  ],
  class_weapon_mastery_grants: ['id', 'class_definition_id', 'grant'],
  weapon_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'srd_group', 'damage_kind',
    'damage_type', 'versatile_damage_kind', 'finesse', 'heavy', 'light',
    'loading', 'reach', 'thrown', 'two_handed', 'ammunition',
    'range_kind', 'mastery_property',
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
  // AC-1 (D72): `description` and `source_instance_id` are the only nullable
  // columns — a name may travel with no prose yet, and most items are
  // hand-added with no granting source.
  character_items: [
    'id', 'character_id', 'name', 'quantity', 'requires_attunement',
  ],
  character_attunement_slots: ['character_id'],
  background_templates: [
    'id', 'content_key', 'rules_edition', 'name', 'ability_score_1',
    'ability_score_2', 'ability_score_3', 'feat_name', 'skill_proficiency_1',
    'skill_proficiency_2', 'tool_proficiency', 'equipment_option_a',
    'equipment_option_b',
  ],
  background_equipment_items: [
    'id', 'background_template_id', 'option', 'sort_order', 'quantity',
    'item_name', 'item_kind',
  ],
  class_equipment_items: [
    'id', 'class_definition_id', 'option', 'sort_order', 'quantity',
    'item_name', 'item_kind',
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
  class_armor_training: [
    'id', 'class_definition_id', 'category', 'granted_on_multiclass_entry',
  ],
  class_extra_attack_grants: [
    'id', 'class_definition_id', 'class_level', 'attack_count',
  ],
  class_martial_arts_dice: [
    'id', 'class_definition_id', 'class_level', 'martial_arts_die',
  ],
  class_saving_throw_proficiencies: ['id', 'class_definition_id', 'ability'],
  class_sheet_traits: [
    'id', 'class_definition_id', 'hit_die', 'skill_choice_count',
    'skill_choice_from_any', 'multiclass_skill_choice_count',
    'multiclass_skill_choice_pool',
  ],
  class_skill_options: ['id', 'class_definition_id', 'skill'],
  class_weapon_proficiencies: [
    'id', 'class_definition_id', 'category', 'granted_on_multiclass_entry',
  ],
  // The live stored sheet inputs. `dex_bonus_max` and `strength_requirement`
  // are nullable on `character_armor` for exactly the reason they are nullable
  // on `armor_templates` — D6b limb 2, the source prints no value — and
  // `character_armor.notes` is nullable because a user may record armour
  // without explaining it.
  character_armor: [
    'id', 'character_id', 'slot', 'name', 'category', 'armor_class',
    'dex_bonus', 'stealth_disadvantage',
  ],
  character_hit_point_rolls: [
    'id', 'character_id', 'class_name', 'class_level', 'rolled_value',
  ],
  character_skill_proficiencies: ['id', 'character_id', 'skill'],
  // `skill` is ABSENT from this list and that absence is the model: an
  // unfilled grant is a real row (skills plan §3.1). The lifecycle pair
  // (`orphan_reason_code`, `orphaned_at`) is nullable exactly as the spell
  // slots' is.
  character_skill_grants: [
    'id', 'character_id', 'source_instance_id', 'grant_key', 'ordinal',
    'state',
  ],
  character_sheet_adjustments: [
    'id', 'character_id',
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
  class_feature_effects: [
    'id', 'class_definition_id', 'class_level', 'name', 'effect_kind',
  ],
  named_feature_effects: [
    'id', 'named_feature_id', 'sort_order', 'effect_kind',
  ],
  subclass_feature_effects: [
    'id', 'subclass_feature_id', 'sort_order', 'effect_kind',
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
  feat_definitions: [
    'id', 'content_key', 'name', 'rules_edition', 'ability_points',
    'repeatable',
  ],
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
  spell_version_upcast_levels: ['id', 'spell_version_id', 'level'],
  spell_version_cantrip_upgrade_levels: ['id', 'spell_version_id', 'level'],
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
  wizard_spellbook_entries: [
    'id', 'character_id', 'spell_level_min', 'spell_level_max', 'state',
    'selection_eligibility',
  ],
};

const expectedNamedIndexes: Record<string, string> = {
  catalog_content_identities_kind_key_unique:
    'catalog_content_identities:content_kind,content_key:unique',
  catalog_content_identities_layer_kind_index:
    'catalog_content_identities:catalog_layer,content_kind',
  catalog_content_identities_name_index:
    'catalog_content_identities:content_kind,normalized_name',
  catalog_content_fingerprints_current_scheme_unique:
    'catalog_content_fingerprints:content_key,fingerprint_scheme:unique',
  catalog_content_fingerprints_resolution_index:
    'catalog_content_fingerprints:content_kind,fingerprint_scheme,fingerprint_digest',
  catalog_content_aliases_resolution_index:
    'catalog_content_aliases:content_kind,alias_key',
  background_definitions_content_key_unique:
    'background_definitions:content_key:unique',
  background_definitions_name_rules_edition_index:
    'background_definitions:name,rules_edition',
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
  species_templates_name_rules_edition_index:
    'species_templates:name,rules_edition',
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
  named_feature_effects_feature_sort_unique:
    'named_feature_effects:named_feature_id,sort_order:unique',
  class_feature_effects_class_name_level_unique:
    'class_feature_effects:class_definition_id,name,class_level:unique',
  subclass_features_subclass_sort_unique:
    'subclass_features:subclass_definition_id,sort_order:unique',
  subclass_features_subclass_name_unique:
    'subclass_features:subclass_definition_id,name:unique',
  subclass_feature_effects_feature_sort_unique:
    'subclass_feature_effects:subclass_feature_id,sort_order:unique',
  background_templates_content_key_unique:
    'background_templates:content_key:unique',
  background_templates_name_rules_edition_index:
    'background_templates:name,rules_edition',
  background_equipment_items_template_option_sort_order_unique:
    'background_equipment_items:background_template_id,option,sort_order:unique',
  background_equipment_items_background_template_id_index:
    'background_equipment_items:background_template_id',
  class_equipment_items_class_option_sort_order_unique:
    'class_equipment_items:class_definition_id,option,sort_order:unique',
  class_equipment_items_class_definition_id_index:
    'class_equipment_items:class_definition_id',
  character_species_character_id_unique:
    'character_species:character_id:unique',
  character_species_traits_character_id_index:
    'character_species_traits:character_id',
  character_background_character_id_unique:
    'character_background:character_id:unique',
  character_effects_character_id_index: 'character_effects:character_id',
  character_effects_character_item_id_index:
    'character_effects:character_item_id',
  character_effects_character_weapon_id_index:
    'character_effects:character_weapon_id',
  character_items_character_id_index: 'character_items:character_id',
  character_items_id_character_id_unique:
    'character_items:id,character_id:unique',
  character_weapons_id_character_id_unique:
    'character_weapons:id,character_id:unique',
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
  // The grants table (skills plan §3.1): the slot identity, the PARTIAL
  // uniqueness over live filled grants — its `WHERE skill IS NOT NULL AND
  // state = 'active'` predicate is not visible to this columns-only
  // inventory; what enforces it is the schema-generation test (the artifact
  // carries the WHERE verbatim) and the behavioural suites — and the state
  // walk index the resolver reads through.
  character_skill_grants_source_grant_ordinal_unique:
    'character_skill_grants:source_instance_id,grant_key,ordinal:unique',
  character_skill_grants_character_id_skill_unique:
    'character_skill_grants:character_id,skill:unique',
  character_skill_grants_character_id_state_index:
    'character_skill_grants:character_id,state',
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
  class_definitions_name_rules_edition_index:
    'class_definitions:name,rules_edition',
  class_progressions_class_definition_id_class_level_unique:
    'class_progressions:class_definition_id,class_level:unique',
  feat_definitions_content_key_unique: 'feat_definitions:content_key:unique',
  feat_definitions_name_rules_edition_index:
    'feat_definitions:name,rules_edition',
  slots_character_collection_index:
    'spell_selection_slots:character_id,selection_collection',
  species_definitions_content_key_unique:
    'species_definitions:content_key:unique',
  species_definitions_name_rules_edition_index:
    'species_definitions:name,rules_edition',
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
  wizard_spellbook_entries_character_id_state_index:
    'wizard_spellbook_entries:character_id,state',
  wizard_spellbook_entries_source_rule_ordinal_unique:
    'wizard_spellbook_entries:source_instance_id,rule_key,ordinal:unique',
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
  spell_version_upcast_levels_spell_version_id_level_unique:
    'spell_version_upcast_levels:spell_version_id,level:unique',
  spell_version_cantrip_upgrade_levels_spell_version_id_level_unique:
    'spell_version_cantrip_upgrade_levels:spell_version_id,level:unique',
  spell_versions_is_active_index: 'spell_versions:is_active',
  spell_versions_content_key_unique: 'spell_versions:content_key:unique',
  spell_versions_rules_edition_level_index:
    'spell_versions:rules_edition,level',
  spell_versions_spell_identity_id_rules_edition_index:
    'spell_versions:spell_identity_id,rules_edition',
  subclass_definitions_class_definition_id_name_rules_edition_index:
    'subclass_definitions:class_definition_id,name,rules_edition',
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
  catalog_content_identities: ['content_kind,content_key'],
  catalog_content_fingerprints: ['content_key,fingerprint_scheme'],
  background_definitions: ['content_key'],
  change_log: ['character_id,sequence'],
  character_class_levels: ['character_id,class_definition_id'],
  character_operations: ['operation_uuid'],
  character_rule_overrides: ['character_id,rule_key'],
  character_source_instances: ['id,character_id', 'instance_uuid'],
  character_items: ['id,character_id'],
  character_weapons: ['id,character_id'],
  character_spell_preferences: ['character_id,spell_version_id'],
  class_definitions: ['content_key'],
  class_progressions: ['class_definition_id,class_level'],
  class_weapon_mastery_counts: ['class_definition_id,class_level'],
  class_weapon_mastery_grants: ['class_definition_id'],
  weapon_templates: ['content_key'],
  species_templates: ['content_key'],
  species_template_traits: [
    'species_template_id,name', 'species_template_id,sort_order',
  ],
  species_template_trait_effects: ['species_template_trait_id,sort_order'],
  background_templates: ['content_key'],
  background_equipment_items: ['background_template_id,option,sort_order'],
  class_equipment_items: ['class_definition_id,option,sort_order'],
  character_species: ['character_id'],
  character_background: ['character_id'],
  character_armor: ['character_id,slot'],
  character_hit_point_rolls: ['character_id,class_name,class_level'],
  character_skill_proficiencies: ['character_id,skill'],
  character_skill_grants: [
    'source_instance_id,grant_key,ordinal', 'character_id,skill',
  ],
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
  named_feature_effects: ['named_feature_id,sort_order'],
  class_feature_effects: ['class_definition_id,name,class_level'],
  subclass_features: [
    'subclass_definition_id,name', 'subclass_definition_id,sort_order',
  ],
  subclass_feature_effects: ['subclass_feature_id,sort_order'],
  feat_definitions: ['content_key'],
  species_definitions: ['content_key'],
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
  spell_version_upcast_levels: ['spell_version_id,level'],
  spell_version_cantrip_upgrade_levels: ['spell_version_id,level'],
  spell_versions: ['content_key'],
  subclass_definitions: [
    'content_key', 'id,class_definition_id',
  ],
  subclass_progressions: ['subclass_definition_id,class_level'],
  warning_acknowledgements: ['character_id,warning_fingerprint'],
  wizard_spellbook_entries: [
    'character_id,spell_version_id',
    'source_instance_id,rule_key,ordinal',
  ],
};

/**
 * EVERY DECLARED DEFAULT, AS `PRAGMA table_info.dflt_value` REPORTS IT.
 *
 * THE FORMS CHANGED AND THAT IS THE POINT, not something to be normalised away.
 * `laravelDefault` used to wrap every literal in quotes — `DEFAULT '0'`,
 * `DEFAULT '10'` — because the retired parity oracle pinned Laravel's emitted
 * text verbatim. Its own comment gave that as its only reason. So a boolean now
 * reads `false`, an integer reads `10`, and a VARCHAR is unchanged because it
 * was always genuinely quoted.
 *
 * The VALUE each column defaults to is unchanged and is what these entries are
 * about. That the three forms are runtime-equivalent is not asserted here by
 * inspection — the test below EXECUTES an insert that omits every one of these
 * columns and reads back what SQLite actually stored.
 *
 * Six tables are named here that were not before — `armor_templates`,
 * `background_templates`, `character_armor`, `character_sheet_adjustments`,
 * `class_sheet_traits`, `species_templates`. They always had defaults; the loop
 * below only visited tables that appeared in this map, so theirs were checked
 * by nothing. It now visits every table, so a default appearing on any column
 * anywhere fails until it is written down.
 */
const expectedDefaults: Record<string, Record<string, string>> = {
  catalog_content_identities: { created_at: 'CURRENT_TIMESTAMP' },
  catalog_content_match_decisions: { reviewed_at: 'CURRENT_TIMESTAMP' },
  catalog_data_migrations: { applied_at: 'CURRENT_TIMESTAMP' },
  change_log: { reversible: 'true' },
  character_class_levels: { is_starting_class: 'false', level: '1' },
  character_skill_grants: { state: "'active'" },
  character_source_instances: { state: "'active'" },
  character_spell_preferences: { favourite: 'false' },
  characters: {
    allow_legacy: 'false', charisma: '10', constitution: '10',
    dexterity: '10', intelligence: '10', revision: '0',
    rules_edition_preference: "'2024'", strength: '10', wisdom: '10',
  },
  class_definitions: {
    progression_type: "'none'", supports_ritual_casting: 'false',
  },
  class_progressions: { cantrips_known: '0', prepared_count: '0' },
  // The eight property toggles plus the mastery flag. Every one of them
  // defaults to off, because "this weapon is not Finesse" is the overwhelming
  // majority case and a NULL there would mean nothing a user could act on.
  character_weapons: {
    ammunition: 'false', finesse: 'false', heavy: 'false', light: 'false',
    loading: 'false', mastery_selected: 'false', reach: 'false',
    thrown: 'false', two_handed: 'false', damage_kind: "'not_recorded'",
    versatile_damage_kind: "'not_applicable'", range_kind: "'none'",
  },
  weapon_templates: {
    ammunition: 'false', finesse: 'false', heavy: 'false', light: 'false',
    loading: 'false', reach: 'false', rules_edition: "'2024'",
    thrown: 'false', two_handed: 'false',
    versatile_damage_kind: "'not_applicable'", range_kind: "'none'",
  },
  feat_definitions: { ability_points: '0', repeatable: 'false' },
  species_definitions: { repeatable: 'false' },
  background_definitions: { repeatable: 'false' },
  spell_selection_slots: {
    always_prepared: 'false', counts_against_limit: 'true',
    is_locked: 'false', ordinal: '0', required: 'false',
    selection_eligibility: "'unselected'", sort_order: '0',
    spell_level_max: '9', spell_level_min: '0', state: "'active'",
    with_slots: 'true',
  },
  wizard_spellbook_entries: {
    selection_eligibility: "'unselected'",
    spell_level_max: '9',
    spell_level_min: '1',
    state: "'active'",
  },
  spell_versions: {
    concentration: 'false', effect_reliability_category: "'fixed_effect'",
    healing: 'false', is_active: 'true', provenance: "'import'",
    requires_mod_for_effect: 'false', ritual: 'false',
  },
  subclass_progressions: {
    cantrips_known: '0', max_spell_level: '0', prepared_count: '0',
  },
  // The six that were previously unvisited. `character_armor` and
  // `armor_templates` carry the SAME `stealth_disadvantage` default for the
  // same reason their fillable columns are name-identical: picking a template
  // is a column-wise copy (D1b).
  armor_templates: { rules_edition: "'2024'", stealth_disadvantage: 'false' },
  background_templates: { rules_edition: "'2024'" },
  species_templates: { rules_edition: "'2024'" },
  character_armor: { stealth_disadvantage: 'false' },
  class_sheet_traits: {
    skill_choice_from_any: 'false',
    // The `none`/0 pair nine of twelve classes carry — and it is a DEFAULT
    // rather than a nullable column so that "grants no entry skill" and "we
    // have not parsed this class" stay different facts: the second is the
    // absence of the whole row.
    multiclass_skill_choice_count: '0',
    multiclass_skill_choice_pool: "'none'",
  },
  // The per-row entry-grant flags. Off by default because the SUBSET is the
  // exception, not the rule: a Barbarian trains in Light, Medium and Shields
  // and grants only Shields on entry.
  class_armor_training: { granted_on_multiclass_entry: 'false' },
  class_weapon_proficiencies: { granted_on_multiclass_entry: 'false' },
  // Ring of Shell (D72 §9's own "proves
  // attunement is not required" fixture) needs `requires_attunement` to
  // default false and not read as unknown.
  character_items: { quantity: '1', requires_attunement: 'false' },
};

/**
 * What a row that names NONE of the defaulted columns must end up holding.
 *
 * Booleans are `0`/`1` INTEGERS, not the keyword they are declared with: that
 * is what `db/schema/columns.ts`'s `integerAtLeast` depends on, since its
 * `typeof(col) = 'integer'` limb would reject a defaulted row that stored the
 * text `'false'`. Asserting the stored value rather than the DDL spelling is
 * what makes this a behavioural check rather than a second transcription.
 */
const expectedDefaultedRow: Record<string, unknown> = {
  ordinal: 0,
  spell_level_min: 0,
  spell_level_max: 9,
  always_prepared: 0,
  with_slots: 1,
  counts_against_limit: 1,
  required: 0,
  is_locked: 0,
  state: 'active',
  sort_order: 0,
  selection_eligibility: 'unselected',
};

const expectedForeignKeys: Record<string, string[]> = {
  catalog_content_fingerprints: [
    'content_kind,content_key->catalog_content_identities.content_kind,content_key|CASCADE',
  ],
  catalog_content_aliases: [
    'content_kind,content_key->catalog_content_identities.content_kind,content_key|CASCADE',
  ],
  catalog_content_match_decisions: [
    'content_kind,target_content_key->catalog_content_identities.content_kind,content_key|RESTRICT',
  ],
  class_definitions: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  subclass_definitions: [
    'class_definition_id->class_definitions.id|CASCADE',
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  feat_definitions: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  species_definitions: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  background_definitions: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  spell_versions: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
    'spell_identity_id->spell_identities.id|CASCADE',
  ],
  species_templates: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  background_templates: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  armor_templates: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  weapon_templates: [
    'content_key->catalog_content_identities.content_key|NO ACTION',
  ],
  // RESTRICT rather than CASCADE on the two template links, and the asymmetry
  // is deliberate: deleting a background template should take its equipment
  // lines with it, but deleting a WEAPON template must not silently shorten
  // four background packages. Nothing deletes a weapon template today, so this
  // is a guard against a future writer rather than a live path.
  background_equipment_items: [
    'armor_template_id->armor_templates.id|RESTRICT',
    'background_template_id->background_templates.id|CASCADE',
    'weapon_template_id->weapon_templates.id|RESTRICT',
  ],
  class_equipment_items: [
    'armor_template_id->armor_templates.id|RESTRICT',
    'class_definition_id->class_definitions.id|CASCADE',
    'weapon_template_id->weapon_templates.id|RESTRICT',
  ],
  change_log: ['character_id->characters.id|CASCADE'],
  character_class_levels: [
    'character_id->characters.id|CASCADE',
    'class_definition_id->class_definitions.id|NO ACTION',
    'subclass_definition_id,class_definition_id->subclass_definitions.id,class_definition_id|NO ACTION',
  ],
  character_operations: ['character_id->characters.id|CASCADE'],
  // Back to ONE edge: E-A's composite equipment-provenance reference was
  // struck by owner ruling D69 (migration 0012).
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
  spell_version_upcast_levels: [
    'spell_version_id->spell_versions.id|CASCADE',
  ],
  spell_version_cantrip_upgrade_levels: [
    'spell_version_id->spell_versions.id|CASCADE',
  ],
  subclass_progressions: [
    'subclass_definition_id->subclass_definitions.id|CASCADE',
  ],
  // D19. A subclass feature cascades from its subclass; a named feature
  // cascades from the class whose LEVEL its prerequisite counts. Both are
  // meaningless without their parent, so both go with it.
  subclass_features: ['subclass_definition_id->subclass_definitions.id|CASCADE'],
  subclass_feature_effects: [
    'subclass_feature_id->subclass_features.id|CASCADE',
  ],
  named_features: ['class_definition_id->class_definitions.id|CASCADE'],
  named_feature_effects: ['named_feature_id->named_features.id|CASCADE'],
  class_feature_effects: ['class_definition_id->class_definitions.id|CASCADE'],
  species_template_traits: [
    'species_template_id->species_templates.id|CASCADE',
  ],
  species_template_trait_effects: [
    'species_template_trait_id->species_template_traits.id|CASCADE',
  ],
  character_species: ['character_id->characters.id|CASCADE'],
  character_species_traits: ['character_id->characters.id|CASCADE'],
  // FOUR edges, and every composite one is the point: a bare
  // `source_instance_id` would pass `PRAGMA foreign_key_check` while pointing
  // at ANOTHER character's source instance. Including `character_id` in the
  // tuple is what makes the database refuse that, and it is the second use of
  // the `(id, character_id)` unique index `character_source_instances` carries
  // for exactly this purpose — `spell_selection_slots` above being the first.
  character_effects: [
    'character_id->characters.id|CASCADE',
    'character_item_id,character_id->character_items.id,character_id|CASCADE',
    'character_weapon_id,character_id->character_weapons.id,character_id|CASCADE',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
  ],
  // The identical two-edge shape `character_effects` carries just above, for
  // the identical reason (AC-1, D72).
  character_items: [
    'character_id->characters.id|CASCADE',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
  ],
  character_attunement_slots: [
    'character_id->characters.id|CASCADE',
    'slot_1_item_id,character_id->character_items.id,character_id|NO ACTION',
    'slot_2_item_id,character_id->character_items.id,character_id|NO ACTION',
    'slot_3_item_id,character_id->character_items.id,character_id|NO ACTION',
  ],
  character_background: ['character_id->characters.id|CASCADE'],
  // ONE EDGE EACH, and `character_hit_point_rolls` having only this one is the
  // assertion that matters: it holds a class NAME and deliberately NOT a
  // foreign key to `character_class_levels`, so deleting a class cannot cascade
  // away a die the player physically rolled.
  // Back to ONE edge: E-A's composite equipment-provenance reference was
  // struck by owner ruling D69 (migration 0012).
  character_armor: ['character_id->characters.id|CASCADE'],
  character_hit_point_rolls: ['character_id->characters.id|CASCADE'],
  character_skill_proficiencies: ['character_id->characters.id|CASCADE'],
  // TWO edges, on `character_effects`' terms: the composite one is what stops
  // a grant being attached to another character's source instance.
  character_skill_grants: [
    'character_id->characters.id|CASCADE',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
  ],
  character_sheet_adjustments: ['character_id->characters.id|CASCADE'],
  warning_acknowledgements: ['character_id->characters.id|CASCADE'],
  wizard_spellbook_entries: [
    'character_id->characters.id|CASCADE',
    'source_instance_id,character_id->character_source_instances.id,character_id|CASCADE',
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

/**
 * SQLite's five affinity-determination rules, applied in order, transcribed
 * from the published algorithm (datatype3.html §3.1) rather than from anything
 * this project generates.
 *
 * Reading this off a keyword is only trustworthy if the keyword really does
 * decide how a value is stored, so it is not left as a reading of the
 * documentation: `proves the affinity classifier against the engine` below
 * EXECUTES every declared type this schema uses and checks the storage class
 * that comes back.
 */
function affinityOf(declaredType: string): ColumnAffinity {
  const upper = declaredType.toUpperCase();
  if (upper.includes('INT')) {
    return 'integer';
  }
  if (
    upper.includes('CHAR') ||
    upper.includes('CLOB') ||
    upper.includes('TEXT')
  ) {
    return 'text';
  }
  if (upper.includes('BLOB') || upper === '') {
    return 'blob';
  }
  if (
    upper.includes('REAL') ||
    upper.includes('FLOA') ||
    upper.includes('DOUB')
  ) {
    return 'real';
  }
  return 'numeric';
}

const AFFINITIES: readonly ColumnAffinity[] = [
  'integer',
  'text',
  'numeric',
  'real',
  'blob',
];

function inventoriedColumns(groups: ColumnsByAffinity): string[] {
  return AFFINITIES.flatMap((affinity) => groups[affinity] ?? []);
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

    for (const [table, groups] of Object.entries(expectedColumns)) {
      const metadata = rows(db, `PRAGMA table_info("${table}")`);
      expect(
        metadata.map((row) => String(row.name)).sort(),
        `columns for ${table}`,
      ).toEqual(inventoriedColumns(groups).sort());
      expect(
        metadata
          .filter((row) => Number(row.notnull) === 1)
          .map((row) => String(row.name))
          .sort(),
        `NOT NULL columns for ${table}`,
      ).toEqual([...(expectedNotNull[table] ?? [])].sort());
      // The affinity each column imposes on what is written to it. Every
      // group is compared, including the ones the table has none of, so a
      // column cannot move between groups unnoticed in either direction.
      for (const affinity of AFFINITIES) {
        expect(
          metadata
            .filter((row) => affinityOf(String(row.type)) === affinity)
            .map((row) => String(row.name))
            .sort(),
          `${affinity}-affinity columns for ${table}`,
        ).toEqual([...(groups[affinity] ?? [])].sort());
      }
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

  it('accepts decode-only character legacy ranges and forbids invalid template pairs', () => {
    const db = openDb(schemaSql);
    db.exec("INSERT INTO characters (id, name) VALUES (1, 'Range checks')");

    expect(() =>
      db.exec(
        `INSERT INTO character_weapons
           (character_id, name, range_kind, range_near_feet, range_far_feet)
         VALUES
           (1, 'Long only', 'legacy', NULL, 60),
           (1, 'Inverted', 'legacy', 60, 20)`,
      ),
    ).not.toThrow();
    expect(() =>
      db.exec(
        `INSERT INTO character_weapons
           (character_id, name, range_kind, range_near_feet, range_far_feet)
         VALUES (1, 'Not legacy', 'legacy', 20, 60)`,
      ),
    ).toThrow(/character_weapons_range_check/);

    const templatePrefix = `
      INSERT INTO weapon_templates
        (content_key, name, srd_group, damage_kind, damage_type,
         range_kind, range_near_feet, range_far_feet, mastery_property)
      VALUES`;
    expect(() =>
      db.exec(
        `${templatePrefix}
         ('missing-near', 'Missing near', 'simple_ranged', 'not_recorded',
          'Piercing', 'ranged', NULL, 60, 'Vex')`,
      ),
    ).toThrow(/weapon_templates_range_check/);
    expect(() =>
      db.exec(
        `${templatePrefix}
         ('inverted', 'Inverted', 'simple_ranged', 'not_recorded',
          'Piercing', 'ranged', 60, 20, 'Vex')`,
      ),
    ).toThrow(/weapon_templates_range_check/);
  });

  it('proves the affinity classifier against the engine, not against its docs', () => {
    const db = openDb(schemaSql);
    const declaredTypes = new Set<string>();
    for (const table of Object.keys(expectedColumns)) {
      for (const row of rows(db, `PRAGMA table_info("${table}")`)) {
        declaredTypes.add(String(row.type));
      }
    }
    // Non-vacuity: this loop is worth nothing if the schema stops declaring
    // types, and the count is deliberately a floor rather than a number to
    // maintain — a new declared type spelling is welcome, an unclassifiable
    // one is not.
    expect(declaredTypes.size).toBeGreaterThanOrEqual(4);

    for (const declared of [...declaredTypes].sort()) {
      const affinity = affinityOf(declared);
      // No column in this schema has REAL or BLOB affinity, and the grouping
      // above says so by having no such group. Assert it here rather than
      // leaving the next two lines to quietly assume it.
      expect(['integer', 'text', 'numeric'], `affinity of ${declared}`).toContain(
        affinity,
      );

      db.exec(`CREATE TABLE affinity_probe ("value" ${declared})`);
      db.exec(`INSERT INTO affinity_probe VALUES ('2024'), ('x')`);
      const stored = rows(
        db,
        'SELECT typeof("value") AS storage_class FROM affinity_probe',
      ).map((row) => String(row.storage_class));
      db.exec('DROP TABLE affinity_probe');

      // THE LINE THAT MATTERS IS TEXT VERSUS EVERYTHING ELSE, and this is what
      // draws it: a numeric-looking string survives as a string only under TEXT
      // affinity. `'x'` converts under no affinity at all and is here to show
      // that the first value's fate is conversion rather than coincidence.
      //
      // INTEGER and NUMERIC affinity are NOT distinguished by this probe
      // because SQLite does not distinguish them when storing — they differ
      // only inside a CAST. They are kept as separate groups above because they
      // are separate declarations, so moving a column between those two is a
      // one-line re-filing rather than a defect.
      expect(stored, `storage classes for a column declared ${declared}`).toEqual(
        affinity === 'text' ? ['text', 'text'] : ['integer', 'text'],
      );
    }
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

    // EVERY table, not only the ones named in `expectedDefaults`. Six tables
    // carried defaults that this loop never visited because it iterated the
    // expectation rather than the schema, which is the shape of check that
    // cannot report what it was never told about.
    for (const table of Object.keys(expectedColumns)) {
      const actual = Object.fromEntries(
        rows(db, `PRAGMA table_info("${table}")`)
          .filter((row) => row.dflt_value !== null)
          .map((row) => [String(row.name), String(row.dflt_value)]),
      );
      expect(actual, `defaults for ${table}`).toEqual(
        expectedDefaults[table] ?? {},
      );
    }
  });

  it('stores the documented value, as an integer, for a row that names no defaulted column', () => {
    const db = openDb(schemaSql);
    // `spell_selection_slots` because it carries the widest mix: five integers,
    // four booleans and two VARCHARs, i.e. every form the declaration changed
    // and the one form it did not.
    db.exec(`
      INSERT INTO characters (name) VALUES ('Defaults Character');
      INSERT INTO character_source_instances
        (character_id, instance_uuid, source_type, display_name)
      VALUES (1, 'source', 'species', 'Human');
      INSERT INTO spell_selection_slots
        (character_id, source_instance_id, slot_key, rule_key, bucket,
         eligibility_kind)
      VALUES (1, 1, 'source:1', 'rule', 'known', 'list');
    `);

    const stored = rows(
      db,
      `SELECT ${Object.keys(expectedDefaultedRow).join(', ')}
       FROM spell_selection_slots`,
    );
    expect(stored).toEqual([expectedDefaultedRow]);

    // AND THE TYPES, which is the part a value comparison alone would miss:
    // `false` and `'0'` and `0` all read back as 0 under `==`, but only an
    // INTEGER satisfies the `typeof(col) = 'integer'` limb that every
    // `integerAtLeast` CHECK in `db/schema/columns.ts` is built on.
    expect(
      rows(
        db,
        `SELECT ${Object.keys(expectedDefaultedRow)
          .map((column) => `typeof(${column}) AS ${column}`)
          .join(', ')}
         FROM spell_selection_slots`,
      ),
    ).toEqual([
      Object.fromEntries(
        Object.entries(expectedDefaultedRow).map(([column, value]) => [
          column,
          typeof value === 'number' ? 'integer' : 'text',
        ]),
      ),
    ]);
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
