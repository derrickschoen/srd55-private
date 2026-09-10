import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultNodeRuntimeSession, createVttNodeRuntime, type VttNodeRuntime,
} from '../../../tools/vtt-handoff/node-runtime';
import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
import { executeTransportConformanceScenario } from '../../helpers/vtt-handoff/transport-conformance';

const roots: string[] = [];
const runtimes: VttNodeRuntime[] = [];

function tokenFile(token: string): string {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-websocket-transport-'));
  roots.push(root);
  const path = resolve(root, 'tokens.json');
  writeFileSync(path, JSON.stringify([{ tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' }]), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('browser-safe WebSocket scene transport', () => {
  it('uses exactly one JSON encode and decode per direction for accepted and rejected envelopes', async () => {
    const token = 'transport-secret';
    const runtime = createVttNodeRuntime({
      tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true,
      createSession: (principal) => {
        const session = createDefaultNodeRuntimeSession(principal);
        return { service: session.service, seats: session.seats, art: session.art };
      },
    });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const warm = new WebSocketSceneTransport(address.websocketUrl, token);
    await warm.request({ v: 1, id: 'warm-open', method: 'session.open', params: { requestedRole: 'dm' } });
    await warm.initialSnapshot();
    warm.close();
    const originalParse = JSON.parse;
    const originalStringify = JSON.stringify;
    let measuring = false;
    let parseCount = 0;
    let stringifyCount = 0;
    const isMeasuredJsonCall = (stack: string | undefined, zodClientError: boolean): boolean => {
      const frames = stack?.split('\n') ?? [];
      const directCaller = frames[3] ?? '';
      if (/src\/vtt\/handoff\/websocket-transport\.ts|tools\/vtt-handoff\/node-runtime\.ts/u.test(directCaller)) return true;
      return zodClientError
        && /node_modules\/zod\/v4\/core\/errors\.js/u.test(directCaller)
        && frames.some((frame) => /src\/vtt\/handoff\/websocket-transport\.ts/u.test(frame));
    };
    const parse = vi.spyOn(JSON, 'parse').mockImplementation((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
      if (measuring && isMeasuredJsonCall(new Error().stack, false)) parseCount += 1;
      return originalParse(text, reviver);
    });
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementation((
      value: unknown,
      replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (number | string)[] | null,
      space?: number | string,
    ) => {
      if (measuring && isMeasuredJsonCall(new Error().stack, true)) stringifyCount += 1;
      return typeof replacer === 'function'
        ? originalStringify(value, replacer, space)
        : originalStringify(value, replacer, space);
    });
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    const statuses: string[] = [];
    transport.subscribeStatus((status) => statuses.push(status));
    const events: number[] = [];
    transport.subscribe((event) => events.push(event.seq));
    measuring = true;
    await expect(transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }))
      .resolves.toMatchObject({ id: '', ok: true });
    await expect(transport.initialSnapshot()).resolves.toMatchObject({ revision: 0 });
    expect(statuses).toEqual(['connecting', 'open']);
    expect(events[0]).toBe(1);
    const first = await transport.request({
      v: 1, id: 'budget-id', method: 'scene.snapshot', params: {},
    });
    expect(first).toMatchObject({ id: 'budget-id', ok: true });
    const rejected = await transport.request({
      v: 1, id: 'budget-id', method: 'scene.snapshot', params: {},
    });
    measuring = false;
    expect(rejected).toMatchObject({ id: 'budget-id', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
    const totalWireEnvelopes = 7;
    const assertBudget = (extraSerializations: number): void => {
      expect(stringifyCount + extraSerializations).toBe(totalWireEnvelopes);
      expect(parseCount).toBe(totalWireEnvelopes);
    };
    assertBudget(0);
    expect(() => assertBudget(1)).toThrow();
    parse.mockRestore();
    stringify.mockRestore();

    const lateEvents: number[] = [];
    const stopLate = transport.subscribe((event) => lateEvents.push(event.seq));
    expect(lateEvents).toHaveLength(1);
    stopLate();
    transport.close();
    expect(transport.status()).toBe('closed');
    expect(transport.pendingRequestCount()).toBe(0);
    await expect(transport.request({ v: 1, id: 'after', method: 'scene.snapshot', params: {} }))
      .rejects.toBeInstanceOf(SceneTransportClosedError);
  });

  it('reserves the serialized id against a re-entrant same-id request without overwriting either outcome', async () => {
    const token = 'reentrant-secret';
    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    let inner: Promise<unknown> | null = null;
    const outer = transport.request({
      toJSON(): unknown {
        inner = transport.request({ v: 1, id: 'same', method: 'session.open', params: { requestedRole: 'dm' } });
        return { v: 1, id: 'same', method: 'session.open', params: { requestedRole: 'dm' } };
      },
    });
    await expect(outer).rejects.toBeInstanceOf(SceneTransportFaultError);
    if (inner === null) throw new Error('The re-entrant request was not submitted.');
    await expect(inner).resolves.toMatchObject({ id: 'same', ok: true });
    expect(transport.pendingRequestCount()).toBe(0);
    transport.close();
  });

  it('reads a changing id once and correlates the exact representation put on the wire', async () => {
    const token = 'changing-id-secret';
    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    let reads = 0;
    const response = await transport.request({
      v: 1,
      get id(): string { reads += 1; return reads === 1 ? 'captured-id' : 'changed-id'; },
      method: 'session.open',
      params: { requestedRole: 'dm' },
    });
    expect(response).toMatchObject({ id: 'captured-id', ok: true });
    expect(reads).toBe(1);
    expect(transport.pendingRequestCount()).toBe(0);
    transport.close();
  });

  it('rechecks state after caller-controlled serialization and never retries an unknown mutation', async () => {
    const token = 'getter-secret';
    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    await transport.request({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
    let reads = 0;
    const request = {
      v: 1,
      id: 'getter-close',
      method: 'door.set',
      params: {
        doorId: 'object:two-room-door',
        get open(): boolean { reads += 1; transport.close(); return true; },
      },
    };
    await expect(transport.request(request)).rejects.toBeInstanceOf(SceneTransportClosedError);
    expect(reads).toBe(1);
    expect(transport.pendingRequestCount()).toBe(0);
    expect(runtime.sessionCounts().created).toBe(1);
  });

  it('settles a request queued during connecting when authentication closes the peer', async () => {
    const token = 'real-secret';
    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, 'wrong-secret');
    await expect(transport.request({
      v: 1, id: 'never-opened', method: 'session.open', params: { requestedRole: 'dm' },
    })).rejects.toBeInstanceOf(SceneTransportFaultError);
    expect(transport.pendingRequestCount()).toBe(0);
    expect(transport.status()).toBe('closed');
    expect(runtime.sessionCounts()).toEqual({ created: 0, active: 0 });
  });

  it('does not retry an actually sent mutation after the socket drops with an unknown outcome', async () => {
    const token = 'unknown-outcome-secret';
    let decodedMutations = 0;
    let runtimeReference: VttNodeRuntime | null = null;
    const runtime = createVttNodeRuntime({
      tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true,
      wireCodec: {
        parse: (text): unknown => {
          const value = JSON.parse(text) as unknown;
          if (typeof value === 'object' && value !== null && Reflect.get(value, 'method') === 'door.set') {
            decodedMutations += 1;
            if (runtimeReference !== null) void runtimeReference.close();
          }
          return value;
        },
        stringify: (value): string => JSON.stringify(value),
      },
    });
    runtimeReference = runtime;
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    await transport.request({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(transport.request({
      v: 1, id: 'unknown', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    })).rejects.toSatisfy((error: unknown) =>
      error instanceof SceneTransportClosedError || error instanceof SceneTransportFaultError);
    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 20));
    await executeTransportConformanceScenario('no retry after unknown mutation outcome', () => {
      expect(decodedMutations).toBe(1);
      expect(transport.pendingRequestCount()).toBe(0);
    });
  });
});
