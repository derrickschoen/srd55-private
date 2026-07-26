/**
 * SYNTHETIC wiki pages, written by hand for these tests.
 *
 * Not one byte of this file came from a scrape. Every spell name, every school
 * pairing and every line of flavour text below is original homebrew invented for
 * the purpose. That is a hard rule, not a preference: a saved real page IS the
 * non-free content the whole containment design exists to keep out of the
 * repository, so committing one "just as a parser fixture" would defeat the guard
 * from inside.
 *
 * What these DO reproduce is the page SHELL — `<div id="page-content">`, a
 * `Source:` line, an `<em>` descriptor, a `<strong>Label:</strong>` block
 * separated by `<br />`, and a `page-tags` list. Structure is format, not
 * content, and it is the only thing the parser reads.
 *
 * The chrome around the content region is deliberately noisy and includes a
 * decoy `<div>` nesting, because the parser's div-balancing is the one piece of
 * judgement in the HTML layer and a fixture without nesting would not exercise it.
 */

interface SyntheticPageInput {
  readonly title: string;
  readonly source: string;
  readonly descriptor: string;
  readonly castingTime: string;
  readonly range: string;
  readonly components: string;
  readonly duration: string;
  readonly body: readonly string[];
  readonly tags: readonly string[];
}

export function syntheticSpellPage(input: SyntheticPageInput): string {
  const body = input.body.map((text) => `<p>${text}</p>`).join('\n');
  return `<html><head><title>${input.title} - Homebrew Test Wiki</title></head>
<body>
<div id="container">
  <div id="header"><h1><span>Homebrew Test Wiki</span></h1></div>
  <div id="page-title">${input.title}</div>
  <div id="page-content">
<p>Source: ${input.source}</p>
<p><em>${input.descriptor}</em></p>
<p><strong>Casting Time:</strong> ${input.castingTime}<br />
<strong>Range:</strong> ${input.range}<br />
<strong>Components:</strong> ${input.components}<br />
<strong>Duration:</strong> ${input.duration}</p>
${body}
  </div>
  <div class="page-tags"><span>${input.tags
    .map((tag) => `<a href="/system:page-tags/tag/${tag}">${tag}</a>`)
    // NO separator between the anchors — that is how the real markup is
    // written, and stripping tags to nothing therefore fuses the tag list into
    // one word. An earlier version of this fixture joined with a newline, which
    // hid the bug until a live run found it.
    .join('')}</span></div>
</div>
</body></html>`;
}

/** A levelled spell with a material component and two spell lists. */
export const LANTERNFALL = syntheticSpellPage({
  title: 'Lanternfall',
  source: "Wandering Tinker's Companion",
  descriptor: 'Level 2 Evocation (Bard, Wizard)',
  castingTime: 'Action',
  range: '90 feet',
  components: 'V, S, M (a shard of cooled lamp glass)',
  duration: 'Instantaneous',
  body: [
    'A hanging lantern of pale light falls apart above a point you choose in range, showering the ground below in cool sparks.',
    'Each creature standing in the shower must make a Dexterity saving throw or be Blinded until the end of its next turn.',
    '<strong>Using a Higher-Level Spell Slot.</strong> The blinded duration lengthens by one round for each slot level above 2.',
  ],
  tags: ['bard', 'evocation', 'wizard'],
});

/** A cantrip: the other descriptor shape entirely. */
export const THREADCALL = syntheticSpellPage({
  title: 'Threadcall',
  source: "Wandering Tinker's Companion",
  descriptor: 'Divination Cantrip (Bard, Druid)',
  castingTime: 'Action',
  range: 'Touch',
  components: 'V, S',
  duration: 'Concentration, up to 1 minute',
  body: [
    'You tie an invisible thread between yourself and a willing creature you touch, and you know without looking which way the thread pulls.',
  ],
  tags: ['bard', 'cantrip', 'divination', 'druid'],
});

/** A ritual with concentration — the two boolean fields, both true. */
export const LEDGER_OF_SMALL_DEBTS = syntheticSpellPage({
  title: 'Ledger of Small Debts',
  source: "Wandering Tinker's Companion",
  descriptor: 'Level 1 Enchantment (Bard, Cleric)',
  castingTime: 'Action or Ritual',
  range: 'Self',
  components: 'V, S, M (a tally stick worth at least 1 sp)',
  duration: 'Concentration, up to 10 minutes',
  body: [
    'You become aware of every promise made aloud within 30 feet of you while the spell lasts, and of who owes what to whom.',
    'The ledger is honest about the words and says nothing at all about the intent behind them.',
  ],
  tags: ['bard', 'cleric', 'enchantment'],
});

/** Not on the Bard list — proves the `--list` filter actually filters. */
export const GRAVEL_MERCY = syntheticSpellPage({
  title: 'Gravel Mercy',
  source: "Wandering Tinker's Companion",
  descriptor: 'Level 3 Abjuration (Cleric)',
  castingTime: 'Bonus Action',
  range: '30 feet',
  components: 'V',
  duration: 'Instantaneous',
  body: [
    'The road under a fallen ally softens for a heartbeat and gives back some of what the fall took.',
  ],
  tags: ['abjuration', 'cleric'],
});

/**
 * A page whose descriptor and tags DISAGREE: the descriptor says Necromancy,
 * the tag list says Illusion. Exactly one of the two readings is right and there
 * is no way to tell which from here, so the parser must refuse the page rather
 * than pick a winner.
 */
export const CONTRADICTORY = syntheticSpellPage({
  title: 'Second Opinion',
  source: "Wandering Tinker's Companion",
  descriptor: 'Level 1 Necromancy (Wizard)',
  castingTime: 'Action',
  range: 'Self',
  components: 'V',
  duration: 'Instantaneous',
  body: ['A page that cannot agree with itself.'],
  tags: ['illusion', 'wizard'],
});

/**
 * A page that puts the descriptor AND the whole definition block in ONE
 * paragraph, separated only by `<br />`.
 *
 * Hand-written to mirror a shape a live run turned up: reading the descriptor
 * from the paragraph's text instead of from inside the `<em>` hands the
 * descriptor parser "Level 2 Conjuration (Bard) Casting Time: … Range: …" and
 * the page fails for a reason that has nothing to do with what is wrong.
 */
export const FUSED_DESCRIPTOR_AND_DEFINITION = `<html><head><title>Tinker's Understudy - Homebrew Test Wiki</title></head>
<body><div id="page-content">
<p>Source: Wandering Tinker's Companion</p>
<p><em>Level 2 Conjuration (Bard)</em><br />
<strong>Casting Time:</strong> 1 hour or Ritual<br />
<strong>Range:</strong> 10 feet<br />
<strong>Components:</strong> V, S, M (a thimble worth at least 5 gp)<br />
<strong>Duration:</strong> Instantaneous</p>
<p>You assemble a small helper out of oddments and a great deal of patience. It fetches, it holds things, and it does not talk.</p>
</div>
<div class="page-tags"><span><a href="/x">bard</a><a href="/x">conjuration</a><a href="/x">second</a></span></div>
</body></html>`;

/** Malformed: no definition block at all. */
export const NO_DEFINITION_BLOCK = `<html><head><title>Halfway Written - Homebrew Test Wiki</title></head>
<body><div id="page-content">
<p>Source: Wandering Tinker's Companion</p>
<p><em>Level 1 Illusion (Bard)</em></p>
<p>Someone started this page and wandered off.</p>
</div></body></html>`;

/** Malformed: the descriptor line is prose, not a descriptor. */
export const PROSE_DESCRIPTOR = syntheticSpellPage({
  title: 'Almost A Spell',
  source: "Wandering Tinker's Companion",
  descriptor: 'a second-level trick for tinkers and their apprentices',
  castingTime: 'Action',
  range: 'Self',
  components: 'V',
  duration: 'Instantaneous',
  body: ['Prose where a descriptor should be.'],
  tags: ['bard'],
});

/** Malformed: the page shell is missing entirely. */
export const NO_CONTENT_DIV = `<html><head><title>Nothing Here</title></head>
<body><p>Source: Wandering Tinker's Companion</p></body></html>`;

/**
 * A synthetic sitemap in the real format. URLs point at a fictional host so
 * nothing here can be mistaken for, or accidentally used as, a live target.
 */
export const SYNTHETIC_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>http://example.invalid/spell:lanternfall</loc><lastmod>2026-07-21T02:42:05+00:00</lastmod></url>
  <url><loc>http://example.invalid/spell:threadcall</loc><lastmod>2026-07-20T11:00:00+00:00</lastmod></url>
  <url><loc>http://example.invalid/magic-item:tinkers-thimble</loc><lastmod>2026-07-19T09:00:00+00:00</lastmod></url>
  <url><loc>http://example.invalid/bard:college-of-the-long-road</loc></url>
  <url><loc>http://example.invalid/spell:ledger-of-small-debts</loc><lastmod>2026-07-18T08:30:00+00:00</lastmod></url>
</urlset>`;
