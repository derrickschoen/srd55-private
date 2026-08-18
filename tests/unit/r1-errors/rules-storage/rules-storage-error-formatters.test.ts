import { describe, expect, it } from 'vitest';
import {
  SrdAbilityScoreGenerationWordingError,
  SrdPointCostDuplicateScoreError,
  SrdPointCostTableMissingError,
  SrdStandardArrayShapeError,
} from '../../../../src/rules/ability-score-generation-srd';
import {
  SubclassSpellcastingAbilityError,
} from '../../../../src/rules/class-level-features-srd';
import {
  CharacterClassMembershipError,
  ClassDefinitionPersistenceError,
  ClassProgressionRowMissingError,
} from '../../../../src/rules/class-progression-lookup';
import {
  CharacterEffectAbilityError,
  CharacterEffectEnumError,
  CharacterEffectKindError,
  EligibleWeaponEffectPayloadError,
} from '../../../../src/rules/eligible-character-effects';
import {
  AuthoredResourceMarkingShapeError,
  StoredContributionSupersedesReferenceError,
  StoredFeatureValueTargetError,
} from '../../../../src/rules/sheet-feature-values';
import {
  BundledSubclassGrantRulesShapeError,
  BundledSubclassPersistenceError,
  SrdSubclassGrantRulesArrayError,
  SrdSubclassMissingSpellError,
} from '../../../../src/rules/srd-subclass-content';

describe('rules-storage error formatters', () => {
  it.each([
    [
      'standard_array',
      'SRD extract: Standard Array wording is absent or unrecognised.',
    ],
    [
      'point_cost',
      'SRD extract: Point Cost wording is absent or unrecognised.',
    ],
  ] as const)(
    'SrdAbilityScoreGenerationWordingError formats %s',
    (section, message) => {
      const error = new SrdAbilityScoreGenerationWordingError(section);
      expect(error.message).toBe(message);
      expect(error.name).toBe('SrdAbilityScoreGenerationWordingError');
      expect(error.section).toBe(section);
      expect(error).toBeInstanceOf(Error);
    },
  );

  it('SrdStandardArrayShapeError formats the required array shape', () => {
    const error = new SrdStandardArrayShapeError();
    expect(error.message).toBe(
      'SRD extract: Standard Array must list six integers.',
    );
    expect(error.name).toBe('SrdStandardArrayShapeError');
    expect(error).toBeInstanceOf(Error);
  });

  it('SrdPointCostDuplicateScoreError formats the duplicated score', () => {
    const error = new SrdPointCostDuplicateScoreError(12);
    expect(error.message).toBe(
      'SRD extract: point cost for score 12 appears twice.',
    );
    expect(error.name).toBe('SrdPointCostDuplicateScoreError');
    expect(error.score).toBe(12);
  });

  it('SrdPointCostTableMissingError formats the missing-table defect', () => {
    const error = new SrdPointCostTableMissingError();
    expect(error.message).toBe(
      'SRD extract: the Ability Score Point Costs table is absent or unrecognised.',
    );
    expect(error.name).toBe('SrdPointCostTableMissingError');
  });

  it('SubclassSpellcastingAbilityError formats the corrupt ability', () => {
    const error = new SubclassSpellcastingAbilityError('luck');
    expect(error.message).toBe(
      "Subclass has unknown spellcasting ability 'luck'.",
    );
    expect(error.name).toBe('SubclassSpellcastingAbilityError');
    expect(error.ability).toBe('luck');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('ClassDefinitionPersistenceError formats the class name', () => {
    const error = new ClassDefinitionPersistenceError('Wizard');
    expect(error.message).toBe('Failed to persist class definition Wizard.');
    expect(error.name).toBe('ClassDefinitionPersistenceError');
    expect(error.class_name).toBe('Wizard');
  });

  it('CharacterClassMembershipError formats both row ids', () => {
    const error = new CharacterClassMembershipError(41, 7);
    expect(error.message).toBe('Character 41 does not have class 7.');
    expect(error.name).toBe('CharacterClassMembershipError');
    expect(error).toMatchObject({ character_id: 41, class_definition_id: 7 });
  });

  it('ClassProgressionRowMissingError formats the class row coordinates', () => {
    const error = new ClassProgressionRowMissingError(7, 21);
    expect(error.message).toBe(
      'Class 7 has no progression row at level 21.',
    );
    expect(error.name).toBe('ClassProgressionRowMissingError');
    expect(error).toMatchObject({ class_definition_id: 7, class_level: 21 });
  });

  it.each([
    [
      'attack_ability_override',
      'Bonded Blade has an incomplete attack ability override payload.',
    ],
    [
      'weapon_bonus',
      'Bonded Blade has an incomplete weapon bonus payload.',
    ],
  ] as const)(
    'EligibleWeaponEffectPayloadError formats %s',
    (payload, message) => {
      const error = new EligibleWeaponEffectPayloadError(
        'Bonded Blade',
        payload,
      );
      expect(error.message).toBe(message);
      expect(error.name).toBe('EligibleWeaponEffectPayloadError');
      expect(error).toMatchObject({ label: 'Bonded Blade', payload });
      expect(error).toBeInstanceOf(TypeError);
    },
  );

  it('CharacterEffectKindError formats the corrupt kind', () => {
    const error = new CharacterEffectKindError('teleport');
    expect(error.message).toBe("Unknown character effect kind 'teleport'.");
    expect(error.name).toBe('CharacterEffectKindError');
    expect(error.effect_kind).toBe('teleport');
  });

  it('CharacterEffectAbilityError formats the value and column', () => {
    const error = new CharacterEffectAbilityError('luck', 'ability_1');
    expect(error.message).toBe("Unknown ability 'luck' in ability_1.");
    expect(error.name).toBe('CharacterEffectAbilityError');
    expect(error).toMatchObject({ ability: 'luck', column: 'ability_1' });
  });

  it.each([
    ['source_type', 'Unknown effect source type \'mystery\'.'],
    ['weapon_scope', 'Unknown effect weapon scope \'every_weapon\'.'],
  ] as const)('CharacterEffectEnumError formats %s', (field, message) => {
    const value = field === 'source_type' ? 'mystery' : 'every_weapon';
    const error = new CharacterEffectEnumError(field, value);
    expect(error.message).toBe(message);
    expect(error.name).toBe('CharacterEffectEnumError');
    expect(error).toMatchObject({ field, value });
  });

  it('StoredFeatureValueTargetError formats the corrupt target key', () => {
    const error = new StoredFeatureValueTargetError('surprise_dice');
    expect(error.message).toBe(
      'Unknown stored feature-value target surprise_dice.',
    );
    expect(error.name).toBe('StoredFeatureValueTargetError');
    expect(error.target_key).toBe('surprise_dice');
    expect(error).toBeInstanceOf(TypeError);
  });

  it.each([
    ['feature_value', 'Stored feature-value supersedes_ref is not text.'],
    [
      'authored_resource',
      'Stored authored-resource supersedes_ref is not text.',
    ],
  ] as const)(
    'StoredContributionSupersedesReferenceError formats %s',
    (owner, message) => {
      const error = new StoredContributionSupersedesReferenceError(owner);
      expect(error.message).toBe(message);
      expect(error.name).toBe('StoredContributionSupersedesReferenceError');
      expect(error.owner).toBe(owner);
      expect(error).toBeInstanceOf(TypeError);
    },
  );

  it('AuthoredResourceMarkingShapeError formats the corrupt shape', () => {
    const error = new AuthoredResourceMarkingShapeError('circles');
    expect(error.message).toBe(
      'Unknown authored resource marking shape circles.',
    );
    expect(error.name).toBe('AuthoredResourceMarkingShapeError');
    expect(error.marking_shape).toBe('circles');
  });

  it.each([
    [
      'json_text_or_null',
      'Bundled subclass grant rules must be JSON text or null.',
    ],
    [
      'decoded_array',
      'Bundled subclass grant rules must decode to an array.',
    ],
  ] as const)(
    'BundledSubclassGrantRulesShapeError formats %s',
    (expected, message) => {
      const error = new BundledSubclassGrantRulesShapeError(expected);
      expect(error.message).toBe(message);
      expect(error.name).toBe('BundledSubclassGrantRulesShapeError');
      expect(error.expected).toBe(expected);
      expect(error).toBeInstanceOf(TypeError);
    },
  );

  it('BundledSubclassPersistenceError formats the content key', () => {
    const error = new BundledSubclassPersistenceError(
      '2024:subclass:life-domain',
    );
    expect(error.message).toBe(
      'Failed to persist bundled subclass 2024:subclass:life-domain.',
    );
    expect(error.name).toBe('BundledSubclassPersistenceError');
    expect(error.content_key).toBe('2024:subclass:life-domain');
  });

  it('SrdSubclassGrantRulesArrayError formats the subclass key', () => {
    const error = new SrdSubclassGrantRulesArrayError(
      '2024:subclass:life-domain',
    );
    expect(error.message).toBe(
      'SRD subclass 2024:subclass:life-domain grant rules are not an array.',
    );
    expect(error.name).toBe('SrdSubclassGrantRulesArrayError');
    expect(error.subclass_content_key).toBe('2024:subclass:life-domain');
    expect(error).toBeInstanceOf(TypeError);
  });

  it('SrdSubclassMissingSpellError formats both content keys', () => {
    const error = new SrdSubclassMissingSpellError(
      '2024:subclass:life-domain',
      '2024:missing-spell',
    );
    expect(error.message).toBe(
      'SRD subclass 2024:subclass:life-domain references missing spell 2024:missing-spell.',
    );
    expect(error.name).toBe('SrdSubclassMissingSpellError');
    expect(error).toMatchObject({
      subclass_content_key: '2024:subclass:life-domain',
      spell_version_key: '2024:missing-spell',
    });
  });
});
