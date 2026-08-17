import { describe, expect, it } from 'vitest';
import {
  normalizeCatalogRecords,
} from '../../../src/catalog/catalog-normalize';
import {
  isCatalogImportParams,
  parseCatalogDocuments,
  parseDescriptionDocuments,
} from '../../../src/catalog/catalog-schema';
import {
  CatalogDocumentJsonParseError,
  CatalogFieldEnumError,
  CatalogFieldIntegerRangeError,
  CatalogFieldLengthError,
  CatalogFieldNullableIntegerRangeError,
  CatalogFieldRowCountError,
  CatalogFieldTypeError,
  CatalogFieldWhitespaceError,
  CatalogRangeKindError,
  CatalogShieldDexBonusError,
  CatalogTierTwoDescriptionConflictError,
} from '../../../src/catalog/catalog-schema-errors';

/**
 * THE REFUSAL ITSELF, NOT ITS SENTENCE (D274/D276).
 *
 * Returns the thrown value so a test can assert the CLASS and the PARAMETERS
 * that produced the message. The exact sentence each class formats is asserted
 * once, in `catalog-schema-errors.test.ts`; asserting it again here would tie
 * every guard to prose that only one test should own.
 */
function refusal(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected the catalog parser to refuse, but it returned.');
}

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
    const missingMaximum = refusal(() => parseCatalogDocuments([JSON.stringify([{
      ...item,
      effects: [{ ...item.effects[0], maximum: null }],
    }])]));
    expect(missingMaximum).toBeInstanceOf(CatalogFieldIntegerRangeError);
    expect(missingMaximum).toMatchObject({
      field: 'effects[0].maximum',
      minimum: 1,
      maximum: 30,
    });
    const legacyRange = refusal(() => parseCatalogDocuments([JSON.stringify([{
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
    }])]));
    expect(legacyRange).toBeInstanceOf(CatalogRangeKindError);
  });

  it.each([
    ['hit_points_flat', 'effects[0].hitPointsFlat', 'nullable', {
      kind: 'hp_modifier', hitPointsFlat: 1001, hitPointsPerLevel: null,
      label: 'HP', notes: null,
    }],
    ['hit_points_per_level', 'effects[0].hitPointsPerLevel', 'nullable', {
      kind: 'hp_modifier', hitPointsFlat: null, hitPointsPerLevel: 1001,
      label: 'HP per level', notes: null,
    }],
    ['speed_bonus_feet', 'effects[0].speedBonusFeet', 'required', {
      kind: 'speed', speedBonusFeet: 1001, label: 'Speed', notes: null,
    }],
    ['ability_increase amount', 'effects[0].amount', 'required', {
      kind: 'ability_increase', ability: 'strength', amount: 1001, maximum: 20,
      label: 'Increase', notes: null,
    }],
    ['armor_class_bonus amount', 'effects[0].amount', 'required', {
      kind: 'armor_class_bonus', amount: 1001, label: 'AC', notes: null,
    }],
    ['armor_class_formula base', 'effects[0].base', 'required', {
      kind: 'armor_class_formula', base: 1001, ability1: 'dexterity',
      ability2: null, allowsShield: true, label: 'Formula', notes: null,
    }],
    ['weapon_attack_bonus amount', 'effects[0].amount', 'required', {
      kind: 'weapon_attack_bonus', amount: 1001, weaponScope: 'any_weapon',
      label: 'Attack', notes: null,
    }],
    ['weapon_damage_bonus amount', 'effects[0].amount', 'required', {
      kind: 'weapon_damage_bonus', amount: 1001, weaponScope: 'any_weapon',
      label: 'Damage', notes: null,
    }],
  ] as const)(
    'refuses item effect $0 magnitude 1001',
    (_label, field, nullability, effect) => {
      const error = refusal(
        () => parseEquipment(itemRecord({ effects: [effect] })),
      );
      expect(error).toBeInstanceOf(
        nullability === 'nullable'
          ? CatalogFieldNullableIntegerRangeError
          : CatalogFieldIntegerRangeError,
      );
      expect(error).toMatchObject({ field, maximum: 1000 });
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
    expect(refusal(() => parseEquipment(itemRecord({
      effects: [speedEffect(-1001)],
    })))).toMatchObject({
      name: 'CatalogFieldIntegerRangeError',
      field: 'effects[0].speedBonusFeet',
      minimum: -1000,
      maximum: 1000,
    });
    expect(() => parseEquipment(itemRecord({
      effects: [speedEffect(-1000)],
    }))).not.toThrow();
  });

  it('refuses item effect count 201', () => {
    const error = refusal(() => parseEquipment(itemRecord({
      effects: Array.from({ length: 201 }, () => ({
        kind: 'ability_override',
        ability: 'strength',
        maximum: 20,
        label: 'Counted effect',
        notes: null,
      })),
    })));
    expect(error).toBeInstanceOf(CatalogFieldRowCountError);
    expect(error).toMatchObject({ field: 'effects', maximum_rows: 200 });
  });

  it.each([
    ['name', 'name', 120, itemRecord({ name: 'n'.repeat(121) })],
    ['description', 'description', 4000, itemRecord({
      description: 'd'.repeat(4001),
    })],
    ['effect label', 'effects[0].label', 120, itemRecord({ effects: [{
      kind: 'ability_override', ability: 'strength', maximum: 20,
      label: 'l'.repeat(121), notes: null,
    }] })],
    ['effect notes', 'effects[0].notes', 2000, itemRecord({ effects: [{
      kind: 'ability_override', ability: 'strength', maximum: 20,
      label: 'Notes', notes: 'n'.repeat(2001),
    }] })],
    ['effect damage type', 'effects[0].damageType', 120, itemRecord({
      effects: [{
        kind: 'damage_resistance', damageType: 'd'.repeat(121),
        label: 'Resistance', notes: null,
      }],
    })],
  ] as const)(
    'refuses item $0 above its authoritative text bound',
    (_label, field, maximumLength, item) => {
      const error = refusal(() => parseEquipment(item));
      expect(error).toBeInstanceOf(CatalogFieldLengthError);
      expect(error).toMatchObject({
        field,
        maximum_length: maximumLength,
      });
    },
  );

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
    ['121-character name', 'name', 120, weaponRecord({
      name: 'n'.repeat(121),
    })],
    ['41-character damage dice', 'damage.dice', 40, weaponRecord({
      damage: { kind: 'dice', dice: 'd'.repeat(41) },
    })],
    ['41-character custom damage', 'damage.text', 40, weaponRecord({
      damage: { kind: 'custom', text: 'd'.repeat(41) },
    })],
    [
      '41-character versatile damage dice',
      'versatileDamage.dice',
      40,
      weaponRecord({ versatileDamage: { kind: 'dice', dice: 'd'.repeat(41) } }),
    ],
    [
      '41-character versatile custom damage',
      'versatileDamage.text',
      40,
      weaponRecord({ versatileDamage: { kind: 'custom', text: 'd'.repeat(41) } }),
    ],
    ['41-character damage type', 'damageType', 40, weaponRecord({
      damageType: 'd'.repeat(41),
    })],
    ['41-character ammunition kind', 'ammunitionKind', 40, weaponRecord({
      ammunitionKind: 'a'.repeat(41),
    })],
    ['501-character properties', 'otherProperties', 500, weaponRecord({
      otherProperties: 'p'.repeat(501),
    })],
  ] as const)(
    'refuses weapon $0 above WEAPON_TEXT_LIMITS',
    (_label, field, maximumLength, weapon) => {
      const error = refusal(() => parseEquipment(weapon));
      expect(error).toBeInstanceOf(CatalogFieldLengthError);
      expect(error).toMatchObject({ field, maximum_length: maximumLength });
    },
  );

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
    const error = refusal(() => parseEquipment(armorRecord({
      name: 'n'.repeat(121),
    })));
    expect(error).toBeInstanceOf(CatalogFieldLengthError);
    expect(error).toMatchObject({ field: 'name', maximum_length: 120 });
    expect(() => parseEquipment(armorRecord({
      name: 'n'.repeat(120),
    }))).not.toThrow();
  });

  it('refuses armorClass 0 and accepts armorClass 1 exactly', () => {
    expect(refusal(() => parseEquipment(armorRecord({ armorClass: 0 }))))
      .toMatchObject({
        name: 'CatalogFieldIntegerRangeError',
        field: 'armorClass',
        minimum: 1,
      });
    expect(() => parseEquipment(armorRecord({ armorClass: 1 }))).not.toThrow();
  });

  it('refuses strengthRequirement 0 and accepts 1 exactly', () => {
    expect(refusal(() => parseEquipment(armorRecord({
      strengthRequirement: 0,
    })))).toMatchObject({
      name: 'CatalogFieldNullableIntegerRangeError',
      field: 'strengthRequirement',
      minimum: 1,
    });
    expect(() => parseEquipment(armorRecord({
      strengthRequirement: 1,
    }))).not.toThrow();
  });

  it('refuses a shield Dexterity bonus and accepts none exactly', () => {
    expect(refusal(() => parseEquipment(armorRecord({
      category: 'shield',
      dexBonus: 'full',
      dexBonusMax: null,
      strengthRequirement: null,
    })))).toBeInstanceOf(CatalogShieldDexBonusError);
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
    const cases: Array<[unknown, Record<string, unknown>]> = [
      [{ record: {} }, {
        name: 'CatalogDocumentNotAListError', tier: 1, document_number: 1,
      }],
      [[1], { name: 'CatalogNonObjectRecordError' }],
      [[record({ identityKey: ' ' })], {
        name: 'CatalogFieldTypeError',
        field: 'identityKey',
        expected: 'non_empty_string',
      }],
      [[record({ versionKey: null })], {
        name: 'CatalogFieldTypeError',
        field: 'versionKey',
        expected: 'non_empty_string',
      }],
      [[record({ name: 1 })], {
        name: 'CatalogFieldTypeError',
        field: 'name',
        expected: 'non_empty_string',
      }],
      [[record({ edition: 2024 })], {
        name: 'CatalogFieldTypeError',
        field: 'edition',
        expected: 'non_empty_string',
      }],
      [[record({ edition: '2030' })], {
        name: 'CatalogFieldEnumError', field: 'edition', presence: 'required',
      }],
      [[record({ level: -1 })], {
        name: 'CatalogFieldIntegerRangeError',
        field: 'level',
        minimum: 0,
        maximum: 9,
      }],
      [[record({ level: 10 })], {
        name: 'CatalogFieldIntegerRangeError',
        field: 'level',
        minimum: 0,
        maximum: 9,
      }],
      [[record({ school: '\t' })], {
        name: 'CatalogFieldTypeError',
        field: 'school',
        expected: 'non_empty_string',
      }],
      [[record({ concentration: 0 })], {
        name: 'CatalogFieldTypeError',
        field: 'concentration',
        expected: 'boolean',
      }],
      [[record({ ritual: 'false' })], {
        name: 'CatalogFieldTypeError', field: 'ritual', expected: 'boolean',
      }],
      // OMISSION, not merely the wrong type — `JSON.stringify` drops an
      // `undefined` value, so these two documents carry no such key at all.
      // This is the premise F13's removal of the prose fallback rests on: the
      // importer never sees an ABSENT boolean to infer from, because a document
      // missing one is refused before it gets there.
      [[record({ concentration: undefined })], {
        name: 'CatalogFieldTypeError',
        field: 'concentration',
        expected: 'boolean',
      }],
      [[record({ ritual: undefined })], {
        name: 'CatalogFieldTypeError', field: 'ritual', expected: 'boolean',
      }],
      [[record({ attackModes: 'ranged_spell' })], {
        name: 'CatalogFieldTypeError', field: 'attackModes', expected: 'list',
      }],
      [[record({ saveAbilities: [1] })], {
        name: 'CatalogFieldTypeError',
        field: 'saveAbilities',
        expected: 'non_empty_string_items',
      }],
      [[record({ spellLists: null })], {
        name: 'CatalogFieldTypeError', field: 'spellLists', expected: 'list',
      }],
      [[record({ sourceBooks: [''] })], {
        name: 'CatalogFieldTypeError',
        field: 'sourceBooks',
        expected: 'non_empty_string_items',
      }],
      [[record({ effectReliabilityCategory: 'luck' })], {
        name: 'CatalogFieldEnumError',
        field: 'effectReliabilityCategory',
        presence: 'required',
      }],
    ];

    for (const [value, expected] of cases) {
      expect(
        refusal(() => parseCatalogDocuments([JSON.stringify(value)])),
        JSON.stringify(value),
      ).toMatchObject(expected);
    }
    // Not this module's refusal: the identity kernel refuses a name that
    // normalizes away, and it owns both that class and that sentence.
    expect(() => parseCatalogDocuments([
      JSON.stringify([record({ name: '---' })]),
    ])).toThrow('Content identity names must not be empty');
    expect(refusal(() => parseCatalogDocuments(['{']))).toMatchObject({
      name: 'CatalogDocumentJsonParseError',
      tier: 1,
      document_number: 1,
    });
    expect(refusal(() => parseCatalogDocuments(['{'])))
      .toBeInstanceOf(CatalogDocumentJsonParseError);
    expect(
      isCatalogImportParams({
        documents: [JSON.stringify([record()])],
        unexpected: true,
      }),
    ).toBe(false);
  });

  it('refuses surrounding whitespace on every spell locator at parse time', () => {
    for (const [field, value] of [
      ['identityKey', record({ identityKey: ' test-spell' })],
      ['versionKey', record({ versionKey: '2024:test-spell ' })],
      // The whole field, not the entry: the locator guard runs over the
      // already-decoded list and names the field the document wrote.
      ['spellLists', record({ spellLists: [' Wizard'] })],
    ] as const) {
      const error = refusal(
        () => parseCatalogDocuments([JSON.stringify([value])]),
      );
      expect(error, field).toBeInstanceOf(CatalogFieldWhitespaceError);
      expect(error, field).toMatchObject({ field });
    }
  });

  it('refuses surrounding whitespace on Tier 2 version keys at parse time', () => {
    const error = refusal(() => parseDescriptionDocuments([JSON.stringify([{
      versionKey: ' 2024:test-spell',
      _description: 'Description.',
    }])]));
    expect(error).toBeInstanceOf(CatalogFieldWhitespaceError);
    expect(error).toMatchObject({ field: 'versionKey' });
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

  it('refuses the bundled heading-only marker in Tier-1 subclass prose', () => {
    const subclass = {
      kind: 'subclass',
      contentKey: '2024:homebrew.unit:heading-only',
      parentClassKey: '2024:class:bard',
      name: 'Heading Only',
      edition: '2024',
      features: [
        { classLevel: 3, name: 'A Heading', description: '' },
      ],
    };

    const error = refusal(
      () => parseCatalogDocuments([JSON.stringify([subclass])]),
    );
    expect(error).toBeInstanceOf(CatalogFieldTypeError);
    expect(error).toMatchObject({
      field: 'features[0].description',
      expected: 'non_empty_string',
    });
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
    const conflict = refusal(() =>
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
    );
    expect(conflict).toBeInstanceOf(CatalogTierTwoDescriptionConflictError);
    expect(conflict).toMatchObject({ version_key: '2024:test-spell' });
  });
});
