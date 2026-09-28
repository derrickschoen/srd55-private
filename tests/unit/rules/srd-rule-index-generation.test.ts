import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import armorTable from '../../../docs/srd/source/armor-table.txt?raw';
import spellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import subclasses from '../../../docs/srd/source/subclasses.txt?raw';
import weaponsTable from '../../../docs/srd/source/weapons-table.txt?raw';
import fullSrd from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import committed from '../../../src/rules/srd/generated/rule-index.ts?raw';
import { SRD_RULE_INDEX } from '../../../src/rules/srd/generated/rule-index';
import {
  assertSrdArtifactFresh,
  composeSrdArtifact,
  SRD_CORPUS_PATHS,
  srdArtifact,
  srdCorpusTexts,
} from '../../../scripts/srd-artifacts';

/**
 * The drift test for the generated `SRD_RULE_INDEX`, one entry of the SRD
 * artifact table since landing batch 2: the committed module must be byte for
 * byte what the SRD text derives now, and its header must pin the bytes of
 * every source. It never regenerates the file; `npm run srd:artifacts` is the
 * only writer.
 */
const TEXTS: Readonly<Record<string, string>> = {
  [SRD_CORPUS_PATHS.fullSrd]: fullSrd,
  [SRD_CORPUS_PATHS.spellDescriptions]: spellDescriptions,
  [SRD_CORPUS_PATHS.weaponsTable]: weaponsTable,
  [SRD_CORPUS_PATHS.armorTable]: armorTable,
  [SRD_CORPUS_PATHS.subclasses]: subclasses,
};
const artifact = srdArtifact('src/rules/srd/generated/rule-index.ts');
const read = srdCorpusTexts(TEXTS);

describe('SRD_RULE_INDEX drift', () => {
  it('is byte-for-byte what the SRD text derives', () => {
    expect(() => assertSrdArtifactFresh(artifact, read, committed)).not.toThrow();
  });

  it('goes stale when a rule heading in the SRD text changes', () => {
    // One printed heading, renamed: the committed index no longer matches.
    expect(fullSrd.split('Blinded [Condition]')).toHaveLength(2);
    const renamed = fullSrd.replace('Blinded [Condition]', 'Blindness [Condition]');
    const renamedRead = srdCorpusTexts({ ...TEXTS, [SRD_CORPUS_PATHS.fullSrd]: renamed });
    // The source pin names the corpus first...
    expect(() => assertSrdArtifactFresh(artifact, renamedRead, committed)).toThrow(
      `src/rules/srd/generated/rule-index.ts is stale: ${SRD_CORPUS_PATHS.fullSrd} is not the corpus it was generated from`,
    );
    // ...and the derivation reads the heading too. Of every committed line,
    // only the pin, the unit's id and its name change: the rename moves no
    // line, so every span is unchanged.
    const composed = composeSrdArtifact(artifact, renamedRead).split('\n');
    const lines = committed.split('\n');
    expect(composed).toHaveLength(lines.length);
    expect(composed.filter((line, index) => line !== lines[index])).toEqual([
      `//   ${SRD_CORPUS_PATHS.fullSrd} sha256=${createHash('sha256').update(renamed, 'utf8').digest('hex')}`,
      '  "condition.blindness": {',
      '    "name": "Blindness",',
    ]);
  });

  it('is shared deeply frozen, so no caller can change a rule unit for the next one', () => {
    const blinded = SRD_RULE_INDEX['condition.blinded'];
    expect(Object.isFrozen(SRD_RULE_INDEX)).toBe(true);
    expect(Object.isFrozen(blinded)).toBe(true);
    expect(Object.isFrozen(blinded.spans)).toBe(true);
  });
});
