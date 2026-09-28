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
import subclassesText from '../../../docs/srd/source/subclasses.txt?raw';
import { srdReadingOrder } from '../../../scripts/srd/srd-columns';
import {
  contentsEntries,
  isProse,
  rawColumnRows,
  rawColumnRuns,
  rawColumnText,
  rawHeadings,
  rawPages,
  rawSegments,
  rowsBetween,
  type ContentsEntry,
  type RawRow,
} from '../../helpers/srd-raw-reader';
import { bundledFeatDefinitions } from '../../../src/rules/feats-srd';
import { parseSrdBackgroundTemplates, parseSrdSpeciesTemplates } from '../../../src/rules/origins-srd';
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
 * (scripts/srd/rule-index.ts): the SRD's own lists (Contents read by a second
 * parser, the Index of Stat Blocks, a glossary entry naming its family, the
 * class Features tables, the class spell lists, the Adventuring Gear table), a
 * raw reading that never measures a gutter (tests/helpers/srd-raw-reader.ts),
 * an extract the generator does not read, a parser the character builder
 * owns, or an existing typed vocabulary. No count is a census estimate and
 * none is copied from the generated file, so a generator that drops, doubles
 * or misnames a unit fails here even though its drift test is green; and the
 * kinds' second derivations sum to the index's size.
 */

const LINES = fullSrd.split('\n');
const INDEX = SRD_RULE_INDEX as Readonly<Record<SrdRuleId, { readonly kind: SrdRuleKind; readonly name: string; readonly spans: readonly string[]; readonly parent?: string }>>;

function entriesOf(kind: SrdRuleKind): { readonly id: SrdRuleId; readonly name: string; readonly spans: readonly string[]; readonly parent?: string }[] {
  return SRD_RULE_IDS.filter((id) => INDEX[id].kind === kind).map((id) => ({ id, ...INDEX[id] }));
}

function namesOf(kind: SrdRuleKind): string[] {
  return entriesOf(kind).map(({ name }) => name).sort();
}

/**
 * The Index of Stat Blocks that ends Contents (printed pages 2-4): `Name....page`
 * for every chapter stat block, from printed page 258 on.
 */
function statBlockIndexNames(): string[] {
  const indexLines = LINES.slice(0, (rawPages(LINES).get(4)?.to ?? 0) + 1);
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
  return [...listed];
}

/**
 * The union of the eight class spell lists, plus Phantasmal Force: its own
 * header prints "(Bard, Sorcerer, Wizard)" (spell-descriptions.txt:5697-5699)
 * and no class list prints it (the SRD disagreement the owner resolved by
 * union, D922; src/rules/srd/owner-rulings.ts).
 */
function listedSpells(): string[] {
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
  if (listed.has('Phantasmal Force')) {
    throw new Error('A class list now prints Phantasmal Force: revisit D922.');
  }
  return [...listed, 'Phantasmal Force'];
}

/**
 * Magic items counted by their category-and-rarity line, read without
 * splitting columns, over printed pages 209 (Magic Items A–Z) to 253 (the page
 * before Monsters).
 */
function magicItemCount(): number {
  const pages = rawPages(LINES);
  const from = pages.get(pageOf('Magic Items A–Z'))?.from ?? 0;
  const to = pages.get(pageOf('Monsters') - 1)?.to ?? 0;
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
  return count;
}

/**
 * The magic items' NAMES, read a second way: the raw reader's column rows (no
 * measured gutter) of printed pages 209 to 253. An item's name is the row its
 * column prints directly above its category-and-rarity line, or that row and
 * the one above it when the name wraps (its second line starts lowercase:
 * "Amulet of Proof against Detection" / "and Location"). The names come out in
 * printed order, so the chapter's own A–Z arrangement checks them.
 */
function magicItemNames(): string[] {
  const rows = rawColumnRows(LINES, pageOf('Magic Items A–Z'), pageOf('Monsters') - 1);
  const category = '(?:Armor|Potion|Ring|Rod|Scroll|Staff|Wand|Weapon|Wondrous Item)';
  const rarity = '(?:Common|Uncommon|Rare|Very Rare|Legendary|Artifact|Rarity Varies)';
  const itemLine = new RegExp(`^${category}(?: \\([^)]*\\))?(?:, (?:[^,()]*?\\()?${rarity}\\b|,$| \\([^)]*$)`);
  const names: string[] = [];
  rows.forEach((row, index) => {
    if (row.segments.length !== 1 || !itemLine.test(row.segments[0] ?? '')) {
      return;
    }
    const above = (offset: number): string => {
      const printed = rows[index - offset];
      if (printed === undefined || printed.page !== row.page || printed.column !== row.column || printed.segments.length !== 1) {
        throw new Error(`The item line at ${String(row.line)} has no name printed above it in its column.`);
      }
      return printed.segments[0] ?? '';
    };
    const last = above(1);
    names.push(/^[a-z]/.test(last) ? `${above(2)} ${last}` : last);
  });
  return names;
}

function tableRows(from: RegExp, to: RegExp, row: RegExp): string[] {
  const start = LINES.findIndex((line) => from.test(line));
  const end = LINES.findIndex((line, index) => index > start && to.test(line));
  return LINES.slice(start, end).flatMap((line) => {
    const name = row.exec(line)?.[1];
    return name === undefined ? [] : [name.trim()];
  });
}

/** The rows of the full text's Weapons table (the generator reads the single-column extract). */
function weaponTableNames(): string[] {
  return tableRows(/^\f\s+Weapons\s*$/, /^\f\s+Armor\s/, /^\s{6}(\S.*?)\s+(?:\d+d\d+|\d+) (?:Bludgeoning|Piercing|Slashing)\b/);
}

/** The rows of the full text's Armor table. */
function armorTableNames(): string[] {
  return tableRows(/^\s+Armor\s{3,}Armor Class \(AC\)/, /System Reference Document/, /^\s{7}(\S.*?)\s{2,}(?:\d|\+2)/);
}

/* ==========================================================================
 * SECOND DERIVATIONS. Every kind's units are derived again here, by code that
 * shares nothing with the generator: the raw reader (tests/helpers/
 * srd-raw-reader.ts) over the full text, a curated extract the generator does
 * not read, a table where the generator reads descriptions, or a parser another
 * unit wrote for the character builder. Where the SRD lists names, the names
 * are compared; where it only lets units be counted, the count is.
 * ========================================================================== */

interface Derivation {
  readonly count: number;
  /** The units' keys (see `keyOf`), or null where only a count is derivable. */
  readonly keys: readonly string[] | null;
}

const named = (keys: readonly string[]): Derivation => ({ count: keys.length, keys });
const counted = (count: number): Derivation => ({ count, keys: null });

/** How a unit is compared with a derived one: by name, qualified where names repeat. */
function keyOf(id: SrdRuleId): string {
  const { kind, name, parent } = INDEX[id];
  switch (kind) {
    case 'species_trait':
    case 'class_option':
      return `${INDEX[parent as SrdRuleId].name}/${name}`;
    case 'subclass_feature':
      return `${/\.(\d+)\.[^.]+$/.exec(id)?.[1] ?? ''}:${name}`;
    default:
      return name;
  }
}

let rawRowsCache: Map<string, RawRow[]> | null = null;
/**
 * The raw rows of a Contents section, from the pages Contents gives it and the
 * next section, strictly between the row printing `startRow` (by default the
 * section's own title) and the row printing the next section's title.
 */
function sectionRows(section: string, next: string, startRow = section): RawRow[] {
  rawRowsCache ??= new Map();
  const key = `${section}|${next}|${startRow}`;
  const cached = rawRowsCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = rowsBetween(rawColumnRows(LINES, pageOf(section), pageOf(next)), startRow, next);
  rawRowsCache.set(key, rows);
  return rows;
}

let contentsCache: readonly ContentsEntry[] | null = null;
function contents(): readonly ContentsEntry[] {
  contentsCache ??= contentsEntries(LINES);
  return contentsCache;
}

function pageOf(title: string): number {
  const entry = contents().find((candidate) => candidate.title === title);
  if (entry === undefined) {
    throw new Error(`Contents has no "${title}".`);
  }
  return entry.page;
}

const headingNames = (rows: readonly RawRow[]): string[] =>
  rows.map(({ segments }) => (segments[0] ?? '').replace(/ \((?:\d[\d,]* GP|Varies)\)$/, ''));

/** The twelve classes, from the class Features tables extract. */
function classNames(): string[] {
  return [...classLevelTables.matchAll(/^=== (\w+) Features table/gm)].map((match) => match[1] ?? '');
}

/** The glossary's entries with their tags, read raw after "Rules Definitions". */
function glossaryEntries(): { readonly name: string; readonly kind: SrdRuleKind }[] {
  const rows = rawColumnRows(LINES, pageOf('Rules Glossary'), pageOf('Gameplay Toolbox') - 1);
  const start = rows.findIndex(({ segments }) => segments.length === 1 && segments[0] === 'Rules Definitions');
  const tags: Readonly<Record<string, SrdRuleKind>> = {
    Action: 'action', 'Area of Effect': 'area_of_effect', Attitude: 'attitude', Condition: 'condition', Hazard: 'hazard',
  };
  return rawHeadings(rows.slice(start + 1), isProse).map(({ segments }) => {
    const text = segments[0] ?? '';
    const tagged = /^(.+) \[([^\]]+)\]$/.exec(text);
    return tagged === null ? { name: text, kind: 'glossary' } : { name: tagged[1] ?? '', kind: tags[tagged[2] ?? ''] ?? 'glossary' };
  });
}

function glossaryOf(kind: SrdRuleKind): Derivation {
  return named(glossaryEntries().filter((entry) => entry.kind === kind).map(({ name }) => name));
}

/** The Contents entries of the rules chapters, once the other catalogues are taken out. */
function contentsSections(): string[] {
  const others = new Set<string>([
    'Legal Information',
    ...classNames(),
    ...parseSrdSpeciesTemplates().map(({ name }) => name),
    ...parseSrdBackgroundTemplates().map(({ name }) => name),
  ]);
  return contents()
    .map(({ title }) => title)
    .filter((title) => !others.has(title) && !/^\w+ Spell List$/.test(title) && !title.includes(' Subclass: '));
}

/** `Level N: Name` headings of the subclasses extract, as `N:Name`. */
function subclassFeatureKeys(): string[] {
  return [...subclassesText.matchAll(/^\s*Level (\d{1,2}): (\S.*?)\s*$/gm)].map((match) => `${match[1] ?? ''}:${match[2] ?? ''}`);
}

/** Adventuring Gear table rows (Item, Weight, Cost, twice per printed row), the two Spell Scroll rows being one item. */
function adventuringGearTable(): string[] {
  const page = rawPages(LINES).get(pageOf('Adventuring Gear') + 1);
  const rows = LINES.slice(page?.from ?? 0, page?.to ?? 0).flatMap((line) =>
    [...line.replaceAll('\t', '    ').matchAll(/(\S(?:\S| (?! ))*?)\s{2,}(?:—|Varies|[\d½/]+ lb\.(?: \(full\))?)\s+(?:Varies|[\d,]+ (?:CP|SP|GP))(?=\s|$)/g)]
      .map((match) => match[1] ?? ''));
  expect(rows.filter((name) => name.startsWith('Spell Scroll ('))).toEqual(['Spell Scroll (Cantrip)', 'Spell Scroll (Level 1)']);
  return [...rows.filter((name) => !name.startsWith('Spell Scroll (')), 'Spell Scroll'];
}

/** Stat blocks printed inside spells and magic items, counted by their `AC` lines. */
function statBlocksOutsideTheChapter(): number {
  const inSpells = spellDescriptionsText.split('\n').filter((line) => /^\s*AC \d/.test(line)).length;
  const pages = rawPages(LINES);
  const from = pages.get(pageOf('Magic Items A–Z'))?.from ?? 0;
  const to = pages.get(pageOf('Monsters') - 1)?.to ?? 0;
  const inMagicItems = LINES.slice(from, to).flatMap(rawSegments).filter(({ text }) => /^AC \d+$/.test(text) || /^AC \d+\s/.test(text)).length;
  return inSpells + inMagicItems;
}

/**
 * "Curses and Magical Contagions" prints over two lines ("Curses and" /
 * "Magical Contagions"), so its section is read from its second line.
 */
const CONTAGIONS_START = 'Magical Contagions';

const DERIVED: { readonly [K in SrdRuleKind]: () => Derivation } = {
  rule_section: () => named(contentsSections()),
  glossary: () => glossaryOf('glossary'),
  condition: () => glossaryOf('condition'),
  action: () => glossaryOf('action'),
  area_of_effect: () => glossaryOf('area_of_effect'),
  attitude: () => glossaryOf('attitude'),
  hazard: () => glossaryOf('hazard'),
  class: () => named(classNames()),
  // Every `Level N:` heading printed in the Classes chapter, less the subclass
  // features (their names and levels are the Features-table test below).
  class_feature: () => {
    const pages = rawPages(LINES);
    const from = pages.get(pageOf('Classes'))?.from ?? 0;
    const to = pages.get(pageOf('Character Origins') - 1)?.to ?? 0;
    const headings = LINES.slice(from, to).flatMap(rawSegments).filter(({ text }) => /^Level \d{1,2}: \S/.test(text)).length;
    return counted(headings - subclassFeatureKeys().length);
  },
  subclass: () => named(contents().flatMap(({ title }) => title.split(' Subclass: ').slice(1))),
  subclass_feature: () => named(subclassFeatureKeys()),
  class_option: () => named([
    ...headingNames(rawHeadings(sectionRows('Metamagic Options', 'Sorcerer Spell List'), (next) => (next.segments[0] ?? '').startsWith('Cost:'))).map((name) => `Sorcerer/${name}`),
    ...headingNames(rawHeadings(sectionRows('Eldritch Invocation Options', 'Warlock Spell List'), (next) => (next.segments[0] ?? '').startsWith('Prerequisite:') || isProse(next))).map((name) => `Warlock/${name}`),
  ]),
  spell_list: () => named(contents().map(({ title }) => title).filter((title) => /^\w+ Spell List$/.test(title))),
  species: () => named(parseSrdSpeciesTemplates().map(({ name }) => name)),
  species_trait: () => named(parseSrdSpeciesTemplates().flatMap(({ name, traits }) => traits.map((trait) => `${name}/${trait.name}`))),
  background: () => named(parseSrdBackgroundTemplates().map(({ name }) => name)),
  feat: () => named(bundledFeatDefinitions().map(({ name }) => name)),
  weapon: () => named(weaponTableNames()),
  armor: () => named(armorTableNames()),
  weapon_property: () => named(headingNames(rawHeadings(sectionRows('Properties', 'Mastery Properties'), isProse))),
  // Page 90's right column: the Mastery Properties heading ends the left column.
  weapon_mastery: () => named(headingNames(rawHeadings(
    rawColumnRows(LINES, pageOf('Mastery Properties'), pageOf('Mastery Properties')).filter(({ column }) => column === 'right'),
    isProse,
  ))),
  tool: () => named(headingNames(rawHeadings(sectionRows('Tools', 'Adventuring Gear'), (next) => (next.segments[0] ?? '').startsWith('Ability:'), true))),
  adventuring_gear: () => named(adventuringGearTable()),
  spell: () => named(listedSpells()),
  stat_block: () => counted(statBlockIndexNames().length + statBlocksOutsideTheChapter()),
  magic_item: () => named(magicItemNames()),
  environmental_effect: () => named(headingNames(rawHeadings(sectionRows('Environmental Effects', 'Fear and Mental Stress'), isProse))),
  trap: () => named(headingNames(rawHeadings(sectionRows('Traps', 'Combat Encounters'), (next) => /^(?:Nuisance|Deadly) Trap \(Levels/.test(next.segments[0] ?? '')))),
  poison: () => named(headingNames(rawHeadings(sectionRows('Poison', 'Traps'), (next) => /^(?:Contact|Ingested|Inhaled|Injury) Poison$/.test(next.segments[0] ?? '')))),
  magical_contagion: () => named(headingNames(rawHeadings(sectionRows('Curses and Magical Contagions', 'Environmental Effects', CONTAGIONS_START), (next) => next.segments[0] === 'Magical Contagion'))),
};

describe('SRD_RULE_INDEX, derived a second time', () => {
  it('holds exactly the units each kind\'s second derivation finds', () => {
    for (const kind of SRD_RULE_KINDS) {
      const derived = DERIVED[kind]();
      const indexed = entriesOf(kind);
      expect({ kind, count: indexed.length }).toEqual({ kind, count: derived.count });
      if (derived.keys !== null) {
        expect({ kind, keys: indexed.map(({ id }) => keyOf(id)).sort() }).toEqual({ kind, keys: [...derived.keys].sort() });
      }
    }
  });

  it('sums to the index\'s 1,766 units', () => {
    // 104 rule sections, 155 glossary entries (114 plain, 15 conditions, 12
    // actions, 6 areas, 3 attitudes, 5 hazards), 12 classes, 174 class and 58
    // subclass features, 12 subclasses, 38 class options, 8 spell lists, 9
    // species, 33 species traits, 4 backgrounds, 17 feats, 38 weapons, 13
    // armour, 10 properties, 8 masteries, 25 tools, 81 gear, 339 spells, 336
    // stat blocks, 258 magic items, 9 environmental effects, 8 traps, 14
    // poisons, 3 contagions.
    const total = SRD_RULE_KINDS.reduce((sum, kind) => sum + DERIVED[kind]().count, 0);
    expect(total).toBe(1_766);
    expect(SRD_RULE_IDS).toHaveLength(total);
  });

  it('agrees with the second signal each catalogue prints beside its heading', () => {
    // Traps: one `Trigger:` line each. Contagions: one "Fighting the Contagion."
    // paragraph each. Poisons: one price in the heading each.
    const trapRows = sectionRows('Traps', 'Combat Encounters');
    expect(trapRows.filter(({ segments }) => (segments[0] ?? '').startsWith('Trigger: ')).length).toBe(DERIVED.trap().count);
    const contagionRows = sectionRows('Curses and Magical Contagions', 'Environmental Effects', CONTAGIONS_START);
    expect(contagionRows.filter(({ segments }) => (segments[0] ?? '').startsWith('Fighting the Contagion.')).length).toBe(DERIVED.magical_contagion().count);
    const poisonRows = rawHeadings(sectionRows('Poison', 'Traps'), (next) => /^(?:Contact|Ingested|Inhaled|Injury) Poison$/.test(next.segments[0] ?? ''));
    expect(poisonRows.every(({ segments }) => / \([\d,]+ GP\)$/.test(segments[0] ?? ''))).toBe(true);
    // The generator's class and subclass names come from headings; Contents
    // lists the same twelve subclasses under their classes.
    expect(DERIVED.subclass().keys).toHaveLength(12);
    // Species and backgrounds the origin parser reads are Contents entries.
    const titles = new Set(contents().map(({ title }) => title));
    for (const name of [...(DERIVED.species().keys ?? []), ...(DERIVED.background().keys ?? [])]) {
      expect({ name, inContents: titles.has(name) }).toEqual({ name, inContents: true });
    }
  });

  it('reads Contents the way it is printed, including titles wrapped over two lines', () => {
    const titles = contents().map(({ title }) => title);
    expect(titles).toContain('Monk Subclass: Warrior of the Open Hand');
    expect(titles).toContain('Barbarian Subclass: Path of the Berserker');
    expect(titles).toContain('“The Next Dawn”');
    expect(titles).not.toContain('Aboleth');
    expect(contents().find(({ title }) => title === 'Paladin Subclass: Oath of Devotion')?.page).toBe(56);
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
    const listed = statBlockIndexNames();
    expect(listed).toHaveLength(330);
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
    const spells = listedSpells();
    expect(spells.filter((name) => name === 'Phantasmal Force')).toHaveLength(1);
    expect(namesOf('spell')).toEqual([...spells].sort());
  });

  it('counts the magic items by their category-and-rarity line, read without splitting columns', () => {
    // Magic Items A–Z runs from printed page 209 to the end of page 253, the
    // page before the Monsters chapter (Contents).
    const count = magicItemCount();
    expect(count).toBe(258);
    expect(entriesOf('magic_item')).toHaveLength(count);
  });

  it('the magic items are the names printed above their category-and-rarity lines, in the chapter\'s A–Z order', () => {
    const names = magicItemNames();
    expect(names).toHaveLength(magicItemCount());
    expect(new Set(names).size).toBe(names.length);
    // Printed alphabetically, letters only; the one group heading in the plural
    // ("Potions of Healing") is filed under its singular.
    const key = (name: string): string => name.replace(/^Potions /, 'Potion ').toLowerCase().replace(/[^a-z0-9]/g, '');
    const unordered = names.flatMap((name, index) => (index > 0 && key(names[index - 1] ?? '') >= key(name) ? [`${names[index - 1] ?? ''} / ${name}`] : []));
    expect(unordered).toEqual([]);
    // The set, not the count: a consistently generated wrong name
    // ("Staff of Prowess" for the printed "Staff of Power") fails here.
    expect(namesOf('magic_item')).toEqual([...names].sort());
    expect(names).toContain('Staff of Power');
    expect(names).toContain('Amulet of Proof against Detection and Location');
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
    expect(namesOf('weapon')).toEqual(weaponTableNames().sort());
    expect(namesOf('armor')).toEqual(armorTableNames().sort());
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

  it('points every first span at the line that prints the unit\'s whole name', () => {
    const extracts: Readonly<Record<string, readonly string[]>> = {
      'docs/srd/source/armor-table.txt': armorTableText.split('\n'),
      'docs/srd/source/spell-descriptions.txt': spellDescriptionsText.split('\n'),
      'docs/srd/source/weapons-table.txt': weaponsTableText.split('\n'),
    };
    /**
     * The text a span's first line prints in its column from each run on,
     * alone and joined with the column's next printed line (a name wrapped
     * over two lines: "Amulet of Proof against Detection" / "and Location",
     * "Curses and" / "Magical Contagions"). From each run on, because a
     * left-column table cell can reach the raw reader's right column (printed
     * page 40: the Cleric Spell List's Special column, at character 55, beside
     * "Level 3: Preserve Life").
     */
    const firstPrinted = (file: string, line: number, column: 'left' | 'right' | 'whole'): readonly string[] => {
      const nextPrinted = (lines: readonly string[], read: (text: string) => string): string => {
        for (let at = line; at < lines.length; at += 1) {
          const text = read(lines[at] ?? '');
          if (text !== '') {
            return text;
          }
        }
        return '';
      };
      if (file !== 'docs/srd/full/srd-5.2.1.txt') {
        const lines = extracts[file] ?? [];
        const own = (lines[line - 1] ?? '').trim();
        return [own, `${own} ${nextPrinted(lines, (text) => text.trim())}`];
      }
      const runs = rawColumnRuns(LINES[line - 1] ?? '', column);
      const next = nextPrinted(LINES, (text) => rawColumnText(text, column));
      return runs.flatMap((_, from) => {
        const own = runs.slice(from).join(' ');
        return [own, `${own} ${next}`];
      });
    };
    for (const id of SRD_RULE_IDS) {
      const { name, spans, kind, parent } = INDEX[id];
      for (const span of spans) {
        const match = /^(docs\/srd\/[^:]+):(\d+)-(\d+)(?:@(left|right))?$/.exec(span);
        expect({ id, span, wellFormed: match !== null }).toEqual({ id, span, wellFormed: true });
        expect(Number(match?.[2])).toBeLessThanOrEqual(Number(match?.[3]));
      }
      const first = /^(docs\/srd\/[^:]+):(\d+)-\d+(?:@(left|right))?$/.exec(spans[0] ?? '');
      // The heading as printed: a (sub)class feature is `Level N: Name`, a
      // subclass `<Class> Subclass: Name`; everything else starts with its name.
      const heading = kind === 'class_feature' || kind === 'subclass_feature'
        ? `Level ${/\.(\d+)\.[^.]+$/.exec(id)?.[1] ?? ''}: ${name}`
        : kind === 'subclass'
          ? `${INDEX[parent as SrdRuleId].name} Subclass: ${name}`
          : name;
      const printed = firstPrinted(first?.[1] ?? '', Number(first?.[2]), (first?.[3] as 'left' | 'right' | undefined) ?? 'whole');
      expect({ id, printed: printed[0], printsName: printed.some((text) => text.startsWith(heading)) })
        .toEqual({ id, printed: printed[0], printsName: true });
    }
  });
});

/* ==========================================================================
 * SPAN OWNERSHIP. A span must hold every line its rule prints, across page
 * and column breaks, tables printed over both columns and sidebar boxes, and
 * no other rule's. The expectations are hand-read from the printed pages; the
 * printed rows are found by the raw reader, never by the generator's columns.
 * ========================================================================== */

type RawColumn = 'left' | 'right' | 'whole';
let spanOwnersCache: ReadonlyMap<string, readonly SrdRuleId[]> | null = null;
/** Every full-text span, as `line@column` keys of the units that hold that printed line. */
function spanOwners(): ReadonlyMap<string, readonly SrdRuleId[]> {
  if (spanOwnersCache === null) {
    const owners = new Map<string, SrdRuleId[]>();
    for (const id of SRD_RULE_IDS) {
      for (const span of INDEX[id].spans) {
        const match = /^docs\/srd\/full\/srd-5\.2\.1\.txt:(\d+)-(\d+)(?:@(left|right))?$/.exec(span);
        if (match === null) {
          continue;
        }
        for (let line = Number(match[1]); line <= Number(match[2]); line += 1) {
          const key = `${String(line)}@${match[3] ?? 'whole'}`;
          owners.set(key, [...(owners.get(key) ?? []), id]);
        }
      }
    }
    spanOwnersCache = owners;
  }
  return spanOwnersCache;
}

/** The units whose spans hold printed line `line` of `column`. */
function ownersAt(line: number, column: RawColumn): readonly SrdRuleId[] {
  const owners = spanOwners();
  return [...(owners.get(`${String(line)}@${column}`) ?? []), ...(owners.get(`${String(line)}@whole`) ?? [])];
}

/** A unit's printed text read raw: each span's lines in its column, joined as prose. */
function rawUnitText(id: SrdRuleId): string {
  return INDEX[id].spans.flatMap((span) => {
    const match = /^docs\/srd\/full\/srd-5\.2\.1\.txt:(\d+)-(\d+)(?:@(left|right))?$/.exec(span);
    if (match === null) {
      return [];
    }
    return LINES.slice(Number(match[1]) - 1, Number(match[2]))
      .map((line) => rawColumnText(line, (match[3] as RawColumn | undefined) ?? 'whole'))
      .filter((text) => text !== '');
  }).join('\n').replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2').replace(/\s+/g, ' ');
}

describe('SRD_RULE_INDEX spans follow the printed text', () => {
  it('gives Parts of a Stat Block the text around and after the Running a Monster box, up to Monsters A–Z', () => {
    // Printed pages 254-258: "Parts of a Stat Block" starts on page 254 and runs
    // to "Monsters A–Z" on page 258. "Running a Monster" is a box at the top of
    // page 255's right column: its heading, a lead sentence and three run-in
    // rules, ending "uses them as often as it can." Every other row between is
    // the section's (Immunities and Gear below the box; Senses, Languages,
    // Challenge Rating and the XP table on page 256; the notation rules on 257).
    const parts: SrdRuleId = 'rule_section.monsters.parts-of-a-stat-block';
    const box: SrdRuleId = 'rule_section.monsters.running-a-monster';
    const rows = rowsBetween(rawColumnRows(LINES, pageOf('Parts of a Stat Block'), pageOf('Monsters A–Z')), 'Parts of a Stat Block', 'Monsters A–Z');
    const text = (row: RawRow): string => row.segments.join(' ');
    const boxFrom = rows.findIndex((row) => text(row) === 'Running a Monster');
    const boxTo = rows.findIndex((row) => text(row) === 'uses them as often as it can.');
    expect({ boxFrom: boxFrom > 0, boxRows: boxTo - boxFrom + 1 }).toEqual({ boxFrom: true, boxRows: 16 });
    const owned = rows.map((row) => ({ line: row.line, text: text(row), owners: ownersAt(row.line, row.column) }));
    const expected = rows.map((row, index) => ({ line: row.line, text: text(row), owners: [index >= boxFrom && index <= boxTo ? box : parts] }));
    expect(owned).toEqual(expected);
    // The parts a stat block prints, hand-listed in the order these pages
    // print them: each a heading of the section, and each once.
    const headings = [
      'Size', 'Creature Type', 'Descriptive Tags', 'Alignment', 'Armor Class', 'Initiative', 'Hit Points', 'Hit Dice by Size',
      'Speed', 'Ability Scores', 'Skills', 'Resistances and Vulnerabilities', 'Immunities', 'Gear', 'Ammunition and Ranged Attacks',
      'Equipping a Monster with Other Items', 'Senses', 'Languages', 'Telepathy', 'Challenge Rating', 'Experience Points',
      'Experience Points by Challenge Rating', 'Proficiency Bonus', 'Proficiency Bonus by Challenge Rating', 'Traits', 'Actions',
      'Attack Notation', 'Saving Throw Effect Notation', 'Damage Notation', 'Multiattack', 'Spellcasting', 'Bonus Action',
      'Reactions', 'Legendary Actions', 'Limited Usage',
    ];
    expect(rows.filter((row) => headings.includes(text(row))).map(text)).toEqual(headings);
    // The clauses round 2 found in the wrong rule, now in the section's text.
    const section = rawUnitText(parts);
    for (const clause of [
      'The Senses entry specifies a monster’s Passive Perception score',
      'This entry lists languages that the monster can use to communicate.',
      'Challenge Rating is defined in “Rules Glossary,”',
      'The number of Experience Points (XP) a monster is worth is based on its CR',
      '12 8,400 29 135,000',
    ]) {
      expect({ clause, inSection: section.includes(clause) }).toEqual({ clause, inSection: true });
    }
    expect(rawUnitText(box)).toBe(
      'Running a Monster To ensure a monster acts in accordance with its Challenge Rating, follow these rules during combat: '
      + 'Special Abilities. If the monster has a special ability that deals a lot of damage but has a limited number of uses, '
      + 'such as a recharging breath weapon or a spell it can cast only once per day, have it use that special ability as '
      + 'quickly and as often as possible. Multiattack. If the monster has Multiattack, have it use Multiattack on any of its '
      + 'turns in which it’s not using one of its more powerful abilities. Bonus Actions, Reactions, Legendary Actions. If the '
      + 'monster has Bonus Actions, Reactions, or Legendary Actions in its stat block, make sure it uses them as often as it can.',
    );
  });

  it('reads each table printed across both columns, both halves, into the unit that refers to it', () => {
    // Hand-read: the caption, the unit whose text names "<caption> table", and
    // how many printed lines the table takes from its caption (footnotes
    // included), on the page Contents' neighbours put it.
    const tables = [
      { caption: 'Starting Equipment at Higher Levels', page: 24, lines: 9, owner: 'rule_section.character-creation.starting-at-higher-levels' },
      { caption: 'Elven Lineages', page: 85, lines: 9, owner: 'species_trait.elf.elven-lineage' },
      { caption: 'Fiendish Legacies', page: 86, lines: 8, owner: 'species_trait.tiefling.fiendish-legacy' },
      { caption: 'Airborne and Waterborne Vehicles', page: 101, lines: 9, owner: 'rule_section.equipment.mounts-and-vehicles' },
      { caption: 'Travel Terrain', page: 192, lines: 16, owner: 'rule_section.gameplay-toolbox.travel-pace' },
    ] as const satisfies readonly { caption: string; page: number; lines: number; owner: SrdRuleId }[];
    for (const { caption, page, lines, owner } of tables) {
      const rows = rawColumnRows(LINES, page, page);
      const captionRow = rows.find((row) => row.segments.length === 1 && row.segments[0] === caption);
      expect({ caption, printed: captionRow !== undefined }).toEqual({ caption, printed: true });
      const from = captionRow?.line ?? 0;
      const table = rows.filter((row) => row.line >= from && row.line < from + lines);
      expect({ caption, rightHalf: table.some((row) => row.column === 'right') }).toEqual({ caption, rightHalf: true });
      // Owned line by line, whichever column a reader files a cell under: the
      // table has the whole width of the page to itself.
      for (const line of new Set(table.map((row) => row.line))) {
        const owners = [...new Set([...ownersAt(line, 'left'), ...ownersAt(line, 'right')])];
        expect({ caption, line, owners }).toEqual({ caption, line, owners: [owner] });
      }
      expect({ caption, referred: rawUnitText(owner).includes(`${caption} table`) }).toEqual({ caption, referred: true });
    }
  });

  it('holds each printed line of a column in at most one unit\'s span', () => {
    const shared = [...spanOwners()].filter(([, ids]) => ids.length > 1);
    expect(shared).toEqual([]);
    // A whole-line span and a column span never meet on one line either.
    const lines = new Set([...spanOwners().keys()].filter((key) => key.endsWith('@whole')).map((key) => key.split('@')[0]));
    expect([...spanOwners().keys()].filter((key) => !key.endsWith('@whole') && lines.has(key.split('@')[0]))).toEqual([]);
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
