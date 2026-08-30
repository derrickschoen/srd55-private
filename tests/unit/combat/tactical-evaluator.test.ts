import { describe, expect, it } from 'vitest';
import {
  TACTICAL_EVALUATOR_POLICY,
  combineAttackRollMode,
  evaluateTacticalAttack,
  tacticalRangeVerdict,
  type TacticalAttackInput,
} from '../../../src/combat/tactical-evaluator';
import { combatantId, feet } from '../../../src/combat/values';
import { monsterAttackRollModeSources } from '../../../src/combat/monster-commands';
import type { MonsterAttackAction } from '../../../src/combat/statblock';

function baseInput(overrides: Partial<TacticalAttackInput> = {}): TacticalAttackInput {
  return {
    attackerId: combatantId('combatant:attacker'),
    targetId: combatantId('combatant:target'),
    attackerPosition: { column: 0, row: 0 },
    targetPosition: { column: 6, row: 0 },
    range: { kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60) },
    attackBonus: 4,
    targetArmorClass: 15,
    criticalFloor: 20,
    damageTerms: [{ dice: { count: 1, sides: 8, modifier: 2 } }],
    attackerConditions: [],
    targetConditions: [],
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    rollModeSources: [],
    target: { hitPoints: 10, usesDeathSaves: true },
    ...overrides,
  };
}

describe('canonical tactical evaluator', () => {
  it('pins melee, normal, long, and out boundaries from Chebyshev distance', () => {
    const attacker = { column: 0, row: 0 };
    expect(tacticalRangeVerdict(attacker, { column: 1, row: 1 }, {
      kind: 'melee', reachFeet: feet(5),
    })).toEqual({ status: 'resolved', distanceFeet: 5, band: 'melee', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 6, row: 6 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 30, band: 'normal', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 7, row: 0 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 35, band: 'long', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 12, row: 0 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 60, band: 'long', legal: true });
    expect(tacticalRangeVerdict(attacker, { column: 13, row: 0 }, {
      kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: feet(60),
    })).toEqual({ status: 'resolved', distanceFeet: 65, band: 'out', legal: false });
  });

  it('cancels any advantage plus any disadvantage to a straight roll', () => {
    expect(combineAttackRollMode([
      { mode: 'advantage', reason: 'effect_advantage' },
      { mode: 'disadvantage', reason: 'effect_disadvantage' },
    ])).toEqual({
      mode: 'normal',
      reasons: ['effect_advantage', 'effect_disadvantage'],
      sources: [
        { mode: 'advantage', reason: 'effect_advantage' },
        { mode: 'disadvantage', reason: 'effect_disadvantage' },
      ],
    });
  });

  it('includes typed intrinsic statblock advantage sources', () => {
    const actor = combatantId('combatant:attacker');
    const action: MonsterAttackAction = {
      kind: 'attack',
      id: 'clamp',
      name: 'Clamp',
      attackBonus: 4,
      delivery: { kind: 'melee', reachFeet: 5 },
      damage: [],
      attackRollAdvantage: { kind: 'target_grappled_by_attacker' },
      onHit: [],
    };
    expect(monsterAttackRollModeSources(
      action,
      actor,
      [{ name: 'Grappled', source: actor }],
      10,
      10,
    )).toEqual([{
      mode: 'advantage',
      reason: 'target_grappled_by_attacker_advantage',
    }]);
    expect(monsterAttackRollModeSources(
      { ...action, attackRollAdvantage: { kind: 'target_not_full_hit_points' } },
      actor,
      [],
      9,
      10,
    )).toEqual([{
      mode: 'advantage',
      reason: 'target_not_full_hit_points_advantage',
    }]);
  });

  it('derives straight unconscious-plus-prone attacks beyond 5 feet with typed reasons', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      targetConditions: [{ name: 'Unconscious' }],
    }));
    expect(evaluation.policy).toBe(TACTICAL_EVALUATOR_POLICY);
    expect(evaluation.rollMode).toMatchObject({
      mode: 'normal',
      reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
    });
  });

  it('forces critical hits only within the condition gate', () => {
    const near = evaluateTacticalAttack(baseInput({
      targetPosition: { column: 1, row: 0 },
      targetConditions: [{ name: 'Unconscious' }],
    }));
    const far = evaluateTacticalAttack(baseInput({
      targetConditions: [{ name: 'Unconscious' }],
    }));
    expect(near.consequences).toMatchObject({
      automaticCriticalOnHit: true,
      automaticCriticalMaximumDistanceFeet: 5,
    });
    expect(far.consequences).toMatchObject({
      automaticCriticalOnHit: false,
      automaticCriticalMaximumDistanceFeet: 5,
    });
    expect(near.probabilities.status).toBe('resolved');
    if (near.probabilities.status !== 'resolved') throw new Error('Near probability unresolved.');
    expect(near.probabilities.critical).toBe(near.probabilities.hit);
    expect(far.probabilities).toMatchObject({ status: 'resolved', critical: 0.05 });
  });

  it('marks one death failure on a hit and two on a critical at zero HP', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      target: { hitPoints: 0, usesDeathSaves: true },
    }));
    expect(evaluation.consequences).toMatchObject({
      deathFailureOnHit: true,
      failuresOnHit: 1,
      failuresOnCritical: 2,
    });
  });

  it('separates hit and critical probability in exact base damage expectation', () => {
    const evaluation = evaluateTacticalAttack(baseInput());
    // +4 vs AC 15 hits on 11..20: P(hit)=10/20, P(crit)=1/20.
    // 1d8+2 averages 6.5; a critical 2d8+2 averages 11.
    expect(evaluation.probabilities).toEqual({
      status: 'resolved', hit: 0.5, critical: 0.05, miss: 0.5,
    });
    expect(evaluation.damage).toMatchObject({
      status: 'resolved', normalHitAverage: 6.5, criticalHitAverage: 11,
    });
    if (evaluation.damage.status !== 'resolved') throw new Error('Damage unresolved.');
    expect(evaluation.damage.expectedDamage).toBeCloseTo(3.475, 12);
  });

  it('returns typed unresolved results instead of guessing an absent long range', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      targetPosition: { column: 7, row: 0 },
      range: { kind: 'ranged', normalRangeFeet: feet(30), longRangeFeet: null },
    }));
    expect(evaluation.range).toEqual({
      status: 'unresolved', distanceFeet: 35, reason: 'long_range_unresolved',
    });
    expect(evaluation.probabilities).toEqual({
      status: 'unresolved', reason: 'long_range_unresolved',
    });
    expect(evaluation.damage).toEqual({
      status: 'unresolved', reason: 'long_range_unresolved',
    });
  });

  it('refuses probability and damage numbers when an analytic modifier is unresolved', () => {
    const evaluation = evaluateTacticalAttack(baseInput({
      unresolvedReasons: ['random_attack_modifier_unresolved'],
    }));
    expect(evaluation.probabilities).toEqual({
      status: 'unresolved', reason: 'random_attack_modifier_unresolved',
    });
    expect(evaluation.damage).toEqual({
      status: 'unresolved', reason: 'random_attack_modifier_unresolved',
    });
  });
});
