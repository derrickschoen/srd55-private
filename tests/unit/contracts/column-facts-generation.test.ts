import { describe, expect, it } from 'vitest';
import checkedIn from '../../../src/domain/contracts/generated/column-facts.ts?raw';
import checkedInReferences from '../../../src/domain/contracts/generated/reference-facts.ts?raw';
import {
  composeColumnFacts,
  composeReferenceFacts,
} from '../../../scripts/compose-row-contracts';
import { COLUMN_FACTS } from '../../../src/domain/contracts/generated/column-facts';
import { FOREIGN_KEY_FACTS } from '../../../src/domain/contracts/generated/reference-facts';
import { APPLICATION_TABLES } from '../../../src/domain/contracts/tables';

/**
 * A GENERATION-FRESHNESS DIFF, exactly as `schema-generation.test.ts` is for
 * `schema.sql`. It imports the pure composer and never the writer, so it cannot
 * make itself pass; all it proves is that the committed artifact is what the
 * current `db/schema/*.ts` declarations produce through drizzle-zod.
 */
describe('column-facts generation freshness', () => {
  it('matches the checked-in artifact byte for byte', () => {
    expect(composeColumnFacts()).toBe(checkedIn);
  });

  it('covers every application table', () => {
    expect(Object.keys(COLUMN_FACTS).sort()).toEqual(
      [...APPLICATION_TABLES].sort(),
    );
  });

  it('records the drizzle-zod degradation rather than hiding it', () => {
    const columns = Object.values(COLUMN_FACTS).flatMap((table) =>
      Object.values(table as Record<string, { base: string }>),
    );
    const degraded = columns.filter((column) => column.base === 'degraded');
    // Not a golden number: the point is that the majority of columns really do
    // come out of drizzle-zod untyped, which is why `rows.ts` must refine them.
    // If this ever reaches zero, drizzle-zod learned to read custom types and
    // the refinement requirement should be revisited rather than kept as ritual.
    expect(degraded.length).toBeGreaterThan(columns.length / 2);
    expect(columns.every((column) =>
      column.base === 'degraded' || column.base === 'integer',
    )).toBe(true);
  });

  it('reports nullability from the declaration, not from a hand list', () => {
    // D6b: a contract stricter than the column is a data-loss bug. These three
    // are the defended nulls the decisions record by name.
    expect(
      COLUMN_FACTS.character_class_levels.subclass_definition_id.notNull,
    ).toBe(false);
    expect(COLUMN_FACTS.characters.proficiency_bonus_override.notNull).toBe(
      false,
    );
    expect(
      COLUMN_FACTS.character_source_instances.parent_source_instance_id.notNull,
    ).toBe(false);
    expect(COLUMN_FACTS.characters.name.notNull).toBe(true);
  });
});

describe('reference-facts generation freshness', () => {
  it('matches the checked-in artifact byte for byte', () => {
    expect(composeReferenceFacts()).toBe(checkedInReferences);
  });

  it('names only real tables', () => {
    const tables = new Set<string>(APPLICATION_TABLES);
    for (const fact of FOREIGN_KEY_FACTS) {
      expect(tables.has(fact.table)).toBe(true);
      expect(tables.has(fact.target)).toBe(true);
      expect(fact.columns.length).toBe(fact.targetColumns.length);
      for (const column of fact.columns) {
        expect(
          Object.hasOwn(COLUMN_FACTS[fact.table], column),
        ).toBe(true);
      }
    }
  });

  it('carries the composite reference that makes slot ownership enforceable', () => {
    // If this reference ever loses `character_id`, SQLite stops policing slot
    // ownership and the audit's contamination set must grow to compensate.
    const slotReference = FOREIGN_KEY_FACTS.find(
      (fact) =>
        fact.table === 'spell_selection_slots' &&
        fact.target === 'character_source_instances',
    );
    expect(slotReference?.columns).toEqual([
      'source_instance_id',
      'character_id',
    ]);
  });

  it('records archive membership without inventing a character foreign key', () => {
    expect(COLUMN_FACTS.catalog_content_archive_members).toEqual({
      content_kind: { base: 'degraded', notNull: true },
      content_key: { base: 'degraded', notNull: true },
      character_id: { base: 'integer', notNull: true },
      character_revision: { base: 'integer', notNull: true },
      character_name: { base: 'degraded', notNull: true },
      archived_at: { base: 'degraded', notNull: true },
    });
    expect(
      FOREIGN_KEY_FACTS.filter(
        (fact) => fact.table === 'catalog_content_archive_members',
      ),
    ).toEqual([{
      table: 'catalog_content_archive_members',
      columns: ['content_kind', 'content_key'],
      target: 'catalog_content_identities',
      targetColumns: ['content_kind', 'content_key'],
    }]);
  });
});
