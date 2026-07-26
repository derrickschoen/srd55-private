import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import type { SqlRow } from '../db/codecs';
import {
  CHARACTER_STATE_TABLES,
  DELETE_ORDER,
  type AuditEntityType,
  type SnapshotTable,
} from '../domain/contracts/tables';

export const CHARACTER_SNAPSHOT_SCHEMA_VERSION = 'a7-v1' as const;

export const CHARACTER_STATE_COLUMNS = [
  'name',
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
  'proficiency_bonus_override',
  'rules_edition_preference',
  'allow_legacy',
  'notes',
] as const;

/**
 * The tables an undo/redo snapshot captures.
 *
 * Derived from the schema rather than hand-listed. Adding a table to
 * `db/schema/` is now a compile error until it is classified as in or out of
 * this scope, which is exactly the guarantee the old five-element string tuple
 * could not give: it had no connection to the schema at all, and a second,
 * different list lived in `src/backup/`.
 */
export { CHARACTER_STATE_TABLES, DELETE_ORDER as CHARACTER_STATE_DELETE_ORDER };

export type CharacterStateTable = SnapshotTable;

type CharacterSnapshotTables = {
  readonly [Table in CharacterStateTable]: readonly SqlRow[];
};

export type CharacterStateSnapshot = {
  readonly schema_version: typeof CHARACTER_SNAPSHOT_SCHEMA_VERSION;
  readonly character: SqlRow;
} & CharacterSnapshotTables;

export interface CharacterStateDiff {
  /**
   * The audit-log write vocabulary. Independent of the snapshot scope by
   * design: reclassifying a table for backup reasons must not silently change
   * what the append-only audit log accepts.
   */
  readonly entity_type: AuditEntityType;
  readonly entity_id: number | null;
  readonly previous_value: unknown;
  readonly new_value: unknown;
}

type SnapshotObject = Record<string, unknown>;
type SnapshotRow = Record<string, unknown>;

function isObject(value: unknown): value is SnapshotObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function insertRow(
  db: DatabaseContext,
  table: CharacterStateTable,
  row: SnapshotRow,
): void {
  const columns = Object.keys(row);
  if (columns.length === 0) {
    throw new Error(`Snapshot table ${table} contains an invalid row.`);
  }

  db.exec(
    `INSERT INTO ${quoteIdentifier(table)}
      (${columns.map(quoteIdentifier).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((column) => row[column] as SqlValue),
  );
}

function equalValues(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right)) {
    const leftBytes = new Uint8Array(
      left.buffer,
      left.byteOffset,
      left.byteLength,
    );
    const rightBytes = new Uint8Array(
      right.buffer,
      right.byteOffset,
      right.byteLength,
    );
    return (
      leftBytes.length === rightBytes.length &&
      leftBytes.every((byte, index) => byte === rightBytes[index])
    );
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => equalValues(value, right[index]))
    );
  }
  if (!isObject(left) || !isObject(right)) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && equalValues(left[key], right[key]),
    )
  );
}

function snapshotObject(snapshot: unknown): SnapshotObject {
  return isObject(snapshot) ? snapshot : {};
}

function snapshotRows(
  snapshot: unknown,
  table: CharacterStateTable,
): SnapshotRow[] {
  const rows = snapshotObject(snapshot)[table];
  if (!Array.isArray(rows)) {
    throw new Error(`Snapshot table ${table} must be a list.`);
  }
  for (const row of rows) {
    if (!isObject(row)) {
      throw new Error(`Snapshot table ${table} contains an invalid row.`);
    }
  }
  return rows;
}

function numericEntityId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    Number.isFinite(Number(value))
  ) {
    return Math.trunc(Number(value));
  }
  return null;
}

function diffKey(row: SnapshotRow): string {
  const id = row.id;
  const numericId = numericEntityId(id);
  return numericId === null
    ? `string:${String(id ?? '')}`
    : `number:${numericId}`;
}

function compareDiffRows(
  [leftKey, left]: readonly [string, SnapshotRow | null],
  [rightKey, right]: readonly [string, SnapshotRow | null],
): number {
  const leftId = numericEntityId((left ?? {}).id);
  const rightId = numericEntityId((right ?? {}).id);
  if (leftId !== null && rightId !== null && leftId !== rightId) {
    return leftId - rightId;
  }
  if (leftId !== null && rightId === null) {
    return -1;
  }
  if (leftId === null && rightId !== null) {
    return 1;
  }
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export class CharacterState {
  constructor(private readonly db: DatabaseContext) {}

  capture(characterId: number): CharacterStateSnapshot {
    const character = this.db.one(
      `SELECT ${CHARACTER_STATE_COLUMNS.map(quoteIdentifier).join(', ')}
       FROM characters
       WHERE id = ?`,
      [characterId],
    );
    if (character === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }

    const snapshot: Record<string, unknown> = {
      schema_version: CHARACTER_SNAPSHOT_SCHEMA_VERSION,
      character,
    };
    for (const table of CHARACTER_STATE_TABLES) {
      snapshot[table] = this.db.all(
        `SELECT * FROM ${quoteIdentifier(table)}
         WHERE character_id = ?
         ORDER BY id`,
        [characterId],
      );
    }
    return snapshot as CharacterStateSnapshot;
  }

  restore(characterId: number, snapshot: unknown): void {
    const { character, rows } = this.validateSnapshot(characterId, snapshot);

    const restoreRows = (db: DatabaseContext): void => {
      db.exec(
        `UPDATE characters
         SET ${CHARACTER_STATE_COLUMNS.map(
           (column) => `${quoteIdentifier(column)} = ?`,
         ).join(', ')},
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          ...CHARACTER_STATE_COLUMNS.map(
            (column) => character[column] as SqlValue,
          ),
          characterId,
        ],
      );

      for (const table of DELETE_ORDER) {
        db.exec(
          `DELETE FROM ${quoteIdentifier(table)} WHERE character_id = ?`,
          [characterId],
        );
      }

      for (const table of CHARACTER_STATE_TABLES) {
        for (const sourceRow of rows[table]) {
          insertRow(db, table, {
            ...sourceRow,
            character_id: characterId,
          });
        }
      }
    };
    this.db.transaction(restoreRows);
  }

  diff(before: unknown, after: unknown): CharacterStateDiff[] {
    const changes: CharacterStateDiff[] = [];
    const beforeCharacter = snapshotObject(before).character ?? null;
    const afterCharacter = snapshotObject(after).character ?? null;
    if (!equalValues(beforeCharacter, afterCharacter)) {
      changes.push({
        entity_type: 'character',
        entity_id: null,
        previous_value: beforeCharacter,
        new_value: afterCharacter,
      });
    }

    for (const table of CHARACTER_STATE_TABLES) {
      const oldRows = new Map(
        snapshotRows(before, table).map((row) => [diffKey(row), row]),
      );
      const newRows = new Map(
        snapshotRows(after, table).map((row) => [diffKey(row), row]),
      );
      const keyedRows = [...new Set([...oldRows.keys(), ...newRows.keys()])]
        .map(
          (key) =>
            [
              key,
              (oldRows.get(key) ?? newRows.get(key) ?? null) as
                | SnapshotRow
                | null,
            ] as const,
        )
        .sort(compareDiffRows);

      for (const [key, keyedRow] of keyedRows) {
        const previousValue = oldRows.get(key) ?? null;
        const newValue = newRows.get(key) ?? null;
        if (equalValues(previousValue, newValue)) {
          continue;
        }
        changes.push({
          entity_type: table,
          entity_id: numericEntityId(keyedRow?.id),
          previous_value: previousValue,
          new_value: newValue,
        });
      }
    }

    return changes;
  }

  private validateSnapshot(
    characterId: number,
    snapshot: unknown,
  ): {
    character: SnapshotObject;
    rows: Record<CharacterStateTable, SnapshotRow[]>;
  } {
    const root = snapshotObject(snapshot);
    if (root.schema_version !== CHARACTER_SNAPSHOT_SCHEMA_VERSION) {
      throw new Error('Unsupported character snapshot schema.');
    }

    const character = root.character;
    if (!isObject(character)) {
      throw new Error('Character snapshot is missing character data.');
    }
    for (const column of CHARACTER_STATE_COLUMNS) {
      if (!Object.hasOwn(character, column)) {
        throw new Error(`Character snapshot is missing ${column}.`);
      }
    }

    const rows = {} as Record<CharacterStateTable, SnapshotRow[]>;
    const spellVersionIds: number[] = [];
    for (const table of CHARACTER_STATE_TABLES) {
      rows[table] = snapshotRows(root, table);
      for (const row of rows[table]) {
        if (
          !Object.hasOwn(row, 'character_id') ||
          !Number.isSafeInteger(row.character_id) ||
          row.character_id !== characterId
        ) {
          throw new Error(
            `Snapshot table ${table} contains a row belonging to another character.`,
          );
        }

        if (table === 'spell_selection_slots') {
          for (const column of [
            'fixed_spell_version_id',
            'current_spell_version_id',
          ] as const) {
            const versionId = row[column];
            if (versionId !== null) {
              if (!isPositiveInteger(versionId)) {
                throw new Error(
                  `Snapshot table ${table} contains an invalid ${column}.`,
                );
              }
              spellVersionIds.push(versionId);
            }
          }
        } else if (table === 'wizard_spellbook_entries') {
          const versionId = row.spell_version_id;
          if (!isPositiveInteger(versionId)) {
            throw new Error(
              `Snapshot table ${table} contains an invalid spell_version_id.`,
            );
          }
          spellVersionIds.push(versionId);
        }
      }
    }

    const uniqueVersionIds = [...new Set(spellVersionIds)];
    if (uniqueVersionIds.length > 0) {
      const activeVersionIds = new Set(
        this.db
          .all<{ id: number }>(
            `SELECT id
             FROM spell_versions
             WHERE id IN (${uniqueVersionIds.map(() => '?').join(', ')})
               AND is_active = 1`,
            uniqueVersionIds,
            (row) => ({ id: Number(row.id) }),
          )
          .map(({ id }) => id),
      );
      const inactiveVersionIds = uniqueVersionIds.filter(
        (id) => !activeVersionIds.has(id),
      );
      if (inactiveVersionIds.length > 0) {
        throw new Error(
          `Character snapshot references inactive spell version ${inactiveVersionIds.join(', ')}.`,
        );
      }
    }

    return { character, rows };
  }
}
