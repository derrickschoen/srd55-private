import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
} from 'drizzle-orm/sqlite-core';
import type { EncounterSessionId } from '../../src/combat/values';
import { integerAtLeast, varchar } from './columns';

/**
 * Browser-authoritative append-only VTT revision stream. Snapshots inside each
 * payload are recovery material for one log revision; the row stream remains
 * the authority and is retained by whole-database backup/export.
 */
export const vtt_session_revisions = sqliteTable(
  'vtt_session_revisions',
  {
    session_id: varchar<EncounterSessionId>()('session_id').notNull(),
    revision: integer('revision').notNull(),
    schema_version: integer('schema_version').notNull(),
    payload_json: varchar()('payload_json').notNull(),
    payload_checksum: varchar()('payload_checksum').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'vtt_session_revisions_primary',
      columns: [table.session_id, table.revision],
    }),
    check(
      'vtt_session_revisions_session_id_check',
      sql`length(${table.session_id}) > 0`,
    ),
    check(
      'vtt_session_revisions_revision_check',
      integerAtLeast('revision', 1),
    ),
    check(
      'vtt_session_revisions_schema_version_check',
      sql`${table.schema_version} IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)`,
    ),
    check(
      'vtt_session_revisions_payload_json_check',
      sql`json_valid(${table.payload_json})`,
    ),
    check(
      'vtt_session_revisions_payload_checksum_check',
      sql`length(${table.payload_checksum}) = 64
        AND ${table.payload_checksum} NOT GLOB '*[^0-9a-f]*'`,
    ),
  ],
);
