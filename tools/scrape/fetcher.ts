/**
 * The polite fetcher: robots.txt, rate limiting, retry/backoff and the on-disk
 * cache, wired together so that no caller can accidentally skip one of them.
 *
 * The network and the clock are both INJECTED. That is not test decoration — it
 * is what lets the rate limiter, the backoff ladder and the robots skip path be
 * asserted deterministically and without a single byte crossing the network in
 * CI. The real transport is supplied only by the CLI.
 */
import { crawlDelayMs, isAllowed, parseRobotsTxt, UNRESTRICTED } from './robots';
import type { RobotsTxt } from './robots';
import { isFresh, PageCache } from './cache';

/**
 * The floor is enforced HERE, in code, rather than by validating a flag. A
 * `--delay` below it is clamped up and reported; there is no spelling of the
 * command line that fetches faster than this.
 */
export const MIN_DELAY_MS = 1000;
export const DEFAULT_DELAY_MS = 1500;

/**
 * Identifiable, contactable, and — deliberately — not a substring game. The
 * product token is the part before the `/`, and it is what robots.txt group
 * selection matches on.
 */
export const PRODUCT_TOKEN = 'dnd-multiclass-spells-static-scraper';
export const USER_AGENT =
  `${PRODUCT_TOKEN}/0.1 ` +
  '(+https://github.com/derrickschoen/dnd-multiclass-spells-static; ' +
  'personal reference tool; contact via repository issues)';

/** Backoff ladder for 429/5xx/transport errors. Three attempts, then give up. */
export const BACKOFF_MS = Object.freeze([5000, 15000, 45000]);

/**
 * robots.txt is cached like any other page, but for a day rather than a month:
 * long enough that a re-run costs nothing, short enough that a permission
 * change is picked up on the next day's run rather than the next month's.
 */
export const ROBOTS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * The sitemap gets the same short TTL, and for a sharper reason: it IS the
 * invalidation signal. Caching it for the pages' 30 days would mean a page
 * whose `<lastmod>` moved went unnoticed for a month, which quietly turns the
 * one freshness mechanism the target publishes into decoration.
 */
export const SITEMAP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface HttpResponse {
  readonly status: number;
  readonly body: string;
}

export type Transport = (
  url: string,
  headers: Record<string, string>,
) => Promise<HttpResponse>;

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};

export type FetchOutcome =
  | { readonly kind: 'cached'; readonly body: string }
  | { readonly kind: 'fetched'; readonly body: string; readonly status: number }
  | { readonly kind: 'robots-skipped'; readonly reason: string }
  | { readonly kind: 'failed'; readonly reason: string };

export interface PoliteFetcherOptions {
  readonly transport: Transport;
  readonly cache: PageCache;
  readonly clock?: Clock;
  readonly delayMs?: number;
  readonly maxAgeMs?: number;
  readonly offline?: boolean;
  /** Deterministic jitter source; the CLI passes Math.random. */
  readonly random?: () => number;
  readonly log?: (line: string) => void;
}

/** Raised when two consecutive 429s say, unambiguously, to stop. */
export class RateLimitAbort extends Error {}

export class PoliteFetcher {
  readonly #transport: Transport;
  readonly #cache: PageCache;
  readonly #clock: Clock;
  readonly #maxAgeMs: number;
  readonly #offline: boolean;
  readonly #random: () => number;
  readonly #log: (line: string) => void;

  #requestedDelayMs: number;
  #robots: RobotsTxt = UNRESTRICTED;
  #robotsLoaded = false;
  #lastRequestAt: number | null = null;
  #consecutiveRateLimits = 0;

  /** Every URL skipped because robots.txt said so, with the deciding rule. */
  readonly robotsSkips: { url: string; reason: string }[] = [];
  /** Requests that actually crossed the network. */
  requestCount = 0;

  constructor(options: PoliteFetcherOptions) {
    this.#transport = options.transport;
    this.#cache = options.cache;
    this.#clock = options.clock ?? systemClock;
    this.#maxAgeMs = options.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000;
    this.#offline = options.offline ?? false;
    this.#random = options.random ?? Math.random;
    this.#log = options.log ?? (() => {});

    const requested = options.delayMs ?? DEFAULT_DELAY_MS;
    this.#requestedDelayMs = Math.max(requested, MIN_DELAY_MS);
    if (requested < MIN_DELAY_MS) {
      this.#log(
        `delay ${requested}ms is below the ${MIN_DELAY_MS}ms floor; using ${MIN_DELAY_MS}ms`,
      );
    }
  }

  get delayMs(): number {
    return this.#requestedDelayMs;
  }

  /**
   * Loads and applies robots.txt. Called once before any page fetch; a fetcher
   * that has not loaded it refuses to fetch (see {@link fetchPage}).
   *
   * A 4xx means "no robots.txt", which RFC 9309 §2.3.1.3 defines as
   * unrestricted. A 5xx does NOT: §2.3.1.4 says an unreachable robots.txt must
   * be treated as a FULL disallow, and that is what we do — the run stops rather
   * than guessing in our own favour.
   */
  async loadRobots(origin: string): Promise<RobotsTxt> {
    const url = new URL('/robots.txt', origin).toString();

    // robots.txt goes through the SAME cache as everything else, with a short
    // TTL of its own. Two consequences, both wanted: `--offline` really means
    // zero requests, and an offline run with no cached robots.txt REFUSES to
    // proceed rather than serving cached pages under no permission at all.
    const retrieved = await this.#retrieve(url, {
      sitemapLastmod: null,
      maxAgeMs: ROBOTS_MAX_AGE_MS,
    });
    if (retrieved.kind === 'offline-miss') {
      throw new Error(
        `--offline was requested but ${url} is not in the cache. Refusing to ` +
          'read cached pages without a robots.txt decision to read them under.',
      );
    }
    if (retrieved.kind === 'cached') {
      this.#robots = parseRobotsTxt(retrieved.body);
    } else {
      const response = retrieved.response;
      if (response === null) {
        throw new Error(
          `robots.txt at ${url} could not be fetched. RFC 9309 treats an ` +
            'unreachable robots.txt as a full disallow, so this run stops here.',
        );
      }
      if (response.status >= 500) {
        throw new Error(
          `robots.txt at ${url} returned ${response.status}. RFC 9309 treats a ` +
            'server error on robots.txt as a full disallow, so this run stops here.',
        );
      }
      // A 4xx means there is no robots.txt, which §2.3.1.3 defines as
      // unrestricted — a genuinely different case from an unreachable one.
      this.#robots =
        response.status >= 400 ? UNRESTRICTED : parseRobotsTxt(response.body);
    }
    this.#robotsLoaded = true;

    const stated = crawlDelayMs(this.#robots, PRODUCT_TOKEN);
    if (stated !== null && stated > this.#requestedDelayMs) {
      this.#log(
        `robots.txt asks for a ${stated}ms crawl delay; raising from ${this.#requestedDelayMs}ms`,
      );
      this.#requestedDelayMs = stated;
    }
    return this.#robots;
  }

  get robots(): RobotsTxt {
    return this.#robots;
  }

  /**
   * Fetches one page through cache, robots and the rate limiter.
   *
   * The robots check happens BEFORE the cache lookup on purpose: a URL that
   * became disallowed since the last run must stop being served out of our
   * cache too, otherwise the cache quietly outlives the permission.
   */
  async fetchPage(
    url: string,
    options: { sitemapLastmod?: string | null; maxAgeMs?: number } = {},
  ): Promise<FetchOutcome> {
    if (!this.#robotsLoaded) {
      throw new Error(
        'fetchPage called before loadRobots; robots.txt is not optional.',
      );
    }
    const sitemapLastmod = options.sitemapLastmod ?? null;

    const decision = isAllowed(this.#robots, PRODUCT_TOKEN, url);
    if (!decision.allowed) {
      const reason = decision.reason;
      this.robotsSkips.push({ url, reason });
      this.#log(`SKIP (robots.txt) ${url} — ${reason}`);
      return { kind: 'robots-skipped', reason };
    }

    const retrieved = await this.#retrieve(url, {
      sitemapLastmod,
      maxAgeMs: options.maxAgeMs ?? this.#maxAgeMs,
    });
    if (retrieved.kind === 'cached') {
      return { kind: 'cached', body: retrieved.body };
    }
    if (retrieved.kind === 'offline-miss') {
      return { kind: 'failed', reason: `offline and not in cache: ${url}` };
    }
    const response = retrieved.response;
    if (response === null) {
      return { kind: 'failed', reason: `all attempts failed: ${url}` };
    }
    if (response.status >= 400) {
      return {
        kind: 'failed',
        reason: `HTTP ${response.status}: ${url}`,
      };
    }
    return { kind: 'fetched', body: response.body, status: response.status };
  }

  /**
   * Cache lookup, then network if needed, then cache write. Shared by the
   * robots.txt load and by page fetches so there is exactly one place that
   * decides whether the network gets touched.
   */
  async #retrieve(
    url: string,
    options: { sitemapLastmod: string | null; maxAgeMs: number },
  ): Promise<
    | { kind: 'cached'; body: string }
    | { kind: 'offline-miss' }
    | { kind: 'network'; response: HttpResponse | null }
  > {
    const cached = await this.#cache.read(url);
    if (
      cached !== null &&
      (this.#offline ||
        isFresh({
          meta: cached.meta,
          sitemapLastmod: options.sitemapLastmod,
          maxAgeMs: options.maxAgeMs,
          now: this.#clock.now(),
        }))
    ) {
      return { kind: 'cached', body: cached.body };
    }
    if (this.#offline) {
      return { kind: 'offline-miss' };
    }
    const response = await this.#requestWithBackoff(url);
    if (response !== null && response.status < 400) {
      await this.#cache.write(url, response.body, {
        sitemapLastmod: options.sitemapLastmod,
        status: response.status,
      });
    }
    return { kind: 'network', response };
  }

  /**
   * One request, serialised behind the delay gate, with the backoff ladder.
   *
   * The gate is a monotonic comparison against the last request's timestamp
   * rather than a `sleep` after each call: that way a slow response does not
   * add to the delay, and — more importantly — concurrency cannot defeat it,
   * because the timestamp is written before the await.
   */
  async #requestWithBackoff(url: string): Promise<HttpResponse | null> {
    for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
      await this.#waitForSlot();
      this.requestCount += 1;
      let response: HttpResponse | null = null;
      let transportError: string | null = null;
      try {
        response = await this.#transport(url, { 'user-agent': USER_AGENT });
      } catch (error) {
        transportError =
          error instanceof Error ? error.message : String(error);
      }

      if (response !== null && response.status === 429) {
        this.#consecutiveRateLimits += 1;
        if (this.#consecutiveRateLimits >= 2) {
          throw new RateLimitAbort(
            `two consecutive HTTP 429 responses (most recently ${url}). ` +
              'Continuing would be rude; stopping so a human can decide.',
          );
        }
      } else if (response !== null && response.status < 500) {
        this.#consecutiveRateLimits = 0;
        return response;
      }

      const retryable =
        transportError !== null ||
        (response !== null && (response.status === 429 || response.status >= 500));
      if (!retryable) {
        return response;
      }
      const backoff = BACKOFF_MS[attempt];
      if (backoff === undefined) {
        this.#log(
          `giving up on ${url} after ${BACKOFF_MS.length + 1} attempts ` +
            `(${transportError ?? `HTTP ${response?.status ?? '?'}`})`,
        );
        return null;
      }
      this.#log(
        `retrying ${url} in ${backoff}ms ` +
          `(${transportError ?? `HTTP ${response?.status ?? '?'}`})`,
      );
      await this.#clock.sleep(backoff);
    }
    return null;
  }

  async #waitForSlot(): Promise<void> {
    // JITTER IS ONE-SIDED, AND THAT IS THE WHOLE POINT.
    //
    // It used to be symmetric — `(random() * 2 - 1) * 250`, so ±250ms — added to
    // a delay that had already been clamped up to MIN_DELAY_MS and possibly
    // raised again to honour a robots.txt `Crawl-delay`. Nothing re-clamped the
    // sum, so worst-case jitter fetched at 750ms against a stated 1000ms floor
    // and against a `Crawl-delay: 1` the target had explicitly asked for: 25%
    // faster than a limit we had just agreed to. That falsified this module's
    // own claim that "there is no spelling of the command line that fetches
    // faster than this", and no test could see it because every fetcher test
    // pins `random` to 0.5, which is exactly the value where symmetric jitter
    // vanishes.
    //
    // Adding only non-negative jitter keeps the property jitter is for — not
    // hammering the origin on a fixed metronome — while making
    // `#requestedDelayMs` a floor that arithmetic cannot get underneath. The
    // floor is now a lower bound rather than an average.
    const jitter = Math.round(this.#random() * 250);
    const target = this.#requestedDelayMs + jitter;
    if (this.#lastRequestAt !== null) {
      const elapsed = this.#clock.now() - this.#lastRequestAt;
      if (elapsed < target) {
        await this.#clock.sleep(target - elapsed);
      }
    }
    this.#lastRequestAt = this.#clock.now();
  }
}

/** The real transport. Referenced only by the CLI. */
export const httpTransport: Transport = async (url, headers) => {
  const response = await fetch(url, { headers, redirect: 'follow' });
  return { status: response.status, body: await response.text() };
};
