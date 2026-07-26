import { describe, expect, it } from 'vitest';
import {
  importedContentKeyOwner,
  isImportedContentKey,
  isSpellVersionKey,
} from '../../../src/catalog/catalog-key';

/**
 * THE IMPORTED-KEY GRAMMAR, AND THE KEYS IT MUST REFUSE.
 *
 * `isSpellVersionKey` answers "could the share path carry this?". This answers a
 * different question — "did an import mint this, or did the seeder?" — and it is
 * the only mechanism there is for the class catalog, which has no `provenance`
 * column anywhere. Every bundled key this repository mints is listed below by
 * hand, from the three places that mint them, rather than imported from the code
 * under test.
 */
describe('the imported content key grammar', () => {
  it('refuses every key shape the seeder mints, by shape and not by list', () => {
    // `classContentKey`, the two subclass constants, and
    // `parseSrdNamedExtraAttackFeatures` — all in `src/rules/`. Every one puts a
    // RECORD-KIND LITERAL in the middle, and a literal has no dot in it.
    for (const bundled of [
      '2024:class:bard',
      '2024:class:fighter',
      '2024:subclass:eldritch-knight',
      '2024:subclass:arcane-trickster',
      '2024:feature:thirsting-blade',
      '2024:feature:devouring-blade',
    ]) {
      expect(importedContentKeyOwner(bundled), bundled).toBeNull();
      expect(isImportedContentKey(bundled), bundled).toBe(false);
    }
  });

  it('accepts the three-part owner-namespaced form and returns the owner', () => {
    expect(
      importedContentKeyOwner('2024:longroad.homebrew:college-of-the-long-road'),
    ).toBe('longroad.homebrew');
    // The scraper's own stamp, which is the one provenance mark designed to
    // survive into a database, a backup and a share link.
    expect(
      importedContentKeyOwner('2024:scraped.wikidot:homunculus-servant'),
    ).toBe('scraped.wikidot');
    // Deeper namespaces are fine; the rule is "at least one dot".
    expect(importedContentKeyOwner('expanded:com.example.brews:iron-hymn')).toBe(
      'com.example.brews',
    );
  });

  it('refuses the two-part OFFICIAL spell form, which names no owner', () => {
    // A valid spell key, and deliberately not an imported one: it cannot answer
    // "whose import was this?", so it cannot carry provenance.
    expect(isSpellVersionKey('2024:true-strike')).toBe(true);
    expect(isImportedContentKey('2024:true-strike')).toBe(false);
  });

  it('refuses malformed keys rather than guessing at them', () => {
    for (const bad of [
      // The D19-era fixture's own key: two parts with the dot in the FIRST.
      'longroad.homebrew:college-of-the-long-road',
      '2024:longroad.homebrew:college-of-the-long-road:extra',
      '2024:longroad.homebrew:',
      '2024::iron-hymn',
      '2024:Longroad.Homebrew:iron-hymn',
      '2024:longroad..homebrew:iron-hymn',
      '2024:longroad.homebrew:iron hymn',
      '',
    ]) {
      expect(importedContentKeyOwner(bad), bad).toBeNull();
    }
  });
});
