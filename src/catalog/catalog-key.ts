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

/**
 * THE OWNER NAMESPACE OF AN IMPORTED CONTENT KEY, OR `null` WHEN IT IS NOT ONE.
 *
 * This is the ONE thing that keeps imported content apart from bundled content,
 * and it is a grammar rather than a column. `spell_versions` has a `provenance`
 * column to lean on; `subclass_definitions` has none, and a backup carries a
 * subclass by `content_key` and nothing else (`subclass_definitions` is
 * `backupReference: true`, its features are not), while a share link carries
 * `subclassKey` and nothing else. So the key is the only field that survives
 * into a backup, a share link and the recipient's database alike, and the only
 * place the distinction can be made to hold across all three.
 *
 * THE THREE-PART FORM IS THE IMPORTED ONE, AND THE MIDDLE SEGMENT IS WHY. Every
 * bundled class-catalog key the seeder mints puts a RECORD-KIND LITERAL there —
 * `2024:class:bard`, `2024:subclass:ek`, `2024:feature:thirsting-blade`
 * — and none of those literals contains a dot. `OWNER_NAMESPACE` REQUIRES at
 * least one dot, so `2024:longroad.homebrew:college-of-the-long-road` is
 * accepted and `2024:subclass:ek` is refused BY SHAPE. An importer
 * that only accepts imported keys therefore cannot overwrite a bundled row even
 * if a document asks it to, and no convention has to be remembered for that to
 * stay true.
 *
 * THE TWO-PART FORM IS DELIBERATELY EXCLUDED. `2024:true-strike` is a valid
 * SPELL key (`isSpellVersionKey`) and is the shape `officialSpellKey` mints for
 * catalogued official content; it names no owner, so it cannot answer "whose
 * import was this?" and is not an imported key here.
 *
 * Returns the namespace rather than a boolean because the namespace is the
 * answer to that question, and a caller that wants only the boolean has
 * `isImportedContentKey` below.
 *
 * THE `null` IS D6 LIMB "THE ABSENCE IS THE ANSWER", not a failure signal and
 * not an unknown: a bundled key HAS no owner namespace, and that is a fact
 * about the key rather than something this function could not work out. It is
 * asked of every key in the table at once — see
 * `tests/integration/catalog/subclass-provenance.test.ts` — so a thrown error
 * would have been the wrong shape for the only question anyone asks it.
 */
export function importedContentKeyOwner(value: string): string | null {
  const parts = value.split(':');
  if (parts.length !== 3) {
    return null;
  }
  const [edition, owner, name] = parts as [string, string, string];
  return KEY_COMPONENT.test(edition) &&
    OWNER_NAMESPACE.test(owner) &&
    KEY_COMPONENT.test(name)
    ? owner
    : null;
}

/** Whether `value` is a key an import minted. See `importedContentKeyOwner`. */
export function isImportedContentKey(value: string): boolean {
  return importedContentKeyOwner(value) !== null;
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
