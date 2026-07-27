import { relations } from 'drizzle-orm';
import {
  background_definitions,
  feat_definitions,
  species_definitions,
} from './catalog-sources';
import {
  class_definitions,
  class_progressions,
  named_features,
  subclass_definitions,
  subclass_features,
  subclass_progressions,
} from './catalog-classes';
import {
  spell_identities,
  spell_identity_aliases,
  spell_list_memberships,
  spell_version_attack_modes,
  spell_version_cantrip_upgrade_levels,
  spell_version_conditions,
  spell_version_damage_types,
  spell_version_publications,
  spell_version_save_abilities,
  spell_version_tags,
  spell_version_upcast_levels,
  spell_versions,
} from './catalog-spells';
import {
  change_log,
  character_class_levels,
  character_operations,
  character_rule_overrides,
  character_save_points,
  character_source_instances,
  character_spell_preferences,
  characters,
  spell_loadout_entries,
  spell_loadouts,
  spell_selection_slots,
  warning_acknowledgements,
  wizard_spellbook_entries,
} from './character';
import {
  character_weapons,
  class_weapon_mastery_counts,
  class_weapon_mastery_grants,
  weapon_templates,
} from './weapons';
import {
  background_equipment_items,
  background_templates,
  character_background,
  character_species,
  character_species_traits,
  character_effects,
  species_template_trait_effects,
  species_template_traits,
  species_templates,
} from './origins';
import {
  armor_templates,
  class_armor_training,
  class_extra_attack_grants,
  class_martial_arts_dice,
  class_saving_throw_proficiencies,
  class_sheet_traits,
  class_skill_options,
  class_weapon_proficiencies,
} from './sheet';
import {
  character_armor,
  character_hit_point_rolls,
  character_sheet_adjustments,
  character_skill_proficiencies,
} from './sheet-inputs';

/**
 * THE OBJECT GRAPH, DECLARED.
 *
 * Build-time only — nothing here is ever bundled. Its value is that
 * `tests/unit/schema-relations.test.ts` walks every edge declared here against
 * `PRAGMA foreign_key_list` IN BOTH DIRECTIONS: a relation with no foreign key
 * behind it fails, and a foreign key with no relation in front of it fails
 * too. Without the second direction this would be documentation that silently
 * falls behind.
 *
 * `character_source_instances.source_definition_id` is deliberately ABSENT:
 * it is a polymorphic reference resolved at runtime by `source_type`, has no
 * foreign key, and modelling it as one relation would be a lie about which
 * table it points into.
 */

export const charactersRelations = relations(characters, ({ many }) => ({
  class_levels: many(character_class_levels),
  source_instances: many(character_source_instances),
  spell_slots: many(spell_selection_slots),
  spellbook_entries: many(wizard_spellbook_entries),
  acknowledgements: many(warning_acknowledgements),
  save_points: many(character_save_points),
  loadouts: many(spell_loadouts),
  spell_preferences: many(character_spell_preferences),
  rule_overrides: many(character_rule_overrides),
  change_log_entries: many(change_log),
  operations: many(character_operations),
  weapons: many(character_weapons),
  species: many(character_species),
  species_traits: many(character_species_traits),
  background: many(character_background),
  armor: many(character_armor),
  hit_point_rolls: many(character_hit_point_rolls),
  skill_proficiencies: many(character_skill_proficiencies),
  sheet_adjustments: many(character_sheet_adjustments),
}));

/**
 * THE FOUR STORED SHEET INPUTS. Every one hangs off `characters` and off
 * NOTHING ELSE, and the four absences are as deliberate as the four edges:
 *
 *  - no `armor_template` edge from `character_armor`, for the D1b reason the
 *    weapon and origin pairs already record — there is no `armor_template_id`
 *    column for a relation to sit on, and declaring one would fail the reverse
 *    direction of the relations test.
 *  - no `class_level` edge from `character_hit_point_rolls`. It is keyed on a
 *    class NAME rather than on `character_class_levels.id`, so that deleting a
 *    class row cannot cascade away a die the player physically rolled. The
 *    price is an orphan roll, which `src/queries/character-completeness.ts`
 *    reports by name rather than hides.
 */
export const characterArmorRelations = relations(
  character_armor,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_armor.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterHitPointRollsRelations = relations(
  character_hit_point_rolls,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_hit_point_rolls.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterSkillProficienciesRelations = relations(
  character_skill_proficiencies,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_skill_proficiencies.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterSheetAdjustmentsRelations = relations(
  character_sheet_adjustments,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_sheet_adjustments.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterWeaponsRelations = relations(
  character_weapons,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_weapons.character_id],
      references: [characters.id],
    }),
    // NO `template` edge, and its absence is the point: by D1b a character's
    // weapon holds VALUES copied from a template, never a reference to one.
    // There is no `weapon_template_id` column for a relation to sit on, and
    // declaring one would fail the reverse direction of the relations test —
    // which is exactly the protection working.
  }),
);

/**
 * The weapon catalog points at nothing and nothing points at it. It is reached
 * by name from the picker and copied from; that is the whole of its coupling.
 */
export const weaponTemplatesRelations = relations(weapon_templates, () => ({}));

/**
 * ORIGINS. The same D1b shape as the weapon pair, one level richer: the
 * CATALOG has an internal parent/child edge (a species template owns its
 * traits), and the CHARACTER side deliberately has none.
 *
 * NO `template` EDGE anywhere on the character side, in either direction, and
 * that absence is the design: a character's species holds VALUES copied once,
 * there is no `species_template_id` column for a relation to sit on, and
 * declaring one would fail the reverse direction of the relations test.
 *
 * `character_species_traits` hangs off `characters` and NOT off
 * `character_species`, matching the foreign key it actually has — see
 * `db/schema/origins.ts` for why the key is on `character_id`.
 */
export const speciesTemplatesRelations = relations(
  species_templates,
  ({ many }) => ({
    traits: many(species_template_traits),
  }),
);

export const speciesTemplateTraitsRelations = relations(
  species_template_traits,
  ({ one, many }) => ({
    effects: many(species_template_trait_effects),
    species_template: one(species_templates, {
      fields: [species_template_traits.species_template_id],
      references: [species_templates.id],
    }),
  }),
);

/** Four flat columns and no children; nothing points at it either. */
export const backgroundTemplatesRelations = relations(
  background_templates,
  () => ({}),
);

/**
 * THE THREE EDGES THAT MAKE "NAME ONLY UNLESS WEAPON OR ARMOR" STRUCTURAL.
 *
 * Two of them point OUT of the origins catalog into the weapon and armour
 * catalogs, which is the first time any origins table has referenced another
 * catalog at all — and the reason `src/db/bootstrap.ts` had to be reordered.
 */
export const backgroundEquipmentItemsRelations = relations(
  background_equipment_items,
  ({ one }) => ({
    background_template: one(background_templates, {
      fields: [background_equipment_items.background_template_id],
      references: [background_templates.id],
    }),
    weapon_template: one(weapon_templates, {
      fields: [background_equipment_items.weapon_template_id],
      references: [weapon_templates.id],
    }),
    armor_template: one(armor_templates, {
      fields: [background_equipment_items.armor_template_id],
      references: [armor_templates.id],
    }),
  }),
);

export const characterSpeciesRelations = relations(
  character_species,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_species.character_id],
      references: [characters.id],
    }),
  }),
);

/**
 * The catalog effect's parent is the TRAIT, because a template effect is part
 * of what that printed trait grants. `character_effects` below is deliberately
 * NOT shaped this way: its parent is the character.
 */
export const speciesTemplateTraitEffectsRelations = relations(
  species_template_trait_effects,
  ({ one }) => ({
    species_template_trait: one(species_template_traits, {
      fields: [species_template_trait_effects.species_template_trait_id],
      references: [species_template_traits.id],
    }),
  }),
);

/**
 * TWO relations, and the second is the whole point of the inversion: an effect
 * belongs to the CHARACTER and OPTIONALLY points at the source instance that
 * granted it. It is the SECOND composite reference in this schema, after
 * `spell_selection_slots`, and for the identical reason — see the comment
 * there, and `character_effects.source_instance_id` itself.
 */
export const characterEffectsRelations = relations(
  character_effects,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_effects.character_id],
      references: [characters.id],
    }),
    // Composite, matching the schema exactly — a single-column relation here
    // would describe a constraint the database does not have and would let a
    // reader believe an effect could be attached to another character's source.
    source_instance: one(character_source_instances, {
      fields: [
        character_effects.source_instance_id,
        character_effects.character_id,
      ],
      references: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }),
  }),
);

export const characterSpeciesTraitsRelations = relations(
  character_species_traits,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_species_traits.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterBackgroundRelations = relations(
  character_background,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_background.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterSourceInstancesRelations = relations(
  character_source_instances,
  ({ one, many }) => ({
    character: one(characters, {
      fields: [character_source_instances.character_id],
      references: [characters.id],
    }),
    // Self-reference: a subclass instance hangs off the class instance that
    // granted it, and survives its deletion as an orphan (ON DELETE SET NULL).
    parent: one(character_source_instances, {
      fields: [character_source_instances.parent_source_instance_id],
      references: [character_source_instances.id],
      relationName: 'source_instance_parent',
    }),
    children: many(character_source_instances, {
      relationName: 'source_instance_parent',
    }),
    slots: many(spell_selection_slots),
  }),
);

export const characterClassLevelsRelations = relations(
  character_class_levels,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_class_levels.character_id],
      references: [characters.id],
    }),
    class_definition: one(class_definitions, {
      fields: [character_class_levels.class_definition_id],
      references: [class_definitions.id],
    }),
    // Composite: the subclass must belong to the same class. Note SQLite is
    // MATCH SIMPLE, so this is unenforced while subclass_definition_id is NULL.
    subclass_definition: one(subclass_definitions, {
      fields: [
        character_class_levels.subclass_definition_id,
        character_class_levels.class_definition_id,
      ],
      references: [
        subclass_definitions.id,
        subclass_definitions.class_definition_id,
      ],
    }),
  }),
);

export const spellSelectionSlotsRelations = relations(
  spell_selection_slots,
  ({ one }) => ({
    character: one(characters, {
      fields: [spell_selection_slots.character_id],
      references: [characters.id],
    }),
    // Composite, and the reason the (id, character_id) unique key exists: a
    // slot cannot be attached to another character's source instance.
    source_instance: one(character_source_instances, {
      fields: [
        spell_selection_slots.source_instance_id,
        spell_selection_slots.character_id,
      ],
      references: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }),
    fixed_spell: one(spell_versions, {
      fields: [spell_selection_slots.fixed_spell_version_id],
      references: [spell_versions.id],
      relationName: 'slot_fixed_spell',
    }),
    current_spell: one(spell_versions, {
      fields: [spell_selection_slots.current_spell_version_id],
      references: [spell_versions.id],
      relationName: 'slot_current_spell',
    }),
  }),
);

export const wizardSpellbookEntriesRelations = relations(
  wizard_spellbook_entries,
  ({ one }) => ({
    character: one(characters, {
      fields: [wizard_spellbook_entries.character_id],
      references: [characters.id],
    }),
    spell_version: one(spell_versions, {
      fields: [wizard_spellbook_entries.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const changeLogRelations = relations(change_log, ({ one }) => ({
  character: one(characters, {
    fields: [change_log.character_id],
    references: [characters.id],
  }),
}));

export const characterSavePointsRelations = relations(
  character_save_points,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_save_points.character_id],
      references: [characters.id],
    }),
  }),
);

export const warningAcknowledgementsRelations = relations(
  warning_acknowledgements,
  ({ one }) => ({
    character: one(characters, {
      fields: [warning_acknowledgements.character_id],
      references: [characters.id],
    }),
  }),
);

export const spellLoadoutsRelations = relations(
  spell_loadouts,
  ({ one, many }) => ({
    character: one(characters, {
      fields: [spell_loadouts.character_id],
      references: [characters.id],
    }),
    entries: many(spell_loadout_entries),
  }),
);

export const spellLoadoutEntriesRelations = relations(
  spell_loadout_entries,
  ({ one }) => ({
    loadout: one(spell_loadouts, {
      fields: [spell_loadout_entries.spell_loadout_id],
      references: [spell_loadouts.id],
    }),
    spell_version: one(spell_versions, {
      fields: [spell_loadout_entries.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const characterSpellPreferencesRelations = relations(
  character_spell_preferences,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_spell_preferences.character_id],
      references: [characters.id],
    }),
    spell_version: one(spell_versions, {
      fields: [character_spell_preferences.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const characterRuleOverridesRelations = relations(
  character_rule_overrides,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_rule_overrides.character_id],
      references: [characters.id],
    }),
  }),
);

export const characterOperationsRelations = relations(
  character_operations,
  ({ one }) => ({
    character: one(characters, {
      fields: [character_operations.character_id],
      references: [characters.id],
    }),
  }),
);

export const spellIdentitiesRelations = relations(
  spell_identities,
  ({ many }) => ({
    // NOT claimed: that an identity has at least one version. Nothing enforces
    // it, so the contract does not guarantee it.
    versions: many(spell_versions),
    aliases: many(spell_identity_aliases),
  }),
);

export const spellIdentityAliasesRelations = relations(
  spell_identity_aliases,
  ({ one }) => ({
    identity: one(spell_identities, {
      fields: [spell_identity_aliases.spell_identity_id],
      references: [spell_identities.id],
    }),
  }),
);

export const spellVersionsRelations = relations(
  spell_versions,
  ({ one, many }) => ({
    // NOT NULL: a version ALWAYS resolves to an identity.
    identity: one(spell_identities, {
      fields: [spell_versions.spell_identity_id],
      references: [spell_identities.id],
    }),
    publications: many(spell_version_publications),
    list_memberships: many(spell_list_memberships),
    tags: many(spell_version_tags),
    damage_types: many(spell_version_damage_types),
    conditions: many(spell_version_conditions),
    attack_modes: many(spell_version_attack_modes),
    save_abilities: many(spell_version_save_abilities),
  }),
);

export const spellVersionPublicationsRelations = relations(
  spell_version_publications,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_publications.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellListMembershipsRelations = relations(
  spell_list_memberships,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_list_memberships.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionTagsRelations = relations(
  spell_version_tags,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_tags.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionUpcastLevelsRelations = relations(
  spell_version_upcast_levels,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_upcast_levels.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionCantripUpgradeLevelsRelations = relations(
  spell_version_cantrip_upgrade_levels,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_cantrip_upgrade_levels.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionDamageTypesRelations = relations(
  spell_version_damage_types,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_damage_types.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionConditionsRelations = relations(
  spell_version_conditions,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_conditions.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionAttackModesRelations = relations(
  spell_version_attack_modes,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_attack_modes.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const spellVersionSaveAbilitiesRelations = relations(
  spell_version_save_abilities,
  ({ one }) => ({
    spell_version: one(spell_versions, {
      fields: [spell_version_save_abilities.spell_version_id],
      references: [spell_versions.id],
    }),
  }),
);

export const classDefinitionsRelations = relations(
  class_definitions,
  ({ many }) => ({
    progressions: many(class_progressions),
    subclasses: many(subclass_definitions),
    class_levels: many(character_class_levels),
    weapon_mastery_grant: many(class_weapon_mastery_grants),
    weapon_mastery_counts: many(class_weapon_mastery_counts),
    // Sheet core. `sheet_traits` is `many` and not `one` even though a unique
    // index makes it 1:0..1, matching how `weapon_mastery_grant` is declared
    // beside it: the reverse side of these is uniformly `many` in this file, and
    // the uniqueness is expressed by the index rather than by the relation.
    sheet_traits: many(class_sheet_traits),
    saving_throw_proficiencies: many(class_saving_throw_proficiencies),
    skill_options: many(class_skill_options),
    armor_training: many(class_armor_training),
    weapon_proficiencies: many(class_weapon_proficiencies),
    extra_attack_grants: many(class_extra_attack_grants),
    martial_arts_dice: many(class_martial_arts_dice),
    // D19: a named feature hangs off the class whose LEVEL its prerequisite
    // counts, which is the only relationship it has to a class at all — it is
    // not a class table row and the character has not necessarily taken it.
    named_features: many(named_features),
  }),
);

/**
 * The seven sheet-core class tables all hang off `class_definitions` by the same
 * cascading foreign key, so their relations are identical in shape.
 */
export const classSheetTraitsRelations = relations(
  class_sheet_traits,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_sheet_traits.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classSavingThrowProficienciesRelations = relations(
  class_saving_throw_proficiencies,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_saving_throw_proficiencies.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classSkillOptionsRelations = relations(
  class_skill_options,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_skill_options.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classArmorTrainingRelations = relations(
  class_armor_training,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_armor_training.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classWeaponProficienciesRelations = relations(
  class_weapon_proficiencies,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_weapon_proficiencies.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classExtraAttackGrantsRelations = relations(
  class_extra_attack_grants,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_extra_attack_grants.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classMartialArtsDiceRelations = relations(
  class_martial_arts_dice,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_martial_arts_dice.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

/**
 * The armour catalog points at nothing and nothing points at it — identical to
 * `weapon_templates`, and for the identical D1b reason: a character stores
 * VALUES copied from a template, so there is no column for an edge to sit on.
 */
export const armorTemplatesRelations = relations(armor_templates, () => ({}));

export const classWeaponMasteryGrantsRelations = relations(
  class_weapon_mastery_grants,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_weapon_mastery_grants.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classWeaponMasteryCountsRelations = relations(
  class_weapon_mastery_counts,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_weapon_mastery_counts.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const classProgressionsRelations = relations(
  class_progressions,
  ({ one }) => ({
    class_definition: one(class_definitions, {
      fields: [class_progressions.class_definition_id],
      references: [class_definitions.id],
    }),
  }),
);

export const subclassDefinitionsRelations = relations(
  subclass_definitions,
  ({ one, many }) => ({
    class_definition: one(class_definitions, {
      fields: [subclass_definitions.class_definition_id],
      references: [class_definitions.id],
    }),
    progressions: many(subclass_progressions),
    features: many(subclass_features),
  }),
);

export const subclassProgressionsRelations = relations(
  subclass_progressions,
  ({ one }) => ({
    subclass_definition: one(subclass_definitions, {
      fields: [subclass_progressions.subclass_definition_id],
      references: [subclass_definitions.id],
    }),
  }),
);

export const subclassFeaturesRelations = relations(
  subclass_features,
  ({ one }) => ({
    subclass_definition: one(subclass_definitions, {
      fields: [subclass_features.subclass_definition_id],
      references: [subclass_definitions.id],
    }),
  }),
);

export const namedFeaturesRelations = relations(named_features, ({ one }) => ({
  class_definition: one(class_definitions, {
    fields: [named_features.class_definition_id],
    references: [class_definitions.id],
  }),
}));

// Standalone source definitions are pointed AT polymorphically and have no
// foreign keys of their own, in either direction.
export const featDefinitionsRelations = relations(feat_definitions, () => ({}));
export const speciesDefinitionsRelations = relations(
  species_definitions,
  () => ({}),
);
export const backgroundDefinitionsRelations = relations(
  background_definitions,
  () => ({}),
);
