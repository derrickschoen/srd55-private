import { describe, expect, it } from 'vitest';
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
  type ConfiguredChoiceValueExpectation,
} from '../../../src/grants/configured-choice-rule-errors';

interface FormatterCase {
  readonly error: Error;
  readonly message: string;
  readonly params: Readonly<Record<string, unknown>>;
}

const cases: readonly FormatterCase[] = [
  {
    error: new ConfiguredChoiceValueError('Choice.label', 'non_empty_text'),
    message: 'Choice.label must be non-empty text.',
    params: { label: 'Choice.label', expected: 'non_empty_text' },
  },
  {
    error: new ConfiguredChoiceExactKeysError('Choice', ['kind', 'label']),
    message: 'Choice must contain exactly kind, label.',
    params: { label: 'Choice', expected_keys: ['kind', 'label'] },
  },
  {
    error: new ConfiguredChoiceRootContractError(),
    message: 'Configured-choice rule kind must be configured_choice and required must be true.',
    params: {},
  },
  {
    error: new ConfiguredChoiceAbilityOptionsError(),
    message: 'Configured-choice rule ability options must be supported abilities.',
    params: {},
  },
  {
    error: new ConfiguredChoiceUnknownSheetFieldError(),
    message: 'Configured-choice rule has an unknown sheet field.',
    params: {},
  },
  {
    error: new ConfiguredChoiceProjectedTraitError(),
    message: 'A projected trait requires a structured unknown sheet field.',
    params: {},
  },
  {
    error: new ConfiguredChoiceRepeatedOptionError('Moon'),
    message: "Configured-choice rule repeats option 'Moon'.",
    params: { option: 'Moon' },
  },
  {
    error: new ConfiguredChoiceNestedRuleError(),
    message: 'Configured-choice rules may not be nested.',
    params: {},
  },
  {
    error: new ConfiguredChoiceRepeatedMaterialRuleKeyError('moon-light'),
    message: "Configured-choice rule repeats material rule_key 'moon-light'.",
    params: { rule_key: 'moon-light' },
  },
  {
    error: new ConfiguredChoiceDeclaredDarkvisionError(),
    message: 'Every option must provide declared Darkvision.',
    params: {},
  },
  {
    error: new ConfiguredChoiceDeclaredDamageResistanceError(),
    message: 'Every option must provide one declared damage resistance.',
    params: {},
  },
  {
    error: new SourceGrantRulesListError(),
    message: 'Source grant rules must be a list.',
    params: {},
  },
  {
    error: new SourceGrantRuleKeyError('moon-light'),
    message: "Source grant rules repeat rule_key 'moon-light'.",
    params: { rule_key: 'moon-light' },
  },
];

describe('configured-choice error formatters', () => {
  it.each(cases)('$error.name', ({ error, message, params }) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(params);
  });

  it('formats every value expectation without an undefined phrase', () => {
    const expectations: readonly ConfiguredChoiceValueExpectation[] = [
      'object',
      'non_empty_text',
      'dotted_path',
      'list',
      'non_empty_list',
      'unique',
      'non_zero_integer',
      'unsupported',
      'required_and_displayed',
      'zero',
      'positive',
    ];
    for (const expected of expectations) {
      expect(new ConfiguredChoiceValueError('Choice', expected).message)
        .not.toContain('undefined');
    }
  });
});
