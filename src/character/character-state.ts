import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import type { SqlRow } from '../db/codecs';
import {
  CHARACTER_STATE_TABLES,
  DELETE_ORDER,
  type AuditEntityType,
  type SnapshotTable,
} from '../domain/contracts/tables';
import { migrateLegacyWeaponDamageRow } from '../domain/weapon-damage';
import { migrateLegacyWeaponRangeRow } from '../domain/weapon-range';
import { migrateLegacyTraitRows } from '../rules/legacy-trait-effects';
import { fillAddedNullableRowColumns } from '../domain/contracts/historical-row-columns';

/**
 * THE VERSION EVERY SNAPSHOT THIS BUILD WRITES CARRIES.
 *
 * `a7-v2` differs from `a7-v1` in exactly one way: it also captures
 * `character_weapons`. `a7-v3` differs from `a7-v2` in exactly one way: it also
 * captures the three origin tables. `a7-v4` differs from `a7-v3` in exactly one
 * way: it also captures the four stored sheet inputs. `a7-v5` differs from
 * `a7-v4` in TWO ways, and the second is why the bump was unavoidable rather
 * than merely correct: it captures `character_effects`, AND its
 * `character_species_traits` rows no longer carry the five `effect_*` columns,
 * because the table no longer has them. A pre-v5 snapshot's trait rows DO carry
 * them, so `restore` would build an `INSERT` naming columns that do not exist —
 * see `restore` itself, which migrates them instead. No bump is cosmetic — a
 * reader must be able to tell "this snapshot recorded no armour" from "this
 * snapshot did not record armour at all", and the two are otherwise
 * indistinguishable. The first reading restores an empty list over the
 * character's data; the second leaves it alone, which is the only honest answer.
 *
 * `a7-v6` changes no table list. It changes the shape of each
 * `character_weapons` row from two free-text damage columns to two
 * discriminated damage values. Versions 2 through 5 remain readable through
 * `migrateLegacyWeaponDamageRow`; minting v6 keeps an already-stored v5
 * snapshot identifiable as legacy instead of retroactively changing its claim.
 *
 * `a7-v7` also changes no table list. It replaces the two legacy weapon-range
 * columns with the tagged range triplet. Versions 2 through 6 remain readable
 * through `migrateLegacyWeaponRangeRow`.
 *
 * `a7-v8` changes no table list either. It is the FIRST bump for a COLUMN
 * rather than a table: the `character` projection gains
 * `ability_allocation_method` (the D64 allocation signal). Snapshot versioning
 * covered only tables until now, and both validators required the current
 * column list against every accepted version — which would have broken all
 * seven kept versions the moment the column was added. So columns are now
 * versioned too (`SNAPSHOT_CHARACTER_COLUMNS_BY_VERSION`): the column is
 * required at `a7-v8`, absent below it, and `restore` writes NULL for it when
 * the snapshot predates it — the snapshot genuinely records a character from
 * before allocation could be recorded, and NULL is that state's honest value.
 *
 * NOT BUMPING WOULD HAVE BEEN THE LOUDEST FAILURE IN THIS CHANGE.
 * `SNAPSHOT_TABLES_BY_VERSION` aliases the CURRENT version to the live
 * `CHARACTER_STATE_TABLES`, so adding four tables without minting `a7-v4` would
 * retroactively change what `a7-v3` claims to carry: every save point already on
 * a user's disk would throw `Snapshot table character_armor must be a list.`,
 * and `src/db/candidate-audit.ts` would refuse to import any database image
 * containing one. Undo, save-point restore and `exportCharacterBackup` — which
 * re-parses its own stored save points on the way out — would break together.
 */
export const CHARACTER_SNAPSHOT_SCHEMA_VERSION = 'a7-v8' as const;

/**
 * WHICH TABLES EACH SNAPSHOT VERSION CARRIES.
 *
 * `a7-v1` is a HISTORICAL FACT and is written out by hand, never derived. It is
 * the list as it stood when `a7-v1` was the current version; deriving it (say,
 * as "the current list minus weapons") would make it silently follow the next
 * classification change and start lying about snapshots already on disk.
 *
 * `a7-v2` is the live list, because that is what `capture` writes today.
 */
const A7_V1_TABLES = [
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'warning_acknowledgements',
] as const satisfies readonly SnapshotTable[];

/**
 * `a7-v2` is a HISTORICAL FACT for the same reason `a7-v1` is, and is written
 * out by hand for the same reason: deriving it as "the current list minus the
 * origin tables" would make it silently follow the next classification change
 * and start lying about snapshots already on a user's disk.
 */
const A7_V2_TABLES = [
  ...A7_V1_TABLES,
  'character_weapons',
] as const satisfies readonly SnapshotTable[];

/**
 * `a7-v3` is a HISTORICAL FACT for the same reason `a7-v1` and `a7-v2` are, and
 * this is the moment it becomes one: until this change it was an ALIAS for the
 * live list, which is correct only while it is the current version. Freezing it
 * by hand — rather than deriving it as "the current list minus the four sheet
 * tables" — is what stops it silently following the next classification change
 * and lying about snapshots already on a user's disk.
 */
const A7_V3_TABLES = [
  ...A7_V2_TABLES,
  'character_species',
  'character_species_traits',
  'character_background',
] as const satisfies readonly SnapshotTable[];

/**
 * `a7-v4` is a HISTORICAL FACT for the same reason `a7-v1`..`a7-v3` are, and
 * THIS IS THE MOMENT IT BECOMES ONE: until this change it was an ALIAS for the
 * live list, which is correct only while it is the current version. Freezing it
 * by hand — rather than deriving it as "the current list minus
 * `character_effects`" — is what stops it silently following the next
 * classification change and lying about save points already on a user's disk.
 *
 * Getting this wrong is the most expensive mistake available in this change:
 * every `a7-v4` snapshot would start throwing `Snapshot table character_effects
 * must be a list.`, `src/db/candidate-audit.ts` would refuse to import any
 * database image containing one, and undo, save-point restore and
 * `exportCharacterBackup` — which re-parses its own stored save points on the
 * way out — would break together.
 */
const A7_V4_TABLES = [
  ...A7_V3_TABLES,
  'character_armor',
  'character_hit_point_rolls',
  'character_skill_proficiencies',
  'character_sheet_adjustments',
] as const satisfies readonly SnapshotTable[];

/**
 * `a7-v5` added the effect table. Its weapon rows still use the legacy
 * free-text damage columns, so it remains a historical version even though its
 * table list happens to equal the current one.
 */
const A7_V5_TABLES = [
  ...A7_V4_TABLES,
  'character_effects',
] as const satisfies readonly SnapshotTable[];

/** `a7-v6` weapon rows still carry the retired normal/long range columns. */
const A7_V6_TABLES = [...A7_V5_TABLES] as const satisfies readonly SnapshotTable[];

/**
 * `a7-v7` becomes a HISTORICAL FACT at the `a7-v8` bump, for the reason every
 * predecessor did: until this change it was an ALIAS for the live list, which
 * is correct only while it is the current version. Its table list equals the
 * current one; what distinguishes it is its `character` COLUMN set — see
 * `SNAPSHOT_CHARACTER_COLUMNS_BY_VERSION` below.
 */
const A7_V7_TABLES = [...A7_V6_TABLES] as const satisfies readonly SnapshotTable[];

const SNAPSHOT_TABLES_BY_VERSION = {
  'a7-v1': A7_V1_TABLES,
  'a7-v2': A7_V2_TABLES,
  'a7-v3': A7_V3_TABLES,
  'a7-v4': A7_V4_TABLES,
  'a7-v5': A7_V5_TABLES,
  'a7-v6': A7_V6_TABLES,
  'a7-v7': A7_V7_TABLES,
  'a7-v8': CHARACTER_STATE_TABLES,
} as const satisfies Readonly<Record<string, readonly SnapshotTable[]>>;

/**
 * Every snapshot version this build can still READ, oldest first.
 *
 * Accepting more than one is not compatibility theatre. Snapshots live in three
 * places a user cannot regenerate: `character_save_points` rows in their own
 * database, `restore_snapshot` inverse payloads in `character_operations`, and
 * save points inside a portable backup file they already downloaded. Refusing
 * `a7-v1` would make a character holding a single old save point impossible to
 * restore AND impossible to export, since `exportCharacterBackup` re-parses its
 * own stored save points on the way out.
 */
export const CHARACTER_SNAPSHOT_SCHEMA_VERSIONS = [
  'a7-v1',
  'a7-v2',
  'a7-v3',
  'a7-v4',
  'a7-v5',
  'a7-v6',
  'a7-v7',
  'a7-v8',
] as const satisfies readonly (keyof typeof SNAPSHOT_TABLES_BY_VERSION)[];

export type CharacterSnapshotSchemaVersion =
  (typeof CHARACTER_SNAPSHOT_SCHEMA_VERSIONS)[number];

/** The version of a snapshot, or `null` when it is one this build cannot read. */
export function snapshotSchemaVersion(
  value: unknown,
): CharacterSnapshotSchemaVersion | null {
  return (
    CHARACTER_SNAPSHOT_SCHEMA_VERSIONS.find((version) => version === value) ??
    null
  );
}

/** The tables a snapshot of the given version carries, in capture order. */
export function snapshotTablesFor(
  version: CharacterSnapshotSchemaVersion,
): readonly SnapshotTable[] {
  return SNAPSHOT_TABLES_BY_VERSION[version];
}

/**
 * WHICH `character` COLUMNS EACH SNAPSHOT VERSION CARRIES — the column-level
 * twin of `SNAPSHOT_TABLES_BY_VERSION`, new at `a7-v8`.
 *
 * The pre-v8 list is a HISTORICAL FACT written out by hand, exactly as the
 * historical table lists are and for the same reason: deriving it as "the
 * current list minus the new column" would make it silently follow the next
 * column addition and start lying about snapshots already on a user's disk.
 * Versions 1 through 7 all captured the same eleven columns, so one frozen
 * list serves all seven.
 */
const PRE_V8_CHARACTER_COLUMNS = [
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
 * Every accepted version carries a SUBSET of the current tables.
 *
 * A version naming a table the schema no longer classifies as snapshot-scoped
 * would make `restore` build an INSERT against a table it must not touch, so
 * this is a compile error rather than a comment.
 */
export type _SnapshotVersionsAreSubsets = [
  Exclude<
    (typeof SNAPSHOT_TABLES_BY_VERSION)[CharacterSnapshotSchemaVersion][number],
    SnapshotTable
  >,
] extends [never]
  ? true
  : never;

export const CHARACTER_STATE_COLUMNS = [
  ...PRE_V8_CHARACTER_COLUMNS,
  /**
   * The D64 allocation signal, added at `a7-v8`. In this list so that a
   * snapshot restore — including the `allocate_abilities` command's snapshot
   * inverse — restores the signal WITH the scores: root columns come back only
   * through a snapshot whose projection includes the column.
   */
  'ability_allocation_method',
] as const;

const SNAPSHOT_CHARACTER_COLUMNS_BY_VERSION = {
  'a7-v1': PRE_V8_CHARACTER_COLUMNS,
  'a7-v2': PRE_V8_CHARACTER_COLUMNS,
  'a7-v3': PRE_V8_CHARACTER_COLUMNS,
  'a7-v4': PRE_V8_CHARACTER_COLUMNS,
  'a7-v5': PRE_V8_CHARACTER_COLUMNS,
  'a7-v6': PRE_V8_CHARACTER_COLUMNS,
  'a7-v7': PRE_V8_CHARACTER_COLUMNS,
  'a7-v8': CHARACTER_STATE_COLUMNS,
} as const satisfies Readonly<
  Record<CharacterSnapshotSchemaVersion, readonly string[]>
>;

/**
 * The `character` columns a snapshot of the given version is REQUIRED to
 * carry. A column a version does not carry is absent, not defaulted — the
 * validators require exactly this set per version, and `restore` writes NULL
 * for any current column the version predates.
 */
export function snapshotCharacterColumnsFor(
  version: CharacterSnapshotSchemaVersion,
): readonly (typeof CHARACTER_STATE_COLUMNS)[number][] {
  return SNAPSHOT_CHARACTER_COLUMNS_BY_VERSION[version];
}

/**
 * Every accepted version's column set is a SUBSET of the current columns, for
 * the reason `_SnapshotVersionsAreSubsets` gives about tables: a version
 * naming a column the projection no longer holds would make `restore` build an
 * UPDATE against a column it must not touch.
 */
export type _SnapshotColumnVersionsAreSubsets = [
  Exclude<
    (typeof SNAPSHOT_CHARACTER_COLUMNS_BY_VERSION)[CharacterSnapshotSchemaVersion][number],
    (typeof CHARACTER_STATE_COLUMNS)[number]
  >,
] extends [never]
  ? true
  : never;

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
  return rows.map((row) => {
    const migrated =
      table === 'character_weapons'
        ? migrateLegacyWeaponRangeRow(migrateLegacyWeaponDamageRow(row))
        : row;
    return fillAddedNullableRowColumns(table, migrated) as SnapshotRow;
  });
}

/**
 * The tables a given snapshot value can be asked about.
 *
 * An unreadable or absent version falls back to the CURRENT list, so a
 * malformed snapshot still fails on the missing table rather than being quietly
 * treated as carrying nothing.
 */
function carriedSnapshotTables(
  snapshot: unknown,
): readonly CharacterStateTable[] {
  const version = snapshotSchemaVersion(
    snapshotObject(snapshot).schema_version,
  );
  return version === null ? CHARACTER_STATE_TABLES : snapshotTablesFor(version);
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
    // RAW on purpose, both here and in the table loop below. A snapshot is a
    // column-for-column copy of storage over a table list decided at runtime
    // (`CHARACTER_STATE_TABLES`), and `CharacterStateSnapshot` is typed
    // `SqlRow` for that reason: restoring it writes the same columns back. A
    // codec here would be a second, silent definition of what a character IS,
    // and a save point would restore whatever that definition happened to omit.
    const character = this.db.oneRaw(
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
      snapshot[table] = this.db.allRaw(
        `SELECT * FROM ${quoteIdentifier(table)}
         WHERE character_id = ?
         ORDER BY id`,
        [characterId],
      );
    }
    return snapshot as CharacterStateSnapshot;
  }

  /**
   * Rewrite the character's state to what the snapshot holds.
   *
   * TABLES THE SNAPSHOT DOES NOT CARRY ARE NOT TOUCHED — not deleted, not
   * re-inserted. An `a7-v1` snapshot predates weapons and an `a7-v3` snapshot
   * predates the four sheet inputs, so restoring either leaves that data
   * standing. The alternative, treating the absent key as an empty list, would
   * assert "this character had no armour at that moment" — a claim the snapshot
   * never made, and one that would silently delete real data on undo.
   *
   * `character_effects` IS THE ONE EXCEPTION, AND IT IS NOT A HOLE IN THAT
   * RULE — it is the rule applied to a table that changed shape rather than
   * appeared. An `a7-v3` or `a7-v4` snapshot DOES record this character's
   * effects; it records them as five columns on each `character_species_traits`
   * row, because that is where they lived when it was written. So the snapshot
   * genuinely made the claim, and honouring it means clearing the table and
   * writing the migrated rows rather than leaving whatever is there now.
   *
   * Doing nothing instead would be worse in both directions: the legacy columns
   * would reach `INSERT` and fail on a table that no longer has them, and if
   * they were merely dropped the character would come back from undo with their
   * resistances silently gone. `a7-v1` and `a7-v2` carry no trait rows at all,
   * so they make no claim about effects and this leaves the table alone.
   */
  restore(characterId: number, snapshot: unknown): void {
    const { character, columns, rows, tables } = this.validateSnapshot(
      characterId,
      snapshot,
    );
    // A current column the snapshot's version predates restores as NULL: the
    // snapshot records a character from before that column could hold
    // anything, and NULL is that state's honest value. For
    // `ability_allocation_method` specifically, NULL is "never allocated" —
    // which is exactly what was true when the snapshot was written.
    const carriedColumns = new Set<string>(columns);
    const carried = new Set<string>(tables);
    const legacyTraits =
      carried.has('character_species_traits') && !carried.has('character_effects')
        ? migrateLegacyTraitRows(rows.character_species_traits ?? [])
        : null;
    if (legacyTraits !== null) {
      // Join the DELETE pass, so the migrated rows replace what is there rather
      // than piling on top of it. `DELETE_ORDER` already lists the table.
      carried.add('character_effects');
    }

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
            (column) =>
              (carriedColumns.has(column)
                ? character[column]
                : null) as SqlValue,
          ),
          characterId,
        ],
      );

      for (const table of DELETE_ORDER) {
        if (!carried.has(table)) {
          continue;
        }
        db.exec(
          `DELETE FROM ${quoteIdentifier(table)} WHERE character_id = ?`,
          [characterId],
        );
      }

      for (const table of tables) {
        const tableRows =
          table === 'character_species_traits' && legacyTraits !== null
            ? legacyTraits.rows
            : rows[table] ?? [];
        for (const sourceRow of tableRows) {
          insertRow(db, table, {
            ...sourceRow,
            character_id: characterId,
          });
        }
      }
      // `sort_order` is the position in the migrated list, one-based — the same
      // rule the share import uses for a trait's order, and the only one
      // available: the old model had no order of its own for an effect.
      for (const [index, effect] of (legacyTraits?.effects ?? []).entries()) {
        insertRow(db, 'character_effects', {
          ...effect,
          sort_order: index + 1,
          character_id: characterId,
        });
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

    // A table only one side recorded cannot be diffed: every row would look
    // added or removed purely because the older snapshot never captured them.
    const beforeTables = new Set<string>(carriedSnapshotTables(before));
    const afterTables = new Set<string>(carriedSnapshotTables(after));

    for (const table of CHARACTER_STATE_TABLES) {
      if (!beforeTables.has(table) || !afterTables.has(table)) {
        continue;
      }
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
    columns: readonly (typeof CHARACTER_STATE_COLUMNS)[number][];
    rows: Partial<Record<CharacterStateTable, SnapshotRow[]>>;
    tables: readonly CharacterStateTable[];
  } {
    const root = snapshotObject(snapshot);
    const version = snapshotSchemaVersion(root.schema_version);
    if (version === null) {
      throw new Error('Unsupported character snapshot schema.');
    }
    const tables = snapshotTablesFor(version);

    const character = root.character;
    if (!isObject(character)) {
      throw new Error('Character snapshot is missing character data.');
    }
    // Required columns are the VERSION'S OWN, not the current list: an
    // `a7-v7` snapshot predates `ability_allocation_method` and demanding it
    // would refuse every save point already on a user's disk.
    for (const column of snapshotCharacterColumnsFor(version)) {
      if (!Object.hasOwn(character, column)) {
        throw new Error(`Character snapshot is missing ${column}.`);
      }
    }

    const rows: Partial<Record<CharacterStateTable, SnapshotRow[]>> = {};
    const spellVersionIds: number[] = [];
    for (const table of tables) {
      const tableRows = snapshotRows(root, table);
      rows[table] = tableRows;
      for (const row of tableRows) {
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

    return {
      character,
      columns: snapshotCharacterColumnsFor(version),
      rows,
      tables,
    };
  }
}
