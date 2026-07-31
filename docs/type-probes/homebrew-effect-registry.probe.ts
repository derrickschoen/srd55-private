/**
 * Negative compile probes for HA-EFFECT-EXHAUSTIVE's compile-time half.
 * Removing a live member or adding an unmapped synthetic member must fail.
 */
import {
  CHARACTER_EFFECT_FORM,
  FEATURE_ONLY_EFFECT_FORM,
  type CharacterEffectFormRegistry,
  type EffectFormDefinition,
  type FeatureOnlyEffectFormRegistry,
} from '../../src/authoring/effect-forms';
import type { CharacterEffectKind } from '../../src/domain/enums';

const {
  damage_resistance: removedCharacterMember,
  ...characterRegistryMissingMember
} = CHARACTER_EFFECT_FORM;
export const missingCharacterMember: CharacterEffectFormRegistry =
  characterRegistryMissingMember;

const {
  extra_attack: removedFeatureMember,
  ...featureRegistryMissingMember
} = FEATURE_ONLY_EFFECT_FORM;
export const missingFeatureMember: FeatureOnlyEffectFormRegistry =
  featureRegistryMissingMember;

export const syntheticMember: Readonly<
  Record<
    CharacterEffectKind | 'synthetic_effect',
    EffectFormDefinition
  >
> = CHARACTER_EFFECT_FORM;
