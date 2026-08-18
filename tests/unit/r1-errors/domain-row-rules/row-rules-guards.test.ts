import { describe, expect, it } from 'vitest';
import {
  decodeStoredSupersedesReference,
  decodeStoredValueExpression,
} from '../../../../src/domain/contracts/row-rules';
import {
  RowRulesBoundedJsonTextError,
  RowRulesBoundedNonEmptyListError,
  RowRulesBoundedNonEmptyTextError,
  RowRulesClassLevelError,
  RowRulesExpressionRoundError,
  RowRulesJsonParseError,
  RowRulesKnownAbilityError,
  RowRulesLevelBandOrderError,
  RowRulesNullableBoundedJsonTextError,
  RowRulesStorageObjectError,
  RowRulesValueExpressionKindError,
  RowRulesValueSourceKindError,
} from '../../../../src/domain/contracts/row-rules-errors';

function encoded(value: unknown): string {
  return JSON.stringify(value);
}

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a row-rules defect, but the call returned.');
}

describe('row rules tagged guards', () => {
  it('tags non-object expression storage', () => {
    const error = defect(() =>
      decodeStoredValueExpression('null', 'expression'),
    );
    expect(error).toBeInstanceOf(RowRulesStorageObjectError);
    expect(error).toMatchObject({ label: 'expression' });
  });

  it('tags non-class-level table bounds', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({
          kind: 'table',
          level_source: { kind: 'class_level', class_content_key: 'rogue' },
          rows: [{ from: 0, to: 20, amount: 1 }],
        }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesClassLevelError);
    expect(error).toMatchObject({
      label: 'expression.rows[0].from',
      minimum: 1,
      maximum: 20,
    });
  });

  it('tags class sources with malformed content keys', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({
          kind: 'ref',
          source: { kind: 'class_level', class_content_key: '' },
        }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesBoundedNonEmptyTextError);
    expect(error).toMatchObject({
      label: 'expression.source.class_content_key',
      maximum_code_points: 200,
    });
  });

  it('tags supersession members with malformed text', () => {
    const error = defect(() =>
      decodeStoredSupersedesReference(
        encoded({ content_key: '', contribution_key: 'prior' }),
        'supersedes_ref',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesBoundedNonEmptyTextError);
    expect(error).toMatchObject({
      label: 'supersedes_ref.content_key',
      maximum_code_points: 200,
    });
  });

  it('tags unknown ability sources', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({
          kind: 'ref',
          source: { kind: 'ability_modifier', ability: 'luck' },
        }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesKnownAbilityError);
    expect(error).toMatchObject({ label: 'expression.source.ability' });
  });

  it('tags unknown general value sources', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({ kind: 'ref', source: { kind: 'hit_points' } }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesValueSourceKindError);
    expect(error).toMatchObject({
      label: 'expression.source',
      source_kind: 'value',
    });
  });

  it('tags oversized expression band lists', () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      from: index + 1,
      to: index + 1,
      amount: 1,
    }));
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({
          kind: 'table',
          level_source: { kind: 'character_level' },
          rows,
        }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesBoundedNonEmptyListError);
    expect(error).toMatchObject({
      label: 'expression.rows',
      maximum_entries: 100,
    });
  });

  it('tags inverted expression bands', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({
          kind: 'table',
          level_source: { kind: 'character_level' },
          rows: [{ from: 4, to: 2, amount: 1 }],
        }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesLevelBandOrderError);
    expect(error).toMatchObject({ label: 'expression.rows[0]' });
  });

  it('tags unsupported scale rounding', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({
          kind: 'scale',
          source: { kind: 'character_level' },
          round: 'nearest',
        }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesExpressionRoundError);
    expect(error).toMatchObject({ label: 'expression' });
  });

  it('tags unsupported expression discriminators and carries the value', () => {
    const error = defect(() =>
      decodeStoredValueExpression(
        encoded({ kind: 'product', factors: [] }),
        'expression',
      ),
    );
    expect(error).toBeInstanceOf(RowRulesValueExpressionKindError);
    expect(error).toMatchObject({
      label: 'expression',
      expression_kind: 'product',
    });
  });

  it('tags unbounded expression JSON storage', () => {
    const error = defect(() =>
      decodeStoredValueExpression('x'.repeat(4097), 'expression'),
    );
    expect(error).toBeInstanceOf(RowRulesBoundedJsonTextError);
    expect(error).toMatchObject({
      label: 'expression',
      maximum_bytes: 4096,
    });
  });

  it('tags unbounded nullable supersession JSON storage', () => {
    const error = defect(() =>
      decodeStoredSupersedesReference('x'.repeat(513), 'supersedes_ref'),
    );
    expect(error).toBeInstanceOf(RowRulesNullableBoundedJsonTextError);
    expect(error).toMatchObject({
      label: 'supersedes_ref',
      maximum_bytes: 512,
    });
  });

  it.each([
    ['expression', () => decodeStoredValueExpression('{', 'expression')],
    [
      'supersedes_ref',
      () => decodeStoredSupersedesReference('{', 'supersedes_ref'),
    ],
  ] as const)('tags invalid JSON for %s and preserves the cause', (label, run) => {
    const error = defect(run);
    expect(error).toBeInstanceOf(RowRulesJsonParseError);
    expect(error).toMatchObject({ label });
    if (!(error instanceof RowRulesJsonParseError)) {
      return expect.fail('Expected RowRulesJsonParseError.');
    }
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });
});
