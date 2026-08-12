import type { DatabaseContext } from '../db/database';
import {
  classDefinesMulticlassPrerequisite,
  evaluateMulticlassPrerequisiteClasses,
  heldMulticlassPrerequisiteClasses,
  type EvaluatedMulticlassPrerequisite,
  type MulticlassPrerequisiteClass,
} from '../rules/multiclass-prerequisite-gate';
import { CharacterNotFoundError } from './character-crud';

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
        throw new Error(
          `Held class ${String(row.class_definition_id)} declared a multiclass prerequisite but was not evaluated.`,
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
    throw new Error(
      `Held class ${String(classDefinitionId)} has no multiclass prerequisite assessment.`,
    );
  }
  return assessment;
}
