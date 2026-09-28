import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import speciesExtract from '../../../docs/srd/source/species-descriptions.txt?raw';
import committed from '../../../src/rules/generated/species-srd-tables.ts?raw';
import { BUNDLED_SRD_SPECIES_TABLES } from '../../../src/rules/generated/species-srd-tables';
import {
  DRACONIC_ANCESTORS,
  DRACONIC_ANCESTORS_SPAN,
  SRD_SPECIES_SENSES,
} from '../../../src/rules/species-srd-tables';
import {
  deriveSrdSpeciesTablesArtifact,
  SpeciesSrdTableError,
} from '../../../src/rules/species-srd-tables-reader';
import {
  assertSrdArtifactFresh,
  composeSrdArtifact,
  srdArtifact,
  srdCorpusTexts,
} from '../../../scripts/srd-artifacts';

/**
 * GENERATION FRESHNESS for `src/rules/generated/species-srd-tables.ts` (D918
 * rule G), one entry of the SRD artifact table since landing batch 2. It
 * imports the composer and the reader, never the writer, so it cannot make
 * itself pass: the committed module must be exactly what the SRD extract
 * derives now, and its header must pin the extract's bytes.
 */
const EXTRACT = 'docs/srd/source/species-descriptions.txt';
const artifact = srdArtifact('src/rules/generated/species-srd-tables.ts');
const read = srdCorpusTexts({ [EXTRACT]: speciesExtract });

describe('species SRD tables artifact', () => {
  it('matches the committed artifact byte for byte', () => {
    expect(() => assertSrdArtifactFresh(artifact, read, committed)).not.toThrow();
  });

  it('fails the drift check when one printed cell of the extract changes', () => {
    // A plausible wrong value, not an absence: Red Fire read as Red Cold.
    const edited = speciesExtract.replace('Red       Fire', 'Red       Cold');
    expect(edited).not.toBe(speciesExtract);
    const editedRead = srdCorpusTexts({ [EXTRACT]: edited });
    // The source pin names the extract first...
    expect(() => assertSrdArtifactFresh(artifact, editedRead, committed)).toThrow(
      `src/rules/generated/species-srd-tables.ts is stale: ${EXTRACT} is not the corpus it was generated from`,
    );
    // ...and the derivation reads the cell too. Of every committed line, only
    // the pin and Red's damage type change: Red is the eighth row (the left
    // column Black..Copper, then Gold, Green, Red), printed as three lines.
    const composed = composeSrdArtifact(artifact, editedRead).split('\n');
    const lines = committed.split('\n');
    expect(composed).toHaveLength(lines.length);
    expect(composed.filter((line, index) => line !== lines[index])).toEqual([
      `//   ${EXTRACT} sha256=${createHash('sha256').update(edited, 'utf8').digest('hex')}`,
      '      "damageType": "Cold"',
    ]);
    expect(deriveSrdSpeciesTablesArtifact(edited).draconicAncestors[7]).toEqual({ dragon: 'Red', damageType: 'Cold' });
  });

  it('refuses a table cell that is not an SRD damage type', () => {
    // The row ends the line (no right-column text), so the layout still parses.
    const broken = speciesExtract.replace('Green     Poison', 'Green     Poisson');
    expect(broken).not.toBe(speciesExtract);
    expect(() => deriveSrdSpeciesTablesArtifact(broken)).toThrow(
      new SpeciesSrdTableError('Draconic Ancestors names "Poisson", not an SRD damage type.'),
    );
  });

  it('holds the ten Draconic Ancestors as printed, hand-read from the extract', () => {
    // docs/srd/source/species-descriptions.txt:63-71, typed from the page:
    // the left column (Black..Copper), then the right (Gold..White).
    expect(DRACONIC_ANCESTORS).toEqual([
      { dragon: 'Black', damageType: 'Acid' },
      { dragon: 'Blue', damageType: 'Lightning' },
      { dragon: 'Brass', damageType: 'Fire' },
      { dragon: 'Bronze', damageType: 'Lightning' },
      { dragon: 'Copper', damageType: 'Acid' },
      { dragon: 'Gold', damageType: 'Fire' },
      { dragon: 'Green', damageType: 'Poison' },
      { dragon: 'Red', damageType: 'Fire' },
      { dragon: 'Silver', damageType: 'Cold' },
      { dragon: 'White', damageType: 'Cold' },
    ]);
    expect(DRACONIC_ANCESTORS_SPAN).toBe('docs/srd/source/species-descriptions.txt:63-71');
  });

  it('holds every species\' printed Darkvision range, hand-read from the extract', () => {
    // species-descriptions.txt: Dragonborn :35-36, Dwarf :53-55, Elf :80-81,
    // Gnome :128-129, Orc :184-186, Tiefling :201-203. Goliath, Halfling and
    // Human print no Darkvision trait.
    expect(SRD_SPECIES_SENSES).toEqual({
      Dragonborn: [{ kind: 'darkvision', rangeFeet: 60 }],
      Dwarf: [{ kind: 'darkvision', rangeFeet: 120 }],
      Elf: [{ kind: 'darkvision', rangeFeet: 60 }],
      Gnome: [{ kind: 'darkvision', rangeFeet: 60 }],
      Goliath: [],
      Halfling: [],
      Human: [],
      Orc: [{ kind: 'darkvision', rangeFeet: 120 }],
      Tiefling: [{ kind: 'darkvision', rangeFeet: 60 }],
    });
  });

  it('is read at runtime exactly as the reader derives it, key order included', () => {
    const derived = deriveSrdSpeciesTablesArtifact(speciesExtract);
    expect(BUNDLED_SRD_SPECIES_TABLES).toStrictEqual(derived);
    expect(JSON.stringify(BUNDLED_SRD_SPECIES_TABLES)).toBe(JSON.stringify(derived));
  });

  it('is shared deeply frozen, so no caller can change the tables for the next one', () => {
    expect(Object.isFrozen(BUNDLED_SRD_SPECIES_TABLES)).toBe(true);
    expect(Object.isFrozen(DRACONIC_ANCESTORS)).toBe(true);
    expect(Object.isFrozen(DRACONIC_ANCESTORS[0])).toBe(true);
    expect(Object.isFrozen(SRD_SPECIES_SENSES)).toBe(true);
    expect(Object.isFrozen(SRD_SPECIES_SENSES.Dwarf)).toBe(true);
    expect(Object.isFrozen(SRD_SPECIES_SENSES.Dwarf[0])).toBe(true);
  });
});
