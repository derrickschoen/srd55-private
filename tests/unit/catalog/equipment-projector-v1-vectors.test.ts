import { describe, expect, it } from 'vitest';
import {
  contentIdentitySequence,
  deriveContentIdentityV1,
} from '../../../src/catalog/content-identity';
import { equipmentProjectorV1Vectors } from './fixtures/equipment-projector-v1-vectors';

describe('CI-3c equipment content-v1 vectors', () => {
  it.each(equipmentProjectorV1Vectors)(
    'pins $label',
    ({ aggregate, kind, payload, canonicalJson, sha256, derivedKey }) => {
      const identity = deriveContentIdentityV1({
        kind,
        edition: aggregate.rules_edition,
        name: aggregate.name,
        payload,
      });

      expect(identity.canonicalJson).toBe(canonicalJson);
      expect(identity.digest).toBe(sha256);
      expect(identity.derivedKey).toBe(derivedKey);
    },
  );

  it('item identity excludes quantity and slots but requires attunement discriminates', () => {
    const vector = equipmentProjectorV1Vectors[2];
    const baseline = deriveContentIdentityV1({
      kind: vector.kind,
      edition: vector.aggregate.rules_edition,
      name: vector.aggregate.name,
      payload: vector.payload,
    });
    const changed = deriveContentIdentityV1({
      kind: vector.kind,
      edition: vector.aggregate.rules_edition,
      name: vector.aggregate.name,
      payload: { ...vector.payload, requires_attunement: false },
    });

    expect(Object.keys(vector.payload)).not.toContain('quantity');
    expect(Object.keys(vector.payload)).not.toContain('attunement_slots');
    expect(changed.derivedKey).not.toBe(baseline.derivedKey);
  });

  it('removing the D83 definition effect changes item identity', () => {
    const vector = equipmentProjectorV1Vectors[2];
    const withEffect = deriveContentIdentityV1({
      kind: vector.kind,
      edition: vector.aggregate.rules_edition,
      name: vector.aggregate.name,
      payload: vector.payload,
    });
    const withoutEffect = deriveContentIdentityV1({
      kind: vector.kind,
      edition: vector.aggregate.rules_edition,
      name: vector.aggregate.name,
      payload: { ...vector.payload, effects: contentIdentitySequence([]) },
    });

    expect(withoutEffect.derivedKey).not.toBe(withEffect.derivedKey);
  });
});
