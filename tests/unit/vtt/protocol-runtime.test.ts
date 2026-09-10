import { describe, expect, it } from 'vitest';
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
  TWO_ROOM_ADVENTURER_ID,
  twoRoomArtPackage,
} from '../../../src/vtt/handoff/fixtures/two-room';
import {
  HANDOFF_WEBSOCKET_CLOSE_CODES,
  ProtocolRuntime,
  type ProtocolSessionPort,
  type SceneSnapshotEvent,
} from '../../../src/vtt/handoff/protocol-runtime';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';

const PLAYER_A = 'player:adventurer';
const PLAYER_B = 'player:goblin';
const TOKEN_A = 'token:two-room-adventurer';
const TOKEN_B = 'token:two-room-goblin';

interface MutableProtocolPort extends ProtocolSessionPort {
  emitPlayer(playerId: string, event: PlayerSessionSnapshotEvent): void;
  doorCalls(): number;
}

function projections(): {
  readonly dm: DmBoardProjection;
  readonly playerA: PlayerBoardProjection;
  readonly playerB: PlayerBoardProjection;
  readonly tokenBindings: ReturnType<DmEncounterHost['rendererTokenBindings']>;
  readonly closeHost: () => void;
} {
  const state = buildTwoRoomEncounter();
  const host = new DmEncounterHost('scene:protocol-test', new MemoryBrowserSessionStore(), {
    initialState: state,
    initialControllers: state.combatants.map((combatant) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:protocol-test`,
      kind: 'human' as const,
      generation: 0,
    })),
    playerIds: state.combatants.map((combatant) => combatant.profile.id),
  });
  const seats = [
    {
      seatId: 'seat:adventurer',
      observerCombatantId: TWO_ROOM_ADVENTURER_ID,
      ownedCombatantIds: [TWO_ROOM_ADVENTURER_ID],
    },
    {
      seatId: 'seat:goblin',
      observerCombatantId: state.combatants[1]!.profile.id,
      ownedCombatantIds: [state.combatants[1]!.profile.id],
    },
  ] as const;
  return {
    dm: host.snapshot().dm,
    playerA: host.playerSnapshot(seats[0]),
    playerB: host.playerSnapshot(seats[1]),
    tokenBindings: host.rendererTokenBindings(),
    closeHost: () => host.close(),
  };
}

function mutablePort(input: {
  readonly dm: DmBoardProjection;
  readonly playerA: PlayerBoardProjection;
  readonly playerB: PlayerBoardProjection;
}): MutableProtocolPort {
  const playerProjections = new Map<string, PlayerBoardProjection>([
    [PLAYER_A, input.playerA],
    [PLAYER_B, input.playerB],
  ]);
  const dmListeners = new Set<(event: DmSessionSnapshotEvent) => void>();
  const playerListeners = new Map<string, Set<(event: PlayerSessionSnapshotEvent) => void>>();
  let calls = 0;
  let closed = false;
  return {
    sessionId: 'scene:protocol-test',
    dmSnapshot: () => input.dm,
    playerSnapshot: (playerId) => playerId === undefined ? null : playerProjections.get(playerId) ?? null,
    subscribeDm: (listener) => {
      dmListeners.add(listener);
      listener({ kind: 'status', seq: 0, projection: input.dm });
      return () => dmListeners.delete(listener);
    },
    subscribePlayer: (playerId, listener): PlayerSubscriptionResult => {
      const projection = playerId === undefined ? undefined : playerProjections.get(playerId);
      if (playerId === undefined || projection === undefined) return { kind: 'refused', code: 'UNAUTHORIZED' };
      const listeners = playerListeners.get(playerId) ?? new Set();
      listeners.add(listener);
      playerListeners.set(playerId, listeners);
      listener({ kind: 'status', seq: 0, projection });
      return { kind: 'subscribed', unsubscribe: () => listeners.delete(listener) };
    },
    submitOfferedAction: async (): Promise<SessionMutationOutcome> => ({
      kind: 'refused', code: 'ENGINE_REFUSED', reason: 'not configured',
    }),
    setDoor: async (): Promise<DoorSetOutcome> => {
      calls += 1;
      return { kind: 'committed', revision: input.dm.encounter.revision, changed: false };
    },
    close: () => { closed = true; },
    emitPlayer: (playerId, event) => {
      playerProjections.set(playerId, event.projection);
      for (const listener of playerListeners.get(playerId) ?? []) listener(event);
    },
    doorCalls: () => calls + (closed ? 0 : 0),
  };
}

const SEATS = [
  { playerId: PLAYER_A, controlledTokenIds: [TOKEN_A] },
  { playerId: PLAYER_B, controlledTokenIds: [TOKEN_B] },
] as const;

function runtimeFor(
  port: ProtocolSessionPort,
  tokenBindings: ReturnType<DmEncounterHost['rendererTokenBindings']>,
  principal: { readonly role: 'dm' } | { readonly role: 'player'; readonly playerId: string },
): ProtocolRuntime {
  return new ProtocolRuntime({
    service: port,
    principal,
    seats: SEATS,
    art: twoRoomArtPackage(),
    tokenBindings,
  });
}

describe('v1 protocol dispatcher', () => {
  it('requested role cannot grant DM authority', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    const before = port.dmSnapshot().encounter.revision;
    await expect(runtime.dispatch({
      v: 1, id: 'open-as-dm', method: 'session.open', params: { requestedRole: 'dm' },
    })).resolves.toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'UNAUTHORIZED' } },
    });
    expect(port.dmSnapshot().encounter.revision).toBe(before);
    expect(port.doorCalls()).toBe(0);
    runtime.dispose();
    source.closeHost();
  });

  it('binds two players independently and rejects cross-seat tokens', async () => {
    const source = projections();
    const port = mutablePort(source);
    const playerA = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    const playerB = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_B });
    await expect(playerA.dispatch({
      v: 1, id: 'open-a', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    await expect(playerB.dispatch({
      v: 1, id: 'open-b', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_B },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    await expect(playerA.dispatch({
      v: 1, id: 'cross-seat', method: 'token.move', params: { tokenId: TOKEN_B, to: { x: 7, y: 4, z: 0 } },
    })).resolves.toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'FORBIDDEN' } },
    });
    playerA.close();
    playerB.close();
    source.closeHost();
  });

  it('parses structure before feasibility and correlates every valid string id including empty', async () => {
    const source = projections();
    const runtime = runtimeFor(mutablePort(source), source.tokenBindings, { role: 'dm' });
    await expect(runtime.dispatch({
      v: 1, id: '', method: 'door.set', params: { doorId: 42, open: true },
    })).resolves.toEqual({
      kind: 'response',
      response: { v: 1, id: '', ok: false, error: { code: 'INVALID_REQUEST', message: 'The request parameters are invalid.' } },
    });
    await expect(runtime.dispatch({
      v: 1, id: '', method: 'extension.future', params: {},
    })).resolves.toMatchObject({
      kind: 'response', response: { id: '', ok: false, error: { code: 'UNSUPPORTED' } },
    });
    await expect(runtime.dispatch({
      v: 1, id: 'light', method: 'light.set', params: { lightId: 'torch', enabled: false },
    })).resolves.toMatchObject({
      kind: 'response', response: { id: 'light', ok: false, error: { code: 'UNSUPPORTED' } },
    });
    runtime.dispose();
    source.closeHost();
  });

  it('keeps a legitimate empty-id request correlated beside malformed transport faults', async () => {
    const source = projections();
    const runtime = runtimeFor(mutablePort(source), source.tokenBindings, { role: 'dm' });
    const faults: string[] = [];
    runtime.subscribeFaults((event) => faults.push(event.code));
    const pending = runtime.dispatch({
      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await expect(runtime.dispatch('{')).resolves.toEqual({
      kind: 'transport_fault',
      fault: {
        kind: 'transport_fault', code: 'INVALID_JSON',
        message: 'The request is not valid JSON.', websocketCloseCode: HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText,
      },
    });
    await expect(runtime.dispatch(new Uint8Array([0xc3, 0x28]))).resolves.toMatchObject({
      kind: 'transport_fault', fault: { code: 'INVALID_UTF8', websocketCloseCode: 1007 },
    });
    await expect(runtime.dispatch({ v: 1, method: 'scene.snapshot', params: {} })).resolves.toMatchObject({
      kind: 'transport_fault', fault: { code: 'PROTOCOL_ERROR', websocketCloseCode: 1002 },
    });
    await expect(pending).resolves.toMatchObject({ kind: 'response', response: { id: '', ok: true } });
    expect(faults).toEqual(['INVALID_JSON', 'INVALID_UTF8', 'PROTOCOL_ERROR']);
    runtime.dispose();
    source.closeHost();
  });

  it('never executes a duplicate mutation id', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, source.tokenBindings, { role: 'dm' });
    await runtime.dispatch({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
    const mutation = { v: 1, id: 'door-mutation', method: 'door.set', params: { doorId: 'object:two-room-door', open: false } };
    const [first, second] = await Promise.all([runtime.dispatch(mutation), runtime.dispatch(mutation)]);
    expect(first).toMatchObject({ kind: 'response', response: { ok: true } });
    expect(second).toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'DUPLICATE_MUTATION' } },
    });
    expect(port.doorCalls()).toBe(1);
    runtime.dispose();
    source.closeHost();
  });

  it('removes a token that becomes hidden', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    const events: SceneSnapshotEvent[] = [];
    runtime.subscribe((event) => events.push(event));
    await runtime.dispatch({
      v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    });
    expect(events[0]?.data.tokens.map((token) => token.id)).toContain(TOKEN_A);
    const hidden: PlayerBoardProjection = {
      ...source.playerA,
      revision: source.playerA.revision + 1,
      combatants: [],
      lastSeen: [],
    };
    port.emitPlayer(PLAYER_A, { kind: 'autonomous', seq: 99, projection: hidden });
    expect(events).toHaveLength(2);
    expect(events[1]?.seq).toBe(2);
    expect(events[1]?.data.tokens.map((token) => token.id)).toEqual([]);
    expect(events[1]?.data.revision).toBe(source.playerA.revision + 1);
    runtime.dispose();
    source.closeHost();
  });

  it('keeps event sequence independent from repeated encounter revisions and emits no door no-op event', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, source.tokenBindings, { role: 'dm' });
    const events: SceneSnapshotEvent[] = [];
    runtime.subscribe((event) => events.push(event));
    await runtime.dispatch({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
    await runtime.dispatch({
      v: 1, id: 'noop', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
    });
    expect(events.map((event) => [event.seq, event.data.revision])).toEqual([[1, source.dm.encounter.revision]]);
    runtime.dispose();
    source.closeHost();
  });

  it('rejects malformed protocol ids before dispatch and does not fabricate a response envelope', async () => {
    const source = projections();
    const runtime = runtimeFor(mutablePort(source), source.tokenBindings, { role: 'dm' });
    const result = await runtime.dispatch({ v: 1, id: 3, method: 'scene.snapshot', params: {} });
    expect(result.kind).toBe('transport_fault');
    expect('response' in result).toBe(false);
    runtime.dispose();
    source.closeHost();
  });

  it('freezes authorization input by copying token ownership', async () => {
    const source = projections();
    const port = mutablePort(source);
    const mutableTokens = [TOKEN_A];
    const runtime = new ProtocolRuntime({
      service: port,
      principal: { role: 'player', playerId: PLAYER_A },
      seats: [{ playerId: PLAYER_A, controlledTokenIds: mutableTokens }],
      art: twoRoomArtPackage(),
      tokenBindings: source.tokenBindings,
    });
    mutableTokens.push(TOKEN_B);
    await runtime.dispatch({
      v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    });
    await expect(runtime.dispatch({
      v: 1, id: 'ownership', method: 'token.move', params: { tokenId: TOKEN_B, to: { x: 7, y: 4, z: 0 } },
    })).resolves.toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'FORBIDDEN' } },
    });
    runtime.dispose();
    source.closeHost();
  });
});
