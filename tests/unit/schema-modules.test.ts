import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const schemaDir = fileURLToPath(new URL('../../db/schema/', import.meta.url));

/**
 * `db/schema/index.ts` is the single namespace passed to drizzle-kit and the
 * single source `AnyTableName` is derived from. A module that nothing
 * re-exports is invisible to BOTH: its tables would never be emitted into the
 * artifact and would never require scope classification. That failure mode is
 * silent, so it gets an explicit test.
 */
describe('db/schema module completeness', () => {
  it('re-exports every schema module from index.ts', async () => {
    const entries = await readdir(schemaDir, { withFileTypes: true });
    const modules = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith('.ts') &&
          entry.name !== 'index.ts',
      )
      .map((entry) => entry.name.replace(/\.ts$/, ''))
      .sort();

    expect(modules.length).toBeGreaterThan(0);

    const index = await readFile(`${schemaDir}index.ts`, 'utf8');
    const reExported = [...index.matchAll(/export \* from '\.\/([\w-]+)';/g)]
      .map((match) => match[1] as string)
      .sort();

    expect(reExported).toEqual(modules);
  });
});
