import { describe, expect, it, vi } from 'vitest';
import { attachHandoffWorkerPort } from '../../../src/vtt/handoff/worker-entry';
import { WorkerSceneTransport } from '../../../src/vtt/handoff/worker-transport';
import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
import { readFileSync } from '../../helpers/test-filesystem';
import { selectVttHandoffWorkerAsset } from '../../../vite.config';

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((settle) => { resolve = settle; });
  return { promise, resolve };
}

describe('VTT handoff Worker message boundary', () => {
  it('pins Vite inline Worker discovery and selects only one emitted JavaScript Worker', () => {
    const source = readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8');
    expect(source).toMatch(
      /new Worker\(\s*new URL\('\.\/worker-entry\.ts', import\.meta\.url\),\s*\{ type: 'module', name: 'vtt-handoff-worker' \},\s*\)/u,
    );
    expect(source).not.toContain('const workerUrl = new URL');
    const javascript = { fileName: 'assets/worker-entry-AbCd1234.js', source: 'compiled worker' };
    const typescript = { fileName: 'assets/worker-entry-AbCd1234.ts', source: 'raw worker' };
    expect(selectVttHandoffWorkerAsset([typescript, javascript])).toBe(javascript);
    expect(() => selectVttHandoffWorkerAsset([typescript])).toThrow('Worker asset is unavailable');
    expect(() => selectVttHandoffWorkerAsset([javascript, {
      fileName: 'assets/worker-entry-EfGh5678.js', source: 'second compiled worker',
    }])).toThrow('Worker asset is ambiguous');
  });

  it('crosses one structured-clone boundary per port post with zero adapter re-serialization', async () => {
    const channel = new MessageChannel();
    const clientPosts = vi.spyOn(channel.port1, 'postMessage');
    const workerPosts = vi.spyOn(channel.port2, 'postMessage');
    const detach = attachHandoffWorkerPort(channel.port2, { sessionKey: 'serialization-measurement' });
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    const events: number[] = [];
    transport.subscribe((event) => events.push(event.seq));

    const serialization = { parse: 0, stringify: 0, clone: 0 };
    const originalParse = JSON.parse;
    const originalStringify = JSON.stringify;
    const originalClone = globalThis.structuredClone;
    let inspectingStack = false;
    const isAdapterCall = (): boolean => {
      if (inspectingStack) return false;
      inspectingStack = true;
      try {
        const frames = new Error().stack?.split('\n') ?? [];
        if (!frames.some((frame) => frame.includes('/src/vtt/handoff/'))) return false;
        const establishedEngineWork = [
          /\/src\/vtt\/dm-encounter-host\.ts/u, // Authoritative detached host capture.
          /\/src\/vtt\/session-persistence\.ts/u, // Authoritative journal-state copying.
          /\/src\/combat\//u, // Reducer and visibility-domain projection work.
          /\/src\/commands\/canonical-json\.ts/u, // Canonical engine-state hashing.
          /\/src\/vtt\/encounter-board\.ts/u, // Board presentation projection.
          /\/src\/vtt\/session-timeline\.ts/u, // Timeline projection copying.
          /\/src\/vtt\/encounter-projections\.ts/u, // Detached immutable capture copying.
        ];
        const serializationOrigin = frames.find((frame) => frame.includes('/src/'));
        if (
          serializationOrigin !== undefined &&
          establishedEngineWork.some((pattern) => pattern.test(serializationOrigin))
        ) return false;
        return true;
      } finally {
        inspectingStack = false;
      }
    };
    JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
      if (isAdapterCall()) serialization.parse += 1;
      return originalParse(...args);
    }) as typeof JSON.parse;
    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
      if (isAdapterCall()) {
        serialization.stringify += 1;
      }
      return originalStringify(...args);
    }) as typeof JSON.stringify;
    globalThis.structuredClone = ((...args: Parameters<typeof structuredClone>) => {
      if (isAdapterCall()) serialization.clone += 1;
      return originalClone(...args);
    }) as typeof structuredClone;
    try {
      const open = await transport.request({
        v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
      });
      const snapshot = await transport.initialSnapshot();
      expect(open).toMatchObject({ v: 1, id: '', ok: true });
      expect(snapshot).toMatchObject({
        sceneId: 'scene:vtt-handoff-worker:serialization-measurement', revision: 0,
      });
      expect(events).toEqual(events.map((_sequence, index) => index + 1));
      expect(events.length).toBeGreaterThanOrEqual(2);
      await expect(transport.request({
        v: 1, id: 'valid-snapshot', method: 'scene.snapshot', params: {},
      })).resolves.toMatchObject({ id: 'valid-snapshot', ok: true });
      await expect(transport.request({
        v: 1, id: 'invalid-door', method: 'door.set', params: { doorId: 42, open: true },
      })).resolves.toMatchObject({ id: 'invalid-door', ok: false, error: { code: 'INVALID_REQUEST' } });
      await expect(transport.request({
        v: 1, id: 'door-event', method: 'door.set',
        params: { doorId: 'object:two-room-door', open: true },
      })).resolves.toMatchObject({ id: 'door-event', ok: true });
      expect(serialization).toEqual({ parse: 0, stringify: 0, clone: 0 });
    } finally {
      JSON.parse = originalParse;
      JSON.stringify = originalStringify;
      globalThis.structuredClone = originalClone;
    }
    expect({ requestClones: clientPosts.mock.calls.length, workerClones: workerPosts.mock.calls.length })
      .toEqual({ requestClones: 4, workerClones: 8 });
    const adapterSources = [
      readFileSync('src/vtt/handoff/worker-entry.ts', 'utf8'),
      readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8'),
      readFileSync('src/vtt/handoff/worker-messages.ts', 'utf8'),
      readFileSync('src/vtt/handoff/worker-message-post.ts', 'utf8'),
      readFileSync('src/vtt/handoff/worker-memory-session-store.ts', 'utf8'),
    ].join('\n');
    expect(adapterSources).not.toMatch(/JSON\.(?:parse|stringify)|structuredClone/u);
    transport.dispose();
    detach();

    const liveChannel = new MessageChannel();
    const detachLive = attachHandoffWorkerPort(liveChannel.port2);
    const live = new WorkerSceneTransport(liveChannel.port1, () => undefined);
    const liveEvents: Array<{ readonly seq: number; readonly revision: number }> = [];
    const autonomous = new Promise<void>((resolve) => {
      live.subscribe((event) => {
        liveEvents.push({ seq: event.seq, revision: event.data.revision });
        if (event.seq > 1) resolve();
      });
    });
    await live.request({
      v: 1, id: 'open-live', method: 'session.open', params: { requestedRole: 'dm' },
    });
    await autonomous;

    await expect(live.request({
      v: 1, id: 'invalid', method: 'door.set', params: { doorId: 42, open: true },
    })).resolves.toMatchObject({ id: 'invalid', ok: false, error: { code: 'INVALID_REQUEST' } });
    const faults: string[] = [];
    live.subscribeErrors((error) => faults.push(error.code));
    await expect(live.request('{')).rejects.toBeInstanceOf(SceneTransportFaultError);
    expect(faults).toEqual(['INVALID_JSON']);

    const mutation = await live.request({
      v: 1, id: 'door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    if (!mutation.ok) throw new Error(`Worker door mutation failed: ${mutation.error.code}: ${mutation.error.message}`);
    expect(mutation).toMatchObject({ id: 'door', ok: true });
    if (typeof mutation.result.revision !== 'number') throw new Error('Expected a mutation revision.');
    expect(liveEvents.some((event) => event.revision === mutation.result.revision)).toBe(true);
    const beforeDuplicate = liveEvents.length;
    await expect(live.request({
      v: 1, id: 'door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: false },
    })).resolves.toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
    expect(liveEvents.length).toBe(beforeDuplicate);

    live.dispose();
    await expect(live.request({
      v: 1, id: 'after-dispose', method: 'scene.snapshot', params: {},
    })).rejects.toBeInstanceOf(SceneTransportClosedError);
    detachLive();
  });

  it('rejects a wrong-shaped Worker response instead of inventing success', async () => {
    const channel = new MessageChannel();
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    const faults: string[] = [];
    transport.subscribeErrors((error) => faults.push(error.code));
    const pending = transport.request({ v: 1, id: 'expected', method: 'scene.snapshot', params: {} });
    const rejected = pending.catch((error: unknown) => error);
    channel.port2.postMessage({
      kind: 'response', invocation: 1,
      response: { v: 1, id: 'wrong', ok: true, result: {} },
    });
    const error = await rejected;
    expect(faults).toEqual(['PROTOCOL_ERROR']);
    expect(error).toBeInstanceOf(SceneTransportFaultError);
    expect(transport.status()).toBe('closed');
    await expect(transport.request({ v: 1, id: 'later', method: 'scene.snapshot', params: {} }))
      .rejects.toBeInstanceOf(SceneTransportClosedError);
    channel.port2.close();
  });

  it('terminally rejects pending work when the Worker response envelope is malformed', async () => {
    const channel = new MessageChannel();
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    const pending = transport.request({ v: 1, id: 'malformed-response', method: 'scene.snapshot', params: {} });
    const rejected = pending.catch((error: unknown) => error);
    channel.port2.postMessage({ kind: 'response', invocation: 1, response: { invented: 'success' } });
    expect(await rejected).toBeInstanceOf(SceneTransportFaultError);
    expect(transport.status()).toBe('closed');
    expect(transport.pendingRequestCount()).toBe(0);
    channel.port2.close();
  });

  it('turns a malformed client boundary envelope into a typed fault', async () => {
    const channel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
    const fault = new Promise<unknown>((resolve) => {
      channel.port1.addEventListener('message', (event) => resolve(event.data), { once: true });
    });
    channel.port1.start();
    channel.port1.postMessage(null);
    await expect(fault).resolves.toMatchObject({
      kind: 'fault', fault: { kind: 'transport_fault', code: 'PROTOCOL_ERROR', websocketCloseCode: 1002 },
    });
    detach();
    channel.port1.close();
  });

  it('rejects an uncloneable request as a typed fault without orphaning later work', async () => {
    const channel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    const faults: string[] = [];
    transport.subscribeErrors((error) => faults.push(error.code));
    await expect(transport.request({
      v: 1, id: 'uncloneable', method: 'scene.snapshot', params: { callback: () => undefined },
    })).rejects.toMatchObject({ code: 'PROTOCOL_ERROR' });
    expect(faults).toEqual(['PROTOCOL_ERROR']);
    await expect(transport.request({
      v: 1, id: 'open-after-fault', method: 'session.open', params: { requestedRole: 'dm' },
    })).resolves.toMatchObject({ id: 'open-after-fault', ok: true });
    transport.dispose();
    detach();
  });

  it('passes original object, array and UTF-8 byte inputs to authoritative protocol validation', async () => {
    const channel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2, { sessionKey: 'original-input-shapes' });
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    await transport.request({ v: 1, id: 'open-inputs', method: 'session.open', params: { requestedRole: 'dm' } });

    await expect(transport.request({
      v: 1, id: 'unreserved-extra-key', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true }, extra: 'forbidden',
    })).resolves.toMatchObject({
      id: 'unreserved-extra-key', ok: false, error: { code: 'INVALID_REQUEST' },
    });
    await expect(transport.request({
      v: 1, id: 'unreserved-extra-key', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    })).resolves.toMatchObject({ id: 'unreserved-extra-key', ok: true });

    await expect(transport.request([
      { v: 1, id: 'array-id', method: 'scene.snapshot', params: {} },
    ])).rejects.toMatchObject({ code: 'PROTOCOL_ERROR', websocketCloseCode: 1002 });
    const encodedSnapshot = new TextEncoder().encode(JSON.stringify({
      v: 1, id: 'utf8-snapshot', method: 'scene.snapshot', params: {},
    }));
    await expect(transport.request(encodedSnapshot))
      .resolves.toMatchObject({ id: 'utf8-snapshot', ok: true });
    await expect(transport.request(Uint8Array.from([0xc3, 0x28])))
      .rejects.toMatchObject({ code: 'INVALID_UTF8', websocketCloseCode: 1007 });
    transport.dispose();
    detach();
  });

  it('correlates a JSON-text mutation receipt and preserves it across observer closure', async () => {
    const barrier = deferred();
    let delayResponse = false;
    const channel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2, {
      sessionKey: 'json-text-receipt',
      responseBarrier: () => delayResponse ? barrier.promise : Promise.resolve(),
    });
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    await transport.request({ v: 1, id: 'open-json', method: 'session.open', params: { requestedRole: 'dm' } });
    delayResponse = true;
    transport.subscribe((event) => {
      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) transport.close();
    });
    const committed = await transport.request(JSON.stringify({
      v: 1, id: 'json-door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }));
    expect(committed).toMatchObject({ id: 'json-door', ok: true });
    if (!committed.ok) throw new Error('The JSON-text mutation receipt was not preserved.');
    expect(committed.result.revision).toBeTypeOf('number');
    expect(transport.status()).toBe('closed');
    barrier.resolve();
    detach();
  });

  it('preserves an established mutation receipt when its snapshot observer closes the transport', async () => {
    const channel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2);
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    await transport.request({
      v: 1, id: 'open-for-receipt', method: 'session.open', params: { requestedRole: 'dm' },
    });
    transport.subscribe((event) => {
      const door = event.data.doors.find((candidate) => candidate.id === 'object:two-room-door');
      if (door?.open === true) {
        void transport.request({
          v: 1,
          get id(): string { transport.close(); return 'observer-close-getter'; },
          method: 'scene.snapshot', params: {},
        }).catch(() => undefined);
      }
    });
    const committed = await transport.request({
      v: 1, id: 'close-on-door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    expect(committed).toMatchObject({ id: 'close-on-door', ok: true });
    if (!committed.ok) throw new Error('The established Worker receipt was not committed.');
    expect(typeof committed.result.revision).toBe('number');
    expect(transport.status()).toBe('closed');
    await expect(transport.request({
      v: 1, id: 'unknown-after-close', method: 'scene.snapshot', params: {},
    })).rejects.toBeInstanceOf(SceneTransportClosedError);
    detach();
  });

  it.each([
    ['the same wire id', 'door-delayed'],
    ['a different wire id', 'door-duplicate-wrapper'],
  ])('refuses a repeated port invocation with %s without miscorrelating its delayed receipt', async (_label, duplicateId) => {
    const barrier = deferred();
    let delayResponses = false;
    const sessionKey = `duplicate-invocation:${duplicateId}`;
    const channel = new MessageChannel();
    const observerChannel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2, {
      sessionKey,
      responseBarrier: () => delayResponses ? barrier.promise : Promise.resolve(),
    });
    const detachObserver = attachHandoffWorkerPort(observerChannel.port2, { startAutonomous: false, sessionKey });
    const post = vi.spyOn(channel.port1, 'postMessage');
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    const observer = new WorkerSceneTransport(observerChannel.port1, () => undefined);
    const faults: string[] = [];
    transport.subscribeErrors((error) => faults.push(error.code));
    await transport.request({ v: 1, id: 'open-a', method: 'session.open', params: { requestedRole: 'dm' } });
    await observer.request({ v: 1, id: 'open-b', method: 'session.open', params: { requestedRole: 'dm' } });
    delayResponses = true;
    transport.subscribe((event) => {
      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) {
        setTimeout(() => transport.close(), 0);
      }
    });
    const committed = transport.request({
      v: 1, id: 'door-delayed', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    const wrapper = post.mock.calls.at(-1)?.[0];
    if (typeof wrapper !== 'object' || wrapper === null) throw new Error('The mutation wrapper was not posted.');
    channel.port1.postMessage({
      kind: 'request', invocation: Reflect.get(wrapper, 'invocation'),
      request: {
        v: 1, id: duplicateId, method: 'door.set',
        params: { doorId: 'object:two-room-door', open: false },
      },
    });
    const receipt = await committed;
    expect(receipt).toMatchObject({ id: 'door-delayed', ok: true });
    if (!receipt.ok || typeof receipt.result.revision !== 'number') throw new Error('Expected the original committed receipt.');
    expect(faults).toEqual(['PROTOCOL_ERROR']);
    expect(transport.status()).toBe('closed');
    await expect(observer.request({ v: 1, id: 'state', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'state', ok: true, result: { revision: receipt.result.revision } });
    barrier.resolve();
    observer.dispose();
    detach();
    detachObserver();
  });

  it('shares one authoritative session across seat bindings and scopes duplicate ids to that session', async () => {
    const sessionKey = 'shared-authority';
    const firstChannel = new MessageChannel();
    const secondChannel = new MessageChannel();
    const independentChannel = new MessageChannel();
    const detachFirst = attachHandoffWorkerPort(firstChannel.port2, { sessionKey });
    const detachSecond = attachHandoffWorkerPort(secondChannel.port2, { startAutonomous: false, sessionKey });
    const detachIndependent = attachHandoffWorkerPort(independentChannel.port2, { sessionKey: 'independent-authority' });
    const first = new WorkerSceneTransport(firstChannel.port1, () => undefined);
    const second = new WorkerSceneTransport(secondChannel.port1, () => undefined);
    const independent = new WorkerSceneTransport(independentChannel.port1, () => undefined);
    for (const [transport, id] of [[first, 'open-first'], [second, 'open-second'], [independent, 'open-independent']] as const) {
      await expect(transport.request({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } }))
        .resolves.toMatchObject({ id, ok: true });
    }
    const sharedMutation = await first.request({
      v: 1, id: 'session-scoped-id', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    expect(sharedMutation).toMatchObject({ id: 'session-scoped-id', ok: true });
    if (!sharedMutation.ok) throw new Error('The shared-session mutation was not committed.');
    expect(sharedMutation.result.revision).toBeTypeOf('number');
    await expect(second.request({
      v: 1, id: 'session-scoped-id', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: false },
    })).resolves.toMatchObject({ id: 'session-scoped-id', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
    first.dispose();
    await expect(second.request({ v: 1, id: 'after-detach', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'after-detach', ok: true, result: { doors: expect.arrayContaining([
        expect.objectContaining({ id: 'object:two-room-door', open: true }),
      ]) } });
    const independentMutation = await independent.request({
      v: 1, id: 'session-scoped-id', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    expect(independentMutation).toMatchObject({ id: 'session-scoped-id', ok: true });
    if (!independentMutation.ok) throw new Error('The independent-session mutation was not committed.');
    expect(independentMutation.result.revision).toBeTypeOf('number');
    second.dispose();
    independent.dispose();
    detachFirst(); detachSecond(); detachIndependent();
  });

  it('keeps replacement session identity stable across destroy, stale release and last detach', async () => {
    const sessionKey = 'replacement-session';
    const barrierB = deferred();
    let delayB = false;
    const channelA = new MessageChannel();
    const channelB = new MessageChannel();
    const detachA = attachHandoffWorkerPort(channelA.port2, { sessionKey });
    const detachB = attachHandoffWorkerPort(channelB.port2, {
      startAutonomous: false, sessionKey,
      responseBarrier: () => delayB ? barrierB.promise : Promise.resolve(),
    });
    const transportA = new WorkerSceneTransport(channelA.port1, () => undefined);
    const transportB = new WorkerSceneTransport(channelB.port1, () => undefined);
    await transportA.request({ v: 1, id: 'open-a', method: 'session.open', params: { requestedRole: 'dm' } });
    await transportB.request({ v: 1, id: 'open-b', method: 'session.open', params: { requestedRole: 'dm' } });
    delayB = true;
    const pendingB = transportB.request({ v: 1, id: 'pending-b', method: 'scene.snapshot', params: {} });
    const rejectedB = pendingB.catch((error: unknown) => error);
    transportA.destroySession();
    expect(await rejectedB).toBeInstanceOf(SceneTransportFaultError);
    expect(transportB.status()).toBe('closed');
    barrierB.resolve();

    const channelC = new MessageChannel();
    const detachC = attachHandoffWorkerPort(channelC.port2, { sessionKey });
    const transportC = new WorkerSceneTransport(channelC.port1, () => undefined);
    await transportC.request({ v: 1, id: 'open-c', method: 'session.open', params: { requestedRole: 'dm' } });
    detachB();
    const channelD = new MessageChannel();
    const detachD = attachHandoffWorkerPort(channelD.port2, { startAutonomous: false, sessionKey });
    const transportD = new WorkerSceneTransport(channelD.port1, () => undefined);
    await transportD.request({ v: 1, id: 'open-d', method: 'session.open', params: { requestedRole: 'dm' } });
    const mutationC = await transportC.request({
      v: 1, id: 'replacement-door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
    expect(mutationC).toMatchObject({ id: 'replacement-door', ok: true });
    if (!mutationC.ok) throw new Error('Replacement session mutation did not commit.');
    await expect(transportD.request({ v: 1, id: 'snapshot-d', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({
        id: 'snapshot-d', ok: true,
        result: {
          revision: mutationC.result.revision,
          doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: true })]),
        },
      });

    transportC.dispose();
    transportD.dispose();
    detachC(); detachD();
    const channelE = new MessageChannel();
    const detachE = attachHandoffWorkerPort(channelE.port2, { startAutonomous: false, sessionKey });
    const transportE = new WorkerSceneTransport(channelE.port1, () => undefined);
    const initialE = transportE.initialSnapshot();
    await transportE.request({ v: 1, id: 'open-e', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(initialE).resolves.toMatchObject({ revision: 0 });

    const isolatedChannel = new MessageChannel();
    const detachIsolated = attachHandoffWorkerPort(isolatedChannel.port2, {
      startAutonomous: false, sessionKey: 'replacement-session-independent',
    });
    const isolated = new WorkerSceneTransport(isolatedChannel.port1, () => undefined);
    await isolated.request({ v: 1, id: 'open-isolated', method: 'session.open', params: { requestedRole: 'dm' } });
    await expect(isolated.request({ v: 1, id: 'isolated-snapshot', method: 'scene.snapshot', params: {} }))
      .resolves.toMatchObject({ id: 'isolated-snapshot', ok: true, result: { revision: 0 } });
    transportE.dispose();
    isolated.dispose();
    detachA(); detachE(); detachIsolated();
  });

  it('binds a player port to its seat, filters its projection and never applies a DM receipt to its read', async () => {
    const barrier = deferred();
    let delayPlayer = false;
    const sessionKey = 'player-seat-binding';
    const dmChannel = new MessageChannel();
    const playerChannel = new MessageChannel();
    const detachDm = attachHandoffWorkerPort(dmChannel.port2, { sessionKey });
    const detachPlayer = attachHandoffWorkerPort(playerChannel.port2, {
      sessionKey,
      principal: { role: 'player', playerId: 'combatant:two-room-goblin' },
      responseBarrier: () => delayPlayer ? barrier.promise : Promise.resolve(),
    });
    const dm = new WorkerSceneTransport(dmChannel.port1, () => undefined);
    const player = new WorkerSceneTransport(playerChannel.port1, () => undefined);
    let playerSnapshot = null as Awaited<ReturnType<typeof player.initialSnapshot>> | null;
    player.subscribe((event) => { playerSnapshot = event.data; });
    await dm.request({ v: 1, id: 'open-dm', method: 'session.open', params: { requestedRole: 'dm' } });
    await player.request({
      v: 1, id: 'open-player', method: 'session.open',
      params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
    });
    expect(playerSnapshot?.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
    await expect(player.request({
      v: 1, id: 'cross-seat', method: 'token.move',
      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
    })).resolves.toMatchObject({ id: 'cross-seat', ok: false, error: { code: 'FORBIDDEN' } });
    const move = await player.request({
      v: 1, id: 'player-move', method: 'token.move',
      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
    });
    expect(move).toMatchObject({ id: 'player-move', ok: true });
    if (!move.ok) throw new Error('The player movement was not committed.');
    expect(move.result.revision).toBeTypeOf('number');
    expect(playerSnapshot?.tokens.find((token) => token.id === 'token:two-room-goblin'))
      .toMatchObject({ x: 7, y: 4, z: 0 });

    delayPlayer = true;
    player.subscribe((event) => {
      if (event.data.doors.find((door) => door.id === 'object:two-room-door')?.open === true) player.close();
    });
    const read = player.request({ v: 1, id: 'same-wire-id', method: 'scene.snapshot', params: {} });
    const readRejection = expect(read).rejects.toBeInstanceOf(SceneTransportClosedError);
    await expect(dm.request({
      v: 1, id: 'same-wire-id', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    })).resolves.toMatchObject({ id: 'same-wire-id', ok: true });
    await readRejection;
    expect(player.pendingRequestCount()).toBe(0);
    barrier.resolve();
    dm.dispose();
    detachDm(); detachPlayer();
  });

  it.each(['close', 'dispose', 'destroySession'] as const)(
    'rechecks lifecycle after an id getter invokes %s and posts no request',
    async (lifecycle) => {
      const channel = new MessageChannel();
      const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
      const post = vi.spyOn(channel.port1, 'postMessage');
      const transport = new WorkerSceneTransport(channel.port1, () => undefined);
      const request = {
        v: 1,
        get id(): string { transport[lifecycle](); return `closed-by-${lifecycle}`; },
        method: 'scene.snapshot', params: {},
      };
      await expect(transport.request(request)).rejects.toBeInstanceOf(SceneTransportClosedError);
      expect(transport.pendingRequestCount()).toBe(0);
      expect(post.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual([
        lifecycle === 'destroySession' ? 'destroy' : lifecycle,
      ]);
      detach();
    },
  );

  it.each(['close', 'dispose', 'destroySession'] as const)(
    'rechecks lifecycle when structured clone invokes a nested getter that calls %s',
    async (lifecycle) => {
      const channel = new MessageChannel();
      const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
      const post = vi.spyOn(channel.port1, 'postMessage');
      const workerPost = vi.spyOn(channel.port2, 'postMessage');
      const transport = new WorkerSceneTransport(channel.port1, () => undefined);
      const request = {
        v: 1, id: `nested-${lifecycle}`, method: 'scene.snapshot',
        params: {
          get trigger(): boolean { transport[lifecycle](); return true; },
        },
      };
      await expect(transport.request(request)).rejects.toBeInstanceOf(SceneTransportClosedError);
      expect(transport.pendingRequestCount()).toBe(0);
      expect(post.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual([
        'request',
        lifecycle === 'destroySession' ? 'destroy' : lifecycle,
      ]);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      expect(workerPost.mock.calls.map((call) => Reflect.get(call[0], 'kind'))).toEqual(['closed']);
      detach();
    },
  );

  it.each([
    ['worker error', 'worker'],
    ['worker messageerror', 'message'],
  ])('terminally cleans pending work on %s', async (_label, kind) => {
    const channel = new MessageChannel();
    let onError = (): void => undefined;
    let onMessageError = (): void => undefined;
    let removed = 0;
    let terminated = 0;
    const transport = new WorkerSceneTransport(
      channel.port1,
      () => { terminated += 1; },
      (error, messageError) => {
        onError = error; onMessageError = messageError;
        return () => { removed += 1; };
      },
    );
    const pending = transport.request({ v: 1, id: 'pending-failure', method: 'scene.snapshot', params: {} });
    const rejection = expect(pending).rejects.toBeInstanceOf(SceneTransportFaultError);
    if (kind === 'worker') onError(); else onMessageError();
    await rejection;
    expect({ status: transport.status(), pending: transport.pendingRequestCount(), removed, terminated })
      .toEqual({ status: 'closed', pending: 0, removed: 1, terminated: 1 });
    channel.port2.close();
  });

  it('terminally cleans pending work on a port messageerror and peer closure', async () => {
    const messageErrorChannel = new MessageChannel();
    const messageErrorTransport = new WorkerSceneTransport(messageErrorChannel.port1, () => undefined);
    const messageErrorPending = messageErrorTransport.request({ v: 1, id: 'messageerror', method: 'scene.snapshot', params: {} });
    const messageErrorRejection = expect(messageErrorPending).rejects.toBeInstanceOf(SceneTransportFaultError);
    messageErrorChannel.port1.dispatchEvent(new MessageEvent('messageerror'));
    await messageErrorRejection;
    expect(messageErrorTransport.status()).toBe('closed');
    messageErrorChannel.port2.close();

    const peerChannel = new MessageChannel();
    const peerTransport = new WorkerSceneTransport(peerChannel.port1, () => undefined);
    const peerPending = peerTransport.request({ v: 1, id: 'peer', method: 'scene.snapshot', params: {} });
    const peerRejection = expect(peerPending).rejects.toBeInstanceOf(SceneTransportFaultError);
    peerChannel.port2.postMessage({ kind: 'closed' });
    await peerRejection;
    expect(peerTransport.status()).toBe('closed');
    await expect(peerTransport.request({ v: 1, id: 'after-peer', method: 'scene.snapshot', params: {} }))
      .rejects.toBeInstanceOf(SceneTransportClosedError);
    peerChannel.port2.close();
  });
});
