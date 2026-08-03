import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../src/catalog/catalog-importer';
import {
  sqlConditionType,
  sqlCreatureSize,
  sqlCreatureType,
  sqlDamageType,
  sqlNullableDamageType,
  sqlNullableSpellSchoolList,
} from '../../src/db/codecs';
import { DatabaseContext } from '../../src/db/database';
import { rowContractError } from '../../src/domain/contracts/rows';
import { CatalogQueries } from '../../src/queries/catalog-queries';
import { openTestDatabase } from '../helpers/open-db';

let connection: Database | null = null;

async function database(): Promise<DatabaseContext> {
  connection = await openTestDatabase();
  return new DatabaseContext(connection);
}

function required<T>(value: T | null, label: string): T {
  if (value === null) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function character(db: DatabaseContext, name: string): number {
  return db.exec('INSERT INTO characters (name) VALUES (?)', [name])
    .lastInsertId;
}

function spellVersion(
  db: DatabaseContext,
  key: string,
  school = 'Evocation',
): number {
  const identityId = db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES (?, ?, ?)`,
    [`${key}:identity`, key, key.toLowerCase()],
  ).lastInsertId;
  return db.exec(
    `INSERT INTO spell_versions
       (content_key, spell_identity_id, display_name, rules_edition, level, school)
     VALUES (?, ?, ?, '2024', 1, ?)`,
    [key, identityId, key, school],
  ).lastInsertId;
}

function speciesTemplate(
  db: DatabaseContext,
  key: string,
  creatureType = 'Humanoid',
  size = 'Medium',
  alternateSize: string | null = null,
): number {
  return db.exec(
    `INSERT INTO species_templates
       (content_key, name, creature_type, size, alternate_size, base_speed_feet)
     VALUES (?, ?, ?, ?, ?, 30)`,
    [key, key, creatureType, size, alternateSize],
  ).lastInsertId;
}

function catalogRecord(school: string): Record<string, unknown> {
  return {
    identityKey: 'custom-school-identity',
    versionKey: '2024:homebrew.example:custom-school',
    name: 'Custom School Spell',
    edition: '2024',
    level: 1,
    school,
    castingTime: 'Action',
    range: '30 feet',
    components: 'V',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    attackModes: [],
    saveAbilities: [],
    effectReliabilityCategory: 'fixed_effect',
    spellLists: ['Wizard'],
    sourceBooks: ['Homebrew'],
    sourcePage: null,
    sourceSlug: null,
  };
}

afterEach(() => {
  connection?.close();
  connection = null;
});

describe('open and closed domain vocabularies', () => {
  it('round-trips an unknown spell school through catalog, codec, slot list and Zod rows', async () => {
    const db = await database();
    new CatalogImporter(db).import({
      documents: [JSON.stringify([catalogRecord('Chronomancy')])],
    });

    const spell = required(
      new CatalogQueries(db).read().spells[0] ?? null,
      'imported spell',
    );
    expect(spell.school).toBe('Chronomancy');
    const spellRow = required(
      db.oneRaw(
        'SELECT * FROM spell_versions WHERE content_key = ?',
        ['2024:homebrew.example:custom-school'],
      ),
      'spell row',
    );
    expect(
      rowContractError('spell_versions', spellRow, 'catalog spell'),
    ).toBeNull();

    const characterId = character(db, 'School Keeper');
    const sourceId = db.exec(
      `INSERT INTO character_source_instances
         (character_id, instance_uuid, source_type, display_name)
       VALUES (?, 'school-source', 'feat', 'School Source')`,
      [characterId],
    ).lastInsertId;
    const slotId = db.exec(
      `INSERT INTO spell_selection_slots
         (character_id, source_instance_id, slot_key, rule_key, bucket,
          eligibility_kind, allowed_schools)
       VALUES (?, ?, 'school-slot', 'school-rule', 'known',
               'choice_from_query', ?)`,
      [characterId, sourceId, JSON.stringify(['Chronomancy'])],
    ).lastInsertId;
    const schools = required(
      db.one(
        'SELECT allowed_schools FROM spell_selection_slots WHERE id = ?',
        [slotId],
        (row) => sqlNullableSpellSchoolList(row, 'allowed_schools'),
      ),
      'school list',
    );
    expect(schools).toEqual(['Chronomancy']);
    const slotRow = required(
      db.oneRaw('SELECT * FROM spell_selection_slots WHERE id = ?', [slotId]),
      'slot row',
    );
    expect(
      rowContractError('spell_selection_slots', slotRow, 'school slot'),
    ).toBeNull();
  });

  it('keeps authored damage types open and refuses unknowns in bundled-only weapon templates', async () => {
    const db = await database();
    const versionId = spellVersion(db, '2024:steam-spell');
    db.exec(
      `INSERT INTO spell_version_damage_types
         (spell_version_id, damage_type) VALUES (?, 'Steam')`,
      [versionId],
    );
    const pivot = required(
      db.one(
        `SELECT damage_type FROM spell_version_damage_types
         WHERE spell_version_id = ?`,
        [versionId],
        (row) => sqlDamageType(row, 'damage_type'),
      ),
      'damage pivot',
    );
    expect(pivot).toBe('Steam');
    const pivotRow = required(
      db.oneRaw(
        `SELECT * FROM spell_version_damage_types
         WHERE spell_version_id = ?`,
        [versionId],
      ),
      'damage pivot row',
    );
    expect(
      rowContractError(
        'spell_version_damage_types',
        pivotRow,
        'damage pivot',
      ),
    ).toBeNull();

    const characterId = character(db, 'Steam Smith');
    const weaponId = db.exec(
      `INSERT INTO character_weapons (character_id, name, damage_type)
       VALUES (?, 'Steam Blade', 'Steam')`,
      [characterId],
    ).lastInsertId;
    const weaponDamage = required(
      db.one(
        'SELECT damage_type FROM character_weapons WHERE id = ?',
        [weaponId],
        (row) => sqlNullableDamageType(row, 'damage_type'),
      ),
      'weapon damage',
    );
    expect(weaponDamage).toBe('Steam');
    expect(
      rowContractError(
        'character_weapons',
        required(
          db.oneRaw('SELECT * FROM character_weapons WHERE id = ?', [weaponId]),
          'weapon row',
        ),
        'character weapon',
      ),
    ).toBeNull();

    expect(() =>
      db.exec(
        `INSERT INTO weapon_templates
           (content_key, name, srd_group, damage_kind, damage_dice, damage_type,
            mastery_property)
         VALUES ('weapon:steam', 'Steam Blade', 'simple_melee', 'dice', '1d6',
                 'Steam', 'Sap')`,
      ),
    ).toThrow(/CHECK constraint failed: weapon_templates_damage_type_check/u);

    const templateId = speciesTemplate(db, 'species:damage-null');
    const traitId = db.exec(
      `INSERT INTO species_template_traits
         (species_template_id, sort_order, name, description)
       VALUES (?, 1, 'Resistance', 'A resistance.')`,
      [templateId],
    ).lastInsertId;
    expect(() =>
      db.exec(
        `INSERT INTO species_template_trait_effects
           (species_template_trait_id, sort_order, effect_kind, damage_type, label)
         VALUES (?, 1, 'damage_resistance', NULL, 'Open resistance')`,
        [traitId],
      ),
    ).not.toThrow();
    expect(() =>
      db.exec(
        `INSERT INTO species_template_trait_effects
           (species_template_trait_id, sort_order, effect_kind, damage_type, label)
         VALUES (?, 2, 'damage_resistance', 'Steam', 'Steam resistance')`,
        [traitId],
      ),
    ).not.toThrow();

    const effectId = db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, damage_type, label)
       VALUES (?, 1, 'damage_resistance', 'Steam', 'Steam Ward')`,
      [characterId],
    ).lastInsertId;
    expect(
      required(
        db.one(
          'SELECT damage_type FROM character_effects WHERE id = ?',
          [effectId],
          (row) => sqlNullableDamageType(row, 'damage_type'),
        ),
        'effect damage',
      ),
    ).toBe('Steam');
  });

  it('round-trips an unknown condition from a user-importable spell pivot', async () => {
    const db = await database();
    const versionId = spellVersion(db, '2024:dazed-spell');
    db.exec(
      `INSERT INTO spell_version_conditions
         (spell_version_id, condition_type) VALUES (?, 'Dazed')`,
      [versionId],
    );
    expect(
      required(
        db.one(
          `SELECT condition_type FROM spell_version_conditions
           WHERE spell_version_id = ?`,
          [versionId],
          (row) => sqlConditionType(row, 'condition_type'),
        ),
        'condition pivot',
      ),
    ).toBe('Dazed');
    expect(
      rowContractError(
        'spell_version_conditions',
        required(
          db.oneRaw(
            `SELECT * FROM spell_version_conditions
             WHERE spell_version_id = ?`,
            [versionId],
          ),
          'condition pivot row',
        ),
        'condition pivot',
      ),
    ).toBeNull();
  });

  it('keeps character and authored-template creature types open', async () => {
    const db = await database();
    const characterId = character(db, 'Clockwork Hero');
    const speciesId = db.exec(
      `INSERT INTO character_species
         (character_id, name, creature_type, size)
       VALUES (?, 'Clockwork Kin', 'Clockwork', 'Medium')`,
      [characterId],
    ).lastInsertId;
    expect(
      required(
        db.one(
          'SELECT creature_type FROM character_species WHERE id = ?',
          [speciesId],
          (row) => sqlCreatureType(row, 'creature_type'),
        ),
        'creature type',
      ),
    ).toBe('Clockwork');
    expect(
      rowContractError(
        'character_species',
        required(
          db.oneRaw('SELECT * FROM character_species WHERE id = ?', [speciesId]),
          'character species row',
        ),
        'character species',
      ),
    ).toBeNull();
    expect(() =>
      speciesTemplate(db, 'species:clockwork', 'Clockwork'),
    ).not.toThrow();
  });

  it('keeps character and authored-template sizes open', async () => {
    const db = await database();
    const characterId = character(db, 'Minuscule Hero');
    const speciesId = db.exec(
      `INSERT INTO character_species
         (character_id, name, creature_type, size)
       VALUES (?, 'Minuscule Kin', 'Humanoid', 'Minuscule')`,
      [characterId],
    ).lastInsertId;
    expect(
      required(
        db.one(
          'SELECT size FROM character_species WHERE id = ?',
          [speciesId],
          (row) => sqlCreatureSize(row, 'size'),
        ),
        'creature size',
      ),
    ).toBe('Minuscule');

    expect(() =>
      speciesTemplate(db, 'species:null-alternate', 'Humanoid', 'Medium', null),
    ).not.toThrow();
    expect(() =>
      speciesTemplate(db, 'species:minuscule', 'Humanoid', 'Minuscule'),
    ).not.toThrow();
    expect(() =>
      speciesTemplate(
        db,
        'species:minuscule-alternate',
        'Humanoid',
        'Medium',
        'Minuscule',
      ),
    ).not.toThrow();
  });
});
