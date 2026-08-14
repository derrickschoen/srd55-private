import type {
  AuthoringGrant,
  BackgroundContentAggregate,
  SpeciesContentAggregate,
} from '../authoring/contracts';
import {
  abilities,
  characterEffectKinds,
  extraAttackWeaponScopes,
  featureTemplateEffectKinds,
  isEnumValue,
  rulesEditions,
  skills,
  type RulesEdition,
} from '../domain/enums';
import { FEATURE_VALUE_CONTRIBUTION_LIMITS } from '../domain/contracts/feature-value-storage-limits';
import {
  decodeStoredSupersedesReference,
  decodeStoredValueExpression,
} from '../domain/contracts/row-rules';
import { featureValueKeys } from '../domain/feature-values';
import type { JsonObject, JsonValue } from '../domain/models';
import { CHARACTER_EFFECT_FORM } from '../authoring/effect-forms';
import {
  AUTHORING_LIST_LIMITS,
  AUTHORING_NUMERIC_LIMITS,
  AUTHORING_TEXT_LIMITS,
} from '../authoring/limits';
import { isRecord } from '../worker/handler';
import { GRANT_RULE_FIELDS, GrantRule } from '../grants/grant-rule';
import { deriveContentIdentityV1 } from './content-identity';
import { CONTENT_FINGERPRINT_SCHEME_V1 } from './content-identity';
import { projectAuthoredContentAggregateV1 } from './stored-authored-content-projector-v1';
import {
  projectClassContentV1,
  projectFeatContentV1,
  type CanonicalClassRowV1,
  type ClassContentAggregateV1,
  type FeatContentAggregateV1,
} from './source-content-projector-v1';
import {
  normalizedGrantSkill,
  normalizedGrantSourceType,
} from './grant-domain-values';

export type SourceCatalogRecordKind = 'class' | 'feat' | 'species' | 'background';

export type CatalogClassRecord = {
  readonly kind: 'class';
  readonly aggregate: ClassContentAggregateV1;
};
export type CatalogFeatRecord = {
  readonly kind: 'feat';
  readonly aggregate: FeatContentAggregateV1;
};
export type CatalogSpeciesRecord = {
  readonly kind: 'species';
  readonly aggregate: SpeciesContentAggregate;
};
export type CatalogBackgroundRecord = {
  readonly kind: 'background';
  readonly aggregate: BackgroundContentAggregate;
};
export type CatalogSourceRecord =
  | CatalogClassRecord
  | CatalogFeatRecord
  | CatalogSpeciesRecord
  | CatalogBackgroundRecord;

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`Catalog field '${label}' must be an object.`);
  return value;
}

function exactKeys(
  value: Record<string, unknown>,
  label: string,
  allowed: readonly string[],
): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unknown !== undefined) {
    throw new TypeError(`Catalog field '${label}.${unknown}' is unknown.`);
  }
}

function trimEqual(value: unknown, label: string): void {
  if (typeof value === 'string' && value !== value.trim()) {
    throw new TypeError(`Catalog field '${label}' contains surrounding whitespace.`);
  }
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Catalog field '${label}' must be non-empty text.`);
  }
  return value;
}

function boundedText(value: unknown, label: string, maximum: number): string {
  const parsed = string(value, label);
  if (parsed.length > maximum) {
    throw new TypeError(`Catalog field '${label}' must contain at most ${String(maximum)} characters.`);
  }
  return parsed;
}

function boundedString(value: unknown, label: string, maximum: number): string {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new TypeError(`Catalog field '${label}' must contain at most ${String(maximum)} characters.`);
  }
  return value;
}

function list(value: unknown, label: string, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new TypeError(`Catalog field '${label}' must be a list of at most ${String(maximum)} entries.`);
  }
  return value;
}

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new TypeError(`Catalog field '${label}' must be an integer from ${String(minimum)} through ${String(maximum)}.`);
  }
  return Number(value);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`Catalog field '${label}' must be boolean.`);
  return value;
}

function nullableBoundedText(
  value: unknown,
  label: string,
  maximum: number,
): string | null {
  if (value === null) return null;
  return boundedText(value, label, maximum);
}

function nullableBoundedString(
  value: unknown,
  label: string,
  maximum: number,
): string | null {
  if (value === null) return null;
  return boundedString(value, label, maximum);
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (
    value === null || typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Catalog field '${label}' must contain finite JSON numbers.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => jsonValue(entry, `${label}[${String(index)}]`));
  }
  const object = record(value, label);
  const parsed: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(object)) {
    parsed[key] = jsonValue(entry, `${label}.${key}`);
  }
  return parsed;
}

function jsonObject(value: unknown, label: string): JsonObject {
  const object = record(value, label);
  const parsed: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(object)) {
    parsed[key] = jsonValue(entry, `${label}.${key}`);
  }
  return parsed;
}

function jsonObjectList(
  value: unknown,
  label: string,
  maximum: number,
): readonly JsonObject[] {
  return list(value, label, maximum)
    .map((entry, index) => jsonObject(entry, `${label}[${String(index)}]`));
}

function canonicalClassRow(value: unknown, label: string): CanonicalClassRowV1 {
  return jsonObject(value, label);
}

function canonicalClassRows(
  value: unknown,
  label: string,
  maximum: number,
): readonly CanonicalClassRowV1[] {
  return list(value, label, maximum)
    .map((entry, index) => canonicalClassRow(entry, `${label}[${String(index)}]`));
}

function nullableCanonicalClassRow(
  value: unknown,
  label: string,
): CanonicalClassRowV1 | null {
  return value === null ? null : canonicalClassRow(value, label);
}

function featureValueContribution(
  value: unknown,
  label: string,
): CanonicalClassRowV1 {
  const contribution = record(value, label);
  exactKeys(contribution, label, [
    'kind', 'contribution_key', 'label', 'target_kind', 'target_key', 'op',
    'active_from_level', 'active_to_level', 'value', 'supersedes_ref',
    'resource_display_label', 'resource_marking_shape',
  ]);
  if (contribution.kind !== 'feature_value_contribution') {
    throw new TypeError(`Catalog field '${label}.kind' is invalid.`);
  }
  boundedText(
    contribution.contribution_key,
    `${label}.contribution_key`,
    FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints,
  );
  boundedText(
    contribution.label,
    `${label}.label`,
    FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints,
  );
  if (
    contribution.target_kind !== 'feature_dice_count' &&
    contribution.target_kind !== 'resource_maximum'
  ) {
    throw new TypeError(`Catalog field '${label}.target_kind' is invalid.`);
  }
  if (contribution.op !== 'add') {
    throw new TypeError(`Catalog field '${label}.op' is invalid.`);
  }
  const activeFrom = integer(
    contribution.active_from_level,
    `${label}.active_from_level`,
    AUTHORING_NUMERIC_LIMITS.minimumClassLevel,
    AUTHORING_NUMERIC_LIMITS.maximumClassLevel,
  );
  const activeTo = integer(
    contribution.active_to_level,
    `${label}.active_to_level`,
    AUTHORING_NUMERIC_LIMITS.minimumClassLevel,
    AUTHORING_NUMERIC_LIMITS.maximumClassLevel,
  );
  if (activeFrom > activeTo) {
    throw new TypeError(
      `Catalog field '${label}.active_from_level' must not exceed active_to_level.`,
    );
  }

  if (contribution.target_kind === 'feature_dice_count') {
    exactKeys(contribution, label, [
      'kind', 'contribution_key', 'label', 'target_kind', 'target_key', 'op',
      'active_from_level', 'active_to_level', 'value', 'supersedes_ref',
    ]);
    if (!isEnumValue(featureValueKeys, contribution.target_key)) {
      throw new TypeError(`Catalog field '${label}.target_key' is invalid.`);
    }
  } else {
    exactKeys(contribution, label, [
      'kind', 'contribution_key', 'label', 'target_kind', 'target_key', 'op',
      'active_from_level', 'active_to_level', 'value', 'supersedes_ref',
      'resource_display_label', 'resource_marking_shape',
    ]);
    boundedText(
      contribution.target_key,
      `${label}.target_key`,
      FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints,
    );
    boundedText(
      contribution.resource_display_label,
      `${label}.resource_display_label`,
      FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints,
    );
    if (
      contribution.resource_marking_shape !== 'boxes' &&
      contribution.resource_marking_shape !== 'remaining'
    ) {
      throw new TypeError(`Catalog field '${label}.resource_marking_shape' is invalid.`);
    }
  }

  let encodedValue: string | undefined;
  try {
    encodedValue = JSON.stringify(contribution.value);
  } catch (error) {
    throw new TypeError(`Catalog field '${label}.value' must be valid JSON.`, { cause: error });
  }
  const parsedValue = decodeStoredValueExpression(encodedValue, `${label}.value`) as JsonValue;

  let parsedSupersedes: JsonValue | null;
  if (contribution.supersedes_ref === null) {
    parsedSupersedes = null;
  } else {
    let encodedSupersedes: string | undefined;
    try {
      encodedSupersedes = JSON.stringify(contribution.supersedes_ref);
    } catch (error) {
      throw new TypeError(
        `Catalog field '${label}.supersedes_ref' must be valid JSON.`,
        { cause: error },
      );
    }
    parsedSupersedes = decodeStoredSupersedesReference(
      encodedSupersedes,
      `${label}.supersedes_ref`,
    ) as JsonValue;
  }

  return {
    ...contribution,
    value: parsedValue,
    supersedes_ref: parsedSupersedes,
  } as CanonicalClassRowV1;
}

function optionalFeatureValueContributions(
  value: unknown,
): readonly CanonicalClassRowV1[] | undefined {
  if (value === undefined) return undefined;
  return list(
    value,
    'aggregate.feature_value_contributions',
    AUTHORING_LIST_LIMITS.effectsPerAggregate,
  ).map((entry, index) => featureValueContribution(
    entry,
    `aggregate.feature_value_contributions[${String(index)}]`,
  ));
}

function canonicalClassProgressions(
  value: unknown,
): readonly CanonicalClassRowV1[] {
  return canonicalClassRows(
    value,
    'aggregate.progressions',
    AUTHORING_NUMERIC_LIMITS.maximumClassLevel,
  ).map((progression, index) => ({
    ...progression,
    grant_rules: normalizedGrantList(
      progression.grant_rules,
      `aggregate.progressions[${String(index)}].grant_rules`,
    ),
  }));
}

function featAbilityIncreaseAbilities(
  value: unknown,
): 'any' | readonly string[] | null {
  if (value === null || value === 'any') return value;
  const choices = list(value, 'aggregate.ability_increase_abilities', abilities.length);
  if (
    choices.length === 0 ||
    choices.some((ability) => !isEnumValue(abilities, ability))
  ) {
    throw new TypeError("Catalog field 'aggregate.ability_increase_abilities' is invalid.");
  }
  return choices.map((ability, index) => boundedText(
    ability,
    `aggregate.ability_increase_abilities[${String(index)}]`,
    AUTHORING_TEXT_LIMITS.openVocabulary,
  ));
}

function documentStoredFields(
  value: unknown,
  label: string,
): undefined {
  if (value !== undefined) {
    throw new TypeError(`Catalog field '${label}' is stored-only and cannot appear in a document.`);
  }
  return undefined;
}

type ExhaustiveAggregateFields<Aggregate> = {
  readonly [Key in keyof Required<Aggregate>]: Aggregate[Key];
};

function fingerprint(
  value: unknown,
  label: string,
  expectedKind?: string,
): void {
  const parsed = record(value, label);
  if (
    (expectedKind !== undefined && parsed.kind !== expectedKind) ||
    typeof parsed.kind !== 'string' ||
    parsed.scheme !== CONTENT_FINGERPRINT_SCHEME_V1 ||
    typeof parsed.digest !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(parsed.digest) ||
    Object.keys(parsed).some((key) => !['kind', 'scheme', 'digest'].includes(key))
  ) {
    throw new TypeError(`Catalog field '${label}' must be a content-v1 fingerprint reference.`);
  }
}

function edition(value: unknown): RulesEdition {
  const parsed = string(value, 'aggregate.rules_edition');
  if (!(rulesEditions as readonly string[]).includes(parsed)) {
    throw new TypeError(`Catalog field 'aggregate.rules_edition' is invalid.`);
  }
  return parsed as RulesEdition;
}

function baseAggregate(value: unknown, kind: SourceCatalogRecordKind) {
  const aggregate = record(value, 'aggregate');
  if (aggregate.kind !== kind) {
    throw new TypeError(`Catalog aggregate.kind must be '${kind}'.`);
  }
  const name = string(aggregate.name, 'aggregate.name');
  const rulesEdition = edition(aggregate.rules_edition);
  return { aggregate, name, rulesEdition };
}

function normalizedGrant(value: unknown, label: string): AuthoringGrant {
  const grant = record(value, label);
  exactKeys(grant, label, GRANT_RULE_FIELDS);
  boundedText(grant.rule_key, `${label}.rule_key`, AUTHORING_TEXT_LIMITS.ruleKey);
  for (const localLocator of [
    'spell_version_id', 'spell_version_key',
    'source_definition_id', 'source_definition_key',
  ] as const) {
    if (grant[localLocator] !== undefined && grant[localLocator] !== null) {
      throw new TypeError(
        `Catalog field '${label}.${localLocator}' is store-local; use a content fingerprint reference.`,
      );
    }
  }
  for (const locator of [
    'rule_key', 'spell_version_key', 'source_definition_key',
    'definition_key_config', 'child_config_config', 'acquisitions_config',
    'distinct_config_by',
  ] as const) {
    trimEqual(grant[locator], `${label}.${locator}`);
  }
  if (
    grant.definition_key_config !== undefined &&
    grant.definition_key_config !== null &&
    typeof grant.definition_key_config !== 'string'
  ) {
    throw new TypeError(`Catalog field '${label}.definition_key_config' must be string or null.`);
  }
  if (grant.source_definition !== undefined && typeof grant.definition_key_config === 'string') {
    throw new TypeError(
      `Catalog field '${label}.source_definition' is inert when definition_key_config is present.`,
    );
  }
  if (grant.free_cast !== undefined && grant.free_cast !== null) {
    const freeCast = record(grant.free_cast, `${label}.free_cast`);
    exactKeys(freeCast, `${label}.free_cast`, [
      'uses', 'recovery', 'pool_scope',
    ]);
    integer(freeCast.uses, `${label}.free_cast.uses`, 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
  }
  if (grant.active_if_config !== undefined && grant.active_if_config !== null) {
    const active = record(grant.active_if_config, `${label}.active_if_config`);
    exactKeys(active, `${label}.active_if_config`, ['key', 'equals']);
    trimEqual(active.key, `${label}.active_if_config.key`);
    boundedText(active.key, `${label}.active_if_config.key`, AUTHORING_TEXT_LIMITS.contentKey);
    boundedText(active.equals, `${label}.active_if_config.equals`, AUTHORING_TEXT_LIMITS.openVocabulary);
  }
  for (const field of [
    'count', 'initial_count', 'count_per_level', 'active_from_class_level',
  ] as const) {
    if (grant[field] !== undefined && grant[field] !== null) {
      integer(
        grant[field],
        `${label}.${field}`,
        field === 'initial_count' ? 0 : 1,
        field === 'active_from_class_level'
          ? AUTHORING_NUMERIC_LIMITS.maximumClassLevel
          : AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
      );
    }
  }
  if (
    typeof grant.list === 'string' &&
    grant.list.trim().startsWith('$config.')
  ) {
    trimEqual(grant.list, `${label}.list`);
  }
  for (const field of ['level_min', 'level_max'] as const) {
    if (grant[field] !== undefined) {
      integer(grant[field], `${label}.${field}`, 0, AUTHORING_NUMERIC_LIMITS.maximumSpellLevel);
    }
  }
  for (const field of [
    'list', 'bucket', 'source_type', 'capability_key', 'collection',
    'access_mode', 'style_key', 'selection_pool', 'label',
  ] as const) {
    if (grant[field] !== undefined && grant[field] !== null) {
      boundedText(grant[field], `${label}.${field}`, AUTHORING_TEXT_LIMITS.openVocabulary);
    }
  }
  for (const field of ['schools', 'tags', 'skills'] as const) {
    if (grant[field] !== undefined && grant[field] !== null) {
      list(grant[field], `${label}.${field}`, AUTHORING_LIST_LIMITS.queryValues)
        .forEach((entry, index) => boundedText(
          entry,
          `${label}.${field}[${String(index)}]`,
          AUTHORING_TEXT_LIMITS.queryTag,
        ));
    }
  }
  if (grant.spell !== undefined) fingerprint(grant.spell, `${label}.spell`, 'spell');
  if (grant.source_definition !== undefined) {
    fingerprint(grant.source_definition, `${label}.source_definition`);
    const source = record(grant.source_definition, `${label}.source_definition`);
    if (source.kind !== grant.source_type) {
      throw new TypeError(
        `Catalog field '${label}.source_definition.kind' must match source_type.`,
      );
    }
  }
  const candidate: Record<string, unknown> = { ...grant };
  if (candidate.spell !== undefined) {
    delete candidate.spell;
    candidate.spell_version_key = 'portable:spell';
  }
  if (candidate.source_definition !== undefined) {
    delete candidate.source_definition;
    candidate.source_definition_key = 'portable:source';
  }
  try {
    const normalized: Record<string, unknown> = GrantRule
      .fromObject(candidate)
      .toObject();
    if (normalized.skills !== undefined && normalized.skills !== null) {
      normalized.skills = list(
        normalized.skills,
        `${label}.skills`,
        AUTHORING_LIST_LIMITS.queryValues,
      ).map((entry, index) => normalizedGrantSkill(
        entry,
        `Catalog field '${label}.skills[${String(index)}]'`,
        (message): never => { throw new TypeError(message); },
      ));
    }
    if (normalized.source_type !== undefined) {
      normalized.source_type = normalizedGrantSourceType(
        normalized.source_type,
        `Catalog field '${label}.source_type'`,
        (message): never => { throw new TypeError(message); },
      );
    }
    if (grant.spell !== undefined) {
      delete normalized.spell_version_key;
      normalized.spell = grant.spell;
    }
    if (grant.source_definition !== undefined) {
      delete normalized.source_definition_key;
      normalized.source_definition = grant.source_definition;
    }
    return normalized as AuthoringGrant;
  } catch (error) {
    throw new TypeError(
      `Catalog field '${label}' is not a valid grant rule: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function normalizedGrantList(
  value: unknown,
  label: string,
): readonly AuthoringGrant[] {
  return list(value, label, AUTHORING_LIST_LIMITS.grants)
    .map((grant, index) => normalizedGrant(grant, `${label}[${String(index)}]`));
}

function validateEffect(value: unknown, label: string): void {
  const effect = record(value, label);
  if (!isEnumValue(characterEffectKinds, effect.kind)) {
    throw new TypeError(`Catalog field '${label}.kind' is invalid.`);
  }
  boundedText(effect.label, `${label}.label`, AUTHORING_TEXT_LIMITS.shortLabel);
  if (effect.notes !== null) {
    boundedText(effect.notes, `${label}.notes`, AUTHORING_TEXT_LIMITS.referenceText);
  }
  const definition = CHARACTER_EFFECT_FORM[effect.kind];
  const allowed = new Set([
    'kind', 'sort_order', 'label', 'notes',
    ...definition.fields.map((field) => field.key),
  ]);
  const unknown = Object.keys(effect).find((key) => !allowed.has(key));
  if (unknown !== undefined) {
    throw new TypeError(`Catalog field '${label}.${unknown}' is not valid for effect '${effect.kind}'.`);
  }
  integer(effect.sort_order, `${label}.sort_order`, 1, AUTHORING_NUMERIC_LIMITS.maximumSortOrder);
  for (const field of definition.fields) {
    const valueAtField = effect[field.key];
    if (valueAtField === null || valueAtField === undefined) {
      if (field.required) throw new TypeError(`Catalog field '${label}.${field.key}' is required.`);
      continue;
    }
    switch (field.control) {
      case 'integer':
        integer(valueAtField, `${label}.${field.key}`, field.minimum, field.maximum);
        if (field.non_zero && valueAtField === 0) {
          throw new TypeError(`Catalog field '${label}.${field.key}' must be non-zero.`);
        }
        break;
      case 'ability':
        if (!isEnumValue(abilities, valueAtField)) throw new TypeError(`Catalog field '${label}.${field.key}' is invalid.`);
        break;
      case 'weapon_scope':
        if (!isEnumValue(extraAttackWeaponScopes, valueAtField)) throw new TypeError(`Catalog field '${label}.${field.key}' is invalid.`);
        break;
      case 'boolean':
        if (typeof valueAtField !== 'boolean') throw new TypeError(`Catalog field '${label}.${field.key}' must be boolean.`);
        break;
      case 'damage_type':
        boundedText(valueAtField, `${label}.${field.key}`, AUTHORING_TEXT_LIMITS.openVocabulary);
        break;
    }
  }
  if (definition.at_least_one_of.length > 0 && definition.at_least_one_of.every(
    (field) => effect[field] === null || effect[field] === undefined,
  )) {
    throw new TypeError(`Catalog field '${label}' is missing its effect payload.`);
  }
}

function validateEffects(value: unknown, label: string): void {
  list(value, label, AUTHORING_LIST_LIMITS.effectsPerOwner)
    .forEach((effect, index) => validateEffect(effect, `${label}[${String(index)}]`));
}

function validateSpecies(aggregate: Record<string, unknown>): void {
  exactKeys(aggregate, 'aggregate', [
    'kind', 'name', 'rules_edition', 'reference_text', 'repeatable',
    'creature_type', 'primary_size', 'alternate_size', 'walking_speed_feet',
    'grants', 'traits',
  ]);
  boundedText(aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name);
  boundedString(aggregate.reference_text, 'aggregate.reference_text', AUTHORING_TEXT_LIMITS.referenceText);
  boolean(aggregate.repeatable, 'aggregate.repeatable');
  boundedText(aggregate.creature_type, 'aggregate.creature_type', AUTHORING_TEXT_LIMITS.openVocabulary);
  boundedText(aggregate.primary_size, 'aggregate.primary_size', AUTHORING_TEXT_LIMITS.openVocabulary);
  nullableBoundedText(aggregate.alternate_size, 'aggregate.alternate_size', AUTHORING_TEXT_LIMITS.openVocabulary);
  integer(aggregate.walking_speed_feet, 'aggregate.walking_speed_feet', 1, AUTHORING_NUMERIC_LIMITS.maximumSpeedFeet);
  list(aggregate.traits, 'aggregate.traits', AUTHORING_LIST_LIMITS.traits)
    .forEach((value, index) => {
      const trait = record(value, `aggregate.traits[${String(index)}]`);
      exactKeys(trait, `aggregate.traits[${String(index)}]`, [
        'sort_order', 'name', 'description', 'effects',
      ]);
      boundedText(trait.name, `aggregate.traits[${String(index)}].name`, AUTHORING_TEXT_LIMITS.shortLabel);
      boundedText(trait.description, `aggregate.traits[${String(index)}].description`, AUTHORING_TEXT_LIMITS.description);
      integer(trait.sort_order, `aggregate.traits[${String(index)}].sort_order`, 1, AUTHORING_NUMERIC_LIMITS.maximumSortOrder);
      validateEffects(trait.effects, `aggregate.traits[${String(index)}].effects`);
    });
}

function validateBackground(aggregate: Record<string, unknown>): void {
  exactKeys(aggregate, 'aggregate', [
    'kind', 'name', 'rules_edition', 'reference_text', 'repeatable', 'grants',
    'suggested_abilities', 'default_origin_feat_content_key',
    'default_origin_feat', 'default_origin_feat_display_name', 'skill_proficiencies',
    'tool_reference_text', 'equipment_option_a_description',
    'equipment_option_b_description', 'equipment_option_a',
    'equipment_option_b', 'effects',
  ]);
  boundedText(aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name);
  boundedString(aggregate.reference_text, 'aggregate.reference_text', AUTHORING_TEXT_LIMITS.referenceText);
  boolean(aggregate.repeatable, 'aggregate.repeatable');
  const suggested = list(aggregate.suggested_abilities, 'aggregate.suggested_abilities', 3);
  if (suggested.length !== 3 || suggested.some((ability) => !isEnumValue(abilities, ability))) {
    throw new TypeError("Catalog field 'aggregate.suggested_abilities' must contain three abilities.");
  }
  fingerprint(aggregate.default_origin_feat, 'aggregate.default_origin_feat', 'feat');
  boundedText(
    aggregate.default_origin_feat_display_name,
    'aggregate.default_origin_feat_display_name',
    AUTHORING_TEXT_LIMITS.shortLabel,
  );
  boundedText(
    aggregate.default_origin_feat_content_key,
    'aggregate.default_origin_feat_content_key',
    AUTHORING_TEXT_LIMITS.contentKey,
  );
  const skillList = list(aggregate.skill_proficiencies, 'aggregate.skill_proficiencies', 2);
  if (skillList.length !== 2 || skillList.some((skill) => !isEnumValue(skills, skill))) {
    throw new TypeError("Catalog field 'aggregate.skill_proficiencies' must contain two skills.");
  }
  if (aggregate.tool_reference_text !== null) {
    boundedText(aggregate.tool_reference_text, 'aggregate.tool_reference_text', AUTHORING_TEXT_LIMITS.toolReference);
  }
  boundedText(aggregate.equipment_option_a_description, 'aggregate.equipment_option_a_description', AUTHORING_TEXT_LIMITS.equipmentDescription);
  boundedText(aggregate.equipment_option_b_description, 'aggregate.equipment_option_b_description', AUTHORING_TEXT_LIMITS.equipmentDescription);
  for (const option of ['equipment_option_a', 'equipment_option_b'] as const) {
    list(aggregate[option], `aggregate.${option}`, AUTHORING_LIST_LIMITS.equipmentItemsPerOption)
      .forEach((value, index) => {
        const item = record(value, `aggregate.${option}[${String(index)}]`);
        exactKeys(item, `aggregate.${option}[${String(index)}]`, item.kind === 'gear'
          ? ['kind', 'sort_order', 'quantity', 'printed_name']
          : ['kind', 'sort_order', 'quantity', 'printed_name', 'content']);
        integer(item.quantity, `aggregate.${option}[${String(index)}].quantity`, 1, AUTHORING_NUMERIC_LIMITS.maximumQuantity);
        integer(item.sort_order, `aggregate.${option}[${String(index)}].sort_order`, 1, AUTHORING_NUMERIC_LIMITS.maximumSortOrder);
        boundedText(item.printed_name, `aggregate.${option}[${String(index)}].printed_name`, AUTHORING_TEXT_LIMITS.description);
        if (item.kind === 'weapon' || item.kind === 'armor') {
          fingerprint(item.content, `aggregate.${option}[${String(index)}].content`, item.kind);
        } else if (item.kind !== 'gear' || item.content !== undefined) {
          throw new TypeError(`Catalog field 'aggregate.${option}[${String(index)}].kind' is invalid.`);
        }
      });
  }
  validateEffects(aggregate.effects, 'aggregate.effects');
}

const classEffectFields = [
  'effect_kind', 'damage_type', 'hit_points_flat', 'hit_points_per_level',
  'speed_bonus_feet', 'ability', 'amount', 'maximum', 'base', 'ability_1',
  'ability_2', 'allows_shield', 'weapon_scope', 'attack_count',
] as const;

function validateClassEffect(value: unknown, label: string, named: boolean): void {
  const effect = record(value, label);
  exactKeys(effect, label, [
    ...(named ? [] : ['class_level', 'name']),
    ...classEffectFields,
  ]);
  if (!named) {
    integer(effect.class_level, `${label}.class_level`, 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
    boundedText(effect.name, `${label}.name`, AUTHORING_TEXT_LIMITS.name);
  }
  if (!isEnumValue(featureTemplateEffectKinds, effect.effect_kind)) {
    throw new TypeError(`Catalog field '${label}.effect_kind' is invalid.`);
  }
  for (const field of ['damage_type', 'ability', 'ability_1', 'ability_2', 'weapon_scope'] as const) {
    if (effect[field] !== null && effect[field] !== undefined) {
      boundedText(effect[field], `${label}.${field}`, AUTHORING_TEXT_LIMITS.openVocabulary);
    }
  }
  if (effect.allows_shield !== null && effect.allows_shield !== undefined) {
    boolean(effect.allows_shield, `${label}.allows_shield`);
  }
  for (const field of [
    'hit_points_flat', 'hit_points_per_level', 'speed_bonus_feet', 'amount',
    'maximum', 'base', 'attack_count',
  ] as const) {
    if (effect[field] !== null && effect[field] !== undefined) {
      integer(
        effect[field],
        `${label}.${field}`,
        field === 'hit_points_flat' || field === 'hit_points_per_level' || field === 'amount'
          ? -AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude
          : 1,
        AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude,
      );
    }
  }
}

function validateClassFormula(value: unknown, label: string): void {
  const formula = record(value, label);
  const kind = boundedText(formula.kind, `${label}.kind`, AUTHORING_TEXT_LIMITS.openVocabulary);
  switch (kind) {
    case 'fixed_count':
      exactKeys(formula, label, ['kind', 'minimum_class_level', 'count']);
      break;
    case 'fixed_count_by_class_level': {
      exactKeys(formula, label, ['kind', 'steps']);
      list(formula.steps, `${label}.steps`, AUTHORING_NUMERIC_LIMITS.maximumClassLevel)
        .forEach((valueAtStep, index) => {
          const step = record(valueAtStep, `${label}.steps[${String(index)}]`);
          exactKeys(step, `${label}.steps[${String(index)}]`, ['minimum_class_level', 'count']);
          integer(step.minimum_class_level, `${label}.steps[${String(index)}].minimum_class_level`, 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
          integer(step.count, `${label}.steps[${String(index)}].count`, 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
        });
      return;
    }
    case 'ability_modifier_minimum_one':
      exactKeys(formula, label, ['kind', 'minimum_class_level', 'ability']);
      break;
    case 'class_level_multiple':
      exactKeys(formula, label, ['kind', 'minimum_class_level', 'multiplier']);
      integer(formula.multiplier, `${label}.multiplier`, 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
      break;
    default:
      throw new TypeError(`Catalog field '${label}.kind' is invalid.`);
  }
  integer(formula.minimum_class_level, `${label}.minimum_class_level`, 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
  if (kind === 'fixed_count') {
    integer(formula.count, `${label}.count`, 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
  }
}

function validateClassRows(
  aggregate: Record<string, unknown>,
  field: string,
  allowed: readonly string[],
  maximum: number = AUTHORING_LIST_LIMITS.classChildRows,
): readonly Record<string, unknown>[] {
  return list(aggregate[field], `aggregate.${field}`, maximum).map((value, index) => {
    const label = `aggregate.${field}[${String(index)}]`;
    const row = record(value, label);
    exactKeys(row, label, allowed);
    return row;
  });
}

function validateClassGrants(aggregate: Record<string, unknown>): void {
  exactKeys(aggregate, 'aggregate', [
    'kind', 'name', 'rules_edition', 'spellcasting_ability',
    'progression_type', 'caster_fraction', 'caster_rounding',
    'prepares_or_knows', 'supports_ritual_casting', 'ritual_casting_mode',
    'primary_ability_expression', 'notes', 'progressions', 'sheet_traits',
    'saving_throw_proficiencies', 'skill_options', 'armor_training',
    'weapon_proficiencies', 'extra_attack_grants', 'martial_arts_dice',
    'weapon_mastery_grants', 'weapon_mastery_counts', 'equipment_items',
    'resources', 'resource_formulas', 'feature_effects',
    'feature_value_contributions', 'named_features', 'stored_fields',
  ]);
  boundedText(aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name);
  boolean(aggregate.supports_ritual_casting, 'aggregate.supports_ritual_casting');
  for (const field of [
    'spellcasting_ability', 'caster_fraction', 'caster_rounding',
    'prepares_or_knows', 'ritual_casting_mode', 'primary_ability_expression',
    'notes',
  ] as const) {
    if (aggregate[field] !== null) {
      boundedText(
        aggregate[field],
        `aggregate.${field}`,
        field === 'notes' || field === 'primary_ability_expression'
          ? AUTHORING_TEXT_LIMITS.referenceText
          : AUTHORING_TEXT_LIMITS.openVocabulary,
      );
    }
  }
  boundedText(aggregate.progression_type, 'aggregate.progression_type', AUTHORING_TEXT_LIMITS.openVocabulary);
  const progressions = list(aggregate.progressions, 'aggregate.progressions', AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
  progressions.forEach((value, index) => {
    const progression = record(value, `aggregate.progressions[${String(index)}]`);
    exactKeys(progression, `aggregate.progressions[${String(index)}]`, [
      'class_level', 'cantrips_known', 'prepared_count', 'slots',
      'pact_slots', 'grant_rules',
    ]);
    integer(progression.class_level, `aggregate.progressions[${String(index)}].class_level`, 1, 20);
    integer(progression.cantrips_known, `aggregate.progressions[${String(index)}].cantrips_known`, 0, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    integer(progression.prepared_count, `aggregate.progressions[${String(index)}].prepared_count`, 0, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    normalizedGrantList(
      progression.grant_rules,
      `aggregate.progressions[${String(index)}].grant_rules`,
    );
  });
  validateClassRows(aggregate, 'saving_throw_proficiencies', ['ability'])
    .forEach((row) => boundedText(row.ability, 'aggregate.saving_throw_proficiencies.ability', AUTHORING_TEXT_LIMITS.openVocabulary));
  validateClassRows(aggregate, 'skill_options', ['skill'])
    .forEach((row) => boundedText(row.skill, 'aggregate.skill_options.skill', AUTHORING_TEXT_LIMITS.openVocabulary));
  validateClassRows(aggregate, 'armor_training', ['category', 'granted_on_multiclass_entry'])
    .forEach((row) => {
      boundedText(row.category, 'aggregate.armor_training.category', AUTHORING_TEXT_LIMITS.openVocabulary);
      boolean(row.granted_on_multiclass_entry, 'aggregate.armor_training.granted_on_multiclass_entry');
    });
  validateClassRows(aggregate, 'weapon_proficiencies', ['category', 'property_qualifier', 'granted_on_multiclass_entry'])
    .forEach((row) => {
      boundedText(row.category, 'aggregate.weapon_proficiencies.category', AUTHORING_TEXT_LIMITS.openVocabulary);
      if (row.property_qualifier !== null) {
        boundedText(row.property_qualifier, 'aggregate.weapon_proficiencies.property_qualifier', AUTHORING_TEXT_LIMITS.openVocabulary);
      }
      boolean(row.granted_on_multiclass_entry, 'aggregate.weapon_proficiencies.granted_on_multiclass_entry');
    });
  for (const row of validateClassRows(aggregate, 'extra_attack_grants', ['class_level', 'attack_count'])) {
    integer(row.class_level, 'aggregate.extra_attack_grants.class_level', 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
    integer(row.attack_count, 'aggregate.extra_attack_grants.attack_count', AUTHORING_NUMERIC_LIMITS.minimumAttackCount, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
  }
  validateClassRows(aggregate, 'martial_arts_dice', ['class_level', 'martial_arts_die'])
    .forEach((row) => {
      integer(row.class_level, 'aggregate.martial_arts_dice.class_level', 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
      integer(row.martial_arts_die, 'aggregate.martial_arts_dice.martial_arts_die', 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    });
  validateClassRows(aggregate, 'weapon_mastery_grants', ['grant'])
    .forEach((row) => boundedText(row.grant, 'aggregate.weapon_mastery_grants.grant', AUTHORING_TEXT_LIMITS.openVocabulary));
  validateClassRows(aggregate, 'weapon_mastery_counts', ['class_level', 'mastery_count'])
    .forEach((row) => {
      integer(row.class_level, 'aggregate.weapon_mastery_counts.class_level', 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
      integer(row.mastery_count, 'aggregate.weapon_mastery_counts.mastery_count', 0, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    });
  for (const row of validateClassRows(aggregate, 'equipment_items', [
    'option', 'sort_order', 'quantity', 'item_name', 'item_kind', 'reference',
  ])) {
    integer(row.sort_order, 'aggregate.equipment_items.sort_order', 1, AUTHORING_NUMERIC_LIMITS.maximumSortOrder);
    integer(row.quantity, 'aggregate.equipment_items.quantity', 1, AUTHORING_NUMERIC_LIMITS.maximumQuantity);
    boundedText(row.item_name, 'aggregate.equipment_items.item_name', AUTHORING_TEXT_LIMITS.description);
    boundedText(row.option, 'aggregate.equipment_items.option', AUTHORING_TEXT_LIMITS.openVocabulary);
    boundedText(row.item_kind, 'aggregate.equipment_items.item_kind', AUTHORING_TEXT_LIMITS.openVocabulary);
    if (row.reference !== null) fingerprint(row.reference, 'aggregate.equipment_items.reference');
  }
  validateClassRows(aggregate, 'resources', ['class_level', 'resource_kind', 'maximum'])
    .forEach((row) => {
      integer(row.class_level, 'aggregate.resources.class_level', 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
      boundedText(row.resource_kind, 'aggregate.resources.resource_kind', AUTHORING_TEXT_LIMITS.openVocabulary);
      integer(row.maximum, 'aggregate.resources.maximum', 0, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    });
  for (const row of validateClassRows(aggregate, 'resource_formulas', ['resource_kind', 'formula'])) {
    boundedText(row.resource_kind, 'aggregate.resource_formulas.resource_kind', AUTHORING_TEXT_LIMITS.openVocabulary);
    validateClassFormula(row.formula, 'aggregate.resource_formulas.formula');
  }
  validateClassRows(
    aggregate,
    'feature_effects',
    ['class_level', 'name', ...classEffectFields],
    AUTHORING_LIST_LIMITS.effectsPerAggregate,
  ).forEach((row, index) => validateClassEffect(row, `aggregate.feature_effects[${String(index)}]`, false));
  optionalFeatureValueContributions(aggregate.feature_value_contributions);
  validateClassRows(aggregate, 'named_features', [
    'name', 'rules_edition', 'prerequisite', 'description', 'class_level', 'effects',
  ], AUTHORING_LIST_LIMITS.features).forEach((row, index) => {
    const label = `aggregate.named_features[${String(index)}]`;
    boundedText(row.name, `${label}.name`, AUTHORING_TEXT_LIMITS.name);
    boundedText(row.prerequisite, `${label}.prerequisite`, AUTHORING_TEXT_LIMITS.description);
    boundedText(row.description, `${label}.description`, AUTHORING_TEXT_LIMITS.description);
    boundedText(row.rules_edition, `${label}.rules_edition`, AUTHORING_TEXT_LIMITS.openVocabulary);
    integer(row.class_level, `${label}.class_level`, 1, AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
    list(row.effects, `${label}.effects`, AUTHORING_LIST_LIMITS.effectsPerOwner)
      .forEach((effect, effectIndex) => validateClassEffect(effect, `${label}.effects[${String(effectIndex)}]`, true));
  });
  if (aggregate.sheet_traits !== null) {
    const sheet = record(aggregate.sheet_traits, 'aggregate.sheet_traits');
    exactKeys(sheet, 'aggregate.sheet_traits', [
      'hit_die', 'skill_choice_count', 'skill_choice_from_any',
      'multiclass_skill_choice_count', 'multiclass_skill_choice_pool',
    ]);
    integer(sheet.hit_die, 'aggregate.sheet_traits.hit_die', 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    integer(sheet.skill_choice_count, 'aggregate.sheet_traits.skill_choice_count', 1, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    boolean(sheet.skill_choice_from_any, 'aggregate.sheet_traits.skill_choice_from_any');
    integer(sheet.multiclass_skill_choice_count, 'aggregate.sheet_traits.multiclass_skill_choice_count', 0, AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude);
    boundedText(sheet.multiclass_skill_choice_pool, 'aggregate.sheet_traits.multiclass_skill_choice_pool', AUTHORING_TEXT_LIMITS.openVocabulary);
  }
}

function validateFeat(aggregate: Record<string, unknown>): void {
  exactKeys(aggregate, 'aggregate', [
    'kind', 'name', 'rules_edition', 'category', 'min_level',
    'ability_points', 'ability_increase_abilities',
    'ability_increase_maximum', 'repeatable', 'prerequisites', 'grants',
    'notes', 'stored_fields',
  ]);
  boundedText(aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name);
  if (aggregate.notes !== null) {
    boundedString(aggregate.notes, 'aggregate.notes', AUTHORING_TEXT_LIMITS.referenceText);
  }
  if (aggregate.category !== null) {
    boundedText(aggregate.category, 'aggregate.category', AUTHORING_TEXT_LIMITS.shortLabel);
  }
  boolean(aggregate.repeatable, 'aggregate.repeatable');
  if (aggregate.min_level !== null) {
    integer(
      aggregate.min_level,
      'aggregate.min_level',
      AUTHORING_NUMERIC_LIMITS.minimumClassLevel,
      AUTHORING_NUMERIC_LIMITS.maximumClassLevel,
    );
  }
  if (
    !Number.isSafeInteger(aggregate.ability_points) ||
    ![0, 1, 2].includes(Number(aggregate.ability_points))
  ) {
    throw new TypeError("Catalog field 'aggregate.ability_points' must be 0, 1, or 2.");
  }
  if (aggregate.ability_increase_maximum !== null) {
    integer(
      aggregate.ability_increase_maximum,
      'aggregate.ability_increase_maximum',
      AUTHORING_NUMERIC_LIMITS.minimumAbilityScore,
      AUTHORING_NUMERIC_LIMITS.maximumAbilityScore,
    );
  }
  const choices = aggregate.ability_increase_abilities;
  if (
    choices !== null && choices !== 'any' &&
    (!Array.isArray(choices) || choices.length === 0 || choices.some((ability) => !isEnumValue(abilities, ability)))
  ) {
    throw new TypeError("Catalog field 'aggregate.ability_increase_abilities' is invalid.");
  }
  list(aggregate.prerequisites, 'aggregate.prerequisites', AUTHORING_LIST_LIMITS.grants)
    .forEach((value, index) => {
      const label = `aggregate.prerequisites[${String(index)}]`;
      const prerequisite = record(value, label);
      if (prerequisite.kind === 'feature') {
        exactKeys(prerequisite, label, ['kind', 'feature']);
        boundedText(prerequisite.feature, `${label}.feature`, AUTHORING_TEXT_LIMITS.openVocabulary);
      } else if (prerequisite.kind === 'ability_score') {
        exactKeys(prerequisite, label, ['kind', 'abilities', 'minimum']);
        const abilityList = list(prerequisite.abilities, `${label}.abilities`, 6);
        if (abilityList.length === 0 || abilityList.some((ability) => !isEnumValue(abilities, ability))) {
          throw new TypeError(`Catalog field '${label}.abilities' is invalid.`);
        }
        integer(
          prerequisite.minimum,
          `${label}.minimum`,
          AUTHORING_NUMERIC_LIMITS.minimumAbilityScore,
          AUTHORING_NUMERIC_LIMITS.maximumAbilityScore,
        );
      } else {
        throw new TypeError(`Catalog field '${label}.kind' is invalid.`);
      }
    });
}

/**
 * Parses the aggregate as one closed DTO and immediately runs its production
 * projector plus the canonical serializer. Missing, non-canonical, unknown or
 * unsupported nested values therefore refuse at the document boundary rather
 * than becoming a partial identity. Stored rows use the complementary
 * default-include policy in the production projector, so either side of the
 * boundary fails safe when a future field appears.
 */
export function parseSourceCatalogRecord(
  kind: 'class',
  value: Record<string, unknown>,
): CatalogClassRecord;
export function parseSourceCatalogRecord(
  kind: 'feat',
  value: Record<string, unknown>,
): CatalogFeatRecord;
export function parseSourceCatalogRecord(
  kind: 'species',
  value: Record<string, unknown>,
): CatalogSpeciesRecord;
export function parseSourceCatalogRecord(
  kind: 'background',
  value: Record<string, unknown>,
): CatalogBackgroundRecord;
export function parseSourceCatalogRecord(
  kind: SourceCatalogRecordKind,
  value: Record<string, unknown>,
): CatalogSourceRecord {
  exactKeys(value, 'record', ['kind', 'aggregate']);
  const base = baseAggregate(value.aggregate, kind);
  switch (kind) {
    case 'class': {
      validateClassGrants(base.aggregate);
      const fields = {
        kind: 'class',
        name: boundedText(base.aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name),
        rules_edition: edition(base.aggregate.rules_edition),
        spellcasting_ability: nullableBoundedText(base.aggregate.spellcasting_ability, 'aggregate.spellcasting_ability', AUTHORING_TEXT_LIMITS.openVocabulary),
        progression_type: boundedText(base.aggregate.progression_type, 'aggregate.progression_type', AUTHORING_TEXT_LIMITS.openVocabulary),
        caster_fraction: nullableBoundedText(base.aggregate.caster_fraction, 'aggregate.caster_fraction', AUTHORING_TEXT_LIMITS.openVocabulary),
        caster_rounding: nullableBoundedText(base.aggregate.caster_rounding, 'aggregate.caster_rounding', AUTHORING_TEXT_LIMITS.openVocabulary),
        prepares_or_knows: nullableBoundedText(base.aggregate.prepares_or_knows, 'aggregate.prepares_or_knows', AUTHORING_TEXT_LIMITS.openVocabulary),
        supports_ritual_casting: boolean(base.aggregate.supports_ritual_casting, 'aggregate.supports_ritual_casting'),
        ritual_casting_mode: nullableBoundedText(base.aggregate.ritual_casting_mode, 'aggregate.ritual_casting_mode', AUTHORING_TEXT_LIMITS.openVocabulary),
        primary_ability_expression: nullableBoundedText(base.aggregate.primary_ability_expression, 'aggregate.primary_ability_expression', AUTHORING_TEXT_LIMITS.referenceText),
        notes: nullableBoundedText(base.aggregate.notes, 'aggregate.notes', AUTHORING_TEXT_LIMITS.referenceText),
        progressions: canonicalClassProgressions(base.aggregate.progressions),
        sheet_traits: nullableCanonicalClassRow(base.aggregate.sheet_traits, 'aggregate.sheet_traits'),
        saving_throw_proficiencies: canonicalClassRows(base.aggregate.saving_throw_proficiencies, 'aggregate.saving_throw_proficiencies', AUTHORING_LIST_LIMITS.classChildRows),
        skill_options: canonicalClassRows(base.aggregate.skill_options, 'aggregate.skill_options', AUTHORING_LIST_LIMITS.classChildRows),
        armor_training: canonicalClassRows(base.aggregate.armor_training, 'aggregate.armor_training', AUTHORING_LIST_LIMITS.classChildRows),
        weapon_proficiencies: canonicalClassRows(base.aggregate.weapon_proficiencies, 'aggregate.weapon_proficiencies', AUTHORING_LIST_LIMITS.classChildRows),
        extra_attack_grants: canonicalClassRows(base.aggregate.extra_attack_grants, 'aggregate.extra_attack_grants', AUTHORING_LIST_LIMITS.classChildRows),
        martial_arts_dice: canonicalClassRows(base.aggregate.martial_arts_dice, 'aggregate.martial_arts_dice', AUTHORING_LIST_LIMITS.classChildRows),
        weapon_mastery_grants: canonicalClassRows(base.aggregate.weapon_mastery_grants, 'aggregate.weapon_mastery_grants', AUTHORING_LIST_LIMITS.classChildRows),
        weapon_mastery_counts: canonicalClassRows(base.aggregate.weapon_mastery_counts, 'aggregate.weapon_mastery_counts', AUTHORING_LIST_LIMITS.classChildRows),
        equipment_items: canonicalClassRows(base.aggregate.equipment_items, 'aggregate.equipment_items', AUTHORING_LIST_LIMITS.classChildRows),
        resources: canonicalClassRows(base.aggregate.resources, 'aggregate.resources', AUTHORING_LIST_LIMITS.classChildRows),
        resource_formulas: canonicalClassRows(base.aggregate.resource_formulas, 'aggregate.resource_formulas', AUTHORING_LIST_LIMITS.classChildRows),
        feature_effects: canonicalClassRows(base.aggregate.feature_effects, 'aggregate.feature_effects', AUTHORING_LIST_LIMITS.effectsPerAggregate),
        feature_value_contributions: optionalFeatureValueContributions(base.aggregate.feature_value_contributions),
        named_features: canonicalClassRows(base.aggregate.named_features, 'aggregate.named_features', AUTHORING_LIST_LIMITS.features),
        stored_fields: documentStoredFields(base.aggregate.stored_fields, 'aggregate.stored_fields'),
      } satisfies ExhaustiveAggregateFields<ClassContentAggregateV1>;
      const {
        feature_value_contributions: featureValueContributions,
        stored_fields: storedFields,
        ...requiredFields
      } = fields;
      const aggregate: ClassContentAggregateV1 = featureValueContributions === undefined
        ? requiredFields
        : { ...requiredFields, feature_value_contributions: featureValueContributions };
      void storedFields;
      deriveContentIdentityV1({
        kind,
        edition: aggregate.rules_edition,
        name: aggregate.name,
        payload: projectClassContentV1(aggregate),
      });
      return { kind, aggregate };
    }
    case 'feat': {
      validateFeat(base.aggregate);
      const fields = {
        kind: 'feat',
        name: boundedText(base.aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name),
        rules_edition: edition(base.aggregate.rules_edition),
        category: nullableBoundedText(base.aggregate.category, 'aggregate.category', AUTHORING_TEXT_LIMITS.shortLabel),
        min_level: base.aggregate.min_level === null
          ? null
          : integer(base.aggregate.min_level, 'aggregate.min_level', AUTHORING_NUMERIC_LIMITS.minimumClassLevel, AUTHORING_NUMERIC_LIMITS.maximumClassLevel),
        ability_points: integer(base.aggregate.ability_points, 'aggregate.ability_points', 0, 2),
        ability_increase_abilities: featAbilityIncreaseAbilities(base.aggregate.ability_increase_abilities),
        ability_increase_maximum: base.aggregate.ability_increase_maximum === null
          ? null
          : integer(base.aggregate.ability_increase_maximum, 'aggregate.ability_increase_maximum', AUTHORING_NUMERIC_LIMITS.minimumAbilityScore, AUTHORING_NUMERIC_LIMITS.maximumAbilityScore),
        repeatable: boolean(base.aggregate.repeatable, 'aggregate.repeatable'),
        prerequisites: jsonObjectList(base.aggregate.prerequisites, 'aggregate.prerequisites', AUTHORING_LIST_LIMITS.grants),
        grants: normalizedGrantList(base.aggregate.grants, 'aggregate.grants'),
        notes: nullableBoundedString(base.aggregate.notes, 'aggregate.notes', AUTHORING_TEXT_LIMITS.referenceText),
        stored_fields: documentStoredFields(base.aggregate.stored_fields, 'aggregate.stored_fields'),
      } satisfies ExhaustiveAggregateFields<FeatContentAggregateV1>;
      const { stored_fields: storedFields, ...aggregate } = fields;
      void storedFields;
      deriveContentIdentityV1({
        kind,
        edition: aggregate.rules_edition,
        name: aggregate.name,
        payload: projectFeatContentV1(aggregate),
      });
      return { kind, aggregate };
    }
    case 'species': {
      const grants = normalizedGrantList(base.aggregate.grants, 'aggregate.grants');
      validateSpecies(base.aggregate);
      const aggregate = {
        ...base.aggregate,
        grants,
      } as unknown as SpeciesContentAggregate;
      const payload = projectAuthoredContentAggregateV1(aggregate).payload;
      deriveContentIdentityV1({ kind, edition: base.rulesEdition, name: base.name, payload });
      return { kind, aggregate };
    }
    case 'background': {
      const grants = normalizedGrantList(base.aggregate.grants, 'aggregate.grants');
      validateBackground(base.aggregate);
      const invalidGrantIndex = grants.findIndex(
        (grant) => grant.kind !== 'grant_source',
      );
      if (invalidGrantIndex !== -1) {
        const invalidGrant = grants[invalidGrantIndex]!;
        throw new TypeError(
          `Catalog field 'aggregate.grants[${String(invalidGrantIndex)}].kind' ` +
            `must be 'grant_source' for background content; received ` +
            `'${invalidGrant.kind}'.`,
        );
      }
      const aggregate = {
        ...base.aggregate,
        grants: grants as BackgroundContentAggregate['grants'],
      } as unknown as BackgroundContentAggregate;
      const payload = projectAuthoredContentAggregateV1(aggregate).payload;
      deriveContentIdentityV1({ kind, edition: base.rulesEdition, name: base.name, payload });
      return { kind, aggregate };
    }
  }
}
