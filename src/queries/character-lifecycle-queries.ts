/**
 * Authoritative list query shapes for the character lifecycle.
 *
 * AR-B's active and archived list builders must import these constants so the
 * query-plan coverage cannot drift away from the production ordering.
 */
export const ACTIVE_CHARACTER_LIST_QUERY = `SELECT id, name FROM characters
WHERE archived_at IS NULL
ORDER BY name, id`;

export const ARCHIVED_CHARACTER_LIST_QUERY = `SELECT id, name, archived_at FROM characters
WHERE archived_at IS NOT NULL
ORDER BY archived_at DESC, name, id`;
