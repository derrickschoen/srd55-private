import type { ControllerKind } from '../combat/controllers';
import type {
  EncounterState,
  PendingDecision,
  ReactionPolicy,
} from '../combat/encounter';

export type UnattendedReactionAskDefault = 'decline' | 'take';

export type ReactionOfferHostPolicy =
  | { readonly kind: 'dm_attended' }
  | {
      readonly kind: 'unattended';
      readonly askDefault: UnattendedReactionAskDefault;
    };

export const DM_ATTENDED_REACTION_OFFER_POLICY: ReactionOfferHostPolicy = Object.freeze({
  kind: 'dm_attended',
});

export const ARENA_REACTION_OFFER_POLICY: ReactionOfferHostPolicy = Object.freeze({
  kind: 'unattended',
  askDefault: 'decline',
});

export interface AutoResolvedReactionOffer {
  readonly decisionId: string;
  readonly combatant: PendingDecision['combatant'];
  readonly reactionKind: Extract<PendingDecision, { readonly kind: 'reaction_offer' }>['reactionKind'];
  readonly configuredPolicy: ReactionPolicy;
  readonly askDefault: UnattendedReactionAskDefault | null;
  readonly resolution: 'accept' | 'decline';
}

function configuredPolicy(
  state: EncounterState,
  decision: Extract<PendingDecision, { readonly kind: 'reaction_offer' }>,
): ReactionPolicy {
  return state.reactionPolicies.find((entry) =>
    entry.combatant === decision.combatant && entry.reactionKind === decision.reactionKind,
  )?.policy ?? 'ask';
}

export function unattendedReactionOfferResolution(
  state: EncounterState,
  decision: Extract<PendingDecision, { readonly kind: 'reaction_offer' }>,
  controllerKind: ControllerKind,
  hostPolicy: ReactionOfferHostPolicy,
): AutoResolvedReactionOffer | null {
  if (hostPolicy.kind === 'dm_attended' || controllerKind === 'human') return null;
  const policy = configuredPolicy(state, decision);
  const resolution = policy === 'always'
    ? 'accept'
    : policy === 'never'
      ? 'decline'
      : hostPolicy.askDefault === 'take'
        ? 'accept'
        : 'decline';
  return {
    decisionId: decision.id,
    combatant: decision.combatant,
    reactionKind: decision.reactionKind,
    configuredPolicy: policy,
    askDefault: policy === 'ask' ? hostPolicy.askDefault : null,
    resolution,
  };
}
