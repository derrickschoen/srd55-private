import type { DatabaseContext } from '../db/database';
import { sqlNullableDamageType } from '../db/codecs';
import type {
  CreatureSize,
  CreatureType,
  DamageType,
  KnownCreatureSize,
  KnownCreatureType,
  KnownDamageType,
} from '../domain/enums';
import type { EffectRow } from './species-effects';

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
  readonly creature_type: KnownCreatureType;
  readonly size: KnownCreatureSize;
  readonly alternate_size: KnownCreatureSize | null;
  readonly base_speed_feet: number;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

export interface SpeciesTemplateTraitRow {
  readonly id: number;
  readonly species_template_id: number;
  readonly sort_order: number;
  readonly name: string;
  readonly description: string;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

/**
 * One row of `species_template_trait_effects` — what a catalog trait GRANTS.
 *
 * It carries no `label`: on the catalog side the granting trait IS the parent
 * row, so there is nothing to name. The label appears at the moment of the
 * copy, taken from the trait's own name, which is why `effectsFromTemplate`
 * takes both.
 */
export interface SpeciesTemplateTraitEffectRow {
  readonly id: number;
  readonly species_template_trait_id: number;
  readonly sort_order: number;
  readonly effect_kind: string;
  readonly damage_type: KnownDamageType | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
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
  readonly creature_type: CreatureType | null;
  readonly size: CreatureSize | null;
  readonly base_speed_feet: number | null;
  readonly notes: string | null;
}

/** The fillable columns of `character_species_traits`, values only. */
export interface CharacterSpeciesTraitFields {
  readonly sort_order: number;
  readonly name: string;
  readonly description: string | null;
  readonly notes: string | null;
}

/**
 * The fillable columns of `character_effects`, values only.
 *
 * `source_instance_id` is NOT here and is not an oversight. The copy has no
 * source instance to point at: nothing in `src/` writes `species_definitions`,
 * so a character who picked a bundled SRD species has no species
 * `character_source_instances` row, and one who typed their own species never
 * will. The column is nullable exactly so this copy can leave it alone, and an
 * effect minted later can be given one without this function changing.
 */
export interface CharacterEffectFields {
  readonly sort_order: number;
  readonly effect_kind: string;
  readonly damage_type: DamageType | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  readonly label: string;
  readonly notes: string | null;
}

/**
 * An effect copied from a template, BEFORE it has a place in the character's
 * list.
 *
 * `sort_order` is missing on purpose and is the whole reason this type exists.
 * `character_effects` is a flat per-character list, so the position of an effect
 * inside ONE trait's declaration is not its position in that list: two traits
 * each declaring one effect would both offer `1`. Returning the template's
 * number and documenting that callers must ignore it invites a caller to
 * believe it; leaving it out makes the compiler ask for the real one.
 */
export type CharacterEffectProfile = Omit<CharacterEffectFields, 'sort_order'>;

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

/**
 * The second half of copying a trait: its EFFECTS become the character's own.
 *
 * A SEPARATE FUNCTION FROM `speciesTraitFromTemplate`, AND THAT IS THE WHOLE
 * INVERSION RESTATED IN CODE. The trait copy used to carry the effect payload
 * along inside the same spread, which is what made a trait the thing an effect
 * hung from and capped it at one. The two copies are now independent: a trait
 * with no effects produces no rows here, a trait with two produces two, and an
 * effect that no trait granted (a feat's, a user's own) never goes through this
 * function at all.
 *
 * `label` is the TRAIT'S NAME, and this is the only place that binding is made.
 * After it, the effect row stands alone: renaming the trait does not rename the
 * effect, which is the same severance D1b already applies to every other copied
 * value. The alternative — leaving the sheet to join back to the trait row —
 * is the coupling being removed.
 *
 * `sort_order` IS NOT RETURNED, and the template's own is dropped here with the
 * catalog keys. `character_effects` is a flat per-character list — two traits
 * each declaring one effect would both claim `1`, which the schema permits
 * deliberately (it is an `index`, not a `uniqueIndex`, exactly as
 * `character_species_traits` is) — so the only correct number is the one the
 * caller assigns while writing the whole species. The template's ordering is
 * still honoured: it is the ORDER OF THIS ARRAY, which is the same way
 * `speciesTraits` on the wire carries its order. See
 * `tests/integration/rules/origins.test.ts` for the renumbering caller.
 */
export function effectsFromTemplate(
  traitName: string,
  effects: readonly SpeciesTemplateTraitEffectRow[],
): CharacterEffectProfile[] {
  return effects.map((effect) => {
    const {
      id: _id,
      species_template_trait_id: _trait,
      sort_order: _order,
      created_at: _created,
      updated_at: _updated,
      ...profile
    } = effect;
    return { ...profile, label: traitName, notes: null };
  });
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
 * Reads a character's own EFFECT rows, in their own order, for the derivations
 * in `./species-effects.ts`.
 *
 * ONE TABLE, NO JOIN, AND THAT IS WHAT THE INVERSION BOUGHT. This used to read
 * six columns off `character_species_traits` and hand them to a summary that
 * ignored the trait's name, its description and every free-text row. The sheet
 * asks "what does this character have", and that is now literally the query.
 *
 * `sort_order, id` and not `id` alone: the order is the character's, a share
 * import writes it from array position, and two effects may legitimately end up
 * sharing a `sort_order` while a user is reordering their list — the schema
 * does not make it unique on this side, deliberately.
 */
export function characterEffects(
  db: DatabaseContext,
  characterId: number,
): EffectRow[] {
  return db.all(
    `SELECT effect_kind, damage_type, hit_points_flat, hit_points_per_level,
            speed_bonus_feet, label
       FROM character_effects
      WHERE character_id = ?
      ORDER BY sort_order, id`,
    [characterId],
    (row): EffectRow => ({
      effect_kind: String(row.effect_kind),
      damage_type: sqlNullableDamageType(row, 'damage_type'),
      hit_points_flat:
        row.hit_points_flat === null ? null : Number(row.hit_points_flat),
      hit_points_per_level:
        row.hit_points_per_level === null
          ? null
          : Number(row.hit_points_per_level),
      speed_bonus_feet:
        row.speed_bonus_feet === null ? null : Number(row.speed_bonus_feet),
      label: String(row.label),
    }),
  );
}
