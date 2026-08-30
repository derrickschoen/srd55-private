import { describe, expect, it } from 'vitest';
import { feet, combatantId } from '../../../src/combat/values';
import type { TacticalAttackInput } from '../../../src/combat/tactical-evaluator';
import {
  REACTION_SPEND_HOLD_POLICY,
  reactionSpendHold,
  type ReactionSpendHoldInput,
} from '../../../src/vtt/intel/reaction-spend-hold';

const REACTOR = combatantId('combatant:reactor');
const MOVER = combatantId('combatant:mover');
const LATER_MOVER = combatantId('combatant:later-mover');
const LATER_REACTOR = combatantId('combatant:later-reactor');

function opportunityAttack(overrides: Partial<TacticalAttackInput> = {}): TacticalAttackInput {
  return {
    attackerId: REACTOR,
    targetId: MOVER,
    attackerPosition: { column: 0, row: 0 },
    targetPosition: { column: 1, row: 0 },
    range: { kind: 'melee', reachFeet: feet(5) },
    attackBonus: 5,
    targetArmorClass: 15,
    criticalFloor: 20,
    damageTerms: [{ dice: { count: 1, sides: 8, modifier: 2 } }],
    attackerConditions: [],
    targetConditions: [],
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    rollModeSources: [],
    target: { hitPoints: 20, usesDeathSaves: true },
    ...overrides,
  };
}

function input(overrides: Partial<ReactionSpendHoldInput> = {}): ReactionSpendHoldInput {
  return {
    trigger: {
      id: 'decision:reaction-1',
      kind: 'reaction_offer',
      reactionKind: 'opportunity_attack',
      combatant: REACTOR,
      boundary: { activeCombatant: MOVER, round: 3 },
      opportunityAttack: { mover: MOVER },
    },
    immediate: { reactionKind: 'opportunity_attack', tacticalAttack: opportunityAttack() },
    timeline: {
      round: 3,
      futureTurnStarts: [
        { combatant: LATER_MOVER, round: 3 },
        { combatant: LATER_REACTOR, round: 3 },
      ],
    },
    qualifiedFutureOpportunities: [],
    ...overrides,
  };
}

describe('reaction spend/hold intel', () => {
  it('M3 evaluates the actual OA spend with the canonical tactical expected damage', () => {
    const result = reactionSpendHold(input());

    expect(result.policy).toBe(REACTION_SPEND_HOLD_POLICY);
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') throw new Error('Expected resolved OA value.');
    // Hand calculation: 10 normal hits × 6.5/20 plus one critical × 11/20.
    expect(result.spend.expectedDamage).toBe(3.8);
    expect(result.spend.tacticalEvaluation.damage).toMatchObject({
      status: 'resolved', normalHitAverage: 6.5, criticalHitAverage: 11,
    });
  });

  it('M3 lists only same-round timeline-backed, mechanically-qualified future OA opportunities', () => {
    const result = reactionSpendHold(input({
      qualifiedFutureOpportunities: [
        {
          reactionKind: 'opportunity_attack', mover: LATER_MOVER,
          sourceTurn: { combatant: LATER_MOVER, round: 3 },
          qualification: { moverCanVoluntarilyMove: true, movementCanLeaveReactorReach: true },
        },
        {
          reactionKind: 'opportunity_attack', mover: LATER_REACTOR,
          sourceTurn: { combatant: LATER_REACTOR, round: 4 },
          qualification: { moverCanVoluntarilyMove: true, movementCanLeaveReactorReach: true },
        },
        {
          reactionKind: 'opportunity_attack', mover: MOVER,
          sourceTurn: { combatant: MOVER, round: 3 },
          qualification: { moverCanVoluntarilyMove: true, movementCanLeaveReactorReach: true },
        },
      ],
    }));

    expect(result.hold.qualifiedPossibleOpportunities).toEqual([{
      reactionKind: 'opportunity_attack',
      mover: LATER_MOVER,
      sourceTurn: { combatant: LATER_MOVER, round: 3 },
      certainty: 'possible',
      condition: 'mover_voluntarily_leaves_reactor_reach',
    }]);
  });

  it('M3 never labels a future opportunity as guaranteed', () => {
    const result = reactionSpendHold(input({
      qualifiedFutureOpportunities: [{
        reactionKind: 'opportunity_attack', mover: LATER_MOVER,
        sourceTurn: { combatant: LATER_MOVER, round: 3 },
        qualification: { moverCanVoluntarilyMove: true, movementCanLeaveReactorReach: true },
      }],
    }));

    expect(result.hold.qualifiedPossibleOpportunities[0]?.certainty).toBe('possible');
    expect(result.hold.unqualifiedFutureTriggers).toEqual({
      status: 'unresolved', reason: 'future_movement_choice_unknown',
    });
  });

  it('M3 returns the tactical evaluator reason as a typed unresolved spend value', () => {
    const result = reactionSpendHold(input({
      immediate: {
        reactionKind: 'opportunity_attack',
        tacticalAttack: opportunityAttack({ targetArmorClass: null }),
      },
    }));

    expect(result).toMatchObject({
      policy: REACTION_SPEND_HOLD_POLICY,
      status: 'unresolved',
      reason: 'target_armor_class_unresolved',
      spend: { status: 'unresolved', reason: 'target_armor_class_unresolved' },
    });
  });
});
