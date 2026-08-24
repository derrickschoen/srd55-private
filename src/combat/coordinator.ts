import {
  ControllerRequestCancelledError,
  StaleControllerResponseError,
  evaluateOpportunityAttackPolicy,
  type ControllerDecision,
  type ControllerIdentity,
  type ControllerRegistry,
  type ControllerRequest,
  type LegalActionSummary,
  type StandingReactionPolicy,
} from './controllers';
import {
  combatantsAreAllies,
  EncounterRuleError,
  reduceEncounter,
  type EncounterReduction,
  type ReactionDecisionHook,
  type EncounterState,
} from './encounter';
import type { EncounterCommand, EncounterEvent } from './events';
import type { GridCell } from './grid';
import { planMovement, type MovementWorld } from './movement';
import type { Rng } from './random';
import { feet, type CombatantId } from './values';
import { projectPlayerView } from './visibility';

export type TurnLegalActions = (
  state: EncounterState,
  actor: CombatantId,
) => LegalActionSummary;

export type ReactionLegalActions = (
  state: EncounterState,
  reactor: CombatantId,
  mover: CombatantId,
) => readonly Extract<
  EncounterCommand,
  { readonly type: 'opportunity_attack' }
>[];

interface CoordinatedMovementStep {
  readonly to: GridCell;
  readonly reactors: readonly CombatantId[];
}

export type CoordinatorContinuation =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'turn';
      readonly actor: CombatantId;
      readonly legalActions: LegalActionSummary;
    }
  | {
      readonly kind: 'movement';
      readonly actor: CombatantId;
      readonly steps: readonly CoordinatedMovementStep[];
      readonly stepIndex: number;
      readonly reactorIndex: number;
      readonly pendingPath: readonly GridCell[];
    };

export interface PersistedCoordinatorState {
  readonly requestSequence: number;
  readonly pendingRequest: ControllerRequest | null;
  readonly pendingCommand: EncounterCommand | null;
  readonly continuation: CoordinatorContinuation;
  readonly pause: CoordinatorPause | null;
}

export type CoordinatorPause =
  | { readonly kind: 'interrupted' }
  | { readonly kind: 'adjudicated'; readonly eventSequence: number };

export type DurableCoordinatorTransition =
  | { readonly kind: 'controller_request_issued'; readonly request: ControllerRequest }
  | { readonly kind: 'controller_response_received'; readonly decision: ControllerDecision }
  | { readonly kind: 'controller_request_cancelled'; readonly request: ControllerRequest }
  | { readonly kind: 'controller_replaced'; readonly combatantId: CombatantId }
  | {
      readonly kind: 'reaction_policy_resolved';
      readonly actor: CombatantId;
      readonly decision: 'use' | 'decline';
      readonly command: EncounterCommand;
    }
  | {
      readonly kind: 'reducer_applied';
      readonly command: EncounterCommand;
      readonly events: readonly EncounterEvent[];
    }
  | {
      readonly kind: 'controller_response_refused';
      readonly command: EncounterCommand;
      readonly reason: string;
    }
  | { readonly kind: 'coordinator_paused'; readonly pause: CoordinatorPause }
  | { readonly kind: 'coordinator_resumed'; readonly pause: CoordinatorPause };

export interface CoordinatorPersistence {
  record(input: {
    readonly transition: DurableCoordinatorTransition;
    readonly encounterState: EncounterState;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
  }): void;
}

export interface CoordinatorOptions {
  readonly turnLegalActions?: TurnLegalActions;
  readonly reactionLegalActions?: ReactionLegalActions;
  readonly standingReactionPolicies?: ReadonlyMap<
    CombatantId,
    StandingReactionPolicy
  >;
  readonly persistence?: CoordinatorPersistence;
  readonly resume?: PersistedCoordinatorState;
  readonly expectedControllers?: readonly ControllerIdentity[];
  /** Synchronous event-interception seam; opportunity attacks keep the pending-request path above. */
  readonly reactionDecision?: ReactionDecisionHook;
}

export type CoordinatorStep =
  | {
      readonly kind: 'applied';
      readonly state: EncounterState;
      readonly events: readonly EncounterEvent[];
    }
  | {
      readonly kind: 'refused';
      readonly state: EncounterState;
      readonly reason: string;
    };

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function commandKey(command: EncounterCommand): string {
  return JSON.stringify(command);
}

function combatant(state: EncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new EncounterRuleError(`Unknown combatant ${id}.`);
  return found;
}

function movementWorld(state: EncounterState): MovementWorld<CombatantId> {
  return {
    bounds: state.bounds,
    canTraverseStep: () => true,
    traversal: (actor, _from, to) => {
      if (state.blockedCells.some((cell) => cellKey(cell) === cellKey(to))) {
        return { kind: 'blocked', reason: 'blocked cell' };
      }
      const occupied = state.tokens.some(
        (token) =>
          token.combatantId !== actor &&
          combatant(state, token.combatantId).life !== 'dead' &&
          cellKey(token.position) === cellKey(to),
      );
      return { kind: 'enterable', cost: feet(5), canEnd: !occupied };
    },
  };
}

function coordinatedMovementSteps(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): readonly CoordinatedMovementStep[] {
  if (command.cause === 'reactions_resolved') return [];
  const actor = combatant(state, command.actor);
  const actorToken = state.tokens.find((token) => token.combatantId === command.actor);
  if (actorToken === undefined) throw new EncounterRuleError('Active combatant has no token.');
  const reachSources = state.combatants
    .filter(
      (candidate) =>
        candidate.life === 'living' &&
        !combatantsAreAllies(state, candidate.profile.id, command.actor) &&
        candidate.turn.reactionAvailable,
    )
    .map((candidate) => {
      const token = state.tokens.find(
        (entry) => entry.combatantId === candidate.profile.id,
      );
      if (token === undefined) throw new EncounterRuleError('Reactor has no token.');
      return {
        reactorId: candidate.profile.id,
        cell: token.position,
        reach: candidate.profile.rules.reach,
        reactionAvailable: true,
        hostile: true,
      };
    });
  const plan = planMovement(movementWorld(state), {
    actorId: command.actor,
    start: actorToken.position,
    path: command.path,
    budgetRemaining: actor.turn.movement.remaining,
    cause: actor.turn.disengaging ? 'disengaged' : 'voluntary',
    reachSources,
  });
  if (plan.kind === 'illegal') return [];
  return plan.steps.map((step) => ({
    to: step.to,
    reactors: step.beforeLeaving.map((window) => window.reactorId),
  }));
}

const IDLE: CoordinatorContinuation = { kind: 'idle' };

export class TurnCoordinator {
  #state: EncounterState;
  #requestSequence: number;
  #pendingRequest: ControllerRequest | null;
  #pendingCommand: EncounterCommand | null;
  #continuation: CoordinatorContinuation;
  #pause: CoordinatorPause | null;
  readonly #pendingAbort = new Map<CombatantId, AbortController>();
  readonly #policies = new Map<CombatantId, StandingReactionPolicy>();
  readonly #turnLegalActions: TurnLegalActions;
  readonly #reactionLegalActions: ReactionLegalActions;
  readonly #persistence: CoordinatorPersistence | undefined;
  readonly #reactionDecision: ReactionDecisionHook | undefined;

  constructor(
    initialState: EncounterState,
    private readonly registry: ControllerRegistry,
    private readonly rng: Rng,
    options: CoordinatorOptions = {},
  ) {
    this.#state = initialState;
    this.#requestSequence = options.resume?.requestSequence ?? 1;
    this.#pendingRequest = options.resume?.pendingRequest ?? null;
    this.#pendingCommand = options.resume?.pendingCommand ?? null;
    this.#continuation = options.resume?.continuation ?? IDLE;
    this.#pause = options.resume?.pause ?? null;
    this.#persistence = options.persistence;
    this.#reactionDecision = options.reactionDecision;
    this.#turnLegalActions =
      options.turnLegalActions ??
      ((_state, actor) => ({ actions: [{ type: 'end_turn', actor }] }));
    this.#reactionLegalActions = options.reactionLegalActions ?? (() => []);
    for (const [id, policy] of options.standingReactionPolicies ?? []) {
      this.#policies.set(id, policy);
    }
    this.registry.onReplace((id) => {
      const request = this.#pendingRequest;
      const abort = this.#pendingAbort.get(id);
      if (request !== null && request.actorId === id) {
        this.#pendingRequest = null;
        this.#record({ kind: 'controller_request_cancelled', request });
      } else {
        this.#record({ kind: 'controller_replaced', combatantId: id });
      }
      abort?.abort();
    });
    for (const subject of initialState.combatants) {
      this.registry.controllerFor(subject.profile.id);
    }
    if (
      options.resume !== undefined &&
      (
        options.expectedControllers === undefined ||
        this.registry.identities().length !== options.expectedControllers.length ||
        this.registry.identities().some((actual, index) => {
          const expected = options.expectedControllers?.[index];
          return (
            expected === undefined ||
            actual.combatantId !== expected.combatantId ||
            actual.controllerId !== expected.controllerId ||
            actual.kind !== expected.kind ||
            actual.generation !== expected.generation
          );
        })
      )
    ) {
      throw new Error('Resumed controller identities do not match the durable revision.');
    }
  }

  state(): EncounterState {
    return this.#state;
  }

  coordinatorState(): PersistedCoordinatorState {
    return {
      requestSequence: this.#requestSequence,
      pendingRequest: this.#pendingRequest,
      pendingCommand: this.#pendingCommand,
      continuation: this.#continuation,
      pause: this.#pause,
    };
  }

  pauseState(): CoordinatorPause | null {
    return this.#pause;
  }

  #cancelPendingRequest(): void {
    const request = this.#pendingRequest;
    if (request === null) return;
    this.#pendingRequest = null;
    this.#record({ kind: 'controller_request_cancelled', request });
    this.#pendingAbort.get(request.actorId)?.abort();
  }

  interrupt(): void {
    if (this.#pause !== null) return;
    this.#cancelPendingRequest();
    this.#pause = { kind: 'interrupted' };
    this.#record({ kind: 'coordinator_paused', pause: this.#pause });
  }

  resume(): void {
    const pause = this.#pause;
    if (pause === null) return;
    this.#pause = null;
    this.#record({ kind: 'coordinator_resumed', pause });
  }

  adjudicate(
    command: Extract<EncounterCommand, { readonly type: 'adjudicate' }>,
  ): CoordinatorStep {
    this.#cancelPendingRequest();
    const eventSequence = this.#state.nextEventSequence;
    this.#pause = { kind: 'adjudicated', eventSequence };
    const reduction = this.#apply(command, this.#continuation);
    return { kind: 'applied', state: this.#state, events: reduction.events };
  }

  setStandingReactionPolicy(
    combatantId: CombatantId,
    policy: StandingReactionPolicy | null,
  ): void {
    if (policy === null) this.#policies.delete(combatantId);
    else this.#policies.set(combatantId, policy);
  }

  replaceController(
    combatantId: CombatantId,
    controller: Parameters<ControllerRegistry['replace']>[1],
    controllerId?: string,
  ): void {
    this.registry.replace(combatantId, controller, controllerId);
  }

  #record(transition: DurableCoordinatorTransition): void {
    this.#persistence?.record({
      transition,
      encounterState: this.#state,
      coordinatorState: this.coordinatorState(),
      controllers: this.registry.identities(),
    });
  }

  #nextRequestId(kind: ControllerRequest['kind'], actor: CombatantId): string {
    const id = `${kind}:${this.#state.revision}:${actor}:${this.#requestSequence}`;
    this.#requestSequence += 1;
    return id;
  }

  async #decision(
    kind: ControllerRequest['kind'],
    actor: CombatantId,
    legalActions: LegalActionSummary,
    mover?: CombatantId,
  ): Promise<ControllerDecision> {
    for (;;) {
      const generation = this.registry.generationFor(actor);
      const resumed = this.#pendingRequest;
      let request: ControllerRequest;
      if (
        resumed !== null &&
        resumed.kind === kind &&
        resumed.actorId === actor &&
        (kind === 'turn' || (resumed.kind === 'reaction' && resumed.moverId === mover))
      ) {
        request = resumed;
      } else {
        const common = {
          requestId: this.#nextRequestId(kind, actor),
          encounterRevision: this.#state.revision,
          actorId: actor,
          visibleState: projectPlayerView(this.#state, {
            seatId: String(actor),
            combatantId: actor,
          }),
          legalActions,
        };
        request = kind === 'turn'
          ? { ...common, kind }
          : {
              ...common,
              kind,
              moverId:
                mover ??
                (() => {
                  throw new Error('Reaction request requires a mover.');
                })(),
            };
        this.#pendingRequest = request;
        this.#record({ kind: 'controller_request_issued', request });
      }

      const abort = new AbortController();
      this.#pendingAbort.set(actor, abort);
      try {
        const decision = await this.registry.controllerFor(actor).choose(request, abort.signal);
        if (generation !== this.registry.generationFor(actor)) continue;
        if (
          decision.requestId !== request.requestId ||
          decision.encounterRevision !== request.encounterRevision ||
          this.#state.revision !== request.encounterRevision
        ) {
          throw new StaleControllerResponseError('Controller response is stale.');
        }
        this.#pendingRequest = null;
        this.#pendingCommand = decision.action;
        this.#record({ kind: 'controller_response_received', decision });
        return decision;
      } catch (error: unknown) {
        if (generation !== this.registry.generationFor(actor)) continue;
        throw error;
      } finally {
        if (this.#pendingAbort.get(actor) === abort) this.#pendingAbort.delete(actor);
      }
    }
  }

  #apply(
    command: EncounterCommand,
    continuation: CoordinatorContinuation,
  ): EncounterReduction {
    const reduction = reduceEncounter(this.#state, command, this.rng, {
      ...(this.#reactionDecision === undefined ? {} : { reactionDecision: this.#reactionDecision }),
    });
    this.#state = reduction.state;
    for (const event of reduction.events) {
      if (event.type === 'combatant_summoned') {
        this.registry.assignFrom(event.combatant, event.summoner);
      } else if (event.type === 'summoned_combatant_despawned') {
        this.registry.remove(event.combatant);
      }
    }
    this.#pendingCommand = null;
    this.#continuation = continuation;
    this.#record({
      kind: 'reducer_applied',
      command,
      events: reduction.events,
    });
    return reduction;
  }

  #isListedAction(
    command: EncounterCommand,
    legalActions: LegalActionSummary,
  ): boolean {
    return legalActions.actions.some(
      (candidate) => commandKey(candidate) === commandKey(command),
    );
  }

  #refuseAccepted(command: EncounterCommand, reason: string): CoordinatorStep {
    this.#pendingCommand = null;
    this.#continuation = IDLE;
    this.#record({ kind: 'controller_response_refused', command, reason });
    return { kind: 'refused', state: this.#state, reason };
  }

  async #continueMovement(): Promise<CoordinatorStep> {
    const events: EncounterEvent[] = [];
    for (;;) {
      if (this.#continuation.kind !== 'movement') {
        return { kind: 'applied', state: this.#state, events };
      }
      const continuation = this.#continuation;
      const movementStep = continuation.steps[continuation.stepIndex];
      if (movementStep === undefined) {
        if (continuation.pendingPath.length > 0) {
          events.push(...this.#apply({
            type: 'move',
            actor: continuation.actor,
            path: continuation.pendingPath,
            cause: 'reactions_resolved',
          }, IDLE).events);
        } else {
          this.#continuation = IDLE;
        }
        return { kind: 'applied', state: this.#state, events };
      }

      if (movementStep.reactors.length > 0 && continuation.pendingPath.length > 0) {
        events.push(...this.#apply({
          type: 'move',
          actor: continuation.actor,
          path: continuation.pendingPath,
          cause: 'reactions_resolved',
        }, { ...continuation, pendingPath: [] }).events);
        continue;
      }

      const reactor = movementStep.reactors[continuation.reactorIndex];
      if (reactor !== undefined) {
        const nextContinuation: CoordinatorContinuation = {
          ...continuation,
          reactorIndex: continuation.reactorIndex + 1,
        };
        if (
          combatant(this.#state, continuation.actor).life !== 'living' ||
          !combatant(this.#state, reactor).turn.reactionAvailable
        ) {
          this.#continuation = nextContinuation;
          continue;
        }
        const opportunityAttacks = this.#reactionLegalActions(
          this.#state,
          reactor,
          continuation.actor,
        );
        const decline: Extract<
          EncounterCommand,
          { readonly type: 'decline_reaction' }
        > = {
          type: 'decline_reaction',
          actor: reactor,
          mover: continuation.actor,
        };
        const legalActions = { actions: [...opportunityAttacks, decline] };
        let action = this.#pendingCommand;
        if (action === null) {
          const policy = evaluateOpportunityAttackPolicy(this.#policies.get(reactor) ?? null);
          if (policy === 'decline') {
            action = decline;
            this.#pendingCommand = action;
            this.#record({
              kind: 'reaction_policy_resolved',
              actor: reactor,
              decision: policy,
              command: action,
            });
          } else if (policy === 'use') {
            const selected = opportunityAttacks[0];
            if (selected === undefined) {
              throw new EncounterRuleError(
                'Standing use policy has no legal Opportunity Attack.',
              );
            }
            action = selected;
            this.#pendingCommand = action;
            this.#record({
              kind: 'reaction_policy_resolved',
              actor: reactor,
              decision: policy,
              command: action,
            });
          } else {
            action = (await this.#decision(
              'reaction',
              reactor,
              legalActions,
              continuation.actor,
            )).action;
          }
        }
        if (!this.#isListedAction(action, legalActions)) {
          return this.#refuseAccepted(action, 'Controller selected an unlisted Reaction.');
        }
        events.push(...this.#apply(action, nextContinuation).events);
        if (combatant(this.#state, continuation.actor).life !== 'living') {
          this.#continuation = IDLE;
          return { kind: 'applied', state: this.#state, events };
        }
        continue;
      }

      this.#continuation = {
        ...continuation,
        stepIndex: continuation.stepIndex + 1,
        reactorIndex: 0,
        pendingPath: [...continuation.pendingPath, movementStep.to],
      };
    }
  }

  async #continueTurn(): Promise<CoordinatorStep> {
    if (this.#continuation.kind !== 'turn') {
      throw new Error('Turn continuation is unavailable.');
    }
    const { actor, legalActions } = this.#continuation;
    let action = this.#pendingCommand;
    if (action === null) {
      action = (await this.#decision('turn', actor, legalActions)).action;
    }
    if (!this.#isListedAction(action, legalActions)) {
      return this.#refuseAccepted(action, 'Controller selected an unlisted action.');
    }
    if ('actor' in action && action.actor !== actor) {
      return this.#refuseAccepted(
        action,
        'Controller action belongs to a different combatant.',
      );
    }
    if (action.type !== 'move') {
      const reduction = this.#apply(action, IDLE);
      return { kind: 'applied', state: this.#state, events: reduction.events };
    }
    const steps = coordinatedMovementSteps(this.#state, action);
    if (!steps.some((step) => step.reactors.length > 0)) {
      const reduction = this.#apply(action, IDLE);
      return { kind: 'applied', state: this.#state, events: reduction.events };
    }
    this.#pendingCommand = null;
    this.#continuation = {
      kind: 'movement',
      actor,
      steps,
      stepIndex: 0,
      reactorIndex: 0,
      pendingPath: [],
    };
    return this.#continueMovement();
  }

  async step(): Promise<CoordinatorStep> {
    try {
      if (this.#pause !== null) {
        return { kind: 'refused', state: this.#state, reason: 'Coordinator is paused.' };
      }
      if (this.#continuation.kind === 'movement') return await this.#continueMovement();
      if (this.#continuation.kind === 'turn') return await this.#continueTurn();
      if (this.#state.initiative.length === 0) {
        const reduction = this.#apply({ type: 'roll_initiative' }, IDLE);
        return { kind: 'applied', state: this.#state, events: reduction.events };
      }
      const actor = this.#state.activeCombatant;
      if (actor === null) {
        return { kind: 'refused', state: this.#state, reason: 'No active combatant.' };
      }
      const deathSave = this.#state.pendingDecisions.find((decision) =>
        decision.kind === 'death_save' && decision.combatant === actor);
      if (deathSave !== undefined) {
        this.#continuation = {
          kind: 'turn',
          actor,
          legalActions: {
            actions: [{
              type: 'resolve_pending_decision',
              decisionId: deathSave.id,
              optionId: 'roll',
            }],
          },
        };
        return await this.#continueTurn();
      }
      if (combatant(this.#state, actor).life !== 'living') {
        const reduction = this.#apply({ type: 'end_turn', actor }, IDLE);
        return { kind: 'applied', state: this.#state, events: reduction.events };
      }
      this.#continuation = {
        kind: 'turn',
        actor,
        legalActions: this.#turnLegalActions(this.#state, actor),
      };
      return await this.#continueTurn();
    } catch (error: unknown) {
      if (
        error instanceof EncounterRuleError ||
        error instanceof StaleControllerResponseError
      ) {
        return { kind: 'refused', state: this.#state, reason: error.message };
      }
      if (error instanceof ControllerRequestCancelledError && this.#pause !== null) {
        return { kind: 'refused', state: this.#state, reason: 'Coordinator is paused.' };
      }
      throw error;
    }
  }
}
