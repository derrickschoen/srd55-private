/** The storage discriminator for a weapon's tagged range. */
export const weaponRangeKinds = ['none', 'ranged', 'legacy'] as const;
export type WeaponRangeKind = (typeof weaponRangeKinds)[number];

/**
 * A weapon range as the application understands it.
 *
 * `legacy` is decode-only. It preserves the two exceptional v1 tuples that
 * cannot satisfy the ranged relation: long-only and inverted pairs.
 */
export type WeaponRange =
  | Readonly<{ kind: 'none' }>
  | Readonly<{
      kind: 'ranged';
      near_feet: number;
      far_feet: number | null;
    }>
  | Readonly<{
      kind: 'legacy';
      near_feet: number | null;
      far_feet: number;
    }>;

export type WritableWeaponRange = Exclude<WeaponRange, { kind: 'legacy' }>;

export interface LegacyWeaponRangePair {
  readonly range_normal_feet: number | null;
  readonly range_long_feet: number | null;
}

export function isWeaponRangeKind(value: unknown): value is WeaponRangeKind {
  return (
    typeof value === 'string' &&
    weaponRangeKinds.some((candidate) => candidate === value)
  );
}

/** Decodes columns after their database CHECK has established the limb. */
export function weaponRangeFromStorage(
  kind: WeaponRangeKind,
  near_feet: number | null,
  far_feet: number | null,
): WeaponRange {
  switch (kind) {
    case 'none':
      if (near_feet !== null || far_feet !== null) {
        throw new TypeError('A none weapon range cannot carry distances.');
      }
      return { kind };
    case 'ranged':
      if (
        near_feet === null ||
        (far_feet !== null && far_feet < near_feet)
      ) {
        throw new TypeError('A ranged weapon range has invalid distances.');
      }
      return { kind, near_feet, far_feet };
    case 'legacy':
      if (
        far_feet === null ||
        (near_feet !== null && far_feet >= near_feet)
      ) {
        throw new TypeError('A legacy weapon range has invalid distances.');
      }
      return { kind, near_feet, far_feet };
  }
}

/** Lossless mapping from the frozen v1 pair into the tagged storage domain. */
export function weaponRangeFromV1Pair(
  range_normal_feet: number | null,
  range_long_feet: number | null,
): WeaponRange {
  if (range_normal_feet === null && range_long_feet === null) {
    return { kind: 'none' };
  }
  if (
    range_normal_feet !== null &&
    (range_long_feet === null || range_long_feet >= range_normal_feet)
  ) {
    return {
      kind: 'ranged',
      near_feet: range_normal_feet,
      far_feet: range_long_feet,
    };
  }
  if (range_long_feet === null) {
    throw new TypeError('The v1 weapon range pair is not classifiable.');
  }
  return {
    kind: 'legacy',
    near_feet: range_normal_feet,
    far_feet: range_long_feet,
  };
}

/** Lossless mapping back to the frozen v1 tuple fields. */
export function weaponRangeToV1Pair(
  range: WeaponRange,
): LegacyWeaponRangePair {
  switch (range.kind) {
    case 'none':
      return { range_normal_feet: null, range_long_feet: null };
    case 'ranged':
    case 'legacy':
      return {
        range_normal_feet: range.near_feet,
        range_long_feet: range.far_feet,
      };
  }
}

/**
 * Replaces the retired pair of weapon columns without normalising their values.
 * The current row contract judges types and bounds after this shape migration.
 */
export function migrateLegacyWeaponRangeRow(
  row: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (Object.hasOwn(row, 'range_kind')) {
    return row;
  }
  const normal = row.range_normal_feet;
  const long = row.range_long_feet;
  const migrated = { ...row };
  delete migrated.range_normal_feet;
  delete migrated.range_long_feet;
  return {
    ...migrated,
    range_kind:
      normal === null && long === null
        ? 'none'
        : normal !== null &&
            normal !== undefined &&
            (long === null ||
              (typeof normal === 'number' &&
                typeof long === 'number' &&
                long >= normal))
          ? 'ranged'
          : 'legacy',
    range_near_feet: normal,
    range_far_feet: long,
  };
}
