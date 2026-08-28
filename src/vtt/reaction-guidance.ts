import type { ControllerKind } from '../combat/controllers';
import {
  canCombatantSee,
  type EncounterState,
  type PendingDecision,
  type ReactionKind,
} from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import type { ReactionOfferHostPolicy } from './reaction-offer-host-policy';

export const REACTION_GUIDANCE_INSTRUCTIONS = [
  'take',
  'decline',
  'only_when_target_visible',
  'only_when_legal_without_moving',
] as const;

export type ReactionGuidanceInstruction = (typeof REACTION_GUIDANCE_INSTRUCTIONS)[number];
export type ReactionTriggerGuidance = Readonly<Partial<Record<ReactionKind, ReactionGuidanceInstruction>>>;

export interface ActorReactionGuidance {
  readonly actorId: CombatantId;
  readonly triggers: ReactionTriggerGuidance;
}

/** A declaration replaces the prior declaration as one sticky run-level value. */
export interface ReactionGuidanceDeclaration {
  readonly sideWide: ReactionTriggerGuidance | null;
  readonly actors: readonly ActorReactionGuidance[];
}

export interface GuidedReactionResolution {
  readonly decisionId: string;
  readonly combatant: CombatantId;
  readonly reactionKind: ReactionKind;
  readonly instruction: ReactionGuidanceInstruction;
  readonly scope: { readonly kind: 'actor'; readonly actorId: CombatantId } | { readonly kind: 'side_wide' };
  readonly resolution: 'accept' | 'decline';
}

function selectedGuidance(
  declaration: ReactionGuidanceDeclaration,
  combatant: CombatantId,
  reactionKind: ReactionKind,
): Pick<GuidedReactionResolution, 'instruction' | 'scope'> | null {
  const actor = declaration.actors.find((entry) => entry.actorId === combatant);
  const actorInstruction = actor?.triggers[reactionKind];
  if (actorInstruction !== undefined) {
    return { instruction: actorInstruction, scope: { kind: 'actor', actorId: combatant } };
  }
  const sideInstruction = declaration.sideWide?.[reactionKind];
  return sideInstruction === undefined
    ? null
    : { instruction: sideInstruction, scope: { kind: 'side_wide' } };
}

function pendingOfferConditionSatisfied(
  state: EncounterState,
  decision: Extract<PendingDecision, { readonly kind: 'reaction_offer' }>,
  instruction: ReactionGuidanceInstruction,
): boolean {
  switch (instruction) {
    case 'take': return true;
    case 'decline': return false;
    case 'only_when_target_visible':
      return canCombatantSee(state, decision.combatant, decision.opportunityAttack.mover);
    case 'only_when_legal_without_moving':
      // The reducer queued a complete legal Opportunity Attack command at the
      // triggering boundary; accepting it never adds movement.
      return true;
  }
}

export function guidedPendingReactionResolution(
  state: EncounterState,
  decision: Extract<PendingDecision, { readonly kind: 'reaction_offer' }>,
  controllerKind: ControllerKind,
  hostPolicy: ReactionOfferHostPolicy,
  declaration: ReactionGuidanceDeclaration | null,
): GuidedReactionResolution | null {
  if (declaration === null || hostPolicy.kind === 'dm_attended' || controllerKind === 'human') return null;
  const selected = selectedGuidance(declaration, decision.combatant, decision.reactionKind);
  if (selected === null) return null;
  return {
    decisionId: decision.id,
    combatant: decision.combatant,
    reactionKind: decision.reactionKind,
    ...selected,
    resolution: pendingOfferConditionSatisfied(state, decision, selected.instruction) ? 'accept' : 'decline',
  };
}
