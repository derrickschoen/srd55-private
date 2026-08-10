import { catalogLayerDisclosure, type CatalogNamedDisclosure } from './catalog-disclosure';
import { sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';

export type SpellCatalogDisclosureLocator =
  | { readonly kind: 'content_key'; readonly content_key: string; readonly active_only: boolean }
  | { readonly kind: 'version_id'; readonly spell_version_id: number };

/**
 * The one lookup for a spell version's user-facing name and catalog layer.
 * A missing version is an explicit absence: callers decide how to say UNKNOWN
 * and never substitute the content key or numeric row id as a display name.
 */
export function spellCatalogDisclosure(
  db: DatabaseContext,
  locator: SpellCatalogDisclosureLocator,
): CatalogNamedDisclosure | null {
  const predicate = locator.kind === 'content_key'
    ? `version.content_key = ?${locator.active_only ? ' AND version.is_active = 1' : ''}`
    : 'version.id = ?';
  const value = locator.kind === 'content_key'
    ? locator.content_key
    : locator.spell_version_id;
  return db.one(
    `SELECT version.display_name, identity.catalog_layer
     FROM spell_versions AS version
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'spell'
      AND identity.content_key = version.content_key
     WHERE ${predicate}`,
    [value],
    (row) => ({
      name: sqlString(row, 'display_name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
}
