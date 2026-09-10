import { describe, expect, it, vi } from 'vitest';
import { attachHandoffWorkerPort } from '../../../src/vtt/handoff/worker-entry';
import { WorkerSceneTransport } from '../../../src/vtt/handoff/worker-transport';
import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
import { readFileSync } from '../../helpers/test-filesystem';

describe('VTT handoff Worker message boundary', () => {
  it('crosses one structured-clone boundary per port post without internal re-serialization', async () => {
    const channel = new MessageChannel();
    const clientPosts = vi.spyOn(channel.port1, 'postMessage');
    const workerPosts = vi.spyOn(channel.port2, 'postMessage');
    const detach = attachHandoffWorkerPort(channel.port2, { startAutonomous: false });
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    const events: number[] = [];
    transport.subscribe((event) => events.push(event.seq));

    const open = await transport.request({
      v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
    });
    const snapshot = await transport.initialSnapshot();
    expect(open).toMatchObject({ v: 1, id: '', ok: true });
    expect(snapshot).toMatchObject({ sceneId: 'scene:vtt-handoff-worker', revision: 0 });
    expect(events).toEqual([1]);
    expect({ requestClones: clientPosts.mock.calls.length, workerClones: workerPosts.mock.calls.length })
      .toEqual({ requestClones: 1, workerClones: 2 });
    const adapterSources = [
      readFileSync('src/vtt/handoff/worker-entry.ts', 'utf8'),
      readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8'),
      readFileSync('src/vtt/handoff/worker-messages.ts', 'utf8'),
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
    channel.port2.postMessage({
      kind: 'response', invocation: 1,
      response: { v: 1, id: 'wrong', ok: true, result: {} },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(faults).toEqual(['PROTOCOL_ERROR']);
    transport.close();
    await expect(pending).rejects.toBeInstanceOf(SceneTransportClosedError);
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

  it('preserves an established mutation receipt when its snapshot observer closes the transport', async () => {
    const channel = new MessageChannel();
    const detach = attachHandoffWorkerPort(channel.port2);
    const transport = new WorkerSceneTransport(channel.port1, () => undefined);
    await transport.request({
      v: 1, id: 'open-for-receipt', method: 'session.open', params: { requestedRole: 'dm' },
    });
    transport.subscribe((event) => {
      const door = event.data.doors.find((candidate) => candidate.id === 'object:two-room-door');
      if (door?.open === true) transport.close();
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
});
