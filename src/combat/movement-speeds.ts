import type { MovementKind } from './statblock';
import type { Feet } from './values';

export type MovementSpeed =
  | {
      readonly kind: Exclude<MovementKind, 'fly'>;
      readonly feet: Feet;
      readonly provenance: 'source' | 'effect' | 'legacy_scalar';
    }
  | {
      readonly kind: 'fly';
      readonly feet: Feet;
      readonly hover: boolean;
      readonly provenance: 'source' | 'effect' | 'legacy_scalar';
    };

declare const movementSpeedsBrand: unique symbol;
export type MovementSpeeds = readonly [MovementSpeed, ...MovementSpeed[]] & {
  readonly [movementSpeedsBrand]: true;
};

/**
 * Establishes the non-empty, walk-present, unique-by-kind speed-set invariant.
 * A present zero-foot mode is retained because it is distinct from absence.
 */
export function movementSpeeds(
  values: readonly [MovementSpeed, ...MovementSpeed[]],
): MovementSpeeds {
  const kinds = new Set<MovementKind>();
  let hasWalk = false;
  const copy: MovementSpeed[] = [];

  for (const value of values) {
    if (!Number.isFinite(value.feet) || value.feet < 0) {
      throw new RangeError(
        'Movement speed feet must be a finite, non-negative number.',
      );
    }
    if (kinds.has(value.kind)) {
      throw new RangeError(`Duplicate movement kind: ${value.kind}.`);
    }
    if (value.kind !== 'fly' && 'hover' in value) {
      throw new RangeError('Only a fly movement speed can carry hover.');
    }
    kinds.add(value.kind);
    hasWalk ||= value.kind === 'walk';
    copy.push({ ...value });
  }

  if (!hasWalk) {
    throw new RangeError('Movement speeds must include walk.');
  }

  return copy as unknown as MovementSpeeds;
}
