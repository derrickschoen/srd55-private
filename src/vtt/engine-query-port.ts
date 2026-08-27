import { combatantsAreAllies } from '../combat/allies';
import {
  encounterMonsterActions,
  encounterMovementWorld,
  type EncounterCombatantState,
  type EncounterState,
} from '../combat/encounter';
import { gridDistance, type GridCell } from '../combat/grid';
import { findPath } from '../combat/movement';
import { attackRangeVerdict } from '../combat/range';
import type { MonsterAction, MonsterAttackAction } from '../combat/statblock';
import { feet, type CombatantId } from '../combat/values';

export type EngineTargetSelector =
  | { readonly kind: 'combatant'; readonly combatantId: CombatantId }
  | {
      readonly kind:
        | 'nearest_visible_enemy'
        | 'lowest_hp_visible_enemy'
        | 'most_injured_visible_ally'
        | 'current_threat';
    }
  | {
      readonly kind: 'enemy_threatening_ally';
      readonly allyId: CombatantId;
    };

export interface EnginePathRequest {
  readonly actorId: CombatantId;
  readonly destination: GridCell;
  readonly movement: 'normal' | 'dash';
  readonly maximumFeet?: number;
}

export type EnginePathResult =
  | {
      readonly legal: true;
      readonly cells: readonly GridCell[];
      readonly costFeet: number;
      readonly budgetFeet: number;
    }
  | {
      readonly legal: false;
      readonly code: 'actor_not_placed' | 'destination_unreachable' | 'insufficient_movement';
    };

export interface EngineReachRequest {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly actionId: string;
  readonly origin?: GridCell;
}

export type EngineReachResult =
  | {
      readonly legal: true;
      readonly distanceFeet: number;
      readonly rangeFeet: number;
    }
  | {
      readonly legal: false;
      readonly codes: readonly (
        | 'actor_not_placed_monster'
        | 'target_absent'
        | 'target_same_side'
        | 'target_not_placed'
        | 'action_absent'
        | 'action_range_unresolved'
        | 'target_out_of_range'
      )[];
    };

export interface EngineQueryPort {
  combatant(state: EncounterState, id: CombatantId): EncounterCombatantState | null;
  tokenPosition(state: EncounterState, id: CombatantId): GridCell | null;
  sameSide(state: EncounterState, left: CombatantId, right: CombatantId): boolean;
  actions(state: EncounterState, actorId: CombatantId): readonly MonsterAction[];
  resolveTarget(
    state: EncounterState,
    actorId: CombatantId,
    selector: EngineTargetSelector,
  ): CombatantId | null;
  path(state: EncounterState, request: EnginePathRequest): EnginePathResult;
  reach(state: EncounterState, request: EngineReachRequest): EngineReachResult;
}

export function engineAttackRangeFeet(action: MonsterAttackAction): number {
  switch (action.delivery.kind) {
    case 'melee': return action.delivery.reachFeet;
    case 'ranged': return action.delivery.rangeFeet;
    case 'melee_or_ranged': return action.delivery.rangeFeet;
  }
}

export function engineActionRangeFeet(
  actions: readonly MonsterAction[],
  selected: MonsterAction,
): number | null {
  switch (selected.kind) {
    case 'attack': return engineAttackRangeFeet(selected);
    case 'saving_throw': return selected.target.rangeFeet;
    case 'multiattack': {
      const ranges = selected.actionIds.flatMap((id) => {
        const component = actions.find(
          (candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === id,
        );
        return component === undefined ? [] : [engineAttackRangeFeet(component)];
      });
      return ranges.length === selected.actionIds.length && ranges.length > 0
        ? Math.min(...ranges)
        : null;
    }
    case 'spellcasting': return null;
  }
}

/** Canonical registry lens used while minting a read-only state capsule. */
export function engineActionRegistry(state: EncounterState): {
  actionsFor(combatantId: CombatantId): readonly {
    readonly actionId: string;
    readonly kind: 'attack' | 'saving_throw' | 'multiattack' | 'spellcasting';
    readonly rangeFeet: number | null;
  }[];
} {
  return {
    actionsFor(combatantId) {
      const actions = encounterMonsterActions(state, combatantId);
      return actions.map((action) => ({
        actionId: action.id,
        kind: action.kind,
        rangeFeet: engineActionRangeFeet(actions, action),
      }));
    },
  };
}

function positionedCandidates(
  state: EncounterState,
  predicate: (candidate: EncounterCombatantState) => boolean,
): Array<{ readonly combatant: EncounterCombatantState; readonly position: GridCell }> {
  const positions = new Map(
    state.tokens.map((token) => [token.combatantId, token.position] as const),
  );
  return state.combatants.flatMap((candidate) => {
    const position = positions.get(candidate.profile.id);
    return predicate(candidate) && position !== undefined ? [{ combatant: candidate, position }] : [];
  });
}

function resolveTarget(
  state: EncounterState,
  actorId: CombatantId,
  selector: EngineTargetSelector,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  const origin = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (actor === undefined || origin === undefined) return null;
  if (selector.kind === 'most_injured_visible_ally') {
    return positionedCandidates(
      state,
      (candidate) => candidate.life !== 'dead' && combatantsAreAllies(state, actorId, candidate.profile.id),
    ).sort((left, right) =>
      (left.combatant.hitPoints / left.combatant.profile.rules.hitPointMaximum) -
        (right.combatant.hitPoints / right.combatant.profile.rules.hitPointMaximum) ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id))[0]?.combatant.profile.id ?? null;
  }
  const anchor = selector.kind === 'enemy_threatening_ally'
    ? state.tokens.find((token) => token.combatantId === selector.allyId)?.position ?? origin
    : origin;
  const enemies = positionedCandidates(
    state,
    (candidate) => candidate.life !== 'dead' && !combatantsAreAllies(state, actorId, candidate.profile.id),
  );
  if (selector.kind === 'lowest_hp_visible_enemy') {
    enemies.sort((left, right) =>
      left.combatant.hitPoints - right.combatant.hitPoints ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  } else {
    enemies.sort((left, right) =>
      gridDistance(anchor, left.position) - gridDistance(anchor, right.position) ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  }
  return enemies[0]?.combatant.profile.id ?? null;
}

function maximumPathCost(state: EncounterState): number {
  return state.bounds.columns * state.bounds.rows * 10;
}

function path(state: EncounterState, request: EnginePathRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const searchBudget = request.maximumFeet === undefined
    ? availableBudget
    : Math.min(availableBudget, maximumPathCost(state));
  const result = findPath(encounterMovementWorld(state), {
    actorId: request.actorId,
    start,
    goal: request.destination,
    maximumCost: feet(searchBudget),
  });
  if (result.kind === 'found') {
    return {
      legal: true,
      cells: result.cells,
      costFeet: result.cost,
      budgetFeet: availableBudget,
    };
  }
  if (request.maximumFeet !== undefined && request.maximumFeet < maximumPathCost(state)) {
    const unbounded = findPath(encounterMovementWorld(state), {
      actorId: request.actorId,
      start,
      goal: request.destination,
      maximumCost: feet(maximumPathCost(state)),
    });
    if (unbounded.kind === 'found') return { legal: false, code: 'insufficient_movement' };
  }
  return { legal: false, code: 'destination_unreachable' };
}

function reach(state: EncounterState, request: EngineReachRequest): EngineReachResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const target = state.combatants.find((candidate) => candidate.profile.id === request.targetId);
  const origin = request.origin ?? state.tokens.find(
    (token) => token.combatantId === request.actorId,
  )?.position;
  const targetPosition = state.tokens.find(
    (token) => token.combatantId === request.targetId,
  )?.position;
  const codes: Exclude<EngineReachResult, { readonly legal: true }>['codes'][number][] = [];
  if (actor?.profile.kind !== 'monster' || origin === undefined) codes.push('actor_not_placed_monster');
  if (target === undefined) codes.push('target_absent');
  else if (actor !== undefined && combatantsAreAllies(state, request.actorId, request.targetId)) {
    codes.push('target_same_side');
  }
  if (targetPosition === undefined) codes.push('target_not_placed');
  const actions = actor?.profile.kind === 'monster' ? encounterMonsterActions(state, request.actorId) : [];
  const action = actions.find((candidate) => candidate.id === request.actionId);
  if (action === undefined) codes.push('action_absent');
  const rangeFeet = action === undefined ? null : engineActionRangeFeet(actions, action);
  if (action !== undefined && rangeFeet === null) codes.push('action_range_unresolved');
  if (codes.length > 0 || origin === undefined || targetPosition === undefined || rangeFeet === null) {
    return { legal: false, codes };
  }
  const distanceFeet = gridDistance(origin, targetPosition);
  const verdict = action?.kind === 'attack' && action.delivery.kind === 'melee'
    ? attackRangeVerdict(origin, targetPosition, { kind: 'melee', reach: feet(rangeFeet) })
    : attackRangeVerdict(origin, targetPosition, {
        kind: 'ranged', normal: feet(rangeFeet), long: feet(rangeFeet),
      });
  return verdict.kind === 'illegal'
    ? { legal: false, codes: ['target_out_of_range'] }
    : { legal: true, distanceFeet, rangeFeet };
}

const engineQueryPort: EngineQueryPort = {
  combatant: (state, id) => state.combatants.find((candidate) => candidate.profile.id === id) ?? null,
  tokenPosition: (state, id) => state.tokens.find((token) => token.combatantId === id)?.position ?? null,
  sameSide: (state, left, right) => combatantsAreAllies(state, left, right),
  actions: encounterMonsterActions,
  resolveTarget,
  path,
  reach,
};

export const canonicalEngineQueryPort: EngineQueryPort = Object.freeze(engineQueryPort);
