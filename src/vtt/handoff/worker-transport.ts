import type { SceneSnapshot } from './v1/contracts';
import type { HandoffResponse, ProtocolTransportFault, SceneSnapshotEvent } from './protocol-runtime';
import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport, type SceneTransportStatus } from './scene-transport';
import {
  decodeWorkerServerMessage, isSuccessfulSessionOpenResponse,
  type WorkerClientMessage, type WorkerConnectMessage,
} from './worker-messages';
import type { HandoffPrincipal } from './session-authorizer';
import { postWorkerMessage } from './worker-message-post';

interface Pending {
  id: string | null;
  readonly resolve: (response: HandoffResponse) => void;
  readonly reject: (error: Error) => void;
  receiptRevision: number | null;
}

function property(input: unknown, key: string): unknown {
  if (typeof input !== 'object' || input === null) return undefined;
  try { return Reflect.get(input, key); } catch { return undefined; }
}

type InstallWorkerFailureHandlers = (
  onError: () => void,
  onMessageError: () => void,
) => () => void;

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
  #removeWorkerFailureHandlers: () => void;
  #finished = false;

  constructor(
    readonly port: MessagePort,
    readonly terminate: (terminalFault: boolean) => void = () => port.close(),
    installWorkerFailureHandlers?: InstallWorkerFailureHandlers,
  ) {
    this.#initial = new Promise((resolve, reject) => {
      this.#resolveInitial = resolve;
      this.#rejectInitial = reject;
    });
    void this.#initial.catch(() => undefined);
    port.addEventListener('message', this.#onMessage);
    port.addEventListener('messageerror', this.#onPortMessageError);
    this.#removeWorkerFailureHandlers = installWorkerFailureHandlers?.(
      this.#onWorkerError,
      this.#onWorkerMessageError,
    ) ?? (() => undefined);
    port.start();
  }

  request(request: unknown): Promise<HandoffResponse> {
    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
    if (this.#invocation === Number.MAX_SAFE_INTEGER) {
      const fault = this.#fault('PROTOCOL_ERROR', 'Worker request invocation space was exhausted.');
      this.#terminalFault(fault);
      return Promise.reject(new SceneTransportFaultError(fault));
    }
    this.#invocation += 1;
    const invocation = this.#invocation;
    // Snapshot caller-controlled envelope getters only to preserve the lifecycle
    // recheck. Correlation relies exclusively on the single-use invocation and
    // metadata established by the Worker after structured cloning.
    property(request, 'id');
    property(request, 'method');
    if (this.#terminal()) return Promise.reject(new SceneTransportClosedError());
    let rejectRequest: ((error: Error) => void) | undefined;
    const promise = new Promise<HandoffResponse>((resolve, reject) => {
      rejectRequest = reject;
      this.#pending.set(invocation, {
        id: null, resolve, reject, receiptRevision: null,
      });
    });
    try {
      if (this.#terminal()) throw new SceneTransportClosedError();
      this.#post({ kind: 'request', invocation, request });
    } catch {
      this.#pending.delete(invocation);
      if (this.#terminal()) {
        rejectRequest?.(new SceneTransportClosedError());
        return promise;
      }
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

  pendingRequestCount(): number { return this.#pending.size; }

  hostTerminated(): void {
    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker host terminated the shared connection.'));
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
    const message = decodeWorkerServerMessage(messageEvent.data);
    if (message === null) {
      this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an invalid message envelope.'));
      return;
    }
    if (message.kind === 'event') {
      if (message.receiptInvocation !== undefined) {
        const pending = this.#pending.get(message.receiptInvocation);
        if (
          pending === undefined || message.receiptRevision === undefined || message.receiptId === undefined
        ) {
          this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an uncorrelated mutation receipt.'));
          return;
        }
        pending.id = message.receiptId;
        pending.receiptRevision = message.receiptRevision;
      }
      this.#resolveInitial?.(message.event.data);
      this.#resolveInitial = null;
      this.#rejectInitial = null;
      for (const listener of this.#events) { try { listener(message.event); } catch { /* Isolated observer. */ } }
      return;
    }
    if (message.kind === 'fault') { this.#emitFault(message.fault); return; }
    if (message.kind === 'request-fault') {
      const pending = this.#pending.get(message.invocation);
      if (pending === undefined) {
        this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker emitted an uncorrelated request fault.'));
        return;
      }
      this.#pending.delete(message.invocation);
      pending.reject(new SceneTransportFaultError(message.fault));
      return;
    }
    if (message.kind === 'response') {
      const pending = this.#pending.get(message.invocation);
      if (pending === undefined || pending.id !== null && pending.id !== message.response.id) {
        this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker response correlation failed.'));
        return;
      }
      this.#pending.delete(message.invocation);
      pending.id = message.response.id;
      if (isSuccessfulSessionOpenResponse(message.response)) this.#setStatus('open');
      pending.resolve(message.response);
      return;
    }
    this.#peerClosed();
  };

  readonly #onPortMessageError = (): void => {
    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker port could not decode a message.'));
  };
  readonly #onWorkerError = (): void => {
    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker execution failed.'));
  };
  readonly #onWorkerMessageError = (): void => {
    this.#terminalFault(this.#fault('PROTOCOL_ERROR', 'Worker could not decode a host message.'));
  };

  #post(message: WorkerClientMessage): void { postWorkerMessage(this.port, message); }
  #fault(code: ProtocolTransportFault['code'], message: string): ProtocolTransportFault {
    return { kind: 'transport_fault', code, message, websocketCloseCode: code === 'PROTOCOL_ERROR' ? 1002 : 1007 };
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
      this.#emitFault(this.#fault('PROTOCOL_ERROR', 'Worker cleanup message could not cross the message boundary.'));
    } finally {
      this.#finishShutdown(new SceneTransportClosedError(), false);
    }
  }
  #terminal(): boolean { return this.#status === 'closed' || this.#status === 'disposed'; }
  #terminalFault(fault: ProtocolTransportFault): void {
    if (this.#terminal()) return;
    const error = new SceneTransportFaultError(fault);
    this.#setStatus('closed');
    this.#emitFault(fault);
    this.#finishShutdown(error, true);
  }
  #peerClosed(): void {
    if (this.#terminal()) return;
    const fault = this.#fault('PROTOCOL_ERROR', 'Worker peer closed the transport.');
    const error = new SceneTransportFaultError(fault);
    this.#setStatus('closed');
    this.#emitFault(fault);
    this.#finishShutdown(error, false);
  }
  #finishShutdown(error: Error, terminalFault: boolean): void {
    if (this.#finished) return;
    this.#finished = true;
    this.#rejectInitial?.(error);
    this.#resolveInitial = null;
    this.#rejectInitial = null;
    for (const [invocation, pending] of this.#pending) {
      if (pending.receiptRevision !== null && pending.id !== null) {
        pending.resolve({ v: 1, id: pending.id, ok: true, result: { revision: pending.receiptRevision } });
      } else pending.reject(error);
      this.#pending.delete(invocation);
    }
    this.port.removeEventListener('message', this.#onMessage);
    this.port.removeEventListener('messageerror', this.#onPortMessageError);
    this.#removeWorkerFailureHandlers();
    this.#events.clear();
    this.#errors.clear();
    this.#statuses.clear();
    try { this.port.close(); } finally { this.terminate(terminalFault); }
  }
  #setStatus(status: SceneTransportStatus): void {
    if (this.#status === status) return;
    this.#status = status;
    for (const listener of this.#statuses) { try { listener(status); } catch { /* Isolated observer. */ } }
  }
}

export interface HandoffWorkerConnection {
  readonly sessionKey: string;
  readonly principal: HandoffPrincipal;
}

let defaultSessionSequence = 0;

export function createHandoffWorkerTransport(
  connection: HandoffWorkerConnection = {
    sessionKey: `transport:${String(++defaultSessionSequence)}`,
    principal: { role: 'dm' },
  },
): WorkerSceneTransport {
  const worker = new Worker(
    new URL('./worker-entry.ts', import.meta.url),
    { type: 'module', name: 'vtt-handoff-worker' },
  );
  const channel = new MessageChannel();
  const connect: WorkerConnectMessage = {
    kind: 'vtt-handoff.connect', port: channel.port2,
    sessionKey: connection.sessionKey, principal: connection.principal,
  };
  worker.postMessage(connect, [channel.port2]);
  return new WorkerSceneTransport(
    channel.port1,
    () => worker.terminate(),
    (onError, onMessageError) => {
      worker.addEventListener('error', onError);
      worker.addEventListener('messageerror', onMessageError);
      return () => {
        worker.removeEventListener('error', onError);
        worker.removeEventListener('messageerror', onMessageError);
      };
    },
  );
}

export interface HandoffWorkerHost {
  connect(connection: HandoffWorkerConnection): WorkerSceneTransport;
  terminate(): void;
}

export function createHandoffWorkerHost(): HandoffWorkerHost {
  const worker = new Worker(
    new URL('./worker-entry.ts', import.meta.url),
    { type: 'module', name: 'vtt-handoff-worker' },
  );
  const transports = new Set<WorkerSceneTransport>();
  let terminated = false;
  const terminate = (notifyConnections: boolean): void => {
    if (terminated) return;
    terminated = true;
    worker.terminate();
    if (notifyConnections) {
      for (const transport of [...transports]) transport.hostTerminated();
      transports.clear();
    }
  };
  return {
    connect(connection) {
      if (terminated) throw new SceneTransportClosedError();
      const channel = new MessageChannel();
      const connect: WorkerConnectMessage = {
        kind: 'vtt-handoff.connect', port: channel.port2,
        sessionKey: connection.sessionKey, principal: connection.principal,
      };
      worker.postMessage(connect, [channel.port2]);
      let transport: WorkerSceneTransport;
      transport = new WorkerSceneTransport(
        channel.port1,
        (terminalFault) => {
          transports.delete(transport);
          if (terminalFault) terminate(true);
          else if (transports.size === 0) terminate(false);
        },
        (onError, onMessageError) => {
          worker.addEventListener('error', onError);
          worker.addEventListener('messageerror', onMessageError);
          return () => {
            worker.removeEventListener('error', onError);
            worker.removeEventListener('messageerror', onMessageError);
          };
        },
      );
      transports.add(transport);
      return transport;
    },
    terminate: () => terminate(true),
  };
}
