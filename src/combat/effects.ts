import type { Ability } from '../domain/enums';
import type { ConditionName, ExhaustionLevel } from './conditions';
import type { DamageRequest, RollMode } from './resolution';
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
