import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BASIC_DIE_SIZE,
  attackProbabilities,
  chromaticLeapChance,
  exactResult,
  seededRoll,
  selectedDieSize,
  sorcerousExpectedExtraDice,
  sorcerousExpectedRawDamage,
  type DiceConfig,
  type DieUpgrade,
} from '../../../src/ui/screens/planner/dice';
import { dieSizes, isDieSize } from '../../../src/domain/enums';

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
    tripleAdvantage: false,
    bless: false,
    bane: false,
    dieUpgrade: null,
    resistanceBypass: false,
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

function upgrade(changes: Partial<DieUpgrade> = {}): DieUpgrade {
  return {
    promotedOutcomes: [1],
    promotedTo: 2,
    appliesTo: 'all',
    dieSize: null,
    ...changes,
  };
}

function close(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-12);
}

describe('planner dice oracle', () => {
  it('composes exact d20 modes, rerolls, modifiers, and defenses', () => {
    const normal = attackProbabilities(config());
    close(normal.normalHit, 0.5);
    close(normal.totalHit, 0.55);
    close(normal.criticalHit, 0.05);
    const advantage = attackProbabilities(
      config({ rollMode: 'advantage' }),
    );
    close(advantage.totalHit, 1 - 0.45 ** 2);
    close(advantage.criticalHit, 1 - 0.95 ** 2);
    const disadvantage = attackProbabilities(
      config({ rollMode: 'disadvantage' }),
    );
    close(disadvantage.totalHit, 0.55 ** 2);
    close(disadvantage.criticalHit, 0.05 ** 2);
    close(
      attackProbabilities(
        config({ rollMode: 'disadvantage', luckyFeat: true }),
      ).totalHit,
      normal.totalHit,
    );
    close(
      attackProbabilities(
        config({ rollMode: 'advantage', tripleAdvantage: true }),
      ).criticalHit,
      1 - 0.95 ** 3,
    );
    close(
      attackProbabilities(config({ halflingLuck: true })).totalHit,
      231 / 400,
    );
    close(
      attackProbabilities(config({ halflingLuck: true })).criticalHit,
      21 / 400,
    );
    close(
      attackProbabilities(config({ bless: true })).totalHit,
      0.675,
    );
    const bothModifiers = attackProbabilities(
      config({ bless: true, bane: true }),
    );
    close(
      bothModifiers.miss +
        bothModifiers.normalHit +
        bothModifiers.criticalHit,
      1,
    );
    close(bothModifiers.criticalHit, 0.05);
    close(
      exactResult(
        config({
          basicDice: 1,
          basicDieSize: 4,
          resistance: true,
        }),
      ).normalDamage,
      1,
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
  });

  it('expresses the old 1-to-2 promotion plus resistance bypass as one configuration', () => {
    const oldBehavior = config({
      basicDice: 1,
      basicDieSize: 4,
      dieUpgrade: upgrade(),
      resistance: true,
      resistanceBypass: true,
    });
    close(exactResult(oldBehavior).normalDamage, 2.75);

    close(
      exactResult(
        config({
          basicDice: 1,
          basicDieSize: 4,
          dieUpgrade: upgrade(),
          resistance: true,
        }),
      ).normalDamage,
      1.25,
    );
    close(
      exactResult(
        config({
          basicDice: 1,
          basicDieSize: 4,
          resistance: true,
          resistanceBypass: true,
        }),
      ).normalDamage,
      2.5,
    );
  });

  it('promotes configured outcomes only for the configured roll kind and die size', () => {
    const weaponD6Upgrade = upgrade({
      promotedOutcomes: [1, 2],
      promotedTo: 3,
      appliesTo: 'weapon',
      dieSize: 6,
    });
    close(
      exactResult(
        config({ basicDice: 1, basicDieSize: 6, dieUpgrade: weaponD6Upgrade }),
      ).normalDamage,
      4,
    );
    close(
      exactResult(
        config({ basicDice: 1, basicDieSize: 8, dieUpgrade: weaponD6Upgrade }),
      ).normalDamage,
      4.5,
    );
    close(
      sorcerousExpectedRawDamage(
        1,
        0,
        upgrade({
          promotedOutcomes: [1, 2],
          promotedTo: 3,
          appliesTo: 'weapon',
        }),
      ),
      4.5,
    );

    const spellD8Upgrade = upgrade({
      appliesTo: 'spell',
      dieSize: 8,
    });
    close(sorcerousExpectedRawDamage(1, 0, spellD8Upgrade), 37 / 8);
    close(
      exactResult(
        config({ basicDice: 1, basicDieSize: 8, dieUpgrade: spellD8Upgrade }),
      ).normalDamage,
      4.5,
    );
  });

  it('matches bounded Sorcerous Burst and Chromatic Orb expectations', () => {
    close(
      sorcerousExpectedExtraDice(1, 3),
      1 / 8 + 1 / 64 + 1 / 512,
    );
    close(
      sorcerousExpectedRawDamage(1, 3, null),
      (1 + 73 / 512) * 4.5,
    );
    close(sorcerousExpectedRawDamage(1, 0, null), 4.5);
    const criticalExtra = 15 / 64 + 11 / 256 + 29 / 4096;
    close(sorcerousExpectedExtraDice(2, 3), criticalExtra);
    close(
      sorcerousExpectedRawDamage(2, 3, null),
      (2 + criticalExtra) * 4.5,
    );
    close(sorcerousExpectedRawDamage(1, 0, upgrade()), 37 / 8);
    const burst = exactResult(config({ profile: 'sorcerous-burst' }));
    close(burst.normalDamage, (1 + 73 / 512) * 4.5);
    close(burst.criticalDamage, (2 + criticalExtra) * 4.5);
    close(chromaticLeapChance(3, null), 176 / 512);
    close(chromaticLeapChance(3, upgrade()), 212 / 512);
    close(chromaticLeapChance(9, null), 1);
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
      tripleAdvantage: true,
      dieUpgrade: upgrade(),
      resistanceBypass: true,
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
    expect(orb.attacks[1]?.triggeredLeap).toBe(false);
    expect(orb.totalDamage).toBe(35);
  });
});

/**
 * THE ONE FIELD IN THIS FILE THAT HAD TWO ANSWERS.
 *
 * `basicDieSize` was offered by a `<select>` populated with
 * `[4, 6, 8, 10, 12, 20, 100]` and read back through
 * `boundedInteger(Number(value), 2, 100)` — an integer RANGE that admits 2, 3,
 * 5, 7, 13 and 99. It was the only place in the repository where two statements
 * about ONE subject gave different value sets.
 *
 * It was not reachable through the browser, because the select is the only
 * writer of `.value`. It was reachable HERE: `DiceConfig` is exported and this
 * file builds one directly, and `ordinaryDamage` loops `face = 1..size` over
 * whatever arrives. The regression below shows what that produced.
 */
describe('the die-size field states one set, not two', () => {
  it('round-trips every size the control offers', () => {
    for (const size of dieSizes) {
      expect(selectedDieSize(String(size)), `d${String(size)}`).toBe(size);
    }
  });

  it('falls back to the control’s own default for anything else', () => {
    // The clamp accepted all of these and returned a different number for each.
    for (const outside of ['7', '2', '3', '13', '99', '1', '0', '-8', '8.5']) {
      expect(selectedDieSize(outside), outside).toBe(DEFAULT_BASIC_DIE_SIZE);
    }
    // And the shapes a `<select>` can genuinely produce when nothing matches.
    for (const unreadable of ['', 'd8', 'eight', 'NaN']) {
      expect(selectedDieSize(unreadable), unreadable).toBe(DEFAULT_BASIC_DIE_SIZE);
    }
    expect(isDieSize(DEFAULT_BASIC_DIE_SIZE)).toBe(true);
  });

  it('computes a real, plausible, wrong number for a die that is not a die', () => {
    // COMPUTED BY HAND. A d7 has mean (1+2+3+4+5+6+7)/7 = 4, versus 4.5 for the
    // d8 the field defaults to and 3.5 for the d6 beside it. Nothing about 4
    // looks wrong on a screen — which is why the clamp that produced it was the
    // defect and not merely untidy. The call is written through
    // `selectedDieSize` because `basicDieSize: 7` no longer compiles.
    const sevenAsRead = selectedDieSize('7');
    expect(sevenAsRead).toBe(8);
    const expected = exactResult(
      config({ basicDice: 1, basicDieSize: sevenAsRead, armorClass: 1, attackBonus: 100 }),
    );
    // Guaranteed hit, no critical range beyond the natural 20: 19/20 of the
    // rolls deal 4.5 and 1/20 deal 9 (two dice on a critical).
    close(expected.normalDamage, 4.5);
    close(expected.criticalDamage, 9);
  });
});
