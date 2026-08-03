import { bundledClassContentKeys } from '../rules/class-progression-lookup';
import { bundledSpeciesDefinitions } from '../rules/origin-definitions-srd';
import { bundledBackgroundDefinitions } from '../rules/background-definitions-srd';
import { bundledFeatDefinitions } from '../rules/feats-srd';
import {
  bundledBackgroundTemplates,
  bundledSpeciesTemplates,
} from '../rules/origins-srd';
import type { DatabaseContext } from '../db/database';

export type BundledSourceKind =
  | 'class'
  | 'feat'
  | 'species'
  | 'background';

const keyCache = new Map<BundledSourceKind, readonly string[]>();

/**
 * Production membership is the union of the exact definition and template
 * arrays consumed by boot seeding: guided creation reads the template half,
 * while planner/workspace catalogs read the definition half. Alternate image
 * seeders register extra definitions as bundled-stable while inserting them,
 * so the database-aware manifest is constructed from the same source of truth
 * on both boot paths. CI-3s can remove the static half after all boot identities
 * are promoted; CI-4a/HA-10 lifts the consumer filter entirely.
 */
export function bundledSourceContentKeys(
  kind: BundledSourceKind,
  db?: DatabaseContext,
): readonly string[] {
  const cached = keyCache.get(kind);
  let staticKeys = cached;
  if (staticKeys === undefined) {
    let keys: readonly string[];
    switch (kind) {
      case 'class':
        keys = bundledClassContentKeys().classes;
        break;
      case 'feat':
        keys = bundledFeatDefinitions().map((definition) => definition.content_key);
        break;
      case 'species':
        keys = [
          ...bundledSpeciesDefinitions().map((definition) => definition.content_key),
          ...bundledSpeciesTemplates().map((template) => template.content_key),
        ];
        break;
      case 'background':
        keys = [
          ...bundledBackgroundDefinitions().map((definition) => definition.content_key),
          ...bundledBackgroundTemplates().map((template) => template.content_key),
        ];
        break;
    }
    staticKeys = Object.freeze([...keys].sort());
    keyCache.set(kind, staticKeys);
  }
  if (db === undefined) return staticKeys;
  const registeredKeys = db.allRaw(
    `SELECT content_key
     FROM catalog_content_identities
     WHERE content_kind = ?
       AND key_kind = 'bundled-stable'
       AND catalog_layer = 'bundled'
     ORDER BY content_key`,
    [kind],
  ).map((row) => String(row.content_key));
  return Object.freeze(
    [...new Set([...staticKeys, ...registeredKeys])].sort(),
  );
}

export function isBundledSourceContentKey(
  kind: BundledSourceKind,
  contentKey: string,
  db: DatabaseContext,
): boolean {
  return bundledSourceContentKeys(kind, db).includes(contentKey);
}
