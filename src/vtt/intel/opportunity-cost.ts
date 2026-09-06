import type { EncounterState } from '../../combat/encounter';
import type { GridCell } from '../../combat/grid';
import type { CombatantId } from '../../combat/values';
import type { PlanMaterialityReasonCode } from '../plan-materiality';
import type { EngineQueryPort } from '../engine-query-port';
import { availableEngineActorOptions, resolveEngineActorOption } from '../intent-resolver';
import type { EngineOfferableOption, EngineOptionId, EngineOptionMetric } from '../turn-proposal';
import {
  compareDominanceVectors,
  exactRational,
  intelPolicyVersion,
  type DominanceComparison,
  type DominanceVector,
} from './contracts';
import {
  evaluateOptionOutcome,
  type OptionOutcomeEvaluation,
  type OptionOutcomeFamily,
} from './option-outcome';

export const OPPORTUNITY_COST_POLICY = intelPolicyVersion('opportunity-cost-v1');
export const DOMINANCE_CORRECTION_POLICY = intelPolicyVersion('dominance-correction-v1');
export const MATERIALITY_CONTEXT_POLICY = intelPolicyVersion('materiality-context-v1');

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

export interface ActorOpportunityReport {
  readonly policy: typeof OPPORTUNITY_COST_POLICY;
  readonly actorId: CombatantId;
  readonly options: readonly OpportunityOptionEvaluation[];
  readonly defaultOption: EngineOfferableOption;
  readonly frontierResolution: 'fully_resolved' | 'contains_unresolved';
}

export type SubmissionDominance =
  | {
      readonly status: 'dominated';
      readonly policy: typeof OPPORTUNITY_COST_POLICY;
      readonly correctionPolicy: typeof DOMINANCE_CORRECTION_POLICY;
      readonly selected: ResolvedOpportunityOption;
      readonly alternative: ResolvedOpportunityOption;
      readonly comparison: DominanceComparison<OpportunityMetric> | DominanceComparison<ActionEquivalentMetric>;
      readonly delta: string;
    }
  | {
      readonly status: 'not_dominated' | 'not_dominated_tradeoff' | 'blocked_unresolved';
      readonly policy: typeof OPPORTUNITY_COST_POLICY;
      readonly correctionPolicy: typeof DOMINANCE_CORRECTION_POLICY;
      readonly reasons: readonly string[];
    };

function stateWithActorAt(
  state: EncounterState,
  actorId: CombatantId,
  position: GridCell,
): EncounterState {
  return {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === actorId
      ? { ...token, position: { ...position } }
      : token),
  };
}

function mainUse(option: EngineOfferableOption) {
  return option.actionSlots.find((slot) => slot.slot === 'main')?.use;
}

function optionKind(option: EngineOfferableOption, approachFeet: number): OpportunityOptionKind {
  const main = mainUse(option);
  if (main === undefined) return 'other';
  switch (main.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw':
    case 'cast_spell': return 'offense';
    case 'dash': return approachFeet > 0 ? 'approach' : 'other';
    case 'dodge': return 'dodge';
    case 'use_world_object':
    case 'disengage':
    case 'end_turn': return 'other';
  }
}

function targetedAttacks(option: EngineOfferableOption): readonly {
  readonly actionId: string;
  readonly targetId: CombatantId;
}[] {
  const main = mainUse(option);
  if (main?.kind === 'attack') {
    return main.target.kind === 'combatant'
      ? [{ actionId: String(main.actionId), targetId: main.target.combatantId }]
      : [];
  }
  if (main?.kind === 'multiattack') {
    return main.components.flatMap((component) => component.target.kind === 'combatant'
      ? [{ actionId: String(component.actionId), targetId: component.target.combatantId }]
      : []);
  }
  return [];
}

function vector(input: {
  readonly expectedDamage: number;
  readonly attackCount: number;
  readonly approachFeet: number;
  readonly actionSlotUses: number;
  readonly resourceCosts: number;
}): OpportunityVector {
  return {
    expected_damage_milli: {
      exact: exactRational(Math.round(input.expectedDamage * 1_000), 1),
      objective: 'maximize',
    },
    attack_count: { exact: exactRational(input.attackCount, 1), objective: 'maximize' },
    approach_feet: { exact: exactRational(input.approachFeet, 1), objective: 'maximize' },
    action_slot_uses: { exact: exactRational(input.actionSlotUses, 1), objective: 'maximize' },
    resource_costs: { exact: exactRational(input.resourceCosts, 1), objective: 'minimize' },
  };
}

function evaluateOption(
  state: EncounterState,
  option: EngineOfferableOption,
  queries: EngineQueryPort,
): OpportunityOptionEvaluation | null {
  const resolution = resolveEngineActorOption(state, option, queries);
  if (!resolution.valid) return null;
  const attacks = targetedAttacks(option);
  const approachFeet = resolution.mechanics.movementCostFeet;
  const kind = optionKind(option, approachFeet);
  const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, queries);
  if (outcome.status === 'unresolved') {
    return {
      status: 'unresolved', option, kind,
      unresolvedMetrics: ['expected_damage_milli'],
      reasons: [outcome.reason],
      summary: `${option.label}: ${outcome.reason}`,
    };
  }
  const movedState = stateWithActorAt(state, option.actorId, resolution.mechanics.finalPosition);
  const evaluations = attacks.map((attack) =>
    queries.tacticalAttack(movedState, option.actorId, attack.targetId, attack.actionId));
  const reasons = evaluations.flatMap((evaluation) => evaluation === null
    ? ['attack_context_unresolved']
    : [
        ...(evaluation.damage.status === 'unresolved' ? [evaluation.damage.reason] : []),
        ...evaluation.unresolved,
      ]);
  if (reasons.length > 0) {
    return {
      status: 'unresolved', option, kind,
      unresolvedMetrics: ['expected_damage_milli'],
      reasons: [...new Set(reasons)],
      summary: `${option.label}: ${[...new Set(reasons)].join(',')}`,
    };
  }
  const expectedDamage = evaluations.reduce((total, evaluation) =>
    total + (evaluation?.damage.status === 'resolved' ? evaluation.damage.expectedDamage : 0), 0);
  return {
    status: 'resolved', option, kind,
    family: outcome.family,
    commonVector: {
      net_action_equivalents: {
        exact: outcome.ledger.netActionEquivalents,
        objective: 'maximize',
      },
    },
    outcome,
    vector: vector({
      expectedDamage,
      attackCount: attacks.length,
      approachFeet,
      actionSlotUses: option.actionSlots.length,
      resourceCosts: option.resourceCostLabels.length,
    }),
    summary: `${option.label}: attacks ${String(attacks.length)}, EV ${String(Math.round(expectedDamage))}, approach ${String(approachFeet)} ft`,
  };
}

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

function rankingTuple(evaluation: OpportunityOptionEvaluation): readonly number[] {
  const classRank = evaluation.kind === 'offense' ? 0 : evaluation.kind === 'approach' ? 1 :
    evaluation.kind === 'dodge' ? 2 : 3;
  if (evaluation.status === 'unresolved') return [classRank, 1, 0, 0, 0, 0];
  const metric = (name: OpportunityMetric) => evaluation.vector[name].exact.numerator /
    evaluation.vector[name].exact.denominator;
  return [
    classRank,
    0,
    -metric('expected_damage_milli'),
    -metric('attack_count'),
    -metric('approach_feet'),
    metric('resource_costs'),
  ];
}

function compareTuple(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export function legacyDefaultOption(
  evaluations: readonly ResolvedOpportunityOption[],
): EngineOfferableOption {
  const offensiveOrApproach = evaluations.filter((option) =>
    option.kind === 'offense' || option.kind === 'approach');
  const candidates = offensiveOrApproach.length > 0
    ? offensiveOrApproach
    : evaluations.filter((option) => option.kind === 'dodge');
  const eligible = candidates.length > 0 ? candidates : evaluations;
  const frontier = eligible.filter((candidate) => !eligible.some((alternative) =>
    alternative.option.optionId !== candidate.option.optionId &&
    compareOpportunityV1(alternative, candidate).relation === 'left_dominates'));
  const selected = [...frontier].sort((left, right) =>
    compareTuple(rankingTuple(left), rankingTuple(right)) ||
    left.option.optionId.localeCompare(right.option.optionId))[0];
  if (selected === undefined) throw new Error('No resolved legacy option exists.');
  return selected.option;
}

export function actorOpportunityReport(
  state: EncounterState,
  actorId: CombatantId,
  queries: EngineQueryPort,
  revision = state.revision,
): ActorOpportunityReport {
  const available = availableEngineActorOptions(state, actorId, queries, revision);
  const options = available
    .flatMap((option) => {
      const evaluated = evaluateOption(state, option, queries);
      return evaluated === null ? [] : [evaluated];
    });
  const offensiveOrApproach = options.filter((option) =>
    option.kind === 'offense' || option.kind === 'approach');
  const candidates = offensiveOrApproach.length > 0
    ? offensiveOrApproach
    : options.filter((option) => option.kind === 'dodge');
  const eligible = candidates.length > 0 ? candidates : options;
  const withinFamily = eligible.filter((candidate) => candidate.status === 'unresolved' ||
    !eligible.some((alternative) => alternative.status === 'resolved' && candidate.status === 'resolved' &&
      alternative.family === candidate.family && alternative.option.optionId !== candidate.option.optionId &&
      compareOpportunityV2(alternative, candidate).relation === 'left_dominates'));
  const frontier = withinFamily.filter((candidate) => candidate.status === 'unresolved' ||
    !withinFamily.some((alternative) => alternative.status === 'resolved' && candidate.status === 'resolved' &&
      alternative.family !== candidate.family && alternative.option.optionId !== candidate.option.optionId &&
      compareDominanceVectors(alternative.commonVector, candidate.commonVector).relation === 'left_dominates'));
  const defaultEvaluation = [...frontier]
    .sort((left, right) => compareTuple(rankingTuple(left), rankingTuple(right)) ||
      left.option.optionId.localeCompare(right.option.optionId))[0];
  if (defaultEvaluation === undefined) throw new Error(`No legal engine option exists for ${actorId}.`);
  return {
    policy: OPPORTUNITY_COST_POLICY,
    actorId,
    options,
    defaultOption: defaultEvaluation.option,
    frontierResolution: frontier.some((candidate) => candidate.status === 'unresolved')
      ? 'contains_unresolved'
      : 'fully_resolved',
  };
}

function deltaText(
  selected: ResolvedOpportunityOption,
  alternative: ResolvedOpportunityOption,
  comparison: DominanceComparison<OpportunityMetric> | DominanceComparison<ActionEquivalentMetric>,
): string {
  const better = Object.entries(comparison.perMetric)
    .filter(([, verdict]) => verdict === 'left_better')
    .map(([metric]) => metric.replaceAll('_', ' '));
  return `M5 ${alternative.option.label} strictly dominates ${selected.option.label}: no declared metric is worse; better ${better.join(', ')}. Supply one typed G8 override reason to keep the selected plan.`;
}

export function submissionDominance(
  report: ActorOpportunityReport,
  selectedOptionId: EngineOptionId,
): SubmissionDominance {
  const selected = report.options.find((option) => option.option.optionId === selectedOptionId);
  if (selected === undefined || selected.status === 'unresolved') {
    return {
      status: 'blocked_unresolved', policy: OPPORTUNITY_COST_POLICY,
      correctionPolicy: DOMINANCE_CORRECTION_POLICY,
      reasons: selected?.reasons ?? ['selected_option_not_evaluated'],
    };
  }
  let sawIncomparable = false;
  for (const alternative of report.options) {
    if (alternative.status === 'unresolved' || alternative.option.optionId === selectedOptionId) continue;
    const comparison = compareOpportunityV2(alternative, selected);
    if (comparison.relation === 'left_dominates') {
      return {
        status: 'dominated', policy: OPPORTUNITY_COST_POLICY,
        correctionPolicy: DOMINANCE_CORRECTION_POLICY,
        selected, alternative, comparison,
        delta: deltaText(selected, alternative, comparison),
      };
    }
    sawIncomparable ||= comparison.relation === 'incomparable';
  }
  return {
    status: sawIncomparable ? 'not_dominated_tradeoff' : 'not_dominated',
    policy: OPPORTUNITY_COST_POLICY,
    correctionPolicy: DOMINANCE_CORRECTION_POLICY,
    reasons: sawIncomparable ? ['declared_metrics_incomparable'] : [],
  };
}

export function renderDodgeOpportunityCost(
  report: ActorOpportunityReport,
): Readonly<Record<string, unknown>> | null {
  const dodge = report.options.find((option) => option.kind === 'dodge');
  if (dodge === undefined) return null;
  const defaultEvaluation = report.options.find((option) =>
    option.option.optionId === report.defaultOption.optionId);
  const defaultDominance = submissionDominance(report, report.defaultOption.optionId);
  const resolvedDodge = dodge.status === 'resolved' ? dodge : null;
  const defaultBeatsDodge = defaultEvaluation?.status === 'resolved' &&
    defaultEvaluation.kind === 'offense' && resolvedDodge !== null &&
    defaultDominance.status !== 'dominated'
    ? compareOpportunityV2(defaultEvaluation, resolvedDodge)
    : null;
  // D462/D476/D477 rank a viable, non-dominated offensive default ahead of
  // passive setup: confirmed kill first, then expected damage, then attack ETA.
  // Do not let the generic dominance scan recommend an approach such as Dash
  // over both Dodge and that already-preferred offense merely because Dash was
  // encountered first in the offerable list.
  const comparison: SubmissionDominance = defaultEvaluation?.status === 'resolved' && resolvedDodge !== null &&
    defaultBeatsDodge?.relation === 'left_dominates'
    ? {
        status: 'dominated',
        policy: OPPORTUNITY_COST_POLICY,
        correctionPolicy: DOMINANCE_CORRECTION_POLICY,
        selected: resolvedDodge,
        alternative: defaultEvaluation,
        comparison: defaultBeatsDodge,
        delta: deltaText(resolvedDodge, defaultEvaluation, defaultBeatsDodge),
      }
    : defaultEvaluation?.status === 'resolved' && defaultEvaluation.kind === 'offense' &&
        defaultDominance.status !== 'dominated'
      ? {
          status: 'not_dominated_tradeoff',
          policy: OPPORTUNITY_COST_POLICY,
          correctionPolicy: DOMINANCE_CORRECTION_POLICY,
          reasons: ['engine_default_offense_ranked_first'],
        }
      : submissionDominance(report, dodge.option.optionId);
  return {
    policy: OPPORTUNITY_COST_POLICY,
    correction_policy: DOMINANCE_CORRECTION_POLICY,
    dodge_option_id: dodge.option.optionId,
    engine_default_option_id: report.defaultOption.optionId,
    status: comparison.status,
    ...(comparison.status === 'dominated' ? {
      better_option_id: comparison.alternative.option.optionId,
      delta: comparison.delta,
    } : { reason_codes: comparison.reasons }),
  };
}

export function renderMaterialityContext(
  reasonCodes: readonly PlanMaterialityReasonCode[],
  state: EncounterState,
): Readonly<Record<string, unknown>> | null {
  if (reasonCodes.length === 0) return null;
  const newlyRelevantDying = reasonCodes.includes('LIFE_STATE_CHANGED')
    ? state.combatants.filter((combatant) => combatant.life === 'dying')
      .map((combatant) => combatant.profile.id)
      .sort((left, right) => left.localeCompare(right))
    : [];
  return {
    policy: MATERIALITY_CONTEXT_POLICY,
    reasons: reasonCodes.map((code) => ({
      code,
      affected_actor_ids: code === 'LIFE_STATE_CHANGED' ? newlyRelevantDying : [],
      summary: code === 'LIFE_STATE_CHANGED' && newlyRelevantDying.length > 0
        ? `wake: LIFE_STATE_CHANGED (${newlyRelevantDying.join(',')} now dying); recompute death consequences`
        : `wake: ${code}`,
    })),
  };
}
