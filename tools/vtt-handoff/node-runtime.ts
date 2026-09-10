import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { lstatSync, openSync, closeSync, readFileSync, fstatSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import { z } from 'zod';
import type { CombatantId } from '../../src/combat/values';
import type { EncounterState } from '../../src/combat/encounter';
import type { LegalActionSummary } from '../../src/combat/controllers';
import { DmEncounterHost } from '../../src/vtt/dm-encounter-host';
import { EncounterSessionService, type PlayerSeatRegistration } from '../../src/vtt/encounter-session-service';
import type { EncounterArtPackage } from '../../src/vtt/encounter-package';
import { encounterSeed } from '../../src/vtt/session-seed';
import { MemoryBrowserSessionStore } from '../../src/vtt/session-persistence';
import {
  buildTwoRoomEncounter, TWO_ROOM_ADVENTURER_ID, TWO_ROOM_SEED, twoRoomArtPackage,
} from '../../src/vtt/handoff/fixtures/two-room';
import {
  HANDOFF_WEBSOCKET_CLOSE_CODES, ProtocolRuntime, type HandoffResponse,
  type ProtocolSessionPort, type SceneSnapshotEvent,
} from '../../src/vtt/handoff/protocol-runtime';
import type { HandoffPrincipal } from '../../src/vtt/handoff/session-authorizer';

export const VTT_RUNTIME_PATH = '/vtt/v1';
export const VTT_RUNTIME_MAX_PAYLOAD = 1_048_576;
export const VTT_RUNTIME_OPEN_DEADLINE_MS = 5_000;
const MAX_TOKEN_FILE_BYTES = 65_536;

const tokenClaimSchema = z.strictObject({
  tokenSha256: z.string().regex(/^[0-9a-f]{64}$/u),
  role: z.enum(['dm', 'player']),
  playerId: z.string().min(1).optional(),
}).superRefine((claim, context) => {
  if (claim.role === 'player' && claim.playerId === undefined) {
    context.addIssue({ code: 'custom', message: 'A player token requires playerId.' });
  }
  if (claim.role === 'dm' && claim.playerId !== undefined) {
    context.addIssue({ code: 'custom', message: 'A DM token must omit playerId.' });
  }
});
const tokenClaimsSchema = z.array(tokenClaimSchema).min(1).max(1_024);

interface TokenClaim {
  readonly tokenSha256: string;
  readonly principal: HandoffPrincipal;
}

export interface NodeRuntimeSession {
  readonly service: ProtocolSessionPort;
  readonly seats: readonly PlayerSeatRegistration[];
  readonly art: EncounterArtPackage;
  readonly start?: () => Promise<void>;
}

export interface VttNodeRuntimeOptions {
  readonly tokensFile: string;
  readonly allowedOrigins: ReadonlySet<string>;
  readonly allowOriginless?: boolean;
  readonly openDeadlineMs?: number;
  readonly createSession?: (principal: HandoffPrincipal) => NodeRuntimeSession;
  readonly wireCodec?: {
    readonly parse: (text: string) => unknown;
    readonly stringify: (value: HandoffResponse | SceneSnapshotEvent) => string;
  };
}

export interface VttNodeRuntimeAddress {
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly websocketUrl: string;
}

export interface VttNodeRuntime {
  listening(): boolean;
  listen(port?: number): Promise<VttNodeRuntimeAddress>;
  close(): Promise<void>;
  sessionCounts(): { readonly created: number; readonly active: number };
}

function readTokenClaims(path: string): readonly TokenClaim[] {
  const before = lstatSync(path);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
  if ((before.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
  if (before.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
  const descriptor = openSync(path, 'r');
  try {
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was opened.');
    }
    const bytes = readFileSync(descriptor);
    if (bytes.byteLength > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
    let source: unknown;
    try { source = JSON.parse(bytes.toString('utf8')) as unknown; }
    catch { throw new Error('VTT_RUNTIME_TOKENS_FILE is not valid JSON.'); }
    const parsed = tokenClaimsSchema.safeParse(source);
    if (!parsed.success) throw new Error('VTT_RUNTIME_TOKENS_FILE has invalid claims.');
    const seen = new Set<string>();
    return parsed.data.map((claim): TokenClaim => {
      if (seen.has(claim.tokenSha256)) throw new Error('VTT_RUNTIME_TOKENS_FILE contains a duplicate token hash.');
      seen.add(claim.tokenSha256);
      return {
        tokenSha256: claim.tokenSha256,
        principal: claim.role === 'dm'
          ? { role: 'dm' }
          : (() => {
              if (claim.playerId === undefined) throw new Error('A validated player token is missing playerId.');
              return { role: 'player' as const, playerId: claim.playerId };
            })(),
      };
    });
  } finally {
    closeSync(descriptor);
  }
}

function legalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
  if (actor === TWO_ROOM_ADVENTURER_ID) return { actions: [{ type: 'end_turn', actor }] };
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  if (token === undefined) return { actions: [{ type: 'end_turn', actor }] };
  const direction = token.position.column < 5 ? 1 : -1;
  return { actions: [
    { type: 'move', actor, path: [{ column: token.position.column + direction, row: token.position.row }], cause: 'voluntary' },
    { type: 'end_turn', actor },
  ] };
}

let sessionSequence = 0;
export function createDefaultNodeRuntimeSession(_principal: HandoffPrincipal): NodeRuntimeSession {
  sessionSequence += 1;
  const state = buildTwoRoomEncounter();
  const host = new DmEncounterHost(`scene:vtt-node:${String(sessionSequence)}:${randomBytes(8).toString('hex')}`, new MemoryBrowserSessionStore(), {
    initialState: state,
    initialSeed: encounterSeed(TWO_ROOM_SEED),
    initialControllers: state.combatants.map((combatant, index) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:websocket`,
      kind: index === 0 ? 'algorithm' as const : 'human' as const,
      generation: 0,
    })),
    playerIds: state.combatants.map((combatant) => combatant.profile.id),
    turnLegalActions: legalActions,
  });
  const bindings = host.rendererTokenBindings();
  const seats: PlayerSeatRegistration[] = state.combatants.map((combatant) => ({
    playerId: String(combatant.profile.id),
    seatId: `seat:${String(combatant.profile.id)}`,
    observerCombatantId: combatant.profile.id,
    ownedCombatantIds: [combatant.profile.id],
    controlledTokenIds: bindings.filter((binding) => binding.combatantId === combatant.profile.id).map((binding) => binding.tokenId),
  }));
  const service = new EncounterSessionService(host, seats);
  return { service, seats, art: twoRoomArtPackage(), start: () => service.start() };
}

function rejectUpgrade(socket: Duplex): void {
  if (socket.destroyed) return;
  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n', () => socket.destroy());
}

function singleHeader(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function offeredProtocols(header: string): readonly string[] | null {
  const values = header.split(',').map((value) => value.trim());
  if (values.some((value) => value.length === 0) || new Set(values).size !== values.length) return null;
  return values;
}

function authenticate(request: IncomingMessage, claims: readonly TokenClaim[], options: VttNodeRuntimeOptions): HandoffPrincipal | null {
  let url: URL;
  try { url = new URL(request.url ?? '', 'http://127.0.0.1'); } catch { return null; }
  if (url.pathname !== VTT_RUNTIME_PATH || url.search !== '') return null;
  const host = singleHeader(request.headers.host);
  if (host === null || !/^127\.0\.0\.1(?::\d{1,5})?$/u.test(host)) return null;
  const hostPort = host.includes(':') ? Number(host.slice(host.lastIndexOf(':') + 1)) : null;
  if (hostPort !== null && (!Number.isSafeInteger(hostPort) || hostPort < 1 || hostPort > 65_535)) return null;
  if (singleHeader(request.headers.upgrade)?.toLowerCase() !== 'websocket') return null;
  const connection = singleHeader(request.headers.connection);
  if (connection === null || !connection.split(',').some((value) => value.trim().toLowerCase() === 'upgrade')) return null;
  const origin = singleHeader(request.headers.origin);
  if (origin === null ? options.allowOriginless !== true : !options.allowedOrigins.has(origin)) return null;
  if (singleHeader(request.headers['sec-websocket-version']) !== '13') return null;
  const key = singleHeader(request.headers['sec-websocket-key']);
  if (key === null) return null;
  let decodedKey: Buffer;
  try { decodedKey = Buffer.from(key, 'base64'); } catch { return null; }
  if (decodedKey.byteLength !== 16 || decodedKey.toString('base64') !== key) return null;
  const protocolsHeader = singleHeader(request.headers['sec-websocket-protocol']);
  if (protocolsHeader === null) return null;
  const protocols = offeredProtocols(protocolsHeader);
  if (protocols === null || protocols.length !== 2 || protocols.filter((value) => value === 'vtt.v1').length !== 1) return null;
  const bearer = protocols.find((value) => value.startsWith('bearer.'));
  if (bearer === undefined || !/^bearer\.[A-Za-z0-9_-]+$/u.test(bearer)) return null;
  const token = bearer.slice('bearer.'.length);
  const digest = createHash('sha256').update(token).digest();
  let match: TokenClaim | null = null;
  for (const claim of claims) {
    const expected = Buffer.from(claim.tokenSha256, 'hex');
    if (timingSafeEqual(digest, expected)) match = claim;
  }
  return match?.principal ?? null;
}

function failure(id: string, code: string, message: string): HandoffResponse {
  return { v: 1, id, ok: false, error: { code, message } };
}

function rawText(data: RawData): string | null {
  const bytes = Array.isArray(data)
    ? Buffer.concat(data)
    : data instanceof ArrayBuffer
      ? Buffer.from(data)
      : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; }
}

function requestFields(value: unknown): { readonly id: string | null; readonly method: string | null } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { id: null, method: null };
  const id = Reflect.get(value, 'id');
  const method = Reflect.get(value, 'method');
  return { id: typeof id === 'string' ? id : null, method: typeof method === 'string' ? method : null };
}

export function createVttNodeRuntime(options: VttNodeRuntimeOptions): VttNodeRuntime {
  const claims = readTokenClaims(options.tokensFile);
  const openDeadlineMs = options.openDeadlineMs ?? VTT_RUNTIME_OPEN_DEADLINE_MS;
  if (!Number.isSafeInteger(openDeadlineMs) || openDeadlineMs < 1) throw new RangeError('openDeadlineMs must be a positive integer.');
  const createSession = options.createSession ?? createDefaultNodeRuntimeSession;
  const wireCodec = options.wireCodec ?? {
    parse: (text: string): unknown => JSON.parse(text) as unknown,
    stringify: (value: HandoffResponse | SceneSnapshotEvent): string => JSON.stringify(value),
  };
  const server = createServer((_request, response) => {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
  });
  const sockets = new Set<WebSocket>();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: VTT_RUNTIME_MAX_PAYLOAD,
    perMessageDeflate: false,
    handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
  });
  let created = 0;
  let active = 0;
  let closePromise: Promise<void> | null = null;

  server.on('upgrade', (request, socket, head) => {
    const principal = authenticate(request, claims, options);
    if (principal === null) { rejectUpgrade(socket); return; }
    try {
      wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit('connection', websocket, request, principal);
      });
    } catch {
      rejectUpgrade(socket);
    }
  });

  wss.on('connection', (websocket: WebSocket, _request: IncomingMessage, principal: HandoffPrincipal) => {
    let session: NodeRuntimeSession;
    try { session = createSession(principal); }
    catch { websocket.close(1011, 'Session creation failed.'); return; }
    created += 1;
    active += 1;
    sockets.add(websocket);
    const runtime = new ProtocolRuntime({ service: session.service, principal, seats: session.seats, art: session.art });
    const usedIds = new Set<string>();
    const aborters = new Set<AbortController>();
    let opened = false;
    let terminal = false;
    let dispatchingOpen = false;
    let bufferedOpenEvent: SceneSnapshotEvent | null = null;
    const bufferedReceiptEvents = new Map<object, SceneSnapshotEvent>();

    const send = (value: HandoffResponse | SceneSnapshotEvent): boolean => {
      if (terminal || websocket.readyState !== WebSocket.OPEN) return false;
      let wire: string;
      try { wire = wireCodec.stringify(value); }
      catch { cleanup(1011, 'Protocol serialization failed.'); return false; }
      if (terminal || websocket.readyState !== WebSocket.OPEN) return false;
      try { websocket.send(wire, (error) => { if (error instanceof Error) cleanup(1011, 'Socket send failed.'); }); }
      catch { cleanup(1011, 'Socket send failed.'); return false; }
      return !terminal && websocket.readyState === WebSocket.OPEN;
    };
    const unsubscribeEvent = runtime.subscribe((event, receipt) => {
      if (dispatchingOpen && !opened) { bufferedOpenEvent = event; return; }
      if (receipt !== undefined) { bufferedReceiptEvents.set(receipt.invocationToken, event); return; }
      send(event);
    });
    const unsubscribeFault = runtime.subscribeFaults((fault) => cleanup(fault.websocketCloseCode, fault.message));
    const deadline = setTimeout(() => cleanup(1008, 'session.open deadline expired.'), openDeadlineMs);

    const cleanup = (code?: number, reason?: string): void => {
      if (terminal) return;
      terminal = true;
      clearTimeout(deadline);
      active -= 1;
      sockets.delete(websocket);
      for (const aborter of aborters) aborter.abort();
      aborters.clear();
      unsubscribeEvent();
      unsubscribeFault();
      try { runtime.destroySession(); } catch { /* Socket cleanup remains terminal. */ }
      if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
        try { websocket.close(code ?? 1000, reason?.slice(0, 123)); } catch { websocket.terminate(); }
      }
    };

    websocket.on('message', (data, isBinary) => {
      if (terminal) return;
      if (isBinary) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError, 'Binary frames are unsupported.'); return; }
      const text = rawText(data);
      if (text === null) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText, 'The request is not valid UTF-8.'); return; }
      let value: unknown;
      try { value = wireCodec.parse(text); }
      catch { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText, 'The request is not valid JSON.'); return; }
      const fields = requestFields(value);
      if (fields.id === null) { cleanup(HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError, 'The request has no usable string id.'); return; }
      if (!opened && fields.method !== 'session.open') { cleanup(1008, 'The first request must be session.open.'); return; }
      if (usedIds.has(fields.id)) {
        send(failure(fields.id, 'DUPLICATE_REQUEST_ID', 'The wire request id was already used.'));
        return;
      }
      usedIds.add(fields.id);
      const token = runtime.createInvocationToken();
      const aborter = new AbortController();
      aborters.add(aborter);
      if (!opened) dispatchingOpen = true;
      let dispatched: ReturnType<ProtocolRuntime['dispatch']>;
      try { dispatched = runtime.dispatch(value, aborter.signal, token); }
      catch { aborters.delete(aborter); cleanup(1011, 'Session dispatch failed.'); return; }
      void dispatched.then(async (result) => {
        if (terminal) return;
        if (result.kind === 'transport_fault') { cleanup(result.fault.websocketCloseCode, result.fault.message); return; }
        if (!opened && fields.method === 'session.open') {
          dispatchingOpen = false;
          if (!result.response.ok) {
            send(result.response);
            cleanup(1008, 'session.open was refused.');
            return;
          }
          opened = true;
          clearTimeout(deadline);
          if (!send(result.response)) return;
          const initial = bufferedOpenEvent;
          bufferedOpenEvent = null;
          if (initial !== null) send(initial);
          if (session.start !== undefined) await session.start();
          return;
        }
        if (!send(result.response)) return;
        const receiptEvent = bufferedReceiptEvents.get(token);
        bufferedReceiptEvents.delete(token);
        if (receiptEvent !== undefined) send(receiptEvent);
      }).catch(() => cleanup(1011, 'Session dispatch failed.')).finally(() => {
        aborters.delete(aborter);
        bufferedReceiptEvents.delete(token);
      });
    });
    websocket.on('close', () => cleanup());
    websocket.on('error', (error) => {
      const errorCode = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : undefined;
      cleanup(errorCode === 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH' ? 1009 : 1011, 'Socket error.');
    });
  });

  return {
    listening: () => server.listening,
    listen: (port = 0) => new Promise((resolve, reject) => {
      const onError = (error: Error): void => reject(error);
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', onError);
        const address = server.address();
        if (address === null || typeof address === 'string') { reject(new Error('Runtime address is unavailable.')); return; }
        resolve({ host: '127.0.0.1', port: address.port, websocketUrl: `ws://127.0.0.1:${String(address.port)}${VTT_RUNTIME_PATH}` });
      });
    }),
    close: () => {
      closePromise ??= (async () => {
        for (const socket of [...sockets]) socket.terminate();
        await new Promise<void>((resolve, reject) => wss.close((error) => error === undefined ? resolve() : reject(error)));
        if (!server.listening) return;
        await new Promise<void>((resolve, reject) => server.close((error) => error === undefined ? resolve() : reject(error)));
      })();
      return closePromise;
    },
    sessionCounts: () => ({ created, active }),
  };
}
