import { handoffEventSchema, handoffResponseSchema, type SceneSnapshot } from './v1/contracts';
import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
import {
  SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus,
} from './scene-transport';

interface PendingRequest {
  readonly method: string | null;
  readonly resolve: (response: HandoffResponse) => void;
  readonly reject: (error: Error) => void;
}

export interface WebSocketWireCodec {
  readonly parse: (text: string) => unknown;
  readonly stringify: (value: unknown) => string;
}

function property(input: unknown, key: string): unknown {
  if (typeof input !== 'object' || input === null) return undefined;
  try { return Reflect.get(input, key); } catch { return undefined; }
}

export class WebSocketSceneTransport implements SceneTransport {
  readonly #socket: WebSocket;
  readonly #pending = new Map<string, PendingRequest>();
  readonly #events = new Set<(event: SceneSnapshotEvent) => void>();
  readonly #statuses = new Set<(status: SceneTransportStatus) => void>();
  readonly #errors = new Set<(error: SceneTransportFaultError) => void>();
  readonly #waitingForOpen = new Set<() => void>();
  #state: SceneTransportStatus = 'connecting';
  #initial: Promise<SceneSnapshot>;
  #resolveInitial: ((snapshot: SceneSnapshot) => void) | null = null;
  #rejectInitial: ((error: Error) => void) | null = null;
  #latestEvent: SceneSnapshotEvent | null = null;
  #uncorrelatedSequence = 0;
  readonly #wireCodec: WebSocketWireCodec;

  constructor(url: string | URL, token: string, wireCodec?: WebSocketWireCodec) {
    this.#initial = new Promise((resolve, reject) => {
      this.#resolveInitial = resolve;
      this.#rejectInitial = reject;
    });
    void this.#initial.catch(() => undefined);
    this.#wireCodec = wireCodec ?? {
      parse: (text: string): unknown => JSON.parse(text) as unknown,
      stringify: (value: unknown): string => JSON.stringify(value),
    };
    this.#socket = new WebSocket(url, ['vtt.v1', `bearer.${token}`]);
    this.#socket.addEventListener('message', this.#onMessage);
    this.#socket.addEventListener('close', this.#onClose);
    this.#socket.addEventListener('error', this.#onError);
  }

  request(request: unknown): Promise<HandoffResponse> {
    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
    const idValue = property(request, 'id');
    const methodValue = property(request, 'method');
    const id = typeof idValue === 'string' ? idValue : null;
    if (id !== null && this.#pending.has(id)) {
      return Promise.reject(this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002));
    }
    let wire: string;
    try { wire = this.#wireCodec.stringify(request); }
    catch { return Promise.reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002)); }
    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
    return new Promise<HandoffResponse>((resolve, reject) => {
      this.#uncorrelatedSequence += 1;
      const pendingKey = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
      this.#pending.set(pendingKey, {
        method: typeof methodValue === 'string' ? methodValue : null, resolve, reject,
      });
      const send = (): void => {
        this.#waitingForOpen.delete(send);
        if (this.#terminal() || this.#socket.readyState !== WebSocket.OPEN) {
          this.#pending.delete(pendingKey);
          reject(new SceneTransportClosedError());
          return;
        }
        try {
          if (this.#terminal() || this.#socket.readyState !== WebSocket.OPEN) throw new SceneTransportClosedError();
          this.#socket.send(wire);
        } catch (error: unknown) {
          this.#pending.delete(pendingKey);
          reject(error instanceof Error ? error : new SceneTransportClosedError());
        }
      };
      if (this.#socket.readyState === WebSocket.OPEN) send();
      else if (this.#socket.readyState === WebSocket.CONNECTING) {
        this.#waitingForOpen.add(send);
        this.#socket.addEventListener('open', send, { once: true });
      } else {
        this.#pending.delete(pendingKey);
        reject(new SceneTransportClosedError());
      }
    });
  }

  initialSnapshot(): Promise<SceneSnapshot> {
    return this.#terminal() ? Promise.reject(new SceneTransportClosedError()) : this.#initial;
  }
  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void {
    if (this.#terminal()) return () => undefined;
    this.#events.add(listener);
    if (this.#latestEvent !== null) {
      try { listener(this.#latestEvent); } catch { /* Observer failures are isolated. */ }
    }
    return () => this.#events.delete(listener);
  }
  status(): SceneTransportStatus { return this.#state; }
  subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void {
    try { listener(this.#state); } catch { /* Observer failures are isolated. */ }
    if (this.#terminal()) return () => undefined;
    this.#statuses.add(listener);
    return () => this.#statuses.delete(listener);
  }
  subscribeErrors(listener: (error: SceneTransportFaultError) => void): () => void {
    if (this.#terminal()) return () => undefined;
    this.#errors.add(listener);
    return () => this.#errors.delete(listener);
  }
  close(): void { this.#shutdown('closed'); }
  dispose(): void { this.#shutdown('disposed'); }
  destroySession(): void { this.#shutdown('disposed'); }
  pendingRequestCount(): number { return this.#pending.size; }

  readonly #onMessage = (message: MessageEvent<unknown>): void => {
    if (typeof message.data !== 'string') { this.#protocolFault('The socket emitted a non-text message.'); return; }
    let value: unknown;
    try { value = this.#wireCodec.parse(message.data); }
    catch { this.#protocolFault('The socket emitted invalid JSON.'); return; }
    const event = handoffEventSchema.safeParse(value);
    if (event.success) {
      const snapshotEvent = event.data as SceneSnapshotEvent;
      this.#latestEvent = snapshotEvent;
      if (this.#resolveInitial !== null) {
        this.#resolveInitial(snapshotEvent.data);
        this.#resolveInitial = null;
        this.#rejectInitial = null;
      }
      for (const listener of this.#events) {
        try { listener(snapshotEvent); } catch { /* Observer failures are isolated. */ }
      }
      return;
    }
    const response = handoffResponseSchema.safeParse(value);
    if (!response.success) { this.#protocolFault('The socket emitted an invalid protocol message.'); return; }
    const pending = this.#pending.get(response.data.id);
    if (pending === undefined) { this.#protocolFault('The socket emitted an uncorrelated response.'); return; }
    this.#pending.delete(response.data.id);
    if (pending.method === 'session.open' && response.data.ok) this.#setState('open');
    pending.resolve(response.data as HandoffResponse);
  };

  readonly #onClose = (event: CloseEvent): void => {
    if (event.code === 1007 || event.code === 1002) {
      const error = this.#fault(
        event.code === 1007 && /UTF-8/u.test(event.reason) ? 'INVALID_UTF8'
          : event.code === 1007 ? 'INVALID_JSON' : 'PROTOCOL_ERROR',
        event.reason.length > 0 ? event.reason : 'The WebSocket protocol closed with a transport fault.',
        event.code,
      );
      for (const listener of this.#errors) {
        try { listener(error); } catch { /* Observer failures are isolated. */ }
      }
      this.#terminalCleanup('closed', error);
      return;
    }
    this.#terminalCleanup('closed');
  };
  readonly #onError = (): void => {
    const error = this.#fault('PROTOCOL_ERROR', 'The WebSocket transport failed.', 1002);
    for (const listener of this.#errors) {
      try { listener(error); } catch { /* Observer failures are isolated. */ }
    }
    this.#shutdown('closed', 1002, error.message, error);
  };

  #fault(code: ProtocolTransportFault['code'], message: string, websocketCloseCode: 1002 | 1007): SceneTransportFaultError {
    return new SceneTransportFaultError({ kind: 'transport_fault', code, message, websocketCloseCode });
  }
  #protocolFault(message: string): void {
    const error = this.#fault('PROTOCOL_ERROR', message, 1002);
    for (const listener of this.#errors) {
      try { listener(error); } catch { /* Observer failures are isolated. */ }
    }
    this.#shutdown('closed', 1002, message, error);
  }
  #terminal(): boolean { return this.#state === 'closed' || this.#state === 'disposed'; }
  #setState(state: SceneTransportStatus): void {
    if (this.#state === state) return;
    this.#state = state;
    for (const listener of this.#statuses) {
      try { listener(state); } catch { /* Observer failures are isolated. */ }
    }
  }
  #shutdown(
    state: 'closed' | 'disposed',
    code = 1000,
    reason = 'Client closed.',
    error: Error = new SceneTransportClosedError(),
  ): void {
    if (this.#terminal()) return;
    try {
      this.#socket.removeEventListener('message', this.#onMessage);
      this.#socket.removeEventListener('close', this.#onClose);
      this.#socket.removeEventListener('error', this.#onError);
      if (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING) this.#socket.close(code, reason);
    } finally { this.#terminalCleanup(state, error); }
  }
  #terminalCleanup(state: 'closed' | 'disposed', error: Error = new SceneTransportClosedError()): void {
    if (this.#terminal()) return;
    this.#socket.removeEventListener('message', this.#onMessage);
    this.#socket.removeEventListener('close', this.#onClose);
    this.#socket.removeEventListener('error', this.#onError);
    for (const listener of this.#waitingForOpen) this.#socket.removeEventListener('open', listener);
    this.#waitingForOpen.clear();
    this.#setState(state);
    if (this.#rejectInitial !== null) this.#rejectInitial(error);
    this.#resolveInitial = null;
    this.#rejectInitial = null;
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
    this.#events.clear();
    this.#errors.clear();
    this.#statuses.clear();
  }
}

export function createWebSocketSceneTransport(
  url: string | URL,
  token: string,
  wireCodec?: WebSocketWireCodec,
): WebSocketSceneTransport {
  return new WebSocketSceneTransport(url, token, wireCodec);
}
