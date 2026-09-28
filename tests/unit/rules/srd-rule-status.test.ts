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
 * A passage of a rule's printed text: a quote, or the text from the first
 * printing of `from` through the next printing of `through`.
 */
type Passage = string | readonly [from: string, through: string];

/**
 * Where the SRD prints a MONSTER's XP, which is kept (its value, and the
 * encounter budgets spent in it: MON-TABLES, D922 Q7). The passages are quoted
 * by hand from the text, not found by a pattern. An XP mention inside one is a
 * monster's XP. Every other mention is character XP (D923 Q8) and must lie
 * inside an exclusion.
 * - The glossary's abbreviation list. Its two columns print "XP Experience
 *   … Point(s)".
 * - Combat Encounters: the XP budget (Step 2), spending it (Step 3), the three
 *   worked examples, and the troubleshooting note on 0 XP creatures.
 * - Parts of a Stat Block: the sentence on a monster's value, the sentence on
 *   a summoned monster's value, and the XP by CR table. It does NOT keep the
 *   sentence between the first two, which awards XP to the characters: that
 *   sentence is an excluded clause.
 * - The glossary's Stat Block: the CR entry's sentence on the XP printed after
 *   the CR, and its cross-reference to "Experience Points". A cross-reference
 *   is no clause (`uncoveredText` drops it too).
 * Every stat block's CR line is also monster XP (`CR_LINE`).
 */
const MONSTER_XP: { readonly [I in SrdRuleId]?: readonly Passage[] } = {
  'rule_section.rules-glossary': ['XP Experience'],
  'rule_section.gameplay-toolbox.combat-encounters': [
    ['Step 2: Determine Your XP Budget', 'for 46,000 XP total'],
    'Creatures that have a CR of 0, particularly ones that are worth 0 XP, should be used sparingly.',
  ],
  'rule_section.monsters.parts-of-a-stat-block': [
    'Experience Points The number of Experience Points (XP) a monster is worth is based on its CR, as detailed in the Experience Points by Challenge Rating table.',
    ['Unless a rule says otherwise, a monster summoned by a spell or another magical ability is worth the XP noted in its stat block.', '13 10,000 30 155,000'],
  ],
  'glossary.stat-block': [
    'The Experience Points characters receive for defeating a monster and its Proficiency Bonus follow.',
    'See also “Challenge Rating” and “Experience Points.”',
  ],
};

/**
 * A stat block's CR line, wherever it is printed (the Monsters chapter, a
 * spell, a magic item). These are the five shapes the SRD prints:
 * `CR 1/4 (XP 50; PB +2)`, `CR 10 (XP 5,900, or 7,200 in lair; PB +4)`,
 * `CR 3 (700 XP; PB +2)`, `CR None (XP 0; PB equals your Proficiency Bonus)`
 * and `CR None (XP 0; PB equals its summoner’s)`.
 */
const CR_LINE = /CR (?:\d+(?:\/\d+)?|None) \((?:XP [\d,]+(?:, or [\d,]+ in lair)?|[\d,]+ XP); PB (?:\+\d+|equals your Proficiency Bonus|equals its summoner’s)\)/g;

type TextRange = readonly [start: number, end: number];

/** Every printing of a quote in a text. */
function printings(text: string, quote: string): TextRange[] {
  const ranges: TextRange[] = [];
  for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) {
    ranges.push([at, at + quote.length]);
  }
  return ranges;
}

/** Where a passage is printed, or `null` when it is not. */
function passageRange(text: string, passage: Passage): TextRange | null {
  const [from, through] = typeof passage === 'string' ? [passage, passage] : passage;
  const start = text.indexOf(from);
  const end = start < 0 ? -1 : text.indexOf(through, start);
  return end < 0 ? null : [start, end + through.length];
}

/** Where a rule's text prints a monster's XP: its quoted passages and its CR lines. */
function monsterXpRanges(id: SrdRuleId, text: string): TextRange[] {
  const passages = (MONSTER_XP[id] ?? []).flatMap((passage): TextRange[] => {
    const range = passageRange(text, passage);
    return range === null ? [] : [range];
  });
  return [...passages, ...[...text.matchAll(CR_LINE)].map((line): TextRange => [line.index, line.index + line[0].length])];
}

function inside([start, end]: TextRange, ranges: readonly TextRange[]): boolean {
  return ranges.some(([from, to]) => start >= from && end <= to);
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
      const monsterXp = monsterXpRanges(id, text);
      for (const exclusion of Object.keys(MENTIONS) as OwnerExclusionId[]) {
        const whole = status.status === 'excluded_by_owner' && status.exclusion === exclusion;
        const mine = clauses.filter((clause) => clause.exclusion === exclusion);
        const excluded = mine.flatMap(({ clause }) => printings(text, clause));
        // Every mention lies inside the whole exclusion or one of its clauses;
        // an XP mention inside a monster's XP is kept instead.
        for (const mention of text.matchAll(MENTIONS[exclusion])) {
          const at: TextRange = [mention.index, mention.index + mention[0].length];
          if (exclusion === 'character_xp' && inside(at, monsterXp)) {
            continue;
          }
          const covered = whole || inside(at, excluded);
          expect({ id, exclusion, mention: mention[0], at: mention.index, covered }).toEqual({ id, exclusion, mention: mention[0], at: mention.index, covered: true });
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

  it('keeps a monster\'s XP only where it is printed: never inside an excluded clause, and never in a rule excluded whole', () => {
    // Each quoted passage is printed in its rule and names XP.
    for (const [id, passages] of Object.entries(MONSTER_XP) as [SrdRuleId, readonly Passage[]][]) {
      const text = ruleText(id);
      for (const passage of passages) {
        const range = passageRange(text, passage);
        const namesXp = range !== null && [...text.slice(range[0], range[1]).matchAll(MENTIONS.character_xp)].length > 0;
        expect({ id, passage, printed: range !== null, namesXp }).toEqual({ id, passage, printed: true, namesXp: true });
      }
    }
    // Parts of a Stat Block prints the award to the characters between two
    // kept passages, and inside neither.
    const parts = ruleText('rule_section.monsters.parts-of-a-stat-block');
    const award = parts.indexOf('XP is awarded for defeating the monster');
    expect({ printed: award >= 0, kept: inside([award, award + 'XP'.length], monsterXpRanges('rule_section.monsters.parts-of-a-stat-block', parts)) })
      .toEqual({ printed: true, kept: false });
    for (const id of SRD_RULE_IDS) {
      const status = STATUS[id];
      const text = ruleText(id);
      const monsterXp = monsterXpRanges(id, text);
      // A rule that prints a monster's XP is not excluded whole as character XP,
      if (monsterXp.length > 0) {
        expect({ id, excludedWholeAsCharacterXp: status.status === 'excluded_by_owner' && status.exclusion === 'character_xp' })
          .toEqual({ id, excludedWholeAsCharacterXp: false });
      }
      // and no clause it excludes overlaps what it keeps.
      for (const { clause } of excludedClauses(status)) {
        const overlaps = printings(text, clause).some(([start, end]) => monsterXp.some(([from, to]) => start < to && from < end));
        expect({ id, clause, overlapsMonsterXp: overlaps }).toEqual({ id, clause, overlapsMonsterXp: false });
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
