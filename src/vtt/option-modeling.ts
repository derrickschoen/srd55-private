import type { EncounterState } from '../combat/encounter';
import { gridDistance } from '../combat/grid';
import type { MonsterAction, MonsterBonusAction } from '../combat/statblock';
import { combatantsAreAllies } from '../combat/allies';
import type { CombatantId } from '../combat/values';
import type { Brand } from '../domain/ids';
import { spellDefinition } from '../combat/spells/definitions';
import type {
  EngineActionId,
  EngineActivationChoiceSlot,
  EngineActionSlotUse,
  EngineMovementObjective,
  EngineSpellId,
} from './turn-proposal';

export type EngineOptionId = Brand<string, 'EngineOptionId'>;
export type EngineHumanOptionId = Brand<string, 'EngineHumanOptionId'>;

export const engineOptionId = (value: string): EngineOptionId => value as EngineOptionId;
export const engineHumanOptionId = (value: string): EngineHumanOptionId => value as EngineHumanOptionId;

interface EngineOmittedRiderSource {
  readonly sourceActionId: EngineActionId;
  readonly componentActionId: EngineActionId;
}

export type EngineOmittedRider =
  | (EngineOmittedRiderSource & {
      readonly kind: 'conditional_damage_trigger';
      readonly trigger: 'attack_roll_advantage' | 'replaces_base_when_target_bloodied' | 'charge';
    })
  | (EngineOmittedRiderSource & {
      readonly kind: 'conditional_on_hit_effect';
      readonly effect: 'condition';
      readonly trigger: 'charge';
    })
  | (EngineOmittedRiderSource & {
      readonly kind: 'attack_advantage_window';
      readonly window: 'first_round_of_each_combat';
    })
  | (EngineOmittedRiderSource & {
      readonly kind: 'delayed_zombie_creation';
      readonly targetKind: 'Humanoid';
      readonly delayHours: 24;
    })
  | (EngineOmittedRiderSource & {
      readonly kind: 'other_explicitly_classified_secondary_effect';
      readonly classification:
        | 'coupled_action_use'
        | 'equipment_corrosion'
        | 'conditional_damage_replacement'
        | 'grapple_escape_disadvantage'
        | 'attachment';
      readonly relatedActionId?: EngineActionId;
    });
export type EngineDeclaredActionKind = MonsterAction['kind'] | MonsterBonusAction['kind'];

export type NoModeledEffect =
  | {
      readonly kind: 'disengage_without_movement';
      readonly action: 'disengage';
    }
  | {
      readonly kind: 'disengage_without_adjacent_hostile';
      readonly action: 'disengage';
    }
  | {
      readonly kind: 'unsupported_action_payload';
      readonly actionId: EngineActionId;
      readonly actionKind: EngineDeclaredActionKind;
      readonly sourceNote: string;
    }
  | {
      readonly kind: 'unsupported_spell_payload';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly limitation:
        | 'not_in_manifest'
        | 'definition_unavailable'
        | 'targeting_unresolved'
        | 'utility_operation_unmodeled';
    };

export type EngineDeclaredOptionIdentity =
  | {
      readonly kind: 'standard_action';
      readonly action: 'disengage';
    }
  | {
      readonly kind: 'action';
      readonly actionId: EngineActionId;
      readonly actionKind: EngineDeclaredActionKind;
    }
  | {
      readonly kind: 'spell';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly slot: 'main' | 'bonus';
    };

export interface EngineOfferableOption {
  readonly optionId: EngineOptionId;
  readonly actorId: CombatantId;
  readonly revision: number;
  readonly label: string;
  readonly movement: EngineMovementObjective;
  readonly actionSlots: readonly EngineActionSlotUse[];
  readonly resourceCostLabels: readonly string[];
  readonly omittedRiders: readonly EngineOmittedRider[];
  /** A single activation-time decision; values never expand into separate options. */
  readonly activationChoice?: EngineActivationChoiceSlot | null;
}

export interface EngineHumanOnlyOption {
  readonly optionId: EngineHumanOptionId;
  readonly actorId: CombatantId;
  readonly revision: number;
  readonly label: string;
  readonly declaredOption: EngineDeclaredOptionIdentity;
  readonly noModeledEffect: NoModeledEffect;
}

export type EngineOptionCandidate = EngineOfferableOption | EngineHumanOnlyOption;

export type EngineOptionModelingDisposition =
  | { readonly kind: 'primary_effect_modeled' }
  | { readonly kind: 'no_modeled_effect'; readonly reason: NoModeledEffect };

export type EngineOptionModelingCandidate =
  | {
      readonly kind: 'executable';
      readonly actorId: CombatantId;
      readonly movement: EngineMovementObjective;
      readonly actionSlots: readonly EngineActionSlotUse[];
    }
  | {
      readonly kind: 'unsupported_action';
      readonly actionId: EngineActionId;
      readonly actionKind: EngineDeclaredActionKind;
      readonly sourceNote: string;
    }
  | {
      readonly kind: 'unsupported_spell';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly limitation: Extract<NoModeledEffect, { readonly kind: 'unsupported_spell_payload' }>['limitation'];
    };

function intendsMovement(candidate: Extract<EngineOptionModelingCandidate, { readonly kind: 'executable' }>): boolean {
  return candidate.movement.preference.willingness !== 'none' &&
    candidate.movement.preference.maximumFeet !== 0;
}

function hasAdjacentHostileWithModeledOpportunityAttack(
  state: EncounterState,
  actorId: CombatantId,
): boolean {
  const actorPosition = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (actorPosition === undefined) return false;
  return state.combatants.some((candidate) => {
    if (candidate.profile.id === actorId || candidate.life !== 'living' ||
      combatantsAreAllies(state, actorId, candidate.profile.id) || !candidate.turn.reactionAvailable) return false;
    const position = state.tokens.find((token) => token.combatantId === candidate.profile.id)?.position;
    return position !== undefined && gridDistance(actorPosition, position) <= candidate.profile.rules.reach;
  });
}

export function classifyOptionModeling(
  state: EncounterState,
  candidate: EngineOptionModelingCandidate,
): EngineOptionModelingDisposition {
  switch (candidate.kind) {
    case 'unsupported_action':
      return {
        kind: 'no_modeled_effect',
        reason: {
          kind: 'unsupported_action_payload',
          actionId: candidate.actionId,
          actionKind: candidate.actionKind,
          sourceNote: candidate.sourceNote,
        },
      };
    case 'unsupported_spell':
      return {
        kind: 'no_modeled_effect',
        reason: {
          kind: 'unsupported_spell_payload',
          sourceActionId: candidate.sourceActionId,
          spellId: candidate.spellId,
          limitation: candidate.limitation,
        },
      };
    case 'executable': {
      const primary = candidate.actionSlots.find((slot) => slot.slot === 'main')?.use;
      if (primary === undefined) return { kind: 'primary_effect_modeled' };
      switch (primary.kind) {
        case 'dodge':
        case 'end_turn':
        case 'attack':
        case 'multiattack':
        case 'saving_throw':
        case 'use_world_object':
        case 'dash': return { kind: 'primary_effect_modeled' };
        case 'cast_spell': {
          const definition = spellDefinition(primary.spellId);
          if (definition === null) {
            return {
              kind: 'no_modeled_effect',
              reason: {
                kind: 'unsupported_spell_payload',
                sourceActionId: primary.sourceActionId,
                spellId: primary.spellId,
                limitation: 'definition_unavailable',
              },
            };
          }
          return definition.operation.kind === 'utility'
            ? {
                kind: 'no_modeled_effect',
                reason: {
                  kind: 'unsupported_spell_payload',
                  sourceActionId: primary.sourceActionId,
                  spellId: primary.spellId,
                  limitation: 'utility_operation_unmodeled',
                },
              }
            : { kind: 'primary_effect_modeled' };
        }
        case 'disengage':
          if (!intendsMovement(candidate)) {
            return { kind: 'no_modeled_effect', reason: { kind: 'disengage_without_movement', action: 'disengage' } };
          }
          return hasAdjacentHostileWithModeledOpportunityAttack(state, candidate.actorId)
            ? { kind: 'primary_effect_modeled' }
            : {
                kind: 'no_modeled_effect',
                reason: { kind: 'disengage_without_adjacent_hostile', action: 'disengage' },
              };
      }
    }
  }
}
