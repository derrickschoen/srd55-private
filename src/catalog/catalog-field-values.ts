export type CatalogFieldRefusal = (message: string) => never;

/**
 * Runtime locator queries preserve bytes. Refuse surrounding whitespace at
 * the first parsed/stored seam instead of deriving identity for a value the
 * runtime will query differently.
 */
export function trimEqualCatalogLocator(
  value: string,
  label: string,
  refuse: CatalogFieldRefusal,
): string {
  if (value !== value.trim()) {
    return refuse(`Catalog field '${label}' contains surrounding whitespace.`);
  }
  return value;
}
