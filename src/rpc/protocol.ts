import type { JsonValue } from '../domain/models';

export type RpcRequestId = number;

export interface RpcRequest<P = unknown> {
  id: RpcRequestId;
  method: string;
  params: P;
}

export type RpcErrorCode =
  | 'invalid_request'
  | 'unknown_method'
  | 'invalid_params'
  | 'handler_error'
  | 'transport_error'
  /**
   * The stored database image does not match the application schema, so the
   * worker booted degraded. Only the recovery methods
   * (`system.exportDatabase`, `system.reset`) are dispatchable.
   */
  | 'schema_mismatch';

export interface RpcErrorPayload {
  code: RpcErrorCode;
  message: string;
  data?: JsonValue;
}

export type RpcResponse<R = unknown> =
  | { id: RpcRequestId; ok: true; result: R }
  | { id: RpcRequestId; ok: false; error: RpcErrorPayload };

export class RpcError extends Error {
  constructor(
    readonly code: RpcErrorCode,
    message: string,
    readonly data?: JsonValue,
  ) {
    super(message);
    this.name = 'RpcError';
  }

  toPayload(): RpcErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.data === undefined ? {} : { data: this.data }),
    };
  }
}

export function isRpcRequest(value: unknown): value is RpcRequest {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<RpcRequest>;
  return (
    Number.isSafeInteger(candidate.id) &&
    Number(candidate.id) >= 0 &&
    typeof candidate.method === 'string' &&
    candidate.method.length > 0 &&
    Object.hasOwn(candidate, 'params')
  );
}

export function rpcSuccess<R>(
  id: RpcRequestId,
  result: R,
): RpcResponse<R> {
  return { id, ok: true, result };
}

export function rpcFailure(
  id: RpcRequestId,
  error: RpcErrorPayload,
): RpcResponse<never> {
  return { id, ok: false, error };
}
