import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import { normalizeCatalogName } from '../catalog/catalog-normalize';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import {
  registerAssertedPlaceholderContentIdentity,
  resolveContentReference,
} from '../catalog/content-registry';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportCommitResult,
  type ContentImportNode,
  type ContentImportPlan,
  type ContentImportPlanToken,
} from '../catalog/content-adoption';
import { localContentReferenceImportNode } from '../backup/portable-content';
import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
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
import { rebuildSkillProjection } from '../grants/skill-grants';
import { reconcileCharacterSkillExpertise } from '../grants/skill-expertise-grants';
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
  type ShareItem,
  type ShareSource,
  type ShareEffect,
  type ShareSpecies,
  type ShareSpeciesTrait,
  type ShareWeapon,
  validateShareDocument,
} from './schema';
import {
  ambiguousReferenceIssue,
  missingClassIssue,
  missingSourceIssue,
  missingSubclassIssue,
  notRepeatableIssue,
  selectionSlotIssue,
  ShareImportCompatibilityError,
  subclassMismatchIssue,
  unprojectableReferenceIssue,
  type ShareImportIssue,
} from './import-issues';
import type { ContentKind } from '../catalog/content-identity';
import type { ContentKey } from '../domain/ids';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../domain/weapon-damage';
import {
  isWeaponRangeKind,
  weaponRangeFromStorage,
  type WeaponRange,
} from '../domain/weapon-range';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../domain/source-markers';

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
   * All four character-authored text fields: alignment, appearance, backstory,
   * and notes. D124 generalizes the existing notes opt-in rather than adding
   * per-field privacy controls. Only an explicit `true` includes any written
   * text.
   */
  readonly writtenText?: boolean;
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
  readonly includesAcknowledgements: boolean;
  readonly includesLoadouts: boolean;
  /**
   * Whether the link carries any of the sharer's alignment, appearance,
   * backstory, or notes. Declared on the same terms as its two siblings: the
   * recipient is told which optional sections a link carries before anything
   * is written.
   */
  readonly includesWrittenText: boolean;
  readonly adoptionPlan: ContentImportPlan;
}

export type ShareImportCommitResult =
  | (Extract<ContentImportCommitResult, { readonly kind: 'committed' }> & {
      readonly result: ShareImportResult;
    })
  | Exclude<ContentImportCommitResult, { readonly kind: 'committed' }>;

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
 *
 * THAT ALLOWANCE DOES NOT EXTEND TO `ability_increase` (v4, B2, plan §3.3).
 * The kind's schema CHECK requires a non-null source, so a document carrying
 * one without its `sourceRef` would be an export our own importer refuses —
 * D60's surviving defect by name. An `ability_increase` whose owner no
 * reference can reach therefore refuses the EXPORT, with a sentence, while the
 * character is still on the sender's screen; `shareEffect` in `./schema.ts`
 * enforces the same rule again at validation, so neither side can drift alone.
 */
function shareEffectFromRow(
  row: Row,
  owners: ReadonlyMap<number, ShareSourceOwner>,
  itemRefs: ReadonlyMap<number, number>,
  weaponRefs: ReadonlyMap<number, number>,
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
  if (row.ability !== null && row.ability !== undefined) {
    effect.ability = String(row.ability);
  }
  if (row.amount !== null && row.amount !== undefined) {
    effect.amount = Number(row.amount);
  }
  if (row.maximum !== null && row.maximum !== undefined) {
    effect.maximum = Number(row.maximum);
  }
  // THE FIVE AC-1 (D72) PAYLOADS (wire v8): `armor_class_formula`'s base and
  // up to two abilities plus its shield eligibility, and the weapon scope
  // shared by `attack_ability_override` / `weapon_attack_bonus` /
  // `weapon_damage_bonus`. Extracted the same way every other nullable
  // payload column on this row is — present or absent, never a stand-in
  // default.
  if (row.base !== null && row.base !== undefined) {
    effect.base = Number(row.base);
  }
  if (row.ability_1 !== null && row.ability_1 !== undefined) {
    effect.ability_1 = String(row.ability_1);
  }
  if (row.ability_2 !== null && row.ability_2 !== undefined) {
    effect.ability_2 = String(row.ability_2);
  }
  if (row.allows_shield !== null && row.allows_shield !== undefined) {
    effect.allows_shield = Number(row.allows_shield) === 1;
  }
  if (row.weapon_scope !== null && row.weapon_scope !== undefined) {
    effect.weapon_scope = String(row.weapon_scope);
  }
  if (row.character_item_id !== null && row.character_item_id !== undefined) {
    const itemRef = itemRefs.get(Number(row.character_item_id));
    if (itemRef === undefined) {
      throw new ShareValidationError(
        `effect '${String(row.label)}' names an item this share cannot encode.`,
      );
    }
    effect.itemRef = itemRef;
  }
  if (
    row.character_weapon_id !== null &&
    row.character_weapon_id !== undefined
  ) {
    const weaponRef = weaponRefs.get(Number(row.character_weapon_id));
    if (weaponRef === undefined) {
      throw new ShareValidationError(
        `effect '${String(row.label)}' names a weapon this share cannot encode.`,
      );
    }
    effect.weaponRef = weaponRef;
  }
  if (row.template_ref !== null && row.template_ref !== undefined) {
    effect.template_ref = String(row.template_ref);
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
  if (
    String(row.effect_kind) === 'ability_increase' &&
    effect.sourceRef === undefined
  ) {
    throw new ShareValidationError(
      `the ability increase '${String(row.label)}' has a source this share ` +
        'link cannot name. Restore or remove its granting source, then share.',
    );
  }
  return effect as unknown as ShareEffect;
}

/**
 * AN ITEM ROW ON ITS WAY OUT (wire v8, AC-1, D72).
 *
 * `sourceRef` resolves through the SAME `owners` map `shareEffectFromRow`
 * does (the tolerant, root-coarsened tree — an item is a thing the character
 * still has, whatever happened to what granted it), and on the identical
 * "travels without its provenance if unreachable" terms: no kind here has
 * `ability_increase`'s required-source CHECK, so an item's source is simply
 * omitted rather than refusing the export.
 */
function shareItemFromRow(
  row: Row,
  owners: ReadonlyMap<number, ShareSourceOwner>,
): ShareItem {
  const item: Record<string, unknown> = {
    name: String(row.name),
    requires_attunement: Number(row.requires_attunement) === 1,
    quantity: Number(row.quantity),
  };
  if (row.description !== null && row.description !== undefined) {
    item.description = String(row.description);
  }
  if (row.source_instance_id !== null && row.source_instance_id !== undefined) {
    const owner = owners.get(Number(row.source_instance_id));
    if (owner !== undefined) {
      item.sourceRef = owner.ref;
    }
  }
  return item as unknown as ShareItem;
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
  const classRefsByLevelId = new Map<number, number>();
  const classes = classLevels.map((row): ShareClass => {
    const id = nextId++;
    classRefsByLevelId.set(Number(row.id), id);
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
    if (row.source_definition_id === null) {
      if (
        row.source_type !== 'species' ||
        row.notes !== GUIDED_SPECIES_SOURCE_MARKER
      ) {
        throw new ShareValidationError(
          `the ${type} source '${String(row.display_name)}' has no catalog ` +
            'definition and is not a guided generated species source.',
        );
      }
      return {
        id,
        type: 'species',
        name: String(row.display_name),
        ...(config === undefined ? {} : { config }),
        acquired: Number(row.acquired_at_character_level),
        generated: true,
      };
    }
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
          ...(row.selection_acquired_at_class_level === null ||
          row.selection_acquired_at_class_level === undefined
            ? {}
            : {
                acquiredAtClassLevel: Number(
                  row.selection_acquired_at_class_level,
                ),
              }),
        },
      ];
    });

  const spellbook = db.allRaw(
    `SELECT entry.*, version.content_key, version.provenance,
            version.display_name
     FROM ${SHARE_TABLES.wizard_spellbook_entries} AS entry
     LEFT JOIN spell_versions AS version
       ON version.id = entry.spell_version_id
     WHERE entry.character_id = ? AND entry.state = 'active'
     ORDER BY entry.source_instance_id, entry.rule_key, entry.ordinal, entry.id`,
    [characterId],
  ).flatMap((row) => {
    const ref =
      row.source_instance_id === null ||
      row.source_instance_id === undefined
        ? undefined
        : owners.get(Number(row.source_instance_id))?.ref;
    if (
      row.source_instance_id !== null &&
      row.source_instance_id !== undefined &&
      ref === undefined
    ) {
      return [];
    }
    return [{
      ...(ref === undefined ? {} : { ref }),
      ...(row.rule_key === null || row.rule_key === undefined
        ? {}
        : { ruleKey: String(row.rule_key) }),
      ...(row.ordinal === null || row.ordinal === undefined
        ? {}
        : { ordinal: Number(row.ordinal) }),
      ...(row.acquired_at_class_level === null ||
      row.acquired_at_class_level === undefined
        ? {}
        : {
            acquiredAtClassLevel: Number(
              row.acquired_at_class_level,
            ),
          }),
      ...(row.content_key === null || row.content_key === undefined
        ? {}
        : { spellKey: String(row.content_key) }),
      ...(row.provenance === 'placeholder'
        ? { spellName: String(row.display_name) }
        : {}),
    }];
  });
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
  // THE THIRD OPT-IN. D124 makes this one option cover all character-authored
  // text, with no independently selectable fields.
  //
  // EMPTY text is no text. `''` and NULL become the same absent field
  // because the recipient's column cannot hold the difference in any way a
  // reader could see, and because `text()` refuses a zero-length string — so
  // exporting `''` would refuse to build the link at all over a note nobody
  // wrote.
  const writtenText = (value: unknown): string | undefined =>
    options.writtenText === true &&
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ''
      ? String(value)
      : undefined;
  const alignment = writtenText(character.alignment);
  const appearance = writtenText(character.appearance);
  const backstory = writtenText(character.backstory);
  const notes = writtenText(character.notes);
  // Not behind an option flag. `acknowledgements` and `loadouts` are opt-in
  // because they are working state the recipient may not want; a weapon is part
  // of the build being shared, like the class levels and the spellbook.
  const weaponRows = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_weapons}
     WHERE character_id = ? ORDER BY id`,
    [characterId],
  );
  const weaponRefs = new Map(
    weaponRows.map((row, index) => [Number(row.id), index]),
  );
  const weapons = weaponRows.map(shareWeaponFromRow);
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
  // THE CHARACTER'S OWN ITEMS (wire v8, AC-1, D72). Ordered by id: unlike
  // effects and species traits, an item has no `sort_order` of its own (the
  // plan's row shape does not name one — see `db/schema/items.ts`). Resolved
  // through the SAME tolerant `effectOwners` map effects use, for the
  // identical reason: an item is a thing the character still has, whatever
  // happened to what granted it.
  const itemRows = db.allRaw(
    `SELECT * FROM ${SHARE_TABLES.character_items}
     WHERE character_id = ?
     ORDER BY id`,
    [characterId],
  );
  const itemRefs = new Map(
    itemRows.map((row, index) => [Number(row.id), index]),
  );
  const items = itemRows.map((row) => shareItemFromRow(row, effectOwners));
  const attunementRow = db.oneRaw(
    `SELECT * FROM ${SHARE_TABLES.character_attunement_slots}
     WHERE character_id = ?`,
    [characterId],
  );
  const attunementSlots =
    attunementRow === null
      ? undefined
      : ([
          attunementRow.slot_1_item_id,
          attunementRow.slot_2_item_id,
          attunementRow.slot_3_item_id,
        ].map((itemId) => {
          if (itemId === null || itemId === undefined) {
            return null;
          }
          const ref = itemRefs.get(Number(itemId));
          if (ref === undefined) {
            throw new ShareValidationError(
              'an attunement slot names an item this share cannot encode.',
            );
          }
          return ref;
        }) as [number | null, number | null, number | null]);
  const effects = db.all(
    `SELECT * FROM ${SHARE_TABLES.character_effects}
     WHERE character_id = ?
     ORDER BY sort_order, id`,
    [characterId],
    (row) => shareEffectFromRow(row, effectOwners, itemRefs, weaponRefs),
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
  // THE SKILL GRANTS (wire v5) — the provenance source of truth the flat
  // `skillProficiencies` list above is a projection of. ACTIVE grants only, on
  // the rule `selections` has always followed: a share carries the build as it
  // stands, and an orphaned grant's source is not in the document to be named.
  // The ref space is `owners` — the active tree, coarsened to its root — so a
  // grant minted on a class source names that class's `classes[]` entry.
  const skillGrants = db
    .allRaw(
      `SELECT * FROM ${SHARE_TABLES.character_skill_grants}
       WHERE character_id = ? AND state = 'active'
       ORDER BY source_instance_id, grant_key, ordinal, id`,
      [characterId],
    )
    .flatMap((row) => {
      const ref = owners.get(Number(row.source_instance_id))?.ref;
      if (ref === undefined) {
        return [];
      }
      return [
        {
          ref,
          grantKey: String(row.grant_key),
          ordinal: Number(row.ordinal),
          ...(row.skill === null || row.skill === undefined
            ? {}
            : { skill: String(row.skill) }),
        },
      ];
    });
  const expertiseGrants = db
    .allRaw(
      `SELECT * FROM ${SHARE_TABLES.character_skill_expertise_grants}
       WHERE character_id = ? AND state = 'active'
       ORDER BY source_instance_id, grant_key, ordinal, id`,
      [characterId],
    )
    .flatMap((row) => {
      const ref = owners.get(Number(row.source_instance_id))?.ref;
      if (ref === undefined) {
        return [];
      }
      return [
        {
          ref,
          grantKey: String(row.grant_key),
          ordinal: Number(row.ordinal),
          grantedAtClassLevel: Number(row.granted_at_class_level),
          ...(row.skill === null || row.skill === undefined
            ? {}
            : { skill: String(row.skill) }),
        },
      ];
    });
  const levelFeatChoices = db
    .allRaw(
      `SELECT * FROM ${SHARE_TABLES.character_level_feat_choices}
       WHERE character_id = ?
       ORDER BY character_class_level_id, class_level, choice_kind, id`,
      [characterId],
    )
    .map((row) => {
      const classRef = classRefsByLevelId.get(
        Number(row.character_class_level_id),
      );
      if (classRef === undefined) {
        throw new ShareValidationError(
          'a level feat choice names an unavailable class level.',
        );
      }
      const featRef = row.feat_source_instance_id === null
        ? undefined
        : directOwners.get(Number(row.feat_source_instance_id))?.ref;
      if (
        row.feat_source_instance_id !== null &&
        featRef === undefined
      ) {
        throw new ShareValidationError(
          'a level feat choice names an unavailable feat source.',
        );
      }
      return {
        classRef,
        classLevel: Number(row.class_level),
        choiceKind: String(row.choice_kind) as
          'asi_level_feat' | 'epic_boon',
        ...(featRef === undefined ? {} : { featRef }),
      };
    });
  const sharedSpellKeys = new Set([
    ...selections.map((selection) => selection.spellKey),
    ...spellbook.flatMap((acquisition) =>
      acquisition.spellKey === undefined
        ? []
        : [acquisition.spellKey]
    ),
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
      ...(alignment === undefined ? {} : { alignment }),
      ...(appearance === undefined ? {} : { appearance }),
      ...(backstory === undefined ? {} : { backstory }),
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
    // Omitted when empty, on the same terms as every section above: a character
    // with no effects produces a link exactly the shape it was before the
    // effect model existed.
    ...(effects.length === 0 ? {} : { effects }),
    ...(skillGrants.length === 0 ? {} : { skillGrants }),
    ...(expertiseGrants.length === 0 ? {} : { expertiseGrants }),
    ...(levelFeatChoices.length === 0 ? {} : { levelFeatChoices }),
    ...(items.length === 0 ? {} : { items }),
    ...(attunementSlots === undefined ||
    attunementSlots.every((slot) => slot === null)
      ? {}
      : { attunementSlots }),
  };
  return validateShareDocument(document);
}

function definitionByResolvedKey(
  db: DatabaseContext,
  table: string,
  key: ContentKey,
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

interface ShareCatalogReference {
  readonly kind: ContentKind;
  readonly contentKey: ContentKey;
  readonly issueType: 'class' | 'subclass' | ShareSource['type'] | 'spell';
}

interface PreparedShareReferences {
  readonly nodes: readonly ContentImportNode[];
  readonly markersByNodeId: ReadonlyMap<string, string>;
  readonly targets: ReadonlyMap<string, ContentKey>;
  readonly missingSpellKeys: ReadonlySet<string>;
  readonly issues: readonly ShareImportIssue[];
}

function referenceMarker(kind: ContentKind, contentKey: string): string {
  return `${kind}\u0000${contentKey}`;
}

function shareSpellKeys(document: CharacterShareDocument): readonly string[] {
  return [...new Set([
    ...document.selections.map((row) => row.spellKey),
    ...document.spellbook.flatMap((row) =>
      row.spellKey === undefined ? [] : [row.spellKey]
    ),
    ...document.preferences.map((row) => row.spellKey),
    ...(document.loadouts ?? []).flatMap((row) =>
      row.entries.map((entry) => entry.spellKey),
    ),
  ])];
}

function shareCatalogReferences(
  document: CharacterShareDocument,
): readonly ShareCatalogReference[] {
  const references: ShareCatalogReference[] = [];
  for (const item of document.classes) {
    references.push({
      kind: 'class',
      contentKey: item.classKey as ContentKey,
      issueType: 'class',
    });
    if (item.subclassKey !== undefined) {
      references.push({
        kind: 'subclass',
        contentKey: item.subclassKey as ContentKey,
        issueType: 'subclass',
      });
    }
  }
  for (const item of document.sources) {
    if (item.generated === true) continue;
    references.push({
      kind: item.type,
      contentKey: item.key as ContentKey,
      issueType: item.type,
    });
  }
  for (const contentKey of shareSpellKeys(document)) {
    references.push({
      kind: 'spell',
      contentKey: contentKey as ContentKey,
      issueType: 'spell',
    });
  }
  const seen = new Set<string>();
  return Object.freeze(references.filter((reference) => {
    const marker = referenceMarker(reference.kind, reference.contentKey);
    if (seen.has(marker)) return false;
    seen.add(marker);
    return true;
  }));
}

function missingReferenceIssue(reference: ShareCatalogReference): ShareImportIssue {
  switch (reference.issueType) {
    case 'class': return missingClassIssue(reference.contentKey);
    case 'subclass': return missingSubclassIssue(reference.contentKey);
    case 'feat':
    case 'species':
    case 'background':
      return missingSourceIssue(reference.issueType, reference.contentKey);
    case 'spell':
      throw new Error('Missing spells become placeholders, not compatibility issues.');
  }
}

function prepareShareReferences(
  db: DatabaseContext,
  document: CharacterShareDocument,
): PreparedShareReferences {
  const nodes: ContentImportNode[] = [];
  const markersByNodeId = new Map<string, string>();
  const targets = new Map<string, ContentKey>();
  const missingSpellKeys = new Set<string>();
  const issues: ShareImportIssue[] = [];
  for (const reference of shareCatalogReferences(document)) {
    const marker = referenceMarker(reference.kind, reference.contentKey);
    const resolution = resolveContentReference(db, {
      kind: reference.kind,
      contentKey: reference.contentKey,
    });
    if (resolution.kind === 'missing') {
      if (reference.kind === 'spell') {
        missingSpellKeys.add(reference.contentKey);
      } else {
        issues.push(missingReferenceIssue(reference));
      }
      continue;
    }
    if (resolution.kind === 'ambiguous') {
      issues.push(ambiguousReferenceIssue(
        reference.issueType,
        reference.contentKey,
        resolution.candidates,
      ));
      continue;
    }
    targets.set(marker, resolution.contentKey);
    if (!resolution.reviewRequired) continue;
    const hasRegisteredFingerprint = db.scalar<number>(
      `SELECT 1 FROM catalog_content_fingerprints
       WHERE content_kind = ? AND content_key = ? LIMIT 1`,
      [reference.kind, resolution.contentKey],
    ) === 1;
    if (!hasRegisteredFingerprint && reference.kind !== 'subclass') {
      issues.push(unprojectableReferenceIssue(
        reference.issueType,
        reference.contentKey,
      ));
      continue;
    }
    let node: ContentImportNode;
    try {
      // A subclass's own current fingerprint is not the test for whether its
      // live aggregate can be reviewed. The subclass projector validates its
      // stored rows and every fingerprinted dependency (including its parent
      // class), so an asserted subclass with an absent root fingerprint is
      // still safe to present for explicit Match. Other kinds retain the
      // registry-integrity requirement above.
      node = localContentReferenceImportNode(db, {
        id: `${reference.kind}:share:${reference.contentKey}`,
        kind: reference.kind,
        incomingContentKey: reference.contentKey,
        localContentKey: resolution.contentKey,
      });
    } catch {
      issues.push(unprojectableReferenceIssue(
        reference.issueType,
        reference.contentKey,
      ));
      continue;
    }
    nodes.push(node);
    markersByNodeId.set(node.id, marker);
  }
  return Object.freeze({
    nodes: Object.freeze(nodes),
    markersByNodeId,
    targets,
    missingSpellKeys,
    issues: Object.freeze(issues),
  });
}

function targetKey(
  targets: ReadonlyMap<string, ContentKey>,
  kind: ContentKind,
  incomingKey: string,
): ContentKey {
  const resolved = targets.get(referenceMarker(kind, incomingKey));
  if (resolved === undefined) {
    throw new ShareValidationError(
      `catalog definition '${incomingKey}' is unavailable.`,
    );
  }
  return resolved;
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
  targets?: ReadonlyMap<string, ContentKey>,
): readonly ShareImportIssue[] {
  const prepared = targets === undefined
    ? prepareShareReferences(db, document)
    : null;
  const resolvedTargets = targets ?? prepared?.targets ?? new Map();
  const issues: ShareImportIssue[] = [...(prepared?.issues ?? [])];

  for (const item of document.classes) {
    const resolvedClassKey = resolvedTargets.get(
      referenceMarker('class', item.classKey),
    );
    const classRow = resolvedClassKey === undefined
      ? null
      : definitionByResolvedKey(db, 'class_definitions', resolvedClassKey);
    if (item.subclassKey === undefined) {
      continue;
    }
    const resolvedSubclassKey = resolvedTargets.get(
      referenceMarker('subclass', item.subclassKey),
    );
    const subclassRow = resolvedSubclassKey === undefined
      ? null
      : definitionByResolvedKey(db, 'subclass_definitions', resolvedSubclassKey);
    if (
      subclassRow !== null &&
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
    if (item.generated === true) {
      continue;
    }
    const table = SOURCE_TABLES[item.type];
    const key = item.key as string;
    const resolvedKey = resolvedTargets.get(referenceMarker(item.type, key));
    if (resolvedKey === undefined) continue;
    const row = definitionByResolvedKey(db, table, resolvedKey);
    const seen = (sourceCounts.get(resolvedKey) ?? 0) + 1;
    sourceCounts.set(resolvedKey, seen);
    if (seen === 2 && Number(row.repeatable) !== 1) {
      issues.push(
        notRepeatableIssue(item.type, key, String(row.name)),
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
  resolvedContentKey?: ContentKey,
): number {
  const resolution = resolvedContentKey === undefined
    ? resolveContentReference(db, {
        kind: 'spell',
        contentKey: key as ContentKey,
      })
    : Object.freeze({
        kind: 'exact' as const,
        contentKey: resolvedContentKey,
        matchClass: 'stored-key' as const,
        reviewRequired: false as const,
      });
  if (resolution.kind === 'ambiguous') {
    throw new ShareImportCompatibilityError([
      ambiguousReferenceIssue('spell', key, resolution.candidates),
    ]);
  }
  if (resolvedContentKey === undefined && resolution.reviewRequired) {
    throw new ShareValidationError(
      `spell reference '${key}' requires content adoption review.`,
    );
  }
  const existing = resolution.kind === 'missing'
    ? null
    : db.oneRaw(
        'SELECT id FROM spell_versions WHERE content_key = ?',
        [resolution.contentKey],
      );
  if (existing !== null) {
    return Number(existing.id);
  }
  const name = (displayName ?? fallbackSpellName(key)).slice(0, 120);
  const now = timestamp();
  registerAssertedPlaceholderContentIdentity(db, {
    contentKey: key,
    normalizedName: normalizeContentIdentityName(name),
  });
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
  for (const acquisition of document.spellbook) {
    if (
      acquisition.spellKey === undefined ||
      acquisition.spellName === undefined
    ) {
      continue;
    }
    const current = names.get(acquisition.spellKey);
    if (current === undefined || acquisition.spellName < current) {
      names.set(acquisition.spellKey, acquisition.spellName);
    }
  }
  for (const placeholder of document.placeholders ?? []) {
    names.set(placeholder.spellKey, placeholder.spellName);
  }
  return names;
}

const PREVIEW_ROLLBACK = new Error('Rollback successful share preview.');

function shareOperationIdentity(document: CharacterShareDocument): string {
  return sha256(canonicalJson(document));
}

function targetsForPlan(
  prepared: PreparedShareReferences,
  plan: ContentImportPlan,
): ReadonlyMap<string, ContentKey> {
  const targets = new Map(prepared.targets);
  for (const outcome of plan.outcomes) {
    if (outcome.kind === 'refused') continue;
    const marker = prepared.markersByNodeId.get(outcome.id);
    if (marker !== undefined) targets.set(marker, outcome.contentKey);
  }
  return targets;
}

function throwCompatibilityIssues(issues: readonly ShareImportIssue[]): void {
  if (issues.length > 0) throw new ShareImportCompatibilityError(issues);
}

function shareImportPlan(
  db: DatabaseContext,
  document: CharacterShareDocument,
  choices: ContentImportChoices,
): {
  readonly prepared: PreparedShareReferences;
  readonly plan: ContentImportPlan;
  readonly targets: ReadonlyMap<string, ContentKey>;
} {
  const prepared = prepareShareReferences(db, document);
  throwCompatibilityIssues(prepared.issues);
  const plan = planContentImport(
    db,
    prepared.nodes,
    choices,
    Object.freeze([]),
    shareOperationIdentity(document),
  );
  return Object.freeze({
    prepared,
    plan,
    targets: targetsForPlan(prepared, plan),
  });
}

function assertImportableWithoutMutation(
  db: DatabaseContext,
  document: CharacterShareDocument,
  prepared: PreparedShareReferences,
  plan: ContentImportPlan,
  targets: ReadonlyMap<string, ContentKey>,
  choices: ContentImportChoices,
): void {
  try {
    db.transaction(() => {
      const createsClone = Object.values(choices).some(
        (choice) => choice.decision === 'clone',
      );
      if (!createsClone) {
        throwCompatibilityIssues(
          assessImportCompatibility(db, document, targets),
        );
        insertCharacterShare(db, document, targets);
        throw PREVIEW_ROLLBACK;
      }
      const result = commitContentImport(db, {
        nodes: prepared.nodes,
        token: plan.token,
        choices,
        operationIdentity: shareOperationIdentity(document),
        afterInstall: (database) => {
          throwCompatibilityIssues(
            assessImportCompatibility(database, document, targets),
          );
          insertCharacterShare(database, document, targets);
        },
      });
      if (result.kind !== 'committed') {
        throw new ShareValidationError(
          'Share content adoption could not be simulated.',
        );
      }
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
  choices: ContentImportChoices = Object.freeze({}),
): SharePreview {
  const document = validateShareDocument(input);
  const planned = shareImportPlan(db, document, choices);
  assertImportableWithoutMutation(
    db,
    document,
    planned.prepared,
    planned.plan,
    planned.targets,
    choices,
  );
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
    placeholderCount: planned.prepared.missingSpellKeys.size,
    weaponCount: document.weapons?.length ?? 0,
    armorCount: document.armor?.length ?? 0,
    hitPointRollCount: document.hitPointRolls?.length ?? 0,
    skillProficiencyCount: document.skillProficiencies?.length ?? 0,
    includesAcknowledgements:
      document.acknowledgements !== undefined,
    includesLoadouts: document.loadouts !== undefined,
    includesWrittenText:
      document.character.alignment !== undefined ||
      document.character.appearance !== undefined ||
      document.character.backstory !== undefined ||
      document.character.notes !== undefined,
    adoptionPlan: planned.plan,
  };
}

function insertCharacterShare(
  db: DatabaseContext,
  document: CharacterShareDocument,
  targets: ReadonlyMap<string, ContentKey>,
): ShareImportResult {
  return db.transaction(() => {
    const now = timestamp();
    const c = document.character;
    const characterId = db.exec(
      `INSERT INTO characters (
         name, strength, dexterity, constitution, intelligence, wisdom,
         charisma, ability_allocation_method, proficiency_bonus_override,
         rules_edition_preference, allow_legacy, revision,
         alignment, appearance, backstory, notes,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
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
        c.alignment ?? null,
        c.appearance ?? null,
        c.backstory ?? null,
        // A document that carries no note leaves the recipient's column at its
        // own NULL, which is what a link minted before Q12 has always produced.
        c.notes ?? null,
        now,
        now,
      ],
    ).lastInsertId;
    const generator = new GrantRuleSlotGenerator(db);
    const rootsByRef = new Map<number, number[]>();
    const classLevelIdsByRef = new Map<number, number>();

    for (const item of [...document.classes].sort(
      (left, right) => left.start - right.start || left.id - right.id,
    )) {
      const classRow = definitionByResolvedKey(
        db,
        'class_definitions',
        targetKey(targets, 'class', item.classKey),
      );
      const subclassRow =
        item.subclassKey === undefined
          ? null
          : definitionByResolvedKey(
              db,
              'subclass_definitions',
              targetKey(targets, 'subclass', item.subclassKey),
            );
      if (
        subclassRow !== null &&
        Number(subclassRow.class_definition_id) !== Number(classRow.id)
      ) {
        throw new ShareValidationError(
          `subclass '${item.subclassKey}' does not belong to '${item.classKey}'.`,
        );
      }
      const classLevelId = db.exec(
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
      ).lastInsertId;
      classLevelIdsByRef.set(item.id, classLevelId);
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
      if (item.generated === true) {
        const sourceId = db.exec(
          `INSERT INTO ${SHARE_TABLES.character_source_instances} (
             character_id, instance_uuid, source_type, source_definition_id,
             display_name, config, acquired_at_character_level, state, notes,
             created_at, updated_at
           ) VALUES (?, ?, 'species', NULL, ?, ?, ?, 'active', ?, ?, ?)`,
          [
            characterId,
            crypto.randomUUID(),
            item.name ?? 'Generated species',
            JSON.stringify(item.config ?? {}),
            item.acquired,
            GUIDED_SPECIES_SOURCE_MARKER,
            now,
            now,
          ],
        ).lastInsertId;
        rootsByRef.set(item.id, [sourceId]);
        continue;
      }
      const key = item.key as string;
      const sourceRow = definitionByResolvedKey(
        db,
        SOURCE_TABLES[item.type],
        targetKey(targets, item.type, key),
      );
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

    for (const choice of document.levelFeatChoices ?? []) {
      const classLevelId = classLevelIdsByRef.get(choice.classRef);
      const featSourceId = choice.featRef === undefined
        ? null
        : rootsByRef.get(choice.featRef)?.[0];
      if (classLevelId === undefined || featSourceId === undefined) {
        throw new ShareValidationError(
          'a level feat choice reference is unavailable.',
        );
      }
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_level_feat_choices} (
           character_id, character_class_level_id, class_level, choice_kind,
           feat_source_instance_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          classLevelId,
          choice.classLevel,
          choice.choiceKind,
          featSourceId,
          now,
          now,
        ],
      );
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

    // THE SKILL GRANTS. The generator above has already MINTED the class
    // grants (unfilled) while materialising each class source, so a class
    // grant in the document FILLS the minted row — resolved through the same
    // descendants search `selections` uses, keyed on (grant_key, ordinal). A
    // grant the generator does not mint (a background's or species', produced
    // outside the generator) is inserted document-driven under the ref's own
    // root. Exactly-one resolution mirrors the selection-slot rule: an
    // ambiguous match means the recipient's catalog mints a different grant
    // set than the sender's, and silently picking one would be wrong
    // provenance — the trap §5 names.
    for (const grant of document.skillGrants ?? []) {
      const roots = rootsByRef.get(grant.ref);
      if (roots === undefined) {
        throw new ShareValidationError(
          `skill grant ref ${grant.ref} is unavailable.`,
        );
      }
      const sourceIds = [...descendants(roots)];
      const minted = db.allRaw(
        `SELECT id FROM ${SHARE_TABLES.character_skill_grants}
         WHERE character_id = ? AND grant_key = ? AND ordinal = ?
           AND source_instance_id IN (${sourceIds.map(() => '?').join(', ')})
         ORDER BY id`,
        [characterId, grant.grantKey, grant.ordinal, ...sourceIds],
      );
      if (minted.length > 1) {
        throw new ShareValidationError(
          `skill grant ${grant.grantKey} #${grant.ordinal} is ambiguous.`,
        );
      }
      if (minted.length === 1) {
        db.exec(
          `UPDATE ${SHARE_TABLES.character_skill_grants}
           SET skill = ?, updated_at = ?
           WHERE id = ?`,
          [grant.skill ?? null, now, Number((minted[0] as Row).id)],
        );
        continue;
      }
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_skill_grants} (
           character_id, source_instance_id, grant_key, ordinal,
           skill, state, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          characterId,
          roots[0] as number,
          grant.grantKey,
          grant.ordinal,
          grant.skill ?? null,
          now,
          now,
        ],
      );
    }
    for (const grant of document.expertiseGrants ?? []) {
      const roots = rootsByRef.get(grant.ref);
      if (roots === undefined) {
        throw new ShareValidationError(
          `expertise grant ref ${grant.ref} is unavailable.`,
        );
      }
      const sourceIds = [...descendants(roots)];
      const minted = db.allRaw(
        `SELECT id FROM ${SHARE_TABLES.character_skill_expertise_grants}
         WHERE character_id = ? AND grant_key = ? AND ordinal = ?
           AND source_instance_id IN (${sourceIds.map(() => '?').join(', ')})
         ORDER BY id`,
        [characterId, grant.grantKey, grant.ordinal, ...sourceIds],
      );
      if (minted.length > 1) {
        throw new ShareValidationError(
          `expertise grant ${grant.grantKey} #${grant.ordinal} is ambiguous.`,
        );
      }
      if (minted.length === 1) {
        db.exec(
          `UPDATE ${SHARE_TABLES.character_skill_expertise_grants}
           SET skill = ?, granted_at_class_level = ?, updated_at = ?
           WHERE id = ?`,
          [
            grant.skill ?? null,
            grant.grantedAtClassLevel,
            now,
            Number((minted[0] as Row).id),
          ],
        );
        continue;
      }
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_skill_expertise_grants} (
           character_id, source_instance_id, grant_key, ordinal,
           granted_at_class_level, skill, state, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          characterId,
          roots[0] as number,
          grant.grantKey,
          grant.ordinal,
          grant.grantedAtClassLevel,
          grant.skill ?? null,
          now,
          now,
        ],
      );
    }
    const names = spellNameMap(document);
    const spellIds = new Map<string, number>();
    const resolveSpell = (key: string): number => {
      let id = spellIds.get(key);
      if (id === undefined) {
        id = ensureSharedSpell(
          db,
          key,
          names.get(key),
          targets.get(referenceMarker('spell', key)),
        );
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
             selection_acquired_at_class_level = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          resolveSpell(selection.spellKey),
          selection.keep === true ? 'kept_override' : 'active',
          selection.keep === true ? 'Imported keep override.' : null,
          selection.acquiredAtClassLevel ?? null,
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

    for (const acquisition of document.spellbook) {
      const spellId =
        acquisition.spellKey === undefined
          ? null
          : resolveSpell(acquisition.spellKey);
      if (
        acquisition.ref !== undefined &&
        acquisition.ruleKey !== undefined &&
        acquisition.ordinal !== undefined
      ) {
        const roots = rootsByRef.get(acquisition.ref);
        if (roots === undefined) {
          throw new ShareValidationError(
            `spellbook ref ${acquisition.ref} is unavailable.`,
          );
        }
        const sourceIds = [...descendants(roots)];
        const rows = db.allRaw(
          `SELECT id
           FROM ${SHARE_TABLES.wizard_spellbook_entries}
           WHERE character_id = ? AND rule_key = ? AND ordinal = ?
             AND source_instance_id IN (${sourceIds.map(() => '?').join(', ')})
             AND state = 'active'
           ORDER BY id`,
          [
            characterId,
            acquisition.ruleKey,
            acquisition.ordinal,
            ...sourceIds,
          ],
        );
        if (rows.length !== 1) {
          throw new ShareImportCompatibilityError([
            selectionSlotIssue(
              acquisition.ruleKey,
              acquisition.ordinal,
              rows.length,
            ),
          ]);
        }
        const entryId = Number((rows[0] as Row).id);
        db.exec(
          `UPDATE ${SHARE_TABLES.wizard_spellbook_entries}
           SET spell_version_id = ?,
               acquired_at_class_level = ?,
               selection_eligibility = ?,
               selection_invalid_reason = NULL,
               updated_at = ?
           WHERE id = ?`,
          [
            spellId,
            acquisition.acquiredAtClassLevel ?? null,
            spellId === null ? 'unselected' : 'valid',
            now,
            entryId,
          ],
        );
        eligibility.refreshSpellbookAcquisition(entryId, now);
        continue;
      }
      db.exec(
        `INSERT OR IGNORE INTO ${SHARE_TABLES.wizard_spellbook_entries} (
           character_id, acquired_at_class_level, spell_version_id,
           selection_eligibility, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          acquisition.acquiredAtClassLevel ?? null,
          spellId,
          spellId === null ? 'unselected' : 'valid',
          now,
          now,
        ],
      );
      if (spellId !== null) {
        const entryId = db.scalar<number>(
          `SELECT id
           FROM ${SHARE_TABLES.wizard_spellbook_entries}
           WHERE character_id = ? AND spell_version_id = ?
             AND state = 'active'`,
          [characterId, spellId],
        );
        if (entryId !== null) {
          eligibility.refreshSpellbookAcquisition(entryId, now);
        }
      }
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
    const weaponIds: number[] = [];
    for (const weapon of document.weapons ?? []) {
      const inserted = db.exec(
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
      weaponIds.push(inserted.lastInsertId);
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
    // ITEMS MUST PRECEDE EFFECTS. Wire references are local array indexes;
    // this insertion map translates them to the recipient's database ids.
    const itemIds: number[] = [];
    for (const item of document.items ?? []) {
      const roots =
        item.sourceRef === undefined
          ? undefined
          : rootsByRef.get(item.sourceRef);
      if (item.sourceRef !== undefined && roots === undefined) {
        throw new ShareValidationError(
          `item sourceRef ${item.sourceRef} is unavailable.`,
        );
      }
      const inserted = db.exec(
        `INSERT INTO ${SHARE_TABLES.character_items} (
           character_id, name, description, quantity, requires_attunement,
           source_instance_id, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          item.name,
          item.description ?? null,
          item.quantity,
          item.requires_attunement ? 1 : 0,
          roots?.[0] ?? null,
          now,
          now,
        ],
      );
      itemIds.push(inserted.lastInsertId);
    }
    if (document.attunementSlots !== undefined) {
      const mapped = document.attunementSlots.map((ref) =>
        ref === null ? null : itemIds[ref] ?? null,
      );
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_attunement_slots} (
           character_id, slot_1_item_id, slot_2_item_id, slot_3_item_id
         ) VALUES (?, ?, ?, ?)`,
        [characterId, mapped[0], mapped[1], mapped[2]],
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
      ability: string | null;
      amount: number | null;
      maximum: number | null;
      base: number | null;
      ability_1: string | null;
      ability_2: string | null;
      allows_shield: boolean | null;
      weapon_scope: string | null;
      notes: string | null;
      sourceId: number | null;
      itemId: number | null;
      weaponId: number | null;
      templateRef: string | null;
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
        ability: effect.ability ?? null,
        amount: effect.amount ?? null,
        maximum: effect.maximum ?? null,
        base: effect.base ?? null,
        ability_1: effect.ability_1 ?? null,
        ability_2: effect.ability_2 ?? null,
        allows_shield: effect.allows_shield ?? null,
        weapon_scope: effect.weapon_scope ?? null,
        notes: effect.notes ?? null,
        // For `ability_increase` this is non-null by validation: `shareEffect`
        // refuses the document when the kind arrives without a `sourceRef`, so
        // the required-source CHECK below cannot fire on an imported row.
        sourceId: roots?.[rootIndex] ?? null,
        itemId:
          effect.itemRef === undefined
            ? null
            : (itemIds[effect.itemRef] as number),
        weaponId:
          effect.weaponRef === undefined
            ? null
            : (weaponIds[effect.weaponRef] as number),
        templateRef: effect.template_ref ?? null,
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
        // A legacy trait payload predates the contribution layer, and the
        // legacy vocabulary has no ability_increase — nor any AC-1 kind — to
        // migrate.
        ability: null,
        amount: null,
        maximum: null,
        base: null,
        ability_1: null,
        ability_2: null,
        allows_shield: null,
        weapon_scope: null,
        notes: null,
        // A legacy link predates the provenance column entirely, so there is
        // nothing to resolve and nothing is invented.
        sourceId: null,
        itemId: null,
        weaponId: null,
        templateRef: null,
      });
    }
    for (const [index, effect] of importedEffects.entries()) {
      db.exec(
        `INSERT INTO ${SHARE_TABLES.character_effects} (
           character_id, sort_order, effect_kind, damage_type,
           hit_points_flat, hit_points_per_level, speed_bonus_feet,
           ability, amount, maximum,
           base, ability_1, ability_2, allows_shield, weapon_scope,
           source_instance_id, character_item_id, character_weapon_id,
           template_ref, label, notes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          index + 1,
          effect.kind,
          effect.damage_type,
          effect.hit_points_flat,
          effect.hit_points_per_level,
          effect.speed_bonus_feet,
          effect.ability,
          effect.amount,
          effect.maximum,
          effect.base,
          effect.ability_1,
          effect.ability_2,
          effect.allows_shield === null ? null : (effect.allows_shield ? 1 : 0),
          effect.weapon_scope,
          effect.sourceId,
          effect.itemId,
          effect.weaponId,
          effect.templateRef,
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
    // The projection reconciler runs LAST — after the grants were filled AND
    // after the document-driven `character_skill_proficiencies` inserts, so
    // it reconciles the final state of both rather than racing the flat
    // inserts into a unique-index abort. Guarded on the document actually
    // carrying grants: a v5 document without the section describes a
    // character whose flat rows are its only truth, and reconciling those
    // against nothing would delete them (plan §3.2's restored-as-is rule).
    if ((document.skillGrants ?? []).length > 0) {
      rebuildSkillProjection(db, characterId);
    }
    reconcileCharacterSkillExpertise(db, characterId);
    return { characterId };
  });
}

export function commitCharacterShareImport(
  db: DatabaseContext,
  input: unknown,
  token: ContentImportPlanToken,
  choices: ContentImportChoices = Object.freeze({}),
): ShareImportCommitResult {
  const document = validateShareDocument(input);
  const planned = shareImportPlan(db, document, choices);
  let imported: ShareImportResult | null = null;
  const committed = commitContentImport(db, {
    nodes: planned.prepared.nodes,
    token,
    choices,
    operationIdentity: shareOperationIdentity(document),
    afterInstall: (database) => {
      throwCompatibilityIssues(
        assessImportCompatibility(database, document, planned.targets),
      );
      imported = insertCharacterShare(database, document, planned.targets);
    },
  });
  if (committed.kind !== 'committed') return committed;
  if (imported === null) {
    throw new Error('Committed share import did not create a character.');
  }
  return Object.freeze({ ...committed, result: imported });
}

/**
 * Sharing's direct import seam remains available for callers whose references
 * need no review. Review-required links must use preview + commit so the common
 * adoption dialog is never bypassed.
 */
export function importCharacterShare(
  db: DatabaseContext,
  input: unknown,
): ShareImportResult {
  const preview = previewCharacterShare(db, input);
  if (preview.adoptionPlan.reviews.length > 0) {
    throw new ShareValidationError(
      'Share content adoption requires review before import.',
    );
  }
  const committed = commitCharacterShareImport(
    db,
    input,
    preview.adoptionPlan.token,
  );
  if (committed.kind !== 'committed') {
    throw new ShareValidationError('Share content adoption was refused.');
  }
  return committed.result;
}
