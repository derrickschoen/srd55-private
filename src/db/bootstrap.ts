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
import { ensureBundledSpellContent } from '../rules/spells-srd';
import { ensureBundledClassEquipment } from '../rules/class-equipment-srd';
import { ensureBundledFeatContent } from '../rules/feats-srd';

/**
 * The bundled content every application database is expected to carry: the SRD
 * class and subclass progression catalog, the read-only SRD spell catalog, the
 * SRD weapon catalog with its weapon-mastery content, the SRD species and
 * background template catalog, the SRD feat catalog, and the sheet core —
 * per-class hit dice, saving throws, skill and proficiency lists, plus the
 * armour templates.
 *
 * ORDER MATTERS, AND IT NOW MATTERS IN THREE PLACES RATHER THAN TWO.
 *
 * 1. Weapon mastery writes one row per `class_definitions` row, so the classes
 *    must exist first. Seeding weapons into a database with no classes would
 *    silently write no grant rows, and every mastery lookup on it would then
 *    resolve to `content_missing` — which surfaces rather than lying, but is
 *    still a repair the boot path should not need.
 * 2. The sheet core has the same dependency and for the same reason: it joins
 *    its parsed class names to `class_definitions.name`.
 * 3. THE ORIGINS CATALOG IS NO LONGER ORDER-INDEPENDENT. Its comment here used
 *    to read "the origins catalog references no other table", and that stopped
 *    being true when `background_equipment_items` gained real foreign keys into
 *    `weapon_templates` and `armor_templates`: a background's Spear is a
 *    reference to the weapon catalog's Spear. So it moves AFTER both, and
 *    `ensureBundledSheetContent` — which seeds `armor_templates` — moves ahead
 *    of it.
 *
 * Getting this wrong is not silent: `resolveTemplateId` in
 * `src/rules/origins-srd.ts` throws by name, and
 * `tests/integration/rules/background-equipment.test.ts` seeds origins into a
 * database with no weapon catalog on purpose to prove it.
 */
export const applicationSeed: DatabaseSeed = (db) => {
  ensureBundledClassContent(db);
  ensureBundledWeaponContent(db);
  ensureBundledSheetContent(db);
  ensureBundledClassEquipment(db);
  ensureBundledOriginContent(db);
  ensureBundledFeatContent(db);
  ensureBundledSpellContent(db);
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
