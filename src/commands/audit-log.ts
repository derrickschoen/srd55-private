import type {
  CharacterState,
  CharacterStateDiff,
} from '../character/character-state';
import type { DatabaseContext } from '../db/database';

export interface AuditAppendRequest {
  readonly characterId: number;
  readonly operationUuid: string;
  readonly actionType: string;
  readonly reason: string | null;
  readonly before: unknown;
  readonly after: unknown;
}

export interface AuditAppendResult {
  readonly groupId: string;
  readonly count: number;
}

export interface CharacterAuditWriter {
  append(request: AuditAppendRequest): AuditAppendResult;
}

export type AuditClock = () => string;
export type AuditGroupId = () => string;

const systemClock: AuditClock = () => new Date().toISOString();
const randomGroupId: AuditGroupId = () => crypto.randomUUID();

function json(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new TypeError('Audit values must be JSON serializable.');
  }
  return encoded;
}

export class CharacterAuditLog implements CharacterAuditWriter {
  constructor(
    private readonly db: DatabaseContext,
    private readonly state: CharacterState,
    private readonly clock: AuditClock = systemClock,
    private readonly groupId: AuditGroupId = randomGroupId,
  ) {}

  append(request: AuditAppendRequest): AuditAppendResult {
    const changes = this.state.diff(request.before, request.after);
    const groupId = this.groupId();
    let sequence = Number(
      this.db.scalar(
        `SELECT COALESCE(MAX(sequence), 0)
         FROM change_log
         WHERE character_id = ?`,
        [request.characterId],
      ) ?? 0,
    );
    const timestamp = this.clock();

    for (const change of changes) {
      sequence += 1;
      this.insertChange(request, change, groupId, sequence, timestamp);
    }

    return { groupId, count: changes.length };
  }

  private insertChange(
    request: AuditAppendRequest,
    change: CharacterStateDiff,
    groupId: string,
    sequence: number,
    timestamp: string,
  ): void {
    this.db.exec(
      `INSERT INTO change_log (
         character_id, sequence, group_id, operation_uuid,
         entity_type, entity_id, previous_value, new_value,
         reason, action_type, reversible, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        request.characterId,
        sequence,
        groupId,
        request.operationUuid,
        change.entity_type,
        change.entity_id,
        json(change.previous_value),
        json(change.new_value),
        request.reason,
        request.actionType,
        timestamp,
        timestamp,
      ],
    );
  }
}
