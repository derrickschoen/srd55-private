import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from './schema.sql?raw';
import {
  DatabaseLifecycle,
  type DatabaseSeed,
  type DatabaseStorage,
} from './database-lifecycle';
import { ensureBundledClassContent } from '../rules/class-progression-lookup';
import { ensureBundledWeaponContent } from '../rules/weapons-srd';
import { ensureBundledOriginContent } from '../rules/origins-srd';
import { ensureBundledSheetContent } from '../rules/sheet-srd';

/**
 * The bundled content every application database is expected to carry: the SRD
 * class and subclass progression catalog, the SRD weapon catalog with its
 * weapon-mastery content, and the SRD species and background TEMPLATE catalog.
 * The spell catalog stays user-supplied through catalog import and is
 * deliberately absent here.
 * weapon-mastery content, and the sheet core — per-class hit dice, saving
 * throws, skill and proficiency lists, plus the armour templates. The spell
 * catalog stays user-supplied through catalog import and is deliberately absent
 * here.
 *
 * ORDER MATTERS. Weapon mastery writes one row per `class_definitions` row, so
 * the classes must exist first. Seeding weapons into a database with no classes
 * would silently write no grant rows, and every mastery lookup on it would then
 * resolve to `content_missing` — which surfaces rather than lying, but is still
 * a repair the boot path should not need.
 *
 * The sheet core has the same dependency and for the same reason: it joins its
 * parsed class names to `class_definitions.name`, so it goes last.
 */
export const applicationSeed: DatabaseSeed = (db) => {
  ensureBundledClassContent(db);
  ensureBundledWeaponContent(db);
  // Order-independent: the origins catalog references no other table. It is
  // seeded last only so the two order-DEPENDENT seeds above stay adjacent.
  ensureBundledOriginContent(db);
  ensureBundledSheetContent(db);
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
