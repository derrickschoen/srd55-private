import { describe, expect, it } from 'vitest';
import bardList from '../../../docs/srd/source/bard-spell-list.txt?raw';
import clericList from '../../../docs/srd/source/cleric-spell-list.txt?raw';
import druidList from '../../../docs/srd/source/druid-spell-list.txt?raw';
import paladinList from '../../../docs/srd/source/paladin-spell-list.txt?raw';
import rangerList from '../../../docs/srd/source/ranger-spell-list.txt?raw';
import sorcererList from '../../../docs/srd/source/sorcerer-spell-list.txt?raw';
import spellDescriptionsText from '../../../docs/srd/source/spell-descriptions.txt?raw';
import warlockList from '../../../docs/srd/source/warlock-spell-list.txt?raw';
import wizardList from '../../../docs/srd/source/wizard-spell-list.txt?raw';
import { asProse, ruleText, spanLines } from '../../helpers/srd-rule-evidence';
import { DIFFICULT_TERRAIN_APPLIES_WHILE_FLYING, DIFFICULT_TERRAIN_TAGS } from '../../../src/domain/srd-vocabulary';
import { OWNER_RULINGS, rulingsFor, type OwnerRuling } from '../../../src/rules/srd/owner-rulings';
import { SRD_RULE_IDS, SRD_RULE_INDEX, type SrdRuleId, type SrdRuleIdOfKind } from '../../../src/rules/srd/rule-index';
import type { SrdSpan } from '../../../src/rules/srd/rule-index-types';
import { OWNER_RULING_IDS, UNIT_IDS } from '../../../src/rules/srd/rule-status-types';

/**
 * THE OWNER'S RULINGS (D921–D922) AGAINST THE SRD TEXT THEY DECIDE.
 *
 * A ruling's quoted clause must be text its rule prints. A source resolution's
 * disagreements are re-derived here from the SRD, over EVERY spell and EVERY
 * stat block, and must equal the list the ruling carries: a disagreement the
 * list misses fails this test, so no source conflict is resolved by accident.
 */

const INDEX = SRD_RULE_INDEX as Readonly<Record<SrdRuleId, { readonly kind: string; readonly name: string; readonly spans: readonly SrdSpan[] }>>;
const RULINGS = OWNER_RULINGS as { readonly [R in keyof typeof OWNER_RULINGS]: OwnerRuling<R> };

function idsOfKind<K extends string>(kind: K): SrdRuleId[] {
  return SRD_RULE_IDS.filter((id) => INDEX[id].kind === kind);
}

const LIST_FILES = {
  'spell_list.bard': bardList,
  'spell_list.cleric': clericList,
  'spell_list.druid': druidList,
  'spell_list.paladin': paladinList,
  'spell_list.ranger': rangerList,
  'spell_list.sorcerer': sorcererList,
  'spell_list.warlock': warlockList,
  'spell_list.wizard': wizardList,
} as const satisfies Readonly<Record<SrdRuleIdOfKind<'spell_list'>, string>>;
type ListId = keyof typeof LIST_FILES;

describe('OWNER_RULINGS', () => {
  it('holds one ruling per ruling id, each on rules the index holds, executed by a planned unit', () => {
    expect(Object.keys(OWNER_RULINGS)).toEqual([...OWNER_RULING_IDS]);
    for (const id of OWNER_RULING_IDS) {
      const ruling = RULINGS[id];
      expect(ruling.id).toBe(id);
      expect(ruling.decision).toMatch(/^D92[12]$/);
      for (const rule of ruling.rules) {
        expect(rulingsFor(rule)).toContain(id);
      }
      for (const unit of ruling.executedBy) {
        expect(UNIT_IDS).toContain(unit);
      }
    }
  });

  it('quotes the clause each ruling decides from that rule\'s printed text', () => {
    for (const id of OWNER_RULING_IDS) {
      const { concerns, kind, rules } = RULINGS[id];
      if (concerns === null) {
        expect({ id, kind }).toEqual({ id, kind: 'source_resolution' });
        continue;
      }
      expect(rules).toContain(concerns.rule);
      expect({ id, printed: ruleText(concerns.rule).includes(concerns.quote) }).toEqual({ id, printed: true });
    }
  });

  it('tags flyers\' difficult terrain ground, volume or creature, ignoring only ground (D921 Q3)', () => {
    expect(RULINGS['flyer-terrain-tags'].data.tags).toBe(DIFFICULT_TERRAIN_TAGS);
    expect(Object.entries(DIFFICULT_TERRAIN_APPLIES_WHILE_FLYING)).toEqual([['ground', false], ['volume', true], ['creature', true]]);
    // The SRD's Flying entry says nothing of terrain, which is why it is a house rule.
    expect(ruleText('glossary.flying')).not.toMatch(/Terrain/i);
  });
});

describe('the spell-class union (D922 Q5, Q6)', () => {
  it('resolves exactly the spells whose header and the class lists disagree, as their union', () => {
    const schools = 'Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation';
    const listed = new Map<string, Set<ListId>>();
    for (const [list, text] of Object.entries(LIST_FILES) as [ListId, string][]) {
      for (const line of text.split('\n')) {
        const name = new RegExp(`^\\s*(\\S.*?)\\s{2,}(?:${schools})\\s{2,}\\S`).exec(line)?.[1];
        if (name !== undefined) {
          listed.set(name, (listed.get(name) ?? new Set()).add(list));
        }
      }
    }
    const byClass = new Map(Object.keys(LIST_FILES).map((list) => [INDEX[list as ListId].name.replace(/ Spell List$/, ''), list as ListId]));
    const lines = spellDescriptionsText.split('\n');
    const derived: { spell: SrdRuleId; line: number; header: ListId[]; lists: ListId[] }[] = [];
    for (const spell of idsOfKind('spell')) {
      const [span] = INDEX[spell].spans;
      const from = Number(/:(\d+)-/.exec(span ?? '')?.[1]);
      // The level-and-school line under the name: "(Class, Class, …)".
      const at = lines.findIndex((line, index) => index >= from && /^\s*(?:Level [1-9] [A-Z][a-z]+|[A-Z][a-z]+ Cantrip) \(/.test(line));
      // A header can wrap, with a blank line between its two halves.
      const classes = /\(([^)]*)\)/.exec(asProse(lines.slice(at, at + 4).filter((line) => line.trim() !== '')))?.[1] ?? '';
      const header = classes.split(',').map((name) => byClass.get(name.trim())).filter((list): list is ListId => list !== undefined).sort();
      const lists = [...(listed.get(INDEX[spell].name) ?? [])].sort();
      if (header.join() !== lists.join()) {
        derived.push({ spell, line: at + 1, header, lists });
      }
    }
    const { data } = RULINGS['spell-classes-union'];
    expect(data.disagreements.map(({ spell, header, lists }) => ({ spell, header: [...header.classes], lists: [...lists] })))
      .toEqual(derived.map(({ spell, header, lists }) => ({ spell, header, lists })));
    for (const disagreement of data.disagreements) {
      expect(disagreement.header.span).toBe(`docs/srd/source/spell-descriptions.txt:${String(derived.find(({ spell }) => spell === disagreement.spell)?.line)}-${String(derived.find(({ spell }) => spell === disagreement.spell)?.line)}`);
      expect([...disagreement.classes]).toEqual([...new Set([...disagreement.header.classes, ...disagreement.lists])].sort());
    }
    // Hand-checked against the header lines (spell-descriptions.txt:5399, 5699):
    // Mind Spike goes to Sorcerer, Warlock and Wizard; Phantasmal Force to
    // Bard, Sorcerer and Wizard.
    expect(data.disagreements.map(({ spell, classes }) => [spell, classes])).toEqual([
      ['spell.mind-spike', ['spell_list.sorcerer', 'spell_list.warlock', 'spell_list.wizard']],
      ['spell.phantasmal-force', ['spell_list.bard', 'spell_list.sorcerer', 'spell_list.wizard']],
    ]);
  });
});

describe('the highest XP (D922 Q7)', () => {
  it('resolves exactly the stat blocks whose printed XP differs from the table, to the higher', () => {
    // The Experience Points by Challenge Rating table (Monsters, printed page
    // 256): CR 0 to 10 and 14 to 27 at the foot of the left column, CR 11 to 13
    // and 28 to 30 continued at the head of the right. Rows print "CR XP CR XP".
    const table = new Map<string, string>();
    const tableSpans = ['docs/srd/full/srd-5.2.1.txt:16668-16690@left', 'docs/srd/full/srd-5.2.1.txt:16631-16635@right'] as const;
    const tableLines = tableSpans.flatMap((span) => spanLines(span));
    // Both halves are Parts of a Stat Block's text, which the ruling names.
    const section = INDEX['rule_section.monsters.parts-of-a-stat-block'].spans.flatMap((span) => spanLines(span));
    for (const line of tableLines) {
      expect({ line, inSection: section.includes(line) }).toEqual({ line, inSection: true });
    }
    expect(RULINGS['xp-highest-wins'].rules).toContain('rule_section.monsters.parts-of-a-stat-block');
    for (const row of tableLines) {
      const match = /^(\d+(?:\/\d)?)\s+(0 or 10|[\d,]+)\s+(\d+)\s+([\d,]+)$/.exec(row);
      if (match !== null) {
        table.set(match[1] ?? '', match[2] ?? '');
        table.set(match[3] ?? '', match[4] ?? '');
      }
    }
    expect(table.size).toBe(34);
    const xp = (text: string): number => Number(text.replaceAll(',', ''));
    const derived: { statBlock: SrdRuleId; printed: number; table: number }[] = [];
    for (const statBlock of idsOfKind('stat_block')) {
      const lines = INDEX[statBlock].spans.flatMap((span) => spanLines(span));
      const cr = lines.map((line) => /^CR (\S+) \(XP ([\d,]+)/.exec(line)).find((match) => match !== null);
      const listed = cr === undefined || cr === null ? undefined : table.get(cr[1] ?? '');
      if (cr === undefined || cr === null || listed === undefined || listed === '0 or 10') {
        continue;
      }
      if (xp(cr[2] ?? '') !== xp(listed)) {
        derived.push({ statBlock, printed: xp(cr[2] ?? ''), table: xp(listed) });
      }
    }
    const { data } = RULINGS['xp-highest-wins'];
    expect(data.disagreements.map(({ statBlock, printed, table: row }) => ({ statBlock, printed: printed.xp, table: row.xp })))
      .toEqual(derived);
    for (const disagreement of data.disagreements) {
      expect(disagreement.xp).toBe(Math.max(disagreement.printed.xp, disagreement.table.xp));
      expect(spanLines(disagreement.printed.span).join(' ')).toContain(`XP ${disagreement.printed.xp.toLocaleString('en-US')}`);
      expect(spanLines(disagreement.table.span).join(' ')).toMatch(new RegExp(`\\b${disagreement.table.xp.toLocaleString('en-US')}\\b`));
    }
    // Hand-checked: the Archmage prints "CR 12 (XP 8,000; PB +4)"; the table's
    // CR 12 row prints 8,400.
    expect(data.disagreements.map(({ statBlock, xp: chosen }) => [statBlock, chosen])).toEqual([['stat_block.archmage', 8_400]]);
  });
});
