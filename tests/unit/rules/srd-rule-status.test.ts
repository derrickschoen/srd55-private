import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';
import { formatRuleCoverage, nextOwner, ruleCoverage } from '../../../src/rules/srd/rule-coverage';
import { SRD_RULE_IDS, type SrdRuleId } from '../../../src/rules/srd/rule-index';
import { RULE_STATUS } from '../../../src/rules/srd/rule-status';
import {
  CAPABILITIES,
  CAPABILITY_OWNER,
  RULE_STATUS_NAMES,
  UNIT_IDS,
  type RuleStatus,
  type TestRef,
} from '../../../src/rules/srd/rule-status-types';

/**
 * RULE_STATUS: exhaustive (a compile-time fact, probed below), every witness
 * resolves to a real test, and every status keeps its invariants. The coverage
 * matrix is checked for consistency with the record, never pinned to numbers.
 */

const STATUS = RULE_STATUS as Readonly<Record<SrdRuleId, RuleStatus>>;

function witnesses(status: RuleStatus): readonly TestRef[] {
  switch (status.status) {
    case 'executed':
    case 'partial':
      return status.witness;
    case 'typed_only':
    case 'excluded_by_owner':
    case 'not_executable':
    case 'source_disagreement':
    case 'unrepresented':
      return [];
  }
}

/**
 * A witness resolves when its file exists and the file declares a test with
 * exactly that title: `it(`, `test(`, or their `.each(...)(` forms, with any
 * quote.
 */
function witnessResolves(ref: TestRef, root = process.cwd()): boolean {
  const separator = ref.indexOf('::');
  const file = ref.slice(0, separator);
  const title = ref.slice(separator + 2);
  if (!existsSync(`${root}/${file}`)) {
    return false;
  }
  const source = readFileSync(`${root}/${file}`, 'utf8');
  return ['\'', '"', '`'].some((quote) => {
    const literal = `${quote}${title}${quote}`;
    let at = source.indexOf(literal);
    while (at >= 0) {
      const before = source.slice(Math.max(0, at - 200), at);
      if (/\b(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*$/.test(before)) {
        return true;
      }
      at = source.indexOf(literal, at + 1);
    }
    return false;
  });
}

describe('RULE_STATUS', () => {
  it('holds one status for every rule unit and nothing else', () => {
    expect(Object.keys(RULE_STATUS).sort()).toEqual([...SRD_RULE_IDS].sort());
  });

  it('names only witnesses that resolve to a test that exists', () => {
    const refs = SRD_RULE_IDS.flatMap((id) => witnesses(STATUS[id]).map((ref) => ({ id, ref })));
    expect(refs.length).toBeGreaterThan(0);
    for (const { id, ref } of refs) {
      expect({ id, ref, resolves: witnessResolves(ref) }).toEqual({ id, ref, resolves: true });
    }
  });

  it('keeps each status\'s invariant', () => {
    for (const id of SRD_RULE_IDS) {
      const status = STATUS[id];
      switch (status.status) {
        case 'executed':
          expect(status.witness.length).toBeGreaterThan(0);
          break;
        case 'partial':
          expect(status.witness.length).toBeGreaterThan(0);
          for (const { clause, awaiting } of status.missing) {
            expect(clause.startsWith(`${id}#`)).toBe(true);
            expect(CAPABILITIES).toContain(awaiting);
          }
          break;
        case 'typed_only':
          expect(status.awaiting.length).toBeGreaterThan(0);
          for (const capability of status.awaiting) {
            expect(UNIT_IDS).toContain(CAPABILITY_OWNER[capability]);
          }
          break;
        case 'excluded_by_owner':
          expect(status.decision).toMatch(/^D\d+(?:\.\d+)?$/);
          break;
        case 'not_executable':
          break;
        case 'source_disagreement':
          expect(new Set(status.spans).size).toBe(status.spans.length);
          break;
        case 'unrepresented':
          expect(UNIT_IDS).toContain(status.unit);
          break;
      }
    }
  });

  it('refuses a witness whose title is not a test in its file', () => {
    expect(witnessResolves('tests/unit/combat/death-saves.test.ts::queues a closed death_save PendingDecision at the start of a dying PC turn')).toBe(true);
    expect(witnessResolves('tests/unit/combat/death-saves.test.ts::queues a closed death_save PendingDecision at the start of a dying NPC turn')).toBe(false);
    expect(witnessResolves('tests/unit/combat/no-such-file.test.ts::queues a closed death_save PendingDecision at the start of a dying PC turn')).toBe(false);
  });

  it('is exhaustive over SrdRuleId, at compile time', () => {
    const { 'condition.prone': prone, ...withoutProne } = RULE_STATUS;
    // @ts-expect-error a record missing one rule unit is not a status record.
    const incomplete: { readonly [K in SrdRuleId]: RuleStatus } = withoutProne;
    // @ts-expect-error an executed rule names at least one witness.
    const unwitnessed: RuleStatus = { status: 'executed', witness: [] };
    // @ts-expect-error `unrepresented` names a planned unit, not a free string.
    const unknownUnit: RuleStatus = { status: 'unrepresented', unit: 'SOMEONE-LATER' };
    // @ts-expect-error a typed-only rule awaits at least one capability.
    const awaitsNothing: RuleStatus = { status: 'typed_only', awaiting: [] };
    expect([prone.status, Object.keys(incomplete).length, unwitnessed.status, unknownUnit.status, awaitsNothing.status])
      .toEqual(['unrepresented', SRD_RULE_IDS.length - 1, 'executed', 'unrepresented', 'typed_only']);
  });
});

describe('the rule coverage report', () => {
  it('counts every rule once, in the status the record gives it', () => {
    const coverage = ruleCoverage();
    expect(coverage.total).toBe(SRD_RULE_IDS.length);
    expect(RULE_STATUS_NAMES.reduce((sum, name) => sum + coverage.byStatus[name], 0)).toBe(SRD_RULE_IDS.length);
    for (const name of RULE_STATUS_NAMES) {
      expect(coverage.byStatus[name]).toBe(SRD_RULE_IDS.filter((id) => STATUS[id].status === name).length);
    }
    expect(Object.values(coverage.byOwner).reduce((sum, count) => sum + (count ?? 0), 0)).toBe(SRD_RULE_IDS.length);
    expect(formatRuleCoverage(coverage)).toContain('never a pinned expectation');
  });

  it('sends each unexecuted rule to the unit that owns its next step', () => {
    expect(nextOwner({ status: 'typed_only', awaiting: ['movement_modes'] })).toBe('MOVEMENT-MODES');
    expect(nextOwner({ status: 'partial', witness: ['tests/x.test.ts::y'], missing: [{ clause: 'condition.prone#1', awaiting: 'movement_cost_kinds' }] })).toBe('MOVE-COST');
    expect(nextOwner({ status: 'unrepresented', unit: 'SPELL-HEADERS' })).toBe('SPELL-HEADERS');
    expect(nextOwner({ status: 'excluded_by_owner', decision: 'D102' })).toBe('owner_decision');
    expect(nextOwner({ status: 'executed', witness: ['tests/x.test.ts::y'] })).toBe('none');
  });
});
