import {
  abilities,
  isEnumValue,
  type Ability,
} from './enums';

/**
 * A class's sourced Primary Ability row.
 *
 * `one_of` means any listed ability can satisfy the multiclass minimum
 * (Fighter: Strength OR Dexterity). `all_of` means every listed ability must
 * satisfy it (Monk and Ranger: Dexterity AND Wisdom). A one-ability row is an
 * `all_of` expression so consumers never need a third scalar shape.
 */
export type PrimaryAbilityExpression =
  | {
      readonly kind: 'one_of';
      readonly abilities: readonly [Ability, Ability, ...Ability[]];
    }
  | {
      readonly kind: 'all_of';
      readonly abilities: readonly [Ability, ...Ability[]];
    };

export type PrimaryAbilityExpressionDecodeResult =
  | {
      readonly kind: 'decoded';
      readonly expression: PrimaryAbilityExpression;
    }
  | {
      readonly kind: 'unprovable';
      readonly reason: 'missing_expression' | 'invalid_expression';
    };

export const MULTICLASS_PRIMARY_ABILITY_MINIMUM = 13;

export type AbilityScoreEvidence = Readonly<
  Partial<Record<Ability, number | null>>
>;

export interface PrimaryAbilityScore {
  readonly ability: Ability;
  readonly score: number | null;
}

export type MulticlassPrimaryAbilityResult =
  | {
      readonly status: 'met';
      readonly expression: PrimaryAbilityExpression;
      readonly minimum: typeof MULTICLASS_PRIMARY_ABILITY_MINIMUM;
      readonly scores: readonly PrimaryAbilityScore[];
    }
  | {
      readonly status: 'unmet';
      readonly expression: PrimaryAbilityExpression;
      readonly minimum: typeof MULTICLASS_PRIMARY_ABILITY_MINIMUM;
      readonly scores: readonly PrimaryAbilityScore[];
      /**
       * The alternatives or requirements that failed. For `one_of`, every
       * listed ability is here because all alternatives are below 13.
       */
      readonly unmet_abilities: readonly Ability[];
    }
  | {
      readonly status: 'unprovable';
      readonly expression: PrimaryAbilityExpression | null;
      readonly minimum: typeof MULTICLASS_PRIMARY_ABILITY_MINIMUM;
      readonly scores: readonly PrimaryAbilityScore[];
      readonly reason:
        | 'missing_expression'
        | 'invalid_expression'
        | 'missing_score';
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUniqueAbilityList(value: unknown): value is Ability[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => isEnumValue(abilities, entry)) &&
    new Set(value).size === value.length
  );
}

/** The canonical JSON stored in `class_definitions.primary_ability_expression`. */
export function encodePrimaryAbilityExpression(
  expression: PrimaryAbilityExpression,
): string {
  return JSON.stringify(expression);
}

/**
 * Decodes catalog text without throwing on imported/homebrew content.
 *
 * A malformed or absent expression is evidence that the minimum cannot be
 * proved, not permission to invent a primary ability.
 */
export function decodePrimaryAbilityExpression(
  stored: string | null,
): PrimaryAbilityExpressionDecodeResult {
  if (stored === null || stored.trim() === '') {
    return { kind: 'unprovable', reason: 'missing_expression' };
  }

  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return { kind: 'unprovable', reason: 'invalid_expression' };
  }

  if (
    !isRecord(value) ||
    (value['kind'] !== 'one_of' && value['kind'] !== 'all_of') ||
    !isUniqueAbilityList(value['abilities']) ||
    (value['kind'] === 'one_of' && value['abilities'].length < 2)
  ) {
    return { kind: 'unprovable', reason: 'invalid_expression' };
  }

  if (value['kind'] === 'one_of') {
    return {
      kind: 'decoded',
      expression: {
        kind: 'one_of',
        abilities: value['abilities'] as [
          Ability,
          Ability,
          ...Ability[],
        ],
      },
    };
  }

  return {
    kind: 'decoded',
    expression: {
      kind: 'all_of',
      abilities: value['abilities'] as [Ability, ...Ability[]],
    },
  };
}

/**
 * D96: evaluate and report; never block.
 *
 * For `one_of`, one known passing alternative proves the requirement even if
 * another score is unavailable. For `all_of`, one known failing requirement
 * proves it unmet even if another score is unavailable. Every other partial
 * case is honestly `unprovable`.
 */
export function evaluateMulticlassPrimaryAbilityMinimum(
  decoded: PrimaryAbilityExpressionDecodeResult,
  evidence: AbilityScoreEvidence,
): MulticlassPrimaryAbilityResult {
  if (decoded.kind === 'unprovable') {
    return {
      status: 'unprovable',
      expression: null,
      minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
      scores: [],
      reason: decoded.reason,
    };
  }

  const expression = decoded.expression;
  const scores = expression.abilities.map((ability) => {
    const value = evidence[ability];
    return {
      ability,
      score:
        typeof value === 'number' && Number.isFinite(value) ? value : null,
    };
  });
  const known = scores.filter(
    (entry): entry is { readonly ability: Ability; readonly score: number } =>
      entry.score !== null,
  );
  const passing = known.filter(
    (entry) => entry.score >= MULTICLASS_PRIMARY_ABILITY_MINIMUM,
  );
  const failing = known.filter(
    (entry) => entry.score < MULTICLASS_PRIMARY_ABILITY_MINIMUM,
  );

  if (expression.kind === 'one_of') {
    if (passing.length > 0) {
      return {
        status: 'met',
        expression,
        minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
        scores,
      };
    }
    if (known.length === scores.length) {
      return {
        status: 'unmet',
        expression,
        minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
        scores,
        unmet_abilities: failing.map((entry) => entry.ability),
      };
    }
    return {
      status: 'unprovable',
      expression,
      minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
      scores,
      reason: 'missing_score',
    };
  }

  if (failing.length > 0) {
    return {
      status: 'unmet',
      expression,
      minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
      scores,
      unmet_abilities: failing.map((entry) => entry.ability),
    };
  }
  if (known.length !== scores.length) {
    return {
      status: 'unprovable',
      expression,
      minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
      scores,
      reason: 'missing_score',
    };
  }
  return {
    status: 'met',
    expression,
    minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
    scores,
  };
}
