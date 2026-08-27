import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { openFreshSchemaTestDatabase } from '../../helpers/open-db';

describe('application transactions', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openFreshSchemaTestDatabase({ applySchema: false });
    db = new DatabaseContext(connection);
    connection.exec('CREATE TABLE probe (value TEXT NOT NULL)');
  });

  afterEach(() => {
    connection.close();
  });

  it('uses a savepoint when a fixture already owns the connection transaction', () => {
    const savepoint = vi.spyOn(connection, 'savepoint');
    const transaction = vi.spyOn(connection, 'transaction');
    connection.exec('SAVEPOINT fixture_transaction');

    db.transaction((transactionDb) => {
      transactionDb.exec("INSERT INTO probe (value) VALUES ('nested')");
    });

    expect(savepoint).toHaveBeenCalledOnce();
    expect(transaction).not.toHaveBeenCalled();
    connection.exec('ROLLBACK TO fixture_transaction; RELEASE fixture_transaction');
    expect(connection.selectValue('SELECT count(*) FROM probe')).toBe(0);
  });

  it('uses BEGIN for a plain application transaction', () => {
    const savepoint = vi.spyOn(connection, 'savepoint');
    const transaction = vi.spyOn(connection, 'transaction');

    db.transaction((transactionDb) => {
      transactionDb.exec("INSERT INTO probe (value) VALUES ('outermost')");
    });

    expect(transaction).toHaveBeenCalledOnce();
    expect(savepoint).not.toHaveBeenCalled();
    expect(connection.selectValue('SELECT count(*) FROM probe')).toBe(1);
  });
});
