/**
 * SYNTHETIC wiki SUBCLASS pages, written by hand for these tests.
 *
 * Same rule as `synthetic-pages.ts`: not one byte of this file came from a
 * scrape. Every subclass name and every line of feature text below is
 * original, invented for the purpose.
 *
 * What these DO reproduce is the page SHELL and the printed IDIOM confirmed
 * against three live pages on 2026-08-13 (`fighter:champion`,
 * `cleric:life-domain`, `wizard:evoker`, fetched through `PoliteFetcher` and
 * never saved anywhere this repository tracks): `<div id="page-content">`, a
 * `Source:` line, `<h3>Level {n}: {Name}</h3>` feature headings each
 * followed by one or more `<p>`, an occasional bare (level-less) `<h3>`
 * heading plus `<table>` folded into the preceding feature
 * (`cleric:life-domain`'s domain-spells table), and a `page-tags` region
 * carrying the single `subclass` tag with no class name in it at all.
 */

interface SyntheticSubclassPageInput {
  readonly title: string;
  readonly source: string;
  readonly intro: readonly string[];
  readonly features: readonly {
    readonly level: number;
    readonly name: string;
    readonly body: readonly string[];
    /** A bare, level-less heading + table folded into THIS feature, if any. */
    readonly extraHeading?: string;
    readonly extraTable?: string;
  }[];
  readonly tags: readonly string[];
}

export function syntheticSubclassPage(input: SyntheticSubclassPageInput): string {
  const intro = input.intro.map((text) => `<p>${text}</p>`).join('\n');
  const features = input.features
    .map((feature) => {
      const body = feature.body.map((text) => `<p>${text}</p>`).join('\n');
      const extra =
        feature.extraHeading === undefined
          ? ''
          : `\n<h3>${feature.extraHeading}</h3>\n<table>${feature.extraTable ?? ''}</table>`;
      return `<h3>Level ${feature.level}: ${feature.name}</h3>\n${body}${extra}`;
    })
    .join('\n');
  return `<html><head><title>${input.title} - Homebrew Test Wiki</title></head>
<body>
<div id="container">
  <div id="header"><h1><span>Homebrew Test Wiki</span></h1></div>
  <div id="page-content">
<p>Source: ${input.source}</p>
${intro}
${features}
  </div>
  <div class="page-tags"><span>${input.tags
    .map((tag) => `<a href="/system:page-tags/tag/${tag}">${tag}</a>`)
    .join('')}</span></div>
</div>
</body></html>`;
}

/**
 * A standard non-caster subclass, shaped after the live `fighter:champion`
 * sample: five `Level {n}: {Name}` headings, no interleaved tables.
 */
export const IRONBOUND_SENTINEL = syntheticSubclassPage({
  title: 'Ironbound Sentinel',
  source: "Wandering Tinker's Companion",
  intro: [
    '<em>Guard the Line, Whatever It Costs</em>',
    'An Ironbound Sentinel plants themselves between danger and everyone else.',
  ],
  features: [
    {
      level: 3,
      name: 'Unshakable Stance',
      body: ['While you are within 5 feet of an ally, you have Advantage on Strength saving throws.'],
    },
    {
      level: 3,
      name: 'Warding Strike',
      body: ['When you hit a creature with an Opportunity Attack, that creature has Disadvantage on its next attack roll.'],
    },
    {
      level: 7,
      name: 'Bulwark Reflex',
      body: ['When an ally within 5 feet of you is hit by an attack, you can use your Reaction to grant them Resistance to that damage.'],
    },
    {
      level: 10,
      name: 'Tireless Guard',
      body: ['You no longer suffer Exhaustion from forced marches while guarding an ally.'],
    },
    {
      level: 15,
      name: 'Unbroken Line',
      body: ['Once per turn, when you would drop to 0 hit points, you can drop to 1 instead.'],
    },
  ],
  tags: ['subclass'],
});

/**
 * A caster subclass with a bare, level-less heading + table folded into the
 * feature it belongs to — shaped after the live `cleric:life-domain`
 * sample's "Life Domain Spells" table.
 */
export const TIDEBOUND_PATH = syntheticSubclassPage({
  title: 'Tidebound Path',
  source: "Wandering Tinker's Companion",
  intro: [
    '<em>Carry the Sea Wherever You Walk</em>',
    'A Tidebound druid channels currents no map has ever charted.',
  ],
  features: [
    {
      level: 3,
      name: 'Tidal Sense',
      body: ['You can sense the direction and distance of the nearest large body of water within 1 mile.'],
    },
    {
      level: 3,
      name: 'Tidebound Spells',
      body: ['Your connection to the tide ensures you always have certain spells ready.'],
      extraHeading: 'Tidebound Spells',
      extraTable: '<tr><td>Druid Level</td><td>Spells</td></tr><tr><td>3</td><td>Fog Cloud, Create or Destroy Water</td></tr><tr><td>5</td><td>Water Walk, Water Breathing</td></tr>',
    },
    {
      level: 6,
      name: 'Undertow',
      body: ['As a Bonus Action, you can pull a willing creature within 30 feet of you up to 15 feet toward you.'],
    },
  ],
  tags: ['subclass'],
});

/** Malformed: the page tags do not carry "subclass" at all. */
export const NOT_TAGGED_SUBCLASS = syntheticSubclassPage({
  title: 'Overview',
  source: "Wandering Tinker's Companion",
  intro: ['This is the class overview page, not a subclass.'],
  features: [
    {
      level: 3,
      name: 'Not Actually A Feature',
      body: ['This should never be read, because the page is refused before features are read.'],
    },
  ],
  tags: ['class'],
});

/** Malformed: no "Level {n}: {name}" heading anywhere on the page. */
export const NO_FEATURE_HEADINGS = syntheticSubclassPage({
  title: 'Blank Slate',
  source: "Wandering Tinker's Companion",
  intro: ['<em>A Subclass With Nothing Written Yet</em>', 'Someone started this page and never added any features.'],
  features: [],
  tags: ['subclass'],
});

/** Malformed: no "Source:" line. */
export const NO_SOURCE_LINE = `<html><head><title>Nameless Draft - Homebrew Test Wiki</title></head>
<body><div id="page-content">
<p><em>Someone forgot the source line</em></p>
<h3>Level 3: Something</h3>
<p>Body text.</p>
</div>
<div class="page-tags"><a href="/x">subclass</a></div>
</body></html>`;

/** Malformed: the page shell is missing entirely. */
export const NO_CONTENT_DIV = `<html><head><title>Nothing Here</title></head>
<body><p>Source: Wandering Tinker's Companion</p></body></html>`;
