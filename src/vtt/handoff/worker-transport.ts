import { handoffEventSchema, handoffResponseSchema, type SceneSnapshot } from './v1/contracts';
import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus } from './scene-transport';
import {
  workerServerMessageSchema, type WorkerClientMessage, type WorkerConnectMessage,
} from './worker-messages';

interface Pending {
  readonly id: string | null;
  readonly method: string | null;
  readonly resolve: (response: HandoffResponse) => void;
  readonly reject: (error: Error) => void;
  receiptRevision: number | null;
}

function property(input: unknown, key: string): unknown {
  if (typeof input !== 'object' || input === null) return undefined;
  try { return Reflect.get(input, key); } catch { return undefined; }
}

export class WorkerSceneTransport implements SceneTransport {
  readonly #pending = new Map<number, Pending>();
  readonly #events = new Set<(event: SceneSnapshotEvent) => void>();
  readonly #statuses = new Set<(status: SceneTransportStatus) => void>();
  readonly #errors = new Set<(error: SceneTransportFaultError) => void>();
  #status: SceneTransportStatus = 'connecting';
  #invocation = 0;
  #initial: Promise<SceneSnapshot>;
  #resolveInitial: ((snapshot: SceneSnapshot) => void) | null = null;
  #rejectInitial: ((error: Error) => void) | null = null;

  constructor(readonly port: MessagePort, readonly terminate: () => void = () => port.close()) {
    this.#initial = new Promise((resolve, reject) => {
      this.#resolveInitial = resolve;
      this.#rejectInitial = reject;
    });
    void this.#initial.catch(() => undefined);
    port.addEventListener('message', this.#onMessage);
    port.start();
  }

  request(request: unknown): Promise<HandoffResponse> {
    if (this.#status === 'closed' || this.#status === 'disposed') return Promise.reject(new SceneTransportClosedError());
    this.#invocation += 1;
    const invocation = this.#invocation;
    const idValue = property(request, 'id');
    const methodValue = property(request, 'method');
    let rejectRequest: ((error: Error) => void) | undefined;
    const promise = new Promise<HandoffResponse>((resolve, reject) => {
      rejectRequest = reject;
      this.#pending.set(invocation, {
        id: typeof idValue === 'string' ? idValue : null,
        method: typeof methodValue === 'string' ? methodValue : null,
        resolve, reject, receiptRevision: null,
      });
    });
    try {
      this.#post({ kind: 'request', invocation, request });
    } catch {
      this.#pending.delete(invocation);
      const fault: ProtocolTransportFault = {
        kind: 'transport_fault', code: 'PROTOCOL_ERROR',
        message: 'Worker request could not cross the message boundary.', websocketCloseCode: 1002,
      };
      this.#emitFault(fault);
      rejectRequest?.(new SceneTransportFaultError(fault));
      return promise;
    }
    return promise;
  }

  initialSnapshot(): Promise<SceneSnapshot> { return this.#initial; }
  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void { this.#events.add(listener); return () => this.#events.delete(listener); }
  status(): SceneTransportStatus { return this.#status; }
  subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void {
    try { listener(this.#status); } catch { /* Isolated observer. */ }
    this.#statuses.add(listener);
    return () => this.#statuses.delete(listener);
  }
  subscribeErrors(listener: (error: SceneTransportFaultError) => void): () => void { this.#errors.add(listener); return () => this.#errors.delete(listener); }
  close(): void { this.#shutdown('closed', 'close'); }
  dispose(): void { this.#shutdown('disposed', 'dispose'); }
  destroySession(): void { this.#shutdown('disposed', 'destroy'); }

  readonly #onMessage = (messageEvent: MessageEvent<unknown>): void => {
    const decoded = workerServerMessageSchema.safeParse(messageEvent.data);
    if (!decoded.success) { this.#protocolFault('Worker emitted an invalid message envelope.'); return; }
    const message = decoded.data;
    if (message.kind === 'event') {
      const parsed = handoffEventSchema.safeParse(message.event);
      if (!parsed.success) { this.#protocolFault('Worker emitted an invalid event.'); return; }
      if (message.receiptInvocation !== undefined) {
        const pending = this.#pending.get(message.receiptInvocation);
        if (pending !== undefined && (pending.method === 'token.move' || pending.method === 'door.set')) {
          pending.receiptRevision = message.receiptRevision ?? null;
        }
      }
      this.#resolveInitial?.(parsed.data.data);
      this.#resolveInitial = null;
      this.#rejectInitial = null;
      for (const listener of this.#events) { try { listener(parsed.data); } catch { /* Isolated observer. */ } }
      return;
    }
    if (message.kind === 'fault') { this.#emitFault(message.fault); return; }
    if (message.kind === 'request-fault') {
      const pending = this.#pending.get(message.invocation);
      if (pending !== undefined) { this.#pending.delete(message.invocation); pending.reject(new SceneTransportFaultError(message.fault)); }
      return;
    }
    if (message.kind === 'response') {
      const pending = this.#pending.get(message.invocation);
      if (pending === undefined) return;
      const parsed = handoffResponseSchema.safeParse(message.response);
      if (!parsed.success || pending.id !== null && parsed.data.id !== pending.id) { this.#protocolFault('Worker response correlation failed.'); return; }
      this.#pending.delete(message.invocation);
      if (pending.method === 'session.open' && parsed.data.ok) this.#setStatus('open');
      pending.resolve(parsed.data);
      return;
    }
    this.#finishShutdown();
  };

  #post(message: WorkerClientMessage): void { this.port.postMessage(message); }
  #protocolFault(message: string): void {
    this.#emitFault({ kind: 'transport_fault', code: 'PROTOCOL_ERROR', message, websocketCloseCode: 1002 });
  }
  #emitFault(fault: ProtocolTransportFault): void {
    const error = new SceneTransportFaultError(fault);
    for (const listener of this.#errors) { try { listener(error); } catch { /* Isolated observer. */ } }
  }
  #shutdown(status: SceneTransportStatus, kind: 'close' | 'dispose' | 'destroy'): void {
    if (this.#status === 'closed' || this.#status === 'disposed') return;
    this.#setStatus(status);
    try {
      this.#post({ kind });
    } catch {
      this.#protocolFault('Worker cleanup message could not cross the message boundary.');
    } finally {
      this.#finishShutdown();
    }
  }
  #finishShutdown(): void {
    const error = new SceneTransportClosedError();
    this.#rejectInitial?.(error);
    this.#resolveInitial = null;
    this.#rejectInitial = null;
    for (const [invocation, pending] of this.#pending) {
      if (pending.receiptRevision !== null && pending.id !== null && (pending.method === 'token.move' || pending.method === 'door.set')) {
        pending.resolve({ v: 1, id: pending.id, ok: true, result: { revision: pending.receiptRevision } });
      } else pending.reject(error);
      this.#pending.delete(invocation);
    }
    this.port.removeEventListener('message', this.#onMessage);
    this.#events.clear();
    this.#errors.clear();
    this.#statuses.clear();
    this.terminate();
  }
  #setStatus(status: SceneTransportStatus): void {
    if (this.#status === status) return;
    this.#status = status;
    for (const listener of this.#statuses) { try { listener(status); } catch { /* Isolated observer. */ } }
  }
}

export function createHandoffWorkerTransport(): WorkerSceneTransport {
  const worker = new Worker(
    new URL('./worker-entry.ts', import.meta.url),
    { type: 'module', name: 'vtt-handoff-worker' },
  );
  const channel = new MessageChannel();
  const connect: WorkerConnectMessage = { kind: 'vtt-handoff.connect', port: channel.port2 };
  worker.postMessage(connect, [channel.port2]);
  return new WorkerSceneTransport(channel.port1, () => worker.terminate());
}
