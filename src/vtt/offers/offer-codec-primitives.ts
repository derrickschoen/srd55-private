import { canonicalJson } from '../../commands/canonical-json';
import { sha256 } from '../../crypto/sha256';

export const ENGINE_OPTION_ENVIRONMENT_FORMAT = 'engine-option-environment-v1';
export const ENGINE_OFFER_FAMILY_POLICY_FORMAT = 'engine-offer-family-policy-v1';
export const PARTY_THREAT_CATALOG_FORMAT = 'party-threat-catalog-v1';

export function digestBody(value: object): string {
  return sha256(canonicalJson(value));
}

export function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }
  return Object.freeze(value);
}

export function exactKeys(value: object, keys: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has an invalid shape.`);
  }
}
