import { describe, expect, it } from 'vitest';
import speciesExtract from '../../../docs/srd/source/species-descriptions.txt?raw';
import committed from '../../../src/rules/generated/species-srd-tables.ts?raw';
import {
  DRACONIC_ANCESTORS,
  DRACONIC_ANCESTORS_SPAN,
  SRD_SPECIES_SENSES,
} from '../../../src/rules/generated/species-srd-tables';
import {
  readSpeciesSrdTables,
  renderSpeciesSrdTablesModule,
  SpeciesSrdTableError,
} from '../../../src/rules/species-srd-tables-reader';

/**
 * GENERATION FRESHNESS for `src/rules/generated/species-srd-tables.ts` (D918
 * rule G). It imports the reader and renderer, never the writer, so it cannot
 * make itself pass: the committed module must be exactly what the SRD extract
 * derives now.
 */
function derived(text: string): string {
  return renderSpeciesSrdTablesModule(readSpeciesSrdTables(text));
}

describe('species SRD tables artifact', () => {
  it('matches the committed artifact byte for byte', () => {
    expect(derived(speciesExtract)).toBe(committed);
  });

  it('fails the drift check when one printed cell of the extract changes', () => {
    // A plausible wrong value, not an absence: Red Fire read as Red Cold.
    const edited = speciesExtract.replace('Red       Fire', 'Red       Cold');
    expect(edited).not.toBe(speciesExtract);
    expect(derived(edited)).not.toBe(committed);
  });

  it('refuses a table cell that is not an SRD damage type', () => {
    // The row ends the line (no right-column text), so the layout still parses.
    const broken = speciesExtract.replace('Green     Poison', 'Green     Poisson');
    expect(broken).not.toBe(speciesExtract);
    expect(() => readSpeciesSrdTables(broken)).toThrow(
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
});
