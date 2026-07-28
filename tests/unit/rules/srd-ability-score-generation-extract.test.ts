import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const VERBATIM_ATTRIBUTION = `This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

const EXPECTED_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

/**
 * Hand-enumerated from the Ability Score Point Costs table on printed page 21
 * of SRD 5.2.1. These pairs are the oracle; they are not generated from the
 * extract.
 */
const EXPECTED_POINT_COSTS = [
  [8, 0],
  [9, 1],
  [10, 2],
  [11, 3],
  [12, 4],
  [13, 5],
  [14, 7],
  [15, 9],
] as const;

/**
 * Hand-enumerated from the Standard Array by Class table on printed page 21
 * of SRD 5.2.1. Ability values are in the table's printed order:
 * Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma.
 */
const EXPECTED_STANDARD_ARRAYS_BY_CLASS = [
  ['Barbarian', 15, 13, 14, 10, 12, 8],
  ['Bard', 8, 14, 12, 13, 10, 15],
  ['Cleric', 14, 8, 13, 10, 15, 12],
  ['Druid', 8, 12, 14, 13, 15, 10],
  ['Fighter', 15, 14, 13, 8, 10, 12],
  ['Monk', 12, 15, 13, 10, 14, 8],
  ['Paladin', 15, 10, 13, 8, 12, 14],
  ['Ranger', 12, 15, 13, 8, 14, 10],
  ['Rogue', 12, 15, 13, 14, 10, 8],
  ['Sorcerer', 10, 13, 14, 8, 12, 15],
  ['Warlock', 8, 14, 13, 12, 10, 15],
  ['Wizard', 8, 12, 13, 15, 14, 10],
] as const;

const RANDOM_GENERATION_WORDING =
  'Random Generation. Roll four d6s and record the total of the highest three dice. Do this five more times, so you have six numbers.';

function extractUrl(file: string): URL {
  return new URL(`../../../docs/srd/source/${file}`, import.meta.url);
}

function extract(file: string): string {
  return readFileSync(extractUrl(file), 'utf8');
}

function normalized(source: string): string {
  return source.replace(/\s+/gu, ' ').trim();
}

function standardArray(source: string): number[] {
  const match = normalized(source).match(
    /Standard Array\. Use the following six scores for your abilities: (?<scores>[\d, ]+)\./u,
  );
  const scores = match?.groups?.scores;
  if (scores === undefined) {
    throw new Error('Standard Array wording is absent or unrecognised.');
  }
  return scores.split(', ').map(Number);
}

function pointCosts(source: string): [number, number][] {
  const pairs: [number, number][] = [];
  const rowPattern =
    /^\s+(?<leftScore>\d+)\s+(?<leftCost>\d+)\s+(?<rightScore>\d+)\s+(?<rightCost>\d+)\s*$/gmu;

  for (const match of source.matchAll(rowPattern)) {
    const leftScore = match.groups?.leftScore;
    const leftCost = match.groups?.leftCost;
    const rightScore = match.groups?.rightScore;
    const rightCost = match.groups?.rightCost;
    if (
      leftScore === undefined ||
      leftCost === undefined ||
      rightScore === undefined ||
      rightCost === undefined
    ) {
      throw new Error('Point Cost extract has an unrecognised table row.');
    }
    pairs.push(
      [Number(leftScore), Number(leftCost)],
      [Number(rightScore), Number(rightCost)],
    );
  }

  return pairs.sort(([left], [right]) => left - right);
}

function standardArraysByClass(
  source: string,
): [string, number, number, number, number, number, number][] {
  const rows: [string, number, number, number, number, number, number][] = [];
  const rowPattern =
    /^\s+(?<className>[A-Z][A-Za-z]+)\s+(?<strength>\d+)\s+(?<dexterity>\d+)\s+(?<constitution>\d+)\s+(?<intelligence>\d+)\s+(?<wisdom>\d+)\s+(?<charisma>\d+)\s*$/gmu;

  for (const match of source.matchAll(rowPattern)) {
    const values = [
      match.groups?.strength,
      match.groups?.dexterity,
      match.groups?.constitution,
      match.groups?.intelligence,
      match.groups?.wisdom,
      match.groups?.charisma,
    ];
    const className = match.groups?.className;
    if (className === undefined || values.some((value) => value === undefined)) {
      throw new Error('Standard Array by Class extract has an unrecognised row.');
    }

    rows.push([
      className,
      ...values.map(Number) as [number, number, number, number, number, number],
    ]);
  }

  return rows;
}

function assertNoTrailingMidwordHyphen(source: string): void {
  const truncatedLines = source
    .split('\n')
    .filter((line) => /\p{L}-\s*$/u.test(line));
  if (truncatedLines.length > 0) {
    throw new Error(`Lines end mid-word:\n${truncatedLines.join('\n')}`);
  }
}

describe('SRD ability-score generation extract', () => {
  const source = extract('ability-score-generation.txt');

  it('is valid UTF-8 and carries the required attribution and verbatim scope', () => {
    expect(() =>
      new TextDecoder('utf-8', { fatal: true }).decode(
        readFileSync(extractUrl('ability-score-generation.txt')),
      ),
    ).not.toThrow();
    expect(source).toMatch(
      new RegExp(
        `^${VERBATIM_ATTRIBUTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n\n--- Verbatim extract:`,
      ),
    );
  });

  it('names exactly the three generation methods printed by the SRD', () => {
    const text = normalized(source);
    const methods = [
      ...text.matchAll(
        /(?<method>Standard Array|Random Generation|Point Cost)\./gu,
      ),
    ].flatMap((match) => {
      const method = match.groups?.method;
      return method === undefined ? [] : [method];
    });

    expect(text).toContain('following three methods.');
    expect(methods).toEqual([
      'Standard Array',
      'Random Generation',
      'Point Cost',
    ]);
  });

  it('records the six Standard Array values exactly', () => {
    expect(standardArray(source)).toEqual(EXPECTED_STANDARD_ARRAY);
  });

  it('records the complete Random Generation instruction', () => {
    expect(normalized(source)).toContain(RANDOM_GENERATION_WORDING);
  });

  it('enumerates every Point Cost score-to-cost pair and the 27-point budget', () => {
    const text = normalized(source);

    expect(pointCosts(source)).toEqual(EXPECTED_POINT_COSTS);
    expect(text).toContain(
      'Point Cost. You have 27 points to spend on your ability scores.',
    );
    expect(text).toContain('a score of 14 costs 7 of your 27 points.');
  });

  it('enumerates every class and all six sourced Standard Array values', () => {
    expect(source).toContain(
      'Class         Str.       Dex. Con. Int.         Wis.       Cha.',
    );
    expect(source).not.toContain('Neutral Good');
    expect(standardArraysByClass(source)).toEqual(
      EXPECTED_STANDARD_ARRAYS_BY_CLASS,
    );
  });

  it('retains the complete Wizard row at the bottom of the printed table', () => {
    expect(standardArraysByClass(source).at(-1)).toEqual([
      'Wizard',
      8,
      12,
      13,
      15,
      14,
      10,
    ]);
  });

  it('has no trailing mid-word hyphens, with the old extract as a failing control', () => {
    expect(() => assertNoTrailingMidwordHyphen(source)).not.toThrow();
    expect(() =>
      assertNoTrailingMidwordHyphen(extract('class-core-traits.txt')),
    ).toThrow(/8 Jav-/);
  });
});
