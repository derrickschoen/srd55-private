import { describe, expect, it } from 'vitest';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import committed from '../../../src/rules/generated/class-level-features-srd.ts?raw';
import {
  assertSrdArtifactFresh,
  srdArtifact,
  srdCorpusTexts,
} from '../../../scripts/srd-artifacts';
import { bundledSrdClassLevelFeatures } from '../../../src/rules/class-level-features-srd';
import { parseSrdClassLevelFeatures } from '../../../src/rules/class-level-features-srd-reader';

/**
 * GENERATION FRESHNESS for `src/rules/generated/class-level-features-srd.ts`.
 * It imports the composer and never the writer, so it cannot make itself pass:
 * it proves the committed artifact is exactly what the reader derives from the
 * bundled class-level tables now, and that the runtime reads it back unchanged.
 */
const artifact = srdArtifact('src/rules/generated/class-level-features-srd.ts');
const read = srdCorpusTexts({
  'docs/srd/source/class-level-tables.txt': classLevelTables,
});

describe('class-level-features artifact generation freshness', () => {
  it('matches the checked-in artifact byte for byte', () => {
    expect(() => assertSrdArtifactFresh(artifact, read, committed)).not.toThrow();
  });

  it('is read at runtime exactly as the reader derives it, key order included', () => {
    const derived = parseSrdClassLevelFeatures(classLevelTables);
    expect(bundledSrdClassLevelFeatures()).toStrictEqual(derived);
    expect(JSON.stringify(bundledSrdClassLevelFeatures())).toBe(JSON.stringify(derived));
  });
});
