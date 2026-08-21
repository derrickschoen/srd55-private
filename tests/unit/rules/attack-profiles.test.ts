import { describe, expect, it } from 'vitest';
import { AbilityScores } from '../../../src/rules/ability-scores';
import {
  attackProfiles,
  profileProficiency,
  shillelaghDamageDice,
  trueStrikeExtraDice,
  type AttackProfile,
  type AttackProfileInput,
  type AttackProfileResult,
  type AttackProfileWeapon,
} from '../../../src/rules/attack-profiles';
import { formatWeaponDamage } from '../../../src/domain/weapon-damage';
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
import type { EligibleWeaponEffect } from '../../../src/rules/eligible-character-effects';

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
  damage: { kind: 'dice', dice: '1d8' },
  damage_type: 'Slashing',
  versatile_damage: { kind: 'dice', dice: '1d10' },
  attack_kind: null,
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
    effects: [],
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

function damageText(profile: AttackProfile): string | null {
  return profile.damage.amount.kind === 'not_recorded'
    ? null
    : formatWeaponDamage(profile.damage.amount);
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
  if (option.attack_bonus === null) {
    throw new Error(`${ability} attack bonus is undetermined.`);
  }
  return option.attack_bonus;
}

describe('the plain weapon attack', () => {
  it.each([
    {
      name: 'proficient',
      proficiency: { kind: 'proficient', via: ['Fighter'] } as const,
      proficiencyBonus: 3,
      expected: [
        ['strength', 7, 4],
        ['dexterity', 5, 2],
      ],
    },
    {
      name: 'not proficient',
      proficiency: { kind: 'not_proficient' } as const,
      proficiencyBonus: 3,
      expected: [
        ['strength', 4, 4],
        ['dexterity', 2, 2],
      ],
    },
    {
      name: 'proficient with an absent bonus',
      proficiency: { kind: 'proficient', via: ['Fighter'] } as const,
      proficiencyBonus: null,
      expected: [
        ['strength', null, 4],
        ['dexterity', null, 2],
      ],
    },
  ])('pins attack and damage arithmetic when $name', ({
    proficiency,
    proficiencyBonus,
    expected,
  }) => {
    const profile = profileOf(
      build({
        scores: scores({ strength: 18, dexterity: 14 }),
        proficiencyBonus,
        weapons: [{ ...LONGSWORD, proficiency }],
      }),
      'normal',
    );

    expect(
      profile.abilities.state === 'unavailable'
        ? []
        : profile.abilities.options.map((entry) => [
            entry.ability,
            entry.attack_bonus,
            entry.damage_modifier,
          ]),
    ).toEqual(expected);
  });

  it.each([
    ['ranged', 'recorded', ['dexterity', 'strength']],
    ['melee', 'recorded', ['strength', 'dexterity']],
    [null, 'undecided', ['strength', 'dexterity']],
  ] as const)(
    'orders the %s attack-kind options as %s',
    (attackKind, expectedState, expectedAbilities) => {
      const profile = profileOf(
        build({
          weapons: [{ ...LONGSWORD, attack_kind: attackKind }],
        }),
        'normal',
      );

      expect(profile.abilities.state).toBe(expectedState);
      expect(
        profile.abilities.state === 'unavailable'
          ? []
          : profile.abilities.options.map((entry) => entry.ability),
      ).toEqual(expectedAbilities);
    },
  );

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
      effects: [],
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
      effects: [],
    });
    const profile = profileOf(result, 'shillelagh');
    expect(bonusFor(profile, 'wisdom')).toBe(7);
    expect(profile.preconditions.join(' ')).toContain(
      'no weapon record to check a proficiency category against',
    );
  });

  it('reports the weapon damage as recorded, and the Versatile die as a note', () => {
    const normal = profileOf(build(), 'normal');
    expect(normal.damage.amount).toEqual({ kind: 'dice', dice: '1d8' });
    expect(normal.damage.damage_type).toEqual({
      state: 'weapon',
      damage_type: 'Slashing',
    });
    expect(normal.damage.versatile_note).toContain('1d10');
  });

  it('reports an unrecorded damage type as unrecorded, not as a default', () => {
    const normal = profileOf(
      build({
        weapons: [
          {
            id: 9,
            name: "Grandfather's sword",
            damage: { kind: 'not_recorded' },
            damage_type: null,
            versatile_damage: { kind: 'not_applicable' },
            attack_kind: null,
            proficiency: PROFICIENT,
          },
        ],
      }),
      'normal',
    );
    expect(normal.damage.amount).toEqual({ kind: 'not_recorded' });
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
    const normalNote = profileOf(result, 'normal').damage.versatile_note;
    expect(normalNote).toBe('Versatile: 1d10 when wielded with two hands.');
    expect(damageText(profileOf(result, 'true_strike'))).toBe('1d8');
    expect(profileOf(result, 'true_strike').damage.versatile_note).toBe(normalNote);

    // Martial Arts substitutes the die, so the weapon's two-handed die is not
    // its die and the note must NOT appear.
    expect(damageText(profileOf(result, 'martial_arts'))).toBe('1d8');
    expect(profileOf(result, 'martial_arts').damage.versatile_note).not.toContain(
      'Versatile',
    );
  });

  it('claims no Versatile note for a weapon that records none', () => {
    const result = build({
      weapons: [
        {
          id: 4,
          name: 'Dagger',
          damage: { kind: 'dice', dice: '1d4' },
          damage_type: 'Piercing',
          versatile_damage: { kind: 'not_applicable' },
          attack_kind: null,
          proficiency: PROFICIENT,
        },
      ],
      cantrips: wizardKnows,
    });
    expect(profileOf(result, 'true_strike').damage.versatile_note).toBeNull();
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
      damage: { kind: 'dice', dice: '1d4' },
      damage_type: 'Piercing',
      versatile_damage: { kind: 'not_applicable' },
      attack_kind: null,
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
      damageText(
        profileOf(build({ classes, cantrips: druidKnows }), 'shillelagh'),
      );
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
      damageText(
        profileOf(build({ classes: [monk(level)] }), 'martial_arts'),
      );
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
      effects: [],
    });

    expect(damageText(profileOf(result, 'martial_arts'))).toBe('1d6');
    expect(damageText(profileOf(result, 'martial_arts'))).not.toBe('1d10');

    expect(damageText(profileOf(result, 'shillelagh'))).toBe('1d12');
    expect(damageText(profileOf(result, 'shillelagh'))).not.toBe('1d8');

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
    expect(damageText(profileOf(result, 'shillelagh'))).toBe('1d12');
    expect(damageText(profileOf(result, 'shillelagh'))).not.toBe('1d8');
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
    const abilities = profileOf(result, 'true_strike').abilities;
    expect(abilities).toMatchObject({
      state: 'fixed',
      options: [
        {
          ability: 'intelligence',
          attack_bonus: 3,
          damage_modifier: 0,
        },
      ],
    });
    expect(abilities.state === 'unavailable' ? [] : abilities.options).toHaveLength(1);
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

describe('weapon effects', () => {
  it.each([
    {
      name: 'an any-weapon effect without a weapon id',
      weapon_scope: 'any_weapon' as const,
      character_weapon_id: null,
      warningCodes: [],
    },
    {
      name: 'a bonded effect with its weapon id',
      weapon_scope: 'one_bonded_weapon' as const,
      character_weapon_id: LONGSWORD.id,
      warningCodes: [],
    },
    {
      name: 'a bonded effect without its weapon id',
      weapon_scope: 'one_bonded_weapon' as const,
      character_weapon_id: null,
      warningCodes: ['inert_weapon_effect'],
    },
  ])('emits the exact inert-effect warning set for $name', ({
    weapon_scope,
    character_weapon_id,
    warningCodes,
  }) => {
    const result = build({
      effects: [
        {
          id: 99,
          effect_kind: 'weapon_attack_bonus',
          amount: 1,
          weapon_scope,
          character_weapon_id,
          label: 'Boundary effect',
        },
      ],
    });

    expect(result.warnings.map((warning) => warning.code)).toEqual(warningCodes);
  });

  it('applies a +1 weapon to every existing profile and every ability option', () => {
    const effects: readonly EligibleWeaponEffect[] = [
      {
        id: 1,
        effect_kind: 'weapon_attack_bonus',
        amount: 1,
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Staff of the Armadillo',
      },
      {
        id: 2,
        effect_kind: 'weapon_damage_bonus',
        amount: 1,
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Staff of the Armadillo',
      },
    ];
    const result = build({
      classes: [monk(5)],
      scores: scores({
        strength: 18,
        dexterity: 18,
        wisdom: 18,
      }),
      cantrips: knows('true_strike', [
        { source_name: 'Monk', spellcasting_ability: 'wisdom' },
      ]),
      effects,
    });

    const profiles = result.weapons[0]?.profiles ?? [];
    expect(profiles.map((profile) => profile.kind)).toEqual([
      'normal',
      'true_strike',
      'martial_arts',
    ]);
    for (const profile of profiles) {
      if (profile.abilities.state === 'unavailable') {
        throw new Error(`${profile.label} unexpectedly has no ability options.`);
      }
      expect(profile.notes.slice(-2)).toEqual([
        'Staff of the Armadillo: +1 to this profile’s attack bonus.',
        'Staff of the Armadillo: +1 to this profile’s damage.',
      ]);
    }
    // Every score is 18: modifier +4, proficiency +3, weapon +1 => +8.
    // Damage is modifier +4 plus the weapon's +1 => +5. The literal has two
    // normal options, one True Strike option and two Martial Arts options.
    expect(
      profiles.flatMap((profile) =>
        profile.abilities.state === 'unavailable'
          ? []
          : profile.abilities.options.map((entry) => [
              entry.attack_bonus,
              entry.damage_modifier,
            ]),
      ),
    ).toEqual([
      [8, 5],
      [8, 5],
      [8, 5],
      [8, 5],
      [8, 5],
    ]);
  });

  it('adds one source-labelled profile per ability override without replacing existing options', () => {
    const effects: readonly EligibleWeaponEffect[] = [
      {
        id: 3,
        effect_kind: 'attack_ability_override',
        ability: 'charisma',
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Pact Shell Blade',
      },
      {
        id: 4,
        effect_kind: 'attack_ability_override',
        ability: 'wisdom',
        weapon_scope: 'one_bonded_weapon',
        character_weapon_id: LONGSWORD.id,
        label: 'Armadillo oath',
      },
    ];
    const result = build({
      scores: scores({ charisma: 16, wisdom: 14 }),
      effects,
    });
    const profiles = result.weapons[0]?.profiles ?? [];

    expect(profiles.map((profile) => [profile.kind, profile.label])).toEqual([
      ['normal', 'Attack'],
      ['attack_ability_override', 'Pact Shell Blade'],
      ['attack_ability_override', 'Armadillo oath'],
    ]);
    expect(bonusFor(profiles[1]!, 'charisma')).toBe(6);
    expect(bonusFor(profiles[2]!, 'wisdom')).toBe(5);
    expect(profiles[1]?.abilities.state).toBe('fixed');
    expect(profiles[2]?.abilities.state).toBe('fixed');
  });

  it('resolves one-weapon scope by weapon id and surfaces an unbound row as inert', () => {
    const dagger: AttackProfileWeapon = {
      ...LONGSWORD,
      id: 2,
      name: 'Dagger',
    };
    const effects: readonly EligibleWeaponEffect[] = [
      {
        id: 5,
        effect_kind: 'weapon_damage_bonus',
        amount: 2,
        weapon_scope: 'one_bonded_weapon',
        character_weapon_id: LONGSWORD.id,
        label: 'Armadillo Blade',
      },
      {
        id: 6,
        effect_kind: 'weapon_attack_bonus',
        amount: 1,
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Training charm',
      },
      {
        id: 7,
        effect_kind: 'attack_ability_override',
        ability: 'charisma',
        weapon_scope: 'one_bonded_weapon',
        character_weapon_id: null,
        label: 'Unbound pact',
      },
    ];
    const result = build({ weapons: [LONGSWORD, dagger], effects });
    const [longsword, second] = result.weapons;
    const longswordStrength =
      longsword?.profiles[0]?.abilities.state === 'unavailable'
        ? undefined
        : longsword?.profiles[0]?.abilities.options[0];
    const daggerStrength =
      second?.profiles[0]?.abilities.state === 'unavailable'
        ? undefined
        : second?.profiles[0]?.abilities.options[0];

    expect(longswordStrength?.damage_modifier).toBe(2);
    expect(daggerStrength?.damage_modifier).toBe(0);
    // The any-weapon charm reaches BOTH weapons: modifier 0 + proficiency 3
    // + effect 1. The bonded damage effect above still reaches only Longsword.
    expect(longswordStrength?.attack_bonus).toBe(4);
    expect(daggerStrength?.attack_bonus).toBe(4);
    expect(
      result.weapons.flatMap((weapon) =>
        weapon.profiles.map((profile) => profile.label),
      ),
    ).not.toContain('Unbound pact');
    expect(result.warnings).toContainEqual({
      code: 'inert_weapon_effect',
      message:
        'Unbound pact is scoped to one bonded weapon but names no weapon, so it changes no attack profile.',
    });
  });

  it('adds weapon bonuses after withholding proficiency and labels both changes', () => {
    const effects: readonly EligibleWeaponEffect[] = [
      {
        id: 7,
        effect_kind: 'weapon_attack_bonus',
        amount: 1,
        weapon_scope: 'one_bonded_weapon',
        character_weapon_id: LONGSWORD.id,
        label: '+1 weapon',
      },
      {
        id: 8,
        effect_kind: 'weapon_damage_bonus',
        amount: 1,
        weapon_scope: 'one_bonded_weapon',
        character_weapon_id: LONGSWORD.id,
        label: '+1 weapon',
      },
    ];
    const profile = profileOf(
      build({
        weapons: [{
          ...LONGSWORD,
          proficiency: { kind: 'not_proficient' },
        }],
        scores: scores({ strength: 18 }),
        effects,
      }),
      'normal',
    );
    const strength =
      profile.abilities.state === 'unavailable'
        ? undefined
        : profile.abilities.options.find(
            (entry) => entry.ability === 'strength',
          );

    // Strength 18 is +4. Proficiency is withheld, then the weapon adds +1.
    expect(strength?.attack_bonus).toBe(5);
    expect(strength?.damage_modifier).toBe(5);
    expect(profile.preconditions.join(' ')).toContain(
      'The Proficiency Bonus is NOT included',
    );
    expect(profile.notes).toEqual([
      '+1 weapon: +1 to this profile’s attack bonus.',
      '+1 weapon: +1 to this profile’s damage.',
    ]);
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
      effects: [],
    };
    expect(attackProfiles(input)).toEqual(attackProfiles(input));
    const moved = attackProfiles({ ...input, scores: scores({ dexterity: 18 }) });
    // Dexterity 16 -> +3 gives 6; Dexterity 18 -> +4 gives 7.
    expect(bonusFor(profileOf(attackProfiles(input), 'martial_arts'), 'dexterity')).toBe(6);
    expect(bonusFor(profileOf(moved, 'martial_arts'), 'dexterity')).toBe(7);
  });
});

describe('attack-profile mutation contracts', () => {
  it('pins every proficiency verdict to its literal state and disclosure', () => {
    // Type-level contract: WeaponProficiencyVerdict is a closed union, and
    // ProfileProficiency must preserve the distinct assumption/disclosure for
    // every arm even where two arms make the same numeric decision.
    expect([
      profileProficiency({ kind: 'proficient', via: ['Fighter'] }),
      profileProficiency({ kind: 'not_proficient' }),
      profileProficiency({ kind: 'category_not_stated' }),
      profileProficiency({
        kind: 'qualifier_not_evaluated',
        via: ['Runeblade'],
        qualifiers: ['inscribed with a rune'],
      }),
    ]).toEqual([
      {
        state: 'included',
        reason:
          'The Proficiency Bonus is included: a class this character has grants this weapon’s category. One class is enough — proficiency is a union across a character’s classes, and the Proficiencies section of the character sheet names which.',
      },
      {
        state: 'withheld',
        reason:
          'The Proficiency Bonus is NOT included: no class this character has grants this weapon’s category. Carrying and using it is still allowed — nothing here refuses the weapon — and what is withheld is the bonus alone.',
      },
      {
        state: 'included',
        reason:
          'No simple/martial category is recorded for this weapon, so whether this character is proficient cannot be checked. The Proficiency Bonus is included, which is an ASSUMPTION and not a fact about this character: set the category on the weapon to find out.',
      },
      {
        state: 'withheld',
        reason:
          'A class of this character’s grants this weapon’s category only under a qualifier this application does not read, so the Proficiency Bonus is NOT included — the same assumption the Proficiencies section of the character sheet states. That section prints the qualifier verbatim; if the weapon does qualify, add the bonus at the table.',
      },
    ]);
  });

  it('pins the recorded and unknown weapon formula branches literally', () => {
    // SRD sheet-math.txt:71-74 prints Strength for melee and Dexterity for
    // ranged, each plus Proficiency Bonus unless a weapon property says
    // otherwise. The stored attack-kind contract selects only the first option.
    const abilityContract = (attackKind: 'melee' | 'ranged' | null) =>
      profileOf(
        build({
          weapons: [{ ...LONGSWORD, attack_kind: attackKind }],
          scores: scores({ strength: 14, dexterity: 16 }),
          proficiencyBonus: 3,
        }),
        'normal',
      ).abilities;

    expect(abilityContract('melee')).toEqual({
      state: 'recorded',
      reason:
        'This weapon records a melee attack, so Strength is shown first. The other ability remains available as a manual override because this application does not evaluate weapon-property rules.',
      options: [
        {
          ability: 'strength',
          attack_bonus: 5,
          damage_modifier: 2,
          reason: 'Melee attack bonus = Strength modifier + Proficiency Bonus.',
        },
        {
          ability: 'dexterity',
          attack_bonus: 6,
          damage_modifier: 3,
          reason: 'Ranged attack bonus = Dexterity modifier + Proficiency Bonus.',
        },
      ],
    });
    expect(abilityContract('ranged')).toEqual({
      state: 'recorded',
      reason:
        'This weapon records a ranged attack, so Dexterity is shown first. The other ability remains available as a manual override because this application does not evaluate weapon-property rules.',
      options: [
        {
          ability: 'dexterity',
          attack_bonus: 6,
          damage_modifier: 3,
          reason: 'Ranged attack bonus = Dexterity modifier + Proficiency Bonus.',
        },
        {
          ability: 'strength',
          attack_bonus: 5,
          damage_modifier: 2,
          reason: 'Melee attack bonus = Strength modifier + Proficiency Bonus.',
        },
      ],
    });
    expect(abilityContract(null)).toEqual({
      state: 'undecided',
      reason:
        'The printed formula is Strength for a melee attack and Dexterity for a ranged one, unless a weapon property says otherwise. This weapon does not record whether its attack is melee or ranged, and the property rules that would override the formula are not among this application’s sources, so both are shown.',
      options: [
        {
          ability: 'strength',
          attack_bonus: 5,
          damage_modifier: 2,
          reason: 'Melee attack bonus = Strength modifier + Proficiency Bonus.',
        },
        {
          ability: 'dexterity',
          attack_bonus: 6,
          damage_modifier: 3,
          reason: 'Ranged attack bonus = Dexterity modifier + Proficiency Bonus.',
        },
      ],
    });
  });

  it('pins withheld proficiency to the attack number and complete option reason', () => {
    // SRD sheet-math.txt:71-74 places Proficiency Bonus in the attack formula;
    // damage still receives only the ability modifier. Strength 14 is +2.
    const abilities = profileOf(
      build({
        weapons: [{
          ...LONGSWORD,
          attack_kind: 'melee',
          proficiency: { kind: 'not_proficient' },
        }],
        scores: scores({ strength: 14, dexterity: 16 }),
        proficiencyBonus: 3,
      }),
      'normal',
    ).abilities;

    expect(abilities.state === 'unavailable' ? null : abilities.options[0]).toEqual({
      ability: 'strength',
      attack_bonus: 2,
      damage_modifier: 2,
      reason:
        'The printed melee formula is Strength modifier + Proficiency Bonus; this row is the Strength modifier alone. The Proficiency Bonus is NOT included: no class this character has grants this weapon’s category. Carrying and using it is still allowed — nothing here refuses the weapon — and what is withheld is the bonus alone.',
    });
  });

  it('pins the complete True Strike profile at the level-11 boundary', () => {
    // SRD weapon-attack-cantrips.txt:16-29: one attack, spellcasting ability,
    // Radiant-or-weapon choice, and 2d6 extra Radiant damage at level 11.
    const profile = profileOf(
      build({
        classes: [fighter(11)],
        scores: scores({ intelligence: 18 }),
        proficiencyBonus: 4,
        cantrips: knows('true_strike', [
          { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
        ]),
      }),
      'true_strike',
    );

    expect(profile).toEqual({
      kind: 'true_strike',
      label: 'True Strike',
      abilities: {
        state: 'fixed',
        options: [{
          ability: 'intelligence',
          attack_bonus: 8,
          damage_modifier: 4,
          reason:
            'The attack uses your spellcasting ability for the attack and damage rolls instead of Strength or Dexterity (Arcane scholar).',
        }],
      },
      damage: {
        amount: { kind: 'dice', dice: '1d8' },
        versatile_note: 'Versatile: 1d10 when wielded with two hands.',
        damage_type: {
          state: 'choice',
          spell_type: 'Radiant',
          weapon_type: 'Slashing',
        },
        extra: [{
          dice: '2d6',
          damage_type: 'Radiant',
          note:
            'Cantrip Upgrade: extra Radiant damage at levels 5, 11 and 17, read against your total character level of 11.',
        }],
      },
      attacks_per_action: 1,
      unresolved_attacks: [],
      preconditions: [
        'Requires a weapon you have proficiency with that is worth 1+ CP. The Proficiency Bonus is included: a class this character has grants this weapon’s category. One class is enough — proficiency is a union across a character’s classes, and the Proficiencies section of the character sheet names which. This application records no coin value, so it cannot check the second half at all.',
      ],
      notes: [
        'Casting this takes your Action and gives one attack, where the Attack action would give 3.',
      ],
    });
  });

  it('pins the complete Shillelagh profile at the level-5 boundary', () => {
    // SRD weapon-attack-cantrips.txt:33-54: Bonus Action, one minute, the
    // spellcasting-ability-or-Strength choice, Force choice, and d10 at 5.
    const row = build({
      weapons: [],
      classes: [druid(5)],
      scores: scores({ strength: 14, wisdom: 16 }),
      proficiencyBonus: 3,
      cantrips: knows('shillelagh', [
        { source_name: 'Druid', spellcasting_ability: 'wisdom' },
      ]),
    }).weapons[0];

    expect(row).toEqual({
      weapon_id: null,
      weapon_name: 'Shillelagh (a Club or a Quarterstaff)',
      derived: true,
      profiles: [{
        kind: 'shillelagh',
        label: 'Shillelagh',
        abilities: {
          state: 'choice',
          reason:
            'You can use your spellcasting ability instead of Strength for the attack and damage rolls of melee attacks with that weapon.',
          options: [
            {
              ability: 'wisdom',
              attack_bonus: 6,
              damage_modifier: 3,
              reason:
                'You can use your spellcasting ability instead of Strength for the attack and damage rolls of melee attacks with that weapon (Druid).',
            },
            {
              ability: 'strength',
              attack_bonus: 5,
              damage_modifier: 2,
              reason:
                'Strength, which a melee weapon attack uses when the cantrip is not applied.',
            },
          ],
        },
        damage: {
          amount: { kind: 'dice', dice: '1d10' },
          versatile_note:
            "The weapon's own damage die is replaced. The die changes at levels 5, 11 and 17, read against your total character level of 5.",
          damage_type: {
            state: 'choice',
            spell_type: 'Force',
            weapon_type: null,
          },
          extra: [],
        },
        attacks_per_action: 1,
        unresolved_attacks: [],
        preconditions: [
          'Applies to a Club or a Quarterstaff you are holding, and to melee attacks with it. This row is derived: no weapon has been added to this character to produce it.',
          'This row is derived rather than owned, so there is no weapon record to check a proficiency category against and the Proficiency Bonus is included. The Proficiencies section of the character sheet checks the weapons this character actually holds.',
        ],
        notes: [
          'Cast as a Bonus Action and lasts 1 minute. It ends early if you cast it again or let go of the weapon; this application does not track that.',
        ],
      }],
    });
  });

  it('pins the complete Martial Arts profile and its two preconditions', () => {
    // SRD attack-class-features.txt:38-60: d8 at Monk 5, Dexterity instead of
    // Strength, Monk-weapon categories, and the armor/Shield precondition.
    const profile = profileOf(
      build({
        classes: [monk(5)],
        scores: scores({ strength: 12, dexterity: 16 }),
        proficiencyBonus: 3,
      }),
      'martial_arts',
    );

    expect(profile).toEqual({
      kind: 'martial_arts',
      label: 'Martial Arts (Monk)',
      abilities: {
        state: 'choice',
        reason:
          'You can use your Dexterity modifier instead of your Strength modifier for the attack and damage rolls of your Monk weapons.',
        options: [
          {
            ability: 'dexterity',
            attack_bonus: 6,
            damage_modifier: 3,
            reason: 'Dexterity, by Dexterous Attacks.',
          },
          {
            ability: 'strength',
            attack_bonus: 4,
            damage_modifier: 1,
            reason:
              'Strength, which a melee weapon attack uses without the feature.',
          },
        ],
      },
      damage: {
        amount: { kind: 'dice', dice: '1d8' },
        versatile_note:
          "You can roll this in place of the weapon's normal damage. It is the die for Monk level 5, not for your total character level.",
        damage_type: { state: 'weapon', damage_type: 'Slashing' },
        extra: [],
      },
      attacks_per_action: 2,
      unresolved_attacks: [],
      preconditions: [
        'Monk weapons are Simple Melee weapons and Martial Melee weapons that have the Light property. This application does not record which group a weapon belongs to, so it cannot tell whether this one qualifies.',
        'You must be unarmed or wielding only Monk weapons, and not wearing armor or wielding a Shield. This application does not record worn armor or a held Shield.',
        'The Proficiency Bonus is included: a class this character has grants this weapon’s category. One class is enough — proficiency is a union across a character’s classes, and the Proficiencies section of the character sheet names which.',
      ],
      notes: [],
    });
  });

  it('pins missing and ambiguous cantrip-source disclosures literally', () => {
    // SRD multiclassing.txt:38-43 associates a prepared spell with its class's
    // spellcasting ability. The type contract preserves null and disagreement.
    const missing = build({
      cantrips: knows('true_strike', [
        { source_name: 'Magic Initiate', spellcasting_ability: null },
      ]),
    });
    expect(profileOf(missing, 'true_strike').abilities).toEqual({
      state: 'unavailable',
      reason:
        'No source of True Strike on this character has a spellcasting ability this application can resolve (Magic Initiate), so it cannot say what the attack and damage rolls use.',
    });
    expect(missing.warnings).toEqual([{
      code: 'no_spellcasting_ability',
      message:
        'True Strike is known from Magic Initiate, which has no spellcasting ability recorded, so its attack and damage numbers cannot be derived.',
    }]);

    const ambiguous = build({
      scores: scores({ intelligence: 16, charisma: 14 }),
      cantrips: knows('true_strike', [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
        { source_name: 'Magic Initiate', spellcasting_ability: 'charisma' },
      ]),
    });
    expect(profileOf(ambiguous, 'true_strike').abilities).toEqual({
      state: 'undecided',
      reason:
        'True Strike reaches this character from more than one source, and those sources use different spellcasting abilities. Which one applies depends on the source the spell was taken from, so every one is shown.',
      options: [
        {
          ability: 'intelligence',
          attack_bonus: 6,
          damage_modifier: 3,
          reason:
            'The attack uses your spellcasting ability for the attack and damage rolls instead of Strength or Dexterity (Arcane scholar).',
        },
        {
          ability: 'charisma',
          attack_bonus: 5,
          damage_modifier: 2,
          reason:
            'The attack uses your spellcasting ability for the attack and damage rolls instead of Strength or Dexterity (Magic Initiate).',
        },
      ],
    });
    expect(ambiguous.warnings).toEqual([{
      code: 'ambiguous_spellcasting_ability',
      message:
        'True Strike is known from more than one source and those sources use different spellcasting abilities (Arcane scholar: intelligence; Magic Initiate: charisma). Every one is shown; this application does not pick.',
    }]);
  });

  it('pins negative weapon bonuses and the complete unresolved-attack warning', () => {
    // Type contract: signed effect notes retain a minus sign, while unresolved
    // grants remain disclosures and never raise the mechanically resolved count.
    const result = build({
      classes: [{
        class_name: 'Warlock',
        level: 5,
        extra_attack_grants: [{
          source: 'feature',
          source_name: 'Thirsting Blade',
          class_level: 5,
          attack_count: 2,
          weapon_scope: 'one_bonded_weapon',
          unresolved: ['The optional feature selection is not recorded.'],
        }],
      }],
      effects: [{
        id: 501,
        effect_kind: 'weapon_attack_bonus',
        amount: -2,
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Cursed edge',
      }],
    });

    expect(profileOf(result, 'normal').notes).toEqual([
      'Cursed edge: -2 to this profile’s attack bonus.',
    ]);
    expect(result.warnings).toEqual([{
      code: 'unresolved_extra_attack',
      message:
        'Thirsting Blade (Warlock 5) would give 2 attacks on the Attack action, where 1 is shown. The optional feature selection is not recorded. Thirsting Blade applies to one bonded weapon only. This application does not record which of a character’s weapons that is, so the attack count has not been applied to any of them. Features that grant Extra Attack do not stack: the number is the largest of them, never the sum.',
    }]);
  });

  it('pins empty and repeated null-ability source names', () => {
    // Type contract: a known source list may be empty or contain multiple
    // unresolved sources; neither shape is silently collapsed or reformatted.
    const empty = build({ cantrips: knows('true_strike', []) });
    expect(profileOf(empty, 'true_strike').abilities).toEqual({
      state: 'unavailable',
      reason:
        'No source of True Strike on this character has a spellcasting ability this application can resolve (no source), so it cannot say what the attack and damage rolls use.',
    });

    const unresolved = build({
      cantrips: knows('true_strike', [
        { source_name: 'First source', spellcasting_ability: null },
        { source_name: 'Second source', spellcasting_ability: null },
      ]),
    });
    expect(profileOf(unresolved, 'true_strike').abilities).toEqual({
      state: 'unavailable',
      reason:
        'No source of True Strike on this character has a spellcasting ability this application can resolve (First source, Second source), so it cannot say what the attack and damage rolls use.',
    });
    expect(unresolved.warnings).toEqual([{
      code: 'no_spellcasting_ability',
      message:
        'True Strike is known from First source, Second source, which has no spellcasting ability recorded, so its attack and damage numbers cannot be derived.',
    }]);
  });

  it('pins every sentence of an ambiguous Shillelagh choice', () => {
    // SRD weapon-attack-cantrips.txt:39-49 grants Strength as a real choice;
    // the source association contract separately preserves ability ambiguity.
    const abilities = profileOf(build({
      classes: [druid(5)],
      cantrips: knows('shillelagh', [
        { source_name: 'Druid', spellcasting_ability: 'wisdom' },
        { source_name: 'Magic Initiate', spellcasting_ability: 'charisma' },
      ]),
    }), 'shillelagh').abilities;

    expect(abilities.state === 'undecided' ? abilities.reason : null).toBe(
      'Shillelagh reaches this character from more than one source, and those sources use different spellcasting abilities. Which one applies depends on the source the spell was taken from, so every one is shown. Strength is on this list for a different reason than the rest: the cantrip says you CAN use your spellcasting ability INSTEAD OF Strength, so Strength stays available whichever source applies. That is the rules granting a choice, not this application failing to resolve one.',
    );
  });

  it('pins the complete attack-ability override profile', () => {
    // EligibleWeaponEffect's closed attack_ability_override arm adds one
    // labelled fixed profile while retaining its proficiency disclosure.
    const profile = profileOf(build({
      scores: scores({ charisma: 16 }),
      effects: [{
        id: 601,
        effect_kind: 'attack_ability_override',
        ability: 'charisma',
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Pact Shell Blade',
      }],
    }), 'attack_ability_override');

    expect(profile).toEqual({
      kind: 'attack_ability_override',
      label: 'Pact Shell Blade',
      abilities: {
        state: 'fixed',
        options: [{
          ability: 'charisma',
          attack_bonus: 6,
          damage_modifier: 3,
          reason:
            'Pact Shell Blade uses charisma for this weapon’s attack and damage rolls.',
        }],
      },
      damage: {
        amount: { kind: 'dice', dice: '1d8' },
        versatile_note: 'Versatile: 1d10 when wielded with two hands.',
        damage_type: { state: 'weapon', damage_type: 'Slashing' },
        extra: [],
      },
      attacks_per_action: 2,
      unresolved_attacks: [],
      preconditions: [
        'The Proficiency Bonus is included: a class this character has grants this weapon’s category. One class is enough — proficiency is a union across a character’s classes, and the Proficiencies section of the character sheet names which.',
      ],
      notes: [],
    });
  });

  it('formats zero as an explicitly signed weapon bonus', () => {
    // Type contract: non-negative adjustments use the `+n` presentation arm;
    // zero is the exact boundary between that arm and negative values.
    const profile = profileOf(build({
      effects: [{
        id: 602,
        effect_kind: 'weapon_damage_bonus',
        amount: 0,
        weapon_scope: 'any_weapon',
        character_weapon_id: null,
        label: 'Dormant edge',
      }],
    }), 'normal');
    expect(profile.notes).toEqual([
      'Dormant edge: +0 to this profile’s damage.',
    ]);
  });

  it('pins the complete unrecognised-cantrip warning', () => {
    // RecognisedAttackCantrips preserves the catalog mismatch as a structured
    // warning and derives no spell profile from it.
    const result = build({
      cantrips: {
        ...NO_CANTRIPS,
        unrecognised: [{
          cantrip: 'true_strike',
          content_key: 'srd52:true-strike',
          spell_name: 'True Strike',
          source_name: 'Arcane scholar',
          reason: 'its catalog identity is not recognised',
        }],
      },
    });
    expect(result.warnings).toEqual([{
      code: 'unrecognised_cantrip',
      message:
        'Arcane scholar carries a spell named "True Strike" that looks like True Strike, but its catalog identity is not recognised. No attack profile has been derived from it.',
    }]);
  });

  it('uses plural grammar when two resolved attacks are shown', () => {
    // SRD attack-class-features.txt:120-131 says Extra Attack features do not
    // stack. The warning compares an unresolved total of three to resolved two.
    const result = build({
      classes: [{
        class_name: 'Fighter',
        level: 11,
        extra_attack_grants: [
          classGrant('Fighter', 5, 2),
          {
            source: 'feature',
            source_name: 'Unresolved third attack',
            class_level: 11,
            attack_count: 3,
            weapon_scope: 'one_bonded_weapon',
            unresolved: [],
          },
        ],
      }],
    });
    expect(result.warnings).toEqual([{
      code: 'unresolved_extra_attack',
      message:
        'Unresolved third attack (Fighter 11) would give 3 attacks on the Attack action, where 2 are shown. Unresolved third attack applies to one bonded weapon only. This application does not record which of a character’s weapons that is, so the attack count has not been applied to any of them. Features that grant Extra Attack do not stack: the number is the largest of them, never the sum.',
    }]);
  });
});
