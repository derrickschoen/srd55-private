import { beforeEach, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import { CATALOG_DATA_MIGRATIONS } from '../../../src/catalog/catalog-data-migrations';
import { DatabaseLifecycle, openDatabaseImage } from '../../../src/db/database-lifecycle';
import {
  bootDatabase,
  bootHandlerContext,
  degradedRejection,
  isDegraded,
} from '../../../src/worker/boot';
import { createSystemHandlers } from '../../../src/worker/handlers/system';
import {
  bootDatabaseWorkerWithRetry,
  classifyDatabaseBootFailure,
  type DatabaseWorkerBootPort,
} from '../../../src/db/database-worker-boot';
import { RpcClient } from '../../../src/rpc/client';
import { RpcError } from '../../../src/rpc/protocol';
import { STALE_CATALOG_MARKER } from '../../fixtures/stale-catalog-marker';
import { DegradedWorkerTransport } from '../../helpers/degraded-worker-transport';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

/**
 * PC-EXPORT-TRUTH fix 1, finding P1 "existing databases with the prior
 * migration marker cannot boot". The owner accepted a local database reset
 * instead of a migration (D923 Q11), so the obligation is that such a boot
 * FAILS LEGIBLY: a typed reason that names the marker and the remedy, and a
 * reset path that actually recovers.
 *
 * The stale image below is real, not a stand-in: a database that ran every
 * catalog data migration, whose `reconcile_species_lineage_content_v2`
 * marker is then set back to the checksum main registered before this unit
 * (eb45b16b, src/catalog/catalog-data-migrations.ts) — exactly the row an
 * image created before PC-EXPORT-TRUTH carries.
 */
const MARKER = STALE_CATALOG_MARKER.migrationId;
const PRE_UNIT_CHECKSUM = STALE_CATALOG_MARKER.preUnitChecksum;

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

async function preUnitImage(storage: MemoryDatabaseStorage): Promise<void> {
  const seeded = new DatabaseLifecycle(sqlite3, storage, schema);
  seeded.open();
  seeded.database.exec('INSERT INTO characters (name) VALUES (?)', ['Built before the unit']);
  const bytes = await seeded.exportBytes();
  seeded.close();
  const image = openDatabaseImage(sqlite3, bytes, { readonly: false });
  let stale: Uint8Array;
  try {
    image.exec({
      sql: 'UPDATE catalog_data_migrations SET checksum = ? WHERE id = ?',
      bind: [PRE_UNIT_CHECKSUM, MARKER],
    });
    expect(image.selectValue(
      'SELECT checksum FROM catalog_data_migrations WHERE id = ?',
      [MARKER],
    )).toBe(PRE_UNIT_CHECKSUM);
    stale = sqlite3.capi.sqlite3_js_db_export(image).slice();
  } finally {
    image.close();
  }
  await storage.replaceFile(stale);
}

describe('a database whose catalog data marker predates this build', () => {
  it('boots degraded with a typed reason naming the marker and the reset remedy', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await preUnitImage(storage);

    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') throw new Error('unreachable');
    expect(boot.reason).toEqual({
      kind: 'catalog_data_marker_disagreement',
      migrationId: MARKER,
      remedy: 'reset_local_database',
    });
    expect(boot.detail).toContain(`"${MARKER}"`);
    expect(boot.detail).toContain('reset the local database');

    const rejection = degradedRejection(boot, 'system.countCharacters');
    expect(rejection?.code).toBe('schema_mismatch');
    expect(rejection?.data).toEqual({
      reason: 'catalog_data_marker_disagreement',
      migration_id: MARKER,
      remedy: 'reset_local_database',
    });
    expect(rejection?.message).toContain(`"${MARKER}"`);
    expect(rejection?.message).toContain('reset the local database');
  });

  it('recovers through the existing system.reset path, which stamps this build\'s marker', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await preUnitImage(storage);
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    expect(isDegraded(boot)).toBe(true);
    const context = bootHandlerContext(boot, 'test');
    const reset = createSystemHandlers({ includeInspectRows: false })
      .find((handler) => handler.method === 'system.reset');
    if (reset === undefined) throw new Error('No system.reset handler.');

    expect(await reset.handle(context, {})).toEqual({ reset: true });

    expect(isDegraded(boot)).toBe(false);
    expect(degradedRejection(boot, 'system.countCharacters')).toBeNull();
    const registered = CATALOG_DATA_MIGRATIONS.find((migration) => migration.id === MARKER);
    expect(registered?.checksum).not.toBe(PRE_UNIT_CHECKSUM);
    expect(context.db.scalar(
      'SELECT checksum FROM catalog_data_migrations WHERE id = ?',
      [MARKER],
    )).toBe(registered?.checksum);
    // The reset is a reset: the character built before the unit is gone (D923 Q11).
    expect(context.db.scalar('SELECT count(*) FROM characters')).toBe(0);

    boot.lifecycle.close();
    const rebooted = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    expect(rebooted.status).toBe('ready');
    rebooted.lifecycle.close();
  });

  it('reaches the main thread\'s boot screen as the typed reason with the reset remedy, across the worker boundary', async () => {
    // PC-EXPORT-TRUTH fix 2 (codex r2 P1): the main thread used to collapse
    // this rejection to `boot_failed` and render "Failed: …" with no action.
    // The whole seam, as main.ts drives it: the boot probe `system.info`
    // through the real RpcClient, answered by the degraded worker's rejection
    // after a structured clone, then the shell's classification.
    const storage = new MemoryDatabaseStorage(sqlite3);
    await preUnitImage(storage);
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    const transport = new DegradedWorkerTransport(boot);
    const client = new RpcClient(transport);
    const port: DatabaseWorkerBootPort = { activate: () => undefined, restart: () => undefined };

    let rejected: unknown;
    try {
      await bootDatabaseWorkerWithRetry(port, () => client.call('system.info', {}));
    } catch (error: unknown) {
      rejected = error;
    }
    client.close();
    boot.lifecycle.close();

    // Not retried: a degraded boot is a stored-data state, not a lost worker.
    expect(transport.requestedMethods).toEqual(['system.info']);
    expect(rejected).toBeInstanceOf(RpcError);
    const failure = classifyDatabaseBootFailure(rejected);
    expect(failure.kind).toBe('local_database_needs_reset');
    if (failure.kind !== 'local_database_needs_reset') throw new Error('unreachable');
    expect(failure.reason).toEqual({
      kind: 'catalog_data_marker_disagreement',
      migrationId: MARKER,
      remedy: 'reset_local_database',
    });
    expect(failure.headline).toBe('Your local database was made by an earlier build');
    expect(failure.explanation).toContain(`"${MARKER}"`);
    expect(failure.remedy).toContain('Export database');
    expect(failure.remedy).toContain('Reset local database');
    // The worker's own words stay reachable as the technical detail.
    expect(failure.detail).toContain(`"${MARKER}"`);
    expect(failure.detail).toContain('"system.info" is unavailable');
  });
});
