import { describe, expect, it } from 'vitest';
import {
  evaluateTacticalAttack,
  foldTacticalAttackSequence,
  type TacticalAttackInput,
} from '../../../src/combat/tactical-evaluator';
import { combatantId, feet } from '../../../src/combat/values';
import { declareTestInputs } from '../../helpers/test-inputs';

declareTestInputs({});

function attack(target: TacticalAttackInput['target']): TacticalAttackInput {
  return {
    attackerId: combatantId('combatant:projected-attacker'),
    targetId: combatantId('combatant:projected-target'),
    attackerPosition: { column: 0, row: 0 },
    targetPosition: { column: 1, row: 0 },
    range: { kind: 'melee', reachFeet: feet(5) },
    attackBonus: 5,
    targetArmorClass: 15,
    criticalFloor: 20,
    damageTerms: [{ dice: { count: 1, sides: 8, modifier: 3 } }],
    attackerConditions: [],
    targetConditions: [],
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    rollModeSources: [],
    featureRollModeInput: null,
    target,
  };
}

describe('tactical evaluator actor-knowledge inputs', () => {
  it('keeps attack arithmetic resolved while refusing unknown-HP consequences', () => {
    const evaluation = evaluateTacticalAttack(attack({
      hitPoints: { kind: 'unknown' },
      usesDeathSaves: { kind: 'unknown' },
    }));

    // +5 against AC 15 hits on 10..20, including the natural 20 critical.
    expect(evaluation.probabilities).toEqual({
      status: 'resolved', hit: 11 / 20, critical: 1 / 20, miss: 9 / 20,
    });
    expect(evaluation.consequences).toEqual({
      status: 'unresolved',
      reason: 'target_hit_points_unresolved',
      deathFailureOnHit: null,
      failuresOnHit: null,
      failuresOnCritical: null,
      automaticCriticalOnHit: false,
      automaticCriticalMaximumDistanceFeet: null,
    });
    expect(evaluation.unresolved).toContain('target_hit_points_unresolved');
  });

  it('refuses a kill probability rather than substituting a projected HP band', () => {
    const input = attack({
      hitPoints: { kind: 'unknown' },
      usesDeathSaves: { kind: 'unknown' },
    });
    expect(foldTacticalAttackSequence({
      target: { kind: 'unknown_hit_points' },
      attacks: [input],
    })).toMatchObject({
      status: 'unresolved',
      killProbability: null,
      expectedFailures: null,
      reasonCodes: ['target_hit_points_unresolved'],
    });
  });
});
