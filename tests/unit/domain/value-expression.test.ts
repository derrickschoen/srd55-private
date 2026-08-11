import { describe, expect, it } from 'vitest';
import type { PositiveInteger } from '../../../src/domain/class-resources';
import type { CharacterLevel } from '../../../src/domain/enums';
import type { ClassLevel, ContentKey } from '../../../src/domain/ids';
import {
  decodedValueExpression,
  evaluateValue,
  VALUE_EXPRESSION_LIMITS,
  type DecodedValueExpression,
  type LevelSource,
  type NonEmpty,
  type ValueEvaluationContext,
  type ValueExpression,
  type ValueResolution,
  type ValueSource,
} from '../../../src/domain/value-expression';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Assert<Condition extends true> = Condition;

type CharacterLevelIsRequired = Assert<
  Equal<
    Pick<ValueEvaluationContext, 'character_level'>,
    Required<Pick<ValueEvaluationContext, 'character_level'>>
  >
>;
type ProficiencyBonusIsRequired = Assert<
  Equal<
    Pick<ValueEvaluationContext, 'proficiency_bonus'>,
    Required<Pick<ValueEvaluationContext, 'proficiency_bonus'>>
  >
>;
type LevelSourcesExcludeNonLevels = Assert<
  Equal<
    Extract<
      ValueSource,
      { readonly kind: 'proficiency_bonus' | 'ability_modifier' }
    > & LevelSource,
    never
  >
>;
type EmptyArraysAreNotNonEmpty = Assert<
  Equal<readonly [] extends NonEmpty<number> ? true : false, false>
>;

const compileTimeContracts: readonly [
  CharacterLevelIsRequired,
  ProficiencyBonusIsRequired,
  LevelSourcesExcludeNonLevels,
  EmptyArraysAreNotNonEmpty,
] = [true, true, true, true];

const rogue = '2024:class:rogue' as ContentKey;

const context: ValueEvaluationContext = {
  character_level: 12,
  proficiency_bonus: 4 as PositiveInteger,
  class_levels: new Map([[rogue, 9 as ClassLevel]]),
  ability_modifiers: new Map([['dexterity', 3]]),
};

function encode(input: unknown): string {
  return JSON.stringify(input);
}

function decode(input: unknown): DecodedValueExpression {
  return decodedValueExpression(encode(input));
}

function decodedExpression(input: unknown): ValueExpression {
  const result = decode(input);
  expect(result.kind).toBe('decoded');
  if (result.kind === 'invalid_data') {
    throw new Error('Expected the fixture to decode.');
  }
  return result.value;
}

function expectResolution(
  input: unknown,
  expected: ValueResolution,
  evaluationContext: ValueEvaluationContext = context,
): void {
  expect(
    evaluateValue(decodedExpression(input), evaluationContext),
  ).toEqual(expected);
}

describe('ValueExpression type contract', () => {
  it('makes required inputs, level-only sources, and non-empty arrays compile-time facts', () => {
    expect(compileTimeContracts).toEqual([true, true, true, true]);
  });
});

describe('closed ValueExpression decoder and exhaustive evaluator', () => {
  it.each<readonly [string, unknown, ValueResolution]>([
    ['const', { kind: 'const', amount: -2 }, { kind: 'resolved', value: -2 }],
    [
      'class-level ref',
      { kind: 'ref', source: { kind: 'class_level', class_content_key: rogue } },
      { kind: 'resolved', value: 9 },
    ],
    [
      'character-level ref',
      { kind: 'ref', source: { kind: 'character_level' } },
      { kind: 'resolved', value: 12 },
    ],
    [
      'proficiency-bonus ref',
      { kind: 'ref', source: { kind: 'proficiency_bonus' } },
      { kind: 'resolved', value: 4 },
    ],
    [
      'ability-modifier ref',
      { kind: 'ref', source: { kind: 'ability_modifier', ability: 'dexterity' } },
      { kind: 'resolved', value: 3 },
    ],
    [
      'floor scale with both factors',
      {
        kind: 'scale',
        source: { kind: 'class_level', class_content_key: rogue },
        multiply: 3,
        divide: 2,
        round: 'floor',
      },
      { kind: 'resolved', value: 13 },
    ],
    [
      'scale with neither optional factor',
      {
        kind: 'scale',
        source: { kind: 'proficiency_bonus' },
        round: 'floor',
      },
      { kind: 'resolved', value: 4 },
    ],
    [
      'scale with a multiplier only',
      {
        kind: 'scale',
        source: { kind: 'proficiency_bonus' },
        multiply: 3,
        round: 'ceiling',
      },
      { kind: 'resolved', value: 12 },
    ],
    [
      'ceiling scale',
      {
        kind: 'scale',
        source: { kind: 'class_level', class_content_key: rogue },
        divide: 2,
        round: 'ceiling',
      },
      { kind: 'resolved', value: 5 },
    ],
    [
      'constant table',
      {
        kind: 'table',
        level_source: { kind: 'class_level', class_content_key: rogue },
        rows: [
          { from: 1, to: 8, amount: 1 },
          { from: 9, to: 20, amount: 5 },
        ],
      },
      { kind: 'resolved', value: 5 },
    ],
    [
      'piecewise expressions',
      {
        kind: 'piecewise',
        level_source: { kind: 'character_level' },
        segments: [
          { from: 1, to: 8, value: { kind: 'const', amount: 1 } },
          {
            from: 9,
            to: 20,
            value: { kind: 'ref', source: { kind: 'proficiency_bonus' } },
          },
        ],
      },
      { kind: 'resolved', value: 4 },
    ],
    [
      'sum',
      {
        kind: 'sum',
        terms: [
          { kind: 'const', amount: 2 },
          { kind: 'const', amount: 3 },
        ],
      },
      { kind: 'resolved', value: 5 },
    ],
    [
      'clamp without bounds',
      { kind: 'clamp', value: { kind: 'const', amount: 9 } },
      { kind: 'resolved', value: 9 },
    ],
    [
      'clamp with minimum',
      {
        kind: 'clamp',
        value: { kind: 'const', amount: 1 },
        minimum: { kind: 'const', amount: 2 },
      },
      { kind: 'resolved', value: 2 },
    ],
    [
      'clamp with maximum',
      {
        kind: 'clamp',
        value: { kind: 'const', amount: 9 },
        maximum: { kind: 'const', amount: 7 },
      },
      { kind: 'resolved', value: 7 },
    ],
    [
      'clamp with both bounds',
      {
        kind: 'clamp',
        value: { kind: 'const', amount: 5 },
        minimum: { kind: 'const', amount: 2 },
        maximum: { kind: 'const', amount: 7 },
      },
      { kind: 'resolved', value: 5 },
    ],
  ])('decodes and evaluates the %s constructor', (_label, input, expected) => {
    expectResolution(input, expected);
  });

  it.each<readonly [string, string]>([
    ['empty text', ''],
    ['invalid JSON', '{'],
    ['unknown expression kind', encode({ kind: 'unlimited' })],
    [
      'unknown source kind',
      encode({ kind: 'ref', source: { kind: 'effective_level' } }),
    ],
    ['missing required key', encode({ kind: 'const' })],
    ['non-integer constant', encode({ kind: 'const', amount: 1.5 })],
    [
      'unknown rounding mode',
      encode({
        kind: 'scale',
        source: { kind: 'character_level' },
        round: 'nearest',
      }),
    ],
    [
      'zero multiplier',
      encode({
        kind: 'scale',
        source: { kind: 'character_level' },
        multiply: 0,
        round: 'floor',
      }),
    ],
    [
      'invalid ability',
      encode({
        kind: 'ref',
        source: { kind: 'ability_modifier', ability: 'luck' },
      }),
    ],
    [
      'proficiency bonus as a level source',
      encode({
        kind: 'table',
        level_source: { kind: 'proficiency_bonus' },
        rows: [{ from: 1, to: 20, amount: 1 }],
      }),
    ],
    ['empty sum', encode({ kind: 'sum', terms: [] })],
    [
      'empty table',
      encode({
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [],
      }),
    ],
    [
      'empty piecewise',
      encode({
        kind: 'piecewise',
        level_source: { kind: 'character_level' },
        segments: [],
      }),
    ],
    [
      'non-constant table row',
      encode({
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [
          {
            from: 1,
            to: 20,
            amount: { kind: 'const', amount: 1 },
          },
        ],
      }),
    ],
    [
      'gap',
      encode({
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [
          { from: 1, to: 2, amount: 1 },
          { from: 4, to: 20, amount: 2 },
        ],
      }),
    ],
    [
      'overlap',
      encode({
        kind: 'piecewise',
        level_source: { kind: 'character_level' },
        segments: [
          { from: 1, to: 3, value: { kind: 'const', amount: 1 } },
          { from: 3, to: 20, value: { kind: 'const', amount: 2 } },
        ],
      }),
    ],
    [
      'from above to',
      encode({
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [{ from: 8, to: 3, amount: 1 }],
      }),
    ],
    [
      'level outside 1..20',
      encode({
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [{ from: 0, to: 20, amount: 1 }],
      }),
    ],
    [
      'minimum above maximum',
      encode({
        kind: 'clamp',
        value: { kind: 'const', amount: 1 },
        minimum: { kind: 'const', amount: 3 },
        maximum: { kind: 'const', amount: 2 },
      }),
    ],
  ])('refuses %s with the exact invalid-data variant', (_label, json) => {
    expect(decodedValueExpression(json)).toEqual({ kind: 'invalid_data' });
  });

  it.each<readonly [string, unknown]>([
    ['const', { kind: 'const', amount: 1, extra: true }],
    [
      'ref',
      { kind: 'ref', source: { kind: 'character_level' }, extra: true },
    ],
    [
      'scale',
      {
        kind: 'scale',
        source: { kind: 'character_level' },
        round: 'floor',
        extra: true,
      },
    ],
    [
      'table',
      {
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [{ from: 1, to: 20, amount: 1 }],
        extra: true,
      },
    ],
    [
      'piecewise',
      {
        kind: 'piecewise',
        level_source: { kind: 'character_level' },
        segments: [
          { from: 1, to: 20, value: { kind: 'const', amount: 1 } },
        ],
        extra: true,
      },
    ],
    [
      'sum',
      { kind: 'sum', terms: [{ kind: 'const', amount: 1 }], extra: true },
    ],
    [
      'clamp',
      { kind: 'clamp', value: { kind: 'const', amount: 1 }, extra: true },
    ],
    [
      'nested source',
      {
        kind: 'ref',
        source: { kind: 'character_level', extra: true },
      },
    ],
    [
      'nested table row',
      {
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [{ from: 1, to: 20, amount: 1, extra: true }],
      },
    ],
    [
      'nested piecewise segment',
      {
        kind: 'piecewise',
        level_source: { kind: 'character_level' },
        segments: [
          {
            from: 1,
            to: 20,
            value: { kind: 'const', amount: 1 },
            extra: true,
          },
        ],
      },
    ],
  ])('rejects the non-exact key set for %s', (_label, input) => {
    expect(decode(input)).toEqual({ kind: 'invalid_data' });
  });
});

describe('ValueExpression decoder properties', () => {
  it('rejects zero divisors and every sampled negative factor', () => {
    expect(
      decode({
        kind: 'scale',
        source: { kind: 'character_level' },
        divide: 0,
        round: 'floor',
      }),
    ).toEqual({ kind: 'invalid_data' });

    for (let magnitude = 1; magnitude <= 256; magnitude += 1) {
      for (const field of ['multiply', 'divide'] as const) {
        expect(
          decode({
            kind: 'scale',
            source: { kind: 'character_level' },
            [field]: -magnitude,
            round: 'floor',
          }),
        ).toEqual({ kind: 'invalid_data' });
      }
    }
  });

  it('rejects sampled unsafe integers in every numeric payload family', () => {
    const unsafeValues = [
      Number.MAX_SAFE_INTEGER + 1,
      Number.MIN_SAFE_INTEGER - 1,
      Number.MAX_VALUE,
      1.5,
      -1.5,
    ];
    for (const value of unsafeValues) {
      expect(decode({ kind: 'const', amount: value })).toEqual({
        kind: 'invalid_data',
      });
      expect(
        decode({
          kind: 'scale',
          source: { kind: 'character_level' },
          multiply: value,
          round: 'floor',
        }),
      ).toEqual({ kind: 'invalid_data' });
      expect(
        decode({
          kind: 'scale',
          source: { kind: 'character_level' },
          divide: value,
          round: 'floor',
        }),
      ).toEqual({ kind: 'invalid_data' });
      expect(
        decode({
          kind: 'table',
          level_source: { kind: 'character_level' },
          rows: [{ from: 1, to: 20, amount: value }],
        }),
      ).toEqual({ kind: 'invalid_data' });
    }
  });

  it('accepts every depth through the limit and rejects deeper nesting', () => {
    for (let depth = 0; depth <= VALUE_EXPRESSION_LIMITS.depth; depth += 1) {
      let expression: unknown = { kind: 'const', amount: 1 };
      for (let index = 0; index < depth; index += 1) {
        expression = { kind: 'clamp', value: expression };
      }
      expect(decode(expression).kind).toBe('decoded');
    }

    for (
      let depth = VALUE_EXPRESSION_LIMITS.depth + 1;
      depth <= VALUE_EXPRESSION_LIMITS.depth + 8;
      depth += 1
    ) {
      let expression: unknown = { kind: 'const', amount: 1 };
      for (let index = 0; index < depth; index += 1) {
        expression = { kind: 'clamp', value: expression };
      }
      expect(decode(expression)).toEqual({ kind: 'invalid_data' });
    }
  });

  it('accepts wide sums through the bound and rejects every sampled excess', () => {
    for (let width = 1; width <= VALUE_EXPRESSION_LIMITS.breadth; width += 1) {
      const expression = {
        kind: 'sum',
        terms: Array.from({ length: width }, () => ({ kind: 'const', amount: 1 })),
      };
      const decoded = decode(expression);
      expect(decoded.kind).toBe('decoded');
      if (decoded.kind === 'decoded') {
        expect(evaluateValue(decoded.value, context)).toEqual({
          kind: 'resolved',
          value: width,
        });
      }
    }

    for (
      let width = VALUE_EXPRESSION_LIMITS.breadth + 1;
      width <= VALUE_EXPRESSION_LIMITS.breadth + 8;
      width += 1
    ) {
      expect(
        decode({
          kind: 'sum',
          terms: Array.from({ length: width }, () => ({ kind: 'const', amount: 1 })),
        }),
      ).toEqual({ kind: 'invalid_data' });
    }
  });

  it('measures the byte bound in UTF-8 rather than string code units', () => {
    const json = encode({
      kind: 'ref',
      source: {
        kind: 'class_level',
        class_content_key: '😀'.repeat(
          Math.floor(VALUE_EXPRESSION_LIMITS.encodedBytes / 3),
        ),
      },
    });
    expect(json.length).toBeLessThan(VALUE_EXPRESSION_LIMITS.encodedBytes);
    expect(new TextEncoder().encode(json).byteLength).toBeGreaterThan(
      VALUE_EXPRESSION_LIMITS.encodedBytes,
    );
    expect(decodedValueExpression(json)).toEqual({ kind: 'invalid_data' });
  });
});

describe('pure ValueExpression evaluation', () => {
  it('returns exact missing-class and missing-ability variants', () => {
    expect(
      evaluateValue(
        {
          kind: 'ref',
          source: {
            kind: 'class_level',
            class_content_key: '2024:class:missing' as ContentKey,
          },
        },
        context,
      ),
    ).toEqual({ kind: 'unavailable', reason: 'missing_class' });
    expect(
      evaluateValue(
        {
          kind: 'ref',
          source: { kind: 'ability_modifier', ability: 'wisdom' },
        },
        context,
      ),
    ).toEqual({ kind: 'unavailable', reason: 'missing_ability' });
  });

  it('returns invalid-data for malformed schedules, bounds, values, and context', () => {
    const uncovered: ValueExpression = {
      kind: 'table',
      level_source: { kind: 'character_level' },
      rows: [{ from: 1 as ClassLevel, to: 2 as ClassLevel, amount: 1 }],
    };
    const gapped: ValueExpression = {
      kind: 'table',
      level_source: { kind: 'character_level' },
      rows: [
        { from: 1 as ClassLevel, to: 2 as ClassLevel, amount: 1 },
        { from: 4 as ClassLevel, to: 20 as ClassLevel, amount: 2 },
      ],
    };
    const dynamicBadClamp: ValueExpression = {
      kind: 'clamp',
      value: { kind: 'const', amount: 2 },
      minimum: {
        kind: 'sum',
        terms: [
          { kind: 'const', amount: 2 },
          { kind: 'const', amount: 2 },
        ],
      },
      maximum: { kind: 'const', amount: 3 },
    };

    expect(evaluateValue(uncovered, context)).toEqual({
      kind: 'unavailable',
      reason: 'invalid_data',
    });
    expect(evaluateValue(gapped, context)).toEqual({
      kind: 'unavailable',
      reason: 'invalid_data',
    });
    expect(evaluateValue(dynamicBadClamp, context)).toEqual({
      kind: 'unavailable',
      reason: 'invalid_data',
    });
    expect(
      evaluateValue({ kind: 'const', amount: Number.MAX_VALUE }, context),
    ).toEqual({ kind: 'unavailable', reason: 'invalid_data' });
    expect(
      evaluateValue(
        {
          kind: 'ref',
          source: { kind: 'ability_modifier', ability: 'dexterity' },
        },
        {
          ...context,
          ability_modifiers: new Map([['dexterity', Number.MAX_VALUE]]),
        },
      ),
    ).toEqual({ kind: 'unavailable', reason: 'invalid_data' });
    expect(
      evaluateValue(
        { kind: 'ref', source: { kind: 'character_level' } },
        { ...context, character_level: 21 as CharacterLevel },
      ),
    ).toEqual({ kind: 'unavailable', reason: 'invalid_data' });
  });

  it('returns overflow for safe operands whose product becomes unsafe', () => {
    const firstUnsafeFactor =
      Math.floor(Number.MAX_SAFE_INTEGER / context.character_level) + 1;
    const sampledFactors = [
      firstUnsafeFactor,
      firstUnsafeFactor + 1,
      Math.floor(Number.MAX_SAFE_INTEGER / 2),
      Number.MAX_SAFE_INTEGER,
    ];
    for (const factor of sampledFactors) {
      expect(Number.isSafeInteger(factor)).toBe(true);
      expect(Number.isSafeInteger(context.character_level)).toBe(true);
      expect(
        evaluateValue(
          {
            kind: 'scale',
            source: { kind: 'character_level' },
            multiply: factor as PositiveInteger,
            round: 'floor',
          },
          context,
        ),
      ).toEqual({ kind: 'unavailable', reason: 'overflow' });
    }
  });

  it('returns overflow for sampled safe terms whose running sum becomes unsafe', () => {
    const sums: NonEmpty<ValueExpression>[] = [
      [
        { kind: 'const', amount: Number.MAX_SAFE_INTEGER },
        { kind: 'const', amount: 1 },
      ],
      [
        { kind: 'const', amount: Number.MIN_SAFE_INTEGER },
        { kind: 'const', amount: -1 },
      ],
      [
        { kind: 'const', amount: Math.floor(Number.MAX_SAFE_INTEGER / 2) },
        { kind: 'const', amount: Math.floor(Number.MAX_SAFE_INTEGER / 2) },
        { kind: 'const', amount: 2 },
      ],
    ];
    for (const terms of sums) {
      expect(evaluateValue({ kind: 'sum', terms }, context)).toEqual({
        kind: 'unavailable',
        reason: 'overflow',
      });
    }
  });

  it('uses the class level rather than total level across the full ladder', () => {
    const expression: ValueExpression = {
      kind: 'scale',
      source: { kind: 'class_level', class_content_key: rogue },
      divide: 2 as PositiveInteger,
      round: 'ceiling',
    };
    for (let level = 1; level <= 20; level += 1) {
      const levelContext: ValueEvaluationContext = {
        ...context,
        character_level: 20,
        class_levels: new Map([[rogue, level as ClassLevel]]),
      };
      expect(evaluateValue(expression, levelContext)).toEqual({
        kind: 'resolved',
        value: Math.ceil(level / 2),
      });
    }
  });
});
