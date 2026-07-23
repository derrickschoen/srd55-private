import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import schema from '../../src/db/schema.sql?raw';
import {
  openDatabaseImage,
  type DatabaseStorage,
} from '../../src/db/database-lifecycle';

let sqlitePromise: Promise<Sqlite3Static> | undefined;

export function getSqlite3(): Promise<Sqlite3Static> {
  sqlitePromise ??= sqlite3InitModule();
  return sqlitePromise;
}

export async function openTestDatabase(options: {
  applySchema?: boolean;
} = {}): Promise<Database> {
  const sqlite3 = await getSqlite3();
  const db = new sqlite3.oo1.DB(':memory:', 'c');
  if (options.applySchema !== false) {
    db.exec(schema);
  }
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
