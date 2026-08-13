/**
 * Turns parsed species pages into two JSON documents — the species-shaped
 * analogue of `build-subclass-catalog.ts`, for `ParsedSpeciesDocument`.
 *
 * THIS IS NOT WIRED TO ANY IMPORT PATH, AND THAT IS DELIBERATE, NOT AN
 * OVERSIGHT — see `parse-species.ts`'s file-level "IMPORT-SIDE GAP" comment:
 * `SpeciesContentAggregate` demands `effects`/`grants` this module refuses to
 * fabricate from prose, and a `size` this module keeps as printed prose
 * rather than coercing into the closed `CreatureSize` enum.
 *
 * THE TIER 1 / TIER 2 SPLIT IS TRAIT- AND LINEAGE-LEVEL, for the same reason
 * `build-subclass-catalog.ts`'s is feature-level: `ParsedSpeciesDocument`
 * embeds every lineage's and trait's `descriptionParagraphs` inline, and
 * Tier 1 strips that prose back out to bare `{name}` entries, keeping only
 * `size` and `speed` — the two closed-shape mechanical facts
 * `parse-species.ts` promotes out of prose — alongside them. Tier 2 carries
 * the full, paragraph-bearing lineages and traits keyed by `versionKey`.
 *
 * What IS preserved from `build-feat-catalog.ts` / `build-subclass-catalog.ts`:
 * the completeness gate and the dedup-by-`versionKey` refusal.
 */
import { isSpellVersionKey } from '../../src/catalog/catalog-key';
import { SCRAPE_SENTINEL } from './provenance';
import type { ParsedSpeciesDocument } from './parse-species';
import type { QueueItem } from './queue';

export interface BuiltSpeciesPage {
  readonly url: string;
  readonly document: ParsedSpeciesDocument;
}

export interface SpeciesBuildFailure {
  readonly url: string;
  readonly reason: string;
}

export interface SpeciesBuildReport {
  readonly provenance: string;
  readonly generatedAt: string;
  readonly recordCount: number;
  readonly partial: boolean;
  readonly unfinished: { url: string; state: string; reason: string | null }[];
  readonly parseFailures: SpeciesBuildFailure[];
  readonly robotsSkips: { url: string; reason: string }[];
}

export interface SpeciesBuildOutput {
  /** JSON text: an array of Tier 1 species records — lineages/traits stripped to `{name}`. */
  readonly tier1: string;
  /** JSON text: an array of `{versionKey, _description}` — full lineage/trait prose. */
  readonly tier2: string;
  readonly report: SpeciesBuildReport;
}

export class SpeciesBuildRefused extends Error {}

export interface SpeciesBuildInput {
  readonly pages: readonly BuiltSpeciesPage[];
  readonly queue: readonly QueueItem[];
  readonly parseFailures: readonly SpeciesBuildFailure[];
  readonly allowPartial: boolean;
  readonly now?: () => string;
}

export function buildSpeciesDocuments(
  input: SpeciesBuildInput,
): SpeciesBuildOutput {
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
    throw new SpeciesBuildRefused(
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
    throw new SpeciesBuildRefused(
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
      throw new SpeciesBuildRefused(
        `versionKey "${page.document.versionKey}" (from ${page.url}) fails the ` +
          'key grammar.',
      );
    }
    const previous = seen.get(page.document.versionKey);
    if (previous !== undefined && previous !== page.url) {
      throw new SpeciesBuildRefused(
        `two pages produced versionKey "${page.document.versionKey}": ` +
          `${previous} and ${page.url}.`,
      );
    }
    seen.set(page.document.versionKey, page.url);
  }

  const stamped = input.pages.map((page) => ({
    _provenance: SCRAPE_SENTINEL,
    ...page.document,
    lineages: page.document.lineages.map((lineage) => ({ name: lineage.name })),
    traits: page.document.traits.map((trait) => ({ name: trait.name })),
  }));
  const tier1 = JSON.stringify(stamped, null, 2);
  const tier2 = JSON.stringify(
    input.pages.map((page) => ({
      _provenance: SCRAPE_SENTINEL,
      versionKey: page.document.versionKey,
      _description: {
        lineages: page.document.lineages,
        traits: page.document.traits,
      },
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
