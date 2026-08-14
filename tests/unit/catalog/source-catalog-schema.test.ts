import { describe, expect, it } from 'vitest';
import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
} from '../../../src/authoring/contracts';
import { parseCatalogDocuments } from '../../../src/catalog/catalog-schema';
import { parseSourceCatalogRecord } from '../../../src/catalog/source-catalog-records';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { projectClassContentV1 } from '../../../src/catalog/source-content-projector-v1';
import { creatureSize, creatureType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  classProjectorV1Vector,
  featProjectorV1Vector,
} from './fixtures/source-projector-v1-vectors';

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
    default_origin_feat_content_key: 'expanded:feat:fixture' as ContentKey,
    default_origin_feat: { kind: 'feat', scheme: CONTENT_FINGERPRINT_SCHEME_V1, digest },
    default_origin_feat_display_name: 'Fixture Feat (Cleric)',
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
  it('runtime-validates every class aggregate root field instead of asserting its contract type', () => {
    const invalidFields: readonly (readonly [string, unknown])[] = [
      ['kind', 'feat'],
      ['name', false],
      ['rules_edition', 'future'],
      ['spellcasting_ability', 1],
      ['progression_type', 1],
      ['caster_fraction', 1],
      ['caster_rounding', 1],
      ['prepares_or_knows', 1],
      ['supports_ritual_casting', 1],
      ['ritual_casting_mode', 1],
      ['primary_ability_expression', 1],
      ['notes', 1],
      ['progressions', {}],
      ['sheet_traits', []],
      ['saving_throw_proficiencies', {}],
      ['skill_options', {}],
      ['armor_training', {}],
      ['weapon_proficiencies', {}],
      ['extra_attack_grants', {}],
      ['martial_arts_dice', {}],
      ['weapon_mastery_grants', {}],
      ['weapon_mastery_counts', {}],
      ['equipment_items', {}],
      ['resources', {}],
      ['resource_formulas', {}],
      ['feature_effects', {}],
      ['feature_value_contributions', {}],
      ['named_features', {}],
      ['stored_fields', {}],
    ];
    for (const [field, invalid] of invalidFields) {
      expect(
        () => parseSourceCatalogRecord('class', {
          kind: 'class',
          aggregate: { ...classProjectorV1Vector.aggregate, [field]: invalid },
        }),
        field,
      ).toThrow();
    }
  });

  it('runtime-validates every feat aggregate root field instead of asserting its contract type', () => {
    const invalidFields: readonly (readonly [string, unknown])[] = [
      ['kind', 'class'],
      ['name', false],
      ['rules_edition', 'future'],
      ['category', 1],
      ['min_level', '1'],
      ['ability_points', '0'],
      ['ability_increase_abilities', []],
      ['ability_increase_maximum', '20'],
      ['repeatable', 0],
      ['prerequisites', {}],
      ['grants', {}],
      ['notes', false],
      ['stored_fields', {}],
    ];
    for (const [field, invalid] of invalidFields) {
      expect(
        () => parseSourceCatalogRecord('feat', {
          kind: 'feat',
          aggregate: { ...featProjectorV1Vector.aggregate, [field]: invalid },
        }),
        field,
      ).toThrow();
    }
  });

  it('retains optional class contribution rows while explicitly refusing stored-only fields', () => {
    const contribution = {
      kind: 'feature_value_contribution',
      contribution_key: 'fixture',
      label: 'Fixture contribution',
      target_kind: 'feature_dice_count',
      target_key: 'sneak_attack',
      op: 'add',
      active_from_level: 1,
      active_to_level: 20,
      value: { kind: 'const', amount: 1 },
      supersedes_ref: null,
    };
    const parsed = parseSourceCatalogRecord('class', {
      kind: 'class',
      aggregate: {
        ...classProjectorV1Vector.aggregate,
        feature_value_contributions: [contribution],
      },
    });
    expect(parsed.aggregate.feature_value_contributions).toEqual([contribution]);
    const baselineIdentity = deriveContentIdentityV1({
      kind: 'class',
      edition: classProjectorV1Vector.aggregate.rules_edition,
      name: classProjectorV1Vector.aggregate.name,
      payload: projectClassContentV1(classProjectorV1Vector.aggregate),
    });
    const contributionIdentity = deriveContentIdentityV1({
      kind: 'class',
      edition: parsed.aggregate.rules_edition,
      name: parsed.aggregate.name,
      payload: projectClassContentV1(parsed.aggregate),
    });
    expect(contributionIdentity.derivedKey).not.toBe(baselineIdentity.derivedKey);
    expect(() => parseSourceCatalogRecord('class', {
      kind: 'class',
      aggregate: {
        ...classProjectorV1Vector.aggregate,
        feature_value_contributions: [{
          ...contribution,
          value: { kind: 'const', amount: Number.POSITIVE_INFINITY },
        }],
      },
    })).toThrow(/value/);
    expect(() => parseSourceCatalogRecord('class', {
      kind: 'class',
      aggregate: { ...classProjectorV1Vector.aggregate, stored_fields: {} },
    })).toThrow(/stored-only/);
    expect(() => parseSourceCatalogRecord('feat', {
      kind: 'feat',
      aggregate: { ...featProjectorV1Vector.aggregate, stored_fields: {} },
    })).toThrow(/stored-only/);
  });

  it('refuses malformed class contribution rows at the catalog boundary', () => {
    const validContribution = {
      kind: 'feature_value_contribution',
      contribution_key: 'fixture',
      label: 'Fixture contribution',
      target_kind: 'feature_dice_count',
      target_key: 'sneak_attack',
      op: 'add',
      active_from_level: 1,
      active_to_level: 20,
      value: { kind: 'const', amount: 1 },
      supersedes_ref: null,
    };
    const malformedRows: readonly unknown[] = [
      {},
      { kind: 'wrong' },
      { ...validContribution, label: false, target_kind: 'not_real' },
      { ...validContribution, contribution_key: '' },
      { ...validContribution, target_key: 'not_real' },
      { ...validContribution, op: 'multiply' },
      { ...validContribution, active_from_level: 0 },
      { ...validContribution, active_to_level: 99 },
      { ...validContribution, active_from_level: 10, active_to_level: 9 },
      { ...validContribution, value: { kind: 'const', amount: 1_001 } },
      { ...validContribution, value: { kind: 'wrong' } },
      { ...validContribution, supersedes_ref: {} },
      { ...validContribution, supersedes_ref: {
        content_key: 'expanded:class:fixture', contribution_key: '',
      } },
      { ...validContribution, resource_display_label: 'Not applicable' },
    ];
    for (const malformed of malformedRows) {
      expect(() => parseSourceCatalogRecord('class', {
        kind: 'class',
        aggregate: {
          ...classProjectorV1Vector.aggregate,
          feature_value_contributions: [malformed],
        },
      }), JSON.stringify(malformed)).toThrow();
    }
  });

  it('accepts both complete class contribution target arms', () => {
    const contributions = [{
      kind: 'feature_value_contribution',
      contribution_key: 'fixture-dice',
      label: 'Fixture dice',
      target_kind: 'feature_dice_count',
      target_key: 'sneak_attack',
      op: 'add',
      active_from_level: 1,
      active_to_level: 20,
      value: { kind: 'const', amount: 1 },
      supersedes_ref: null,
    }, {
      kind: 'feature_value_contribution',
      contribution_key: 'fixture-resource',
      label: 'Fixture resource',
      target_kind: 'resource_maximum',
      target_key: 'expanded:class:fixture\u0000fixture-resource',
      op: 'add',
      active_from_level: 3,
      active_to_level: 20,
      value: {
        kind: 'scale',
        source: { kind: 'proficiency_bonus' },
        multiply: 2,
        round: 'floor',
      },
      supersedes_ref: {
        content_key: 'expanded:class:fixture',
        contribution_key: 'prior-resource',
      },
      resource_display_label: 'Fixture points',
      resource_marking_shape: 'remaining',
    }];
    const parsed = parseSourceCatalogRecord('class', {
      kind: 'class',
      aggregate: {
        ...classProjectorV1Vector.aggregate,
        feature_value_contributions: contributions,
      },
    });
    expect(parsed.aggregate.feature_value_contributions).toEqual(contributions);
  });

  it('accepts every stored value-expression arm through the class catalog boundary', () => {
    const values = [
      { kind: 'const', amount: -1_000 },
      { kind: 'ref', source: { kind: 'ability_modifier', ability: 'wisdom' } },
      {
        kind: 'scale',
        source: { kind: 'proficiency_bonus' },
        divide: 2,
        round: 'ceiling',
      },
      {
        kind: 'table',
        level_source: { kind: 'class_level', class_content_key: 'expanded:class:fixture' },
        rows: [{ from: 1, to: 20, amount: 1_000 }],
      },
      {
        kind: 'piecewise',
        level_source: { kind: 'character_level' },
        segments: [{ from: 1, to: 20, value: { kind: 'const', amount: 1 } }],
      },
      { kind: 'sum', terms: [{ kind: 'const', amount: 1 }] },
      {
        kind: 'clamp',
        value: { kind: 'ref', source: { kind: 'character_level' } },
        minimum: { kind: 'const', amount: 1 },
        maximum: { kind: 'const', amount: 20 },
      },
    ];
    for (const [index, value] of values.entries()) {
      expect(() => parseSourceCatalogRecord('class', {
        kind: 'class',
        aggregate: {
          ...classProjectorV1Vector.aggregate,
          feature_value_contributions: [{
            kind: 'feature_value_contribution',
            contribution_key: `fixture-${String(index)}`,
            label: 'Fixture contribution',
            target_kind: 'feature_dice_count',
            target_key: 'sneak_attack',
            op: 'add',
            active_from_level: 1,
            active_to_level: 20,
            value,
            supersedes_ref: null,
          }],
        },
      }), JSON.stringify(value)).not.toThrow();
    }
  });

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
