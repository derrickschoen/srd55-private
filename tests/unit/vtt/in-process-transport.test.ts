import { describe, expect, it, vi } from 'vitest';
import type {
  DmSessionSnapshotEvent,
  DoorSetOutcome,
  PlayerSessionSnapshotEvent,
  PlayerSubscriptionResult,
  SessionMutationOutcome,
} from '../../../src/vtt/encounter-session-service';
import {
  EncounterSessionService,
  type PlayerSeatRegistration,
} from '../../../src/vtt/encounter-session-service';
import type { LegalActionSummary } from '../../../src/combat/controllers';
import type { EncounterState } from '../../../src/combat/encounter';
import type { CombatantId } from '../../../src/combat/values';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import type { DmBoardProjection, PlayerBoardProjection } from '../../../src/vtt/encounter-projections';
import {
  buildTwoRoomEncounter,
  twoRoomArtPackage,
} from '../../../src/vtt/handoff/fixtures/two-room';
import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
import { ProtocolRuntime, type ProtocolSessionPort } from '../../../src/vtt/handoff/protocol-runtime';
import {
  SceneTransportClosedError,
  SceneTransportFaultError,
  type SceneTransport,
} from '../../../src/vtt/handoff/scene-transport';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';

interface ControlledPort extends ProtocolSessionPort {
  emitDm(event: DmSessionSnapshotEvent): void;
  delayDoor(): { readonly reached: Promise<void>; readonly resolve: () => void };
  doorCalls(): number;
  closeCalls(): number;
}

function controlledPort(dm: DmBoardProjection, player: PlayerBoardProjection): ControlledPort {
  const dmListeners = new Set<(event: DmSessionSnapshotEvent) => void>();
  let doorCalls = 0;
  let closeCalls = 0;
  let delayed: Promise<void> | null = null;
  let release: (() => void) | null = null;
  let reached: (() => void) | null = null;
  return {
    sessionId: 'scene:in-process-test',
    dmSnapshot: () => dm,
    playerSnapshot: () => player,
    subscribeDm: (listener) => {
      dmListeners.add(listener);
      listener({ kind: 'status', seq: 0, projection: dm });
      return () => dmListeners.delete(listener);
    },
    subscribePlayer: (_playerId, listener): PlayerSubscriptionResult => {
      listener({ kind: 'status', seq: 0, projection: player });
      return { kind: 'subscribed', unsubscribe: () => undefined };
    },
    submitOfferedAction: async (): Promise<SessionMutationOutcome> => ({
      kind: 'refused', code: 'ENGINE_REFUSED', reason: 'not configured',
    }),
    setDoor: async (): Promise<DoorSetOutcome> => {
      doorCalls += 1;
      reached?.();
      if (delayed !== null) await delayed;
      return { kind: 'committed', revision: dm.encounter.revision, changed: false };
    },
    close: () => { closeCalls += 1; },
    emitDm: (event) => { for (const listener of dmListeners) listener(event); },
    delayDoor: () => {
      let resolveDelay: (() => void) | undefined;
      let markReached: (() => void) | undefined;
      delayed = new Promise<void>((resolve) => { resolveDelay = resolve; });
      const reachedPromise = new Promise<void>((resolve) => { markReached = resolve; });
      release = () => resolveDelay?.();
      reached = () => markReached?.();
      return { reached: reachedPromise, resolve: () => release?.() };
    },
    doorCalls: () => doorCalls,
    closeCalls: () => closeCalls,
  };
}

function fixture(): {
  readonly host: DmEncounterHost;
  readonly port: ControlledPort;
  readonly runtime: ProtocolRuntime;
} {
  const state = buildTwoRoomEncounter();
  const host = new DmEncounterHost('scene:in-process-test', new MemoryBrowserSessionStore(), {
    initialState: state,
    initialControllers: state.combatants.map((combatant) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:transport-test`,
      kind: 'human' as const,
      generation: 0,
    })),
    playerIds: state.combatants.map((combatant) => combatant.profile.id),
  });
  const first = state.combatants[0]?.profile.id;
  if (first === undefined) throw new Error('Expected a two-room player.');
  const player = host.playerSnapshot({
    seatId: 'seat:transport', observerCombatantId: first, ownedCombatantIds: [first],
  });
  const port = controlledPort(host.snapshot().dm, player);
  const runtime = new ProtocolRuntime({
    service: port,
    principal: { role: 'dm' },
    seats: [],
    art: twoRoomArtPackage(),
    tokenBindings: () => host.rendererTokenBindings(),
  });
  return { host, port, runtime };
}

const OPEN = { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } } as const;

function closingMoveActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  if (token === undefined) throw new Error('Expected a close-on-receipt token.');
  return {
    actions: [{
      type: 'move',
      actor,
      path: [{
        column: token.position.column + (token.position.column < 5 ? 1 : -1),
        row: token.position.row,
      }],
      cause: 'voluntary',
    }],
  };
}

function closingSeat(host: DmEncounterHost): PlayerSeatRegistration {
  const combatants = host.snapshot().dm.encounter.combatants.map((combatant) => combatant.id);
  const observerCombatantId = combatants[0];
  if (observerCombatantId === undefined) throw new Error('Expected a close-on-receipt observer.');
  return {
    playerId: 'player:close-on-receipt',
    seatId: 'seat:close-on-receipt',
    observerCombatantId,
    ownedCombatantIds: combatants,
    controlledTokenIds: host.rendererTokenBindings().map((binding) => binding.tokenId),
  };
}

function closingOffer(
  service: EncounterSessionService,
  playerId: string,
): Promise<NonNullable<PlayerBoardProjection['pendingRequest']>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for a close-on-receipt offer.')), 2_000);
    const subscription = service.subscribePlayer(playerId, (event) => {
      if (event.projection.pendingRequest === null) return;
      clearTimeout(timeout);
      if (subscription.kind === 'subscribed') subscription.unsubscribe();
      resolve(event.projection.pendingRequest);
    });
    if (subscription.kind !== 'subscribed') {
      clearTimeout(timeout);
      reject(new Error('The close-on-receipt seat was refused.'));
    }
  });
}

describe('in-process scene transport', () => {
  it.each(['move', 'door'] as const)(
    'preserves a real-host committed %s response when its snapshot observer closes transport',
    async (kind) => {
      const state = buildTwoRoomEncounter();
      const host = new DmEncounterHost(`scene:transport-receipt:${kind}`, new MemoryBrowserSessionStore(), {
        initialState: state,
        initialControllers: state.combatants.map((combatant) => ({
          combatantId: combatant.profile.id,
          controllerId: `${combatant.profile.id}:transport-receipt`,
          kind: 'human' as const,
          generation: 0,
        })),
        playerIds: state.combatants.map((combatant) => combatant.profile.id),
        turnLegalActions: closingMoveActions,
      });
      const seat = closingSeat(host);
      const service = new EncounterSessionService(host, [seat]);
      const makeRuntime = (principal: { readonly role: 'dm' } | { readonly role: 'player'; readonly playerId: string }) =>
        new ProtocolRuntime({
          service,
          principal,
          seats: [seat],
          art: twoRoomArtPackage(),
          tokenBindings: () => host.rendererTokenBindings(),
        });
      const dm = new InProcessSceneTransport(makeRuntime({ role: 'dm' }));
      const player = new InProcessSceneTransport(makeRuntime({ role: 'player', playerId: seat.playerId }));
      await dm.request({ v: 1, id: 'open:dm', method: 'session.open', params: { requestedRole: 'dm' } });
      await player.request({
        v: 1, id: 'open:player', method: 'session.open',
        params: { requestedRole: 'player', playerId: seat.playerId },
      });
      const offerPromise = closingOffer(service, seat.playerId);
      void service.start();
      const pending = await offerPromise;
      const expectedRevision = pending.encounterRevision + 1;
      const closingTransport = kind === 'move' ? player : dm;
      closingTransport.subscribe((event) => {
        if (event.data.revision === expectedRevision) closingTransport.close();
      });
      const response = kind === 'move'
        ? await (() => {
          const move = pending.legalActions[0];
          const binding = host.rendererTokenBindings().find((candidate) => candidate.combatantId === pending.actorId);
          if (move?.type !== 'move' || binding === undefined) throw new Error('Expected the receipt move offer.');
          const destination = move.path.at(-1);
          if (destination === undefined) throw new Error('Expected a receipt move destination.');
          return player.request({
            v: 1, id: 'mutation:move', method: 'token.move',
            params: { tokenId: binding.tokenId, to: { x: destination.column, y: destination.row, z: 0 } },
          });
        })()
        : await dm.request({
          v: 1, id: 'mutation:door', method: 'door.set',
          params: { doorId: 'object:two-room-door', open: true },
        });
      expect(response).toMatchObject({ ok: true, result: { revision: expectedRevision } });
      expect(closingTransport.status()).toBe('closed');
      dm.destroySession();
      host.close();
    },
  );

  it('delivers the initial snapshot once and only future events to late subscribers', async () => {
    const { host, port, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    const early: number[] = [];
    transport.subscribe((event) => early.push(event.seq));
    expect(transport.status()).toBe('connecting');
    await expect(transport.request(OPEN)).resolves.toMatchObject({ id: '', ok: true });
    const initial = await transport.initialSnapshot();
    expect(initial.sceneId).toBe('scene:in-process-test');
    expect(transport.status()).toBe('open');
    expect(early).toEqual([1]);

    const late: number[] = [];
    transport.subscribe((event) => late.push(event.seq));
    port.emitDm({ kind: 'autonomous', seq: 90, projection: port.dmSnapshot() });
    expect(early).toEqual([1, 2]);
    expect(late).toEqual([2]);
    transport.destroySession();
    host.close();
  });

  it('reports status and typed errors while preserving a legitimate empty-id response', async () => {
    const { host, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    const statuses: string[] = [];
    const errors: SceneTransportFaultError[] = [];
    transport.subscribeStatus((status) => statuses.push(status));
    transport.subscribeErrors((error) => errors.push(error));
    const open = transport.request(OPEN);
    await expect(transport.request('{')).rejects.toMatchObject({
      name: 'SceneTransportFaultError', code: 'INVALID_JSON', websocketCloseCode: 1007,
    });
    await expect(open).resolves.toMatchObject({ id: '', ok: true });
    expect(errors.map((error) => error.code)).toEqual(['INVALID_JSON']);
    expect(statuses).toEqual(['connecting', 'open']);
    transport.close();
    expect(transport.status()).toBe('closed');
    expect(statuses).toEqual(['connecting', 'open', 'closed']);
    runtime.destroySession();
    host.close();
  });

  it('isolates throwing event, status, and fault listeners before healthy listeners', async () => {
    const { host, port, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    const events: number[] = [];
    const statuses: string[] = [];
    const faults: string[] = [];
    transport.subscribe(() => { throw new Error('throwing transport event observer'); });
    transport.subscribe((event) => events.push(event.seq));
    expect(() => transport.subscribeStatus(() => { throw new Error('throwing immediate status observer'); }))
      .not.toThrow();
    transport.subscribeStatus(() => { throw new Error('throwing transport status observer'); });
    transport.subscribeStatus((status) => statuses.push(status));
    transport.subscribeErrors(() => { throw new Error('throwing transport fault observer'); });
    transport.subscribeErrors((error) => faults.push(error.code));
    await expect(transport.request(OPEN)).resolves.toMatchObject({ id: '', ok: true });
    port.emitDm({ kind: 'autonomous', seq: 8, projection: port.dmSnapshot() });
    await expect(transport.request('{')).rejects.toBeInstanceOf(SceneTransportFaultError);
    expect(events).toEqual([1, 2]);
    expect(statuses).toEqual(['connecting', 'open']);
    expect(faults).toEqual(['INVALID_JSON']);
    transport.destroySession();
    host.close();
  });

  it('rejects pending reads on close and never retries an unknown mutation outcome', async () => {
    const { host, port, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    await transport.request(OPEN);
    const barrier = port.delayDoor();
    const pending = transport.request({
      v: 1, id: 'pending-door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    await barrier.reached;
    transport.close();
    await expect(pending).rejects.toBeInstanceOf(SceneTransportClosedError);
    await expect(transport.request({
      v: 1, id: 'after-close', method: 'scene.snapshot', params: {},
    })).rejects.toBeInstanceOf(SceneTransportClosedError);
    barrier.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(port.doorCalls()).toBe(1);
    runtime.destroySession();
    host.close();
  });

  it('rejects an immediately pending snapshot read when close is not observer-triggered', async () => {
    const { host, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    await transport.request(OPEN);
    const pending = transport.request({
      v: 1, id: 'pending-snapshot', method: 'scene.snapshot', params: {},
    });
    transport.close();
    await expect(pending).rejects.toBeInstanceOf(SceneTransportClosedError);
    runtime.destroySession();
    host.close();
  });

  it('rejects an unopened initial read and unsubscribes on close', async () => {
    const { host, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    const initial = transport.initialSnapshot();
    const events = vi.fn();
    transport.subscribe(events);
    transport.close();
    await expect(initial).rejects.toBeInstanceOf(SceneTransportClosedError);
    expect(events).not.toHaveBeenCalled();
    runtime.destroySession();
    host.close();
  });

  it('dispose detaches while explicit destruction closes the logical session', async () => {
    const { host, port, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    await transport.request(OPEN);
    await transport.request({
      v: 1, id: 'reserved', method: 'light.set', params: { lightId: 'torch', enabled: false },
    });
    transport.dispose();
    expect(transport.status()).toBe('disposed');
    expect(port.closeCalls()).toBe(0);
    await expect(transport.request({
      v: 1, id: 'reserved', method: 'light.set', params: { lightId: 'torch', enabled: false },
    })).rejects.toBeInstanceOf(SceneTransportClosedError);
    transport.destroySession();
    expect(port.closeCalls()).toBe(1);
    host.close();
  });

  it('uses zero serialization for object transport and detects copied-request and snapshot controls', async () => {
    const { host, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    const openResponse = await transport.request(OPEN);
    expect(openResponse).toMatchObject({ ok: true });
    const withoutSerialization = async (operation: () => Promise<void>): Promise<void> => {
      const parse = vi.spyOn(JSON, 'parse');
      const stringify = vi.spyOn(JSON, 'stringify');
      const clone = vi.spyOn(globalThis, 'structuredClone');
      try {
        await operation();
        const calls = parse.mock.calls.length + stringify.mock.calls.length + clone.mock.calls.length;
        if (calls !== 0) throw new Error(
          `SERIALIZATION_CALLS: parse=${String(parse.mock.calls.length)} ` +
          `stringify=${String(stringify.mock.calls.length)} clone=${String(clone.mock.calls.length)}`,
        );
      } finally {
        parse.mockRestore();
        stringify.mockRestore();
        clone.mockRestore();
      }
    };
    let snapshot: Awaited<ReturnType<SceneTransport['initialSnapshot']>> | null = null;
    let unsupportedResponse: Awaited<ReturnType<SceneTransport['request']>> | null = null;
    await expect(withoutSerialization(async () => {
      snapshot = await transport.initialSnapshot();
      unsupportedResponse = await transport.request({
        v: 1, id: 'unsupported', method: 'extension.future', params: {},
      });
    })).resolves.toBeUndefined();
    expect(snapshot).toMatchObject({ sceneId: 'scene:in-process-test' });
    expect(unsupportedResponse).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    await expect(withoutSerialization(async () => {
      const copied = JSON.parse(JSON.stringify({
        v: 1, id: 'copied', method: 'scene.snapshot', params: {},
      })) as unknown;
      await transport.request(copied);
    })).rejects.toThrow('SERIALIZATION_CALLS');
    await expect(withoutSerialization(async () => {
      JSON.stringify(await transport.initialSnapshot());
    })).rejects.toThrow('SERIALIZATION_CALLS');
    transport.destroySession();
    host.close();
  });
});
