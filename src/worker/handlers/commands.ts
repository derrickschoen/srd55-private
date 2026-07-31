import { CharacterCommandExecutor } from '../../commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../commands/integrity';
import { RevisionConflict } from '../../commands/revision-conflict';
import { AttunementSlotsFull } from '../../commands/items';
import { LevelUpRefusal } from '../../commands/level-up-class';
import {
  CharacterCommandPayloadError,
} from '../../commands/payload-validator';
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
        if (error instanceof AttunementSlotsFull) {
          throw new RpcError('handler_error', error.message, {
            reason: error.data.reason,
            occupants: error.data.occupants.map((occupant) => ({
              slot: occupant.slot,
              item_id: occupant.item_id,
              name: occupant.name,
            })),
          });
        }
        if (error instanceof LevelUpRefusal) {
          const data = error.data;
          if (data.reason !== 'planned_subchoice_refused') {
            throw new RpcError('handler_error', error.message, {
              reason: data.reason,
            });
          }
          const source = data.locator.source.kind === 'existing_source'
            ? {
                kind: 'existing_source',
                source_instance_id:
                  data.locator.source.source_instance_id,
              }
            : { kind: data.locator.source.kind };
          throw new RpcError('handler_error', error.message, {
            reason: data.reason,
            subchoice_kind: data.subchoice_kind,
            index: data.index,
            issue: data.issue,
            locator: {
              source,
              rule_key: data.locator.rule_key,
              ordinal: data.locator.ordinal,
            },
          });
        }
        if (
          error instanceof CharacterCommandPayloadError &&
          error.data !== null
        ) {
          throw new RpcError('handler_error', error.message, {
            reason: error.data.reason,
            subchoice_kind: error.data.subchoice_kind,
            index: error.data.index,
            field: error.data.field,
          });
        }
        throw error;
      }
    },
  ),
]);
