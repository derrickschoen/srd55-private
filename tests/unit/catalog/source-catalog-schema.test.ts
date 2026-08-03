import { describe, expect, it } from 'vitest';
import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
} from '../../../src/authoring/contracts';
import { parseCatalogDocuments } from '../../../src/catalog/catalog-schema';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { creatureSize, creatureType } from '../../../src/domain/enums';
import { classProjectorV1Vector } from './fixtures/source-projector-v1-vectors';

const digest = 'a'.repeat(64) as ContentFingerprintDigest;

function sourceDocument(kind: string, aggregate: object): string {
  return JSON.stringify([{ kind, aggregate }]);
}

function species(): SpeciesContentAggregate {
  return {
    kind: 'species',
    name: 'Boundary Folk',
    rules_edition: 'expanded',
    reference_text: '',
    repeatable: false,
    creature_type: creatureType('Humanoid'),
    primary_size: creatureSize('Medium'),
    alternate_size: null,
    walking_speed_feet: 10_000,
    grants: [],
    traits: [],
  };
}

function background(): BackgroundContentAggregate {
  return {
    kind: 'background',
    name: 'Boundary Watcher',
    rules_edition: 'expanded',
    reference_text: '',
    repeatable: false,
    grants: [],
    suggested_abilities: ['strength', 'wisdom', 'constitution'],
    default_origin_feat: { kind: 'feat', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest },
    skill_proficiencies: ['athletics', 'perception'],
    tool_reference_text: null,
    equipment_option_a_description: 'A',
    equipment_option_b_description: 'B',
    equipment_option_a: [],
    equipment_option_b: [],
    effects: [],
  };
}

describe('class and origin catalog DTO bounds', () => {
  it('refuses unknown fields at record, aggregate, child, effect, and grant levels', () => {
    const cases = [
      { kind: 'species', aggregate: species(), future_root: true },
      { kind: 'species', aggregate: { ...species(), future_aggregate: true } },
      { kind: 'species', aggregate: { ...species(), traits: [{
        sort_order: 1, name: 'Known', description: 'Known', effects: [], future_trait: true,
      }] } },
      { kind: 'species', aggregate: { ...species(), traits: [{
        sort_order: 1, name: 'Known', description: 'Known', effects: [{
          kind: 'speed', sort_order: 1, label: 'Known', notes: null,
          speed_bonus_feet: 5, future_effect: true,
        }],
      }] } },
      { kind: 'species', aggregate: { ...species(), grants: [{
        kind: 'skill_proficiency', rule_key: 'known', count: 1,
        skills: ['arcana'], future_grant: true,
      }] } },
      { kind: 'class', aggregate: {
        ...classProjectorV1Vector.aggregate,
        resources: [{ class_level: 1, resource_kind: 'rage', maximum: 2, future_row: true }],
      } },
    ];
    for (const value of cases) {
      expect(() => parseCatalogDocuments([JSON.stringify([value])])).toThrow(/unknown|not valid/);
    }
  });

  it('accepts class numeric and text boundaries and refuses the next value', () => {
    const progression = {
      class_level: 1, cantrips_known: 1_000, prepared_count: 1_000,
      slots: null, pact_slots: null, grant_rules: [],
    };
    const atBoundary = {
      ...classProjectorV1Vector.aggregate,
      notes: 'n'.repeat(4_000),
      progressions: [progression],
    };
    expect(parseCatalogDocuments([sourceDocument('class', atBoundary)]).classes).toHaveLength(1);
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...atBoundary,
      progressions: [{ ...progression, cantrips_known: 1_001 }],
    })])).toThrow(/cantrips_known/);
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...atBoundary, notes: 'n'.repeat(4_001),
    })])).toThrow(/aggregate.notes/);
  });

  it('accepts the 20-row class progression boundary and refuses row 21', () => {
    const progressions = Array.from({ length: 20 }, (_, index) => ({
      class_level: index + 1,
      cantrips_known: 0,
      prepared_count: 0,
      slots: null,
      pact_slots: null,
      grant_rules: [],
    }));
    expect(parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate, progressions,
    })]).classes).toHaveLength(1);
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate,
      progressions: [...progressions, progressions[19]],
    })])).toThrow(/at most 20 entries/);
  });

  it('accepts species speed 10000 and refuses 10001 from the shared authoring limit', () => {
    expect(parseCatalogDocuments([sourceDocument('species', species())]).species).toHaveLength(1);
    expect(() => parseCatalogDocuments([sourceDocument('species', {
      ...species(), walking_speed_feet: 10_001,
    })])).toThrow(/walking_speed_feet/);
  });

  it('refuses an origin effect magnitude 1001 at the catalog boundary', () => {
    expect(() => parseCatalogDocuments([sourceDocument('species', {
      ...species(),
      traits: [{
        sort_order: 1,
        name: 'Too fast',
        description: 'No.',
        effects: [{
          kind: 'speed', sort_order: 1, label: 'Too fast', notes: null,
          speed_bonus_feet: 1_001,
        }],
      }],
    })])).toThrow(/speed_bonus_feet/);
  });

  it('refuses background equipment quantity zero', () => {
    expect(() => parseCatalogDocuments([sourceDocument('background', {
      ...background(),
      equipment_option_a: [{
        kind: 'gear', sort_order: 1, quantity: 0, printed_name: 'Nothing',
      }],
    })])).toThrow(/quantity/);
  });

  it('refuses a class progression grant with a whitespace-padded locator', () => {
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate,
      progressions: [{
        class_level: 1,
        cantrips_known: 0,
        prepared_count: 0,
        slots: null,
        pact_slots: null,
        grant_rules: [{
          kind: 'choice_from_list',
          rule_key: ' padded ',
          count: 1,
          list: 'Wizard',
          bucket: 'prepared',
          level_min: 1,
          level_max: 1,
          with_slots: true,
        }],
      }],
    })])).toThrow(/surrounding whitespace/);
  });

  it('refuses definition_key_config false before projection', () => {
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate,
      progressions: [{
        class_level: 1,
        cantrips_known: 0,
        prepared_count: 0,
        slots: null,
        pact_slots: null,
        grant_rules: [{
          kind: 'grant_source',
          rule_key: 'source',
          count: 1,
          source_type: 'feat',
          definition_key_config: false,
        }],
      }],
    })])).toThrow(/definition_key_config/);
  });

  it('refuses every whitespace-padded runtime config-path locator', () => {
    for (const field of [
      'definition_key_config', 'child_config_config', 'distinct_config_by',
    ] as const) {
      expect(() => parseCatalogDocuments([sourceDocument('class', {
        ...classProjectorV1Vector.aggregate,
        progressions: [{
          class_level: 1, cantrips_known: 0, prepared_count: 0,
          slots: null, pact_slots: null,
          grant_rules: [{
            kind: 'grant_source', rule_key: 'source', count: 1,
            source_type: 'feat', definition_key_config: 'definition',
            [field]: ' padded ',
          }],
        }],
      })])).toThrow(/surrounding whitespace/);
    }
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate,
      progressions: [{
        class_level: 1, cantrips_known: 0, prepared_count: 0,
        slots: null, pact_slots: null,
        grant_rules: [{
          kind: 'choice_from_list', rule_key: 'choice', count: 1,
          list: 'Wizard', bucket: 'prepared',
          active_if_config: { key: ' padded ', equals: 'yes' },
        }],
      }],
    })])).toThrow(/surrounding whitespace/);
  });

  it('refuses a store-local grant id instead of hashing it', () => {
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate,
      progressions: [{
        class_level: 1,
        cantrips_known: 0,
        prepared_count: 0,
        slots: null,
        pact_slots: null,
        grant_rules: [{
          kind: 'fixed_spell',
          rule_key: 'local-id',
          count: 1,
          spell_version_id: 42,
          bucket: 'prepared',
        }],
      }],
    })])).toThrow(/store-local/);
  });

  it('refuses a source fingerprint whose kind disagrees with source_type', () => {
    expect(() => parseCatalogDocuments([sourceDocument('class', {
      ...classProjectorV1Vector.aggregate,
      progressions: [{
        class_level: 1,
        cantrips_known: 0,
        prepared_count: 0,
        slots: null,
        pact_slots: null,
        grant_rules: [{
          kind: 'grant_source',
          rule_key: 'wrong-source-kind',
          count: 1,
          source_type: 'feat',
          source_definition: {
            kind: 'species', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest,
          },
        }],
      }],
    })])).toThrow(/must match source_type/);
  });
});
