import { describe, expect, it } from 'vitest';
import {
  attackProbabilities,
  chromaticLeapChance,
  exactResult,
  seededRoll,
  sorcerousExpectedExtraDice,
  sorcerousExpectedRawDamage,
  type DiceConfig,
} from '../../../src/ui/screens/planner/dice';

function config(
  changes: Partial<DiceConfig> = {},
): DiceConfig {
  return {
    profile: 'basic',
    armorClass: 15,
    attackBonus: 5,
    rollMode: 'normal',
    halflingLuck: false,
    luckyFeat: false,
    elvenAccuracy: false,
    bless: false,
    bane: false,
    elementalAdept: false,
    resistance: false,
    vulnerability: false,
    basicDice: 1,
    basicDieSize: 8,
    damageModifier: 0,
    sorcerousBaseDice: 1,
    explosionCap: 3,
    chromaticSlotLevel: 1,
    ...changes,
  };
}

function close(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-12);
}

describe('planner dice oracle', () => {
  it('composes exact d20 modes, rerolls, modifiers, and defenses', () => {
    const normal = attackProbabilities(config());
    close(normal.totalHit, 0.55);
    close(normal.criticalHit, 0.05);
    close(
      attackProbabilities(config({ rollMode: 'advantage' })).totalHit,
      1 - 0.45 ** 2,
    );
    close(
      attackProbabilities(config({ rollMode: 'disadvantage' })).totalHit,
      0.55 ** 2,
    );
    close(
      attackProbabilities(
        config({ rollMode: 'disadvantage', luckyFeat: true }),
      ).totalHit,
      normal.totalHit,
    );
    close(
      attackProbabilities(
        config({ rollMode: 'advantage', elvenAccuracy: true }),
      ).criticalHit,
      1 - 0.95 ** 3,
    );
    close(
      attackProbabilities(config({ halflingLuck: true })).totalHit,
      231 / 400,
    );
    close(
      attackProbabilities(config({ bless: true })).totalHit,
      0.675,
    );
    close(
      exactResult(
        config({
          basicDice: 1,
          basicDieSize: 4,
          resistance: true,
          vulnerability: true,
        }),
      ).normalDamage,
      2,
    );
    close(
      exactResult(
        config({
          basicDice: 1,
          basicDieSize: 4,
          resistance: true,
          elementalAdept: true,
        }),
      ).normalDamage,
      2.75,
    );
  });

  it('matches bounded Sorcerous Burst and Chromatic Orb expectations', () => {
    close(
      sorcerousExpectedExtraDice(1, 3),
      1 / 8 + 1 / 64 + 1 / 512,
    );
    close(
      sorcerousExpectedRawDamage(1, 3, false),
      (1 + 73 / 512) * 4.5,
    );
    const criticalExtra = 15 / 64 + 11 / 256 + 29 / 4096;
    const burst = exactResult(config({ profile: 'sorcerous-burst' }));
    close(burst.normalDamage, (1 + 73 / 512) * 4.5);
    close(burst.criticalDamage, (2 + criticalExtra) * 4.5);
    close(chromaticLeapChance(3, false), 176 / 512);
    close(chromaticLeapChance(3, true), 212 / 512);
    const orbInput = config({
      profile: 'chromatic-orb',
      chromaticSlotLevel: 1,
    });
    const attacks = attackProbabilities(orbInput);
    const orb = exactResult(orbInput);
    const normalLeap = 176 / 512;
    const criticalLeap =
      1 - (8 * 7 * 6 * 5 * 4 * 3) / 8 ** 6;
    const oneAttack =
      attacks.normalHit * 13.5 + attacks.criticalHit * 27;
    const continuation =
      attacks.normalHit * normalLeap +
      attacks.criticalHit * criticalLeap;
    close(orb.expectedDamage, oneAttack * (1 + continuation));
    close(
      orb.expectedTargetsHit,
      attacks.totalHit * (1 + continuation),
    );
  });

  it('replays complete seeded traces including explosions and leaps', () => {
    const input = config({
      profile: 'sorcerous-burst',
      rollMode: 'advantage',
      halflingLuck: true,
      elvenAccuracy: true,
      elementalAdept: true,
      resistance: true,
      vulnerability: true,
    });
    expect(seededRoll(input, 'table-night:17')).toEqual(
      seededRoll(input, 'table-night:17'),
    );
    const burst = seededRoll(
      config({ profile: 'sorcerous-burst', armorClass: 1 }),
      'burst:3',
    );
    expect(burst.attacks[0]?.damageDice).toEqual([
      { raw: 8, value: 8, added: false },
      { raw: 3, value: 3, added: true },
    ]);
    expect(burst.totalDamage).toBe(11);
    const orb = seededRoll(
      config({ profile: 'chromatic-orb', armorClass: 1 }),
      'orb:1',
    );
    expect(orb.attacks).toHaveLength(2);
    expect(orb.attacks[0]?.triggeredLeap).toBe(true);
    expect(orb.totalDamage).toBe(35);
  });
});
