// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth: the foreign keys declared in db/schema/*.ts.
// Regenerate with `npm run db:contracts`.
// tests/unit/contracts/column-facts-generation.test.ts fails if it drifts.

/**
 * Every foreign key in the schema, as the audit needs to see it.
 *
 * The semantic audit of a quarantined candidate database derives its
 * cross-character checks from this list rather than from a hand-written set of
 * table names, so a reference added to `db/schema/*.ts` is audited without
 * anybody remembering to add it.
 *
 * The column tuples matter and are not decoration. SQLite's
 * `PRAGMA foreign_key_check` proves a referenced ROW exists; it says nothing
 * about WHOSE row it is. A single-column reference between two character-owned
 * tables — `character_source_instances.parent_source_instance_id` is the one
 * the schema actually has — can therefore point at another character's row and
 * still pass every SQLite check. A reference whose tuple INCLUDES
 * `character_id` (`spell_selection_slots`) cannot, which is why the tuple has
 * to be visible here.
 */
export const FOREIGN_KEY_FACTS = [
  {
    table: 'change_log',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_armor',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_background',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_class_levels',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_class_levels',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'character_class_levels',
    columns: ['subclass_definition_id', 'class_definition_id'],
    target: 'subclass_definitions',
    targetColumns: ['id', 'class_definition_id'],
  },
  {
    table: 'character_hit_point_rolls',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_operations',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_rule_overrides',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_save_points',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_sheet_adjustments',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_skill_proficiencies',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_source_instances',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_source_instances',
    columns: ['parent_source_instance_id'],
    target: 'character_source_instances',
    targetColumns: ['id'],
  },
  {
    table: 'character_species',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_species_traits',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_spell_preferences',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'character_spell_preferences',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'character_weapons',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'class_armor_training',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_extra_attack_grants',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_martial_arts_dice',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_progressions',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_saving_throw_proficiencies',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_sheet_traits',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_skill_options',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_weapon_mastery_counts',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_weapon_mastery_grants',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'class_weapon_proficiencies',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'named_features',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'species_template_traits',
    columns: ['species_template_id'],
    target: 'species_templates',
    targetColumns: ['id'],
  },
  {
    table: 'spell_identity_aliases',
    columns: ['spell_identity_id'],
    target: 'spell_identities',
    targetColumns: ['id'],
  },
  {
    table: 'spell_list_memberships',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_loadout_entries',
    columns: ['spell_loadout_id'],
    target: 'spell_loadouts',
    targetColumns: ['id'],
  },
  {
    table: 'spell_loadout_entries',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_loadouts',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'spell_selection_slots',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'spell_selection_slots',
    columns: ['fixed_spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_selection_slots',
    columns: ['current_spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_selection_slots',
    columns: ['source_instance_id', 'character_id'],
    target: 'character_source_instances',
    targetColumns: ['id', 'character_id'],
  },
  {
    table: 'spell_version_attack_modes',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_version_conditions',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_version_damage_types',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_version_publications',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_version_save_abilities',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_version_tags',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
  {
    table: 'spell_versions',
    columns: ['spell_identity_id'],
    target: 'spell_identities',
    targetColumns: ['id'],
  },
  {
    table: 'subclass_definitions',
    columns: ['class_definition_id'],
    target: 'class_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'subclass_features',
    columns: ['subclass_definition_id'],
    target: 'subclass_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'subclass_progressions',
    columns: ['subclass_definition_id'],
    target: 'subclass_definitions',
    targetColumns: ['id'],
  },
  {
    table: 'warning_acknowledgements',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'wizard_spellbook_entries',
    columns: ['character_id'],
    target: 'characters',
    targetColumns: ['id'],
  },
  {
    table: 'wizard_spellbook_entries',
    columns: ['spell_version_id'],
    target: 'spell_versions',
    targetColumns: ['id'],
  },
] as const;

export type ForeignKeyFact = (typeof FOREIGN_KEY_FACTS)[number];
