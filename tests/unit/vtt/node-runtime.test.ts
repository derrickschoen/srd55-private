import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { createConnection, type Socket } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket, type RawData } from 'ws';
import type { DmSessionSnapshotEvent } from '../../../src/vtt/encounter-session-service';
import type { ProtocolSessionPort } from '../../../src/vtt/handoff/protocol-runtime';
import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
import {
  createDefaultNodeRuntimeSession, createVttNodeRuntime, VTT_RUNTIME_MAX_PAYLOAD,
  VTT_RUNTIME_OPEN_DEADLINE_MS, type NodeRuntimeSession, type VttNodeRuntime,
} from '../../../tools/vtt-handoff/node-runtime';

const ORIGIN = 'http://127.0.0.1:4430';
const PLAYER_A = 'combatant:two-room-adventurer';
const PLAYER_B = 'combatant:two-room-goblin';
const roots: string[] = [];
const runtimes: VttNodeRuntime[] = [];

function temporaryRoot(): string {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-runtime-test-'));
  roots.push(root);
  return root;
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function claimsFile(claims: readonly Readonly<Record<string, unknown>>[]): string {
  const path = resolve(temporaryRoot(), 'tokens.json');
  writeFileSync(path, `${JSON.stringify(claims)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

async function runtime(claims: readonly Readonly<Record<string, unknown>>[], options: {
  readonly allowOriginless?: boolean;
  readonly openDeadlineMs?: number;
} = {}): Promise<{ readonly runtime: VttNodeRuntime; readonly url: string }> {
  const instance = createVttNodeRuntime({
    tokensFile: claimsFile(claims),
    allowedOrigins: new Set([ORIGIN]),
    ...options,
  });
  runtimes.push(instance);
  const address = await instance.listen(0);
  return { runtime: instance, url: address.websocketUrl };
}

function connect(url: string, token: string, origin: string | undefined = ORIGIN): Promise<WebSocket> {
  return new Promise((resolveSocket, reject) => {
    const socket = new WebSocket(url, ['vtt.v1', `bearer.${token}`], origin === undefined ? {} : { origin });
    socket.once('open', () => resolveSocket(socket));
    socket.once('error', reject);
  });
}

function nextMessages(socket: WebSocket, count: number): Promise<readonly unknown[]> {
  return new Promise((resolveMessage, reject) => {
    const messages: unknown[] = [];
    const receive = (data: RawData, isBinary: boolean): void => {
      try {
        if (isBinary) throw new Error('Expected text.');
        messages.push(JSON.parse(data.toString()) as unknown);
        if (messages.length === count) {
          socket.off('message', receive);
          resolveMessage(messages);
        }
      } catch (error: unknown) { socket.off('message', receive); reject(error); }
    };
    socket.on('message', receive);
  });
}

async function nextMessage(socket: WebSocket): Promise<unknown> { return (await nextMessages(socket, 1))[0]; }

function bounded<T>(operation: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`${label} exceeded one second.`)), 1_000)),
  ]);
}

function nextMessagesBounded(socket: WebSocket, count: number, label: string): Promise<readonly unknown[]> {
  return new Promise((resolveMessages, reject) => {
    const messages: unknown[] = [];
    const deadline = setTimeout(() => {
      socket.off('message', receive);
      reject(new Error(`${label} received ${String(messages.length)} of ${String(count)} messages: ${JSON.stringify(messages)}`));
    }, 1_000);
    const receive = (data: RawData, isBinary: boolean): void => {
      if (isBinary) { clearTimeout(deadline); reject(new Error(`${label} received binary data.`)); return; }
      messages.push(JSON.parse(data.toString()) as unknown);
      if (messages.length !== count) return;
      clearTimeout(deadline);
      socket.off('message', receive);
      resolveMessages(messages);
    };
    socket.on('message', receive);
  });
}

function closeCode(socket: WebSocket): Promise<number> {
  return new Promise((resolveCode) => socket.once('close', (code) => resolveCode(code)));
}

function rawUpgradePeer(url: string, token: string, pauseAfterUpgrade = true): Promise<Socket> {
  const endpoint = new URL(url);
  return new Promise((resolveSocket, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: Number(endpoint.port) });
    let headers = '';
    socket.once('error', reject);
    socket.on('data', (chunk: Buffer) => {
      headers += chunk.toString('latin1');
      if (!headers.includes('\r\n\r\n')) return;
      try {
        expect(headers).toMatch(/^HTTP\/1\.1 101 /u);
        socket.removeAllListeners('data');
        if (pauseAfterUpgrade) socket.pause();
        resolveSocket(socket);
      } catch (error: unknown) { reject(error); }
    });
    socket.once('connect', () => socket.write([
      `GET ${endpoint.pathname} HTTP/1.1`,
      `Host: 127.0.0.1:${endpoint.port}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Key: MDEyMzQ1Njc4OWFiY2RlZg==',
      'Sec-WebSocket-Version: 13',
      `Origin: ${ORIGIN}`,
      `Sec-WebSocket-Protocol: vtt.v1, bearer.${token}`,
      '', '',
    ].join('\r\n')));
  });
}

function maskedTextFrame(text: string): Buffer {
  const payload = Buffer.from(text);
  if (payload.byteLength >= 126) throw new Error('The raw test frame must use the short length form.');
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const frame = Buffer.alloc(2 + mask.byteLength + payload.byteLength);
  frame[0] = 0x81;
  frame[1] = 0x80 | payload.byteLength;
  mask.copy(frame, 2);
  for (let index = 0; index < payload.byteLength; index += 1) {
    const maskByte = mask[index % mask.byteLength];
    const payloadByte = payload[index];
    if (maskByte === undefined || payloadByte === undefined) throw new Error('Raw frame indexing failed.');
    frame[6 + index] = payloadByte ^ maskByte;
  }
  return frame;
}

interface RawHandshakeOverrides {
  readonly host?: string;
  readonly key?: string;
  readonly version?: string;
  readonly origin?: string | null;
  readonly protocols?: string;
}

function rawUpgradeStatus(url: string, overrides: RawHandshakeOverrides): Promise<number> {
  const endpoint = new URL(url);
  const originLine = overrides.origin === null ? [] : [`Origin: ${overrides.origin ?? ORIGIN}`];
  return new Promise((resolveStatus, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: Number(endpoint.port) });
    let response = '';
    socket.setTimeout(1_000, () => { socket.destroy(); reject(new Error('Handshake response timed out.')); });
    socket.once('error', reject);
    socket.on('data', (chunk: Buffer) => {
      response += chunk.toString('latin1');
      if (!response.includes('\r\n\r\n')) return;
      const status = /^HTTP\/1\.1 (\d{3}) /u.exec(response)?.[1];
      socket.destroy();
      if (status === undefined) reject(new Error('Handshake response had no HTTP status.'));
      else resolveStatus(Number(status));
    });
    socket.once('connect', () => socket.write([
      `GET ${endpoint.pathname} HTTP/1.1`,
      `Host: ${overrides.host ?? `127.0.0.1:${endpoint.port}`}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Key: ${overrides.key ?? 'MDEyMzQ1Njc4OWFiY2RlZg=='}`,
      `Sec-WebSocket-Version: ${overrides.version ?? '13'}`,
      ...originLine,
      `Sec-WebSocket-Protocol: ${overrides.protocols ?? 'vtt.v1, bearer.dm-secret'}`,
      '', '',
    ].join('\r\n')));
  });
}

async function open(socket: WebSocket, id = ''): Promise<readonly [unknown, unknown]> {
  const messages = nextMessages(socket, 2);
  socket.send(JSON.stringify({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } }));
  const [response, snapshot] = await messages;
  return [response, snapshot];
}

function receiptThenAutonomousSession(): NodeRuntimeSession {
  const base = createDefaultNodeRuntimeSession({ role: 'dm' });
  const listeners = new Set<(event: DmSessionSnapshotEvent) => void>();
  let lastSequence = 0;
  const service: ProtocolSessionPort = {
    sessionId: base.service.sessionId,
    dmSnapshot: () => base.service.dmSnapshot(),
    dmCapture: () => base.service.dmCapture(),
    playerSnapshot: (playerId) => base.service.playerSnapshot(playerId),
    playerCapture: (playerId) => base.service.playerCapture(playerId),
    subscribeDm: (listener) => {
      listeners.add(listener);
      const unsubscribe = base.service.subscribeDm((event) => {
        lastSequence = event.seq;
        listener(event);
      });
      return () => { listeners.delete(listener); unsubscribe(); };
    },
    subscribePlayer: (playerId, listener) => base.service.subscribePlayer(playerId, listener),
    submitOfferedAction: (input) => base.service.submitOfferedAction(input),
    setDoor: async (input) => {
      const capture = base.service.dmCapture();
      const revision = capture.projection.encounter.revision + 1;
      const projection = {
        ...capture.projection,
        encounter: { ...capture.projection.encounter, revision },
      };
      lastSequence += 1;
      const receipt: DmSessionSnapshotEvent = {
        kind: 'mutation', seq: lastSequence, projection, tokenBindings: capture.tokenBindings,
        ...(input.invocationToken === undefined ? {} : {
          terminalReceipt: { invocationToken: input.invocationToken, revision },
        }),
      };
      for (const listener of listeners) listener(receipt);
      lastSequence += 1;
      const reaction: DmSessionSnapshotEvent = {
        kind: 'autonomous', seq: lastSequence, projection, tokenBindings: capture.tokenBindings,
      };
      for (const listener of listeners) listener(reaction);
      return { kind: 'committed', revision, changed: true, event: receipt };
    },
    close: () => base.service.close(),
  };
  return { service, seats: base.seats, art: base.art };
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((instance) => instance.close()));
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('VTT Node WebSocket runtime', () => {
  it('validates bounded nonsymlink mode-0600 claims before listening', () => {
    const root = temporaryRoot();
    const valid = resolve(root, 'valid.json');
    writeFileSync(valid, `${JSON.stringify([{ tokenSha256: hash('dm-secret'), role: 'dm' }])}\n`, { mode: 0o600 });
    chmodSync(valid, 0o600);
    const created = createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) });
    runtimes.push(created);
    expect(created.listening()).toBe(false);

    chmodSync(valid, 0o644);
    expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('mode 0600');
    chmodSync(valid, 0o600);
    const link = resolve(root, 'link.json');
    symlinkSync(valid, link);
    expect(() => createVttNodeRuntime({ tokensFile: link, allowedOrigins: new Set([ORIGIN]) })).toThrow('nonsymlink');
    writeFileSync(valid, `${JSON.stringify([
      { tokenSha256: hash('duplicate'), role: 'dm' },
      { tokenSha256: hash('duplicate'), role: 'dm' },
    ])}\n`, { mode: 0o600 });
    expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('duplicate');
    writeFileSync(valid, `${JSON.stringify([{ tokenSha256: hash('player'), role: 'player' }])}\n`, { mode: 0o600 });
    expect(() => createVttNodeRuntime({ tokensFile: valid, allowedOrigins: new Set([ORIGIN]) })).toThrow('invalid claims');
  });

  it('validates token-file identity, permissions, and size on the opened descriptor', () => {
    const permissionPath = claimsFile([{ tokenSha256: hash('permission-race'), role: 'dm' }]);
    expect(() => createVttNodeRuntime({
      tokensFile: permissionPath,
      allowedOrigins: new Set([ORIGIN]),
      tokenFileHooks: { afterOpenInspection: () => chmodSync(permissionPath, 0o644) },
    })).toThrow('mode 0600');

    const growingPath = claimsFile([{ tokenSha256: hash('growing-race'), role: 'dm' }]);
    expect(() => createVttNodeRuntime({
      tokensFile: growingPath,
      allowedOrigins: new Set([ORIGIN]),
      tokenFileHooks: {
        afterOpenInspection: () => writeFileSync(growingPath, 'x'.repeat(65_536), { flag: 'a' }),
      },
    })).toThrow('exceeds 65536 bytes');

    const swappedPath = claimsFile([{ tokenSha256: hash('symlink-race'), role: 'dm' }]);
    const movedPath = resolve(swappedPath, '..', 'moved-tokens.json');
    expect(() => createVttNodeRuntime({
      tokensFile: swappedPath,
      allowedOrigins: new Set([ORIGIN]),
      tokenFileHooks: {
        afterOpenInspection: () => {
          renameSync(swappedPath, movedPath);
          symlinkSync(movedPath, swappedPath);
        },
      },
    })).toThrow('changed while it was opened');
  });

  it('refuses a FIFO without blocking and proves removing O_NONBLOCK exceeds the bounded deadline', () => {
    const root = temporaryRoot();
    const fifo = resolve(root, 'tokens.fifo');
    execFileSync('mkfifo', [fifo]);
    const childSource = resolve(root, 'fifo-runtime-child.ts');
    const runtimeSource = resolve('tools/vtt-handoff/token-claims.ts');
    writeFileSync(childSource, [
      `import { readTokenClaims } from ${JSON.stringify(runtimeSource)};`,
      'try {',
      `  readTokenClaims(${JSON.stringify(fifo)});`,
      "  process.stderr.write('runtime unexpectedly accepted FIFO\\n');",
      '  process.exitCode = 2;',
      '} catch (error: unknown) {',
      "  process.stdout.write(error instanceof Error ? error.message + '\\n' : 'non-error rejection\\n');",
      '}',
      '',
    ].join('\n'), { mode: 0o600 });
    const tsx = resolve('node_modules/.bin/tsx');
    const actual = spawnSync(tsx, [childSource], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 2_000,
    });
    expect({ status: actual.status, signal: actual.signal, stderr: actual.stderr }).toEqual({
      status: 0, signal: null, stderr: '',
    });
    expect(actual.stdout).toBe('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.\n');

    const mutant = spawnSync(process.execPath, ['-e', [
      "const { constants, openSync } = require('node:fs');",
      `openSync(${JSON.stringify(fifo)}, constants.O_RDONLY | constants.O_NOFOLLOW);`,
    ].join('\n')], { encoding: 'utf8', timeout: 250 });
    expect(mutant.status).toBeNull();
    expect(mutant.signal).toBe('SIGTERM');
    expect(mutant.error === undefined ? undefined : Reflect.get(mutant.error, 'code')).toBe('ETIMEDOUT');
  });

  it('authenticates before upgrade, echoes only vtt.v1, and binds claims to session.open', async () => {
    const setup = await runtime([
      { tokenSha256: hash('dm-secret'), role: 'dm' },
      { tokenSha256: hash('player-a-secret'), role: 'player', playerId: PLAYER_A },
    ]);
    const failures = [
      new WebSocket(setup.url, ['vtt.v1', 'bearer.wrong'], { origin: ORIGIN }),
      new WebSocket(setup.url, ['vtt.v1', 'bearer.dm-secret'], { origin: 'http://127.0.0.1:4431' }),
      new WebSocket(setup.url.replace('/vtt/v1', '/wrong'), ['vtt.v1', 'bearer.dm-secret'], { origin: ORIGIN }),
    ];
    await Promise.all(failures.map((socket) => new Promise<void>((resolveFailure, reject) => {
      socket.once('unexpected-response', (_request, response) => {
        try { expect(response.statusCode).toBe(401); resolveFailure(); } catch (error: unknown) { reject(error); }
      });
      socket.once('open', () => reject(new Error('Bad handshake unexpectedly opened.')));
      socket.once('error', () => undefined);
    })));
    expect(setup.runtime.sessionCounts()).toEqual({ created: 0, active: 0 });

    await expect(rawUpgradeStatus(setup.url, { host: 'localhost' })).resolves.toBe(401);
    await expect(rawUpgradeStatus(setup.url, { key: 'not-a-websocket-key' })).resolves.toBe(401);
    await expect(rawUpgradeStatus(setup.url, { version: '12' })).resolves.toBe(401);
    await expect(rawUpgradeStatus(setup.url, { origin: null })).resolves.toBe(401);
    await expect(rawUpgradeStatus(setup.url, {
      protocols: 'vtt.v1, bearer.dm-secret, bearer.player-a-secret',
    })).resolves.toBe(401);
    expect(setup.runtime.sessionCounts()).toEqual({ created: 0, active: 0 });

    const dm = await connect(setup.url, 'dm-secret');
    expect(dm.protocol).toBe('vtt.v1');
    const [openResponse, snapshot] = await open(dm);
    expect(openResponse).toMatchObject({ v: 1, id: '', ok: true, result: { capabilities: ['scene.snapshot', 'token.move', 'door.set'] } });
    expect(snapshot).toMatchObject({ v: 1, event: 'scene.snapshot', seq: 1, data: { revision: 0 } });

    const player = await connect(setup.url, 'player-a-secret');
    const refused = nextMessage(player);
    const closing = closeCode(player);
    player.send(JSON.stringify({ v: 1, id: 'wrong-role', method: 'session.open', params: { requestedRole: 'dm' } }));
    await expect(refused).resolves.toMatchObject({ id: 'wrong-role', ok: false, error: { code: 'UNAUTHORIZED' } });
    await expect(closing).resolves.toBe(1008);
    const playerIdMismatch = await connect(setup.url, 'player-a-secret');
    const mismatchResponse = nextMessage(playerIdMismatch);
    const mismatchClosing = closeCode(playerIdMismatch);
    playerIdMismatch.send(JSON.stringify({
      v: 1, id: 'wrong-player', method: 'session.open',
      params: { requestedRole: 'player', playerId: PLAYER_B },
    }));
    await expect(mismatchResponse).resolves.toMatchObject({
      id: 'wrong-player', ok: false, error: { code: 'UNAUTHORIZED' },
    });
    await expect(mismatchClosing).resolves.toBe(1008);
    dm.close();
  });

  it('handles fragmentation and ping/pong while rejecting binary, malformed, oversized, and late-open clients', async () => {
    expect(VTT_RUNTIME_OPEN_DEADLINE_MS).toBe(5_000);
    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }], { openDeadlineMs: 40 });
    const fragmented = await connect(setup.url, 'dm-secret');
    const messages = nextMessages(fragmented, 2);
    const wire = JSON.stringify({ v: 1, id: 'fragmented', method: 'session.open', params: { requestedRole: 'dm' } });
    fragmented.send(wire.slice(0, 10), { fin: false });
    fragmented.send(wire.slice(10), { fin: true });
    const [response, snapshot] = await messages;
    expect(response).toMatchObject({ id: 'fragmented', ok: true });
    expect(snapshot).toMatchObject({ event: 'scene.snapshot', seq: 1 });
    const pong = new Promise<Buffer>((resolvePong) => fragmented.once('pong', resolvePong));
    fragmented.ping('alive');
    await expect(pong).resolves.toEqual(Buffer.from('alive'));
    fragmented.close();

    const binary = await connect(setup.url, 'dm-secret');
    const binaryClosed = closeCode(binary);
    binary.send(Buffer.from([1, 2, 3]), { binary: true });
    await expect(binaryClosed).resolves.toBe(1002);

    const malformed = await connect(setup.url, 'dm-secret');
    const malformedClosed = closeCode(malformed);
    malformed.send('{');
    await expect(malformedClosed).resolves.toBe(1007);

    const oversized = await connect(setup.url, 'dm-secret');
    const oversizedClosed = closeCode(oversized);
    oversized.send('x'.repeat(VTT_RUNTIME_MAX_PAYLOAD + 1));
    await expect(oversizedClosed).resolves.toBe(1009);

    const late = await connect(setup.url, 'dm-secret');
    await expect(closeCode(late)).resolves.toBe(1008);
  });

  it('terminates a physical peer that withholds its close response during factory shutdown', async () => {
    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }], { openDeadlineMs: 20 });
    const peer = await rawUpgradePeer(setup.url, 'dm-secret');
    const peerClosed = new Promise<void>((resolveClosed) => peer.once('close', () => resolveClosed()));
    await new Promise<void>((resolveWait) => setTimeout(resolveWait, 40));
    await expect(Promise.race([
      setup.runtime.close(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Factory shutdown exceeded one second.')), 1_000)),
    ])).resolves.toBeUndefined();
    peer.resume();
    await expect(peerClosed).resolves.toBeUndefined();
    expect(setup.runtime.sessionCounts().active).toBe(0);
  });

  it('contains a malformed frame received while a policy-closing peer is still physical', async () => {
    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }]);
    const peer = await rawUpgradePeer(setup.url, 'dm-secret', false);
    const peerClosed = new Promise<void>((resolveClosed) => peer.once('close', () => resolveClosed()));
    peer.write(maskedTextFrame(JSON.stringify({
      v: 1, id: 'before-open', method: 'scene.snapshot', params: {},
    })));
    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 20));
    peer.write(Buffer.from([0x83, 0x00]));
    await new Promise<void>((resolveTurn) => setTimeout(resolveTurn, 20));
    await expect(bounded(setup.runtime.close(), 'closing-frame factory shutdown')).resolves.toBeUndefined();
    await expect(bounded(peerClosed, 'closing-frame physical close')).resolves.toBeUndefined();
    expect(peer.destroyed).toBe(true);
    expect(setup.runtime.sessionCounts()).toEqual({ created: 1, active: 0 });
  });

  it('uses fresh logical sessions and refuses reused wire ids before dispatch', async () => {
    const setup = await runtime([{ tokenSha256: hash('dm-secret'), role: 'dm' }]);
    const first = await connect(setup.url, 'dm-secret');
    const second = await connect(setup.url, 'dm-secret');
    const [firstOpen] = await open(first, 'open');
    const [secondOpen] = await open(second, 'open');
    const firstId = typeof firstOpen === 'object' && firstOpen !== null ? Reflect.get(Reflect.get(firstOpen, 'result'), 'sessionId') : null;
    const secondId = typeof secondOpen === 'object' && secondOpen !== null ? Reflect.get(Reflect.get(secondOpen, 'result'), 'sessionId') : null;
    expect(typeof firstId).toBe('string');
    expect(typeof secondId).toBe('string');
    expect(firstId).not.toBe(secondId);
    const doorMessages = nextMessages(first, 2);
    first.send(JSON.stringify({ v: 1, id: 'door-once', method: 'door.set', params: { doorId: 'object:two-room-door', open: true } }));
    const [door, doorEvent] = await doorMessages;
    expect(door).toMatchObject({ id: 'door-once', ok: true });
    expect(doorEvent).toMatchObject({ event: 'scene.snapshot' });
    const duplicate = nextMessage(first);
    first.send(JSON.stringify({ v: 1, id: 'door-once', method: 'door.set', params: { doorId: 'object:two-room-door', open: false } }));
    await expect(duplicate).resolves.toMatchObject({ id: 'door-once', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
    expect(setup.runtime.sessionCounts()).toEqual({ created: 2, active: 2 });
    first.close();
    second.close();
  });

  it('sends a receipt response before its event and queues a synchronous autonomous reaction in sequence', async () => {
    const token = 'ordered-secret';
    const instance = createVttNodeRuntime({
      tokensFile: claimsFile([{ tokenSha256: hash(token), role: 'dm' }]),
      allowedOrigins: new Set([ORIGIN]), allowOriginless: true,
      createSession: () => receiptThenAutonomousSession(),
    });
    runtimes.push(instance);
    const address = await instance.listen(0);
    const socket = await connect(address.websocketUrl, token);
    await bounded(open(socket, 'open'), 'ordered open');
    const publication = nextMessagesBounded(socket, 3, 'ordered publication');
    socket.send(JSON.stringify({
      v: 1, id: 'door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }));
    const [response, receipt, reaction] = await publication;
    expect(response).toMatchObject({ id: 'door', ok: true });
    expect(receipt).toMatchObject({ event: 'scene.snapshot', seq: 2 });
    expect(reaction).toMatchObject({ event: 'scene.snapshot', seq: 3 });
    socket.close();

    const observerTransport = new WebSocketSceneTransport(address.websocketUrl, token);
    await bounded(observerTransport.request({
      v: 1, id: 'observer-open', method: 'session.open', params: { requestedRole: 'dm' },
    }), 'observer open');
    await bounded(observerTransport.initialSnapshot(), 'observer initial snapshot');
    observerTransport.subscribe((event) => { if (event.seq > 1) observerTransport.close(); });
    await expect(bounded(observerTransport.request({
      v: 1, id: 'observer-door', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    }), 'observer receipt')).resolves.toMatchObject({ id: 'observer-door', ok: true });
    expect(observerTransport.status()).toBe('closed');
    expect(observerTransport.pendingRequestCount()).toBe(0);
  });

  it('binds two player claims independently and refuses cross-seat token authority', async () => {
    const setup = await runtime([
      { tokenSha256: hash('player-a-secret'), role: 'player', playerId: PLAYER_A },
      { tokenSha256: hash('player-b-secret'), role: 'player', playerId: PLAYER_B },
    ]);
    const playerA = await connect(setup.url, 'player-a-secret');
    const playerB = await connect(setup.url, 'player-b-secret');
    const playerAOpening = nextMessages(playerA, 2);
    playerA.send(JSON.stringify({
      v: 1, id: 'open:a', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
    }));
    const [playerAResponse] = await playerAOpening;
    expect(playerAResponse).toMatchObject({ id: 'open:a', ok: true });
    const playerBOpening = nextMessages(playerB, 3);
    playerB.send(JSON.stringify({
      v: 1, id: 'open:b', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_B },
    }));
    const [playerBResponse, playerBSnapshot, autonomousSnapshot] = await playerBOpening;
    expect(playerBResponse).toMatchObject({ id: 'open:b', ok: true });
    expect(playerBSnapshot).toMatchObject({ event: 'scene.snapshot', data: { tokens: expect.arrayContaining([
      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4 }),
    ]) } });
    expect(autonomousSnapshot).toMatchObject({ event: 'scene.snapshot', data: { revision: 1 } });

    const crossSeat = nextMessage(playerB);
    playerB.send(JSON.stringify({
      v: 1, id: 'cross-seat', method: 'token.move',
      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
    }));
    await expect(crossSeat).resolves.toMatchObject({ id: 'cross-seat', ok: false, error: { code: 'FORBIDDEN' } });
    const ownMove = nextMessages(playerB, 2);
    playerB.send(JSON.stringify({
      v: 1, id: 'own-move', method: 'token.move',
      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
    }));
    const [moveResponse, moveEvent] = await ownMove;
    expect(moveResponse).toMatchObject({ id: 'own-move', ok: true, result: { revision: 3 } });
    expect(moveEvent).toMatchObject({ event: 'scene.snapshot', data: { revision: 3, tokens: expect.arrayContaining([
      expect.objectContaining({ id: 'token:two-room-goblin', x: 7, y: 4 }),
    ]) } });
    expect(setup.runtime.sessionCounts()).toEqual({ created: 2, active: 2 });
    playerA.close();
    playerB.close();
  });
});
