import type { DatabaseContext } from '../db/database';
import type { NamedSpeciesTraitEffect } from './species-effects';

/**
 * PICKING A TEMPLATE IS A COPY, AND THE COPY IS THE WHOLE MECHANISM (D1b).
 *
 * `speciesFromTemplate` and its two siblings are the origins analogue of
 * `weaponFromTemplate`: a spread that drops the catalog-only fields and nulls
 * the character-only ones. They are deliberately unremarkable. What matters is
 * what they do NOT do — they do not record which template was used, because
 * there is no column to record it in and no query anywhere that would read one.
 *
 * AFTER THE COPY THERE IS NO LINK. Renaming the species, changing its Speed or
 * rewriting a trait cannot reach the catalog, and re-seeding the catalog cannot
 * reach the character. There is no "re-sync" affordance anywhere because there
 * is deliberately nothing to re-sync — the same argument the weapons picker
 * records, and the reason the upgrade-in-place problem D1b removed cannot come
 * back through this door.
 *
 * THE OTHER HALF OF PICKING A SPECIES IS NOT HERE, AND MUST NOT BE. Choosing a
 * species also creates a `character_source_instances` row pointing at the
 * `species_definitions` row whose `grant_rules` mint spell selection slots.
 * THAT is a live catalog reference and stays one: `src/grants/` is 1,600 lines
 * of slot generation, completeness detection and share/backup handling, and a
 * copied spell grant would need a second one of each. Reuse before inventing.
 *
 * The two rows share a `content_key` and come from the same parse. The cost is
 * that they can diverge — editing the copied trait text does not change the
 * granted spells — which is correct (values are the character's, grants are the
 * catalog's) and is said here rather than left to be discovered.
 */

/** The catalog-only columns, named once so the copies cannot drift apart. */
type CatalogOnly = 'id' | 'content_key' | 'rules_edition' | 'created_at' | 'updated_at';

export interface SpeciesTemplateRow {
  readonly id: number;
  readonly content_key: string;
  readonly rules_edition: string;
  readonly name: string;
  readonly creature_type: string;
  readonly size: string;
  readonly alternate_size: string | null;
  readonly base_speed_feet: number;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

export interface SpeciesTemplateTraitRow extends NamedSpeciesTraitEffect {
  readonly id: number;
  readonly species_template_id: number;
  readonly sort_order: number;
  readonly name: string;
  readonly description: string;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

export interface BackgroundTemplateRow {
  readonly id: number;
  readonly content_key: string;
  readonly rules_edition: string;
  readonly name: string;
  readonly ability_score_1: string;
  readonly ability_score_2: string;
  readonly ability_score_3: string;
  readonly feat_name: string;
  readonly skill_proficiency_1: string;
  readonly skill_proficiency_2: string;
  readonly tool_proficiency: string;
  readonly equipment_option_a: string;
  readonly equipment_option_b: string;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

/** The fillable columns of `character_species`, values only. */
export interface CharacterSpeciesFields {
  readonly name: string;
  readonly creature_type: string | null;
  readonly size: string | null;
  readonly base_speed_feet: number | null;
  readonly notes: string | null;
}

/** The fillable columns of `character_species_traits`, values only. */
export interface CharacterSpeciesTraitFields extends NamedSpeciesTraitEffect {
  readonly sort_order: number;
  readonly name: string;
  readonly description: string | null;
  readonly notes: string | null;
}

/** The fillable columns of `character_background`, values only. */
export interface CharacterBackgroundFields
  extends Omit<BackgroundTemplateRow, CatalogOnly> {
  readonly notes: string | null;
}

/**
 * `alternate_size` is DROPPED, not copied, and that is the one interesting line
 * in this file. The template's second size is an OFFER — Human and Tiefling let
 * the player choose Medium or Small — and the character has chosen. Recording
 * the option they did not take would put the catalog back on a row whose whole
 * purpose is to be free of it.
 *
 * The default choice is the FIRST printed size, which is what the source lists
 * first; a user who wanted the other one changes it, and nothing remembers that
 * they did.
 */
export function speciesFromTemplate(
  template: SpeciesTemplateRow,
): CharacterSpeciesFields {
  const {
    id: _id,
    content_key: _key,
    rules_edition: _edition,
    alternate_size: _alternate,
    created_at: _created,
    updated_at: _updated,
    ...profile
  } = template;
  return { ...profile, notes: null };
}

export function speciesTraitFromTemplate(
  trait: SpeciesTemplateTraitRow,
): CharacterSpeciesTraitFields {
  const {
    id: _id,
    species_template_id: _template,
    created_at: _created,
    updated_at: _updated,
    ...profile
  } = trait;
  return { ...profile, notes: null };
}

export function backgroundFromTemplate(
  template: BackgroundTemplateRow,
): CharacterBackgroundFields {
  const {
    id: _id,
    content_key: _key,
    rules_edition: _edition,
    created_at: _created,
    updated_at: _updated,
    ...profile
  } = template;
  return { ...profile, notes: null };
}

/**
 * Reads a character's own trait rows, in printed order, for the derivations in
 * `./species-effects.ts`.
 *
 * `sort_order, id` and not `id` alone: the order is the character's, a share
 * import writes it from array position, and two traits may legitimately end up
 * sharing a `sort_order` while a user is reordering their list — the schema
 * does not make it unique on this side, deliberately.
 */
export function characterSpeciesTraits(
  db: DatabaseContext,
  characterId: number,
): NamedSpeciesTraitEffect[] {
  return db.all(
    `SELECT name, effect_kind, effect_damage_type, effect_hit_points_flat,
            effect_hit_points_per_level, effect_speed_bonus_feet
       FROM character_species_traits
      WHERE character_id = ?
      ORDER BY sort_order, id`,
    [characterId],
    (row): NamedSpeciesTraitEffect => ({
      name: String(row.name),
      effect_kind: row.effect_kind === null ? null : String(row.effect_kind),
      effect_damage_type:
        row.effect_damage_type === null ? null : String(row.effect_damage_type),
      effect_hit_points_flat:
        row.effect_hit_points_flat === null
          ? null
          : Number(row.effect_hit_points_flat),
      effect_hit_points_per_level:
        row.effect_hit_points_per_level === null
          ? null
          : Number(row.effect_hit_points_per_level),
      effect_speed_bonus_feet:
        row.effect_speed_bonus_feet === null
          ? null
          : Number(row.effect_speed_bonus_feet),
    }),
  );
}
