import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  ClassProgressionLookup,
  seedClassProgressions,
} from '../../../src/rules/class-progression-lookup';
import { openTestDatabase } from '../../helpers/open-db';


describe('persisted class progression catalog', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
  });

  afterEach(() => {
    connection.close();
  });

  it('persists twelve complete class tables and two complete subclass tables', () => {
    expect(db.scalar('SELECT count(*) FROM class_definitions')).toBe(12);
    expect(db.scalar('SELECT count(*) FROM class_progressions')).toBe(240);
    expect(db.scalar('SELECT count(*) FROM subclass_definitions')).toBe(2);
    expect(db.scalar('SELECT count(*) FROM subclass_progressions')).toBe(40);

    const classCoverage = db.allRaw(`
      SELECT class.name, count(*) AS rows, min(class_level) AS first_level,
        max(class_level) AS last_level
      FROM class_progressions progression
      JOIN class_definitions class ON class.id = progression.class_definition_id
      GROUP BY class.id
      ORDER BY class.name
    `);
    expect(classCoverage).toHaveLength(12);
    expect(classCoverage.every((row) =>
      row.rows === 20 && row.first_level === 1 && row.last_level === 20,
    )).toBe(true);
  });

  it('persists base-class metadata with third-caster rules only on subclasses', () => {
    expect(
      db.allRaw(`
        SELECT name, spellcasting_ability, progression_type, caster_fraction,
          caster_rounding
        FROM class_definitions
        ORDER BY name
      `),
    ).toEqual([
      { name: 'Barbarian', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Bard', spellcasting_ability: 'charisma', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Cleric', spellcasting_ability: 'wisdom', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Druid', spellcasting_ability: 'wisdom', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Fighter', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Monk', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Paladin', spellcasting_ability: 'charisma', progression_type: 'half_up', caster_fraction: '1/2', caster_rounding: 'up' },
      { name: 'Ranger', spellcasting_ability: 'wisdom', progression_type: 'half_up', caster_fraction: '1/2', caster_rounding: 'up' },
      { name: 'Rogue', spellcasting_ability: null, progression_type: 'none', caster_fraction: null, caster_rounding: null },
      { name: 'Sorcerer', spellcasting_ability: 'charisma', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
      { name: 'Warlock', spellcasting_ability: 'charisma', progression_type: 'pact', caster_fraction: null, caster_rounding: null },
      { name: 'Wizard', spellcasting_ability: 'intelligence', progression_type: 'full', caster_fraction: '1', caster_rounding: null },
    ]);

    expect(
      db.allRaw(`
        SELECT subclass.name, class.name AS class_name, subclass.spellcasting_ability,
          subclass.caster_fraction, subclass.caster_rounding
        FROM subclass_definitions subclass
        JOIN class_definitions class ON class.id = subclass.class_definition_id
        ORDER BY subclass.name
      `),
    ).toEqual([
      { name: 'AT', class_name: 'Rogue', spellcasting_ability: 'intelligence', caster_fraction: '1/3', caster_rounding: 'down' },
      { name: 'EK', class_name: 'Fighter', spellcasting_ability: 'intelligence', caster_fraction: '1/3', caster_rounding: 'down' },
    ]);
  });

  it.each([
    ['Bard', 1, 2, 4, { 1: 2 }, []],
    ['Bard', 4, 3, 7, { 1: 4, 2: 3 }, []],
    ['Bard', 10, 4, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Bard', 20, 4, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Cleric', 1, 3, 4, { 1: 2 }, []],
    ['Cleric', 4, 4, 7, { 1: 4, 2: 3 }, []],
    ['Cleric', 10, 5, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Cleric', 20, 5, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Druid', 1, 2, 4, { 1: 2 }, []],
    ['Druid', 4, 3, 7, { 1: 4, 2: 3 }, []],
    ['Druid', 10, 4, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Druid', 20, 4, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Sorcerer', 1, 4, 2, { 1: 2 }, []],
    ['Sorcerer', 2, 4, 4, { 1: 3 }, []],
    ['Sorcerer', 3, 4, 6, { 1: 4, 2: 2 }, []],
    ['Sorcerer', 4, 5, 7, { 1: 4, 2: 3 }, []],
    ['Sorcerer', 10, 6, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Sorcerer', 20, 6, 22, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Wizard', 1, 3, 4, { 1: 2 }, []],
    ['Wizard', 4, 4, 7, { 1: 4, 2: 3 }, []],
    ['Wizard', 10, 5, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Wizard', 14, 5, 18, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, []],
    ['Wizard', 16, 5, 21, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, []],
    ['Wizard', 20, 5, 25, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, []],
    ['Paladin', 1, 0, 2, { 1: 2 }, []],
    ['Paladin', 3, 0, 4, { 1: 3 }, []],
    ['Paladin', 5, 0, 6, { 1: 4, 2: 2 }, []],
    ['Paladin', 17, 0, 14, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, []],
    ['Paladin', 20, 0, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Ranger', 1, 0, 2, { 1: 2 }, []],
    ['Ranger', 3, 0, 4, { 1: 3 }, []],
    ['Ranger', 5, 0, 6, { 1: 4, 2: 2 }, []],
    ['Ranger', 17, 0, 14, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, []],
    ['Ranger', 20, 0, 15, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, []],
    ['Warlock', 1, 2, 2, [], { count: 1, level: 1 }],
    ['Warlock', 2, 2, 3, [], { count: 2, level: 1 }],
    ['Warlock', 3, 2, 4, [], { count: 2, level: 2 }],
    ['Warlock', 4, 3, 5, [], { count: 2, level: 2 }],
    ['Warlock', 5, 3, 6, [], { count: 2, level: 3 }],
    ['Warlock', 9, 3, 10, [], { count: 2, level: 5 }],
    ['Warlock', 10, 4, 10, [], { count: 2, level: 5 }],
    ['Warlock', 11, 4, 11, [], { count: 3, level: 5 }],
    ['Warlock', 17, 4, 14, [], { count: 4, level: 5 }],
    ['Warlock', 20, 4, 15, [], { count: 4, level: 5 }],
    ['Barbarian', 1, 0, 0, [], []],
    ['Barbarian', 20, 0, 0, [], []],
    ['Fighter', 1, 0, 0, [], []],
    ['Fighter', 20, 0, 0, [], []],
    ['Monk', 1, 0, 0, [], []],
    ['Monk', 20, 0, 0, [], []],
    ['Rogue', 1, 0, 0, [], []],
    ['Rogue', 20, 0, 0, [], []],
  ])(
    'persists %s level %i caster breakpoints',
    (name, level, cantrips, prepared, slots, pact) => {
      const row = db.oneRaw(`
        SELECT progression.cantrips_known, progression.prepared_count,
          progression.slots, progression.pact_slots
        FROM class_progressions progression
        JOIN class_definitions class ON class.id = progression.class_definition_id
        WHERE class.name = ? AND progression.class_level = ?
      `, [name, level]);

      expect(row).not.toBeNull();
      expect(row!.cantrips_known).toBe(cantrips);
      expect(row!.prepared_count).toBe(prepared);
      expect(JSON.parse(String(row!.slots))).toEqual(slots);
      expect(JSON.parse(String(row!.pact_slots))).toEqual(pact);
    },
  );

  it('persists order, wizard, and Mystic Arcanum grant rules', () => {
    const rulesFor = (name: string, level: number): Record<string, unknown>[] => {
      const encoded = db.scalar<string>(`
        SELECT progression.grant_rules
        FROM class_progressions progression
        JOIN class_definitions class ON class.id = progression.class_definition_id
        WHERE class.name = ? AND progression.class_level = ?
      `, [name, level]);
      return JSON.parse(encoded!);
    };

    expect(rulesFor('Cleric', 1).find((rule) =>
      rule.rule_key === 'cleric-divine-order-cantrip',
    )).toMatchObject({
      count: 1,
      list: '$config.divine_order.chosen_list',
      active_if_config: {
        key: 'divine_order.chosen_option',
        equals: 'Thaumaturge',
      },
    });
    expect(rulesFor('Druid', 1).find((rule) =>
      rule.rule_key === 'druid-primal-order-cantrip',
    )).toMatchObject({
      count: 1,
      list: '$config.primal_order.chosen_list',
      active_if_config: {
        key: 'primal_order.chosen_option',
        equals: 'Magician',
      },
    });
    expect(rulesFor('Wizard', 1).map((rule) => rule.rule_key)).toEqual([
      'wizard-cantrips',
      'wizard-prepared',
      'wizard-spellbook',
      'ritual-adept',
    ]);

    for (const [level, prepared, arcanumLevels] of [
      [11, 11, [6]],
      [12, 11, [6]],
      [13, 12, [6, 7]],
      [14, 12, [6, 7]],
      [15, 13, [6, 7, 8]],
      [16, 13, [6, 7, 8]],
      [17, 14, [6, 7, 8, 9]],
      [18, 14, [6, 7, 8, 9]],
      [19, 15, [6, 7, 8, 9]],
      [20, 15, [6, 7, 8, 9]],
    ] as const) {
      const rules = rulesFor('Warlock', level);
      expect(
        rules.find((rule) => rule.rule_key === 'warlock-prepared'),
      ).toMatchObject({
        count: prepared,
        level_min: 1,
        level_max: 5,
        with_slots: true,
      });
      expect(
        rules
          .filter((rule) =>
            String(rule.rule_key).startsWith('warlock-mystic-arcanum-'),
          )
          .map((rule) => rule.level_min),
        `Warlock ${level} persisted Arcanum levels`,
      ).toEqual(arcanumLevels);
    }
  });

  it('persists all third-caster preparation and slot breakpoints', () => {
    expect(
      db.allRaw(`
        SELECT subclass.name, progression.class_level, progression.prepared_count,
          progression.max_spell_level, progression.slots
        FROM subclass_progressions progression
        JOIN subclass_definitions subclass
          ON subclass.id = progression.subclass_definition_id
        WHERE progression.class_level IN (3, 7, 13, 19)
        ORDER BY subclass.name, progression.class_level
      `).map((row) => ({
        ...row,
        slots: JSON.parse(String(row.slots)),
      })),
    ).toEqual([
      { name: 'AT', class_level: 3, prepared_count: 3, max_spell_level: 1, slots: { 1: 2 } },
      { name: 'AT', class_level: 7, prepared_count: 5, max_spell_level: 2, slots: { 1: 4, 2: 2 } },
      { name: 'AT', class_level: 13, prepared_count: 9, max_spell_level: 3, slots: { 1: 4, 2: 3, 3: 2 } },
      { name: 'AT', class_level: 19, prepared_count: 12, max_spell_level: 4, slots: { 1: 4, 2: 3, 3: 3, 4: 1 } },
      { name: 'EK', class_level: 3, prepared_count: 3, max_spell_level: 1, slots: { 1: 2 } },
      { name: 'EK', class_level: 7, prepared_count: 5, max_spell_level: 2, slots: { 1: 4, 2: 2 } },
      { name: 'EK', class_level: 13, prepared_count: 9, max_spell_level: 3, slots: { 1: 4, 2: 3, 3: 2 } },
      { name: 'EK', class_level: 19, prepared_count: 12, max_spell_level: 4, slots: { 1: 4, 2: 3, 3: 3, 4: 1 } },
    ]);
  });

  it('looks up the persisted class-table count independently of ability score', () => {
    const wizardId = Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', ['Wizard']),
    );
    const characterIds = [8, 20].map((intelligence) => {
      const result = db.exec(
        'INSERT INTO characters (name, intelligence) VALUES (?, ?)',
        [`Intelligence ${intelligence}`, intelligence],
      );
      db.exec(`
        INSERT INTO character_class_levels
          (character_id, class_definition_id, level)
        VALUES (?, ?, 1)
      `, [result.lastInsertId, wizardId]);
      return result.lastInsertId;
    });
    const lookup = new ClassProgressionLookup(db);

    expect(
      characterIds.map((characterId) =>
        lookup.preparedCountForCharacterClass(characterId, wizardId),
      ),
    ).toEqual([4, 4]);
  });

  it('rejects a lookup when the persisted character lacks the class', () => {
    const wizardId = Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', ['Wizard']),
    );
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('No Wizard')",
    ).lastInsertId;
    const lookup = new ClassProgressionLookup(db);

    expect(() =>
      lookup.preparedCountForCharacterClass(characterId, wizardId),
    ).toThrow(`Character ${characterId} does not have class ${wizardId}.`);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_class_levels WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('rejects a lookup when the persisted class level lacks a progression row', () => {
    const wizardId = Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', ['Wizard']),
    );
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Epic Wizard')",
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels
        (character_id, class_definition_id, level)
       VALUES (?, ?, 21)`,
      [characterId, wizardId],
    );
    const lookup = new ClassProgressionLookup(db);

    expect(() =>
      lookup.preparedCountForCharacterClass(characterId, wizardId),
    ).toThrow(`Class ${wizardId} has no progression row at level 21.`);
    expect(
      db.scalar(
        `SELECT level FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, wizardId],
      ),
    ).toBe(21);
  });

  it('upserts idempotently while retaining persisted row identities', () => {
    const before = db.allRaw(`
      SELECT class.content_key, progression.class_level, progression.id
      FROM class_progressions progression
      JOIN class_definitions class ON class.id = progression.class_definition_id
      ORDER BY class.content_key, progression.class_level
    `);

    seedClassProgressions(db);

    expect(db.scalar('SELECT count(*) FROM class_progressions')).toBe(240);
    expect(
      db.allRaw(`
        SELECT class.content_key, progression.class_level, progression.id
        FROM class_progressions progression
        JOIN class_definitions class ON class.id = progression.class_definition_id
        ORDER BY class.content_key, progression.class_level
      `),
    ).toEqual(before);
  });
});
