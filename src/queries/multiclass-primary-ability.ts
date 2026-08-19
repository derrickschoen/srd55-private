import type { DatabaseContext } from '../db/database';
import {
  classDefinesMulticlassPrerequisite,
  evaluateMulticlassPrerequisiteClasses,
  heldMulticlassPrerequisiteClasses,
  type EvaluatedMulticlassPrerequisite,
  type MulticlassPrerequisiteClass,
} from '../rules/multiclass-prerequisite-gate';
import { CharacterNotFoundError } from './character-crud';

export type MulticlassPrimaryAbilityMissingAssessmentContext =
  | 'declared_prerequisite'
  | 'held_class';

const MISSING_ASSESSMENT_MESSAGES: Readonly<
  Record<MulticlassPrimaryAbilityMissingAssessmentContext, string>
> = {
  declared_prerequisite:
    'declared a multiclass prerequisite but was not evaluated',
  held_class: 'has no multiclass prerequisite assessment',
};

/** A held class is absent from the assessment set that was meant to cover it. */
export class MulticlassPrimaryAbilityAssessmentMissingError extends Error {
  override readonly name =
    'MulticlassPrimaryAbilityAssessmentMissingError' as const;
  constructor(
    readonly class_definition_id: number,
    readonly context: MulticlassPrimaryAbilityMissingAssessmentContext,
  ) {
    super(
      `Held class ${String(class_definition_id)} ${MISSING_ASSESSMENT_MESSAGES[context]}.`,
    );
  }
}

export type MulticlassPrimaryAbilityAssessment =
  | (MulticlassPrerequisiteClass & {
      readonly status: 'not_applicable';
      readonly evaluation: null;
      readonly warning: null;
    })
  | EvaluatedMulticlassPrerequisite;

/**
 * The one D96 query seam for planner, level-up, and sheet projections.
 *
 * Every held class that declares a primary-ability prerequisite is evaluated
 * once a character is multiclassed: this checks both the class entered and
 * every class already held. A class with no stored expression declares no
 * requirement; malformed non-empty content remains unprovable. A single-class
 * character is explicitly not-applicable rather than silently treated as met.
 */
export class MulticlassPrimaryAbilityQueries {
  constructor(private readonly db: DatabaseContext) {}

  build(characterId: number): readonly MulticlassPrimaryAbilityAssessment[] {
    if (this.db.scalar('SELECT id FROM characters WHERE id = ?', [characterId]) === null) {
      throw new CharacterNotFoundError(characterId);
    }
    const held = heldMulticlassPrerequisiteClasses(this.db, characterId);
    if (held.length < 2) {
      return held.map((row) => ({
        ...row,
        status: 'not_applicable',
        evaluation: null,
        warning: null,
      }));
    }

    const evaluated = new Map(
      evaluateMulticlassPrerequisiteClasses(
        this.db,
        characterId,
        held.filter(classDefinesMulticlassPrerequisite),
      ).map((assessment) => [assessment.class_definition_id, assessment]),
    );
    return held.map((row) => {
      if (!classDefinesMulticlassPrerequisite(row)) {
        return {
          ...row,
          status: 'not_applicable',
          evaluation: null,
          warning: null,
        };
      }
      const assessment = evaluated.get(row.class_definition_id);
      if (assessment === undefined) {
        throw new MulticlassPrimaryAbilityAssessmentMissingError(
          row.class_definition_id,
          'declared_prerequisite',
        );
      }
      return assessment;
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
    throw new MulticlassPrimaryAbilityAssessmentMissingError(
      classDefinitionId,
      'held_class',
    );
  }
  return assessment;
}
