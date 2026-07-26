import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCatalogDocuments,
  BuildRefused,
  type BuiltPage,
} from '../../../tools/scrape/build-catalog';
import { CrawlQueue, type QueueItem } from '../../../tools/scrape/queue';
import { parseSpellPage } from '../../../tools/scrape/parse-spell';
import {
  parseCatalogDocuments,
  parseDescriptionDocuments,
} from '../../../src/catalog/catalog-schema';
import { normalizeCatalogRecords } from '../../../src/catalog/catalog-normalize';
import {
  SCRAPE_SENTINEL,
  isScrapedFilename,
  stampScrapedFilename,
} from '../../../tools/scrape/provenance';
import { scrapeLayout } from '../../../tools/scrape/layout';
import {
  LANTERNFALL,
  LEDGER_OF_SMALL_DEBTS,
  THREADCALL,
} from '../../fixtures/scrape/synthetic-pages';

function page(html: string, url: string): BuiltPage {
  const parsed = parseSpellPage(html, { edition: '2024', slug: 'spell:x' });
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }
  return { url, record: parsed.value.record, description: parsed.value.description };
}

function item(url: string, state: QueueItem['state']): QueueItem {
  return { url, lastmod: null, state, reason: state === 'done' ? null : 'why' };
}

const PAGES = [
  page(LANTERNFALL, 'http://example.invalid/spell:lanternfall'),
  page(THREADCALL, 'http://example.invalid/spell:threadcall'),
  page(LEDGER_OF_SMALL_DEBTS, 'http://example.invalid/spell:ledger'),
];
const DONE = PAGES.map((built) => item(built.url, 'done'));

describe('building the catalog documents', () => {
  it('emits Tier 1 and Tier 2 that the app’s own parsers accept together', () => {
    const output = buildCatalogDocuments({
      pages: PAGES,
      queue: DONE,
      parseFailures: [],
      allowPartial: false,
      now: () => '2026-07-26T00:00:00.000Z',
    });

    const records = parseCatalogDocuments([output.tier1]);
    const descriptions = parseDescriptionDocuments([output.tier2]);
    expect(records).toHaveLength(3);
    expect(descriptions).toHaveLength(3);

    // The normaliser throws unless the two key sets match EXACTLY in both
    // directions. Deriving Tier 2 from the same list is what makes that hold.
    expect(() => normalizeCatalogRecords(records, descriptions)).not.toThrow();
    expect(output.report).toMatchObject({
      provenance: SCRAPE_SENTINEL,
      recordCount: 3,
      partial: false,
    });
  });

  it('stamps every record, and the stamp is inert by the time it is parsed', () => {
    const output = buildCatalogDocuments({
      pages: PAGES,
      queue: DONE,
      parseFailures: [],
      allowPartial: false,
    });

    // On disk: greppable, so a RENAMED file is still caught by the contents
    // clause of the tracked-file guard. The filename alone would not be.
    expect(
      (JSON.parse(output.tier1) as { _provenance?: string }[]).every(
        (record) => record._provenance === SCRAPE_SENTINEL,
      ),
    ).toBe(true);
    expect(
      (JSON.parse(output.tier2) as { _provenance?: string }[]).every(
        (record) => record._provenance === SCRAPE_SENTINEL,
      ),
    ).toBe(true);

    // After parsing: gone. `catalogRecord` builds from named fields and drops
    // the rest, so the stamp cannot reach the database, an export or a share
    // link. If that ever changed, the stamp would become the leak it guards
    // against — hence the assertion, and hence the same check inside the build.
    const records = parseCatalogDocuments([output.tier1]);
    expect(JSON.stringify(records)).not.toContain(SCRAPE_SENTINEL);
    const descriptions = parseDescriptionDocuments([output.tier2]);
    expect(JSON.stringify(descriptions)).not.toContain(SCRAPE_SENTINEL);
    expect(() => normalizeCatalogRecords(records, descriptions)).not.toThrow();
  });

  it('keeps rules text out of Tier 1 entirely', () => {
    const output = buildCatalogDocuments({
      pages: PAGES,
      queue: DONE,
      parseFailures: [],
      allowPartial: false,
    });
    // Tier 1 is metadata; the body text lives only in Tier 2, which the UI
    // cannot even supply today. Keeping them apart is what lets a user import
    // the structure without the prose.
    expect(output.tier1).not.toContain('hanging lantern');
    expect(output.tier2).toContain('hanging lantern');
  });

  it('REFUSES to emit a partial catalog, because import is a full replacement', () => {
    // CatalogImporter deactivates every previously imported version absent from
    // the import. A quietly partial file would tombstone the user's other spells
    // and invalidate the slots pointing at them.
    expect(() =>
      buildCatalogDocuments({
        pages: PAGES,
        queue: [...DONE, item('http://example.invalid/spell:missed', 'failed')],
        parseFailures: [],
        allowPartial: false,
      }),
    ).toThrow(BuildRefused);

    try {
      buildCatalogDocuments({
        pages: PAGES,
        queue: [...DONE, item('http://example.invalid/spell:missed', 'failed')],
        parseFailures: [],
        allowPartial: false,
      });
    } catch (error) {
      // It must name what it found, not merely refuse.
      expect((error as Error).message).toContain('spell:missed');
      expect((error as Error).message).toContain('FULL REPLACEMENT');
    }
  });

  it('refuses on parse failures too, and names them', () => {
    expect(() =>
      buildCatalogDocuments({
        pages: PAGES,
        queue: DONE,
        parseFailures: [
          { url: 'http://example.invalid/spell:odd', reason: 'no "Source:" line' },
        ],
        allowPartial: false,
      }),
    ).toThrow(/spell:odd.*no "Source:" line/su);
  });

  it('marks an --allow-partial build as partial in the report rather than hiding it', () => {
    const output = buildCatalogDocuments({
      pages: PAGES,
      queue: [
        ...DONE,
        item('http://example.invalid/magic-item:thimble', 'robots-skipped'),
      ],
      parseFailures: [],
      allowPartial: true,
    });
    expect(output.report.partial).toBe(true);
    expect(output.report.unfinished).toEqual([
      {
        url: 'http://example.invalid/magic-item:thimble',
        state: 'robots-skipped',
        reason: 'why',
      },
    ]);
    expect(output.report.robotsSkips).toEqual([
      { url: 'http://example.invalid/magic-item:thimble', reason: 'why' },
    ]);
  });

  it('treats a --list-narrowed build as PARTIAL, because the crawl finishing is not the question', () => {
    // The gate used to ask only "did the crawl finish?", which let `--list`
    // walk straight around it: against the real 40-page cache,
    // `build --namespace spell --list bard` emitted 8 records with
    // `partial: false` and no warning. The importer does not know or care WHY a
    // key is absent — a filtered-out spell and a never-fetched spell are the
    // same missing key, and both get deactivated.
    const narrowed = {
      pages: PAGES,
      queue: DONE,
      parseFailures: [],
      filtered: { list: 'bard', dropped: 32 },
    };

    expect(() =>
      buildCatalogDocuments({ ...narrowed, allowPartial: false }),
    ).toThrow(BuildRefused);
    expect(() =>
      buildCatalogDocuments({ ...narrowed, allowPartial: false }),
    ).toThrow(/dropped 32 parsed page\(s\)/);

    const output = buildCatalogDocuments({ ...narrowed, allowPartial: true });
    expect(output.report.partial).toBe(true);
    expect(output.report.filtered).toEqual({ list: 'bard', dropped: 32 });
    // The crawl really did finish — so `unfinished` must stay empty. This is
    // what proves partiality is coming from the FILTER and not from a queue
    // entry the fixture happened to leave open.
    expect(output.report.unfinished).toEqual([]);
  });

  it('does not call a --list build partial when the filter dropped nothing', () => {
    // Negative control for the rule above: `--list` on a list that matches
    // everything narrows nothing, so it must not be smeared as partial. Without
    // this, "any --list is partial" would pass the test above while being wrong.
    const output = buildCatalogDocuments({
      pages: PAGES,
      queue: DONE,
      parseFailures: [],
      allowPartial: false,
      filtered: { list: 'bard', dropped: 0 },
    });
    expect(output.report.partial).toBe(false);
    expect(output.report.filtered).toBeNull();
  });

  it('rejects a key that would import cleanly and break sharing later', () => {
    const bad: BuiltPage = {
      ...(PAGES[0] as BuiltPage),
      record: { ...(PAGES[0] as BuiltPage).record, versionKey: '2024:Bad Key!' },
    };
    expect(() =>
      buildCatalogDocuments({
        pages: [bad],
        queue: [item(bad.url, 'done')],
        parseFailures: [],
        allowPartial: false,
      }),
    ).toThrow(/spell-key grammar/u);
  });

  it('rejects two pages that collapse onto one version key', () => {
    const duplicate: BuiltPage = {
      ...(PAGES[0] as BuiltPage),
      url: 'http://example.invalid/spell:lanternfall-copy',
    };
    expect(() =>
      buildCatalogDocuments({
        pages: [PAGES[0] as BuiltPage, duplicate],
        queue: [item((PAGES[0] as BuiltPage).url, 'done'), item(duplicate.url, 'done')],
        parseFailures: [],
        allowPartial: false,
      }),
    ).toThrow(/two pages produced versionKey/u);
  });
});

describe('the resumable queue', () => {
  it('round-trips, resumes only unfinished work, and stamps its own file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'scrape-queue-'));
    const path = join(directory, stampScrapedFilename('queue.json'));

    const first = new CrawlQueue(path);
    expect(await first.load()).toBe(false);
    first.seed([
      { url: 'http://example.invalid/spell:a', lastmod: '2026-01-01' },
      { url: 'http://example.invalid/spell:b', lastmod: '2026-01-01' },
      { url: 'http://example.invalid/spell:c', lastmod: null },
    ]);
    first.mark('http://example.invalid/spell:a', 'done');
    first.mark('http://example.invalid/spell:b', 'failed', 'HTTP 500');
    await first.save();

    const raw = await readFile(path, 'utf8');
    expect(JSON.parse(raw).provenance).toBe(SCRAPE_SENTINEL);
    expect(isScrapedFilename(path)).toBe(true);

    const resumed = new CrawlQueue(path);
    expect(await resumed.load()).toBe(true);
    expect(resumed.counts()).toEqual({
      pending: 1,
      done: 1,
      failed: 1,
      'robots-skipped': 0,
    });
    // A failed entry is retried on reseed; a done one is left alone.
    resumed.seed([
      { url: 'http://example.invalid/spell:a', lastmod: '2026-01-01' },
      { url: 'http://example.invalid/spell:b', lastmod: '2026-01-01' },
      { url: 'http://example.invalid/spell:c', lastmod: null },
    ]);
    expect(resumed.pending().map((entry) => entry.url)).toEqual([
      'http://example.invalid/spell:b',
      'http://example.invalid/spell:c',
    ]);

    // A moved lastmod puts a finished page back in the queue — the only
    // invalidation signal the target publishes.
    resumed.seed([{ url: 'http://example.invalid/spell:a', lastmod: '2026-06-06' }]);
    expect(resumed.pending().map((entry) => entry.url)).toContain(
      'http://example.invalid/spell:a',
    );
  });
});

describe('the output layout', () => {
  it('puts every file under the gitignored root with the sentinel in its name', () => {
    const layout = scrapeLayout('/somewhere/scraped', 'spell');
    for (const path of [
      layout.queuePath,
      layout.tier1Path,
      layout.tier2Path,
      layout.reportPath,
    ]) {
      expect(path.startsWith('/somewhere/scraped')).toBe(true);
      expect(isScrapedFilename(path)).toBe(true);
    }
    // The stamp goes before the extension, so tooling still recognises the file.
    expect(stampScrapedFilename('spells.json')).toBe(
      `spells.${SCRAPE_SENTINEL}.json`,
    );
    expect(stampScrapedFilename('README')).toBe(`README.${SCRAPE_SENTINEL}`);
  });
});
