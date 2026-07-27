/**
 * A weapon's recorded damage.
 *
 * Payloads exist only on the limb that owns them. In particular, `dice` cannot
 * be read from a flat or not-recorded value: callers must narrow on `kind`
 * first, so treating absence as zero is a compile error rather than a plausible
 * number.
 */
export type WeaponDamageAmount =
  | { readonly kind: 'dice'; readonly dice: string }
  | { readonly kind: 'flat'; readonly amount: number }
  | { readonly kind: 'custom'; readonly text: string };

export type WeaponDamage =
  | WeaponDamageAmount
  | { readonly kind: 'not_recorded' };

/**
 * Versatile is a second damage amount, but it is not always applicable.
 *
 * This is deliberately narrower than `WeaponDamage`: the absence of a
 * Versatile value means the weapon does not have that mode, not that a value
 * was forgotten. `not_applicable` makes that fact explicit without admitting
 * `not_recorded`.
 */
export type VersatileWeaponDamage =
  | WeaponDamageAmount
  | { readonly kind: 'not_applicable' };

const DICE_EXPRESSION = /^[1-9][0-9]*d[1-9][0-9]*$/u;
const FLAT_EXPRESSION = /^(?:0|[1-9][0-9]*)$/u;

/**
 * Maps the legacy free-text column without discarding a byte of unparseable
 * user input. This is used at every legacy boundary, not as a one-off rewrite.
 */
export function weaponDamageFromLegacy(
  value: string | null,
): WeaponDamage {
  if (value === null) {
    return { kind: 'not_recorded' };
  }
  if (DICE_EXPRESSION.test(value)) {
    return { kind: 'dice', dice: value };
  }
  if (FLAT_EXPRESSION.test(value)) {
    return { kind: 'flat', amount: Number(value) };
  }
  return { kind: 'custom', text: value };
}

/**
 * The legacy versatile NULL meant that the weapon lacked the Versatile
 * property. Non-null values use the same lossless amount parser as primary
 * damage, but cannot become `not_recorded`.
 */
export function versatileWeaponDamageFromLegacy(
  value: string | null,
): VersatileWeaponDamage {
  const damage = weaponDamageFromLegacy(value);
  return damage.kind === 'not_recorded'
    ? { kind: 'not_applicable' }
    : damage;
}

function legacyRowText(
  row: Readonly<Record<string, unknown>>,
  column: 'damage_dice' | 'versatile_damage_dice',
): string | null {
  const value = row[column];
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new TypeError(
    `Legacy weapon row ${column} must be a string or null.`,
  );
}

function damageColumns(
  damage: WeaponDamage | VersatileWeaponDamage,
  prefix: 'damage' | 'versatile_damage',
): Readonly<Record<string, string | number | null>> {
  return {
    [`${prefix}_kind`]: damage.kind,
    [`${prefix}_dice`]: damage.kind === 'dice' ? damage.dice : null,
    [`${prefix}_flat`]: damage.kind === 'flat' ? damage.amount : null,
    [`${prefix}_custom`]: damage.kind === 'custom' ? damage.text : null,
  };
}

/**
 * Upgrades a full row written before the damage discriminator existed.
 *
 * The presence of either discriminator means this is a current (or malformed
 * current) row, which the row contract must judge without a migration silently
 * repairing it. A genuinely legacy row has neither and is mapped losslessly.
 */
export function migrateLegacyWeaponDamageRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  if (
    Object.hasOwn(row, 'damage_kind') ||
    Object.hasOwn(row, 'versatile_damage_kind')
  ) {
    return { ...row };
  }
  const damage = weaponDamageFromLegacy(legacyRowText(row, 'damage_dice'));
  const versatile = versatileWeaponDamageFromLegacy(
    legacyRowText(row, 'versatile_damage_dice'),
  );
  return {
    ...row,
    ...damageColumns(damage, 'damage'),
    ...damageColumns(versatile, 'versatile_damage'),
  };
}

export function formatWeaponDamage(damage: WeaponDamageAmount): string {
  switch (damage.kind) {
    case 'dice':
      return damage.dice;
    case 'flat':
      return String(damage.amount);
    case 'custom':
      return damage.text;
  }
}
