import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import type {} from '../../../src/vtt/handoff/worker-harness';
import { TRANSPORT_CONFORMANCE_SCENARIO_NAMES } from '../../helpers/vtt-handoff/transport-conformance-manifest';
import { vttHandoffBrowserOrigin } from './playwright.config';

test('pairs the real Worker and browser WebSocket transport on the fixed two-room scene', async ({ page }, testInfo) => {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-browser-runtime-parity-'));
  const token = 'browser-runtime-parity-secret';
  const playerToken = 'browser-runtime-parity-player-secret';
  const tokensFile = resolve(root, 'tokens.json');
  writeFileSync(tokensFile, JSON.stringify([
    { tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' },
    {
      tokenSha256: createHash('sha256').update(playerToken).digest('hex'),
      role: 'player', playerId: 'combatant:two-room-goblin',
    },
  ]), { mode: 0o600 });
  chmodSync(tokensFile, 0o600);
  const viteConfig = resolve('/tmp', 'vtt-runtime-playwright-' + String(process.pid) + '.config.mjs');
  writeFileSync(viteConfig, 'export default {};\n', { mode: 0o600 });
  const runtime = spawn(process.execPath, [
    resolve('node_modules/vite-node/vite-node.mjs'),
    '--config', viteConfig, 'tools/vtt-handoff/node-runtime-main.ts', '--port', '0', '--origin', vttHandoffBrowserOrigin,
  ], {
    cwd: process.cwd(), env: { ...process.env, VTT_RUNTIME_TOKENS_FILE: tokensFile }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let runtimeOutput = '';
  let runtimeErrors = '';
  runtime.stdout.on('data', (chunk: Buffer) => { runtimeOutput += chunk.toString(); });
  runtime.stderr.on('data', (chunk: Buffer) => { runtimeErrors += chunk.toString(); });
  const websocketUrl = await new Promise<string>((resolveUrl, reject) => {
    const inspect = (): void => {
      const match = /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(runtimeOutput);
      if (match?.[1] !== undefined) resolveUrl(match[1]);
    };
    runtime.stdout.on('data', inspect);
    runtime.once('exit', (code) => reject(new Error('Runtime exited ' + String(code) + ': ' + runtimeErrors)));
    runtime.once('error', reject);
  });
  const malformedServer = new WebSocketServer({
    host: '127.0.0.1', port: 0,
    handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
  });
  await new Promise<void>((resolveListening, reject) => {
    malformedServer.once('listening', resolveListening);
    malformedServer.once('error', reject);
  });
  const malformedPort = (malformedServer.address() as AddressInfo).port;
  const malformedClose = new Promise<number>((resolveClose) => {
    malformedServer.on('connection', (socket) => {
      socket.once('close', (code) => resolveClose(code));
      socket.send('{');
    });
  });
  const nodePort = Number(new URL(websocketUrl).port);
  try {
    await page.goto('/vtt-handoff');
    await expect(page.getByTestId('handoff-state')).toHaveAttribute('data-status', 'open');
    const worker = await page.evaluate(() => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The Worker harness is unavailable.');
      return api.state();
    });
    expect(worker.artifact).toEqual({ artifact: 'dev' });
    expect(worker.snapshot?.tokens.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual([
      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
    ]);
    const workerDoor = await page.evaluate(async () => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The Worker harness is unavailable.');
      const response = await api.request({
        v: 1, id: 'parity:worker-door', method: 'door.set',
        params: { doorId: 'object:two-room-door', open: true },
      });
      return { response, state: api.state() };
    });
    expect(workerDoor.response).toMatchObject({ id: 'parity:worker-door', ok: true });
    expect(workerDoor.state.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
    expect(workerDoor.state.eventSequences).toEqual(
      workerDoor.state.eventSequences.map((_sequence, index) => index + 1),
    );
    const workerControls = await page.evaluate(async () => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The Worker harness is unavailable.');
      const correlated = await Promise.all(['a', 'b'].map((suffix) => api.request({
        v: 1, id: 'worker:snapshot:' + suffix, method: 'scene.snapshot', params: {},
      })));
      const invalid = await api.request({
        v: 1, id: 'worker:invalid', method: 'door.set', params: { doorId: 42, open: true },
      });
      const unsupported = await api.request({
        v: 1, id: 'worker:light', method: 'light.set',
        params: { lightId: 'object:two-room-torch', enabled: false },
      });
      interface DirectWorkerTransport {
        request(request: unknown): Promise<unknown>;
        dispose(): void;
      }
      const workerModulePath = '/src/vtt/handoff/worker-transport.ts';
      const loaded = await import(/* @vite-ignore */ workerModulePath) as unknown;
      const createTransport = Reflect.get(loaded as object, 'createHandoffWorkerTransport') as () => DirectWorkerTransport;
      const mismatchTransport = createTransport();
      const mismatch = await mismatchTransport.request({
        v: 1, id: 'worker:mismatch', method: 'session.open',
        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
      });
      mismatchTransport.dispose();
      const duplicate = await api.request({
        v: 1, id: 'parity:worker-door', method: 'door.set',
        params: { doorId: 'object:two-room-door', open: false },
      });
      const malformed = await api.malformed();
      const reconnected = await api.reconnect();
      return { correlated, invalid, unsupported, mismatch, duplicate, malformed, reconnected };
    });
    expect(workerControls.correlated.map((response) => response.id)).toEqual([
      'worker:snapshot:a', 'worker:snapshot:b',
    ]);
    expect(workerControls.invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(workerControls.unsupported).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    expect(workerControls.mismatch).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(workerControls.duplicate).toMatchObject({ ok: false, error: { code: 'DUPLICATE_MUTATION' } });
    expect(workerControls.malformed).toBe('INVALID_JSON');
    expect(workerControls.reconnected).toMatchObject({
      generation: 2,
      snapshot: {
        tokens: [
          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
        ],
        doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: false })]),
      },
    });
    expect(workerControls.reconnected.eventSequences[0]).toBe(1);
    expect(workerControls.reconnected.eventSequences).toEqual(
      workerControls.reconnected.eventSequences.map((_sequence, index) => index + 1),
    );

    const badHandshake = await page.evaluate(async ({ url }) => new Promise<number>((resolveClose) => {
      const socket = new WebSocket(url, ['vtt.v1', 'bearer.invalid']);
      socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
      socket.addEventListener('error', () => undefined, { once: true });
    }), { url: websocketUrl });
    expect(badHandshake).toBe(1006);

    const websocket = await page.evaluate(async ({ url, bearer, playerBearer, badUrl }) => {
      const closeCodes: Array<number | undefined> = [];
      let throwAfterClose = false;
      const NativeWebSocket = WebSocket;
      class TrackingWebSocket extends NativeWebSocket {
        override close(code?: number, reason?: string): void {
          closeCodes.push(code);
          super.close(code, reason);
          if (throwAfterClose) {
            throwAfterClose = false;
            throw new DOMException('Injected close failure.', 'InvalidStateError');
          }
        }
      }
      globalThis.WebSocket = TrackingWebSocket;
      interface Response {
        readonly id: string;
        readonly ok: boolean;
        readonly result?: Readonly<Record<string, unknown>>;
        readonly error?: { readonly code: string };
      }
      interface Event {
        readonly event: 'scene.snapshot';
        readonly seq: number;
        readonly data: {
          readonly revision: number;
          readonly tokens: readonly { readonly id: string; readonly x: number; readonly y: number; readonly z: number }[];
          readonly doors: readonly { readonly id: string; readonly open: boolean }[];
        };
      }
      interface BrowserTransport {
        request(request: unknown): Promise<Response>;
        initialSnapshot(): Promise<Event['data']>;
        subscribe(listener: (event: Event) => void): () => void;
        subscribeErrors(listener: (error: { readonly fault: { readonly code: string } }) => void): () => void;
        status(): string;
        close(): void;
        pendingRequestCount(): number;
        negotiatedProtocol(): string;
        endpointUrl(): string;
      }
      const modulePath = '/src/vtt/handoff/websocket-transport.ts';
      const loaded = await import(/* @vite-ignore */ modulePath) as unknown;
      const Constructor = Reflect.get(loaded as object, 'WebSocketSceneTransport') as
        new (endpoint: string, token: string) => BrowserTransport;
      const transport = new Constructor(url, bearer);
      const events: Event[] = [];
      transport.subscribe((event) => events.push(event));
      const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
      const initial = await transport.initialSnapshot();
      const correlated = await Promise.all(['a', 'b'].map((suffix) =>
        transport.request({ v: 1, id: 'snapshot:' + suffix, method: 'scene.snapshot', params: {} })));
      const unsupported = await transport.request({
        v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
      });
      const doorEvent = new Promise<Event>((resolveEvent) => {
        const stop = transport.subscribe((event) => {
          if (event.data.doors.some((door) => door.id === 'object:two-room-door' && door.open)) {
            stop();
            resolveEvent(event);
          }
        });
      });
      const door = await transport.request({
        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
      });
      const changed = await doorEvent;
      const late: Event[] = [];
      const stopLate = transport.subscribe((event) => late.push(event));
      stopLate();
      const duplicate = await transport.request({
        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
      });
      const protocol = transport.negotiatedProtocol();
      const endpoint = transport.endpointUrl();
      transport.close();

      const player = new Constructor(url, playerBearer);
      const playerEvents: Event[] = [];
      player.subscribe((event) => playerEvents.push(event));
      const playerOpen = await player.request({
        v: 1, id: 'player:open', method: 'session.open',
        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
      });
      const playerInitial = await player.initialSnapshot();
      if (!playerEvents.some((event) => event.data.revision >= 2)) {
        await new Promise<void>((resolveReady, reject) => {
          const deadline = setTimeout(() => { stop(); reject(new Error('Browser player offer timed out.')); }, 2_000);
          const stop = player.subscribe((event) => {
            if (event.data.revision < 2) return;
            clearTimeout(deadline);
            stop();
            resolveReady();
          });
        });
      }
      const playerMovementEvent = new Promise<Event>((resolveMove) => {
        const stop = player.subscribe((event) => {
          if (!event.data.tokens.some((candidate) => candidate.id === 'token:two-room-goblin' && candidate.x === 7)) return;
          stop();
          resolveMove(event);
        });
      });
      const playerMove = await player.request({
        v: 1, id: 'player:move', method: 'token.move',
        params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
      });
      const playerMoved = (await playerMovementEvent).data.tokens.find((candidate) => candidate.id === 'token:two-room-goblin');
      player.close();

      const mismatch = new Constructor(url, playerBearer);
      const playerMismatch = await mismatch.request({
        v: 1, id: 'player:mismatch', method: 'session.open',
        params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
      });

      const reconnect = new Constructor(url, bearer);
      const reconnectOpen = await reconnect.request({
        v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
      });
      const reconnectSnapshot = await reconnect.initialSnapshot();
      const freshLedger = await reconnect.request({
        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
      });
      reconnect.close();

      const malformed = new Constructor(badUrl, bearer);
      const malformedResult = await new Promise<{ readonly fault: string; readonly state: string; readonly resubmission: string }>(
        (resolveFault) => {
          malformed.subscribeErrors((error) => {
            const state = malformed.status();
            void malformed.request({
              v: 1, id: 'after-fault', method: 'session.open', params: { requestedRole: 'dm' },
            }).then(
              () => resolveFault({ fault: error.fault.code, state, resubmission: 'resolved' }),
              (reason: unknown) => resolveFault({
                fault: error.fault.code,
                state,
                resubmission: reason instanceof Error ? reason.name : 'non-error',
              }),
            );
          });
        },
      );
      throwAfterClose = true;
      const throwingMalformed = new Constructor(badUrl, bearer);
      const throwingCloseState = await new Promise<string>((resolveFault) => {
        throwingMalformed.subscribeErrors(() => resolveFault(throwingMalformed.status()));
      });
      return {
        protocol, endpoint, open, initial, correlated, unsupported, door, changed, duplicate,
        sequences: events.map((event) => event.seq), lateCount: late.length,
        pending: transport.pendingRequestCount(), malformedResult, closeCodes, throwingCloseState,
        playerOpen, playerInitial, playerMove, playerMoved, playerMismatch,
        reconnectOpen, reconnectSnapshot, freshLedger,
      };
    }, {
      url: websocketUrl,
      bearer: token,
      playerBearer: playerToken,
      badUrl: 'ws://127.0.0.1:' + String(malformedPort),
    });

    expect(websocket.protocol).toBe('vtt.v1');
    expect(websocket.endpoint).not.toContain(token);
    expect(websocket.open).toMatchObject({ v: 1, id: '', ok: true });
    expect(websocket.initial).toMatchObject({
      revision: 0,
      tokens: [
        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
      ],
    });
    expect(websocket.correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
    expect(websocket.unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
    expect(websocket.door).toMatchObject({ id: 'door', ok: true });
    expect(websocket.changed).toMatchObject({ event: 'scene.snapshot', data: { doors: expect.arrayContaining([
      expect.objectContaining({ id: 'object:two-room-door', open: true }),
    ]) } });
    expect(websocket.door.result?.revision).toBe(websocket.changed.data.revision);
    expect(websocket.duplicate).toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
    expect(websocket.playerOpen).toMatchObject({ id: 'player:open', ok: true });
    expect(websocket.playerInitial.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4, z: 0 }),
    ]));
    expect(websocket.playerMove).toMatchObject({ id: 'player:move', ok: true });
    expect(websocket.playerMoved).toMatchObject({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 });
    expect(websocket.playerMismatch).toMatchObject({ id: 'player:mismatch', ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(websocket.reconnectOpen).toMatchObject({ id: '', ok: true });
    expect(websocket.reconnectSnapshot).toMatchObject({ revision: 0 });
    expect(websocket.freshLedger).toMatchObject({ id: 'door', ok: true });
    expect(websocket.sequences).toEqual(websocket.sequences.map((_sequence, index) => index + 1));
    expect(websocket.lateCount).toBe(1);
    expect(websocket.pending).toBe(0);
    expect(websocket.closeCodes).toEqual([1000, 1000, 1000, 4000, 4000]);
    expect(websocket.throwingCloseState).toBe('closed');
    expect(websocket.malformedResult).toEqual({
      fault: 'PROTOCOL_ERROR', state: 'closed', resubmission: 'SceneTransportClosedError',
    });
    await expect(malformedClose).resolves.toBe(4000);
    await testInfo.attach('vtt-runtime-parity', {
      body: JSON.stringify({
        artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z',
        nodePort, browserOrigin: vttHandoffBrowserOrigin,
        scenarios: TRANSPORT_CONFORMANCE_SCENARIO_NAMES.length,
      }),
      contentType: 'application/json',
    });
    expect((runtimeOutput + '\n' + runtimeErrors)).not.toContain(token);
  } finally {
    await new Promise<void>((resolveClose, reject) => malformedServer.close((error) =>
      error === undefined ? resolveClose() : reject(error)));
    if (runtime.exitCode === null && runtime.signalCode === null) {
      const exited = new Promise<void>((resolveExit) => runtime.once('exit', () => resolveExit()));
      runtime.kill('SIGTERM');
      await exited;
    }
    rmSync(viteConfig, { force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
