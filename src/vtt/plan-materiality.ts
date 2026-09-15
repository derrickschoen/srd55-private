import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import type { CombatantId, EngineZoneId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import { engineActionRegistryForEnvironment } from './engine-query-port';
import { resolveEngineActorOption, type EngineOfferableOption } from './intent-resolver';
import { projectFutureMonsterTurns } from './monster-planning-state';
import type { EngineOptionEnvironment } from './offers/build-offer-environment';
import type { GuardConditionIdentity } from './speculative-plan-types';

export const PLAN_RELEVANCE_POLICY_VERSION = 'plan-relevance-v2-composite' as const;
export const PLAN_MATERIALITY_POLICY_HASH = sha256(canonicalJson({
  policy: PLAN_RELEVANCE_POLICY_VERSION,
  movementCostBucketFeet: 10,
  forcedDisplacementThresholdFeet: 10,
  wakeRules: [
    'life_state_changed', 'open_monster_set_changed', 'proposal_resolution_signature_changed',
    'relevant_condition_changed', 'concentration_broken',
    'relevant_forced_displacement_at_least_10_feet',
    'relevant_board_presence_or_zone_activity_lost',
  ],
}));

export type PlanRelevanceAnchor =
  | { readonly kind: 'combatant'; readonly combatantId: CombatantId }
  | { readonly kind: 'semantic_zone'; readonly zoneId: EngineZoneId };

export type PlanRelevanceTurnEvent =
  | { readonly kind: 'concentration_broken'; readonly combatantId: CombatantId }
  | { readonly kind: 'forced_displacement'; readonly combatantId: CombatantId; readonly distanceFeet: number };

export interface PlanRelevanceContext {
  readonly state: EncounterState;
  readonly offerEnvironment: EngineOptionEnvironment;
  readonly openMonsterActorIds: readonly CombatantId[];
  readonly remainingOptions: readonly EngineOfferableOption[];
  readonly explicitEngagementAnchors?: readonly PlanRelevanceAnchor[];
  readonly turnEvents?: readonly PlanRelevanceTurnEvent[];
  readonly additionalRelevantCombatantIds?: readonly CombatantId[];
}

export interface PlanRelevanceProposalRecord {
  readonly actorId: CombatantId;
  readonly valid: boolean;
  readonly resolvedActions: readonly string[];
  readonly resolvedTargets: readonly CombatantId[];
  readonly refusalCodes: readonly string[];
  readonly movementCostBucketFeet: number | null;
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
  readonly proposals: readonly PlanRelevanceProposalRecord[];
  readonly lifeStates: readonly { readonly combatantId: CombatantId; readonly life: 'living' | 'dying' | 'stable' | 'dead' }[];
  readonly relevantCombatants: readonly PlanRelevanceCombatantRecord[];
  readonly referencedSemanticZones: readonly { readonly zoneId: EngineZoneId; readonly active: boolean }[];
  readonly relevantTurnEvents: readonly PlanRelevanceTurnEvent[];
}

export interface PlanRelevanceSnapshot { readonly record: PlanRelevanceRecord; readonly digest: string }

export type PlanMaterialityReasonCode =
  | 'LIFE_STATE_CHANGED'
  | 'OPEN_MONSTER_SET_CHANGED'
  | 'PROPOSAL_RESOLUTION_CHANGED'
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

function canonicalConditions(conditions: readonly GuardConditionIdentity[]): readonly GuardConditionIdentity[] {
  return [...conditions].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

function proposalRecord(
  state: EncounterState,
  option: EngineOfferableOption,
  offerEnvironment: EngineOptionEnvironment,
): PlanRelevanceProposalRecord {
  const resolution = resolveEngineActorOption(state, option, offerEnvironment);
  return resolution.valid
    ? {
        actorId: option.actorId,
        valid: true,
        resolvedActions: resolution.mechanics.actionSlots.map((use) =>
          use.spellId === null ? `${use.slot}:${use.kind}:${use.actionId}` : `${use.slot}:${use.kind}:${use.actionId}:${use.spellId}`),
        resolvedTargets: uniqueSorted(resolution.mechanics.actionSlots.flatMap((use) => use.targetIds)),
        refusalCodes: [],
        movementCostBucketFeet: Math.floor(resolution.mechanics.movementCostFeet / 10) * 10,
      }
    : {
        actorId: option.actorId,
        valid: false,
        resolvedActions: [],
        resolvedTargets: [],
        refusalCodes: [resolution.code],
        movementCostBucketFeet: null,
      };
}

function configuredCombatantAnchors(options: readonly EngineOfferableOption[]): readonly CombatantId[] {
  return options.flatMap((option) => {
    const anchor = option.movement.engagement.anchor;
    return anchor?.kind === 'combatant' ? [anchor.combatantId] : [];
  });
}

function canonicalTurnEvents(events: readonly PlanRelevanceTurnEvent[]): readonly PlanRelevanceTurnEvent[] {
  return [...events].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

export function createPlanRelevanceRecord(context: PlanRelevanceContext): PlanRelevanceRecord {
  const openMonsterActorIds = uniqueSorted(context.openMonsterActorIds);
  const planningState = projectFutureMonsterTurns(context.state, openMonsterActorIds);
  const registry = engineActionRegistryForEnvironment(context.state, context.offerEnvironment);
  const open = new Set(openMonsterActorIds);
  const remaining = context.remainingOptions.filter((option) => open.has(option.actorId))
    .sort((left, right) => left.actorId.localeCompare(right.actorId));
  const proposals = remaining.map((option) =>
    proposalRecord(planningState, option, context.offerEnvironment));
  const configuredAnchors = context.explicitEngagementAnchors ?? [];
  const relevantIds = uniqueSorted([
    ...openMonsterActorIds,
    ...proposals.flatMap((proposal) => proposal.resolvedTargets),
    ...configuredCombatantAnchors(remaining),
    ...configuredAnchors.flatMap((anchor) => anchor.kind === 'combatant' ? [anchor.combatantId] : []),
    ...(context.additionalRelevantCombatantIds ?? []),
  ]);
  const byCombatant = new Map(context.state.combatants.map((combatant) => [combatant.profile.id, combatant] as const));
  const positions = new Map(context.state.tokens.map((token) => [token.combatantId, token.position] as const));
  const relevantCombatants = relevantIds.flatMap((combatantId): readonly PlanRelevanceCombatantRecord[] => {
    const combatant = byCombatant.get(combatantId);
    if (combatant === undefined) return [];
    const position = positions.get(combatantId);
    const planning = registry.planningFactsFor(combatantId);
    return [{
      combatantId, life: combatant.life, boardPresent: position !== undefined,
      position: position === undefined ? null : { ...position },
      conditionFlags: canonicalConditions(planning.conditionFlags), concentrating: planning.concentrating,
    }];
  });
  const zoneIds = uniqueSorted(configuredAnchors.flatMap((anchor) => anchor.kind === 'semantic_zone' ? [anchor.zoneId] : []));
  const zoneStates = new Map(registry.semanticZones().map((zone) => [zone.id, zone.active] as const));
  return {
    policy: PLAN_RELEVANCE_POLICY_VERSION,
    openMonsterActorIds,
    proposals,
    lifeStates: context.state.combatants.map((combatant) => ({ combatantId: combatant.profile.id, life: combatant.life }))
      .sort((left, right) => left.combatantId.localeCompare(right.combatantId)),
    relevantCombatants,
    referencedSemanticZones: zoneIds.map((zoneId) => ({ zoneId, active: zoneStates.get(zoneId) ?? false })),
    relevantTurnEvents: canonicalTurnEvents(context.turnEvents ?? []),
  };
}

export function hashPlanRelevanceRecord(record: PlanRelevanceRecord): string { return sha256(canonicalJson(record)); }
export function createPlanRelevanceSnapshot(context: PlanRelevanceContext): PlanRelevanceSnapshot {
  const record = createPlanRelevanceRecord(context);
  return { record, digest: hashPlanRelevanceRecord(record) };
}

function recordsById<T extends { readonly combatantId: CombatantId }>(records: readonly T[]): ReadonlyMap<CombatantId, T> {
  return new Map(records.map((record) => [record.combatantId, record] as const));
}

function proposalsByActor(records: readonly PlanRelevanceProposalRecord[]): ReadonlyMap<CombatantId, PlanRelevanceProposalRecord> {
  return new Map(records.map((record) => [record.actorId, record] as const));
}

export function evaluatePlanMateriality(input: { readonly before: PlanRelevanceContext; readonly after: PlanRelevanceContext }): PlanMaterialityResult {
  const initialBefore = createPlanRelevanceRecord({ ...input.before, turnEvents: [] });
  const initialAfter = createPlanRelevanceRecord(input.after);
  const relevantUnion = uniqueSorted([
    ...initialBefore.relevantCombatants.map((entry) => entry.combatantId),
    ...initialAfter.relevantCombatants.map((entry) => entry.combatantId),
  ]);
  return comparePlanRelevanceSnapshots(
    createPlanRelevanceSnapshot({ ...input.before, turnEvents: [], additionalRelevantCombatantIds: relevantUnion }),
    createPlanRelevanceSnapshot({ ...input.after, additionalRelevantCombatantIds: relevantUnion }),
  );
}

export function comparePlanRelevanceSnapshots(before: PlanRelevanceSnapshot, after: PlanRelevanceSnapshot): PlanMaterialityResult {
  const reasons: PlanMaterialityReasonCode[] = [];
  if (canonicalJson(before.record.lifeStates) !== canonicalJson(after.record.lifeStates)) reasons.push('LIFE_STATE_CHANGED');
  if (canonicalJson(before.record.openMonsterActorIds) !== canonicalJson(after.record.openMonsterActorIds)) reasons.push('OPEN_MONSTER_SET_CHANGED');
  const beforeProposals = proposalsByActor(before.record.proposals);
  const afterProposals = proposalsByActor(after.record.proposals);
  const afterOpen = new Set(after.record.openMonsterActorIds);
  if (before.record.openMonsterActorIds.some((actorId) => afterOpen.has(actorId) &&
    canonicalJson(beforeProposals.get(actorId) ?? null) !== canonicalJson(afterProposals.get(actorId) ?? null))) {
    reasons.push('PROPOSAL_RESOLUTION_CHANGED');
  }
  const beforeCombatants = recordsById(before.record.relevantCombatants);
  const afterCombatants = recordsById(after.record.relevantCombatants);
  if ([...beforeCombatants].some(([id, combatant]) => {
    const next = afterCombatants.get(id);
    return next !== undefined && canonicalJson(combatant.conditionFlags) !== canonicalJson(next.conditionFlags);
  })) reasons.push('RELEVANT_CONDITION_CHANGED');
  if (after.record.relevantTurnEvents.some((event) => event.kind === 'concentration_broken')) reasons.push('CONCENTRATION_BROKEN');
  const relevantIds = new Set([...beforeCombatants.keys(), ...afterCombatants.keys()]);
  if (after.record.relevantTurnEvents.some((event) => event.kind === 'forced_displacement' &&
    event.distanceFeet >= 10 && relevantIds.has(event.combatantId))) reasons.push('FORCED_DISPLACEMENT_AT_LEAST_10_FEET');
  if ([...beforeCombatants].some(([id, combatant]) => combatant.boardPresent &&
    afterCombatants.get(id)?.boardPresent !== true)) reasons.push('RELEVANT_COMBATANT_DISAPPEARED');
  const afterZones = new Map(after.record.referencedSemanticZones.map((zone) => [zone.zoneId, zone.active] as const));
  if (before.record.referencedSemanticZones.some((zone) => zone.active && afterZones.get(zone.zoneId) !== true)) {
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
