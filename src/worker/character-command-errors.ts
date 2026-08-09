import { AttunementSlotsFull } from '../commands/items';
import { LevelUpRefusal } from '../commands/level-up-class';
import {
  CharacterCommandPayloadError,
} from '../commands/payload-validator';
import { RevisionConflict } from '../commands/revision-conflict';
import { CharacterArchivedRefusal } from '../commands/character-command-preflight';
import { SpeciesLineageRefusal } from '../commands/choose-species-lineage';
import { RpcError } from '../rpc/protocol';

/** One structured transport mapping shared by Confirm and rollback Preview. */
export function characterCommandRpcError(error: unknown): RpcError | null {
  if (error instanceof CharacterArchivedRefusal) {
    return new RpcError('handler_error', error.message, {
      reason: error.reason,
      current_revision: error.currentRevision,
    });
  }
  if (error instanceof RevisionConflict) {
    return new RpcError('handler_error', error.message, {
      current_revision: error.currentRevision,
    });
  }
  if (error instanceof AttunementSlotsFull) {
    return new RpcError('handler_error', error.message, {
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
      return new RpcError('handler_error', error.message, {
        reason: data.reason,
      });
    }
    const source = data.locator.source.kind === 'existing_source'
      ? {
          kind: 'existing_source',
          source_instance_id: data.locator.source.source_instance_id,
        }
      : { kind: data.locator.source.kind };
    return new RpcError('handler_error', error.message, {
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
  if (error instanceof SpeciesLineageRefusal) {
    return new RpcError('handler_error', error.message, {
      reason: error.reason,
    });
  }
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
