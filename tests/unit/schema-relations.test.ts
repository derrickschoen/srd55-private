import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTableRelationsHelpers,
  getTableName,
  One,
  Relations,
  type Column,
} from 'drizzle-orm';
import * as schema from '../../db/schema/index';
import schemaSql from '../../src/db/schema.sql?raw';

/**
 * RELATIONS ↔ FOREIGN KEYS, IN BOTH DIRECTIONS.
 *
 * `db/schema/relations.ts` declares the object graph. Declared relationships
 * that no constraint backs are documentation that silently rots, so this test
 * walks the edges against `PRAGMA foreign_key_list` BOTH ways:
 *
 *   forward — every declared `one()` edge has a matching FK constraint;
 *   reverse — every FK constraint has a matching declared `one()` edge.
 *
 * Comparison is by CONSTRAINT SET, not row count. `PRAGMA foreign_key_list`
 * returns one row per column, so the two composite foreign keys contribute two
 * rows each: 40 constraints, 42 rows. Counting rows would let a composite key
 * degrade into two single-column keys unnoticed — which would silently drop
 * exactly the cross-character and wrong-class protections those keys exist for.
 */

/** The public surface of a `One` relation's field/reference pairing. */
interface OneRelationConfig {
  readonly fields: readonly Column[];
  readonly references: readonly Column[];
}

type DeclaredEdge = `${string}: ${string} -> ${string}.${string}`;

function edgeKey(
  fromTable: string,
  fromColumns: readonly string[],
  toTable: string,
  toColumns: readonly string[],
): DeclaredEdge {
  return `${fromTable}: ${fromColumns.join(',')} -> ${toTable}.${toColumns.join(',')}`;
}

function declaredEdges(): DeclaredEdge[] {
  const edges: DeclaredEdge[] = [];
  for (const value of Object.values(schema)) {
    if (!(value instanceof Relations)) {
      continue;
    }
    const helpers = createTableRelationsHelpers(value.table);
    const built = value.config(
      helpers as Parameters<typeof value.config>[0],
    ) as Readonly<Record<string, unknown>>;

    for (const relation of Object.values(built)) {
      // `many()` edges carry no columns — they are the inverse view of a
      // `one()` edge and are covered by the forward check on that side.
      if (!(relation instanceof One)) {
        continue;
      }
      const config = (relation as One & { readonly config?: OneRelationConfig })
        .config;
      if (config === undefined) {
        throw new Error(
          `Relation on ${getTableName(value.table)} declares no fields.`,
        );
      }
      edges.push(
        edgeKey(
          getTableName(value.table),
          config.fields.map((column) => column.name),
          getTableName(relation.referencedTable),
          config.references.map((column) => column.name),
        ),
      );
    }
  }
  return edges.sort();
}

function constraintEdges(db: Database): DeclaredEdge[] {
  const edges: DeclaredEdge[] = [];
  const tables = db
    .selectValues(
      `SELECT name FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .map(String);

  for (const table of tables) {
    const grouped = new Map<number, Record<string, unknown>[]>();
    for (const row of db.selectObjects(
      `PRAGMA foreign_key_list("${table}")`,
    )) {
      const id = Number(row.id);
      grouped.set(id, [...(grouped.get(id) ?? []), row]);
    }
    for (const group of grouped.values()) {
      const ordered = [...group].sort(
        (left, right) => Number(left.seq) - Number(right.seq),
      );
      edges.push(
        edgeKey(
          table,
          ordered.map((row) => String(row.from)),
          String(ordered[0]?.table),
          ordered.map((row) => String(row.to)),
        ),
      );
    }
  }
  return edges.sort();
}

let sqlite3: Sqlite3Static;
let db: Database;

beforeAll(async () => {
  sqlite3 = await sqlite3InitModule();
  db = new sqlite3.oo1.DB(':memory:', 'c');
  db.exec(schemaSql);
});

afterAll(() => {
  db.close();
});

describe('declared relations match the foreign keys', () => {
  it('budgets 47 constraints across 49 PRAGMA rows', () => {
    const tables = db
      .selectValues(
        `SELECT name FROM sqlite_schema
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      )
      .map(String);
    const rowCount = tables.reduce(
      (total, table) =>
        total + db.selectObjects(`PRAGMA foreign_key_list("${table}")`).length,
      0,
    );

    // 33 Laravel-derived constraints, plus the three the weapon tables add
    // (character_weapons -> characters, and one per mastery table into
    // class_definitions), plus the four the origins tables add: three
    // character-side tables into `characters`, and `species_template_traits`
    // into `species_templates` — the only parent/child edge in the origins
    // catalog. There is deliberately NO edge from either character-side table
    // into a template; that is D1b, and the reverse direction of the next test
    // is what would catch one appearing.
    //
    // None of the seven is composite, so the row count rises by exactly seven
    // as well and the two composite Laravel keys are still the only ones.
    // 36 edges across 38 rows before either native track. Origins adds 4,
    // the sheet core 7 — one per class-content table into class_definitions.
    // Neither catalog table adds an edge: by D1b a template points at nothing
    // and nothing points at it, which holds for armour as it did for weapons.
    // None of the eleven is composite, so the row count rises by eleven too and
    // the two composite Laravel keys are still the only ones.
    expect(constraintEdges(db)).toHaveLength(47);
    expect(rowCount).toBe(49);
  });

  it('declares a relation for every foreign key, and a foreign key for every relation', () => {
    // One assertion, both directions: a set equality catches an unbacked
    // relation and an undeclared constraint with the same diff.
    expect(declaredEdges()).toEqual(constraintEdges(db));
  });

  it('keeps both composite foreign keys composite', () => {
    const edges = declaredEdges();
    expect(edges).toContain(
      'character_class_levels: subclass_definition_id,class_definition_id -> subclass_definitions.id,class_definition_id',
    );
    expect(edges).toContain(
      'spell_selection_slots: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
  });

  it('does not invent a relation for the polymorphic source reference', () => {
    // source_definition_id points into one of three tables depending on
    // source_type. It has no foreign key and must not be modelled as one.
    expect(
      declaredEdges().some((edge) => edge.includes('source_definition_id')),
    ).toBe(false);
  });
});
