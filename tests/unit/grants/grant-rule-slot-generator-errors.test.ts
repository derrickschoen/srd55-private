import { describe, expect, it } from 'vitest';
import {
  GrantDistinctConfigMissingError,
  GrantGenerationSourceMissingError,
  GrantSelectedSkillsConfigError,
  GrantSourceChildConfigError,
  GrantSourceConfigShapeError,
  GrantSourceDefinitionResolutionError,
  GrantSpellVersionReferenceError,
  PlannedGrantRuleMissingError,
} from '../../../src/grants/grant-rule-slot-generator-errors';

interface FormatterCase {
  readonly error: Error;
  readonly message: string;
  readonly params: Readonly<Record<string, unknown>>;
}

const cases: readonly FormatterCase[] = [
  {
    error: new GrantGenerationSourceMissingError(7),
    message: 'Source instance 7 does not exist.',
    params: { source_instance_id: 7 },
  },
  {
    error: new GrantSourceConfigShapeError(7),
    message: 'Grant source 7 config must be an object.',
    params: { source_instance_id: 7 },
  },
  {
    error: new PlannedGrantRuleMissingError('gift'),
    message: "Planned grant rule 'gift' disappeared before generation.",
    params: { rule_key: 'gift' },
  },
  {
    error: new GrantSelectedSkillsConfigError('skills'),
    message: "Grant rule 'skills' config 'selected_skills' must contain only known skills.",
    params: { rule_key: 'skills' },
  },
  {
    error: new GrantSpellVersionReferenceError('gift', 'inactive'),
    message: "Grant rule 'gift' references an inactive spell version.",
    params: { rule_key: 'gift', issue: 'inactive' },
  },
  {
    error: new GrantSourceDefinitionResolutionError('child'),
    message: "Grant-source rule 'child' could not resolve its definition.",
    params: { rule_key: 'child' },
  },
  {
    error: new GrantSourceChildConfigError('child'),
    message: "Grant-source rule 'child' child config must be an object.",
    params: { rule_key: 'child' },
  },
  {
    error: new GrantDistinctConfigMissingError('gift', 'chosen_list'),
    message: "Grant rule 'gift' requires config 'chosen_list'.",
    params: { rule_key: 'gift', config_path: 'chosen_list' },
  },
];

describe('grant-rule slot generator error formatters', () => {
  it.each(cases)('$error.name', ({ error, message, params }) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(params);
  });
});
