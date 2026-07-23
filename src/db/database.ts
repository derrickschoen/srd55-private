import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';
import type { RowCodec, SqlRow } from './codecs';
import {
  execute,
  queryAll,
  queryOne,
  queryScalar,
  type ExecuteResult,
  type QueryBindings,
} from './query';
import {
  TransactionRunner,
  type TransactionMode,
} from './transaction';

export const requiredConnectionPragmas =
  'PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE;';

export function prepareConnection(db: Database): void {
  db.exec(requiredConnectionPragmas);
  if (Number(db.selectValue('PRAGMA foreign_keys')) !== 1) {
    throw new Error('SQLite foreign-key enforcement could not be enabled.');
  }
}

export function hasApplicationSchema(db: Database): boolean {
  return (
    Number(
      db.selectValue(
        `SELECT count(*)
         FROM sqlite_schema
         WHERE type = 'table' AND name = 'characters'`,
      ),
    ) === 1
  );
}

export class DatabaseContext {
  readonly #transactions: TransactionRunner;

  constructor(readonly connection: Database) {
    this.#transactions = new TransactionRunner(connection);
  }

  exec(sql: string, bind?: QueryBindings): ExecuteResult {
    return execute(this.connection, sql, bind);
  }

  all<T = SqlRow>(
    sql: string,
    bind?: QueryBindings,
    codec?: RowCodec<T>,
  ): T[] {
    return queryAll(this.connection, sql, bind, codec);
  }

  one<T = SqlRow>(
    sql: string,
    bind?: QueryBindings,
    codec?: RowCodec<T>,
  ): T | null {
    return queryOne(this.connection, sql, bind, codec);
  }

  scalar<T extends SqlValue = SqlValue>(
    sql: string,
    bind?: QueryBindings,
  ): T | null {
    return queryScalar<T>(this.connection, sql, bind);
  }

  transaction<T>(
    callback: (db: DatabaseContext) => T,
    mode: TransactionMode = 'IMMEDIATE',
  ): T {
    return this.#transactions.run(() => callback(this), mode);
  }

  get transactionDepth(): number {
    return this.#transactions.depth;
  }

  close(): void {
    this.connection.close();
  }

  get isOpen(): boolean {
    return this.connection.isOpen();
  }
}
