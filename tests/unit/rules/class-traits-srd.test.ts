import { describe, expect, it } from 'vitest';
import {
  parseSrdClassTraits,
  parseSrdExtraAttackGrants,
  parseSrdMartialArtsDice,
  SRD_CLASS_NAMES,
} from '../../../src/rules/class-traits-srd';
import coreTraitsSource from '../../../docs/srd/source/class-core-traits.txt?raw';
import attackFeaturesSource from '../../../docs/srd/source/attack-class-features.txt?raw';

/**
 * THE ORACLE IS THE EXTRACT, READ BY A HUMAN — NOT THE PARSER'S OUTPUT.
 *
 * Every expectation below was transcribed by reading
 * `docs/srd/source/class-core-traits.txt` and
 * `docs/srd/source/attack-class-features.txt` by eye. None of it was produced
 * by running the parser and pasting the result, and it must never be maintained
 * that way — a test asserting that the parser produced what the parser produced
 * cannot fail, and the whole reason for parsing rather than hand-typing a table
 * is that the parse can be checked against the source.
 *
 * THE CASES ARE THE AWKWARD ONES. Each is here because it breaks a DIFFERENT
 * naive implementation, and the mutation block at the end of this file proves
 * that these assertions really are load-bearing rather than incidentally true.
 */

const traits = parseSrdClassTraits();

function forClass(name: string) {
  const found = traits.find((entry) => entry.class_name === name);
  if (found === undefined) {
    throw new Error(`No parsed traits for ${name}.`);
  }
  return found;
}

describe('SRD class core traits', () => {
  it('yields exactly the twelve classes', () => {
    expect(traits).toHaveLength(12);
    expect(traits.map((entry) => entry.class_name)).toEqual([
      ...SRD_CLASS_NAMES,
    ]);
  });

  it('reads a hit die past the multiclass bullet that repeats the label', () => {
    // `Hit Point Die  D12 per Barbarian level` at the table's own column.
    //
    // THE HAZARD: `Hit Point Die` occurs SEVENTEEN times in the extract for
    // twelve classes. The Barbarian block carries a second one at column 85,
    // bleeding in from the facing column's "As a Multiclass Character" bullet
    // ("…from the Core Barbarian Traits table: Hit Point Die, proficiency with
    // Martial weapons, and training with Shields"). A line-oriented parse reads
    // that bullet as a table row.
    expect(forClass('Barbarian').hit_die).toBe(12);
    // Cleric, Druid and Fighter carry the same duplicate label.
    expect(forClass('Cleric').hit_die).toBe(8);
    expect(forClass('Druid').hit_die).toBe(8);
    expect(forClass('Fighter').hit_die).toBe(10);
  });

  it('reads a class whose table is in the RIGHT column', () => {
    // THE HAZARD: `class-core-traits.txt` says in its own header to "read the
    // left column". That instruction is WRONG for five of twelve classes.
    // The Monk's Core Traits table starts at column 63; the left column beside
    // it is Champion subclass prose ("Level 3: Remarkable Athlete… Advantage on
    // Initiative rolls and Strength (Athletics) checks").
    expect(forClass('Monk')).toMatchObject({
      hit_die: 8,
      saving_throws: ['strength', 'dexterity'],
      skill_choice_count: 2,
      skill_choice_from_any: false,
    });
    // `Skill Proficiencies  Choose 2: Acrobatics, Athlet-/ics, History,
    // Insight, Religion,/ or Stealth` — a hyphen wrap in the middle.
    expect(forClass('Monk').skill_options).toEqual([
      'acrobatics',
      'athletics',
      'history',
      'insight',
      'religion',
      'stealth',
    ]);
  });

  it("does not ingest the Sorcerer's spell table printed beside the Warlock", () => {
    // THE HAZARD: the Warlock block's LEFT column is the SORCERER's Draconic
    // Spells table — "Level | Spells", then rows 3/5/7/9 with spell names. Any
    // "scan from the left" or "the line has digits" heuristic reads spell data
    // as Warlock traits.
    expect(forClass('Warlock')).toMatchObject({
      hit_die: 8,
      saving_throws: ['wisdom', 'charisma'],
      skill_choice_count: 2,
    });
    // `Choose 2: Arcana, Deception,/ History, Intimidation, Investi-/gation,
    // Nature, or Religion` — seven options, and `Investi-`/`gation` is a
    // hyphen wrap.
    expect(forClass('Warlock').skill_options).toEqual([
      'arcana',
      'deception',
      'history',
      'intimidation',
      'investigation',
      'nature',
      'religion',
    ]);
    // Not a Sorcerer spell level, and not 3, 5, 7 or 9.
    expect(forClass('Warlock').skill_options).not.toContain('alter_self');
  });

  it('reads the Bard, whose skill row is a different SHAPE with no list', () => {
    // `Skill Proficiencies  Choose any 3 skills (see "Playing/ the Game")`.
    //
    // THE HAZARD: a parser requiring `Choose N:` followed by a list either
    // throws here or invents one, and a model that can only hold a list makes
    // the Bard unrepresentable. Zero options is the SOURCED fact, and
    // `skill_choice_from_any` is what distinguishes it from a mis-parse.
    expect(forClass('Bard')).toMatchObject({
      hit_die: 8,
      skill_choice_count: 3,
      skill_choice_from_any: true,
      skill_options: [],
    });
  });

  it('reads the Rogue, whose skill list wraps six lines with BOTH wrap forms', () => {
    // `Choose 4: Acrobatics, Ath-/letics, Deception, Insight,/ Intimidation,
    // Investigation,/ Perception, Persuasion, Sleight/of Hand, or Stealth`
    //
    // THE HAZARD: `Ath-`/`letics` is a HYPHEN wrap (join with no space) and
    // `Sleight`/`of Hand` is a SPACE wrap (join with one). Both appear in this
    // single field, so neither joining rule can be dropped.
    expect(forClass('Rogue').skill_choice_count).toBe(4);
    expect(forClass('Rogue').skill_options).toEqual([
      'acrobatics',
      'athletics',
      'deception',
      'insight',
      'intimidation',
      'investigation',
      'perception',
      'persuasion',
      'sleight_of_hand',
      'stealth',
    ]);
  });

  it('keeps the property qualifier that a bare simple/martial pair would lose', () => {
    // Monk:  `Simple weapons and Martial/ weapons that have the Light/ property`
    // Rogue: `Simple weapons and Martial/ weapons that have the Finesse/ or
    //         Light property`
    //
    // THE HAZARD: recording either as plain `martial` tells the player they are
    // proficient with a Greataxe. Two of twelve classes are misreported by a
    // category-only model.
    expect(forClass('Monk').weapon_proficiencies).toEqual([
      { category: 'simple', property_qualifier: null },
      { category: 'martial', property_qualifier: 'Light' },
    ]);
    expect(forClass('Rogue').weapon_proficiencies).toEqual([
      { category: 'simple', property_qualifier: null },
      { category: 'martial', property_qualifier: 'Finesse or Light' },
    ]);
    // The unqualified majority, for contrast.
    expect(forClass('Fighter').weapon_proficiencies).toEqual([
      { category: 'simple', property_qualifier: null },
      { category: 'martial', property_qualifier: null },
    ]);
    expect(forClass('Wizard').weapon_proficiencies).toEqual([
      { category: 'simple', property_qualifier: null },
    ]);
  });

  it('distinguishes an explicit Armor Training of None from an unparsed class', () => {
    // Monk, Sorcerer and Wizard all print the WORD "None". Empty armour
    // training and "we never parsed this class" both render as zero rows, and
    // they are different facts — which is why `class_sheet_traits` is a
    // separate table whose row EXISTENCE says the class was parsed.
    for (const name of ['Monk', 'Sorcerer', 'Wizard']) {
      expect(forClass(name).armor_training, name).toEqual([]);
      // Parsed, and therefore present with a real hit die.
      expect(forClass(name).hit_die, name).toBeGreaterThan(0);
    }
    // `Light and Medium armor and/ Shields` — Shields is a category here, not a
    // separate boolean.
    expect(forClass('Barbarian').armor_training).toEqual([
      'light',
      'medium',
      'shield',
    ]);
    // `Light, Medium, and Heavy ar-/mor and Shields` — an Oxford comma and a
    // hyphen wrap inside the word "armor".
    expect(forClass('Paladin').armor_training).toEqual([
      'light',
      'medium',
      'heavy',
      'shield',
    ]);
    // `Light armor and Shields`, with no Medium.
    expect(forClass('Druid').armor_training).toEqual(['light', 'shield']);
    // `Light armor`, with no Shields.
    expect(forClass('Rogue').armor_training).toEqual(['light']);
  });

  it('reads all twelve saving throw pairs', () => {
    // Transcribed line by line from the twelve `Saving Throw / Proficiencies`
    // rows. Every one is a PAIR, which is why the schema stores a SET rather
    // than trusting that N is always two.
    const expected: Record<string, [string, string]> = {
      Barbarian: ['strength', 'constitution'],
      Bard: ['dexterity', 'charisma'],
      Cleric: ['wisdom', 'charisma'],
      Druid: ['intelligence', 'wisdom'],
      Fighter: ['strength', 'constitution'],
      Monk: ['strength', 'dexterity'],
      Paladin: ['wisdom', 'charisma'],
      Ranger: ['strength', 'dexterity'],
      Rogue: ['dexterity', 'intelligence'],
      Sorcerer: ['constitution', 'charisma'],
      Warlock: ['wisdom', 'charisma'],
      Wizard: ['intelligence', 'wisdom'],
    };
    for (const [name, abilities] of Object.entries(expected)) {
      expect(forClass(name).saving_throws, name).toEqual(abilities);
    }
  });

  it('reads all twelve hit dice', () => {
    // `D12 per Barbarian level`, `D10 per Fighter level`, and so on — one d12,
    // three d10, six d8, two d6.
    const expected: Record<string, number> = {
      Barbarian: 12,
      Bard: 8,
      Cleric: 8,
      Druid: 8,
      Fighter: 10,
      Monk: 8,
      Paladin: 10,
      Ranger: 10,
      Rogue: 8,
      Sorcerer: 6,
      Warlock: 8,
      Wizard: 6,
    };
    for (const [name, die] of Object.entries(expected)) {
      expect(forClass(name).hit_die, name).toBe(die);
    }
    const counts = traits.map((entry) => entry.hit_die);
    expect(counts.filter((die) => die === 12)).toHaveLength(1);
    expect(counts.filter((die) => die === 10)).toHaveLength(3);
    expect(counts.filter((die) => die === 8)).toHaveLength(6);
    expect(counts.filter((die) => die === 6)).toHaveLength(2);
  });

  it('reads the three skill-choice counts the extract prints', () => {
    // `Choose 2` for eight classes, `Choose any 3` for the Bard, `Choose 3` for
    // the Ranger, `Choose 4` for the Rogue.
    expect(forClass('Ranger').skill_choice_count).toBe(3);
    expect(forClass('Ranger').skill_choice_from_any).toBe(false);
    expect(forClass('Rogue').skill_choice_count).toBe(4);
    expect(
      traits.filter((entry) => entry.skill_choice_count === 2),
    ).toHaveLength(9);
  });

  it('NEGATIVE CONTROL: Performance appears in no class list', () => {
    // MEASURED, and the reason `skills` is closed on the Skills table rather
    // than on the class lists. The twelve Core Traits tables between them name
    // only SEVENTEEN of the eighteen skills — `performance` is in none of them.
    // A vocabulary "closed on evidence" from these lists would have been
    // seventeen skills, silently wrong, and nothing would have failed.
    const offered = new Set(traits.flatMap((entry) => entry.skill_options));
    expect(offered.has('performance')).toBe(false);
    expect(offered.size).toBe(17);
  });
});

describe('SRD Extra Attack grants', () => {
  const grants = parseSrdExtraAttackGrants();

  function counts(name: string): [number, number][] {
    const found = grants.find((entry) => entry.class_name === name);
    if (found === undefined) {
      throw new Error(`No Extra Attack block for ${name}.`);
    }
    return [...found.counts].sort((left, right) => left[0] - right[0]);
  }

  it('attributes every grant to a class NAMED IN THE EXTRACT', () => {
    // THE HAZARD THIS REPLACES: the first version of this extract carried the
    // seven granting rows with NO class names at all — deciding that
    // "Extra Attack, Tactical Shift" is a Fighter row would have required
    // recognising the feature from memory, and one row carried no
    // distinguishing feature name whatsoever. The section was re-extracted with
    // each class's Features table title above its own rows.
    expect(grants.map((entry) => entry.class_name).sort()).toEqual([
      'Barbarian',
      'Fighter',
      'Monk',
      'Paladin',
      'Ranger',
    ]);
  });

  it('reads TOTAL attacks, taken from the feature text rather than its name', () => {
    // `Level 5: Extra Attack — You can attack twice instead of once`
    // `Level 11: Two Extra Attacks — You can attack three times instead of once`
    // `Level 20: Three Extra Attacks — You can attack four times instead of once`
    //
    // Deriving 3 from the words "Two Extra Attacks" would be arithmetic on a
    // feature's NAME. The extract carries the Fighter's own sentences.
    expect(counts('Fighter')).toEqual([
      [5, 2],
      [11, 3],
      [20, 4],
    ]);
  });

  it('gives the other four classes a single level 5 grant of two attacks', () => {
    for (const name of ['Barbarian', 'Monk', 'Paladin', 'Ranger']) {
      expect(counts(name), name).toEqual([[5, 2]]);
    }
  });

  it('does not scan the multiclass prose that follows the labelled blocks', () => {
    // The `=== Extra Attack and MULTICLASSING ===` section mentions "Extra
    // Attack" four more times and the Fighter's "Two Extra Attacks" feature by
    // name. None of it is a table row, and none of it may become a grant.
    expect(grants).toHaveLength(5);
    expect(
      grants.reduce((total, entry) => total + entry.counts.size, 0),
    ).toBe(7);
  });
});

describe('SRD Martial Arts die progression', () => {
  const dice = parseSrdMartialArtsDice();

  it('covers all twenty levels', () => {
    expect(dice.size).toBe(20);
    for (let level = 1; level <= 20; level += 1) {
      expect(dice.has(level), `level ${String(level)}`).toBe(true);
    }
  });

  it('steps 1d6, 1d8 at 5, 1d10 at 11, 1d12 at 17', () => {
    // Read off the Martial Arts column of the Monk Features table. The step
    // BOUNDARIES are what a short or gappy parse gets wrong, so both sides of
    // each are asserted.
    expect(dice.get(1)).toBe(6);
    expect(dice.get(4)).toBe(6);
    expect(dice.get(5)).toBe(8);
    expect(dice.get(10)).toBe(8);
    expect(dice.get(11)).toBe(10);
    expect(dice.get(16)).toBe(10);
    expect(dice.get(17)).toBe(12);
    expect(dice.get(20)).toBe(12);
  });
});

/**
 * PROOF THAT THESE ASSERTIONS CAN FAIL.
 *
 * A parse test that stays green when the source changes is a tautology. Each
 * case below mutates a COPY of the extract in memory and asserts the parser's
 * answer moves — so a future edit that quietly stops reading the file, or that
 * widens a pattern until it matches anything, breaks here.
 */
describe('the parse is load-bearing, not incidental', () => {
  it('follows the extract when a hit die changes', () => {
    const mutated = coreTraitsSource.replace(
      'D6 per Wizard level',
      'D8 per Wizard level',
    );
    expect(mutated).not.toBe(coreTraitsSource);
    const parsed = parseSrdClassTraits(mutated);
    expect(
      parsed.find((entry) => entry.class_name === 'Wizard')?.hit_die,
    ).toBe(8);
    // And the unmutated parse still says 6, so the assertion above is not
    // passing because the parser ignores the file.
    expect(forClass('Wizard').hit_die).toBe(6);
  });

  it('follows the extract when a saving throw changes', () => {
    const mutated = coreTraitsSource.replace(
      'Saving Throw             Strength and Constitution',
      'Saving Throw             Charisma and Constitution',
    );
    expect(mutated).not.toBe(coreTraitsSource);
    const parsed = parseSrdClassTraits(mutated);
    expect(
      parsed.find((entry) => entry.class_name === 'Barbarian')?.saving_throws,
    ).toEqual(['charisma', 'constitution']);
  });

  it('throws rather than guessing when a class block is removed', () => {
    const mutated = coreTraitsSource.replace('=== Core Wizard Traits ===', '=== Gone ===');
    expect(() => parseSrdClassTraits(mutated)).toThrow(/expected the twelve/);
  });

  it('throws rather than skipping when a skill is not in the vocabulary', () => {
    const mutated = coreTraitsSource.replace(
      'Choose 2: Arcana, History, In-',
      'Choose 2: Lockpicking, History, In-',
    );
    expect(mutated).not.toBe(coreTraitsSource);
    expect(() => parseSrdClassTraits(mutated)).toThrow(/not in the Skills table/);
  });

  it('throws rather than defaulting when a hit die is not a printed size', () => {
    const mutated = coreTraitsSource.replace(
      'D12 per Barbarian level',
      'D7 per Barbarian level',
    );
    expect(mutated).not.toBe(coreTraitsSource);
    expect(() => parseSrdClassTraits(mutated)).toThrow(/not one of D6, D8, D10, D12/);
  });

  it('follows the extract when an Extra Attack row moves level', () => {
    const mutated = attackFeaturesSource.replace(
      '        11            +4         Two Extra Attacks',
      '        12            +4         Two Extra Attacks',
    );
    expect(mutated).not.toBe(attackFeaturesSource);
    const parsed = parseSrdExtraAttackGrants(mutated);
    const fighter = parsed.find((entry) => entry.class_name === 'Fighter');
    expect([...(fighter?.counts ?? [])].sort((a, b) => a[0] - b[0])).toEqual([
      [5, 2],
      [12, 3],
      [20, 4],
    ]);
  });

  it('throws when the Martial Arts table loses a level', () => {
    const mutated = attackFeaturesSource.replace(
      /^ +13 +\+5 +Deflect Energy.*$/m,
      '',
    );
    expect(mutated).not.toBe(attackFeaturesSource);
    expect(() => parseSrdMartialArtsDice(mutated)).toThrow(/missing level 13/);
  });
});
