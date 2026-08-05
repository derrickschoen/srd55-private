import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import type { ContentKind } from './content-identity';
import { projectStoredEquipmentContentV1 } from './equipment-content-projector-v1';
import { projectStoredSpellContentV1 } from './spell-content-projector-v1';
import {
  projectStoredClassContentV1,
  projectStoredFeatContentV1,
} from './source-content-projector-v1';
import {
  projectStoredAuthoredContentV1,
  storedAuthoredRegistryReferencesV1,
} from './stored-authored-content-projector-v1';

export interface StoredContentProjectionV1 {
  readonly kind: ContentKind;
  readonly edition: string;
  readonly name: string;
  readonly payload: unknown;
}

/**
 * The one live stored-row projection switch used by graph staleness checks.
 * Keeping it beside the projectors prevents each importer from defining a
 * partial view of the referenced aggregate it happens to understand.
 */
export function projectStoredContentV1(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
): StoredContentProjectionV1 {
  const references = storedAuthoredRegistryReferencesV1(db);
  let stored: {
    readonly kind: ContentKind;
    readonly aggregate: { readonly rules_edition: string; readonly name: string };
    readonly payload: unknown;
  };
  switch (kind) {
    case 'class':
      stored = projectStoredClassContentV1(db, contentKey, references);
      break;
    case 'feat':
      stored = projectStoredFeatContentV1(db, contentKey, references);
      break;
    case 'subclass':
    case 'species':
    case 'background':
      stored = projectStoredAuthoredContentV1(db, {
        kind,
        contentKey,
        references,
      });
      break;
    case 'spell':
      stored = projectStoredSpellContentV1(db, contentKey);
      break;
    case 'weapon':
      stored = projectStoredEquipmentContentV1(db, { kind: 'weapon', contentKey });
      break;
    case 'armor':
      stored = projectStoredEquipmentContentV1(db, { kind: 'armor', contentKey });
      break;
    case 'item':
      stored = projectStoredEquipmentContentV1(db, { kind: 'item', contentKey });
      break;
  }
  return Object.freeze({
    kind: stored.kind,
    edition: stored.aggregate.rules_edition,
    name: stored.aggregate.name,
    payload: stored.payload,
  });
}
