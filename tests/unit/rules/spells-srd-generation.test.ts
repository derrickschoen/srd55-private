import { describe, expect, it } from 'vitest';
import spellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import bard from '../../../docs/srd/source/bard-spell-list.txt?raw';
import cleric from '../../../docs/srd/source/cleric-spell-list.txt?raw';
import druid from '../../../docs/srd/source/druid-spell-list.txt?raw';
import paladin from '../../../docs/srd/source/paladin-spell-list.txt?raw';
import ranger from '../../../docs/srd/source/ranger-spell-list.txt?raw';
import sorcerer from '../../../docs/srd/source/sorcerer-spell-list.txt?raw';
import warlock from '../../../docs/srd/source/warlock-spell-list.txt?raw';
import wizard from '../../../docs/srd/source/wizard-spell-list.txt?raw';
import committed from '../../../src/rules/generated/spells-srd.ts?raw';
import {
  assertSrdArtifactFresh,
  srdArtifact,
  srdCorpusTexts,
} from '../../../scripts/srd-artifacts';
import {
  bundledSrdSpellDescriptions,
  bundledSrdSpellListMemberships,
} from '../../../src/rules/spells-srd';
import {
  parseSrdSpellDescriptions,
  parseSrdSpellListMemberships,
} from '../../../src/rules/spells-srd-reader';

/**
 * GENERATION FRESHNESS for `src/rules/generated/spells-srd.ts`. It imports the
 * composer and never the writer, so it cannot make itself pass: it proves the
 * committed spell catalog is exactly what the reader parses from the bundled
 * description and class-list extracts now, and that the runtime seeds from it
 * unchanged.
 */
const artifact = srdArtifact('src/rules/generated/spells-srd.ts');
const lists = { Bard: bard, Cleric: cleric, Druid: druid, Paladin: paladin, Ranger: ranger, Sorcerer: sorcerer, Warlock: warlock, Wizard: wizard };
const read = srdCorpusTexts({
  'docs/srd/source/spell-descriptions.txt': spellDescriptions,
  'docs/srd/source/bard-spell-list.txt': bard,
  'docs/srd/source/cleric-spell-list.txt': cleric,
  'docs/srd/source/druid-spell-list.txt': druid,
  'docs/srd/source/paladin-spell-list.txt': paladin,
  'docs/srd/source/ranger-spell-list.txt': ranger,
  'docs/srd/source/sorcerer-spell-list.txt': sorcerer,
  'docs/srd/source/warlock-spell-list.txt': warlock,
  'docs/srd/source/wizard-spell-list.txt': wizard,
});

describe('spell catalog artifact generation freshness', () => {
  it('matches the checked-in artifact byte for byte', () => {
    expect(() => assertSrdArtifactFresh(artifact, read, committed)).not.toThrow();
  });

  it('seeds from exactly the descriptions the reader parses, key order included', () => {
    const derived = parseSrdSpellDescriptions(spellDescriptions);
    expect(bundledSrdSpellDescriptions()).toStrictEqual(derived);
    expect(JSON.stringify(bundledSrdSpellDescriptions())).toBe(JSON.stringify(derived));
  });

  it('seeds from exactly the class-list memberships the reader parses, in list order', () => {
    const derived = parseSrdSpellListMemberships(lists);
    expect(bundledSrdSpellListMemberships()).toStrictEqual(derived);
    expect(JSON.stringify(bundledSrdSpellListMemberships())).toBe(JSON.stringify(derived));
  });
});
