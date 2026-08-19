import type { Ability } from '../domain/enums';
import type { ConditionName, ExhaustionLevel } from './conditions';
import type { DamageRequest, RollMode } from './resolution';
import type { AreaTemplate } from './templates';
import type {
  CombatantId,
  EffectStackingIdentity,
  EncounterEffectId,
} from './values';

export type TurnBoundary = 'start' | 'end';

export interface SourcedTurnBoundary {
  readonly combatant: CombatantId;
  readonly boundary: TurnBoundary;
  /** Bundled-SRD locator or a named product ruling; never an implicit default. */
  readonly source: string;
}

export type EffectDurationClock =
  | { readonly kind: 'permanent' }
  | {
      readonly kind: 'turn_boundaries';
      readonly timing: SourcedTurnBoundary;
      readonly remaining: number;
    };

export interface RepeatedSaveTiming {
  readonly timing: SourcedTurnBoundary;
  readonly ability: Ability;
  readonly dc: number;
  readonly rollMode: RollMode;
  readonly onSuccess: 'remove_target';
}

export type EffectPayload =
  | {
      readonly kind: 'condition';
      readonly condition: Exclude<ConditionName, 'Exhaustion'>;
    }
  | {
      readonly kind: 'exhaustion';
      readonly level: ExhaustionLevel;
    }
  | {
      readonly kind: 'ongoing_damage';
      readonly damage: DamageRequest;
      readonly timing: SourcedTurnBoundary;
    }
  | {
      readonly kind: 'armor_class_modifier';
      readonly amount: number;
    }
  | {
      readonly kind: 'attack_roll_modifier' | 'saving_throw_modifier' | 'ability_check_modifier';
      readonly count: number;
      readonly sides: number;
      readonly sign: 1 | -1;
      readonly skill?: string;
    }
  | {
      readonly kind: 'd20_test_modifier';
      readonly tests: readonly ('attack_roll' | 'saving_throw')[];
      readonly count: number;
      readonly sides: number;
      readonly sign: 1 | -1;
    }
  | {
      readonly kind: 'movement_modifier';
      readonly speedDeltaFeet: number;
    }
  | {
      readonly kind: 'damage_rider';
      readonly damage: DamageRequest;
      readonly appliesTo: 'next_attack_against_target' | 'weapon_attack_by_target';
    }
  | {
      readonly kind: 'cannot_regain_hit_points' | 'opportunity_attacks_disabled';
    }
  | {
      readonly kind: 'damage_reduction';
      readonly damageType: string;
      readonly count: number;
      readonly sides: number;
      readonly oncePerTurn: boolean;
    }
  | {
      readonly kind: 'light_source';
      readonly brightFeet: number;
      readonly dimFeet: number;
      readonly maximumLights: number;
      readonly moveFeetPerBonusAction: number;
    }
  | {
      readonly kind: 'conjured_hand';
      readonly maximumDistanceFeet: number;
      readonly moveFeetPerAction: number;
      readonly carryPounds: number;
    }
  | {
      readonly kind: 'communication_link';
      readonly rangeFeet: number;
      readonly permitsReply: boolean;
      readonly blockedByMagicalSilence: boolean;
    }
  | {
      readonly kind: 'illusion';
      readonly modes: readonly ('sound' | 'image')[];
      readonly maximumCubeFeet: number;
    }
  | {
      readonly kind: 'condition_bundle';
      readonly conditions: readonly Exclude<ConditionName, 'Exhaustion'>[];
    }
  | {
      readonly kind: 'alarm_ward';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly maximumCubeFeet: number;
      readonly audibleRangeFeet: number;
      readonly mentalRangeFeet: number;
    }
  | {
      readonly kind: 'commanded_action';
      readonly options: readonly ('approach' | 'drop' | 'flee' | 'grovel' | 'halt')[];
    }
  | {
      readonly kind: 'language_comprehension';
      readonly secondsPerPage: number;
      readonly decodesSecretMessages: false;
    }
  | {
      readonly kind: 'environmental_water';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly gallons: number;
      readonly gallonsPerSlot: number;
      readonly cubeFeet: number;
      readonly cubeFeetPerSlot: number;
    }
  | {
      readonly kind: 'detection_sense';
      readonly detects: 'creature_types_and_hallow' | 'magic' | 'poison_and_disease';
      readonly radiusFeet: number;
    }
  | {
      readonly kind: 'appearance_illusion';
      readonly maximumHeightChangeFeet: number;
      readonly investigationAgainstSpellDc: true;
    }
  | {
      readonly kind: 'bonus_action_dash';
      readonly immediateDash: true;
    }
  | {
      readonly kind: 'falling_protection';
      readonly descentFeetPerRound: number;
      readonly preventsLandingDamage: true;
    }
  | {
      readonly kind: 'summoned_familiar';
      readonly forms: readonly string[];
      readonly telepathyFeet: number;
    }
  | {
      readonly kind: 'floating_disk';
      readonly diameterFeet: number;
      readonly heightFeet: number;
      readonly capacityPounds: number;
      readonly followDistanceFeet: number;
      readonly maximumDistanceFeet: number;
    }
  | {
      readonly kind: 'obscured_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly obscurement: 'heavy';
      readonly dispersedByStrongWind: true;
    }
  | {
      readonly kind: 'magic_identification';
      readonly identifiesPropertiesChargesAndSpells: true;
    }
  | {
      readonly kind: 'illusory_script';
      readonly truesightReadsHiddenMessage: true;
    }
  | {
      readonly kind: 'jump_movement';
      readonly jumpFeet: number;
      readonly movementCostFeet: number;
      readonly usesPerTurn: 1;
    }
  | {
      readonly kind: 'base_armor_class';
      readonly base: number;
      readonly addsDexterityModifier: true;
      readonly requiresUnarmored: true;
    }
  | {
      readonly kind: 'food_purification';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly removesPoisonAndRot: true;
    }
  | {
      readonly kind: 'image_illusion';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly maximumCubeFeet: number;
      readonly movableByMagicAction: true;
      readonly investigationAgainstSpellDc: true;
    }
  | {
      readonly kind: 'sleep_sequence';
      readonly initial: 'Incapacitated';
      readonly failedRepeat: 'Unconscious';
    }
  | {
      readonly kind: 'unseen_servant';
      readonly armorClass: number;
      readonly hitPoints: number;
      readonly strength: number;
      readonly moveFeetPerBonusAction: number;
      readonly maximumDistanceFeet: number;
    }
  | {
      readonly kind: 'minor_magic';
      readonly spell: 'Elementalism' | 'Prestidigitation' | 'Thaumaturgy';
      readonly options: readonly string[];
      readonly maximumActive: number;
    }
  | {
      readonly kind: 'object_repair';
      readonly maximumBreakFeet: number;
      readonly restoresMagic: false;
    }
  | {
      readonly kind: 'attack_roll_mode_modifier';
      readonly mode: 'advantage' | 'disadvantage';
      readonly appliesTo: 'next_attack_against_target';
    }
  | {
      readonly kind: 'creature_type_protection';
      readonly creatureTypes: readonly string[];
    }
  | {
      readonly kind: 'sanctuary';
      readonly saveAbility: Ability;
    }
  | {
      readonly kind: 'magic_missile_immunity';
    }
  | {
      readonly kind: 'shield_defense';
      readonly armorClassBonus: number;
      readonly magicMissileImmune: true;
    };

export interface EffectApplication {
  readonly targets: readonly CombatantId[];
  readonly duration: EffectDurationClock;
  readonly concentration: boolean;
  readonly stackingIdentity: EffectStackingIdentity;
  readonly stacking: 'coexist' | 'replace_same_source' | 'replace_any_source';
  readonly repeatedSave: RepeatedSaveTiming | null;
  readonly payload: EffectPayload;
}

/** Read-only state; creation, ticking, target removal, and expiry live in the reducer. */
export interface EncounterEffect {
  readonly id: EncounterEffectId;
  readonly source: CombatantId;
  readonly targets: readonly CombatantId[];
  readonly createdRevision: number;
  readonly duration: EffectDurationClock;
  readonly concentrationOwner: CombatantId | null;
  readonly stackingIdentity: EffectStackingIdentity;
  readonly stacking: EffectApplication['stacking'];
  readonly repeatedSave: RepeatedSaveTiming | null;
  readonly payload: EffectPayload;
}
