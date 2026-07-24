import {
  sqlInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  CharacterState,
  CHARACTER_SNAPSHOT_SCHEMA_VERSION,
} from '../character/character-state';
import type { RestoreSnapshotCommand } from '../domain/command-contracts';
import type { SavePoint } from '../domain/read-models';
import type { CharacterCommandIntegrity } from '../commands/integrity';
import { CharacterNotFoundError } from './character-crud';

interface StoredSavePoint {
  readonly id: number;
  readonly snapshot: string;
}

export class SavePointNotFoundError extends Error {
  readonly status = 404;

  constructor(characterId: number, savePointId: number) {
    super(
      `Save point ${savePointId} does not belong to character ${characterId}.`,
    );
    this.name = 'SavePointNotFoundError';
  }
}

function decodeSavePoint(row: SqlRow): SavePoint {
  return {
    id: sqlInteger(row, 'id'),
    label: sqlString(row, 'label'),
    created_at: sqlNullableString(row, 'created_at') ?? '',
  };
}

function validatedLabel(label: string): string {
  if (label.trim() === '') {
    throw new TypeError('Save point label is required.');
  }
  if ([...label].length > 120) {
    throw new TypeError(
      'Save point label must not exceed 120 characters.',
    );
  }
  return label;
}

export class SavePointQueries {
  readonly #state: CharacterState;

  constructor(
    private readonly db: DatabaseContext,
    state?: CharacterState,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {
    this.#state = state ?? new CharacterState(db);
  }

  list(characterId: number): SavePoint[] {
    return this.db.all(
      `SELECT id, label, created_at
       FROM character_save_points
       WHERE character_id = ?
       ORDER BY id DESC`,
      [characterId],
      decodeSavePoint,
    );
  }

  create(characterId: number, label: string): SavePoint {
    return this.db.transaction(() => {
      if (
        Number(
          this.db.scalar(
            'SELECT count(*) FROM characters WHERE id = ?',
            [characterId],
          ) ?? 0,
        ) !== 1
      ) {
        throw new CharacterNotFoundError(characterId);
      }
      const timestamp = this.clock();
      const id = this.db.exec(
        `INSERT INTO character_save_points (
           character_id, label, snapshot, schema_version,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          validatedLabel(label),
          JSON.stringify(this.#state.capture(characterId)),
          CHARACTER_SNAPSHOT_SCHEMA_VERSION,
          timestamp,
          timestamp,
        ],
      ).lastInsertId;
      return this.db.one(
        `SELECT id, label, created_at
         FROM character_save_points
         WHERE id = ?`,
        [id],
        decodeSavePoint,
      )!;
    });
  }

  async restoreCommand(
    characterId: number,
    savePointId: number,
    integrity: CharacterCommandIntegrity,
  ): Promise<RestoreSnapshotCommand> {
    const point = this.db.one(
      `SELECT id, snapshot
       FROM character_save_points
       WHERE character_id = ? AND id = ?`,
      [characterId, savePointId],
      (row): StoredSavePoint => ({
        id: sqlInteger(row, 'id'),
        snapshot: sqlString(row, 'snapshot'),
      }),
    );
    if (point === null) {
      throw new SavePointNotFoundError(characterId, savePointId);
    }
    const snapshot: unknown = JSON.parse(point.snapshot);
    if (
      snapshot === null ||
      Array.isArray(snapshot) ||
      typeof snapshot !== 'object'
    ) {
      throw new Error(`Save point ${point.id} contains an invalid snapshot.`);
    }
    return integrity.attach(characterId, {
      type: 'restore_snapshot',
      snapshot,
    }) as Promise<RestoreSnapshotCommand>;
  }
}
