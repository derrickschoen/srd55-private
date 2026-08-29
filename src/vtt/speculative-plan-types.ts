import type { ConditionName } from '../combat/conditions';
import type {
  CombatantId,
  EncounterBranchId,
  EncounterSessionId,
  EngineZoneId,
} from '../combat/values';
import type { EngineTargetSelector } from './engine-query-port';
import type { EngineTurnIntent } from './intent-resolver';
import type { ReactionGuidanceDeclaration } from './reaction-guidance';

export type GuardConditionIdentity =
  | {
      readonly name: Exclude<ConditionName, 'Charmed' | 'Frightened' | 'Grappled' | 'Exhaustion'>;
    }
  | {
      readonly name: 'Charmed' | 'Frightened' | 'Grappled';
      readonly source: CombatantId;
    }
  | {
      readonly name: 'Exhaustion';
      readonly level: 1 | 2 | 3 | 4 | 5 | 6;
    };

export interface EngineSelectorRef {
  readonly actorId: CombatantId;
  readonly selector: EngineTargetSelector;
}

export type HpComparison = 'at_most' | 'above';
export type HpThresholdPercent = 25 | 50 | 75;

export type GuardResource =
  | { readonly kind: 'reaction' }
  | { readonly kind: 'legendary_action' }
  | { readonly kind: 'legendary_resistance' }
  | {
      readonly kind: 'spell_slot';
      readonly level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    };

export type ScenarioFactAtom =
  | {
      readonly kind: 'life_state_is';
      readonly subject: EngineSelectorRef;
      readonly value: 'living' | 'dying' | 'stable' | 'dead';
    }
  | {
      readonly kind: 'hp_percent';
      readonly subject: EngineSelectorRef;
      readonly comparison: HpComparison;
      readonly threshold: HpThresholdPercent;
    }
  | {
      readonly kind: 'adjacency_is';
      readonly left: EngineSelectorRef;
      readonly right: EngineSelectorRef;
      readonly value: boolean;
    }
  | {
      readonly kind: 'within_action_reach_is';
      readonly actor: EngineSelectorRef;
      readonly actionId: string;
      readonly target: EngineSelectorRef;
      readonly value: boolean;
    }
  | {
      readonly kind: 'visibility_is';
      readonly observer: EngineSelectorRef;
      readonly subject: EngineSelectorRef;
      readonly value: boolean;
    }
  | {
      readonly kind: 'zone_occupancy_is';
      readonly subject: EngineSelectorRef;
      readonly zoneId: EngineZoneId;
      readonly value: 'inside' | 'outside';
    }
  | {
      readonly kind: 'condition_is';
      readonly subject: EngineSelectorRef;
      readonly condition: GuardConditionIdentity;
      readonly present: boolean;
    }
  | {
      readonly kind: 'resource_available_is';
      readonly subject: EngineSelectorRef;
      readonly resource: GuardResource;
      readonly available: boolean;
    }
  | {
      readonly kind: 'concentration_is';
      readonly subject: EngineSelectorRef;
      readonly active: boolean;
    };

export interface HostSplitCandidate {
  readonly candidateId: string;
  readonly rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly factKey: string;
  readonly baseline: ScenarioFactAtom;
  readonly flipped: ScenarioFactAtom;
  readonly referencedIntentCount: number;
  readonly influencingPlayerIds: readonly CombatantId[];
  readonly summedMovementRadiusFeet: number;
  readonly volatilityScore: number;
}

export interface HostScenario {
  readonly scenarioId: string;
  readonly ordinal: 1 | 2 | 3 | 4;
  readonly kind: 'no_material_change' | 'single_candidate_flip';
  readonly flippedCandidateId: string | null;
  readonly facts: readonly ScenarioFactAtom[];
}

export interface SpeculativeRoundPlanV2 {
  readonly kind: 'speculative_round_plan';
  readonly schemaVersion: 2;
  readonly runId: EncounterSessionId;
  readonly encounterBranchId: EncounterBranchId;
  readonly requestId: string;
  readonly sourceRevision: number;
  readonly sourceDigest: string;
  readonly stateHandle: string;
  readonly targetRoom: number;
  readonly targetMonsterRound: number;
  readonly refreshGeneration: 0 | 1 | 2;
  readonly branches: readonly {
    readonly scenarioId: string;
    readonly intents: readonly EngineTurnIntent[];
  }[];
  /** D401 remains inert until a materialized ordinary proposal is authorized. */
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
  readonly idempotencyKey: string;
}

export interface QueuedSpeculativePlanEnvelope extends SpeculativeRoundPlanV2 {
  readonly status: 'QUEUED-SPECULATIVE';
  readonly speculativePlanId: string;
  readonly actorIds: readonly CombatantId[];
  readonly scenarioMenu: readonly HostSplitCandidate[];
  readonly scenarios: readonly HostScenario[];
}

export interface SpeculativePlanSink {
  append(envelope: QueuedSpeculativePlanEnvelope): void;
}
