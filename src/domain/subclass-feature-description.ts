declare const headingOnlyDescriptionBrand: unique symbol;
declare const nonEmptySubclassFeatureDescriptionBrand: unique symbol;

export type HeadingOnlyDescription = '' & {
  readonly [headingOnlyDescriptionBrand]: true;
};

/** D152: bundled v1 subclass rows carry feature headings, but not feature prose. */
// This cast defines the named empty state and is the only sanctioned cast to it.
export const HEADING_ONLY_DESCRIPTION = '' as HeadingOnlyDescription;

export type NonEmptySubclassFeatureDescription = string & {
  readonly [nonEmptySubclassFeatureDescriptionBrand]: true;
};

/** The two description states permitted in a persisted subclass feature row. */
export type SubclassFeatureDescription =
  | HeadingOnlyDescription
  | NonEmptySubclassFeatureDescription;

/**
 * Brands prose only after proving it is present. Tier-1 parsing applies its
 * stricter trim-aware refusal before calling this boundary.
 */
export function nonEmptySubclassFeatureDescription(
  value: string,
): NonEmptySubclassFeatureDescription {
  if (value.length === 0) {
    throw new TypeError('Subclass feature description must be non-empty.');
  }
  return value as NonEmptySubclassFeatureDescription;
}
