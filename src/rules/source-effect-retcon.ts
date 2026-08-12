import type { DatabaseContext } from '../db/database';

/**
 * Remove every mechanical effect owned by a source or a granted descendant.
 * Callers already own the command transaction, so source state and all
 * affected sheet numbers cross the retcon boundary atomically.
 */
export function deleteSourceTreeEffects(
  db: DatabaseContext,
  sourceInstanceId: number,
): void {
  db.exec(
    `WITH RECURSIVE source_tree(id) AS (
       SELECT id FROM character_source_instances WHERE id = ?
       UNION
       SELECT child.id
       FROM character_source_instances AS child
       INNER JOIN source_tree AS parent
         ON child.parent_source_instance_id = parent.id
     )
     DELETE FROM character_effects
     WHERE source_instance_id IN (SELECT id FROM source_tree)`,
    [sourceInstanceId],
  );
}
