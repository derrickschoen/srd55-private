import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket, type RawData } from 'ws';
import {
  createVttNodeRuntime, VTT_RUNTIME_MAX_PAYLOAD, VTT_RUNTIME_OPEN_DEADLINE_MS,
  type VttNodeRuntime,
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

function closeCode(socket: WebSocket): Promise<number> {
  return new Promise((resolveCode) => socket.once('close', (code) => resolveCode(code)));
}

async function open(socket: WebSocket, id = ''): Promise<readonly [unknown, unknown]> {
  const messages = nextMessages(socket, 2);
  socket.send(JSON.stringify({ v: 1, id, method: 'session.open', params: { requestedRole: 'dm' } }));
  const [response, snapshot] = await messages;
  return [response, snapshot];
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
