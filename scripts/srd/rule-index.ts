import {
  SRD_RULE_KINDS,
  type SrdRuleIndexEntry,
  type SrdRuleKind,
  type SrdSpan,
} from '../../src/rules/srd/rule-index-types.ts';
import { srdReadingOrder, type StreamRow } from './srd-columns.ts';

/**
 * SRD_RULE_INDEX: EVERY SRD 5.2.1 RULE UNIT, WITH A STABLE ID AND ITS SPANS.
 *
 * Owner D918 made the synthesis §5 "represented" definition binding. Its first
 * condition is identity: every rule has an id in a generated closed union
 * (`SrdRuleId`) together with where it is printed (`SrdSpan`). This module
 * DERIVES that list from the committed SRD text; `npm run srd:rule-index`
 * (scripts/generate-srd-rule-index.ts) writes it to
 * `src/rules/srd/generated/rule-index.ts`, and the drift test
 * (tests/unit/rules/srd-rule-index-generation.test.ts) re-derives it and fails
 * on any byte difference. It is never edited by hand.
 *
 * It follows the SRD-BUILDTIME pattern (one generator command, a committed
 * typed TS module, a byte drift test) with the format that pattern's review
 * asked for: the data is `as const satisfies`, so every id is a literal the
 * compiler carries and `SrdRuleId` is `keyof typeof SRD_RULE_INDEX`.
 *
 * WHAT A UNIT IS is stated once, on `SRD_RULE_KINDS` in
 * `src/rules/srd/rule-index-types.ts`. How each kind is found:
 *
 * - Contents (printed page 2) is parsed for its entries and page numbers, and
 *   each entry's heading is located on its printed page. The chapter sections
 *   become `rule_section` units; class names, spell lists, species and
 *   backgrounds become their own kinds; every located heading is a span
 *   boundary.
 * - Glossary entries are the Title Case headings between "Rules Definitions"
 *   and "Gameplay Toolbox" that end the previous entry's sentence (or a table)
 *   and start a sentence. A table caption such as "Influence Checks" or
 *   "Object Armor Class" is followed by the table's header row, so it is not
 *   an entry.
 * - Class and subclass features are the `Level N: Name` headings, attributed to
 *   the class or subclass section they are printed in. The one subclass per
 *   class is named by `docs/srd/source/subclasses.txt`, whose `Level N:` list
 *   the full-text headings must reproduce exactly.
 * - Everything else is found by the line the SRD prints under its name: a
 *   stat block's size-and-type line followed by `AC`, a magic item's category
 *   and rarity line, a feat's category line, a Metamagic option's `Cost:`, a
 *   tool's `Ability:`, a poison's delivery line, a trap's severity line, a
 *   contagion's `Magical Contagion` line, a spell's level-and-school line.
 * - Spells, weapons and armour are read from their single-column extracts
 *   (`spell-descriptions.txt`, `weapons-table.txt`, `armor-table.txt`), so
 *   their spans are exact; weapon masteries are the names in the weapons
 *   table's Mastery column, located in the Mastery Properties section.
 *
 * A unit's full-text span runs from its heading to the row before the next
 * indexed heading in reading order. THE DERIVATION FAILS LOUDLY: a Contents
 * entry that cannot be located, a subclass feature list that disagrees with
 * the extract, a duplicate id, an empty span, an unknown glossary tag — each
 * throws, because a short index would silently leave rules unidentified.
 */

export const SRD_RULE_INDEX_SOURCES = {
  fullSrd: 'docs/srd/full/srd-5.2.1.txt',
  spellDescriptions: 'docs/srd/source/spell-descriptions.txt',
  weaponsTable: 'docs/srd/source/weapons-table.txt',
  armorTable: 'docs/srd/source/armor-table.txt',
  subclasses: 'docs/srd/source/subclasses.txt',
} as const;

export const SRD_RULE_INDEX_PATH = 'src/rules/srd/generated/rule-index.ts';
export const SRD_RULE_INDEX_DRIFT_TEST = 'tests/unit/rules/srd-rule-index-generation.test.ts';

/** Returns a corpus's text by its repository-relative path. */
export type SrdCorpusReader = (path: string) => string;

export class SrdRuleIndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SrdRuleIndexError';
  }
}

/** One derived row, before composition. */
export interface SrdRuleIndexRow extends SrdRuleIndexEntry {
  readonly id: string;
}

const FULL = SRD_RULE_INDEX_SOURCES.fullSrd;

/**
 * The SRD's chapters, as its Contents prints them, with the page each starts
 * on. This is the document's structure, not rules data: the derivation checks
 * that Contents lists each one at that page and throws otherwise.
 */
const CHAPTERS = [
  ['Playing the Game', 5],
  ['Character Creation', 19],
  ['Classes', 28],
  ['Character Origins', 83],
  ['Feats', 87],
  ['Equipment', 89],
  ['Spells', 104],
  ['Rules Glossary', 176],
  ['Gameplay Toolbox', 192],
  ['Magic Items', 204],
  ['Monsters', 254],
] as const;

const GLOSSARY_TAG_KINDS = {
  Action: 'action',
  'Area of Effect': 'area_of_effect',
  Attitude: 'attitude',
  Condition: 'condition',
  Hazard: 'hazard',
} as const satisfies Record<string, SrdRuleKind>;

const GLOSSARY_TAG = /^(?<name>.+?) \[(?<tag>[^\]]+)\]$/;
const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with', 'by', 'at', 'from', 'as', 'per', 'into', 'than',
]);
const SIZE = '(?:Tiny|Small|Medium|Large|Huge|Gargantuan)';
const CREATURE_TYPE =
  '(?:Aberration|Beast|Celestial|Construct|Dragon|Elemental|Fey|Fiend|Giant|Humanoid|Monstrosity|Ooze|Plant|Undead)';
/** A stat block's second line: its size and creature type. */
const STAT_BLOCK_TYPE_LINE = new RegExp(`^${SIZE}\\b[^.]*?\\b${CREATURE_TYPE}s?\\b`);
const STAT_BLOCK_AC_LINE = /^AC \d/;
const MAGIC_ITEM_CATEGORY = /^(?:Armor|Potion|Ring|Rod|Scroll|Staff|Wand|Weapon|Wondrous Item)(?: \(|,)/;
const MAGIC_ITEM_RARITY = /\b(?:Common|Uncommon|Rare|Very Rare|Legendary|Artifact|Rarity Varies)\b/;
const PRICED_HEADING = /^(?<name>.+?) \((?:[^()]*\b(?:CP|SP|EP|GP|PP)\b[^()]*|Varies)\)$/;
const FEAT_CATEGORY_LINE = /^(?:Origin|General|Fighting Style|Epic Boon) Feat\b/;
const SPELL_LEVEL_LINE = /^(?:Level [1-9] [A-Z][a-z]+ \(|[A-Z][a-z]+ Cantrip \()/;
const LEVEL_HEADING = /^Level (?<level>\d{1,2}): (?<name>\S.*)$/;
const TRAIT_LEAD = /^(?<name>[A-Z][A-Za-z'’ ]{1,40})\.\s/;

/* ==========================================================================
 * TEXT HELPERS
 * ========================================================================== */

/** The id segment for a printed name: lowercase ASCII words joined by `-`. */
export function srdSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'‘]/g, '')
    .replace(/\+/g, ' plus ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug === '') {
    throw new SrdRuleIndexError(`"${name}" has no id segment.`);
  }
  return slug;
}

function isTitleText(text: string): boolean {
  const bare = GLOSSARY_TAG.exec(text)?.groups?.name ?? text;
  if (bare.length === 0 || bare.length > 40 || /[.,;:!?]$/.test(bare) || /\s{2,}/.test(bare)) {
    return false;
  }
  const words = bare.split(/[ -]/);
  const [first, ...rest] = words;
  if (first === undefined || !/^[A-Z]/.test(first)) {
    return false;
  }
  return rest.every((raw) => {
    const word = raw.replace(/^[()’']+|[()’']+$/g, '');
    return word === '' || SMALL_WORDS.has(word.toLowerCase()) || /^[A-Z0-9]/.test(word);
  });
}

function isTableRow(text: string): boolean {
  return /\S {3,}\S/.test(text);
}

function samePlace(a: StreamRow, b: StreamRow): boolean {
  return a.page === b.page && a.column === b.column;
}

/**
 * A heading: Title Case, the end of the previous sentence (or a table, a
 * bullet, another heading, or a new column) above it, and the start of a
 * sentence below it.
 */
function isHeadingAt(rows: readonly StreamRow[], index: number): boolean {
  const row = rows[index];
  if (row === undefined || !isTitleText(row.text)) {
    return false;
  }
  const previous = rows[index - 1];
  if (previous !== undefined && samePlace(previous, row)) {
    const text = previous.text;
    if (!(/[.)”:\]]$/.test(text) || isTableRow(text) || text.startsWith('•') || isTitleText(text))) {
      return false;
    }
  }
  const next = rows[index + 1];
  return next !== undefined && /^[A-Z“]/.test(next.text) && !isTableRow(next.text);
}

function alphabeticalKey(name: string): string {
  return (GLOSSARY_TAG.exec(name)?.groups?.name ?? name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The longest run of candidates in strictly increasing alphabetical order. The
 * invocation list is printed alphabetically; each invocation's
 * `Prerequisite: Level N+ Warlock` line also reads as a heading, and repeats,
 * so it falls out of that order.
 */
function alphabeticalRun(rows: readonly StreamRow[], candidates: readonly number[]): number[] {
  const keys = candidates.map((index) => alphabeticalKey(rows[index]?.text ?? ''));
  const length: number[] = keys.map(() => 1);
  const previous: number[] = keys.map(() => -1);
  keys.forEach((key, i) => {
    for (let j = 0; j < i; j += 1) {
      const before = keys[j] ?? '';
      if (before < key && (length[j] ?? 0) + 1 > (length[i] ?? 0)) {
        length[i] = (length[j] ?? 0) + 1;
        previous[i] = j;
      }
    }
  });
  let end = -1;
  length.forEach((value, i) => {
    if (end < 0 || value > (length[end] ?? 0)) {
      end = i;
    }
  });
  const run: number[] = [];
  for (let i = end; i >= 0; i = previous[i] ?? -1) {
    const candidate = candidates[i];
    if (candidate !== undefined) {
      run.unshift(candidate);
    }
  }
  return run;
}

function headingsBetween(rows: readonly StreamRow[], from: number, to: number): number[] {
  const found: number[] = [];
  for (let index = from; index < to; index += 1) {
    if (isHeadingAt(rows, index)) {
      found.push(index);
    }
  }
  return found;
}

function rowAt(rows: readonly StreamRow[], index: number): StreamRow {
  const row = rows[index];
  if (row === undefined) {
    throw new SrdRuleIndexError(`Reading-order row ${String(index)} does not exist.`);
  }
  return row;
}

/* ==========================================================================
 * CONTENTS
 * ========================================================================== */

interface ContentsEntry {
  readonly title: string;
  readonly page: number;
  readonly line: number;
  readonly column: number;
}

const CONTENTS_ENTRY = /([^\s.](?:[^\s.]| (?! )|\.(?![.\d]))*?)\s*\.+\s*(\d+)(?=\s|$)/g;

/**
 * The entries of Contents (printed page 2, in three columns), in page order.
 * Entries of the Index of Stat Blocks, which starts in Contents' third column
 * under its own label, are not Contents entries and are dropped.
 */
function contentsEntries(fullText: string): ContentsEntry[] {
  const lines = fullText.split('\n');
  const contentsLine = lines.findIndex((line) => /^\f?\s*Contents\s/.test(line) || line.includes(' Contents   '));
  const footer = lines.findIndex((line, index) => index > contentsLine && /^\s*2\s+System Reference Document 5\.2\.1\s*$/.test(line));
  if (contentsLine < 0 || footer < 0) {
    throw new SrdRuleIndexError('Contents (printed page 2) was not found.');
  }
  const label = lines.findIndex((line, index) => index > contentsLine && index < footer && /Index of Stat\s*$/.test(line));
  const labelColumn = label < 0 ? Number.POSITIVE_INFINITY : (lines[label] ?? '').search(/Index of Stat/);
  const entries: ContentsEntry[] = [];
  for (let index = contentsLine; index < footer; index += 1) {
    const line = (lines[index] ?? '').replace(/^\f/, '');
    for (const match of line.matchAll(CONTENTS_ENTRY)) {
      const title = (match[1] ?? '').trim();
      const column = match.index;
      if (label >= 0 && index > label && column >= labelColumn - 12) {
        continue;
      }
      entries.push({ title, page: Number(match[2]), line: index + 1, column });
    }
  }
  return entries.sort((a, b) => a.page - b.page || a.line - b.line);
}

/** The row where a heading is printed on a page: exact, a chapter-title prefix, or wrapped over two rows. */
function locateHeading(rows: readonly StreamRow[], title: string, page: number): number | null {
  for (const candidatePage of [page, page + 1, page - 1]) {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rowAt(rows, index);
      if (row.page !== candidatePage) {
        continue;
      }
      if (row.text === title || row.text.startsWith(`${title}   `)) {
        return index;
      }
      const next = rows[index + 1];
      if (next !== undefined && samePlace(row, next) && `${row.text} ${next.text}` === title) {
        return index;
      }
    }
  }
  return null;
}

/* ==========================================================================
 * DERIVATION
 * ========================================================================== */

type Location =
  | { readonly corpus: 'full'; readonly row: number }
  | { readonly corpus: 'extract'; readonly path: string; readonly from: number; readonly to: number };

interface Draft {
  readonly id: string;
  readonly kind: SrdRuleKind;
  readonly name: string;
  readonly parent: string | null;
  readonly at: Location;
}

interface Derivation {
  readonly rows: readonly StreamRow[];
  readonly drafts: Draft[];
  /** Reading-order rows that end the span before them without being a unit. */
  readonly boundaries: Set<number>;
  /**
   * Rows of a full-width table printed inside a two-column page (a class's
   * Features table) or of a full-page table, by the unit that owns the table.
   * Reading order meets such a table between two columns of prose, so without
   * this the table would land in whichever unit's span it interrupts.
   */
  readonly claims: Map<number, string>;
}

function add(derivation: Derivation, draft: Draft): void {
  derivation.drafts.push(draft);
  if (draft.at.corpus === 'full') {
    derivation.boundaries.add(draft.at.row);
  }
}

function sectionIdAt(sections: readonly { readonly row: number; readonly id: string }[], row: number): string | null {
  let found: string | null = null;
  for (const section of sections) {
    if (section.row <= row) {
      found = section.id;
    }
  }
  return found;
}

function extractLines(text: string): string[] {
  return text.split('\n');
}

/** Subclass name and `Level N:` features per class, from the subclass extract. */
function subclassCatalog(extract: string): Map<string, { name: string; features: string[] }> {
  const lines = extractLines(extract).map((line) => line.trim());
  const start = lines.findIndex((line) => line.startsWith('--- Extracted catalog lines follow.'));
  if (start < 0) {
    throw new SrdRuleIndexError('The subclass extract has no catalog marker.');
  }
  const catalog = new Map<string, { name: string; features: string[] }>();
  let current: { cls: string; parts: string[]; features: string[]; closed: boolean } | null = null;
  const flush = (): void => {
    if (current !== null) {
      catalog.set(current.cls, { name: current.parts.join(' ').trim(), features: current.features });
    }
  };
  for (const line of lines.slice(start + 1)) {
    const heading = /^(?<cls>[A-Z][a-z]+) Subclass:\s*(?<rest>.*)$/.exec(line);
    if (heading?.groups !== undefined) {
      flush();
      current = { cls: heading.groups.cls ?? '', parts: [heading.groups.rest ?? ''], features: [], closed: false };
      continue;
    }
    if (current === null || line === '') {
      continue;
    }
    const level = LEVEL_HEADING.exec(line);
    if (level?.groups !== undefined) {
      current.closed = true;
      current.features.push(`${level.groups.level ?? ''}: ${level.groups.name ?? ''}`);
      continue;
    }
    if (!current.closed) {
      current.parts.push(line);
    }
  }
  flush();
  return catalog;
}

function deriveDrafts(read: SrdCorpusReader): Derivation {
  const fullText = read(FULL);
  const rows = srdReadingOrder(fullText);
  const derivation: Derivation = { rows, drafts: [], boundaries: new Set(), claims: new Map() };
  const rawLines = fullText.split('\n');
  /** Claims every row printed on `page` between the two lines, in either column. */
  const claim = (owner: string, page: number, fromLine: number, toLine: number): void => {
    rows.forEach((row, index) => {
      if (row.page === page && row.line >= fromLine && row.line <= toLine) {
        derivation.claims.set(index, owner);
      }
    });
  };
  const anchor = (title: string, page: number): number => {
    const index = locateHeading(rows, title, page);
    if (index === null) {
      throw new SrdRuleIndexError(`The heading "${title}" (Contents page ${String(page)}) is not printed on or beside that page.`);
    }
    return index;
  };

  /* ---- Contents, chapters and the class names ---- */
  const entries = contentsEntries(fullText);
  for (const [chapter, page] of CHAPTERS) {
    if (!entries.some((entry) => entry.title === chapter && entry.page === page)) {
      throw new SrdRuleIndexError(`Contents does not list the chapter "${chapter}" at page ${String(page)}.`);
    }
  }
  const chapterPages = (chapter: (typeof CHAPTERS)[number][0]): { readonly from: number; readonly to: number } => {
    const at = CHAPTERS.findIndex(([title]) => title === chapter);
    return { from: CHAPTERS[at]?.[1] ?? 0, to: CHAPTERS[at + 1]?.[1] ?? Number.MAX_SAFE_INTEGER };
  };
  const classPages = chapterPages('Classes');
  const classNames = rows
    .filter((row) => row.page >= classPages.from && row.page < classPages.to)
    .map((row) => /^Core (?<cls>[A-Z][a-z]+) Traits$/.exec(row.text)?.groups?.cls)
    .filter((cls): cls is string => cls !== undefined);
  if (classNames.length !== 12 || new Set(classNames).size !== 12) {
    throw new SrdRuleIndexError(`Expected twelve "Core <Class> Traits" tables, found ${String(classNames.length)}.`);
  }
  const chapterOf = (page: number): (typeof CHAPTERS)[number][0] | null => {
    let found: (typeof CHAPTERS)[number][0] | null = null;
    for (const [chapter, start] of CHAPTERS) {
      if (start <= page) {
        found = chapter;
      }
    }
    return found;
  };
  const chapterId = (chapter: string): string => `rule_section.${srdSlug(chapter)}`;
  const sections: { row: number; id: string }[] = [];
  const classAnchors = new Map<string, number>();
  const spellListAnchors = new Map<string, number>();
  const optionAnchors = new Map<string, { row: number; cls: string }>();
  const subclassNames = subclassCatalog(read(SRD_RULE_INDEX_SOURCES.subclasses));
  const subclassFragments = new Set(
    [...subclassNames.values()].flatMap(({ name }) => [name, ...name.split(' ')]),
  );
  let region: 'backgrounds' | 'species' | null = null;
  for (const entry of entries) {
    const chapter = chapterOf(entry.page);
    if (entry.title === 'Legal Information') {
      derivation.boundaries.add(anchor(entry.title, entry.page));
      continue;
    }
    if (chapter === null) {
      throw new SrdRuleIndexError(`Contents entry "${entry.title}" precedes every chapter.`);
    }
    const isChapter = CHAPTERS.some(([title, page]) => title === entry.title && page === entry.page);
    if (entry.title === 'Character Backgrounds') {
      region = 'backgrounds';
    } else if (entry.title === 'Character Species') {
      region = 'species';
    } else if (isChapter) {
      region = null;
    }
    if (chapter === 'Classes' && !isChapter) {
      const spellList = /^(?<cls>[A-Z][a-z]+) Spell List$/.exec(entry.title)?.groups?.cls;
      if (classNames.includes(entry.title)) {
        const row = anchor(entry.title, entry.page);
        classAnchors.set(entry.title, row);
        add(derivation, { id: `class.${srdSlug(entry.title)}`, kind: 'class', name: entry.title, parent: chapterId(chapter), at: { corpus: 'full', row } });
      } else if (spellList !== undefined && classNames.includes(spellList)) {
        const row = anchor(entry.title, entry.page);
        spellListAnchors.set(spellList, row);
        add(derivation, { id: `spell_list.${srdSlug(spellList)}`, kind: 'spell_list', name: entry.title, parent: `class.${srdSlug(spellList)}`, at: { corpus: 'full', row } });
      } else if (entry.title === 'Metamagic Options' || entry.title === 'Eldritch Invocation Options') {
        const cls = entry.title === 'Metamagic Options' ? 'Sorcerer' : 'Warlock';
        const row = anchor(entry.title, entry.page);
        optionAnchors.set(entry.title, { row, cls });
        add(derivation, { id: `rule_section.${srdSlug(cls)}.${srdSlug(entry.title)}`, kind: 'rule_section', name: entry.title, parent: `class.${srdSlug(cls)}`, at: { corpus: 'full', row } });
      } else if (entry.title.includes(' Subclass:') || subclassFragments.has(entry.title)) {
        // A subclass, or a piece of a Contents entry wrapped over two lines:
        // subclasses are taken from their printed headings below.
      } else {
        throw new SrdRuleIndexError(`Unclassified Classes-chapter Contents entry "${entry.title}".`);
      }
      continue;
    }
    const row = anchor(entry.title, entry.page);
    if (!isChapter && region === 'backgrounds' && entry.title !== 'Character Backgrounds') {
      add(derivation, { id: `background.${srdSlug(entry.title)}`, kind: 'background', name: entry.title, parent: 'rule_section.character-origins.character-backgrounds', at: { corpus: 'full', row } });
      continue;
    }
    if (!isChapter && region === 'species' && entry.title !== 'Character Species') {
      add(derivation, { id: `species.${srdSlug(entry.title)}`, kind: 'species', name: entry.title, parent: 'rule_section.character-origins.character-species', at: { corpus: 'full', row } });
      continue;
    }
    const id = isChapter ? chapterId(chapter) : `${chapterId(chapter)}.${srdSlug(entry.title)}`;
    sections.push({ row, id });
    add(derivation, { id, kind: 'rule_section', name: entry.title, parent: isChapter ? null : chapterId(chapter), at: { corpus: 'full', row } });
  }
  const sectionAnchor = (id: string): number => {
    const found = sections.find((section) => section.id === id);
    if (found === undefined) {
      throw new SrdRuleIndexError(`Rule section ${id} was not located.`);
    }
    return found.row;
  };
  const nextBoundaryAfter = (row: number): number => {
    let next = rows.length;
    for (const boundary of derivation.boundaries) {
      if (boundary > row && boundary < next) {
        next = boundary;
      }
    }
    return next;
  };

  /* ---- Rules Glossary ---- */
  {
    // The entries follow the "Rules Definitions" heading; before it are the
    // glossary's conventions and abbreviations (the chapter's own rule section).
    const glossary = sectionAnchor('rule_section.rules-glossary');
    const start = rows.findIndex((row, index) => index > glossary && row.text === 'Rules Definitions');
    if (start < 0) {
      throw new SrdRuleIndexError('"Rules Definitions" was not found.');
    }
    const end = sectionAnchor('rule_section.gameplay-toolbox');
    for (const index of headingsBetween(rows, start + 1, end)) {
      const text = rowAt(rows, index).text;
      const tagged = GLOSSARY_TAG.exec(text)?.groups;
      let kind: SrdRuleKind = 'glossary';
      let name = text;
      if (tagged !== undefined) {
        const tag = tagged.tag ?? '';
        if (!Object.hasOwn(GLOSSARY_TAG_KINDS, tag)) {
          throw new SrdRuleIndexError(`Glossary entry "${text}" has an unknown tag.`);
        }
        kind = GLOSSARY_TAG_KINDS[tag as keyof typeof GLOSSARY_TAG_KINDS];
        name = tagged.name ?? text;
      }
      add(derivation, { id: `${kind}.${srdSlug(name)}`, kind, name, parent: 'rule_section.rules-glossary', at: { corpus: 'full', row: index } });
    }
  }

  /* ---- Classes: features, subclasses, options ---- */
  {
    const from = sectionAnchor('rule_section.classes');
    const to = sectionAnchor('rule_section.character-origins');
    const classAt = [...classAnchors.entries()].sort((a, b) => a[1] - b[1]);
    const stops = new Set<number>([...spellListAnchors.values(), ...[...optionAnchors.values()].map(({ row }) => row)]);
    // Each class's Features table is printed full width and ends at its level
    // 20 row, before the first pair of blank lines.
    for (const [owner] of classAt) {
      const title = rows.findIndex((row, index) => index >= from && index < to && row.text === `${owner} Features` && (rawLines[row.line - 1] ?? '').replace(/^\f/, '').trim() === row.text);
      const titleRow = rows[title];
      if (titleRow === undefined) {
        throw new SrdRuleIndexError(`The ${owner} Features table was not found.`);
      }
      let last = titleRow.line;
      while (last < rawLines.length && !((rawLines[last] ?? '').trim() === '' && (rawLines[last + 1] ?? '').trim() === '')) {
        last += 1;
      }
      claim(`class.${srdSlug(owner)}`, titleRow.page, titleRow.line, last);
    }
    let cls: string | null = null;
    let context: 'class' | 'subclass' | 'none' = 'none';
    let subclassId: string | null = null;
    const printedSubclassFeatures = new Map<string, string[]>();
    for (let index = from; index < to; index += 1) {
      const row = rowAt(rows, index);
      const starting = classAt.find(([, at]) => at === index);
      if (starting !== undefined) {
        cls = starting[0];
        context = 'class';
        continue;
      }
      if (stops.has(index)) {
        context = 'none';
        continue;
      }
      const subclassHeading = /^(?<owner>[A-Z][a-z]+) Subclass:/.exec(row.text)?.groups?.owner;
      if (subclassHeading !== undefined && subclassHeading === cls) {
        const printed = subclassNames.get(cls);
        if (printed === undefined) {
          throw new SrdRuleIndexError(`The subclass extract names no ${cls} subclass.`);
        }
        subclassId = `subclass.${srdSlug(printed.name)}`;
        context = 'subclass';
        add(derivation, { id: subclassId, kind: 'subclass', name: printed.name, parent: `class.${srdSlug(cls)}`, at: { corpus: 'full', row: index } });
        continue;
      }
      const level = LEVEL_HEADING.exec(row.text)?.groups;
      if (level === undefined || cls === null) {
        continue;
      }
      const name = level.name ?? '';
      const printedLevel = level.level ?? '';
      if (context === 'class') {
        add(derivation, { id: `class_feature.${srdSlug(cls)}.${printedLevel}.${srdSlug(name)}`, kind: 'class_feature', name, parent: `class.${srdSlug(cls)}`, at: { corpus: 'full', row: index } });
      } else if (context === 'subclass' && subclassId !== null) {
        const subclass = subclassId.slice('subclass.'.length);
        add(derivation, { id: `subclass_feature.${subclass}.${printedLevel}.${srdSlug(name)}`, kind: 'subclass_feature', name, parent: subclassId, at: { corpus: 'full', row: index } });
        printedSubclassFeatures.set(cls, [...(printedSubclassFeatures.get(cls) ?? []), `${printedLevel}: ${name}`]);
      } else {
        throw new SrdRuleIndexError(`"${row.text}" (line ${String(row.line)}) is outside any class or subclass feature list.`);
      }
    }
    for (const [owner, { features }] of subclassNames) {
      const printed = [...(printedSubclassFeatures.get(owner) ?? [])].sort();
      const extracted = [...features].sort();
      if (JSON.stringify(printed) !== JSON.stringify(extracted)) {
        throw new SrdRuleIndexError(`${owner} subclass features in the full text (${printed.join('; ')}) differ from the extract (${extracted.join('; ')}).`);
      }
    }
    // Metamagic options: a heading followed by its Sorcery Point cost.
    const metamagic = optionAnchors.get('Metamagic Options');
    const invocations = optionAnchors.get('Eldritch Invocation Options');
    if (metamagic === undefined || invocations === undefined) {
      throw new SrdRuleIndexError('The Metamagic or Eldritch Invocation options were not located.');
    }
    const metamagicEnd = spellListAnchors.get('Sorcerer');
    if (metamagicEnd === undefined) {
      throw new SrdRuleIndexError('The Sorcerer Spell List was not located.');
    }
    for (let index = metamagic.row + 1; index < metamagicEnd; index += 1) {
      const next = rows[index + 1];
      if (next !== undefined && /^Cost: \d+ Sorcery Points?$/.test(next.text) && isTitleText(rowAt(rows, index).text)) {
        const name = rowAt(rows, index).text;
        add(derivation, { id: `class_option.sorcerer.${srdSlug(name)}`, kind: 'class_option', name, parent: 'class.sorcerer', at: { corpus: 'full', row: index } });
      }
    }
    // Invocations: the alphabetical headings of the option list.
    const invocationEnd = spellListAnchors.get('Warlock');
    if (invocationEnd === undefined) {
      throw new SrdRuleIndexError('The Warlock Spell List was not located.');
    }
    for (const index of alphabeticalRun(rows, headingsBetween(rows, invocations.row + 1, invocationEnd))) {
      const name = rowAt(rows, index).text;
      add(derivation, { id: `class_option.warlock.${srdSlug(name)}`, kind: 'class_option', name, parent: 'class.warlock', at: { corpus: 'full', row: index } });
    }
  }

  /* ---- Species traits ---- */
  {
    const species = derivation.drafts.filter((draft) => draft.kind === 'species');
    for (const draft of species) {
      if (draft.at.corpus !== 'full') {
        continue;
      }
      const end = nextBoundaryAfter(draft.at.row);
      for (let index = draft.at.row + 1; index < end; index += 1) {
        const row = rowAt(rows, index);
        const name = TRAIT_LEAD.exec(row.text)?.groups?.name;
        if (row.indent <= 0 || name === undefined) {
          continue;
        }
        const words = name.split(' ');
        if (words.length > 4 || !words.every((word) => /^[A-Z][A-Za-z'’]*$/.test(word))) {
          continue;
        }
        add(derivation, { id: `species_trait.${srdSlug(draft.name)}.${srdSlug(name)}`, kind: 'species_trait', name, parent: draft.id, at: { corpus: 'full', row: index } });
      }
    }
  }

  /* ---- Feats ---- */
  {
    const from = sectionAnchor('rule_section.feats');
    const to = sectionAnchor('rule_section.equipment');
    for (let index = from; index < to; index += 1) {
      const next = rows[index + 1];
      const row = rowAt(rows, index);
      if (next !== undefined && FEAT_CATEGORY_LINE.test(next.text) && isTitleText(row.text)) {
        add(derivation, { id: `feat.${srdSlug(row.text)}`, kind: 'feat', name: row.text, parent: sectionIdAt(sections, index), at: { corpus: 'full', row: index } });
      }
    }
  }

  /* ---- Equipment ---- */
  {
    const properties = sectionAnchor('rule_section.equipment.properties');
    const mastery = sectionAnchor('rule_section.equipment.mastery-properties');
    for (const index of headingsBetween(rows, properties + 1, mastery)) {
      const name = rowAt(rows, index).text;
      add(derivation, { id: `weapon_property.${srdSlug(name)}`, kind: 'weapon_property', name, parent: 'rule_section.equipment.properties', at: { corpus: 'full', row: index } });
    }
    const weapons = weaponRows(read(SRD_RULE_INDEX_SOURCES.weaponsTable));
    const masteries = [...new Set(weapons.map((weapon) => weapon.mastery))].sort();
    const armor = sectionAnchor('rule_section.equipment.armor');
    for (const name of masteries) {
      let found = -1;
      for (let index = mastery + 1; index < armor; index += 1) {
        if (rowAt(rows, index).text === name && isHeadingAt(rows, index)) {
          found = index;
          break;
        }
      }
      if (found < 0) {
        throw new SrdRuleIndexError(`The mastery property "${name}" has no heading in Mastery Properties.`);
      }
      add(derivation, { id: `weapon_mastery.${srdSlug(name)}`, kind: 'weapon_mastery', name, parent: 'rule_section.equipment.mastery-properties', at: { corpus: 'full', row: found } });
    }
    // The Weapons and Adventuring Gear tables are each a full page of their own,
    // printed after the section's descriptions begin: the section owns the page.
    const fullPageTable = (owner: string, from: number, to: number, title: RegExp, header: RegExp): void => {
      const at = rows.findIndex((row, index) => index > from && index < to && row.column === 'whole' && title.test(row.text) && header.test(rows[index + 1]?.text ?? ''));
      const titleRow = rows[at];
      if (titleRow === undefined) {
        throw new SrdRuleIndexError(`The full-page table of ${owner} was not found.`);
      }
      claim(owner, titleRow.page, titleRow.line, Number.MAX_SAFE_INTEGER);
    };
    fullPageTable('rule_section.equipment.weapons', mastery, armor, /^Weapons$/, /^Name\s+Damage\s+Properties/);
    for (const weapon of weapons) {
      add(derivation, { id: `weapon.${srdSlug(weapon.name)}`, kind: 'weapon', name: weapon.name, parent: 'rule_section.equipment.weapons', at: { corpus: 'extract', path: SRD_RULE_INDEX_SOURCES.weaponsTable, from: weapon.from, to: weapon.to } });
    }
    for (const row of armorRows(read(SRD_RULE_INDEX_SOURCES.armorTable))) {
      add(derivation, { id: `armor.${srdSlug(row.name)}`, kind: 'armor', name: row.name, parent: 'rule_section.equipment.armor', at: { corpus: 'extract', path: SRD_RULE_INDEX_SOURCES.armorTable, from: row.from, to: row.to } });
    }
    const tools = sectionAnchor('rule_section.equipment.tools');
    const gear = sectionAnchor('rule_section.equipment.adventuring-gear');
    for (let index = tools + 1; index < gear; index += 1) {
      const name = PRICED_HEADING.exec(rowAt(rows, index).text)?.groups?.name;
      const next = rows[index + 1];
      if (name !== undefined && next !== undefined && next.text.startsWith('Ability:')) {
        add(derivation, { id: `tool.${srdSlug(name)}`, kind: 'tool', name, parent: 'rule_section.equipment.tools', at: { corpus: 'full', row: index } });
      }
    }
    const mounts = sectionAnchor('rule_section.equipment.mounts-and-vehicles');
    fullPageTable('rule_section.equipment.adventuring-gear', gear, mounts, /^Adventuring Gear\s{3,}Item\b/, /^Item\s+Weight\s+Cost/);
    for (let index = gear + 1; index < mounts; index += 1) {
      const row = rowAt(rows, index);
      if (isTableRow(row.text)) {
        continue;
      }
      let heading = row.text;
      const next = rows[index + 1];
      if (/\([^)]*$/.test(heading) && next !== undefined && samePlace(row, next) && /^[^()]*\)$/.test(next.text)) {
        heading = `${heading} ${next.text}`;
      }
      const name = PRICED_HEADING.exec(heading)?.groups?.name;
      if (name !== undefined) {
        add(derivation, { id: `adventuring_gear.${srdSlug(name)}`, kind: 'adventuring_gear', name, parent: 'rule_section.equipment.adventuring-gear', at: { corpus: 'full', row: index } });
      }
    }
  }

  /* ---- Spells (from the single-column extract) ---- */
  {
    const spellText = read(SRD_RULE_INDEX_SOURCES.spellDescriptions);
    for (const spell of spellEntries(spellText)) {
      const spellId = `spell.${srdSlug(spell.name)}`;
      add(derivation, { id: spellId, kind: 'spell', name: spell.name, parent: 'rule_section.spells.spell-descriptions', at: { corpus: 'extract', path: SRD_RULE_INDEX_SOURCES.spellDescriptions, from: spell.from, to: spell.to } });
      for (const block of spell.statBlocks) {
        add(derivation, { id: `stat_block.${srdSlug(block.name)}`, kind: 'stat_block', name: block.name, parent: spellId, at: { corpus: 'extract', path: SRD_RULE_INDEX_SOURCES.spellDescriptions, from: block.from, to: spell.to } });
      }
    }
    // In the full text, each spell heading ends the span before it; the spell
    // itself is identified by the extract above.
    const from = sectionAnchor('rule_section.spells.spell-descriptions');
    const to = sectionAnchor('rule_section.rules-glossary');
    for (let index = from + 1; index < to; index += 1) {
      const next = rows[index + 1];
      if (next !== undefined && SPELL_LEVEL_LINE.test(next.text) && isTitleText(rowAt(rows, index).text)) {
        derivation.boundaries.add(index);
      }
    }
  }

  /* ---- Magic items and their stat blocks ---- */
  const itemsFrom = sectionAnchor('rule_section.magic-items.magic-items-a-z');
  const monstersFrom = sectionAnchor('rule_section.monsters');
  {
    let item: string | null = null;
    for (let index = itemsFrom + 1; index < monstersFrom; index += 1) {
      const row = rowAt(rows, index);
      const next = rows[index + 1];
      if (MAGIC_ITEM_CATEGORY.test(row.text) && !isTableRow(row.text)) {
        const continues = /,$|\([^)]*$/.test(row.text) && next !== undefined;
        if (MAGIC_ITEM_RARITY.test(row.text) || (continues && MAGIC_ITEM_RARITY.test(next.text))) {
          let nameRow = index - 1;
          let name = rowAt(rows, nameRow).text;
          if (/^[a-z]/.test(name)) {
            nameRow -= 1;
            name = `${rowAt(rows, nameRow).text} ${name}`;
          }
          item = `magic_item.${srdSlug(name)}`;
          add(derivation, { id: item, kind: 'magic_item', name, parent: 'rule_section.magic-items.magic-items-a-z', at: { corpus: 'full', row: nameRow } });
          continue;
        }
      }
      if (next !== undefined && STAT_BLOCK_TYPE_LINE.test(next.text) && acFollows(rows, index + 2)) {
        add(derivation, { id: `stat_block.${srdSlug(row.text)}`, kind: 'stat_block', name: row.text, parent: item, at: { corpus: 'full', row: index } });
      }
    }
  }

  /* ---- Monsters and Animals ---- */
  for (let index = monstersFrom + 1; index < rows.length; index += 1) {
    const next = rows[index + 1];
    const row = rowAt(rows, index);
    if (next !== undefined && STAT_BLOCK_TYPE_LINE.test(next.text) && acFollows(rows, index + 2)) {
      add(derivation, { id: `stat_block.${srdSlug(row.text)}`, kind: 'stat_block', name: row.text, parent: sectionIdAt(sections, index), at: { corpus: 'full', row: index } });
    }
  }

  /* ---- Gameplay Toolbox ---- */
  {
    const toolbox = sectionAnchor('rule_section.gameplay-toolbox');
    const itemsChapter = sectionAnchor('rule_section.magic-items');
    const environmental = sectionAnchor('rule_section.gameplay-toolbox.environmental-effects');
    const fear = sectionAnchor('rule_section.gameplay-toolbox.fear-and-mental-stress');
    for (const index of headingsBetween(rows, environmental + 1, fear)) {
      const name = rowAt(rows, index).text;
      add(derivation, { id: `environmental_effect.${srdSlug(name)}`, kind: 'environmental_effect', name, parent: 'rule_section.gameplay-toolbox.environmental-effects', at: { corpus: 'full', row: index } });
    }
    for (let index = toolbox + 1; index < itemsChapter; index += 1) {
      const row = rowAt(rows, index);
      const next = rows[index + 1];
      if (next === undefined) {
        continue;
      }
      if (next.text === 'Magical Contagion' && isTitleText(row.text)) {
        add(derivation, { id: `magical_contagion.${srdSlug(row.text)}`, kind: 'magical_contagion', name: row.text, parent: sectionIdAt(sections, index), at: { corpus: 'full', row: index } });
      }
      const poison = PRICED_HEADING.exec(row.text)?.groups?.name;
      if (poison !== undefined && /^(?:Contact|Ingested|Inhaled|Injury) Poison$/.test(next.text)) {
        add(derivation, { id: `poison.${srdSlug(poison)}`, kind: 'poison', name: poison, parent: sectionIdAt(sections, index), at: { corpus: 'full', row: index } });
      }
      if (/^(?:Deadly|Nuisance) Trap \(Levels? /.test(next.text) && isTitleText(row.text)) {
        add(derivation, { id: `trap.${srdSlug(row.text)}`, kind: 'trap', name: row.text, parent: sectionIdAt(sections, index), at: { corpus: 'full', row: index } });
      }
    }
  }
  return derivation;
}

function acFollows(rows: readonly StreamRow[], from: number): boolean {
  for (let index = from; index < from + 3; index += 1) {
    const row = rows[index];
    if (row !== undefined && STAT_BLOCK_AC_LINE.test(row.text)) {
      return true;
    }
  }
  return false;
}

interface ExtractUnit {
  readonly name: string;
  readonly from: number;
  readonly to: number;
}

/** Weapon table rows: name, the printed mastery, and the lines the row occupies. */
function weaponRows(extract: string): (ExtractUnit & { readonly mastery: string })[] {
  const lines = extractLines(extract);
  const found: (ExtractUnit & { mastery: string })[] = [];
  lines.forEach((line, index) => {
    const row = /^ {6}(?<name>\S.*?)\s+(?:\d+d\d+|\d+) (?:Bludgeoning|Piercing|Slashing)\b/.exec(line)?.groups;
    if (row === undefined) {
      return;
    }
    const mastery = /\s(?<mastery>[A-Z][a-z]+)\s+(?:[\d/]+ lb\.|—)\s+[\d,]+ [CSG]P\s*$/.exec(line)?.groups?.mastery;
    if (mastery === undefined) {
      throw new SrdRuleIndexError(`Weapon row ${String(index + 1)} has no Mastery cell.`);
    }
    let to = index + 1;
    while (/^ {20,}\S/.test(lines[to] ?? '')) {
      to += 1;
    }
    found.push({ name: (row.name ?? '').trim(), mastery, from: index + 1, to });
  });
  return found;
}

/** Armor table rows: one per armour, indented under its category row. */
function armorRows(extract: string): ExtractUnit[] {
  return extractLines(extract).flatMap((line, index) => {
    const name = /^ {7}(?<name>\S.*?)\s{2,}\S/.exec(line)?.groups?.name;
    return name === undefined ? [] : [{ name, from: index + 1, to: index + 1 }];
  });
}

interface SpellEntry extends ExtractUnit {
  readonly statBlocks: readonly ExtractUnit[];
}

/** Spell Descriptions entries: a name line whose next printed line is its level and school. */
function spellEntries(extract: string): SpellEntry[] {
  const lines = extractLines(extract);
  const isMarker = (line: string): boolean => /^=== SRD 5\.2\.1 page \d+, (?:left|right) column ===$/.test(line.trim());
  const nextPrinted = (from: number): number => {
    let index = from;
    while (index < lines.length && ((lines[index] ?? '').trim() === '' || isMarker(lines[index] ?? ''))) {
      index += 1;
    }
    return index;
  };
  const heads: number[] = [];
  lines.forEach((line, index) => {
    const text = line.trim();
    if (text === '' || isMarker(line)) {
      return;
    }
    const next = lines[nextPrinted(index + 1)] ?? '';
    if (SPELL_LEVEL_LINE.test(next.trim())) {
      heads.push(index);
    }
  });
  return heads.map((head, position) => {
    const limit = heads[position + 1] ?? lines.length;
    let last = limit - 1;
    while (last > head && ((lines[last] ?? '').trim() === '' || isMarker(lines[last] ?? ''))) {
      last -= 1;
    }
    const statBlocks: ExtractUnit[] = [];
    for (let index = head + 1; index <= last; index += 1) {
      const text = (lines[index] ?? '').trim();
      if (!new RegExp(`^${SIZE}\\b`).test(text) || !new RegExp(`\\b${CREATURE_TYPE}\\b`).test(text)) {
        continue;
      }
      const ac = (lines[nextPrinted(index + 1)] ?? '').trim();
      if (!STAT_BLOCK_AC_LINE.test(ac)) {
        continue;
      }
      let nameLine = index - 1;
      while (nameLine > head && (lines[nameLine] ?? '').trim() === '') {
        nameLine -= 1;
      }
      statBlocks.push({ name: (lines[nameLine] ?? '').trim(), from: nameLine + 1, to: last + 1 });
    }
    return { name: (lines[head] ?? '').trim(), from: head + 1, to: last + 1, statBlocks };
  });
}

function fullSpans(derivation: Derivation, row: number, owner: string): [SrdSpan, ...SrdSpan[]] {
  let end = derivation.rows.length;
  for (const boundary of derivation.boundaries) {
    if (boundary > row && boundary < end) {
      end = boundary;
    }
  }
  const indices: number[] = [];
  for (let index = row; index < end; index += 1) {
    if (index === row || !derivation.claims.has(index)) {
      indices.push(index);
    }
  }
  for (const [index, claimant] of derivation.claims) {
    if (claimant === owner) {
      indices.push(index);
    }
  }
  indices.sort((a, b) => a - b);
  const spans: SrdSpan[] = [];
  // A segment is a run of rows adjacent in reading order and in one column of
  // one page; a claimed table or another unit between two rows splits it.
  let segment: { first: StreamRow; last: StreamRow; index: number } | null = null;
  const close = (): void => {
    if (segment === null) {
      return;
    }
    const { first, last } = segment;
    const range = `${FULL}:${first.line}-${last.line}` as const;
    spans.push(first.column === 'whole' ? range : `${range}@${first.column}`);
    segment = null;
  };
  for (const index of indices) {
    const current = rowAt(derivation.rows, index);
    if (segment !== null && index === segment.index + 1 && samePlace(segment.first, current)) {
      segment.last = current;
      segment.index = index;
      continue;
    }
    close();
    segment = { first: current, last: current, index };
  }
  close();
  const [first, ...rest] = spans;
  if (first === undefined) {
    throw new SrdRuleIndexError(`The unit at reading-order row ${String(row)} has an empty span.`);
  }
  return [first, ...rest];
}

/** Every rule unit, in kind order and then printed order. */
export function deriveSrdRuleIndex(read: SrdCorpusReader): readonly SrdRuleIndexRow[] {
  const derivation = deriveDrafts(read);
  const seen = new Set<string>();
  const indexed = derivation.drafts.map((draft, order) => {
    if (seen.has(draft.id)) {
      throw new SrdRuleIndexError(`Two rule units derive the id ${draft.id}.`);
    }
    seen.add(draft.id);
    const spans: [SrdSpan, ...SrdSpan[]] =
      draft.at.corpus === 'full'
        ? fullSpans(derivation, draft.at.row, draft.id)
        : [`${draft.at.path as `docs/srd/source/${string}.txt`}:${draft.at.from}-${draft.at.to}`];
    const position = draft.at.corpus === 'full' ? draft.at.row : order;
    const entry: SrdRuleIndexRow = draft.parent === null
      ? { id: draft.id, kind: draft.kind, name: draft.name, spans }
      : { id: draft.id, kind: draft.kind, name: draft.name, spans, parent: draft.parent };
    return { entry, position, extract: draft.at.corpus === 'extract' ? order : -1 };
  });
  for (const { entry } of indexed) {
    if (entry.parent !== undefined && !seen.has(entry.parent)) {
      throw new SrdRuleIndexError(`${entry.id} names the parent ${entry.parent}, which is not a rule unit.`);
    }
  }
  const kindOrder = new Map<SrdRuleKind, number>(SRD_RULE_KINDS.map((kind, index) => [kind, index]));
  return indexed
    .sort((a, b) =>
      (kindOrder.get(a.entry.kind) ?? 0) - (kindOrder.get(b.entry.kind) ?? 0) ||
      a.extract - b.extract ||
      a.position - b.position)
    .map(({ entry }) => entry);
}

const SRD_ATTRIBUTION = [
  'This work includes material from the System Reference Document 5.2.1',
  '("SRD 5.2.1") by Wizards of the Coast LLC, available at',
  'https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative',
  'Commons Attribution 4.0 International License, available at',
  'https://creativecommons.org/licenses/by/4.0/legalcode.',
] as const;

/** The generated module's complete text, derived from the corpora `read` returns. */
export function composeSrdRuleIndexModule(read: SrdCorpusReader): string {
  const declared = new Set<string>(Object.values(SRD_RULE_INDEX_SOURCES));
  const rows = deriveSrdRuleIndex((path) => {
    if (!declared.has(path)) {
      throw new SrdRuleIndexError(`The rule index read ${path}, which is not one of its declared sources.`);
    }
    return read(path);
  });
  const body = rows.map((row) => {
    const fields = [
      `kind: ${JSON.stringify(row.kind)}`,
      `name: ${JSON.stringify(row.name)}`,
      `spans: [${row.spans.map((span) => JSON.stringify(span)).join(', ')}]`,
      ...(row.parent === undefined ? [] : [`parent: ${JSON.stringify(row.parent)}`]),
    ];
    return `  ${JSON.stringify(row.id)}: { ${fields.join(', ')} },`;
  });
  return [
    '// GENERATED FILE — DO NOT EDIT BY HAND.',
    '// Source of truth, read by scripts/srd/rule-index.ts:',
    ...Object.values(SRD_RULE_INDEX_SOURCES).map((source) => `//   ${source}`),
    '// Regenerate with `npm run srd:rule-index`.',
    `// ${SRD_RULE_INDEX_DRIFT_TEST} fails if it drifts.`,
    '/**',
    ...SRD_ATTRIBUTION.map((line) => ` * ${line}`),
    ' */',
    "import type { SrdRuleIndexEntry } from '../rule-index-types';",
    '',
    `/** ${String(rows.length)} SRD 5.2.1 rule units, keyed by \`SrdRuleId\`. */`,
    'export const SRD_RULE_INDEX = {',
    ...body,
    '} as const satisfies Readonly<Record<string, SrdRuleIndexEntry>>;',
    '',
  ].join('\n');
}

/**
 * The drift check: the committed module must be byte-for-byte what the SRD
 * text derives now.
 */
export function assertSrdRuleIndexFresh(read: SrdCorpusReader, committed: string): void {
  const composed = composeSrdRuleIndexModule(read);
  if (composed === committed) {
    return;
  }
  const composedLines = composed.split('\n');
  const committedLines = committed.split('\n');
  const line = composedLines.findIndex((text, index) => text !== committedLines[index]);
  const at = line < 0 ? committedLines.length : line;
  throw new SrdRuleIndexError(
    `${SRD_RULE_INDEX_PATH} is stale at line ${String(at + 1)}: the SRD text derives ` +
      `${JSON.stringify(composedLines[at] ?? '<end of file>')}, the committed file has ` +
      `${JSON.stringify(committedLines[at] ?? '<end of file>')}. Run \`npm run srd:rule-index\`; never edit it by hand.`,
  );
}
