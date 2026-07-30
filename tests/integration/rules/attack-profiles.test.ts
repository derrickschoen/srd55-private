import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { WeaponQueries } from '../../../src/queries/weapons';
import { AbilityScores } from '../../../src/rules/ability-scores';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { SheetContentLookup } from '../../../src/rules/sheet-content-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import { attacksPerAction, martialArtsDice } from '../../../src/rules/sheet';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE READER, AGAINST THE ROWS THE SEEDER ACTUALLY WROTE.
 *
 * `tests/unit/rules/attack-profiles.test.ts` proves the arithmetic against maps
 * written by hand. This file proves the OTHER half: that
 * `class_extra_attack_grants` and `class_martial_arts_dice` — written since the
 * sheet core merged and read by nothing outside the tests until now — come back
 * out of a real database in the shape those pure functions expect.
 *
 * The expectations are the same hand-read values as the unit tests, retyped
 * rather than imported, so a change to the seeder cannot move both sides of the
 * comparison at once.
 */
describe('reading the sheet content a character actually has', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    seedWeaponContent(db);
    characterId = db.exec("INSERT INTO characters (name) VALUES ('Wielder')")
      .lastInsertId;
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function addLevels(name: string, level: number, starting = false): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, ?, ?)`,
      [characterId, classId(name), level, starting ? 1 : 0],
    );
  }

  function lookup(): SheetContentLookup {
    return new SheetContentLookup(db);
  }

  it('reads the seeded Extra Attack grants back as absolute totals', () => {
    addLevels('Fighter', 20, true);
    const [fighter] = lookup().forCharacter(characterId);
    // Every one is `source: 'class'`, unscoped and fully resolved: the level is
    // recorded on `character_class_levels` and a class table row names no
    // weapon. The three totals are read off the Fighter Features table by eye.
    expect(
      (fighter?.extra_attack_grants ?? []).map((grant) => [
        grant.source,
        grant.class_level,
        grant.attack_count,
        grant.weapon_scope,
        grant.unresolved.length,
      ]),
    ).toEqual([
      ['class', 5, 2, 'any_weapon', 0],
      ['class', 11, 3, 'any_weapon', 0],
      ['class', 20, 4, 'any_weapon', 0],
    ]);
  });

  it('reads no grant for a class the source grants none to', () => {
    addLevels('Wizard', 20, true);
    const [wizard] = lookup().forCharacter(characterId);
    // An empty list is the sourced answer, not a missing one: the class table
    // prints no Extra Attack row, so `attacksPerAction` answering 1 is right.
    expect(wizard?.extra_attack_grants).toEqual([]);
    expect(wizard?.martial_arts_dice?.size).toBe(0);
    expect(attacksPerAction(lookup().forCharacter(characterId)).count).toBe(1);
  });

  it('reads the Martial Arts column for the one class that has it', () => {
    addLevels('Monk', 20, true);
    const classes = lookup().forCharacter(characterId);
    expect(classes[0]?.martial_arts_dice?.size).toBe(20);
    // Transcribed from the Monk Features table by eye.
    expect(classes[0]?.martial_arts_dice?.get(1)).toBe(6);
    expect(classes[0]?.martial_arts_dice?.get(5)).toBe(8);
    expect(classes[0]?.martial_arts_dice?.get(11)).toBe(10);
    expect(classes[0]?.martial_arts_dice?.get(17)).toBe(12);
  });

  it('resolves a real multiclass to two DIFFERENT levels', () => {
    // Monk 3 / Fighter 10, out of the database rather than out of a fixture.
    // Total character level 13; Monk level 3.
    addLevels('Monk', 3, true);
    addLevels('Fighter', 10);
    const classes = lookup().forCharacter(characterId);

    // Fighter 10 is on the level 5 row (2), Monk 3 grants nothing yet. They do
    // not stack, and 2 is the max.
    expect(attacksPerAction(classes).count).toBe(2);
    // The Martial Arts die is MONK 3 -> d6. Reading it off the total of 13
    // would give d10.
    expect(martialArtsDice(classes)).toEqual([
      { class_name: 'Monk', class_level: 3, die: 6 },
    ]);
  });

  /**
   * THE MARTIAL ARTS HALF OF THE DEGRADE-TO-ABSENT RULE, WHICH NOTHING PINNED.
   *
   * `SheetContentLookup.martialArtsDice` filters every stored value through
   * `isMartialArtsDieSize` and DROPS the level if it fails. That filter had no
   * test at all: a review neutered it to `isMartialArtsDieSize(row.value) || true`
   * and the whole suite stayed green, while the mirror guard `hitDieOrAbsent`
   * fails two tests under the same mutation. So the branch that introduced the
   * rule pinned one half of it and left the other free to be deleted.
   *
   * WHY THE TABLE IS REBUILT INSTEAD OF JUST WRITING A 7. The CHECK refuses one,
   * which is exactly F11's point: a CHECK constrains no image created before it
   * existed, and this table's CHECK is younger than the application. Recreating
   * the table without it IS the pre-CHECK image — the same shape the schema
   * carried until `class_martial_arts_dice_check` was added — and it is the only
   * state in which the runtime guard can be reached at all. The UNIQUE index and
   * the foreign key are not recreated because this test only reads.
   */
  it('drops a level whose stored die is not a Martial Arts die, rather than printing 1d7', () => {
    addLevels('Monk', 5, true);
    db.exec(
      `ALTER TABLE class_martial_arts_dice RENAME TO class_martial_arts_dice_checked;
       CREATE TABLE class_martial_arts_dice (
         id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
         class_definition_id integer NOT NULL,
         class_level integer NOT NULL,
         martial_arts_die integer NOT NULL,
         created_at DATETIME,
         updated_at DATETIME
       );
       INSERT INTO class_martial_arts_dice
         SELECT * FROM class_martial_arts_dice_checked;
       DROP TABLE class_martial_arts_dice_checked;`,
    );
    const rewritten = db.exec(
      `UPDATE class_martial_arts_dice SET martial_arts_die = 7
       WHERE class_definition_id = ? AND class_level = 5`,
      [classId('Monk')],
    );
    // The corrupt row really is there — otherwise this test would pass by
    // measuring nothing.
    expect(rewritten.changes).toBe(1);
    expect(
      db.scalar(
        `SELECT martial_arts_die FROM class_martial_arts_dice
         WHERE class_definition_id = ? AND class_level = 5`,
        [classId('Monk')],
      ),
    ).toBe(7);

    const classes = lookup().forCharacter(characterId);
    // Nineteen of twenty levels survive; the d7 row is not carried as a bare
    // integer and there is no level 5 entry to read.
    expect(classes[0]?.martial_arts_dice?.size).toBe(19);
    expect(classes[0]?.martial_arts_dice?.get(5)).toBeUndefined();
    // The character IS the affected level — one row per level means a dropped
    // level 5 changes the answer only for a Monk 5. The resolver falls back to
    // the greatest GOOD row at or below 5, which is the level 4 d6, so the sheet
    // under-states the die by one rung and never prints a die the source does
    // not have.
    expect(martialArtsDice(classes)).toEqual([
      { class_name: 'Monk', class_level: 5, die: 6 },
    ]);
    expect(martialArtsDice(classes)[0]?.die).not.toBe(7);
  });

  it('does not stack Extra Attack read out of the database either', () => {
    addLevels('Fighter', 5, true);
    addLevels('Ranger', 5);
    expect(attacksPerAction(lookup().forCharacter(characterId)).count).toBe(2);
    expect(
      attacksPerAction(lookup().forCharacter(characterId)).count,
    ).not.toBe(3);
  });
});

describe('the weapons panel derives attacks without storing them', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    seedWeaponContent(db);
    characterId = db.exec(
      `INSERT INTO characters (name, strength, dexterity)
       VALUES ('Wielder', 18, 14)`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, (SELECT id FROM class_definitions WHERE name = 'Fighter'), 5, 1)`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_weapons (
         character_id, name, damage_kind, damage_dice, damage_type
       ) VALUES (?, 'Longsword', 'dice', '1d8', 'Slashing')`,
      [characterId],
    );
  });

  afterEach(() => connection.close());

  function panel() {
    return new WeaponQueries(db).panel(characterId, {
      routes: [],
      scores: AbilityScores.fromArray({
        strength: 18,
        dexterity: 14,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      }),
      proficiency_bonus: 3,
    });
  }

  it('computes the numbers a hand calculation gives', () => {
    // Strength 18 -> +4, plus the level 5 proficiency bonus of +3, is +7.
    // Dexterity 14 -> +2, plus +3, is +5. Fighter 5 gives two attacks.
    const attacks = panel().attacks;
    expect(attacks.attacks_per_action).toBe(2);
    expect(attacks.has_extra_attack).toBe(true);
    const profile = attacks.weapons[0]?.profiles[0];
    expect(profile?.kind).toBe('normal');
    expect(
      profile?.abilities.state === 'unavailable'
        ? []
        : profile?.abilities.options.map((option) => [
            option.ability,
            option.attack_bonus,
            option.damage_modifier,
          ]),
    ).toEqual([
      ['strength', 7, 4],
      ['dexterity', 5, 2],
    ]);
  });

  it('consumes eligible +1 weapon and ability-override effects from the database', () => {
    const weaponId = Number(
      db.scalar(
        `SELECT id FROM character_weapons
         WHERE character_id = ? AND name = 'Longsword'`,
        [characterId],
      ),
    );
    const unattunedItemId = db.exec(
      `INSERT INTO character_items
         (character_id, name, requires_attunement, attuned)
       VALUES (?, 'Dormant weapon charm', 1, 0)`,
      [characterId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, amount, weapon_scope,
          character_weapon_id, label)
       VALUES
         (?, 1, 'weapon_attack_bonus', 1, 'one_bonded_weapon', ?, '+1 Longsword'),
         (?, 2, 'weapon_damage_bonus', 1, 'one_bonded_weapon', ?, '+1 Longsword')`,
      [characterId, weaponId, characterId, weaponId],
    );
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, ability, weapon_scope,
          character_weapon_id, label)
       VALUES
         (?, 3, 'attack_ability_override', 'charisma', 'one_bonded_weapon', ?,
          'Pact Shell Blade')`,
      [characterId, weaponId],
    );
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, amount, weapon_scope,
          character_item_id, character_weapon_id, label)
       VALUES
         (?, 4, 'weapon_attack_bonus', 10, 'one_bonded_weapon', ?, ?,
          'Dormant charm');`,
      [characterId, unattunedItemId, weaponId],
    );

    const profiles = panel().attacks.weapons[0]?.profiles ?? [];
    expect(profiles.map((profile) => [profile.kind, profile.label])).toEqual([
      ['normal', 'Attack'],
      ['attack_ability_override', 'Pact Shell Blade'],
    ]);
    expect(
      profiles.map((profile) =>
        profile.abilities.state === 'unavailable'
          ? []
          : profile.abilities.options.map((option) => [
              option.ability,
              option.attack_bonus,
              option.damage_modifier,
            ]),
      ),
    ).toEqual([
      [
        // Strength 18: +4 ability, +3 proficiency, +1 weapon; damage +4 +1.
        ['strength', 8, 5],
        // Dexterity 14: +2 ability, +3 proficiency, +1 weapon; damage +2 +1.
        ['dexterity', 6, 3],
      ],
      [
        // Charisma 10: +0 ability, +3 proficiency, +1 weapon; damage +0 +1.
        ['charisma', 4, 1],
      ],
    ]);
    expect(profiles[0]?.notes).toEqual([
      '+1 Longsword: +1 to this profile’s attack bonus.',
      '+1 Longsword: +1 to this profile’s damage.',
    ]);
    // If this consumer bypasses the shared eligible-effects predicate, the
    // unattuned charm adds another +10 and every attack number above fails.
    expect(profiles.flatMap((profile) => profile.notes).join(' ')).not.toContain(
      'Dormant charm',
    );
  });

  it('offers no cantrip profile when the catalog holds neither cantrip', () => {
    // The spell catalog is user-supplied and deliberately empty here, which is
    // the state every fresh database is in. Nothing is fabricated for it.
    const attacks = panel().attacks;
    expect(
      attacks.weapons.flatMap((weapon) =>
        weapon.profiles.map((profile) => profile.kind),
      ),
    ).toEqual(['normal']);
    expect(attacks.warnings).toEqual([]);
  });

  it('writes nothing while deriving — no row, no column, no table', () => {
    const before = db.scalar<number>(
      'SELECT count(*) FROM character_weapons WHERE character_id = ?',
      [characterId],
    );
    const tables = db.scalar<number>(
      "SELECT count(*) FROM sqlite_master WHERE type = 'table'",
    );
    panel();
    panel();
    expect(
      db.scalar<number>(
        'SELECT count(*) FROM character_weapons WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(before);
    expect(
      db.scalar<number>("SELECT count(*) FROM sqlite_master WHERE type = 'table'"),
    ).toBe(tables);
    // And the same read twice gives the same answer.
    expect(panel().attacks).toEqual(panel().attacks);
  });
});
