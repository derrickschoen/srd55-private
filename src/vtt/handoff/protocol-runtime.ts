import type { EncounterArtPackage } from '../encounter-package';
import type {
  DmSessionSnapshotEvent,
  PlayerSessionSnapshotEvent,
  PlayerSubscriptionResult,
  DoorSetOutcome,
  SessionInvocationToken,
  SessionMutationOutcome,
} from '../encounter-session-service';
import type { DmBoardProjection, PlayerBoardProjection, RendererTokenBinding } from '../encounter-projections';
import type { RendererProjectionCapture } from '../encounter-projections';
import { groundAnchor, sceneSnapshot, type CanonicalTokenIdentityIndex } from './scene-snapshot';
import { LogicalSessionAuthority } from './mutation-ledger';
import { SessionAuthorizer, type HandoffPrincipal } from './session-authorizer';
import {
  genericHandoffRequestSchema,
  HANDOFF_METHODS,
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

export interface ProtocolEstablishedReceipt {
  readonly invocationToken: SessionInvocationToken;
  readonly revision: number;
}

export type ProtocolResponseEstablished = (response: HandoffResponse) => void;

const knownMethods = new Set<string>(HANDOFF_METHODS);
// Warm Zod's generated validators before object transport is measured. Dispatch invokes
// those authoritative schemas through `_zod.run` so invalid input does not materialize a
// ZodError (whose formatter serializes issues) inside the zero-serialization boundary.
// Recheck this exact-pinned internal boundary whenever Zod is upgraded.
const validatorWarmups: readonly HandoffRequest[] = [
  { v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } },
  { v: 1, id: '', method: 'scene.snapshot', params: {} },
  { v: 1, id: '', method: 'token.move', params: { tokenId: '', to: { x: 0, y: 0, z: 0 } } },
  { v: 1, id: '', method: 'door.set', params: { doorId: '', open: false } },
  { v: 1, id: '', method: 'light.set', params: { lightId: '', enabled: false } },
];
for (const request of validatorWarmups) {
  genericHandoffRequestSchema.safeParse(request);
  handoffRequestSchema.safeParse(request);
}

export type ProtocolDispatchResult =
  | { readonly kind: 'response'; readonly response: HandoffResponse }
  | { readonly kind: 'transport_fault'; readonly fault: ProtocolTransportFault };

export interface ProtocolRuntimeOptions {
  readonly service: ProtocolSessionPort;
  readonly principal: HandoffPrincipal;
  readonly seats: readonly { readonly playerId: string; readonly controlledTokenIds: readonly string[] }[];
  readonly art: EncounterArtPackage;
  readonly session?: LogicalSessionAuthority;
}

export interface ProtocolSessionPort {
  readonly sessionId: string;
  dmSnapshot(): DmBoardProjection;
  dmCapture(): RendererProjectionCapture<DmBoardProjection>;
  playerSnapshot(playerId?: string): PlayerBoardProjection | null;
  playerCapture(playerId?: string): RendererProjectionCapture<PlayerBoardProjection> | null;
  subscribeDm(listener: (event: DmSessionSnapshotEvent) => void): () => void;
  subscribePlayer(
    playerId: string | undefined,
    listener: (event: PlayerSessionSnapshotEvent) => void,
  ): PlayerSubscriptionResult;
  submitOfferedAction(input: {
    readonly playerId?: string;
    readonly tokenId: string;
    readonly requestId: string;
    readonly invocationToken?: SessionInvocationToken;
    readonly encounterRevision: number;
    readonly offeredActionId: string;
    readonly signal?: AbortSignal;
  }): Promise<SessionMutationOutcome>;
  setDoor(input: {
    readonly invocationToken?: SessionInvocationToken;
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
  try {
    const id = Reflect.get(value, 'id');
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
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
  readonly #session: LogicalSessionAuthority;
  readonly #mintedInvocationTokens = new Map<SessionInvocationToken, 'minted'>();
  readonly #activeMutationInvocations = new Set<SessionInvocationToken>();
  readonly #eventListeners = new Set<(
    event: SceneSnapshotEvent,
    receipt?: ProtocolEstablishedReceipt,
  ) => void>();
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
    this.#session = options.session ?? LogicalSessionAuthority.for(options.service);
    this.#session.attach(options.service);
  }

  subscribe(listener: (event: SceneSnapshotEvent, receipt?: ProtocolEstablishedReceipt) => void): () => void {
    this.#eventListeners.add(listener);
    return () => this.#eventListeners.delete(listener);
  }

  subscribeFaults(listener: (event: ProtocolTransportFault) => void): () => void {
    this.#faultListeners.add(listener);
    return () => this.#faultListeners.delete(listener);
  }

  createInvocationToken(): SessionInvocationToken {
    const token = Object.freeze({ invocation: Symbol('protocol-invocation') });
    if (!this.#closed && !this.#disposed && !this.#session.destroyed) {
      this.#mintedInvocationTokens.set(token, 'minted');
    }
    return token;
  }

  invocationTrackingCounts(): { readonly minted: number; readonly active: number } {
    return { minted: this.#mintedInvocationTokens.size, active: this.#activeMutationInvocations.size };
  }

  dispatch(
    input: unknown,
    signal?: AbortSignal,
    invocationToken?: SessionInvocationToken,
    onResponseEstablished?: ProtocolResponseEstablished,
  ): Promise<ProtocolDispatchResult> {
    const respond = (response: HandoffResponse): Promise<ProtocolDispatchResult> => {
      onResponseEstablished?.(response);
      return Promise.resolve({ kind: 'response', response });
    };
    const token = this.#disposed || this.#closed || this.#session.destroyed
      ? null
      : this.#consumeInvocationToken(invocationToken);
    const decoded = decodedInput(input);
    if (!('ok' in decoded)) {
      this.#emitFault(decoded.fault);
      return Promise.resolve(decoded);
    }
    const id = usableId(decoded.value);
    if (id === null) {
      const result = fault(
        'PROTOCOL_ERROR',
        'The request has no usable string id.',
        HANDOFF_WEBSOCKET_CLOSE_CODES.protocolError,
      );
      if (result.kind === 'transport_fault') this.#emitFault(result.fault);
      return Promise.resolve(result);
    }
    if (token === null) {
      return respond(failure(id, 'CLOSED', 'The logical transport is closed.'));
    }
    const structural = genericHandoffRequestSchema._zod.run(
      { value: decoded.value, issues: [] },
      { async: false },
    );
    if (structural instanceof Promise) throw new TypeError('The v1 request schema must validate synchronously.');
    if (structural.issues.length > 0) {
      return respond(failure(id, 'INVALID_REQUEST', 'The request structure is invalid.'));
    }
    const structuralValue = structural.value as typeof genericHandoffRequestSchema['_output'];
    if (!knownMethods.has(structuralValue.method)) {
      return respond(failure(id, 'UNSUPPORTED', `Unsupported method ${structuralValue.method}.`));
    }
    const known = handoffRequestSchema._zod.run(
      { value: decoded.value, issues: [] },
      { async: false },
    );
    if (known instanceof Promise) throw new TypeError('The v1 method schema must validate synchronously.');
    if (known.issues.length > 0) {
      return respond(failure(id, 'INVALID_REQUEST', 'The request parameters are invalid.'));
    }
    const dispatched = this.#dispatchKnown(known.value as HandoffRequest, token, signal);
    if (dispatched instanceof Promise) {
      return dispatched.then((response) => {
        onResponseEstablished?.(response);
        return { kind: 'response', response };
      });
    }
    return respond(dispatched);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const unsubscribe = this.#unsubscribeService;
    this.#unsubscribeService = null;
    try {
      unsubscribe?.();
    } finally {
      this.#clearInvocationTracking();
      this.#eventListeners.clear();
      this.#faultListeners.clear();
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    try {
      this.close();
    } finally {
      this.#disposed = true;
      this.#clearInvocationTracking();
    }
  }

  destroySession(): void {
    this.#disposed = true;
    const errors: unknown[] = [];
    try { this.close(); } catch (error: unknown) { errors.push(error); }
    try { this.#session.destroy(); } catch (error: unknown) { errors.push(error); }
    this.#clearInvocationTracking();
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, 'Runtime and session cleanup both failed.');
  }

  #dispatchKnown(
    request: HandoffRequest,
    invocationToken: SessionInvocationToken,
    signal?: AbortSignal,
  ): HandoffResponse | Promise<HandoffResponse> {
    switch (request.method) {
      case 'session.open':
        return this.#open(request.id, request.params.requestedRole, request.params.playerId);
      case 'scene.snapshot': {
        const capture = this.#capture();
        return capture === null
          ? failure(request.id, 'SESSION_NOT_OPEN', 'Open the session before requesting a snapshot.')
          : success(request.id, this.#snapshot(capture));
      }
      case 'token.move':
        if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
        return this.#trackMutation(
          invocationToken,
          () => this.#move(request.id, request.params.tokenId, request.params.to, invocationToken, signal),
        );
      case 'door.set':
        if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
        return this.#trackMutation(
          invocationToken,
          () => this.#door(request.id, request.params.doorId, request.params.open, invocationToken),
        );
      case 'light.set':
        if (!this.#reserve(request.id)) return failure(request.id, 'DUPLICATE_MUTATION', 'The mutation id was already used.');
        return failure(request.id, 'UNSUPPORTED', 'The encounter engine has no light toggle mechanic.');
    }
  }

  #trackMutation(
    invocationToken: SessionInvocationToken,
    operation: () => Promise<HandoffResponse>,
  ): Promise<HandoffResponse> {
    this.#activeMutationInvocations.add(invocationToken);
    let response: Promise<HandoffResponse>;
    try {
      response = operation();
    } catch (error: unknown) {
      this.#activeMutationInvocations.delete(invocationToken);
      throw error;
    }
    return response.finally(() => this.#activeMutationInvocations.delete(invocationToken));
  }

  #consumeInvocationToken(supplied?: SessionInvocationToken): SessionInvocationToken {
    if (supplied !== undefined && this.#mintedInvocationTokens.delete(supplied)) {
      return supplied;
    }
    // Foreign and already-consumed objects receive a fresh, already-consumed internal identity.
    return Object.freeze({ invocation: Symbol('protocol-invocation') });
  }

  #clearInvocationTracking(): void {
    this.#activeMutationInvocations.clear();
    this.#mintedInvocationTokens.clear();
  }

  #reserve(id: string): boolean {
    return this.#session.ledger.reserve(id).reserved;
  }

  #open(id: string, role: 'dm' | 'player', playerId?: string): HandoffResponse {
    if (this.#audience !== null) return failure(id, 'ALREADY_OPEN', 'The logical session is already open.');
    const authorization = this.#authorizer.authorizeOpen(this.#principal, role, playerId);
    if (!authorization.authorized) return failure(id, authorization.code, authorization.message);
    let initial = true;
    const opening = { event: null as DmSessionSnapshotEvent | PlayerSessionSnapshotEvent | null };
    if (role === 'dm') {
      this.#unsubscribeService = this.#service.subscribeDm((event) => {
        if (initial) opening.event = event;
        else this.#publish(event);
      });
    } else {
      const subscription = this.#service.subscribePlayer(playerId, (event) => {
        if (initial) opening.event = event;
        else this.#publish(event);
      });
      if (subscription.kind === 'refused') {
        return failure(id, subscription.code, 'The player seat is not registered.');
      }
      this.#unsubscribeService = subscription.unsubscribe;
    }
    initial = false;
    this.#audience = role;
    const capture = opening.event === null
      ? this.#capture()
      : { projection: opening.event.projection, tokenBindings: opening.event.tokenBindings };
    if (capture === null) throw new Error('The authorized session projection is unavailable.');
    this.#emitSnapshot(capture);
    return success(id, {
      sessionId: String(this.#service.sessionId),
      capabilities: ['scene.snapshot', 'token.move', 'door.set'],
    });
  }

  async #move(
    id: string,
    tokenId: string,
    to: { readonly x: number; readonly y: number; readonly z: number },
    invocationToken: SessionInvocationToken,
    signal?: AbortSignal,
  ): Promise<HandoffResponse> {
    if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
    const authorization = this.#authorizer.authorizeToken(this.#principal, tokenId);
    if (!authorization.authorized) return failure(id, authorization.code, authorization.message);
    if (this.#principal.role !== 'player') return failure(id, 'FORBIDDEN', 'A player seat is required.');
    const capture = this.#service.playerCapture(this.#principal.playerId);
    if (capture === null) return failure(id, 'UNAUTHORIZED', 'The player seat is not registered.');
    const projection = capture.projection;
    const snapshot = this.#snapshot(capture);
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
    const actor = this.#tokenActor(tokenId, capture.tokenBindings);
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
      invocationToken,
      encounterRevision: pending.encounterRevision,
      offeredActionId,
      ...(signal === undefined ? {} : { signal }),
    });
    return terminalResponse(id, outcome);
  }

  async #door(
    id: string,
    doorId: string,
    open: boolean,
    invocationToken: SessionInvocationToken,
  ): Promise<HandoffResponse> {
    if (this.#audience === null) return failure(id, 'SESSION_NOT_OPEN', 'Open the session before mutating it.');
    if (this.#principal.role !== 'dm') return failure(id, 'FORBIDDEN', 'Players cannot change door state.');
    const outcome = await this.#service.setDoor({ invocationToken, principal: { kind: 'dm' }, doorId, open });
    switch (outcome.kind) {
      case 'committed': return success(id, { revision: outcome.revision });
      case 'refused': return failure(id, outcome.code, outcome.reason);
      case 'closed': return failure(id, 'CLOSED', 'The encounter session is closed.');
      case 'failed': return failure(id, 'FAILED', outcome.phase === 'post_apply'
        ? 'The mutation failed after apply and the session was closed.'
        : 'The mutation failed before apply.');
    }
  }

  #capture(): RendererProjectionCapture<DmBoardProjection | PlayerBoardProjection> | null {
    if (this.#audience === 'dm') return this.#service.dmCapture();
    if (this.#audience === 'player' && this.#principal.role === 'player') {
      return this.#service.playerCapture(this.#principal.playerId);
    }
    return null;
  }

  #snapshot(capture: RendererProjectionCapture<DmBoardProjection | PlayerBoardProjection>): SceneSnapshot {
    const tokenIdentities = identityIndex(capture.tokenBindings);
    return sceneSnapshot({
      sceneId: String(this.#service.sessionId),
      projection: capture.projection,
      art: this.#art,
      tokenIdentities,
    }).snapshot;
  }

  #tokenActor(tokenId: string, bindings: readonly RendererTokenBinding[]): string | null {
    for (const [combatantId, candidateTokenId] of identityIndex(bindings).byCombatantId) {
      if (candidateTokenId === tokenId) return combatantId;
    }
    return null;
  }

  #publish(event: DmSessionSnapshotEvent | PlayerSessionSnapshotEvent): void {
    switch (event.kind) {
      case 'mutation':
      case 'autonomous': {
        const receipt = event.terminalReceipt;
        const establishedReceipt = receipt !== undefined &&
          this.#activeMutationInvocations.has(receipt.invocationToken)
          ? receipt
          : undefined;
        this.#emitSnapshot(
          { projection: event.projection, tokenBindings: event.tokenBindings },
          establishedReceipt,
        );
        return;
      }
      case 'offer':
      case 'status':
      case 'recovery':
        return;
    }
  }

  #emitSnapshot(
    capture: RendererProjectionCapture<DmBoardProjection | PlayerBoardProjection>,
    receipt?: ProtocolEstablishedReceipt,
  ): void {
    this.#seq += 1;
    const snapshot = this.#snapshot(capture);
    const event = {
      v: 1,
      event: 'scene.snapshot',
      seq: this.#seq,
      data: snapshot,
    } satisfies SceneSnapshotEvent;
    for (const listener of this.#eventListeners) {
      try { listener(event, receipt); } catch { /* Observer failure cannot alter protocol settlement. */ }
    }
  }

  #emitFault(event: ProtocolTransportFault): void {
    for (const listener of this.#faultListeners) {
      try { listener(event); } catch { /* Observer failure cannot alter protocol settlement. */ }
    }
  }
}
