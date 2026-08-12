import { describe, expect, it } from 'vitest';
import {
  decodeStoredSupersedesReference,
  decodeStoredValueExpression,
} from '../../../src/domain/contracts/row-rules';
import { rowContractError } from '../../../src/domain/contracts/rows';

const classLevelSource = {
  kind: 'class_level',
  class_content_key: '2024:class:rogue',
};

function encoded(value: unknown): string {
  return JSON.stringify(value);
}

function contributionRow(
  owner: 'class' | 'subclass',
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    id: 1,
    ...(owner === 'class'
      ? { class_definition_id: 2 }
      : { subclass_feature_id: 2 }),
    contribution_key: 'sneak-attack',
    label: 'Sneak Attack',
    target_kind: 'feature_dice_count',
    target_key: 'sneak_attack',
    resource_display_label: null,
    resource_marking_shape: null,
    op: 'add',
    active_from_level: 1,
    active_to_level: 20,
    value_json: encoded({
      kind: 'scale',
      source: classLevelSource,
      divide: 2,
      round: 'ceiling',
    }),
    supersedes_ref: null,
    created_at: '2026-08-11T12:00:00.000Z',
    updated_at: '2026-08-11T12:00:00.000Z',
    ...overrides,
  };
}

describe('migration-0042 storage-layer value expression decoder', () => {
  it('accepts every expression discriminator in the written E1 contract', () => {
    const expressions = [
      { kind: 'const', amount: 1 },
      { kind: 'ref', source: { kind: 'ability_modifier', ability: 'dexterity' } },
      {
        kind: 'scale',
        source: classLevelSource,
        multiply: 3,
        divide: 2,
        round: 'floor',
      },
      {
        kind: 'table',
        level_source: { kind: 'character_level' },
        rows: [
          { from: 1, to: 4, amount: 2 },
          { from: 5, to: 20, amount: 3 },
        ],
      },
      {
        kind: 'piecewise',
        level_source: classLevelSource,
        segments: [
          { from: 1, to: 10, value: { kind: 'const', amount: 1 } },
          {
            from: 11,
            to: 20,
            value: { kind: 'ref', source: { kind: 'proficiency_bonus' } },
          },
        ],
      },
      {
        kind: 'sum',
        terms: [
          { kind: 'const', amount: 1 },
          { kind: 'ref', source: { kind: 'character_level' } },
        ],
      },
      {
        kind: 'clamp',
        value: { kind: 'ref', source: { kind: 'proficiency_bonus' } },
        minimum: { kind: 'const', amount: 1 },
        maximum: { kind: 'const', amount: 6 },
      },
    ];

    for (const expression of expressions) {
      expect(
        decodeStoredValueExpression(encoded(expression), 'expression'),
        String(expression.kind),
      ).toEqual(expression);
    }
  });

  it.each([
    ['division by zero', { kind: 'scale', source: classLevelSource, divide: 0, round: 'ceiling' }],
    ['negative multiplication', { kind: 'scale', source: classLevelSource, multiply: -1, round: 'ceiling' }],
    ['an unsafe stored magnitude', { kind: 'const', amount: Number.MAX_SAFE_INTEGER }],
    ['an empty sum', { kind: 'sum', terms: [] }],
    ['an empty table', { kind: 'table', level_source: classLevelSource, rows: [] }],
    ['a table with a gap', { kind: 'table', level_source: classLevelSource, rows: [{ from: 1, to: 2, amount: 1 }, { from: 4, to: 5, amount: 2 }] }],
    ['a table with an overlap', { kind: 'table', level_source: classLevelSource, rows: [{ from: 1, to: 4, amount: 1 }, { from: 4, to: 5, amount: 2 }] }],
    ['a non-level table source', { kind: 'table', level_source: { kind: 'proficiency_bonus' }, rows: [{ from: 1, to: 20, amount: 1 }] }],
    ['an exact-key violation', { kind: 'const', amount: 1, fallback: 0 }],
    ['an inverted constant clamp', { kind: 'clamp', value: { kind: 'const', amount: 3 }, minimum: { kind: 'const', amount: 4 }, maximum: { kind: 'const', amount: 2 } }],
  ])('refuses %s', (_label, expression) => {
    expect(() =>
      decodeStoredValueExpression(encoded(expression), 'expression')
    ).toThrow();
  });

  it('accepts a bound-less clamp but still refuses malformed clamp keys', () => {
    const boundless = {
      kind: 'clamp',
      value: { kind: 'ref', source: { kind: 'proficiency_bonus' } },
    };
    expect(
      decodeStoredValueExpression(encoded(boundless), 'boundless clamp'),
    ).toEqual(boundless);
    expect(() =>
      decodeStoredValueExpression(
        encoded({ ...boundless, fallback: { kind: 'const', amount: 0 } }),
        'malformed clamp',
      )
    ).toThrow(/exactly/u);
  });

  it('refuses expression breadth and depth beyond the storage limits', () => {
    const broad = {
      kind: 'sum',
      terms: Array.from({ length: 100 }, () => ({ kind: 'const', amount: 1 })),
    };
    let deep: unknown = { kind: 'const', amount: 1 };
    for (let depth = 0; depth < 9; depth += 1) {
      deep = { kind: 'clamp', value: deep, minimum: { kind: 'const', amount: 0 } };
    }

    expect(() => decodeStoredValueExpression(encoded(broad), 'broad')).toThrow(
      /breadth/u,
    );
    expect(() => decodeStoredValueExpression(encoded(deep), 'deep')).toThrow(
      /depth/u,
    );
  });

  it('decodes only fully-qualified exact supersession references', () => {
    const reference = {
      content_key: '2024:class:rogue',
      contribution_key: 'sneak-attack',
    };
    expect(decodeStoredSupersedesReference(encoded(reference), 'ref')).toEqual(
      reference,
    );
    expect(() =>
      decodeStoredSupersedesReference(
        encoded({ ...reference, owner_id: 7 }),
        'ref',
      )
    ).toThrow(/exactly/u);
    expect(() =>
      decodeStoredSupersedesReference(
        encoded({ contribution_key: 'sneak-attack' }),
        'ref',
      )
    ).toThrow(/exactly/u);
  });
});

describe('migration-0042 kind-first row contracts', () => {
  it('accepts both owner-specific rows', () => {
    expect(
      rowContractError(
        'class_feature_value_contributions',
        contributionRow('class'),
        'class contribution',
      ),
    ).toBeNull();
    expect(
      rowContractError(
        'subclass_feature_value_contributions',
        contributionRow('subclass'),
        'subclass contribution',
      ),
    ).toBeNull();
  });

  it('matches SQLite by bounding authored text in Unicode code points', () => {
    const exactUnicodeBoundary = '🗝'.repeat(200);
    expect(
      rowContractError(
        'class_feature_value_contributions',
        contributionRow('class', {
          contribution_key: exactUnicodeBoundary,
          label: exactUnicodeBoundary,
          target_kind: 'resource_maximum',
          target_key: exactUnicodeBoundary,
          resource_display_label: exactUnicodeBoundary,
          resource_marking_shape: 'boxes',
          value_json: encoded({
            kind: 'ref',
            source: {
              kind: 'class_level',
              class_content_key: exactUnicodeBoundary,
            },
          }),
        }),
        'contribution',
      ),
    ).toBeNull();
  });

  it('refuses cross-kind targets before decoding the expression payload', () => {
    const error = rowContractError(
      'class_feature_value_contributions',
      contributionRow('class', {
        target_kind: 'feature_dice_count',
        target_key: 'focus_points',
        value_json: '{',
      }),
      'contribution',
    );
    expect(error).toContain('feature_dice_count requires target_key sneak_attack');
    expect(error).not.toContain('valid JSON');
  });

  it('refuses malformed expressions and malformed qualified references', () => {
    expect(
      rowContractError(
        'class_feature_value_contributions',
        contributionRow('class', { value_json: encoded({ kind: 'sum', terms: [] }) }),
        'contribution',
      ),
    ).toContain('bounded non-empty list');
    expect(
      rowContractError(
        'subclass_feature_value_contributions',
        contributionRow('subclass', {
          supersedes_ref: encoded({ contribution_key: 'sneak-attack' }),
        }),
        'contribution',
      ),
    ).toContain('contain exactly');
  });
});
