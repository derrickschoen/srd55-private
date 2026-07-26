/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE ARMOUR CATALOG IS PARSED, NOT TRANSCRIBED — `weapons-srd.ts`'s
 * arrangement, applied to `docs/srd/source/armor-table.txt`.
 *
 * THIRTEEN ROWS: TWELVE ARMOURS PLUS SHIELD. Three Light, five Medium, four
 * Heavy, one Shield. `docs/srd/SOURCE.md` described this table as "13 armours
 * plus Shield" until this change — off by one, and the count assertion in the
 * test is what stops the wrong number coming back.
 *
 * THE EM-DASH IS A VALUE, NOT A GAP. The Strength and Stealth columns print
 * U+2014 for "no requirement" and "no penalty". Ten of thirteen rows carry it in
 * the Strength column. Reading it as a missing field, or as a zero, is the
 * mis-parse this module is shaped to refuse.
 *
 * WHAT IS DELIBERATELY NOT PARSED. Weight and cost, for the reason
 * `weapons-srd.ts` gives: they are encumbrance and economy, and this application
 * has no inventory. Because a character stores VALUES rather than a template
 * reference (D1b), adding them later touches no character row.
 */
import armorTableExtract from '../../docs/srd/source/armor-table.txt?raw';
import type { ArmorCategory, ArmorDexBonus } from '../domain/enums';

export const BUNDLED_ARMOR_RULES_EDITION = '2024';

export class SrdArmorError extends Error {
  constructor(message: string) {
    super(`SRD armor: ${message}`);
    this.name = 'SrdArmorError';
  }
}

/**
 * One parsed row. Field names are the `armor_templates` column names so the
 * seeder can insert the object column-wise, exactly as the weapon seeder does.
 */
export interface SrdArmorTemplate {
  readonly content_key: string;
  readonly name: string;
  readonly category: ArmorCategory;
  /** Base AC for armour; the ADDITIVE BONUS for the Shield row. See the schema. */
  readonly armor_class: number;
  readonly dex_bonus: ArmorDexBonus;
  readonly dex_bonus_max: number | null;
  readonly strength_requirement: number | null;
  readonly stealth_disadvantage: boolean;
}

const CATEGORY_HEADINGS: readonly (readonly [RegExp, ArmorCategory])[] = [
  [/^Light Armor\b/, 'light'],
  [/^Medium Armor\b/, 'medium'],
  [/^Heavy Armor\b/, 'heavy'],
  [/^Shield\s*\(/, 'shield'],
];

/**
 * Name, then the AC cell, then the rest of the row.
 *
 * The AC cell has three printed shapes and all three are captured here rather
 * than sniffed later: `11 + Dex modifier`, `12 + Dex modifier (max 2)`, a bare
 * `14`, and the Shield's `+2`. The name is LAZY so that `Half Plate Armor` and
 * `Studded Leather Armor` do not eat into the AC column, and the AC anchor is
 * what terminates it — the same technique `WEAPON_ROW` uses.
 */
const ARMOR_ROW =
  /^\s+(?<name>[A-Z][A-Za-z ]*?)\s{2,}(?<ac>\+?\d+)(?<dex>\s*\+ Dex modifier(?: \(max (?<cap>\d+)\))?)?\s{2,}(?<rest>\S.*)$/;

const STRENGTH_CELL = /^(?:—|Str (?<score>\d+))\s{2,}(?<rest>\S.*)$/;

export function armorContentKey(name: string): string {
  return `${BUNDLED_ARMOR_RULES_EDITION}:armor:${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

/**
 * Parses `docs/srd/source/armor-table.txt`.
 *
 * Exported so the test can check it against rows a human read out of the same
 * file by eye. A test asserting that the seeder produced what the seeder
 * produced could not fail, and would defeat the point of parsing at all.
 */
export function parseSrdArmorTemplates(
  extract: string = armorTableExtract,
): SrdArmorTemplate[] {
  const lines = extract.split('\n');
  const start = lines.findIndex((line) =>
    line.startsWith('--- Verbatim extract'),
  );
  if (start === -1) {
    throw new SrdArmorError('armor table has no verbatim-extract marker.');
  }

  const parsed: SrdArmorTemplate[] = [];
  let category: ArmorCategory | null = null;

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.includes('System Reference Document')) {
      continue;
    }

    const heading = CATEGORY_HEADINGS.find(([pattern]) =>
      pattern.test(trimmed),
    );
    // A heading and a row are distinguishable because only a row has an AC
    // cell; `Shield (Utilize Action…)` is a heading and `Shield  +2  …` a row,
    // so the heading test must run first and the row test must still be tried.
    if (heading !== undefined && !ARMOR_ROW.test(line)) {
      category = heading[1];
      continue;
    }

    const row = ARMOR_ROW.exec(line)?.groups;
    if (row === undefined) {
      // The table header (`Armor  Armor Class (AC)  Strength  …`) and the
      // section title. Neither carries an AC cell.
      continue;
    }
    if (category === null) {
      throw new SrdArmorError(
        `armor ${JSON.stringify(row.name)} appears before any category heading.`,
      );
    }

    const strength = STRENGTH_CELL.exec((row.rest as string).trim())?.groups;
    if (strength === undefined) {
      throw new SrdArmorError(
        `no Strength column on ${String(row.name).trim()}.`,
      );
    }
    const stealthCell = (strength.rest as string).trim();
    const stealth = stealthCell.startsWith('Disadvantage');
    if (!stealth && !stealthCell.startsWith('—')) {
      throw new SrdArmorError(
        `Stealth column on ${String(row.name).trim()} is neither Disadvantage nor an em-dash.`,
      );
    }

    const hasDex = row.dex !== undefined;
    const cap = row.cap === undefined ? null : Number(row.cap);
    const dexBonus: ArmorDexBonus = !hasDex
      ? 'none'
      : cap === null
        ? 'full'
        : 'capped';

    const name = (row.name as string).trim();
    parsed.push({
      content_key: armorContentKey(name),
      name,
      category,
      armor_class: Number((row.ac as string).replace('+', '')),
      dex_bonus: dexBonus,
      dex_bonus_max: cap,
      strength_requirement:
        strength.score === undefined ? null : Number(strength.score),
      stealth_disadvantage: stealth,
    });
  }

  // Twelve armours plus Shield. Counted from the extract by hand: Light 3,
  // Medium 5, Heavy 4, Shield 1.
  if (parsed.length !== 13) {
    throw new SrdArmorError(
      `expected 13 rows (12 armours plus Shield), parsed ${String(parsed.length)}.`,
    );
  }
  const keys = new Set(parsed.map((entry) => entry.content_key));
  if (keys.size !== parsed.length) {
    throw new SrdArmorError('armor table produced a duplicate content key.');
  }
  const shields = parsed.filter((entry) => entry.category === 'shield');
  if (shields.length !== 1 || shields[0]?.dex_bonus !== 'none') {
    throw new SrdArmorError(
      'expected exactly one Shield row, contributing no Dexterity term.',
    );
  }
  return parsed;
}

export function bundledArmorTemplates(): SrdArmorTemplate[] {
  return parseSrdArmorTemplates();
}
