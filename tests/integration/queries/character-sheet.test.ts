import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterNotFoundError } from '../../../src/queries/character-crud';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE SHEET, AGAINST A REAL DATABASE, WITH HAND-COMPUTED EXPECTATIONS.
 *
 * EVERY NUMBER BELOW IS WORKED OUT IN THE COMMENT BESIDE IT AND WRITTEN AS A
 * LITERAL. Nothing here asserts a value the builder just produced, and nothing
 * imports a constant from `src/rules/sheet.ts` — a test that re-derives the
 * formula it is checking cannot fail when the formula is wrong.
 *
 * THE FIXTURE IS A MULTICLASS CHARACTER, deliberately, because the three
 * multiclass rules are exactly the ones a single-class fixture cannot tell
 * apart from their plausible-looking wrong versions:
 *
 *  - the proficiency bonus comes from TOTAL level, not from either class's;
 *  - saving throws come from the FIRST class only, never from both;
 *  - hit dice are PER CLASS, so the same recorded roll means different things.
 *
 * `seedSheetContent` supplies the printed hit dice and saving throws, so those
 * two facts are the SRD's rather than the fixture's — the multiclass ARITHMETIC
 * is what is being checked, not a transcription.
 */
describe('the derived character sheet', () => {
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

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    builder = new CharacterSheetBuilder(db);
    // Strength 15 (+2), Dexterity 14 (+2), Constitution 13 (+1),
    // Intelligence 12 (+1), Wisdom 11 (+0), Charisma 8 (−1).
    characterId = db.exec(
      `INSERT INTO characters
         (name, strength, dexterity, constitution, intelligence, wisdom,
          charisma)
       VALUES ('Sheet Hero', 15, 14, 13, 12, 11, 8)`,
    ).lastInsertId;
    // Fighter 5 (d10, started here) / Wizard 3 (d6). Total level 8.
    addClass('Fighter', 5, true);
    addClass('Wizard', 3, false);
  });

  afterEach(() => connection.close());

  it('takes the proficiency bonus from TOTAL level, not from either class', () => {
    const sheet = builder.build(characterId);
    expect(sheet.total_level).toBe(8);
    // Total level 8 is the +3 band (levels 5-8). A Fighter 5 alone is also +3
    // and a Wizard 3 alone is +2, so the number that proves the rule is the
    // one that would be +2 if the per-class reading had been taken: at total
    // level 9 the answer becomes +4 while neither class alone reaches it.
    expect(sheet.proficiency_bonus.value).toBe(3);

    db.exec(
      `UPDATE character_class_levels SET level = 4
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId('Wizard')],
    );
    // Fighter 5 / Wizard 4 = total 9 → +4. Per class it would still be +3 and
    // +2, so nothing but the total can produce this.
    expect(builder.build(characterId).proficiency_bonus.value).toBe(4);
  });

  it('takes saving throw proficiencies from the FIRST class only', () => {
    const sheet = builder.build(characterId);
    const proficient = sheet.saves
      .filter((save) => save.proficient)
      .map((save) => save.ability)
      .sort();
    // The Fighter's printed pair. Intelligence and Wisdom — the Wizard's — are
    // NOT here, because no class's multiclass entry grants saving throws.
    expect(proficient).toEqual(['constitution', 'strength']);

    const save = (ability: string) =>
      sheet.saves.find((entry) => entry.ability === ability)?.value;
    // Strength 15 → +2 modifier, proficient, +3 bonus → +5.
    expect(save('strength')).toBe(5);
    // Constitution 13 → +1 modifier, proficient, +3 bonus → +4.
    expect(save('constitution')).toBe(4);
    // Intelligence 12 → +1 modifier, NOT proficient → +1. The wrong reading
    // would give +4 here.
    expect(save('intelligence')).toBe(1);
    // Charisma 8 → −1 modifier, not proficient → −1. A negative modifier is a
    // legitimate answer and is not floored.
    expect(save('charisma')).toBe(-1);
  });

  it('adds hit points per class, with each class’s own die and roll', () => {
    // No rolls recorded yet, so every level after the first takes the printed
    // fixed value.
    //
    // Fighter 5, the starting class:
    //   level 1  = 10 (full d10) + 1 Con  = 11
    //   levels 2-5 = 4 x (6 fixed + 1 Con) = 28
    // Wizard 3:
    //   levels 1-3 = 3 x (4 fixed + 1 Con) = 15
    // Total 11 + 28 + 15 = 54.
    expect(builder.build(characterId).hit_points.value).toBe(54);

    // One roll on each class, at the same class level, showing the same face —
    // and contributing differently, because it replaces a different fixed
    // value. A Fighter's level 2 was 6+1=7 and becomes 9+1=10 (+3); a Wizard's
    // level 2 was 4+1=5 and becomes 9+1=10 (+5).
    db.exec(
      `INSERT INTO character_hit_point_rolls
         (character_id, class_name, class_level, rolled_value)
       VALUES (?, 'Fighter', 2, 9), (?, 'Wizard', 2, 9)`,
      [characterId, characterId],
    );
    expect(builder.build(characterId).hit_points.value).toBe(54 + 3 + 5);
  });

  it('ignores a roll filed under a class the character does not have, and says so', () => {
    db.exec(
      `INSERT INTO character_hit_point_rolls
         (character_id, class_name, class_level, rolled_value)
       VALUES (?, 'Barbarian', 2, 12)`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    // Unchanged from the no-rolls total above: the roll matches no class.
    expect(sheet.hit_points.value).toBe(54);
    expect(
      sheet.hit_point_rolls.find((roll) => roll.class_name === 'Barbarian')
        ?.applies,
    ).toBe(false);
  });

  it('derives Armor Class from the armour, the shield and the manual adjustment', () => {
    // Unarmoured: 10 + Dexterity 14 (+2) = 12.
    expect(builder.build(characterId).armor_class.value).toBe(12);

    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus,
          dex_bonus_max, strength_requirement, stealth_disadvantage)
       VALUES (?, 'worn', 'Half Plate Armor', 'medium', 15, 'capped', 2, 15, 1)`,
      [characterId],
    );
    // Half Plate 15 + min(Dex +2, cap 2) = 17.
    const armoured = builder.build(characterId);
    expect(armoured.armor_class.value).toBe(17);
    // Strength 15 meets the requirement of 15 exactly, so no warning.
    expect(armoured.warnings.map((warning) => warning.code)).not.toContain(
      'strength_requirement_unmet',
    );

    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus)
       VALUES (?, 'shield', 'Shield', 'shield', 2, 'none')`,
      [characterId],
    );
    // A Shield's `armor_class` is the printed +2 BONUS, not a base: 17 + 2 = 19.
    expect(builder.build(characterId).armor_class.value).toBe(19);

    db.exec(
      `INSERT INTO character_sheet_adjustments
         (character_id, armor_class_adjustment, armor_class_adjustment_note)
       VALUES (?, -2, 'Cursed helm, house ruled.')`,
      [characterId],
    );
    // Signed, so a negative adjustment subtracts: 19 − 2 = 17.
    const adjusted = builder.build(characterId);
    expect(adjusted.armor_class.value).toBe(17);
    expect(adjusted.armor_class_adjustment).toBe(-2);
    expect(adjusted.armor_class_adjustment_note).toBe(
      'Cursed helm, house ruled.',
    );
  });

  it('counts Heavy armour as a flat value, never as a cap of zero', () => {
    db.exec('UPDATE characters SET dexterity = 6 WHERE id = ?', [characterId]);
    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus,
          strength_requirement)
       VALUES (?, 'worn', 'Chain Mail', 'heavy', 16, 'none', 13)`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    // Dexterity 6 is a −2 modifier. Heavy armour prints no Dexterity term at
    // all, so the answer is the flat 16 the table gives. A cap of zero would
    // have produced 14 — the same modifier SUBTRACTED — which is the bug the
    // three-member vocabulary exists to prevent.
    expect(sheet.armor_class.value).toBe(16);
    // Strength 15 clears the requirement of 13, so still no warning.
    expect(sheet.warnings.map((warning) => warning.code)).toEqual([]);
  });

  it('counts a shield by what it IS, and says the slots are crossed', () => {
    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus)
       VALUES (?, 'worn', 'Shield', 'shield', 2, 'none')`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    // Unarmoured 10 + Dex 2 = 12, plus the shield's +2 = 14. Reading the `2` as
    // a base Armor Class would have given 2, silently halving the character's
    // defence and then some.
    expect(sheet.armor_class.value).toBe(14);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'armor_slot_mismatch',
    );
  });

  it('warns when the Strength requirement is unmet, without changing the number', () => {
    db.exec('UPDATE characters SET strength = 10 WHERE id = ?', [characterId]);
    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus,
          strength_requirement, stealth_disadvantage)
       VALUES (?, 'worn', 'Plate Armor', 'heavy', 18, 'none', 15, 1)`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    // The SRD's consequence is a speed reduction, not an Armor Class penalty,
    // so the number is the flat 18 either way and the warning carries the fact.
    expect(sheet.armor_class.value).toBe(18);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'strength_requirement_unmet',
    );
  });

  it('adds the proficiency bonus to a chosen skill and to nothing else', () => {
    const before = builder.build(characterId);
    const modifier = (skill: string) =>
      before.skills.find((entry) => entry.skill === skill)?.value;
    // Stealth is Dexterity: 14 → +2, not proficient.
    expect(modifier('stealth')).toBe(2);
    // Athletics is Strength: 15 → +2, not proficient.
    expect(modifier('athletics')).toBe(2);
    // Perception is Wisdom: 11 → +0, not proficient.
    expect(modifier('perception')).toBe(0);
    // Passive Perception = 10 + the Wisdom (Perception) modifier = 10.
    expect(before.passive_perception.value).toBe(10);
    // Initiative is the Dexterity modifier.
    expect(before.initiative.value).toBe(2);

    db.exec(
      `INSERT INTO character_skill_proficiencies (character_id, skill)
       VALUES (?, 'stealth'), (?, 'perception')`,
      [characterId, characterId],
    );
    const after = builder.build(characterId);
    const now = (skill: string) =>
      after.skills.find((entry) => entry.skill === skill)?.value;
    // Stealth: +2 Dexterity + 3 proficiency = +5.
    expect(now('stealth')).toBe(5);
    // Perception: +0 Wisdom + 3 proficiency = +3.
    expect(now('perception')).toBe(3);
    // Athletics is untouched, because proficiency is per skill and not a blanket.
    expect(now('athletics')).toBe(2);
    // Passive Perception moves with it: 10 + 3 = 13.
    expect(after.passive_perception.value).toBe(13);
    // EXPERTISE IS NOT APPLIED: doubling would have given Stealth +8. That
    // feature's text is not among this application's sources, and the sheet
    // says so rather than guessing.
    expect(now('stealth')).not.toBe(8);
    expect(after.gaps.map((gap) => gap.kind)).toContain('no_expertise');

    // All eighteen skills are listed, always — a skill missing from a sheet
    // reads as a skill the character cannot use.
    expect(after.skills).toHaveLength(18);
  });

  it('reports the species hit points as a SEPARATE number, never folded in', () => {
    db.exec(
      `INSERT INTO character_species (character_id, name, base_speed_feet)
       VALUES (?, 'Dwarf', 25)`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species_traits
         (character_id, sort_order, name, effect_kind,
          effect_hit_points_flat, effect_hit_points_per_level)
       VALUES (?, 1, 'Dwarven Toughness', 'hp_modifier', 0, 1)`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species_traits
         (character_id, sort_order, name, effect_kind, effect_speed_bonus_feet)
       VALUES (?, 2, 'Fleet of Foot', 'speed', 5)`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    // The class total is unchanged — this is the seam that had no caller at
    // all before this sheet existed, and a page printing `hit_points` alone
    // would show a Dwarf short by their level.
    expect(sheet.hit_points.value).toBe(54);
    // 0 flat + 1 per level x total level 8 = 8.
    expect(sheet.species_hit_points?.value).toBe(8);
    // Base 25 + 5 = 30.
    expect(sheet.walking_speed_feet).toBe(30);
  });

  it('says the speed is not recorded rather than inventing 30', () => {
    db.exec(
      `INSERT INTO character_species (character_id, name) VALUES (?, 'Human')`,
      [characterId],
    );
    expect(builder.build(characterId).walking_speed_feet).toBeNull();
  });

  it('names what it cannot show, for every character equally', () => {
    // F4: a blank features box reads as "this character has no features",
    // which is false. These are stated on every sheet because they are true of
    // every character in this application.
    expect(builder.build(characterId).gaps.map((gap) => gap.kind)).toEqual([
      'no_class_feature_text',
      'partial_subclass_catalog',
      'no_unarmored_defense',
      'no_expertise',
      'no_weapon_proficiency',
      'background_skills_are_text',
    ]);
  });

  it('degrades rather than throwing when no class is the starting class', () => {
    db.exec(
      'UPDATE character_class_levels SET is_starting_class = 0 WHERE character_id = ?',
      [characterId],
    );
    const sheet = builder.build(characterId);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'no_starting_class',
    );
    // Classes are ordered by name, so Fighter is chosen and the arithmetic is
    // the same 54 as when it was flagged. The point is that a character
    // imported in this state gets a stated approximation rather than an error
    // page.
    expect(sheet.hit_points.value).toBe(54);
  });

  it('does not pass off an assumed hit die as a class’s printed one', () => {
    // REACHABLE, and about to become more so: a class arrives with no
    // `class_sheet_traits` row whenever it is homebrew or imported, which is
    // exactly what the catalog-import work makes possible. `seedSheetContent`
    // supplies the row for all twelve printed classes, so this is the only
    // shape that produces the gap.
    const homebrewId = db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('homebrew:bladewright', 'Bladewright', '2024')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 3, 0)`,
      [characterId, homebrewId],
    );
    const sheet = builder.build(characterId);

    // THE ABSENCE SURVIVES TO THE READER rather than being filled in by the
    // query. `sheet-view.ts` prints "Hit die not recorded" from this, and the
    // D4 JSON block emits `null` — no invented number is asserted as a fact in
    // the one projection meant to be trusted without reading the prose.
    const line = sheet.classes.find(
      (entry) => entry.class_name === 'Bladewright',
    );
    expect(line?.hit_die).toBeNull();
    // The Fighter's d10 is still a number, so this is not a blanket null.
    expect(
      sheet.classes.find((entry) => entry.class_name === 'Fighter')?.hit_die,
    ).toBe(10);

    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'assumed_hit_die',
    );
    expect(
      sheet.warnings.find((warning) => warning.code === 'assumed_hit_die')
        ?.message,
    ).toContain('Bladewright');

    // The number is still produced, because a sheet with no hit point maximum
    // is worse than one carrying a flagged estimate. Base 54, plus three levels
    // of an assumed d8: 3 x (5 fixed + 1 Con) = 18 → 72.
    expect(sheet.hit_points.value).toBe(72);
  });

  it('flags a recorded roll no die of that class could have shown', () => {
    // The write boundary caps a roll at 12 — the largest printed die — because
    // `character_hit_point_rolls` is keyed on a class NAME and cannot know the
    // die. The sheet is the first place both are known, and `sheet-limits.ts`
    // says so; this is that promise being kept.
    db.exec(
      `INSERT INTO character_hit_point_rolls
         (character_id, class_name, class_level, rolled_value)
       VALUES (?, 'Wizard', 2, 11)`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'roll_exceeds_hit_die',
    );
    // COUNTED IN FULL. Base 54; the Wizard's level 2 was 4 fixed + 1 Con = 5
    // and becomes 11 + 1 = 12, so +7 → 61. Clamping to the d6 would have left
    // it at 54 and quietly discarded what the player typed.
    expect(sheet.hit_points.value).toBe(61);
    expect(sheet.hit_points.value).not.toBe(54);

    // A 6 is the largest a d6 can show and must not be flagged — otherwise the
    // assertion above would still hold with the comparison written `>=`.
    db.exec(
      `UPDATE character_hit_point_rolls SET rolled_value = 6
       WHERE character_id = ? AND class_name = 'Wizard'`,
      [characterId],
    );
    expect(
      builder.build(characterId).warnings.map((warning) => warning.code),
    ).not.toContain('roll_exceeds_hit_die');
  });

  it('states the degradation when a stored armour value is outside its vocabulary', () => {
    // ONLY REACHABLE FROM A DATABASE IMAGE PREDATING THE CHECK, which is why
    // the constraint is suspended to build the row rather than the row being
    // presented as something a writer could produce today. `sheet-inputs.ts`
    // falls back rather than throwing so undo stays possible, and promises the
    // sheet states the degradation — without this the row is read as Light
    // armour, recomputes Armor Class with the full Dexterity modifier, and
    // prints the result as fact.
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus)
       VALUES (?, 'worn', 'Astral Plate', 'astral', 18, 'none')`,
      [characterId],
    );
    db.exec('PRAGMA ignore_check_constraints = OFF');

    const sheet = builder.build(characterId);
    const warning = sheet.warnings.find(
      (entry) => entry.code === 'armor_value_out_of_vocabulary',
    );
    expect(warning).toBeDefined();
    // It names the armour, the rejected value and the substitute — "something
    // is wrong with your armour" would not let anyone act on it.
    expect(warning?.message).toContain('Astral Plate');
    expect(warning?.message).toContain('astral');
    expect(warning?.message).toContain('light');

    // The sheet stays readable: base 18 with no Dexterity term = 18.
    expect(sheet.armor_class.value).toBe(18);

    // AND THE SAME ROW WITH A LEGAL CATEGORY SAYS NOTHING. The warning must
    // come from the value, not from the presence of armour.
    db.exec(
      `UPDATE character_armor SET category = 'heavy' WHERE character_id = ?`,
      [characterId],
    );
    expect(
      builder.build(characterId).warnings.map((entry) => entry.code),
    ).not.toContain('armor_value_out_of_vocabulary');
  });

  it('reports an unknown character as an error rather than a plausible sheet', () => {
    expect(() => builder.build(999_999)).toThrow(CharacterNotFoundError);
  });
});
