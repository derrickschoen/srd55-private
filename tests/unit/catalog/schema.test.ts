import { describe, expect, it } from 'vitest';
import {
  normalizeCatalogRecords,
} from '../../../src/catalog/catalog-normalize';
import {
  isCatalogImportParams,
  parseCatalogDocuments,
  parseDescriptionDocuments,
} from '../../../src/catalog/catalog-schema';

function record(overrides: Record<string, unknown> = {}) {
  return {
    identityKey: 'test-spell',
    versionKey: '2024:test-spell',
    name: 'Test Spell',
    edition: '2024',
    level: 1,
    school: 'Evocation',
    castingTime: 'Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    attackModes: ['ranged_spell'],
    saveAbilities: [],
    effectReliabilityCategory: 'attack_roll',
    spellLists: ['Wizard'],
    sourceBooks: ['Test Book'],
    sourcePage: 42,
    sourceSlug: 'test-spell',
    ...overrides,
  };
}

describe('browser catalog schema', () => {
  it('rejects malformed containers and every required field shape before import', () => {
    const cases: Array<[unknown, string]> = [
      [{ record: {} }, 'must contain a JSON list'],
      [[1], 'contains a non-object record'],
      [[record({ identityKey: ' ' })], "'identityKey'"],
      [[record({ versionKey: null })], "'versionKey'"],
      [[record({ name: 1 })], "'name'"],
      [[record({ edition: 2024 })], "'edition'"],
      [[record({ edition: '2030' })], "'edition' must be one of"],
      [[record({ level: -1 })], "'level'"],
      [[record({ level: 10 })], "'level'"],
      [[record({ school: '\t' })], "'school'"],
      [[record({ concentration: 0 })], "'concentration'"],
      [[record({ ritual: 'false' })], "'ritual'"],
      [[record({ attackModes: 'ranged_spell' })], "'attackModes'"],
      [[record({ saveAbilities: [1] })], "'saveAbilities'"],
      [[record({ spellLists: null })], "'spellLists'"],
      [[record({ sourceBooks: [''] })], "'sourceBooks'"],
      [
        [record({ effectReliabilityCategory: 'luck' })],
        "'effectReliabilityCategory' must be one of",
      ],
    ];

    for (const [value, message] of cases) {
      expect(
        () => parseCatalogDocuments([JSON.stringify(value)]),
        JSON.stringify(value),
      ).toThrow(message);
    }
    expect(() => parseCatalogDocuments(['{'])).toThrow(
      'Invalid Tier 1 catalog document 1 JSON',
    );
    expect(
      isCatalogImportParams({
        documents: [JSON.stringify([record()])],
        unexpected: true,
      }),
    ).toBe(false);
  });

  it('merges split publications and pivots and chooses canonical names by edition', () => {
    const parsed = parseCatalogDocuments([
      JSON.stringify([
        record({
          versionKey: '2014:test-spell',
          name: 'Legacy Name',
          edition: '2014',
          sourceBooks: ['Legacy Book'],
        }),
        record({
          sourceBooks: ['Modern A'],
          spellLists: ['Wizard'],
          tags: ['alpha'],
        }),
      ]),
      JSON.stringify([
        record({
          sourceBooks: ['Modern B'],
          sourcePage: 77,
          spellLists: ['Cleric', 'Wizard'],
          attackModes: ['melee_spell'],
          tags: ['beta'],
        }),
      ]),
    ]);
    const normalized = normalizeCatalogRecords(parsed);
    const modern = normalized.find(
      (candidate) => candidate.versionKey === '2024:test-spell',
    );

    expect(normalized).toHaveLength(2);
    expect(normalized.map((candidate) => candidate.canonicalName)).toEqual([
      'Test Spell',
      'Test Spell',
    ]);
    expect(modern).toMatchObject({
      spellLists: ['Wizard', 'Cleric'],
      attackModes: ['ranged_spell', 'melee_spell'],
      tags: ['alpha', 'beta'],
      publications: [
        {
          sourceBook: 'Modern A',
          sourcePage: 42,
          sourceReference: 'test-spell',
        },
        {
          sourceBook: 'Modern B',
          sourcePage: 77,
          sourceReference: 'test-spell',
        },
      ],
    });
  });

  it('accepts only complete, non-conflicting optional Tier 2 text', () => {
    const records = parseCatalogDocuments([
      JSON.stringify([
        record(),
        record({
          identityKey: 'second',
          versionKey: '2024:second',
          name: 'Second',
        }),
      ]),
    ]);
    const complete = parseDescriptionDocuments([
      JSON.stringify([
        {
          versionKey: '2024:test-spell',
          _description: 'First description.',
        },
        {
          versionKey: '2024:second',
          _description: 'Second description.',
        },
      ]),
    ]);

    expect(normalizeCatalogRecords(records, complete)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          versionKey: '2024:test-spell',
          description: 'First description.',
        }),
        expect.objectContaining({
          versionKey: '2024:second',
          description: 'Second description.',
        }),
      ]),
    );
    expect(() =>
      normalizeCatalogRecords(
        records,
        parseDescriptionDocuments([
          JSON.stringify([
            {
              versionKey: '2024:test-spell',
              _description: 'Only one.',
            },
          ]),
        ]),
      ),
    ).toThrow(
      'Tier 2 catalog does not exactly match Tier 1 (1 missing, 0 unexpected).',
    );
    expect(() =>
      parseDescriptionDocuments([
        JSON.stringify([
          {
            versionKey: '2024:test-spell',
            _description: 'First.',
          },
          {
            versionKey: '2024:test-spell',
            _description: 'Conflicting.',
          },
        ]),
      ]),
    ).toThrow('Tier 2 has conflicting descriptions for 2024:test-spell.');
  });
});
