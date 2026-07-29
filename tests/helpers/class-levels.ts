import type { DatabaseContext } from '../../src/db/database';
import { GrantRuleSlotGenerator } from '../../src/grants/grant-rule-slot-generator';

/**
 * FIXTURE-ONLY LEVEL RAISE.
 *
 * `update_class` no longer moves a level (straight-class level-up plan §3),
 * and the one levelling path — `level_up_class` — demands the per-level
 * hit-point record, the subclass choice at 3 and the ASI at the seeded
 * levels, which is exactly what its four guards exist for. Fixtures whose
 * SUBJECT is something else (skill grants, spell slots, completeness,
 * subclass provenance) still need "a Fighter 5" in one line, so this writes
 * the level row directly and regenerates the class source's grants — the
 * same rows a completed sequence of level-ups leaves behind, minus the
 * hit-point records, which these subjects do not read.
 *
 * PRODUCTION CODE MUST NEVER DO THIS: a level that moves without its
 * hit-point row is §1's bug. A test that wants to prove levelling itself
 * uses `level_up_class` and pays its obligations.
 */
export function raiseClassLevelForTest(
  db: DatabaseContext,
  characterId: number,
  classDefinitionId: number,
  level: number,
): void {
  const updated = db.exec(
    `UPDATE character_class_levels
     SET level = ?
     WHERE character_id = ? AND class_definition_id = ?`,
    [level, characterId, classDefinitionId],
  );
  if (updated.changes === 0) {
    throw new Error(
      'raiseClassLevelForTest: the character does not have that class; ' +
        'enter it through update_class first.',
    );
  }
  const className = db.scalar<string>(
    'SELECT name FROM class_definitions WHERE id = ?',
    [classDefinitionId],
  );
  const sourceId = db.scalar<number>(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'class'
       AND source_definition_id = ?
     LIMIT 1`,
    [characterId, classDefinitionId],
  );
  if (sourceId !== null) {
    db.exec(
      `UPDATE character_source_instances
       SET display_name = ?
       WHERE id = ?`,
      [`${String(className)} ${String(level)}`, Number(sourceId)],
    );
    new GrantRuleSlotGenerator(db).generateForSource(Number(sourceId));
  }
}
