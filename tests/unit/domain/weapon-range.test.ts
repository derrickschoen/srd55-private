import { describe, expect, it } from 'vitest';
import {
  weaponRangeFromStorage,
  weaponRangeFromV1Pair,
} from '../../../src/domain/weapon-range';

const V1_RANGE_BOUNDARIES = [
  [
    'equal distances',
    20,
    20,
    { kind: 'ranged', near_feet: 20, far_feet: 20 },
  ],
  [
    'the smallest inverted pair',
    20,
    19,
    { kind: 'legacy', near_feet: 20, far_feet: 19 },
  ],
  [
    'zero at the near bound',
    0,
    60,
    { kind: 'ranged', near_feet: 0, far_feet: 60 },
  ],
  [
    'zero at the far bound',
    null,
    0,
    { kind: 'legacy', near_feet: null, far_feet: 0 },
  ],
  [
    'the near ceiling',
    100_000,
    null,
    { kind: 'ranged', near_feet: 100_000, far_feet: null },
  ],
  [
    'the far ceiling',
    20,
    100_000,
    { kind: 'ranged', near_feet: 20, far_feet: 100_000 },
  ],
] as const;

describe('weapon range boundary mapping', () => {
  it.each(V1_RANGE_BOUNDARIES)(
    'classifies %s without changing either v1 value',
    (_name, near, far, expected) => {
      expect(weaponRangeFromV1Pair(near, far)).toEqual(expected);
    },
  );

  it('puts equality exclusively in ranged, never in decode-only legacy', () => {
    expect(weaponRangeFromStorage('ranged', 20, 20)).toEqual({
      kind: 'ranged',
      near_feet: 20,
      far_feet: 20,
    });
    expect(() => weaponRangeFromStorage('legacy', 20, 20)).toThrow(
      /legacy weapon range has invalid distances/,
    );
  });
});
