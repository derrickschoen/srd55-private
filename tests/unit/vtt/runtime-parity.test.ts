import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
import {
  createVttNodeRuntime, type VttNodeRuntime,
} from '../../../tools/vtt-handoff/node-runtime';
import {
  createCountedConformanceSession, createInProcessConformanceTransport, createVisibilityConformanceSession,
  createVisibilityInProcessTransport,
  runDmTransportConformance, TRANSPORT_CONFORMANCE_SCENARIOS,
  executeTransportConformanceScenario, runPlayerMismatchConformance, runPlayerMovementConformance,
  runTerminalOutcomeConformance, runVisibilityRemovalConformance, TWO_ROOM_MOVING_PLAYER,
} from '../../helpers/vtt-handoff/transport-conformance';

const roots: string[] = [];
const runtimes: VttNodeRuntime[] = [];
const TERMINAL_CASES = [
  { expected: 'committed' as const, forced: undefined },
  { expected: 'refused' as const, forced: { kind: 'refused' as const, code: 'ENGINE_REFUSED' as const, reason: 'controlled refusal' } },
  { expected: 'cancelled' as const, forced: { kind: 'cancelled' as const, reason: 'controlled cancellation' } },
  { expected: 'closed' as const, forced: { kind: 'closed' as const } },
  { expected: 'failed' as const, forced: { kind: 'failed' as const, phase: 'pre_apply' as const, error: new Error('controlled failure') } },
] as const;

function tokenFile(token: string, playerToken: string): string {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-runtime-parity-'));
  roots.push(root);
  const path = resolve(root, 'tokens.json');
  writeFileSync(path, JSON.stringify([
    { tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' },
    { tokenSha256: createHash('sha256').update(playerToken).digest('hex'), role: 'player', playerId: TWO_ROOM_MOVING_PLAYER },
  ]), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function canonicalWithoutSessionIdentity(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalWithoutSessionIdentity);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    key === 'sessionId' || key === 'sceneId' ? '<logical-session>' : canonicalWithoutSessionIdentity(child),
  ]));
}

function waitForNoActiveSessions(runtime: VttNodeRuntime): Promise<void> {
  return new Promise((resolveInactive, reject) => {
    const deadline = setTimeout(() => reject(new Error('Socket cleanup did not finish within one second.')), 1_000);
    const inspect = (): void => {
      if (runtime.sessionCounts().active !== 0) { setTimeout(inspect, 5); return; }
      clearTimeout(deadline);
      resolveInactive();
    };
    inspect();
  });
}

describe('fixed two-room runtime parity', () => {
  it('runs the shared independent conformance assertions through in-process and WebSocket adapters', async () => {
    expect(TRANSPORT_CONFORMANCE_SCENARIOS).toHaveLength(16);
    const inProcess = createInProcessConformanceTransport();
    const inProcessResultPromise = runDmTransportConformance(inProcess.transport, inProcess.reducerExecutions);
    await inProcess.start();
    const inProcessResult = await inProcessResultPromise;

    const token = 'runtime-parity-secret';
    const playerToken = 'runtime-parity-player-secret';
    const nodeCounters: Array<() => number> = [];
    const nodeRuntime = createVttNodeRuntime({
      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
      createSession: (principal) => {
        const counted = createCountedConformanceSession(principal);
        nodeCounters.push(counted.reducerExecutions);
        return counted.session;
      },
    });
    runtimes.push(nodeRuntime);
    const address = await nodeRuntime.listen(0);
    const websocketResult = await runDmTransportConformance(
      new WebSocketSceneTransport(address.websocketUrl, token),
      () => nodeCounters.reduce((total, count) => total + count(), 0),
    );
    expect(websocketResult.seed).toBe(603_020_001);
    expect(websocketResult.clock).toBe('2026-09-09T12:00:00.000Z');
    expect(websocketResult.canonical.map((response) => ({
      id: response.id,
      ok: response.ok,
      code: response.ok ? null : response.error.code,
    }))).toEqual(inProcessResult.canonical.map((response) => ({
      id: response.id,
      ok: response.ok,
      code: response.ok ? null : response.error.code,
    })));
    expect(canonicalWithoutSessionIdentity(websocketResult.canonical))
      .toEqual(canonicalWithoutSessionIdentity(inProcessResult.canonical));
    expect(websocketResult.outcomes).toMatchObject({
      open: 'ok', correlation: 'ok', structuralValidation: 'INVALID_REQUEST',
      doorChange: 'committed', doorNoOp: 'committed', light: 'UNSUPPORTED', malformed: 'typed-fault',
    });
    expect(nodeRuntime.sessionCounts()).toEqual({ created: 1, active: 0 });
  });

  it('executes successful player movement and authoritative mismatch controls through both adapters', async () => {
    const inProcessPlayer = createInProcessConformanceTransport({ role: 'player', playerId: TWO_ROOM_MOVING_PLAYER });
    await runPlayerMovementConformance(inProcessPlayer.transport, inProcessPlayer.start);
    const inProcessMismatch = createInProcessConformanceTransport({ role: 'player', playerId: TWO_ROOM_MOVING_PLAYER });
    await runPlayerMismatchConformance(inProcessMismatch.transport);

    const token = 'player-parity-dm-secret';
    const playerToken = 'player-parity-secret';
    const nodeRuntime = createVttNodeRuntime({
      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
    });
    runtimes.push(nodeRuntime);
    const address = await nodeRuntime.listen(0);
    await runPlayerMovementConformance(
      new WebSocketSceneTransport(address.websocketUrl, playerToken),
      () => Promise.resolve(),
    );
    await runPlayerMismatchConformance(new WebSocketSceneTransport(address.websocketUrl, playerToken));
    expect(nodeRuntime.sessionCounts()).toEqual({ created: 2, active: 0 });
  });

  it('maps all five terminal intent outcomes through the in-process adapter', async () => {
    const inProcessOutcomes: string[] = [];
    for (const entry of TERMINAL_CASES) {
      const adapter = createInProcessConformanceTransport(
        { role: 'player', playerId: TWO_ROOM_MOVING_PLAYER }, entry.forced,
      );
      inProcessOutcomes.push(await runTerminalOutcomeConformance(adapter.transport, adapter.start));
    }
    const expected = TERMINAL_CASES.map((entry) => entry.expected);
    await executeTransportConformanceScenario('five terminal intent outcomes', () => {
      expect(inProcessOutcomes).toEqual(expected);
      expect(new Set(inProcessOutcomes)).toEqual(new Set(['committed', 'refused', 'cancelled', 'closed', 'failed']));
      expect(new Set(inProcessOutcomes.slice(1))).not.toEqual(new Set(expected));
    });
  });

  it('maps all five terminal intent outcomes through the WebSocket adapter', async () => {
    const token = 'terminal-dm-secret';
    const playerToken = 'terminal-player-secret';
    const pendingCases = [...TERMINAL_CASES];
    const nodeRuntime = createVttNodeRuntime({
      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
      createSession: (principal) => {
        const entry = pendingCases.shift();
        if (entry === undefined) throw new Error('Terminal-outcome session queue was exhausted.');
        return createCountedConformanceSession(principal, entry.forced).session;
      },
    });
    runtimes.push(nodeRuntime);
    const address = await nodeRuntime.listen(0);
    const websocketOutcomes: string[] = [];
    for (const _entry of TERMINAL_CASES) {
      websocketOutcomes.push(await runTerminalOutcomeConformance(
        new WebSocketSceneTransport(address.websocketUrl, playerToken), () => Promise.resolve(),
      ));
    }
    const expected = TERMINAL_CASES.map((entry) => entry.expected);
    await executeTransportConformanceScenario('five terminal intent outcomes', () => {
      expect(websocketOutcomes).toEqual(expected);
      expect(new Set(websocketOutcomes)).toEqual(new Set(['committed', 'refused', 'cancelled', 'closed', 'failed']));
      expect(new Set(websocketOutcomes.slice(1))).not.toEqual(new Set(expected));
    });
  });

  it('removes newly hidden entities through in-process and WebSocket snapshots', async () => {
    const principal = { role: 'player' as const, playerId: TWO_ROOM_MOVING_PLAYER };
    const inProcessSession = createVisibilityInProcessTransport(principal);
    await runVisibilityRemovalConformance(
      inProcessSession.transport,
      inProcessSession.hideVisibleEntities,
    );

    const controls: Array<() => void> = [];
    const token = 'visibility-dm-secret';
    const playerToken = 'visibility-player-secret';
    const nodeRuntime = createVttNodeRuntime({
      tokensFile: tokenFile(token, playerToken), allowedOrigins: new Set(), allowOriginless: true,
      createSession: (authenticatedPrincipal) => {
        const controlled = createVisibilityConformanceSession(authenticatedPrincipal);
        controls.push(controlled.hideVisibleEntities);
        return controlled.session;
      },
    });
    runtimes.push(nodeRuntime);
    const address = await nodeRuntime.listen(0);
    const websocket = new WebSocketSceneTransport(address.websocketUrl, playerToken);
    const websocketExercise = runVisibilityRemovalConformance(websocket, () => {
      const hide = controls[0];
      if (hide === undefined) throw new Error('WebSocket visibility control is unavailable.');
      hide();
    });
    await websocketExercise;
    await executeTransportConformanceScenario('visible-to-hidden entity removal', () => {
      expect(controls).toHaveLength(1);
      expect(websocket.pendingRequestCount()).toBe(0);
    });
  });

  it('reconnects to a fresh session, full snapshot, and correlation ledger', async () => {
    const firstInProcess = createInProcessConformanceTransport();
    const firstInProcessOpen = await firstInProcess.transport.request({
      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await firstInProcess.transport.initialSnapshot();
    await expect(firstInProcess.transport.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'reused', ok: true });
    firstInProcess.transport.dispose();
    const secondInProcess = createInProcessConformanceTransport();
    const secondInProcessOpen = await secondInProcess.transport.request({
      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await expect(secondInProcess.transport.initialSnapshot()).resolves.toMatchObject({
      revision: 0,
      tokens: [
        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
      ],
    });
    await expect(secondInProcess.transport.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'reused', ok: true });
    expect(firstInProcessOpen.ok && secondInProcessOpen.ok ? firstInProcessOpen.result.sessionId : null)
      .not.toBe(secondInProcessOpen.ok ? secondInProcessOpen.result.sessionId : null);
    secondInProcess.transport.dispose();

    const token = 'reconnect-dm-secret';
    const nodeRuntime = createVttNodeRuntime({
      tokensFile: tokenFile(token, 'unused-player-secret'), allowedOrigins: new Set(), allowOriginless: true,
    });
    runtimes.push(nodeRuntime);
    const address = await nodeRuntime.listen(0);
    const first = new WebSocketSceneTransport(address.websocketUrl, token);
    const firstOpen = await first.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
    await first.initialSnapshot();
    await expect(first.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'reused', ok: true });
    first.dispose();

    const second = new WebSocketSceneTransport(address.websocketUrl, token);
    const secondOpen = await second.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(second.initialSnapshot()).resolves.toMatchObject({ revision: 0, tokens: [
      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
    ] });
    expect(firstOpen.ok && secondOpen.ok ? firstOpen.result.sessionId : null)
      .not.toBe(secondOpen.ok ? secondOpen.result.sessionId : null);
    await expect(second.request({ v: 1, id: 'reused', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'reused', ok: true });
    await executeTransportConformanceScenario('reconnect full resnapshot', () => {
      expect(secondOpen.ok).toBe(true);
      expect(firstOpen.ok && secondOpen.ok ? firstOpen.result.sessionId : null)
        .not.toBe(secondOpen.ok ? secondOpen.result.sessionId : null);
    });
    second.dispose();
    await waitForNoActiveSessions(nodeRuntime);
    expect(nodeRuntime.sessionCounts()).toEqual({ created: 2, active: 0 });
  });
});
