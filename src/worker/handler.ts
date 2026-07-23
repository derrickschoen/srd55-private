import type { DatabaseContext } from '../db/database';
import type { DatabaseLifecycle } from '../db/database-lifecycle';

export type RuntimeEnvironment = 'development' | 'test' | 'production';

export interface HandlerContext {
  readonly db: DatabaseContext;
  readonly lifecycle: DatabaseLifecycle;
  readonly environment: RuntimeEnvironment;
}

export type ParamsValidator<P> = (params: unknown) => params is P;

export interface RpcHandler<P = unknown, R = unknown> {
  readonly method: string;
  readonly validateParams: ParamsValidator<P>;
  handle(context: HandlerContext, params: P): R | Promise<R>;
}

export function defineRpcHandler<P, R>(
  method: string,
  validateParams: ParamsValidator<P>,
  handle: (context: HandlerContext, params: P) => R | Promise<R>,
): RpcHandler<P, R> {
  if (!/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(method)) {
    throw new Error(`Invalid RPC method name "${method}".`);
  }
  return Object.freeze({ method, validateParams, handle });
}

export function isEmptyParams(params: unknown): params is Record<string, never> {
  return (
    params !== null &&
    typeof params === 'object' &&
    !Array.isArray(params) &&
    Object.keys(params).length === 0
  );
}

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
