import type {
  EncounterCommandReducer,
  EncounterState,
} from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { Rng } from '../combat/random';
import type { CombatantId } from '../combat/values';
import {
  unattendedReactionOfferResolution,
  type AutoResolvedReactionOffer,
  type ReactionOfferHostPolicy,
} from './reaction-offer-host-policy';
import {
  guidedPendingReactionResolution,
  type GuidedReactionResolution,
  type ReactionGuidanceDeclaration,
} from './reaction-guidance';

export type SessionBoundaryScope =
  | 'reaction_offers_only'
  | 'initiative_segment';

export type SessionInitialBoundaryPolicy =
  | 'preserve'
  | 'resolve_before_program';

export interface SessionRandomFork<TRandom extends Rng> {
  fork(): TRandom;
}

export interface SessionCommandTransactionInput<TRandom extends Rng> {
  readonly state: EncounterState;
  readonly random: SessionRandomFork<TRandom>;
  readonly reducer: EncounterCommandReducer;
  readonly boundaryPolicy: ReactionOfferHostPolicy;
  readonly guidance: ReactionGuidanceDeclaration | null;
  readonly boundaryScope: SessionBoundaryScope;
  readonly initialBoundary: SessionInitialBoundaryPolicy;
}

export interface SessionBoundaryResolutions {
  readonly fallbackResolutions: readonly AutoResolvedReactionOffer[];
  readonly guidedResolutions: readonly GuidedReactionResolution[];
}

export interface CompletedSessionCommandTrial<TValue, TRandom extends Rng>
  extends SessionBoundaryResolutions {
  readonly kind: 'completed';
  readonly state: EncounterState;
  readonly random: TRandom;
  readonly revisionDelta: number;
  readonly value: TValue;
}

export interface RolledBackSessionCommandTrial {
  readonly kind: 'rolled_back';
  readonly error: unknown;
}

export type SessionCommandTrialOutcome<TValue, TRandom extends Rng> =
  | CompletedSessionCommandTrial<TValue, TRandom>
  | RolledBackSessionCommandTrial;

export interface SessionCommandProgramPort {
  currentState(): EncounterState;
  apply(command: EncounterCommand): EncounterState;
}

export interface ResolvedSessionBoundary extends SessionBoundaryResolutions {
  readonly state: EncounterState;
}

export function resolveSessionBoundaryDecisions(
  initialState: EncounterState,
  rng: Rng,
  reducer: EncounterCommandReducer,
  policy: ReactionOfferHostPolicy,
  guidance: ReactionGuidanceDeclaration | null,
  boundaryScope: SessionBoundaryScope,
): ResolvedSessionBoundary {
  if (policy.kind === 'dm_attended') {
    return { state: initialState, fallbackResolutions: [], guidedResolutions: [] };
  }
  let state = initialState;
  const fallbackResolutions: AutoResolvedReactionOffer[] = [];
  const guidedResolutions: GuidedReactionResolution[] = [];
  let legendaryBoundaryToResume: {
    readonly activeCombatant: CombatantId;
    readonly round: number;
  } | null = null;
  for (;;) {
    let selected:
      | { readonly kind: 'guidance'; readonly resolution: GuidedReactionResolution }
      | { readonly kind: 'fallback'; readonly resolution: AutoResolvedReactionOffer }
      | undefined;
    for (const decision of state.pendingDecisions) {
      if (decision.kind !== 'reaction_offer') continue;
      const guided = guidedPendingReactionResolution(
        state,
        decision,
        'algorithm',
        policy,
        guidance,
      );
      if (guided !== null) {
        selected = { kind: 'guidance', resolution: guided };
        break;
      }
      const fallback = unattendedReactionOfferResolution(
        state,
        decision,
        'algorithm',
        policy,
      );
      if (fallback !== null) {
        selected = { kind: 'fallback', resolution: fallback };
        break;
      }
    }
    if (selected !== undefined) {
      state = reducer(state, {
        type: 'resolve_pending_decision',
        decisionId: selected.resolution.decisionId,
        optionId: selected.resolution.resolution,
      }, rng).state;
      if (selected.kind === 'guidance') guidedResolutions.push(selected.resolution);
      else fallbackResolutions.push(selected.resolution);
      continue;
    }
    const legendaryResistance = boundaryScope === 'initiative_segment' &&
      state.config.initiativeMode === 'per_combatant'
      ? state.pendingDecisions.find((decision) => decision.kind === 'legendary_resistance')
      : undefined;
    if (legendaryResistance !== undefined) {
      state = reducer(state, {
        type: 'resolve_pending_decision',
        decisionId: legendaryResistance.id,
        optionId: 'suffer',
      }, rng).state;
      continue;
    }
    const legendaryWindow = boundaryScope === 'initiative_segment' &&
      state.config.initiativeMode === 'per_combatant'
      ? state.pendingDecisions.find((decision) => decision.kind === 'legendary_action_window')
      : undefined;
    if (legendaryWindow !== undefined) {
      legendaryBoundaryToResume ??= { ...legendaryWindow.boundary };
      state = reducer(state, {
        type: 'resolve_pending_decision',
        decisionId: legendaryWindow.id,
        optionId: 'pass',
      }, rng).state;
      continue;
    }
    const deathSave = state.pendingDecisions.find((decision) => decision.kind === 'death_save');
    if (deathSave !== undefined) {
      state = reducer(state, {
        type: 'resolve_pending_decision',
        decisionId: deathSave.id,
        optionId: 'roll',
      }, rng).state;
      continue;
    }
    const boundaryToResume = legendaryBoundaryToResume;
    if (boundaryToResume !== null && state.phase.kind === 'active' &&
      state.activeCombatant === boundaryToResume.activeCombatant &&
      state.round === boundaryToResume.round &&
      !state.pendingDecisions.some((decision) =>
        decision.boundary.activeCombatant === boundaryToResume.activeCombatant &&
        decision.boundary.round === boundaryToResume.round)) {
      legendaryBoundaryToResume = null;
      state = reducer(state, {
        type: 'end_turn',
        actor: boundaryToResume.activeCombatant,
      }, rng).state;
      continue;
    }
    return { state, fallbackResolutions, guidedResolutions };
  }
}

const resolveInitialBoundary = Symbol('resolveInitialBoundary');

export class SessionCommandTransaction<TRandom extends Rng>
implements SessionCommandProgramPort {
  readonly #startingRevision: number;
  readonly #random: TRandom;
  readonly #reducer: EncounterCommandReducer;
  readonly #boundaryPolicy: ReactionOfferHostPolicy;
  readonly #guidance: ReactionGuidanceDeclaration | null;
  readonly #boundaryScope: SessionBoundaryScope;
  #state: EncounterState;
  #status: 'active' | 'completed' | 'rolled_back' = 'active';
  readonly #fallbackResolutions: AutoResolvedReactionOffer[] = [];
  readonly #guidedResolutions: GuidedReactionResolution[] = [];

  private constructor(input: SessionCommandTransactionInput<TRandom>) {
    this.#state = input.state;
    this.#startingRevision = input.state.revision;
    this.#random = input.random.fork();
    this.#reducer = input.reducer;
    this.#boundaryPolicy = input.boundaryPolicy;
    this.#guidance = input.guidance;
    this.#boundaryScope = input.boundaryScope;
  }

  static begin<TRandom extends Rng>(
    input: SessionCommandTransactionInput<TRandom>,
  ): SessionCommandTransaction<TRandom> {
    return new SessionCommandTransaction(input);
  }

  currentState(): EncounterState {
    return this.#state;
  }

  apply(command: EncounterCommand): EncounterState {
    this.#assertActive('apply a command');
    const reduced = this.#reducer(this.#state, command, this.#random).state;
    this.#acceptBoundaryResolution(this.#resolveBoundary(reduced));
    return this.#state;
  }

  complete<TValue>(value: TValue): CompletedSessionCommandTrial<TValue, TRandom> {
    this.#assertActive('complete');
    this.#status = 'completed';
    return {
      kind: 'completed',
      state: this.#state,
      random: this.#random,
      revisionDelta: this.#state.revision - this.#startingRevision,
      value,
      fallbackResolutions: [...this.#fallbackResolutions],
      guidedResolutions: [...this.#guidedResolutions],
    };
  }

  rollback(error: unknown): RolledBackSessionCommandTrial {
    this.#assertActive('roll back');
    this.#status = 'rolled_back';
    return { kind: 'rolled_back', error };
  }

  [resolveInitialBoundary](): void {
    this.#assertActive('resolve the initial boundary');
    this.#acceptBoundaryResolution(this.#resolveBoundary(this.#state));
  }

  #resolveBoundary(state: EncounterState): ResolvedSessionBoundary {
    return resolveSessionBoundaryDecisions(
      state,
      this.#random,
      this.#reducer,
      this.#boundaryPolicy,
      this.#guidance,
      this.#boundaryScope,
    );
  }

  #acceptBoundaryResolution(resolved: ResolvedSessionBoundary): void {
    this.#state = resolved.state;
    this.#fallbackResolutions.push(...resolved.fallbackResolutions);
    this.#guidedResolutions.push(...resolved.guidedResolutions);
  }

  #assertActive(operation: string): void {
    if (this.#status !== 'active') {
      throw new Error(`Cannot ${operation} after the session command transaction is ${this.#status}.`);
    }
  }
}

export function runSessionCommandTransaction<TValue, TRandom extends Rng>(
  input: SessionCommandTransactionInput<TRandom>,
  program: (commands: SessionCommandProgramPort) => TValue,
): SessionCommandTrialOutcome<TValue, TRandom> {
  const transaction = SessionCommandTransaction.begin(input);
  const commands: SessionCommandProgramPort = Object.freeze({
    currentState: (): EncounterState => transaction.currentState(),
    apply: (command: EncounterCommand): EncounterState => transaction.apply(command),
  });
  try {
    if (input.initialBoundary === 'resolve_before_program') {
      transaction[resolveInitialBoundary]();
    }
    return transaction.complete(program(commands));
  } catch (error: unknown) {
    return transaction.rollback(error);
  }
}
