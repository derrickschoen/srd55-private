import { canonicalEngineQueryPort } from '../engine-query-port';
import {
  createDisabledEngineOfferFamilyPolicy,
  createEngineOptionEnvironmentBinding,
  createLegacyEngineOptionEnvironmentBinding,
  decodeEngineOfferFamilyPolicy,
  decodeEngineOptionEnvironmentBinding,
  type EngineOfferFamilyPolicy,
  type EngineOptionEnvironmentBinding,
} from './offer-environment';
import {
  decodePartyThreatCatalog,
  type PartyThreatCatalog,
} from './party-threat-catalog';

export type OfferEnvironmentInput =
  | { readonly kind: 'configuration'; readonly mode: 'legacy_standard' }
  | {
      readonly kind: 'configuration';
      readonly mode: 'revision_bound';
      readonly familyPolicy: EngineOfferFamilyPolicy;
      readonly partyThreatCatalog: PartyThreatCatalog;
    }
  | { readonly kind: 'binding'; readonly binding: unknown };

class RuntimeOfferEnvironment {
  readonly #brand = undefined;
  readonly queries = canonicalEngineQueryPort;
  readonly familyPolicy: EngineOfferFamilyPolicy;
  readonly partyThreatCatalog: PartyThreatCatalog;
  readonly digest: string;

  constructor(readonly binding: EngineOptionEnvironmentBinding) {
    this.familyPolicy = binding.familyPolicy;
    this.partyThreatCatalog = binding.partyThreatCatalog;
    this.digest = binding.digest;
    Object.freeze(this);
  }
}

export type EngineOptionEnvironment = RuntimeOfferEnvironment;

function hasExactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

export function buildOfferEnvironment(input: OfferEnvironmentInput): EngineOptionEnvironment {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('Offer environment input must be an object.');
  }
  if (input.kind === 'binding') {
    if (input.binding === undefined) {
      throw new TypeError('Offer environment binding is required.');
    }
    if (!hasExactKeys(input, ['kind', 'binding'])) {
      throw new TypeError('Offer environment binding input has an invalid shape.');
    }
    return new RuntimeOfferEnvironment(decodeEngineOptionEnvironmentBinding(input.binding));
  }
  if (input.kind !== 'configuration') {
    throw new TypeError('Offer environment input has an invalid shape.');
  }
  if (input.mode === 'legacy_standard') {
    if (!hasExactKeys(input, ['kind', 'mode'])) {
      throw new TypeError('Offer environment configuration has an invalid shape.');
    }
    return new RuntimeOfferEnvironment(createLegacyEngineOptionEnvironmentBinding());
  }
  if (input.mode !== 'revision_bound' ||
    !hasExactKeys(input, ['kind', 'mode', 'familyPolicy', 'partyThreatCatalog'])) {
    throw new TypeError('Offer environment configuration has an invalid shape.');
  }
  const familyPolicy = decodeEngineOfferFamilyPolicy(input.familyPolicy);
  const partyThreatCatalog = decodePartyThreatCatalog(input.partyThreatCatalog);
  const binding = createEngineOptionEnvironmentBinding({
    format: 'engine-option-environment-v1',
    mode: 'revision_bound',
    familyPolicy,
    partyThreatCatalog,
  });
  return new RuntimeOfferEnvironment(binding);
}
