import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import {
  CHARACTER_STATE_COLUMNS,
  CHARACTER_STATE_TABLES,
  snapshotSchemaVersion,
  snapshotTablesFor,
  type CharacterSnapshotSchemaVersion,
} from '../character/character-state';
import type { DatabaseContext } from '../db/database';
import type { SqlRow } from '../db/codecs';
import {
  assertBackupHeader,
  assertExactKeys,
  assertKeysAllowingAbsent,
  backupRecord,
  BackupValidationError,
  CHARACTER_BACKUP_FORMAT,
  CHARACTER_BACKUP_VERSION,
} from './backup-version';
import {
  BACKUP_DIRECT_TABLES,
  BACKUP_OPTIONAL_TABLES,
  BACKUP_TABLES,
  REFERENCE_KINDS,
  SOURCE_REFERENCE_KIND,
  type BackupTable,
  type ReferenceKind as DerivedReferenceKind,
} from '../domain/contracts/tables';
import {
  rowContractError,
  type RowContractTable,
} from '../domain/contracts/rows';
import {
  slotExclusiveAssignmentError,
  uniqueRowIdError,
  armorDexBonusPairError,
  weaponMasterySelectionError,
} from '../domain/contracts/row-rules';

type BackupRow = Readonly<Record<string, unknown>>;
type MutableRow = Record<string, unknown>;

/**
 * The backup scopes, derived from the schema.
 *
 * `directCharacterTables` is the `character_id`-keyed pass;
 * `spell_loadout_entries` is backed up but cannot join it because it has no
 * `character_id` column — a fact now enforced by the type system rather than
 * by a comment.
 *
 * `referenceKinds` is derived from a DEDICATED flag, not from a role filter.
 * A role filter over the class catalog would have swept in
 * `class_progressions` and `subclass_progressions`, and since
 * `CharacterBackupReferences` is `Record<ReferenceKind, …>` that would have
 * made every existing backup document structurally invalid with no type error.
 */
const directCharacterTables = BACKUP_DIRECT_TABLES;

const backupTableNames = BACKUP_TABLES;

type BackupTableName = BackupTable;

const referenceKinds = REFERENCE_KINDS;

type ReferenceKind = DerivedReferenceKind;

export interface BackupReference {
  readonly id: number;
  readonly content_key: string;
}

export type CharacterBackupTables = {
  readonly [Table in BackupTableName]: readonly BackupRow[];
};

export type CharacterBackupReferences = {
  readonly [Kind in ReferenceKind]: readonly BackupReference[];
};

export interface CharacterBackupDocument {
  readonly format: typeof CHARACTER_BACKUP_FORMAT;
  readonly version: typeof CHARACTER_BACKUP_VERSION;
  readonly exported_at: string;
  readonly source_character_id: number;
  readonly character: BackupRow;
  readonly tables: CharacterBackupTables;
  readonly references: CharacterBackupReferences;
}

export interface CharacterImportResult {
  readonly characterId: number;
}

interface ValidatedDocument {
  readonly document: CharacterBackupDocument;
  readonly snapshots: readonly CharacterSnapshotData[];
  readonly referenceMaps: Readonly<Record<ReferenceKind, Map<number, string>>>;
}

/**
 * The rows of a state-table set, with every table allowed to be ABSENT.
 *
 * Absent is not the same as empty here, and the distinction is the whole reason
 * this type is partial: an `a7-v1` save point does not carry
 * `character_weapons`, and rewriting it with `character_weapons: []` would turn
 * "not recorded" into "recorded as none" — a claim that deletes real weapons
 * when the save point is restored.
 */
type SnapshotRowMap = Readonly<
  Partial<Record<SnapshotStateTable, readonly BackupRow[]>>
>;

interface CharacterSnapshotData {
  readonly schema_version: CharacterSnapshotSchemaVersion;
  /** The tables this snapshot's version carries, in capture order. */
  readonly tables: readonly SnapshotStateTable[];
  readonly character: BackupRow;
  readonly rows: SnapshotRowMap;
}

type ResolvedReferences = Readonly<Record<ReferenceKind, Map<number, number>>>;

/**
 * The exhaustiveness and value checks live at the DEFINITION site:
 * `SOURCE_REFERENCE_KIND satisfies Record<DomainSourceType, ReferenceKind>` is
 * what forces every source type to be mapped and forbids naming a table that
 * is not a reference kind. It was an unchecked `Record<string, string>` before.
 *
 * The `Record<string, …>` annotation HERE is deliberate and is NOT a
 * re-widening of that: the key arrives as an untrusted `string` off a backup
 * document, so the lookup must be allowed to miss — which is exactly what
 * `sourceReferenceKind` below turns into a `BackupValidationError`.
 */
const sourceReferenceKinds: Readonly<Record<string, ReferenceKind>> =
  SOURCE_REFERENCE_KIND;

function sourceReferenceKind(sourceType: unknown): ReferenceKind {
  const kind =
    typeof sourceType === 'string'
      ? sourceReferenceKinds[sourceType]
      : undefined;
  if (kind === undefined) {
    throw new BackupValidationError(
      `Unsupported character source_type ${JSON.stringify(sourceType)}.`,
    );
  }
  return kind;
}

/**
 * SHAPE VALIDATION FOR A ROW THAT IS ABOUT TO BE WRITTEN VERBATIM.
 *
 * `insertPortableRow` builds its column list from `Object.keys(row)`, so before
 * this every key in a hostile document became an identifier in a generated
 * `INSERT`, and every value went to the driver unexamined. The contracts in
 * `src/domain/contracts/rows.ts` are derived from the Drizzle schema, so they
 * cannot fall behind it.
 *
 * Every call site here runs BEFORE `importCharacterBackup` opens its
 * transaction: `validateDocument` is called first and throws, so a rejected
 * document performs no writes at all and atomicity is unchanged.
 */
function assertRowShape(
  table: RowContractTable,
  row: unknown,
  label: string,
  only?: readonly string[],
): void {
  const error = rowContractError(table, row, label, only);
  if (error !== null) {
    throw new BackupValidationError(error);
  }
}

/** The backup tables whose shape is NOT already checked by `validateCharacterRows`. */
const optionalBackupTables = new Set<string>(BACKUP_OPTIONAL_TABLES);

const shapeOnlyTables = backupTableNames.filter(
  (table): table is Exclude<BackupTableName, SnapshotStateTable> =>
    !(CHARACTER_STATE_TABLES as readonly string[]).includes(table),
);

type SnapshotStateTable = (typeof CHARACTER_STATE_TABLES)[number];

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new BackupValidationError(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function nullablePositiveInteger(
  value: unknown,
  label: string,
): number | null {
  return value === null ? null : positiveInteger(value, label);
}

function rowList(value: unknown, label: string): BackupRow[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(`${label} must be a list.`);
  }
  return value.map((row, index) =>
    backupRecord(row, `${label}[${index}]`),
  );
}

/**
 * The rule itself lives in `../domain/contracts/row-rules.ts` so the
 * quarantined-image audit enforces the SAME one on the save-point snapshots it
 * finds inside a database image. This wrapper is what turns the shared verdict
 * into a `BackupValidationError` and hands back the id set the reference checks
 * below need.
 */
function uniqueRowIds(rows: readonly BackupRow[], label: string): Set<number> {
  const ids = new Set<number>();
  const error = uniqueRowIdError(rows, label, ids);
  if (error !== null) {
    throw new BackupValidationError(error);
  }
  return ids;
}

function assertOwnedRows(
  rows: readonly BackupRow[],
  characterId: number,
  label: string,
): void {
  for (const [index, row] of rows.entries()) {
    if (row.character_id !== characterId) {
      throw new BackupValidationError(
        `${label}[${index}] belongs to another character.`,
      );
    }
  }
}

function parseSnapshot(value: unknown, label: string): CharacterSnapshotData {
  if (typeof value !== 'string') {
    throw new BackupValidationError(`${label} must be JSON text.`);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new BackupValidationError(`${label} is not valid JSON.`);
  }
  const snapshot = backupRecord(decoded, label);
  // The version is read FIRST, because it decides which table set the snapshot
  // is required to contain. Checking the keys first would refuse every `a7-v1`
  // save point in a backup file a user already downloaded.
  const version = snapshotSchemaVersion(snapshot.schema_version);
  if (version === null) {
    throw new BackupValidationError(
      `${label} uses an unsupported character snapshot schema.`,
    );
  }
  const tables = snapshotTablesFor(version);
  assertExactKeys(
    snapshot,
    ['schema_version', 'character', ...tables],
    label,
  );
  const character = backupRecord(snapshot.character, `${label}.character`);
  for (const column of CHARACTER_STATE_COLUMNS) {
    if (!Object.hasOwn(character, column)) {
      throw new BackupValidationError(
        `${label}.character is missing ${column}.`,
      );
    }
  }
  // A snapshot's `character` is a PROJECTION of `characters` onto the state
  // columns (`CharacterState.capture`), not a whole row, so the contract is
  // restricted to those columns rather than the full table.
  assertRowShape(
    'characters',
    character,
    `${label}.character`,
    CHARACTER_STATE_COLUMNS,
  );
  return {
    schema_version: version,
    tables,
    character,
    rows: Object.fromEntries(
      tables.map((table) => [
        table,
        rowList(snapshot[table], `${label}.${table}`),
      ]),
    ) as SnapshotRowMap,
  };
}

function referenceMap(
  value: unknown,
  kind: ReferenceKind,
): Map<number, string> {
  const rows = rowList(value, `Character backup references.${kind}`);
  const result = new Map<number, string>();
  const keys = new Set<string>();
  for (const [index, row] of rows.entries()) {
    assertExactKeys(
      row as Record<string, unknown>,
      ['id', 'content_key'],
      `Character backup references.${kind}[${index}]`,
    );
    const id = positiveInteger(
      row.id,
      `Character backup references.${kind}[${index}].id`,
    );
    if (typeof row.content_key !== 'string' || row.content_key.length === 0) {
      throw new BackupValidationError(
        `Character backup references.${kind}[${index}].content_key must be a non-empty string.`,
      );
    }
    if (result.has(id) || keys.has(row.content_key)) {
      throw new BackupValidationError(
        `Character backup references.${kind} contains a duplicate id or content_key.`,
      );
    }
    result.set(id, row.content_key);
    keys.add(row.content_key);
  }
  return result;
}

function requireReference(
  maps: Readonly<Record<ReferenceKind, Map<number, string>>>,
  kind: ReferenceKind,
  value: unknown,
  label: string,
  nullable = false,
): void {
  if (nullable && value === null) {
    return;
  }
  const id = positiveInteger(value, label);
  if (!maps[kind].has(id)) {
    throw new BackupValidationError(
      `${label} has no ${kind} content-key reference for id ${id}.`,
    );
  }
}

/**
 * The rules every state table's rows must satisfy, for a document's own tables
 * and for each save point's snapshot alike.
 *
 * Takes a SPARSE map so the same function serves both. A snapshot written under
 * an older schema version simply does not carry some tables, and skipping an
 * absent one is correct: there are no rows to hold to a contract.
 */
function validateCharacterRows(
  tables: SnapshotRowMap,
  characterId: number,
  maps: Readonly<Record<ReferenceKind, Map<number, string>>>,
  label: string,
): void {
  for (const table of CHARACTER_STATE_TABLES) {
    const rows = tables[table];
    if (rows === undefined) {
      continue;
    }
    for (const [index, row] of rows.entries()) {
      assertRowShape(table, row, `${label}.${table}[${index}]`);
      if (table === 'character_weapons') {
        // Shared with the quarantined-image audit — see `row-rules.ts`. The
        // live table's CHECK cannot see a row that is still JSON.
        const mastery = weaponMasterySelectionError(
          row,
          `${label}.${table}[${index}]`,
        );
        if (mastery !== null) {
          throw new BackupValidationError(mastery);
        }
      }
      if (table === 'character_armor') {
        // Shared with the quarantined-image audit for the same reason: the
        // live table's two CHECKs cannot see a row that is still JSON, and
        // reaching the INSERT with a broken pair aborts the whole import with a
        // raw SQLITE_CONSTRAINT_CHECK naming nothing.
        const pairing = armorDexBonusPairError(
          row,
          `${label}.${table}[${index}]`,
        );
        if (pairing !== null) {
          throw new BackupValidationError(pairing);
        }
      }
    }
    assertOwnedRows(rows, characterId, `${label}.${table}`);
    uniqueRowIds(rows, `${label}.${table}`);
  }

  for (const [index, row] of (
    tables.character_class_levels ?? []
  ).entries()) {
    requireReference(
      maps,
      'class_definitions',
      row.class_definition_id,
      `${label}.character_class_levels[${index}].class_definition_id`,
    );
    requireReference(
      maps,
      'subclass_definitions',
      row.subclass_definition_id,
      `${label}.character_class_levels[${index}].subclass_definition_id`,
      true,
    );
  }

  const sourceInstances = tables.character_source_instances ?? [];
  const sourceIds = uniqueRowIds(
    sourceInstances,
    `${label}.character_source_instances`,
  );
  const instanceUuids = new Set<string>();
  for (const [index, row] of sourceInstances.entries()) {
    if (
      typeof row.instance_uuid !== 'string' ||
      row.instance_uuid.length === 0 ||
      instanceUuids.has(row.instance_uuid)
    ) {
      throw new BackupValidationError(
        `${label}.character_source_instances[${index}].instance_uuid must be a unique non-empty string.`,
      );
    }
    instanceUuids.add(row.instance_uuid);
    const parentId = nullablePositiveInteger(
      row.parent_source_instance_id,
      `${label}.character_source_instances[${index}].parent_source_instance_id`,
    );
    if (parentId !== null && !sourceIds.has(parentId)) {
      throw new BackupValidationError(
        `${label}.character_source_instances[${index}] has a parent from another character.`,
      );
    }
    const sourceReferenceKind =
      typeof row.source_type === 'string'
        ? sourceReferenceKinds[row.source_type]
        : undefined;
    if (sourceReferenceKind === undefined) {
      throw new BackupValidationError(
        `${label}.character_source_instances[${index}].source_type is unsupported.`,
      );
    }
    requireReference(
      maps,
      sourceReferenceKind,
      row.source_definition_id,
      `${label}.character_source_instances[${index}].source_definition_id`,
      true,
    );
  }

  for (const [index, row] of (tables.spell_selection_slots ?? []).entries()) {
    const sourceId = positiveInteger(
      row.source_instance_id,
      `${label}.spell_selection_slots[${index}].source_instance_id`,
    );
    if (!sourceIds.has(sourceId)) {
      throw new BackupValidationError(
        `${label}.spell_selection_slots[${index}] references a source from another character.`,
      );
    }
    requireReference(
      maps,
      'spell_versions',
      row.fixed_spell_version_id,
      `${label}.spell_selection_slots[${index}].fixed_spell_version_id`,
      true,
    );
    requireReference(
      maps,
      'spell_versions',
      row.current_spell_version_id,
      `${label}.spell_selection_slots[${index}].current_spell_version_id`,
      true,
    );
    // Shared with the quarantined-image audit — see `row-rules.ts`.
    const exclusivity = slotExclusiveAssignmentError(
      row,
      `${label}.spell_selection_slots[${index}]`,
    );
    if (exclusivity !== null) {
      throw new BackupValidationError(exclusivity);
    }
  }

  for (const [index, row] of (
    tables.wizard_spellbook_entries ?? []
  ).entries()) {
    requireReference(
      maps,
      'spell_versions',
      row.spell_version_id,
      `${label}.wizard_spellbook_entries[${index}].spell_version_id`,
    );
  }
}

function validateDocument(input: unknown): ValidatedDocument {
  const document = backupRecord(input, 'Character backup');
  assertExactKeys(
    document,
    [
      'format',
      'version',
      'exported_at',
      'source_character_id',
      'character',
      'tables',
      'references',
    ],
    'Character backup',
  );
  assertBackupHeader(
    document,
    CHARACTER_BACKUP_FORMAT,
    CHARACTER_BACKUP_VERSION,
    'character backup',
  );
  const characterId = positiveInteger(
    document.source_character_id,
    'Character backup source_character_id',
  );
  const character = backupRecord(
    document.character,
    'Character backup character',
  );
  const characterColumns = [
    'id',
    ...CHARACTER_STATE_COLUMNS,
    'revision',
    'created_at',
    'updated_at',
  ] as const;
  assertExactKeys(
    character,
    characterColumns,
    'Character backup character',
  );
  if (character.id !== characterId) {
    throw new BackupValidationError(
      'Character backup character belongs to another character.',
    );
  }
  if (typeof character.name !== 'string' || character.name.trim().length === 0) {
    throw new BackupValidationError(
      'Character backup character.name must be a non-empty string.',
    );
  }
  for (const ability of [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ] as const) {
    if (
      !Number.isSafeInteger(character[ability]) ||
      Number(character[ability]) < 1 ||
      Number(character[ability]) > 30
    ) {
      throw new BackupValidationError(
        `Character backup character.${ability} must be an integer from 1 through 30.`,
      );
    }
  }
  if (
    character.proficiency_bonus_override !== null &&
    (!Number.isSafeInteger(character.proficiency_bonus_override) ||
      Number(character.proficiency_bonus_override) < 1)
  ) {
    throw new BackupValidationError(
      'Character backup character.proficiency_bonus_override must be null or a positive integer.',
    );
  }
  if (
    !['2014', '2024', 'expanded'].includes(
      String(character.rules_edition_preference),
    )
  ) {
    throw new BackupValidationError(
      'Character backup character.rules_edition_preference is unsupported.',
    );
  }
  if (
    character.allow_legacy !== 0 &&
    character.allow_legacy !== 1 &&
    typeof character.allow_legacy !== 'boolean'
  ) {
    throw new BackupValidationError(
      'Character backup character.allow_legacy must be boolean.',
    );
  }
  if (
    !Number.isSafeInteger(character.revision) ||
    Number(character.revision) < 0
  ) {
    throw new BackupValidationError(
      'Character backup character.revision must be a non-negative integer.',
    );
  }

  assertRowShape(
    'characters',
    character,
    'Character backup character',
  );

  const tableObject = backupRecord(
    document.tables,
    'Character backup tables',
  );
  // A TABLE ADDED AFTER A USER'S FILE WAS WRITTEN IS OPTIONAL, NOT MISSING.
  //
  // The document's table set is otherwise closed in both directions, which is
  // what `assertExactKeys` gave and what keeps a typo'd table name from being
  // read as "no rows". `BACKUP_OPTIONAL_TABLES` names the exceptions: tables
  // that did not exist when `CHARACTER_BACKUP_VERSION` 1 shipped, so no file
  // already on a user's disk can contain them.
  //
  // Defaulting an absent one to `[]` is the honest reading and NOT a
  // convenience: that document genuinely carries no weapons, so the character
  // it restores has none. This is the only place in this module where "absent"
  // becomes "empty" — inside a save-point snapshot it deliberately does not,
  // because there restoring an empty list would DELETE weapons rather than
  // decline to mention them.
  assertKeysAllowingAbsent(
    tableObject,
    backupTableNames.filter((table) => !optionalBackupTables.has(table)),
    [...BACKUP_OPTIONAL_TABLES],
    'Character backup tables',
  );
  const tables = Object.fromEntries(
    backupTableNames.map((table) => [
      table,
      tableObject[table] === undefined && optionalBackupTables.has(table)
        ? []
        : rowList(tableObject[table], `Character backup tables.${table}`),
    ]),
  ) as unknown as CharacterBackupTables;

  const referenceObject = backupRecord(
    document.references,
    'Character backup references',
  );
  assertExactKeys(
    referenceObject,
    referenceKinds,
    'Character backup references',
  );
  const referenceMaps = Object.fromEntries(
    referenceKinds.map((kind) => [
      kind,
      referenceMap(referenceObject[kind], kind),
    ]),
  ) as Record<ReferenceKind, Map<number, string>>;

  // The five snapshot tables get their shape checked inside
  // `validateCharacterRows`, which also runs for every save point; the rest are
  // checked here so each row is contract-validated exactly once.
  for (const table of shapeOnlyTables) {
    for (const [index, row] of tables[table].entries()) {
      assertRowShape(table, row, `Character backup tables.${table}[${index}]`);
    }
  }

  for (const table of directCharacterTables) {
    assertOwnedRows(
      tables[table],
      characterId,
      `Character backup tables.${table}`,
    );
    uniqueRowIds(tables[table], `Character backup tables.${table}`);
  }
  validateCharacterRows(
    tables,
    characterId,
    referenceMaps,
    'Character backup tables',
  );
  topologicalSources(tables.character_source_instances);

  for (const [index, row] of tables.character_spell_preferences.entries()) {
    requireReference(
      referenceMaps,
      'spell_versions',
      row.spell_version_id,
      `Character backup tables.character_spell_preferences[${index}].spell_version_id`,
    );
  }

  const loadoutIds = uniqueRowIds(
    tables.spell_loadouts,
    'Character backup tables.spell_loadouts',
  );
  uniqueRowIds(
    tables.spell_loadout_entries,
    'Character backup tables.spell_loadout_entries',
  );
  for (const [index, row] of tables.spell_loadout_entries.entries()) {
    const loadoutId = positiveInteger(
      row.spell_loadout_id,
      `Character backup tables.spell_loadout_entries[${index}].spell_loadout_id`,
    );
    if (!loadoutIds.has(loadoutId)) {
      throw new BackupValidationError(
        `Character backup tables.spell_loadout_entries[${index}] references a loadout from another character.`,
      );
    }
    requireReference(
      referenceMaps,
      'spell_versions',
      row.spell_version_id,
      `Character backup tables.spell_loadout_entries[${index}].spell_version_id`,
    );
  }

  const snapshots = tables.character_save_points.map((row, index) => {
    if (snapshotSchemaVersion(row.schema_version) === null) {
      throw new BackupValidationError(
        `Character backup tables.character_save_points[${index}] uses an unsupported schema_version.`,
      );
    }
    const snapshot = parseSnapshot(
      row.snapshot,
      `Character backup tables.character_save_points[${index}].snapshot`,
    );
    // The column and the JSON inside it are two statements of the same fact,
    // and they are re-emitted separately on import. A document that disagrees
    // with itself would decide which one wins by accident.
    if (row.schema_version !== snapshot.schema_version) {
      throw new BackupValidationError(
        `Character backup tables.character_save_points[${index}].schema_version does not match its snapshot.`,
      );
    }
    validateCharacterRows(
      snapshot.rows,
      characterId,
      referenceMaps,
      `Character backup tables.character_save_points[${index}].snapshot`,
    );
    topologicalSources(snapshot.rows.character_source_instances ?? []);
    return snapshot;
  });

  return {
    document: {
      format: CHARACTER_BACKUP_FORMAT,
      version: CHARACTER_BACKUP_VERSION,
      exported_at: document.exported_at as string,
      source_character_id: characterId,
      character,
      tables,
      references: Object.fromEntries(
        referenceKinds.map((kind) => [
          kind,
          [...referenceMaps[kind]].map(([id, content_key]) => ({
            id,
            content_key,
          })),
        ]),
      ) as unknown as CharacterBackupReferences,
    },
    snapshots,
    referenceMaps,
  };
}

export function validateCharacterBackup(
  input: unknown,
): asserts input is CharacterBackupDocument {
  validateDocument(input);
}

function placeholders(values: ReadonlySet<number>): string {
  return [...values].map(() => '?').join(', ');
}

function addPositiveReference(
  target: Set<number>,
  value: unknown,
): void {
  if (Number.isSafeInteger(value) && Number(value) >= 1) {
    target.add(Number(value));
  }
}

function collectReferences(
  tables: SnapshotRowMap,
  ids: Record<ReferenceKind, Set<number>>,
): void {
  for (const row of tables.character_class_levels ?? []) {
    addPositiveReference(ids.class_definitions, row.class_definition_id);
    addPositiveReference(ids.subclass_definitions, row.subclass_definition_id);
  }
  for (const row of tables.character_source_instances ?? []) {
    if (typeof row.source_type === 'string') {
      const kind = sourceReferenceKinds[row.source_type];
      if (kind !== undefined) {
        addPositiveReference(ids[kind], row.source_definition_id);
      }
    }
  }
  for (const row of tables.spell_selection_slots ?? []) {
    addPositiveReference(ids.spell_versions, row.fixed_spell_version_id);
    addPositiveReference(ids.spell_versions, row.current_spell_version_id);
  }
  for (const row of tables.wizard_spellbook_entries ?? []) {
    addPositiveReference(ids.spell_versions, row.spell_version_id);
  }
}

function selectCharacterRows(
  db: DatabaseContext,
  table: string,
  characterId: number,
): SqlRow[] {
  // Raw by definition: `table` comes from `directCharacterTables` at runtime, so
  // a backup row has no fixed column set. A backup is a column-for-column copy
  // of storage — decoding it here would make the round trip assert through the
  // decoder instead of against the database.
  return db.allRaw(
    `SELECT * FROM "${table}" WHERE character_id = ? ORDER BY id`,
    [characterId],
  );
}

export function exportCharacterBackup(
  db: DatabaseContext,
  characterId: number,
  exportedAt = new Date().toISOString(),
): CharacterBackupDocument {
  positiveInteger(characterId, 'Character id');
  const character = db.oneRaw(
    'SELECT * FROM characters WHERE id = ?',
    [characterId],
  );
  if (character === null) {
    throw new Error(`Character ${characterId} does not exist.`);
  }

  const tables = Object.fromEntries(
    directCharacterTables.map((table) => [
      table,
      selectCharacterRows(db, table, characterId),
    ]),
  ) as unknown as CharacterBackupTables;
  const loadoutIds = tables.spell_loadouts.map((row) => Number(row.id));
  const entries =
    loadoutIds.length === 0
      ? []
      : db.allRaw(
          `SELECT *
           FROM spell_loadout_entries
           WHERE spell_loadout_id IN (${loadoutIds.map(() => '?').join(', ')})
           ORDER BY id`,
          loadoutIds,
        );
  const allTables = {
    ...tables,
    spell_loadout_entries: entries,
  } as CharacterBackupTables;

  const referenceIds = Object.fromEntries(
    referenceKinds.map((kind) => [kind, new Set<number>()]),
  ) as Record<ReferenceKind, Set<number>>;
  collectReferences(allTables, referenceIds);
  for (const row of allTables.character_spell_preferences) {
    addPositiveReference(referenceIds.spell_versions, row.spell_version_id);
  }
  for (const row of allTables.spell_loadout_entries) {
    addPositiveReference(referenceIds.spell_versions, row.spell_version_id);
  }
  // THE CONTRACTS GATE THE EXPORT PATH, WHICH IS DELIBERATE.
  //
  // `parseSnapshot` here, and `validateCharacterBackup(result)` at the end of
  // this function, both apply the row contracts to the user's OWN STORED DATA.
  // That means stored corruption is reported on the way OUT, where there is no
  // attacker — a real behaviour change, since the contracts made a pre-existing
  // check stricter (`validateCharacterBackup(result)` has closed this function
  // since long before they existed).
  //
  // It is kept, because the alternative is worse: an export that silently
  // carries a row the importer will refuse is a backup the user only discovers
  // is useless when they need it. The label below says `Stored save point N` so
  // the message points at the database rather than at the caller's input, and
  // `tests/integration/backup/row-contracts.test.ts` pins the behaviour so a
  // change to the contract set shows its effect on existing databases instead of
  // surprising someone mid-export.
  for (const [index, savePoint] of allTables.character_save_points.entries()) {
    const snapshot = parseSnapshot(
      savePoint.snapshot,
      `Stored save point ${index + 1}`,
    );
    collectReferences(snapshot.rows, referenceIds);
  }

  const references = Object.fromEntries(
    referenceKinds.map((kind) => {
      const ids = referenceIds[kind];
      const rows =
        ids.size === 0
          ? []
          : db.all<{ id: number; content_key: string }>(
              `SELECT id, content_key
               FROM "${kind}"
               WHERE id IN (${placeholders(ids)})
               ORDER BY id`,
              [...ids],
              (row) => ({
                id: Number(row.id),
                content_key: String(row.content_key),
              }),
            );
      if (rows.length !== ids.size) {
        throw new Error(
          `Character ${characterId} contains an unresolved ${kind} reference.`,
        );
      }
      return [kind, rows];
    }),
  ) as unknown as CharacterBackupReferences;

  const result: CharacterBackupDocument = {
    format: CHARACTER_BACKUP_FORMAT,
    version: CHARACTER_BACKUP_VERSION,
    exported_at: exportedAt,
    source_character_id: characterId,
    character,
    tables: allTables,
    references,
  };
  validateCharacterBackup(result);
  return result;
}

function resolveReferences(
  db: DatabaseContext,
  maps: Readonly<Record<ReferenceKind, Map<number, string>>>,
): ResolvedReferences {
  return Object.fromEntries(
    referenceKinds.map((kind) => {
      const source = maps[kind];
      if (source.size === 0) {
        return [kind, new Map<number, number>()];
      }
      const keys = [...source.values()];
      const rows = db.all<{ id: number; content_key: string }>(
        `SELECT id, content_key
         FROM "${kind}"
         WHERE content_key IN (${keys.map(() => '?').join(', ')})
           ${kind === 'spell_versions' ? 'AND is_active = 1' : ''}`,
        keys,
        (row) => ({
          id: Number(row.id),
          content_key: String(row.content_key),
        }),
      );
      const byKey = new Map(rows.map((row) => [row.content_key, row.id]));
      const resolved = new Map<number, number>();
      for (const [sourceId, contentKey] of source) {
        const targetId = byKey.get(contentKey);
        if (targetId === undefined) {
          throw new BackupValidationError(
            `Character backup requires unavailable active ${kind} content_key "${contentKey}".`,
          );
        }
        resolved.set(sourceId, targetId);
      }
      return [kind, resolved];
    }),
  ) as ResolvedReferences;
}

function resolvedId(
  references: ResolvedReferences,
  kind: ReferenceKind,
  value: unknown,
): number | null {
  if (value === null) {
    return null;
  }
  const id = positiveInteger(value, `${kind} reference`);
  const resolved = references[kind].get(id);
  if (resolved === undefined) {
    throw new BackupValidationError(`Unresolved ${kind} reference ${id}.`);
  }
  return resolved;
}

function quoted(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function insertPortableRow(
  db: DatabaseContext,
  table: string,
  source: BackupRow,
  overrides: Readonly<Record<string, unknown>>,
  omit: ReadonlySet<string> = new Set(['id']),
): number {
  const row: MutableRow = { ...source, ...overrides };
  for (const column of omit) {
    delete row[column];
  }
  const columns = Object.keys(row);
  const result = db.exec(
    `INSERT INTO ${quoted(table)}
       (${columns.map(quoted).join(', ')})
     VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((column) => row[column] as SqlValue),
  );
  return result.lastInsertId;
}

function topologicalSources(rows: readonly BackupRow[]): BackupRow[] {
  const pending = new Map(
    rows.map((row) => [positiveInteger(row.id, 'Source id'), row]),
  );
  const emitted = new Set<number>();
  const ordered: BackupRow[] = [];
  while (pending.size > 0) {
    let progressed = false;
    for (const [id, row] of pending) {
      const parent = nullablePositiveInteger(
        row.parent_source_instance_id,
        'Source parent id',
      );
      if (parent !== null && !emitted.has(parent)) {
        continue;
      }
      ordered.push(row);
      emitted.add(id);
      pending.delete(id);
      progressed = true;
    }
    if (!progressed) {
      throw new BackupValidationError(
        'Character backup source parent graph contains a cycle.',
      );
    }
  }
  return ordered;
}

function remappedSlotKey(
  value: unknown,
  oldUuid: unknown,
  newUuid: string,
): unknown {
  if (
    typeof value === 'string' &&
    typeof oldUuid === 'string' &&
    value.startsWith(`${oldUuid}:`)
  ) {
    return `${newUuid}${value.slice(oldUuid.length)}`;
  }
  return value;
}

interface CurrentImportMaps {
  readonly character_class_levels: Map<number, number>;
  readonly character_source_instances: Map<number, number>;
  readonly spell_selection_slots: Map<number, number>;
  readonly wizard_spellbook_entries: Map<number, number>;
  readonly warning_acknowledgements: Map<number, number>;
  readonly character_weapons: Map<number, number>;
  readonly character_species: Map<number, number>;
  readonly character_species_traits: Map<number, number>;
  readonly character_background: Map<number, number>;
  readonly character_armor: Map<number, number>;
  readonly character_hit_point_rolls: Map<number, number>;
  readonly character_skill_proficiencies: Map<number, number>;
  readonly character_sheet_adjustments: Map<number, number>;
  readonly spell_loadouts: Map<number, number>;
  readonly sourceUuids: Map<number, string>;
  readonly sourceRows: Map<number, BackupRow>;
}

function importCurrentTables(
  db: DatabaseContext,
  document: CharacterBackupDocument,
  characterId: number,
  references: ResolvedReferences,
): CurrentImportMaps {
  const maps: CurrentImportMaps = {
    character_class_levels: new Map(),
    character_source_instances: new Map(),
    spell_selection_slots: new Map(),
    wizard_spellbook_entries: new Map(),
    warning_acknowledgements: new Map(),
    character_weapons: new Map(),
    character_species: new Map(),
    character_species_traits: new Map(),
    character_background: new Map(),
    character_armor: new Map(),
    character_hit_point_rolls: new Map(),
    character_skill_proficiencies: new Map(),
    character_sheet_adjustments: new Map(),
    spell_loadouts: new Map(),
    sourceUuids: new Map(),
    sourceRows: new Map(
      document.tables.character_source_instances.map((row) => [
        Number(row.id),
        row,
      ]),
    ),
  };

  for (const row of document.tables.character_class_levels) {
    maps.character_class_levels.set(
      Number(row.id),
      insertPortableRow(db, 'character_class_levels', row, {
        character_id: characterId,
        class_definition_id: resolvedId(
          references,
          'class_definitions',
          row.class_definition_id,
        ),
        subclass_definition_id: resolvedId(
          references,
          'subclass_definitions',
          row.subclass_definition_id,
        ),
      }),
    );
  }

  for (const row of topologicalSources(
    document.tables.character_source_instances,
  )) {
    const oldId = Number(row.id);
    const sourceType = String(row.source_type);
    const uuid = crypto.randomUUID();
    maps.sourceUuids.set(oldId, uuid);
    maps.character_source_instances.set(
      oldId,
      insertPortableRow(db, 'character_source_instances', row, {
        character_id: characterId,
        instance_uuid: uuid,
        parent_source_instance_id:
          row.parent_source_instance_id === null
            ? null
            : maps.character_source_instances.get(
                Number(row.parent_source_instance_id),
              ),
        source_definition_id: resolvedId(
          references,
          sourceReferenceKind(sourceType),
          row.source_definition_id,
        ),
      }),
    );
  }

  for (const row of document.tables.spell_selection_slots) {
    const oldSourceId = Number(row.source_instance_id);
    const source = maps.sourceRows.get(oldSourceId);
    const newUuid = maps.sourceUuids.get(oldSourceId);
    const sourceId = maps.character_source_instances.get(oldSourceId);
    if (source === undefined || newUuid === undefined || sourceId === undefined) {
      throw new BackupValidationError('Character backup slot source is missing.');
    }
    maps.spell_selection_slots.set(
      Number(row.id),
      insertPortableRow(db, 'spell_selection_slots', row, {
        character_id: characterId,
        source_instance_id: sourceId,
        slot_key: remappedSlotKey(
          row.slot_key,
          source.instance_uuid,
          newUuid,
        ),
        fixed_spell_version_id: resolvedId(
          references,
          'spell_versions',
          row.fixed_spell_version_id,
        ),
        current_spell_version_id: resolvedId(
          references,
          'spell_versions',
          row.current_spell_version_id,
        ),
      }),
    );
  }

  for (const row of document.tables.wizard_spellbook_entries) {
    maps.wizard_spellbook_entries.set(
      Number(row.id),
      insertPortableRow(db, 'wizard_spellbook_entries', row, {
        character_id: characterId,
        spell_version_id: resolvedId(
          references,
          'spell_versions',
          row.spell_version_id,
        ),
      }),
    );
  }
  for (const row of document.tables.character_spell_preferences) {
    insertPortableRow(db, 'character_spell_preferences', row, {
      character_id: characterId,
      spell_version_id: resolvedId(
        references,
        'spell_versions',
        row.spell_version_id,
      ),
    });
  }
  for (const row of document.tables.character_rule_overrides) {
    insertPortableRow(db, 'character_rule_overrides', row, {
      character_id: characterId,
    });
  }
  for (const row of document.tables.warning_acknowledgements) {
    maps.warning_acknowledgements.set(
      Number(row.id),
      insertPortableRow(db, 'warning_acknowledgements', row, {
        character_id: characterId,
      }),
    );
  }
  // No reference to resolve and no foreign key but `character_id`: a weapon
  // holds no template id by D1b, so the row travels exactly as written. The id
  // map is still kept, because a save-point snapshot in the same document
  // refers to these rows by their OLD ids.
  for (const row of document.tables.character_weapons) {
    maps.character_weapons.set(
      Number(row.id),
      insertPortableRow(db, 'character_weapons', row, {
        character_id: characterId,
      }),
    );
  }
  // The character's origin: values only, no template id by D1b, so these rows
  // travel exactly as written like `character_weapons` above. Their id maps are
  // kept for the same reason — a save point in the same document names these
  // rows by their OLD ids.
  for (const row of document.tables.character_species) {
    maps.character_species.set(
      Number(row.id),
      insertPortableRow(db, 'character_species', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.character_species_traits) {
    maps.character_species_traits.set(
      Number(row.id),
      insertPortableRow(db, 'character_species_traits', row, {
        character_id: characterId,
      }),
    );
  }
  // The four stored sheet inputs, on the same terms as the two groups above:
  // by D1b none holds a template id, and `character_hit_point_rolls` holds no
  // class-level id either, so every row travels exactly as written and only
  // `character_id` is rewritten. The id maps are still kept, because a save
  // point in the same document names these rows by their OLD ids.
  for (const row of document.tables.character_background) {
    maps.character_background.set(
      Number(row.id),
      insertPortableRow(db, 'character_background', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.character_armor) {
    maps.character_armor.set(
      Number(row.id),
      insertPortableRow(db, 'character_armor', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.character_hit_point_rolls) {
    maps.character_hit_point_rolls.set(
      Number(row.id),
      insertPortableRow(db, 'character_hit_point_rolls', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.character_skill_proficiencies) {
    maps.character_skill_proficiencies.set(
      Number(row.id),
      insertPortableRow(db, 'character_skill_proficiencies', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.character_sheet_adjustments) {
    maps.character_sheet_adjustments.set(
      Number(row.id),
      insertPortableRow(db, 'character_sheet_adjustments', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.spell_loadouts) {
    maps.spell_loadouts.set(
      Number(row.id),
      insertPortableRow(db, 'spell_loadouts', row, {
        character_id: characterId,
      }),
    );
  }
  for (const row of document.tables.spell_loadout_entries) {
    insertPortableRow(db, 'spell_loadout_entries', row, {
      spell_loadout_id: maps.spell_loadouts.get(Number(row.spell_loadout_id)),
      spell_version_id: resolvedId(
        references,
        'spell_versions',
        row.spell_version_id,
      ),
    });
  }
  return maps;
}

type SnapshotTable = (typeof CHARACTER_STATE_TABLES)[number];

function reserveSnapshotId(
  map: Map<number, number>,
  oldId: unknown,
  next: { value: number },
): number {
  const sourceId = positiveInteger(oldId, 'Snapshot row id');
  const existing = map.get(sourceId);
  if (existing !== undefined) {
    return existing;
  }
  const allocated = next.value++;
  map.set(sourceId, allocated);
  return allocated;
}

function updateSequence(
  db: DatabaseContext,
  table: SnapshotTable,
  reservedThrough: number,
): void {
  const current = db.scalar<number>(
    'SELECT seq FROM sqlite_sequence WHERE name = ?',
    [table],
  );
  if (current === null) {
    db.exec('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', [
      table,
      reservedThrough,
    ]);
  } else if (Number(current) < reservedThrough) {
    db.exec('UPDATE sqlite_sequence SET seq = ? WHERE name = ?', [
      reservedThrough,
      table,
    ]);
  }
}

function portableSnapshots(
  db: DatabaseContext,
  snapshots: readonly CharacterSnapshotData[],
  characterId: number,
  references: ResolvedReferences,
  current: CurrentImportMaps,
): string[] {
  const ids: Record<SnapshotTable, Map<number, number>> = {
    character_class_levels: new Map(current.character_class_levels),
    character_source_instances: new Map(
      current.character_source_instances,
    ),
    spell_selection_slots: new Map(current.spell_selection_slots),
    wizard_spellbook_entries: new Map(current.wizard_spellbook_entries),
    warning_acknowledgements: new Map(current.warning_acknowledgements),
    character_weapons: new Map(current.character_weapons),
    character_species: new Map(current.character_species),
    character_species_traits: new Map(current.character_species_traits),
    character_background: new Map(current.character_background),
    character_armor: new Map(current.character_armor),
    character_hit_point_rolls: new Map(current.character_hit_point_rolls),
    character_skill_proficiencies: new Map(
      current.character_skill_proficiencies,
    ),
    character_sheet_adjustments: new Map(current.character_sheet_adjustments),
  };
  const next = Object.fromEntries(
    CHARACTER_STATE_TABLES.map((table) => [
      table,
      {
        value:
          Number(db.scalar(`SELECT coalesce(max(id), 0) FROM ${quoted(table)}`)) +
          1,
      },
    ]),
  ) as Record<SnapshotTable, { value: number }>;
  const sourceUuids = new Map(current.sourceUuids);
  const sourceRows = new Map(current.sourceRows);

  const transformed = snapshots.map((snapshot) => {
    const rowsOf = (table: SnapshotTable): readonly BackupRow[] =>
      snapshot.rows[table] ?? [];
    const orderedSources = topologicalSources(
      rowsOf('character_source_instances'),
    );
    for (const row of orderedSources) {
      const oldId = Number(row.id);
      reserveSnapshotId(
        ids.character_source_instances,
        oldId,
        next.character_source_instances,
      );
      if (!sourceUuids.has(oldId)) {
        sourceUuids.set(oldId, crypto.randomUUID());
      }
      sourceRows.set(oldId, row);
    }
    // Sources are reserved above, in topological order; everything else the
    // snapshot's own version says it carries is reserved here.
    for (const table of snapshot.tables) {
      if (table === 'character_source_instances') {
        continue;
      }
      for (const row of rowsOf(table)) {
        reserveSnapshotId(ids[table], row.id, next[table]);
      }
    }

    const sources = orderedSources.map((row) => {
      const oldId = Number(row.id);
      const sourceType = String(row.source_type);
      return {
        ...row,
        id: ids.character_source_instances.get(oldId),
        character_id: characterId,
        instance_uuid: sourceUuids.get(oldId),
        parent_source_instance_id:
          row.parent_source_instance_id === null
            ? null
            : ids.character_source_instances.get(
                Number(row.parent_source_instance_id),
              ),
        source_definition_id: resolvedId(
          references,
          sourceReferenceKind(sourceType),
          row.source_definition_id,
        ),
      };
    });
    const slots = rowsOf('spell_selection_slots').map((row) => {
      const oldSourceId = Number(row.source_instance_id);
      const source = sourceRows.get(oldSourceId);
      const uuid = sourceUuids.get(oldSourceId);
      if (source === undefined || uuid === undefined) {
        throw new BackupValidationError(
          'Character backup save point slot source is missing.',
        );
      }
      return {
        ...row,
        id: ids.spell_selection_slots.get(Number(row.id)),
        character_id: characterId,
        source_instance_id:
          ids.character_source_instances.get(oldSourceId),
        slot_key: remappedSlotKey(
          row.slot_key,
          source.instance_uuid,
          uuid,
        ),
        fixed_spell_version_id: resolvedId(
          references,
          'spell_versions',
          row.fixed_spell_version_id,
        ),
        current_spell_version_id: resolvedId(
          references,
          'spell_versions',
          row.current_spell_version_id,
        ),
      };
    });
    /**
     * RETURNS `unknown[]`, NOT `unknown`, AND THAT IS THE EXHAUSTIVENESS GATE.
     *
     * Written as `=> unknown` a missing `case` fell through to an implicit
     * `undefined` that the caller happily stored, and the failure surfaced far
     * away as `Snapshot table <name> must be a list` on the next restore. With
     * an array return type a missing branch is a compile error at the arrow,
     * which is where the omission actually is.
     */
    const rewrite = (table: SnapshotTable): unknown[] => {
      switch (table) {
        case 'character_source_instances':
          return sources;
        case 'spell_selection_slots':
          return slots;
        case 'character_class_levels':
          return rowsOf(table).map((row) => ({
            ...row,
            id: ids.character_class_levels.get(Number(row.id)),
            character_id: characterId,
            class_definition_id: resolvedId(
              references,
              'class_definitions',
              row.class_definition_id,
            ),
            subclass_definition_id: resolvedId(
              references,
              'subclass_definitions',
              row.subclass_definition_id,
            ),
          }));
        case 'wizard_spellbook_entries':
          return rowsOf(table).map((row) => ({
            ...row,
            id: ids.wizard_spellbook_entries.get(Number(row.id)),
            character_id: characterId,
            spell_version_id: resolvedId(
              references,
              'spell_versions',
              row.spell_version_id,
            ),
          }));
        // Only id and ownership are rewritten: a weapon references nothing in
        // the catalog, so there is no content key to resolve.
        case 'warning_acknowledgements':
        case 'character_weapons':
        // The origin tables join this group rather than getting their own: by
        // D1b they hold no template id, so like a weapon there is nothing in
        // the catalog to resolve and only id and ownership are rewritten.
        case 'character_species':
        case 'character_species_traits':
        case 'character_background':
        // And the four sheet inputs, for the third time on the same terms:
        // nothing in the catalog to resolve, no class-level id to remap, so
        // only id and ownership are rewritten.
        case 'character_armor':
        case 'character_hit_point_rolls':
        case 'character_skill_proficiencies':
        case 'character_sheet_adjustments':
          return rowsOf(table).map((row) => ({
            ...row,
            id: ids[table].get(Number(row.id)),
            character_id: characterId,
          }));
      }
    };
    // THE VERSION AND THE KEY SET ARE THE SNAPSHOT'S OWN, NOT THIS BUILD'S.
    //
    // Re-emitting an `a7-v1` save point as `a7-v2` would mean adding a
    // `character_weapons: []` key, which asserts the character had no weapons at
    // that moment. Nobody knows that; the snapshot simply predates the question.
    // So an old save point survives a round trip as an old save point.
    const rewritten: Record<string, unknown> = {
      schema_version: snapshot.schema_version,
      character: snapshot.character,
    };
    for (const table of snapshot.tables) {
      rewritten[table] = rewrite(table);
    }
    return JSON.stringify(rewritten);
  });

  for (const table of CHARACTER_STATE_TABLES) {
    updateSequence(db, table, next[table].value - 1);
  }
  return transformed;
}

export function importCharacterBackup(
  db: DatabaseContext,
  input: unknown,
): CharacterImportResult {
  const validated = validateDocument(input);
  const references = resolveReferences(db, validated.referenceMaps);

  return db.transaction((transaction) => {
    const characterId = insertPortableRow(
      transaction,
      'characters',
      validated.document.character,
      {},
    );
    const current = importCurrentTables(
      transaction,
      validated.document,
      characterId,
      references,
    );
    const snapshots = portableSnapshots(
      transaction,
      validated.snapshots,
      characterId,
      references,
      current,
    );
    for (const [index, row] of validated.document.tables.character_save_points.entries()) {
      insertPortableRow(transaction, 'character_save_points', row, {
        character_id: characterId,
        snapshot: snapshots[index],
      });
    }
    return { characterId };
  });
}
