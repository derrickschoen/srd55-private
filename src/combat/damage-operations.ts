import type { Ability, KnownCreatureSize } from '../domain/enums';
import type { ConditionName } from './conditions';
import type { RollMode } from './resolution';
import type { DamageType } from './values';

export interface OperationDice {
  readonly baseCount: number;
  readonly sides: number;
  readonly modifier: number;
  readonly perSlotCount: number;
  readonly perSlotModifier: number;
  readonly cantripUpgrade: boolean;
  readonly minimumTotal?: number;
  readonly maximumTotal?: number;
  readonly rerollBelow?: {
    readonly threshold: number;
    readonly maximumRerollsPerDie: 1;
  };
}

export type DamageTypeOperation =
  | { readonly kind: 'fixed'; readonly damageType: DamageType }
  | {
      readonly kind: 'conversion';
      readonly from: DamageType;
      readonly to: DamageType;
    };

export type TargetDamageScaling =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'target_size';
      readonly additionalDiceBySize: Readonly<Record<KnownCreatureSize, number>>;
    }
  | {
      readonly kind: 'target_missing_hit_points';
      readonly hitPointsPerAdditionalDie: number;
      readonly maximumAdditionalDice: number;
    };

export interface ThresholdDamageRider {
  readonly minimumDamage: number;
  readonly condition: Exclude<ConditionName, 'Exhaustion'>;
  readonly durationRounds: number;
  readonly expiresAt: 'target_start' | 'target_end';
}

export interface DamageOperationPacket {
  readonly damageType: DamageTypeOperation;
  readonly dice: OperationDice;
  readonly scaling: TargetDamageScaling;
  readonly thresholdRider: ThresholdDamageRider | null;
}

export type DamageOperationDelivery =
  | { readonly kind: 'automatic' }
  | {
      readonly kind: 'save';
      readonly ability: Ability;
      readonly rollMode: RollMode;
      readonly onSuccess: 'none' | 'half';
    };

export type DamageOperationTiming =
  | { readonly kind: 'immediate' }
  | {
      readonly kind: 'recurring';
      readonly initial: 'none' | 'immediate';
      readonly tick: 'target_start' | 'target_end';
      readonly durationRounds: number;
      readonly concentration: boolean;
    };

/** Shared by imported spell operations and actionable party/content features. */
export interface DamageOperationSpec {
  readonly delivery: DamageOperationDelivery;
  /** Every packet is a distinct resolution and consumes its own RNG draws. */
  readonly instancesPerTarget: number;
  readonly packets: readonly DamageOperationPacket[];
  readonly timing: DamageOperationTiming;
}
