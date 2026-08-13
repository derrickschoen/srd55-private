import { describe, expect, it } from 'vitest';
import { parseSubclassPage } from '../../../tools/scrape/parse-subclass';
import { isSpellVersionKey } from '../../../src/catalog/catalog-key';
import {
  IRONBOUND_SENTINEL,
  NO_CONTENT_DIV,
  NO_FEATURE_HEADINGS,
  NO_SOURCE_LINE,
  NOT_TAGGED_SUBCLASS,
  TIDEBOUND_PATH,
} from '../../fixtures/scrape/synthetic-subclass-pages';

function parse(html: string, slug = 'fighter:test', parentClass = 'Fighter') {
  return parseSubclassPage(html, { edition: '2024', slug, parentClass });
}

function expectOk(
  html: string,
  slug = 'fighter:test',
  parentClass = 'Fighter',
) {
  const result = parse(html, slug, parentClass);
  if (!result.ok) {
    throw new Error(`expected a parse, got: ${result.reason}`);
  }
  return result.value;
}

describe('subclass page parser', () => {
  it('reads a standard non-caster subclass into the document shape', () => {
    const { document } = expectOk(
      IRONBOUND_SENTINEL,
      'fighter:ironbound-sentinel',
      'Fighter',
    );

    expect(document.name).toBe('Ironbound Sentinel');
    expect(document.identityKey).toBe('scraped-ironbound-sentinel');
    expect(document.versionKey).toBe('2024:scraped.wikidot:ironbound-sentinel');
    expect(document.edition).toBe('2024');
    expect(document.parentClass).toBe('Fighter');
    expect(document.sourceBooks).toEqual(["Wandering Tinker's Companion"]);
    expect(document.sourcePage).toBe(null);
    expect(document.sourceSlug).toBe('fighter:ironbound-sentinel');

    expect(document.features).toEqual([
      {
        level: 3,
        name: 'Unshakable Stance',
        descriptionParagraphs: [expect.stringContaining('Advantage on Strength')],
      },
      {
        level: 3,
        name: 'Warding Strike',
        descriptionParagraphs: [expect.stringContaining('Opportunity Attack')],
      },
      {
        level: 7,
        name: 'Bulwark Reflex',
        descriptionParagraphs: [expect.stringContaining('Resistance')],
      },
      {
        level: 10,
        name: 'Tireless Guard',
        descriptionParagraphs: [expect.stringContaining('Exhaustion')],
      },
      {
        level: 15,
        name: 'Unbroken Line',
        descriptionParagraphs: [expect.stringContaining('drop to 1')],
      },
    ]);
    // Intro flavour text (the <em> tagline, the lead-in paragraph) is dropped
    // rather than fabricated into a feature.
    expect(JSON.stringify(document)).not.toContain('Guard the Line');
  });

  it('folds a bare, level-less heading and table into the feature it follows', () => {
    const { document } = expectOk(
      TIDEBOUND_PATH,
      'druid:tidebound-path',
      'Druid',
    );
    expect(document.parentClass).toBe('Druid');
    expect(document.features).toHaveLength(3);

    const spellsFeature = document.features[1]!;
    expect(spellsFeature.level).toBe(3);
    expect(spellsFeature.name).toBe('Tidebound Spells');
    // The feature's own prose paragraph, PLUS the folded heading text and the
    // table's text, all as verbatim strings — never a structured per-level
    // spell list.
    expect(spellsFeature.descriptionParagraphs).toEqual([
      expect.stringContaining('always have certain spells ready'),
      'Tidebound Spells',
      expect.stringContaining('Fog Cloud'),
    ]);

    // The table text lands as prose, not as a structured object.
    expect(spellsFeature.descriptionParagraphs.some((p) => p.includes('Water Walk'))).toBe(true);
  });

  it('mints NAMESPACED keys, so an imported scraped row is not mistaken for bundled content', () => {
    const { document } = expectOk(IRONBOUND_SENTINEL);
    const parts = document.versionKey.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe('scraped.wikidot');
    expect(document.identityKey.startsWith('scraped-')).toBe(true);
    expect(isSpellVersionKey(document.versionKey)).toBe(true);
  });

  it('records whatever parentClass the caller supplies, since the page itself never names its class', () => {
    const { document } = expectOk(IRONBOUND_SENTINEL, 'sorcerer:test', 'Sorcerer');
    expect(document.parentClass).toBe('Sorcerer');
  });

  it.each([
    ['a page whose tags do not carry "subclass"', NOT_TAGGED_SUBCLASS, 'subclass'],
    ['no content region', NO_CONTENT_DIV, 'page-content'],
    ['no Source: line', NO_SOURCE_LINE, 'Source'],
    ['no "Level {n}: {name}" headings', NO_FEATURE_HEADINGS, 'Level'],
  ])('refuses %s rather than defaulting the missing fields', (_label, html, needle) => {
    const result = parse(html);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(needle);
  });
});
