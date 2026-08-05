import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from './schema.sql?raw';
import {
  DatabaseLifecycle,
  type DatabaseSeed,
  type DatabaseStorage,
} from './database-lifecycle';
import { ensureBundledClassContent } from '../rules/class-progression-lookup';
import {
  assertBundledSrdSubclassSpellReferences,
  ensureBundledSrdSubclassContent,
} from '../rules/srd-subclass-content';
import { ensureBundledWeaponContent } from '../rules/weapons-srd';
import { ensureBundledOriginContent } from '../rules/origins-srd';
import { ensureBundledSpeciesDefinitions } from '../rules/origin-definitions-srd';
import { ensureBundledBackgroundDefinitions } from '../rules/background-definitions-srd';
import { ensureBundledSheetContent } from '../rules/sheet-srd';
import {
  ensureBundledSpellContent,
  installMissingBundledSpellContent,
  type BundledSpellSeedResult,
} from '../rules/spells-srd';
import { ensureBundledClassEquipment } from '../rules/class-equipment-srd';
import { ensureBundledFeatContent } from '../rules/feats-srd';
import { reconcileLegacyLevelFeatChoices } from '../rules/legacy-level-feat-choices';
import { ensureBundledClassResources } from '../rules/class-resources-srd';
import { reconcileBundledContentRegistryWithStoredProjectionsV1 } from '../catalog/bundled-content-registry-v1';

/**
 * The bundled content every application database is expected to carry: the SRD
 * class and subclass progression catalog, the read-only SRD spell catalog, the
 * SRD weapon catalog with its weapon-mastery content, the SRD species and
 * background template catalog, the SRD feat catalog, and the sheet core —
 * per-class hit dice, saving throws, skill and proficiency lists, plus the
 * armour templates.
 *
 * ORDER MATTERS, AND IT NOW MATTERS IN FOUR PLACES RATHER THAN THREE.
 *
 * 1. Weapon mastery writes one row per `class_definitions` row, so the classes
 *    must exist first. Seeding weapons into a database with no classes would
 *    silently write no grant rows, and every mastery lookup on it would then
 *    resolve to `content_missing` — which surfaces rather than lying, but is
 *    still a repair the boot path should not need.
 * 2. The sheet core has the same dependency and for the same reason: it joins
 *    its parsed class names to `class_definitions.name`.
 * 3. Class resources are keyed to `class_definitions.content_key`, so their
 *    exact ladder and formula manifests must be repaired after classes exist.
 * 4. THE ORIGINS CATALOG IS NO LONGER ORDER-INDEPENDENT. Its comment here used
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
  ensureBundledSrdSubclassContent(db);
  ensureBundledClassResources(db);
  ensureBundledWeaponContent(db);
  ensureBundledSheetContent(db);
  ensureBundledClassEquipment(db);
  ensureBundledOriginContent(db);
  // The species DEFINITIONS (grant rules — dispatch A6) are order-independent:
  // their `spell_version_key` references resolve lazily, at grant generation,
  // not at seed time, so they need nothing above and nothing below needs them.
  ensureBundledSpeciesDefinitions(db);
  // The background DEFINITIONS (dispatch B3, per D61) are order-independent
  // for the same reason: their one grant rule resolves its feat lazily, from
  // the instance config, at grant generation — never at seed time.
  ensureBundledBackgroundDefinitions(db);
  ensureBundledFeatContent(db);
  // Install absent spell roots before the general projector pass. On a light
  // boot the exact-cardinality guard writes nothing; present rows, including
  // drifted rows, remain untouched for reconciliation to observe.
  installMissingBundledSpellContent(db);
  reconcileLegacyLevelFeatChoices(db);
  // D84 runs only after every definition/template half and dependency catalog
  // is present, so all nine stored projectors observe the same graph runtime
  // consumers do. The spell seeder consumes the spell projections produced by
  // THIS pass before later kinds project their dependency graph. It may skip
  // only a duplicate seeder projection, never general reconciliation.
  let spells: BundledSpellSeedResult | undefined;
  const registryPass = reconcileBundledContentRegistryWithStoredProjectionsV1(
    db,
    {
      afterKind: (kind, storedProjections) => {
        if (kind === 'spell') {
          spells = ensureBundledSpellContent(db, storedProjections);
        }
      },
    },
  );
  if (spells === undefined) {
    throw new TypeError('Bundled spell reconciliation did not run.');
  }
  const registry = registryPass.summary;
  assertBundledSrdSubclassSpellReferences(db);
  if (
    spells.updated > 0 || spells.refused > 0 ||
    registry.orphaned > 0 || registry.refused > 0
  ) {
    console.warn(
      'Bundled content reconciliation: ' +
      `${String(spells.healthy)} spell entries healthy, ` +
      `${String(spells.updated)} updated, ${String(spells.refused)} refused; ` +
      `${String(registry.orphaned)} registry entries orphaned, ` +
      `${String(registry.refused)} refused.`,
    );
  }
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
