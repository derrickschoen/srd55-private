import {
  type HandoffResponse,
  type ProtocolEstablishedReceipt,
  ProtocolRuntime,
  type ProtocolTransportFault,
  type SceneSnapshotEvent,
} from './protocol-runtime';
import {
  SceneTransportClosedError,
  SceneTransportFaultError,
  type SceneTransport,
  type SceneTransportStatus,
} from './scene-transport';
import type { SceneSnapshot } from './v1/contracts';
import type { SessionInvocationToken } from '../encounter-session-service';

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
}

interface PendingRequest extends Deferred<HandoffResponse> {
  readonly requestId: string | null;
  readonly method: string | null;
  readonly invocationToken: SessionInvocationToken;
  establishedResponse: HandoffResponse | null;
  receiptRevision: number | null;
}

function requestIdOf(request: unknown): string | null {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) return null;
  try {
    const id = Reflect.get(request, 'id');
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

function requestMethodOf(request: unknown): string | null {
  if (typeof request !== 'object' || request === null || Array.isArray(request)) return null;
  try {
    const method = Reflect.get(request, 'method');
    return typeof method === 'string' ? method : null;
  } catch {
    return null;
  }
}

function deferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((error: Error) => void) | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: (value) => resolvePromise?.(value),
    reject: (error) => rejectPromise?.(error),
  };
}

export class InProcessSceneTransport implements SceneTransport {
  readonly #eventListeners = new Set<(event: SceneSnapshotEvent) => void>();
  readonly #statusListeners = new Set<(status: SceneTransportStatus) => void>();
  readonly #errorListeners = new Set<(error: SceneTransportFaultError) => void>();
  readonly #pending = new Set<PendingRequest>();
  readonly #initial = deferred<SceneSnapshot>();
  readonly #unsubscribeRuntimeEvent: () => void;
  readonly #unsubscribeRuntimeFault: () => void;
  #state: SceneTransportStatus = 'connecting';
  #initialSettled = false;

  constructor(private readonly runtime: ProtocolRuntime) {
    void this.#initial.promise.catch(() => undefined);
    this.#unsubscribeRuntimeEvent = runtime.subscribe((event, receipt) => this.#receiveEvent(event, receipt));
    this.#unsubscribeRuntimeFault = runtime.subscribeFaults((event) => this.#receiveFault(event));
  }

  request(request: unknown): Promise<HandoffResponse> {
    if (this.#state === 'closed' || this.#state === 'disposed') {
      return Promise.reject(new SceneTransportClosedError());
    }
    const invocationToken = this.runtime.createInvocationToken();
    const pending: PendingRequest = {
      ...deferred<HandoffResponse>(),
      requestId: requestIdOf(request),
      method: requestMethodOf(request),
      invocationToken,
      establishedResponse: null,
      receiptRevision: null,
    };
    this.#pending.add(pending);
    void this.runtime.dispatch(request, undefined, invocationToken, (response) => {
      if (
        this.#pending.has(pending) &&
        (pending.method === 'token.move' || pending.method === 'door.set' || pending.method === 'light.set')
      ) pending.establishedResponse = response;
    }).then((result) => {
      if (!this.#pending.delete(pending)) return;
      if (result.kind === 'transport_fault') {
        pending.reject(new SceneTransportFaultError(result.fault));
        return;
      }
      if (
        this.#state === 'connecting' &&
        result.response.ok &&
        typeof request === 'object' && request !== null &&
        Reflect.get(request, 'method') === 'session.open'
      ) this.#setStatus('open');
      pending.resolve(result.response);
    }, (error: unknown) => {
      if (!this.#pending.delete(pending)) return;
      pending.reject(error instanceof Error ? error : new Error(String(error)));
    });
    return pending.promise;
  }

  initialSnapshot(): Promise<SceneSnapshot> {
    if (this.#state === 'closed' || this.#state === 'disposed') {
      return Promise.reject(new SceneTransportClosedError());
    }
    return this.#initial.promise;
  }

  subscribe(listener: (event: SceneSnapshotEvent) => void): () => void {
    if (this.#state === 'closed' || this.#state === 'disposed') return () => undefined;
    this.#eventListeners.add(listener);
    return () => this.#eventListeners.delete(listener);
  }

  status(): SceneTransportStatus {
    return this.#state;
  }

  subscribeStatus(listener: (status: SceneTransportStatus) => void): () => void {
    try { listener(this.#state); } catch { /* Observer failure is isolated. */ }
    if (this.#state === 'closed' || this.#state === 'disposed') return () => undefined;
    this.#statusListeners.add(listener);
    return () => this.#statusListeners.delete(listener);
  }

  subscribeErrors(listener: (error: SceneTransportFaultError) => void): () => void {
    if (this.#state === 'closed' || this.#state === 'disposed') return () => undefined;
    this.#errorListeners.add(listener);
    return () => this.#errorListeners.delete(listener);
  }

  close(): void {
    if (this.#state === 'closed' || this.#state === 'disposed') return;
    let closeError: unknown;
    try {
      this.#unsubscribeRuntimeEvent();
      this.#unsubscribeRuntimeFault();
      this.runtime.close();
    } catch (error: unknown) {
      closeError = error;
    } finally {
      this.#eventListeners.clear();
      this.#errorListeners.clear();
      this.#setStatus('closed');
      this.#statusListeners.clear();
      this.#settleReceiptsAndRejectPending();
    }
    if (closeError !== undefined) throw closeError;
  }

  dispose(): void {
    if (this.#state === 'disposed') return;
    let disposeError: unknown;
    try {
      this.#unsubscribeRuntimeEvent();
      this.#unsubscribeRuntimeFault();
      this.runtime.dispose();
    } catch (error: unknown) {
      disposeError = error;
    } finally {
      this.#eventListeners.clear();
      this.#errorListeners.clear();
      this.#setStatus('disposed');
      this.#statusListeners.clear();
      this.#settleReceiptsAndRejectPending();
    }
    if (disposeError !== undefined) throw disposeError;
  }

  destroySession(): void {
    let destroyError: unknown;
    try {
      this.#unsubscribeRuntimeEvent();
      this.#unsubscribeRuntimeFault();
      this.runtime.destroySession();
    } catch (error: unknown) {
      destroyError = error;
    } finally {
      this.#eventListeners.clear();
      this.#errorListeners.clear();
      this.#setStatus('disposed');
      this.#statusListeners.clear();
      this.#settleReceiptsAndRejectPending();
    }
    if (destroyError !== undefined) throw destroyError;
  }

  #receiveEvent(event: SceneSnapshotEvent, receipt?: ProtocolEstablishedReceipt): void {
    if (receipt !== undefined) {
      const pending = [...this.#pending].find((candidate) =>
        candidate.invocationToken === receipt.invocationToken &&
        (candidate.method === 'token.move' || candidate.method === 'door.set') &&
        candidate.receiptRevision === null);
      if (pending !== undefined) pending.receiptRevision = receipt.revision;
    }
    if (!this.#initialSettled) {
      this.#initialSettled = true;
      this.#initial.resolve(event.data);
    }
    for (const listener of this.#eventListeners) {
      try { listener(event); } catch { /* Observer failure is isolated. */ }
    }
  }

  #receiveFault(fault: ProtocolTransportFault): void {
    const error = new SceneTransportFaultError(fault);
    for (const listener of this.#errorListeners) {
      try { listener(error); } catch { /* Observer failure is isolated. */ }
    }
  }

  #settleReceiptsAndRejectPending(): void {
    const error = new SceneTransportClosedError();
    if (!this.#initialSettled) {
      this.#initialSettled = true;
      this.#initial.reject(error);
    }
    for (const pending of this.#pending) {
      if (pending.establishedResponse !== null) {
        pending.resolve(pending.establishedResponse);
      } else if (
        pending.requestId !== null &&
        (pending.method === 'token.move' || pending.method === 'door.set') &&
        pending.receiptRevision !== null
      ) {
        pending.resolve({
          v: 1,
          id: pending.requestId,
          ok: true,
          result: { revision: pending.receiptRevision },
        });
      } else {
        pending.reject(error);
      }
    }
    this.#pending.clear();
  }

  #setStatus(status: SceneTransportStatus): void {
    if (this.#state === status) return;
    this.#state = status;
    for (const listener of this.#statusListeners) {
      try { listener(status); } catch { /* Observer failure is isolated. */ }
    }
  }
}
