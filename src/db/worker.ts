/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  createSahPoolStorage,
  type DatabaseLifecycle,
} from './database-lifecycle';
import { createApplicationLifecycle } from './bootstrap';
import {
  isRpcRequest,
  rpcFailure,
  RpcError,
  type RpcResponse,
} from '../rpc/protocol';
import { rpcRegistry } from '../worker/registry';
import type { RuntimeEnvironment } from '../worker/handler';
import {
  bootDatabase,
  bootHandlerContext,
  degradedRejection,
  type DatabaseBoot,
} from '../worker/boot';

const scope = self as DedicatedWorkerGlobalScope;
const filename = '/dnd-multiclass-spells.sqlite3';

async function initialize(): Promise<DatabaseBoot> {
  const sqlite3 = await sqlite3InitModule();
  const pool = await sqlite3.installOpfsSAHPoolVfs({
    initialCapacity: 6,
    name: 'dnd-multiclass-spells-sahpool',
    directory: '/dnd-multiclass-spells-sahpool',
  });
  const lifecycle = createApplicationLifecycle(
    sqlite3,
    createSahPoolStorage(pool, filename),
  );
  // A failed open resolves to a degraded boot rather than rejecting, so the
  // recovery methods stay reachable. Failures BEFORE this point (wasm init,
  // VFS install) still reject: there is no database to recover from.
  return bootDatabase(lifecycle);
}

const ready = initialize();
let requestQueue: Promise<void> = Promise.resolve();

async function respond(value: unknown): Promise<void> {
  let response: RpcResponse;
  if (!isRpcRequest(value)) {
    const id =
      value !== null &&
      typeof value === 'object' &&
      Number.isSafeInteger((value as { id?: unknown }).id)
        ? Number((value as { id: number }).id)
        : 0;
    response = rpcFailure(
      id,
      new RpcError(
        'invalid_request',
        'RPC request must contain a numeric id, method, and params.',
      ).toPayload(),
    );
  } else {
    try {
      const boot = await ready;
      const rejection = degradedRejection(boot, value.method);
      response =
        rejection === null
          ? await rpcRegistry.dispatch(
              value,
              bootHandlerContext(
                boot,
                import.meta.env.MODE as RuntimeEnvironment,
              ),
            )
          : rpcFailure(value.id, rejection.toPayload());
    } catch (error) {
      response = rpcFailure(
        value.id,
        new RpcError(
          'handler_error',
          error instanceof Error ? error.message : String(error),
        ).toPayload(),
      );
    }
  }
  scope.postMessage(response);
}

scope.addEventListener('message', (event: MessageEvent<unknown>) => {
  const task = requestQueue.then(() => respond(event.data));
  requestQueue = task.catch(() => undefined);
});
