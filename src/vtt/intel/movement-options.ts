import type { EncounterState } from '../../combat/encounter';
import { MOVEMENT_EVALUATOR_POLICY, type MovementEvaluation } from '../../combat/movement-evaluator';
import type { TacticalAttackEvaluation, TacticalRangeBand } from '../../combat/tactical-evaluator';
import type { CombatantId } from '../../combat/values';
import type { DmIntelRollMode, DmTargetIntelRow } from '../dm-tactical-intel';
import type { EngineStateCapsule } from '../engine-state-capsule';
import type { EngineQueryPort } from '../engine-query-port';
import type { EngineActorOption, EngineOptionId } from '../turn-proposal';
import { intelPolicyVersion, type IntelProviderResult } from './contracts';

export const MOVEMENT_OPTIONS_INTEL_POLICY = intelPolicyVersion('movement-options-v1');

export type MovementIntelRisk = 'none' | 'opportunity_attack' | 'hazard' | 'unresolved';

export interface MovementIntelSnapshot {
  readonly range: TacticalRangeBand | 'unresolved';
  readonly rollMode: DmIntelRollMode;
  readonly expectedDamage: number | null;
}

export interface MovementIntelRow {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly optionId: EngineOptionId | null;
  readonly actionId: string;
  readonly evaluatorPolicy: typeof MOVEMENT_EVALUATOR_POLICY;
  readonly semantic:
    | 'move_5_to_normal_range'
    | 'move_within_speed_to_enable_attack'
    | 'maintain_range'
    | 'other_reposition'
    | 'no_reposition';
  readonly before: MovementIntelSnapshot;
  readonly after: MovementIntelSnapshot | null;
  readonly leastCostMovementFeet: number | null;
  readonly opportunityRisk: MovementIntelRisk;
  readonly hazardRisk: MovementIntelRisk;
  readonly attackEta: {
    readonly status: 'resolved';
    readonly movementCostFeet: number;
    readonly turns: number;
  } | {
    readonly status: 'unreachable' | 'unresolved';
    readonly reason: string;
  };
}

export type MovementOptionsIntelResult = IntelProviderResult<
  typeof MOVEMENT_OPTIONS_INTEL_POLICY,
  { readonly rows: readonly MovementIntelRow[] },
  'movement_input_unavailable'
>;

function actionIdForMovement(option: EngineActorOption | undefined, targetId: CombatantId): string | null {
  const main = option?.actionSlots.find((slot) => slot.slot === 'main')?.use;
  if (main === undefined) return null;
  if (main.kind === 'attack') {
    return main.target.kind === 'combatant' && main.target.combatantId === targetId
      ? String(main.actionId)
      : null;
  }
  if (main.kind === 'multiattack') {
    return main.components.find((component) =>
      component.target.kind === 'combatant' && component.target.combatantId === targetId)?.actionId ?? null;
  }
  return null;
}

function snapshot(verdict: MovementEvaluation['candidates'][number]['before']): MovementIntelSnapshot {
  if (verdict.status === 'unresolved') {
    return { range: 'unresolved', rollMode: 'unresolved', expectedDamage: null };
  }
  const evaluation: TacticalAttackEvaluation = verdict.evaluation;
  return {
    range: evaluation.range.status === 'resolved' ? evaluation.range.band : 'unresolved',
    rollMode: evaluation.rollMode.mode,
    expectedDamage: evaluation.damage.status === 'resolved' ? evaluation.damage.expectedDamage : null,
  };
}

function risk(
  verdict: MovementEvaluation['candidates'][number]['path'],
  kind: 'opportunity' | 'hazard',
): MovementIntelRisk {
  if (verdict.status === 'unreachable') return 'unresolved';
  const selected = kind === 'opportunity' ? verdict.opportunityAttackRisk : verdict.hazardRisk;
  if (selected.status === 'unresolved') return 'unresolved';
  return selected.atRisk ? kind === 'opportunity' ? 'opportunity_attack' : 'hazard' : 'none';
}

function selectedCandidate(evaluation: MovementEvaluation) {
  return [...evaluation.candidates]
    .filter((candidate) => candidate.path.status === 'found' && candidate.semantic.status === 'resolved')
    .sort((left, right) => {
      const leftPriority = left.semantic.status === 'resolved' &&
        (left.semantic.kind === 'move_5_to_normal_range' ||
          left.semantic.kind === 'move_within_speed_to_enable_attack') ? 0 : 1;
      const rightPriority = right.semantic.status === 'resolved' &&
        (right.semantic.kind === 'move_5_to_normal_range' ||
          right.semantic.kind === 'move_within_speed_to_enable_attack') ? 0 : 1;
      const leftCost = left.path.status === 'found' ? left.path.cost : Number.MAX_SAFE_INTEGER;
      const rightCost = right.path.status === 'found' ? right.path.cost : Number.MAX_SAFE_INTEGER;
      const leftDelta = left.deltas.expectedDamage.status === 'resolved'
        ? left.deltas.expectedDamage.delta : Number.NEGATIVE_INFINITY;
      const rightDelta = right.deltas.expectedDamage.status === 'resolved'
        ? right.deltas.expectedDamage.delta : Number.NEGATIVE_INFINITY;
      return leftPriority - rightPriority || leftCost - rightCost || rightDelta - leftDelta;
    })[0] ?? null;
}

function movementRow(
  queries: EngineQueryPort,
  state: EncounterState,
  capsule: EngineStateCapsule,
  row: DmTargetIntelRow,
): MovementIntelRow | null {
  // Normal/melee attacks already usable without movement have no semantic
  // repositioning opportunity. Long-range attacks still run through M4 so a
  // one-square roll/EV upgrade remains visible.
  if (row.rangeLegal && row.minimumMovementFeet === 0 &&
    row.rangeBand !== 'long' && row.rangeBand !== 'unresolved') return null;
  const actor = capsule.projection.combatants.find((candidate) => candidate.id === row.actorId);
  const option = actor?.options.find((candidate) => candidate.optionId === row.optionId);
  const actionId = actionIdForMovement(option, row.targetId) ?? row.actionId;
  if (actionId === null) return null;
  const evaluation = queries.movementOptions(state, row.actorId, row.targetId, actionId);
  if (evaluation === null) return null;
  const candidate = selectedCandidate(evaluation);
  const beforeVerdict = candidate?.before ?? evaluation.candidates[0]?.before;
  if (beforeVerdict === undefined) return null;
  const eta = evaluation.earliestAttackTurn;
  return {
    actorId: row.actorId,
    targetId: row.targetId,
    optionId: row.optionId,
    actionId,
    evaluatorPolicy: evaluation.policy,
    semantic: candidate?.semantic.status === 'resolved' ? candidate.semantic.kind : 'no_reposition',
    before: snapshot(beforeVerdict),
    after: candidate === null ? null : snapshot(candidate.after),
    leastCostMovementFeet: candidate?.path.status === 'found' ? candidate.path.cost : null,
    opportunityRisk: candidate === null ? 'none' : risk(candidate.path, 'opportunity'),
    hazardRisk: candidate === null ? 'none' : risk(candidate.path, 'hazard'),
    attackEta: eta.status === 'resolved'
      ? { status: 'resolved', movementCostFeet: eta.movementCost, turns: eta.turns }
      : { status: eta.status, reason: eta.reason },
  };
}

export function movementOptionsIntel(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
  tacticalRows: readonly DmTargetIntelRow[],
): MovementOptionsIntelResult {
  return {
    policy: MOVEMENT_OPTIONS_INTEL_POLICY,
    status: 'resolved',
    rows: tacticalRows.flatMap((row) => {
      const result = movementRow(queries, state, capsule, row);
      return result === null ? [] : [result];
    }),
  };
}

export function renderMovementIntelRow(row: MovementIntelRow): Readonly<Record<string, unknown>> {
  const renderSnapshot = (value: MovementIntelSnapshot | null) => value === null ? null : {
    range: value.range.toUpperCase(),
    roll: value.rollMode === 'normal' ? 'STRAIGHT' : value.rollMode.toUpperCase(),
    ev: value.expectedDamage === null ? null : Math.round(value.expectedDamage),
  };
  return {
    policy: MOVEMENT_OPTIONS_INTEL_POLICY,
    evaluator_policy: row.evaluatorPolicy,
    actor_id: row.actorId,
    target_id: row.targetId,
    option_id: row.optionId,
    action_id: row.actionId,
    semantic: row.semantic,
    move_feet: row.leastCostMovementFeet,
    before: renderSnapshot(row.before),
    after: renderSnapshot(row.after),
    opportunity_risk: row.opportunityRisk,
    hazard_risk: row.hazardRisk,
    attack_eta: row.attackEta.status === 'resolved'
      ? `P${String(row.attackEta.movementCostFeet)}/T+${String(row.attackEta.turns)}`
      : `${row.attackEta.status.toUpperCase()}:${row.attackEta.reason}`,
  };
}

export function renderMovementContextRow(row: MovementIntelRow): Readonly<Record<string, unknown>> {
  const rendered: Record<string, unknown> = { ...renderMovementIntelRow(row) };
  delete rendered['policy'];
  delete rendered['evaluator_policy'];
  delete rendered['actor_id'];
  delete rendered['option_id'];
  return rendered;
}
