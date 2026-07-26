import { beforeEach, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import {
  bootDatabase,
  bootHandlerContext,
  DEGRADED_SAFE_METHODS,
  degradedRejection,
  isDegraded,
} from '../../../src/worker/boot';
import { createSystemHandlers } from '../../../src/worker/handlers/system';
import type { RpcHandler } from '../../../src/worker/handler';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const handlers = createSystemHandlers({ includeInspectRows: false });

function handlerFor(method: string): RpcHandler {
  const handler = handlers.find((candidate) => candidate.method === method);
  if (handler === undefined) {
    throw new Error(`No system handler for "${method}".`);
  }
  return handler;
}

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

/**
 * Produces bytes of a database that is valid SQLite and holds real user data,
 * but whose schema this build refuses. This stands in for any image written by
 * a different schema generation — including the pre-Drizzle artifact.
 */
async function seedIncompatibleImage(
  storage: MemoryDatabaseStorage,
  characterName: string,
): Promise<void> {
  const seeded = new DatabaseLifecycle(sqlite3, storage, schema);
  seeded.open();
  seeded.database.exec('INSERT INTO characters (name) VALUES (?)', [
    characterName,
  ]);
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
}

describe('degraded boot', () => {
  it('rejects a schema-incompatible stored image at open instead of throwing past it', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await seedIncompatibleImage(storage, 'Stranded character');

    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    expect(boot.detail).toContain(
      'Database image schema does not match the application schema.',
    );
    expect(boot.lifecycle.isOpen).toBe(false);
  });

  it('rejects ordinary methods with a typed schema_mismatch error while degraded', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await seedIncompatibleImage(storage, 'Stranded character');
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    const rejection = degradedRejection(boot, 'system.countCharacters');

    expect(rejection?.code).toBe('schema_mismatch');
    expect(rejection?.message).toContain('system.countCharacters');
    for (const method of DEGRADED_SAFE_METHODS) {
      expect(degradedRejection(boot, method)).toBeNull();
    }
  });

  it('still exports the unopenable image so the bytes can be rescued before reset', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await seedIncompatibleImage(storage, 'Rescued character');
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    const context = bootHandlerContext(boot, 'test');

    const rescued = (await handlerFor('system.exportDatabase').handle(
      context,
      {},
    )) as Uint8Array;

    // The rescued bytes are the stale image itself: still openable as raw
    // SQLite, still carrying the user's row, even though this build rejects it.
    const salvage = openDatabaseImage(sqlite3, rescued);
    try {
      expect(salvage.selectValues('SELECT name FROM characters')).toEqual([
        'Rescued character',
      ]);
    } finally {
      salvage.close();
    }
  });

  it('recovers a working application from the degraded state via system.reset', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await seedIncompatibleImage(storage, 'Discarded character');
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));
    const context = bootHandlerContext(boot, 'test');
    expect(boot.lifecycle.isOpen).toBe(false);

    const result = await handlerFor('system.reset').handle(context, {});

    expect(result).toEqual({ reset: true });
    expect(boot.lifecycle.isOpen).toBe(true);
    expect(context.db.scalar('SELECT count(*) FROM characters')).toBe(0);
    expect(context.db.scalar('PRAGMA foreign_keys')).toBe(1);

    // THE POINT OF THE RECOVERY PATH. The worker holds ONE boot object for its
    // whole life, so asserting recovery against a freshly-constructed boot
    // proves nothing about the running worker. `boot.status` is still
    // 'schema_mismatch' — it records the start-up outcome and never changes —
    // and dispatch must nonetheless be authorised again, or `system.reset`
    // returns `{ reset: true }` onto an app that stays unusable until reload.
    expect(boot.status).toBe('schema_mismatch');
    expect(isDegraded(boot)).toBe(false);
    expect(degradedRejection(boot, 'system.countCharacters')).toBeNull();
    expect(
      await handlerFor('system.countCharacters').handle(context, {}),
    ).toBe(0);

    // And the next boot over the same storage is healthy, not degraded.
    boot.lifecycle.close();
    const rebooted = bootDatabase(
      new DatabaseLifecycle(sqlite3, storage, schema),
    );
    expect(rebooted.status).toBe('ready');
    expect(degradedRejection(rebooted, 'system.countCharacters')).toBeNull();
    rebooted.lifecycle.close();
  });

  it('leaves a healthy boot completely unchanged', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const boot = bootDatabase(new DatabaseLifecycle(sqlite3, storage, schema));

    expect(boot.status).toBe('ready');
    expect(boot.lifecycle.isOpen).toBe(true);
    const context = bootHandlerContext(boot, 'test');
    expect(context.db.scalar('SELECT count(*) FROM characters')).toBe(0);
    expect(degradedRejection(boot, 'anything.at.all')).toBeNull();
    boot.lifecycle.close();
  });
});
