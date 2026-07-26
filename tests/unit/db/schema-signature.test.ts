import { beforeEach, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import preDrizzleSchema from '../../fixtures/schema-pre-drizzle.sql?raw';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import { bootDatabase, degradedRejection } from '../../../src/worker/boot';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

/**
 * THE CUTOVER BREAKAGE, ASSERTED DELIBERATELY.
 *
 * `databaseSchemaSignature` compares normalised `sqlite_schema.sql` text, and
 * the normalisation collapses whitespace only — it does not normalise
 * identifier quoting. The pre-Drizzle artifact was largely unquoted; the
 * generated one is backtick-quoted. The signature therefore changes, and every
 * database image written before the cutover becomes unopenable by this build.
 *
 * This is ACCEPTED (pre-alpha, no users) and is asserted here rather than
 * discovered later. Attempting byte compatibility was explicitly rejected: it
 * would have meant contorting the generator to reproduce hand-written quoting
 * for no product benefit.
 *
 * What matters is that the failure is RECOVERABLE, which is what the degraded
 * boot path (landed before the cutover) provides and what the second test
 * pins.
 */
describe('pre-Drizzle database images', () => {
  async function storageHoldingPreDrizzleImage(): Promise<MemoryDatabaseStorage> {
    const storage = new MemoryDatabaseStorage(sqlite3);
    // Build an image with the OLD artifact by handing the old SQL to a
    // lifecycle, then hand the SAME storage to a lifecycle using the new one.
    const legacy = new DatabaseLifecycle(sqlite3, storage, preDrizzleSchema);
    legacy.open();
    legacy.database.exec("INSERT INTO characters (name) VALUES ('Legacy')");
    legacy.close();
    return storage;
  }

  it('is byte-different from the generated artifact, and now declares more tables', () => {
    expect(preDrizzleSchema).not.toBe(schema);
    // The fixture is a HISTORICAL artifact and is deliberately left frozen: its
    // whole purpose is to be the thing the signature check trips on, and
    // pruning it to match would destroy that. So it still declares the eight
    // Laravel-only tables the generated schema has dropped, and the counts no
    // longer match — asserted here rather than left as a surprise.
    //
    // These are COUNTS, not an equivalence proof, and do not claim to be one.
    // The Laravel-derived oracle in `tests/unit/schema.test.ts` runs against
    // the generated artifact and is what actually pins column types, indexes,
    // defaults and foreign keys — including, since the prune, the proof that
    // its column-metadata hash is still derived from THIS fixture rather than
    // from our own output.
    const tableCount = (sql: string) =>
      [...sql.matchAll(/CREATE TABLE/g)].length;
    expect(tableCount(preDrizzleSchema)).toBe(38);
    expect(tableCount(schema)).toBe(30);
  });

  it('rejects a pre-Drizzle image at open instead of half-working', async () => {
    const storage = await storageHoldingPreDrizzleImage();

    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    expect(boot.detail).toContain(
      'Database image schema does not match the application schema.',
    );
  });

  it('leaves the recovery path reachable from a rejected pre-Drizzle image', async () => {
    const storage = await storageHoldingPreDrizzleImage();
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    expect(degradedRejection(boot, 'queries.characterWorkspace')).not.toBeNull();
    expect(degradedRejection(boot, 'system.exportDatabase')).toBeNull();
    expect(degradedRejection(boot, 'system.reset')).toBeNull();

    // The user's bytes are still rescuable...
    const rescued = await boot.lifecycle.exportBytes();
    expect(rescued.byteLength).toBeGreaterThan(0);

    // ...and reset brings the app back on the current schema.
    await boot.lifecycle.reset();
    expect(boot.lifecycle.isOpen).toBe(true);
    expect(boot.lifecycle.database.scalar('SELECT count(*) FROM characters')).toBe(
      0,
    );
    boot.lifecycle.close();
  });
});
