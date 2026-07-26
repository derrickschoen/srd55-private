import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { composeSchemaSql } from './compose-schema';

/**
 * The only writer. Kept deliberately thin so that
 * `tests/unit/schema-generation.test.ts` can import `composeSchemaSql` without
 * any chance of the test regenerating the file it is checking.
 *
 * Run with `npm run db:schema`. An explicit target path may be passed as the
 * first argument (used while the generated schema was still being validated as
 * a shadow artifact alongside the hand-written one).
 */
export const SCHEMA_ARTIFACT_PATH = fileURLToPath(
  new URL('../src/db/schema.sql', import.meta.url),
);

const target = process.argv[2] ?? SCHEMA_ARTIFACT_PATH;
const sql = await composeSchemaSql();
await writeFile(target, sql, 'utf8');
process.stdout.write(`Wrote ${target} (${sql.length} bytes)\n`);
