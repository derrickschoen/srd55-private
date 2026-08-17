/**
 * TAGGED ERRORS FOR THE TIER 1 / TIER 2 CATALOG DOCUMENT PARSER (D274, D276).
 *
 * Every refusal `catalog-schema.ts` raises is one of these classes. None of
 * them accepts a prose `message`: a class takes the FACTS of the guard that
 * failed and derives the sentence, so a caller can branch on the class and read
 * the facts off the instance instead of matching a string.
 *
 * GROUPING IS BY GUARD FAMILY, NOT BY SENTENCE. `CatalogFieldTypeError` covers
 * every "this field is the wrong shape" guard with an `expected` token, because
 * those guards differ only in which shape they wanted. A guard that states a
 * DIFFERENT KIND of fact — a bound, an enum, a cross-field disagreement — is a
 * different class, because those facts are different parameters.
 *
 * `name` is a literal TYPE, not just a literal value: `override readonly name =
 * 'X' as const` makes a wrong or emptied tag a COMPILE error rather than a
 * runtime surprise, which is the point of tagging at all.
 */

/** THE SHAPES A CATALOG FIELD GUARD CAN DEMAND. One token per phrase. */
export type CatalogFieldShape =
  | 'string'
  | 'non_empty_string'
  | 'nullable_string'
  | 'boolean'
  | 'list'
  | 'non_empty_string_items'
  | 'object'
  | 'nullable_object';

const CATALOG_FIELD_SHAPE_PHRASES: Readonly<Record<CatalogFieldShape, string>> =
  {
    string: 'must be a string',
    non_empty_string: 'must be a non-empty string',
    nullable_string: 'must be a string or null',
    boolean: 'must be boolean',
    list: 'must be a list',
    non_empty_string_items: 'must contain non-empty strings',
    object: 'must be an object',
    nullable_object: 'must be an object or null',
  };

/** A field is present but is not the shape the format allows. */
export class CatalogFieldTypeError extends TypeError {
  override readonly name = 'CatalogFieldTypeError' as const;
  constructor(
    readonly field: string,
    readonly expected: CatalogFieldShape,
  ) {
    super(
      `Catalog field '${field}' ${CATALOG_FIELD_SHAPE_PHRASES[expected]}.`,
    );
  }
}

/** A string field is longer than the column that will hold it. */
export class CatalogFieldLengthError extends TypeError {
  override readonly name = 'CatalogFieldLengthError' as const;
  constructor(
    readonly field: string,
    readonly maximum_length: number,
  ) {
    super(
      `Catalog field '${field}' must contain at most ${String(maximum_length)} characters.`,
    );
  }
}

/** A list field carries more rows than the format allows. */
export class CatalogFieldRowCountError extends TypeError {
  override readonly name = 'CatalogFieldRowCountError' as const;
  constructor(
    readonly field: string,
    readonly maximum_rows: number,
  ) {
    super(
      `Catalog field '${field}' must not contain more than ${String(maximum_rows)} rows.`,
    );
  }
}

/** An integer field is missing, non-integral, or outside its bounds. */
export class CatalogFieldIntegerRangeError extends TypeError {
  override readonly name = 'CatalogFieldIntegerRangeError' as const;
  constructor(
    readonly field: string,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(
      `Catalog field '${field}' must be an integer from ${String(minimum)} through ${String(maximum)}.`,
    );
  }
}

/** As above, where `null` is also allowed. */
export class CatalogFieldNullableIntegerRangeError extends TypeError {
  override readonly name = 'CatalogFieldNullableIntegerRangeError' as const;
  constructor(
    readonly field: string,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(
      `Catalog field '${field}' must be null or an integer from ${String(minimum)} through ${String(maximum)}.`,
    );
  }
}

/** An open-ended non-negative counter that may also be absent. */
export class CatalogFieldNullableNonNegativeIntegerError extends TypeError {
  override readonly name =
    'CatalogFieldNullableNonNegativeIntegerError' as const;
  constructor(readonly field: string) {
    super(
      `Catalog field '${field}' must be a non-negative integer or null.`,
    );
  }
}

/** Whether the enum field must be present, or is only checked when present. */
export type CatalogEnumPresence = 'required' | 'optional';

/** A field carries a value outside a closed vocabulary the format names. */
export class CatalogFieldEnumError extends TypeError {
  override readonly name = 'CatalogFieldEnumError' as const;
  constructor(
    readonly field: string,
    readonly allowed: readonly string[],
    readonly presence: CatalogEnumPresence = 'required',
  ) {
    super(
      `Catalog field '${field}' must be one of ${allowed.join(', ')}${
        presence === 'optional' ? ' when present' : ''
      }.`,
    );
  }
}

/**
 * A field carries a value outside a closed vocabulary the format does NOT
 * spell out in the message, because the vocabulary is long enough that naming
 * it drowns the refusal.
 */
export class CatalogFieldInvalidError extends TypeError {
  override readonly name = 'CatalogFieldInvalidError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is invalid.`);
  }
}

/** A signed magnitude that is present, in range, and meaningless at zero. */
export class CatalogFieldNonZeroError extends TypeError {
  override readonly name = 'CatalogFieldNonZeroError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' must be non-zero.`);
  }
}

/** A field naming an ability names something that is not one. */
export class CatalogFieldNotAnAbilityError extends TypeError {
  override readonly name = 'CatalogFieldNotAnAbilityError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' is not an ability.`);
  }
}

/** A locator field carries surrounding whitespace, which is never equal. */
export class CatalogFieldWhitespaceError extends TypeError {
  override readonly name = 'CatalogFieldWhitespaceError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' contains surrounding whitespace.`);
  }
}

/** A list-of-levels field holds an entry outside the level ladder. */
export class CatalogLevelListRangeError extends TypeError {
  override readonly name = 'CatalogLevelListRangeError' as const;
  constructor(
    readonly field: string,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(
      `Catalog field '${field}' must contain integers from ${String(minimum)} through ${String(maximum)}.`,
    );
  }
}

/** A list-of-levels field names the same level twice. */
export class CatalogLevelListDuplicateError extends TypeError {
  override readonly name = 'CatalogLevelListDuplicateError' as const;
  constructor(
    readonly field: string,
    readonly level: number,
  ) {
    super(`Catalog field '${field}' repeats level ${String(level)}.`);
  }
}

/**
 * A damage value's `kind` is not one the surrounding slot accepts —
 * `not_recorded` is versatile-only, `not_applicable` is non-versatile-only, so
 * the legal set depends on the slot rather than on the value alone.
 */
export class CatalogDamageKindError extends TypeError {
  override readonly name = 'CatalogDamageKindError' as const;
  constructor(readonly field: string) {
    super(
      `Catalog field '${field}.kind' is not valid for this damage value.`,
    );
  }
}

/** A weapon range record declares neither `none` nor `ranged`. */
export class CatalogRangeKindError extends TypeError {
  override readonly name = 'CatalogRangeKindError' as const;
  constructor() {
    super("Catalog field 'range.kind' must be none or ranged.");
  }
}

/** A weapon's long range is shorter than its normal range. */
export class CatalogRangeOrderError extends TypeError {
  override readonly name = 'CatalogRangeOrderError' as const;
  constructor() {
    super(
      "Catalog field 'range.farFeet' must not be less than nearFeet.",
    );
  }
}

/** `dexBonus` and `dexBonusMax` state incompatible facts about the same armor. */
export class CatalogArmorDexBonusDisagreementError extends TypeError {
  override readonly name =
    'CatalogArmorDexBonusDisagreementError' as const;
  constructor() {
    super("Catalog fields 'dexBonus' and 'dexBonusMax' disagree.");
  }
}

/** A shield claims a Dexterity bonus, which shields never carry. */
export class CatalogShieldDexBonusError extends TypeError {
  override readonly name = 'CatalogShieldDexBonusError' as const;
  constructor() {
    super(
      "Catalog field 'dexBonus' must be 'none' when category is 'shield'.",
    );
  }
}

/** An `hp_modifier` effect carries neither a flat nor a per-level amount. */
export class CatalogHpModifierPayloadError extends TypeError {
  override readonly name = 'CatalogHpModifierPayloadError' as const;
  constructor(readonly field: string) {
    super(`Catalog field '${field}' needs an HP modifier payload.`);
  }
}

/** The retired `upcastScale` field, refused with its replacement named. */
export class CatalogUpcastScaleRetiredError extends TypeError {
  override readonly name = 'CatalogUpcastScaleRetiredError' as const;
  constructor() {
    super(
      "Catalog field 'upcastScale' no longer exists: upcasting is measured in spell slot levels only, so 'upcastLevels' is 1 through 9, and a cantrip's character-level ladder is 'cantripUpgradeLevels', 1 through 20.",
    );
  }
}

/** `attackCount` is a TOTAL, so anything under 2 cannot be one. */
export class CatalogExtraAttackCountError extends TypeError {
  override readonly name = 'CatalogExtraAttackCountError' as const;
  constructor(readonly label: string) {
    super(
      `Catalog field '${label}.effect.attackCount' must be an integer of 2 or more; it is the TOTAL attacks the Attack action gives, never an increment.`,
    );
  }
}

/** `weaponScope` has no default, and this says why it will not get one. */
export class CatalogExtraAttackWeaponScopeError extends TypeError {
  override readonly name = 'CatalogExtraAttackWeaponScopeError' as const;
  constructor(
    readonly label: string,
    readonly allowed: readonly string[],
  ) {
    super(
      `Catalog field '${label}.effect.weaponScope' must be one of ${allowed.join(', ')}; it has no default, because defaulting it would widen a one-weapon grant to every weapon.`,
    );
  }
}

/** A subclass document carries a key that is not an IMPORTED content key. */
export class CatalogImportedContentKeyError extends TypeError {
  override readonly name = 'CatalogImportedContentKeyError' as const;
  constructor(readonly content_key: string) {
    super(
      `Catalog field 'contentKey' must be an imported content key of the form <edition>:<owner.namespace>:<name>; '${content_key}' is not, and bundled keys such as '2024:subclass:champion' are refused by that shape on purpose.`,
    );
  }
}

/** A subclass with no features would import as an empty subclass. */
export class CatalogSubclassFeaturesRequiredError extends TypeError {
  override readonly name = 'CatalogSubclassFeaturesRequiredError' as const;
  constructor(readonly content_key: string) {
    super(
      `Catalog field 'features' must be a non-empty list for subclass '${content_key}'.`,
    );
  }
}

/** Two features of one subclass share a name, which the table forbids. */
export class CatalogSubclassDuplicateFeatureError extends TypeError {
  override readonly name = 'CatalogSubclassDuplicateFeatureError' as const;
  constructor(
    readonly content_key: string,
    readonly feature_name: string,
  ) {
    super(
      `Subclass '${content_key}' lists the feature '${feature_name}' twice; feature names are unique within a subclass.`,
    );
  }
}

/** Which document tier a document-level refusal came from. */
export type CatalogDocumentTier = 1 | 2;

/** A document is not JSON at all. `reason` is the engine's parser message. */
export class CatalogDocumentJsonParseError extends TypeError {
  override readonly name = 'CatalogDocumentJsonParseError' as const;
  constructor(
    readonly tier: CatalogDocumentTier,
    readonly document_number: number,
    readonly reason: string,
  ) {
    super(
      `Invalid Tier ${String(tier)} catalog document ${String(document_number)} JSON: ${reason}`,
    );
  }
}

/** A document parsed as JSON but its top level is not a list of records. */
export class CatalogDocumentNotAListError extends TypeError {
  override readonly name = 'CatalogDocumentNotAListError' as const;
  constructor(
    readonly tier: CatalogDocumentTier,
    readonly document_number: number,
  ) {
    super(
      `Tier ${String(tier)} catalog document ${String(document_number)} must contain a JSON list.`,
    );
  }
}

/** A Tier 1 list holds something that is not a record. */
export class CatalogNonObjectRecordError extends TypeError {
  override readonly name = 'CatalogNonObjectRecordError' as const;
  constructor() {
    super('Catalog document contains a non-object record.');
  }
}

/** An import was asked for with no Tier 1 documents at all. */
export class CatalogTierOneRequiredError extends TypeError {
  override readonly name = 'CatalogTierOneRequiredError' as const;
  constructor() {
    super('At least one Tier 1 catalog document is required.');
  }
}

/** Two Tier 1 documents describe the same subclass differently. */
export class CatalogTierOneSubclassConflictError extends TypeError {
  override readonly name = 'CatalogTierOneSubclassConflictError' as const;
  constructor(readonly content_key: string) {
    super(
      `Tier 1 carries two different subclasses under the key '${content_key}'.`,
    );
  }
}

/** What a Tier 2 row got wrong. Both refusals name the same document. */
export type CatalogTierTwoRecordIssue = 'non_object' | 'invalid_version_key';

const CATALOG_TIER_TWO_RECORD_PHRASES: Readonly<
  Record<CatalogTierTwoRecordIssue, string>
> = {
  non_object: 'contains a non-object record',
  invalid_version_key: 'contains an invalid versionKey',
};

/** A Tier 2 row is unusable before its description is even read. */
export class CatalogTierTwoRecordError extends TypeError {
  override readonly name = 'CatalogTierTwoRecordError' as const;
  constructor(
    readonly document_number: number,
    readonly issue: CatalogTierTwoRecordIssue,
  ) {
    super(
      `Tier 2 catalog document ${String(document_number)} ${CATALOG_TIER_TWO_RECORD_PHRASES[issue]}.`,
    );
  }
}

/** A Tier 2 row names a version but carries no description for it. */
export class CatalogTierTwoDescriptionEmptyError extends TypeError {
  override readonly name = 'CatalogTierTwoDescriptionEmptyError' as const;
  constructor(readonly version_key: string) {
    super(
      `Tier 2 description for ${version_key} must be a non-empty string.`,
    );
  }
}

/** Two Tier 2 rows describe one version differently; neither can win. */
export class CatalogTierTwoDescriptionConflictError extends TypeError {
  override readonly name =
    'CatalogTierTwoDescriptionConflictError' as const;
  constructor(readonly version_key: string) {
    super(`Tier 2 has conflicting descriptions for ${version_key}.`);
  }
}

/** The vocabularies an exhaustive switch in this parser closes over. */
export type CatalogUnhandledKindSubject =
  | 'class feature effect kind'
  | 'catalog record kind';

/**
 * A `never` arm was reached. Not `TypeError`: the document is not what is
 * wrong, this build is — the switch above it stopped being exhaustive.
 */
export class CatalogUnhandledKindError extends Error {
  override readonly name = 'CatalogUnhandledKindError' as const;
  constructor(
    readonly subject: CatalogUnhandledKindSubject,
    readonly value: string,
  ) {
    super(`Unhandled ${subject} ${value}.`);
  }
}
