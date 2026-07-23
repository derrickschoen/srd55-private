import { describe, expect, it } from 'vitest';
import { CasterContribution } from '../../../src/rules/caster-contribution';
import {
  casterLevel,
  maxPreparableLevelForClass,
  pactMagic,
  slots,
  slotsForCasterLevel,
} from '../../../src/rules/spell-slots';
import { proficiencyBonus } from '../../../src/rules/proficiency';

const full = (name: string, level: number) =>
  new CasterContribution(name, level, CasterContribution.FULL);
const halfUp = (name: string, level: number) =>
  new CasterContribution(name, level, CasterContribution.HALF_UP);
const thirdDown = (name: string, level: number) =>
  new CasterContribution(name, level, CasterContribution.THIRD_DOWN);

const sharedSlotTable = [
  {},
  { 1: 2 },
  { 1: 3 },
  { 1: 4, 2: 2 },
  { 1: 4, 2: 3 },
  { 1: 4, 2: 3, 3: 2 },
  { 1: 4, 2: 3, 3: 3 },
  { 1: 4, 2: 3, 3: 3, 4: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 2 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
] as const;

describe('per-class caster contribution', () => {
  it('rounds each class before summing', () => {
    expect(casterLevel([halfUp('Paladin', 1), halfUp('Ranger', 1)])).toBe(2);
    expect(
      casterLevel([
        thirdDown('EK', 5),
        thirdDown('AT', 4),
      ]),
    ).toBe(2);
  });

  it.each([
    ['full', [0, 1, 2, 20], [0, 1, 2, 20]],
    ['half_down', [0, 1, 2, 3, 4, 20], [0, 0, 1, 1, 2, 10]],
    ['third_up', [0, 1, 2, 3, 4, 20], [0, 1, 1, 1, 2, 7]],
    ['third_down', [0, 1, 2, 3, 4, 5, 6, 20], [0, 0, 0, 1, 1, 1, 2, 6]],
    ['pact', [0, 1, 20], [0, 0, 0]],
    ['none', [0, 1, 20], [0, 0, 0]],
  ] as const)('pins %s rounding boundaries', (type, levels, expected) => {
    expect(
      levels.map((level) =>
        new CasterContribution('Test', level, type).casterLevels(),
      ),
    ).toEqual(expected);
  });

  it('rejects unknown progression and negative class levels', () => {
    expect(
      () => new CasterContribution('Mystery', 3, 'wat'),
    ).toThrow("Unknown progression type 'wat' for Mystery.");
    expect(() => full('Wizard', -1)).toThrow(
      'Class level cannot be negative, got -1.',
    );
  });
});

describe('shared multiclass slots', () => {
  it.each(sharedSlotTable.map((expected, level) => [level, expected] as const))(
    'matches the published row at caster level %i',
    (level, expected) => {
      expect(slotsForCasterLevel(level)).toEqual(expected);
    },
  );

  it('caps epic caster levels at the level-twenty row', () => {
    expect(slotsForCasterLevel(21)).toEqual(sharedSlotTable[20]);
  });

  it('keeps Pact Magic separate from shared slots', () => {
    const warlock = new CasterContribution(
      'Warlock',
      5,
      CasterContribution.PACT,
    );

    expect(casterLevel([full('Wizard', 1), warlock])).toBe(1);
    expect(slots([full('Wizard', 1), warlock])).toEqual({ 1: 2 });
    expect(pactMagic([full('Wizard', 1), warlock])).toEqual({
      count: 2,
      level: 3,
    });
  });

  it.each([
    [1, 1, 1],
    [2, 2, 1],
    [3, 2, 2],
    [4, 2, 2],
    [5, 2, 3],
    [6, 2, 3],
    [7, 2, 4],
    [8, 2, 4],
    [9, 2, 5],
    [10, 2, 5],
    [11, 3, 5],
    [12, 3, 5],
    [13, 3, 5],
    [14, 3, 5],
    [15, 3, 5],
    [16, 3, 5],
    [17, 4, 5],
    [18, 4, 5],
    [19, 4, 5],
    [20, 4, 5],
    [21, 4, 5],
  ])('pins pact level %i to %i slot(s) at level %i', (level, count, slotLevel) => {
    expect(
      pactMagic([
        new CasterContribution('Warlock', level, CasterContribution.PACT),
      ]),
    ).toEqual({ count, level: slotLevel });
  });

  it('adds multiple Pact contributions and returns null without one', () => {
    expect(
      pactMagic([
        new CasterContribution('Warlock A', 1, CasterContribution.PACT),
        new CasterContribution('Warlock B', 1, CasterContribution.PACT),
      ]),
    ).toEqual({ count: 2, level: 1 });
    expect(pactMagic([full('Wizard', 5)])).toBeNull();
  });
});

describe('preparation and proficiency', () => {
  it.each([
    ['full', [
      [0, 0], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3],
      [7, 4], [8, 4], [9, 5], [10, 5], [11, 6], [12, 6],
      [13, 7], [14, 7], [15, 8], [16, 8], [17, 9], [20, 9], [21, 9],
    ]],
    ['half_up', [
      [0, 0], [1, 1], [4, 1], [5, 2], [8, 2], [9, 3],
      [12, 3], [13, 4], [16, 4], [17, 5], [20, 5], [21, 5],
    ]],
    ['half_down', [
      [0, 0], [1, 0], [2, 1], [4, 1], [5, 2], [8, 2],
      [9, 3], [12, 3], [13, 4], [16, 4], [17, 5], [20, 5],
    ]],
    ['third_up', [
      [0, 0], [1, 0], [2, 0], [3, 1], [6, 1], [7, 2],
      [12, 2], [13, 3], [18, 3], [19, 4], [20, 4], [25, 4],
    ]],
    ['third_down', [
      [0, 0], [1, 0], [2, 0], [3, 1], [6, 1], [7, 2],
      [12, 2], [13, 3], [18, 3], [19, 4], [20, 4], [25, 4],
    ]],
    ['pact', [
      [0, 1], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 3],
      [7, 4], [8, 4], [9, 5], [16, 5], [17, 5], [20, 5], [21, 5],
    ]],
    ['none', [[0, 0], [1, 0], [20, 0]]],
  ] as const)('pins %s preparation boundaries', (type, cases) => {
    for (const [classLevel, expected] of cases) {
      expect(
        maxPreparableLevelForClass(
          new CasterContribution('Test', classLevel, type),
        ),
        `${type} level ${classLevel}`,
      ).toBe(expected);
    }
  });

  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])('uses character level %i for proficiency +%i', (level, expected) => {
    expect(proficiencyBonus(level)).toBe(expected);
  });

  it('keeps the six-class seed limited to first-level preparation', () => {
    const build = [
      full('Sorcerer', 1),
      full('Wizard', 1),
      full('Bard', 1),
      full('Cleric', 1),
      full('Druid', 1),
      halfUp('Paladin', 1),
    ];

    expect(casterLevel(build)).toBe(6);
    expect(slots(build)).toEqual({ 1: 4, 2: 3, 3: 3 });
    expect(proficiencyBonus(6)).toBe(3);
    expect(build.map(maxPreparableLevelForClass)).toEqual([1, 1, 1, 1, 1, 1]);
  });
});
