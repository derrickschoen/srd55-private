import type { Database } from '@sqlite.org/sqlite-wasm';
import { describe, expect, it } from 'vitest';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { databaseSchemaSignature } from '../../../src/db/database-lifecycle';
import {
  openSeededTestDatabase,
  openTestDatabase,
} from '../../helpers/open-db';

function tableRowCounts(db: Database): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of db.selectValues(
    `SELECT name
     FROM sqlite_schema
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  )) {
    const name = String(table);
    counts[name] = Number(db.selectValue(`SELECT count(*) FROM "${name}"`));
  }
  return counts;
}

describe('the opt-in per-worker seeded database image', () => {
  it('has the same schema signature and table row counts as a fresh seed', async () => {
    const fresh = await openTestDatabase();
    const clone = await openSeededTestDatabase();
    try {
      applicationSeed(new DatabaseContext(fresh));

      expect(databaseSchemaSignature(clone)).toBe(
        databaseSchemaSignature(fresh),
      );
      expect(tableRowCounts(clone)).toEqual(tableRowCounts(fresh));
    } finally {
      clone.close();
      fresh.close();
    }
  });

  it('gives every caller an independently writable copy', async () => {
    const first = await openSeededTestDatabase();
    const second = await openSeededTestDatabase();
    try {
      first.exec(`INSERT INTO characters (name) VALUES ('Clone only')`);

      expect(first.selectValue('SELECT count(*) FROM characters')).toBe(1);
      expect(second.selectValue('SELECT count(*) FROM characters')).toBe(0);
    } finally {
      second.close();
      first.close();
    }
  });
});
