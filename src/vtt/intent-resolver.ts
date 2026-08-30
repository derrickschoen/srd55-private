import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import { gridDistance, type GridCell } from '../combat/grid';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  canonicalEngineQueryPort,
  engineActionRangeFeet,
  type EngineQueryPort,
  type EngineTargetSelector,
} from './engine-query-port';

export type EngineActionChoice =
  | {
      readonly kind: 'attack';
      readonly actionId: string;
      readonly target: EngineTargetSelector;
      readonly resourcePolicy?: 'conserve' | 'normal' | 'spend_if_useful';
    }
  | {
      readonly kind: 'cast_spell';
      readonly spellId: string;
      readonly target: EngineTargetSelector | null;
      readonly slotPolicy?: 'lowest_legal' | 'conserve' | 'best_effect';
    }
  | {
      readonly kind: 'use_action';
      readonly actionId: string;
      readonly target: EngineTargetSelector | null;
    }
  | { readonly kind: 'dodge' | 'disengage' | 'dash' | 'end_turn' };

export interface EngineMovementPreference {
  readonly willingness: 'none' | 'only_if_required' | 'for_clear_advantage' | 'freely';
  readonly maximumFeet?: number;
  readonly opportunityRisk: 'avoid' | 'accept_if_needed' | 'accept';
}

export interface EngineEngagement {
  readonly stance: 'hold_position' | 'close_to_melee' | 'maintain_range' | 'withdraw';
  readonly anchor?: EngineTargetSelector | null;
}

export interface EngineIntentBranch {
  readonly choice: EngineActionChoice;
  readonly movement: EngineMovementPreference;
  readonly engagement: EngineEngagement;
}

export interface EngineTurnIntent extends EngineIntentBranch {
  readonly actorId: CombatantId;
  readonly fallback: EngineIntentBranch | null;
}

export interface ResolvedIntentMechanics {
  readonly actorId: CombatantId;
  readonly actionId: string;
  readonly targetId: CombatantId | null;
  readonly movementCostFeet: number;
  readonly path: readonly GridCell[];
  readonly finalPosition: GridCell;
}

export type EngineIntentResolution =
  | {
      readonly valid: true;
      readonly selectedBranch: 'primary' | 'fallback';
      readonly resolutionDigest: string;
      readonly summary: string;
      readonly refusals: readonly {
        readonly branch: 'primary';
        readonly code: string;
        readonly summary: string;
      }[];
      /** Engine-internal geometry. Proposal envelopes expose only its digest and summary. */
      readonly mechanics: ResolvedIntentMechanics;
    }
  | {
      readonly valid: false;
      readonly selectedBranch: 'none';
      readonly refusals: readonly {
        readonly branch: 'primary' | 'fallback';
        readonly code: string;
        readonly summary: string;
      }[];
    };

export interface PureIntentResolver {
  resolve(state: EncounterState, intent: EngineTurnIntent): EngineIntentResolution;
}

type BranchResolution =
  | { readonly valid: true; readonly mechanics: ResolvedIntentMechanics }
  | { readonly valid: false; readonly code: string; readonly summary: string };

function noMovementResolution(
  state: EncounterState,
  actorId: CombatantId,
  actionId: string,
): BranchResolution {
  const position = state.tokens.find((token) => token.combatantId === actorId)?.position;
  return position === undefined
    ? { valid: false, code: 'ACTOR_NOT_PLACED', summary: `${actorId}: actor has no token` }
    : {
        valid: true,
        mechanics: {
          actorId,
          actionId,
          targetId: null,
          movementCostFeet: 0,
          path: [],
          finalPosition: position,
        },
      };
}

function movementLimit(
  state: EncounterState,
  actorId: CombatantId,
  movement: EngineMovementPreference,
): number | null {
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (actor === undefined) return null;
  const maximum = movement.maximumFeet ?? actor.profile.rules.speed;
  if (!Number.isSafeInteger(maximum) || maximum < 0 || maximum % 5 !== 0) return null;
  if (maximum > actor.profile.rules.speed) return null;
  return movement.willingness === 'none' ? 0 : maximum;
}

function dashResolution(
  state: EncounterState,
  actorId: CombatantId,
  movement: EngineMovementPreference,
  engagement: EngineEngagement,
  queries: EngineQueryPort,
): BranchResolution {
  const actor = queries.combatant(state, actorId);
  const origin = queries.tokenPosition(state, actorId);
  const selector = engagement.anchor;
  if (actor?.profile.kind !== 'monster' || actor.life === 'dead') {
    return { valid: false, code: 'ACTOR_NOT_LIVING_MONSTER', summary: `${actorId}: actor is not a living monster` };
  }
  if (origin === null || selector === undefined || selector === null) {
    return { valid: false, code: 'DASH_TARGET_ABSENT', summary: `${actorId}: Dash needs an engagement anchor` };
  }
  const maximumFeet = movement.maximumFeet ?? actor.profile.rules.speed * 2;
  if (
    movement.willingness === 'none' || !Number.isSafeInteger(maximumFeet) || maximumFeet <= 0 ||
    maximumFeet % 5 !== 0 || maximumFeet > actor.profile.rules.speed * 2
  ) {
    return { valid: false, code: 'INVALID_MOVEMENT_LIMIT', summary: `${actorId}: Dash movement limit is invalid` };
  }
  const targetId = queries.resolveTarget(state, actorId, selector);
  const targetPosition = targetId === null ? null : queries.tokenPosition(state, targetId);
  if (targetId === null || targetPosition === null) {
    return { valid: false, code: 'DASH_TARGET_ABSENT', summary: `${actorId}: Dash target is absent` };
  }
  const candidates: { readonly destination: GridCell; readonly result: Extract<ReturnType<EngineQueryPort['path']>, { readonly legal: true }> }[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const destination = { column, row };
      const result = queries.path(state, {
        actorId,
        destination,
        movement: 'dash',
        maximumFeet,
      });
      if (result.legal) candidates.push({ destination, result });
    }
  }
  candidates.sort((left, right) =>
    gridDistance(left.destination, targetPosition) - gridDistance(right.destination, targetPosition) ||
    left.destination.row - right.destination.row ||
    left.destination.column - right.destination.column ||
    left.result.costFeet - right.result.costFeet);
  const minimumDistance = candidates[0] === undefined
    ? null
    : gridDistance(candidates[0].destination, targetPosition);
  const closest = minimumDistance === null ? [] : candidates.filter((candidate) =>
    gridDistance(candidate.destination, targetPosition) === minimumDistance);
  const alliedRank = state.combatants
    .filter((candidate) => candidate.life !== 'dead' && queries.sameSide(state, actorId, candidate.profile.id))
    .map((candidate) => candidate.profile.id)
    .sort((left, right) => left.localeCompare(right))
    .indexOf(actorId);
  const selected = closest.length === 0 ? undefined : closest[Math.max(0, alliedRank) % closest.length];
  if (selected === undefined) {
    return { valid: false, code: 'DASH_TARGET_UNREACHABLE', summary: `${actorId}: no Dash path approaches ${targetId}` };
  }
  return {
    valid: true,
    mechanics: {
      actorId,
      actionId: 'dash',
      targetId,
      movementCostFeet: selected.result.costFeet,
      path: selected.result.cells,
      finalPosition: selected.destination,
    },
  };
}

function targetActionResolution(
  state: EncounterState,
  actorId: CombatantId,
  actionId: string,
  selector: EngineTargetSelector,
  movement: EngineMovementPreference,
  engagement: EngineEngagement,
  queries: EngineQueryPort,
): BranchResolution {
  const actor = queries.combatant(state, actorId);
  if (actor?.profile.kind !== 'monster' || actor.life === 'dead') {
    return { valid: false, code: 'ACTOR_NOT_LIVING_MONSTER', summary: `${actorId}: actor is not a living monster` };
  }
  const maximumFeet = movementLimit(state, actorId, movement);
  if (maximumFeet === null) {
    return { valid: false, code: 'INVALID_MOVEMENT_LIMIT', summary: `${actorId}: movement limit is invalid` };
  }
  const targetId = queries.resolveTarget(state, actorId, selector);
  const target = targetId === null ? null : queries.combatant(state, targetId);
  const origin = queries.tokenPosition(state, actorId);
  const targetPosition = targetId === null ? null : queries.tokenPosition(state, targetId);
  if (targetId === null || target === null) {
    return { valid: false, code: 'TARGET_ABSENT', summary: `${actorId}: target is absent` };
  }
  if (target.life === 'dead') {
    return { valid: false, code: 'TARGET_DEAD', summary: `${actorId}: target ${targetId} is dead` };
  }
  if (queries.sameSide(state, actorId, targetId)) {
    return { valid: false, code: 'TARGET_SAME_SIDE', summary: `${actorId}: target is on the actor's side` };
  }
  if (origin === null || targetPosition === null) {
    return { valid: false, code: 'TOKEN_ABSENT', summary: `${actorId}: actor or target has no token` };
  }
  const actions = queries.actions(state, actorId);
  const action = actions.find((candidate) => candidate.id === actionId);
  if (action === undefined) {
    return { valid: false, code: 'ACTION_ABSENT', summary: `${actorId}: action ${actionId} is absent` };
  }
  const rangeFeet = engineActionRangeFeet(actions, action);
  if (rangeFeet === null) {
    return { valid: false, code: 'ACTION_RANGE_UNRESOLVED', summary: `${actorId}: action range is unresolved` };
  }
  const currentReach = queries.reach(state, { actorId, targetId, actionId });
  const currentPositionFitsEngagement = engagement.stance !== 'maintain_range' ||
    gridDistance(origin, targetPosition) > target.profile.rules.reach;
  if (currentReach.legal && currentPositionFitsEngagement) {
    return {
      valid: true,
      mechanics: {
        actorId,
        actionId,
        targetId,
        movementCostFeet: 0,
        path: [],
        finalPosition: origin,
      },
    };
  }
  const positions: GridCell[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const candidate = { column, row };
      if (!queries.reach(state, {
        actorId,
        targetId,
        actionId,
        origin: candidate,
      }).legal) continue;
      if (engagement.stance === 'hold_position' && gridDistance(candidate, origin) > 0) continue;
      if (
        engagement.stance === 'maintain_range' &&
        gridDistance(candidate, targetPosition) <= target.profile.rules.reach
      ) continue;
      positions.push(candidate);
    }
  }
  const candidates = positions.flatMap((destination) => {
    const result = queries.path(state, {
      actorId,
      destination,
      movement: 'normal',
      maximumFeet,
    });
    return result.legal ? [{ destination, result }] : [];
  });
  candidates.sort((left, right) =>
    left.result.costFeet - right.result.costFeet ||
    gridDistance(left.destination, targetPosition) - gridDistance(right.destination, targetPosition) ||
    left.destination.row - right.destination.row ||
    left.destination.column - right.destination.column);
  const selected = candidates[0];
  if (selected === undefined) {
    return {
      valid: false,
      code: 'TARGET_UNREACHABLE',
      summary: `${actorId}: ${actionId} cannot reach ${targetId} within ${String(maximumFeet)} feet`,
    };
  }
  return {
    valid: true,
    mechanics: {
      actorId,
      actionId,
      targetId,
      movementCostFeet: selected.result.costFeet,
      path: selected.result.cells,
      finalPosition: selected.destination,
    },
  };
}

function resolveBranch(
  state: EncounterState,
  actorId: CombatantId,
  branch: EngineIntentBranch,
  queries: EngineQueryPort,
): BranchResolution {
  switch (branch.choice.kind) {
    case 'attack':
      return targetActionResolution(
        state,
        actorId,
        branch.choice.actionId,
        branch.choice.target,
        branch.movement,
        branch.engagement,
        queries,
      );
    case 'use_action':
      return branch.choice.target === null
        ? noMovementResolution(state, actorId, branch.choice.actionId)
        : targetActionResolution(
            state,
            actorId,
            branch.choice.actionId,
            branch.choice.target,
            branch.movement,
            branch.engagement,
            queries,
          );
    case 'cast_spell':
      return {
        valid: false,
        code: 'SPELL_RESOLUTION_UNAVAILABLE',
        summary: `${actorId}: spell intent resolution is not yet available`,
      };
    case 'dash':
      return dashResolution(state, actorId, branch.movement, branch.engagement, queries);
    case 'dodge':
    case 'disengage':
    case 'end_turn':
      return noMovementResolution(state, actorId, branch.choice.kind);
  }
}

function accepted(
  selectedBranch: 'primary' | 'fallback',
  mechanics: ResolvedIntentMechanics,
  refusals: Extract<EngineIntentResolution, { readonly valid: true }>['refusals'] = [],
): EngineIntentResolution {
  const resolutionDigest = sha256(canonicalJson(mechanics));
  return {
    valid: true,
    selectedBranch,
    resolutionDigest,
    summary: mechanics.targetId === null
      ? `${mechanics.actorId} uses ${mechanics.actionId}`
      : `${mechanics.actorId} moves ${String(mechanics.movementCostFeet)} feet and uses ${mechanics.actionId} on ${mechanics.targetId}`,
    mechanics,
    refusals,
  };
}

export function createPureIntentResolver(
  queries: EngineQueryPort = canonicalEngineQueryPort,
): PureIntentResolver {
  const resolver: PureIntentResolver = {
    resolve(state, intent): EngineIntentResolution {
      const primary = resolveBranch(state, intent.actorId, intent, queries);
      if (primary.valid) return accepted('primary', primary.mechanics);
      if (intent.fallback === null) {
        return {
          valid: false,
          selectedBranch: 'none',
          refusals: [{ branch: 'primary', code: primary.code, summary: primary.summary }],
        };
      }
      const fallback = resolveBranch(state, intent.actorId, intent.fallback, queries);
      if (fallback.valid) return accepted('fallback', fallback.mechanics, [{
        branch: 'primary', code: primary.code, summary: primary.summary,
      }]);
      return {
        valid: false,
        selectedBranch: 'none',
        refusals: [
          { branch: 'primary', code: primary.code, summary: primary.summary },
          { branch: 'fallback', code: fallback.code, summary: fallback.summary },
        ],
      };
    },
  };
  return Object.freeze(resolver);
}

export const pureIntentResolver = createPureIntentResolver();
