import { beforeAll, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import { DATABASE_MIGRATIONS } from '../../../src/db/migrations';
import {
  catalogDataMigrationProbeExecutions,
  resetCatalogDataMigrationProbe,
} from '../../fixtures/catalog-data-migration-probe';
import {
  PREFIX_DATA_MIGRATIONS,
  RECORDED_SCHEMA_PREFIX_IDS,
  recordedSchemaPrefixImages,
} from '../../helpers/catalog-data-migration-prefixes';
import {
  getSqlite3,
  MemoryDatabaseStorage,
} from '../../helpers/open-db';

let sqlite3: Sqlite3Static;

beforeAll(async () => {
  sqlite3 = await getSqlite3();
});

describe('late quarantined schema-prefix candidates', () => {
  it('runs prefixes 0011 through 0040 without changing input bytes', () => {
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
      PREFIX_DATA_MIGRATIONS,
    );
    lifecycle.open();
    const images = recordedSchemaPrefixImages(sqlite3);

    for (let index = 11; index < images.length; index += 1) {
      const prefixId = RECORDED_SCHEMA_PREFIX_IDS[index]!;
      const prefixBytes = images[index]!;
      const candidateInput = prefixBytes.slice();
      resetCatalogDataMigrationProbe();

      lifecycle.validateBytes(candidateInput);

      expect(catalogDataMigrationProbeExecutions(), prefixId).toBe(1);
      expect(candidateInput).toEqual(prefixBytes);
    }
    lifecycle.close();
  // Measured at ~44s alone on 2026-08-03; grows with every migration.
  }, 180_000);
});
