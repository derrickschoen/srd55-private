import { describe, expect, it } from 'vitest';
import { parseSpellPage } from '../../../tools/scrape/parse-spell';
import { parseCatalogDocuments } from '../../../src/catalog/catalog-schema';
import { isSpellVersionKey } from '../../../src/catalog/catalog-key';
import {
  inNamespace,
  pageName,
  parseSitemap,
} from '../../../tools/scrape/sitemap';
import {
  CONTRADICTORY,
  FUSED_DESCRIPTOR_AND_DEFINITION,
  GRAVEL_MERCY,
  LANTERNFALL,
  LEDGER_OF_SMALL_DEBTS,
  NO_CONTENT_DIV,
  NO_DEFINITION_BLOCK,
  PROSE_DESCRIPTOR,
  SYNTHETIC_SITEMAP,
  THREADCALL,
} from '../../fixtures/scrape/synthetic-pages';

function parse(html: string, slug = 'spell:test') {
  return parseSpellPage(html, { edition: '2024', slug });
}

function expectOk(html: string, slug = 'spell:test') {
  const result = parse(html, slug);
  if (!result.ok) {
    throw new Error(`expected a parse, got: ${result.reason}`);
  }
  return result.value;
}

describe('spell page parser', () => {
  it('reads a levelled spell into the existing catalog record shape', () => {
    const { record, description } = expectOk(LANTERNFALL, 'spell:lanternfall');

    expect(record).toEqual({
      identityKey: 'scraped-lanternfall',
      versionKey: '2024:scraped.wikidot:lanternfall',
      name: 'Lanternfall',
      edition: '2024',
      level: 2,
      school: 'Evocation',
      castingTime: 'Action',
      range: '90 feet',
      components: 'V, S, M (a shard of cooled lamp glass)',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      attackModes: [],
      saveAbilities: [],
      effectReliabilityCategory: 'fixed_effect',
      spellLists: ['Bard', 'Wizard'],
      sourceBooks: ["Wandering Tinker's Companion"],
      sourcePage: null,
      sourceSlug: 'spell:lanternfall',
      tags: [],
      healing: false,
      // ABSENT, NOT EMPTY-BECAUSE-THE-PAGE-SAID-SO. The scraper reads neither
      // ladder out of prose (see `tools/scrape/parse-spell.ts`), so every
      // scraped record carries the same four values whatever the page printed.
      // Asserted here rather than left off the `toEqual` so that a future
      // parser that DID start inferring one could not do it silently.
      upcastLevels: [],
      upcastSummary: null,
      cantripUpgradeLevels: [],
      cantripUpgradeSummary: null,
    });
    // Body text is Tier 2 and never rides along in the Tier 1 record.
    expect(description).toContain('A hanging lantern of pale light');
    expect(JSON.stringify(record)).not.toContain('hanging lantern');
  });

  it('reads a cantrip through the other descriptor shape', () => {
    const { record } = expectOk(THREADCALL, 'spell:threadcall');
    expect(record.level).toBe(0);
    expect(record.school).toBe('Divination');
    expect(record.spellLists).toEqual(['Bard', 'Druid']);
    // "Concentration, up to 1 minute" on a cantrip is still concentration.
    expect(record.concentration).toBe(true);
    expect(record.ritual).toBe(false);
  });

  it('reads ritual and concentration from the printed words, not the importer regex', () => {
    const { record } = expectOk(LEDGER_OF_SMALL_DEBTS, 'spell:ledger');
    expect(record.ritual).toBe(true);
    expect(record.concentration).toBe(true);

    // The importer's implicit-ritual tag regex matches the ABBREVIATION "R",
    // never the word the pages actually print. If the parser had leaned on that
    // inference instead of reading the line, every ritual would silently be
    // false. This asserts the page really does say the word.
    expect(record.castingTime).toMatch(/\bRitual\b/u);
    expect(/(?:^|\s)(?:or\s+)?R(?:$|\s)/iu.test(record.castingTime ?? '')).toBe(
      false,
    );
  });

  it('emits records the app’s own parser and key grammar accept', () => {
    const records = [LANTERNFALL, THREADCALL, LEDGER_OF_SMALL_DEBTS].map(
      (page) => expectOk(page).record,
    );
    // The real importer parser, not a copy of it.
    // Three SPELLS and no subclasses: the scraper emits legacy-shaped records
    // with no `kind` field, which the parser still reads as spells.
    const parsed = parseCatalogDocuments([JSON.stringify(records)]);
    expect(parsed.spells).toHaveLength(3);
    expect(parsed.subclasses).toEqual([]);
    // The importer never checks key grammar; the share/export path does, and
    // throws. A key that imports and then breaks sharing is the failure this
    // assertion exists to prevent.
    for (const record of records) {
      expect(isSpellVersionKey(record.versionKey)).toBe(true);
    }
  });

  it('mints NAMESPACED keys, so an imported scraped row is not mistaken for bundled content', () => {
    // The `_provenance` stamp is inert on purpose — the catalog parser drops it
    // — so it is not what marks a scraped row once it is in the database. The
    // version key is. Minting the two-part OFFICIAL grammar (`2024:lanternfall`)
    // would make scraped rules text indistinguishable from content this project
    // legitimately bundles, in the DB, in a backup export, and in a share link's
    // content_key. The three-part form says where it came from and carries no
    // rules text doing it.
    const records = [LANTERNFALL, THREADCALL, LEDGER_OF_SMALL_DEBTS].map(
      (page) => expectOk(page).record,
    );
    for (const record of records) {
      const parts = record.versionKey.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[1]).toBe('scraped.wikidot');
      expect(record.identityKey.startsWith('scraped-')).toBe(true);
    }
    // Distinct spells must still get distinct keys — a namespace that collapsed
    // identities would be worse than the official grammar, not better.
    expect(new Set(records.map((record) => record.versionKey)).size).toBe(3);
  });

  it('reads a descriptor that shares its paragraph with the definition block', () => {
    // Both of the assertions below correspond to bugs a live run found. The
    // fixture is hand-written to the same SHAPE; nothing scraped is committed.
    const { record } = expectOk(
      FUSED_DESCRIPTOR_AND_DEFINITION,
      'spell:tinkers-understudy',
    );
    expect(record.level).toBe(2);
    expect(record.school).toBe('Conjuration');
    expect(record.spellLists).toEqual(['Bard']);
    expect(record.castingTime).toBe('1 hour or Ritual');
    expect(record.ritual).toBe(true);
    expect(record.range).toBe('10 feet');
  });

  it('splits adjacent tag anchors instead of fusing them into one word', () => {
    // `<a>bard</a><a>conjuration</a>` with no whitespace between them. Stripping
    // tags to nothing yields "bardconjuration", and the cross-check then reports
    // a disagreement that does not exist — which is exactly what happened.
    expect(
      expectOk(FUSED_DESCRIPTOR_AND_DEFINITION).record.school,
    ).toBe('Conjuration');
    expect(expectOk(LANTERNFALL).record.spellLists).toEqual(['Bard', 'Wizard']);
  });

  it('refuses a page whose descriptor and tag list disagree', () => {
    const result = parse(CONTRADICTORY);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('Necromancy');
    expect(result.ok === false && result.reason).toContain('illusion');
  });

  it.each([
    ['no definition block', NO_DEFINITION_BLOCK, 'Casting Time'],
    ['a prose descriptor', PROSE_DESCRIPTOR, 'descriptor line'],
    ['no content region', NO_CONTENT_DIV, 'page-content'],
  ])('refuses %s rather than defaulting the missing fields', (_label, html, needle) => {
    const result = parse(html);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain(needle);
  });

  it('distinguishes spell lists well enough to filter on them', () => {
    expect(expectOk(GRAVEL_MERCY).record.spellLists).toEqual(['Cleric']);
    expect(expectOk(LANTERNFALL).record.spellLists).toContain('Bard');
  });
});

describe('sitemap frontier', () => {
  it('reads locations and their lastmod, tolerating entries without one', () => {
    const entries = parseSitemap(SYNTHETIC_SITEMAP);
    expect(entries).toHaveLength(5);
    expect(entries[0]).toEqual({
      url: 'http://example.invalid/spell:lanternfall',
      lastmod: '2026-07-21T02:42:05+00:00',
    });
    expect(
      entries.find((entry) => entry.url.includes('college-of-the-long-road'))
        ?.lastmod,
    ).toBe(null);
  });

  it('narrows the frontier by namespace', () => {
    const spells = inNamespace(parseSitemap(SYNTHETIC_SITEMAP), 'spell');
    expect(spells.map((entry) => pageName(entry.url))).toEqual([
      'spell:lanternfall',
      'spell:threadcall',
      'spell:ledger-of-small-debts',
    ]);
  });
});
