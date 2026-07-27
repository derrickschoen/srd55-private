import type { Database } from '@sqlite.org/sqlite-wasm';
import baseline from '../../drizzle/0000_skinny_lionheart.sql?raw';
import baselineTriggers from '../../drizzle/0000_skinny_lionheart.triggers.sql?raw';
import { sha256 } from '../crypto/sha256';

export interface DatabaseMigration {
  /** Stable product identity. Once shipped, this value and its SQL never move. */
  readonly id: string;
  readonly sql: string;
  /** SHA-256 of `sql`, checked synchronously before any image is touched. */
  readonly checksum: string;
  /** SHA-256 of the exact sqlite_schema signature after this chain prefix. */
  readonly resultSchemaChecksum: string;
}

const baselineSql = [
  baseline.trim(),
  baselineTriggers.trim(),
  '-- migration-bundle-control:0000',
].join('\n\n') + '\n';

/**
 * Append-only product data.
 *
 * A shipped entry is immutable. Schema work adds a generated SQL file and a
 * new entry; it never edits or regenerates an existing migration. The result
 * checksum makes every chain prefix a known source schema for later upgrades.
 */
export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = Object.freeze([
  Object.freeze({
    id: '0000_skinny_lionheart',
    sql: baselineSql,
    checksum:
      'cfd5b76e09514b890f20990df5cf743c32aeb3a1d41b80cea2370900eed74cfb',
    resultSchemaChecksum:
      'fa9627e3cdef381b97d24aee249867ebee9866941e3fd65e9b739111989da1d9',
  }),
]);

export function databaseSchemaChecksum(signature: string): string {
  return sha256(signature);
}

export function validateMigrationRegistry(
  migrations: readonly DatabaseMigration[],
): void {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(`Duplicate database migration id "${migration.id}".`);
    }
    ids.add(migration.id);

    const actual = sha256(migration.sql);
    if (actual !== migration.checksum) {
      throw new Error(
        `Database migration "${migration.id}" checksum mismatch: ` +
          `expected ${migration.checksum}, got ${actual}.`,
      );
    }
  }
}

export function appliedMigrationCount(
  schemaChecksum: string,
  migrations: readonly DatabaseMigration[],
): number | null {
  const index = migrations.findIndex(
    (migration) => migration.resultSchemaChecksum === schemaChecksum,
  );
  return index === -1 ? null : index + 1;
}

function foreignKeyFailure(db: Database): string | null {
  const violation = db.selectObject('PRAGMA foreign_key_check');
  if (violation === undefined) {
    return null;
  }
  return `table ${String(violation.table)}`;
}

/**
 * Applies one suffix as a single atomic unit.
 *
 * `foreign_keys=OFF` must precede `BEGIN`; SQLite silently ignores it inside a
 * transaction. The check and target-signature comparison deliberately happen
 * before COMMIT so either failure restores the exact source image.
 */
export function applyMigrationSuffix(
  db: Database,
  migrations: readonly DatabaseMigration[],
  appliedCount: number,
  expectedSignature: string,
  signatureOf: (database: Database) => string,
): void {
  const pending = migrations.slice(appliedCount);
  if (pending.length === 0) {
    return;
  }

  db.exec('PRAGMA foreign_keys = OFF');
  if (Number(db.selectValue('PRAGMA foreign_keys')) !== 0) {
    throw new Error(
      'Database migration could not disable foreign-key enforcement.',
    );
  }

  let transactionOpen = false;
  try {
    db.exec('BEGIN EXCLUSIVE');
    transactionOpen = true;
    try {
      for (const migration of pending) {
        db.exec(migration.sql);
      }

      const foreignKeyProblem = foreignKeyFailure(db);
      if (foreignKeyProblem !== null) {
        throw new Error(
          `Database migration foreign-key check failed for ${foreignKeyProblem}.`,
        );
      }

      if (signatureOf(db) !== expectedSignature) {
        throw new Error(
          'Migrated database schema does not match the application schema.',
        );
      }

      db.exec('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) {
        db.exec('ROLLBACK');
        transactionOpen = false;
      }
      throw error;
    }
  } finally {
    if (transactionOpen) {
      db.exec('ROLLBACK');
    }
    db.exec('PRAGMA foreign_keys = ON');
    if (Number(db.selectValue('PRAGMA foreign_keys')) !== 1) {
      throw new Error(
        'Database migration could not re-enable foreign-key enforcement.',
      );
    }
  }
}
