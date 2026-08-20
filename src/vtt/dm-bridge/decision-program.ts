import type { ControllerDecision, ControllerRequest } from '../../combat/controllers';
import type { Controller } from '../../combat/controllers';
import type { EncounterCommand } from '../../combat/events';
import type { InitiativeMode } from '../../combat/encounter';
import { gridDistance } from '../../combat/grid';
import type { DmVisibleCombatant, DmVisibleEncounterState } from '../../combat/visibility';
import type { CombatantId, EncounterSessionId, CodexSessionId } from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';
import type { SessionHistoryEntry } from '../session-persistence';
import {
  DEFAULT_DM_MODEL_CONFIG,
  DM_BRIDGE_PROTOCOL_VERSION,
  MAX_ROUND_PLAN_CORRECTIONS,
  decodeRoundPlanReply,
  roundPlanReplyContract,
  type DecodedRoundPlanReply,
  type DecisionProgram,
  type DmBridgeExchange,
  type DmBridgeModelConfig,
  type DmBridgeRequest,
  type JsProgramArtifact,
  type MonsterReconsultRequest,
  type MonsterRoundProgram,
  type PlanAction,
  type RoundPlan,
  type RoundPlanCorrectionRequest,
  type RoundPlanRequest,
  type RoundPlanSurface,
  type StatePredicate,
  type TargetSelector,
} from './contracts';
import type { JsTurnProgramLimits } from './js-turn-program';

export class StaleRoundPlanError extends Error {
  override readonly name = 'StaleRoundPlanError' as const;
}

export class RoundPlanDryError extends Error {
  override readonly name = 'RoundPlanDryError' as const;
}

export class RoundPlanCorrectionExhaustedError extends Error {
  override readonly name = 'RoundPlanCorrectionExhaustedError' as const;
}

function requireFullDmProjection(projection: DmBoardProjection): DmVisibleEncounterState {
  if (projection.audience !== 'dm' || projection.encounter.viewer !== 'dm') {
    throw new TypeError('DM bridge requires the full DM projection.');
  }
  return projection.encounter;
}

function subject(state: DmVisibleEncounterState, id: CombatantId): DmVisibleCombatant {
  const found = state.combatants.find((candidate) => candidate.id === id);
  if (found === undefined) throw new TypeError(`Decision program references unknown combatant ${id}.`);
  return found;
}

function evaluatePredicate(predicate: StatePredicate, state: DmVisibleEncounterState): boolean {
  switch (predicate.kind) {
    case 'life_is':
      return subject(state, predicate.combatantId).life === predicate.value;
    case 'hp_percent_below': {
      const combatant = subject(state, predicate.combatantId);
      return combatant.hitPoints * 100 < combatant.rules.hitPointMaximum * predicate.percent;
    }
    case 'distance_at_most':
      return gridDistance(
        subject(state, predicate.left).position,
        subject(state, predicate.right).position,
      ) <= predicate.feet;
    case 'not':
      return !evaluatePredicate(predicate.predicate, state);
    case 'all':
      return predicate.predicates.every((candidate) => evaluatePredicate(candidate, state));
    case 'any':
      return predicate.predicates.some((candidate) => evaluatePredicate(candidate, state));
  }
}

function commandActor(command: EncounterCommand): CombatantId | null {
  return 'actor' in command ? command.actor : null;
}

function targetId(
  selector: TargetSelector,
  actor: CombatantId,
  state: DmVisibleEncounterState,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const acting = subject(state, actor);
  return state.combatants
    .filter((candidate) => candidate.kind !== acting.kind && candidate.life !== 'dead')
    .sort((left, right) => {
      const distance = gridDistance(acting.position, left.position) - gridDistance(acting.position, right.position);
      return distance || left.id.localeCompare(right.id);
    })[0]?.id ?? null;
}

function endpointDistance(
  command: EncounterCommand,
  destination: { readonly column: number; readonly row: number },
): number {
  if (command.type !== 'move') return Number.POSITIVE_INFINITY;
  const endpoint = command.path.at(-1);
  return endpoint === undefined ? Number.POSITIVE_INFINITY : gridDistance(endpoint, destination);
}

function selectAction(
  action: PlanAction,
  actor: CombatantId,
  state: DmVisibleEncounterState,
  legal: readonly EncounterCommand[],
): EncounterCommand | null {
  const actorLegal = legal.filter((command) => commandActor(command) === actor);
  switch (action.kind) {
    case 'attack':
    case 'force_save': {
      const selectedTarget = targetId(action.target, actor, state);
      if (selectedTarget === null) return null;
      return actorLegal.find((command) =>
        command.type === action.kind && command.target === selectedTarget,
      ) ?? null;
    }
    case 'move_toward': {
      const selectedTarget = targetId(action.target, actor, state);
      if (selectedTarget === null) return null;
      const destination = subject(state, selectedTarget).position;
      return actorLegal
        .filter((command) => command.type === 'move')
        .sort((left, right) => endpointDistance(left, destination) - endpointDistance(right, destination))[0] ?? null;
    }
    case 'retreat_toward':
      return actorLegal
        .filter((command) => command.type === 'move')
        .sort((left, right) => endpointDistance(left, action.destination) - endpointDistance(right, action.destination))[0] ?? null;
    case 'use_action':
      return actorLegal.find((command) => command.type === action.action) ?? null;
  }
}

function executeProgram(
  program: DecisionProgram,
  actor: CombatantId,
  state: DmVisibleEncounterState,
  legal: readonly EncounterCommand[],
): EncounterCommand | null {
  switch (program.kind) {
    case 'action':
      return selectAction(program.action, actor, state, legal);
    case 'if':
      return executeProgram(
        evaluatePredicate(program.predicate, state) ? program.then : program.else,
        actor,
        state,
        legal,
      );
    case 'priority':
      for (const choice of program.choices) {
        const selected = executeProgram(choice, actor, state, legal);
        if (selected !== null) return selected;
      }
      return null;
  }
}

export interface RoundPlanContext {
  readonly encounterId: EncounterSessionId;
  readonly codexSessionId: CodexSessionId;
  readonly projection: DmBoardProjection;
  readonly history: readonly SessionHistoryEntry[];
  readonly initiativeMode: InitiativeMode;
}

export class DmRoundPlanSession {
  readonly #plans = new Map<string, RoundPlan>();
  readonly #jsPrograms = new Map<string, JsProgramArtifact>();
  readonly #initialRequests = new Map<string, Promise<RoundPlan>>();
  #requestSequence = 1;

  constructor(
    private readonly exchange: DmBridgeExchange,
    private readonly model: DmBridgeModelConfig = DEFAULT_DM_MODEL_CONFIG,
    private readonly onCorrectionExhausted: (error: RoundPlanCorrectionExhaustedError) => void = () => undefined,
    private readonly surface: RoundPlanSurface = 'json_ast',
    private readonly jsLimits: JsTurnProgramLimits = {},
  ) {}

  async #validatedExchange(
    request: RoundPlanRequest | MonsterReconsultRequest,
    signal: AbortSignal,
  ): Promise<DecodedRoundPlanReply> {
    let current: DmBridgeRequest = request;
    for (let correctionAttempt = 0; correctionAttempt <= MAX_ROUND_PLAN_CORRECTIONS; correctionAttempt += 1) {
      const reply = await this.exchange.exchange(current, signal);
      try {
        return decodeRoundPlanReply(reply, current, this.jsLimits);
      } catch (error: unknown) {
        const validatorError = error instanceof Error ? error.message : String(error);
        if (correctionAttempt === MAX_ROUND_PLAN_CORRECTIONS) {
          const exhausted = new RoundPlanCorrectionExhaustedError(
            `Round plan validation failed after ${String(MAX_ROUND_PLAN_CORRECTIONS)} corrections: ${validatorError}`,
            { cause: error },
          );
          this.onCorrectionExhausted(exhausted);
          throw exhausted;
        }
        const nextAttempt = correctionAttempt + 1;
        const requestedMonsterIds = request.kind === 'round_plan_request'
          ? request.livingMonsterIds
          : [request.monsterId];
        const correction: RoundPlanCorrectionRequest = {
          kind: 'round_plan_correction_request',
          protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
          encounterId: request.encounterId,
          requestId: `${request.requestId}:correction:${String(nextAttempt)}`,
          originalRequestId: request.requestId,
          expectedRevision: request.expectedRevision,
          round: request.round,
          codexSessionId: request.codexSessionId,
          model: request.model,
          projection: request.projection,
          history: request.history,
          requestedMonsterIds,
          validatorError,
          surface: request.surface,
          replyContract: roundPlanReplyContract(request.surface),
          correctionAttempt: nextAttempt === 1 ? 1 : 2,
        };
        current = correction;
      }
    }
    throw new Error('Round plan correction loop exceeded its static bound.');
  }

  async #startPlan(
    context: RoundPlanContext,
    signal: AbortSignal,
    actor: CombatantId | null,
  ): Promise<{ readonly key: string; readonly plan: RoundPlan }> {
    const projection = requireFullDmProjection(context.projection);
    const perCombatant = context.initiativeMode === 'per_combatant' && actor !== null;
    const key = perCombatant
      ? `${String(projection.round)}:${actor}`
      : `${String(projection.round)}:enemy_block`;
    const existing = this.#plans.get(key);
    if (existing !== undefined) return { key, plan: existing };
    const inFlight = this.#initialRequests.get(key);
    if (inFlight !== undefined) return { key, plan: await inFlight };
    const livingMonsterIds = projection.combatants
      .filter((candidate) => candidate.kind === 'monster' && candidate.life === 'living')
      .map((candidate) => candidate.id);
    const request: RoundPlanRequest = {
      kind: 'round_plan_request',
      protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
      encounterId: context.encounterId,
      requestId: this.#requestId(context.encounterId, projection.round, 'initial'),
      expectedRevision: projection.revision,
      round: projection.round,
      codexSessionId: context.codexSessionId,
      model: this.model,
      projection: context.projection,
      history: context.history,
      livingMonsterIds: perCombatant ? [actor] : livingMonsterIds,
      surface: this.surface,
      replyContract: roundPlanReplyContract(this.surface),
      correctionAttempt: 0,
    };
    const pending = this.#validatedExchange(request, signal)
      .then((decoded) => {
        const plan = decoded.plan;
        this.#plans.set(key, plan);
        for (const artifact of decoded.jsPrograms) {
          this.#jsPrograms.set(`${String(plan.round)}:${artifact.monsterId}`, artifact);
        }
        return plan;
      })
      .finally(() => this.#initialRequests.delete(key));
    this.#initialRequests.set(key, pending);
    return { key, plan: await pending };
  }

  async startRound(context: RoundPlanContext, signal: AbortSignal): Promise<RoundPlan> {
    return (await this.#startPlan(context, signal, null)).plan;
  }

  async choose(
    request: ControllerRequest,
    context: RoundPlanContext,
    signal: AbortSignal,
  ): Promise<ControllerDecision> {
    const state = requireFullDmProjection(context.projection);
    if (
      request.encounterRevision !== state.revision ||
      request.visibleState.revision !== state.revision ||
      request.actorId !== state.activeCombatant
    ) {
      throw new StaleRoundPlanError('Controller request is stale or is not based on the full DM projection.');
    }
    const started = await this.#startPlan(context, signal, request.actorId);
    const planKey = started.key;
    let plan = started.plan;
    if (plan.round !== state.round || plan.expectedRevision > state.revision) {
      throw new StaleRoundPlanError('Round plan is stale for the current encounter revision.');
    }
    let monster = plan.monsters.find((candidate) => candidate.monsterId === request.actorId);
    if (monster === undefined) throw new RoundPlanDryError('Current monster has no round program.');
    let action = executeProgram(monster.program, request.actorId, state, request.legalActions.actions);
    if (action === null) {
      const reconsult = {
        kind: 'monster_reconsult_request' as const,
        protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
        encounterId: context.encounterId,
        requestId: this.#requestId(context.encounterId, state.round, `monster:${request.actorId}`),
        expectedRevision: state.revision,
        round: state.round,
        codexSessionId: context.codexSessionId,
        model: this.model,
        projection: context.projection,
        history: context.history,
        monsterId: request.actorId,
        invalidation: 'Decision program has no legal expressible action in the current reducer action set.',
        scope: 'monster_remaining_round' as const,
        surface: this.surface,
        replyContract: roundPlanReplyContract(this.surface),
        correctionAttempt: 0 as const,
      };
      const replacement = await this.#validatedExchange(reconsult, signal);
      monster = replacement.plan.monsters[0];
      if (monster === undefined) throw new RoundPlanDryError('Re-consult returned no monster program.');
      const replacementArtifact = replacement.jsPrograms[0];
      if (replacementArtifact !== undefined) {
        this.#jsPrograms.set(`${String(state.round)}:${replacementArtifact.monsterId}`, replacementArtifact);
      }
      plan = {
        ...plan,
        expectedRevision: state.revision,
        monsters: plan.monsters.map((candidate) =>
          candidate.monsterId === monster!.monsterId ? monster! : candidate,
        ),
      };
      this.#plans.set(planKey, plan);
      action = executeProgram(monster.program, request.actorId, state, request.legalActions.actions);
      if (action === null) throw new RoundPlanDryError('Re-consulted monster program is still dry.');
    }
    return {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action,
    };
  }

  program(round: number, monsterId: CombatantId): MonsterRoundProgram | null {
    for (const [key, plan] of this.#plans) {
      if (!key.startsWith(`${String(round)}:`)) continue;
      const monster = plan.monsters.find((candidate) => candidate.monsterId === monsterId);
      if (monster !== undefined) return monster;
    }
    return null;
  }

  jsProgramArtifact(round: number, monsterId: CombatantId): JsProgramArtifact | null {
    return this.#jsPrograms.get(`${String(round)}:${monsterId}`) ?? null;
  }

  #requestId(encounterId: EncounterSessionId, round: number, suffix: string): string {
    const requestId = `${encounterId}:round:${round}:${suffix}:${this.#requestSequence}`;
    this.#requestSequence += 1;
    return requestId;
  }
}

export class DmRoundPlanController implements Controller {
  readonly controllerKind = 'agent' as const;

  constructor(
    private readonly session: DmRoundPlanSession,
    private readonly context: () => RoundPlanContext,
  ) {}

  choose(request: ControllerRequest, signal: AbortSignal): Promise<ControllerDecision> {
    return this.session.choose(request, this.context(), signal);
  }
}

export const decisionProgramInternals = { evaluatePredicate, executeProgram, selectAction };
