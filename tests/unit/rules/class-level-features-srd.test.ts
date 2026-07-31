import { describe, expect, it } from 'vitest';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import {
  asiLevelsForClassName,
  epicBoonLevelsForClassName,
  parseSrdClassLevelFeatures,
  SrdClassLevelFeaturesError,
} from '../../../src/rules/class-level-features-srd';

/**
 * Hand-transcribed from the twelve tables. This must never be regenerated from
 * parser output: it is the independent oracle that catches D78's former union.
 */
const ASI_LEVELS: Readonly<Record<string, readonly number[]>> = {
  Barbarian: [4, 8, 12, 16],
  Bard: [4, 8, 12, 16],
  Cleric: [4, 8, 12, 16],
  Druid: [4, 8, 12, 16],
  Fighter: [4, 6, 8, 12, 14, 16],
  Monk: [4, 8, 12, 16],
  Paladin: [4, 8, 12, 16],
  Ranger: [4, 8, 12, 16],
  Rogue: [4, 8, 10, 12, 16],
  Sorcerer: [4, 8, 12, 16],
  Warlock: [4, 8, 12, 16],
  Wizard: [4, 8, 12, 16],
};

const TABLE_EXPERTISE_LEVELS: Readonly<Record<string, readonly number[]>> = {
  Bard: [2, 9],
  Ranger: [9],
  Rogue: [1, 6],
};

describe('SRD class level feature cells', () => {
  const parsed = parseSrdClassLevelFeatures();

  it('parses all twelve tables and all twenty rows per table', () => {
    expect(parsed.map((entry) => entry.class_name)).toEqual(
      Object.keys(ASI_LEVELS),
    );
    for (const entry of parsed) {
      expect(entry.levels.map((level) => level.class_level), entry.class_name)
        .toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    }
  });

  it.each(Object.entries(ASI_LEVELS))(
    'pins %s ASI levels to its own table',
    (className, expected) => {
      expect([...(asiLevelsForClassName(className) ?? [])]).toEqual(expected);
    },
  );

  it('reassembles every wrapped Sorcerer ASI cell before deriving it', () => {
    const sorcerer = parsed.find((entry) => entry.class_name === 'Sorcerer');
    const cells = sorcerer?.levels
      .filter((entry) =>
        entry.entitlements.includes('ability_score_improvement'),
      )
      .map((entry) => entry.feature_cell);
    expect(cells).toEqual([
      'Ability Score Improvement',
      'Ability Score Improvement',
      'Ability Score Improvement',
      'Ability Score Improvement',
    ]);
  });

  it('finds Fighter 6/14 and Rogue 10 without leaking them to Wizard', () => {
    expect(asiLevelsForClassName('Fighter')?.has(6)).toBe(true);
    expect(asiLevelsForClassName('Fighter')?.has(14)).toBe(true);
    expect(asiLevelsForClassName('Rogue')?.has(10)).toBe(true);
    expect(asiLevelsForClassName('Wizard')?.has(6)).toBe(false);
    expect(asiLevelsForClassName('Wizard')?.has(10)).toBe(false);
    expect(asiLevelsForClassName('Wizard')?.has(14)).toBe(false);
  });

  it('pins Epic Boon to level 19 in every table and nowhere else', () => {
    for (const className of Object.keys(ASI_LEVELS)) {
      expect([...(epicBoonLevelsForClassName(className) ?? [])], className)
        .toEqual([19]);
    }
  });

  it('derives only the Expertise occurrences whose table cell names it', () => {
    for (const entry of parsed) {
      const actual = entry.levels
        .filter((level) => level.entitlements.includes('expertise'))
        .map((level) => level.class_level);
      expect(actual, entry.class_name).toEqual(
        TABLE_EXPERTISE_LEVELS[entry.class_name] ?? [],
      );
    }
  });

  it('distinguishes an unknown class from a known class with no occurrence', () => {
    expect(asiLevelsForClassName('Chronomancer')).toBeNull();
    expect(epicBoonLevelsForClassName('Chronomancer')).toBeNull();
    expect(
      parsed
        .find((entry) => entry.class_name === 'Wizard')
        ?.levels.find((entry) => entry.class_level === 6)?.entitlements,
    ).toEqual([]);
  });

  it('fails a missing level rather than returning a plausible short table', () => {
    const withoutFighterSix = classLevelTables.replace(
      '         6             +3         Ability Score Improvement                                          3              4\n',
      '',
    );
    expect(() => parseSrdClassLevelFeatures(withoutFighterSix)).toThrow(
      SrdClassLevelFeaturesError,
    );
  });
});
