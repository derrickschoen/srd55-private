import { bundledClassContentKeys } from '../rules/class-progression-lookup';
import {
  bundledBackgroundTemplates,
  bundledSpeciesTemplates,
} from '../rules/origins-srd';
import { bundledFeatDefinitions } from '../rules/feats-srd';

export type BundledSourceKind =
  | 'class'
  | 'feat'
  | 'species'
  | 'background';

const keyCache = new Map<BundledSourceKind, readonly string[]>();
const membershipCache = new Map<BundledSourceKind, ReadonlySet<string>>();

/**
 * The bundled manifests are the authoritative membership boundary until
 * CI-3s promotes boot-seeded identities to the bundled catalog layer.
 * CI-4a/HA-10 lifts the consumer filter after imported aggregates can be
 * applied completely; until then every selection surface shares this test.
 */
export function bundledSourceContentKeys(
  kind: BundledSourceKind,
): readonly string[] {
  const cached = keyCache.get(kind);
  if (cached !== undefined) return cached;
  let keys: readonly string[];
  switch (kind) {
    case 'class':
      keys = bundledClassContentKeys().classes;
      break;
    case 'feat':
      keys = bundledFeatDefinitions().map((definition) => definition.content_key);
      break;
    case 'species':
      keys = bundledSpeciesTemplates().map((template) => template.content_key);
      break;
    case 'background':
      keys = bundledBackgroundTemplates().map((template) => template.content_key);
      break;
  }
  const frozen = Object.freeze([...keys]);
  keyCache.set(kind, frozen);
  return frozen;
}

export function isBundledSourceContentKey(
  kind: BundledSourceKind,
  contentKey: string,
): boolean {
  let membership = membershipCache.get(kind);
  if (membership === undefined) {
    membership = new Set(bundledSourceContentKeys(kind));
    membershipCache.set(kind, membership);
  }
  return membership.has(contentKey);
}
