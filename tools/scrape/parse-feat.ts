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
 * Style/Epic Boon — the four 2024 PHB categories this module's vocabulary is
 * closed OVER, not closed absolutely: see OUT_OF_SCOPE_FEAT_CATEGORIES below
 * for the non-PHB categories the live namespace also carries). When both are
 * present and they disagree the record FAILS rather than picking a winner,
 * exactly as the spell parser refuses a school/tag disagreement.
 *
 * OUT OF SCOPE IS NOT THE SAME AS MALFORMED. A feat page in a category this
 * project does not replicate (Eberron's Dragonmark, the Planar Pact, Dark
 * Gift) is not a parse failure — the page is perfectly well-formed, this
 * project simply has no use for it. `parseFeatPage` reports that as a SKIP
 * (`ok: false, skipped: true`), distinct from a genuine parse failure
 * (`ok: false, skipped: false`), so a caller can let a full namespace crawl
 * complete without `--allow-partial` while a truly malformed page still
 * blocks it. A category that is neither one of the four in-scope names nor
 * one of the three known out-of-scope names still fails loudly — this
 * module knows exactly two closed vocabularies, not "anything is fine."
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
 * `resolveCategorySignal` below) — exactly the kind of hand-edited irregularity
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
 * across every feat IN 2024 PHB SCOPE (see OUT_OF_SCOPE_FEAT_CATEGORIES for the
 * non-PHB feats this module skips rather than reading) — is promoted to
 * `abilityIncreaseOptions`. Bridging this
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
  strictBlocksOf,
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

/**
 * `skipped` distinguishes a genuine parse failure (`skipped: false` — the
 * page is malformed, or reads as something this module cannot honestly
 * classify) from a page that parsed FINE but is out of this project's scope
 * (`skipped: true` — see OUT_OF_SCOPE_FEAT_CATEGORIES). Both are `ok: false`
 * so existing `result.ok === false && result.reason` call sites keep
 * working unmodified; callers that need to let a full crawl complete
 * without `--allow-partial` route on `skipped` instead of collapsing both
 * into one failure list.
 */
export type ParseResult =
  | { readonly ok: true; readonly value: ParsedFeat }
  | { readonly ok: false; readonly skipped: false; readonly reason: string }
  | { readonly ok: false; readonly skipped: true; readonly reason: string };

function fail(reason: string): ParseResult {
  return { ok: false, skipped: false, reason };
}

function skip(reason: string): ParseResult {
  return { ok: false, skipped: true, reason };
}

/**
 * The four IN-SCOPE, source-shaped categories, as the descriptor line prints
 * them, mapped to the app's own `KnownFeatGrouping` vocabulary
 * (`src/domain/enums.ts`). The scraper task's shorthand spelled these
 * `fighting-style`/`epic`; the app's own enum spells them
 * `fighting_style`/`epic_boon`, and this module follows the app's enum on
 * the reasoning that a document meant to align with the catalog schema
 * should speak the catalog schema's vocabulary, not a paraphrase of it.
 *
 * CLOSED WITHIN 2024 PHB SCOPE, not closed absolutely — this project
 * replicates 2024 PHB-based builds, and these four are every category the
 * PHB prints. The live namespace also carries non-PHB setting categories
 * (Dragonmark, Planar Pact, Dark Gift); see
 * `OUT_OF_SCOPE_FEAT_CATEGORIES` below for that second, equally closed
 * vocabulary, and this module's file comment for why a page in one of those
 * categories is a SKIP rather than a parse failure.
 */
const CATEGORY_BY_PRINTED_NAME: ReadonlyMap<string, KnownFeatGrouping> =
  new Map([
    ['Origin', 'origin'],
    ['General', 'general'],
    ['Fighting Style', 'fighting_style'],
    ['Epic Boon', 'epic_boon'],
  ]);

/**
 * NON-PHB setting categories the live `feat:` namespace also carries —
 * Eberron's Dragonmark, the Planar Pact, and Dark Gift — out of scope for
 * this project, which replicates 2024 PHB-based builds only. Recognised on
 * the descriptor line and reported as a SKIP (see `ParseResult`) rather
 * than a parse failure, so a full crawl of the `feat` namespace can
 * complete without `--allow-partial`. This is NOT a catch-all: a category
 * printed on a page that matches neither this set nor
 * `CATEGORY_BY_PRINTED_NAME` still fails loudly, exactly as before.
 */
const OUT_OF_SCOPE_FEAT_CATEGORIES: ReadonlySet<string> = new Set([
  'Dragonmark',
  'Planar Pact',
  'Dark Gift',
]);

/**
 * The page-tags equivalent, guessed from ONE confirmed live sample
 * (`generalfeat` on both `feat:chef` and `feat:tactical-combatant`,
 * 2026-08-13) and extended to the other three categories by the same
 * squash-no-separator pattern. The other three spellings are UNVERIFIED — see
 * the module's file-level comment and the scraper report for this lane. Getting
 * one wrong does not mis-categorise a feat: `resolveCategorySignal` below only
 * ever uses a page-tag match to CONFIRM or be silent, and a wrong guess just
 * means this cross-check goes silent (matching the "no tags present" case),
 * never that it picks the wrong category outright.
 */
const GROUPING_BY_CATEGORY_TAG: ReadonlyMap<string, KnownFeatGrouping> =
  new Map([
    ['originfeat', 'origin'],
    ['generalfeat', 'general'],
    ['fightingstylefeat', 'fighting_style'],
    ['epicboonfeat', 'epic_boon'],
  ]);

/**
 * The OUT-OF-SCOPE equivalent of `GROUPING_BY_CATEGORY_TAG` above, guessed
 * by the identical squash-no-separator pattern and EQUALLY UNVERIFIED — no
 * live sample confirms any of these three. That is fine for the same
 * reason it is fine above: `resolveCategorySignal` below only ever uses a
 * page-tag match to CONFIRM a signal the descriptor already gave, or to
 * DISAGREE with it; a wrong guess here just means the cross-check goes
 * silent on that page (falling back to the descriptor alone), never that a
 * page gets mis-skipped or mis-failed because of a bad tag guess.
 */
const OUT_OF_SCOPE_GROUPING_BY_TAG: ReadonlyMap<string, string> = new Map([
  ['dragonmarkfeat', 'Dragonmark'],
  ['planarpactfeat', 'Planar Pact'],
  ['darkgiftfeat', 'Dark Gift'],
]);

/**
 * A feat's category signal, generalised over BOTH closed vocabularies this
 * module knows — the four 2024-PHB `KnownFeatGrouping`s and the three
 * out-of-scope names — so `resolveCategorySignal` can cross-check a
 * descriptor against page tags EXACTLY ONCE, regardless of which
 * vocabulary either signal turns out to belong to. See R2-3 in this
 * module's own fix history: an earlier version resolved the descriptor's
 * out-of-scope reading FIRST and skipped immediately, before the page-tag
 * cross-check that exists specifically to catch this kind of thing ever
 * ran — so a page whose descriptor said "Dragonmark Feat" but whose tag
 * said `generalfeat` was silently excluded instead of loudly refused for
 * disagreeing with itself.
 */
type CategorySignal =
  | { readonly kind: 'in-scope'; readonly value: KnownFeatGrouping }
  | { readonly kind: 'out-of-scope'; readonly value: string };

function describeSignal(signal: CategorySignal): string {
  return signal.kind === 'in-scope'
    ? signal.value
    : `${signal.value} (out of 2024 PHB scope)`;
}

function signalsEqual(a: CategorySignal, b: CategorySignal): boolean {
  return a.kind === b.kind && a.value === b.value;
}

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
  /** The printed category name, when it matched neither known vocabulary. */
  readonly outOfScopeCategory: string | null;
  readonly prerequisite: string | null;
}

// Captures ANY Title Case category name before " Feat", not just the four
// in-scope ones — unlike an earlier draft's closed alternation, this lets
// `readDescriptor` tell an OUT-OF-SCOPE category (Dragonmark, Planar Pact,
// Dark Gift — see `OUT_OF_SCOPE_FEAT_CATEGORIES`) apart from a genuinely
// UNRECOGNISED one. Both still refuse a bare `CATEGORY_BY_PRINTED_NAME`
// membership test; only the caller's response to each differs.
const WITH_CATEGORY =
  /^([A-Z][A-Za-z' -]*) Feat(?:\s*\(Prerequisite:\s*([^)]+)\))?$/u;
const PREREQUISITE_ONLY = /^Prerequisite:\s*(.+)$/u;

/**
 * The descriptor line, in the three shapes a live sample turned up:
 * `General Feat (Prerequisite: Level 4+, Weapon Mastery Feature)`,
 * `Fighting Style Feat` with no parenthetical at all, and — confirmed on
 * `feat:chef`, a Player's Handbook page, not a "Drops" one — `Prerequisite:
 * Level 4+` with NO category name printed at all. That last shape is why
 * `category` here is nullable and why `resolveCategorySignal` below treats
 * the page tags as more than decoration.
 */
function readDescriptor(text: string): Descriptor | string {
  const withCategory = WITH_CATEGORY.exec(text);
  if (withCategory !== null) {
    const printedCategory = withCategory[1] as string;
    const prerequisite = withCategory[2];
    const prerequisiteValue =
      prerequisite === undefined ? null : prerequisite.trim();
    const category = CATEGORY_BY_PRINTED_NAME.get(printedCategory);
    if (category !== undefined) {
      return {
        category,
        outOfScopeCategory: null,
        prerequisite: prerequisiteValue,
      };
    }
    if (OUT_OF_SCOPE_FEAT_CATEGORIES.has(printedCategory)) {
      return {
        category: null,
        outOfScopeCategory: printedCategory,
        prerequisite: prerequisiteValue,
      };
    }
    return `descriptor names an unrecognised category: "${text}"`;
  }
  const prerequisiteOnly = PREREQUISITE_ONLY.exec(text);
  if (prerequisiteOnly !== null) {
    return {
      category: null,
      outOfScopeCategory: null,
      prerequisite: (prerequisiteOnly[1] as string).trim(),
    };
  }
  return (
    `descriptor matches neither "<Category> Feat (Prerequisite: …)" nor ` +
    `"Prerequisite: …": "${text}"`
  );
}

/**
 * `resolveCategorySignal`'s result. NOT `CategorySignal | string`: a plain
 * string result could not tell a resolved signal apart from a failure
 * reason — the same shape-collision bug `parse-feat.ts`'s earlier
 * `CategoryResult` was written to avoid, generalised to the wider
 * `CategorySignal` union.
 */
type CategoryResolution =
  | { readonly ok: true; readonly signal: CategorySignal }
  | { readonly ok: false; readonly reason: string };

/**
 * Resolves the feat's category SIGNAL — in-scope OR out-of-scope, either
 * one — from the descriptor and the page tags, and FAILS on a genuine
 * disagreement rather than picking a winner — see the module's file-level
 * "CROSS-CHECK" note and `CategorySignal`'s own comment for why this now
 * covers both vocabularies in ONE pass rather than letting an out-of-scope
 * descriptor reading skip the check entirely (R2-3).
 *
 * Absence on one side is still not a disagreement: `feat:chef` has no
 * category in its descriptor at all, so the tag is the only signal, and a
 * page with no recognised category tag (a real possibility given both tag
 * maps are largely unverified guesses) simply leaves the descriptor's
 * answer unconfirmed rather than unusable. Only two PRESENT, DIFFERENT
 * signals — whichever vocabulary either belongs to — are a disagreement.
 */
function resolveCategorySignal(
  descriptor: Descriptor,
  pageTags: ReadonlySet<string>,
): CategoryResolution {
  const descriptorSignal: CategorySignal | null =
    descriptor.category !== null
      ? { kind: 'in-scope', value: descriptor.category }
      : descriptor.outOfScopeCategory !== null
        ? { kind: 'out-of-scope', value: descriptor.outOfScopeCategory }
        : null;

  const tagSignals: CategorySignal[] = [];
  for (const tag of pageTags) {
    const inScope = GROUPING_BY_CATEGORY_TAG.get(tag);
    if (inScope !== undefined) {
      tagSignals.push({ kind: 'in-scope', value: inScope });
      continue;
    }
    const outOfScope = OUT_OF_SCOPE_GROUPING_BY_TAG.get(tag);
    if (outOfScope !== undefined) {
      tagSignals.push({ kind: 'out-of-scope', value: outOfScope });
    }
  }
  const distinctTagSignals: CategorySignal[] = [];
  for (const signal of tagSignals) {
    if (!distinctTagSignals.some((existing) => signalsEqual(existing, signal))) {
      distinctTagSignals.push(signal);
    }
  }
  if (distinctTagSignals.length > 1) {
    return {
      ok: false,
      reason:
        'page tags carry more than one feat-category tag: ' +
        distinctTagSignals.map(describeSignal).sort().join(', '),
    };
  }
  const tagSignal = distinctTagSignals[0] ?? null;

  if (
    descriptorSignal !== null &&
    tagSignal !== null &&
    !signalsEqual(descriptorSignal, tagSignal)
  ) {
    return {
      ok: false,
      reason:
        `descriptor says category "${describeSignal(descriptorSignal)}" but ` +
        `the page tags say "${describeSignal(tagSignal)}"`,
    };
  }
  const resolved = descriptorSignal ?? tagSignal;
  if (resolved === null) {
    return {
      ok: false,
      reason:
        'no feat category in the descriptor and none of the known category ' +
        'tags (in-scope or out-of-scope) on the page',
    };
  }
  return { ok: true, signal: resolved };
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
 * two closed shapes observed across every feat IN 2024 PHB SCOPE — not
 * "the whole ruleset ever uses": a non-PHB feat (Potent Dragonmark) prints a
 * third wording, but a page in that category is skipped before it ever
 * reaches this function — see `OUT_OF_SCOPE_FEAT_CATEGORIES` and the
 * file-level comment. A page whose category IS in scope but whose ASI
 * paragraph matches neither shape below still fails loudly, exactly as
 * before. This is the one piece of benefit-text structure this module
 * promotes out of prose — see the file-level comment for why nothing else
 * is. Deliberately written against
 * STRAIGHT apostrophes: the wikidot pages print `can't` with `U+0027`
 * (verified against the live `feat:tactical-combatant` sample), unlike
 * `src/rules/feats-srd.ts`'s SRD text extract, which uses the curly `U+2019`.
 * Neither regex here needs to cross that word at all, which is the more
 * robust fix — it does not depend on either source agreeing on the glyph.
 */
/**
 * Exported for `feat-grants-bridge.ts`, which reads the SAME "Ability Score
 * Increase." paragraph this parser already promotes into
 * `document.abilityIncreaseOptions` — reusing this function rather than
 * re-deriving the two closed shapes a second time from scratch, per the
 * "do not duplicate what can be imported" rule the bridge module's file
 * comment states. Nothing about this export changes this module's own
 * behaviour or tests.
 */
export function readAbilityIncreaseOptions(
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
  // Headings and tables (and, on some pages, lists) can carry rules text
  // exactly the way a benefit paragraph does — see this module's F1 fix
  // note in the file header. `strictBlocksOf` captures all of them, in
  // document order, and refuses loudly naming any OTHER top-level element
  // it meets rather than walking past it the way a `<p>`-only scan would.
  const strict = strictBlocksOf(content, ['p', 'h4', 'h5', 'h6', 'table', 'ul', 'ol']);
  if (!strict.ok) {
    return fail(
      `feat body contains an unrecognised <${strict.tag}> element — refusing ` +
        `rather than silently dropping it (page "${options.slug}")`,
    );
  }
  const blocks = strict.blocks;
  if (blocks.length === 0) {
    return fail('page content has no paragraphs');
  }

  const sourceBlock = blocks.find(
    (block) => block.tag === 'p' && /^\s*Source\s*:/iu.test(toText(block.html)),
  );
  if (sourceBlock === undefined) {
    return fail('no "Source:" line');
  }
  const sourceBook = toText(sourceBlock.html).replace(/^\s*Source\s*:\s*/iu, '');
  if (sourceBook === '') {
    return fail('"Source:" line names no book');
  }

  const descriptorBlock = blocks.find(
    (block) => block.tag === 'p' && emphasisedTexts(block.html).length > 0,
  );
  if (descriptorBlock === undefined) {
    return fail('no <em> descriptor line');
  }
  const emphasised = emphasisedTexts(descriptorBlock.html);
  const descriptor = readDescriptor(emphasised[0] as string);
  if (typeof descriptor === 'string') {
    return fail(descriptor);
  }

  // R2-3: the cross-check runs BEFORE any out-of-scope decision — an
  // out-of-scope descriptor reading is never trusted alone. See
  // `resolveCategorySignal`'s own comment for why an earlier version got
  // this order wrong.
  const pageTags = readPageTags(html);
  const resolution = resolveCategorySignal(descriptor, pageTags);
  if (!resolution.ok) {
    return fail(resolution.reason);
  }
  if (resolution.signal.kind === 'out-of-scope') {
    return skip(
      `feat category "${resolution.signal.value}" is out of 2024 PHB scope ` +
        '(non-PHB setting content) — see OUT_OF_SCOPE_FEAT_CATEGORIES in ' +
        `tools/scrape/parse-feat.ts (page "${options.slug}")`,
    );
  }
  const category = resolution.signal.value;

  const bodyBlocks = blocks.filter(
    (block) => block !== sourceBlock && block !== descriptorBlock,
  );
  const description = bodyBlocks
    .map((block) =>
      block.tag === 'p' ? readParagraph(block.html) : { label: null, text: toText(block.html) },
    )
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
