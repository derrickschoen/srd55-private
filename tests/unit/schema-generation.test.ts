import { describe, expect, it } from 'vitest';
import checkedIn from '../../src/db/schema.sql?raw';
import {
  composePrelude,
  composeSchemaSql,
  SCHEMA_NOTES,
} from '../../scripts/compose-schema';

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
 * THE RATIONALE-NOTE MECHANISM, NOW CARRYING NOTHING.
 *
 * Two tests used to live here: one asserting the artifact preserved the
 * explanation of why eight tables nothing reads still existed, and one
 * asserting it named the round-trip reason for them. Those eight tables are
 * gone, so both tests are gone too — a test whose entire subject has been
 * deleted is not a test worth keeping green.
 *
 * The MECHANISM stays, and so does a test of it, because the hazard it exists
 * for has not gone anywhere: a rationale that lives only inside a generated
 * file is a rationale the next regeneration silently drops. This proves the
 * composer still emits whatever `SCHEMA_NOTES` holds — including that an empty
 * list leaves no stray comment or blank line behind — so the next note added
 * arrives with its guard already working.
 */
describe('schema rationale notes', () => {
  it('emits exactly the notes SCHEMA_NOTES declares, and nothing when it is empty', async () => {
    const sql = await composeSchemaSql();
    const commentBlock = sql
      .split('\n')
      .filter((line) => line.startsWith('--'))
      .map((line) => line.slice(2).trim())
      .join(' ');
    for (const note of SCHEMA_NOTES) {
      // The note is emitted as wrapped SQL comments, so compare on words.
      expect(commentBlock).toContain(note);
    }
    if (SCHEMA_NOTES.length === 0) {
      // Only the generated-file banner may precede the pragma, and the pragma
      // is followed by exactly one blank line before the first statement.
      expect(sql).toContain('PRAGMA foreign_keys = ON;\n\nCREATE TABLE');
    }
  });

  /**
   * The test above can only exercise the branch `SCHEMA_NOTES` happens to be in,
   * and it is empty today — so the note-EMITTING half would be dormant until the
   * day someone adds a note, which is the day the guard needs to already work.
   * `composePrelude` takes the list as a parameter so both branches run now.
   */
  it('wraps a note into comment lines that reconstruct it exactly', () => {
    // Long enough to force several wraps; the expectation below is derived from
    // this literal, never from the composer's output.
    const note =
      'A rationale that lives only inside a generated file is a rationale the ' +
      'next regeneration silently drops, so the composer has to carry it.';
    const lines = composePrelude([note]).split('\n');
    const pragma = lines.indexOf('PRAGMA foreign_keys = ON;');
    expect(pragma).toBeGreaterThan(-1);

    // The blank line travels with the note, so exactly one separates them.
    expect(lines[pragma + 1]).toBe('');
    const commentLines = lines.slice(pragma + 2);
    expect(commentLines.length).toBeGreaterThan(1);
    for (const line of commentLines) {
      expect(line.startsWith('-- ')).toBe(true);
      expect(line.length).toBeLessThanOrEqual(78);
    }
    // Every word survives, in order, with nothing invented or dropped.
    expect(commentLines.map((line) => line.slice(3)).join(' ')).toBe(note);
  });

  it('leaves no comment or blank line behind when the note list is empty', () => {
    const prelude = composePrelude([]);
    expect(prelude.endsWith('PRAGMA foreign_keys = ON;')).toBe(true);
  });

  it('marks the artifact as generated so it is not hand-edited', async () => {
    const sql = await composeSchemaSql();
    expect(sql).toContain('GENERATED FILE');
    expect(sql).toContain('npm run db:schema');
  });
});
