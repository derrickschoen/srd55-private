import sqlite3InitModule, {
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import schema from '../src/db/schema.sql?raw';
import { prepareConnection } from '../src/db/database';
import { databaseSchemaSignature } from '../src/db/database-lifecycle';
import {
  applyMigrationSuffix,
  DATABASE_MIGRATIONS,
  databaseSchemaChecksum,
  validateMigrationRegistry,
} from '../src/db/migrations';

export interface MigrationVerification {
  readonly migrationCount: number;
  readonly signature: string;
}

/**
 * Executes the shipped chain from empty and compares its exact sqlite_schema
 * signature with an independently-created `schema.sql` database.
 */
export async function verifyMigrations(
  sqlite3?: Sqlite3Static,
): Promise<MigrationVerification> {
  const sqlite = sqlite3 ?? (await sqlite3InitModule());
  validateMigrationRegistry(DATABASE_MIGRATIONS);

  const fresh = new sqlite.oo1.DB(':memory:', 'c');
  const migrated = new sqlite.oo1.DB(':memory:', 'c');
  try {
    fresh.exec(schema);
    const expectedSignature = databaseSchemaSignature(fresh);

    prepareConnection(migrated);
    applyMigrationSuffix(
      migrated,
      DATABASE_MIGRATIONS,
      0,
      expectedSignature,
      databaseSchemaSignature,
    );
    const actualSignature = databaseSchemaSignature(migrated);
    if (actualSignature !== expectedSignature) {
      throw new Error(
        'Database migration chain signature differs from fresh schema.sql.',
      );
    }

    const actualChecksum = databaseSchemaChecksum(actualSignature);
    const recordedChecksum =
      DATABASE_MIGRATIONS.at(-1)?.resultSchemaChecksum;
    if (recordedChecksum !== actualChecksum) {
      throw new Error(
        'Final migration result checksum is stale: ' +
          `expected ${String(recordedChecksum)}, got ${actualChecksum}.`,
      );
    }

    return {
      migrationCount: DATABASE_MIGRATIONS.length,
      signature: actualSignature,
    };
  } finally {
    migrated.close();
    fresh.close();
  }
}

const invokedPath =
  process.argv[1] === undefined ? null : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await verifyMigrations();
  process.stdout.write(
    `Migration verification passed: ${result.migrationCount} migration(s), ` +
      'exact schema signature match.\n',
  );
}
