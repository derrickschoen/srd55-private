import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from './schema.sql?raw';
import {
  DatabaseLifecycle,
  type DatabaseSeed,
  type DatabaseStorage,
} from './database-lifecycle';
import { ensureBundledClassContent } from '../rules/class-progression-lookup';

/**
 * The bundled content every application database is expected to carry. Today
 * that is the SRD class and subclass progression catalog; the spell catalog
 * stays user-supplied through catalog import and is deliberately absent here.
 */
export const applicationSeed: DatabaseSeed = (db) => {
  ensureBundledClassContent(db);
};

/**
 * Composition root for the application database. Everything that boots a real
 * database — the worker, and the RPC harness that stands in for it — goes
 * through here so that schema and bundled content can never diverge.
 */
export function createApplicationLifecycle(
  sqlite3: Sqlite3Static,
  storage: DatabaseStorage,
): DatabaseLifecycle {
  return new DatabaseLifecycle(sqlite3, storage, schema, applicationSeed);
}
