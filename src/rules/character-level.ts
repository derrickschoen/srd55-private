import type { DatabaseContext } from '../db/database';
import { sqlInteger } from '../db/codecs';

export interface CharacterLevelOptions {
  readonly excludingClassDefinitionId?: number;
}

function isClassLevelList(
  source: DatabaseContext | readonly number[],
): source is readonly number[] {
  return Array.isArray(source);
}

/**
 * A character's total level, with the absence of every class row preserved.
 *
 * The array overload exists for boundaries that have decoded class rows but no
 * database yet (the share validator). Both paths end in this function so the
 * empty-set meaning and the multiclass sum cannot drift.
 */
export function characterLevel(
  db: DatabaseContext,
  characterId: number,
  options?: CharacterLevelOptions,
): number | null;
export function characterLevel(classLevels: readonly number[]): number | null;
export function characterLevel(
  source: DatabaseContext | readonly number[],
  characterId?: number,
  options: CharacterLevelOptions = {},
): number | null {
  if (isClassLevelList(source)) {
    return source.length === 0
      ? null
      : source.reduce((total, level) => total + level, 0);
  }

  if (characterId === undefined) {
    throw new TypeError('A character id is required for a database level read.');
  }

  const excludedClassDefinitionId =
    options.excludingClassDefinitionId;
  const levels = excludedClassDefinitionId === undefined
    ? source.all(
        `SELECT level
         FROM character_class_levels
         WHERE character_id = ?
         ORDER BY id`,
        [characterId],
        (row) => sqlInteger(row, 'level'),
      )
    : source.all(
        `SELECT level
         FROM character_class_levels
         WHERE character_id = ? AND class_definition_id != ?
         ORDER BY id`,
        [characterId, excludedClassDefinitionId],
        (row) => sqlInteger(row, 'level'),
      );
  return characterLevel(levels);
}
