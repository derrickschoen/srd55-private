import { describe, expect, it } from 'vitest';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  contentIdentitySequence,
  deriveContentIdentityV1,
} from '../../../src/catalog/content-identity';
import { projectAuthoredContentAggregateV1 } from '../../../src/catalog/stored-authored-content-projector-v1';
import { authoredProjectorV1Vectors } from './fixtures/authored-projector-v1-vectors';
import { speciesTemplateOnlyV1Vectors } from './fixtures/species-template-only-v1-vectors';

describe('CI-3s-PRE template-only species content-v1 state', () => {
  it.each(speciesTemplateOnlyV1Vectors)(
    'pins $label',
    ({ aggregate, payload, canonicalJson, sha256, derivedKey }) => {
      const projection = projectAuthoredContentAggregateV1(aggregate);
      const identity = deriveContentIdentityV1({
        kind: 'species', edition: aggregate.rules_edition,
        name: aggregate.name, payload: projection.payload,
      });
      expect(projection.payload).toEqual(payload);
      expect(identity.canonicalJson).toBe(canonicalJson);
      expect(identity.digest).toBe(sha256);
      expect(identity.derivedKey).toBe(derivedKey);
    },
  );

  it('template-only and two-half species with identical template bytes have different identities', () => {
    const template = speciesTemplateOnlyV1Vectors[0]!;
    const templateIdentity = deriveContentIdentityV1({
      kind: 'species', edition: '2024', name: 'Dwarf', payload: template.payload,
    });
    const pairedIdentity = deriveContentIdentityV1({
      kind: 'species', edition: '2024', name: 'Dwarf',
      payload: {
        reference_text: canonicalRuleText(''), repeatable: false,
        grants: contentIdentitySequence([]),
        creature_type: canonicalOpenPassthroughValue('Humanoid'),
        primary_size: canonicalOpenPassthroughValue('Medium'),
        alternate_size: null, walking_speed_feet: 30,
        traits: contentIdentitySequence([]),
      },
    });
    expect(templateIdentity.derivedKey).not.toBe(pairedIdentity.derivedKey);
  });

  it('keeps every frozen full two-half species vector digest byte-identical', () => {
    expect(authoredProjectorV1Vectors
      .filter((vector) => vector.kind === 'species')
      .map((vector) => vector.sha256))
      .toEqual([
        'e7c9c480129d6d8e8889dac55e48dc9f5ed720057d14e3999e78c4d08d26427e',
        '6232b70f5913c9c871e7d52e8244d776fca95c626880cba342aece293466efa9',
      ]);
  });
});
