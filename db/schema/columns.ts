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
 * only available on `SQLiteIntegerBuilder`, and every one of the 30 tables has
 * an AUTOINCREMENT primary key that `sqlite_sequence` depends on
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

/* ==========================================================================
 * CHECK CONSTRAINT HELPERS
 * ========================================================================== */

/**
 * WHAT A CHECK CONSTRAINT DOES — AND DOES NOT DO — TO AN EXISTING DATABASE.
 *
 * SAY IT PLAINLY: adding a CHECK here does NOT retroactively constrain a
 * database that already exists on the user's machine. There is no migration
 * runner in this project — no `user_version`, no migrations directory, and
 * `DatabaseLifecycle.open()` applies `src/db/schema.sql` ONLY when the image
 * has no application tables yet. An existing OPFS image keeps the verbatim
 * `CREATE TABLE` text it was created with, and that text has no CHECK in it.
 *
 * It does not silently keep the old rules either. `databaseSchemaSignature()`
 * in `src/db/database-lifecycle.ts` hashes `sqlite_schema.sql` — the DDL TEXT,
 * of which a CHECK is part — and compares it against the signature of the
 * build's own schema. So an image created before these constraints existed
 * FAILS TO OPEN with `Database image schema does not match the application
 * schema.`, which `bootDatabase` turns into `status: 'schema_mismatch'`, after
 * which only `system.exportDatabase` and `system.reset` are dispatchable. The
 * user exports their bytes and resets; they are not locked out. The same
 * applies to importing a `.sqlite3` image exported before this change.
 *
 * That is not a new class of breakage: ANY schema change already moves the same
 * signature. Portable JSON character backups are unaffected in shape — their
 * rows are INSERTed into a freshly-created schema — but those INSERTs are then
 * subject to these CHECKs, which is the point. Every constraint declared below
 * mirrors a rule some writer or document validator already enforced, so a
 * backup this application produced cannot fail one.
 *
 * WHY DECLARE THEM AT ALL, THEN. Not for the rows we write — for the rows we
 * do not: a hand-edited image, a truncated write, a future writer that forgets.
 * `src/domain/contracts/rows.ts` already refuses these values in a DOCUMENT;
 * these make an IMAGE hold to the same standard.
 */

/**
 * A single-quoted SQL literal for an enum member.
 *
 * The guard is not paranoia about hostile input — every value comes from a
 * frozen `as const` array in `src/domain/enums.ts` — it is a guard against a
 * FUTURE member containing a quote or a backslash and silently producing a
 * CHECK that parses but means something else.
 */
function enumLiteral(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(
      `Enum member ${JSON.stringify(value)} cannot be inlined into a CHECK ` +
        'constraint: it is not a bare identifier or number.',
    );
  }
  return `'${value}'`;
}

/**
 * A backtick-quoted column reference, matching how drizzle-kit already writes
 * every column in the generated DDL.
 *
 * MEASURED, NOT DEFENSIVE. An unquoted column name in a CHECK is not a style
 * question — for a reserved word it is a hard parse error that fails schema
 * application WHOLESALE, so the first table using such a column takes the whole
 * database down. Against sqlite-wasm:
 *
 *     CHECK(grant IN ('a'))     -> parses
 *     CHECK(bucket IN ('a'))    -> parses
 *     CHECK(order IN ('a'))     -> near "order": syntax error
 *     CHECK(index …) / (default …) / (check …) -> same
 *
 * `grant` is why this is not hypothetical: `class_weapon_mastery_grants.grant`
 * is a real column that survives unquoted only because SQLite does not reserve
 * that word. `order` is an entirely ordinary column name for a future table.
 * Quoting removes the question rather than betting on the next name.
 */
function columnRef(column: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) {
    throw new Error(
      `Column ${JSON.stringify(column)} cannot be inlined into a CHECK ` +
        'constraint: it is not a bare identifier.',
    );
  }
  return `\`${column}\``;
}

/**
 * `column IN (…)` over a closed vocabulary.
 *
 * The vocabulary is passed as the VALUE array from `src/domain/enums.ts` — the
 * same module whose TYPE the column's `varchar<T>()` declaration already names.
 * That is one source, not a second transcription: adding a member to the enum
 * widens the CHECK in the next `npm run db:schema`, and there is no list here
 * to forget to update.
 */
export const oneOf = (column: string, values: readonly string[]) =>
  sql.raw(`${columnRef(column)} IN (${values.map(enumLiteral).join(', ')})`);

/**
 * `column IS NULL OR column IN (…)`.
 *
 * The null limb is deliberate and load-bearing: these columns are nullable
 * because the absence is a real domain state (no subclass ability override
 * chosen; a user-invented weapon with no mastery property), and a CHECK that
 * forgot the null limb would turn a defended null into a rejected row.
 */
export const nullOrOneOf = (column: string, values: readonly string[]) => {
  const reference = columnRef(column);
  return sql.raw(
    `${reference} IS NULL OR ${reference} IN (${values
      .map(enumLiteral)
      .join(', ')})`,
  );
};

/**
 * `column` is an integer of at least `minimum`.
 *
 * WHY THE `typeof` LIMB EXISTS, AND WHY ONLY HERE.
 *
 * SQLite's cross-type comparison orders NULL < INTEGER/REAL < TEXT < BLOB, so
 * EVERY text and blob value compares greater than every number. A bare lower
 * bound therefore admits them all — measured against sqlite-wasm:
 *
 *     SELECT 'abc' >= 0            -> 1   (accepted)
 *     SELECT 'abc' BETWEEN 1 AND 20 -> 0  (rejected by the upper limb)
 *
 * INTEGER affinity does not save it: binding `'abc'` to an `INTEGER NOT NULL`
 * column stores TEXT verbatim, because affinity only converts what converts
 * losslessly (`'7'` does become the integer 7, and still satisfies `typeof`).
 *
 * So a constraint written as a bare lower bound protects less than it reads:
 * its rejection set is empty for every non-numeric type. That matters precisely
 * for the threat this file exists for — a hand-edited image or a future writer
 * that forgets — since those are the only ways a text value reaches an integer
 * column at all. `typeof(…) = 'integer'` closes it, and also refuses the
 * non-integral REAL that `BETWEEN` would let through.
 *
 * The `BETWEEN`-form constraints in this schema do NOT need this limb and do
 * not get it: their upper bound already rejects every text and blob value, and
 * a REAL inside a level window is a curiosity rather than the silent-wrong
 * these constraints target. The line is drawn where the measurement draws it,
 * not uniformly for tidiness.
 */
export const integerAtLeast = (column: string, minimum: number) =>
  sql.raw(
    `typeof(${columnRef(column)}) = 'integer' ` +
      `AND ${columnRef(column)} >= ${bound(minimum)}`,
  );

/** `column IS NULL OR` {@link integerAtLeast} — for a defended-null column. */
export const nullOrIntegerAtLeast = (column: string, minimum: number) =>
  sql.raw(
    `${columnRef(column)} IS NULL OR (typeof(${columnRef(column)}) = 'integer' ` +
      `AND ${columnRef(column)} >= ${bound(minimum)})`,
  );

/**
 * An integer bound, refused if it is not one. A float or a `NaN` inlined here
 * would produce a CHECK that parses and silently means something else, which is
 * the same failure {@link enumLiteral} guards against on the value side.
 */
function bound(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error(
      `Bound ${String(value)} cannot be inlined into a CHECK constraint: ` +
        'it is not an integer.',
    );
  }
  return String(value);
}
