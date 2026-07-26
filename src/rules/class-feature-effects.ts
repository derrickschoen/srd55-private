import type {
  ClassFeatureEffectKind,
  ExtraAttackWeaponScope,
} from '../domain/enums';
import {
  classFeatureEffectKinds,
  extraAttackWeaponScopes,
  isEnumValue,
} from '../domain/enums';

/**
 * WHAT A CLASS FEATURE'S MECHANICAL EFFECT ACTUALLY DOES.
 *
 * The CONSUMER half of `classFeatureEffectKinds`, and the same arrangement
 * `src/rules/species-effects.ts` established for D12: the enum declares the
 * vocabulary, the schema's CHECK constraints make an incoherent row
 * unrepresentable, and this module is the ONE place a stored row becomes a
 * number. Its switch is exhaustive, so adding a member to the enum stops this
 * file compiling until the new kind is given a meaning.
 *
 * BOTH FEATURE TABLES ARE READ THROUGH ONE STRUCTURAL TYPE, for the reason
 * `SpeciesTraitEffect` gives: `subclass_features` and `named_features` carry the
 * same three effect columns under the same names, and a derivation that worked
 * on only one of them would be one that could not be checked against the other.
 *
 * FREE TEXT IS NOT AN EFFECT, AND THAT IS THE COMMON CASE. A feature with
 * `effect_kind IS NULL` is a printed paragraph and nothing else — the owner's
 * "most things are just a text box" — and every function here ignores it,
 * however mechanical the English sounds.
 *
 * AN UNRECOGNISED KIND READS AS NO EFFECT, WHICH IS WHY THE DATABASE REFUSES
 * ONE. This function cannot distinguish "no effect" from "an effect this build
 * does not understand", so `subclass_features_effect_kind_check` and
 * `named_features_effect_kind_check` refuse the second case at the storage
 * layer rather than letting it degrade quietly here.
 */

/** The three effect columns both feature tables carry, as stored. */
export interface ClassFeatureEffectColumns {
  readonly effect_kind: string | null;
  readonly effect_attack_count: number | null;
  readonly effect_weapon_scope: string | null;
}

/**
 * A feature's effect, resolved.
 *
 * A UNION WITH ONE MEMBER TODAY, WRITTEN AS A UNION ANYWAY. `extra_attack` is
 * the only kind, and a bare interface would read as "this is what an effect
 * is" rather than "this is what one KIND of effect is" — which is the reading
 * that produced D18's one-effect-per-trait defect on the species side. The
 * discriminant is the thing a second kind gets added beside.
 */
export type ClassFeatureEffect = {
  readonly kind: 'extra_attack';
  /** TOTAL attacks on the Attack action, absolute, never extra attacks. */
  readonly attack_count: number;
  readonly weapon_scope: ExtraAttackWeaponScope;
};

/** Reads a stored `effect_kind`, or `null` for free text. */
export function classFeatureEffectKind(
  feature: ClassFeatureEffectColumns,
): ClassFeatureEffectKind | null {
  return isEnumValue(classFeatureEffectKinds, feature.effect_kind)
    ? feature.effect_kind
    : null;
}

/**
 * The effect of one feature row, or `null` when it has none.
 *
 * A KIND WITH AN INCOMPLETE PAYLOAD RETURNS `null` RATHER THAN A DEFAULT, and
 * the choice is the whole reason this function is not three field reads at the
 * call site. `effect_attack_count ?? 2` would invent an entitlement, and
 * `effect_weapon_scope ?? 'any_weapon'` would WIDEN a one-weapon grant to every
 * weapon the character holds — the specific wrong answer D19 §3 describes. The
 * schema's `*_extra_attack_payload_check` already makes such a row
 * unrepresentable in a database this application created; this is what happens
 * to a hand-edited image that carries one anyway.
 */
export function classFeatureEffect(
  feature: ClassFeatureEffectColumns,
): ClassFeatureEffect | null {
  const kind = classFeatureEffectKind(feature);
  if (kind === null) {
    return null;
  }
  switch (kind) {
    case 'extra_attack': {
      const count = feature.effect_attack_count;
      const scope = feature.effect_weapon_scope;
      if (count === null || !isEnumValue(extraAttackWeaponScopes, scope)) {
        return null;
      }
      return { kind, attack_count: count, weapon_scope: scope };
    }
    /* c8 ignore next 4 -- unreachable while the switch is exhaustive; kept so
       a new enum member is a compile error here rather than a silent skip. */
    default: {
      const unreachable: never = kind;
      throw new Error(
        `Unhandled class feature effect kind ${String(unreachable)}.`,
      );
    }
  }
}
