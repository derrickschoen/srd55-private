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
  characterEffects,
  effectsFromTemplate,
  speciesFromTemplate,
  speciesTraitFromTemplate,
  type BackgroundTemplateRow,
  type SpeciesTemplateRow,
  type SpeciesTemplateTraitEffectRow,
  type SpeciesTemplateTraitRow,
} from '../../../src/rules/origins';
import {
  effectHitPoints,
  summariseEffects,
  walkingSpeedFeet,
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

  function templateTraitEffects(
    traitId: number,
  ): SpeciesTemplateTraitEffectRow[] {
    return db.all(
      `SELECT * FROM species_template_trait_effects
        WHERE species_template_trait_id = ? ORDER BY sort_order`,
      [traitId],
    ) as unknown as SpeciesTemplateTraitEffectRow[];
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
    // TWO COPIES, NOT ONE, AND THAT IS THE INVERSION. The trait's TEXT becomes
    // a `character_species_traits` row; its EFFECTS become `character_effects`
    // rows labelled with the trait's name. A trait granting two effects writes
    // two rows here and needs no special case, which is precisely what the
    // single `effect_kind` column could not do.
    let effectOrder = 0;
    for (const trait of templateTraits(template.id)) {
      const copy = speciesTraitFromTemplate(trait);
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, description, notes
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          characterId,
          copy.sort_order,
          copy.name,
          copy.description,
          copy.notes,
        ],
      );
      for (const effect of effectsFromTemplate(
        trait.name,
        templateTraitEffects(trait.id),
      )) {
        effectOrder += 1;
        db.exec(
          `INSERT INTO character_effects (
             character_id, sort_order, effect_kind, damage_type,
             hit_points_flat, hit_points_per_level, speed_bonus_feet,
             source_instance_id, label, notes
           ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
          [
            characterId,
            effectOrder,
            effect.effect_kind,
            effect.damage_type,
            effect.hit_points_flat,
            effect.hit_points_per_level,
            effect.speed_bonus_feet,
            effect.label,
            effect.notes,
          ],
        );
      }
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

  it('carries the mechanical payload across the copy, as EFFECT ROWS', () => {
    const characterId = character();
    pickSpecies(characterId, 'Dwarf');
    // The trait rows are TEXT ONLY now. There is no column here that could
    // hold an effect, which is what stops a trait being the thing an effect
    // hangs from — and what removes the one-effect-per-trait cap.
    const traitColumns = db
      .all('PRAGMA table_info("character_species_traits")')
      .map((row) => String(row.name));
    for (const column of [
      'effect_kind',
      'effect_damage_type',
      'effect_hit_points_flat',
      'effect_hit_points_per_level',
      'effect_speed_bonus_feet',
    ]) {
      expect(traitColumns).not.toContain(column);
    }
    expect(
      db.all(
        `SELECT name FROM character_species_traits
          WHERE character_id = ? ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([
      { name: 'Darkvision' },
      { name: 'Dwarven Resilience' },
      { name: 'Dwarven Toughness' },
      { name: 'Stonecunning' },
    ]);
    // TWO effect rows from four traits — the other two are free text and now
    // produce NOTHING rather than a row of five nulls. Each carries the
    // granting trait's name as its label, which is how the sheet can say what
    // an unchosen resistance is waiting on.
    expect(
      db.all(
        `SELECT sort_order, effect_kind, damage_type, hit_points_flat,
                hit_points_per_level, speed_bonus_feet, source_instance_id, label
           FROM character_effects
          WHERE character_id = ? ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([
      {
        sort_order: 1,
        effect_kind: 'damage_resistance',
        damage_type: 'Poison',
        hit_points_flat: null,
        hit_points_per_level: null,
        speed_bonus_feet: null,
        // NULL, and that is the COMMON case rather than an edge: nothing in
        // `src/` writes `species_definitions`, so a character who picked a
        // bundled SRD species has no species source instance to point at.
        source_instance_id: null,
        label: 'Dwarven Resilience',
      },
      {
        sort_order: 2,
        effect_kind: 'hp_modifier',
        damage_type: null,
        hit_points_flat: 0,
        hit_points_per_level: 1,
        speed_bonus_feet: null,
        source_instance_id: null,
        label: 'Dwarven Toughness',
      },
    ]);
    // AND THE COPY DOES NOT OFFER A `sort_order` AT ALL. The two rows above are
    // 1 and 2 because the writing LOOP counted them; the template's own numbers
    // are both 1, because each trait declares one effect and numbers it within
    // itself. A returned number that is correct only when the whole species has
    // one effect is a number some future caller will use.
    const trait = db.one(
      `SELECT trait.id FROM species_template_traits AS trait
       INNER JOIN species_templates AS template
         ON template.id = trait.species_template_id
       WHERE template.name = 'Dwarf' AND trait.name = 'Dwarven Toughness'`,
    );
    const copied = effectsFromTemplate(
      'Dwarven Toughness',
      templateTraitEffects(Number(trait?.id)),
    );
    expect(copied).toHaveLength(1);
    expect(Object.hasOwn(copied[0] as object, 'sort_order')).toBe(false);
    // The template's ordering is not lost — it is the position in this array,
    // which is what the writing loop turns into the number.
    expect(copied[0]).toEqual({
      effect_kind: 'hp_modifier',
      damage_type: null,
      hit_points_flat: 0,
      hit_points_per_level: 1,
      speed_bonus_feet: null,
      label: 'Dwarven Toughness',
      notes: null,
    });
  });

  it('records the Tiefling’s resistance, which the old model dropped', () => {
    // THE DEFECT, END TO END AND THROUGH THE DATABASE. Fiendish Legacy grants a
    // Resistance and a cantrip; the trait row had one `effect_kind` column, it
    // held the spell marker, and the resistance was recorded nowhere. It is a
    // row now, and it reads exactly like the Dragonborn's.
    const tiefling = character('Tiefling');
    pickSpecies(tiefling, 'Tiefling');
    expect(
      summariseEffects(characterEffects(db, tiefling))
        .unchosenDamageResistances,
    ).toEqual(['Fiendish Legacy']);

    const dragonborn = character('Dragonborn');
    pickSpecies(dragonborn, 'Dragonborn');
    expect(
      summariseEffects(characterEffects(db, dragonborn))
        .unchosenDamageResistances,
    ).toEqual(['Damage Resistance']);
  });

  it('derives from the character’s own rows, so an edit changes the answer', () => {
    const characterId = character();
    pickSpecies(characterId, 'Dwarf');
    // A level-5 Dwarf gains 5 — the effect is per-level with no flat half.
    expect(effectHitPoints(characterEffects(db, characterId), 5)).toBe(5);
    expect(walkingSpeedFeet(30, characterEffects(db, characterId))).toBe(30);

    // The user decides their Dwarf is tougher still. Nothing is cached, so the
    // next read is the new answer (D11).
    db.exec(
      `UPDATE character_effects
          SET hit_points_flat = 3
        WHERE character_id = ? AND label = 'Dwarven Toughness'`,
      [characterId],
    );
    expect(effectHitPoints(characterEffects(db, characterId), 5)).toBe(8);

    // ...and DELETING the effect removes it entirely, without touching the
    // trait or its text. Under the old model this was an UPDATE nulling five
    // columns on the trait row; separating the two is what lets a user drop a
    // mechanic while keeping the prose that explains it.
    db.exec(
      `DELETE FROM character_effects
        WHERE character_id = ? AND label = 'Dwarven Toughness'`,
      [characterId],
    );
    expect(effectHitPoints(characterEffects(db, characterId), 5)).toBe(0);
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
    // The CHECKs that stop an effect carrying a payload belonging to another
    // kind. These are the rows a share import or a hand-edited image would try
    // to write, and they moved table when the model was inverted — the
    // constraints themselves are unchanged.
    expect(() =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, label, hit_points_flat
         ) VALUES (?, 1, 'damage_resistance', 'Prose', 5)`,
        [characterId],
      ),
    ).toThrow(/character_effects_hit_points_kind_check/);
    expect(() =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, label
         ) VALUES (?, 1, 'hp_modifier', 'Empty promise')`,
        [characterId],
      ),
    ).toThrow(/character_effects_hp_modifier_payload_check/);
    expect(() =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, label
         ) VALUES (?, 1, 'ability_score_increase', 'Unknown')`,
        [characterId],
      ),
    ).toThrow(/character_effects_kind_check/);
    // And the RETIRED member, which the boundary still reads off an old link
    // but which must never become a stored row.
    expect(() =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, label
         ) VALUES (?, 1, 'granted_spells', 'Fiendish Legacy')`,
        [characterId],
      ),
    ).toThrow(/character_effects_kind_check/);
  });

  it('refuses an effect attached to another character’s source instance', () => {
    // The composite foreign key, which a bare `source_instance_id` would not
    // give: `PRAGMA foreign_key_check` proves the referenced ROW EXISTS and
    // says nothing about WHOSE it is.
    db.exec('PRAGMA foreign_keys = ON');
    const mine = character('Mine');
    const theirs = character('Theirs');
    const theirSource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, ?, 'feat', 'Their feat')`,
      [theirs, crypto.randomUUID()],
    ).lastInsertId;
    expect(() =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, label, source_instance_id
         ) VALUES (?, 1, 'damage_resistance', 'Stolen', ?)`,
        [mine, theirSource],
      ),
    ).toThrow(/FOREIGN KEY constraint failed/);
    // ...and the same row on its OWN character is accepted, so the constraint
    // is refusing the crossing rather than the reference.
    const mySource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, ?, 'feat', 'My feat')`,
      [mine, crypto.randomUUID()],
    ).lastInsertId;
    expect(() =>
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, label, source_instance_id
         ) VALUES (?, 1, 'damage_resistance', 'Granted', ?)`,
        [mine, mySource],
      ),
    ).not.toThrow();
    // Removing the feat removes what the feat granted.
    db.exec('DELETE FROM character_source_instances WHERE id = ?', [mySource]);
    expect(
      Number(
        db.scalar('SELECT count(*) FROM character_effects WHERE character_id = ?', [
          mine,
        ]),
      ),
    ).toBe(0);
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

  it('mints no spell and no spell EFFECT for a species that grants spells', () => {
    // THE RETIRED MARKER, ASSERTED AS ABSENT RATHER THAN MISSED. Three traits
    // used to carry `granted_spells`; the vocabulary no longer has the member,
    // and nothing was lost by removing it — the spells come from a
    // `character_source_instances` row and `src/grants/`, which this test
    // deliberately does not create, exactly as before.
    const characterId = character();
    pickSpecies(characterId, 'Tiefling');
    const effects = characterEffects(db, characterId);
    expect(effects.map((effect) => effect.effect_kind)).toEqual([
      'damage_resistance',
    ]);
    // No parallel storage was built for the spell half.
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
      'character_effects',
    ]) {
      expect(
        Number(db.scalar(`SELECT count(*) FROM ${table}`)),
        table,
      ).toBe(0);
    }
  });
});
