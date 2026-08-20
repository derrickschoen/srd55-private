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
} from '../combat/coordinator';
import {
  createEncounter,
  type EncounterState,
} from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
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
  type SessionResume,
} from './session-persistence';
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

function controllerForKind(kind: ControllerKind): Controller {
  switch (kind) {
    case 'human':
      return new HumanController();
    case 'algorithm':
      return new AlgorithmController();
    case 'agent':
    case 'custom':
      throw new Error(`Local increment-6 host cannot restore a ${kind} controller.`);
  }
}

function registryFromIdentities(
  identities: readonly ControllerIdentity[],
): {
  readonly registry: ControllerRegistry;
  readonly humans: ReadonlyMap<CombatantId, HumanController>;
} {
  const controllers = new Map<CombatantId, Controller>();
  const registry = new ControllerRegistry(
    identities.map((identity) => {
      const controller = controllerForKind(identity.kind);
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
      const controller = controllerForKind(identity.kind);
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

function newIdentities(): readonly ControllerIdentity[] {
  return [...REFERENCE_PLAYER_IDS, encounterSessionMonsterId()].map((combatantId) => ({
    combatantId,
    controllerId: `${combatantId}:human:local`,
    kind: 'human' as const,
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

  constructor(
    sessionKey: string,
    store: BrowserSessionStore,
    options: { readonly initialState?: EncounterState } = {},
  ) {
    this.sessionId = encounterSessionId(sessionKey);
    this.#store = store;
    const existing = store.revisions(this.sessionId);
    if (existing.length === 0) {
      const setup = referenceEncounterSetup();
      const identities = newIdentities();
      const built = registryFromIdentities(identities);
      this.#registry = built.registry;
      this.#humans = built.humans;
      this.#rng = mulberry32(0x315006);
      const state = options.initialState ?? createEncounter(setup);
      this.#journal = EncounterSessionJournal.create({
        sessionId: this.sessionId,
        branchId: encounterBranchId('branch:reference-main'),
        encounterState: state,
        coordinatorState: INITIAL_COORDINATOR_STATE,
        controllers: this.#registry.identities(),
        codexSessionId: codexSessionId('codex:increment-6-local'),
        rng: this.#rng,
        store,
        mirror: this.#mirror,
      });
      this.#coordinator = this.#coordinatorFor({
        journal: this.#journal,
        encounterState: state,
        coordinatorState: INITIAL_COORDINATOR_STATE,
        controllers: identities,
        codexSessionId: codexSessionId('codex:increment-6-local'),
        rng: this.#rng,
      });
    } else {
      const resumed = EncounterSessionJournal.resume(this.sessionId, store, this.#mirror);
      const built = registryFromIdentities(resumed.controllers);
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
      turnLegalActions: referenceTurnLegalActions,
      reactionLegalActions: referenceReactionLegalActions,
    });
  }

  snapshot(): DmEncounterHostSnapshot {
    const coordinator = this.#coordinator.coordinatorState();
    const history = this.#journal.history();
    return {
      dm: projectDmBoard({
        state: this.#coordinator.state(),
        coordinator,
        controllers: this.#registry.identities(),
        history,
      }),
      player: projectPlayerBoard(
        this.#coordinator.state(),
        coordinator,
        REFERENCE_PLAYER_IDS,
      ),
    };
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

  async #pumpCoordinator(): Promise<void> {
    if (this.#pump !== null || this.#closed) return this.#pump ?? Promise.resolve();
    this.#pump = (async () => {
      for (;;) {
        if (this.#closed || this.#coordinator.pauseState() !== null) return;
        const step = this.#coordinator.step();
        await Promise.resolve();
        this.#publish();
        const result = await step;
        this.#publish();
        if (result.kind === 'refused') return;
      }
    })().finally(() => {
      this.#pump = null;
    });
    return this.#pump;
  }

  submitHumanDecision(actor: CombatantId, decision: Parameters<HumanController['submit']>[0]): void {
    const human = this.#humans.get(actor);
    if (human === undefined) throw new Error(`Combatant ${actor} is not locally human-controlled.`);
    human.submit(decision);
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
