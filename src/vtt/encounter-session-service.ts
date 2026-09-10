import type { CombatantId, EncounterSessionId } from '../combat/values';
import type {
  DmEncounterHostSnapshot,
  HostCoordinatorTransactionOutcome,
  HostDoorSetOutcome,
  HostSnapshotNotification,
  HostSnapshotNotificationKind,
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

type ActiveTerminalReceipt =
  | {
      readonly kind: 'offered_action';
      readonly requestId: string;
      established: boolean;
    }
  | {
      readonly kind: 'door';
      established: boolean;
    };

export interface EncounterSessionHostPort {
  readonly sessionId: EncounterSessionId;
  snapshot(): DmEncounterHostSnapshot;
  playerSnapshot(binding: PlayerSeatBinding): PlayerBoardProjection;
  rendererTokenBindings(): readonly RendererTokenBinding[];
  subscribeNotifications(listener: (notification: HostSnapshotNotification) => void): () => void;
  start(): Promise<void>;
  submitOfferedActionTransaction(
    actor: CombatantId,
    requestId: string,
    encounterRevision: number,
    offeredActionId: string,
  ): Promise<HostCoordinatorTransactionOutcome>;
  setDoorOpen(doorId: string, open: boolean): Promise<HostDoorSetOutcome>;
  close(): void;
}

export interface DmSessionSnapshotEvent {
  readonly kind: HostSnapshotNotificationKind;
  readonly seq: number;
  readonly projection: DmBoardProjection;
}

export interface PlayerSessionSnapshotEvent {
  readonly kind: HostSnapshotNotificationKind;
  readonly seq: number;
  readonly projection: PlayerBoardProjection;
}

export interface SessionSubscriberError {
  readonly audience: 'dm' | 'player';
  readonly playerId?: string;
  readonly error: unknown;
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

function closureSignal(): {
  readonly promise: Promise<{ readonly kind: 'closed' }>;
  readonly close: () => void;
} {
  let resolveClosure: (() => void) | undefined;
  const promise = new Promise<{ readonly kind: 'closed' }>((resolve) => {
    resolveClosure = () => resolve({ kind: 'closed' });
  });
  return { promise, close: () => resolveClosure?.() };
}

export class EncounterSessionService {
  readonly sessionId: EncounterSessionId;
  readonly #seats = new Map<string, RegisteredPlayerSeat>();
  readonly #dmListeners = new Set<(event: DmSessionSnapshotEvent) => void>();
  readonly #playerListeners = new Map<string, Set<(event: PlayerSessionSnapshotEvent) => void>>();
  readonly #playerEventsByRevision = new Map<string, PlayerSessionSnapshotEvent>();
  readonly #dmEventsByRevision = new Map<number, DmSessionSnapshotEvent>();
  readonly #subscriberErrors: SessionSubscriberError[] = [];
  readonly #closure = closureSignal();
  readonly #unsubscribeHost: () => void;
  #tail: Promise<void> = Promise.resolve();
  #seq = 0;
  #closed = false;
  #activeTerminalReceipt: ActiveTerminalReceipt | null = null;

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
    this.#unsubscribeHost = host.subscribeNotifications((notification) => this.#publish(notification));
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
    this.#notifyDm(listener, { kind: 'status', seq: this.#seq, projection });
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
    this.#notifyPlayer(playerId, listener, {
      kind: 'status', seq: this.#seq, projection: this.host.playerSnapshot(seat.binding),
    });
    return {
      kind: 'subscribed',
      unsubscribe: () => {
        listeners.delete(listener);
        if (listeners.size === 0) this.#playerListeners.delete(playerId);
      },
    };
  }

  subscriberErrors(): readonly SessionSubscriberError[] {
    return [...this.#subscriberErrors];
  }

  mutationEventRevisions(): readonly number[] {
    return [...this.#dmEventsByRevision.keys()].sort((left, right) => left - right);
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
    return this.#enqueue(
      async () => this.#applyOfferedAction(playerId, seat, input),
      { kind: 'offered_action', requestId: input.requestId, established: false },
    );
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
      const receipt: ActiveTerminalReceipt = { kind: 'door', established: false };
      this.#activeTerminalReceipt = receipt;
      try {
        const hostPromise = this.host.setDoorOpen(input.doorId, input.open);
        const raced = await Promise.race([
          hostPromise.then((value) => ({ kind: 'host' as const, value })),
          this.#closure.promise.then(() => ({ kind: 'closure' as const })),
        ]);
        const hostOutcome = raced.kind === 'host'
          ? raced.value
          : receipt.established
            ? await hostPromise
            : { kind: 'closed' as const };
        settle?.(hostOutcome.kind === 'closed' ? hostOutcome : this.#doorOutcome(hostOutcome));
      } catch (error: unknown) {
        settle?.({ kind: 'failed', phase: 'pre_apply', error });
      } finally {
        if (this.#activeTerminalReceipt === receipt) this.#activeTerminalReceipt = null;
      }
    });
    this.#tail = run.catch(() => undefined);
    return outcome;
  }

  close(): void {
    this.#closed = true;
    this.#closure.close();
    try {
      this.host.close();
    } finally {
      this.#unsubscribeHost();
      this.#dmListeners.clear();
      this.#playerListeners.clear();
    }
  }

  #enqueue(
    operation: () => Promise<SessionMutationOutcome>,
    receipt: ActiveTerminalReceipt,
  ): Promise<SessionMutationOutcome> {
    let settle: ((outcome: SessionMutationOutcome) => void) | undefined;
    const outcome = new Promise<SessionMutationOutcome>((resolve) => { settle = resolve; });
    const run = this.#tail.then(async () => {
      if (this.#closed) {
        settle?.({ kind: 'closed' });
        return;
      }
      this.#activeTerminalReceipt = receipt;
      try {
        const operationPromise = operation();
        const raced = await Promise.race([
          operationPromise.then((value) => ({ kind: 'operation' as const, value })),
          this.#closure.promise.then(() => ({ kind: 'closure' as const })),
        ]);
        settle?.(raced.kind === 'operation'
          ? raced.value
          : receipt.established
            ? await operationPromise
            : { kind: 'closed' });
      } catch (error: unknown) {
        settle?.({ kind: 'failed', phase: 'pre_apply', error });
      } finally {
        if (this.#activeTerminalReceipt === receipt) this.#activeTerminalReceipt = null;
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
    if (optionIndex < 0 || pending.legalActions[optionIndex] === undefined) {
      return { kind: 'refused', code: 'UNKNOWN_OFFER', reason: 'The selected offered action id is unknown.' };
    }
    const outcome = await this.host.submitOfferedActionTransaction(
      pending.actorId,
      pending.requestId,
      pending.encounterRevision,
      input.offeredActionId,
    );
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
            kind: 'recovery',
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
        {
          const event = this.#dmEventsByRevision.get(outcome.revision);
          if (event === undefined) {
            throw new Error(`The committed door revision ${String(outcome.revision)} has no durable snapshot event.`);
          }
          return {
            kind: 'committed',
            revision: outcome.revision,
            changed: true,
            event,
          };
        }
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
            kind: 'recovery',
            seq: this.#seq,
            projection: this.dmSnapshot(),
          },
        };
    }
  }

  #notifyDm(
    listener: (event: DmSessionSnapshotEvent) => void,
    event: DmSessionSnapshotEvent,
  ): void {
    try {
      listener(event);
    } catch (error: unknown) {
      this.#subscriberErrors.push({ audience: 'dm', error });
    }
  }

  #notifyPlayer(
    playerId: string,
    listener: (event: PlayerSessionSnapshotEvent) => void,
    event: PlayerSessionSnapshotEvent,
  ): void {
    try {
      listener(event);
    } catch (error: unknown) {
      this.#subscriberErrors.push({ audience: 'player', playerId, error });
    }
  }

  #publish(notification: HostSnapshotNotification): void {
    if (
      notification.kind === 'recovery' &&
      notification.snapshot.player.authorityStatus === 'hard_paused'
    ) {
      this.#closed = true;
    }
    this.#seq += 1;
    const dmEvent = {
      kind: notification.kind,
      seq: this.#seq,
      projection: notification.snapshot.dm,
    } satisfies DmSessionSnapshotEvent;
    const playerEvents = new Map<string, PlayerSessionSnapshotEvent>();
    for (const [playerId, seat] of this.#seats) {
      const event = {
        kind: notification.kind,
        seq: this.#seq,
        projection: notification.playerSnapshot(seat.binding),
      } satisfies PlayerSessionSnapshotEvent;
      playerEvents.set(playerId, event);
    }
    if (notification.kind === 'mutation') {
      this.#dmEventsByRevision.set(dmEvent.projection.encounter.revision, dmEvent);
      for (const [playerId, event] of playerEvents) {
        this.#playerEventsByRevision.set(
          `${playerId}\u0000${String(event.projection.revision)}`,
          event,
        );
      }
    }
    const receipt = notification.terminalReceipt;
    const activeReceipt = this.#activeTerminalReceipt;
    if (
      receipt?.kind === 'offered_action' &&
      activeReceipt?.kind === 'offered_action' &&
      receipt.requestId === activeReceipt.requestId
    ) {
      activeReceipt.established = true;
    } else if (receipt?.kind === 'door' && activeReceipt?.kind === 'door') {
      activeReceipt.established = true;
    }
    for (const listener of this.#dmListeners) this.#notifyDm(listener, dmEvent);
    for (const [playerId, event] of playerEvents) {
      for (const listener of this.#playerListeners.get(playerId) ?? []) {
        this.#notifyPlayer(playerId, listener, event);
      }
    }
  }
}
