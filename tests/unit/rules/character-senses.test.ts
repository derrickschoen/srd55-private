import { describe, expect, it } from 'vitest';
import srdFullText from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import { sha256 } from '../../../src/crypto/sha256';
import { bundledSrdSpeciesContentKey } from '../../../src/queries/character-senses';
import {
  characterSenses,
  FEATURE_SENSE_GRANTS,
  type CharacterSenseInputs,
} from '../../../src/rules/character-senses';
import { SRD_SPECIES_SENSES, type SrdSpeciesName } from '../../../src/rules/generated/species-srd-tables';
import { bundledSpeciesTemplates } from '../../../src/rules/origins-srd';

function inputs(overrides: Partial<CharacterSenseInputs> = {}): CharacterSenseInputs {
  return {
    species: { kind: 'srd_species', species: 'Human', lineageDarkvision: null },
    classLevels: [],
    featContentKeys: [],
    ...overrides,
  };
}

describe('a character\'s standing senses', () => {
  it('starts from the species\' printed Darkvision (Orc: 120 feet, species-descriptions.txt:184-186)', () => {
    expect(characterSenses(inputs({
      species: { kind: 'srd_species', species: 'Orc', lineageDarkvision: null },
    }))).toEqual({
      status: 'sourced',
      senses: [{ kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 120 }],
    });
    expect(characterSenses(inputs())).toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }] });
  });

  it('lets a species choice that owns the range replace it, and refuses while it is unmade', () => {
    // Elven Lineages, Drow: "The range of your Darkvision increases to 120 feet" (:100).
    expect(characterSenses(inputs({
      species: { kind: 'srd_species', species: 'Elf', lineageDarkvision: { kind: 'known', value: 120 } },
    }))).toEqual({
      status: 'sourced',
      senses: [{ kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 120 }],
    });
    expect(characterSenses(inputs({
      species: {
        kind: 'srd_species',
        species: 'Elf',
        lineageDarkvision: { kind: 'unknown', detail: 'UNKNOWN until Elven Lineage is chosen' },
      },
    }))).toEqual({
      status: 'undetermined',
      field: 'senses.darkvision',
      detail: 'UNKNOWN until Elven Lineage is chosen',
    });
  });

  it('refuses a species with no SRD provenance instead of guessing normal sight', () => {
    expect(characterSenses(inputs({
      species: { kind: 'unsourced', detail: 'Half-Dragon is not a bundled SRD species.' },
    }))).toEqual({
      status: 'undetermined',
      field: 'senses.species',
      detail: 'Half-Dragon is not a bundled SRD species.',
    });
  });

  it('adds Feral Senses at Ranger 18, not at 17 (docs/srd/full/srd-5.2.1.txt:3577-3580)', () => {
    expect(characterSenses(inputs({ classLevels: [{ className: 'Ranger', level: 17 }] })))
      .toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }] });
    expect(characterSenses(inputs({ classLevels: [{ className: 'Ranger', level: 18 }] }))).toEqual({
      status: 'sourced',
      senses: [{ kind: 'normal_sight' }, { kind: 'blindsight', rangeFeet: 30 }],
    });
    expect(characterSenses(inputs({ classLevels: [{ className: 'Fighter', level: 20 }] })))
      .toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }] });
  });

  it('adds the Boon of Truesight\'s 60 feet (docs/srd/full/srd-5.2.1.txt:5354-5360)', () => {
    expect(characterSenses(inputs({
      species: { kind: 'srd_species', species: 'Dwarf', lineageDarkvision: null },
      featContentKeys: ['2024:feat:boon-of-truesight'],
    }))).toEqual({
      status: 'sourced',
      senses: [
        { kind: 'normal_sight' },
        { kind: 'darkvision', rangeFeet: 120 },
        { kind: 'truesight', rangeFeet: 60 },
      ],
    });
  });

  it('pins the feature spans it was hand-typed from', () => {
    const lines = srdFullText.split('\n');
    expect(FEATURE_SENSE_GRANTS.map((grant) => {
      const match = /:(\d+)-(\d+)$/u.exec(grant.span);
      if (match === null) throw new Error(`Bad span ${grant.span}`);
      return [grant.feature, sha256(lines.slice(Number(match[1]) - 1, Number(match[2])).join('\n'))];
    })).toEqual([
      ['Feral Senses', 'adfef7df61d590601a629811bdf2835a274178b8570e043dacf1ff62b66b6e2b'],
      ['Boon of Truesight', 'e839383f65d1a365cf5ebcb89e38e342aebfc6396e426914006444b60c66bde4'],
    ]);
  });

  it('derives the seeded content key of every SRD species', () => {
    const seeded = Object.fromEntries(bundledSpeciesTemplates().map((template) => [template.name, template.content_key]));
    for (const name of Object.keys(SRD_SPECIES_SENSES) as SrdSpeciesName[]) {
      expect(bundledSrdSpeciesContentKey(name)).toBe(seeded[name]);
    }
    expect(Object.keys(seeded).sort()).toEqual(Object.keys(SRD_SPECIES_SENSES).sort());
  });
});
