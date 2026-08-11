import type { DatabaseContext } from '../db/database';
import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import { rowContractError } from '../domain/contracts/rows';
import {
  decodeStoredSupersedesReference,
  decodeStoredValueExpression,
} from '../domain/contracts/row-rules';
import type { RulesEdition } from '../domain/enums';
import {
  abilities,
  damageTypes,
  extraAttackWeaponScopes,
  featureTemplateEffectKinds,
  isEnumValue,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { JsonObject, JsonValue } from '../domain/models';
import { decodeClassResourceFormula } from '../domain/class-resources';
import { decodePrimaryAbilityExpression } from '../domain/primary-ability';
import type { AuthoringGrant, ContentFingerprintReference } from '../authoring/contracts';
import { AUTHORING_NUMERIC_LIMITS } from '../authoring/limits';
import {
  CHARACTER_EFFECT_FORM,
  FEATURE_ONLY_EFFECT_FORM,
} from '../authoring/effect-forms';
import type { CanonicalAuthoringGrantV1 } from './authored-content-projector-contract-v1';
import {
  canonicalOpenPassthroughValue,
  canonicalRuleText,
  contentIdentitySequence,
  contentIdentitySet,
  type CanonicalOpenPassthroughValue,
  type CanonicalRuleText,
  type ContentIdentitySequence,
  type ContentIdentitySet,
} from './content-identity';
import {
  projectStoredGrantRulesV1,
  type StoredAuthoredReferenceResolverV1,
} from './stored-authored-content-projector-v1';

export class StoredSourceContentProjectionError extends TypeError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Stored source content-v1 projection failed: ${message}`, options);
    this.name = 'StoredSourceContentProjectionError';
  }
}

type CanonicalScalar =
  | boolean
  | number
  | string
  | null
  | JsonValue
  | CanonicalRuleText
  | CanonicalOpenPassthroughValue
  | ContentFingerprintReference
  | readonly AuthoringGrant[]
  | readonly CanonicalClassRowV1[]
  | ContentIdentitySequence<CanonicalAuthoringGrantV1>
  | ContentIdentitySequence<CanonicalClassRowV1>;

export type CanonicalClassRowV1 = Readonly<Record<string, CanonicalScalar>>;

export interface ClassContentAggregateV1 {
  readonly kind: 'class';
  readonly name: string;
  readonly rules_edition: RulesEdition;
  readonly spellcasting_ability: string | null;
  readonly progression_type: string;
  readonly caster_fraction: string | null;
  readonly caster_rounding: string | null;
  readonly prepares_or_knows: string | null;
  readonly supports_ritual_casting: boolean;
  readonly ritual_casting_mode: string | null;
  readonly primary_ability_expression: string | null;
  readonly notes: string | null;
  readonly progressions: readonly CanonicalClassRowV1[];
  readonly sheet_traits: CanonicalClassRowV1 | null;
  readonly saving_throw_proficiencies: readonly CanonicalClassRowV1[];
  readonly skill_options: readonly CanonicalClassRowV1[];
  readonly armor_training: readonly CanonicalClassRowV1[];
  readonly weapon_proficiencies: readonly CanonicalClassRowV1[];
  readonly extra_attack_grants: readonly CanonicalClassRowV1[];
  readonly martial_arts_dice: readonly CanonicalClassRowV1[];
  readonly weapon_mastery_grants: readonly CanonicalClassRowV1[];
  readonly weapon_mastery_counts: readonly CanonicalClassRowV1[];
  readonly equipment_items: readonly CanonicalClassRowV1[];
  readonly resources: readonly CanonicalClassRowV1[];
  readonly resource_formulas: readonly CanonicalClassRowV1[];
  readonly feature_effects: readonly CanonicalClassRowV1[];
  /** New arms join feature_effects; this source-only field emits no sibling key. */
  readonly feature_value_contributions?: readonly CanonicalClassRowV1[];
  readonly named_features: readonly CanonicalClassRowV1[];
  /** Stored-only, default-included future root columns; never accepted from documents. */
  readonly stored_fields?: CanonicalClassRowV1;
}

export interface FeatContentAggregateV1 {
  readonly kind: 'feat';
  readonly name: string;
  readonly rules_edition: RulesEdition;
  readonly category: string | null;
  readonly min_level: number | null;
  readonly ability_points: number;
  readonly ability_increase_abilities: 'any' | readonly string[] | null;
  readonly ability_increase_maximum: number | null;
  readonly repeatable: boolean;
  readonly prerequisites: readonly JsonObject[];
  readonly grants: readonly AuthoringGrant[];
  readonly notes: string | null;
  /** Stored-only, default-included future root columns; never accepted from documents. */
  readonly stored_fields?: CanonicalClassRowV1;
}

export type SourceContentReferenceV1 =
  | { readonly role: 'class.grant'; readonly reference: ContentFingerprintReference }
  | { readonly role: 'class.equipment'; readonly reference: ContentFingerprintReference<'weapon' | 'armor'> }
  | { readonly role: 'feat.grant'; readonly reference: ContentFingerprintReference };

function grantReferences(
  role: 'class.grant' | 'feat.grant',
  grants: readonly AuthoringGrant[],
): readonly SourceContentReferenceV1[] {
  return grants.flatMap((grant) => {
    const references: SourceContentReferenceV1[] = [];
    for (const field of ['spell', 'source_definition'] as const) {
      const value = grant[field];
      if (
        value !== undefined && value !== null && typeof value === 'object' &&
        !Array.isArray(value) && 'kind' in value && 'scheme' in value && 'digest' in value
      ) {
        references.push({ role, reference: value as ContentFingerprintReference });
      }
    }
    return references;
  });
}

function classReferences(aggregate: ClassContentAggregateV1): readonly SourceContentReferenceV1[] {
  const references: SourceContentReferenceV1[] = [];
  for (const progression of aggregate.progressions) {
    if (Array.isArray(progression.grant_rules)) {
      references.push(...grantReferences(
        'class.grant',
        progression.grant_rules as unknown as readonly AuthoringGrant[],
      ));
    }
  }
  for (const item of aggregate.equipment_items) {
    const reference = item.reference;
    if (
      reference !== null && typeof reference === 'object' && !Array.isArray(reference) &&
      'kind' in reference && (reference.kind === 'weapon' || reference.kind === 'armor')
    ) {
      references.push({
        role: 'class.equipment',
        reference: reference as ContentFingerprintReference<'weapon' | 'armor'>,
      });
    }
  }
  return Object.freeze(references);
}

export interface ClassProjectorPayloadV1 {
  readonly spellcasting_ability: CanonicalOpenPassthroughValue | null;
  readonly progression_type: CanonicalOpenPassthroughValue;
  readonly caster_fraction: CanonicalOpenPassthroughValue | null;
  readonly caster_rounding: CanonicalOpenPassthroughValue | null;
  readonly prepares_or_knows: CanonicalOpenPassthroughValue | null;
  readonly supports_ritual_casting: boolean;
  readonly ritual_casting_mode: CanonicalOpenPassthroughValue | null;
  readonly primary_ability_expression: {
    readonly kind: 'one_of' | 'all_of';
    readonly abilities: ContentIdentitySet<string>;
  } | null;
  readonly notes: CanonicalRuleText;
  readonly progressions: ContentIdentitySet<CanonicalClassRowV1>;
  readonly sheet_traits: CanonicalClassRowV1 | null;
  readonly saving_throw_proficiencies: ContentIdentitySet<CanonicalClassRowV1>;
  readonly skill_options: ContentIdentitySet<CanonicalClassRowV1>;
  readonly armor_training: ContentIdentitySet<CanonicalClassRowV1>;
  readonly weapon_proficiencies: ContentIdentitySet<CanonicalClassRowV1>;
  readonly extra_attack_grants: ContentIdentitySet<CanonicalClassRowV1>;
  readonly martial_arts_dice: ContentIdentitySet<CanonicalClassRowV1>;
  readonly weapon_mastery_grants: ContentIdentitySet<CanonicalClassRowV1>;
  readonly weapon_mastery_counts: ContentIdentitySet<CanonicalClassRowV1>;
  readonly equipment_items: ContentIdentitySequence<CanonicalClassRowV1>;
  readonly resources: ContentIdentitySet<CanonicalClassRowV1>;
  readonly resource_formulas: ContentIdentitySet<CanonicalClassRowV1>;
  readonly feature_effects: ContentIdentitySet<CanonicalClassRowV1>;
  readonly named_features: ContentIdentitySet<CanonicalClassRowV1>;
}

function canonicalPrimaryAbilityExpression(value: string | null) {
  if (value === null || value.trim() === '') return null;
  const decoded = decodePrimaryAbilityExpression(value);
  if (decoded.kind !== 'decoded') {
    throw new StoredSourceContentProjectionError(
      'class primary_ability_expression is invalid.',
    );
  }
  return {
    kind: decoded.expression.kind,
    abilities: contentIdentitySet(decoded.expression.abilities),
  };
}

export interface FeatProjectorPayloadV1 {
  readonly category: CanonicalOpenPassthroughValue | null;
  readonly min_level: number | null;
  readonly ability_points: number;
  readonly ability_increase_abilities:
    | 'any'
    | ContentIdentitySet<CanonicalOpenPassthroughValue>
    | null;
  readonly ability_increase_maximum: number | null;
  readonly repeatable: boolean;
  readonly prerequisites: ContentIdentitySet<CanonicalFeatPrerequisiteV1>;
  readonly grants: ContentIdentitySequence<CanonicalAuthoringGrantV1>;
  readonly notes: CanonicalRuleText;
}

export type CanonicalFeatPrerequisiteV1 =
  | { readonly kind: 'feature'; readonly feature: 'fighting_style' | 'spellcasting' }
  | {
      readonly kind: 'ability_score';
      readonly abilities: ContentIdentitySet<string>;
      readonly minimum: number;
    };

function canonicalFeatPrerequisites(
  prerequisites: readonly JsonObject[],
): ContentIdentitySet<CanonicalFeatPrerequisiteV1> {
  return contentIdentitySet(prerequisites.map((prerequisite) => {
    if (
      prerequisite.kind === 'feature' &&
      (prerequisite.feature === 'fighting_style' || prerequisite.feature === 'spellcasting')
    ) {
      return { kind: prerequisite.kind, feature: prerequisite.feature };
    }
    if (
      prerequisite.kind === 'ability_score' &&
      Array.isArray(prerequisite.abilities) &&
      prerequisite.abilities.length > 0 &&
      prerequisite.abilities.every((ability) => isEnumValue(abilities, ability)) &&
      Number.isSafeInteger(prerequisite.minimum) &&
      Number(prerequisite.minimum) >= 1 &&
      Number(prerequisite.minimum) <= 30
    ) {
      return {
        kind: prerequisite.kind,
        abilities: contentIdentitySet(prerequisite.abilities as string[]),
        minimum: Number(prerequisite.minimum),
      };
    }
    throw new StoredSourceContentProjectionError('feat prerequisite is malformed.');
  }));
}

export function projectClassContentV1(
  aggregate: ClassContentAggregateV1,
): ClassProjectorPayloadV1 {
  return {
    ...aggregate.stored_fields,
    spellcasting_ability: aggregate.spellcasting_ability === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.spellcasting_ability),
    progression_type: canonicalOpenPassthroughValue(aggregate.progression_type),
    caster_fraction: aggregate.caster_fraction === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.caster_fraction),
    caster_rounding: aggregate.caster_rounding === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.caster_rounding),
    prepares_or_knows: aggregate.prepares_or_knows === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.prepares_or_knows),
    supports_ritual_casting: aggregate.supports_ritual_casting,
    ritual_casting_mode: aggregate.ritual_casting_mode === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.ritual_casting_mode),
    primary_ability_expression: canonicalPrimaryAbilityExpression(
      aggregate.primary_ability_expression,
    ),
    notes: canonicalRuleText(aggregate.notes ?? ''),
    progressions: contentIdentitySet(aggregate.progressions.map((row) => {
      const grants = row.grant_rules;
      if (!Array.isArray(grants)) {
        throw new StoredSourceContentProjectionError(
          'class progression grant_rules must be a list.',
        );
      }
      if (aggregate.progression_type !== 'none' && aggregate.progression_type !== 'pact') {
        validatedSlots(
          row.slots as unknown as JsonValue | null,
          'class progression slots',
        );
      }
      if (aggregate.progression_type === 'pact') {
        validatedPactSlots(
          row.pact_slots as unknown as JsonValue | null,
          'class progression pact_slots',
        );
      }
      return {
        ...row,
        grant_rules: canonicalFeatGrants(
          grants as unknown as readonly AuthoringGrant[],
        ),
      };
    })),
    sheet_traits: aggregate.sheet_traits,
    saving_throw_proficiencies: contentIdentitySet(aggregate.saving_throw_proficiencies),
    skill_options: contentIdentitySet(aggregate.skill_options),
    armor_training: contentIdentitySet(aggregate.armor_training),
    weapon_proficiencies: contentIdentitySet(aggregate.weapon_proficiencies),
    extra_attack_grants: contentIdentitySet(aggregate.extra_attack_grants),
    martial_arts_dice: contentIdentitySet(aggregate.martial_arts_dice),
    weapon_mastery_grants: contentIdentitySet(aggregate.weapon_mastery_grants),
    weapon_mastery_counts: contentIdentitySet(aggregate.weapon_mastery_counts),
    equipment_items: contentIdentitySequence(aggregate.equipment_items),
    resources: contentIdentitySet(aggregate.resources),
    resource_formulas: contentIdentitySet(aggregate.resource_formulas),
    // Contributions are a new discriminated arm INSIDE the existing effects
    // collection. An aggregate with no contribution therefore emits the exact
    // historical payload bytes: no new sibling property and no changed effect.
    feature_effects: contentIdentitySet([
      ...aggregate.feature_effects,
      ...(aggregate.feature_value_contributions ?? []),
    ]),
    named_features: contentIdentitySet(aggregate.named_features.map((feature) => {
      const effects = feature.effects;
      if (!Array.isArray(effects)) {
        throw new StoredSourceContentProjectionError(
          'class named feature effects must be a list.',
        );
      }
      return {
        ...feature,
        effects: contentIdentitySequence(effects as CanonicalClassRowV1[]),
      };
    })),
  };
}

function canonicalFeatGrants(
  grants: readonly AuthoringGrant[],
): ContentIdentitySequence<CanonicalAuthoringGrantV1> {
  return contentIdentitySequence(grants.map((grant) => {
    const canonical: Record<string, CanonicalAuthoringGrantV1[string]> = {};
    for (const [field, value] of Object.entries(grant)) {
      if (field === 'label' && typeof value === 'string') {
        canonical[field] = canonicalRuleText(value);
      } else if (field === 'schools' || field === 'tags' || field === 'skills') {
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
          throw new StoredSourceContentProjectionError(
            `feat grant '${grant.rule_key}' ${field} must be a string list.`,
          );
        }
        canonical[field] = contentIdentitySet(value as string[]);
      } else {
        canonical[field] = value;
      }
    }
    return canonical as CanonicalAuthoringGrantV1;
  }));
}

export function projectFeatContentV1(
  aggregate: FeatContentAggregateV1,
): FeatProjectorPayloadV1 {
  if (
    Array.isArray(aggregate.ability_increase_abilities) &&
    (aggregate.ability_increase_abilities.length === 0 ||
      aggregate.ability_increase_abilities.some((ability) => !isEnumValue(abilities, ability)))
  ) {
    throw new StoredSourceContentProjectionError(
      'feat ability_increase_abilities must be "any", a non-empty ability set, or null.',
    );
  }
  return {
    ...aggregate.stored_fields,
    category: aggregate.category === null
      ? null
      : canonicalOpenPassthroughValue(aggregate.category),
    min_level: aggregate.min_level,
    ability_points: aggregate.ability_points,
    ability_increase_abilities: aggregate.ability_increase_abilities === null ||
        aggregate.ability_increase_abilities === 'any'
      ? aggregate.ability_increase_abilities
      : contentIdentitySet(
          aggregate.ability_increase_abilities.map(canonicalOpenPassthroughValue),
        ),
    ability_increase_maximum: aggregate.ability_increase_maximum,
    repeatable: aggregate.repeatable,
    prerequisites: canonicalFeatPrerequisites(aggregate.prerequisites),
    grants: canonicalFeatGrants(aggregate.grants),
    notes: canonicalRuleText(aggregate.notes ?? ''),
  };
}

function fail(message: string, options?: ErrorOptions): never {
  throw new StoredSourceContentProjectionError(message, options);
}

type SourceAggregateTable =
  | 'class_definitions'
  | 'class_progressions'
  | 'class_sheet_traits'
  | 'class_saving_throw_proficiencies'
  | 'class_skill_options'
  | 'class_armor_training'
  | 'class_weapon_proficiencies'
  | 'class_extra_attack_grants'
  | 'class_martial_arts_dice'
  | 'class_weapon_mastery_grants'
  | 'class_weapon_mastery_counts'
  | 'class_equipment_items'
  | 'class_resources'
  | 'class_resource_formulas'
  | 'class_feature_effects'
  | 'class_feature_value_contributions'
  | 'named_features'
  | 'named_feature_effects'
  | 'feat_definitions';

function validatedRow(
  table: SourceAggregateTable,
  row: SqlRow,
  label: string,
): SqlRow {
  // These are the tables in this graph with a complete native row contract.
  // Validate current columns before canonicalizing them; unforeseen future
  // columns still default-include through storedSemanticRow below.
  if (
    table === 'feat_definitions' ||
    table === 'class_feature_value_contributions'
  ) {
    const currentColumns = table === 'feat_definitions'
      ? [
          'id', 'content_key', 'name', 'rules_edition', 'category', 'min_level',
          'ability_points', 'ability_increase_abilities',
          'ability_increase_maximum', 'repeatable', 'prerequisites',
          'grant_rules', 'notes', 'created_at', 'updated_at',
        ]
      : [
          'id', 'class_definition_id', 'contribution_key', 'label',
          'target_kind', 'target_key', 'op', 'active_from_level',
          'active_to_level', 'value_json', 'supersedes_ref', 'created_at',
          'updated_at',
        ];
    const currentRow = Object.fromEntries(
      currentColumns.map((column) => [column, row[column]]),
    );
    const error = rowContractError(table, currentRow, label);
    if (error !== null) fail(error);
  }
  return row;
}

function json(value: string | null, label: string): JsonValue | null {
  if (value === null || value === '') return null;
  try {
    return JSON.parse(value) as JsonValue;
  } catch (error) {
    return fail(`${label} is invalid JSON.`, { cause: error });
  }
}

function jsonArray(value: string | null, label: string): readonly JsonValue[] {
  const parsed = json(value, label) ?? [];
  if (!Array.isArray(parsed)) return fail(`${label} must be a JSON list.`);
  return parsed;
}

function jsonObjects(value: string | null, label: string): readonly JsonObject[] {
  return jsonArray(value, label).map((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return fail(`${label}[${String(index)}] must be an object.`);
    }
    return item;
  });
}

function validatedSlots(value: JsonValue | null, label: string): JsonValue {
  if (Array.isArray(value)) {
    if (value.length === 0) return value;
    return fail(`${label} must be an empty list or a slot-count object.`);
  }
  if (value === null || typeof value !== 'object') {
    return fail(`${label} must be an empty list or a slot-count object.`);
  }
  for (const [level, count] of Object.entries(value)) {
    if (
      !/^[1-9]$/u.test(level) || !Number.isSafeInteger(count) ||
      Number(count) < 1 || Number(count) > AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude
    ) {
      return fail(`${label} has an invalid spell level or count.`);
    }
  }
  return value;
}

function validatedPactSlots(value: JsonValue | null, label: string): JsonValue {
  if (
    value === null || Array.isArray(value) || typeof value !== 'object' ||
    Object.keys(value).sort().join(',') !== 'count,level' ||
    !Number.isSafeInteger(value.count) || Number(value.count) < 1 ||
    Number(value.count) > AUTHORING_NUMERIC_LIMITS.maximumEffectMagnitude ||
    !Number.isSafeInteger(value.level) || Number(value.level) < 1 || Number(value.level) > 5
  ) {
    return fail(`${label} must contain positive count and level 1 through 5.`);
  }
  return value;
}

function allOwned(
  db: DatabaseContext,
  table: SourceAggregateTable,
  ownerColumn: string,
  ownerId: number,
  orderBy: string,
): readonly SqlRow[] {
  return db.allRaw(
    `SELECT * FROM ${table} WHERE ${ownerColumn} = ? ORDER BY ${orderBy}`,
    [ownerId],
  ).map((row, index) => validatedRow(table, row, `${table}[${String(index)}]`));
}

/**
 * Default-includes every stored child column. The only exclusions are storage
 * identity/ownership/timestamps, or columns explicitly replaced by a portable
 * canonical value in `overrides`. This makes a future semantic column
 * over-split identity instead of silently collapsing it.
 */
function storedSemanticRow(
  row: SqlRow,
  ownerColumns: readonly string[],
  excluded: readonly string[] = [],
  booleans: ReadonlySet<string> = new Set(),
  prose: ReadonlySet<string> = new Set(),
  overrides: CanonicalClassRowV1 = {},
): CanonicalClassRowV1 {
  const omitted = new Set([
    'id', 'created_at', 'updated_at', ...ownerColumns, ...excluded,
  ]);
  const projected = Object.fromEntries(Object.keys(row)
    .filter((field) => !omitted.has(field) && !(field in overrides))
    .map((field) => {
    const value = row[field];
    if (booleans.has(field)) return [field, sqlBoolean(row, field)];
    if (prose.has(field)) {
      const text = sqlNullableString(row, field);
      return [field, text === null ? null : canonicalRuleText(text)];
    }
    if (typeof value === 'bigint' || value instanceof Uint8Array) {
      return fail(`${field} has an unsupported stored value.`);
    }
    return [field, value];
  })) as CanonicalClassRowV1;
  return { ...projected, ...overrides };
}

function storedRootFields(
  row: SqlRow,
  represented: readonly string[],
): CanonicalClassRowV1 | undefined {
  // The root content_key is the registry locator being recomputed, never a
  // runtime mechanic. Every represented field is emitted through a typed
  // canonical arm by the caller; only genuinely new columns remain here.
  const projected = storedSemanticRow(row, [], ['content_key', ...represented]);
  return Object.keys(projected).length === 0 ? undefined : projected;
}

/**
 * Effect objects are default-included. Only storage ownership/ordering fields
 * are excluded: parent ids locate the object, timestamps are metadata, and a
 * named effect's sort_order is already represented by its enclosing sequence.
 * A future effect column therefore over-splits identity until reviewed instead
 * of disappearing from the fingerprint.
 */
function genericEffectRow(
  row: SqlRow,
  parentColumn: 'class_definition_id' | 'named_feature_id',
): CanonicalClassRowV1 {
  validateStoredFeatureEffect(row);
  const excluded = new Set([
    'id', parentColumn, 'created_at', 'updated_at',
    ...(parentColumn === 'named_feature_id' ? ['sort_order'] : []),
  ]);
  return Object.fromEntries(
    Object.entries(row)
      .filter(([field]) => !excluded.has(field))
      .map(([field, value]) => [
        field,
        field === 'allows_shield' && value !== null
          ? sqlBoolean(row, field)
          : value,
      ]),
  ) as CanonicalClassRowV1;
}

const featureEffectPayloadFields = [
  'damage_type', 'hit_points_flat', 'hit_points_per_level',
  'speed_bonus_feet', 'ability', 'amount', 'maximum', 'base',
  'ability_1', 'ability_2', 'allows_shield', 'weapon_scope', 'attack_count',
] as const;

/**
 * Mirrors the form registry consumed by add-time validation. SQLite normally
 * enforces the same shape, but projection must also refuse a hand-edited image
 * with ignored CHECK constraints instead of hashing mechanics runtime cannot
 * materialize. Payload columns outside the selected kind are therefore
 * required to be null rather than silently default-included as inert data.
 */
function validateStoredFeatureEffect(row: SqlRow): void {
  const kind = sqlString(row, 'effect_kind');
  if (!isEnumValue(featureTemplateEffectKinds, kind)) {
    return fail(`feature effect kind '${kind}' is unsupported.`);
  }
  const form = kind === 'extra_attack'
    ? FEATURE_ONLY_EFFECT_FORM.extra_attack
    : CHARACTER_EFFECT_FORM[kind];
  const used = new Set<string>(form.fields.map((field) => field.key));
  for (const field of featureEffectPayloadFields) {
    if (!used.has(field) && row[field] !== null) {
      return fail(`feature effect '${kind}' has an inert ${field} payload.`);
    }
  }
  for (const field of form.fields) {
    const value = row[field.key];
    if (value === null) {
      if (field.required) return fail(`feature effect '${kind}' requires ${field.key}.`);
      continue;
    }
    switch (field.control) {
      case 'integer': {
        const number = sqlInteger(row, field.key);
        if (number < field.minimum || number > field.maximum || (field.non_zero && number === 0)) {
          return fail(`feature effect '${kind}' has invalid ${field.key}.`);
        }
        break;
      }
      case 'ability':
        if (!isEnumValue(abilities, value)) return fail(`feature effect '${kind}' has invalid ${field.key}.`);
        break;
      case 'weapon_scope':
        if (!isEnumValue(extraAttackWeaponScopes, value)) return fail(`feature effect '${kind}' has invalid ${field.key}.`);
        break;
      case 'boolean':
        sqlBoolean(row, field.key);
        break;
      case 'damage_type':
        if (!isEnumValue(damageTypes, value)) return fail(`feature effect '${kind}' has invalid ${field.key}.`);
        break;
    }
  }
  if (
    form.at_least_one_of.length > 0 &&
    form.at_least_one_of.every((field) => row[field] === null)
  ) {
    return fail(`feature effect '${kind}' is missing its payload.`);
  }
}

function equipmentReference(
  db: DatabaseContext,
  id: number,
  table: 'weapon_templates' | 'armor_templates',
  resolver: StoredAuthoredReferenceResolverV1,
): ContentFingerprintReference<'weapon' | 'armor'> {
  const contentKey = db.scalar<string>(`SELECT content_key FROM ${table} WHERE id = ?`, [id]);
  if (contentKey === null) return fail(`${table} id ${String(id)} does not resolve.`);
  return table === 'weapon_templates'
    ? resolver.weapon(contentKey as ContentKey)
    : resolver.armor(contentKey as ContentKey);
}

function classAggregate(
  db: DatabaseContext,
  root: SqlRow,
  resolver: StoredAuthoredReferenceResolverV1,
): ClassContentAggregateV1 {
  const id = sqlInteger(root, 'id');
  const progressionType = sqlString(root, 'progression_type');
  const progressions = allOwned(db, 'class_progressions', 'class_definition_id', id, 'class_level')
    .map((row): CanonicalClassRowV1 => {
      const slots = json(sqlNullableString(row, 'slots'), 'class progression slots');
      const pactSlots = json(sqlNullableString(row, 'pact_slots'), 'class progression pact_slots');
      if (progressionType !== 'none' && progressionType !== 'pact') {
        validatedSlots(slots, 'class progression slots');
      }
      if (progressionType === 'pact') {
        validatedPactSlots(pactSlots, 'class progression pact_slots');
      }
      return storedSemanticRow(row, ['class_definition_id'], [
        // Replaced below by parsed JSON/portable grant references.
        'slots', 'pact_slots', 'grant_rules',
      ], new Set(), new Set(), {
        slots,
        pact_slots: pactSlots,
        grant_rules: projectStoredGrantRulesV1(
          db,
          sqlNullableString(row, 'grant_rules'),
          resolver,
          'class progression grant_rules',
        ).grants,
      });
    });
  const sheetRows = allOwned(db, 'class_sheet_traits', 'class_definition_id', id, 'id');
  if (sheetRows.length > 1) return fail('class has more than one sheet-traits row.');

  const equipment = allOwned(db, 'class_equipment_items', 'class_definition_id', id, 'option, sort_order')
    .map((row): CanonicalClassRowV1 => {
      const kind = sqlString(row, 'item_kind');
      const weaponId = sqlNullableInteger(row, 'weapon_template_id');
      const armorId = sqlNullableInteger(row, 'armor_template_id');
      return storedSemanticRow(row, ['class_definition_id'], [
        // Store-local foreign keys are replaced by one portable fingerprint.
        'weapon_template_id', 'armor_template_id', 'item_name',
      ], new Set(), new Set(), {
        item_name: canonicalOpenPassthroughValue(sqlString(row, 'item_name')),
        reference: kind === 'weapon' && weaponId !== null
          ? equipmentReference(db, weaponId, 'weapon_templates', resolver)
          : kind === 'armor' && armorId !== null
            ? equipmentReference(db, armorId, 'armor_templates', resolver)
            : null,
      });
    });

  const formulas = allOwned(db, 'class_resource_formulas', 'class_definition_id', id, 'resource_kind')
    .map((row): CanonicalClassRowV1 => storedSemanticRow(
      row,
      ['class_definition_id'],
      [
        // These columns are losslessly represented by the decoded formula.
        'formula_kind', 'minimum_class_level', 'fixed_count', 'ability',
        'multiplier', 'later_fixed_count_steps',
      ],
      new Set(),
      new Set(),
      { formula: decodeClassResourceFormula({
        formula_kind: row.formula_kind,
        minimum_class_level: row.minimum_class_level,
        fixed_count: row.fixed_count,
        ability: row.ability,
        multiplier: row.multiplier,
        later_fixed_count_steps: row.later_fixed_count_steps,
      }) as unknown as JsonValue },
    ));

  const valueContributions = allOwned(
    db,
    'class_feature_value_contributions',
    'class_definition_id',
    id,
    'contribution_key',
  ).map((row): CanonicalClassRowV1 => storedSemanticRow(
    row,
    ['class_definition_id'],
    ['value_json', 'supersedes_ref'],
    new Set(),
    new Set(),
    {
      kind: 'feature_value_contribution',
      value: decodeStoredValueExpression(
        row.value_json,
        'class feature-value contribution value_json',
      ) as JsonValue,
      supersedes_ref: decodeStoredSupersedesReference(
        row.supersedes_ref,
        'class feature-value contribution supersedes_ref',
      ) as JsonValue | null,
    },
  ));

  const namedFeatures = allOwned(db, 'named_features', 'class_definition_id', id, 'class_level, name')
    .map((row): CanonicalClassRowV1 => {
      const namedId = sqlInteger(row, 'id');
      const effects = allOwned(db, 'named_feature_effects', 'named_feature_id', namedId, 'sort_order')
        .map((effect) => genericEffectRow(effect, 'named_feature_id'));
      return storedSemanticRow(row, ['class_definition_id'], [
        // sheet-content-lookup returns content_key, but namedFeatureGrants
        // never reads it: runtime behavior uses name, prerequisite, level and
        // effect only. It is a store locator, not portable class mechanics.
        'content_key', 'prerequisite', 'description',
      ], new Set(), new Set(), {
        prerequisite: canonicalRuleText(sqlString(row, 'prerequisite')),
        description: canonicalRuleText(sqlString(row, 'description')),
        effects,
      });
    });
  const rootFields = storedRootFields(root, [
    'name', 'rules_edition', 'spellcasting_ability', 'progression_type',
    'caster_fraction', 'caster_rounding', 'prepares_or_knows',
    'supports_ritual_casting', 'ritual_casting_mode',
    'primary_ability_expression', 'notes',
  ]);

  return {
    kind: 'class',
    name: sqlString(root, 'name'),
    rules_edition: sqlString(root, 'rules_edition') as RulesEdition,
    spellcasting_ability: sqlNullableString(root, 'spellcasting_ability'),
    progression_type: progressionType,
    caster_fraction: sqlNullableString(root, 'caster_fraction'),
    caster_rounding: sqlNullableString(root, 'caster_rounding'),
    prepares_or_knows: sqlNullableString(root, 'prepares_or_knows'),
    supports_ritual_casting: sqlBoolean(root, 'supports_ritual_casting'),
    ritual_casting_mode: sqlNullableString(root, 'ritual_casting_mode'),
    primary_ability_expression: sqlNullableString(root, 'primary_ability_expression'),
    notes: sqlNullableString(root, 'notes'),
    progressions,
    sheet_traits: sheetRows[0] === undefined ? null : storedSemanticRow(
      sheetRows[0], ['class_definition_id'], [], new Set(['skill_choice_from_any']),
    ),
    saving_throw_proficiencies: allOwned(db, 'class_saving_throw_proficiencies', 'class_definition_id', id, 'ability')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    skill_options: allOwned(db, 'class_skill_options', 'class_definition_id', id, 'skill')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    armor_training: allOwned(db, 'class_armor_training', 'class_definition_id', id, 'category')
      .map((row) => storedSemanticRow(row, ['class_definition_id'], [], new Set(['granted_on_multiclass_entry']))),
    weapon_proficiencies: allOwned(db, 'class_weapon_proficiencies', 'class_definition_id', id, 'category')
      .map((row) => storedSemanticRow(row, ['class_definition_id'], [], new Set(['granted_on_multiclass_entry']), new Set(['property_qualifier']))),
    extra_attack_grants: allOwned(db, 'class_extra_attack_grants', 'class_definition_id', id, 'class_level')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    martial_arts_dice: allOwned(db, 'class_martial_arts_dice', 'class_definition_id', id, 'class_level')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    weapon_mastery_grants: allOwned(db, 'class_weapon_mastery_grants', 'class_definition_id', id, 'id')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    weapon_mastery_counts: allOwned(db, 'class_weapon_mastery_counts', 'class_definition_id', id, 'class_level')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    equipment_items: equipment,
    resources: allOwned(db, 'class_resources', 'class_definition_id', id, 'class_level, resource_kind')
      .map((row) => storedSemanticRow(row, ['class_definition_id'])),
    resource_formulas: formulas,
    feature_effects: allOwned(db, 'class_feature_effects', 'class_definition_id', id, 'class_level, name')
      .map((row) => genericEffectRow(row, 'class_definition_id')),
    feature_value_contributions: valueContributions,
    named_features: namedFeatures,
    ...(rootFields === undefined ? {} : { stored_fields: rootFields }),
  };
}

export function readStoredClassContentV1(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
): ClassContentAggregateV1 {
  const raw = db.oneRaw('SELECT * FROM class_definitions WHERE content_key = ?', [contentKey]);
  if (raw === null) return fail(`class '${contentKey}' does not exist.`);
  return classAggregate(db, validatedRow('class_definitions', raw, `class '${contentKey}'`), references);
}

export function readStoredFeatContentV1(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
): FeatContentAggregateV1 {
  const raw = db.oneRaw('SELECT * FROM feat_definitions WHERE content_key = ?', [contentKey]);
  if (raw === null) return fail(`feat '${contentKey}' does not exist.`);
  const row = validatedRow('feat_definitions', raw, `feat '${contentKey}'`);
  const abilities = json(sqlNullableString(row, 'ability_increase_abilities'), 'feat ability_increase_abilities');
  if (
    abilities !== null && abilities !== 'any' &&
    (!Array.isArray(abilities) || abilities.some((value) => typeof value !== 'string'))
  ) {
    return fail('feat ability_increase_abilities must be "any", a string list, or null.');
  }
  const grantProjection = projectStoredGrantRulesV1(
    db,
    sqlNullableString(row, 'grant_rules'),
    references,
    'feat grant_rules',
  );
  const rootFields = storedRootFields(row, [
    'name', 'rules_edition', 'category', 'min_level', 'ability_points',
    'ability_increase_abilities', 'ability_increase_maximum', 'repeatable',
    'prerequisites', 'grant_rules', 'notes',
  ]);
  return {
    kind: 'feat',
    name: sqlString(row, 'name'),
    rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
    category: sqlNullableString(row, 'category'),
    min_level: sqlNullableInteger(row, 'min_level'),
    ability_points: sqlInteger(row, 'ability_points'),
    ability_increase_abilities: abilities as 'any' | readonly string[] | null,
    ability_increase_maximum: sqlNullableInteger(row, 'ability_increase_maximum'),
    repeatable: sqlBoolean(row, 'repeatable'),
    prerequisites: jsonObjects(sqlNullableString(row, 'prerequisites'), 'feat prerequisites'),
    grants: grantProjection.grants,
    notes: sqlNullableString(row, 'notes'),
    ...(rootFields === undefined ? {} : { stored_fields: rootFields }),
  };
}

export function projectStoredClassContentV1(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
) {
  const aggregate = readStoredClassContentV1(db, contentKey, references);
  return Object.freeze({
    kind: aggregate.kind,
    aggregate,
    payload: projectClassContentV1(aggregate),
    references: classReferences(aggregate),
  });
}

export function projectStoredFeatContentV1(
  db: DatabaseContext,
  contentKey: ContentKey,
  references: StoredAuthoredReferenceResolverV1,
) {
  const aggregate = readStoredFeatContentV1(db, contentKey, references);
  return Object.freeze({
    kind: aggregate.kind,
    aggregate,
    payload: projectFeatContentV1(aggregate),
    references: grantReferences('feat.grant', aggregate.grants),
  });
}
