import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import type { ContentFingerprintReference } from '../authoring/contracts';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
  type ContentKind,
} from './content-identity';
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
 * The complete stored projection used by portable documents. Unlike the
 * identity-only view above, this retains the validated display aggregate and
 * its typed outbound fingerprint edges. Database ids and lifecycle metadata
 * have already been removed by the kind-specific projector.
 */
export type StoredPortableContentProjectionV1 = ReturnType<
  typeof projectStoredPortableContentV1
>;

export function projectStoredPortableContentV1(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
) {
  const references = storedAuthoredRegistryReferencesV1(db);
  switch (kind) {
    case 'class':
      return projectStoredClassContentV1(db, contentKey, references);
    case 'feat':
      return projectStoredFeatContentV1(db, contentKey, references);
    case 'subclass':
    case 'species':
    case 'background':
      return projectStoredAuthoredContentV1(db, {
        kind,
        contentKey,
        references,
      });
    case 'spell':
      return projectStoredSpellContentV1(db, contentKey);
    case 'weapon':
      return projectStoredEquipmentContentV1(db, { kind, contentKey });
    case 'armor':
      return projectStoredEquipmentContentV1(db, { kind, contentKey });
    case 'item':
      return projectStoredEquipmentContentV1(db, { kind, contentKey });
  }
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
  const stored = projectStoredPortableContentV1(db, kind, contentKey);
  return Object.freeze({
    kind: stored.kind,
    edition: stored.aggregate.rules_edition,
    name: stored.aggregate.name,
    payload: stored.payload,
  });
}

/**
 * The one verification seam for a recorded dependency fingerprint. It proves
 * both that the registry edge resolves uniquely to the expected key and that
 * the key's live stored projection still derives the recorded digest.
 */
export function storedContentMatchesFingerprintReferenceV1<
  K extends ContentKind,
>(
  db: DatabaseContext,
  contentKey: ContentKey,
  reference: ContentFingerprintReference<K>,
): boolean {
  if (reference.scheme !== CONTENT_FINGERPRINT_SCHEME_V1) return false;
  const targets = db.allRaw(
    `SELECT DISTINCT content_key
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND fingerprint_scheme = ?
       AND fingerprint_digest = ?
       AND fingerprint_role IN ('current', 'compatible')
     ORDER BY content_key`,
    [reference.kind, reference.scheme, reference.digest],
  ).map((row) => String(row.content_key));
  if (targets.length !== 1 || targets[0] !== contentKey) return false;
  try {
    const stored = projectStoredContentV1(db, reference.kind, contentKey);
    const live = deriveContentIdentityV1({
      kind: stored.kind,
      edition: stored.edition,
      name: stored.name,
      payload: stored.payload,
    });
    return live.digest === reference.digest;
  } catch {
    return false;
  }
}
