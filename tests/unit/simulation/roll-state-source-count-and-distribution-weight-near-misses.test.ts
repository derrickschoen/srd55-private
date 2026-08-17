import { describe, expect, it } from 'vitest';
import { dieSizes } from '../../../src/domain/enums';
import {
  damageFlatModifier,
  positiveDiceCount,
  type DamageComponent,
} from '../../../src/simulation/contracts';
// Side-effect import of the module under test. Stryker's vitest-runner picks
// the tests to run against a mutant from the module graph recorded during the
// dry run, so a file that reaches its subject only through a dynamic import is
// never selected. This static import pins `probability.ts` into this file's
// graph alongside the named imports below.
import '../../../src/simulation/probability';
import {
  enumerateDicePool,
  ordinaryDamageDistribution,
  resolveRollState,
  type DamageOutcomeDistribution,
} from '../../../src/simulation/probability';

/**
 * Near-miss probes for two things in `src/simulation/probability.ts`.
 *
 * 1. ROLL-STATE SOURCE-COUNT VALIDATION (`resolveRollState`). The guard is a
 *    four-way disjunction: each of `advantageSources` and `disadvantageSources`
 *    must be an integer AND must be nonnegative. Each case below makes exactly
 *    ONE of the four disjuncts true, so no disjunct can be deleted, forced
 *    false, or re-joined with `&&` without a case noticing.
 *
 * 2. THE NORMALISED-DISTRIBUTION SHAPE (`normalizedDistribution`). Its total
 *    weight guard and its ascending sort can only be reasoned about against
 *    the invariant its four call sites maintain: every outcome map holds a
 *    contiguous, ascending run of nonnegative integer totals whose weights sum
 *    to one. The cases below pin that invariant directly.
 */

describe('resolveRollState source-count validation', () => {
  it('accepts the all-zero case and every ordinary combination', () => {
    expect(resolveRollState(0, 0)).toBe('normal');
    expect(resolveRollState(2, 0)).toBe('advantage');
    expect(resolveRollState(0, 3)).toBe('disadvantage');
    expect(resolveRollState(1, 1)).toBe('normal');
    expect(resolveRollState(4, 7)).toBe('normal');
  });

  it('accepts integral values written as floats', () => {
    expect(resolveRollState(3.0, 0)).toBe('advantage');
    expect(resolveRollState(0, 2.0)).toBe('disadvantage');
  });

  it('accepts negative zero, which is an integer and is not below zero', () => {
    expect(resolveRollState(-0, 0)).toBe('normal');
    expect(resolveRollState(0, -0)).toBe('normal');
  });

  it('rejects a non-integer advantage count on its own', () => {
    // Only the FIRST disjunct is true here: 1.5 is nonnegative, and both
    // disadvantage disjuncts are false.
    expect(Number.isInteger(1.5)).toBe(false);
    expect(1.5 < 0).toBe(false);
    expect(() => resolveRollState(1.5, 0)).toThrow(RangeError);
    expect(() => resolveRollState(1.5, 0)).toThrow(
      'Roll-state source counts must be nonnegative integers.',
    );
  });

  it('rejects a negative advantage count on its own', () => {
    // Only the SECOND disjunct is true: -1 IS an integer.
    expect(Number.isInteger(-1)).toBe(true);
    expect(() => resolveRollState(-1, 0)).toThrow(RangeError);
  });

  it('rejects a non-integer disadvantage count on its own', () => {
    // Only the THIRD disjunct is true.
    expect(Number.isInteger(0.5)).toBe(false);
    expect(0.5 < 0).toBe(false);
    expect(() => resolveRollState(0, 0.5)).toThrow(RangeError);
  });

  it('rejects a negative disadvantage count on its own', () => {
    // Only the FOURTH disjunct is true: -2 IS an integer.
    expect(Number.isInteger(-2)).toBe(true);
    expect(() => resolveRollState(0, -2)).toThrow(RangeError);
  });

  it('rejects non-integral values that are not simple fractions', () => {
    expect(() => resolveRollState(Number.NaN, 0)).toThrow(RangeError);
    expect(() => resolveRollState(0, Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
    expect(() => resolveRollState(Number.NEGATIVE_INFINITY, 0)).toThrow(
      RangeError,
    );
  });

  it('rejects a bad count even when the other side is a valid positive count', () => {
    // Without this pair, a guard that only ever saw a zero on the good side
    // could not be told apart from one that checked a single argument.
    expect(() => resolveRollState(-1, 5)).toThrow(RangeError);
    expect(() => resolveRollState(5, -1)).toThrow(RangeError);
  });
});

function totalsOf(distribution: DamageOutcomeDistribution): readonly number[] {
  return distribution.map((outcome) => outcome.total);
}

function weightOf(distribution: DamageOutcomeDistribution): number {
  return distribution.reduce((sum, outcome) => sum + outcome.probability, 0);
}

describe('normalised distribution shape', () => {
  it('enumerates every dice pool as a contiguous ascending run summing to one', () => {
    for (const die of dieSizes) {
      for (let count = 1; count <= 6; count += 1) {
        const distribution = enumerateDicePool({
          count: positiveDiceCount(count),
          die,
        });
        const totals = totalsOf(distribution);
        expect(totals).toHaveLength(count * die - count + 1);
        expect(totals[0]).toBe(count);
        expect(totals.at(-1)).toBe(count * die);
        // Contiguous and strictly ascending, which is exactly the property the
        // ascending sort is there to guarantee.
        expect(totals).toEqual(
          totals.map((_, index) => count + index),
        );
        expect(weightOf(distribution)).toBeCloseTo(1, 12);
        expect(
          distribution.every((outcome) => outcome.probability > 0),
        ).toBe(true);
      }
    }
  });

  it('keeps mixed dice and modifiers ascending, clamped at zero, and normalised', () => {
    for (const first of dieSizes) {
      for (const modifier of [-40, -7, -1, 0, 3, 25]) {
        const components: readonly DamageComponent[] = [
          { kind: 'dice', pool: { count: positiveDiceCount(2), die: first } },
          { kind: 'flat', modifier: damageFlatModifier(modifier) },
          { kind: 'dice', pool: { count: positiveDiceCount(3), die: 6 } },
        ];
        const distribution = ordinaryDamageDistribution(components);
        const totals = totalsOf(distribution);
        const ascending = [...totals].sort((left, right) => left - right);
        expect(totals).toEqual(ascending);
        expect(new Set(totals).size).toBe(totals.length);
        expect(totals[0]).toBe(Math.max(0, 2 + 3 + modifier));
        expect(totals.at(-1)).toBe(Math.max(0, 2 * first + 18 + modifier));
        expect(totals.every((total) => total >= 0)).toBe(true);
        expect(weightOf(distribution)).toBeCloseTo(1, 12);
      }
    }
  });

  it('never produces a zero, negative, or non-finite total weight', () => {
    // The `normalizedDistribution` weight guard exists for a map whose weights
    // do not sum to a positive finite number. This case states the invariant
    // the four call sites maintain, so a reader can see WHY that guard is
    // unreachable rather than assuming it is exercised somewhere.
    const distributions = [
      enumerateDicePool({ count: positiveDiceCount(1), die: 100 }),
      enumerateDicePool({ count: positiveDiceCount(8), die: 20 }),
      ordinaryDamageDistribution([
        { kind: 'flat', modifier: damageFlatModifier(-99) },
        { kind: 'dice', pool: { count: positiveDiceCount(4), die: 12 } },
      ]),
    ];
    for (const distribution of distributions) {
      const weight = weightOf(distribution);
      expect(Number.isFinite(weight)).toBe(true);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeCloseTo(1, 12);
    }
  });
});
