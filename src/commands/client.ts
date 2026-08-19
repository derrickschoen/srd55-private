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
import {
  isCharacterCommandRpcResult,
  isRestoreCharacterSavePointResult,
  isUndoCharacterOperationResult,
} from './character-command-executor';
import { decodeOutcome } from '../refusals/decode';
import type {
  DecodedOutcome,
} from '../refusals/outcome';

export type CommandClientOutcome<T> = DecodedOutcome<T>;

export interface CommandsClient {
  execute(
    characterId: number,
    expectedRevision: number,
    command: CharacterCommandPayload,
    operationUuid?: string,
  ): Promise<CommandClientOutcome<CharacterCommandRpcResult>>;
  undo(
    characterId: number,
    expectedRevision: number,
    operationUuid: string,
  ): Promise<CommandClientOutcome<UndoCharacterOperationResult>>;
  restoreSavePoint(
    characterId: number,
    savePointId: number,
    expectedRevision: number,
  ): Promise<CommandClientOutcome<RestoreCharacterSavePointResult>>;
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
      return rpc.call<CharacterCommandRequest, unknown>(
        'commands.execute',
        request,
      ).then((value) => decodeOutcome(value, isCharacterCommandRpcResult));
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
        unknown
      >('commands.undo', request).then((value) =>
        decodeOutcome(value, isUndoCharacterOperationResult)
      );
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
        unknown
      >('commands.restoreSavePoint', request).then((value) =>
        decodeOutcome(value, isRestoreCharacterSavePointResult)
      );
    },
  });
}
