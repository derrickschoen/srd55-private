/**
 * WHO GRANTED WHAT — READ ONCE, FOR EVERY SCREEN THAT ASKS.
 *
 * Two screens now ask the same question about the same character. The character
 * SHEET prints the union and a per-weapon verdict; the planner's weapons panel
 * needs the verdict to decide whether an attack profile may add the proficiency
 * bonus (D28 §1). Before this file existed only the sheet asked, and the answer
 * lived inside `CharacterSheetBuilder` where nothing else could reach it.
 *
 * ONE READER, NOT TWO, AND THE ORDER IS PART OF THE ANSWER. `startingClass`
 * degrades by PICKING — a character with no `is_starting_class` flagged still
 * gets a full Core Traits row from exactly one class, and which one depends on
 * the order the class rows arrive in. So the class query here is the SAME query,
 * with the same `ORDER BY definition.name, level.id`, that
 * `CharacterSheetBuilder#classes` uses. Two readers that ordered differently
 * would give a degraded character a Greatsword bonus on one screen and withhold
 * it on the other, which is the exact disagreement this whole change exists to
 * remove. `tests/integration/queries/weapon-proficiency-agreement.test.ts` is
 * what stops that drifting back.
 *
 * NOTHING HERE IS STORED. It is a read, in the shape `SheetContentLookup`
 * already established: a small class over a `DatabaseContext`, one method per
 * question, no caching and no state.
 */
import { sqlBoolean, sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { ArmorCategory } from '../domain/enums';
import {
  armorCategories,
  isEnumValue,
  weaponProficiencyCategories,
} from '../domain/enums';
import {
  classProficiencyGrants,
  type ClassGrantRow,
  type ClassProficiencyGrant,
  type ClassProficiencySources,
  type ClassWeaponProficiency,
  type SheetWarning,
} from '../rules/sheet';

/**
 * What a class with no seeded sheet content grants: NOTHING.
 *
 * NOT a guess and not a placeholder. A homebrew or imported class has no
 * `class_armor_training` and no `class_weapon_proficiencies` rows, so it grants
 * no proficiency — and the honest consequence is that a character whose only
 * class is that one is told every weapon is unchecked. Substituting "simple
 * weapons, like most classes" here would be the `?? 8` failure D24 records, in a
 * place where the invented value silently adds a proficiency bonus.
 */
export const EMPTY_CLASS_PROFICIENCIES: ClassProficiencySources = Object.freeze({
  armor_training: Object.freeze([]),
  weapon_proficiencies: Object.freeze([]),
});

export class ClassProficiencyLookup {
  constructor(private readonly db: DatabaseContext) {}

  /**
   * Every class's grant ROWS, keyed by class definition id.
   *
   * ONE ROW LIST PER CLASS WITH A FLAG ON EACH ROW, which is the shape
   * `ClassProficiencySources` now has and the reason the entry set cannot name
   * a category the initial set does not: there is one row per (class, category),
   * and `on_entry` decides whether a multiclass entry gets it too. A category
   * the class is not trained in has no row at all.
   */
  sources(characterId: number): ReadonlyMap<number, ClassProficiencySources> {
    const found = new Map<
      number,
      {
        armor: ClassGrantRow<ArmorCategory>[];
        weapons: ClassGrantRow<ClassWeaponProficiency>[];
      }
    >();
    const bucket = (classDefinitionId: number) => {
      const existing = found.get(classDefinitionId);
      if (existing !== undefined) {
        return existing;
      }
      const fresh = {
        armor: [] as ClassGrantRow<ArmorCategory>[],
        weapons: [] as ClassGrantRow<ClassWeaponProficiency>[],
      };
      found.set(classDefinitionId, fresh);
      return fresh;
    };

    for (const row of this.db.all(
      `SELECT training.class_definition_id AS class_definition_id,
              training.category AS category,
              training.granted_on_multiclass_entry AS on_entry
       FROM class_armor_training AS training
       WHERE training.class_definition_id IN (
               SELECT class_definition_id FROM character_class_levels
                WHERE character_id = ?)
       ORDER BY training.category`,
      [characterId],
      (entry) => ({
        class_definition_id: sqlInteger(entry, 'class_definition_id'),
        category: sqlString(entry, 'category'),
        on_entry: sqlBoolean(entry, 'on_entry'),
      }),
    )) {
      // A stored category outside the vocabulary is DROPPED rather than
      // substituted. An armour ROW the character wears must still produce a
      // number, so its enum degrades to a stated approximation; a catalog GRANT
      // that is not a category grants nothing, and inventing `light` for it
      // would hand somebody a training they were never given.
      if (!isEnumValue(armorCategories, row.category)) {
        continue;
      }
      bucket(row.class_definition_id).armor.push({
        grant: row.category,
        on_entry: row.on_entry,
      });
    }

    for (const row of this.db.all(
      `SELECT proficiency.class_definition_id AS class_definition_id,
              proficiency.category AS category,
              proficiency.property_qualifier AS property_qualifier,
              proficiency.granted_on_multiclass_entry AS on_entry
       FROM class_weapon_proficiencies AS proficiency
       WHERE proficiency.class_definition_id IN (
               SELECT class_definition_id FROM character_class_levels
                WHERE character_id = ?)
       ORDER BY proficiency.category`,
      [characterId],
      (entry) => ({
        class_definition_id: sqlInteger(entry, 'class_definition_id'),
        category: sqlString(entry, 'category'),
        property_qualifier: sqlNullableString(entry, 'property_qualifier'),
        on_entry: sqlBoolean(entry, 'on_entry'),
      }),
    )) {
      if (!isEnumValue(weaponProficiencyCategories, row.category)) {
        continue;
      }
      bucket(row.class_definition_id).weapons.push({
        grant: {
          category: row.category,
          property_qualifier: row.property_qualifier,
        },
        on_entry: row.on_entry,
      });
    }

    return new Map(
      [...found].map(([classDefinitionId, entry]) => [
        classDefinitionId,
        {
          armor_training: entry.armor,
          weapon_proficiencies: entry.weapons,
        } satisfies ClassProficiencySources,
      ]),
    );
  }

  /**
   * What each of the character's classes ACTUALLY GAVE THEM, resolved.
   *
   * For callers that hold no `SheetClass` — the weapons panel holds a weapon
   * list and an ability-score array and has no business inventing a hit die or a
   * saving-throw list to ask this question. The resolution itself is still
   * `classProficiencyGrants`; this method only supplies its rows.
   */
  grantsFor(characterId: number): {
    readonly grants: readonly ClassProficiencyGrant[];
    readonly warnings: readonly SheetWarning[];
  } {
    const sources = this.sources(characterId);
    const classes = this.db.all(
      `SELECT level.class_definition_id AS class_definition_id,
              level.is_starting_class AS is_starting_class,
              definition.name AS class_name
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       WHERE level.character_id = ?
       ORDER BY definition.name, level.id`,
      [characterId],
      (row) => ({
        class_name: sqlString(row, 'class_name'),
        is_starting_class: sqlBoolean(row, 'is_starting_class'),
        proficiencies:
          sources.get(sqlInteger(row, 'class_definition_id')) ??
          EMPTY_CLASS_PROFICIENCIES,
      }),
    );
    return classProficiencyGrants(classes);
  }
}
