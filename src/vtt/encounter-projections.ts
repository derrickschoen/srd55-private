import { canonicalJson } from '../commands/canonical-json';
import type { ControllerIdentity, ControllerRequest } from '../combat/controllers';
import type {
  CoordinatorPause,
  PersistedCoordinatorState,
} from '../combat/coordinator';
import {
  effectiveCreatureSize,
  pendingPlacementLegalAnchors,
  type PendingPlacementLegalAnchor,
  type TurnResources,
} from '../combat/encounter';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { PendingDecision, ReactionPolicy } from '../combat/encounter';
import {
  previewMovementPathDangers,
  type MovementPathDangerPreview,
} from '../combat/encounter';
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
import type { AdjudicationEnvelope } from './mcp/engine-server';
import { dmWorldObjectOverrideCommand } from '../combat/world-object-actions';
import type { SessionHistoryEntry } from './session-persistence';
import {
  projectEncounterTimeline,
  type EncounterTimelineProjection,
} from './session-timeline';
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
import {
  projectHumanEngineOptions,
  type HumanEngineActorOptions,
} from './encounter-board-projection';

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
  /** Complete engine option catalog for human inspection, including typed no-effect declarations. */
  readonly humanEngineOptions: readonly HumanEngineActorOptions[];
  /** DM-only previews keyed by the exact legal move command. */
  readonly movementPreviews: readonly DmMovementPathPreview[];
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
  readonly timeline: EncounterTimelineProjection;
  readonly worldObjectControls: readonly {
    readonly objectId: string;
    readonly objectName: string;
    readonly label: string;
    readonly command: Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>;
  }[];
  readonly pendingPlacementRecovery: DmPendingPlacementRecovery | null;
}

export interface DmPendingPlacementRecovery {
  readonly combatantId: CombatantId;
  readonly combatantName: string;
  readonly reason: import('../combat/encounter').MigrationAdjudicationPending['kind'];
  readonly suggestedAnchor: GridCell | null;
  readonly sizeInput: 'required' | 'fixed';
  readonly sizeOptions: readonly {
    readonly size: KnownCreatureSize;
    readonly legalAnchors: readonly PendingPlacementLegalAnchor[];
  }[];
}

export interface DmMovementPathPreview extends MovementPathDangerPreview {
  readonly commandKey: string;
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
      readonly kind: 'engine_adjudication';
      readonly request: AdjudicationEnvelope;
      readonly combatantName: string;
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
  readonly actionRefusal: NonBoundaryActionRefusal | null;
  readonly boundaryRefusal: null | {
    readonly code: 'turn_boundary_blocked';
    readonly message: string;
  };
}

import type { NonBoundaryActionRefusal } from './refusal-handling';

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
    case 'adjudication_prompt':
      return `${decision.refusal.reason} (${decision.refusal.citation})`;
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
  readonly actionRefusal?: NonBoundaryActionRefusal | null;
  readonly adjudicationPrompts?: readonly Extract<PendingDecision, { readonly kind: 'adjudication_prompt' }>[];
  readonly engineAdjudications?: readonly AdjudicationEnvelope[];
}): DmBoardProjection {
  const targets = adjudicatedTargets(input.view.state.eventLog, input.coordinator.pause);
  const pending = input.coordinator.pendingRequest;
  const pendingController = pending === null
    ? undefined
    : input.controllers.find((identity) => identity.combatantId === pending.actorId);
  const humanCommandActions = pendingController?.kind === 'human'
    ? pending?.legalActions.actions ?? []
    : [];
  const worldObjectControls = input.view.state.worldObjects.flatMap((object) =>
    (object.classActions ?? []).flatMap((action) => {
      const command = dmWorldObjectOverrideCommand(input.view.state, object.id, action.id);
      return command === null ? [] : [{
        objectId: String(object.id), objectName: object.name, label: action.label, command,
      }];
    }));
  const names = new Map(input.view.state.combatants.map(
    (subject) => [subject.profile.id, subject.profile.name] as const,
  ));
  const recovery = input.view.state.phase.kind === 'awaiting_placement'
    ? (() => {
        const phase = input.view.state.phase;
        const record = phase.originatingRecord;
        const sizes = record.kind === 'overlap_adjudication_pending'
          ? [effectiveCreatureSize(input.view.state, record.combatant)]
          : creatureSizes;
        const suggestedAnchor = record.kind === 'overlap_adjudication_pending'
          ? record.formerAnchors[1]
          : record.suggestedAnchor;
        return {
          combatantId: record.combatant,
          combatantName: names.get(record.combatant) ?? String(record.combatant),
          reason: record.kind,
          suggestedAnchor: suggestedAnchor === null ? null : { ...suggestedAnchor },
          sizeInput: record.kind === 'overlap_adjudication_pending' ? 'fixed' : 'required',
          sizeOptions: sizes.map((size) => ({
            size,
            legalAnchors: pendingPlacementLegalAnchors(input.view.state, size),
          })),
        } satisfies DmPendingPlacementRecovery;
      })()
    : null;
  const pendingEntries: readonly DmDecisionTrayEntry[] = [
    ...input.view.state.pendingDecisions,
    ...(input.adjudicationPrompts ?? []),
  ].map((decision) => ({
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
  const engineAdjudicationEntries: readonly DmDecisionTrayEntry[] = (input.engineAdjudications ?? [])
    .map((request) => ({
      kind: 'engine_adjudication' as const,
      request: structuredClone(request),
      combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
      interactive: true as const,
    }));
  return {
    audience: 'dm',
    encounter: dmVisibleEncounter(input.view),
    board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
    coordinator: input.coordinator,
    pendingRequest: input.coordinator.pendingRequest,
    humanCommandActions,
    humanEngineOptions: projectHumanEngineOptions(input.view.state),
    movementPreviews: humanCommandActions.flatMap((action): readonly DmMovementPathPreview[] =>
      action.type === 'move'
        ? [{ commandKey: canonicalJson(action), ...previewMovementPathDangers(input.view.state, action) }]
        : []),
    controllers: input.controllers,
    history: input.history,
    adjudicatedTargets: targets,
    partySession: input.partyState === undefined || input.partyState === null
      ? null
      : projectDmPartySession(input.partyState),
    decisionTray: {
      entries: [...pendingEntries, ...engineAdjudicationEntries, ...autoFireEntries],
      actionRefusal: input.actionRefusal ?? null,
      boundaryRefusal: input.boundaryRefusal ?? null,
    },
    timeline: projectEncounterTimeline(input.view.state, input.history),
    worldObjectControls,
    pendingPlacementRecovery: recovery,
  };
}

export function serializePlayerBoard(projection: PlayerBoardProjection): string {
  return canonicalJson(projection);
}
