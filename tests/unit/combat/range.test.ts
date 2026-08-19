import { describe, expect, it } from 'vitest';
import { attackRangeVerdict } from '../../../src/combat/range';
import { feet } from '../../../src/combat/values';

describe('attack range verdicts', () => {
  it('accepts a target within melee reach and refuses one beyond it', () => {
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 1, row: 1 },
        { kind: 'melee', reach: feet(5) },
      ),
    ).toEqual({ kind: 'legal', rollMode: 'normal' });
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 2, row: 0 },
        { kind: 'melee', reach: feet(5) },
      ),
    ).toEqual({ kind: 'illegal', reason: 'out_of_range' });
  });

  it('uses shortest-grid-route distance for diagonal ranged attacks', () => {
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 6, row: 6 },
        { kind: 'ranged', normal: feet(30), long: feet(60) },
      ),
    ).toEqual({ kind: 'legal', rollMode: 'normal' });
  });

  it('uses normal roll mode through normal range and disadvantage through long range', () => {
    const range = { kind: 'ranged' as const, normal: feet(30), long: feet(60) };
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 6, row: 0 },
        range,
      ),
    ).toEqual({ kind: 'legal', rollMode: 'normal' });
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 7, row: 0 },
        range,
      ),
    ).toEqual({ kind: 'legal', rollMode: 'disadvantage' });
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 12, row: 0 },
        range,
      ),
    ).toEqual({ kind: 'legal', rollMode: 'disadvantage' });
  });

  it('refuses a target one square beyond long range', () => {
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 13, row: 0 },
        { kind: 'ranged', normal: feet(30), long: feet(60) },
      ),
    ).toEqual({ kind: 'illegal', reason: 'out_of_range' });
  });
});
