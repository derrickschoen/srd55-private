import type { SrdRuleId } from './srd/rule-index';
import type { DecisionId, OwnerRulingId, TestRef, UnitId } from './srd/rule-status-types';

/** D941: a rule relaxation needs a named decision and at least one consumer. */
export interface RuleToggleEntry {
  readonly relaxes: SrdRuleId | OwnerRulingId;
  readonly unit: UnitId;
  readonly decision: DecisionId;
  readonly consumers: readonly [TestRef, ...TestRef[]];
  readonly reason: string;
  readonly activatedIn: 'tests/helpers/trust-recorded-history.ts';
}

export const RULE_TOGGLES = {} as const satisfies Readonly<Record<string, RuleToggleEntry>>;
export type RuleToggleId = keyof typeof RULE_TOGGLES;
