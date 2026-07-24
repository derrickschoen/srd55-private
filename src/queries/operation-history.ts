import {
  parseJson,
  sqlBoolean,
  sqlInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterCommandPayload } from '../domain/command-contracts';
import type { JsonValue } from '../domain/models';

export interface OperationDto {
  readonly id: number;
  readonly operation_uuid: string;
  readonly expected_revision: number;
  readonly resulting_revision: number;
  readonly inverse_command: CharacterCommandPayload;
  readonly created_at: string;
}

export interface ChangeDto {
  readonly id: number;
  readonly sequence: number;
  readonly group_id: string | null;
  readonly operation_uuid: string | null;
  readonly entity_type: string;
  readonly entity_id: number | null;
  readonly previous_value: JsonValue | null;
  readonly new_value: JsonValue | null;
  readonly reason: string | null;
  readonly action_type: string;
  readonly reversible: boolean;
  readonly created_at: string;
}

export interface OperationHistory {
  readonly operations: OperationDto[];
  readonly changes: ChangeDto[];
}

function nullableJson(value: string | null): JsonValue | null {
  return value === null ? null : parseJson(value);
}

export class OperationHistoryQueries {
  constructor(private readonly db: DatabaseContext) {}

  read(characterId: number): OperationHistory {
    return {
      operations: this.db.all(
        `SELECT id, operation_uuid, expected_revision,
                resulting_revision, inverse_command, created_at
         FROM character_operations
         WHERE character_id = ?
         ORDER BY resulting_revision DESC, id DESC`,
        [characterId],
        (row): OperationDto => ({
          id: sqlInteger(row, 'id'),
          operation_uuid: sqlString(row, 'operation_uuid'),
          expected_revision: sqlInteger(row, 'expected_revision'),
          resulting_revision: sqlInteger(row, 'resulting_revision'),
          inverse_command: parseJson(
            sqlString(row, 'inverse_command'),
            'Stored inverse command',
          ) as unknown as CharacterCommandPayload,
          created_at: sqlNullableString(row, 'created_at') ?? '',
        }),
      ),
      changes: this.db.all(
        `SELECT id, sequence, group_id, operation_uuid, entity_type,
                entity_id, previous_value, new_value, reason,
                action_type, reversible, created_at
         FROM change_log
         WHERE character_id = ?
         ORDER BY sequence DESC, id DESC`,
        [characterId],
        (row): ChangeDto => ({
          id: sqlInteger(row, 'id'),
          sequence: sqlInteger(row, 'sequence'),
          group_id: sqlNullableString(row, 'group_id'),
          operation_uuid: sqlNullableString(row, 'operation_uuid'),
          entity_type: sqlString(row, 'entity_type'),
          entity_id:
            row.entity_id === null ? null : sqlInteger(row, 'entity_id'),
          previous_value: nullableJson(
            sqlNullableString(row, 'previous_value'),
          ),
          new_value: nullableJson(sqlNullableString(row, 'new_value')),
          reason: sqlNullableString(row, 'reason'),
          action_type: sqlString(row, 'action_type'),
          reversible: sqlBoolean(row, 'reversible'),
          created_at: sqlNullableString(row, 'created_at') ?? '',
        }),
      ),
    };
  }
}
