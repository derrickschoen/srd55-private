import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SHARE_TABLES,
  TABLE_SCOPES,
} from '../../../src/domain/contracts/tables';

/**
 * THE `share` FLAG IS A CONTRACT, NOT A COMMENT.
 *
 * Two of the three directions are enforced by the compiler:
 *
 *  - `SHARE_TABLES` is typed `{ [N in ShareTable]: N }`, so marking a table
 *    `share: true` without adding it here is TS2739;
 *  - naming a table that is not share-scoped is TS2322.
 *
 * The third direction — that the sharing module actually USES the map instead
 * of writing the names out again — cannot be expressed in the type system: an
 * unread property is not an error. So this suite reads the module's source and
 * checks it directly. It is the same class of check as the "no Drizzle in the
 * bundle" guard: a textual assertion standing in for a boundary the language
 * cannot express.
 */

const SHARING_SOURCE = readFileSync(
  fileURLToPath(
    new URL('../../../src/sharing/character-share.ts', import.meta.url),
  ),
  'utf8',
);

/** Every table name mentioned after FROM / JOIN / INTO / UPDATE, verbatim. */
function sqlTableTokens(source: string): string[] {
  return [
    ...source.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([A-Za-z_$][\w$.{}]*)/g),
  ].map((match) => match[1] as string);
}

describe('the share scope drives the sharing module', () => {
  it('classifies exactly the nine tables that travel with a shared character', () => {
    expect(Object.keys(SHARE_TABLES).sort()).toEqual(
      Object.entries(TABLE_SCOPES)
        .filter(([, scopes]) => scopes.share)
        .map(([name]) => name)
        .sort(),
    );
  });

  it('maps every share table to its own name', () => {
    for (const [key, value] of Object.entries(SHARE_TABLES)) {
      expect(value).toBe(key);
    }
  });

  it('reaches every share table through SHARE_TABLES at least once', () => {
    for (const table of Object.keys(SHARE_TABLES)) {
      expect(
        SHARING_SOURCE.includes(`\${SHARE_TABLES.${table}}`),
        `character-share.ts never uses SHARE_TABLES.${table}, so classifying ` +
          `${table} as shared changes nothing about what a share contains`,
      ).toBe(true);
    }
  });

  it('writes no share table name as a bare SQL literal', () => {
    const literals = sqlTableTokens(SHARING_SOURCE).filter((token) =>
      Object.hasOwn(SHARE_TABLES, token),
    );
    expect(literals).toEqual([]);
  });

  it('keeps unshared character tables out of the sharing module entirely', () => {
    // Derived, not transcribed: today this is character_save_points (private
    // undo history), change_log and character_operations (local journals). If
    // one of them is ever meant to travel, the flag is where that decision is
    // recorded — not a new SQL statement nobody notices.
    const unshared = Object.entries(TABLE_SCOPES)
      .filter(
        ([name, scopes]) =>
          scopes.role === 'character_owned' &&
          !scopes.share &&
          !Object.hasOwn(SHARE_TABLES, name),
      )
      .map(([name]) => name);
    expect(unshared.length).toBeGreaterThan(0);

    const tokens = new Set(sqlTableTokens(SHARING_SOURCE));
    for (const table of unshared) {
      expect(
        tokens.has(table),
        `character-share.ts names ${table} in SQL, but it is not share-scoped`,
      ).toBe(false);
    }
  });
});
