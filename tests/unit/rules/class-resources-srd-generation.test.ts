import { describe, expect, it } from 'vitest';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import srdFullText from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import committed from '../../../src/rules/generated/class-resources-srd.ts?raw';
import {
  assertSrdArtifactFresh,
  srdArtifact,
  srdCorpusTexts,
} from '../../../scripts/srd-artifacts';
import {
  bundledSrdClassResourceFormulaManifest,
  bundledSrdClassResourceManifest,
  SRD_ARCANE_RECOVERY_DESCRIPTION,
} from '../../../src/rules/class-resources-srd';
import {
  parseSrdClassResourceFormulaManifest,
  parseSrdClassResourceManifest,
  srdArcaneRecoveryDescription,
} from '../../../src/rules/class-resources-srd-reader';

/**
 * GENERATION FRESHNESS for `src/rules/generated/class-resources-srd.ts`. It
 * imports the composer and never the writer, so it cannot make itself pass: it
 * proves the committed artifact is exactly what the readers derive from the
 * bundled SRD text now, and that the runtime mints it back — content keys and
 * formula brands through their validating constructors — to exactly the values
 * the readers produce.
 */
const artifact = srdArtifact('src/rules/generated/class-resources-srd.ts');
const read = srdCorpusTexts({
  'docs/srd/source/class-level-tables.txt': classLevelTables,
  'docs/srd/full/srd-5.2.1.txt': srdFullText,
});

describe('class-resources artifact generation freshness', () => {
  it('matches the checked-in artifact byte for byte', () => {
    expect(() => assertSrdArtifactFresh(artifact, read, committed)).not.toThrow();
  });

  it('mints the ladder manifest back to exactly what the reader derives, key order included', () => {
    const derived = parseSrdClassResourceManifest(classLevelTables);
    expect(bundledSrdClassResourceManifest()).toStrictEqual(derived);
    expect(JSON.stringify(bundledSrdClassResourceManifest())).toBe(JSON.stringify(derived));
  });

  it('decodes the formula manifest back to exactly what the reader derives, key order included', () => {
    const derived = parseSrdClassResourceFormulaManifest(srdFullText, classLevelTables);
    expect(bundledSrdClassResourceFormulaManifest()).toStrictEqual(derived);
    expect(JSON.stringify(bundledSrdClassResourceFormulaManifest())).toBe(JSON.stringify(derived));
  });

  it('carries the Arcane Recovery prose the reader derives', () => {
    expect(SRD_ARCANE_RECOVERY_DESCRIPTION).toBe(srdArcaneRecoveryDescription(srdFullText));
  });
});
