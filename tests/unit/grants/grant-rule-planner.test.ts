import { describe, expect, it } from 'vitest';
import { GrantRulePlanner } from '../../../src/grants/grant-rule-planner';
import type {
  ClassLevel,
  SourceInstanceId,
} from '../../../src/domain/ids';

describe('GrantRulePlanner', () => {
  const planner = new GrantRulePlanner();

  it('plans a normalized configured list without a feat-specific path', () => {
    const plan = planner.plan({
      source: { kind: 'selected_feat' },
      configured_rules: [
        {
          kind: 'choice_from_list',
          rule_key: 'magic-initiate-cantrip',
          count: 2,
          bucket: 'known',
          list: '$config.chosen_list',
          level_min: 0,
          level_max: 0,
        },
        {
          kind: 'choice_from_list',
          rule_key: 'magic-initiate-spell',
          count: 1,
          bucket: 'known',
          list: '$config.chosen_list',
          level_min: 1,
          level_max: 1,
        },
      ],
      config: { chosen_list: 'Wizard' },
      effective_class_level: null,
    });

    expect(plan).toHaveLength(3);
    expect(plan.map((grant) => grant.locator)).toEqual([
      {
        source: { kind: 'selected_feat' },
        rule_key: 'magic-initiate-cantrip',
        ordinal: 1,
      },
      {
        source: { kind: 'selected_feat' },
        rule_key: 'magic-initiate-cantrip',
        ordinal: 2,
      },
      {
        source: { kind: 'selected_feat' },
        rule_key: 'magic-initiate-spell',
        ordinal: 1,
      },
    ]);
    expect(plan.map((grant) => grant.constraint)).toEqual([
      expect.objectContaining({
        spell_level_min: 0,
        spell_level_max: 0,
        allowed_spell_lists: ['Wizard'],
      }),
      expect.objectContaining({
        spell_level_min: 0,
        spell_level_max: 0,
        allowed_spell_lists: ['Wizard'],
      }),
      expect.objectContaining({
        spell_level_min: 1,
        spell_level_max: 1,
        allowed_spell_lists: ['Wizard'],
      }),
    ]);
  });

  it('uses logical addresses and derives all Wizard acquisition levels', () => {
    const plan = planner.plan({
      source: {
        kind: 'existing_source',
        source_instance_id: 41 as SourceInstanceId,
      },
      configured_rules: [{
        kind: 'spellbook_acquisition',
        rule_key: 'wizard-spellbook',
        count: 10,
        initial_count: 6,
        count_per_level: 2,
        bucket: 'spellbook',
        list: 'Wizard',
        level_min: 1,
        level_max: 2,
      }],
      config: {},
      effective_class_level: 3 as ClassLevel,
    });

    expect(
      plan.map((grant) => ({
        locator: grant.locator,
        level:
          grant.kind === 'spellbook_acquisition'
            ? grant.acquired_at_class_level
            : null,
      })),
    ).toEqual(
      [1, 1, 1, 1, 1, 1, 2, 2, 3, 3].map((level, index) => ({
        locator: {
          source: {
            kind: 'existing_source',
            source_instance_id: 41,
          },
          rule_key: 'wizard-spellbook',
          ordinal: index + 1,
        },
        level,
      })),
    );
  });

  it('omits inactive configured rules without emitting unstable locators', () => {
    const plan = planner.plan({
      source: { kind: 'selected_class' },
      configured_rules: [{
        kind: 'choice_from_query',
        rule_key: 'spell-recall',
        count: 1,
        bucket: 'prepared',
        schools: ['Evocation'],
        active_from_class_level: 5,
        active_if_config: { key: 'path', equals: 'arcane' },
      }],
      config: { path: 'divine' },
      effective_class_level: 4 as ClassLevel,
    });
    expect(plan).toEqual([]);
  });
});
