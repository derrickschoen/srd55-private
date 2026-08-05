import type {
  CharacterCommandPayload,
  CharacterCommandRequest,
  RestoreCharacterSavePointRequest,
  UndoCharacterOperationRequest,
} from '../domain/command-contracts';
import type { RpcClient } from '../rpc/client';
import type {
  CharacterCommandRpcResult,
  RestoreCharacterSavePointResult,
  UndoCharacterOperationResult,
} from './character-command-executor';

export interface CommandsClient {
  execute(
    characterId: number,
    expectedRevision: number,
    command: CharacterCommandPayload,
    operationUuid?: string,
  ): Promise<CharacterCommandRpcResult>;
  undo(
    characterId: number,
    expectedRevision: number,
    operationUuid: string,
  ): Promise<UndoCharacterOperationResult>;
  restoreSavePoint(
    characterId: number,
    savePointId: number,
    expectedRevision: number,
  ): Promise<RestoreCharacterSavePointResult>;
}

export function createCommandsClient(rpc: RpcClient): CommandsClient {
  return Object.freeze({
    execute: (
      characterId: number,
      expectedRevision: number,
      command: CharacterCommandPayload,
      operationUuid = crypto.randomUUID(),
    ) => {
      const request: CharacterCommandRequest = {
        character_id: characterId,
        operation_uuid: operationUuid,
        expected_revision: expectedRevision,
        command,
      };
      return rpc.call<CharacterCommandRequest, CharacterCommandRpcResult>(
        'commands.execute',
        request,
      );
    },
    undo: (
      characterId: number,
      expectedRevision: number,
      operationUuid: string,
    ) => {
      const request: UndoCharacterOperationRequest = {
        character_id: characterId,
        operation_uuid: operationUuid,
        expected_revision: expectedRevision,
      };
      return rpc.call<
        UndoCharacterOperationRequest,
        UndoCharacterOperationResult
      >('commands.undo', request);
    },
    restoreSavePoint: (
      characterId: number,
      savePointId: number,
      expectedRevision: number,
    ) => {
      const request: RestoreCharacterSavePointRequest = {
        character_id: characterId,
        save_point_id: savePointId,
        expected_revision: expectedRevision,
      };
      return rpc.call<
        RestoreCharacterSavePointRequest,
        RestoreCharacterSavePointResult
      >('commands.restoreSavePoint', request);
    },
  });
}
