/**
 * Wiki species page -> a standalone scraped species document.
 *
 * Same two design rules as `parse-spell.ts`, `parse-feat.ts` and
 * `parse-subclass.ts`, restated here because this parser earns them
 * independently rather than inheriting them by import.
 *
 * STRICT AND LOUD. Every page that does not yield every required field is a
 * hard failure carrying the reason, never a defaulted record. Species pages
 * are hand-edited, so some will not match; a parser that guesses at a
 * malformed page emits a plausible, wrong rule, which is strictly worse than
 * emitting nothing.
 *
 * CROSS-CHECK, DO NOT TRUST ONE SIGNAL. The page's own title and its
 * `<h3>{Name} Traits</h3>` heading both carry the species name independently.
 * When they disagree the record FAILS rather than picking a winner, exactly
 * as `parse-spell.ts` refuses a school/tag disagreement.
 *
 * NOTHING SCRAPED IS COMMITTED. The tests for this module run against
 * synthetic markup written by hand for the purpose, never a saved page.
 *
 * ---
 *
 * THE PAGE SHAPE, CONFIRMED ON THREE LIVE SAMPLES (`species:elf`,
 * `species:human`, `species:dragonborn`, fetched through `PoliteFetcher`
 * 2026-08-13, never saved anywhere this repository tracks):
 *
 * One or more `Source:` paragraphs (see below), some flavour prose, then a
 * `<h3>{Name} Traits</h3>` heading. Immediately after it: one `<p>` in the
 * exact `<strong>Creature Type:</strong> …<br /><strong>Size:</strong>
 * …<br /><strong>Speed:</strong> …` shape `parse-spell.ts` already reads for
 * a spell's "Casting Time:" block, then one filler sentence — "As a[n]
 * {Name}, you have these special traits." on all three samples — then the
 * traits themselves, each `<strong>{Name}.</strong> {text}` exactly like a
 * feat's benefit paragraph (`parse-feat.ts`'s `readParagraph`).
 *
 * TWO SIGNALS ARE DELIBERATELY KEPT VERBATIM RATHER THAN COERCED TO A CLOSED
 * ENUM. `size` stays the printed sentence, not `src/domain/enums.ts`'s
 * `CreatureSize`: `species:human`'s live sample prints "Medium (about 4-7
 * feet tall) or Small (about 2-4 feet tall), chosen when you select this
 * species" — a PLAYER CHOICE between two sizes, which `CreatureSize` has no
 * way to represent without this module inventing a choice structure nobody
 * asked for. `speed`, by contrast, IS parsed to a number: every sample prints
 * it as a bare "{n} feet" with no choice or qualifier, a closed shape as safe
 * to promote as `parse-feat.ts`'s two Ability Score Increase sentences — and
 * a page whose Speed line does not match that exact shape FAILS rather than
 * being coerced, on the same "closed shape or refuse" logic.
 *
 * LINEAGES: `species:elf` is the one live sample with any — three `<h5>`
 * sections (Drow, High Elves, Wood Elves) before the Traits heading — but it
 * ALSO prints a FOURTH pre-Traits section, `<h3>Lorwyn-Shadowmoor</h3>`, with
 * its own nested `Source:` line and two `<h4>` subsections (`In Lorwyn` / `In
 * Shadowmoor`). That section is not one of the "choose a lineage" options the
 * other three are — it reads as a whole alternate-setting variant — so
 * folding its content into "Wood Elves" (the lineage immediately before it)
 * would misattribute prose to the wrong lineage, which this module treats as
 * exactly the kind of confident fabrication `parse-feat.ts`'s file comment
 * warns against. Rather than guess a nesting rule from one ambiguous sample,
 * `readLineages` below treats EVERY heading before the Traits heading —
 * `<h3>`, `<h4>` or `<h5>` alike — as the start of its own lineage-shaped
 * section. That reads `species:elf` as five sections rather than three
 * "real" lineages plus a two-part aside, which is a less tidy shape than the
 * intuitive one, but it never claims a peer relationship between sections
 * this module cannot verify from three samples.
 *
 * A DIFFERENT FOLD RULE APPLIES ONCE THE TRAITS BEGIN, ON BETTER EVIDENCE: a
 * `<h5>` heading plus `<table>` for a trait's own reference table is
 * confirmed on BOTH casters — "Elven Lineages" after Elf's "Elven Lineage"
 * trait, "Draconic Ancestors" after Dragonborn's "Draconic Ancestry" trait —
 * always immediately following the trait paragraph it belongs to and never a
 * new trait itself (it carries no `<strong>Name.</strong>` lead-in). Two
 * independent confirmations is why `readTraits` folds that shape into the
 * most recently read trait, unlike the single ambiguous lineage sample above.
 *
 * ---
 *
 * THE IMPORT-SIDE GAP, NAMED RATHER THAN PAPERED OVER.
 *
 * `src/authoring/contracts.ts`'s `SpeciesContentAggregate` (the shape
 * `src/catalog/catalog-schema.ts`'s `'species'` record kind actually carries)
 * demands `creature_type: CreatureType`, `primary_size: CreatureSize` /
 * `alternate_size: CreatureSize | null`, `walking_speed_feet: number`, and —
 * the hard part — every trait's `effects: readonly AuthoringCharacterEffect[]`
 * plus a top-level `grants: readonly AuthoringGrant[]`. Those are the same
 * bounded, compile-checked rules-engine vocabularies `parse-feat.ts`'s file
 * comment describes for `GrantRule` and `parse-subclass.ts`'s describes for
 * `ClassFeatureEffect` — mechanical facts inferred FROM printed trait text,
 * not facts the page states in a fixed vocabulary. Inferring one out of
 * arbitrary wikidot prose is the same plausible-and-wrong fabrication those
 * two modules refuse, for the same reason: a wrong effect or grant can hand a
 * character a resistance, a skill, or a spell it never earned. So this module
 * keeps `size` as printed prose (see above, for an independent reason too),
 * keeps every trait's `descriptionParagraphs` as verbatim prose, and mints no
 * `effects` or `grants` at all. Bridging this gap is future work for whoever
 * wires a species import path to the scraper.
 */
import type { RulesEdition } from '../../src/domain/enums';
import {
  homebrewSpellKey,
  normalizeCatalogKeyComponent,
} from '../../src/catalog/catalog-key';
import { SCRAPED_OWNER_NAMESPACE } from './provenance';
import { blocksOf, extractElementById, lines, toText } from './html';

export interface SpeciesLineage {
  readonly name: string;
  /** Verbatim printed prose. Never structured — see the file-level comment. */
  readonly descriptionParagraphs: readonly string[];
}

export interface SpeciesTrait {
  readonly name: string;
  /** Verbatim printed prose. Never structured — see the file-level comment. */
  readonly descriptionParagraphs: readonly string[];
}

export interface ParsedSpeciesDocument {
  readonly identityKey: string;
  readonly versionKey: string;
  readonly name: string;
  readonly edition: RulesEdition;
  /** In printed order. Empty for a species that prints no lineage choice. */
  readonly lineages: readonly SpeciesLineage[];
  /** In printed order. */
  readonly traits: readonly SpeciesTrait[];
  /** The printed sentence, verbatim. See the file-level comment for why. */
  readonly size: string;
  /** Feet. Only the closed "{n} feet" printed shape is accepted. */
  readonly speed: number;
  readonly sourceBooks: string[];
  /** The pages print no page number; null is the honest value, as elsewhere. */
  readonly sourcePage: number | null;
  readonly sourceSlug: string | null;
}

export interface ParsedSpecies {
  readonly document: ParsedSpeciesDocument;
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedSpecies }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ParseResult {
  return { ok: false, reason };
}

type Block = { readonly tag: string; readonly html: string };
const HEADING_TAGS = new Set(['h3', 'h4', 'h5']);

/**
 * One `<strong>Label.</strong> rest of the sentence…` paragraph, exactly the
 * shape `parse-feat.ts`'s `readParagraph` reads. Duplicated rather than
 * imported — see that module's own note on `homebrewSpellKey` for why this
 * project repeats small parsing rules per-module instead of sharing them.
 */
function readLabelledParagraph(html: string): { label: string | null; text: string } {
  const match = /^\s*<strong>([\s\S]*?)<\/strong>\s*([\s\S]*)$/u.exec(html);
  if (match !== null) {
    const label = toText(match[1] as string);
    const text = toText(match[2] as string);
    if (label !== '' && text !== '') {
      return { label, text };
    }
  }
  return { label: null, text: toText(html) };
}

/**
 * Sections before the Traits heading. See the file-level comment: every
 * heading in that zone — `<h3>`, `<h4>` or `<h5>` alike — starts its own
 * section rather than being folded into a sibling, since this module has no
 * verified rule for when two headings are "the same lineage" and refuses to
 * invent one.
 */
function readLineages(
  blocks: readonly Block[],
  sourceBlocks: ReadonlySet<Block>,
): SpeciesLineage[] {
  const lineages: { name: string; descriptionParagraphs: string[] }[] = [];
  for (const block of blocks) {
    if (sourceBlocks.has(block)) {
      continue;
    }
    if (HEADING_TAGS.has(block.tag)) {
      lineages.push({ name: toText(block.html), descriptionParagraphs: [] });
      continue;
    }
    const current = lineages[lineages.length - 1];
    if (current === undefined) {
      // Flavour text before the first heading. Not required by this
      // module's document shape; dropped rather than guessed into a lineage
      // that does not exist yet.
      continue;
    }
    const text = toText(block.html);
    if (text !== '') {
      current.descriptionParagraphs.push(text);
    }
  }
  return lineages;
}

/**
 * Traits, from just after the intro filler sentence to the end of the
 * content region. A block that is NOT a `<strong>Name.</strong>` paragraph —
 * a heading or a table, per the "Elven Lineages" / "Draconic Ancestors"
 * evidence in the file-level comment — is folded into the most recently read
 * trait as one more verbatim paragraph.
 */
function readTraits(blocks: readonly Block[]): SpeciesTrait[] | string {
  const traits: { name: string; descriptionParagraphs: string[] }[] = [];
  for (const block of blocks) {
    if (block.tag === 'p') {
      const { label, text } = readLabelledParagraph(block.html);
      if (label !== null) {
        traits.push({
          name: label.endsWith('.') ? label.slice(0, -1) : label,
          descriptionParagraphs: text === '' ? [] : [text],
        });
        continue;
      }
      const current = traits[traits.length - 1];
      if (current === undefined) {
        return `trait prose appears before any "<strong>Name.</strong>" trait paragraph: "${text}"`;
      }
      if (text !== '') {
        current.descriptionParagraphs.push(text);
      }
      continue;
    }
    // A heading or a table, folded into the current trait.
    const current = traits[traits.length - 1];
    if (current === undefined) {
      return `a "${block.tag}" appears before any trait was read`;
    }
    const text = toText(block.html);
    if (text !== '') {
      current.descriptionParagraphs.push(text);
    }
  }
  return traits;
}

const DEFINITION_LABELS = ['Creature Type', 'Size', 'Speed'] as const;
type DefinitionLabel = (typeof DEFINITION_LABELS)[number];

/** `<strong>Creature Type:</strong> …<br />…`, the same idiom `parse-spell.ts` reads. */
function readDefinitionBlock(
  html: string,
): Partial<Record<DefinitionLabel, string>> | null {
  if (!/<strong>\s*Creature Type\s*:/iu.test(html)) {
    return null;
  }
  const found: Partial<Record<DefinitionLabel, string>> = {};
  for (const line of lines(html)) {
    for (const label of DEFINITION_LABELS) {
      const prefix = `${label}:`;
      if (line.toLowerCase().startsWith(prefix.toLowerCase())) {
        found[label] = line.slice(prefix.length).trim();
      }
    }
  }
  return found;
}

const SPEED_FEET = /^(\d+)\s*feet$/iu;
const FILLER_SENTENCE = /^As an? .+, you have these special traits\.$/u;

export interface ParseSpeciesOptions {
  readonly edition: RulesEdition;
  /** Page name, used only for error messages and as `sourceSlug`. */
  readonly slug: string;
}

export function parseSpeciesPage(
  html: string,
  options: ParseSpeciesOptions,
): ParseResult {
  const content = extractElementById(html, 'div', 'page-content');
  if (content === null) {
    return fail('no <div id="page-content"> — page shell not recognised');
  }

  const blocks = blocksOf(content, ['p', 'h3', 'h4', 'h5', 'table']);
  if (blocks.length === 0) {
    return fail('page content has no paragraphs or headings');
  }

  const sourceBlocks = blocks.filter(
    (block) => block.tag === 'p' && /^\s*Source\s*:/iu.test(toText(block.html)),
  );
  if (sourceBlocks.length === 0) {
    return fail('no "Source:" line');
  }
  const sourceBooks: string[] = [];
  for (const block of sourceBlocks) {
    const book = toText(block.html).replace(/^\s*Source\s*:\s*/iu, '');
    if (book === '') {
      return fail('a "Source:" line names no book');
    }
    if (!sourceBooks.includes(book)) {
      sourceBooks.push(book);
    }
  }
  const sourceBlockSet = new Set(sourceBlocks);

  const name = readName(html);
  if (name === null) {
    return fail('no page title');
  }

  const traitsHeadingIndex = blocks.findIndex(
    (block) => block.tag === 'h3' && / Traits$/u.test(toText(block.html)),
  );
  if (traitsHeadingIndex === -1) {
    return fail('no "{Name} Traits" heading found');
  }
  const traitsHeadingText = toText(blocks[traitsHeadingIndex]!.html);
  const headingName = traitsHeadingText.slice(
    0,
    traitsHeadingText.length - ' Traits'.length,
  );
  if (headingName !== name) {
    return fail(
      `page title says "${name}" but the traits heading says "${headingName}"`,
    );
  }

  const lineages = readLineages(
    blocks.slice(0, traitsHeadingIndex),
    sourceBlockSet,
  );

  const definitionBlock = blocks[traitsHeadingIndex + 1];
  const definition =
    definitionBlock === undefined || definitionBlock.tag !== 'p'
      ? null
      : readDefinitionBlock(definitionBlock.html);
  if (definition === null) {
    return fail(
      'no "Creature Type: … Size: … Speed: …" block immediately after the traits heading',
    );
  }
  const missing = (['Size', 'Speed'] as const).filter(
    (label) => definition[label] === undefined,
  );
  if (missing.length > 0) {
    return fail(`traits definition block is missing ${missing.join(', ')}`);
  }
  const sizeText = definition.Size as string;
  const speedText = definition.Speed as string;
  const speedMatch = SPEED_FEET.exec(speedText);
  if (speedMatch === null) {
    return fail(
      `Speed is not a plain "{n} feet" value this module will parse to a ` +
        `number: "${speedText}"`,
    );
  }
  const speed = Number(speedMatch[1]);

  const fillerBlock = blocks[traitsHeadingIndex + 2];
  if (
    fillerBlock === undefined ||
    fillerBlock.tag !== 'p' ||
    !FILLER_SENTENCE.test(toText(fillerBlock.html))
  ) {
    return fail(
      'no "As a {Name}, you have these special traits." line after the ' +
        'Creature Type / Size / Speed block',
    );
  }

  const traits = readTraits(blocks.slice(traitsHeadingIndex + 3));
  if (typeof traits === 'string') {
    return fail(traits);
  }
  if (traits.length === 0) {
    return fail('no "<strong>Name.</strong>" trait paragraphs found');
  }

  const document: ParsedSpeciesDocument = {
    // NAMESPACED, NOT OFFICIAL — same reasoning as `parse-feat.ts` and
    // `parse-spell.ts`; see either for the full argument.
    identityKey: `scraped-${normalizeCatalogKeyComponent(name)}`,
    versionKey: homebrewSpellKey(
      options.edition,
      SCRAPED_OWNER_NAMESPACE,
      name,
      new Set([SCRAPED_OWNER_NAMESPACE]),
    ),
    name,
    edition: options.edition,
    lineages,
    traits: traits.map((trait) => ({
      name: trait.name,
      descriptionParagraphs: trait.descriptionParagraphs,
    })),
    size: sizeText,
    speed,
    sourceBooks,
    sourcePage: null,
    sourceSlug: options.slug,
  };

  return { ok: true, value: { document } };
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
  const text = toText(heading[1] as string).split(' - ')[0]?.trim() ?? '';
  return text === '' ? null : text;
}
