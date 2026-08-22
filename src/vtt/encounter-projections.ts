import { canonicalJson } from '../commands/canonical-json';
import type { ControllerIdentity, ControllerRequest } from '../combat/controllers';
import type {
  CoordinatorPause,
  PersistedCoordinatorState,
} from '../combat/coordinator';
import type { EncounterState, TurnResources } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { GridCell } from '../combat/grid';
import {
  projectEncounter,
  type DmVisibleEncounterState,
  type PlayerVisibleCombatant,
  type PlayerVisibleEncounterEvent,
} from '../combat/visibility';
import type { CombatantId } from '../combat/values';
import type { SessionHistoryEntry } from './session-persistence';

export interface ProjectedControllerRequest {
  readonly kind: 'turn' | 'reaction';
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly actorId: CombatantId;
  readonly moverId?: CombatantId;
  readonly legalActions: readonly EncounterCommand[];
}

export interface PlayerBoardProjection {
  readonly audience: 'player';
  readonly revision: number;
  readonly round: number;
  readonly bounds: EncounterState['bounds'];
  readonly blockedCells: readonly GridCell[];
  readonly activeCombatant: CombatantId | null;
  readonly highlightedCombatant: CombatantId | null;
  readonly combatants: readonly PlayerVisibleCombatant[];
  readonly activePcResources: TurnResources | null;
  readonly pendingRequest: ProjectedControllerRequest | null;
  readonly events: readonly PlayerVisibleEncounterEvent[];
  readonly adjudicatedTargets: readonly CombatantId[];
  readonly authorityStatus: 'connected' | 'hard_paused';
}

export interface DmBoardProjection {
  readonly audience: 'dm';
  readonly encounter: DmVisibleEncounterState;
  readonly coordinator: PersistedCoordinatorState;
  readonly pendingRequest: ControllerRequest | null;
  /** Optional batch-planning action domains, populated when one request plans for several actors. */
  readonly turnProgramLegalActions?: readonly {
    readonly actorId: CombatantId;
    readonly combatantIds: readonly CombatantId[];
    readonly actions: readonly EncounterCommand[];
    readonly movementBudgetFeet: number;
  }[];
  readonly controllers: readonly ControllerIdentity[];
  readonly history: readonly SessionHistoryEntry[];
  readonly adjudicatedTargets: readonly CombatantId[];
}

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function projectedRequest(
  request: ControllerRequest | null,
  playerIds: ReadonlySet<CombatantId>,
): ProjectedControllerRequest | null {
  if (request === null || !playerIds.has(request.actorId)) return null;
  return {
    kind: request.kind,
    requestId: request.requestId,
    encounterRevision: request.encounterRevision,
    actorId: request.actorId,
    ...(request.kind === 'reaction' ? { moverId: request.moverId } : {}),
    legalActions: request.legalActions.actions,
  };
}

function adjudicatedTargets(
  state: EncounterState,
  pause: CoordinatorPause | null,
): readonly CombatantId[] {
  if (pause?.kind !== 'adjudicated') return [];
  const event = state.eventLog.find(
    (candidate) =>
      candidate.sequence === pause.eventSequence && candidate.type === 'adjudicated',
  );
  return event?.type === 'adjudicated' ? [event.target] : [];
}

export function projectPlayerBoard(
  state: EncounterState,
  coordinator: PersistedCoordinatorState,
  playerIds: readonly CombatantId[],
): PlayerBoardProjection {
  const ownerIds = new Set(playerIds);
  const playerCells = new Set(
    state.tokens
      .filter((token) => ownerIds.has(token.combatantId))
      .map((token) => cellKey(token.position)),
  );
  const ownerVisibleState: EncounterState = {
    ...state,
    foggedCells: state.foggedCells.filter((cell) => !playerCells.has(cellKey(cell))),
  };
  const viewerId = playerIds.find((id) => id === state.activeCombatant) ?? playerIds[0];
  if (viewerId === undefined) throw new Error('Player board requires at least one player PC.');
  const visible = projectEncounter(ownerVisibleState, {
    kind: 'player',
    combatantId: viewerId,
  });
  const hitPoints = new Map(
    state.combatants
      .filter((subject) => ownerIds.has(subject.profile.id))
      .map((subject) => [subject.profile.id, subject.hitPoints] as const),
  );
  const combatants = visible.combatants.map((subject) =>
    ownerIds.has(subject.id)
      ? {
          ...subject,
          hitPoints: hitPoints.get(subject.id) ?? (() => {
            throw new Error(`Player projection is missing owned Hit Points for ${subject.id}.`);
          })(),
        }
      : subject,
  );
  const activePc = state.combatants.find(
    (subject) => subject.profile.id === state.activeCombatant && ownerIds.has(subject.profile.id),
  );
  return {
    audience: 'player',
    revision: state.revision,
    round: state.round,
    bounds: visible.bounds,
    blockedCells: visible.blockedCells,
    activeCombatant: visible.activeCombatant,
    highlightedCombatant: visible.activeCombatant,
    combatants,
    activePcResources: activePc?.turn ?? null,
    pendingRequest: projectedRequest(coordinator.pendingRequest, ownerIds),
    events: visible.recentEvents,
    adjudicatedTargets: adjudicatedTargets(state, coordinator.pause),
    authorityStatus: 'connected',
  };
}

export function projectDmBoard(input: {
  readonly state: EncounterState;
  readonly coordinator: PersistedCoordinatorState;
  readonly controllers: readonly ControllerIdentity[];
  readonly history: readonly SessionHistoryEntry[];
}): DmBoardProjection {
  return {
    audience: 'dm',
    encounter: projectEncounter(input.state, { kind: 'dm' }),
    coordinator: input.coordinator,
    pendingRequest: input.coordinator.pendingRequest,
    controllers: input.controllers,
    history: input.history,
    adjudicatedTargets: adjudicatedTargets(input.state, input.coordinator.pause),
  };
}

export function serializePlayerBoard(projection: PlayerBoardProjection): string {
  return canonicalJson(projection);
}
