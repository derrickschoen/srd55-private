import type { RpcTransport } from '../../src/rpc/client';
import {
  rpcFailure,
  type RpcRequest,
  type RpcResponse,
} from '../../src/rpc/protocol';
import { degradedRejection, type DatabaseBoot } from '../../src/worker/boot';

type MessageListener = (event: MessageEvent<RpcResponse>) => void;
type ErrorListener = (event: ErrorEvent) => void;

/**
 * The database worker's side of the boundary for a boot that DEGRADED, as the
 * main thread's `RpcClient` sees it.
 *
 * It answers a request exactly as `src/db/worker.ts` `respond()` does for a
 * method the degraded boot refuses: `degradedRejection(boot, method)` in a
 * `rpcFailure` envelope — and then STRUCTURED-CLONES that envelope, because
 * that is the only thing that crosses a real worker boundary. A reason that
 * lives in an `Error` subclass or a class instance would not survive this; a
 * reason in the envelope's JSON `data` does.
 *
 * A method the degraded boot would dispatch is refused loudly here: this
 * transport stands in only for the rejection path.
 */
export class DegradedWorkerTransport implements RpcTransport {
  readonly #messageListeners = new Set<MessageListener>();
  readonly requestedMethods: string[] = [];

  constructor(private readonly boot: DatabaseBoot) {}

  postMessage(message: RpcRequest): void {
    this.requestedMethods.push(message.method);
    const rejection = degradedRejection(this.boot, message.method);
    if (rejection === null) {
      throw new Error(`"${message.method}" is dispatchable on this boot; the transport answers rejections only.`);
    }
    const response: RpcResponse = structuredClone(
      rpcFailure(message.id, rejection.toPayload()),
    );
    queueMicrotask(() => {
      for (const listener of this.#messageListeners) {
        listener(new MessageEvent('message', { data: response }));
      }
    });
  }

  addEventListener(
    type: 'message' | 'error',
    listener: MessageListener | ErrorListener,
  ): void {
    if (type === 'message') {
      this.#messageListeners.add(listener as MessageListener);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: MessageListener | ErrorListener,
  ): void {
    if (type === 'message') {
      this.#messageListeners.delete(listener as MessageListener);
    }
  }
}
