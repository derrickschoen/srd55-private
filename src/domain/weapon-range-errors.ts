import type { WeaponRangeKind } from './weapon-range';

const STORAGE_RANGE_MESSAGES: Readonly<Record<WeaponRangeKind, string>> = {
  none: 'A none weapon range cannot carry distances.',
  ranged: 'A ranged weapon range has invalid distances.',
  legacy: 'A legacy weapon range has invalid distances.',
};

/** Stored range columns disagree with their discriminator. */
export class WeaponRangeStorageError extends TypeError {
  override readonly name = 'WeaponRangeStorageError' as const;

  constructor(
    readonly kind: WeaponRangeKind,
    readonly near_feet: number | null,
    readonly far_feet: number | null,
  ) {
    super(STORAGE_RANGE_MESSAGES[kind]);
  }
}

/** A frozen v1 range pair matches none of the lossless tagged limbs. */
export class WeaponRangeV1PairClassificationError extends TypeError {
  override readonly name = 'WeaponRangeV1PairClassificationError' as const;

  constructor(
    readonly range_normal_feet: number | null,
    readonly range_long_feet: number | null,
  ) {
    super('The v1 weapon range pair is not classifiable.');
  }
}
