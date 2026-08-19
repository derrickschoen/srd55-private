import { describe, expect, it } from 'vitest';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from '../../../src/grants/configured-choice-rule';
import { GrantRule } from '../../../src/grants/grant-rule';
import {
  ConfiguredChoiceAbilityOptionsError,
  ConfiguredChoiceDeclaredDamageResistanceError,
  ConfiguredChoiceDeclaredDarkvisionError,
  ConfiguredChoiceExactKeysError,
  ConfiguredChoiceNestedRuleError,
  ConfiguredChoiceProjectedTraitError,
  ConfiguredChoiceRepeatedMaterialRuleKeyError,
  ConfiguredChoiceRepeatedOptionError,
  ConfiguredChoiceRootContractError,
  ConfiguredChoiceUnknownSheetFieldError,
  ConfiguredChoiceValueError,
  SourceGrantRuleKeyError,
  SourceGrantRulesListError,
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

function configuredOption(overrides: Record<string, unknown> = {}) {
  return {
    value: 'Stone Lineage',
    label: 'Stone Lineage',
    sheet: { darkvision_feet: 120 },
    effects: [
      {
        kind: 'speed',
        label: 'Stone stride',
        speed_bonus_feet: -5,
      },
      {
        kind: 'damage_resistance',
        label: 'Stone ward',
        damage_type: 'Fire',
      },
    ],
    grants: [{
      kind: 'choice_from_list',
      rule_key: 'fixture-stone-cantrip',
      count: 2,
      bucket: 'cantrip_known',
      list: 'Wizard',
      level_min: 0,
      level_max: 0,
    }],
    replaceable_spell_choice: {
      config_key: 'lineage.replacement.spell',
      label: 'Replacement Cantrip',
      required: true,
      spell_list: 'Wizard',
      spell_level: 0,
      initial_spell_version_key: '2024:light',
      display_on_sheet: true,
    },
    ...overrides,
  };
}

function completeConfiguredChoice(overrides: Record<string, unknown> = {}) {
  const moon = configuredChoice().options[0]!;
  return {
    ...configuredChoice(),
    unknown_sheet_fields: ['darkvision_feet', 'damage_resistances'],
    projected_trait_names: ['Darkvision', 'Elemental Ward'],
    options: [
      {
        ...moon,
        effects: [{
          kind: 'damage_resistance',
          label: 'Moon ward',
          damage_type: 'Cold',
        }],
      },
      configuredOption(),
    ],
    ...overrides,
  };
}

type ErrorConstructor = abstract new (...args: never[]) => Error;

function expectStructuredError(
  run: () => unknown,
  errorClass: ErrorConstructor,
  fields: Readonly<Record<string, unknown>> = {},
): void {
  const error = thrown(run);
  expect(error).toBeInstanceOf(errorClass);
  expect(error).toMatchObject(fields);
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

  it('round-trips multiple fully populated options with exact projections', () => {
    const input = completeConfiguredChoice();
    const parsed = ConfiguredChoiceRule.fromObject(input);

    expect(parsed).toMatchObject({
      ruleKey: 'fixture-lineage',
      label: 'Fixture Lineage',
      configKey: 'lineage.chosen_option',
      required: true,
      abilityChoice: {
        configKey: 'spellcasting_ability',
        options: ['intelligence', 'wisdom', 'charisma'],
      },
      unknownSheetFields: ['darkvision_feet', 'damage_resistances'],
      projectedTraitNames: ['Darkvision', 'Elemental Ward'],
    });
    expect(parsed.options).toEqual([
      {
        value: 'Moon Lineage',
        label: 'Moon Lineage',
        darkvisionFeet: 60,
        effects: [{
          kind: 'damage_resistance',
          label: 'Moon ward',
          damage_type: 'Cold',
        }],
        grants: [expect.objectContaining({
          kind: 'fixed_spell',
          ruleKey: 'fixture-moon-light',
          count: 1,
          bucket: 'cantrip_known',
          alwaysPrepared: false,
          withSlots: false,
        })],
        replaceableSpellChoice: null,
      },
      {
        value: 'Stone Lineage',
        label: 'Stone Lineage',
        darkvisionFeet: 120,
        effects: [
          { kind: 'speed', label: 'Stone stride', speed_bonus_feet: -5 },
          {
            kind: 'damage_resistance',
            label: 'Stone ward',
            damage_type: 'Fire',
          },
        ],
        grants: [expect.objectContaining({
          kind: 'choice_from_list',
          ruleKey: 'fixture-stone-cantrip',
          count: 2,
          bucket: 'cantrip_known',
        })],
        replaceableSpellChoice: {
          configKey: 'lineage.replacement.spell',
          label: 'Replacement Cantrip',
          required: true,
          spellList: 'Wizard',
          spellLevel: 0,
          initialSpellVersionKey: '2024:light',
          displayOnSheet: true,
        },
      },
    ]);
    expect(parsed.toObject()).toEqual(input);
    expect(parseSourceGrantRules([input]).map((rule) => rule.toObject()))
      .toEqual([input]);
  });

  it('pins object, exact-key, text, path, and list failures by structured label', () => {
    const option = configuredChoice().options[0]!;
    const cases: ReadonlyArray<Readonly<{
      label: string;
      input: unknown;
      errorClass: ErrorConstructor;
      fields: Readonly<Record<string, unknown>>;
    }>> = [
      {
        label: 'null root',
        input: null,
        errorClass: ConfiguredChoiceValueError,
        fields: { label: 'Configured-choice rule', expected: 'object' },
      },
      {
        label: 'array root',
        input: [],
        errorClass: ConfiguredChoiceValueError,
        fields: { label: 'Configured-choice rule', expected: 'object' },
      },
      {
        label: 'scalar root',
        input: 'configured_choice',
        errorClass: ConfiguredChoiceValueError,
        fields: { label: 'Configured-choice rule', expected: 'object' },
      },
      {
        label: 'missing root key',
        input: (() => {
          const { label: omitted, ...rest } = configuredChoice();
          expect(omitted).toBe('Fixture Lineage');
          return rest;
        })(),
        errorClass: ConfiguredChoiceExactKeysError,
        fields: {
          label: 'Configured-choice rule',
          expected_keys: [
            'ability_choice', 'config_key', 'kind', 'label', 'options',
            'projected_trait_names', 'required', 'rule_key',
            'unknown_sheet_fields',
          ],
        },
      },
      {
        label: 'extra option key',
        input: {
          ...configuredChoice(),
          options: [{ ...option, future: true }],
        },
        errorClass: ConfiguredChoiceExactKeysError,
        fields: {
          label: 'Configured-choice rule.options[0]',
          expected_keys: [
            'effects', 'grants', 'label', 'replaceable_spell_choice',
            'sheet', 'value',
          ],
        },
      },
      {
        label: 'blank rule key',
        input: { ...configuredChoice(), rule_key: '  ' },
        errorClass: ConfiguredChoiceValueError,
        fields: {
          label: 'Configured-choice rule.rule_key',
          expected: 'non_empty_text',
        },
      },
      {
        label: 'wrong option label type',
        input: {
          ...configuredChoice(),
          options: [{ ...option, label: 7 }],
        },
        errorClass: ConfiguredChoiceValueError,
        fields: {
          label: 'Configured-choice rule.options[0].label',
          expected: 'non_empty_text',
        },
      },
      ...['.choice', 'choice.', 'choice..value', 'choice. .value'].map(
        (configKey) => ({
          label: `invalid path ${configKey}`,
          input: { ...configuredChoice(), config_key: configKey },
          errorClass: ConfiguredChoiceValueError,
          fields: {
            label: 'Configured-choice rule.config_key',
            expected: 'dotted_path',
          },
        }),
      ),
      {
        label: 'options scalar',
        input: { ...configuredChoice(), options: {} },
        errorClass: ConfiguredChoiceValueError,
        fields: {
          label: 'Configured-choice rule.options',
          expected: 'non_empty_list',
        },
      },
      {
        label: 'options empty',
        input: { ...configuredChoice(), options: [] },
        errorClass: ConfiguredChoiceValueError,
        fields: {
          label: 'Configured-choice rule.options',
          expected: 'non_empty_list',
        },
      },
      {
        label: 'effects scalar',
        input: {
          ...configuredChoice(),
          options: [{ ...option, effects: null }],
        },
        errorClass: ConfiguredChoiceValueError,
        fields: {
          label: 'Configured-choice rule.options[0].effects',
          expected: 'list',
        },
      },
      {
        label: 'grants scalar',
        input: {
          ...configuredChoice(),
          options: [{ ...option, grants: {} }],
        },
        errorClass: ConfiguredChoiceValueError,
        fields: {
          label: 'Configured-choice rule.options[0].grants',
          expected: 'list',
        },
      },
    ];

    for (const testCase of cases) {
      expectStructuredError(
        () => ConfiguredChoiceRule.fromObject(testCase.input),
        testCase.errorClass,
        testCase.fields,
      );
    }
  });

  it('pins root, ability, declared-field, and option-set contracts', () => {
    const option = configuredChoice().options[0]!;
    const cases: ReadonlyArray<readonly [
      string,
      unknown,
      ErrorConstructor,
      Readonly<Record<string, unknown>>,
    ]> = [
      [
        'wrong kind',
        { ...configuredChoice(), kind: 'choice' },
        ConfiguredChoiceRootContractError,
        {},
      ],
      [
        'required false',
        { ...configuredChoice(), required: false },
        ConfiguredChoiceRootContractError,
        {},
      ],
      [
        'ability choice scalar',
        { ...configuredChoice(), ability_choice: [] },
        ConfiguredChoiceValueError,
        { label: 'Configured-choice rule.ability_choice', expected: 'object' },
      ],
      [
        'ability choice extra key',
        {
          ...configuredChoice(),
          ability_choice: {
            config_key: 'ability', options: ['wisdom'], future: true,
          },
        },
        ConfiguredChoiceExactKeysError,
        {
          label: 'Configured-choice rule.ability_choice',
          expected_keys: ['config_key', 'options'],
        },
      ],
      [
        'ability choice empty',
        {
          ...configuredChoice(),
          ability_choice: { config_key: 'ability', options: [] },
        },
        ConfiguredChoiceAbilityOptionsError,
        {},
      ],
      [
        'ability choice unknown',
        {
          ...configuredChoice(),
          ability_choice: { config_key: 'ability', options: ['luck'] },
        },
        ConfiguredChoiceAbilityOptionsError,
        {},
      ],
      [
        'ability choice duplicate',
        {
          ...configuredChoice(),
          ability_choice: {
            config_key: 'ability', options: ['wisdom', 'wisdom'],
          },
        },
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.ability_choice.options',
          expected: 'unique',
        },
      ],
      [
        'unknown sheet field',
        { ...configuredChoice(), unknown_sheet_fields: ['armor_class'] },
        ConfiguredChoiceUnknownSheetFieldError,
        {},
      ],
      [
        'duplicate sheet field',
        {
          ...configuredChoice(),
          unknown_sheet_fields: ['darkvision_feet', 'darkvision_feet'],
        },
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.unknown_sheet_fields',
          expected: 'unique',
        },
      ],
      [
        'projected trait without a structured field',
        {
          ...configuredChoice(),
          unknown_sheet_fields: [],
          projected_trait_names: ['Darkvision'],
        },
        ConfiguredChoiceProjectedTraitError,
        {},
      ],
      [
        'duplicate projected trait',
        {
          ...configuredChoice(),
          projected_trait_names: ['Darkvision', 'Darkvision'],
        },
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.projected_trait_names',
          expected: 'unique',
        },
      ],
      [
        'duplicate option value',
        {
          ...configuredChoice(),
          options: [option, { ...option, label: 'Second label' }],
        },
        ConfiguredChoiceRepeatedOptionError,
        { option: 'Moon Lineage' },
      ],
      [
        'sheet scalar',
        {
          ...configuredChoice(), options: [{ ...option, sheet: [] }],
        },
        ConfiguredChoiceValueError,
        { label: 'Configured-choice rule.options[0].sheet', expected: 'object' },
      ],
      [
        'sheet extra key',
        {
          ...configuredChoice(),
          options: [{ ...option, sheet: { darkvision_feet: 60, speed: 30 } }],
        },
        ConfiguredChoiceExactKeysError,
        {
          label: 'Configured-choice rule.options[0].sheet',
          expected_keys: ['darkvision_feet'],
        },
      ],
    ];

    for (const [label, input, errorClass, fields] of cases) {
      expectStructuredError(
        () => ConfiguredChoiceRule.fromObject(input),
        errorClass,
        fields,
      );
      expect(label).not.toBe('');
    }
  });

  it('pins effect, Darkvision, and replaceable-spell numeric and shape boundaries', () => {
    const option = configuredChoice().options[0]!;
    const withOption = (changes: Record<string, unknown>) => ({
      ...configuredChoice(),
      options: [{ ...option, ...changes }],
    });
    const replacement = configuredOption().replaceable_spell_choice;
    const invalid: ReadonlyArray<readonly [
      unknown,
      ErrorConstructor,
      Readonly<Record<string, unknown>>,
    ]> = [
      [
        withOption({ sheet: { darkvision_feet: 0 } }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].sheet.darkvision_feet',
          expected: 'positive',
        },
      ],
      [
        withOption({ sheet: { darkvision_feet: 1.5 } }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].sheet.darkvision_feet',
          expected: 'positive',
        },
      ],
      [
        withOption({ effects: [null] }),
        ConfiguredChoiceValueError,
        { label: 'Configured-choice rule.options[0].effects[0]', expected: 'object' },
      ],
      [
        withOption({ effects: [{ kind: 'teleport', label: 'Blink' }] }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].effects[0].kind',
          expected: 'unsupported',
        },
      ],
      ...[0, 1.5, '5'].map((speed) => ([
        withOption({ effects: [{
          kind: 'speed', label: 'Stride', speed_bonus_feet: speed,
        }] }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].effects[0].speed_bonus_feet',
          expected: 'non_zero_integer',
        },
      ] as const)),
      [
        withOption({ effects: [{
          kind: 'speed', label: 'Stride', speed_bonus_feet: 5, future: true,
        }] }),
        ConfiguredChoiceExactKeysError,
        {
          label: 'Configured-choice rule.options[0].effects[0]',
          expected_keys: ['kind', 'label', 'speed_bonus_feet'],
        },
      ],
      [
        withOption({ replaceable_spell_choice: [] }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].replaceable_spell_choice',
          expected: 'object',
        },
      ],
      [
        withOption({
          replaceable_spell_choice: { ...replacement, required: false },
        }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].replaceable_spell_choice',
          expected: 'required_and_displayed',
        },
      ],
      [
        withOption({
          replaceable_spell_choice: {
            ...replacement, display_on_sheet: false,
          },
        }),
        ConfiguredChoiceValueError,
        {
          label: 'Configured-choice rule.options[0].replaceable_spell_choice',
          expected: 'required_and_displayed',
        },
      ],
      [
        withOption({
          replaceable_spell_choice: { ...replacement, spell_level: 1 },
        }),
        ConfiguredChoiceValueError,
        {
          label:
            'Configured-choice rule.options[0].replaceable_spell_choice.spell_level',
          expected: 'zero',
        },
      ],
      [
        withOption({
          replaceable_spell_choice: {
            ...replacement, config_key: 'replacement..spell',
          },
        }),
        ConfiguredChoiceValueError,
        {
          label:
            'Configured-choice rule.options[0].replaceable_spell_choice.config_key',
          expected: 'dotted_path',
        },
      ],
    ];

    for (const [input, errorClass, fields] of invalid) {
      expectStructuredError(
        () => ConfiguredChoiceRule.fromObject(input),
        errorClass,
        fields,
      );
    }

    const negativeSpeed = withOption({
      effects: [{ kind: 'speed', label: 'Slow stride', speed_bonus_feet: -1 }],
    });
    expect(ConfiguredChoiceRule.fromObject(negativeSpeed).options[0]?.effects)
      .toEqual([{ kind: 'speed', label: 'Slow stride', speed_bonus_feet: -1 }]);
  });

  it('refuses duplicate/nested material keys and declared projection mismatches', () => {
    const first = completeConfiguredChoice().options[0]!;
    const second = completeConfiguredChoice().options[1]!;
    const repeatedGrant = configuredChoice().options[0]!.grants[0]!;

    expectStructuredError(
      () => ConfiguredChoiceRule.fromObject({
        ...completeConfiguredChoice(),
        options: [first, { ...second, grants: [repeatedGrant] }],
      }),
      ConfiguredChoiceRepeatedMaterialRuleKeyError,
      { rule_key: 'fixture-moon-light' },
    );
    expectStructuredError(
      () => ConfiguredChoiceRule.fromObject({
        ...configuredChoice(),
        options: [{ ...configuredChoice().options[0]!, grants: [configuredChoice()] }],
      }),
      ConfiguredChoiceNestedRuleError,
    );
    expectStructuredError(
      () => ConfiguredChoiceRule.fromObject({
        ...completeConfiguredChoice(),
        options: [
          first,
          { ...second, sheet: {} },
        ],
      }),
      ConfiguredChoiceDeclaredDarkvisionError,
    );
    expectStructuredError(
      () => ConfiguredChoiceRule.fromObject({
        ...completeConfiguredChoice(),
        options: [
          first,
          { ...second, effects: second.effects.filter(
            (effect) => effect.kind !== 'damage_resistance',
          ) },
        ],
      }),
      ConfiguredChoiceDeclaredDamageResistanceError,
    );
    expectStructuredError(
      () => ConfiguredChoiceRule.fromObject({
        ...completeConfiguredChoice(),
        options: [
          first,
          {
            ...second,
            effects: [
              ...second.effects,
              {
                kind: 'damage_resistance',
                label: 'Second ward',
                damage_type: 'Cold',
              },
            ],
          },
        ],
      }),
      ConfiguredChoiceDeclaredDamageResistanceError,
    );
  });

  it('pins source-list shape and collisions across top-level and nested rules', () => {
    expectStructuredError(
      () => parseSourceGrantRules({}),
      SourceGrantRulesListError,
    );
    expectStructuredError(
      () => parseSourceGrantRules([null]),
      ConfiguredChoiceValueError,
      { label: 'Source grant rule', expected: 'object' },
    );
    expectStructuredError(
      () => parseSourceGrantRules([
        {
          kind: 'fixed_spell', rule_key: 'same', bucket: 'automatic',
          spell_version_id: 1,
        },
        {
          kind: 'fixed_spell', rule_key: 'same', bucket: 'automatic',
          spell_version_id: 2,
        },
      ]),
      SourceGrantRuleKeyError,
      { rule_key: 'same' },
    );
    const descriptor = configuredChoice();
    expectStructuredError(
      () => parseSourceGrantRules([descriptor, { ...descriptor }]),
      SourceGrantRuleKeyError,
      { rule_key: 'fixture-lineage' },
    );
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
