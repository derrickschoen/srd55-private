import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheKey, isFresh, PageCache } from '../../../tools/scrape/cache';
import {
  BACKOFF_MS,
  MIN_DELAY_MS,
  PoliteFetcher,
  PRODUCT_TOKEN,
  RateLimitAbort,
  SITEMAP_MAX_AGE_MS,
  USER_AGENT,
  type Clock,
  type HttpResponse,
  type Transport,
} from '../../../tools/scrape/fetcher';
import { SCRAPE_SENTINEL } from '../../../tools/scrape/provenance';

const ORIGIN = 'http://example.invalid';

/**
 * A clock whose `sleep` advances virtual time instead of waiting. The whole
 * backoff ladder is 65 seconds of real time; asserting it deterministically in
 * milliseconds is only possible because the fetcher takes its clock as an input.
 */
function fakeClock(): Clock & { readonly slept: number[]; time: number } {
  const state = {
    time: 1_000_000,
    slept: [] as number[],
    now: () => state.time,
    sleep: async (ms: number) => {
      state.slept.push(ms);
      state.time += ms;
    },
  };
  return state;
}

interface Recorded {
  readonly url: string;
  readonly at: number;
  readonly headers: Record<string, string>;
}

function scriptedTransport(
  clock: { now: () => number },
  script: (url: string, call: number) => HttpResponse | Error,
): Transport & { readonly calls: Recorded[] } {
  const calls: Recorded[] = [];
  const transport = async (
    url: string,
    headers: Record<string, string>,
  ): Promise<HttpResponse> => {
    calls.push({ url, at: clock.now(), headers });
    const outcome = script(url, calls.filter((call) => call.url === url).length);
    if (outcome instanceof Error) {
      throw outcome;
    }
    return outcome;
  };
  return Object.assign(transport, { calls });
}

async function tempCacheDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'scrape-cache-'));
}

const ROBOTS_ALLOW_ALL = 'User-agent: voltron\nDisallow: /\n';

describe('the polite fetcher', () => {
  it('sends the identifiable user-agent and never fetches faster than the floor', async () => {
    const clock = fakeClock();
    const transport = scriptedTransport(clock, () => ({
      status: 200,
      body: 'ok',
    }));
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      // Asking for 10ms must NOT produce a 10ms crawl. There is no spelling of
      // the flag that gets below the floor, because the clamp is in the code.
      delayMs: 10,
      // WORST-CASE JITTER, not the neutral value. This used to pin 0.5, which
      // for the old symmetric `(random() * 2 - 1) * 250` was precisely the one
      // input where jitter cancelled to zero — so the test named "never fetches
      // faster than the floor" structurally could not observe jitter dropping
      // the gap to 750ms. Pinning the extreme is what makes the assertion below
      // load-bearing.
      random: () => 0,
    });
    expect(fetcher.delayMs).toBe(MIN_DELAY_MS);

    await fetcher.loadRobots(ORIGIN);
    await fetcher.fetchPage(`${ORIGIN}/a`);
    await fetcher.fetchPage(`${ORIGIN}/b`);
    await fetcher.fetchPage(`${ORIGIN}/c`);

    expect(transport.calls).toHaveLength(4); // robots + three pages
    for (const call of transport.calls) {
      expect(call.headers['user-agent']).toBe(USER_AGENT);
      // Identifiable and contactable, and NOT the one agent the target bans.
      expect(call.headers['user-agent']).toContain('http');
      expect(call.headers['user-agent']).not.toContain('voltron');
    }
    const gaps = transport.calls
      .slice(1)
      .map((call, index) => call.at - (transport.calls[index] as Recorded).at);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(MIN_DELAY_MS);
    }
  });

  it('raises its own delay to whatever robots.txt asks for', async () => {
    const clock = fakeClock();
    const transport = scriptedTransport(clock, () => ({
      status: 200,
      body: `User-agent: *\nCrawl-delay: 9\n`,
    }));
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      delayMs: 1500,
    });
    await fetcher.loadRobots(ORIGIN);
    expect(fetcher.delayMs).toBe(9000);
  });

  it('honours a robots.txt Crawl-delay as a FLOOR, even at worst-case jitter', async () => {
    // The delay the fetcher reports and the delay it actually waits are two
    // different numbers, and only the second one is politeness. `delayMs` said
    // 1000 while jitter made real gaps 750 — a quarter faster than a
    // `Crawl-delay: 1` the target had explicitly asked for. Asserting the
    // REPORTED delay (as the test above does) cannot catch that; this asserts
    // the observed wall-clock gaps between transport calls.
    const clock = fakeClock();
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? { status: 200, body: 'User-agent: *\nCrawl-delay: 1\n' }
        : { status: 200, body: 'page' },
    );
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      delayMs: MIN_DELAY_MS,
      random: () => 0,
    });
    await fetcher.loadRobots(ORIGIN);
    expect(fetcher.delayMs).toBe(MIN_DELAY_MS);

    await fetcher.fetchPage(`${ORIGIN}/a`);
    await fetcher.fetchPage(`${ORIGIN}/b`);
    await fetcher.fetchPage(`${ORIGIN}/c`);

    const gaps = transport.calls
      .slice(1)
      .map((call, index) => call.at - (transport.calls[index] as Recorded).at);
    expect(gaps).toHaveLength(3);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(1000);
    }
  });

  it('still spreads requests rather than fetching on a fixed metronome', async () => {
    // The one-sided clamp must not be implemented by deleting jitter outright:
    // a perfectly periodic crawler is the behaviour jitter exists to avoid. At
    // the top of the random range the gap must exceed the floor.
    const clock = fakeClock();
    const transport = scriptedTransport(clock, () => ({
      status: 200,
      body: ROBOTS_ALLOW_ALL,
    }));
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      delayMs: MIN_DELAY_MS,
      random: () => 1,
    });
    await fetcher.loadRobots(ORIGIN);
    await fetcher.fetchPage(`${ORIGIN}/a`);
    await fetcher.fetchPage(`${ORIGIN}/b`);

    const gaps = transport.calls
      .slice(1)
      .map((call, index) => call.at - (transport.calls[index] as Recorded).at);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThan(MIN_DELAY_MS);
    }
  });

  it('SKIPS a disallowed path, says so, and offers no way to override it', async () => {
    const clock = fakeClock();
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? {
            status: 200,
            body: `User-agent: ${PRODUCT_TOKEN}\nDisallow: /magic-item:\n`,
          }
        : { status: 200, body: 'page' },
    );
    const logged: string[] = [];
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      log: (line) => logged.push(line),
    });
    await fetcher.loadRobots(ORIGIN);

    const skipped = await fetcher.fetchPage(`${ORIGIN}/magic-item:thimble`);
    expect(skipped.kind).toBe('robots-skipped');
    expect(skipped.kind === 'robots-skipped' && skipped.reason).toContain(
      'Disallow: /magic-item:',
    );
    expect(fetcher.robotsSkips).toEqual([
      {
        url: `${ORIGIN}/magic-item:thimble`,
        reason: expect.stringContaining('Disallow: /magic-item:') as unknown as string,
      },
    ]);
    expect(logged.some((line) => line.includes('SKIP (robots.txt)'))).toBe(true);

    // No request was made for the skipped URL, and an allowed one still works.
    expect(transport.calls.map((call) => call.url)).toEqual([
      `${ORIGIN}/robots.txt`,
    ]);
    expect((await fetcher.fetchPage(`${ORIGIN}/spell:fine`)).kind).toBe('fetched');

    // The public surface has no escape hatch. This is the assertion that would
    // fail the day someone adds one.
    const surface = Object.getOwnPropertyNames(PoliteFetcher.prototype);
    expect(surface.join(' ')).not.toMatch(/ignore|force|override|bypass/iu);
  });

  it('refuses to fetch a page before robots.txt has been read', async () => {
    const clock = fakeClock();
    const fetcher = new PoliteFetcher({
      transport: scriptedTransport(clock, () => ({ status: 200, body: '' })),
      cache: new PageCache(await tempCacheDir()),
      clock,
    });
    await expect(fetcher.fetchPage(`${ORIGIN}/x`)).rejects.toThrow(
      /robots\.txt is not optional/u,
    );
  });

  it('treats an unreachable robots.txt as a full disallow', async () => {
    const clock = fakeClock();
    const fetcher = new PoliteFetcher({
      transport: scriptedTransport(clock, () => ({ status: 503, body: '' })),
      cache: new PageCache(await tempCacheDir()),
      clock,
    });
    // RFC 9309 §2.3.1.4. Guessing in our own favour here is exactly the kind of
    // convenience that makes a scraper unwelcome.
    await expect(fetcher.loadRobots(ORIGIN)).rejects.toThrow(/full disallow/u);
  });

  it('treats a missing robots.txt as unrestricted', async () => {
    const clock = fakeClock();
    const fetcher = new PoliteFetcher({
      transport: scriptedTransport(clock, (url) =>
        url.endsWith('/robots.txt')
          ? { status: 404, body: 'Not Found' }
          : { status: 200, body: 'page' },
      ),
      cache: new PageCache(await tempCacheDir()),
      clock,
    });
    const robots = await fetcher.loadRobots(ORIGIN);
    expect(robots.groups).toEqual([]);
    expect((await fetcher.fetchPage(`${ORIGIN}/spell:x`)).kind).toBe('fetched');
  });

  it('backs off on 5xx, then gives up and reports rather than hammering', async () => {
    const clock = fakeClock();
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? { status: 200, body: ROBOTS_ALLOW_ALL }
        : { status: 500, body: 'boom' },
    );
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      random: () => 0.5,
    });
    await fetcher.loadRobots(ORIGIN);
    clock.slept.length = 0;

    const outcome = await fetcher.fetchPage(`${ORIGIN}/spell:x`);
    expect(outcome).toEqual({
      kind: 'failed',
      reason: `all attempts failed: ${ORIGIN}/spell:x`,
    });
    // Four attempts total, three waits, on the stated ladder — not an unbounded
    // retry loop and not an instant one.
    expect(
      transport.calls.filter((call) => call.url.endsWith('/spell:x')),
    ).toHaveLength(BACKOFF_MS.length + 1);
    expect(clock.slept.filter((ms) => BACKOFF_MS.includes(ms))).toEqual([
      ...BACKOFF_MS,
    ]);
  });

  it('retries a transport error and succeeds on the second attempt', async () => {
    const clock = fakeClock();
    const transport = scriptedTransport(clock, (url, call) => {
      if (url.endsWith('/robots.txt')) {
        return { status: 200, body: ROBOTS_ALLOW_ALL };
      }
      return call === 1 ? new Error('ECONNRESET') : { status: 200, body: 'page' };
    });
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      random: () => 0.5,
    });
    await fetcher.loadRobots(ORIGIN);
    const outcome = await fetcher.fetchPage(`${ORIGIN}/spell:x`);
    expect(outcome.kind).toBe('fetched');
  });

  it('aborts the whole run on two consecutive 429s', async () => {
    const clock = fakeClock();
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? { status: 200, body: ROBOTS_ALLOW_ALL }
        : { status: 429, body: 'slow down' },
    );
    const fetcher = new PoliteFetcher({
      transport,
      cache: new PageCache(await tempCacheDir()),
      clock,
      random: () => 0.5,
    });
    await fetcher.loadRobots(ORIGIN);
    // Being told to slow down twice in a row is an operator decision, not
    // something to retry through.
    await expect(fetcher.fetchPage(`${ORIGIN}/spell:x`)).rejects.toBeInstanceOf(
      RateLimitAbort,
    );
  });
});

describe('the on-disk cache', () => {
  it('makes a re-run free, and stamps every file it writes', async () => {
    const clock = fakeClock();
    const directory = await tempCacheDir();
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? { status: 200, body: ROBOTS_ALLOW_ALL }
        : { status: 200, body: '<html>page</html>' },
    );
    const build = (): PoliteFetcher =>
      new PoliteFetcher({
        transport,
        cache: new PageCache(directory),
        clock,
        random: () => 0.5,
      });

    const first = build();
    await first.loadRobots(ORIGIN);
    expect((await first.fetchPage(`${ORIGIN}/spell:x`)).kind).toBe('fetched');
    const afterFirst = transport.calls.length;

    const second = build();
    await second.loadRobots(ORIGIN);
    const reread = await second.fetchPage(`${ORIGIN}/spell:x`);
    expect(reread).toEqual({ kind: 'cached', body: '<html>page</html>' });
    // Nothing crossed the wire the second time — robots.txt is cached by the
    // same path, within its own 24h TTL.
    expect(transport.calls.length).toBe(afterFirst);

    const written = await readdir(directory);
    expect(written.length).toBeGreaterThan(0);
    for (const name of written) {
      expect(name, `${name} does not carry the provenance sentinel`).toContain(
        SCRAPE_SENTINEL,
      );
    }
  });

  it('refetches when the sitemap lastmod moved, and honours --offline', async () => {
    const clock = fakeClock();
    const directory = await tempCacheDir();
    let body = 'v1';
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? { status: 200, body: ROBOTS_ALLOW_ALL }
        : { status: 200, body },
    );
    const online = new PoliteFetcher({
      transport,
      cache: new PageCache(directory),
      clock,
      random: () => 0.5,
    });
    await online.loadRobots(ORIGIN);
    await online.fetchPage(`${ORIGIN}/spell:x`, { sitemapLastmod: '2026-01-01' });

    body = 'v2';
    const changed = await online.fetchPage(`${ORIGIN}/spell:x`, {
      sitemapLastmod: '2026-02-02',
    });
    expect(changed).toMatchObject({ kind: 'fetched', body: 'v2' });

    // Offline serves the cache regardless of freshness and makes NO request at
    // all — robots.txt included, since it is cached by the same path.
    const offline = new PoliteFetcher({
      transport,
      cache: new PageCache(directory),
      clock,
      offline: true,
      random: () => 0.5,
    });
    const before = transport.calls.length;
    await offline.loadRobots(ORIGIN);
    expect(
      await offline.fetchPage(`${ORIGIN}/spell:x`, {
        sitemapLastmod: '2099-12-31',
      }),
    ).toEqual({ kind: 'cached', body: 'v2' });
    expect(await offline.fetchPage(`${ORIGIN}/spell:never-seen`)).toMatchObject({
      kind: 'failed',
    });
    expect(transport.calls.length).toBe(before);
  });

  it('refuses to run offline with no cached robots.txt to read under', async () => {
    const clock = fakeClock();
    const fetcher = new PoliteFetcher({
      transport: scriptedTransport(clock, () => ({ status: 200, body: '' })),
      cache: new PageCache(await tempCacheDir()),
      clock,
      offline: true,
    });
    // Serving cached pages with no permission decision at all would be the
    // convenient thing to do and the wrong one.
    await expect(fetcher.loadRobots(ORIGIN)).rejects.toThrow(
      /not in the cache/u,
    );
  });

  it('lets a caller shorten the TTL, which is how the sitemap stays fresh', async () => {
    const clock = fakeClock();
    const directory = await tempCacheDir();
    const transport = scriptedTransport(clock, (url) =>
      url.endsWith('/robots.txt')
        ? { status: 200, body: ROBOTS_ALLOW_ALL }
        : { status: 200, body: 'sitemap' },
    );
    const fetcher = new PoliteFetcher({
      transport,
      // Same clock for the cache's timestamps as for the freshness comparison —
      // otherwise the two halves of `isFresh` disagree about what time it is.
      cache: new PageCache(directory, clock.now),
      clock,
      maxAgeMs: 30 * 24 * 60 * 60 * 1000,
      random: () => 0.5,
    });
    await fetcher.loadRobots(ORIGIN);
    await fetcher.fetchPage(`${ORIGIN}/sitemap.xml`, {
      maxAgeMs: SITEMAP_MAX_AGE_MS,
    });

    // Two days later the pages are still fresh under the 30-day TTL, but the
    // sitemap is not — and it must not be, because it is the ONLY invalidation
    // signal the target publishes. Under the page TTL a moved <lastmod> would
    // go unnoticed for a month.
    clock.time += 2 * 24 * 60 * 60 * 1000;
    expect(
      await fetcher.fetchPage(`${ORIGIN}/sitemap.xml`, {
        maxAgeMs: SITEMAP_MAX_AGE_MS,
      }),
    ).toMatchObject({ kind: 'fetched' });
    expect(await fetcher.fetchPage(`${ORIGIN}/sitemap.xml`)).toMatchObject({
      kind: 'cached',
    });
  });

  it('treats a half-written cache entry as a miss', async () => {
    const directory = await tempCacheDir();
    const cache = new PageCache(directory);
    const url = `${ORIGIN}/spell:x`;
    await cache.write(url, 'complete body', {
      sitemapLastmod: null,
      status: 200,
    });
    expect(await cache.read(url)).not.toBe(null);

    // Simulate an interrupted write: the body is truncated but the meta still
    // claims the full hash. Parsing a truncated page yields a plausible, wrong
    // record, so it must not be served.
    const files = await readdir(directory);
    const bodyFile = files.find((name) => name.endsWith('.html'));
    await writeFile(join(directory, bodyFile as string), 'trunc', 'utf8');
    expect(await cache.read(url)).toBe(null);
  });

  it('keys by URL, and answers freshness from lastmod then age', () => {
    expect(cacheKey('http://a.invalid/x')).toBe(cacheKey('http://a.invalid/x'));
    expect(cacheKey('http://a.invalid/x')).not.toBe(cacheKey('http://a.invalid/y'));

    const meta = {
      url: 'u',
      fetchedAt: new Date(1_000_000).toISOString(),
      sitemapLastmod: '2026-01-01',
      sha256: 'x',
      bytes: 1,
      status: 200,
    };
    expect(
      isFresh({ meta, sitemapLastmod: '2026-01-01', maxAgeMs: 10_000, now: 1_005_000 }),
    ).toBe(true);
    expect(
      isFresh({ meta, sitemapLastmod: '2026-02-02', maxAgeMs: 10_000, now: 1_005_000 }),
    ).toBe(false);
    expect(
      isFresh({ meta, sitemapLastmod: '2026-01-01', maxAgeMs: 10_000, now: 1_020_000 }),
    ).toBe(false);
  });

  it('writes a readable meta sidecar next to every body', async () => {
    const directory = await tempCacheDir();
    const cache = new PageCache(directory);
    await cache.write(`${ORIGIN}/spell:x`, 'body', {
      sitemapLastmod: '2026-01-01',
      status: 200,
    });
    const files = await readdir(directory);
    const metaFile = files.find((name) => name.includes('.meta.'));
    const meta = JSON.parse(
      await readFile(join(directory, metaFile as string), 'utf8'),
    ) as { url: string; bytes: number };
    expect(meta.url).toBe(`${ORIGIN}/spell:x`);
    expect(meta.bytes).toBe(4);
  });
});
