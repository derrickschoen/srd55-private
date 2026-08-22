import type { Ability } from '../../domain/enums';
import type { DamageOperationPacket, DamageOperationSpec, OperationDice } from '../damage-operations';
import type { EffectApplication, EffectPayload } from '../effects';
import type {
  PersistentAreaAppliedPayload,
  PersistentAreaEffectLifetime,
  PersistentAreaHook,
  PersistentAreaShape,
} from '../persistent-areas';
import type { AreaTemplate } from '../templates';
import type { DamageRequest } from '../resolution';
import type { CombatantId, DamageType, LimitedResourcePoolId, WorldObjectId } from '../values';
import type { GridCell } from '../grid';
import type { LightLevel, WorldObjectChanges, WorldObjectInput } from '../world-objects';

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

export interface ScaledDice extends OperationDice {}

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

export type SpellPersistentAreaEffectSpec =
  | {
      readonly kind: 'automatic';
      readonly payload:
        | { readonly kind: 'damage'; readonly damageType: DamageType; readonly dice: ScaledDice }
        | { readonly kind: 'effect'; readonly payload: PersistentAreaAppliedPayload; readonly lifetime: PersistentAreaEffectLifetime };
    }
  | {
      readonly kind: 'save_gated';
      readonly ability: Ability;
      readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
      readonly onSuccess: 'none' | 'half';
      readonly payload:
        | { readonly kind: 'damage'; readonly damageType: DamageType; readonly dice: ScaledDice }
        | { readonly kind: 'effect'; readonly payload: PersistentAreaAppliedPayload; readonly lifetime: PersistentAreaEffectLifetime };
    };

export type SpellOperation =
  | ({ readonly kind: 'damage_operation' } & DamageOperationSpec)
  | {
      readonly kind: 'armed_weapon_hit_rider';
      readonly damage: DamageOperationPacket | null;
      readonly durationRounds: number;
      readonly concentration: boolean;
      readonly persistence: 'consume_on_hit' | 'duration';
      readonly saveGatedRider: null | {
        readonly ability: Ability;
        readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
        readonly condition: Exclude<import('../conditions').ConditionName, 'Exhaustion'>;
        readonly durationRounds: number;
        readonly expiresAt: 'target_start' | 'target_end';
      };
    }
  | {
      readonly kind: 'persistent_area';
      readonly origin: 'selected_when_cast' | 'anchored_to_caster';
      /** Required for anchored areas; selected areas take their exact cast template. */
      readonly shape: PersistentAreaShape | null;
      readonly durationRounds: number;
      readonly concentration: boolean;
      readonly targetFilter: 'all' | 'allies' | 'enemies' | 'selected';
      readonly includeOwner: boolean;
      readonly difficultTerrain: boolean;
      readonly movableFeet: number | null;
      readonly hooks: readonly {
        readonly hook: PersistentAreaHook;
        readonly frequency: 'once_per_turn' | 'every_trigger';
        readonly effect: SpellPersistentAreaEffectSpec;
      }[];
      readonly initialEffects: readonly {
        readonly excludeOwner: boolean;
        readonly effect: SpellPersistentAreaEffectSpec;
      }[];
    }
  | {
      readonly kind: 'world_operations';
      readonly operations: readonly (
        | {
            readonly kind: 'create_object';
            readonly placement: 'caster_cell' | 'area_origin';
            readonly footprintOffsets: readonly { readonly column: number; readonly row: number }[];
            readonly object: Omit<WorldObjectInput, 'id' | 'position' | 'footprint'>;
          }
        | {
            readonly kind: 'transform_terrain';
            readonly regionId: string;
            readonly difficultTerrain: boolean;
          }
        | {
            readonly kind: 'set_light_level';
            readonly regionId: string;
            readonly level: LightLevel;
          }
        | {
            readonly kind: 'remove_objects';
            readonly reason: 'destroyed' | 'dismissed';
          }
        | {
            readonly kind: 'modify_objects';
            readonly changes: WorldObjectChanges;
          }
        | {
            readonly kind: 'damage_objects';
            readonly damage: DamageRequest;
          }
      )[];
    }
  | {
      readonly kind: 'teleport';
      readonly subject: 'caster' | 'targets';
      readonly maximumDistanceFeet: number;
      readonly destination: {
        readonly requireUnoccupied: true;
        readonly requireOccupiable: true;
        readonly requireLineOfSight: boolean;
      };
    }
  | {
      readonly kind: 'forced_movement';
      readonly direction: 'away' | 'toward';
      readonly origin: 'caster' | 'selected_point';
      readonly distanceFeet: number;
      readonly save: null | {
        readonly ability: Ability;
        readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
        readonly moveOn: 'failure';
      };
    }
  | {
      readonly kind: 'movement_mode';
      readonly grants: readonly {
        readonly mode: 'flying' | 'climbing' | 'swimming';
        readonly speed: { readonly kind: 'fixed'; readonly feet: number } | { readonly kind: 'walking_speed' };
      }[];
      readonly difficultTerrainImmunity: boolean;
      readonly magicalSpeedReductionImmunity: boolean;
      readonly durationRounds: number;
      readonly concentration: boolean;
      readonly expiresAt: 'source_start' | 'source_end' | 'target_start' | 'target_end';
    }
  | {
      readonly kind: 'movement_region';
      readonly region: { readonly id: string; readonly cells: readonly GridCell[] };
      readonly difficultTerrain: boolean;
      readonly entry: 'allowed' | 'blocked';
      readonly damage: null | {
        readonly damageType: DamageType;
        readonly dice: { readonly count: number; readonly sides: 4 | 6 | 8 | 10 | 12 | 20; readonly modifier: number };
        readonly unitFeet: 5;
        readonly partialUnit: 'completed_units_only';
      };
    }
  | {
      readonly kind: 'speed_modification';
      readonly modification:
        | { readonly kind: 'set'; readonly speedFeet: number }
        | { readonly kind: 'increase'; readonly feet: number }
        | { readonly kind: 'reduce'; readonly reduction: { readonly kind: 'feet'; readonly feet: number } | { readonly kind: 'multiplier'; readonly multiplier: number } };
      readonly durationRounds: number;
      readonly concentration: boolean;
      readonly expiresAt: 'source_start' | 'source_end' | 'target_start' | 'target_end';
    }
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

/** Runtime inventory for serializers of the closed operation union above. */
export const SPELL_OPERATION_KINDS = [
  'damage_operation',
  'armed_weapon_hit_rider',
  'persistent_area',
  'world_operations',
  'teleport',
  'forced_movement',
  'movement_mode',
  'movement_region',
  'speed_modification',
  'attack_damage',
  'attack_then_save_damage',
  'attack_damage_over_time',
  'hit_point_maximum_increase',
  'save_damage',
  'save_multi_damage',
  'save_damage_over_time',
  'save_damage_and_effect',
  'healing',
  'fixed_healing',
  'temporary_hit_points',
  'effect',
  'save_effect',
  'save_push',
  'remove_condition',
  'remove_condition_and_effect',
  'save_branch_effect',
  'attack_rays',
  'attack_beams',
  'summoned_weapon_attack',
  'reaction_save_cancel',
  'dispel_magic',
  'revive',
  'remove_curse',
  'lifedrain_attack',
  'magic_missiles',
  'stabilize',
  'weapon_attack_augmentation',
  'utility',
] as const satisfies readonly SpellOperation['kind'][];

type MissingSpellOperationKind = Exclude<
  SpellOperation['kind'],
  (typeof SPELL_OPERATION_KINDS)[number]
>;
const spellOperationKindInventoryIsComplete: MissingSpellOperationKind extends never
  ? true
  : never = true;
void spellOperationKindInventoryIsComplete;

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
  /** Chosen destination for teleportation, or selected origin for forced movement. */
  readonly spatialPoint?: GridCell;
  readonly weaponAttack: null | {
    readonly attackBonus: number;
    readonly damageType: DamageType;
    readonly damageCount: number;
    readonly damageSides: number;
    readonly damageModifier: number;
  };
  readonly selectedOption: string | null;
  readonly objectTargets?: readonly WorldObjectId[];
  /** A declared class/feat pool can replace slot spending for this cast. */
  readonly resourcePoolId?: LimitedResourcePoolId;
}
