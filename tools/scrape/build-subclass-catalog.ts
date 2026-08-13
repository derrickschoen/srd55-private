/**
 * Turns parsed subclass pages into two JSON documents — the subclass-shaped
 * analogue of `build-feat-catalog.ts`, for `ParsedSubclassDocument` instead
 * of `ParsedFeatDocument`.
 *
 * THIS IS NOT WIRED TO ANY IMPORT PATH, AND THAT IS DELIBERATE, NOT AN
 * OVERSIGHT — see `parse-subclass.ts`'s file-level "IMPORT-SIDE GAP" comment
 * for the full argument: `CatalogSubclassRecord` demands a `parentClassKey`
 * this module cannot resolve from a display name and per-feature `effect`s
 * this module refuses to fabricate from prose.
 *
 * THE TIER 1 / TIER 2 SPLIT IS FEATURE-LEVEL, NOT DOCUMENT-LEVEL, because
 * that is where this shape's prose actually lives: `ParsedSubclassDocument`
 * embeds each feature's `descriptionParagraphs` inline (the shape the parser
 * itself produces), but Tier 1 — "the file this project would eventually
 * treat as safe to keep," in `build-feat-catalog.ts`'s words — strips that
 * prose back out to `{level, name}` per feature, same as `build-catalog.ts`
 * and `build-feat-catalog.ts` keep prose out of Tier 1 entirely. Tier 2
 * carries the full, paragraph-bearing feature list keyed by `versionKey`.
 *
 * What IS preserved from `build-feat-catalog.ts`: the completeness gate (a
 * partial crawl refuses to emit without `--allow-partial`) and the
 * dedup-by-`versionKey` refusal — load-bearing here because
 * `sitemap.ts`'s file comment records LIVE alias slugs
 * (`sorcerer:draconic-bloodline` / `sorcerer:draconic` /
 * `sorcerer:draconic-sorcery`) that will trip exactly this refusal on a full
 * crawl of a class namespace, which is the correct behaviour, not a bug.
 */
import { isSpellVersionKey } from '../../src/catalog/catalog-key';
import { SCRAPE_SENTINEL } from './provenance';
import type { ParsedSubclassDocument } from './parse-subclass';
import type { QueueItem } from './queue';

export interface BuiltSubclassPage {
  readonly url: string;
  readonly document: ParsedSubclassDocument;
}

export interface SubclassBuildFailure {
  readonly url: string;
  readonly reason: string;
}

export interface SubclassBuildReport {
  readonly provenance: string;
  readonly generatedAt: string;
  readonly recordCount: number;
  readonly partial: boolean;
  readonly unfinished: { url: string; state: string; reason: string | null }[];
  readonly parseFailures: SubclassBuildFailure[];
  readonly robotsSkips: { url: string; reason: string }[];
}

export interface SubclassBuildOutput {
  /** JSON text: an array of Tier 1 subclass records — features stripped to `{level, name}`. */
  readonly tier1: string;
  /** JSON text: an array of `{versionKey, _description}` — full feature prose. */
  readonly tier2: string;
  readonly report: SubclassBuildReport;
}

export class SubclassBuildRefused extends Error {}

export interface SubclassBuildInput {
  readonly pages: readonly BuiltSubclassPage[];
  readonly queue: readonly QueueItem[];
  readonly parseFailures: readonly SubclassBuildFailure[];
  readonly allowPartial: boolean;
  readonly now?: () => string;
}

export function buildSubclassDocuments(
  input: SubclassBuildInput,
): SubclassBuildOutput {
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
    throw new SubclassBuildRefused(
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
    throw new SubclassBuildRefused(
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
    if (!isSpellVersionKey(page.document.versionKey)) {
      throw new SubclassBuildRefused(
        `versionKey "${page.document.versionKey}" (from ${page.url}) fails the ` +
          'key grammar.',
      );
    }
    const previous = seen.get(page.document.versionKey);
    if (previous !== undefined && previous !== page.url) {
      throw new SubclassBuildRefused(
        `two pages produced versionKey "${page.document.versionKey}": ` +
          `${previous} and ${page.url}.`,
      );
    }
    seen.set(page.document.versionKey, page.url);
  }

  const stamped = input.pages.map((page) => ({
    _provenance: SCRAPE_SENTINEL,
    ...page.document,
    features: page.document.features.map((feature) => ({
      level: feature.level,
      name: feature.name,
    })),
  }));
  const tier1 = JSON.stringify(stamped, null, 2);
  const tier2 = JSON.stringify(
    input.pages.map((page) => ({
      _provenance: SCRAPE_SENTINEL,
      versionKey: page.document.versionKey,
      _description: page.document.features,
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
    },
  };
}
