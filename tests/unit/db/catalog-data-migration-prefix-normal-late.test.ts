import { beforeAll, describe, expect, it } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
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
  expectIdenticalDatabaseImages,
} from '../../helpers/database-image-equality';
import {
  getSqlite3,
  MemoryDatabaseStorage,
} from '../../helpers/open-db';

let sqlite3: Sqlite3Static;

beforeAll(async () => {
  sqlite3 = await getSqlite3();
});

describe('late schema-prefix catalog data migrations', () => {
  it('pins the complete hand-authored historical prefix inventory', () => {
    expect(DATABASE_MIGRATIONS.map((entry) => entry.id)).toEqual(
      RECORDED_SCHEMA_PREFIX_IDS,
    );
  });

  it('runs prefixes 0011 through 0040 on normal boot exactly once', async () => {
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

    for (let index = 11; index < images.length; index += 1) {
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
      expectIdenticalDatabaseImages(
        await lifecycle.exportBytes(),
        firstOpenBytes,
        `${prefixId} reopen image`,
      );
    }
    lifecycle.close();
  // Was 177_800ms, for a test that spent 140.5s of its 146s inside 37
  // `expect(bytes).toEqual(bytes)` calls over 2.1MB images. That comparison is
  // now `expectIdenticalDatabaseImages`, which proves the same bytes without
  // the structural-equality walk, and the loop measures ~6s alone. 60_000ms is
  // ten times the measured cost and still leaves room for a contended box.
  }, 60_000);

  it('persists every restored prefix after candidate migration and not before', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      DATABASE_MIGRATIONS,
      PREFIX_DATA_MIGRATIONS,
    );
    lifecycle.open();

    for (
      const [index, prefixId]
      of RECORDED_SCHEMA_PREFIX_IDS.entries()
    ) {
      resetCatalogDataMigrationProbe();

      await lifecycle.replace(
        recordedSchemaPrefixImages(sqlite3)[index]!.slice(),
      );

      expect(catalogDataMigrationProbeExecutions(), prefixId).toBe(1);
      expect(appliedPrefixMarkerRows(lifecycle.database)).toHaveLength(1);
      expect(migratedPrefixCharacterRows(lifecycle.database)).toHaveLength(1);
    }
    lifecycle.close();

    const restoredImage = openDatabaseImage(
      sqlite3,
      await storage.exportFile(),
    );
    try {
      expect(
        restoredImage.selectValue(
          `SELECT count(*)
           FROM catalog_data_migrations
           WHERE id = '${PREFIX_MIGRATION_ID}'`,
        ),
      ).toBe(1);
    } finally {
      restoredImage.close();
    }
  }, 60_000);
});
