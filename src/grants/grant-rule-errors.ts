export type GrantRuleFieldExpectation =
  | 'non_empty_string'
  | 'positive_integer'
  | 'boolean'
  | 'non_empty_string_list'
  | 'strings_only'
  | 'object_or_null'
  | 'non_negative_integer';

const FIELD_EXPECTATION_PHRASES: Readonly<
  Record<GrantRuleFieldExpectation, string>
> = {
  non_empty_string: 'must be a non-empty string',
  positive_integer: 'must be a positive integer',
  boolean: 'must be boolean',
  non_empty_string_list: 'must be a non-empty string list',
  strings_only: 'must contain only strings',
  object_or_null: 'must be an object or null',
  non_negative_integer: 'must be a non-negative integer',
};

function shownValue(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null || value === undefined) return 'null';
  return String(value);
}

export class GrantRuleFieldError extends TypeError {
  override readonly name = 'GrantRuleFieldError' as const;
  constructor(
    readonly rule_key: string | null,
    readonly field: string,
    readonly expected: GrantRuleFieldExpectation,
  ) {
    super(
      rule_key === null
        ? `Grant rule field '${field}' ${FIELD_EXPECTATION_PHRASES[expected]}.`
        : `Grant rule '${rule_key}' field '${field}' ${FIELD_EXPECTATION_PHRASES[expected]}.`,
    );
  }
}

export class GrantRuleFreeCastUsesError extends TypeError {
  override readonly name = 'GrantRuleFreeCastUsesError' as const;
  constructor(readonly rule_key: string) {
    super(`Grant rule '${rule_key}' free_cast.uses must be a positive integer.`);
  }
}

export class GrantRuleFreeCastEnumError extends TypeError {
  override readonly name = 'GrantRuleFreeCastEnumError' as const;
  constructor(
    readonly rule_key: string,
    readonly field: 'recovery' | 'pool_scope',
    readonly value: unknown,
  ) {
    super(
      `Grant rule '${rule_key}' has invalid free_cast.${field} '${shownValue(value)}'.`,
    );
  }
}

export class GrantRuleActiveConfigKeysError extends TypeError {
  override readonly name = 'GrantRuleActiveConfigKeysError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant rule '${rule_key}' field 'active_if_config' must contain exactly key and equals.`,
    );
  }
}

export class GrantRuleActiveConfigValuesError extends TypeError {
  override readonly name = 'GrantRuleActiveConfigValuesError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant rule '${rule_key}' active_if_config key and equals must be non-empty strings.`,
    );
  }
}

export class GrantRuleFixedSpellReferenceRequiredError extends TypeError {
  override readonly name =
    'GrantRuleFixedSpellReferenceRequiredError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Fixed-spell rule '${rule_key}' requires spell_version_id or spell_version_key.`,
    );
  }
}

export class GrantSourceRuleReferenceRequiredError extends TypeError {
  override readonly name = 'GrantSourceRuleReferenceRequiredError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant-source rule '${rule_key}' requires a source definition reference.`,
    );
  }
}

export class GrantSourceRuleDefinitionKeyConfigError extends TypeError {
  override readonly name = 'GrantSourceRuleDefinitionKeyConfigError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant-source rule '${rule_key}' field 'definition_key_config' must be a string or null.`,
    );
  }
}

export class GrantRuleSelectionCollectionError extends TypeError {
  override readonly name = 'GrantRuleSelectionCollectionError' as const;
  constructor(readonly rule_key: string) {
    super(`Grant rule '${rule_key}' may not constrain a selection collection.`);
  }
}

export class GrantRuleQueryPredicateError extends TypeError {
  override readonly name = 'GrantRuleQueryPredicateError' as const;
  constructor(readonly rule_key: string) {
    super(`Query rule '${rule_key}' requires at least one predicate.`);
  }
}

export class GrantRulePendingChoiceError extends TypeError {
  override readonly name = 'GrantRulePendingChoiceError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant rule '${rule_key}' may not allow a pending choice without ` +
        'delegating its definition through definition_key_config.',
    );
  }
}

export class GrantRuleInputTypeError extends TypeError {
  override readonly name = 'GrantRuleInputTypeError' as const;
  constructor() {
    super('Grant rule input must be an object.');
  }
}

export class GrantRuleKindError extends TypeError {
  override readonly name = 'GrantRuleKindError' as const;
  constructor(readonly value: unknown) {
    super(`Unknown grant rule kind '${shownValue(value)}'.`);
  }
}

export class GrantRuleCapabilityCountError extends TypeError {
  override readonly name = 'GrantRuleCapabilityCountError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Capability rule '${rule_key}' must not define count; capabilities do not mint slots.`,
    );
  }
}

export class GrantRuleInvalidBucketError extends TypeError {
  override readonly name = 'GrantRuleInvalidBucketError' as const;
  constructor(
    readonly rule_key: string,
    readonly bucket: string,
  ) {
    super(`Grant rule '${rule_key}' has invalid bucket '${bucket}'.`);
  }
}

export class GrantRuleForbiddenBucketError extends TypeError {
  override readonly name = 'GrantRuleForbiddenBucketError' as const;
  constructor(readonly rule_key: string) {
    super(`Grant rule '${rule_key}' must not define a bucket.`);
  }
}

export class GrantRuleActivationConflictError extends TypeError {
  override readonly name = 'GrantRuleActivationConflictError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant rule '${rule_key}' must not define both active_from_class_level and active_from_character_level.`,
    );
  }
}

export class GrantRuleJsonParseError extends TypeError {
  override readonly name = 'GrantRuleJsonParseError' as const;
  constructor(
    readonly reason: string,
    readonly cause: unknown,
  ) {
    super(`Grant rule JSON is invalid: ${reason}`, { cause });
  }
}

export class GrantRuleJsonShapeError extends TypeError {
  override readonly name = 'GrantRuleJsonShapeError' as const;
  constructor() {
    super('Grant rule JSON must decode to an object.');
  }
}
