export type LegacyWeaponDamageColumn =
  | 'damage_dice'
  | 'versatile_damage_dice';

/** A pre-discriminator weapon row carries a non-text damage value. */
export class LegacyWeaponDamageColumnTypeError extends TypeError {
  override readonly name = 'LegacyWeaponDamageColumnTypeError' as const;

  constructor(readonly column: LegacyWeaponDamageColumn) {
    super(`Legacy weapon row ${column} must be a string or null.`);
  }
}
