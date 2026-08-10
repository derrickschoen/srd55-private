import type { ContentKind } from '../catalog/content-identity';

export type CatalogContentKeySql = `${string}.content_key`;

/**
 * Fresh-choice predicate for installed catalog content.
 *
 * Superseded rows remain in every definition table so existing characters,
 * sheets, replacement review, and exports can still resolve them. Only a
 * query that offers a NEW catalog attachment should interpolate this seam.
 */
export function selectableCatalogContentSql(
  contentKind: ContentKind,
  contentKeySql: CatalogContentKeySql,
): string {
  return `NOT EXISTS (
    SELECT 1
      FROM catalog_content_supersessions AS supersession
     WHERE supersession.content_kind = '${contentKind}'
       AND supersession.superseded_content_key = ${contentKeySql}
  )`;
}
