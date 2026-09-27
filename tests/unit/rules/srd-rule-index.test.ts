import { describe, expect, it } from 'vitest';
import armorTableText from '../../../docs/srd/source/armor-table.txt?raw';
import spellDescriptionsText from '../../../docs/srd/source/spell-descriptions.txt?raw';
import weaponsTableText from '../../../docs/srd/source/weapons-table.txt?raw';
import bardList from '../../../docs/srd/source/bard-spell-list.txt?raw';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import clericList from '../../../docs/srd/source/cleric-spell-list.txt?raw';
import druidList from '../../../docs/srd/source/druid-spell-list.txt?raw';
import paladinList from '../../../docs/srd/source/paladin-spell-list.txt?raw';
import rangerList from '../../../docs/srd/source/ranger-spell-list.txt?raw';
import sorcererList from '../../../docs/srd/source/sorcerer-spell-list.txt?raw';
import warlockList from '../../../docs/srd/source/warlock-spell-list.txt?raw';
import wizardList from '../../../docs/srd/source/wizard-spell-list.txt?raw';
import fullSrd from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import { srdReadingOrder } from '../../../scripts/srd/srd-columns';
import { weaponMasteryProperties } from '../../../src/domain/enums';
import {
  isSrdRuleId,
  SRD_RULE_IDS,
  SRD_RULE_INDEX,
  type SrdRuleId,
  type SrdRuleIdOfKind,
} from '../../../src/rules/srd/rule-index';
import { SRD_RULE_KINDS, type SrdRuleKind } from '../../../src/rules/srd/rule-index-types';

/**
 * INDEPENDENT PINS FOR THE GENERATED RULE INDEX.
 *
 * Every expectation below comes from a derivation OTHER than the generator
 * (scripts/srd/rule-index.ts): the SRD's own lists (Contents, the Index of
 * Stat Blocks, a glossary entry naming its family, the class Features tables,
 * the class spell lists), a raw-line count that never splits columns, an
 * existing typed vocabulary, or the SRD-TYPED census counts
 * (.tmp/runs/srd-typed/synthesis/report.md §2, §6.3, verified there). None is
 * copied from the generated file, so a generator that drops, doubles or
 * misnames a unit fails here even though its drift test is green.
 */

const LINES = fullSrd.split('\n');
const INDEX = SRD_RULE_INDEX as Readonly<Record<SrdRuleId, { readonly kind: SrdRuleKind; readonly name: string; readonly spans: readonly string[]; readonly parent?: string }>>;

function entriesOf(kind: SrdRuleKind): { readonly id: SrdRuleId; readonly name: string; readonly spans: readonly string[]; readonly parent?: string }[] {
  return SRD_RULE_IDS.filter((id) => INDEX[id].kind === kind).map((id) => ({ id, ...INDEX[id] }));
}

function namesOf(kind: SrdRuleKind): string[] {
  return entriesOf(kind).map(({ name }) => name).sort();
}

describe('SRD_RULE_INDEX independent counts', () => {
  it('holds the census count of every enumerable catalogue', () => {
    // Census (synthesis §2 and §6.3 unit 1), each re-derived there by a parser
    // other than this generator. Two corrections, both findings of this unit:
    // - glossary entries are 155, not 156: the census counted the caption of
    //   the "Influence Checks" table (srd:11870, introduced at srd:11860-11861
    //   as "The Influence Checks table") as an entry;
    // - class features are counted per printed `Level N:` heading (below),
    //   not as the census's 137 distinct names per class table.
    const counts: Partial<Record<SrdRuleKind, number>> = {
      condition: 15,
      action: 12,
      area_of_effect: 6,
      attitude: 3,
      hazard: 5,
      class: 12,
      subclass: 12,
      subclass_feature: 58,
      spell_list: 8,
      species: 9,
      species_trait: 33,
      background: 4,
      feat: 17,
      weapon: 38,
      armor: 13,
      weapon_property: 10,
      weapon_mastery: 8,
      tool: 25,
      adventuring_gear: 81,
      spell: 339,
      stat_block: 336,
      magic_item: 258,
      environmental_effect: 9,
      trap: 8,
      poison: 14,
      magical_contagion: 3,
    };
    for (const [kind, count] of Object.entries(counts)) {
      expect({ kind, count: entriesOf(kind as SrdRuleKind).length }).toEqual({ kind, count });
    }
    const glossaryFamily: readonly SrdRuleKind[] = ['glossary', 'condition', 'action', 'area_of_effect', 'attitude', 'hazard'];
    expect(glossaryFamily.reduce((sum, kind) => sum + entriesOf(kind).length, 0)).toBe(155);
    // Metamagic options 10 (census), Eldritch Invocations 28 (census "about 28").
    expect(entriesOf('class_option').filter(({ id }) => id.startsWith('class_option.sorcerer.'))).toHaveLength(10);
    expect(entriesOf('class_option').filter(({ id }) => id.startsWith('class_option.warlock.'))).toHaveLength(28);
  });

  it('counts one class feature per printed Level heading outside the subclass sections', () => {
    // A raw-line count that never splits columns: every `Level N: Name` heading
    // printed between the Classes chapter and Character Origins, less the 58
    // subclass feature headings.
    // The Classes chapter is printed pages 28-82: after page 27's running
    // footer, through page 82's.
    const footer = (page: number): number => LINES.findIndex((line) => new RegExp(`^\\s*${String(page)}\\s+System Reference Document 5\\.2\\.1\\s*$`).test(line));
    const headings = LINES.slice(footer(27) + 1, footer(82))
      .flatMap((line) => [...line.matchAll(/(?:^|\s{2,})Level \d{1,2}: \S/g)]).length;
    expect(headings - 58).toBe(entriesOf('class_feature').length);
    expect(entriesOf('class_feature')).toHaveLength(174);
  });
});

describe('SRD_RULE_INDEX against the SRD\'s own lists', () => {
  it('the glossary families are exactly the members their family entries name', () => {
    // The entry's own column of its own lines: two-column pages interleave
    // another entry's text on the same printed lines.
    const rows = srdReadingOrder(fullSrd);
    const glossaryRows = (id: SrdRuleId): string => INDEX[id].spans.flatMap((span) => {
      const match = /:(\d+)-(\d+)@(left|right)$/.exec(span);
      return rows
        .filter((row) => row.column === match?.[3] && row.line >= Number(match?.[1]) && row.line <= Number(match?.[2]))
        .map((row) => row.text);
    }).join(' ');
    const tabled = (text: string, names: readonly string[]): string[] => names.filter((name) => new RegExp(`(?:^|\\s)${name}(?:\\s|$)`).test(text));
    // "This glossary defines these conditions:" then a three-column table.
    const conditions = namesOf('condition');
    expect(tabled(glossaryRows('glossary.condition'), conditions)).toEqual(conditions);
    // "These actions are defined elsewhere in this glossary:" then a table.
    const actions = namesOf('action');
    expect(tabled(glossaryRows('glossary.action'), actions)).toEqual(actions);
    // "...one of six shapes. These shapes are defined elsewhere in this glossary:"
    const shapes = namesOf('area_of_effect');
    expect(shapes).toHaveLength(6);
    expect(tabled(glossaryRows('glossary.area-of-effect'), shapes)).toEqual(shapes);
    // Prose lists: "Friendly, Hostile, or Indifferent"; "“Burning,” “Dehydration,” …".
    expect(glossaryRows('glossary.attitude')).toMatch(/Friendly, Hostile, or Indifferent/);
    expect(namesOf('attitude')).toEqual(['Friendly', 'Hostile', 'Indifferent']);
    const hazards = [...glossaryRows('glossary.hazard').matchAll(/“([A-Z][a-z]+)[,.]?”/g)].map((match) => match[1]).sort();
    expect(namesOf('hazard')).toEqual(hazards);
  });

  it('every chapter stat block is exactly one entry of the Index of Stat Blocks', () => {
    // Contents pages 2-4 end with the Index of Stat Blocks: `Name....page`, the
    // chapter's stat blocks from printed page 258 on.
    const indexLines = LINES.slice(0, LINES.findIndex((line) => /^\s*4\s+System Reference Document 5\.2\.1\s*$/.test(line)) + 1);
    const listed = new Set<string>();
    for (const line of indexLines) {
      for (const match of line.matchAll(/([A-Z][A-Za-z’'\-, ()]+?)\.{2,}\s*(\d+)/g)) {
        if (Number(match[2]) >= 258) {
          listed.add((match[1] ?? '').trim());
        }
      }
    }
    listed.delete('Monsters A–Z');
    listed.delete('Animals');
    expect(listed.size).toBe(330);
    const chapterBlocks = entriesOf('stat_block')
      .filter(({ parent }) => parent === 'rule_section.monsters.monsters-a-z' || parent === 'rule_section.monsters.animals')
      .map(({ name }) => name);
    expect(new Set(chapterBlocks).size).toBe(chapterBlocks.length);
    expect(chapterBlocks.sort()).toEqual([...listed].sort());
    // The six stat blocks printed outside the Monsters chapter: four in spells,
    // two in magic items (census §2 row 71).
    expect(entriesOf('stat_block').filter(({ parent }) => parent?.startsWith('spell.') === true).map(({ name }) => name).sort())
      .toEqual(['Animated Object', 'Draconic Spirit', 'Giant Insect', 'Otherworldly Steed']);
    expect(entriesOf('stat_block').filter(({ parent }) => parent?.startsWith('magic_item.') === true).map(({ name }) => name).sort())
      .toEqual(['Avatar of Death', 'Giant Fly']);
  });

  it('the spells are the class spell lists plus Phantasmal Force, the one spell no list prints', () => {
    const schools = 'Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation';
    const listed = new Set<string>();
    for (const list of [bardList, clericList, druidList, paladinList, rangerList, sorcererList, warlockList, wizardList]) {
      for (const line of list.split('\n')) {
        const name = new RegExp(`^\\s*(\\S.*?)\\s{2,}(?:${schools})\\s{2,}\\S`).exec(line)?.[1];
        if (name !== undefined) {
          listed.add(name);
        }
      }
    }
    // Phantasmal Force's own header prints "(Bard, Sorcerer, Wizard)"
    // (spell-descriptions.txt:5697-5699) and no class list prints it
    // (the known SRD discrepancy, srd-spell-extracts.test.ts).
    expect(listed.has('Phantasmal Force')).toBe(false);
    expect(namesOf('spell')).toEqual([...listed, 'Phantasmal Force'].sort());
  });

  it('counts the magic items by their category-and-rarity line, read without splitting columns', () => {
    // Magic Items A–Z runs from srd:13365 to the Monsters chapter (srd:16505).
    const from = LINES.findIndex((line) => line.includes('Magic Items A–Z') && !line.includes('..'));
    const to = LINES.findIndex((line, index) => index > from && /^\f?\s*Monsters\s*$/.test(line));
    const category = '(?:Armor|Potion|Ring|Rod|Scroll|Staff|Wand|Weapon|Wondrous Item)';
    const rarity = '(?:Common|Uncommon|Rare|Very Rare|Legendary|Artifact|Rarity Varies)';
    const complete = new RegExp(`^${category}(?: \\([^)]*\\))?, (?:[^,()]*?\\()?${rarity}\\b`);
    const wrapped = new RegExp(`^${category}(?: \\([^)]*\\))?,$|^${category} \\([^)]*$`);
    let count = 0;
    for (const line of LINES.slice(from, to)) {
      for (const segment of line.replace('\f', '').matchAll(/(?:^|(?<=\s\s))(\S(?:\S| (?! ))*)/g)) {
        const text = segment[1] ?? '';
        if (complete.test(text) || wrapped.test(text)) {
          count += 1;
        }
      }
    }
    expect(count).toBe(258);
    expect(entriesOf('magic_item')).toHaveLength(count);
  });

  it('the class features are the names each class Features table prints, at a level it prints them', () => {
    const table = new Map<string, Map<string, Set<number>>>();
    let owner: string | null = null;
    let last: { names: string; level: number } | null = null;
    const flush = (): void => {
      if (owner === null || last === null) {
        return;
      }
      for (const raw of last.names.split(/,\s*/)) {
        // "Action Surge (two uses)" and "Mystic Arcanum (level 6 spell)" are one feature.
        const name = raw.replace(/\s*\([^)]*\)$/, '').trim();
        if (name === '' || name === '—' || name === 'Subclass feature') {
          continue;
        }
        const levels = table.get(owner) ?? new Map<string, Set<number>>();
        levels.set(name, (levels.get(name) ?? new Set()).add(last.level));
        table.set(owner, levels);
      }
    };
    for (const line of classLevelTables.split('\n')) {
      const title = /^=== (\w+) Features table/.exec(line)?.[1];
      if (title !== undefined) {
        flush();
        owner = title.toLowerCase();
        last = null;
        continue;
      }
      const row = /^\s+(\d{1,2})\s+\+\d\s+(\S.*?)(?:\s{2,}|$)/.exec(line);
      if (row !== null) {
        flush();
        last = { level: Number(row[1]), names: row[2] ?? '' };
        continue;
      }
      const wrap = /^\s{20,}(\S.*?)(?:\s{2,}|$)/.exec(line);
      if (wrap !== null && last !== null) {
        last = { ...last, names: `${last.names} ${wrap[1] ?? ''}` };
      }
    }
    flush();
    expect(table.size).toBe(12);
    for (const [cls, levels] of table) {
      const features = entriesOf('class_feature').filter(({ parent }) => parent === `class.${cls}`);
      expect({ cls, names: [...new Set(features.map(({ name }) => name))].sort() })
        .toEqual({ cls, names: [...levels.keys()].sort() });
      for (const { id, name } of features) {
        const level = Number(/^class_feature\.[a-z]+\.(\d+)\./.exec(id)?.[1]);
        expect({ id, printedAtThatLevel: levels.get(name)?.has(level) }).toEqual({ id, printedAtThatLevel: true });
      }
    }
  });

  it('the weapons and armour are the rows of the full text\'s Weapons and Armor tables', () => {
    const rows = (from: RegExp, to: RegExp, row: RegExp): string[] => {
      const start = LINES.findIndex((line) => from.test(line));
      const end = LINES.findIndex((line, index) => index > start && to.test(line));
      return LINES.slice(start, end).flatMap((line) => {
        const name = row.exec(line)?.[1];
        return name === undefined ? [] : [name.trim()];
      });
    };
    const weapons = rows(/^\f\s+Weapons\s*$/, /^\f\s+Armor\s/, /^\s{6}(\S.*?)\s+(?:\d+d\d+|\d+) (?:Bludgeoning|Piercing|Slashing)\b/);
    expect(namesOf('weapon')).toEqual(weapons.sort());
    const armor = rows(/^\s+Armor\s{3,}Armor Class \(AC\)/, /System Reference Document/, /^\s{7}(\S.*?)\s{2,}(?:\d|\+2)/);
    expect(namesOf('armor')).toEqual(armor.sort());
  });

  it('the mastery properties are the typed weapon mastery vocabulary', () => {
    expect(namesOf('weapon_mastery')).toEqual([...weaponMasteryProperties].sort());
  });

  it('every spell-list, class and subclass unit belongs to one of twelve classes', () => {
    const classes = namesOf('class');
    expect(classes).toEqual(['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']);
    expect(entriesOf('subclass').map(({ parent }) => parent).sort()).toEqual(classes.map((name) => `class.${name.toLowerCase()}`));
    expect(namesOf('spell_list')).toEqual(['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'].map((name) => `${name} Spell List`));
  });
});

describe('SRD_RULE_INDEX structure', () => {
  it('names each id by its kind and a parent that is itself an id', () => {
    expect(new Set(SRD_RULE_IDS).size).toBe(SRD_RULE_IDS.length);
    for (const id of SRD_RULE_IDS) {
      const entry = INDEX[id];
      expect(SRD_RULE_KINDS).toContain(entry.kind);
      expect(id.startsWith(`${entry.kind}.`)).toBe(true);
      expect(/^[a-z_]+(?:\.[a-z0-9-]+)+$/.test(id)).toBe(true);
      if (entry.parent !== undefined) {
        expect({ id, parentIsId: isSrdRuleId(entry.parent) }).toEqual({ id, parentIsId: true });
      }
    }
  });

  it('points every first span at the line that prints the unit\'s name', () => {
    const corpora: Readonly<Record<string, readonly string[]>> = {
      'docs/srd/full/srd-5.2.1.txt': LINES,
      'docs/srd/source/armor-table.txt': armorTableText.split('\n'),
      'docs/srd/source/spell-descriptions.txt': spellDescriptionsText.split('\n'),
      'docs/srd/source/weapons-table.txt': weaponsTableText.split('\n'),
    };
    for (const id of SRD_RULE_IDS) {
      const { name, spans, kind } = INDEX[id];
      for (const span of spans) {
        const match = /^(docs\/srd\/[^:]+):(\d+)-(\d+)(?:@(left|right))?$/.exec(span);
        expect({ id, span, wellFormed: match !== null }).toEqual({ id, span, wellFormed: true });
        expect(Number(match?.[2])).toBeLessThanOrEqual(Number(match?.[3]));
      }
      const first = /^(docs\/srd\/[^:]+):(\d+)-/.exec(spans[0] ?? '');
      const lines = corpora[first?.[1] ?? ''];
      if (lines === undefined) {
        continue;
      }
      const printed = (lines[Number(first?.[2]) - 1] ?? '') + ' ' + (lines[Number(first?.[2])] ?? '');
      // A name printed over two lines (a subclass, a wrapped item or section
      // name) shares its lines with the other column: probe its first word.
      const probe = kind === 'rule_section' || kind === 'magic_item' || kind === 'subclass' ? name.split(/[ ,]/)[0] ?? name : name;
      expect({ id, printsName: printed.includes(probe) }).toEqual({ id, printsName: true });
    }
  });
});

describe('SrdRuleId is a closed union', () => {
  it('accepts an id the SRD prints and refuses one it does not, at compile time', () => {
    const fireball: SrdRuleId = 'spell.fireball';
    // @ts-expect-error 'spell.fireballz' is not an SRD rule id.
    const misspelt: SrdRuleId = 'spell.fireballz';
    const prone: SrdRuleIdOfKind<'condition'> = 'condition.prone';
    // @ts-expect-error a spell is not a condition id.
    const wrongKind: SrdRuleIdOfKind<'condition'> = 'spell.fireball';
    expect([isSrdRuleId(fireball), isSrdRuleId(misspelt), isSrdRuleId(prone), isSrdRuleId(wrongKind)]).toEqual([true, false, true, true]);
  });
});
