import { describe, expect, it } from 'vitest';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';

class ErrorTransport implements RpcTransport {
  readonly #messageListeners = new Set<
    (event: MessageEvent<RpcResponse>) => void
  >();
  readonly #errorListeners = new Set<(event: ErrorEvent) => void>();

  postMessage(_message: RpcRequest): void {}

  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messageListeners.add(
        listener as (event: MessageEvent<RpcResponse>) => void,
      );
    } else {
      this.#errorListeners.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messageListeners.delete(
        listener as (event: MessageEvent<RpcResponse>) => void,
      );
    } else {
      this.#errorListeners.delete(listener as (event: ErrorEvent) => void);
    }
  }

  fail(event: Pick<ErrorEvent, 'message' | 'error'>): void {
    for (const listener of this.#errorListeners) {
      listener(event as ErrorEvent);
    }
  }
}

describe('RPC transport failures', () => {
  it('preserves worker error detail when ErrorEvent.message is empty', async () => {
    const transport = new ErrorTransport();
    const client = new RpcClient(transport);
    const pending = client.call('system.info', {});

    transport.fail({
      message: '',
      error: new Error('Database worker module failed: net::ERR_NETWORK_CHANGED'),
    });

    await expect(pending).rejects.toMatchObject({
      code: 'transport_error',
      message: 'Database worker module failed: net::ERR_NETWORK_CHANGED',
    });
    client.close();
  });

  it('gives an honest diagnostic when the browser reports no worker detail', async () => {
    const transport = new ErrorTransport();
    const client = new RpcClient(transport);
    const pending = client.call('system.info', {});

    transport.fail({ message: '', error: null });

    await expect(pending).rejects.toMatchObject({
      code: 'transport_error',
      message:
        'Database worker failed to load or crashed; the browser reported no details.',
    });
    client.close();
  });
});
