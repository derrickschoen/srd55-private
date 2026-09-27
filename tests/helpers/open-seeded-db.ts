import type { Database } from '@sqlite.org/sqlite-wasm';
import { applicationSeed } from '../../src/db/bootstrap';
import type {
  ApplicationSeedProfile,
} from '../../src/db/application-seed-profile';
import { DatabaseContext, prepareConnection } from '../../src/db/database';
import { openDatabaseImage } from '../../src/db/database-lifecycle';
import { getSqlite3, openTestDatabase } from './open-db';
import { attachSqlTrace } from './sql-trace';
import { readPreparedSeededDatabaseImage } from './seeded-database-image-cache';

/*
 * The seeded openers live apart from `open-db.ts` because they are the only
 * test helpers that need `src/db/bootstrap.ts`, and bootstrap brings the whole
 * seed with it: the bundled catalog, class resources and the SRD text they
 * parse. A test that only needs a schema imports `open-db.ts` and loads none
 * of that. `scripts/check-import-boundaries.mjs` (rule R3) keeps it so.
 */

// Vitest isolates each file's module graph, while `process` remains local to
// and stable for the worker. Keep the promise there so files assigned to the
// same worker share one immutable byte image without sharing a connection.
const workerState = process as typeof process & {
  __dndSeededDatabaseImagePromises?: Partial<
    Record<ApplicationSeedProfile, Promise<Uint8Array>>
  >;
};

async function seededDatabaseImage(
  profile: ApplicationSeedProfile,
): Promise<Uint8Array> {
  workerState.__dndSeededDatabaseImagePromises ??= {};
  workerState.__dndSeededDatabaseImagePromises[profile] ??= (async () => {
    const prepared = readPreparedSeededDatabaseImage(profile);
    if (prepared !== null) return prepared;
    const sqlite3 = await getSqlite3();
    const db = await openTestDatabase();
    try {
      applicationSeed(new DatabaseContext(db), 'full', profile);
      return sqlite3.capi.sqlite3_js_db_export(db).slice();
    } finally {
      db.close();
    }
  })();
  return workerState.__dndSeededDatabaseImagePromises[profile];
}

/**
 * Opens an isolated, writable clone of the suite-prepared schema-and-seed
 * image. Tests must opt in explicitly; `openTestDatabase` in `open-db.ts`
 * remains the fresh-schema path for database lifecycle and seeding tests.
 */
export async function openSeededTestDatabase(options: {
  profile?: ApplicationSeedProfile;
} = {}): Promise<Database> {
  const sqlite3 = await getSqlite3();
  const bytes = (await seededDatabaseImage(options.profile ?? 'full')).slice();
  const db = openDatabaseImage(sqlite3, bytes, { readonly: false });
  prepareConnection(db);
  attachSqlTrace(db, sqlite3);
  return db;
}

/**
 * Explicit exception path for tests that need an independently writable,
 * seeded connection (reopen/serialization, corruption, PRAGMA/DDL, poison,
 * or simultaneous source/target databases).
 */
export function openFreshSeededTestDatabase(options: {
  profile?: ApplicationSeedProfile;
} = {}): Promise<Database> {
  return openSeededTestDatabase(options);
}
