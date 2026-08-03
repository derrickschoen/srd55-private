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
        outboundReferenceRoles: [
          'grant.fixed_spell',
          'grant.source_definition',
        ],
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
          'grant.source_definition',
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
          'grant.source_definition',
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

  it('pins generic grant and repeatable surgery digests', () => {
    expect([
      authoredProjectorV1Vectors[0],
      authoredProjectorV1Vectors[1],
      authoredProjectorV1Vectors[4],
      authoredProjectorV1Vectors[5],
      ...authoredGrantSetV1Vectors,
    ].map(({ sha256, derivedKey }) => ({ sha256, derivedKey }))).toEqual([
      {
        sha256: 'e7c9c480129d6d8e8889dac55e48dc9f5ed720057d14e3999e78c4d08d26427e',
        derivedKey: 'expanded:content.v1:e7c9c480129d6d8e8889dac55e48dc9f5ed720057d14e3999e78c4d08d26427e',
      },
      {
        sha256: '15ff580a3544fe808e86d862306a064fe3237d7e999d2707acda4135c2ff9584',
        derivedKey: 'expanded:content.v1:15ff580a3544fe808e86d862306a064fe3237d7e999d2707acda4135c2ff9584',
      },
      {
        sha256: '47b18e8ffe968ed978cf2b9da087216e90d8724210f67a71e711cfae0167c255',
        derivedKey: 'expanded:content.v1:47b18e8ffe968ed978cf2b9da087216e90d8724210f67a71e711cfae0167c255',
      },
      {
        sha256: '6232b70f5913c9c871e7d52e8244d776fca95c626880cba342aece293466efa9',
        derivedKey: 'expanded:content.v1:6232b70f5913c9c871e7d52e8244d776fca95c626880cba342aece293466efa9',
      },
      {
        sha256: '2bcfbab57de3f1947b6e561d337ad41a3937571dd190ca287dd0ff5898835245',
        derivedKey: 'expanded:content.v1:2bcfbab57de3f1947b6e561d337ad41a3937571dd190ca287dd0ff5898835245',
      },
      {
        sha256: '035f9bbc5106c2cb361c571b44bb9fd5c254a6ac9bdd92ebac5ac8b75e1bdaa4',
        derivedKey: 'expanded:content.v1:035f9bbc5106c2cb361c571b44bb9fd5c254a6ac9bdd92ebac5ac8b75e1bdaa4',
      },
    ]);
  });

  it('keeps grant-free subclass and extra-attack-note vector bytes unchanged', () => {
    expect([
      authoredProjectorV1Vectors[2].sha256,
      authoredProjectorV1Vectors[3].sha256,
      authoredProjectorV1Vectors[6].sha256,
    ]).toEqual([
      '0ce55acab6397caea551c266261b93d9a78e1246223fb5ca179d22dc4eaf093e',
      '49306511d4dd5f33d04301c7d5035dcd1a60fa0ba063d1d20d05ee2ae784c01f',
      'f1b7fb7a4e0214818258b11e66b9bc9845c3f2b146cfd9887a889302b3b7860e',
    ]);
  });
});
