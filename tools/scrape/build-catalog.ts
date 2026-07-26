/**
 * Turns parsed pages into the two documents `catalog.import` already accepts.
 *
 * Separated from the CLI so the whole emit path — including the completeness
 * gate and the self-validation — is testable without touching the network or the
 * disk.
 *
 * THE COMPLETENESS GATE IS NOT OPTIONAL POLISH. `CatalogImporter` deactivates
 * every previously imported version whose key is absent from the import, so an
 * import is a FULL REPLACEMENT, not a delta. A build that quietly emitted 380 of
 * 444 spells would silently tombstone the other 64 in the user's database, and
 * their prepared-spell slots with them. So a build refuses to emit while any
 * queue entry is unfinished, and `--allow-partial` stamps the refusal into the
 * report rather than removing it.
 *
 * A DELIBERATELY NARROWED OUTPUT IS A PARTIAL OUTPUT. `--list bard` used to be
 * exempt, on the reasoning that "the gate is about whether the crawl finished,
 * not about how much of it we chose to emit". That reasoning is wrong, and the
 * gate's own rationale says why: the importer does not know or care WHY a key is
 * missing from the document — a filtered-out spell and a never-fetched spell are
 * the same absent key, and both get tombstoned. Measured against the real
 * 40-page cache, `build --namespace spell --list bard` emitted 8 records with
 * `partial: false` and no warning; imported after a full import it would
 * deactivate the other 32. The filter is now a first-class reason for
 * partiality, refusing to emit without `--allow-partial` exactly as an
 * unfinished crawl does.
 */
import {
  parseCatalogDocuments,
  type CatalogRecord,
} from '../../src/catalog/catalog-schema';
import { isSpellVersionKey } from '../../src/catalog/catalog-key';
import { SCRAPE_SENTINEL } from './provenance';
import type { QueueItem } from './queue';

export interface BuiltPage {
  readonly url: string;
  readonly record: CatalogRecord;
  readonly description: string;
}

export interface BuildFailure {
  readonly url: string;
  readonly reason: string;
}

export interface BuildReport {
  readonly provenance: string;
  readonly generatedAt: string;
  readonly recordCount: number;
  readonly partial: boolean;
  /** Non-null when `--list` narrowed the output; the other half of `partial`. */
  readonly filtered: { list: string; dropped: number } | null;
  readonly unfinished: { url: string; state: string; reason: string | null }[];
  readonly parseFailures: BuildFailure[];
  readonly robotsSkips: { url: string; reason: string }[];
}

export interface BuildOutput {
  /** JSON text, ready to be passed as one entry of `documents`. */
  readonly tier1: string;
  /** JSON text, ready to be passed as one entry of `textDocuments`. */
  readonly tier2: string;
  readonly report: BuildReport;
}

export class BuildRefused extends Error {}

export interface BuildInput {
  readonly pages: readonly BuiltPage[];
  readonly queue: readonly QueueItem[];
  readonly parseFailures: readonly BuildFailure[];
  readonly allowPartial: boolean;
  /**
   * Set when `--list` narrowed the emitted records: the filter name and how many
   * successfully parsed pages it dropped. Absent (or a zero count) means nothing
   * was filtered. This is what stops a narrowed build from reporting itself as
   * complete.
   */
  readonly filtered?: { readonly list: string; readonly dropped: number };
  readonly now?: () => string;
}

export function buildCatalogDocuments(input: BuildInput): BuildOutput {
  const unfinished = input.queue
    .filter((item) => item.state !== 'done')
    .map((item) => ({
      url: item.url,
      state: item.state,
      reason: item.reason,
    }));
  const robotsSkips = input.queue
    .filter((item) => item.state === 'robots-skipped')
    .map((item) => ({ url: item.url, reason: item.reason ?? 'robots.txt' }));

  if (unfinished.length > 0 && !input.allowPartial) {
    const sample = unfinished
      .slice(0, 5)
      .map((item) => `  ${item.state}  ${item.url}${item.reason === null ? '' : ` — ${item.reason}`}`)
      .join('\n');
    throw new BuildRefused(
      `refusing to emit: ${unfinished.length} of ${input.queue.length} queue ` +
        'entries are not done, and a catalog import is a FULL REPLACEMENT — ' +
        'every previously imported spell missing from this file would be ' +
        `deactivated. Finish the run or pass --allow-partial.\n${sample}` +
        (unfinished.length > 5 ? `\n  …and ${unfinished.length - 5} more` : ''),
    );
  }
  const filtered =
    input.filtered !== undefined && input.filtered.dropped > 0
      ? input.filtered
      : null;
  if (filtered !== null && !input.allowPartial) {
    throw new BuildRefused(
      `refusing to emit: --list ${filtered.list} dropped ${filtered.dropped} ` +
        `parsed page(s), leaving ${input.pages.length}. A catalog import is a ` +
        'FULL REPLACEMENT — every spell filtered out of this file would be ' +
        'deactivated in any database that already has it, along with its ' +
        'prepared-spell slots. Drop --list to emit everything, or pass ' +
        '--allow-partial to say you meant it.',
    );
  }
  if (input.parseFailures.length > 0 && !input.allowPartial) {
    const sample = input.parseFailures
      .slice(0, 5)
      .map((failure) => `  ${failure.url} — ${failure.reason}`)
      .join('\n');
    throw new BuildRefused(
      `refusing to emit: ${input.parseFailures.length} page(s) did not parse. ` +
        'A defaulted record is a plausible wrong rule; fix the parser or pass ' +
        `--allow-partial.\n${sample}` +
        (input.parseFailures.length > 5
          ? `\n  …and ${input.parseFailures.length - 5} more`
          : ''),
    );
  }

  const records: CatalogRecord[] = [];
  const seen = new Map<string, string>();
  for (const page of input.pages) {
    // The importer accepts ANY non-empty string as a version key — it never
    // imports catalog-key.ts. The share/export path DOES enforce the grammar and
    // throws on a key that fails it. So a sloppy key imports cleanly and breaks
    // sharing later, silently. Checking here is what closes that gap.
    if (!isSpellVersionKey(page.record.versionKey)) {
      throw new BuildRefused(
        `versionKey "${page.record.versionKey}" (from ${page.url}) fails the ` +
          'spell-key grammar. The importer would accept it and the share ' +
          'export would later throw on it.',
      );
    }
    const previous = seen.get(page.record.versionKey);
    if (previous !== undefined && previous !== page.url) {
      throw new BuildRefused(
        `two pages produced versionKey "${page.record.versionKey}": ` +
          `${previous} and ${page.url}.`,
      );
    }
    seen.set(page.record.versionKey, page.url);
    records.push(page.record);
  }

  // EVERY RECORD CARRIES THE SENTINEL, not just the filename.
  //
  // The document must decode to a bare top-level array, so there is no envelope
  // to put a header in — but `catalogRecord` builds its result from named fields
  // and DROPS every key it does not know, which was verified against the real
  // parser rather than assumed. So `_provenance` is greppable in the file and
  // cannot reach the database, an export or a share link. That matters because
  // the filename alone stops protecting a file the moment someone renames it,
  // and a renamed Tier 1 file is otherwise indistinguishable from hand-written
  // homebrew.
  const stamped = records.map((record) => ({
    _provenance: SCRAPE_SENTINEL,
    ...record,
  }));
  const tier1 = JSON.stringify(stamped, null, 2);
  // Tier 2 must match Tier 1 EXACTLY — normalizeCatalogRecords throws when the
  // key sets differ in either direction — so it is derived from the same list
  // rather than assembled independently.
  const tier2 = JSON.stringify(
    input.pages.map((page) => ({
      _provenance: SCRAPE_SENTINEL,
      versionKey: page.record.versionKey,
      _description: page.description,
    })),
    null,
    2,
  );

  // Self-validation against the app's REAL parser. Emitting a file the importer
  // would reject is the one failure this tool has no excuse for, and the parser
  // is thirty lines away. It also re-proves the stamp is inert on every build.
  const reparsed = parseCatalogDocuments([tier1]);
  if (JSON.stringify(reparsed).includes(SCRAPE_SENTINEL)) {
    throw new BuildRefused(
      'the provenance stamp survived the catalog parser, so it would reach the ' +
        'database and from there an export or a share link. Refusing to emit.',
    );
  }

  return {
    tier1,
    tier2,
    report: {
      provenance: SCRAPE_SENTINEL,
      generatedAt: (input.now ?? (() => new Date().toISOString()))(),
      recordCount: records.length,
      partial:
        unfinished.length > 0 ||
        input.parseFailures.length > 0 ||
        filtered !== null,
      filtered:
        filtered === null
          ? null
          : { list: filtered.list, dropped: filtered.dropped },
      unfinished,
      parseFailures: [...input.parseFailures],
      robotsSkips,
    },
  };
}
