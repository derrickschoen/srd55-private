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

export function queryAll<T = SqlRow>(
  db: Database,
  sql: string,
  bind?: QueryBindings,
  codec?: RowCodec<T>,
): T[] {
  const rows = db.selectObjects(sql, bindings(bind));
  return rows.map((row) => {
    const cloned = cloneSqlRow(row);
    return codec === undefined ? (cloned as T) : codec(cloned);
  });
}

export function queryOne<T = SqlRow>(
  db: Database,
  sql: string,
  bind?: QueryBindings,
  codec?: RowCodec<T>,
): T | null {
  const row = db.selectObject(sql, bindings(bind));
  if (row === undefined) {
    return null;
  }
  const cloned = cloneSqlRow(row);
  return codec === undefined ? (cloned as T) : codec(cloned);
}

export function queryScalar<T extends SqlValue = SqlValue>(
  db: Database,
  sql: string,
  bind?: QueryBindings,
): T | null {
  const value = db.selectValue(sql, bindings(bind));
  return value === undefined ? null : (value as T);
}
