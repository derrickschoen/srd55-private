import type { EngineOfferCapability, EngineStandardOfferBinding, OfferGenerationContext } from './offer-envelope';
import { standardOfferGenerator } from './standard-offer-generator';

export const ENGINE_OFFER_CAPABILITIES = [
  standardOfferGenerator,
] as const satisfies readonly [EngineOfferCapability<EngineStandardOfferBinding>];

export function generateEngineOfferEnvelopes(context: OfferGenerationContext) {
  return ENGINE_OFFER_CAPABILITIES.flatMap((capability) => capability.generate(context));
}
