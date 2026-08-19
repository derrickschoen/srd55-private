import {
  StaleControllerResponseError,
  evaluateOpportunityAttackPolicy,
  type ControllerDecision,
  type ControllerRegistry,
  type ControllerRequest,
  type LegalActionSummary,
  type StandingReactionPolicy,
} from './controllers';
import {
  EncounterRuleError,
  reduceEncounter,
  type EncounterReduction,
  type EncounterState,
} from './encounter';
import type { EncounterCommand, EncounterEvent } from './events';
import type { GridCell } from './grid';
import { planMovement, type MovementWorld } from './movement';
import type { Rng } from './random';
import { feet, type CombatantId } from './values';
import { projectEncounter } from './visibility';

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

export interface CoordinatorOptions {
  readonly turnLegalActions?: TurnLegalActions;
  readonly reactionLegalActions?: ReactionLegalActions;
  readonly standingReactionPolicies?: ReadonlyMap<
    CombatantId,
    StandingReactionPolicy
  >;
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

interface CoordinatedMovementStep {
  readonly to: GridCell;
  readonly reactors: readonly CombatantId[];
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
        candidate.profile.kind !== actor.profile.kind &&
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

export class TurnCoordinator {
  #state: EncounterState;
  #requestSequence = 1;
  readonly #pending = new Map<CombatantId, AbortController>();
  readonly #policies = new Map<CombatantId, StandingReactionPolicy>();
  readonly #turnLegalActions: TurnLegalActions;
  readonly #reactionLegalActions: ReactionLegalActions;

  constructor(
    initialState: EncounterState,
    private readonly registry: ControllerRegistry,
    private readonly rng: Rng,
    options: CoordinatorOptions = {},
  ) {
    this.#state = initialState;
    this.#turnLegalActions =
      options.turnLegalActions ??
      ((_state, actor) => ({ actions: [{ type: 'end_turn', actor }] }));
    this.#reactionLegalActions = options.reactionLegalActions ?? (() => []);
    for (const [id, policy] of options.standingReactionPolicies ?? []) {
      this.#policies.set(id, policy);
    }
    this.registry.onReplace((id) => this.#pending.get(id)?.abort());
    for (const subject of initialState.combatants) {
      this.registry.controllerFor(subject.profile.id);
    }
  }

  state(): EncounterState {
    return this.#state;
  }

  setStandingReactionPolicy(
    combatantId: CombatantId,
    policy: StandingReactionPolicy | null,
  ): void {
    if (policy === null) this.#policies.delete(combatantId);
    else this.#policies.set(combatantId, policy);
  }

  replaceController(combatantId: CombatantId, controller: Parameters<ControllerRegistry['replace']>[1]): void {
    this.registry.replace(combatantId, controller);
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
      const requestId = this.#nextRequestId(kind, actor);
      const common = {
        requestId,
        encounterRevision: this.#state.revision,
        actorId: actor,
        visibleState: projectEncounter(this.#state, {
          kind: 'player',
          combatantId: actor,
        }),
        legalActions,
      };
      const request: ControllerRequest = kind === 'turn'
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
      const abort = new AbortController();
      this.#pending.set(actor, abort);
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
        return decision;
      } catch (error: unknown) {
        if (generation !== this.registry.generationFor(actor)) {
          continue;
        }
        throw error;
      } finally {
        if (this.#pending.get(actor) === abort) this.#pending.delete(actor);
      }
    }
  }

  #apply(command: EncounterCommand): EncounterReduction {
    const reduction = reduceEncounter(this.#state, command, this.rng);
    this.#state = reduction.state;
    return reduction;
  }

  #isListedAction(
    decision: ControllerDecision,
    legalActions: LegalActionSummary,
  ): boolean {
    return legalActions.actions.some(
      (candidate) => commandKey(candidate) === commandKey(decision.action),
    );
  }

  async #resolveReactionWindow(
    reactors: readonly CombatantId[],
    mover: CombatantId,
  ): Promise<readonly EncounterEvent[]> {
    const events: EncounterEvent[] = [];
    for (const reactor of reactors) {
      if (combatant(this.#state, mover).life !== 'living') break;
      if (!combatant(this.#state, reactor).turn.reactionAvailable) continue;
      const opportunityAttacks = this.#reactionLegalActions(
        this.#state,
        reactor,
        mover,
      );
      const decline: Extract<
        EncounterCommand,
        { readonly type: 'decline_reaction' }
      > = { type: 'decline_reaction', actor: reactor, mover };
      const legalActions = { actions: [...opportunityAttacks, decline] };
      const policy = evaluateOpportunityAttackPolicy(this.#policies.get(reactor) ?? null);
      let action: EncounterCommand;
      if (policy === 'decline') {
        action = decline;
      } else if (policy === 'use') {
        const selected = opportunityAttacks[0];
        if (selected === undefined) {
          throw new EncounterRuleError('Standing use policy has no legal Opportunity Attack.');
        }
        action = selected;
      } else {
        const decision = await this.#decision(
          'reaction',
          reactor,
          legalActions,
          mover,
        );
        if (!this.#isListedAction(decision, legalActions)) {
          throw new EncounterRuleError('Controller selected an unlisted Reaction.');
        }
        action = decision.action;
      }
      events.push(...this.#apply(action).events);
    }
    return events;
  }

  async step(): Promise<CoordinatorStep> {
    try {
      if (this.#state.initiative.length === 0) {
        const reduction = this.#apply({ type: 'roll_initiative' });
        return { kind: 'applied', state: this.#state, events: reduction.events };
      }
      const actor = this.#state.activeCombatant;
      if (actor === null) {
        return { kind: 'refused', state: this.#state, reason: 'No active combatant.' };
      }
      if (combatant(this.#state, actor).life !== 'living') {
        const reduction = this.#apply({ type: 'end_turn', actor });
        return { kind: 'applied', state: this.#state, events: reduction.events };
      }
      const legalActions = this.#turnLegalActions(this.#state, actor);
      const decision = await this.#decision('turn', actor, legalActions);
      if (!this.#isListedAction(decision, legalActions)) {
        return {
          kind: 'refused',
          state: this.#state,
          reason: 'Controller selected an unlisted action.',
        };
      }
      if ('actor' in decision.action && decision.action.actor !== actor) {
        return {
          kind: 'refused',
          state: this.#state,
          reason: 'Controller action belongs to a different combatant.',
        };
      }
      const events: EncounterEvent[] = [];
      if (decision.action.type === 'move') {
        const steps = coordinatedMovementSteps(this.#state, decision.action);
        const hasReactionWindow = steps.some((step) => step.reactors.length > 0);
        if (!hasReactionWindow) {
          events.push(...this.#apply(decision.action).events);
        } else {
          let pendingPath: GridCell[] = [];
          for (const movementStep of steps) {
            if (movementStep.reactors.length > 0) {
              if (pendingPath.length > 0) {
                events.push(...this.#apply({
                  type: 'move',
                  actor,
                  path: pendingPath,
                  cause: 'reactions_resolved',
                }).events);
                pendingPath = [];
              }
              events.push(
                ...await this.#resolveReactionWindow(
                  movementStep.reactors,
                  actor,
                ),
              );
              if (combatant(this.#state, actor).life !== 'living') {
                return { kind: 'applied', state: this.#state, events };
              }
            }
            pendingPath.push(movementStep.to);
          }
          if (pendingPath.length > 0) {
            events.push(...this.#apply({
              type: 'move',
              actor,
              path: pendingPath,
              cause: 'reactions_resolved',
            }).events);
          }
        }
      } else {
        events.push(...this.#apply(decision.action).events);
      }
      return { kind: 'applied', state: this.#state, events };
    } catch (error: unknown) {
      if (
        error instanceof EncounterRuleError ||
        error instanceof StaleControllerResponseError
      ) {
        return { kind: 'refused', state: this.#state, reason: error.message };
      }
      throw error;
    }
  }
}
