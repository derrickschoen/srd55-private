import { describe, expect, it, vi } from 'vitest';
import { databaseIsInTransaction } from '../../../src/db/query';
import {
  acquireSharedDb,
  sharedDbRebuildCount,
} from '../../helpers/shared-db';

describe('the per-worker shared seeded database lease', () => {
  it('makes a read-only lease query-only without opening a transaction', async () => {
    const lease = await acquireSharedDb({ mode: 'ro' });
    try {
      expect(Number(lease.connection.selectValue('PRAGMA query_only'))).toBe(1);
      expect(databaseIsInTransaction(lease.connection)).toBe(false);
      expect(() =>
        lease.connection.exec("INSERT INTO characters (name) VALUES ('No')"),
      ).toThrow();
    } finally {
      await lease.release();
    }
  });

  it('rejects an overlapping lease', async () => {
    const lease = await acquireSharedDb({ mode: 'ro' });
    try {
      await expect(acquireSharedDb({ mode: 'rw' })).rejects.toThrow(
        'A shared database lease is already active in this worker.',
      );
    } finally {
      await lease.release();
    }
  });

  it('lets application transactions nest inside a writable fixture savepoint and rolls them back', async () => {
    const writable = await acquireSharedDb({ mode: 'rw' });
    writable.db.transaction((db) => {
      db.exec("INSERT INTO characters (name) VALUES ('Rolled back')");
    });
    expect(
      writable.db.scalar<number>(
        "SELECT count(*) FROM characters WHERE name = 'Rolled back'",
      ),
    ).toBe(1);
    await writable.release();

    const readonly = await acquireSharedDb({ mode: 'ro' });
    try {
      expect(
        readonly.db.scalar<number>(
          "SELECT count(*) FROM characters WHERE name = 'Rolled back'",
        ),
      ).toBe(0);
    } finally {
      await readonly.release();
    }
  });

  it('loudly rebuilds after a test destroys its fixture savepoint', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = sharedDbRebuildCount();
    const poisoned = await acquireSharedDb({ mode: 'rw' });
    poisoned.connection.exec(
      "INSERT INTO characters (name) VALUES ('Committed poison')",
    );
    poisoned.connection.exec('COMMIT');

    await expect(poisoned.release()).rejects.toThrow(
      'database lease violated isolation',
    );

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `[shared-db] POISONED full worker connection; rebuilding from the seeded image ` +
          `(rebuild #${String(before + 1)})`,
      ),
    );
    warn.mockRestore();

    const replacement = await acquireSharedDb({ mode: 'ro' });
    try {
      expect(
        replacement.db.scalar<number>(
          "SELECT count(*) FROM characters WHERE name = 'Committed poison'",
        ),
      ).toBe(0);
    } finally {
      await replacement.release();
    }
  });

  it('loudly rebuilds after a test closes the leased connection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = sharedDbRebuildCount();
    const poisoned = await acquireSharedDb({ mode: 'rw' });
    poisoned.connection.close();

    await expect(poisoned.release()).rejects.toThrow(
      'database lease violated isolation',
    );

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('after lease: connection was closed'),
    );
    warn.mockRestore();
  });

  it('serves the cached connection to a fresh module graph without a rebuild', async () => {
    const seeded = await acquireSharedDb({ mode: 'rw' });
    await seeded.release();
    const before = sharedDbRebuildCount();

    // Stryker (and any isolation change) reuses the worker process with a
    // fresh module graph, whose query-engine registry starts empty while the
    // connection cached on `process` survives. Recreate that boundary.
    vi.resetModules();
    const freshSharedDb = await import('../../helpers/shared-db');
    const freshQuery = await import('../../../src/db/query');

    const lease = await freshSharedDb.acquireSharedDb({ mode: 'ro' });
    try {
      expect(freshQuery.databaseIsInTransaction(lease.connection)).toBe(false);
      expect(
        lease.db.scalar<number>('SELECT count(*) FROM characters'),
      ).toBeGreaterThanOrEqual(0);
    } finally {
      await lease.release();
    }
    expect(freshSharedDb.sharedDbRebuildCount()).toBe(before);
  });

  it('loudly rebuilds after a test leaks a prepared statement', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = sharedDbRebuildCount();
    const poisoned = await acquireSharedDb({ mode: 'rw' });
    poisoned.connection.prepare('SELECT 1');

    await expect(poisoned.release()).rejects.toThrow(
      'database lease violated isolation',
    );

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('connection retained an open statement'),
    );
    warn.mockRestore();
  });

  it('loudly rebuilds when a read-only lease disables query_only and writes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = sharedDbRebuildCount();
    const poisoned = await acquireSharedDb({ mode: 'ro' });
    poisoned.connection.exec('PRAGMA query_only = OFF');
    poisoned.connection.exec(
      "INSERT INTO characters (name) VALUES ('Read-only poison')",
    );

    await expect(poisoned.release()).rejects.toThrow(
      'read-only lease changed query_only; read-only lease changed 1 rows',
    );

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('after lease: read-only lease changed query_only'),
    );
    warn.mockRestore();

    const replacement = await acquireSharedDb({ mode: 'ro' });
    try {
      expect(
        replacement.db.scalar<number>(
          "SELECT count(*) FROM characters WHERE name = 'Read-only poison'",
        ),
      ).toBe(0);
    } finally {
      await replacement.release();
    }
  });
});
