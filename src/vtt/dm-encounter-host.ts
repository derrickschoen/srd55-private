import {
  AlgorithmController,
  ControllerRegistry,
  HumanController,
  type Controller,
  type ControllerIdentity,
  type ControllerKind,
} from '../combat/controllers';
import {
  TurnCoordinator,
  type PersistedCoordinatorState,
  type ReactionLegalActions,
  type TurnLegalActions,
} from '../combat/coordinator';
import {
  createEncounter,
  type EncounterState,
  type PendingDecision,
  type ReactionKind,
  type ReactionPolicy,
} from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { HiddenRollCategory } from '../combat/roll-visibility';
import { projectDmView, projectPlayerView } from '../combat/visibility';
import { mulberry32, type SerializableRng } from '../combat/random';
import {
  codexSessionId,
  encounterBranchId,
  encounterSessionId,
  type CombatantId,
  type EncounterSessionId,
} from '../combat/values';
import {
  DeferredMirrorSink,
  EncounterSessionJournal,
  type BrowserSessionStore,
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
  type DmBoardProjection,
  type PlayerBoardProjection,
} from './encounter-projections';
import {
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
  referenceReactionLegalActions,
  referenceTurnLegalActions,
} from './reference-encounter';

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
      return new AlgorithmController();
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

export interface DmBridgeConnection extends DmBridgeExchange, MirrorSink {}

export class DmEncounterHost {
  readonly sessionId: EncounterSessionId;
  readonly #store: BrowserSessionStore;
  readonly #mirror = new DeferredMirrorSink();
  readonly #listeners = new Set<(snapshot: DmEncounterHostSnapshot) => void>();
  #journal: EncounterSessionJournal;
  #registry: ControllerRegistry;
  #humans: ReadonlyMap<CombatantId, HumanController>;
  #coordinator: TurnCoordinator;
  #rng: SerializableRng;
  #pump: Promise<void> | null = null;
  #closed = false;
  #bridgeFailureGuard: BridgeFailureGuard | null = null;
  #roundPlanSession: DmRoundPlanSession | null = null;
  #boundaryRefusal: null | {
    readonly code: 'turn_boundary_blocked';
    readonly message: string;
  } = null;
  #actionRefusal: NonBoundaryActionRefusal | null = null;
  #adjudicationPrompts: Extract<PendingDecision, { readonly kind: 'adjudication_prompt' }>[] = [];
  #partyStateHasBoundaryRuling = false;
  readonly #steeringMode: SteeringCoordinatorMode;
  readonly #onSteeringTelemetry: (telemetry: SteeringTelemetry) => void;
  readonly #playerIds: readonly CombatantId[];
  readonly #turnLegalActions: TurnLegalActions;
  readonly #reactionLegalActions: ReactionLegalActions;
  readonly #partyMembers: readonly LoadedPartyMember[] | null;
  readonly #partyDisplayNames: ReadonlyMap<number, string>;
  readonly #composeRoom: StoredCharacterRoomComposer;

  constructor(
    sessionKey: string,
    store: BrowserSessionStore,
    options: {
      readonly initialState?: EncounterState;
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
      readonly codexSessionId?: ReturnType<typeof codexSessionId>;
      readonly steeringMode?: SteeringCoordinatorMode;
      readonly onSteeringTelemetry?: (telemetry: SteeringTelemetry) => void;
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
      this.#rng = mulberry32(0x315006);
      this.#journal = EncounterSessionJournal.create({
        sessionId: this.sessionId,
        branchId: encounterBranchId('branch:reference-main'),
        encounterState: state,
        ...(options.initialPartyState === undefined ? {} : { partyState: options.initialPartyState }),
        coordinatorState: INITIAL_COORDINATOR_STATE,
        controllers: this.#registry.identities(),
        codexSessionId: options.codexSessionId ?? codexSessionId('codex:increment-6-local'),
        rng: this.#rng,
        store,
        mirror: this.#mirror,
      });
      this.#coordinator = this.#coordinatorFor({
        journal: this.#journal,
        encounterState: state,
        partyState: options.initialPartyState ?? null,
        coordinatorState: INITIAL_COORDINATOR_STATE,
        controllers: identities,
        codexSessionId: options.codexSessionId ?? codexSessionId('codex:increment-6-local'),
        rng: this.#rng,
      });
    } else {
      const resumed = EncounterSessionJournal.resume(this.sessionId, store, this.#mirror);
      const built = registryFromIdentities(resumed.controllers, agentController);
      this.#registry = built.registry;
      this.#humans = built.humans;
      this.#journal = resumed.journal;
      this.#rng = resumed.rng;
      this.#coordinator = this.#coordinatorFor(resumed);
      if (this.#coordinator.pauseState() === null) this.#coordinator.interrupt();
    }
  }

  #coordinatorFor(resume: SessionResume): TurnCoordinator {
    return new TurnCoordinator(resume.encounterState, this.#registry, resume.rng, {
      persistence: resume.journal,
      resume: resume.coordinatorState,
      expectedControllers: resume.controllers,
      turnLegalActions: this.#turnLegalActions,
      reactionLegalActions: this.#reactionLegalActions,
      pendingDecisionTray: true,
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
    return {
      encounterId: this.sessionId,
      codexSessionId: this.#journal.codexSessionId(),
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
    return {
      dm: projectDmBoard({
        view: projectDmView(state),
        coordinator,
        controllers: this.#registry.identities(),
        history,
        partyState: this.#journal.partyState(),
        boundaryRefusal: this.#boundaryRefusal,
        actionRefusal: this.#actionRefusal,
        adjudicationPrompts: this.#adjudicationPrompts,
      }),
      player: this.#closed ? { ...player, authorityStatus: 'hard_paused' } : player,
    };
  }

  sessionEnded(): boolean {
    return this.#journal.ended();
  }

  subscribe(listener: (snapshot: DmEncounterHostSnapshot) => void): () => void {
    this.#listeners.add(listener);
    listener(this.snapshot());
    return () => this.#listeners.delete(listener);
  }

  #publish(): void {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }

  start(): void {
    void this.#pumpCoordinator();
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
    if (this.#pump !== null || this.#closed) return this.#pump ?? Promise.resolve();
    this.#pump = (async () => {
      for (;;) {
        if (this.#closed || this.#coordinator.pauseState() !== null) return;
        const step = this.#coordinator.step();
        await Promise.resolve();
        this.#publish();
        let result;
        try {
          result = await step;
        } catch (error: unknown) {
          if (this.#bridgeFailureGuard?.report() !== null) return;
          throw error;
        }
        this.#publish();
        if (result.kind === 'refused') {
          this.#boundaryRefusal = result.pendingDecisionCode === 'turn_boundary_blocked'
            ? { code: result.pendingDecisionCode, message: result.reason }
            : null;
          if (result.actionRefusal !== undefined) this.#routeActionRefusal(result.actionRefusal);
          this.#publish();
          return;
        }
        this.#boundaryRefusal = null;
      }
    })().finally(() => {
      this.#pump = null;
    });
    return this.#pump;
  }

  #routeActionRefusal(refusal: NonBoundaryActionRefusal): void {
    const settings = this.#journal.partyState()?.refusalHandling
      ?? DEFAULT_REFUSAL_HANDLING_SETTINGS;
    const route = routeActionRefusal(settings, refusal);
    this.#actionRefusal = null;
    if (route.kind === 'hard_refusal') {
      this.#actionRefusal = structuredClone(refusal);
      return;
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
      return;
    }
    this.#coordinator.adjudicate({
      type: 'adjudicate',
      target: refusal.combatant,
      subject: `dm-override:refusal-default:${refusal.category}`,
      reasoning: `${route.documentation} Refusal: ${refusal.reason} (${refusal.citation}).`,
      consequence: route.outcome,
    });
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

  submitHumanDecision(actor: CombatantId, decision: Parameters<HumanController['submit']>[0]): void {
    const human = this.#humans.get(actor);
    if (human === undefined) throw new Error(`Combatant ${actor} is not locally human-controlled.`);
    human.submit(decision);
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
    partyState = this.#journal.composeNextRoom({
      encounterState: encounter.state,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers: encounter.controllers,
    });
    const built = registryFromIdentities(encounter.controllers);
    this.#registry = built.registry;
    this.#humans = built.humans;
    this.#coordinator = this.#coordinatorFor({
      journal: this.#journal,
      encounterState: encounter.state,
      partyState,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers: encounter.controllers,
      codexSessionId: this.#journal.codexSessionId(),
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
      throw new Error('Controller assignment changes require an action boundary.');
    }
    const controller = kind === 'human' ? new HumanController() : new AlgorithmController();
    this.#coordinator.replaceController(combatantId, controller);
    const humans = new Map(this.#humans);
    if (controller instanceof HumanController) humans.set(combatantId, controller);
    else humans.delete(combatantId);
    this.#humans = humans;
    this.#publish();
    void this.#pumpCoordinator();
  }

  close(): void {
    if (this.#closed) return;
    this.#coordinator.interrupt();
    this.#closed = true;
    this.#publish();
    this.#listeners.clear();
  }
}
