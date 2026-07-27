import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';
import type { RowCodec, SqlRow } from './codecs';
import {
  execute,
  queryAll,
  queryAllRaw,
  queryOne,
  queryOneRaw,
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

  /**
   * Read rows THROUGH a codec. All three parameters are required: pass
   * `undefined` for `bind` when there is nothing to bind. Dropping the codec is
   * a compile error (`TS2554`), never a silent `SqlRow` — proved from the type
   * side by `tests/types/codec-required.type-test.ts`.
   *
   * For a genuinely raw read, use `allRaw`, which says so in its name.
   */
  all<T>(
    sql: string,
    bind: QueryBindings | undefined,
    codec: RowCodec<T>,
  ): T[] {
    return queryAll(this.connection, sql, bind, codec);
  }

  one<T>(
    sql: string,
    bind: QueryBindings | undefined,
    codec: RowCodec<T>,
  ): T | null {
    return queryOne(this.connection, sql, bind, codec);
  }

  /** Undecoded rows, for runtime-shaped queries and storage-level assertions. */
  allRaw(sql: string, bind?: QueryBindings): SqlRow[] {
    return queryAllRaw(this.connection, sql, bind);
  }

  oneRaw(sql: string, bind?: QueryBindings): SqlRow | null {
    return queryOneRaw(this.connection, sql, bind);
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
