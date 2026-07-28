import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const VERBATIM_ATTRIBUTION = `This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

/**
 * Hand-enumerated from the Feat Descriptions section on printed pages 87–88
 * of SRD 5.2.1.
 *
 * These literals are the oracle; they are not generated from the extract.
 */
const EXPECTED_FEATS = {
  Alert: { category: 'Origin', prerequisites: null },
  'Magic Initiate': { category: 'Origin', prerequisites: null },
  'Savage Attacker': { category: 'Origin', prerequisites: null },
  Skilled: { category: 'Origin', prerequisites: null },
  'Ability Score Improvement': {
    category: 'General',
    prerequisites: 'Level 4+',
  },
  Grappler: {
    category: 'General',
    prerequisites: 'Level 4+, Strength or Dexterity 13+',
  },
  Archery: {
    category: 'Fighting Style',
    prerequisites: 'Fighting Style Feature',
  },
  Defense: {
    category: 'Fighting Style',
    prerequisites: 'Fighting Style Feature',
  },
  'Great Weapon Fighting': {
    category: 'Fighting Style',
    prerequisites: 'Fighting Style Feature',
  },
  'Two-Weapon Fighting': {
    category: 'Fighting Style',
    prerequisites: 'Fighting Style Feature',
  },
  'Boon of Combat Prowess': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+',
  },
  'Boon of Dimensional Travel': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+',
  },
  'Boon of Fate': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+',
  },
  'Boon of Irresistible Offense': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+',
  },
  'Boon of Spell Recall': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+, Spellcasting Feature',
  },
  'Boon of the Night Spirit': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+',
  },
  'Boon of Truesight': {
    category: 'Epic Boon',
    prerequisites: 'Level 19+',
  },
} as const;

const EXPECTED_CATEGORIES = [
  'Origin',
  'General',
  'Fighting Style',
  'Epic Boon',
] as const;

const EXPECTED_ABILITY_SCORE_IMPROVEMENT_BENEFIT = `Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can’t increase an ability score above 20.

Repeatable. You can take this feat more than once.`;

interface FeatExtract {
  category: string;
  prerequisites: string | null;
  benefit: string;
}

function extractBytes(): Buffer {
  return readFileSync(
    new URL('../../../docs/srd/source/feats.txt', import.meta.url),
  );
}

function extractText(): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(extractBytes());
}

function featsFrom(source: string): Map<string, FeatExtract> {
  const feats = new Map<string, FeatExtract>();
  const featPattern =
    /^=== (?<name>[^=\n]+) ===\n(?<category>Origin|General|Fighting Style|Epic Boon) Feat(?: \(Prerequisite: (?<prerequisites>[^)\n]+)\))?\n\n(?<benefit>[\s\S]*?)(?=\n\n=== (?:Origin|General|Fighting Style|Epic Boon) Feats ===|\n\n=== [^=\n]+ ===|(?![\s\S]))/gm;

  for (const match of source.matchAll(featPattern)) {
    const name = match.groups?.name;
    const category = match.groups?.category;
    const benefit = match.groups?.benefit;
    if (name === undefined || category === undefined || benefit === undefined) {
      throw new Error('Feat extract has an unrecognised section.');
    }
    feats.set(name, {
      category,
      prerequisites: match.groups?.prerequisites ?? null,
      benefit,
    });
  }

  return feats;
}

function assertNoTrailingMidwordHyphen(source: string): void {
  const truncatedLines = source
    .split('\n')
    .filter((line) => /\p{L}-\s*$/u.test(line));
  if (truncatedLines.length > 0) {
    throw new Error(`Lines end mid-word:\n${truncatedLines.join('\n')}`);
  }
}

describe('SRD feats extract', () => {
  const source = extractText();

  it('is valid UTF-8 and carries the required attribution and verbatim scope', () => {
    expect(() => extractText()).not.toThrow();
    expect(source).toMatch(
      new RegExp(
        `^${VERBATIM_ATTRIBUTION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n\n--- Verbatim extract:`,
      ),
    );
    expect(source).not.toContain('\uFFFD');
  });

  it('includes the complete introductory vocabulary verbatim', () => {
    expect(source).toContain(
      'The feats that follow are organized by category—Origin, General, Fighting Style, or Epic Boon—and alphabetized in each category.',
    );
    expect(source).toContain(
      'Prerequisite. To take a feat, you must meet any prerequisite in its description unless a feature allows you to take the feat without the prerequisite. If a prerequisite includes a class, you must have at least 1 level in that class to take the feat.',
    );
    expect(source).toContain(
      'Benefit. The benefits of a feat are detailed after any prerequisites are listed. If you have a feat, you gain its benefits.',
    );
    expect(source).toContain(
      'Repeatable. A feat can be taken only once unless its description states otherwise in a “Repeatable” subsection.',
    );
  });

  it('enumerates every feat by name with its category and prerequisites', () => {
    const actual = featsFrom(source);

    expect([...actual.keys()]).toEqual(Object.keys(EXPECTED_FEATS));
    for (const [name, expected] of Object.entries(EXPECTED_FEATS)) {
      expect(actual.get(name)?.category, `${name} category`).toBe(
        expected.category,
      );
      expect(actual.get(name)?.prerequisites, `${name} prerequisites`).toBe(
        expected.prerequisites,
      );
      expect(actual.get(name)?.benefit.length, `${name} benefit`).toBeGreaterThan(
        0,
      );
    }
  });

  it('has exactly the four categories named by the SRD', () => {
    const actual = featsFrom(source);
    const categories = [
      ...new Set([...actual.values()].map((feat) => feat.category)),
    ];

    expect(categories).toEqual(EXPECTED_CATEGORIES);
  });

  it('retains the Ability Score Improvement benefit verbatim', () => {
    expect(featsFrom(source).get('Ability Score Improvement')?.benefit).toBe(
      EXPECTED_ABILITY_SCORE_IMPROVEMENT_BENEFIT,
    );
  });

  it('has no trailing mid-word hyphens, with a failing control', () => {
    expect(() => assertNoTrailingMidwordHyphen(source)).not.toThrow();
    expect(() =>
      assertNoTrailingMidwordHyphen('A deliberately truncated bene-'),
    ).toThrow(/bene-/);
  });
});
