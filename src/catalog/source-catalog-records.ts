import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
} from '../authoring/contracts';
import {
  abilities,
  characterEffectKinds,
  extraAttackWeaponScopes,
  isEnumValue,
  rulesEditions,
  skills,
  type RulesEdition,
} from '../domain/enums';
import { CHARACTER_EFFECT_FORM } from '../authoring/effect-forms';
import {
  AUTHORING_LIST_LIMITS,
  AUTHORING_NUMERIC_LIMITS,
  AUTHORING_TEXT_LIMITS,
} from '../authoring/limits';
import { isRecord } from '../worker/handler';
import { GrantRule } from '../grants/grant-rule';
import { deriveContentIdentityV1 } from './content-identity';
import { CONTENT_FINGERPRINT_SCHEME_V1 } from './content-identity';
import { projectAuthoredContentAggregateV1 } from './stored-authored-content-projector-v1';
import {
  projectClassContentV1,
  projectFeatContentV1,
  type ClassContentAggregateV1,
  type FeatContentAggregateV1,
} from './source-content-projector-v1';

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

function validateGrant(value: unknown, label: string): void {
  const grant = record(value, label);
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
  for (const locator of ['rule_key', 'spell_version_key', 'source_definition_key'] as const) {
    const stored = grant[locator];
    if (typeof stored === 'string' && stored !== stored.trim()) {
      throw new TypeError(`Catalog field '${label}.${locator}' contains surrounding whitespace.`);
    }
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
    GrantRule.fromObject(candidate);
  } catch (error) {
    throw new TypeError(
      `Catalog field '${label}' is not a valid grant rule: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function validateGrantList(value: unknown, label: string): void {
  list(value, label, AUTHORING_LIST_LIMITS.grants)
    .forEach((grant, index) => validateGrant(grant, `${label}[${String(index)}]`));
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
  integer(effect.sort_order, `${label}.sort_order`, 1, Number.MAX_SAFE_INTEGER);
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
      boundedText(trait.name, `aggregate.traits[${String(index)}].name`, AUTHORING_TEXT_LIMITS.shortLabel);
      boundedText(trait.description, `aggregate.traits[${String(index)}].description`, AUTHORING_TEXT_LIMITS.description);
      integer(trait.sort_order, `aggregate.traits[${String(index)}].sort_order`, 1, Number.MAX_SAFE_INTEGER);
      validateEffects(trait.effects, `aggregate.traits[${String(index)}].effects`);
    });
}

function validateBackground(aggregate: Record<string, unknown>): void {
  boundedText(aggregate.name, 'aggregate.name', AUTHORING_TEXT_LIMITS.name);
  boundedString(aggregate.reference_text, 'aggregate.reference_text', AUTHORING_TEXT_LIMITS.referenceText);
  boolean(aggregate.repeatable, 'aggregate.repeatable');
  const suggested = list(aggregate.suggested_abilities, 'aggregate.suggested_abilities', 3);
  if (suggested.length !== 3 || suggested.some((ability) => !isEnumValue(abilities, ability))) {
    throw new TypeError("Catalog field 'aggregate.suggested_abilities' must contain three abilities.");
  }
  fingerprint(aggregate.default_origin_feat, 'aggregate.default_origin_feat', 'feat');
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
        integer(item.quantity, `aggregate.${option}[${String(index)}].quantity`, 1, Number.MAX_SAFE_INTEGER);
        integer(item.sort_order, `aggregate.${option}[${String(index)}].sort_order`, 1, Number.MAX_SAFE_INTEGER);
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

function validateClassGrants(aggregate: Record<string, unknown>): void {
  boolean(aggregate.supports_ritual_casting, 'aggregate.supports_ritual_casting');
  for (const field of [
    'spellcasting_ability', 'caster_fraction', 'caster_rounding',
    'prepares_or_knows', 'ritual_casting_mode', 'primary_ability_expression',
    'notes',
  ] as const) {
    if (aggregate[field] !== null && typeof aggregate[field] !== 'string') {
      throw new TypeError(`Catalog field 'aggregate.${field}' must be string or null.`);
    }
  }
  boundedText(aggregate.progression_type, 'aggregate.progression_type', AUTHORING_TEXT_LIMITS.openVocabulary);
  const progressions = list(aggregate.progressions, 'aggregate.progressions', AUTHORING_NUMERIC_LIMITS.maximumClassLevel);
  progressions.forEach((value, index) => {
    const progression = record(value, `aggregate.progressions[${String(index)}]`);
    integer(progression.class_level, `aggregate.progressions[${String(index)}].class_level`, 1, 20);
    integer(progression.cantrips_known, `aggregate.progressions[${String(index)}].cantrips_known`, 0, Number.MAX_SAFE_INTEGER);
    integer(progression.prepared_count, `aggregate.progressions[${String(index)}].prepared_count`, 0, Number.MAX_SAFE_INTEGER);
    validateGrantList(
      progression.grant_rules,
      `aggregate.progressions[${String(index)}].grant_rules`,
    );
  });
  for (const field of [
    'saving_throw_proficiencies', 'skill_options', 'armor_training',
    'weapon_proficiencies', 'extra_attack_grants', 'martial_arts_dice',
    'weapon_mastery_grants', 'weapon_mastery_counts', 'equipment_items',
    'resources', 'resource_formulas', 'feature_effects', 'named_features',
  ] as const) {
    list(aggregate[field], `aggregate.${field}`, Number.MAX_SAFE_INTEGER)
      .forEach((value, index) => record(value, `aggregate.${field}[${String(index)}]`));
  }
  if (aggregate.sheet_traits !== null) record(aggregate.sheet_traits, 'aggregate.sheet_traits');
}

function validateFeat(aggregate: Record<string, unknown>): void {
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
    .forEach((value, index) => record(value, `aggregate.prerequisites[${String(index)}]`));
}

/**
 * Parses the aggregate as one closed DTO and immediately runs its production
 * projector plus the canonical serializer. Missing, non-canonical or
 * unsupported nested values therefore refuse at the document boundary rather
 * than becoming a partial identity. Class child row objects deliberately keep
 * unknown fields: the projector's default-include posture makes a future field
 * over-split instead of collide.
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
  const base = baseAggregate(value.aggregate, kind);
  switch (kind) {
    case 'class': {
      validateClassGrants(base.aggregate);
      const aggregate = base.aggregate as unknown as ClassContentAggregateV1;
      deriveContentIdentityV1({ kind, edition: base.rulesEdition, name: base.name, payload: projectClassContentV1(aggregate) });
      return { kind, aggregate };
    }
    case 'feat': {
      validateGrantList(base.aggregate.grants, 'aggregate.grants');
      validateFeat(base.aggregate);
      const aggregate = base.aggregate as unknown as FeatContentAggregateV1;
      deriveContentIdentityV1({ kind, edition: base.rulesEdition, name: base.name, payload: projectFeatContentV1(aggregate) });
      return { kind, aggregate };
    }
    case 'species': {
      validateGrantList(base.aggregate.grants, 'aggregate.grants');
      validateSpecies(base.aggregate);
      const aggregate = base.aggregate as unknown as SpeciesContentAggregate;
      const payload = projectAuthoredContentAggregateV1(aggregate).payload;
      deriveContentIdentityV1({ kind, edition: base.rulesEdition, name: base.name, payload });
      return { kind, aggregate };
    }
    case 'background': {
      validateGrantList(base.aggregate.grants, 'aggregate.grants');
      validateBackground(base.aggregate);
      const aggregate = base.aggregate as unknown as BackgroundContentAggregate;
      const payload = projectAuthoredContentAggregateV1(aggregate).payload;
      deriveContentIdentityV1({ kind, edition: base.rulesEdition, name: base.name, payload });
      return { kind, aggregate };
    }
  }
}
