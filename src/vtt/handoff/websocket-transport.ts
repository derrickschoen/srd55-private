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

function objectEnvelope(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
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

  constructor(url: string | URL, token: string) {
    this.#initial = new Promise((resolve, reject) => {
      this.#resolveInitial = resolve;
      this.#rejectInitial = reject;
    });
    void this.#initial.catch(() => undefined);
    this.#socket = new WebSocket(url, ['vtt.v1', `bearer.${token}`]);
    this.#socket.addEventListener('message', this.#onMessage);
    this.#socket.addEventListener('close', this.#onClose);
    this.#socket.addEventListener('error', this.#onError);
  }

  request(request: unknown): Promise<HandoffResponse> {
    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
    return new Promise<HandoffResponse>((resolve, reject) => {
      let wire: string | undefined;
      let rootSerializedValue: unknown;
      let id: string | null = null;
      let method: string | null = null;
      try {
        wire = JSON.stringify(request, function captureWireIdentity(
          this: unknown, key: string, value: unknown,
        ): unknown {
          if (key === '') rootSerializedValue = value;
          else if (this === rootSerializedValue && key === 'id') id = typeof value === 'string' ? value : null;
          else if (this === rootSerializedValue && key === 'method') method = typeof value === 'string' ? value : null;
          return value;
        });
      } catch {
        reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
        return;
      }

      if (wire === undefined) {
        reject(this.#fault('PROTOCOL_ERROR', 'The request is not JSON serializable.', 1002));
        return;
      }
      if (id !== null && this.#pending.has(id)) {
        reject(this.#fault('PROTOCOL_ERROR', 'A request with this id is already pending.', 1002));
        return;
      }
      this.#uncorrelatedSequence += 1;
      const pendingKey = id ?? `\u0000uncorrelated:${String(this.#uncorrelatedSequence)}`;
      this.#pending.set(pendingKey, { method, resolve, reject });
      if (this.#terminal()) {
        this.#pending.delete(pendingKey);
        reject(new SceneTransportClosedError());
        return;
      }

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
  close(): void { this.#terminate('closed', new SceneTransportClosedError(), 1000, 'Client closed.'); }
  dispose(): void { this.#terminate('disposed', new SceneTransportClosedError(), 1000, 'Client disposed.'); }
  destroySession(): void { this.dispose(); }
  pendingRequestCount(): number { return this.#pending.size; }
  negotiatedProtocol(): string { return this.#socket.protocol; }
  endpointUrl(): string { return this.#socket.url; }

  readonly #onMessage = (message: MessageEvent<unknown>): void => {
    if (typeof message.data !== 'string') { this.#protocolFault('The socket emitted a non-text message.'); return; }
    let value: unknown;
    try { value = JSON.parse(message.data) as unknown; }
    catch { this.#protocolFault('The socket emitted invalid JSON.'); return; }
    const envelope = objectEnvelope(value);
    if (envelope?.event === 'scene.snapshot') {
      const event = handoffEventSchema._zod.run({ value, issues: [] }, { async: false, jitless: true });
      if (event instanceof Promise || event.issues.length > 0) {
        this.#protocolFault('The socket emitted an invalid event.');
        return;
      }
      const snapshotEvent = event.value as SceneSnapshotEvent;
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
    if (typeof envelope?.ok !== 'boolean' || typeof envelope.id !== 'string') {
      this.#protocolFault('The socket emitted an invalid protocol message.');
      return;
    }
    const response = handoffResponseSchema._zod.run({ value, issues: [] }, { async: false, jitless: true });
    if (response instanceof Promise || response.issues.length > 0) {
      this.#protocolFault('The socket emitted an invalid response.');
      return;
    }
    const parsedResponse = response.value as HandoffResponse;
    const pending = this.#pending.get(parsedResponse.id);
    if (pending === undefined) { this.#protocolFault('The socket emitted an uncorrelated response.'); return; }
    this.#pending.delete(parsedResponse.id);
    if (pending.method === 'session.open' && parsedResponse.ok) this.#setState('open');
    pending.resolve(parsedResponse);
  };

  readonly #onClose = (event: CloseEvent): void => {
    if (event.code === 1007 || event.code === 1002) {
      const error = this.#fault(
        event.code === 1007 && /UTF-8/u.test(event.reason) ? 'INVALID_UTF8'
          : event.code === 1007 ? 'INVALID_JSON' : 'PROTOCOL_ERROR',
        event.reason.length > 0 ? event.reason : 'The WebSocket protocol closed with a transport fault.',
        event.code,
      );
      this.#terminate('closed', error, null);
      return;
    }
    this.#terminate('closed', new SceneTransportClosedError(), null);
  };
  readonly #onError = (): void => {
    const error = this.#fault('PROTOCOL_ERROR', 'The WebSocket transport failed.', 1002);
    this.#terminate('closed', error, 4001, 'Transport failed.');
  };

  #fault(code: ProtocolTransportFault['code'], message: string, websocketCloseCode: 1002 | 1007): SceneTransportFaultError {
    return new SceneTransportFaultError({ kind: 'transport_fault', code, message, websocketCloseCode });
  }
  #protocolFault(message: string): void {
    this.#terminate('closed', this.#fault('PROTOCOL_ERROR', message, 1002), 4000, 'Invalid server message.');
  }
  #terminal(): boolean { return this.#state === 'closed' || this.#state === 'disposed'; }
  #setState(state: SceneTransportStatus): void {
    if (this.#state === state) return;
    this.#state = state;
    for (const listener of [...this.#statuses]) {
      try { listener(state); } catch { /* Observer failures are isolated. */ }
    }
  }
  #terminate(
    state: 'closed' | 'disposed',
    error: Error,
    closeCode: 1000 | 4000 | 4001 | null,
    closeReason = '',
  ): void {
    if (this.#terminal()) return;
    this.#setState(state);
    const errorListeners = error instanceof SceneTransportFaultError ? [...this.#errors] : [];
    this.#socket.removeEventListener('message', this.#onMessage);
    this.#socket.removeEventListener('close', this.#onClose);
    this.#socket.removeEventListener('error', this.#onError);
    for (const listener of this.#waitingForOpen) this.#socket.removeEventListener('open', listener);
    this.#waitingForOpen.clear();
    if (this.#rejectInitial !== null) this.#rejectInitial(error);
    this.#resolveInitial = null;
    this.#rejectInitial = null;
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
    this.#events.clear();
    this.#errors.clear();
    this.#statuses.clear();
    for (const listener of errorListeners) {
      try { listener(error as SceneTransportFaultError); } catch { /* Observer failures are isolated. */ }
    }
    if (closeCode !== null && (this.#socket.readyState === WebSocket.OPEN || this.#socket.readyState === WebSocket.CONNECTING)) {
      try { this.#socket.close(closeCode, closeReason); } catch { /* Local cleanup is already complete. */ }
    }
  }
}

export function createWebSocketSceneTransport(url: string | URL, token: string): WebSocketSceneTransport {
  return new WebSocketSceneTransport(url, token);
}
