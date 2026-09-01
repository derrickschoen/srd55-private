import type { Brand } from '../domain/ids';
import type { GridCell } from '../combat/grid';
import type { AreaTemplate } from '../combat/templates';
import type { CombatantId, WorldObjectId } from '../combat/values';
import type { EngineTargetSelector } from './engine-query-port';

export type { CombatantId } from '../combat/values';

/** Stable passthrough ids remain distinct even when supplied by homebrew content. */
export type EngineOptionId = Brand<string, 'EngineOptionId'>;
export type EngineActionId = Brand<string, 'EngineActionId'>;
export type EngineSpellId = Brand<string, 'EngineSpellId'>;

export const engineOptionId = (value: string): EngineOptionId => value as EngineOptionId;
export const engineActionId = (value: string): EngineActionId => value as EngineActionId;
export const engineSpellId = (value: string): EngineSpellId => value as EngineSpellId;

export interface EngineMovementPreference {
  readonly willingness: 'none' | 'only_if_required' | 'for_clear_advantage' | 'freely';
  readonly maximumFeet?: number;
  readonly opportunityRisk: 'avoid' | 'accept_if_needed' | 'accept';
}

export interface EngineEngagement {
  readonly stance: 'hold_position' | 'close_to_melee' | 'maintain_range' | 'withdraw';
  readonly anchor?: EngineTargetSelector | null;
}

export interface EngineMovementObjective {
  readonly preference: EngineMovementPreference;
  readonly engagement: EngineEngagement;
}

export interface EngineTargetedAttackUse {
  readonly kind: 'attack';
  readonly actionId: EngineActionId;
  readonly target: EngineTargetSelector;
}

export type EngineMainActionUse =
  | EngineTargetedAttackUse
  | {
      readonly kind: 'multiattack';
      readonly actionId: EngineActionId;
      readonly components: readonly EngineTargetedAttackUse[];
    }
  | {
      readonly kind: 'saving_throw';
      readonly actionId: EngineActionId;
      readonly target: EngineTargetSelector;
    }
  | {
      readonly kind: 'cast_spell';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly targets: readonly EngineTargetSelector[];
      /** Exact engine-owned placement; null for spells without a placed area. */
      readonly area: AreaTemplate | null;
    }
  | {
      readonly kind: 'use_world_object';
      readonly objectId: WorldObjectId;
      readonly actionId: EngineActionId;
    }
  | { readonly kind: 'dodge' | 'disengage' | 'dash' | 'end_turn' };

export type EngineBonusActionUse =
  | {
      readonly kind: 'cast_spell';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly targets: readonly EngineTargetSelector[];
      /** Exact engine-owned placement; null for spells without a placed area. */
      readonly area: AreaTemplate | null;
    }
  | {
      readonly kind: 'saving_throw';
      readonly actionId: EngineActionId;
      readonly target: EngineTargetSelector;
    }
  | { readonly kind: 'dash' | 'disengage' | 'hide' };

export type EngineActionSlotUse =
  | { readonly slot: 'main'; readonly use: EngineMainActionUse }
  | { readonly slot: 'bonus'; readonly use: EngineBonusActionUse };

export interface EngineActorOption {
  readonly optionId: EngineOptionId;
  readonly actorId: CombatantId;
  readonly revision: number;
  readonly label: string;
  readonly movement: EngineMovementObjective;
  readonly actionSlots: readonly EngineActionSlotUse[];
  readonly resourceCostLabels: readonly string[];
}

export interface EngineTurnProposal {
  readonly actorId: CombatantId;
  readonly expectedRevision: number;
  readonly primaryOptionId: EngineOptionId;
  readonly fallbackOptionId: EngineOptionId | null;
  readonly overrideJustification: null | (
    {
      readonly reason: 'morale' | 'objective' | 'roleplay' | 'resource_conservation';
      readonly note?: string;
    } | {
      readonly reason: 'unknown_engine_gap';
      readonly note: string;
    }
  );
}

export interface ResolvedActionSlotUse {
  readonly slot: 'main' | 'bonus';
  readonly kind:
    | 'attack'
    | 'saving_throw'
    | 'cast_spell'
    | 'use_world_object'
    | 'dodge'
    | 'disengage'
    | 'dash'
    | 'hide'
    | 'end_turn';
  readonly actionId: EngineActionId;
  readonly spellId: EngineSpellId | null;
  readonly targetIds: readonly CombatantId[];
  readonly objectId: WorldObjectId | null;
  /** Present only for a placed-area spell. */
  readonly area?: AreaTemplate;
}

export interface ResolvedTurnMechanics {
  readonly actorId: CombatantId;
  readonly optionId: EngineOptionId;
  readonly movementCostFeet: number;
  readonly path: readonly GridCell[];
  readonly finalPosition: GridCell;
  readonly actionSlots: readonly ResolvedActionSlotUse[];
}

export type EngineProposalResolution =
  | {
      readonly valid: true;
      readonly selectedBranch: 'primary' | 'fallback';
      readonly resolutionDigest: string;
      readonly summary: string;
      readonly refusals: readonly {
        readonly branch: 'primary';
        readonly code: string;
        readonly summary: string;
      }[];
      readonly mechanics: ResolvedTurnMechanics;
      readonly option: EngineActorOption;
      readonly primaryOption: EngineActorOption;
      readonly fallbackOption: EngineActorOption | null;
    }
  | {
      readonly valid: false;
      readonly selectedBranch: 'none';
      readonly refusals: readonly {
        readonly branch: 'primary' | 'fallback';
        readonly code: string;
        readonly summary: string;
      }[];
    };

export interface PureTurnProposalResolver {
  resolve(state: import('../combat/encounter').EncounterState, proposal: EngineTurnProposal): EngineProposalResolution;
}
