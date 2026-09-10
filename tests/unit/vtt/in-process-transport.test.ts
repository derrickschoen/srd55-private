import { describe, expect, it, vi } from 'vitest';
import type {
  DmSessionSnapshotEvent,
  DoorSetOutcome,
  PlayerSessionSnapshotEvent,
  PlayerSubscriptionResult,
  SessionMutationOutcome,
} from '../../../src/vtt/encounter-session-service';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import type { DmBoardProjection, PlayerBoardProjection } from '../../../src/vtt/encounter-projections';
import {
  buildTwoRoomEncounter,
  twoRoomArtPackage,
} from '../../../src/vtt/handoff/fixtures/two-room';
import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
import { ProtocolRuntime, type ProtocolSessionPort } from '../../../src/vtt/handoff/protocol-runtime';
import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
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
    tokenBindings: host.rendererTokenBindings(),
  });
  return { host, port, runtime };
}

const OPEN = { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } } as const;

describe('in-process scene transport', () => {
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
    transport.dispose();
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
    host.close();
  });

  it('dispose destroys the logical session and its mutation ledger', async () => {
    const { host, port, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    await transport.request(OPEN);
    await transport.request({
      v: 1, id: 'reserved', method: 'light.set', params: { lightId: 'torch', enabled: false },
    });
    transport.dispose();
    expect(transport.status()).toBe('disposed');
    expect(port.closeCalls()).toBe(1);
    await expect(transport.request({
      v: 1, id: 'reserved', method: 'light.set', params: { lightId: 'torch', enabled: false },
    })).rejects.toBeInstanceOf(SceneTransportClosedError);
    host.close();
  });

  it('passes in-process objects without JSON serialization while still validating them', async () => {
    const { host, runtime } = fixture();
    const transport = new InProcessSceneTransport(runtime);
    const parse = vi.spyOn(JSON, 'parse');
    const stringify = vi.spyOn(JSON, 'stringify');
    await expect(transport.request(OPEN)).resolves.toMatchObject({ ok: true });
    const invalid = {
      v: 1, id: 'invalid', method: 'scene.snapshot', params: { unexpected: true },
    };
    await expect(transport.request(invalid)).resolves.toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(parse).not.toHaveBeenCalled();
    expect(stringify.mock.calls.some(([value]) => value === OPEN || value === invalid)).toBe(false);
    parse.mockRestore();
    stringify.mockRestore();
    transport.dispose();
    host.close();
  });
});
