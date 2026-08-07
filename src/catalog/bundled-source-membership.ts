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
 * With no database this returns the static boot manifest. With a database it
 * returns only registry-confirmed bundled identities. The two facts must never
 * be unioned: a manifest key says what boot intends to install, while only the
 * registry can say what layer a stored row actually belongs to.
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
  return Object.freeze(db.allRaw(
    `SELECT content_key
     FROM catalog_content_identities
     WHERE content_kind = ?
       AND key_kind = 'bundled-stable'
       AND catalog_layer = 'bundled'
     ORDER BY content_key`,
    [kind],
  ).map((row) => String(row.content_key)));
}

export function isBundledSourceContentKey(
  kind: BundledSourceKind,
  contentKey: string,
  db: DatabaseContext,
): boolean {
  return bundledSourceContentKeys(kind, db).includes(contentKey);
}
