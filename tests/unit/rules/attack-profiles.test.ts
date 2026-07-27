import { describe, expect, it } from 'vitest';
import { AbilityScores } from '../../../src/rules/ability-scores';
import {
  attackProfiles,
  shillelaghDamageDice,
  trueStrikeExtraDice,
  type AttackProfile,
  type AttackProfileInput,
  type AttackProfileResult,
  type AttackProfileWeapon,
} from '../../../src/rules/attack-profiles';
import type {
  AttackCantrip,
  CantripAccess,
  CantripSource,
  RecognisedAttackCantrips,
} from '../../../src/rules/attack-cantrips';
import { martialArtsDice, type SheetClassLevels } from '../../../src/rules/sheet';
import type { ExtraAttackGrant } from '../../../src/rules/extra-attack';
import type { MartialArtsDieSize } from '../../../src/domain/enums';
import type { WeaponProficiencyVerdict } from '../../../src/rules/multiclass-proficiency';

/**
 * EVERY NUMBER HERE IS COMPUTED BY HAND AND WRITTEN AS A LITERAL, and the
 * working is written beside it. Not one expectation was produced by running the
 * derivation and pasting what came out.
 *
 * The SRD facts are transcribed by eye from
 * `docs/srd/source/weapon-attack-cantrips.txt`,
 * `docs/srd/source/attack-class-features.txt`,
 * `docs/srd/source/multiclassing.txt` and `docs/srd/source/sheet-math.txt`.
 *
 * THE TEST THIS FILE EXISTS FOR is `scales the two upgrades on DIFFERENT
 * levels`: cantrips move on TOTAL character level and the Martial Arts die
 * moves on MONK level, and the multiclass case below fails loudly if the two
 * are swapped.
 */

/**
 * The Monk's Martial Arts column, transcribed from the Monk Features table.
 *
 * `MartialArtsDieSize` AND NOT `number`: this transcription is checked against
 * the closed set at COMPILE time, so a slipped digit here is an error before it
 * is an expectation.
 */
const MONK_DICE = new Map<number, MartialArtsDieSize>([
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 8],
  [9, 8],
  [10, 8],
  [11, 10],
  [12, 10],
  [13, 10],
  [14, 10],
  [15, 10],
  [16, 10],
  [17, 12],
  [18, 12],
  [19, 12],
  [20, 12],
]);

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

/** Fighter 5 -> 2, 11 -> 3, 20 -> 4, from the Fighter Features table. */
const FIGHTER_ATTACKS: readonly ExtraAttackGrant[] = [
  classGrant('Fighter', 5, 2),
  classGrant('Fighter', 11, 3),
  classGrant('Fighter', 20, 4),
];

function monk(level: number): SheetClassLevels {
  return {
    class_name: 'Monk',
    level,
    extra_attack_grants: [classGrant('Monk', 5, 2)],
    martial_arts_dice: MONK_DICE,
  };
}

function fighter(level: number): SheetClassLevels {
  return {
    class_name: 'Fighter',
    level,
    extra_attack_grants: FIGHTER_ATTACKS,
  };
}

function druid(level: number): SheetClassLevels {
  return { class_name: 'Druid', level };
}

function wizardClass(level: number): SheetClassLevels {
  return { class_name: 'Arcane scholar', level };
}

/**
 * PROFICIENT, NAMED RATHER THAN SPELLED OUT AT EVERY FIXTURE.
 *
 * The default for every weapon below, so that the tests about dice, damage types
 * and Extra Attack keep printing the numbers they were written against. The
 * three other verdicts each have their own tests, beside the arithmetic they
 * change.
 */
const PROFICIENT: WeaponProficiencyVerdict = {
  kind: 'proficient',
  via: ['Fighter'],
};

const LONGSWORD: AttackProfileWeapon = {
  id: 1,
  name: 'Longsword',
  damage_dice: '1d8',
  damage_type: 'Slashing',
  versatile_damage_dice: '1d10',
  proficiency: PROFICIENT,
};

const NO_CANTRIPS: RecognisedAttackCantrips = {
  true_strike: { state: 'not_known' },
  shillelagh: { state: 'not_known' },
  unrecognised: [],
};

function knows(
  cantrip: AttackCantrip,
  sources: readonly CantripSource[],
): RecognisedAttackCantrips {
  const known: CantripAccess = { state: 'known', sources };
  return {
    true_strike: cantrip === 'true_strike' ? known : { state: 'not_known' },
    shillelagh: cantrip === 'shillelagh' ? known : { state: 'not_known' },
    unrecognised: [],
  };
}

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

function build(
  overrides: Partial<AttackProfileInput> = {},
): AttackProfileResult {
  return attackProfiles({
    weapons: [LONGSWORD],
    classes: [fighter(5)],
    scores: scores({}),
    proficiencyBonus: 3,
    cantrips: NO_CANTRIPS,
    ...overrides,
  });
}

function profileOf(
  result: AttackProfileResult,
  kind: AttackProfile['kind'],
): AttackProfile {
  const found = result.weapons
    .flatMap((weapon) => weapon.profiles)
    .find((profile) => profile.kind === kind);
  if (found === undefined) {
    throw new Error(`No ${kind} profile was derived.`);
  }
  return found;
}

function bonusFor(profile: AttackProfile, ability: string): number {
  if (profile.abilities.state === 'unavailable') {
    throw new Error('No ability options on this profile.');
  }
  const option = profile.abilities.options.find(
    (entry) => entry.ability === ability,
  );
  if (option === undefined) {
    throw new Error(`No ${ability} option on this profile.`);
  }
  return option.attack_bonus;
}

describe('the plain weapon attack', () => {
  it('computes both printed formulas by hand', () => {
    // `sheet-math.txt`: "Melee attack bonus = Strength modifier + Proficiency
    // Bonus / Ranged attack bonus = Dexterity modifier + Proficiency Bonus".
    //
    // Strength 18 -> modifier +4; Dexterity 14 -> +2. A level 5 character has a
    // proficiency bonus of +3. So melee is 4 + 3 = 7 and ranged is 2 + 3 = 5.
    const result = build({
      scores: scores({ strength: 18, dexterity: 14 }),
      proficiencyBonus: 3,
    });
    const normal = profileOf(result, 'normal');
    expect(bonusFor(normal, 'strength')).toBe(7);
    expect(bonusFor(normal, 'dexterity')).toBe(5);
  });

  it('adds the ability MODIFIER to damage, never the proficiency bonus', () => {
    // "You add the same ability modifier you use for attacks with a weapon to
    // your damage rolls with that weapon." The modifier, not the total: a
    // Strength 18 character adds +4 to damage while attacking at +7.
    const normal = profileOf(
      build({ scores: scores({ strength: 18 }), proficiencyBonus: 3 }),
      'normal',
    );
    const strength = normal.abilities.state === 'unavailable'
      ? undefined
      : normal.abilities.options.find((entry) => entry.ability === 'strength');
    expect(strength?.damage_modifier).toBe(4);
    expect(strength?.attack_bonus).toBe(7);
  });

  it('carries a NEGATIVE modifier through rather than flooring it', () => {
    // Strength 6 -> modifier -2. With a +2 proficiency bonus the melee attack
    // bonus is 0, and the damage modifier stays -2. A floor at zero would be
    // this application inventing a rule the source does not print.
    const normal = profileOf(
      build({
        scores: scores({ strength: 6 }),
        proficiencyBonus: 2,
        classes: [fighter(1)],
      }),
      'normal',
    );
    expect(bonusFor(normal, 'strength')).toBe(0);
  });

  it('will not claim to know whether the weapon is melee or ranged', () => {
    const normal = profileOf(build(), 'normal');
    expect(normal.abilities.state).toBe('undecided');
    // Not `choice`: the source does not offer a choice here, this application
    // simply cannot tell which branch applies.
    expect(normal.abilities.state).not.toBe('choice');
    expect(normal.abilities.state).not.toBe('fixed');
  });

  /**
   * THE PROFICIENCY BONUS, PER VERDICT — the four arms, against the SAME
   * character and the SAME weapon, so nothing but the verdict can move.
   *
   * THIS TEST REPLACES ONE THAT PINNED A DEFERRAL. It used to assert the
   * precondition sentence "the proficiency bonus is included, whatever the
   * Proficiencies section says… this number does not yet read it" — the honest
   * record of a gap. The gap is closed, so the SUBJECT of that assertion is
   * gone; what survives, and is asserted far harder here, is that the profile
   * states what it did rather than hiding it.
   *
   * Strength 18 (+4), proficiency bonus 3. Proficient is +7; withheld is +4.
   * The two numbers differ, which is the whole point: an implementation that
   * ignored the verdict would print +7 four times.
   */
  const withVerdict = (proficiency: WeaponProficiencyVerdict): AttackProfile =>
    profileOf(
      build({
        scores: scores({ strength: 18 }),
        proficiencyBonus: 3,
        weapons: [{ ...LONGSWORD, proficiency }],
      }),
      'normal',
    );

  it('withholds the proficiency bonus from a weapon no class grants (D28 §1)', () => {
    const profile = withVerdict({ kind: 'not_proficient' });
    expect(bonusFor(profile, 'strength')).toBe(4);
    // THE DAMAGE MODIFIER DOES NOT MOVE. The source puts the Proficiency Bonus
    // in the attack roll and only the ability modifier in the damage roll, so a
    // fix that took it off both would be a second wrong number.
    const strength =
      profile.abilities.state === 'unavailable'
        ? undefined
        : profile.abilities.options.find(
            (entry) => entry.ability === 'strength',
          );
    expect(strength?.damage_modifier).toBe(4);
    // …and it says so, in the option's own reason and in the precondition. The
    // printed formula is NOT quoted verbatim here, because this row did not
    // follow it.
    expect(strength?.reason).toContain('is the Strength modifier alone');
    expect(strength?.reason).toContain('The Proficiency Bonus is NOT included');
    expect(profile.preconditions.join(' ')).toContain(
      'no class this character has grants this weapon’s category',
    );
  });

  it('includes it where a class does grant the category', () => {
    const profile = withVerdict({ kind: 'proficient', via: ['Fighter'] });
    expect(bonusFor(profile, 'strength')).toBe(7);
    expect(profile.preconditions.join(' ')).toContain(
      'The Proficiency Bonus is included',
    );
  });

  it('includes it where no category is recorded, and calls that an assumption', () => {
    // D27: "where it is null the sheet keeps its current stated assumption".
    // Withholding here would take the bonus off every weapon on every character
    // imported before that column existed — a new wrong number, invented by the
    // fix for the old one.
    const profile = withVerdict({ kind: 'category_not_stated' });
    expect(bonusFor(profile, 'strength')).toBe(7);
    const stated = profile.preconditions.join(' ');
    expect(stated).toContain('No simple/martial category is recorded');
    expect(stated).toContain('an ASSUMPTION and not a fact');
  });

  it('withholds it where the qualifier is one this application cannot read', () => {
    // The same assumption the sheet already states for this arm. The two
    // screens agreeing about an assumption matters more than which way it
    // falls, because the reason tells the player to adjudicate either way.
    const profile = withVerdict({
      kind: 'qualifier_not_evaluated',
      via: ['Runeblade'],
      qualifiers: ['inscribed with a rune'],
    });
    expect(bonusFor(profile, 'strength')).toBe(4);
    expect(profile.preconditions.join(' ')).toContain(
      'add the bonus at the table',
    );
  });

  it('applies the verdict to EVERY profile of the weapon, not just the plain one', () => {
    // True Strike and Martial Arts are weapon attacks too. A fix applied to the
    // plain attack alone would leave a Monk's Martial Arts row printing a bonus
    // the row above it withholds — the same two-screens disagreement, one row
    // apart.
    const result = attackProfiles({
      weapons: [{ ...LONGSWORD, proficiency: { kind: 'not_proficient' } }],
      classes: [
        { class_name: 'Monk', level: 5, martial_arts_dice: new Map([[5, 6]]) },
      ],
      scores: scores({ strength: 18, dexterity: 18, wisdom: 18 }),
      proficiencyBonus: 3,
      cantrips: knows('true_strike', [
        { source_name: 'Monk', spellcasting_ability: 'wisdom' },
      ]),
    });
    for (const kind of ['normal', 'true_strike', 'martial_arts'] as const) {
      const profile = profileOf(result, kind);
      const bonuses =
        profile.abilities.state === 'unavailable'
          ? []
          : profile.abilities.options.map((entry) => entry.attack_bonus);
      expect(bonuses, `${kind} withholds the bonus`).not.toHaveLength(0);
      // Every option is the bare modifier: +4 for Strength, Dexterity and
      // Wisdom alike, since all three scores are 18 here.
      expect(new Set(bonuses), `${kind} withholds the bonus`).toEqual(
        new Set([4]),
      );
    }
  });

  it('includes the bonus on the DERIVED Shillelagh row, and says it was not checked', () => {
    // There is no weapon record behind that row, so there is no category to
    // check. Synthesising one would be this application deciding which weapon
    // the player picked up.
    const result = attackProfiles({
      weapons: [],
      classes: [{ class_name: 'Druid', level: 5 }],
      scores: scores({ strength: 18, wisdom: 18 }),
      proficiencyBonus: 3,
      cantrips: knows('shillelagh', [
        { source_name: 'Druid', spellcasting_ability: 'wisdom' },
      ]),
    });
    const profile = profileOf(result, 'shillelagh');
    expect(bonusFor(profile, 'wisdom')).toBe(7);
    expect(profile.preconditions.join(' ')).toContain(
      'no weapon record to check a proficiency category against',
    );
  });

  it('reports the weapon damage as recorded, and the Versatile die as a note', () => {
    const normal = profileOf(build(), 'normal');
    expect(normal.damage.dice).toBe('1d8');
    expect(normal.damage.damage_type).toEqual({
      state: 'weapon',
      damage_type: 'Slashing',
    });
    expect(normal.damage.dice_note).toContain('1d10');
  });

  it('reports an unrecorded damage type as unrecorded, not as a default', () => {
    const normal = profileOf(
      build({
        weapons: [
          {
            id: 9,
            name: "Grandfather's sword",
            damage_dice: null,
            damage_type: null,
            versatile_damage_dice: null,
            proficiency: PROFICIENT,
          },
        ],
      }),
      'normal',
    );
    expect(normal.damage.dice).toBeNull();
    expect(normal.damage.damage_type).toEqual({ state: 'not_recorded' });
  });
});

describe('Extra Attack governs display', () => {
  it('is exactly attacksPerAction > 1', () => {
    // A Fighter 4 has no grant at or below their level: one attack.
    expect(build({ classes: [fighter(4)] }).has_extra_attack).toBe(false);
    expect(build({ classes: [fighter(4)] }).attacks_per_action).toBe(1);
    // Fighter 5 -> 2. Fighter 11 -> 3. Fighter 20 -> 4.
    expect(build({ classes: [fighter(5)] }).attacks_per_action).toBe(2);
    expect(build({ classes: [fighter(11)] }).attacks_per_action).toBe(3);
    expect(build({ classes: [fighter(20)] }).attacks_per_action).toBe(4);
    expect(build({ classes: [fighter(5)] }).has_extra_attack).toBe(true);
  });

  it('does not stack Extra Attack across classes on the profile', () => {
    // Fighter 5 / Monk 5 both grant 2. `multiclassing.txt`: they don't stack.
    const result = build({ classes: [fighter(5), monk(5)] });
    expect(result.attacks_per_action).toBe(2);
    expect(result.attacks_per_action).not.toBe(3);
    expect(result.attacks_per_action).not.toBe(4);
    expect(profileOf(result, 'normal').attacks_per_action).toBe(2);
  });

  it('gives True Strike ONE attack however many the Attack action gives', () => {
    // "you make one attack with the weapon used in the spell's casting", and
    // the casting time is an Action. A Fighter 11 who casts it drops from three
    // attacks to one, and the sheet must show both rows to be comparable.
    const result = build({
      classes: [fighter(11)],
      cantrips: knows('true_strike', [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
      ]),
    });
    expect(profileOf(result, 'normal').attacks_per_action).toBe(3);
    expect(profileOf(result, 'true_strike').attacks_per_action).toBe(1);
    expect(profileOf(result, 'true_strike').notes.join(' ')).toContain(
      'would give 3',
    );
  });

  it('says nothing about lost attacks when there is nothing to lose', () => {
    const result = build({
      classes: [wizardClass(4)],
      cantrips: knows('true_strike', [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
      ]),
    });
    expect(result.has_extra_attack).toBe(false);
    expect(profileOf(result, 'true_strike').notes).toEqual([]);
  });
});

describe('True Strike', () => {
  const wizardKnows = knows('true_strike', [
    { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
  ]);

  it('is not offered at all to a character who does not know it', () => {
    const result = build();
    expect(
      result.weapons.flatMap((weapon) => weapon.profiles).map((p) => p.kind),
    ).toEqual(['normal']);
  });

  /**
   * THE VERSATILE NOTE SURVIVES THE REWRITE, because "you make one attack with
   * the weapon used in the spell's casting" rolls the weapon's OWN dice. A row
   * printing `1d8` directly under a row that qualified the same `1d8` with
   * "1d10 with two hands" drops a fact the character still has.
   *
   * Martial Arts is the deliberate contrast in the same assertion: its die
   * REPLACES the weapon's, so carrying Versatile there would be false.
   */
  it('keeps the Versatile note the plain attack carries, where Martial Arts drops it', () => {
    const result = build({
      classes: [monk(5)],
      cantrips: wizardKnows,
    });
    const normalNote = profileOf(result, 'normal').damage.dice_note;
    expect(normalNote).toBe('Versatile: 1d10 when wielded with two hands.');
    expect(profileOf(result, 'true_strike').damage.dice).toBe('1d8');
    expect(profileOf(result, 'true_strike').damage.dice_note).toBe(normalNote);

    // Martial Arts substitutes the die, so the weapon's two-handed die is not
    // its die and the note must NOT appear.
    expect(profileOf(result, 'martial_arts').damage.dice).toBe('1d8');
    expect(profileOf(result, 'martial_arts').damage.dice_note).not.toContain(
      'Versatile',
    );
  });

  it('claims no Versatile note for a weapon that records none', () => {
    const result = build({
      weapons: [
        {
          id: 4,
          name: 'Dagger',
          damage_dice: '1d4',
          damage_type: 'Piercing',
          versatile_damage_dice: null,
          proficiency: PROFICIENT,
        },
      ],
      cantrips: wizardKnows,
    });
    expect(profileOf(result, 'true_strike').damage.dice_note).toBeNull();
  });

  it('uses the spellcasting ability, and it is FIXED, not a choice', () => {
    // "The attack uses your spellcasting ability for the attack and damage
    // rolls instead of using Strength or Dexterity." Intelligence 18 -> +4;
    // a level 8 character has a +3 proficiency bonus; 4 + 3 = 7.
    const result = build({
      classes: [wizardClass(8)],
      proficiencyBonus: 3,
      scores: scores({ intelligence: 18, strength: 20, dexterity: 20 }),
      cantrips: wizardKnows,
    });
    const profile = profileOf(result, 'true_strike');
    expect(profile.abilities.state).toBe('fixed');
    expect(bonusFor(profile, 'intelligence')).toBe(7);
    // Strength 20 is +5 and would beat it; the cantrip does not allow it.
    expect(() => bonusFor(profile, 'strength')).toThrow();
    expect(() => bonusFor(profile, 'dexterity')).toThrow();
  });

  it('offers Radiant OR the weapon type, and picks neither', () => {
    // "it can be Radiant damage or the weapon's normal damage type (your
    // choice)."
    const profile = profileOf(
      build({ classes: [wizardClass(8)], cantrips: wizardKnows }),
      'true_strike',
    );
    expect(profile.damage.damage_type).toEqual({
      state: 'choice',
      spell_type: 'Radiant',
      weapon_type: 'Slashing',
    });
  });

  it('adds extra Radiant damage on TOTAL character level', () => {
    // "the attack deals extra Radiant damage when you reach levels 5 (1d6),
    // 11 (2d6), and 17 (3d6)". Hand-checked at every threshold and just below.
    const extra = (classes: readonly SheetClassLevels[]): unknown =>
      profileOf(
        build({ classes, cantrips: wizardKnows }),
        'true_strike',
      ).damage.extra.map((entry) => entry.dice);

    expect(extra([wizardClass(4)])).toEqual([]);
    expect(extra([wizardClass(5)])).toEqual(['1d6']);
    expect(extra([wizardClass(10)])).toEqual(['1d6']);
    expect(extra([wizardClass(11)])).toEqual(['2d6']);
    expect(extra([wizardClass(16)])).toEqual(['2d6']);
    expect(extra([wizardClass(17)])).toEqual(['3d6']);
    expect(extra([wizardClass(20)])).toEqual(['3d6']);
  });

  it('takes the extra damage with no ability modifier attached', () => {
    const profile = profileOf(
      build({
        classes: [wizardClass(11)],
        scores: scores({ intelligence: 18 }),
        cantrips: wizardKnows,
      }),
      'true_strike',
    );
    expect(profile.damage.extra).toHaveLength(1);
    expect(profile.damage.extra[0]?.damage_type).toBe('Radiant');
    expect(profile.damage.extra[0]?.dice).toBe('2d6');
  });

  it('appears on every weapon the character owns', () => {
    const dagger: AttackProfileWeapon = {
      id: 2,
      name: 'Dagger',
      damage_dice: '1d4',
      damage_type: 'Piercing',
      versatile_damage_dice: null,
      proficiency: PROFICIENT,
    };
    const result = build({
      weapons: [LONGSWORD, dagger],
      classes: [wizardClass(5)],
      cantrips: wizardKnows,
    });
    expect(
      result.weapons.map((weapon) =>
        weapon.profiles.map((profile) => profile.kind),
      ),
    ).toEqual([
      ['normal', 'true_strike'],
      ['normal', 'true_strike'],
    ]);
  });
});

describe('Shillelagh', () => {
  const druidKnows = knows('shillelagh', [
    { source_name: 'Druid', spellcasting_ability: 'wisdom' },
  ]);

  it('appears UNCONDITIONALLY, with no weapon owned and none invented', () => {
    // D15: any character who knows the cantrip gets the row, whether or not
    // they own a Club or Quarterstaff. The row is derived — its `weapon_id` is
    // null, so nothing was written to `character_weapons` to produce it.
    const result = build({
      weapons: [],
      classes: [druid(3)],
      cantrips: druidKnows,
    });
    expect(result.weapons).toHaveLength(1);
    expect(result.weapons[0]?.weapon_id).toBeNull();
    expect(result.weapons[0]?.derived).toBe(true);
    expect(result.weapons[0]?.profiles.map((p) => p.kind)).toEqual([
      'shillelagh',
    ]);
  });

  it('is one row, not one per owned weapon, and comes last', () => {
    const result = build({
      classes: [druid(3)],
      cantrips: druidKnows,
    });
    expect(result.weapons.map((weapon) => weapon.derived)).toEqual([
      false,
      true,
    ]);
    expect(
      result.weapons.flatMap((weapon) =>
        weapon.profiles.filter((p) => p.kind === 'shillelagh'),
      ),
    ).toHaveLength(1);
  });

  it('offers the spellcasting ability OR Strength — the cantrip says "can"', () => {
    // "you can use your spellcasting ability instead of Strength". Wisdom 16 ->
    // +3; a level 5 character has a +3 proficiency bonus; 3 + 3 = 6. Strength
    // 14 -> +2, so 2 + 3 = 5 and it is genuinely the worse of two real options.
    const profile = profileOf(
      build({
        classes: [druid(5)],
        proficiencyBonus: 3,
        scores: scores({ wisdom: 16, strength: 14 }),
        cantrips: druidKnows,
      }),
      'shillelagh',
    );
    expect(profile.abilities.state).toBe('choice');
    expect(bonusFor(profile, 'wisdom')).toBe(6);
    expect(bonusFor(profile, 'strength')).toBe(5);
  });

  it('replaces the damage die on TOTAL character level', () => {
    // "the weapon's damage die becomes a d8", then "levels 5 (d10), 11 (d12),
    // and 17 (2d6)".
    const dice = (classes: readonly SheetClassLevels[]): string | null =>
      profileOf(build({ classes, cantrips: druidKnows }), 'shillelagh').damage
        .dice;
    expect(dice([druid(1)])).toBe('1d8');
    expect(dice([druid(4)])).toBe('1d8');
    expect(dice([druid(5)])).toBe('1d10');
    expect(dice([druid(10)])).toBe('1d10');
    expect(dice([druid(11)])).toBe('1d12');
    expect(dice([druid(16)])).toBe('1d12');
  });

  it('reaches 2d6 at level 17 — NOT a d14 and not a die size at all', () => {
    // The level 17 step breaks the d4/d6/d8/d10/d12 ladder: the source prints
    // `2d6`, two dice. An implementation that stored a die SIZE the way
    // `class_martial_arts_dice` legitimately does gets this one wrong.
    expect(shillelaghDamageDice(17)).toBe('2d6');
    expect(shillelaghDamageDice(20)).toBe('2d6');
    expect(shillelaghDamageDice(16)).toBe('1d12');
  });

  it('offers Force OR the weapon type, and claims no weapon type', () => {
    // "it can be Force damage or the weapon's normal damage type (your
    // choice)". The row is not tied to a weapon the user owns, so the weapon
    // side of the choice is left open rather than read off a name.
    const profile = profileOf(
      build({ classes: [druid(3)], cantrips: druidKnows }),
      'shillelagh',
    );
    expect(profile.damage.damage_type).toEqual({
      state: 'choice',
      spell_type: 'Force',
      weapon_type: null,
    });
  });

  /**
   * THE MIXED LIST. Two sources disagreeing puts the row in `undecided`, and
   * Strength is on that same list — but for the opposite reason: the cantrip's
   * own "you CAN use your spellcasting ability INSTEAD OF Strength" makes it an
   * entitlement the rules grant outright. `ProfileAbilities` documents that
   * `choice` and `undecided` must never become one undifferentiated list, so
   * the row has to keep saying which entry is which.
   */
  it('keeps Strength distinguishable when the spellcasting side is undecided', () => {
    const result = build({
      classes: [druid(5)],
      proficiencyBonus: 3,
      scores: scores({ strength: 16, wisdom: 18, charisma: 14 }),
      cantrips: knows('shillelagh', [
        { source_name: 'Druid', spellcasting_ability: 'wisdom' },
        { source_name: 'Magic Initiate', spellcasting_ability: 'charisma' },
      ]),
    });
    const profile = profileOf(result, 'shillelagh');
    expect(profile.abilities.state).toBe('undecided');
    // Wisdom 18 -> +4, Charisma 14 -> +2, Strength 16 -> +3; +3 proficiency.
    expect(bonusFor(profile, 'wisdom')).toBe(7);
    expect(bonusFor(profile, 'charisma')).toBe(5);
    expect(bonusFor(profile, 'strength')).toBe(6);

    if (profile.abilities.state !== 'undecided') {
      throw new Error('The row is no longer undecided.');
    }
    const abilities = profile.abilities;
    // The LIST sentence explains the ambiguity, and it does NOT stop there: it
    // also says why Strength is present despite it. Without the second half, an
    // entitlement is filed under this application's own ignorance.
    expect(abilities.reason).toContain('more than one source');
    expect(abilities.reason).toContain('INSTEAD OF Strength');
    expect(abilities.reason).toContain(
      'not this application failing to resolve one',
    );

    // And every entry carries its OWN sentence, so the flat list is
    // attributable one row at a time.
    const reasonFor = (ability: string): string => {
      const found = abilities.options.find(
        (entry) => entry.ability === ability,
      );
      if (found === undefined) {
        throw new Error(`No ${ability} option on the row.`);
      }
      return found.reason;
    };
    expect(reasonFor('wisdom')).toContain('Druid');
    expect(reasonFor('charisma')).toContain('Magic Initiate');
    expect(reasonFor('strength')).toContain('when the cantrip is not applied');
    // The Strength entry must not read as one of the contested spellcasting
    // sources, which is what the list sentence alone would have implied.
    expect(reasonFor('strength')).not.toContain('spellcasting ability');
  });

  it('degrades to Strength alone, and says why, when no ability resolves', () => {
    // Magic Initiate's list includes Druid, so a class with no spellcasting
    // ability of its own can legitimately know this. Where the source instance
    // records none, the number is not invented.
    const result = build({
      classes: [fighter(5)],
      scores: scores({ strength: 16 }),
      proficiencyBonus: 3,
      cantrips: knows('shillelagh', [
        { source_name: 'Magic Initiate', spellcasting_ability: null },
      ]),
    });
    const profile = profileOf(result, 'shillelagh');
    expect(profile.abilities.state).toBe('undecided');
    // Strength 16 -> +3, plus +3 proficiency = 6.
    expect(bonusFor(profile, 'strength')).toBe(6);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'no_spellcasting_ability',
    );
    if (profile.abilities.state !== 'undecided') {
      throw new Error('The row is no longer undecided.');
    }
    // Strength is the ONLY entry here, and the state means "cannot tell".
    // Without the second sentence the page would read as though Strength itself
    // were the thing this application had failed to resolve.
    expect(profile.abilities.reason).toContain(
      'has a spellcasting ability this application can resolve',
    );
    expect(profile.abilities.reason).toContain('INSTEAD OF Strength');
  });
});

describe('Martial Arts', () => {
  it('is not offered to a character with no Monk levels', () => {
    expect(martialArtsDice([fighter(20)])).toEqual([]);
    const result = build({ classes: [fighter(20)] });
    expect(
      result.weapons.flatMap((w) => w.profiles).map((p) => p.kind),
    ).not.toContain('martial_arts');
  });

  it('offers Dexterity OR Strength — Dexterous Attacks says "can"', () => {
    // Dexterity 16 -> +3, Strength 12 -> +1. A Monk 5 has a +3 proficiency
    // bonus, so 3 + 3 = 6 and 1 + 3 = 4.
    const profile = profileOf(
      build({
        classes: [monk(5)],
        proficiencyBonus: 3,
        scores: scores({ dexterity: 16, strength: 12 }),
      }),
      'martial_arts',
    );
    expect(profile.abilities.state).toBe('choice');
    expect(bonusFor(profile, 'dexterity')).toBe(6);
    expect(bonusFor(profile, 'strength')).toBe(4);
  });

  it('takes the die from the Monk Features table at every step', () => {
    const die = (level: number): string | null =>
      profileOf(build({ classes: [monk(level)] }), 'martial_arts').damage.dice;
    expect(die(1)).toBe('1d6');
    expect(die(4)).toBe('1d6');
    expect(die(5)).toBe('1d8');
    expect(die(10)).toBe('1d8');
    expect(die(11)).toBe('1d10');
    expect(die(16)).toBe('1d10');
    expect(die(17)).toBe('1d12');
    expect(die(20)).toBe('1d12');
  });

  it('keeps the weapon damage type — it replaces the die, not the type', () => {
    const profile = profileOf(build({ classes: [monk(5)] }), 'martial_arts');
    expect(profile.damage.damage_type).toEqual({
      state: 'weapon',
      damage_type: 'Slashing',
    });
  });

  it('states the two facts it cannot check rather than filtering on them', () => {
    const text = profileOf(
      build({ classes: [monk(5)] }),
      'martial_arts',
    ).preconditions.join(' ');
    expect(text).toContain('Light property');
    expect(text).toContain('Shield');
  });
});

describe('the two levels are DIFFERENT numbers on the same character', () => {
  it('scales the two upgrades on DIFFERENT levels', () => {
    // Monk 3 / Fighter 10. Total character level is 13; the Monk level is 3.
    //
    //   Martial Arts die  -> MONK level 3   -> 1d6   (level 13 would be 1d10)
    //   Shillelagh die    -> TOTAL level 13 -> 1d12  (Monk 3 would be 1d8)
    //   True Strike extra -> TOTAL level 13 -> 2d6   (Monk 3 would be none)
    //
    // Swap the two levels and every one of these three assertions fails.
    const classes = [monk(3), fighter(10)];
    const result = attackProfiles({
      weapons: [LONGSWORD],
      classes,
      scores: scores({ wisdom: 16, intelligence: 16 }),
      proficiencyBonus: 5,
      cantrips: {
        true_strike: {
          state: 'known',
          sources: [
            {
              source_name: 'Arcane scholar',
              spellcasting_ability: 'intelligence',
            },
          ],
        },
        shillelagh: {
          state: 'known',
          sources: [{ source_name: 'Druid', spellcasting_ability: 'wisdom' }],
        },
        unrecognised: [],
      },
    });

    expect(profileOf(result, 'martial_arts').damage.dice).toBe('1d6');
    expect(profileOf(result, 'martial_arts').damage.dice).not.toBe('1d10');

    expect(profileOf(result, 'shillelagh').damage.dice).toBe('1d12');
    expect(profileOf(result, 'shillelagh').damage.dice).not.toBe('1d8');

    expect(
      profileOf(result, 'true_strike').damage.extra.map((e) => e.dice),
    ).toEqual(['2d6']);
  });

  it('reads a Druid 1 / Fighter 10 Shillelagh off the total, not the Druid', () => {
    // Total 11 -> d12. Using the Druid's own level of 1 would give d8.
    const result = build({
      classes: [druid(1), fighter(10)],
      cantrips: knows('shillelagh', [
        { source_name: 'Druid', spellcasting_ability: 'wisdom' },
      ]),
    });
    expect(profileOf(result, 'shillelagh').damage.dice).toBe('1d12');
    expect(profileOf(result, 'shillelagh').damage.dice).not.toBe('1d8');
  });

  it('pins the two ladders as standalone functions too', () => {
    expect(trueStrikeExtraDice(4)).toBeNull();
    expect(trueStrikeExtraDice(5)).toBe('1d6');
    expect(trueStrikeExtraDice(11)).toBe('2d6');
    expect(trueStrikeExtraDice(17)).toBe('3d6');
    expect(shillelaghDamageDice(1)).toBe('1d8');
    expect(shillelaghDamageDice(5)).toBe('1d10');
    expect(shillelaghDamageDice(11)).toBe('1d12');
  });
});

describe('a multiclass spellcasting ability it cannot settle', () => {
  it('shows both, names the sources, and picks neither', () => {
    // The same cantrip from a class and from a feat. `multiclassing.txt` ties
    // the ability to the source, and the source states no rule for choosing
    // between two. Intelligence 18 -> +4, Charisma 14 -> +2, +3 proficiency.
    const result = build({
      classes: [wizardClass(5)],
      proficiencyBonus: 3,
      scores: scores({ intelligence: 18, charisma: 14 }),
      cantrips: knows('true_strike', [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
        { source_name: 'Magic Initiate', spellcasting_ability: 'charisma' },
      ]),
    });
    const profile = profileOf(result, 'true_strike');
    expect(profile.abilities.state).toBe('undecided');
    expect(bonusFor(profile, 'intelligence')).toBe(7);
    expect(bonusFor(profile, 'charisma')).toBe(5);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'ambiguous_spellcasting_ability',
    );
    const message = result.warnings
      .map((warning) => warning.message)
      .join(' ');
    expect(message).toContain('Magic Initiate');
    expect(message).toContain('Arcane scholar');
  });

  it('collapses two sources that agree, because there is nothing to settle', () => {
    const result = build({
      classes: [wizardClass(5)],
      cantrips: knows('true_strike', [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
        { source_name: 'Magic Initiate', spellcasting_ability: 'intelligence' },
      ]),
    });
    expect(profileOf(result, 'true_strike').abilities.state).toBe('fixed');
    expect(result.warnings).toEqual([]);
  });

  it('refuses to fall back to Strength when True Strike has no ability', () => {
    // The cantrip explicitly replaces Strength and Dexterity, so falling back
    // to either would be this application inventing the rule it was told not
    // to. The profile says it cannot produce a number.
    const result = build({
      classes: [fighter(5)],
      scores: scores({ strength: 20, dexterity: 20 }),
      cantrips: knows('true_strike', [
        { source_name: 'Magic Initiate', spellcasting_ability: null },
      ]),
    });
    const profile = profileOf(result, 'true_strike');
    expect(profile.abilities.state).toBe('unavailable');
    expect(result.warnings.map((warning) => warning.code)).toContain(
      'no_spellcasting_ability',
    );
  });
});

describe('an unrecognised catalog key', () => {
  it('is reported, and derives nothing', () => {
    const result = build({
      cantrips: {
        ...NO_CANTRIPS,
        unrecognised: [
          {
            cantrip: 'true_strike',
            content_key: 'srd52:true-strike',
            spell_name: 'True Strike',
            source_name: 'Arcane scholar',
            reason:
              "its content key is 'srd52:true-strike', which this application does not recognise as True Strike",
          },
        ],
      },
    });
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'unrecognised_cantrip',
    ]);
    expect(result.warnings[0]?.message).toContain('srd52:true-strike');
    expect(
      result.weapons.flatMap((w) => w.profiles).map((p) => p.kind),
    ).toEqual(['normal']);
  });
});

describe('nothing is stored', () => {
  it('is a pure function of its input', () => {
    // Called twice with the same input, byte-identical output; called with a
    // changed Dexterity, a changed number. That is the whole of D11: there is
    // no second copy to drift.
    const input: AttackProfileInput = {
      weapons: [LONGSWORD],
      classes: [monk(5)],
      scores: scores({ dexterity: 16 }),
      proficiencyBonus: 3,
      cantrips: NO_CANTRIPS,
    };
    expect(attackProfiles(input)).toEqual(attackProfiles(input));
    const moved = attackProfiles({ ...input, scores: scores({ dexterity: 18 }) });
    // Dexterity 16 -> +3 gives 6; Dexterity 18 -> +4 gives 7.
    expect(bonusFor(profileOf(attackProfiles(input), 'martial_arts'), 'dexterity')).toBe(6);
    expect(bonusFor(profileOf(moved, 'martial_arts'), 'dexterity')).toBe(7);
  });
});
