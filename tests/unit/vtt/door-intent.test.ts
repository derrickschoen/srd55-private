import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import type { LegalActionSummary } from '../../../src/combat/controllers';
import type { GridCell } from '../../../src/combat/grid';
import type { CombatantId } from '../../../src/combat/values';
import { EncounterSessionService, type PlayerSeatRegistration } from '../../../src/vtt/encounter-session-service';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import type { ProjectedControllerRequest } from '../../../src/vtt/encounter-projections';
import { buildTwoRoomEncounter } from '../../../src/vtt/handoff/fixtures/two-room';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';

const DOOR_ID = 'object:two-room-door';

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

function runningDoorService(blocking: EncounterState['worldObjects'][number]['blocking']): {
  readonly store: MemoryBrowserSessionStore;
  readonly host: DmEncounterHost;
  readonly service: EncounterSessionService;
  readonly seat: PlayerSeatRegistration;
} {
  const store = new MemoryBrowserSessionStore();
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
  });
  const seat = allSeat(host);
  const service = new EncounterSessionService(host, [seat]);
  return { store, host, service, seat };
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

    const opened = await Promise.race([
      service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: true }),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('door.set deadlocked')), 1_000)),
    ]);
    expect(opened).toMatchObject({ kind: 'committed', changed: true });
    const freshOpen = service.playerSnapshot(seat.playerId)?.pendingRequest;
    expect(freshOpen?.requestId).not.toBe(originalOffer.requestId);
    expect(freshOpen?.encounterRevision).toBe(opened.kind === 'committed' ? opened.revision : -1);
    expect(freshOpen?.legalActions.some((action) => action.type === 'move')).toBe(true);
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

  it('same-state success waits for durability without abort, reducer, journal, or snapshot changes', async () => {
    const { store, host, service, seat } = runningDoorService({
      movement: true, lineOfSight: true, cover: 'total',
    });
    const offerPromise = waitForOffer(service, seat.playerId);
    void service.start();
    const offer = await offerPromise;
    let snapshots = 0;
    const unsubscribe = service.subscribeDm(() => { snapshots += 1; });
    snapshots = 0;
    const rowsBefore = store.revisions(host.sessionId).length;

    await expect(service.setDoor({ principal: { kind: 'dm' }, doorId: DOOR_ID, open: false }))
      .resolves.toEqual({ kind: 'committed', revision: offer.encounterRevision, changed: false });
    expect(service.playerSnapshot(seat.playerId)?.pendingRequest?.requestId).toBe(offer.requestId);
    expect(store.revisions(host.sessionId)).toHaveLength(rowsBefore);
    expect(snapshots).toBe(0);
    unsubscribe();
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

  it('preserves a prior pause and publishes the refreshed offer only on resume', async () => {
    const { host, service, seat } = runningDoorService({
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

    const freshPromise = waitForOffer(service, seat.playerId);
    host.resume();
    const fresh = await freshPromise;
    expect(fresh.requestId).not.toBe(original.requestId);
    expect(fresh.legalActions.some((action) => action.type === 'move')).toBe(true);
    service.close();
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
