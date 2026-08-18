import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import schema from '../../src/db/schema.sql?raw';
import { applicationSeed } from '../../src/db/bootstrap';
import { DatabaseContext, prepareConnection } from '../../src/db/database';
import {
  openDatabaseImage,
  type DatabaseStorage,
} from '../../src/db/database-lifecycle';
import { registerSqliteQueryEngine } from '../../src/db/query';
import { attachSqlTrace } from './sql-trace';

let sqlitePromise: Promise<Sqlite3Static> | undefined;

// Vitest isolates each file's module graph, while `process` remains local to
// and stable for the worker. Keep the promise there so files assigned to the
// same worker share one image build without sharing a database connection.
const workerState = process as typeof process & {
  __dndSeededDatabaseImagePromise?: Promise<Uint8Array>;
};

export function getSqlite3(): Promise<Sqlite3Static> {
  sqlitePromise ??= sqlite3InitModule().then((sqlite3) => {
    registerSqliteQueryEngine(sqlite3);
    return sqlite3;
  });
  return sqlitePromise;
}

export async function openTestDatabase(options: {
  applySchema?: boolean;
} = {}): Promise<Database> {
  const sqlite3 = await getSqlite3();
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  attachSqlTrace(db, sqlite3);
  if (options.applySchema !== false) {
    db.exec(schema);
  }
  return db;
}

async function seededDatabaseImage(): Promise<Uint8Array> {
  workerState.__dndSeededDatabaseImagePromise ??= (async () => {
    const sqlite3 = await getSqlite3();
    const db = await openTestDatabase();
    try {
      applicationSeed(new DatabaseContext(db));
      return sqlite3.capi.sqlite3_js_db_export(db).slice();
    } finally {
      db.close();
    }
  })();
  return workerState.__dndSeededDatabaseImagePromise;
}

/**
 * Opens an isolated, writable clone of one schema-and-seed image per Vitest
 * worker. Tests must opt in explicitly; {@link openTestDatabase} remains the
 * fresh-schema path for database lifecycle and seeding tests.
 */
export async function openSeededTestDatabase(): Promise<Database> {
  const sqlite3 = await getSqlite3();
  const bytes = (await seededDatabaseImage()).slice();
  const db = openDatabaseImage(sqlite3, bytes, { readonly: false });
  prepareConnection(db);
  attachSqlTrace(db, sqlite3);
  return db;
}

export class MemoryDatabaseStorage implements DatabaseStorage {
  readonly filename = ':memory-backed-image:';
  #bytes: Uint8Array | null = null;
  #active: Database | null = null;
  failNextReplacement = false;

  constructor(private readonly sqlite3: Sqlite3Static) {}

  open(): Database {
    if (this.#active?.isOpen()) {
      throw new Error('Memory database storage already has an open connection.');
    }
    const db =
      this.#bytes === null
        ? new this.sqlite3.oo1.DB(':memory:', 'c')
        : openDatabaseImage(this.sqlite3, this.#bytes, { readonly: false });
    attachSqlTrace(db, this.sqlite3);
    this.#active = db;
    db.onclose = {
      before: (closing) => {
        this.#bytes =
          this.sqlite3.capi.sqlite3_js_db_export(closing).slice();
      },
      after: () => {
        this.#active = null;
      },
    };
    return db;
  }

  async exportFile(): Promise<Uint8Array> {
    if (this.#active?.isOpen()) {
      this.#bytes =
        this.sqlite3.capi.sqlite3_js_db_export(this.#active).slice();
    }
    if (this.#bytes === null) {
      throw new Error('Memory database storage has no image.');
    }
    return this.#bytes.slice();
  }

  async replaceFile(bytes: Uint8Array): Promise<void> {
    if (this.#active?.isOpen()) {
      throw new Error('Cannot replace an open memory database.');
    }
    if (this.failNextReplacement) {
      this.failNextReplacement = false;
      throw new Error('Injected storage replacement failure.');
    }
    this.#bytes = bytes.slice();
  }
}
