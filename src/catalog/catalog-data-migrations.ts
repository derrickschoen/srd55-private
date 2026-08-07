import type { DatabaseContext } from '../db/database';
import { sha256 } from '../crypto/sha256';
import {
  contentFingerprintSchemeRegistry,
  CONTENT_FINGERPRINT_SCHEME_V1,
  type ContentFingerprintScheme,
} from './content-identity';
import retirementSource from './retire-non-srd-bundled-subclasses-v1.ts?raw';
import {
  retireNonSrdBundledSubclassesV1,
} from './retire-non-srd-bundled-subclasses-v1';

/**
 * One append-only semantic catalog migration.
 *
 * `source` is the exact committed TypeScript module text imported with
 * Vite's `?raw` suffix by the registry. It is deliberately separate from
 * `run.toString()`: emitted JavaScript function source is not a stable
 * persistence checksum. The manually pinned checksum freezes those source
 * bytes before a database is touched.
 */
export interface CatalogDataMigration {
  readonly id: string;
  readonly projectorScheme: ContentFingerprintScheme;
  readonly source: string;
  readonly checksum: string;
  run(db: DatabaseContext): void;
}

/** Append-only, checksum-frozen product-data migrations. */
export const CATALOG_DATA_MIGRATIONS: readonly CatalogDataMigration[] =
  Object.freeze([
    Object.freeze({
      id: 'retire_non_srd_bundled_subclasses_v1',
      projectorScheme: CONTENT_FINGERPRINT_SCHEME_V1,
      source: retirementSource,
      checksum:
        '3fdeee928e80e1b64642a212abb15526732f8521fa3aa33bd45cd2f064e374f2',
      run: retireNonSrdBundledSubclassesV1,
    }),
  ]);

interface AppliedCatalogDataMigration {
  readonly id: string;
  readonly scheme: string;
  readonly checksum: string;
}

function appliedCatalogDataMigrations(
  db: DatabaseContext,
): readonly AppliedCatalogDataMigration[] {
  return db.allRaw(
    `SELECT id, scheme, checksum
     FROM catalog_data_migrations
     ORDER BY id`,
  ).map((row) => {
    const id = row.id;
    const scheme = row.scheme;
    const checksum = row.checksum;
    if (
      typeof id !== 'string' ||
      typeof scheme !== 'string' ||
      typeof checksum !== 'string'
    ) {
      throw new Error('Catalog data-migration marker is malformed.');
    }
    return { id, scheme, checksum };
  });
}

export function validateCatalogDataMigrationRegistry(
  migrations: readonly CatalogDataMigration[],
): void {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (migration.id.length === 0) {
      throw new Error('Catalog data-migration id must not be empty.');
    }
    if (ids.has(migration.id)) {
      throw new Error(
        `Duplicate catalog data-migration id "${migration.id}".`,
      );
    }
    ids.add(migration.id);

    if (
      !Object.prototype.hasOwnProperty.call(
        contentFingerprintSchemeRegistry,
        migration.projectorScheme,
      )
    ) {
      throw new Error(
        `Catalog data migration "${migration.id}" uses unknown projector ` +
          `scheme "${String(migration.projectorScheme)}".`,
      );
    }

    const actual = sha256(migration.source);
    if (actual !== migration.checksum) {
      throw new Error(
        `Catalog data migration "${migration.id}" source checksum mismatch: ` +
          `expected ${migration.checksum}, got ${actual}.`,
      );
    }
  }
}

function foreignKeyFailure(db: DatabaseContext): string | null {
  const violation = db.connection.selectObject('PRAGMA foreign_key_check');
  if (violation === undefined) {
    return null;
  }
  return `table ${String(violation.table)}`;
}

/**
 * Runs each pending semantic migration in its own transaction.
 *
 * The marker is the final write in that transaction. A thrown projector,
 * failed constraint, failed reference check, or marker insert therefore rolls
 * back both the semantic writes and the claim that they were applied.
 */
export function runCatalogDataMigrations(
  db: DatabaseContext,
  migrations: readonly CatalogDataMigration[] = CATALOG_DATA_MIGRATIONS,
): void {
  validateCatalogDataMigrationRegistry(migrations);

  const registered = new Map(
    migrations.map((migration) => [migration.id, migration] as const),
  );
  const applied = new Map<string, AppliedCatalogDataMigration>();
  for (const marker of appliedCatalogDataMigrations(db)) {
    const migration = registered.get(marker.id);
    if (migration === undefined) {
      throw new Error(
        `Applied catalog data migration "${marker.id}" is not registered by ` +
          'this application.',
      );
    }
    if (
      marker.scheme !== migration.projectorScheme ||
      marker.checksum !== migration.checksum
    ) {
      throw new Error(
        `Applied catalog data migration "${marker.id}" does not match the ` +
          'registered projector scheme and checksum.',
      );
    }
    applied.set(marker.id, marker);
  }

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    db.transaction((transaction) => {
      migration.run(transaction);

      const foreignKeyProblem = foreignKeyFailure(transaction);
      if (foreignKeyProblem !== null) {
        throw new Error(
          `Catalog data migration "${migration.id}" foreign-key check ` +
            `failed for ${foreignKeyProblem}.`,
        );
      }

      transaction.exec(
        `INSERT INTO catalog_data_migrations (
           id, scheme, checksum
         ) VALUES (?, ?, ?)`,
        [
          migration.id,
          migration.projectorScheme,
          migration.checksum,
        ],
      );
    }, 'EXCLUSIVE');
  }
}
