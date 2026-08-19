import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterAll, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { ok, refused, type Outcome } from '../../../src/refusals/outcome';
import { speciesLineageRefused } from '../../../src/refusals/refusal';
import {
  AsyncCommandBodyDefect,
  runCommandTransaction,
} from '../../../src/refusals/transaction-outcome';
import { getSqlite3 } from '../../helpers/open-db';

const openDatabases: Database[] = [];

async function openDb(): Promise<DatabaseContext> {
  const sqlite3 = await getSqlite3();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  openDatabases.push(connection);
  const db = new DatabaseContext(connection);
  db.exec('CREATE TABLE transaction_events (value TEXT NOT NULL)');
  return db;
}

function write(db: DatabaseContext, value: string): void {
  db.exec('INSERT INTO transaction_events (value) VALUES (?)', [value]);
}

function values(db: DatabaseContext): string[] {
  return db.allRaw(
    'SELECT value FROM transaction_events ORDER BY rowid',
  ).map((row) => String(row.value));
}

function refusal() {
  return refused(speciesLineageRefused('invalid_option'));
}

afterAll(() => {
  for (const database of openDatabases) {
    database.close();
  }
});

describe('runCommandTransaction', () => {
  it('rolls back writes when the body returns a refusal', async () => {
    const db = await openDb();
    const expected = refusal();

    const result = runCommandTransaction(db, () => {
      write(db, 'must roll back');
      return expected;
    });

    expect(result).toBe(expected);
    expect(values(db)).toEqual([]);
  });

  it('commits writes and returns the ok value', async () => {
    const db = await openDb();

    const result = runCommandTransaction(db, () => {
      write(db, 'committed');
      return ok('saved');
    });

    expect(result).toEqual({ kind: 'ok', value: 'saved' });
    expect(values(db)).toEqual(['committed']);
  });

  it('throws an async-body defect and rolls back when an untyped body returns a thenable', async () => {
    const db = await openDb();
    let caught: unknown;
    const thenableBody = (() => {
      write(db, 'must roll back');
      return {
        then(resolve: (outcome: Outcome<string>) => unknown) {
          return resolve(ok('too late'));
        },
      };
    }) as unknown as () => Outcome<string>;

    try {
      runCommandTransaction(db, thenableBody);
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AsyncCommandBodyDefect);
    expect(caught).toMatchObject({
      name: 'AsyncCommandBodyDefect',
      message: 'Command transaction bodies must return an Outcome synchronously.',
    });
    expect(values(db)).toEqual([]);
  });

  it('propagates a body defect unchanged and rolls back its writes', async () => {
    const db = await openDb();
    const defect = new Error('injected command defect');
    let caught: unknown;

    try {
      runCommandTransaction<string>(db, () => {
        write(db, 'must roll back');
        throw defect;
      });
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBe(defect);
    expect(values(db)).toEqual([]);
  });

  it('keeps the rollback signal outside a broad catch in the command body', async () => {
    const db = await openDb();
    const expected = refusal();
    let bodyCaught = false;

    const result = runCommandTransaction(db, () => {
      try {
        write(db, 'must roll back');
        return expected;
      } catch {
        bodyCaught = true;
        return ok('incorrectly caught');
      }
    });

    expect(bodyCaught).toBe(false);
    expect(result).toBe(expected);
    expect(values(db)).toEqual([]);
  });

  it('rolls back an inner refusal savepoint while allowing the outer transaction to commit', async () => {
    const db = await openDb();
    const expectedInner = refusal();
    let inner: Outcome<string> | undefined;

    const outer = runCommandTransaction(db, () => {
      write(db, 'outer before');
      inner = runCommandTransaction(db, () => {
        write(db, 'inner must roll back');
        return expectedInner;
      });
      write(db, 'outer after');
      return ok('outer saved');
    });

    expect(inner).toBe(expectedInner);
    expect(outer).toEqual({ kind: 'ok', value: 'outer saved' });
    expect(values(db)).toEqual(['outer before', 'outer after']);
  });

  it('rolls back a successful inner savepoint when the outer transaction refuses', async () => {
    const db = await openDb();
    const expectedOuter = refusal();
    let inner: Outcome<string> | undefined;

    const outer = runCommandTransaction(db, () => {
      write(db, 'outer must roll back');
      inner = runCommandTransaction(db, () => {
        write(db, 'inner must also roll back');
        return ok('inner saved');
      });
      return expectedOuter;
    });

    expect(inner).toEqual({ kind: 'ok', value: 'inner saved' });
    expect(outer).toBe(expectedOuter);
    expect(values(db)).toEqual([]);
  });
});
