import { createApplicationLifecycle } from '../../src/db/bootstrap';
import type {
  ApplicationSeedProfile,
} from '../../src/db/application-seed-profile';
import { DatabaseContext } from '../../src/db/database';
import {
  DatabaseLifecycle,
  type DatabaseVerificationMode,
} from '../../src/db/database-lifecycle';
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
  openSeededTestDatabase,
} from './open-db';

export interface RpcHarness {
  lifecycle: DatabaseLifecycle;
  readonly context: HandlerContext;
  call<P, R>(method: string, params: P): Promise<RpcResponse<R>>;
  close(): void;
}

function rpcHarness(
  lifecycle: DatabaseLifecycle,
  handlers: readonly RpcHandler[],
  environment: RuntimeEnvironment,
): RpcHarness {
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
        const rpcError = error instanceof RpcError
          ? error
          : new RpcError(
              'handler_error',
              error instanceof Error ? error.message : String(error),
            );
        return rpcFailure(requestId, rpcError.toPayload());
      }
    },
    close: () => lifecycle.close(),
  };
}

export async function createRpcHarness(
  handlers: readonly RpcHandler[],
  environment: RuntimeEnvironment = 'test',
): Promise<RpcHarness> {
  const sqlite3 = await getSqlite3();
  const storage = new MemoryDatabaseStorage(sqlite3);
  const lifecycle = createApplicationLifecycle(sqlite3, storage);
  lifecycle.open();
  return rpcHarness(lifecycle, handlers, environment);
}

class SeededTestDatabaseLifecycle extends DatabaseLifecycle {
  readonly #context: DatabaseContext;

  constructor(
    sqlite3: Awaited<ReturnType<typeof getSqlite3>>,
    connection: DatabaseContext['connection'],
  ) {
    super(sqlite3, new MemoryDatabaseStorage(sqlite3), '');
    this.#context = new DatabaseContext(connection);
  }

  override get database(): DatabaseContext {
    if (!this.#context.isOpen) {
      throw new Error('Database lifecycle is closed.');
    }
    return this.#context;
  }

  override get filename(): string {
    return ':memory-seeded-clone:';
  }

  override get isOpen(): boolean {
    return this.#context.isOpen;
  }

  override open(
    _verification: DatabaseVerificationMode = 'full',
  ): DatabaseContext {
    return this.database;
  }

  override close(): void {
    this.#context.close();
  }

  override reopen(): DatabaseContext {
    throw new Error('A seeded test database clone cannot be reopened.');
  }

  override async exportBytes(): Promise<Uint8Array> {
    const sqlite3 = await getSqlite3();
    return sqlite3.capi.sqlite3_js_db_export(this.database.connection).slice();
  }
}

/**
 * RPC harness over an isolated clone of the per-worker seeded image. Use only
 * when the test consumes bundled content rather than exercising boot,
 * replacement, reset, migration, or seed behavior.
 */
export async function createSeededRpcHarness(
  handlers: readonly RpcHandler[],
  options: {
    readonly environment?: RuntimeEnvironment;
    readonly profile?: ApplicationSeedProfile;
  } = {},
): Promise<RpcHarness> {
  const sqlite3 = await getSqlite3();
  const connection = await openSeededTestDatabase({
    profile: options.profile ?? 'full',
  });
  const lifecycle = new SeededTestDatabaseLifecycle(sqlite3, connection);
  return rpcHarness(lifecycle, handlers, options.environment ?? 'test');
}
