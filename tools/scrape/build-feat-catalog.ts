/**
 * Turns parsed feat pages into two JSON documents — the feat-shaped analogue of
 * `build-catalog.ts`'s Tier 1 / Tier 2 split, for `ParsedFeatDocument` instead
 * of `CatalogRecord`.
 *
 * THIS IS NOT WIRED TO ANY IMPORT PATH, AND THAT IS DELIBERATE, NOT AN
 * OVERSIGHT. `src/catalog/catalog-schema.ts` already has a `'feat'` record
 * kind, but `parseSourceCatalogRecord('feat', …)`
 * (`src/catalog/source-catalog-records.ts`) demands a `FeatContentAggregateV1`
 * — structured prerequisites and rules-engine `GrantRule`s — that
 * `parse-feat.ts` deliberately does not attempt to fabricate out of prose; see
 * that module's file-level comment for the full argument. So there is no
 * app-side parser this file's Tier 1 output could be round-tripped through,
 * and therefore — UNLIKE `build-catalog.ts` — no self-validation step: that
 * module reparses its own Tier 1 output with the app's real
 * `parseCatalogDocuments` and refuses to emit if anything looks wrong; there is
 * no equivalent "real parser" for this shape to reparse against, because
 * nothing in `src/` reads it yet.
 *
 * TODO(feat-import-gap): whoever wires a feat import path should either
 * (a) extend this module's Tier 1 shape into a real `FeatContentAggregateV1`
 * builder — which needs its own STRICT AND LOUD prerequisite/grant reader,
 * modelled on `parsePrintedPrerequisites`/`grantRules` in
 * `src/rules/feats-srd.ts`, not a cast from `ParsedFeatDocument` — or (b) add a
 * new catalog record kind shaped like `ParsedFeatDocument` if the richer
 * aggregate turns out to demand more structure than scraped (as opposed to
 * hand-curated SRD) prose can honestly supply.
 *
 * What IS preserved from `build-catalog.ts`: the completeness gate (a partial
 * crawl refuses to emit without `--allow-partial`, on the same
 * full-replacement reasoning `build-catalog.ts`'s file comment gives, in case a
 * future importer treats a feat document set the same way a spell one is
 * treated) and the Tier 1 / Tier 2 split itself, so the printed benefit prose
 * never lands in the file this project would eventually treat as safe to keep.
 */
import { isSpellVersionKey } from '../../src/catalog/catalog-key';
import { SCRAPE_SENTINEL } from './provenance';
import type { FeatParagraph, ParsedFeatDocument } from './parse-feat';
import type { QueueItem } from './queue';

export interface BuiltFeatPage {
  readonly url: string;
  readonly document: ParsedFeatDocument;
  readonly description: readonly FeatParagraph[];
}

export interface FeatBuildFailure {
  readonly url: string;
  readonly reason: string;
}

export interface FeatBuildReport {
  readonly provenance: string;
  readonly generatedAt: string;
  readonly recordCount: number;
  readonly partial: boolean;
  readonly unfinished: { url: string; state: string; reason: string | null }[];
  readonly parseFailures: FeatBuildFailure[];
  readonly robotsSkips: { url: string; reason: string }[];
  /**
   * Pages that parsed FINE but named a category out of this project's 2024
   * PHB scope (Dragonmark, Planar Pact, Dark Gift — see
   * `parse-feat.ts`'s `OUT_OF_SCOPE_FEAT_CATEGORIES`). NOT a parse failure
   * and NOT counted toward `partial`: excluding known-out-of-scope content
   * is by design, not an incomplete crawl, so it must not force
   * `--allow-partial` the way a genuine parse failure does.
   */
  readonly outOfScopeSkips: FeatBuildFailure[];
}

export interface FeatBuildOutput {
  /** JSON text: an array of `ParsedFeatDocument`, each stamped with `_provenance`. */
  readonly tier1: string;
  /** JSON text: an array of `{versionKey, _description}`. Never merged into Tier 1. */
  readonly tier2: string;
  readonly report: FeatBuildReport;
}

export class FeatBuildRefused extends Error {}

export interface FeatBuildInput {
  readonly pages: readonly BuiltFeatPage[];
  readonly queue: readonly QueueItem[];
  readonly parseFailures: readonly FeatBuildFailure[];
  /** See `FeatBuildReport.outOfScopeSkips`. Defaults to none. */
  readonly outOfScopeSkips?: readonly FeatBuildFailure[];
  readonly allowPartial: boolean;
  readonly now?: () => string;
}

export function buildFeatDocuments(input: FeatBuildInput): FeatBuildOutput {
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
    throw new FeatBuildRefused(
      `refusing to emit: ${unfinished.length} of ${input.queue.length} queue ` +
        `entries are not done.\n${sample}` +
        (unfinished.length > 5 ? `\n  …and ${unfinished.length - 5} more` : ''),
    );
  }
  if (input.parseFailures.length > 0 && !input.allowPartial) {
    const sample = input.parseFailures
      .slice(0, 5)
      .map((failure) => `  ${failure.url} — ${failure.reason}`)
      .join('\n');
    throw new FeatBuildRefused(
      `refusing to emit: ${input.parseFailures.length} page(s) did not parse. ` +
        'A defaulted document is a plausible wrong rule; fix the parser or pass ' +
        `--allow-partial.\n${sample}` +
        (input.parseFailures.length > 5
          ? `\n  …and ${input.parseFailures.length - 5} more`
          : ''),
    );
  }

  const seen = new Map<string, string>();
  for (const page of input.pages) {
    // `isSpellVersionKey` is a generic edition[:owner]:name key-grammar check
    // despite its name — see `parse-feat.ts`'s note on `homebrewSpellKey` for
    // why it is reused here rather than duplicated.
    if (!isSpellVersionKey(page.document.versionKey)) {
      throw new FeatBuildRefused(
        `versionKey "${page.document.versionKey}" (from ${page.url}) fails the ` +
          'key grammar.',
      );
    }
    const previous = seen.get(page.document.versionKey);
    if (previous !== undefined && previous !== page.url) {
      throw new FeatBuildRefused(
        `two pages produced versionKey "${page.document.versionKey}": ` +
          `${previous} and ${page.url}.`,
      );
    }
    seen.set(page.document.versionKey, page.url);
  }

  const stamped = input.pages.map((page) => ({
    _provenance: SCRAPE_SENTINEL,
    ...page.document,
  }));
  const tier1 = JSON.stringify(stamped, null, 2);
  const tier2 = JSON.stringify(
    input.pages.map((page) => ({
      _provenance: SCRAPE_SENTINEL,
      versionKey: page.document.versionKey,
      _description: page.description,
    })),
    null,
    2,
  );

  return {
    tier1,
    tier2,
    report: {
      provenance: SCRAPE_SENTINEL,
      generatedAt: (input.now ?? (() => new Date().toISOString()))(),
      recordCount: input.pages.length,
      partial: unfinished.length > 0 || input.parseFailures.length > 0,
      unfinished,
      parseFailures: [...input.parseFailures],
      robotsSkips,
      outOfScopeSkips: [...(input.outOfScopeSkips ?? [])],
    },
  };
}
