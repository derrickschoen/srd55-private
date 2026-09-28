import { describe, expect, it } from 'vitest';
import {
  compact,
  declarationText,
  isPositiveAssertion,
  ruleText,
  testAssertions,
  uncoveredText,
} from '../../helpers/srd-rule-evidence';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';
import { excludedClauses, formatRuleCoverage, nextOwner, ruleCoverage } from '../../../src/rules/srd/rule-coverage';
import { SRD_RULE_IDS, SRD_RULE_INDEX, type SrdRuleId } from '../../../src/rules/srd/rule-index';
import { RULE_STATUS } from '../../../src/rules/srd/rule-status';
import {
  CAPABILITIES,
  CAPABILITY_OWNER,
  OWNER_EXCLUSIONS,
  RULE_STATUS_NAMES,
  UNIT_IDS,
  type ClauseQuote,
  type OwnerExclusionId,
  type RuleStatus,
  type RuleStatusRecord,
  type TypedClause,
  type Witness,
} from '../../../src/rules/srd/rule-status-types';

/**
 * RULE_STATUS: exhaustive (a compile-time fact, probed below), and every
 * status other than `unrepresented` proven by what it cites, not by the
 * citation existing:
 * - its clause quotes are the rule's own printed text and cover all of it;
 * - each `executed` clause's assertion is a positive `expect(…)` statement of
 *   the named test's own body, in a test that runs;
 * - each `typed_only` clause's fact is text of the named declaration.
 * The coverage matrix is checked for consistency with the record, never pinned
 * to numbers.
 */

const STATUS = RULE_STATUS as RuleStatusRecord;
const ROOT = process.cwd();

/**
 * The quotes of a status that claims the whole rule, which must cover all of
 * its text: its executed, missing or typed clauses and the clauses the owner
 * excluded. `unrepresented` claims nothing (its excluded clauses are checked
 * on their own).
 */
function quotesOf(status: RuleStatus): readonly ClauseQuote[] {
  const excluded = excludedClauses(status).map(({ clause }) => clause);
  switch (status.status) {
    case 'executed':
      return [...status.clauses.map(({ clause }) => clause), ...excluded];
    case 'partial':
      return [...status.executed.map(({ clause }) => clause), ...status.missing.map(({ clause }) => clause), ...excluded];
    case 'typed_only':
      return [...status.clauses.map(({ clause }) => clause), ...excluded];
    case 'excluded_by_owner':
    case 'not_executable':
    case 'source_disagreement':
    case 'unrepresented':
      return [];
  }
}

function witnessesOf(status: RuleStatus): readonly Witness[] {
  switch (status.status) {
    case 'executed':
      return status.clauses.flatMap(({ witness }) => witness);
    case 'partial':
      return status.executed.flatMap(({ witness }) => witness);
    case 'typed_only':
    case 'excluded_by_owner':
    case 'not_executable':
    case 'source_disagreement':
    case 'unrepresented':
      return [];
  }
}

function typedClausesOf(status: RuleStatus): readonly TypedClause[] {
  switch (status.status) {
    case 'typed_only':
      return status.clauses;
    case 'executed':
    case 'partial':
    case 'excluded_by_owner':
    case 'not_executable':
    case 'source_disagreement':
    case 'unrepresented':
      return [];
  }
}

/** Why a witness does not prove its clause, or null when it does. */
function witnessFault({ test, asserts }: Witness, root = ROOT): string | null {
  const separator = test.indexOf('::');
  const file = test.slice(0, separator);
  const title = test.slice(separator + 2);
  if (!existsSync(`${root}/${file}`)) {
    return 'no such test file';
  }
  const found = testAssertions(readFileSync(`${root}/${file}`, 'utf8'), title);
  if (!found.found) {
    return 'no test with that title';
  }
  if (!found.runs) {
    return 'the test is skipped';
  }
  if (!isPositiveAssertion(asserts)) {
    return 'the assertion proves an absence';
  }
  return found.expects.includes(compact(asserts)) ? null : 'the assertion is not a statement of that test';
}

/**
 * Why a typed clause is not typed where it says, or null when it is. The fact
 * must be text of the named declaration AND name its rule: the rule's printed
 * name is a key (`Deafened:`) or a literal (`'Deafened'`) of the quoted text,
 * so the type holding the fact is the rule's own. A fact found in a union
 * whose members any name could carry (the RULE-INDEX r2 P2: a manifest row
 * typing `condition` and `mechanics` independently) proves nothing about the
 * rule.
 */
function typedFault(rule: SrdRuleId, { typedAt, fact }: TypedClause, root = ROOT): string | null {
  const [file = '', name = ''] = typedAt.split('#');
  if (!existsSync(`${root}/${file}`)) {
    return 'no such source file';
  }
  const declaration = declarationText(readFileSync(`${root}/${file}`, 'utf8'), name);
  if (declaration === null) {
    return 'no declaration with that name';
  }
  if (!compact(declaration).includes(compact(fact))) {
    return 'the fact is not in that declaration';
  }
  const printed = compact(SRD_RULE_INDEX[rule].name);
  const quoted = compact(fact);
  return [`${printed}:`, `'${printed}'`, `"${printed}"`].some((form) => quoted.includes(form)) ? null : 'the fact does not name its rule';
}

const CLAIMING = SRD_RULE_IDS.filter((id) => quotesOf(STATUS[id]).length > 0);

describe('RULE_STATUS', () => {
  it('holds one status for every rule unit and nothing else', () => {
    expect(Object.keys(RULE_STATUS).sort()).toEqual([...SRD_RULE_IDS].sort());
  });

  it('quotes only text each rule prints, and every clause of it', () => {
    expect(CLAIMING.length).toBeGreaterThan(0);
    for (const id of CLAIMING) {
      const text = ruleText(id);
      const quotes = quotesOf(STATUS[id]);
      for (const quote of quotes) {
        expect({ id, quote, printed: text.includes(quote) }).toEqual({ id, quote, printed: true });
      }
      expect({ id, uncovered: uncoveredText(id, quotes) }).toEqual({ id, uncovered: '' });
    }
  });

  it('finds each witness assertion inside its named, running test', () => {
    const witnesses = SRD_RULE_IDS.flatMap((id) => witnessesOf(STATUS[id]).map((witness) => ({ id, witness })));
    expect(witnesses.length).toBeGreaterThan(0);
    for (const { id, witness } of witnesses) {
      expect({ id, test: witness.test, fault: witnessFault(witness) }).toEqual({ id, test: witness.test, fault: null });
    }
  });

  it('finds each typed fact inside its named declaration', () => {
    const typed = SRD_RULE_IDS.flatMap((id) => typedClausesOf(STATUS[id]).map((clause) => ({ id, clause })));
    expect(typed.length).toBeGreaterThan(0);
    for (const { id, clause } of typed) {
      expect({ id, typedAt: clause.typedAt, fault: typedFault(id, clause) }).toEqual({ id, typedAt: clause.typedAt, fault: null });
    }
  });

  it('keeps each status\'s invariant', () => {
    for (const id of SRD_RULE_IDS) {
      const status = STATUS[id];
      switch (status.status) {
        case 'executed':
          expect(status.clauses.every(({ witness }) => witness.length > 0)).toBe(true);
          break;
        case 'partial':
          for (const { awaiting } of status.missing) {
            expect(CAPABILITIES).toContain(awaiting);
          }
          break;
        case 'typed_only':
          for (const capability of status.awaiting) {
            expect(UNIT_IDS).toContain(CAPABILITY_OWNER[capability]);
          }
          break;
        case 'excluded_by_owner':
          expect(Object.keys(OWNER_EXCLUSIONS)).toContain(status.exclusion);
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

  it('refuses a quote the rule does not print, or one that leaves a clause out', () => {
    const text = ruleText('glossary.advantage');
    expect(text.includes('roll three d20s, and use the highest roll.')).toBe(false);
    // Two of the three clauses: the cancellation is left unquoted.
    expect(uncoveredText('glossary.advantage', [
      'If you have Advantage on a D20 Test, roll two d20s, and use the higher roll.',
      'A roll can’t be affected by more than one Advantage',
    ])).toBe('Advantage Disadvantage on the same roll cancel each other');
    // Burrow Speed's restrictions: a speed type quotes none of them.
    expect(uncoveredText('glossary.burrow-speed', [])).toContain('can’t burrow through solid rock');
  });

  it('refuses a witness that does not prove its clause', () => {
    const queue = 'tests/unit/combat/death-saves.test.ts::queues a closed death_save PendingDecision at the start of a dying PC turn' as const;
    const resolved = 'expect(result.event).toMatchObject({ roll, outcome, successes, failures, lifeState: life, stableRecovery: null })' as const;
    // The resolution assertion is not a statement of the queue test.
    expect(witnessFault({ test: queue, asserts: resolved })).toBe('the assertion is not a statement of that test');
    // The queue test's own absence check proves nothing happened.
    expect(witnessFault({ test: queue, asserts: "expect(started.events.some((event) => event.type === 'death_save_resolved')).toBe(false)" }))
      .toBe('the assertion proves an absence');
    expect(witnessFault({ test: 'tests/unit/combat/death-saves.test.ts::queues a closed death_save PendingDecision at the start of a dying NPC turn', asserts: resolved }))
      .toBe('no test with that title');
    expect(witnessFault({ test: 'tests/unit/combat/no-such-file.test.ts::x', asserts: resolved })).toBe('no such test file');
    // A negated or emptiness matcher states an absence, whatever it names.
    expect(isPositiveAssertion('expect(result.event).not.toMatchObject({ outcome })')).toBe(false);
    expect(isPositiveAssertion('expect(started.pendingDecisions).toHaveLength(0)')).toBe(false);
    expect(isPositiveAssertion(resolved)).toBe(true);
    // A skipped test, or a test inside a skipped describe, witnesses nothing.
    expect(testAssertions("describe.skip('d', () => { it('t', () => { expect(1).toBe(1); }); });", 't'))
      .toEqual({ found: true, runs: false, expects: ['expect(1).toBe(1)'] });
    expect(testAssertions("it.todo('t', () => { expect(1).toBe(1); });", 't').runs).toBe(false);
    expect(testAssertions("it.each([[1]])('t %i', (n) => { expect(n).toBe(1); });", 't %i'))
      .toEqual({ found: true, runs: true, expects: ['expect(n).toBe(1)'] });
  });

  it('refuses a typed fact its declaration does not hold, or one not tied to its rule', () => {
    const deafened = 'condition.deafened' as const;
    expect(typedFault(deafened, { clause: 'x', typedAt: 'src/combat/conditions.ts#ConditionMechanicsOf', fact: "readonly Deafened: { readonly kind: 'deafened'; readonly cannotHear: false; };" }))
      .toBe('the fact is not in that declaration');
    expect(typedFault(deafened, { clause: 'x', typedAt: 'src/combat/conditions.ts#NoSuchDeclaration', fact: 'x' })).toBe('no declaration with that name');
    // Round 1's quotation: the member's text, found, but not the member any
    // row named Deafened must carry.
    expect(typedFault(deafened, { clause: 'x', typedAt: 'src/combat/conditions.ts#ConditionMechanicsOf', fact: "readonly kind: 'deafened'; readonly cannotHear: true; readonly automaticallyFailsHearingChecks: true;" }))
      .toBe('the fact does not name its rule');
    // Another rule's member does not type this one.
    expect(typedFault('condition.blinded', { clause: 'x', typedAt: 'src/combat/conditions.ts#ConditionMechanicsOf', fact: "readonly Deafened: { readonly kind: 'deafened'; readonly cannotHear: true; readonly automaticallyFailsHearingChecks: true; };" }))
      .toBe('the fact does not name its rule');
  });

  it('is exhaustive over SrdRuleId, and refuses an unproven status, at compile time', () => {
    const { 'condition.prone': prone, ...withoutProne } = RULE_STATUS;
    // @ts-expect-error a record missing one rule unit is not a status record.
    const incomplete: RuleStatusRecord = withoutProne;
    // @ts-expect-error an executed rule quotes at least one clause.
    const unwitnessed: RuleStatus = { status: 'executed', clauses: [] };
    // @ts-expect-error an executed clause names at least one witness.
    const unproven: RuleStatus = { status: 'executed', clauses: [{ clause: 'x', witness: [] }] };
    const notAnAssertion: RuleStatus = {
      status: 'executed',
      // @ts-expect-error a witness quotes an `expect(…)` statement, not any code.
      clauses: [{ clause: 'x', witness: [{ test: 'tests/x.test.ts::y', asserts: 'rollD20(rng)' }] }],
    };
    // @ts-expect-error `unrepresented` names a planned unit, not a free string.
    const unknownUnit: RuleStatus = { status: 'unrepresented', unit: 'SOMEONE-LATER' };
    // @ts-expect-error a typed-only rule quotes its typed clauses.
    const untyped: RuleStatus = { status: 'typed_only', awaiting: ['movement_modes'] };
    const typedNowhere: RuleStatus = {
      status: 'typed_only',
      // @ts-expect-error a typed clause names a source declaration.
      clauses: [{ clause: 'x', typedAt: 'docs/notes.md#x', fact: 'x' }],
      awaiting: ['movement_modes'],
    };
    expect([prone.status, Object.keys(incomplete).length, unwitnessed.status, unproven.status, notAnAssertion.status, unknownUnit.status, untyped.status, typedNowhere.status])
      .toEqual(['unrepresented', SRD_RULE_IDS.length - 1, 'executed', 'executed', 'executed', 'unrepresented', 'typed_only', 'typed_only']);
  });
});

/* ==========================================================================
 * THE OWNER'S EXCLUSIONS (D923 Q8). Each is re-derived from the printed text:
 * every rule that names an excluded mechanic is excluded whole, or quotes the
 * clause that names it, and nothing is excluded that does not name it.
 * ========================================================================== */

/** How the SRD names each excluded mechanic in a rule's text. */
const MENTIONS: { readonly [E in OwnerExclusionId]: RegExp } = {
  encumbrance: /carrying capacit/gi,
  character_xp: /\bXP\b|Experience Points?\b/g,
  random_generation: /Random Generation|roll once on the Trinkets table/g,
  // A background's printed feat, and the rule that it is fixed.
  fixed_background_feat: /specified Origin feat|Feat: [A-Z][^“]*\(see “Feats”\)/g,
};

/**
 * Rules that print a MONSTER's XP, which is kept (its value, the encounter
 * budgets spent in it: MON-TABLES, D922 Q7), hand-listed with why: the
 * glossary's abbreviation list ("XP Experience"), the XP budgets of Combat
 * Encounters, Parts of a Stat Block (its value and the XP table; the award to
 * characters is excluded there as a clause), the glossary's description of a
 * stat block's XP entry, and every stat block, including the ones printed in
 * spells ("CR None (XP 0; …)").
 */
function printsMonsterXp(id: SrdRuleId): boolean {
  const monsterXp: readonly SrdRuleId[] = [
    'rule_section.rules-glossary',
    'rule_section.gameplay-toolbox.combat-encounters',
    'rule_section.monsters.parts-of-a-stat-block',
    'glossary.stat-block',
  ];
  return monsterXp.includes(id) || SRD_RULE_INDEX[id].kind === 'stat_block' || SRD_RULE_INDEX[id].kind === 'spell';
}

describe('the owner\'s exclusions (D923 Q8)', () => {
  it('are the four mechanics D923 kept out, each citing D923 and the decision it upholds', () => {
    expect(Object.entries(OWNER_EXCLUSIONS).map(([id, { decisions }]) => [id, [...decisions]])).toEqual([
      ['encumbrance', ['D923', 'D86']],
      ['character_xp', ['D923', 'D142']],
      ['random_generation', ['D923', 'D55']],
      ['fixed_background_feat', ['D923', 'D61']],
    ]);
  });

  it('quotes each excluded clause from its rule\'s printed text', () => {
    const excluded = SRD_RULE_IDS.flatMap((id) => excludedClauses(STATUS[id]).map((clause) => ({ id, clause })));
    expect(excluded.length).toBeGreaterThan(0);
    for (const { id, clause } of excluded) {
      expect({ id, clause: clause.clause, printed: ruleText(id).includes(clause.clause) }).toEqual({ id, clause: clause.clause, printed: true });
    }
  });

  it('marks every rule that names an excluded mechanic, where it names it, and only there', () => {
    for (const id of SRD_RULE_IDS) {
      const status = STATUS[id];
      const text = ruleText(id);
      const clauses = excludedClauses(status);
      for (const exclusion of Object.keys(MENTIONS) as OwnerExclusionId[]) {
        const whole = status.status === 'excluded_by_owner' && status.exclusion === exclusion;
        const mine = clauses.filter((clause) => clause.exclusion === exclusion);
        // Every mention lies inside the whole exclusion or one of its clauses.
        if (!(exclusion === 'character_xp' && printsMonsterXp(id))) {
          for (const mention of text.matchAll(MENTIONS[exclusion])) {
            const covered = whole || mine.some(({ clause }) => {
              for (let at = text.indexOf(clause); at >= 0; at = text.indexOf(clause, at + 1)) {
                if (mention.index >= at && mention.index + mention[0].length <= at + clause.length) {
                  return true;
                }
              }
              return false;
            });
            expect({ id, exclusion, mention: mention[0], covered }).toEqual({ id, exclusion, mention: mention[0], covered: true });
          }
        }
        // And nothing is excluded that does not name the mechanic.
        if (whole) {
          expect({ id, exclusion, named: [...text.matchAll(MENTIONS[exclusion])].length > 0 }).toEqual({ id, exclusion, named: true });
        }
        for (const { clause } of mine) {
          expect({ id, clause, named: [...clause.matchAll(MENTIONS[exclusion])].length > 0 }).toEqual({ id, clause, named: true });
        }
      }
    }
  });

  it('leaves what D923 moved into execution unrepresented with its unit: tools and languages, coins and costs', () => {
    const units = (ids: readonly SrdRuleId[]): string[] => [...new Set(ids.map((id) => {
      const status = STATUS[id];
      return status.status === 'unrepresented' ? status.unit : status.status;
    }))];
    expect(units([...SRD_RULE_IDS.filter((id) => id.startsWith('tool.')), 'rule_section.equipment.tools'])).toEqual(['TOOLS-LANGUAGES']);
    expect(units([...SRD_RULE_IDS.filter((id) => id.startsWith('adventuring_gear.')), 'rule_section.equipment.coins', 'rule_section.equipment.adventuring-gear']))
      .toEqual(['COINS-COSTS']);
    // No rule is excluded for its tools, languages, coins or prices.
    expect(Object.keys(OWNER_EXCLUSIONS).filter((id) => /tool|language|coin|cost|gold|price/.test(id))).toEqual([]);
  });
});

describe('the rule coverage report', () => {
  it('counts every rule once, in the status the record gives it', () => {
    const coverage = ruleCoverage();
    expect(coverage.total).toBe(SRD_RULE_IDS.length);
    expect(RULE_STATUS_NAMES.reduce((sum, name) => sum + coverage.byStatus[name], 0)).toBe(SRD_RULE_IDS.length);
    for (const name of RULE_STATUS_NAMES) {
      expect(coverage.byStatus[name]).toBe(SRD_RULE_IDS.filter((id: SrdRuleId) => STATUS[id].status === name).length);
    }
    expect(Object.values(coverage.byOwner).reduce((sum, count) => sum + (count ?? 0), 0)).toBe(SRD_RULE_IDS.length);
    expect(formatRuleCoverage(coverage)).toContain('never a pinned expectation');
  });

  it('sends each unexecuted rule to the unit that owns its next step', () => {
    const witness = { test: 'tests/x.test.ts::y', asserts: 'expect(y).toBe(1)' } as const;
    expect(nextOwner({ status: 'typed_only', clauses: [{ clause: 'x', typedAt: 'src/x.ts#X', fact: 'x' }], awaiting: ['movement_modes'] }))
      .toBe('MOVEMENT-MODES');
    expect(nextOwner({ status: 'typed_only', clauses: [{ clause: 'x', typedAt: 'src/x.ts#X', fact: 'x' }], awaiting: ['perception_filters'] }))
      .toBe('PERCEPTION');
    expect(nextOwner({ status: 'partial', executed: [{ clause: 'x', witness: [witness] }], missing: [{ clause: 'y', awaiting: 'movement_cost_kinds' }] }))
      .toBe('MOVE-COST');
    expect(nextOwner({ status: 'unrepresented', unit: 'SPELL-HEADERS' })).toBe('SPELL-HEADERS');
    expect(nextOwner({ status: 'excluded_by_owner', exclusion: 'encumbrance' })).toBe('owner_decision');
    expect(nextOwner({ status: 'unrepresented', unit: 'CLASS-TABLES', excluded: [{ clause: 'x', exclusion: 'character_xp' }] })).toBe('CLASS-TABLES');
    expect(nextOwner({ status: 'source_disagreement', spans: ['docs/srd/source/a.txt:1-1', 'docs/srd/source/b.txt:1-1'], ruling: null }))
      .toBe('owner_decision');
    expect(nextOwner({ status: 'source_disagreement', spans: ['docs/srd/source/a.txt:1-1', 'docs/srd/source/b.txt:1-1'], ruling: 'spell-classes-union' }))
      .toBe('SPELL-HEADERS');
    expect(nextOwner({ status: 'executed', clauses: [{ clause: 'x', witness: [witness] }] })).toBe('none');
  });
});
