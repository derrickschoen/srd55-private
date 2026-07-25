const KEY_COMPONENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OWNER_NAMESPACE =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export function normalizeCatalogKeyComponent(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (normalized === '') {
    throw new TypeError('Catalog key components must not be empty.');
  }
  return normalized;
}

export function isSpellVersionKey(value: string): boolean {
  const parts = value.split(':');
  if (parts.length === 2) {
    return (
      KEY_COMPONENT.test(parts[0] as string) &&
      KEY_COMPONENT.test(parts[1] as string)
    );
  }
  return (
    parts.length === 3 &&
    KEY_COMPONENT.test(parts[0] as string) &&
    OWNER_NAMESPACE.test(parts[1] as string) &&
    KEY_COMPONENT.test(parts[2] as string)
  );
}

export function officialSpellKey(edition: string, name: string): string {
  return `${normalizeCatalogKeyComponent(
    edition,
  )}:${normalizeCatalogKeyComponent(name)}`;
}

export function homebrewSpellKey(
  edition: string,
  owner: string,
  name: string,
  registeredOwners: ReadonlySet<string>,
): string {
  const normalizedOwner = owner
    .split('.')
    .map(normalizeCatalogKeyComponent)
    .join('.');
  if (
    !OWNER_NAMESPACE.test(normalizedOwner) ||
    !registeredOwners.has(normalizedOwner)
  ) {
    throw new TypeError(
      `Homebrew owner namespace '${normalizedOwner}' is not registered.`,
    );
  }
  return `${normalizeCatalogKeyComponent(
    edition,
  )}:${normalizedOwner}:${normalizeCatalogKeyComponent(name)}`;
}
