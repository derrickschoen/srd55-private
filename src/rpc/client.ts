import {
  RpcError,
  type RpcRequest,
  type RpcResponse,
} from './protocol';

export interface RpcTransport {
  postMessage(message: RpcRequest, transfer?: Transferable[]): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  addEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  removeEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  terminate?: () => void;
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export function transportErrorMessage(event: ErrorEvent): string {
  const message = event.message.trim();
  if (message !== '') {
    return message;
  }
  if (event.error instanceof Error) {
    const nestedMessage = event.error.message.trim();
    if (nestedMessage !== '') {
      return nestedMessage;
    }
  } else if (typeof event.error === 'string' && event.error.trim() !== '') {
    return event.error.trim();
  }
  return 'Database worker failed to load or crashed; the browser reported no details.';
}

export class RpcClient {
  #nextId = 1;
  readonly #pending = new Map<number, PendingRequest>();
  #closed = false;

  readonly #onMessage = (event: MessageEvent<RpcResponse>): void => {
    const response = event.data;
    const pending = this.#pending.get(response.id);
    if (pending === undefined) {
      return;
    }
    this.#pending.delete(response.id);
    if (response.ok) {
      pending.resolve(response.result);
      return;
    }
    pending.reject(
      new RpcError(
        response.error.code,
        response.error.message,
        response.error.data,
      ),
    );
  };

  readonly #onError = (event: ErrorEvent): void => {
    this.#rejectAll(
      new RpcError('transport_error', transportErrorMessage(event)),
    );
  };

  constructor(private readonly transport: RpcTransport) {
    transport.addEventListener('message', this.#onMessage);
    transport.addEventListener('error', this.#onError);
  }

  call<P, R>(
    method: string,
    params: P,
    transfer: Transferable[] = [],
  ): Promise<R> {
    if (this.#closed) {
      return Promise.reject(
        new RpcError('transport_error', 'RPC client is closed.'),
      );
    }
    const id = this.#nextId++;
    return new Promise<R>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.transport.postMessage({ id, method, params }, transfer);
    });
  }

  close(): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    this.transport.removeEventListener('message', this.#onMessage);
    this.transport.removeEventListener('error', this.#onError);
    this.transport.terminate?.();
    this.#rejectAll(
      new RpcError('transport_error', 'RPC client was closed.'),
    );
  }

  #rejectAll(error: Error): void {
    for (const request of this.#pending.values()) {
      request.reject(error);
    }
    this.#pending.clear();
  }
}
