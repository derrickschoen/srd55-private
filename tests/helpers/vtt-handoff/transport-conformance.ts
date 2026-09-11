import { expect } from 'vitest';
import { ProtocolRuntime, type HandoffResponse, type ProtocolSessionPort, type SceneSnapshotEvent } from '../../../src/vtt/handoff/protocol-runtime';
import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport } from '../../../src/vtt/handoff/scene-transport';
import { TWO_ROOM_CLOCK, TWO_ROOM_SEED } from '../../../src/vtt/handoff/fixtures/two-room';
import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
import { createDefaultNodeRuntimeSession, type NodeRuntimeSession } from '../../../tools/vtt-handoff/node-runtime';
import type { HandoffPrincipal } from '../../../src/vtt/handoff/session-authorizer';
import type { PlayerSessionSnapshotEvent, SessionMutationOutcome } from '../../../src/vtt/encounter-session-service';
import {
  TRANSPORT_CONFORMANCE_SCENARIO_NAMES, type TransportConformanceScenarioName,
} from './transport-conformance-manifest';

export { TRANSPORT_CONFORMANCE_SCENARIO_NAMES } from './transport-conformance-manifest';
export type { TransportConformanceScenarioName } from './transport-conformance-manifest';

export const TWO_ROOM_MOVING_PLAYER = 'combatant:two-room-goblin';

export interface TransportConformanceScenario {
  readonly name: TransportConformanceScenarioName;
  run(exercise: () => void | Promise<void>): Promise<void>;
}

export const TRANSPORT_CONFORMANCE_SCENARIOS: readonly TransportConformanceScenario[] =
  TRANSPORT_CONFORMANCE_SCENARIO_NAMES.map((name) => ({
    name,
    run: async (exercise): Promise<void> => { await exercise(); },
  }));

export async function executeTransportConformanceScenario(
  name: TransportConformanceScenarioName,
  exercise: () => void | Promise<void>,
): Promise<void> {
  const scenario = TRANSPORT_CONFORMANCE_SCENARIOS.find((candidate) => candidate.name === name);
  if (scenario === undefined) throw new Error(`Unknown transport conformance scenario: ${name}`);
  await scenario.run(exercise);
}

export interface ConformanceResult {
  readonly seed: number;
  readonly clock: string;
  readonly outcomes: Readonly<Record<string, string>>;
  readonly canonical: readonly HandoffResponse[];
}

export function createInProcessConformanceTransport(
  principal: HandoffPrincipal = { role: 'dm' },
  forcedPlayerOutcome?: Exclude<SessionMutationOutcome, { readonly kind: 'committed' }>,
): {
  readonly transport: InProcessSceneTransport;
  readonly start: () => Promise<void>;
  readonly reducerExecutions: () => number;
} {
  const counted = createCountedConformanceSession(principal, forcedPlayerOutcome);
  const session = counted.session;
  return {
    transport: new InProcessSceneTransport(new ProtocolRuntime({
      service: session.service,
      principal,
      seats: session.seats,
      art: session.art,
    })),
    start: session.start ?? (() => Promise.resolve()),
    reducerExecutions: counted.reducerExecutions,
  };
}

export async function runTerminalOutcomeConformance(
  transport: SceneTransport,
  start: () => Promise<void>,
): Promise<'committed' | 'refused' | 'cancelled' | 'closed' | 'failed'> {
  const events: SceneSnapshotEvent[] = [];
  transport.subscribe((event) => events.push(event));
  await expect(transport.request({
    v: 1, id: 'terminal:open', method: 'session.open',
    params: { requestedRole: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
  })).resolves.toMatchObject({ id: 'terminal:open', ok: true });
  await transport.initialSnapshot();
  void start();
  if (!events.some((event) => event.data.revision >= 2)) {
    await new Promise<void>((resolveReady, reject) => {
      const deadline = setTimeout(() => { stop(); reject(new Error('Timed out waiting for terminal-outcome offer.')); }, 2_000);
      const stop = transport.subscribe((event) => {
        if (event.data.revision < 2) return;
        clearTimeout(deadline);
        stop();
        resolveReady();
      });
    });
  }
  const response = await transport.request({
    v: 1, id: 'terminal:move', method: 'token.move',
    params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
  });
  transport.dispose();
  if (response.ok) return 'committed';
  switch (response.error.code) {
    case 'ENGINE_REFUSED': return 'refused';
    case 'CANCELLED': return 'cancelled';
    case 'CLOSED': return 'closed';
    case 'FAILED': return 'failed';
    default: throw new Error(`Unexpected terminal response code ${response.error.code}.`);
  }
}

export function createVisibilityConformanceSession(principal: HandoffPrincipal): {
  readonly session: NodeRuntimeSession;
  readonly hideVisibleEntities: () => void;
} {
  const base = createDefaultNodeRuntimeSession(principal);
  let playerListener: ((event: PlayerSessionSnapshotEvent) => void) | null = null;
  const service: ProtocolSessionPort = {
    sessionId: base.service.sessionId,
    dmSnapshot: () => base.service.dmSnapshot(),
    dmCapture: () => base.service.dmCapture(),
    playerSnapshot: (playerId) => base.service.playerSnapshot(playerId),
    playerCapture: (playerId) => base.service.playerCapture(playerId),
    subscribeDm: (listener) => base.service.subscribeDm(listener),
    subscribePlayer: (playerId, listener) => {
      playerListener = listener;
      return base.service.subscribePlayer(playerId, listener);
    },
    submitOfferedAction: (input) => base.service.submitOfferedAction(input),
    setDoor: (input) => base.service.setDoor(input),
    close: () => base.service.close(),
  };
  return {
    session: { service, seats: base.seats, art: base.art },
    hideVisibleEntities: () => {
      const capture = base.service.playerCapture(
        principal.role === 'player' ? principal.playerId : undefined,
      );
      if (capture === null || playerListener === null) throw new Error('Player visibility subscription is unavailable.');
      playerListener({
        kind: 'autonomous', seq: Number.MAX_SAFE_INTEGER,
        projection: {
          ...capture.projection,
          revision: capture.projection.revision + 1,
          combatants: [],
          lastSeen: [],
        },
        tokenBindings: capture.tokenBindings,
      });
    },
  };
}

export function createVisibilityInProcessTransport(principal: HandoffPrincipal): {
  readonly transport: InProcessSceneTransport;
  readonly hideVisibleEntities: () => void;
} {
  const controlled = createVisibilityConformanceSession(principal);
  return {
    transport: new InProcessSceneTransport(new ProtocolRuntime({
      service: controlled.session.service,
      principal,
      seats: controlled.session.seats,
      art: controlled.session.art,
    })),
    hideVisibleEntities: controlled.hideVisibleEntities,
  };
}

export async function runVisibilityRemovalConformance(
  transport: SceneTransport,
  hideVisibleEntities: () => void,
): Promise<void> {
  const events: SceneSnapshotEvent[] = [];
  transport.subscribe((event) => events.push(event));
  await transport.request({
    v: 1, id: 'visibility:open', method: 'session.open',
    params: { requestedRole: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
  });
  const initial = await transport.initialSnapshot();
  const initiallyVisible = initial.tokens.map((token) => token.id);
  expect(initiallyVisible.length).toBeGreaterThan(0);
  const removal = new Promise<SceneSnapshotEvent>((resolveRemoval, reject) => {
    const deadline = setTimeout(() => { stop(); reject(new Error('Timed out waiting for hidden-entity removal.')); }, 1_000);
    const stop = transport.subscribe((event) => {
      if (event.data.tokens.length >= initiallyVisible.length) return;
      clearTimeout(deadline);
      stop();
      resolveRemoval(event);
    });
  });
  hideVisibleEntities();
  const hidden = await removal;
  expect(hidden.data.tokens).toEqual([]);
  expect(hidden.data.tokens.map((token) => token.id)).not.toEqual(initiallyVisible);
  expect(events.at(-1)?.seq).toBe(hidden.seq);
  transport.dispose();
}

export function createCountedConformanceSession(
  principal: HandoffPrincipal,
  forcedPlayerOutcome?: Exclude<SessionMutationOutcome, { readonly kind: 'committed' }>,
): {
  readonly session: NodeRuntimeSession;
  readonly reducerExecutions: () => number;
} {
  const base = createDefaultNodeRuntimeSession(principal);
  let reducerExecutions = 0;
  const service: ProtocolSessionPort = {
    sessionId: base.service.sessionId,
    dmSnapshot: () => base.service.dmSnapshot(),
    dmCapture: () => base.service.dmCapture(),
    playerSnapshot: (playerId) => base.service.playerSnapshot(playerId),
    playerCapture: (playerId) => base.service.playerCapture(playerId),
    subscribeDm: (listener) => base.service.subscribeDm(listener),
    subscribePlayer: (playerId, listener) => base.service.subscribePlayer(playerId, listener),
    submitOfferedAction: (input) => forcedPlayerOutcome === undefined
      ? base.service.submitOfferedAction(input)
      : Promise.resolve(forcedPlayerOutcome),
    setDoor: (input) => {
      reducerExecutions += 1;
      return base.service.setDoor(input);
    },
    close: () => base.service.close(),
  };
  return {
    session: {
      service, seats: base.seats, art: base.art,
      ...(base.start === undefined ? {} : { start: base.start }),
    },
    reducerExecutions: () => reducerExecutions,
  };
}

export async function runPlayerMovementConformance(
  transport: SceneTransport,
  start: () => Promise<void>,
): Promise<void> {
  await executeTransportConformanceScenario('token move result and snapshot', async () => {
  const events: SceneSnapshotEvent[] = [];
  transport.subscribe((event) => events.push(event));
  await expect(transport.request({
    v: 1, id: 'player:open', method: 'session.open',
    params: { requestedRole: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
  })).resolves.toMatchObject({ id: 'player:open', ok: true });
  const initial = await transport.initialSnapshot();
  expect(initial.tokens.find((token) => token.id === 'token:two-room-goblin')).toMatchObject({ x: 8, y: 4, z: 0 });
  void start();
  if (!events.some((event) => event.data.revision >= 2)) {
    await new Promise<void>((resolveReady, reject) => {
      const deadline = setTimeout(() => { stop(); reject(new Error('Timed out waiting for the player offer.')); }, 2_000);
      const stop = transport.subscribe((event) => {
        if (event.data.revision < 2) return;
        clearTimeout(deadline);
        stop();
        resolveReady();
      });
    });
  }
  const before = events.length;
  const moved = await transport.request({
    v: 1, id: 'player:move', method: 'token.move',
    params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
  });
  expect(moved).toMatchObject({ id: 'player:move', ok: true });
  expect(events.length).toBe(before + 1);
  expect(events.at(-1)?.data.tokens.find((token) => token.id === 'token:two-room-goblin'))
    .toMatchObject({ x: 7, y: 4, z: 0 });
  expect(events.at(-1)?.data.tokens.find((token) => token.id === 'token:two-room-adventurer'))
    .not.toMatchObject({ x: 7, y: 4, z: 0 });
  transport.dispose();
  });
}

export async function runPlayerMismatchConformance(transport: SceneTransport): Promise<void> {
  await executeTransportConformanceScenario('authoritative role mismatch', async () => {
  const response = await transport.request({
    v: 1, id: 'player:mismatch', method: 'session.open',
    params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
  });
  expect(response).toMatchObject({ id: 'player:mismatch', ok: false, error: { code: 'UNAUTHORIZED' } });
  expect(response.ok).toBe(false);
  transport.dispose();
  });
}

export async function runDmTransportConformance(
  transport: SceneTransport,
  reducerExecutions: () => number,
): Promise<ConformanceResult> {
  const events: SceneSnapshotEvent[] = [];
  const unsubscribe = transport.subscribe((event) => events.push(event));
  const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
  expect(open).toMatchObject({ v: 1, id: '', ok: true });
  const initial = await transport.initialSnapshot();
  expect(initial.revision).toBe(0);
  expect(initial.tokens.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual([
    { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
    { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
  ]);
  expect(events[0]).toMatchObject({ seq: 1, data: { revision: 0 } });
  if (!events.some((event) => event.data.revision > 0)) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { stop(); reject(new Error('Timed out waiting for the fixed autonomous offer.')); }, 2_000);
      const stop = transport.subscribe((event) => {
        if (event.data.revision === 0) return;
        clearTimeout(timeout);
        stop();
        resolve();
      });
    });
  }
  let readyRevision = -1;
  for (let attempt = 0; attempt < 10 && readyRevision < 2; attempt += 1) {
    const ready = await transport.request({
      v: 1, id: `readiness:${String(attempt)}`, method: 'scene.snapshot', params: {},
    });
    readyRevision = ready.ok && typeof ready.result.revision === 'number' ? ready.result.revision : -1;
  }
  expect(readyRevision).toBe(2);

  const correlated = await Promise.all([
    transport.request({ v: 1, id: 'snapshot:a', method: 'scene.snapshot', params: {} }),
    transport.request({ v: 1, id: 'snapshot:b', method: 'scene.snapshot', params: {} }),
  ]);
  expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
  expect(correlated.every((response) => response.ok)).toBe(true);
  const invalid = await transport.request({ v: 1, id: 'invalid', method: 'door.set', params: { doorId: 42, open: true } });
  expect(invalid).toMatchObject({ id: 'invalid', ok: false, error: { code: 'INVALID_REQUEST' } });
  const unsupported = await transport.request({
    v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
  });
  expect(unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });

  const beforeDoorEvents = events.length;
  const beforeDoorExecutions = reducerExecutions();
  const door = await transport.request({
    v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
  });
  expect(door).toMatchObject({ id: 'door', ok: true });
  if (!door.ok || typeof door.result.revision !== 'number') throw new Error('Expected an acknowledged door revision.');
  const committedRevision = door.result.revision;
  expect(reducerExecutions()).toBe(beforeDoorExecutions + 1);
  expect(events.some((event) => event.data.revision === committedRevision)).toBe(true);
  expect(events.map((event) => event.seq)).toEqual(events.map((_event, index) => index + 1));
  expect(events.at(-1)?.data.doors.find((candidate) => candidate.id === 'object:two-room-door')?.open).toBe(true);

  const lateEvents: SceneSnapshotEvent[] = [];
  const stopLate = transport.subscribe((event) => lateEvents.push(event));
  stopLate();
  expect(lateEvents).toHaveLength(1);
  expect(lateEvents[0]?.seq).toBe(events.at(-1)?.seq);
  expect(lateEvents[0]?.data.revision).toBe(committedRevision);
  const sameState = await transport.request({
    v: 1, id: 'door:no-op', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
  });
  expect(sameState).toMatchObject({ id: 'door:no-op', ok: true, result: { revision: committedRevision } });
  expect(events.length).toBe(beforeDoorEvents + 1);

  const beforeDuplicateExecutions = reducerExecutions();
  const duplicate = await transport.request({
    v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
  });
  expect(duplicate).toMatchObject({ id: 'door', ok: false });
  if (duplicate.ok) throw new Error('A duplicate wire mutation id was accepted.');
  expect(['DUPLICATE_MUTATION', 'DUPLICATE_REQUEST_ID']).toContain(duplicate.error.code);
  expect(events.length).toBe(beforeDoorEvents + 1);
  expect(reducerExecutions()).toBe(beforeDuplicateExecutions);

  unsubscribe();
  const malformed = transport.request('{');
  await expect(malformed).rejects.toSatisfy((error: unknown) =>
    error instanceof SceneTransportFaultError || error instanceof SceneTransportClosedError);
  transport.dispose();
  expect(['closed', 'disposed']).toContain(transport.status());
  const result = {
    seed: TWO_ROOM_SEED,
    clock: TWO_ROOM_CLOCK,
    outcomes: {
      open: 'ok', correlation: 'ok', structuralValidation: 'INVALID_REQUEST',
      doorChange: 'committed', doorNoOp: 'committed', light: 'UNSUPPORTED',
      duplicate: duplicate.error.code, malformed: 'typed-fault', cleanup: 'terminal',
    },
    canonical: [open, ...correlated, invalid, unsupported, door, sameState],
  };
  await executeTransportConformanceScenario('correlation ids', () => {
    expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
    expect(new Set(correlated.map((response) => response.id)).size).toBe(2);
  });
  await executeTransportConformanceScenario('lawful structural values', () => {
    const anchors = initial.tokens.map((token) => ({
      column: token.x - (token.footprint.w - 1) / 2,
      row: token.y - (token.footprint.h - 1) / 2,
      z: token.z,
    }));
    expect(anchors).toEqual([
      { column: 2, row: 4, z: 0 },
      { column: 8, row: 4, z: 0 },
    ]);
    expect(Number.isInteger(initial.tokens[0]?.x ?? 0)).toBe(true);
    expect(Number.isInteger((initial.tokens[0]?.x ?? 0) + 0.25)).toBe(false);
  });
  await executeTransportConformanceScenario('structural validation failures', () => {
    expect(invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(invalid.ok).not.toBe(true);
  });
  await executeTransportConformanceScenario('initial snapshot', () => {
    expect(events[0]).toMatchObject({ seq: 1, data: { revision: 0 } });
    expect(events[0]?.seq).not.toBe(0);
  });
  await executeTransportConformanceScenario('canonical door change and same-state no-op', () => {
    expect(door).toMatchObject({ ok: true, result: { revision: committedRevision } });
    expect(sameState).toMatchObject({ ok: true, result: { revision: committedRevision } });
  });
  await executeTransportConformanceScenario('unsupported light mutation', () => {
    expect(unsupported).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    expect(unsupported.ok).not.toBe(true);
  });
  await executeTransportConformanceScenario('late subscription', () => {
    expect(lateEvents[0]?.seq).toBe(events.at(-1)?.seq);
    expect(lateEvents[0]?.data.revision).toBe(committedRevision);
  });
  await executeTransportConformanceScenario('duplicate mutation id', () => {
    expect(duplicate.ok).toBe(false);
    expect(reducerExecutions()).toBe(beforeDuplicateExecutions);
  });
  await executeTransportConformanceScenario('malformed transport beside empty id', () => {
    expect(open.id).toBe('');
    expect(result.outcomes.malformed).toBe('typed-fault');
  });
  await executeTransportConformanceScenario('subscription and disposal cleanup', async () => {
    expect(['closed', 'disposed']).toContain(transport.status());
    await expect(transport.request({ v: 1, id: 'after-dispose', method: 'scene.snapshot', params: {} }))
      .rejects.toBeInstanceOf(SceneTransportClosedError);
  });
  return result;
}
