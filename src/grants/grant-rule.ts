import {
  freeCastPoolScopes,
  freeCastRecoveries,
  grantRuleKinds,
  grantRuleRequiresBucket,
  isEnumValue,
  slotBuckets,
  type GrantRuleKind,
  type SlotBucket,
} from '../domain/enums';
import { FreeCast } from './free-cast';

export interface ActiveIfConfig {
  readonly key: string;
  readonly equals: string;
}

export type GrantRuleObject = Readonly<Record<string, unknown>>;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function cloneObject(
  input: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, cloneValue(value)]),
  );
}

function hasOwn(input: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function shownValue(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'null';
  }
  return String(value);
}

function nonEmptyString(
  input: Record<string, unknown>,
  field: string,
): string {
  const value = input[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(
      `Grant rule field '${field}' must be a non-empty string.`,
    );
  }
  return value.trim();
}

function optionalNonEmptyString(
  input: Record<string, unknown>,
  field: string,
  ruleKey: string,
): string | null {
  const value = input[field];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(
      `Grant rule '${ruleKey}' field '${field}' must be a non-empty string.`,
    );
  }
  return value.trim();
}

function positiveInteger(
  input: Record<string, unknown>,
  field: string,
  defaultValue: number | null,
  ruleKey: string,
  required = true,
): number | null {
  const value = input[field] === undefined ? defaultValue : input[field];
  if (value === null && !required) {
    return null;
  }
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new TypeError(
      `Grant rule '${ruleKey}' field '${field}' must be a positive integer.`,
    );
  }
  return value as number;
}

function booleanValue(
  input: Record<string, unknown>,
  field: string,
  defaultValue: boolean,
  ruleKey: string,
): boolean {
  const value = input[field] === undefined ? defaultValue : input[field];
  if (typeof value !== 'boolean') {
    throw new TypeError(
      `Grant rule '${ruleKey}' field '${field}' must be boolean.`,
    );
  }
  return value;
}

function level(
  input: Record<string, unknown>,
  field: string,
  defaultValue: number,
  ruleKey: string,
): number {
  const value = input[field] === undefined ? defaultValue : input[field];
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 0 ||
    (value as number) > 9
  ) {
    throw new RangeError(
      `Grant rule '${ruleKey}' field '${field}' must be between 0 and 9.`,
    );
  }
  return value as number;
}

function stringList(
  input: Record<string, unknown>,
  field: string,
  ruleKey: string,
  required = false,
): void {
  const value = input[field];
  if ((value === undefined || value === null) && !required) {
    return;
  }
  if (!Array.isArray(value) || (required && value.length === 0)) {
    throw new TypeError(
      `Grant rule '${ruleKey}' field '${field}' must be a non-empty string list.`,
    );
  }
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new TypeError(
        `Grant rule '${ruleKey}' field '${field}' must contain only strings.`,
      );
    }
  }
}

function parseFreeCast(
  input: Record<string, unknown>,
  ruleKey: string,
): FreeCast | null {
  const value = input.free_cast;
  if (value === undefined || value === null) {
    return null;
  }
  if (!isObject(value)) {
    throw new TypeError(
      `Grant rule '${ruleKey}' field 'free_cast' must be an object or null.`,
    );
  }

  const uses = value.uses;
  if (!Number.isSafeInteger(uses) || (uses as number) < 1) {
    throw new TypeError(
      `Grant rule '${ruleKey}' free_cast.uses must be a positive integer.`,
    );
  }

  const recovery = value.recovery;
  if (!isEnumValue(freeCastRecoveries, recovery)) {
    throw new TypeError(
      `Grant rule '${ruleKey}' has invalid free_cast.recovery '${shownValue(recovery)}'.`,
    );
  }

  const poolScope = value.pool_scope;
  if (!isEnumValue(freeCastPoolScopes, poolScope)) {
    throw new TypeError(
      `Grant rule '${ruleKey}' has invalid free_cast.pool_scope '${shownValue(poolScope)}'.`,
    );
  }

  return new FreeCast(uses as number, recovery, poolScope);
}

function parseActiveIfConfig(
  input: Record<string, unknown>,
  ruleKey: string,
): ActiveIfConfig | null {
  const value = input.active_if_config;
  if (value === undefined || value === null) {
    return null;
  }
  const keys = isObject(value) ? Object.keys(value).sort() : [];
  if (
    !isObject(value) ||
    keys.length !== 2 ||
    keys[0] !== 'equals' ||
    keys[1] !== 'key'
  ) {
    throw new TypeError(
      `Grant rule '${ruleKey}' field 'active_if_config' must contain exactly key and equals.`,
    );
  }

  const key = value.key;
  const equals = value.equals;
  if (
    typeof key !== 'string' ||
    key.trim() === '' ||
    typeof equals !== 'string' ||
    equals.trim() === ''
  ) {
    throw new TypeError(
      `Grant rule '${ruleKey}' active_if_config key and equals must be non-empty strings.`,
    );
  }

  return Object.freeze({ key: key.trim(), equals: equals.trim() });
}

function validateKindFields(
  kind: GrantRuleKind,
  ruleKey: string,
  input: Record<string, unknown>,
): void {
  if (kind === 'fixed_spell') {
    const id = input.spell_version_id;
    const key = input.spell_version_key;
    if (
      (!Number.isSafeInteger(id) || (id as number) < 1) &&
      (typeof key !== 'string' || key.trim() === '')
    ) {
      throw new TypeError(
        `Fixed-spell rule '${ruleKey}' requires spell_version_id or spell_version_key.`,
      );
    }
  }

  if (kind === 'choice_from_list' || kind === 'spellbook_acquisition') {
    nonEmptyString(input, 'list');
  }

  if (input.selection_collection !== undefined && input.selection_collection !== null) {
    throw new TypeError(
      `Grant rule '${ruleKey}' may not constrain a selection collection.`,
    );
  }

  if (kind === 'choice_from_query') {
    const hasPredicate =
      (input.schools !== undefined && input.schools !== null) ||
      (input.tags !== undefined && input.tags !== null) ||
      hasOwn(input, 'level_min') ||
      hasOwn(input, 'level_max');
    if (!hasPredicate) {
      throw new TypeError(
        `Query rule '${ruleKey}' requires at least one predicate.`,
      );
    }
    stringList(input, 'schools', ruleKey);
    stringList(input, 'tags', ruleKey);
  }

  if (kind === 'grant_source') {
    nonEmptyString(input, 'source_type');
    const definitionId = input.source_definition_id;
    const definitionKey = input.source_definition_key;
    const definitionKeyConfig = input.definition_key_config;
    const hasDefinition =
      (Number.isSafeInteger(definitionId) && (definitionId as number) > 0) ||
      (typeof definitionKey === 'string' && definitionKey.trim() !== '') ||
      (typeof definitionKeyConfig === 'string' &&
        definitionKeyConfig.trim() !== '');
    if (!hasDefinition) {
      throw new TypeError(
        `Grant-source rule '${ruleKey}' requires a source definition reference.`,
      );
    }
  }

  if (kind === 'capability') {
    nonEmptyString(input, 'capability_key');
    nonEmptyString(input, 'collection');
    nonEmptyString(input, 'access_mode');
    stringList(input, 'tags', ruleKey, true);
  }

  if (kind === 'spellbook_acquisition') {
    nonEmptyString(input, 'acquisitions_config');
  }
}

export class GrantRule {
  static readonly FIXED_SPELL: GrantRuleKind = 'fixed_spell';
  static readonly CHOICE_FROM_LIST: GrantRuleKind = 'choice_from_list';
  static readonly CHOICE_FROM_QUERY: GrantRuleKind = 'choice_from_query';
  static readonly GRANT_SOURCE: GrantRuleKind = 'grant_source';
  static readonly CAPABILITY: GrantRuleKind = 'capability';
  static readonly SPELLBOOK_ACQUISITION: GrantRuleKind =
    'spellbook_acquisition';

  private constructor(
    readonly kind: GrantRuleKind,
    readonly ruleKey: string,
    readonly count: number | null,
    readonly bucket: SlotBucket | null,
    readonly alwaysPrepared: boolean,
    readonly withSlots: boolean,
    readonly freeCast: FreeCast | null,
    readonly activeFromClassLevel: number | null,
    readonly activeIfConfig: ActiveIfConfig | null,
    readonly distinctConfigBy: string | null,
    private readonly data: GrantRuleObject,
  ) {}

  static fromObject(input: unknown): GrantRule {
    if (!isObject(input)) {
      throw new TypeError('Grant rule input must be an object.');
    }

    const rawKind = input.kind;
    if (!isEnumValue(grantRuleKinds, rawKind)) {
      throw new TypeError(
        `Unknown grant rule kind '${shownValue(rawKind)}'.`,
      );
    }
    const kind = rawKind;
    const ruleKey = nonEmptyString(input, 'rule_key');

    if (kind === 'capability' && hasOwn(input, 'count')) {
      throw new TypeError(
        `Capability rule '${ruleKey}' must not define count; capabilities do not mint slots.`,
      );
    }

    let count: number | null;
    switch (kind) {
      case 'fixed_spell':
      case 'grant_source':
        count = positiveInteger(input, 'count', 1, ruleKey);
        break;
      case 'choice_from_list':
      case 'choice_from_query':
        count = positiveInteger(input, 'count', null, ruleKey);
        break;
      default:
        count = null;
    }

    if (kind === 'fixed_spell' && count !== 1) {
      throw new RangeError(
        `Fixed-spell rule '${ruleKey}' must have count 1.`,
      );
    }

    const rawBucket = input.bucket;
    let bucket: SlotBucket | null = null;
    if (grantRuleRequiresBucket(kind)) {
      const candidate = nonEmptyString(input, 'bucket');
      if (!isEnumValue(slotBuckets, candidate)) {
        throw new TypeError(
          `Grant rule '${ruleKey}' has invalid bucket '${candidate}'.`,
        );
      }
      bucket = candidate;
    } else if (rawBucket !== undefined && rawBucket !== null) {
      throw new TypeError(
        `Grant rule '${ruleKey}' must not define a bucket.`,
      );
    }

    const alwaysPrepared = booleanValue(
      input,
      'always_prepared',
      false,
      ruleKey,
    );
    const withSlots = booleanValue(input, 'with_slots', true, ruleKey);
    const freeCast = parseFreeCast(input, ruleKey);
    const activeFromClassLevel = positiveInteger(
      input,
      'active_from_class_level',
      null,
      ruleKey,
      false,
    );
    const activeIfConfig = parseActiveIfConfig(input, ruleKey);
    const distinctConfigBy = optionalNonEmptyString(
      input,
      'distinct_config_by',
      ruleKey,
    );

    const levelMin = level(input, 'level_min', 0, ruleKey);
    const levelMax = level(input, 'level_max', 9, ruleKey);
    if (levelMin > levelMax) {
      throw new RangeError(
        `Grant rule '${ruleKey}' has level_min greater than level_max.`,
      );
    }

    validateKindFields(kind, ruleKey, input);

    const normalized = cloneObject(input);
    normalized.kind = kind;
    normalized.rule_key = ruleKey;
    if (count === null) {
      delete normalized.count;
    } else {
      normalized.count = count;
    }
    if (bucket !== null) {
      normalized.bucket = bucket;
    }
    normalized.always_prepared = alwaysPrepared;
    normalized.with_slots = withSlots;
    normalized.free_cast = freeCast?.toObject() ?? null;
    if (activeFromClassLevel !== null) {
      normalized.active_from_class_level = activeFromClassLevel;
    }
    if (activeIfConfig !== null) {
      normalized.active_if_config = activeIfConfig;
    }
    if (distinctConfigBy !== null) {
      normalized.distinct_config_by = distinctConfigBy;
    }
    if (kind === 'choice_from_list' || kind === 'choice_from_query') {
      normalized.level_min = levelMin;
      normalized.level_max = levelMax;
    }

    return new GrantRule(
      kind,
      ruleKey,
      count,
      bucket,
      alwaysPrepared,
      withSlots,
      freeCast,
      activeFromClassLevel,
      activeIfConfig,
      distinctConfigBy,
      cloneObject(normalized),
    );
  }

  static fromArray(input: unknown): GrantRule {
    return GrantRule.fromObject(input);
  }

  static fromJson(json: string): GrantRule {
    let decoded: unknown;
    try {
      decoded = JSON.parse(json);
    } catch (error) {
      throw new TypeError(
        `Grant rule JSON is invalid: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
    if (!isObject(decoded)) {
      throw new TypeError('Grant rule JSON must decode to an object.');
    }
    return GrantRule.fromObject(decoded);
  }

  toObject(): GrantRuleObject {
    return cloneObject(this.data);
  }

  toArray(): GrantRuleObject {
    return this.toObject();
  }

  toJson(): string {
    return JSON.stringify(this.data);
  }

  toJSON(): GrantRuleObject {
    return this.toObject();
  }
}
