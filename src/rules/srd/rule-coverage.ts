import { SRD_RULE_KINDS, type SrdRuleKind } from './rule-index-types';
import { SRD_RULE_IDS, SRD_RULE_INDEX, type SrdRuleId } from './rule-index';
import { RULE_STATUS } from './rule-status';
import {
  CAPABILITY_OWNER,
  RULE_STATUS_NAMES,
  type Capability,
  type RuleStatus,
  type RuleStatusName,
  type UnitId,
} from './rule-status-types';

/**
 * THE COVERAGE MATRIX: status × kind, derived from `RULE_STATUS` every time it
 * is asked for. It is a REPORT, never a pinned expectation: pinning its numbers
 * would regenerate an expectation from our own output (synthesis §5,
 * AGENTS.md). Progress is proven by the exhaustive record, the witness
 * resolution test and the per-status invariants, not by these counts.
 *
 * It is also the first consumer that switches on a status, and it does so with
 * no default arm: a status added to `RuleStatus` fails `unitOf` to compile
 * until the report says who owns it.
 */
export interface RuleCoverage {
  readonly total: number;
  readonly byKind: Readonly<Record<SrdRuleKind, Readonly<Record<RuleStatusName, number>>>>;
  readonly byStatus: Readonly<Record<RuleStatusName, number>>;
  /** Rules not yet executed, by the unit that owns the next step. */
  readonly byOwner: Readonly<Partial<Record<UnitId | 'owner_decision' | 'none', number>>>;
}

/** Who owns the next step for a rule in this status. */
export function nextOwner(status: RuleStatus): UnitId | 'owner_decision' | 'none' {
  switch (status.status) {
    case 'executed':
    case 'not_executable':
      return 'none';
    case 'partial':
      return CAPABILITY_OWNER[status.missing[0].awaiting];
    case 'typed_only':
      return CAPABILITY_OWNER[status.awaiting[0]];
    case 'excluded_by_owner':
    case 'source_disagreement':
      return 'owner_decision';
    case 'unrepresented':
      return status.unit;
  }
}

/** The capabilities a rule waits for (none when nothing is missing). */
export function awaitedCapabilities(status: RuleStatus): readonly Capability[] {
  switch (status.status) {
    case 'partial':
      return status.missing.map(({ awaiting }) => awaiting);
    case 'typed_only':
      return status.awaiting;
    case 'executed':
    case 'excluded_by_owner':
    case 'not_executable':
    case 'source_disagreement':
    case 'unrepresented':
      return [];
  }
}

function zeroes(): Record<RuleStatusName, number> {
  return Object.fromEntries(RULE_STATUS_NAMES.map((name) => [name, 0])) as Record<RuleStatusName, number>;
}

export function ruleCoverage(
  statusOf: (id: SrdRuleId) => RuleStatus = (id) => RULE_STATUS[id],
): RuleCoverage {
  const byKind = Object.fromEntries(SRD_RULE_KINDS.map((kind) => [kind, zeroes()])) as Record<SrdRuleKind, Record<RuleStatusName, number>>;
  const byStatus = zeroes();
  const byOwner: Partial<Record<UnitId | 'owner_decision' | 'none', number>> = {};
  for (const id of SRD_RULE_IDS) {
    const status = statusOf(id);
    byKind[SRD_RULE_INDEX[id].kind][status.status] += 1;
    byStatus[status.status] += 1;
    const owner = nextOwner(status);
    byOwner[owner] = (byOwner[owner] ?? 0) + 1;
  }
  return { total: SRD_RULE_IDS.length, byKind, byStatus, byOwner };
}

/** The matrix as fixed-width text, one row per kind. */
export function formatRuleCoverage(coverage: RuleCoverage): string {
  const header = ['kind', ...RULE_STATUS_NAMES, 'total'];
  const rows = SRD_RULE_KINDS.map((kind) => {
    const counts = RULE_STATUS_NAMES.map((name) => coverage.byKind[kind][name]);
    return [kind, ...counts.map(String), String(counts.reduce((sum, count) => sum + count, 0))];
  });
  rows.push(['all', ...RULE_STATUS_NAMES.map((name) => String(coverage.byStatus[name])), String(coverage.total)]);
  const widths = header.map((_, column) => Math.max(...[header, ...rows].map((row) => (row[column] ?? '').length)));
  const line = (row: readonly string[]): string =>
    row.map((cell, column) => (column === 0 ? cell.padEnd(widths[column] ?? 0) : cell.padStart(widths[column] ?? 0))).join('  ');
  const owners = Object.entries(coverage.byOwner)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0) || a[0].localeCompare(b[0]))
    .map(([owner, count]) => `  ${owner}: ${String(count)}`);
  return [
    'SRD 5.2.1 rule coverage (derived from RULE_STATUS; a report, never a pinned expectation)',
    '',
    line(header),
    ...rows.map(line),
    '',
    'Next step owned by:',
    ...owners,
    '',
  ].join('\n');
}
