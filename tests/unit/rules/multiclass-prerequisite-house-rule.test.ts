import { describe, expect, it } from 'vitest';
import { decodeMulticlassPrerequisiteHouseRule } from '../../../src/rules/multiclass-prerequisite-house-rule';

describe('multiclass prerequisite house-rule state', () => {
  it.each([
    [null, { status: 'off' }],
    ['false', { status: 'off' }],
    ['true', { status: 'on' }],
    ['{broken', { status: 'invalid', reason: 'invalid_json' }],
    ['"yes"', { status: 'invalid', reason: 'not_boolean' }],
    ['{}', { status: 'invalid', reason: 'not_boolean' }],
  ] as const)('decodes %s without truthiness guesses', (stored, expected) => {
    expect(decodeMulticlassPrerequisiteHouseRule(stored)).toEqual(expected);
  });
});
