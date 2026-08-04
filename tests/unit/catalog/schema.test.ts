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

function itemRecord(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'item',
    name: 'Boundary Item',
    edition: 'expanded',
    description: 'Boundary description.',
    requiresAttunement: false,
    effects: [{
      kind: 'armor_class_bonus',
      amount: 1,
      label: 'Boundary effect',
      notes: null,
    }],
    ...overrides,
  };
}

function weaponRecord(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'weapon',
    name: 'Boundary Weapon',
    edition: 'expanded',
    srdGroup: 'simple_ranged',
    damage: { kind: 'dice', dice: '1d6' },
    damageType: 'Piercing',
    versatileDamage: { kind: 'not_applicable' },
    finesse: false,
    heavy: false,
    light: false,
    loading: false,
    reach: false,
    thrown: false,
    twoHanded: false,
    ammunition: true,
    ammunitionKind: 'Arrows',
    range: { kind: 'ranged', nearFeet: 80, farFeet: 320 },
    masteryProperty: 'Vex',
    otherProperties: null,
    ...overrides,
  };
}

function armorRecord(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'armor',
    name: 'Boundary Armor',
    edition: 'expanded',
    category: 'heavy',
    armorClass: 18,
    dexBonus: 'none',
    dexBonusMax: null,
    strengthRequirement: 15,
    stealthDisadvantage: true,
    ...overrides,
  };
}

function parseEquipment(value: unknown): void {
  parseCatalogDocuments([JSON.stringify([value])]);
}

describe('browser catalog schema', () => {
  it('parses complete equipment records and refuses partial mechanical payloads', () => {
    const item = {
      kind: 'item',
      name: 'Giant Belt',
      edition: 'expanded',
      description: 'Sets Strength.',
      requiresAttunement: true,
      effects: [{
        kind: 'ability_override',
        ability: 'strength',
        maximum: 23,
        label: 'Giant strength',
        notes: null,
      }],
    };
    const parsed = parseCatalogDocuments([JSON.stringify([item])]);
    expect(parsed.items[0]).toMatchObject({
      name: 'Giant Belt',
      requiresAttunement: true,
      effects: [{
        kind: 'ability_override',
        sort_order: 1,
        ability: 'strength',
        maximum: 23,
      }],
    });
    expect([...parsed.kinds]).toEqual(['item']);
    expect(() => parseCatalogDocuments([JSON.stringify([{
      ...item,
      effects: [{ ...item.effects[0], maximum: null }],
    }])])).toThrow('effects[0].maximum');
    expect(() => parseCatalogDocuments([JSON.stringify([{
      kind: 'weapon',
      name: 'Broken',
      edition: 'expanded',
      srdGroup: 'simple_ranged',
      damage: { kind: 'dice', dice: '1d6' },
      damageType: 'Piercing',
      versatileDamage: { kind: 'not_applicable' },
      finesse: false,
      heavy: false,
      light: false,
      loading: false,
      reach: false,
      thrown: false,
      twoHanded: false,
      ammunition: true,
      ammunitionKind: 'Arrows',
      range: { kind: 'legacy', nearFeet: null, farFeet: 60 },
      masteryProperty: 'Vex',
      otherProperties: null,
    }])])).toThrow("'range.kind'");
  });

  it.each([
    ['hit_points_flat', {
      kind: 'hp_modifier', hitPointsFlat: 1001, hitPointsPerLevel: null,
      label: 'HP', notes: null,
    }],
    ['hit_points_per_level', {
      kind: 'hp_modifier', hitPointsFlat: null, hitPointsPerLevel: 1001,
      label: 'HP per level', notes: null,
    }],
    ['speed_bonus_feet', {
      kind: 'speed', speedBonusFeet: 1001, label: 'Speed', notes: null,
    }],
    ['ability_increase amount', {
      kind: 'ability_increase', ability: 'strength', amount: 1001, maximum: 20,
      label: 'Increase', notes: null,
    }],
    ['armor_class_bonus amount', {
      kind: 'armor_class_bonus', amount: 1001, label: 'AC', notes: null,
    }],
    ['armor_class_formula base', {
      kind: 'armor_class_formula', base: 1001, ability1: 'dexterity',
      ability2: null, allowsShield: true, label: 'Formula', notes: null,
    }],
    ['weapon_attack_bonus amount', {
      kind: 'weapon_attack_bonus', amount: 1001, weaponScope: 'any_weapon',
      label: 'Attack', notes: null,
    }],
    ['weapon_damage_bonus amount', {
      kind: 'weapon_damage_bonus', amount: 1001, weaponScope: 'any_weapon',
      label: 'Damage', notes: null,
    }],
  ] as const)(
    'refuses item effect $0 magnitude 1001',
    (_label, effect) => {
      expect(() => parseEquipment(itemRecord({ effects: [effect] }))).toThrow(
        '1000',
      );
    },
  );

  it('accepts item effect magnitude 1000 exactly', () => {
    expect(() => parseEquipment(itemRecord({
      effects: [{
        kind: 'armor_class_bonus',
        amount: 1000,
        label: 'Exact magnitude',
        notes: null,
      }],
    }))).not.toThrow();
  });

  it('refuses item effect magnitude -1001 and accepts -1000 exactly', () => {
    const speedEffect = (speedBonusFeet: number) => ({
      kind: 'speed',
      speedBonusFeet,
      label: 'Exact negative magnitude',
      notes: null,
    });
    expect(() => parseEquipment(itemRecord({
      effects: [speedEffect(-1001)],
    }))).toThrow('1000');
    expect(() => parseEquipment(itemRecord({
      effects: [speedEffect(-1000)],
    }))).not.toThrow();
  });

  it('refuses item effect count 201', () => {
    expect(() => parseEquipment(itemRecord({
      effects: Array.from({ length: 201 }, () => ({
        kind: 'ability_override',
        ability: 'strength',
        maximum: 20,
        label: 'Counted effect',
        notes: null,
      })),
    }))).toThrow('200');
  });

  it.each([
    ['name', itemRecord({ name: 'n'.repeat(121) })],
    ['description', itemRecord({ description: 'd'.repeat(4001) })],
    ['effect label', itemRecord({ effects: [{
      kind: 'ability_override', ability: 'strength', maximum: 20,
      label: 'l'.repeat(121), notes: null,
    }] })],
    ['effect notes', itemRecord({ effects: [{
      kind: 'ability_override', ability: 'strength', maximum: 20,
      label: 'Notes', notes: 'n'.repeat(2001),
    }] })],
    ['effect damage type', itemRecord({ effects: [{
      kind: 'damage_resistance', damageType: 'd'.repeat(121),
      label: 'Resistance', notes: null,
    }] })],
  ] as const)('refuses item $0 above its authoritative text bound', (_label, item) => {
    expect(() => parseEquipment(item)).toThrow('characters');
  });

  it('accepts item effect count and text fields exactly at every boundary', () => {
    const effects = Array.from({ length: 200 }, (_, index) => index === 0
      ? {
          kind: 'damage_resistance',
          damageType: 'd'.repeat(120),
          label: 'l'.repeat(120),
          notes: 'n'.repeat(2000),
        }
      : {
          kind: 'ability_override',
          ability: 'strength',
          maximum: 20,
          label: 'l'.repeat(120),
          notes: 'n'.repeat(2000),
        });
    expect(() => parseEquipment(itemRecord({
      name: 'n'.repeat(120),
      description: 'd'.repeat(4000),
      effects,
    }))).not.toThrow();
  });

  it.each([
    ['121-character name', weaponRecord({ name: 'n'.repeat(121) })],
    ['41-character damage dice', weaponRecord({
      damage: { kind: 'dice', dice: 'd'.repeat(41) },
    })],
    ['41-character custom damage', weaponRecord({
      damage: { kind: 'custom', text: 'd'.repeat(41) },
    })],
    ['41-character versatile damage dice', weaponRecord({
      versatileDamage: { kind: 'dice', dice: 'd'.repeat(41) },
    })],
    ['41-character versatile custom damage', weaponRecord({
      versatileDamage: { kind: 'custom', text: 'd'.repeat(41) },
    })],
    ['41-character damage type', weaponRecord({ damageType: 'd'.repeat(41) })],
    ['41-character ammunition kind', weaponRecord({
      ammunitionKind: 'a'.repeat(41),
    })],
    ['501-character properties', weaponRecord({
      otherProperties: 'p'.repeat(501),
    })],
  ] as const)('refuses weapon $0 above WEAPON_TEXT_LIMITS', (_label, weapon) => {
    expect(() => parseEquipment(weapon)).toThrow('characters');
  });

  it('accepts every weapon text field exactly at WEAPON_TEXT_LIMITS', () => {
    expect(() => parseEquipment(weaponRecord({
      name: 'n'.repeat(120),
      damage: { kind: 'dice', dice: 'd'.repeat(40) },
      damageType: 'd'.repeat(40),
      versatileDamage: { kind: 'dice', dice: 'v'.repeat(40) },
      ammunitionKind: 'a'.repeat(40),
      otherProperties: 'p'.repeat(500),
    }))).not.toThrow();
    expect(() => parseEquipment(weaponRecord({
      damage: { kind: 'custom', text: 'd'.repeat(40) },
      versatileDamage: { kind: 'custom', text: 'v'.repeat(40) },
    }))).not.toThrow();
  });

  it('refuses a 121-character armor name and accepts 120 exactly', () => {
    expect(() => parseEquipment(armorRecord({
      name: 'n'.repeat(121),
    }))).toThrow('120 characters');
    expect(() => parseEquipment(armorRecord({
      name: 'n'.repeat(120),
    }))).not.toThrow();
  });

  it('refuses armorClass 0 and accepts armorClass 1 exactly', () => {
    expect(() => parseEquipment(armorRecord({ armorClass: 0 }))).toThrow(
      'armorClass',
    );
    expect(() => parseEquipment(armorRecord({ armorClass: 1 }))).not.toThrow();
  });

  it('refuses strengthRequirement 0 and accepts 1 exactly', () => {
    expect(() => parseEquipment(armorRecord({
      strengthRequirement: 0,
    }))).toThrow('strengthRequirement');
    expect(() => parseEquipment(armorRecord({
      strengthRequirement: 1,
    }))).not.toThrow();
  });

  it('refuses a shield Dexterity bonus and accepts none exactly', () => {
    expect(() => parseEquipment(armorRecord({
      category: 'shield',
      dexBonus: 'full',
      dexBonusMax: null,
      strengthRequirement: null,
    }))).toThrow('shield');
    expect(() => parseEquipment(armorRecord({
      category: 'shield',
      dexBonus: 'none',
      dexBonusMax: null,
      strengthRequirement: null,
    }))).not.toThrow();
  });

  it('refuses armor values above shared maxima and accepts the maxima exactly', () => {
    for (const armor of [
      armorRecord({ armorClass: 101 }),
      armorRecord({
        category: 'medium', dexBonus: 'capped', dexBonusMax: 21,
      }),
      armorRecord({ strengthRequirement: 31 }),
    ]) {
      expect(() => parseEquipment(armor)).toThrow();
    }
    expect(() => parseEquipment(armorRecord({
      category: 'medium',
      armorClass: 100,
      dexBonus: 'capped',
      dexBonusMax: 20,
      strengthRequirement: 30,
    }))).not.toThrow();
  });

  it('rejects malformed containers and every required field shape before import', () => {
    const cases: Array<[unknown, string]> = [
      [{ record: {} }, 'must contain a JSON list'],
      [[1], 'contains a non-object record'],
      [[record({ identityKey: ' ' })], "'identityKey'"],
      [[record({ versionKey: null })], "'versionKey'"],
      [[record({ name: 1 })], "'name'"],
      [[record({ name: '---' })], 'Content identity names must not be empty'],
      [[record({ edition: 2024 })], "'edition'"],
      [[record({ edition: '2030' })], "'edition' must be one of"],
      [[record({ level: -1 })], "'level'"],
      [[record({ level: 10 })], "'level'"],
      [[record({ school: '\t' })], "'school'"],
      [[record({ concentration: 0 })], "'concentration'"],
      [[record({ ritual: 'false' })], "'ritual'"],
      // OMISSION, not merely the wrong type — `JSON.stringify` drops an
      // `undefined` value, so these two documents carry no such key at all.
      // This is the premise F13's removal of the prose fallback rests on: the
      // importer never sees an ABSENT boolean to infer from, because a document
      // missing one is refused before it gets there.
      [[record({ concentration: undefined })], "'concentration'"],
      [[record({ ritual: undefined })], "'ritual'"],
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

  it('refuses surrounding whitespace on every spell locator at parse time', () => {
    for (const value of [
      record({ identityKey: ' test-spell' }),
      record({ versionKey: '2024:test-spell ' }),
      record({ spellLists: [' Wizard'] }),
    ]) {
      expect(() => parseCatalogDocuments([JSON.stringify([value])]))
        .toThrow('contains surrounding whitespace');
    }
  });

  it('refuses surrounding whitespace on Tier 2 version keys at parse time', () => {
    expect(() => parseDescriptionDocuments([JSON.stringify([{
      versionKey: ' 2024:test-spell',
      _description: 'Description.',
    }])])).toThrow('contains surrounding whitespace');
  });

  it('refuses spell names that normalize to an empty identity name at parse time', () => {
    expect(() => parseCatalogDocuments([
      JSON.stringify([record({ name: '---' })]),
    ])).toThrow('Content identity names must not be empty');
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
      weapons: [],
      armors: [],
      items: [],
      classes: [],
      feats: [],
      species: [],
      backgrounds: [],
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
