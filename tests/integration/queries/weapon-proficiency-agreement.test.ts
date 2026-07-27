import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { WeaponQueries } from '../../../src/queries/weapons';
import { AbilityScores } from '../../../src/rules/ability-scores';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE TWO SCREENS, ABOUT ONE WEAPON, ON ONE CHARACTER.
 *
 * The character SHEET prints a proficiency verdict per weapon; the PLANNER
 * prints an attack profile for the same weapon. They read the same rows through
 * `ClassProficiencyLookup` and resolve them through the same
 * `classProficiencyGrants`, and this file is what says they must keep agreeing.
 *
 * IT EXISTS BECAUSE THEY DID NOT. A Wizard/Sorcerer holding a Greatsword read
 * "Not proficient" on the sheet — with a warning saying "they do not add their
 * proficiency bonus to the attack" — while the profile beside it printed
 * Strength modifier PLUS the proficiency bonus. Two screens, opposite claims,
 * one number. Neither screen's own tests could see it, because neither of them
 * looks at the other.
 *
 * The assertions are on NUMBERS and on VERDICT KINDS, never on the prose of
 * either side: a test that compared sentences would fail on a rewording and
 * pass on a wrong bonus.
 */
describe('the sheet and the weapons panel agree about one weapon', () => {
  let connection: Database;
  let db: DatabaseContext;
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
    properties: { readonly finesse?: boolean; readonly light?: boolean } = {},
  ): void {
    db.exec(
      `INSERT INTO character_weapons
         (character_id, name, damage_dice, damage_type, proficiency_category,
          finesse, light, mastery_selected)
       VALUES (?, ?, '1d8', 'Slashing', ?, ?, ?, 0)`,
      [
        characterId,
        name,
        category,
        properties.finesse === true ? 1 : 0,
        properties.light === true ? 1 : 0,
      ],
    );
  }

  /** The strength attack bonus of the plain attack, for one weapon by name. */
  function plainAttackBonus(name: string): number {
    const weapons = new WeaponQueries(db).characterWeapons(characterId);
    const attacks = new WeaponQueries(db).attacks(characterId, weapons, {
      routes: [],
      // Strength 18 (+4). Total level 5, so the proficiency bonus is +3 and the
      // two answers are 7 and 4 — far enough apart that no rounding hides one.
      scores: AbilityScores.fromArray({
        strength: 18,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      }),
      proficiency_bonus: 3,
    });
    const weapon = attacks.weapons.find((entry) => entry.weapon_name === name);
    const profile = weapon?.profiles.find((entry) => entry.kind === 'normal');
    if (profile === undefined || profile.abilities.state === 'unavailable') {
      throw new Error(`No plain attack profile for ${name}.`);
    }
    const option = profile.abilities.options.find(
      (entry) => entry.ability === 'strength',
    );
    if (option === undefined) {
      throw new Error(`No Strength option for ${name}.`);
    }
    return option.attack_bonus;
  }

  function verdictKind(name: string): string {
    const sheet = new CharacterSheetBuilder(db).build(characterId);
    const found = sheet.proficiencies.weapons.find(
      (entry) => entry.name === name,
    );
    if (found === undefined) {
      throw new Error(`No sheet verdict for ${name}.`);
    }
    return found.verdict.kind;
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    seedWeaponContent(db);
    characterId = db.exec(
      `INSERT INTO characters
         (name, strength, dexterity, constitution, intelligence, wisdom,
          charisma)
       VALUES ('Two Screens', 18, 10, 10, 10, 10, 10)`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('withholds the bonus from the Wizard/Sorcerer Greatsword BOTH screens describe', () => {
    // The reported case, verbatim: neither class grants Martial weapons in
    // either role, so no union of them reaches a Greatsword.
    addClass('Wizard', 3, true);
    addClass('Sorcerer', 2, false);
    addWeapon('Greatsword', 'martial');

    expect(verdictKind('Greatsword')).toBe('not_proficient');
    // +4 is Strength alone. +7 was the old answer and is the defect.
    expect(plainAttackBonus('Greatsword')).toBe(4);

    const sheet = new CharacterSheetBuilder(db).build(characterId);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'weapon_not_proficient',
    );
  });

  it('adds it back the moment ONE class grants the category, without the sheet changing its mind', () => {
    // THE UNION, THROUGH BOTH SCREENS. A Fighter dip grants Martial weapons on
    // ENTRY — `multiclass-entry-grants.txt:77-80` — so the same Greatsword on
    // the same character is now proficient, and the number moves with it. An
    // implementation reading only the first class would leave both at 4.
    addClass('Wizard', 3, true);
    addClass('Fighter', 2, false);
    addWeapon('Greatsword', 'martial');

    expect(verdictKind('Greatsword')).toBe('proficient');
    expect(plainAttackBonus('Greatsword')).toBe(7);
  });

  it('keeps the bonus where no category is recorded, on both screens', () => {
    // D27's null: NOT STATED, never `simple`. The sheet says it cannot check
    // and the profile keeps the bonus with the assumption stated, because
    // withholding would take it off every weapon imported before that column
    // existed.
    addClass('Wizard', 3, true);
    addWeapon('Grandfather’s sword', null);

    expect(verdictKind('Grandfather’s sword')).toBe('category_not_stated');
    expect(plainAttackBonus('Grandfather’s sword')).toBe(7);
  });

  it('splits two weapons on one character, rather than answering once for both', () => {
    // A Wizard 3 / Rogue 2. The Rogue's ENTRY grant is Light armour and NO
    // weapons at all (`:127-131`), so neither weapon is granted by the Rogue —
    // and the Wizard's Simple grant covers the Dagger and not the Greatsword.
    // One answer for the character would be wrong for one of the two rows.
    addClass('Wizard', 3, true);
    addClass('Rogue', 2, false);
    addWeapon('Greatsword', 'martial');
    addWeapon('Dagger', 'simple', { finesse: true, light: true });

    expect(verdictKind('Greatsword')).toBe('not_proficient');
    expect(verdictKind('Dagger')).toBe('proficient');
    expect(plainAttackBonus('Greatsword')).toBe(4);
    expect(plainAttackBonus('Dagger')).toBe(7);
  });

  it('agrees even when the starting class cannot be resolved', () => {
    // BOTH SCREENS MUST PICK THE SAME CLASS. `startingClass` degrades by
    // PICKING — classes ordered by name, so Fighter gets the full Core Traits
    // row and Wizard the entry subset — and the two readers order their class
    // queries identically for exactly this reason. A reader that ordered by row
    // id would promote the Wizard here and withhold a bonus the sheet grants.
    addClass('Wizard', 3, false);
    addClass('Fighter', 2, false);
    addWeapon('Greatsword', 'martial');

    const sheet = new CharacterSheetBuilder(db).build(characterId);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'no_starting_class',
    );
    // Fighter grants Martial in BOTH roles, so the verdict is proficient
    // whichever of the two is promoted — and the point of the assertion is that
    // the two screens say the same thing about it.
    expect(verdictKind('Greatsword')).toBe('proficient');
    expect(plainAttackBonus('Greatsword')).toBe(7);
  });
});
