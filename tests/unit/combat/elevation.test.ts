import { describe, expect, it } from 'vitest';
import {
  ELEVATION_TIERS,
  GROUND_ELEVATION_TIERS,
  elevationFeet,
  groundElevationAt,
  type ElevationLayout,
} from '../../../src/combat/elevation';

function layout(): ElevationLayout {
  return {
    kind: 'elevation_tiers_v1',
    defaultTier: 'floor',
    regions: [
      { id: 'pit-west', tier: 'pit', cells: [{ column: 0, row: 1 }] },
      {
        id: 'raised-east',
        tier: 'raised',
        cells: [{ column: 2, row: 1 }],
      },
    ],
    waterRegions: [
      { id: 'flooded-floor', cells: [{ column: 1, row: 1 }] },
      { id: 'flooded-pit', cells: [{ column: 0, row: 1 }] },
    ],
  };
}

describe('D586 elevation vocabulary foundation', () => {
  it('closes ground and creature elevation to the approved readable tiers', () => {
    expect(GROUND_ELEVATION_TIERS).toEqual(['pit', 'floor', 'raised']);
    expect(ELEVATION_TIERS).toEqual(['pit', 'floor', 'raised', 'flying']);
  });

  it('resolves authored regions over floor while keeping water orthogonal', () => {
    const spatial = layout();
    expect(groundElevationAt(spatial, { column: 0, row: 1 })).toBe('pit');
    expect(groundElevationAt(spatial, { column: 1, row: 1 })).toBe('floor');
    expect(groundElevationAt(spatial, { column: 2, row: 1 })).toBe('raised');
    expect(groundElevationAt(spatial, { column: 9, row: 9 })).toBe('floor');
  });

  it('rejects contradictory authored ground tiers for one cell', () => {
    const spatial: ElevationLayout = {
      ...layout(),
      regions: [
        { id: 'pit', tier: 'pit', cells: [{ column: 3, row: 4 }] },
        { id: 'ledge', tier: 'raised', cells: [{ column: 3, row: 4 }] },
      ],
    };
    expect(() => groundElevationAt(spatial, { column: 3, row: 4 })).toThrow(
      RangeError,
    );
  });

  it('accepts signed half-foot bases and rejects non-finite or finer values', () => {
    expect(elevationFeet(-10)).toBe(-10);
    expect(elevationFeet(0)).toBe(0);
    expect(elevationFeet(10.5)).toBe(10.5);
    expect(() => elevationFeet(Number.NaN)).toThrow(RangeError);
    expect(() => elevationFeet(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => elevationFeet(0.25)).toThrow(RangeError);
  });
});
