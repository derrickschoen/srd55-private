import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it, vi } from 'vitest';
import { combatantId, type CombatantId } from '../../../src/combat/values';
import type {
  DmSessionSnapshotEvent,
  DoorSetOutcome,
  PlayerSessionSnapshotEvent,
  PlayerSubscriptionResult,
  SessionInvocationToken,
  SessionMutationOutcome,
} from '../../../src/vtt/encounter-session-service';
import {
  EncounterSessionService,
  type PlayerSeatRegistration,
} from '../../../src/vtt/encounter-session-service';
import type { LegalActionSummary } from '../../../src/combat/controllers';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { loadContentPack } from '../../../src/content/content-pack';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import {
  projectPlayerBoard,
  type DmBoardProjection,
  type PlayerBoardProjection,
} from '../../../src/vtt/encounter-projections';
import { projectPlayerView } from '../../../src/combat/visibility';
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
import {
  genericHandoffRequestSchema,
  HANDOFF_METHODS,
  handoffRequestSchema,
} from '../../../src/vtt/handoff/v1/contracts';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const PLAYER_A = 'player:adventurer';
const PLAYER_B = 'player:goblin';
const TOKEN_A = 'token:two-room-adventurer';
const TOKEN_B = 'token:two-room-goblin';

interface SummonPackSource {
  spells: Array<Record<string, unknown>>;
  monsters: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

function realEngineSummonStates(): {
  readonly casterId: CombatantId;
  readonly summonedId: CombatantId;
  readonly opening: EncounterState;
  readonly appeared: EncounterState;
  readonly hidden: EncounterState;
  readonly removed: EncounterState;
} {
  const source = JSON.parse(
    readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8'),
  ) as SummonPackSource;
  const template = source.spells[0];
  if (template === undefined) throw new Error('Summon fixture spell template is missing.');
  source.spells = [{
    ...template,
    recordId: 'call-brassleaf',
    name: 'Call Brassleaf',
    level: 2,
    range: { kind: 'feet', feet: 30 },
    duration: { kind: 'rounds', rounds: 10 },
    concentration: true,
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: {
      kind: 'summon', monsterId: 'brassleaf-mote',
      count: { kind: 'fixed', count: 1 },
      placementRangeFeet: 30,
      lifecycle: { concentration: true, durationRounds: 10, expiresAt: 'source_start' },
    },
  }];
  const loaded = loadContentPack(source);
  if (loaded.status !== 'loaded') throw new Error(`Summon pack refused: ${loaded.refusal.reason}`);
  const caster = playerProfile('handoff-summoner', {
    initiativeBonus: 20,
    spellSlots: [{ level: 2, maximum: 1 }],
  });
  const enemy = monsterProfile('handoff-summon-enemy', { initiativeBonus: -20, hitPoints: 30 });
  const opening = reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 12, rows: 8 },
    combatants: [caster, enemy],
    tokens: [placedToken(caster, 0), placedToken(enemy, 10)],
    contentPacks: [loaded.content],
  }), { type: 'roll_initiative' }, () => 0).state;
  const summonCommand: SpellCastCommand = {
    type: 'cast_spell', actor: caster.id, spellId: 'greenforge:call-brassleaf',
    slotLevel: 2, castAsRitual: false, casterLevel: 7, attackBonus: 7, saveDc: 15,
    spellcastingModifier: 4, targets: [], area: null,
    summonDestinations: [{ column: 6, row: 0 }], weaponAttack: null, selectedOption: null,
  };
  const appeared = reduceEncounter(opening, summonCommand, () => 0).state;
  const summonedId = appeared.effects.flatMap((effect) => effect.ownedCombatants ?? [])[0];
  if (summonedId === undefined) throw new Error('Expected an engine-created summon.');
  const hidden: EncounterState = {
    ...appeared,
    revision: appeared.revision + 1,
    hiddenCombatants: [{ combatant: summonedId, stealthTotal: 99, edition: '2024' }],
  };
  const removed = reduceEncounter(
    hidden,
    { type: 'end_concentration', actor: caster.id },
    () => 0,
  ).state;
  return { casterId: caster.id, summonedId, opening, appeared, hidden, removed };
}

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
  emitDm(event: Omit<DmSessionSnapshotEvent, 'tokenBindings'> & {
    readonly tokenBindings?: DmSessionSnapshotEvent['tokenBindings'];
  }): void;
  emitPlayer(playerId: string, event: Omit<PlayerSessionSnapshotEvent, 'tokenBindings'> & {
    readonly tokenBindings?: PlayerSessionSnapshotEvent['tokenBindings'];
  }): void;
  setTokenBindings(bindings: ReturnType<DmEncounterHost['rendererTokenBindings']>): void;
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
  readonly tokenBindings: ReturnType<DmEncounterHost['rendererTokenBindings']>;
}, sessionId = 'scene:protocol-test'): MutableProtocolPort {
  const playerProjections = new Map<string, PlayerBoardProjection>([
    [PLAYER_A, input.playerA],
    [PLAYER_B, input.playerB],
  ]);
  const dmListeners = new Set<(event: DmSessionSnapshotEvent) => void>();
  const playerListeners = new Map<string, Set<(event: PlayerSessionSnapshotEvent) => void>>();
  let calls = 0;
  let closes = 0;
  let tokenBindings = input.tokenBindings;
  return {
    sessionId,
    dmSnapshot: () => input.dm,
    dmCapture: () => ({ projection: input.dm, tokenBindings }),
    playerSnapshot: (playerId) => playerId === undefined ? null : playerProjections.get(playerId) ?? null,
    playerCapture: (playerId) => {
      const projection = playerId === undefined ? undefined : playerProjections.get(playerId);
      return projection === undefined ? null : { projection, tokenBindings };
    },
    subscribeDm: (listener) => {
      dmListeners.add(listener);
      listener({ kind: 'status', seq: 0, projection: input.dm, tokenBindings });
      return () => dmListeners.delete(listener);
    },
    subscribePlayer: (playerId, listener): PlayerSubscriptionResult => {
      const projection = playerId === undefined ? undefined : playerProjections.get(playerId);
      if (playerId === undefined || projection === undefined) return { kind: 'refused', code: 'UNAUTHORIZED' };
      const listeners = playerListeners.get(playerId) ?? new Set();
      listeners.add(listener);
      playerListeners.set(playerId, listeners);
      listener({ kind: 'status', seq: 0, projection, tokenBindings });
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
    emitDm: (event) => {
      for (const listener of dmListeners) {
        listener({ ...event, tokenBindings: event.tokenBindings ?? tokenBindings });
      }
    },
    emitPlayer: (playerId, event) => {
      playerProjections.set(playerId, event.projection);
      for (const listener of playerListeners.get(playerId) ?? []) {
        listener({ ...event, tokenBindings: event.tokenBindings ?? tokenBindings });
      }
    },
    setTokenBindings: (next) => { tokenBindings = next; },
    doorCalls: () => calls,
    closeCalls: () => closes,
  };
}

function receiptPort(
  input: ReturnType<typeof projections>,
  sessionId: string,
  barrierCount = 0,
): {
  readonly port: ProtocolSessionPort;
  readonly release: (index: number) => void;
} {
  const base = mutablePort(input, sessionId);
  const releases: Array<(() => void) | undefined> = [];
  const barriers = Array.from({ length: barrierCount }, (_, index) => new Promise<void>((resolve) => {
    releases[index] = resolve;
  }));
  let calls = 0;
  return {
    port: {
      ...base,
      setDoor: async (request): Promise<DoorSetOutcome> => {
        const call = calls;
        calls += 1;
        const barrier = barriers[call];
        if (barrier !== undefined) await barrier;
        const revision = input.dm.encounter.revision + call + 1;
        const event = {
          kind: 'mutation',
          seq: calls,
          projection: input.dm,
          tokenBindings: input.tokenBindings,
          ...(request.invocationToken === undefined
            ? {}
            : { terminalReceipt: { invocationToken: request.invocationToken, revision } }),
        } satisfies DmSessionSnapshotEvent;
        base.emitDm(event);
        return { kind: 'committed', revision, changed: true, event };
      },
    },
    release: (index) => releases[index]?.(),
  };
}

const SEATS = [
  { playerId: PLAYER_A, controlledTokenIds: [TOKEN_A] },
  { playerId: PLAYER_B, controlledTokenIds: [TOKEN_B] },
] as const;

function runtimeFor(
  port: ProtocolSessionPort,
  principal: { readonly role: 'dm' } | { readonly role: 'player'; readonly playerId: string },
): ProtocolRuntime {
  return new ProtocolRuntime({
    service: port,
    principal,
    seats: SEATS,
    art: twoRoomArtPackage(),
  });
}

describe('v1 protocol dispatcher', () => {
  it('requested role cannot grant DM authority', async () => {
    const source = projections();
    const port = mutablePort(source);
    const runtime = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
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
    const playerA = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
    const playerB = runtimeFor(port, { role: 'player', playerId: PLAYER_B });
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
    const runtime = runtimeFor(mutablePort(source), { role: 'dm' });
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

  it('accepts only privately minted single-use invocation tokens from the originating runtime', async () => {
    const source = projections();
    const firstPort = receiptPort(source, 'scene:private-invocation:first').port;
    const secondPort = receiptPort(source, 'scene:private-invocation:second').port;
    const first = runtimeFor(firstPort, { role: 'dm' });
    const second = runtimeFor(secondPort, { role: 'dm' });
    const firstReceipts: SessionInvocationToken[] = [];
    const secondReceipts: SessionInvocationToken[] = [];
    first.subscribe((_event, receipt) => {
      if (receipt !== undefined) firstReceipts.push(receipt.invocationToken);
    });
    second.subscribe((_event, receipt) => {
      if (receipt !== undefined) secondReceipts.push(receipt.invocationToken);
    });
    await first.dispatch({
      v: 1, id: 'open:first-private-invocation', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await second.dispatch({
      v: 1, id: 'open:second-private-invocation', method: 'session.open', params: { requestedRole: 'dm' },
    });

    const minted = first.createInvocationToken();
    const constructed = Object.freeze({ ...minted, invocation: Symbol('constructed-invocation') });
    await expect(first.dispatch({
      v: 1, id: 'door:constructed-invocation', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }, undefined, constructed)).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    expect(firstReceipts).toHaveLength(1);
    expect(firstReceipts[0]).not.toBe(constructed);
    expect(first.invocationTrackingCounts().minted).toBe(1);

    await expect(first.dispatch({
      v: 1, id: 'door:minted-invocation', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: false },
    }, undefined, minted)).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    expect(firstReceipts).toHaveLength(2);
    expect(firstReceipts[1]).toBe(minted);
    expect(first.invocationTrackingCounts().minted).toBe(0);

    const foreign = first.createInvocationToken();
    await expect(second.dispatch({
      v: 1, id: 'door:foreign-invocation', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }, undefined, foreign)).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    expect(secondReceipts).toHaveLength(1);
    expect(secondReceipts[0]).not.toBe(foreign);
    expect(first.invocationTrackingCounts().minted).toBe(1);
    expect(second.invocationTrackingCounts().minted).toBe(0);

    first.destroySession();
    second.destroySession();
    source.closeHost();
  });

  it('gives concurrent dispatches independent receipt eligibility when a minted token is reused', async () => {
    const source = projections();
    const controlled = receiptPort(source, 'scene:reused-invocation', 2);
    const runtime = runtimeFor(controlled.port, { role: 'dm' });
    const receipts: SessionInvocationToken[] = [];
    runtime.subscribe((_event, receipt) => {
      if (receipt !== undefined) receipts.push(receipt.invocationToken);
    });
    await runtime.dispatch({
      v: 1, id: 'open:reused-invocation', method: 'session.open', params: { requestedRole: 'dm' },
    });
    const reused = runtime.createInvocationToken();
    const first = runtime.dispatch({
      v: 1, id: 'door:reused-invocation:first', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }, undefined, reused);
    const second = runtime.dispatch({
      v: 1, id: 'door:reused-invocation:second', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: false },
    }, undefined, reused);
    expect(runtime.invocationTrackingCounts()).toEqual({ minted: 0, active: 2 });

    controlled.release(0);
    await expect(first).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    expect(receipts).toEqual([reused]);
    expect(runtime.invocationTrackingCounts().active).toBe(1);

    controlled.release(1);
    await expect(second).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    expect(receipts).toHaveLength(2);
    expect(receipts[1]).not.toBe(reused);
    expect(new Set(receipts).size).toBe(2);
    expect(runtime.invocationTrackingCounts().active).toBe(0);

    runtime.destroySession();
    source.closeHost();
  });

  it.each([
    ['close', 'id', 'door.set'],
    ['close', 'params', 'door.set'],
    ['close', 'id', 'scene.snapshot'],
    ['close', 'params', 'scene.snapshot'],
    ['dispose', 'id', 'door.set'],
    ['destroy', 'params', 'door.set'],
  ] as const)(
    'does not dispatch %s-triggered lifecycle closure from a %s getter for %s',
    async (lifecycle, accessor, method) => {
      const setup = await realOutcomeRuntime(`getter-${lifecycle}-${accessor}-${method}`);
      setup.runtime.dispose();
      const runtime = new ProtocolRuntime({
        service: setup.service,
        principal: { role: 'dm' },
        seats: [setup.seat],
        art: twoRoomArtPackage(),
      });
      await runtime.dispatch({
        v: 1, id: `open:getter-${lifecycle}-${accessor}-${method}`,
        method: 'session.open', params: { requestedRole: 'dm' },
      });
      const setDoor = vi.spyOn(setup.service, 'setDoor');
      const dmCapture = vi.spyOn(setup.service, 'dmCapture');
      const beforeRevision = setup.host.snapshot().dm.encounter.revision;
      const closeRuntime = () => {
        if (lifecycle === 'close') runtime.close();
        else if (lifecycle === 'dispose') runtime.dispose();
        else runtime.destroySession();
      };
      const request: Record<string, unknown> = { v: 1, method };
      if (accessor === 'id') {
        Object.defineProperty(request, 'id', {
          enumerable: true,
          get: () => {
            closeRuntime();
            return `getter:${lifecycle}:${method}`;
          },
        });
        request.params = method === 'door.set'
          ? { doorId: 'object:two-room-door', open: true }
          : {};
      } else {
        request.id = `getter:${lifecycle}:${method}`;
        Object.defineProperty(request, 'params', {
          enumerable: true,
          get: () => {
            closeRuntime();
            return method === 'door.set'
              ? { doorId: 'object:two-room-door', open: true }
              : {};
          },
        });
      }

      await expect(runtime.dispatch(request)).resolves.toEqual({
        kind: 'response',
        response: {
          v: 1,
          id: `getter:${lifecycle}:${method}`,
          ok: false,
          error: { code: 'CLOSED', message: 'The logical transport is closed.' },
        },
      });
      expect(setDoor).not.toHaveBeenCalled();
      expect(dmCapture).not.toHaveBeenCalled();
      expect(setup.host.snapshot().dm.encounter.revision).toBe(beforeRevision);
      expect(runtime.invocationTrackingCounts()).toEqual({ minted: 0, active: 0 });
      runtime.destroySession();
      setup.host.close();
    },
  );

  it('keeps object-transport validation equivalent to the authoritative v1 Zod contracts', async () => {
    class RequestInstance {
      readonly v = 1;
      readonly id = 'class-root';
      readonly method = 'scene.snapshot';
      readonly params = {};
    }
    class ParamsInstance {}
    class PointInstance {
      readonly x = 0;
      readonly y = 0;
      readonly z = 0;
    }
    const symbolRequest = {
      v: 1, id: 'symbol-root', method: 'scene.snapshot', params: {},
      [Symbol('ignored-root')]: true,
    };
    const symbolParams = {
      v: 1, id: 'symbol-params', method: 'scene.snapshot',
      params: { [Symbol('ignored-param')]: true },
    };
    const accessorParams = { v: 1, id: 'accessor', method: 'scene.snapshot' };
    Object.defineProperty(accessorParams, 'params', { enumerable: true, get: () => ({}) });
    const throwingAccessor = { v: 1, id: 'throwing-accessor', method: 'scene.snapshot' };
    Object.defineProperty(throwingAccessor, 'params', {
      enumerable: true,
      get: () => { throw new Error('injected request accessor failure'); },
    });
    const nullPrototypeParams: unknown = Object.create(null);
    const customPrototypeParams: unknown = Object.create({ inherited: true });
    const customPrototypeRoot: unknown = Object.assign(Object.create({ inherited: true }), {
      v: 1, id: 'custom-root', method: 'scene.snapshot', params: {},
    });
    const symbolPoint = { x: 0, y: 0, z: 0, [Symbol('ignored-point')]: true };
    const protoPoint = { x: 0, y: 0, z: 0 };
    Object.defineProperty(protoPoint, '__proto__', {
      enumerable: true,
      value: { polluted: true },
    });
    const corpus: readonly { readonly label: string; readonly value: unknown }[] = [
      { label: 'open-positive', value: { v: 1, id: 'positive-open', method: 'session.open', params: { requestedRole: 'dm' } } },
      { label: 'snapshot-positive', value: { v: 1, id: 'positive-snapshot', method: 'scene.snapshot', params: {} } },
      { label: 'wrong-v-number', value: { v: 2, id: 'wrong-v-number', method: 'scene.snapshot', params: {} } },
      { label: 'wrong-v-string', value: { v: '1', id: 'wrong-v-string', method: 'scene.snapshot', params: {} } },
      { label: 'missing-v', value: { id: 'missing-v', method: 'scene.snapshot', params: {} } },
      { label: 'move-positive', value: { v: 1, id: 'positive-move', method: 'token.move', params: { tokenId: '', to: { x: -1, y: 0.5, z: 0 } } } },
      { label: 'door-positive', value: { v: 1, id: 'positive-door', method: 'door.set', params: { doorId: '', open: false } } },
      { label: 'light-positive', value: { v: 1, id: 'positive-light', method: 'light.set', params: { lightId: '', enabled: true } } },
      { label: 'open-negative', value: { v: 1, id: 'negative-open', method: 'session.open', params: { requestedRole: 'dm', extra: true } } },
      { label: 'snapshot-negative', value: { v: 1, id: 'negative-snapshot', method: 'scene.snapshot', params: { sceneId: '' } } },
      { label: 'move-negative', value: { v: 1, id: 'negative-move', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0 }, revision: 0 } } },
      { label: 'door-negative', value: { v: 1, id: 'negative-door', method: 'door.set', params: { doorId: '' } } },
      { label: 'light-negative', value: { v: 1, id: 'negative-light', method: 'light.set', params: { lightId: '', enabled: true, sceneId: '' } } },
      { label: 'generic-extension', value: { v: 1, id: 'generic', method: 'extension.future', params: { future: true } } },
      { label: 'date-params', value: { v: 1, id: 'date', method: 'scene.snapshot', params: new Date(0) } },
      { label: 'map-params', value: { v: 1, id: 'map', method: 'scene.snapshot', params: new Map() } },
      { label: 'class-root', value: new RequestInstance() },
      { label: 'class-params', value: { v: 1, id: 'class-params', method: 'scene.snapshot', params: new ParamsInstance() } },
      { label: 'custom-root-prototype', value: customPrototypeRoot },
      { label: 'custom-params-prototype', value: { v: 1, id: 'custom-params', method: 'scene.snapshot', params: customPrototypeParams } },
      { label: 'null-params-prototype', value: { v: 1, id: 'null-params', method: 'scene.snapshot', params: nullPrototypeParams } },
      { label: 'symbol-root', value: symbolRequest },
      { label: 'symbol-params', value: symbolParams },
      { label: 'accessor', value: accessorParams },
      { label: 'throwing-accessor', value: throwingAccessor },
      { label: 'array-as-record', value: { v: 1, id: 'array-record', method: 'scene.snapshot', params: [] } },
      { label: 'class-point', value: { v: 1, id: 'class-point', method: 'token.move', params: { tokenId: '', to: new PointInstance() } } },
      { label: 'symbol-point', value: { v: 1, id: 'symbol-point', method: 'token.move', params: { tokenId: '', to: symbolPoint } } },
      { label: 'nan-point', value: { v: 1, id: 'nan-point', method: 'token.move', params: { tokenId: '', to: { x: Number.NaN, y: 0, z: 0 } } } },
      { label: 'infinity-point', value: { v: 1, id: 'infinity-point', method: 'token.move', params: { tokenId: '', to: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 } } } },
      { label: 'negative-zero-point', value: { v: 1, id: 'negative-zero-point', method: 'token.move', params: { tokenId: '', to: { x: -0, y: -0, z: -0 } } } },
      { label: 'nested-extra-key', value: { v: 1, id: 'nested-extra', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0, extra: true } } } },
      { label: 'own-proto-key', value: { v: 1, id: 'own-proto', method: 'token.move', params: { tokenId: '', to: protoPoint } } },
    ];
    const expected = new Map<string, 'accepted' | 'rejected' | 'throws'>([
      ['open-positive', 'accepted'], ['snapshot-positive', 'accepted'], ['move-positive', 'accepted'],
      ['wrong-v-number', 'rejected'], ['wrong-v-string', 'rejected'], ['missing-v', 'rejected'],
      ['door-positive', 'accepted'], ['light-positive', 'accepted'], ['open-negative', 'rejected'],
      ['snapshot-negative', 'rejected'], ['move-negative', 'rejected'], ['door-negative', 'rejected'],
      ['light-negative', 'rejected'], ['generic-extension', 'accepted'], ['date-params', 'rejected'],
      ['map-params', 'rejected'], ['class-root', 'accepted'], ['class-params', 'rejected'],
      ['custom-root-prototype', 'rejected'], ['custom-params-prototype', 'rejected'],
      ['null-params-prototype', 'accepted'], ['symbol-root', 'accepted'], ['symbol-params', 'rejected'],
      ['accessor', 'accepted'], ['throwing-accessor', 'throws'], ['array-as-record', 'rejected'],
      ['class-point', 'accepted'], ['symbol-point', 'accepted'], ['nan-point', 'rejected'],
      ['infinity-point', 'rejected'], ['negative-zero-point', 'accepted'], ['nested-extra-key', 'rejected'],
      ['own-proto-key', 'accepted'],
    ]);
    const knownMethods = new Set<string>(HANDOFF_METHODS);
    const schemaDisposition = (value: unknown): 'accepted' | 'rejected' | 'throws' => {
      try {
        const generic = genericHandoffRequestSchema.safeParse(value);
        if (!generic.success) return 'rejected';
        if (!knownMethods.has(generic.data.method)) return 'accepted';
        return handoffRequestSchema.safeParse(value).success ? 'accepted' : 'rejected';
      } catch {
        return 'throws';
      }
    };
    const source = projections();
    const runtime = runtimeFor(mutablePort(source), { role: 'dm' });
    const runtimeDisposition = (value: unknown): Promise<'accepted' | 'rejected' | 'throws' | 'promise-rejected'> => {
      let dispatched: ReturnType<ProtocolRuntime['dispatch']>;
      try {
        dispatched = runtime.dispatch(value);
      } catch {
        return Promise.resolve('throws');
      }
      return dispatched.then((result) => {
        if (result.kind === 'transport_fault') return 'rejected';
        return !result.response.ok && result.response.error.code === 'INVALID_REQUEST' ? 'rejected' : 'accepted';
      }, () => 'promise-rejected');
    };
    for (const entry of corpus) {
      const contractDisposition = schemaDisposition(entry.value);
      expect(contractDisposition, `${entry.label}:schema`).toBe(expected.get(entry.label));
      expect(await runtimeDisposition(entry.value), `${entry.label}:protocol`).toBe(contractDisposition);
    }
    expect(schemaDisposition(corpus.find((entry) => entry.label === 'date-params')?.value)).toBe('rejected');
    runtime.destroySession();
    source.closeHost();
  });

  it('keeps a legitimate empty-id request correlated beside malformed transport faults', async () => {
    const source = projections();
    const runtime = runtimeFor(mutablePort(source), { role: 'dm' });
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
    const runtime = runtimeFor(port, { role: 'dm' });
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
    const runtime = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
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
    const runtime = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
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
    const runtime = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
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
    const summonedId = combatantId('combatant:runtime-summon');
    const runtime = new ProtocolRuntime({
      service: port,
      principal: { role: 'player', playerId: PLAYER_A },
      seats: SEATS,
      art: twoRoomArtPackage(),
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
    const capturedBindings = [
      ...source.tokenBindings,
      { combatantId: summonedId, tokenId: 'token:runtime-summon' },
    ];
    const capturedAppearance = {
      kind: 'autonomous' as const,
      seq: 1,
      projection: appeared,
      tokenBindings: capturedBindings,
    };
    port.setTokenBindings(source.tokenBindings);
    port.emitPlayer(PLAYER_A, capturedAppearance);
    expect(events.at(-1)?.data.tokens).toContainEqual(expect.objectContaining({
      id: 'token:runtime-summon', assetId: 'token.adventurer',
    }));

    const hidden: PlayerBoardProjection = {
      ...appeared,
      revision: appeared.revision + 1,
      combatants: source.playerA.combatants,
    };
    port.emitPlayer(PLAYER_A, {
      kind: 'autonomous', seq: 2, projection: hidden, tokenBindings: source.tokenBindings,
    });
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).not.toContain('token:runtime-summon');

    const removed = { ...hidden, revision: hidden.revision + 1 };
    port.emitPlayer(PLAYER_A, {
      kind: 'autonomous', seq: 3, projection: removed, tokenBindings: source.tokenBindings,
    });
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).not.toContain('token:runtime-summon');
    runtime.destroySession();
    source.closeHost();
  });

  it('renders a real engine-created token absent from the opening art, then drops hiding and removal replacements', async () => {
    const states = realEngineSummonStates();
    const seat = {
      seatId: 'seat:real-summon',
      combatantId: states.casterId,
      ownedCombatantIds: [states.casterId],
    } as const;
    const project = (state: EncounterState): PlayerBoardProjection => projectPlayerBoard(
      projectPlayerView(state, seat),
      {
        requestSequence: 1,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: null,
      },
    );
    const bindings = (state: EncounterState) => state.tokens.map((token) => ({
      tokenId: String(token.id),
      combatantId: token.combatantId,
    }));
    const source = projections();
    const openingPlayer = project(states.opening);
    const port = mutablePort({
      dm: source.dm,
      playerA: openingPlayer,
      playerB: openingPlayer,
      tokenBindings: bindings(states.opening),
    });
    const art = twoRoomArtPackage();
    expect(art.combatantTokens[states.summonedId]).toBeUndefined();
    const runtime = new ProtocolRuntime({
      service: port,
      principal: { role: 'player', playerId: PLAYER_A },
      seats: SEATS,
      art,
    });
    const events: SceneSnapshotEvent[] = [];
    runtime.subscribe((event) => events.push(event));
    await runtime.dispatch({
      v: 1, id: 'open:real-summon', method: 'session.open',
      params: { requestedRole: 'player', playerId: PLAYER_A },
    });

    port.emitPlayer(PLAYER_A, {
      kind: 'autonomous', seq: 1,
      projection: project(states.appeared),
      tokenBindings: bindings(states.appeared),
    });
    const summonedToken = bindings(states.appeared)
      .find((binding) => binding.combatantId === states.summonedId)?.tokenId;
    if (summonedToken === undefined) throw new Error('Expected a renderer identity for the engine-created summon.');
    expect(events.at(-1)?.data.tokens).toContainEqual(expect.objectContaining({
      id: summonedToken,
      assetId: 'token.adventurer',
      x: 6,
      y: 0,
    }));

    port.emitPlayer(PLAYER_A, {
      kind: 'autonomous', seq: 2,
      projection: project(states.hidden),
      tokenBindings: bindings(states.hidden),
    });
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).not.toContain(summonedToken);

    port.emitPlayer(PLAYER_A, {
      kind: 'autonomous', seq: 3,
      projection: project(states.removed),
      tokenBindings: bindings(states.removed),
    });
    expect(bindings(states.removed).map((binding) => binding.tokenId)).not.toContain(summonedToken);
    expect(events.at(-1)?.data.tokens.map((token) => token.id)).not.toContain(summonedToken);

    runtime.destroySession();
    source.closeHost();
  });

  it('shares the default ledger across seats and reconnections until explicit session destruction', async () => {
    const source = projections();
    const port = mutablePort(source);
    const first = runtimeFor(port, { role: 'dm' });
    await first.dispatch({ v: 1, id: 'open:first', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(first.dispatch({
      v: 1, id: 'shared-id', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: true } });
    first.dispose();
    expect(port.closeCalls()).toBe(0);

    const reconnected = runtimeFor(port, { role: 'dm' });
    await reconnected.dispatch({ v: 1, id: 'open:second', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(reconnected.dispatch({
      v: 1, id: 'shared-id', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
    })).resolves.toMatchObject({
      kind: 'response', response: { ok: false, error: { code: 'DUPLICATE_MUTATION' } },
    });
    const player = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
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
    const refused = runtimeFor(port, { role: 'player', playerId: PLAYER_A });
    await expect(refused.dispatch({
      v: 1, id: 'refused-open', method: 'session.open', params: { requestedRole: 'dm' },
    })).resolves.toMatchObject({ kind: 'response', response: { ok: false, error: { code: 'UNAUTHORIZED' } } });
    refused.dispose();
    expect(port.closeCalls()).toBe(0);
    const dm = runtimeFor(port, { role: 'dm' });
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
          dmCapture: () => setup.service.dmCapture(),
          playerSnapshot: (playerId?: string) => setup.service.playerSnapshot(playerId),
          playerCapture: (playerId?: string) => setup.service.playerCapture(playerId),
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
    const runtime = runtimeFor(port, { role: 'dm' });
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
    const runtime = runtimeFor(mutablePort(source), { role: 'dm' });
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
