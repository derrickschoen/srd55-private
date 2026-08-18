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

    await poisoned.release();

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `[shared-db] POISONED worker connection; rebuilding from the seeded image ` +
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

    await poisoned.release();

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('after lease: connection was closed'),
    );
    warn.mockRestore();
  });

  it('loudly rebuilds after a test leaks a prepared statement', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const before = sharedDbRebuildCount();
    const poisoned = await acquireSharedDb({ mode: 'rw' });
    poisoned.connection.prepare('SELECT 1');

    await poisoned.release();

    expect(sharedDbRebuildCount()).toBe(before + 1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('connection retained an open statement'),
    );
    warn.mockRestore();
  });
});
