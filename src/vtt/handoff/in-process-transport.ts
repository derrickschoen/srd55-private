import {
  type HandoffResponse,
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

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
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
  readonly #pending = new Set<Deferred<HandoffResponse>>();
  readonly #initial = deferred<SceneSnapshot>();
  readonly #unsubscribeRuntimeEvent: () => void;
  readonly #unsubscribeRuntimeFault: () => void;
  #state: SceneTransportStatus = 'connecting';
  #initialSettled = false;

  constructor(private readonly runtime: ProtocolRuntime) {
    void this.#initial.promise.catch(() => undefined);
    this.#unsubscribeRuntimeEvent = runtime.subscribe((event) => this.#receiveEvent(event));
    this.#unsubscribeRuntimeFault = runtime.subscribeFaults((event) => this.#receiveFault(event));
  }

  request(request: unknown): Promise<HandoffResponse> {
    if (this.#state === 'closed' || this.#state === 'disposed') {
      return Promise.reject(new SceneTransportClosedError());
    }
    const pending = deferred<HandoffResponse>();
    this.#pending.add(pending);
    void this.runtime.dispatch(request).then((result) => {
      if (!this.#pending.delete(pending)) return;
      if (result.kind === 'transport_fault') {
        pending.reject(new SceneTransportFaultError(result.fault));
        return;
      }
      if (
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
    listener(this.#state);
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
    this.#rejectPending();
    this.#unsubscribeRuntimeEvent();
    this.#unsubscribeRuntimeFault();
    this.runtime.close();
    this.#eventListeners.clear();
    this.#errorListeners.clear();
    this.#setStatus('closed');
    this.#statusListeners.clear();
  }

  dispose(): void {
    if (this.#state === 'disposed') return;
    if (this.#state !== 'closed') {
      this.#rejectPending();
      this.#unsubscribeRuntimeEvent();
      this.#unsubscribeRuntimeFault();
      this.#eventListeners.clear();
      this.#errorListeners.clear();
    }
    this.runtime.dispose();
    this.#setStatus('disposed');
    this.#statusListeners.clear();
  }

  #receiveEvent(event: SceneSnapshotEvent): void {
    if (!this.#initialSettled) {
      this.#initialSettled = true;
      this.#initial.resolve(event.data);
    }
    for (const listener of this.#eventListeners) listener(event);
  }

  #receiveFault(fault: ProtocolTransportFault): void {
    const error = new SceneTransportFaultError(fault);
    for (const listener of this.#errorListeners) listener(error);
  }

  #rejectPending(): void {
    const error = new SceneTransportClosedError();
    if (!this.#initialSettled) {
      this.#initialSettled = true;
      this.#initial.reject(error);
    }
    for (const pending of this.#pending) pending.reject(error);
    this.#pending.clear();
  }

  #setStatus(status: SceneTransportStatus): void {
    if (this.#state === status) return;
    this.#state = status;
    for (const listener of this.#statusListeners) listener(status);
  }
}
