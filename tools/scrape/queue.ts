/**
 * The resumable crawl queue.
 *
 * Written to disk BEFORE the first fetch and rewritten after every page, so an
 * interrupted run resumes instead of restarting. That is a politeness property
 * as much as a convenience one: a run that has to start over re-requests every
 * page it already has.
 *
 * `robots-skipped` is a first-class state, distinct from `failed`: a skip is a
 * decision, not an error, and it must survive into the report as one.
 *
 * It is RE-EVALUATED on the next run rather than being terminal — `pending()`
 * returns skipped items, and `seed()` leaves them alone — because robots.txt is
 * precisely the thing that may have changed since. Re-evaluation is also free:
 * `fetchPage` consults robots BEFORE both the cache and the network, so a URL
 * that is still disallowed costs zero requests to re-decide. (An earlier version
 * of this comment asserted the opposite — that a skip must never be retried —
 * while the code below did what is described here, and `seed()`'s own docstring
 * agreed with the code. The code is right: a permission that is never re-read is
 * frozen at whatever it happened to say the first time we looked.)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { SCRAPE_SENTINEL } from './provenance';

export type QueueState = 'pending' | 'done' | 'failed' | 'robots-skipped';

export interface QueueItem {
  readonly url: string;
  readonly lastmod: string | null;
  state: QueueState;
  reason: string | null;
}

export interface QueueFile {
  readonly provenance: string;
  readonly startedAt: string;
  readonly items: QueueItem[];
}

export class CrawlQueue {
  #items = new Map<string, QueueItem>();
  #startedAt = new Date().toISOString();

  constructor(private readonly path: string) {}

  get items(): QueueItem[] {
    return [...this.#items.values()];
  }

  counts(): Record<QueueState, number> {
    const counts: Record<QueueState, number> = {
      pending: 0,
      done: 0,
      failed: 0,
      'robots-skipped': 0,
    };
    for (const item of this.#items.values()) {
      counts[item.state] += 1;
    }
    return counts;
  }

  async load(): Promise<boolean> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch {
      return false;
    }
    const parsed = JSON.parse(raw) as QueueFile;
    this.#startedAt = parsed.startedAt;
    this.#items = new Map(parsed.items.map((item) => [item.url, item]));
    return true;
  }

  /**
   * Merges a frontier into the queue.
   *
   * An entry already recorded keeps its state UNLESS its `<lastmod>` moved, in
   * which case it goes back to `pending` — that is the whole point of tracking
   * `lastmod`. A previously `failed` entry is always retried; a `robots-skipped`
   * one is re-evaluated, since robots.txt may have changed.
   */
  seed(entries: readonly { url: string; lastmod: string | null }[]): void {
    for (const entry of entries) {
      const existing = this.#items.get(entry.url);
      if (existing === undefined) {
        this.#items.set(entry.url, {
          url: entry.url,
          lastmod: entry.lastmod,
          state: 'pending',
          reason: null,
        });
        continue;
      }
      if (existing.lastmod !== entry.lastmod || existing.state === 'failed') {
        this.#items.set(entry.url, {
          url: entry.url,
          lastmod: entry.lastmod,
          state: 'pending',
          reason: null,
        });
      }
    }
  }

  pending(): QueueItem[] {
    return this.items.filter(
      (item) => item.state === 'pending' || item.state === 'robots-skipped',
    );
  }

  /**
   * Removes entries whose URL is in `urls` entirely, regardless of state —
   * `seed()` is additive-only (an entry it does not see is left exactly as
   * it was, done/failed/pending alike), so a URL a caller has since decided
   * this crawl should never have queued at all (see `commandFetch`'s
   * auxiliary-page skip in `cli.ts`, R2-2: a queue persisted by an OLDER
   * version of this tool, before that skip existed, still carries the
   * pages it queued back then) needs its own removal path, not a `seed()`
   * call that can only ever add or update. Returns the removed entries so
   * the caller can log what it dropped and why.
   */
  prune(urls: ReadonlySet<string>): QueueItem[] {
    const removed: QueueItem[] = [];
    for (const url of urls) {
      const existing = this.#items.get(url);
      if (existing !== undefined) {
        removed.push(existing);
        this.#items.delete(url);
      }
    }
    return removed;
  }

  mark(url: string, state: QueueState, reason: string | null = null): void {
    const item = this.#items.get(url);
    if (item === undefined) {
      return;
    }
    item.state = state;
    item.reason = reason;
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const file: QueueFile = {
      provenance: SCRAPE_SENTINEL,
      startedAt: this.#startedAt,
      items: this.items,
    };
    await writeFile(this.path, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  }
}
