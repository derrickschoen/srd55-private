import type { SpeciesTraitEffectKind } from '../domain/enums';
import { isEnumValue, speciesTraitEffectKinds } from '../domain/enums';

/**
 * WHAT A SPECIES TRAIT'S MECHANICAL EFFECT ACTUALLY DOES.
 *
 * This is the CONSUMER half of the closed set. `speciesTraitEffectKinds`
 * declares the vocabulary and the schema's CHECK constraints make an incoherent
 * row unrepresentable; this module is the one place that turns a stored row
 * into a number or a name, and its switch is exhaustive — adding a member to
 * the enum stops this file compiling until the new kind is given a meaning.
 * That is the "deliberate code change" the design asked for, made mechanical.
 *
 * IT DERIVES, IT DOES NOT STORE (D11). Nothing here writes a row. A character's
 * Hit Point bonus, resisted damage types and walking Speed are computed from
 * the trait rows every time they are asked for, so editing a trait changes the
 * answer immediately and no cached copy can go stale.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not compute Hit Points, Armour
 * Class, skills or saving throws — another track owns those. `speciesHitPoints`
 * returns the species' CONTRIBUTION, as a number that track can add to whatever
 * it derives, and the split is what lets both tracks land without either
 * reaching into the other's files.
 *
 * FREE TEXT IS NOT AN EFFECT, AND THAT IS THE POINT. Twenty-six of the
 * thirty-three printed traits have `effect_kind IS NULL` and every function
 * here ignores them completely. The Elf's four-hour Trance, the Orc's Temporary
 * Hit Points and the Goliath's Large Form change nothing this module returns,
 * however mechanical they sound in English.
 */

/**
 * The subset of a trait row this module reads.
 *
 * Structural rather than a table type, because BOTH trait tables have these
 * columns with these names — that identity is what makes the D1b copy
 * column-wise — and a derivation that worked on only one of them would be a
 * derivation that could not be checked against the catalog it came from.
 */
export interface SpeciesTraitEffect {
  readonly effect_kind: string | null;
  readonly effect_damage_type: string | null;
  readonly effect_hit_points_flat: number | null;
  readonly effect_hit_points_per_level: number | null;
  readonly effect_speed_bonus_feet: number | null;
}

export interface SpeciesEffectSummary {
  /** Damage types the species resists, in the order the traits are stored. */
  readonly damageResistances: readonly string[];
  /**
   * How many resistance traits grant one whose TYPE the character chooses.
   *
   * Counted rather than collapsed into `damageResistances`, because the
   * Dragonborn genuinely resists something and a sheet that showed nothing
   * would be wrong in the other direction. The choice lives in the trait's own
   * text (the Draconic Ancestors table), which this module does not read.
   */
  readonly unchosenDamageResistances: number;
  /** Flat Hit Point maximum bonus, independent of level. */
  readonly hitPointsFlat: number;
  /** Hit Point maximum bonus granted again at every level. */
  readonly hitPointsPerLevel: number;
  /** Standing bonus to walking Speed, in feet. May be negative. */
  readonly speedBonusFeet: number;
  /** Traits whose spells come from the source instance's grant rules. */
  readonly grantedSpellTraits: readonly string[];
}

/** A trait row with its name, which the granted-spells summary reports. */
export interface NamedSpeciesTraitEffect extends SpeciesTraitEffect {
  readonly name: string;
}

/**
 * Reads a stored `effect_kind`, or `null`.
 *
 * A value outside the closed set returns `null` — the trait is treated as free
 * text. That is deliberate and it is why the schema CHECK exists: this function
 * cannot distinguish "no effect" from "an effect this build does not
 * understand", so the DATABASE refuses the second case rather than letting it
 * degrade quietly here.
 */
export function speciesTraitEffectKind(
  trait: SpeciesTraitEffect,
): SpeciesTraitEffectKind | null {
  return isEnumValue(speciesTraitEffectKinds, trait.effect_kind)
    ? trait.effect_kind
    : null;
}

export function summariseSpeciesEffects(
  traits: readonly NamedSpeciesTraitEffect[],
): SpeciesEffectSummary {
  const damageResistances: string[] = [];
  const grantedSpellTraits: string[] = [];
  let unchosenDamageResistances = 0;
  let hitPointsFlat = 0;
  let hitPointsPerLevel = 0;
  let speedBonusFeet = 0;

  for (const trait of traits) {
    const kind = speciesTraitEffectKind(trait);
    if (kind === null) {
      continue;
    }
    switch (kind) {
      case 'damage_resistance':
        if (trait.effect_damage_type === null) {
          unchosenDamageResistances += 1;
        } else {
          damageResistances.push(trait.effect_damage_type);
        }
        break;
      case 'hp_modifier':
        hitPointsFlat += trait.effect_hit_points_flat ?? 0;
        hitPointsPerLevel += trait.effect_hit_points_per_level ?? 0;
        break;
      case 'speed':
        speedBonusFeet += trait.effect_speed_bonus_feet ?? 0;
        break;
      // NO PAYLOAD BY DESIGN. The spells themselves are minted by
      // `src/grants/` from the species' `character_source_instances` row; this
      // records only which trait is the reason they exist, so a sheet can say
      // so without a second slot generator existing anywhere.
      case 'granted_spells':
        grantedSpellTraits.push(trait.name);
        break;
      /* c8 ignore next 4 -- unreachable while the switch is exhaustive; kept so
         a new enum member is a compile error here rather than a silent skip. */
      default: {
        const unreachable: never = kind;
        throw new Error(
          `Unhandled species trait effect kind ${String(unreachable)}.`,
        );
      }
    }
  }

  return {
    damageResistances,
    unchosenDamageResistances,
    hitPointsFlat,
    hitPointsPerLevel,
    speedBonusFeet,
    grantedSpellTraits,
  };
}

/**
 * The species' contribution to Hit Point maximum at a given total character
 * level.
 *
 * `flat + perLevel * level`. The formula is general; what it is NOT is a
 * licence to set both halves for a trait that only has one.
 *
 * Dwarven Toughness reads "Your Hit Point maximum increases by 1, and it
 * increases by 1 again whenever you gain a level". The opening clause IS the
 * level-1 grant and the second covers levels 2..N, so the total is the
 * character's LEVEL — 1 at level 1, 5 at level 5, 20 at level 20 — and the
 * trait is seeded `flat = 0, perLevel = 1`. An earlier draft seeded
 * `flat = 1, perLevel = 1`, which counted level 1 twice and gave a level-1
 * Dwarf +2 from a trait whose printed text says +1. The formula was never the
 * bug; the data was, and the fix is in `src/rules/origins-srd.ts`.
 *
 * The flat half stays in the model because a user's own trait may carry one.
 *
 * Level 0 is refused rather than treated as 1: there is no level-0 character,
 * and returning the flat bonus for one would invent an answer.
 */
export function speciesHitPoints(
  traits: readonly NamedSpeciesTraitEffect[],
  characterLevel: number,
): number {
  if (!Number.isSafeInteger(characterLevel) || characterLevel < 1) {
    throw new RangeError(
      `Species hit points need a character level of at least 1; got ${String(characterLevel)}.`,
    );
  }
  const summary = summariseSpeciesEffects(traits);
  return summary.hitPointsFlat + summary.hitPointsPerLevel * characterLevel;
}

/**
 * The character's walking Speed: their own base plus every standing bonus.
 *
 * `baseSpeedFeet` is `character_species.base_speed_feet`, which is nullable —
 * a half-entered species has no Speed and this returns `null` rather than
 * pretending the bonuses apply to a 30 nobody wrote down.
 *
 * Clamped at zero. A user's own trait may carry a penalty, and a negative Speed
 * is not a slower character; it is a number no sheet can print.
 */
export function speciesWalkingSpeedFeet(
  baseSpeedFeet: number | null,
  traits: readonly NamedSpeciesTraitEffect[],
): number | null {
  if (baseSpeedFeet === null) {
    return null;
  }
  const bonus = summariseSpeciesEffects(traits).speedBonusFeet;
  return Math.max(0, baseSpeedFeet + bonus);
}
