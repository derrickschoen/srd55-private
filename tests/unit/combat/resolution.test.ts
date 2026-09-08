import { describe, expect, it } from 'vitest';
import { mulberry32, rollDice, rollDie, type Rng } from '../../../src/combat/random';
import {
  classifyAttackRoll,
  resolveAttackRoll,
  resolveDamage,
  resolveSavingThrow,
  rollD20,
} from '../../../src/combat/resolution';
import {
  armorClass,
  damageType,
  dieSides,
  difficultyClass,
} from '../../../src/combat/values';

const TEST_PROVENANCE = { kind: 'attack_roll', source: 'resolution-test' } as const;

function scriptedRng(values: readonly number[]): { readonly rng: Rng; readonly draws: () => number } {
  let index = 0;
  return {
    rng: () => {
      const value = values[index];
      if (value === undefined) throw new Error(`Unexpected RNG draw ${index + 1}.`);
      index += 1;
      return value;
    },
    draws: () => index,
  };
}

describe('checked combat values and random primitives', () => {
  it('validates armor classes, DCs, die sizes, and open homebrew damage types', () => {
    expect(armorClass(18)).toBe(18);
    expect(difficultyClass(15)).toBe(15);
    expect(dieSides(8)).toBe(8);
    expect(damageType('Chronomancy')).toBe('Chronomancy');
    expect(() => armorClass(-1)).toThrow('finite, non-negative');
    expect(() => difficultyClass(Number.NaN)).toThrow('finite, non-negative');
    expect(() => dieSides(1)).toThrow('integer greater than or equal to 2');
    expect(() => damageType('   ')).toThrow('non-empty');
  });

  it('keeps mulberry32 bit-for-bit identical to the pinned seed-1 stream', () => {
    const rng = mulberry32(1);
    expect(Array.from({ length: 5 }, () => rng())).toEqual([
      0.6270739405881613,
      0.002735721180215478,
      0.5274470399599522,
      0.9810509674716741,
      0.9683778982143849,
    ]);
  });

  it('uses floor(x*sides)+1 once per die and zero times for zero dice', () => {
    const counted = scriptedRng([0, 0.49, 0.999]);
    expect(rollDie(counted.rng, dieSides(6), TEST_PROVENANCE)).toBe(1);
    expect(rollDice(counted.rng, { count: 2, sides: dieSides(8), modifier: 3 }, TEST_PROVENANCE)).toEqual({
      expression: { count: 2, sides: 8, modifier: 3 },
      faces: [4, 8],
      total: 15,
    });
    expect(rollDice(counted.rng, { count: 0, sides: dieSides(12), modifier: 4 }, TEST_PROVENANCE)).toEqual({
      expression: { count: 0, sides: 12, modifier: 4 },
      faces: [],
      total: 4,
    });
    expect(counted.draws()).toBe(3);
  });
});

describe('d20, attack, and save resolution', () => {
  it('consumes one draw normally and two sequential draws for advantage and disadvantage', () => {
    const counted = scriptedRng([0.2, 0.1, 0.8, 0.7, 0.3]);
    expect(rollD20(counted.rng, 'normal', TEST_PROVENANCE)).toEqual({ mode: 'normal', faces: [5], chosen: 5 });
    expect(rollD20(counted.rng, 'advantage', TEST_PROVENANCE)).toEqual({
      mode: 'advantage',
      faces: [3, 17],
      chosen: 17,
    });
    expect(rollD20(counted.rng, 'disadvantage', TEST_PROVENANCE)).toEqual({
      mode: 'disadvantage',
      faces: [15, 7],
      chosen: 7,
    });
    expect(counted.draws()).toBe(5);
  });

  it('classifies an attack total equal to AC as a hit', () => {
    const result = resolveAttackRoll(
      {
        attackBonus: 5,
        targetArmorClass: armorClass(15),
        rollMode: 'normal',
        criticalFloor: 20,
      },
      () => 0.49,
      TEST_PROVENANCE,
    );
    expect(result).toMatchObject({ outcome: 'hit', total: 15 });
  });

  it('supports expanded critical floors and fixed-roll threshold attacks', () => {
    const expanded = classifyAttackRoll(
      {
        attackBonus: -20,
        targetArmorClass: armorClass(30),
        rollMode: 'normal',
        criticalFloor: 18,
      },
      { mode: 'normal', faces: [18], chosen: 18 },
    );
    expect(expanded.outcome).toBe('critical');

    expect(
      resolveAttackRoll(
        { hitFloor: 8, rollMode: 'normal', criticalFloor: 20 },
        () => 0.35,
        TEST_PROVENANCE,
      ).outcome,
    ).toBe('hit');
    expect(
      resolveAttackRoll(
        { hitFloor: 8, rollMode: 'normal', criticalFloor: 20 },
        () => 0.34,
        TEST_PROVENANCE,
      ).outcome,
    ).toBe('miss');
  });

  it('classifies a save total equal to DC as success without natural-roll exceptions', () => {
    expect(
      resolveSavingThrow(
        { bonus: 5, dc: difficultyClass(15), rollMode: 'normal' },
        () => 0.49,
        TEST_PROVENANCE,
      ),
    ).toMatchObject({ outcome: 'success', total: 15 });
    expect(
      resolveSavingThrow(
        { bonus: 20, dc: difficultyClass(15), rollMode: 'normal' },
        () => 0,
        TEST_PROVENANCE,
      ).outcome,
    ).toBe('success');
    expect(
      resolveSavingThrow(
        { bonus: -10, dc: difficultyClass(15), rollMode: 'normal' },
        () => 0.999,
        TEST_PROVENANCE,
      ).outcome,
    ).toBe('failure');
  });
});

describe('damage resolution', () => {
  it('returns ordered traces and applies open-type responses per term', () => {
    const fire = damageType('Fire');
    const chronomancy = damageType('Chronomancy');
    expect(
      resolveDamage(
        {
          critical: false,
          terms: [
            { type: fire, dice: { count: 2, sides: dieSides(6), modifier: 1 } },
            { type: chronomancy, dice: { count: 1, sides: dieSides(8), modifier: 0 } },
          ],
          responses: [{ type: fire, response: 'resistant' }],
        },
        scriptedRng([0, 0.5, 0.999]).rng,
        TEST_PROVENANCE,
      ),
    ).toEqual({
      terms: [
        {
          type: 'Fire',
          roll: {
            expression: { count: 2, sides: 6, modifier: 1 },
            faces: [1, 4],
            total: 6,
          },
          beforeResponse: 6,
          afterResponse: 3,
        },
        {
          type: 'Chronomancy',
          roll: {
            expression: { count: 1, sides: 8, modifier: 0 },
            faces: [8],
            total: 8,
          },
          beforeResponse: 8,
          afterResponse: 8,
        },
      ],
      total: 11,
    });
  });

  it('doubles dice but never the flat modifier on a critical hit', () => {
    const force = damageType('Force');
    const counted = scriptedRng([0, 0.2]);
    expect(
      resolveDamage(
        {
          critical: true,
          terms: [{ type: force, dice: { count: 1, sides: dieSides(10), modifier: 5 } }],
          responses: [],
        },
        counted.rng,
        TEST_PROVENANCE,
      ),
    ).toMatchObject({
      terms: [{ roll: { faces: [1, 3], total: 9 }, beforeResponse: 9, afterResponse: 9 }],
      total: 9,
    });
    expect(counted.draws()).toBe(2);
  });
});
