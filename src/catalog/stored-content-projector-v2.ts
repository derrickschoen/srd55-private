import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import type { ContentKind } from './content-identity';
import {
  projectStoredSpeciesContentV2,
  storedAuthoredRegistryReferencesV1,
} from './stored-authored-content-projector-v1';
import { projectStoredPortableContentV1 } from './stored-content-projector-v1';

/**
 * content-v2 changes only the species source-rule aggregate. Every other kind
 * deliberately reuses its byte-frozen v1 semantic payload and merely lives in
 * a v2 identity envelope.
 */
export function projectStoredPortableContentV2(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
) {
  if (kind === 'species') {
    return projectStoredSpeciesContentV2(
      db,
      contentKey,
      storedAuthoredRegistryReferencesV1(db),
    );
  }
  return projectStoredPortableContentV1(db, kind, contentKey);
}

export function projectStoredContentV2(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: ContentKey,
) {
  const stored = projectStoredPortableContentV2(db, kind, contentKey);
  return Object.freeze({
    kind: stored.kind,
    edition: stored.aggregate.rules_edition,
    name: stored.aggregate.name,
    payload: stored.payload,
  });
}
