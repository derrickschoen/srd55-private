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
  type ResolvedAbilities,
  type ResolvedAbility,
} from '../builder/contracts';
import { sqlInteger, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { abilities, isEnumValue, type Ability } from '../domain/enums';

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
    resolved[ability] = {
      base: base[ability],
      contributions: own,
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
export function readAbilityContributions(
  db: DatabaseContext,
  characterId: number,
): AbilityIncreaseContribution[] {
  return db.all(
    `SELECT ability, amount, maximum, source_instance_id
     FROM character_effects
     WHERE character_id = ? AND effect_kind = 'ability_increase'
     ORDER BY id`,
    [characterId],
    (row): AbilityIncreaseContribution => {
      const ability = sqlString(row, 'ability');
      if (!isEnumValue(abilities, ability)) {
        // Unreachable behind the schema's `character_effects_ability_check`;
        // thrown rather than skipped because a contribution that silently
        // vanishes is exactly the wrong number D33 forbids.
        throw new Error(`Unknown ability '${ability}' on an ability increase.`);
      }
      return {
        ability,
        amount: sqlInteger(row, 'amount'),
        maximum: sqlInteger(row, 'maximum'),
        source_instance_id: sqlInteger(row, 'source_instance_id'),
      };
    },
  );
}

/** One call for the common reader shape: load, resolve, and keep all three. */
export function resolveCharacterAbilities(
  db: DatabaseContext,
  characterId: number,
  base: Readonly<Record<Ability, number>>,
): ResolvedAbilities {
  return resolveAbilities(base, readAbilityContributions(db, characterId));
}

/** The totals alone, shaped for `AbilityScores.fromArray` and the read model. */
export function resolvedTotals(
  resolved: ResolvedAbilities,
): Record<Ability, number> {
  return Object.fromEntries(
    abilities.map((ability) => [ability, resolved[ability].total]),
  ) as Record<Ability, number>;
}
