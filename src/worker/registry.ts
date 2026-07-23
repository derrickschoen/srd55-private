import {
  RpcError,
  rpcFailure,
  rpcSuccess,
  type RpcRequest,
  type RpcResponse,
} from '../rpc/protocol';
import type { HandlerContext, RpcHandler } from './handler';

export interface HandlerModule {
  readonly handlers: readonly RpcHandler[];
}

export interface RpcRegistry {
  readonly methods: readonly string[];
  get(method: string): RpcHandler | undefined;
  dispatch(
    request: RpcRequest,
    context: HandlerContext,
  ): Promise<RpcResponse>;
}

function isHandler(value: unknown): value is RpcHandler {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<RpcHandler>;
  return (
    typeof candidate.method === 'string' &&
    typeof candidate.validateParams === 'function' &&
    typeof candidate.handle === 'function'
  );
}

function handlersFromModule(path: string, module: unknown): readonly RpcHandler[] {
  if (
    module === null ||
    typeof module !== 'object' ||
    !Array.isArray((module as Partial<HandlerModule>).handlers)
  ) {
    throw new Error(`RPC handler module "${path}" must export handlers[].`);
  }
  const handlers = (module as unknown as HandlerModule).handlers;
  if (!handlers.every(isHandler)) {
    throw new Error(`RPC handler module "${path}" contains an invalid handler.`);
  }
  return handlers;
}

export function createRpcRegistry(
  modules: Readonly<Record<string, unknown>>,
): RpcRegistry {
  const byMethod = new Map<string, RpcHandler>();
  for (const path of Object.keys(modules).sort()) {
    for (const handler of handlersFromModule(path, modules[path])) {
      if (byMethod.has(handler.method)) {
        throw new Error(`Duplicate RPC method "${handler.method}".`);
      }
      byMethod.set(handler.method, handler);
    }
  }

  const methods = Object.freeze([...byMethod.keys()].sort());
  return Object.freeze({
    methods,
    get: (method: string) => byMethod.get(method),
    dispatch: async (
      request: RpcRequest,
      context: HandlerContext,
    ): Promise<RpcResponse> => {
      const handler = byMethod.get(request.method);
      if (handler === undefined) {
        return rpcFailure(
          request.id,
          new RpcError(
            'unknown_method',
            `Unknown RPC method "${request.method}".`,
          ).toPayload(),
        );
      }
      if (!handler.validateParams(request.params)) {
        return rpcFailure(
          request.id,
          new RpcError(
            'invalid_params',
            `Invalid params for RPC method "${request.method}".`,
          ).toPayload(),
        );
      }
      try {
        return rpcSuccess(
          request.id,
          await handler.handle(context, request.params),
        );
      } catch (error) {
        const rpcError =
          error instanceof RpcError
            ? error
            : new RpcError(
                'handler_error',
                error instanceof Error ? error.message : String(error),
              );
        return rpcFailure(request.id, rpcError.toPayload());
      }
    },
  });
}

const discoveredModules = import.meta.glob('./handlers/**/*.ts', {
  eager: true,
});

export const rpcRegistry = createRpcRegistry(discoveredModules);
