import type {
  BindableValue,
  BindingSpec,
  Database,
  SqlValue,
} from '@sqlite.org/sqlite-wasm';
import { cloneSqlRow, type RowCodec, type SqlRow } from './codecs';

export type QueryBindings =
  | readonly BindableValue[]
  | Record<string, BindableValue>
  | SqlValue
  | boolean;

export interface ExecuteResult {
  changes: number;
  lastInsertId: number;
}

function bindings(bind: QueryBindings | undefined): BindingSpec | undefined {
  return bind as BindingSpec | undefined;
}

export function execute(
  db: Database,
  sql: string,
  bind?: QueryBindings,
): ExecuteResult {
  if (bind === undefined) {
    db.exec(sql);
  } else {
    db.exec({ sql, bind: bindings(bind) as BindingSpec });
  }
  const lastInsertId = db.selectValue('SELECT last_insert_rowid()');
  return {
    changes: Number(db.changes()),
    lastInsertId: lastInsertId === undefined ? 0 : Number(lastInsertId),
  };
}

/**
 * The DECODED read. `codec` is REQUIRED, and `bind` is positional-required
 * (pass `undefined` when there is nothing to bind), so that omitting the codec
 * is a compile error rather than a silent `SqlRow`.
 *
 * Deliberately NOT overloaded. `Parameters<F>` resolves to the LAST overload
 * only, so an overload pair would give the type-level proof in
 * `tests/types/codec-required.type-test.ts` a blind spot — in exactly the
 * guarantee this signature exists to make unforgeable.
 *
 * Want the row as SQLite returned it? Say so by name: `queryAllRaw`.
 */
export function queryAll<T>(
  db: Database,
  sql: string,
  bind: QueryBindings | undefined,
  codec: RowCodec<T>,
): T[] {
  const rows = db.selectObjects(sql, bindings(bind));
  return rows.map((row) => codec(cloneSqlRow(row)));
}

export function queryOne<T>(
  db: Database,
  sql: string,
  bind: QueryBindings | undefined,
  codec: RowCodec<T>,
): T | null {
  const row = db.selectObject(sql, bindings(bind));
  return row === undefined ? null : codec(cloneSqlRow(row));
}

/**
 * The RAW read: the caller genuinely wants the undecoded row, because the table
 * or the column set is only known at runtime (`PRAGMA table_info`, `SELECT *`
 * over a table name drawn from a list), or because a test is asserting on what
 * is in storage and must not read it back through the decoder under test.
 *
 * It has a NAME so that "I want the raw row" is a visible choice in review
 * rather than an omission nobody notices.
 */
export function queryAllRaw(
  db: Database,
  sql: string,
  bind?: QueryBindings,
): SqlRow[] {
  return db.selectObjects(sql, bindings(bind)).map(cloneSqlRow);
}

export function queryOneRaw(
  db: Database,
  sql: string,
  bind?: QueryBindings,
): SqlRow | null {
  const row = db.selectObject(sql, bindings(bind));
  return row === undefined ? null : cloneSqlRow(row);
}

export function queryScalar<T extends SqlValue = SqlValue>(
  db: Database,
  sql: string,
  bind?: QueryBindings,
): T | null {
  const value = db.selectValue(sql, bindings(bind));
  return value === undefined ? null : (value as T);
}
