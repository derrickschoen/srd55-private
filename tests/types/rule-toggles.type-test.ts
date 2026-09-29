/** SAVE-COMPAT C6 W30: tsc -b compiles this file through tsconfig.node.json. */
import type { RuleToggleEntry } from '../../src/rules/rule-toggles';

export const validEntry = {
  relaxes: 'flyer-terrain-tags',
  unit: 'MOVE-COST',
  decision: 'D941',
  consumers: ['tests/unit/rules/rule-toggles.test.ts::D941: no toggle is granted; MOVE-COST and CONDITION-D20 request none'],
  reason: 'Type-only positive control.',
  activatedIn: 'tests/helpers/trust-recorded-history.ts',
} as const satisfies RuleToggleEntry;

export const noConsumers: RuleToggleEntry = {
  ...validEntry,
  // @ts-expect-error W30: a toggle must name at least one consumer.
  consumers: [],
};

// @ts-expect-error W30: a toggle must cite a supervisor decision.
export const missingDecision: RuleToggleEntry = {
  relaxes: 'flyer-terrain-tags',
  unit: 'MOVE-COST',
  consumers: ['tests/unit/rules/rule-toggles.test.ts::D941: no toggle is granted; MOVE-COST and CONDITION-D20 request none'],
  reason: 'Type-only negative control.',
  activatedIn: 'tests/helpers/trust-recorded-history.ts',
};
