import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/sqlite-core';

/**
 * Column primitives for the declared types this schema uses: `VARCHAR`, `TEXT`,
 * `DATETIME` and `TINYINT(1)`.
 *
 * THEIR ORIGIN IS THE LARAVEL SQLITE GRAMMAR AND THAT IS NO LONGER A REASON.
 * D7 retired schema fidelity to the app this replaced, and F10 removed the
 * oracle that pinned these spellings. What keeps them is narrower and worth
 * saying plainly, because it is the only thing left holding them up: they carry
 * a DOMAIN TYPE through `customType`, so `varchar<SlotState>()` states in the
 * type system what a bare `text()` would not, and renaming the emitted keyword
 * would move `databaseSchemaSignature` for every existing image without
 * changing a single stored value. Retyping them is a defensible change to make
 * deliberately; it is not one to make as a side effect.
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

/** `VARCHAR`, carrying a domain string type. */
export const varchar = <T extends string = string>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'VARCHAR',
  });

/** `TEXT`, carrying a domain string type. */
export const sqlText = <T extends string = string>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'TEXT',
  });

/** `DATETIME`, held as ISO text. */
export const datetime = <T extends string = string>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => 'DATETIME',
  });

/**
 * THERE IS NO `int` HELPER HERE, AND THAT IS FORCED RATHER THAN CHOSEN.
 *
 * Integer columns use Drizzle's built-in `integer()`, which emits `integer` in
 * lowercase. A `customType` cannot be used: `primaryKey({ autoIncrement: true })`
 * is only available on `SQLiteIntegerBuilder`, and every table has an
 * AUTOINCREMENT primary key that `sqlite_sequence` depends on
 * (`src/backup/character-backup.ts` reserves save-point ids through it). The
 * alternative — `customType` for plain integers and `integer()` for PKs —
 * would produce an artifact that is inconsistent with itself for no gain.
 */

/**
 * `TINYINT(1)`, a boolean.
 *
 * The TS type is `boolean` because that is what the row contract guarantees;
 * SQLite stores 0/1 and enforces nothing. Zod's `sqlBool` is what actually
 * converts and rejects out-of-range values at runtime.
 */
export const tinyint1 = customType<{ data: boolean; driverData: number }>({
  dataType: () => 'TINYINT(1)',
});

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
 * The shared payload rule for every structured equipment-package line.
 *
 * `gear` carries neither catalog reference, while each mechanical kind carries
 * exactly its own reference. Keeping the CASE here means the background and
 * class tables cannot drift into two definitions of what an equipment kind
 * means.
 */
export const equipmentItemPayload = (
  kindColumn: string,
  weaponColumn: string,
  armorColumn: string,
) =>
  sql.raw(`CASE ${columnRef(kindColumn)}
        WHEN 'weapon' THEN ${columnRef(weaponColumn)} IS NOT NULL
          AND ${columnRef(armorColumn)} IS NULL
        WHEN 'armor' THEN ${columnRef(armorColumn)} IS NOT NULL
          AND ${columnRef(weaponColumn)} IS NULL
        ELSE ${columnRef(weaponColumn)} IS NULL AND ${columnRef(armorColumn)} IS NULL
      END`);

/**
 * `typeof(column) = 'integer' AND column IN (…)` over a closed INTEGER
 * vocabulary.
 *
 * {@link oneOf} CANNOT DO THIS JOB, and the reason is the one
 * `class_sheet_traits` stated in a comment above a hand-written literal until
 * this helper existed: `enumLiteral` single-quotes its members, so `oneOf` over
 * die sizes would emit `hit_die IN ('6', '8', …)`. That parses — and given
 * SQLite's cross-type ordering it means something else entirely, because a
 * stored INTEGER 6 does not compare equal to the TEXT `'6'`. The CHECK would
 * then reject every row this application writes.
 *
 * THE `typeof` LIMB IS INERT ON BOTH COLUMNS THIS GUARDS TODAY, AND THIS
 * COMMENT SAID THE OPPOSITE UNTIL A REVIEW MEASURED IT. It claimed a REAL `8.0`
 * "compares equal to 8 and would otherwise pass" a bare `IN` list. It does not:
 * `hit_die` and `martial_arts_die` are both declared `integer`, so INTEGER
 * AFFINITY CONVERTS THE REAL TO AN INTEGER BEFORE THE CHECK IS EVALUATED, and
 * `typeof` then sees `integer` either way. Run over 24 values — 8, 8.0, 8.5,
 * 6.0, `'8'`, `'8.0'`, `' 8 '`, `'8e0'`, `'eight'`, `x'38'`, 2^53, NaN,
 * Infinity, 1e19 and the rest — `typeof(c) = 'integer' AND c IN (…)` and a bare
 * `c IN (…)` accept and reject IDENTICALLY in every case, as bound parameters
 * and as literals. 8.5 and `x'38'` are refused by the bare list too.
 *
 * WHERE IT IS LOAD-BEARING, AND WHY IT STAYS. The mechanism the old comment
 * described is real; it just does not apply to a column with INTEGER affinity.
 * On a column with BLOB or NO affinity nothing converts, `8.0` stays a REAL, and
 * `8.0 IN (6, 8, 10, 12)` is TRUE — the bare list stores a REAL where the type
 * says integer, and the `typeof` limb is the only thing that refuses it. So the
 * limb is what makes THIS HELPER'S guarantee — "an INTEGER equal to one of these"
 * — a property of the helper rather than of its two current call sites' declared
 * types. `tests/unit/schema-check-constraints.test.ts` executes both halves of
 * that claim against the engine, so it cannot rot back into a plausible story.
 *
 * (It is emphatically NOT redundant in {@link integerAtLeast}, whose reason it
 * was originally borrowed from: there a bare `>= 1` admits every text value on
 * an INTEGER column, because affinity leaves `'two'` as TEXT and SQLite orders
 * TEXT above every number.)
 *
 * The vocabulary is passed as the VALUE array from `src/domain/enums.ts`, so
 * there is no second transcription to keep in step: narrowing
 * `martialArtsDieSizes` narrows this CHECK at the next `npm run db:schema`.
 */
export const integerOneOf = (column: string, values: readonly number[]) =>
  sql.raw(
    `typeof(${columnRef(column)}) = 'integer' AND ` +
      `${columnRef(column)} IN (${values.map(bound).join(', ')})`,
  );

/**
 * `(column IS NULL OR column IN (…))`.
 *
 * The null limb is deliberate and load-bearing: these columns are nullable
 * because the absence is a real domain state (no subclass ability override
 * chosen; a user-invented weapon with no mastery property), and a CHECK that
 * forgot the null limb would turn a defended null into a rejected row.
 *
 * THE OUTER PARENTHESES ARE THE FIX FOR A TRAP THIS HELPER LAID AND SOMEBODY
 * FELL INTO, and they are not cosmetic. SQL binds `AND` tighter than `OR`, so
 * composing an un-parenthesised `A IS NULL OR A IN (…)` into a larger
 * constraint —
 *
 *     CHECK(a IS NULL OR a IN ('x') AND b IS NOT NULL)
 *
 * — parses as `a IS NULL OR (a IN ('x') AND b IS NOT NULL)`, so the whole
 * constraint becomes TRUE for every row with a NULL `a` and the second clause
 * never runs. That is a constraint that reads correctly, parses, and enforces
 * NOTHING for exactly the rows a nullable column is full of. It was written
 * while adding the structured spell-range constraints, generated, and caught by
 * reading the emitted DDL rather than by any test.
 *
 * {@link oneOf}, {@link integerOneOf} and {@link integerAtLeast} do NOT need
 * this: their output is a chain of `AND`s with no `OR` in it, so composition
 * cannot re-associate them. The two helpers with a top-level `OR` are the two
 * that carry the hazard, and both now close it at the source rather than
 * relying on every caller to remember.
 *
 * THE EMITTED DDL OF FOURTEEN PRE-EXISTING CONSTRAINTS CHANGED WHEN THESE
 * PARENTHESES WERE ADDED, and it is recorded here because the commit that added
 * them said the opposite. Measured against `d4d2871` by diffing
 * `src/db/schema.sql`: fourteen CHECK bodies gained a wrapping pair. EIGHT are
 * this helper's — `character_class_levels_spellcasting_ability_override`,
 * `character_weapons_mastery_property`,
 * `character_weapons_proficiency_category`,
 * `class_definitions_spellcasting_ability`, and the `effect_kind` and
 * `effect_weapon_scope` pair on both `named_features` and `subclass_features`.
 * SIX are {@link nullOrIntegerAtLeast}'s —
 * `armor_templates_strength_requirement`,
 * `character_armor_strength_requirement`, `character_species_base_speed`,
 * `characters_proficiency_bonus_override`, and `effect_attack_count` on both
 * `named_features` and `subclass_features`. A fifteenth line moved in the diff
 * without its CHECK
 * body changing at all — `spell_versions_effect_reliability_category_check`
 * merely stopped being the last constraint and gained a comma.
 *
 * The added parentheses are semantically inert, but
 * `databaseSchemaSignature()` in `src/db/database-lifecycle.ts` compares this
 * exact text, so "unchanged" is a claim about which stored images still
 * validate — and it was wrong. It costs nothing here only because the same
 * change adds seven columns to `spell_versions`, which moves the signature
 * regardless; a reader must not carry the "unchanged" reasoning into a future
 * change that does not.
 */
export const nullOrOneOf = (column: string, values: readonly string[]) => {
  const reference = columnRef(column);
  return sql.raw(
    `(${reference} IS NULL OR ${reference} IN (${values
      .map(enumLiteral)
      .join(', ')}))`,
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

/**
 * `(column IS NULL OR` {@link integerAtLeast}`)` — for a defended-null column.
 *
 * Parenthesised as a whole for the reason {@link nullOrOneOf} spells out: a
 * top-level `OR` composed into a larger `AND` re-associates and silently stops
 * enforcing the rest of the constraint.
 */
export const nullOrIntegerAtLeast = (column: string, minimum: number) =>
  sql.raw(
    `(${columnRef(column)} IS NULL OR (typeof(${columnRef(column)}) = 'integer' ` +
      `AND ${columnRef(column)} >= ${bound(minimum)}))`,
  );

/** Nullable TEXT whose non-null representation is non-empty and bounded. */
export const nullOrTextLengthAtMost = (
  column: string,
  maximum: number,
) =>
  sql.raw(
    `(${columnRef(column)} IS NULL OR (` +
      `typeof(${columnRef(column)}) = 'text' AND ` +
      `length(${columnRef(column)}) BETWEEN 1 AND ${bound(maximum)}))`,
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
