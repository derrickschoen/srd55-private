import { describe, expect, it } from 'vitest';
import bundledSrd521 from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import committed from '../../../src/simulation/generated/coverage-source.ts?raw';
import {
  assertSrdArtifactFresh,
  srdArtifact,
  srdCorpusTexts,
} from '../../../scripts/srd-artifacts';
import {
  bundledSrdSourceRef,
  highRecallDamageSaveSuspects,
  sourceDerivedSaveDamageCandidateCounts,
  sourceDerivedSaveDamageCandidates,
} from '../../../src/simulation/coverage';
import { reviewedBundledSrdHeadings } from '../../../src/simulation/reviewed-srd-headings';
import {
  deriveSaveDamageCoverageFromBodies,
  spellDescriptionsFromFullLayout,
} from '../../../src/simulation/spell-source-reader';

/**
 * GENERATION FRESHNESS for `src/simulation/generated/coverage-source.ts`. It
 * imports the composer and never the writer, so it cannot make itself pass: it
 * proves the committed source facts are exactly what the reader derives from
 * the bundled SRD text now (both readings agreeing first), and that
 * `coverage.ts` rebuilds from them exactly the coverage the text path derives.
 */
const artifact = srdArtifact('src/simulation/generated/coverage-source.ts');
const read = srdCorpusTexts({
  'docs/srd/full/srd-5.2.1.txt': bundledSrd521,
  'docs/srd/source/spell-descriptions.txt': bundledSpellDescriptions,
});

describe('coverage source artifact generation freshness', () => {
  it('matches the checked-in artifact byte for byte', () => {
    expect(() => assertSrdArtifactFresh(artifact, read, committed)).not.toThrow();
  });

  it('rebuilds exactly the coverage the SRD text derives, key order included', () => {
    const derived = deriveSaveDamageCoverageFromBodies(
      spellDescriptionsFromFullLayout(bundledSrd521),
    );
    expect(sourceDerivedSaveDamageCandidates).toStrictEqual(derived.candidates);
    expect(JSON.stringify(sourceDerivedSaveDamageCandidates)).toBe(JSON.stringify(derived.candidates));
    expect(sourceDerivedSaveDamageCandidateCounts).toStrictEqual(derived.counts);
    expect(highRecallDamageSaveSuspects).toStrictEqual(derived.broad_suspects);
    expect(JSON.stringify(highRecallDamageSaveSuspects)).toBe(JSON.stringify(derived.broad_suspects));
  });

  it('mints a proof reference for every reviewed heading and for nothing outside the vocabulary', () => {
    for (const heading of reviewedBundledSrdHeadings) {
      expect(bundledSrdSourceRef(heading).heading).toBe(heading);
    }
    expect(() => bundledSrdSourceRef('Magic Missile')).toThrow(
      'Bundled SRD heading is not a reviewed literal heading: Magic Missile.',
    );
  });
});
