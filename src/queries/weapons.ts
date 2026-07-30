import {
  sqlBoolean,
  sqlNullableDamageType,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  sqlVersatileWeaponDamage,
  sqlWeaponDamage,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  isEnumValue,
  srdWeaponGroups,
  weaponAttackKinds,
  weaponMasteryProperties,
  weaponProficiencyCategories,
  type WeaponAttackKind,
  type SrdWeaponGroup,
  type WeaponMasteryProperty,
  type WeaponProficiencyCategory,
} from '../domain/enums';
import type {
  CharacterWeapon,
  WeaponProfile,
  WeaponsPanel,
  WeaponTemplate,
} from '../domain/read-models';
import {
  isWeaponRangeKind,
  weaponRangeFromStorage,
} from '../domain/weapon-range';
import type { SpellAccessRoute } from '../access/spell-access-builder';
import type { AbilityScores } from '../rules/ability-scores';
import { attackProfiles } from '../rules/attack-profiles';
import { recogniseAttackCantrips } from '../rules/attack-cantrips';
import { readEligibleWeaponEffects } from '../rules/eligible-character-effects';
import { weaponProficiency } from '../rules/multiclass-proficiency';
import { SheetContentLookup } from '../rules/sheet-content-lookup';
import { WeaponMasteryLookup } from '../rules/weapon-mastery-lookup';
import { ClassProficiencyLookup } from './class-proficiency-lookup';

/**
 * The three things the attack derivation needs that are NOT weapon rows.
 *
 * They are passed IN rather than read here, and the reason is one number on one
 * screen: `proficiency_bonus` and `scores` are already resolved by
 * `BuildReportBuilder` for the spell math, and a second resolution here could
 * differ from it. A class-less character now carries `null` through both
 * derivations; a sheet printing a guessed spell attack beside a withheld weapon
 * attack would be this application arguing with itself in front of the user.
 */
export interface WeaponPanelContext {
  readonly routes: readonly SpellAccessRoute[];
  readonly scores: AbilityScores;
  readonly proficiency_bonus: number | null;
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
  'damage_kind',
  'damage_dice',
  'damage_flat',
  'damage_custom',
  'damage_type',
  'versatile_damage_kind',
  'versatile_damage_dice',
  'versatile_damage_flat',
  'versatile_damage_custom',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
  'ammunition_kind',
  'range_kind',
  'range_near_feet',
  'range_far_feet',
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

/**
 * An unrecognised stored proficiency category reads as NOT STATED.
 *
 * The same argument `masteryProperty` above makes, with a sharper consequence:
 * substituting `simple` would tell a Wizard they are proficient with a weapon
 * nobody recorded a category for, which is precisely the wrong number D27 exists
 * to stop. Null is the state the sheet already knows how to say out loud.
 */
function proficiencyCategory(row: SqlRow): WeaponProficiencyCategory | null {
  const value = sqlNullableString(row, 'proficiency_category');
  return isEnumValue(weaponProficiencyCategories, value) ? value : null;
}

function attackKind(row: SqlRow): WeaponAttackKind | null {
  const value = sqlNullableString(row, 'attack_kind');
  return isEnumValue(weaponAttackKinds, value) ? value : null;
}

function weaponProfile(row: SqlRow): WeaponProfile {
  const rangeKind = sqlString(row, 'range_kind');
  if (!isWeaponRangeKind(rangeKind)) {
    throw new TypeError(`Unknown weapon range kind "${rangeKind}".`);
  }
  return {
    name: sqlString(row, 'name'),
    damage: sqlWeaponDamage(row),
    damage_type: sqlNullableDamageType(row, 'damage_type'),
    versatile_damage: sqlVersatileWeaponDamage(row),
    finesse: sqlBoolean(row, 'finesse'),
    heavy: sqlBoolean(row, 'heavy'),
    light: sqlBoolean(row, 'light'),
    loading: sqlBoolean(row, 'loading'),
    reach: sqlBoolean(row, 'reach'),
    thrown: sqlBoolean(row, 'thrown'),
    two_handed: sqlBoolean(row, 'two_handed'),
    ammunition: sqlBoolean(row, 'ammunition'),
    ammunition_kind: sqlNullableString(row, 'ammunition_kind'),
    range: weaponRangeFromStorage(
      rangeKind,
      sqlNullableInteger(row, 'range_near_feet'),
      sqlNullableInteger(row, 'range_far_feet'),
    ),
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
      `SELECT id, ${PROFILE_COLUMNS.join(', ')}, proficiency_category,
              attack_kind, notes,
              mastery_selected
       FROM character_weapons
       WHERE character_id = ?
       ORDER BY id`,
      [characterId],
      (row): CharacterWeapon => ({
        id: sqlInteger(row, 'id'),
        ...weaponProfile(row),
        // D27's column, read HERE and not in `weaponProfile`: the profile is the
        // set of columns the catalog and the character share, and this one is
        // the character's alone. `weapon_templates` has no such column, so
        // reading it there would be a SELECT of a column that does not exist.
        proficiency_category: proficiencyCategory(row),
        attack_kind: attackKind(row),
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
    // THE PROFICIENCY UNION, THROUGH THE SAME LOOKUP THE CHARACTER SHEET USES.
    // D28 §1: what a non-proficient weapon loses is the BONUS, and it is lost
    // HERE, on the number, rather than only described on the other screen. Until
    // this line existed the two screens printed opposite things about one
    // weapon — the sheet said "not proficient" and this profile added the bonus.
    const { grants } = new ClassProficiencyLookup(this.db).grantsFor(
      characterId,
    );
    return attackProfiles({
      weapons: weapons.map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        damage: weapon.damage,
        damage_type: weapon.damage_type,
        versatile_damage: weapon.versatile_damage,
        // The three columns a proficiency question reads and nothing else: the
        // narrow `ProficiencyWeapon` shape is what stops this path guessing a
        // category from a damage die or a name.
        proficiency: weaponProficiency(
          {
            name: weapon.name,
            proficiency_category: weapon.proficiency_category,
            finesse: weapon.finesse,
            light: weapon.light,
          },
          grants,
        ),
      })),
      classes: this.#content.forCharacter(characterId),
      scores: context.scores,
      proficiencyBonus: context.proficiency_bonus,
      cantrips: recogniseAttackCantrips(context.routes),
      effects: readEligibleWeaponEffects(this.db, characterId, 'display'),
    });
  }
}
