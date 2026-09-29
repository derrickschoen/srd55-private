import { describe, expect, it } from 'vitest';
import { RULE_TOGGLES } from '../../../src/rules/rule-toggles';

describe('RULE_TOGGLES', () => {
  it('D941: no toggle is granted; MOVE-COST and CONDITION-D20 request none', () => {
    expect(Object.keys(RULE_TOGGLES)).toEqual([]);
  });
});
