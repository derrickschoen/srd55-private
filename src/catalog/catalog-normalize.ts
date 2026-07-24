import type {
  CatalogDescription,
  CatalogRecord,
} from './catalog-schema';

export interface CatalogPublication {
  sourceBook: string;
  sourcePage: number | null;
  sourceReference: string | null;
}

export interface NormalizedCatalogRecord extends CatalogRecord {
  canonicalName: string;
  publications: CatalogPublication[];
  description?: string;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function editionPriority(edition: string): number {
  if (edition === '2024') {
    return 3;
  }
  if (edition === 'expanded') {
    return 2;
  }
  return 1;
}

export function normalizeCatalogName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function normalizeCatalogRecords(
  records: readonly CatalogRecord[],
  descriptions: readonly CatalogDescription[] | null = null,
): NormalizedCatalogRecord[] {
  const byVersion = new Map<
    string,
    CatalogRecord & { publications: Map<string, CatalogPublication> }
  >();

  for (const record of records) {
    const publications = new Map(
      record.sourceBooks.map((sourceBook) => [
        sourceBook,
        {
          sourceBook,
          sourcePage: record.sourcePage,
          sourceReference: record.sourceSlug,
        },
      ]),
    );
    const existing = byVersion.get(record.versionKey);
    if (existing === undefined) {
      byVersion.set(record.versionKey, {
        ...record,
        attackModes: unique(record.attackModes),
        saveAbilities: unique(record.saveAbilities),
        spellLists: unique(record.spellLists),
        sourceBooks: unique(record.sourceBooks),
        tags: unique(record.tags),
        publications,
      });
      continue;
    }
    existing.attackModes = unique([
      ...existing.attackModes,
      ...record.attackModes,
    ]);
    existing.saveAbilities = unique([
      ...existing.saveAbilities,
      ...record.saveAbilities,
    ]);
    existing.spellLists = unique([
      ...existing.spellLists,
      ...record.spellLists,
    ]);
    existing.sourceBooks = unique([
      ...existing.sourceBooks,
      ...record.sourceBooks,
    ]);
    existing.tags = unique([...existing.tags, ...record.tags]);
    for (const [book, publication] of publications) {
      existing.publications.set(book, publication);
    }
  }

  const canonical = new Map<string, { priority: number; name: string }>();
  for (const record of byVersion.values()) {
    const priority = editionPriority(record.edition);
    const current = canonical.get(record.identityKey);
    if (current === undefined || priority > current.priority) {
      canonical.set(record.identityKey, { priority, name: record.name });
    }
  }

  const descriptionMap =
    descriptions === null
      ? null
      : new Map(
          descriptions.map(({ versionKey, description }) => [
            versionKey,
            description,
          ]),
        );
  if (descriptionMap !== null) {
    const expected = [...byVersion.keys()].sort();
    const actual = [...descriptionMap.keys()].sort();
    const expectedSet = new Set(expected);
    const actualSet = new Set(actual);
    const missing = expected.filter((key) => !actualSet.has(key));
    const unexpected = actual.filter((key) => !expectedSet.has(key));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new TypeError(
        `Tier 2 catalog does not exactly match Tier 1 (${missing.length} missing, ${unexpected.length} unexpected).`,
      );
    }
  }

  return [...byVersion.values()]
    .sort((left, right) =>
      left.versionKey < right.versionKey
        ? -1
        : left.versionKey > right.versionKey
          ? 1
          : 0,
    )
    .map(({ publications, ...record }) => ({
      ...record,
      canonicalName:
        canonical.get(record.identityKey)?.name ?? record.name,
      publications: [...publications.values()],
      ...(descriptionMap === null
        ? {}
        : { description: descriptionMap.get(record.versionKey)! }),
    }));
}
