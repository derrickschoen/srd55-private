import { describe, expect, it } from 'vitest';
import { AUTHORED_PROJECTOR_INVENTORY_V1 } from '../../../src/catalog/authored-content-projector-contract-v1';
import {
  contentIdentitySequence,
  deriveContentIdentityV1,
} from '../../../src/catalog/content-identity';
import {
  authoredGrantSetV1Vectors,
  authoredProjectorV1Vectors,
} from './fixtures/authored-projector-v1-vectors';

describe('HA-1 authored content-v1 projector contracts', () => {
  it.each(authoredProjectorV1Vectors)(
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

  it.each(authoredGrantSetV1Vectors)(
    'pins grant-set convergence: $label',
    ({ name, payloads, canonicalJson, sha256, derivedKey }) => {
      const identities = payloads.map((payload) => deriveContentIdentityV1({
        kind: 'species',
        edition: 'expanded',
        name,
        payload,
      }));

      for (const identity of identities) {
        expect(identity.canonicalJson).toBe(canonicalJson);
        expect(identity.digest).toBe(sha256);
        expect(identity.derivedKey).toBe(derivedKey);
      }

      expect(identities[1]).toMatchObject({
        canonicalJson: identities[0]!.canonicalJson,
        digest: identities[0]!.digest,
        derivedKey: identities[0]!.derivedKey,
      });
    },
  );

  it('pins creation groups and the complete outbound closure vocabulary', () => {
    expect(AUTHORED_PROJECTOR_INVENTORY_V1).toEqual({
      species: {
        kind: 'species',
        ownedTables: [
          'species_definitions',
          'species_templates',
          'species_template_traits',
          'species_template_trait_effects',
        ],
        outboundReferenceRoles: ['grant.fixed_spell'],
      },
      background: {
        kind: 'background',
        ownedTables: [
          'background_definitions',
          'background_templates',
          'background_equipment_items',
          'background_template_effects',
        ],
        outboundReferenceRoles: [
          'background.default_origin_feat',
          'background.equipment.weapon',
          'background.equipment.armor',
        ],
      },
      subclass: {
        kind: 'subclass',
        ownedTables: [
          'subclass_definitions',
          'subclass_progressions',
          'subclass_features',
          'subclass_feature_effects',
        ],
        outboundReferenceRoles: [
          'grant.fixed_spell',
          'subclass.parent_class',
        ],
      },
    });
  });

  it('pins the override vector to one row for every level in order', () => {
    const override = authoredProjectorV1Vectors[3];
    expect(override.aggregate.progression.mode).toBe('override');
    if (override.aggregate.progression.mode !== 'override') {
      throw new Error('The hand-pinned vector must use override progression.');
    }
    expect(override.aggregate.progression.rows.map((row) => row.class_level))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('definition grants discriminate subclass identity', () => {
    const granted = authoredProjectorV1Vectors[4];
    const withDefinitionGrant = deriveContentIdentityV1({
      kind: 'subclass',
      edition: granted.aggregate.rules_edition,
      name: granted.aggregate.name,
      payload: granted.payload,
    });
    const withoutDefinitionGrant = deriveContentIdentityV1({
      kind: 'subclass',
      edition: granted.aggregate.rules_edition,
      name: granted.aggregate.name,
      payload: {
        ...granted.payload,
        grants: contentIdentitySequence([]),
      },
    });

    expect(withDefinitionGrant.derivedKey)
      .not.toBe(withoutDefinitionGrant.derivedKey);
  });

  it('pins revised species and background grants while grant convergence stays unchanged', () => {
    expect([
      ...authoredProjectorV1Vectors.slice(0, 2),
      ...authoredGrantSetV1Vectors,
    ].map(({ sha256, derivedKey }) => ({ sha256, derivedKey }))).toEqual([
      {
        sha256: '15573f2b4dea6c5382d948d92a453fbaf6a921d3498204c1b50750a5bdfaa0f6',
        derivedKey: 'expanded:content.v1:15573f2b4dea6c5382d948d92a453fbaf6a921d3498204c1b50750a5bdfaa0f6',
      },
      {
        sha256: '3058f3f81adc279d26f7ceccb9576304db7a4dda564fe8bdac31893abcce2969',
        derivedKey: 'expanded:content.v1:3058f3f81adc279d26f7ceccb9576304db7a4dda564fe8bdac31893abcce2969',
      },
      {
        sha256: '99eb9b5e461081b98fe764cbc11d38b9d0d17c0344d306333b62089380da23d7',
        derivedKey: 'expanded:content.v1:99eb9b5e461081b98fe764cbc11d38b9d0d17c0344d306333b62089380da23d7',
      },
      {
        sha256: '9e313559ef745814f28746d2c6d6d2969dd8ff380f461ecce55d0d70536d28af',
        derivedKey: 'expanded:content.v1:9e313559ef745814f28746d2c6d6d2969dd8ff380f461ecce55d0d70536d28af',
      },
    ]);
  });
});
