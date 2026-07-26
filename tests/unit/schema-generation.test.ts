import { describe, expect, it } from 'vitest';
import checkedIn from '../../src/db/schema.sql?raw';
import { composeSchemaSql, SCHEMA_NOTES } from '../../scripts/compose-schema';

/**
 * A GENERATION-FRESHNESS DIFF — explicitly NOT a Laravel parity check.
 *
 * All this proves is that the artifact committed to git is what the current
 * `db/schema/*.ts` declarations produce, i.e. that nobody edited the generated
 * file by hand or changed a declaration without regenerating. Whether the
 * artifact is CORRECT is settled elsewhere, by the independent
 * Laravel-derived expectations in `tests/unit/schema.test.ts` and the product
 * invariants in `tests/unit/invariants.test.ts`.
 *
 * The test imports `composeSchemaSql` (pure) and never `build-schema.ts` (the
 * writer), so it cannot make itself pass.
 */
describe('schema generation freshness', () => {
  it('matches the checked-in artifact byte for byte', async () => {
    expect(await composeSchemaSql()).toBe(checkedIn);
  });

  it('emits the pragma prelude Drizzle cannot express', async () => {
    const sql = await composeSchemaSql();
    // Test helpers exec this artifact directly and the reset path builds a
    // fresh connection, so a missing pragma silently disables every cascade.
    expect(sql).toContain('PRAGMA foreign_keys = ON;');
    expect(sql.indexOf('PRAGMA foreign_keys = ON;')).toBeLessThan(
      sql.indexOf('CREATE TABLE'),
    );
  });

  it('emits both named triggers as the postlude', async () => {
    const sql = await composeSchemaSql();
    for (const trigger of [
      'spell_slots_exclusive_assignment_insert',
      'spell_slots_exclusive_assignment_update',
    ]) {
      expect(sql).toContain(`CREATE TRIGGER ${trigger}`);
      expect(sql.indexOf(`CREATE TRIGGER ${trigger}`)).toBeGreaterThan(
        sql.lastIndexOf('CREATE TABLE'),
      );
    }
  });

  it('emits the named CHECK constraint Drizzle CAN express', async () => {
    const sql = await composeSchemaSql();
    expect(sql).toContain('spell_slots_exclusive_assignment_check');
  });
});

/**
 * The hand-written artifact carried rationale comments that a naive
 * regeneration would silently drop — in particular the explanation of why
 * eight tables nothing reads still exist. Losing that would leave a future
 * reader with no reason not to delete them.
 */
describe('schema rationale notes', () => {
  it('preserves the dead-infrastructure-tables rationale in the artifact', async () => {
    const sql = await composeSchemaSql();
    expect(SCHEMA_NOTES.length).toBeGreaterThan(0);
    for (const note of SCHEMA_NOTES) {
      // The note is emitted as wrapped SQL comments, so compare on words.
      const commentBlock = sql
        .split('\n')
        .filter((line) => line.startsWith('--'))
        .map((line) => line.slice(2).trim())
        .join(' ');
      expect(commentBlock).toContain(note);
    }
  });

  it('names the round-trip reason the infrastructure tables exist', async () => {
    const sql = await composeSchemaSql();
    expect(sql).toContain('round-trip');
    expect(sql).toContain('without');
  });

  it('marks the artifact as generated so it is not hand-edited', async () => {
    const sql = await composeSchemaSql();
    expect(sql).toContain('GENERATED FILE');
    expect(sql).toContain('npm run db:schema');
  });
});
