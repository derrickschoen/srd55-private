import { describe, expect, it } from 'vitest';
import { AbilityScores } from '../../../src/rules/ability-scores';
import {
  armorClass as resolveArmorClass,
  attacksPerAction,
  fixedHitPointsPerLevel,
  hitDieOrAbsent,
  hitPointMaximum,
  initiative,
  MAXIMUM_CHARACTER_LEVEL,
  passivePerception,
  resolveSheetResources,
  savingThrowModifier,
  savingThrowProficiencies,
  sheetProficiencyBonus,
  skillModifier,
  totalLevelWarnings,
  type SheetArmor,
  type SheetClass,
  type ArmorClassBonusCandidate,
  type ArmorClassFormulaCandidate,
  type EquippedArmor,
  type SheetResourceClassInput,
} from '../../../src/rules/sheet';
import { characterLevel } from '../../../src/rules/character-level';
import type { ExtraAttackGrant } from '../../../src/rules/extra-attack';
import { hitDieSizes } from '../../../src/domain/enums';
import { parseSkillAbilities } from '../../../src/rules/skills';
import { parseSrdArmorTemplates } from '../../../src/rules/armor-srd';
import type { ClassDefinitionId, ClassLevel } from '../../../src/domain/ids';
import type {
  ClassResourceFormula,
  PositiveInteger,
  PositiveResourceMaximum,
} from '../../../src/domain/class-resources';

/**
 * EVERY NUMBER HERE IS COMPUTED BY HAND AND WRITTEN AS A LITERAL.
 *
 * Not one expectation was produced by running the function and pasting its
 * output — that is the tautology D7 forbids, and it is especially tempting for
 * arithmetic, where the wrong answer looks exactly as plausible as the right
 * one. The working is written out beside each assertion so a reviewer can check
 * the sum without running anything.
 *
 * The SRD numbers the formulas are checked against are transcribed from
 * `docs/srd/source/sheet-math.txt` and `docs/srd/source/multiclassing.txt` by
 * eye, and the multiclass cases are the ones a naive implementation gets wrong.
 */

function scores(values: Partial<Record<string, number>>): AbilityScores {
  return AbilityScores.fromArray({
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    ...values,
  });
}

function resourceClass(
  id: number,
  className: string,
  classLevel: unknown,
  changes: Partial<SheetResourceClassInput> = {},
): SheetResourceClassInput {
  return {
    class_definition_id: id as ClassDefinitionId,
    class_name: className,
    class_level: classLevel,
    catalog: {
      status: 'recorded',
      expected_ladder_kinds: [],
      expected_formula_kinds: [],
      has_unmodelled_feature_maxima: false,
    },
    ladder_rows: [],
    formula_rows: [],
    base_spellcasting: {
      progression_type: 'none',
      progression_row: { status: 'missing' },
    },
    subclass_spellcasting: null,
    ...changes,
  };
}

const PRESENT_ABILITIES = {
  charisma: { status: 'present' as const, modifier: 2 },
  wisdom: { status: 'present' as const, modifier: 3 },
};

/**
 * Mechanical adapter for the pre-AC-3 fixtures below. Their hand-computed
 * assertions remain unchanged; only the resolver input was replaced.
 */
function armorClass(input: {
  readonly armor?: SheetArmor | null;
  readonly shield?: SheetArmor | null;
  readonly scores: AbilityScores;
  readonly adjustment?: number;
  readonly formulas?: readonly ArmorClassFormulaCandidate[];
  readonly bonuses?: readonly ArmorClassBonusCandidate[];
}) {
  const equipment: EquippedArmor[] = [];
  if (input.armor !== undefined && input.armor !== null) {
    equipment.push({ slot: 'worn', armor: input.armor });
  }
  if (input.shield !== undefined && input.shield !== null) {
    equipment.push({ slot: 'shield', armor: input.shield });
  }
  return resolveArmorClass({
    equipment,
    formulas: input.formulas ?? [],
    bonuses: [
      ...(input.bonuses ?? []),
      ...(input.adjustment === undefined || input.adjustment === 0
        ? []
        : [{ label: 'Manual adjustment', amount: input.adjustment }]),
    ],
    scores: input.scores,
  });
}

/** A class-table grant, in the shape `SheetContentLookup` builds one. */
function classGrant(
  className: string,
  classLevel: number,
  attackCount: number,
): ExtraAttackGrant {
  return {
    source: 'class',
    source_name: className,
    class_level: classLevel,
    attack_count: attackCount,
    weapon_scope: 'any_weapon',
    unresolved: [],
  };
}

/**
 * NO PROFICIENCY GRANTS, for every fixture in this file.
 *
 * These tests are about hit points, armour class, saving throws and the two
 * derivations that read class LEVELS. None of them reads a proficiency grant,
 * and writing the Fighter's real armour training into them would put twelve
 * lines of content beside every fixture that nothing here asserts — which is
 * how a fixture starts disagreeing with the seed without anything noticing.
 * The proficiency union has its own file, with its own transcribed grants.
 */
const NO_PROFICIENCIES: SheetClass['proficiencies'] = {
  armor_training: [],
  weapon_proficiencies: [],
};

const FIGHTER: SheetClass = {
  proficiencies: NO_PROFICIENCIES,
  class_name: 'Fighter',
  level: 5,
  hit_die: 10,
  is_starting_class: true,
  saving_throws: ['strength', 'constitution'],
  // The three class-table rows the Fighter's own Features table prints, as
  // grants rather than as a level -> count map (D19). Every one is
  // `source: 'class'`, unscoped and resolved: a class table row applies to the
  // character, and the character's levels in that class are recorded outright.
  extra_attack_grants: [
    classGrant('Fighter', 5, 2),
    classGrant('Fighter', 11, 3),
    classGrant('Fighter', 20, 4),
  ],
};

const WIZARD: SheetClass = {
  proficiencies: NO_PROFICIENCIES,
  class_name: 'Wizard',
  level: 3,
  hit_die: 6,
  is_starting_class: false,
  saving_throws: ['intelligence', 'wisdom'],
};

const RANGER: SheetClass = {
  proficiencies: NO_PROFICIENCIES,
  class_name: 'Ranger',
  level: 5,
  hit_die: 10,
  is_starting_class: false,
  saving_throws: ['strength', 'dexterity'],
  extra_attack_grants: [classGrant('Ranger', 5, 2)],
};

describe('proficiency bonus and total level', () => {
  it('preserves the absence of every class row', () => {
    expect(characterLevel([])).toBeNull();
    expect(sheetProficiencyBonus([])).toBeNull();
    expect(sheetProficiencyBonus([], 7)).toBeNull();
  });

  it('sums levels across classes rather than taking the highest', () => {
    // Fighter 5 + Wizard 3 = 8.
    expect(characterLevel([FIGHTER.level, WIZARD.level])).toBe(8);
    // `multiclassing.txt`: "if you are a level 3 Fighter / level 2 Rogue, you
    // have the Proficiency Bonus of a level 5 character, which is +3." That
    // worked example is transcribed here as its own case.
    const fighter3: SheetClass = { ...FIGHTER, level: 3 };
    const rogue2: SheetClass = { ...WIZARD, class_name: 'Rogue', level: 2 };
    expect(characterLevel([fighter3.level, rogue2.level])).toBe(5);
    expect(sheetProficiencyBonus([fighter3, rogue2])).toBe(3);
    // Taking the maximum per class would give a level 3 character, +2 — the
    // bug this asserts against.
    expect(sheetProficiencyBonus([fighter3, rogue2])).not.toBe(2);
  });

  it('walks the whole printed Proficiency Bonus table', () => {
    // `skills-table.txt`: Up to 4 -> +2, 5-8 -> +3, 9-12 -> +4, 13-16 -> +5,
    // 17-20 -> +6. Both sides of every boundary.
    const at = (level: number) =>
      sheetProficiencyBonus([{ ...FIGHTER, level }]);
    expect([at(1), at(4)]).toEqual([2, 2]);
    expect([at(5), at(8)]).toEqual([3, 3]);
    expect([at(9), at(12)]).toEqual([4, 4]);
    expect([at(13), at(16)]).toEqual([5, 5]);
    expect([at(17), at(20)]).toEqual([6, 6]);
  });

  it('honours the stored override, as the planner already does', () => {
    // Fighter 5 / Wizard 3 is +3 by the table; the override wins so that the
    // sheet and the spell planner cannot print two different numbers.
    expect(sheetProficiencyBonus([FIGHTER, WIZARD], 7)).toBe(7);
    expect(sheetProficiencyBonus([FIGHTER, WIZARD], null)).toBe(3);
  });
});

/**
 * F11'S SECOND HALF: THE COMBINED TOTAL IS A SHEET WARNING, NOT A REFUSAL.
 *
 * `multiclassing.txt`: "you can't take a level in a class if that would cause
 * your total character level to exceed 20." The guided builder enforces that by
 * throwing (`add-source.ts`, `update-class.ts`); the backup boundary does not,
 * deliberately, because refusing a whole document over a multiclass total would
 * lose the character to state a number (D11 part 2). So the sheet has to say it.
 */
describe('a character whose class levels add up to more than 20', () => {
  const FIGHTER_20: SheetClass = { ...FIGHTER, level: 20 };
  const WIZARD_5: SheetClass = { ...WIZARD, level: 5 };

  it('says nothing at or below 20', () => {
    expect(totalLevelWarnings([{ ...FIGHTER, level: 20 }])).toEqual([]);
    // Fighter 17 + Wizard 3 = 20, the boundary itself.
    expect(
      totalLevelWarnings([{ ...FIGHTER, level: 17 }, { ...WIZARD, level: 3 }]),
    ).toEqual([]);
    expect(totalLevelWarnings([])).toEqual([]);
  });

  it('warns once at 21 and names the total it actually used', () => {
    // Fighter 20 + Wizard 5 = 25.
    const warnings = totalLevelWarnings([FIGHTER_20, WIZARD_5]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe('total_level_exceeds_maximum');
    expect(warnings[0]?.message).toContain('25 levels across 2 classes');
    expect(warnings[0]?.message).toContain('cannot exceed level 20');
    // One over the line is enough — Fighter 20 + Wizard 1 = 21.
    expect(
      totalLevelWarnings([FIGHTER_20, { ...WIZARD, level: 1 }]),
    ).toHaveLength(1);
  });

  it('reaches the sheet through the hit point arm, which is what spends the excess', () => {
    // The warning has no meaning unless a consumer sees it, and
    // `CharacterSheetBuilder` reads it off `hitPointMaximum`. Asserted here
    // rather than only on `totalLevelWarnings`, because a warning that is
    // computed and then never concatenated is invisible on the page.
    const result = hitPointMaximum({
      classes: [FIGHTER_20, WIZARD_5],
      scores: scores({ constitution: 10 }),
    });
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'total_level_exceeds_maximum',
    );
  });

  it('does NOT clamp: the maximum is computed from the levels as recorded', () => {
    // Fighter 20 starting: 10 + 0 at level 1, then 19 levels of d10 fixed (6)
    // = 10 + 114 = 124. Wizard 5 adds 5 levels of d6 fixed (4) = 20.
    // 124 + 20 = 144. Clamping the character to 20 total levels would drop the
    // five Wizard levels and give 124, which is the bug this asserts against.
    const result = hitPointMaximum({
      classes: [FIGHTER_20, WIZARD_5],
      scores: scores({ constitution: 10 }),
    });
    expect(result.maximum).toBe(144);
    expect(result.maximum).not.toBe(124);
    // And the derived bonus follows the recorded total too, rather than being
    // silently capped at the level-20 value.
    expect(characterLevel([FIGHTER_20.level, WIZARD_5.level])).toBe(25);
  });

  it('states the maximum as one constant rather than a literal in the message', () => {
    expect(MAXIMUM_CHARACTER_LEVEL).toBe(20);
    expect(totalLevelWarnings([{ ...FIGHTER, level: MAXIMUM_CHARACTER_LEVEL }]))
      .toEqual([]);
    expect(
      totalLevelWarnings([{ ...FIGHTER, level: MAXIMUM_CHARACTER_LEVEL + 1 }]),
    ).toHaveLength(1);
  });
});

describe('hit points', () => {
  it('matches the printed Fixed Hit Points table for every die size', () => {
    // `sheet-math.txt`, Fixed Hit Points by Class — transcribed by eye:
    //   Barbarian                        7 + Con. modifier   (d12)
    //   Fighter, Paladin, or Ranger      6 + Con. modifier   (d10)
    //   Bard, Cleric, Druid, Monk,
    //     Rogue, or Warlock              5 + Con. modifier   (d8)
    //   Sorcerer or Wizard               4 + Con. modifier   (d6)
    //
    // The code uses `die / 2 + 1` rather than a per-class table. That
    // equivalence is NOT assumed anywhere — it is asserted here against all
    // four printed values, which is the only reason the formula is allowed to
    // stand in for the table.
    expect(fixedHitPointsPerLevel(12)).toBe(7);
    expect(fixedHitPointsPerLevel(10)).toBe(6);
    expect(fixedHitPointsPerLevel(8)).toBe(5);
    expect(fixedHitPointsPerLevel(6)).toBe(4);
    // Every member of the type is covered, so the function is TOTAL over its
    // domain: there is no fifth input a test could have missed, which is what
    // closing the parameter type bought.
    for (const die of hitDieSizes) {
      expect(Number.isInteger(fixedHitPointsPerLevel(die)), `d${String(die)}`).toBe(true);
    }
  });

  /**
   * THE GUARD THAT USED TO LIVE IN `fixedHitPointsPerLevel`, AT THE BOUNDARY IT
   * BELONGS AT.
   *
   * That function guarded `hitDie >= 2`, which admits every integer above it —
   * F12 measured `d7 -> 4.5`, `d13 -> 7.5`, `d1001 -> 501.5` hit points per
   * level. It now takes a `HitDieSize`, so those calls do not compile
   * (`docs/type-probes/die-size.probe.ts`), and the runtime question moved here:
   * an integer arriving off the disk is untrusted, because a CHECK constrains no
   * image created before it existed and no hand-edited one (F11).
   */
  it('reads an integer that is not a hit die as NO hit die', () => {
    for (const die of hitDieSizes) {
      expect(hitDieOrAbsent(die), `d${String(die)}`).toBe(die);
    }
    // The four F12 values, plus the two sizes that are real dice and are not
    // hit dice, plus the absence that was always legal.
    for (const rejected of [7, 13, 1001, 2, 3, 4, 20, 100, 0, -8, 8.5]) {
      expect(hitDieOrAbsent(rejected), String(rejected)).toBeNull();
    }
    expect(hitDieOrAbsent(null)).toBeNull();
  });

  it('degrades a stored d7 to the stated assumption, never to 4.5 per level', () => {
    // A hand-edited image holding `hit_die = 7` for a level 3 starting class,
    // Constitution 14 (+2). BEFORE this change the 7 flowed through and gave
    //   level 1     : 7 + 2 = 9
    //   levels 2..3 : (4.5 fixed + 2) x 2 = 13
    //   total       : 22, a fractional per-level value hidden inside a whole
    //                 number nobody would question.
    // Now the 7 is read as an absence, so the sheet uses ASSUMED_HIT_DIE (8)
    // and SAYS SO:
    //   level 1     : 8 + 2 = 10
    //   levels 2..3 : (5 fixed + 2) x 2 = 14
    //   total       : 24
    const stored: SheetClass = {
      proficiencies: NO_PROFICIENCIES,
      class_name: 'Hand-edited',
      level: 3,
      hit_die: hitDieOrAbsent(7),
      is_starting_class: true,
      saving_throws: [],
    };
    const result = hitPointMaximum({
      classes: [stored],
      scores: scores({ constitution: 14 }),
    });
    expect(result.maximum).toBe(24);
    expect(result.maximum).not.toBe(22);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'assumed_hit_die',
    ]);
  });

  it('gives level 1 the printed maximum, not the average', () => {
    // `sheet-math.txt`, Level 1 Hit Points by Class: Barbarian 12 + Con.
    // A level 1 Barbarian with Constitution 14 (+2): 12 + 2 = 14.
    const barbarian: SheetClass = {
      proficiencies: NO_PROFICIENCIES,
      class_name: 'Barbarian',
      level: 1,
      hit_die: 12,
      is_starting_class: true,
      saving_throws: ['strength', 'constitution'],
    };
    expect(
      hitPointMaximum({ classes: [barbarian], scores: scores({ constitution: 14 }) })
        .maximum,
    ).toBe(14);
    // The average would be 7 + 2 = 9. Asserting the wrong answer is excluded
    // makes the "level 1 is special" branch load-bearing.
    expect(
      hitPointMaximum({ classes: [barbarian], scores: scores({ constitution: 14 }) })
        .maximum,
    ).not.toBe(9);
  });

  it('adds the fixed value for every level after the first', () => {
    // Fighter 5, Constitution 14 (+2), no rolls:
    //   level 1      : 10 + 2 = 12
    //   levels 2..5  : (6 + 2) x 4 = 32
    //   total        : 44
    const result = hitPointMaximum({
      classes: [FIGHTER],
      scores: scores({ constitution: 14 }),
    });
    expect(result.maximum).toBe(44);
    expect(result.warnings).toEqual([]);
  });

  it('uses PER-CLASS hit dice across a multiclass, and only ONE level 1 maximum', () => {
    // `multiclassing.txt`: "You gain the level 1 Hit Points for a class only
    // when your total character level is 1", and "If your classes give you Hit
    // Dice of different types, track them separately."
    //
    // Fighter 5 (starting) / Wizard 3, Constitution 14 (+2):
    //   Fighter level 1     : 10 + 2 = 12
    //   Fighter levels 2..5 : (6 + 2) x 4 = 32
    //   Wizard levels 1..3  : (4 + 2) x 3 = 18     <- NO level 1 maximum
    //   total               : 62
    const result = hitPointMaximum({
      classes: [FIGHTER, WIZARD],
      scores: scores({ constitution: 14 }),
    });
    expect(result.maximum).toBe(62);
    // Giving the Wizard its own level 1 maximum too would be 12 + 32 + (6+2) +
    // (4+2)x2 = 64 — the plausible-looking bug.
    expect(result.maximum).not.toBe(64);
  });

  it('puts the level 1 maximum on the STARTING class, whichever order they arrive in', () => {
    // Same two classes, Wizard listed first but Fighter flagged as the starting
    // class. The answer must not depend on list order: still 62.
    expect(
      hitPointMaximum({
        classes: [WIZARD, FIGHTER],
        scores: scores({ constitution: 14 }),
      }).maximum,
    ).toBe(62);
    // And if the WIZARD were the starting class instead:
    //   Wizard level 1      : 6 + 2 = 8
    //   Wizard levels 2..3  : (4 + 2) x 2 = 12
    //   Fighter levels 1..5 : (6 + 2) x 5 = 40
    //   total               : 60
    expect(
      hitPointMaximum({
        classes: [
          { ...WIZARD, is_starting_class: true },
          { ...FIGHTER, is_starting_class: false },
        ],
        scores: scores({ constitution: 14 }),
      }).maximum,
    ).toBe(60);
  });

  it('substitutes a stored roll for the fixed value, at the level it was rolled for', () => {
    // THE ROLLS ARE CHOSEN SO THEY DO NOT AVERAGE TO THE FIXED VALUE. Rolling
    // 9 and 3 would sum to the same 12 as two fixed 6s, and the assertion would
    // hold with the roll handling deleted entirely — a test that cannot fail.
    //
    // Fighter 5, Constitution 14 (+2), rolled 9 at level 2 and 4 at level 3:
    //   level 1 : 10 + 2 = 12
    //   level 2 : 9 + 2  = 11   (rolled)
    //   level 3 : 4 + 2  = 6    (rolled)
    //   level 4 : 6 + 2  = 8    (fixed)
    //   level 5 : 6 + 2  = 8    (fixed)
    //   total   : 45
    const result = hitPointMaximum({
      classes: [FIGHTER],
      scores: scores({ constitution: 14 }),
      rolls: new Map([['Fighter', new Map([[2, 9], [3, 4]])]]),
    });
    expect(result.maximum).toBe(45);
    // Ignoring the rolls and taking the fixed value everywhere gives 44, which
    // is what the previous choice of rolls could not tell apart.
    expect(result.maximum).not.toBe(44);
  });

  it('keys rolls by CLASS as well as level, so one class\'s rolls cannot reach another', () => {
    // `multiclassing.txt`: "If your classes give you Hit Dice of different
    // types, track them separately." A d6 rolled for a Wizard level must not be
    // spent on a Fighter level, and nothing else in this file would notice if it
    // were — every other rolls case has exactly one class.
    //
    // Fighter 5 (starting) / Wizard 3, Constitution 14 (+2). The rolls are
    // recorded under WIZARD only, at Wizard levels 2 and 3:
    //   Fighter level 1     : 10 + 2 = 12
    //   Fighter levels 2..5 : (6 + 2) x 4 = 32      (fixed, untouched)
    //   Wizard level 1      : 4 + 2 = 6             (fixed, no roll stored)
    //   Wizard level 2      : 2 + 2 = 4             (rolled)
    //   Wizard level 3      : 1 + 2 = 3             (rolled)
    //   total               : 57
    const result = hitPointMaximum({
      classes: [FIGHTER, WIZARD],
      scores: scores({ constitution: 14 }),
      rolls: new Map([['Wizard', new Map([[2, 2], [3, 1]])]]),
    });
    expect(result.maximum).toBe(57);
    // Keying on level alone — dropping the class name from the lookup — would
    // spend the Wizard's 2 and 1 on Fighter levels 2 and 3 as well:
    //   12 + 4 + 3 + 8 + 8 + 6 + 4 + 3 = 48. That is the bug this pins.
    expect(result.maximum).not.toBe(48);
  });

  it('never lets a level after the first contribute less than 1', () => {
    // `sheet-math.txt`: "add the total (minimum of 1) to your Hit Point
    // maximum." Constitution 6 is a −2 modifier; a Wizard rolling a 1 gives
    // 1 + (−2) = −1, which floors to 1.
    //   Wizard level 1 : 6 + (−2) = 4      (no floor is printed for level 1)
    //   level 2 rolled : max(1, 1 − 2) = 1
    //   level 3 fixed  : max(1, 4 − 2) = 2
    //   total          : 7
    const result = hitPointMaximum({
      classes: [{ ...WIZARD, is_starting_class: true }],
      scores: scores({ constitution: 6 }),
      rolls: new Map([['Wizard', new Map([[2, 1]])]]),
    });
    expect(result.maximum).toBe(7);
  });

  it('degrades with a STATED warning when no class is the starting class', () => {
    // Reachable today: `update-class.ts` deletes a class row without promoting
    // a replacement, so removing the starting class of a multiclass character
    // leaves none. D11 part 2 says tolerate and flag rather than throw.
    const result = hitPointMaximum({
      classes: [
        { ...FIGHTER, is_starting_class: false },
        { ...WIZARD, is_starting_class: false },
      ],
      scores: scores({ constitution: 14 }),
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'no_starting_class',
    ]);
    expect(result.warnings[0]?.message).toContain('Fighter');
    // Still a real number rather than a throw: the first class is used, so the
    // answer is the same 62 as when the Fighter is flagged.
    expect(result.maximum).toBe(62);
  });

  it('degrades with a STATED warning when several classes claim to be first', () => {
    // Reachable by share import, which writes the flag per row with no
    // cross-row check — and per D11 part 2 that tolerance is correct.
    const result = hitPointMaximum({
      classes: [FIGHTER, { ...WIZARD, is_starting_class: true }],
      scores: scores({ constitution: 14 }),
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'several_starting_classes',
    ]);
    expect(result.maximum).toBe(62);
  });

  it('assumes a die for a class whose hit die is unknown, and SAYS SO', () => {
    // A class can arrive with no `class_sheet_traits` row — homebrew, or a
    // catalog import — and its die is then genuinely unknown. The alternative
    // to assuming one is to print no hit point maximum at all, which is worse;
    // the alternative to WARNING is to publish an invented number as a fact,
    // which is the defect this pins.
    //
    // Unknown die, level 3, starting class, Constitution 14 (+2), assuming d8:
    //   level 1     : 8 + 2 = 10
    //   levels 2..3 : (5 fixed + 2) x 2 = 14
    //   total       : 24
    const homebrew: SheetClass = {
      proficiencies: NO_PROFICIENCIES,
      class_name: 'Bladewright',
      level: 3,
      hit_die: null,
      is_starting_class: true,
      saving_throws: [],
    };
    const result = hitPointMaximum({
      classes: [homebrew],
      scores: scores({ constitution: 14 }),
    });
    expect(result.maximum).toBe(24);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'assumed_hit_die',
    ]);
    // The warning NAMES the class, because a multiclass character may have one
    // known die and one unknown, and "a die was assumed" would not say which.
    expect(result.warnings[0]?.message).toContain('Bladewright');

    // A KNOWN d8 CLASS REACHES THE SAME NUMBER AND WARNS ABOUT NOTHING. That is
    // the pairing that makes the warning load-bearing rather than decorative:
    // the arithmetic alone cannot tell the two apart.
    const known = hitPointMaximum({
      classes: [{ ...homebrew, hit_die: 8 }],
      scores: scores({ constitution: 14 }),
    });
    expect(known.maximum).toBe(24);
    expect(known.warnings).toEqual([]);
  });

  it('warns per unknown class, and leaves the known ones unremarked', () => {
    // Fighter 5 (starting, d10) / a level 2 class with no die, Constitution 14:
    //   Fighter        : 12 + 32 = 44   (as above)
    //   unknown 1..2   : (5 fixed + 2) x 2 = 14
    //   total          : 58
    const result = hitPointMaximum({
      classes: [
        FIGHTER,
        {
          proficiencies: NO_PROFICIENCIES,
          class_name: 'Bladewright',
          level: 2,
          hit_die: null,
          is_starting_class: false,
          saving_throws: [],
        },
      ],
      scores: scores({ constitution: 14 }),
    });
    expect(result.maximum).toBe(58);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'assumed_hit_die',
    ]);
    expect(result.warnings[0]?.message).not.toContain('Fighter');
  });

  it('flags a roll larger than the class’s own die, and still counts it', () => {
    // `SHEET_ROLL_BOUNDS.maximum` can only bound at 12 — the largest printed
    // die — because a roll is keyed on a class NAME and the die is not knowable
    // from that table. This is the first place both are known.
    //
    // Wizard 3 (starting, d6), Constitution 14 (+2), an 11 recorded at level 2:
    //   level 1 : 6 + 2 = 8
    //   level 2 : 11 + 2 = 13     (rolled, impossible on a d6, counted anyway)
    //   level 3 : 4 + 2 = 6       (fixed)
    //   total   : 27
    const result = hitPointMaximum({
      classes: [{ ...WIZARD, is_starting_class: true }],
      scores: scores({ constitution: 14 }),
      rolls: new Map([['Wizard', new Map([[2, 11]])]]),
    });
    // COUNTED IN FULL, not clamped to 6: clamping would silently rewrite a
    // number the player typed. Clamping would have given 8 + 8 + 6 = 22.
    expect(result.maximum).toBe(27);
    expect(result.maximum).not.toBe(22);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'roll_exceeds_hit_die',
    ]);
    const message = result.warnings[0]?.message ?? '';
    expect(message).toContain('Wizard');
    expect(message).toContain('11');
    expect(message).toContain('d6');
  });

  it('says nothing about a roll the die could have shown, at either boundary', () => {
    // The negative control the previous case needs. A 6 on a d6 is the largest
    // legal roll and must not be flagged; a 6 and a 10 on a Fighter's d10 are
    // unremarkable twice over.
    const exact = hitPointMaximum({
      classes: [{ ...WIZARD, is_starting_class: true }],
      scores: scores({ constitution: 14 }),
      rolls: new Map([['Wizard', new Map([[2, 6]])]]),
    });
    expect(exact.warnings).toEqual([]);
    const fighter = hitPointMaximum({
      classes: [FIGHTER],
      scores: scores({ constitution: 14 }),
      rolls: new Map([['Fighter', new Map([[2, 6], [3, 10]])]]),
    });
    expect(fighter.warnings).toEqual([]);
  });

  it('does not convict a roll against a die it only ASSUMED', () => {
    // The two degradations must not compound. An 11 recorded for a class whose
    // die is unknown may be perfectly legal — the class could be a d12 — and
    // flagging it against the assumed d8 would accuse the player of a typo on
    // the strength of this application's own guess.
    //
    // Unknown die, level 3, starting, Constitution 14 (+2), 11 at level 2:
    //   level 1 : 8 + 2 = 10      (assumed d8)
    //   level 2 : 11 + 2 = 13     (rolled)
    //   level 3 : 5 + 2 = 7       (fixed for the assumed d8)
    //   total   : 30
    const result = hitPointMaximum({
      classes: [
        {
          proficiencies: NO_PROFICIENCIES,
          class_name: 'Bladewright',
          level: 3,
          hit_die: null,
          is_starting_class: true,
          saving_throws: [],
        },
      ],
      scores: scores({ constitution: 14 }),
      rolls: new Map([['Bladewright', new Map([[2, 11]])]]),
    });
    expect(result.maximum).toBe(30);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'assumed_hit_die',
    ]);
  });
});

describe('armor class', () => {
  const templates = parseSrdArmorTemplates();
  const template = (name: string): SheetArmor => {
    const found = templates.find((entry) => entry.name === name);
    if (found === undefined) {
      throw new Error(`No armour named ${name}.`);
    }
    return found;
  };
  const formula = (
    label: string,
    source: ArmorClassFormulaCandidate['source'],
    ability_1: ArmorClassFormulaCandidate['ability_1'],
    ability_2: ArmorClassFormulaCandidate['ability_2'],
    allows_shield: boolean,
    base = 10,
  ): ArmorClassFormulaCandidate => ({
    kind: 'ability_formula',
    label,
    source,
    base,
    ability_1,
    ability_2,
    allows_shield,
  });

  it('is 10 + Dexterity with no armour', () => {
    // `sheet-math.txt`: "Without armor or a shield, your base Armor Class is 10
    // plus your Dexterity modifier." Dexterity 16 is +3, so 13.
    expect(armorClass({ scores: scores({ dexterity: 16 }) }).value).toBe(13);
    // Dexterity 8 is −1, so 9 — the negative modifier really does subtract when
    // unarmoured, which is exactly what Heavy armour must NOT do.
    expect(armorClass({ scores: scores({ dexterity: 8 }) }).value).toBe(9);
  });

  it('adds the full Dexterity modifier in Light armour', () => {
    // Leather Armor 11 + Dex, Dexterity 18 (+4): 11 + 4 = 15.
    expect(
      armorClass({
        armor: template('Leather Armor'),
        scores: scores({ dexterity: 18 }),
      }).value,
    ).toBe(15);
  });

  it('caps the Dexterity modifier at 2 in Medium armour', () => {
    // Half Plate 15 + Dex (max 2), Dexterity 18 (+4): 15 + min(4, 2) = 17.
    expect(
      armorClass({
        armor: template('Half Plate Armor'),
        scores: scores({ dexterity: 18 }),
      }).value,
    ).toBe(17);
    // Uncapped would be 19 — the bug a missing cap produces.
    expect(
      armorClass({
        armor: template('Half Plate Armor'),
        scores: scores({ dexterity: 18 }),
      }).value,
    ).not.toBe(19);
    // Below the cap the real modifier applies: Dexterity 12 (+1) gives 16.
    expect(
      armorClass({
        armor: template('Half Plate Armor'),
        scores: scores({ dexterity: 12 }),
      }).value,
    ).toBe(16);
  });

  it('IGNORES Dexterity entirely in Heavy armour, including a NEGATIVE modifier', () => {
    // THE CASE THAT PROVES `none` IS NOT A CAP OF ZERO. Chain Mail is a flat 16.
    // Dexterity 6 is a −2 modifier; `min(−2, 0)` would give 14.
    expect(
      armorClass({
        armor: template('Chain Mail'),
        scores: scores({ dexterity: 6, strength: 16 }),
      }).value,
    ).toBe(16);
    // And a high Dexterity adds nothing either.
    expect(
      armorClass({
        armor: template('Chain Mail'),
        scores: scores({ dexterity: 20, strength: 16 }),
      }).value,
    ).toBe(16);
  });

  it('adds the Shield as the +2 BONUS the table prints', () => {
    // Studded Leather 12 + Dex, Dexterity 14 (+2), plus a Shield: 12 + 2 + 2 = 16.
    expect(
      armorClass({
        armor: template('Studded Leather Armor'),
        shield: template('Shield'),
        scores: scores({ dexterity: 14 }),
      }).value,
    ).toBe(16);
    // A shield with no armour at all: 10 + 2 + 2 = 14.
    expect(
      armorClass({
        shield: template('Shield'),
        scores: scores({ dexterity: 14 }),
      }).value,
    ).toBe(14);
  });

  it('re-runs formula eligibility before adding a shield', () => {
    const monk = formula(
      'Martial Arts',
      'class',
      'dexterity',
      'wisdom',
      false,
    );
    const monkScores = scores({ dexterity: 16, wisdom: 16 });

    const withoutShield = armorClass({
      scores: monkScores,
      formulas: [monk],
    });
    expect(withoutShield.value).toBe(16);
    expect(withoutShield.winner.formula.label).toBe('Martial Arts');
    expect(withoutShield.winner.total).toBe(16);
    expect(withoutShield.excluded).toEqual([]);

    const withShield = armorClass({
      shield: template('Shield'),
      scores: monkScores,
      formulas: [monk],
    });
    // Martial Arts is excluded first; the 10 + Dexterity floor wins at 13,
    // then the Shield adds 2. A late-only shield addend would produce 18.
    expect(withShield.value).toBe(15);
    expect(withShield.value).not.toBe(18);
    expect(withShield.winner.formula.label).toBe('Unarmoured');
    expect(withShield.winner.total).toBe(13);
    expect(withShield.excluded).toEqual([
      {
        formula: monk,
        reason: { kind: 'shield_not_allowed', shield_name: 'Shield' },
      },
    ]);
  });

  it('keeps the floor when the only supplied formula is excluded by a shield', () => {
    const monk = formula(
      'Martial Arts',
      'class',
      'dexterity',
      'wisdom',
      false,
    );
    const result = armorClass({
      shield: template('Shield'),
      scores: scores({ dexterity: 14, wisdom: 18 }),
      formulas: [monk],
    });

    // Martial Arts would be 16, but the Shield excludes it. The always-present
    // floor is 10 + Dexterity 14 (+2), then the Shield adds 2: AC 14. Removing
    // the floor leaves no eligible base at all.
    expect(result.value).toBe(14);
    expect(result.winner.formula.label).toBe('Unarmoured');
    expect(result.winner.total).toBe(12);
    expect(result.excluded).toEqual([
      {
        formula: monk,
        reason: { kind: 'shield_not_allowed', shield_name: 'Shield' },
      },
    ]);
  });

  it('discards every unarmoured formula outright while body armour is worn', () => {
    const shell = formula(
      'Armadillo Shell',
      'species',
      'dexterity',
      null,
      true,
      13,
    );
    const result = armorClass({
      armor: template('Leather Armor'),
      scores: scores({ dexterity: 18 }),
      formulas: [shell],
    });

    // Leather is 11 + 4 = 15. Armadillo Shell would be 17, but its broken
    // unarmoured condition excludes it rather than making it the winner.
    expect(result.value).toBe(15);
    expect(result.winner.formula.label).toBe('Leather Armor');
    expect(result.excluded.map((entry) => entry.formula.label)).toEqual([
      'Unarmoured',
      'Armadillo Shell',
    ]);
    expect(
      result.excluded.every(
        (entry) => entry.reason.kind === 'wearing_armor',
      ),
    ).toBe(true);
  });

  it('uses the total clone-stable source-and-label tie-break', () => {
    const tied = [
      formula('Zulu Manual', 'manual', 'dexterity', null, true),
      formula('Weapon Shell', 'weapon', 'dexterity', null, true),
      formula('Item Shell', 'item', 'dexterity', null, true),
      formula('Background Shell', 'background', 'dexterity', null, true),
      formula('Feat Shell', 'feat', 'dexterity', null, true),
      formula('Zulu Class', 'class', 'dexterity', null, true),
      formula('Alpha Class', 'class', 'dexterity', null, true),
      formula('Subclass Shell', 'subclass', 'dexterity', null, true),
      formula('Species Shell', 'species', 'dexterity', null, true),
    ];
    const result = armorClass({
      scores: scores({ dexterity: 10 }),
      formulas: tied,
    });

    // All ten formulas, including the built-in floor, total 10. Species is the
    // first eligible persisted category; ids and acquisition order never enter.
    expect(result.value).toBe(10);
    expect(result.winner.formula.label).toBe('Species Shell');
    expect(result.tie_break?.rule).toBe('source_precedence_then_label');
    expect(result.tie_break?.losers.map((entry) => entry.formula.label)).toEqual([
      'Subclass Shell',
      'Alpha Class',
      'Zulu Class',
      'Feat Shell',
      'Background Shell',
      'Item Shell',
      'Weapon Shell',
      'Unarmoured',
      'Zulu Manual',
    ]);
  });

  it('adds every flat bonus after resolving the winning base', () => {
    const result = armorClass({
      scores: scores({ dexterity: 14 }),
      bonuses: [
        { label: 'Cloak of the Armadillo', amount: 1 },
        { label: 'Ring of Shell', amount: 1 },
      ],
    });
    expect(result.winner.total).toBe(12);
    expect(result.value).toBe(14);
  });

  it('applies the manual adjustment last', () => {
    // Plate Armor 18, flat, plus a +1 shield-of-something the app does not
    // model: 18 + 2 + 1 = 21.
    expect(
      armorClass({
        armor: template('Plate Armor'),
        shield: template('Shield'),
        scores: scores({ dexterity: 10, strength: 15 }),
        adjustment: 1,
      }).value,
    ).toBe(21);
    // Negative adjustments work too — the field is an adjustment, not a bonus.
    expect(
      armorClass({ scores: scores({ dexterity: 10 }), adjustment: -2 }).value,
    ).toBe(8);
  });

  it('WARNS about an unmet Strength requirement without changing the AC', () => {
    // Plate Armor requires Str 15. A Strength 10 character still gets AC 18 —
    // the SRD's consequence is a speed reduction, not a lower AC — but the
    // sheet says so, which is the thing D12 said a manual AC field could never
    // do.
    const result = armorClass({
      armor: template('Plate Armor'),
      scores: scores({ strength: 10 }),
    });
    expect(result.value).toBe(18);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'strength_requirement_unmet',
    ]);
    expect(result.warnings[0]?.message).toContain('Strength 15');
    // Exactly meeting it is not a warning — the boundary, both sides.
    expect(
      armorClass({
        armor: template('Plate Armor'),
        scores: scores({ strength: 15 }),
      }).warnings,
    ).toEqual([]);
    expect(
      armorClass({
        armor: template('Plate Armor'),
        scores: scores({ strength: 14 }),
      }).warnings,
    ).toHaveLength(1);
  });

  it('reads a Shield as a BONUS even when it arrives in the worn-armour slot', () => {
    // `armor_templates.armor_class` means base AC for body armour and the `+2`
    // BONUS for the Shield row, and the schema justifies that overload on the
    // promise that consumers dispatch on `category`. This is the case that
    // proves they do.
    //
    // A Shield row passed as `armor`, Dexterity 10: the character is UNARMOURED
    // and holding a shield, so 10 + 0 + 2 = 12. Reading the `+2` as a base
    // Armor Class would give 2 — a silent halving of somebody's defence, and
    // exactly the mis-parse the schema's `armor_templates_shield_check` exists
    // to catch on the way in.
    const crossed = armorClass({
      armor: template('Shield'),
      scores: scores({ dexterity: 10 }),
    });
    expect(crossed.value).toBe(12);
    expect(crossed.value).not.toBe(2);
    // And it SAYS the slots are crossed rather than silently correcting them.
    expect(crossed.warnings.map((warning) => warning.code)).toEqual([
      'armor_slot_mismatch',
    ]);
    expect(crossed.warnings[0]?.message).toContain('Shield');
  });

  it('refuses to add body armour as if it were a shield bonus', () => {
    // Plate Armor in the shield slot. Its 18 is a BASE, so it cannot be added
    // on top of anything: the character is wearing Plate, AC 18.
    const crossed = armorClass({
      shield: template('Plate Armor'),
      scores: scores({ dexterity: 10, strength: 15 }),
    });
    expect(crossed.value).toBe(18);
    // Adding it as a bonus over the unarmoured 10 would give 28.
    expect(crossed.value).not.toBe(28);
    expect(crossed.warnings.map((warning) => warning.code)).toEqual([
      'armor_slot_mismatch',
    ]);

    // Both slots holding Plate: still one suit of armour, still 18. Summing two
    // bases would give 36.
    const doubled = armorClass({
      armor: template('Plate Armor'),
      shield: template('Plate Armor'),
      scores: scores({ dexterity: 10, strength: 15 }),
    });
    expect(doubled.value).toBe(18);
    expect(doubled.value).not.toBe(36);
    expect(doubled.warnings.map((warning) => warning.code)).toEqual([
      'armor_slot_mismatch',
    ]);
  });

  it('warns about the Strength requirement of whichever row carries one', () => {
    // The requirement belongs to the ROW, not to the slot it was put in. Plate
    // requires Str 15; a Strength 10 character gets both warnings, and the AC
    // is still the honest 18.
    const result = armorClass({
      shield: template('Plate Armor'),
      scores: scores({ strength: 10, dexterity: 10 }),
    });
    expect(result.value).toBe(18);
    expect(result.warnings.map((warning) => warning.code).sort()).toEqual([
      'armor_slot_mismatch',
      'strength_requirement_unmet',
    ]);
  });

  it('leaves the correctly-slotted cases with no warning at all', () => {
    // The negative control for the three cases above: every SRD row, worn in
    // the slot its category calls for, is silent. Without this a dispatch that
    // warned unconditionally would pass all of them.
    for (const entry of templates) {
      const worn = scores({ strength: 20, dexterity: 10 });
      const result =
        entry.category === 'shield'
          ? armorClass({ shield: entry, scores: worn })
          : armorClass({ armor: entry, scores: worn });
      expect(result.warnings).toEqual([]);
    }
  });
});

describe('saving throws', () => {
  it('takes proficiencies from the FIRST class only', () => {
    // `multiclassing.txt`: a multiclass character gains "only some of the new
    // class's starting proficiencies", and no class's "As a Multiclass
    // Character" bullet lists saving throws.
    //
    // Fighter 5 (starting) / Wizard 3 is proficient in Strength and
    // Constitution saves — NOT in Intelligence and Wisdom.
    const { abilities, warnings } = savingThrowProficiencies([FIGHTER, WIZARD]);
    expect([...abilities].sort()).toEqual(['constitution', 'strength']);
    expect(abilities.has('intelligence')).toBe(false);
    expect(abilities.has('wisdom')).toBe(false);
    expect(warnings).toEqual([]);
  });

  it('adds the proficiency bonus only where proficient', () => {
    // Fighter 5 / Wizard 3: total level 8, so +3.
    // Constitution 14 (+2), proficient   : 2 + 3 = 5
    // Intelligence 16 (+3), NOT proficient: 3     = 3
    const bonus = sheetProficiencyBonus([FIGHTER, WIZARD]);
    expect(bonus).toBe(3);
    const abilityScores = scores({ constitution: 14, intelligence: 16 });
    expect(
      savingThrowModifier({
        ability: 'constitution',
        scores: abilityScores,
        proficiencyBonus: bonus,
        proficient: true,
      }),
    ).toBe(5);
    expect(
      savingThrowModifier({
        ability: 'intelligence',
        scores: abilityScores,
        proficiencyBonus: bonus,
        proficient: false,
      }),
    ).toBe(3);
  });

  it('produces a NEGATIVE modifier for a low score, rather than refusing it', () => {
    // Strength 6 is −2, not proficient. `SaveDC.from` could not express this —
    // it refuses a value below 1 — which is why the skill and save path uses
    // `AttackBonus` instead.
    expect(
      savingThrowModifier({
        ability: 'strength',
        scores: scores({ strength: 6 }),
        proficiencyBonus: 3,
        proficient: false,
      }),
    ).toBe(-2);
    // Strength 1 is −5; proficient at +2 still leaves −3.
    expect(
      savingThrowModifier({
        ability: 'strength',
        scores: scores({ strength: 1 }),
        proficiencyBonus: 2,
        proficient: true,
      }),
    ).toBe(-3);
  });
});

describe('skills, initiative and passive Perception', () => {
  it('uses the governing ability the Skills table prints', () => {
    // Athletics is Strength; Arcana is Intelligence; Sleight of Hand is
    // Dexterity. Strength 18 (+4), proficient at +3: 4 + 3 = 7.
    expect(
      skillModifier({
        skill: 'athletics',
        scores: scores({ strength: 18 }),
        proficiencyBonus: 3,
        proficient: true,
      }),
    ).toBe(7);
    // The same character's Arcana off Intelligence 8 (−1), not proficient: −1.
    expect(
      skillModifier({
        skill: 'arcana',
        scores: scores({ strength: 18, intelligence: 8 }),
        proficiencyBonus: 3,
        proficient: false,
      }),
    ).toBe(-1);
    // Sleight of Hand off Dexterity 15 (+2), proficient at +2: 4.
    expect(
      skillModifier({
        skill: 'sleight_of_hand',
        scores: scores({ dexterity: 15 }),
        proficiencyBonus: 2,
        proficient: true,
      }),
    ).toBe(4);
  });

  it('is the Dexterity modifier for initiative', () => {
    // `sheet-math.txt`: "Write your Dexterity modifier in the space for
    // Initiative." Dexterity 15 is +2; Dexterity 9 is −1.
    expect(initiative(scores({ dexterity: 15 }))).toBe(2);
    expect(initiative(scores({ dexterity: 9 }))).toBe(-1);
  });

  it("reproduces the SRD's own worked Passive Perception example", () => {
    // `sheet-math.txt`, verbatim: "if your character has a Wisdom of 15 and
    // proficiency in the Perception skill, you have a Passive Perception of 14
    // (10 + 2 for your Wisdom modifier + 2 for proficiency)."
    //
    // The strongest expectation in this file: the source states both the inputs
    // and the answer, so it is not this project's arithmetic being checked
    // against itself.
    expect(
      passivePerception({
        scores: scores({ wisdom: 15 }),
        proficiencyBonus: 2,
        proficient: true,
      }),
    ).toBe(14);
    // The same character without proficiency: 10 + 2 = 12.
    expect(
      passivePerception({
        scores: scores({ wisdom: 15 }),
        proficiencyBonus: 2,
        proficient: false,
      }),
    ).toBe(12);
    // A low Wisdom subtracts: Wisdom 7 is −2, so 10 − 2 = 8.
    expect(
      passivePerception({
        scores: scores({ wisdom: 7 }),
        proficiencyBonus: 3,
        proficient: false,
      }),
    ).toBe(8);
  });

  it('maps every one of the eighteen skills to an ability', () => {
    const map = parseSkillAbilities();
    expect(map.size).toBe(18);
    // Spot checks transcribed from the Skills table, one per ability, plus the
    // skill no class list contains.
    expect(map.get('athletics')).toBe('strength');
    expect(map.get('acrobatics')).toBe('dexterity');
    expect(map.get('arcana')).toBe('intelligence');
    expect(map.get('perception')).toBe('wisdom');
    expect(map.get('performance')).toBe('charisma');
    expect(map.get('sleight_of_hand')).toBe('dexterity');
    expect(map.get('animal_handling')).toBe('wisdom');
    expect(map.get('intimidation')).toBe('charisma');
    // Constitution governs NO skill — a real, failable claim about the table.
    expect([...map.values()]).not.toContain('constitution');
  });
});

describe('extra attack across a multiclass', () => {
  it('gives one attack to a character with no granting class', () => {
    expect(attacksPerAction([WIZARD]).count).toBe(1);
    expect(attacksPerAction([]).count).toBe(1);
  });

  it('gives two attacks at level 5', () => {
    expect(attacksPerAction([FIGHTER]).count).toBe(2);
    expect(attacksPerAction([RANGER]).count).toBe(2);
    // Below the granting level, nothing.
    expect(attacksPerAction([{ ...FIGHTER, level: 4 }]).count).toBe(1);
  });

  it('DOES NOT STACK across classes — this is the multiclass bug', () => {
    // `multiclassing.txt`, verbatim: "If you gain the Extra Attack feature from
    // more than one class, the features don't stack. You can't make more than
    // two attacks with this feature unless you have a feature that says you
    // can."
    //
    // Fighter 5 / Ranger 5 makes TWO attacks. Summing the per-class grants
    // would give three, which is the plausible-looking bug in exactly the
    // multiclass case this application specialises in.
    expect(attacksPerAction([FIGHTER, RANGER]).count).toBe(2);
    expect(attacksPerAction([FIGHTER, RANGER]).count).not.toBe(3);
    expect(attacksPerAction([FIGHTER, RANGER]).count).not.toBe(4);
  });

  it("lets the Fighter's own feature exceed two, and takes the maximum", () => {
    // "…unless you have a feature that says you can (such as the Fighter's Two
    // Extra Attacks feature)." Fighter 11 / Ranger 5 makes THREE — the
    // Fighter's level 11 grant wins, and the Ranger's 2 does not add to it.
    expect(attacksPerAction([{ ...FIGHTER, level: 11 }, RANGER]).count).toBe(3);
    expect(attacksPerAction([{ ...FIGHTER, level: 20 }, RANGER]).count).toBe(4);
    // Order must not matter.
    expect(attacksPerAction([RANGER, { ...FIGHTER, level: 11 }]).count).toBe(3);
  });

  it('resolves a class to its highest grant at or below its own level', () => {
    // The rows are absolute totals resolved `class_level <= ?`, so a Fighter 15
    // is on the level 11 row, not the level 20 one.
    expect(attacksPerAction([{ ...FIGHTER, level: 15 }]).count).toBe(3);
    expect(attacksPerAction([{ ...FIGHTER, level: 10 }]).count).toBe(2);
    expect(attacksPerAction([{ ...FIGHTER, level: 20 }]).count).toBe(4);
  });
});

describe('sheet resource maxima', () => {
  it('uses each owning class level and keeps Channel Divinity class-qualified', () => {
    const resources = resolveSheetResources(
      [
        resourceClass(1, 'Barbarian', 3, {
          catalog: {
            status: 'recorded',
            expected_ladder_kinds: ['rage'],
            expected_formula_kinds: [],
            has_unmodelled_feature_maxima: false,
          },
          ladder_rows: [{ resource_kind: 'rage', maximum: 3 }],
        }),
        resourceClass(2, 'Monk', 2, {
          catalog: {
            status: 'recorded',
            expected_ladder_kinds: ['focus_points'],
            expected_formula_kinds: [],
            has_unmodelled_feature_maxima: false,
          },
          ladder_rows: [{ resource_kind: 'focus_points', maximum: 2 }],
        }),
        resourceClass(3, 'Cleric', 6, {
          catalog: {
            status: 'recorded',
            expected_ladder_kinds: ['channel_divinity'],
            expected_formula_kinds: [],
            has_unmodelled_feature_maxima: false,
          },
          ladder_rows: [{ resource_kind: 'channel_divinity', maximum: 3 }],
        }),
        resourceClass(4, 'Paladin', 3, {
          catalog: {
            status: 'recorded',
            expected_ladder_kinds: ['channel_divinity'],
            expected_formula_kinds: [],
            has_unmodelled_feature_maxima: false,
          },
          ladder_rows: [{ resource_kind: 'channel_divinity', maximum: 2 }],
        }),
      ],
      PRESENT_ABILITIES,
    );

    expect(
      resources.map((entry) =>
        entry.status === 'computed'
          ? [entry.class_definition_id, entry.kind, entry.maximum]
          : [entry.reason],
      ),
    ).toEqual([
      [1, 'rage', 3],
      [2, 'focus_points', 2],
      [3, 'channel_divinity', 3],
      [4, 'channel_divinity', 2],
    ]);
  });

  it('evaluates live ability, multiplier, fixed, and stepped formulas without guesses', () => {
    const bardFormula: ClassResourceFormula = {
      kind: 'ability_modifier_minimum_one',
      minimum_class_level: 1 as ClassLevel,
      ability: 'charisma',
    };
    const paladinFormula: ClassResourceFormula = {
      kind: 'class_level_multiple',
      minimum_class_level: 1 as ClassLevel,
      multiplier: 5 as PositiveInteger,
    };
    const fighterFormula: ClassResourceFormula = {
      kind: 'fixed_count_by_class_level',
      steps: [
        { minimum_class_level: 9 as ClassLevel, count: 1 as PositiveResourceMaximum },
        { minimum_class_level: 13 as ClassLevel, count: 2 as PositiveResourceMaximum },
        { minimum_class_level: 17 as ClassLevel, count: 3 as PositiveResourceMaximum },
      ],
    };
    const innateFormula: ClassResourceFormula = {
      kind: 'fixed_count',
      minimum_class_level: 1 as ClassLevel,
      count: 2 as PositiveResourceMaximum,
    };
    const classes = [
      resourceClass(1, 'Bard', 5, {
        catalog: {
          status: 'recorded', expected_ladder_kinds: [],
          expected_formula_kinds: ['bardic_inspiration'],
          has_unmodelled_feature_maxima: false,
        },
        formula_rows: [{ resource_kind: 'bardic_inspiration', formula: bardFormula }],
      }),
      resourceClass(2, 'Paladin', 5, {
        catalog: {
          status: 'recorded', expected_ladder_kinds: [],
          expected_formula_kinds: ['lay_on_hands'],
          has_unmodelled_feature_maxima: false,
        },
        formula_rows: [{ resource_kind: 'lay_on_hands', formula: paladinFormula }],
      }),
      resourceClass(3, 'Fighter', 13, {
        catalog: {
          status: 'recorded', expected_ladder_kinds: [],
          expected_formula_kinds: ['indomitable'],
          has_unmodelled_feature_maxima: false,
        },
        formula_rows: [{ resource_kind: 'indomitable', formula: fighterFormula }],
      }),
      resourceClass(4, 'Sorcerer', 1, {
        catalog: {
          status: 'recorded', expected_ladder_kinds: [],
          expected_formula_kinds: ['innate_sorcery'],
          has_unmodelled_feature_maxima: false,
        },
        formula_rows: [{ resource_kind: 'innate_sorcery', formula: innateFormula }],
      }),
      resourceClass(5, 'Ranger', 10, {
        catalog: {
          status: 'recorded', expected_ladder_kinds: [],
          expected_formula_kinds: ['tireless'],
          has_unmodelled_feature_maxima: false,
        },
        formula_rows: [{
          resource_kind: 'tireless',
          formula: {
            kind: 'ability_modifier_minimum_one',
            minimum_class_level: 10 as ClassLevel,
            ability: 'wisdom',
          },
        }],
      }),
    ];

    const atCharisma14 = resolveSheetResources(classes, PRESENT_ABILITIES);
    const atCharisma18 = resolveSheetResources(classes, {
      ...PRESENT_ABILITIES,
      charisma: { status: 'present', modifier: 4 },
    });
    const atWisdom18 = resolveSheetResources(classes, {
      ...PRESENT_ABILITIES,
      wisdom: { status: 'present', modifier: 4 },
    });
    const maxima = (resources: ReturnType<typeof resolveSheetResources>) =>
      resources.flatMap((entry) =>
        entry.status === 'computed' ? [[entry.kind, entry.maximum] as const] : [],
      );
    expect(maxima(atCharisma14)).toEqual([
      ['bardic_inspiration', 2],
      ['lay_on_hands', 25],
      ['indomitable', 2],
      ['innate_sorcery', 2],
      ['tireless', 3],
    ]);
    expect(maxima(atCharisma18)[0]).toEqual(['bardic_inspiration', 4]);
    expect(maxima(atWisdom18)[4]).toEqual(['tireless', 4]);

    const missing = resolveSheetResources([classes[0]!], {
      ...PRESENT_ABILITIES,
      charisma: { status: 'absent' },
    });
    expect(missing).toMatchObject([
      {
        status: 'absent',
        reason: 'resource_formula_ability_input_missing_or_invalid',
      },
    ]);
    expect('maximum' in missing[0]!).toBe(false);
  });

  it('uses combined shared slots, guards sole subclass casters, and keeps Pact separate', () => {
    const wizard = resourceClass(1, 'Wizard', 3, {
      base_spellcasting: {
        progression_type: 'full',
        progression_row: { status: 'present', slots: '{"1":4,"2":2}', pact_slots: '[]' },
      },
    });
    const cleric = resourceClass(2, 'Cleric', 2, {
      base_spellcasting: {
        progression_type: 'full',
        progression_row: { status: 'present', slots: '{"1":3}', pact_slots: '[]' },
      },
    });
    const multiclass = resolveSheetResources([wizard, cleric], PRESENT_ABILITIES);
    expect(
      multiclass.flatMap((entry) =>
        entry.status === 'computed' && entry.kind === 'spell_slot'
          ? [[entry.spell_level, entry.maximum] as const]
          : [],
      ),
    ).toEqual([[1, 4], [2, 3], [3, 2]]);

    const eldritchKnight = resourceClass(3, 'Fighter', 3, {
      subclass_spellcasting: {
        caster_fraction: '1/3',
        caster_rounding: 'down',
        progression_row: { status: 'present', slots: '{"1":2}', pact_slots: null },
      },
    });
    expect(
      resolveSheetResources([eldritchKnight], PRESENT_ABILITIES).map((entry) =>
        entry.status === 'computed' ? [entry.kind, entry.spell_level, entry.maximum] : [entry.reason],
      ),
    ).toEqual([['spell_slot', 1, 2]]);

    const wizard2 = {
      ...wizard,
      class_level: 2,
      base_spellcasting: {
        progression_type: 'full',
        progression_row: { status: 'present', slots: '{"1":3}', pact_slots: '[]' },
      },
    } satisfies SheetResourceClassInput;
    const warlock = resourceClass(4, 'Warlock', 3, {
      base_spellcasting: {
        progression_type: 'pact',
        progression_row: { status: 'present', slots: '[]', pact_slots: '{"count":2,"level":2}' },
      },
    });
    expect(
      resolveSheetResources([wizard2, warlock], PRESENT_ABILITIES).map((entry) =>
        entry.status === 'computed' ? [entry.kind, entry.spell_level, entry.maximum] : [entry.reason],
      ),
    ).toEqual([['spell_slot', 1, 3], ['pact_slot', 2, 2]]);

    const secondPactCaster = resourceClass(5, 'Hexbinder', 2, {
      base_spellcasting: {
        progression_type: 'pact',
        progression_row: {
          status: 'present',
          slots: '[]',
          pact_slots: '{"count":2,"level":1}',
        },
      },
    });
    expect(
      resolveSheetResources(
        [warlock, secondPactCaster],
        PRESENT_ABILITIES,
      ).map((entry) =>
        entry.status === 'computed'
          ? [
              entry.kind,
              entry.class_definition_id,
              entry.class_level,
              entry.spell_level,
              entry.maximum,
            ]
          : [entry.reason],
      ),
    ).toEqual([['pact_slot', null, 5, 3, 2]]);
  });

  it('invalid shared-caster content leaves valid Pact rows present', () => {
    const invalidWizard = resourceClass(1, 'Wizard', 3, {
      base_spellcasting: {
        progression_type: 'full',
        progression_row: {
          status: 'present',
          slots: '{}',
          pact_slots: '[]',
        },
      },
    });
    const validWarlock = resourceClass(2, 'Warlock', 3, {
      base_spellcasting: {
        progression_type: 'pact',
        progression_row: {
          status: 'present',
          slots: '[]',
          pact_slots: '{"count":2,"level":2}',
        },
      },
    });

    expect(
      resolveSheetResources(
        [invalidWizard, validWarlock],
        PRESENT_ABILITIES,
      ).map((entry) =>
        entry.status === 'computed'
          ? [entry.kind, entry.spell_level, entry.maximum]
          : [entry.reason, entry.class_name, entry.id],
      ),
    ).toEqual([
      [
        'spell_progression_missing_or_invalid',
        'Wizard',
        'resource:1:base-spell-progression-absent',
      ],
      ['pact_slot', 2, 2],
    ]);
  });

  it('invalid zero-effective-level shared content leaves valid Pact rows present', () => {
    const invalidRoundedDownCaster = resourceClass(1, 'Spellblade', 1, {
      base_spellcasting: {
        progression_type: 'half_down',
        progression_row: {
          status: 'present',
          slots: '{"1":2}',
          pact_slots: '[]',
        },
      },
    });
    const validWarlock = resourceClass(2, 'Warlock', 3, {
      base_spellcasting: {
        progression_type: 'pact',
        progression_row: {
          status: 'present',
          slots: '[]',
          pact_slots: '{"count":2,"level":2}',
        },
      },
    });

    expect(
      resolveSheetResources(
        [invalidRoundedDownCaster, validWarlock],
        PRESENT_ABILITIES,
      ).map((entry) =>
        entry.status === 'computed'
          ? [entry.kind, entry.spell_level, entry.maximum]
          : [entry.reason, entry.class_name, entry.id],
      ),
    ).toEqual([
      [
        'spell_progression_missing_or_invalid',
        'Spellblade',
        'resource:1:base-spell-progression-absent',
      ],
      ['pact_slot', 2, 2],
    ]);
  });

  it('invalid Pact content leaves valid shared-caster rows present', () => {
    const invalidWarlock = resourceClass(1, 'Warlock', 3, {
      base_spellcasting: {
        progression_type: 'pact',
        progression_row: {
          status: 'present',
          slots: '[]',
          pact_slots: '{}',
        },
      },
    });
    const validWizard = resourceClass(2, 'Wizard', 2, {
      base_spellcasting: {
        progression_type: 'full',
        progression_row: {
          status: 'present',
          slots: '{"1":3}',
          pact_slots: '[]',
        },
      },
    });

    expect(
      resolveSheetResources(
        [invalidWarlock, validWizard],
        PRESENT_ABILITIES,
      ).map((entry) =>
        entry.status === 'computed'
          ? [entry.kind, entry.spell_level, entry.maximum]
          : [entry.reason, entry.class_name, entry.id],
      ),
    ).toEqual([
      [
        'spell_progression_missing_or_invalid',
        'Warlock',
        'resource:1:base-spell-progression-absent',
      ],
      ['spell_slot', 1, 3],
    ]);
  });

  it('keeps unknown, missing resource, invalid formula inputs, and invalid spell content absent', () => {
    const unknown = resourceClass(1, 'Chronomancer', 4, {
      catalog: { status: 'not_recorded' },
    });
    const missingLadder = resourceClass(2, 'Barbarian', 4, {
      catalog: {
        status: 'recorded', expected_ladder_kinds: ['rage'],
        expected_formula_kinds: [], has_unmodelled_feature_maxima: false,
      },
    });
    const invalidFormula = resourceClass(3, 'Bard', 4, {
      catalog: {
        status: 'recorded', expected_ladder_kinds: [],
        expected_formula_kinds: ['bardic_inspiration'],
        has_unmodelled_feature_maxima: false,
      },
      formula_rows: [{ resource_kind: 'bardic_inspiration', formula: null }],
    });
    const invalidSpell = resourceClass(4, 'Wizard', 3, {
      base_spellcasting: {
        progression_type: 'full',
        progression_row: { status: 'present', slots: '{}', pact_slots: '[]' },
      },
    });
    const invalidFormulaClassLevel = resourceClass(5, 'Sorcerer', 0, {
      catalog: {
        status: 'recorded', expected_ladder_kinds: [],
        expected_formula_kinds: ['innate_sorcery'],
        has_unmodelled_feature_maxima: false,
      },
      formula_rows: [{
        resource_kind: 'innate_sorcery',
        formula: {
          kind: 'fixed_count',
          minimum_class_level: 1 as ClassLevel,
          count: 2 as PositiveResourceMaximum,
        },
      }],
    });
    expect(
      resolveSheetResources(
        [
          unknown,
          missingLadder,
          invalidFormula,
          invalidFormulaClassLevel,
          invalidSpell,
        ],
        PRESENT_ABILITIES,
      ).map((entry) => entry.status === 'absent' ? entry.reason : entry.kind),
    ).toEqual([
      'resource_catalog_not_recorded',
      'resource_level_row_missing_or_invalid',
      'resource_formula_missing_or_invalid',
      'resource_formula_class_level_missing_or_invalid',
      'spell_progression_missing_or_invalid',
    ]);
  });
});
