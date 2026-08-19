/** User-facing catalogue exposure; storage always carries one explicit arm. */
export const catalogContentVisibilities = ['listed', 'ui_hidden'] as const;
export type CatalogContentVisibility =
  (typeof catalogContentVisibilities)[number];

/** Exhaustive user-facing policy for the closed visibility vocabulary. */
export function catalogContentIsUserFacing(
  visibility: CatalogContentVisibility,
): boolean {
  switch (visibility) {
    case 'listed':
      return true;
    case 'ui_hidden':
      return false;
  }
}
