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
  it('budgets 91 constraints across 105 PRAGMA rows', () => {
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
    //
    // D19 adds two more, one per class-feature table: `subclass_features` into
    // `subclass_definitions` and `named_features` into `class_definitions`.
    // Neither is composite either. A feature is meaningless without the thing
    // it belongs to, so both cascade — and `named_features` points at the CLASS
    // rather than at any character, because nothing in this schema records a
    // character taking one, which is exactly why its grants are surfaced rather
    // than applied.
    //
    // The four stored sheet inputs add four more, one per table into
    // `characters`, none composite. `character_hit_point_rolls` adds exactly
    // ONE and not two: it is keyed on a class NAME and has no foreign key to
    // `character_class_levels`, deliberately, so that deleting a class cannot
    // cascade away a die the player physically rolled. An edge appearing there
    // is what the reverse direction of the next test would catch.
    //
    // The effect model adds THREE more rows across TWO constraints, and that
    // asymmetry is the assertion worth making: `species_template_trait_effects`
    // adds one plain edge into `species_template_traits`, and
    // `character_effects` adds two — `character_id` into `characters`, plus the
    // COMPOSITE `(source_instance_id, character_id)` into
    // `character_source_instances`, which is two PRAGMA rows for one
    // constraint. It is the third composite key in the schema and the reason
    // `character_source_instances` carries its `(id, character_id)` unique
    // index; without it an effect could be attached to another character's
    // source instance and still pass `PRAGMA foreign_key_check`.
    // FIVE more constraints and five more PRAGMA rows: one each from
    // `spell_version_upcast_levels` and `spell_version_cantrip_upgrade_levels`
    // into `spell_versions` — two tables because upcasting and the Cantrip
    // Upgrade are two mechanics counted in two different kinds of level — and
    // three from `background_equipment_items`, into `background_templates`,
    // `weapon_templates` and `armor_templates`. The last two are what make the
    // owner's *"unless weapon or armor"* a reference rather than a spelling.
    //
    // The skill grants (skills plan, S-A) add TWO more constraints across
    // THREE more PRAGMA rows, the same asymmetry `character_effects`
    // established and for the same reason: `character_id` into `characters`,
    // plus the COMPOSITE `(source_instance_id, character_id)` into
    // `character_source_instances` — the fourth composite key in the schema,
    // and the third use of the `(id, character_id)` unique index, without
    // which a grant could claim another character's source instance.
    //
    // Equipment provenance (E-A) briefly added TWO more constraints across
    // FOUR more PRAGMA rows — a composite edge each on `character_weapons`
    // and `character_armor`. Owner ruling D69 struck the column (migration
    // 0012), so both edges are GONE again and the counts are back where the
    // skills unit left them.
    //
    // AC-1 (D72) adds TWO more constraints across THREE more PRAGMA rows, the
    // identical asymmetry `character_effects` and `character_skill_grants`
    // both established and for the same reason: `character_items.character_id`
    // into `characters`, plus the COMPOSITE
    // `(source_instance_id, character_id)` into `character_source_instances` —
    // the fifth composite key in the schema and the fourth use of the
    // `(id, character_id)` unique index.
    // AC-2a adds one parent edge for each of the three effect-template tables.
    // AC-2b adds two composite ownership edges from effects to items/weapons:
    // two constraints, four PRAGMA rows.
    // D92 adds one character edge and three composite item/character guards:
    // four constraints across seven PRAGMA rows.
    // CI-2a adds ten root-key constraints and three composite registry-child
    // constraints. The latter contribute six PRAGMA rows.
    // GF-1 adds one composite Wizard-acquisition ownership edge, hence one
    // constraint but two PRAGMA rows.
    // GF-2 adds the direct character edge and the composite source ownership
    // edge for Expertise: two constraints across three PRAGMA rows.
    // LU-1 adds three constraints across five PRAGMA rows: character, held
    // class (composite), and nullable feat source (composite).
    expect(constraintEdges(db)).toHaveLength(96);
    expect(rowCount).toBe(113);
  });

  it('declares a relation for every foreign key, and a foreign key for every relation', () => {
    // One assertion, both directions: a set equality catches an unbacked
    // relation and an undeclared constraint with the same diff.
    expect(declaredEdges()).toEqual(constraintEdges(db));
  });

  it('keeps all fifteen composite foreign keys composite', () => {
    const edges = declaredEdges();
    expect(edges).toContain(
      'character_class_levels: subclass_definition_id,class_definition_id -> subclass_definitions.id,class_definition_id',
    );
    expect(edges).toContain(
      'spell_selection_slots: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
    expect(edges).toContain(
      'wizard_spellbook_entries: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
    // The third, and the one that matters most here: a relation declared on
    // `source_instance_id` alone would describe a constraint the database does
    // not have, and would let a reader believe an effect cannot cross
    // characters when only the composite key stops it.
    expect(edges).toContain(
      'character_effects: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
    expect(edges).toContain(
      'character_skill_grants: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
    expect(edges).toContain(
      'character_skill_expertise_grants: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
    for (const slot of [1, 2, 3]) {
      expect(edges).toContain(
        `character_attunement_slots: slot_${String(slot)}_item_id,character_id -> character_items.id,character_id`,
      );
    }
    // The fifth (AC-1, D72), on the identical terms: an item's source is
    // remapped rather than resolved, and only the composite key stops one
    // from crossing characters.
    expect(edges).toContain(
      'character_items: source_instance_id,character_id -> character_source_instances.id,character_id',
    );
    expect(edges).toContain(
      'character_effects: character_item_id,character_id -> character_items.id,character_id',
    );
    expect(edges).toContain(
      'character_effects: character_weapon_id,character_id -> character_weapons.id,character_id',
    );
    expect(edges).toContain(
      'catalog_content_fingerprints: content_kind,content_key -> catalog_content_identities.content_kind,content_key',
    );
    expect(edges).toContain(
      'catalog_content_aliases: content_kind,content_key -> catalog_content_identities.content_kind,content_key',
    );
    expect(edges).toContain(
      'catalog_content_match_decisions: content_kind,target_content_key -> catalog_content_identities.content_kind,content_key',
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
