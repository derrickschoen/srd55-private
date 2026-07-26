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
      `INSERT INTO character_weapons (character_id, name, damage_dice, damage_type)
       VALUES (?, 'Longsword', '1d8', 'Slashing')`,
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
