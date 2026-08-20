import type { EncounterCommand } from './events';
import { gridDistance } from './grid';
import type { CombatantId } from './values';
import type { VisibleEncounterState } from './visibility';

export interface LegalActionSummary {
  readonly actions: readonly EncounterCommand[];
}

export type ControllerRequest =
  | {
      readonly kind: 'turn';
      readonly requestId: string;
      readonly encounterRevision: number;
      readonly actorId: CombatantId;
      readonly visibleState: VisibleEncounterState;
      readonly legalActions: LegalActionSummary;
    }
  | {
      readonly kind: 'reaction';
      readonly requestId: string;
      readonly encounterRevision: number;
      readonly actorId: CombatantId;
      readonly moverId: CombatantId;
      readonly visibleState: VisibleEncounterState;
      readonly legalActions: LegalActionSummary;
    };

export interface ControllerDecision {
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly action: EncounterCommand;
}

export interface Controller {
  readonly controllerKind?: ControllerKind;
  choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision>;
}

export class ControllerRequestCancelledError extends Error {
  override readonly name = 'ControllerRequestCancelledError' as const;
}

export class StaleControllerResponseError extends Error {
  override readonly name = 'StaleControllerResponseError' as const;
}

interface PendingHumanRequest {
  readonly request: ControllerRequest;
  readonly resolve: (decision: ControllerDecision) => void;
  readonly reject: (reason: Error) => void;
  readonly detachAbort: () => void;
}

export class HumanController implements Controller {
  #pending: PendingHumanRequest | null = null;

  pendingRequest(): ControllerRequest | null {
    return this.#pending?.request ?? null;
  }

  choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision> {
    if (this.#pending !== null) {
      return Promise.reject(new Error('HumanController already has a pending request.'));
    }
    if (signal.aborted) {
      return Promise.reject(new ControllerRequestCancelledError('Controller request was cancelled.'));
    }
    return new Promise((resolve, reject) => {
      const cancel = () => {
        if (this.#pending?.request.requestId !== request.requestId) return;
        this.#pending = null;
        reject(new ControllerRequestCancelledError('Controller request was cancelled.'));
      };
      signal.addEventListener('abort', cancel, { once: true });
      this.#pending = {
        request,
        resolve,
        reject,
        detachAbort: () => signal.removeEventListener('abort', cancel),
      };
    });
  }

  submit(decision: ControllerDecision): void {
    const pending = this.#pending;
    if (
      pending === null ||
      decision.requestId !== pending.request.requestId ||
      decision.encounterRevision !== pending.request.encounterRevision
    ) {
      throw new StaleControllerResponseError('Human response does not match the pending request.');
    }
    this.#pending = null;
    pending.detachAbort();
    pending.resolve(decision);
  }
}

function commandKey(command: EncounterCommand): string {
  return JSON.stringify(command);
}

function algorithmRank(
  request: ControllerRequest,
  command: EncounterCommand,
): readonly [number, number, string] {
  const actor = request.visibleState.combatants.find(
    (candidate) => candidate.id === request.actorId,
  );
  const hostile = (id: CombatantId) => {
    const target = request.visibleState.combatants.find((candidate) => candidate.id === id);
    return actor !== undefined && target !== undefined && actor.kind !== target.kind;
  };
  if (command.type === 'opportunity_attack' && hostile(command.target)) {
    return [0, 0, commandKey(command)];
  }
  if (command.type === 'attack' && hostile(command.target)) {
    const target = request.visibleState.combatants.find(
      (candidate) => candidate.id === command.target,
    );
    const distance =
      actor === undefined || target === undefined
        ? Number.POSITIVE_INFINITY
        : gridDistance(actor.position, target.position);
    return [1, distance, commandKey(command)];
  }
  if (command.type === 'move') {
    const destination = command.path.at(-1) ?? actor?.position;
    const nearest = destination === undefined
      ? Number.POSITIVE_INFINITY
      : Math.min(
          ...request.visibleState.combatants
            .filter((candidate) => hostile(candidate.id))
            .map((candidate) => gridDistance(destination, candidate.position)),
        );
    return [2, nearest, commandKey(command)];
  }
  if (command.type === 'decline_reaction') return [3, 0, commandKey(command)];
  if (command.type === 'end_turn') return [5, 0, commandKey(command)];
  return [4, 0, commandKey(command)];
}

export class AlgorithmController implements Controller {
  async choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision> {
    if (signal.aborted) {
      throw new ControllerRequestCancelledError('Controller request was cancelled.');
    }
    const action = [...request.legalActions.actions].sort((left, right) => {
      const leftRank = algorithmRank(request, left);
      const rightRank = algorithmRank(request, right);
      return (
        leftRank[0] - rightRank[0] ||
        leftRank[1] - rightRank[1] ||
        leftRank[2].localeCompare(rightRank[2])
      );
    })[0];
    if (action === undefined) throw new Error('Controller request has no legal actions.');
    return {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action,
    };
  }
}

export interface AgentControllerRequest {
  readonly protocolVersion: 1;
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly actorId: CombatantId;
  readonly visibleBoard: VisibleEncounterState;
  readonly legalActions: LegalActionSummary;
}

export interface AgentControllerResponse {
  readonly protocolVersion: 1;
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly action: EncounterCommand;
}

export interface AgentExchange {
  exchange(request: AgentControllerRequest, signal: AbortSignal): Promise<unknown>;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const COMMAND_TYPES: ReadonlySet<EncounterCommand['type']> = new Set([
  'roll_initiative',
  'move',
  'attack',
  'opportunity_attack',
  'decline_reaction',
  'force_save',
  'dash',
  'disengage',
  'dodge',
  'spend_bonus_action',
  'spend_reaction',
  'heal',
  'apply_effect',
  'end_concentration',
  'end_turn',
]);

function decodeEncounterCommand(value: unknown): EncounterCommand {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new TypeError('Agent response action must be an encounter command object.');
  }
  if (!COMMAND_TYPES.has(value.type as EncounterCommand['type'])) {
    throw new TypeError('Agent response action has an unknown command type.');
  }
  return value as unknown as EncounterCommand;
}

export function decodeAgentControllerResponse(
  value: unknown,
): AgentControllerResponse {
  if (
    !isRecord(value) ||
    value.protocolVersion !== 1 ||
    typeof value.requestId !== 'string' ||
    !Number.isSafeInteger(value.encounterRevision)
  ) {
    throw new TypeError('Malformed agent controller response envelope.');
  }
  return {
    protocolVersion: 1,
    requestId: value.requestId,
    encounterRevision: value.encounterRevision as number,
    action: decodeEncounterCommand(value.action),
  };
}

export class AgentController implements Controller {
  constructor(private readonly exchange: AgentExchange) {}

  async choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision> {
    const response = decodeAgentControllerResponse(
      await this.exchange.exchange(
        {
          protocolVersion: 1,
          requestId: request.requestId,
          encounterRevision: request.encounterRevision,
          actorId: request.actorId,
          visibleBoard: request.visibleState,
          legalActions: request.legalActions,
        },
        signal,
      ),
    );
    if (
      response.requestId !== request.requestId ||
      response.encounterRevision !== request.encounterRevision
    ) {
      throw new StaleControllerResponseError('Agent response is stale.');
    }
    return response;
  }
}

export interface ControllerAssignment {
  readonly combatantId: CombatantId;
  readonly controller: Controller;
  readonly controllerId?: string;
}

interface RegistryEntry {
  readonly controller: Controller;
  readonly generation: number;
  readonly controllerId: string;
  readonly kind: ControllerKind;
}

export type ControllerKind = 'human' | 'algorithm' | 'agent' | 'custom';

export interface ControllerIdentity {
  readonly combatantId: CombatantId;
  readonly controllerId: string;
  readonly kind: ControllerKind;
  readonly generation: number;
}

function controllerKind(controller: Controller): ControllerKind {
  if (controller.controllerKind !== undefined) return controller.controllerKind;
  if (controller instanceof HumanController) return 'human';
  if (controller instanceof AlgorithmController) return 'algorithm';
  if (controller instanceof AgentController) return 'agent';
  return 'custom';
}

function defaultControllerId(
  combatantId: CombatantId,
  kind: ControllerKind,
  generation: number,
): string {
  return `${combatantId}:${kind}:${generation}`;
}

export class ControllerRegistry {
  readonly #entries = new Map<CombatantId, RegistryEntry>();
  readonly #replaceListeners = new Set<(id: CombatantId) => void>();

  constructor(assignments: readonly ControllerAssignment[]) {
    for (const assignment of assignments) {
      if (this.#entries.has(assignment.combatantId)) {
        throw new Error(`Duplicate controller assignment for ${assignment.combatantId}.`);
      }
      this.#entries.set(assignment.combatantId, {
        controller: assignment.controller,
        generation: 0,
        controllerId:
          assignment.controllerId ??
          defaultControllerId(
            assignment.combatantId,
            controllerKind(assignment.controller),
            0,
          ),
        kind: controllerKind(assignment.controller),
      });
    }
  }

  controllerFor(combatantId: CombatantId): Controller {
    const entry = this.#entries.get(combatantId);
    if (entry === undefined) throw new Error(`No controller assigned to ${combatantId}.`);
    return entry.controller;
  }

  generationFor(combatantId: CombatantId): number {
    const entry = this.#entries.get(combatantId);
    if (entry === undefined) throw new Error(`No controller assigned to ${combatantId}.`);
    return entry.generation;
  }

  identities(): readonly ControllerIdentity[] {
    return [...this.#entries.entries()]
      .map(([combatantId, entry]) => ({
        combatantId,
        controllerId: entry.controllerId,
        kind: entry.kind,
        generation: entry.generation,
      }))
      .sort((left, right) => left.combatantId.localeCompare(right.combatantId));
  }

  replace(
    combatantId: CombatantId,
    controller: Controller,
    controllerId?: string,
  ): void {
    const current = this.#entries.get(combatantId);
    if (current === undefined) throw new Error(`No controller assigned to ${combatantId}.`);
    const generation = current.generation + 1;
    const kind = controllerKind(controller);
    this.#entries.set(combatantId, {
      controller,
      generation,
      controllerId:
        controllerId ?? defaultControllerId(combatantId, kind, generation),
      kind,
    });
    for (const listener of this.#replaceListeners) listener(combatantId);
  }

  onReplace(listener: (id: CombatantId) => void): () => void {
    this.#replaceListeners.add(listener);
    return () => this.#replaceListeners.delete(listener);
  }
}

export type ReactionPolicyDecision = 'use' | 'decline' | 'prompt';

export type StandingReactionPolicy =
  | { readonly opportunityAttack: 'use' }
  | { readonly opportunityAttack: 'decline' };

/** An absent standing policy is ambiguity and must reach the human prompt. */
export function evaluateOpportunityAttackPolicy(
  policy: StandingReactionPolicy | null,
): ReactionPolicyDecision {
  if (policy === null) return 'prompt';
  switch (policy.opportunityAttack) {
    case 'use':
      return 'use';
    case 'decline':
      return 'decline';
  }
}
