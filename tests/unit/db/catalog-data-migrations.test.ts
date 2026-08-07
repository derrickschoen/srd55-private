import { beforeEach, describe, expect, it } from 'vitest';
import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  CATALOG_DATA_MIGRATIONS,
  runCatalogDataMigrations,
  type CatalogDataMigration,
  validateCatalogDataMigrationRegistry,
} from '../../../src/catalog/catalog-data-migrations';
import { CONTENT_FINGERPRINT_SCHEME_V1 } from '../../../src/catalog/content-identity';
import { sha256 } from '../../../src/crypto/sha256';
import {
  DatabaseContext,
  prepareConnection,
} from '../../../src/db/database';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import {
  getSqlite3,
  MemoryDatabaseStorage,
} from '../../helpers/open-db';

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

function freshContext(): DatabaseContext {
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  prepareConnection(connection);
  return new DatabaseContext(connection);
}

function bytesOf(connection: Database): Uint8Array {
  return sqlite3.capi.sqlite3_js_db_export(connection).slice();
}

function migration(
  id: string,
  source: string,
  run: (db: DatabaseContext) => void,
): CatalogDataMigration {
  return Object.freeze({
    id,
    projectorScheme: CONTENT_FINGERPRINT_SCHEME_V1,
    source,
    checksum: sha256(source),
    run,
  });
}

describe('catalog data-migration registry', () => {
  it('registers the checksum-frozen one-time subclass retirement', () => {
    expect(CATALOG_DATA_MIGRATIONS.map((entry) => ({
      id: entry.id,
      projectorScheme: entry.projectorScheme,
      checksum: entry.checksum,
    }))).toEqual([{
      id: 'retire_non_srd_bundled_subclasses_v1',
      projectorScheme: 'content-v1',
      checksum: '75f251741104d3d358173e3633d3ac6b7d91d9fb8efc0fb22018e29fcfecacf9',
    }]);
  });

  it('refuses edited source whose independently pinned checksum was not changed', () => {
    const originalSource = 'export function frozenMigration() { return 1; }\n';
    const edited = {
      ...migration('frozen_source', originalSource, () => undefined),
      source: `${originalSource}// edited\n`,
    };

    expect(() =>
      validateCatalogDataMigrationRegistry([edited]),
    ).toThrow(
      'Catalog data migration "frozen_source" source checksum mismatch',
    );
  });

  // Measured 2.1s alone; 20s leaves headroom for full-suite contention.
  it('is byte- and row-idempotent after the first successful run', () => {
    const db = freshContext();
    const registered = [
      migration('idempotent_fixture', 'idempotent fixture source\n', (tx) => {
        tx.exec(
          `INSERT INTO characters (name)
           VALUES ('Written exactly once')`,
        );
      }),
    ];

    try {
      runCatalogDataMigrations(db, registered);
      const rowsAfterFirst = db.allRaw(
        `SELECT id, name, notes FROM characters ORDER BY id`,
      );
      const markersAfterFirst = db.allRaw(
        `SELECT id, scheme, checksum, applied_at
         FROM catalog_data_migrations`,
      );
      const bytesAfterFirst = bytesOf(db.connection);

      runCatalogDataMigrations(db, registered);

      expect(
        db.allRaw(`SELECT id, name, notes FROM characters ORDER BY id`),
      ).toEqual(rowsAfterFirst);
      expect(
        db.allRaw(
          `SELECT id, scheme, checksum, applied_at
           FROM catalog_data_migrations`,
        ),
      ).toEqual(markersAfterFirst);
      expect(bytesOf(db.connection)).toEqual(bytesAfterFirst);
    } finally {
      db.close();
    }
  }, 20_000);

  // Measured 2.2s alone; 20s leaves headroom for full-suite contention.
  it('rolls back semantic rows and the marker after an injected mid-migration failure', () => {
    const db = freshContext();
    const before = bytesOf(db.connection);
    const failing = [
      migration('atomic_fixture', 'atomic fixture source\n', (tx) => {
        tx.exec(
          `INSERT INTO characters (name)
           VALUES ('Must roll back')`,
        );
        throw new Error('Injected catalog data-migration failure.');
      }),
    ];

    try {
      expect(() => runCatalogDataMigrations(db, failing)).toThrow(
        'Injected catalog data-migration failure.',
      );
      expect(db.scalar('SELECT count(*) FROM characters')).toBe(0);
      expect(
        db.scalar('SELECT count(*) FROM catalog_data_migrations'),
      ).toBe(0);
      expect(bytesOf(db.connection)).toEqual(before);
    } finally {
      db.close();
    }
  }, 20_000);

  it('refuses an edited applied migration by checksum and never re-runs it', () => {
    const db = freshContext();
    let editedExecutions = 0;
    const original = migration(
      'checksum_fixture',
      'checksum fixture source v1\n',
      (tx) => {
        tx.exec(`INSERT INTO characters (name) VALUES ('Original run')`);
      },
    );
    const edited = migration(
      'checksum_fixture',
      'checksum fixture source v2\n',
      () => {
        editedExecutions += 1;
      },
    );

    try {
      runCatalogDataMigrations(db, [original]);

      expect(() => runCatalogDataMigrations(db, [edited])).toThrow(
        'Applied catalog data migration "checksum_fixture" does not match ' +
          'the registered projector scheme and checksum.',
      );
      expect(editedExecutions).toBe(0);
      expect(db.allRaw('SELECT name FROM characters')).toEqual([
        { name: 'Original run' },
      ]);
      expect(
        db.allRaw(
          `SELECT id, checksum FROM catalog_data_migrations`,
        ),
      ).toEqual([{
        id: 'checksum_fixture',
        checksum: original.checksum,
      }]);
    } finally {
      db.close();
    }
  });

  it('refuses an applied marker whose append-only registry entry was removed', () => {
    const db = freshContext();
    const checksum = sha256('removed migration source\n');
    try {
      db.exec(
        `INSERT INTO catalog_data_migrations (id, scheme, checksum)
         VALUES ('removed_fixture', 'content-v1', ?)`,
        [checksum],
      );

      expect(() => runCatalogDataMigrations(db, [])).toThrow(
        'Applied catalog data migration "removed_fixture" is not registered ' +
          'by this application.',
      );
    } finally {
      db.close();
    }
  });

  it('quarantines a failing restore migration without touching the live image', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const failingRestore = migration(
      'restore_atomic_fixture',
      'restore atomic fixture source\n',
      (tx) => {
        if (
          tx.scalar(
            `SELECT count(*)
             FROM characters
             WHERE name = 'Failing candidate'`,
          ) === 0
        ) {
          return;
        }
        tx.exec(`INSERT INTO characters (name) VALUES ('Partial candidate')`);
        throw new Error('Injected candidate data-migration failure.');
      },
    );
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      schema,
      () => undefined,
      undefined,
      [failingRestore],
    );
    lifecycle.open();
    lifecycle.database.exec(
      `INSERT INTO characters (name) VALUES ('Protected live row')`,
    );
    const liveConnection = lifecycle.database.connection;

    const candidate = new sqlite3.oo1.DB(':memory:', 'c');
    let candidateBytes: Uint8Array;
    try {
      candidate.exec(schema);
      candidate.exec(
        `INSERT INTO characters (name) VALUES ('Failing candidate')`,
      );
      candidateBytes = bytesOf(candidate);
    } finally {
      candidate.close();
    }

    await expect(lifecycle.replace(candidateBytes)).rejects.toThrow(
      'Injected candidate data-migration failure.',
    );
    expect(lifecycle.database.connection).toBe(liveConnection);
    expect(lifecycle.database.allRaw('SELECT name FROM characters')).toEqual([
      { name: 'Protected live row' },
    ]);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*)
         FROM catalog_data_migrations
         WHERE id = 'restore_atomic_fixture'`,
      ),
    ).toBe(1);
    lifecycle.close();
  });
});
