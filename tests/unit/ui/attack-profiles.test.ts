import { describe, expect, it } from 'vitest';
import { AbilityScores } from '../../../src/rules/ability-scores';
import {
  attackProfiles,
  type AttackProfile,
  type AttackProfileResult,
} from '../../../src/rules/attack-profiles';
import type { RecognisedAttackCantrips } from '../../../src/rules/attack-cantrips';
import type { SheetClassLevels } from '../../../src/rules/sheet';
import {
  attacksStatement,
  damageLabel,
  damageTypeChoice,
  signed,
  toHitLabel,
} from '../../../src/ui/screens/planner/attack-profiles';

/**
 * THE SENTENCES THE PANEL PRINTS.
 *
 * The vitest suite runs in the `node` environment, so the DOM half of this
 * module — the two `<select>` controls, their accessible names and the live
 * recomputation — is covered where a real DOM exists, in
 * `tests/browser/weapons.spec.ts`. What is checked here is every string a
 * number turns into, because that is where an off-by-a-proficiency-bonus hides.
 *
 * The results fed in come from the real derivation rather than hand-built
 * objects; the NUMBERS asserted are still hand-computed literals, independently
 * of `tests/unit/rules/attack-profiles.test.ts`.
 */

const NO_CANTRIPS: RecognisedAttackCantrips = {
  true_strike: { state: 'not_known' },
  shillelagh: { state: 'not_known' },
  unrecognised: [],
};

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

function result(
  overrides: {
    classes?: readonly SheetClassLevels[];
    cantrips?: RecognisedAttackCantrips;
    scoreValues?: Partial<Record<string, number>>;
    proficiencyBonus?: number;
  } = {},
): AttackProfileResult {
  return attackProfiles({
    weapons: [
      {
        id: 1,
        name: 'Longsword',
        damage_dice: '1d8',
        damage_type: 'Slashing',
        versatile_damage_dice: '1d10',
      },
    ],
    classes: overrides.classes ?? [
      { class_name: 'Fighter', level: 5, extra_attack_counts: new Map([[5, 2]]) },
    ],
    scores: scores(overrides.scoreValues ?? { strength: 18, dexterity: 14 }),
    proficiencyBonus: overrides.proficiencyBonus ?? 3,
    cantrips: overrides.cantrips ?? NO_CANTRIPS,
  });
}

function firstProfile(value: AttackProfileResult): AttackProfile {
  const profile = value.weapons[0]?.profiles[0];
  if (profile === undefined) {
    throw new Error('No profile was derived.');
  }
  return profile;
}

function optionOf(
  profile: AttackProfile,
  ability: string,
): Parameters<typeof toHitLabel>[1] {
  if (profile.abilities.state === 'unavailable') {
    return null;
  }
  return (
    profile.abilities.options.find((entry) => entry.ability === ability) ?? null
  );
}

describe('signing a bonus', () => {
  it('always carries a sign, so a bare number cannot read as a total', () => {
    expect(signed(7)).toBe('+7');
    expect(signed(0)).toBe('+0');
    expect(signed(-1)).toBe('-1');
  });
});

describe('the attack-count sentence', () => {
  it('follows D15’s predicate exactly', () => {
    expect(attacksStatement(result())).toBe(
      'The Attack action gives 2 attacks.',
    );
    expect(
      attacksStatement(
        result({ classes: [{ class_name: 'Fighter', level: 4 }] }),
      ),
    ).toBe('The Attack action gives one attack.');
    expect(
      attacksStatement(
        result({
          classes: [
            {
              class_name: 'Fighter',
              level: 11,
              extra_attack_counts: new Map([
                [5, 2],
                [11, 3],
              ]),
            },
          ],
        }),
      ),
    ).toBe('The Attack action gives 3 attacks.');
  });
});

describe('the to-hit line', () => {
  it('prints the hand-computed number and names the ability', () => {
    // Strength 18 -> +4, plus the level 5 proficiency bonus of +3, is +7.
    const profile = firstProfile(result());
    expect(toHitLabel(profile, optionOf(profile, 'strength'))).toBe(
      'To hit: +7 (Strength)',
    );
    // Dexterity 14 -> +2, plus +3, is +5.
    expect(toHitLabel(profile, optionOf(profile, 'dexterity'))).toBe(
      'To hit: +5 (Dexterity)',
    );
  });

  it('prints WORDS, never a zero, when there is no number to print', () => {
    // A zero here would be indistinguishable from a genuine +0, which a
    // Strength 6 character with a +2 proficiency bonus really has.
    const profile = firstProfile(result());
    expect(toHitLabel(profile, null)).toBe('To hit: not available');
    expect(toHitLabel(profile, null)).not.toContain('+0');
  });

  it('prints a genuine +0 as +0', () => {
    // Strength 6 -> -2, plus a +2 proficiency bonus, is exactly 0.
    const profile = firstProfile(
      result({
        classes: [{ class_name: 'Fighter', level: 1 }],
        scoreValues: { strength: 6 },
        proficiencyBonus: 2,
      }),
    );
    expect(toHitLabel(profile, optionOf(profile, 'strength'))).toBe(
      'To hit: +0 (Strength)',
    );
  });
});

describe('the damage line', () => {
  it('adds the ability MODIFIER and not the proficiency bonus', () => {
    // The character attacks at +7 and adds +4 to damage. Printing +7 on both
    // lines is the mistake this assertion exists to catch.
    const profile = firstProfile(result());
    expect(damageLabel(profile, optionOf(profile, 'strength'), null)).toBe(
      'Damage: 1d8 +4 Slashing',
    );
  });

  it('leaves a zero modifier off entirely', () => {
    const profile = firstProfile(result({ scoreValues: {} }));
    expect(damageLabel(profile, optionOf(profile, 'strength'), null)).toBe(
      'Damage: 1d8 Slashing',
    );
  });

  it('says an unrecorded damage type is unrecorded', () => {
    const value = attackProfiles({
      weapons: [
        {
          id: 2,
          name: 'Grandfather’s sword',
          damage_dice: null,
          damage_type: null,
          versatile_damage_dice: null,
        },
      ],
      classes: [{ class_name: 'Fighter', level: 5 }],
      scores: scores({ strength: 18 }),
      proficiencyBonus: 3,
      cantrips: NO_CANTRIPS,
    });
    const profile = firstProfile(value);
    expect(damageLabel(profile, optionOf(profile, 'strength'), null)).toBe(
      'Damage: damage dice not recorded +4 damage type not recorded',
    );
  });

  it('appends True Strike’s extra Radiant damage with no modifier on it', () => {
    // A level 11 character: 2d6 extra Radiant. The +4 belongs to the weapon
    // damage only, and the extra dice carry none.
    const value = result({
      classes: [{ class_name: 'Arcane scholar', level: 11 }],
      scoreValues: { strength: 18, intelligence: 18 },
      proficiencyBonus: 4,
      cantrips: {
        ...NO_CANTRIPS,
        true_strike: {
          state: 'known',
          sources: [
            {
              source_name: 'Arcane scholar',
              spellcasting_ability: 'intelligence',
            },
          ],
        },
      },
    });
    const trueStrike = value.weapons[0]?.profiles.find(
      (profile) => profile.kind === 'true_strike',
    );
    expect(trueStrike).toBeDefined();
    // Intelligence 18 -> +4; the level 11 proficiency bonus is +4; 4 + 4 = 8.
    expect(toHitLabel(trueStrike!, optionOf(trueStrike!, 'intelligence'))).toBe(
      'To hit: +8 (Intelligence)',
    );
    expect(
      damageLabel(trueStrike!, optionOf(trueStrike!, 'intelligence'), null),
    ).toBe('Damage: 1d8 +4 Radiant or Slashing, plus 2d6 Radiant');
  });

  /**
   * THE DAMAGE-TYPE CHOICE, AT A LEVEL WITH NO EXTRA DICE ON THE ROW.
   *
   * Level 4 is chosen deliberately. At level 5 the extra Radiant clause puts
   * the word "Radiant" in the string unconditionally and `weapon_type` puts
   * "Slashing" there too, so BOTH sides of the choice appear whatever the third
   * argument does — which is how the previous version of this test passed with
   * `chosen` deleted from the implementation entirely. Below level 5 there is
   * no extra clause, so each expectation names one type and denies the other.
   */
  it('prints the chosen side of a damage-type choice, and neither by default', () => {
    const value = result({
      classes: [{ class_name: 'Arcane scholar', level: 4 }],
      scoreValues: { strength: 18, intelligence: 18 },
      cantrips: {
        ...NO_CANTRIPS,
        true_strike: {
          state: 'known',
          sources: [
            {
              source_name: 'Arcane scholar',
              spellcasting_ability: 'intelligence',
            },
          ],
        },
      },
    });
    const trueStrike = value.weapons[0]?.profiles.find(
      (profile) => profile.kind === 'true_strike',
    );
    expect(trueStrike?.damage.extra).toEqual([]);
    const option = optionOf(trueStrike!, 'intelligence');

    // Neither side, until the player picks one. This is the assertion that
    // fails if the renderer resolves the choice to the weapon's own type — the
    // defect that shipped, where the number line silently read "Slashing".
    expect(damageLabel(trueStrike!, option, null)).toBe(
      'Damage: 1d8 +4 Radiant or Slashing',
    );

    expect(damageLabel(trueStrike!, option, 'Radiant')).toBe(
      'Damage: 1d8 +4 Radiant',
    );
    expect(damageLabel(trueStrike!, option, 'Radiant')).not.toContain(
      'Slashing',
    );
    expect(damageLabel(trueStrike!, option, 'Slashing')).toBe(
      'Damage: 1d8 +4 Slashing',
    );
    expect(damageLabel(trueStrike!, option, 'Slashing')).not.toContain(
      'Radiant',
    );
  });

  /**
   * THE CONTROL AND THE NUMBER LINE COME OUT OF ONE FUNCTION.
   *
   * They were built separately and drifted: an untouched `<select>` selects its
   * first option, which was `Radiant`, while the line beside it printed the
   * weapon's `Slashing`. Asserting the FIRST option is the undecided one and
   * that its sentence is character-for-character the sentence the line prints
   * is what closes that gap — a second list built by hand would fail here.
   */
  it('offers the undecided state first, wording it exactly as the number line does', () => {
    const value = result({
      classes: [{ class_name: 'Arcane scholar', level: 4 }],
      scoreValues: { strength: 18, intelligence: 18 },
      cantrips: {
        ...NO_CANTRIPS,
        true_strike: {
          state: 'known',
          sources: [
            {
              source_name: 'Arcane scholar',
              spellcasting_ability: 'intelligence',
            },
          ],
        },
      },
    });
    const trueStrike = value.weapons[0]?.profiles.find(
      (profile) => profile.kind === 'true_strike',
    );
    const damageType = trueStrike!.damage.damage_type;
    if (damageType.state !== 'choice') {
      throw new Error(
        `True Strike stopped offering a damage-type choice: ${damageType.state}.`,
      );
    }
    const choice = damageTypeChoice(damageType);
    expect(choice.undecided).toBe('Radiant or Slashing');
    expect(choice.options).toEqual([
      { value: '', label: 'Not chosen: Radiant or Slashing' },
      { value: 'Radiant', label: 'Radiant' },
      { value: 'Slashing', label: 'Slashing' },
    ]);
    // The line the panel shows before the control is touched IS the control's
    // own first entry. If either side is edited alone, this stops holding.
    expect(
      damageLabel(trueStrike!, optionOf(trueStrike!, 'intelligence'), null),
    ).toContain(choice.undecided);

    // Every offered value round-trips: picking one prints that one and nothing
    // else, so no option in the list is decorative.
    for (const entry of choice.options.slice(1)) {
      expect(
        damageLabel(
          trueStrike!,
          optionOf(trueStrike!, 'intelligence'),
          entry.value,
        ),
      ).toBe(`Damage: 1d8 +4 ${entry.label}`);
    }
  });

  it('leaves the weapon side of Shillelagh’s choice open', () => {
    // The derived row is tied to no owned weapon, so "the weapon's normal
    // damage type" is not something this application may name.
    const value = result({
      classes: [{ class_name: 'Druid', level: 5 }],
      scoreValues: { wisdom: 16 },
      cantrips: {
        ...NO_CANTRIPS,
        shillelagh: {
          state: 'known',
          sources: [{ source_name: 'Druid', spellcasting_ability: 'wisdom' }],
        },
      },
    });
    const derived = value.weapons.find((weapon) => weapon.derived);
    const profile = derived?.profiles[0];
    expect(profile?.kind).toBe('shillelagh');
    // Wisdom 16 -> +3, plus +3 proficiency = +6, and +3 to damage on a d10 at
    // total level 5.
    expect(toHitLabel(profile!, optionOf(profile!, 'wisdom'))).toBe(
      'To hit: +6 (Wisdom)',
    );
    expect(damageLabel(profile!, optionOf(profile!, 'wisdom'), null)).toBe(
      'Damage: 1d10 +3 Force or the weapon’s normal damage type',
    );

    // The `weapon_type: null` branch of the control, which True Strike on an
    // owned weapon never reaches. The weapon side is still an OFFERED option —
    // the player knows what they picked up even though this application does
    // not — it just cannot be named.
    const damageType = profile!.damage.damage_type;
    if (damageType.state !== 'choice') {
      throw new Error(
        `Shillelagh stopped offering a damage-type choice: ${damageType.state}.`,
      );
    }
    expect(damageTypeChoice(damageType).options).toEqual([
      {
        value: '',
        label: 'Not chosen: Force or the weapon’s normal damage type',
      },
      { value: 'Force', label: 'Force' },
      {
        value: 'the weapon’s normal damage type',
        label: 'the weapon’s normal damage type',
      },
    ]);
  });
});

describe('the strings carry no wordmark the licence asks to be left off', () => {
  it('holds for every sentence a fully loaded character produces', () => {
    const value = result({
      classes: [
        {
          class_name: 'Monk',
          level: 5,
          extra_attack_counts: new Map([[5, 2]]),
          martial_arts_dice: new Map([
            [1, 6],
            [5, 8],
          ]),
        },
      ],
      cantrips: {
        true_strike: {
          state: 'known',
          sources: [
            { source_name: 'Magic Initiate', spellcasting_ability: 'charisma' },
          ],
        },
        shillelagh: {
          state: 'known',
          sources: [
            { source_name: 'Magic Initiate', spellcasting_ability: 'charisma' },
          ],
        },
        unrecognised: [
          {
            cantrip: 'true_strike',
            content_key: 'srd52:true-strike',
            spell_name: 'True Strike',
            source_name: 'Magic Initiate',
            reason: 'its content key is unfamiliar',
          },
        ],
      },
    });
    const text = [
      attacksStatement(value),
      ...value.warnings.map((warning) => warning.message),
      ...value.weapons.flatMap((weapon) => [
        weapon.weapon_name,
        ...weapon.profiles.flatMap((profile) => [
          profile.label,
          toHitLabel(profile, optionOf(profile, 'strength')),
          damageLabel(profile, optionOf(profile, 'strength'), null),
          profile.damage.dice_note ?? '',
          ...profile.preconditions,
          ...profile.notes,
        ]),
      ]),
    ].join(' ');
    expect(text).not.toMatch(/D&D|Dungeons|Wizards/);
  });
});
