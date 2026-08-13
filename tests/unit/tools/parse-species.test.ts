import { describe, expect, it } from 'vitest';
import { parseSpeciesPage } from '../../../tools/scrape/parse-species';
import { isSpellVersionKey } from '../../../src/catalog/catalog-key';
import {
  AMBIGUOUS_LINEAGE_DEPTHS,
  HEADING_NAME_MISMATCH,
  MOSSKIN,
  NO_CONTENT_DIV,
  NO_FILLER_SENTENCE,
  NO_SOURCE_LINE,
  NO_TRAITS,
  NO_TRAITS_HEADING,
  THORNKIN,
  UNPARSEABLE_SPEED,
  WAYFOLK,
} from '../../fixtures/scrape/synthetic-species-pages';

function parse(html: string, slug = 'species:test') {
  return parseSpeciesPage(html, { edition: '2024', slug });
}

function expectOk(html: string, slug = 'species:test') {
  const result = parse(html, slug);
  if (!result.ok) {
    throw new Error(`expected a parse, got: ${result.reason}`);
  }
  return result.value;
}

describe('species page parser', () => {
  it('reads a species with lineages and a folded trait table into the document shape', () => {
    const { document } = expectOk(MOSSKIN, 'species:mosskin');

    expect(document.name).toBe('Mosskin');
    expect(document.identityKey).toBe('scraped-mosskin');
    expect(document.versionKey).toBe('2024:scraped.wikidot:mosskin');
    expect(document.edition).toBe('2024');
    expect(document.size).toBe('Medium (about 5-6 feet tall)');
    expect(document.speed).toBe(30);
    expect(document.sourceBooks).toEqual(["Wandering Tinker's Companion"]);
    expect(document.sourcePage).toBe(null);
    expect(document.sourceSlug).toBe('species:mosskin');

    expect(document.lineages).toEqual([
      {
        name: 'Deep Root',
        descriptionParagraphs: [expect.stringContaining('stillness')],
      },
      {
        name: 'Bright Canopy',
        descriptionParagraphs: [expect.stringContaining('sunlight')],
      },
    ]);

    expect(document.traits).toHaveLength(3);
    expect(document.traits[0]).toEqual({
      name: 'Darkvision',
      descriptionParagraphs: [expect.stringContaining('60 feet')],
    });
    // The folded reference table: the trait's own sentence, the bare
    // heading's text, and the table's text, all as verbatim strings.
    const lineageTrait = document.traits[1]!;
    expect(lineageTrait.name).toBe('Mosskin Lineage');
    expect(lineageTrait.descriptionParagraphs).toEqual([
      expect.stringContaining('Choose a lineage'),
      'Mosskin Lineages',
      expect.stringContaining('Deep Root'),
    ]);
    expect(lineageTrait.descriptionParagraphs.some((p) => p.includes('Bright Canopy'))).toBe(true);
  });

  it('reads a species with no lineages, keeping a printed size CHOICE as verbatim prose', () => {
    const { document } = expectOk(WAYFOLK, 'species:wayfolk');
    expect(document.lineages).toEqual([]);
    expect(document.size).toBe(
      'Medium (about 4-7 feet tall) or Small (about 2-4 feet tall), chosen when you select this species',
    );
    expect(document.speed).toBe(30);
    expect(document.traits).toEqual([
      { name: 'Well-Travelled', descriptionParagraphs: [expect.stringContaining('Survival')] },
      { name: 'Quick Study', descriptionParagraphs: [expect.stringContaining('one tool')] },
    ]);
  });

  it('mints NAMESPACED keys, so an imported scraped row is not mistaken for bundled content', () => {
    const { document } = expectOk(WAYFOLK);
    const parts = document.versionKey.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe('scraped.wikidot');
    expect(document.identityKey.startsWith('scraped-')).toBe(true);
    expect(isSpellVersionKey(document.versionKey)).toBe(true);
  });

  it.each([
    ['no content region', NO_CONTENT_DIV, 'page-content'],
    ['no Source: line', NO_SOURCE_LINE, 'Source'],
    ['no "{Name} Traits" heading', NO_TRAITS_HEADING, 'Traits'],
    ['a traits heading that disagrees with the page title', HEADING_NAME_MISMATCH, 'Windtouched'],
    ['a Speed line that is not a plain "{n} feet" value', UNPARSEABLE_SPEED, 'Speed'],
    ['no filler sentence after the definition block', NO_FILLER_SENTENCE, 'special traits'],
    ['no trait paragraphs at all', NO_TRAITS, 'trait paragraphs'],
  ])('refuses %s rather than defaulting the missing fields', (_label, html, needle) => {
    const result = parse(html);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(needle);
  });

  // F5: the `species:elf` shape (real lineages plus a shallower
  // alternate-setting heading with its own subsections) has no positive
  // signal telling the setting heading apart from a fourth real lineage, so
  // the honest outcome is a loud refusal — never three real lineages plus
  // three fabricated ones, and never five real lineages with the setting
  // heading silently merged into "House Wanewood".
  it('refuses a page whose pre-Traits root headings mix depths, rather than guessing which are real lineages', () => {
    const result = parse(AMBIGUOUS_LINEAGE_DEPTHS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('depth');
    // Never a silent guess: no document is returned to fabricate lineages from.
  });

  it('emits ONLY uniform-depth root headings as lineages', () => {
    // MOSSKIN's two lineages are both `<h5>` with no nested heading under
    // either — uniform depth, so both are confidently real, and none of
    // Mosskin's other content (traits, the folded "Mosskin Lineages" table)
    // is mistaken for a lineage. This does NOT exercise folding a nested
    // pre-Traits heading — see THORNKIN below for that (R2-1).
    const { document } = expectOk(MOSSKIN, 'species:mosskin');
    expect(document.lineages).toHaveLength(2);
    expect(document.lineages.map((lineage) => lineage.name)).toEqual([
      'Deep Root',
      'Bright Canopy',
    ]);
  });

  // R2-1: a nested pre-Traits heading's NAME and its own prose must survive,
  // verbatim, inside its root ancestor's descriptionParagraphs — not vanish
  // the way an earlier draft of `readLineageNodes` silently dropped them
  // (their text landed on a node object that was never part of the
  // returned roots). THORNKIN's second root, "Windborn", carries a nested
  // `<h4>Windborn Enclaves</h4>` subsection; this pins that its heading text
  // and body both come through, in order, rather than disappearing.
  it('folds a nested pre-Traits heading — its name and prose — into its root ancestor, verbatim', () => {
    const { document } = expectOk(THORNKIN, 'species:thornkin');
    expect(document.lineages).toHaveLength(2);
    expect(document.lineages[0]).toEqual({
      name: 'Stonebound',
      descriptionParagraphs: [expect.stringContaining('never leave the hill')],
    });
    const windborn = document.lineages[1]!;
    expect(windborn.name).toBe('Windborn');
    expect(windborn.descriptionParagraphs).toEqual([
      expect.stringContaining('travel with the seasons'),
      'Windborn Enclaves',
      expect.stringContaining('gather at the first frost of autumn'),
    ]);
    // Not merely present somewhere in the document — specifically inside
    // the root's own OWN prose array, which is the thing this project
    // actually returns to a caller.
    expect(
      windborn.descriptionParagraphs.some((p) => p.includes('first frost of autumn')),
    ).toBe(true);
  });
});
