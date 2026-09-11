import { engineOfferableOption } from '../option-modeling';
import { generateStandardOfferDeclarations } from './offer-declarations';
import type {
  EngineOfferCapability,
  EngineStandardOfferBinding,
  OfferResolution,
} from './offer-envelope';

export const standardOfferGenerator = Object.freeze({
  kind: 'standard',

  generate(context) {
    return generateStandardOfferDeclarations(context.state, context.actorId).map((declaration) => ({
      actorId: context.actorId,
      revision: context.revision,
      label: declaration.label,
      binding: { kind: 'standard', actionSlots: declaration.actionSlots },
      movement: declaration.movement,
      resourceCostLabels: declaration.resourceCostLabels,
      omittedRiders: declaration.omittedRiders,
      activationChoice: declaration.activationChoice,
    }));
  },

  resolve(context, offer): OfferResolution<EngineStandardOfferBinding> {
    const resolution = context.resolveStandard(engineOfferableOption(offer));
    return resolution.valid
      ? { valid: true, mechanics: { offer, mechanics: resolution.mechanics } }
      : resolution;
  },

  execute(context, resolved) {
    context.executeStandard(resolved.mechanics);
  },

  evaluate(context, resolved) {
    return context.evaluateStandard(engineOfferableOption(resolved.offer), resolved.mechanics);
  },
} satisfies EngineOfferCapability<EngineStandardOfferBinding>);
