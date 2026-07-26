import {
  generateSQLiteDrizzleJson,
  generateSQLiteMigration,
} from 'drizzle-kit/api';
import triggers from '../db/schema/triggers.sql?raw';
import * as schema from '../db/schema/index';

/**
 * Composes the complete `src/db/schema.sql` artifact.
 *
 * The generated artifact is COMPOSED, not a raw drizzle-kit export, because
 * two things in the schema are outside what Drizzle can represent:
 *
 *   prelude:  `PRAGMA foreign_keys = ON;` — the test helpers execute the
 *             artifact directly and the reset path builds a fresh connection,
 *             so omitting it would silently disable cascade behaviour.
 *   postlude: the two named triggers, hand-authored in db/schema/triggers.sql.
 *
 * PURITY: this function performs no writes and reads nothing from the
 * filesystem at call time (`?raw` inlines triggers.sql at transform time).
 * `scripts/build-schema.ts` is the only writer. That split is what keeps
 * `tests/unit/schema-generation.test.ts` from being self-fulfilling: the test
 * imports the composer, never the writer, and compares against the artifact
 * checked into git.
 *
 * This is a GENERATION-FRESHNESS check, NOT a Laravel parity check. Laravel
 * parity is `tests/unit/schema.test.ts`, whose expectations are transcribed
 * from the Laravel migrations and must never be regenerated from this output.
 */

const BANNER = [
  '-- GENERATED FILE — DO NOT EDIT BY HAND.',
  '-- Source of truth: db/schema/*.ts (tables, indexes, constraints) and',
  '-- db/schema/triggers.sql (triggers). Regenerate with `npm run db:schema`.',
  '-- tests/unit/schema-generation.test.ts fails if this file drifts.',
].join('\n');

/**
 * Rationale comments that lived in the hand-written artifact and would
 * otherwise be lost on the first regeneration.
 *
 * EMPTY, and kept rather than deleted. The one note this ever carried explained
 * why eight Laravel-only tables nothing reads still existed; those tables are
 * gone, and so is the note. The mechanism stays because the hazard it exists for
 * has not gone anywhere: a rationale that lives only in the generated artifact
 * is a rationale the next regeneration silently drops.
 */
export const SCHEMA_NOTES: readonly string[] = [];

function wrapComment(note: string): string {
  const words = note.split(' ');
  const lines: string[] = [];
  let line = '--';
  for (const word of words) {
    if (`${line} ${word}`.length > 78) {
      lines.push(line);
      line = '--';
    }
    line = `${line} ${word}`;
  }
  lines.push(line);
  return lines.join('\n');
}

/**
 * The banner, the pragma, and each note as wrapped SQL comments.
 *
 * Split out from `composeSchemaSql` and parameterised on `notes` for one
 * reason: `SCHEMA_NOTES` is currently empty, so composing the whole artifact
 * only ever exercises the empty case, and the note-emitting half of the
 * mechanism would sit untested until the day someone adds a note — which is
 * precisely the day they need the guard to already work.
 */
export function composePrelude(notes: readonly string[]): string {
  // The blank line travels WITH each note rather than sitting before the list,
  // so an empty note list does not leave a stray blank line in the artifact.
  return [
    BANNER,
    '',
    'PRAGMA foreign_keys = ON;',
    ...notes.flatMap((note) => ['', wrapComment(note)]),
  ].join('\n');
}

export async function composeSchemaSql(): Promise<string> {
  // An empty "previous" snapshot makes the diff a full CREATE of every object,
  // which is byte-identical to `drizzle-kit export --sql` without spawning a
  // CLI — so the freshness check can run in-process.
  const previous = await generateSQLiteDrizzleJson({});
  // Emit in a stable, name-sorted order rather than whatever key order the
  // `export *` chain happens to produce, so the artifact is a readable diff and
  // the freshness test can never be order-flaky. SQLite resolves foreign keys
  // lazily, so a table may reference one created later in the script.
  const current = await generateSQLiteDrizzleJson(
    Object.fromEntries(
      Object.entries(schema).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      ),
    ),
  );
  const body = (await generateSQLiteMigration(previous, current)).join('\n');

  return `${composePrelude(SCHEMA_NOTES)}\n\n${body.trim()}\n\n${triggers.trim()}\n`;
}
