import type {
  CharacterCommandPayload,
  CharacterCommandRequest,
} from '../domain/command-contracts';
import type { RpcClient } from '../rpc/client';
import type { CharacterCommandResult } from './character-command-executor';

export interface CommandsClient {
  execute(
    characterId: number,
    expectedRevision: number,
    command: CharacterCommandPayload,
    operationUuid?: string,
  ): Promise<CharacterCommandResult>;
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
      return rpc.call<CharacterCommandRequest, CharacterCommandResult>(
        'commands.execute',
        request,
      );
    },
  });
}
