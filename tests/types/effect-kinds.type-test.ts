import type {
  CharacterEffectKind,
  ClassFeatureEffectKind,
  EffectKind,
  FeatureTemplateEffectKind,
} from '../../src/domain/enums';
import type { DamageType } from '../../src/domain/enums';
import type { EquipmentEffectInput } from '../../src/domain/equipment-effects';
import type {
  EffectKindName,
  EffectOfScope,
  EffectPayloadByKind,
} from '../../src/domain/effect-kinds';

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
      (<T>() => T extends Left ? 1 : 2)
        ? true
        : false
    : false;

type Assert<Condition extends true> = Condition;

type ContributionKinds =
  | 'damage_resistance'
  | 'hp_modifier'
  | 'speed'
  | 'ability_increase';

type CharacterKinds =
  | ContributionKinds
  | 'ability_override'
  | 'armor_class_bonus'
  | 'armor_class_formula'
  | 'attack_ability_override'
  | 'weapon_attack_bonus'
  | 'weapon_damage_bonus';

type FeatureTemplateKinds =
  | Exclude<CharacterKinds, 'ability_override'>
  | 'extra_attack';

type AllKinds = CharacterKinds | 'extra_attack';

type EffectKindPin = Assert<Equal<EffectKind, ContributionKinds>>;
type CharacterEffectKindPin = Assert<Equal<CharacterEffectKind, CharacterKinds>>;
type ClassFeatureEffectKindPin = Assert<Equal<ClassFeatureEffectKind, 'extra_attack'>>;
type FeatureTemplateEffectKindPin = Assert<
  Equal<FeatureTemplateEffectKind, FeatureTemplateKinds>
>;
type PayloadKeyPin = Assert<Equal<EffectKindName, AllKinds>>;

type ContributionScopePin = Assert<
  Equal<EffectOfScope<'contribution'>, ContributionKinds>
>;
type CharacterScopePin = Assert<
  Equal<EffectOfScope<'character'>, CharacterKinds>
>;
type ClassFeatureScopePin = Assert<
  Equal<EffectOfScope<'class_feature'>, 'extra_attack'>
>;
type FeatureTemplateScopePin = Assert<
  Equal<EffectOfScope<'feature_template'>, FeatureTemplateKinds>
>;

type AuthoredResistanceTypePin = Assert<
  Equal<
    EffectPayloadByKind<'authored'>['damage_resistance']['damage_type'],
    DamageType
  >
>;
type EquipmentResistanceTypePin = Assert<
  Equal<
    EffectPayloadByKind<'equipment'>['damage_resistance']['damage_type'],
    DamageType | null
  >
>;
type DerivedEquipmentResistanceTypePin = Assert<
  Equal<
    Extract<
      EquipmentEffectInput,
      { readonly effect_kind: 'damage_resistance' }
    >['damage_type'],
    DamageType | null
  >
>;

export type EffectKindContractPins =
  | EffectKindPin
  | CharacterEffectKindPin
  | ClassFeatureEffectKindPin
  | FeatureTemplateEffectKindPin
  | PayloadKeyPin
  | ContributionScopePin
  | CharacterScopePin
  | ClassFeatureScopePin
  | FeatureTemplateScopePin
  | AuthoredResistanceTypePin
  | EquipmentResistanceTypePin
  | DerivedEquipmentResistanceTypePin;
