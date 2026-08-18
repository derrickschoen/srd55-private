import { describe, expect, it } from 'vitest';
import {
  AbilityEffectIncompletePayloadError,
  AbilityOverrideTermOrderError,
  AbilityOverrideUnhandledStatusError,
  AbilityOverrideWinnerMissingError,
} from '../../../../src/rules/ability-contributions';
import { AbilityScoreInputError } from '../../../../src/rules/ability-scores';
import {
  AttackBonusIntegerError,
  AttackBonusProficiencyBonusIntegerError,
} from '../../../../src/rules/attack-bonus';
import {
  ShillelaghCharacterLevelUndeterminedError,
} from '../../../../src/rules/attack-profiles';
import {
  CasterProgressionTypeError,
} from '../../../../src/rules/caster-contribution';
import {
  CharacterLevelIdRequiredError,
} from '../../../../src/rules/character-level';
import {
  ClassFeatureEffectUnhandledKindError,
} from '../../../../src/rules/class-feature-effects';
import {
  EquipmentItemKindError,
} from '../../../../src/rules/equipment-package-display';
import {
  ExtraAttackUnhandledWeaponScopeError,
} from '../../../../src/rules/extra-attack';
import {
  AbilityScoreImprovementFeatMissingError,
} from '../../../../src/rules/legacy-level-feat-choices';
import {
  ProficiencyCharacterLevelIntegerError,
} from '../../../../src/rules/proficiency';
import {
  ProgressionClassLevelIntegerError,
} from '../../../../src/rules/progression-type';
import {
  SaveDCProficiencyBonusIntegerError,
} from '../../../../src/rules/save-dc';
import { CasterLevelIntegerError } from '../../../../src/rules/spell-slots';

function expectTypeDefect(error: Error, name: string): void {
  expect(error).toBeInstanceOf(TypeError);
  expect(error.name).toBe(name);
}

function expectBuildDefect(error: Error, name: string): void {
  expect(error).toBeInstanceOf(Error);
  expect(error).not.toBeInstanceOf(TypeError);
  expect(error.name).toBe(name);
}

describe('rules calculation error formatters', () => {
  it('AbilityOverrideTermOrderError formats the invariant failure', () => {
    const error = new AbilityOverrideTermOrderError(2, 1);
    expect(error.message).toBe(
      'Ability override term order diverged from its candidates.',
    );
    expect(error).toMatchObject({ candidate_count: 2, term_count: 1 });
    expectTypeDefect(error, 'AbilityOverrideTermOrderError');
  });

  it('AbilityOverrideUnhandledStatusError formats the status', () => {
    const error = new AbilityOverrideUnhandledStatusError('future');
    expect(error.message).toBe('Unhandled ability override status future.');
    expect(error.status).toBe('future');
    expectTypeDefect(error, 'AbilityOverrideUnhandledStatusError');
  });

  it('AbilityOverrideWinnerMissingError formats the invariant failure', () => {
    const error = new AbilityOverrideWinnerMissingError(41, 24);
    expect(error.message).toBe(
      'An ability override has no winning candidate.',
    );
    expect(error).toMatchObject({ effect_id: 41, set_to: 24 });
    expectTypeDefect(error, 'AbilityOverrideWinnerMissingError');
  });

  it.each([
    ['increase', 7, 'Ability increase effect 7 has an incomplete payload.'],
    ['override', 8, 'Ability override effect 8 has an incomplete payload.'],
  ] as const)(
    'AbilityEffectIncompletePayloadError formats %s payloads',
    (effectKind, effectId, message) => {
      const error = new AbilityEffectIncompletePayloadError(
        effectKind,
        effectId,
      );
      expect(error.message).toBe(message);
      expect(error).toMatchObject({
        effect_kind: effectKind,
        effect_id: effectId,
      });
      expectBuildDefect(error, 'AbilityEffectIncompletePayloadError');
    },
  );

  it('AbilityScoreInputError formats the named ability', () => {
    const error = new AbilityScoreInputError('wisdom', 'ten');
    expect(error.message).toBe('Missing or invalid wisdom ability score.');
    expect(error).toMatchObject({ ability: 'wisdom', value: 'ten' });
    expectTypeDefect(error, 'AbilityScoreInputError');
  });

  it('AttackBonusIntegerError formats the rejected bonus', () => {
    const error = new AttackBonusIntegerError(2.5);
    expect(error.message).toBe('Attack bonus must be an integer, got 2.5.');
    expect(error.value).toBe(2.5);
    expectTypeDefect(error, 'AttackBonusIntegerError');
  });

  it('AttackBonusProficiencyBonusIntegerError formats its contract', () => {
    const error = new AttackBonusProficiencyBonusIntegerError(2.5);
    expect(error.message).toBe('Proficiency bonus must be an integer.');
    expect(error.proficiency_bonus).toBe(2.5);
    expectTypeDefect(error, 'AttackBonusProficiencyBonusIntegerError');
  });

  it('ShillelaghCharacterLevelUndeterminedError formats its invariant', () => {
    const error = new ShillelaghCharacterLevelUndeterminedError();
    expect(error.message).toBe(
      'A Shillelagh profile requires a determined character level.',
    );
    expectBuildDefect(error, 'ShillelaghCharacterLevelUndeterminedError');
  });

  it('CasterProgressionTypeError formats its class and progression', () => {
    const error = new CasterProgressionTypeError('Mystery', 'future');
    expect(error.message).toBe("Unknown progression type 'future' for Mystery.");
    expect(error).toMatchObject({
      class_name: 'Mystery',
      progression_type: 'future',
    });
    expectTypeDefect(error, 'CasterProgressionTypeError');
  });

  it('CharacterLevelIdRequiredError formats its missing-id contract', () => {
    const error = new CharacterLevelIdRequiredError();
    expect(error.message).toBe(
      'A character id is required for a database level read.',
    );
    expectTypeDefect(error, 'CharacterLevelIdRequiredError');
  });

  it('ClassFeatureEffectUnhandledKindError formats the kind', () => {
    const error = new ClassFeatureEffectUnhandledKindError('future');
    expect(error.message).toBe('Unhandled class feature effect kind future.');
    expect(error.effect_kind).toBe('future');
    expectBuildDefect(error, 'ClassFeatureEffectUnhandledKindError');
  });

  it('EquipmentItemKindError formats the stored item facts', () => {
    const error = new EquipmentItemKindError('Moon Dial', 'relic');
    expect(error.message).toBe(
      'Equipment item "Moon Dial" carries unknown item_kind "relic".',
    );
    expect(error).toMatchObject({
      item_name: 'Moon Dial',
      item_kind: 'relic',
    });
    expectBuildDefect(error, 'EquipmentItemKindError');
  });

  it('ExtraAttackUnhandledWeaponScopeError formats the scope', () => {
    const error = new ExtraAttackUnhandledWeaponScopeError('future');
    expect(error.message).toBe('Unhandled extra attack weapon scope future.');
    expect(error.weapon_scope).toBe('future');
    expectBuildDefect(error, 'ExtraAttackUnhandledWeaponScopeError');
  });

  it('AbilityScoreImprovementFeatMissingError formats its invariant', () => {
    const error = new AbilityScoreImprovementFeatMissingError();
    expect(error.message).toBe(
      'The bundled Ability Score Improvement feat is missing.',
    );
    expectBuildDefect(error, 'AbilityScoreImprovementFeatMissingError');
  });

  it('ProficiencyCharacterLevelIntegerError formats its contract', () => {
    const error = new ProficiencyCharacterLevelIntegerError(2.5);
    expect(error.message).toBe('Character level must be an integer.');
    expect(error.character_level).toBe(2.5);
    expectTypeDefect(error, 'ProficiencyCharacterLevelIntegerError');
  });

  it('ProgressionClassLevelIntegerError formats its contract', () => {
    const error = new ProgressionClassLevelIntegerError(2.5);
    expect(error.message).toBe('Class level must be an integer.');
    expect(error.class_level).toBe(2.5);
    expectTypeDefect(error, 'ProgressionClassLevelIntegerError');
  });

  it('SaveDCProficiencyBonusIntegerError formats its contract', () => {
    const error = new SaveDCProficiencyBonusIntegerError(2.5);
    expect(error.message).toBe('Proficiency bonus must be an integer.');
    expect(error.proficiency_bonus).toBe(2.5);
    expectTypeDefect(error, 'SaveDCProficiencyBonusIntegerError');
  });

  it('CasterLevelIntegerError formats its contract', () => {
    const error = new CasterLevelIntegerError(2.5);
    expect(error.message).toBe('Caster level must be an integer.');
    expect(error.caster_level).toBe(2.5);
    expectTypeDefect(error, 'CasterLevelIntegerError');
  });
});
