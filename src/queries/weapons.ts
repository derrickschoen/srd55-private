import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  isEnumValue,
  srdWeaponGroups,
  weaponMasteryProperties,
  type SrdWeaponGroup,
  type WeaponMasteryProperty,
} from '../domain/enums';
import type {
  CharacterWeapon,
  WeaponProfile,
  WeaponsPanel,
  WeaponTemplate,
} from '../domain/read-models';
import type { SpellAccessRoute } from '../access/spell-access-builder';
import type { AbilityScores } from '../rules/ability-scores';
import { attackProfiles } from '../rules/attack-profiles';
import { recogniseAttackCantrips } from '../rules/attack-cantrips';
import { SheetContentLookup } from '../rules/sheet-content-lookup';
import { WeaponMasteryLookup } from '../rules/weapon-mastery-lookup';

/**
 * The three things the attack derivation needs that are NOT weapon rows.
 *
 * They are passed IN rather than read here, and the reason is one number on one
 * screen: `proficiency_bonus` and `scores` are already resolved by
 * `BuildReportBuilder` for the spell math, and a second resolution here could
 * differ from it — `proficiencyBonus(0)` and `sheetProficiencyBonus([])`
 * genuinely disagree for a character with no classes. A sheet printing +1 for a
 * spell attack and +2 for a weapon attack would be this application arguing
 * with itself in front of the user.
 */
export interface WeaponPanelContext {
  readonly routes: readonly SpellAccessRoute[];
  readonly scores: AbilityScores;
  readonly proficiency_bonus: number;
}

/**
 * Reads for the weapons panel.
 *
 * The two row readers below share `weaponProfile`, which is the read-side half
 * of the invariant `db/schema/weapons.ts` states: the catalog's fillable
 * columns and the character weapon's fillable columns are the same columns. If
 * they ever diverge, this function stops compiling for one of its two callers.
 */

const PROFILE_COLUMNS = [
  'name',
  'damage_dice',
  'damage_type',
  'versatile_damage_dice',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
  'ammunition_kind',
  'range_normal_feet',
  'range_long_feet',
  'mastery_property',
  'other_properties',
] as const;

/**
 * An unrecognised stored mastery property reads as "none".
 *
 * Not a silent repair: the row is user-owned data written by this application
 * through a validated command, so the only way to hold one is to have edited
 * the database by hand. Surfacing it as a null keeps the read total and cannot
 * synthesise a mastery the character does not have.
 */
function masteryProperty(row: SqlRow): WeaponMasteryProperty | null {
  const value = sqlNullableString(row, 'mastery_property');
  return isEnumValue(weaponMasteryProperties, value) ? value : null;
}

function weaponProfile(row: SqlRow): WeaponProfile {
  return {
    name: sqlString(row, 'name'),
    damage_dice: sqlNullableString(row, 'damage_dice'),
    damage_type: sqlNullableString(row, 'damage_type'),
    versatile_damage_dice: sqlNullableString(row, 'versatile_damage_dice'),
    finesse: sqlBoolean(row, 'finesse'),
    heavy: sqlBoolean(row, 'heavy'),
    light: sqlBoolean(row, 'light'),
    loading: sqlBoolean(row, 'loading'),
    reach: sqlBoolean(row, 'reach'),
    thrown: sqlBoolean(row, 'thrown'),
    two_handed: sqlBoolean(row, 'two_handed'),
    ammunition: sqlBoolean(row, 'ammunition'),
    ammunition_kind: sqlNullableString(row, 'ammunition_kind'),
    range_normal_feet: sqlNullableInteger(row, 'range_normal_feet'),
    range_long_feet: sqlNullableInteger(row, 'range_long_feet'),
    mastery_property: masteryProperty(row),
    other_properties: sqlNullableString(row, 'other_properties'),
  };
}

export class WeaponQueries {
  readonly #mastery: WeaponMasteryLookup;
  readonly #content: SheetContentLookup;

  constructor(private readonly db: DatabaseContext) {
    this.#mastery = new WeaponMasteryLookup(db);
    this.#content = new SheetContentLookup(db);
  }

  /** A character's weapons, ordered by id — the order they were added. */
  characterWeapons(characterId: number): CharacterWeapon[] {
    return this.db.all(
      `SELECT id, ${PROFILE_COLUMNS.join(', ')}, notes, mastery_selected
       FROM character_weapons
       WHERE character_id = ?
       ORDER BY id`,
      [characterId],
      (row): CharacterWeapon => ({
        id: sqlInteger(row, 'id'),
        ...weaponProfile(row),
        notes: sqlNullableString(row, 'notes'),
        mastery_selected: sqlBoolean(row, 'mastery_selected'),
      }),
    );
  }

  /**
   * The whole catalog, grouped and ordered the way the source's own table is.
   *
   * The CASE is not decoration: ordering by `srd_group` alphabetically gives
   * Martial before Simple, which is neither the source's order nor the order a
   * reader expects. Ordering by an explicit rank keeps the picker's four
   * headings in the printed order and stays independent of the order the
   * seeder happened to insert rows in.
   */
  templates(): WeaponTemplate[] {
    return this.db.all(
      `SELECT id, content_key, srd_group, ${PROFILE_COLUMNS.join(', ')}
       FROM weapon_templates
       ORDER BY CASE srd_group
                  WHEN 'simple_melee' THEN 1
                  WHEN 'simple_ranged' THEN 2
                  WHEN 'martial_melee' THEN 3
                  WHEN 'martial_ranged' THEN 4
                  ELSE 5
                END,
                name`,
      undefined,
      (row): WeaponTemplate => {
        const group = sqlString(row, 'srd_group');
        if (!isEnumValue(srdWeaponGroups, group)) {
          throw new Error(`Unknown weapon group '${group}'.`);
        }
        return {
          id: sqlInteger(row, 'id'),
          content_key: sqlString(row, 'content_key'),
          srd_group: group as SrdWeaponGroup,
          ...weaponProfile(row),
        };
      },
    );
  }

  panel(characterId: number, context: WeaponPanelContext): WeaponsPanel {
    const weapons = this.characterWeapons(characterId);
    return {
      weapons,
      templates: this.templates(),
      allowance: this.#mastery.forCharacter(characterId),
      selected_count: weapons.filter((weapon) => weapon.mastery_selected)
        .length,
      attacks: this.attacks(characterId, weapons, context),
    };
  }

  /**
   * The attack profiles, derived and thrown away with the rest of the read.
   *
   * The weapon rows are handed in rather than re-read so the profiles and the
   * list they sit under cannot describe two different sets of weapons within
   * one panel.
   */
  attacks(
    characterId: number,
    weapons: readonly CharacterWeapon[],
    context: WeaponPanelContext,
  ): WeaponsPanel['attacks'] {
    return attackProfiles({
      weapons: weapons.map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        damage_dice: weapon.damage_dice,
        damage_type: weapon.damage_type,
        versatile_damage_dice: weapon.versatile_damage_dice,
      })),
      classes: this.#content.forCharacter(characterId),
      scores: context.scores,
      proficiencyBonus: context.proficiency_bonus,
      cantrips: recogniseAttackCantrips(context.routes),
    });
  }
}
