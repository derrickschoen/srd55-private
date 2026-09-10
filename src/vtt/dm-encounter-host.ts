import {
  ControllerRegistry,
  HumanController,
  type Controller,
  type ControllerIdentity,
  type ControllerKind,
} from '../combat/controllers';
import {
  CoordinatorExternalPauseError,
  CoordinatorPostApplicationError,
  TurnCoordinator,
  type CoordinatorStep,
  type PersistedCoordinatorState,
  type ReactionLegalActions,
  type TurnLegalActions,
} from '../combat/coordinator';
import {
  createEncounter,
  type EncounterState,
  type EncounterCommandReducer,
  type PendingDecision,
  type ReactionKind,
  type ReactionPolicy,
} from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { HiddenRollCategory } from '../combat/roll-visibility';
import { projectDmView, projectPlayerView } from '../combat/visibility';
import { mulberry32, type SerializableRng } from '../combat/random';
import {
  encounterBranchId,
  encounterSessionId,
  type CombatantId,
  type EncounterSessionId,
} from '../combat/values';
import type { AgentSessionBinding } from './agent-session';
import {
  DeferredMirrorSink,
  EncounterSessionJournal,
  type SessionStore,
  type MirrorSink,
  type SessionResume,
} from './session-persistence';
import {
  BridgeFailureGuard,
  type BridgeAbortReport,
} from './dm-bridge/client';
import {
  DmRoundPlanController,
  DmRoundPlanSession,
} from './dm-bridge/decision-program';
import type {
  DmBridgeExchange,
  DmBridgeModelConfig,
} from './dm-bridge/contracts';
import type { SteeringCoordinatorMode, SteeringTelemetry } from './dm-bridge/steering';
import { DEFAULT_ENCOUNTER_SEED, type EncounterSeed } from './session-seed';
import {
  enterNextRoom as advancePartyRoom,
  type LongRestResult,
  type PartySessionState,
  type RestInterruptionOutcome,
  type RestInterruptionResult,
} from './party-session-state';
import {
  DEFAULT_REFUSAL_HANDLING_SETTINGS,
  routeActionRefusal,
  type NonBoundaryActionRefusal,
  type RefusalCategory,
  type RefusalHandlingMode,
} from './refusal-handling';
import type { ShortRestHitDieSpend } from './party-session-state';
import type { LoadedPartyMember } from './party-pack';
import {
  composeStoredCharacterEncounter,
  type StoredCharacterRoomComposer,
} from './stored-character-encounter';
import {
  projectDmBoard,
  projectPlayerBoard,
  detachedImmutable,
  offeredActionId,
  type DmBoardProjection,
  type PlayerBoardProjection,
  type PlayerSeatBinding,
  type RendererTokenBinding,
} from './encounter-projections';
import {
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
  referenceReactionLegalActions,
  referenceTurnLegalActions,
} from './reference-encounter';
import { WorldObjectAlgorithmController } from '../combat/world-object-controller';
import { reduceSessionEncounter } from './session-encounter-reducer';
import { canonicalJson } from '../commands/canonical-json';
import { TurnExhaustionCoordinator } from './turn-exhaustion-coordinator';
import type {
  AdjudicationEnvelope,
  AdjudicationSink,
} from './mcp/engine-server';
import {
  DM_ATTENDED_REACTION_OFFER_POLICY,
  unattendedReactionOfferResolution,
  type ReactionOfferHostPolicy,
} from './reaction-offer-host-policy';
import { guidedPendingReactionResolution } from './reaction-guidance';

const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

function controllerForKind(
  kind: ControllerKind,
  agentController?: () => Controller,
): Controller {
  switch (kind) {
    case 'human':
      return new HumanController();
    case 'algorithm':
      return new WorldObjectAlgorithmController();
    case 'agent':
      if (agentController !== undefined) return agentController();
      throw new Error('Local host needs its DM bridge before restoring an agent controller.');
    case 'custom':
      throw new Error(`Local increment-6 host cannot restore a ${kind} controller.`);
  }
}

function registryFromIdentities(
  identities: readonly ControllerIdentity[],
  agentController?: (combatantId: CombatantId) => Controller,
): {
  readonly registry: ControllerRegistry;
  readonly humans: ReadonlyMap<CombatantId, HumanController>;
} {
  const controllers = new Map<CombatantId, Controller>();
  const registry = new ControllerRegistry(
    identities.map((identity) => {
      const controller = controllerForKind(
        identity.kind,
        agentController === undefined ? undefined : () => agentController(identity.combatantId),
      );
      controllers.set(identity.combatantId, controller);
      return {
        combatantId: identity.combatantId,
        controller,
        ...(identity.generation === 0 ? { controllerId: identity.controllerId } : {}),
      };
    }),
  );
  for (const identity of identities) {
    for (let generation = 1; generation <= identity.generation; generation += 1) {
      const controller = controllerForKind(
        identity.kind,
        agentController === undefined ? undefined : () => agentController(identity.combatantId),
      );
      controllers.set(identity.combatantId, controller);
      registry.replace(
        identity.combatantId,
        controller,
        generation === identity.generation ? identity.controllerId : undefined,
      );
    }
  }
  return {
    registry,
    humans: new Map(
      [...controllers].flatMap(([id, controller]) =>
        controller instanceof HumanController ? [[id, controller] as const] : [],
      ),
    ),
  };
}

function carryControllerAssignments(
  previous: readonly ControllerIdentity[],
  next: readonly ControllerIdentity[],
): readonly ControllerIdentity[] {
  const previousByCombatant = new Map(previous.map((identity) => [identity.combatantId, identity] as const));
  return next.map((identity) => previousByCombatant.get(identity.combatantId) ?? identity)
    .sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

function newIdentities(monsterKind: 'human' | 'agent' = 'human'): readonly ControllerIdentity[] {
  return [...REFERENCE_PLAYER_IDS, encounterSessionMonsterId()].map((combatantId) => ({
    combatantId,
    controllerId: `${combatantId}:${combatantId === encounterSessionMonsterId() ? monsterKind : 'human'}:local`,
    kind: combatantId === encounterSessionMonsterId() ? monsterKind : 'human' as const,
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

function encounterSessionMonsterId(): CombatantId {
  return referenceEncounterSetup().combatants.find(
    (candidate) => candidate.kind === 'monster',
  )!.id;
}

export interface DmEncounterHostSnapshot {
  readonly dm: DmBoardProjection;
  readonly player: PlayerBoardProjection;
}

export type HostSnapshotNotificationKind =
  | 'offer'
  | 'status'
  | 'mutation'
  | 'autonomous'
  | 'recovery';

export type HostTerminalReceipt =
  | {
      readonly kind: 'offered_action';
      readonly requestId: string;
      readonly revision: number;
    }
  | {
      readonly kind: 'door';
      readonly revision: number;
    };

export interface HostSnapshotNotification {
  readonly kind: HostSnapshotNotificationKind;
  readonly snapshot: DmEncounterHostSnapshot;
  readonly playerSnapshot: (binding: PlayerSeatBinding) => PlayerBoardProjection;
  readonly rendererTokenBindings: readonly RendererTokenBinding[];
  readonly terminalReceipt?: HostTerminalReceipt;
}

export interface HostSubscriberError {
  readonly channel: 'snapshot' | 'notification';
  readonly error: unknown;
}

export type HostCoordinatorTransactionOutcome =
  | { readonly kind: 'committed'; readonly revision: number }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'cancelled'; readonly reason: string }
  | { readonly kind: 'closed' }
  | {
      readonly kind: 'failed';
      readonly phase: 'pre_apply' | 'post_apply';
      readonly error: unknown;
      readonly currentRevision: number;
    };

export type HostDoorSetOutcome =
  | { readonly kind: 'committed'; readonly revision: number; readonly changed: boolean }
  | { readonly kind: 'unsupported'; readonly reason: string }
  | { readonly kind: 'closed' }
  | {
      readonly kind: 'failed';
      readonly phase: 'pre_apply' | 'post_apply';
      readonly error: unknown;
      readonly currentRevision: number;
    };

interface HostTransactionWaiter {
  readonly resolve: (outcome: HostCoordinatorTransactionOutcome) => void;
}

type FreshOfferOutcome =
  | { readonly kind: 'fresh' }
  | { readonly kind: 'closed' }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'failed'; readonly error: unknown };

interface FreshOfferWaiter {
  readonly previousRequestId: string | null;
  readonly minimumRevision: number;
  readonly resolve: (outcome: FreshOfferOutcome) => void;
}

class HostPostApplicationError extends Error {
  override readonly name = 'HostPostApplicationError' as const;

  constructor(cause: unknown) {
    super('Host bookkeeping failed after an encounter command was applied.', { cause });
  }
}

export class ControllerAssignmentError extends Error {
  override readonly name = 'ControllerAssignmentError' as const;

  constructor(
    readonly code: 'action_boundary_required' | 'combatant_not_found' | 'assignment_failed',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export interface DmBridgeConnection extends DmBridgeExchange, MirrorSink {}

type DoorBlocking = EncounterState['worldObjects'][number]['blocking'];

function canonicalDoorState(blocking: DoorBlocking): boolean | null {
  if (!blocking.movement && !blocking.lineOfSight && blocking.cover === 'none') return true;
  if (blocking.movement && blocking.lineOfSight && blocking.cover === 'total') return false;
  return null;
}

function doorBlockingFor(open: boolean): DoorBlocking {
  return open
    ? { movement: false, lineOfSight: false, cover: 'none' }
    : { movement: true, lineOfSight: true, cover: 'total' };
}

export class DmEncounterHost {
  readonly sessionId: EncounterSessionId;
  readonly #store: SessionStore;
  readonly #mirror = new DeferredMirrorSink();
  readonly #listeners = new Set<(snapshot: DmEncounterHostSnapshot) => void>();
  readonly #notificationListeners = new Set<(notification: HostSnapshotNotification) => void>();
  readonly #subscriberErrors: HostSubscriberError[] = [];
  readonly #transactionWaiters = new Map<string, HostTransactionWaiter>();
  readonly #freshOfferWaiters = new Set<FreshOfferWaiter>();
  #activeTransactionRequestId: string | null = null;
  #journal: EncounterSessionJournal;
  #registry: ControllerRegistry;
  #humans: ReadonlyMap<CombatantId, HumanController>;
  #coordinator: TurnCoordinator;
  #rng: SerializableRng;
  #pump: Promise<void> | null = null;
  #repumpRequested = false;
  #repumpBlocked = false;
  #closed = false;
  #bridgeFailureGuard: BridgeFailureGuard | null = null;
  #roundPlanSession: DmRoundPlanSession | null = null;
  #boundaryRefusal: null | {
    readonly code: 'turn_boundary_blocked';
    readonly message: string;
  } = null;
  #actionRefusal: NonBoundaryActionRefusal | null = null;
  #adjudicationPrompts: Extract<PendingDecision, { readonly kind: 'adjudication_prompt' }>[] = [];
  #engineAdjudications: AdjudicationEnvelope[] = [];
  readonly #takeoverOrigins = new Map<CombatantId, 'agent' | 'algorithm'>();
  readonly #pendingHandbacks = new Set<CombatantId>();
  #partyStateHasBoundaryRuling = false;
  readonly #steeringMode: SteeringCoordinatorMode;
  readonly #onSteeringTelemetry: (telemetry: SteeringTelemetry) => void;
  readonly #playerIds: readonly CombatantId[];
  readonly #turnLegalActions: TurnLegalActions;
  readonly #reactionLegalActions: ReactionLegalActions;
  readonly #partyMembers: readonly LoadedPartyMember[] | null;
  readonly #partyDisplayNames: ReadonlyMap<number, string>;
  readonly #composeRoom: StoredCharacterRoomComposer;
  readonly #reactionOfferPolicy: ReactionOfferHostPolicy;
  readonly #onReducerInvocation: (command: EncounterCommand) => void;

  constructor(
    sessionKey: string,
    store: SessionStore,
    options: {
      readonly initialState?: EncounterState;
      readonly initialSeed?: EncounterSeed;
      readonly initialPartyState?: PartySessionState;
      readonly partyMembers?: readonly LoadedPartyMember[];
      readonly partyDisplayNames?: ReadonlyMap<number, string>;
      readonly composeRoom?: StoredCharacterRoomComposer;
      readonly initialControllers?: readonly ControllerIdentity[];
      readonly playerIds?: readonly CombatantId[];
      readonly turnLegalActions?: TurnLegalActions;
      readonly reactionLegalActions?: ReactionLegalActions;
      readonly bridge?: DmBridgeConnection;
      readonly dmModel?: DmBridgeModelConfig;
      readonly agentSession?: Pick<AgentSessionBinding, 'cli' | 'sessionId' | 'adapterVersion'>;
      readonly steeringMode?: SteeringCoordinatorMode;
      readonly onSteeringTelemetry?: (telemetry: SteeringTelemetry) => void;
      readonly reactionOfferPolicy?: ReactionOfferHostPolicy;
      readonly onReducerInvocation?: (command: EncounterCommand) => void;
    } = {},
  ) {
    this.sessionId = encounterSessionId(sessionKey);
    this.#store = store;
    this.#steeringMode = options.steeringMode ?? { kind: 'full_model' };
    this.#onSteeringTelemetry = options.onSteeringTelemetry ?? (() => undefined);
    this.#playerIds = options.playerIds ?? REFERENCE_PLAYER_IDS;
    this.#turnLegalActions = options.turnLegalActions ?? referenceTurnLegalActions;
    this.#reactionLegalActions = options.reactionLegalActions ?? referenceReactionLegalActions;
    this.#partyMembers = options.partyMembers ?? null;
    this.#partyDisplayNames = options.partyDisplayNames ?? new Map();
    this.#composeRoom = options.composeRoom ?? composeStoredCharacterEncounter;
    this.#reactionOfferPolicy = options.reactionOfferPolicy ?? DM_ATTENDED_REACTION_OFFER_POLICY;
    this.#onReducerInvocation = options.onReducerInvocation ?? (() => undefined);
    if (options.bridge !== undefined) {
      this.#mirror.connect(options.bridge);
      this.#roundPlanSession = new DmRoundPlanSession(
        options.bridge,
        options.dmModel,
        (error) => this.exportAndAbortAfterBridgeFailure(error),
        'json_ast',
        {},
        this.#steeringMode,
        this.#onSteeringTelemetry,
      );
    }
    const agentController = this.#roundPlanSession === null
      ? undefined
      : (combatantId: CombatantId) => new DmRoundPlanController(
          this.#roundPlanSession!,
          () => this.#roundPlanContext(combatantId),
        );
    const existing = store.revisions(this.sessionId);
    if (existing.length === 0) {
      const setup = referenceEncounterSetup();
      const state = options.initialState ?? createEncounter(setup);
      const identities = options.initialControllers ?? newIdentities(
        options.bridge === undefined ? 'human' : 'agent',
      );
      const built = registryFromIdentities(identities, agentController);
      this.#registry = built.registry;
      this.#humans = built.humans;
      this.#rng = mulberry32(options.initialSeed ?? DEFAULT_ENCOUNTER_SEED);
      this.#journal = EncounterSessionJournal.create({
        sessionId: this.sessionId,
        branchId: encounterBranchId('branch:reference-main'),
        encounterState: state,
        ...(options.initialPartyState === undefined ? {} : { partyState: options.initialPartyState }),
        coordinatorState: INITIAL_COORDINATOR_STATE,
        controllers: this.#registry.identities(),
        rng: this.#rng,
        store,
        mirror: this.#mirror,
      });
      if (options.agentSession !== undefined) {
        this.#journal.startAgentSession(options.agentSession);
      }
      this.#coordinator = this.#coordinatorFor({
        journal: this.#journal,
        encounterState: state,
        partyState: options.initialPartyState ?? null,
        coordinatorState: INITIAL_COORDINATOR_STATE,
        controllers: identities,
        agentSession: this.#journal.agentSession(),
        rng: this.#rng,
      });
    } else {
      const resumed = EncounterSessionJournal.resume(this.sessionId, store, this.#mirror);
      if (
        options.initialSeed !== undefined &&
        resumed.rng.snapshot().initialSeed !== options.initialSeed
      ) {
        throw new Error(
          `Encounter session ${this.sessionId} already uses seed ${String(resumed.rng.snapshot().initialSeed)}.`,
        );
      }
      const built = registryFromIdentities(resumed.controllers, agentController);
      this.#registry = built.registry;
      this.#humans = built.humans;
      this.#journal = resumed.journal;
      this.#rng = resumed.rng;
      this.#coordinator = this.#coordinatorFor(resumed);
      if (this.#coordinator.pauseState() === null) this.#coordinator.interrupt();
    }
    this.#restoreHostIntegrationState();
  }

  #restoreHostIntegrationState(): void {
    const adjudications = new Map<string, AdjudicationEnvelope>();
    for (const entry of this.#journal.history()) {
      if (entry.void) continue;
      const transition = entry.transition;
      if (transition.kind === 'engine_adjudication_requested') {
        adjudications.set(transition.request.adjudicationRequestId, transition.request);
      } else if (transition.kind === 'engine_adjudication_resolved') {
        adjudications.delete(transition.adjudicationRequestId);
      } else if (transition.kind === 'dm_takeover_started') {
        this.#takeoverOrigins.set(transition.actorId, transition.previousControllerKind);
        this.#pendingHandbacks.delete(transition.actorId);
      } else if (transition.kind === 'dm_handback_requested') {
        this.#takeoverOrigins.set(transition.actorId, transition.controllerKind);
        this.#pendingHandbacks.add(transition.actorId);
      } else if (transition.kind === 'dm_handback_completed') {
        this.#takeoverOrigins.delete(transition.actorId);
        this.#pendingHandbacks.delete(transition.actorId);
      }
    }
    this.#engineAdjudications = [...adjudications.values()]
      .sort((left, right) => left.adjudicationRequestId.localeCompare(right.adjudicationRequestId));
  }

  #coordinatorFor(resume: SessionResume): TurnCoordinator {
    const commandReducer: EncounterCommandReducer = (state, command, rng, options) => {
      this.#onReducerInvocation(command);
      return reduceSessionEncounter(state, command, rng, options);
    };
    return new TurnCoordinator(resume.encounterState, this.#registry, resume.rng, {
      persistence: resume.journal,
      resume: resume.coordinatorState,
      expectedControllers: resume.controllers,
      turnLegalActions: this.#turnLegalActions,
      reactionLegalActions: this.#reactionLegalActions,
      pendingDecisionTray: true,
      commandReducer,
    });
  }

  #agentController(combatantId: CombatantId): Controller {
    if (this.#roundPlanSession === null) {
      throw new Error('Local host needs its DM bridge before restoring an agent controller.');
    }
    return new DmRoundPlanController(
      this.#roundPlanSession,
      () => this.#roundPlanContext(combatantId),
    );
  }

  #roundPlanContext(_combatantId: CombatantId) {
    const binding = this.#journal.agentSession();
    if (binding === null || binding.cli !== 'codex') {
      throw new Error('The existing DM bridge path requires a persisted Codex agent binding.');
    }
    return {
      encounterId: this.sessionId,
      agentSessionId: binding.sessionId,
      projection: this.snapshot().dm,
      history: this.#journal.history(),
      initiativeMode: this.#coordinator.state().config.initiativeMode,
    };
  }

  snapshot(): DmEncounterHostSnapshot {
    const coordinator = this.#coordinator.coordinatorState();
    const history = this.#journal.history();
    const state = this.#coordinator.state();
    const viewerId = this.#playerIds.find((id) => id === state.activeCombatant) ?? this.#playerIds[0];
    if (viewerId === undefined) throw new Error('Player board requires at least one player PC.');
    const player = projectPlayerBoard(
      projectPlayerView(state, {
        seatId: 'seat:local-party',
        combatantId: viewerId,
        ownedCombatantIds: this.#playerIds,
      }),
      coordinator,
      this.#journal.partyState(),
    );
    return detachedImmutable({
      dm: projectDmBoard({
        view: projectDmView(state),
        coordinator,
        controllers: this.#registry.identities(),
        history,
        partyState: this.#journal.partyState(),
        boundaryRefusal: this.#boundaryRefusal,
        actionRefusal: this.#actionRefusal,
        adjudicationPrompts: this.#adjudicationPrompts,
        engineAdjudications: this.#engineAdjudications,
      }),
      player: this.#closed ? { ...player, authorityStatus: 'hard_paused' } : player,
    });
  }

  playerSnapshot(binding: PlayerSeatBinding): PlayerBoardProjection {
    const player = projectPlayerBoard(
      projectPlayerView(this.#coordinator.state(), {
        seatId: binding.seatId,
        combatantId: binding.observerCombatantId,
        ownedCombatantIds: binding.ownedCombatantIds,
      }),
      this.#coordinator.coordinatorState(),
      this.#journal.partyState(),
    );
    return detachedImmutable(this.#closed ? { ...player, authorityStatus: 'hard_paused' } : player);
  }

  rendererTokenBindings(): readonly RendererTokenBinding[] {
    return detachedImmutable(this.#coordinator.state().tokens.map((token) => ({
      tokenId: String(token.id),
      combatantId: token.combatantId,
    })));
  }

  sessionEnded(): boolean {
    return this.#journal.ended();
  }

  subscribe(listener: (snapshot: DmEncounterHostSnapshot) => void): () => void {
    this.#listeners.add(listener);
    this.#notifySnapshotListener(listener, this.snapshot());
    return () => this.#listeners.delete(listener);
  }

  subscribeNotifications(listener: (notification: HostSnapshotNotification) => void): () => void {
    this.#notificationListeners.add(listener);
    this.#notifyNotificationListener(listener, this.#captureNotification('status'));
    return () => this.#notificationListeners.delete(listener);
  }

  subscriberErrors(): readonly HostSubscriberError[] {
    return [...this.#subscriberErrors];
  }

  #notifySnapshotListener(
    listener: (snapshot: DmEncounterHostSnapshot) => void,
    snapshot: DmEncounterHostSnapshot,
  ): void {
    try {
      listener(snapshot);
    } catch (error: unknown) {
      this.#subscriberErrors.push({ channel: 'snapshot', error });
    }
  }

  #notifyNotificationListener(
    listener: (notification: HostSnapshotNotification) => void,
    notification: HostSnapshotNotification,
  ): void {
    try {
      listener(notification);
    } catch (error: unknown) {
      this.#subscriberErrors.push({ channel: 'notification', error });
    }
  }

  #captureNotification(
    kind: HostSnapshotNotificationKind,
    terminalReceipt?: HostTerminalReceipt,
  ): HostSnapshotNotification {
    const state = structuredClone(this.#coordinator.state());
    const coordinator = structuredClone(this.#coordinator.coordinatorState());
    const partyState = this.#journal.partyState();
    const closed = this.#closed;
    const rendererTokenBindings = detachedImmutable(state.tokens.map((token) => ({
      tokenId: String(token.id),
      combatantId: token.combatantId,
    })));
    return {
      kind,
      snapshot: this.snapshot(),
      rendererTokenBindings,
      ...(terminalReceipt === undefined ? {} : { terminalReceipt }),
      playerSnapshot: (binding) => {
        const player = projectPlayerBoard(projectPlayerView(state, {
          seatId: binding.seatId,
          combatantId: binding.observerCombatantId,
          ownedCombatantIds: binding.ownedCombatantIds,
        }), coordinator, partyState);
        return detachedImmutable(closed ? { ...player, authorityStatus: 'hard_paused' } : player);
      },
    };
  }

  #deliverNotification(notification: HostSnapshotNotification): void {
    this.#settleFreshOffers(notification.snapshot);
    for (const listener of this.#notificationListeners) {
      this.#notifyNotificationListener(listener, notification);
    }
    for (const listener of this.#listeners) {
      this.#notifySnapshotListener(listener, notification.snapshot);
    }
  }

  #publish(kind: HostSnapshotNotificationKind = 'status'): void {
    this.#deliverNotification(this.#captureNotification(kind));
  }

  start(): Promise<void> {
    return this.#pumpCoordinator();
  }

  connectBridgeMirror(sink: MirrorSink): void {
    this.#mirror.connect(sink);
  }

  connectDmBridge(bridge: DmBridgeConnection, model?: DmBridgeModelConfig): void {
    this.#mirror.connect(bridge);
    this.#roundPlanSession = new DmRoundPlanSession(
      bridge,
      model,
      (error) => this.exportAndAbortAfterBridgeFailure(error),
      'json_ast',
      {},
      this.#steeringMode,
      this.#onSteeringTelemetry,
    );
    for (const subject of this.#coordinator.state().combatants) {
      if (subject.profile.kind !== 'monster' || subject.life !== 'living') continue;
      this.#coordinator.replaceController(
        subject.profile.id,
        new DmRoundPlanController(
          this.#roundPlanSession,
          () => this.#roundPlanContext(subject.profile.id),
        ),
        `${subject.profile.id}:agent:dm-bridge`,
      );
    }
    this.#publish();
  }

  exportAndAbortAfterBridgeFailure(error: unknown): BridgeAbortReport {
    this.#bridgeFailureGuard ??= new BridgeFailureGuard(
      this.sessionId,
      this.#store,
      () => {
        this.#mirror.disconnect();
        this.#coordinator.interrupt();
        this.#closed = true;
        this.#publish();
      },
    );
    return this.#bridgeFailureGuard.abort(error);
  }

  bridgeFailureReport(): BridgeAbortReport | null {
    return this.#bridgeFailureGuard?.report() ?? null;
  }

  async #pumpCoordinator(): Promise<void> {
    if (this.#closed || this.#repumpBlocked) return;
    if (this.#pump !== null) {
      if (this.#coordinator.pauseState() === null) this.#repumpRequested = true;
      return this.#pump;
    }
    this.#pump = (async () => {
      for (;;) {
        if (this.#closed || this.#repumpBlocked || this.#coordinator.pauseState() !== null) return;
        const step = this.#coordinator.step();
        const pendingRequest = this.#coordinator.coordinatorState().pendingRequest;
        const controllerRequestId = pendingRequest?.requestId ?? null;
        const acceptedTransactionId = (): string | null => {
          const active = this.#activeTransactionRequestId;
          return active !== null && active === controllerRequestId ? active : null;
        };
        try {
          if (
            pendingRequest !== null &&
            this.#registry.kindFor(pendingRequest.actorId) !== 'algorithm'
          ) {
            await this.#store.flush();
          }
        } catch (error: unknown) {
          if (pendingRequest !== null && acceptedTransactionId() === null) {
            await this.#closeAfterInitialOfferFailure(step);
            throw error;
          }
          const transactionRequestId = acceptedTransactionId();
          const handled = this.#handlePumpFailure(error, 'pre_apply', transactionRequestId);
          if (handled) return;
          throw error;
        }
        if (this.#closed) return;
        if (pendingRequest !== null) this.#publish('offer');
        let result: CoordinatorStep;
        try {
          result = await step;
        } catch (error: unknown) {
          if (this.#bridgeFailureGuard !== null && this.#bridgeFailureGuard.report() !== null) return;
          const phase = error instanceof CoordinatorPostApplicationError ? 'post_apply' : 'pre_apply';
          const transactionRequestId = acceptedTransactionId();
          const handled = this.#handlePumpFailure(error, phase, transactionRequestId);
          if (handled) return;
          throw error;
        }
        if (this.#closed) return;
        try {
          this.#completeHandbacksAtTransactionBoundary();
          await this.#store.flush();
        } catch (error: unknown) {
          const phase = result.kind === 'applied' ? 'post_apply' : 'pre_apply';
          const transactionRequestId = acceptedTransactionId();
          const handled = this.#handlePumpFailure(error, phase, transactionRequestId);
          if (handled) return;
          throw error;
        }
        if (this.#closed) return;
        const transactionRequestId = acceptedTransactionId();
        let primaryNotification: HostSnapshotNotification | null = null;
        let autonomousReactionNotifications: readonly HostSnapshotNotification[] = [];
        try {
          if (result.kind === 'applied') {
            primaryNotification = this.#captureNotification(
              transactionRequestId === null ? 'autonomous' : 'mutation',
              transactionRequestId === null
                ? undefined
                : {
                    kind: 'offered_action',
                    requestId: transactionRequestId,
                    revision: result.state.revision,
                  },
            );
          }
          if (this.#coordinator.state().pendingDecisions.some((decision) => decision.kind === 'reaction_offer')) {
            autonomousReactionNotifications = await this.#autoResolveUnattendedReactionOffers();
          }
        } catch (error: unknown) {
          const phase = result.kind === 'applied' ||
            error instanceof CoordinatorPostApplicationError ||
            error instanceof HostPostApplicationError ||
            autonomousReactionNotifications.length > 0
            ? 'post_apply'
            : 'pre_apply';
          if (result.kind === 'refused' && transactionRequestId !== null) {
            this.#settleTransaction(transactionRequestId, {
              kind: 'refused', reason: result.reason,
            });
          }
          const handled = this.#handlePumpFailure(error, phase, transactionRequestId);
          if (handled) return;
          throw error;
        }
        if (this.#closed) return;
        if (result.kind === 'applied' && transactionRequestId !== null) {
          this.#settleTransaction(transactionRequestId, {
            kind: 'committed',
            revision: result.state.revision,
          });
        }
        if (primaryNotification !== null) this.#deliverNotification(primaryNotification);
        if (this.#closed) return;
        for (const notification of autonomousReactionNotifications) {
          this.#deliverNotification(notification);
          if (this.#closed) return;
        }
        if (result.kind === 'applied') {
          this.#boundaryRefusal = null;
          continue;
        }
        if (
          autonomousReactionNotifications.length > 0 &&
          result.kind === 'refused' &&
          result.pendingDecisionCode === 'turn_boundary_blocked'
        ) {
          this.#boundaryRefusal = null;
          if (transactionRequestId !== null) {
            this.#settleTransaction(transactionRequestId, {
              kind: 'refused', reason: result.reason,
            });
          }
          continue;
        }
        if (result.kind === 'refused') {
          this.#boundaryRefusal = result.pendingDecisionCode === 'turn_boundary_blocked'
            ? { code: result.pendingDecisionCode, message: result.reason }
            : null;
          let automaticConsequenceApplied = false;
          try {
            const notificationKind = result.actionRefusal === undefined
              ? 'status'
              : this.#routeActionRefusal(result.actionRefusal);
            if (notificationKind === 'autonomous') {
              automaticConsequenceApplied = true;
              await this.#store.flush();
              if (this.#closed) return;
            }
            this.#publish(notificationKind);
          } catch (error: unknown) {
            if (transactionRequestId !== null) {
              this.#settleTransaction(transactionRequestId, result.reason === 'Coordinator is paused.'
                ? { kind: 'cancelled', reason: result.reason }
                : { kind: 'refused', reason: result.reason });
            }
            const phase = error instanceof CoordinatorPostApplicationError ||
              error instanceof HostPostApplicationError ||
              automaticConsequenceApplied
              ? 'post_apply'
              : 'pre_apply';
            const handled = this.#handlePumpFailure(error, phase, null);
            if (transactionRequestId !== null || handled) return;
            throw error;
          }
          if (transactionRequestId !== null) {
            this.#settleTransaction(transactionRequestId, result.reason === 'Coordinator is paused.'
              ? { kind: 'cancelled', reason: result.reason }
              : { kind: 'refused', reason: result.reason });
          }
          this.#settleFreshOfferWaiters({ kind: 'refused', reason: result.reason });
          return;
        }
        this.#boundaryRefusal = null;
      }
    })().finally(() => {
      this.#pump = null;
      const repump = this.#repumpRequested;
      this.#repumpRequested = false;
      if (
        repump &&
        !this.#closed &&
        !this.#repumpBlocked &&
        this.#coordinator.pauseState() === null
      ) {
        void this.#pumpCoordinator();
      }
    });
    return this.#pump;
  }

  async #closeAfterInitialOfferFailure(step: Promise<CoordinatorStep>): Promise<void> {
    try {
      this.#coordinator.interrupt();
    } catch {
      // Controller cleanup is unconditional even when its journal writes fail.
    }
    this.#closed = true;
    this.#repumpRequested = false;
    try {
      await step;
    } catch {
      // The host is closing; the cancelled offer cannot be resumed.
    }
    this.#publish('recovery');
    this.#settleAllTransactions({ kind: 'closed' });
    this.#settleFreshOfferWaiters({ kind: 'closed' });
  }

  #handlePumpFailure(
    error: unknown,
    phase: 'pre_apply' | 'post_apply',
    transactionRequestId: string | null,
  ): boolean {
    const handled = transactionRequestId !== null || this.#freshOfferWaiters.size > 0;
    if (transactionRequestId !== null) {
      this.#settleTransaction(transactionRequestId, {
        kind: 'failed',
        phase,
        error,
        currentRevision: this.#coordinator.state().revision,
      });
    }
    this.#settleFreshOfferWaiters({ kind: 'failed', error });
    if (phase === 'post_apply') {
      this.#degradeAfterApplicationFailure();
    } else if (!this.#closed && this.#coordinator.pauseState() === null) {
      this.#repumpRequested = true;
    }
    return handled;
  }

  #degradeAfterApplicationFailure(): void {
    this.#closed = true;
    this.#repumpBlocked = false;
    this.#publish('recovery');
    this.#settleAllTransactions({ kind: 'closed' });
    this.#settleFreshOfferWaiters({ kind: 'closed' });
  }

  #settleTransaction(requestId: string, outcome: HostCoordinatorTransactionOutcome): void {
    const waiter = this.#transactionWaiters.get(requestId);
    if (waiter === undefined) return;
    this.#transactionWaiters.delete(requestId);
    if (this.#activeTransactionRequestId === requestId) this.#activeTransactionRequestId = null;
    waiter.resolve(outcome);
  }

  #settleAllTransactions(outcome: HostCoordinatorTransactionOutcome): void {
    for (const requestId of [...this.#transactionWaiters.keys()]) {
      this.#settleTransaction(requestId, outcome);
    }
  }

  #settleFreshOffers(snapshot: DmEncounterHostSnapshot): void {
    const pending = snapshot.dm.pendingRequest;
    if (pending === null) return;
    for (const waiter of [...this.#freshOfferWaiters]) {
      if (
        pending.requestId !== waiter.previousRequestId &&
        pending.encounterRevision >= waiter.minimumRevision
      ) {
        this.#freshOfferWaiters.delete(waiter);
        waiter.resolve({ kind: 'fresh' });
      }
    }
  }

  #settleFreshOfferWaiters(outcome: FreshOfferOutcome): void {
    for (const waiter of [...this.#freshOfferWaiters]) {
      this.#freshOfferWaiters.delete(waiter);
      waiter.resolve(outcome);
    }
  }

  async #autoResolveUnattendedReactionOffers(): Promise<readonly HostSnapshotNotification[]> {
    const notifications: HostSnapshotNotification[] = [];
    for (;;) {
      const state = this.#coordinator.state();
      let selected:
        | { readonly kind: 'guidance'; readonly resolution: import('./reaction-guidance').GuidedReactionResolution }
        | { readonly kind: 'fallback'; readonly resolution: import('./reaction-offer-host-policy').AutoResolvedReactionOffer }
        | undefined;
      for (const decision of state.pendingDecisions) {
        if (decision.kind !== 'reaction_offer') continue;
        const guided = guidedPendingReactionResolution(
          state,
          decision,
          this.#registry.kindFor(decision.combatant),
          this.#reactionOfferPolicy,
          this.#journal.reactionGuidance(),
        );
        if (guided !== null) {
          selected = { kind: 'guidance', resolution: guided };
          break;
        }
        const resolution = unattendedReactionOfferResolution(
          state,
          decision,
          this.#registry.kindFor(decision.combatant),
          this.#reactionOfferPolicy,
        );
        if (resolution !== null) {
          selected = { kind: 'fallback', resolution };
          break;
        }
      }
      if (selected === undefined) return notifications;
      const result = this.#coordinator.resolvePendingDecision({
        type: 'resolve_pending_decision',
        decisionId: selected.resolution.decisionId,
        optionId: selected.resolution.resolution,
      });
      if (result.kind === 'refused') {
        throw new Error(`Unattended Reaction resolution was refused: ${result.reason}`);
      }
      try {
        this.#journal.recordHostTransition(selected.kind === 'guidance'
          ? { kind: 'reaction_guidance_auto_resolved', ...selected.resolution }
          : { kind: 'unattended_reaction_auto_resolved', ...selected.resolution });
        await this.#store.flush();
        if (this.#closed) return notifications;
        notifications.push(this.#captureNotification('autonomous'));
      } catch (error: unknown) {
        if (error instanceof HostPostApplicationError) throw error;
        throw new HostPostApplicationError(error);
      }
    }
  }

  #routeActionRefusal(refusal: NonBoundaryActionRefusal): 'status' | 'autonomous' {
    const settings = this.#journal.partyState()?.refusalHandling
      ?? DEFAULT_REFUSAL_HANDLING_SETTINGS;
    const route = routeActionRefusal(settings, refusal);
    this.#actionRefusal = null;
    if (route.kind === 'hard_refusal') {
      this.#actionRefusal = structuredClone(refusal);
      return 'status';
    }
    this.#coordinator.settleActionRefusal();
    if (route.kind === 'fiat_prompt') {
      const state = this.#coordinator.state();
      this.#adjudicationPrompts.push({
        kind: 'adjudication_prompt',
        id: `adjudication:${String(state.revision)}:${String(this.#adjudicationPrompts.length + 1)}`,
        combatant: refusal.combatant,
        boundary: {
          activeCombatant: state.activeCombatant ?? refusal.combatant,
          round: state.round,
        },
        options: [{ id: 'rule_manually', label: 'Rule manually' }],
        refusal: structuredClone(refusal),
      });
      return 'status';
    }
    this.#coordinator.adjudicate({
      type: 'adjudicate',
      target: refusal.combatant,
      subject: `dm-override:refusal-default:${refusal.category}`,
      reasoning: `${route.documentation} Refusal: ${refusal.reason} (${refusal.citation}).`,
      consequence: route.outcome,
    });
    return 'autonomous';
  }

  resolveRefusalPrompt(
    decisionId: string,
    consequence: Extract<EncounterCommand, { readonly type: 'adjudicate' }>['consequence'],
    reasoning: string,
  ): void {
    const index = this.#adjudicationPrompts.findIndex((entry) => entry.id === decisionId);
    const prompt = this.#adjudicationPrompts[index];
    if (prompt === undefined) throw new Error('The adjudication prompt does not exist.');
    this.#adjudicationPrompts.splice(index, 1);
    this.#coordinator.adjudicate({
      type: 'adjudicate',
      target: prompt.refusal.combatant,
      subject: `dm-override:refusal:${prompt.refusal.category}`,
      reasoning: `${reasoning.trim()} Refusal: ${prompt.refusal.reason} (${prompt.refusal.citation}).`,
      consequence,
    });
    this.#coordinator.resume();
    this.#publish();
  }

  engineAdjudicationSink(): AdjudicationSink {
    return { append: (request) => this.requestEngineAdjudication(request) };
  }

  turnExhaustionCoordinator(): TurnExhaustionCoordinator {
    return new TurnExhaustionCoordinator(this.#journal.turnExhaustionPersistence());
  }

  requestEngineAdjudication(request: AdjudicationEnvelope): void {
    const latest = [...this.#journal.history()].reverse().find((entry) => !entry.void);
    if (latest === undefined || request.runId !== this.sessionId || request.branchId !== latest.branchId ||
      request.expectedRevision !== latest.revision) {
      throw new Error('Engine adjudication request is stale or belongs to another run.');
    }
    if (!this.#coordinator.state().combatants.some((entry) => entry.profile.id === request.actorId)) {
      throw new Error('Engine adjudication request actor does not exist.');
    }
    const existing = this.#engineAdjudications.find((entry) =>
      entry.adjudicationRequestId === request.adjudicationRequestId);
    if (existing !== undefined) {
      if (canonicalJson(existing) !== canonicalJson(request)) {
        throw new Error('Engine adjudication request ID was reused with different content.');
      }
      return;
    }
    this.#journal.recordHostTransition({
      kind: 'engine_adjudication_requested',
      request: structuredClone(request),
    });
    this.#engineAdjudications.push(structuredClone(request));
    this.#engineAdjudications.sort((left, right) =>
      left.adjudicationRequestId.localeCompare(right.adjudicationRequestId));
    if (request.blocking) this.#coordinator.interrupt();
    this.#publish();
  }

  resolveEngineAdjudication(
    adjudicationRequestId: string,
    consequence: Extract<EncounterCommand, { readonly type: 'adjudicate' }>['consequence'],
    reasoning: string,
  ): void {
    const index = this.#engineAdjudications.findIndex((entry) =>
      entry.adjudicationRequestId === adjudicationRequestId);
    const request = this.#engineAdjudications[index];
    if (request === undefined) throw new Error('The engine adjudication request does not exist.');
    const verdictSubject = `engine-mcp-adjudication:${request.adjudicationRequestId}:${request.subject}`;
    this.#coordinator.adjudicate({
      type: 'adjudicate',
      target: request.actorId as CombatantId,
      subject: verdictSubject,
      reasoning: reasoning.trim(),
      consequence,
    });
    this.#journal.recordHostTransition({
      kind: 'engine_adjudication_resolved',
      adjudicationRequestId: request.adjudicationRequestId,
      verdictSubject,
    });
    this.#engineAdjudications.splice(index, 1);
    this.#publish();
  }

  submitHumanDecision(actor: CombatantId, decision: Parameters<HumanController['submit']>[0]): void {
    const human = this.#humans.get(actor);
    if (human === undefined) throw new Error(`Combatant ${actor} is not locally human-controlled.`);
    human.submit(decision);
  }

  submitHumanDecisionTransaction(
    actor: CombatantId,
    decision: Parameters<HumanController['submit']>[0],
  ): Promise<HostCoordinatorTransactionOutcome> {
    if (this.#closed) return Promise.resolve({ kind: 'closed' });
    const pending = this.#coordinator.coordinatorState().pendingRequest;
    if (
      pending === null ||
      pending.actorId !== actor ||
      pending.requestId !== decision.requestId ||
      pending.encounterRevision !== decision.encounterRevision
    ) {
      return Promise.resolve({ kind: 'refused', reason: 'The offered controller request is stale.' });
    }
    if (this.#activeTransactionRequestId !== null || this.#transactionWaiters.has(decision.requestId)) {
      return Promise.resolve({ kind: 'refused', reason: 'The offered controller request is already settling.' });
    }
    return new Promise((resolve, reject) => {
      this.#transactionWaiters.set(decision.requestId, { resolve });
      this.#activeTransactionRequestId = decision.requestId;
      try {
        this.submitHumanDecision(actor, decision);
      } catch (error: unknown) {
        this.#transactionWaiters.delete(decision.requestId);
        this.#activeTransactionRequestId = null;
        reject(error);
      }
    });
  }

  submitOfferedActionTransaction(
    actor: CombatantId,
    requestId: string,
    encounterRevision: number,
    selectedOfferedActionId: string,
  ): Promise<HostCoordinatorTransactionOutcome> {
    const pending = this.#coordinator.coordinatorState().pendingRequest;
    if (
      pending === null ||
      pending.actorId !== actor ||
      pending.requestId !== requestId ||
      pending.encounterRevision !== encounterRevision
    ) {
      return Promise.resolve({ kind: 'refused', reason: 'The offered controller request is stale.' });
    }
    const index = pending.legalActions.actions.findIndex(
      (_action, actionIndex) => offeredActionId(pending.requestId, actionIndex) === selectedOfferedActionId,
    );
    const action = pending.legalActions.actions[index];
    if (index < 0 || action === undefined) {
      return Promise.resolve({ kind: 'refused', reason: 'The selected offered action id is unknown.' });
    }
    return this.submitHumanDecisionTransaction(actor, {
      requestId,
      encounterRevision,
      action,
    });
  }

  async setDoorOpen(doorId: string, open: boolean): Promise<HostDoorSetOutcome> {
    if (this.#closed) return { kind: 'closed' };
    const initialState = this.#coordinator.state();
    const initialRevision = initialState.revision;
    const activeCombatant = initialState.activeCombatant;
    if (activeCombatant === null) {
      return { kind: 'unsupported', reason: 'Door changes require an active combatant.' };
    }
    const door = initialState.worldObjects.find((object) => String(object.id) === doorId);
    if (door === undefined || door.kind !== 'door') {
      return { kind: 'unsupported', reason: 'The requested world object is not a door.' };
    }
    const canonicalState = canonicalDoorState(door.blocking);
    if (canonicalState === null) {
      return { kind: 'unsupported', reason: 'The door has a noncanonical blocking state.' };
    }
    if (canonicalState === open) {
      try {
        await this.#store.flush();
        if (this.#closed) return { kind: 'closed' };
        return { kind: 'committed', revision: initialRevision, changed: false };
      } catch (error: unknown) {
        if (this.#closed) return { kind: 'closed' };
        return {
          kind: 'failed', phase: 'pre_apply', error,
          currentRevision: this.#coordinator.state().revision,
        };
      }
    }

    const previousRequestId = this.#coordinator.coordinatorState().pendingRequest?.requestId ?? null;
    this.#repumpBlocked = true;
    const pendingPump = this.#pump;
    void pendingPump?.catch(() => undefined);
    let previousPause: ReturnType<TurnCoordinator['pauseState']>;
    try {
      previousPause = this.#coordinator.pauseForExternalMutation();
    } catch (error: unknown) {
      if (error instanceof CoordinatorExternalPauseError && error.pendingStepCancelled) {
        try {
          await pendingPump;
        } catch {
          // The typed failure confirms that the pending controller step was cancelled.
        }
      }
      this.#repumpBlocked = false;
      if (this.#closed) return { kind: 'closed' };
      if (this.#coordinator.pauseState() === null) void this.#pumpCoordinator();
      return {
        kind: 'failed', phase: 'pre_apply', error,
        currentRevision: this.#coordinator.state().revision,
      };
    }
    try {
      await pendingPump;
    } catch (error: unknown) {
      this.#repumpBlocked = false;
      if (this.#closed) return { kind: 'closed' };
      return {
        kind: 'failed', phase: 'pre_apply', error,
        currentRevision: this.#coordinator.state().revision,
      };
    }
    if (this.#closed) {
      this.#repumpBlocked = false;
      return { kind: 'closed' };
    }
    const currentState = this.#coordinator.state();
    const currentDoor = currentState.worldObjects.find((object) => String(object.id) === doorId);
    if (
      currentState.revision !== initialRevision ||
      currentState.activeCombatant !== activeCombatant ||
      currentDoor === undefined ||
      currentDoor.kind !== 'door' ||
      canonicalDoorState(currentDoor.blocking) !== canonicalState
    ) {
      this.#repumpBlocked = false;
      if (previousPause === null && !this.#closed) this.#coordinator.resume();
      return { kind: 'unsupported', reason: 'The door offer became stale before apply.' };
    }

    let result: CoordinatorStep;
    try {
      result = this.#coordinator.applyExternalWorldOperation({
        type: 'world_operation',
        actor: activeCombatant,
        cost: 'none',
        operation: {
          kind: 'modify_object',
          objectId: currentDoor.id,
          changes: { blocking: doorBlockingFor(open) },
        },
      });
    } catch (error: unknown) {
      this.#repumpBlocked = false;
      const phase = error instanceof CoordinatorPostApplicationError ? 'post_apply' : 'pre_apply';
      if (phase === 'post_apply') {
        this.#degradeAfterApplicationFailure();
      } else if (previousPause === null && !this.#closed) {
        this.#coordinator.resume();
      }
      return {
        kind: 'failed', phase, error,
        currentRevision: this.#coordinator.state().revision,
      };
    }
    if (result.kind !== 'applied') {
      this.#repumpBlocked = false;
      if (previousPause === null) this.#coordinator.resume();
      return { kind: 'unsupported', reason: result.reason };
    }
    try {
      await this.#store.flush();
    } catch (error: unknown) {
      if (this.#closed) {
        this.#repumpBlocked = false;
        return { kind: 'closed' };
      }
      this.#degradeAfterApplicationFailure();
      return {
        kind: 'failed', phase: 'post_apply', error,
        currentRevision: this.#coordinator.state().revision,
      };
    }
    if (this.#closed) {
      this.#repumpBlocked = false;
      return { kind: 'closed' };
    }
    const doorNotification = this.#captureNotification('mutation', {
      kind: 'door',
      revision: result.state.revision,
    });
    if (previousPause === null) {
      const freshOffer = this.#waitForFreshOffer(previousRequestId, result.state.revision);
      try {
        this.#coordinator.resume();
      } catch (error: unknown) {
        this.#repumpBlocked = false;
        this.#degradeAfterApplicationFailure();
        return {
          kind: 'failed', phase: 'post_apply', error,
          currentRevision: this.#coordinator.state().revision,
        };
      }
      if (this.#closed) {
        this.#repumpBlocked = false;
        return { kind: 'closed' };
      }
      this.#repumpBlocked = false;
      void this.#pumpCoordinator();
      const freshOutcome = await freshOffer;
      if (freshOutcome.kind === 'closed' || this.#closed) return { kind: 'closed' };
      if (freshOutcome.kind !== 'fresh') {
        const error = freshOutcome.kind === 'failed'
          ? freshOutcome.error
          : new Error(freshOutcome.reason);
        this.#degradeAfterApplicationFailure();
        return {
          kind: 'failed', phase: 'post_apply', error,
          currentRevision: this.#coordinator.state().revision,
        };
      }
    } else {
      this.#repumpBlocked = false;
    }
    if (this.#closed) return { kind: 'closed' };
    this.#deliverNotification(doorNotification);
    return { kind: 'committed', revision: result.state.revision, changed: true };
  }

  #waitForFreshOffer(previousRequestId: string | null, revision: number): Promise<FreshOfferOutcome> {
    if (this.#closed) return Promise.resolve({ kind: 'closed' });
    const current = this.#coordinator.coordinatorState().pendingRequest;
    if (current !== null && current.requestId !== previousRequestId && current.encounterRevision >= revision) {
      return Promise.resolve({ kind: 'fresh' });
    }
    return new Promise((resolve) => {
      this.#freshOfferWaiters.add({ previousRequestId, minimumRevision: revision, resolve });
    });
  }

  async resolvePendingDecision(
    decisionId: string,
    optionId: string,
  ): Promise<void> {
    const resumeAfter = this.#coordinator.pauseState() === null;
    if (resumeAfter) this.#coordinator.interrupt();
    await this.#pump;
    const result = this.#coordinator.resolvePendingDecision({
      type: 'resolve_pending_decision',
      decisionId,
      optionId,
    });
    this.#boundaryRefusal = result.kind === 'refused' && result.pendingDecisionCode === 'turn_boundary_blocked'
      ? { code: result.pendingDecisionCode, message: result.reason }
      : null;
    this.#publish();
    if (resumeAfter) {
      this.#coordinator.resume();
      this.#publish();
      void this.#pumpCoordinator();
    }
  }

  async setReactionPreference(
    combatant: CombatantId,
    reactionKind: ReactionKind,
    policy: ReactionPolicy,
  ): Promise<void> {
    const resumeAfter = this.#coordinator.pauseState() === null;
    if (resumeAfter) this.#coordinator.interrupt();
    await this.#pump;
    const resumed = this.#journal.updateReactionPreference(combatant, reactionKind, policy);
    const built = registryFromIdentities(
      resumed.controllers,
      this.#roundPlanSession === null ? undefined : (id) => this.#agentController(id),
    );
    this.#registry = built.registry;
    this.#humans = built.humans;
    this.#coordinator = this.#coordinatorFor(resumed);
    this.#boundaryRefusal = null;
    if (resumeAfter) this.#coordinator.resume();
    this.#publish();
    if (resumeAfter) void this.#pumpCoordinator();
  }

  async setHiddenRollCategory(category: HiddenRollCategory, hidden: boolean): Promise<void> {
    const resumeAfter = this.#coordinator.pauseState() === null;
    if (resumeAfter) this.#coordinator.interrupt();
    await this.#pump;
    this.#coordinator.setHiddenRollCategory(category, hidden);
    this.#boundaryRefusal = null;
    this.#publish();
    if (resumeAfter) {
      this.#coordinator.resume();
      this.#publish();
      void this.#pumpCoordinator();
    }
  }

  async setRefusalHandling(category: RefusalCategory, mode: RefusalHandlingMode): Promise<void> {
    const resumeAfter = this.#coordinator.pauseState() === null;
    if (resumeAfter) this.#coordinator.interrupt();
    await this.#pump;
    const resumed = this.#journal.updateRefusalHandling(category, mode);
    this.#replaceFromResume(resumed);
    this.#actionRefusal = null;
    if (resumeAfter) this.#coordinator.resume();
    this.#publish();
    if (resumeAfter) void this.#pumpCoordinator();
  }

  interrupt(): void {
    this.#coordinator.interrupt();
    this.#publish();
  }

  resume(): void {
    this.#coordinator.resume();
    this.#publish();
    void this.#pumpCoordinator();
  }

  adjudicate(command: Extract<EncounterCommand, { readonly type: 'adjudicate' }>): void {
    this.#coordinator.adjudicate(command);
    this.#publish();
  }

  resolvePendingPlacement(
    command: Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }>,
  ): ReturnType<TurnCoordinator['resolvePendingPlacement']> {
    const result = this.#coordinator.resolvePendingPlacement(command);
    this.#actionRefusal = null;
    this.#boundaryRefusal = null;
    this.#publish();
    if (result.kind === 'applied' && this.#coordinator.state().phase.kind !== 'awaiting_placement') {
      void this.#pumpCoordinator();
    }
    return result;
  }

  dmUseWorldObject(command: Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>): void {
    this.#coordinator.dmUseWorldObject(command);
    this.#publish();
  }

  async undoLast(): Promise<void> {
    const history = this.#journal.history();
    const reducer = [...history].reverse().find(
      (entry) => !entry.void && entry.transition.kind === 'reducer_applied',
    );
    if (reducer?.parentRevision === null || reducer === undefined) return;
    this.#coordinator.interrupt();
    await this.#pump;
    const resumed = this.#journal.moveHead(
      'undo',
      reducer.parentRevision,
      encounterBranchId(`branch:undo:${history.length + 1}`),
    );
    const built = registryFromIdentities(resumed.controllers);
    this.#registry = built.registry;
    this.#humans = built.humans;
    this.#rng = resumed.rng;
    this.#coordinator = this.#coordinatorFor(resumed);
    this.#publish();
    void this.#pumpCoordinator();
  }

  async skipTurn(): Promise<void> {
    const resumeAfter = this.#coordinator.pauseState() === null;
    if (resumeAfter) this.#coordinator.interrupt();
    await this.#pump;
    this.#replaceFromResume(this.#journal.skipTurn());
    if (resumeAfter) this.#coordinator.resume();
    this.#publish();
    if (resumeAfter) void this.#pumpCoordinator();
  }

  async delayTurn(afterCombatant: CombatantId): Promise<void> {
    const resumeAfter = this.#coordinator.pauseState() === null;
    if (resumeAfter) this.#coordinator.interrupt();
    await this.#pump;
    this.#replaceFromResume(this.#journal.delayTurn(afterCombatant));
    if (resumeAfter) this.#coordinator.resume();
    this.#publish();
    if (resumeAfter) void this.#pumpCoordinator();
  }

  async rewindToRound(round: number): Promise<void> {
    this.#coordinator.interrupt();
    await this.#pump;
    const historyLength = this.#journal.history().length;
    this.#replaceFromResume(this.#journal.rewindToRound(
      round,
      encounterBranchId(`branch:rewind-round:${String(round)}:${String(historyLength + 1)}`),
    ));
    this.#boundaryRefusal = null;
    this.#publish();
    if (this.#coordinator.pauseState() === null) void this.#pumpCoordinator();
  }

  #replaceFromResume(resumed: SessionResume): void {
    const built = registryFromIdentities(
      resumed.controllers,
      this.#roundPlanSession === null ? undefined : (id) => this.#agentController(id),
    );
    this.#registry = built.registry;
    this.#humans = built.humans;
    this.#rng = resumed.rng;
    this.#coordinator = this.#coordinatorFor(resumed);
  }

  async finishRoom(shortRestSpends: readonly ShortRestHitDieSpend[] | null): Promise<void> {
    if (this.#partyMembers === null || this.#journal.partyState() === null) {
      throw new Error('This encounter is not part of a stored-character adventuring day.');
    }
    this.#coordinator.interrupt();
    await this.#pump;
    const previousControllers = this.#registry.identities();
    let partyState = this.#partyStateHasBoundaryRuling
      ? this.#journal.partyState()!
      : this.#journal.capturePartyState();
    if (shortRestSpends !== null) {
      partyState = this.#journal.takeShortRest(shortRestSpends).state;
    }
    const encounter = this.#composeRoom(
      this.#partyMembers,
      this.#partyDisplayNames,
      advancePartyRoom(partyState),
    );
    const controllers = carryControllerAssignments(previousControllers, encounter.controllers);
    partyState = this.#journal.composeNextRoom({
      encounterState: encounter.state,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers,
    });
    const built = registryFromIdentities(
      controllers,
      this.#roundPlanSession === null ? undefined : (id) => this.#agentController(id),
    );
    this.#registry = built.registry;
    this.#humans = built.humans;
    this.#coordinator = this.#coordinatorFor({
      journal: this.#journal,
      encounterState: encounter.state,
      partyState,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers,
      agentSession: this.#journal.agentSession(),
      rng: this.#rng,
    });
    this.#partyStateHasBoundaryRuling = false;
    this.#publish();
    void this.#pumpCoordinator();
  }

  async finishAdventuringDay(): Promise<LongRestResult> {
    if (this.#partyMembers === null || this.#journal.partyState() === null) {
      throw new Error('This encounter is not part of a stored-character adventuring day.');
    }
    this.#coordinator.interrupt();
    await this.#pump;
    if (!this.#partyStateHasBoundaryRuling) this.#journal.capturePartyState();
    const rested = this.#journal.takeLongRest();
    this.#partyStateHasBoundaryRuling = false;
    this.#publish();
    return structuredClone(rested);
  }

  async endSession(): Promise<void> {
    if (this.#journal.ended()) throw new Error('Encounter session has already ended.');
    this.#coordinator.interrupt();
    await this.#pump;
    if (this.#journal.partyState() !== null && !this.#partyStateHasBoundaryRuling) {
      this.#journal.capturePartyState();
    }
    this.#journal.endSession();
    this.#partyStateHasBoundaryRuling = false;
    this.#publish();
  }

  async resolveRestInterruption(outcome: RestInterruptionOutcome): Promise<RestInterruptionResult> {
    if (this.#partyMembers === null || this.#journal.partyState() === null) {
      throw new Error('This encounter is not part of a stored-character adventuring day.');
    }
    this.#coordinator.interrupt();
    await this.#pump;
    if (!this.#partyStateHasBoundaryRuling) this.#journal.capturePartyState();
    const result = this.#journal.resolveRestInterruption(outcome);
    this.#partyStateHasBoundaryRuling = true;
    this.#publish();
    return structuredClone(result);
  }

  replaceController(combatantId: CombatantId, kind: 'human' | 'algorithm'): void {
    if (this.#coordinator.coordinatorState().pendingRequest !== null) {
      throw new ControllerAssignmentError(
        'action_boundary_required',
        'Controller assignment changes require an action boundary.',
      );
    }
    const controller = kind === 'human' ? new HumanController() : new WorldObjectAlgorithmController();
    if (!this.#registry.identities().some((identity) => identity.combatantId === combatantId)) {
      throw new ControllerAssignmentError(
        'combatant_not_found',
        `Controller assignment target ${combatantId} does not exist.`,
      );
    }
    try {
      this.#coordinator.replaceController(combatantId, controller);
    } catch (error: unknown) {
      throw new ControllerAssignmentError(
        'assignment_failed',
        `Controller assignment for ${combatantId} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        { cause: error },
      );
    }
    const humans = new Map(this.#humans);
    if (controller instanceof HumanController) humans.set(combatantId, controller);
    else humans.delete(combatantId);
    this.#humans = humans;
    this.#publish();
    void this.#pumpCoordinator();
  }

  takeOverController(combatantId: CombatantId): void {
    const previous = this.#registry.identities().find((entry) => entry.combatantId === combatantId);
    if (previous === undefined) {
      throw new ControllerAssignmentError('combatant_not_found', `Controller assignment target ${combatantId} does not exist.`);
    }
    if (previous.kind !== 'agent' && previous.kind !== 'algorithm') {
      throw new ControllerAssignmentError('assignment_failed', 'DM takeover requires an AI-controlled combatant.');
    }
    const human = new HumanController();
    this.#takeoverOrigins.set(combatantId, previous.kind);
    this.#pendingHandbacks.delete(combatantId);
    this.#coordinator.replaceController(combatantId, human, `${combatantId}:human:dm-takeover`);
    const humans = new Map(this.#humans);
    humans.set(combatantId, human);
    this.#humans = humans;
    this.#journal.recordHostTransition({
      kind: 'dm_takeover_started',
      actorId: combatantId,
      previousControllerKind: previous.kind,
    });
    this.#publish();
    void this.#pumpCoordinator();
  }

  handBackController(combatantId: CombatantId): void {
    const controllerKind = this.#takeoverOrigins.get(combatantId);
    if (controllerKind === undefined) throw new Error('Combatant is not under DM takeover.');
    if (this.#atTransactionBoundary()) {
      this.#applyHandback(combatantId, controllerKind);
      this.#publish();
      void this.#pumpCoordinator();
      return;
    }
    if (!this.#pendingHandbacks.has(combatantId)) {
      this.#pendingHandbacks.add(combatantId);
      this.#journal.recordHostTransition({
        kind: 'dm_handback_requested',
        actorId: combatantId,
        controllerKind,
      });
    }
    this.#publish();
  }

  #atTransactionBoundary(): boolean {
    const state = this.#coordinator.coordinatorState();
    return state.pendingRequest === null && state.pendingCommand === null && state.continuation.kind === 'idle';
  }

  #completeHandbacksAtTransactionBoundary(): void {
    if (!this.#atTransactionBoundary()) return;
    for (const combatantId of [...this.#pendingHandbacks].sort((left, right) => left.localeCompare(right))) {
      const kind = this.#takeoverOrigins.get(combatantId);
      if (kind !== undefined) this.#applyHandback(combatantId, kind);
    }
  }

  #applyHandback(combatantId: CombatantId, kind: 'agent' | 'algorithm'): void {
    const controller = kind === 'agent'
      ? this.#agentController(combatantId)
      : new WorldObjectAlgorithmController();
    this.#coordinator.replaceController(combatantId, controller, `${combatantId}:${kind}:dm-handback`);
    const humans = new Map(this.#humans);
    humans.delete(combatantId);
    this.#humans = humans;
    this.#takeoverOrigins.delete(combatantId);
    this.#pendingHandbacks.delete(combatantId);
    this.#journal.recordHostTransition({
      kind: 'dm_handback_completed',
      actorId: combatantId,
      controllerKind: kind,
    });
  }

  close(): void {
    let interruptionFailed = false;
    let interruptionError: unknown;
    if (!this.#closed) {
      try {
        this.#coordinator.interrupt();
      } catch (error: unknown) {
        interruptionFailed = true;
        interruptionError = error;
      }
    }
    this.#closed = true;
    this.#repumpBlocked = false;
    this.#publish('status');
    this.#settleAllTransactions({ kind: 'closed' });
    this.#settleFreshOfferWaiters({ kind: 'closed' });
    this.#listeners.clear();
    this.#notificationListeners.clear();
    if (interruptionFailed) throw interruptionError;
  }
}
