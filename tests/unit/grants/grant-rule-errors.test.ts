import { describe, expect, it } from 'vitest';
import {
  GrantRuleActivationConflictError,
  GrantRuleActiveConfigKeysError,
  GrantRuleActiveConfigValuesError,
  GrantRuleCapabilityCountError,
  GrantRuleFieldError,
  GrantRuleForbiddenBucketError,
  GrantRuleFixedSpellReferenceRequiredError,
  GrantRuleFreeCastEnumError,
  GrantRuleFreeCastUsesError,
  GrantRuleInputTypeError,
  GrantRuleInvalidBucketError,
  GrantRuleJsonParseError,
  GrantRuleJsonShapeError,
  GrantRuleKindError,
  GrantRulePendingChoiceError,
  GrantRuleQueryPredicateError,
  GrantRuleSelectionCollectionError,
  GrantSourceRuleDefinitionKeyConfigError,
  GrantSourceRuleReferenceRequiredError,
  type GrantRuleFieldExpectation,
} from '../../../src/grants/grant-rule-errors';

interface FormatterCase {
  readonly error: Error;
  readonly message: string;
  readonly params: Readonly<Record<string, unknown>>;
}

const cause = new SyntaxError('Unexpected end of JSON input');
const cases: readonly FormatterCase[] = [
  {
    error: new GrantRuleFieldError('fixed', 'count', 'positive_integer'),
    message: "Grant rule 'fixed' field 'count' must be a positive integer.",
    params: { rule_key: 'fixed', field: 'count', expected: 'positive_integer' },
  },
  {
    error: new GrantRuleFreeCastUsesError('fixed'),
    message: "Grant rule 'fixed' free_cast.uses must be a positive integer.",
    params: { rule_key: 'fixed' },
  },
  {
    error: new GrantRuleFreeCastEnumError('fixed', 'pool_scope', []),
    message: "Grant rule 'fixed' has invalid free_cast.pool_scope 'array'.",
    params: { rule_key: 'fixed', field: 'pool_scope', value: [] },
  },
  {
    error: new GrantRuleActiveConfigKeysError('conditional'),
    message: "Grant rule 'conditional' field 'active_if_config' must contain exactly key and equals.",
    params: { rule_key: 'conditional' },
  },
  {
    error: new GrantRuleActiveConfigValuesError('conditional'),
    message: "Grant rule 'conditional' active_if_config key and equals must be non-empty strings.",
    params: { rule_key: 'conditional' },
  },
  {
    error: new GrantRuleFixedSpellReferenceRequiredError('fixed'),
    message: "Fixed-spell rule 'fixed' requires spell_version_id or spell_version_key.",
    params: { rule_key: 'fixed' },
  },
  {
    error: new GrantSourceRuleReferenceRequiredError('source'),
    message: "Grant-source rule 'source' requires a source definition reference.",
    params: { rule_key: 'source' },
  },
  {
    error: new GrantSourceRuleDefinitionKeyConfigError('source'),
    message: "Grant-source rule 'source' field 'definition_key_config' must be a string or null.",
    params: { rule_key: 'source' },
  },
  {
    error: new GrantRuleSelectionCollectionError('list'),
    message: "Grant rule 'list' may not constrain a selection collection.",
    params: { rule_key: 'list' },
  },
  {
    error: new GrantRuleQueryPredicateError('query'),
    message: "Query rule 'query' requires at least one predicate.",
    params: { rule_key: 'query' },
  },
  {
    error: new GrantRulePendingChoiceError('source'),
    message: "Grant rule 'source' may not allow a pending choice without delegating its definition through definition_key_config.",
    params: { rule_key: 'source' },
  },
  {
    error: new GrantRuleInputTypeError(),
    message: 'Grant rule input must be an object.',
    params: {},
  },
  {
    error: new GrantRuleKindError('configured_choice'),
    message: "Unknown grant rule kind 'configured_choice'.",
    params: { value: 'configured_choice' },
  },
  {
    error: new GrantRuleCapabilityCountError('capability'),
    message: "Capability rule 'capability' must not define count; capabilities do not mint slots.",
    params: { rule_key: 'capability' },
  },
  {
    error: new GrantRuleInvalidBucketError('list', 'sometimes'),
    message: "Grant rule 'list' has invalid bucket 'sometimes'.",
    params: { rule_key: 'list', bucket: 'sometimes' },
  },
  {
    error: new GrantRuleForbiddenBucketError('capability'),
    message: "Grant rule 'capability' must not define a bucket.",
    params: { rule_key: 'capability' },
  },
  {
    error: new GrantRuleActivationConflictError('fixed'),
    message: "Grant rule 'fixed' must not define both active_from_class_level and active_from_character_level.",
    params: { rule_key: 'fixed' },
  },
  {
    error: new GrantRuleJsonParseError(cause.message, cause),
    message: 'Grant rule JSON is invalid: Unexpected end of JSON input',
    params: { reason: cause.message, cause },
  },
  {
    error: new GrantRuleJsonShapeError(),
    message: 'Grant rule JSON must decode to an object.',
    params: {},
  },
];

describe('grant-rule error formatters', () => {
  it.each(cases)('$error.name', ({ error, message, params }) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(params);
  });

  it('formats every field expectation without an undefined phrase', () => {
    const expectations: readonly GrantRuleFieldExpectation[] = [
      'non_empty_string',
      'positive_integer',
      'boolean',
      'non_empty_string_list',
      'strings_only',
      'object_or_null',
      'non_negative_integer',
    ];
    for (const expected of expectations) {
      expect(new GrantRuleFieldError('rule', 'field', expected).message)
        .not.toContain('undefined');
    }
  });
});
