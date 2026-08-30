import { canonicalJson } from '../commands/canonical-json';
import type { GridCell } from '../combat/grid';
import type {
  CombatantId,
  EncounterBranchId,
  EncounterSessionId,
  EngineZoneId,
} from '../combat/values';
import type { EncounterState } from '../combat/encounter';
import { sha256 } from '../crypto/sha256';
import type { DmBoardProjection } from './encounter-projections';
import type {
  GuardConditionIdentity,
  HostScenario,
  HostSplitCandidate,
} from './speculative-plan-types';
import type { PlanMaterialityReasonCode } from './plan-materiality';

export interface EngineProjectedAction {
  readonly actionId: string;
  readonly kind: 'attack' | 'saving_throw' | 'multiattack' | 'spellcasting';
  readonly rangeFeet: number | null;
  readonly attackDelivery: import('./engine-query-port').EngineProjectedAttackDelivery | null;
  readonly normalRangeFeet: number | null;
  readonly longRangeFeet: number | null;
}

export interface EngineProjectedActionApproach {
  readonly actionId: string;
  readonly targetId: CombatantId;
  /** Canonical least path cost to a legal action origin; null means no path exists. */
  readonly minimumMovementFeet: number | null;
}

export interface EngineActionRegistry {
  actionsFor(combatantId: CombatantId): readonly EngineProjectedAction[];
  approachesFor(combatantId: CombatantId): readonly EngineProjectedActionApproach[];
  planningFactsFor(combatantId: CombatantId): EngineProjectionCombatantFacts;
  planningHitPointsFor(combatantId: CombatantId): number;
  planningHitPointMaximumFor(combatantId: CombatantId): number;
  semanticZones(): readonly EngineSemanticZone[];
}

export interface EngineProjectionCombatantFacts {
  readonly conditionFlags: readonly GuardConditionIdentity[];
  readonly temporaryHitPoints: number;
  readonly spellSlots: readonly { readonly level: number; readonly remaining: number }[];
  readonly legendaryActionUsesRemaining: number;
  readonly legendaryResistanceUsesRemaining: number;
  readonly concentrating: boolean;
}

export interface EngineSemanticZone {
  readonly id: EngineZoneId;
  readonly kind: 'persistent_area' | 'authored_encounter_zone';
  readonly memberCombatantIds: readonly CombatantId[];
  readonly active: boolean;
}

export interface EngineProjectionCombatant {
  readonly id: CombatantId;
  readonly name: string;
  readonly side: 'player_character' | 'monster';
  readonly life: 'living' | 'dying' | 'stable' | 'dead';
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly speedFeet: number;
  readonly reachFeet: number;
  readonly position: GridCell;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly reactionAvailable: boolean;
  readonly movementRemainingFeet: number;
  readonly actions: readonly EngineProjectedAction[];
  readonly actionApproaches: readonly EngineProjectedActionApproach[];
  readonly planning: EngineProjectionCombatantFacts;
}

export interface EngineDmProjection {
  readonly room: number | null;
  readonly round: number;
  readonly activeSide: 'players' | 'monsters' | 'none';
  readonly activeCombatant: CombatantId | null;
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly blockedCells: readonly GridCell[];
  readonly difficultTerrainCells: readonly GridCell[];
  readonly movementBlockingObjects: readonly {
    readonly id: string;
    readonly name: string;
    readonly cells: readonly GridCell[];
  }[];
  readonly combatants: readonly EngineProjectionCombatant[];
  readonly semanticZones: readonly EngineSemanticZone[];
}

export interface EngineHistoryEntry {
  readonly revision: number;
  readonly kind: string;
  readonly branchStatus: 'active' | 'void';
  readonly encounterRound: number;
}

export interface RuleReference {
  readonly ruleId: string;
  readonly sourceLocator: string;
}

export interface EngineStateCapsule {
  readonly format: 'engine-mcp-state-capsule';
  readonly schemaVersion: 1;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly digest: string;
  readonly generatedAt: string;
  readonly request: EngineCapsuleRequest | null;
  readonly projection: EngineDmProjection;
  readonly historyDelta: readonly EngineHistoryEntry[];
  readonly rulesIndex: readonly RuleReference[];
}

export type EngineOrdinaryRequestKind = 'round_plan' | 'plan_adjustment';

export interface EngineBaselineIntentDigest {
  readonly actorId: CombatantId;
  readonly intentDigest: string;
}

export interface EnginePlanAdjustmentMetadata {
  readonly parentPlanId: string;
  readonly baselinePlanHash: string;
  readonly triggerPcTurnId: string;
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly materialityReasonCodes: readonly PlanMaterialityReasonCode[];
  readonly baselineIntentDigests: readonly EngineBaselineIntentDigest[];
  readonly adjustmentBudget: 0 | 1 | 2;
}

export type EngineCapsuleRequest =
  | {
      /** Absent is the legacy wire representation of round_plan. */
      readonly kind?: 'round_plan';
      readonly requestId: string;
      readonly phase: 'initial' | 'correction';
      readonly correctionNumber: 0 | 1;
      readonly actors: readonly CombatantId[];
    }
  | ({
      readonly kind: 'plan_adjustment';
      readonly requestId: string;
      readonly phase: 'initial' | 'correction';
      readonly correctionNumber: 0 | 1;
      readonly actors: readonly CombatantId[];
    } & EnginePlanAdjustmentMetadata)
  | {
      readonly requestId: string;
      readonly phase: 'speculative';
      readonly correctionNumber: 0;
      readonly actors: readonly CombatantId[];
      readonly targetRoom: number;
      readonly targetMonsterRound: number;
      readonly refreshGeneration: 0 | 1 | 2;
      readonly scenarioMenu: readonly HostSplitCandidate[];
      readonly scenarios: readonly HostScenario[];
    };

export interface EngineStateReference {
  readonly runId: EncounterSessionId;
  readonly stateHandle: string;
  readonly expectedRevision: number;
}

type CapsuleDigestInput = Omit<EngineStateCapsule, 'digest' | 'generatedAt'>;

export function engineCapsuleRequestKind(
  request: Exclude<EngineCapsuleRequest, { readonly phase: 'speculative' }>,
): EngineOrdinaryRequestKind {
  return request.kind ?? 'round_plan';
}

function boundedText(value: string, label: string, maximum: number): string {
  if (value.trim().length === 0 || value.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) {
    throw new TypeError(`${label} must be bounded, non-empty text without control characters.`);
  }
  return value;
}

function activeSide(projection: DmBoardProjection): EngineDmProjection['activeSide'] {
  const active = projection.encounter.activeCombatant;
  if (active === null) return 'none';
  const combatant = projection.encounter.combatants.find((candidate) => candidate.id === active);
  return combatant?.kind === 'monster' ? 'monsters' : combatant === undefined ? 'none' : 'players';
}

/** Projects only DM-known query facts; reducer commands and persistence fields have no slot. */
export function projectEngineDmProjection(
  projection: DmBoardProjection,
  registry: EngineActionRegistry,
  room: number | null = null,
): EngineDmProjection {
  const encounter = projection.encounter;
  return {
    room,
    round: encounter.round,
    activeSide: activeSide(projection),
    activeCombatant: encounter.activeCombatant,
    bounds: { ...encounter.bounds },
    blockedCells: encounter.blockedCells.map((cell) => ({ ...cell })),
    difficultTerrainCells: encounter.environment.difficultTerrainRegions
      .flatMap((region) => region.cells)
      .map((cell) => ({ ...cell })),
    movementBlockingObjects: encounter.worldObjects
      .filter((object) => object.blocking.movement)
      .map((object) => ({
        id: boundedText(String(object.id), 'world object id', 200),
        name: boundedText(object.name, 'world object name', 200),
        cells: object.footprint.map((cell) => ({ ...cell })),
      })),
    combatants: encounter.combatants.map((combatant) => ({
      id: combatant.id,
      name: boundedText(combatant.name, 'combatant name', 200),
      side: combatant.kind,
      life: combatant.life,
      hitPoints: registry.planningHitPointsFor(combatant.id),
      hitPointMaximum: registry.planningHitPointMaximumFor(combatant.id),
      speedFeet: combatant.rules.speed,
      reachFeet: combatant.rules.reach,
      position: { ...combatant.position },
      actionAvailable: combatant.turn.action.kind !== 'spent',
      bonusActionAvailable: combatant.turn.bonusActionAvailable,
      reactionAvailable: combatant.turn.reactionAvailable,
      movementRemainingFeet: combatant.turn.movement.remaining,
      actions: registry.actionsFor(combatant.id).map((action) => ({ ...action })),
      actionApproaches: registry.approachesFor(combatant.id).map((approach) => ({ ...approach })),
      planning: structuredClone(registry.planningFactsFor(combatant.id)),
    })),
    semanticZones: structuredClone(registry.semanticZones()),
  };
}

/** Direct query-only projection used by the stdio package without importing the encounter reducer module. */
export function projectEngineEncounterState(
  state: EncounterState,
  registry: EngineActionRegistry,
  room: number | null = null,
): EngineDmProjection {
  const active = state.activeCombatant === null
    ? null
    : state.combatants.find((candidate) => candidate.profile.id === state.activeCombatant) ?? null;
  return {
    room,
    round: state.round,
    activeSide: active === null
      ? 'none'
      : active.profile.kind === 'monster' ? 'monsters' : 'players',
    activeCombatant: state.activeCombatant,
    bounds: { ...state.bounds },
    blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
    difficultTerrainCells: state.environment.difficultTerrainRegions
      .flatMap((region) => region.cells)
      .map((cell) => ({ ...cell })),
    movementBlockingObjects: state.worldObjects
      .filter((object) => object.blocking.movement)
      .map((object) => ({
        id: boundedText(String(object.id), 'world object id', 200),
        name: boundedText(object.name, 'world object name', 200),
        cells: object.footprint.map((cell) => ({ ...cell })),
      })),
    combatants: state.combatants.map((combatant) => {
      const token = state.tokens.find((candidate) => candidate.combatantId === combatant.profile.id);
      if (token === undefined) throw new TypeError(`Combatant ${String(combatant.profile.id)} has no query projection token.`);
      const rules = combatant.wildShape?.physical ?? combatant.profile.rules;
      return {
        id: combatant.profile.id,
        name: boundedText(combatant.profile.name, 'combatant name', 200),
        side: combatant.profile.kind,
        life: combatant.life,
        hitPoints: registry.planningHitPointsFor(combatant.profile.id),
        hitPointMaximum: registry.planningHitPointMaximumFor(combatant.profile.id),
        speedFeet: rules.speed,
        reachFeet: rules.reach,
        position: { ...token.position },
        actionAvailable: combatant.turn.action.kind !== 'spent',
        bonusActionAvailable: combatant.turn.bonusActionAvailable,
        reactionAvailable: combatant.turn.reactionAvailable,
        movementRemainingFeet: combatant.turn.movement.remaining,
        actions: registry.actionsFor(combatant.profile.id).map((action) => ({ ...action })),
        actionApproaches: registry.approachesFor(combatant.profile.id).map((approach) => ({ ...approach })),
        planning: structuredClone(registry.planningFactsFor(combatant.profile.id)),
      };
    }),
    semanticZones: structuredClone(registry.semanticZones()),
  };
}

export function projectEngineHistory(
  projection: DmBoardProjection,
  sinceRevision = 0,
): readonly EngineHistoryEntry[] {
  return projection.history
    .filter((entry) => entry.revision > sinceRevision)
    .map((entry) => ({
      revision: entry.revision,
      kind: boundedText(entry.transition.kind, 'history transition kind', 100),
      branchStatus: entry.void ? 'void' : 'active',
      encounterRound: entry.encounterRound,
    }));
}

function digestFor(input: CapsuleDigestInput): string {
  return sha256(canonicalJson(input));
}

function assertSpeculativeRequest(
  request: Extract<EngineCapsuleRequest, { readonly phase: 'speculative' }>,
): void {
  if (!Number.isSafeInteger(request.targetRoom) || request.targetRoom < 1 ||
    !Number.isSafeInteger(request.targetMonsterRound) || request.targetMonsterRound < 1 ||
    request.actors.length === 0 || new Set(request.actors).size !== request.actors.length ||
    request.scenarioMenu.length < 1 || request.scenarioMenu.length > 8) {
    throw new RangeError('Speculative capsule target, actor set, and menu must be bounded and non-empty.');
  }
  const ordered = [...request.scenarioMenu].sort((left, right) => left.rank - right.rank);
  if (ordered.some((candidate, index) => candidate.rank !== index + 1) ||
    new Set(ordered.map((candidate) => candidate.factKey)).size !== ordered.length) {
    throw new RangeError('Speculative capsule candidates require contiguous ranks and unique fact keys.');
  }
  const selected = ordered.slice(0, 3);
  if (request.scenarios.length !== selected.length + 1) {
    throw new RangeError('Speculative capsule scenarios must contain one default plus each selected single flip.');
  }
  for (const [index, scenario] of request.scenarios.entries()) {
    const expectedFacts = selected.map((candidate, factIndex) =>
      index > 0 && factIndex === index - 1 ? candidate.flipped : candidate.baseline);
    if (scenario.ordinal !== index + 1 ||
      scenario.kind !== (index === 0 ? 'no_material_change' : 'single_candidate_flip') ||
      scenario.flippedCandidateId !== (index === 0 ? null : selected[index - 1]?.candidateId ?? null) ||
      canonicalJson(scenario.facts) !== canonicalJson(expectedFacts)) {
      throw new RangeError('Speculative capsule scenarios must be canonical Hamming-0/Hamming-1 vectors.');
    }
  }
}

function assertPlanAdjustmentRequest(
  request: Extract<EngineCapsuleRequest, { readonly kind: 'plan_adjustment' }>,
): void {
  const actorIds = [...request.actors];
  const digestActors = request.baselineIntentDigests.map((entry) => entry.actorId);
  const expectedBudget = Math.min(actorIds.length, 2);
  if (
    actorIds.length === 0 ||
    new Set(actorIds).size !== actorIds.length ||
    request.adjustmentBudget !== expectedBudget ||
    request.baselineIntentDigests.length !== actorIds.length ||
    new Set(digestActors).size !== digestActors.length ||
    actorIds.some((actorId) => !digestActors.includes(actorId))
  ) {
    throw new RangeError('Plan adjustment actors, baseline intent digests, and budget must match exactly.');
  }
  if (
    request.parentPlanId.trim().length === 0 ||
    request.triggerPcTurnId.trim().length === 0 ||
    !/^[0-9a-f]{64}$/u.test(request.baselinePlanHash) ||
    request.baselineIntentDigests.some((entry) => !/^[0-9a-f]{64}$/u.test(entry.intentDigest))
  ) {
    throw new TypeError('Plan adjustment correlation ids and hashes must be non-empty and canonical.');
  }
  if (
    !Number.isSafeInteger(request.beforeRevision) || request.beforeRevision < 0 ||
    !Number.isSafeInteger(request.afterRevision) || request.afterRevision < request.beforeRevision ||
    request.materialityReasonCodes.length === 0 ||
    new Set(request.materialityReasonCodes).size !== request.materialityReasonCodes.length
  ) {
    throw new RangeError('Plan adjustment revisions and materiality reasons must describe one material PC turn.');
  }
}

export function createEngineStateCapsule(input: {
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly generatedAt: string;
  readonly request: EngineStateCapsule['request'];
  readonly projection: EngineDmProjection;
  readonly historyDelta?: readonly EngineHistoryEntry[];
  readonly rulesIndex?: readonly RuleReference[];
}): EngineStateCapsule {
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new TypeError('Capsule revision must be a positive safe integer.');
  }
  if (Number.isNaN(Date.parse(input.generatedAt))) {
    throw new TypeError('Capsule generatedAt must be an ISO date-time string.');
  }
  if (input.request?.phase === 'speculative') assertSpeculativeRequest(input.request);
  if (input.request !== null && input.request.phase !== 'speculative' &&
    input.request.kind === 'plan_adjustment') {
    assertPlanAdjustmentRequest(input.request);
  }
  const body: CapsuleDigestInput = {
    format: 'engine-mcp-state-capsule',
    schemaVersion: 1,
    runId: input.runId,
    branchId: input.branchId,
    revision: input.revision,
    request: input.request === null ? null : structuredClone(input.request),
    projection: structuredClone(input.projection),
    historyDelta: structuredClone(input.historyDelta ?? []),
    rulesIndex: structuredClone(input.rulesIndex ?? []),
  };
  return deepFreeze({
    ...body,
    digest: digestFor(body),
    generatedAt: new Date(input.generatedAt).toISOString(),
  });
}

export function engineStateHandle(capsule: EngineStateCapsule): string {
  return `engine-state:${capsule.digest}`;
}

export function verifyEngineStateCapsule(capsule: EngineStateCapsule): boolean {
  const { digest, generatedAt: _generatedAt, ...body } = capsule;
  return digest === digestFor(body);
}

export class StaleEngineStateError extends Error {
  override readonly name = 'StaleEngineStateError' as const;

  constructor() {
    super('STALE_STATE');
  }
}

export interface ReadonlyStateCapsuleSource {
  read(reference: EngineStateReference): EngineStateCapsule;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

/** In-memory DI seam for increment 1; filesystem capsule loading belongs to transport wiring. */
export class FixedReadonlyStateCapsuleSource implements ReadonlyStateCapsuleSource {
  readonly #capsule: EngineStateCapsule;

  constructor(capsule: EngineStateCapsule) {
    if (!verifyEngineStateCapsule(capsule)) throw new TypeError('State capsule digest is invalid.');
    this.#capsule = deepFreeze(structuredClone(capsule));
  }

  read(reference: EngineStateReference): EngineStateCapsule {
    if (
      reference.runId !== this.#capsule.runId ||
      reference.expectedRevision !== this.#capsule.revision ||
      reference.stateHandle !== engineStateHandle(this.#capsule) ||
      !verifyEngineStateCapsule(this.#capsule)
    ) throw new StaleEngineStateError();
    return this.#capsule;
  }
}

export const engineStateCapsuleInternals = { digestFor };
