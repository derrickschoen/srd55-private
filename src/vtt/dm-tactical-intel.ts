import type { EncounterState } from '../combat/encounter';
import type { MonsterAction } from '../combat/statblock';
import {
  TACTICAL_EVALUATOR_POLICY,
  type AttackRollModeReason,
  type TacticalAttackEvaluation,
  type TacticalRangeBand,
  type TacticalUnresolvedReason,
} from '../combat/tactical-evaluator';
import type { CombatantId } from '../combat/values';
import type { EngineStateCapsule } from './engine-state-capsule';
import type { EngineQueryPort } from './engine-query-port';
import type { EngineActorOption, EngineOptionId } from './turn-proposal';
import { ENGINE_FAILURE_MODES_POLICY } from './engine-failure-modes';
import { legalMultiattackCombinations } from './turn-option-registry';

export const DM_TURN_INTEL_POLICY = 'dm-turn-intel-v1' as const;
export const DM_INTEL_QUERY_POLICY = 'dm-intel-query-v1' as const;
export const DM_INTEL_CAPTURE_POLICY = 'dm-intel-capture-v1' as const;

export type DmIntelRollMode = 'normal' | 'advantage' | 'disadvantage' | 'mixed' | 'unresolved';

export interface DmTargetIntelRow {
  readonly policy: typeof DM_TURN_INTEL_POLICY;
  readonly evaluatorPolicy: typeof TACTICAL_EVALUATOR_POLICY;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly optionId: EngineOptionId | null;
  readonly actionId: string | null;
  readonly attackCount: number;
  readonly kind: 'offense' | 'approach';
  readonly visible: boolean | null;
  readonly cover: 'none' | 'half' | 'three_quarters' | 'total' | 'unknown';
  readonly distanceFeet: number | null;
  readonly rangeBand: TacticalRangeBand | 'unresolved';
  readonly rangeLegal: boolean;
  readonly rollMode: DmIntelRollMode;
  readonly rollModeReasons: readonly AttackRollModeReason[];
  readonly hitProbability: number | null;
  readonly criticalProbability: number | null;
  readonly expectedDamage: number | null;
  readonly deathFailureOnHit: boolean;
  readonly failuresOnHit: 0 | 1;
  readonly failuresOnCritical: 0 | 2;
  readonly automaticCriticalMaximumDistanceFeet: number | null;
  readonly minimumMovementFeet: number | null;
  readonly unresolvedReasons: readonly TacticalUnresolvedReason[];
}

export interface DmActorIntelCapture {
  readonly actorId: CombatantId;
  readonly offeredOptionIds: readonly EngineOptionId[];
  readonly rows: readonly DmTargetIntelRow[];
}

export interface DmIntelCapture {
  readonly policy: typeof DM_INTEL_CAPTURE_POLICY;
  readonly policyVersions: {
    readonly evaluator: typeof TACTICAL_EVALUATOR_POLICY;
    readonly renderer: typeof DM_TURN_INTEL_POLICY;
    readonly query: typeof DM_INTEL_QUERY_POLICY;
    readonly capture: typeof DM_INTEL_CAPTURE_POLICY;
    readonly initiative: EngineStateCapsule['projection']['initiative']['policy'];
    readonly failureModes: typeof ENGINE_FAILURE_MODES_POLICY;
  };
  readonly actors: readonly DmActorIntelCapture[];
}

interface AttackCandidate {
  readonly actionId: string;
  readonly attackActionIds: readonly string[];
}

function attackCandidates(actions: readonly MonsterAction[]): readonly AttackCandidate[] {
  return actions.flatMap((action): readonly AttackCandidate[] => {
    switch (action.kind) {
      case 'attack': return [{ actionId: action.id, attackActionIds: [action.id] }];
      case 'multiattack': return legalMultiattackCombinations(action, actions).map((combination) => ({
        actionId: action.id,
        attackActionIds: combination.map((attack) => attack.id),
      }));
      case 'saving_throw':
      case 'spellcasting': return [];
    }
  });
}

function optionTargets(option: EngineActorOption): readonly CombatantId[] {
  return option.actionSlots.flatMap((slot): readonly CombatantId[] => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) =>
        target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function optionActionId(option: EngineActorOption): string | null {
  const main = option.actionSlots.find((slot) => slot.slot === 'main')?.use;
  if (main === undefined) return null;
  switch (main.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': return main.actionId;
    case 'cast_spell': return main.sourceActionId;
    case 'use_world_object': return main.actionId;
    case 'dodge':
    case 'disengage':
    case 'dash':
    case 'end_turn': return main.kind;
  }
}

function selectedOption(
  actor: EngineStateCapsule['projection']['combatants'][number],
  targetId: CombatantId,
  actionId: string,
  attackActionIds: readonly string[],
): EngineActorOption | null {
  return actor.options.find((option) =>
    optionActionId(option) === actionId && optionTargets(option).includes(targetId) &&
    option.actionSlots.some((slot) => slot.slot === 'main' && (
      slot.use.kind === 'attack'
        ? attackActionIds.length === 1 && slot.use.actionId === attackActionIds[0]
        : slot.use.kind === 'multiattack' &&
          slot.use.components.map((component) => component.actionId).join('|') === attackActionIds.join('|')
    ))) ?? null;
}

function unique<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function worstRangeBand(evaluations: readonly TacticalAttackEvaluation[]): TacticalRangeBand | 'unresolved' {
  const ranks: Readonly<Record<TacticalRangeBand, number>> = { melee: 0, normal: 1, long: 2, out: 3 };
  const bands = evaluations.flatMap((evaluation): readonly TacticalRangeBand[] =>
    evaluation.range.status === 'resolved' ? [evaluation.range.band] : []);
  if (bands.length !== evaluations.length) return 'unresolved';
  return [...bands].sort((left, right) => ranks[right] - ranks[left])[0] ?? 'unresolved';
}

function combinedRollMode(evaluations: readonly TacticalAttackEvaluation[]): DmIntelRollMode {
  const modes = unique(evaluations.map((evaluation) => evaluation.rollMode.mode));
  return modes.length === 1 ? modes[0] ?? 'unresolved' : modes.length > 1 ? 'mixed' : 'unresolved';
}

function movementNeed(
  actor: EngineStateCapsule['projection']['combatants'][number],
  targetId: CombatantId,
  actionId: string,
  currentlyLegal: boolean,
): number | null {
  if (currentlyLegal) return 0;
  return actor.actionApproaches.find((approach) =>
    approach.actionId === actionId && approach.targetId === targetId)?.minimumMovementFeet ?? null;
}

function candidateRow(
  state: EncounterState,
  queries: EngineQueryPort,
  actor: EngineStateCapsule['projection']['combatants'][number],
  targetId: CombatantId,
  candidate: AttackCandidate,
): DmTargetIntelRow | null {
  const evaluations = candidate.attackActionIds.map((actionId) =>
    queries.tacticalAttack(state, actor.id, targetId, actionId));
  if (evaluations.some((evaluation) => evaluation === null)) return null;
  const attacks = evaluations.filter((evaluation): evaluation is TacticalAttackEvaluation => evaluation !== null);
  if (attacks.length === 0) return null;
  const visibility = queries.visibility(state, actor.id, targetId);
  const cover = queries.cover(state, actor.id, targetId);
  const rangeLegal = attacks.every((evaluation) =>
    evaluation.range.status === 'resolved' && evaluation.range.legal);
  const probabilityResolved = attacks.every((evaluation) => evaluation.probabilities.status === 'resolved');
  const damageResolved = attacks.every((evaluation) => evaluation.damage.status === 'resolved');
  const hitProbability = probabilityResolved
    ? 1 - attacks.reduce((miss, evaluation) =>
      miss * (evaluation.probabilities.status === 'resolved' ? evaluation.probabilities.miss : 1), 1)
    : null;
  const criticalProbability = probabilityResolved
    ? 1 - attacks.reduce((nonCritical, evaluation) =>
      nonCritical * (1 - (evaluation.probabilities.status === 'resolved'
        ? evaluation.probabilities.critical : 0)), 1)
    : null;
  const expectedDamage = damageResolved
    ? attacks.reduce((total, evaluation) =>
      total + (evaluation.damage.status === 'resolved' ? evaluation.damage.expectedDamage : 0), 0)
    : null;
  const firstRange = attacks[0]?.range;
  const minimumMovementFeet = movementNeed(actor, targetId, candidate.actionId, rangeLegal);
  const option = selectedOption(actor, targetId, candidate.actionId, candidate.attackActionIds);
  return {
    policy: DM_TURN_INTEL_POLICY,
    evaluatorPolicy: TACTICAL_EVALUATOR_POLICY,
    actorId: actor.id,
    targetId,
    optionId: option?.optionId ?? null,
    actionId: candidate.actionId,
    attackCount: attacks.length,
    kind: minimumMovementFeet === 0 ? 'offense' : 'approach',
    visible: visibility?.visible ?? null,
    cover: cover?.tier ?? 'unknown',
    distanceFeet: firstRange?.distanceFeet ?? null,
    rangeBand: worstRangeBand(attacks),
    rangeLegal,
    rollMode: combinedRollMode(attacks),
    rollModeReasons: unique(attacks.flatMap((evaluation) => evaluation.rollMode.reasons)),
    hitProbability,
    criticalProbability,
    expectedDamage,
    deathFailureOnHit: attacks.some((evaluation) => evaluation.consequences.deathFailureOnHit),
    failuresOnHit: attacks.some((evaluation) => evaluation.consequences.failuresOnHit === 1) ? 1 : 0,
    failuresOnCritical: attacks.some((evaluation) => evaluation.consequences.failuresOnCritical === 2) ? 2 : 0,
    automaticCriticalMaximumDistanceFeet: attacks.reduce<number | null>((maximum, evaluation) => {
      const candidateMaximum = evaluation.consequences.automaticCriticalMaximumDistanceFeet;
      if (candidateMaximum === null) return maximum;
      return maximum === null ? candidateMaximum : Math.max(maximum, candidateMaximum);
    }, null),
    minimumMovementFeet,
    unresolvedReasons: unique(attacks.flatMap((evaluation) => evaluation.unresolved)),
  };
}

function compareRows(left: DmTargetIntelRow, right: DmTargetIntelRow): number {
  const leftImmediate = left.rangeLegal && left.visible === true && left.cover !== 'total' ? 0 : 1;
  const rightImmediate = right.rangeLegal && right.visible === true && right.cover !== 'total' ? 0 : 1;
  if (leftImmediate !== rightImmediate) return leftImmediate - rightImmediate;
  const leftMovement = left.minimumMovementFeet ?? Number.MAX_SAFE_INTEGER;
  const rightMovement = right.minimumMovementFeet ?? Number.MAX_SAFE_INTEGER;
  if (leftMovement !== rightMovement) return leftMovement - rightMovement;
  const leftDamage = left.expectedDamage ?? -1;
  const rightDamage = right.expectedDamage ?? -1;
  if (leftDamage !== rightDamage) return rightDamage - leftDamage;
  const targetOrder = left.targetId.localeCompare(right.targetId);
  if (targetOrder !== 0) return targetOrder;
  return (left.actionId ?? '').localeCompare(right.actionId ?? '');
}

function unresolvedTargetRow(
  state: EncounterState,
  queries: EngineQueryPort,
  actor: EngineStateCapsule['projection']['combatants'][number],
  targetId: CombatantId,
): DmTargetIntelRow {
  const action = actor.actions.find((candidate) => candidate.available) ?? actor.actions[0];
  const actionId = action?.actionId ?? null;
  const reach = actionId === null ? null : queries.reach(state, { actorId: actor.id, targetId, actionId });
  const visibility = queries.visibility(state, actor.id, targetId);
  const cover = queries.cover(state, actor.id, targetId);
  const approach = actionId === null ? null : actor.actionApproaches.find((candidate) =>
    candidate.actionId === actionId && candidate.targetId === targetId)?.minimumMovementFeet ?? null;
  return {
    policy: DM_TURN_INTEL_POLICY,
    evaluatorPolicy: TACTICAL_EVALUATOR_POLICY,
    actorId: actor.id,
    targetId,
    optionId: actionId === null ? null : selectedOption(actor, targetId, actionId, [actionId])?.optionId ?? null,
    actionId,
    attackCount: 0,
    kind: reach?.legal === true ? 'offense' : 'approach',
    visible: visibility?.visible ?? null,
    cover: cover?.tier ?? 'unknown',
    distanceFeet: reach?.legal === true ? reach.distanceFeet : null,
    rangeBand: reach?.legal === true ? reach.rangeBand : 'unresolved',
    rangeLegal: reach?.legal === true,
    rollMode: 'unresolved',
    rollModeReasons: [],
    hitProbability: null,
    criticalProbability: null,
    expectedDamage: null,
    deathFailureOnHit: false,
    failuresOnHit: 0,
    failuresOnCritical: 0,
    automaticCriticalMaximumDistanceFeet: null,
    minimumMovementFeet: reach?.legal === true ? 0 : approach,
    unresolvedReasons: ['damage_unresolved'],
  };
}

export function exactDmIntelMatrix(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
  actorIds: readonly CombatantId[] = capsule.request?.actors ?? [],
): readonly DmTargetIntelRow[] {
  const requested = new Set(actorIds);
  const actors = capsule.projection.combatants
    .filter((actor) => requested.has(actor.id) && actor.side === 'monster' && actor.life !== 'dead')
    .sort((left, right) => left.id.localeCompare(right.id));
  return actors.flatMap((actor) => {
    const targets = capsule.projection.combatants
      .filter((target) => target.side !== actor.side && target.life !== 'dead')
      .sort((left, right) => left.id.localeCompare(right.id));
    const candidates = attackCandidates(queries.actions(state, actor.id));
    return targets.flatMap((target): readonly DmTargetIntelRow[] => {
      const rows = candidates.flatMap((candidate) => {
        const row = candidateRow(state, queries, actor, target.id, candidate);
        return row === null ? [] : [row];
      }).sort(compareRows);
      return [rows[0] ?? unresolvedTargetRow(state, queries, actor, target.id)];
    });
  });
}

export function topDmActorIntelRows(
  rows: readonly DmTargetIntelRow[],
  actorId: CombatantId,
  maximum = 3,
): readonly DmTargetIntelRow[] {
  return rows.filter((row) => row.actorId === actorId && isInformativeDmIntelRow(row))
    .sort(compareRows).slice(0, maximum);
}

/**
 * Identity and an unresolved reason do not make a tactical row informative.
 * This predicate deliberately ignores why the providers returned absence; the
 * caller may report the unresolved reasons separately, but must not ship a row
 * whose tactical payload is entirely absence/unknown.
 */
export function isInformativeDmIntelRow(row: DmTargetIntelRow): boolean {
  return row.visible !== null || row.cover !== 'unknown' || row.distanceFeet !== null ||
    row.rangeBand !== 'unresolved' || row.rollMode !== 'unresolved' ||
    row.hitProbability !== null || row.criticalProbability !== null ||
    row.expectedDamage !== null || row.minimumMovementFeet !== null ||
    row.deathFailureOnHit || row.failuresOnHit !== 0 || row.failuresOnCritical !== 0 ||
    row.automaticCriticalMaximumDistanceFeet !== null;
}

export function informativeDmIntelRows(
  rows: readonly DmTargetIntelRow[],
): readonly DmTargetIntelRow[] {
  return rows.filter(isInformativeDmIntelRow);
}

const PROBABILITY_MARKS = [
  { value: 0, label: '≈0' },
  { value: 0.25, label: '≈1/4' },
  { value: 1 / 3, label: '≈1/3' },
  { value: 0.5, label: '≈1/2' },
  { value: 2 / 3, label: '≈2/3' },
  { value: 0.75, label: '≈3/4' },
  { value: 1, label: '≈1' },
] as const;

export function coarseProbability(probability: number | null): string | null {
  if (probability === null) return null;
  return [...PROBABILITY_MARKS].sort((left, right) =>
    Math.abs(left.value - probability) - Math.abs(right.value - probability))[0]?.label ?? null;
}

export function renderDmIntelRow(row: DmTargetIntelRow): Readonly<Record<string, unknown>> {
  const consequenceCodes = [
    ...(row.deathFailureOnHit ? ['death_failure_on_hit'] : []),
    ...(row.failuresOnCritical === 2 ? ['two_death_failures_on_critical'] : []),
    ...(row.automaticCriticalMaximumDistanceFeet === null
      ? [] : [`automatic_critical_within_${String(row.automaticCriticalMaximumDistanceFeet)}_feet`]),
  ];
  return {
    policy: DM_TURN_INTEL_POLICY,
    actor_id: row.actorId,
    target_id: row.targetId,
    option_id: row.optionId,
    action_id: row.actionId,
    attacks: row.attackCount,
    kind: row.kind,
    visibility: row.visible === null ? 'UNKNOWN' : row.visible ? 'VISIBLE' : 'HIDDEN',
    cover: row.cover.toUpperCase(),
    range: row.rangeBand.toUpperCase(),
    distance_feet: row.distanceFeet,
    roll_mode: row.rollMode === 'normal' ? 'STRAIGHT' : row.rollMode.toUpperCase(),
    reason_codes: row.rollModeReasons,
    p_hit: coarseProbability(row.hitProbability),
    ev: row.expectedDamage === null ? null : Math.round(row.expectedDamage),
    consequence_codes: consequenceCodes,
    movement_need_feet: row.minimumMovementFeet,
  };
}

/** Actor envelope already binds actor and renderer policy; omit those repeated bytes in always-on context. */
export function renderDmContextIntelRow(row: DmTargetIntelRow): Readonly<Record<string, unknown>> {
  const compact: Record<string, unknown> = { ...renderDmIntelRow(row) };
  delete compact['policy'];
  delete compact['actor_id'];
  delete compact['option_id'];
  if (row.attackCount === 1) delete compact['attacks'];
  if (row.rollModeReasons.length === 0) delete compact['reason_codes'];
  if (!row.deathFailureOnHit && row.automaticCriticalMaximumDistanceFeet === null) {
    delete compact['consequence_codes'];
  }
  for (const key of ['action_id', 'distance_feet', 'p_hit', 'ev', 'movement_need_feet'] as const) {
    if (compact[key] === null) delete compact[key];
  }
  if (compact['visibility'] === 'UNKNOWN') delete compact['visibility'];
  if (compact['cover'] === 'UNKNOWN') delete compact['cover'];
  if (compact['range'] === 'UNRESOLVED') delete compact['range'];
  if (compact['roll_mode'] === 'UNRESOLVED') delete compact['roll_mode'];
  return compact;
}

function futureInitiativeOrder(capsule: EngineStateCapsule): readonly CombatantId[] {
  const entries = capsule.projection.initiative.timeline.initiative;
  const current = entries.findIndex((entry) => entry.current);
  const ordered = current < 0 ? entries : [...entries.slice(current), ...entries.slice(0, current)];
  return ordered.filter((entry) => entry.life !== 'dead').map((entry) => entry.combatant);
}

export function salientInitiativeWindow(
  capsule: EngineStateCapsule,
  topRows: readonly DmTargetIntelRow[],
): string | null {
  const row = topRows[0];
  if (row === undefined || !row.deathFailureOnHit) return null;
  const target = capsule.projection.initiative.timeline.initiative
    .find((entry) => entry.combatant === row.targetId);
  if (target?.life !== 'dying') return null;
  const order = futureInitiativeOrder(capsule);
  const actorPosition = order.indexOf(row.actorId);
  const targetPosition = order.indexOf(row.targetId);
  if (actorPosition < 0 || targetPosition < 0 || actorPosition >= targetPosition) return null;
  return `WINDOW ${String(row.actorId)} before ${String(row.targetId)} death-save turn`;
}

export function captureDmIntel(
  state: EncounterState,
  capsule: EngineStateCapsule,
  queries: EngineQueryPort,
): DmIntelCapture {
  const actors = capsule.projection.combatants
    .filter((actor) => capsule.request?.actors.includes(actor.id) === true && actor.side === 'monster')
    .sort((left, right) => left.id.localeCompare(right.id));
  const matrix = exactDmIntelMatrix(state, capsule, queries, actors.map((actor) => actor.id));
  return {
    policy: DM_INTEL_CAPTURE_POLICY,
    policyVersions: {
      evaluator: TACTICAL_EVALUATOR_POLICY,
      renderer: DM_TURN_INTEL_POLICY,
      query: DM_INTEL_QUERY_POLICY,
      capture: DM_INTEL_CAPTURE_POLICY,
      initiative: capsule.projection.initiative.policy,
      failureModes: ENGINE_FAILURE_MODES_POLICY,
    },
    actors: actors.map((actor) => ({
      actorId: actor.id,
      offeredOptionIds: actor.options.map((option) => option.optionId),
      rows: matrix.filter((row) => row.actorId === actor.id),
    })),
  };
}

export function fullInitiativeIntel(capsule: EngineStateCapsule): Readonly<Record<string, unknown>> {
  return {
    policy: capsule.projection.initiative.policy,
    order: futureInitiativeOrder(capsule),
    upcoming: capsule.projection.initiative.timeline.upcoming,
  };
}

export function pairwiseInitiativeIntel(
  capsule: EngineStateCapsule,
  pairs: readonly { readonly actorId: CombatantId; readonly targetId: CombatantId }[],
): Readonly<Record<string, unknown>> {
  const order = futureInitiativeOrder(capsule);
  return {
    policy: capsule.projection.initiative.policy,
    pairs: pairs.map((pair) => ({
      actor_id: pair.actorId,
      target_id: pair.targetId,
      actor_before_target: order.indexOf(pair.actorId) >= 0 &&
        order.indexOf(pair.targetId) >= 0 && order.indexOf(pair.actorId) < order.indexOf(pair.targetId),
    })),
  };
}
