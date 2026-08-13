/**
 * SYNTHETIC wiki SPECIES pages, written by hand for these tests.
 *
 * Same rule as `synthetic-pages.ts`: not one byte of this file came from a
 * scrape. Every species name and every line of trait text below is
 * original, invented for the purpose.
 *
 * What these DO reproduce is the page SHELL and the printed IDIOM confirmed
 * against three live pages on 2026-08-13 (`species:elf`, `species:human`,
 * `species:dragonborn`, fetched through `PoliteFetcher` and never saved
 * anywhere this repository tracks): one or more `Source:` lines, optional
 * `<h5>`/`<h3>`/`<h4>` lineage sections before a `<h3>{Name} Traits</h3>`
 * heading, a `<strong>Creature Type:</strong> …<br /><strong>Size:</strong>
 * …<br /><strong>Speed:</strong> …` block, the "As a {Name}, you have these
 * special traits." filler sentence, and `<strong>Name.</strong> text` trait
 * paragraphs, some followed by a bare heading + table fold.
 */

interface SyntheticSpeciesPageInput {
  readonly title: string;
  readonly sources: readonly string[];
  readonly intro: readonly string[];
  readonly lineages?: readonly {
    readonly tag: 'h3' | 'h4' | 'h5';
    readonly name: string;
    readonly body: readonly string[];
  }[];
  /** Defaults to `title`; override to exercise the cross-check refusal. */
  readonly traitsHeadingName?: string;
  readonly creatureType?: string;
  readonly size: string;
  readonly speed: string;
  /** Defaults to the confirmed live shape; pass `null` to omit it. */
  readonly fillerSentence?: string | null;
  readonly traits: readonly {
    readonly name: string;
    readonly body: string;
    readonly extraHeading?: string;
    readonly extraTable?: string;
  }[];
  readonly tags: readonly string[];
}

export function syntheticSpeciesPage(input: SyntheticSpeciesPageInput): string {
  const sources = input.sources.map((source) => `<p>Source: ${source}</p>`).join('\n');
  const intro = input.intro.map((text) => `<p>${text}</p>`).join('\n');
  const lineages = (input.lineages ?? [])
    .map(
      (lineage) =>
        `<${lineage.tag}>${lineage.name}</${lineage.tag}>\n` +
        lineage.body.map((text) => `<p>${text}</p>`).join('\n'),
    )
    .join('\n');
  const traitsHeadingName = input.traitsHeadingName ?? input.title;
  const creatureType = input.creatureType ?? 'Humanoid';
  const filler =
    input.fillerSentence === null
      ? ''
      : `<p>${input.fillerSentence ?? `As a ${input.title}, you have these special traits.`}</p>`;
  const traits = input.traits
    .map((trait) => {
      const extra =
        trait.extraHeading === undefined
          ? ''
          : `\n<h5>${trait.extraHeading}</h5>\n<table>${trait.extraTable ?? ''}</table>`;
      return `<p><strong>${trait.name}.</strong> ${trait.body}</p>${extra}`;
    })
    .join('\n');
  return `<html><head><title>${input.title} - Homebrew Test Wiki</title></head>
<body>
<div id="container">
  <div id="header"><h1><span>Homebrew Test Wiki</span></h1></div>
  <div id="page-content">
${sources}
${intro}
${lineages}
<h3>${traitsHeadingName} Traits</h3>
<p><strong>Creature Type:</strong> ${creatureType}<br />
<strong>Size:</strong> ${input.size}<br />
<strong>Speed:</strong> ${input.speed}</p>
${filler}
${traits}
  </div>
  <div class="page-tags"><span>${input.tags
    .map((tag) => `<a href="/system:page-tags/tag/${tag}">${tag}</a>`)
    .join('')}</span></div>
</div>
</body></html>`;
}

/**
 * A species WITH lineages (three `<h5>` sections before Traits, shaped after
 * the live `species:elf` sample) and a trait carrying a folded heading +
 * table (its "Lineages" reference table).
 */
export const MOSSKIN = syntheticSpeciesPage({
  title: 'Mosskin',
  sources: ["Wandering Tinker's Companion"],
  intro: ['Mosskin trace their ancestry to the slow, patient magic of old-growth forests.'],
  lineages: [
    {
      tag: 'h5',
      name: 'Deep Root',
      body: ['Deep Root mosskin favour stillness and endurance over speed.'],
    },
    {
      tag: 'h5',
      name: 'Bright Canopy',
      body: ['Bright Canopy mosskin carry sunlight in their bark-pale skin.'],
    },
  ],
  size: 'Medium (about 5-6 feet tall)',
  speed: '30 feet',
  traits: [
    { name: 'Darkvision', body: 'You have Darkvision with a range of 60 feet.' },
    {
      name: 'Mosskin Lineage',
      body: 'You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Mosskin Lineages table.',
      extraHeading: 'Mosskin Lineages',
      extraTable: '<tr><td>Lineage</td><td>Benefit</td></tr><tr><td>Deep Root</td><td>Resistance to poison damage</td></tr><tr><td>Bright Canopy</td><td>The Light cantrip</td></tr>',
    },
    { name: 'Photosynthesis', body: 'You do not need to eat, so long as you spend at least 6 hours a day in sunlight.' },
  ],
  tags: ['common'],
});

/**
 * A species WITHOUT lineages, shaped after the live `species:human` sample,
 * and exercising the SIZE CHOICE shape ("Medium … or Small …") that is why
 * `size` stays verbatim prose rather than a closed enum.
 */
export const WAYFOLK = syntheticSpeciesPage({
  title: 'Wayfolk',
  sources: ["Wandering Tinker's Companion"],
  intro: ['Wayfolk are found on every road worth walking.'],
  size: 'Medium (about 4-7 feet tall) or Small (about 2-4 feet tall), chosen when you select this species',
  speed: '30 feet',
  traits: [
    { name: 'Well-Travelled', body: 'You gain proficiency in the Survival skill.' },
    { name: 'Quick Study', body: 'You gain proficiency in one tool of your choice.' },
  ],
  tags: ['common'],
});

/** Malformed: the traits heading names a different species than the title. */
export const HEADING_NAME_MISMATCH = syntheticSpeciesPage({
  title: 'Stormtouched',
  sources: ["Wandering Tinker's Companion"],
  intro: ['A page that cannot agree with itself about its own name.'],
  traitsHeadingName: 'Windtouched',
  size: 'Medium',
  speed: '30 feet',
  traits: [{ name: 'Static Skin', body: 'You are immune to nonmagical lightning damage.' }],
  tags: ['common'],
});

/** Malformed: the Speed line is not a plain "{n} feet" value. */
export const UNPARSEABLE_SPEED = syntheticSpeciesPage({
  title: 'Windrunner',
  sources: ["Wandering Tinker's Companion"],
  intro: ['A species whose speed is printed as a choice, not a bare number.'],
  size: 'Medium',
  speed: '30 feet, or 35 feet while you are not wearing armor',
  traits: [{ name: 'Fleet', body: 'You ignore difficult terrain created by natural, nonmagical means.' }],
  tags: ['common'],
});

/** Malformed: no filler ("As a X, you have these special traits.") sentence. */
export const NO_FILLER_SENTENCE = syntheticSpeciesPage({
  title: 'Cindergrain',
  sources: ["Wandering Tinker's Companion"],
  intro: ['A page missing its own filler sentence.'],
  size: 'Medium',
  speed: '30 feet',
  fillerSentence: null,
  traits: [{ name: 'Warm-Blooded', body: 'You have Resistance to cold damage.' }],
  tags: ['common'],
});

/** Malformed: no traits at all after the filler sentence. */
export const NO_TRAITS = syntheticSpeciesPage({
  title: 'Blankcast',
  sources: ["Wandering Tinker's Companion"],
  intro: ['A page that never got its trait paragraphs written.'],
  size: 'Medium',
  speed: '30 feet',
  traits: [],
  tags: ['common'],
});

/**
 * F5: the `species:elf` shape this module's file comment describes —
 * three `<h5>` lineage sections, THEN a shallower `<h3>` alternate-setting
 * heading with its own two `<h4>` subsections. The setting heading is a
 * ROOT section exactly like the three real lineages (nothing shallower
 * opened before it either), but at a DIFFERENT tag depth — this module has
 * no positive way to tell it apart from a fourth real lineage, so it must
 * refuse the whole page rather than guess. (Its two `<h4>` subsections
 * *are* positively classifiable — deeper than their `<h3>` parent, so
 * folded rather than emitted — but that does not rescue the page, because
 * the root-depth mismatch is what trips the refusal.)
 */
export const AMBIGUOUS_LINEAGE_DEPTHS = syntheticSpeciesPage({
  title: 'Duskborn',
  sources: ["Wandering Tinker's Companion"],
  intro: ['Duskborn trace their lines through three ancient houses.'],
  lineages: [
    { tag: 'h5', name: 'House Ashgrave', body: ['House Ashgrave duskborn favour the old rites.'] },
    { tag: 'h5', name: 'House Emberfall', body: ['House Emberfall duskborn carry a spark of old fire.'] },
    { tag: 'h5', name: 'House Wanewood', body: ['House Wanewood duskborn walk quietly between worlds.'] },
    { tag: 'h3', name: 'Farshore Setting', body: ['A whole alternate-setting variant, not a fourth house.'] },
    { tag: 'h4', name: 'In the Shallows', body: ['One Farshore subsection.'] },
    { tag: 'h4', name: 'In the Deep', body: ['A second Farshore subsection.'] },
  ],
  size: 'Medium',
  speed: '30 feet',
  traits: [{ name: 'Duskborn Sight', body: 'You have Darkvision with a range of 60 feet.' }],
  tags: ['common'],
});

/** Malformed: no "Source:" line at all. */
export const NO_SOURCE_LINE = `<html><head><title>Nameless Draft - Homebrew Test Wiki</title></head>
<body><div id="page-content">
<p>Someone started this page and forgot the source line.</p>
<h3>Nameless Draft Traits</h3>
<p><strong>Creature Type:</strong> Humanoid<br />
<strong>Size:</strong> Medium<br />
<strong>Speed:</strong> 30 feet</p>
<p>As a Nameless Draft, you have these special traits.</p>
<p><strong>Undocumented.</strong> This trait is as unfinished as the page.</p>
</div>
<div class="page-tags"><a href="/x">common</a></div>
</body></html>`;

/** Malformed: no "{Name} Traits" heading anywhere on the page. */
export const NO_TRAITS_HEADING = `<html><head><title>Half-Written - Homebrew Test Wiki</title></head>
<body><div id="page-content">
<p>Source: Wandering Tinker's Companion</p>
<p>Someone started this page and wandered off before reaching the traits.</p>
</div>
<div class="page-tags"><a href="/x">common</a></div>
</body></html>`;

/** Malformed: the page shell is missing entirely. */
export const NO_CONTENT_DIV = `<html><head><title>Nothing Here</title></head>
<body><p>Source: Wandering Tinker's Companion</p></body></html>`;
