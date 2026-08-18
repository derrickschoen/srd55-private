export type SourceCatalogFieldShape = 'object' | 'non_empty_text' | 'boolean';

const SOURCE_CATALOG_FIELD_SHAPE_PHRASES: Readonly<
  Record<SourceCatalogFieldShape, string>
> = {
  object: 'must be an object',
  non_empty_text: 'must be non-empty text',
  boolean: 'must be boolean',
};

export class SourceCatalogFieldTypeError extends TypeError {
  override readonly name = 'SourceCatalogFieldTypeError' as const;
  constructor(
    readonly field: string,
    readonly expected: SourceCatalogFieldShape,
  ) {
    super(`Catalog field '${field}' ${SOURCE_CATALOG_FIELD_SHAPE_PHRASES[expected]}.`);
  }
}

export class SourceCatalogUnknownFieldError extends TypeError {
  override readonly name = 'SourceCatalogUnknownFieldError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is unknown.`);
  }
}

export class SourceCatalogFieldWhitespaceError extends TypeError {
  override readonly name = 'SourceCatalogFieldWhitespaceError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' contains surrounding whitespace.`);
  }
}

export class SourceCatalogFieldLengthError extends TypeError {
  override readonly name = 'SourceCatalogFieldLengthError' as const;
  constructor(
    readonly field: string,
    readonly maximum_length: number,
  ) {
    super(`Catalog field '${field}' must contain at most ${String(maximum_length)} characters.`);
  }
}

export class SourceCatalogFieldListLimitError extends TypeError {
  override readonly name = 'SourceCatalogFieldListLimitError' as const;
  constructor(
    readonly field: string,
    readonly maximum_entries: number,
  ) {
    super(`Catalog field '${field}' must be a list of at most ${String(maximum_entries)} entries.`);
  }
}

export class SourceCatalogFieldIntegerRangeError extends TypeError {
  override readonly name = 'SourceCatalogFieldIntegerRangeError' as const;
  constructor(
    readonly field: string,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(`Catalog field '${field}' must be an integer from ${String(minimum)} through ${String(maximum)}.`);
  }
}

export class SourceCatalogFiniteJsonNumberError extends TypeError {
  override readonly name = 'SourceCatalogFiniteJsonNumberError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' must contain finite JSON numbers.`);
  }
}

export class SourceCatalogFieldInvalidError extends TypeError {
  override readonly name = 'SourceCatalogFieldInvalidError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is invalid.`);
  }
}

export class SourceCatalogFieldOrderError extends TypeError {
  override readonly name = 'SourceCatalogFieldOrderError' as const;
  constructor(
    readonly field: string,
    readonly maximum_field: string,
  ) {
    super(`Catalog field '${field}' must not exceed ${maximum_field}.`);
  }
}

export class SourceCatalogJsonSerializationError extends TypeError {
  override readonly name = 'SourceCatalogJsonSerializationError' as const;
  constructor(
    readonly field: string,
    readonly original_cause: unknown,
  ) {
    super(`Catalog field '${field}' must be valid JSON.`, { cause: original_cause });
  }
}

export class SourceCatalogStoredOnlyFieldError extends TypeError {
  override readonly name = 'SourceCatalogStoredOnlyFieldError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is stored-only and cannot appear in a document.`);
  }
}

export class SourceCatalogFingerprintReferenceError extends TypeError {
  override readonly name = 'SourceCatalogFingerprintReferenceError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' must be a content-v1 fingerprint reference.`);
  }
}

export class SourceCatalogAggregateKindError extends TypeError {
  override readonly name = 'SourceCatalogAggregateKindError' as const;
  constructor(readonly expected_kind: string) {
    super(`Catalog aggregate.kind must be '${expected_kind}'.`);
  }
}

export class SourceCatalogStoreLocalFieldError extends TypeError {
  override readonly name = 'SourceCatalogStoreLocalFieldError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is store-local; use a content fingerprint reference.`);
  }
}

export class SourceCatalogDefinitionKeyConfigTypeError extends TypeError {
  override readonly name = 'SourceCatalogDefinitionKeyConfigTypeError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}.definition_key_config' must be string or null.`);
  }
}

export class SourceCatalogInertSourceDefinitionError extends TypeError {
  override readonly name = 'SourceCatalogInertSourceDefinitionError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}.source_definition' is inert when definition_key_config is present.`);
  }
}

export class SourceCatalogSourceKindMismatchError extends TypeError {
  override readonly name = 'SourceCatalogSourceKindMismatchError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}.source_definition.kind' must match source_type.`);
  }
}

export type SourceCatalogGrantDomain = 'skill' | 'domain_source_type';

const SOURCE_CATALOG_GRANT_DOMAIN_PHRASES: Readonly<
  Record<SourceCatalogGrantDomain, string>
> = {
  skill: 'is not a skill',
  domain_source_type: 'is not a domain source type',
};

export class SourceCatalogGrantDomainValueError extends TypeError {
  override readonly name = 'SourceCatalogGrantDomainValueError' as const;
  constructor(
    readonly field_label: string,
    readonly value: string,
    readonly expected: SourceCatalogGrantDomain,
  ) {
    super(`${field_label} '${value}' ${SOURCE_CATALOG_GRANT_DOMAIN_PHRASES[expected]}.`);
  }
}

export class SourceCatalogInvalidGrantRuleError extends TypeError {
  override readonly name = 'SourceCatalogInvalidGrantRuleError' as const;
  constructor(
    readonly field: string,
    readonly original_cause: unknown,
  ) {
    const detail = original_cause instanceof Error
      ? original_cause.message
      : String(original_cause);
    super(`Catalog field '${field}' is not a valid grant rule: ${detail}`, {
      cause: original_cause,
    });
  }
}

export class SourceCatalogEffectFieldError extends TypeError {
  override readonly name = 'SourceCatalogEffectFieldError' as const;
  constructor(
    readonly field: string,
    readonly effect_kind: string,
  ) {
    super(`Catalog field '${field}' is not valid for effect '${effect_kind}'.`);
  }
}

export class SourceCatalogRequiredFieldError extends TypeError {
  override readonly name = 'SourceCatalogRequiredFieldError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is required.`);
  }
}

export class SourceCatalogNonZeroFieldError extends TypeError {
  override readonly name = 'SourceCatalogNonZeroFieldError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' must be non-zero.`);
  }
}

export class SourceCatalogMissingEffectPayloadError extends TypeError {
  override readonly name = 'SourceCatalogMissingEffectPayloadError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is missing its effect payload.`);
  }
}

export type SourceCatalogExactListSubject = 'abilities' | 'skills';

export class SourceCatalogExactListError extends TypeError {
  override readonly name = 'SourceCatalogExactListError' as const;
  constructor(
    readonly field: string,
    readonly count: 2 | 3,
    readonly subject: SourceCatalogExactListSubject,
  ) {
    const countWord = count === 2 ? 'two' : 'three';
    super(`Catalog field '${field}' must contain ${countWord} ${subject}.`);
  }
}

export class SourceCatalogAbilityPointsError extends TypeError {
  override readonly name = 'SourceCatalogAbilityPointsError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' must be 0, 1, or 2.`);
  }
}

export class SourceCatalogBackgroundGrantKindError extends TypeError {
  override readonly name = 'SourceCatalogBackgroundGrantKindError' as const;
  constructor(
    readonly grant_index: number,
    readonly received_kind: string,
  ) {
    super(
      `Catalog field 'aggregate.grants[${String(grant_index)}].kind' ` +
        `must be 'grant_source' for background content; received ` +
        `'${received_kind}'.`,
    );
  }
}
