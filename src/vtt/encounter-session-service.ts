import type { CombatantId, EncounterSessionId } from '../combat/values';
import type { EncounterCommand } from '../combat/events';
import type {
  DmEncounterHost,
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
  RendererProjectionCapture,
  RendererTokenBinding,
  TopDownDmBoardProjection,
} from './encounter-projections';
import { offeredActionId } from './encounter-projections';

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
      readonly invocationToken?: SessionInvocationToken;
      established: boolean;
    }
  | {
      readonly kind: 'door';
      readonly invocationToken?: SessionInvocationToken;
      established: boolean;
    };

/** Process-local identity for exactly one protocol invocation. */
export interface SessionInvocationToken {
  readonly invocation: symbol;
}

export interface SessionTerminalReceipt {
  readonly invocationToken: SessionInvocationToken;
  readonly revision: number;
}

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
  readonly tokenBindings: readonly RendererTokenBinding[];
  readonly terminalReceipt?: SessionTerminalReceipt;
}

export interface PlayerSessionSnapshotEvent {
  readonly kind: HostSnapshotNotificationKind;
  readonly seq: number;
  readonly projection: PlayerBoardProjection;
  readonly tokenBindings: readonly RendererTokenBinding[];
  readonly terminalReceipt?: SessionTerminalReceipt;
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
  readonly invocationToken?: SessionInvocationToken;
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
    return this.dmCapture().projection;
  }

  dmCapture(): RendererProjectionCapture<DmBoardProjection> {
    return {
      projection: this.host.snapshot().dm,
      tokenBindings: this.host.rendererTokenBindings(),
    };
  }

  playerSnapshot(playerId?: string): PlayerBoardProjection | null {
    return this.playerCapture(playerId)?.projection ?? null;
  }

  playerCapture(playerId?: string): RendererProjectionCapture<PlayerBoardProjection> | null {
    const seat = playerId === undefined ? undefined : this.#seats.get(playerId);
    return seat === undefined ? null : {
      projection: this.host.playerSnapshot(seat.binding),
      tokenBindings: this.host.rendererTokenBindings(),
    };
  }

  subscribeDm(listener: (event: DmSessionSnapshotEvent) => void): () => void {
    this.#dmListeners.add(listener);
    const capture = this.dmCapture();
    this.#notifyDm(listener, { kind: 'status', seq: this.#seq, ...capture });
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
    const capture = this.playerCapture(playerId);
    if (capture === null) throw new Error('The registered player capture is unavailable.');
    this.#notifyPlayer(playerId, listener, { kind: 'status', seq: this.#seq, ...capture });
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
      {
        kind: 'offered_action',
        requestId: input.requestId,
        ...(input.invocationToken === undefined ? {} : { invocationToken: input.invocationToken }),
        established: false,
      },
    );
  }

  setDoor(input: {
    readonly invocationToken?: SessionInvocationToken;
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
      const receipt: ActiveTerminalReceipt = {
        kind: 'door',
        ...(input.invocationToken === undefined ? {} : { invocationToken: input.invocationToken }),
        established: false,
      };
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
        const recoveryCapture = this.playerCapture(playerId);
        if (recoveryCapture === null) throw new Error('The failed player capture is unavailable.');
        return {
          kind: 'failed',
          phase: 'post_apply',
          error: outcome.error,
          recovery: {
            kind: 'recovery',
            seq: this.#seq,
            ...recoveryCapture,
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
        const recoveryCapture = this.dmCapture();
        return {
          kind: 'failed',
          phase: 'post_apply',
          error: outcome.error,
          recovery: {
            kind: 'recovery',
            seq: this.#seq,
            ...recoveryCapture,
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
    const tokenBindings = notification.rendererTokenBindings;
    const receipt = notification.terminalReceipt;
    const activeReceipt = this.#activeTerminalReceipt;
    let terminalReceipt: SessionTerminalReceipt | undefined;
    if (
      receipt?.kind === 'offered_action' &&
      activeReceipt?.kind === 'offered_action' &&
      receipt.requestId === activeReceipt.requestId
    ) {
      activeReceipt.established = true;
      if (activeReceipt.invocationToken !== undefined) {
        terminalReceipt = { invocationToken: activeReceipt.invocationToken, revision: receipt.revision };
      }
    } else if (receipt?.kind === 'door' && activeReceipt?.kind === 'door') {
      activeReceipt.established = true;
      if (activeReceipt.invocationToken !== undefined) {
        terminalReceipt = { invocationToken: activeReceipt.invocationToken, revision: receipt.revision };
      }
    }
    const dmEvent = {
      kind: notification.kind,
      seq: this.#seq,
      projection: notification.snapshot.dm,
      tokenBindings,
      ...(terminalReceipt === undefined ? {} : { terminalReceipt }),
    } satisfies DmSessionSnapshotEvent;
    const playerEvents = new Map<string, PlayerSessionSnapshotEvent>();
    for (const [playerId, seat] of this.#seats) {
      const event = {
        kind: notification.kind,
        seq: this.#seq,
        projection: notification.playerSnapshot(seat.binding),
        tokenBindings,
        ...(terminalReceipt === undefined ? {} : { terminalReceipt }),
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
    for (const listener of this.#dmListeners) this.#notifyDm(listener, dmEvent);
    for (const [playerId, event] of playerEvents) {
      for (const listener of this.#playerListeners.get(playerId) ?? []) {
        this.#notifyPlayer(playerId, listener, event);
      }
    }
  }
}

export interface RichSessionSnapshot {
  readonly dm: TopDownDmBoardProjection;
  readonly player: PlayerBoardProjection;
  readonly dmOfferedActionIds: readonly string[];
}

/** Typed in-process façade for the classic top-down renderer. */
export class RichEncounterSessionService extends EncounterSessionService {
  readonly #placementOffers = new Map<string, Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }>>();
  readonly #worldObjectOffers = new Map<string, Extract<EncounterCommand, { readonly type: 'dm_use_world_object' }>>();

  constructor(
    private readonly richHost: DmEncounterHost,
    seats: readonly PlayerSeatRegistration[],
  ) {
    super(richHost, seats);
  }

  topDownSnapshot(playerId: string): RichSessionSnapshot | null {
    const dm = this.#topDownProjection(this.dmSnapshot());
    const player = this.playerSnapshot(playerId);
    return player === null ? null : {
      dm,
      player,
      dmOfferedActionIds: dm.pendingRequest === null
        ? []
        : dm.humanCommandActions.map((_action, index) => offeredActionId(dm.pendingRequest?.requestId ?? '', index)),
    };
  }

  subscribeTopDown(playerId: string, listener: (snapshot: RichSessionSnapshot) => void): () => void {
    const dmEvents = new Map<number, TopDownDmBoardProjection>();
    const playerEvents = new Map<number, PlayerBoardProjection>();
    const publish = (seq: number): void => {
      const dm = dmEvents.get(seq);
      const player = playerEvents.get(seq);
      if (dm === undefined || player === undefined) return;
      dmEvents.delete(seq);
      playerEvents.delete(seq);
      listener({
        dm,
        player,
        dmOfferedActionIds: dm.pendingRequest === null
          ? []
          : dm.humanCommandActions.map((_action, index) => offeredActionId(dm.pendingRequest?.requestId ?? '', index)),
      });
    };
    const unsubscribeDm = this.subscribeDm((event) => {
      dmEvents.set(event.seq, this.#topDownProjection(event.projection));
      publish(event.seq);
    });
    const player = this.subscribePlayer(playerId, (event) => {
      playerEvents.set(event.seq, event.projection);
      publish(event.seq);
    });
    if (player.kind === 'refused') {
      unsubscribeDm();
      throw new TypeError(`Unknown top-down player seat ${playerId}.`);
    }
    return () => {
      unsubscribeDm();
      player.unsubscribe();
      dmEvents.clear();
      playerEvents.clear();
    };
  }

  sessionEnded(): ReturnType<DmEncounterHost['sessionEnded']> { return this.richHost.sessionEnded(); }

  #topDownProjection(dm: DmBoardProjection): TopDownDmBoardProjection {
    this.#placementOffers.clear();
    this.#worldObjectOffers.clear();
    const revision = dm.encounter.revision;
    const worldObjectControls = dm.worldObjectControls.map((control, index) => {
      const selectedOfferedActionId = `top-down:${String(revision)}:world-object:${String(index)}`;
      this.#worldObjectOffers.set(selectedOfferedActionId, control.command);
      return {
        objectId: control.objectId,
        objectName: control.objectName,
        label: control.label,
        offeredActionId: selectedOfferedActionId,
      };
    });
    const recovery = dm.pendingPlacementRecovery;
    const pendingPlacementRecovery = recovery === null
      ? null
      : {
          ...recovery,
          sizeOptions: recovery.sizeOptions.map((sizeOption, sizeIndex) => ({
            size: sizeOption.size,
            legalAnchors: sizeOption.legalAnchors.map((anchor, anchorIndex) => {
              const selectedOfferedActionId =
                `top-down:${String(revision)}:placement:${String(sizeIndex)}:${String(anchorIndex)}`;
              const command: Extract<EncounterCommand, { readonly type: 'resolve_pending_placement' }> =
                recovery.reason === 'overlap_adjudication_pending'
                  ? {
                      type: 'resolve_pending_placement',
                      combatant: recovery.combatantId,
                      anchor: anchor.anchor,
                      reason: recovery.reason,
                    }
                  : {
                      type: 'resolve_pending_placement',
                      combatant: recovery.combatantId,
                      anchor: anchor.anchor,
                      reason: recovery.reason,
                      size: sizeOption.size,
                    };
              this.#placementOffers.set(selectedOfferedActionId, command);
              return { ...anchor, offeredActionId: selectedOfferedActionId };
            }),
          })),
        };
    const { worldObjectControls: _commands, pendingPlacementRecovery: _placement, ...projection } = dm;
    return { ...projection, worldObjectControls, pendingPlacementRecovery };
  }

  submitTopDownOfferedAction(
    actorId: CombatantId,
    requestId: string,
    encounterRevision: number,
    selectedOfferedActionId: string,
  ): ReturnType<DmEncounterHost['submitOfferedActionTransaction']> {
    return this.richHost.submitOfferedActionTransaction(
      actorId,
      requestId,
      encounterRevision,
      selectedOfferedActionId,
    );
  }

  async submitTopDownPlacement(selectedOfferedActionId: string): Promise<HostCoordinatorTransactionOutcome> {
    const command = this.#placementOffers.get(selectedOfferedActionId);
    if (command === undefined) return { kind: 'refused', reason: 'The offered placement is stale or unknown.' };
    return this.richHost.resolvePendingPlacementTransaction(command);
  }

  async submitTopDownWorldObject(selectedOfferedActionId: string): Promise<HostCoordinatorTransactionOutcome> {
    const command = this.#worldObjectOffers.get(selectedOfferedActionId);
    if (command === undefined) return { kind: 'refused', reason: 'The offered world-object action is stale or unknown.' };
    return this.richHost.dmUseWorldObjectTransaction(command);
  }

  async applyTopDownAdjudication(intent: {
    readonly target: CombatantId;
    readonly hitPointDelta: number;
    readonly reasoning: string;
  }): Promise<HostCoordinatorTransactionOutcome> {
    if (!Number.isSafeInteger(intent.hitPointDelta)) {
      return { kind: 'refused', reason: 'The adjudication hit-point delta must be a safe integer.' };
    }
    return this.richHost.adjudicateTransaction({
      type: 'adjudicate',
      target: intent.target,
      subject: 'engine:manual-adjudication',
      reasoning: intent.reasoning,
      consequence: { kind: 'hit_point_delta', amount: intent.hitPointDelta },
    });
  }
  interrupt(...args: Parameters<DmEncounterHost['interrupt']>): ReturnType<DmEncounterHost['interrupt']> {
    return this.richHost.interrupt(...args);
  }
  resume(...args: Parameters<DmEncounterHost['resume']>): ReturnType<DmEncounterHost['resume']> {
    return this.richHost.resume(...args);
  }
  undoLast(...args: Parameters<DmEncounterHost['undoLast']>): ReturnType<DmEncounterHost['undoLast']> {
    return this.richHost.undoLast(...args);
  }
  skipTurn(...args: Parameters<DmEncounterHost['skipTurn']>): ReturnType<DmEncounterHost['skipTurn']> {
    return this.richHost.skipTurn(...args);
  }
  delayTurn(...args: Parameters<DmEncounterHost['delayTurn']>): ReturnType<DmEncounterHost['delayTurn']> {
    return this.richHost.delayTurn(...args);
  }
  finishAdventuringDay(...args: Parameters<DmEncounterHost['finishAdventuringDay']>): ReturnType<DmEncounterHost['finishAdventuringDay']> {
    return this.richHost.finishAdventuringDay(...args);
  }
  resolveRestInterruption(...args: Parameters<DmEncounterHost['resolveRestInterruption']>): ReturnType<DmEncounterHost['resolveRestInterruption']> {
    return this.richHost.resolveRestInterruption(...args);
  }
  finishRoom(...args: Parameters<DmEncounterHost['finishRoom']>): ReturnType<DmEncounterHost['finishRoom']> {
    return this.richHost.finishRoom(...args);
  }
  endSession(...args: Parameters<DmEncounterHost['endSession']>): ReturnType<DmEncounterHost['endSession']> {
    return this.richHost.endSession(...args);
  }
  rewindToRound(...args: Parameters<DmEncounterHost['rewindToRound']>): ReturnType<DmEncounterHost['rewindToRound']> {
    return this.richHost.rewindToRound(...args);
  }
  resolveEngineAdjudication(...args: Parameters<DmEncounterHost['resolveEngineAdjudication']>): ReturnType<DmEncounterHost['resolveEngineAdjudication']> {
    return this.richHost.resolveEngineAdjudication(...args);
  }
  resolveRefusalPrompt(...args: Parameters<DmEncounterHost['resolveRefusalPrompt']>): ReturnType<DmEncounterHost['resolveRefusalPrompt']> {
    return this.richHost.resolveRefusalPrompt(...args);
  }
  resolvePendingDecision(...args: Parameters<DmEncounterHost['resolvePendingDecision']>): ReturnType<DmEncounterHost['resolvePendingDecision']> {
    return this.richHost.resolvePendingDecision(...args);
  }
  setRefusalHandling(...args: Parameters<DmEncounterHost['setRefusalHandling']>): ReturnType<DmEncounterHost['setRefusalHandling']> {
    return this.richHost.setRefusalHandling(...args);
  }
  setReactionPreference(...args: Parameters<DmEncounterHost['setReactionPreference']>): ReturnType<DmEncounterHost['setReactionPreference']> {
    return this.richHost.setReactionPreference(...args);
  }
  setHiddenRollCategory(...args: Parameters<DmEncounterHost['setHiddenRollCategory']>): ReturnType<DmEncounterHost['setHiddenRollCategory']> {
    return this.richHost.setHiddenRollCategory(...args);
  }
  replaceController(...args: Parameters<DmEncounterHost['replaceController']>): ReturnType<DmEncounterHost['replaceController']> {
    return this.richHost.replaceController(...args);
  }
}
