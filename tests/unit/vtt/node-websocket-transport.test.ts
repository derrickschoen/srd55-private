import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import {
  createDefaultNodeRuntimeSession, createVttNodeRuntime, type VttNodeRuntime,
} from '../../../tools/vtt-handoff/node-runtime';
import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
import { executeTransportConformanceScenario } from '../../helpers/vtt-handoff/transport-conformance';

const roots: string[] = [];
const runtimes: VttNodeRuntime[] = [];
const scriptedServers: WebSocketServer[] = [];

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
  await Promise.all(scriptedServers.splice(0).map(async (server) => {
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolveClosed) => server.close(() => resolveClosed()));
  }));
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
    const cannedSnapshot = await warm.initialSnapshot();
    warm.close();
    await runtime.close();
    runtimes.splice(runtimes.indexOf(runtime), 1);
    const originalParse = JSON.parse;
    const originalStringify = JSON.stringify;
    const eventWire = originalStringify({ v: 1, event: 'scene.snapshot', seq: 1, data: cannedSnapshot });
    const receivedProbeWires: string[] = [];
    const scriptedServer = new WebSocketServer({
      host: '127.0.0.1', port: 0, perMessageDeflate: false,
      handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
    });
    scriptedServers.push(scriptedServer);
    await new Promise<void>((resolveListening, reject) => {
      scriptedServer.once('listening', resolveListening);
      scriptedServer.once('error', reject);
    });
    const scriptedAddress = scriptedServer.address();
    if (scriptedAddress === null || typeof scriptedAddress === 'string') throw new Error('Scripted server has no address.');
    const scriptedUrl = `ws://127.0.0.1:${String(scriptedAddress.port)}`;
    scriptedServer.on('connection', (socket) => socket.on('message', (data) => {
      const wire = data.toString();
      const request = originalParse(wire) as unknown;
      const envelope = typeof request === 'object' && request !== null ? request : {};
      const id = Reflect.get(envelope, 'id');
      if (id === 'invalid-schema') {
        socket.send(originalStringify({
          v: 1, id, ok: false, error: { code: 'INVALID_REQUEST', message: 'The request parameters are invalid.' },
        }));
        return;
      }
      if (id === 'malformed-event') {
        socket.send('{"v":1,"event":"scene.snapshot","seq":2,"data":{}}');
        return;
      }
      if (id === 'probe-open') receivedProbeWires.push(wire);
      socket.send(originalStringify({
        v: 1, id, ok: true,
        result: { sessionId: `session:${String(id)}`, capabilities: ['scene.snapshot', 'token.move', 'door.set'] },
      }));
      socket.send(eventWire);
    }));
    let measuring = false;
    let injectMutantSerialization = false;
    let injectingMutantSerialization = false;
    let parseCount = 0;
    let stringifyCount = 0;
    const isMeasuredJsonCall = (stack: string | undefined): boolean => {
      const frames = stack?.split('\n') ?? [];
      return frames.some((frame) => /src\/vtt\/handoff\//u.test(frame));
    };
    const parse = vi.spyOn(JSON, 'parse').mockImplementation((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
      if (measuring && isMeasuredJsonCall(new Error().stack)) parseCount += 1;
      return originalParse(text, reviver);
    });
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementation((
      value: unknown,
      replacer?: ((this: unknown, key: string, value: unknown) => unknown) | (number | string)[] | null,
      space?: number | string,
    ) => {
      const measured = measuring && isMeasuredJsonCall(new Error().stack);
      if (measured) {
        stringifyCount += 1;
      }
      if (measured && injectMutantSerialization && !injectingMutantSerialization) {
        injectingMutantSerialization = true;
        JSON.stringify({ mutant: 'extra-adapter-serialization' });
        injectingMutantSerialization = false;
      }
      return typeof replacer === 'function'
        ? originalStringify(value, replacer, space)
        : originalStringify(value, replacer, space);
    });
    const transport = new WebSocketSceneTransport(scriptedUrl, token);
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
    const invalid = new WebSocketSceneTransport(scriptedUrl, token);
    const rejected = await invalid.request({
      v: 1, id: 'invalid-schema', method: 'scene.snapshot', params: { unexpected: true },
    });
    invalid.close();
    const malformed = new WebSocketSceneTransport(scriptedUrl, token);
    const malformedFault = malformed.request({
      v: 1, id: 'malformed-event', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await expect(malformedFault).rejects.toBeInstanceOf(SceneTransportFaultError);
    measuring = false;
    expect(rejected).toMatchObject({ id: 'invalid-schema', ok: false, error: { code: 'INVALID_REQUEST' } });
    const assertBudget = (expectedStringify: number, expectedParse: number): void => {
      expect({ stringifyCount, parseCount }).toEqual({ stringifyCount: expectedStringify, parseCount: expectedParse });
    };
    assertBudget(3, 4);

    parseCount = 0;
    stringifyCount = 0;
    injectMutantSerialization = true;
    measuring = true;
    const mutant = new WebSocketSceneTransport(scriptedUrl, token);
    await mutant.request({ v: 1, id: 'probe-open', method: 'session.open', params: { requestedRole: 'dm' } });
    await mutant.initialSnapshot();
    mutant.close();
    measuring = false;
    expect(() => assertBudget(1, 2)).toThrow();
    const mutantCounts = { stringifyCount, parseCount };
    expect(mutantCounts).toEqual({ stringifyCount: 2, parseCount: 2 });

    parseCount = 0;
    stringifyCount = 0;
    injectMutantSerialization = false;
    measuring = true;
    const restored = new WebSocketSceneTransport(scriptedUrl, token);
    await restored.request({ v: 1, id: 'probe-open', method: 'session.open', params: { requestedRole: 'dm' } });
    await restored.initialSnapshot();
    restored.close();
    measuring = false;
    assertBudget(1, 2);
    expect(receivedProbeWires).toHaveLength(2);
    expect(receivedProbeWires[0]).toBe(receivedProbeWires[1]);
    console.info(
      `vtt-json-budget baseline=3/4 mutant=${String(mutantCounts.stringifyCount)}/${String(mutantCounts.parseCount)} restored=1/2`,
    );
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

  it('correlates an id by its serialized scalar value', async () => {
    const token = 'serialized-id-secret';
    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    const response = await transport.request({
      v: 1,
      id: { toJSON: (): string => 'wire-id' },
      method: 'session.open',
      params: { requestedRole: 'dm' },
    });
    expect(response).toMatchObject({ id: 'wire-id', ok: true });
    expect(transport.pendingRequestCount()).toBe(0);
    transport.close();
  });

  it('preserves an enumerable own __proto__ field so the server refuses the invalid request', async () => {
    const token = 'own-proto-secret';
    const runtime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const transport = new WebSocketSceneTransport(address.websocketUrl, token);
    await transport.request({ v: 1, id: 'open', method: 'session.open', params: { requestedRole: 'dm' } });
    const request: Record<string, unknown> = {
      v: 1, id: 'own-proto', method: 'scene.snapshot', params: {},
    };
    Object.defineProperty(request, '__proto__', {
      configurable: true, enumerable: true, value: { polluted: true }, writable: true,
    });
    await expect(transport.request(request)).resolves.toMatchObject({
      id: 'own-proto', ok: false, error: { code: 'INVALID_REQUEST' },
    });
    expect(Object.getPrototypeOf(request)).toBe(Object.prototype);
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
