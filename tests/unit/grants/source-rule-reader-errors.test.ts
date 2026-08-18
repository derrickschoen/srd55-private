import { describe, expect, it } from 'vitest';
import {
  GrantRuleClassLevelSourceError,
  GrantRulesJsonContainerError,
  GrantSourceClassLevelMissingError,
  GrantSourceDefinitionMissingError,
  GrantSourceInstanceStateError,
  GrantSourceRulesListError,
  GrantSourceTypeError,
  StoredGrantRuleRecordError,
} from '../../../src/grants/source-rule-reader-errors';

interface FormatterCase {
  readonly error: Error;
  readonly message: string;
  readonly params: Readonly<Record<string, unknown>>;
}

const cases: readonly FormatterCase[] = [
  {
    error: new GrantSourceInstanceStateError('future'),
    message: "Unknown source instance state 'future'.",
    params: { state: 'future' },
  },
  {
    error: new GrantRulesJsonContainerError(),
    message: 'Grant-rule JSON values must decode to arrays or objects.',
    params: {},
  },
  {
    error: new GrantSourceTypeError('vehicle'),
    message: "Unsupported grant source type 'vehicle'.",
    params: { source_type: 'vehicle' },
  },
  {
    error: new StoredGrantRuleRecordError('class_progression'),
    message: 'Class progression grant rules must be objects.',
    params: { location: 'class_progression' },
  },
  {
    error: new GrantSourceDefinitionMissingError(7, 'subclass_source'),
    message: 'Definition for subclass source instance 7 does not exist.',
    params: { source_instance_id: 7, subject: 'subclass_source' },
  },
  {
    error: new GrantSourceRulesListError(7),
    message: 'Grant rules for source instance 7 must be a list.',
    params: { source_instance_id: 7 },
  },
  {
    error: new GrantRuleClassLevelSourceError(),
    message: 'Rule active_from_class_level requires a class, subclass, or configured class_level source.',
    params: {},
  },
  {
    error: new GrantSourceClassLevelMissingError(7, 'class_source'),
    message: 'Class source instance 7 has no character class level.',
    params: { source_instance_id: 7, subject: 'class_source' },
  },
];

describe('source-rule reader error formatters', () => {
  it.each(cases)('$error.name', ({ error, message, params }) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(params);
  });
});
