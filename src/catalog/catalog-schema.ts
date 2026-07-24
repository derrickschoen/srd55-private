import {
  effectReliabilityCategories,
  rulesEditions,
  type EffectReliabilityCategory,
  type RulesEdition,
} from '../domain/enums';
import { isRecord } from '../worker/handler';

export interface CatalogRecord {
  identityKey: string;
  versionKey: string;
  name: string;
  edition: RulesEdition;
  level: number;
  school: string;
  castingTime: string | null;
  range: string | null;
  components: string | null;
  duration: string | null;
  concentration: boolean;
  ritual: boolean;
  attackModes: string[];
  saveAbilities: string[];
  effectReliabilityCategory: EffectReliabilityCategory;
  spellLists: string[];
  sourceBooks: string[];
  sourcePage: number | null;
  sourceSlug: string | null;
  tags: string[];
  healing: boolean;
}

export interface CatalogDescription {
  versionKey: string;
  description: string;
}

export interface CatalogImportParams {
  documents: string[];
  textDocuments?: string[];
  dryRun?: boolean;
}

function parseJsonDocument(document: string, label: string): unknown {
  try {
    return JSON.parse(document) as unknown;
  } catch (error) {
    throw new TypeError(
      `Invalid ${label} JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(
      `Catalog field '${field}' must be a non-empty string.`,
    );
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(
      `Catalog field '${field}' must be a string or null.`,
    );
  }
  return value;
}

function stringList(
  value: unknown,
  field: string,
  optional = false,
): string[] {
  if (optional && value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`Catalog field '${field}' must be a list.`);
  }
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new TypeError(
        `Catalog field '${field}' must contain non-empty strings.`,
      );
    }
  }
  return [...value] as string[];
}

function catalogRecord(value: unknown): CatalogRecord {
  if (!isRecord(value)) {
    throw new TypeError('Catalog document contains a non-object record.');
  }

  const level = value.level;
  if (!Number.isInteger(level) || Number(level) < 0 || Number(level) > 9) {
    throw new TypeError(
      "Catalog field 'level' must be an integer from 0 through 9.",
    );
  }
  for (const field of ['concentration', 'ritual'] as const) {
    if (typeof value[field] !== 'boolean') {
      throw new TypeError(`Catalog field '${field}' must be boolean.`);
    }
  }

  const edition = nonEmptyString(value.edition, 'edition');
  if (!rulesEditions.includes(edition as RulesEdition)) {
    throw new TypeError(
      `Catalog field 'edition' must be one of ${rulesEditions.join(', ')}.`,
    );
  }
  const reliability =
    value.effectReliabilityCategory === undefined
      ? 'fixed_effect'
      : nonEmptyString(
          value.effectReliabilityCategory,
          'effectReliabilityCategory',
        );
  if (
    !effectReliabilityCategories.includes(
      reliability as EffectReliabilityCategory,
    )
  ) {
    throw new TypeError(
      `Catalog field 'effectReliabilityCategory' must be one of ${effectReliabilityCategories.join(', ')}.`,
    );
  }
  const sourcePage = value.sourcePage;
  if (
    sourcePage !== undefined &&
    sourcePage !== null &&
    (!Number.isSafeInteger(sourcePage) || Number(sourcePage) < 0)
  ) {
    throw new TypeError(
      "Catalog field 'sourcePage' must be a non-negative integer or null.",
    );
  }
  if (value.healing !== undefined && typeof value.healing !== 'boolean') {
    throw new TypeError("Catalog field 'healing' must be boolean.");
  }

  return {
    identityKey: nonEmptyString(value.identityKey, 'identityKey'),
    versionKey: nonEmptyString(value.versionKey, 'versionKey'),
    name: nonEmptyString(value.name, 'name'),
    edition: edition as RulesEdition,
    level: Number(level),
    school: nonEmptyString(value.school, 'school'),
    castingTime: nullableString(value.castingTime, 'castingTime'),
    range: nullableString(value.range, 'range'),
    components: nullableString(value.components, 'components'),
    duration: nullableString(value.duration, 'duration'),
    concentration: value.concentration as boolean,
    ritual: value.ritual as boolean,
    attackModes: stringList(value.attackModes, 'attackModes'),
    saveAbilities: stringList(value.saveAbilities, 'saveAbilities'),
    effectReliabilityCategory:
      reliability as EffectReliabilityCategory,
    spellLists: stringList(value.spellLists, 'spellLists'),
    sourceBooks: stringList(value.sourceBooks, 'sourceBooks'),
    sourcePage:
      sourcePage === undefined || sourcePage === null
        ? null
        : Number(sourcePage),
    sourceSlug: nullableString(value.sourceSlug, 'sourceSlug'),
    tags: stringList(value.tags, 'tags', true),
    healing: value.healing === true,
  };
}

export function parseCatalogDocuments(
  documents: readonly string[],
): CatalogRecord[] {
  if (documents.length === 0) {
    throw new TypeError('At least one Tier 1 catalog document is required.');
  }
  const records: CatalogRecord[] = [];
  documents.forEach((document, index) => {
    const decoded = parseJsonDocument(
      document,
      `Tier 1 catalog document ${index + 1}`,
    );
    if (!Array.isArray(decoded)) {
      throw new TypeError(
        `Tier 1 catalog document ${index + 1} must contain a JSON list.`,
      );
    }
    decoded.forEach((value) => records.push(catalogRecord(value)));
  });
  return records;
}

export function parseDescriptionDocuments(
  documents: readonly string[] | undefined,
): CatalogDescription[] | null {
  if (documents === undefined || documents.length === 0) {
    return null;
  }

  const byVersion = new Map<string, string>();
  documents.forEach((document, index) => {
    const decoded = parseJsonDocument(
      document,
      `Tier 2 catalog document ${index + 1}`,
    );
    if (!Array.isArray(decoded)) {
      throw new TypeError(
        `Tier 2 catalog document ${index + 1} must contain a JSON list.`,
      );
    }
    for (const value of decoded) {
      if (!isRecord(value)) {
        throw new TypeError(
          `Tier 2 catalog document ${index + 1} contains a non-object record.`,
        );
      }
      const versionKey = value.versionKey;
      if (typeof versionKey !== 'string' || versionKey.trim() === '') {
        throw new TypeError(
          `Tier 2 catalog document ${index + 1} contains an invalid versionKey.`,
        );
      }
      const description = value._description;
      if (typeof description !== 'string' || description.trim() === '') {
        throw new TypeError(
          `Tier 2 description for ${versionKey} must be a non-empty string.`,
        );
      }
      const existing = byVersion.get(versionKey);
      if (existing !== undefined && existing !== description) {
        throw new TypeError(
          `Tier 2 has conflicting descriptions for ${versionKey}.`,
        );
      }
      byVersion.set(versionKey, description);
    }
  });

  return [...byVersion.entries()].map(([versionKey, description]) => ({
    versionKey,
    description,
  }));
}

export function isCatalogImportParams(
  params: unknown,
): params is CatalogImportParams {
  if (!isRecord(params)) {
    return false;
  }
  const keys = Object.keys(params);
  if (
    keys.some(
      (key) =>
        key !== 'documents' &&
        key !== 'textDocuments' &&
        key !== 'dryRun',
    ) ||
    !Array.isArray(params.documents) ||
    params.documents.length === 0 ||
    !Array.from(params.documents).every(
      (value) => typeof value === 'string',
    )
  ) {
    return false;
  }
  if (
    params.textDocuments !== undefined &&
    (!Array.isArray(params.textDocuments) ||
      !Array.from(params.textDocuments).every(
        (value) => typeof value === 'string',
      ))
  ) {
    return false;
  }
  return params.dryRun === undefined || typeof params.dryRun === 'boolean';
}
