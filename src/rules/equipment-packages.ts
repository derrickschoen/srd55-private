import type { DatabaseContext } from '../db/database';
import type { EquipmentItemKind } from '../domain/enums';

export interface EquipmentCatalogLink {
  readonly item_kind: Exclude<EquipmentItemKind, 'gear'>;
  readonly content_key: string;
}

export interface ParsedEquipmentItem<Option extends string> {
  readonly option: Option;
  readonly sort_order: number;
  readonly quantity: number;
  readonly item_name: string;
  readonly item_kind: EquipmentItemKind;
  readonly weapon_content_key: string | null;
  readonly armor_content_key: string | null;
}

export type EquipmentLinkResolver = (
  printedItemName: string,
) => EquipmentCatalogLink | null;

type ErrorFactory = (message: string) => Error;

/**
 * A leading quantity is the count of the named item. Parenthetical numerals
 * remain part of the name, and a whole GP line is one ordinary gear entry.
 */
const LEADING_QUANTITY = /^(?<quantity>\d{1,4})\s+(?<name>\S.*)$/u;
const MONEY_LINE = /^\d{1,9}\s+GP$/u;

/**
 * Whether a seeded item name is a whole-line coin entry ("4 GP", "50 GP").
 *
 * EXPORTED SO THE CLASSIFICATION IS DECIDED ONCE. The parser above already
 * decides at seed time that a money line is ordinary gear with the printed
 * string as its name (D40); the equipment step and the sheet must recognise
 * the SAME lines again at read time — to suppress gold-only options and to
 * filter coin lines from rendered package contents (D56, plan §0c) — and two
 * regexes for one grammar would drift.
 */
export function isEquipmentMoneyLine(itemName: string): boolean {
  return MONEY_LINE.test(itemName);
}

/**
 * Split one printed package and state its quantity/name rule once for every
 * catalog that consumes an SRD equipment package.
 */
export function parseEquipmentPackage<Option extends string>(
  owner: string,
  option: Option,
  printed: string,
  resolveLink: EquipmentLinkResolver,
  error: ErrorFactory,
): ParsedEquipmentItem<Option>[] {
  const entries = printed.split(',').map((entry, index, all) => {
    const trimmed = entry.trim();
    // Oxford-comma conjunction belongs to the package grammar, not the last
    // item's printed name. The source examples require `4 GP`, not `and 4 GP`.
    return index === all.length - 1 && trimmed.startsWith('and ')
      ? trimmed.slice('and '.length)
      : trimmed;
  });
  return entries.map((entry, index) => {
    if (entry === '') {
      throw error(
        `${owner} equipment option ${option.toUpperCase()} has an empty entry: ${printed}`,
      );
    }
    return parseEquipmentEntry(
      owner,
      option,
      index + 1,
      entry,
      resolveLink,
      error,
    );
  });
}

function parseEquipmentEntry<Option extends string>(
  owner: string,
  option: Option,
  sortOrder: number,
  entry: string,
  resolveLink: EquipmentLinkResolver,
  error: ErrorFactory,
): ParsedEquipmentItem<Option> {
  const base = {
    option,
    sort_order: sortOrder,
    weapon_content_key: null,
    armor_content_key: null,
  } as const;

  if (MONEY_LINE.test(entry)) {
    return {
      ...base,
      item_name: entry,
      quantity: 1,
      item_kind: 'gear',
    };
  }

  const quantified = LEADING_QUANTITY.exec(entry)?.groups;
  if (quantified === undefined && /^\d/u.test(entry)) {
    throw error(
      `${owner} equipment option ${option.toUpperCase()} has an unreadable quantity: ${entry}`,
    );
  }
  const quantity =
    quantified?.quantity === undefined ? 1 : Number(quantified.quantity);
  const name = quantified?.name ?? entry;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw error(
      `${owner} equipment option ${option.toUpperCase()} has an invalid quantity: ${entry}`,
    );
  }

  const link = resolveLink(name);
  if (link?.item_kind === 'weapon') {
    return {
      ...base,
      item_name: name,
      quantity,
      item_kind: 'weapon',
      weapon_content_key: link.content_key,
    };
  }
  if (link?.item_kind === 'armor') {
    return {
      ...base,
      item_name: name,
      quantity,
      item_kind: 'armor',
      armor_content_key: link.content_key,
    };
  }
  return {
    ...base,
    item_name: name,
    quantity,
    item_kind: 'gear',
  };
}

/**
 * Resolve a parser-produced content key to the catalog id its foreign key
 * stores. A missing prerequisite is a seed failure, never a downgraded gear
 * row.
 */
export function resolveEquipmentTemplateId(
  db: DatabaseContext,
  table: 'weapon_templates' | 'armor_templates',
  contentKey: string | null,
  owner: string,
  error: ErrorFactory,
): number | null {
  if (contentKey === null) {
    return null;
  }
  const id = db.scalar(`SELECT id FROM ${table} WHERE content_key = ?`, [
    contentKey,
  ]);
  if (typeof id !== 'number') {
    throw error(
      `${owner} equipment names ${contentKey}, which ${table} does not hold. ` +
        'Seed the weapon and armour catalogs before equipment packages.',
    );
  }
  return id;
}
