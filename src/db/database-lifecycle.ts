import type {
  Database,
  SAHPoolUtil,
  Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import {
  DatabaseContext,
  hasApplicationSchema,
  prepareConnection,
} from './database';
import { APPLICATION_TABLES } from '../domain/contracts/tables';

/**
 * Every table an application database image must contain.
 *
 * This was a 38-name transcription maintained by hand IN THE FILE THAT
 * VALIDATES DATABASE IMAGES — the worst place for a list to drift, because a
 * forgotten entry means the validator silently stops checking for a table.
 * It is now derived from the Drizzle schema, so adding a table is a compile
 * error until it is classified (`src/domain/contracts/tables.ts`).
 */
export const applicationTables = APPLICATION_TABLES;

export interface DatabaseStorage {
  readonly filename: string;
  open(): Database;
  exportFile(): Promise<Uint8Array>;
  replaceFile(bytes: Uint8Array): Promise<void>;
}

export function createSahPoolStorage(
  pool: SAHPoolUtil,
  filename: string,
): DatabaseStorage {
  return {
    filename,
    open: () => new pool.OpfsSAHPoolDb(filename),
    exportFile: async () => (await pool.exportFile(filename)).slice(),
    replaceFile: async (bytes) => {
      await pool.importDb(filename, bytes);
    },
  };
}

export function openDatabaseImage(
  sqlite3: Sqlite3Static,
  bytes: Uint8Array,
  options: { readonly?: boolean } = {},
): Database {
  if (bytes.byteLength === 0) {
    throw new Error('Database image is empty.');
  }

  const db = new sqlite3.oo1.DB(':memory:', 'c');
  const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
  let sqliteOwnsPointer = false;
  try {
    const result = sqlite3.capi.sqlite3_deserialize(
      db,
      'main',
      pointer,
      bytes.byteLength,
      bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
        (options.readonly === false
          ? sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
          : sqlite3.capi.SQLITE_DESERIALIZE_READONLY),
    );
    if (result !== sqlite3.capi.SQLITE_OK) {
      db.checkRc(result);
    }
    sqliteOwnsPointer = true;
    return db;
  } catch (error) {
    if (!sqliteOwnsPointer) {
      sqlite3.wasm.dealloc(pointer);
    }
    db.close();
    throw error;
  }
}

export function validateDatabaseConnection(db: Database): void {
  const integrity = db.selectValue('PRAGMA quick_check');
  if (integrity !== 'ok') {
    throw new Error(`SQLite integrity check failed: ${String(integrity)}.`);
  }

  const foreignKeyViolation = db.selectObject('PRAGMA foreign_key_check');
  if (foreignKeyViolation !== undefined) {
    throw new Error(
      `SQLite foreign-key check failed for table ${String(
        foreignKeyViolation.table,
      )}.`,
    );
  }

  const tables = new Set(
    db
      .selectValues(
        `SELECT name
         FROM sqlite_schema
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      )
      .map(String),
  );
  const missing = applicationTables.filter((table) => !tables.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Database image is missing application tables: ${missing.join(', ')}.`,
    );
  }

  const triggers = new Set(
    db
      .selectValues(
        `SELECT name
         FROM sqlite_schema
         WHERE type = 'trigger'`,
      )
      .map(String),
  );
  for (const trigger of [
    'spell_slots_exclusive_assignment_insert',
    'spell_slots_exclusive_assignment_update',
  ]) {
    if (!triggers.has(trigger)) {
      throw new Error(`Database image is missing trigger ${trigger}.`);
    }
  }
}

function databaseSchemaSignature(db: Database): string {
  return JSON.stringify(
    db
      .selectObjects(
        `SELECT type, name, tbl_name, sql
         FROM sqlite_schema
         WHERE type IN ('table', 'index', 'trigger')
           AND name NOT LIKE 'sqlite_%'
         ORDER BY type, name`,
      )
      .map((entry) => ({
        type: String(entry.type),
        name: String(entry.name),
        table: String(entry.tbl_name),
        sql:
          typeof entry.sql === 'string'
            ? entry.sql.replace(/\s+/g, ' ').trim()
            : null,
      })),
  );
}

export class DatabaseLifecycle {
  #context: DatabaseContext | null = null;
  #expectedSchemaSignature: string | null = null;

  constructor(
    private readonly sqlite3: Sqlite3Static,
    private readonly storage: DatabaseStorage,
    private readonly schema: string,
  ) {}

  get database(): DatabaseContext {
    if (this.#context === null || !this.#context.isOpen) {
      throw new Error('Database lifecycle is closed.');
    }
    return this.#context;
  }

  get filename(): string {
    return this.storage.filename;
  }

  /**
   * True once {@link open} has succeeded and the connection is still live.
   * False both before the first open and after an open that threw — the state
   * the degraded-boot recovery path operates in.
   */
  get isOpen(): boolean {
    return this.#context?.isOpen === true;
  }

  open(): DatabaseContext {
    if (this.#context?.isOpen) {
      return this.#context;
    }
    const connection = this.storage.open();
    try {
      prepareConnection(connection);
      if (!hasApplicationSchema(connection)) {
        connection.exec(this.schema);
      }
      this.#validateApplicationDatabase(connection);
      this.#context = new DatabaseContext(connection);
      return this.#context;
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  close(): void {
    this.#context?.close();
    this.#context = null;
  }

  reopen(): DatabaseContext {
    this.close();
    return this.open();
  }

  /**
   * Reads the stored image. When the lifecycle is open this first runs
   * `PRAGMA optimize`, exactly as before. When it is NOT open — the degraded
   * boot state, where the stored image failed schema validation — the raw
   * storage handle is read directly, so a user can rescue their bytes before
   * `reset()` overwrites them. Reading the file never requires the image to be
   * one this build can interpret.
   */
  async exportBytes(): Promise<Uint8Array> {
    if (this.isOpen) {
      this.database.connection.exec('PRAGMA optimize');
    }
    return (await this.storage.exportFile()).slice();
  }

  validateBytes(bytes: Uint8Array): void {
    const candidate = openDatabaseImage(this.sqlite3, bytes.slice());
    try {
      this.#validateApplicationDatabase(candidate);
    } finally {
      candidate.close();
    }
  }

  async replace(bytes: Uint8Array): Promise<DatabaseContext> {
    const candidate = bytes.slice();
    this.validateBytes(candidate);
    const previous = await this.exportBytes();

    this.close();
    try {
      await this.storage.replaceFile(candidate);
      return this.open();
    } catch (replacementError) {
      this.close();
      try {
        await this.storage.replaceFile(previous);
        this.open();
      } catch (recoveryError) {
        throw new AggregateError(
          [replacementError, recoveryError],
          'Database replacement failed and the prior image could not be recovered.',
        );
      }
      throw replacementError;
    }
  }

  async reset(): Promise<DatabaseContext> {
    const fresh = new this.sqlite3.oo1.DB(':memory:', 'c');
    let bytes: Uint8Array;
    try {
      fresh.exec(this.schema);
      this.#validateApplicationDatabase(fresh);
      bytes = this.sqlite3.capi.sqlite3_js_db_export(fresh).slice();
    } finally {
      fresh.close();
    }
    return this.replace(bytes);
  }

  #validateApplicationDatabase(db: Database): void {
    validateDatabaseConnection(db);
    if (databaseSchemaSignature(db) !== this.#applicationSchemaSignature()) {
      throw new Error(
        'Database image schema does not match the application schema.',
      );
    }
  }

  #applicationSchemaSignature(): string {
    if (this.#expectedSchemaSignature !== null) {
      return this.#expectedSchemaSignature;
    }

    const expected = new this.sqlite3.oo1.DB(':memory:', 'c');
    try {
      expected.exec(this.schema);
      validateDatabaseConnection(expected);
      this.#expectedSchemaSignature = databaseSchemaSignature(expected);
      return this.#expectedSchemaSignature;
    } finally {
      expected.close();
    }
  }
}
