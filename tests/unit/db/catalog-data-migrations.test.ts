import { beforeEach, describe, expect, it } from 'vitest';
import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  CATALOG_DATA_MIGRATIONS,
  catalogDataMigrationChecksum,
  runCatalogDataMigrations,
  type CatalogDataMigration,
  validateCatalogDataMigrationRegistry,
} from '../../../src/catalog/catalog-data-migrations';
import { CONTENT_FINGERPRINT_SCHEME_V1 } from '../../../src/catalog/content-identity';
import { sha256 } from '../../../src/crypto/sha256';
import {
  CatalogDataMigrationChecksumMismatchError,
  CatalogDataMigrationMarkerDisagreementError,
  CatalogDataMigrationUnregisteredMarkerError,
} from '../../../src/catalog/catalog-data-migrations-errors';
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

function refusal(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a refusal, but the call returned.');
}

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
    sources: Object.freeze([Object.freeze({
      path: `tests/fixtures/${id}.ts`,
      bytes: source,
    })]),
    checksum: catalogDataMigrationChecksum([{
      path: `tests/fixtures/${id}.ts`,
      bytes: source,
    }]),
    run,
  });
}

describe('catalog data-migration registry', () => {
  it('registers the checksum-frozen one-time subclass retirement', () => {
    expect(CATALOG_DATA_MIGRATIONS.map((entry) => ({
      id: entry.id,
      projectorScheme: entry.projectorScheme,
      sources: entry.sources.map(({ path }) => path),
      checksum: entry.checksum,
    }))).toEqual([{
      id: 'retire_non_srd_bundled_subclasses_v1',
      projectorScheme: 'content-v1',
      sources: [
        'src/catalog/retire-non-srd-bundled-subclasses-v1.ts',
        'src/catalog/catalog-lineage-delete-guard.ts',
      ],
      checksum: '69781850c8b75e9e83cffd421f278810986859af07d2366e2e44ac854259eb4a',
    }, {
      id: 'reconcile_species_lineage_content_v2',
      projectorScheme: 'content-v2',
      sources: [
        'src/catalog/reconcile-species-lineage-content-v2.ts',
        'src/rules/origin-definitions-srd.ts',
        'src/grants/configured-choice-rule.ts',
        'src/grants/configured-choice-rule-errors.ts',
        'src/grants/grant-rule.ts',
        'src/grants/grant-rule-errors.ts',
        'src/grants/source-rule-reader.ts',
        'src/grants/source-rule-reader-errors.ts',
        'src/domain/source-instance-state.ts',
        'src/rules/character-level.ts',
        'src/grants/grant-rule-slot-generator.ts',
        'src/grants/grant-rule-slot-generator-errors.ts',
        'src/grants/grant-rule-planner.ts',
        'src/grants/skill-grants.ts',
        'src/grants/skill-expertise-grants.ts',
        'src/eligibility/spell-selection-eligibility.ts',
        'src/eligibility/spell-selection-constraint.ts',
        'src/catalog/stored-authored-content-projector-v1.ts',
        'src/catalog/content-identity.ts',
        'src/catalog/content-registry.ts',
      ],
      // Re-pinned 2026-08-13 with the registry: origin-definitions-srd.ts's
      // SRD attribution header corrected to the 5.2.1 statement the source
      // document requires (comment-only diff, verified).
      //
      // Re-pinned again 2026-08-13 with the registry: grant-rule.ts gained the
      // opt-in `allows_pending_choice` field and grant-rule-slot-generator.ts
      // honours it, so a rule that DECLARES a pending choice waits instead of
      // throwing while its config is unwritten. No lineage row changes — see
      // the registry entry for why the pin still moves.
      // MERGE 2026-08-13: champion (allows_pending_choice) and R4 (typed state +
      // frozen source-instance-state module) both moved this pin; recomputed
      // below over the MERGED frozen sources by the designed procedure.
      // Re-pinned 2026-08-13 with the registry (R4, D226). The path list above
      // is the half of this pin that matters most: `source-rule-reader.ts` now
      // THROWS on a state outside the vocabulary, and R4 round 1 pinned the
      // reader without pinning the vocabulary it reads — a freeze that a
      // one-line edit to `enums.ts` could have walked straight through. Round 2
      // added `src/domain/source-instance-state.ts`, a module that exists to be
      // exactly this wide. Reconciliation's OUTPUT is unchanged in both rounds;
      // re-pinning is D226's accepted cost, not a way around the freeze.
      // Re-pinned 2026-08-17 at the grants+catalog tagged-error merge; the
      // pin covers the combined source set.
      // Re-pinned 2026-08-18 for the spell-eligibility snapshot path; the
      // migration still uses the unchanged point-read behavior.
      checksum: 'c6ceec272ab7366ff8f7a80ed5e96a1898b570351b2d68b62b7f1e073dfe12fc',
    }]);
    expect(() =>
      validateCatalogDataMigrationRegistry(CATALOG_DATA_MIGRATIONS)
    ).not.toThrow();
  });

  it('refuses edited source whose independently pinned checksum was not changed', () => {
    const originalSource = 'export function frozenMigration() { return 1; }\n';
    const edited = {
      ...migration('frozen_source', originalSource, () => undefined),
      sources: [{
        path: 'tests/fixtures/frozen_source.ts',
        bytes: `${originalSource}// edited\n`,
      }],
    };

    const error = refusal(() => validateCatalogDataMigrationRegistry([edited]));
    expect(error).toBeInstanceOf(CatalogDataMigrationChecksumMismatchError);
    expect(error).toMatchObject({
      migration_id: 'frozen_source',
      expected_checksum: edited.checksum,
      actual_checksum: sha256(JSON.stringify(edited.sources.map(
        ({ path, bytes }) => [path, bytes],
      ))),
    });
  });

  it('refuses changed guard-module bytes until the retirement checksum is re-pinned', () => {
    const retirement = CATALOG_DATA_MIGRATIONS[0]!;
    const edited = {
      ...retirement,
      sources: retirement.sources.map((source) =>
        source.path === 'src/catalog/catalog-lineage-delete-guard.ts'
          ? { ...source, bytes: `${source.bytes}// changed guard byte\n` }
          : source),
    };

    const error = refusal(() => validateCatalogDataMigrationRegistry([edited]));
    expect(error).toBeInstanceOf(CatalogDataMigrationChecksumMismatchError);
    expect(error).toMatchObject({
      migration_id: 'retire_non_srd_bundled_subclasses_v1',
      expected_checksum: edited.checksum,
      actual_checksum: sha256(JSON.stringify(
        [...edited.sources]
          .sort((left, right) => left.path.localeCompare(right.path))
          .map(({ path, bytes }) => [path, bytes]),
      )),
    });
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

      const error = refusal(() => runCatalogDataMigrations(db, [edited]));
      expect(error).toBeInstanceOf(CatalogDataMigrationMarkerDisagreementError);
      expect(error).toMatchObject({ migration_id: 'checksum_fixture' });
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

      const error = refusal(() => runCatalogDataMigrations(db, []));
      expect(error).toBeInstanceOf(CatalogDataMigrationUnregisteredMarkerError);
      expect(error).toMatchObject({ migration_id: 'removed_fixture' });
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
