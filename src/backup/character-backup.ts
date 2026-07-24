import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import {
  CHARACTER_SNAPSHOT_SCHEMA_VERSION,
  CHARACTER_STATE_COLUMNS,
  CHARACTER_STATE_TABLES,
} from '../character/character-state';
import type { DatabaseContext } from '../db/database';
import type { SqlRow } from '../db/codecs';
import {
  assertBackupHeader,
  assertExactKeys,
  backupRecord,
  BackupValidationError,
  CHARACTER_BACKUP_FORMAT,
  CHARACTER_BACKUP_VERSION,
} from './backup-version';

type BackupRow = Readonly<Record<string, unknown>>;
type MutableRow = Record<string, unknown>;

const directCharacterTables = [
  'character_class_levels',
  'character_source_instances',
  'spell_selection_slots',
  'wizard_spellbook_entries',
  'character_spell_preferences',
  'character_rule_overrides',
  'warning_acknowledgements',
  'character_save_points',
  'spell_loadouts',
] as const;

const backupTableNames = [
  ...directCharacterTables,
  'spell_loadout_entries',
] as const;

type BackupTableName = (typeof backupTableNames)[number];

const referenceKinds = [
  'class_definitions',
  'subclass_definitions',
  'feat_definitions',
  'species_definitions',
  'background_definitions',
  'spell_versions',
] as const;

type ReferenceKind = (typeof referenceKinds)[number];

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

interface CharacterSnapshotData {
  readonly schema_version: typeof CHARACTER_SNAPSHOT_SCHEMA_VERSION;
  readonly character: BackupRow;
  readonly character_class_levels: readonly BackupRow[];
  readonly character_source_instances: readonly BackupRow[];
  readonly spell_selection_slots: readonly BackupRow[];
  readonly wizard_spellbook_entries: readonly BackupRow[];
  readonly warning_acknowledgements: readonly BackupRow[];
}

type ResolvedReferences = Readonly<Record<ReferenceKind, Map<number, number>>>;

const sourceReferenceKinds: Readonly<Record<string, ReferenceKind>> = {
  class: 'class_definitions',
  subclass: 'subclass_definitions',
  feat: 'feat_definitions',
  species: 'species_definitions',
  background: 'background_definitions',
};

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

function uniqueRowIds(rows: readonly BackupRow[], label: string): Set<number> {
  const ids = new Set<number>();
  for (const [index, row] of rows.entries()) {
    const id = positiveInteger(row.id, `${label}[${index}].id`);
    if (ids.has(id)) {
      throw new BackupValidationError(`${label} contains duplicate id ${id}.`);
    }
    ids.add(id);
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
  assertExactKeys(
    snapshot,
    ['schema_version', 'character', ...CHARACTER_STATE_TABLES],
    label,
  );
  if (snapshot.schema_version !== CHARACTER_SNAPSHOT_SCHEMA_VERSION) {
    throw new BackupValidationError(
      `${label} uses an unsupported character snapshot schema.`,
    );
  }
  const character = backupRecord(snapshot.character, `${label}.character`);
  for (const column of CHARACTER_STATE_COLUMNS) {
    if (!Object.hasOwn(character, column)) {
      throw new BackupValidationError(
        `${label}.character is missing ${column}.`,
      );
    }
  }
  return {
    schema_version: CHARACTER_SNAPSHOT_SCHEMA_VERSION,
    character,
    character_class_levels: rowList(
      snapshot.character_class_levels,
      `${label}.character_class_levels`,
    ),
    character_source_instances: rowList(
      snapshot.character_source_instances,
      `${label}.character_source_instances`,
    ),
    spell_selection_slots: rowList(
      snapshot.spell_selection_slots,
      `${label}.spell_selection_slots`,
    ),
    wizard_spellbook_entries: rowList(
      snapshot.wizard_spellbook_entries,
      `${label}.wizard_spellbook_entries`,
    ),
    warning_acknowledgements: rowList(
      snapshot.warning_acknowledgements,
      `${label}.warning_acknowledgements`,
    ),
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

function validateCharacterRows(
  tables: Pick<
    CharacterBackupTables,
    | 'character_class_levels'
    | 'character_source_instances'
    | 'spell_selection_slots'
    | 'wizard_spellbook_entries'
    | 'warning_acknowledgements'
  >,
  characterId: number,
  maps: Readonly<Record<ReferenceKind, Map<number, string>>>,
  label: string,
): void {
  for (const table of CHARACTER_STATE_TABLES) {
    assertOwnedRows(tables[table], characterId, `${label}.${table}`);
    uniqueRowIds(tables[table], `${label}.${table}`);
  }

  for (const [index, row] of tables.character_class_levels.entries()) {
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

  const sourceIds = uniqueRowIds(
    tables.character_source_instances,
    `${label}.character_source_instances`,
  );
  const instanceUuids = new Set<string>();
  for (const [index, row] of tables.character_source_instances.entries()) {
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

  for (const [index, row] of tables.spell_selection_slots.entries()) {
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
    if (
      row.fixed_spell_version_id !== null &&
      row.current_spell_version_id !== null
    ) {
      throw new BackupValidationError(
        `${label}.spell_selection_slots[${index}] contains both a fixed and selected spell.`,
      );
    }
  }

  for (const [index, row] of tables.wizard_spellbook_entries.entries()) {
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

  const tableObject = backupRecord(
    document.tables,
    'Character backup tables',
  );
  assertExactKeys(tableObject, backupTableNames, 'Character backup tables');
  const tables = Object.fromEntries(
    backupTableNames.map((table) => [
      table,
      rowList(tableObject[table], `Character backup tables.${table}`),
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
    if (
      row.schema_version !== CHARACTER_SNAPSHOT_SCHEMA_VERSION
    ) {
      throw new BackupValidationError(
        `Character backup tables.character_save_points[${index}] uses an unsupported schema_version.`,
      );
    }
    const snapshot = parseSnapshot(
      row.snapshot,
      `Character backup tables.character_save_points[${index}].snapshot`,
    );
    validateCharacterRows(
      snapshot,
      characterId,
      referenceMaps,
      `Character backup tables.character_save_points[${index}].snapshot`,
    );
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
  tables: Pick<
    CharacterBackupTables,
    | 'character_class_levels'
    | 'character_source_instances'
    | 'spell_selection_slots'
    | 'wizard_spellbook_entries'
  >,
  ids: Record<ReferenceKind, Set<number>>,
): void {
  for (const row of tables.character_class_levels) {
    addPositiveReference(ids.class_definitions, row.class_definition_id);
    addPositiveReference(ids.subclass_definitions, row.subclass_definition_id);
  }
  for (const row of tables.character_source_instances) {
    if (typeof row.source_type === 'string') {
      const kind = sourceReferenceKinds[row.source_type];
      if (kind !== undefined) {
        addPositiveReference(ids[kind], row.source_definition_id);
      }
    }
  }
  for (const row of tables.spell_selection_slots) {
    addPositiveReference(ids.spell_versions, row.fixed_spell_version_id);
    addPositiveReference(ids.spell_versions, row.current_spell_version_id);
  }
  for (const row of tables.wizard_spellbook_entries) {
    addPositiveReference(ids.spell_versions, row.spell_version_id);
  }
}

function selectCharacterRows(
  db: DatabaseContext,
  table: string,
  characterId: number,
): SqlRow[] {
  return db.all(
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
  const character = db.one(
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
      : db.all(
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
  for (const [index, savePoint] of allTables.character_save_points.entries()) {
    const snapshot = parseSnapshot(
      savePoint.snapshot,
      `Stored save point ${index + 1}`,
    );
    collectReferences(snapshot, referenceIds);
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
    for (const row of snapshot.character_source_instances) {
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
    for (const table of [
      'character_class_levels',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'warning_acknowledgements',
    ] as const) {
      for (const row of snapshot[table]) {
        reserveSnapshotId(ids[table], row.id, next[table]);
      }
    }

    const sources = snapshot.character_source_instances.map((row) => {
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
    const slots = snapshot.spell_selection_slots.map((row) => {
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
    return JSON.stringify({
      schema_version: CHARACTER_SNAPSHOT_SCHEMA_VERSION,
      character: snapshot.character,
      character_class_levels: snapshot.character_class_levels.map((row) => ({
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
      })),
      character_source_instances: sources,
      spell_selection_slots: slots,
      wizard_spellbook_entries: snapshot.wizard_spellbook_entries.map(
        (row) => ({
          ...row,
          id: ids.wizard_spellbook_entries.get(Number(row.id)),
          character_id: characterId,
          spell_version_id: resolvedId(
            references,
            'spell_versions',
            row.spell_version_id,
          ),
        }),
      ),
      warning_acknowledgements: snapshot.warning_acknowledgements.map(
        (row) => ({
          ...row,
          id: ids.warning_acknowledgements.get(Number(row.id)),
          character_id: characterId,
        }),
      ),
    });
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
