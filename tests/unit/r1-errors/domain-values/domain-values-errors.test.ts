import { describe, expect, it } from 'vitest';
import type { PositiveInteger } from '../../../../src/domain/class-resources';
import type { CharacterLevel } from '../../../../src/domain/enums';
import type {
  FeatureValueContribution,
  FeatureValueTarget,
  FeatureValueTargetKind,
} from '../../../../src/domain/feature-values';
import {
  contributionSource,
  foldFeatureValues,
} from '../../../../src/domain/feature-values';
import type { ContentKey } from '../../../../src/domain/ids';
import {
  evaluateValue,
  type ValueEvaluationContext,
  type ValueExpression,
} from '../../../../src/domain/value-expression';
import { JsonColumnFactsMissingError } from '../../../../src/domain/contracts/json-columns-errors';
import { RowColumnFactsMissingError } from '../../../../src/domain/contracts/rows-errors';
import { FeatureValueTargetUnhandledError } from '../../../../src/domain/feature-values-errors';
import { SubclassFeatureDescriptionEmptyError } from '../../../../src/domain/subclass-feature-description-errors';
import {
  ValueExpressionUnhandledError,
  type ValueExpressionUnhandledSubject,
} from '../../../../src/domain/value-expression-errors';
import { LegacyWeaponDamageColumnTypeError } from '../../../../src/domain/weapon-damage-errors';
import {
  WeaponRangeStorageError,
  WeaponRangeV1PairClassificationError,
} from '../../../../src/domain/weapon-range-errors';

describe('domain value error formatters', () => {
  it('formats JsonColumnFactsMissingError', () => {
    const error = new JsonColumnFactsMissingError('unknown.payload');
    expect(error.message).toBe('No column facts for unknown.payload.');
    expect(error.name).toBe('JsonColumnFactsMissingError');
    expect(error.column_key).toBe('unknown.payload');
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats RowColumnFactsMissingError', () => {
    const error = new RowColumnFactsMissingError('characters', 'unknown');
    expect(error.message).toBe('No column facts for characters.unknown.');
    expect(error.name).toBe('RowColumnFactsMissingError');
    expect(error).toMatchObject({ table: 'characters', column: 'unknown' });
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats FeatureValueTargetUnhandledError', () => {
    const error = new FeatureValueTargetUnhandledError('[object Object]');
    expect(error.message).toBe(
      'Unhandled feature value target [object Object].',
    );
    expect(error.name).toBe('FeatureValueTargetUnhandledError');
    expect(error.target).toBe('[object Object]');
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it('formats SubclassFeatureDescriptionEmptyError', () => {
    const error = new SubclassFeatureDescriptionEmptyError();
    expect(error.message).toBe(
      'Subclass feature description must be non-empty.',
    );
    expect(error.name).toBe('SubclassFeatureDescriptionEmptyError');
    expect(error).toBeInstanceOf(TypeError);
  });

  it.each<readonly [ValueExpressionUnhandledSubject, string]>([
    ['value source kind', 'Unhandled value source kind future.'],
    ['level source', 'Unhandled level source future.'],
    ['value expression kind', 'Unhandled value expression kind future.'],
    ['value source', 'Unhandled value source future.'],
    ['value expression', 'Unhandled value expression future.'],
  ])('formats ValueExpressionUnhandledError for %s', (subject, message) => {
    const error = new ValueExpressionUnhandledError(subject, 'future');
    expect(error.message).toBe(message);
    expect(error.name).toBe('ValueExpressionUnhandledError');
    expect(error).toMatchObject({ subject, value: 'future' });
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  it.each([
    [
      'damage_dice',
      'Legacy weapon row damage_dice must be a string or null.',
    ],
    [
      'versatile_damage_dice',
      'Legacy weapon row versatile_damage_dice must be a string or null.',
    ],
  ] as const)(
    'formats LegacyWeaponDamageColumnTypeError for %s',
    (column, message) => {
      const error = new LegacyWeaponDamageColumnTypeError(column);
      expect(error.message).toBe(message);
      expect(error.name).toBe('LegacyWeaponDamageColumnTypeError');
      expect(error.column).toBe(column);
      expect(error).toBeInstanceOf(TypeError);
    },
  );

  it.each([
    ['none', 5, null, 'A none weapon range cannot carry distances.'],
    ['ranged', null, 30, 'A ranged weapon range has invalid distances.'],
    ['legacy', 20, 20, 'A legacy weapon range has invalid distances.'],
  ] as const)(
    'formats WeaponRangeStorageError for %s',
    (kind, near_feet, far_feet, message) => {
      const error = new WeaponRangeStorageError(kind, near_feet, far_feet);
      expect(error.message).toBe(message);
      expect(error.name).toBe('WeaponRangeStorageError');
      expect(error).toMatchObject({ kind, near_feet, far_feet });
      expect(error).toBeInstanceOf(TypeError);
    },
  );

  it('formats WeaponRangeV1PairClassificationError', () => {
    const error = new WeaponRangeV1PairClassificationError(20, null);
    expect(error.message).toBe(
      'The v1 weapon range pair is not classifiable.',
    );
    expect(error.name).toBe('WeaponRangeV1PairClassificationError');
    expect(error).toMatchObject({
      range_normal_feet: 20,
      range_long_feet: null,
    });
    expect(error).toBeInstanceOf(TypeError);
  });
});

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a tagged defect, but the call returned.');
}

describe('domain value defect guards', () => {
  it('tags a forged JSON-column key with the missing key', async () => {
    const { jsonColumnLocation } = await import(
      '../../../../src/domain/contracts/json-columns'
    );
    const error = thrown(() =>
      jsonColumnLocation(
        'unknown.payload' as Parameters<typeof jsonColumnLocation>[0],
      ),
    );
    expect(error).toBeInstanceOf(JsonColumnFactsMissingError);
    expect(error).toMatchObject({ column_key: 'unknown.payload' });
  });

  it('tags a forged row-contract column with its table and column', async () => {
    const { rowContractError } = await import(
      '../../../../src/domain/contracts/rows'
    );
    const error = thrown(() =>
      rowContractError('characters', {}, 'probe', ['unknown']),
    );
    expect(error).toBeInstanceOf(RowColumnFactsMissingError);
    expect(error).toMatchObject({ table: 'characters', column: 'unknown' });
  });

  it('tags an impossible feature-value target with the reached target', () => {
    const malformedTarget = {
      kind: 'future',
    } as unknown as FeatureValueTarget;
    const first = contributionSource(
      '2024:class:rogue' as ContentKey,
      'first',
    );
    const second = contributionSource(
      '2024:class:rogue' as ContentKey,
      'second',
    );
    const contributions = [
      { source: first, target: malformedTarget, op: 'add', value: 1 },
      {
        source: second,
        target: malformedTarget,
        op: 'add',
        value: 1,
        supersedes: first,
      },
    ] as unknown as readonly FeatureValueContribution<FeatureValueTargetKind>[];

    const error = thrown(() => foldFeatureValues(contributions));
    expect(error).toBeInstanceOf(FeatureValueTargetUnhandledError);
    expect(error).toMatchObject({ target: '[object Object]' });
  });

  it('tags an empty subclass-feature description', async () => {
    const { nonEmptySubclassFeatureDescription } = await import(
      '../../../../src/domain/subclass-feature-description'
    );
    const error = thrown(() => nonEmptySubclassFeatureDescription(''));
    expect(error).toBeInstanceOf(SubclassFeatureDescriptionEmptyError);
  });

  it.each([
    [
      'value source',
      {
        kind: 'ref',
        source: { kind: 'future' },
      },
    ],
    ['value expression', { kind: 'future' }],
  ] as const)('tags an impossible %s limb', (subject, expression) => {
    const context: ValueEvaluationContext = {
      character_level: 1 as CharacterLevel,
      proficiency_bonus: 2 as PositiveInteger,
      class_levels: new Map(),
      ability_modifiers: new Map(),
    };
    const error = thrown(() =>
      evaluateValue(expression as unknown as ValueExpression, context),
    );
    expect(error).toBeInstanceOf(ValueExpressionUnhandledError);
    expect(error).toMatchObject({ subject, value: '[object Object]' });
  });

  it.each([
    ['damage_dice', { damage_dice: 12, versatile_damage_dice: null }],
    [
      'versatile_damage_dice',
      { damage_dice: null, versatile_damage_dice: false },
    ],
  ] as const)('tags malformed legacy weapon column %s', async (column, row) => {
    const { migrateLegacyWeaponDamageRow } = await import(
      '../../../../src/domain/weapon-damage'
    );
    const error = thrown(() => migrateLegacyWeaponDamageRow(row));
    expect(error).toBeInstanceOf(LegacyWeaponDamageColumnTypeError);
    expect(error).toMatchObject({ column });
  });

  it.each([
    ['none', 5, null],
    ['ranged', null, 30],
    ['legacy', 20, 20],
  ] as const)(
    'tags malformed %s storage distances',
    async (kind, near_feet, far_feet) => {
      const { weaponRangeFromStorage } = await import(
        '../../../../src/domain/weapon-range'
      );
      const error = thrown(() =>
        weaponRangeFromStorage(kind, near_feet, far_feet),
      );
      expect(error).toBeInstanceOf(WeaponRangeStorageError);
      expect(error).toMatchObject({ kind, near_feet, far_feet });
    },
  );
});
