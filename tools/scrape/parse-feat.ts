/**
 * Wiki feat page -> a standalone scraped feat document.
 *
 * Same two design rules as `parse-spell.ts`, restated here because this parser
 * earns them independently rather than inheriting them by import.
 *
 * STRICT AND LOUD. Every page that does not yield every required field is a hard
 * failure carrying the reason, never a defaulted record. Feat pages are
 * hand-edited (some carry non-final "DND Beyond Drops" text, verified live —
 * see below), so some will not match; a parser that guesses at a malformed page
 * emits a plausible, wrong rule, which is strictly worse than emitting nothing.
 *
 * CROSS-CHECK, DO NOT TRUST ONE SIGNAL. The descriptor line and the page's own
 * tag list can both carry the feat's category (Origin/General/Fighting
 * Style/Epic Boon). When both are present and they disagree the record FAILS
 * rather than picking a winner, exactly as the spell parser refuses a
 * school/tag disagreement.
 *
 * NOTHING SCRAPED IS COMMITTED. The tests for this module run against synthetic
 * markup written by hand for the purpose, never a saved page.
 *
 * ---
 *
 * THE IMPORT-SIDE GAP, NAMED RATHER THAN PAPERED OVER.
 *
 * `src/catalog/catalog-schema.ts` already has a `'feat'` record kind
 * (`CatalogFeatRecord`), but it is NOT the shape this module produces and this
 * module does not attempt to satisfy it. `parseSourceCatalogRecord('feat', …)`
 * (in `src/catalog/source-catalog-records.ts`) demands a `FeatContentAggregateV1`
 * whose `prerequisites` are a STRUCTURED array (`{kind:'feature', feature:…}` |
 * `{kind:'ability_score', abilities:[…], minimum}`) and whose `grants` are the
 * rules-engine grant DSL (`GrantRule` — spell choices, skill proficiencies, and
 * so on). Both are mechanical facts inferred FROM the printed benefit text, not
 * facts the page states in a fixed vocabulary the way "Casting Time:" is for a
 * spell.
 *
 * `src/rules/feats-srd.ts` already does that inference — but against a single,
 * hand-curated, closed SRD text extract (`docs/srd/source/feats.txt`) that this
 * project controls end to end. Wikidot pages are not that: this module's own
 * three-page live sample (2026-08-13, `feat:chef`, `feat:tactical-combatant`,
 * `feat:shifting-combatant`) already turned up a "DND Beyond Drops" source page
 * whose descriptor line omits the category name entirely (see
 * `readPageCategory` below) — exactly the kind of hand-edited irregularity
 * `parse-spell.ts`'s file-level comment warns about. Inferring a `GrantRule` out
 * of arbitrary wikidot prose is the SAME plausible-and-wrong fabrication
 * `parse-spell.ts` refuses when it leaves `attackModes`/`saveAbilities` empty
 * rather than regexing them out of a spell's body text — except a wrong grant
 * can mint a spell slot or a proficiency a character never earned, which is a
 * strictly worse failure mode than a wrong search facet.
 *
 * So this module mints its OWN document shape (below), the one named in the
 * scraper task: prose stays prose (`prerequisite` is the verbatim printed
 * clause, never structured; the benefit paragraphs are Tier 2 text, never a
 * grant), and the one piece of real mechanical structure that IS safe to read —
 * the "Ability Score Increase." paragraph, which has exactly two printed shapes
 * in the whole ruleset — is promoted to `abilityIncreaseOptions`. Bridging this
 * to `FeatContentAggregateV1` is future work for whoever wires a feat import
 * path to the scraper, and it needs its own STRICT AND LOUD prerequisite/grant
 * reader in the shape of `parsePrintedPrerequisites`/`grantRules` in
 * `src/rules/feats-srd.ts` — not a cast from this module's output.
 */
import {
  abilities,
  type Ability,
  type KnownFeatGrouping,
  type RulesEdition,
} from '../../src/domain/enums';
import {
  homebrewSpellKey,
  normalizeCatalogKeyComponent,
} from '../../src/catalog/catalog-key';
import { SCRAPED_OWNER_NAMESPACE } from './provenance';
import {
  emphasisedTexts,
  extractByClass,
  extractElementById,
  paragraphs,
  toSeparatedText,
  toText,
} from './html';

export interface AbilityIncreaseOptions {
  /** 1 or 2. The printed benefit always names exactly one of the two. */
  readonly points: 1 | 2;
  /** `'any'` when the page lets the reader pick freely; else the named set. */
  readonly abilities: 'any' | readonly Ability[];
  /** The printed cap, e.g. 20 (or 30 for the feats that raise it). */
  readonly maximum: number;
}

/** One printed benefit paragraph. `label` is the bold lead-in, if any. */
export interface FeatParagraph {
  readonly label: string | null;
  readonly text: string;
}

export interface ParsedFeatDocument {
  readonly identityKey: string;
  readonly versionKey: string;
  readonly name: string;
  readonly edition: RulesEdition;
  readonly category: KnownFeatGrouping;
  /** The printed prerequisite clause, verbatim, or null when the page names none. */
  readonly prerequisite: string | null;
  readonly repeatable: boolean;
  readonly abilityIncreaseOptions: AbilityIncreaseOptions | null;
  readonly sourceBooks: string[];
  /** The pages print no page number; null is the honest value, as in `parse-spell.ts`. */
  readonly sourcePage: number | null;
  readonly sourceSlug: string | null;
}

export interface ParsedFeat {
  readonly document: ParsedFeatDocument;
  /** Tier 2 body text: the benefit paragraphs, structured. Never Tier 1. */
  readonly description: readonly FeatParagraph[];
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedFeat }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ParseResult {
  return { ok: false, reason };
}

/**
 * The four source-shaped categories, as the descriptor line prints them, mapped
 * to the app's own `KnownFeatGrouping` vocabulary (`src/domain/enums.ts`). The
 * scraper task's shorthand spelled these `fighting-style`/`epic`; the app's own
 * enum spells them `fighting_style`/`epic_boon`, and this module follows the
 * app's enum on the reasoning that a document meant to align with the catalog
 * schema should speak the catalog schema's vocabulary, not a paraphrase of it.
 */
const CATEGORY_BY_PRINTED_NAME: ReadonlyMap<string, KnownFeatGrouping> =
  new Map([
    ['Origin', 'origin'],
    ['General', 'general'],
    ['Fighting Style', 'fighting_style'],
    ['Epic Boon', 'epic_boon'],
  ]);

/**
 * The page-tags equivalent, guessed from ONE confirmed live sample
 * (`generalfeat` on both `feat:chef` and `feat:tactical-combatant`,
 * 2026-08-13) and extended to the other three categories by the same
 * squash-no-separator pattern. The other three spellings are UNVERIFIED — see
 * the module's file-level comment and the scraper report for this lane. Getting
 * one wrong does not mis-categorise a feat: `readPageCategory` below only ever
 * uses a page-tag match to CONFIRM or be silent, and a wrong guess just means
 * this cross-check goes silent (matching the "no tags present" case), never
 * that it picks the wrong category outright.
 */
const GROUPING_BY_CATEGORY_TAG: ReadonlyMap<string, KnownFeatGrouping> =
  new Map([
    ['originfeat', 'origin'],
    ['generalfeat', 'general'],
    ['fightingstylefeat', 'fighting_style'],
    ['epicboonfeat', 'epic_boon'],
  ]);

const ABILITY_BY_PRINTED_NAME: ReadonlyMap<string, Ability> = new Map(
  abilities.map((ability) => [
    `${ability.slice(0, 1).toUpperCase()}${ability.slice(1)}`,
    ability,
  ]),
);

/** The page's own normalised tag list, lowercased. Same technique as `parse-spell.ts`. */
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

interface Descriptor {
  readonly category: KnownFeatGrouping | null;
  readonly prerequisite: string | null;
}

const WITH_CATEGORY =
  /^(Origin|General|Fighting Style|Epic Boon) Feat(?:\s*\(Prerequisite:\s*([^)]+)\))?$/u;
const PREREQUISITE_ONLY = /^Prerequisite:\s*(.+)$/u;

/**
 * The descriptor line, in the three shapes a live sample turned up:
 * `General Feat (Prerequisite: Level 4+, Weapon Mastery Feature)`,
 * `Fighting Style Feat` with no parenthetical at all, and — confirmed on
 * `feat:chef`, a Player's Handbook page, not a "Drops" one — `Prerequisite:
 * Level 4+` with NO category name printed at all. That last shape is why
 * `category` here is nullable and why `readPageCategory` below treats the page
 * tags as more than decoration.
 */
function readDescriptor(text: string): Descriptor | string {
  const withCategory = WITH_CATEGORY.exec(text);
  if (withCategory !== null) {
    const category = CATEGORY_BY_PRINTED_NAME.get(withCategory[1] as string);
    if (category === undefined) {
      return `descriptor names an unrecognised category: "${text}"`;
    }
    const prerequisite = withCategory[2];
    return {
      category,
      prerequisite: prerequisite === undefined ? null : prerequisite.trim(),
    };
  }
  const prerequisiteOnly = PREREQUISITE_ONLY.exec(text);
  if (prerequisiteOnly !== null) {
    return {
      category: null,
      prerequisite: (prerequisiteOnly[1] as string).trim(),
    };
  }
  return (
    `descriptor matches neither "<Category> Feat (Prerequisite: …)" nor ` +
    `"Prerequisite: …": "${text}"`
  );
}

/**
 * `readPageCategory`'s result. NOT `KnownFeatGrouping | string`: every member
 * of `KnownFeatGrouping` IS a string, so `typeof result === 'string'` can
 * never tell a resolved category apart from a failure reason — this shape
 * exists because that exact bug shipped first and every one of this test
 * file's fixtures failed with the resolved category itself as the "reason".
 */
type CategoryResult =
  | { readonly ok: true; readonly category: KnownFeatGrouping }
  | { readonly ok: false; readonly reason: string };

/**
 * Resolves the feat's category from the descriptor and the page tags, and
 * FAILS on a genuine disagreement rather than picking a winner — see the
 * module's file-level "CROSS-CHECK" note. Absence on one side is not a
 * disagreement: `feat:chef` has no category in its descriptor at all, so the
 * tag is the only signal, and a page with no recognised category tag (a real
 * possibility given `GROUPING_BY_CATEGORY_TAG` is only one-quarter confirmed)
 * simply leaves the descriptor's answer unconfirmed rather than unusable.
 */
function readPageCategory(
  descriptorCategory: KnownFeatGrouping | null,
  pageTags: ReadonlySet<string>,
): CategoryResult {
  const tagCategories = new Set<KnownFeatGrouping>();
  for (const tag of pageTags) {
    const category = GROUPING_BY_CATEGORY_TAG.get(tag);
    if (category !== undefined) {
      tagCategories.add(category);
    }
  }
  if (tagCategories.size > 1) {
    return {
      ok: false,
      reason: `page tags carry more than one feat-category tag: ${[...tagCategories].sort().join(', ')}`,
    };
  }
  const tagCategory = tagCategories.size === 1 ? [...tagCategories][0]! : null;

  if (
    descriptorCategory !== null &&
    tagCategory !== null &&
    descriptorCategory !== tagCategory
  ) {
    return {
      ok: false,
      reason:
        `descriptor says category "${descriptorCategory}" but the page tags say ` +
        `"${tagCategory}"`,
    };
  }
  const resolved = descriptorCategory ?? tagCategory;
  if (resolved === null) {
    return {
      ok: false,
      reason:
        'no feat category in the descriptor and none of the four known category tags on the page',
    };
  }
  return { ok: true, category: resolved };
}

/**
 * One printed benefit paragraph: `<strong>Label.</strong> rest of the
 * sentence…` becomes `{label: "Label.", text: "rest of the sentence…"}`. A
 * paragraph with no leading `<strong>`, or one where the bold run is the whole
 * paragraph, is returned unlabelled — treating a label-only paragraph as prose
 * is safer than inventing an empty benefit for it.
 */
function readParagraph(html: string): FeatParagraph {
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

// The 2-point sentence caps its OWN maximum with different wording from the
// 1-point sentence — "an ability score above 20", never "to a maximum of
// 20" — confirmed against `src/rules/feats-srd.ts`'s own regex for the same
// printed SRD text (`docs/srd/source/feats.txt`), which this module's own
// synthetic-fixture tests caught diverging from before any test ran: an
// earlier draft searched for "maximum of" in the 2-point sentence, which is
// never printed there.
const TWO_POINT_ASI =
  /^Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1\./u;
const TWO_POINT_MAXIMUM = /an ability score above (\d+)/u;
const ONE_POINT_ASI =
  /^Increase (one ability score of your choice|your [^.]+ score) by 1, to a maximum of (\d+)\./u;

/**
 * Reads the "Ability Score Increase." paragraph, if one is printed, into the
 * two closed shapes the whole ruleset ever uses. This is the one piece of
 * benefit-text structure this module promotes out of prose — see the
 * file-level comment for why nothing else is. Deliberately written against
 * STRAIGHT apostrophes: the wikidot pages print `can't` with `U+0027`
 * (verified against the live `feat:tactical-combatant` sample), unlike
 * `src/rules/feats-srd.ts`'s SRD text extract, which uses the curly `U+2019`.
 * Neither regex here needs to cross that word at all, which is the more
 * robust fix — it does not depend on either source agreeing on the glyph.
 */
function readAbilityIncreaseOptions(
  benefitParagraphs: readonly FeatParagraph[],
): AbilityIncreaseOptions | string | null {
  const asi = benefitParagraphs.find((paragraph) => paragraph.label === 'Ability Score Increase.');
  if (asi === undefined) {
    return null;
  }
  const { text } = asi;

  if (TWO_POINT_ASI.test(text)) {
    const maximum = TWO_POINT_MAXIMUM.exec(text)?.[1];
    if (maximum === undefined) {
      return `"Ability Score Increase." reads as the 2-point form but names no printed maximum: "${text}"`;
    }
    return { points: 2, abilities: 'any', maximum: Number(maximum) };
  }

  const onePoint = ONE_POINT_ASI.exec(text);
  if (onePoint === null) {
    return `"Ability Score Increase." text matches neither known shape: "${text}"`;
  }
  const choice = onePoint[1] as string;
  const maximum = Number(onePoint[2] as string);
  if (choice === 'one ability score of your choice') {
    return { points: 1, abilities: 'any', maximum };
  }
  const printed = choice.replace(/^your /u, '').replace(/ score$/u, '');
  const names = printed
    .replace(/, or /gu, ', ')
    .replace(/ or /gu, ', ')
    .split(',')
    .map((name) => name.trim());
  const resolved: Ability[] = [];
  for (const name of names) {
    const ability = ABILITY_BY_PRINTED_NAME.get(name);
    if (ability === undefined) {
      return `"Ability Score Increase." names an unrecognised ability "${name}" in "${text}"`;
    }
    resolved.push(ability);
  }
  if (resolved.length === 0) {
    return `"Ability Score Increase." names no ability in "${text}"`;
  }
  return { points: 1, abilities: resolved, maximum };
}

export interface ParseFeatOptions {
  readonly edition: RulesEdition;
  /** Page name, used only for error messages and as `sourceSlug`. */
  readonly slug: string;
}

export function parseFeatPage(
  html: string,
  options: ParseFeatOptions,
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
  const emphasised = emphasisedTexts(descriptorParagraph);
  const descriptor = readDescriptor(emphasised[0] as string);
  if (typeof descriptor === 'string') {
    return fail(descriptor);
  }

  const pageTags = readPageTags(html);
  const categoryResult = readPageCategory(descriptor.category, pageTags);
  if (!categoryResult.ok) {
    return fail(categoryResult.reason);
  }
  const category = categoryResult.category;

  const bodyBlocks = blocks.filter(
    (block) => block !== sourceParagraph && block !== descriptorParagraph,
  );
  const description = bodyBlocks
    .map(readParagraph)
    .filter((paragraph) => paragraph.text !== '');
  if (description.length === 0) {
    return fail('no body text after the descriptor');
  }

  const abilityIncreaseOptions = readAbilityIncreaseOptions(description);
  if (typeof abilityIncreaseOptions === 'string') {
    return fail(abilityIncreaseOptions);
  }

  const repeatable = description.some(
    (paragraph) => paragraph.label === 'Repeatable.',
  );

  const name = readName(html);
  if (name === null) {
    return fail('no page title');
  }

  const document: ParsedFeatDocument = {
    // NAMESPACED, NOT OFFICIAL, for the identical reason `parse-spell.ts` mints
    // `scraped-<slug>` / the three-part version key: an imported scraped row
    // must not be indistinguishable from bundled content. `homebrewSpellKey` is
    // a generic edition/owner/name key-grammar function despite its name — it
    // has no spell-specific behaviour — and is reused here rather than
    // duplicated, the same way `parse-spell.ts` reuses it.
    identityKey: `scraped-${normalizeCatalogKeyComponent(name)}`,
    versionKey: homebrewSpellKey(
      options.edition,
      SCRAPED_OWNER_NAMESPACE,
      name,
      new Set([SCRAPED_OWNER_NAMESPACE]),
    ),
    name,
    edition: options.edition,
    category,
    prerequisite: descriptor.prerequisite,
    repeatable,
    abilityIncreaseOptions,
    sourceBooks: [sourceBook],
    sourcePage: null,
    sourceSlug: options.slug,
  };

  return { ok: true, value: { document, description } };
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
