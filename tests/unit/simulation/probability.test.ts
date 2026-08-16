import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { CharacterWeaponId } from '../../../src/domain/ids';
import {
  attackRollModifier,
  damageFlatModifier,
  damageRollTotal,
  expandedCriticalMinimumRoll,
  positiveDiceCount,
  routineEventId,
  saveDifficultyClass,
  sourceStableKey,
  targetArmorClass,
  targetSaveBonus,
  type AttackRollEvent,
  type DamageInstance,
  type DicePool,
  type RollState,
  type SavingThrowDamageEvent,
  type SourceRef,
  type TargetDamageResponse,
} from '../../../src/simulation/contracts';
import {
  expandedCriticalHitEvidenceManifest,
  publicProbabilityCoverageManifest,
  registerCharacterWeaponAttackClause,
  reviewedSaveSuccessClauses,
} from '../../../src/simulation/coverage';
import {
  applyDamageResponse,
  attackRollProbabilities,
  composeRoundDamageFolds,
  enumerateDicePool,
  foldAttackEvent,
  foldSavingThrowEvent,
  ordinaryDamageDistribution,
  resolveRollState,
  saveSuccessProbability,
} from '../../../src/simulation/probability';

const source: SourceRef = {
  kind: 'character_weapon',
  weapon_id: 9 as CharacterWeaponId,
  stable_key: sourceStableKey('weapon:9'),
};
const attackRegistration = registerCharacterWeaponAttackClause(source);

const slashing = damageType('Slashing');
const normalSlashing: readonly TargetDamageResponse[] = [
  { damage_type: slashing, response: 'normal' },
];

function rawD20Outcomes(state: RollState): number[] {
  const selected: number[] = [];
  if (state === 'normal') {
    for (let first = 1; first <= 20; first += 1) {
      selected.push(first);
    }
    return selected;
  }
  for (let first = 1; first <= 20; first += 1) {
    for (let second = 1; second <= 20; second += 1) {
      selected.push(
        state === 'advantage'
          ? Math.max(first, second)
          : Math.min(first, second),
      );
    }
  }
  return selected;
}

function independentlyEnumeratedAttack(
  bonus: number,
  armorClass: number,
  state: RollState,
  criticalMinimum = 20,
): { hit: number; critical: number; miss: number } {
  const rolls = rawD20Outcomes(state);
  let hits = 0;
  let criticals = 0;
  for (const face of rolls) {
    if (face === 1) {
      continue;
    }
    if (face >= criticalMinimum) {
      hits += 1;
      criticals += 1;
      continue;
    }
    if (face + bonus >= armorClass) {
      hits += 1;
    }
  }
  return {
    hit: hits / rolls.length,
    critical: criticals / rolls.length,
    miss: (rolls.length - hits) / rolls.length,
  };
}

function independentlyEnumeratedSave(
  dc: number,
  bonus: number,
  state: RollState,
): number {
  const rolls = rawD20Outcomes(state);
  return rolls.filter((face) => face + bonus >= dc).length / rolls.length;
}

function independentlyEnumeratedDice(pool: DicePool): Map<number, number> {
  const counts = new Map<number, number>();
  let totalRolls = 0;
  const visit = (remaining: number, subtotal: number): void => {
    if (remaining === 0) {
      counts.set(subtotal, (counts.get(subtotal) ?? 0) + 1);
      totalRolls += 1;
      return;
    }
    for (let face = 1; face <= pool.die; face += 1) {
      visit(remaining - 1, subtotal + face);
    }
  };
  visit(pool.count, 0);
  return new Map(
    [...counts.entries()].map(([total, count]) => [total, count / totalRolls]),
  );
}

function diceInstance(
  count: number,
  die: 4 | 6,
): DamageInstance {
  return {
    source,
    damage_type: slashing,
    components: [{
      kind: 'dice',
      pool: { count: positiveDiceCount(count), die },
    }],
  };
}

describe('independently derived d20 probabilities', () => {
  it('matches 20-face and 400-pair attack enumeration across bonuses and ACs', () => {
    for (const state of ['normal', 'advantage', 'disadvantage'] as const) {
      for (const bonus of [-30, 0, 5, 30]) {
        for (const armorClass of [0, 15, 50]) {
          const expected = independentlyEnumeratedAttack(
            bonus,
            armorClass,
            state,
          );
          const actual = attackRollProbabilities(
            attackRollModifier(bonus),
            targetArmorClass(armorClass),
            state,
          );
          expect(actual.hit).toBeCloseTo(expected.hit, 12);
          expect(actual.critical).toBeCloseTo(expected.critical, 12);
          expect(actual.miss).toBeCloseTo(expected.miss, 12);
          expect(actual.critical).toBeLessThanOrEqual(actual.hit);
          expect(actual.hit + actual.miss).toBeCloseTo(1, 12);
        }
      }
    }
  });

  it('pins attack-specific natural 1 and 20 at otherwise impossible edges', () => {
    expect(
      attackRollProbabilities(
        attackRollModifier(100),
        targetArmorClass(50),
        'normal',
      ),
    ).toEqual({ hit: 0.95, critical: 0.05, miss: 0.05 });
    expect(
      attackRollProbabilities(
        attackRollModifier(-100),
        targetArmorClass(0),
        'normal',
      ),
    ).toEqual({ hit: 0.05, critical: 0.05, miss: 0.95 });
  });

  it('matches independent enumeration for Champion 19-20 and 18-20 ranges', () => {
    for (const threshold of [19, 18] as const) {
      for (const state of ['normal', 'advantage', 'disadvantage'] as const) {
        for (const armorClass of [0, 15, 50]) {
          const expected = independentlyEnumeratedAttack(
            5,
            armorClass,
            state,
            threshold,
          );
          const actual = attackRollProbabilities(
            attackRollModifier(5),
            targetArmorClass(armorClass),
            state,
            expandedCriticalMinimumRoll(threshold),
          );
          expect(actual.hit).toBeCloseTo(expected.hit, 12);
          expect(actual.critical).toBeCloseTo(expected.critical, 12);
          expect(actual.miss).toBeCloseTo(expected.miss, 12);
        }
      }
    }
  });

  it('matches independent save enumeration without importing attack auto outcomes', () => {
    for (const state of ['normal', 'advantage', 'disadvantage'] as const) {
      for (const bonus of [-20, 0, 9, 30]) {
        for (const dc of [-5, 15, 21, 60]) {
          expect(
            saveSuccessProbability(
              saveDifficultyClass(dc),
              targetSaveBonus(bonus),
              state,
            ),
          ).toBeCloseTo(independentlyEnumeratedSave(dc, bonus, state), 12);
        }
      }
    }
    expect(
      saveSuccessProbability(
        saveDifficultyClass(1),
        targetSaveBonus(0),
        'normal',
      ),
    ).toBe(1);
    expect(
      saveSuccessProbability(
        saveDifficultyClass(21),
        targetSaveBonus(0),
        'normal',
      ),
    ).toBe(0);
  });

  it('does not stack same-side sources and cancels any mixed sources', () => {
    expect(resolveRollState(0, 0)).toBe('normal');
    expect(resolveRollState(1, 0)).toBe('advantage');
    expect(resolveRollState(7, 0)).toBe('advantage');
    expect(resolveRollState(0, 1)).toBe('disadvantage');
    expect(resolveRollState(0, 7)).toBe('disadvantage');
    expect(resolveRollState(1, 9)).toBe('normal');
    expect(resolveRollState(9, 1)).toBe('normal');
  });

  it('never increases hit probability when AC rises', () => {
    for (const state of ['normal', 'advantage', 'disadvantage'] as const) {
      let previous = 1;
      for (let armorClass = 0; armorClass <= 50; armorClass += 1) {
        const current = attackRollProbabilities(
          attackRollModifier(5),
          targetArmorClass(armorClass),
          state,
        ).hit;
        expect(current).toBeLessThanOrEqual(previous + Number.EPSILON);
        previous = current;
      }
    }
  });
});

describe('independently enumerated damage dice', () => {
  it('matches a recursive enumerator for small pools', () => {
    for (const pool of [
      { count: positiveDiceCount(1), die: 4 as const },
      { count: positiveDiceCount(2), die: 4 as const },
      { count: positiveDiceCount(3), die: 6 as const },
    ]) {
      const expected = independentlyEnumeratedDice(pool);
      const actual = new Map<number, number>(
        enumerateDicePool(pool).map((outcome) => [
          outcome.total,
          outcome.probability,
        ]),
      );
      expect([...actual.keys()]).toEqual([...expected.keys()]);
      for (const [total, expectedProbability] of expected) {
        expect(actual.get(total), `total ${String(total)}`).toBeCloseTo(
          expectedProbability,
          12,
        );
      }
      expect([...actual.values()].reduce((sum, value) => sum + value, 0))
        .toBeCloseTo(1, 12);
    }
  });
});

describe('critical-hit and trigger folds', () => {
  function ordinaryAttack(): AttackRollEvent {
    return {
      kind: 'attack_roll',
      event_id: routineEventId('attack:1'),
      source,
      ...attackRegistration,
      attack_bonus: attackRollModifier(100),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      damage: [{
        source,
        damage_type: slashing,
        components: [
          {
            kind: 'dice',
            pool: { count: positiveDiceCount(1), die: 6 },
            trigger: 'hit',
          },
          {
            kind: 'flat',
            modifier: damageFlatModifier(3),
            trigger: 'hit',
          },
        ],
      }],
    };
  }

  it('doubles attack damage dice and never doubles the flat modifier', () => {
    const result = foldAttackEvent(ordinaryAttack(), {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: normalSlashing,
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    // 18 ordinary faces × (1d6 + 3), one critical × (2d6 + 3), one miss.
    const independent = (18 * 6.5 + 10) / 20;
    expect(result.hit_probability).toBe(0.95);
    expect(result.critical_probability).toBe(0.05);
    expect(result.expected_damage).toBeCloseTo(independent, 12);
  });

  it('honors explicit critical-only and miss triggers', () => {
    const event = ordinaryAttack();
    const withTriggers: AttackRollEvent = {
      ...event,
      damage: [{
        ...event.damage[0],
        components: [
          ...event.damage[0].components,
          {
            kind: 'flat',
            modifier: damageFlatModifier(4),
            trigger: 'critical_hit',
          },
          {
            kind: 'flat',
            modifier: damageFlatModifier(2),
            trigger: 'miss',
          },
        ],
      }],
    };
    const result = foldAttackEvent(withTriggers, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: normalSlashing,
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.expected_damage).toBeCloseTo((18 * 6.5 + 14 + 2) / 20, 12);
  });

  it('evaluates both sourced Champion expanded ranges at their exact rates', () => {
    // Bundled SRD 5.2.1 lines 2979-2982 give 19-20; lines 3001-3004 give 18-20.
    for (const [threshold, ordinaryFaces, criticalFaces] of [
      [19, 17, 2],
      [18, 16, 3],
    ] as const) {
      const evidence = expandedCriticalHitEvidenceManifest.get(threshold);
      if (evidence === undefined) {
        throw new Error(`Missing threshold ${String(threshold)} evidence.`);
      }
      const event: AttackRollEvent = {
        ...ordinaryAttack(),
        critical: {
          kind: 'expanded_range',
          minimum_roll: expandedCriticalMinimumRoll(threshold),
          evidence,
        },
      };
      const result = foldAttackEvent(event, {
        armor_class: targetArmorClass(0),
        roll_state: 'normal',
        damage_responses: normalSlashing,
      });
      expect(result.status).toBe('available');
      if (result.status !== 'available') {
        throw new Error(result.reason);
      }
      expect(result.hit_probability).toBe(0.95);
      expect(result.critical_probability).toBe(criticalFaces / 20);
      expect(result.expected_damage).toBeCloseTo(
        (ordinaryFaces * 6.5 + criticalFaces * 10) / 20,
        12,
      );
    }
  });

  it('refuses an expanded critical range without its own citation', () => {
    const event: AttackRollEvent = {
      ...ordinaryAttack(),
      critical: {
        kind: 'expanded_range',
        minimum_roll: expandedCriticalMinimumRoll(19),
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
    };
    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(0),
      roll_state: 'normal',
      damage_responses: normalSlashing,
    });
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });
});

describe('damage responses and save outcomes', () => {
  it('applies every response to integer outcomes and immunity is exactly zero', () => {
    expect(applyDamageResponse(damageRollTotal(5), 'normal')).toBe(5);
    expect(applyDamageResponse(damageRollTotal(5), 'resistant')).toBe(2);
    expect(applyDamageResponse(damageRollTotal(5), 'vulnerable')).toBe(10);
    expect(
      applyDamageResponse(damageRollTotal(23), 'resistant_and_vulnerable'),
    ).toBe(22);
    expect(applyDamageResponse(damageRollTotal(5), 'immune')).toBe(0);
  });

  it('rounds resistance per outcome instead of halving the final expectation', () => {
    const clause = reviewedSaveSuccessClauses.acid_splash;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('save:resistance-rounding'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(21),
      roll_state: 'normal',
      save_success_clause_id: clause.id,
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [{
        source: clause.effect_source,
        damage_type: damageType('Acid'),
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(1), die: 6 },
        }],
      }],
      on_success: { kind: 'none', evidence: clause.evidence },
    };
    const result = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Acid'), response: 'resistant' },
      ],
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error('The resistant save fold must remain available.');
    }
    // floor(1/2) through floor(6/2) = 0,1,1,2,2,3.
    expect(result.expected_damage).toBe(1.5);
    expect(result.expected_damage).not.toBe(1.75);
  });

  it('adds a damage penalty to the dice before clamping the whole roll at zero', () => {
    expect(ordinaryDamageDistribution([
      {
        kind: 'dice',
        pool: { count: positiveDiceCount(1), die: 4 },
      },
      { kind: 'flat', modifier: damageFlatModifier(-5) },
    ])).toEqual([{ total: damageRollTotal(0), probability: 1 }]);
  });

  function saveEvent(
    on_success: SavingThrowDamageEvent['on_success'],
  ): SavingThrowDamageEvent {
    const clause = on_success.kind === 'half'
      ? reviewedSaveSuccessClauses.flaming_sphere
      : on_success.kind === 'sourced_damage'
        ? reviewedSaveSuccessClauses.vitriolic_sphere
        : reviewedSaveSuccessClauses.acid_splash;
    const damage = on_success.kind === 'half'
      ? { count: 2, die: 6 as const, type: damageType('Fire') }
      : on_success.kind === 'sourced_damage'
        ? { count: 10, die: 4 as const, type: damageType('Acid') }
        : { count: 1, die: 6 as const, type: damageType('Acid') };
    return {
      kind: 'saving_throw_damage',
      event_id: routineEventId('save:1'),
      source: clause.effect_source,
      ability: 'dexterity',
      save_dc: saveDifficultyClass(11),
      roll_state: 'normal',
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      save_success_clause_id: clause.id,
      damage_on_failed_save: [{
        source: clause.effect_source,
        damage_type: damage.type,
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(damage.count), die: damage.die },
        }],
      }],
      on_success,
    };
  }

  it('requires and evaluates an explicit no-damage success arm', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        kind: 'none',
        evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
      }),
      {
        save_bonus: targetSaveBonus(0),
        damage_responses: [{ damage_type: damageType('Acid'), response: 'normal' }],
      },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    expect(result.failed_save_probability).toBe(0.5);
    expect(result.expected_damage).toBe(1.75);
  });

  it('applies sourced half damage per outcome before weighting', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        kind: 'half',
        evidence: reviewedSaveSuccessClauses.flaming_sphere.evidence,
      }),
      {
        save_bonus: targetSaveBonus(0),
        damage_responses: [{ damage_type: damageType('Fire'), response: 'normal' }],
      },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    // Failure average 7; success average floor(2d6/2) = 3.25.
    expect(result.expected_damage).toBeCloseTo(5.125, 12);
  });

  it('evaluates bundled Burning Hands instead of refusing the sourced spell', () => {
    const clause = reviewedSaveSuccessClauses.burning_hands;
    const base = saveEvent({
      kind: 'half',
      evidence: clause.evidence,
    });
    const event: SavingThrowDamageEvent = {
      ...base,
      source: clause.effect_source,
      save_success_clause_id: clause.id,
      damage_on_failed_save: [{
        source: clause.effect_source,
        damage_type: damageType('Fire'),
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(3), die: 6 },
        }],
      }],
    };
    const result = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: damageType('Fire'), response: 'normal' }],
    });
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    // DC 11 gives equal save branches. 3d6 averages 10.5; floor(3d6/2) averages 5.
    expect(result.expected_damage).toBeCloseTo(7.75, 12);

    const unrelated: SavingThrowDamageEvent = {
      ...event,
      source,
    };
    const refused = foldSavingThrowEvent(unrelated, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [{ damage_type: damageType('Fire'), response: 'normal' }],
    });
    expect(refused.status).toBe('unavailable');
    expect(refused).not.toHaveProperty('expected_damage');
  });

  it('orders save-half adjustment before resistance on every odd outcome', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        kind: 'half',
        evidence: reviewedSaveSuccessClauses.flaming_sphere.evidence,
      }),
      {
        save_bonus: targetSaveBonus(0),
        damage_responses: [{ damage_type: damageType('Fire'), response: 'resistant' }],
      },
    );
    expect(result.status).toBe('available');
    if (result.status !== 'available') {
      throw new Error(result.reason);
    }
    let failure = 0;
    let success = 0;
    for (let first = 1; first <= 6; first += 1) {
      for (let second = 1; second <= 6; second += 1) {
        const total = first + second;
        failure += Math.floor(total / 2) / 36;
        success += Math.floor(Math.floor(total / 2) / 2) / 36;
      }
    }
    expect(result.expected_damage).toBeCloseTo((failure + success) / 2, 12);
  });

  it('refuses generic evidence for an effect-specific success damage outcome', () => {
    const successDamage: DamageInstance = {
      source,
      damage_type: slashing,
      components: [{ kind: 'flat', modifier: damageFlatModifier(1) }],
    };
    const result = foldSavingThrowEvent(
      saveEvent({
        kind: 'sourced_damage',
        evidence: publicProbabilityCoverageManifest.saving_throw,
        roll_transform: 'none',
        damage: [successDamage],
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: normalSlashing },
    );
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.reason).toContain('sourced_damage');
      expect(result).not.toHaveProperty('expected_damage');
    }
  });

  it('does not turn an unsourced no-damage success clause into zero', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        kind: 'none',
        evidence: publicProbabilityCoverageManifest.saving_throw,
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: normalSlashing },
    );
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.reason).toContain('none');
      expect(result.failed_save_probability).toBe(0.5);
      expect(result).not.toHaveProperty('expected_damage');
    }
  });

  it('does not authorize half damage from unrelated event evidence', () => {
    const result = foldSavingThrowEvent(
      saveEvent({
        kind: 'half',
        evidence: reviewedSaveSuccessClauses.acid_splash.evidence,
      }),
      { save_bonus: targetSaveBonus(0), damage_responses: normalSlashing },
    );
    expect(result.status).toBe('unavailable');
    if (result.status === 'unavailable') {
      expect(result.reason).toContain('half');
      expect(result).not.toHaveProperty('expected_damage');
    }
  });

  it('returns unavailable for a publicly constructible missing damage response', () => {
    const clause = reviewedSaveSuccessClauses.acid_splash;
    const event: SavingThrowDamageEvent = {
      kind: 'saving_throw_damage',
      event_id: routineEventId('save:missing-response'),
      source: clause.effect_source,
      ability: clause.ability,
      save_dc: saveDifficultyClass(21),
      roll_state: 'normal',
      save_success_clause_id: clause.id,
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage_on_failed_save: [{
        source: clause.effect_source,
        damage_type: damageType('Acid'),
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(1), die: 6 },
        }],
      }],
      on_success: { kind: 'none', evidence: clause.evidence },
    };
    const missing = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [],
    });
    expect(missing.status).toBe('unavailable');
    expect(missing).not.toHaveProperty('expected_damage');
    const composed = composeRoundDamageFolds([
      foldSavingThrowEvent(event, {
        save_bonus: targetSaveBonus(0),
        damage_responses: [
          { damage_type: damageType('Acid'), response: 'normal' },
        ],
      }),
      missing,
    ]);
    expect(composed.status).toBe('unavailable');
    expect(composed).not.toHaveProperty('expected_damage');

    const sourced = foldSavingThrowEvent(event, {
      save_bonus: targetSaveBonus(0),
      damage_responses: [
        { damage_type: damageType('Acid'), response: 'normal' },
      ],
    });
    expect(sourced.status).toBe('available');
    if (sourced.status === 'available') {
      expect(sourced.expected_damage).toBe(3.5);
    }
  });
});
