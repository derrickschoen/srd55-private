import { describe, expect, it } from 'vitest';
import armorTable from '../../../docs/srd/source/armor-table.txt?raw';
import spellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import subclasses from '../../../docs/srd/source/subclasses.txt?raw';
import weaponsTable from '../../../docs/srd/source/weapons-table.txt?raw';
import fullSrd from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import committed from '../../../src/rules/srd/generated/rule-index.ts?raw';
import {
  assertSrdRuleIndexFresh,
  SRD_RULE_INDEX_SOURCES,
  type SrdCorpusReader,
} from '../../../scripts/srd/rule-index';

/**
 * The drift test for the generated `SRD_RULE_INDEX`: the committed module must
 * be byte-for-byte what the SRD text derives now. It never regenerates the
 * file; `npm run srd:rule-index` is the only writer.
 */
const TEXTS: Readonly<Record<string, string>> = {
  [SRD_RULE_INDEX_SOURCES.fullSrd]: fullSrd,
  [SRD_RULE_INDEX_SOURCES.spellDescriptions]: spellDescriptions,
  [SRD_RULE_INDEX_SOURCES.weaponsTable]: weaponsTable,
  [SRD_RULE_INDEX_SOURCES.armorTable]: armorTable,
  [SRD_RULE_INDEX_SOURCES.subclasses]: subclasses,
};

function reader(overrides: Readonly<Record<string, string>> = {}): SrdCorpusReader {
  return (path) => {
    const text = overrides[path] ?? TEXTS[path];
    if (text === undefined) {
      throw new Error(`${path} was not supplied.`);
    }
    return text;
  };
}

describe('SRD_RULE_INDEX drift', () => {
  it('is byte-for-byte what the SRD text derives', () => {
    expect(() => {
      assertSrdRuleIndexFresh(reader(), committed);
    }).not.toThrow();
  });

  it('goes stale when a rule heading in the SRD text changes', () => {
    // One printed heading, renamed: the committed index no longer matches.
    expect(fullSrd.split('Blinded [Condition]')).toHaveLength(2);
    const renamed = fullSrd.replace('Blinded [Condition]', 'Blindness [Condition]');
    expect(() => {
      assertSrdRuleIndexFresh(reader({ [SRD_RULE_INDEX_SOURCES.fullSrd]: renamed }), committed);
    }).toThrow(/is stale at line \d+: the SRD text derives .*condition\.blindness/);
  });
});
