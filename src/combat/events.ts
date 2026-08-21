import type { Ability } from '../domain/enums';
import type { GridCell } from './grid';
import type {
  AttackRollResult,
  DamageRequest,
  DamageResult,
  RollMode,
  SavingThrowResult,
} from './resolution';
import type { EffectApplication, EffectPayload, TurnBoundary } from './effects';
import type { SpellCastCommand } from './spells/types';
import type { CombatantId, EncounterEffectId, Feet, LimitedResourcePoolId } from './values';

export type ActionCost = 'action' | 'bonus_action' | 'reaction' | 'none';

export type EncounterCommand =
  | { readonly type: 'roll_initiative' }
  | SpellCastCommand
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
      readonly type: 'attack';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly attackBonus: number;
      readonly criticalFloor: number;
      readonly rollMode: RollMode;
      readonly attackerCanSeeTarget: boolean;
      readonly targetCanSeeAttacker: boolean;
      readonly damage: DamageRequest;
      readonly bonusActionGrantEffectId?: EncounterEffectId;
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
      readonly type: 'heal';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly amount: number;
      readonly cost: ActionCost;
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
      readonly resource: 'action' | 'bonus_action' | 'reaction';
      readonly purpose: string;
    })
  | (SequencedEvent & {
      readonly type: 'limited_resource_spent';
      readonly combatant: CombatantId;
      readonly resourcePoolId: LimitedResourcePoolId;
      readonly remaining: number;
      readonly purpose: string;
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
        | 'stacking_replaced';
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
