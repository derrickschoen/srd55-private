import {
  evaluateTacticalAttack,
  type TacticalAttackEvaluation,
  type TacticalAttackInput,
  type TacticalUnresolvedReason,
} from '../../combat/tactical-evaluator';
import type { ReactionKind } from '../../combat/encounter';
import type { CombatantId } from '../../combat/values';
import {
  intelPolicyVersion,
  type IntelProviderResult,
  type UnresolvedIntel,
} from './contracts';

/** Versioned policy for comparing the current reaction with holding it this round. */
export const REACTION_SPEND_HOLD_POLICY = intelPolicyVersion('reaction-spend-hold-v1');
export type ReactionSpendHoldPolicy = typeof REACTION_SPEND_HOLD_POLICY;

/**
 * The minimal engine-owned shape that proves this provider runs at a reaction
 * boundary. It intentionally cannot be constructed for an ordinary turn.
 */
export interface ActualReactionTrigger {
  readonly id: string;
  readonly kind: 'reaction_offer';
  readonly reactionKind: 'opportunity_attack';
  readonly combatant: CombatantId;
  readonly boundary: {
    readonly activeCombatant: CombatantId;
    readonly round: number;
  };
  readonly opportunityAttack: {
    readonly mover: CombatantId;
  };
}

/** Future turn starts are pre-filtered by the engine to the current round. */
export interface ReactionRoundTimeline {
  readonly round: number;
  readonly futureTurnStarts: readonly {
    readonly combatant: CombatantId;
    readonly round: number;
  }[];
}

/**
 * A future OA is qualified only where the timeline proves its mover still has
 * a turn and the current board proves that voluntary movement could leave the
 * reactor's reach. Neither fact proves that the mover will choose that path.
 */
export interface QualifiedFutureOpportunityAttack {
  readonly reactionKind: 'opportunity_attack';
  readonly mover: CombatantId;
  readonly sourceTurn: {
    readonly combatant: CombatantId;
    readonly round: number;
  };
  readonly qualification: {
    readonly moverCanVoluntarilyMove: true;
    readonly movementCanLeaveReactorReach: true;
  };
}

export interface OpportunityAttackSpendInput {
  readonly reactionKind: 'opportunity_attack';
  readonly tacticalAttack: TacticalAttackInput;
}

export interface ReactionSpendHoldInput {
  readonly trigger: ActualReactionTrigger;
  readonly immediate: OpportunityAttackSpendInput;
  readonly timeline: ReactionRoundTimeline;
  readonly qualifiedFutureOpportunities: readonly QualifiedFutureOpportunityAttack[];
}

export interface ResolvedOpportunityAttackSpendValue {
  readonly reactionKind: 'opportunity_attack';
  readonly status: 'resolved';
  /** The canonical tactical evaluator's immediate expected-damage result. */
  readonly expectedDamage: number;
  readonly tacticalEvaluation: TacticalAttackEvaluation;
}

export interface PossibleFutureOpportunityAttack {
  readonly reactionKind: 'opportunity_attack';
  readonly mover: CombatantId;
  readonly sourceTurn: {
    readonly combatant: CombatantId;
    readonly round: number;
  };
  /** Deliberately the only certainty vocabulary for a future opportunity. */
  readonly certainty: 'possible';
  readonly condition: 'mover_voluntarily_leaves_reactor_reach';
}

export interface HoldReactionValue {
  readonly immediateValue: 0;
  readonly qualifiedPossibleOpportunities: readonly PossibleFutureOpportunityAttack[];
  /** Candidate movement choices cannot be mechanically predicted. */
  readonly unqualifiedFutureTriggers: UnresolvedIntel<'future_movement_choice_unknown'>;
}

export type ReactionSpendHoldUnresolvedReason =
  | TacticalUnresolvedReason
  | 'trigger_attack_mismatch';

export type ReactionSpendHoldResult = IntelProviderResult<
  ReactionSpendHoldPolicy,
  {
    readonly triggerId: string;
    readonly reactionKind: ReactionKind;
    readonly spend: ResolvedOpportunityAttackSpendValue;
    readonly hold: HoldReactionValue;
  },
  ReactionSpendHoldUnresolvedReason,
  {
    readonly triggerId: string;
    readonly reactionKind: ReactionKind;
    readonly spend: UnresolvedIntel<ReactionSpendHoldUnresolvedReason, {
      readonly reactionKind: 'opportunity_attack';
      readonly tacticalEvaluation?: TacticalAttackEvaluation;
    }>;
    readonly hold: HoldReactionValue;
  }
>;

function isFutureTurnInCurrentRound(
  timeline: ReactionRoundTimeline,
  candidate: QualifiedFutureOpportunityAttack,
): boolean {
  return candidate.sourceTurn.round === timeline.round &&
    candidate.sourceTurn.combatant === candidate.mover &&
    timeline.futureTurnStarts.some((turn) =>
      turn.round === timeline.round && turn.combatant === candidate.sourceTurn.combatant);
}

function qualifiedPossibleOpportunities(
  input: ReactionSpendHoldInput,
): readonly PossibleFutureOpportunityAttack[] {
  return input.qualifiedFutureOpportunities
    .filter((candidate) =>
      candidate.reactionKind === 'opportunity_attack' &&
      candidate.mover !== input.trigger.combatant &&
      candidate.qualification.moverCanVoluntarilyMove &&
      candidate.qualification.movementCanLeaveReactorReach &&
      isFutureTurnInCurrentRound(input.timeline, candidate))
    .map((candidate) => ({
      reactionKind: candidate.reactionKind,
      mover: candidate.mover,
      sourceTurn: { ...candidate.sourceTurn },
      certainty: 'possible',
      condition: 'mover_voluntarily_leaves_reactor_reach',
    }));
}

function holdValue(input: ReactionSpendHoldInput): HoldReactionValue {
  return {
    immediateValue: 0,
    qualifiedPossibleOpportunities: qualifiedPossibleOpportunities(input),
    unqualifiedFutureTriggers: {
      status: 'unresolved',
      reason: 'future_movement_choice_unknown',
    },
  };
}

function unresolved(
  input: ReactionSpendHoldInput,
  reason: ReactionSpendHoldUnresolvedReason,
  tacticalEvaluation?: TacticalAttackEvaluation,
): ReactionSpendHoldResult {
  return {
    policy: REACTION_SPEND_HOLD_POLICY,
    status: 'unresolved',
    reason,
    triggerId: input.trigger.id,
    reactionKind: input.trigger.reactionKind,
    spend: {
      status: 'unresolved',
      reason,
      reactionKind: 'opportunity_attack',
      ...(tacticalEvaluation === undefined ? {} : { tacticalEvaluation }),
    },
    hold: holdValue(input),
  };
}

/**
 * Compares an already-triggered Opportunity Attack with holding its reaction.
 * It does not run during ordinary turns and never predicts a creature's move.
 */
export function reactionSpendHold(input: ReactionSpendHoldInput): ReactionSpendHoldResult {
  if (
    input.trigger.reactionKind !== input.immediate.reactionKind ||
    input.trigger.combatant !== input.immediate.tacticalAttack.attackerId ||
    input.trigger.opportunityAttack.mover !== input.immediate.tacticalAttack.targetId
  ) return unresolved(input, 'trigger_attack_mismatch');

  const tacticalEvaluation = evaluateTacticalAttack(input.immediate.tacticalAttack);
  if (tacticalEvaluation.damage.status === 'unresolved') {
    return unresolved(input, tacticalEvaluation.damage.reason, tacticalEvaluation);
  }
  return {
    policy: REACTION_SPEND_HOLD_POLICY,
    status: 'resolved',
    triggerId: input.trigger.id,
    reactionKind: input.trigger.reactionKind,
    spend: {
      reactionKind: 'opportunity_attack',
      status: 'resolved',
      expectedDamage: tacticalEvaluation.damage.expectedDamage,
      tacticalEvaluation,
    },
    hold: holdValue(input),
  };
}
