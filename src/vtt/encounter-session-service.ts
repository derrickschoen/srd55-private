import type { EncounterCommand } from '../combat/events';
import type { CombatantId, EncounterSessionId } from '../combat/values';
import type {
  DmEncounterHostSnapshot,
  HostCoordinatorTransactionOutcome,
  HostDoorSetOutcome,
} from './dm-encounter-host';
import type {
  DmBoardProjection,
  PlayerBoardProjection,
  PlayerSeatBinding,
  RendererTokenBinding,
} from './encounter-projections';

export interface PlayerSeatRegistration extends PlayerSeatBinding {
  readonly playerId: string;
  readonly controlledTokenIds: readonly string[];
}

interface RegisteredPlayerSeat {
  readonly binding: PlayerSeatBinding;
  readonly controlledCombatantIds: ReadonlySet<CombatantId>;
  readonly controlledTokenIds: ReadonlySet<string>;
}

export interface EncounterSessionHostPort {
  readonly sessionId: EncounterSessionId;
  snapshot(): DmEncounterHostSnapshot;
  playerSnapshot(binding: PlayerSeatBinding): PlayerBoardProjection;
  rendererTokenBindings(): readonly RendererTokenBinding[];
  subscribe(listener: (snapshot: DmEncounterHostSnapshot) => void): () => void;
  start(): Promise<void>;
  submitHumanDecisionTransaction(
    actor: CombatantId,
    decision: {
      readonly requestId: string;
      readonly encounterRevision: number;
      readonly action: EncounterCommand;
    },
  ): Promise<HostCoordinatorTransactionOutcome>;
  setDoorOpen(doorId: string, open: boolean): Promise<HostDoorSetOutcome>;
  close(): void;
}

export interface DmSessionSnapshotEvent {
  readonly seq: number;
  readonly projection: DmBoardProjection;
}

export interface PlayerSessionSnapshotEvent {
  readonly seq: number;
  readonly projection: PlayerBoardProjection;
}

export type PlayerSubscriptionResult =
  | { readonly kind: 'subscribed'; readonly unsubscribe: () => void }
  | { readonly kind: 'refused'; readonly code: 'UNAUTHORIZED' };

export interface OfferedActionMutation {
  readonly playerId?: string;
  readonly tokenId: string;
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly offeredActionId: string;
  readonly signal?: AbortSignal;
}

export type SessionMutationOutcome =
  | {
      readonly kind: 'committed';
      readonly revision: number;
      readonly event: PlayerSessionSnapshotEvent;
    }
  | {
      readonly kind: 'refused';
      readonly code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'STALE_OFFER' | 'UNKNOWN_OFFER' | 'ENGINE_REFUSED';
      readonly reason: string;
    }
  | { readonly kind: 'cancelled'; readonly reason: string }
  | { readonly kind: 'closed' }
  | {
      readonly kind: 'failed';
      readonly phase: 'pre_apply';
      readonly error: unknown;
    }
  | {
      readonly kind: 'failed';
      readonly phase: 'post_apply';
      readonly error: unknown;
      readonly recovery: PlayerSessionSnapshotEvent;
    };

export type SessionPrincipal =
  | { readonly kind: 'dm' }
  | { readonly kind: 'player'; readonly playerId: string };

export type DoorSetOutcome =
  | {
      readonly kind: 'committed';
      readonly revision: number;
      readonly changed: false;
    }
  | {
      readonly kind: 'committed';
      readonly revision: number;
      readonly changed: true;
      readonly event: DmSessionSnapshotEvent;
    }
  | {
      readonly kind: 'refused';
      readonly code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNSUPPORTED';
      readonly reason: string;
    }
  | { readonly kind: 'closed' }
  | {
      readonly kind: 'failed';
      readonly phase: 'pre_apply';
      readonly error: unknown;
    }
  | {
      readonly kind: 'failed';
      readonly phase: 'post_apply';
      readonly error: unknown;
      readonly recovery: DmSessionSnapshotEvent;
    };

function immutableBinding(registration: PlayerSeatRegistration): RegisteredPlayerSeat {
  const ownedCombatantIds = [...new Set(registration.ownedCombatantIds)];
  const controlledTokenIds = [...new Set(registration.controlledTokenIds)];
  if (!ownedCombatantIds.includes(registration.observerCombatantId)) {
    throw new TypeError('A player seat observer must be one of its controlled combatants.');
  }
  return {
    binding: Object.freeze({
      seatId: registration.seatId,
      observerCombatantId: registration.observerCombatantId,
      ownedCombatantIds: Object.freeze(ownedCombatantIds),
    }),
    controlledCombatantIds: new Set(ownedCombatantIds),
    controlledTokenIds: new Set(controlledTokenIds),
  };
}

export class EncounterSessionService {
  readonly sessionId: EncounterSessionId;
  readonly #seats = new Map<string, RegisteredPlayerSeat>();
  readonly #dmListeners = new Set<(event: DmSessionSnapshotEvent) => void>();
  readonly #playerListeners = new Map<string, Set<(event: PlayerSessionSnapshotEvent) => void>>();
  readonly #playerEventsByRevision = new Map<string, PlayerSessionSnapshotEvent>();
  readonly #dmEventsByRevision = new Map<number, DmSessionSnapshotEvent>();
  readonly #unsubscribeHost: () => void;
  #tail: Promise<void> = Promise.resolve();
  #seq = 0;
  #closed = false;

  constructor(
    private readonly host: EncounterSessionHostPort,
    seats: readonly PlayerSeatRegistration[],
  ) {
    this.sessionId = host.sessionId;
    const combatantByToken = new Map(
      host.rendererTokenBindings().map((binding) => [binding.tokenId, binding.combatantId] as const),
    );
    const playerByToken = new Map<string, string>();
    const playerByCombatant = new Map<CombatantId, string>();
    for (const registration of seats) {
      if (this.#seats.has(registration.playerId)) {
        throw new TypeError(`Duplicate external player id ${registration.playerId}.`);
      }
      const seat = immutableBinding(registration);
      for (const combatantId of seat.controlledCombatantIds) {
        const owner = playerByCombatant.get(combatantId);
        if (owner !== undefined) {
          throw new TypeError(`Combatant ${combatantId} is assigned to both ${owner} and ${registration.playerId}.`);
        }
        playerByCombatant.set(combatantId, registration.playerId);
      }
      for (const tokenId of seat.controlledTokenIds) {
        const combatantId = combatantByToken.get(tokenId);
        if (combatantId === undefined || !seat.controlledCombatantIds.has(combatantId)) {
          throw new TypeError(`Token ${tokenId} is not controlled by player ${registration.playerId}.`);
        }
        const owner = playerByToken.get(tokenId);
        if (owner !== undefined) {
          throw new TypeError(`Token ${tokenId} is assigned to both ${owner} and ${registration.playerId}.`);
        }
        playerByToken.set(tokenId, registration.playerId);
      }
      this.#seats.set(registration.playerId, seat);
    }
    this.#unsubscribeHost = host.subscribe((snapshot) => this.#publish(snapshot));
  }

  start(): Promise<void> {
    return this.host.start();
  }

  dmSnapshot(): DmBoardProjection {
    return this.host.snapshot().dm;
  }

  playerSnapshot(playerId?: string): PlayerBoardProjection | null {
    const seat = playerId === undefined ? undefined : this.#seats.get(playerId);
    return seat === undefined ? null : this.host.playerSnapshot(seat.binding);
  }

  subscribeDm(listener: (event: DmSessionSnapshotEvent) => void): () => void {
    this.#dmListeners.add(listener);
    const projection = this.dmSnapshot();
    listener({ seq: this.#seq, projection });
    return () => this.#dmListeners.delete(listener);
  }

  subscribePlayer(
    playerId: string | undefined,
    listener: (event: PlayerSessionSnapshotEvent) => void,
  ): PlayerSubscriptionResult {
    const seat = playerId === undefined ? undefined : this.#seats.get(playerId);
    if (seat === undefined || playerId === undefined) return { kind: 'refused', code: 'UNAUTHORIZED' };
    const listeners = this.#playerListeners.get(playerId) ?? new Set();
    listeners.add(listener);
    this.#playerListeners.set(playerId, listeners);
    listener({ seq: this.#seq, projection: this.host.playerSnapshot(seat.binding) });
    return {
      kind: 'subscribed',
      unsubscribe: () => {
        listeners.delete(listener);
        if (listeners.size === 0) this.#playerListeners.delete(playerId);
      },
    };
  }

  submitOfferedAction(input: OfferedActionMutation): Promise<SessionMutationOutcome> {
    const playerId = input.playerId;
    if (playerId === undefined) {
      return Promise.resolve({
        kind: 'refused', code: 'UNAUTHORIZED', reason: 'A registered player identity is required.',
      });
    }
    const seat = this.#seats.get(playerId);
    if (seat === undefined) {
      return Promise.resolve({
        kind: 'refused', code: 'UNAUTHORIZED', reason: 'A registered player identity is required.',
      });
    }
    if (!seat.controlledTokenIds.has(input.tokenId)) {
      return Promise.resolve({
        kind: 'refused', code: 'FORBIDDEN', reason: 'The token belongs to another player seat.',
      });
    }
    return this.#enqueue(async () => this.#applyOfferedAction(playerId, seat, input));
  }

  setDoor(input: {
    readonly principal?: SessionPrincipal;
    readonly doorId: string;
    readonly open: boolean;
  }): Promise<DoorSetOutcome> {
    if (input.principal === undefined) {
      return Promise.resolve({
        kind: 'refused', code: 'UNAUTHORIZED', reason: 'A DM principal is required.',
      });
    }
    if (input.principal.kind !== 'dm') {
      return Promise.resolve({
        kind: 'refused', code: 'FORBIDDEN', reason: 'Players cannot change door state.',
      });
    }
    let settle: ((outcome: DoorSetOutcome) => void) | undefined;
    const outcome = new Promise<DoorSetOutcome>((resolve) => { settle = resolve; });
    const run = this.#tail.then(async () => {
      if (this.#closed) {
        settle?.({ kind: 'closed' });
        return;
      }
      try {
        settle?.(this.#doorOutcome(await this.host.setDoorOpen(input.doorId, input.open)));
      } catch (error: unknown) {
        settle?.({ kind: 'failed', phase: 'pre_apply', error });
      }
    });
    this.#tail = run.catch(() => undefined);
    return outcome;
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.host.close();
    this.#unsubscribeHost();
    this.#dmListeners.clear();
    this.#playerListeners.clear();
  }

  #enqueue(operation: () => Promise<SessionMutationOutcome>): Promise<SessionMutationOutcome> {
    let settle: ((outcome: SessionMutationOutcome) => void) | undefined;
    const outcome = new Promise<SessionMutationOutcome>((resolve) => { settle = resolve; });
    const run = this.#tail.then(async () => {
      if (this.#closed) {
        settle?.({ kind: 'closed' });
        return;
      }
      try {
        settle?.(await operation());
      } catch (error: unknown) {
        settle?.({ kind: 'failed', phase: 'pre_apply', error });
      }
    });
    this.#tail = run.catch(() => undefined);
    return outcome;
  }

  async #applyOfferedAction(
    playerId: string,
    seat: RegisteredPlayerSeat,
    input: OfferedActionMutation,
  ): Promise<SessionMutationOutcome> {
    if (input.signal?.aborted === true) {
      return { kind: 'cancelled', reason: 'The queued mutation was cancelled before apply.' };
    }
    const projection = this.host.playerSnapshot(seat.binding);
    const pending = projection.pendingRequest;
    if (
      pending === null ||
      pending.requestId !== input.requestId ||
      pending.encounterRevision !== input.encounterRevision
    ) {
      return { kind: 'refused', code: 'STALE_OFFER', reason: 'The offered action is no longer current.' };
    }
    if (!seat.controlledCombatantIds.has(pending.actorId)) {
      return { kind: 'refused', code: 'FORBIDDEN', reason: 'The pending actor belongs to another player seat.' };
    }
    const optionIndex = pending.offeredActionIds.indexOf(input.offeredActionId);
    const action = pending.legalActions[optionIndex];
    if (optionIndex < 0 || action === undefined) {
      return { kind: 'refused', code: 'UNKNOWN_OFFER', reason: 'The selected offered action id is unknown.' };
    }
    const outcome = await this.host.submitHumanDecisionTransaction(pending.actorId, {
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      action,
    });
    return this.#terminalOutcome(playerId, seat, outcome);
  }

  #terminalOutcome(
    playerId: string,
    seat: RegisteredPlayerSeat,
    outcome: HostCoordinatorTransactionOutcome,
  ): SessionMutationOutcome {
    switch (outcome.kind) {
      case 'committed': {
        const event = this.#playerEventsByRevision.get(`${playerId}\u0000${String(outcome.revision)}`);
        if (event === undefined) {
          throw new Error(`The committed revision ${String(outcome.revision)} has no durable snapshot event.`);
        }
        return { kind: 'committed', revision: outcome.revision, event };
      }
      case 'refused':
        return { kind: 'refused', code: 'ENGINE_REFUSED', reason: outcome.reason };
      case 'cancelled':
        return { kind: 'cancelled', reason: outcome.reason };
      case 'closed':
        return { kind: 'closed' };
      case 'failed':
        if (outcome.phase === 'pre_apply') {
          return { kind: 'failed', phase: 'pre_apply', error: outcome.error };
        }
        this.#closed = true;
        return {
          kind: 'failed',
          phase: 'post_apply',
          error: outcome.error,
          recovery: {
            seq: this.#seq,
            projection: this.host.playerSnapshot(seat.binding),
          },
        };
    }
  }

  #doorOutcome(outcome: HostDoorSetOutcome): DoorSetOutcome {
    switch (outcome.kind) {
      case 'committed':
        if (!outcome.changed) {
          return { kind: 'committed', revision: outcome.revision, changed: false };
        }
        return {
          kind: 'committed',
          revision: outcome.revision,
          changed: true,
          event: this.#dmEventsByRevision.get(outcome.revision) ?? {
            seq: this.#seq,
            projection: this.dmSnapshot(),
          },
        };
      case 'unsupported':
        return { kind: 'refused', code: 'UNSUPPORTED', reason: outcome.reason };
      case 'closed':
        return { kind: 'closed' };
      case 'failed':
        if (outcome.phase === 'pre_apply') {
          return { kind: 'failed', phase: 'pre_apply', error: outcome.error };
        }
        this.#closed = true;
        return {
          kind: 'failed',
          phase: 'post_apply',
          error: outcome.error,
          recovery: {
            seq: this.#seq,
            projection: this.dmSnapshot(),
          },
        };
    }
  }

  #publish(snapshot: DmEncounterHostSnapshot): void {
    this.#seq += 1;
    const dmEvent = { seq: this.#seq, projection: snapshot.dm } satisfies DmSessionSnapshotEvent;
    this.#dmEventsByRevision.set(snapshot.dm.encounter.revision, dmEvent);
    for (const listener of this.#dmListeners) listener(dmEvent);
    for (const [playerId, seat] of this.#seats) {
      const event = {
        seq: this.#seq,
        projection: this.host.playerSnapshot(seat.binding),
      } satisfies PlayerSessionSnapshotEvent;
      this.#playerEventsByRevision.set(
        `${playerId}\u0000${String(event.projection.revision)}`,
        event,
      );
      for (const listener of this.#playerListeners.get(playerId) ?? []) listener(event);
    }
  }
}
