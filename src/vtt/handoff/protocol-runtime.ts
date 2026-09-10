import type { EncounterArtPackage } from '../encounter-package';
import type {
  DmSessionSnapshotEvent,
  PlayerSessionSnapshotEvent,
  PlayerSubscriptionResult,
  DoorSetOutcome,
  SessionMutationOutcome,
} from '../encounter-session-service';
import type { DmBoardProjection, PlayerBoardProjection, RendererTokenBinding } from '../encounter-projections';
import { groundAnchor, sceneSnapshot, type CanonicalTokenIdentityIndex } from './scene-snapshot';
import { MutationLedger } from './mutation-ledger';
import { SessionAuthorizer, type HandoffPrincipal } from './session-authorizer';
import {
  genericHandoffRequestSchema,
  handoffRequestSchema,
  type HandoffRequest,
  type SceneSnapshot,
} from './v1/contracts';

export const HANDOFF_WEBSOCKET_CLOSE_CODES = {
  invalidText: 1007,
  protocolError: 1002,
} as const;

export type ProtocolTransportFaultCode = 'INVALID_UTF8' | 'INVALID_JSON' | 'PROTOCOL_ERROR';

export interface ProtocolTransportFault {
  readonly kind: 'transport_fault';
  readonly code: ProtocolTransportFaultCode;
  readonly message: string;
  readonly websocketCloseCode: 1007 | 1002;
}

export interface HandoffSuccessResponse {
  readonly v: 1;
  readonly id: string;
  readonly ok: true;
  readonly result: Readonly<Record<string, unknown>>;
}

export interface HandoffFailureResponse {
  readonly v: 1;
  readonly id: string;
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string };
}

export type HandoffResponse = HandoffSuccessResponse | HandoffFailureResponse;

export interface SceneSnapshotEvent {
  readonly v: 1;
  readonly event: 'scene.snapshot';
  readonly seq: number;
  readonly data: SceneSnapshot;
}

export type ProtocolDispatchResult =
  | { readonly kind: 'response'; readonly response: HandoffResponse }
  | { readonly kind: 'transport_fault'; readonly fault: ProtocolTransportFault };

export interface ProtocolRuntimeOptions {
  readonly service: ProtocolSessionPort;
  readonly principal: HandoffPrincipal;
  readonly seats: readonly { readonly playerId: string; readonly controlledTokenIds: readonly string[] }[];
  readonly art: EncounterArtPackage;
  readonly tokenBindings: readonly RendererTokenBinding[];
  readonly ledger?: MutationLedger;
}

export interface ProtocolSessionPort {
  readonly sessionId: string;
  dmSnapshot(): DmBoardProjection;
  playerSnapshot(playerId?: string): PlayerBoardProjection | null;
  subscribeDm(listener: (event: DmSessionSnapshotEvent) => void): () => void;
  subscribePlayer(
    playerId: string | undefined,
    listener: (event: PlayerSessionSnapshotEvent) => void,
  ): PlayerSubscriptionResult;
  submitOfferedAction(input: {
    readonly playerId?: string;
    readonly tokenId: string;
    readonly requestId: string;
    readonly encounterRevision: number;
    readonly offeredActionId: string;
  }): Promise<SessionMutationOutcome>;
  setDoor(input: {
    readonly principal?: { readonly kind: 'dm' } | { readonly kind: 'player'; readonly playerId: string };
    readonly doorId: string;
    readonly open: boolean;
  }): Promise<DoorSetOutcome>;
  close(): void;
}

function success(id: string, result: Readonly<Record<string, unknown>>): HandoffSuccessResponse {
  return { v: 1, id, ok: true, result };
}

function failure(id: string, code: string, message: string): HandoffFailureResponse {
  return { v: 1, id, ok: false, error: { code, message } };
}

function fault(
  code: ProtocolTransportFaultCode,
  message: string,
  websocketCloseCode: 1007 | 1002,
): { readonly kind: 'transport_fault'; readonly fault: ProtocolTransportFault } {
  return { kind: 'transport_fault', fault: { kind: 'transport_fault', code, message, websocketCloseCode } };
}

type DecodedInput =
  | { readonly ok: true; readonly value: unknown }
  | { readonly kind: 'transport_fault'; readonly fault: ProtocolTransportFault };

function decodedInput(input: unknown): DecodedInput {
  if (input instanceof Uint8Array) {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(input);
    } catch {
      return fault('INVALID_UTF8', 'The request is not valid UTF-8.', HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText);
    }
    try {
      return { ok: true, value: JSON.parse(text) as unknown };
    } catch {
      return fault('INVALID_JSON', 'The request is not valid JSON.', HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText);
    }
  }
  if (typeof input === 'string') {
    try {
      return { ok: true, value: JSON.parse(input) as unknown };
    } catch {
      return fault('INVALID_JSON', 'The request is not valid JSON.', HANDOFF_WEBSOCKET_CLOSE_CODES.invalidText);
    }
  }
  return { ok: true, value: input };
}

function usableId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return typeof Reflect.get(value, 'id') === 'string' ? Reflect.get(value, 'id') as string : null;
}

function identityIndex(bindings: readonly RendererTokenBinding[]): CanonicalTokenIdentityIndex {
  const byCombatantId = new Map<string, string>();
  for (const binding of bindings) {
    const combatantId = String(binding.combatantId);
    if (byCombatantId.has(combatantId)) throw new TypeError(`Duplicate token binding for ${combatantId}.`);
    byCombatantId.set(combatantId, binding.tokenId);
  }
  return { byCombatantId };
}

function terminalResponse(id: string, outcome: SessionMutationOutcome): HandoffResponse {
  switch (outcome.kind) {
    case 'committed':
      return success(id, { revision: outcome.revision });
    case 'refused':
      return failure(id, outcome.code, outcome.reason);
    case 'cancelled':
      return failure(id, 'CANCELLED', outcome.reason);
    case 'closed':
      return failure(id, 'CLOSED', 'The encounter session is closed.');
    case 'failed':
      return failure(id, 'FAILED', outcome.phase === 'post_apply'
        ? 'The mutation failed after apply and the session was closed.'
        : 'The mutation failed before apply.');
  }
}

export class ProtocolRuntime {
  readonly #service: ProtocolSessionPort;
  readonly #principal: HandoffPrincipal;
  readonly #authorizer: SessionAuthorizer;
  readonly #art: EncounterArtPackage;
  readonly #tokenIdentities: CanonicalTokenIdentityIndex;
  readonly #ledger: MutationLedger;
  readonly #eventListeners = new Set<(event: SceneSnapshotEvent) => void>();
  readonly #faultListeners = new Set<(event: ProtocolTransportFault) => void>();
  #unsubscribeService: (() => void) | null = null;
  #audience: 'dm' | 'player' | null = null;
  #seq = 0;
  #closed = false;
  #disposed = false;

  constructor(options: ProtocolRuntimeOptions) {
    this.#service = options.service;
    this.#principal = options.principal;
    this.#authorizer = new SessionAuthorizer(options.seats);
    this.#art = options.art;
    this.#tokenIdentities = identityIndex(options.tokenBindings);
    this.#ledger = options.ledger ?? new MutationLedger(String(options.service.sessionId));
  }

  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void {
    this.#eventListeners.add(listener);
    return () => this.#eventListeners.delete(listener);
  }

  subscribeFaults(listener: (event: ProtocolTransportFault) => void): () => void {
    this.#faultListeners.add(listener);
    return () => this.#faultListeners.delete(listener);
  }

  async dispatch(input: unknown): Promise<ProtocolDispatchResult> {
    const decoded = decodedInput(input);
    if (!('ok' in decoded)) {
      this.#emitFault(decoded.fault);
      return decoded;
    }
    const id = usableId(decoded.value);
    if (id === null) {
      const result = fault(
        'PROTOCOL_ERROR',
        'The request has no usable string id.',
        HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError,
      );
      if (result.kind === 'transport_fault') this.#emitFault(result.fault);
      return result;
    }
    if (this.#disposed || this.#closed) {
      return { kind: 'response', response: failure(id, 'CLOSED', 'The logical transport is closed.') };
    }
    const structural = genericHandoffRequestSchema.safeParse(decoded.value);
    if (!structural.success) {
      return { kind: 'response', response: failure(id, 'INVALID_REQUEST', 'The request structure is invalid.') };
    }
    const known = handoffRequestSchema.safeParse(structural.data);
    if (!known.success) {
      if (!['session.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set'].includes(structural.data.method)) {
        return { kind: 'response', response: failure(id, 'UNSUPPORTED', `Unsupported method ${structural.data.method}.`) };
      }
      return { kind: 'response', response: failure(id, 'INVALID_REQUEST', 'The request parameters are invalid.') };
    }
    const response = await this.#dispatchKnown(known.data);
    return { kind: 'response', response };
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#unsubscribeService?.();
    this.#unsubscribeService = null;
    this.#eventListeners.clear();
    this.#faultListeners.clear();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.close();
    this.#disposed = true;
    this.#ledger.dispose();
    this.#service.close();
  }

  async #dispatchKnown(request: HandoffRequest): Promise<HandoffResponse> {
    switch (request.method) {
      case 'session.open':
        return this.#open(request.id, request.params.requestedRole, request.params.playerId);
      case 'scene.snapshot': {
        const projection = this.#projection();
        return projection === null
          ? failure(request.id, 'SESSION_NOT_OPEN', 'Open the session before requesting a snapshot.')
          : success(request.id, this.#snapshot(projection));
      }
      case 'token.move':
        if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
        return this.#move(request.id, request.params.tokenId, request.params.to);
      case 'door.set':
        if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
        return this.#door(request.id, request.params.doorId, request.params.open);
      case 'light.set':
        if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
        return failure(request.id, 'UNSUPPORTED', 'The encounter engine has no light toggle mechanic.');
    }
  }

  #reserve(id: string): boolean {
    return this.#ledger.reserve(id).reserved;
  }

  #open(id: string, role: 'dm' | 'player', playerId?: string): HandoffResponse {
    if (this.#audience !== null) return failure(id, 'ALREADY_OPEN', 'The logical session is already open.');
    const authorization = this.#authorizer.authorizeOpen(this.#principal, role, playerId);
    if (!authorization.authorized) return failure(id, authorization.code, authorization.message);
    let initial = true;
    if (role === 'dm') {
      this.#unsubscribeService = this.#service.subscribeDm((event) => {
        if (!initial) this.#publish(event);
      });
    } else {
      const subscription = this.#service.subscribePlayer(playerId, (event) => {
        if (!initial) this.#publish(event);
      });
      if (subscription.kind === 'refused') {
        return failure(id, subscription.code, 'The player seat is not registered.');
      }
      this.#unsubscribeService = subscription.unsubscribe;
    }
    initial = false;
    this.#audience = role;
    const projection = this.#projection();
    if (projection === null) throw new Error('The authorized session projection is unavailable.');
    this.#emitSnapshot(projection);
    return success(id, {
      sessionId: String(this.#service.sessionId),
      capabilities: ['scene.snapshot', 'token.move', 'door.set'],
    });
  }

  async #move(
    id: string,
    tokenId: string,
    to: { readonly x: number; readonly y: number; readonly z: number },
  ): Promise<HandoffResponse> {
    if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
    const authorization = this.#authorizer.authorizeToken(this.#principal, tokenId);
    if (!authorization.authorized) return failure(id, authorization.code, authorization.message);
    if (this.#principal.role !== 'player') return failure(id, 'FORBIDDEN', 'A player seat is required.');
    const projection = this.#service.playerSnapshot(this.#principal.playerId);
    if (projection === null) return failure(id, 'UNAUTHORIZED', 'The player seat is not registered.');
    const snapshot = this.#snapshot(projection);
    const token = snapshot.tokens.find((candidate) => candidate.id === tokenId);
    if (token === undefined) return failure(id, 'FORBIDDEN', 'The token is not visible to this player seat.');
    const anchor = groundAnchor(to, token.footprint);
    if (
      anchor === null ||
      anchor.column < 0 || anchor.row < 0 ||
      anchor.column + token.footprint.w > snapshot.grid.width ||
      anchor.row + token.footprint.h > snapshot.grid.height
    ) {
      return failure(id, 'INVALID_DESTINATION', 'The destination is not a valid ground center for this token.');
    }
    const pending = projection.pendingRequest;
    if (pending === null) return failure(id, 'ILLEGAL_MOVE', 'There is no current offered move for this player.');
    const actor = this.#tokenActor(tokenId);
    if (actor === null || pending.actorId !== actor) {
      return failure(id, 'FORBIDDEN', 'The offered actor does not control this token.');
    }
    const matchingIndexes = pending.legalActions.flatMap((action, index): readonly number[] => {
      if (action.type !== 'move' || action.actor !== actor) return [];
      const destination = action.path.at(-1);
      return destination?.column === anchor.column && destination.row === anchor.row ? [index] : [];
    });
    if (matchingIndexes.length === 0) return failure(id, 'ILLEGAL_MOVE', 'The destination is not currently offered.');
    if (matchingIndexes.length > 1) return failure(id, 'AMBIGUOUS_MOVE', 'More than one current offer reaches the destination.');
    const optionIndex = matchingIndexes[0];
    const offeredActionId = optionIndex === undefined ? undefined : pending.offeredActionIds[optionIndex];
    if (offeredActionId === undefined) return failure(id, 'ILLEGAL_MOVE', 'The matching offer has no option id.');
    const outcome = await this.#service.submitOfferedAction({
      playerId: this.#principal.playerId,
      tokenId,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId,
    });
    return terminalResponse(id, outcome);
  }

  async #door(id: string, doorId: string, open: boolean): Promise<HandoffResponse> {
    if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
    if (this.#principal.role !== 'dm') return failure(id, 'FORBIDDEN', 'Players cannot change door state.');
    const outcome = await this.#service.setDoor({ principal: { kind: 'dm' }, doorId, open });
    switch (outcome.kind) {
      case 'committed': return success(id, { revision: outcome.revision });
      case 'refused': return failure(id, outcome.code, outcome.reason);
      case 'closed': return failure(id, 'CLOSED', 'The encounter session is closed.');
      case 'failed': return failure(id, 'FAILED', outcome.phase === 'post_apply'
        ? 'The mutation failed after apply and the session was closed.'
        : 'The mutation failed before apply.');
    }
  }

  #projection(): DmBoardProjection | PlayerBoardProjection | null {
    if (this.#audience === 'dm') return this.#service.dmSnapshot();
    if (this.#audience === 'player' && this.#principal.role === 'player') {
      return this.#service.playerSnapshot(this.#principal.playerId);
    }
    return null;
  }

  #snapshot(projection: DmBoardProjection | PlayerBoardProjection): SceneSnapshot {
    return sceneSnapshot({
      sceneId: String(this.#service.sessionId),
      projection,
      art: this.#art,
      tokenIdentities: this.#tokenIdentities,
    }).snapshot;
  }

  #tokenActor(tokenId: string): string | null {
    for (const [combatantId, candidateTokenId] of this.#tokenIdentities.byCombatantId) {
      if (candidateTokenId === tokenId) return combatantId;
    }
    return null;
  }

  #publish(event: DmSessionSnapshotEvent | PlayerSessionSnapshotEvent): void {
    this.#emitSnapshot(event.projection);
  }

  #emitSnapshot(projection: DmBoardProjection | PlayerBoardProjection): void {
    this.#seq += 1;
    const event = {
      v: 1,
      event: 'scene.snapshot',
      seq: this.#seq,
      data: this.#snapshot(projection),
    } satisfies SceneSnapshotEvent;
    for (const listener of this.#eventListeners) listener(event);
  }

  #emitFault(event: ProtocolTransportFault): void {
    for (const listener of this.#faultListeners) listener(event);
  }
}
