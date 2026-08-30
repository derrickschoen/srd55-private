import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import type { CombatantId, EngineZoneId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  enginePlanningCombatantFacts,
  enginePlanningSemanticZones,
} from './engine-query-port';
import {
  pureIntentResolver,
  type EngineIntentBranch,
  type EngineIntentResolution,
  type EngineTurnIntent,
} from './intent-resolver';
import type { GuardConditionIdentity } from './speculative-plan-types';

export const PLAN_RELEVANCE_POLICY_VERSION = 'plan-relevance-v1' as const;
export const PLAN_MATERIALITY_POLICY_HASH = sha256(canonicalJson({
  policy: PLAN_RELEVANCE_POLICY_VERSION,
  movementCostBucketFeet: 10,
  forcedDisplacementThresholdFeet: 10,
  wakeRules: [
    'life_state_changed',
    'open_monster_set_changed',
    'intent_resolution_signature_changed',
    'relevant_condition_changed',
    'concentration_broken',
    'relevant_forced_displacement_at_least_10_feet',
    'relevant_board_presence_or_zone_activity_lost',
  ],
  deliberateIgnores: [
    'hp_without_life_or_selector_change',
    'temporary_hp_alone',
    'voluntary_movement_without_intent_change',
    'forced_movement_under_10_feet',
    'reaction_availability_without_validity_change',
    'unrelated_condition_change',
    'path_change_with_same_target_and_bucket',
    'presentation_and_dice',
    'pc_plan_deviation_without_material_drift',
  ],
}));

export type PlanRelevanceAnchor =
  | { readonly kind: 'combatant'; readonly combatantId: CombatantId }
  | { readonly kind: 'semantic_zone'; readonly zoneId: EngineZoneId };

export type PlanRelevanceTurnEvent =
  | {
      readonly kind: 'concentration_broken';
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: 'forced_displacement';
      readonly combatantId: CombatantId;
      readonly distanceFeet: number;
    };

export interface PlanRelevanceContext {
  readonly state: EncounterState;
  readonly openMonsterActorIds: readonly CombatantId[];
  readonly remainingIntents: readonly EngineTurnIntent[];
  readonly explicitEngagementAnchors?: readonly PlanRelevanceAnchor[];
  readonly turnEvents?: readonly PlanRelevanceTurnEvent[];
  readonly additionalRelevantCombatantIds?: readonly CombatantId[];
}

export interface PlanRelevanceBranchRecord {
  readonly valid: boolean;
  readonly resolvedAction: string | null;
  readonly resolvedTarget: CombatantId | null;
  readonly refusalCodes: readonly string[];
  readonly movementCostBucketFeet: number | null;
}

export interface PlanRelevanceIntentRecord {
  readonly actorId: CombatantId;
  readonly selectedBranch: 'primary' | 'fallback' | 'none';
  readonly primary: PlanRelevanceBranchRecord;
  readonly fallback: PlanRelevanceBranchRecord | null;
}

export interface PlanRelevanceCombatantRecord {
  readonly combatantId: CombatantId;
  readonly life: 'living' | 'dying' | 'stable' | 'dead';
  readonly boardPresent: boolean;
  readonly position: GridCell | null;
  readonly conditionFlags: readonly GuardConditionIdentity[];
  readonly concentrating: boolean;
}

export interface PlanRelevanceRecord {
  readonly policy: typeof PLAN_RELEVANCE_POLICY_VERSION;
  readonly openMonsterActorIds: readonly CombatantId[];
  readonly intents: readonly PlanRelevanceIntentRecord[];
  readonly lifeStates: readonly {
    readonly combatantId: CombatantId;
    readonly life: 'living' | 'dying' | 'stable' | 'dead';
  }[];
  readonly relevantCombatants: readonly PlanRelevanceCombatantRecord[];
  readonly referencedSemanticZones: readonly {
    readonly zoneId: EngineZoneId;
    readonly active: boolean;
  }[];
  readonly relevantTurnEvents: readonly PlanRelevanceTurnEvent[];
}

export interface PlanRelevanceSnapshot {
  readonly record: PlanRelevanceRecord;
  readonly digest: string;
}

export type PlanMaterialityReasonCode =
  | 'LIFE_STATE_CHANGED'
  | 'OPEN_MONSTER_SET_CHANGED'
  | 'INTENT_RESOLUTION_CHANGED'
  | 'RELEVANT_CONDITION_CHANGED'
  | 'CONCENTRATION_BROKEN'
  | 'FORCED_DISPLACEMENT_AT_LEAST_10_FEET'
  | 'RELEVANT_COMBATANT_DISAPPEARED'
  | 'REFERENCED_SEMANTIC_ZONE_BECAME_INACTIVE';

export interface PlanMaterialityResult {
  readonly policy: typeof PLAN_RELEVANCE_POLICY_VERSION;
  readonly policyHash: string;
  readonly material: boolean;
  readonly beforeDigest: string;
  readonly afterDigest: string;
  readonly reasonCodes: readonly PlanMaterialityReasonCode[];
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function movementBucket(feet: number): number {
  return Math.floor(feet / 10) * 10;
}

function branchRecord(
  state: EncounterState,
  actorId: CombatantId,
  branch: EngineIntentBranch,
): PlanRelevanceBranchRecord {
  const resolution = pureIntentResolver.resolve(state, { ...branch, actorId, fallback: null });
  return resolution.valid
    ? {
        valid: true,
        resolvedAction: resolution.mechanics.actionId,
        resolvedTarget: resolution.mechanics.targetId,
        refusalCodes: uniqueSorted(resolution.refusals.map((refusal) => refusal.code)),
        movementCostBucketFeet: movementBucket(resolution.mechanics.movementCostFeet),
      }
    : {
        valid: false,
        resolvedAction: null,
        resolvedTarget: null,
        refusalCodes: uniqueSorted(resolution.refusals.map((refusal) => refusal.code)),
        movementCostBucketFeet: null,
      };
}

function selectedBranch(resolution: EngineIntentResolution): PlanRelevanceIntentRecord['selectedBranch'] {
  return resolution.valid ? resolution.selectedBranch : 'none';
}

function intentRecord(state: EncounterState, intent: EngineTurnIntent): PlanRelevanceIntentRecord {
  return {
    actorId: intent.actorId,
    selectedBranch: selectedBranch(pureIntentResolver.resolve(state, intent)),
    primary: branchRecord(state, intent.actorId, intent),
    fallback: intent.fallback === null ? null : branchRecord(state, intent.actorId, intent.fallback),
  };
}

function explicitCombatantAnchors(intents: readonly EngineTurnIntent[]): readonly CombatantId[] {
  return intents.flatMap((intent) => [intent.engagement.anchor, intent.fallback?.engagement.anchor]
    .flatMap((anchor) => anchor?.kind === 'combatant' ? [anchor.combatantId] : []));
}

function resolvedTargets(intents: readonly PlanRelevanceIntentRecord[]): readonly CombatantId[] {
  return intents.flatMap((intent) => [intent.primary, intent.fallback]
    .flatMap((branch) => branch?.resolvedTarget === null || branch?.resolvedTarget === undefined
      ? []
      : [branch.resolvedTarget]));
}

function canonicalConditions(
  conditions: readonly GuardConditionIdentity[],
): readonly GuardConditionIdentity[] {
  return [...conditions].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

function canonicalTurnEvents(events: readonly PlanRelevanceTurnEvent[]): readonly PlanRelevanceTurnEvent[] {
  return [...events].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

export function createPlanRelevanceRecord(context: PlanRelevanceContext): PlanRelevanceRecord {
  const openMonsterActorIds = uniqueSorted(context.openMonsterActorIds);
  const open = new Set(openMonsterActorIds);
  const remaining = context.remainingIntents
    .filter((intent) => open.has(intent.actorId))
    .sort((left, right) => left.actorId.localeCompare(right.actorId));
  const intents = remaining.map((intent) => intentRecord(context.state, intent));
  const configuredAnchors = context.explicitEngagementAnchors ?? [];
  const relevantIds = uniqueSorted([
    ...openMonsterActorIds,
    ...resolvedTargets(intents),
    ...explicitCombatantAnchors(remaining),
    ...configuredAnchors.flatMap((anchor) => anchor.kind === 'combatant' ? [anchor.combatantId] : []),
    ...(context.additionalRelevantCombatantIds ?? []),
  ]);
  const byCombatant = new Map(context.state.combatants.map((combatant) =>
    [combatant.profile.id, combatant] as const));
  const positions = new Map(context.state.tokens.map((token) =>
    [token.combatantId, token.position] as const));
  const relevantCombatants = relevantIds.flatMap((combatantId): readonly PlanRelevanceCombatantRecord[] => {
    const combatant = byCombatant.get(combatantId);
    if (combatant === undefined) return [];
    const position = positions.get(combatantId);
    const planning = enginePlanningCombatantFacts(context.state, combatantId);
    return [{
      combatantId,
      life: combatant.life,
      boardPresent: position !== undefined,
      position: position === undefined ? null : { ...position },
      conditionFlags: canonicalConditions(planning.conditionFlags),
      concentrating: planning.concentrating,
    }];
  });
  const zoneIds = uniqueSorted(configuredAnchors.flatMap((anchor) =>
    anchor.kind === 'semantic_zone' ? [anchor.zoneId] : []));
  const zoneStates = new Map(enginePlanningSemanticZones(context.state).map((zone) =>
    [zone.id, zone.active] as const));
  return {
    policy: PLAN_RELEVANCE_POLICY_VERSION,
    openMonsterActorIds,
    intents,
    lifeStates: context.state.combatants
      .map((combatant) => ({ combatantId: combatant.profile.id, life: combatant.life }))
      .sort((left, right) => left.combatantId.localeCompare(right.combatantId)),
    relevantCombatants,
    referencedSemanticZones: zoneIds.map((zoneId) => ({
      zoneId,
      active: zoneStates.get(zoneId) ?? false,
    })),
    relevantTurnEvents: canonicalTurnEvents(context.turnEvents ?? []),
  };
}

export function hashPlanRelevanceRecord(record: PlanRelevanceRecord): string {
  return sha256(canonicalJson(record));
}

export function createPlanRelevanceSnapshot(context: PlanRelevanceContext): PlanRelevanceSnapshot {
  const record = createPlanRelevanceRecord(context);
  return { record, digest: hashPlanRelevanceRecord(record) };
}

function recordsById<T extends { readonly combatantId: CombatantId }>(
  records: readonly T[],
): ReadonlyMap<CombatantId, T> {
  return new Map(records.map((record) => [record.combatantId, record] as const));
}

function intentsByActor(
  records: readonly PlanRelevanceIntentRecord[],
): ReadonlyMap<CombatantId, PlanRelevanceIntentRecord> {
  return new Map(records.map((record) => [record.actorId, record] as const));
}

export function evaluatePlanMateriality(input: {
  readonly before: PlanRelevanceContext;
  readonly after: PlanRelevanceContext;
}): PlanMaterialityResult {
  const initialBefore = createPlanRelevanceRecord({ ...input.before, turnEvents: [] });
  const initialAfter = createPlanRelevanceRecord(input.after);
  const relevantUnion = uniqueSorted([
    ...initialBefore.relevantCombatants.map((entry) => entry.combatantId),
    ...initialAfter.relevantCombatants.map((entry) => entry.combatantId),
  ]);
  const before = createPlanRelevanceSnapshot({
    ...input.before,
    turnEvents: [],
    additionalRelevantCombatantIds: relevantUnion,
  });
  const after = createPlanRelevanceSnapshot({
    ...input.after,
    additionalRelevantCombatantIds: relevantUnion,
  });
  return comparePlanRelevanceSnapshots(before, after);
}

export function comparePlanRelevanceSnapshots(
  before: PlanRelevanceSnapshot,
  after: PlanRelevanceSnapshot,
): PlanMaterialityResult {
  const reasons: PlanMaterialityReasonCode[] = [];

  if (canonicalJson(before.record.lifeStates) !== canonicalJson(after.record.lifeStates)) {
    reasons.push('LIFE_STATE_CHANGED');
  }
  if (canonicalJson(before.record.openMonsterActorIds) !== canonicalJson(after.record.openMonsterActorIds)) {
    reasons.push('OPEN_MONSTER_SET_CHANGED');
  }
  const beforeIntents = intentsByActor(before.record.intents);
  const afterIntents = intentsByActor(after.record.intents);
  const afterOpen = new Set(after.record.openMonsterActorIds);
  if (before.record.openMonsterActorIds.some((actorId) =>
    afterOpen.has(actorId) &&
    canonicalJson(beforeIntents.get(actorId) ?? null) !==
      canonicalJson(afterIntents.get(actorId) ?? null))) {
    reasons.push('INTENT_RESOLUTION_CHANGED');
  }
  const beforeCombatants = recordsById(before.record.relevantCombatants);
  const afterCombatants = recordsById(after.record.relevantCombatants);
  if ([...beforeCombatants].some(([id, combatant]) => {
    const next = afterCombatants.get(id);
    return next !== undefined &&
      canonicalJson(combatant.conditionFlags) !== canonicalJson(next.conditionFlags);
  })) {
    reasons.push('RELEVANT_CONDITION_CHANGED');
  }
  if (after.record.relevantTurnEvents.some((event) => event.kind === 'concentration_broken')) {
    reasons.push('CONCENTRATION_BROKEN');
  }
  const relevantIds = new Set([
    ...before.record.relevantCombatants.map((entry) => entry.combatantId),
    ...after.record.relevantCombatants.map((entry) => entry.combatantId),
  ]);
  if (after.record.relevantTurnEvents.some((event) =>
    event.kind === 'forced_displacement' && event.distanceFeet >= 10 &&
    relevantIds.has(event.combatantId))) {
    reasons.push('FORCED_DISPLACEMENT_AT_LEAST_10_FEET');
  }
  if ([...beforeCombatants].some(([id, combatant]) =>
    combatant.boardPresent && afterCombatants.get(id)?.boardPresent !== true)) {
    reasons.push('RELEVANT_COMBATANT_DISAPPEARED');
  }
  const afterZones = new Map(after.record.referencedSemanticZones.map((zone) =>
    [zone.zoneId, zone.active] as const));
  if (before.record.referencedSemanticZones.some((zone) =>
    zone.active && afterZones.get(zone.zoneId) !== true)) {
    reasons.push('REFERENCED_SEMANTIC_ZONE_BECAME_INACTIVE');
  }
  return {
    policy: PLAN_RELEVANCE_POLICY_VERSION,
    policyHash: PLAN_MATERIALITY_POLICY_HASH,
    material: reasons.length > 0,
    beforeDigest: before.digest,
    afterDigest: after.digest,
    reasonCodes: reasons,
  };
}
