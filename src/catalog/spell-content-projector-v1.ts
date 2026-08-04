import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  effectReliabilityCategories,
  isEnumValue,
  rulesEditions,
  spellSchool,
  type EffectReliabilityCategory,
  type MaterialCostKind,
  type RulesEdition,
  type SpellAreaShape,
  type SpellRangeKind,
  type SpellSchool,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { JsonValue } from '../domain/models';
import {
  encodeSpellComponents,
  parseSpellComponents,
} from '../domain/spell-components';
import {
  SPELL_CANTRIP_UPGRADE_LEVEL_MAX,
  SPELL_CANTRIP_UPGRADE_LEVEL_MIN,
  SPELL_LEVEL_MAX,
  SPELL_LEVEL_MIN,
  SPELL_UPCAST_LEVEL_MAX,
  SPELL_UPCAST_LEVEL_MIN,
} from '../domain/spell-limits';
import { encodeSpellRange, parseSpellRange } from '../domain/spell-range';
import type { NormalizedCatalogRecord } from './catalog-normalize';
import { trimEqualCatalogLocator } from './catalog-field-values';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  contentIdentitySet,
  type CanonicalOpenPassthroughValue,
  type CanonicalRuleText,
  type ContentIdentitySet,
} from './content-identity';
import { spellActionType, spellTags } from './spell-document-semantics';

type StoredMember<T> = {
  readonly value: T;
  readonly stored_fields?: Readonly<Record<string, JsonValue>>;
};

type CanonicalStoredMember<T> =
  | T
  | {
      readonly value: T;
      readonly stored_fields: Readonly<Record<string, JsonValue>>;
    };

export interface SpellContentAggregateV1 {
  readonly kind: 'spell';
  readonly name: string;
  readonly rules_edition: RulesEdition;
  readonly spell_identity_key: string;
  readonly spell_version_key: string;
  readonly level: number;
  readonly school: SpellSchool;
  readonly ritual: boolean;
  readonly concentration: boolean;
  readonly casting_time: string | null;
  readonly action_type: string | null;
  readonly range: string | null;
  readonly range_kind: SpellRangeKind | null;
  readonly range_feet: number | null;
  readonly area_shape: SpellAreaShape | null;
  readonly area_feet: number | null;
  readonly duration: string | null;
  readonly components: string | null;
  readonly material_component_summary: string | null;
  readonly material_cost_copper: number | null;
  readonly material_cost_kind: MaterialCostKind | null;
  readonly healing: boolean;
  readonly short_summary: string | null;
  readonly upcast_summary: string | null;
  readonly cantrip_upgrade_summary: string | null;
  readonly requires_mod_for_effect: boolean;
  readonly effect_reliability_category: EffectReliabilityCategory;
  readonly spell_lists: readonly StoredMember<string>[];
  readonly tags: readonly StoredMember<string>[];
  readonly attack_modes: readonly StoredMember<string>[];
  readonly save_abilities: readonly StoredMember<string>[];
  readonly upcast_levels: readonly StoredMember<number>[];
  readonly cantrip_upgrade_levels: readonly StoredMember<number>[];
  readonly stored_fields?: Readonly<Record<string, JsonValue>>;
}

export interface SpellProjectorPayloadV1 {
  readonly spell_identity_key: string;
  readonly spell_version_key: string;
  readonly level: number;
  readonly school: CanonicalOpenPassthroughValue;
  readonly ritual: boolean;
  readonly concentration: boolean;
  readonly casting_time: CanonicalRuleText | null;
  readonly action_type: CanonicalOpenPassthroughValue | null;
  readonly range: CanonicalRuleText | null;
  readonly range_kind: SpellRangeKind | null;
  readonly range_feet: number | null;
  readonly area_shape: SpellAreaShape | null;
  readonly area_feet: number | null;
  readonly duration: CanonicalRuleText | null;
  readonly components: CanonicalRuleText | null;
  readonly material_component_summary: CanonicalRuleText | null;
  readonly material_cost_copper: number | null;
  readonly material_cost_kind: MaterialCostKind | null;
  readonly healing: boolean;
  readonly short_summary: CanonicalRuleText | null;
  readonly upcast_summary: CanonicalRuleText | null;
  readonly cantrip_upgrade_summary: CanonicalRuleText | null;
  readonly requires_mod_for_effect: boolean;
  readonly effect_reliability_category: EffectReliabilityCategory;
  readonly spell_lists: ContentIdentitySet<CanonicalStoredMember<CanonicalOpenPassthroughValue>>;
  readonly tags: ContentIdentitySet<CanonicalStoredMember<CanonicalOpenPassthroughValue>>;
  readonly attack_modes: ContentIdentitySet<CanonicalStoredMember<CanonicalOpenPassthroughValue>>;
  readonly save_abilities: ContentIdentitySet<CanonicalStoredMember<CanonicalOpenPassthroughValue>>;
  readonly upcast_levels: ContentIdentitySet<CanonicalStoredMember<number>>;
  readonly cantrip_upgrade_levels: ContentIdentitySet<CanonicalStoredMember<number>>;
  readonly stored_fields?: Readonly<Record<string, JsonValue>>;
}

export interface SpellProjectorContractV1 {
  readonly kind: 'spell';
  readonly aggregate: SpellContentAggregateV1;
  readonly payload: SpellProjectorPayloadV1;
  readonly references: readonly [];
}

export class SpellContentProjectionError extends TypeError {
  constructor(message: string) {
    super(`Spell content-v1 projection failed: ${message}`);
    this.name = 'SpellContentProjectionError';
  }
}

function refuse(message: string): never {
  throw new SpellContentProjectionError(message);
}

function trimEqual(value: string, label: string): string {
  if (value === '') return refuse(`${label} must not be empty.`);
  return trimEqualCatalogLocator(value, label, refuse);
}

function nonEmpty(value: string, label: string): string {
  if (value.trim() === '') return refuse(`${label} must not be empty.`);
  return value;
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  return refuse(`${label} must be canonical JSON data.`);
}

/**
 * Default-include every future stored column. The exclusions are limited to:
 * numeric relational ids; the envelope's name/edition;
 * extraction provenance and seed version; active/timestamp lifecycle state;
 * and fork ancestry. The stable spell-identity and spell-version keys are
 * projected explicitly because eligibility joins through the concept and
 * attack-cantrip behavior branches on the version key.
 */
function storedFields(row: SqlRow, known: readonly string[]): Readonly<Record<string, JsonValue>> {
  const excluded = new Set([
    ...known,
    'id',
    'content_key',
    'spell_identity_id',
    'display_name',
    'rules_edition',
    'provenance',
    'seed_version',
    'is_active',
    'created_at',
    'updated_at',
    'forked_from_content_key',
  ]);
  return Object.fromEntries(
    Object.entries(row)
      .filter(([column]) => !excluded.has(column))
      .map(([column, value]) => [column, jsonValue(value, `stored column '${column}'`)]),
  );
}

/**
 * Explicit table exclusions:
 * - spell_identities.content_key is included as spell_identity_key and
 *   spell_versions.content_key is included as spell_version_key. Identity
 *   names/notes/timestamps and spell_identity_aliases only resolve/group that
 *   stable concept key and do not alter eligibility after resolution.
 * - spell_version_publications is attribution/import provenance only.
 * - spell_version_damage_types and spell_version_conditions are documented in
 *   db/schema/catalog-spells.ts as dormant, with no production reader/writer.
 * The remaining excluded fields cannot change spell behavior. The concept
 * membership is portable as its stable key; no raw database id enters v1.
 */

function canonicalText(value: string | null): CanonicalRuleText | null {
  return value === null ? null : canonicalRuleText(value);
}

function canonicalMember<T, C>(
  member: StoredMember<T>,
  canonicalize: (value: T) => C,
): CanonicalStoredMember<C> {
  const value = canonicalize(member.value);
  return member.stored_fields === undefined || Object.keys(member.stored_fields).length === 0
    ? value
    : { value, stored_fields: member.stored_fields };
}

export function projectSpellContentAggregateV1(
  aggregate: SpellContentAggregateV1,
): SpellProjectorContractV1 {
  const payload: SpellProjectorPayloadV1 = {
    ...(aggregate.stored_fields === undefined ? {} : { stored_fields: aggregate.stored_fields }),
    spell_identity_key: trimEqual(aggregate.spell_identity_key, 'spell identity key'),
    spell_version_key: trimEqual(aggregate.spell_version_key, 'spell version key'),
    level: aggregate.level,
    school: canonicalOpenPassthroughValue(aggregate.school),
    ritual: aggregate.ritual,
    concentration: aggregate.concentration,
    casting_time: canonicalText(aggregate.casting_time),
    action_type: aggregate.action_type === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.action_type),
    range: canonicalText(aggregate.range),
    range_kind: aggregate.range_kind,
    range_feet: aggregate.range_feet,
    area_shape: aggregate.area_shape,
    area_feet: aggregate.area_feet,
    duration: canonicalText(aggregate.duration),
    components: canonicalText(aggregate.components),
    material_component_summary: canonicalText(aggregate.material_component_summary),
    material_cost_copper: aggregate.material_cost_copper,
    material_cost_kind: aggregate.material_cost_kind,
    healing: aggregate.healing,
    short_summary: canonicalText(aggregate.short_summary),
    upcast_summary: canonicalText(aggregate.upcast_summary),
    cantrip_upgrade_summary: canonicalText(aggregate.cantrip_upgrade_summary),
    requires_mod_for_effect: aggregate.requires_mod_for_effect,
    effect_reliability_category: aggregate.effect_reliability_category,
    spell_lists: contentIdentitySet(aggregate.spell_lists.map((member) =>
      canonicalMember(member, canonicalOpenPassthroughValue))),
    tags: contentIdentitySet(aggregate.tags.map((member) =>
      canonicalMember(member, canonicalOpenPassthroughValue))),
    attack_modes: contentIdentitySet(aggregate.attack_modes.map((member) =>
      canonicalMember(member, canonicalOpenPassthroughValue))),
    save_abilities: contentIdentitySet(aggregate.save_abilities.map((member) =>
      canonicalMember(member, canonicalOpenPassthroughValue))),
    upcast_levels: contentIdentitySet(aggregate.upcast_levels.map((member) =>
      canonicalMember(member, (value) => value))),
    cantrip_upgrade_levels: contentIdentitySet(
      aggregate.cantrip_upgrade_levels.map((member) =>
        canonicalMember(member, (value) => value)),
    ),
  };
  const references: readonly [] = Object.freeze([]);
  return Object.freeze({ kind: 'spell', aggregate, payload, references });
}

export function projectSpellDocumentV1(
  record: NormalizedCatalogRecord,
): SpellProjectorContractV1 {
  trimEqual(record.identityKey, 'identityKey');
  trimEqual(record.versionKey, 'versionKey');
  const range = encodeSpellRange(parseSpellRange(record.range));
  const components = encodeSpellComponents(parseSpellComponents(record.components));
  const member = <T>(value: T): StoredMember<T> => ({ value });
  const aggregate: SpellContentAggregateV1 = {
    kind: 'spell',
    name: record.name,
    rules_edition: record.edition,
    spell_identity_key: trimEqual(record.identityKey, 'identityKey'),
    spell_version_key: trimEqual(record.versionKey, 'versionKey'),
    level: record.level,
    school: record.school,
    ritual: record.ritual,
    concentration: record.concentration,
    casting_time: record.castingTime,
    action_type: spellActionType(record.castingTime),
    range: record.range,
    ...range,
    duration: record.duration,
    components: record.components,
    ...components,
    healing: record.healing,
    short_summary: record.description ?? null,
    upcast_summary: record.upcastSummary,
    cantrip_upgrade_summary: record.cantripUpgradeSummary,
    requires_mod_for_effect: record.requiresModForEffect === true,
    effect_reliability_category: record.effectReliabilityCategory,
    spell_lists: record.spellLists.map((value) => member(trimEqual(value, 'spell list key'))),
    tags: spellTags(record).map(member),
    attack_modes: record.attackModes.map(member),
    save_abilities: record.saveAbilities.map(member),
    upcast_levels: record.upcastLevels.map(member),
    cantrip_upgrade_levels: record.cantripUpgradeLevels.map(member),
  };
  return projectSpellContentAggregateV1(aggregate);
}

function childMembers<T>(
  db: DatabaseContext,
  table: string,
  column: string,
  versionId: number,
  decode: (row: SqlRow) => T,
): readonly StoredMember<T>[] {
  return db.allRaw(
    `SELECT * FROM ${table} WHERE spell_version_id = ? ORDER BY ${column}`,
    [versionId],
  ).map((row) => {
    const fields = storedFields(row, ['spell_version_id', column]);
    return Object.keys(fields).length === 0
      ? { value: decode(row) }
      : { value: decode(row), stored_fields: fields };
  });
}

function bounded(value: number, low: number, high: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < low || value > high) {
    return refuse(`${label} must be an integer from ${String(low)} through ${String(high)}.`);
  }
  return value;
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) refuse(`${label} disagrees with its printed source field.`);
}

export function projectStoredSpellContentV1(
  db: DatabaseContext,
  contentKey: ContentKey,
): SpellProjectorContractV1 {
  trimEqual(contentKey, 'content key');
  const row = db.oneRaw(
    `SELECT version.*, identity.content_key AS spell_identity_key
     FROM spell_versions AS version
     INNER JOIN spell_identities AS identity
       ON identity.id = version.spell_identity_id
     WHERE version.content_key = ?`,
    [contentKey],
  );
  if (row === null) return refuse(`spell '${contentKey}' is missing.`);
  const provenance = sqlString(row, 'provenance');
  if (provenance === 'placeholder') return refuse(`spell '${contentKey}' is a placeholder.`);
  const edition = sqlString(row, 'rules_edition');
  if (!isEnumValue(rulesEditions, edition)) return refuse(`unknown rules edition '${edition}'.`);
  const reliability = sqlString(row, 'effect_reliability_category');
  if (!isEnumValue(effectReliabilityCategories, reliability)) {
    return refuse(`unknown effect reliability category '${reliability}'.`);
  }
  const id = sqlInteger(row, 'id');
  const castingTime = sqlNullableString(row, 'casting_time');
  const rangeText = sqlNullableString(row, 'range');
  const componentText = sqlNullableString(row, 'components');
  const range = encodeSpellRange(parseSpellRange(rangeText));
  const components = encodeSpellComponents(parseSpellComponents(componentText));
  assertEqual(sqlNullableString(row, 'action_type'), spellActionType(castingTime), 'action_type');
  assertEqual(sqlNullableString(row, 'range_kind'), range.range_kind, 'range_kind');
  assertEqual(sqlNullableInteger(row, 'range_feet'), range.range_feet, 'range_feet');
  assertEqual(sqlNullableString(row, 'area_shape'), range.area_shape, 'area_shape');
  assertEqual(sqlNullableInteger(row, 'area_feet'), range.area_feet, 'area_feet');
  assertEqual(sqlNullableString(row, 'material_component_summary'), components.material_component_summary, 'material_component_summary');
  assertEqual(sqlNullableInteger(row, 'material_cost_copper'), components.material_cost_copper, 'material_cost_copper');
  assertEqual(sqlNullableString(row, 'material_cost_kind'), components.material_cost_kind, 'material_cost_kind');

  const rootKnown = [
    'level', 'school', 'ritual', 'concentration', 'casting_time', 'action_type',
    'range', 'range_kind', 'range_feet', 'area_shape', 'area_feet', 'duration',
    'components', 'material_component_summary', 'material_cost_copper',
    'material_cost_kind', 'healing', 'short_summary', 'upcast_summary',
    'cantrip_upgrade_summary', 'requires_mod_for_effect',
    'effect_reliability_category', 'spell_identity_key',
  ];
  const future = storedFields(row, rootKnown);
  const aggregate: SpellContentAggregateV1 = {
    kind: 'spell',
    name: nonEmpty(sqlString(row, 'display_name'), 'display name'),
    rules_edition: edition,
    spell_identity_key: trimEqual(
      sqlString(row, 'spell_identity_key'),
      'spell identity key',
    ),
    spell_version_key: trimEqual(
      sqlString(row, 'content_key'),
      'spell version key',
    ),
    level: bounded(sqlInteger(row, 'level'), SPELL_LEVEL_MIN, SPELL_LEVEL_MAX, 'spell level'),
    school: spellSchool(sqlString(row, 'school')),
    ritual: sqlBoolean(row, 'ritual'),
    concentration: sqlBoolean(row, 'concentration'),
    casting_time: castingTime,
    action_type: sqlNullableString(row, 'action_type'),
    range: rangeText,
    range_kind: range.range_kind,
    range_feet: range.range_feet,
    area_shape: range.area_shape,
    area_feet: range.area_feet,
    duration: sqlNullableString(row, 'duration'),
    components: componentText,
    material_component_summary: components.material_component_summary,
    material_cost_copper: components.material_cost_copper,
    material_cost_kind: components.material_cost_kind,
    healing: sqlBoolean(row, 'healing'),
    short_summary: sqlNullableString(row, 'short_summary'),
    upcast_summary: sqlNullableString(row, 'upcast_summary'),
    cantrip_upgrade_summary: sqlNullableString(row, 'cantrip_upgrade_summary'),
    requires_mod_for_effect: sqlBoolean(row, 'requires_mod_for_effect'),
    effect_reliability_category: reliability,
    spell_lists: childMembers(db, 'spell_list_memberships', 'spell_list_key', id,
      (child) => trimEqual(sqlString(child, 'spell_list_key'), 'spell list key')),
    tags: childMembers(db, 'spell_version_tags', 'tag', id,
      (child) => sqlString(child, 'tag')),
    attack_modes: childMembers(db, 'spell_version_attack_modes', 'attack_mode', id,
      (child) => sqlString(child, 'attack_mode')),
    save_abilities: childMembers(db, 'spell_version_save_abilities', 'save_ability', id,
      (child) => sqlString(child, 'save_ability')),
    upcast_levels: childMembers(db, 'spell_version_upcast_levels', 'level', id,
      (child) => bounded(sqlInteger(child, 'level'), SPELL_UPCAST_LEVEL_MIN, SPELL_UPCAST_LEVEL_MAX, 'upcast level')),
    cantrip_upgrade_levels: childMembers(db, 'spell_version_cantrip_upgrade_levels', 'level', id,
      (child) => bounded(sqlInteger(child, 'level'), SPELL_CANTRIP_UPGRADE_LEVEL_MIN, SPELL_CANTRIP_UPGRADE_LEVEL_MAX, 'cantrip upgrade level')),
    ...(Object.keys(future).length === 0 ? {} : { stored_fields: future }),
  };
  return projectSpellContentAggregateV1(aggregate);
}
