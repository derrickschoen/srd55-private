import { getTableName, is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { createSelectSchema } from 'drizzle-zod';
import type { core } from 'zod';
import * as schema from '../db/schema/index';

/**
 * Composes `src/domain/contracts/generated/column-facts.ts`.
 *
 * WHY A GENERATED ARTIFACT AND NOT A DIRECT `drizzle-zod` CALL.
 * `createSelectSchema(table)` is a VALUE call on a Drizzle table. Calling it
 * from `src/` would resolve `drizzle-orm` into both runtime entry graphs and
 * the rollup guard in `vite.config.ts` would fail the build — correctly, since
 * Drizzle is build-time only. So `drizzle-zod` runs HERE, at build time, and
 * what reaches the runtime is the small set of facts it established.
 *
 * WHAT `drizzle-zod` ACTUALLY ESTABLISHES, MEASURED.
 * Every column in this schema declared through `db/schema/columns.ts`
 * (`varchar`, `sqlText`, `datetime`, `tinyint1`) is a Drizzle `customType`, and
 * a `customType` carries no runtime type information drizzle-zod can map. It
 * emits `z.any()` for all of them. Only Drizzle's built-in `integer()` produces
 * a real schema. So drizzle-zod is authoritative here for exactly three facts —
 * which columns exist, whether each is nullable, and which ones it could type —
 * and `src/domain/contracts/rows.ts` is required to supply an explicit
 * refinement for every column it could not. A `z.any()` never reaches a
 * contract: the refinement map is `satisfies Record<DegradedColumnKey, …>`, so
 * an unrefined degraded column is a compile error.
 *
 * PURITY: no writes, no filesystem reads. `scripts/build-row-contracts.ts` is
 * the only writer, so `tests/unit/contracts/column-facts-generation.test.ts`
 * cannot make itself pass.
 */

const BANNER = [
  '// GENERATED FILE — DO NOT EDIT BY HAND.',
  '// Source of truth: db/schema/*.ts, read through drizzle-zod.',
  '// Regenerate with `npm run db:contracts`.',
  '// tests/unit/contracts/column-facts-generation.test.ts fails if it drifts.',
].join('\n');

const DOC = `/**
 * Per-column facts for every table in the schema.
 *
 *  - \`notNull\`: whether the column is declared NOT NULL. A contract that
 *    refuses a null the column permits is a data-loss bug (decisions D6/D6b),
 *    so this is derived, never asserted by hand.
 *  - \`base: 'integer'\`: drizzle-zod produced a real integer schema for the
 *    column, and the row contract uses it.
 *  - \`base: 'degraded'\`: drizzle-zod produced \`z.any()\` because the column is
 *    a \`customType\`. The row contract MUST supply an explicit refinement;
 *    \`DegradedColumnKey\` below makes omitting one a compile error.
 */`;

type ColumnBase = 'integer' | 'degraded';

export interface ColumnFact {
  readonly base: ColumnBase;
  readonly notNull: boolean;
}

/**
 * Unwraps whatever drizzle-zod produced for one column down to the node that
 * says what it validates, then classifies it.
 *
 * `z.any()` is the degradation signal and it is the ONLY thing that maps to
 * `'degraded'`. Anything drizzle-zod types that is neither `any` nor a number
 * would be a schema change this generator has not been taught about, and it
 * throws rather than guessing — a silent `'degraded'` there would demand a
 * refinement for a column drizzle-zod could have validated.
 */
function classify(node: core.$ZodType, table: string, column: string): ColumnBase {
  const def = node._zod.def as { type: string; innerType?: core.$ZodType };
  if (def.type === 'nullable' || def.type === 'optional') {
    if (def.innerType === undefined) {
      throw new Error(`${table}.${column}: wrapper without an inner type.`);
    }
    return classify(def.innerType, table, column);
  }
  if (def.type === 'any') {
    return 'degraded';
  }
  if (def.type === 'number' || def.type === 'int') {
    return 'integer';
  }
  throw new Error(
    `${table}.${column}: drizzle-zod produced an unhandled "${def.type}" node. ` +
      'Teach scripts/compose-row-contracts.ts how to classify it.',
  );
}

function tableFacts(
  table: SQLiteTable,
): readonly (readonly [string, ColumnFact])[] {
  const name = getTableName(table);
  const shape = (
    createSelectSchema(table) as unknown as {
      shape: Record<string, core.$ZodType>;
    }
  ).shape;
  // Declaration order, which is also the order `SELECT *` reports — the order a
  // reader of the generated file can check against db/schema/*.ts by eye.
  return getTableConfig(table).columns.map((column) => {
    const node = shape[column.name];
    if (node === undefined) {
      throw new Error(`${name}.${column.name}: drizzle-zod emitted no schema.`);
    }
    return [
      column.name,
      { base: classify(node, name, column.name), notNull: column.notNull },
    ] as const;
  });
}

function allTables(): readonly SQLiteTable[] {
  // The namespace also exports column helpers and rationale strings; `is` is
  // the only reliable discriminator.
  return (Object.values(schema) as readonly unknown[])
    .filter((value): value is SQLiteTable => is(value, SQLiteTable))
    .sort((left, right) =>
      getTableName(left) < getTableName(right)
        ? -1
        : getTableName(left) > getTableName(right)
          ? 1
          : 0,
    );
}

const REFERENCE_BANNER = [
  '// GENERATED FILE — DO NOT EDIT BY HAND.',
  '// Source of truth: the foreign keys declared in db/schema/*.ts.',
  '// Regenerate with `npm run db:contracts`.',
  '// tests/unit/contracts/column-facts-generation.test.ts fails if it drifts.',
].join('\n');

const REFERENCE_DOC = `/**
 * Every foreign key in the schema, as the audit needs to see it.
 *
 * The semantic audit of a quarantined candidate database derives its
 * cross-character checks from this list rather than from a hand-written set of
 * table names, so a reference added to \`db/schema/*.ts\` is audited without
 * anybody remembering to add it.
 *
 * The column tuples matter and are not decoration. SQLite's
 * \`PRAGMA foreign_key_check\` proves a referenced ROW exists; it says nothing
 * about WHOSE row it is. A single-column reference between two character-owned
 * tables — \`character_source_instances.parent_source_instance_id\` is the one
 * the schema actually has — can therefore point at another character's row and
 * still pass every SQLite check. A reference whose tuple INCLUDES
 * \`character_id\` (\`spell_selection_slots\`) cannot, which is why the tuple has
 * to be visible here.
 */`;

export function composeReferenceFacts(): string {
  const rows = allTables().flatMap((table) => {
    const name = getTableName(table);
    return getTableConfig(table).foreignKeys.map((key) => {
      const reference = key.reference();
      const columns = reference.columns.map((column) => column.name);
      const targetColumns = reference.foreignColumns.map(
        (column) => column.name,
      );
      return (
        `  {\n` +
        `    table: '${name}',\n` +
        `    columns: [${columns.map((column) => `'${column}'`).join(', ')}],\n` +
        `    target: '${getTableName(reference.foreignTable)}',\n` +
        `    targetColumns: [${targetColumns
          .map((column) => `'${column}'`)
          .join(', ')}],\n` +
        `  },`
      );
    });
  });

  const tail = `
export type ForeignKeyFact = (typeof FOREIGN_KEY_FACTS)[number];
`;

  return `${REFERENCE_BANNER}\n\n${REFERENCE_DOC}\nexport const FOREIGN_KEY_FACTS = [\n${rows.join(
    '\n',
  )}\n] as const;\n${tail}`;
}

export function composeColumnFacts(): string {
  const tables = allTables();
  const body = tables
    .map((table) => {
      const columns = tableFacts(table)
        .map(
          ([column, fact]) =>
            `    ${column}: { base: '${fact.base}', notNull: ${String(
              fact.notNull,
            )} },`,
        )
        .join('\n');
      return `  ${getTableName(table)}: {\n${columns}\n  },`;
    })
    .join('\n');

  const tail = `
type Facts = typeof COLUMN_FACTS;

/** Every table name the facts cover — the whole schema, by construction. */
export type FactTable = keyof Facts;

/** \`\`\`\`table.column\`\`\`\` keys for the columns drizzle-zod could not type. */
export type DegradedColumnKey<T extends FactTable> = {
  [C in keyof Facts[T]]: Facts[T][C] extends { base: 'degraded' }
    ? \`\${T & string}.\${C & string}\`
    : never;
}[keyof Facts[T]];

/** \`\`\`\`table.column\`\`\`\` keys for every column of the given tables. */
export type AnyColumnKey<T extends FactTable> = {
  [C in keyof Facts[T]]: \`\${T & string}.\${C & string}\`;
}[keyof Facts[T]];
`;

  return `${BANNER}\n\n${DOC}\nexport const COLUMN_FACTS = {\n${body}\n} as const;\n${tail}`;
}
