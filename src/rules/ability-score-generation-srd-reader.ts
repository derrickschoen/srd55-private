/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
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
 * Parsing follows the fail-fast pattern of the sibling `*-srd-reader.ts`
 * modules: a malformed extract throws, because a guessed rule number would be
 * a wrong number wearing a fact's clothes (D33).
 *
 * THE PARSE RUNS AT BUILD TIME, NOT AT RUNTIME. This module takes the extract
 * as an argument and imports no SRD text. `npm run srd:artifacts` runs it and
 * commits `generated/ability-score-generation-srd.ts`, which the runtime reads
 * through `ability-score-generation-srd.ts`; the SRD artifact drift test
 * re-parses the extract and fails on any byte difference.
 */

export type SrdAbilityScoreGenerationSection =
  | 'standard_array'
  | 'point_cost';

const SRD_ABILITY_SCORE_SECTION_MESSAGES: Readonly<
  Record<SrdAbilityScoreGenerationSection, string>
> = {
  standard_array:
    'SRD extract: Standard Array wording is absent or unrecognised.',
  point_cost: 'SRD extract: Point Cost wording is absent or unrecognised.',
};

export class SrdAbilityScoreGenerationWordingError extends Error {
  override readonly name = 'SrdAbilityScoreGenerationWordingError' as const;
  constructor(readonly section: SrdAbilityScoreGenerationSection) {
    super(SRD_ABILITY_SCORE_SECTION_MESSAGES[section]);
  }
}

export class SrdStandardArrayShapeError extends Error {
  override readonly name = 'SrdStandardArrayShapeError' as const;
  constructor() {
    super('SRD extract: Standard Array must list six integers.');
  }
}

export class SrdPointCostDuplicateScoreError extends Error {
  override readonly name = 'SrdPointCostDuplicateScoreError' as const;
  constructor(readonly score: number) {
    super(`SRD extract: point cost for score ${String(score)} appears twice.`);
  }
}

export class SrdPointCostTableMissingError extends Error {
  override readonly name = 'SrdPointCostTableMissingError' as const;
  constructor() {
    super(
      'SRD extract: the Ability Score Point Costs table is absent or unrecognised.',
    );
  }
}

function normalized(source: string): string {
  return source.replace(/\s+/gu, ' ').trim();
}

/** The six Standard Array scores, as a tuple: the count is a fact of the type. */
export type StandardArrayScores = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

export function parseStandardArray(source: string): StandardArrayScores {
  const match = normalized(source).match(
    /Standard Array\. Use the following six scores for your abilities: (?<scores>[\d, ]+)\./u,
  );
  const scores = match?.groups?.scores;
  if (scores === undefined) {
    throw new SrdAbilityScoreGenerationWordingError('standard_array');
  }
  const values = scores.split(', ').map(Number);
  const [first, second, third, fourth, fifth, sixth, ...rest] = values;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    fifth === undefined ||
    sixth === undefined ||
    rest.length > 0 ||
    values.some((value) => !Number.isInteger(value))
  ) {
    throw new SrdStandardArrayShapeError();
  }
  return [first, second, third, fourth, fifth, sixth];
}

export function parsePointBudget(source: string): number {
  const match = normalized(source).match(
    /Point Cost\. You have (?<points>\d+) points to spend on your ability scores\./u,
  );
  const points = match?.groups?.points;
  if (points === undefined) {
    throw new SrdAbilityScoreGenerationWordingError('point_cost');
  }
  return Number(points);
}

/**
 * The Ability Score Point Costs table is printed as two side-by-side
 * score/cost column pairs; each physical row carries two entries.
 */
export function parsePointCosts(source: string): ReadonlyMap<number, number> {
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
        throw new SrdPointCostDuplicateScoreError(score);
      }
      costs.set(score, cost);
    }
  }
  if (costs.size === 0) {
    throw new SrdPointCostTableMissingError();
  }
  return costs;
}

/**
 * WHAT THE BUILD RECORDS: the three parses in recordable form. The cost table
 * is a list of printed `[score, cost]` pairs in the extract's reading order
 * (left pair, then right pair, row by row), which is the insertion order the
 * runtime `POINT_COSTS` map is rebuilt in.
 */
export interface SrdAbilityScoreGenerationArtifact {
  readonly standard_array: StandardArrayScores;
  readonly point_buy_budget: number;
  readonly point_costs: readonly (readonly [score: number, cost: number])[];
}

export function deriveSrdAbilityScoreGenerationArtifact(
  source: string,
): SrdAbilityScoreGenerationArtifact {
  return {
    standard_array: parseStandardArray(source),
    point_buy_budget: parsePointBudget(source),
    point_costs: [...parsePointCosts(source)],
  };
}
