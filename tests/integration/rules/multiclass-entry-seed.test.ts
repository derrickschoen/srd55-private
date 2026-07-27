import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  ensureBundledSheetContent,
  hasBundledSheetContent,
  seedSheetContent,
} from '../../../src/rules/sheet-srd';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE SEEDED ENTRY GRANTS, AND THE SHEET THAT READS THEM, AGAINST A REAL
 * DATABASE.
 *
 * THE EXPECTATIONS ARE THE SAME LITERALS THE UNIT TEST USES, transcribed from
 * `docs/srd/source/multiclass-entry-grants.txt` by eye. That duplication is
 * deliberate and is the point: the unit test proves the ARITHMETIC over grants
 * written by hand, and this one proves the SEEDED grants are those same values.
 * Sharing a fixture between them would let one wrong table satisfy both.
 */
describe('the multiclass entry grants, seeded and read back', () => {
  let connection: Database;
  let db: DatabaseContext;
  let builder: CharacterSheetBuilder;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function addClass(name: string, level: number, starting: boolean): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, ?, ?)`,
      [characterId, classId(name), level, starting ? 1 : 0],
    );
  }

  function addWeapon(
    name: string,
    category: string | null,
    flags: { readonly finesse?: boolean; readonly light?: boolean } = {},
  ): void {
    db.exec(
      `INSERT INTO character_weapons
         (character_id, name, proficiency_category, finesse, light)
       VALUES (?, ?, ?, ?, ?)`,
      [
        characterId,
        name,
        category,
        flags.finesse === true ? 1 : 0,
        flags.light === true ? 1 : 0,
      ],
    );
  }

  function flagged(table: string, name: string): string[] {
    return db.all(
      `SELECT category FROM ${table}
        WHERE class_definition_id = ? AND granted_on_multiclass_entry = 1
        ORDER BY category`,
      [classId(name)],
      (row) => String(row.category),
    );
  }

  function everyCategory(table: string, name: string): string[] {
    return db.all(
      `SELECT category FROM ${table} WHERE class_definition_id = ?
        ORDER BY category`,
      [classId(name)],
      (row) => String(row.category),
    );
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    builder = new CharacterSheetBuilder(db);
    characterId = db.exec(
      `INSERT INTO characters
         (name, strength, dexterity, constitution, intelligence, wisdom,
          charisma)
       VALUES ('Dipper', 15, 14, 13, 12, 11, 8)`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  describe('what the seeder wrote', () => {
    it("flags the Barbarian's Shields and NOT its Light or Medium", () => {
      // `:24-25`. The row for `light` EXISTS — it is in the Core Traits row —
      // and is simply not flagged, which is what makes the flag a subset rather
      // than a second list.
      expect(everyCategory('class_armor_training', 'Barbarian')).toEqual([
        'light',
        'medium',
        'shield',
      ]);
      expect(flagged('class_armor_training', 'Barbarian')).toEqual(['shield']);
    });

    it("flags the Fighter's Martial weapons and NOT its Simple", () => {
      // `:77-79`. The `simple` row is present and unflagged.
      expect(everyCategory('class_weapon_proficiencies', 'Fighter')).toEqual([
        'martial',
        'simple',
      ]);
      expect(flagged('class_weapon_proficiencies', 'Fighter')).toEqual([
        'martial',
      ]);
    });

    it('flags nothing at all for the three hit-die-only classes', () => {
      for (const name of ['Monk', 'Sorcerer', 'Wizard']) {
        expect(flagged('class_armor_training', name), name).toEqual([]);
        expect(flagged('class_weapon_proficiencies', name), name).toEqual([]);
      }
      // And the Monk's unflagged rows are still there, so "nothing flagged" is
      // not being satisfied by a class with no rows.
      expect(everyCategory('class_weapon_proficiencies', 'Monk')).toEqual([
        'martial',
        'simple',
      ]);
    });

    it('writes the three skill grants and nine none/0 pairs', () => {
      const rows = db.all(
        `SELECT definition.name AS name,
                traits.multiclass_skill_choice_count AS count,
                traits.multiclass_skill_choice_pool AS pool
           FROM class_sheet_traits AS traits
           JOIN class_definitions AS definition
             ON definition.id = traits.class_definition_id
          ORDER BY definition.name`,
        undefined,
        (row) => ({
          name: String(row.name),
          count: Number(row.count),
          pool: String(row.pool),
        }),
      );
      const granting = rows.filter((row) => row.count > 0);
      expect(granting).toEqual([
        { name: 'Bard', count: 1, pool: 'any' },
        { name: 'Ranger', count: 1, pool: 'class_list' },
        { name: 'Rogue', count: 1, pool: 'class_list' },
      ]);
      expect(rows.filter((row) => row.pool !== 'none')).toEqual(granting);
      expect(rows).toHaveLength(12);
    });

    it('seeds no tool proficiency anywhere, because none is modelled', () => {
      // The Bard's Musical Instrument and the Rogue's Thieves' Tools are parsed
      // and dropped at the seed under D26. If a tool vocabulary ever lands, this
      // is the assertion that has to be deliberately retired.
      const tables = db.all(
        `SELECT name FROM sqlite_master
          WHERE type = 'table' AND name LIKE '%tool%'`,
        undefined,
        (row) => String(row.name),
      );
      expect(tables).toEqual([]);
    });

    it('re-seeds when a flag is cleared behind its back', () => {
      // The flags are VALUES and not merely presence, so the health check has to
      // compare them. A check that only counted rows would call this database
      // healthy while telling a Fighter/Barbarian they have no shield training.
      expect(hasBundledSheetContent(db)).toBe(true);
      db.exec(
        `UPDATE class_armor_training SET granted_on_multiclass_entry = 0
          WHERE class_definition_id = ?`,
        [classId('Barbarian')],
      );
      expect(hasBundledSheetContent(db)).toBe(false);
      expect(ensureBundledSheetContent(db)).toBe(true);
      expect(flagged('class_armor_training', 'Barbarian')).toEqual(['shield']);
    });

    it('re-seeds when a skill pool is cleared behind its back', () => {
      db.exec(
        `UPDATE class_sheet_traits
            SET multiclass_skill_choice_pool = 'none',
                multiclass_skill_choice_count = 0
          WHERE class_definition_id = ?`,
        [classId('Bard')],
      );
      expect(hasBundledSheetContent(db)).toBe(false);
      ensureBundledSheetContent(db);
      expect(
        db.scalar(
          `SELECT multiclass_skill_choice_pool FROM class_sheet_traits
            WHERE class_definition_id = ?`,
          [classId('Bard')],
        ),
      ).toBe('any');
    });
  });

  describe('what the sheet computes from them', () => {
    it('gives a Wizard/Barbarian Shields but not Light armour, and warns', () => {
      addClass('Wizard', 3, true);
      addClass('Barbarian', 1, false);
      db.exec(
        `INSERT INTO character_armor
           (character_id, slot, name, category, armor_class, dex_bonus,
            stealth_disadvantage)
         VALUES (?, 'worn', 'Chain Mail', 'heavy', 16, 'none', 1)`,
        [characterId],
      );
      const sheet = builder.build(characterId);

      expect([...sheet.proficiencies.armor_training].sort()).toEqual(['shield']);
      // Heavy armour is worn and untrained: the AC still counts it (16, no Dex
      // for heavy) and the sheet says the training is missing.
      expect(sheet.armor_class.value).toBe(16);
      expect(sheet.warnings.map((entry) => entry.code)).toContain(
        'armor_not_trained',
      );
    });

    it('does not give the Wizard the Barbarian’s saving throws', () => {
      addClass('Wizard', 3, true);
      addClass('Barbarian', 1, false);
      const sheet = builder.build(characterId);
      const proficient = sheet.saves
        .filter((save) => save.proficient)
        .map((save) => save.ability)
        .sort();
      // The Wizard's own two, and neither of the Barbarian's — while the
      // Barbarian's MARTIAL WEAPONS did reach the union above. The two rules
      // point opposite ways on one character.
      expect(proficient).toEqual(['intelligence', 'wisdom']);
      expect(
        sheet.proficiencies.weapon_proficiencies.map(
          (grant) => `${grant.class_name}:${grant.category}`,
        ),
      ).toContain('Barbarian:martial');
    });

    it('warns about a Greatsword a Wizard carries, and keeps the weapon', () => {
      addClass('Wizard', 3, true);
      addWeapon('Greatsword', 'martial');
      const sheet = builder.build(characterId);

      expect(sheet.proficiencies.weapons).toEqual([
        { name: 'Greatsword', verdict: { kind: 'not_proficient' } },
      ]);
      expect(sheet.warnings.map((entry) => entry.code)).toContain(
        'weapon_not_proficient',
      );
      // NOT BLOCKED, and the row is still in the table.
      expect(
        db.scalar('SELECT count(*) FROM character_weapons WHERE character_id = ?', [
          characterId,
        ]),
      ).toBe(1);
    });

    it('stops warning once a class of theirs grants it', () => {
      addClass('Wizard', 3, true);
      addClass('Fighter', 1, false);
      addWeapon('Greatsword', 'martial');
      const sheet = builder.build(characterId);
      expect(sheet.proficiencies.weapons[0]?.verdict).toEqual({
        kind: 'proficient',
        via: ['Fighter'],
      });
      expect(sheet.warnings.map((entry) => entry.code)).not.toContain(
        'weapon_not_proficient',
      );
    });

    it("evaluates the Rogue's Finesse-or-Light qualifier from the weapon's own flags", () => {
      addClass('Rogue', 3, true);
      addWeapon('Rapier', 'martial', { finesse: true });
      addWeapon('Greatsword', 'martial');
      addWeapon('Dagger', 'simple', { finesse: true, light: true });
      const sheet = builder.build(characterId);
      expect(
        sheet.proficiencies.weapons.map(
          (entry) => `${entry.name}:${entry.verdict.kind}`,
        ),
      ).toEqual([
        'Rapier:proficient',
        'Greatsword:not_proficient',
        'Dagger:proficient',
      ]);
      // The qualifier is on the sheet verbatim, whether or not it was evaluated.
      expect(
        sheet.proficiencies.weapon_proficiencies.map(
          (grant) => grant.property_qualifier,
        ),
      ).toContain('Finesse or Light');
    });

    it('says NOT STATED for a weapon with no category rather than assuming one', () => {
      addClass('Wizard', 3, true);
      addWeapon('Grandfather’s sword', null);
      const sheet = builder.build(characterId);
      expect(sheet.proficiencies.weapons[0]?.verdict.kind).toBe(
        'category_not_stated',
      );
      expect(sheet.warnings.map((entry) => entry.code)).toContain(
        'weapon_category_not_stated',
      );
    });

    it('unions across three classes, each in its own role', () => {
      addClass('Rogue', 3, true);
      addClass('Barbarian', 1, false);
      addClass('Cleric', 1, false);
      const sheet = builder.build(characterId);
      // Rogue full: light. Barbarian entry: shield. Cleric entry: light,
      // medium, shield (`:49-51`, where entry EQUALS the Core Traits row).
      expect([...sheet.proficiencies.armor_training].sort()).toEqual([
        'light',
        'medium',
        'shield',
      ]);
      expect(
        sheet.proficiencies.classes.map(
          (entry) => `${entry.class_name}:${entry.via}`,
        ),
      ).toEqual([
        'Barbarian:multiclass_entry',
        'Cleric:multiclass_entry',
        'Rogue:initial',
      ]);
    });
  });
});
