import type { Database } from '@sqlite.org/sqlite-wasm';
import { describe, expect, it } from 'vitest';
import schema from '../../../src/db/schema.sql?raw';
import {
  databaseSchemaSignature,
} from '../../../src/db/database-lifecycle';
import {
  DATABASE_MIGRATIONS,
  databaseSchemaChecksum,
} from '../../../src/db/migrations';
import { getSqlite3 } from '../../helpers/open-db';

function schemaSignature(db: Database): string {
  return databaseSchemaSignature(db);
}

describe('VTT hidden-roll session migration', () => {
  it('preserves v5 revisions and admits v6 revisions through the full chain', async () => {
    const sqlite3 = await getSqlite3();
    const migrationIndex = DATABASE_MIGRATIONS.findIndex(
      (entry) => entry.id === '0057_vtt_session_hidden_rolls',
    );
    const migration = DATABASE_MIGRATIONS[migrationIndex];
    if (migration === undefined) {
      throw new Error('Missing 0057_vtt_session_hidden_rolls migration.');
    }
    // The table's last shipped shape is the one 0067 leaves: 0068 drops it (owner D948).
    const dropIndex = DATABASE_MIGRATIONS.findIndex(
      (entry) => entry.id === '0068_drop_vtt_session_revisions',
    );
    const lastShapingMigration = DATABASE_MIGRATIONS[dropIndex - 1];
    const latestMigration = DATABASE_MIGRATIONS.at(-1);
    if (dropIndex < 0 || lastShapingMigration === undefined || latestMigration === undefined) {
      throw new Error('Missing database migrations.');
    }

    const db = new sqlite3.oo1.DB(':memory:', 'c');
    const fresh = new sqlite3.oo1.DB(':memory:', 'c');
    try {
      db.exec(DATABASE_MIGRATIONS
        .slice(0, migrationIndex)
        .map((entry) => entry.sql)
        .join('\n'));
      db.exec(`
        INSERT INTO vtt_session_revisions (
          session_id, revision, schema_version, payload_json, payload_checksum
        ) VALUES (
          'session:hidden-rolls-survivor', 1, 5, '{"state":"kept"}',
          '${'ab'.repeat(32)}'
        )
      `);

      db.exec(DATABASE_MIGRATIONS
        .slice(migrationIndex, dropIndex)
        .map((entry) => entry.sql)
        .join('\n'));

      expect(db.selectObjects(
        `SELECT session_id, revision, schema_version, payload_json, payload_checksum
         FROM vtt_session_revisions`,
      )).toEqual([{
        session_id: 'session:hidden-rolls-survivor',
        revision: 1,
        schema_version: 5,
        payload_json: '{"state":"kept"}',
        payload_checksum: 'ab'.repeat(32),
      }]);
      db.exec(`
        INSERT INTO vtt_session_revisions (
          session_id, revision, schema_version, payload_json, payload_checksum
        ) VALUES (
          'session:hidden-rolls', 1, 6, '{"hiddenRolls":["death_saves"]}',
          '${'cd'.repeat(32)}'
        )
      `);

      fresh.exec(DATABASE_MIGRATIONS
        .slice(0, dropIndex)
        .map((entry) => entry.sql)
        .join('\n'));
      expect(schemaSignature(db)).toBe(schemaSignature(fresh));
      expect(databaseSchemaChecksum(schemaSignature(db))).toBe(
        lastShapingMigration.resultSchemaChecksum,
      );

      // The rest of the chain reaches the fresh schema.
      db.exec(DATABASE_MIGRATIONS
        .slice(dropIndex)
        .map((entry) => entry.sql)
        .join('\n'));
      const current = new sqlite3.oo1.DB(':memory:', 'c');
      try {
        current.exec(schema);
        expect(schemaSignature(db)).toBe(schemaSignature(current));
      } finally {
        current.close();
      }
      expect(databaseSchemaChecksum(schemaSignature(db))).toBe(
        latestMigration.resultSchemaChecksum,
      );
    } finally {
      db.close();
      fresh.close();
    }
  });
});
