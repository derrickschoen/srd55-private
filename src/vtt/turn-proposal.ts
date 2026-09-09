import type { GridCell } from '../combat/grid';
import type { AreaTemplate } from '../combat/templates';
import type { CombatantId, WorldObjectId } from '../combat/values';
import type { EngineTargetSelector } from './engine-query-port';
import type { EngineOfferableOption, EngineOmittedRider, EngineOptionId } from './option-modeling';

export {
  engineHumanOptionId,
  engineOptionId,
  type EngineHumanOnlyOption,
  type EngineHumanOptionId,
  type EngineOfferableOption,
  type EngineOmittedRider,
  type EngineOptionCandidate,
  type EngineOptionId,
  type NoModeledEffect,
} from './option-modeling';

export type { CombatantId } from '../combat/values';

/** Stable passthrough ids remain distinct even when supplied by homebrew content. */
import type { Brand } from '../domain/ids';
export type EngineActionId = Brand<string, 'EngineActionId'>;
export type EngineSpellId = Brand<string, 'EngineSpellId'>;
export type EnginePlayToken = Brand<string, 'EnginePlayToken'>;

export const ENGINE_OPTION_METRICS = [
  'expected_damage_milli',
  'attack_count',
  'approach_feet',
  'action_slot_uses',
  'resource_costs',
] as const;
export type EngineOptionMetric = (typeof ENGINE_OPTION_METRICS)[number];

export const SIMPLE_OVERRIDE_JUSTIFICATION_KINDS = [
  'objective',
  'morale',
  'roleplay',
  'resource_conservation',
  'unknown_engine_gap',
] as const;
export const ENGINE_OVERRIDE_JUSTIFICATION_KINDS = [
  ...SIMPLE_OVERRIDE_JUSTIFICATION_KINDS,
  'engine_play',
  'missing_metric',
] as const;
export type EngineOverrideJustificationKind = (typeof ENGINE_OVERRIDE_JUSTIFICATION_KINDS)[number];
export type EngineOverrideJustification =
  | { readonly kind: (typeof SIMPLE_OVERRIDE_JUSTIFICATION_KINDS)[number] }
  | {
      readonly kind: 'engine_play';
      /** Null is retained through decoding so policy can return OVERRIDE_UNJUSTIFIED. */
      readonly token: EnginePlayToken | null;
    }
  | {
      readonly kind: 'missing_metric';
      /** Null is retained through decoding so policy can return OVERRIDE_UNJUSTIFIED. */
      readonly id: EngineOptionMetric | null;
    };

export const engineActionId = (value: string): EngineActionId => value as EngineActionId;
export const engineSpellId = (value: string): EngineSpellId => value as EngineSpellId;
export const enginePlayToken = (value: string): EnginePlayToken => value as EnginePlayToken;

export const COMMAND_WORDS = ['approach', 'flee', 'grovel', 'halt', 'drop'] as const;
export type CommandWord = (typeof COMMAND_WORDS)[number];
export const UNICORNS_BLESSING_SPELLS = ['cure-wounds', 'lesser-restoration'] as const;
export type UnicornsBlessingSpell = (typeof UNICORNS_BLESSING_SPELLS)[number];
export const LESSER_RESTORATION_CONDITIONS = ['Blinded', 'Deafened', 'Paralyzed', 'Poisoned'] as const;
export type LesserRestorationCondition = (typeof LESSER_RESTORATION_CONDITIONS)[number];
export const DISPEL_EVIL_AND_GOOD_MODES = ['break_enchantment', 'dismissal'] as const;
export type DispelEvilAndGoodMode = (typeof DISPEL_EVIL_AND_GOOD_MODES)[number];
export const CALM_EMOTIONS_MODES = ['suppress_charmed_frightened', 'indifferent_toward_monster_side'] as const;
export type CalmEmotionsMode = (typeof CALM_EMOTIONS_MODES)[number];

export type EngineActivationChoiceSlot =
  | { readonly kind: 'command_word'; readonly values: typeof COMMAND_WORDS }
  | { readonly kind: 'unicorns_blessing_spell'; readonly values: typeof UNICORNS_BLESSING_SPELLS }
  | { readonly kind: 'dispel_evil_and_good_mode'; readonly values: typeof DISPEL_EVIL_AND_GOOD_MODES }
  | {
      readonly kind: 'calm_emotions_per_target';
      readonly targetIds: readonly CombatantId[];
      readonly values: typeof CALM_EMOTIONS_MODES;
    };

export type EngineActivationChoice =
  | { readonly kind: 'command_word'; readonly value: CommandWord }
  | { readonly kind: 'unicorns_blessing_spell'; readonly value: UnicornsBlessingSpell }
  | { readonly kind: 'dispel_evil_and_good_mode'; readonly value: DispelEvilAndGoodMode }
  | {
      readonly kind: 'calm_emotions_per_target';
      readonly selections: readonly { readonly targetId: CombatantId; readonly mode: CalmEmotionsMode }[];
    };

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

export type EngineMultiattackComponentUse = (
  | EngineTargetedAttackUse
  | {
      readonly kind: 'saving_throw';
      readonly actionId: EngineActionId;
      readonly target: EngineTargetSelector;
    }
) & { readonly omittedRiders: readonly EngineOmittedRider[] };

export type EngineMainActionUse =
  | EngineTargetedAttackUse
  | {
      readonly kind: 'multiattack';
      readonly actionId: EngineActionId;
      readonly components: readonly EngineMultiattackComponentUse[];
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
      /** Engine-bound condition encoded by a revision-bound offered option. */
      readonly selectedCondition?: LesserRestorationCondition;
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

export interface EngineTurnProposal {
  readonly actorId: CombatantId;
  readonly expectedRevision: number;
  readonly primaryOptionId: EngineOptionId;
  readonly fallbackOptionId: EngineOptionId | null;
  /** Verbatim, bounded explanation supplied by the decision author. */
  readonly reason: string;
  readonly activationChoice?: EngineActivationChoice | null;
  readonly overrideJustification: EngineOverrideJustification | null;
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
  readonly omittedRiders: readonly EngineOmittedRider[];
  /** Engine-bound condition encoded by a revision-bound offered option. */
  readonly selectedCondition?: LesserRestorationCondition;
  readonly activationChoice?: EngineActivationChoice;
  readonly multiattackComponent?: true;
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
  readonly omittedRiders: readonly EngineOmittedRider[];
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
      readonly option: EngineOfferableOption;
      readonly primaryOption: EngineOfferableOption;
      readonly fallbackOption: EngineOfferableOption | null;
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
