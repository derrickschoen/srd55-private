import { describe, expect, it } from 'vitest';
import {
  characterEffectKinds as enumCharacterEffectKinds,
  classFeatureEffectKinds as enumClassFeatureEffectKinds,
  effectKinds as enumEffectKinds,
  featureTemplateEffectKinds as enumFeatureTemplateEffectKinds,
} from '../../../src/domain/enums';
import {
  EFFECT_KIND_SCOPES,
  characterEffectKinds,
  classFeatureEffectKinds,
  effectKinds,
  featureTemplateEffectKinds,
} from '../../../src/domain/effect-kinds';

describe('effect kind scopes', () => {
  it('derives the four runtime vocabularies with their exact stable members', () => {
    expect(effectKinds).toEqual([
      'damage_resistance',
      'hp_modifier',
      'speed',
      'ability_increase',
    ]);
    expect(characterEffectKinds).toEqual([
      'damage_resistance',
      'hp_modifier',
      'speed',
      'ability_increase',
      'ability_override',
      'armor_class_bonus',
      'armor_class_formula',
      'attack_ability_override',
      'weapon_attack_bonus',
      'weapon_damage_bonus',
    ]);
    expect(classFeatureEffectKinds).toEqual(['extra_attack']);
    expect(featureTemplateEffectKinds).toEqual([
      'damage_resistance',
      'hp_modifier',
      'speed',
      'ability_increase',
      'armor_class_bonus',
      'armor_class_formula',
      'attack_ability_override',
      'weapon_attack_bonus',
      'weapon_damage_bonus',
      'extra_attack',
    ]);
    expect(Object.keys(EFFECT_KIND_SCOPES)).toEqual([
      ...characterEffectKinds,
      'extra_attack',
    ]);
  });

  it('keeps enums.ts as a re-export of the canonical derived arrays', () => {
    expect(enumEffectKinds).toBe(effectKinds);
    expect(enumCharacterEffectKinds).toBe(characterEffectKinds);
    expect(enumClassFeatureEffectKinds).toBe(classFeatureEffectKinds);
    expect(enumFeatureTemplateEffectKinds).toBe(featureTemplateEffectKinds);
  });
});
