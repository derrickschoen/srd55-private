import { describe, expect, it } from 'vitest';
import { parseFeatPage } from '../../../tools/scrape/parse-feat';
import { isSpellVersionKey } from '../../../src/catalog/catalog-key';
import {
  BOON_OF_THE_UNBROKEN_LINE,
  BULWARK_STANCE,
  CATEGORY_DISAGREEMENT,
  GRIM_MOMENTUM,
  LEDGERKEEPERS_KIT,
  NO_CONTENT_DIV,
  NO_SOURCE_LINE,
  PROSE_DESCRIPTOR,
  STONECROSSED_WANDERER,
  UNREADABLE_ABILITY_INCREASE,
} from '../../fixtures/scrape/synthetic-feat-pages';

function parse(html: string, slug = 'feat:test') {
  return parseFeatPage(html, { edition: '2024', slug });
}

function expectOk(html: string, slug = 'feat:test') {
  const result = parse(html, slug);
  if (!result.ok) {
    throw new Error(`expected a parse, got: ${result.reason}`);
  }
  return result.value;
}

describe('feat page parser', () => {
  it('reads a standard General feat into the document shape', () => {
    const { document, description } = expectOk(GRIM_MOMENTUM, 'feat:grim-momentum');

    expect(document).toEqual({
      identityKey: 'scraped-grim-momentum',
      versionKey: '2024:scraped.wikidot:grim-momentum',
      name: 'Grim Momentum',
      edition: '2024',
      category: 'general',
      prerequisite: 'Level 4+, Weapon Mastery Feature',
      repeatable: false,
      abilityIncreaseOptions: {
        points: 1,
        abilities: ['strength', 'dexterity'],
        maximum: 20,
      },
      sourceBooks: ["Wandering Tinker's Companion"],
      sourcePage: null,
      sourceSlug: 'feat:grim-momentum',
    });

    // Prose is Tier 2 and never rides along in the document.
    expect(description).toEqual([
      { label: null, text: 'You gain the following benefits.' },
      {
        label: 'Ability Score Increase.',
        text: 'Increase your Strength or Dexterity score by 1, to a maximum of 20.',
      },
      {
        label: 'Rolling Guard.',
        text: expect.stringContaining('drop prone'),
      },
      {
        label: 'Forward Momentum.',
        text: expect.stringContaining('Opportunity Attacks'),
      },
    ]);
    expect(JSON.stringify(document)).not.toContain('Rolling Guard');
  });

  it('reads an Origin feat carrying the 2-point/"any" Ability Score Increase', () => {
    const { document } = expectOk(STONECROSSED_WANDERER, 'feat:stonecrossed-wanderer');
    expect(document.category).toBe('origin');
    expect(document.prerequisite).toBe(null);
    expect(document.abilityIncreaseOptions).toEqual({
      points: 2,
      abilities: 'any',
      maximum: 20,
    });
  });

  it('reads a Fighting Style feat with no Ability Score Increase as null, not a fabricated zero', () => {
    const { document, description } = expectOk(BULWARK_STANCE, 'feat:bulwark-stance');
    expect(document.category).toBe('fighting_style');
    expect(document.prerequisite).toBe('Fighting Style Feature');
    expect(document.abilityIncreaseOptions).toBe(null);
    expect(document.repeatable).toBe(false);
    expect(description).toEqual([
      {
        label: 'Bulwark Stance.',
        text: expect.stringContaining('Armor Class'),
      },
    ]);
  });

  it('reads an Epic Boon: a 1-point ASI capped at 30, and "Repeatable." sets the flag', () => {
    const { document } = expectOk(
      BOON_OF_THE_UNBROKEN_LINE,
      'feat:boon-of-the-unbroken-line',
    );
    expect(document.category).toBe('epic_boon');
    expect(document.abilityIncreaseOptions).toEqual({
      points: 1,
      abilities: ['constitution'],
      maximum: 30,
    });
    expect(document.repeatable).toBe(true);
  });

  it('resolves category from the page tags when the descriptor names none at all', () => {
    // feat:chef's real shape: `<em>Prerequisite: Level 4+</em>` with no
    // category word anywhere in it.
    const { document } = expectOk(LEDGERKEEPERS_KIT, 'feat:ledgerkeepers-kit');
    expect(document.category).toBe('general');
    expect(document.prerequisite).toBe('Level 4+');
  });

  it('mints NAMESPACED keys, so an imported scraped row is not mistaken for bundled content', () => {
    const { document } = expectOk(GRIM_MOMENTUM);
    const parts = document.versionKey.split(':');
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe('scraped.wikidot');
    expect(document.identityKey.startsWith('scraped-')).toBe(true);
    expect(isSpellVersionKey(document.versionKey)).toBe(true);
  });

  it('refuses a page whose descriptor and tag list disagree on category', () => {
    const result = parse(CATEGORY_DISAGREEMENT);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('general');
    expect(result.ok === false && result.reason).toContain('origin');
  });

  it.each([
    ['a prose descriptor', PROSE_DESCRIPTOR, 'descriptor'],
    ['no content region', NO_CONTENT_DIV, 'page-content'],
    ['no Source: line', NO_SOURCE_LINE, 'Source'],
    [
      'an unreadable Ability Score Increase paragraph',
      UNREADABLE_ABILITY_INCREASE,
      'Ability Score Increase',
    ],
  ])('refuses %s rather than defaulting the missing fields', (_label, html, needle) => {
    const result = parse(html);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(needle);
  });
});
