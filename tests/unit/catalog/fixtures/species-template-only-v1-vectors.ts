import type {
  SpeciesTemplateOnlyAggregateV1,
  SpeciesTemplateOnlyProjectorPayloadV1,
} from '../../../../src/catalog/authored-content-projector-contract-v1';
import {
  canonicalOpenPassthroughValue,
  contentIdentitySequence,
} from '../../../../src/catalog/content-identity';
import { creatureType } from '../../../../src/domain/enums';

interface TemplateOnlyVectorV1 {
  readonly label: string;
  readonly aggregate: SpeciesTemplateOnlyAggregateV1;
  readonly payload: SpeciesTemplateOnlyProjectorPayloadV1;
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly derivedKey: string;
}

export const speciesTemplateOnlyV1Vectors: readonly TemplateOnlyVectorV1[] = [
  {
    label: 'template-only Dwarf state',
    aggregate: {
      kind: 'species', definition_state: 'template_only', name: 'Dwarf',
      rules_edition: '2024', creature_type: creatureType('Humanoid'),
      primary_size: 'Medium', alternate_size: null, walking_speed_feet: 30,
      traits: [],
    },
    payload: {
      definition_state: 'template_only',
      creature_type: canonicalOpenPassthroughValue('Humanoid'),
      primary_size: canonicalOpenPassthroughValue('Medium'),
      alternate_size: null,
      walking_speed_feet: 30,
      traits: contentIdentitySequence([]),
    },
    canonicalJson: '{"edition":"2024","kind":"species","normalizedName":"dwarf","payload":{"alternate_size":null,"creature_type":"Humanoid","definition_state":"template_only","primary_size":"Medium","traits":[],"walking_speed_feet":30},"scheme":"content-v1"}',
    sha256: '4c6b07fb2afb0bec28ae8c9ef7f54739d34ea2b7727de4bb4d3484f09c86d184',
    derivedKey: '2024:content.v1:4c6b07fb2afb0bec28ae8c9ef7f54739d34ea2b7727de4bb4d3484f09c86d184',
  },
  {
    label: 'template-only Orc alternate-size state',
    aggregate: {
      kind: 'species', definition_state: 'template_only', name: 'Orc',
      rules_edition: '2024', creature_type: creatureType('Fey-Blooded Humanoid'),
      primary_size: 'Medium', alternate_size: 'Small', walking_speed_feet: 30,
      traits: [],
    },
    payload: {
      definition_state: 'template_only',
      creature_type: canonicalOpenPassthroughValue('Fey-Blooded Humanoid'),
      primary_size: canonicalOpenPassthroughValue('Medium'),
      alternate_size: canonicalOpenPassthroughValue('Small'),
      walking_speed_feet: 30,
      traits: contentIdentitySequence([]),
    },
    canonicalJson: '{"edition":"2024","kind":"species","normalizedName":"orc","payload":{"alternate_size":"Small","creature_type":"Fey-Blooded Humanoid","definition_state":"template_only","primary_size":"Medium","traits":[],"walking_speed_feet":30},"scheme":"content-v1"}',
    sha256: '658f09f59fd56122abcb20354fed26b3e78270a82c01037923d136bcc586aed7',
    derivedKey: '2024:content.v1:658f09f59fd56122abcb20354fed26b3e78270a82c01037923d136bcc586aed7',
  },
];
