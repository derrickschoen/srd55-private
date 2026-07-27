import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type { JsonObject, JsonValue } from '../domain/models';
import {
  conditionType,
  creatureSize,
  creatureType,
  damageType,
  spellSchool,
  type ConditionType,
  type CreatureSize,
  type CreatureType,
  type DamageType,
  type SpellSchool,
} from '../domain/enums';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../domain/weapon-damage';

export type SqlRow = Readonly<Record<string, SqlValue>>;

/**
 * How a row becomes a value this application is willing to reason about.
 *
 * REQUIRED at every `db.all` / `db.one`. Not optional, not defaulted, not
 * inferrable — see `src/db/database.ts` and the compile-time proof in
 * `tests/types/codec-required.type-test.ts`. When the row genuinely has no fixed
 * column set, the answer is `allRaw`/`oneRaw`, which say so by name, and NOT an
 * identity codec: `(row) => row` type-checks and guarantees nothing.
 */
export type RowCodec<T> = (row: SqlRow) => T;

/**
 * `SELECT id` — the commonest one-column read in the repository, hoisted so
 * that it is written once and refuses a non-integer `id` in every caller.
 */
export const rowId: RowCodec<number> = (row) => sqlInteger(row, 'id');

function codecError(column: string, expected: string, value: unknown): never {
  throw new TypeError(
    `Column "${column}" must be ${expected}; received ${String(value)}.`,
  );
}

export function sqlNumber(row: SqlRow, column: string): number {
  const value = row[column];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return codecError(column, 'a finite number', value);
  }
  return value;
}

export function sqlInteger(row: SqlRow, column: string): number {
  const value = sqlNumber(row, column);
  if (!Number.isSafeInteger(value)) {
    return codecError(column, 'a safe integer', value);
  }
  return value;
}

export function sqlNullableInteger(
  row: SqlRow,
  column: string,
): number | null {
  return row[column] === null ? null : sqlInteger(row, column);
}

export function sqlString(row: SqlRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    return codecError(column, 'a string', value);
  }
  return value;
}

export function sqlNullableString(
  row: SqlRow,
  column: string,
): string | null {
  return row[column] === null ? null : sqlString(row, column);
}

export function sqlWeaponDamage(
  row: SqlRow,
  prefix = 'damage',
): WeaponDamage {
  const kind = sqlString(row, `${prefix}_kind`);
  switch (kind) {
    case 'dice':
      return { kind, dice: sqlString(row, `${prefix}_dice`) };
    case 'flat':
      return { kind, amount: sqlInteger(row, `${prefix}_flat`) };
    case 'custom':
      return { kind, text: sqlString(row, `${prefix}_custom`) };
    case 'not_recorded':
      return { kind };
    default:
      return codecError(`${prefix}_kind`, 'a weapon damage kind', kind);
  }
}

export function sqlVersatileWeaponDamage(
  row: SqlRow,
): VersatileWeaponDamage {
  const prefix = 'versatile_damage';
  const kind = sqlString(row, `${prefix}_kind`);
  switch (kind) {
    case 'dice':
      return { kind, dice: sqlString(row, `${prefix}_dice`) };
    case 'flat':
      return { kind, amount: sqlInteger(row, `${prefix}_flat`) };
    case 'custom':
      return { kind, text: sqlString(row, `${prefix}_custom`) };
    case 'not_applicable':
      return { kind };
    default:
      return codecError(`${prefix}_kind`, 'a versatile damage kind', kind);
  }
}

/**
 * Open-vocabulary codecs. Each reads the same stored string back unchanged;
 * the vocabulary-specific function is what prevents one custom string brand
 * from being confused with another after it crosses the database boundary.
 */
export function sqlSpellSchool(row: SqlRow, column: string): SpellSchool {
  return spellSchool(sqlString(row, column));
}

export function sqlDamageType(row: SqlRow, column: string): DamageType {
  return damageType(sqlString(row, column));
}

export function sqlNullableDamageType(
  row: SqlRow,
  column: string,
): DamageType | null {
  const value = sqlNullableString(row, column);
  return value === null ? null : damageType(value);
}

export function sqlConditionType(row: SqlRow, column: string): ConditionType {
  return conditionType(sqlString(row, column));
}

export function sqlCreatureType(row: SqlRow, column: string): CreatureType {
  return creatureType(sqlString(row, column));
}

export function sqlNullableCreatureType(
  row: SqlRow,
  column: string,
): CreatureType | null {
  const value = sqlNullableString(row, column);
  return value === null ? null : creatureType(value);
}

export function sqlCreatureSize(row: SqlRow, column: string): CreatureSize {
  return creatureSize(sqlString(row, column));
}

export function sqlNullableCreatureSize(
  row: SqlRow,
  column: string,
): CreatureSize | null {
  const value = sqlNullableString(row, column);
  return value === null ? null : creatureSize(value);
}

export function sqlSpellSchoolList(
  row: SqlRow,
  column: string,
): SpellSchool[] {
  const decoded = sqlJson(row, column);
  if (!Array.isArray(decoded)) {
    return codecError(column, 'a JSON list of school strings', decoded);
  }
  const schools: SpellSchool[] = [];
  for (const value of decoded) {
    if (typeof value !== 'string') {
      return codecError(column, 'a JSON list of school strings', decoded);
    }
    schools.push(spellSchool(value));
  }
  return schools;
}

export function sqlNullableSpellSchoolList(
  row: SqlRow,
  column: string,
): SpellSchool[] | null {
  return row[column] === null ? null : sqlSpellSchoolList(row, column);
}

export function sqlBoolean(row: SqlRow, column: string): boolean {
  const value = sqlInteger(row, column);
  if (value !== 0 && value !== 1) {
    return codecError(column, 'SQLite boolean 0 or 1', value);
  }
  return value === 1;
}

export function encodeBoolean(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function parseJson<T extends JsonValue = JsonValue>(
  value: string,
  label = 'JSON',
): T {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch (error) {
    throw new TypeError(
      `${label} contains invalid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return decoded as T;
}

export function sqlJson<T extends JsonValue = JsonValue>(
  row: SqlRow,
  column: string,
): T {
  return parseJson<T>(sqlString(row, column), `Column "${column}"`);
}

export function sqlNullableJson<T extends JsonValue = JsonValue>(
  row: SqlRow,
  column: string,
): T | null {
  const value = sqlNullableString(row, column);
  return value === null ? null : parseJson<T>(value, `Column "${column}"`);
}

export function encodeJson(value: JsonValue): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new TypeError('Value is not JSON serializable.');
  }
  return encoded;
}

export function assertJsonObject(
  value: JsonValue,
  label = 'Value',
): asserts value is JsonObject {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new TypeError(`${label} must be a JSON object.`);
  }
}

export function cloneSqlValue(value: SqlValue): SqlValue {
  if (value instanceof Uint8Array) {
    return value.slice();
  }
  if (value instanceof Int8Array) {
    return value.slice();
  }
  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }
  return value;
}

export function cloneSqlRow(row: Record<string, SqlValue>): SqlRow {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, cloneSqlValue(value)]),
    ),
  );
}
