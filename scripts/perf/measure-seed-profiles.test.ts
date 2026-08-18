import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { expect, it } from 'vitest';
import schema from '../../src/db/schema.sql?raw';
import type { ApplicationSeedProfile } from '../../src/db/application-seed-profile';
import { applicationSeed } from '../../src/db/bootstrap';
import { DatabaseContext } from '../../src/db/database';
import { registerSqliteQueryEngine } from '../../src/db/query';

it('measures three fresh image builds for each seed profile', async () => {
  const sqlite3 = await sqlite3InitModule();
  registerSqliteQueryEngine(sqlite3);
  const profiles: readonly ApplicationSeedProfile[] = ['full', 'test-core'];
  let measurements = 0;

  for (let run = 1; run <= 3; run += 1) {
    for (const profile of profiles) {
      const db = new sqlite3.oo1.DB(':memory:', 'c');
      const schemaStarted = performance.now();
      db.exec(schema);
      const seedStarted = performance.now();
      applicationSeed(new DatabaseContext(db), 'full', profile);
      const seeded = performance.now();
      const bytes = sqlite3.capi.sqlite3_js_db_export(db).byteLength;
      const exported = performance.now();
      const tables = db.selectValues(
        `SELECT name FROM sqlite_schema
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      ).map(String);
      const rows = tables.reduce(
        (total, table) =>
          total + Number(db.selectValue(
            `SELECT count(*) FROM "${table.replaceAll('"', '""')}"`,
          )),
        0,
      );
      console.log(JSON.stringify({
        run,
        profile,
        schema_ms: Number((seedStarted - schemaStarted).toFixed(1)),
        seed_ms: Number((seeded - seedStarted).toFixed(1)),
        export_ms: Number((exported - seeded).toFixed(1)),
        image_bytes: bytes,
        rows,
      }));
      measurements += 1;
      db.close();
    }
  }

  expect(measurements).toBe(6);
}, 60_000);
