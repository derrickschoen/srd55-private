import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterNotFoundError } from '../../../src/queries/character-crud';
import {
  PRINT_APPENDIX_PREFERENCE_KEYS,
  PrintAppendixPreferenceQueries,
} from '../../../src/queries/print-appendix-preferences';
import { characterEffects } from '../../../src/rules/origins';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
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

  it('keeps total level and proficiency undetermined when every class row is absent', () => {
    db.exec(
      `DELETE FROM character_class_levels WHERE character_id = ?`,
      [characterId],
    );

    const sheet = builder.build(characterId);

    expect(sheet.total_level).toBeNull();
    expect(sheet.proficiency_bonus.value).toBeNull();
  });

  it('projects all four flavor fields losslessly as one nested object', () => {
    const alignment = '  Chaotic Good  ';
    const appearance = 'Silver eyes\nBlue cloak';
    const backstory =
      '</script><img src=x onerror="globalThis.flavorWasMarkup=true"> 🪐';
    const notes = `leading space \n${'long note '.repeat(500)}\n trailing space `;
    db.exec(
      `UPDATE characters
       SET alignment = ?, appearance = ?, backstory = ?, notes = ?
       WHERE id = ?`,
      [alignment, appearance, backstory, notes, characterId],
    );

    expect(builder.build(characterId).flavor).toEqual({
      alignment,
      appearance,
      backstory,
      notes,
    });
  });

  it('persists only the three named per-character print appendix preferences without revising the character', () => {
    const preferences = new PrintAppendixPreferenceQueries(db);
    const beforeRevision = db.scalar<number>(
      'SELECT revision FROM characters WHERE id = ?',
      [characterId],
    );

    expect(preferences.read(characterId)).toEqual({
      flavor: false,
      spells: false,
      audit: false,
    });
    expect(PRINT_APPENDIX_PREFERENCE_KEYS).toEqual({
      flavor: 'print_appendix_flavor',
      spells: 'print_appendix_spells',
      audit: 'print_appendix_audit',
    });

    preferences.set(characterId, 'audit', true);
    preferences.set(characterId, 'flavor', true);
    preferences.set(characterId, 'spells', true);

    expect(preferences.read(characterId)).toEqual({
      flavor: true,
      spells: true,
      audit: true,
    });
    expect(
      db.allRaw(
        `SELECT rule_key, value, note
         FROM character_rule_overrides
         WHERE character_id = ?
         ORDER BY rule_key`,
        [characterId],
      ),
    ).toEqual([
      { rule_key: 'print_appendix_audit', value: 'true', note: null },
      { rule_key: 'print_appendix_flavor', value: 'true', note: null },
      { rule_key: 'print_appendix_spells', value: 'true', note: null },
    ]);
    expect(
      db.scalar<number>('SELECT revision FROM characters WHERE id = ?', [
        characterId,
      ]),
    ).toBe(beforeRevision);

    preferences.set(characterId, 'flavor', false);

    expect(preferences.read(characterId)).toEqual({
      flavor: false,
      spells: true,
      audit: true,
    });
    expect(
      db.scalar<number>(
        `SELECT count(*) FROM character_rule_overrides
         WHERE character_id = ? AND rule_key = ?`,
        [characterId, PRINT_APPENDIX_PREFERENCE_KEYS.flavor],
      ),
    ).toBe(0);
    expect(
      db.scalar<number>('SELECT revision FROM characters WHERE id = ?', [
        characterId,
      ]),
    ).toBe(beforeRevision);
  });

  it('projects the active multiclass house rule without hiding the SRD shortfall or leaking hostile override text', () => {
    const hostile = '</p><img data-house-rule-hostile src=x>';
    db.exec(
      `INSERT INTO character_rule_overrides (character_id, rule_key, value, note)
       VALUES
         (?, 'ignore_multiclass_prerequisites', 'true', ?),
         (?, ?, 'true', ?)`,
      [characterId, hostile, characterId, hostile, hostile],
    );

    const sheet = builder.build(characterId);
    expect(sheet.house_rules).toEqual([
      'ignore_multiclass_prerequisites',
    ]);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'multiclass_primary_ability_unmet',
    );
    expect(JSON.stringify(sheet)).not.toContain(hostile);
  });

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
    expect(builder.build(characterId).class_hit_points_subtotal.value).toBe(54);

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
    expect(builder.build(characterId).class_hit_points_subtotal.value).toBe(54 + 3 + 5);
  });

  it('B2-HP sends a Constitution contribution through CharacterSheetBuilder hit-point math', () => {
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey: 'test:feat:hardy', name: 'Hardy',
      keyKind: 'bundled-stable',
    });
    const featId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         'test:feat:hardy', 'Hardy', '2024', 0, '[]'
       )`,
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (
         ?, 'test-source:hardy', 'feat', ?, 'Hardy', '{}', 8, 'active'
       )`,
      [characterId, featId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (
         ?, 1, 'ability_increase', 'constitution', 2, 20, ?, 'Hardy'
       )`,
      [characterId, sourceId],
    );

    const sheet = new CharacterSheetBuilder(db).build(characterId);

    // Base Constitution 13 has modifier +1; the sourced +2 makes 15 and +2.
    // Eight class levels therefore gain exactly 8 HP: 54 becomes 62.
    expect(
      sheet.ability_scores.find(
        (ability) => ability.ability === 'constitution',
      )?.score,
    ).toBe(15);
    expect(sheet.class_hit_points_subtotal.value).toBe(62);
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
    expect(sheet.class_hit_points_subtotal.value).toBe(54);
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
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, amount, label)
       VALUES (?, 1, 'armor_class_bonus', -2, 'Cursed helm, house ruled.')`,
      [characterId],
    );
    // The retired manual value is now the same signed effect as every other
    // flat bonus: 19 − 2 = 17.
    const adjusted = builder.build(characterId);
    expect(adjusted.armor_class.value).toBe(17);
    expect(adjusted.armor_class.bonuses).toEqual([
      { label: 'Cursed helm, house ruled.', amount: -2 },
    ]);
    expect(adjusted.armor_class.winner).toMatchObject({
      label: 'Half Plate Armor',
      source: 'worn_armor',
      total: 17,
    });
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
    // Strength 15 clears the armour requirement of 13. The independent D96
    // warning remains because this Fighter 5 / Wizard 3 has Intelligence 12.
    expect(sheet.warnings.map((warning) => warning.code)).toEqual([
      'multiclass_primary_ability_unmet',
    ]);
  });

  it('keeps non-proficient armour AC and the armor_not_trained warning together', () => {
    db.exec(
      `DELETE FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId('Fighter')],
    );
    db.exec(
      `INSERT INTO character_armor
         (character_id, slot, name, category, armor_class, dex_bonus,
          strength_requirement)
       VALUES (?, 'worn', 'Chain Mail', 'heavy', 16, 'none', 13)`,
      [characterId],
    );

    const sheet = builder.build(characterId);

    // Wizard grants no Heavy armour training. Chain Mail still supplies its
    // flat AC 16; proficiency changes the consequences, not the base. The
    // warning must survive beside the number so neither half can drift alone.
    expect(sheet.armor_class.value).toBe(16);
    expect(sheet.warnings.map((warning) => warning.code)).toContain(
      'armor_not_trained',
    );
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
      `INSERT INTO character_species (character_id, name, base_speed_feet)
       VALUES (?, 'Human', 30)`,
      [characterId],
    );
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
    // The warning has always said the speed is reduced by 10 feet. AC-3 makes
    // the printed number agree: Human 30 becomes 20 while the requirement is
    // unmet.
    expect(sheet.walking_speed).toMatchObject({ kind: 'known', value: 20 });
  });

  it('gates every mechanical effect reader through item attunement', () => {
    db.exec(
      `INSERT INTO character_species (character_id, name, base_speed_feet)
       VALUES (?, 'Human', 30)`,
      [characterId],
    );
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey: 'test:feat:armadillo-boon',
      name: 'Armadillo Boon', keyKind: 'bundled-stable',
    });
    const featId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         'test:feat:armadillo-boon', 'Armadillo Boon', '2024', 0, '[]'
       )`,
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (
         ?, 'test-source:armadillo-boon', 'feat', ?, 'Armadillo Boon',
         '{}', 8, 'active'
       )`,
      [characterId, featId],
    ).lastInsertId;
    const cloakId = db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement
       ) VALUES (?, 'Cloak of the Armadillo', 1)`,
      [characterId],
    ).lastInsertId;
    const attunedId = db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement
       ) VALUES (?, 'Attuned Shell', 1)`,
      [characterId],
    ).lastInsertId;
    const ringId = db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement
       ) VALUES (?, 'Ring of Shell', 0)`,
      [characterId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_attunement_slots (
         character_id, slot_1_item_id
       ) VALUES (?, ?)`,
      [characterId, attunedId],
    );

    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, source_instance_id,
         character_item_id, label
       ) VALUES
         (?, 1, 'armor_class_bonus', 4, ?, ?, 'Cloak AC'),
         (?, 2, 'armor_class_bonus', 1, ?, ?, 'Attuned Shell AC'),
         (?, 3, 'armor_class_bonus', 1, ?, ?, 'Ring AC'),
         (?, 4, 'armor_class_bonus', 1, ?, NULL, 'Manual AC')`,
      [
        characterId, sourceId, cloakId,
        characterId, sourceId, attunedId,
        characterId, sourceId, ringId,
        characterId, sourceId,
      ],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, hit_points_flat,
         source_instance_id, character_item_id, label
       ) VALUES (?, 5, 'hp_modifier', 5, ?, ?, 'Amulet HP')`,
      [characterId, sourceId, cloakId],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, speed_bonus_feet,
         source_instance_id, character_item_id, label
       ) VALUES (?, 6, 'speed', 5, ?, ?, 'Cloak Speed')`,
      [characterId, sourceId, cloakId],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, damage_type,
         source_instance_id, character_item_id, label
       ) VALUES (?, 7, 'damage_resistance', 'Fire', ?, ?, 'Cloak Resistance')`,
      [characterId, sourceId, cloakId],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, character_item_id, label
       ) VALUES (
         ?, 8, 'ability_increase', 'constitution', 2, 20, ?, ?,
         'Cloak Constitution'
       )`,
      [characterId, sourceId, cloakId],
    );

    const unattuned = builder.build(characterId);
    // Base 12 plus the attuned-required, non-required-unattuned and NULL-owned
    // +1 effects. The required-and-unattuned Cloak's +4 is absent.
    expect(unattuned.armor_class.value).toBe(15);
    expect(unattuned.class_hit_points_subtotal.value).toBe(54);
    expect(unattuned.species_hit_points).toBeNull();
    expect(unattuned.walking_speed).toMatchObject({ kind: 'known', value: 30 });
    expect(unattuned.damage_resistances).toEqual([]);
    expect(unattuned.items).toEqual([
      {
        name: 'Attuned Shell',
        description: null,
        requires_attunement: true,
        attuned: true,
      },
      {
        name: 'Cloak of the Armadillo',
        description: null,
        requires_attunement: true,
        attuned: false,
      },
      {
        name: 'Ring of Shell',
        description: null,
        requires_attunement: false,
        attuned: false,
      },
    ]);
    expect(unattuned.armor_class.bonuses.map((entry) => entry.label)).toEqual([
      'Attuned Shell AC',
      'Ring AC',
      'Manual AC',
    ]);
    expect(
      characterEffects(db, characterId).map((effect) => effect.label),
    ).not.toContain('Amulet HP');

    db.exec(
      `UPDATE character_attunement_slots SET slot_2_item_id = ?
       WHERE character_id = ?`,
      [cloakId, characterId],
    );
    const attuned = builder.build(characterId);
    expect(attuned.armor_class.value).toBe(19);
    expect(attuned.armor_class.bonuses.map((entry) => entry.label)).toEqual([
      'Cloak AC',
      'Attuned Shell AC',
      'Ring AC',
      'Manual AC',
    ]);
    // Constitution 13 + 2 = 15, moving its modifier from +1 to +2 across all
    // eight levels: 54 + 8 = 62.
    expect(attuned.class_hit_points_subtotal.value).toBe(62);
    expect(attuned.species_hit_points?.value).toBe(5);
    expect(attuned.walking_speed).toMatchObject({ kind: 'known', value: 35 });
    expect(attuned.damage_resistances).toEqual(['Fire']);
    expect(
      characterEffects(db, characterId).map((effect) => effect.label),
    ).toContain('Amulet HP');
  });

  it('resolves produced formulas before applying shields and AC bonuses', () => {
    db.exec(
      `UPDATE characters
       SET constitution = 16, charisma = 16
       WHERE id = ?`,
      [characterId],
    );
    const speciesSource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 'test-source:armadillo-species', 'species', 'Armadillo')`,
      [characterId],
    ).lastInsertId;
    const classSource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 'test-source:monk', 'class', 'Monk')`,
      [characterId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, base, ability_1, ability_2,
         allows_shield, source_instance_id, label
       ) VALUES
         (?, 1, 'armor_class_formula', 13, 'dexterity', NULL, 1, ?,
          'Armadillo Shell'),
         (?, 2, 'armor_class_formula', 10, 'dexterity', 'wisdom', 0, ?,
          'Martial Arts')`,
      [characterId, speciesSource, characterId, classSource],
    );
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount, label
       ) VALUES (?, 3, 'armor_class_bonus', 1, 'Cloak of the Armadillo')`,
      [characterId],
    );

    // DEX 14 is +2 and WIS 11 is +0: Armadillo Shell 15 beats Martial Arts
    // 12, then the Cloak adds 1.
    const unshielded = builder.build(characterId);
    expect(unshielded.armor_class.value).toBe(16);
    expect(unshielded.armor_class.winner).toMatchObject({
      label: 'Armadillo Shell',
      source: 'species',
      expression: '13 + DEX',
      total: 15,
    });

    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'shield', 'Shell Shield', 'shield', 2, 'none')`,
      [characterId],
    );
    // Martial Arts is ineligible with a shield. Armadillo Shell still permits
    // it: base 15 + shield 2 + cloak 1 = 18.
    const shielded = builder.build(characterId);
    expect(shielded.armor_class.value).toBe(18);
    expect(shielded.armor_class.excluded).toEqual([
      {
        formula: {
          label: 'Martial Arts',
          source: 'class',
          expression: '10 + DEX + WIS',
          total: null,
        },
        reason: {
          kind: 'shield_not_allowed',
          shield_name: 'Shell Shield',
        },
      },
    ]);
  });

  it('carries every excluded formula and a broken tie into the sheet projection', () => {
    const speciesSource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 'test-ac-disclosure-species', 'species', 'Armadillo')`,
      [characterId],
    ).lastInsertId;
    const classSource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 'test-ac-disclosure-class', 'class', 'Monk')`,
      [characterId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, base, ability_1, ability_2,
         allows_shield, source_instance_id, label
       ) VALUES
         (?, 1, 'armor_class_formula', 13, 'dexterity', NULL, 1, ?,
          'Armadillo Shell'),
         (?, 2, 'armor_class_formula', 13, 'dexterity', NULL, 1, ?,
          'Monk Shell')`,
      [characterId, speciesSource, characterId, classSource],
    );

    const tied = builder.build(characterId);
    expect(tied.armor_class.value).toBe(15);
    expect(tied.armor_class.tie_break).toEqual({
      winner: {
        label: 'Armadillo Shell',
        source: 'species',
        expression: '13 + DEX',
        total: 15,
      },
      losers: [
        {
          label: 'Monk Shell',
          source: 'class',
          expression: '13 + DEX',
          total: 15,
        },
      ],
      rule: 'source_precedence_then_label',
    });

    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'worn', 'Scute Wrap', 'light', 11, 'full')`,
      [characterId],
    );
    const armoured = builder.build(characterId);
    expect(armoured.armor_class.value).toBe(13);
    expect(
      armoured.armor_class.excluded.map((entry) => [
        entry.formula.label,
        entry.formula.expression,
        entry.reason.kind,
      ]),
    ).toEqual([
      ['Unarmoured', '10 + DEX', 'wearing_armor'],
      ['Armadillo Shell', '13 + DEX', 'wearing_armor'],
      ['Monk Shell', '13 + DEX', 'wearing_armor'],
    ]);
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

    // THE SHEET READS GRANTS, NEVER THE PROJECTION (skills plan §3.2, S-A):
    // `character_skill_proficiencies` is a derived transport projection now,
    // with `rebuildSkillProjection` as its one deriving writer, and the sheet
    // reads `activeGrantedSkills` off `character_skill_grants` instead. A
    // grant requires a real source instance — the FK is composite and
    // `ON DELETE CASCADE`-backed — so one is created here to hang the two
    // filled, ACTIVE grants off.
    const sourceInstanceId = db.exec(
      `INSERT INTO character_source_instances
         (character_id, instance_uuid, source_type, display_name)
       VALUES (?, 'test-skill-source', 'background', 'Test Skill Source')`,
      [characterId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_skill_grants
         (character_id, source_instance_id, grant_key, ordinal, skill, state)
       VALUES (?, ?, 'background_skill', 1, 'stealth', 'active'),
              (?, ?, 'background_skill', 2, 'perception', 'active')`,
      [characterId, sourceInstanceId, characterId, sourceInstanceId],
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
    db.exec(
      `INSERT INTO character_skill_expertise_grants
         (character_id, source_instance_id, grant_key, ordinal,
          granted_at_class_level, skill, state)
       VALUES (?, ?, 'class_expertise_1', 1, 1, 'stealth', 'active')`,
      [characterId, sourceInstanceId],
    );
    const withExpertise = builder.build(characterId);
    expect(
      withExpertise.skills.find((entry) => entry.skill === 'stealth'),
    ).toMatchObject({ proficient: true, expertise: true, value: 8 });

    // All eighteen skills are listed, always — a skill missing from a sheet
    // reads as a skill the character cannot use.
    expect(after.skills).toHaveLength(18);
  });

  it('keeps species hit points separate while naming their sum as the maximum', () => {
    db.exec(
      `INSERT INTO character_species (character_id, name, base_speed_feet)
       VALUES (?, 'Dwarf', 25)`,
      [characterId],
    );
    // ONE READ OF ONE TABLE feeds all three numbers below. The effects are
    // rows of their own now, labelled with whatever granted them, and the sheet
    // never touches the trait rows at all.
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, hit_points_flat,
          hit_points_per_level, label)
       VALUES (?, 1, 'hp_modifier', 0, 1, 'Dwarven Toughness')`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, speed_bonus_feet, label)
       VALUES (?, 2, 'speed', 5, 'Fleet of Foot')`,
      [characterId],
    );
    // An unchosen resistance, so the sheet's own projection of it is exercised
    // as a NAME rather than as the count it used to be.
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, label)
       VALUES (?, 3, 'damage_resistance', 'Fiendish Legacy')`,
      [characterId],
    );
    const sheet = builder.build(characterId);
    // The class subtotal is unchanged, while the maximum includes Dwarven
    // Toughness. Neither field can pass the other's number off under its name.
    expect(sheet.class_hit_points_subtotal.value).toBe(54);
    // 0 flat + 1 per level x total level 8 = 8.
    expect(sheet.species_hit_points?.value).toBe(8);
    expect(sheet.hit_point_maximum.value).toBe(62);
    // Base 25 + 5 = 30.
    expect(sheet.walking_speed).toMatchObject({ kind: 'known', value: 30 });
    // NAMED, not counted. The old sheet could only report how MANY resistances
    // were waiting on a decision, because an effect had no identity of its own.
    expect(sheet.damage_resistances).toEqual([]);
    expect(sheet.unchosen_damage_resistances).toEqual(['Fiendish Legacy']);
  });

  it('says the speed is not recorded rather than inventing 30', () => {
    db.exec(
      `INSERT INTO character_species (character_id, name) VALUES (?, 'Human')`,
      [characterId],
    );
    expect(builder.build(characterId).walking_speed).toEqual({
      kind: 'unknown',
      detail: 'UNKNOWN because this character has no species speed entered',
    });
  });

  it('names application-wide gaps without adding language/tool noise', () => {
    // F4: a blank features box reads as "this character has no features",
    // which is false. These are stated on every sheet because they are true of
    // every character in this application.
    // `background_skills_are_text` is DELETED, not reworded
    // (skills-with-provenance §3.5): background skills are FILLED grants the
    // modifiers count, and the hand-tick command the disclosure pointed at is
    // retired.
    // `gear_not_itemised` JOINED with E-B (D65): gear renders from the rules
    // tables and is never owned, which is true of every character equally —
    // no gear table exists under that ruling.
    const gaps = builder.build(characterId).gaps;
    expect(gaps.map((gap) => gap.kind)).toEqual([
      'no_class_feature_text',
      'partial_subclass_catalog',
      'weapon_reach_not_recorded',
      'gear_not_itemised',
    ]);
    expect(
      gaps.find((gap) => gap.kind === 'partial_subclass_catalog')?.detail,
    ).toBe(
        'Twelve SRD subclasses are bundled: one for every core class. ' +
        'User-published subclasses and optional bundled-homebrew imports can ' +
        'extend this curated catalog.',
    );
  });

  it('shows granting feature text and adds the languages/tools gap only when it applies', () => {
    db.exec(
      `INSERT INTO character_species (character_id, name, base_speed_feet)
       VALUES (?, 'Wayfarer', 30)`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species_traits (
         character_id, sort_order, name, description
       ) VALUES (
         ?, 1, 'Keen Senses', 'You have advantage on Perception checks.'
       )`,
      [characterId],
    );

    const withoutGrant = builder.build(characterId);
    expect(
      withoutGrant.gaps.map((gap) => gap.kind),
    ).not.toContain('languages_and_tools_not_modelled');
    expect(withoutGrant.printed_features).toEqual([
      {
        source: 'species_trait',
        source_name: 'Wayfarer',
        name: 'Keen Senses',
        text: 'You have advantage on Perception checks.',
      },
    ]);

    db.exec(
      `INSERT INTO character_background (
         character_id, name, tool_proficiency
       ) VALUES (?, 'Sage', 'Calligrapher’s Supplies')`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species_traits (
         character_id, sort_order, name, description
       ) VALUES (
         ?, 2, 'Gift of Tongues', 'You know two languages of your choice.'
       )`,
      [characterId],
    );

    const granting = builder.build(characterId);
    const gap = granting.gaps.find(
      (entry) => entry.kind === 'languages_and_tools_not_modelled',
    );
    expect(gap).toEqual({
      kind: 'languages_and_tools_not_modelled',
      title: 'Languages and tool proficiencies are not modelled',
      detail:
        'This application does not record language or tool proficiency choices ' +
        'as character facts and does not apply them mechanically. Read the ' +
        'printed background and species feature text above for the grants this ' +
        'character has.',
    });
    expect(granting.printed_features).toEqual([
      {
        source: 'background',
        source_name: 'Sage',
        name: 'Tool Proficiency',
        text: 'Calligrapher’s Supplies',
      },
      {
        source: 'species_trait',
        source_name: 'Wayfarer',
        name: 'Keen Senses',
        text: 'You have advantage on Perception checks.',
      },
      {
        source: 'species_trait',
        source_name: 'Wayfarer',
        name: 'Gift of Tongues',
        text: 'You know two languages of your choice.',
      },
    ]);
  });

  it('shows acquired subclass prose and withholds it below its owning-class level', () => {
    const contentKey = 'expanded:content.subclass:barbed-oracle';
    registerFixtureContentIdentity(db, {
      kind: 'subclass',
      contentKey,
      name: 'Barbed Oracle',
      keyKind: 'asserted',
    });
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition
       ) VALUES (?, ?, 'Barbed Oracle', 'expanded')`,
      [contentKey, classId('Wizard')],
    ).lastInsertId;
    const hostileProse =
      '</details><script data-subclass-rule>hostile()</script> Read this rule.';
    db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description
       ) VALUES
         (?, 3, 1, 'Barbed Goad', ?),
         (?, 6, 2, 'Future Barb', 'Not acquired yet.')`,
      [subclassId, hostileProse, subclassId],
    );
    db.exec(
      `UPDATE character_class_levels
       SET level = 2, subclass_definition_id = ?
       WHERE character_id = ? AND class_definition_id = ?`,
      [subclassId, characterId, classId('Wizard')],
    );

    expect(builder.build(characterId).subclass_features).toEqual([]);

    db.exec(
      `UPDATE character_class_levels SET level = 3
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId('Wizard')],
    );
    expect(builder.build(characterId).subclass_features).toEqual([
      {
        subclass_name: 'Barbed Oracle',
        subclass_catalog_layer: 'external',
        class_level: 3,
        name: 'Barbed Goad',
        description: hostileProse,
      },
    ]);
  });

  it('detects granting words in background notes and a species trait name', () => {
    db.exec(
      `INSERT INTO character_background (
         character_id, name, notes
       ) VALUES (?, 'Traveller', 'Languages: choose Elvish or Dwarvish.')`,
      [characterId],
    );

    const fromBackgroundNotes = builder.build(characterId);
    expect(fromBackgroundNotes.printed_features).toEqual([
      {
        source: 'background',
        source_name: 'Traveller',
        name: 'Background notes',
        text: 'Languages: choose Elvish or Dwarvish.',
      },
    ]);
    expect(fromBackgroundNotes.gaps.map((gap) => gap.kind)).toContain(
      'languages_and_tools_not_modelled',
    );

    db.exec(
      'DELETE FROM character_background WHERE character_id = ?',
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species (character_id, name, base_speed_feet)
       VALUES (?, 'Tinkerkin', 30)`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species_traits (
         character_id, sort_order, name, description
       ) VALUES (?, 1, 'Tools of the Trade', NULL)`,
      [characterId],
    );

    const fromTraitName = builder.build(characterId);
    expect(fromTraitName.printed_features).toEqual([
      {
        source: 'species_trait',
        source_name: 'Tinkerkin',
        name: 'Tools of the Trade',
        text: null,
      },
    ]);
    expect(fromTraitName.gaps.map((gap) => gap.kind)).toContain(
      'languages_and_tools_not_modelled',
    );
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
    expect(sheet.class_hit_points_subtotal.value).toBe(54);
  });

  it('says a degraded starting class ONCE, not once per derivation', () => {
    // THREE derivations go through `startingClass` — hit points, saving throws
    // and the proficiency union — and every one of them returns its warnings. A
    // review measured the page printing `no_starting_class` TWICE, because the
    // filter compared only two of the three arms against each other. Two
    // identical sentences read as two different problems.
    db.exec(
      'UPDATE character_class_levels SET is_starting_class = 0 WHERE character_id = ?',
      [characterId],
    );
    expect(
      builder
        .build(characterId)
        .warnings.filter((warning) => warning.code === 'no_starting_class'),
    ).toHaveLength(1);

    // The other degradation, from the other direction: two classes flagged.
    db.exec(
      'UPDATE character_class_levels SET is_starting_class = 1 WHERE character_id = ?',
      [characterId],
    );
    expect(
      builder
        .build(characterId)
        .warnings.filter(
          (warning) => warning.code === 'several_starting_classes',
        ),
    ).toHaveLength(1);
  });

  it('still says a code twice when it names two different subjects', () => {
    // THE CONVERSE, and it is what keeps the deduplication from becoming a
    // one-per-code rule. A Wizard holding two Martial weapons owes TWO
    // sentences, because they name two different weapons; collapsing them would
    // hide one of the two from the reader.
    db.exec('DELETE FROM character_class_levels WHERE character_id = ?', [
      characterId,
    ]);
    addClass('Wizard', 3, true);
    db.exec(
      `INSERT INTO character_weapons
         (character_id, name, proficiency_category, mastery_selected)
       VALUES (?, 'Greatsword', 'martial', 0), (?, 'Halberd', 'martial', 0)`,
      [characterId, characterId],
    );
    const weapons = builder
      .build(characterId)
      .warnings.filter((warning) => warning.code === 'weapon_not_proficient');
    expect(weapons).toHaveLength(2);
    expect(weapons.map((warning) => warning.message.split(' ')[0])).toEqual([
      'Greatsword',
      'Halberd',
    ]);
  });

  it('does not pass off an assumed hit die as a class’s printed one', () => {
    // REACHABLE, and about to become more so: a class arrives with no
    // `class_sheet_traits` row whenever it is homebrew or imported, which is
    // exactly what the catalog-import work makes possible. `seedSheetContent`
    // supplies the row for all twelve printed classes, so this is the only
    // shape that produces the gap.
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'homebrew:bladewright', name: 'Bladewright',
      keyKind: 'asserted',
    });
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
    expect(sheet.class_hit_points_subtotal.value).toBe(72);
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
    expect(sheet.class_hit_points_subtotal.value).toBe(61);
    expect(sheet.class_hit_points_subtotal.value).not.toBe(54);

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
