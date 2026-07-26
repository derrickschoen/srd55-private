import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  ensureBundledSheetContent,
  hasBundledSheetContent,
  seedSheetContent,
} from '../../../src/rules/sheet-srd';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE SEED, AGAINST A REAL DATABASE AND ITS REAL CONSTRAINTS.
 *
 * The parse is proved against the extract in `tests/unit/rules/`. What this
 * adds is that the parsed values SURVIVE THE WRITE: every CHECK constraint in
 * `db/schema/sheet.ts` binds these exact rows, so a vocabulary that drifted
 * from the parser, or a Shield filed as a base AC, fails here rather than in a
 * user's database.
 *
 * Expectations are the same hand-read values as the unit tests. They are
 * repeated rather than imported so that a change to the parser's output cannot
 * silently move both sides of the comparison at once.
 */
describe('sheet content seeding', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function column<T>(sql: string, params: unknown[] = []): T[] {
    return db.all(sql, params as never, (row) => Object.values(row)[0] as T);
  }

  it('writes one traits row per class, with the printed hit die', () => {
    expect(
      Number(db.scalar('SELECT count(*) FROM class_sheet_traits')),
    ).toBe(12);
    const hitDie = (name: string) =>
      Number(
        db.scalar('SELECT hit_die FROM class_sheet_traits WHERE class_definition_id = ?', [
          classId(name),
        ]),
      );
    expect(hitDie('Barbarian')).toBe(12);
    expect(hitDie('Fighter')).toBe(10);
    expect(hitDie('Monk')).toBe(8);
    expect(hitDie('Wizard')).toBe(6);
  });

  it('writes the saving throws as a SET of rows', () => {
    expect(
      column<string>(
        'SELECT ability FROM class_saving_throw_proficiencies WHERE class_definition_id = ? ORDER BY ability',
        [classId('Fighter')],
      ),
    ).toEqual(['constitution', 'strength']);
    expect(
      column<string>(
        'SELECT ability FROM class_saving_throw_proficiencies WHERE class_definition_id = ? ORDER BY ability',
        [classId('Sorcerer')],
      ),
    ).toEqual(['charisma', 'constitution']);
    // Twelve classes, two saving throws each.
    expect(
      Number(db.scalar('SELECT count(*) FROM class_saving_throw_proficiencies')),
    ).toBe(24);
  });

  it("writes the Bard with NO skill options and the choose-any flag set", () => {
    const bard = classId('Bard');
    expect(
      Number(
        db.scalar('SELECT count(*) FROM class_skill_options WHERE class_definition_id = ?', [bard]),
      ),
    ).toBe(0);
    expect(
      Number(
        db.scalar(
          'SELECT skill_choice_from_any FROM class_sheet_traits WHERE class_definition_id = ?',
          [bard],
        ),
      ),
    ).toBe(1);
    expect(
      Number(
        db.scalar(
          'SELECT skill_choice_count FROM class_sheet_traits WHERE class_definition_id = ?',
          [bard],
        ),
      ),
    ).toBe(3);
    // Every other class has a list, so zero rows is the Bard's alone.
    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM class_sheet_traits WHERE skill_choice_from_any = 1',
        ),
      ),
    ).toBe(1);
  });

  it('distinguishes Armor Training: None from an unparsed class, in the data', () => {
    // Monk, Sorcerer and Wizard print the word "None": zero armour rows, but a
    // traits row that exists. That combination is what a reader must be able to
    // tell apart from a class nobody parsed.
    for (const name of ['Monk', 'Sorcerer', 'Wizard']) {
      const id = classId(name);
      expect(
        Number(
          db.scalar('SELECT count(*) FROM class_armor_training WHERE class_definition_id = ?', [id]),
        ),
        name,
      ).toBe(0);
      expect(
        Number(
          db.scalar('SELECT count(*) FROM class_sheet_traits WHERE class_definition_id = ?', [id]),
        ),
        name,
      ).toBe(1);
    }
    expect(
      column<string>(
        'SELECT category FROM class_armor_training WHERE class_definition_id = ? ORDER BY category',
        [classId('Paladin')],
      ),
    ).toEqual(['heavy', 'light', 'medium', 'shield']);
  });

  it('keeps the weapon-proficiency qualifier through the write', () => {
    expect(
      db.scalar(
        "SELECT property_qualifier FROM class_weapon_proficiencies WHERE class_definition_id = ? AND category = 'martial'",
        [classId('Rogue')],
      ),
    ).toBe('Finesse or Light');
    expect(
      db.scalar(
        "SELECT property_qualifier FROM class_weapon_proficiencies WHERE class_definition_id = ? AND category = 'martial'",
        [classId('Monk')],
      ),
    ).toBe('Light');
    // Null for the unqualified majority, not an empty string.
    expect(
      db.scalar(
        "SELECT property_qualifier FROM class_weapon_proficiencies WHERE class_definition_id = ? AND category = 'martial'",
        [classId('Fighter')],
      ),
    ).toBeNull();
  });

  it('writes Extra Attack grants for exactly the five granting classes', () => {
    expect(
      column<string>(
        `SELECT DISTINCT c.name FROM class_extra_attack_grants g
         JOIN class_definitions c ON c.id = g.class_definition_id
         ORDER BY c.name`,
      ),
    ).toEqual(['Barbarian', 'Fighter', 'Monk', 'Paladin', 'Ranger']);
    expect(
      db.all(
        'SELECT class_level, attack_count FROM class_extra_attack_grants WHERE class_definition_id = ? ORDER BY class_level',
        [classId('Fighter')] as never,
        (row) => [Number(row.class_level), Number(row.attack_count)],
      ),
    ).toEqual([
      [5, 2],
      [11, 3],
      [20, 4],
    ]);
  });

  it('writes twenty Martial Arts rows for the Monk and none for anyone else', () => {
    expect(
      Number(db.scalar('SELECT count(*) FROM class_martial_arts_dice')),
    ).toBe(20);
    expect(
      Number(
        db.scalar(
          'SELECT martial_arts_die FROM class_martial_arts_dice WHERE class_definition_id = ? AND class_level = 17',
          [classId('Monk')],
        ),
      ),
    ).toBe(12);
  });

  it('writes the thirteen armour templates through their CHECK constraints', () => {
    expect(Number(db.scalar('SELECT count(*) FROM armor_templates'))).toBe(13);
    // The Shield: a BONUS of 2, no Dexterity term. The
    // `armor_templates_shield_check` constraint is what refuses any other
    // shape, so this row surviving the write is the constraint agreeing with
    // the parser.
    expect(
      db.all(
        "SELECT armor_class, dex_bonus, dex_bonus_max FROM armor_templates WHERE name = 'Shield'",
        undefined,
        (row) => [Number(row.armor_class), String(row.dex_bonus), row.dex_bonus_max],
      ),
    ).toEqual([[2, 'none', null]]);
    // Half Plate: base 15, capped at 2, Stealth disadvantage, no Strength need.
    expect(
      db.all(
        "SELECT armor_class, dex_bonus, dex_bonus_max, strength_requirement, stealth_disadvantage FROM armor_templates WHERE name = 'Half Plate Armor'",
        undefined,
        (row) => [
          Number(row.armor_class),
          String(row.dex_bonus),
          Number(row.dex_bonus_max),
          row.strength_requirement,
          Number(row.stealth_disadvantage),
        ],
      ),
    ).toEqual([[15, 'capped', 2, null, 1]]);
  });

  it('is idempotent, and reports itself healthy only once complete', () => {
    const before = Number(db.scalar('SELECT count(*) FROM class_skill_options'));
    expect(hasBundledSheetContent(db)).toBe(true);
    // A second ensure writes nothing.
    expect(ensureBundledSheetContent(db)).toBe(false);
    // A full re-seed must not duplicate the set-table rows: they are replaced
    // wholesale, not appended to.
    seedSheetContent(db);
    expect(Number(db.scalar('SELECT count(*) FROM class_skill_options'))).toBe(before);
    expect(Number(db.scalar('SELECT count(*) FROM class_martial_arts_dice'))).toBe(20);
    expect(Number(db.scalar('SELECT count(*) FROM armor_templates'))).toBe(13);
  });

  it('reports itself unhealthy when the content is missing, and repairs it', async () => {
    const empty = await openTestDatabase();
    try {
      const fresh = new DatabaseContext(empty);
      seedClassProgressions(fresh);
      expect(hasBundledSheetContent(fresh)).toBe(false);
      expect(ensureBundledSheetContent(fresh)).toBe(true);
      expect(hasBundledSheetContent(fresh)).toBe(true);
      expect(
        Number(fresh.scalar('SELECT count(*) FROM class_sheet_traits')),
      ).toBe(12);
    } finally {
      empty.close();
    }
  });

  it('notices a GUTTED set table, not just a missing traits row, and repairs it', async () => {
    // The traits row records that a class was PARSED, so a check that counted
    // only traits rows would call a database with all twelve of them and an
    // emptied `class_skill_options` healthy — and never repair it.
    const empty = await openTestDatabase();
    try {
      const fresh = new DatabaseContext(empty);
      seedClassProgressions(fresh);
      seedSheetContent(fresh);
      expect(hasBundledSheetContent(fresh)).toBe(true);

      // The Fighter's skill options, deleted. Its traits row survives.
      const fighter = Number(
        fresh.scalar("SELECT id FROM class_definitions WHERE name = 'Fighter'"),
      );
      fresh.exec('DELETE FROM class_skill_options WHERE class_definition_id = ?', [
        fighter,
      ]);
      expect(
        Number(fresh.scalar('SELECT count(*) FROM class_sheet_traits')),
      ).toBe(12);
      expect(hasBundledSheetContent(fresh)).toBe(false);
      expect(ensureBundledSheetContent(fresh)).toBe(true);
      expect(hasBundledSheetContent(fresh)).toBe(true);
      expect(
        Number(
          fresh.scalar(
            'SELECT count(*) FROM class_skill_options WHERE class_definition_id = ?',
            [fighter],
          ),
        ),
      ).toBe(9);

      // The same for saving throws and weapon proficiencies.
      for (const table of [
        'class_saving_throw_proficiencies',
        'class_weapon_proficiencies',
      ]) {
        fresh.exec(`DELETE FROM ${table} WHERE class_definition_id = ?`, [fighter]);
        expect(hasBundledSheetContent(fresh)).toBe(false);
        expect(ensureBundledSheetContent(fresh)).toBe(true);
        expect(hasBundledSheetContent(fresh)).toBe(true);
      }

      // THE NEGATIVE CONTROL, and the reason the check reads
      // `skill_choice_from_any`. The Bard's source prints "Choose any 3 skills"
      // with NO list, so ZERO Bard skill options is CORRECT content. Demanding
      // a row for every class would report this healthy database as broken
      // forever, and `ensureBundledSheetContent` would re-seed on every boot.
      const bard = Number(
        fresh.scalar("SELECT id FROM class_definitions WHERE name = 'Bard'"),
      );
      expect(
        Number(
          fresh.scalar(
            'SELECT count(*) FROM class_skill_options WHERE class_definition_id = ?',
            [bard],
          ),
        ),
      ).toBe(0);
      expect(hasBundledSheetContent(fresh)).toBe(true);

      // And Monk, Sorcerer and Wizard legitimately have NO armour training —
      // "Armor Training: None" — which must not be read as damage either.
      for (const name of ['Monk', 'Sorcerer', 'Wizard']) {
        expect(
          Number(
            fresh.scalar(
              `SELECT count(*) FROM class_armor_training
                WHERE class_definition_id =
                      (SELECT id FROM class_definitions WHERE name = ?)`,
              [name],
            ),
          ),
        ).toBe(0);
      }
      expect(hasBundledSheetContent(fresh)).toBe(true);
    } finally {
      empty.close();
    }
  });

  it('cascades sheet content away with its class', () => {
    // The seven class tables all hang off `class_definitions` by a cascading
    // key, so losing a class takes its sheet content with it rather than
    // leaving rows pointing at nothing.
    const monk = classId('Monk');
    connection.exec('PRAGMA foreign_keys = ON');
    db.exec('DELETE FROM class_definitions WHERE id = ?', [monk]);
    for (const table of [
      'class_sheet_traits',
      'class_saving_throw_proficiencies',
      'class_skill_options',
      'class_extra_attack_grants',
      'class_martial_arts_dice',
      'class_weapon_proficiencies',
    ]) {
      expect(
        Number(
          db.scalar(`SELECT count(*) FROM ${table} WHERE class_definition_id = ?`, [monk]),
        ),
        table,
      ).toBe(0);
    }
  });
});
