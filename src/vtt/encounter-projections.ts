import { canonicalJson } from '../commands/canonical-json';
import type { ControllerIdentity, ControllerRequest } from '../combat/controllers';
import type {
  CoordinatorPause,
  PersistedCoordinatorState,
} from '../combat/coordinator';
import type { TurnResources } from '../combat/encounter';
import type { PendingDecision, ReactionPolicy } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { GridCell } from '../combat/grid';
import {
  dmVisibleEncounter,
  type DmView,
  type DmVisibleEncounterState,
  type PlayerView,
  type PlayerVisibleCombatant,
  type PlayerVisibleEncounterEvent,
} from '../combat/visibility';
import type { CombatantId } from '../combat/values';
import type { SessionHistoryEntry } from './session-persistence';
import {
  projectEncounterBoard,
  type DmEncounterBoardModel,
} from './encounter-board';
import {
  projectDmPartySession,
  projectPlayerPartySession,
  type DmPartySessionView,
  type PartySessionState,
  type PlayerPartySessionView,
} from './party-session-state';

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
  readonly bounds: PlayerView['bounds'];
  readonly blockedCells: readonly GridCell[];
  readonly concealedCells: readonly GridCell[];
  readonly activeCombatant: CombatantId | null;
  readonly highlightedCombatant: CombatantId | null;
  readonly combatants: readonly PlayerVisibleCombatant[];
  readonly activePcResources: TurnResources | null;
  readonly pendingRequest: ProjectedControllerRequest | null;
  readonly events: readonly PlayerVisibleEncounterEvent[];
  readonly adjudicatedTargets: readonly CombatantId[];
  readonly authorityStatus: 'connected' | 'hard_paused';
  readonly partySession: PlayerPartySessionView | null;
}

export interface DmBoardProjection {
  readonly audience: 'dm';
  readonly encounter: DmVisibleEncounterState;
  readonly board: DmEncounterBoardModel;
  readonly coordinator: PersistedCoordinatorState;
  readonly pendingRequest: ControllerRequest | null;
  /** Exact legal commands exposed to the DM only when the pending actor uses a human controller. */
  readonly humanCommandActions: readonly EncounterCommand[];
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
  readonly partySession: DmPartySessionView | null;
  readonly decisionTray: DmDecisionTrayProjection;
}

export type DmDecisionTrayEntry =
  | {
      readonly kind: 'pending';
      readonly decision: PendingDecision;
      readonly combatantName: string;
      readonly triggerContext: string;
      readonly interactive: true;
    }
  | {
      readonly kind: 'auto_fire_log';
      readonly sequence: number;
      readonly combatantId: CombatantId;
      readonly combatantName: string;
      readonly reactionKind: 'opportunity_attack' | 'legendary_resistance';
      readonly policy: Exclude<ReactionPolicy, 'ask'>;
      readonly resolution: 'accept' | 'decline';
      readonly autoFired: boolean;
      readonly interactive: false;
    };

export interface DmDecisionTrayProjection {
  readonly entries: readonly DmDecisionTrayEntry[];
  readonly boundaryRefusal: null | {
    readonly code: 'turn_boundary_blocked';
    readonly message: string;
  };
}

function decisionTriggerContext(
  decision: PendingDecision,
  names: ReadonlyMap<CombatantId, string>,
): string {
  switch (decision.kind) {
    case 'reaction_offer':
      return `${names.get(decision.opportunityAttack.mover) ?? String(decision.opportunityAttack.mover)} moved from ${String(decision.opportunityAttack.from.column)},${String(decision.opportunityAttack.from.row)} to ${String(decision.opportunityAttack.to.column)},${String(decision.opportunityAttack.to.row)} in round ${String(decision.boundary.round)}`;
    case 'death_save':
      return `start-of-turn death saving throw in round ${String(decision.boundary.round)}`;
    case 'legendary_action_window':
      return `end of ${names.get(decision.boundary.activeCombatant) ?? String(decision.boundary.activeCombatant)}'s turn in round ${String(decision.boundary.round)}`;
    case 'legendary_resistance':
      return `${decision.failedSave.ability} save failed against ${names.get(decision.failedSave.source) ?? String(decision.failedSave.source)} in round ${String(decision.boundary.round)}`;
    default: {
      const exhaustive: never = decision;
      throw new Error(`Unhandled pending decision kind: ${String(exhaustive)}`);
    }
  }
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
  events: readonly import('../combat/events').EncounterEvent[],
  pause: CoordinatorPause | null,
): readonly CombatantId[] {
  if (pause?.kind !== 'adjudicated') return [];
  const event = events.find(
    (candidate) =>
      candidate.sequence === pause.eventSequence && candidate.type === 'adjudicated',
  );
  return event?.type === 'adjudicated' ? [event.target] : [];
}

export function projectPlayerBoard(
  view: PlayerView,
  coordinator: PersistedCoordinatorState,
  partyState: PartySessionState | null = null,
): PlayerBoardProjection {
  const ownerIds = new Set(view.ownedCombatants.map((subject) => subject.id));
  const owned = new Map(view.ownedCombatants.map((subject) => [subject.id, subject] as const));
  const combatants = view.combatants.map((subject) =>
    ownerIds.has(subject.id)
      ? {
          ...subject,
          hitPoints: owned.get(subject.id)?.hitPoints ?? (() => {
            throw new Error(`Player projection is missing owned Hit Points for ${subject.id}.`);
          })(),
        }
      : subject,
  );
  const activePc = view.ownedCombatants.find((subject) => subject.id === view.activeCombatant);
  const adjudicatedSequence = coordinator.pause?.kind === 'adjudicated'
    ? coordinator.pause.eventSequence
    : null;
  return {
    audience: 'player',
    revision: view.revision,
    round: view.round,
    bounds: view.bounds,
    blockedCells: view.blockedCells,
    concealedCells: view.concealedCells.map((cell) => ({ ...cell })),
    activeCombatant: view.activeCombatant,
    highlightedCombatant: view.activeCombatant,
    combatants,
    activePcResources: activePc?.turn ?? null,
    pendingRequest: projectedRequest(coordinator.pendingRequest, ownerIds),
    events: view.recentEvents,
    adjudicatedTargets: adjudicatedSequence !== null
      ? view.recentEvents.flatMap((event) =>
          event.sequence === adjudicatedSequence && event.type === 'adjudicated'
            ? [event.target]
            : [])
      : [],
    authorityStatus: 'connected',
    partySession: partyState === null
      ? null
      : projectPlayerPartySession(partyState, [...ownerIds]),
  };
}

export function projectDmBoard(input: {
  readonly view: DmView;
  readonly coordinator: PersistedCoordinatorState;
  readonly controllers: readonly ControllerIdentity[];
  readonly history: readonly SessionHistoryEntry[];
  readonly partyState?: PartySessionState | null;
  readonly boundaryRefusal?: DmDecisionTrayProjection['boundaryRefusal'];
}): DmBoardProjection {
  const targets = adjudicatedTargets(input.view.state.eventLog, input.coordinator.pause);
  const pending = input.coordinator.pendingRequest;
  const pendingController = pending === null
    ? undefined
    : input.controllers.find((identity) => identity.combatantId === pending.actorId);
  const names = new Map(input.view.state.combatants.map(
    (subject) => [subject.profile.id, subject.profile.name] as const,
  ));
  const pendingEntries: readonly DmDecisionTrayEntry[] = input.view.state.pendingDecisions.map((decision) => ({
    kind: 'pending',
    decision: structuredClone(decision),
    combatantName: names.get(decision.combatant) ?? String(decision.combatant),
    triggerContext: decisionTriggerContext(decision, names),
    interactive: true,
  }));
  const autoFireEntries: readonly DmDecisionTrayEntry[] = input.view.state.eventLog.flatMap(
    (event): readonly DmDecisionTrayEntry[] => event.type === 'reaction_policy_auto_resolved'
      ? [{
          kind: 'auto_fire_log',
          sequence: event.sequence,
          combatantId: event.combatant,
          combatantName: names.get(event.combatant) ?? String(event.combatant),
          reactionKind: event.reactionKind,
          policy: event.policy,
          resolution: event.resolution,
          autoFired: event.autoFired,
          interactive: false,
        }]
      : [],
  );
  return {
    audience: 'dm',
    encounter: dmVisibleEncounter(input.view),
    board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
    coordinator: input.coordinator,
    pendingRequest: input.coordinator.pendingRequest,
    humanCommandActions: pendingController?.kind === 'human'
      ? pending?.legalActions.actions ?? []
      : [],
    controllers: input.controllers,
    history: input.history,
    adjudicatedTargets: targets,
    partySession: input.partyState === undefined || input.partyState === null
      ? null
      : projectDmPartySession(input.partyState),
    decisionTray: {
      entries: [...pendingEntries, ...autoFireEntries],
      boundaryRefusal: input.boundaryRefusal ?? null,
    },
  };
}

export function serializePlayerBoard(projection: PlayerBoardProjection): string {
  return canonicalJson(projection);
}
