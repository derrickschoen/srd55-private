import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {} from '../../../src/vtt/handoff/worker-harness';
import { vttHandoffBrowserOrigin } from './playwright.config';

test('pairs the real Worker and ephemeral Node WebSocket on the fixed two-room scene', async ({ page }, testInfo) => {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-browser-runtime-parity-'));
  const token = 'browser-runtime-parity-secret';
  const tokensFile = resolve(root, 'tokens.json');
  writeFileSync(tokensFile, JSON.stringify([{
    tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
  }]), { mode: 0o600 });
  chmodSync(tokensFile, 0o600);
  const viteConfig = resolve('/tmp', `vtt-runtime-playwright-${String(process.pid)}.config.mjs`);
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
    runtime.once('exit', (code) => reject(new Error(`Runtime exited ${String(code)}: ${runtimeErrors}`)));
    runtime.once('error', reject);
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

    const badHandshake = await page.evaluate(async ({ url }) => new Promise<number>((resolveClose) => {
      const socket = new WebSocket(url, ['vtt.v1', 'bearer.invalid']);
      socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
      socket.addEventListener('error', () => undefined, { once: true });
    }), { url: websocketUrl });
    expect(badHandshake).toBe(1006);

    const websocket = await page.evaluate(async ({ url, bearer }) => new Promise<{
      readonly protocol: string;
      readonly url: string;
      readonly open: unknown;
      readonly initial: unknown;
      readonly correlated: readonly unknown[];
      readonly unsupported: unknown;
      readonly door: unknown;
      readonly doorEvent: unknown;
      readonly duplicate: unknown;
      readonly closeCode: number;
    }>((resolveResult, reject) => {
      const socket = new WebSocket(url, ['vtt.v1', `bearer.${bearer}`]);
      const messages: unknown[] = [];
      const waitFor = (predicate: (value: unknown) => boolean): Promise<unknown> => new Promise((resolveMessage) => {
        const existing = messages.find(predicate);
        if (existing !== undefined) { resolveMessage(existing); return; }
        const listener = (event: MessageEvent<string>): void => {
          const value = JSON.parse(event.data) as unknown;
          messages.push(value);
          if (!predicate(value)) return;
          socket.removeEventListener('message', listener);
          resolveMessage(value);
        };
        socket.addEventListener('message', listener);
      });
      socket.addEventListener('error', () => reject(new Error('WebSocket parity connection failed.')), { once: true });
      socket.addEventListener('open', () => {
        void (async () => {
          const openPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === '');
          const initialPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'event') === 'scene.snapshot');
          socket.send(JSON.stringify({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }));
          const open = await openPromise;
          const initial = await initialPromise;
          const correlated = await Promise.all(['a', 'b'].map(async (suffix) => {
            const id = `snapshot:${suffix}`;
            const response = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === id);
            socket.send(JSON.stringify({ v: 1, id, method: 'scene.snapshot', params: {} }));
            return response;
          }));
          const unsupportedPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'light');
          socket.send(JSON.stringify({ v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false } }));
          const unsupported = await unsupportedPromise;
          const doorPromise = waitFor((value) => typeof value === 'object' && value !== null && Reflect.get(value, 'id') === 'door');
          const doorEventPromise = waitFor((value) => {
            if (typeof value !== 'object' || value === null || Reflect.get(value, 'event') !== 'scene.snapshot') return false;
            const data = Reflect.get(value, 'data');
            if (typeof data !== 'object' || data === null) return false;
            const doors = Reflect.get(data, 'doors');
            return Array.isArray(doors) && doors.some((doorValue) =>
              typeof doorValue === 'object' && doorValue !== null && Reflect.get(doorValue, 'open') === true);
          });
          socket.send(JSON.stringify({ v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true } }));
          const door = await doorPromise;
          const doorEvent = await doorEventPromise;
          const duplicatePromise = waitFor((value) => {
            if (typeof value !== 'object' || value === null || Reflect.get(value, 'id') !== 'door') return false;
            const error = Reflect.get(value, 'error');
            return typeof error === 'object' && error !== null;
          });
          socket.send(JSON.stringify({ v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false } }));
          const duplicate = await duplicatePromise;
          const closeCode = await new Promise<number>((resolveClose) => {
            socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
            socket.close(1000, 'parity complete');
          });
          resolveResult({ protocol: socket.protocol, url: socket.url, open, initial, correlated, unsupported, door, doorEvent, duplicate, closeCode });
        })().catch(reject);
      }, { once: true });
    }), { url: websocketUrl, bearer: token });

    expect(websocket.protocol).toBe('vtt.v1');
    expect(websocket.url).not.toContain(token);
    expect(websocket.open).toMatchObject({ v: 1, id: '', ok: true });
    expect(websocket.initial).toMatchObject({
      v: 1, event: 'scene.snapshot', seq: 1,
      data: {
        revision: 0,
        tokens: [
          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
        ],
      },
    });
    expect(websocket.correlated.map((value) => typeof value === 'object' && value !== null ? Reflect.get(value, 'id') : null))
      .toEqual(['snapshot:a', 'snapshot:b']);
    expect(websocket.unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
    expect(websocket.door).toMatchObject({ id: 'door', ok: true });
    expect(websocket.doorEvent).toMatchObject({ event: 'scene.snapshot', data: { doors: expect.arrayContaining([
      expect.objectContaining({ id: 'object:two-room-door', open: true }),
    ]) } });
    if (
      typeof websocket.door !== 'object' || websocket.door === null ||
      typeof websocket.doorEvent !== 'object' || websocket.doorEvent === null
    ) throw new Error('WebSocket door evidence is unavailable.');
    const doorResult = Reflect.get(websocket.door, 'result');
    const doorData = Reflect.get(websocket.doorEvent, 'data');
    expect(typeof doorResult === 'object' && doorResult !== null ? Reflect.get(doorResult, 'revision') : null)
      .toBe(typeof doorData === 'object' && doorData !== null ? Reflect.get(doorData, 'revision') : null);
    expect(websocket.duplicate).toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
    expect(websocket.closeCode).toBe(1000);
    await testInfo.attach('vtt-runtime-parity', {
      body: JSON.stringify({ artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z', nodePort, browserOrigin: vttHandoffBrowserOrigin }),
      contentType: 'application/json',
    });
    expect(`${runtimeOutput}\n${runtimeErrors}`).not.toContain(token);
  } finally {
    if (runtime.exitCode === null && runtime.signalCode === null) {
      const exited = new Promise<void>((resolveExit) => runtime.once('exit', () => resolveExit()));
      runtime.kill('SIGTERM');
      await exited;
    }
    rmSync(viteConfig, { force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
