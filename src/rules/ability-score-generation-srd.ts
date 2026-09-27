/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ABILITY SCORE GENERATION (B1, D64): the standard array, the point-buy
 * budget and the complete point-cost table, parsed from
 * `docs/srd/source/ability-score-generation.txt` AT BUILD TIME by
 * `ability-score-generation-srd-reader.ts` and read here from the generated
 * artifact (`generated/ability-score-generation-srd.ts`, written by
 * `npm run srd:artifacts`). This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type { StandardArrayScores } from './ability-score-generation-srd-reader';
import { BUNDLED_SRD_ABILITY_SCORE_GENERATION } from './generated/ability-score-generation-srd';

const ARTIFACT = deepFreeze(BUNDLED_SRD_ABILITY_SCORE_GENERATION);

/** The six standard-array scores, in the extract's printed order. */
export const STANDARD_ARRAY: StandardArrayScores = ARTIFACT.standard_array;

/** The point-buy budget: the points a character has to spend. */
export const POINT_BUY_BUDGET: number = ARTIFACT.point_buy_budget;

/** Point cost by score, exactly the printed table — no interpolation. */
export const POINT_COSTS: ReadonlyMap<number, number> = new Map(
  ARTIFACT.point_costs,
);

/** The lowest and highest scores the printed cost table prices. */
export const POINT_BUY_MIN_SCORE: number = Math.min(...POINT_COSTS.keys());
export const POINT_BUY_MAX_SCORE: number = Math.max(...POINT_COSTS.keys());

/**
 * The printed cost of one score, or null when the table does not price it.
 * Null says UNKNOWN (D33) — a score outside 8–15 has no point-buy cost, and
 * inventing one would be a house rule wearing the SRD's clothes.
 */
export function pointCostOf(score: number): number | null {
  return POINT_COSTS.get(score) ?? null;
}

/**
 * The total point cost of a full six-score spend, or null when any score is
 * outside the printed table. A null total is how the abilities step knows a
 * set of numbers is not a point-buy spend at all, as opposed to an
 * over-budget one.
 */
export function pointBuyTotalCost(
  scores: readonly number[],
): number | null {
  let total = 0;
  for (const score of scores) {
    const cost = pointCostOf(score);
    if (cost === null) {
      return null;
    }
    total += cost;
  }
  return total;
}
