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

  /**
   * `kinds` IS WHAT DECIDES WHETHER THE SPELL SWEEP RUNS, so it is asserted on
   * its own rather than only through the importer. The three cases below are
   * the three different answers, and the empty one is the subtle one: an empty
   * document declares `spell` ITSELF, because "a spell document listing
   * nothing" is the one meaning `[]` has ever had. Declaring it per document
   * rather than inferring it from an empty parse is what keeps that meaning
   * when the user also selects a subclass file. `CatalogImporter.import` reads
   * `kinds` to scope its sweep.
   */
  it('splits a document by record kind and reports the kinds it declared', () => {
    const subclass = {
      kind: 'subclass',
      contentKey: '2024:homebrew.unit:iron-hymn',
      parentClassKey: '2024:class:bard',
      name: 'Choir of the Unit Test',
      edition: '2024',
      features: [
        { classLevel: 3, name: 'A Paragraph', description: 'It moves nothing.' },
        {
          classLevel: 6,
          name: 'A Number',
          description: 'It moves one.',
          effect: {
            kind: 'extra_attack',
            attackCount: 2,
            weaponScope: 'one_bonded_weapon',
          },
          _dropped: 'an unknown field, dropped in silence like any other',
        },
      ],
    };

    const mixed = parseCatalogDocuments([
      JSON.stringify([record(), subclass]),
    ]);
    expect(mixed.spells.map((spell) => spell.versionKey)).toEqual([
      '2024:test-spell',
    ]);
    expect([...mixed.kinds].sort()).toEqual(['spell', 'subclass']);
    expect(mixed.subclasses).toEqual([
      {
        kind: 'subclass',
        contentKey: '2024:homebrew.unit:iron-hymn',
        parentClassKey: '2024:class:bard',
        name: 'Choir of the Unit Test',
        edition: '2024',
        features: [
          {
            classLevel: 3,
            name: 'A Paragraph',
            description: 'It moves nothing.',
            // Free text is the COMMON case and `null` is how it is said.
            effect: null,
          },
          {
            classLevel: 6,
            name: 'A Number',
            description: 'It moves one.',
            // The parser mints `ClassFeatureEffect` itself — the same type
            // `src/rules/class-feature-effects.ts` hands the derivation — so a
            // kind it cannot build is a compile error, not a runtime surprise.
            effect: {
              kind: 'extra_attack',
              attack_count: 2,
              weapon_scope: 'one_bonded_weapon',
            },
          },
        ],
      },
    ]);

    // A legacy document declares `spell` without saying so anywhere.
    expect([...parseCatalogDocuments([JSON.stringify([record()])]).kinds]).toEqual(
      ['spell'],
    );
    // And an empty one declares `spell` TOO, carrying no records. `[]` has one
    // historical meaning — "a spell document listing nothing", the shipped way
    // to empty the spell catalog — and it declares that meaning itself, per
    // document, so it survives being selected alongside a subclass file. See
    // `CatalogImporter.import`, which reads `kinds` to decide the sweep.
    expect(parseCatalogDocuments(['[]'])).toEqual({
      spells: [],
      subclasses: [],
      kinds: new Set(['spell']),
    });
    // The declaration is per document, not per parse: the empty file still
    // says `spell` when a subclass document rides along in the same call.
    expect(
      [...parseCatalogDocuments(['[]', JSON.stringify([subclass])]).kinds].sort(),
    ).toEqual(['spell', 'subclass']);
    // A subclass document ALONE declares only `subclass`, and that is what
    // keeps a subclass import from sweeping the spell catalog.
    expect([
      ...parseCatalogDocuments([JSON.stringify([subclass])]).kinds,
    ]).toEqual(['subclass']);
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
    const normalized = normalizeCatalogRecords(parsed.spells);
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
    ]).spells;
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
