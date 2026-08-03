import type {
  AuthoringGrant,
  BackgroundContentAggregate,
  BackgroundContentEquipment,
  ContentFingerprintReference,
  DenseSubclassContentProgression,
  SpeciesContentAggregate,
  SubclassContentAggregate,
  SubclassContentProgressionRow,
} from '../authoring/contracts';
import type {
  AuthoringCharacterEffect,
  AuthoringFeatureEffect,
} from '../authoring/effect-forms';
import {
  sqlBoolean,
  sqlCreatureSize,
  sqlCreatureType,
  sqlDamageType,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  abilities,
  characterEffectKinds,
  characterLevels,
  definitionTableForSourceType,
  domainSourceTypes,
  extraAttackWeaponScopes,
  featureTemplateEffectKinds,
  isEnumValue,
  progressionTypes,
  rulesEditions,
  skills,
  spellSchool,
  type Ability,
  type CharacterLevel,
  type DomainSourceType,
  type ExtraAttackWeaponScope,
  type ProgressionType,
  type RulesEdition,
  type Skill,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { JsonObject, JsonValue } from '../domain/models';
import { GrantRule } from '../grants/grant-rule';
import type {
  AuthoredContentReferenceV1,
  AuthoredProjectorAggregate,
  AuthoredProjectorContractV1,
  AuthoredProjectorKind,
  AuthoredProjectorPayloadV1,
  BackgroundProjectorPayloadV1,
  CanonicalAuthoringGrantV1,
  CanonicalCharacterEffectV1,
  CanonicalFeatureEffectV1,
  SpeciesProjectorPayloadV1,
  SubclassProjectorPayloadV1,
} from './authored-content-projector-contract-v1';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  CONTENT_FINGERPRINT_SCHEME_V1,
  contentIdentitySequence,
  contentIdentitySet,
  type ContentFingerprintDigest,
  type ContentKind,
  type DerivedContentIdentityV1,
} from './content-identity';
import {
  resolveContentAggregate,
  type ContentFingerprintCandidate,
  type ContentResolution,
} from './content-registry';

export interface StoredAuthoredReferenceResolverV1 {
  readonly spell: (
    contentKey: ContentKey,
  ) => ContentFingerprintReference<'spell'>;
  readonly featByStoredName: (input: {
    readonly name: string;
    readonly edition: RulesEdition;
  }) => ContentFingerprintReference<'feat'>;
  readonly class: (
    contentKey: ContentKey,
  ) => ContentFingerprintReference<'class'>;
  readonly weapon: (
    contentKey: ContentKey,
  ) => ContentFingerprintReference<'weapon'>;
  readonly armor: (
    contentKey: ContentKey,
  ) => ContentFingerprintReference<'armor'>;
  readonly sourceDefinition: (
    kind: DomainSourceType,
    contentKey: ContentKey,
  ) => ContentFingerprintReference<DomainSourceType>;
}

type StoredProjection<K extends AuthoredProjectorKind> =
  AuthoredProjectorContractV1<K, AuthoredProjectorPayloadV1<K>>;

export interface StoredAuthoredProjectionInputV1<
  K extends AuthoredProjectorKind,
> {
  readonly kind: K;
  readonly contentKey: ContentKey;
  readonly references: StoredAuthoredReferenceResolverV1;
}

interface StoredEffectRow {
  readonly sort_order: number;
  readonly kind: string;
  readonly damage_type: string | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  readonly ability: string | null;
  readonly amount: number | null;
  readonly maximum: number | null;
  readonly base: number | null;
  readonly ability_1: string | null;
  readonly ability_2: string | null;
  readonly allows_shield: boolean | null;
  readonly weapon_scope: string | null;
  readonly attack_count: number | null;
  readonly label: string;
  readonly notes: string | null;
}

export class StoredAuthoredContentProjectionError extends TypeError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Stored content-v1 projection failed: ${message}`, options);
    this.name = 'StoredAuthoredContentProjectionError';
  }
}

function projectionError(message: string, options?: ErrorOptions): never {
  throw new StoredAuthoredContentProjectionError(message, options);
}

function nonEmpty(value: string, label: string): string {
  if (value.trim() === '') {
    return projectionError(`${label} must not be empty.`);
  }
  return value;
}

function rulesEdition(value: string): RulesEdition {
  if (!isEnumValue(rulesEditions, value)) {
    return projectionError(`unknown rules edition '${value}'.`);
  }
  return value;
}

function ability(value: string, label: string): Ability {
  const normalized = value.trim().toLowerCase();
  if (!isEnumValue(abilities, normalized)) {
    return projectionError(`${label} '${value}' is not an ability.`);
  }
  return normalized;
}

function nullableAbility(value: string | null, label: string): Ability | null {
  return value === null ? null : ability(value, label);
}

function skill(value: string, label: string): Skill {
  const normalized = value.trim().toLowerCase().replaceAll(' ', '_');
  if (!isEnumValue(skills, normalized)) {
    return projectionError(`${label} '${value}' is not a skill.`);
  }
  return normalized;
}

function characterLevel(value: number, label: string): CharacterLevel {
  if (!characterLevels.includes(value as CharacterLevel)) {
    return projectionError(`${label} '${value}' is not a character level.`);
  }
  return value as CharacterLevel;
}

function weaponScope(value: string | null): ExtraAttackWeaponScope {
  if (value === null || !isEnumValue(extraAttackWeaponScopes, value)) {
    return projectionError(`weapon scope '${String(value)}' is invalid.`);
  }
  return value;
}

function requiredInteger(value: number | null, label: string): number {
  if (value === null) {
    return projectionError(`${label} is required.`);
  }
  return value;
}

function requiredString(value: string | null, label: string): string {
  if (value === null) {
    return projectionError(`${label} is required.`);
  }
  return value;
}

function optionalBoolean(row: SqlRow, column: string): boolean | null {
  return row[column] === null ? null : sqlBoolean(row, column);
}

function decodeEffectRow(row: SqlRow): StoredEffectRow {
  return {
    sort_order: sqlInteger(row, 'sort_order'),
    kind: sqlString(row, 'effect_kind'),
    damage_type: sqlNullableString(row, 'damage_type'),
    hit_points_flat: sqlNullableInteger(row, 'hit_points_flat'),
    hit_points_per_level: sqlNullableInteger(row, 'hit_points_per_level'),
    speed_bonus_feet: sqlNullableInteger(row, 'speed_bonus_feet'),
    ability: sqlNullableString(row, 'ability'),
    amount: sqlNullableInteger(row, 'amount'),
    maximum: sqlNullableInteger(row, 'maximum'),
    base: sqlNullableInteger(row, 'base'),
    ability_1: sqlNullableString(row, 'ability_1'),
    ability_2: sqlNullableString(row, 'ability_2'),
    allows_shield: optionalBoolean(row, 'allows_shield'),
    weapon_scope: sqlNullableString(row, 'weapon_scope'),
    attack_count: sqlNullableInteger(row, 'attack_count'),
    label: sqlString(row, 'label'),
    notes: sqlNullableString(row, 'notes'),
  };
}

const COMMON_EFFECT_COLUMNS = `
  sort_order, effect_kind, damage_type, hit_points_flat,
  hit_points_per_level, speed_bonus_feet, ability, amount, maximum,
  base, ability_1, ability_2, allows_shield, weapon_scope
`;

function effectFromStoredRow(
  row: StoredEffectRow,
  feature: false,
): AuthoringCharacterEffect;
function effectFromStoredRow(
  row: StoredEffectRow,
  feature: true,
): AuthoringFeatureEffect;
function effectFromStoredRow(
  row: StoredEffectRow,
  feature: boolean,
): AuthoringCharacterEffect | AuthoringFeatureEffect {
  const permitted = feature ? featureTemplateEffectKinds : characterEffectKinds;
  if (!isEnumValue(permitted, row.kind)) {
    return projectionError(
      `effect kind '${row.kind}' is not permitted on this stored graph.`,
    );
  }
  const common = {
    sort_order: row.sort_order,
    label: nonEmpty(row.label, 'effect label'),
    notes: row.notes,
  };
  switch (row.kind) {
    case 'damage_resistance':
      if (row.damage_type === null) {
        return projectionError('damage resistance has no damage type.');
      }
      return { ...common, kind: row.kind, damage_type: sqlDamageType({ damage_type: row.damage_type }, 'damage_type') };
    case 'hp_modifier':
      if (row.hit_points_flat === null && row.hit_points_per_level === null) {
        return projectionError('hit point modifier has no numeric payload.');
      }
      return { ...common, kind: row.kind, hit_points_flat: row.hit_points_flat, hit_points_per_level: row.hit_points_per_level };
    case 'speed':
      return { ...common, kind: row.kind, speed_bonus_feet: requiredInteger(row.speed_bonus_feet, 'speed bonus') };
    case 'ability_increase':
      return { ...common, kind: row.kind, ability: ability(requiredString(row.ability, 'ability increase ability'), 'ability increase ability'), amount: requiredInteger(row.amount, 'ability increase amount'), maximum: requiredInteger(row.maximum, 'ability increase maximum') };
    case 'ability_override':
      if (feature) {
        return projectionError('ability override is character-only.');
      }
      return { ...common, kind: row.kind, ability: ability(requiredString(row.ability, 'ability override ability'), 'ability override ability'), maximum: requiredInteger(row.maximum, 'ability override maximum') };
    case 'armor_class_bonus':
      return { ...common, kind: row.kind, amount: requiredInteger(row.amount, 'Armor Class bonus') };
    case 'armor_class_formula':
      return { ...common, kind: row.kind, base: requiredInteger(row.base, 'Armor Class base'), ability_1: ability(requiredString(row.ability_1, 'Armor Class first ability'), 'Armor Class first ability'), ability_2: nullableAbility(row.ability_2, 'Armor Class second ability'), allows_shield: row.allows_shield ?? projectionError('Armor Class formula requires allows_shield.') };
    case 'attack_ability_override':
      return { ...common, kind: row.kind, ability: ability(requiredString(row.ability, 'attack ability'), 'attack ability'), weapon_scope: weaponScope(row.weapon_scope) };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return { ...common, kind: row.kind, amount: requiredInteger(row.amount, `${row.kind} amount`), weapon_scope: weaponScope(row.weapon_scope) };
    case 'extra_attack':
      if (!feature) {
        return projectionError('extra attack is feature-only.');
      }
      return { ...common, kind: row.kind, attack_count: requiredInteger(row.attack_count, 'extra attack count'), weapon_scope: weaponScope(row.weapon_scope) };
  }
}

function jsonArray(text: string | null, label: string): readonly unknown[] {
  if (text === null || text === '') {
    return [];
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch (error) {
    throw new TypeError(`Stored content-v1 projection failed: ${label} is invalid JSON.`, { cause: error });
  }
  if (!Array.isArray(decoded)) {
    return projectionError(`${label} must be a JSON array.`);
  }
  return decoded;
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      return projectionError(`${label} number must be a safe integer.`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => jsonValue(entry, `${label}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        jsonValue(entry, `${label}.${key}`),
      ]),
    );
  }
  return projectionError(`${label} must be JSON data.`);
}

function jsonObject(value: unknown, label: string): JsonObject {
  const decoded = jsonValue(value, label);
  if (decoded === null || Array.isArray(decoded) || typeof decoded !== 'object') {
    return projectionError(`${label} must be a JSON object.`);
  }
  return decoded;
}

function exactStoredContentKey(
  value: unknown,
  label: string,
): ContentKey | null {
  if (typeof value !== 'string' || value === '') return null;
  if (value !== value.trim()) {
    return projectionError(
      `${label} must not contain leading or trailing whitespace.`,
    );
  }
  return value as ContentKey;
}

function fixedSpellContentKey(
  db: DatabaseContext,
  object: Readonly<Record<string, unknown>>,
  label: string,
): ContentKey {
  const storedKey = object.spell_version_key;
  const storedId = object.spell_version_id;
  const keyFromValue = exactStoredContentKey(
    storedKey,
    `${label}.spell_version_key`,
  );
  const hasStoredId = storedId !== undefined && storedId !== null;
  if (hasStoredId && (!Number.isSafeInteger(storedId) || Number(storedId) < 1)) {
    return projectionError(`${label}.spell_version_id must be a positive safe integer.`);
  }
  const keyFromId = hasStoredId
    ? db.scalar<string>(
        'SELECT content_key FROM spell_versions WHERE id = ?',
        [storedId as number],
      )
    : null;
  if (hasStoredId && keyFromId === null) {
    return projectionError(
      `${label}.spell_version_id ${String(storedId)} does not resolve.`,
    );
  }
  if (keyFromValue !== null && keyFromId !== null && keyFromValue !== keyFromId) {
    return projectionError(`${label} spell id and key disagree.`);
  }
  const contentKey = keyFromValue ?? keyFromId;
  if (contentKey === null) {
    return projectionError(`${label} has no resolvable spell reference.`);
  }
  return contentKey as ContentKey;
}

function sourceDefinitionReference(
  db: DatabaseContext,
  object: Readonly<Record<string, unknown>>,
  references: StoredAuthoredReferenceResolverV1,
  label: string,
): ContentFingerprintReference<DomainSourceType> | null {
  const sourceType = object.source_type;
  if (typeof sourceType !== 'string' || !isEnumValue(domainSourceTypes, sourceType)) {
    return projectionError(
      `${label}.source_type '${String(sourceType)}' is invalid.`,
    );
  }
  const storedId = object.source_definition_id;
  const hasStoredId = storedId !== undefined && storedId !== null;
  if (hasStoredId && (!Number.isSafeInteger(storedId) || Number(storedId) < 1)) {
    return projectionError(
      `${label}.source_definition_id must be a positive safe integer.`,
    );
  }
  const table = definitionTableForSourceType(sourceType);
  if (hasStoredId) {
    const contentKey = db.scalar<string>(
      `SELECT content_key FROM ${table} WHERE id = ?`,
      [storedId as number],
    );
    if (contentKey === null) {
      return projectionError(
        `${label}.source_definition_id ${String(storedId)} does not resolve.`,
      );
    }
    return references.sourceDefinition(sourceType, contentKey as ContentKey);
  }

  const configuredKey = object.definition_key_config;
  const storedKey = object.source_definition_key;
  if (
    configuredKey !== undefined &&
    configuredKey !== null &&
    typeof configuredKey !== 'string'
  ) {
    return projectionError(
      `${label}.definition_key_config must be a string or null.`,
    );
  }
  if (typeof configuredKey === 'string') {
    return null;
  }
  const contentKey = exactStoredContentKey(
    storedKey,
    `${label}.source_definition_key`,
  );
  if (contentKey === null) {
    return null;
  }
  const exists = db.scalar<number>(
    `SELECT id FROM ${table} WHERE content_key = ?`,
    [contentKey],
  );
  if (exists === null) {
    return projectionError(
      `${label}.source_definition_key '${contentKey}' does not resolve.`,
    );
  }
  return references.sourceDefinition(sourceType, contentKey);
}

/**
 * The only excluded GrantRule field is `selection_collection`. Runtime proof:
 * GrantRule.fromObject rejects every non-null value, and constraintFor in
 * grant-rule-planner.ts always emits null rather than reading the stored field.
 * Every other parsed field is included by default, including unknown future
 * extensions. The id/key fields below are mechanics-bearing replacements, not
 * exclusions: local ids and aliases become portable fingerprint references.
 */
const NON_MECHANICAL_GRANT_FIELDS = new Set(['selection_collection']);
// These four mechanics-bearing storage locators never enter canonical bytes:
// spell ids/keys become `spell`, and fixed source ids/keys become
// `source_definition`. When `definition_key_config` is present, the generator
// overwrites `source_definition_key` from parent config before lookup, so that
// fallback is inert and no replacement is emitted. In every other case the
// fixed key is resolved to the same portable source fingerprint as an id.
const PORTABLE_REFERENCE_FIELDS = new Set([
  'spell_version_id',
  'spell_version_key',
  'source_definition_id',
  'source_definition_key',
]);

function authoringGrants(
  db: DatabaseContext,
  text: string | null,
  references: StoredAuthoredReferenceResolverV1,
  label: string,
): readonly AuthoringGrant[] {
  return jsonArray(text, label).map((value, index): AuthoringGrant => {
    const ruleLabel = `${label}[${index}]`;
    let rule: GrantRule;
    try {
      rule = GrantRule.fromObject(value);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return projectionError(`${ruleLabel} is invalid: ${detail}`, { cause: error });
    }
    const object = {
      ...jsonObject(rule.toObject(), ruleLabel),
    } as Record<string, JsonValue | ContentFingerprintReference>;
    for (const field of NON_MECHANICAL_GRANT_FIELDS) delete object[field];

    if (rule.kind === 'fixed_spell') {
      object.spell = references.spell(
        fixedSpellContentKey(db, object, ruleLabel),
      );
    } else if (rule.kind === 'grant_source') {
      const sourceDefinition = sourceDefinitionReference(
        db, object, references, ruleLabel,
      );
      if (sourceDefinition !== null) object.source_definition = sourceDefinition;
    }
    for (const field of PORTABLE_REFERENCE_FIELDS) delete object[field];
    return object as AuthoringGrant;
  });
}

function canonicalGrant(grant: AuthoringGrant): CanonicalAuthoringGrantV1 {
  const canonical: Record<string, CanonicalAuthoringGrantV1[string]> = {};
  for (const [field, value] of Object.entries(grant)) {
    if (field === 'label') {
      if (value !== null && typeof value !== 'string') {
        return projectionError(`grant '${grant.rule_key}' label must be text or null.`);
      }
      canonical[field] = value === null ? null : canonicalRuleText(value);
    } else if (field === 'schools' || field === 'tags' || field === 'skills') {
      if (!Array.isArray(value)) {
        return projectionError(`grant '${grant.rule_key}' ${field} must be a string array.`);
      }
      const members = value.map((entry) => {
        if (typeof entry !== 'string') {
          return projectionError(`grant '${grant.rule_key}' ${field} must contain only strings.`);
        }
        if (field === 'skills') return skill(entry, `grant '${grant.rule_key}' skills`);
        return field === 'schools'
          ? spellSchool(nonEmpty(entry, `grant '${grant.rule_key}' schools`))
          : nonEmpty(entry, `grant '${grant.rule_key}' tags`);
      });
      canonical[field] = contentIdentitySet(members);
    } else {
      canonical[field] = value;
    }
  }
  return canonical as CanonicalAuthoringGrantV1;
}

function canonicalCharacterEffect(
  effect: Exclude<AuthoringCharacterEffect, { readonly kind: 'ability_override' }>,
): Exclude<CanonicalCharacterEffectV1, { readonly kind: 'ability_override' }>;
function canonicalCharacterEffect(
  effect: AuthoringCharacterEffect,
): CanonicalCharacterEffectV1;
function canonicalCharacterEffect(
  effect: AuthoringCharacterEffect,
): CanonicalCharacterEffectV1 {
  const notes = effect.notes === null ? null : canonicalRuleText(effect.notes);
  switch (effect.kind) {
    case 'damage_resistance':
      return { kind: effect.kind, label: effect.label, notes, damage_type: canonicalOpenPassthroughValue(effect.damage_type) };
    case 'hp_modifier':
      return { kind: effect.kind, label: effect.label, notes, hit_points_flat: effect.hit_points_flat, hit_points_per_level: effect.hit_points_per_level };
    case 'speed':
      return { kind: effect.kind, label: effect.label, notes, speed_bonus_feet: effect.speed_bonus_feet };
    case 'ability_increase':
      return { kind: effect.kind, label: effect.label, notes, ability: effect.ability, amount: effect.amount, maximum: effect.maximum };
    case 'ability_override':
      return { kind: effect.kind, label: effect.label, notes, ability: effect.ability, maximum: effect.maximum };
    case 'armor_class_bonus':
      return { kind: effect.kind, label: effect.label, notes, amount: effect.amount };
    case 'armor_class_formula':
      return { kind: effect.kind, label: effect.label, notes, base: effect.base, ability_1: effect.ability_1, ability_2: effect.ability_2, allows_shield: effect.allows_shield };
    case 'attack_ability_override':
      return { kind: effect.kind, label: effect.label, notes, ability: effect.ability, weapon_scope: effect.weapon_scope };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return { kind: effect.kind, label: effect.label, notes, amount: effect.amount, weapon_scope: effect.weapon_scope };
  }
}

function canonicalFeatureEffect(
  effect: AuthoringFeatureEffect,
): CanonicalFeatureEffectV1 {
  if (effect.kind === 'extra_attack') {
    return {
      kind: effect.kind,
      label: effect.label,
      notes: effect.notes === null ? null : canonicalRuleText(effect.notes),
      attack_count: effect.attack_count,
      weapon_scope: effect.weapon_scope,
    };
  }
  return canonicalCharacterEffect(effect);
}

function fingerprintValue<K extends ContentKind>(
  value: JsonValue | ContentFingerprintReference | undefined,
  kind: K,
  label: string,
): ContentFingerprintReference<K> {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return projectionError(`${label} is not a fingerprint reference.`);
  }
  const object = value as Readonly<Record<string, unknown>>;
  if (
    object.kind !== kind ||
    object.scheme !== CONTENT_FINGERPRINT_SCHEME_V1 ||
    typeof object.digest !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(object.digest)
  ) {
    return projectionError(`${label} is not a valid ${kind} content-v1 fingerprint.`);
  }
  return value as ContentFingerprintReference<K>;
}

function grantReferences(
  grants: readonly AuthoringGrant[],
): readonly Extract<AuthoredContentReferenceV1, {
  readonly role: 'grant.fixed_spell' | 'grant.source_definition';
}>[] {
  const references: Array<Extract<AuthoredContentReferenceV1, {
    readonly role: 'grant.fixed_spell' | 'grant.source_definition';
  }>> = [];
  for (const grant of grants) {
    if (grant.kind === 'fixed_spell') {
      references.push({
        role: 'grant.fixed_spell' as const,
        reference: fingerprintValue(grant.spell, 'spell', `grant '${grant.rule_key}' spell`),
      });
    } else if (grant.kind === 'grant_source' && grant.source_definition !== undefined) {
      const value = grant.source_definition;
      if (value === null || Array.isArray(value) || typeof value !== 'object') {
        return projectionError(`grant '${grant.rule_key}' source definition is not a fingerprint reference.`);
      }
      const kind = (value as Readonly<Record<string, unknown>>).kind;
      if (typeof kind !== 'string' || !isEnumValue(domainSourceTypes, kind)) {
        return projectionError(`grant '${grant.rule_key}' source definition kind is invalid.`);
      }
      references.push({
        role: 'grant.source_definition' as const,
        reference: fingerprintValue(value, kind, `grant '${grant.rule_key}' source definition`),
      });
    }
  }
  return references;
}

function grantSourceReferences(
  grants: readonly AuthoringGrant[],
): readonly Extract<AuthoredContentReferenceV1, {
  readonly role: 'grant.source_definition';
}>[] {
  return grantReferences(grants).filter(
    (reference): reference is Extract<AuthoredContentReferenceV1, {
      readonly role: 'grant.source_definition';
    }> => reference.role === 'grant.source_definition',
  );
}

function projectSpecies(
  aggregate: SpeciesContentAggregate,
): StoredProjection<'species'> {
  const payload: SpeciesProjectorPayloadV1 = {
    reference_text: canonicalRuleText(aggregate.reference_text),
    repeatable: aggregate.repeatable,
    grants: contentIdentitySequence(aggregate.grants.map(canonicalGrant)),
    creature_type: canonicalOpenPassthroughValue(aggregate.creature_type),
    primary_size: canonicalOpenPassthroughValue(aggregate.primary_size),
    alternate_size: aggregate.alternate_size === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.alternate_size),
    walking_speed_feet: aggregate.walking_speed_feet,
    traits: contentIdentitySequence(aggregate.traits.map((trait) => ({
      name: trait.name,
      description: canonicalRuleText(trait.description),
      effects: contentIdentitySequence(trait.effects.map(canonicalCharacterEffect)),
    }))),
  };
  return Object.freeze({
    kind: 'species',
    aggregate,
    payload,
    references: Object.freeze(grantReferences(aggregate.grants)),
  });
}

function projectBackground(
  aggregate: BackgroundContentAggregate,
): StoredProjection<'background'> {
  const projectEquipment = (item: BackgroundContentEquipment) => {
    switch (item.kind) {
      case 'gear':
        return { kind: item.kind, quantity: item.quantity, printed_name: item.printed_name };
      case 'weapon':
      case 'armor':
        return { kind: item.kind, quantity: item.quantity, printed_name: item.printed_name, content: item.content };
    }
  };
  const payload: BackgroundProjectorPayloadV1 = {
    reference_text: canonicalRuleText(aggregate.reference_text),
    repeatable: aggregate.repeatable,
    grants: contentIdentitySequence(aggregate.grants.map(canonicalGrant)),
    suggested_abilities: aggregate.suggested_abilities,
    default_origin_feat: aggregate.default_origin_feat,
    skill_proficiencies: aggregate.skill_proficiencies,
    tool_reference_text: aggregate.tool_reference_text === null
      ? null
      : canonicalRuleText(aggregate.tool_reference_text),
    equipment_option_a_description: canonicalRuleText(aggregate.equipment_option_a_description),
    equipment_option_b_description: canonicalRuleText(aggregate.equipment_option_b_description),
    equipment_option_a: contentIdentitySequence(aggregate.equipment_option_a.map(projectEquipment)),
    equipment_option_b: contentIdentitySequence(aggregate.equipment_option_b.map(projectEquipment)),
    effects: contentIdentitySequence(aggregate.effects.map(canonicalCharacterEffect)),
  };
  const equipmentReferences: Array<Extract<
    AuthoredContentReferenceV1,
    {
      readonly role:
        | 'background.equipment.weapon'
        | 'background.equipment.armor';
    }
  >> = [];
  for (const item of [...aggregate.equipment_option_a, ...aggregate.equipment_option_b]) {
    if (item.kind === 'weapon') {
      equipmentReferences.push({ role: 'background.equipment.weapon', reference: item.content });
    } else if (item.kind === 'armor') {
      equipmentReferences.push({ role: 'background.equipment.armor', reference: item.content });
    }
  }
  return Object.freeze({
    kind: 'background',
    aggregate,
    payload,
    references: Object.freeze([
      { role: 'background.default_origin_feat' as const, reference: aggregate.default_origin_feat },
      ...grantSourceReferences(aggregate.grants),
      ...equipmentReferences,
    ]),
  });
}

function projectSubclass(
  aggregate: SubclassContentAggregate,
): StoredProjection<'subclass'> {
  let projectedProgression: SubclassProjectorPayloadV1['progression'];
  switch (aggregate.progression.mode) {
    case 'inherit_parent':
      projectedProgression = { mode: 'inherit_parent' };
      break;
    case 'root_only':
      projectedProgression = aggregate.progression;
      break;
    case 'override':
      projectedProgression = {
          mode: 'override',
          spellcasting_ability: aggregate.progression.spellcasting_ability,
          caster_contribution: aggregate.progression.caster_contribution,
          rows: contentIdentitySequence(aggregate.progression.rows.map((row) => ({
            ...row,
            grants: contentIdentitySequence(row.grants.map(canonicalGrant)),
          }))),
        };
      break;
  }
  const payload: SubclassProjectorPayloadV1 = {
    reference_text: canonicalRuleText(aggregate.reference_text),
    parent_class: aggregate.parent_class,
    grants: contentIdentitySequence(aggregate.grants.map(canonicalGrant)),
    progression: projectedProgression,
    features: contentIdentitySequence(aggregate.features.map((feature) => ({
      class_level: feature.class_level,
      name: feature.name,
      description: canonicalRuleText(feature.description),
      effects: contentIdentitySequence(feature.effects.map(canonicalFeatureEffect)),
    }))),
  };
  const progressionGrants = aggregate.progression.mode === 'override'
    ? aggregate.progression.rows.flatMap((row) => row.grants)
    : [];
  return Object.freeze({
    kind: 'subclass',
    aggregate,
    payload,
    references: Object.freeze([
      { role: 'subclass.parent_class' as const, reference: aggregate.parent_class },
      ...grantReferences([...aggregate.grants, ...progressionGrants]),
    ]),
  });
}

export function projectAuthoredContentAggregateV1<
  K extends AuthoredProjectorKind,
>(aggregate: AuthoredProjectorAggregate<K>): StoredProjection<K> {
  let projection: StoredProjection<AuthoredProjectorKind>;
  switch (aggregate.kind) {
    case 'species':
      projection = projectSpecies(aggregate);
      break;
    case 'background':
      projection = projectBackground(aggregate);
      break;
    case 'subclass':
      projection = projectSubclass(aggregate);
      break;
  }
  return projection as StoredProjection<K>;
}

function readEffects(
  db: DatabaseContext,
  table: 'species_template_trait_effects' | 'background_template_effects',
  parentColumn: 'species_template_trait_id' | 'background_template_id',
  parentId: number,
): readonly AuthoringCharacterEffect[];
function readEffects(
  db: DatabaseContext,
  table: 'subclass_feature_effects',
  parentColumn: 'subclass_feature_id',
  parentId: number,
): readonly AuthoringFeatureEffect[];
function readEffects(
  db: DatabaseContext,
  table: string,
  parentColumn: string,
  parentId: number,
): readonly (AuthoringCharacterEffect | AuthoringFeatureEffect)[] {
  const feature = table === 'subclass_feature_effects';
  return db.all(
    `SELECT ${COMMON_EFFECT_COLUMNS},
            ${feature ? 'attack_count' : 'NULL AS attack_count'},
            label, notes
     FROM ${table}
     WHERE ${parentColumn} = ? ORDER BY sort_order`,
    [parentId],
    decodeEffectRow,
  ).map((row) => feature
    ? effectFromStoredRow(row, true)
    : effectFromStoredRow(row, false));
}

function readSpecies(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
): SpeciesContentAggregate {
  const root = db.one(
    `SELECT definition.name AS definition_name,
            definition.rules_edition AS definition_edition,
            definition.repeatable, definition.grant_rules, definition.notes,
            template.id AS template_id, template.name AS template_name,
            template.rules_edition AS template_edition,
            template.creature_type, template.size, template.alternate_size,
            template.base_speed_feet
     FROM species_definitions AS definition
     JOIN species_templates AS template
       ON template.content_key = definition.content_key
     WHERE definition.content_key = ?`,
    [contentKey],
    (row) => ({
      name: sqlString(row, 'definition_name'),
      edition: sqlString(row, 'definition_edition'),
      repeatable: sqlBoolean(row, 'repeatable'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
      notes: sqlNullableString(row, 'notes'),
      template_id: sqlInteger(row, 'template_id'),
      template_name: sqlString(row, 'template_name'),
      template_edition: sqlString(row, 'template_edition'),
      creature_type: sqlCreatureType(row, 'creature_type'),
      size: sqlCreatureSize(row, 'size'),
      alternate_size: row.alternate_size === null
        ? null
        : sqlCreatureSize(row, 'alternate_size'),
      base_speed_feet: sqlInteger(row, 'base_speed_feet'),
    }),
  );
  if (root === null) return projectionError(`species '${contentKey}' is incomplete or missing.`);
  if (root.name !== root.template_name || root.edition !== root.template_edition) {
    return projectionError(`species '${contentKey}' definition/template metadata disagree.`);
  }
  const traits = db.all(
    `SELECT id, sort_order, name, description
     FROM species_template_traits WHERE species_template_id = ?
     ORDER BY sort_order`,
    [root.template_id],
    (row) => ({
      id: sqlInteger(row, 'id'),
      sort_order: sqlInteger(row, 'sort_order'),
      name: sqlString(row, 'name'),
      description: sqlString(row, 'description'),
    }),
  ).map((trait) => ({
    sort_order: trait.sort_order,
    name: trait.name,
    description: trait.description,
    effects: readEffects(db, 'species_template_trait_effects', 'species_template_trait_id', trait.id),
  }));
  return {
    kind: 'species',
    name: nonEmpty(root.name, 'species name'),
    rules_edition: rulesEdition(root.edition),
    reference_text: root.notes ?? '',
    repeatable: root.repeatable,
    creature_type: root.creature_type,
    primary_size: root.size,
    alternate_size: root.alternate_size,
    walking_speed_feet: root.base_speed_feet,
    traits,
    grants: authoringGrants(db, root.grant_rules, references, 'species grant_rules'),
  };
}

interface StoredEquipmentRow {
  readonly option: string;
  readonly sort_order: number;
  readonly quantity: number;
  readonly printed_name: string;
  readonly kind: string;
  readonly weapon_key: ContentKey | null;
  readonly armor_key: ContentKey | null;
}

function readBackground(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
): BackgroundContentAggregate {
  const root = db.one(
    `SELECT definition.name AS definition_name,
            definition.rules_edition AS definition_edition,
            definition.repeatable, definition.grant_rules, definition.notes,
            template.id AS template_id, template.name AS template_name,
            template.rules_edition AS template_edition,
            template.ability_score_1, template.ability_score_2,
            template.ability_score_3, template.feat_name,
            template.skill_proficiency_1, template.skill_proficiency_2,
            template.tool_proficiency, template.equipment_option_a,
            template.equipment_option_b
     FROM background_definitions AS definition
     JOIN background_templates AS template
       ON template.content_key = definition.content_key
     WHERE definition.content_key = ?`,
    [contentKey],
    (row) => ({
      name: sqlString(row, 'definition_name'),
      edition: sqlString(row, 'definition_edition'),
      repeatable: sqlBoolean(row, 'repeatable'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
      notes: sqlNullableString(row, 'notes'),
      template_id: sqlInteger(row, 'template_id'),
      template_name: sqlString(row, 'template_name'),
      template_edition: sqlString(row, 'template_edition'),
      abilities: [sqlString(row, 'ability_score_1'), sqlString(row, 'ability_score_2'), sqlString(row, 'ability_score_3')] as const,
      feat_name: sqlString(row, 'feat_name'),
      skills: [sqlString(row, 'skill_proficiency_1'), sqlString(row, 'skill_proficiency_2')] as const,
      tool: sqlString(row, 'tool_proficiency'),
      option_a: sqlString(row, 'equipment_option_a'),
      option_b: sqlString(row, 'equipment_option_b'),
    }),
  );
  if (root === null) return projectionError(`background '${contentKey}' is incomplete or missing.`);
  if (root.name !== root.template_name || root.edition !== root.template_edition) {
    return projectionError(`background '${contentKey}' definition/template metadata disagree.`);
  }
  const edition = rulesEdition(root.edition);
  const grants = authoringGrants(
    db,
    root.grant_rules,
    references,
    'background grant_rules',
  );
  if (grants.some((grant) => grant.kind !== 'grant_source')) {
    return projectionError('background grant_rules must contain only grant_source rules.');
  }
  const rows = db.all(
    `SELECT item.option, item.sort_order, item.quantity,
            item.item_name, item.item_kind,
            weapon.content_key AS weapon_key,
            armor.content_key AS armor_key
     FROM background_equipment_items AS item
     LEFT JOIN weapon_templates AS weapon ON weapon.id = item.weapon_template_id
     LEFT JOIN armor_templates AS armor ON armor.id = item.armor_template_id
     WHERE item.background_template_id = ?
     ORDER BY item.option, item.sort_order`,
    [root.template_id],
    (row): StoredEquipmentRow => ({
      option: sqlString(row, 'option'),
      sort_order: sqlInteger(row, 'sort_order'),
      quantity: sqlInteger(row, 'quantity'),
      printed_name: sqlString(row, 'item_name'),
      kind: sqlString(row, 'item_kind'),
      weapon_key: sqlNullableString(row, 'weapon_key') as ContentKey | null,
      armor_key: sqlNullableString(row, 'armor_key') as ContentKey | null,
    }),
  );
  const equipment = (option: 'a' | 'b'): readonly BackgroundContentEquipment[] =>
    rows.filter((row) => row.option === option).map((row) => {
      const common = { sort_order: row.sort_order, quantity: row.quantity, printed_name: row.printed_name };
      switch (row.kind) {
        case 'gear':
          return { ...common, kind: row.kind };
        case 'weapon':
          if (row.weapon_key === null) return projectionError('background weapon equipment has no template reference.');
          return { ...common, kind: row.kind, content: references.weapon(row.weapon_key) };
        case 'armor':
          if (row.armor_key === null) return projectionError('background armor equipment has no template reference.');
          return { ...common, kind: row.kind, content: references.armor(row.armor_key) };
        default:
          return projectionError(`background equipment kind '${row.kind}' is invalid.`);
      }
    });
  return {
    kind: 'background',
    name: nonEmpty(root.name, 'background name'),
    rules_edition: edition,
    reference_text: root.notes ?? '',
    repeatable: root.repeatable,
    grants: grants as BackgroundContentAggregate['grants'],
    suggested_abilities: [ability(root.abilities[0], 'first suggested ability'), ability(root.abilities[1], 'second suggested ability'), ability(root.abilities[2], 'third suggested ability')],
    default_origin_feat: references.featByStoredName({ name: root.feat_name, edition }),
    skill_proficiencies: [skill(root.skills[0], 'first background skill'), skill(root.skills[1], 'second background skill')],
    tool_reference_text: root.tool === '' ? null : root.tool,
    equipment_option_a_description: root.option_a,
    equipment_option_b_description: root.option_b,
    equipment_option_a: equipment('a'),
    equipment_option_b: equipment('b'),
    effects: readEffects(db, 'background_template_effects', 'background_template_id', root.template_id),
  };
}

function casterContribution(
  fraction: string | null,
  rounding: string | null,
): Exclude<ProgressionType, 'none'> {
  const value =
    fraction === '1' && rounding === null
      ? 'full'
      : fraction === '1/2' && rounding === 'up'
        ? 'half_up'
        : fraction === '1/2' && rounding === 'down'
          ? 'half_down'
          : fraction === '1/3' && rounding === 'up'
            ? 'third_up'
            : fraction === '1/3' && rounding === 'down'
              ? 'third_down'
              : null;
  if (value === null || !isEnumValue(progressionTypes, value)) {
    return projectionError(`caster fraction '${String(fraction)}' and rounding '${String(rounding)}' are invalid.`);
  }
  return value;
}

function slotCounts(text: string | null, label: string): SubclassContentProgressionRow['slot_counts'] {
  if (text === null || text === '') return projectionError(`${label} has no slot table.`);
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch (error) {
    throw new TypeError(`Stored content-v1 projection failed: ${label} slot table is invalid JSON.`, { cause: error });
  }
  const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (Array.isArray(decoded)) {
    if (decoded.length !== 0) return projectionError(`${label} slot array must be empty.`);
  } else if (decoded !== null && typeof decoded === 'object') {
    for (const [levelText, count] of Object.entries(decoded)) {
      const level = Number(levelText);
      if (!Number.isSafeInteger(level) || level < 1 || level > 9 || !Number.isSafeInteger(count) || Number(count) < 0) {
        return projectionError(`${label} slot '${levelText}' is invalid.`);
      }
      counts[level - 1] = Number(count);
    }
  } else {
    return projectionError(`${label} slot table must be an object or empty array.`);
  }
  return counts as unknown as SubclassContentProgressionRow['slot_counts'];
}

function denseProgression(
  rows: readonly SubclassContentProgressionRow[],
): DenseSubclassContentProgression {
  if (rows.length !== 20 || rows.some((row, index) => row.class_level !== index + 1)) {
    return projectionError('subclass override progression must contain ordered levels 1 through 20 exactly once.');
  }
  return rows as DenseSubclassContentProgression;
}

function rootOnlyProgression(
  spellcastingAbility: string | null,
  casterFraction: string | null,
  casterRounding: string | null,
): Extract<SubclassContentAggregate['progression'], { readonly mode: 'root_only' }> {
  const common = {
    mode: 'root_only' as const,
    spellcasting_ability: nullableAbility(
      spellcastingAbility,
      'subclass spellcasting ability',
    ),
  };
  if (casterFraction === null && casterRounding === null) {
    return { ...common, caster_fraction: null, caster_rounding: null };
  }
  if (casterFraction === '1' && casterRounding === null) {
    return { ...common, caster_fraction: casterFraction, caster_rounding: null };
  }
  if (
    (casterFraction === '1/2' || casterFraction === '1/3') &&
    (casterRounding === 'up' || casterRounding === 'down')
  ) {
    return {
      ...common,
      caster_fraction: casterFraction,
      caster_rounding: casterRounding,
    };
  }
  return projectionError(
    `zero-row subclass caster fraction '${String(casterFraction)}' and ` +
      `rounding '${String(casterRounding)}' are invalid.`,
  );
}

function readSubclass(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
): SubclassContentAggregate {
  const root = db.one(
    `SELECT subclass.id, subclass.name, subclass.rules_edition,
            subclass.spellcasting_ability, subclass.caster_fraction,
            subclass.caster_rounding, subclass.grant_rules, subclass.notes,
            parent.content_key AS parent_key
     FROM subclass_definitions AS subclass
     JOIN class_definitions AS parent ON parent.id = subclass.class_definition_id
     WHERE subclass.content_key = ?`,
    [contentKey],
    (row) => ({
      id: sqlInteger(row, 'id'),
      name: sqlString(row, 'name'),
      edition: sqlString(row, 'rules_edition'),
      spellcasting_ability: sqlNullableString(row, 'spellcasting_ability'),
      caster_fraction: sqlNullableString(row, 'caster_fraction'),
      caster_rounding: sqlNullableString(row, 'caster_rounding'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
      notes: sqlNullableString(row, 'notes'),
      parent_key: sqlString(row, 'parent_key') as ContentKey,
    }),
  );
  if (root === null) return projectionError(`subclass '${contentKey}' is missing.`);
  const progressionRows = db.all(
    `SELECT class_level, cantrips_known, prepared_count, max_spell_level,
            slots, grant_rules
     FROM subclass_progressions WHERE subclass_definition_id = ?
     ORDER BY class_level`,
    [root.id],
    (row) => ({
      class_level: characterLevel(sqlInteger(row, 'class_level'), 'subclass progression level'),
      cantrips_known: sqlInteger(row, 'cantrips_known'),
      prepared_or_known_count: sqlInteger(row, 'prepared_count'),
      maximum_spell_level: sqlInteger(row, 'max_spell_level'),
      slots: sqlNullableString(row, 'slots'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
    }),
  ).map((row): SubclassContentProgressionRow => ({
    class_level: row.class_level,
    cantrips_known: row.cantrips_known,
    prepared_or_known_count: row.prepared_or_known_count,
    maximum_spell_level: row.maximum_spell_level,
    slot_counts: slotCounts(row.slots, `subclass level ${row.class_level}`),
    grants: authoringGrants(db, row.grant_rules, references, `subclass level ${row.class_level} grant_rules`),
  }));
  const progression: SubclassContentAggregate['progression'] =
    progressionRows.length === 0
      ? root.spellcasting_ability === null &&
          root.caster_fraction === null &&
          root.caster_rounding === null
        ? { mode: 'inherit_parent' }
        : rootOnlyProgression(
            root.spellcasting_ability,
            root.caster_fraction,
            root.caster_rounding,
          )
      : {
          mode: 'override',
          spellcasting_ability: nullableAbility(root.spellcasting_ability, 'subclass spellcasting ability'),
          caster_contribution: casterContribution(root.caster_fraction, root.caster_rounding),
          rows: denseProgression(progressionRows),
        };
  const features = db.all(
    `SELECT id, class_level, sort_order, name, description
     FROM subclass_features WHERE subclass_definition_id = ?
     ORDER BY sort_order`,
    [root.id],
    (row) => ({
      id: sqlInteger(row, 'id'),
      class_level: characterLevel(sqlInteger(row, 'class_level'), 'subclass feature level'),
      sort_order: sqlInteger(row, 'sort_order'),
      name: sqlString(row, 'name'),
      description: sqlString(row, 'description'),
    }),
  ).map((feature) => ({
    class_level: feature.class_level,
    sort_order: feature.sort_order,
    name: feature.name,
    description: feature.description,
    effects: readEffects(db, 'subclass_feature_effects', 'subclass_feature_id', feature.id),
  }));
  return {
    kind: 'subclass',
    name: nonEmpty(root.name, 'subclass name'),
    rules_edition: rulesEdition(root.edition),
    reference_text: root.notes ?? '',
    parent_class: references.class(root.parent_key),
    grants: authoringGrants(db, root.grant_rules, references, 'subclass grant_rules'),
    progression,
    features,
  };
}

export function readStoredAuthoredContentAggregateV1<
  K extends AuthoredProjectorKind,
>(
  db: DatabaseContext,
  input: StoredAuthoredProjectionInputV1<K>,
): AuthoredProjectorAggregate<K> {
  let aggregate: AuthoredProjectorAggregate<AuthoredProjectorKind>;
  switch (input.kind) {
    case 'species':
      aggregate = readSpecies(db, input.contentKey, input.references);
      break;
    case 'background':
      aggregate = readBackground(db, input.contentKey, input.references);
      break;
    case 'subclass':
      aggregate = readSubclass(db, input.contentKey, input.references);
      break;
  }
  return aggregate as AuthoredProjectorAggregate<K>;
}

export function projectStoredAuthoredContentV1<
  K extends AuthoredProjectorKind,
>(
  db: DatabaseContext,
  input: StoredAuthoredProjectionInputV1<K>,
): StoredProjection<K> {
  return projectAuthoredContentAggregateV1(
    readStoredAuthoredContentAggregateV1(db, input),
  );
}

export function resolveStoredAuthoredContentV1<
  K extends AuthoredProjectorKind,
>(
  db: DatabaseContext,
  input: StoredAuthoredProjectionInputV1<K> & {
    readonly compatibleFingerprints?: readonly ContentFingerprintCandidate[];
    readonly metadataConflict?: boolean;
  },
): {
  readonly projection: StoredProjection<K>;
  readonly identity: DerivedContentIdentityV1<K, AuthoredProjectorPayloadV1<K>>;
  readonly resolution: ContentResolution;
} {
  const projection = projectStoredAuthoredContentV1(db, input);
  const resolved = resolveContentAggregate(db, {
    kind: projection.kind,
    edition: projection.aggregate.rules_edition,
    name: projection.aggregate.name,
    payload: projection.payload,
    ...(input.compatibleFingerprints === undefined
      ? {}
      : { compatibleFingerprints: input.compatibleFingerprints }),
    ...(input.metadataConflict === undefined
      ? {}
      : { metadataConflict: input.metadataConflict }),
  });
  return Object.freeze({ projection, ...resolved });
}

const SHA256 = /^[0-9a-f]{64}$/u;

function fingerprintReference<K extends ContentKind>(
  db: DatabaseContext,
  kind: K,
  contentKey: ContentKey,
): ContentFingerprintReference<K> {
  const digests = db.all(
    `SELECT fingerprint_digest
     FROM catalog_content_fingerprints
     WHERE content_kind = ? AND content_key = ?
       AND fingerprint_scheme = ?
       AND fingerprint_role IN ('current', 'compatible')
     ORDER BY CASE fingerprint_role WHEN 'current' THEN 0 ELSE 1 END`,
    [kind, contentKey, CONTENT_FINGERPRINT_SCHEME_V1],
    (row) => sqlString(row, 'fingerprint_digest'),
  );
  if (digests.length !== 1 || !SHA256.test(digests[0]!)) {
    return projectionError(
      `${kind} dependency '${contentKey}' does not have exactly one usable content-v1 fingerprint.`,
    );
  }
  return Object.freeze({
    kind,
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: digests[0] as ContentFingerprintDigest,
  });
}

/** Registry-backed dependency resolver for ordinary stored graph projection. */
export function storedAuthoredRegistryReferencesV1(
  db: DatabaseContext,
): StoredAuthoredReferenceResolverV1 {
  const resolver: StoredAuthoredReferenceResolverV1 = {
    spell: (contentKey) => fingerprintReference(db, 'spell', contentKey),
    featByStoredName: ({ name, edition }) => {
      const keys = db.all(
        `SELECT content_key FROM feat_definitions
         WHERE name = ? AND rules_edition = ? ORDER BY content_key`,
        [name, edition],
        (row) => sqlString(row, 'content_key') as ContentKey,
      );
      if (keys.length !== 1) {
        return projectionError(
          `background feat '${name}' in edition '${edition}' does not resolve uniquely.`,
        );
      }
      return fingerprintReference(db, 'feat', keys[0]!);
    },
    class: (contentKey) => fingerprintReference(db, 'class', contentKey),
    weapon: (contentKey) => fingerprintReference(db, 'weapon', contentKey),
    armor: (contentKey) => fingerprintReference(db, 'armor', contentKey),
    sourceDefinition: (kind, contentKey) =>
      fingerprintReference(db, kind, contentKey),
  };
  return Object.freeze(resolver);
}
