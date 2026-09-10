import type { EncounterState } from '../../combat/encounter';
import type { CombatantId } from '../../combat/values';
import type { OptionOutcomeEvaluation } from '../intel/option-outcome';
import type { EngineOfferableOption, EngineOmittedRider } from '../option-modeling';
import type {
  EngineActionSlotUse,
  EngineActivationChoiceSlot,
  EngineMovementObjective,
  ResolvedTurnMechanics,
} from '../turn-proposal';

export interface EngineStandardOfferBinding {
  readonly kind: 'standard';
  readonly actionSlots: readonly EngineActionSlotUse[];
}

export type EngineOfferBinding = EngineStandardOfferBinding;

export interface EngineOfferEnvelope<B extends EngineOfferBinding = EngineOfferBinding> {
  readonly actorId: CombatantId;
  readonly revision: number;
  readonly label: string;
  readonly binding: B;
  readonly movement: EngineMovementObjective;
  readonly resourceCostLabels: readonly string[];
  readonly omittedRiders: readonly EngineOmittedRider[];
  readonly activationChoice: EngineActivationChoiceSlot | null;
}

export interface OfferGenerationContext {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
  readonly revision: number;
}

export type StandardOfferResolution =
  | { readonly valid: true; readonly mechanics: ResolvedTurnMechanics }
  | { readonly valid: false; readonly code: string; readonly summary: string };

export interface OfferResolutionContext {
  resolveStandard(option: EngineOfferableOption): StandardOfferResolution;
}

export interface OfferExecutionContext {
  executeStandard(mechanics: ResolvedTurnMechanics): void;
}

export interface OfferEvaluationContext {
  evaluateStandard(
    option: EngineOfferableOption,
    mechanics: ResolvedTurnMechanics,
  ): OptionOutcomeEvaluation;
}

export interface ResolvedOfferMechanics<B extends EngineOfferBinding = EngineOfferBinding> {
  readonly offer: EngineOfferEnvelope<B>;
  readonly mechanics: ResolvedTurnMechanics;
}

export type OfferResolution<B extends EngineOfferBinding = EngineOfferBinding> =
  | { readonly valid: true; readonly mechanics: ResolvedOfferMechanics<B> }
  | { readonly valid: false; readonly code: string; readonly summary: string };

export interface EngineOfferCapability<B extends EngineOfferBinding> {
  readonly kind: B['kind'];
  generate(context: OfferGenerationContext): readonly EngineOfferEnvelope<B>[];
  resolve(
    context: OfferResolutionContext,
    offer: EngineOfferEnvelope<B>,
  ): OfferResolution<B>;
  execute(context: OfferExecutionContext, mechanics: ResolvedOfferMechanics<B>): void;
  evaluate(
    context: OfferEvaluationContext,
    mechanics: ResolvedOfferMechanics<B>,
  ): OptionOutcomeEvaluation;
}

export function canonicalOfferBody(
  offer: EngineOfferEnvelope,
): Omit<EngineOfferableOption, 'optionId'> {
  switch (offer.binding.kind) {
    case 'standard': return {
      actorId: offer.actorId,
      revision: offer.revision,
      label: offer.label,
      movement: offer.movement,
      actionSlots: offer.binding.actionSlots,
      resourceCostLabels: offer.resourceCostLabels,
      omittedRiders: offer.omittedRiders,
      ...(offer.activationChoice === null ? {} : { activationChoice: offer.activationChoice }),
    };
  }
}
