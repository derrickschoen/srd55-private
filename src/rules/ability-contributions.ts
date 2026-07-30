/**
 * THE ONE RESOLVER FOR BASE-PLUS-CONTRIBUTIONS ABILITY SCORES (D63, B2).
 *
 * Base is what the player allocated; a contribution is a `character_effects`
 * row of kind `ability_increase`. Every production reader of the six raw
 * ability columns goes through this module before constructing an
 * `AbilityScores` — the sheet builder, the build report, spell access, and the
 * workspace (which derives from the report). Plan §6 names the trap this
 * arrangement exists to avoid: resolve in one pipeline and not the other three
 * and the sheet shows Strength 17 while HP still uses base Constitution and
 * every spell save DC still uses base scores, with every persistence test
 * green.
 *
 * Transport readers — CRUD, backup, share, snapshot — deliberately do NOT go
 * through it: they carry base plus contribution rows, never totals, so a round
 * trip cannot bake a contribution into a base.
 *
 * THE ARITHMETIC IS PINNED BY THE PLAN (§3.3) AND THE SEAM, NOT CHOSEN HERE.
 *
 * Contributions apply in `id` order — ACQUISITION order.
 * `character_effects.id` is `primaryKey({ autoIncrement: true })`, monotonic in
 * insertion order, and no user can change it. Revision 3 of the plan ordered
 * by `(sort_order, id)`, and `sort_order` is the user's own editable DISPLAY
 * order: a cosmetic drag would have changed an ability score. Do not "fix"
 * this back.
 *
 * A running total starts at base. Each positive contribution adds
 * `max(0, min(running + amount, maximum) − running)` — it applies PARTIALLY
 * when it would cross its own cap and ZERO when the running total already
 * meets it. Negative contributions floor the running total at
 * `ABILITY_SCORE_MIN`, because `AbilityScore` throws below 1 and a throw is
 * not a number a person can read.
 *
 * The pinned fixture, in both orders: base 19, `+2/max20` acquired first then
 * `+1/max30` → 21; acquired the other way → 20. THE TWO NUMBERS DIFFER ON
 * PURPOSE. The residual dependence is on acquisition order, which is a real
 * fact about the character, not a display preference — do not "repair" the
 * rule to make them agree.
 */
import {
  ABILITY_SCORE_MIN,
  type AbilityIncreaseContribution,
  type AbilityOverrideCandidate,
  type ResolvedAbilities,
  type ResolvedAbility,
} from '../builder/contracts';
import type { DatabaseContext } from '../db/database';
import { abilities, type Ability } from '../domain/enums';
import { readEligibleCharacterEffects } from './eligible-character-effects';
import type { EligibleCharacterEffect } from './eligible-character-effects';

/**
 * Resolves the six abilities from base scores and contributions.
 *
 * `contributions` must arrive in acquisition (`id`) order —
 * `readAbilityContributions` is the loader that guarantees it, and a caller
 * assembling its own list carries that burden itself. The resolver keeps the
 * order it is given rather than sorting, because the rows carry no id here and
 * inventing a secondary order would quietly replace the pinned one.
 *
 * Returns `{ base, contributions, total }` per ability, all three addressable,
 * because different surfaces need different values: editor inputs and the
 * guided step read base, everything that computes with a score reads total,
 * and a sheet explaining a number needs the rows in between.
 */
export function resolveAbilities(
  base: Readonly<Record<Ability, number>>,
  contributions: readonly AbilityIncreaseContribution[],
  overrides: readonly AbilityOverrideCandidate[] = [],
): ResolvedAbilities {
  const resolved = {} as Record<Ability, ResolvedAbility>;
  for (const ability of abilities) {
    const own = contributions.filter(
      (contribution) => contribution.ability === ability,
    );
    let running = base[ability];
    for (const contribution of own) {
      if (contribution.amount > 0) {
        running += Math.max(
          0,
          Math.min(running + contribution.amount, contribution.maximum) -
            running,
        );
      } else {
        running = Math.max(
          ABILITY_SCORE_MIN,
          running + contribution.amount,
        );
      }
    }
    const ownOverrides = overrides.filter(
      (override) => override.ability === ability,
    );
    const winner = ownOverrides.reduce<AbilityOverrideCandidate | null>(
      (highest, override) =>
        highest === null || override.set_to > highest.set_to
          ? override
          : highest,
      null,
    );
    const increased = running;
    const resolvedOverrides = ownOverrides.map((override) => ({
      ...override,
      outcome:
        override.set_to <= increased
          ? ('floored_by_increased_score' as const)
          : override.effect_id === winner?.effect_id
            ? ('applied' as const)
            : override.set_to === winner?.set_to
              ? ('tied_at_winning_value' as const)
              : ('superseded_by_higher_override' as const),
    }));
    if (winner !== null) {
      // D83's order is exact: base -> individually capped increases -> highest
      // SET target, floored at the increased score. SET effects never add.
      running = Math.max(increased, winner.set_to);
    }
    resolved[ability] = {
      base: base[ability],
      contributions: own,
      increased,
      overrides: resolvedOverrides,
      total: running,
    };
  }
  return resolved;
}

/**
 * The character's `ability_increase` rows, in acquisition order.
 *
 * `ORDER BY id` ALONE — see the module comment for why `sort_order` must not
 * appear here. The kind's CHECKs make every selected column non-null for this
 * kind, so the codec reads them as required.
 */
function abilityContributionsFrom(
  effects: readonly EligibleCharacterEffect[],
): AbilityIncreaseContribution[] {
  return effects
    .filter((effect) => effect.effect_kind === 'ability_increase')
    .map((effect): AbilityIncreaseContribution => {
      if (
        effect.ability === null ||
        effect.amount === null ||
        effect.maximum === null ||
        effect.source_instance_id === null
      ) {
        // Unreachable behind the kind-scoped character_effects CHECKs. Throwing
        // keeps a malformed contribution from silently changing no score.
        throw new Error(
          `Ability increase effect ${String(effect.id)} has an incomplete payload.`,
        );
      }
      return {
        ability: effect.ability,
        amount: effect.amount,
        maximum: effect.maximum,
        source_instance_id: effect.source_instance_id,
      };
    });
}

export function readAbilityContributions(
  db: DatabaseContext,
  characterId: number,
): AbilityIncreaseContribution[] {
  return abilityContributionsFrom(
    readEligibleCharacterEffects(db, characterId, 'acquisition'),
  );
}

function abilityOverridesFrom(
  effects: readonly EligibleCharacterEffect[],
): AbilityOverrideCandidate[] {
  return effects
    .filter((effect) => effect.effect_kind === 'ability_override')
    .map((effect): AbilityOverrideCandidate => {
      if (effect.ability === null || effect.maximum === null) {
        throw new Error(
          `Ability override effect ${String(effect.id)} has an incomplete payload.`,
        );
      }
      return {
        effect_id: effect.id,
        ability: effect.ability,
        set_to: effect.maximum,
        label: effect.label,
        source_instance_id: effect.source_instance_id,
        character_item_id: effect.character_item_id,
      };
    });
}

export function readAbilityOverrides(
  db: DatabaseContext,
  characterId: number,
): AbilityOverrideCandidate[] {
  return abilityOverridesFrom(
    readEligibleCharacterEffects(db, characterId, 'acquisition'),
  );
}

/** One call for the common reader shape: load, resolve, and keep all three. */
export function resolveCharacterAbilities(
  db: DatabaseContext,
  characterId: number,
  base: Readonly<Record<Ability, number>>,
): ResolvedAbilities {
  const effects = readEligibleCharacterEffects(
    db,
    characterId,
    'acquisition',
  );
  return resolveAbilities(
    base,
    abilityContributionsFrom(effects),
    abilityOverridesFrom(effects),
  );
}

/** The totals alone, shaped for `AbilityScores.fromArray` and the read model. */
export function resolvedTotals(
  resolved: ResolvedAbilities,
): Record<Ability, number> {
  return Object.fromEntries(
    abilities.map((ability) => [ability, resolved[ability].total]),
  ) as Record<Ability, number>;
}
