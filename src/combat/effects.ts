import type { Ability } from '../domain/enums';
import type { DamageOperationDelivery, DamageOperationSpec, ThresholdDamageRider } from './damage-operations';
import type { ConditionName, ExhaustionLevel } from './conditions';
import type { DamageRequest, RollMode } from './resolution';
import type { AreaTemplate } from './templates';
import type { PersistentAreaInput } from './persistent-areas';
import type {
  CombatantId,
  DamageType,
  DieSides,
  EffectStackingIdentity,
  EncounterEffectId,
  LimitedResourcePoolId,
  PersistentAreaId,
} from './values';

export const featureEffectTriggers = [
  'always_on',
  'action',
  'bonus_action',
  'reaction',
  'on_hit',
  'on_crit',
  'on_save_fail',
] as const;

export type FeatureEffectTrigger = (typeof featureEffectTriggers)[number];

export const damageRiderGates = [
  'advantage_on_attack',
  'ally_adjacent_to_target',
  'first_hit_this_turn',
  'crit_confirmed',
  'slot_spent',
] as const;

export type DamageRiderGate = (typeof damageRiderGates)[number];

export type DamageRiderGating =
  | { readonly kind: 'unconditional' }
  | {
      readonly kind: 'once_per_turn';
      readonly oncePerTurnGate: Extract<DamageRiderGate, 'first_hit_this_turn'>;
      readonly qualifyingGates: readonly Extract<
        DamageRiderGate,
        'advantage_on_attack' | 'ally_adjacent_to_target'
      >[];
    }
  | {
      readonly kind: 'slot_spend';
      readonly spendGate: Extract<DamageRiderGate, 'slot_spent'>;
      readonly criticalGate: Extract<DamageRiderGate, 'crit_confirmed'>;
      readonly baseCount: number;
      readonly countPerSlotLevel: number;
    }
  | {
      readonly kind: 'first_hit_this_turn';
      readonly gate: Extract<DamageRiderGate, 'first_hit_this_turn'>;
    };

/** Always-on party-pack effects that rewrite one declared attack in place. */
export type AttackFormSubstitutionPayload =
  | {
      readonly kind: 'attack_ability_substitution';
      readonly attackId: string;
      readonly damageTermIndex: number;
      readonly replacesAbility: Ability;
      readonly spellcastingAbility: Ability;
    }
  | {
      readonly kind: 'attack_damage_die_override';
      readonly attackId: string;
      readonly damageTermIndex: number;
      readonly levels: readonly {
        readonly minimumLevel: number;
        readonly count: number;
        readonly sides: 4 | 6 | 8 | 10 | 12 | 20;
      }[];
    }
  | {
      readonly kind: 'attack_reach_range_override';
      readonly attackId: string;
      readonly reachFeet?: number;
      readonly rangeFeet?: number;
    }
  | {
      readonly kind: 'attack_damage_type_choice';
      readonly attackId: string;
      readonly damageTermIndex: number;
      readonly options: readonly DamageType[];
    };

/** A first-attack choice whose two Advantage clocks are materialized by the reducer. */
export interface RecklessAttackPayload {
  readonly kind: 'reckless_attack_mode';
  readonly strengthBasedMeleeAttackIds: readonly string[];
}

/** Feature-only mechanics interpreted directly by attack/spell action reducers. */
export type TypedCombatFeaturePayload =
  | ({
      readonly kind: 'damage_operation';
      readonly saveDc: number;
    } & DamageOperationSpec)
  | {
      readonly kind: 'save_gated_banishment_on_hit';
      readonly saveAbility: Ability;
      readonly saveDc: number;
      readonly rollMode: Extract<RollMode, 'normal'>;
      readonly returnAt: 'source_next_turn_start';
      readonly returnDamage: DamageRequest;
      readonly returnPlacement: 'previous_or_nearest_unoccupied';
    }
  | {
      readonly kind: 'spell_damage_ability_modifier';
      readonly spellId: string;
      readonly application: 'one_damage_roll_per_turn';
    }
  | {
      readonly kind: 'timed_spellcasting_mode';
      readonly additionalLeveledSpellActions: 1;
      readonly duration: 'this_turn';
    }
  | {
      readonly kind: 'resource_die_maneuver';
      readonly dieSides: DieSides;
      readonly damageType: 'attack_primary';
      readonly condition: Exclude<ConditionName, 'Exhaustion'>;
      readonly conditionDuration: 'until_end_of_target_next_turn';
    }
  | {
      readonly kind: 'exploding_spell_damage_die';
      readonly spellId: string;
      readonly triggerFace: 'maximum';
      /** The bound is part of the mechanic: each original die can add at most one die. */
      readonly maximumExplosionsPerDie: 1;
    }
  | {
      readonly kind: 'elemental_fury';
      readonly attackIds: readonly string[];
      readonly damageTypes: readonly DamageType[];
      readonly selectedDamageType: DamageType;
      readonly amount: number;
      readonly gate: 'first_hit_this_turn';
    }
  | {
      readonly kind: 'persistent_area';
      readonly area: Omit<PersistentAreaInput, 'owner' | 'origin'> & {
        readonly origin: 'self' | 'selected';
      };
    };

/** Reducer-ready class/feat effect retained on a combatant profile. */
export type CombatFeatureEffect = {
  readonly id: EncounterEffectId;
  readonly trigger: FeatureEffectTrigger;
  readonly resourcePoolId: LimitedResourcePoolId | null;
} & (
  | { readonly payload: EffectPayload }
  | { readonly payload: AttackFormSubstitutionPayload }
  | { readonly payload: RecklessAttackPayload }
  | { readonly payload: TypedCombatFeaturePayload }
  | { readonly payload: { readonly kind: 'temporary_hit_points'; readonly amount: number } }
);

export function isAttackFormSubstitutionPayload(
  payload: CombatFeatureEffect['payload'],
): payload is AttackFormSubstitutionPayload {
  return payload.kind === 'attack_ability_substitution' ||
    payload.kind === 'attack_damage_die_override' ||
    payload.kind === 'attack_reach_range_override' ||
    payload.kind === 'attack_damage_type_choice';
}

export function isTypedCombatFeaturePayload(
  payload: CombatFeatureEffect['payload'],
): payload is TypedCombatFeaturePayload {
  return payload.kind === 'damage_operation' ||
    payload.kind === 'save_gated_banishment_on_hit' ||
    payload.kind === 'spell_damage_ability_modifier' ||
    payload.kind === 'timed_spellcasting_mode' ||
    payload.kind === 'resource_die_maneuver' ||
    payload.kind === 'exploding_spell_damage_die' ||
    payload.kind === 'elemental_fury' ||
    payload.kind === 'persistent_area';
}

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

export type WeaponHitRiderFollowUp =
  | {
      readonly kind: 'ongoing_damage_save_ends';
      readonly damage: DamageRequest;
      readonly saveAbility: Ability;
      readonly saveDc: number;
      readonly timing: Extract<TurnBoundary, 'start'>;
      readonly durationRounds: number;
    }
  | {
      readonly kind: 'save_then_restrain';
      readonly saveAbility: Ability;
      readonly saveDc: number;
      readonly rollMode: Extract<RollMode, 'normal'>;
      readonly damage: DamageRequest;
      readonly timing: Extract<TurnBoundary, 'start'>;
      readonly durationRounds: number;
    }
  | {
      readonly kind: 'save_then_condition';
      readonly saveAbility: Ability;
      readonly saveDc: number;
      readonly rollMode: RollMode;
      readonly condition: Exclude<ConditionName, 'Exhaustion'>;
      readonly expiresAt: 'target_start' | 'target_end';
      readonly durationRounds: number;
    };

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
      readonly kind: 'recurring_damage_operation';
      readonly instances: readonly {
        readonly damage: DamageRequest;
        readonly thresholdRider: ThresholdDamageRider | null;
      }[];
      readonly delivery: DamageOperationDelivery;
      readonly saveDc: number;
      readonly timing: SourcedTurnBoundary;
    }
  | {
      readonly kind: 'temporary_banishment';
      readonly returnDamage: DamageRequest;
      readonly returnPlacement: 'previous_or_nearest_unoccupied';
    }
  | {
      readonly kind: 'armor_class_modifier';
      readonly amount: number;
    }
  | {
      readonly kind: 'hit_point_maximum_modifier';
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
      readonly kind: 'skill_modifier';
      readonly skill: 'stealth';
      readonly amount: number;
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
      readonly gating?: DamageRiderGating;
      readonly consumeOnHit?: boolean;
      readonly followUp?: WeaponHitRiderFollowUp;
      /** Present only on a party/content feature which must first be armed. */
      readonly arming?: {
        readonly durationRounds: number;
        readonly concentration: boolean;
      };
    }
  | {
      readonly kind: 'ensnaring_strike';
      readonly condition: 'Restrained';
      readonly damage: DamageRequest;
      readonly timing: Extract<TurnBoundary, 'start'>;
      readonly escapeCheckAbility: Extract<Ability, 'strength'>;
      readonly escapeCheckSkill: 'Athletics';
    }
  | {
      readonly kind: 'bonus_action_attack_grant';
      readonly attackCount: number;
    }
  | {
      readonly kind: 'extra_attack_count_override';
      readonly attackCount: number;
    }
  | {
      readonly kind: 'action_surge';
      readonly perShortRest: true;
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
      readonly thicknessInches: number;
      readonly capacityPounds: number;
      readonly followDistanceFeet: number;
      readonly maximumDistanceFeet: number;
    }
  | {
      readonly kind: 'obscured_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly obscurement: 'heavy' | 'magical_darkness';
      readonly dispersedByStrongWind: boolean;
      readonly blocksDarkvision?: true;
      readonly dispelsLightSpellLevelAtMost?: number;
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
      readonly kind: 'condition_choice';
      readonly conditions: readonly ('Blinded' | 'Deafened')[];
    }
  | {
      readonly kind: 'form_alteration';
      readonly options: readonly ('aquatic_adaptation' | 'change_appearance' | 'natural_weapons')[];
      readonly naturalWeaponCount: number;
      readonly naturalWeaponSides: number;
    }
  | {
      readonly kind: 'arcane_lock';
      readonly passwordRangeFeet: number;
      readonly passwordUnlockRounds: number;
    }
  | {
      readonly kind: 'magic_aura';
      readonly options: readonly ('mask' | 'false_aura')[];
      readonly permanentAfterDailyCastings: number;
    }
  | {
      readonly kind: 'augury';
      readonly forecastMinutes: number;
      readonly noAnswerChancePerExtraCastingPercent: number;
    }
  | {
      readonly kind: 'attacks_against_target_roll_mode';
      readonly mode: 'disadvantage';
      readonly bypassedBy: readonly ('Blindsight' | 'Truesight')[];
    }
  | {
      readonly kind: 'calm_emotions';
      readonly options: readonly ('suppress_charmed_frightened' | 'indifferent')[];
    }
  | {
      readonly kind: 'darkvision';
      readonly rangeFeet: number;
    }
  | {
      readonly kind: 'detect_thoughts';
      readonly radiusFeet: number;
      readonly probeSaveAbility: 'wisdom';
      readonly escapeCheckAbility: 'intelligence';
      readonly escapeCheckSkill: 'Arcana';
    }
  | {
      readonly kind: 'granted_breath';
      readonly damageTypes: readonly string[];
      readonly coneFeet: number;
      readonly saveAbility: 'dexterity';
      readonly onSuccess: 'half';
      readonly dice: { readonly baseCount: number; readonly sides: number; readonly perSlotCount: number };
    }
  | {
      readonly kind: 'ability_check_advantage';
      readonly ability: 'chosen_when_cast';
      readonly excludedAbility?: 'constitution';
    }
  | {
      readonly kind: 'size_alteration';
      readonly options: readonly ('enlarge' | 'reduce')[];
      readonly sizeCategoryDelta: 1;
      readonly damageDieCount: number;
      readonly damageDieSides: number;
    }
  | {
      readonly kind: 'trap_detection';
      readonly rangeFeet: number;
      readonly revealsLocation: false;
    }
  | {
      readonly kind: 'flaming_sphere';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly diameterFeet: number;
      readonly damageCount: number;
      readonly damageSides: number;
      readonly damagePerSlotCount: number;
      readonly moveFeetPerBonusAction: number;
      readonly brightFeet: number;
      readonly dimFeet: number;
    }
  | {
      readonly kind: 'corpse_preservation';
      readonly preventsDecayAndUndeath: true;
    }
  | {
      readonly kind: 'gust_of_wind_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly widthFeet: number;
      readonly movementCostMultiplierTowardSource: 2;
      readonly dispersesGas: true;
      readonly unprotectedFlameExtinguished: true;
    }
  | {
      readonly kind: 'levitation';
      readonly initialRiseFeet: number;
      readonly maximumWeightPounds: number;
      readonly altitudeChangeFeetPerTurn: number;
    }
  | {
      readonly kind: 'object_location';
      readonly radiusFeet: number;
      readonly familiarityDistanceFeet: number;
      readonly blockedByLead: true;
    }
  | {
      readonly kind: 'magic_mouth';
      readonly maximumWords: number;
      readonly maximumMessageRounds: number;
      readonly triggerRadiusFeet: number;
    }
  | {
      readonly kind: 'object_unlock';
      readonly arcaneLockSuppressionRounds: number;
      readonly audibleRangeFeet: number;
      readonly unlocksOneLock: true;
    }
  | {
      readonly kind: 'magic_weapon';
      readonly baseBonus: number;
      readonly levelThreeBonus: number;
      readonly levelSixBonus: number;
    }
  | {
      readonly kind: 'location_tracking';
      readonly samePlaneOnly: true;
      readonly negatesHiddenAndInvisibleBenefits: true;
    }
  | {
      readonly kind: 'mirror_images';
      readonly duplicates: number;
      readonly interceptionDieSides: number;
      readonly interceptionMinimum: number;
    }
  | {
      readonly kind: 'teleport';
      readonly maximumDistanceFeet: number;
      readonly requiresVisibleUnoccupiedSpace: true;
    }
  | {
      readonly kind: 'poison_protection';
      readonly saveMode: 'advantage';
      readonly resistanceType: 'Poison';
    }
  | {
      readonly kind: 'ray_enfeeblement';
      readonly branch: 'success' | 'failure';
      readonly damagePenaltyCount: number;
      readonly damagePenaltySides: number;
    }
  | {
      readonly kind: 'rope_trick';
      readonly portalWidthFeet: number;
      readonly portalHeightFeet: number;
      readonly maximumCreatures: number;
    }
  | {
      readonly kind: 'see_invisibility';
      readonly seesEtherealPlane: true;
    }
  | {
      readonly kind: 'silence_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly thunderImmune: true;
      readonly verbalComponentsImpossible: true;
      readonly creaturesInsideAreDeafened: true;
    }
  | {
      readonly kind: 'spider_climb';
      readonly climbSpeedEqualsSpeed: true;
      readonly handsFree: true;
    }
  | {
      readonly kind: 'spiritual_weapon';
      readonly moveFeetPerBonusAction: number;
      readonly attackReachFeet: number;
    }
  | {
      readonly kind: 'warding_bond';
      readonly maximumDistanceFeet: number;
      readonly armorClassBonus: number;
      readonly savingThrowBonus: number;
      readonly resistanceToAllDamage: true;
      readonly mirrorsDamageToSource: true;
    }
  | {
      readonly kind: 'web_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly cubeFeet: number;
      readonly flatDepthFeet: number;
      readonly fireDamageCount: number;
      readonly fireDamageSides: number;
    }
  | {
      readonly kind: 'truth_zone';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly saveAbility: 'charisma';
    }
  | {
      readonly kind: 'summoned_undead';
      readonly forms: readonly ('Skeleton' | 'Zombie')[];
      readonly createdCreatures: number;
      readonly createdCreaturesPerSlot: number;
      readonly reassertedCreatures: number;
      readonly reassertedCreaturesPerSlot: number;
      readonly commandRangeFeet: number;
      readonly controlDurationRounds: number;
    }
  | {
      readonly kind: 'beacon_of_hope';
      readonly wisdomSaveMode: 'advantage';
      readonly deathSaveMode: 'advantage';
      readonly maximizesHealing: true;
    }
  | {
      readonly kind: 'bestow_curse';
      readonly options: readonly ('ability_disadvantage' | 'attacks_against_caster_disadvantage' | 'forced_dodge' | 'extra_necrotic_damage')[];
      readonly extraDamageCount: number;
      readonly extraDamageSides: number;
    }
  | {
      readonly kind: 'blink';
      readonly dieSides: number;
      readonly etherealMinimum: number;
      readonly etherealVisionFeet: number;
      readonly returnSpaceFeet: number;
    }
  | {
      readonly kind: 'clairvoyance_sensor';
      readonly rangeFeet: number;
      readonly senses: readonly ('hearing' | 'seeing')[];
      readonly switchCost: 'bonus_action';
      readonly locationEligibility: 'familiar_or_obvious';
      readonly intangible: true;
      readonly invulnerable: true;
    }
  | {
      readonly kind: 'created_food_and_water';
      readonly foodPounds: number;
      readonly waterGallons: number;
      readonly foodSpoilsAfterRounds: number;
    }
  | {
      readonly kind: 'daylight_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly brightRadiusFeet: number;
      readonly additionalDimFeet: number;
      readonly dispelsDarknessSpellLevelAtMost: number;
    }
  | {
      readonly kind: 'flight';
      readonly speedFeet: number;
      readonly canHover: true;
      readonly fallsWhenEffectEnds: true;
    }
  | {
      readonly kind: 'gaseous_form';
      readonly flySpeedFeet: number;
      readonly canHover: true;
      readonly physicalResistanceTypes: readonly ('Bludgeoning' | 'Piercing' | 'Slashing')[];
      readonly proneImmune: true;
      readonly physicalSaveMode: 'advantage';
      readonly canAttackOrCast: false;
    }
  | {
      readonly kind: 'glyph_of_warding';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly maximumDiameterFeet: number;
      readonly movementBreakDistanceFeet: number;
      readonly explosiveRadiusFeet: number;
      readonly explosiveDamageTypes: readonly ('Acid' | 'Cold' | 'Fire' | 'Lightning' | 'Thunder')[];
      readonly explosiveDamageCount: number;
      readonly explosiveDamageSides: number;
      readonly explosiveDamagePerSlotCount: number;
      readonly storedSpellMaximumLevel: number;
    }
  | {
      readonly kind: 'haste';
      readonly speedMultiplier: 2;
      readonly armorClassBonus: number;
      readonly dexteritySaveMode: 'advantage';
      readonly extraActionOptions: readonly ('attack_once' | 'dash' | 'disengage' | 'hide' | 'utilize')[];
      readonly lethargyCondition: 'Incapacitated';
      readonly lethargySpeedFeet: 0;
      readonly lethargyRounds: number;
    }
  | {
      readonly kind: 'hypnotic_pattern';
      readonly conditions: readonly ('Charmed' | 'Incapacitated')[];
      readonly speedFeet: 0;
      readonly endsOnDamage: true;
      readonly wakeAction: true;
    }
  | {
      readonly kind: 'fear';
      readonly condition: 'Frightened';
      readonly dropsHeldObjects: true;
      readonly forcedAction: 'dash_away';
      readonly repeatSaveAbility: 'wisdom';
      readonly repeatSaveRequiresNoLineOfSight: true;
    }
  | {
      readonly kind: 'magic_circle';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly heightFeet: number;
      readonly creatureTypes: readonly ('Celestial' | 'Elemental' | 'Fey' | 'Fiend' | 'Undead')[];
      readonly reversible: true;
    }
  | {
      readonly kind: 'major_image';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly maximumCubeFeet: number;
      readonly sensoryModes: readonly ('visual' | 'sound' | 'smell' | 'temperature')[];
      readonly movableByMagicAction: true;
      readonly investigationAgainstSpellDc: true;
    }
  | {
      readonly kind: 'meld_into_stone';
      readonly exitMovementFeet: number;
      readonly partialDestructionDamageCount: number;
      readonly partialDestructionDamageSides: number;
      readonly totalDestructionDamage: number;
      readonly expelledCondition: 'Prone';
    }
  | {
      readonly kind: 'nondetection';
      readonly blocksDivinationTargeting: true;
      readonly blocksMagicalScryingSensors: true;
      readonly maximumObjectDimensionFeet: number;
    }
  | {
      readonly kind: 'phantom_steed';
      readonly speedFeet: number;
      readonly travelMilesPerHour: number;
      readonly equipmentVanishDistanceFeet: number;
      readonly fadeRounds: number;
    }
  | {
      readonly kind: 'energy_protection';
      readonly damageTypes: readonly ('Acid' | 'Cold' | 'Fire' | 'Lightning' | 'Thunder')[];
      readonly selectedDamageType: string;
    }
  | {
      readonly kind: 'sending';
      readonly maximumWords: number;
      readonly crossPlaneFailurePercent: number;
      readonly recipientBlockRounds: number;
    }
  | {
      readonly kind: 'sleet_storm_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly heightFeet: number;
      readonly obscurement: 'heavy';
      readonly difficultTerrain: true;
      readonly saveAbility: 'dexterity';
      readonly failureCondition: 'Prone';
      readonly failureBreaksConcentration: true;
    }
  | {
      readonly kind: 'slow';
      readonly speedMultiplier: 0.5;
      readonly armorClassPenalty: number;
      readonly dexteritySavePenalty: number;
      readonly reactionsAllowed: false;
      readonly actionOrBonusOnly: true;
      readonly attacksPerAction: 1;
      readonly somaticSpellFailurePercent: number;
    }
  | {
      readonly kind: 'speak_with_dead';
      readonly maximumQuestions: number;
      readonly sameCorpseLockoutRounds: number;
    }
  | {
      readonly kind: 'spirit_guardians_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly speedMultiplier: 0.5;
      readonly damageTypeByCasterAlignment: Readonly<{
        goodOrNeutral: 'Radiant';
        evil: 'Necrotic';
      }>;
      readonly damageCount: number;
      readonly damageSides: number;
      readonly damagePerSlotCount: number;
      readonly saveAbility: 'wisdom';
      readonly onSuccess: 'half';
      readonly oncePerTurn: true;
    }
  | {
      readonly kind: 'stinking_cloud_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly obscurement: 'heavy';
      readonly dispersedByStrongWind: true;
      readonly saveAbility: 'constitution';
      readonly failureCondition: 'Poisoned';
      readonly actionsAllowedOnFailure: false;
    }
  | {
      readonly kind: 'tiny_hut';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly radiusFeet: number;
      readonly blocksOutsideCreaturesAndObjects: true;
      readonly blocksSpellLevelAtMost: number;
      readonly opaqueFromOutside: true;
      readonly transparentFromInside: true;
    }
  | {
      readonly kind: 'universal_language';
      readonly understandsSpokenAndSigned: true;
      readonly understoodByAnyLanguageSpeaker: true;
    }
  | {
      readonly kind: 'vampiric_touch';
      readonly repeatAttackCost: 'magic_action';
    }
  | {
      readonly kind: 'water_breathing';
      readonly retainsNormalRespiration: true;
    }
  | {
      readonly kind: 'water_walk';
      readonly surfaces: readonly ('water' | 'acid' | 'mud' | 'snow' | 'quicksand' | 'lava')[];
      readonly transitionCost: 'bonus_action';
    }
  | {
      readonly kind: 'arcane_eye';
      readonly darkvisionFeet: number;
      readonly moveFeetPerBonusAction: number;
      readonly minimumOpeningInches: number;
      readonly invisible: true;
      readonly invulnerable: true;
      readonly hovers: true;
      readonly seesEveryDirection: true;
      readonly blockedBySolidBarriers: true;
    }
  | {
      readonly kind: 'aura_of_life';
      readonly radiusFeet: number;
      readonly resistanceType: 'Necrotic';
      readonly preventsHitPointMaximumReduction: true;
      readonly startTurnHealingAtZero: number;
    }
  | {
      readonly kind: 'banishment';
      readonly condition: 'Incapacitated';
      readonly nativePlaneCreatureTypes: readonly ('Aberration' | 'Celestial' | 'Elemental' | 'Fey' | 'Fiend')[];
      readonly permanentAfterRounds: number;
    }
  | {
      readonly kind: 'black_tentacles_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly squareFeet: number;
      readonly difficultTerrain: true;
      readonly saveAbility: 'strength';
      readonly damageCount: number;
      readonly damageSides: number;
      readonly damageType: 'Bludgeoning';
      readonly failureCondition: 'Restrained';
      readonly escapeCheckSkill: 'Athletics';
      readonly oncePerTurn: true;
    }
  | {
      readonly kind: 'charm_monster';
      readonly condition: 'Charmed';
      readonly hostileSaveMode: 'advantage';
      readonly attitude: 'Friendly';
      readonly endsWhenDamagedByCasterOrAllies: true;
      readonly targetKnowsAfterward: true;
    }
  | {
      readonly kind: 'confusion_area';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly behaviorDieSides: number;
      readonly directionDieSides: number;
      readonly bonusActionsAllowed: false;
      readonly reactionsAllowed: false;
    }
  | {
      readonly kind: 'conjure_minor_elementals';
      readonly radiusFeet: number;
      readonly damageTypes: readonly ('Acid' | 'Cold' | 'Fire' | 'Lightning')[];
      readonly damageCount: number;
      readonly damageSides: number;
      readonly damagePerSlotCount: number;
      readonly difficultTerrainForEnemies: true;
    }
  | {
      readonly kind: 'control_water';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly cubeFeet: number;
      readonly modes: readonly ('flood' | 'part_water' | 'redirect_flow' | 'whirlpool')[];
      readonly floodRiseFeet: number;
      readonly capsizePercent: number;
      readonly whirlpoolMinimumSquareFeet: number;
      readonly whirlpoolMinimumDepthFeet: number;
      readonly whirlpoolBaseFeet: number;
      readonly whirlpoolTopFeet: number;
      readonly whirlpoolHeightFeet: number;
      readonly pullRadiusFeet: number;
      readonly pullFeet: number;
      readonly damageCount: number;
      readonly damageSides: number;
      readonly onSuccess: 'half';
      readonly saveAbility: 'strength';
      readonly escapeCheckAbility: 'strength';
      readonly escapeCheckSkill: 'Athletics';
    }
  | {
      readonly kind: 'death_ward';
      readonly replacementHitPoints: number;
      readonly negatesInstantDeath: true;
      readonly consumedOnTrigger: true;
    }
  | {
      readonly kind: 'dimension_door';
      readonly maximumDistanceFeet: number;
      readonly maximumPassengers: number;
      readonly passengerStartFeet: number;
      readonly passengerDestinationFeet: number;
      readonly failureDamageCount: number;
      readonly failureDamageSides: number;
      readonly failureDamageType: 'Force';
      readonly passengerMustBeWilling: true;
    }
  | {
      readonly kind: 'divination';
      readonly forecastDays: number;
      readonly noAnswerChancePerExtraCastingPercent: number;
    }
  | {
      readonly kind: 'fabricate';
      readonly standardCubeFeet: number;
      readonly connectedCubes: number;
      readonly mineralCubeFeet: number;
      readonly requiresArtisanToolProficiencyForSkilledItems: true;
      readonly createsCreaturesOrMagicItems: false;
    }
  | {
      readonly kind: 'faithful_hound';
      readonly maximumSeparationFeet: number;
      readonly triggerRadiusFeet: number;
      readonly truesightFeet: number;
      readonly biteReachFeet: number;
      readonly saveAbility: 'dexterity';
      readonly damageCount: number;
      readonly damageSides: number;
      readonly damageType: 'Force';
      readonly moveFeetPerMagicAction: number;
      readonly triggerMinimumSize: 'Small';
      readonly intangible: true;
      readonly invulnerable: true;
    }
  | {
      readonly kind: 'fire_shield';
      readonly brightFeet: number;
      readonly dimFeet: number;
      readonly resistanceTypes: readonly ('Cold' | 'Fire')[];
      readonly retaliationReachFeet: number;
      readonly retaliationDamageCount: number;
      readonly retaliationDamageSides: number;
      readonly retaliationDamageTypes: readonly ('Fire' | 'Cold')[];
    }
  | {
      readonly kind: 'freedom_of_movement';
      readonly ignoresDifficultTerrain: true;
      readonly preventsMagicalSpeedReduction: true;
      readonly preventedConditions: readonly ('Paralyzed' | 'Restrained')[];
      readonly swimSpeedEqualsSpeed: true;
      readonly nonmagicalEscapeMovementFeet: number;
    }
  | {
      readonly kind: 'guardian_of_faith';
      readonly size: 'Large';
      readonly triggerRadiusFeet: number;
      readonly saveAbility: 'dexterity';
      readonly damage: number;
      readonly damageType: 'Radiant';
      readonly onSuccess: 'half';
      readonly maximumTotalDamage: number;
      readonly invulnerable: true;
    }
  | {
      readonly kind: 'hallucinatory_terrain';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly cubeFeet: number;
      readonly sensoryModes: readonly ('visual' | 'sound' | 'smell')[];
      readonly tactileUnchanged: true;
      readonly investigationAgainstSpellDc: true;
    }
  | {
      readonly kind: 'ice_storm_terrain';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly difficultTerrain: true;
    }
  | {
      readonly kind: 'locate_creature';
      readonly radiusFeet: number;
      readonly familiarityDistanceFeet: number;
      readonly blockedByLead: true;
      readonly failsForDifferentForm: true;
    }
  | {
      readonly kind: 'phantasmal_killer';
      readonly disadvantagedTests: readonly ('ability_check' | 'attack_roll')[];
      readonly repeatSaveAbility: 'wisdom';
      readonly repeatDamageCount: number;
      readonly repeatDamageSides: number;
      readonly repeatDamagePerSlotCount: number;
      readonly repeatDamageType: 'Psychic';
    }
  | {
      readonly kind: 'polymorph';
      readonly formType: 'Beast';
      readonly maximumChallengeRating: 'target_cr_or_level';
      readonly temporaryHitPoints: 'beast_hit_points';
      readonly endsAtTemporaryHitPoints: number;
      readonly canSpeak: false;
      readonly canCastSpells: false;
      readonly gearMelds: true;
      readonly retainedStatistics: readonly ('alignment' | 'personality' | 'creature_type' | 'hit_points' | 'hit_point_dice')[];
    }
  | {
      readonly kind: 'private_sanctum';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly minimumCubeFeet: number;
      readonly maximumCubeFeet: number;
      readonly cubeFeetPerSlot: number;
      readonly protections: readonly ('sound' | 'vision' | 'divination_sensors' | 'divination_targeting' | 'teleportation' | 'planar_travel')[];
      readonly permanentAfterDailyCastings: number;
    }
  | {
      readonly kind: 'resilient_sphere';
      readonly maximumSize: 'Large';
      readonly blocksPhysicalObjectsEnergyAndSpells: true;
      readonly immuneToDamage: true;
      readonly rollSpeedMultiplier: 0.5;
      readonly destroyedBy: 'Disintegrate';
    }
  | {
      readonly kind: 'secret_chest';
      readonly chestDimensionsFeet: readonly [number, number, number];
      readonly capacityCubicFeet: number;
      readonly recallDistanceFeet: number;
      readonly riskBeginsAfterDays: number;
      readonly dailyCumulativeChancePerDayPercent: number;
      readonly chestMinimumGp: number;
      readonly replicaMinimumGp: number;
    }
  | {
      readonly kind: 'stone_shape';
      readonly maximumObjectSize: 'Medium';
      readonly maximumDimensionFeet: number;
      readonly maximumHinges: number;
      readonly permitsLatch: true;
    }
  | {
      readonly kind: 'damage_resistances';
      readonly damageTypes: readonly ('Bludgeoning' | 'Piercing' | 'Slashing')[];
    }
  | {
      readonly kind: 'wall_of_fire';
      readonly placement: AreaTemplate | 'selected_when_cast';
      readonly maximumLengthFeet: number;
      readonly heightFeet: number;
      readonly thicknessFeet: number;
      readonly ringDiameterFeet: number;
      readonly damagingSideDistanceFeet: number;
      readonly damageCount: number;
      readonly damageSides: number;
      readonly damagePerSlotCount: number;
      readonly damageType: 'Fire';
      readonly opaque: true;
      readonly requiresSolidSurface: true;
    }
  | {
      readonly kind: 'minor_magic';
      readonly spell: 'Elementalism' | 'Prestidigitation' | 'Thaumaturgy';
      readonly options: readonly string[];
      readonly maximumActive: number | null;
    }
  | {
      readonly kind: 'object_repair';
      readonly maximumBreakFeet: number;
      readonly restoresMagic: false;
    }
  | {
      readonly kind: 'attack_roll_mode_modifier';
      readonly mode: 'advantage' | 'disadvantage';
      readonly appliesTo:
        | { readonly kind: 'next_attack_against_target' }
        | { readonly kind: 'next_attack_by_target' }
        | { readonly kind: 'attacks_against_target' }
        | {
            readonly kind: 'attacks_by_target';
            readonly attackIds: readonly string[];
          };
    }
  | {
      readonly kind: 'faerie_fire';
      readonly attackModeAgainstTarget: 'advantage';
      readonly preventsInvisibleConditionBenefit: true;
      readonly dimLightFeet: 10;
    }
  | {
      readonly kind: 'consumable_healing_pool';
      readonly remainingUses: number;
      readonly healingPerUse: 1;
      readonly activation: 'bonus_action';
      readonly encounterExpiry: 'not_tracked_24_hours';
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
      readonly trigger: 'hit_by_attack_or_targeted_by_magic_missile';
    };

export interface EffectApplication {
  readonly targets: readonly CombatantId[];
  readonly duration: EffectDurationClock;
  readonly concentration: boolean;
  readonly stackingIdentity: EffectStackingIdentity;
  readonly stacking: 'coexist' | 'replace_same_source' | 'replace_any_source';
  readonly repeatedSave: RepeatedSaveTiming | null;
  readonly payload: EffectPayload;
  /** Present only for an effect materialized by persistent-area membership. */
  readonly areaSource?: PersistentAreaId;
  readonly areaMembershipBound?: true;
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
  readonly areaSource?: PersistentAreaId;
  readonly areaMembershipBound?: true;
}
