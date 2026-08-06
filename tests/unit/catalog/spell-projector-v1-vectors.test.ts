import { describe, expect, it } from 'vitest';
import type { NormalizedCatalogRecord } from '../../../src/catalog/catalog-normalize';
import { parseCatalogDocuments } from '../../../src/catalog/catalog-schema';
import {
  SpellContentProjectionError,
  projectSpellContentAggregateV1,
  projectSpellDocumentV1,
  type SpellProjectorPayloadV1,
} from '../../../src/catalog/spell-content-projector-v1';
import {
  canonicalOpenPassthroughValue,
  contentIdentitySet,
  deriveContentIdentityV1,
} from '../../../src/catalog/content-identity';
import {
  bandedSpellDocumentV1,
  spellProjectorV1Vectors,
} from './fixtures/spell-projector-v1-vectors';

function identity(payload: SpellProjectorPayloadV1) {
  return deriveContentIdentityV1({
    kind: 'spell',
    edition: 'expanded',
    name: 'Aether Lance',
    payload,
  });
}

describe('CI-3s-PRE spell content-v1 projector contracts', () => {
  it('CI-8 spell projector includes its load-bearing field', () => {
    const vector = spellProjectorV1Vectors[0]!;
    expect(projectSpellContentAggregateV1(vector.aggregate).payload)
      .toEqual(vector.payload);
  });

  it.each(spellProjectorV1Vectors)(
    'pins $label',
    ({ aggregate, payload, canonicalJson, sha256, derivedKey }) => {
      expect(projectSpellContentAggregateV1(aggregate).payload).toEqual(payload);
      const projected = deriveContentIdentityV1({
        kind: 'spell',
        edition: aggregate.rules_edition,
        name: aggregate.name,
        payload,
      });
      expect(projected.canonicalJson).toBe(canonicalJson);
      expect(projected.digest).toBe(sha256);
      expect(projected.derivedKey).toBe(derivedKey);
    },
  );

  it('document projection reproduces the hand-pinned D173 banded-upcast vector', () => {
    const identity = deriveContentIdentityV1({
      kind: 'spell', edition: bandedSpellDocumentV1.edition,
      name: bandedSpellDocumentV1.name,
      payload: projectSpellDocumentV1(bandedSpellDocumentV1).payload,
    });
    expect(identity.canonicalJson).toBe(spellProjectorV1Vectors[0]!.canonicalJson);
    expect(identity.digest).toBe(spellProjectorV1Vectors[0]!.sha256);
  });

  it.each([
    ['level and school', (payload: SpellProjectorPayloadV1) => ({ ...payload, level: 3 })],
    ['casting flags and action', (payload: SpellProjectorPayloadV1) => ({ ...payload, concentration: false })],
    ['range and area', (payload: SpellProjectorPayloadV1) => ({ ...payload, area_feet: 31 })],
    ['components and material cost', (payload: SpellProjectorPayloadV1) => ({ ...payload, material_cost_copper: 2501 })],
    ['effect behavior', (payload: SpellProjectorPayloadV1) => ({ ...payload, requires_mod_for_effect: false })],
    ['printed rule text', (payload: SpellProjectorPayloadV1) => ({ ...payload, duration: 'Instantaneous' as SpellProjectorPayloadV1['duration'] })],
    ['membership collections', (payload: SpellProjectorPayloadV1) => ({
      ...payload,
      spell_lists: contentIdentitySet([canonicalOpenPassthroughValue('Wizard')]),
    })],
    ['slot progression', (payload: SpellProjectorPayloadV1) => ({ ...payload, upcast_levels: contentIdentitySet([3]) })],
  ] as const)(
    'discriminates $0 mechanics',
    (_family, mutate) => {
      const baseline = spellProjectorV1Vectors[0]!.payload;
      expect(identity(mutate(baseline)).derivedKey).not.toBe(identity(baseline).derivedKey);
    },
  );

  it('spell concept membership discriminates identity', () => {
    const baseline = spellProjectorV1Vectors[0]!.payload;
    expect(identity({
      ...baseline,
      spell_identity_key: 'alternate-aether-lance',
    }).derivedKey).not.toBe(identity(baseline).derivedKey);
  });

  it('spell version stable key discriminates otherwise identical versions', () => {
    const baseline = projectSpellDocumentV1(bandedSpellDocumentV1);
    const alternate = projectSpellDocumentV1({
      ...bandedSpellDocumentV1,
      versionKey: 'expanded:alternate-aether-lance',
    });
    expect(identity(alternate.payload).derivedKey)
      .not.toBe(identity(baseline.payload).derivedKey);
  });

  it('refuses whitespace-padded document locators before identity derivation', () => {
    const base = projectSpellContentAggregateV1(spellProjectorV1Vectors[0]!.aggregate);
    const record = {
      identityKey: ' aether-lance', versionKey: 'expanded:aether-lance',
    } as NormalizedCatalogRecord;
    expect(() => projectSpellDocumentV1(record)).toThrow(SpellContentProjectionError);
    expect(base.payload).toEqual(spellProjectorV1Vectors[0]!.payload);
  });

  it('parses requiresModForEffect into the closed document semantic surface', () => {
    const parsed = parseCatalogDocuments([JSON.stringify([{
      identityKey: 'aether-lance', versionKey: 'expanded:aether-lance',
      name: 'Aether Lance', edition: 'expanded', level: 2,
      school: 'Chronomancy', castingTime: 'Action', range: 'Self',
      components: 'V', duration: 'Instantaneous', concentration: false,
      ritual: false, attackModes: [], saveAbilities: [], spellLists: [],
      sourceBooks: [], tags: [], requiresModForEffect: true,
    }])]).spells[0];
    expect(parsed?.requiresModForEffect).toBe(true);
    expect(() => parseCatalogDocuments([JSON.stringify([{
      identityKey: 'aether-lance', versionKey: 'expanded:aether-lance',
      name: 'Aether Lance', edition: 'expanded', level: 2,
      school: 'Chronomancy', castingTime: 'Action', range: 'Self',
      components: 'V', duration: 'Instantaneous', concentration: false,
      ritual: false, attackModes: [], saveAbilities: [], spellLists: [],
      sourceBooks: [], tags: [], requiresModForEffect: 'yes',
    }])])).toThrow("Catalog field 'requiresModForEffect' must be boolean.");
  });
});
