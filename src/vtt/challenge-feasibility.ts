import { canonicalJson } from '../commands/canonical-json';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../combat/events';
import { monsterAttackCommand } from '../combat/monster-commands';
import { transactionalRng, type Rng } from '../combat/random';
import {
  addFractions,
  emptyRollPrefix,
  exactWeight,
  multiplyFractions,
  replayPrefix,
  type DieRequest,
  type DrawRecord,
  type ExactFraction,
  type ExactWeight,
  type RollPrefix,
  type RollTrace,
} from '../combat/roll-provenance';
import { monsterSpellResourcePoolId, type MonsterAttackAction } from '../combat/statblock';
import type { GridCell } from '../combat/grid';
import {
  encounterEffectId,
  effectStackingIdentity,
  itemId,
  type CombatantId,
} from '../combat/values';
import { decodeArenaBasisEnvelopeV1 } from './arena-fixture';
import {
  runCommandBoundaryTransaction,
  type ReducerApplicationAccounting,
} from './engine-round-application';
import { monsterActions, monsterBonusActions } from './engine-query-port';
import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
import type { EngineOptionId } from './intent-resolver';
import {
  buildOfferEnvironment,
  type EngineOptionEnvironment,
} from './offers/build-offer-environment';
import { ARENA_REACTION_OFFER_POLICY } from './reaction-offer-host-policy';
import { regretTurnLegalActions } from './regret/legal-actions';

export const D583_BCA_FEASIBILITY_LIMITS_V1 = Object.freeze({
  profile: 'd583_bca_v1' as const,
  maxFaceExpansions: 10_000_000,
  maxReducerApplications: 5_000_000,
  maxLiveNodes: 250_000,
  maxHeapUsedBytes: 1_073_741_824,
  maxWallMilliseconds: 180_000,
  maxCommandCheckpointsPerBranch: 64,
  maxDrawsPerBranch: 128,
});

export const D583_BCA_DERIVED_CAP_MAXIMA_V1 = Object.freeze({
  maxNodes: 200_000,
  maxHeapUsedBytes: 858_993_459,
  maxWallMilliseconds: 90_000,
});

export interface FutureStateKeyV1 {
  readonly schemaVersion: 1;
  /** Every reducer-owned field except append-only event history, canonicalized below. */
  readonly reducerState: Omit<EncounterState, 'eventLog'>;
  readonly nextProductionLegalCommands: readonly string[];
}

export interface FeasibilityFailureV1 {
  readonly kind: 'missing_limits' | 'limit_exhausted' | 'invariant_failure' | 'derived_cap_overflow';
  readonly counter: string;
  readonly observed: number | string;
  readonly limit: number | string;
}

export interface ReducerFeasibilityMeasurementV1 {
  readonly faceExpansions: number;
  readonly reducerApplications: number;
  readonly completedLeaves: number;
  readonly groupedStates: number;
  readonly peakLiveNodes: number;
  readonly peakHeapUsedBytes: number;
  readonly wallMilliseconds: number;
  readonly maximumCommandCheckpoints: number;
  readonly maximumDraws: number;
  readonly mass: { readonly numerator: string; readonly denominator: string };
  readonly continuationEquivalent: boolean;
}

export interface ChallengeReducerVariantReportV1 extends ReducerFeasibilityMeasurementV1 {
  readonly variantId: string;
  readonly isBase: boolean;
  readonly invocationCumulative: Readonly<{
    faceExpansions: number;
    reducerApplications: number;
    completedLeaves: number;
    peakLiveNodes: number;
    peakHeapUsedBytes: number;
    wallMilliseconds: number;
    maximumCommandCheckpoints: number;
    maximumDraws: number;
  }>;
}

export interface ChallengeReducerFeasibilityReportV1 {
  readonly schemaVersion: 1;
  readonly verdict: 'GO' | 'SHELVE_D583';
  readonly basis: 'challenge';
  readonly roomOrder: readonly ['B', 'C', 'A'];
  readonly roomCount: 3;
  readonly limits: typeof D583_BCA_FEASIBILITY_LIMITS_V1;
  readonly rooms: readonly {
    readonly roomId: 'B' | 'C' | 'A';
    readonly base: ChallengeReducerVariantReportV1;
    readonly variants: readonly ChallengeReducerVariantReportV1[];
  }[];
  readonly totals: ReducerFeasibilityMeasurementV1;
  readonly derivedWitnessCaps: {
    readonly maxNodes: number;
    readonly maxHeapUsedBytes: number;
    readonly maxWallMilliseconds: number;
    readonly headroom: '25_percent_nodes_and_heap_100_percent_wall';
  } | null;
  readonly failure: FeasibilityFailureV1 | null;
}

interface MutableCounters {
  faceExpansions: number;
  reducerApplications: number;
  completedLeaves: number;
  peakLiveNodes: number;
  peakHeapUsedBytes: number;
  maximumCommandCheckpoints: number;
  maximumDraws: number;
}

interface VariantScope {
  readonly started: number;
  peakLiveNodes: number;
  peakHeapUsedBytes: number;
  maximumCommandCheckpoints: number;
  maximumDraws: number;
}

export interface FeasibilityRuntime {
  readonly now: () => number;
  readonly heapUsed: () => number;
}

interface BranchProvenance {
  readonly weight: ExactWeight;
  readonly traces: readonly RollTrace[];
  readonly events: readonly (readonly EncounterEvent[])[];
  readonly draws: number;
  readonly commandCheckpoints: number;
}

interface WeightedState {
  readonly state: EncounterState;
  readonly weight: ExactWeight;
  readonly branchProvenance: readonly BranchProvenance[];
}

interface Scenario {
  readonly name: string;
  readonly commands: readonly ((state: EncounterState) => EncounterCommand)[];
}

class FeasibilityStop extends Error {
  readonly failure: FeasibilityFailureV1;

  constructor(failure: FeasibilityFailureV1) {
    super(`${failure.kind}:${failure.counter}`);
    this.failure = failure;
  }
}

const PRODUCTION_RUNTIME: FeasibilityRuntime = {
  now: (): number => performance.now(),
  heapUsed: (): number => process.memoryUsage().heapUsed,
};

const B_OGRE = 'combatant:generated-challenge-b-01-ogre' as CombatantId;
const C_OGRE = 'combatant:generated-challenge-c-01-ogre' as CombatantId;
const A_PRIEST = 'combatant:generated-challenge-a-02-priest' as CombatantId;
const A_KNIGHT = 'combatant:generated-challenge-a-01-knight' as CombatantId;
const D_GUARD = 'combatant:generated-challenge-d-01-guard' as CombatantId;
const D_SCOUT_1 = 'combatant:generated-challenge-d-02-scout-1' as CombatantId;
const D_SCOUT_2 = 'combatant:generated-challenge-d-03-scout-2' as CombatantId;
const FIGHTER = 'combatant:fighter' as CombatantId;
const CLERIC = 'combatant:cleric' as CombatantId;
const WIZARD = 'combatant:wizard' as CombatantId;

export const D583_D_ONE_POLICY_EVIDENCE = Object.freeze({
  classification: 'single_policy_counterexample_not_optimized_search' as const,
  genericSaveKills: '540/1280' as const,
  expectedScoutPrimaryTurns: '101/64' as const,
  optimizedSurfaceClaim: false as const,
});

export const D587_ROOM_D_BOUNDED_POLICIES_V1 = [
  'guard_spear_hold',
  'guard_dodge_hold',
] as const;
export type RoomDBoundedPolicyV1 = (typeof D587_ROOM_D_BOUNDED_POLICIES_V1)[number];

export const D587_ROOM_D_REPLY_MENU_PHASES_V1 = [
  'guard_attack_required',
  'terminal_end_turn',
] as const;
export type RoomDBoundedReplyMenuPhaseV1 = (typeof D587_ROOM_D_REPLY_MENU_PHASES_V1)[number];

export interface RoomDBoundedFractionV1 {
  readonly numerator: string;
  readonly denominator: string;
}

export type RoomDBoundedDiceSpecificationKeyV1 = readonly [
  'dice_expression',
  readonly ['count', number],
  readonly ['sides', number],
  readonly ['modifier', number],
  readonly ['minimumTotal', 'absent' | readonly ['present', number]],
  readonly ['maximumTotal', 'absent' | readonly ['present', number]],
  readonly ['rerollBelow', 'absent' | readonly [
    'present',
    readonly ['threshold', number],
    readonly ['maximumRerollsPerDie', 1],
  ]],
  readonly ['explosion', 'absent' | readonly [
    'present',
    readonly ['triggerFace', 'maximum'],
    readonly ['maximumExplosionsPerDie', 1],
  ]],
];

export interface RoomDBoundedDamageComponentTableV1 {
  readonly semanticOutcome: 'normal_damage' | 'critical_damage';
  readonly specificationKey: RoomDBoundedDiceSpecificationKeyV1;
  readonly conditionalTotals: readonly {
    readonly total: number;
    readonly weight: RoomDBoundedFractionV1;
  }[];
  readonly conditionalComponentMass: RoomDBoundedFractionV1;
  readonly firstInvocationRequestMass: RoomDBoundedFractionV1;
  readonly secondInvocationLineMass: RoomDBoundedFractionV1 | null;
}

export interface RoomDBoundedAttackMassTableV1 {
  readonly incomingMass: RoomDBoundedFractionV1;
  readonly noDamageMass: RoomDBoundedFractionV1;
  readonly secondInvocationIncomingMass: RoomDBoundedFractionV1 | null;
  readonly secondInvocationNoDamageLineMass: RoomDBoundedFractionV1 | null;
  readonly normalDamage: RoomDBoundedDamageComponentTableV1;
  readonly criticalDamage: RoomDBoundedDamageComponentTableV1;
  readonly uniquenessScope: 'concrete_replay_execution';
}

export interface RoomDBoundedPolicyReportV1 {
  readonly policy: RoomDBoundedPolicyV1;
  readonly offeredOptionId: EngineOptionId;
  readonly offeredRevision: number;
  readonly retention: RoomDBoundedFractionV1;
  readonly terminalHistories: number;
}

export interface RoomDBoundedGuardRetentionReportV1 {
  readonly schemaVersion: 1;
  readonly classification: 'feasibility_candidate';
  readonly basis: 'challenge';
  readonly seed: 5831004;
  readonly roomId: 'D';
  readonly mode: 'bounded_guard_retention';
  readonly policies: readonly [RoomDBoundedPolicyReportV1, RoomDBoundedPolicyReportV1];
  readonly delta: RoomDBoundedFractionV1;
  readonly threshold: RoomDBoundedFractionV1;
  readonly thresholdMargin: RoomDBoundedFractionV1;
  readonly rawTerminalHistories: 512032;
  readonly failure: FeasibilityFailureV1 | null;
}

const fraction = (numerator: string, denominator: string): RoomDBoundedFractionV1 =>
  Object.freeze({ numerator, denominator });

const diceSpecification = (
  count: number,
  sides: number,
  modifier: number,
): RoomDBoundedDiceSpecificationKeyV1 => Object.freeze([
  'dice_expression',
  Object.freeze(['count', count] as const),
  Object.freeze(['sides', sides] as const),
  Object.freeze(['modifier', modifier] as const),
  Object.freeze(['minimumTotal', 'absent'] as const),
  Object.freeze(['maximumTotal', 'absent'] as const),
  Object.freeze(['rerollBelow', 'absent'] as const),
  Object.freeze(['explosion', 'absent'] as const),
]);

const uniformTotals = (
  first: number,
  last: number,
  denominator: string,
): readonly { readonly total: number; readonly weight: RoomDBoundedFractionV1 }[] => Object.freeze(
  Array.from({ length: last - first + 1 }, (_unused, index) => Object.freeze({
    total: first + index,
    weight: fraction('1', denominator),
  })),
);

const triangularTotals = (
  first: number,
  numerators: readonly number[],
  denominator: string,
): readonly { readonly total: number; readonly weight: RoomDBoundedFractionV1 }[] => Object.freeze(
  numerators.map((numerator, index) => Object.freeze({
    total: first + index,
    weight: fraction(String(numerator), denominator),
  })),
);

const fighterNormalDamage = (
  requestMass: RoomDBoundedFractionV1,
  secondInvocationLineMass: RoomDBoundedFractionV1,
): RoomDBoundedDamageComponentTableV1 => Object.freeze({
  semanticOutcome: 'normal_damage',
  specificationKey: diceSpecification(1, 8, 4),
  conditionalTotals: uniformTotals(5, 12, '8'),
  conditionalComponentMass: fraction('1', '1'),
  firstInvocationRequestMass: requestMass,
  secondInvocationLineMass,
});

const fighterCriticalDamage = (
  requestMass: RoomDBoundedFractionV1,
  secondInvocationLineMass: RoomDBoundedFractionV1,
): RoomDBoundedDamageComponentTableV1 => Object.freeze({
  semanticOutcome: 'critical_damage',
  specificationKey: diceSpecification(2, 8, 4),
  conditionalTotals: triangularTotals(6, [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1], '64'),
  conditionalComponentMass: fraction('1', '1'),
  firstInvocationRequestMass: requestMass,
  secondInvocationLineMass,
});

export const D587_ROOM_D_ATTACK_MASS_TABLES_V1 = Object.freeze({
  guardSpear: Object.freeze({
    incomingMass: fraction('1', '1'),
    noDamageMass: fraction('11', '20'),
    secondInvocationIncomingMass: null,
    secondInvocationNoDamageLineMass: null,
    normalDamage: Object.freeze({
      semanticOutcome: 'normal_damage',
      specificationKey: diceSpecification(1, 6, 1),
      conditionalTotals: uniformTotals(2, 7, '6'),
      conditionalComponentMass: fraction('1', '1'),
      firstInvocationRequestMass: fraction('2', '5'),
      secondInvocationLineMass: null,
    }),
    criticalDamage: Object.freeze({
      semanticOutcome: 'critical_damage',
      specificationKey: diceSpecification(2, 6, 1),
      conditionalTotals: triangularTotals(3, [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1], '36'),
      conditionalComponentMass: fraction('1', '1'),
      firstInvocationRequestMass: fraction('1', '20'),
      secondInvocationLineMass: null,
    }),
    uniquenessScope: 'concrete_replay_execution',
  }) satisfies RoomDBoundedAttackMassTableV1,
  fighterNormal: Object.freeze({
    incomingMass: fraction('1', '1'),
    noDamageMass: fraction('2', '5'),
    secondInvocationIncomingMass: fraction('2', '5'),
    secondInvocationNoDamageLineMass: fraction('4', '25'),
    normalDamage: fighterNormalDamage(fraction('11', '20'), fraction('11', '50')),
    criticalDamage: fighterCriticalDamage(fraction('1', '20'), fraction('1', '50')),
    uniquenessScope: 'concrete_replay_execution',
  }) satisfies RoomDBoundedAttackMassTableV1,
  fighterDodge: Object.freeze({
    incomingMass: fraction('1', '1'),
    noDamageMass: fraction('16', '25'),
    secondInvocationIncomingMass: fraction('16', '25'),
    secondInvocationNoDamageLineMass: fraction('256', '625'),
    normalDamage: fighterNormalDamage(fraction('143', '400'), fraction('143', '625')),
    criticalDamage: fighterCriticalDamage(fraction('1', '400'), fraction('1', '625')),
    uniquenessScope: 'concrete_replay_execution',
  }) satisfies RoomDBoundedAttackMassTableV1,
});

export const D587_ROOM_D_HAND_CONSTANTS_V1 = Object.freeze({
  seed: 5_831_004 as const,
  guard: Object.freeze({ armorClass: 16, hitPoints: 5 }),
  fighterAttack: Object.freeze({
    attackBonus: 7,
    dodgeRollMode: 'disadvantage' as const,
    normalDamage: '1d8+4',
    criticalDamage: '2d8+4',
  }),
  spearRetention: fraction('4', '25'),
  dodgeRetention: fraction('256', '625'),
  delta: fraction('156', '625'),
  materialityThreshold: fraction('3', '20'),
  thresholdMargin: fraction('249', '2500'),
  terminalHistories: Object.freeze({ spear: 136_040, dodge: 375_992, total: 512_032 }),
  work: Object.freeze({
    faceExpansions: 574_462,
    reducerApplications: 1_087_704,
    completedOutcomesAndEndTurns: 1_025_272,
    incompleteReplayAttempts: 62_432,
  }),
  coverProbeCosts: Object.freeze({ livingGuard: 124, deadGuard: 140, scout2EitherState: 124 }),
  storage: Object.freeze({ nodeEquivalents: 3_348, withHeadroom: 4_185 }),
});

function optionMatchesRoomDPolicy(
  option: ReturnType<typeof availableEngineActorOptions>[number],
  policy: RoomDBoundedPolicyV1,
): boolean {
  if (option.actorId !== D_GUARD || option.actionSlots.length !== 1) return false;
  const slot = option.actionSlots[0];
  if (slot?.slot !== 'main') return false;
  switch (policy) {
    case 'guard_spear_hold':
      return slot.use.kind === 'attack' && String(slot.use.actionId) === 'spear' &&
        slot.use.target.kind === 'combatant' && slot.use.target.combatantId === WIZARD;
    case 'guard_dodge_hold':
      return slot.use.kind === 'dodge';
  }
}

export function roomDBoundedGuardPolicyCommand(
  state: EncounterState,
  policy: RoomDBoundedPolicyV1,
): Readonly<{
  policy: RoomDBoundedPolicyV1;
  offeredOptionId: EngineOptionId;
  offeredRevision: number;
  command: EncounterCommand;
}> {
  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
  if (state.activeCombatant !== D_GUARD) {
    throw new Error('Room D bounded policy requires the Guard to be active.');
  }
  const matches = availableEngineActorOptions(state, D_GUARD, offerEnvironment, state.revision)
    .filter((option) => option.revision === state.revision && optionMatchesRoomDPolicy(option, policy));
  if (matches.length !== 1) {
    throw new Error(`Room D bounded policy ${policy} requires exactly one current offered option.`);
  }
  const option = matches[0];
  if (option === undefined) throw new Error('Room D bounded policy option disappeared.');
  const resolution = resolveEngineActorOption(state, option, offerEnvironment);
  if (!resolution.valid || resolution.mechanics.movementCostFeet !== 0 || resolution.mechanics.path.length !== 0) {
    throw new Error(`Room D bounded policy ${policy} did not resolve as a hold option.`);
  }
  let command: EncounterCommand;
  switch (policy) {
    case 'guard_spear_hold': {
      const action = monsterActions(state, D_GUARD).find((candidate): candidate is MonsterAttackAction =>
        candidate.kind === 'attack' && candidate.id === 'spear');
      if (action === undefined) throw new Error('Room D Guard has no offered Spear action.');
      const evaluation = evaluateMonsterTacticalAttack(state, action, D_GUARD, WIZARD);
      command = monsterAttackCommand(action, D_GUARD, WIZARD, evaluation.rollMode.mode);
      break;
    }
    case 'guard_dodge_hold':
      command = { type: 'dodge', actor: D_GUARD, cost: 'action' };
      break;
  }
  return Object.freeze({
    policy,
    offeredOptionId: option.optionId,
    offeredRevision: option.revision,
    command,
  });
}

export function validateRoomDBoundedFighterMenu(
  actions: readonly EncounterCommand[],
  phase: RoomDBoundedReplyMenuPhaseV1,
): Readonly<{
  attack: Extract<EncounterCommand, { readonly type: 'attack' }> | null;
  endTurn: Extract<EncounterCommand, { readonly type: 'end_turn' }>;
}> {
  const attacks = actions.filter((command): command is Extract<EncounterCommand, { readonly type: 'attack' }> =>
    command.type === 'attack');
  if (attacks.some((command) => command.actor !== FIGHTER || command.target !== D_GUARD)) {
    throw new Error('Room D bounded reply rejects attacks against any target other than the living Guard.');
  }
  if (actions.some((command) => command.type === 'move' && command.path.at(-1)?.column === 7 &&
    command.path.at(-1)?.row === 5)) {
    throw new Error('Room D bounded reply rejects an invented move into the gate.');
  }
  const endTurns = actions.filter((command): command is Extract<EncounterCommand, { readonly type: 'end_turn' }> =>
    command.type === 'end_turn' && command.actor === FIGHTER);
  if (endTurns.length !== 1) throw new Error('Room D bounded reply requires one offered Fighter end-turn.');
  switch (phase) {
    case 'guard_attack_required':
      if (attacks.length !== 1) {
        throw new Error('Room D bounded reply requires exactly one offered Fighter attack against the Guard.');
      }
      break;
    case 'terminal_end_turn':
      if (attacks.length !== 0) {
        throw new Error('Room D bounded terminal reply forbids another Fighter attack.');
      }
      break;
  }
  return Object.freeze({ attack: attacks[0] ?? null, endTurn: endTurns[0]! });
}

export function roomDBoundedFighterMenu(
  state: EncounterState,
  phase: RoomDBoundedReplyMenuPhaseV1,
): ReturnType<typeof validateRoomDBoundedFighterMenu> {
  if (state.activeCombatant !== FIGHTER) {
    throw new Error('Room D bounded reply requires the Fighter to be active.');
  }
  return validateRoomDBoundedFighterMenu(regretTurnLegalActions(state, FIGHTER).actions, phase);
}

export function assertRoomDBoundedTerminalState(state: EncounterState): Readonly<{
  guardLiving: boolean;
  activeCombatant: typeof D_SCOUT_1;
}> {
  if (state.pendingDecisions.length !== 0) {
    throw new Error('Room D bounded terminal state retains pending decisions.');
  }
  if (state.phase.kind !== 'active' || state.activeCombatant !== D_SCOUT_1) {
    throw new Error('Room D bounded terminal state must advance to living Scout 1.');
  }
  const scout = state.combatants.find((combatant) => combatant.profile.id === D_SCOUT_1);
  const guard = state.combatants.find((combatant) => combatant.profile.id === D_GUARD);
  if (scout?.life !== 'living' || guard === undefined) {
    throw new Error('Room D bounded terminal participants are missing or invalid.');
  }
  return Object.freeze({ guardLiving: guard.life === 'living', activeCombatant: D_SCOUT_1 });
}

export function deriveVariantHorizon(
  state: Pick<EncounterState, 'initiative' | 'activeInitiativeIndex'>,
  requiredActors: readonly CombatantId[],
): { readonly scheduledOrder: readonly CombatantId[]; readonly endpointActorId: CombatantId } {
  if (state.activeInitiativeIndex === null) throw new Error('Challenge horizon requires active initiative.');
  const required = new Set(requiredActors);
  const scheduledOrder = state.initiative
    .slice(state.activeInitiativeIndex + 1)
    .map((entry) => entry.combatant)
    .filter((actor): actor is CombatantId => required.has(actor));
  if (scheduledOrder.length !== required.size) {
    throw new Error('Challenge horizon did not encounter every required actor after the active actor.');
  }
  const endpointActorId = scheduledOrder.at(-1);
  if (endpointActorId === undefined) throw new Error('Challenge horizon requires at least one actor.');
  return { scheduledOrder, endpointActorId };
}

function rationalJson(value: ExactFraction): { readonly numerator: string; readonly denominator: string } {
  return { numerator: String(value.numerator), denominator: String(value.denominator) };
}

function checkLimit(counter: string, observed: number, limit: number): void {
  if (observed > limit) throw new FeasibilityStop({
    kind: 'limit_exhausted', counter, observed, limit,
  });
}

function sampleResources(
  counters: MutableCounters,
  scope: VariantScope,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  liveNodes: number,
): void {
  const heapUsed = runtime.heapUsed();
  counters.peakLiveNodes = Math.max(counters.peakLiveNodes, liveNodes);
  counters.peakHeapUsedBytes = Math.max(counters.peakHeapUsedBytes, heapUsed);
  scope.peakLiveNodes = Math.max(scope.peakLiveNodes, liveNodes);
  scope.peakHeapUsedBytes = Math.max(scope.peakHeapUsedBytes, heapUsed);
  checkLimit('live_nodes', liveNodes, D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes);
  checkLimit('heap_used_bytes', counters.peakHeapUsedBytes, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes);
  checkLimit(
    'wall_milliseconds', runtime.now() - invocationStarted,
    D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds,
  );
}

function accounting(
  counters: MutableCounters,
  scope: VariantScope,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  liveNodes: () => number,
): ReducerApplicationAccounting {
  return {
    attempted: (): void => {
      counters.reducerApplications += 1;
      checkLimit(
        'reducer_applications', counters.reducerApplications,
        D583_BCA_FEASIBILITY_LIMITS_V1.maxReducerApplications,
      );
      sampleResources(counters, scope, runtime, invocationStarted, liveNodes());
    },
    completed: (): void => sampleResources(counters, scope, runtime, invocationStarted, liveNodes()),
  };
}

function serializableRequest(request: DieRequest): unknown {
  return {
    sides: request.sides,
    componentId: request.provenance.componentId,
    execution: request.provenance.execution,
    occurrenceId: request.provenance.occurrenceId,
    operationPath: request.provenance.operationPath,
    source: request.provenance.source,
    targets: request.provenance.targets,
    componentKind: request.provenance.spec.kind,
    role: request.role,
  };
}

export function futureStateKeyV1(
  state: EncounterState,
  nextCommands: readonly EncounterCommand[],
): FutureStateKeyV1 {
  const { eventLog: _excludedEventHistory, ...reducerState } = state;
  return {
    schemaVersion: 1,
    reducerState: {
      ...reducerState,
      combatants: [...reducerState.combatants]
        .sort((left, right) => String(left.profile.id).localeCompare(String(right.profile.id))),
      tokens: [...reducerState.tokens]
        .sort((left, right) => String(left.combatantId).localeCompare(String(right.combatantId))),
    },
    nextProductionLegalCommands: nextCommands.map(canonicalJson).sort(),
  };
}

export function mergeContinuationEquivalentStates<T>(
  nodes: readonly T[],
  key: (node: T) => string,
  continuation: (node: T) => string,
): readonly T[] {
  const groups = new Map<string, { readonly node: T; readonly continuation: string }>();
  for (const node of nodes) {
    const stateKey = key(node);
    const signature = continuation(node);
    const existing = groups.get(stateKey);
    if (existing !== undefined && existing.continuation !== signature) {
      throw new FeasibilityStop({
        kind: 'invariant_failure', counter: 'continuation_collision', observed: signature,
        limit: existing.continuation,
      });
    }
    groups.set(stateKey, existing ?? { node, continuation: signature });
  }
  return [...groups.values()].map((entry) => entry.node);
}

function objectiveContribution(state: EncounterState): readonly number[] {
  return [...state.combatants]
    .sort((left, right) => String(left.profile.id).localeCompare(String(right.profile.id)))
    .map((entry) => entry.hitPoints);
}

function requiredActorEligibility(state: EncounterState): readonly string[] {
  return state.combatants.filter((entry) => entry.life === 'living').map((entry) => String(entry.profile.id)).sort();
}

function branchWeight(branches: readonly BranchProvenance[]): ExactWeight {
  return branches.reduce<ExactFraction>(
    (sum, branch) => addFractions(sum, branch.weight), exactWeight(0n, 1n),
  ) as ExactWeight;
}

function checkBranchLimits(
  branch: Pick<BranchProvenance, 'draws' | 'commandCheckpoints'>,
  counters: MutableCounters,
  scope: VariantScope,
): void {
  counters.maximumDraws = Math.max(counters.maximumDraws, branch.draws);
  counters.maximumCommandCheckpoints = Math.max(counters.maximumCommandCheckpoints, branch.commandCheckpoints);
  scope.maximumDraws = Math.max(scope.maximumDraws, branch.draws);
  scope.maximumCommandCheckpoints = Math.max(scope.maximumCommandCheckpoints, branch.commandCheckpoints);
  checkLimit('draws_per_branch', branch.draws, D583_BCA_FEASIBILITY_LIMITS_V1.maxDrawsPerBranch);
  checkLimit(
    'command_checkpoints_per_branch', branch.commandCheckpoints,
    D583_BCA_FEASIBILITY_LIMITS_V1.maxCommandCheckpointsPerBranch,
  );
}

function exploreCommand(
  input: WeightedState,
  command: EncounterCommand,
  counters: MutableCounters,
  scope: VariantScope,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  retainedSiblingNodes: number,
): readonly WeightedState[] {
  const queue: Array<{ readonly prefix: RollPrefix; readonly conditionalWeight: ExactWeight }> = [
    { prefix: emptyRollPrefix(), conditionalWeight: exactWeight(1n, 1n) },
  ];
  const leaves: WeightedState[] = [];
  while (queue.length > 0) {
    sampleResources(
      counters, scope, runtime, invocationStarted,
      retainedSiblingNodes + queue.length + leaves.length,
    );
    const node = queue.shift();
    if (node === undefined) break;
    const liveNodesDuringReducer = (): number => retainedSiblingNodes + queue.length + leaves.length + 1;
    const step = replayPrefix(node.prefix, (rolls) => runCommandBoundaryTransaction(
      input.state, command, rolls, ARENA_REACTION_OFFER_POLICY, null,
      accounting(counters, scope, runtime, invocationStarted, liveNodesDuringReducer),
    ));
    if (step.kind === 'complete') {
      const branchProvenance = input.branchProvenance.map((prior): BranchProvenance => {
        const branch = {
          weight: multiplyFractions(prior.weight, node.conditionalWeight) as ExactWeight,
          traces: [...prior.traces, step.trace],
          events: [...prior.events, step.value.events],
          draws: prior.draws + step.trace.attempts.length,
          commandCheckpoints: prior.commandCheckpoints + 1,
        };
        checkBranchLimits(branch, counters, scope);
        return branch;
      });
      counters.completedLeaves += branchProvenance.length;
      leaves.push({
        state: step.value.state,
        weight: branchWeight(branchProvenance),
        branchProvenance,
      });
      sampleResources(
        counters, scope, runtime, invocationStarted,
        retainedSiblingNodes + queue.length + leaves.length,
      );
      continue;
    }
    counters.faceExpansions += step.branches.length;
    checkLimit(
      'face_expansions', counters.faceExpansions,
      D583_BCA_FEASIBILITY_LIMITS_V1.maxFaceExpansions,
    );
    for (const branch of step.branches) {
      for (const prior of input.branchProvenance) checkBranchLimits({
        draws: prior.draws + branch.prefix.expectedAttempts.length,
        commandCheckpoints: prior.commandCheckpoints + 1,
      }, counters, scope);
      queue.push({
        prefix: branch.prefix,
        conditionalWeight: multiplyFractions(node.conditionalWeight, branch.conditionalWeight) as ExactWeight,
      });
    }
    sampleResources(
      counters, scope, runtime, invocationStarted,
      retainedSiblingNodes + queue.length + leaves.length,
    );
  }
  return leaves;
}

function continuationSignature(
  member: WeightedState,
  command: EncounterCommand,
  counters: MutableCounters,
  scope: VariantScope,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  retainedSiblingNodes: number,
): string {
  const accumulatedDraws = Math.max(...member.branchProvenance.map((branch) => branch.draws));
  const accumulatedCheckpoints = Math.max(
    ...member.branchProvenance.map((branch) => branch.commandCheckpoints),
  );
  const comparisonBranch: BranchProvenance = {
    weight: exactWeight(1n, 1n), traces: [], events: [],
    draws: accumulatedDraws, commandCheckpoints: accumulatedCheckpoints,
  };
  const continuations = exploreCommand({
    state: member.state,
    weight: exactWeight(1n, 1n),
    branchProvenance: [comparisonBranch],
  }, command, counters, scope, runtime, invocationStarted, retainedSiblingNodes);
  return canonicalJson(continuations.map((continuation) => ({
    key: futureStateKeyV1(continuation.state, []),
    objective: objectiveContribution(continuation.state),
    requiredActorEligibility: requiredActorEligibility(continuation.state),
    weight: rationalJson(continuation.weight),
    provenanceRequests: continuation.branchProvenance.map((branch) => ({
      weight: rationalJson(branch.weight),
      requests: branch.traces.flatMap((trace) => trace.attempts.map(serializableRequest)),
      events: branch.events,
    })).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right))),
  })).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right))));
}

function aggregateByFutureState(
  nodes: readonly WeightedState[],
  nextCommand: ((state: EncounterState) => EncounterCommand) | null,
  counters: MutableCounters,
  scope: VariantScope,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  retainedSiblingNodes: number,
): readonly WeightedState[] {
  const groups = new Map<string, WeightedState[]>();
  for (const node of nodes) {
    const commands = nextCommand === null ? [] : [nextCommand(node.state)];
    const key = canonicalJson(futureStateKeyV1(node.state, commands));
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  const merged: WeightedState[] = [];
  for (const [key, members] of groups) {
    if (nextCommand !== null) {
      const signatures = members.map((member) => continuationSignature(
        member, nextCommand(member.state), counters, scope, runtime, invocationStarted,
        retainedSiblingNodes + nodes.length + merged.length,
      ));
      if (new Set(signatures).size !== 1) throw new FeasibilityStop({
        kind: 'invariant_failure', counter: 'continuation_collision',
        observed: new Set(signatures).size, limit: 1,
      });
    }
    const first = members[0];
    if (first === undefined) throw new FeasibilityStop({
      kind: 'invariant_failure', counter: 'empty_state_group', observed: 0, limit: 1,
    });
    const weight = members.reduce<ExactFraction>(
      (sum, member) => addFractions(sum, member.weight),
      exactWeight(0n, 1n),
    ) as ExactWeight;
    const branchProvenance = members.flatMap((member) => member.branchProvenance);
    if (branchWeight(branchProvenance).numerator !== weight.numerator ||
      branchWeight(branchProvenance).denominator !== weight.denominator) throw new FeasibilityStop({
      kind: 'invariant_failure', counter: 'branch_provenance_mass',
      observed: `${String(branchWeight(branchProvenance).numerator)}/${String(branchWeight(branchProvenance).denominator)}`,
      limit: `${String(weight.numerator)}/${String(weight.denominator)}`,
    });
    merged.push({ ...first, weight, branchProvenance });
    if (canonicalJson(futureStateKeyV1(first.state, nextCommand === null ? [] : [nextCommand(first.state)])) !== key) {
      throw new FeasibilityStop({
        kind: 'invariant_failure', counter: 'future_state_key_instability', observed: key, limit: 'stable',
      });
    }
  }
  sampleResources(
    counters, scope, runtime, invocationStarted,
    retainedSiblingNodes + nodes.length + merged.length,
  );
  return merged;
}

function runScenario(
  initialState: EncounterState,
  scenario: Scenario,
  counters: MutableCounters,
  scope: VariantScope,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  outerRetainedNodes: number,
): readonly WeightedState[] {
  let nodes: readonly WeightedState[] = [{
    state: initialState, weight: exactWeight(1n, 1n),
    branchProvenance: [{
      weight: exactWeight(1n, 1n), traces: [], events: [], draws: 0, commandCheckpoints: 0,
    }],
  }];
  for (let index = 0; index < scenario.commands.length; index += 1) {
    const command = scenario.commands[index];
    if (command === undefined) continue;
    const expanded: WeightedState[] = [];
    const pendingStates = [...nodes];
    nodes = [];
    while (pendingStates.length > 0) {
      const node = pendingStates.shift();
      if (node === undefined) continue;
      const retainedSiblingNodes = outerRetainedNodes + expanded.length + pendingStates.length;
      expanded.push(...exploreCommand(
        node, command(node.state), counters, scope, runtime, invocationStarted, retainedSiblingNodes,
      ));
      sampleResources(
        counters, scope, runtime, invocationStarted,
        outerRetainedNodes + expanded.length + pendingStates.length,
      );
    }
    nodes = aggregateByFutureState(
      expanded, scenario.commands[index + 1] ?? null, counters, scope, runtime, invocationStarted,
      outerRetainedNodes,
    );
  }
  return nodes;
}

function attack(state: EncounterState, actor: CombatantId, actionId: string, target: CombatantId): EncounterCommand {
  const action = monsterActions(state, actor).find((candidate): candidate is MonsterAttackAction =>
    candidate.kind === 'attack' && candidate.id === actionId);
  if (action === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'missing_attack', observed: actionId, limit: 'present',
  });
  const evaluation = evaluateMonsterTacticalAttack(state, action, actor, target);
  return monsterAttackCommand(action, actor, target, evaluation.rollMode.mode);
}

function healingWord(state: EncounterState): EncounterCommand {
  const source = monsterBonusActions(state, A_PRIEST).find((action) =>
    action.kind === 'spellcasting' && action.id === 'divine-aid');
  if (source?.kind !== 'spellcasting') throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'healing_word_source', observed: 'absent', limit: 'present',
  });
  const reference = source.spells.find((spell) => spell.id === 'healing-word');
  if (reference === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'healing_word_reference', observed: 'absent', limit: 'present',
  });
  const resourcePoolId = monsterSpellResourcePoolId(source.id, reference);
  if (resourcePoolId === null) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'healing_word_resource', observed: 'absent', limit: 'present',
  });
  return {
    type: 'cast_spell', actor: A_PRIEST, spellId: 'healing-word', slotLevel: 1,
    castAsRitual: false, casterLevel: 1, attackBonus: 5, saveDc: 13,
    spellcastingModifier: 3, targets: [A_KNIGHT], area: null, weaponAttack: null,
    selectedOption: null, resourcePoolId, monsterActionId: source.id,
  };
}

export interface ChallengeProvenanceMigrationEvidenceV1 {
  readonly schemaVersion: 1;
  readonly provenanceManifest: readonly DrawRecord[];
  readonly semanticDrawCounts: Readonly<{
    total: 33;
    healing: number;
    savingThrow: number;
    attackDamage: number;
    reaction: number;
  }>;
  readonly reactionPolicies: readonly {
    readonly configured: 'always' | 'never' | 'ask';
    readonly resolution: 'accept' | 'decline';
    readonly reactionDraws: number;
  }[];
  readonly healing: Readonly<{
    uncappedDraws: number;
    uncappedBefore: number;
    uncappedAfter: number;
    cappedDraws: number;
    cappedBefore: number;
    cappedAfter: number;
    hitPointMaximum: number;
  }>;
  readonly potion: Readonly<{
    draws: number;
    before: number;
    after: number;
  }>;
}

function maximumEvidenceRng(): Rng {
  return () => 0.999999;
}

function evidenceTransaction(
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
) {
  return runCommandBoundaryTransaction(state, command, rng, ARENA_REACTION_OFFER_POLICY, null);
}

function roomAProvenance(
  state: EncounterState,
  offerEnvironment: EngineOptionEnvironment,
): Readonly<{
  records: readonly DrawRecord[];
  healing: ChallengeProvenanceMigrationEvidenceV1['healing'];
}> {
  const records: DrawRecord[] = [];
  const healing = healingWord(state);
  const knight = state.combatants.find((entry) => entry.profile.id === A_KNIGHT);
  if (knight === undefined) throw new Error('Room A Knight is absent.');
  const uncapped = evidenceTransaction(state, healing, maximumEvidenceRng());
  records.push(...uncapped.dieRolls);
  const cappedState = replaceHitPoints(state, A_KNIGHT, knight.profile.rules.hitPointMaximum - 1);
  const capped = evidenceTransaction(
    cappedState,
    healing,
    maximumEvidenceRng(),
  );
  records.push(...capped.dieRolls);

  const offer = availableEngineActorOptions(state, A_PRIEST, offerEnvironment).find((candidate) =>
    candidate.label === 'Mace + Mace -> combatant:wizard');
  if (offer === undefined) throw new Error('Room A two-Mace option is absent.');
  const resolved = resolveEngineActorOption(state, offer, offerEnvironment);
  if (!resolved.valid) throw new Error(`Room A two-Mace option failed re-resolution: ${resolved.code}`);
  let current = state;
  const rng = maximumEvidenceRng();
  if (resolved.mechanics.path.length > 0) current = evidenceTransaction(current, {
    type: 'move', actor: A_PRIEST, path: resolved.mechanics.path, cause: 'voluntary',
  }, rng).state;
  for (let index = 0; index < 2; index += 1) {
    const result = evidenceTransaction(current, attack(current, A_PRIEST, 'mace', WIZARD), rng);
    current = result.state;
    records.push(...result.dieRolls);
  }
  const uncappedAfter = uncapped.state.combatants.find((entry) => entry.profile.id === A_KNIGHT)?.hitPoints;
  const cappedAfter = capped.state.combatants.find((entry) => entry.profile.id === A_KNIGHT)?.hitPoints;
  if (uncappedAfter === undefined || cappedAfter === undefined) throw new Error('Room A healing target disappeared.');
  return {
    records,
    healing: {
      uncappedDraws: uncapped.dieRolls.length,
      uncappedBefore: knight.hitPoints,
      uncappedAfter,
      cappedDraws: capped.dieRolls.length,
      cappedBefore: knight.profile.rules.hitPointMaximum - 1,
      cappedAfter,
      hitPointMaximum: knight.profile.rules.hitPointMaximum,
    },
  };
}

function endEvidenceTurn(state: EncounterState, actor: CombatantId, rng: Rng): EncounterState {
  return evidenceTransaction(state, { type: 'end_turn', actor }, rng).state;
}

function roomDGuardOutcome(state: EncounterState, rng: Rng): EncounterState {
  const dodged = evidenceTransaction(state, { type: 'dodge', actor: D_GUARD, cost: 'action' }, rng).state;
  return endEvidenceTurn(dodged, D_GUARD, rng);
}

function operationIncludes(record: DrawRecord, segment: string): boolean {
  return String(record.provenance.operationPath).split('/').includes(segment);
}

export function challengeProvenanceMigrationEvidenceV1(
  roomA: EncounterState,
  roomD: EncounterState,
): ChallengeProvenanceMigrationEvidenceV1 {
  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
  const roomAEvidence = roomAProvenance(roomA, offerEnvironment);
  const provenanceManifest = [...roomAEvidence.records];
  const potionState: EncounterState = {
    ...replaceHitPoints(roomA, A_PRIEST, 6),
    effects: [...roomA.effects, {
      id: encounterEffectId('effect:d583-provenance-potion'), source: A_PRIEST,
      targets: [A_PRIEST], createdRevision: roomA.revision,
      duration: { kind: 'permanent' }, concentrationOwner: null,
      stackingIdentity: effectStackingIdentity('item:d583-provenance-potion'), stacking: 'coexist',
      repeatedSave: null, damageBreak: null,
      payload: {
        kind: 'healing_potion', itemId: itemId('item:d583-provenance-potion'), remainingUses: 1,
        dice: { count: 2, sides: 4, modifier: 2 }, activation: 'bonus_action',
      },
    }],
  };
  const potionResult = evidenceTransaction(potionState, {
    type: 'drink_healing_potion', actor: A_PRIEST,
    effectId: encounterEffectId('effect:d583-provenance-potion'),
  }, maximumEvidenceRng());
  const potionAfter = potionResult.state.combatants.find((entry) => entry.profile.id === A_PRIEST)?.hitPoints;
  if (potionAfter === undefined) throw new Error('Room A potion consumer disappeared.');
  const rng = maximumEvidenceRng();
  let current = roomDGuardOutcome(roomD, rng);
  current = endEvidenceTurn(current, FIGHTER, rng);
  for (const [actor, target] of [[D_SCOUT_1, FIGHTER], [D_SCOUT_2, WIZARD]] as const) {
    if (actor === D_SCOUT_2) current = endEvidenceTurn(endEvidenceTurn(current, D_SCOUT_1, rng), CLERIC, rng);
    for (let index = 0; index < 2; index += 1) {
      const result = evidenceTransaction(current, attack(current, actor, 'longbow', target), rng);
      current = result.state;
      provenanceManifest.push(...result.dieRolls);
    }
  }
  const alternative = roomDGuardOutcome(roomD, maximumEvidenceRng());
  const genericSave = regretTurnLegalActions(alternative, FIGHTER).actions.find((command) =>
    command.type === 'force_save' && command.target === D_SCOUT_1);
  if (genericSave?.type !== 'force_save') throw new Error('Room D Fighter generic save against Scout 1 is absent.');
  provenanceManifest.push(...evidenceTransaction(alternative, genericSave, maximumEvidenceRng()).dieRolls);

  const reactionPolicies = (['always', 'never', 'ask'] as const).map((configured) => {
    const configuredState: EncounterState = {
      ...alternative,
      reactionPolicies: [{ combatant: D_GUARD, reactionKind: 'opportunity_attack', policy: configured }],
    };
    const moved = evidenceTransaction(configuredState, {
      type: 'move', actor: FIGHTER, path: [{ column: 5, row: 5 }], cause: 'voluntary',
    }, maximumEvidenceRng());
    const fallbackResolution = moved.fallbackResolutions.find((entry) =>
      entry.combatant === D_GUARD && entry.reactionKind === 'opportunity_attack')?.resolution;
    const policyResolution = moved.events.find((event): event is Extract<
      EncounterEvent, { readonly type: 'reaction_policy_auto_resolved' }
    > => event.type === 'reaction_policy_auto_resolved' && event.combatant === D_GUARD &&
      event.reactionKind === 'opportunity_attack');
    const resolution = fallbackResolution ?? policyResolution?.resolution;
    if (resolution === undefined) throw new Error(`Room D ${configured} policy produced no reaction resolution.`);
    const reactionDraws = moved.dieRolls.filter((record) => operationIncludes(record, 'reaction')).length;
    return { configured, resolution, reactionDraws };
  });

  if (provenanceManifest.length !== 33) throw new Error(
    `Phase-3a provenance migration expected 33 semantic draws, observed ${String(provenanceManifest.length)}.`,
  );
  return {
    schemaVersion: 1,
    provenanceManifest,
    semanticDrawCounts: {
      total: 33,
      healing: provenanceManifest.filter((record) => operationIncludes(record, 'healing')).length,
      savingThrow: provenanceManifest.filter((record) => operationIncludes(record, 'saving_throw')).length,
      attackDamage: provenanceManifest.filter((record) => operationIncludes(record, 'attack_damage')).length,
      reaction: provenanceManifest.filter((record) => operationIncludes(record, 'reaction')).length,
    },
    reactionPolicies,
    healing: roomAEvidence.healing,
    potion: { draws: potionResult.dieRolls.length, before: 6, after: potionAfter },
  };
}

function greatclubSequence(state: EncounterState, offerEnvironment: EngineOptionEnvironment): Scenario {
  const offer = availableEngineActorOptions(state, C_OGRE, offerEnvironment).find((candidate) =>
    candidate.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'attack' && slot.use.actionId === 'greatclub'));
  if (offer === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'greatclub_offer', observed: 'absent', limit: 'present',
  });
  const resolved = resolveEngineActorOption(state, offer, offerEnvironment);
  if (!resolved.valid) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'greatclub_reresolution', observed: resolved.code, limit: 'valid',
  });
  const path = resolved.mechanics.path;
  return {
    name: 'greatclub-approach',
    commands: [
      ...(path.length === 0 ? [] : [(): EncounterCommand => ({
        type: 'move', actor: C_OGRE, path, cause: 'voluntary',
      })]),
      (current): EncounterCommand => attack(current, C_OGRE, 'greatclub', WIZARD),
    ],
  };
}

function priestApproach(
  state: EncounterState,
  offerEnvironment: EngineOptionEnvironment,
): readonly ((state: EncounterState) => EncounterCommand)[] {
  const offer = availableEngineActorOptions(state, A_PRIEST, offerEnvironment).find((candidate) =>
    candidate.label === 'Mace + Mace -> combatant:wizard');
  if (offer === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'priest_mace_offer', observed: 'absent', limit: 'present',
  });
  const resolved = resolveEngineActorOption(state, offer, offerEnvironment);
  if (!resolved.valid) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'priest_mace_reresolution', observed: resolved.code, limit: 'valid',
  });
  const path = resolved.mechanics.path;
  return path.length === 0 ? [] : [(): EncounterCommand => ({
    type: 'move', actor: A_PRIEST, path, cause: 'voluntary',
  })];
}

function scenarios(
  room: 'B' | 'C' | 'A',
  state: EncounterState,
  offerEnvironment: EngineOptionEnvironment,
): readonly Scenario[] {
  switch (room) {
    case 'B': return [
      { name: 'javelin-fighter', commands: [(current) => attack(current, B_OGRE, 'javelin', FIGHTER)] },
      { name: 'javelin-wizard', commands: [(current) => attack(current, B_OGRE, 'javelin', WIZARD)] },
    ];
    case 'C': return [
      { name: 'javelin-hold', commands: [(current) => attack(current, C_OGRE, 'javelin', WIZARD)] },
      greatclubSequence(state, offerEnvironment),
    ];
    case 'A': {
      const approach = priestApproach(state, offerEnvironment);
      return [
      {
        name: 'same-attacks-with-healing-word',
        commands: [
          ...approach,
          healingWord,
          (current) => attack(current, A_PRIEST, 'mace', WIZARD),
          (current) => attack(current, A_PRIEST, 'mace', WIZARD),
        ],
      },
      {
        name: 'same-attacks-without-healing-word',
        commands: [
          ...approach,
          (current) => attack(current, A_PRIEST, 'mace', WIZARD),
          (current) => attack(current, A_PRIEST, 'mace', WIZARD),
        ],
      },
      ];
    }
  }
}

function replaceHitPoints(state: EncounterState, actor: CombatantId, hitPoints: number): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((entry) => entry.profile.id === actor ? { ...entry, hitPoints } : entry),
  };
}

function replacePosition(state: EncounterState, actor: CombatantId, position: GridCell): EncounterState {
  return {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === actor ? { ...token, position } : token),
  };
}

function swapInitiative(state: EncounterState, left: CombatantId, right: CombatantId, swap: boolean): EncounterState {
  if (!swap) return state;
  const leftIndex = state.initiative.findIndex((entry) => entry.combatant === left);
  const rightIndex = state.initiative.findIndex((entry) => entry.combatant === right);
  if (leftIndex < 0 || rightIndex < 0) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'initiative_variant', observed: -1, limit: 0,
  });
  const initiative = [...state.initiative];
  const leftEntry = initiative[leftIndex];
  const rightEntry = initiative[rightIndex];
  if (leftEntry === undefined || rightEntry === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'initiative_variant', observed: -1, limit: 0,
  });
  initiative[leftIndex] = { ...rightEntry, slot: leftEntry.slot };
  initiative[rightIndex] = { ...leftEntry, slot: rightEntry.slot };
  return { ...state, initiative };
}

function variants(room: 'B' | 'C' | 'A', base: EncounterState): readonly { readonly id: string; readonly state: EncounterState }[] {
  const result: Array<{ readonly id: string; readonly state: EncounterState }> = [];
  if (room === 'B') {
    for (const fighterHp of [5, 6, 7]) for (const ogreHp of [64, 66, 68]) for (const swapped of [false, true]) {
      result.push({
        id: `fighter-${String(fighterHp)}-ogre-${String(ogreHp)}-order-${swapped ? 'wizard-cleric' : 'cleric-wizard'}`,
        state: swapInitiative(replaceHitPoints(replaceHitPoints(base, FIGHTER, fighterHp), B_OGRE, ogreHp), CLERIC, WIZARD, swapped),
      });
    }
  } else if (room === 'C') {
    for (const ogreHp of [60, 64, 68]) for (const position of [
      { column: 11, row: 4 }, { column: 12, row: 4 }, { column: 12, row: 5 },
    ] as const) for (const swapped of [false, true]) {
      result.push({
        id: `ogre-${String(ogreHp)}-wizard-${String(position.column)}-${String(position.row)}-order-${swapped ? 'cleric-fighter' : 'fighter-cleric'}`,
        state: swapInitiative(replacePosition(replaceHitPoints(base, C_OGRE, ogreHp), WIZARD, position), FIGHTER, CLERIC, swapped),
      });
    }
  } else {
    for (const knightHp of [5, 6, 7]) for (const row of [4, 5, 6]) for (const swapped of [false, true]) {
      const positioned = replacePosition(replacePosition(replaceHitPoints(base, A_KNIGHT, knightHp), A_KNIGHT, {
        column: 7, row,
      }), FIGHTER, { column: 6, row });
      result.push({
        id: `knight-${String(knightHp)}-row-${String(row)}-order-${swapped ? 'cleric-scout' : 'scout-cleric'}`,
        state: swapInitiative(
          positioned, 'combatant:generated-challenge-a-03-scout' as CombatantId, CLERIC, swapped,
        ),
      });
    }
  }
  if (result.length !== 18) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'variant_count', observed: result.length, limit: 18,
  });
  return result;
}

function cumulativeWorkDelta(
  before: MutableCounters,
  after: MutableCounters,
): Readonly<{ faceExpansions: number; reducerApplications: number; completedLeaves: number }> {
  return {
    faceExpansions: after.faceExpansions - before.faceExpansions,
    reducerApplications: after.reducerApplications - before.reducerApplications,
    completedLeaves: after.completedLeaves - before.completedLeaves,
  };
}

function copyCounters(value: MutableCounters): MutableCounters {
  return { ...value };
}

function runVariant(
  variantId: string,
  isBase: boolean,
  room: 'B' | 'C' | 'A',
  state: EncounterState,
  counters: MutableCounters,
  runtime: FeasibilityRuntime,
  invocationStarted: number,
  offerEnvironment: EngineOptionEnvironment,
): ChallengeReducerVariantReportV1 {
  const before = copyCounters(counters);
  const scope: VariantScope = {
    started: runtime.now(), peakLiveNodes: 0, peakHeapUsedBytes: 0,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  sampleResources(counters, scope, runtime, invocationStarted, 0);
  const finalNodes: WeightedState[] = [];
  for (const scenario of scenarios(room, state, offerEnvironment)) {
    try {
      const scenarioNodes = runScenario(
        state, scenario, counters, scope, runtime, invocationStarted, finalNodes.length,
      );
      const scenarioMass = scenarioNodes.reduce<ExactFraction>(
        (sum, node) => addFractions(sum, node.weight), exactWeight(0n, 1n),
      );
      if (scenarioMass.numerator !== 1n || scenarioMass.denominator !== 1n) {
        throw new FeasibilityStop({
          kind: 'invariant_failure', counter: `probability_mass:${room}:${variantId}:${scenario.name}`,
          observed: `${String(scenarioMass.numerator)}/${String(scenarioMass.denominator)}`,
          limit: '1/1',
        });
      }
      finalNodes.push(...scenarioNodes);
    } catch (error) {
      if (error instanceof FeasibilityStop) throw error;
      throw new FeasibilityStop({
        kind: 'invariant_failure', counter: `variant:${room}:${variantId}:${scenario.name}`,
        observed: error instanceof Error ? error.message : String(error), limit: 'successful reducer execution',
      });
    }
  }
  const mass = finalNodes.reduce<ExactFraction>(
    (sum, node) => addFractions(sum, node.weight), exactWeight(0n, 1n),
  );
  const expectedScenarioMass = BigInt(scenarios(room, state, offerEnvironment).length);
  if (mass.numerator !== expectedScenarioMass || mass.denominator !== 1n) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'probability_mass', observed: `${String(mass.numerator)}/${String(mass.denominator)}`,
    limit: `${String(expectedScenarioMass)}/1`,
  });
  const measured = cumulativeWorkDelta(before, counters);
  return {
    variantId,
    isBase,
    faceExpansions: measured.faceExpansions,
    reducerApplications: measured.reducerApplications,
    completedLeaves: measured.completedLeaves,
    groupedStates: finalNodes.length,
    peakLiveNodes: scope.peakLiveNodes,
    peakHeapUsedBytes: scope.peakHeapUsedBytes,
    wallMilliseconds: Number((runtime.now() - scope.started).toFixed(3)),
    maximumCommandCheckpoints: scope.maximumCommandCheckpoints,
    maximumDraws: scope.maximumDraws,
    mass: rationalJson(exactWeight(1n, 1n)),
    continuationEquivalent: true,
    invocationCumulative: {
      faceExpansions: counters.faceExpansions,
      reducerApplications: counters.reducerApplications,
      completedLeaves: counters.completedLeaves,
      peakLiveNodes: counters.peakLiveNodes,
      peakHeapUsedBytes: counters.peakHeapUsedBytes,
      wallMilliseconds: Number((runtime.now() - invocationStarted).toFixed(3)),
      maximumCommandCheckpoints: counters.maximumCommandCheckpoints,
      maximumDraws: counters.maximumDraws,
    },
  };
}

export function classifyDerivedCaps(
  measured: Pick<ReducerFeasibilityMeasurementV1, 'peakLiveNodes' | 'peakHeapUsedBytes' | 'wallMilliseconds'>,
): { readonly caps: NonNullable<ChallengeReducerFeasibilityReportV1['derivedWitnessCaps']> | null; readonly failure: FeasibilityFailureV1 | null } {
  const caps = {
    maxNodes: Math.ceil(measured.peakLiveNodes * 1.25),
    maxHeapUsedBytes: Math.ceil(measured.peakHeapUsedBytes * 1.25),
    maxWallMilliseconds: Math.ceil(measured.wallMilliseconds * 2),
    headroom: '25_percent_nodes_and_heap_100_percent_wall' as const,
  };
  const checks = [
    ['derived_nodes', caps.maxNodes, D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes],
    ['derived_heap_used_bytes', caps.maxHeapUsedBytes, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes],
    ['derived_wall_milliseconds', caps.maxWallMilliseconds, D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds],
  ] as const;
  const overflow = checks.find(([, observed, limit]) => observed > limit);
  return overflow === undefined
    ? { caps, failure: null }
    : {
        caps: null,
        failure: { kind: 'derived_cap_overflow', counter: overflow[0], observed: overflow[1], limit: overflow[2] },
      };
}

export function classifyFixedLimitMeasurement(
  measurement: Readonly<{
    faceExpansions: number; reducerApplications: number; liveNodes: number; heapUsedBytes: number;
    wallMilliseconds: number; commandCheckpoints: number; draws: number;
  }>,
): FeasibilityFailureV1 | null {
  const checks = [
    ['face_expansions', measurement.faceExpansions, D583_BCA_FEASIBILITY_LIMITS_V1.maxFaceExpansions],
    ['reducer_applications', measurement.reducerApplications, D583_BCA_FEASIBILITY_LIMITS_V1.maxReducerApplications],
    ['live_nodes', measurement.liveNodes, D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes],
    ['heap_used_bytes', measurement.heapUsedBytes, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes],
    ['wall_milliseconds', measurement.wallMilliseconds, D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds],
    ['command_checkpoints_per_branch', measurement.commandCheckpoints, D583_BCA_FEASIBILITY_LIMITS_V1.maxCommandCheckpointsPerBranch],
    ['draws_per_branch', measurement.draws, D583_BCA_FEASIBILITY_LIMITS_V1.maxDrawsPerBranch],
  ] as const;
  const exceeded = checks.find(([, observed, limit]) => observed > limit);
  return exceeded === undefined ? null : {
    kind: 'limit_exhausted', counter: exceeded[0], observed: exceeded[1], limit: exceeded[2],
  };
}

export function shelvedChallengeFeasibilityReport(
  failure: FeasibilityFailureV1,
): ChallengeReducerFeasibilityReportV1 {
  return {
    schemaVersion: 1, verdict: 'SHELVE_D583', basis: 'challenge',
    roomOrder: ['B', 'C', 'A'], roomCount: 3,
    limits: D583_BCA_FEASIBILITY_LIMITS_V1,
    rooms: [],
    totals: {
      faceExpansions: 0, reducerApplications: 0, completedLeaves: 0, groupedStates: 0,
      peakLiveNodes: 0, peakHeapUsedBytes: 0, wallMilliseconds: 0,
      maximumCommandCheckpoints: 0, maximumDraws: 0,
      mass: { numerator: '0', denominator: '1' }, continuationEquivalent: false,
    },
    derivedWitnessCaps: null,
    failure,
  };
}

export function probeReducerApplicationLimitSampling(
  state: EncounterState,
  command: EncounterCommand,
  runtime: FeasibilityRuntime,
): FeasibilityFailureV1 | null {
  const counters: MutableCounters = {
    faceExpansions: 0, reducerApplications: 0, completedLeaves: 0,
    peakLiveNodes: 0, peakHeapUsedBytes: 0,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const scope: VariantScope = {
    started: runtime.now(), peakLiveNodes: 0, peakHeapUsedBytes: 0,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  try {
    runCommandBoundaryTransaction(
      state, command, recordingTransactionRng(583_200_001), ARENA_REACTION_OFFER_POLICY, null,
      accounting(counters, scope, runtime, scope.started, () => 1),
    );
    return null;
  } catch (error) {
    if (error instanceof FeasibilityStop) return error.failure;
    throw error;
  }
}

export function probeRetainedSiblingLimitSampling(
  state: EncounterState,
  command: EncounterCommand,
  runtime: FeasibilityRuntime,
): FeasibilityFailureV1 | null {
  const started = runtime.now();
  const counters: MutableCounters = {
    faceExpansions: 0, reducerApplications: 0, completedLeaves: 0,
    peakLiveNodes: 0, peakHeapUsedBytes: 0,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const scope: VariantScope = {
    started, peakLiveNodes: 0, peakHeapUsedBytes: 0,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  try {
    exploreCommand({
      state, weight: exactWeight(1n, 1n),
      branchProvenance: [{
        weight: exactWeight(1n, 1n), traces: [], events: [], draws: 0, commandCheckpoints: 0,
      }],
    }, command, counters, scope, runtime, started, D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes);
    return null;
  } catch (error) {
    if (error instanceof FeasibilityStop) return error.failure;
    throw error;
  }
}

export function probeReducerContinuationV1(
  state: EncounterState,
  command: EncounterCommand,
  runtime: FeasibilityRuntime = PRODUCTION_RUNTIME,
): Readonly<{
  completedOutcomes: number;
  reducerApplications: number;
  provenanceRequests: readonly unknown[];
  resultingKeys: readonly FutureStateKeyV1[];
}> {
  const started = runtime.now();
  const counters: MutableCounters = {
    faceExpansions: 0, reducerApplications: 0, completedLeaves: 0,
    peakLiveNodes: 0, peakHeapUsedBytes: runtime.heapUsed(),
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const scope: VariantScope = {
    started, peakLiveNodes: 0, peakHeapUsedBytes: counters.peakHeapUsedBytes,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const outcomes = exploreCommand({
    state,
    weight: exactWeight(1n, 1n),
    branchProvenance: [{
      weight: exactWeight(1n, 1n), traces: [], events: [], draws: 0, commandCheckpoints: 0,
    }],
  }, command, counters, scope, runtime, started, 0);
  return {
    completedOutcomes: outcomes.length,
    reducerApplications: counters.reducerApplications,
    provenanceRequests: outcomes.flatMap((outcome) => outcome.branchProvenance.flatMap((branch) =>
      branch.traces.flatMap((trace) => trace.attempts.map(serializableRequest)))),
    resultingKeys: outcomes.map((outcome) => futureStateKeyV1(outcome.state, [])),
  };
}

export function probeScenarioAccountingV1(
  state: EncounterState,
  commands: readonly EncounterCommand[],
  runtime: FeasibilityRuntime = PRODUCTION_RUNTIME,
): Readonly<{
  finalStates: number;
  retainedBranchProvenance: number;
  reducerApplications: number;
  peakLiveNodes: number;
  maximumCommandCheckpoints: number;
  maximumDraws: number;
}> {
  const started = runtime.now();
  const counters: MutableCounters = {
    faceExpansions: 0, reducerApplications: 0, completedLeaves: 0,
    peakLiveNodes: 0, peakHeapUsedBytes: runtime.heapUsed(),
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const scope: VariantScope = {
    started, peakLiveNodes: 0, peakHeapUsedBytes: counters.peakHeapUsedBytes,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const finalStates = runScenario(state, {
    name: 'accounting-probe', commands: commands.map((command) => () => command),
  }, counters, scope, runtime, started, 0);
  return {
    finalStates: finalStates.length,
    retainedBranchProvenance: finalStates.reduce(
      (sum, finalState) => sum + finalState.branchProvenance.length, 0,
    ),
    reducerApplications: counters.reducerApplications,
    peakLiveNodes: counters.peakLiveNodes,
    maximumCommandCheckpoints: counters.maximumCommandCheckpoints,
    maximumDraws: counters.maximumDraws,
  };
}

export async function runChallengeReducerFeasibility(
  loadFixtureText: (seed: 5831001 | 5831002 | 5831003) => Promise<string>,
  runtime: FeasibilityRuntime = PRODUCTION_RUNTIME,
): Promise<ChallengeReducerFeasibilityReportV1> {
  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
  const started = runtime.now();
  const initialHeapUsed = runtime.heapUsed();
  const counters: MutableCounters = {
    faceExpansions: 0, reducerApplications: 0, completedLeaves: 0,
    peakLiveNodes: 0, peakHeapUsedBytes: initialHeapUsed,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const rooms: Array<ChallengeReducerFeasibilityReportV1['rooms'][number]> = [];
  try {
    checkLimit('heap_used_bytes', initialHeapUsed, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes);
    checkLimit('wall_milliseconds', runtime.now() - started, D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds);
    for (const [roomId, seed] of [['B', 5831001], ['C', 5831002], ['A', 5831003]] as const) {
      const decoded = decodeArenaBasisEnvelopeV1(JSON.parse(await loadFixtureText(seed)) as unknown, {
        mode: 'challenge',
      }).encounter.state;
      const base = runVariant('base', true, roomId, decoded, counters, runtime, started, offerEnvironment);
      const variantReports = variants(roomId, decoded).map((variant) =>
        runVariant(variant.id, false, roomId, variant.state, counters, runtime, started, offerEnvironment));
      rooms.push({ roomId, base, variants: variantReports });
    }
    if (rooms.length !== 3 || rooms.some((room) => room.variants.length !== 18)) throw new FeasibilityStop({
      kind: 'invariant_failure', counter: 'room_variant_completeness',
      observed: rooms.reduce((sum, room) => sum + room.variants.length, 0), limit: 54,
    });
    const wallMilliseconds = Number((runtime.now() - started).toFixed(3));
    const totals: ReducerFeasibilityMeasurementV1 = {
      faceExpansions: counters.faceExpansions,
      reducerApplications: counters.reducerApplications,
      completedLeaves: counters.completedLeaves,
      groupedStates: rooms.reduce((sum, room) =>
        sum + room.base.groupedStates + room.variants.reduce((inner, variant) => inner + variant.groupedStates, 0), 0),
      peakLiveNodes: counters.peakLiveNodes,
      peakHeapUsedBytes: counters.peakHeapUsedBytes,
      wallMilliseconds,
      maximumCommandCheckpoints: counters.maximumCommandCheckpoints,
      maximumDraws: counters.maximumDraws,
      mass: { numerator: '57', denominator: '1' },
      continuationEquivalent: true,
    };
    const derived = classifyDerivedCaps(totals);
    return {
      schemaVersion: 1,
      verdict: derived.failure === null ? 'GO' : 'SHELVE_D583',
      basis: 'challenge', roomOrder: ['B', 'C', 'A'], roomCount: 3,
      limits: D583_BCA_FEASIBILITY_LIMITS_V1,
      rooms,
      totals,
      derivedWitnessCaps: derived.caps,
      failure: derived.failure,
    };
  } catch (error) {
    const failure = error instanceof FeasibilityStop
      ? error.failure
      : {
          kind: 'invariant_failure' as const,
          counter: 'unexpected_error',
          observed: error instanceof Error ? error.message : String(error),
          limit: 'successful completion',
        };
    return shelvedChallengeFeasibilityReport(failure);
  }
}

export function recordingTransactionRng(seed: number) {
  return transactionalRng((() => {
    let state = seed >>> 0;
    return (): number => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  })());
}
