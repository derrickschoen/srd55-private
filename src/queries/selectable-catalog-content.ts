import type { ContentKind } from '../catalog/content-identity';
import {
  catalogContentVisibilities,
  type CatalogContentVisibility,
} from '../catalog/content-visibility';

export type CatalogContentKeySql = `${string}.content_key`;

const userFacingVisibility = Object.freeze({
  listed: true,
  ui_hidden: false,
}) satisfies Readonly<Record<CatalogContentVisibility, boolean>>;

function listedVisibilityValuesSql(): string {
  const listed = catalogContentVisibilities.filter(
    (visibility) => userFacingVisibility[visibility],
  );
  return listed.map((visibility) => `'${visibility}'`).join(', ');
}

export type CatalogContentVisibilitySql = `${string}.visibility`;

export function userFacingCatalogVisibilitySql(
  visibilitySql: CatalogContentVisibilitySql,
): string {
  return `${visibilitySql} IN (${listedVisibilityValuesSql()})`;
}

/**
 * Fresh-choice predicate for installed catalog content.
 *
 * Superseded rows remain in every definition table so existing characters,
 * sheets, replacement review, and exports can still resolve them. Only a
 * query that offers a NEW catalog attachment should interpolate this seam.
 *
 * Phrased as "no DISQUALIFYING identity row" rather than "a qualifying row
 * exists": content with no identity row at all is the honest `unknown`
 * catalog layer and stays offerable (D33); only an explicit `ui_hidden` or
 * archived identity hides a row from fresh pickers (D299).
 */
export function selectableCatalogContentSql(
  contentKind: ContentKind,
  contentKeySql: CatalogContentKeySql,
): string {
  return `NOT EXISTS (
    SELECT 1
      FROM catalog_content_identities AS selectable_identity
     WHERE selectable_identity.content_kind = '${contentKind}'
       AND selectable_identity.content_key = ${contentKeySql}
       AND NOT (selectable_identity.archived_at IS NULL
         AND ${userFacingCatalogVisibilitySql('selectable_identity.visibility')})
  ) AND NOT EXISTS (
    SELECT 1
      FROM catalog_content_supersessions AS supersession
     WHERE supersession.content_kind = '${contentKind}'
       AND supersession.superseded_content_key = ${contentKeySql}
  )`;
}
