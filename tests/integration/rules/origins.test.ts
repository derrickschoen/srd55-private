import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  ensureBundledOriginContent,
  hasBundledOriginContent,
  seedOriginContent,
} from '../../../src/rules/origins-srd';
import {
  backgroundFromTemplate,
  characterSpeciesTraits,
  speciesFromTemplate,
  speciesTraitFromTemplate,
  type BackgroundTemplateRow,
  type SpeciesTemplateRow,
  type SpeciesTemplateTraitRow,
} from '../../../src/rules/origins';
import {
  speciesHitPoints,
  speciesWalkingSpeedFeet,
  summariseSpeciesEffects,
} from '../../../src/rules/species-effects';
import { openTestDatabase } from '../../helpers/open-db';

describe('origins content seeding and the D1b copy', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedOriginContent(db);
  });

  afterEach(() => connection.close());

  function character(name = 'Origin Character'): number {
    return db.exec('INSERT INTO characters (name) VALUES (?)', [name])
      .lastInsertId;
  }

  function speciesTemplate(name: string): SpeciesTemplateRow {
    const row = db.one('SELECT * FROM species_templates WHERE name = ?', [name]);
    if (row === null) {
      throw new Error(`No seeded species template named ${name}.`);
    }
    return row as unknown as SpeciesTemplateRow;
  }

  function templateTraits(templateId: number): SpeciesTemplateTraitRow[] {
    return db.all(
      `SELECT * FROM species_template_traits
        WHERE species_template_id = ? ORDER BY sort_order`,
      [templateId],
    ) as unknown as SpeciesTemplateTraitRow[];
  }

  function backgroundTemplate(name: string): BackgroundTemplateRow {
    const row = db.one('SELECT * FROM background_templates WHERE name = ?', [
      name,
    ]);
    if (row === null) {
      throw new Error(`No seeded background template named ${name}.`);
    }
    return row as unknown as BackgroundTemplateRow;
  }

  /** The whole of picking a species, as a command would perform it. */
  function pickSpecies(characterId: number, name: string): void {
    const template = speciesTemplate(name);
    const fields = speciesFromTemplate(template);
    db.exec(
      `INSERT INTO character_species (
         character_id, name, creature_type, size, base_speed_feet, notes
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        fields.name,
        fields.creature_type,
        fields.size,
        fields.base_speed_feet,
        fields.notes,
      ],
    );
    for (const trait of templateTraits(template.id)) {
      const copy = speciesTraitFromTemplate(trait);
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, description, effect_kind,
           effect_damage_type, effect_hit_points_flat,
           effect_hit_points_per_level, effect_speed_bonus_feet, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          copy.sort_order,
          copy.name,
          copy.description,
          copy.effect_kind,
          copy.effect_damage_type,
          copy.effect_hit_points_flat,
          copy.effect_hit_points_per_level,
          copy.effect_speed_bonus_feet,
          copy.notes,
        ],
      );
    }
  }

  it('seeds nine species with 33 traits and four backgrounds', () => {
    expect(
      Number(db.scalar('SELECT count(*) FROM species_templates')),
    ).toBe(9);
    expect(
      Number(db.scalar('SELECT count(*) FROM species_template_traits')),
    ).toBe(33);
    expect(
      Number(db.scalar('SELECT count(*) FROM background_templates')),
    ).toBe(4);
    // Printed order is dense and one-based, per species.
    expect(
      db.all(
        `SELECT s.name, group_concat(t.sort_order) AS orders
           FROM species_templates s
           JOIN species_template_traits t ON t.species_template_id = s.id
          GROUP BY s.id ORDER BY s.id`,
      ),
    ).toEqual([
      { name: 'Dragonborn', orders: '1,2,3,4,5' },
      { name: 'Dwarf', orders: '1,2,3,4' },
      { name: 'Elf', orders: '1,2,3,4,5' },
      { name: 'Gnome', orders: '1,2,3' },
      { name: 'Goliath', orders: '1,2,3' },
      { name: 'Halfling', orders: '1,2,3,4' },
      { name: 'Human', orders: '1,2,3' },
      { name: 'Orc', orders: '1,2,3' },
      { name: 'Tiefling', orders: '1,2,3' },
    ]);
  });

  it('is idempotent, and replaces traits rather than accumulating them', () => {
    expect(hasBundledOriginContent(db)).toBe(true);
    expect(ensureBundledOriginContent(db)).toBe(false);
    seedOriginContent(db);
    expect(
      Number(db.scalar('SELECT count(*) FROM species_template_traits')),
    ).toBe(33);
    expect(Number(db.scalar('SELECT count(*) FROM species_templates'))).toBe(9);
  });

  it('repairs a database holding MORE traits than the extract prints', () => {
    // The case a global `count(*) >= expected` cannot see, and the first draft
    // used exactly that. If an extract change REMOVES a trait, the stale rows
    // still satisfy `>=`, so the guard reports health and the catalog is never
    // repaired. Simulated in the equivalent direction — a surplus row — because
    // the parse is the fixed side here.
    const dwarfId = Number(
      db.scalar("SELECT id FROM species_templates WHERE name = 'Dwarf'"),
    );
    db.exec(
      `INSERT INTO species_template_traits (
         species_template_id, sort_order, name, description, created_at, updated_at
       ) VALUES (?, 99, 'Stale Trait', 'Left behind by an older extract.', ?, ?)`,
      [dwarfId, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
    );
    expect(
      Number(db.scalar('SELECT count(*) FROM species_template_traits')),
    ).toBe(34);
    expect(hasBundledOriginContent(db)).toBe(false);
    expect(ensureBundledOriginContent(db)).toBe(true);
    expect(
      Number(db.scalar('SELECT count(*) FROM species_template_traits')),
    ).toBe(33);
    expect(
      Number(
        db.scalar(
          "SELECT count(*) FROM species_template_traits WHERE name = 'Stale Trait'",
        ),
      ),
    ).toBe(0);
  });

  it('repairs a database whose trait rows were lost', () => {
    // A key-only health check would call this database healthy. The count-based
    // one repairs it, which is why `hasBundledOriginContent` counts.
    db.exec('DELETE FROM species_template_traits');
    expect(hasBundledOriginContent(db)).toBe(false);
    expect(ensureBundledOriginContent(db)).toBe(true);
    expect(
      Number(db.scalar('SELECT count(*) FROM species_template_traits')),
    ).toBe(33);
  });

  /* --- D1b ---------------------------------------------------------------- */

  it('copies a template onto a character by value, with no template id', () => {
    const characterId = character();
    pickSpecies(characterId, 'Dwarf');

    expect(
      db.one(
        `SELECT name, creature_type, size, base_speed_feet, notes
           FROM character_species WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      name: 'Dwarf',
      creature_type: 'Humanoid',
      size: 'Medium',
      base_speed_feet: 30,
      notes: null,
    });
    // THE CENTRAL D1b ASSERTION: there is no column on either character table
    // that could hold a template id, so there is nothing to reach back with.
    const columns = (table: string) =>
      db.all(`PRAGMA table_info("${table}")`).map((row) => String(row.name));
    for (const table of ['character_species', 'character_species_traits']) {
      expect(columns(table), table).not.toContain('species_template_id');
      expect(columns(table), table).not.toContain('content_key');
      expect(columns(table), table).not.toContain('rules_edition');
    }
    expect(columns('character_background')).not.toContain(
      'background_template_id',
    );
  });

  it('drops the alternate size, because the character has chosen', () => {
    const characterId = character();
    pickSpecies(characterId, 'Human');
    expect(speciesTemplate('Human').alternate_size).toBe('Small');
    expect(
      db.all('PRAGMA table_info("character_species")').map((row) =>
        String(row.name),
      ),
    ).not.toContain('alternate_size');
    expect(
      db.one('SELECT size FROM character_species WHERE character_id = ?', [
        characterId,
      ]),
    ).toEqual({ size: 'Medium' });
  });

  it('editing the copy cannot reach the catalog, and vice versa', () => {
    const characterId = character();
    pickSpecies(characterId, 'Dwarf');

    db.exec(
      `UPDATE character_species
          SET name = 'Deep Dwarf', base_speed_feet = 25
        WHERE character_id = ?`,
      [characterId],
    );
    db.exec(
      `UPDATE character_species_traits
          SET description = 'Rewritten at the table.'
        WHERE character_id = ? AND name = 'Stonecunning'`,
      [characterId],
    );
    // The catalog is untouched...
    expect(speciesTemplate('Dwarf')).toMatchObject({
      name: 'Dwarf',
      base_speed_feet: 30,
    });
    expect(
      db.scalar(
        `SELECT description FROM species_template_traits
          WHERE name = 'Stonecunning'`,
      ),
    ).toContain('Tremorsense');

    // ...and re-seeding the catalog does not touch the character.
    seedOriginContent(db);
    expect(
      db.one(
        'SELECT name, base_speed_feet FROM character_species WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual({ name: 'Deep Dwarf', base_speed_feet: 25 });
    expect(
      db.scalar(
        `SELECT description FROM character_species_traits
          WHERE character_id = ? AND name = 'Stonecunning'`,
        [characterId],
      ),
    ).toBe('Rewritten at the table.');
  });

  it('carries the mechanical payload across the copy, as columns', () => {
    const characterId = character();
    pickSpecies(characterId, 'Dwarf');
    expect(
      db.all(
        `SELECT name, effect_kind, effect_damage_type, effect_hit_points_flat,
                effect_hit_points_per_level, effect_speed_bonus_feet
           FROM character_species_traits
          WHERE character_id = ? ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([
      {
        name: 'Darkvision',
        effect_kind: null,
        effect_damage_type: null,
        effect_hit_points_flat: null,
        effect_hit_points_per_level: null,
        effect_speed_bonus_feet: null,
      },
      {
        name: 'Dwarven Resilience',
        effect_kind: 'damage_resistance',
        effect_damage_type: 'Poison',
        effect_hit_points_flat: null,
        effect_hit_points_per_level: null,
        effect_speed_bonus_feet: null,
      },
      {
        name: 'Dwarven Toughness',
        effect_kind: 'hp_modifier',
        effect_damage_type: null,
        effect_hit_points_flat: 0,
        effect_hit_points_per_level: 1,
        effect_speed_bonus_feet: null,
      },
      {
        name: 'Stonecunning',
        effect_kind: null,
        effect_damage_type: null,
        effect_hit_points_flat: null,
        effect_hit_points_per_level: null,
        effect_speed_bonus_feet: null,
      },
    ]);
  });

  it('derives from the character’s own rows, so an edit changes the answer', () => {
    const characterId = character();
    pickSpecies(characterId, 'Dwarf');
    // A level-5 Dwarf gains 5 — the trait is per-level with no flat half.
    expect(speciesHitPoints(characterSpeciesTraits(db, characterId), 5)).toBe(5);
    expect(
      speciesWalkingSpeedFeet(30, characterSpeciesTraits(db, characterId)),
    ).toBe(30);

    // The user decides their Dwarf is tougher still. Nothing is cached, so the
    // next read is the new answer (D11).
    db.exec(
      `UPDATE character_species_traits
          SET effect_hit_points_flat = 3
        WHERE character_id = ? AND name = 'Dwarven Toughness'`,
      [characterId],
    );
    expect(speciesHitPoints(characterSpeciesTraits(db, characterId), 5)).toBe(8);

    // ...and turning the trait into prose removes its effect entirely, without
    // deleting the trait or its text.
    db.exec(
      `UPDATE character_species_traits
          SET effect_kind = NULL, effect_hit_points_flat = NULL,
              effect_hit_points_per_level = NULL
        WHERE character_id = ? AND name = 'Dwarven Toughness'`,
      [characterId],
    );
    expect(speciesHitPoints(characterSpeciesTraits(db, characterId), 5)).toBe(0);
    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM character_species_traits WHERE character_id = ?',
          [characterId],
        ),
      ),
    ).toBe(4);
  });

  it('refuses an orphaned payload at the database, not only in code', () => {
    const characterId = character();
    // The CHECK that stops a free-text trait carrying mechanics. This is the
    // row a share import or a hand-edited image would try to write.
    expect(() =>
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, effect_kind, effect_hit_points_flat
         ) VALUES (?, 1, 'Prose', NULL, 5)`,
        [characterId],
      ),
    ).toThrow(/character_species_traits_hit_points_kind_check/);
    expect(() =>
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, effect_kind
         ) VALUES (?, 1, 'Empty promise', 'hp_modifier')`,
        [characterId],
      ),
    ).toThrow(/character_species_traits_hp_modifier_payload_check/);
    expect(() =>
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, effect_kind
         ) VALUES (?, 1, 'Unknown', 'ability_score_increase')`,
        [characterId],
      ),
    ).toThrow(/character_species_traits_effect_kind_check/);
  });

  it('holds a character to one species and one background', () => {
    const characterId = character();
    pickSpecies(characterId, 'Elf');
    // SQLite names the COLUMNS of a violated unique index, not the index, so
    // the assertion matches what it actually says.
    expect(() => pickSpecies(characterId, 'Orc')).toThrow(
      /UNIQUE constraint failed: character_species\.character_id/,
    );
    db.exec(
      `INSERT INTO character_background (character_id, name)
       VALUES (?, 'Sage')`,
      [characterId],
    );
    expect(() =>
      db.exec(
        `INSERT INTO character_background (character_id, name)
         VALUES (?, 'Acolyte')`,
        [characterId],
      ),
    ).toThrow(/UNIQUE constraint failed: character_background\.character_id/);
  });

  it('marks the granted-spell traits without minting a single spell', () => {
    const characterId = character();
    pickSpecies(characterId, 'Tiefling');
    const summary = summariseSpeciesEffects(
      characterSpeciesTraits(db, characterId),
    );
    expect(summary.grantedSpellTraits).toEqual([
      'Fiendish Legacy',
      'Otherworldly Presence',
    ]);
    // THE MARKER IS NOT A PARALLEL PATH. Copying a species writes no selection
    // slot; slots come from a `character_source_instances` row and
    // `src/grants/`, which this test deliberately does not create.
    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM spell_selection_slots WHERE character_id = ?',
          [characterId],
        ),
      ),
    ).toBe(0);
  });

  /* --- backgrounds -------------------------------------------------------- */

  it('copies a background by value and applies none of its ability scores', () => {
    const characterId = character();
    const template = backgroundTemplate('Soldier');
    const fields = backgroundFromTemplate(template);
    db.exec(
      `INSERT INTO character_background (
         character_id, name, ability_score_1, ability_score_2, ability_score_3,
         feat_name, skill_proficiency_1, skill_proficiency_2, tool_proficiency,
         equipment_option_a, equipment_option_b, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        fields.name,
        fields.ability_score_1,
        fields.ability_score_2,
        fields.ability_score_3,
        fields.feat_name,
        fields.skill_proficiency_1,
        fields.skill_proficiency_2,
        fields.tool_proficiency,
        fields.equipment_option_a,
        fields.equipment_option_b,
        fields.notes,
      ],
    );
    expect(
      db.one(
        `SELECT name, ability_score_1, feat_name, skill_proficiency_1,
                tool_proficiency, equipment_option_b
           FROM character_background WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      name: 'Soldier',
      ability_score_1: 'Strength',
      feat_name: 'Savage Attacker',
      skill_proficiency_1: 'Athletics',
      tool_proficiency: 'Choose one kind of Gaming Set',
      equipment_option_b: '50 GP',
    });
    // THE TEMPLATE SUGGESTS AND THE CHARACTER OWNS THE VALUE. Nothing wrote an
    // ability score, so the character still has the defaults they started with.
    expect(
      db.one(
        'SELECT strength, dexterity, constitution FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({ strength: 10, dexterity: 10, constitution: 10 });
  });

  it('deletes a character’s origin with the character', () => {
    const characterId = character();
    pickSpecies(characterId, 'Gnome');
    db.exec(
      `INSERT INTO character_background (character_id, name)
       VALUES (?, 'Sage')`,
      [characterId],
    );
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('DELETE FROM characters WHERE id = ?', [characterId]);
    for (const table of [
      'character_species',
      'character_species_traits',
      'character_background',
    ]) {
      expect(
        Number(db.scalar(`SELECT count(*) FROM ${table}`)),
        table,
      ).toBe(0);
    }
  });
});
