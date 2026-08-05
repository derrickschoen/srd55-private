import type { ContentKind } from '../../../src/catalog/content-identity';
import { normalizeContentIdentityName } from '../../../src/catalog/content-identity';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { registerAssertedPlaceholderContentIdentity } from '../../../src/catalog/content-registry';
import { DatabaseContext } from '../../../src/db/database';
import {
  registerAssertedFixtureContentIdentity,
  registerFixtureContentIdentity,
} from '../../helpers/content-identity';

/** Browser-fixture entry point for the shared registry-first fixture rule. */
export function registerBrowserFixtureContentIdentity(
  db: DatabaseContext,
  identity: Readonly<{
    kind: ContentKind;
    name: string;
  } & (
    | { keyKind: 'bundled-stable'; contentKey: string }
    | { keyKind: 'asserted'; edition: string; ownerNamespace?: string }
  )>,
): string {
  if (identity.keyKind === 'asserted') {
    if (identity.kind === 'spell') {
      const contentKey = assertedExternalContentKey(
        identity.kind,
        identity.edition,
        identity.name,
        identity.ownerNamespace,
      );
      registerAssertedPlaceholderContentIdentity(db, {
        contentKey,
        normalizedName: normalizeContentIdentityName(identity.name),
      });
      return contentKey;
    }
    return registerAssertedFixtureContentIdentity(db, identity);
  }
  registerFixtureContentIdentity(db, identity);
  return identity.contentKey;
}
