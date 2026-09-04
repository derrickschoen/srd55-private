import type { EncounterState } from '../../combat/encounter';
import type { CombatantId } from '../../combat/values';
import type { EngineQueryPort, TacticalAllocationChoice } from '../engine-query-port';
import { availableEngineActorOptions, resolveEngineActorOption } from '../intent-resolver';
import type {
  EngineOfferableOption,
  EngineOptionId,
  EngineTurnProposal,
  ResolvedTurnMechanics,
} from '../turn-proposal';
import {
  compareDominanceVectors,
  exactRational,
  intelPolicyVersion,
  type DominanceComparison,
  type DominanceVector,
  type ExactRational,
} from './contracts';
import {
  combinedDamageActionEquivalents,
  evaluateOptionOutcome,
  type DamageOutcomeEvidence,
  type OptionOutcomeEvaluation,
  type OptionOutcomeFamily,
} from './option-outcome';

export const TEAM_SCORER_POLICY = intelPolicyVersion('team-scorer-v1');

export type TeamPlanMetric =
  | 'lethality'
  | 'objective_progress'
  | 'resource_conservation'
  | 'dying_pc_removal'
  | 'wasted_turn';

export type TeamPlanVector = DominanceVector<TeamPlanMetric>;
export type TeamCommonMetric = 'net_action_equivalents' | 'dying_pc_removal' | 'wasted_turn';
export type TeamCommonVector = DominanceVector<TeamCommonMetric>;

export interface TeamPlanCandidate {
  readonly candidateId: string;
  readonly label: string;
  readonly proposals: readonly EngineTurnProposal[];
}

export interface WastedTurnMarker {
  readonly kind: 'wasted_turn';
  readonly actorId: CombatantId;
  readonly optionId: EngineOptionId;
  readonly reason: 'zero_feet_dash' | 'no_effect_turn';
}

export type TeamPlanDominanceMarker = WastedTurnMarker;

export type TeamPlanUnresolvedReason =
  | 'duplicate_actor'
  | 'option_not_offered'
  | 'option_illegal'
  | 'actor_absent'
  | 'mixed_team_sides'
  | 'option_outcome_unresolved'
  | 'semantic_attack_target_unresolved'
  | 'attack_allocation_unresolved';

export interface ResolvedTeamPlanEvaluation {
  readonly status: 'resolved';
  readonly candidate: TeamPlanCandidate;
  readonly vector: TeamPlanVector;
  readonly family: OptionOutcomeFamily;
  readonly commonVector: TeamCommonVector;
  readonly outcomes: readonly Extract<OptionOutcomeEvaluation, { readonly status: 'resolved' }>[];
  readonly markers: readonly TeamPlanDominanceMarker[];
}

export interface UnresolvedTeamPlanEvaluation {
  readonly status: 'unresolved';
  readonly candidate: TeamPlanCandidate;
  readonly unresolvedMetrics: readonly TeamPlanMetric[];
  readonly reasons: readonly TeamPlanUnresolvedReason[];
}

export type TeamPlanEvaluation = ResolvedTeamPlanEvaluation | UnresolvedTeamPlanEvaluation;

export interface RemovedTeamPlan {
  readonly candidate: ResolvedTeamPlanEvaluation;
  readonly dominatedBy: ResolvedTeamPlanEvaluation;
  readonly comparison: DominanceComparison<TeamPlanMetric> | DominanceComparison<TeamCommonMetric>;
  readonly markers: readonly TeamPlanDominanceMarker[];
}

export interface TeamPlanFrontierReport {
  readonly policy: typeof TEAM_SCORER_POLICY;
  readonly evaluations: readonly TeamPlanEvaluation[];
  readonly frontier: readonly TeamPlanEvaluation[];
  readonly removed: readonly RemovedTeamPlan[];
  readonly frontierResolution: 'fully_resolved' | 'contains_unresolved';
}

export function teamPlanVector(input: {
  readonly lethality: ExactRational;
  readonly objectiveProgress: ExactRational;
  readonly resourceConservation: ExactRational;
  readonly dyingPcRemoval: ExactRational;
  readonly wastedTurn: ExactRational;
}): TeamPlanVector {
  return {
    lethality: { exact: input.lethality, objective: 'maximize' },
    objective_progress: { exact: input.objectiveProgress, objective: 'maximize' },
    resource_conservation: { exact: input.resourceConservation, objective: 'minimize' },
    dying_pc_removal: { exact: input.dyingPcRemoval, objective: 'maximize' },
    wasted_turn: { exact: input.wastedTurn, objective: 'minimize' },
  };
}

export function teamCommonVector(input: {
  readonly netActionEquivalents: ExactRational;
  readonly dyingPcRemoval: ExactRational;
  readonly wastedTurn: ExactRational;
}): TeamCommonVector {
  return {
    net_action_equivalents: { exact: input.netActionEquivalents, objective: 'maximize' },
    dying_pc_removal: { exact: input.dyingPcRemoval, objective: 'maximize' },
    wasted_turn: { exact: input.wastedTurn, objective: 'minimize' },
  };
}

export function compareTeamPlanV1(
  left: ResolvedTeamPlanEvaluation,
  right: ResolvedTeamPlanEvaluation,
): DominanceComparison<TeamPlanMetric> {
  return compareDominanceVectors(left.vector, right.vector);
}

export function compareTeamPlanV2(
  left: ResolvedTeamPlanEvaluation,
  right: ResolvedTeamPlanEvaluation,
): DominanceComparison<TeamPlanMetric> | DominanceComparison<TeamCommonMetric> {
  return left.family === 'legacy' && right.family === 'legacy'
    ? compareTeamPlanV1(left, right)
    : compareDominanceVectors(left.commonVector, right.commonVector);
}

/**
 * Pure Pareto reduction. Unresolved candidates are deliberately incomparable
 * and therefore always remain available to the model.
 */
export function scoreTeamPlanEvaluations(
  evaluations: readonly TeamPlanEvaluation[],
): TeamPlanFrontierReport {
  const withinFamilyRemoved = evaluations.flatMap((candidate): readonly RemovedTeamPlan[] => {
    if (candidate.status === 'unresolved') return [];
    const dominator = evaluations
      .filter((alternative): alternative is ResolvedTeamPlanEvaluation =>
        alternative.status === 'resolved' &&
        alternative.family === candidate.family &&
        alternative.candidate.candidateId !== candidate.candidate.candidateId)
      .sort((left, right) => left.candidate.candidateId.localeCompare(right.candidate.candidateId))
      .find((alternative) =>
        compareTeamPlanV2(alternative, candidate).relation === 'left_dominates');
    if (dominator === undefined) return [];
    return [{
      candidate,
      dominatedBy: dominator,
      comparison: compareTeamPlanV2(dominator, candidate),
      markers: candidate.markers,
    }];
  });
  const withinFamilyRemovedIds = new Set(withinFamilyRemoved.map((entry) => entry.candidate.candidate.candidateId));
  const familyFrontier = evaluations.filter((candidate) =>
    !withinFamilyRemovedIds.has(candidate.candidate.candidateId));
  const crossFamilyRemoved = familyFrontier.flatMap((candidate): readonly RemovedTeamPlan[] => {
    if (candidate.status === 'unresolved') return [];
    const dominator = familyFrontier.find((alternative): alternative is ResolvedTeamPlanEvaluation =>
      alternative.status === 'resolved' && alternative.family !== candidate.family &&
      compareDominanceVectors(alternative.commonVector, candidate.commonVector).relation === 'left_dominates');
    return dominator === undefined ? [] : [{
      candidate,
      dominatedBy: dominator,
      comparison: compareDominanceVectors(dominator.commonVector, candidate.commonVector),
      markers: candidate.markers,
    }];
  });
  const removed = [...withinFamilyRemoved, ...crossFamilyRemoved];
  const removedIds = new Set(removed.map((entry) => entry.candidate.candidate.candidateId));
  const frontier = evaluations.filter((candidate) => !removedIds.has(candidate.candidate.candidateId));
  return {
    policy: TEAM_SCORER_POLICY,
    evaluations,
    frontier,
    removed,
    frontierResolution: frontier.some((candidate) => candidate.status === 'unresolved')
      ? 'contains_unresolved'
      : 'fully_resolved',
  };
}

interface ResolvedChoice {
  readonly option: EngineOfferableOption;
  readonly mechanics: ResolvedTurnMechanics;
}

function resolvedChoice(
  state: EncounterState,
  proposal: EngineTurnProposal,
  queries: EngineQueryPort,
): ResolvedChoice | TeamPlanUnresolvedReason {
  const offered = availableEngineActorOptions(state, proposal.actorId, queries, proposal.expectedRevision);
  const primary = offered.find((option) => option.optionId === proposal.primaryOptionId);
  if (primary === undefined) return 'option_not_offered';
  const primaryResolution = resolveEngineActorOption(state, primary, queries);
  if (primaryResolution.valid) {
    return { option: primary, mechanics: primaryResolution.mechanics };
  }
  const fallback = proposal.fallbackOptionId === null
    ? undefined
    : offered.find((option) => option.optionId === proposal.fallbackOptionId);
  if (fallback === undefined) return 'option_illegal';
  const fallbackResolution = resolveEngineActorOption(state, fallback, queries);
  return fallbackResolution.valid
    ? { option: fallback, mechanics: fallbackResolution.mechanics }
    : 'option_illegal';
}

function optionHasConcreteEffect(option: EngineOfferableOption, movementCostFeet: number): boolean {
  if (movementCostFeet > 0) return true;
  return option.actionSlots.some((slot) => {
    switch (slot.use.kind) {
      case 'attack':
      case 'multiattack':
      case 'saving_throw':
      case 'cast_spell':
      case 'use_world_object':
      case 'dodge':
      case 'hide': return true;
      case 'dash':
      case 'disengage':
      case 'end_turn': return false;
    }
  });
}

function hasConcreteEffect(choice: ResolvedChoice): boolean {
  return optionHasConcreteEffect(choice.option, choice.mechanics.movementCostFeet);
}

function intrinsicWastedReason(
  option: EngineOfferableOption,
  movementCostFeet: number,
): WastedTurnMarker['reason'] | null {
  if (optionHasConcreteEffect(option, movementCostFeet)) return null;
  return option.actionSlots.some((slot) => slot.use.kind === 'dash')
    ? 'zero_feet_dash'
    : 'no_effect_turn';
}

export function classifyWastedTurn(
  option: EngineOfferableOption,
  movementCostFeet: number,
  hasNonWastedLegalAlternative: boolean,
): WastedTurnMarker | null {
  const reason = intrinsicWastedReason(option, movementCostFeet);
  return reason === null || !hasNonWastedLegalAlternative ? null : {
    kind: 'wasted_turn',
    actorId: option.actorId,
    optionId: option.optionId,
    reason,
  };
}

function wastedTurnMarker(
  state: EncounterState,
  choice: ResolvedChoice,
  queries: EngineQueryPort,
): WastedTurnMarker | null {
  const reason = intrinsicWastedReason(choice.option, choice.mechanics.movementCostFeet);
  if (reason === null) return null;
  const hasAlternative = availableEngineActorOptions(
    state,
    choice.option.actorId,
    queries,
    choice.option.revision,
  ).some((alternative) => {
    if (alternative.optionId === choice.option.optionId) return false;
    const resolution = resolveEngineActorOption(state, alternative, queries);
    return resolution.valid && hasConcreteEffect({ option: alternative, mechanics: resolution.mechanics });
  });
  return classifyWastedTurn(choice.option, choice.mechanics.movementCostFeet, hasAlternative);
}

function hasSemanticAttackTarget(option: EngineOfferableOption): boolean {
  return option.actionSlots.some((slot) => {
    const use = slot.use;
    if (use.kind === 'attack') return use.target.kind !== 'combatant';
    if (use.kind === 'multiattack') {
      return use.components.some((component) => component.target.kind !== 'combatant');
    }
    return false;
  });
}

function millionths(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Team scorer probabilities must be finite and non-negative.');
  }
  const scaled = Math.round(value * 1_000_000);
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError('Team scorer probability sum exceeds exact-rational limits.');
  }
  return scaled;
}

function evaluateTeamPlan(
  state: EncounterState,
  candidate: TeamPlanCandidate,
  queries: EngineQueryPort,
): TeamPlanEvaluation {
  const actorIds = candidate.proposals.map((proposal) => proposal.actorId);
  if (new Set(actorIds).size !== actorIds.length) {
    return {
      status: 'unresolved', candidate,
      unresolvedMetrics: ['lethality', 'objective_progress', 'resource_conservation', 'dying_pc_removal', 'wasted_turn'],
      reasons: ['duplicate_actor'],
    };
  }
  const results = candidate.proposals.map((proposal) => resolvedChoice(state, proposal, queries));
  const resolutionReasons = results.filter(
    (result): result is TeamPlanUnresolvedReason => typeof result === 'string',
  );
  if (resolutionReasons.length > 0) {
    return {
      status: 'unresolved', candidate,
      unresolvedMetrics: ['lethality', 'objective_progress', 'resource_conservation', 'dying_pc_removal', 'wasted_turn'],
      reasons: [...new Set(resolutionReasons)],
    };
  }
  const choices = results as readonly ResolvedChoice[];
  const actors = choices.map((choice) => queries.combatant(state, choice.option.actorId));
  if (actors.some((actor) => actor === null)) {
    return {
      status: 'unresolved', candidate,
      unresolvedMetrics: ['lethality', 'objective_progress', 'dying_pc_removal'],
      reasons: ['actor_absent'],
    };
  }
  const sides = new Set(choices.map((choice) =>
    queries.combatant(state, choice.option.actorId)?.profile.kind));
  if (sides.size !== 1 || sides.has(undefined)) {
    return {
      status: 'unresolved', candidate,
      unresolvedMetrics: ['lethality', 'objective_progress', 'dying_pc_removal'],
      reasons: ['mixed_team_sides'],
    };
  }

  const firstActor = choices[0]?.option.actorId;
  const targets = firstActor === undefined ? [] : state.combatants.filter((target) =>
    target.life !== 'dead' && !queries.sameSide(state, firstActor, target.profile.id));
  const outcomes = choices.map((choice) =>
    evaluateOptionOutcome(state, choice.option, choice.mechanics, queries));
  const resolvedDamageTargets = new Set(outcomes.flatMap((outcome) =>
    outcome.status === 'resolved' && outcome.evidence.kind === 'damage'
      ? [outcome.evidence.targetId]
      : []));
  const controlDamageInteraction = outcomes.some((outcome) =>
    outcome.status === 'resolved' && outcome.evidence.kind === 'hard_control' &&
    outcome.evidence.profile.targets.some((targetId) => resolvedDamageTargets.has(targetId)));
  const optionOutcomeUnresolved = controlDamageInteraction ||
    outcomes.some((outcome) => outcome.status === 'unresolved');
  const semanticTargetUnresolved = choices.some((choice) => hasSemanticAttackTarget(choice.option));
  const initiativeRank = new Map(state.initiative.map((entry, index) => [entry.combatant, index] as const));
  const allocationChoices: TacticalAllocationChoice[] = choices
    .map((choice) => ({ actorId: choice.option.actorId, optionId: choice.option.optionId }))
    .sort((left, right) =>
      (initiativeRank.get(left.actorId) ?? Number.MAX_SAFE_INTEGER) -
      (initiativeRank.get(right.actorId) ?? Number.MAX_SAFE_INTEGER));
  const allocations = targets.map((target) => queries.compareAllocations(
    state,
    target.profile.id,
    [{ allocationId: candidate.candidateId, choices: allocationChoices }],
    state.initiative.map((entry) => entry.combatant),
  ).allocations[0]);
  const allocationUnresolved = allocations.some((allocation) =>
    allocation === undefined || allocation.status === 'unresolved' || allocation.killProbability === null);
  if (optionOutcomeUnresolved || semanticTargetUnresolved || allocationUnresolved) {
    return {
      status: 'unresolved', candidate,
      unresolvedMetrics: [
        'lethality',
        ...(targets.some((target) =>
          target.profile.kind === 'player_character' && target.life === 'dying')
          ? ['dying_pc_removal' as const]
          : []),
      ],
      reasons: [
        ...(optionOutcomeUnresolved ? ['option_outcome_unresolved' as const] : []),
        ...(semanticTargetUnresolved ? ['semantic_attack_target_unresolved' as const] : []),
        ...(allocationUnresolved ? ['attack_allocation_unresolved' as const] : []),
      ],
    };
  }

  const markers = choices.flatMap((choice) => {
    const marker = wastedTurnMarker(state, choice, queries);
    return marker === null ? [] : [marker];
  });
  const lethality = allocations.reduce((sum, allocation) =>
    sum + millionths(allocation?.killProbability ?? 0), 0);
  const dyingPcRemoval = targets.reduce((sum, target, index) =>
    target.profile.kind === 'player_character' && target.life === 'dying'
      ? sum + millionths(allocations[index]?.killProbability ?? 0)
      : sum, 0);
  const resolvedOutcomes = outcomes.filter(
    (outcome): outcome is Extract<OptionOutcomeEvaluation, { readonly status: 'resolved' }> =>
      outcome.status === 'resolved',
  );
  const damageEvidence = resolvedOutcomes.flatMap((outcome): readonly DamageOutcomeEvidence[] =>
    outcome.evidence.kind === 'damage' ? [outcome.evidence] : []);
  const nonDamageNet = resolvedOutcomes.filter((outcome) => outcome.evidence.kind !== 'damage')
    .reduce((sum, outcome) => {
    const exact = outcome.ledger.netActionEquivalents;
    return exactRational(
      sum.numerator * exact.denominator + exact.numerator * sum.denominator,
      sum.denominator * exact.denominator,
    );
  }, exactRational(0, 1));
  const combinedDamage = combinedDamageActionEquivalents(state, damageEvidence);
  const netActionEquivalents = exactRational(
    nonDamageNet.numerator * combinedDamage.denominator +
      combinedDamage.numerator * nonDamageNet.denominator,
    nonDamageNet.denominator * combinedDamage.denominator,
  );
  const dyingExact = exactRational(dyingPcRemoval, 1_000_000);
  const wastedExact = exactRational(markers.length, 1);
  return {
    status: 'resolved',
    candidate,
    family: resolvedOutcomes.some((outcome) => outcome.family === 'hard_turn_denial')
      ? 'hard_turn_denial'
      : 'legacy',
    commonVector: teamCommonVector({
      netActionEquivalents,
      dyingPcRemoval: dyingExact,
      wastedTurn: wastedExact,
    }),
    outcomes: resolvedOutcomes,
    vector: teamPlanVector({
      lethality: exactRational(lethality, 1_000_000),
      objectiveProgress: exactRational(choices.filter(hasConcreteEffect).length, 1),
      resourceConservation: exactRational(choices.reduce((sum, choice) =>
        sum + choice.option.resourceCostLabels.length, 0), 1),
      dyingPcRemoval: dyingExact,
      wastedTurn: wastedExact,
    }),
    markers,
  };
}

export function scoreTeamPlans(
  state: EncounterState,
  candidates: readonly TeamPlanCandidate[],
  queries: EngineQueryPort,
): TeamPlanFrontierReport {
  return scoreTeamPlanEvaluations(candidates.map((candidate) =>
    evaluateTeamPlan(state, candidate, queries)));
}

function renderVector(vector: TeamPlanVector): Readonly<Record<TeamPlanMetric, unknown>> {
  return Object.fromEntries(Object.entries(vector).map(([metric, coordinate]) => [metric, {
    exact: coordinate.exact,
    objective: coordinate.objective,
  }])) as Readonly<Record<TeamPlanMetric, unknown>>;
}

function betterMetrics(
  comparison: DominanceComparison<TeamPlanMetric> | DominanceComparison<TeamCommonMetric>,
): readonly (TeamPlanMetric | TeamCommonMetric)[] {
  return (Object.entries(comparison.perMetric) as [TeamPlanMetric | TeamCommonMetric, string][])
    .filter(([, verdict]) => verdict === 'left_better')
    .map(([metric]) => metric);
}

function renderMarker(marker: TeamPlanDominanceMarker): Readonly<Record<string, unknown>> {
  return {
    kind: marker.kind,
    actor_id: marker.actorId,
    option_id: marker.optionId,
    reason: marker.reason,
  };
}

export function renderTeamPlanFrontier(
  report: TeamPlanFrontierReport,
  detailLevel: 'full' | 'candidate_summary' | 'summary' | 'omitted' = 'full',
): Readonly<Record<string, unknown>> {
  if (detailLevel === 'omitted') {
    return {
      policy: report.policy,
      frontier_resolution: report.frontierResolution,
      detail_level: detailLevel,
      frontier_candidate_count: report.frontier.length,
      removed_candidate_count: report.removed.length,
      reason: 'context_size_limit',
    };
  }
  if (detailLevel === 'summary') {
    return {
      policy: report.policy,
      frontier_resolution: report.frontierResolution,
      detail_level: detailLevel,
      frontier_candidate_ids: report.frontier.map((evaluation) =>
        evaluation.candidate.candidateId),
      removed_candidate_ids: report.removed.map((entry) =>
        entry.candidate.candidate.candidateId),
    };
  }
  if (detailLevel === 'candidate_summary') {
    return {
      policy: report.policy,
      frontier_resolution: report.frontierResolution,
      detail_level: detailLevel,
      candidates: report.frontier.map((evaluation) => ({
        candidate_id: evaluation.candidate.candidateId,
        label: evaluation.candidate.label,
        status: evaluation.status,
        ...(evaluation.status === 'resolved'
          ? { wasted_turn_count: evaluation.markers.length }
          : {
              unresolved_metrics: evaluation.unresolvedMetrics,
              reason_codes: evaluation.reasons,
            }),
      })),
      removed: report.removed.map((entry) => ({
        candidate_id: entry.candidate.candidate.candidateId,
        dominated_by_candidate_id: entry.dominatedBy.candidate.candidateId,
        better_metrics: betterMetrics(entry.comparison),
        wasted_turn_count: entry.markers.length,
      })),
    };
  }
  return {
    policy: report.policy,
    frontier_resolution: report.frontierResolution,
    candidates: report.frontier.map((evaluation) => ({
      candidate_id: evaluation.candidate.candidateId,
      label: evaluation.candidate.label,
      status: evaluation.status,
      ...(evaluation.status === 'resolved'
        ? {
            dominance_vector: renderVector(evaluation.vector),
            markers: evaluation.markers.map(renderMarker),
          }
        : {
            unresolved_metrics: evaluation.unresolvedMetrics,
            reason_codes: evaluation.reasons,
          }),
    })),
    removed: report.removed.map((entry) => ({
      candidate_id: entry.candidate.candidate.candidateId,
      dominated_by_candidate_id: entry.dominatedBy.candidate.candidateId,
      better_metrics: betterMetrics(entry.comparison),
      dominance_vector: renderVector(entry.candidate.vector),
      markers: entry.markers.map(renderMarker),
    })),
  };
}
