import { CharacterCommandExecutor } from '../../commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import { RevisionConflict } from '../../commands/revision-conflict';
import type { CharacterCommandRequest } from '../../domain/command-contracts';
import { RpcError } from '../../rpc/protocol';
import {
  defineRpcHandler,
  isRecord,
  type RpcHandler,
} from '../handler';

export const COMMAND_INTEGRITY_KEY =
  'dnd-multiclass-spells-static-command-integrity-v1';

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function isCommandsExecuteParams(
  params: unknown,
): params is CharacterCommandRequest {
  return (
    isRecord(params) &&
    Object.keys(params).length === 4 &&
    Number.isSafeInteger(params.character_id) &&
    Number(params.character_id) >= 1 &&
    isUuid(params.operation_uuid) &&
    Number.isSafeInteger(params.expected_revision) &&
    Number(params.expected_revision) >= 0 &&
    isRecord(params.command) &&
    typeof params.command.type === 'string' &&
    params.command.type.length > 0
  );
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'commands.execute',
    isCommandsExecuteParams,
    async (context, params) => {
      try {
        return await new CharacterCommandExecutor(
          context.db,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        ).execute(params);
      } catch (error) {
        if (error instanceof RevisionConflict) {
          throw new RpcError('handler_error', error.message, {
            current_revision: error.currentRevision,
          });
        }
        throw error;
      }
    },
  ),
]);
