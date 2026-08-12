import {
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';

/** The durable per-character key reserved by D147's W-MC design. */
export const MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY =
  'ignore_multiclass_prerequisites' as const;

export const MULTICLASS_PREREQUISITE_WAIVER_EXPLANATION =
  'House rule: prerequisites waived.' as const;

/** The same closed key is disclosed on the structured character sheet. */
export type CharacterHouseRuleKey =
  typeof MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY;

export type MulticlassPrerequisiteHouseRule =
  | { readonly status: 'off' }
  | { readonly status: 'on' }
  | {
      readonly status: 'invalid';
      readonly reason: 'invalid_json' | 'not_boolean';
    };

export type StoredMulticlassPrerequisiteHouseRule =
  | { readonly status: 'absent' }
  | {
      readonly status: 'stored';
      readonly value: string;
      readonly note: string | null;
      readonly created_at: string | null;
      readonly updated_at: string | null;
    };

interface StoredHouseRuleRow {
  readonly value: string;
  readonly note: string | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

const storedHouseRuleRow: RowCodec<StoredHouseRuleRow> = (row) => ({
  value: sqlString(row, 'value'),
  note: sqlNullableString(row, 'note'),
  created_at: sqlNullableString(row, 'created_at'),
  updated_at: sqlNullableString(row, 'updated_at'),
});

export function decodeMulticlassPrerequisiteHouseRule(
  value: string | null,
): MulticlassPrerequisiteHouseRule {
  if (value === null) return { status: 'off' };
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    return { status: 'invalid', reason: 'invalid_json' };
  }
  if (decoded === true) return { status: 'on' };
  if (decoded === false) return { status: 'off' };
  return { status: 'invalid', reason: 'not_boolean' };
}

export function readMulticlassPrerequisiteHouseRule(
  db: DatabaseContext,
  characterId: number,
): MulticlassPrerequisiteHouseRule {
  return decodeMulticlassPrerequisiteHouseRule(
    db.scalar<string>(
      `SELECT value
       FROM character_rule_overrides
       WHERE character_id = ? AND rule_key = ?`,
      [characterId, MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY],
    ),
  );
}

export function captureMulticlassPrerequisiteHouseRule(
  db: DatabaseContext,
  characterId: number,
): StoredMulticlassPrerequisiteHouseRule {
  const row = db.one(
    `SELECT value, note, created_at, updated_at
     FROM character_rule_overrides
     WHERE character_id = ? AND rule_key = ?`,
    [characterId, MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY],
    storedHouseRuleRow,
  );
  return row === null ? { status: 'absent' } : { status: 'stored', ...row };
}

export function setMulticlassPrerequisiteHouseRule(
  db: DatabaseContext,
  characterId: number,
  waive: boolean,
): void {
  if (waive) {
    db.exec(
      `INSERT INTO character_rule_overrides (
         character_id, rule_key, value, note, created_at, updated_at
       ) VALUES (?, ?, 'true', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(character_id, rule_key) DO UPDATE SET
         value = 'true', note = NULL, updated_at = CURRENT_TIMESTAMP`,
      [characterId, MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY],
    );
    return;
  }
  db.exec(
    `DELETE FROM character_rule_overrides
     WHERE character_id = ? AND rule_key = ?`,
    [characterId, MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY],
  );
}

export function restoreMulticlassPrerequisiteHouseRule(
  db: DatabaseContext,
  characterId: number,
  state: StoredMulticlassPrerequisiteHouseRule,
): void {
  if (state.status === 'absent') {
    setMulticlassPrerequisiteHouseRule(db, characterId, false);
    return;
  }
  db.exec(
    `INSERT INTO character_rule_overrides (
       character_id, rule_key, value, note, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(character_id, rule_key) DO UPDATE SET
       value = excluded.value,
       note = excluded.note,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [
      characterId,
      MULTICLASS_PREREQUISITE_HOUSE_RULE_KEY,
      state.value,
      state.note,
      state.created_at,
      state.updated_at,
    ],
  );
}
