import { canonicalJson } from '../commands/canonical-json';
import type { GridCell } from '../combat/grid';
import {
  combatantId,
  encounterBranchId,
  encounterSessionId,
  engineZoneId,
  type CombatantId,
  type EncounterBranchId,
  type EncounterSessionId,
  type EngineZoneId,
} from '../combat/values';
import type { CombatantObservation, EncounterState } from '../combat/encounter';
import {
  applySizeSteps,
  creatureSpace,
  decodeProjectedCreatureSpace,
  effectSequence,
  placementFromSerialized,
  sizedCombatantState,
  type CreatureSpace,
  type KnownCreatureSize,
  type SerializedPlacementMode,
} from '../combat/creature-space';
import { wildShapeRulesLens } from '../combat/wild-shape';
import { creatureSizes } from '../domain/enums';
import { terrainPassabilityAt } from '../combat/terrain';
import { sha256 } from '../crypto/sha256';
import type { DmBoardProjection } from './encounter-projections';
import type {
  GuardConditionIdentity,
  HostScenario,
  HostSplitCandidate,
} from './speculative-plan-types';
import type { PlanMaterialityReasonCode } from './plan-materiality';
import type { EngineOfferableOption } from './turn-proposal';
import type { EncounterTimelineProjection } from './session-timeline';
export const ENGINE_INITIATIVE_PROJECTION_POLICY = 'initiative-intel-v1' as const;

export interface EngineInitiativeProjection {
  readonly policy: typeof ENGINE_INITIATIVE_PROJECTION_POLICY;
  readonly timeline: EncounterTimelineProjection;
}

export interface EngineProjectedAction {
  readonly actionId: string;
  readonly slot: 'main' | 'bonus';
  readonly kind: 'attack' | 'saving_throw' | 'multiattack' | 'spellcasting' | 'world_object';
  readonly available: boolean;
  readonly usesMaximum: number | null;
  readonly usesRemaining: number | null;
  readonly componentActionIds: readonly string[];
  readonly combination: 'any' | 'fixed' | 'one_attack_may_be_replaced' | null;
  readonly spellIds: readonly string[];
  readonly worldObjectId: string | null;
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
  optionsFor(combatantId: CombatantId): readonly EngineOfferableOption[];
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

interface EngineProjectionCombatantIdentity {
  readonly id: CombatantId;
  readonly name: string;
  readonly side: 'player_character' | 'monster';
  readonly life: 'living' | 'dying' | 'stable' | 'dead';
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly speedFeet: number;
  readonly reachFeet: number;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly reactionAvailable: boolean;
  readonly movementRemainingFeet: number;
  readonly actions: readonly EngineProjectedAction[];
  readonly actionApproaches: readonly EngineProjectedActionApproach[];
  readonly options: readonly EngineOfferableOption[];
  readonly planning: EngineProjectionCombatantFacts;
}

export interface EngineProjectionPlacedCombatant extends EngineProjectionCombatantIdentity {
  readonly placementStatus: 'placed';
  readonly position: GridCell;
  readonly effectiveSize: KnownCreatureSize;
  readonly placementMode: SerializedPlacementMode;
  readonly footprint: readonly [GridCell, ...GridCell[]];
}

export interface EngineProjectionPlacementPendingCombatant extends EngineProjectionCombatantIdentity {
  readonly placementStatus: 'placement_pending';
  readonly pendingReason: EncounterState['adjudicationPending'][number]['kind'];
}

export type EngineProjectionCombatant =
  | EngineProjectionPlacedCombatant
  | EngineProjectionPlacementPendingCombatant;

export function isEngineProjectionPlacedCombatant(
  combatant: EngineProjectionCombatant,
): combatant is EngineProjectionPlacedCombatant {
  return combatant.placementStatus === 'placed';
}

export interface EngineDmProjection {
  readonly room: number | null;
  readonly round: number;
  readonly activeSide: 'players' | 'monsters' | 'none';
  readonly activeCombatant: CombatantId | null;
  readonly initiative: EngineInitiativeProjection;
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly blockedCells: readonly GridCell[];
  readonly difficultTerrainCells: readonly GridCell[];
  readonly movementBlockingObjects: readonly {
    readonly id: string;
    readonly name: string;
    readonly cells: readonly GridCell[];
  }[];
  readonly combatants: readonly EngineProjectionCombatant[];
  readonly observationHistory: readonly CombatantObservation[];
  readonly semanticZones: readonly EngineSemanticZone[];
}

function projectedCreatureSpace(state: EncounterState, combatantId: CombatantId): CreatureSpace<KnownCreatureSize> {
  const combatant = state.combatants.find((candidate) => candidate.profile.id === combatantId);
  const token = state.tokens.find((candidate) => candidate.combatantId === combatantId);
  if (combatant === undefined || token === undefined) {
    throw new TypeError(`Combatant ${String(combatantId)} has no query projection placement.`);
  }
  const rules = combatant.wildShape === undefined
    ? combatant.profile.rules
    : wildShapeRulesLens(combatant.profile.rules, combatant.wildShape);
  if (rules.sizeCategory === undefined) {
    throw new TypeError(`Combatant ${String(combatantId)} has no mechanical creature size.`);
  }
  const size = applySizeSteps(rules.sizeCategory, state.effects.flatMap((effect) =>
    effect.targets.includes(combatantId) && effect.payload.kind === 'size_alteration' && 'delta' in effect.payload
      ? [{ delta: effect.payload.delta, appliedSequence: effectSequence(effect.payload.appliedSequence) }]
      : []));
  const sized = sizedCombatantState(size);
  return creatureSpace(sized, placementFromSerialized(sized, {
    anchor: token.position,
    mode: token.placementMode,
  }));
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
  readonly schemaVersion: 3;
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

export interface EngineBaselineProposalDigest {
  readonly actorId: CombatantId;
  readonly proposalDigest: string;
}

export interface EnginePlanAdjustmentMetadata {
  readonly parentPlanId: string;
  readonly baselinePlanHash: string;
  readonly triggerPcTurnId: string;
  readonly beforeRevision: number;
  readonly afterRevision: number;
  readonly materialityReasonCodes: readonly PlanMaterialityReasonCode[];
  readonly baselineProposalDigests: readonly EngineBaselineProposalDigest[];
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

export type EngineStateCapsuleDecodeErrorCode =
  | 'unsupported_version'
  | 'invalid_schema'
  | 'digest_mismatch';

export class EngineStateCapsuleDecodeError extends TypeError {
  override readonly name = 'EngineStateCapsuleDecodeError' as const;

  constructor(readonly code: EngineStateCapsuleDecodeErrorCode, message: string) {
    super(message);
  }
}

function capsuleRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', `${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function exactCapsuleKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', `${label} has unknown or missing keys.`);
  }
}

function capsuleText(value: unknown, label: string, maximum = 200): string {
  if (typeof value !== 'string') {
    throw new EngineStateCapsuleDecodeError('invalid_schema', `${label} must be text.`);
  }
  try {
    return boundedText(value, label, maximum);
  } catch (error) {
    throw new EngineStateCapsuleDecodeError(
      'invalid_schema',
      error instanceof Error ? error.message : `${label} is invalid.`,
    );
  }
}

function capsuleIdentity(
  value: unknown,
  label: string,
  decoder: (text: string) => string,
): string {
  const text = capsuleText(value, label);
  try {
    decoder(text);
  } catch (error) {
    throw new EngineStateCapsuleDecodeError(
      'invalid_schema',
      error instanceof Error ? error.message : `${label} is invalid.`,
    );
  }
  return text;
}

function capsuleInteger(value: unknown, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', `${label} must be a safe integer of at least ${String(minimum)}.`);
  }
  return value as number;
}

function capsuleArray(value: unknown, label: string, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', `${label} must be an array of at most ${String(maximum)} entries.`);
  }
  return value;
}

function decodeGridCell(value: unknown, label: string): GridCell {
  const record = capsuleRecord(value, label);
  exactCapsuleKeys(record, ['column', 'row'], label);
  return {
    column: capsuleInteger(record['column'], `${label}.column`),
    row: capsuleInteger(record['row'], `${label}.row`),
  };
}

function decodePlacementMode(value: unknown): SerializedPlacementMode {
  const record = capsuleRecord(value, 'placementMode');
  if (record['kind'] === 'normal') {
    exactCapsuleKeys(record, ['kind', 'actual'], 'placementMode');
  } else if (record['kind'] === 'squeezed') {
    exactCapsuleKeys(record, ['kind', 'actual', 'sizedFor'], 'placementMode');
  } else {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'placementMode.kind is invalid.');
  }
  return structuredClone(record) as SerializedPlacementMode;
}

function decodeCapsuleRequest(value: unknown): EngineCapsuleRequest | null {
  if (value === null) return null;
  const record = capsuleRecord(value, 'request');
  const commonKeys = ['requestId', 'phase', 'correctionNumber', 'actors'] as const;
  if (record['phase'] === 'speculative') {
    exactCapsuleKeys(record, [
      ...commonKeys, 'targetRoom', 'targetMonsterRound', 'refreshGeneration', 'scenarioMenu', 'scenarios',
    ], 'speculative request');
    if (record['correctionNumber'] !== 0) throw new EngineStateCapsuleDecodeError('invalid_schema', 'Speculative correctionNumber must be 0.');
    capsuleInteger(record['targetRoom'], 'request.targetRoom', 1);
    capsuleInteger(record['targetMonsterRound'], 'request.targetMonsterRound', 1);
    if (![0, 1, 2].includes(record['refreshGeneration'] as number)) {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'request.refreshGeneration is invalid.');
    }
    capsuleArray(record['scenarioMenu'], 'request.scenarioMenu', 8);
    capsuleArray(record['scenarios'], 'request.scenarios', 4);
  } else if (record['kind'] === 'plan_adjustment') {
    exactCapsuleKeys(record, [
      ...commonKeys, 'kind', 'parentPlanId', 'baselinePlanHash', 'triggerPcTurnId', 'beforeRevision',
      'afterRevision', 'materialityReasonCodes', 'baselineProposalDigests', 'adjustmentBudget',
    ], 'plan adjustment request');
    capsuleText(record['parentPlanId'], 'request.parentPlanId');
    capsuleText(record['baselinePlanHash'], 'request.baselinePlanHash', 64);
    capsuleText(record['triggerPcTurnId'], 'request.triggerPcTurnId');
    capsuleInteger(record['beforeRevision'], 'request.beforeRevision');
    capsuleInteger(record['afterRevision'], 'request.afterRevision');
    capsuleArray(record['materialityReasonCodes'], 'request.materialityReasonCodes', 100)
      .forEach((reason) => capsuleText(reason, 'request.materialityReasonCode', 100));
    capsuleArray(record['baselineProposalDigests'], 'request.baselineProposalDigests', 100)
      .forEach((value) => {
        const digest = capsuleRecord(value, 'baseline proposal digest');
        exactCapsuleKeys(digest, ['actorId', 'proposalDigest'], 'baseline proposal digest');
        capsuleIdentity(digest['actorId'], 'baselineProposalDigest.actorId', combatantId);
        if (!/^[0-9a-f]{64}$/u.test(capsuleText(digest['proposalDigest'], 'baselineProposalDigest.proposalDigest', 64))) {
          throw new EngineStateCapsuleDecodeError('invalid_schema', 'Baseline proposal digest is invalid.');
        }
      });
    if (![0, 1, 2].includes(record['adjustmentBudget'] as number)) {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'request.adjustmentBudget is invalid.');
    }
  } else {
    if (record['kind'] !== undefined && record['kind'] !== 'round_plan') {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'Ordinary request kind is invalid.');
    }
    exactCapsuleKeys(record, record['kind'] === undefined ? commonKeys : [...commonKeys, 'kind'], 'round-plan request');
  }
  capsuleText(record['requestId'], 'request.requestId');
  if (record['phase'] !== 'speculative' && record['phase'] !== 'initial' && record['phase'] !== 'correction') {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'request.phase is invalid.');
  }
  if (![0, 1].includes(record['correctionNumber'] as number)) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'request.correctionNumber is invalid.');
  }
  capsuleArray(record['actors'], 'request.actors', 100)
    .forEach((id) => capsuleIdentity(id, 'request.actor', combatantId));
  const decoded = structuredClone(record) as unknown as EngineCapsuleRequest;
  try {
    if (decoded.phase === 'speculative') assertSpeculativeRequest(decoded);
    else if (decoded.kind === 'plan_adjustment') assertPlanAdjustmentRequest(decoded);
  } catch (error) {
    throw new EngineStateCapsuleDecodeError(
      'invalid_schema', error instanceof Error ? error.message : 'Capsule request is invalid.',
    );
  }
  return decoded;
}

const projectionKeys = [
  'room', 'round', 'activeSide', 'activeCombatant', 'initiative', 'bounds', 'blockedCells',
  'difficultTerrainCells', 'movementBlockingObjects', 'combatants', 'observationHistory', 'semanticZones',
] as const;
const combatantIdentityKeys = [
  'id', 'name', 'side', 'life', 'hitPoints', 'hitPointMaximum', 'speedFeet', 'reachFeet',
  'actionAvailable', 'bonusActionAvailable', 'reactionAvailable', 'movementRemainingFeet',
  'actions', 'actionApproaches', 'options', 'planning',
] as const;
const placedCombatantKeys = [
  ...combatantIdentityKeys, 'placementStatus', 'position', 'effectiveSize', 'placementMode', 'footprint',
] as const;
const pendingCombatantKeys = [
  ...combatantIdentityKeys, 'placementStatus', 'pendingReason',
] as const;

function decodeProjectionCombatant(value: unknown): EngineProjectionCombatant {
  const record = capsuleRecord(value, 'projection combatant');
  const pending = record['placementStatus'] === 'placement_pending';
  exactCapsuleKeys(record, pending ? pendingCombatantKeys : placedCombatantKeys, 'projection combatant');
  capsuleIdentity(record['id'], 'combatant id', combatantId);
  capsuleText(record['name'], 'combatant name');
  if (record['side'] !== 'player_character' && record['side'] !== 'monster') {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Combatant side is invalid.');
  }
  if (!['living', 'dying', 'stable', 'dead'].includes(String(record['life']))) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Combatant life state is invalid.');
  }
  for (const key of ['hitPoints', 'hitPointMaximum', 'speedFeet', 'reachFeet', 'movementRemainingFeet'] as const) {
    capsuleInteger(record[key], `combatant.${key}`);
  }
  for (const key of ['actionAvailable', 'bonusActionAvailable', 'reactionAvailable'] as const) {
    if (typeof record[key] !== 'boolean') throw new EngineStateCapsuleDecodeError('invalid_schema', `combatant.${key} must be boolean.`);
  }
  capsuleArray(record['actions'], 'combatant.actions', 200);
  capsuleArray(record['actionApproaches'], 'combatant.actionApproaches', 1_000);
  capsuleArray(record['options'], 'combatant.options', 500);
  const planning = capsuleRecord(record['planning'], 'combatant.planning');
  exactCapsuleKeys(planning, [
    'conditionFlags', 'temporaryHitPoints', 'spellSlots', 'legendaryActionUsesRemaining',
    'legendaryResistanceUsesRemaining', 'concentrating',
  ], 'combatant.planning');
  capsuleArray(planning['conditionFlags'], 'combatant.planning.conditionFlags', 100)
    .forEach((value) => {
      const flag = capsuleRecord(value, 'combatant.planning.conditionFlag');
      const name = capsuleText(flag['name'], 'combatant.planning.conditionFlag.name', 100);
      if (name === 'Exhaustion') {
        exactCapsuleKeys(flag, ['name', 'level'], 'combatant.planning.conditionFlag');
        const level = capsuleInteger(flag['level'], 'combatant.planning.conditionFlag.level', 1);
        if (level > 6) throw new EngineStateCapsuleDecodeError('invalid_schema', 'Exhaustion level must be at most 6.');
      } else if (name === 'Charmed' || name === 'Frightened' || name === 'Grappled') {
        exactCapsuleKeys(flag, ['name', 'source'], 'combatant.planning.conditionFlag');
        capsuleIdentity(flag['source'], 'combatant.planning.conditionFlag.source', combatantId);
      } else {
        exactCapsuleKeys(flag, ['name'], 'combatant.planning.conditionFlag');
      }
    });
  capsuleInteger(planning['temporaryHitPoints'], 'combatant.planning.temporaryHitPoints');
  capsuleArray(planning['spellSlots'], 'combatant.planning.spellSlots', 20).forEach((value) => {
    const slot = capsuleRecord(value, 'combatant.planning.spellSlot');
    exactCapsuleKeys(slot, ['level', 'remaining'], 'combatant.planning.spellSlot');
    capsuleInteger(slot['level'], 'combatant.planning.spellSlot.level', 1);
    capsuleInteger(slot['remaining'], 'combatant.planning.spellSlot.remaining');
  });
  capsuleInteger(planning['legendaryActionUsesRemaining'], 'combatant.planning.legendaryActionUsesRemaining');
  capsuleInteger(planning['legendaryResistanceUsesRemaining'], 'combatant.planning.legendaryResistanceUsesRemaining');
  if (typeof planning['concentrating'] !== 'boolean') {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'combatant.planning.concentrating must be boolean.');
  }
  if (pending) {
    if (record['pendingReason'] !== 'legacy_size_required' &&
      record['pendingReason'] !== 'effect_adjudication_pending' &&
      record['pendingReason'] !== 'overlap_adjudication_pending') {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'Pending combatant reason is invalid.');
    }
    return structuredClone(record) as unknown as EngineProjectionPlacementPendingCombatant;
  }
  if (record['placementStatus'] !== 'placed') {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Combatant placement status is invalid.');
  }
  if (!creatureSizes.includes(record['effectiveSize'] as KnownCreatureSize)) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Combatant effective size is invalid.');
  }
  const position = decodeGridCell(record['position'], 'combatant.position');
  const footprint = capsuleArray(record['footprint'], 'combatant.footprint', 16)
    .map((cell, index) => decodeGridCell(cell, `combatant.footprint[${String(index)}]`));
  if (footprint.length === 0) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Placed combatant footprint cannot be empty.');
  }
  try {
    decodeProjectedCreatureSpace({
      position,
      effectiveSize: record['effectiveSize'] as KnownCreatureSize,
      placementMode: decodePlacementMode(record['placementMode']),
      footprint,
    });
  } catch (error) {
    throw new EngineStateCapsuleDecodeError(
      'invalid_schema',
      error instanceof Error ? error.message : 'Projected creature space is invalid.',
    );
  }
  return structuredClone(record) as unknown as EngineProjectionPlacedCombatant;
}

function decodeEngineProjection(value: unknown): EngineDmProjection {
  const record = capsuleRecord(value, 'projection');
  exactCapsuleKeys(record, projectionKeys, 'projection');
  if (record['room'] !== null) capsuleInteger(record['room'], 'projection.room', 1);
  capsuleInteger(record['round'], 'projection.round');
  if (!['players', 'monsters', 'none'].includes(String(record['activeSide']))) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'projection.activeSide is invalid.');
  }
  if (record['activeCombatant'] !== null) capsuleText(record['activeCombatant'], 'projection.activeCombatant');
  const bounds = capsuleRecord(record['bounds'], 'projection.bounds');
  exactCapsuleKeys(bounds, ['columns', 'rows'], 'projection.bounds');
  capsuleInteger(bounds['columns'], 'projection.bounds.columns', 1);
  capsuleInteger(bounds['rows'], 'projection.bounds.rows', 1);
  for (const key of ['blockedCells', 'difficultTerrainCells'] as const) {
    capsuleArray(record[key], `projection.${key}`, 100_000)
      .forEach((cell, index) => decodeGridCell(cell, `projection.${key}[${String(index)}]`));
  }
  capsuleArray(record['movementBlockingObjects'], 'projection.movementBlockingObjects', 10_000)
    .forEach((value, index) => {
      const object = capsuleRecord(value, `movementBlockingObjects[${String(index)}]`);
      exactCapsuleKeys(object, ['id', 'name', 'cells'], 'movementBlockingObject');
      capsuleText(object['id'], 'movementBlockingObject.id');
      capsuleText(object['name'], 'movementBlockingObject.name');
      capsuleArray(object['cells'], 'movementBlockingObject.cells', 10_000)
        .forEach((cell, cellIndex) => decodeGridCell(cell, `movementBlockingObject.cells[${String(cellIndex)}]`));
    });
  capsuleArray(record['combatants'], 'projection.combatants', 1_000).forEach(decodeProjectionCombatant);
  capsuleArray(record['observationHistory'], 'projection.observationHistory', 1_000_000).forEach((value) => {
    const observation = capsuleRecord(value, 'observation');
    exactCapsuleKeys(observation, ['observer', 'subject', 'cell', 'round', 'revision'], 'observation');
    capsuleIdentity(observation['observer'], 'observation.observer', combatantId);
    capsuleIdentity(observation['subject'], 'observation.subject', combatantId);
    decodeGridCell(observation['cell'], 'observation.cell');
    capsuleInteger(observation['round'], 'observation.round');
    capsuleInteger(observation['revision'], 'observation.revision');
  });
  capsuleArray(record['semanticZones'], 'projection.semanticZones', 10_000).forEach((value) => {
    const zone = capsuleRecord(value, 'semanticZone');
    exactCapsuleKeys(zone, ['id', 'kind', 'memberCombatantIds', 'active'], 'semanticZone');
    capsuleIdentity(zone['id'], 'semanticZone.id', engineZoneId);
    if (zone['kind'] !== 'persistent_area' && zone['kind'] !== 'authored_encounter_zone') {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'semanticZone.kind is invalid.');
    }
    capsuleArray(zone['memberCombatantIds'], 'semanticZone.memberCombatantIds', 1_000)
      .forEach((id) => capsuleIdentity(id, 'semanticZone.memberCombatantId', combatantId));
    if (typeof zone['active'] !== 'boolean') {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'semanticZone.active must be boolean.');
    }
  });
  const initiative = capsuleRecord(record['initiative'], 'projection.initiative');
  exactCapsuleKeys(initiative, ['policy', 'timeline'], 'projection.initiative');
  if (initiative['policy'] !== ENGINE_INITIATIVE_PROJECTION_POLICY) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Projection initiative policy is invalid.');
  }
  const timeline = capsuleRecord(initiative['timeline'], 'projection.initiative.timeline');
  exactCapsuleKeys(timeline, ['phase', 'round', 'currentCombatant', 'initiative', 'upcoming', 'roundBoundaries', 'branchPoints'], 'projection.initiative.timeline');
  return structuredClone(record) as unknown as EngineDmProjection;
}

/** Strict schema-3 decoder. Digest verification happens only after shape and semantics. */
export function decodeEngineStateCapsule(value: unknown): EngineStateCapsule {
  const record = capsuleRecord(value, 'engine state capsule');
  if (record['schemaVersion'] !== 3) {
    throw new EngineStateCapsuleDecodeError('unsupported_version', 'Only engine state capsule schema 3 is accepted.');
  }
  exactCapsuleKeys(record, [
    'format', 'schemaVersion', 'runId', 'branchId', 'revision', 'digest', 'generatedAt',
    'request', 'projection', 'historyDelta', 'rulesIndex',
  ], 'engine state capsule');
  if (record['format'] !== 'engine-mcp-state-capsule') {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Engine state capsule format is invalid.');
  }
  capsuleIdentity(record['runId'], 'runId', encounterSessionId);
  capsuleIdentity(record['branchId'], 'branchId', encounterBranchId);
  capsuleInteger(record['revision'], 'revision', 1);
  const digest = capsuleText(record['digest'], 'digest', 64);
  if (!/^[0-9a-f]{64}$/u.test(digest)) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Capsule digest must be canonical SHA-256 hex.');
  }
  const generatedAt = capsuleText(record['generatedAt'], 'generatedAt', 100);
  if (Number.isNaN(Date.parse(generatedAt)) || new Date(generatedAt).toISOString() !== generatedAt) {
    throw new EngineStateCapsuleDecodeError('invalid_schema', 'Capsule generatedAt must be canonical ISO date-time text.');
  }
  decodeCapsuleRequest(record['request']);
  decodeEngineProjection(record['projection']);
  capsuleArray(record['historyDelta'], 'historyDelta', 100_000).forEach((value) => {
    const history = capsuleRecord(value, 'history entry');
    exactCapsuleKeys(history, ['revision', 'kind', 'branchStatus', 'encounterRound'], 'history entry');
    capsuleInteger(history['revision'], 'history.revision');
    capsuleText(history['kind'], 'history.kind', 100);
    if (history['branchStatus'] !== 'active' && history['branchStatus'] !== 'void') {
      throw new EngineStateCapsuleDecodeError('invalid_schema', 'history.branchStatus is invalid.');
    }
    capsuleInteger(history['encounterRound'], 'history.encounterRound');
  });
  capsuleArray(record['rulesIndex'], 'rulesIndex', 10_000).forEach((value) => {
    const rule = capsuleRecord(value, 'rule reference');
    exactCapsuleKeys(rule, ['ruleId', 'sourceLocator'], 'rule reference');
    capsuleText(rule['ruleId'], 'ruleId');
    capsuleText(rule['sourceLocator'], 'sourceLocator', 500);
  });
  const { digest: _digest, generatedAt: _generatedAt, ...body } = record;
  if (digest !== digestFor(body as unknown as CapsuleDigestInput)) {
    throw new EngineStateCapsuleDecodeError('digest_mismatch', 'State capsule digest is invalid.');
  }
  return deepFreeze(structuredClone(record) as unknown as EngineStateCapsule);
}

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
  observationHistory: EncounterState['observationHistory'],
  room: number | null = null,
): EngineDmProjection {
  const encounter = projection.encounter;
  return {
    room,
    round: encounter.round,
    activeSide: activeSide(projection),
    activeCombatant: encounter.activeCombatant,
    initiative: {
      policy: ENGINE_INITIATIVE_PROJECTION_POLICY,
      timeline: structuredClone(projection.timeline),
    },
    bounds: { ...encounter.bounds },
    blockedCells: encounter.blockedCells.map((cell) => ({ ...cell })),
    difficultTerrainCells: [
      ...encounter.environment.difficultTerrainRegions.flatMap((region) => region.cells),
      ...encounter.worldObjects.flatMap((object) => object.footprint.filter((cell) =>
        terrainPassabilityAt(encounter, cell) === 'difficult')),
    ].map((cell) => ({ ...cell })),
    movementBlockingObjects: encounter.worldObjects
      .filter((object) => object.footprint.some((cell) => terrainPassabilityAt(encounter, cell) === 'blocked'))
      .map((object) => ({
        id: boundedText(String(object.id), 'world object id', 200),
        name: boundedText(object.name, 'world object name', 200),
        cells: object.footprint.map((cell) => ({ ...cell })),
      })),
    combatants: encounter.combatants.map((combatant): EngineProjectionCombatant => {
      const identity: EngineProjectionCombatantIdentity = {
        id: combatant.id,
        name: boundedText(combatant.name, 'combatant name', 200),
        side: combatant.kind,
        life: combatant.life,
        hitPoints: registry.planningHitPointsFor(combatant.id),
        hitPointMaximum: registry.planningHitPointMaximumFor(combatant.id),
        speedFeet: combatant.rules.speed,
        reachFeet: combatant.rules.reach,
        actionAvailable: combatant.placementStatus === 'placed' && combatant.turn.action.kind !== 'spent',
        bonusActionAvailable: combatant.placementStatus === 'placed' && combatant.turn.bonusActionAvailable,
        reactionAvailable: combatant.placementStatus === 'placed' && combatant.turn.reactionAvailable,
        movementRemainingFeet: combatant.placementStatus === 'placed' ? combatant.turn.movement.remaining : 0,
        actions: combatant.placementStatus === 'placed'
          ? registry.actionsFor(combatant.id).map((action) => ({ ...action }))
          : [],
        actionApproaches: combatant.placementStatus === 'placed'
          ? registry.approachesFor(combatant.id).map((approach) => ({ ...approach }))
          : [],
        options: combatant.placementStatus === 'placed'
          ? structuredClone(registry.optionsFor(combatant.id))
          : [],
        planning: structuredClone(registry.planningFactsFor(combatant.id)),
      };
      return combatant.placementStatus === 'placed'
        ? {
            ...identity,
            placementStatus: 'placed',
            position: { ...combatant.position },
            effectiveSize: combatant.effectiveSize,
            placementMode: structuredClone(combatant.placementMode),
            footprint: combatant.footprint.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
          }
        : { ...identity, placementStatus: 'placement_pending', pendingReason: combatant.pendingReason };
    }),
    observationHistory: structuredClone(observationHistory),
    semanticZones: structuredClone(registry.semanticZones()),
  };
}

/** Direct query-only projection used by the stdio package without importing the encounter reducer module. */
export function projectEngineEncounterState(
  state: EncounterState,
  registry: EngineActionRegistry,
  initiative: EngineInitiativeProjection,
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
    initiative: structuredClone(initiative),
    bounds: { ...state.bounds },
    blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
    difficultTerrainCells: [
      ...state.environment.difficultTerrainRegions.flatMap((region) => region.cells),
      ...state.worldObjects.flatMap((object) => object.footprint.filter((cell) =>
        terrainPassabilityAt(state, cell) === 'difficult')),
    ].map((cell) => ({ ...cell })),
    movementBlockingObjects: state.worldObjects
      .filter((object) => object.footprint.some((cell) => terrainPassabilityAt(state, cell) === 'blocked'))
      .map((object) => ({
        id: boundedText(String(object.id), 'world object id', 200),
        name: boundedText(object.name, 'world object name', 200),
        cells: object.footprint.map((cell) => ({ ...cell })),
      })),
    combatants: state.combatants.flatMap((combatant): readonly EngineProjectionCombatant[] => {
      const token = state.tokens.find((candidate) => candidate.combatantId === combatant.profile.id);
      const rules = combatant.wildShape?.physical ?? combatant.profile.rules;
      const pending = state.adjudicationPending.find((entry) =>
        entry.combatant === combatant.profile.id);
      const identity: EngineProjectionCombatantIdentity = {
        id: combatant.profile.id,
        name: boundedText(combatant.profile.name, 'combatant name', 200),
        side: combatant.profile.kind,
        life: combatant.life,
        hitPoints: registry.planningHitPointsFor(combatant.profile.id),
        hitPointMaximum: registry.planningHitPointMaximumFor(combatant.profile.id),
        speedFeet: rules.speed,
        reachFeet: rules.reach,
        actionAvailable: token !== undefined && combatant.turn.action.kind !== 'spent',
        bonusActionAvailable: token !== undefined && combatant.turn.bonusActionAvailable,
        reactionAvailable: token !== undefined && combatant.turn.reactionAvailable,
        movementRemainingFeet: token === undefined ? 0 : combatant.turn.movement.remaining,
        actions: token === undefined ? [] : registry.actionsFor(combatant.profile.id).map((action) => ({ ...action })),
        actionApproaches: token === undefined ? [] : registry.approachesFor(combatant.profile.id).map((approach) => ({ ...approach })),
        options: token === undefined ? [] : structuredClone(registry.optionsFor(combatant.profile.id)),
        planning: structuredClone(registry.planningFactsFor(combatant.profile.id)),
      };
      if (pending !== undefined) {
        return [{ ...identity, placementStatus: 'placement_pending', pendingReason: pending.kind }];
      }
      if (token === undefined) return [];
      const space = projectedCreatureSpace(state, combatant.profile.id);
      return [{
        ...identity,
        placementStatus: 'placed',
        position: { ...token.position },
        effectiveSize: space.actualSize,
        placementMode: structuredClone(token.placementMode),
        footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
      }];
    }),
    observationHistory: structuredClone(state.observationHistory),
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
  const digestActors = request.baselineProposalDigests.map((entry) => entry.actorId);
  const expectedBudget = Math.min(actorIds.length, 2);
  if (
    actorIds.length === 0 ||
    new Set(actorIds).size !== actorIds.length ||
    request.adjustmentBudget !== expectedBudget ||
    request.baselineProposalDigests.length !== actorIds.length ||
    new Set(digestActors).size !== digestActors.length ||
    actorIds.some((actorId) => !digestActors.includes(actorId))
  ) {
    throw new RangeError('Plan adjustment actors, baseline proposal digests, and budget must match exactly.');
  }
  if (
    request.parentPlanId.trim().length === 0 ||
    request.triggerPcTurnId.trim().length === 0 ||
    !/^[0-9a-f]{64}$/u.test(request.baselinePlanHash) ||
    request.baselineProposalDigests.some((entry) => !/^[0-9a-f]{64}$/u.test(entry.proposalDigest))
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
    schemaVersion: 3,
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
  try {
    decodeEngineStateCapsule(capsule);
    return true;
  } catch {
    return false;
  }
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
    this.#capsule = decodeEngineStateCapsule(capsule);
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
