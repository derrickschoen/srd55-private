import { describe, expect, it } from 'vitest';
import {
  movementSpeeds,
  type MovementSpeed,
} from '../../../src/combat/movement-speeds';
import { feet, type Feet } from '../../../src/combat/values';

describe('D586 movement speed foundation', () => {
  it('S1-ZERO-SPEED retains a present zero-foot walk mode', () => {
    const speeds = movementSpeeds([
      { kind: 'walk', feet: feet(0), provenance: 'effect' },
    ]);
    expect(speeds).toEqual([
      { kind: 'walk', feet: 0, provenance: 'effect' },
    ]);
  });

  it('S1-DUPLICATE-SPEEDS rejects duplicate kinds at runtime', () => {
    expect(() =>
      movementSpeeds([
        { kind: 'walk', feet: feet(30), provenance: 'source' },
        { kind: 'walk', feet: feet(0), provenance: 'effect' },
      ]),
    ).toThrow(RangeError);
  });

  it('requires walk while retaining sourced special modes and fly hover', () => {
    const speeds = movementSpeeds([
      { kind: 'walk', feet: feet(30), provenance: 'source' },
      { kind: 'climb', feet: feet(20), provenance: 'source' },
      {
        kind: 'fly',
        feet: feet(40),
        hover: true,
        provenance: 'source',
      },
    ]);
    expect(speeds.map((speed) => speed.kind)).toEqual(['walk', 'climb', 'fly']);
    expect(speeds[2]).toMatchObject({ kind: 'fly', hover: true, feet: 40 });

    expect(() =>
      movementSpeeds([
        { kind: 'swim', feet: feet(20), provenance: 'source' },
      ]),
    ).toThrow('Movement speeds must include walk.');
  });

  it('rejects non-finite, negative, and non-fly hover values at runtime', () => {
    const malformedFeet = [-1, Number.NaN, Number.POSITIVE_INFINITY];
    for (const value of malformedFeet) {
      expect(() =>
        movementSpeeds([
          {
            kind: 'walk',
            feet: value as Feet,
            provenance: 'legacy_scalar',
          },
        ]),
      ).toThrow(RangeError);
    }

    const malformedHover = {
      kind: 'walk',
      feet: feet(30),
      hover: false,
      provenance: 'source',
    } as unknown as MovementSpeed;
    expect(() => movementSpeeds([malformedHover])).toThrow(
      'Only a fly movement speed can carry hover.',
    );
  });
});
