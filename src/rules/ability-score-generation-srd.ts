/**
 * ABILITY SCORE GENERATION, FROM THE SRD EXTRACT (B1, D64).
 *
 * The standard array, the point-buy budget and the complete point-cost table
 * are PARSED FROM `docs/srd/source/ability-score-generation.txt` — never
 * hand-typed here and never taken from the unit test that previously held the
 * only parser. The extract is the oracle; a module restating the numbers
 * would be a second copy that drifts, and the B1-ARRAY control exists to
 * prove a changed extract fails against `docs/srd/source/`, not against our
 * own output.
 *
 * Random Generation (4d6 drop lowest) is in the extract and deliberately NOT
 * modelled: D55 deleted Roll in Order outright — not deferred — and D64's
 * three offered methods are standard array, point buy and manual entry.
 *
 * Parsing follows the fail-fast pattern of the sibling `*-srd.ts` modules: a
 * malformed extract throws at module evaluation, because a guessed rule
 * number would be a wrong number wearing a fact's clothes (D33).
 */

import extract from '../../docs/srd/source/ability-score-generation.txt?raw';

function normalized(source: string): string {
  return source.replace(/\s+/gu, ' ').trim();
}

function parseStandardArray(source: string): readonly number[] {
  const match = normalized(source).match(
    /Standard Array\. Use the following six scores for your abilities: (?<scores>[\d, ]+)\./u,
  );
  const scores = match?.groups?.scores;
  if (scores === undefined) {
    throw new Error(
      'SRD extract: Standard Array wording is absent or unrecognised.',
    );
  }
  const values = scores.split(', ').map(Number);
  if (values.length !== 6 || values.some((value) => !Number.isInteger(value))) {
    throw new Error('SRD extract: Standard Array must list six integers.');
  }
  return values;
}

function parsePointBudget(source: string): number {
  const match = normalized(source).match(
    /Point Cost\. You have (?<points>\d+) points to spend on your ability scores\./u,
  );
  const points = match?.groups?.points;
  if (points === undefined) {
    throw new Error(
      'SRD extract: Point Cost wording is absent or unrecognised.',
    );
  }
  return Number(points);
}

/**
 * The Ability Score Point Costs table is printed as two side-by-side
 * score/cost column pairs; each physical row carries two entries.
 */
function parsePointCosts(source: string): ReadonlyMap<number, number> {
  const costs = new Map<number, number>();
  const rowPattern =
    /^\s+(?<leftScore>\d+)\s+(?<leftCost>\d+)\s+(?<rightScore>\d+)\s+(?<rightCost>\d+)\s*$/gmu;
  for (const match of source.matchAll(rowPattern)) {
    const groups = match.groups;
    if (groups === undefined) {
      continue;
    }
    for (const [score, cost] of [
      [Number(groups.leftScore), Number(groups.leftCost)],
      [Number(groups.rightScore), Number(groups.rightCost)],
    ] as const) {
      if (costs.has(score)) {
        throw new Error(
          `SRD extract: point cost for score ${score} appears twice.`,
        );
      }
      costs.set(score, cost);
    }
  }
  if (costs.size === 0) {
    throw new Error(
      'SRD extract: the Ability Score Point Costs table is absent or unrecognised.',
    );
  }
  return costs;
}

/** The six standard-array scores, in the extract's printed order. */
export const STANDARD_ARRAY: readonly number[] = parseStandardArray(extract);

/** The point-buy budget: the points a character has to spend. */
export const POINT_BUY_BUDGET: number = parsePointBudget(extract);

/** Point cost by score, exactly the printed table — no interpolation. */
export const POINT_COSTS: ReadonlyMap<number, number> = parsePointCosts(extract);

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
