import {
  compareDominanceVectors,
  type DominanceComparison,
  type DominanceVector,
} from './contracts';
import type { EngineOfferableOption, EngineOptionMetric } from '../turn-proposal';
import type { OptionOutcomeEvaluation, OptionOutcomeFamily } from './option-outcome';

export type OpportunitySelectionResolution = 'fully_resolved' | 'contains_unresolved';
export type OpportunityCandidacy<Evaluation> = (
  evaluations: readonly Evaluation[],
) => readonly Evaluation[];
export type OpportunityDominance<Evaluation> = (
  candidates: readonly Evaluation[],
) => readonly Evaluation[];
export type OpportunityOrdering<Evaluation> = (left: Evaluation, right: Evaluation) => number;

export interface OpportunitySelectionPolicy<Evaluation> {
  readonly candidates: OpportunityCandidacy<Evaluation>;
  readonly applyDominance: OpportunityDominance<Evaluation>;
  readonly compare: OpportunityOrdering<Evaluation>;
  readonly isUnresolved: (evaluation: Evaluation) => boolean;
}

export interface OpportunitySelection<Evaluation> {
  readonly selected: Evaluation;
  readonly frontier: readonly Evaluation[];
  readonly resolution: OpportunitySelectionResolution;
}

export interface OpportunityDominanceStage<Evaluation> {
  readonly competes: (alternative: Evaluation, candidate: Evaluation) => boolean;
  readonly dominates: (alternative: Evaluation, candidate: Evaluation) => boolean;
}

export function firstPopulatedCandidacyTier<Evaluation>(
  evaluations: readonly Evaluation[],
  tiers: readonly ((evaluation: Evaluation) => boolean)[],
): readonly Evaluation[] {
  for (const tier of tiers) {
    const candidates = evaluations.filter(tier);
    if (candidates.length > 0) return candidates;
  }
  return evaluations;
}

export function applyOpportunityDominanceStages<Evaluation>(
  candidates: readonly Evaluation[],
  stages: readonly OpportunityDominanceStage<Evaluation>[],
): readonly Evaluation[] {
  let survivors = candidates;
  for (const stage of stages) {
    const stageInput = survivors;
    survivors = stageInput.filter((candidate) => !stageInput.some((alternative) =>
      stage.competes(alternative, candidate) && stage.dominates(alternative, candidate)));
  }
  return survivors;
}

export function compareOpportunityTerms<Evaluation>(
  left: Evaluation,
  right: Evaluation,
  terms: readonly OpportunityOrdering<Evaluation>[],
): number {
  for (const term of terms) {
    const comparison = term(left, right);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function requireReferenceSubset<Evaluation>(
  values: readonly Evaluation[],
  allowed: readonly Evaluation[],
  boundary: 'candidacy' | 'dominance',
): void {
  const allowedReferences = new Set(allowed);
  if (values.some((value) => !allowedReferences.has(value))) {
    throw new TypeError(`Opportunity ${boundary} must return a reference subset of its input.`);
  }
}

export function selectOpportunity<Evaluation>(
  evaluations: readonly Evaluation[],
  policy: OpportunitySelectionPolicy<Evaluation>,
): OpportunitySelection<Evaluation> {
  const candidates = policy.candidates(evaluations);
  if (candidates.length === 0) throw new Error('Opportunity candidacy returned no candidates.');
  requireReferenceSubset(candidates, evaluations, 'candidacy');

  const frontier = policy.applyDominance(candidates);
  if (frontier.length === 0) throw new Error('Opportunity dominance returned an empty frontier.');
  requireReferenceSubset(frontier, candidates, 'dominance');

  const selected = [...frontier].sort(policy.compare)[0];
  if (selected === undefined) throw new Error('Opportunity selection produced no selected evaluation.');
  return {
    selected,
    frontier,
    resolution: frontier.some(policy.isUnresolved)
      ? 'contains_unresolved'
      : 'fully_resolved',
  };
}

export type OpportunityMetric = EngineOptionMetric;
export type OpportunityVector = DominanceVector<OpportunityMetric>;
export type ActionEquivalentMetric = 'net_action_equivalents';
export type ActionEquivalentVector = DominanceVector<ActionEquivalentMetric>;

export type OpportunityOptionKind = 'offense' | 'approach' | 'dodge' | 'other';

export interface ResolvedOpportunityOption {
  readonly status: 'resolved';
  readonly option: EngineOfferableOption;
  readonly kind: OpportunityOptionKind;
  readonly vector: OpportunityVector;
  readonly family: OptionOutcomeFamily;
  readonly commonVector: ActionEquivalentVector;
  readonly outcome: Extract<OptionOutcomeEvaluation, { readonly status: 'resolved' }>;
  readonly summary: string;
}

export interface UnresolvedOpportunityOption {
  readonly status: 'unresolved';
  readonly option: EngineOfferableOption;
  readonly kind: OpportunityOptionKind;
  readonly unresolvedMetrics: readonly OpportunityMetric[];
  readonly reasons: readonly string[];
  readonly summary: string;
}

export type OpportunityOptionEvaluation = ResolvedOpportunityOption | UnresolvedOpportunityOption;

export function compareOpportunityV1(
  left: ResolvedOpportunityOption,
  right: ResolvedOpportunityOption,
): DominanceComparison<OpportunityMetric> {
  return compareDominanceVectors(left.vector, right.vector);
}

export function compareOpportunityV2(
  left: ResolvedOpportunityOption,
  right: ResolvedOpportunityOption,
): DominanceComparison<OpportunityMetric> | DominanceComparison<ActionEquivalentMetric> {
  return left.family === 'legacy' && right.family === 'legacy'
    ? compareOpportunityV1(left, right)
    : compareDominanceVectors(left.commonVector, right.commonVector);
}

const CANDIDACY_TIERS = [
  (evaluation: OpportunityOptionEvaluation) =>
    evaluation.kind === 'offense' || evaluation.kind === 'approach',
  (evaluation: OpportunityOptionEvaluation) => evaluation.kind === 'dodge',
] as const;

const OPTION_KIND_RANK: Readonly<Record<OpportunityOptionKind, number>> = {
  offense: 0,
  approach: 1,
  dodge: 2,
  other: 3,
};

function metricValue(evaluation: ResolvedOpportunityOption, metric: OpportunityMetric): number {
  const value = evaluation.vector[metric].exact;
  return value.numerator / value.denominator;
}

function resolvedMetricOrder(
  metric: OpportunityMetric,
  direction: 'ascending' | 'descending',
): OpportunityOrdering<OpportunityOptionEvaluation> {
  return (left, right) => {
    if (left.status === 'unresolved' || right.status === 'unresolved') return 0;
    const difference = metricValue(left, metric) - metricValue(right, metric);
    return direction === 'ascending' ? difference : -difference;
  };
}

const OPPORTUNITY_ORDERING_TERMS: readonly OpportunityOrdering<OpportunityOptionEvaluation>[] = [
  (left, right) => OPTION_KIND_RANK[left.kind] - OPTION_KIND_RANK[right.kind],
  (left, right) => Number(left.status === 'unresolved') - Number(right.status === 'unresolved'),
  resolvedMetricOrder('expected_damage_milli', 'descending'),
  resolvedMetricOrder('attack_count', 'descending'),
  resolvedMetricOrder('approach_feet', 'descending'),
  resolvedMetricOrder('resource_costs', 'ascending'),
  (left, right) => left.option.optionId.localeCompare(right.option.optionId),
];

function compareOpportunityEvaluations(
  left: OpportunityOptionEvaluation,
  right: OpportunityOptionEvaluation,
): number {
  return compareOpportunityTerms(left, right, OPPORTUNITY_ORDERING_TERMS);
}

const LEGACY_DOMINANCE_STAGES: readonly OpportunityDominanceStage<ResolvedOpportunityOption>[] = [{
  competes: (alternative, candidate) =>
    alternative.option.optionId !== candidate.option.optionId,
  dominates: (alternative, candidate) =>
    compareOpportunityV1(alternative, candidate).relation === 'left_dominates',
}];

const CROSS_FAMILY_DOMINANCE_STAGES: readonly OpportunityDominanceStage<OpportunityOptionEvaluation>[] = [
  {
    competes: (alternative, candidate) =>
      alternative.status === 'resolved' && candidate.status === 'resolved' &&
      alternative.option.optionId !== candidate.option.optionId &&
      alternative.family === candidate.family,
    dominates: (alternative, candidate) => {
      if (alternative.status === 'unresolved' || candidate.status === 'unresolved') return false;
      return compareOpportunityV2(alternative, candidate).relation === 'left_dominates';
    },
  },
  {
    competes: (alternative, candidate) =>
      alternative.status === 'resolved' && candidate.status === 'resolved' &&
      alternative.option.optionId !== candidate.option.optionId &&
      alternative.family !== candidate.family,
    dominates: (alternative, candidate) => {
      if (alternative.status === 'unresolved' || candidate.status === 'unresolved') return false;
      return compareDominanceVectors(
        alternative.commonVector,
        candidate.commonVector,
      ).relation === 'left_dominates';
    },
  },
];

export const LEGACY_OPPORTUNITY_SELECTION_POLICY:
OpportunitySelectionPolicy<ResolvedOpportunityOption> = {
  candidates: (evaluations) => firstPopulatedCandidacyTier(evaluations, CANDIDACY_TIERS),
  applyDominance: (candidates) =>
    applyOpportunityDominanceStages(candidates, LEGACY_DOMINANCE_STAGES),
  compare: compareOpportunityEvaluations,
  isUnresolved: () => false,
};

export const CROSS_FAMILY_OPPORTUNITY_SELECTION_POLICY:
OpportunitySelectionPolicy<OpportunityOptionEvaluation> = {
  candidates: (evaluations) => firstPopulatedCandidacyTier(evaluations, CANDIDACY_TIERS),
  applyDominance: (candidates) =>
    applyOpportunityDominanceStages(candidates, CROSS_FAMILY_DOMINANCE_STAGES),
  compare: compareOpportunityEvaluations,
  isUnresolved: (evaluation) => evaluation.status === 'unresolved',
};
