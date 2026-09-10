import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVttNodeRuntime, type VttNodeRuntime } from '../../../tools/vtt-handoff/node-runtime';
import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';

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
  it('serializes once per wire message, correlates empty ids, buffers initial state, and cleans up centrally', async () => {
    const token = 'transport-secret';
    const serverParse = vi.fn((text: string): unknown => JSON.parse(text) as unknown);
    const serverStringify = vi.fn((value: unknown): string => JSON.stringify(value));
    const runtime = createVttNodeRuntime({
      tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true,
      wireCodec: { parse: serverParse, stringify: serverStringify },
    });
    runtimes.push(runtime);
    const address = await runtime.listen(0);
    const clientParse = vi.fn((text: string): unknown => JSON.parse(text) as unknown);
    const clientStringify = vi.fn((value: unknown): string => JSON.stringify(value));
    const transport = new WebSocketSceneTransport(address.websocketUrl, token, {
      parse: clientParse, stringify: clientStringify,
    });
    const statuses: string[] = [];
    transport.subscribeStatus((status) => statuses.push(status));
    const events: number[] = [];
    transport.subscribe((event) => events.push(event.seq));
    await expect(transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }))
      .resolves.toMatchObject({ id: '', ok: true });
    await expect(transport.initialSnapshot()).resolves.toMatchObject({ revision: 0 });
    expect(statuses).toEqual(['connecting', 'open']);
    expect(events[0]).toBe(1);
    expect(clientStringify).toHaveBeenCalledTimes(1);
    expect(serverParse).toHaveBeenCalledTimes(1);
    expect(serverStringify.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(clientParse.mock.calls.length).toBe(serverStringify.mock.calls.length);

    const lateEvents: number[] = [];
    const stopLate = transport.subscribe((event) => lateEvents.push(event.seq));
    expect(lateEvents).toHaveLength(1);
    stopLate();
    const closedByObserver = new Promise<void>((resolveClosed) => {
      transport.subscribe((event) => {
        if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open !== true) return;
        transport.close();
        resolveClosed();
      });
    });
    const door = await transport.request({
      v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
    });
    expect(door).toMatchObject({ id: 'door', ok: true });
    await closedByObserver;
    expect(events.at(-1)).toBeGreaterThan(1);
    expect(transport.status()).toBe('closed');
    expect(transport.pendingRequestCount()).toBe(0);
    await expect(transport.request({ v: 1, id: 'after', method: 'scene.snapshot', params: {} }))
      .rejects.toBeInstanceOf(SceneTransportClosedError);
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
});
