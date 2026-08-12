import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
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
} from './ability-contributions';
import {
  readMulticlassPrerequisiteHouseRule,
  MULTICLASS_PREREQUISITE_WAIVER_EXPLANATION,
  type MulticlassPrerequisiteHouseRule,
} from './multiclass-prerequisite-house-rule';

export interface MulticlassPrerequisiteClass {
  readonly class_definition_id: ClassDefinitionId;
  readonly class_name: string;
  readonly class_catalog_layer: CatalogLayerDisclosure;
  readonly stored_expression: string | null;
}

/**
 * An authored class with no expression declares no multiclass prerequisite.
 * This is distinct from malformed non-empty content, which remains
 * unprovable and therefore fail-closed at entry.
 */
export function classDefinesMulticlassPrerequisite(
  row: MulticlassPrerequisiteClass,
): boolean {
  return row.stored_expression !== null && row.stored_expression.trim() !== '';
}

export type EvaluatedMulticlassPrerequisite =
  | (MulticlassPrerequisiteClass & {
      readonly status: 'met';
      readonly evaluation: Extract<
        MulticlassPrimaryAbilityResult,
        { readonly status: 'met' }
      >;
      readonly warning: null;
    })
  | (MulticlassPrerequisiteClass & {
      readonly status: 'unmet';
      readonly evaluation: Extract<
        MulticlassPrimaryAbilityResult,
        { readonly status: 'unmet' }
      >;
      readonly warning: MulticlassPrimaryAbilityWarning & {
        readonly kind: 'multiclass_primary_ability_unmet';
      };
    })
  | (MulticlassPrerequisiteClass & {
      readonly status: 'unprovable';
      readonly evaluation: Extract<
        MulticlassPrimaryAbilityResult,
        { readonly status: 'unprovable' }
      >;
      readonly warning: MulticlassPrimaryAbilityWarning & {
        readonly kind: 'multiclass_primary_ability_unprovable';
      };
    });

type MulticlassEntryFailure = Extract<
  EvaluatedMulticlassPrerequisite,
  { readonly status: 'unmet' | 'unprovable' }
>;

export type MulticlassEntryAssessment =
  | {
      readonly status: 'not_applicable' | 'eligible';
      readonly failures: readonly [];
      readonly refusal: null;
    }
  | {
      readonly status: 'waived';
      readonly failures: readonly [
        MulticlassEntryFailure,
        ...MulticlassEntryFailure[],
      ];
      readonly refusal: null;
      readonly explanation: typeof MULTICLASS_PREREQUISITE_WAIVER_EXPLANATION;
    }
  | {
      readonly status: 'blocked';
      readonly failures: readonly [
        MulticlassEntryFailure,
        ...MulticlassEntryFailure[],
      ];
      readonly refusal: string;
    };

const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

function sentenceList(
  values: readonly string[],
  conjunction: 'and' | 'or',
): string {
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
  return sentenceList(
    scores.map(
      ({ ability, score }) =>
        `${ABILITY_LABELS[ability]} ${score === null ? 'UNKNOWN' : String(score)}`,
    ),
    'and',
  );
}

function unmetWarning(
  row: MulticlassPrerequisiteClass,
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
      `Raise the named score before adding another class, or remove ${row.class_name} if it was added outside the default rules path.`,
  };
}

function unprovableWarning(
  row: MulticlassPrerequisiteClass,
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
      `Repair ${row.class_name}’s stored prerequisite or the missing ability score before adding another class.`,
  };
}

function classRow(
  db: DatabaseContext,
  classDefinitionId: number,
): MulticlassPrerequisiteClass | null {
  return db.one(
    `SELECT definition.id AS class_definition_id,
            definition.name AS class_name,
            identity.catalog_layer AS class_catalog_layer,
            definition.primary_ability_expression AS stored_expression
     FROM class_definitions AS definition
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'class'
      AND identity.content_key = definition.content_key
     WHERE definition.id = ?`,
    [classDefinitionId],
    (row) => ({
      class_definition_id:
        sqlInteger(row, 'class_definition_id') as ClassDefinitionId,
      class_name: sqlString(row, 'class_name'),
      class_catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'class_catalog_layer'),
      ),
      stored_expression: sqlNullableString(row, 'stored_expression'),
    }),
  );
}

export function heldMulticlassPrerequisiteClasses(
  db: DatabaseContext,
  characterId: number,
): readonly MulticlassPrerequisiteClass[] {
  return db.all(
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
    (row) => ({
      class_definition_id:
        sqlInteger(row, 'class_definition_id') as ClassDefinitionId,
      class_name: sqlString(row, 'class_name'),
      class_catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'class_catalog_layer'),
      ),
      stored_expression: sqlNullableString(row, 'stored_expression'),
    }),
  );
}

function characterTotals(
  db: DatabaseContext,
  characterId: number,
): Readonly<Record<Ability, number>> {
  const base = db.one(
    `SELECT strength, dexterity, constitution, intelligence, wisdom, charisma
     FROM characters WHERE id = ?`,
    [characterId],
    (row) => Object.fromEntries(
      abilities.map((ability) => [ability, sqlInteger(row, ability)]),
    ) as Record<Ability, number>,
  );
  if (base === null) {
    throw new TypeError(`Character ${String(characterId)} does not exist.`);
  }
  return resolvedTotals(resolveCharacterAbilities(db, characterId, base));
}

export function evaluateMulticlassPrerequisiteClasses(
  db: DatabaseContext,
  characterId: number,
  classes: readonly MulticlassPrerequisiteClass[],
): readonly EvaluatedMulticlassPrerequisite[] {
  const totals = characterTotals(db, characterId);
  return evaluateWithTotals(classes, totals);
}

function evaluateWithTotals(
  classes: readonly MulticlassPrerequisiteClass[],
  totals: Readonly<Record<Ability, number>>,
): readonly EvaluatedMulticlassPrerequisite[] {
  return classes.map((row): EvaluatedMulticlassPrerequisite => {
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

function entryAssessment(
  candidate: MulticlassPrerequisiteClass,
  held: readonly MulticlassPrerequisiteClass[],
  totals: Readonly<Record<Ability, number>>,
  houseRule: MulticlassPrerequisiteHouseRule,
): MulticlassEntryAssessment {
  const evaluated = evaluateWithTotals(
    [...held, candidate].filter(classDefinesMulticlassPrerequisite),
    totals,
  );
  const failures = evaluated.filter(
    (entry): entry is Extract<
      EvaluatedMulticlassPrerequisite,
      { readonly status: 'unmet' | 'unprovable' }
    > => entry.status !== 'met',
  );
  const firstFailure = failures[0];
  if (firstFailure === undefined) {
    return { status: 'eligible', failures: [], refusal: null };
  }
  const nonEmptyFailures = [firstFailure, ...failures.slice(1)] as const;
  if (houseRule.status === 'on') {
    return {
      status: 'waived',
      failures: nonEmptyFailures,
      refusal: null,
      explanation: MULTICLASS_PREREQUISITE_WAIVER_EXPLANATION,
    };
  }
  return {
    status: 'blocked',
    failures: nonEmptyFailures,
    refusal:
      `Cannot add ${candidate.class_name}. ` +
      nonEmptyFailures.map((failure) => failure.warning.detail).join(' '),
  };
}

export function multiclassEntryAssessments(
  db: DatabaseContext,
  characterId: number,
  candidateClassDefinitionIds: readonly number[],
): ReadonlyMap<number, MulticlassEntryAssessment> {
  const held = heldMulticlassPrerequisiteClasses(db, characterId);
  if (held.length === 0) {
    return new Map(candidateClassDefinitionIds.map((id) => [
      id,
      { status: 'not_applicable', failures: [], refusal: null } as const,
    ]));
  }
  const totals = characterTotals(db, characterId);
  const houseRule = readMulticlassPrerequisiteHouseRule(db, characterId);
  const assessments = new Map<number, MulticlassEntryAssessment>();
  const heldIds = new Set(held.map((entry) => entry.class_definition_id));
  for (const id of candidateClassDefinitionIds) {
    if (heldIds.has(id as ClassDefinitionId)) {
      assessments.set(id, {
        status: 'not_applicable',
        failures: [],
        refusal: null,
      });
      continue;
    }
    const candidate = classRow(db, id);
    if (candidate === null) {
      throw new TypeError('Unknown class.');
    }
    assessments.set(id, entryAssessment(candidate, held, totals, houseRule));
  }
  return assessments;
}

export function multiclassEntryAssessment(
  db: DatabaseContext,
  characterId: number,
  candidateClassDefinitionId: number,
): MulticlassEntryAssessment {
  const assessment = multiclassEntryAssessments(
    db,
    characterId,
    [candidateClassDefinitionId],
  ).get(candidateClassDefinitionId);
  if (assessment === undefined) {
    throw new TypeError('Unknown class.');
  }
  return assessment;
}

export class MulticlassPrerequisiteRefusal extends TypeError {
  constructor(readonly assessment: Extract<MulticlassEntryAssessment, { status: 'blocked' }>) {
    super(assessment.refusal);
    this.name = 'MulticlassPrerequisiteRefusal';
  }
}

export function assertMulticlassEntryEligible(
  db: DatabaseContext,
  characterId: number,
  candidateClassDefinitionId: number,
): void {
  const assessment = multiclassEntryAssessment(
    db,
    characterId,
    candidateClassDefinitionId,
  );
  if (assessment.status === 'blocked') {
    throw new MulticlassPrerequisiteRefusal(assessment);
  }
}
