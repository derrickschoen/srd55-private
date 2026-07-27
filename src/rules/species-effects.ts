import type { DamageType, EffectKind } from '../domain/enums';
import { effectKinds, isEnumValue } from '../domain/enums';

/**
 * WHAT A MECHANICAL EFFECT ACTUALLY DOES.
 *
 * This is the CONSUMER half of the closed set. `effectKinds` declares the
 * vocabulary and the schema's CHECK constraints make an incoherent row
 * unrepresentable; this module is the one place that turns a stored row into a
 * number or a name, and its switch is exhaustive — adding a member to the enum
 * stops this file compiling until the new kind is given a meaning. That is the
 * "deliberate code change" the design asked for, made mechanical.
 *
 * IT READS `character_effects`, NOT `character_species_traits`, AND THAT IS THE
 * INVERSION. An effect used to be five columns on a trait row, so this module
 * took a list of TRAITS and every function here was named after a species. It
 * now takes a list of EFFECTS, which changes three things that matter:
 *
 *  1. a trait granting two effects is two rows, not a column fight. The
 *     Tiefling's Fiendish Legacy grants a Resistance AND a cantrip; the
 *     resistance is now recorded, and the cantrip is not an effect at all (see
 *     `effectKinds`, and `src/access/spell-access-builder.ts`, which already
 *     answers "what cantrips, from where");
 *  2. an unchosen resistance is ADDRESSABLE. It used to be a COUNT, because a
 *     trait carrying an anonymous resistance had nothing to identify it with.
 *     An effect row carries a `label`, so the sheet can say WHICH grant is
 *     waiting on a decision;
 *  3. nothing here is species-specific any more. An effect from a feat or a
 *     subclass reaches these functions unchanged, because the row it comes
 *     from is the same shape.
 *
 * THE FILE NAME IS DELIBERATELY UNCHANGED. `species-effects.ts` no longer
 * describes what this module reads, and renaming it would be honest — but the
 * acceptance test for this whole change is pinned at
 * `tests/unit/rules/species-effects.test.ts`, and moving both files would turn
 * a reviewable behaviour diff into a rename nobody can read. The vocabulary
 * itself carries the correction: `effectKinds`, `EffectRow`, `summariseEffects`.
 *
 * IT DERIVES, IT DOES NOT STORE (D11). Nothing here writes a row. A character's
 * Hit Point bonus, resisted damage types and walking Speed are computed from
 * the effect rows every time they are asked for, so editing one changes the
 * answer immediately and no cached copy can go stale.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not compute Hit Points, Armour
 * Class, skills or saving throws — another track owns those. `effectHitPoints`
 * returns the CONTRIBUTION, as a number that track can add to whatever it
 * derives, and the split is what lets both tracks land without either reaching
 * into the other's files.
 *
 * FREE TEXT IS NOT AN EFFECT, AND THAT IS STILL THE POINT. Twenty-six of the
 * thirty-three printed traits produce no effect row at all and every function
 * here is blind to them. The Elf's four-hour Trance, the Orc's Temporary Hit
 * Points and the Goliath's Large Form change nothing this module returns,
 * however mechanical they sound in English. Under the old model that was a
 * `NULL` in `effect_kind`; it is now the absence of a row, which is the same
 * fact with one fewer null in it.
 */

/**
 * The subset of an effect row this module reads.
 *
 * Structural rather than a table type, because BOTH effect tables have these
 * columns with these names — that identity is what makes the catalog-to-
 * character copy column-wise — and a derivation that worked on only one of them
 * would be a derivation that could not be checked against the catalog it came
 * from. `label` is the exception: it exists only on the character's row, and a
 * template effect borrows its trait's name when the copy is made.
 */
export interface EffectRow {
  readonly effect_kind: string;
  readonly damage_type: DamageType | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  /** What granted this, for a reader. See `character_effects.label`. */
  readonly label: string;
}

export interface EffectSummary {
  /** Damage types the character resists, in the order the effects are stored. */
  readonly damageResistances: readonly DamageType[];
  /**
   * The LABELS of resistances whose type the character has yet to choose.
   *
   * A LIST OF NAMES AND NOT A COUNT, AND THE CHANGE IS THE WHOLE POINT OF THE
   * INVERSION. The old model could only count these: the resistance lived on a
   * trait row whose `name` column meant the trait, not the effect, and two
   * traits each granting one unnamed resistance were indistinguishable. An
   * effect row carries its own `label`, so a sheet can now say "the resistance
   * from Fiendish Legacy" — which is what makes an unchosen resistance a
   * COMPLETENESS ITEM the user can act on rather than a number they cannot.
   *
   * Kept separate from `damageResistances` rather than folded in, for the
   * reason the old count existed: a Dragonborn genuinely resists SOMETHING, and
   * a sheet showing nothing would be wrong in the other direction.
   */
  readonly unchosenDamageResistances: readonly string[];
  /** Flat Hit Point maximum bonus, independent of level. */
  readonly hitPointsFlat: number;
  /** Hit Point maximum bonus granted again at every level. */
  readonly hitPointsPerLevel: number;
  /** Standing bonus to walking Speed, in feet. May be negative. */
  readonly speedBonusFeet: number;
}

/**
 * Reads a stored `effect_kind`, or `null`.
 *
 * A value outside the closed set returns `null` — the row is ignored. That is
 * deliberate and it is why the schema CHECK exists: this function cannot
 * distinguish "no effect" from "an effect this build does not understand", so
 * the DATABASE refuses the second case rather than letting it degrade quietly
 * here. One value reaches this in practice: `granted_spells`, retired from the
 * vocabulary and dropped by `src/rules/legacy-trait-effects.ts` before it can
 * ever be stored.
 */
export function effectKind(effect: EffectRow): EffectKind | null {
  return isEnumValue(effectKinds, effect.effect_kind)
    ? effect.effect_kind
    : null;
}

export function summariseEffects(
  effects: readonly EffectRow[],
): EffectSummary {
  const damageResistances: DamageType[] = [];
  const unchosenDamageResistances: string[] = [];
  let hitPointsFlat = 0;
  let hitPointsPerLevel = 0;
  let speedBonusFeet = 0;

  for (const effect of effects) {
    const kind = effectKind(effect);
    if (kind === null) {
      continue;
    }
    switch (kind) {
      case 'damage_resistance':
        if (effect.damage_type === null) {
          unchosenDamageResistances.push(effect.label);
        } else {
          damageResistances.push(effect.damage_type);
        }
        break;
      case 'hp_modifier':
        hitPointsFlat += effect.hit_points_flat ?? 0;
        hitPointsPerLevel += effect.hit_points_per_level ?? 0;
        break;
      case 'speed':
        speedBonusFeet += effect.speed_bonus_feet ?? 0;
        break;
      /* c8 ignore next 4 -- unreachable while the switch is exhaustive; kept so
         a new enum member is a compile error here rather than a silent skip. */
      default: {
        const unreachable: never = kind;
        throw new Error(`Unhandled effect kind ${String(unreachable)}.`);
      }
    }
  }

  return {
    damageResistances,
    unchosenDamageResistances,
    hitPointsFlat,
    hitPointsPerLevel,
    speedBonusFeet,
  };
}

/**
 * The effects' contribution to Hit Point maximum at a given total character
 * level.
 *
 * `flat + perLevel * level`. The formula is general; what it is NOT is a
 * licence to set both halves for an effect that only has one.
 *
 * Dwarven Toughness reads "Your Hit Point maximum increases by 1, and it
 * increases by 1 again whenever you gain a level". The opening clause IS the
 * level-1 grant and the second covers levels 2..N, so the total is the
 * character's LEVEL — 1 at level 1, 5 at level 5, 20 at level 20 — and the
 * effect is seeded `flat = 0, perLevel = 1`. An earlier draft seeded
 * `flat = 1, perLevel = 1`, which counted level 1 twice and gave a level-1
 * Dwarf +2 from a trait whose printed text says +1. The formula was never the
 * bug; the data was, and the fix is in `src/rules/origins-srd.ts`.
 *
 * The flat half stays in the model because a user's own effect may carry one.
 *
 * Level 0 is refused rather than treated as 1: there is no level-0 character,
 * and returning the flat bonus for one would invent an answer.
 */
export function effectHitPoints(
  effects: readonly EffectRow[],
  characterLevel: number,
): number {
  if (!Number.isSafeInteger(characterLevel) || characterLevel < 1) {
    throw new RangeError(
      `Effect hit points need a character level of at least 1; got ${String(characterLevel)}.`,
    );
  }
  const summary = summariseEffects(effects);
  return summary.hitPointsFlat + summary.hitPointsPerLevel * characterLevel;
}

/**
 * The character's walking Speed: their own base plus every standing bonus.
 *
 * `baseSpeedFeet` is `character_species.base_speed_feet`, which is nullable —
 * a half-entered species has no Speed and this returns `null` rather than
 * pretending the bonuses apply to a 30 nobody wrote down.
 *
 * Clamped at zero. A user's own effect may carry a penalty, and a negative
 * Speed is not a slower character; it is a number no sheet can print.
 */
export function walkingSpeedFeet(
  baseSpeedFeet: number | null,
  effects: readonly EffectRow[],
): number | null {
  if (baseSpeedFeet === null) {
    return null;
  }
  const bonus = summariseEffects(effects).speedBonusFeet;
  return Math.max(0, baseSpeedFeet + bonus);
}
