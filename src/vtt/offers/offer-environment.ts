import { canonicalJson } from '../../commands/canonical-json';
import { sha256 } from '../../crypto/sha256';
import type { EngineQueryPort } from '../engine-query-port';
import { buildOfferEnvironment } from './build-offer-environment';
import {
  createUnrepresentedPartyThreatCatalog,
  decodePartyThreatCatalog,
  type PartyThreatCatalog,
} from './party-threat-catalog';

export interface EngineOfferFamilyPolicyBody {
  readonly format: 'engine-offer-family-policy-v1';
  readonly helpAttack: 'disabled' | 'enabled';
  readonly readyAttack: 'disabled' | 'enabled';
  readonly unarmedControl: 'disabled' | 'enabled';
  readonly reposition: 'disabled' | 'enabled';
}

export type EngineOfferFamilyPolicy = EngineOfferFamilyPolicyBody & { readonly digest: string };

export interface EngineOptionEnvironmentBindingBody {
  readonly format: 'engine-option-environment-v1';
  readonly mode: 'legacy_standard' | 'revision_bound';
  readonly familyPolicy: EngineOfferFamilyPolicy;
  readonly partyThreatCatalog: PartyThreatCatalog;
}

export type EngineOptionEnvironmentBinding = EngineOptionEnvironmentBindingBody & { readonly digest: string };

export interface EngineOptionEnvironment {
  readonly queries: EngineQueryPort;
  readonly familyPolicy: EngineOfferFamilyPolicy;
  readonly partyThreatCatalog: PartyThreatCatalog;
  readonly binding: EngineOptionEnvironmentBinding;
  readonly digest: string;
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has an invalid shape.`);
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function digestBody(value: object): string {
  return sha256(canonicalJson(value));
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
  if (policy['format'] !== 'engine-offer-family-policy-v1' ||
    helpAttack === null || readyAttack === null || unarmedControl === null || reposition === null ||
    typeof policy['digest'] !== 'string' || !/^[0-9a-f]{64}$/u.test(policy['digest'])) {
    throw new TypeError('Engine offer family policy is invalid.');
  }
  const body: EngineOfferFamilyPolicyBody = {
    format: 'engine-offer-family-policy-v1',
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
    format: 'engine-offer-family-policy-v1',
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
  if (binding['format'] !== 'engine-option-environment-v1' ||
    (binding['mode'] !== 'legacy_standard' && binding['mode'] !== 'revision_bound') ||
    typeof binding['digest'] !== 'string' || !/^[0-9a-f]{64}$/u.test(binding['digest'])) {
    throw new TypeError('Engine option environment binding header is invalid.');
  }
  const familyPolicy = decodeEngineOfferFamilyPolicy(binding['familyPolicy']);
  const partyThreatCatalog = decodePartyThreatCatalog(binding['partyThreatCatalog']);
  const body: EngineOptionEnvironmentBindingBody = {
    format: 'engine-option-environment-v1',
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

export function engineOptionEnvironmentFromBinding(
  _queries: EngineQueryPort,
  value: unknown,
): EngineOptionEnvironment {
  return buildOfferEnvironment({ kind: 'binding', binding: value });
}

export function createEngineOptionEnvironment(input: {
  readonly queries: EngineQueryPort;
  readonly mode: EngineOptionEnvironmentBindingBody['mode'];
  readonly familyPolicy: EngineOfferFamilyPolicy;
  readonly partyThreatCatalog: PartyThreatCatalog;
}): EngineOptionEnvironment {
  if (input.mode === 'legacy_standard') {
    const binding = createEngineOptionEnvironmentBinding({
      format: 'engine-option-environment-v1',
      mode: 'legacy_standard',
      familyPolicy: input.familyPolicy,
      partyThreatCatalog: input.partyThreatCatalog,
    });
    return buildOfferEnvironment({ kind: 'binding', binding });
  }
  return buildOfferEnvironment({
    kind: 'configuration',
    mode: 'revision_bound',
    familyPolicy: input.familyPolicy,
    partyThreatCatalog: input.partyThreatCatalog,
  });
}

export function createLegacyEngineOptionEnvironment(_queries: EngineQueryPort): EngineOptionEnvironment {
  return buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
}

export function createLegacyEngineOptionEnvironmentBinding(): EngineOptionEnvironmentBinding {
  return createEngineOptionEnvironmentBinding({
    format: 'engine-option-environment-v1',
    mode: 'legacy_standard',
    familyPolicy: createDisabledEngineOfferFamilyPolicy(),
    partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
  });
}

export function createRevisionBoundEngineOptionEnvironment(_queries: EngineQueryPort): EngineOptionEnvironment {
  return buildOfferEnvironment({
    kind: 'configuration',
    mode: 'revision_bound',
    familyPolicy: createDisabledEngineOfferFamilyPolicy(),
    partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
  });
}
