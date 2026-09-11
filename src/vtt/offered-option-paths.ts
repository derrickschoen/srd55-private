import {
  previewMovementPathDangers,
  type EncounterState,
  type MovementPathDangerPreview,
} from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import { feet, type CombatantId } from '../combat/values';
import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
import { canonicalEngineQueryPort } from './engine-query-port';
import { projectFutureMonsterTurns } from './monster-planning-state';
import {
  createLegacyEngineOptionEnvironment,
  type EngineOptionEnvironment,
} from './offers/offer-environment';
import type { EngineMainActionUse, EngineOfferableOption, EngineOptionId } from './turn-proposal';

declare const offeredOptionOrdinalBrand: unique symbol;

/** Zero-based because the AI turn context identifies the recommendation as option index 0. */
export type OfferedOptionOrdinal = number & {
  readonly [offeredOptionOrdinalBrand]: 'OfferedOptionOrdinal';
};

export interface OfferedOptionActor {
  readonly actorId: CombatantId;
  /** The exact order presented in the AI turn context. */
  readonly options: readonly EngineOfferableOption[];
}

export interface OfferedOptionPath extends MovementPathDangerPreview {
  readonly optionId: EngineOptionId;
  readonly optionOrdinal: OfferedOptionOrdinal;
  readonly summaryLabel: string;
  readonly distanceFeet: number;
  readonly movementRemainingFeet: number;
}

export interface BoardPathSummary {
  readonly count: number;
  readonly paths: readonly {
    readonly actorId: CombatantId;
    readonly optionId: EngineOptionId;
    readonly optionOrdinal: OfferedOptionOrdinal;
    readonly summaryLabel: string;
    readonly destination: GridCell;
    readonly distanceFeet: number;
    readonly dangerCells: readonly {
      readonly cell: GridCell;
      readonly dangers: OfferedOptionPath['annotations'][number]['dangers'];
    }[];
  }[];
}

export class OfferedOptionEnvironmentMismatchError extends TypeError {
  readonly code = 'OFFER_ENVIRONMENT_MISMATCH' as const;

  constructor(summary: string) {
    super(summary);
    this.name = 'OfferedOptionEnvironmentMismatchError';
  }
}

const transitionalLegacyOfferEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);

function optionOrdinal(value: number): OfferedOptionOrdinal {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('An offered-option ordinal must be a non-negative safe integer.');
  }
  return value as OfferedOptionOrdinal;
}

function mainUse(option: EngineOfferableOption): EngineMainActionUse {
  for (const slot of option.actionSlots) {
    if (slot.slot === 'main') return slot.use;
  }
  throw new TypeError(`Engine option ${option.optionId} has no main action.`);
}

/** Mirrors the current turn-context information ordering at its file seam. */
export function orderOptionsAsTurnContext(
  options: readonly EngineOfferableOption[],
): readonly EngineOfferableOption[] {
  const informationRank = (option: EngineOfferableOption): number => {
    const use = mainUse(option);
    switch (use.kind) {
      case 'multiattack': return 0;
      case 'attack':
      case 'saving_throw': return 1;
      case 'cast_spell': return 2;
      case 'use_world_object': return 3;
      case 'dodge':
      case 'disengage':
      case 'dash': return 4;
      case 'end_turn': return 5;
    }
    const exhaustive: never = use;
    throw new TypeError(`Unknown engine option use: ${String(exhaustive)}`);
  };
  return [...options].sort((left, right) =>
    informationRank(left) - informationRank(right) || left.label.localeCompare(right.label));
}

/**
 * The maximal monster segment represented by the round planner. Shared-side
 * modes plan every living monster; per-combatant mode stops at the next PC.
 */
export function actingMonsterIds(state: EncounterState): readonly CombatantId[] {
  const livingMonsters = new Set(state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life === 'living'
      ? [combatant.profile.id]
      : []));
  if (state.config.initiativeMode !== 'per_combatant') {
    return [...livingMonsters].sort((left, right) => left.localeCompare(right));
  }
  if (state.activeInitiativeIndex === null) return [];
  const actors: CombatantId[] = [];
  for (const entry of state.initiative.slice(state.activeInitiativeIndex)) {
    const combatant = state.combatants.find((candidate) => candidate.profile.id === entry.combatant);
    if (combatant === undefined) throw new TypeError(`Initiative actor ${entry.combatant} is absent.`);
    if (combatant.life === 'dead') continue;
    if (combatant.profile.kind === 'player_character') break;
    if (livingMonsters.has(combatant.profile.id)) actors.push(combatant.profile.id);
  }
  return actors;
}

/** Produces the exact option list consumed by the local turn-context adapter. */
export function offeredOptionActorsForState(
  state: EncounterState,
  actorIds: readonly CombatantId[] = actingMonsterIds(state),
  offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,
): readonly OfferedOptionActor[] {
  const planningState = projectFutureMonsterTurns(state, actorIds);
  return actorIds.map((actorId) => ({
    actorId,
    options: orderOptionsAsTurnContext(
      availableEngineActorOptions(planningState, actorId, offerEnvironment),
    ),
  }));
}

/**
 * Pure board projection for already ordered engine offers. The path comes from
 * the same resolver used to execute the option; its hazards come exclusively
 * from previewMovementPathDangers.
 */
export function offeredOptionPaths(
  state: EncounterState,
  actors: readonly OfferedOptionActor[],
  offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,
): readonly OfferedOptionPath[] {
  const actorIds = actors.map((actor) => actor.actorId);
  const planningState = projectFutureMonsterTurns(state, actorIds);
  return actors.flatMap((actor) => {
    const subject = planningState.combatants.find(
      (combatant) => combatant.profile.id === actor.actorId,
    );
    if (subject === undefined) throw new TypeError(`Offered-option actor ${actor.actorId} is absent.`);
    return actor.options.flatMap((option, index): readonly OfferedOptionPath[] => {
      if (option.actorId !== actor.actorId) {
        throw new TypeError(`Option ${option.optionId} belongs to a different actor.`);
      }
      const resolution = resolveEngineActorOption(planningState, option, offerEnvironment);
      if (!resolution.valid) {
        if (resolution.code === 'OFFER_ENVIRONMENT_MISMATCH') {
          throw new OfferedOptionEnvironmentMismatchError(resolution.summary);
        }
        return [];
      }
      if (resolution.mechanics.path.length === 0) return [];
      const command = {
        type: 'move' as const,
        actor: actor.actorId,
        path: resolution.mechanics.path,
        cause: 'voluntary' as const,
      };
      const preview = previewMovementPathDangers(planningState, command, {
        movementBudgetRemaining: feet(resolution.mechanics.movementCostFeet),
      });
      return [{
        ...preview,
        optionId: option.optionId,
        optionOrdinal: optionOrdinal(index),
        summaryLabel: option.label,
        distanceFeet: resolution.mechanics.movementCostFeet,
        movementRemainingFeet: subject.turn.movement.remaining,
      }];
    });
  });
}

export function boardPathSummary(projection: readonly OfferedOptionPath[]): BoardPathSummary {
  return {
    count: projection.length,
    paths: projection.map((path) => {
      const destination = path.path.at(-1);
      if (destination === undefined) throw new TypeError('An offered movement path has no destination.');
      return {
        actorId: path.actor,
        optionId: path.optionId,
        optionOrdinal: path.optionOrdinal,
        summaryLabel: path.summaryLabel,
        destination: { ...destination },
        distanceFeet: path.distanceFeet,
        dangerCells: path.annotations.map((annotation) => ({
          cell: { ...annotation.cell },
          dangers: [...annotation.dangers],
        })),
      };
    }),
  };
}
