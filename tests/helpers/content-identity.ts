import type { ContentKind } from '../../src/catalog/content-identity';
import { normalizeContentIdentityName } from '../../src/catalog/content-identity';
import { assertedExternalContentKey } from '../../src/catalog/catalog-key';
import type { CatalogContentKeyKind } from '../../src/catalog/content-registry';
import { DatabaseContext } from '../../src/db/database';

export type FixtureContentKeyKind = Extract<
  CatalogContentKeyKind,
  'asserted' | 'bundled-stable'
>;

export interface FixtureContentIdentity {
  readonly kind: ContentKind;
  readonly contentKey: string;
  readonly name: string;
  readonly keyKind: FixtureContentKeyKind;
}

export interface AssertedFixtureContentIdentity {
  readonly kind: ContentKind;
  readonly edition: string;
  readonly name: string;
  readonly ownerNamespace?: string;
}

/**
 * Register the root identity a test fixture is about to insert.
 *
 * Fixture authors must classify the row explicitly: SRD-shaped/transcribed
 * content is bundled-stable, while user-authored or imported content is
 * asserted. This helper intentionally registers only the key-first identity;
 * tests that exercise fingerprint matching remain responsible for registering
 * the aggregate's real projection through the production registry API.
 */
export function registerFixtureContentIdentity(
  db: DatabaseContext,
  identity: FixtureContentIdentity,
): void {
  const catalogLayer = identity.keyKind === 'bundled-stable'
    ? 'bundled'
    : 'external';
  const normalizedName = normalizeContentIdentityName(identity.name);
  const existing = db.oneRaw(
    `SELECT content_kind, key_kind, catalog_layer, normalized_name
     FROM catalog_content_identities
     WHERE content_key = ?`,
    [identity.contentKey],
  );

  if (existing !== null) {
    if (
      existing.content_kind === identity.kind &&
      existing.key_kind === identity.keyKind &&
      existing.catalog_layer === catalogLayer &&
      existing.normalized_name === normalizedName
    ) {
      return;
    }
    throw new Error(
      `Fixture content identity '${identity.contentKey}' is already registered differently.`,
    );
  }

  db.exec(
    `INSERT INTO catalog_content_identities (
       content_key, content_kind, key_kind, catalog_layer, normalized_name
     ) VALUES (?, ?, ?, ?, ?)`,
    [
      identity.contentKey,
      identity.kind,
      identity.keyKind,
      catalogLayer,
      normalizedName,
    ],
  );
}

/** Mint and register an asserted fixture key through the production grammar. */
export function registerAssertedFixtureContentIdentity(
  db: DatabaseContext,
  identity: AssertedFixtureContentIdentity,
): string {
  const contentKey = assertedExternalContentKey(
    identity.kind,
    identity.edition,
    identity.name,
    identity.ownerNamespace,
  );
  registerFixtureContentIdentity(db, {
    kind: identity.kind,
    contentKey,
    name: identity.name,
    keyKind: 'asserted',
  });
  return contentKey;
}
