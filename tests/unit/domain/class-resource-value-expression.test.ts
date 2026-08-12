import { describe, expect, it } from 'vitest';
import type {
  ClassResourceFormula,
  PositiveInteger,
  PositiveResourceMaximum,
} from '../../../src/domain/class-resources';
import { classResourceFormulaExpression } from '../../../src/domain/class-resource-value-expression';
import type { ClassLevel, ContentKey } from '../../../src/domain/ids';
import { evaluateValue, type ValueEvaluationContext } from '../../../src/domain/value-expression';

const key = '2024:class:adapter-oracle' as ContentKey;

function context(
  level: number,
  charisma: number | null = 3,
): ValueEvaluationContext {
  return {
    character_level: level as import('../../../src/domain/enums').CharacterLevel,
    proficiency_bonus: 6 as PositiveInteger,
    class_levels: new Map([[key, level as ClassLevel]]),
    ability_modifiers:
      charisma === null ? new Map() : new Map([['charisma', charisma]]),
  };
}

function resolved(
  formula: ClassResourceFormula,
  level: number,
  charisma: number | null = 3,
): unknown {
  const adapted = classResourceFormulaExpression(
    formula,
    key,
    level as ClassLevel,
  );
  return adapted.kind === 'not_acquired'
    ? adapted
    : evaluateValue(adapted.value, context(level, charisma));
}

describe('ClassResourceFormula ValueExpression adapter', () => {
  it('preserves all four formula shapes at acquisition boundaries', () => {
    const fixed: ClassResourceFormula = {
      kind: 'fixed_count',
      minimum_class_level: 2 as ClassLevel,
      count: 2 as PositiveResourceMaximum,
    };
    const stepped: ClassResourceFormula = {
      kind: 'fixed_count_by_class_level',
      steps: [
        { minimum_class_level: 2 as ClassLevel, count: 1 as PositiveResourceMaximum },
        { minimum_class_level: 17 as ClassLevel, count: 2 as PositiveResourceMaximum },
      ],
    };
    const ability: ClassResourceFormula = {
      kind: 'ability_modifier_minimum_one',
      minimum_class_level: 1 as ClassLevel,
      ability: 'charisma',
    };
    const multiple: ClassResourceFormula = {
      kind: 'class_level_multiple',
      minimum_class_level: 1 as ClassLevel,
      multiplier: 5 as PositiveInteger,
    };

    expect(resolved(fixed, 1)).toEqual({ kind: 'not_acquired' });
    expect(resolved(fixed, 2)).toEqual({ kind: 'resolved', value: 2 });
    expect(resolved(stepped, 1)).toEqual({ kind: 'not_acquired' });
    expect(resolved(stepped, 2)).toEqual({ kind: 'resolved', value: 1 });
    expect(resolved(stepped, 16)).toEqual({ kind: 'resolved', value: 1 });
    expect(resolved(stepped, 17)).toEqual({ kind: 'resolved', value: 2 });
    expect(resolved(stepped, 20)).toEqual({ kind: 'resolved', value: 2 });
    expect(resolved(ability, 1, -2)).toEqual({ kind: 'resolved', value: 1 });
    expect(resolved(ability, 1, 4)).toEqual({ kind: 'resolved', value: 4 });
    expect(resolved(multiple, 1)).toEqual({ kind: 'resolved', value: 5 });
    expect(resolved(multiple, 20)).toEqual({ kind: 'resolved', value: 100 });
  });

  it('keeps an acquired formula with a missing ability as typed absence', () => {
    const formula: ClassResourceFormula = {
      kind: 'ability_modifier_minimum_one',
      minimum_class_level: 3 as ClassLevel,
      ability: 'charisma',
    };

    expect(resolved(formula, 2, null)).toEqual({ kind: 'not_acquired' });
    expect(resolved(formula, 3, null)).toEqual({
      kind: 'unavailable',
      reason: 'missing_ability',
    });
  });
});
