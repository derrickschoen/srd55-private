import type { Ability } from '../../domain/enums';
import type { EffectApplication, EffectPayload } from '../effects';
import type { AreaTemplate } from '../templates';
import type { CombatantId, DamageType, LimitedResourcePoolId } from '../values';

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SpellCastingTime = 'action' | 'bonus_action' | 'reaction' | 'minute' | 'ten_minutes' | 'hour';
export type SpellClassList = 'Bard' | 'Cleric' | 'Druid' | 'Paladin' | 'Ranger' | 'Sorcerer' | 'Warlock' | 'Wizard';

export interface SpellComponentsData {
  readonly verbal: boolean;
  readonly somatic: boolean;
  readonly material: null | {
    readonly text: string;
    readonly consumed: boolean;
  };
}

export interface ScaledDice {
  readonly baseCount: number;
  readonly sides: number;
  readonly modifier: number;
  readonly perSlotCount: number;
  readonly perSlotModifier: number;
  readonly cantripUpgrade: boolean;
}

export type SpellTargeting =
  | { readonly kind: 'self' }
  | {
      readonly kind: 'single';
      readonly rangeFeet: number;
      readonly willing: boolean;
      readonly allowDead?: true;
      readonly rangeByCasterLevel?: readonly {
        readonly minimumLevel: number;
        readonly rangeFeet: number;
      }[];
    }
  | {
      readonly kind: 'multiple';
      readonly rangeFeet: number;
      readonly baseMaximum: number;
      readonly additionalPerSlot: number;
      readonly willing?: boolean;
    }
  | {
      readonly kind: 'area';
      readonly rangeFeet: number;
      readonly shape: AreaTemplate['shape'];
      readonly baseSizeFeet: number;
      readonly sizePerSlotFeet: number;
      readonly secondarySizeFeet?: number;
      readonly surface?: 'ground_square';
    }
  | {
      readonly kind: 'area_selected';
      readonly rangeFeet: number;
      readonly shape: AreaTemplate['shape'];
      readonly baseSizeFeet: number;
      readonly sizePerSlotFeet: number;
      readonly secondarySizeFeet?: number;
      readonly baseMaximum: number;
      readonly additionalPerSlot: number;
    }
  | { readonly kind: 'all_in_range'; readonly rangeFeet: number }
  | { readonly kind: 'remote'; readonly range: 'unlimited' }
  | {
      readonly kind: 'utility';
      readonly rangeFeet: number;
    };

export interface EffectData {
  readonly payload: EffectPayload;
  readonly target: 'self' | 'targets';
  readonly concentration: boolean;
  readonly durationRounds: number | null;
  readonly expiresAt: 'source_start' | 'source_end' | 'target_start' | 'target_end';
  readonly stacking?: EffectApplication['stacking'];
  readonly repeatedSave?: {
    readonly ability: Ability;
    readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
    readonly timing: 'target_start' | 'target_end';
  };
  readonly durationRoundsPerSlot?: number;
  readonly slotDurationTiers?: readonly {
    readonly minimumSlot: number;
    readonly durationRounds: number | null;
    readonly concentration: boolean;
  }[];
}

export type SpellOperation =
  | {
      readonly kind: 'attack_damage';
      readonly attackKind: 'melee' | 'ranged';
      readonly damageType: DamageType | readonly DamageType[];
      readonly dice: ScaledDice;
      readonly rider: EffectData | null;
    }
  | {
      readonly kind: 'attack_then_save_damage';
      readonly attackKind: 'ranged';
      readonly attackDamageType: DamageType;
      readonly attackDice: ScaledDice;
      readonly saveAbility: Ability;
      readonly saveDamageType: DamageType;
      readonly saveDice: ScaledDice;
      readonly onSaveSuccess: 'none' | 'half';
      readonly burstShape: 'sphere';
      readonly burstRadiusFeet: number;
    }
  | {
      readonly kind: 'attack_damage_over_time';
      readonly attackKind: 'ranged';
      readonly damageType: DamageType;
      readonly initialDice: ScaledDice;
      readonly missDamage: 'half_initial';
      readonly laterDice: ScaledDice;
      readonly laterTiming: 'target_end';
    }
  | {
      readonly kind: 'hit_point_maximum_increase';
      readonly baseAmount: number;
      readonly additionalPerSlot: number;
    }
  | {
      readonly kind: 'save_damage';
      readonly ability: Ability;
      readonly onSuccess: 'none' | 'half';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly riderOnFailure: EffectData | null;
      readonly pushFeetOnFailure: number;
    }
  | {
      readonly kind: 'save_multi_damage';
      readonly ability: Ability;
      readonly onSuccess: 'none' | 'half';
      readonly terms: readonly { readonly damageType: DamageType; readonly dice: ScaledDice }[];
      readonly effect: EffectData | null;
    }
  | {
      readonly kind: 'save_damage_over_time';
      readonly ability: Ability;
      readonly onSuccess: 'half_initial';
      readonly damageType: DamageType;
      readonly initialDice: ScaledDice;
      readonly laterDice: ScaledDice;
      readonly laterTiming: 'target_end';
    }
  | {
      readonly kind: 'save_damage_and_effect';
      readonly ability: Ability;
      readonly onSuccess: 'none' | 'half';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'healing';
      readonly dice: ScaledDice;
      readonly addSpellcastingModifier: boolean;
    }
  | {
      readonly kind: 'fixed_healing';
      readonly baseAmount: number;
      readonly additionalPerSlot: number;
      readonly removesConditions: readonly ('Blinded' | 'Deafened' | 'Poisoned')[];
    }
  | {
      readonly kind: 'temporary_hit_points';
      readonly dice: ScaledDice;
    }
  | {
      readonly kind: 'effect';
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'save_effect';
      readonly ability: Ability;
      readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
      readonly effect: EffectData;
      readonly excludeCaster?: true;
      readonly willingTargetSkipsSave?: true;
    }
  | {
      readonly kind: 'save_push';
      readonly ability: Ability;
      readonly pushFeetOnFailure: number;
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'remove_condition';
      readonly conditions: readonly ('Blinded' | 'Deafened' | 'Paralyzed' | 'Poisoned')[];
    }
  | {
      readonly kind: 'remove_condition_and_effect';
      readonly condition: 'Poisoned';
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'save_branch_effect';
      readonly ability: Ability;
      readonly successEffect: EffectData;
      readonly failureEffect: EffectData;
    }
  | {
      readonly kind: 'attack_rays';
      readonly baseRays: number;
      readonly additionalPerSlot: number;
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
    }
  | {
      readonly kind: 'attack_beams';
      readonly attackKind: 'ranged';
      readonly baseBeams: number;
      readonly additionalBeamLevels: readonly number[];
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
    }
  | {
      readonly kind: 'summoned_weapon_attack';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly addSpellcastingModifier: true;
      readonly attackReachFeet: number;
      readonly moveFeetPerBonusAction: number;
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'reaction_save_cancel';
      readonly ability: Ability;
      readonly trigger?: 'visible_creature_casts_spell_with_components';
    }
  | {
      readonly kind: 'dispel_magic';
      readonly baseAutomaticLevel: number;
      readonly checkDcBase: number;
    }
  | {
      readonly kind: 'revive';
      readonly hitPoints: number;
      readonly maximumDeathAgeRounds: number;
    }
  | { readonly kind: 'remove_curse' }
  | {
      readonly kind: 'lifedrain_attack';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly healingDivisor: number;
      readonly effect: EffectData;
    }
  | {
      readonly kind: 'magic_missiles';
      readonly baseDarts: number;
      readonly additionalPerSlot: number;
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
    }
  | { readonly kind: 'stabilize' }
  | {
      readonly kind: 'weapon_attack_augmentation';
    } & (
      | {
          readonly timing: 'during_cast';
          readonly attackAbility: 'spellcasting';
          readonly damageAbility: 'spellcasting';
          readonly damageTypeChoice: 'weapon_or_radiant';
          readonly extraDamage: {
            readonly type: DamageType;
            readonly dice: ScaledDice;
          };
        }
      | {
          readonly timing: 'subsequent_weapon_hits';
          readonly extraDamage: null | {
            readonly type: DamageType;
            readonly dice: ScaledDice;
          };
          readonly consumeOnHit: boolean;
          readonly concentration: boolean;
          readonly durationRounds: number;
          readonly followUp: null | (
            | {
                readonly kind: 'ongoing_damage_save_ends';
                readonly damageType: DamageType;
                readonly dice: ScaledDice;
                readonly saveAbility: Ability;
                readonly timing: 'target_start';
                readonly durationRounds: number;
              }
            | {
                readonly kind: 'save_then_restrain';
                readonly saveAbility: Ability;
                readonly rollMode: 'normal';
                readonly damageType: DamageType;
                readonly dice: ScaledDice;
                readonly timing: 'target_start';
                readonly durationRounds: number;
              }
          );
        }
    )
  | {
      readonly kind: 'utility';
      readonly effect: Extract<EffectPayload, {
        readonly kind:
          | 'light_source'
          | 'conjured_hand'
          | 'communication_link'
          | 'illusion'
          | 'minor_magic'
          | 'object_repair'
          | 'alarm_ward'
          | 'language_comprehension'
          | 'environmental_water'
          | 'detection_sense'
          | 'appearance_illusion'
          | 'summoned_familiar'
          | 'floating_disk'
          | 'obscured_area'
          | 'magic_identification'
          | 'illusory_script'
          | 'food_purification'
          | 'image_illusion'
          | 'unseen_servant'
          | 'form_alteration'
          | 'arcane_lock'
          | 'magic_aura'
          | 'augury'
          | 'detect_thoughts'
          | 'trap_detection'
          | 'flaming_sphere'
          | 'corpse_preservation'
          | 'object_location'
          | 'magic_mouth'
          | 'object_unlock'
          | 'teleport'
          | 'rope_trick'
          | 'silence_area'
          | 'summoned_undead'
          | 'clairvoyance_sensor'
          | 'created_food_and_water'
          | 'daylight_area'
          | 'glyph_of_warding'
          | 'magic_circle'
          | 'major_image'
          | 'meld_into_stone'
          | 'phantom_steed'
          | 'sending'
          | 'sleet_storm_area'
          | 'speak_with_dead'
          | 'spirit_guardians_area'
          | 'stinking_cloud_area'
          | 'tiny_hut'
          | 'arcane_eye'
          | 'control_water'
          | 'dimension_door'
          | 'divination'
          | 'fabricate'
          | 'faithful_hound'
          | 'guardian_of_faith'
          | 'hallucinatory_terrain'
          | 'private_sanctum'
          | 'secret_chest'
          | 'stone_shape';
      }>;
      readonly concentration: boolean;
      readonly durationRounds: number | null;
      readonly durationRoundsPerSlot?: number;
      readonly becomesPermanentAtSlot?: number;
      readonly losesConcentrationAtSlot?: number;
      /** Instantaneous creations that remain encounter state use a permanent effect. */
      readonly stateful?: true;
    };

export interface SpellDefinition {
  readonly id: string;
  readonly name: string;
  readonly level: SpellLevel;
  readonly source: string;
  readonly castingTime: SpellCastingTime;
  readonly ritual?: true;
  readonly components: SpellComponentsData;
  readonly targeting: SpellTargeting;
  readonly operation: SpellOperation;
}

export interface SpellCastCommand {
  readonly type: 'cast_spell';
  readonly actor: CombatantId;
  readonly spellId: string;
  readonly slotLevel: number | null;
  readonly castAsRitual: boolean;
  readonly casterLevel: number;
  readonly attackBonus: number;
  readonly saveDc: number;
  readonly spellcastingModifier: number;
  readonly targets: readonly CombatantId[];
  readonly area: AreaTemplate | null;
  readonly weaponAttack: null | {
    readonly attackBonus: number;
    readonly damageType: DamageType;
    readonly damageCount: number;
    readonly damageSides: number;
    readonly damageModifier: number;
  };
  readonly selectedOption: string | null;
  /** A declared class/feat pool can replace slot spending for this cast. */
  readonly resourcePoolId?: LimitedResourcePoolId;
}
