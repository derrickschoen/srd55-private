import { describe, expect, it } from 'vitest';
import { CharacterAllocationMethodError } from '../../../../src/queries/character-crud';
import {
  CharacterSheetArmorClassBonusPayloadError,
  CharacterSheetArmorClassFormulaPayloadError,
} from '../../../../src/queries/character-sheet-builder';
import {
  CharacterSpellFactsMissingError,
  CharacterSpellLevelError,
  CharacterSpellRouteStatisticsError,
  CharacterSpellRulesEditionError,
  CharacterSpellSelectionBucketError,
} from '../../../../src/queries/character-spell-section-builder';
import {
  CharacterWorkspaceClassAssessmentMissingError,
  CharacterWorkspaceSpellcastingAbilityError,
  CharacterWorkspaceStandaloneSourceTypeError,
} from '../../../../src/queries/character-workspace-builder';
import { MulticlassPrimaryAbilityAssessmentMissingError } from '../../../../src/queries/multiclass-primary-ability';
import { OperationHistoryEnvelopeError } from '../../../../src/queries/operation-history';
import { SourceConfigurationShapeError } from '../../../../src/queries/source-config';
import {
  WeaponGroupError,
  WeaponRangeKindError,
} from '../../../../src/queries/weapons';

describe('query read-model error formatters', () => {
  it('formats CharacterAllocationMethodError', () => {
    const error = new CharacterAllocationMethodError(
      'ability_allocation_method',
      'rolled',
    );
    expect(error.message).toBe(
      'Character column ability_allocation_method holds unknown allocation method "rolled".',
    );
    expect(error.name).toBe('CharacterAllocationMethodError');
    expect(error).toMatchObject({
      column: 'ability_allocation_method',
      allocation_method: 'rolled',
    });
    expect(error).toBeInstanceOf(Error);
  });

  it('formats CharacterSheetArmorClassFormulaPayloadError', () => {
    const error = new CharacterSheetArmorClassFormulaPayloadError(41);
    expect(error.message).toBe(
      'Armor Class formula effect 41 has an incomplete payload.',
    );
    expect(error.name).toBe('CharacterSheetArmorClassFormulaPayloadError');
    expect(error.effect_id).toBe(41);
    expect(error).toBeInstanceOf(Error);
  });

  it('formats CharacterSheetArmorClassBonusPayloadError', () => {
    const error = new CharacterSheetArmorClassBonusPayloadError(42);
    expect(error.message).toBe('Armor Class bonus effect 42 has no amount.');
    expect(error.name).toBe('CharacterSheetArmorClassBonusPayloadError');
    expect(error.effect_id).toBe(42);
    expect(error).toBeInstanceOf(Error);
  });

  it('formats CharacterSpellLevelError', () => {
    const error = new CharacterSpellLevelError(10);
    expect(error.message).toBe(
      'Spell level 10 is outside 0..9 and is not a placeholder.',
    );
    expect(error.name).toBe('CharacterSpellLevelError');
    expect(error.spell_level).toBe(10);
    expect(error).toBeInstanceOf(Error);
  });

  it('formats CharacterSpellRulesEditionError', () => {
    const error = new CharacterSpellRulesEditionError('future-edition');
    expect(error.message).toBe(
      'Unknown spell rules edition future-edition.',
    );
    expect(error.name).toBe('CharacterSpellRulesEditionError');
    expect(error.rules_edition).toBe('future-edition');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('formats CharacterSpellSelectionBucketError', () => {
    const error = new CharacterSpellSelectionBucketError('future-bucket');
    expect(error.message).toBe(
      'Unhandled spell selection bucket future-bucket.',
    );
    expect(error.name).toBe('CharacterSpellSelectionBucketError');
    expect(error.bucket).toBe('future-bucket');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('formats CharacterSpellRouteStatisticsError', () => {
    const error = new CharacterSpellRouteStatisticsError(73);
    expect(error.message).toBe(
      'Evaluated spell route 73 has an ability but incomplete statistics.',
    );
    expect(error.name).toBe('CharacterSpellRouteStatisticsError');
    expect(error.spell_version_id).toBe(73);
    expect(error).toBeInstanceOf(Error);
  });

  it.each([
    ['selected_spell', 'Missing sheet facts for spell version 74.'],
    ['spellbook', 'Missing sheet facts for spellbook version 74.'],
  ] as const)(
    'formats CharacterSpellFactsMissingError for %s',
    (destination, message) => {
      const error = new CharacterSpellFactsMissingError(74, destination);
      expect(error.message).toBe(message);
      expect(error.name).toBe('CharacterSpellFactsMissingError');
      expect(error).toMatchObject({ spell_version_id: 74, destination });
      expect(error).toBeInstanceOf(Error);
    },
  );

  it('formats CharacterWorkspaceSpellcastingAbilityError', () => {
    const error = new CharacterWorkspaceSpellcastingAbilityError('luck');
    expect(error.message).toBe("Unknown spellcasting ability 'luck'.");
    expect(error.name).toBe('CharacterWorkspaceSpellcastingAbilityError');
    expect(error.spellcasting_ability).toBe('luck');
    expect(error).toBeInstanceOf(Error);
  });

  it('formats CharacterWorkspaceClassAssessmentMissingError', () => {
    const error = new CharacterWorkspaceClassAssessmentMissingError(75);
    expect(error.message).toBe('Class 75 was not assessed.');
    expect(error.name).toBe('CharacterWorkspaceClassAssessmentMissingError');
    expect(error.class_definition_id).toBe(75);
    expect(error).toBeInstanceOf(TypeError);
  });

  it('formats CharacterWorkspaceStandaloneSourceTypeError', () => {
    const error = new CharacterWorkspaceStandaloneSourceTypeError('mystery');
    expect(error.message).toBe("Unknown standalone source type 'mystery'.");
    expect(error.name).toBe('CharacterWorkspaceStandaloneSourceTypeError');
    expect(error.source_type).toBe('mystery');
    expect(error).toBeInstanceOf(TypeError);
  });

  it.each([
    [
      'declared_prerequisite',
      'Held class 76 declared a multiclass prerequisite but was not evaluated.',
    ],
    [
      'held_class',
      'Held class 76 has no multiclass prerequisite assessment.',
    ],
  ] as const)(
    'formats MulticlassPrimaryAbilityAssessmentMissingError for %s',
    (context, message) => {
      const error = new MulticlassPrimaryAbilityAssessmentMissingError(
        76,
        context,
      );
      expect(error.message).toBe(message);
      expect(error.name).toBe(
        'MulticlassPrimaryAbilityAssessmentMissingError',
      );
      expect(error).toMatchObject({ class_definition_id: 76, context });
      expect(error).toBeInstanceOf(Error);
    },
  );

  it('formats OperationHistoryEnvelopeError', () => {
    const error = new OperationHistoryEnvelopeError();
    expect(error.message).toBe(
      'Stored operation history envelope is invalid.',
    );
    expect(error.name).toBe('OperationHistoryEnvelopeError');
    expect(error).toBeInstanceOf(Error);
  });

  it('formats SourceConfigurationShapeError', () => {
    const error = new SourceConfigurationShapeError();
    expect(error.message).toBe(
      'Source configuration must be a JSON object.',
    );
    expect(error.name).toBe('SourceConfigurationShapeError');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('formats WeaponRangeKindError', () => {
    const error = new WeaponRangeKindError('teleporting');
    expect(error.message).toBe(
      'Unknown weapon range kind "teleporting".',
    );
    expect(error.name).toBe('WeaponRangeKindError');
    expect(error.range_kind).toBe('teleporting');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('formats WeaponGroupError', () => {
    const error = new WeaponGroupError('siege');
    expect(error.message).toBe("Unknown weapon group 'siege'.");
    expect(error.name).toBe('WeaponGroupError');
    expect(error.weapon_group).toBe('siege');
    expect(error).toBeInstanceOf(Error);
  });
});
