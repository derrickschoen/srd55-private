import {
  CharacterCommandPayloadError,
} from '../commands/payload-validator';
import { RpcError } from '../rpc/protocol';

/** Defect-only structured transport mapping shared by command entry points. */
export function characterCommandRpcError(error: unknown): RpcError | null {
  if (
    error instanceof CharacterCommandPayloadError &&
    error.data !== null
  ) {
    if (error.data.reason === 'invalid_character_flavor') {
      return new RpcError('handler_error', error.message, {
        reason: error.data.reason,
        field: error.data.field,
        issue: error.data.issue,
      });
    }
    return new RpcError('handler_error', error.message, {
      reason: error.data.reason,
      subchoice_kind: error.data.subchoice_kind,
      index: error.data.index,
      field: error.data.field,
    });
  }
  return null;
}
