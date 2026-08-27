import type { EncounterState } from '../combat/encounter';
import { gridDistance, type GridCell } from '../combat/grid';
import type { MonsterAction, MonsterAttackAction } from '../combat/statblock';
import { SPELL_MANIFEST } from '../combat/spells/manifest';
import type { CombatantId } from '../combat/values';
import type { ArenaPromptEnvelope } from './arena-prompt';
import {
  canonicalEngineQueryPort,
  engineActionRangeFeet,
  engineAttackRangeFeet,
  type EngineTargetSelector,
} from './engine-query-port';
import {
  resolvePrototypeIntent,
  type PrototypeIntent,
  type PrototypeIntentChoice,
  type PrototypeIntentResult,
} from './intent-resolver';
import type {
  DecisionProgram,
  PlanAction,
  RoundPlan,
  TargetSelector,
} from './dm-bridge/round-plan-contract';

export interface ArenaPath {
  readonly cells: readonly GridCell[];
  readonly cost: number;
}

export type ArenaIntentChoice = PrototypeIntentChoice;
export type ArenaIntent = PrototypeIntent;
export type ArenaIntentResult = PrototypeIntentResult;

export function arenaTokenPosition(state: EncounterState, id: CombatantId): GridCell | null {
  return canonicalEngineQueryPort.tokenPosition(state, id);
}

export function arenaCombatant(state: EncounterState, id: CombatantId) {
  return canonicalEngineQueryPort.combatant(state, id);
}

export function arenaSameSide(state: EncounterState, left: CombatantId, right: CombatantId): boolean {
  return canonicalEngineQueryPort.sameSide(state, left, right);
}

export function resolveArenaTarget(
  state: EncounterState,
  actor: CombatantId,
  selector: TargetSelector,
): CombatantId | null {
  const engineSelector: EngineTargetSelector = selector.kind === 'combatant'
    ? { kind: 'combatant', combatantId: selector.combatantId }
    : { kind: 'nearest_visible_enemy' };
  return canonicalEngineQueryPort.resolveTarget(state, actor, engineSelector);
}

export function arenaMonsterActions(
  state: EncounterState,
  actor: CombatantId,
): readonly MonsterAction[] {
  return canonicalEngineQueryPort.actions(state, actor);
}

export function arenaAttackRange(action: MonsterAttackAction): number {
  return engineAttackRangeFeet(action);
}

/** Transitional prototype name backed by the canonical movement service. */
export function arenaPathCost(
  state: EncounterState,
  actor: CombatantId,
  destination: GridCell,
  maximumCost = Number.POSITIVE_INFINITY,
): ArenaPath | null {
  const result = canonicalEngineQueryPort.path(state, {
    actorId: actor,
    destination,
    movement: 'normal',
    maximumFeet: Number.isFinite(maximumCost)
      ? maximumCost
      : state.bounds.columns * state.bounds.rows * 10,
  });
  return result.legal ? { cells: result.cells, cost: result.costFeet } : null;
}

export function arenaMovementCost(
  state: EncounterState,
  actor: CombatantId,
  destination: GridCell,
): number | null {
  return arenaPathCost(state, actor, destination)?.cost ?? null;
}

function actionRange(
  actions: readonly MonsterAction[],
  selected: MonsterAction,
): number | null {
  return engineActionRangeFeet(actions, selected);
}

export type ArenaReachResult =
  | {
      readonly legal: true;
      readonly distanceFeet: number;
      readonly rangeFeet: number;
    }
  | { readonly legal: false; readonly refusals: readonly string[] };

export function arenaReachCheck(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  actionId: string,
  originOverride?: GridCell,
): ArenaReachResult {
  const result = canonicalEngineQueryPort.reach(state, {
    actorId: actor,
    targetId: target,
    actionId,
    ...(originOverride === undefined ? {} : { origin: originOverride }),
  });
  if (result.legal) return result;
  const refusals = result.codes.map((code): string => {
    switch (code) {
      case 'actor_not_placed_monster': return `${actor}: actor is not a placed monster`;
      case 'target_absent': return `${actor}: target is absent`;
      case 'target_same_side': return `${actor}: target is on the actor's side`;
      case 'target_not_placed': return `${actor}: target has no token`;
      case 'action_absent': return `${actor}: action ${actionId} is absent from the statblock`;
      case 'action_range_unresolved': return `${actor}: action ${actionId} has no engine-resolvable target range`;
      case 'target_out_of_range': return `${actor}: target is outside ${actionId} reach/range`;
    }
  });
  return { legal: false, refusals };
}

function actionRefusals(
  action: PlanAction,
  actor: CombatantId,
  state: EncounterState,
): readonly string[] {
  const acting = arenaCombatant(state, actor);
  const origin = arenaTokenPosition(state, actor);
  if (acting?.profile.kind !== 'monster' || origin === null) return [`${actor}: actor is not a placed monster`];
  const actions = arenaMonsterActions(state, actor);
  const refusals: string[] = [];
  if (action.kind === 'retreat_toward') {
    const budget = action.maximumFeet ?? acting.profile.rules.speed;
    if (budget > acting.profile.rules.speed) refusals.push(`${actor}: movement exceeds speed`);
    const cost = arenaMovementCost(state, actor, action.destination);
    if (cost === null) refusals.push(`${actor}: destination is blocked, occupied, or unreachable`);
    else if (cost > budget) refusals.push(`${actor}: route costs ${String(cost)} feet including difficult terrain`);
    return refusals;
  }
  if (action.kind === 'move_toward' &&
    (action.maximumFeet ?? acting.profile.rules.speed) > acting.profile.rules.speed) {
    refusals.push(`${actor}: movement exceeds speed`);
  }
  if (action.kind === 'use_action' && action.action === 'action_surge') {
    const available = acting.profile.rules.featureEffects?.some(
      (effect) => effect.payload.kind === 'action_surge',
    ) ?? false;
    if (!available) refusals.push(`${actor}: Action Surge is absent from the combatant profile`);
  }
  if (!('target' in action) || action.target === null) return refusals;
  const target = resolveArenaTarget(state, actor, action.target);
  if (target === null || arenaCombatant(state, target) === null) {
    return [...refusals, `${actor}: target is absent`];
  }
  if (arenaSameSide(state, actor, target)) refusals.push(`${actor}: target is on the actor's side`);
  const targetPosition = arenaTokenPosition(state, target);
  if (targetPosition === null) return [...refusals, `${actor}: target has no token`];
  const distance = gridDistance(origin, targetPosition);
  if (action.kind === 'attack' || action.kind === 'bonus_attack') {
    const selected = action.kind === 'attack' && action.attackId !== undefined
      ? actions.find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === action.attackId)
      : actions.find((candidate): candidate is MonsterAttackAction => candidate.kind === 'attack');
    if (selected === undefined) refusals.push(`${actor}: attack is absent from the statblock`);
    else if (distance > arenaAttackRange(selected)) {
      refusals.push(`${actor}: target is outside ${selected.id} reach/range`);
    }
  }
  if (action.kind === 'force_save') {
    const selected = actions.find((candidate) => candidate.kind === 'saving_throw');
    if (selected === undefined) refusals.push(`${actor}: saving-throw action is absent from the statblock`);
    else if (distance > selected.target.rangeFeet) {
      refusals.push(`${actor}: save target is outside action range`);
    }
  }
  if (action.kind === 'cast_spell') {
    const spellcasting = actions.find((candidate) =>
      candidate.kind === 'spellcasting' &&
      candidate.spells.some((spell) => spell.id === action.spellId));
    if (spellcasting === undefined) refusals.push(`${actor}: spell is absent from the statblock`);
  }
  return refusals;
}

function slotCost(action: PlanAction): 0 | 1 {
  if (action.kind !== 'cast_spell') return 0;
  return SPELL_MANIFEST.find((spell) => spell.id === action.spellId)?.level === 0 ? 0 : 1;
}

function maximumSlotActions(program: DecisionProgram): number {
  switch (program.kind) {
    case 'action':
      return slotCost(program.action) +
        (program.riders ?? []).reduce((total, rider) => total + slotCost(rider.followUpAction), 0);
    case 'if':
      return Math.max(maximumSlotActions(program.then), maximumSlotActions(program.else));
    case 'priority':
      return Math.max(...program.choices.map(maximumSlotActions));
  }
}

function programActions(program: DecisionProgram): readonly PlanAction[] {
  switch (program.kind) {
    case 'action': return [program.action, ...(program.riders ?? []).map((rider) => rider.followUpAction)];
    case 'if': return [...programActions(program.then), ...programActions(program.else)];
    case 'priority': return program.choices.flatMap(programActions);
  }
}

export function validateArenaPlan(
  plan: RoundPlan,
  state: EncounterState,
  envelope?: ArenaPromptEnvelope,
): readonly string[] {
  const refusals: string[] = [];
  if (envelope !== undefined && (
    plan.encounterId !== envelope.encounterId ||
    plan.requestId !== envelope.requestId ||
    plan.expectedRevision !== envelope.expectedRevision ||
    plan.round !== envelope.round
  )) refusals.push('round-plan envelope does not match the actual room request');
  const expected = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life !== 'dead'
      ? [combatant.profile.id]
      : []);
  const actual = plan.monsters.map((entry) => entry.monsterId);
  if (new Set(actual).size !== actual.length) refusals.push('monster programs contain duplicate actors');
  for (const id of expected) if (!actual.includes(id)) refusals.push(`${id}: living monster program is missing`);
  for (const entry of plan.monsters) {
    if (!expected.includes(entry.monsterId)) refusals.push(`${entry.monsterId}: actor is not a living monster`);
    if (maximumSlotActions(entry.program) > 1) refusals.push(`${entry.monsterId}: program can spend more than one slot`);
    for (const action of programActions(entry.program)) {
      refusals.push(...actionRefusals(action, entry.monsterId, state));
    }
  }
  return refusals;
}

export function declareArenaIntent(
  state: EncounterState,
  actor: CombatantId,
  intent: ArenaIntent,
): ArenaIntentResult {
  return resolvePrototypeIntent(state, actor, intent);
}
