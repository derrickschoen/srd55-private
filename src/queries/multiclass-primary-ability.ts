import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { abilities, type Ability } from '../domain/enums';
import type { ClassDefinitionId } from '../domain/ids';
import {
  decodePrimaryAbilityExpression,
  evaluateMulticlassPrimaryAbilityMinimum,
  type MulticlassPrimaryAbilityResult,
  type MulticlassPrimaryAbilityWarning,
  type PrimaryAbilityExpression,
  type PrimaryAbilityScore,
} from '../domain/primary-ability';
import {
  resolveCharacterAbilities,
  resolvedTotals,
} from '../rules/ability-contributions';
import { CharacterNotFoundError } from './character-crud';

interface CharacterAbilityRow {
  readonly base_abilities: Readonly<Record<Ability, number>>;
}

interface HeldClassPrerequisiteRow {
  readonly class_definition_id: ClassDefinitionId;
  readonly class_name: string;
  readonly class_catalog_layer: CatalogLayerDisclosure;
  readonly stored_expression: string | null;
}

export type MulticlassPrimaryAbilityAssessment =
  | (HeldClassPrerequisiteRow & {
      readonly status: 'not_applicable';
      readonly evaluation: null;
      readonly warning: null;
    })
  | (HeldClassPrerequisiteRow & {
      readonly status: 'met';
      readonly evaluation: Extract<
        MulticlassPrimaryAbilityResult,
        { readonly status: 'met' }
      >;
      readonly warning: null;
    })
  | (HeldClassPrerequisiteRow & {
      readonly status: 'unmet';
      readonly evaluation: Extract<
        MulticlassPrimaryAbilityResult,
        { readonly status: 'unmet' }
      >;
      readonly warning: MulticlassPrimaryAbilityWarning & {
        readonly kind: 'multiclass_primary_ability_unmet';
      };
    })
  | (HeldClassPrerequisiteRow & {
      readonly status: 'unprovable';
      readonly evaluation: Extract<
        MulticlassPrimaryAbilityResult,
        { readonly status: 'unprovable' }
      >;
      readonly warning: MulticlassPrimaryAbilityWarning & {
        readonly kind: 'multiclass_primary_ability_unprovable';
      };
    });

const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

function sentenceList(values: readonly string[], conjunction: 'and' | 'or'): string {
  if (values.length <= 1) return values[0] ?? '';
  return `${values.slice(0, -1).join(', ')} ${conjunction} ${values[values.length - 1]!}`;
}

function expressionRequirement(expression: PrimaryAbilityExpression): string {
  return sentenceList(
    expression.abilities.map((ability) => ABILITY_LABELS[ability]),
    expression.kind === 'one_of' ? 'or' : 'and',
  );
}

function scoreEvidence(scores: readonly PrimaryAbilityScore[]): string {
  const values = scores.map(
    ({ ability, score }) =>
      `${ABILITY_LABELS[ability]} ${score === null ? 'UNKNOWN' : String(score)}`,
  );
  return sentenceList(values, 'and');
}

function unmetWarning(
  row: HeldClassPrerequisiteRow,
  evaluation: Extract<
    MulticlassPrimaryAbilityResult,
    { readonly status: 'unmet' }
  >,
): MulticlassPrimaryAbilityWarning & {
  readonly kind: 'multiclass_primary_ability_unmet';
} {
  const noun = evaluation.scores.length === 1 ? 'score is' : 'scores are';
  return {
    kind: 'multiclass_primary_ability_unmet',
    class_definition_id: row.class_definition_id,
    class_name: row.class_name,
    class_catalog_layer: row.class_catalog_layer,
    title: `${row.class_name} multiclass ability minimum not met`,
    detail:
      `${row.class_name} requires ${expressionRequirement(evaluation.expression)} ` +
      `${String(evaluation.minimum)} to multiclass; its current ${noun} ` +
      `${scoreEvidence(evaluation.scores)}.`,
    remedy:
      'Multiclassing remains allowed. Raise the named score to clear this permanent warning.',
  };
}

function unprovableWarning(
  row: HeldClassPrerequisiteRow,
  evaluation: Extract<
    MulticlassPrimaryAbilityResult,
    { readonly status: 'unprovable' }
  >,
): MulticlassPrimaryAbilityWarning & {
  readonly kind: 'multiclass_primary_ability_unprovable';
} {
  const reason = evaluation.reason === 'missing_expression'
    ? 'has no stored primary-ability expression'
    : evaluation.reason === 'invalid_expression'
      ? 'has a stored primary-ability expression this application cannot read'
      : `has incomplete score evidence (${scoreEvidence(evaluation.scores)})`;
  return {
    kind: 'multiclass_primary_ability_unprovable',
    class_definition_id: row.class_definition_id,
    class_name: row.class_name,
    class_catalog_layer: row.class_catalog_layer,
    title: `${row.class_name} multiclass ability minimum cannot be verified`,
    detail: `${row.class_name} ${reason}, so its multiclass minimum cannot be judged.`,
    remedy:
      'Multiclassing remains allowed. Repair the stored expression or missing score to make this warning decidable.',
  };
}

/**
 * The one D96 query seam for planner, level-up, and sheet projections.
 *
 * Every held class is evaluated once a character is multiclassed: this checks
 * both the class entered and every class already held. A single-class
 * character is explicitly not-applicable rather than silently treated as met.
 */
export class MulticlassPrimaryAbilityQueries {
  constructor(private readonly db: DatabaseContext) {}

  build(characterId: number): readonly MulticlassPrimaryAbilityAssessment[] {
    const character = this.db.one(
      `SELECT strength, dexterity, constitution, intelligence, wisdom, charisma
       FROM characters
       WHERE id = ?`,
      [characterId],
      (row): CharacterAbilityRow => ({
        base_abilities: Object.fromEntries(
          abilities.map((ability) => [ability, sqlInteger(row, ability)]),
        ) as Record<Ability, number>,
      }),
    );
    if (character === null) {
      throw new CharacterNotFoundError(characterId);
    }

    const held = this.db.all(
      `SELECT definition.id AS class_definition_id,
              definition.name AS class_name,
              identity.catalog_layer AS class_catalog_layer,
              definition.primary_ability_expression AS stored_expression
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'class'
        AND identity.content_key = definition.content_key
       WHERE level.character_id = ?
       ORDER BY definition.name, level.id`,
      [characterId],
      (row): HeldClassPrerequisiteRow => ({
        class_definition_id:
          sqlInteger(row, 'class_definition_id') as ClassDefinitionId,
        class_name: sqlString(row, 'class_name'),
        class_catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'class_catalog_layer'),
        ),
        stored_expression: sqlNullableString(row, 'stored_expression'),
      }),
    );
    if (held.length < 2) {
      return held.map((row) => ({
        ...row,
        status: 'not_applicable',
        evaluation: null,
        warning: null,
      }));
    }

    const totals = resolvedTotals(
      resolveCharacterAbilities(
        this.db,
        characterId,
        character.base_abilities,
      ),
    );
    return held.map((row): MulticlassPrimaryAbilityAssessment => {
      const evaluation = evaluateMulticlassPrimaryAbilityMinimum(
        decodePrimaryAbilityExpression(row.stored_expression),
        totals,
      );
      switch (evaluation.status) {
        case 'met':
          return { ...row, status: 'met', evaluation, warning: null };
        case 'unmet':
          return {
            ...row,
            status: 'unmet',
            evaluation,
            warning: unmetWarning(row, evaluation),
          };
        case 'unprovable':
          return {
            ...row,
            status: 'unprovable',
            evaluation,
            warning: unprovableWarning(row, evaluation),
          };
      }
    });
  }
}

export function multiclassAssessmentForClass(
  assessments: readonly MulticlassPrimaryAbilityAssessment[],
  classDefinitionId: number,
): MulticlassPrimaryAbilityAssessment {
  const assessment = assessments.find(
    (entry) => entry.class_definition_id === classDefinitionId,
  );
  if (assessment === undefined) {
    throw new Error(
      `Held class ${String(classDefinitionId)} has no multiclass prerequisite assessment.`,
    );
  }
  return assessment;
}
