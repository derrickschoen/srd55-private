import { formatRuleCoverage, ruleCoverage } from '../src/rules/srd/rule-coverage';

/**
 * `npm run srd:rule-coverage`: prints the status × kind matrix of every SRD
 * 5.2.1 rule unit, derived from `RULE_STATUS` now. A report, never a pinned
 * expectation (src/rules/srd/rule-coverage.ts).
 */
process.stdout.write(formatRuleCoverage(ruleCoverage()));
