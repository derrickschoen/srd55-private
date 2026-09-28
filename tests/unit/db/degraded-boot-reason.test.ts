import { beforeEach, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import {
  decodeDegradedBootReason,
  degradedBootReasonData,
  type DegradedBootReason,
} from '../../../src/db/degraded-boot-reason';
import { classifyDatabaseBootFailure } from '../../../src/db/database-worker-boot';
import type { JsonValue } from '../../../src/domain/models';
import { RpcClient } from '../../../src/rpc/client';
import { RpcError } from '../../../src/rpc/protocol';
import { bootDatabase } from '../../../src/worker/boot';
import { DegradedWorkerTransport } from '../../helpers/degraded-worker-transport';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

/**
 * PC-EXPORT-TRUTH fix 2 (codex r2 P1): the worker's typed degraded-boot
 * reason reaches the main thread as that reason, and only an exact reason
 * does. The stale-catalog-marker arm is witnessed end to end beside its image
 * in tests/unit/db/catalog-marker-reset.test.ts; this file holds the other
 * arm and the decoder's refusals.
 */
let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

const MARKER_REASON: DegradedBootReason = {
  kind: 'catalog_data_marker_disagreement',
  migrationId: 'reconcile_species_lineage_content_v2',
  remedy: 'reset_local_database',
};

describe('the degraded boot reason on the main thread', () => {
  it('an image this build rejects for its schema reaches the boot screen as image_rejected, with the same recovery pair', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const seeded = new DatabaseLifecycle(sqlite3, storage, schema);
    seeded.open();
    const bytes = await seeded.exportBytes();
    seeded.close();
    const mutable = openDatabaseImage(sqlite3, bytes, { readonly: false });
    let incompatible: Uint8Array;
    try {
      mutable.exec('ALTER TABLE characters DROP COLUMN notes');
      incompatible = sqlite3.capi.sqlite3_js_db_export(mutable).slice();
    } finally {
      mutable.close();
    }
    await storage.replaceFile(incompatible);
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    const client = new RpcClient(new DegradedWorkerTransport(boot));

    let rejected: unknown;
    try {
      await client.call('system.info', {});
    } catch (error: unknown) {
      rejected = error;
    }
    client.close();

    expect(rejected).toBeInstanceOf(RpcError);
    expect(rejected instanceof RpcError ? rejected.data : undefined).toEqual({ reason: 'image_rejected' });
    const failure = classifyDatabaseBootFailure(rejected);
    expect(failure.kind).toBe('local_database_needs_reset');
    if (failure.kind !== 'local_database_needs_reset') throw new Error('unreachable');
    expect(failure.reason).toEqual({ kind: 'image_rejected' });
    expect(failure.headline).toBe('Your local database cannot be opened');
    expect(failure.remedy).toContain('Reset local database');
    expect(failure.detail).toContain('Database image schema does not match the application schema.');
  });

  it('round-trips both reasons through their wire form', () => {
    for (const reason of [MARKER_REASON, { kind: 'image_rejected' } as const]) {
      const wire: JsonValue = structuredClone(degradedBootReasonData(reason));
      expect(decodeDegradedBootReason(wire)).toEqual(reason);
    }
    expect(degradedBootReasonData(MARKER_REASON)).toEqual({
      reason: 'catalog_data_marker_disagreement',
      migration_id: 'reconcile_species_lineage_content_v2',
      remedy: 'reset_local_database',
    });
  });

  it('reads nothing but an exact reason: anything else stays on the generic failure, detail intact', () => {
    const notReasons: readonly (JsonValue | undefined)[] = [
      undefined,
      null,
      'catalog_data_marker_disagreement',
      [],
      {},
      { reason: 'stale_everything' },
      { reason: 'catalog_data_marker_disagreement', remedy: 'reset_local_database' },
      { reason: 'catalog_data_marker_disagreement', migration_id: '', remedy: 'reset_local_database' },
      { reason: 'catalog_data_marker_disagreement', migration_id: '  ', remedy: 'reset_local_database' },
      { reason: 'catalog_data_marker_disagreement', migration_id: 7, remedy: 'reset_local_database' },
      { reason: 'catalog_data_marker_disagreement', migration_id: 'reconcile_species_lineage_content_v2', remedy: 'migrate' },
      {
        reason: 'catalog_data_marker_disagreement',
        migration_id: 'reconcile_species_lineage_content_v2',
        remedy: 'reset_local_database',
        confirmed: true,
      },
      { reason: 'image_rejected', remedy: 'reset_local_database' },
    ];
    for (const data of notReasons) {
      expect(decodeDegradedBootReason(data)).toBeNull();
      const failure = classifyDatabaseBootFailure(
        new RpcError('schema_mismatch', 'The stored database does not match.', data),
      );
      expect(failure).toEqual({
        kind: 'boot_failed',
        headline: 'The local database did not start',
        detail: 'The stored database does not match.',
      });
    }
  });

  it('a reason on any code other than schema_mismatch is not a degraded boot', () => {
    for (const code of ['handler_error', 'transport_error', 'storage_pool_locked'] as const) {
      const failure = classifyDatabaseBootFailure(
        new RpcError(code, 'not degraded', degradedBootReasonData(MARKER_REASON)),
      );
      expect(failure.kind).not.toBe('local_database_needs_reset');
    }
  });
});
