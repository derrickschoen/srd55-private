import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/sqlite-core';

/**
 * Column primitives that reproduce the declared types Laravel's SQLite grammar
 * emitted, so regenerating `src/db/schema.sql` from these declarations does not
 * move the Laravel-derived parity oracle in `tests/unit/schema.test.ts`.
 *
 * Drizzle's own `text()` would emit `text` and its `integer({mode:'boolean'})`
 * would emit `integer`; Laravel emitted `VARCHAR`, `DATETIME` and `TINYINT(1)`.
 *
 * NOTE ON `toDriver`/`fromDriver`: deliberately absent. Drizzle NEVER RUNS in
 * this project — it is a build-time schema authoring tool whose types the Zod
 * contracts bind against. Declaring codecs here would imply a decode step that
 * does not exist. Runtime decoding is INTENDED to become Zod's job at the query
 * boundaries. That does not exist yet: `src/domain/contracts/` holds only
 * build-time table derivations, there is no runtime Zod row schema anywhere,
 * and so nothing currently validates or converts these values at runtime.
 *
 * Each helper is generic in its domain type so branded ids and enums declared
 * in `src/domain/ids.ts` flow through `$type` into `InferSelectModel`, which is
 * what will let the contract bindings compare brands rather than bare
 * primitives once those bindings are written.
 */

/** Laravel `string()` → `VARCHAR`. */
export const varchar = <T extends string = string>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'VARCHAR',
  });

/** Laravel `text()` → `TEXT`. */
export const sqlText = <T extends string = string>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'TEXT',
  });

/** Laravel `timestamp()`/`dateTime()` → `DATETIME`. */
export const datetime = <T extends string = string>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'DATETIME',
  });

/**
 * DELIBERATE, RECORDED DIVERGENCE FROM LARAVEL'S EMITTED TEXT.
 *
 * Integer columns use Drizzle's built-in `integer()`, which emits the declared
 * type in lowercase (`integer`) where Laravel emitted `INTEGER`. A
 * `customType` cannot be used here: `primaryKey({ autoIncrement: true })` is
 * only available on `SQLiteIntegerBuilder`, and 33 of the 38 tables have an
 * AUTOINCREMENT primary key that `sqlite_sequence` depends on
 * (`src/backup/character-backup.ts` reserves save-point ids through it). The
 * alternative — `customType` for plain integers and `integer()` for PKs —
 * would produce an artifact that is inconsistent with itself for no gain.
 *
 * Why this does not move the Laravel parity oracle: `laravelColumnMetadataHash`
 * in `tests/unit/schema.test.ts` normalises the declared type with
 * `String(column.type).toLowerCase()`, and no other expectation there
 * (`expectedColumns`, `expectedNotNull`, `expectedDefaults`,
 * `expectedNamedIndexes`, `expectedUniqueGroups`, `expectedForeignKeys`) reads
 * a declared type at all. Behaviour is unchanged because SQLite resolves type
 * affinity case-insensitively.
 */

/**
 * Laravel `boolean()` → `TINYINT(1)`.
 *
 * The TS type is `boolean` because that is what the row contract guarantees;
 * SQLite stores 0/1 and enforces nothing. Zod's `sqlBool` is what actually
 * converts and rejects out-of-range values at runtime.
 */
export const tinyint1 = customType<{ data: boolean; driverData: number }>({
  dataType: () => 'TINYINT(1)',
});

/**
 * Laravel quoted every scalar default literal, including numeric ones:
 * `DEFAULT '0'`, `DEFAULT '10'`, `DEFAULT '2024'`. `PRAGMA table_info` reports
 * `dflt_value` verbatim including the quotes, and `expectedDefaults` in the
 * parity oracle pins those exact strings, so the quoting is load-bearing.
 */
export const laravelDefault = (literal: string) => sql.raw(`'${literal}'`);

/** The one unquoted default in the schema (`failed_jobs.failed_at`). */
export const currentTimestamp = sql`CURRENT_TIMESTAMP`;
