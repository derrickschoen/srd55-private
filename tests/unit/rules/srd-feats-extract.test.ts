import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  bundledFeatDefinitions,
  ensureBundledFeatContent,
  seedFeatContent,
} from '../../../src/rules/feats-srd';
import { openTestDatabase } from '../../helpers/open-db';

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

const EXPECTED_MIN_LEVELS = {
  Alert: null,
  'Magic Initiate': null,
  'Savage Attacker': null,
  Skilled: null,
  'Ability Score Improvement': 4,
  Grappler: 4,
  Archery: null,
  Defense: null,
  'Great Weapon Fighting': null,
  'Two-Weapon Fighting': null,
  'Boon of Combat Prowess': 19,
  'Boon of Dimensional Travel': 19,
  'Boon of Fate': 19,
  'Boon of Irresistible Offense': 19,
  'Boon of Spell Recall': 19,
  'Boon of the Night Spirit': 19,
  'Boon of Truesight': 19,
} as const;

const EXPECTED_ABILITY_POINTS = {
  Alert: 0,
  'Magic Initiate': 0,
  'Savage Attacker': 0,
  Skilled: 0,
  'Ability Score Improvement': 2,
  Grappler: 1,
  Archery: 0,
  Defense: 0,
  'Great Weapon Fighting': 0,
  'Two-Weapon Fighting': 0,
  'Boon of Combat Prowess': 1,
  'Boon of Dimensional Travel': 1,
  'Boon of Fate': 1,
  'Boon of Irresistible Offense': 1,
  'Boon of Spell Recall': 1,
  'Boon of the Night Spirit': 1,
  'Boon of Truesight': 1,
} as const;

describe('bundled SRD feats', () => {
  it('parses and seeds exactly the seventeen oracle names and source categories', async () => {
    const parsed = bundledFeatDefinitions();
    expect(parsed.map((feat) => feat.name)).toEqual(
      Object.keys(EXPECTED_FEATS),
    );
    for (const feat of parsed) {
      expect(
        feat.source_category,
        `${feat.name} parsed source category`,
      ).toBe(EXPECTED_FEATS[feat.name as keyof typeof EXPECTED_FEATS].category);
    }

    const connection = await openTestDatabase();
    try {
      const db = new DatabaseContext(connection);
      seedFeatContent(db);
      const seeded = db.allRaw(
        `SELECT name, category FROM feat_definitions
         WHERE content_key LIKE '2024:feat:%'
         ORDER BY id`,
      );
      expect(seeded.map((row) => row.name)).toEqual(
        Object.keys(EXPECTED_FEATS),
      );
      for (const row of seeded) {
        const name = String(row.name) as keyof typeof EXPECTED_FEATS;
        expect(row.category, `${name} stored grouping`).toBe(
          EXPECTED_FEATS[name].category === 'Origin' ? 'origin' : null,
        );
      }
    } finally {
      connection.close();
    }
  });

  it('stores every feat level and ability-point value by name', async () => {
    const connection = await openTestDatabase();
    try {
      const db = new DatabaseContext(connection);
      seedFeatContent(db);
      const rows = db.allRaw(
        `SELECT name, min_level, ability_points
         FROM feat_definitions ORDER BY id`,
      );
      expect(rows).toHaveLength(17);
      for (const row of rows) {
        const name = String(row.name) as keyof typeof EXPECTED_MIN_LEVELS;
        expect(row.min_level, `${name} min_level`).toBe(
          EXPECTED_MIN_LEVELS[name],
        );
        expect(row.ability_points, `${name} ability_points`).toBe(
          EXPECTED_ABILITY_POINTS[name],
        );
      }
    } finally {
      connection.close();
    }
  });

  it('keeps non-level gates in prerequisites and never groups Fighting Style feats by that gate', async () => {
    const connection = await openTestDatabase();
    try {
      const db = new DatabaseContext(connection);
      seedFeatContent(db);
      const styles = db.allRaw(
        `SELECT name, category, prerequisites
         FROM feat_definitions
         WHERE name IN (
           'Archery', 'Defense', 'Great Weapon Fighting',
           'Two-Weapon Fighting'
         )
         ORDER BY id`,
      );
      expect(styles).toHaveLength(4);
      for (const style of styles) {
        expect(style.category, `${String(style.name)} grouping`).toBeNull();
        expect(JSON.parse(String(style.prerequisites))).toEqual([
          {
            kind: 'feature',
            feature: 'Fighting Style Feature',
          },
        ]);
      }

      const grappler = db.oneRaw(
        `SELECT min_level, prerequisites FROM feat_definitions
         WHERE name = 'Grappler'`,
      );
      expect(grappler?.min_level).toBe(4);
      expect(JSON.parse(String(grappler?.prerequisites))).toEqual([
        {
          kind: 'ability_score',
          abilities: ['strength', 'dexterity'],
          minimum: 13,
        },
      ]);
      expect(String(grappler?.prerequisites)).not.toContain('Level 4');
    } finally {
      connection.close();
    }
  });

  it('models the spell, skill, and Fighting Style effects while leaving adjudication as text', async () => {
    const connection = await openTestDatabase();
    try {
      const db = new DatabaseContext(connection);
      seedFeatContent(db);
      const rules = (name: string): readonly Record<string, unknown>[] => {
        const encoded = db.scalar<string>(
          'SELECT grant_rules FROM feat_definitions WHERE name = ?',
          [name],
        );
        const decoded: unknown = JSON.parse(String(encoded));
        if (!Array.isArray(decoded)) {
          throw new TypeError(`${name} grant_rules must be a list.`);
        }
        return decoded as readonly Record<string, unknown>[];
      };

      expect(rules('Magic Initiate').map((rule) => rule.kind)).toEqual([
        'choice_from_list',
        'choice_from_list',
      ]);
      expect(rules('Skilled')).toEqual([
        expect.objectContaining({
          kind: 'skill_proficiency',
          count: 3,
          allows_tool_instead: true,
        }),
      ]);
      expect(rules('Archery')).toEqual([
        expect.objectContaining({
          kind: 'fighting_style',
          style_key: 'archery',
        }),
      ]);
      expect(rules('Grappler')).toEqual([]);
      expect(
        db.scalar<string>(
          `SELECT notes FROM feat_definitions WHERE name = 'Grappler'`,
        ),
      ).toContain('Punch and Grab.');
    } finally {
      connection.close();
    }
  });

  it('does no work when seeded a second time', async () => {
    const connection = await openTestDatabase();
    try {
      const db = new DatabaseContext(connection);
      expect(ensureBundledFeatContent(db)).toBe(true);
      const before = db.allRaw(
        'SELECT * FROM feat_definitions ORDER BY content_key',
      );
      seedFeatContent(db);
      expect(ensureBundledFeatContent(db)).toBe(false);
      expect(
        db.allRaw('SELECT * FROM feat_definitions ORDER BY content_key'),
      ).toEqual(before);
    } finally {
      connection.close();
    }
  });

  it('yields a name and edition already owned by user content', async () => {
    const connection = await openTestDatabase();
    try {
      const db = new DatabaseContext(connection);
      db.exec(
        `INSERT INTO feat_definitions (
           content_key, name, rules_edition, category, ability_points, notes
         ) VALUES (
           'homebrew:feat:magic-initiate', 'Magic Initiate', '2024',
           'homebrew-schooling', 2, 'User-authored feat'
         )`,
      );

      expect(seedFeatContent(db)).toBe(true);
      const before = db.allRaw(
        'SELECT * FROM feat_definitions ORDER BY content_key',
      );
      expect(
        db.oneRaw(
          `SELECT content_key, category, ability_points, notes
           FROM feat_definitions WHERE name = 'Magic Initiate'`,
        ),
      ).toEqual({
        content_key: 'homebrew:feat:magic-initiate',
        category: 'homebrew-schooling',
        ability_points: 2,
        notes: 'User-authored feat',
      });
      expect(
        db.scalar<number>(
          `SELECT count(*) FROM feat_definitions
           WHERE content_key = '2024:feat:magic-initiate'`,
        ),
      ).toBe(0);
      expect(seedFeatContent(db)).toBe(false);
      expect(
        db.allRaw('SELECT * FROM feat_definitions ORDER BY content_key'),
      ).toEqual(before);
    } finally {
      connection.close();
    }
  });
});
