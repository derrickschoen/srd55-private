import type { DatabaseContext } from '../db/database';

const LINEAGE_DELETE_GUARD =
  'catalog_content_supersessions_refuse_delete_before_delete';

/**
 * The one seam allowed to suspend 0039's lineage-delete guard.
 *
 * Callers must already own the outermost EXCLUSIVE transaction. Keeping the
 * transaction boundary at the caller lets both catalog-data migration and the
 * permanent archive purge include their surrounding writes and final FK check
 * in the same atomic unit. The exact installed trigger is restored in `finally`;
 * a later failure still rolls the entire outer transaction back.
 */
export function withCatalogLineageDeleteGuardSuspended<T>(
  db: DatabaseContext,
  operation: () => T,
): T {
  if (db.transactionDepth !== 1) {
    throw new Error(
      'Catalog lineage deletion requires one outermost transaction.',
    );
  }
  const guardSql = db.scalar<string>(
    `SELECT sql FROM sqlite_schema
      WHERE type = 'trigger' AND name = ?`,
    [LINEAGE_DELETE_GUARD],
  );
  if (guardSql === null) {
    throw new Error('Catalog supersession delete guard is missing.');
  }

  db.exec(`DROP TRIGGER ${LINEAGE_DELETE_GUARD}`);
  try {
    return operation();
  } finally {
    db.exec(guardSql);
  }
}
