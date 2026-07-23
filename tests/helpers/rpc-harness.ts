import schema from '../../src/db/schema.sql?raw';
import { DatabaseLifecycle } from '../../src/db/database-lifecycle';
import {
  rpcFailure,
  RpcError,
  rpcSuccess,
  type RpcResponse,
} from '../../src/rpc/protocol';
import type {
  HandlerContext,
  RpcHandler,
  RuntimeEnvironment,
} from '../../src/worker/handler';
import {
  getSqlite3,
  MemoryDatabaseStorage,
} from './open-db';

export interface RpcHarness {
  lifecycle: DatabaseLifecycle;
  readonly context: HandlerContext;
  call<P, R>(method: string, params: P): Promise<RpcResponse<R>>;
  close(): void;
}

export async function createRpcHarness(
  handlers: readonly RpcHandler[],
  environment: RuntimeEnvironment = 'test',
): Promise<RpcHarness> {
  const sqlite3 = await getSqlite3();
  const storage = new MemoryDatabaseStorage(sqlite3);
  const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
  lifecycle.open();
  let id = 0;

  return {
    lifecycle,
    get context(): HandlerContext {
      return { db: lifecycle.database, lifecycle, environment };
    },
    call: async <P, R>(
      method: string,
      params: P,
    ): Promise<RpcResponse<R>> => {
      const requestId = ++id;
      const handler = handlers.find((candidate) => candidate.method === method);
      if (handler === undefined) {
        return rpcFailure(
          requestId,
          new RpcError(
            'unknown_method',
            `Unknown RPC method "${method}".`,
          ).toPayload(),
        );
      }
      if (!handler.validateParams(params)) {
        return rpcFailure(
          requestId,
          new RpcError(
            'invalid_params',
            `Invalid params for RPC method "${method}".`,
          ).toPayload(),
        );
      }
      try {
        return rpcSuccess(
          requestId,
          (await handler.handle(
            { db: lifecycle.database, lifecycle, environment },
            params,
          )) as R,
        );
      } catch (error) {
        return rpcFailure(
          requestId,
          new RpcError(
            'handler_error',
            error instanceof Error ? error.message : String(error),
          ).toPayload(),
        );
      }
    },
    close: () => lifecycle.close(),
  };
}
