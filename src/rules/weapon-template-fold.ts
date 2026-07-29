import type {
  SrdWeaponGroup,
  WeaponAttackKind,
  WeaponProficiencyCategory,
} from '../domain/enums';

/**
 * THE ONE PLACE A TEMPLATE'S `srd_group` BECOMES CHARACTER-ROW VALUES.
 *
 * These two folds lived in `src/ui/screens/planner/weapons.ts` while the
 * picker was their only caller. The equipment mint
 * (`src/grants/equipment-grants.ts`) is a second caller that runs inside the
 * worker with no DOM, so the folds moved to this extract-free, DOM-free module
 * on the `origin-rules-edition.ts` precedent; the planner re-exports them so
 * every existing importer keeps working. Writing a second fold instead would
 * have been the drift `weaponProficiencyCategoryOf`'s own comment warns about
 * — two folds are one edit away from disagreeing about a Rogue's Greatsword.
 */

/** Preserve the melee/ranged half of a template heading on the value copy. */
export function weaponAttackKindOf(group: SrdWeaponGroup): WeaponAttackKind {
  switch (group) {
    case 'simple_melee':
    case 'martial_melee':
      return 'melee';
    case 'simple_ranged':
    case 'martial_ranged':
      return 'ranged';
  }
}

/**
 * The source's four table headings folded onto the two categories a class can
 * grant proficiency in — D27, and THE ONE PLACE THE FOLD HAPPENS.
 *
 * NO `default` ARM, deliberately. A fifth `srd_group` — an imported catalog
 * heading, a future edition — is a COMPILE ERROR here rather than a weapon
 * that silently arrives with no category and reads as "we cannot check this
 * one". That is the difference between a gap the type system made someone
 * decide about and a gap nobody noticed.
 */
export function weaponProficiencyCategoryOf(
  group: SrdWeaponGroup,
): WeaponProficiencyCategory {
  switch (group) {
    case 'simple_melee':
    case 'simple_ranged':
      return 'simple';
    case 'martial_melee':
    case 'martial_ranged':
      return 'martial';
  }
}
