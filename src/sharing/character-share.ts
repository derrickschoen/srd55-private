import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import { normalizeCatalogName } from '../catalog/catalog-normalize';
import { assertSourceRepeatable } from '../commands/add-source';
import type { DatabaseContext } from '../db/database';
import type { AddableSourceType } from '../domain/enums';
import {
  SHARE_TABLES,
  SOURCE_DEFINITION_TABLE,
  type AnyTableName,
} from '../domain/contracts/tables';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import { SpellSelectionEligibility } from '../eligibility/spell-selection-eligibility';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  SHARE_WEAPON_FLAGS,
  SHARE_WEAPON_TEXT,
  ShareValidationError,
  type CharacterShareDocument,
  type ShareClass,
  type ShareSource,
  type ShareWeapon,
  validateShareDocument,
} from './schema';
import {
  missingClassIssue,
  missingSourceIssue,
  missingSubclassIssue,
  notRepeatableIssue,
  selectionSlotIssue,
  ShareImportCompatibilityError,
  subclassMismatchIssue,
  type ShareImportIssue,
} from './import-issues';

export interface ShareExportOptions {
  readonly acknowledgements?: boolean;
  readonly loadouts?: boolean;
}

export interface ShareImportResult {
  readonly characterId: number;
}

export interface SharePreview {
  readonly name: string;
  readonly classes: readonly {
    readonly classKey: string;
    readonly subclassKey?: string;
    readonly level: number;
  }[];
  readonly sourceCount: number;
  readonly selectionCount: number;
  readonly spellbookCount: number;
  readonly placeholderCount: number;
  /**
   * Counted like every other section, so an import that is about to add nine
   * weapons says so before it happens. A silently-arriving section is exactly
   * the failure the weapons gap was closed to avoid; a silently-MISSING one is
   * the same failure in the other direction.
   */
  readonly weaponCount: number;
  readonly includesAcknowledgements: boolean;
  readonly includesLoadouts: boolean;
}

type Row = Readonly<Record<string, unknown>>;

/**
 * Kept as a MAP, because "which table does `'species'` mean" is a lookup, not
 * a filter — a role-filtered union cannot answer it. What the derivation adds
 * is that the map must be exhaustive over the source-type union and may only
 * name a table the schema declares with the `catalog_source` role. It was an
 * unconstrained `Record<..., string>` before.
 *
 * `satisfies` rather than a type annotation: an annotation of
 * `Record<ShareSource['type'], string>` performs the exhaustiveness check and
 * then WIDENS the values back to `string`, throwing away the narrowing
 * `SOURCE_DEFINITION_TABLE` established. This keeps both.
 */
const SOURCE_TABLES = SOURCE_DEFINITION_TABLE satisfies Readonly<
  Record<ShareSource['type'], AnyTableName>
>;

/**
 * THE SHARE PAYLOAD'S TABLE NAMES COME FROM THE CLASSIFICATION.
 *
 * Every table name in this module's SQL is interpolated from `SHARE_TABLES`
 * (character-owned rows) or `SOURCE_TABLES` (catalog lookups) — none is a bare
 * literal. That is what makes `TableScopes.share` a contract rather than a
 * comment: marking a table `share: true` without handling it here does not
 * compile, and naming a table here that is not share-scoped does not compile
 * either.
 *
 * The catalog tables this module reads (`spell_versions`, `spell_identities`,
 * `class_definitions`, `subclass_definitions`) are NOT share-scoped and are
 * deliberately not routed through `SHARE_TABLES`: they are the recipient's own
 * catalog, resolved by content key, not rows that travel with the character.
 */

function timestamp(): string {
  return new Date().toISOString();
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || value === '') {
    return {};
  }
  const decoded: unknown =
    typeof value === 'string' ? JSON.parse(value) : value;
  if (
    decoded === null ||
    typeof decoded !== 'object' ||
    Array.isArray(decoded)
  ) {
    throw new Error('Source config must be an object.');
  }
  return { ...(decoded as Record<string, unknown>) };
}

function portableConfigValue(
  db: DatabaseContext,
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => portableConfigValue(db, item));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'spell_version_id') {
      result.spell_version_key = contentKey(db, 'spell_versions', item);
    } else {
      result[key] = portableConfigValue(db, item);
    }
  }
  return result;
}

function userConfig(
  db: DatabaseContext,
  value: unknown,
): Record<string, unknown> | undefined {
  const config = jsonRecord(value);
  if (Object.keys(config).length === 0) {
    return undefined;
  }
  return portableConfigValue(db, config) as Record<string, unknown>;
}

function optionalDefault<T>(
  value: T,
  defaultValue: T,
): T | undefined {
  return Object.is(value, defaultValue) ? undefined : value;
}

function contentKey(
  db: DatabaseContext,
  table: string,
  id: unknown,
): string {
  const key = db.scalar<string>(
    `SELECT content_key FROM ${table} WHERE id = ?`,
    [Number(id)],
  );
  if (key === null) {
    throw new Error(`Missing ${table} reference ${String(id)}.`);
  }
  return String(key);
}

/**
 * One stored weapon row, projected onto the share document's weapon.
 *
 * `null` becomes ABSENT rather than an empty string, and a `0` flag becomes
 * absent rather than `false`. Both directions round-trip back to the column's
 * own null/0, so a half-entered weapon stays half-entered (D6b) instead of being
 * silently completed with placeholder values.
 */
function shareWeaponFromRow(row: Row): ShareWeapon {
  const weapon: Record<string, unknown> = { name: String(row.name) };
  for (const field of SHARE_WEAPON_TEXT) {
    if (row[field] !== null && row[field] !== undefined) {
      weapon[field] = String(row[field]);
    }
  }
  for (const field of ['range_normal_feet', 'range_long_feet'] as const) {
    if (row[field] !== null && row[field] !== undefined) {
      weapon[field] = Number(row[field]);
    }
  }
  if (row.mastery_property !== null && row.mastery_property !== undefined) {
    weapon.mastery_property = String(row.mastery_property);
  }
  for (const field of ['other_properties', 'notes'] as const) {
    if (row[field] !== null && row[field] !== undefined) {
      weapon[field] = String(row[field]);
    }
  }
  for (const flag of SHARE_WEAPON_FLAGS) {
    if (Number(row[flag]) === 1) {
      weapon[flag] = true;
    }
  }
  return weapon as unknown as ShareWeapon;
}

function sourceOwners(
  rows: readonly Row[],
  directOwners: ReadonlyMap<number, number>,
): Map<number, number> {
  const owners = new Map(directOwners);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      const id = Number(row.id);
      const parent = Number(row.parent_source_instance_id);
      if (
        !owners.has(id) &&
        Number.isSafeInteger(parent) &&
        owners.has(parent)
      ) {
        owners.set(id, owners.get(parent) as number);
        changed = true;
      }
    }
  }
  return owners;
}

function spellRows(
  db: DatabaseContext,
  characterId: number,
): Map<number, Row> {
  const rows = db.all<Row>(
    `SELECT DISTINCT version.id, version.content_key, version.display_name,
            version.provenance
     FROM spell_versions AS version
     WHERE version.id IN (
       SELECT current_spell_version_id
       FROM ${SHARE_TABLES.spell_selection_slots}
       WHERE character_id = ? AND current_spell_version_id IS NOT NULL
       UNION
       SELECT spell_version_id FROM ${SHARE_TABLES.wizard_spellbook_entries}
       WHERE character_id = ?
       UNION
       SELECT spell_version_id FROM ${SHARE_TABLES.character_spell_preferences}
       WHERE character_id = ?
       UNION
       SELECT entry.spell_version_id
       FROM ${SHARE_TABLES.spell_loadout_entries} AS entry
       INNER JOIN ${SHARE_TABLES.spell_loadouts} AS loadout
         ON loadout.id = entry.spell_loadout_id
       WHERE loadout.character_id = ?
     )`,
    [characterId, characterId, characterId, characterId],
  );
  return new Map(rows.map((row) => [Number(row.id), row]));
}

export function exportCharacterShare(
  db: DatabaseContext,
  characterId: number,
  options: ShareExportOptions = {},
): CharacterShareDocument {
  const character = db.one<Row>(
    'SELECT * FROM characters WHERE id = ?',
    [characterId],
  );
  if (character === null) {
    throw new Error(`Character ${characterId} does not exist.`);
  }
  const allSources = db.all<Row>(
    `SELECT * FROM ${SHARE_TABLES.character_source_instances}
     WHERE character_id = ? AND state = 'active'
     ORDER BY acquired_at_character_level, id`,
    [characterId],
  );
  const classLevels = db.all<Row>(
    `SELECT level.*, source.id AS source_instance_id,
            source.config AS source_config,
            source.acquired_at_character_level
     FROM ${SHARE_TABLES.character_class_levels} AS level
     INNER JOIN ${SHARE_TABLES.character_source_instances} AS source
       ON source.character_id = level.character_id
      AND source.source_type = 'class'
      AND source.source_definition_id = level.class_definition_id
      AND source.state = 'active'
     WHERE level.character_id = ?
     ORDER BY source.acquired_at_character_level, level.id`,
    [characterId],
  );

  let nextId = 0;
  const directOwners = new Map<number, number>();
  const classes = classLevels.map((row): ShareClass => {
    const id = nextId++;
    directOwners.set(Number(row.source_instance_id), id);
    const subclassSource =
      row.subclass_definition_id === null
        ? undefined
        : allSources.find(
            (source) =>
              source.source_type === 'subclass' &&
              Number(source.source_definition_id) ===
                Number(row.subclass_definition_id),
          );
    if (subclassSource !== undefined) {
      directOwners.set(Number(subclassSource.id), id);
    }
    const config = userConfig(db, row.source_config);
    const subclassConfig =
      subclassSource === undefined
        ? undefined
        : userConfig(db, subclassSource.config);
    const ability =
      row.spellcasting_ability_override === null
        ? undefined
        : String(row.spellcasting_ability_override);
    return {
      id,
      classKey: contentKey(
        db,
        'class_definitions',
        row.class_definition_id,
      ),
      ...(row.subclass_definition_id === null
        ? {}
        : {
            subclassKey: contentKey(
              db,
              'subclass_definitions',
              row.subclass_definition_id,
            ),
          }),
      level: Number(row.level),
      start: Number(row.acquired_at_character_level),
      ...(ability === undefined ? {} : { ability }),
      ...(config === undefined ? {} : { config }),
      ...(subclassConfig === undefined ? {} : { subclassConfig }),
    };
  });

  const explicitSourceRows = allSources.filter(
    (row) =>
      row.parent_source_instance_id === null &&
      (row.source_type === 'feat' ||
        row.source_type === 'species' ||
        row.source_type === 'background'),
  );
  const sources = explicitSourceRows.map((row): ShareSource => {
    const id = nextId++;
    directOwners.set(Number(row.id), id);
    const type = String(row.source_type) as ShareSource['type'];
    const config = userConfig(db, row.config);
    return {
      id,
      type,
      key: contentKey(db, SOURCE_TABLES[type], row.source_definition_id),
      ...(String(row.display_name) ===
      String(
        db.scalar(
          `SELECT name FROM ${SOURCE_TABLES[type]} WHERE id = ?`,
          [Number(row.source_definition_id)],
        ),
      )
        ? {}
        : { name: String(row.display_name) }),
      ...(config === undefined ? {} : { config }),
      acquired: Number(row.acquired_at_character_level),
    };
  });
  const owners = sourceOwners(allSources, directOwners);
  const versions = spellRows(db, characterId);

  const selections = db
    .all<Row>(
      `SELECT * FROM ${SHARE_TABLES.spell_selection_slots}
       WHERE character_id = ? AND current_spell_version_id IS NOT NULL
         AND state IN ('active', 'kept_override')
       ORDER BY source_instance_id, rule_key, ordinal, id`,
      [characterId],
    )
    .flatMap((row) => {
      const ref = owners.get(Number(row.source_instance_id));
      if (ref === undefined) {
        return [];
      }
      const version = versions.get(Number(row.current_spell_version_id));
      if (version === undefined) {
        throw new Error('A selected spell version does not exist.');
      }
      return [
        {
          ref,
          ruleKey: String(row.rule_key),
          ordinal: Number(row.ordinal),
          spellKey: String(version.content_key),
          ...(version.provenance === 'placeholder'
            ? { spellName: String(version.display_name) }
            : {}),
          ...(row.state === 'kept_override'
            ? { keep: true as const }
            : {}),
        },
      ];
    });

  const spellbook = db.all<Row>(
    `SELECT version.content_key
     FROM ${SHARE_TABLES.wizard_spellbook_entries} AS entry
     INNER JOIN spell_versions AS version
       ON version.id = entry.spell_version_id
     WHERE entry.character_id = ?
     ORDER BY version.content_key`,
    [characterId],
  ).map((row) => String(row.content_key));
  const preferences = db.all<Row>(
    `SELECT version.content_key, preference.favourite
     FROM ${SHARE_TABLES.character_spell_preferences} AS preference
     INNER JOIN spell_versions AS version
       ON version.id = preference.spell_version_id
     WHERE preference.character_id = ?
     ORDER BY version.content_key`,
    [characterId],
  ).map((row) => ({
    spellKey: String(row.content_key),
    favourite: Number(row.favourite) === 1,
  }));
  const overrides = db.all<Row>(
    `SELECT rule_key, value
     FROM ${SHARE_TABLES.character_rule_overrides}
     WHERE character_id = ?
     ORDER BY rule_key`,
    [characterId],
  ).map((row) => {
    let value: unknown;
    try {
      value = JSON.parse(String(row.value));
    } catch {
      value = String(row.value);
    }
    return { ruleKey: String(row.rule_key), value };
  });

  const acknowledgements =
    options.acknowledgements === true
      ? db.all<Row>(
          `SELECT warning_fingerprint
           FROM ${SHARE_TABLES.warning_acknowledgements}
           WHERE character_id = ? AND invalidated_at IS NULL
           ORDER BY warning_fingerprint`,
          [characterId],
        ).map((row) => ({ warning: String(row.warning_fingerprint) }))
      : undefined;
  const loadouts =
    options.loadouts === true
      ? db.all<Row>(
          `SELECT id, name FROM ${SHARE_TABLES.spell_loadouts}
           WHERE character_id = ? ORDER BY id`,
          [characterId],
        ).map((loadout) => ({
          name: String(loadout.name),
          entries: db.all<Row>(
            `SELECT version.content_key, entry.role
             FROM ${SHARE_TABLES.spell_loadout_entries} AS entry
             INNER JOIN spell_versions AS version
               ON version.id = entry.spell_version_id
             WHERE entry.spell_loadout_id = ?
             ORDER BY entry.id`,
            [Number(loadout.id)],
          ).map((entry) => ({
            spellKey: String(entry.content_key),
            role: String(entry.role),
          })),
        }))
      : undefined;
  // Not behind an option flag. `acknowledgements` and `loadouts` are opt-in
  // because they are working state the recipient may not want; a weapon is part
  // of the build being shared, like the class levels and the spellbook.
  const weapons = db.all<Row>(
    `SELECT * FROM ${SHARE_TABLES.character_weapons}
     WHERE character_id = ? ORDER BY id`,
    [characterId],
  ).map(shareWeaponFromRow);
  const sharedSpellKeys = new Set([
    ...selections.map((selection) => selection.spellKey),
    ...spellbook,
    ...preferences.map((preference) => preference.spellKey),
    ...(loadouts ?? []).flatMap((loadout) =>
      loadout.entries.map((entry) => entry.spellKey),
    ),
  ]);
  const placeholders = [...versions.values()]
    .filter(
      (version) =>
        version.provenance === 'placeholder' &&
        sharedSpellKeys.has(String(version.content_key)),
    )
    .map((version) => ({
      spellKey: String(version.content_key),
      spellName: String(version.display_name),
    }))
    .sort((left, right) => left.spellKey.localeCompare(right.spellKey));
  const document: CharacterShareDocument = {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: {
      name: String(character.name),
      ...(optionalDefault(Number(character.strength), 10) === undefined
        ? {}
        : { strength: Number(character.strength) }),
      ...(optionalDefault(Number(character.dexterity), 10) === undefined
        ? {}
        : { dexterity: Number(character.dexterity) }),
      ...(optionalDefault(Number(character.constitution), 10) === undefined
        ? {}
        : { constitution: Number(character.constitution) }),
      ...(optionalDefault(Number(character.intelligence), 10) === undefined
        ? {}
        : { intelligence: Number(character.intelligence) }),
      ...(optionalDefault(Number(character.wisdom), 10) === undefined
        ? {}
        : { wisdom: Number(character.wisdom) }),
      ...(optionalDefault(Number(character.charisma), 10) === undefined
        ? {}
        : { charisma: Number(character.charisma) }),
      ...(character.proficiency_bonus_override === null
        ? {}
        : {
            proficiency_bonus_override: Number(
              character.proficiency_bonus_override,
            ),
          }),
      ...(String(character.rules_edition_preference) === '2024'
        ? {}
        : {
            rules_edition_preference: String(
              character.rules_edition_preference,
            ),
          }),
      ...(Number(character.allow_legacy) === 1
        ? { allow_legacy: true as const }
        : {}),
    },
    classes,
    sources,
    selections,
    spellbook,
    preferences,
    overrides,
    ...(placeholders.length === 0 ? {} : { placeholders }),
    ...(acknowledgements === undefined ? {} : { acknowledgements }),
    ...(loadouts === undefined ? {} : { loadouts }),
    // Omitted when empty, like `placeholders`: a weaponless character's link
    // stays exactly the shape it was before weapons travelled.
    ...(weapons.length === 0 ? {} : { weapons }),
  };
  return validateShareDocument(document);
}

function definition(
  db: DatabaseContext,
  table: string,
  key: string,
): Row {
  const row = db.one<Row>(
    `SELECT * FROM ${table} WHERE content_key = ?`,
    [key],
  );
  if (row === null) {
    throw new ShareValidationError(
      `catalog definition '${key}' is unavailable.`,
    );
  }
  return row;
}

function lookup(
  db: DatabaseContext,
  table: string,
  key: string,
): Row | null {
  return db.one<Row>(
    `SELECT * FROM ${table} WHERE content_key = ?`,
    [key],
  );
}

/**
 * Report every catalog incompatibility that can be detected WITHOUT writing.
 *
 * Runs before the import transaction opens, so it can collect all independent
 * problems instead of surfacing them one failed import at a time. Issues that
 * only emerge once sources have been materialised — a selection whose slot no
 * longer exists — cannot be found here; those are collected inside the
 * transaction and reported the same way.
 *
 * Deliberately does NOT run `validateSourceConfiguration`. That check hardcodes
 * the official Magic Initiate spell lists (`add-source.ts:18`) rather than
 * reading them from the recipient's own definition, and `feat_definitions` has
 * no column that could express an allowed-list set. Enforcing it here would
 * reject a homebrew feat that keeps the official content key even when sender
 * and recipient hold byte-identical definitions. It remains enforced on the
 * authoring path, where the user is building against their own catalog.
 */
export function assessImportCompatibility(
  db: DatabaseContext,
  document: CharacterShareDocument,
): readonly ShareImportIssue[] {
  const issues: ShareImportIssue[] = [];

  for (const item of document.classes) {
    const classRow = lookup(db, 'class_definitions', item.classKey);
    if (classRow === null) {
      issues.push(missingClassIssue(item.classKey));
    }
    if (item.subclassKey === undefined) {
      continue;
    }
    const subclassRow = lookup(
      db,
      'subclass_definitions',
      item.subclassKey,
    );
    if (subclassRow === null) {
      issues.push(missingSubclassIssue(item.subclassKey));
    } else if (
      classRow !== null &&
      Number(subclassRow.class_definition_id) !== Number(classRow.id)
    ) {
      issues.push(
        subclassMismatchIssue(item.subclassKey, item.classKey),
      );
    }
  }

  // Repeatability is genuinely catalog-derived: it reads `repeatable` from the
  // recipient's own definition row, so homebrew that permits repeats imports
  // cleanly. Counting per key here reports one issue per offending source
  // rather than one per duplicate occurrence.
  const sourceCounts = new Map<string, number>();
  for (const item of document.sources) {
    const table = SOURCE_TABLES[item.type];
    const row = lookup(db, table, item.key);
    if (row === null) {
      issues.push(missingSourceIssue(item.type, item.key));
      continue;
    }
    const seen = (sourceCounts.get(item.key) ?? 0) + 1;
    sourceCounts.set(item.key, seen);
    if (seen === 2 && Number(row.repeatable) !== 1) {
      issues.push(
        notRepeatableIssue(item.type, item.key, String(row.name)),
      );
    }
  }

  return issues;
}

function fallbackSpellName(key: string): string {
  const slug = key.split(':').at(-1) ?? 'Unknown spell';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, 120);
}

export function ensureSharedSpell(
  db: DatabaseContext,
  key: string,
  displayName?: string,
): number {
  const existing = db.one<Row>(
    'SELECT id FROM spell_versions WHERE content_key = ?',
    [key],
  );
  if (existing !== null) {
    return Number(existing.id);
  }
  const name = (displayName ?? fallbackSpellName(key)).slice(0, 120);
  const now = timestamp();
  const identityId = db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?)`,
    [
      `placeholder:${key}`,
      name,
      normalizeCatalogName(name),
      now,
      now,
    ],
  ).lastInsertId;
  return db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, ritual, concentration, healing, short_summary,
       requires_mod_for_effect, effect_reliability_category,
       provenance, is_active, created_at, updated_at
     ) VALUES (
       ?, ?, ?, ?, -1, 'Unknown', 0, 0, 0, 'Not imported',
       0, 'fixed_effect', 'placeholder', 0, ?, ?
     )`,
    [key, identityId, name, key.split(':')[0], now, now],
  ).lastInsertId;
}

function insertSource(
  db: DatabaseContext,
  characterId: number,
  sourceType: string,
  definitionRow: Row,
  config: Readonly<Record<string, unknown>>,
  acquired: number,
  displayName: string,
): number {
  const now = timestamp();
  return db.exec(
    `INSERT INTO ${SHARE_TABLES.character_source_instances} (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      characterId,
      crypto.randomUUID(),
      sourceType,
      Number(definitionRow.id),
      displayName,
      JSON.stringify(config),
      acquired,
      now,
      now,
    ],
  ).lastInsertId;
}

function spellNameMap(
  document: CharacterShareDocument,
): Map<string, string> {
  const names = new Map<string, string>();
  for (const selection of document.selections) {
    if (selection.spellName === undefined) {
      continue;
    }
    const current = names.get(selection.spellKey);
    if (current === undefined || selection.spellName < current) {
      names.set(selection.spellKey, selection.spellName);
    }
  }
  for (const placeholder of document.placeholders ?? []) {
    names.set(placeholder.spellKey, placeholder.spellName);
  }
  return names;
}

const PREVIEW_ROLLBACK = new Error('Rollback successful share preview.');

function assertImportableWithoutMutation(
  db: DatabaseContext,
  document: CharacterShareDocument,
): void {
  try {
    db.transaction(() => {
      importCharacterShare(db, document);
      throw PREVIEW_ROLLBACK;
    });
  } catch (error) {
    if (error !== PREVIEW_ROLLBACK) {
      throw error;
    }
  }
}

export function previewCharacterShare(
  db: DatabaseContext,
  input: unknown,
): SharePreview {
  const document = validateShareDocument(input);
  assertImportableWithoutMutation(db, document);
  const keys = new Set([
    ...document.selections.map((row) => row.spellKey),
    ...document.spellbook,
    ...document.preferences.map((row) => row.spellKey),
    ...(document.loadouts ?? []).flatMap((row) =>
      row.entries.map((entry) => entry.spellKey),
    ),
  ]);
  const existing = new Set<string>();
  const allKeys = [...keys];
  for (let offset = 0; offset < allKeys.length; offset += 500) {
    const chunk = allKeys.slice(offset, offset + 500);
    for (const row of db.all<Row>(
      `SELECT content_key FROM spell_versions
       WHERE content_key IN (${chunk.map(() => '?').join(', ')})`,
      chunk,
    )) {
      existing.add(String(row.content_key));
    }
  }
  return {
    name: document.character.name,
    classes: document.classes.map((row) => ({
      classKey: row.classKey,
      ...(row.subclassKey === undefined
        ? {}
        : { subclassKey: row.subclassKey }),
      level: row.level,
    })),
    sourceCount: document.sources.length,
    selectionCount: document.selections.length,
    spellbookCount: document.spellbook.length,
    placeholderCount: allKeys.filter((key) => !existing.has(key)).length,
    weaponCount: document.weapons?.length ?? 0,
    includesAcknowledgements:
      document.acknowledgements !== undefined,
    includesLoadouts: document.loadouts !== undefined,
  };
}

export function importCharacterShare(
  db: DatabaseContext,
  input: unknown,
): ShareImportResult {
  const document = validateShareDocument(input);
  const preflight = assessImportCompatibility(db, document);
  if (preflight.length > 0) {
    throw new ShareImportCompatibilityError(preflight);
  }
  return db.transaction(() => {
    const now = timestamp();
    const c = document.character;
    const characterId = db.exec(
      `INSERT INTO characters (
         name, strength, dexterity, constitution, intelligence, wisdom,
         charisma, proficiency_bonus_override, rules_edition_preference,
         allow_legacy, revision, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        c.name,
        c.strength ?? 10,
        c.dexterity ?? 10,
        c.constitution ?? 10,
        c.intelligence ?? 10,
        c.wisdom ?? 10,
        c.charisma ?? 10,
        c.proficiency_bonus_override ?? null,
        c.rules_edition_preference ?? '2024',
        c.allow_legacy === true ? 1 : 0,
        now,
        now,
      ],
    ).lastInsertId;
    const generator = new GrantRuleSlotGenerator(db);
    const rootsByRef = new Map<number, number[]>();

    for (const item of [...document.classes].sort(
      (left, right) => left.start - right.start || left.id - right.id,
    )) {
      const classRow = definition(
        db,
        'class_definitions',
        item.classKey,
      );
      const subclassRow =
        item.subclassKey === undefined
          ? null
          : definition(db, 'subclass_definitions', item.subclassKey);
      if (
        subclassRow !== null &&
        Number(subclassRow.class_definition_id) !== Number(classRow.id)
      ) {
        throw new ShareValidationError(
          `subclass '${item.subclassKey}' does not belong to '${item.classKey}'.`,
        );
      }
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_class_levels} (
           character_id, class_definition_id, subclass_definition_id,
           level, is_starting_class, spellcasting_ability_override,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          Number(classRow.id),
          subclassRow === null ? null : Number(subclassRow.id),
          item.level,
          item.start === 1 ? 1 : 0,
          item.ability ?? null,
          now,
          now,
        ],
      );
      const classConfig = {
        spellcasting_ability:
          item.ability ?? classRow.spellcasting_ability ?? null,
        ...(item.config ?? {}),
      };
      const classSourceId = insertSource(
        db,
        characterId,
        'class',
        classRow,
        classConfig,
        item.start,
        `${String(classRow.name)} ${item.level}`,
      );
      const roots = [classSourceId];
      generator.generateForSource(classSourceId);
      if (subclassRow !== null) {
        const subclassSourceId = insertSource(
          db,
          characterId,
          'subclass',
          subclassRow,
          {
            spellcasting_ability:
              item.ability ??
              subclassRow.spellcasting_ability ??
              classRow.spellcasting_ability ??
              null,
            ...(item.subclassConfig ?? {}),
          },
          item.level,
          String(subclassRow.name),
        );
        roots.push(subclassSourceId);
        generator.generateForSource(subclassSourceId);
      }
      rootsByRef.set(item.id, roots);
    }

    for (const item of [...document.sources].sort(
      (left, right) =>
        left.acquired - right.acquired || left.id - right.id,
    )) {
      const sourceRow = definition(db, SOURCE_TABLES[item.type], item.key);
      assertSourceRepeatable(
        db,
        characterId,
        item.type as AddableSourceType,
        sourceRow,
      );
      const sourceId = insertSource(
        db,
        characterId,
        item.type,
        sourceRow,
        item.config ?? {},
        item.acquired,
        item.name ?? String(sourceRow.name),
      );
      rootsByRef.set(item.id, [sourceId]);
      generator.generateForSource(sourceId);
    }

    const sources = db.all<Row>(
      `SELECT id, parent_source_instance_id
       FROM ${SHARE_TABLES.character_source_instances} WHERE character_id = ?`,
      [characterId],
    );
    const children = new Map<number, number[]>();
    for (const row of sources) {
      if (row.parent_source_instance_id !== null) {
        const parent = Number(row.parent_source_instance_id);
        children.set(parent, [
          ...(children.get(parent) ?? []),
          Number(row.id),
        ]);
      }
    }
    const descendants = (roots: readonly number[]): Set<number> => {
      const result = new Set(roots);
      const queue = [...roots];
      while (queue.length > 0) {
        for (const child of children.get(queue.shift() as number) ?? []) {
          if (!result.has(child)) {
            result.add(child);
            queue.push(child);
          }
        }
      }
      return result;
    };

    const names = spellNameMap(document);
    const spellIds = new Map<string, number>();
    const resolveSpell = (key: string): number => {
      let id = spellIds.get(key);
      if (id === undefined) {
        id = ensureSharedSpell(db, key, names.get(key));
        spellIds.set(key, id);
      }
      return id;
    };
    const eligibility = new SpellSelectionEligibility(db);
    const selectionIssues: ShareImportIssue[] = [];
    for (const selection of document.selections) {
      const roots = rootsByRef.get(selection.ref);
      if (roots === undefined) {
        throw new ShareValidationError(
          `selection ref ${selection.ref} is unavailable.`,
        );
      }
      const sourceIds = [...descendants(roots)];
      const slots = db.all<Row>(
        `SELECT id FROM ${SHARE_TABLES.spell_selection_slots}
         WHERE character_id = ? AND rule_key = ? AND ordinal = ?
           AND source_instance_id IN (${sourceIds.map(() => '?').join(', ')})
         ORDER BY id`,
        [
          characterId,
          selection.ruleKey,
          selection.ordinal,
          ...sourceIds,
        ],
      );
      if (slots.length !== 1) {
        // Collect rather than throw: a catalog whose grant rules drifted
        // usually breaks several selections at once, and reporting them one
        // failed import at a time is miserable. Assignment below is skipped
        // for this selection; the accumulated issues abort the whole
        // transaction once every selection has been examined.
        selectionIssues.push(
          selectionSlotIssue(
            selection.ruleKey,
            selection.ordinal,
            slots.length,
          ),
        );
        continue;
      }
      const slotId = Number((slots[0] as Row).id);
      db.exec(
        `UPDATE ${SHARE_TABLES.spell_selection_slots}
         SET current_spell_version_id = ?,
             state = ?,
             override_note = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          resolveSpell(selection.spellKey),
          selection.keep === true ? 'kept_override' : 'active',
          selection.keep === true ? 'Imported keep override.' : null,
          now,
          slotId,
        ],
      );
      eligibility.refresh(slotId);
    }

    // Abort before touching the spellbook, preferences, or loadouts. Throwing
    // inside the transaction rolls the whole character back, so a partially
    // placed set of selections is never committed.
    if (selectionIssues.length > 0) {
      throw new ShareImportCompatibilityError(selectionIssues);
    }

    for (const key of document.spellbook) {
      db.exec(
        `INSERT OR IGNORE INTO ${SHARE_TABLES.wizard_spellbook_entries} (
           character_id, spell_version_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [characterId, resolveSpell(key), now, now],
      );
    }
    for (const preference of document.preferences) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_spell_preferences} (
           character_id, spell_version_id, favourite, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          characterId,
          resolveSpell(preference.spellKey),
          preference.favourite ? 1 : 0,
          now,
          now,
        ],
      );
    }
    for (const override of document.overrides) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_rule_overrides} (
           character_id, rule_key, value, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          characterId,
          override.ruleKey,
          JSON.stringify(override.value) as SqlValue,
          now,
          now,
        ],
      );
    }
    for (const acknowledgement of document.acknowledgements ?? []) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.warning_acknowledgements} (
           character_id, warning_fingerprint, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [characterId, acknowledgement.warning, now, now],
      );
    }
    // Weapons resolve nothing against the recipient's catalog — by D1b a
    // character's weapon holds no template id — so the row is written as it
    // arrived, with the absent optional fields taking the column's own
    // NULL / 0 rather than a value this importer invented.
    for (const weapon of document.weapons ?? []) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_weapons} (
           character_id, name, ${SHARE_WEAPON_TEXT.join(', ')},
           range_normal_feet, range_long_feet, mastery_property,
           other_properties, notes, ${SHARE_WEAPON_FLAGS.join(', ')},
           created_at, updated_at
         ) VALUES (?, ?, ${SHARE_WEAPON_TEXT.map(() => '?').join(', ')},
           ?, ?, ?, ?, ?, ${SHARE_WEAPON_FLAGS.map(() => '?').join(', ')},
           ?, ?)`,
        [
          characterId,
          weapon.name,
          ...SHARE_WEAPON_TEXT.map((field) => weapon[field] ?? null),
          weapon.range_normal_feet ?? null,
          weapon.range_long_feet ?? null,
          weapon.mastery_property ?? null,
          weapon.other_properties ?? null,
          weapon.notes ?? null,
          ...SHARE_WEAPON_FLAGS.map((flag) => (weapon[flag] === true ? 1 : 0)),
          now,
          now,
        ],
      );
    }
    for (const loadout of document.loadouts ?? []) {
      const loadoutId = db.exec(
        `INSERT INTO ${SHARE_TABLES.spell_loadouts} (
           character_id, name, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [characterId, loadout.name, now, now],
      ).lastInsertId;
      for (const entry of loadout.entries) {
        db.exec(
          `INSERT INTO ${SHARE_TABLES.spell_loadout_entries} (
             spell_loadout_id, spell_version_id, role,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?)`,
          [
            loadoutId,
            resolveSpell(entry.spellKey),
            entry.role,
            now,
            now,
          ],
        );
      }
    }
    return { characterId };
  });
}
