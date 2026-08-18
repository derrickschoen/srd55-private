import { describe, expect, it } from 'vitest';
import {
  RowRulesActiveLevelBandError,
  RowRulesBoundedJsonTextError,
  RowRulesBoundedNonEmptyListError,
  RowRulesBoundedNonEmptyTextError,
  RowRulesClampOrderError,
  RowRulesClassLevelError,
  RowRulesContributionTargetConfigurationError,
  RowRulesExactStorageKeysError,
  RowRulesExpressionBandSequenceError,
  RowRulesExpressionLimitError,
  RowRulesExpressionRoundError,
  RowRulesJsonParseError,
  RowRulesKnownAbilityError,
  RowRulesLevelBandOrderError,
  RowRulesNullableBoundedJsonTextError,
  RowRulesPositiveIntegerError,
  RowRulesSafeIntegerRangeError,
  RowRulesStorageObjectError,
  RowRulesUnsupportedContributionTargetKindError,
  RowRulesValueExpressionKindError,
  RowRulesValueSourceKindError,
} from '../../../../src/domain/contracts/row-rules-errors';

describe('row rules error formatters', () => {
  it('RowRulesStorageObjectError formats its label', () => {
    const error = new RowRulesStorageObjectError('expression');
    expect(error.message).toBe('expression must be an object.');
    expect(error.name).toBe('RowRulesStorageObjectError');
    expect(error).toMatchObject({ label: 'expression' });
    expect(error).toBeInstanceOf(TypeError);
  });

  it('RowRulesExactStorageKeysError formats required and optional keys', () => {
    const requiredOnly = new RowRulesExactStorageKeysError(
      'expression',
      ['kind', 'amount'],
      [],
    );
    expect(requiredOnly.message).toBe(
      'expression must contain exactly kind, amount.',
    );
    expect(requiredOnly.name).toBe('RowRulesExactStorageKeysError');
    expect(requiredOnly).toMatchObject({
      label: 'expression',
      required_keys: ['kind', 'amount'],
      optional_keys: [],
    });

    const withOptional = new RowRulesExactStorageKeysError(
      'scale',
      ['kind', 'source', 'round'],
      ['multiply', 'divide'],
    );
    expect(withOptional.message).toBe(
      'scale must contain exactly kind, source, round with optional multiply, divide.',
    );
  });

  it('RowRulesSafeIntegerRangeError formats its bounds', () => {
    const error = new RowRulesSafeIntegerRangeError(
      'expression.amount',
      -1000,
      1000,
    );
    expect(error.message).toBe(
      'expression.amount must be a safe integer from -1000 to 1000.',
    );
    expect(error.name).toBe('RowRulesSafeIntegerRangeError');
    expect(error).toMatchObject({
      label: 'expression.amount',
      minimum: -1000,
      maximum: 1000,
    });
  });

  it('RowRulesPositiveIntegerError formats its label', () => {
    const error = new RowRulesPositiveIntegerError('expression.divide');
    expect(error.message).toBe('expression.divide must be a positive integer.');
    expect(error.name).toBe('RowRulesPositiveIntegerError');
    expect(error).toMatchObject({ label: 'expression.divide' });
  });

  it('RowRulesClassLevelError formats its bounds', () => {
    const error = new RowRulesClassLevelError('rows[0].from', 1, 20);
    expect(error.message).toBe(
      'rows[0].from must be a class level from 1 to 20.',
    );
    expect(error.name).toBe('RowRulesClassLevelError');
    expect(error).toMatchObject({
      label: 'rows[0].from',
      minimum: 1,
      maximum: 20,
    });
  });

  it('RowRulesBoundedNonEmptyTextError formats its label', () => {
    const error = new RowRulesBoundedNonEmptyTextError(
      'source.class_content_key',
      200,
    );
    expect(error.message).toBe(
      'source.class_content_key must be bounded non-empty text.',
    );
    expect(error.name).toBe('RowRulesBoundedNonEmptyTextError');
    expect(error).toMatchObject({
      label: 'source.class_content_key',
      maximum_code_points: 200,
    });
  });

  it('RowRulesKnownAbilityError formats its label', () => {
    const error = new RowRulesKnownAbilityError('source.ability');
    expect(error.message).toBe('source.ability must be a known ability.');
    expect(error.name).toBe('RowRulesKnownAbilityError');
    expect(error).toMatchObject({ label: 'source.ability' });
  });

  it.each([
    ['level', 'source.kind is not a supported level source.'],
    ['value', 'source.kind is not a supported value source.'],
  ] as const)(
    'RowRulesValueSourceKindError formats %s sources',
    (sourceKind, message) => {
      const error = new RowRulesValueSourceKindError('source', sourceKind);
      expect(error.message).toBe(message);
      expect(error.name).toBe('RowRulesValueSourceKindError');
      expect(error).toMatchObject({ label: 'source', source_kind: sourceKind });
    },
  );

  it('RowRulesBoundedNonEmptyListError formats its label', () => {
    const error = new RowRulesBoundedNonEmptyListError('expression.terms', 100);
    expect(error.message).toBe(
      'expression.terms must be a bounded non-empty list.',
    );
    expect(error.name).toBe('RowRulesBoundedNonEmptyListError');
    expect(error).toMatchObject({
      label: 'expression.terms',
      maximum_entries: 100,
    });
  });

  it('RowRulesLevelBandOrderError formats its band label', () => {
    const error = new RowRulesLevelBandOrderError('expression.rows[0]');
    expect(error.message).toBe(
      'expression.rows[0].from must not exceed its to level.',
    );
    expect(error.name).toBe('RowRulesLevelBandOrderError');
    expect(error).toMatchObject({ label: 'expression.rows[0]' });
  });

  it('RowRulesExpressionBandSequenceError formats its list label', () => {
    const error = new RowRulesExpressionBandSequenceError('expression.rows');
    expect(error.message).toBe(
      'expression.rows must be ordered, contiguous, and non-overlapping.',
    );
    expect(error.name).toBe('RowRulesExpressionBandSequenceError');
    expect(error).toMatchObject({ label: 'expression.rows' });
  });

  it.each([
    ['depth', 'expression exceeds the expression depth limit.', 8],
    ['breadth', 'expression exceeds the expression breadth limit.', 100],
  ] as const)(
    'RowRulesExpressionLimitError formats the %s limit',
    (limit, message, maximum) => {
      const error = new RowRulesExpressionLimitError(
        'expression',
        limit,
        maximum,
      );
      expect(error.message).toBe(message);
      expect(error.name).toBe('RowRulesExpressionLimitError');
      expect(error).toMatchObject({ label: 'expression', limit, maximum });
    },
  );

  it('RowRulesExpressionRoundError formats its expression label', () => {
    const error = new RowRulesExpressionRoundError('expression');
    expect(error.message).toBe('expression.round must be floor or ceiling.');
    expect(error.name).toBe('RowRulesExpressionRoundError');
    expect(error).toMatchObject({ label: 'expression' });
  });

  it('RowRulesClampOrderError formats its expression label', () => {
    const error = new RowRulesClampOrderError('expression');
    expect(error.message).toBe(
      'expression.minimum must not exceed maximum.',
    );
    expect(error.name).toBe('RowRulesClampOrderError');
    expect(error).toMatchObject({ label: 'expression' });
  });

  it('RowRulesValueExpressionKindError formats and carries the unknown kind', () => {
    const error = new RowRulesValueExpressionKindError('expression', 'product');
    expect(error.message).toBe(
      'expression.kind is not a supported value expression.',
    );
    expect(error.name).toBe('RowRulesValueExpressionKindError');
    expect(error).toMatchObject({
      label: 'expression',
      expression_kind: 'product',
    });
  });

  it('RowRulesBoundedJsonTextError formats its label', () => {
    const error = new RowRulesBoundedJsonTextError('expression', 4096);
    expect(error.message).toBe('expression must be bounded JSON text.');
    expect(error.name).toBe('RowRulesBoundedJsonTextError');
    expect(error).toMatchObject({ label: 'expression', maximum_bytes: 4096 });
  });

  it('RowRulesNullableBoundedJsonTextError formats its label', () => {
    const error = new RowRulesNullableBoundedJsonTextError(
      'supersedes_ref',
      512,
    );
    expect(error.message).toBe(
      'supersedes_ref must be null or bounded JSON text.',
    );
    expect(error.name).toBe('RowRulesNullableBoundedJsonTextError');
    expect(error).toMatchObject({ label: 'supersedes_ref', maximum_bytes: 512 });
  });

  it('RowRulesJsonParseError formats its label and preserves its cause', () => {
    const cause = new SyntaxError('Unexpected end of JSON input');
    const error = new RowRulesJsonParseError('expression', cause);
    expect(error.message).toBe('expression must be valid JSON.');
    expect(error.name).toBe('RowRulesJsonParseError');
    expect(error).toMatchObject({ label: 'expression', cause });
  });

  it('RowRulesActiveLevelBandError formats its fixed storage range', () => {
    const error = new RowRulesActiveLevelBandError(8, 4, 1, 20);
    expect(error.message).toBe(
      'active level band must be ordered within 1 through 20.',
    );
    expect(error.name).toBe('RowRulesActiveLevelBandError');
    expect(error).toMatchObject({
      active_from_level: 8,
      active_to_level: 4,
      minimum: 1,
      maximum: 20,
    });
  });

  it.each([
    [
      'feature_dice_count',
      'feature_dice_count requires target_key sneak_attack, op add, and no resource display configuration.',
    ],
    [
      'resource_maximum',
      'resource_maximum requires a bounded target_key, op add, and complete display configuration.',
    ],
  ] as const)(
    'RowRulesContributionTargetConfigurationError formats %s',
    (targetKind, message) => {
      const error = new RowRulesContributionTargetConfigurationError(targetKind);
      expect(error.message).toBe(message);
      expect(error.name).toBe(
        'RowRulesContributionTargetConfigurationError',
      );
      expect(error).toMatchObject({ target_kind: targetKind });
    },
  );

  it('RowRulesUnsupportedContributionTargetKindError carries the unknown kind', () => {
    const error = new RowRulesUnsupportedContributionTargetKindError('damage');
    expect(error.message).toBe('target_kind is not supported.');
    expect(error.name).toBe(
      'RowRulesUnsupportedContributionTargetKindError',
    );
    expect(error).toMatchObject({ target_kind: 'damage' });
  });
});
