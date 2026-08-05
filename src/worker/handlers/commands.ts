import {
  CharacterCommandExecutor,
  characterCommandRpcResult,
} from '../../commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import type {
  CharacterCommandRequest,
  RestoreCharacterSavePointRequest,
  UndoCharacterOperationRequest,
} from '../../domain/command-contracts';
import {
  defineRpcHandler,
  isRecord,
  type RpcHandler,
} from '../handler';
import { characterCommandRpcError } from '../character-command-errors';

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

export function isCommandsUndoParams(
  params: unknown,
): params is UndoCharacterOperationRequest {
  return (
    isRecord(params) &&
    Object.keys(params).length === 3 &&
    Number.isSafeInteger(params.character_id) &&
    Number(params.character_id) >= 1 &&
    isUuid(params.operation_uuid) &&
    Number.isSafeInteger(params.expected_revision) &&
    Number(params.expected_revision) >= 0
  );
}

export function isCommandsRestoreSavePointParams(
  params: unknown,
): params is RestoreCharacterSavePointRequest {
  return (
    isRecord(params) &&
    Object.keys(params).length === 3 &&
    Number.isSafeInteger(params.character_id) &&
    Number(params.character_id) >= 1 &&
    Number.isSafeInteger(params.save_point_id) &&
    Number(params.save_point_id) >= 1 &&
    Number.isSafeInteger(params.expected_revision) &&
    Number(params.expected_revision) >= 0
  );
}

export const handlers: readonly RpcHandler[] = Object.freeze([
  defineRpcHandler(
    'commands.execute',
    isCommandsExecuteParams,
    async (context, params) => {
      try {
        const result = await new CharacterCommandExecutor(
          context.db,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        ).execute(params);
        return characterCommandRpcResult(result);
      } catch (error) {
        const translated = characterCommandRpcError(error);
        if (translated !== null) throw translated;
        throw error;
      }
    },
  ),
  defineRpcHandler(
    'commands.undo',
    isCommandsUndoParams,
    async (context, params) => {
      try {
        return await new CharacterCommandExecutor(
          context.db,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        ).undo(params);
      } catch (error) {
        const translated = characterCommandRpcError(error);
        if (translated !== null) throw translated;
        throw error;
      }
    },
  ),
  defineRpcHandler(
    'commands.restoreSavePoint',
    isCommandsRestoreSavePointParams,
    async (context, params) => {
      try {
        return new CharacterCommandExecutor(
          context.db,
          new CharacterCommandIntegrity(COMMAND_INTEGRITY_KEY),
        ).restoreSavePoint(params);
      } catch (error) {
        const translated = characterCommandRpcError(error);
        if (translated !== null) throw translated;
        throw error;
      }
    },
  ),
]);
