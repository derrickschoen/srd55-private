import { describe, expect, it } from 'vitest';
import {
  SourceCatalogAbilityPointsError,
  SourceCatalogAggregateKindError,
  SourceCatalogBackgroundGrantKindError,
  SourceCatalogDefinitionKeyConfigTypeError,
  SourceCatalogEffectFieldError,
  SourceCatalogExactListError,
  SourceCatalogFieldIntegerRangeError,
  SourceCatalogFieldInvalidError,
  SourceCatalogFieldLengthError,
  SourceCatalogFieldListLimitError,
  SourceCatalogFieldOrderError,
  SourceCatalogFieldTypeError,
  SourceCatalogFieldWhitespaceError,
  SourceCatalogFiniteJsonNumberError,
  SourceCatalogFingerprintReferenceError,
  SourceCatalogGrantDomainValueError,
  SourceCatalogInertSourceDefinitionError,
  SourceCatalogInvalidGrantRuleError,
  SourceCatalogJsonSerializationError,
  SourceCatalogMissingEffectPayloadError,
  SourceCatalogNonZeroFieldError,
  SourceCatalogRequiredFieldError,
  SourceCatalogSourceKindMismatchError,
  SourceCatalogStoredOnlyFieldError,
  SourceCatalogStoreLocalFieldError,
  SourceCatalogUnknownFieldError,
  type SourceCatalogGrantDomain,
  type SourceCatalogFieldShape,
  type SourceCatalogExactListSubject,
} from '../../../src/catalog/source-catalog-records-errors';

describe('source catalog record error formatters', () => {
  const cause = new Error('nested detail');
  const cases: readonly (readonly [Error, string, object])[] = [
    [new SourceCatalogFieldTypeError('aggregate', 'object'), "Catalog field 'aggregate' must be an object.", { field: 'aggregate', expected: 'object' }],
    [new SourceCatalogUnknownFieldError('aggregate.future'), "Catalog field 'aggregate.future' is unknown.", { field: 'aggregate.future' }],
    [new SourceCatalogFieldWhitespaceError('aggregate.name'), "Catalog field 'aggregate.name' contains surrounding whitespace.", { field: 'aggregate.name' }],
    [new SourceCatalogFieldLengthError('aggregate.name', 120), "Catalog field 'aggregate.name' must contain at most 120 characters.", { field: 'aggregate.name', maximum_length: 120 }],
    [new SourceCatalogFieldListLimitError('aggregate.grants', 100), "Catalog field 'aggregate.grants' must be a list of at most 100 entries.", { field: 'aggregate.grants', maximum_entries: 100 }],
    [new SourceCatalogFieldIntegerRangeError('aggregate.level', 1, 20), "Catalog field 'aggregate.level' must be an integer from 1 through 20.", { field: 'aggregate.level', minimum: 1, maximum: 20 }],
    [new SourceCatalogFiniteJsonNumberError('aggregate.value'), "Catalog field 'aggregate.value' must contain finite JSON numbers.", { field: 'aggregate.value' }],
    [new SourceCatalogFieldInvalidError('aggregate.kind'), "Catalog field 'aggregate.kind' is invalid.", { field: 'aggregate.kind' }],
    [new SourceCatalogFieldOrderError('aggregate.from', 'to'), "Catalog field 'aggregate.from' must not exceed to.", { field: 'aggregate.from', maximum_field: 'to' }],
    [new SourceCatalogJsonSerializationError('aggregate.value', cause), "Catalog field 'aggregate.value' must be valid JSON.", { field: 'aggregate.value', original_cause: cause, cause }],
    [new SourceCatalogStoredOnlyFieldError('aggregate.stored_fields'), "Catalog field 'aggregate.stored_fields' is stored-only and cannot appear in a document.", { field: 'aggregate.stored_fields' }],
    [new SourceCatalogFingerprintReferenceError('aggregate.source'), "Catalog field 'aggregate.source' must be a content-v1 fingerprint reference.", { field: 'aggregate.source' }],
    [new SourceCatalogAggregateKindError('feat'), "Catalog aggregate.kind must be 'feat'.", { expected_kind: 'feat' }],
    [new SourceCatalogStoreLocalFieldError('aggregate.grants[0].spell_version_id'), "Catalog field 'aggregate.grants[0].spell_version_id' is store-local; use a content fingerprint reference.", { field: 'aggregate.grants[0].spell_version_id' }],
    [new SourceCatalogDefinitionKeyConfigTypeError('aggregate.grants[0]'), "Catalog field 'aggregate.grants[0].definition_key_config' must be string or null.", { field: 'aggregate.grants[0]' }],
    [new SourceCatalogInertSourceDefinitionError('aggregate.grants[0]'), "Catalog field 'aggregate.grants[0].source_definition' is inert when definition_key_config is present.", { field: 'aggregate.grants[0]' }],
    [new SourceCatalogSourceKindMismatchError('aggregate.grants[0]'), "Catalog field 'aggregate.grants[0].source_definition.kind' must match source_type.", { field: 'aggregate.grants[0]' }],
    [new SourceCatalogGrantDomainValueError("Catalog field 'aggregate.skills[0]'", 'Lore', 'skill'), "Catalog field 'aggregate.skills[0]' 'Lore' is not a skill.", { field_label: "Catalog field 'aggregate.skills[0]'", value: 'Lore', expected: 'skill' }],
    [new SourceCatalogInvalidGrantRuleError('aggregate.grants[0]', cause), "Catalog field 'aggregate.grants[0]' is not a valid grant rule: nested detail", { field: 'aggregate.grants[0]', original_cause: cause, cause }],
    [new SourceCatalogEffectFieldError('aggregate.effects[0].future', 'speed'), "Catalog field 'aggregate.effects[0].future' is not valid for effect 'speed'.", { field: 'aggregate.effects[0].future', effect_kind: 'speed' }],
    [new SourceCatalogRequiredFieldError('aggregate.effects[0].amount'), "Catalog field 'aggregate.effects[0].amount' is required.", { field: 'aggregate.effects[0].amount' }],
    [new SourceCatalogNonZeroFieldError('aggregate.effects[0].amount'), "Catalog field 'aggregate.effects[0].amount' must be non-zero.", { field: 'aggregate.effects[0].amount' }],
    [new SourceCatalogMissingEffectPayloadError('aggregate.effects[0]'), "Catalog field 'aggregate.effects[0]' is missing its effect payload.", { field: 'aggregate.effects[0]' }],
    [new SourceCatalogExactListError('aggregate.suggested_abilities', 3, 'abilities'), "Catalog field 'aggregate.suggested_abilities' must contain three abilities.", { field: 'aggregate.suggested_abilities', count: 3, subject: 'abilities' }],
    [new SourceCatalogAbilityPointsError('aggregate.ability_points'), "Catalog field 'aggregate.ability_points' must be 0, 1, or 2.", { field: 'aggregate.ability_points' }],
    [new SourceCatalogBackgroundGrantKindError(2, 'skill_proficiency'), "Catalog field 'aggregate.grants[2].kind' must be 'grant_source' for background content; received 'skill_proficiency'.", { grant_index: 2, received_kind: 'skill_proficiency' }],
  ];

  it.each(cases)('formats %s', (error, message, parameters) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(parameters);
  });

  it('formats every field-shape token without an undefined phrase', () => {
    const shapes: readonly SourceCatalogFieldShape[] = [
      'object',
      'non_empty_text',
      'boolean',
    ];
    for (const shape of shapes) {
      expect(new SourceCatalogFieldTypeError('field', shape).message).not.toContain(
        'undefined',
      );
    }
  });

  it('formats every grant-domain and exact-list token without an undefined phrase', () => {
    const domains: readonly SourceCatalogGrantDomain[] = [
      'skill',
      'domain_source_type',
    ];
    for (const domain of domains) {
      expect(
        new SourceCatalogGrantDomainValueError('field', 'value', domain).message,
      ).not.toContain('undefined');
    }
    const lists: readonly (readonly [2 | 3, SourceCatalogExactListSubject])[] = [
      [3, 'abilities'],
      [2, 'skills'],
    ];
    for (const [count, subject] of lists) {
      expect(new SourceCatalogExactListError('field', count, subject).message)
        .not.toContain('undefined');
    }
  });
});
