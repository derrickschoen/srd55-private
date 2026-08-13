import { describe, expect, it } from 'vitest';
import { parseSpeciesPage } from '../../../tools/scrape/parse-species';
import { isSpellVersionKey } from '../../../src/catalog/catalog-key';
import {
  HEADING_NAME_MISMATCH,
  MOSSKIN,
  NO_CONTENT_DIV,
  NO_FILLER_SENTENCE,
  NO_SOURCE_LINE,
  NO_TRAITS,
  NO_TRAITS_HEADING,
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
});
