/**
 * Wiki spell page -> a record in the app's EXISTING catalog format.
 *
 * Two design rules govern everything here.
 *
 * STRICT AND LOUD. Every page that does not yield every required field is a hard
 * failure carrying the reason, never a defaulted record. The pages are
 * hand-edited, so some will not match; a parser that guesses at a malformed page
 * emits plausible, wrong rules, which is strictly worse than emitting nothing.
 * The caller collects failures into a report and the build step refuses to write
 * a partial catalog unless told to.
 *
 * CROSS-CHECK, DO NOT TRUST ONE SIGNAL. The descriptor line and the page's own
 * tag list encode the school and the spell lists independently. When they
 * disagree the record FAILS rather than picking a winner — a disagreement means
 * one of the two readings is wrong and there is no way to tell which from here.
 * That is a free correctness oracle and it costs one comparison.
 *
 * NOTHING SCRAPED IS COMMITTED. The tests for this module run against synthetic
 * markup written by hand for the purpose, never a saved page: a saved page IS
 * the non-free content this whole exercise is arranged to keep out of the
 * repository.
 */
import type { CatalogRecord } from '../../src/catalog/catalog-schema';
import {
  homebrewSpellKey,
  normalizeCatalogKeyComponent,
} from '../../src/catalog/catalog-key';
import { SCRAPED_OWNER_NAMESPACE } from './provenance';
import {
  isEnumValue,
  spellSchools,
  type KnownSpellSchool,
  type RulesEdition,
} from '../../src/domain/enums';
import {
  emphasisedTexts,
  extractByClass,
  extractElementById,
  lines,
  paragraphs,
  toSeparatedText,
  toText,
} from './html';

/** The eight schools. A closed set is what makes the descriptor parse strict. */
export const SCHOOLS = spellSchools;

export interface ParsedSpell {
  readonly record: CatalogRecord;
  /** Tier 2 body text, kept separate; it never travels with the Tier 1 file. */
  readonly description: string;
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedSpell }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ParseResult {
  return { ok: false, reason };
}

const LABELS = ['Casting Time', 'Range', 'Components', 'Duration'] as const;
type Label = (typeof LABELS)[number];

/** `<strong>Casting Time:</strong> Action<br />…` -> a label -> value map. */
function readDefinitionBlock(
  html: string,
): Partial<Record<Label, string>> | null {
  if (!/<strong>\s*Casting Time\s*:/iu.test(html)) {
    return null;
  }
  const found: Partial<Record<Label, string>> = {};
  for (const line of lines(html)) {
    for (const label of LABELS) {
      const prefix = `${label}:`;
      if (line.toLowerCase().startsWith(prefix.toLowerCase())) {
        found[label] = line.slice(prefix.length).trim();
      }
    }
  }
  return found;
}

interface Descriptor {
  readonly level: number;
  readonly school: KnownSpellSchool;
  readonly spellLists: string[];
}

/**
 * The descriptor line, in its two shapes: `Level 3 Evocation (Sorcerer, Wizard)`
 * for a levelled spell and `Divination Cantrip (Cleric, Druid)` for a cantrip.
 * Anything else is a parse failure.
 */
function readDescriptor(text: string): Descriptor | string {
  const withLists = /^(.*?)\s*\(([^)]*)\)\s*$/u.exec(text);
  if (withLists === null) {
    return `descriptor line has no "(list, list)" clause: "${text}"`;
  }
  const head = (withLists[1] as string).trim();
  const spellLists = (withLists[2] as string)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  if (spellLists.length === 0) {
    return `descriptor line has an empty spell-list clause: "${text}"`;
  }

  const levelled = /^Level\s+([1-9])\s+([A-Za-z]+)$/u.exec(head);
  if (levelled !== null) {
    const school = levelled[2] as string;
    if (!isEnumValue(SCHOOLS, school)) {
      return `unknown school "${school}" in descriptor "${text}"`;
    }
    return { level: Number(levelled[1]), school, spellLists };
  }

  const cantrip = /^([A-Za-z]+)\s+Cantrip$/u.exec(head);
  if (cantrip !== null) {
    const school = cantrip[1] as string;
    if (!isEnumValue(SCHOOLS, school)) {
      return `unknown school "${school}" in descriptor "${text}"`;
    }
    return { level: 0, school, spellLists };
  }

  return `descriptor line matches neither "Level N School" nor "School Cantrip": "${text}"`;
}

/**
 * The page's own normalised tag list, lowercased.
 *
 * Uses {@link toSeparatedText} rather than {@link toText}: the tags are adjacent
 * `<a>` elements with no whitespace between them, so stripping tags to nothing
 * fuses them into one word. That was measured against the live site — a page
 * tagged `artificer, conjuration, wizard` read back as `artificerconjunction…`
 * and the cross-check reported a disagreement that did not exist.
 */
function readPageTags(html: string): Set<string> {
  const regions = extractByClass(html, 'page-tags');
  const tags = new Set<string>();
  for (const region of regions) {
    for (const raw of toSeparatedText(region).split(/[\s,]+/u)) {
      const tag = raw.trim().toLowerCase();
      if (tag !== '') {
        tags.add(tag);
      }
    }
  }
  return tags;
}

export interface ParseSpellOptions {
  readonly edition: RulesEdition;
  /** Page name, used only for error messages. */
  readonly slug: string;
}

export function parseSpellPage(
  html: string,
  options: ParseSpellOptions,
): ParseResult {
  const content = extractElementById(html, 'div', 'page-content');
  if (content === null) {
    return fail('no <div id="page-content"> — page shell not recognised');
  }
  const blocks = paragraphs(content);
  if (blocks.length === 0) {
    return fail('page content has no paragraphs');
  }

  const sourceParagraph = blocks.find((block) =>
    /^\s*Source\s*:/iu.test(toText(block)),
  );
  if (sourceParagraph === undefined) {
    return fail('no "Source:" line');
  }
  const sourceBook = toText(sourceParagraph).replace(/^\s*Source\s*:\s*/iu, '');
  if (sourceBook === '') {
    return fail('"Source:" line names no book');
  }

  const descriptorParagraph = blocks.find(
    (block) => emphasisedTexts(block).length > 0,
  );
  if (descriptorParagraph === undefined) {
    return fail('no <em> descriptor line');
  }
  // Read from INSIDE the <em>, not from the paragraph's text. Some pages put
  // the descriptor and the whole definition block in one <p> separated by
  // <br />, and taking the paragraph's text then hands the descriptor parser a
  // sentence with "Casting Time: … Range: …" glued to the end of it. Measured
  // against the live site, not anticipated.
  const emphasised = emphasisedTexts(descriptorParagraph);
  const descriptor = readDescriptor(emphasised[0] as string);
  if (typeof descriptor === 'string') {
    return fail(descriptor);
  }

  const definitionParagraph = blocks.find(
    (block) => readDefinitionBlock(block) !== null,
  );
  if (definitionParagraph === undefined) {
    return fail('no "Casting Time:" definition block');
  }
  const definition = readDefinitionBlock(definitionParagraph) ?? {};
  const missing = LABELS.filter((label) => definition[label] === undefined);
  if (missing.length > 0) {
    return fail(`definition block is missing ${missing.join(', ')}`);
  }

  const castingTime = definition['Casting Time'] as string;
  const duration = definition.Duration as string;

  // The tag list is the independent second reading. It is normalised and
  // lowercased by the site itself, so it is compared case-insensitively.
  const pageTags = readPageTags(html);
  if (pageTags.size > 0) {
    const schoolTagged = pageTags.has(descriptor.school.toLowerCase());
    if (!schoolTagged) {
      return fail(
        `descriptor says school "${descriptor.school}" but the page tags ` +
          `(${[...pageTags].sort().join(', ')}) do not carry it`,
      );
    }
    const cantripTagged = pageTags.has('cantrip');
    if (cantripTagged !== (descriptor.level === 0)) {
      return fail(
        `descriptor says level ${descriptor.level} but the page tags ` +
          `${cantripTagged ? 'do' : 'do not'} carry "cantrip"`,
      );
    }
    const untagged = descriptor.spellLists.filter(
      (list) => !pageTags.has(list.toLowerCase()),
    );
    if (untagged.length > 0) {
      return fail(
        `descriptor lists ${untagged.join(', ')} but the page tags ` +
          `(${[...pageTags].sort().join(', ')}) do not carry them`,
      );
    }
  }

  const bodyBlocks = blocks.filter(
    (block) =>
      block !== sourceParagraph &&
      block !== descriptorParagraph &&
      block !== definitionParagraph,
  );
  const description = bodyBlocks
    .map((block) => toText(block))
    .filter((text) => text !== '')
    .join('\n\n');
  if (description === '') {
    return fail('no body text after the definition block');
  }

  const name = readName(html);
  if (name === null) {
    return fail('no page title');
  }

  const record: CatalogRecord = {
    // NAMESPACED, NOT OFFICIAL. `officialSpellKey` would mint the two-part
    // `2024:lanternfall`, which is the grammar this project's own bundled
    // content uses — so an imported scraped row would be indistinguishable from
    // a legitimately-bundled one in the database, in a backup export, and in a
    // share link. See SCRAPED_OWNER_NAMESPACE for why this is the provenance
    // mark that is meant to survive, unlike the deliberately inert `_provenance`
    // stamp. The owner set is supplied inline because the scraper is the only
    // thing that registers this namespace; nothing in `src/` knows about it.
    identityKey: `scraped-${normalizeCatalogKeyComponent(name)}`,
    versionKey: homebrewSpellKey(
      options.edition,
      SCRAPED_OWNER_NAMESPACE,
      name,
      new Set([SCRAPED_OWNER_NAMESPACE]),
    ),
    name,
    edition: options.edition,
    level: descriptor.level,
    school: descriptor.school,
    castingTime,
    range: definition.Range as string,
    components: definition.Components as string,
    duration,
    // Both are read from the printed text, never inferred from the importer's
    // implicit-tag regexes: that regex matches the abbreviation "R", not the
    // word the page prints, so relying on it would silently drop every ritual.
    concentration: /^\s*Concentration\b/iu.test(duration),
    ritual: /\bRitual\b/iu.test(castingTime),
    // Left EMPTY on purpose. Both columns are free-form and display-only, and
    // regexing "makes a Dexterity saving throw" out of prose is exactly the
    // plausible-and-wrong fabrication this parser is arranged to refuse.
    attackModes: [],
    saveAbilities: [],
    effectReliabilityCategory: 'fixed_effect',
    spellLists: descriptor.spellLists,
    sourceBooks: [sourceBook],
    // The pages print no page number. `null` is the honest value; inventing one
    // would put a fabricated citation into a share link.
    sourcePage: null,
    sourceSlug: options.slug,
    tags: [],
    healing: false,
    // BOTH LADDERS LEFT ABSENT, for the same reason `attackModes` and
    // `saveAbilities` above are empty. A page's "Using a Higher-Level Spell
    // Slot" and "Cantrip Upgrade" paragraphs are prose, and reading a list of
    // levels out of either would be the plausible-and-wrong fabrication this
    // parser is arranged to refuse. The hazard is now smaller than it was —
    // the two are separate fields, so a mis-read can no longer be wrong about
    // WHICH question it answered — and it is still a fabrication.
    upcastLevels: [],
    upcastSummary: null,
    cantripUpgradeLevels: [],
    cantripUpgradeSummary: null,
  };

  return { ok: true, value: { record, description } };
}

function readName(html: string): string | null {
  const titled = extractElementById(html, 'div', 'page-title');
  if (titled !== null) {
    const text = toText(titled);
    if (text !== '') {
      return text;
    }
  }
  const heading = /<title>([^<]*)<\/title>/iu.exec(html);
  if (heading === null) {
    return null;
  }
  // Wikidot titles read "Spell Name - Site Name"; keep the leading part.
  const text = toText(heading[1] as string).split(' - ')[0]?.trim() ?? '';
  return text === '' ? null : text;
}
