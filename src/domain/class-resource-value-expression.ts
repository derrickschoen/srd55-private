import type {
  ClassResourceFormula,
  PositiveInteger,
} from './class-resources';
import type { ClassLevel, ContentKey } from './ids';
import type {
  NonEmpty,
  ValueTableRow,
} from './value-expression';

type ClassLevelSource = {
  readonly kind: 'class_level';
  readonly class_content_key: ContentKey;
};

export type ClassResourceValueExpression =
  | { readonly kind: 'const'; readonly amount: number }
  | {
      readonly kind: 'table';
      readonly level_source: ClassLevelSource;
      readonly rows: NonEmpty<ValueTableRow>;
    }
  | {
      readonly kind: 'clamp';
      readonly value: {
        readonly kind: 'ref';
        readonly source: {
          readonly kind: 'ability_modifier';
          readonly ability: 'charisma' | 'wisdom';
        };
      };
      readonly minimum: { readonly kind: 'const'; readonly amount: 1 };
    }
  | {
      readonly kind: 'scale';
      readonly source: ClassLevelSource;
      readonly multiply: PositiveInteger;
      readonly round: 'floor';
    };

export type ClassResourceFormulaExpression =
  | { readonly kind: 'not_acquired' }
  | {
      readonly kind: 'expression';
      readonly value: ClassResourceValueExpression;
    };

function minimumLevel(formula: ClassResourceFormula): ClassLevel {
  switch (formula.kind) {
    case 'fixed_count':
    case 'ability_modifier_minimum_one':
    case 'class_level_multiple':
      return formula.minimum_class_level;
    case 'fixed_count_by_class_level':
      return formula.steps[0].minimum_class_level;
  }
}

/**
 * Adapts the four legacy class-resource formula shapes into ValueExpression.
 * Acquisition remains provider-owned: below the first acquisition level this
 * emits no expression, while an acquired ability formula retains a live
 * ability reference whose missing input is reported by evaluateValue.
 */
export function classResourceFormulaExpression(
  formula: ClassResourceFormula,
  classContentKey: ContentKey,
  classLevel: ClassLevel,
): ClassResourceFormulaExpression {
  if (classLevel < minimumLevel(formula)) {
    return { kind: 'not_acquired' };
  }

  switch (formula.kind) {
    case 'fixed_count':
      return {
        kind: 'expression',
        value: { kind: 'const', amount: formula.count },
      };
    case 'fixed_count_by_class_level': {
      const [first, ...later] = formula.steps;
      const rowFor = (
        step: (typeof formula.steps)[number],
        next: (typeof formula.steps)[number] | undefined,
      ): ValueTableRow => ({
        from: step.minimum_class_level,
        to: ((next?.minimum_class_level ?? 21) - 1) as ClassLevel,
        amount: step.count,
      });
      const rows: NonEmpty<ValueTableRow> = [
        rowFor(first, later[0]),
        ...later.map((step, index) => rowFor(step, later[index + 1])),
      ];
      return {
        kind: 'expression',
        value: {
          kind: 'table',
          level_source: {
            kind: 'class_level',
            class_content_key: classContentKey,
          },
          rows,
        },
      };
    }
    case 'ability_modifier_minimum_one':
      return {
        kind: 'expression',
        value: {
          kind: 'clamp',
          value: {
            kind: 'ref',
            source: { kind: 'ability_modifier', ability: formula.ability },
          },
          minimum: { kind: 'const', amount: 1 },
        },
      };
    case 'class_level_multiple':
      return {
        kind: 'expression',
        value: {
          kind: 'scale',
          source: {
            kind: 'class_level',
            class_content_key: classContentKey,
          },
          multiply: formula.multiplier,
          round: 'floor',
        },
      };
  }
}
