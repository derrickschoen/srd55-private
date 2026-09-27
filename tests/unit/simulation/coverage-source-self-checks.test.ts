import { describe, expect, it } from 'vitest';
import bundledSrd521 from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import {
  assertReviewedSpellBodyDigest,
  reviewedSaveSuccessClauses,
  reviewedSpellBodySha256Oracle,
} from '../../../src/simulation/coverage';
import {
  assertReviewedResourceRecoverySourceDigests,
  deriveBundledCoverageSource,
} from '../../../src/simulation/coverage-source';
import { reviewedBundledSrdHeadings } from '../../../src/simulation/reviewed-srd-headings';
import { spellBodyDigestInputsFromFullLayout } from '../../../src/simulation/spell-source-reader';

/**
 * THE SRD-TEXT CHECKS `coverage.ts` USED TO RUN AT MODULE LOAD.
 *
 * `coverage.ts` read the full SRD and the spell extract at module evaluation
 * and threw if any of these failed, in every process that imported it. It now
 * reads the build's recorded source facts (`generated/coverage-source.ts`) and
 * no SRD text, so the guarantees live here, named, instead of depending on an
 * import side effect.
 */
const derived = deriveBundledCoverageSource(bundledSrd521, bundledSpellDescriptions);

describe('coverage source self-checks over the bundled SRD text', () => {
  it('both readings of every spell body agree (the derivation refuses otherwise)', () => {
    expect(() =>
      deriveBundledCoverageSource(bundledSrd521, bundledSpellDescriptions),
    ).not.toThrow();
    expect(derived.clauses_by_heading).toHaveLength(339);
  });

  it('finds every reviewed heading as a complete column segment of the bundled SRD', () => {
    expect(derived.reviewed_headings_in_bundled_srd).toEqual([
      ...reviewedBundledSrdHeadings,
    ]);
  });

  it('leaves out a reviewed heading that stops being a complete column segment', () => {
    const line = 'Impeded Weapons                                             Critical Hits';
    expect(bundledSrd521.split(line)).toHaveLength(2);
    const mutated = bundledSrd521.replace(
      line,
      'Impeded Weapons                                             Critical Hitz',
    );
    const headings = deriveBundledCoverageSource(
      mutated,
      bundledSpellDescriptions,
    ).reviewed_headings_in_bundled_srd;
    expect(headings).not.toContain('Critical Hits');
    expect(headings).toEqual(
      reviewedBundledSrdHeadings.filter((heading) => heading !== 'Critical Hits'),
    );
  });

  it('matches every reviewed save clause to the spell body its digest oracle reviewed', () => {
    const digestInputs = spellBodyDigestInputsFromFullLayout(bundledSrd521);
    const entries = Object.entries(reviewedSaveSuccessClauses) as [
      keyof typeof reviewedSaveSuccessClauses,
      (typeof reviewedSaveSuccessClauses)[keyof typeof reviewedSaveSuccessClauses],
    ][];
    expect(entries).toHaveLength(79);
    for (const [key, clause] of entries) {
      expect(clause.evidence.kind, clause.id).toBe('bundled_srd');
      const heading = clause.evidence.kind === 'bundled_srd'
        ? clause.evidence.heading
        : null;
      const body = heading === null ? undefined : digestInputs.get(heading);
      expect(body, `${clause.id} has no raw spell body`).toBeDefined();
      expect(clause.spell_body_sha256).toBe(reviewedSpellBodySha256Oracle[key]);
      expect(() => assertReviewedSpellBodyDigest(key, clause.id, body ?? '')).not.toThrow();
    }
  });

  it('reads every resource-recovery row from its reviewed source span', () => {
    expect(() => assertReviewedResourceRecoverySourceDigests(bundledSrd521)).not.toThrow();
  });
});
