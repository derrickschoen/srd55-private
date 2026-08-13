/**
 * SYNTHETIC wiki FEAT pages, written by hand for these tests.
 *
 * Same rule as `synthetic-pages.ts`: not one byte of this file came from a
 * scrape. Every feat name and every line of benefit text below is original,
 * invented for the purpose. A saved real page IS the non-free content the
 * whole containment design exists to keep out of the repository.
 *
 * What these DO reproduce is the page SHELL and the printed IDIOM confirmed
 * against three live pages on 2026-08-13 (`feat:chef`, `feat:tactical-combatant`,
 * `feat:shifting-combatant`, fetched through `PoliteFetcher` and never saved
 * anywhere this repository tracks): `<div id="page-content">`, a `Source:`
 * line, an `<em>` descriptor in one of the shapes `readDescriptor` in
 * `tools/scrape/parse-feat.ts` documents, `<strong>Label.</strong> sentence…`
 * benefit paragraphs, and a `page-tags` list of un-separated `<a>` anchors.
 */

interface SyntheticFeatPageInput {
  readonly title: string;
  readonly source: string;
  readonly descriptor: string;
  readonly body: readonly string[];
  readonly tags: readonly string[];
  /**
   * Raw HTML blocks inserted verbatim after `body`'s `<p>` paragraphs — for
   * fixtures exercising headings/tables/lists/unrecognised elements in the
   * feat body (F1), which `body` cannot express since it always wraps each
   * entry in `<p>…</p>`.
   */
  readonly extraBlocks?: readonly string[];
}

export function syntheticFeatPage(input: SyntheticFeatPageInput): string {
  const body = input.body.map((text) => `<p>${text}</p>`).join('\n');
  const extraBlocks = (input.extraBlocks ?? []).join('\n');
  return `<html><head><title>${input.title} - Homebrew Test Wiki</title></head>
<body>
<div id="container">
  <div id="header"><h1><span>Homebrew Test Wiki</span></h1></div>
  <div id="page-title">${input.title}</div>
  <div id="page-content">
<p>Source: ${input.source}</p>
<p><em>${input.descriptor}</em></p>
${body}
${extraBlocks}
  </div>
  <div class="page-tags"><span>${input.tags
    .map((tag) => `<a href="/system:page-tags/tag/${tag}">${tag}</a>`)
    // NO separator between the anchors, matching the real markup — same
    // reason `synthetic-pages.ts` writes it this way.
    .join('')}</span></div>
</div>
</body></html>`;
}

/**
 * A standard General feat: prerequisite naming a level and a feature, a
 * 1-point Ability Score Increase naming two abilities, and two other named
 * benefits. Shaped after the live `feat:tactical-combatant` /
 * `feat:shifting-combatant` samples.
 */
export const GRIM_MOMENTUM = syntheticFeatPage({
  title: 'Grim Momentum',
  source: "Wandering Tinker's Companion",
  descriptor: 'General Feat (Prerequisite: Level 4+, Weapon Mastery Feature)',
  body: [
    'You gain the following benefits.',
    '<strong>Ability Score Increase.</strong> Increase your Strength or Dexterity score by 1, to a maximum of 20.',
    '<strong>Rolling Guard.</strong> When you are missed by a melee attack, you can drop prone as a Reaction to reduce the damage of the next attack against you before the start of your next turn by half.',
    '<strong>Forward Momentum.</strong> Immediately after you reduce a creature to 0 hit points with a weapon attack, you can move up to half your Speed without provoking Opportunity Attacks.',
  ],
  tags: ['common', 'generalfeat'],
});

/**
 * An Origin feat carrying an Ability Score Increase — the 2-point/"any" shape,
 * so this fixture also exercises `abilities: 'any'` at `points: 2`. The
 * parser does not couple category to whether an ASI is legal (see
 * `parse-feat.ts`'s file comment): that coupling is a content-design rule
 * `src/rules/feats-srd.ts` enforces for the closed bundled SRD set, not a
 * structural fact about what a wikidot page can print.
 */
export const STONECROSSED_WANDERER = syntheticFeatPage({
  title: 'Stonecrossed Wanderer',
  source: "Wandering Tinker's Companion",
  descriptor: 'Origin Feat',
  body: [
    'You gain the following benefits.',
    '<strong>Ability Score Increase.</strong> Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can’t increase an ability score above 20.',
    '<strong>Wanderer’s Memory.</strong> You always know which direction is north while under open sky, and you never become lost in natural terrain.',
  ],
  tags: ['common', 'originfeat'],
});

/**
 * A Fighting Style feat with no Ability Score Increase at all —
 * `abilityIncreaseOptions` must read `null` rather than a fabricated zero.
 */
export const BULWARK_STANCE = syntheticFeatPage({
  title: 'Bulwark Stance',
  source: "Wandering Tinker's Companion",
  descriptor: 'Fighting Style Feat (Prerequisite: Fighting Style Feature)',
  body: [
    '<strong>Bulwark Stance.</strong> While you are wielding a shield, any ally within 5 feet of you gains a +1 bonus to Armor Class.',
  ],
  tags: ['common', 'fightingstylefeat'],
});

/**
 * An Epic Boon: the 1-point ASI shape with a maximum of 30, and a
 * `Repeatable.` paragraph — the fixture that proves `repeatable` reads true
 * only when that exact label is printed.
 */
export const BOON_OF_THE_UNBROKEN_LINE = syntheticFeatPage({
  title: 'Boon of the Unbroken Line',
  source: "Wandering Tinker's Companion",
  descriptor: 'Epic Boon Feat (Prerequisite: Level 19+)',
  body: [
    'You gain the following benefits.',
    '<strong>Ability Score Increase.</strong> Increase your Constitution score by 1, to a maximum of 30.',
    '<strong>Repeatable.</strong> You can take this boon more than once, provided you meet its prerequisite each time.',
    '<strong>Ancestral Steadiness.</strong> You have Advantage on saving throws against being frightened.',
  ],
  tags: ['common', 'epicboonfeat'],
});

/**
 * `feat:chef`'s real shape, reproduced structurally: the descriptor names NO
 * category at all — just `Prerequisite: …` — so the category must come from
 * the page tags alone.
 */
export const LEDGERKEEPERS_KIT = syntheticFeatPage({
  title: "Ledgerkeeper's Kit",
  source: "Player's Handbook",
  descriptor: 'Prerequisite: Level 4+',
  body: [
    'You gain the following benefits.',
    "<strong>Ability Score Increase.</strong> Increase your Intelligence or Wisdom score by 1, to a maximum of 20.",
    "<strong>Ledger Sense.</strong> You have proficiency with Calligrapher's Supplies if you don't already have it.",
  ],
  tags: ['common', 'generalfeat'],
});

/**
 * A page whose descriptor and tags DISAGREE on category: the descriptor says
 * General, the tag list says Origin. Exactly one reading is right and there is
 * no way to tell which from here, so the parser must refuse.
 */
export const CATEGORY_DISAGREEMENT = syntheticFeatPage({
  title: 'Second Opinion',
  source: "Wandering Tinker's Companion",
  descriptor: 'General Feat (Prerequisite: Level 4+)',
  body: ['A page that cannot agree with itself about its own category.'],
  tags: ['common', 'originfeat'],
});

/** Malformed: the descriptor line is prose, not a descriptor. */
export const PROSE_DESCRIPTOR = syntheticFeatPage({
  title: 'Almost A Feat',
  source: "Wandering Tinker's Companion",
  descriptor: 'a trick for the sufficiently stubborn',
  body: ['Prose where a descriptor should be.'],
  tags: ['common', 'generalfeat'],
});

/**
 * Malformed: an "Ability Score Increase." paragraph whose text matches
 * neither printed shape the whole ruleset uses.
 */
export const UNREADABLE_ABILITY_INCREASE = syntheticFeatPage({
  title: 'Unsteady Growth',
  source: "Wandering Tinker's Companion",
  descriptor: 'General Feat (Prerequisite: Level 4+)',
  body: [
    'You gain the following benefits.',
    '<strong>Ability Score Increase.</strong> Increase whichever ability score you feel like today.',
  ],
  tags: ['common', 'generalfeat'],
});

/** Malformed: no "Source:" line. */
export const NO_SOURCE_LINE = `<html><head><title>Nameless Draft - Homebrew Test Wiki</title></head>
<body><div id="page-content">
<p><em>General Feat (Prerequisite: Level 4+)</em></p>
<p>Someone started this page and forgot the source line.</p>
</div>
<div class="page-tags"><a href="/x">generalfeat</a></div>
</body></html>`;

/** Malformed: the page shell is missing entirely. */
export const NO_CONTENT_DIV = `<html><head><title>Nothing Here</title></head>
<body><p>Source: Wandering Tinker's Companion</p></body></html>`;

/**
 * F1: a General feat whose body carries a `<h4>` table-label heading, a
 * `<table>` and a `<ul>` list in ADDITION to `<p>` benefit paragraphs —
 * exercising the "capture headings/tables/lists as verbatim prose, in
 * document order" fix rather than the old `<p>`-only scan, which silently
 * dropped all three.
 */
export const TABLE_BEARING_FEAT = syntheticFeatPage({
  title: 'Ledger of Contingencies',
  source: "Wandering Tinker's Companion",
  descriptor: 'General Feat (Prerequisite: Level 4+)',
  body: [
    'You gain the following benefits.',
    '<strong>Contingency Plan.</strong> Choose one condition from the Contingency Table below.',
  ],
  extraBlocks: [
    '<h4>Contingency Table</h4>',
    '<table><tr><td>Roll</td><td>Effect</td></tr><tr><td>1</td><td>Gain Advantage on your next save</td></tr></table>',
    '<ul><li>You cannot choose the same condition twice in a row.</li></ul>',
  ],
  tags: ['common', 'generalfeat'],
});

/**
 * F1: a feat body carrying an element this module was not written to
 * expect (a bare `<blockquote>`) — must FAIL LOUDLY naming the tag, never
 * silently drop it the way the old `<p>`-only scan would have.
 */
export const UNRECOGNISED_BODY_ELEMENT = syntheticFeatPage({
  title: 'Quietly Broken',
  source: "Wandering Tinker's Companion",
  descriptor: 'General Feat (Prerequisite: Level 4+)',
  body: ['You gain the following benefits.'],
  extraBlocks: ['<blockquote>An aside the parser was never taught to read.</blockquote>'],
  tags: ['common', 'generalfeat'],
});

/**
 * F3: a Dragonmark feat — Eberron setting content, out of this project's
 * 2024 PHB scope. Must be a SKIP (`skipped: true`), not a parse failure, so
 * a full `feat` namespace crawl can complete without `--allow-partial`.
 */
export const DRAGONMARK_FEAT = syntheticFeatPage({
  title: 'Mark of Making',
  source: "Eberron: Rising from the Last War",
  descriptor: 'Dragonmark Feat (Prerequisite: Level 4+, Artificer or Warforged)',
  body: [
    'You gain the following benefits.',
    '<strong>Siberys Shard Attunement.</strong> You can attune to one additional item.',
  ],
  tags: ['common', 'dragonmarkfeat'],
});

/** F3: same non-PHB-scope SKIP, for the Planar Pact category. */
export const PLANAR_PACT_FEAT = syntheticFeatPage({
  title: 'Bound to the Abyss',
  source: "Wandering Tinker's Companion",
  descriptor: 'Planar Pact Feat (Prerequisite: Level 4+)',
  body: ['You gain the following benefits.'],
  tags: ['common', 'planarpactfeat'],
});

/** F3: same non-PHB-scope SKIP, for the Dark Gift category. */
export const DARK_GIFT_FEAT = syntheticFeatPage({
  title: 'Gift of the Grave',
  source: "Wandering Tinker's Companion",
  descriptor: 'Dark Gift Feat',
  body: ['You gain the following benefits.'],
  tags: ['common', 'darkgiftfeat'],
});

/**
 * F3: a category that is neither one of the four in-scope PHB names nor
 * one of the three known out-of-scope names — must still fail loudly, not
 * be swallowed by the widened "any Title Case name" descriptor regex.
 */
export const UNKNOWN_CATEGORY_FEAT = syntheticFeatPage({
  title: 'Mystery Box',
  source: "Wandering Tinker's Companion",
  descriptor: 'Mystic Feat (Prerequisite: Level 4+)',
  body: ['You gain the following benefits.'],
  tags: ['common'],
});

/**
 * R2-3: the descriptor says "Dragonmark Feat" (out of 2024 PHB scope) but
 * the page tags say `generalfeat` (in scope) — two PRESENT, DIFFERENT
 * category signals. This must FAIL LOUDLY as a disagreement, never be
 * silently classified as an out-of-scope skip on the descriptor's word
 * alone: an earlier version resolved the descriptor's out-of-scope reading
 * before the tag cross-check ever ran, so a page like this one would have
 * vanished from a crawl instead of being flagged as self-contradictory.
 */
export const OUT_OF_SCOPE_TAG_DISAGREEMENT = syntheticFeatPage({
  title: 'Contested Heritage',
  source: "Wandering Tinker's Companion",
  descriptor: 'Dragonmark Feat (Prerequisite: Level 4+)',
  body: ['You gain the following benefits.'],
  tags: ['common', 'generalfeat'],
});
