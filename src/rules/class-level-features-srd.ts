/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The bundled Class Features cells of all twelve SRD class tables, parsed
 * from the SRD text AT BUILD TIME by `class-level-features-srd-reader.ts` and
 * read here from the generated artifact (`generated/class-level-features-srd.ts`,
 * written by `npm run srd:artifacts`). This module imports no SRD text.
 *
 * Consumers must use this model rather than scanning the extract or
 * maintaining per-class level literals.
 */
import {
  abilities,
  isEnumValue,
  type Ability,
  type CharacterLevel,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { DatabaseContext } from '../db/database';
import { sqlNullableString } from '../db/codecs';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import type { FeatFeatureEvidence } from '../builder/level-up-wizard';
import { deepFreeze } from '../domain/deep-freeze';
import {
  SrdClassLevelFeaturesError,
  type ClassFeatureEntitlementKind,
  type SrdClassLevelFeatures,
} from './class-level-features-srd-reader';
import { BUNDLED_SRD_CLASS_LEVEL_FEATURES } from './generated/class-level-features-srd';

export class SubclassSpellcastingAbilityError extends TypeError {
  override readonly name = 'SubclassSpellcastingAbilityError' as const;
  constructor(readonly ability: string) {
    super(`Subclass has unknown spellcasting ability '${ability}'.`);
  }
}

const BUNDLED_CLASS_LEVEL_FEATURES: readonly SrdClassLevelFeatures[] =
  deepFreeze(BUNDLED_SRD_CLASS_LEVEL_FEATURES);

const CLASS_LEVEL_FEATURES = new Map(
  BUNDLED_CLASS_LEVEL_FEATURES.map((entry) => [entry.class_name, entry]),
);

/** The twelve bundled class tables' feature cells, in source order. */
export function bundledSrdClassLevelFeatures(): readonly SrdClassLevelFeatures[] {
  return BUNDLED_CLASS_LEVEL_FEATURES;
}

export function classLevelFeaturesForClassName(
  className: string,
): SrdClassLevelFeatures | null {
  return CLASS_LEVEL_FEATURES.get(className) ?? null;
}

export function levelsWithClassFeatureEntitlement(
  className: string,
  entitlement: ClassFeatureEntitlementKind,
): ReadonlySet<number> | null {
  const features = classLevelFeaturesForClassName(className);
  if (features === null) {
    return null;
  }
  return new Set(
    features.levels
      .filter((entry) => entry.entitlements.includes(entitlement))
      .map((entry) => entry.class_level),
  );
}

/** Kept as the deliberately thin consumer named by the binding plan. */
export function asiLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return levelsWithClassFeatureEntitlement(
    className,
    'ability_score_improvement',
  );
}

export function epicBoonLevelsForClassName(
  className: string,
): ReadonlySet<number> | null {
  return levelsWithClassFeatureEntitlement(className, 'epic_boon');
}

export function subclassChoiceLevelForClassName(
  className: string,
): CharacterLevel | null {
  const features = classLevelFeaturesForClassName(className);
  if (features === null) {
    return null;
  }
  const levels = features.levels.filter((entry) =>
    entry.entitlements.includes('subclass_choice'),
  );
  if (levels.length !== 1) {
    throw new SrdClassLevelFeaturesError(
      `${className} must have exactly one named subclass choice, found ${String(levels.length)}.`,
    );
  }
  return levels[0]!.class_level;
}

export interface ProjectedBundledClass {
  readonly class_name: string;
  readonly class_level: CharacterLevel;
  readonly subclass: ProjectedSubclassFeatureSource | null;
}

export interface ProjectedSubclassFeatureSource {
  readonly content_key: ContentKey;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly spellcasting_ability: Ability | null;
}

export function projectedSubclassFeatureSource(
  db: DatabaseContext,
  contentKey: ContentKey,
): ProjectedSubclassFeatureSource {
  const source = db.one(
    `SELECT subclass.spellcasting_ability, identity.catalog_layer
       FROM subclass_definitions AS subclass
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'subclass'
        AND identity.content_key = subclass.content_key
      WHERE subclass.content_key = ?`,
    [contentKey],
    (row) => {
      const ability = sqlNullableString(row, 'spellcasting_ability');
      if (ability !== null && !isEnumValue(abilities, ability)) {
        throw new SubclassSpellcastingAbilityError(ability);
      }
      return {
        content_key: contentKey,
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
        spellcasting_ability: ability,
      };
    },
  );
  return source ?? {
    content_key: contentKey,
    catalog_layer: 'unknown',
    spellcasting_ability: null,
  };
}

/**
 * Evidence for the only two feature prerequisites in the bundled feat corpus.
 *
 * Known classes and subclasses prove presence/absence from sourced bundled
 * content. Imported content makes a negative unprovable, while any known
 * positive remains proof.
 */
export function featFeatureEvidenceForProjectedClasses(
  classes: readonly ProjectedBundledClass[],
): FeatFeatureEvidence {
  let hasUnknownFeatureSource = false;
  let fightingStyle = false;
  let spellcasting = false;
  for (const held of classes) {
    const table = classLevelFeaturesForClassName(held.class_name);
    if (table === null) {
      hasUnknownFeatureSource = true;
      continue;
    }
    const cells = table.levels.filter(
      (cell) => cell.class_level <= held.class_level,
    );
    fightingStyle ||= cells.some((cell) =>
      cell.entitlements.includes('fighting_style_feature'),
    );
    spellcasting ||= cells.some((cell) =>
      cell.entitlements.includes('spellcasting_feature'),
    );
    if (held.subclass !== null) {
      if (held.subclass.spellcasting_ability !== null && held.class_level >= 3) {
        spellcasting = true;
      } else if (held.subclass.catalog_layer !== 'bundled') {
        hasUnknownFeatureSource = true;
      }
    }
  }
  return {
    fighting_style: fightingStyle
      ? 'present'
      : hasUnknownFeatureSource
        ? 'unprovable'
        : 'absent',
    spellcasting: spellcasting
      ? 'present'
      : hasUnknownFeatureSource
        ? 'unprovable'
        : 'absent',
  };
}
