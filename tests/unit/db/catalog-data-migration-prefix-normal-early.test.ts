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
  appliedPrefixMarkerRows,
  migratedPrefixCharacterRows,
  PREFIX_DATA_MIGRATIONS,
  PREFIX_MIGRATION_CHECKSUM,
  PREFIX_MIGRATION_ID,
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

describe('early schema-prefix catalog data migrations', () => {
  it('runs prefixes 0000 through 0010 on normal boot exactly once', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
      PREFIX_DATA_MIGRATIONS,
    );
    const images = recordedSchemaPrefixImages(sqlite3);

    for (let index = 0; index <= 10; index += 1) {
      const prefixId = RECORDED_SCHEMA_PREFIX_IDS[index]!;
      lifecycle.close();
      await storage.replaceFile(images[index]!.slice());
      resetCatalogDataMigrationProbe();

      lifecycle.open();

      expect(catalogDataMigrationProbeExecutions(), prefixId).toBe(1);
      expect(appliedPrefixMarkerRows(lifecycle.database)).toEqual([{
        id: PREFIX_MIGRATION_ID,
        scheme: 'content-v1',
        checksum: PREFIX_MIGRATION_CHECKSUM,
      }]);
      expect(migratedPrefixCharacterRows(lifecycle.database)).toEqual([{
        name: 'CI-2b prefix fixture',
        notes: 'CI-2b prefix migration applied',
      }]);
      const firstOpenBytes = await lifecycle.exportBytes();
      lifecycle.reopen();
      expect(
        catalogDataMigrationProbeExecutions(),
        `${prefixId} reopen`,
      ).toBe(1);
      expect(await lifecycle.exportBytes()).toEqual(firstOpenBytes);
    }
    lifecycle.close();
  }, 60_000);
});
