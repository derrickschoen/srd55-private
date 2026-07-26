import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  ensureBundledWeaponContent,
  hasBundledWeaponContent,
  seedWeaponContent,
} from '../../../src/rules/weapons-srd';
import { WeaponMasteryLookup } from '../../../src/rules/weapon-mastery-lookup';
import { openTestDatabase } from '../../helpers/open-db';

describe('weapon content seeding and the mastery allowance lookup', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedWeaponContent(db);
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function lookup(): WeaponMasteryLookup {
    return new WeaponMasteryLookup(db);
  }

  function character(name = 'Mastery Character'): number {
    return db.exec('INSERT INTO characters (name) VALUES (?)', [name])
      .lastInsertId;
  }

  function addClass(
    characterId: number,
    className: string,
    level: number,
  ): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, ?, 0)`,
      [characterId, classId(className), level],
    );
  }

  it('seeds all 38 templates with their reference values intact', () => {
    expect(db.scalar('SELECT count(*) FROM weapon_templates')).toBe(38);
    const longsword = db.one(
      "SELECT * FROM weapon_templates WHERE content_key = '2024:weapon:longsword'",
    );
    expect(longsword).toMatchObject({
      name: 'Longsword',
      srd_group: 'martial_melee',
      damage_dice: '1d8',
      damage_type: 'Slashing',
      versatile_damage_dice: '1d10',
      mastery_property: 'Sap',
      rules_edition: '2024',
    });
  });

  it('writes 40 count rows — Barbarian and Fighter only', () => {
    expect(db.scalar('SELECT count(*) FROM class_weapon_mastery_counts')).toBe(
      40,
    );
    // Nothing at all is written for a class we have no numbers for. Not a zero.
    expect(
      db.scalar(
        'SELECT count(*) FROM class_weapon_mastery_counts WHERE class_definition_id = ?',
        [classId('Rogue')],
      ),
    ).toBe(0);
  });

  it('gives every seeded class a grant row, including the ones that grant nothing', () => {
    const classes = Number(
      db.scalar('SELECT count(*) FROM class_definitions'),
    );
    expect(
      db.scalar('SELECT count(*) FROM class_weapon_mastery_grants'),
    ).toBe(classes);
    const grantOf = (name: string) =>
      db.scalar('SELECT "grant" FROM class_weapon_mastery_grants WHERE class_definition_id = ?', [
        classId(name),
      ]);
    expect(grantOf('Fighter')).toBe('counts_known');
    expect(grantOf('Barbarian')).toBe('counts_known');
    expect(grantOf('Paladin')).toBe('counts_unsourced');
    expect(grantOf('Ranger')).toBe('counts_unsourced');
    expect(grantOf('Rogue')).toBe('counts_unsourced');
    expect(grantOf('Wizard')).toBe('not_granted');
  });

  it('is idempotent and reports when it has nothing to do', () => {
    expect(hasBundledWeaponContent(db)).toBe(true);
    expect(ensureBundledWeaponContent(db)).toBe(false);
    seedWeaponContent(db);
    expect(db.scalar('SELECT count(*) FROM weapon_templates')).toBe(38);
    expect(db.scalar('SELECT count(*) FROM class_weapon_mastery_counts')).toBe(
      40,
    );
  });

  // --- per-class resolution, hand-transcribed from the extract --------------

  it('resolves the Fighter progression at every step', () => {
    const fighter = classId('Fighter');
    for (const [level, count] of [
      [1, 3], [3, 3], [4, 4], [9, 4], [10, 5], [15, 5], [16, 6], [20, 6],
    ] as const) {
      expect(lookup().forClass(fighter, level), `level ${level}`).toEqual({
        state: 'known',
        count,
      });
    }
  });

  it('resolves the Barbarian progression at every step', () => {
    const barbarian = classId('Barbarian');
    for (const [level, count] of [
      [1, 2], [3, 2], [4, 3], [9, 3], [10, 4], [20, 4],
    ] as const) {
      expect(lookup().forClass(barbarian, level), `level ${level}`).toEqual({
        state: 'known',
        count,
      });
    }
  });

  it('says "unsourced" for the three classes whose counts are not bundled', () => {
    for (const name of ['Paladin', 'Ranger', 'Rogue']) {
      const allowance = lookup().forClass(classId(name), 5);
      expect(allowance, name).toEqual({ state: 'unsourced' });
      // The distinction that matters: NOT a count, and NOT "not granted".
      expect(allowance).not.toHaveProperty('count');
    }
  });

  it('says "not granted" for a class that has no such feature', () => {
    expect(lookup().forClass(classId('Wizard'), 20)).toEqual({
      state: 'not_granted',
    });
  });

  it('says "content missing" — never zero — when the grant row is absent', () => {
    const wizard = classId('Wizard');
    db.exec('DELETE FROM class_weapon_mastery_grants WHERE class_definition_id = ?', [
      wizard,
    ]);
    const allowance = lookup().forClass(wizard, 5);
    expect(allowance).toEqual({ state: 'content_missing' });
    // Stated explicitly, because a zero here would make an un-seeded database
    // indistinguishable from a class that genuinely grants nothing.
    expect(allowance).not.toHaveProperty('count');
    expect(JSON.stringify(allowance)).not.toContain('0');
  });

  it('says "content missing" when a counts_known class has no row at that level', () => {
    const fighter = classId('Fighter');
    db.exec(
      'DELETE FROM class_weapon_mastery_counts WHERE class_definition_id = ?',
      [fighter],
    );
    expect(lookup().forClass(fighter, 5)).toEqual({
      state: 'content_missing',
    });
  });

  // --- per-character resolution --------------------------------------------

  it('reports no allowance for a character whose classes grant none', () => {
    const id = character();
    addClass(id, 'Wizard', 5);
    expect(lookup().forCharacter(id).state).toBe('none');
  });

  it('reports a single sourced allowance for one granting class', () => {
    const id = character();
    addClass(id, 'Fighter', 10);
    const allowance = lookup().forCharacter(id);
    expect(allowance).toMatchObject({ state: 'known', count: 5 });
  });

  it('reports "unknown" — not zero — when the only granting class is unsourced', () => {
    const id = character();
    addClass(id, 'Rogue', 7);
    const allowance = lookup().forCharacter(id);
    expect(allowance.state).toBe('unknown');
    expect(allowance).not.toHaveProperty('count');
    expect(
      allowance.classes.map((entry) => entry.allowance.state),
    ).toEqual(['unsourced']);
  });

  it('refuses to combine two granting classes, and does not sum or take the max', () => {
    const id = character();
    addClass(id, 'Fighter', 5); // 4
    addClass(id, 'Barbarian', 4); // 3
    const allowance = lookup().forCharacter(id);
    expect(allowance.state).toBe('unresolved');
    // The two obvious guesses, both refused: 7 (sum) and 4 (maximum).
    expect(allowance).not.toHaveProperty('count');
    const serialised = JSON.stringify(allowance);
    expect(serialised).not.toContain('"count":7');
    // Each class's own number is still reported, separately and attributed.
    expect(
      allowance.classes.map((entry) => [
        entry.class_name,
        entry.allowance.state === 'known' ? entry.allowance.count : null,
      ]),
    ).toEqual([
      ['Barbarian', 3],
      ['Fighter', 4],
    ]);
  });

  it('treats a granting class with no number as unresolved alongside a sourced one', () => {
    const id = character();
    addClass(id, 'Fighter', 5);
    addClass(id, 'Rogue', 3);
    const allowance = lookup().forCharacter(id);
    expect(allowance.state).toBe('unresolved');
    expect(
      allowance.classes.map((entry) => entry.allowance.state).sort(),
    ).toEqual(['known', 'unsourced']);
  });

  it('ignores a non-granting class when deciding whether the answer is single', () => {
    const id = character();
    addClass(id, 'Fighter', 4);
    addClass(id, 'Wizard', 3);
    expect(lookup().forCharacter(id)).toMatchObject({
      state: 'known',
      count: 4,
    });
  });
});
