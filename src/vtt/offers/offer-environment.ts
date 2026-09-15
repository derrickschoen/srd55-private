import {
  deepFreeze,
  digestBody,
  ENGINE_OFFER_FAMILY_POLICY_FORMAT,
  ENGINE_OPTION_ENVIRONMENT_FORMAT,
  exactKeys,
} from './offer-codec-primitives';
import {
  createUnrepresentedPartyThreatCatalog,
  decodePartyThreatCatalog,
  type PartyThreatCatalog,
} from './party-threat-catalog';

export interface EngineOfferFamilyPolicyBody {
  readonly format: typeof ENGINE_OFFER_FAMILY_POLICY_FORMAT;
  readonly helpAttack: 'disabled' | 'enabled';
  readonly readyAttack: 'disabled' | 'enabled';
  readonly unarmedControl: 'disabled' | 'enabled';
  readonly reposition: 'disabled' | 'enabled';
}

export type EngineOfferFamilyPolicy = EngineOfferFamilyPolicyBody & { readonly digest: string };

export interface EngineOptionEnvironmentBindingBody {
  readonly format: typeof ENGINE_OPTION_ENVIRONMENT_FORMAT;
  readonly mode: 'legacy_standard' | 'revision_bound';
  readonly familyPolicy: EngineOfferFamilyPolicy;
  readonly partyThreatCatalog: PartyThreatCatalog;
}

export type EngineOptionEnvironmentBinding = EngineOptionEnvironmentBindingBody & { readonly digest: string };

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function familyMode(value: unknown): EngineOfferFamilyPolicyBody['helpAttack'] | null {
  return value === 'disabled' || value === 'enabled' ? value : null;
}

export function decodeEngineOfferFamilyPolicy(value: unknown): EngineOfferFamilyPolicy {
  const policy = record(value, 'engine offer family policy');
  exactKeys(
    policy,
    ['format', 'helpAttack', 'readyAttack', 'unarmedControl', 'reposition', 'digest'],
    'engine offer family policy',
  );
  const helpAttack = familyMode(policy['helpAttack']);
  const readyAttack = familyMode(policy['readyAttack']);
  const unarmedControl = familyMode(policy['unarmedControl']);
  const reposition = familyMode(policy['reposition']);
  if (policy['format'] !== ENGINE_OFFER_FAMILY_POLICY_FORMAT ||
    helpAttack === null || readyAttack === null || unarmedControl === null || reposition === null ||
    typeof policy['digest'] !== 'string' || !/^[0-9a-f]{64}$/u.test(policy['digest'])) {
    throw new TypeError('Engine offer family policy is invalid.');
  }
  const body: EngineOfferFamilyPolicyBody = {
    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
    helpAttack,
    readyAttack,
    unarmedControl,
    reposition,
  };
  if (policy['digest'] !== digestBody(body)) {
    throw new TypeError('Engine offer family policy digest is invalid.');
  }
  return deepFreeze({ ...body, digest: policy['digest'] });
}

export function createEngineOfferFamilyPolicy(body: EngineOfferFamilyPolicyBody): EngineOfferFamilyPolicy {
  return decodeEngineOfferFamilyPolicy({ ...structuredClone(body), digest: digestBody(body) });
}

export function createDisabledEngineOfferFamilyPolicy(): EngineOfferFamilyPolicy {
  return createEngineOfferFamilyPolicy({
    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
    helpAttack: 'disabled',
    readyAttack: 'disabled',
    unarmedControl: 'disabled',
    reposition: 'disabled',
  });
}

export function decodeEngineOptionEnvironmentBinding(value: unknown): EngineOptionEnvironmentBinding {
  const binding = record(value, 'engine option environment binding');
  exactKeys(
    binding,
    ['format', 'mode', 'familyPolicy', 'partyThreatCatalog', 'digest'],
    'engine option environment binding',
  );
  if (binding['format'] !== ENGINE_OPTION_ENVIRONMENT_FORMAT ||
    (binding['mode'] !== 'legacy_standard' && binding['mode'] !== 'revision_bound') ||
    typeof binding['digest'] !== 'string' || !/^[0-9a-f]{64}$/u.test(binding['digest'])) {
    throw new TypeError('Engine option environment binding header is invalid.');
  }
  const familyPolicy = decodeEngineOfferFamilyPolicy(binding['familyPolicy']);
  const partyThreatCatalog = decodePartyThreatCatalog(binding['partyThreatCatalog']);
  const body: EngineOptionEnvironmentBindingBody = {
    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
    mode: binding['mode'],
    familyPolicy,
    partyThreatCatalog,
  };
  if (body.mode === 'legacy_standard' &&
    (body.familyPolicy.helpAttack !== 'disabled' || body.familyPolicy.readyAttack !== 'disabled' ||
      body.familyPolicy.unarmedControl !== 'disabled' || body.familyPolicy.reposition !== 'disabled' ||
      body.partyThreatCatalog.representation !== 'unrepresented')) {
    throw new TypeError('Legacy standard mode requires disabled families and an unrepresented party threat catalog.');
  }
  if (binding['digest'] !== digestBody(body)) {
    throw new TypeError('Engine option environment binding digest is invalid.');
  }
  return deepFreeze({ ...body, digest: binding['digest'] });
}

export function createEngineOptionEnvironmentBinding(
  body: EngineOptionEnvironmentBindingBody,
): EngineOptionEnvironmentBinding {
  return decodeEngineOptionEnvironmentBinding({ ...structuredClone(body), digest: digestBody(body) });
}

export function createLegacyEngineOptionEnvironmentBinding(): EngineOptionEnvironmentBinding {
  return createEngineOptionEnvironmentBinding({
    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
    mode: 'legacy_standard',
    familyPolicy: createDisabledEngineOfferFamilyPolicy(),
    partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
  });
}
