import { beforeEach, describe, expect, it } from 'vitest';
import type {
  Database,
  Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  DatabaseLifecycle,
  databaseSchemaSignature,
  openDatabaseImage,
} from '../../../src/db/database-lifecycle';
import {
  DATABASE_MIGRATIONS,
  databaseSchemaChecksum,
  type DatabaseMigration,
} from '../../../src/db/migrations';
import { sha256 } from '../../../src/crypto/sha256';
import { verifyMigrations } from '../../../scripts/verify-migrations';
import { bootDatabase } from '../../../src/worker/boot';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const FIRST_INDEX =
  'CREATE INDEX migration_probe_first ON characters(name);';
const SECOND_INDEX =
  'CREATE INDEX migration_probe_second ON characters(notes);';
const REFERENCED_TABLES = `
CREATE TABLE migration_parent (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE migration_child (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL
    REFERENCES migration_parent(id) ON DELETE RESTRICT
);`;
const REBUILT_REFERENCED_TABLES = `
CREATE TABLE "migration_parent" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rebuilt INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE migration_child (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER NOT NULL
    REFERENCES migration_parent(id) ON DELETE RESTRICT
);`;
const REBUILD_REFERENCED_PARENT = `
CREATE TABLE "__new_migration_parent" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rebuilt INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "__new_migration_parent" (id, name)
  SELECT id, name FROM migration_parent;
DROP TABLE migration_parent;
ALTER TABLE "__new_migration_parent" RENAME TO migration_parent;`;

let sqlite3: Sqlite3Static;

beforeEach(async () => {
  sqlite3 = await getSqlite3();
});

function migration(
  id: string,
  sql: string,
  resultSchemaChecksum: string,
): DatabaseMigration {
  return Object.freeze({
    id,
    sql,
    checksum: sha256(sql),
    resultSchemaChecksum,
  });
}

function schemaChecksum(sql: string): string {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return databaseSchemaChecksum(databaseSchemaSignature(db));
  } finally {
    db.close();
  }
}

function schemaSignature(sql: string): string {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return databaseSchemaSignature(db);
  } finally {
    db.close();
  }
}

function image(sql: string): Uint8Array {
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  try {
    db.exec(sql);
    return sqlite3.capi.sqlite3_js_db_export(db).slice();
  } finally {
    db.close();
  }
}

async function storageHolding(sql: string): Promise<MemoryDatabaseStorage> {
  const storage = new MemoryDatabaseStorage(sqlite3);
  await storage.replaceFile(image(sql));
  return storage;
}

class ProbedStorage extends MemoryDatabaseStorage {
  migrationExecutions = 0;

  override open(): Database {
    const db = super.open();
    db.createFunction('migration_probe', () => {
      this.migrationExecutions += 1;
      return null;
    });
    return db;
  }
}

function probedRegistry(targetSchema: string): readonly DatabaseMigration[] {
  return Object.freeze([
    DATABASE_MIGRATIONS[0]!,
    migration(
      '0001_test_probe',
      `SELECT migration_probe();\n${FIRST_INDEX}`,
      schemaChecksum(targetSchema),
    ),
  ]);
}

describe('database migration chain', () => {
  it('builds the exact fresh-schema signature from empty', async () => {
    const result = await verifyMigrations(sqlite3);

    expect(result.migrationCount).toBe(DATABASE_MIGRATIONS.length);
    expect(result.signature).toBe(schemaSignature(schema));
  });

  it('does not execute migrations for a current image, after proving the probe is live', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const registry = probedRegistry(targetSchema);

    const oldStorage = new ProbedStorage(sqlite3);
    await oldStorage.replaceFile(image(schema));
    const oldLifecycle = new DatabaseLifecycle(
      sqlite3,
      oldStorage,
      targetSchema,
      () => undefined,
      registry,
    );
    oldLifecycle.open();
    expect(oldStorage.migrationExecutions).toBe(1);
    oldLifecycle.close();

    const currentStorage = new ProbedStorage(sqlite3);
    await currentStorage.replaceFile(image(targetSchema));
    const currentLifecycle = new DatabaseLifecycle(
      sqlite3,
      currentStorage,
      targetSchema,
      () => undefined,
      registry,
    );
    currentLifecycle.open();
    expect(currentStorage.migrationExecutions).toBe(0);
    currentLifecycle.close();
  });

  it('does not execute migrations for an empty image', () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const storage = new ProbedStorage(sqlite3);
    const probe = storage.open();
    probe.exec('SELECT migration_probe()');
    probe.close();
    expect(storage.migrationExecutions).toBe(1);
    storage.migrationExecutions = 0;

    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      probedRegistry(targetSchema),
    );

    lifecycle.open();

    expect(storage.migrationExecutions).toBe(0);
    lifecycle.close();
  });

  it('keeps a child row and its reference intact while rebuilding its parent table', async () => {
    const sourceSchema = `${schema}\n${REFERENCED_TABLES}\n`;
    const targetSchema = `${schema}\n${REBUILT_REFERENCED_TABLES}\n`;
    const registry = Object.freeze([
      migration(
        '0000_test_referenced_tables',
        REFERENCED_TABLES,
        schemaChecksum(sourceSchema),
      ),
      migration(
        '0001_test_rebuild_referenced_parent',
        REBUILD_REFERENCED_PARENT,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(
      `${sourceSchema}
       INSERT INTO migration_parent (id, name) VALUES (7, 'Longbow');
       INSERT INTO migration_child (id, parent_id) VALUES (1, 7);`,
    );
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );

    lifecycle.open();

    expect(
      lifecycle.database.allRaw(
        `SELECT child.id, child.parent_id, parent.name, parent.rebuilt
         FROM migration_child AS child
         JOIN migration_parent AS parent ON parent.id = child.parent_id`,
      ),
    ).toEqual([{
      id: 1,
      parent_id: 7,
      name: 'Longbow',
      rebuilt: 1,
    }]);
    lifecycle.close();
  });

  it('leaves an unknown signature at schema_mismatch', async () => {
    const storage = await storageHolding(
      `${schema}\nCREATE INDEX unregistered_schema_change ON characters(id);\n`,
    );
    const boot = bootDatabase(
      new DatabaseLifecycle(sqlite3, storage, schema),
    );

    expect(boot.status).toBe('schema_mismatch');
    if (boot.status !== 'schema_mismatch') {
      throw new Error('unreachable');
    }
    expect(boot.detail).toBe(
      'Database image schema does not match the application schema.',
    );
  });

  it('rolls a mid-chain failure back to the original signature and bytes', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n${SECOND_INDEX}\n`;
    const registry = Object.freeze([
      DATABASE_MIGRATIONS[0]!,
      migration(
        '0001_test_first',
        FIRST_INDEX,
        schemaChecksum(`${schema}\n${FIRST_INDEX}\n`),
      ),
      migration(
        '0002_test_failure',
        `${SECOND_INDEX}\nSELECT value FROM migration_failure_injected;`,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(schema);
    const original = await storage.exportFile();
    const originalDb = openDatabaseImage(sqlite3, original);
    const originalSignature = databaseSchemaSignature(originalDb);
    originalDb.close();
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );

    expect(() => lifecycle.open()).toThrow('migration_failure_injected');

    const after = await storage.exportFile();
    expect(after).toEqual(original);
    const inspect = openDatabaseImage(sqlite3, after);
    try {
      expect(databaseSchemaSignature(inspect)).toBe(originalSignature);
      expect(
        inspect.selectValue(
          `SELECT count(*) FROM sqlite_schema
           WHERE name IN ('migration_probe_first', 'migration_probe_second')`,
        ),
      ).toBe(0);
    } finally {
      inspect.close();
    }
  });

  it('migrates once and performs no second migration after reopen', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const storage = new ProbedStorage(sqlite3);
    await storage.replaceFile(image(schema));
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      probedRegistry(targetSchema),
    );

    lifecycle.open();
    expect(storage.migrationExecutions).toBe(1);
    lifecycle.reopen();
    expect(storage.migrationExecutions).toBe(1);
    lifecycle.close();
  });

  it('migrates a known-old import while quarantined and exports it stably', async () => {
    const targetSchema = `${schema}\n${FIRST_INDEX}\n`;
    const registry = Object.freeze([
      DATABASE_MIGRATIONS[0]!,
      migration(
        '0001_test_import',
        FIRST_INDEX,
        schemaChecksum(targetSchema),
      ),
    ]);
    const storage = await storageHolding(targetSchema);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      storage,
      targetSchema,
      () => undefined,
      registry,
    );
    lifecycle.open();

    const old = openDatabaseImage(sqlite3, image(schema), {
      readonly: false,
    });
    let oldBytes: Uint8Array;
    try {
      old.exec("INSERT INTO characters (name) VALUES ('Migrated import')");
      oldBytes = sqlite3.capi.sqlite3_js_db_export(old).slice();
    } finally {
      old.close();
    }

    await lifecycle.replace(oldBytes);
    const firstExport = await lifecycle.exportBytes();
    lifecycle.reopen();
    const secondExport = await lifecycle.exportBytes();

    expect(secondExport).toEqual(firstExport);
    expect(
      lifecycle.database.allRaw('SELECT name FROM characters'),
    ).toEqual([{ name: 'Migrated import' }]);
    expect(
      lifecycle.database.scalar(
        `SELECT count(*) FROM sqlite_schema
         WHERE type = 'index' AND name = 'migration_probe_first'`,
      ),
    ).toBe(1);
    lifecycle.close();
  });

  it('rejects a checksum mismatch before touching the image', () => {
    const shipped = DATABASE_MIGRATIONS[0]!;
    const corrupted = Object.freeze([
      {
        ...shipped,
        sql: `${shipped.sql}\nSELECT 1;`,
      },
    ]);
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
      () => undefined,
      corrupted,
    );

    expect(() => lifecycle.open()).toThrow(
      `Database migration "${shipped.id}" checksum mismatch`,
    );
  });
});
