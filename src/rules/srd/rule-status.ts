import type { SrdRuleId } from './rule-index';
import { RULE_STATUS_NAMES, type RuleStatus, type RuleStatusName } from './rule-status-types';
import { CLASSES_STATUS } from './status/classes';
import { EQUIPMENT_STATUS } from './status/equipment';
import { MAGIC_ITEMS_STATUS } from './status/magic-items';
import { ORIGINS_STATUS } from './status/origins';
import { RULES_STATUS } from './status/rules';
import { SPELLS_STATUS } from './status/spells';
import { STAT_BLOCKS_STATUS } from './status/stat-blocks';
import { TOOLBOX_STATUS } from './status/toolbox';

/**
 * THE STATUS OF EVERY SRD 5.2.1 RULE (owner D918; synthesis §5 condition 3).
 *
 * Exhaustive over `SrdRuleId`: a rule the index gains has no status, and this
 * fails to compile, until someone decides one. Each part is kept beside the
 * kinds it covers (./status/*.ts) so the unit that types a kind edits one file.
 *
 * The first fill (RULE-INDEX unit) marks a rule `executed` or `typed_only` only
 * where a witness test or typed data already exists, cited beside the entry;
 * every other rule is `unrepresented`, naming the unit that will type it.
 * Nothing here is a guess at execution: the witness-resolution test proves
 * every witness exists, and the coverage matrix is a derived report
 * (`npm run srd:rule-coverage`), never a pinned expectation.
 */
export const RULE_STATUS = {
  ...RULES_STATUS,
  ...CLASSES_STATUS,
  ...ORIGINS_STATUS,
  ...EQUIPMENT_STATUS,
  ...SPELLS_STATUS,
  ...STAT_BLOCKS_STATUS,
  ...MAGIC_ITEMS_STATUS,
  ...TOOLBOX_STATUS,
} as const satisfies { readonly [K in SrdRuleId]: RuleStatus };

export function ruleStatus(id: SrdRuleId): RuleStatus {
  return RULE_STATUS[id];
}

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

/** The report's status list names every status exactly once. */
export const RULE_STATUS_NAMES_ARE_COMPLETE: Equal<(typeof RULE_STATUS_NAMES)[number], RuleStatusName> = true;
