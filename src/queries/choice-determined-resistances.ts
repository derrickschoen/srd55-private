import { characterSourceCatalogResolution } from '../catalog/recorded-source-provenance';
import { sqlInteger } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { CHOICE_DETERMINED_RESISTANCE_TRAITS } from '../rules/species-effects';
import { bundledSrdSpeciesContentKey } from './character-senses';

/**
 * The copied template refs of the ONE trait effect a made species choice names
 * (`CHOICE_DETERMINED_RESISTANCE_TRAITS`), for `resolveChoiceDeterminedResistances`.
 *
 * Empty unless the relation is established rather than guessed: the choice's
 * rule is a stated one, and the character's species source resolves to that
 * relation's BUNDLED SRD species. The refs are then the untyped
 * damage-resistance effects of that species template's stated trait, which is
 * what `effectsFromTemplate` (`src/rules/origins.ts`) copied onto the
 * character as `species_template_trait_effects:<id>`.
 */
export function choiceDeterminedResistanceRefs(
  db: DatabaseContext,
  sourceInstanceId: number,
  ruleKey: string,
): readonly string[] {
  const relation = CHOICE_DETERMINED_RESISTANCE_TRAITS.find((entry) => entry.choiceRuleKey === ruleKey);
  if (relation === undefined) return [];
  const contentKey = bundledSrdSpeciesContentKey(relation.species);
  const resolution = characterSourceCatalogResolution(db, sourceInstanceId);
  if (resolution.catalog_layer !== 'bundled' || resolution.content_key !== contentKey) return [];
  return db.all(
    `SELECT effect.id
     FROM species_template_trait_effects AS effect
     JOIN species_template_traits AS trait ON trait.id = effect.species_template_trait_id
     JOIN species_templates AS template ON template.id = trait.species_template_id
     WHERE template.content_key = ? AND trait.name = ?
       AND effect.effect_kind = 'damage_resistance' AND effect.damage_type IS NULL
     ORDER BY effect.id`,
    [contentKey, relation.trait],
    (row) => `species_template_trait_effects:${String(sqlInteger(row, 'id'))}`,
  );
}
