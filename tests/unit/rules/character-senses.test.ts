import { describe, expect, it } from 'vitest';
import srdFullText from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import { sha256 } from '../../../src/crypto/sha256';
import { bundledSrdSpeciesContentKey } from '../../../src/queries/character-senses';
import {
  characterSenses,
  FEATURE_SENSE_GRANTS,
  SENSE_FEATURE_CAPABILITY_OWNER,
  SENSE_FEATURES,
  type CharacterSenseInputs,
  type LineageDarkvision,
} from '../../../src/rules/character-senses';
import { SRD_SPECIES_SENSES, type SrdSpeciesName } from '../../../src/rules/species-srd-tables';
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
      senseFeatures: [],
    });
    expect(characterSenses(inputs()))
      .toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }], senseFeatures: [] });
  });

  it('lets a species choice that owns the range replace it, and refuses while it is unmade', () => {
    // Elven Lineages, Drow: "The range of your Darkvision increases to 120 feet" (:100).
    expect(characterSenses(inputs({
      species: { kind: 'srd_species', species: 'Elf', lineageDarkvision: { kind: 'known', value: 120 } },
    }))).toEqual({
      status: 'sourced',
      senses: [{ kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 120 }],
      senseFeatures: [],
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
      .toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }], senseFeatures: [] });
    expect(characterSenses(inputs({ classLevels: [{ className: 'Ranger', level: 18 }] }))).toEqual({
      status: 'sourced',
      senses: [{ kind: 'normal_sight' }, { kind: 'blindsight', rangeFeet: 30 }],
      senseFeatures: [],
    });
    expect(characterSenses(inputs({ classLevels: [{ className: 'Fighter', level: 20 }] })))
      .toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }], senseFeatures: [] });
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
      // The Dwarf's Stonecunning, carried beside the standing senses (D923 Q13).
      senseFeatures: ['Stonecunning'],
    });
  });

  it('carries the Dwarf\'s Stonecunning as a sense feature, not a standing Tremorsense', () => {
    // docs/srd/full/srd-5.2.1.txt:5060-5072: "As a Bonus Action, you gain
    // Tremorsense with a range of 60 feet for 10 minutes" — activated.
    expect(characterSenses(inputs({
      species: { kind: 'srd_species', species: 'Dwarf', lineageDarkvision: null },
    }))).toEqual({
      status: 'sourced',
      senses: [{ kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 120 }],
      senseFeatures: ['Stonecunning'],
    });
    for (const species of Object.keys(SRD_SPECIES_SENSES) as SrdSpeciesName[]) {
      const senses = characterSenses(inputs({
        species: { kind: 'srd_species', species, lineageDarkvision: null },
      }));
      expect(senses.status === 'sourced' ? senses.senseFeatures : null)
        .toEqual(species === 'Dwarf' ? ['Stonecunning'] : []);
    }
  });

  it('types every sense feature sourced, not executed, awaiting the PERCEPTION unit (D923 Q13)', () => {
    expect(SENSE_FEATURES).toEqual({
      Stonecunning: {
        grantedBy: { kind: 'srd_species', species: 'Dwarf' },
        sense: { kind: 'tremorsense', rangeFeet: 60 },
        activation: { kind: 'bonus_action', durationMinutes: 10, surface: 'stone' },
        status: 'sourced_not_executed',
        awaiting: 'perception_filters',
        span: 'docs/srd/full/srd-5.2.1.txt:5060-5072',
      },
      // "You can see normally in Dim Light and Darkness—both magical and
      // nonmagical—within 120 feet of yourself." No invocation is selectable here.
      "Devil's Sight": {
        grantedBy: { kind: 'eldritch_invocation', selectableInThisApplication: false },
        sense: { kind: 'sees_normally_in_darkness', rangeFeet: 120, includesMagicalDarkness: true },
        activation: { kind: 'standing' },
        status: 'sourced_not_executed',
        awaiting: 'perception_filters',
        span: 'docs/srd/full/srd-5.2.1.txt:4354-4358',
      },
    });
    expect(SENSE_FEATURE_CAPABILITY_OWNER).toEqual({ perception_filters: 'PERCEPTION' });
    const lines = srdFullText.split('\n');
    const spanText = (span: string) => {
      const match = /:(\d+)-(\d+)$/u.exec(span);
      if (match === null) throw new Error(`Bad span ${span}`);
      return lines.slice(Number(match[1]) - 1, Number(match[2])).join('\n');
    };
    // Hashes computed independently (Python hashlib over the same lines).
    expect(sha256(spanText(SENSE_FEATURES.Stonecunning.span)))
      .toBe('1432c739cce3a8c2d46dcafb8ef5b158fc3b9a25a4bf8492816b6b6e1b243b79');
    expect(sha256(spanText(SENSE_FEATURES["Devil's Sight"].span)))
      .toBe('5a4d0a64acd87d3811282a73427f63e783d932d5d623ac8dd77b2f6d1dcafb12');
    expect(spanText(SENSE_FEATURES.Stonecunning.span)).toContain('Stonecunning. As a Bonus Action, you gain Trem-');
    expect(spanText(SENSE_FEATURES["Devil's Sight"].span)).toContain('You can see normally in Dim Light and Darkness—');
  });

  it('starts an authored species from exactly the senses it states (owner D923 Q10)', () => {
    const stated = (lineageDarkvision: LineageDarkvision) => characterSenses(inputs({
      species: {
        kind: 'stated_species',
        name: 'Deep Folk',
        senses: [{ kind: 'tremorsense', rangeFeet: 15 }, { kind: 'darkvision', rangeFeet: 60 }],
        lineageDarkvision,
      },
    }));
    expect(stated(null)).toEqual({
      status: 'sourced',
      senses: [
        { kind: 'normal_sight' },
        { kind: 'tremorsense', rangeFeet: 15 },
        { kind: 'darkvision', rangeFeet: 60 },
      ],
      // Sense features are SRD species' and options'; an authored one holds none.
      senseFeatures: [],
    });
    // A lineage choice owning the Darkvision range replaces that one sense and
    // keeps every other sense the species states.
    expect(stated({ kind: 'known', value: 120 })).toEqual({
      status: 'sourced',
      senses: [
        { kind: 'normal_sight' },
        { kind: 'tremorsense', rangeFeet: 15 },
        { kind: 'darkvision', rangeFeet: 120 },
      ],
      senseFeatures: [],
    });
    // "Normal sight only" is a statement too.
    expect(characterSenses(inputs({
      species: { kind: 'stated_species', name: 'Plain Folk', senses: [], lineageDarkvision: null },
    }))).toEqual({ status: 'sourced', senses: [{ kind: 'normal_sight' }], senseFeatures: [] });
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
