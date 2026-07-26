/**
 * The on-disk page cache, keyed by URL.
 *
 * This exists because HTTP caching against the target is UNUSABLE, which was
 * measured rather than assumed: the server sends `cache-control: no-store` and a
 * fresh `ETag` on every response (a per-request session token is embedded in the
 * body), so a conditional GET can never produce a 304. Politeness therefore has
 * to come from our own store. With a warm cache a re-run issues at most one
 * request — the sitemap — and with `--offline`, none.
 *
 * Both files a cache entry writes carry the sentinel in their names, so the
 * tracked-file guard catches a cache directory that was committed by accident
 * even after someone moved it out of `scraped/`.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stampScrapedFilename } from './provenance';

export interface CacheEntryMeta {
  readonly url: string;
  /** ISO-8601. */
  readonly fetchedAt: string;
  /** The `<lastmod>` the sitemap carried when this was fetched, if any. */
  readonly sitemapLastmod: string | null;
  readonly sha256: string;
  readonly bytes: number;
  readonly status: number;
}

export interface CacheEntry {
  readonly body: string;
  readonly meta: CacheEntryMeta;
}

/** Stable per-URL filename stem. Hashing keeps every OS path rule satisfied. */
export function cacheKey(url: string): string {
  return createHash('sha256').update(url, 'utf8').digest('hex');
}

export class PageCache {
  readonly #now: () => number;

  /**
   * `now` is injected for the same reason the fetcher's clock is: freshness is
   * a comparison between the timestamp written HERE and the time read THERE, and
   * if the two come from different sources the comparison is not testable and,
   * worse, not obviously correct. Defaulting to `Date.now` keeps production
   * behaviour identical.
   */
  constructor(
    private readonly directory: string,
    now: () => number = () => Date.now(),
  ) {
    this.#now = now;
  }

  #bodyPath(url: string): string {
    return join(this.directory, stampScrapedFilename(`${cacheKey(url)}.html`));
  }

  #metaPath(url: string): string {
    return join(
      this.directory,
      stampScrapedFilename(`${cacheKey(url)}.meta.json`),
    );
  }

  async read(url: string): Promise<CacheEntry | null> {
    let body: string;
    let rawMeta: string;
    try {
      [body, rawMeta] = await Promise.all([
        readFile(this.#bodyPath(url), 'utf8'),
        readFile(this.#metaPath(url), 'utf8'),
      ]);
    } catch {
      return null;
    }
    const meta = JSON.parse(rawMeta) as CacheEntryMeta;
    // A body that no longer hashes to what the meta recorded is a half-written
    // entry from an interrupted run. Treat it as a miss rather than parsing it:
    // a truncated page parses into a plausible, wrong record.
    const actual = createHash('sha256').update(body, 'utf8').digest('hex');
    if (actual !== meta.sha256) {
      return null;
    }
    return { body, meta };
  }

  async write(
    url: string,
    body: string,
    extra: { sitemapLastmod: string | null; status: number },
  ): Promise<CacheEntryMeta> {
    await mkdir(this.directory, { recursive: true });
    const meta: CacheEntryMeta = {
      url,
      fetchedAt: new Date(this.#now()).toISOString(),
      sitemapLastmod: extra.sitemapLastmod,
      sha256: createHash('sha256').update(body, 'utf8').digest('hex'),
      bytes: Buffer.byteLength(body, 'utf8'),
      status: extra.status,
    };
    await writeFile(this.#bodyPath(url), body, 'utf8');
    await writeFile(
      this.#metaPath(url),
      `${JSON.stringify(meta, null, 2)}\n`,
      'utf8',
    );
    return meta;
  }
}

export interface FreshnessInput {
  readonly meta: CacheEntryMeta;
  readonly sitemapLastmod: string | null;
  readonly maxAgeMs: number;
  readonly now: number;
}

/**
 * Whether a cached entry may be reused.
 *
 * The sitemap's per-URL `<lastmod>` is the only real invalidation signal the
 * target publishes, so a changed `<lastmod>` always forces a refetch; `maxAgeMs`
 * is the backstop for pages the sitemap does not date.
 */
export function isFresh(input: FreshnessInput): boolean {
  const { meta, sitemapLastmod, maxAgeMs, now } = input;
  if (sitemapLastmod !== null && meta.sitemapLastmod !== sitemapLastmod) {
    return false;
  }
  const fetchedAt = Date.parse(meta.fetchedAt);
  if (!Number.isFinite(fetchedAt)) {
    return false;
  }
  return now - fetchedAt < maxAgeMs;
}
