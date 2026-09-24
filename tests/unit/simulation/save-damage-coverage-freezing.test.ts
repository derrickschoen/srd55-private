import { describe, expect, it } from 'vitest';
import bundledSpellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import {
  deriveSaveDamageCoverageFromBodies,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

/**
 * `deriveSaveDamageCoverageFromBodies` mints: every candidate record and the
 * counts come back frozen, so a consumer of coverage.ts's exported candidates
 * cannot edit the source-of-truth oracle in place.
 *
 * This case was carried over from the deleted spell-source-parse-cache test,
 * where it asserted the same freezing on the cache's decoded data. The cache is
 * gone; the freezing is not, and nothing else in tests/unit/simulation fails
 * when either `Object.freeze` in the derivation is removed.
 */
describe('save-damage coverage derivation', () => {
  it('freezes every candidate record and the counts it derives', () => {
    const bodies = new Map(
      [...spellDescriptionsByHeading(bundledSpellDescriptions)].slice(0, 12),
    );
    const coverage = deriveSaveDamageCoverageFromBodies(bodies);
    expect(Object.isFrozen(coverage.counts)).toBe(true);
    expect(coverage.candidates.length).toBeGreaterThan(0);
    expect(
      coverage.candidates.filter((candidate) => !Object.isFrozen(candidate))
        .map((candidate) => candidate.heading),
    ).toEqual([]);
  });
});
