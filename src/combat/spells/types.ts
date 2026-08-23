import type { Ability, Skill } from '../../domain/enums';
import type { ConditionName } from '../conditions';
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
import type { CombatantId, DamageType, LimitedResourcePoolId, ObjectTargetId, WorldObjectId } from '../values';
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

export type ConditionLifecycleDuration =
  | {
      readonly kind: 'fixed_rounds';
      readonly rounds: number;
      readonly expiresAt: 'source_start' | 'source_end' | 'target_start' | 'target_end';
    }
  | { readonly kind: 'concentration' }
  | {
      readonly kind: 'fixed_rounds_or_concentration';
      readonly rounds: number;
      readonly expiresAt: 'source_start' | 'source_end' | 'target_start' | 'target_end';
    };

export type ConditionLifecycleStacking =
  | { readonly kind: 'coexist' }
  | { readonly kind: 'replace'; readonly sources: 'same_source' | 'any_source' }
  | { readonly kind: 'extend_duration'; readonly sources: 'same_source' | 'any_source' };

interface ConditionLifecycleOperationBase {
  readonly kind: 'condition_lifecycle';
  readonly condition: Exclude<ConditionName, 'Exhaustion'>;
  readonly immunity: null | {
    /** Sleep keys its refusal to Exhaustion immunity rather than its applied condition (spell-descriptions.txt:7111-7118). */
    readonly condition: ConditionName;
  };
  readonly initialSave: null | {
    readonly ability: Ability;
    readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
    readonly applyOn: 'failure';
  };
  readonly repeatedSave: null | {
    /** Start/end variants occur at spell-descriptions.txt:1474-1486 and 867-873. */
    readonly hook: 'target_start' | 'target_end';
    readonly ability: Ability;
    readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
    /** Conjure Elemental removes one restraint; Ray of Enfeeblement ends the spell (spell-descriptions.txt:1474-1486,6418-6426). */
    readonly onSuccess: 'remove_target' | 'end_effect';
  };
  readonly damageBreak: null | {
    /** Any damage: spell-descriptions.txt:2838-2840,5550-5554. Source/allies only: spell-descriptions.txt:150-159,1034-1041. */
    readonly sources: 'any' | 'effect_source_or_allies';
    readonly minimumDamage: 1;
  };
}

export type ConditionLifecycleOperation = ConditionLifecycleOperationBase & (
  | {
      readonly duration: Extract<ConditionLifecycleDuration, { readonly kind: 'fixed_rounds' }>;
      readonly stacking: ConditionLifecycleStacking;
    }
  | {
      readonly duration: Exclude<ConditionLifecycleDuration, { readonly kind: 'fixed_rounds' }>;
      readonly stacking: Exclude<ConditionLifecycleStacking, { readonly kind: 'extend_duration' }>;
    }
);

export type ModifierDuration = ConditionLifecycleDuration;

export type CastChoice<T> =
  | T
  | {
      readonly kind: 'chosen_when_cast';
      readonly options: readonly T[];
    };

export type RollDiceModifierOperation = {
  readonly kind: 'roll_dice_modifier';
  readonly die: { readonly count: number; readonly sides: 4 | 6 | 8 | 10 | 12 | 20 };
  readonly sign: 1 | -1;
  readonly duration: ModifierDuration;
} & (
  | {
      /** Bless/Bane affect every attack roll and save (spell-descriptions.txt:670-681,824-837). */
      readonly application: 'every_qualifying_roll';
      readonly tests: readonly ('attack_roll' | 'saving_throw')[];
    }
  | {
      /** Guidance chooses one skill when cast (spell-descriptions.txt:4000-4009). */
      readonly application: 'chosen_skill_checks';
      readonly skill: CastChoice<Skill>;
    }
);

export interface DamageDiceReductionOperation {
  /** Resistance reduces the chosen damage type by 1d4, at most once per turn (spell-descriptions.txt:6540-6552). */
  readonly kind: 'damage_dice_reduction';
  readonly damageType: CastChoice<DamageType>;
  readonly die: { readonly count: 1; readonly sides: 4 };
  readonly uses: 'once_per_turn';
  readonly duration: ModifierDuration;
}

export type RollModeModifierOperation = {
  readonly kind: 'roll_mode_modifier';
  readonly mode: 'advantage' | 'disadvantage';
  readonly duration: ModifierDuration;
} & (
  | {
      readonly roll: 'attack_roll';
      readonly scope: { readonly kind: 'target_rolls' } | { readonly kind: 'attacks_against_target' };
    }
  | {
      readonly roll: 'saving_throw' | 'ability_check';
      readonly scope: { readonly kind: 'target_rolls' };
    }
);

export interface ArmorClassModifierOperation {
  readonly kind: 'armor_class_modifier';
  /** Shield is a bonus; Barkskin is a floor (spell-descriptions.txt:6937-6954,706-724). */
  readonly modification:
    | { readonly kind: 'bonus'; readonly amount: number }
    | { readonly kind: 'floor'; readonly minimum: number };
  readonly duration: ModifierDuration;
}

export interface DamageResponseModifierOperation {
  readonly kind: 'damage_response_modifier';
  readonly damageType: CastChoice<DamageType>;
  readonly response: 'resistant' | 'vulnerable';
  readonly duration: ModifierDuration;
}

export interface TargetedDefenseModifierOperation {
  readonly kind: 'targeted_defense_modifier';
  readonly against: 'selected_attacker';
  readonly armorClassBonus: number;
  readonly duration: ModifierDuration;
}

export type CompositionTargetResolution =
  | { readonly kind: 'inherit' }
  | {
      readonly kind: 're_resolve';
      readonly selector:
        | { readonly kind: 'caster' }
        | { readonly kind: 'enclosing_area' };
    };

/** D347 accepts four nested pairwise composition nodes and refuses the fifth. */
export const MAX_COMPOSITION_DEPTH = 4;

export interface CompositionStep {
  readonly targetResolution: CompositionTargetResolution;
  /**
   * Recursive only through composition steps. Shared-outcome branches retain
   * their narrower BranchSpellOperation type below, so neither composition nor
   * another shared outcome can inhabit a branch.
   */
  readonly operation: SpellOperation;
}

type CompositionOperationBase = {
  readonly kind: 'composition';
  readonly onRefusal: 'abort' | 'continue';
  readonly steps: readonly [CompositionStep, CompositionStep];
};

export type CompositionOperation = CompositionOperationBase & (
  | { readonly ordering: 'declaration_order' }
  | {
      readonly ordering: 'explicit';
      /** The only two zero-based permutations of the pair. */
      readonly order: readonly [0, 1] | readonly [1, 0];
    }
);

/**
 * The SRD gives local sequences such as damage followed by a save
 * (docs/srd/source/spell-descriptions.txt:6747-6751), but it declares no general ordering for
 * an imported operation pair. Packs therefore choose declaration order or an
 * explicit two-slot permutation; neither is an implicit engine default.
 */
export const COMPOSITION_EVALUATION_ORDER = 'declared_ordering' as const;

/**
 * The SRD gives spell-specific success/failure arms such as Thunderwave
 * (docs/srd/source/spell-descriptions.txt:7874-7886), but no general pair-operation refusal
 * rule. Every pair must declare whether a refused step aborts the
 * composition atomically or is rolled back and followed by the next step.
 */
export const COMPOSITION_REFUSAL_PROPAGATION = Object.freeze(['abort', 'continue'] as const);

/**
 * A continued nested refusal is handled at that composition boundary: an
 * applied sibling makes the composition applied. An aborted refusal remains
 * refused and is therefore visible to the parent step's onRefusal policy.
 */
export const NESTED_COMPOSITION_OUTCOME_PROPAGATION = Object.freeze({
  continuedRefusalWithAppliedStep: 'applied',
  abortedRefusal: 'refused',
} as const);

/**
 * The SRD is silent on a generic composition snapshot. The engine's declared
 * rule is live visibility: each step observes all state produced by earlier
 * successful steps in the composition.
 */
export const COMPOSITION_STATE_VISIBILITY = 'live_prior_step_state' as const;

/**
 * SRD effects sometimes retain one creature set (docs/srd/source/spell-descriptions.txt:7589-7599)
 * and sometimes address creatures and objects separately
 * (docs/srd/source/spell-descriptions.txt:7874-7889). Each step therefore declares inheritance
 * or a re-resolution selector; the engine never guesses from operation kind.
 */
export const COMPOSITION_TARGET_RESOLUTION = Object.freeze(['inherit', 're_resolve'] as const);

export type SustainedEffectActionDeclaration =
  | {
      readonly phrasing: 'explicit';
      readonly actionType: 'magic_action' | 'bonus_action' | 'reaction';
    }
  | {
      readonly phrasing: 'vague_action_on_later_turn';
      readonly actionType: 'magic_action';
    };

/**
 * D343.2 converter contract: named action types survive conversion; vague
 * later-turn Action wording is declared as the 2024 Magic action. The reducer
 * never supplies an action type that a content pack omitted.
 */
export const SUSTAINED_ACTION_NORMALIZATION = Object.freeze({
  explicit: 'preserve_declared_action_type',
  vague_action_on_later_turn: 'magic_action',
} as const);

export type SustainedEffectTargetBinding =
  | { readonly kind: 'reselect' }
  | {
      readonly kind: 'bound';
      readonly to: 'cast_combatant_targets' | 'cast_object_targets' | 'created_world_objects';
    };

export type SharedOutcomeDelivery =
  | { readonly kind: 'attack'; readonly attackKind: 'melee' | 'ranged' }
  | {
      readonly kind: 'save';
      readonly ability: Ability;
      readonly rollMode: 'normal' | 'advantage' | 'disadvantage';
    };

/**
 * A branch-only reference to the raw total rolled by one immediate automatic
 * damage operation in the failure branch. The referenced dice are rolled once
 * at this node, then the existing round-down halving rule is applied.
 */
export interface SharedOutcomeDamageReferenceOperation {
  readonly kind: 'shared_outcome_damage_reference';
  readonly source: {
    readonly branch: 'failure';
    readonly operationIndex: number;
  };
  readonly transform: 'half_round_down';
}

/** Branch nodes cannot contain shared_outcome, even through another branch wrapper. */
export type SharedOutcomeBranchOperation = BranchSpellOperation | SharedOutcomeDamageReferenceOperation;

export type SharedOutcomeOperation =
  | {
      readonly kind: 'shared_outcome';
      readonly delivery: Extract<SharedOutcomeDelivery, { readonly kind: 'attack' }>;
      readonly onHit: readonly BranchSpellOperation[];
      readonly onMiss: readonly BranchSpellOperation[];
    }
  | {
      readonly kind: 'shared_outcome';
      readonly delivery: Extract<SharedOutcomeDelivery, { readonly kind: 'save' }>;
      readonly onFailure: readonly BranchSpellOperation[];
      readonly onSuccess: readonly SharedOutcomeBranchOperation[];
    };

export type NonCompositionSpellOperation = BranchSpellOperation;

export type SpellOperation = CompositionOperation | SharedOutcomeOperation | NonCompositionSpellOperation;

export type SustainedEffectSequence =
  | {
      /** D343's explicit later-turn activation, with its action gate preserved. */
      readonly kind: 'activation';
      readonly targetBinding: SustainedEffectTargetBinding;
      readonly action: SustainedEffectActionDeclaration;
      readonly targeting: SpellTargeting;
      readonly operation: BranchSpellOperation;
    }
  | {
      /**
       * Runs at each declared source-turn boundary without spending an action.
       * Faithful Hound acts at each source-turn start:
       * docs/srd/source/spell-descriptions.txt:2924-2927.
       */
      readonly kind: 'automatic_tick';
      readonly boundary: 'source_start' | 'source_end';
      readonly ticks: number;
      readonly operation: BranchSpellOperation;
    }
  | {
      /**
       * Runs for the creature that caused a declared hook on the owned area.
       * Entry/end hooks: docs/srd/source/spell-descriptions.txt:5608-5611.
       * Entry/start hooks: docs/srd/source/spell-descriptions.txt:1472-1474.
       */
      readonly kind: 'event_trigger';
      readonly hook: Extract<PersistentAreaHook,
        'on_enter' | 'on_start_of_turn_inside' | 'on_end_of_turn_inside'>;
      readonly frequency: 'once_per_turn' | 'every_trigger';
      readonly operation: BranchSpellOperation;
    }
  | {
      /**
       * Counts source-turn boundaries, resolves once, and consumes the effect.
       * The public timer is the judgment-free subset of later one-shot effects;
       * Delayed Blast Fireball's end-trigger is at
       * docs/srd/source/spell-descriptions.txt:2014-2021.
       */
      readonly kind: 'delayed_one_shot';
      readonly boundary: 'source_start' | 'source_end';
      readonly delayRounds: number;
      readonly operation: BranchSpellOperation;
    }
  | {
      /**
       * One activation owns and operates the complete declared instance set.
       * Dancing Lights creates four lights and moves "the lights" together:
       * docs/srd/source/spell-descriptions.txt:1916-1925.
       */
      readonly kind: 'instance_group_activation';
      readonly instanceCount: number;
      readonly action: SustainedEffectActionDeclaration;
      readonly targeting: SpellTargeting;
      readonly operation: BranchSpellOperation;
    };

export type BranchSpellOperation =
  /** Chromatic Orb chooses a damage type at cast time (spell-descriptions.txt:1087-1090). */
  {
      readonly kind: 'caster_choice';
      readonly modes: readonly {
        readonly mode: string;
        readonly operation: BranchSpellOperation;
      }[];
    }
  | {
      /** Prismatic Spray rolls per target against a table (spell-descriptions.txt:6067-6076). */
      readonly kind: 'random_branch';
      readonly dieSides: 4 | 6 | 8 | 10 | 12 | 20;
      readonly branches: readonly {
        readonly minimum: number;
        readonly maximum: number;
        readonly operation: BranchSpellOperation;
      }[];
    }
  | {
      /** Hold Person affects a Humanoid (spell-descriptions.txt:4348-4353). */
      readonly kind: 'target_branch';
      readonly branches: readonly {
        readonly predicate: { readonly kind: 'creature_type'; readonly creatureType: string };
        readonly operation: BranchSpellOperation;
      }[];
      readonly otherwise: BranchSpellOperation | null;
    }
  | {
      /** Confusion rolls anew at each target turn start (spell-descriptions.txt:1369-1375). */
      readonly kind: 'reevaluated_branch';
      readonly hook: 'target_start' | 'target_end';
      readonly durationRounds: number;
      readonly operation: BranchSpellOperation;
    }
  | ConditionLifecycleOperation
  | RollDiceModifierOperation
  | DamageDiceReductionOperation
  | RollModeModifierOperation
  | ArmorClassModifierOperation
  | DamageResponseModifierOperation
  | TargetedDefenseModifierOperation
  | {
      readonly kind: 'heat_metal';
      readonly requiredMaterial: 'metal';
      readonly damageType: DamageType;
      readonly dice: ScaledDice;
      readonly failedSave: {
        readonly ability: 'constitution';
        readonly rollMode: 'normal';
        readonly cannotDrop: readonly [RollModeModifierOperation, RollModeModifierOperation];
      };
    }
  | {
      readonly kind: 'sustained_effect';
      /** The ordinary cast-time operation, if any, resolves before the effect is established. */
      readonly establishment: BranchSpellOperation | null;
      readonly lifecycle: {
        readonly concentration: boolean;
        readonly durationRounds: number | null;
        readonly expiresAt: 'source_start' | 'source_end';
      };
      /** D348.1 deepens D343 with one mutually exclusive continuation shape. */
      readonly sequence: SustainedEffectSequence;
    }
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
            readonly kind: 'set_obscurement';
            readonly regionId: string;
            readonly obscurement: 'heavy' | 'magical_darkness' | null;
            readonly geometry: 'subject_cell';
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
            /** Activation-time destination is supplied by the sustained-effect command. */
            readonly kind: 'move_owned_object';
            readonly maximumDistanceFeet: number;
          }
        | {
            /** Every owned instance supplies a destination in the same activation. */
            readonly kind: 'move_owned_object_group';
            readonly maximumDistanceFeet: number;
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
  'composition',
  'shared_outcome',
  'caster_choice',
  'random_branch',
  'target_branch',
  'reevaluated_branch',
  'condition_lifecycle',
  'roll_dice_modifier',
  'damage_dice_reduction',
  'roll_mode_modifier',
  'armor_class_modifier',
  'damage_response_modifier',
  'targeted_defense_modifier',
  'heat_metal',
  'sustained_effect',
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
  /** Required only by a targeted-defense operation cast against a selected attacker. */
  readonly modifierSource?: CombatantId;
  readonly objectTargets?: readonly ObjectTargetId[];
  /** Objects created and owned by a sustained effect, distinct from its activation targets. */
  readonly ownedObjectTargets?: readonly WorldObjectId[];
  /** Complete per-instance destinations for an instance-group activation. */
  readonly ownedObjectDestinations?: readonly {
    readonly objectId: WorldObjectId;
    readonly destination: GridCell;
  }[];
  /** A declared class/feat pool can replace slot spending for this cast. */
  readonly resourcePoolId?: LimitedResourcePoolId;
}
