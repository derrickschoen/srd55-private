import {
  rpcFailure,
  RpcError,
  type RpcResponse,
} from '../rpc/protocol';

export function postWithCloneFailureFallback<T>(
  post: (value: unknown) => void,
  value: T,
  fallback: (error: unknown) => unknown,
): void {
  try {
    post(value);
  } catch (error: unknown) {
    post(fallback(error));
  }
}

export function postRpcResponseWithCloneFailureFallback(
  post: (value: unknown) => void,
  response: RpcResponse,
): void {
  postWithCloneFailureFallback(
    post,
    response,
    (error) => rpcFailure(
      response.id,
      new RpcError(
        'transport_error',
        error instanceof Error ? error.message : String(error),
      ).toPayload(),
    ),
  );
}
