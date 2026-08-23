import type { Ability, Skill } from '../domain/enums';
import type { ObjectInteractionMode } from './equipment';
import type { GridCell } from './grid';
import type {
  AttackRollResult,
  DamageRequest,
  DamageResult,
  RollMode,
  SavingThrowResult,
} from './resolution';
import type { EffectApplication, EffectPayload, TurnBoundary } from './effects';
import type { PersistentAreaHook, PersistentAreaInput, PersistentAreaOrigin } from './persistent-areas';
import type { SpellCastCommand } from './spells/types';
import type { AreaTemplate } from './templates';
import type { CombatantId, EncounterEffectId, Feet, ItemId, LimitedResourcePoolId, ObjectTargetId, PersistentAreaId, WorldObjectId } from './values';
import type { LightLevel, WorldObject, WorldOperation } from './world-objects';

export type ActionCost = 'action' | 'bonus_action' | 'reaction' | 'none';

export type EncounterCommand =
  | { readonly type: 'roll_initiative' }
  | SpellCastCommand
  | {
      readonly type: 'activate_sustained_effect';
      readonly actor: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly targets: readonly CombatantId[];
      readonly objectTargets: readonly ObjectTargetId[];
      readonly ownedObjectTargets: readonly WorldObjectId[];
      readonly ownedObjectDestinations?: readonly {
        readonly objectId: WorldObjectId;
        readonly destination: GridCell;
      }[];
      readonly area: AreaTemplate | null;
      readonly spatialPoint?: GridCell;
      readonly selectedOption: string | null;
    }
  | {
      readonly type: 'drop_item' | 'pickup_item' | 'equip_item' | 'stow_item';
      readonly actor: CombatantId;
      readonly item: ItemId;
      readonly interaction: ObjectInteractionMode;
    }
  | {
      readonly type: 'adjudicate';
      readonly target: CombatantId;
      readonly subject: string;
      readonly reasoning: string;
      readonly consequence:
        | { readonly kind: 'hit_point_delta'; readonly amount: number }
        | { readonly kind: 'relocate'; readonly to: GridCell };
    }
  | {
      readonly type: 'move';
      readonly actor: CombatantId;
      readonly path: readonly GridCell[];
      readonly cause: 'voluntary' | 'reactions_resolved';
    }
  | {
      readonly type: 'create_persistent_area';
      readonly actor: CombatantId;
      readonly area: PersistentAreaInput;
      readonly cost: ActionCost;
      readonly featureEffectId?: EncounterEffectId;
    }
  | {
      readonly type: 'move_persistent_area';
      readonly actor: CombatantId;
      readonly areaId: PersistentAreaId;
      readonly origin: Extract<PersistentAreaOrigin, { readonly kind: 'fixed' }>;
    }
  | {
      readonly type: 'world_operation';
      readonly actor: CombatantId | null;
      readonly cost: ActionCost;
      readonly operation: WorldOperation;
    }
  | {
      readonly type: 'attack';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly attackBonus: number;
      readonly criticalFloor: number;
      readonly rollMode: RollMode;
      readonly attackerCanSeeTarget: boolean;
      readonly targetCanSeeAttacker: boolean;
      readonly damage: DamageRequest;
      /** Present for attacks selected from a typed party-pack attack form. */
      readonly attackId?: string;
      /** Chooses the declared first-attack Reckless Attack mode. */
      readonly recklessAttackEffectId?: EncounterEffectId;
      readonly bonusActionGrantEffectId?: EncounterEffectId;
      /** A declared attack-form damage-type option, validated by the reducer. */
      readonly damageTypeSelection?: {
        readonly effectId: EncounterEffectId;
        readonly damageType: DamageRequest['terms'][number]['type'];
      };
      /** A declared resource-die maneuver to spend only if this attack hits. */
      readonly maneuverEffectId?: EncounterEffectId;
      readonly riderSelections?: readonly {
        readonly effectId: EncounterEffectId;
        readonly slotLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      }[];
    }
  | {
      readonly type: 'opportunity_attack';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly attackBonus: number;
      readonly criticalFloor: number;
      readonly rollMode: RollMode;
      readonly attackerCanSeeTarget: boolean;
      readonly targetCanSeeAttacker: boolean;
      readonly damage: DamageRequest;
      /** Required while a form replacement limits attacks to its statblock. */
      readonly attackId?: string;
    }
  | {
      readonly type: 'decline_reaction';
      readonly actor: CombatantId;
      readonly mover: CombatantId;
    }
  | {
      readonly type: 'force_save';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly ability: Ability;
      readonly dc: number;
      readonly rollMode: RollMode;
      readonly damage: DamageRequest;
      readonly onSuccess: 'none' | 'half';
      readonly cost: ActionCost;
    }
  | {
      readonly type: 'roll_ability_check';
      readonly actor: CombatantId;
      readonly ability: Ability;
      readonly skill: Skill | null;
      readonly bonus: number;
      readonly dc: number;
      readonly rollMode: RollMode;
      readonly cost: ActionCost;
    }
  | {
      readonly type: 'dash' | 'disengage' | 'dodge';
      readonly actor: CombatantId;
    }
  | {
      readonly type: 'spend_bonus_action' | 'spend_reaction';
      readonly actor: CombatantId;
      readonly purpose: string;
    }
  | {
      readonly type: 'activate_action_surge';
      readonly actor: CombatantId;
      readonly effectId: EncounterEffectId;
    }
  | {
      readonly type: 'activate_timed_spellcasting_mode';
      readonly actor: CombatantId;
      readonly effectId: EncounterEffectId;
    }
  | {
      readonly type: 'activate_damage_operation';
      readonly actor: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly targets: readonly CombatantId[];
    }
  | {
      readonly type: 'arm_weapon_hit_rider';
      readonly actor: CombatantId;
      readonly effectId: EncounterEffectId;
    }
  | {
      readonly type: 'heal';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly amount: number;
      readonly cost: ActionCost;
    }
  | {
      readonly type: 'consume_healing_pool';
      readonly actor: CombatantId;
      readonly effectId: EncounterEffectId;
    }
  | {
      readonly type: 'apply_effect';
      readonly actor: CombatantId;
      readonly effect: EffectApplication;
      readonly cost: ActionCost;
      readonly resourcePoolId?: LimitedResourcePoolId;
    }
  | {
      readonly type: 'grant_temporary_hit_points';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly amount: number;
      readonly cost: ActionCost;
      readonly resourcePoolId?: LimitedResourcePoolId;
    }
  | {
      readonly type: 'end_concentration';
      readonly actor: CombatantId;
    }
  | { readonly type: 'end_turn'; readonly actor: CombatantId };

interface SequencedEvent {
  readonly sequence: number;
}

export type EncounterEvent =
  | (SequencedEvent & {
      readonly type: 'object_interaction_spent';
      readonly combatant: CombatantId;
      readonly mode: ObjectInteractionMode;
      readonly purpose: 'drop' | 'pickup' | 'equip' | 'stow';
    })
  | (SequencedEvent & {
      readonly type: 'item_dropped';
      readonly combatant: CombatantId;
      readonly item: ItemId;
      readonly position: GridCell;
      readonly cause: 'interaction' | 'forced' | 'form_replacement';
    })
  | (SequencedEvent & {
      readonly type: 'item_picked_up' | 'item_equipped' | 'item_stowed';
      readonly combatant: CombatantId;
      readonly item: ItemId;
    })
  | (SequencedEvent & {
      readonly type: 'adjudicated';
      readonly target: CombatantId;
      readonly subject: string;
      readonly reasoning: string;
      readonly consequence:
        | {
            readonly kind: 'hit_points';
            readonly before: number;
            readonly after: number;
            readonly lifeState: 'living' | 'dying' | 'stable' | 'dead';
          }
        | {
            readonly kind: 'position';
            readonly from: GridCell;
            readonly to: GridCell;
          };
    })
  | (SequencedEvent & {
      readonly type: 'initiative_rolled';
      readonly combatant: CombatantId;
      readonly faces: readonly number[];
      readonly total: number;
    })
  | (SequencedEvent & {
      readonly type: 'initiative_block_rolled';
      readonly combatants: readonly CombatantId[];
      readonly faces: readonly number[];
      readonly total: number;
      readonly bonus: number;
    })
  | (SequencedEvent & {
      readonly type: 'initiative_ordered';
      readonly order: readonly CombatantId[];
      readonly slots: readonly (readonly CombatantId[])[];
    })
  | (SequencedEvent & {
      readonly type: 'turn_started';
      readonly combatant: CombatantId;
      readonly round: number;
    })
  | (SequencedEvent & {
      readonly type: 'movement_completed';
      readonly combatant: CombatantId;
      readonly path: readonly GridCell[];
      readonly spent: Feet;
      readonly remaining: Feet;
    })
  | (SequencedEvent & {
      readonly type: 'persistent_area_created';
      readonly areaId: PersistentAreaId;
      readonly owner: CombatantId;
    })
  | (SequencedEvent & {
      readonly type: 'persistent_area_moved';
      readonly areaId: PersistentAreaId;
      readonly owner: CombatantId;
      readonly origin: Extract<PersistentAreaOrigin, { readonly kind: 'fixed' }>;
    })
  | (SequencedEvent & {
      readonly type: 'persistent_area_membership_changed';
      readonly areaId: PersistentAreaId;
      readonly entered: readonly CombatantId[];
      readonly exited: readonly CombatantId[];
    })
  | (SequencedEvent & {
      readonly type: 'persistent_area_triggered';
      readonly areaId: PersistentAreaId;
      readonly hook: 'on_enter' | 'on_start_of_turn_inside' | 'on_end_of_turn_inside' | 'on_exit';
      readonly target: CombatantId;
    })
  | (SequencedEvent & {
      readonly type: 'persistent_area_ended';
      readonly areaId: PersistentAreaId;
      readonly reason: 'duration_expired' | 'concentration_replaced' | 'concentration_ended' | 'concentration_broken' | 'anchor_destroyed';
    })
  | (SequencedEvent & {
      readonly type: 'world_object_created';
      readonly actor: CombatantId | null;
      readonly object: WorldObject;
    })
  | (SequencedEvent & {
      readonly type: 'world_object_modified';
      readonly actor: CombatantId | null;
      readonly objectId: WorldObjectId;
    })
  | (SequencedEvent & {
      readonly type: 'world_object_damaged';
      readonly actor: CombatantId | null;
      readonly objectId: WorldObjectId;
      readonly attack: AttackRollResult | null;
      readonly damage: DamageResult | null;
      readonly hitPointsBefore: number;
      readonly hitPointsAfter: number;
    })
  | (SequencedEvent & {
      readonly type: 'world_object_removed';
      readonly actor: CombatantId | null;
      readonly objectId: WorldObjectId;
      readonly reason: 'destroyed' | 'dismissed';
    })
  | (SequencedEvent & {
      readonly type: 'environment_terrain_changed';
      readonly actor: CombatantId | null;
      readonly regionId: string;
      readonly difficultTerrain: boolean;
    })
  | (SequencedEvent & {
      readonly type: 'environment_light_changed';
      readonly actor: CombatantId | null;
      readonly regionId: string;
      readonly level: LightLevel;
    })
  | (SequencedEvent & {
      readonly type: 'attack_resolved';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly attack: AttackRollResult;
      readonly damage: DamageResult | null;
    })
  | (SequencedEvent & {
      readonly type: 'save_resolved';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly ability: Ability;
      readonly save: SavingThrowResult;
      readonly effectId: EncounterEffectId | null;
    })
  | (SequencedEvent & {
      readonly type: 'ability_check_resolved';
      readonly actor: CombatantId;
      readonly ability: Ability;
      readonly skill: Skill | null;
      readonly check: {
        readonly outcome: 'failure' | 'success';
        readonly roll: import('./resolution').D20Roll;
        readonly total: number;
      };
    })
  | (SequencedEvent & {
      readonly type: 'damage_applied';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly amount: number;
      readonly hitPointsBefore: number;
      readonly hitPointsAfter: number;
      readonly lifeState: 'living' | 'dying' | 'stable' | 'dead';
      readonly massiveDamage: boolean;
    })
  | (SequencedEvent & {
      readonly type: 'death_save_resolved';
      readonly visibility: 'dm_only';
      readonly combatant: CombatantId;
      readonly roll: number;
      readonly outcome: 'failure' | 'success' | 'natural_1' | 'natural_20';
      readonly successes: number;
      readonly failures: number;
      readonly lifeState: 'living' | 'dying' | 'stable' | 'dead';
    })
  | (SequencedEvent & {
      readonly type: 'reaction_declined';
      readonly combatant: CombatantId;
      readonly mover: CombatantId;
    })
  | (SequencedEvent & {
      readonly type: 'healing_applied';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly amount: number;
      readonly hitPointsBefore: number;
      readonly hitPointsAfter: number;
    })
  | (SequencedEvent & {
      readonly type: 'resource_spent';
      readonly combatant: CombatantId;
      readonly resource: 'action' | 'bonus_action' | 'reaction' | 'additional_leveled_spell_action';
      readonly purpose: string;
    })
  | (SequencedEvent & {
      readonly type: 'combatant_left_board';
      readonly combatant: CombatantId;
      readonly effectId: EncounterEffectId;
    })
  | (SequencedEvent & {
      readonly type: 'combatant_returned_to_board';
      readonly combatant: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly position: GridCell;
    })
  | (SequencedEvent & {
      readonly type: 'combatant_summoned';
      readonly combatant: CombatantId;
      readonly summoner: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly position: GridCell;
    })
  | (SequencedEvent & {
      readonly type: 'summoned_combatant_despawned';
      readonly combatant: CombatantId;
      readonly summoner: CombatantId;
      readonly effectId: EncounterEffectId;
    })
  | (SequencedEvent & {
      readonly type: 'limited_resource_spent';
      readonly combatant: CombatantId;
      readonly resourcePoolId: LimitedResourcePoolId;
      readonly remaining: number;
      readonly purpose: string;
    })
  | (SequencedEvent & {
      readonly type: 'healing_pool_consumed';
      readonly combatant: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly remaining: number;
    })
  | (SequencedEvent & {
      readonly type: 'stance_started';
      readonly combatant: CombatantId;
      readonly stance: 'disengaging' | 'dodging';
    })
  | (SequencedEvent & {
      readonly type: 'effect_applied';
      readonly effectId: EncounterEffectId;
      readonly source: CombatantId;
      readonly targets: readonly CombatantId[];
    })
  | (SequencedEvent & {
      readonly type: 'condition_application_refused';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly condition: Exclude<import('./conditions').ConditionName, 'Exhaustion'>;
      readonly immunity: import('./conditions').ConditionName;
    })
  | (SequencedEvent & {
      readonly type: 'composition_step_resolved';
      readonly caster: CombatantId;
      readonly spellId: string;
      readonly stepIndex: number;
      readonly propagation: 'abort' | 'continue';
    } & (
      | { readonly outcome: 'applied' | 'no_op' }
      | { readonly outcome: 'refused'; readonly reason: 'operation_refused' | 'encounter_rule_refusal' }
    ))
  | (SequencedEvent & {
      readonly type: 'shared_outcome_resolved';
      readonly caster: CombatantId;
      readonly spellId: string;
      readonly target: CombatantId;
      readonly delivery: 'attack' | 'save';
      readonly branch: 'hit' | 'miss' | 'failure' | 'success';
    })
  | (SequencedEvent & {
      readonly type: 'effect_target_removed';
      readonly effectId: EncounterEffectId;
      readonly target: CombatantId;
      readonly reason: 'save_succeeded' | 'condition_immunity' | 'condition_removed';
    })
  | (SequencedEvent & {
      readonly type: 'effect_ended';
      readonly effectId: EncounterEffectId;
      readonly reason:
        | 'duration_expired'
        | 'concentration_replaced'
        | 'concentration_ended'
        | 'concentration_broken'
        | 'no_targets'
        | 'dispelled'
        | 'stacking_replaced'
        | 'save_succeeded'
        | 'damage_taken'
        | 'trigger_consumed'
        | 'form_hit_points_depleted';
    })
  | (SequencedEvent & {
      readonly type: 'effect_duration_extended';
      readonly effectId: EncounterEffectId;
      readonly addedRounds: number;
      readonly remaining: number;
    })
  | (SequencedEvent & {
      readonly type: 'effect_clock_ticked';
      readonly effectId: EncounterEffectId;
      readonly boundary: TurnBoundary;
      readonly remaining: number;
    })
  | (SequencedEvent & {
      readonly type: 'spell_cast';
      readonly caster: CombatantId;
      readonly spellId: string;
      readonly slotLevel: number | null;
      readonly targets: readonly CombatantId[];
    })
  | (SequencedEvent & {
      readonly type: 'sustained_effect_activated';
      readonly caster: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly spellId: string;
      readonly targets: readonly CombatantId[];
      readonly objectTargets: readonly ObjectTargetId[];
      readonly ownedObjectTargets: readonly WorldObjectId[];
    })
  | (SequencedEvent & {
      readonly type: 'sustained_effect_triggered';
      readonly caster: CombatantId;
      readonly effectId: EncounterEffectId;
      readonly spellId: string;
      readonly sequenceKind: 'automatic_tick' | 'event_trigger' | 'delayed_one_shot';
      readonly trigger: 'source_start' | 'source_end' | PersistentAreaHook;
      readonly targets: readonly CombatantId[];
    })
  | (SequencedEvent & {
      readonly type: 'spell_slot_spent';
      readonly combatant: CombatantId;
      readonly slotLevel: number;
      readonly remaining: number;
    })
  | (SequencedEvent & {
      readonly type: 'temporary_hit_points_changed';
      readonly combatant: CombatantId;
      readonly before: number;
      readonly after: number;
    })
  | (SequencedEvent & {
      readonly type: 'spell_utility_resolved';
      readonly caster: CombatantId;
      readonly spellId: string;
      readonly capability: string;
      readonly effect: EffectPayload;
    })
  | (SequencedEvent & {
      readonly type: 'turn_ended';
      readonly combatant: CombatantId;
      readonly round: number;
    });
