import { describe, expect, it } from 'vitest';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from '../../../src/grants/configured-choice-rule';
import { GrantRule } from '../../../src/grants/grant-rule';
import {
  ConfiguredChoiceExactKeysError,
  ConfiguredChoiceNestedRuleError,
  SourceGrantRuleKeyError,
} from '../../../src/grants/configured-choice-rule-errors';
import {
  GrantRuleActivationConflictError,
  GrantRuleKindError,
} from '../../../src/grants/grant-rule-errors';

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected an error, but the call returned.');
}

function configuredChoice() {
  return {
    kind: 'configured_choice',
    rule_key: 'fixture-lineage',
    label: 'Fixture Lineage',
    config_key: 'lineage.chosen_option',
    required: true,
    ability_choice: {
      config_key: 'spellcasting_ability',
      options: ['intelligence', 'wisdom', 'charisma'],
    },
    unknown_sheet_fields: ['darkvision_feet'],
    projected_trait_names: ['Darkvision'],
    options: [{
      value: 'Moon Lineage',
      label: 'Moon Lineage',
      sheet: { darkvision_feet: 60 },
      effects: [],
      grants: [{
        kind: 'fixed_spell',
        rule_key: 'fixture-moon-light',
        spell_version_key: '2024:light',
        bucket: 'cantrip_known',
        with_slots: false,
      }],
      replaceable_spell_choice: null,
    }],
  };
}

describe('configured source-choice contract', () => {
  it('parses the closed descriptor without widening GrantRule', () => {
    const input = configuredChoice();
    const parsed = ConfiguredChoiceRule.fromObject(input);

    expect(parsed.ruleKey).toBe('fixture-lineage');
    expect(parsed.options[0]?.value).toBe('Moon Lineage');
    expect(parsed.options[0]?.grants[0]?.ruleKey).toBe('fixture-moon-light');
    expect(parsed.toObject()).toEqual(input);
    const materialError = thrown(() => GrantRule.fromObject(input));
    expect(materialError).toBeInstanceOf(GrantRuleKindError);
    expect(materialError).toMatchObject({ value: 'configured_choice' });
    const descriptorError = thrown(() => ConfiguredChoiceRule.fromObject(
      input.options[0]?.grants[0],
    ));
    expect(descriptorError).toBeInstanceOf(ConfiguredChoiceExactKeysError);
    expect(descriptorError).toMatchObject({ label: 'Configured-choice rule' });

    const passthroughBase = configuredChoice();
    const passthrough = {
      ...passthroughBase,
      options: [{
        ...passthroughBase.options[0]!,
        effects: [{
          kind: 'damage_resistance',
          label: 'Homebrew ward',
          damage_type: 'Chronal',
        }],
      }],
    };
    expect(
      ConfiguredChoiceRule.fromObject(passthrough).options[0]?.effects,
    ).toEqual([{
      kind: 'damage_resistance',
      label: 'Homebrew ward',
      damage_type: 'Chronal',
    }]);
  });

  it('refuses unknown fields, nesting, and rule-key collisions', () => {
    const unknownFieldError = thrown(() => ConfiguredChoiceRule.fromObject({
      ...configuredChoice(),
      future_default: 'guess',
    }));
    expect(unknownFieldError).toBeInstanceOf(ConfiguredChoiceExactKeysError);
    expect(unknownFieldError).toMatchObject({ label: 'Configured-choice rule' });

    const base = configuredChoice();
    const nested = {
      ...base,
      options: [{
        ...base.options[0]!,
        grants: [configuredChoice()],
      }],
    };
    expect(thrown(() => ConfiguredChoiceRule.fromObject(nested))).toBeInstanceOf(
      ConfiguredChoiceNestedRuleError,
    );

    const collision = thrown(() => parseSourceGrantRules([
      configuredChoice(),
      {
        kind: 'fixed_spell',
        rule_key: 'fixture-moon-light',
        spell_version_key: '2024:light',
        bucket: 'cantrip_known',
      },
    ]));
    expect(collision).toBeInstanceOf(SourceGrantRuleKeyError);
    expect(collision).toMatchObject({ rule_key: 'fixture-moon-light' });
  });

  it('closes character-level gates to 1..20 and makes both gates incoherent', () => {
    expect(GrantRule.fromObject({
      kind: 'fixed_spell',
      rule_key: 'level-three',
      spell_version_key: '2024:misty-step',
      bucket: 'prepared',
      active_from_character_level: 3,
    }).activeFromCharacterLevel).toBe(3);

    expect(() => GrantRule.fromObject({
      kind: 'fixed_spell',
      rule_key: 'level-twenty-one',
      spell_version_key: '2024:misty-step',
      bucket: 'prepared',
      active_from_character_level: 21,
    })).toThrow('must be between 1 and 20');

    const conflict = thrown(() => GrantRule.fromObject({
      kind: 'fixed_spell',
      rule_key: 'crossed-gates',
      spell_version_key: '2024:misty-step',
      bucket: 'prepared',
      active_from_class_level: 3,
      active_from_character_level: 3,
    }));
    expect(conflict).toBeInstanceOf(GrantRuleActivationConflictError);
    expect(conflict).toMatchObject({ rule_key: 'crossed-gates' });
  });
});
