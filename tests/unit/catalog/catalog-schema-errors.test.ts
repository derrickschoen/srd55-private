import { describe, expect, it } from 'vitest';
import {
  CatalogArmorDexBonusDisagreementError,
  CatalogDamageKindError,
  CatalogDocumentJsonParseError,
  CatalogDocumentNotAListError,
  CatalogExtraAttackCountError,
  CatalogExtraAttackWeaponScopeError,
  CatalogFieldEnumError,
  CatalogFieldIntegerRangeError,
  CatalogFieldInvalidError,
  CatalogFieldLengthError,
  CatalogFieldNonZeroError,
  CatalogFieldNotAnAbilityError,
  CatalogFieldNullableIntegerRangeError,
  CatalogFieldNullableNonNegativeIntegerError,
  CatalogFieldRowCountError,
  CatalogFieldTypeError,
  CatalogFieldWhitespaceError,
  CatalogHpModifierPayloadError,
  CatalogImportedContentKeyError,
  CatalogLevelListDuplicateError,
  CatalogLevelListRangeError,
  CatalogNonObjectRecordError,
  CatalogRangeKindError,
  CatalogRangeOrderError,
  CatalogShieldDexBonusError,
  CatalogSubclassDuplicateFeatureError,
  CatalogSubclassFeaturesRequiredError,
  CatalogTierOneRequiredError,
  CatalogTierOneSubclassConflictError,
  CatalogTierTwoDescriptionConflictError,
  CatalogTierTwoDescriptionEmptyError,
  CatalogTierTwoRecordError,
  CatalogUnhandledKindError,
  CatalogUpcastScaleRetiredError,
  type CatalogFieldShape,
} from '../../../src/catalog/catalog-schema-errors';

/**
 * THE ONE PLACE THE CATALOG PARSER'S SENTENCES ARE ASSERTED (D274/D276).
 *
 * Guard tests assert the CLASS and its PARAMETERS. The prose each class derives
 * from those parameters is pinned here and nowhere else, so rewording a message
 * touches one test rather than forty, and a guard test cannot silently start
 * passing on a different refusal that happens to share a substring.
 *
 * Every class exported by `catalog-schema-errors.ts` has a case below. A class
 * added without one is a class whose sentence nothing checks.
 */

const ALL_SHAPES: readonly CatalogFieldShape[] = [
  'string',
  'non_empty_string',
  'nullable_string',
  'boolean',
  'list',
  'non_empty_string_items',
  'object',
  'nullable_object',
];

describe('catalog schema error formatters', () => {
  it.each([
    ['string', "Catalog field 'name' must be a string."],
    ['non_empty_string', "Catalog field 'name' must be a non-empty string."],
    ['nullable_string', "Catalog field 'name' must be a string or null."],
    ['boolean', "Catalog field 'name' must be boolean."],
    ['list', "Catalog field 'name' must be a list."],
    [
      'non_empty_string_items',
      "Catalog field 'name' must contain non-empty strings.",
    ],
    ['object', "Catalog field 'name' must be an object."],
    ['nullable_object', "Catalog field 'name' must be an object or null."],
  ] as const)('CatalogFieldTypeError formats %s', (expected, message) => {
    const error = new CatalogFieldTypeError('name', expected);
    expect(error.message).toBe(message);
    expect(error.name).toBe('CatalogFieldTypeError');
    expect(error.field).toBe('name');
    expect(error.expected).toBe(expected);
    expect(error).toBeInstanceOf(TypeError);
  });

  it('CatalogFieldTypeError formats every declared shape', () => {
    // A shape added to the union without a phrase would format `undefined`.
    for (const shape of ALL_SHAPES) {
      expect(new CatalogFieldTypeError('f', shape).message).not.toContain(
        'undefined',
      );
    }
  });

  it('CatalogFieldLengthError formats its bound', () => {
    const error = new CatalogFieldLengthError('name', 120);
    expect(error.message).toBe(
      "Catalog field 'name' must contain at most 120 characters.",
    );
    expect(error.name).toBe('CatalogFieldLengthError');
    expect(error.maximum_length).toBe(120);
  });

  it('CatalogFieldRowCountError formats its bound', () => {
    const error = new CatalogFieldRowCountError('effects', 200);
    expect(error.message).toBe(
      "Catalog field 'effects' must not contain more than 200 rows.",
    );
    expect(error.name).toBe('CatalogFieldRowCountError');
    expect(error.maximum_rows).toBe(200);
  });

  it('CatalogFieldIntegerRangeError formats both bounds', () => {
    const error = new CatalogFieldIntegerRangeError('level', 0, 9);
    expect(error.message).toBe(
      "Catalog field 'level' must be an integer from 0 through 9.",
    );
    expect(error.name).toBe('CatalogFieldIntegerRangeError');
    expect(error.minimum).toBe(0);
    expect(error.maximum).toBe(9);
  });

  it('CatalogFieldNullableIntegerRangeError formats both bounds', () => {
    const error = new CatalogFieldNullableIntegerRangeError('dexBonusMax', 0, 20);
    expect(error.message).toBe(
      "Catalog field 'dexBonusMax' must be null or an integer from 0 through 20.",
    );
    expect(error.name).toBe('CatalogFieldNullableIntegerRangeError');
    expect(error.minimum).toBe(0);
    expect(error.maximum).toBe(20);
  });

  it('CatalogFieldNullableNonNegativeIntegerError names its field', () => {
    const error = new CatalogFieldNullableNonNegativeIntegerError('sourcePage');
    expect(error.message).toBe(
      "Catalog field 'sourcePage' must be a non-negative integer or null.",
    );
    expect(error.name).toBe('CatalogFieldNullableNonNegativeIntegerError');
    expect(error.field).toBe('sourcePage');
  });

  it('CatalogFieldEnumError lists the vocabulary, and marks optional fields', () => {
    const required = new CatalogFieldEnumError('edition', ['2014', '2024']);
    expect(required.message).toBe(
      "Catalog field 'edition' must be one of 2014, 2024.",
    );
    expect(required.name).toBe('CatalogFieldEnumError');
    expect(required.presence).toBe('required');
    const optional = new CatalogFieldEnumError(
      'kind',
      ['spell', 'weapon'],
      'optional',
    );
    expect(optional.message).toBe(
      "Catalog field 'kind' must be one of spell, weapon when present.",
    );
    expect(optional.allowed).toEqual(['spell', 'weapon']);
  });

  it('CatalogFieldInvalidError names only the field', () => {
    const error = new CatalogFieldInvalidError('srdGroup');
    expect(error.message).toBe("Catalog field 'srdGroup' is invalid.");
    expect(error.name).toBe('CatalogFieldInvalidError');
  });

  it('CatalogFieldNonZeroError names only the field', () => {
    const error = new CatalogFieldNonZeroError('effects[0].amount');
    expect(error.message).toBe(
      "Catalog field 'effects[0].amount' must be non-zero.",
    );
    expect(error.name).toBe('CatalogFieldNonZeroError');
  });

  it('CatalogFieldNotAnAbilityError names only the field', () => {
    const error = new CatalogFieldNotAnAbilityError('effects[0].ability');
    expect(error.message).toBe(
      "Catalog field 'effects[0].ability' is not an ability.",
    );
    expect(error.name).toBe('CatalogFieldNotAnAbilityError');
  });

  it('CatalogFieldWhitespaceError names only the field', () => {
    const error = new CatalogFieldWhitespaceError('versionKey');
    expect(error.message).toBe(
      "Catalog field 'versionKey' contains surrounding whitespace.",
    );
    expect(error.name).toBe('CatalogFieldWhitespaceError');
  });

  it('CatalogLevelListRangeError formats the ladder', () => {
    const error = new CatalogLevelListRangeError('upcastLevels', 1, 9);
    expect(error.message).toBe(
      "Catalog field 'upcastLevels' must contain integers from 1 through 9.",
    );
    expect(error.name).toBe('CatalogLevelListRangeError');
    expect(error.minimum).toBe(1);
    expect(error.maximum).toBe(9);
  });

  it('CatalogLevelListDuplicateError names the repeated level', () => {
    const error = new CatalogLevelListDuplicateError('upcastLevels', 3);
    expect(error.message).toBe(
      "Catalog field 'upcastLevels' repeats level 3.",
    );
    expect(error.name).toBe('CatalogLevelListDuplicateError');
    expect(error.level).toBe(3);
  });

  it('CatalogDamageKindError appends the kind path', () => {
    const error = new CatalogDamageKindError('versatileDamage');
    expect(error.message).toBe(
      "Catalog field 'versatileDamage.kind' is not valid for this damage value.",
    );
    expect(error.name).toBe('CatalogDamageKindError');
    expect(error.field).toBe('versatileDamage');
  });

  it('CatalogRangeKindError states the two legal kinds', () => {
    const error = new CatalogRangeKindError();
    expect(error.message).toBe(
      "Catalog field 'range.kind' must be none or ranged.",
    );
    expect(error.name).toBe('CatalogRangeKindError');
  });

  it('CatalogRangeOrderError states the ordering', () => {
    const error = new CatalogRangeOrderError();
    expect(error.message).toBe(
      "Catalog field 'range.farFeet' must not be less than nearFeet.",
    );
    expect(error.name).toBe('CatalogRangeOrderError');
  });

  it('CatalogArmorDexBonusDisagreementError names both fields', () => {
    const error = new CatalogArmorDexBonusDisagreementError();
    expect(error.message).toBe(
      "Catalog fields 'dexBonus' and 'dexBonusMax' disagree.",
    );
    expect(error.name).toBe('CatalogArmorDexBonusDisagreementError');
  });

  it('CatalogShieldDexBonusError states the shield rule', () => {
    const error = new CatalogShieldDexBonusError();
    expect(error.message).toBe(
      "Catalog field 'dexBonus' must be 'none' when category is 'shield'.",
    );
    expect(error.name).toBe('CatalogShieldDexBonusError');
  });

  it('CatalogHpModifierPayloadError names the effect field', () => {
    const error = new CatalogHpModifierPayloadError('effects[2]');
    expect(error.message).toBe(
      "Catalog field 'effects[2]' needs an HP modifier payload.",
    );
    expect(error.name).toBe('CatalogHpModifierPayloadError');
  });

  it('CatalogUpcastScaleRetiredError names the replacement fields', () => {
    const error = new CatalogUpcastScaleRetiredError();
    expect(error.message).toBe(
      "Catalog field 'upcastScale' no longer exists: upcasting is measured in spell slot levels only, so 'upcastLevels' is 1 through 9, and a cantrip's character-level ladder is 'cantripUpgradeLevels', 1 through 20.",
    );
    expect(error.name).toBe('CatalogUpcastScaleRetiredError');
  });

  it('CatalogExtraAttackCountError says the count is a total', () => {
    const error = new CatalogExtraAttackCountError('features[0]');
    expect(error.message).toBe(
      "Catalog field 'features[0].effect.attackCount' must be an integer of 2 or more; it is the TOTAL attacks the Attack action gives, never an increment.",
    );
    expect(error.name).toBe('CatalogExtraAttackCountError');
    expect(error.label).toBe('features[0]');
  });

  it('CatalogExtraAttackWeaponScopeError refuses a default', () => {
    const error = new CatalogExtraAttackWeaponScopeError('features[1]', [
      'any_weapon',
      'chosen_weapon',
    ]);
    expect(error.message).toBe(
      "Catalog field 'features[1].effect.weaponScope' must be one of any_weapon, chosen_weapon; it has no default, because defaulting it would widen a one-weapon grant to every weapon.",
    );
    expect(error.name).toBe('CatalogExtraAttackWeaponScopeError');
    expect(error.allowed).toEqual(['any_weapon', 'chosen_weapon']);
  });

  it('CatalogImportedContentKeyError quotes the refused key', () => {
    const error = new CatalogImportedContentKeyError('2024:subclass:champion');
    expect(error.message).toBe(
      "Catalog field 'contentKey' must be an imported content key of the form <edition>:<owner.namespace>:<name>; '2024:subclass:champion' is not, and bundled keys such as '2024:subclass:champion' are refused by that shape on purpose.",
    );
    expect(error.name).toBe('CatalogImportedContentKeyError');
    expect(error.content_key).toBe('2024:subclass:champion');
  });

  it('CatalogSubclassFeaturesRequiredError names the subclass', () => {
    const error = new CatalogSubclassFeaturesRequiredError(
      '2024:homebrew.unit:sample',
    );
    expect(error.message).toBe(
      "Catalog field 'features' must be a non-empty list for subclass '2024:homebrew.unit:sample'.",
    );
    expect(error.name).toBe('CatalogSubclassFeaturesRequiredError');
  });

  it('CatalogSubclassDuplicateFeatureError names subclass and feature', () => {
    const error = new CatalogSubclassDuplicateFeatureError(
      '2024:homebrew.unit:sample',
      'Second Wind',
    );
    expect(error.message).toBe(
      "Subclass '2024:homebrew.unit:sample' lists the feature 'Second Wind' twice; feature names are unique within a subclass.",
    );
    expect(error.name).toBe('CatalogSubclassDuplicateFeatureError');
    expect(error.feature_name).toBe('Second Wind');
  });

  it('CatalogDocumentJsonParseError carries the engine reason', () => {
    const error = new CatalogDocumentJsonParseError(1, 3, 'Unexpected end');
    expect(error.message).toBe(
      'Invalid Tier 1 catalog document 3 JSON: Unexpected end',
    );
    expect(error.name).toBe('CatalogDocumentJsonParseError');
    expect(error.tier).toBe(1);
    expect(error.document_number).toBe(3);
  });

  it('CatalogDocumentNotAListError names tier and document', () => {
    expect(new CatalogDocumentNotAListError(1, 1).message).toBe(
      'Tier 1 catalog document 1 must contain a JSON list.',
    );
    const tierTwo = new CatalogDocumentNotAListError(2, 4);
    expect(tierTwo.message).toBe(
      'Tier 2 catalog document 4 must contain a JSON list.',
    );
    expect(tierTwo.name).toBe('CatalogDocumentNotAListError');
  });

  it('CatalogNonObjectRecordError takes no parameters', () => {
    const error = new CatalogNonObjectRecordError();
    expect(error.message).toBe(
      'Catalog document contains a non-object record.',
    );
    expect(error.name).toBe('CatalogNonObjectRecordError');
  });

  it('CatalogTierOneRequiredError takes no parameters', () => {
    const error = new CatalogTierOneRequiredError();
    expect(error.message).toBe(
      'At least one Tier 1 catalog document is required.',
    );
    expect(error.name).toBe('CatalogTierOneRequiredError');
  });

  it('CatalogTierOneSubclassConflictError quotes the key', () => {
    const error = new CatalogTierOneSubclassConflictError('2024:a.b:c');
    expect(error.message).toBe(
      "Tier 1 carries two different subclasses under the key '2024:a.b:c'.",
    );
    expect(error.name).toBe('CatalogTierOneSubclassConflictError');
  });

  it.each([
    ['non_object', 'Tier 2 catalog document 2 contains a non-object record.'],
    [
      'invalid_version_key',
      'Tier 2 catalog document 2 contains an invalid versionKey.',
    ],
  ] as const)('CatalogTierTwoRecordError formats %s', (issue, message) => {
    const error = new CatalogTierTwoRecordError(2, issue);
    expect(error.message).toBe(message);
    expect(error.name).toBe('CatalogTierTwoRecordError');
    expect(error.issue).toBe(issue);
    expect(error.document_number).toBe(2);
  });

  it('CatalogTierTwoDescriptionEmptyError names the version', () => {
    const error = new CatalogTierTwoDescriptionEmptyError('2024:test-spell');
    expect(error.message).toBe(
      'Tier 2 description for 2024:test-spell must be a non-empty string.',
    );
    expect(error.name).toBe('CatalogTierTwoDescriptionEmptyError');
  });

  it('CatalogTierTwoDescriptionConflictError names the version', () => {
    const error = new CatalogTierTwoDescriptionConflictError('2024:test-spell');
    expect(error.message).toBe(
      'Tier 2 has conflicting descriptions for 2024:test-spell.',
    );
    expect(error.name).toBe('CatalogTierTwoDescriptionConflictError');
    expect(error.version_key).toBe('2024:test-spell');
  });

  it.each([
    ['class feature effect kind', 'Unhandled class feature effect kind aura.'],
    ['catalog record kind', 'Unhandled catalog record kind aura.'],
  ] as const)('CatalogUnhandledKindError formats %s', (subject, message) => {
    const error = new CatalogUnhandledKindError(subject, 'aura');
    expect(error.message).toBe(message);
    expect(error.name).toBe('CatalogUnhandledKindError');
    expect(error.value).toBe('aura');
    // A build bug, not a document bug: this one is deliberately not a TypeError.
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });
});
