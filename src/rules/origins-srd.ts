/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE SPECIES AND BACKGROUND CATALOGS ARE PARSED, NOT TRANSCRIBED.
 *
 * The two files this module imports are verbatim `pdftotext -layout` extracts
 * committed with their provenance — document URL, byte size, per-file SHA-256
 * and the exact command — in `docs/srd/SOURCE.md`. Everything written to the
 * database is derived from them, so `git diff` on a `.txt` file under
 * `docs/srd/source/` is the whole review and a value that is not in that file
 * cannot reach the catalog at all.
 *
 * WHY THIS IS HARDER THAN THE WEAPONS TABLE, AND WHAT WAS MEASURED.
 * The weapons extract is one table on one page. Species run across three
 * two-column pages with two FULL-WIDTH tables cutting across the columns, and
 * the naive readings fail in ways that look fine on a spot check:
 *
 *  - Reading the pages top-to-bottom interleaves TWO DIFFERENT SPECIES on every
 *    line, because `-layout` preserves both columns.
 *  - Splitting at a fixed column silently cuts the `Fiendish Legacies` table in
 *    half — its `Level 1` cell ends at column 56 and its `Level 3` cell starts
 *    at 65, so a gutter at 60 sends `Ray of Sickness  Hold Person` into the
 *    Tiefling's prose and `Abyssal  You have Resistance...` into the Human's.
 *    Full-width tables are therefore LIFTED OUT FIRST, and the parser then
 *    requires a gutter that NO remaining line crosses (measured: column 63 on
 *    page 84, 61-66 on page 85 after lifting, 60 on page 86).
 *  - Detecting trait leads by indentation and Title Case alone finds 37 traits
 *    where the source prints 33: it promotes the wrapped line `You have
 *    Resistance to / Poison damage. You also...` and the Gnome's `Forest Gnome.`
 *    / `Rock Gnome.` sub-options. Leads are therefore taken only from lines
 *    indented past their OWN COLUMN'S base, which the sub-options are not.
 *
 * THE PARSER FAILS LOUDLY, ON PURPOSE — the same rule `weapons-srd.ts` states.
 * A page count that is not three, a species count that is not nine, a
 * background count that is not four, a species missing its Creature Type / Size
 * / Speed, a declared table caption that is absent, a gutter that does not
 * exist, a hand-declared effect naming a trait the parse did not produce: every
 * one of these throws. Skipping what it does not understand is what turns an
 * extraction change into a silently short catalog.
 *
 * WHAT IS DELIBERATELY NOT PARSED, AND IS REPORTED RATHER THAN GUESSED:
 *
 *  - The printed HEIGHT RANGES (`Medium (about 5-7 feet tall)`). Flavour; the
 *    schema stores the size word.
 *  - LINEAGE SUB-CHOICES as structured rows. Drow / High Elf / Wood Elf,
 *    Forest / Rock Gnome and the three Fiendish legacies stay inside the trait
 *    text they belong to, verbatim, because modelling a sub-choice is a
 *    cardinality the origins schema deliberately does not have. The Wood Elf's
 *    35-foot Speed and each legacy's damage resistance live there and are NOT
 *    promoted onto the species — see `speciesTraitEffectKinds`.
 *  - PARAGRAPH STRUCTURE within a trait. A trait's prose is joined into one
 *    paragraph. The source's paragraph breaks are expressed only as a +2 indent
 *    that the Gnome's sub-options invert, so no rule reproduces them without
 *    also mis-splitting that trait; one paragraph is the honest loss.
 *  - COLUMN STRUCTURE within an ATTACHED TABLE, which is a DIFFERENT loss from
 *    the one above and was first disclosed as if it were the same one. A
 *    lifted table's lines are stored trimmed, so a cell that wrapped loses the
 *    indentation that told a reader it continued the row above: in
 *    `Elven Lineages`, the continuation `a Long Rest, you can replace that
 *    cantrip...` ends up at the same column as `Drow`. Every character
 *    survives and the rows stay inferable from the caption's own header line,
 *    but the alignment does not. Preserving it would mean carrying each band's
 *    original column offsets through the dedent that makes trait leads
 *    detectable at all, which is a second layout model for three tables.
 */
import speciesExtract from '../../docs/srd/source/species-descriptions.txt?raw';
import backgroundsExtract from '../../docs/srd/source/backgrounds.txt?raw';
import type { DatabaseContext } from '../db/database';
import type { SpeciesTraitEffectKind } from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';

/** The rules edition every bundled species and background belongs to. */
export const BUNDLED_ORIGIN_RULES_EDITION = '2024';

export class OriginExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OriginExtractError';
  }
}

/**
 * One parsed species trait. The field names are the `species_template_traits`
 * column names, and that is not laziness: the seeder inserts this object
 * column-wise, and `speciesTraitFromTemplate` copies the same names onto the
 * character's row. Keeping the lists identical is what makes the copy need no
 * mapping table.
 */
export interface SrdSpeciesTrait {
  readonly name: string;
  readonly description: string;
  readonly effect_kind: SpeciesTraitEffectKind | null;
  readonly effect_damage_type: string | null;
  readonly effect_hit_points_flat: number | null;
  readonly effect_hit_points_per_level: number | null;
  readonly effect_speed_bonus_feet: number | null;
}

export interface SrdSpeciesTemplate {
  readonly content_key: string;
  readonly name: string;
  readonly creature_type: string;
  readonly size: string;
  readonly alternate_size: string | null;
  readonly base_speed_feet: number;
  readonly traits: readonly SrdSpeciesTrait[];
}

export interface SrdBackgroundTemplate {
  readonly content_key: string;
  readonly name: string;
  readonly ability_score_1: string;
  readonly ability_score_2: string;
  readonly ability_score_3: string;
  readonly feat_name: string;
  readonly skill_proficiency_1: string;
  readonly skill_proficiency_2: string;
  readonly tool_proficiency: string;
  readonly equipment_option_a: string;
  readonly equipment_option_b: string;
}

/* ==========================================================================
 * HAND-DECLARED FACTS ABOUT THE SOURCE
 * ========================================================================== */

/**
 * The two tables printed at FULL PAGE WIDTH, named because a table cannot be
 * told from two columns of prose by geometry alone — `Fiendish Legacies` does
 * not reach across the gutter, and `Draconic Ancestors` sits entirely inside
 * the left column while its caption line shares a row with the Dwarf's
 * `Stonecunning`. Two strings, checked: each must appear exactly once as a
 * whole line, and each must be referenced by the prose of exactly one trait.
 *
 * Precedent: `GROUP_HEADINGS` in `weapons-srd.ts` names its four table headings
 * the same way and for the same reason.
 */
const FULL_WIDTH_TABLE_CAPTIONS = ['Elven Lineages', 'Fiendish Legacies'];

/** The one table printed INSIDE a column, detected after the column split. */
const IN_COLUMN_TABLE_CAPTIONS = ['Draconic Ancestors'];

const ALL_TABLE_CAPTIONS = [
  ...FULL_WIDTH_TABLE_CAPTIONS,
  ...IN_COLUMN_TABLE_CAPTIONS,
];

/**
 * THE NINE SPECIES, AS THE DOCUMENT ITSELF NAMES THEM SOMEWHERE ELSE.
 *
 * Transcribed from the SRD's own prose list in the character-creation chapter
 * — "Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, and
 * Tiefling" — which is a DIFFERENT page from the one parsed here. That is what
 * makes it an oracle rather than an echo: a parse that found eight species, or
 * ten, disagrees with a second place in the same document.
 */
const SPECIES_NAMES = [
  'Dragonborn',
  'Dwarf',
  'Elf',
  'Gnome',
  'Goliath',
  'Halfling',
  'Human',
  'Orc',
  'Tiefling',
];

/**
 * THE FOUR BACKGROUNDS. SRD 5.2.1 licenses four; the 2024 Player's Handbook
 * prints sixteen. Transcribed from the document's own table of contents, which
 * is again a different page from the one parsed.
 */
const BACKGROUND_NAMES = ['Acolyte', 'Criminal', 'Sage', 'Soldier'];

/**
 * WHICH PRINTED TRAITS CARRY A MECHANICAL EFFECT — a human's reading of the
 * source, declared here and CHECKED against the parse.
 *
 * This is deliberately NOT a regular expression over the trait prose. Deciding
 * that "You have Resistance to Poison damage" is a resistance and "you gain a
 * number of Temporary Hit Points" is not a Hit Point maximum is a judgement
 * about the rules, and a pattern that made it would silently re-make it for
 * every trait added later. `WEAPON_MASTERY_GRANTS` in `weapons-srd.ts` is the
 * same shape for the same reason.
 *
 * The parser CHECKS the judgement rather than trusting it: a key here naming a
 * species or a trait the parse did not produce throws, so a change to the
 * extract that renames or drops a trait fails the seed instead of quietly
 * dropping its mechanics.
 *
 * SEVEN ENTRIES ACROSS THIRTY-THREE TRAITS. The other twenty-six are free text
 * and are meant to stay that way — see `speciesTraitEffectKinds` for the rule
 * that decides, and for why the Orc's Temporary Hit Points, every Darkvision
 * range, the Goliath's Large Form and the Elf's Trance are not here.
 */
type EffectDeclaration = Omit<SrdSpeciesTrait, 'name' | 'description'>;

const NO_EFFECT: EffectDeclaration = {
  effect_kind: null,
  effect_damage_type: null,
  effect_hit_points_flat: null,
  effect_hit_points_per_level: null,
  effect_speed_bonus_feet: null,
};

const TRAIT_EFFECTS: Readonly<
  Record<string, Readonly<Record<string, EffectDeclaration>>>
> = {
  Dragonborn: {
    // "You have Resistance to the damage type determined by your Draconic
    // Ancestry trait." The resistance is unconditional; the TYPE is one of ten
    // the character chooses, so the column stays null.
    'Damage Resistance': {
      ...NO_EFFECT,
      effect_kind: 'damage_resistance',
    },
  },
  Dwarf: {
    // "You have Resistance to Poison damage." Named in the trait's own
    // paragraph, so the type is known.
    'Dwarven Resilience': {
      ...NO_EFFECT,
      effect_kind: 'damage_resistance',
      effect_damage_type: 'Poison',
    },
    // "Your Hit Point maximum increases by 1, and it increases by 1 again
    // whenever you gain a level."
    //
    // THE FLAT HALF IS ZERO, AND THE FIRST DRAFT GOT THIS WRONG. The opening
    // "increases by 1" IS the level-1 grant, and "again whenever you gain a
    // level" covers levels 2..N — so the total is the character's level: 1 at
    // level 1, 20 at level 20. Writing flat=1 alongside perLevel=1 counts
    // level 1 twice and hands a level-1 Dwarf +2 from a trait whose printed
    // text says +1. D12 states the intended shape in the owner's own words:
    // "HP modification (Dwarven Toughness, +1 per level)".
    //
    // The split survives the correction rather than collapsing into one
    // column, because it is the CONTRACT the class-sheet track consumes and a
    // user's own trait may legitimately carry a flat part this one does not.
    'Dwarven Toughness': {
      ...NO_EFFECT,
      effect_kind: 'hp_modifier',
      effect_hit_points_flat: 0,
      effect_hit_points_per_level: 1,
    },
  },
  Elf: {
    // "You gain the level 1 benefit of that lineage... When you reach character
    // levels 3 and 5, you learn a higher-level spell." A MARKER: the spells
    // themselves are grant rules on `species_definitions`, never a payload here.
    'Elven Lineage': { ...NO_EFFECT, effect_kind: 'granted_spells' },
  },
  Gnome: {
    'Gnomish Lineage': { ...NO_EFFECT, effect_kind: 'granted_spells' },
  },
  Tiefling: {
    // THIS TRAIT HAS TWO EFFECTS AND THE COLUMN HOLDS ONE. Its paragraph grants
    // "the level 1 benefit of the chosen legacy", and every legacy's level-1
    // benefit is a Resistance AND a cantrip; the level 3/5 spells follow. So a
    // Tiefling's damage resistance is recorded NOWHERE, while the Dragonborn's
    // — identically unnamed in its own paragraph — is. `granted_spells` is kept
    // rather than swapped because swapping only moves which half is invisible.
    // The reasoning, and why this is an owner-level call rather than a patch,
    // is stated once in `speciesTraitEffectKinds`.
    'Fiendish Legacy': { ...NO_EFFECT, effect_kind: 'granted_spells' },
    // "You know the Thaumaturgy cantrip."
    'Otherworldly Presence': { ...NO_EFFECT, effect_kind: 'granted_spells' },
  },
};

/* ==========================================================================
 * LAYOUT
 * ========================================================================== */

/** The running footer every printed page carries. */
const PAGE_FOOTER = /^\s*\d+\s+System Reference Document 5\.2\.1\s*$/;

/**
 * A line of reconstructed reading order.
 *
 * `indent` is relative to the column the line came from, which is what makes a
 * trait lead detectable: leads sit two spaces past their column's base and
 * wrapped continuations sit on it.
 */
interface StreamLine {
  readonly text: string;
  readonly indent: number;
  /** The caption of the table band this line belongs to, or `null` for prose. */
  readonly table: string | null;
}

/**
 * ZERO WIDTH SPACE, twice in this document — one of them inside the Drow row of
 * the Elven Lineages table, between the level-1 text and the Level 3 column,
 * where it defeats a whitespace split. Stripped everywhere; it carries no
 * meaning a reader can see.
 */
function normalize(text: string): string {
  return text.replaceAll('\u200b', '');
}

function bodyOf(extract: string, label: string): string[] {
  const start = extract.indexOf('\f');
  if (start < 0) {
    throw new OriginExtractError(
      `${label} has no form feed, so its header cannot be separated from the printed pages.`,
    );
  }
  return normalize(extract.slice(start)).split('\n');
}

function splitPages(lines: readonly string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (PAGE_FOOTER.test(line)) {
      pages.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.some((line) => line.trim() !== '')) {
    throw new OriginExtractError(
      'Extract has content after the last page footer.',
    );
  }
  return pages;
}

/** True when a two-column split at `column` would cut no character of `line`. */
function splitSafe(line: string, column: number): boolean {
  for (const index of [column - 1, column, column + 1]) {
    if (index < line.length && line[index] !== ' ') {
      return false;
    }
  }
  return true;
}

/**
 * The column no remaining line crosses.
 *
 * Searched only in the middle third, because the widest run of untouched
 * columns on any page is the RIGHT MARGIN — every line is "split-safe" past the
 * longest one — and a split there produces one column and one empty one.
 */
function findGutter(lines: readonly string[], label: string): number {
  const nonBlank = lines.filter((line) => line.trim() !== '');
  const width = Math.max(...nonBlank.map((line) => line.length));
  const low = Math.floor(width * 0.35);
  const high = Math.floor(width * 0.65);
  const candidates: number[] = [];
  for (let column = low; column <= high; column += 1) {
    if (nonBlank.every((line) => splitSafe(line, column))) {
      candidates.push(column);
    }
  }
  if (candidates.length === 0) {
    throw new OriginExtractError(
      `${label} has no column no line crosses; a full-width band was not lifted.`,
    );
  }
  return candidates[Math.floor(candidates.length / 2)] as number;
}

/** Strips the common leading indentation, reporting what each line kept. */
function dedent(lines: readonly string[], table: string | null): StreamLine[] {
  const nonBlank = lines.filter((line) => line.trim() !== '');
  if (nonBlank.length === 0) {
    return [];
  }
  const base = Math.min(
    ...nonBlank.map((line) => line.length - line.trimStart().length),
  );
  const result: StreamLine[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }
    const indent = line.length - line.trimStart().length - base;
    result.push({ text: line.trim(), indent, table });
  }
  return result;
}

/**
 * The maximal run of non-blank lines containing `index` — a printed table's own
 * extent, since `-layout` leaves a blank line above and below one.
 */
function contiguousBand(
  page: readonly string[],
  index: number,
): [number, number] {
  let first = index;
  while (first > 0 && (page[first - 1] as string).trim() !== '') {
    first -= 1;
  }
  let last = index;
  while (last + 1 < page.length && (page[last + 1] as string).trim() !== '') {
    last += 1;
  }
  return [first, last];
}

/**
 * One printed page, reconstructed into reading order.
 *
 * Full-width bands are lifted first and emitted where they appear; what remains
 * is split at the gutter and emitted left column then right column.
 */
function readPage(page: readonly string[], label: string): StreamLine[] {
  const bands: { first: number; last: number; caption: string }[] = [];
  for (const [index, line] of page.entries()) {
    if (FULL_WIDTH_TABLE_CAPTIONS.includes(line.trim())) {
      const [first, last] = contiguousBand(page, index);
      bands.push({ first, last, caption: line.trim() });
    }
  }
  bands.sort((left, right) => left.first - right.first);

  const stream: StreamLine[] = [];
  let cursor = 0;
  const emitColumns = (first: number, last: number, part: string): void => {
    const slice = page.slice(first, last);
    if (!slice.some((line) => line.trim() !== '')) {
      return;
    }
    const gutter = findGutter(slice, `${label} ${part}`);
    stream.push(
      ...dedent(
        slice.map((line) => line.slice(0, gutter)),
        null,
      ),
      ...dedent(
        slice.map((line) => line.slice(gutter)),
        null,
      ),
    );
  };
  for (const band of bands) {
    emitColumns(cursor, band.first, `lines ${cursor}-${band.first}`);
    stream.push(
      ...dedent(page.slice(band.first, band.last + 1), band.caption),
    );
    cursor = band.last + 1;
  }
  emitColumns(cursor, page.length, `lines ${cursor}-${page.length}`);
  return stream;
}

/* ==========================================================================
 * TEXT
 * ========================================================================== */

/**
 * Joins wrapped lines into one paragraph, healing the hyphenation `-layout`
 * preserves.
 *
 * MEASURED, NOT DEFENSIVE: this document breaks `physi-/ology`, `sav-/ing`,
 * `Trem-/orsense`, `Presti-/digitation`, `Intelli-/gence`, `re-/gain` and
 * `spell-/casting` across lines. Without this a sheet renders `Trem- orsense`.
 * The em dash gets the same treatment and KEEPS its character: `special traits—`
 * continues directly into `unique characteristics`.
 *
 * The rule fires only when the next line starts LOWERCASE, so a genuine
 * compound broken before a capital (`non-/Humanoid`) keeps its hyphen and its
 * break.
 */
function joinWrapped(lines: readonly string[]): string {
  let joined = '';
  for (const line of lines) {
    if (joined === '') {
      joined = line;
      continue;
    }
    const startsLower = /^[a-z]/.test(line);
    if (joined.endsWith('-') && startsLower) {
      joined = `${joined.slice(0, -1)}${line}`;
    } else if (joined.endsWith('\u2014') && startsLower) {
      joined = `${joined}${line}`;
    } else {
      joined = `${joined} ${line}`;
    }
  }
  return joined;
}

/**
 * A trait lead: an indented line opening with a Title Case name and a period.
 *
 * BOTH HALVES ARE LOAD-BEARING AND BOTH WERE MEASURED. Without the indent test
 * the Gnome's `Forest Gnome.` and `Rock Gnome.` sub-options become traits and
 * the wrapped `Poison damage. You also have...` becomes one too — 37 traits
 * against the printed 33. Without the Title Case test, ordinary sentences that
 * happen to start a paragraph qualify.
 *
 * `≤ 4 words` is the source's own longest (`Halfling Nimbleness` is two,
 * `Otherworldly Presence` two); the bound is what stops a whole sentence
 * matching when its first period falls early.
 */
const TRAIT_LEAD = /^(?<name>[A-Z][A-Za-z'\u2019 ]{1,40})\.\s/;

function traitLead(line: StreamLine): string | null {
  if (line.indent <= 0 || line.table !== null) {
    return null;
  }
  const match = TRAIT_LEAD.exec(line.text);
  const name = match?.groups?.name;
  if (name === undefined) {
    return null;
  }
  const words = name.split(' ');
  if (words.length > 4) {
    return null;
  }
  if (!words.every((word) => /^[A-Z][A-Za-z'\u2019]*$/.test(word))) {
    return null;
  }
  return name;
}

/* ==========================================================================
 * SPECIES
 * ========================================================================== */

const CREATURE_TYPE_LINE = /^Creature Type:\s*(?<value>.+)$/;
const SIZE_LINE = /^Size:\s*(?<value>.+)$/;
const SPEED_LINE = /^Speed:\s*(?<feet>\d+)\s*feet\s*$/;
const SENTINEL_LINE =
  /^As an? (?<name>[A-Z][A-Za-z]+), you have (?:these|the following) special traits\.$/;
/** `Medium (about 5-7 feet tall)`, once per printed size option. */
const SIZE_OPTION = /([A-Z][a-z]+) \(about/g;

export function parseSrdSpeciesTemplates(): SrdSpeciesTemplate[] {
  const pages = splitPages(bodyOf(speciesExtract, 'species-descriptions.txt'));
  if (pages.length !== 3) {
    throw new OriginExtractError(
      `Species extract must be three printed pages; found ${pages.length}.`,
    );
  }
  const stream = pages.flatMap((page, index) =>
    readPage(page, `species page ${index + 1}`),
  );
  assertCaptionsPresent(stream);

  const starts: number[] = [];
  for (const [index, line] of stream.entries()) {
    if (CREATURE_TYPE_LINE.test(line.text) && line.table === null) {
      if (index === 0) {
        throw new OriginExtractError(
          'A Creature Type line has no species name before it.',
        );
      }
      starts.push(index - 1);
    }
  }
  if (starts.length !== SPECIES_NAMES.length) {
    throw new OriginExtractError(
      `Species extract must describe ${SPECIES_NAMES.length} species; found ${starts.length}.`,
    );
  }

  const templates = starts.map((start, position) => {
    const end = starts[position + 1] ?? stream.length;
    return parseSpecies(stream.slice(start, end));
  });
  const parsedNames = templates.map((template) => template.name);
  if (parsedNames.join('|') !== SPECIES_NAMES.join('|')) {
    throw new OriginExtractError(
      `Species extract must name ${SPECIES_NAMES.join(', ')}; found ${parsedNames.join(', ')}.`,
    );
  }
  assertEveryDeclaredEffectWasFound(templates);
  return templates;
}

function assertCaptionsPresent(stream: readonly StreamLine[]): void {
  for (const caption of ALL_TABLE_CAPTIONS) {
    const occurrences = stream.filter(
      (line) => line.text === caption,
    ).length;
    if (occurrences !== 1) {
      throw new OriginExtractError(
        `Table caption ${caption} must appear exactly once as a whole line; found ${occurrences}.`,
      );
    }
  }
}

function parseSpecies(section: readonly StreamLine[]): SrdSpeciesTemplate {
  const name = (section[0] as StreamLine).text;
  const sentinel = section.findIndex((line) =>
    SENTINEL_LINE.test(line.text),
  );
  if (sentinel < 0) {
    throw new OriginExtractError(
      `${name} has no "As a ${name}, you have these special traits." line.`,
    );
  }
  const declared = SENTINEL_LINE.exec(
    (section[sentinel] as StreamLine).text,
  )?.groups?.name;
  if (declared !== name) {
    throw new OriginExtractError(
      `${name}'s special-traits line names ${String(declared)} instead.`,
    );
  }

  // The header block: `Creature Type:`, `Size:` and `Speed:`, any of which may
  // wrap onto the next line — Human's and Tiefling's sizes both do.
  const header = new Map<string, string[]>();
  let key: string | null = null;
  for (const line of section.slice(1, sentinel)) {
    const match = /^(?<key>Creature Type|Size|Speed):\s*(?<value>.*)$/.exec(
      line.text,
    );
    if (match?.groups !== undefined) {
      key = match.groups.key as string;
      header.set(key, [match.groups.value as string]);
    } else if (key !== null) {
      header.get(key)?.push(line.text);
    }
  }
  const creatureType = joinWrapped(header.get('Creature Type') ?? []);
  const sizeText = joinWrapped(header.get('Size') ?? []);
  const speedText = joinWrapped(header.get('Speed') ?? []);
  if (creatureType === '' || sizeText === '' || speedText === '') {
    throw new OriginExtractError(
      `${name} is missing its Creature Type, Size or Speed line.`,
    );
  }
  const speed = SPEED_LINE.exec(`Speed: ${speedText}`)?.groups?.feet;
  if (speed === undefined) {
    throw new OriginExtractError(
      `${name} has an unreadable Speed line: ${speedText}`,
    );
  }
  const sizes = [...sizeText.matchAll(SIZE_OPTION)].map(
    (match) => match[1] as string,
  );
  if (sizes.length < 1 || sizes.length > 2) {
    throw new OriginExtractError(
      `${name} must print one or two sizes; found ${sizes.length} in: ${sizeText}`,
    );
  }
  if (!CREATURE_TYPE_LINE.test(`Creature Type: ${creatureType}`)) {
    throw new OriginExtractError(`${name} has an unreadable Creature Type.`);
  }
  if (!SIZE_LINE.test(`Size: ${sizeText}`)) {
    throw new OriginExtractError(`${name} has an unreadable Size line.`);
  }

  return {
    content_key: `${BUNDLED_ORIGIN_RULES_EDITION}:species:${slug(name)}`,
    name,
    creature_type: creatureType,
    size: sizes[0] as string,
    alternate_size: sizes[1] ?? null,
    base_speed_feet: Number(speed),
    traits: parseTraits(name, section.slice(sentinel + 1)),
  };
}

function parseTraits(
  species: string,
  lines: readonly StreamLine[],
): SrdSpeciesTrait[] {
  interface Draft {
    name: string;
    prose: string[];
  }
  interface Band {
    caption: string;
    lines: string[];
  }
  const drafts: Draft[] = [];
  const bands: Band[] = [];
  let current: Draft | null = null;
  let inColumnTable: Band | null = null;

  for (const line of lines) {
    const lead = traitLead(line);
    if (lead !== null) {
      inColumnTable = null;
      current = { name: lead, prose: [] };
      drafts.push(current);
      current.prose.push(line.text.slice(lead.length + 1).trim());
      continue;
    }
    if (current === null) {
      // Prose between the sentinel and the first trait lead. The source prints
      // none; a line here means the lead detector missed one.
      throw new OriginExtractError(
        `${species} has text before its first trait: ${line.text}`,
      );
    }
    if (IN_COLUMN_TABLE_CAPTIONS.includes(line.text)) {
      inColumnTable = { caption: line.text, lines: [line.text] };
      bands.push(inColumnTable);
      continue;
    }
    if (line.table !== null) {
      const band = bands.find((entry) => entry.caption === line.table);
      if (band === undefined) {
        bands.push({ caption: line.table, lines: [line.text] });
      } else {
        band.lines.push(line.text);
      }
      continue;
    }
    if (inColumnTable !== null) {
      inColumnTable.lines.push(line.text);
      continue;
    }
    current.prose.push(line.text);
  }

  const prose = new Map(
    drafts.map((draft) => [draft.name, joinWrapped(draft.prose)]),
  );
  const attached = new Map<string, string[]>();
  /*
   * A TABLE BELONGS TO THE TRAIT WHOSE PROSE NAMES IT, NOT TO THE TRAIT IT
   * HAPPENS TO SIT UNDER, AND THAT DISTINCTION IS NOT THEORETICAL.
   *
   * The Fiendish Legacies table is printed at the FOOT of page 86, after the
   * Tiefling's last trait. Attaching by position put it on `Otherworldly
   * Presence`, whose text is about Thaumaturgy and says nothing about legacies.
   * The source states the link itself — "Choose a legacy from the Fiendish
   * Legacies table" — so that is what is followed. Exactly one trait may claim
   * a band; none, or two, means the reconstruction went wrong.
   */
  for (const band of bands) {
    const owners = [...prose.entries()].filter(([, text]) =>
      text.includes(`${band.caption} table`),
    );
    if (owners.length !== 1) {
      throw new OriginExtractError(
        `${species}: the ${band.caption} table is referenced by ${owners.length} traits; exactly one must name it.`,
      );
    }
    const owner = (owners[0] as [string, string])[0];
    const existing = attached.get(owner) ?? [];
    existing.push(band.lines.join('\n'));
    attached.set(owner, existing);
  }

  return drafts.map((draft) => {
    const description = [
      prose.get(draft.name) ?? '',
      ...(attached.get(draft.name) ?? []),
    ].join('\n\n');
    const effect = TRAIT_EFFECTS[species]?.[draft.name] ?? NO_EFFECT;
    return { name: draft.name, description, ...effect };
  });
}

function assertEveryDeclaredEffectWasFound(
  templates: readonly SrdSpeciesTemplate[],
): void {
  const parsed = new Map(
    templates.map((template) => [
      template.name,
      new Set(template.traits.map((trait) => trait.name)),
    ]),
  );
  for (const [species, traits] of Object.entries(TRAIT_EFFECTS)) {
    const names = parsed.get(species);
    if (names === undefined) {
      throw new OriginExtractError(
        `Declared effects name species ${species}, which the extract does not describe.`,
      );
    }
    for (const trait of Object.keys(traits)) {
      if (!names.has(trait)) {
        throw new OriginExtractError(
          `Declared effect names ${species} trait ${trait}, which the extract does not print.`,
        );
      }
    }
  }
}

/* ==========================================================================
 * BACKGROUNDS
 * ========================================================================== */

const BACKGROUND_KEYS = [
  'Ability Scores',
  'Feat',
  'Skill Proficiencies',
  'Tool Proficiency',
  'Equipment',
] as const;

const BACKGROUND_KEY_LINE = new RegExp(
  `^(?<key>${BACKGROUND_KEYS.join('|')}):\\s*(?<value>.*)$`,
);
/** `(see “Feats”)` and `(see “Equipment”)` — cross-references, not content. */
const CROSS_REFERENCE = /\s*\(see \u201c[^\u201d]+\u201d\)/g;
const EQUIPMENT_CHOICE =
  /^Choose A or B:\s*\(A\)\s*(?<a>.+?);\s*or\s*\(B\)\s*(?<b>.+)$/;

export function parseSrdBackgroundTemplates(): SrdBackgroundTemplate[] {
  const pages = splitPages(bodyOf(backgroundsExtract, 'backgrounds.txt'));
  if (pages.length !== 1) {
    throw new OriginExtractError(
      `Background extract must be one printed page; found ${pages.length}.`,
    );
  }
  const stream = readPage(pages[0] as string[], 'backgrounds page 1');

  const starts: number[] = [];
  for (const [index, line] of stream.entries()) {
    if (line.text.startsWith('Ability Scores:')) {
      if (index === 0) {
        throw new OriginExtractError(
          'An Ability Scores line has no background name before it.',
        );
      }
      starts.push(index - 1);
    }
  }
  if (starts.length !== BACKGROUND_NAMES.length) {
    throw new OriginExtractError(
      `Background extract must describe ${BACKGROUND_NAMES.length} backgrounds; found ${starts.length}.`,
    );
  }
  // Sectioned by the NEXT background's name index, exactly as the species are.
  // Without it the Soldier's `Sage` heading — which sits one space further
  // right than its own key lines and so reads as an indented continuation —
  // was absorbed into the Criminal's equipment, and the Sage's key lines then
  // OVERWROTE the Criminal's five values one by one. The result was a row
  // called Criminal carrying the Sage's abilities, feat, skills, tool and
  // equipment, with nothing anywhere reporting a problem.
  const templates = starts.map((start, position) =>
    parseBackground(stream.slice(start, starts[position + 1] ?? stream.length)),
  );
  const parsedNames = [...templates].map((template) => template.name).sort();
  if (parsedNames.join('|') !== BACKGROUND_NAMES.join('|')) {
    throw new OriginExtractError(
      `Background extract must name ${BACKGROUND_NAMES.join(', ')}; found ${parsedNames.join(', ')}.`,
    );
  }
  return templates;
}

function parseBackground(
  section: readonly StreamLine[],
): SrdBackgroundTemplate {
  const name = (section[0] as StreamLine).text;
  const values = new Map<string, string[]>();
  let key: string | null = null;
  // Reading also STOPS at the first line that is neither a key nor an indented
  // continuation. The section boundary handles the three backgrounds that have
  // one; this handles the LAST, whose section runs to the end of the page and
  // would otherwise swallow the `Character Species` chapter heading and its
  // opening prose into the Soldier's equipment list.
  for (const line of section.slice(1)) {
    const match = BACKGROUND_KEY_LINE.exec(line.text);
    if (match?.groups !== undefined && line.indent === 0) {
      key = match.groups.key as string;
      values.set(key, [match.groups.value as string]);
      continue;
    }
    if (key !== null && line.indent > 0) {
      values.get(key)?.push(line.text);
      continue;
    }
    break;
  }
  for (const required of BACKGROUND_KEYS) {
    if (!values.has(required)) {
      throw new OriginExtractError(`${name} is missing its ${required} line.`);
    }
  }
  const value = (part: string): string =>
    joinWrapped(values.get(part) ?? []).replaceAll(CROSS_REFERENCE, '');

  const abilities = value('Ability Scores')
    .split(',')
    .map((entry) => entry.trim());
  if (abilities.length !== 3) {
    throw new OriginExtractError(
      `${name} must list three ability scores; found ${abilities.length}.`,
    );
  }
  const skills = value('Skill Proficiencies').split(' and ');
  if (skills.length !== 2) {
    throw new OriginExtractError(
      `${name} must list two skill proficiencies; found ${skills.length}.`,
    );
  }
  const equipment = EQUIPMENT_CHOICE.exec(value('Equipment'))?.groups;
  if (equipment === undefined) {
    throw new OriginExtractError(
      `${name} has an unreadable Equipment line: ${value('Equipment')}`,
    );
  }

  return {
    content_key: `${BUNDLED_ORIGIN_RULES_EDITION}:background:${slug(name)}`,
    name,
    ability_score_1: abilities[0] as string,
    ability_score_2: abilities[1] as string,
    ability_score_3: abilities[2] as string,
    feat_name: value('Feat'),
    skill_proficiency_1: (skills[0] as string).trim(),
    skill_proficiency_2: (skills[1] as string).trim(),
    tool_proficiency: value('Tool Proficiency'),
    equipment_option_a: (equipment.a as string).trim(),
    equipment_option_b: (equipment.b as string).trim(),
  };
}

function slug(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
}

/* ==========================================================================
 * SEEDING
 * ========================================================================== */

function assertRow(
  table:
    | 'species_templates'
    | 'species_template_traits'
    | 'background_templates',
  row: Record<string, unknown>,
): void {
  const error = rowContractError(table, row, `Bundled ${table} row`);
  if (error !== null) {
    throw new OriginExtractError(error);
  }
}

export function bundledSpeciesTemplates(): SrdSpeciesTemplate[] {
  return parseSrdSpeciesTemplates();
}

export function bundledBackgroundTemplates(): SrdBackgroundTemplate[] {
  return parseSrdBackgroundTemplates();
}

/**
 * True when every parsed template AND every one of its traits is present.
 *
 * Counted rather than merely existence-checked, on the same terms as
 * `hasBundledWeaponContent`: a database holding the nine species keys with no
 * trait rows is broken, and a key-only guard would call it healthy and never
 * repair it.
 */
export function hasBundledOriginContent(db: DatabaseContext): boolean {
  const species = bundledSpeciesTemplates();
  const backgrounds = bundledBackgroundTemplates();
  const count = (sql: string, keys: readonly string[]): number =>
    Number(db.scalar<number>(sql, [...keys]) ?? 0);
  const speciesPlaceholders = species.map(() => '?').join(', ');
  if (
    count(
      `SELECT count(*) FROM species_templates WHERE content_key IN (${speciesPlaceholders})`,
      species.map((entry) => entry.content_key),
    ) !== species.length
  ) {
    return false;
  }
  const backgroundPlaceholders = backgrounds.map(() => '?').join(', ');
  if (
    count(
      `SELECT count(*) FROM background_templates WHERE content_key IN (${backgroundPlaceholders})`,
      backgrounds.map((entry) => entry.content_key),
    ) !== backgrounds.length
  ) {
    return false;
  }
  // PER SPECIES, AND EXACT — not a global `>=`, which was the first shape and
  // could not see a shrinking extract. A global count with `>=` is satisfied by
  // STALE rows: delete a trait from the extract and the nine species still hold
  // more rows than the new parse expects, so the guard reports health and the
  // catalog is never repaired. Counting per species and demanding equality
  // makes both directions detectable, and re-seeding is safe because
  // `seedSpecies` DELETEs a species' traits before reinserting them.
  //
  // `hasBundledWeaponContent` still carries the loose form. That is its own
  // change, in a file this track does not own.
  for (const entry of species) {
    if (
      count(
        `SELECT count(*)
           FROM species_template_traits AS traits
           JOIN species_templates AS templates
             ON templates.id = traits.species_template_id
          WHERE templates.content_key = ?`,
        [entry.content_key],
      ) !== entry.traits.length
    ) {
      return false;
    }
  }
  return true;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledOriginContent(db: DatabaseContext): boolean {
  if (hasBundledOriginContent(db)) {
    return false;
  }
  seedOriginContent(db);
  return true;
}

export function seedOriginContent(db: DatabaseContext): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    seedSpecies(db, timestamp);
    seedBackgrounds(db, timestamp);
  });
}

function seedSpecies(db: DatabaseContext, timestamp: string): void {
  for (const template of bundledSpeciesTemplates()) {
    const row = {
      content_key: template.content_key,
      rules_edition: BUNDLED_ORIGIN_RULES_EDITION,
      name: template.name,
      creature_type: template.creature_type,
      size: template.size,
      alternate_size: template.alternate_size,
      base_speed_feet: template.base_speed_feet,
      created_at: timestamp,
      updated_at: timestamp,
    };
    // The parser is the writer, so its output is checked against the row
    // contract before it becomes a catalog row. A mis-parse fails the seed
    // instead of producing nine plausible-looking wrong entries.
    assertRow('species_templates', { id: 1, ...row });
    const templateId = Number(
      db.exec(
        `INSERT INTO species_templates (
           content_key, rules_edition, name, creature_type, size,
           alternate_size, base_speed_feet, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(content_key) DO UPDATE SET
           rules_edition = excluded.rules_edition,
           name = excluded.name,
           creature_type = excluded.creature_type,
           size = excluded.size,
           alternate_size = excluded.alternate_size,
           base_speed_feet = excluded.base_speed_feet,
           updated_at = excluded.updated_at
         RETURNING id`,
        [
          row.content_key,
          row.rules_edition,
          row.name,
          row.creature_type,
          row.size,
          row.alternate_size,
          row.base_speed_feet,
          row.created_at,
          row.updated_at,
        ],
      ).lastInsertId,
    );
    const resolvedId = Number(
      db.scalar<number>(
        'SELECT id FROM species_templates WHERE content_key = ?',
        [row.content_key],
      ) ?? templateId,
    );
    // Traits are REPLACED rather than merged. Their identity is the printed
    // order, and a re-seed after an extract change that inserted a trait would
    // otherwise leave the old one behind under a stale `sort_order`.
    db.exec('DELETE FROM species_template_traits WHERE species_template_id = ?', [
      resolvedId,
    ]);
    for (const [index, trait] of template.traits.entries()) {
      const traitRow = {
        species_template_id: resolvedId,
        sort_order: index + 1,
        name: trait.name,
        description: trait.description,
        effect_kind: trait.effect_kind,
        effect_damage_type: trait.effect_damage_type,
        effect_hit_points_flat: trait.effect_hit_points_flat,
        effect_hit_points_per_level: trait.effect_hit_points_per_level,
        effect_speed_bonus_feet: trait.effect_speed_bonus_feet,
        created_at: timestamp,
        updated_at: timestamp,
      };
      assertRow('species_template_traits', { id: 1, ...traitRow });
      db.exec(
        `INSERT INTO species_template_traits (
           species_template_id, sort_order, name, description, effect_kind,
           effect_damage_type, effect_hit_points_flat,
           effect_hit_points_per_level, effect_speed_bonus_feet,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          traitRow.species_template_id,
          traitRow.sort_order,
          traitRow.name,
          traitRow.description,
          traitRow.effect_kind,
          traitRow.effect_damage_type,
          traitRow.effect_hit_points_flat,
          traitRow.effect_hit_points_per_level,
          traitRow.effect_speed_bonus_feet,
          traitRow.created_at,
          traitRow.updated_at,
        ],
      );
    }
  }
}

function seedBackgrounds(db: DatabaseContext, timestamp: string): void {
  for (const template of bundledBackgroundTemplates()) {
    const row = {
      content_key: template.content_key,
      rules_edition: BUNDLED_ORIGIN_RULES_EDITION,
      name: template.name,
      ability_score_1: template.ability_score_1,
      ability_score_2: template.ability_score_2,
      ability_score_3: template.ability_score_3,
      feat_name: template.feat_name,
      skill_proficiency_1: template.skill_proficiency_1,
      skill_proficiency_2: template.skill_proficiency_2,
      tool_proficiency: template.tool_proficiency,
      equipment_option_a: template.equipment_option_a,
      equipment_option_b: template.equipment_option_b,
      created_at: timestamp,
      updated_at: timestamp,
    };
    assertRow('background_templates', { id: 1, ...row });
    db.exec(
      `INSERT INTO background_templates (
         content_key, rules_edition, name, ability_score_1, ability_score_2,
         ability_score_3, feat_name, skill_proficiency_1, skill_proficiency_2,
         tool_proficiency, equipment_option_a, equipment_option_b,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_key) DO UPDATE SET
         rules_edition = excluded.rules_edition,
         name = excluded.name,
         ability_score_1 = excluded.ability_score_1,
         ability_score_2 = excluded.ability_score_2,
         ability_score_3 = excluded.ability_score_3,
         feat_name = excluded.feat_name,
         skill_proficiency_1 = excluded.skill_proficiency_1,
         skill_proficiency_2 = excluded.skill_proficiency_2,
         tool_proficiency = excluded.tool_proficiency,
         equipment_option_a = excluded.equipment_option_a,
         equipment_option_b = excluded.equipment_option_b,
         updated_at = excluded.updated_at`,
      [
        row.content_key,
        row.rules_edition,
        row.name,
        row.ability_score_1,
        row.ability_score_2,
        row.ability_score_3,
        row.feat_name,
        row.skill_proficiency_1,
        row.skill_proficiency_2,
        row.tool_proficiency,
        row.equipment_option_a,
        row.equipment_option_b,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

