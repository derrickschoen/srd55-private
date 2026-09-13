import { describe, expect, it, vi } from 'vitest';
import type { EncounterCommand } from '../../../src/combat/events';
import type { EncounterState } from '../../../src/combat/encounter';
import type { LegalActionSummary } from '../../../src/combat/controllers';
import type { GridCell } from '../../../src/combat/grid';
import type { CombatantId } from '../../../src/combat/values';
import { EncounterSessionService, type PlayerSeatRegistration } from '../../../src/vtt/encounter-session-service';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import type { ProjectedControllerRequest } from '../../../src/vtt/encounter-projections';
import { buildTwoRoomEncounter } from '../../../src/vtt/handoff/fixtures/two-room';
import {
  MemoryBrowserSessionStore,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';

const DOOR_ID = 'object:two-room-door';

class ControlledFlushStore extends MemoryBrowserSessionStore {
  #next: Promise<void> | null = null;
  #remaining = 0;
  #markReached: (() => void) | null = null;
  #markPassed: (() => void) | null = null;

  blockNextFlush(): {
    readonly reached: Promise<void>;
    readonly passed: Promise<void>;
    readonly resolve: () => void;
    readonly reject: (error: Error) => void;
  } {
    return this.blockFlushIn(1);
  }

  blockFlushIn(ordinal: number): {
    readonly reached: Promise<void>;
    readonly passed: Promise<void>;
    readonly resolve: () => void;
    readonly reject: (error: Error) => void;
  } {
    let resolveBarrier: (() => void) | undefined;
    let rejectBarrier: ((error: Error) => void) | undefined;
    let markReached: (() => void) | undefined;
    let markPassed: (() => void) | undefined;
    this.#remaining = ordinal;
    const reached = new Promise<void>((resolve) => { markReached = resolve; });
    const passed = new Promise<void>((resolve) => { markPassed = resolve; });
    this.#markReached = () => markReached?.();
    this.#markPassed = () => markPassed?.();
    this.#next = new Promise<void>((resolve, reject) => {
      resolveBarrier = resolve;
      rejectBarrier = reject;
    });
    return {
      reached,
      passed,
      resolve: () => resolveBarrier?.(),
      reject: (error) => rejectBarrier?.(error),
    };
  }

  override async flush(): Promise<void> {
    if (this.#remaining > 1) {
      this.#remaining -= 1;
      return;
    }
    if (this.#remaining === 1) this.#remaining = 0;
    const next = this.#next;
    this.#next = null;
    this.#markReached?.();
    this.#markReached = null;
    try {
      if (next !== null) await next;
    } finally {
      this.#markPassed?.();
      this.#markPassed = null;
    }
  }
}

class CancellationFailureStore extends MemoryBrowserSessionStore {
  #appendCountdown: number | null = null;

  failAppendIn(count: number): void {
    this.#appendCountdown = count;
  }

  override append(revision: SessionRevision): void {
    if (this.#appendCountdown !== null) {
      this.#appendCountdown -= 1;
      if (this.#appendCountdown === 0) {
        this.#appendCountdown = null;
        throw new Error('injected cancellation recording failure');
      }
    }
    super.append(revision);
  }
}

function stateWithDoor(blocking: EncounterState['worldObjects'][number]['blocking']): EncounterState {
  const state = buildTwoRoomEncounter();
  return {
    ...state,
    worldObjects: state.worldObjects.map((object) => String(object.id) === DOOR_ID
      ? { ...object, blocking }
      : object),
  };
}

function allSeat(host: DmEncounterHost): PlayerSeatRegistration {
  const combatantIds = host.snapshot().dm.encounter.combatants.map((combatant) => combatant.id);
  const observerCombatantId = combatantIds[0];
  if (observerCombatantId === undefined) throw new Error('Expected a player observer.');
  return {
    playerId: 'player:door-test',
    seatId: 'seat:door-test',
    observerCombatantId,
    ownedCombatantIds: combatantIds,
    controlledTokenIds: host.rendererTokenBindings().map((token) => token.tokenId),
  };
}

function legalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
  const actions: LegalActionSummary['actions'][number][] = [{ type: 'end_turn', actor }];
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  const door = state.worldObjects.find((object) => String(object.id) === DOOR_ID);
  if (token !== undefined && door !== undefined && !door.blocking.movement) {
    const step = Math.sign(door.position.column - token.position.column);
    const path: GridCell[] = [];
    for (
      let column = token.position.column + step;
      column !== door.position.column + step;
      column += step
    ) path.push({ column, row: door.position.row });
    actions.unshift({ type: 'move', actor, path, cause: 'voluntary' });
  }
  return { actions };
}

function waitForOffer(service: EncounterSessionService, playerId: string): Promise<ProjectedControllerRequest> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for a fresh offer.')), 2_000);
    const subscription = service.subscribePlayer(playerId, (event) => {
      if (event.projection.pendingRequest === null) return;
      clearTimeout(timeout);
      if (subscription.kind === 'subscribed') subscription.unsubscribe();
      resolve(event.projection.pendingRequest);
    });
    if (subscription.kind !== 'subscribed') {
      clearTimeout(timeout);
      reject(new Error('Door test player was not authorized.'));
    }
  });
}

function runningDoorService(
  blocking: EncounterState['worldObjects'][number]['blocking'],
  store: MemoryBrowserSessionStore = new MemoryBrowserSessionStore(),
  onReducerInvocation?: (command: EncounterCommand) => void,
): {
  readonly store: MemoryBrowserSessionStore;
  readonly host: DmEncounterHost;
  readonly service: EncounterSessionService;
  readonly seat: PlayerSeatRegistration;
} {
  const initialState = stateWithDoor(blocking);
  const host = new DmEncounterHost('session:door-intent', store, {
    initialState,
    initialControllers: initialState.combatants.map((combatant) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:human:door-test`,
      kind: 'human',
      generation: 0,
    })),
    playerIds: initialState.combatants.map((combatant) => combatant.profile.id),
    turnLegalActions: legalActions,
    ...(onReducerInvocation === undefined ? {} : { onReducerInvocation }),
  });
  const seat = allSeat(host);
  const service = new EncounterSessionService(host, [seat]);
  return { store, host, service, seat };
}

function reopenDoorService(store: MemoryBrowserSessionStore): {
  readonly host: DmEncounterHost;
  readonly service: EncounterSessionService;
  readonly seat: PlayerSeatRegistration;
} {
  const playerIds = buildTwoRoomEncounter().combatants.map((combatant) => combatant.profile.id);
  const host = new DmEncounterHost('session:door-intent', store, {
    playerIds,
    turnLegalActions: legalActions,
  });
  const seat = allSeat(host);
  return { host, service: new EncounterSessionService(host, [seat]), seat };
}

describe('deadlock-safe door intent', () => {
  it('opens and closes through the exact attributed world operation and refreshes offers', async () => {
    const { host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    });
    const originalOfferPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const originalOffer = await originalOfferPromise;
    expect(originalOffer.legalActions.some((action) => action.type === 'move')).toBe(false);
    const activeActor = originalOffer.actorId;
    const healthyDoorMutations: number[] = [];
    service.subscribeDm(() => { throw new Error('throwing door subscriber'); });
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') healthyDoorMutations.push(event.projection.encounter.revision);
    });

    const opened = await Promise.race([
      service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: true }),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('door.set deadlocked')), 1_000)),
    ]);
    expect(opened).toMatchObject({ kind: 'committed', changed: true });
    expect(opened).not.toMatchObject({ kind: 'failed', phase: 'pre_apply' });
    expect(service.subscriberErrors().some((failure) => failure.audience === 'dm')).toBe(true);
    const freshOpen = service.playerSnapshot(seat.playerId)?.pendingRequest;
    expect(freshOpen?.requestId).not.toBe(originalOffer.requestId);
    expect(freshOpen?.encounterRevision).toBe(opened.kind === 'committed' ? opened.revision : -1);
    expect(freshOpen?.legalActions.some((action) => action.type === 'move')).toBe(true);
    expect(healthyDoorMutations).toEqual([
      opened.kind === 'committed' ? opened.revision : -1,
    ]);
    const openReducer = [...host.snapshot().dm.history].reverse().find(
      (entry) => entry.transition.kind === 'reducer_applied',
    );
    if (openReducer?.transition.kind !== 'reducer_applied') {
      throw new Error('Expected the door reducer journal transition.');
    }
    expect(openReducer.transition.command).toEqual({
      type: 'world_operation', actor: activeActor, cost: 'none',
      operation: {
        kind: 'modify_object', objectId: DOOR_ID,
        changes: { blocking: { movement: false, lineOfSight: false, cover: 'none' } },
      },
    });
    expect(openReducer.transition.events).toEqual([{
      type: 'world_object_modified', sequence: 5, actor: activeActor, objectId: DOOR_ID,
    }]);

    const closed = await service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: false });
    expect(closed).toMatchObject({ kind: 'committed', changed: true });
    expect(healthyDoorMutations).toEqual([
      opened.kind === 'committed' ? opened.revision : -1,
      closed.kind === 'committed' ? closed.revision : -1,
    ]);
    const freshClosed = service.playerSnapshot(seat.playerId)?.pendingRequest;
    expect(freshClosed?.requestId).not.toBe(freshOpen?.requestId);
    expect(freshClosed?.legalActions.some((action) => action.type === 'move')).toBe(false);
    expect(host.snapshot().dm.encounter.worldObjects.find((object) => String(object.id) === DOOR_ID)?.blocking)
      .toEqual({ movement: true, lineOfSight: true, cover: 'total' });

    await expect(service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: originalOffer.requestId,
      encounterRevision: originalOffer.encounterRevision,
      offeredActionId: originalOffer.offeredActionIds[0]!,
    })).resolves.toMatchObject({ kind: 'refused', code: 'STALE_OFFER' });
    service.close();
  });

  it('preserves the durable door revision and projections when state advances during offer refresh', async () => {
    const { host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    });
    const originalOfferPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const originalOffer = await originalOfferPromise;
    const mutationRevisions: number[] = [];
    const playerMutationRevisions: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
    });
    service.subscribePlayer(seat.playerId, (event) => {
      if (event.kind === 'mutation') playerMutationRevisions.push(event.projection.revision);
    });
    let adjudicatedRevision: number | null = null;
    const unsubscribe = host.subscribeNotifications((notification) => {
      const fresh = notification.snapshot.dm.pendingRequest;
      if (
        notification.kind !== 'offer' ||
        fresh === null ||
        fresh.requestId === originalOffer.requestId ||
        adjudicatedRevision !== null
      ) return;
      host.adjudicate({
        type: 'adjudicate',
        target: fresh.actorId,
        subject: 'door-refresh-reentrant-adjudication',
        reasoning: 'Advance the host after the fresh offer while preserving the door acknowledgment.',
        consequence: { kind: 'no_effect' },
      });
      adjudicatedRevision = host.snapshot().dm.encounter.revision;
    });

    const result = await service.setDoor({
      principal: { kind: 'dm' }, doorId: DOOR_ID, open: true,
    });
    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed' || !result.changed) {
      throw new Error(`Expected a changed door commit, received ${result.kind}.`);
    }
    expect(result.revision).toBe(originalOffer.encounterRevision + 1);
    expect(result.event.projection.encounter.revision).toBe(result.revision);
    expect(result.event.projection.encounter.worldObjects.find(
      (object) => String(object.id) === DOOR_ID,
    )?.blocking).toEqual({ movement: false, lineOfSight: false, cover: 'none' });
    expect(adjudicatedRevision).toBe(result.revision + 1);
    expect(host.snapshot().dm.encounter.revision).toBe(result.revision + 1);
    expect(mutationRevisions).toEqual([result.revision]);
    expect(playerMutationRevisions).toEqual([result.revision]);
    unsubscribe();
    service.close();
  });

  it.each(['dm', 'player'] as const)(
    'keeps a door commit irrevocable when a %s mutation subscriber closes the service',
    async (audience) => {
      const { host, service, seat } = runningDoorService({
        movement: true, lineOfSight: true, cover: 'total',
      });
      const offerPromise = waitForOffer(service, seat.playerId);
      void service.start();
      const offer = await offerPromise;
      const observedMutationRevisions: number[] = [];
      const closeOnMutation = (kind: string, revision: number): void => {
        if (kind !== 'mutation') return;
        observedMutationRevisions.push(revision);
        service.close();
      };
      if (audience === 'dm') {
        service.subscribeDm((event) => closeOnMutation(event.kind, event.projection.encounter.revision));
      } else {
        service.subscribePlayer(seat.playerId, (event) => closeOnMutation(event.kind, event.projection.revision));
      }

      const committed = service.setDoor({
        principal: { kind: 'dm' }, doorId: DOOR_ID, open: true,
      });
      const queued = service.submitOfferedAction({
        playerId: seat.playerId,
        tokenId: seat.controlledTokenIds[0]!,
        requestId: offer.requestId,
        encounterRevision: offer.encounterRevision,
        offeredActionId: offer.offeredActionIds[0]!,
      });
      const result = await committed;
      expect(result.kind).toBe('committed');
      if (result.kind !== 'committed' || !result.changed) {
        throw new Error(`Expected a changed door commit, received ${result.kind}.`);
      }
      await expect(queued).resolves.toEqual({ kind: 'closed' });
      expect(result.event.kind).toBe('mutation');
      expect(result.event.projection.encounter.revision).toBe(result.revision);
      expect(observedMutationRevisions).toEqual([result.revision]);
      const revisionAtReceipt = host.snapshot().dm.encounter.revision;
      await Promise.resolve();
      expect(host.snapshot().dm.encounter.revision).toBe(revisionAtReceipt);
    },
  );

  it('same-state success waits for durability without abort, reducer, journal, or snapshot changes', async () => {
    const controlled = new ControlledFlushStore();
    const reducerCommands: EncounterCommand[] = [];
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const { store, host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    }, controlled, (command) => reducerCommands.push(command));
    const offerPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const offer = await offerPromise;
    abort.mockClear();
    reducerCommands.length = 0;
    let snapshots = 0;
    const unsubscribe = service.subscribeDm(() => { snapshots += 1; });
    snapshots = 0;
    const rowsBefore = store.revisions(host.sessionId).length;
    const barrier = controlled.blockNextFlush();
    let settled = false;
    const result = service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: false })
      .then((outcome) => { settled = true; return outcome; });

    await barrier.reached;
    expect(settled).toBe(false);
    expect(abort).not.toHaveBeenCalled();
    expect(reducerCommands).toEqual([]);
    barrier.resolve();
    await expect(result)
      .resolves.toEqual({ kind: 'committed', revision: offer.encounterRevision, changed: false });
    expect(service.playerSnapshot(seat.playerId)?.pendingRequest?.requestId).toBe(offer.requestId);
    expect(store.revisions(host.sessionId)).toHaveLength(rowsBefore);
    expect(snapshots).toBe(0);
    expect(abort).not.toHaveBeenCalled();
    expect(reducerCommands).toEqual([]);

    const failedBarrier = controlled.blockNextFlush();
    const failed = service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: false });
    await failedBarrier.reached;
    failedBarrier.reject(new Error('same-state durability failed'));
    await expect(failed).resolves.toMatchObject({ kind: 'failed', phase: 'pre_apply' });
    expect(service.playerSnapshot(seat.playerId)?.pendingRequest?.requestId).toBe(offer.requestId);
    expect(store.revisions(host.sessionId)).toHaveLength(rowsBefore);
    expect(snapshots).toBe(0);
    expect(abort).not.toHaveBeenCalled();
    expect(reducerCommands).toEqual([]);
    abort.mockRestore();
    unsubscribe();
    service.close();
  });

  it('aborts the human wait and restores the running pause policy when cancellation recording fails', async () => {
    const store = new CancellationFailureStore();
    const reducerCommands: EncounterCommand[] = [];
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const { host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    }, store, (command) => reducerCommands.push(command));
    const offerPromise = waitForOffer(service, seat.playerId);
    const start = service.start();
    const offer = await offerPromise;
    abort.mockClear();
    reducerCommands.length = 0;
    store.failAppendIn(2);

    await expect(service.setDoor({
      principal: { kind: 'dm' }, doorId: DOOR_ID, open: true,
    })).resolves.toMatchObject({ kind: 'failed', phase: 'pre_apply' });
    await expect(start).rejects.toThrow('Controller request was cancelled.');
    const recovered = service.playerSnapshot(seat.playerId)?.pendingRequest;
    expect(recovered?.requestId).not.toBe(offer.requestId);
    expect(host.snapshot().dm.coordinator.pause).toBeNull();
    expect(abort).toHaveBeenCalledTimes(1);
    expect(reducerCommands).toEqual([]);
    expect(host.snapshot().dm.encounter.worldObjects.find(
      (object) => String(object.id) === DOOR_ID,
    )?.blocking).toEqual({ movement: true, lineOfSight: true, cover: 'total' });
    abort.mockRestore();
    service.close();
  });

  it('cancels and settles the human wait when the first external-pause append fails', async () => {
    const store = new CancellationFailureStore();
    const reducerCommands: EncounterCommand[] = [];
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const { host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    }, store, (command) => reducerCommands.push(command));
    const offerPromise = waitForOffer(service, seat.playerId);
    const start = service.start();
    const offer = await offerPromise;
    abort.mockClear();
    reducerCommands.length = 0;
    store.failAppendIn(1);

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: true }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('first-pause failure did not settle')), 1_000);
      }),
    ]);
    if (timeout !== undefined) clearTimeout(timeout);
    expect(result).toMatchObject({ kind: 'failed', phase: 'pre_apply' });
    await expect(start).rejects.toThrow('Controller request was cancelled.');
    const recovered = service.playerSnapshot(seat.playerId)?.pendingRequest;
    expect(recovered?.requestId).not.toBe(offer.requestId);
    expect(host.snapshot().dm.coordinator.pause).toBeNull();
    expect(abort).toHaveBeenCalledTimes(1);
    expect(reducerCommands).toEqual([]);
    expect(host.snapshot().dm.encounter.worldObjects.find(
      (object) => String(object.id) === DOOR_ID,
    )?.blocking).toEqual({ movement: true, lineOfSight: true, cover: 'total' });
    abort.mockRestore();
    service.close();
  });

  it('rejects noncanonical triples and missing active actors without side effects', async () => {
    const noncanonical = runningDoorService({
      movement: true, lineOfSight: false, cover: 'half',
    });
    const offerPromise = waitForOffer(noncanonical.service, noncanonical.seat.playerId);
    void noncanonical.service.start();
    const offer = await offerPromise;
    const rowsBefore = noncanonical.store.revisions(noncanonical.host.sessionId).length;
    await expect(noncanonical.service.setDoor({
      principal: { kind: 'dm' }, doorId: DOOR_ID, open: true,
    })).resolves.toMatchObject({ kind: 'refused', code: 'UNSUPPORTED' });
    expect(noncanonical.service.playerSnapshot(noncanonical.seat.playerId)?.pendingRequest?.requestId)
      .toBe(offer.requestId);
    expect(noncanonical.store.revisions(noncanonical.host.sessionId)).toHaveLength(rowsBefore);
    noncanonical.service.close();

    const inactive = runningDoorService({ movement: true, lineOfSight: true, cover: 'total' });
    await expect(inactive.service.setDoor({
      principal: { kind: 'dm' }, doorId: DOOR_ID, open: true,
    })).resolves.toMatchObject({ kind: 'refused', code: 'UNSUPPORTED' });
    inactive.service.close();
  });

  it('invalidates paused continuation offers across durable close, reopen, and resume', async () => {
    const { store, host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    });
    const originalPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const original = await originalPromise;
    host.interrupt();

    await expect(service.setDoor({
      principal: { kind: 'dm' }, doorId: DOOR_ID, open: true,
    })).resolves.toMatchObject({ kind: 'committed', changed: true });
    expect(host.snapshot().dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    expect(service.playerSnapshot(seat.playerId)?.pendingRequest).toBeNull();

    const persistedAfterOpen = store.revisions(host.sessionId);
    expect(persistedAfterOpen.at(-1)?.encounterState.worldObjects.find(
      (object) => String(object.id) === DOOR_ID,
    )?.blocking).toEqual({ movement: false, lineOfSight: false, cover: 'none' });
    service.close();

    const reopened = reopenDoorService(store);
    expect(reopened.host.snapshot().dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    expect(reopened.service.playerSnapshot(reopened.seat.playerId)?.pendingRequest).toBeNull();
    const freshPromise = waitForOffer(reopened.service, reopened.seat.playerId);
    reopened.host.resume();
    const fresh = await freshPromise;
    expect(fresh.requestId).not.toBe(original.requestId);
    expect(fresh.legalActions.some((action) => action.type === 'move')).toBe(true);

    reopened.host.interrupt();
    await expect(reopened.service.setDoor({
      principal: { kind: 'dm' }, doorId: DOOR_ID, open: false,
    })).resolves.toMatchObject({ kind: 'committed', changed: true });
    reopened.service.close();

    const reopenedAgain = reopenDoorService(store);
    const invalidatedPromise = waitForOffer(reopenedAgain.service, reopenedAgain.seat.playerId);
    reopenedAgain.host.resume();
    const invalidated = await invalidatedPromise;
    expect(invalidated.requestId).not.toBe(fresh.requestId);
    expect(invalidated.legalActions.some((action) => action.type === 'move')).toBe(false);
    expect(store.revisions(reopenedAgain.host.sessionId).every((revision) => revision.checksum.length === 64))
      .toBe(true);
    expect(reopenedAgain.host.snapshot().dm.encounter.revision).toBe(
      store.revisions(reopenedAgain.host.sessionId).at(-1)?.encounterState.revision,
    );
    reopenedAgain.service.close();
  });

  it('settles a door and queued mutation closed when closure crosses the door durability barrier', async () => {
    const controlled = new ControlledFlushStore();
    const { host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    }, controlled);
    const offerPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const offer = await offerPromise;
    const mutations: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') mutations.push(event.projection.encounter.revision);
    });
    const barrier = controlled.blockNextFlush();
    const door = service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: true });
    const queued = service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: offer.requestId,
      encounterRevision: offer.encounterRevision,
      offeredActionId: offer.offeredActionIds[0]!,
    });
    await barrier.reached;
    service.close();

    await expect(door).resolves.toEqual({ kind: 'closed' });
    await expect(queued).resolves.toEqual({ kind: 'closed' });
    const rowsAtClose = controlled.revisions(host.sessionId).length;
    const revisionAtClose = host.snapshot().dm.encounter.revision;
    expect(mutations).toEqual([]);
    expect(host.snapshot().dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    barrier.resolve();
    await barrier.passed;
    await Promise.resolve();
    expect(controlled.revisions(host.sessionId)).toHaveLength(rowsAtClose);
    expect(host.snapshot().dm.encounter.revision).toBe(revisionAtClose);
  });

  it('settles a door and queued mutation closed when closure crosses fresh-offer refresh', async () => {
    const controlled = new ControlledFlushStore();
    const { host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    }, controlled);
    const offerPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const offer = await offerPromise;
    const mutations: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') mutations.push(event.projection.encounter.revision);
    });
    const refreshBarrier = controlled.blockFlushIn(2);
    const door = service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: true });
    const queued = service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: offer.requestId,
      encounterRevision: offer.encounterRevision,
      offeredActionId: offer.offeredActionIds[0]!,
    });
    await refreshBarrier.reached;
    service.close();

    await expect(door).resolves.toEqual({ kind: 'closed' });
    await expect(queued).resolves.toEqual({ kind: 'closed' });
    const rowsAtClose = controlled.revisions(host.sessionId).length;
    const revisionAtClose = host.snapshot().dm.encounter.revision;
    expect(mutations).toEqual([]);
    expect(host.snapshot().dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    refreshBarrier.resolve();
    await refreshBarrier.passed;
    await Promise.resolve();
    expect(controlled.revisions(host.sessionId)).toHaveLength(rowsAtClose);
    expect(host.snapshot().dm.encounter.revision).toBe(revisionAtClose);
  });

  it('uses authority rather than a requested role', async () => {
    const { service } = runningDoorService({ movement: true, lineOfSight: true, cover: 'total' });
    await expect(service.setDoor({ doorId: DOOR_ID, open: true })).resolves.toMatchObject({
      kind: 'refused', code: 'UNAUTHORIZED',
    });
    await expect(service.setDoor({
      principal: { kind: 'player', playerId: 'player:door-test' }, doorId: DOOR_ID, open: true,
    })).resolves.toMatchObject({ kind: 'refused', code: 'FORBIDDEN' });
    service.close();
  });
});
