import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';

describe('database write results', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase({ applySchema: false });
    db = new DatabaseContext(connection);
  });

  afterEach(() => {
    connection.close();
  });

  it('reads the connection last-insert rowid without changing its semantics', () => {
    expect(db.exec('CREATE TABLE probe (id INTEGER PRIMARY KEY, value TEXT)'))
      .toEqual({ changes: 0, lastInsertId: 0 });

    expect(db.exec("INSERT INTO probe (value) VALUES ('first')"))
      .toEqual({ changes: 1, lastInsertId: 1 });
    expect(db.exec("INSERT INTO probe (id, value) VALUES (8, 'eighth')"))
      .toEqual({ changes: 1, lastInsertId: 8 });

    expect(db.exec("UPDATE probe SET value = 'updated' WHERE id = 1"))
      .toEqual({ changes: 1, lastInsertId: 8 });
  });
});
