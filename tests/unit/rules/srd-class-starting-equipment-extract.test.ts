import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const VERBATIM_ATTRIBUTION = `This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

/**
 * Hand-enumerated from the Starting Equipment rows on printed pages 28, 31,
 * 36, 41, 47, 49, 53, 57, 61, 64, 70, and 77 of SRD 5.2.1.
 *
 * These literals are the oracle; they are not generated from the extract.
 */
const EXPECTED_STARTING_EQUIPMENT = {
  Barbarian:
    'Choose A or B: (A) Greataxe, 4 Handaxes, Explorer’s Pack, and 15 GP; or (B) 75 GP',
  Bard:
    'Choose A or B: (A) Leather Armor, 2 Daggers, Musical Instrument of your choice, Entertainer’s Pack, and 19 GP; or (B) 90 GP',
  Cleric:
    'Choose A or B: (A) Chain Shirt, Shield, Mace, Holy Symbol, Priest’s Pack, and 7 GP; or (B) 110 GP',
  Druid:
    'Choose A or B: (A) Leather Armor, Shield, Sickle, Druidic Focus (Quarterstaff), Explorer’s Pack, Herbalism Kit, and 9 GP; or (B) 50 GP',
  Fighter:
    'Choose A, B, or C: (A) Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer’s Pack, and 4 GP; (B) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer’s Pack, and 11 GP; or (C) 155 GP',
  Monk:
    'Choose A or B: (A) Spear, 5 Daggers, Artisan’s Tools or Musical Instrument chosen for the tool proficiency above, Explorer’s Pack, and 11 GP; or (B) 50 GP',
  Paladin:
    'Choose A or B: (A) Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest’s Pack, and 9 GP; or (B) 150 GP',
  Ranger:
    'Choose A or B: (A) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Druidic Focus (sprig of mistletoe), Explorer’s Pack, and 7 GP; or (B) 150 GP',
  Rogue:
    'Choose A or B: (A) Leather Armor, 2 Daggers, Shortsword, Shortbow, 20 Arrows, Quiver, Thieves’ Tools, Burglar’s Pack, and 8 GP; or (B) 100 GP',
  Sorcerer:
    'Choose A or B: (A) Spear, 2 Daggers, Arcane Focus (crystal), Dungeoneer’s Pack, and 28 GP; or (B) 50 GP',
  Warlock:
    'Choose A or B: (A) Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb), Book (occult lore), Scholar’s Pack, and 15 GP; or (B) 100 GP',
  Wizard:
    'Choose A or B: (A) 2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar’s Pack, and 5 GP; or (B) 55 GP',
} as const;

function extract(file: string): string {
  return readFileSync(
    new URL(`../../../docs/srd/source/${file}`, import.meta.url),
    'utf8',
  );
}

function equipmentByClass(source: string): Map<string, string> {
  const sections = new Map<string, string>();
  const sectionPattern =
    /^=== (?<className>[A-Za-z]+) Starting Equipment ===\n(?<equipment>Choose [^\n]+)$/gm;

  for (const match of source.matchAll(sectionPattern)) {
    const className = match.groups?.className;
    const equipment = match.groups?.equipment;
    if (className === undefined || equipment === undefined) {
      throw new Error('Starting Equipment extract has an unrecognised section.');
    }
    sections.set(className, equipment);
  }

  return sections;
}

function optionLabels(equipment: string): string[] {
  return [...equipment.matchAll(/\((?<label>[A-Z])\)/g)].flatMap((match) => {
    const label = match.groups?.label;
    return label === undefined ? [] : [label];
  });
}

function assertNoTrailingMidwordHyphen(source: string): void {
  const truncatedLines = source
    .split('\n')
    .filter((line) => /\p{L}-\s*$/u.test(line));
  if (truncatedLines.length > 0) {
    throw new Error(`Lines end mid-word:\n${truncatedLines.join('\n')}`);
  }
}

describe('SRD class Starting Equipment extract', () => {
  const source = extract('class-starting-equipment.txt');

  it('carries the required attribution and identifies its verbatim scope', () => {
    expect(source).toMatch(
      new RegExp(
        `^${VERBATIM_ATTRIBUTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n\n--- Verbatim extracts:`,
      ),
    );
  });

  it('enumerates every class with every complete option from the PDF', () => {
    const actual = equipmentByClass(source);

    expect([...actual.keys()]).toEqual(Object.keys(EXPECTED_STARTING_EQUIPMENT));
    for (const [className, equipment] of Object.entries(
      EXPECTED_STARTING_EQUIPMENT,
    )) {
      expect(actual.get(className), className).toBe(equipment);
    }
  });

  it('keeps all three Fighter options while every other class has exactly two', () => {
    const actual = equipmentByClass(source);

    expect(optionLabels(actual.get('Fighter') ?? '')).toEqual(['A', 'B', 'C']);
    for (const className of Object.keys(EXPECTED_STARTING_EQUIPMENT)) {
      if (className === 'Fighter') continue;
      expect(optionLabels(actual.get(className) ?? ''), className).toEqual([
        'A',
        'B',
      ]);
    }
  });

  it('retains the money-only B option for all four previously truncated A/B rows', () => {
    const actual = equipmentByClass(source);
    const moneyOnlyOptionB = {
      Bard: '90 GP',
      Druid: '50 GP',
      Ranger: '150 GP',
      Rogue: '100 GP',
    } as const;

    for (const [className, money] of Object.entries(moneyOnlyOptionB)) {
      expect(actual.get(className), className).toMatch(
        new RegExp(`; or \\(B\\) ${money}$`),
      );
    }
  });

  it('has no trailing mid-word hyphens, with the old extract as a failing control', () => {
    expect(() => assertNoTrailingMidwordHyphen(source)).not.toThrow();
    expect(() =>
      assertNoTrailingMidwordHyphen(extract('class-core-traits.txt')),
    ).toThrow(/8 Jav-/);
  });
});
