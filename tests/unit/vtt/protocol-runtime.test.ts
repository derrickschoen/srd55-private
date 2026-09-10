import { describe, expect, it } from 'vitest';
import { combatantId, type CombatantId } from '../../../src/combat/values';
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
import {
  MemoryBrowserSessionStore,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';

const PLAYER_A = 'player:adventurer';
const PLAYER_B = 'player:goblin';
const TOKEN_A = 'token:two-room-adventurer';
const TOKEN_B = 'token:two-room-goblin';

class ProtocolFaultStore extends MemoryBrowserSessionStore {
  #appendFailure = false;
  #flushFailure = false;

  failNextAppend(): void {
    this.#appendFailure = true;
  }

  failNextFlush(): void {
    this.#flushFailure = true;
  }

  override append(revision: SessionRevision): void {
    if (this.#appendFailure) {
      this.#appendFailure = false;
      throw new Error('injected protocol append failure');
    }
    super.append(revision);
  }

  override async flush(): Promise<void> {
    if (this.#flushFailure) {
      this.#flushFailure = false;
      throw new Error('injected protocol flush failure');
    }
  }
}

function protocolMoveActions(mode: 'valid' | 'refused') {
  return (state: EncounterState, actor: CombatantId): LegalActionSummary => {
    const token = state.tokens.find((candidate) => candidate.combatantId === actor);
    if (token === undefined) throw new Error('Expected a protocol outcome token.');
    const destination = mode === 'refused'
      ? { column: 5, row: 4 }
      : { column: token.position.column + (token.position.column < 5 ? 1 : -1), row: token.position.row };
    return { actions: [{ type: 'move', actor, path: [destination], cause: 'voluntary' }] };
  };
}

function allSeat(host: DmEncounterHost): PlayerSeatRegistration {
  const combatants = host.snapshot().dm.encounter.combatants.map((combatant) => combatant.id);
  const observerCombatantId = combatants[0];
  if (observerCombatantId === undefined) throw new Error('Expected a protocol outcome observer.');
  return {
    playerId: 'player:protocol-outcomes',
    seatId: 'seat:protocol-outcomes',
    observerCombatantId,
    ownedCombatantIds: combatants,
    controlledTokenIds: host.rendererTokenBindings().map((binding) => binding.tokenId),
  };
}

function waitForRealOffer(
  service: EncounterSessionService,
  playerId: string,
): Promise<NonNullable<PlayerBoardProjection['pendingRequest']>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for a protocol outcome offer.')), 2_000);
    const subscription = service.subscribePlayer(playerId, (event) => {
      if (event.projection.pendingRequest === null) return;
      clearTimeout(timeout);
      if (subscription.kind === 'subscribed') subscription.unsubscribe();
      resolve(event.projection.pendingRequest);
    });
    if (subscription.kind !== 'subscribed') {
      clearTimeout(timeout);
      reject(new Error('The protocol outcome seat was refused.'));
    }
  });
}

async function realOutcomeRuntime(
  label: string,
  mode: 'valid' | 'refused' = 'valid',
): Promise<{
  readonly host: DmEncounterHost;
  readonly store: ProtocolFaultStore;
  readonly service: EncounterSessionService;
  readonly runtime: ProtocolRuntime;
  readonly seat: PlayerSeatRegistration;
  readonly pending: NonNullable<PlayerBoardProjection['pendingRequest']>;
  readonly events: SceneSnapshotEvent[];
  readonly request: Readonly<Record<string, unknown>>;
}> {
  const state = buildTwoRoomEncounter();
  const store = new ProtocolFaultStore();
  const host = new DmEncounterHost(`scene:protocol-outcome:${label}`, store, {
    initialState: state,
    initialControllers: state.combatants.map((combatant) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:protocol-outcome`,
      kind: 'human' as const,
      generation: 0,
    })),
    playerIds: state.combatants.map((combatant) => combatant.profile.id),
    turnLegalActions: protocolMoveActions(mode),
  });
  const seat = allSeat(host);
  const service = new EncounterSessionService(host, [seat]);
  const runtime = new ProtocolRuntime({
    service,
    principal: { role: 'player', playerId: seat.playerId },
    seats: [seat],
    art: twoRoomArtPackage(),
    tokenBindings: () => host.rendererTokenBindings(),
  });
  const events: SceneSnapshotEvent[] = [];
  runtime.subscribe((event) => events.push(event));
  await runtime.dispatch({
    v: 1, id: `open:${label}`, method: 'session.open',
    params: { requestedRole: 'player', playerId: seat.playerId },
  });
  const offer = waitForRealOffer(service, seat.playerId);
  void service.start();
  const pending = await offer;
  const move = pending.legalActions[0];
  if (move?.type !== 'move') throw new Error('Expected a real protocol move offer.');
  const destination = move.path.at(-1);
  const token = host.rendererTokenBindings().find((binding) => binding.combatantId === pending.actorId);
  if (destination === undefined || token === undefined) throw new Error('Incomplete real protocol move offer.');
  return {
    host,
    store,
    service,
    runtime,
    seat,
    pending,
    events,
    request: {
      v: 1,
      id: `mutation:${label}`,
      method: 'token.move',
      params: { tokenId: token.tokenId, to: { x: destination.column, y: destination.row, z: 0 } },
    },
  };
}

interface MutableProtocolPort extends ProtocolSessionPort {
  emitPlayer(playerId: string, event: PlayerSessionSnapshotEvent): void;
  doorCalls(): number;
  closeCalls(): number;
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
  let closes = 0;
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
    close: () => { closes += 1; },
    emitPlayer: (playerId, event) => {
      playerProjections.set(playerId, event.projection);
      for (const listener of playerListeners.get(playerId) ?? []) listener(event);
    },
    doorCalls: () => calls,
    closeCalls: () => closes,
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
    tokenBindings: () => tokenBindings,
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
    runtime.destroySession();
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
    playerA.destroySession();
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
    runtime.destroySession();
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
    runtime.destroySession();
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
    runtime.destroySession();
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
    runtime.destroySession();
    source.closeHost();
  });

  it('maps only durable mutations and autonomous changes to wire replacement snapshots', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    const events: SceneSnapshotEvent[] = [];
    runtime.subscribe((event) => events.push(event));
    await runtime.dispatch({
      v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    });
    for (const kind of ['status', 'offer', 'recovery'] as const) {
      port.emitPlayer(PLAYER_A, { kind, seq: 40, projection: source.playerA });
    }
    expect(events.map((event) => event.seq)).toEqual([1]);
    port.emitPlayer(PLAYER_A, { kind: 'mutation', seq: 41, projection: source.playerA });
    port.emitPlayer(PLAYER_A, { kind: 'autonomous', seq: 42, projection: source.playerA });
    expect(events.map((event) => event.seq)).toEqual([1, 2, 3]);
    runtime.destroySession();
    source.closeHost();
  });

  it('isolates throwing runtime event and fault observers from healthy observers and settlement', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    const events: number[] = [];
    const faults: string[] = [];
    runtime.subscribe(() => { throw new Error('throwing runtime event observer'); });
    runtime.subscribe((event) => events.push(event.seq));
    runtime.subscribeFaults(() => { throw new Error('throwing runtime fault observer'); });
    runtime.subscribeFaults((event) => faults.push(event.code));
    await expect(runtime.dispatch({
      v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    port.emitPlayer(PLAYER_A, { kind: 'autonomous', seq: 7, projection: source.playerA });
    await expect(runtime.dispatch('{')).resolves.toMatchObject({ kind: 'transport_fault' });
    expect(events).toEqual([1, 2]);
    expect(faults).toEqual(['INVALID_JSON']);
    runtime.destroySession();
    source.closeHost();
  });

  it('derives token identities for each captured projection after appearance, hiding, and removal', async () => {
    const source = projections();
    const port = mutablePort(source);
    let bindings = [...source.tokenBindings];
    const summonedId = combatantId('combatant:runtime-summon');
    const baseArt = twoRoomArtPackage();
    const summonedArt = baseArt.combatantTokens[TWO_ROOM_ADVENTURER_ID];
    if (summonedArt === undefined) throw new Error('Expected adventurer art for the runtime summon.');
    const art = {
      ...baseArt,
      combatantTokens: {
        ...baseArt.combatantTokens,
        [summonedId]: summonedArt,
      },
    };
    const runtime = new ProtocolRuntime({
      service: port,
      principal: { role: 'player', playerId: PLAYER_A },
      seats: SEATS,
      art,
      tokenBindings: () => bindings,
    });
    const events: SceneSnapshotEvent[] = [];
    runtime.subscribe((event) => events.push(event));
    await runtime.dispatch({
      v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    });
    const template = source.playerA.combatants.find((combatant) => 'position' in combatant);
    if (template === undefined) throw new Error('Expected a visible player token template.');
    const appeared: PlayerBoardProjection = {
      ...source.playerA,
      revision: source.playerA.revision + 1,
      combatants: [...source.playerA.combatants, {
        ...template,
        id: summonedId,
        name: 'Runtime Summon',
        position: { column: 3, row: 4 },
      }],
    };
    bindings = [...bindings, { combatantId: summonedId, tokenId: 'token:runtime-summon' }];
    port.emitPlayer(PLAYER_A, { kind: 'autonomous', seq: 1, projection: appeared });
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).toContain('token:runtime-summon');

    const hidden: PlayerBoardProjection = {
      ...appeared,
      revision: appeared.revision + 1,
      combatants: source.playerA.combatants,
    };
    port.emitPlayer(PLAYER_A, { kind: 'autonomous', seq: 2, projection: hidden });
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).not.toContain('token:runtime-summon');

    bindings = bindings.filter((binding) => binding.tokenId !== 'token:runtime-summon');
    const removed = { ...hidden, revision: hidden.revision + 1 };
    port.emitPlayer(PLAYER_A, { kind: 'autonomous', seq: 3, projection: removed });
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).not.toContain('token:runtime-summon');
    runtime.destroySession();
    source.closeHost();
  });

  it('shares the default ledger across seats and reconnections until explicit session destruction', async () => {
    const source = projections();
    const port = mutablePort(source);
    const first = runtimeFor(port, source.tokenBindings, { role: 'dm' });
    await first.dispatch({ v: 1, id: 'open:first', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(first.dispatch({
      v: 1, id: 'shared-id', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    first.dispose();
    expect(port.closeCalls()).toBe(0);

    const reconnected = runtimeFor(port, source.tokenBindings, { role: 'dm' });
    await reconnected.dispatch({ v: 1, id: 'open:second', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(reconnected.dispatch({
      v: 1, id: 'shared-id', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
    })).resolves.toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'DUPLICATE_MUTATION' } },
    });
    const player = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    await player.dispatch({
      v: 1, id: 'open:player', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    });
    await expect(player.dispatch({
      v: 1, id: 'shared-id', method: 'light.set', params: { lightId: 'torch', enabled: false },
    })).resolves.toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'DUPLICATE_MUTATION' } },
    });
    expect(port.doorCalls()).toBe(1);
    reconnected.destroySession();
    expect(port.closeCalls()).toBe(1);
    source.closeHost();
  });

  it('detaches after a refused open without destroying the authoritative session', async () => {
    const source = projections();
    const port = mutablePort(source);
    const refused = runtimeFor(port, source.tokenBindings, { role: 'player', playerId: PLAYER_A });
    await expect(refused.dispatch({
      v: 1, id: 'refused-open', method: 'session.open', params: { requestedRole: 'dm' },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: false, error: { code: 'UNAUTHORIZED' } } });
    refused.dispose();
    expect(port.closeCalls()).toBe(0);
    const dm = runtimeFor(port, source.tokenBindings, { role: 'dm' });
    await expect(dm.dispatch({
      v: 1, id: 'healthy-open', method: 'session.open', params: { requestedRole: 'dm' },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    dm.destroySession();
    expect(port.closeCalls()).toBe(1);
    source.closeHost();
  });

  it.each([
    ['committed', 'valid', null],
    ['refused', 'valid', 'STALE_OFFER'],
    ['cancelled', 'valid', 'CANCELLED'],
    ['closed', 'valid', 'CLOSED'],
    ['failed-pre', 'valid', 'FAILED'],
    ['failed-post', 'valid', 'FAILED'],
  ] as const)(
    'maps the real service %s terminal outcome once and permanently reserves its id',
    async (outcome, mode, errorCode) => {
      const setup = await realOutcomeRuntime(outcome, mode);
      expect(setup.events.map((event) => event.seq)).toEqual([1, 2]);
      expect(setup.events.map((event) => event.data.revision)).toEqual([0, 1]);
      if (outcome === 'failed-pre') setup.store.failNextAppend();
      if (outcome === 'failed-post') setup.store.failNextFlush();
      const abort = new AbortController();
      if (outcome === 'cancelled') abort.abort();
      let activeRuntime = setup.runtime;
      let request = setup.request;
      let observedEvents = setup.events;
      if (outcome === 'refused') {
        setup.runtime.dispose();
        const refusingPort = {
          sessionId: setup.service.sessionId,
          dmSnapshot: () => setup.service.dmSnapshot(),
          playerSnapshot: (playerId?: string) => setup.service.playerSnapshot(playerId),
          subscribeDm: (listener: Parameters<EncounterSessionService['subscribeDm']>[0]) =>
            setup.service.subscribeDm(listener),
          subscribePlayer: (
            playerId: string | undefined,
            listener: Parameters<EncounterSessionService['subscribePlayer']>[1],
          ) => setup.service.subscribePlayer(playerId, listener),
          submitOfferedAction: (input: Parameters<EncounterSessionService['submitOfferedAction']>[0]) => {
            setup.host.adjudicate({
              type: 'adjudicate',
              target: setup.pending.actorId,
              subject: 'protocol-real-refusal',
              reasoning: 'Invalidate after dispatcher feasibility but before real service acceptance.',
              consequence: { kind: 'no_effect' },
            });
            return setup.service.submitOfferedAction(input);
          },
          setDoor: (input: Parameters<EncounterSessionService['setDoor']>[0]) => setup.service.setDoor(input),
          close: () => setup.service.close(),
        } satisfies ProtocolSessionPort;
        activeRuntime = new ProtocolRuntime({
          service: refusingPort,
          principal: { role: 'player', playerId: setup.seat.playerId },
          seats: [setup.seat],
          art: twoRoomArtPackage(),
          tokenBindings: () => setup.host.rendererTokenBindings(),
        });
        observedEvents = [];
        activeRuntime.subscribe((event) => observedEvents.push(event));
        await activeRuntime.dispatch({
          v: 1, id: 'open:refused-reconnect', method: 'session.open',
          params: { requestedRole: 'player', playerId: setup.seat.playerId },
        });
      }
      if (outcome === 'closed') {
        setup.runtime.dispose();
        activeRuntime = new ProtocolRuntime({
          service: setup.service,
          principal: { role: 'dm' },
          seats: [setup.seat],
          art: twoRoomArtPackage(),
          tokenBindings: () => setup.host.rendererTokenBindings(),
        });
        observedEvents = [];
        activeRuntime.subscribe((event) => observedEvents.push(event));
        await activeRuntime.dispatch({
          v: 1, id: 'open:closed-dm', method: 'session.open', params: { requestedRole: 'dm' },
        });
        setup.service.close();
        request = {
          v: 1, id: 'mutation:closed', method: 'door.set',
          params: { doorId: 'object:two-room-door', open: true },
        };
      }
      const before = observedEvents.length;
      const first = activeRuntime.dispatch(
        request,
        outcome === 'cancelled' ? abort.signal : undefined,
      );
      const duplicate = activeRuntime.dispatch(request);
      const response = await first;
      expect(response).toMatchObject({
        kind: 'response',
        response: errorCode === null
          ? { id: `mutation:${outcome}`, ok: true }
          : { id: `mutation:${outcome}`, ok: false, error: { code: errorCode } },
      });
      await expect(duplicate).resolves.toMatchObject({
        kind: 'response',
        response: {
          id: `mutation:${outcome}`,
          ok: false,
          error: { code: 'DUPLICATE_MUTATION' },
        },
      });
      if (response.kind !== 'response') throw new Error('Expected a correlated terminal response.');
      if (outcome === 'committed') {
        if (!response.response.ok) throw new Error('Expected the committed response to succeed.');
        expect(observedEvents).toHaveLength(before + 1);
        expect(observedEvents.at(-1)?.data.revision).toBe(response.response.result.revision);
      } else {
        expect(observedEvents).toHaveLength(before);
      }
      activeRuntime.destroySession();
      setup.host.close();
    },
  );

  it('preserves the captured door revision before a reentrant status-only refresh advances the host', async () => {
    const setup = await realOutcomeRuntime('door-refresh');
    const dm = new ProtocolRuntime({
      service: setup.service,
      principal: { role: 'dm' },
      seats: [setup.seat],
      art: twoRoomArtPackage(),
      tokenBindings: () => setup.host.rendererTokenBindings(),
    });
    const events: SceneSnapshotEvent[] = [];
    dm.subscribe((event) => events.push(event));
    await dm.dispatch({ v: 1, id: 'open:door-refresh', method: 'session.open', params: { requestedRole: 'dm' } });
    let advancedRevision: number | null = null;
    const unsubscribe = setup.host.subscribeNotifications((notification) => {
      const fresh = notification.snapshot.dm.pendingRequest;
      if (
        notification.kind !== 'offer' ||
        fresh === null ||
        fresh.requestId === setup.pending.requestId ||
        advancedRevision !== null
      ) return;
      setup.host.adjudicate({
        type: 'adjudicate',
        target: fresh.actorId,
        subject: 'protocol-door-refresh-order',
        reasoning: 'Advance after the fresh offer without replacing the captured door receipt.',
        consequence: { kind: 'no_effect' },
      });
      advancedRevision = setup.host.snapshot().dm.encounter.revision;
    });
    const result = await dm.dispatch({
      v: 1,
      id: 'mutation:door-refresh',
      method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    expect(result).toMatchObject({
      kind: 'response', response: { ok: true, result: { revision: setup.pending.encounterRevision + 1 } },
    });
    expect(advancedRevision).toBe(setup.pending.encounterRevision + 2);
    expect(events.map((event) => event.data.revision)).toEqual([
      setup.pending.encounterRevision,
      setup.pending.encounterRevision + 1,
    ]);
    const snapshot = await dm.dispatch({
      v: 1, id: 'snapshot:captured-door', method: 'scene.snapshot', params: {},
    });
    expect(snapshot).toMatchObject({
      kind: 'response', response: { ok: true, result: { revision: setup.pending.encounterRevision + 2 } },
    });
    unsubscribe();
    dm.destroySession();
    setup.host.close();
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
    runtime.destroySession();
    source.closeHost();
  });

  it('rejects malformed protocol ids before dispatch and does not fabricate a response envelope', async () => {
    const source = projections();
    const runtime = runtimeFor(mutablePort(source), source.tokenBindings, { role: 'dm' });
    const result = await runtime.dispatch({ v: 1, id: 3, method: 'scene.snapshot', params: {} });
    expect(result.kind).toBe('transport_fault');
    expect('response' in result).toBe(false);
    runtime.destroySession();
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
      tokenBindings: () => source.tokenBindings,
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
    runtime.destroySession();
    source.closeHost();
  });
});
