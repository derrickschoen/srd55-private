/**
 * THE READER THE SHEET CORE WAS MISSING.
 *
 * `class_extra_attack_grants` and `class_martial_arts_dice` have been written
 * by `src/rules/sheet-srd.ts` since the sheet core merged, and until now
 * NOTHING OUTSIDE THE TESTS READ THEM — commit f9ed1b5 says so in its subject.
 * `attacksPerAction` and `martialArtsDice` are pure functions over maps, and
 * this is the class that fills those maps from the database.
 *
 * It is deliberately shaped like `WeaponMasteryLookup`: a small class over a
 * `DatabaseContext`, one method per question, no caching, no state. What it
 * does NOT share is that module's four-state allowance, because the questions
 * are different. An absent grant row here is a SOURCED FACT — a Wizard has no
 * Extra Attack and no Martial Arts die, and the source says so by printing
 * neither — where an absent mastery row could equally mean an unseeded
 * database. An empty map therefore reads as "this class grants none", and
 * `attacksPerAction` correctly answers 1.
 *
 * NOTHING HERE IS STORED, AND NOTHING HERE IS DERIVED EITHER. It is a read.
 */
import { sqlInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { SheetClassLevels } from './sheet';

/** A character's class levels, joined to the per-level content of each class. */
export interface SheetClassContent extends SheetClassLevels {
  readonly class_definition_id: number;
}

export class SheetContentLookup {
  constructor(private readonly db: DatabaseContext) {}

  /**
   * Level -> total attacks on the Attack action, for one class.
   *
   * ABSOLUTE TOTALS, never increments — the column stores what the source
   * prints — so the map is handed to `attacksPerAction` unchanged and that
   * function resolves the greatest granting level at or below the character's.
   */
  extraAttackCounts(classDefinitionId: number): ReadonlyMap<number, number> {
    return this.levelKeyedContent(
      'class_extra_attack_grants',
      'attack_count',
      classDefinitionId,
    );
  }

  /** Level -> Martial Arts die SIZE, for one class. `8` means `1d8`. */
  martialArtsDice(classDefinitionId: number): ReadonlyMap<number, number> {
    return this.levelKeyedContent(
      'class_martial_arts_dice',
      'martial_arts_die',
      classDefinitionId,
    );
  }

  private levelKeyedContent(
    table: 'class_extra_attack_grants' | 'class_martial_arts_dice',
    column: 'attack_count' | 'martial_arts_die',
    classDefinitionId: number,
  ): ReadonlyMap<number, number> {
    // The table and column names are a closed union of literals, never a
    // caller's string, so the interpolation cannot carry anything a user typed.
    const rows = this.db.all(
      `SELECT class_level, ${column} AS value
       FROM ${table}
       WHERE class_definition_id = ?
       ORDER BY class_level`,
      [classDefinitionId],
      (row) => ({
        level: sqlInteger(row, 'class_level'),
        value: sqlInteger(row, 'value'),
      }),
    );
    return new Map(rows.map((row) => [row.level, row.value]));
  }

  /**
   * Every class the character has levels in, each carrying its own content.
   *
   * ORDERED BY CLASS NAME then row id, matching `CharacterWorkspaceBuilder`'s
   * own class query, so a sheet and a planner list the same classes in the same
   * order.
   */
  forCharacter(characterId: number): readonly SheetClassContent[] {
    const classes = this.db.all(
      `SELECT level.class_definition_id AS class_definition_id,
              level.level AS class_level,
              definition.name AS class_name
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       WHERE level.character_id = ?
       ORDER BY definition.name, level.id`,
      [characterId],
      (row) => ({
        class_definition_id: sqlInteger(row, 'class_definition_id'),
        class_name: sqlString(row, 'class_name'),
        level: sqlInteger(row, 'class_level'),
      }),
    );

    return classes.map(
      (entry): SheetClassContent => ({
        ...entry,
        extra_attack_counts: this.extraAttackCounts(entry.class_definition_id),
        martial_arts_dice: this.martialArtsDice(entry.class_definition_id),
      }),
    );
  }
}
