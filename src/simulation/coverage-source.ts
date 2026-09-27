import { sha256 } from '../crypto/sha256';
import {
  reviewedResourceRecoverySourceSha256Oracle,
  type ReviewedResourceRecoveryRow,
} from './contracts';
import {
  reviewedBundledSrdHeadings,
  type ReviewedBundledSrdHeading,
} from './reviewed-srd-headings';
import {
  parseSaveDamageClauses,
  spellDescriptionsByHeading,
  spellDescriptionsFromFullLayout,
  type BroadDamageSaveSuspect,
  type SourceDerivedSaveClause,
} from './spell-source-reader';

/**
 * EVERYTHING `coverage.ts` READS FROM THE SRD TEXT, READ AT BUILD TIME.
 *
 * `coverage.ts` used to import the full SRD (2.1 MB) and the spell extract as
 * `?raw` strings and derive its source facts at module evaluation, in every
 * process and every shipped chunk that reached it. This module is that
 * derivation, with the text passed in: it imports no corpus. The one caller
 * outside tests is `npm run srd:artifacts`, which records the result in
 * `generated/coverage-source.ts`; `coverage.ts` reads that artifact.
 * `coverage-source-generation.test.ts` re-derives it from the bundled text and
 * fails on any byte difference, and `coverage-source-self-checks.test.ts`
 * holds the text-reading checks that used to run at module load.
 */

/** The source facts the build records for `coverage.ts`. */
export type BundledCoverageSource = {
  /**
   * The reviewed headings that occur as a complete column segment of the
   * bundled SRD text: the only headings `bundledSrdSourceRef` may mint.
   */
  readonly reviewed_headings_in_bundled_srd: readonly ReviewedBundledSrdHeading[];
  /** `parseSaveDamageClauses` over the column-safe full-SRD spell bodies. */
  readonly clauses_by_heading: readonly (readonly [
    string,
    readonly SourceDerivedSaveClause[],
  ])[];
  readonly raw_clause_count: number;
  readonly broad_suspects: readonly BroadDamageSaveSuspect[];
};

function bundledSrdColumnSegments(fullSrd: string): ReadonlySet<string> {
  return new Set(
    fullSrd
      .split(/\r?\n/u)
      .flatMap((line) => line.split(/\s{2,}/u))
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0),
  );
}

/**
 * Both readings of every spell body must agree before the clause parse runs
 * over them: the column-safe reading of the full SRD layout, and the committed
 * readable extract. Then the save-damage clauses are parsed from the full-SRD
 * reading, and the reviewed headings are checked against the text's column
 * segments.
 */
export function deriveBundledCoverageSource(
  fullSrd: string,
  spellDescriptions: string,
): BundledCoverageSource {
  const bundledSpellBodies = spellDescriptionsFromFullLayout(fullSrd);
  const extractedSpellBodies = spellDescriptionsByHeading(spellDescriptions);
  if (
    bundledSpellBodies.size !== extractedSpellBodies.size ||
    [...bundledSpellBodies].some(([heading, body]) =>
      extractedSpellBodies.get(heading) !== body,
    )
  ) {
    throw new TypeError(
      'Column-safe full SRD spell reading does not match the committed readable spell extract.',
    );
  }
  const parse = parseSaveDamageClauses(bundledSpellBodies);
  const segments = bundledSrdColumnSegments(fullSrd);
  return {
    reviewed_headings_in_bundled_srd: reviewedBundledSrdHeadings.filter(
      (heading) => segments.has(heading),
    ),
    clauses_by_heading: [...parse.clauses_by_heading],
    raw_clause_count: parse.raw_clause_count,
    broad_suspects: parse.broad_suspects,
  };
}

type ResourceRecoverySourceSpanSpec = {
  readonly start: string;
  readonly end: string;
  readonly column_start: number;
  readonly column_end: number | undefined;
};

const reviewedResourceRecoverySourceSpanSpecs = {
  rage: {
    start: 'You regain one ex-',
    end: 'Rest.',
    column_start: 68,
    column_end: undefined,
  },
  channel_divinity: {
    start: 'You regain one of its expended uses when you finish',
    end: 'Long Rest.',
    column_start: 64,
    column_end: undefined,
  },
  sorcerous_restoration: {
    start: 'When you finish a Short Rest, you can regain ex-',
    end: 'finish a Long Rest.',
    column_start: 63,
    column_end: undefined,
  },
  font_of_magic: {
    start: 'You regain all ex-',
    end: 'Long Rest.',
    column_start: 0,
    column_end: 59,
  },
} as const satisfies Record<
  ReviewedResourceRecoveryRow,
  ResourceRecoverySourceSpanSpec
>;

function resourceRecoverySourceSpan(
  source: string,
  row: ReviewedResourceRecoveryRow,
): string {
  const spec = reviewedResourceRecoverySourceSpanSpecs[row];
  const lines = source.split(/\r?\n/u);
  const firstLine = lines.findIndex((line) => line.includes(spec.start));
  const lastLine = lines.findIndex((line, index) =>
    index >= firstLine && line.includes(spec.end),
  );
  if (firstLine < 0 || lastLine < firstLine) {
    throw new TypeError(
      `${row} resource-recovery source span drift: its reviewed anchors are missing.`,
    );
  }
  const columnSpan = lines.slice(firstLine, lastLine + 1)
    .map((line) => line.slice(spec.column_start, spec.column_end).trim())
    .filter((line) => line.length > 0)
    .join(' ');
  const start = columnSpan.indexOf(spec.start);
  const end = columnSpan.indexOf(spec.end, start);
  if (start < 0 || end < start) {
    throw new TypeError(
      `${row} resource-recovery source span drift: its reviewed column slice is missing.`,
    );
  }
  return columnSpan.slice(start, end + spec.end.length);
}

/**
 * The resource-recovery rows' source-span guard. It used to run once at
 * coverage.ts's module load over the bundled SRD text; now the SRD text is
 * read only at build and test time, `coverage-source-self-checks.test.ts` runs
 * it over the bundled SRD, and other tests pass altered source copies through
 * it.
 */
export function assertReviewedResourceRecoverySourceDigests(
  source: string,
): void {
  for (const row of Object.keys(
    reviewedResourceRecoverySourceSpanSpecs,
  ) as ReviewedResourceRecoveryRow[]) {
    const expected = reviewedResourceRecoverySourceSha256Oracle[row];
    const actual = sha256(resourceRecoverySourceSpan(source, row));
    if (actual !== expected) {
      throw new TypeError(
        `${row} resource-recovery source span drift: expected ${expected}, read ${actual}. Re-review the row semantics and digest together.`,
      );
    }
  }
}
