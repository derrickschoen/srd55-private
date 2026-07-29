import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import { normalizeCatalogName } from '../catalog/catalog-normalize';
import { assertSourceRepeatable } from '../commands/add-source';
import {
  sqlVersatileWeaponDamage,
  sqlWeaponDamage,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  abilityAllocationMethods,
  isEnumValue,
  type AddableSourceType,
  type KnownAbilityAllocationMethod,
} from '../domain/enums';
import { splitLegacyTraitEffect } from '../rules/legacy-trait-effects';
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
  SHARE_ARMOR_ENUMS,
  SHARE_ARMOR_FLAGS,
  SHARE_ARMOR_NUMBERS,
  SHARE_BACKGROUND_TEXT,
  SHARE_EFFECT_NUMBERS,
  SHARE_EFFECT_TEXT,
  SHARE_SPECIES_TEXT,
  SHARE_SPECIES_TRAIT_NUMBERS,
  SHARE_SPECIES_TRAIT_TEXT,
  SHARE_WEAPON_FLAGS,
  SHARE_WEAPON_TEXT,
  ShareValidationError,
  type CharacterShareDocument,
  type ShareArmor,
  type ShareBackground,
  type ShareClass,
  type ShareHitPointRoll,
  type ShareSheetAdjustment,
  type ShareSource,
  type ShareEffect,
  type ShareSpecies,
  type ShareSpeciesTrait,
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
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../domain/weapon-damage';
import {
  isWeaponRangeKind,
  weaponRangeFromStorage,
  type WeaponRange,
} from '../domain/weapon-range';

/**
 * WHAT THE SHARER CHOOSES TO SEND. Every flag is OPT-IN and every default is
 * OFF, which is not a style choice: a link minted before any of these existed
 * carries none of them, so `undefined` has to mean what those links already
 * mean. `=== true` at each read site rather than `?? false`, so nothing but the
 * boolean itself turns the option on.
 */
export interface ShareExportOptions {
  readonly acknowledgements?: boolean;
  readonly loadouts?: boolean;
  /**
   * `characters.notes` — Q12, ruled OPT-IN by the owner ("Opt-in, like
   * loadouts").
   *
   * The other two flags guard WORKING STATE. This one guards the build: a
   * character's own notes sit on the same side of that line as the note on
   * their armour, which travels unconditionally. What makes it different is not
   * where it sits but what it is likely to CONTAIN — a character's own notes
   * are the likeliest place in this application for genuinely private text, so
   * the sharer decides rather than the format.
   */
  readonly notes?: boolean;
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
  /**
   * The four stored sheet inputs, counted for the reason `weaponCount` is: an
   * import about to add a suit of Plate, nine hit point rolls and six skill
   * proficiencies says so before it happens. A silently-arriving section is the
   * failure the weapons gap was closed to avoid; a silently-MISSING one is the
   * same failure in the other direction, and it is the one that matters here —
   * a recipient who is not told the link carried no armour will assume their
   * own was kept.
   */
  readonly armorCount: number;
  readonly hitPointRollCount: number;
  readonly skillProficiencyCount: number;
  readonly includesArmorClassAdjustment: boolean;
  readonly includesAcknowledgements: boolean;
  readonly includesLoadouts: boolean;
  /**
   * Whether the sharer opted their own notes in. Declared on the same terms as
   * its two siblings: the recipient is told which optional sections a link
   * carries before anything is written.
   */
  readonly includesNotes: boolean;
}

/**
 * Share export/import is a GENERIC TABLE WALK: every read here is
 * `SELECT *` — or `SELECT *` over a table name drawn from `SHARE_TABLES` /
 * `SOURCE_TABLES` at runtime — and the columns are re-shaped by the share
 * schema, not by a per-query row type. That is what `allRaw`/`oneRaw` are for,
 * and why this file has no codecs: there is no fixed column set to write one
 * against. The decode that does happen is `SHARE_*` field-by-field, in
 * `shareWeaponFromRow` and its siblings.
 *
 * `SqlRow` rather than the old `Record<string, unknown>`: SQLite cannot return
 * anything but a `SqlValue`, so the wider alias was claiming less than is known.
 */
type Row = SqlRow;

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

/**
 * The stored allocation method, narrowed rather than cast: the CHECK closes
 * the column's vocabulary, so a non-member here is stored corruption and the
 * export refuses it with a sentence instead of minting a link its own
 * importer would reject.
 */
function storedAllocationMethod(
  value: unknown,
): KnownAbilityAllocationMethod {
  const method = String(value);
  if (!isEnumValue(abilityAllocationMethods, method)) {
    throw new ShareValidationError(
      `stored ability_allocation_method '${method}' is unsupported.`,
    );
  }
  return method;
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
  const weapon: Record<string, unknown> = {
    name: String(row.name),
    damage: sqlWeaponDamage(row),
    versatile_damage: sqlVersatileWeaponDamage(row),
  };
  if (
    row.proficiency_category !== null &&
    row.proficiency_category !== undefined
  ) {
    weapon.proficiency_category = String(row.proficiency_category);
  }
  for (const field of SHARE_WEAPON_TEXT) {
    if (row[field] !== null && row[field] !== undefined) {
      weapon[field] = String(row[field]);
    }
  }
  const storedRangeKind = row.range_kind;
  if (!isWeaponRangeKind(storedRangeKind)) {
    throw new TypeError(
      `Unknown weapon range kind "${String(storedRangeKind)}".`,
    );
  }
  const range = weaponRangeFromStorage(
    storedRangeKind,
    row.range_near_feet === null ? null : Number(row.range_near_feet),
    row.range_far_feet === null ? null : Number(row.range_far_feet),
  );
  weapon.range = range;
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

function sharedDamageValues(
  damage: WeaponDamage | VersatileWeaponDamage,
): readonly SqlValue[] {
  switch (damage.kind) {
    case 'dice':
      return [damage.kind, damage.dice, null, null];
    case 'flat':
      return [damage.kind, null, damage.amount, null];
    case 'custom':
      return [damage.kind, null, null, damage.text];
    case 'not_recorded':
    case 'not_applicable':
      return [damage.kind, null, null, null];
  }
}

function sharedRangeValues(range: WeaponRange): readonly SqlValue[] {
  switch (range.kind) {
    case 'none':
      return [range.kind, null, null];
    case 'ranged':
    case 'legacy':
      return [range.kind, range.near_feet, range.far_feet];
  }
}

/**
 * The origin rows, projected onto the share document's sections.
 *
 * `null` becomes ABSENT, on exactly the terms `shareWeaponFromRow` established:
 * a half-entered species stays half-entered rather than being completed with
 * empty strings, and the round trip restores the column's own NULL.
 *
 * `sort_order` is deliberately NOT projected. The export orders by it and the
 * import re-derives it from array position, so the printed order survives
 * without a column on the wire that a hostile document could make sparse,
 * duplicated or negative.
 */
function textFields<T>(
  row: Row,
  fields: readonly string[],
  into: Record<string, unknown>,
): T {
  for (const field of fields) {
    if (row[field] !== null && row[field] !== undefined) {
      into[field] = String(row[field]);
    }
  }
  return into as T;
}

/**
 * `null` becomes ABSENT, on the terms `shareWeaponFromRow` established: an
 * optional field the sender never filled must arrive absent rather than as an
 * explicit null, so that the recipient's row carries the column's own default
 * instead of a value the sender never chose.
 */
function shareArmorFromRow(row: Row): ShareArmor {
  const armor: Record<string, unknown> = { name: String(row.name) };
  for (const field of SHARE_ARMOR_ENUMS) {
    armor[field] = String(row[field]);
  }
  armor.armor_class = Number(row.armor_class);
  for (const field of SHARE_ARMOR_NUMBERS) {
    if (row[field] !== null && row[field] !== undefined) {
      armor[field] = Number(row[field]);
    }
  }
  for (const flag of SHARE_ARMOR_FLAGS) {
    if (Number(row[flag]) === 1) {
      armor[flag] = true;
    }
  }
  if (row.notes !== null && row.notes !== undefined) {
    armor.notes = String(row.notes);
  }
  return armor as unknown as ShareArmor;
}

function shareHitPointRollFromRow(row: Row): ShareHitPointRoll {
  return {
    className: String(row.class_name),
    classLevel: Number(row.class_level),
    value: Number(row.rolled_value),
  };
}

function shareSheetAdjustmentFromRow(row: Row): ShareSheetAdjustment {
  const adjustment: Record<string, unknown> = {
    value: Number(row.armor_class_adjustment),
  };
  if (
    row.armor_class_adjustment_note !== null &&
    row.armor_class_adjustment_note !== undefined
  ) {
    adjustment.note = String(row.armor_class_adjustment_note);
  }
  return adjustment as unknown as ShareSheetAdjustment;
}

function shareSpeciesFromRow(row: Row): ShareSpecies {
  const species: Record<string, unknown> = { name: String(row.name) };
  textFields(row, SHARE_SPECIES_TEXT, species);
  if (row.base_speed_feet !== null && row.base_speed_feet !== undefined) {
    species.base_speed_feet = Number(row.base_speed_feet);
  }
  return species as unknown as ShareSpecies;
}

/**
 * A trait row on its way out.
 *
 * The loops over `SHARE_SPECIES_TRAIT_TEXT` and `SHARE_SPECIES_TRAIT_NUMBERS`
 * stay, and they now find nothing beyond `description` and `notes`: those lists
 * still name the five retired `effect_*` fields because the WIRE ORDER is
 * frozen, and the row no longer has the columns. So every link this build
 * writes carries `null` in those slots — which keeps the trait tuple the same
 * length, and therefore keeps element 13 meaning what it has always meant for
 * links already in the wild. The effects travel in element 14 instead.
 */
function shareSpeciesTraitFromRow(row: Row): ShareSpeciesTrait {
  const trait: Record<string, unknown> = { name: String(row.name) };
  textFields(row, SHARE_SPECIES_TRAIT_TEXT, trait);
  for (const field of SHARE_SPECIES_TRAIT_NUMBERS) {
    if (row[field] !== null && row[field] !== undefined) {
      trait[field] = Number(row[field]);
    }
  }
  return trait as unknown as ShareSpeciesTrait;
}

/**
 * What one document reference means on the export side: which entry it is, and
 * WHICH OF THE ROOTS THAT ENTRY MINTS it names.
 *
 * A `classes[]` entry with a subclass mints two source instances and carries one
 * id. `selections[].ref` searches the descendants of both and does not need the
 * distinction; an effect names one row and does.
 */
interface ShareSourceOwner {
  readonly ref: number;
  readonly subclass: boolean;
}

/**
 * An effect row on its way out.
 *
 * `sourceRef` is the document reference of the source instance that granted it,
 * resolved through the same reference space `selections[].ref` uses — so an
 * effect and the spells from one feat name the same source — and
 * `sourceSubclass` says which of the two roots a class reference mints. Without
 * that flag a subclass feature arrives attached to the CLASS, which is a real
 * row and the wrong one: silently wrong provenance is worse than none.
 *
 * A source instance no reference can reach yields no ref rather than a dangling
 * one: the effect still travels, it simply arrives without its provenance,
 * which is the state every bundled-species effect is in anyway. Exactly one
 * shape is unreachable — a REMOVED root (`state != 'active'` with no active
 * ancestor), because a share document carries the build as it stands and a
 * removed feat is not in it to be named. A removed source under a live root
 * keeps its provenance, coarsened to that root the same way an active
 * non-root's is.
 */
function shareEffectFromRow(
  row: Row,
  owners: ReadonlyMap<number, ShareSourceOwner>,
): ShareEffect {
  const effect: Record<string, unknown> = {
    kind: String(row.effect_kind),
    label: String(row.label),
  };
  textFields(row, SHARE_EFFECT_TEXT, effect);
  for (const field of SHARE_EFFECT_NUMBERS) {
    if (row[field] !== null && row[field] !== undefined) {
      effect[field] = Number(row[field]);
    }
  }
  if (row.source_instance_id !== null && row.source_instance_id !== undefined) {
    const owner = owners.get(Number(row.source_instance_id));
    if (owner !== undefined) {
      effect.sourceRef = owner.ref;
      if (owner.subclass) {
        effect.sourceSubclass = true;
      }
    }
  }
  return effect as unknown as ShareEffect;
}

function shareBackgroundFromRow(row: Row): ShareBackground {
  const background: Record<string, unknown> = { name: String(row.name) };
  textFields(row, SHARE_BACKGROUND_TEXT, background);
  return background as unknown as ShareBackground;
}

function sourceOwners(
  rows: readonly Row[],
  directOwners: ReadonlyMap<number, ShareSourceOwner>,
): Map<number, ShareSourceOwner> {
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
        // The whole owner, not just the ref: a feat granted BY a subclass is
        // still the subclass's, and flattening that here would put the effect
        // back on the class.
        owners.set(id, owners.get(parent) as ShareSourceOwner);
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
  const rows = db.allRaw(
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
  const character = db.oneRaw(
    'SELECT * FROM characters WHERE id = ?',
    [characterId],
  );
  if (character === null) {
    throw new Error(`Character ${characterId} does not exist.`);
  }
  const allSources = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_source_instances}
     WHERE character_id = ? AND state = 'active'
     ORDER BY acquired_at_character_level, id`,
    [characterId],
  );
  const classLevels = db.allRaw(
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
  const directOwners = new Map<number, ShareSourceOwner>();
  const classes = classLevels.map((row): ShareClass => {
    const id = nextId++;
    directOwners.set(Number(row.source_instance_id), {
      ref: id,
      subclass: false,
    });
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
      // The SAME ref as the class — a subclass has no `classes[]` entry of its
      // own — but marked, so an effect hanging from it can say which root it
      // meant. `selections[].ref` reads `.ref` alone and is unaffected.
      directOwners.set(Number(subclassSource.id), { ref: id, subclass: true });
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
    directOwners.set(Number(row.id), { ref: id, subclass: false });
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
  // A SECOND MAP, FOR EFFECTS ONLY, AND THE DIFFERENCE IS DELIBERATE.
  //
  // `owners` walks the ACTIVE tree, because that is the tree
  // `selections[].ref` has always resolved against and widening it would start
  // exporting selections whose slot hangs from a removed source — a behaviour
  // change to spells, made silently, in a change about effects.
  //
  // An effect is different: it is a row the character still has, whatever
  // happened to the thing that granted it. A `tombstoned` source under a live
  // root (the grant generator makes these — see `grant-rule-slot-generator.ts`)
  // still has an ancestor the document carries, so its ref exists and the
  // provenance survives at the same root-level coarsening every non-root source
  // gets. Only the columns `sourceOwners` reads are selected.
  const effectOwners = sourceOwners(
    db.allRaw(
      `SELECT id, parent_source_instance_id
       FROM ${SHARE_TABLES.character_source_instances}
       WHERE character_id = ?`,
      [characterId],
    ),
    directOwners,
  );
  const versions = spellRows(db, characterId);

  const selections = db
    .allRaw(
      `SELECT * FROM ${SHARE_TABLES.spell_selection_slots}
       WHERE character_id = ? AND current_spell_version_id IS NOT NULL
         AND state IN ('active', 'kept_override')
       ORDER BY source_instance_id, rule_key, ordinal, id`,
      [characterId],
    )
    .flatMap((row) => {
      const ref = owners.get(Number(row.source_instance_id))?.ref;
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

  const spellbook = db.allRaw(
    `SELECT version.content_key
     FROM ${SHARE_TABLES.wizard_spellbook_entries} AS entry
     INNER JOIN spell_versions AS version
       ON version.id = entry.spell_version_id
     WHERE entry.character_id = ?
     ORDER BY version.content_key`,
    [characterId],
  ).map((row) => String(row.content_key));
  const preferences = db.allRaw(
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
  const overrides = db.allRaw(
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
      ? db.allRaw(
          `SELECT warning_fingerprint
           FROM ${SHARE_TABLES.warning_acknowledgements}
           WHERE character_id = ? AND invalidated_at IS NULL
           ORDER BY warning_fingerprint`,
          [characterId],
        ).map((row) => ({ warning: String(row.warning_fingerprint) }))
      : undefined;
  const loadouts =
    options.loadouts === true
      ? db.allRaw(
          `SELECT id, name FROM ${SHARE_TABLES.spell_loadouts}
           WHERE character_id = ? ORDER BY id`,
          [characterId],
        ).map((loadout) => ({
          name: String(loadout.name),
          entries: db.allRaw(
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
  // THE THIRD OPT-IN, and the only one that is a single column (Q12).
  //
  // An EMPTY note is no note. `''` and NULL become the same absent field
  // because the recipient's column cannot hold the difference in any way a
  // reader could see, and because `text()` refuses a zero-length string — so
  // exporting `''` would refuse to build the link at all over a note nobody
  // wrote.
  const notes =
    options.notes === true &&
    character.notes !== null &&
    character.notes !== undefined &&
    String(character.notes) !== ''
      ? String(character.notes)
      : undefined;
  // Not behind an option flag. `acknowledgements` and `loadouts` are opt-in
  // because they are working state the recipient may not want; a weapon is part
  // of the build being shared, like the class levels and the spellbook.
  const weapons = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_weapons}
     WHERE character_id = ? ORDER BY id`,
    [characterId],
  ).map(shareWeaponFromRow);
  // Not behind an option flag either, and for the same reason: a character's
  // species and background are the build being shared, not working state.
  const speciesRow = db.oneRaw(
    `SELECT * FROM ${SHARE_TABLES.character_species} WHERE character_id = ?`,
    [characterId],
  );
  const species =
    speciesRow === null ? undefined : shareSpeciesFromRow(speciesRow);
  const speciesTraits = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_species_traits}
     WHERE character_id = ? ORDER BY sort_order, id`,
    [characterId],
  ).map(shareSpeciesTraitFromRow);
  const effects = db.all(
    `SELECT * FROM ${SHARE_TABLES.character_effects}
     WHERE character_id = ?
     ORDER BY sort_order, id`,
    [characterId],
    (row) => shareEffectFromRow(row, effectOwners),
  );
  const backgroundRow = db.oneRaw(
    `SELECT * FROM ${SHARE_TABLES.character_background} WHERE character_id = ?`,
    [characterId],
  );
  const background =
    backgroundRow === null
      ? undefined
      : shareBackgroundFromRow(backgroundRow);
  // Not behind an option flag either. The four stored sheet inputs are the
  // build being shared — an Armor Class that changes when the link is opened
  // would be a different character, not a tidier one.
  //
  // AN EMPTY SECTION IS OMITTED RATHER THAN SENT AS `[]`, matching what the
  // weapons and origin sections do and what the decoder's absent/empty
  // distinction is for: a document that never mentions armour and a document
  // that mentions having none import identically, and the smaller one is the
  // one every character without armour produces.
  const armorRows = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_armor}
     WHERE character_id = ? ORDER BY slot`,
    [characterId],
  ).map(shareArmorFromRow);
  const armor = armorRows.length === 0 ? undefined : armorRows;
  const rollRows = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_hit_point_rolls}
     WHERE character_id = ? ORDER BY class_name, class_level`,
    [characterId],
  ).map(shareHitPointRollFromRow);
  const hitPointRolls = rollRows.length === 0 ? undefined : rollRows;
  const skillRows = db.allRaw(
    `SELECT skill FROM ${SHARE_TABLES.character_skill_proficiencies}
     WHERE character_id = ? ORDER BY skill`,
    [characterId],
  ).map((row) => String(row.skill));
  const skillProficiencies = skillRows.length === 0 ? undefined : skillRows;
  const adjustmentRow = db.oneRaw(
    `SELECT * FROM ${SHARE_TABLES.character_sheet_adjustments}
     WHERE character_id = ?`,
    [characterId],
  );
  const sheetAdjustment =
    adjustmentRow === null
      ? undefined
      : shareSheetAdjustmentFromRow(adjustmentRow);
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
      // THE ALLOCATION SIGNAL ALWAYS TRAVELS WHEN SET (v3). The six scores
      // above compress away when they equal the default 10, so this field is
      // the only thing that keeps an allocated all-10s character — valid under
      // D64 — from round-tripping as unallocated. NULL (never allocated) stays
      // absent, mirroring the column.
      ...(character.ability_allocation_method === null
        ? {}
        : {
            ability_allocation_method: storedAllocationMethod(
              character.ability_allocation_method,
            ),
          }),
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
      ...(notes === undefined ? {} : { notes }),
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
    // Omitted when absent, on the same terms: a character with no species and
    // no background produces a link exactly the shape it was before origins
    // travelled. The three are independent — a background with no species is a
    // legitimate character and encodes as one section, not three.
    ...(species === undefined ? {} : { species }),
    ...(speciesTraits.length === 0 ? {} : { speciesTraits }),
    ...(background === undefined ? {} : { background }),
    // And the four sheet inputs, each omitted when the character recorded
    // nothing of that kind, so a character who has recorded none of the four
    // produces a link exactly the shape it was before this change.
    ...(armor === undefined ? {} : { armor }),
    ...(hitPointRolls === undefined ? {} : { hitPointRolls }),
    ...(skillProficiencies === undefined ? {} : { skillProficiencies }),
    ...(sheetAdjustment === undefined ? {} : { sheetAdjustment }),
    // Omitted when empty, on the same terms as every section above: a character
    // with no effects produces a link exactly the shape it was before the
    // effect model existed.
    ...(effects.length === 0 ? {} : { effects }),
  };
  return validateShareDocument(document);
}

function definition(
  db: DatabaseContext,
  table: string,
  key: string,
): Row {
  const row = db.oneRaw(
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
  return db.oneRaw(
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
  const existing = db.oneRaw(
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
    for (const row of db.allRaw(
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
    armorCount: document.armor?.length ?? 0,
    hitPointRollCount: document.hitPointRolls?.length ?? 0,
    skillProficiencyCount: document.skillProficiencies?.length ?? 0,
    includesArmorClassAdjustment: document.sheetAdjustment !== undefined,
    includesAcknowledgements:
      document.acknowledgements !== undefined,
    includesLoadouts: document.loadouts !== undefined,
    includesNotes: document.character.notes !== undefined,
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
         charisma, ability_allocation_method, proficiency_bonus_override,
         rules_edition_preference, allow_legacy, revision, notes,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        c.name,
        // `?? 10` refills the scores the exporter compressed away — which is
        // exactly why the allocation signal below must travel independently:
        // without it an allocated all-10s character (valid, D64) arrived
        // looking unallocated.
        c.strength ?? 10,
        c.dexterity ?? 10,
        c.constitution ?? 10,
        c.intelligence ?? 10,
        c.wisdom ?? 10,
        c.charisma ?? 10,
        c.ability_allocation_method ?? null,
        c.proficiency_bonus_override ?? null,
        c.rules_edition_preference ?? '2024',
        c.allow_legacy === true ? 1 : 0,
        // A document that carries no note leaves the recipient's column at its
        // own NULL, which is what a link minted before Q12 has always produced.
        c.notes ?? null,
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

    const sources = db.allRaw(
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
      const slots = db.allRaw(
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
           character_id, name, proficiency_category,
           damage_kind, damage_dice, damage_flat, damage_custom,
           ${SHARE_WEAPON_TEXT.join(', ')},
           versatile_damage_kind, versatile_damage_dice,
           versatile_damage_flat, versatile_damage_custom,
           range_kind, range_near_feet, range_far_feet, mastery_property,
           other_properties, notes, ${SHARE_WEAPON_FLAGS.join(', ')},
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?,
           ${SHARE_WEAPON_TEXT.map(() => '?').join(', ')}, ?, ?, ?, ?,
           ?, ?, ?, ?, ?, ?, ${SHARE_WEAPON_FLAGS.map(() => '?').join(', ')},
           ?, ?)`,
        [
          characterId,
          weapon.name,
          // Absent means the column's own NULL — NOT STATED — which is exactly
          // what a link minted before D27 means and exactly what the sheet then
          // says out loud. The importer invents nothing.
          weapon.proficiency_category ?? null,
          ...sharedDamageValues(weapon.damage),
          ...SHARE_WEAPON_TEXT.map((field) => weapon[field] ?? null),
          ...sharedDamageValues(weapon.versatile_damage),
          ...sharedRangeValues(weapon.range),
          weapon.mastery_property ?? null,
          weapon.other_properties ?? null,
          weapon.notes ?? null,
          ...SHARE_WEAPON_FLAGS.map((flag) => (weapon[flag] === true ? 1 : 0)),
          now,
          now,
        ],
      );
    }
    // The origin resolves nothing against the recipient's catalog either — by
    // D1b these rows hold no template id — so each is written as it arrived.
    if (document.species !== undefined) {
      const species = document.species;
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_species} (
           character_id, name, ${SHARE_SPECIES_TEXT.join(', ')},
           base_speed_feet, created_at, updated_at
         ) VALUES (?, ?, ${SHARE_SPECIES_TEXT.map(() => '?').join(', ')}, ?, ?, ?)`,
        [
          characterId,
          species.name,
          ...SHARE_SPECIES_TEXT.map((field) => species[field] ?? null),
          species.base_speed_feet ?? null,
          now,
          now,
        ],
      );
    }
    // `sort_order` comes from the ARRAY POSITION, one-based to match the dense
    // printed order the template seeds. A document cannot supply it, so it
    // cannot supply a duplicate, a gap or a zero.
    for (const [index, trait] of (document.speciesTraits ?? []).entries()) {
      // The wire lists are NOT used to build this statement any more: they name
      // the retired `effect_*` fields, and the table no longer has those
      // columns. The two surviving text fields are written by name, and the
      // payload — if this link carries one — became a `character_effects` row
      // below.
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_species_traits} (
           character_id, sort_order, name, description, notes,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          index + 1,
          trait.name,
          trait.description ?? null,
          trait.notes ?? null,
          now,
          now,
        ],
      );
    }
    // THE CHARACTER'S OWN EFFECTS, FROM TWO SOURCES THAT CANNOT BOTH FIRE.
    //
    // A link written by this build carries `document.effects` and its trait
    // tuples carry `null` in the five retired slots. A link written before the
    // inversion carries NO `effects` key and its trait tuples carry the real
    // payload. `splitLegacyTraitEffect` returns nothing for the first case and
    // the effect for the second, so the two paths append to one list and the
    // ordering is deterministic either way: explicit effects first, in document
    // order, then migrated ones in trait order.
    //
    // `sort_order` is the position in that list, one-based, exactly as a
    // trait's is — a document cannot supply it, so it cannot supply a
    // duplicate, a gap or a zero.
    const importedEffects: {
      kind: string;
      label: string;
      damage_type: string | null;
      hit_points_flat: number | null;
      hit_points_per_level: number | null;
      speed_bonus_feet: number | null;
      notes: string | null;
      sourceId: number | null;
    }[] = [];
    for (const effect of document.effects ?? []) {
      // `rootsByRef` is the same map `selections[].ref` resolves through. A
      // class ref mints TWO roots when it names a subclass — `[class,
      // subclass]`, in that order, set together a few dozen lines above — and
      // `sourceSubclass` is how the document says which of the two it meant.
      // Taking `roots[0]` unconditionally would attach a subclass feature to
      // the class: a real row, and the wrong one.
      //
      // The flag cannot arrive without a ref, and cannot name a ref that mints
      // one root; `shareEffect` in `./schema.ts` refuses both, so `roots[1]`
      // here is present by validation rather than by hope.
      const roots =
        effect.sourceRef === undefined
          ? undefined
          : rootsByRef.get(effect.sourceRef);
      if (effect.sourceRef !== undefined && roots === undefined) {
        throw new ShareValidationError(
          `effect sourceRef ${effect.sourceRef} is unavailable.`,
        );
      }
      const rootIndex = effect.sourceSubclass === true ? 1 : 0;
      if (roots !== undefined && roots[rootIndex] === undefined) {
        throw new ShareValidationError(
          `effect sourceRef ${String(effect.sourceRef)} names no subclass.`,
        );
      }
      importedEffects.push({
        kind: effect.kind,
        label: effect.label,
        damage_type: effect.damage_type ?? null,
        hit_points_flat: effect.hit_points_flat ?? null,
        hit_points_per_level: effect.hit_points_per_level ?? null,
        speed_bonus_feet: effect.speed_bonus_feet ?? null,
        notes: effect.notes ?? null,
        sourceId: roots?.[rootIndex] ?? null,
      });
    }
    for (const trait of document.speciesTraits ?? []) {
      const migrated = splitLegacyTraitEffect({ ...trait }).effect;
      if (migrated === null) {
        continue;
      }
      importedEffects.push({
        kind: migrated.effect_kind,
        label: migrated.label,
        damage_type: migrated.damage_type,
        hit_points_flat: migrated.hit_points_flat,
        hit_points_per_level: migrated.hit_points_per_level,
        speed_bonus_feet: migrated.speed_bonus_feet,
        notes: null,
        // A legacy link predates the provenance column entirely, so there is
        // nothing to resolve and nothing is invented.
        sourceId: null,
      });
    }
    for (const [index, effect] of importedEffects.entries()) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_effects} (
           character_id, sort_order, effect_kind, damage_type,
           hit_points_flat, hit_points_per_level, speed_bonus_feet,
           source_instance_id, label, notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          index + 1,
          effect.kind,
          effect.damage_type,
          effect.hit_points_flat,
          effect.hit_points_per_level,
          effect.speed_bonus_feet,
          effect.sourceId,
          effect.label,
          effect.notes,
          now,
          now,
        ],
      );
    }
    if (document.background !== undefined) {
      const background = document.background;
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_background} (
           character_id, name, ${SHARE_BACKGROUND_TEXT.join(', ')},
           created_at, updated_at
         ) VALUES (?, ?, ${SHARE_BACKGROUND_TEXT.map(() => '?').join(', ')}, ?, ?)`,
        [
          characterId,
          background.name,
          ...SHARE_BACKGROUND_TEXT.map((field) => background[field] ?? null),
          now,
          now,
        ],
      );
    }
    // The four sheet inputs resolve nothing against the recipient's catalog
    // either: by D1b armour holds no template id, and a hit point roll is filed
    // under a class NAME rather than a class-level id precisely so that it needs
    // no remapping and survives the class rows being rebuilt with new ids here.
    for (const armor of document.armor ?? []) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_armor} (
           character_id, ${SHARE_ARMOR_ENUMS.join(', ')}, name, armor_class,
           ${SHARE_ARMOR_NUMBERS.join(', ')}, ${SHARE_ARMOR_FLAGS.join(', ')},
           notes, created_at, updated_at
         ) VALUES (?, ${SHARE_ARMOR_ENUMS.map(() => '?').join(', ')}, ?, ?,
           ${SHARE_ARMOR_NUMBERS.map(() => '?').join(', ')},
           ${SHARE_ARMOR_FLAGS.map(() => '?').join(', ')}, ?, ?, ?)`,
        [
          characterId,
          ...SHARE_ARMOR_ENUMS.map((field) => armor[field]),
          armor.name,
          armor.armor_class,
          ...SHARE_ARMOR_NUMBERS.map((field) => armor[field] ?? null),
          ...SHARE_ARMOR_FLAGS.map((flag) => (armor[flag] === true ? 1 : 0)),
          armor.notes ?? null,
          now,
          now,
        ],
      );
    }
    for (const roll of document.hitPointRolls ?? []) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_hit_point_rolls} (
           character_id, class_name, class_level, rolled_value,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [characterId, roll.className, roll.classLevel, roll.value, now, now],
      );
    }
    for (const skill of document.skillProficiencies ?? []) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_skill_proficiencies} (
           character_id, skill, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [characterId, skill, now, now],
      );
    }
    if (document.sheetAdjustment !== undefined) {
      const adjustment = document.sheetAdjustment;
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_sheet_adjustments} (
           character_id, armor_class_adjustment,
           armor_class_adjustment_note, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)`,
        [characterId, adjustment.value, adjustment.note ?? null, now, now],
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
