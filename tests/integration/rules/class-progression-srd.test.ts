import type { Database } from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { openTestDatabase } from '../../helpers/open-db';

const VERBATIM_ATTRIBUTION = `This work includes material from the System Reference Document 5.2.1
("SRD 5.2.1") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

const SRD_CLASS_NAMES = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

type SrdClassName = (typeof SRD_CLASS_NAMES)[number];

const CLASSES_WITH_CANTRIPS = [
  'Bard',
  'Cleric',
  'Druid',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

const CLASSES_WITH_PREPARED_SPELLS = [
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

interface ExtractedProgression {
  readonly level: number;
  readonly cantrips: number;
  readonly prepared: number;
}

function extract(file: string): string {
  return readFileSync(
    new URL(`../../../docs/srd/source/${file}`, import.meta.url),
    'utf8',
  );
}

function tableSections(source: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  const markers = [
    ...source.matchAll(
      /^=== (?<className>[A-Za-z]+) Features table — printed page \d+ ===$/gm,
    ),
  ];

  for (const [index, marker] of markers.entries()) {
    const className = marker.groups?.className;
    if (className === undefined || marker.index === undefined) {
      throw new Error('Class level-table extract has an unrecognised marker.');
    }
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? source.length;
    sections.set(className, source.slice(start, end).split('\n'));
  }

  return sections;
}

function endOfPreparedColumn(header: string, start: number): number {
  const afterLabel = start + 'Spells'.length;
  const nextSlotWord = header.indexOf('Slots', afterLabel);
  const nextSlotLevel = /\b1\b/.exec(header.slice(afterLabel));
  const candidates = [
    nextSlotWord,
    nextSlotLevel === null ? -1 : afterLabel + nextSlotLevel.index,
  ].filter((candidate) => candidate >= 0);

  if (candidates.length === 0) {
    throw new Error('Prepared Spells column has no following slot column.');
  }
  return Math.min(...candidates);
}

function numericCell(
  line: string,
  start: number,
  end: number,
  label: string,
): number {
  const cell = line.slice(start, end).trim();
  if (!/^\d+$/.test(cell)) {
    throw new Error(`${label} cell is not a number: ${JSON.stringify(cell)}.`);
  }
  return Number(cell);
}

function progressionFromTable(
  className: SrdClassName,
  lines: readonly string[],
): ExtractedProgression[] {
  const header = lines.find(
    (line) => line.includes('Level') && line.includes('Class Features'),
  );
  if (header === undefined) {
    throw new Error(`${className} table has no level header.`);
  }

  const cantripsStart = header.indexOf('Cantrips');
  const preparedStart = header.indexOf('Spells');
  const hasCantrips = cantripsStart >= 0;
  const hasPreparedSpells = preparedStart >= 0;

  expect(hasCantrips, `${className} Cantrips column`).toBe(
    CLASSES_WITH_CANTRIPS.includes(
      className as (typeof CLASSES_WITH_CANTRIPS)[number],
    ),
  );
  expect(hasPreparedSpells, `${className} Prepared Spells column`).toBe(
    CLASSES_WITH_PREPARED_SPELLS.includes(
      className as (typeof CLASSES_WITH_PREPARED_SPELLS)[number],
    ),
  );

  const preparedEnd = hasPreparedSpells
    ? endOfPreparedColumn(header, preparedStart)
    : -1;
  const progressions: ExtractedProgression[] = [];

  for (const line of lines) {
    const row = /^\s*(?<level>[1-9]|1\d|20)\s+\+[2-6](?:\s|$)/.exec(line);
    if (row === null) continue;
    const level = row.groups?.level;
    if (level === undefined) {
      throw new Error(`${className} table has an unrecognised level row.`);
    }

    progressions.push({
      level: Number(level),
      cantrips: hasCantrips
        ? numericCell(
            line,
            cantripsStart,
            preparedStart,
            `${className} level ${level} Cantrips`,
          )
        : 0,
      prepared: hasPreparedSpells
        ? numericCell(
            line,
            preparedStart,
            preparedEnd,
            `${className} level ${level} Prepared Spells`,
          )
        : 0,
    });
  }

  return progressions;
}

function assertNoTrailingMidwordHyphen(source: string): void {
  const truncatedLines = source
    .split('\n')
    .filter((line) => /\p{L}-\s*$/u.test(line));
  if (truncatedLines.length > 0) {
    throw new Error(`Lines end mid-word:\n${truncatedLines.join('\n')}`);
  }
}

describe('SRD class level-table progression', () => {
  const source = extract('class-level-tables.txt');
  const sections = tableSections(source);
  let connection: Database;
  let db: DatabaseContext;

  beforeAll(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
  });

  afterAll(() => {
    connection.close();
  });

  it('carries the required attribution and identifies its verbatim scope', () => {
    expect(source).toMatch(
      new RegExp(
        `^${VERBATIM_ATTRIBUTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n\n--- Verbatim extracts:`,
      ),
    );
  });

  it('names every class and enumerates levels 1 through 20 in each table', () => {
    expect([...sections.keys()]).toEqual(SRD_CLASS_NAMES);
    for (const className of SRD_CLASS_NAMES) {
      const progression = progressionFromTable(
        className,
        sections.get(className) ?? [],
      );
      expect(
        progression.map(({ level }) => level),
        className,
      ).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    }
  });

  it.each(SRD_CLASS_NAMES)(
    'pins every %s cantrip and prepared-spell value to the extract',
    (className) => {
      const extracted = progressionFromTable(
        className,
        sections.get(className) ?? [],
      );
      const seeded = db
        .allRaw(
          `SELECT progression.class_level AS level,
             progression.cantrips_known AS cantrips,
             progression.prepared_count AS prepared
           FROM class_progressions progression
           JOIN class_definitions class
             ON class.id = progression.class_definition_id
           WHERE class.name = ?
           ORDER BY progression.class_level`,
          [className],
        )
        .map((row) => ({
          level: Number(row.level),
          cantrips: Number(row.cantrips),
          prepared: Number(row.prepared),
        }));

      expect(seeded, className).toEqual(extracted);
    },
  );

  it('persists one Rogue-owned Sneak Attack contribution and no contribution for another class', () => {
    const rows = db.allRaw(
      `SELECT class.content_key, contribution.contribution_key,
         contribution.label, contribution.target_kind,
         contribution.target_key, contribution.op,
         contribution.active_from_level, contribution.active_to_level,
         contribution.value_json, contribution.supersedes_ref
       FROM class_feature_value_contributions AS contribution
       JOIN class_definitions AS class
         ON class.id = contribution.class_definition_id
       ORDER BY class.content_key, contribution.contribution_key`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      content_key: '2024:class:rogue',
      contribution_key: 'sneak-attack',
      label: 'Sneak Attack',
      target_kind: 'feature_dice_count',
      target_key: 'sneak_attack',
      op: 'add',
      active_from_level: 1,
      active_to_level: 20,
      supersedes_ref: null,
    });
    expect(JSON.parse(String(rows[0]?.value_json))).toEqual({
      kind: 'scale',
      source: {
        kind: 'class_level',
        class_content_key: '2024:class:rogue',
      },
      divide: 2,
      round: 'ceiling',
    });
  });

  it('has no trailing mid-word hyphens, with the old extract as a failing control', () => {
    expect(() => assertNoTrailingMidwordHyphen(source)).not.toThrow();
    expect(() =>
      assertNoTrailingMidwordHyphen(extract('class-core-traits.txt')),
    ).toThrow(/8 Jav-/);
  });
});
