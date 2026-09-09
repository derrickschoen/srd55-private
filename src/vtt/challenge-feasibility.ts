import { canonicalJson } from '../commands/canonical-json';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import { monsterAttackCommand } from '../combat/monster-commands';
import { transactionalRng } from '../combat/random';
import {
  addFractions,
  emptyRollPrefix,
  exactWeight,
  multiplyFractions,
  replayPrefix,
  type DieRequest,
  type ExactFraction,
  type ExactWeight,
  type RollPrefix,
  type RollTrace,
} from '../combat/roll-provenance';
import { monsterSpellResourcePoolId, type MonsterAttackAction } from '../combat/statblock';
import type { GridCell } from '../combat/grid';
import type { CombatantId } from '../combat/values';
import { decodeArenaBasisEnvelopeV1 } from './arena-fixture';
import {
  runCommandBoundaryTransaction,
  type ReducerApplicationAccounting,
} from './engine-round-application';
import { monsterActions, monsterBonusActions } from './engine-query-port';
import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
import { ARENA_REACTION_OFFER_POLICY } from './reaction-offer-host-policy';

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
  readonly combatants: readonly unknown[];
  readonly positions: readonly unknown[];
  readonly initiative: EncounterState['initiative'];
  readonly activeCombatant: EncounterState['activeCombatant'];
  readonly activeInitiativeIndex: EncounterState['activeInitiativeIndex'];
  readonly round: number;
  readonly effects: EncounterState['effects'];
  readonly persistentAreas: EncounterState['persistentAreas'];
  readonly pendingDecisions: EncounterState['pendingDecisions'];
  readonly reactionPolicies: EncounterState['reactionPolicies'];
  readonly revision: number;
  readonly phase: EncounterState['phase'];
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

interface WeightedState {
  readonly state: EncounterState;
  readonly weight: ExactWeight;
  readonly trace: RollTrace;
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

const B_OGRE = 'combatant:generated-challenge-b-01-ogre' as CombatantId;
const C_OGRE = 'combatant:generated-challenge-c-01-ogre' as CombatantId;
const A_PRIEST = 'combatant:generated-challenge-a-02-priest' as CombatantId;
const A_KNIGHT = 'combatant:generated-challenge-a-01-knight' as CombatantId;
const FIGHTER = 'combatant:fighter' as CombatantId;
const CLERIC = 'combatant:cleric' as CombatantId;
const WIZARD = 'combatant:wizard' as CombatantId;

export const D583_D_ONE_POLICY_EVIDENCE = Object.freeze({
  classification: 'single_policy_counterexample_not_optimized_search' as const,
  genericSaveKills: '540/1280' as const,
  expectedScoutPrimaryTurns: '101/64' as const,
  optimizedSurfaceClaim: false as const,
});

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

function sampleResources(counters: MutableCounters, started: number, liveNodes: number): void {
  counters.peakLiveNodes = Math.max(counters.peakLiveNodes, liveNodes);
  counters.peakHeapUsedBytes = Math.max(counters.peakHeapUsedBytes, process.memoryUsage().heapUsed);
  checkLimit('live_nodes', liveNodes, D583_BCA_FEASIBILITY_LIMITS_V1.maxLiveNodes);
  checkLimit('heap_used_bytes', counters.peakHeapUsedBytes, D583_BCA_FEASIBILITY_LIMITS_V1.maxHeapUsedBytes);
  checkLimit('wall_milliseconds', performance.now() - started, D583_BCA_FEASIBILITY_LIMITS_V1.maxWallMilliseconds);
}

function accounting(counters: MutableCounters, started: number): ReducerApplicationAccounting {
  return {
    attempted: (): void => {
      counters.reducerApplications += 1;
      checkLimit(
        'reducer_applications', counters.reducerApplications,
        D583_BCA_FEASIBILITY_LIMITS_V1.maxReducerApplications,
      );
      sampleResources(counters, started, 0);
    },
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
  return {
    schemaVersion: 1,
    combatants: [...state.combatants]
      .sort((left, right) => String(left.profile.id).localeCompare(String(right.profile.id)))
      .map((entry) => ({
        id: entry.profile.id,
        hitPoints: entry.hitPoints,
        temporaryHitPoints: entry.temporaryHitPoints,
        life: entry.life,
        deathSaves: entry.deathSaves,
        spellSlots: entry.spellSlots,
        turn: entry.turn,
        wildShapeUses: entry.wildShapeUses,
      })),
    positions: [...state.tokens]
      .sort((left, right) => String(left.combatantId).localeCompare(String(right.combatantId)))
      .map((token) => ({ combatantId: token.combatantId, position: token.position })),
    initiative: state.initiative,
    activeCombatant: state.activeCombatant,
    activeInitiativeIndex: state.activeInitiativeIndex,
    round: state.round,
    effects: state.effects,
    persistentAreas: state.persistentAreas,
    pendingDecisions: state.pendingDecisions,
    reactionPolicies: state.reactionPolicies,
    revision: state.revision,
    phase: state.phase,
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

function continuationSignature(
  state: EncounterState,
  command: EncounterCommand,
  counters: MutableCounters,
  started: number,
): string {
  const step = replayPrefix(emptyRollPrefix(), (rolls) => runCommandBoundaryTransaction(
    state, command, rolls, ARENA_REACTION_OFFER_POLICY, null, accounting(counters, started),
  ));
  if (step.kind === 'fork') {
    return canonicalJson({
      kind: 'fork', request: serializableRequest(step.request),
      objective: objectiveContribution(state), requiredActorEligibility: requiredActorEligibility(state),
    });
  }
  return canonicalJson({
    kind: 'complete',
    key: futureStateKeyV1(step.value.state, []),
    objective: objectiveContribution(step.value.state),
    requiredActorEligibility: requiredActorEligibility(step.value.state),
    nextRequest: null,
  });
}

function objectiveContribution(state: EncounterState): readonly number[] {
  return [...state.combatants]
    .sort((left, right) => String(left.profile.id).localeCompare(String(right.profile.id)))
    .map((entry) => entry.hitPoints);
}

function requiredActorEligibility(state: EncounterState): readonly string[] {
  return state.combatants.filter((entry) => entry.life === 'living').map((entry) => String(entry.profile.id)).sort();
}

function exploreCommand(
  state: EncounterState,
  command: EncounterCommand,
  incomingWeight: ExactWeight,
  counters: MutableCounters,
  started: number,
): readonly WeightedState[] {
  const queue: Array<{ readonly prefix: RollPrefix; readonly weight: ExactWeight; readonly checkpoints: number }> = [
    { prefix: emptyRollPrefix(), weight: incomingWeight, checkpoints: 1 },
  ];
  const leaves: WeightedState[] = [];
  while (queue.length > 0) {
    sampleResources(counters, started, queue.length + leaves.length);
    const node = queue.shift();
    if (node === undefined) break;
    checkLimit(
      'command_checkpoints_per_branch', node.checkpoints,
      D583_BCA_FEASIBILITY_LIMITS_V1.maxCommandCheckpointsPerBranch,
    );
    const step = replayPrefix(node.prefix, (rolls) => runCommandBoundaryTransaction(
      state, command, rolls, ARENA_REACTION_OFFER_POLICY, null, accounting(counters, started),
    ));
    if (step.kind === 'complete') {
      counters.completedLeaves += 1;
      counters.maximumDraws = Math.max(counters.maximumDraws, step.trace.attempts.length);
      checkLimit('draws_per_branch', step.trace.attempts.length, D583_BCA_FEASIBILITY_LIMITS_V1.maxDrawsPerBranch);
      leaves.push({ state: step.value.state, weight: node.weight, trace: step.trace });
      continue;
    }
    counters.faceExpansions += step.branches.length;
    checkLimit(
      'face_expansions', counters.faceExpansions,
      D583_BCA_FEASIBILITY_LIMITS_V1.maxFaceExpansions,
    );
    for (const branch of step.branches) {
      checkLimit('draws_per_branch', branch.prefix.expectedAttempts.length, D583_BCA_FEASIBILITY_LIMITS_V1.maxDrawsPerBranch);
      queue.push({
        prefix: branch.prefix,
        weight: multiplyFractions(node.weight, branch.conditionalWeight) as ExactWeight,
        checkpoints: node.checkpoints,
      });
    }
  }
  return leaves;
}

function aggregateByFutureState(
  nodes: readonly WeightedState[],
  nextCommand: ((state: EncounterState) => EncounterCommand) | null,
  counters: MutableCounters,
  started: number,
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
        member.state, nextCommand(member.state), counters, started,
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
    merged.push({ ...first, weight });
    if (canonicalJson(futureStateKeyV1(first.state, nextCommand === null ? [] : [nextCommand(first.state)])) !== key) {
      throw new FeasibilityStop({
        kind: 'invariant_failure', counter: 'future_state_key_instability', observed: key, limit: 'stable',
      });
    }
  }
  sampleResources(counters, started, merged.length);
  return merged;
}

function runScenario(
  initialState: EncounterState,
  scenario: Scenario,
  counters: MutableCounters,
  started: number,
): readonly WeightedState[] {
  let nodes: readonly WeightedState[] = [{
    state: initialState, weight: exactWeight(1n, 1n),
    trace: { attempts: [], committedDraws: [], committedComponents: [], rollbacks: [], slotIntervals: [] },
  }];
  for (let index = 0; index < scenario.commands.length; index += 1) {
    const command = scenario.commands[index];
    if (command === undefined) continue;
    const expanded = nodes.flatMap((node) => exploreCommand(
      node.state, command(node.state), node.weight, counters, started,
    ));
    nodes = aggregateByFutureState(expanded, scenario.commands[index + 1] ?? null, counters, started);
    counters.maximumCommandCheckpoints = Math.max(counters.maximumCommandCheckpoints, index + 1);
    checkLimit(
      'command_checkpoints_per_branch', index + 1,
      D583_BCA_FEASIBILITY_LIMITS_V1.maxCommandCheckpointsPerBranch,
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

function greatclubSequence(state: EncounterState): Scenario {
  const offer = availableEngineActorOptions(state, C_OGRE).find((candidate) =>
    candidate.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'attack' && slot.use.actionId === 'greatclub'));
  if (offer === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'greatclub_offer', observed: 'absent', limit: 'present',
  });
  const resolved = resolveEngineActorOption(state, offer);
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

function priestApproach(state: EncounterState): readonly ((state: EncounterState) => EncounterCommand)[] {
  const offer = availableEngineActorOptions(state, A_PRIEST).find((candidate) =>
    candidate.label === 'Mace + Mace -> combatant:wizard');
  if (offer === undefined) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'priest_mace_offer', observed: 'absent', limit: 'present',
  });
  const resolved = resolveEngineActorOption(state, offer);
  if (!resolved.valid) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'priest_mace_reresolution', observed: resolved.code, limit: 'valid',
  });
  const path = resolved.mechanics.path;
  return path.length === 0 ? [] : [(): EncounterCommand => ({
    type: 'move', actor: A_PRIEST, path, cause: 'voluntary',
  })];
}

function scenarios(room: 'B' | 'C' | 'A', state: EncounterState): readonly Scenario[] {
  switch (room) {
    case 'B': return [
      { name: 'javelin-fighter', commands: [(current) => attack(current, B_OGRE, 'javelin', FIGHTER)] },
      { name: 'javelin-wizard', commands: [(current) => attack(current, B_OGRE, 'javelin', WIZARD)] },
    ];
    case 'C': return [
      { name: 'javelin-hold', commands: [(current) => attack(current, C_OGRE, 'javelin', WIZARD)] },
      greatclubSequence(state),
    ];
    case 'A': {
      const approach = priestApproach(state);
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

function delta(before: MutableCounters, after: MutableCounters): MutableCounters {
  return {
    faceExpansions: after.faceExpansions - before.faceExpansions,
    reducerApplications: after.reducerApplications - before.reducerApplications,
    completedLeaves: after.completedLeaves - before.completedLeaves,
    peakLiveNodes: after.peakLiveNodes,
    peakHeapUsedBytes: after.peakHeapUsedBytes,
    maximumCommandCheckpoints: after.maximumCommandCheckpoints,
    maximumDraws: after.maximumDraws,
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
  started: number,
): ChallengeReducerVariantReportV1 {
  const before = copyCounters(counters);
  const finalNodes = scenarios(room, state).flatMap((scenario) => {
    try {
      return runScenario(state, scenario, counters, started);
    } catch (error) {
      if (error instanceof FeasibilityStop) throw error;
      throw new FeasibilityStop({
        kind: 'invariant_failure', counter: `variant:${room}:${variantId}:${scenario.name}`,
        observed: error instanceof Error ? error.message : String(error), limit: 'successful reducer execution',
      });
    }
  });
  const mass = finalNodes.reduce<ExactFraction>(
    (sum, node) => addFractions(sum, node.weight), exactWeight(0n, 1n),
  );
  const expectedScenarioMass = BigInt(scenarios(room, state).length);
  if (mass.numerator !== expectedScenarioMass || mass.denominator !== 1n) throw new FeasibilityStop({
    kind: 'invariant_failure', counter: 'probability_mass', observed: `${String(mass.numerator)}/${String(mass.denominator)}`,
    limit: `${String(expectedScenarioMass)}/1`,
  });
  const measured = delta(before, counters);
  return {
    variantId,
    isBase,
    faceExpansions: measured.faceExpansions,
    reducerApplications: measured.reducerApplications,
    completedLeaves: measured.completedLeaves,
    groupedStates: finalNodes.length,
    peakLiveNodes: counters.peakLiveNodes,
    peakHeapUsedBytes: counters.peakHeapUsedBytes,
    wallMilliseconds: Number((performance.now() - started).toFixed(3)),
    maximumCommandCheckpoints: counters.maximumCommandCheckpoints,
    maximumDraws: counters.maximumDraws,
    mass: rationalJson(exactWeight(1n, 1n)),
    continuationEquivalent: true,
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

export async function runChallengeReducerFeasibility(
  loadFixtureText: (seed: 5831001 | 5831002 | 5831003) => Promise<string>,
): Promise<ChallengeReducerFeasibilityReportV1> {
  const started = performance.now();
  const counters: MutableCounters = {
    faceExpansions: 0, reducerApplications: 0, completedLeaves: 0,
    peakLiveNodes: 0, peakHeapUsedBytes: process.memoryUsage().heapUsed,
    maximumCommandCheckpoints: 0, maximumDraws: 0,
  };
  const rooms: Array<ChallengeReducerFeasibilityReportV1['rooms'][number]> = [];
  try {
    for (const [roomId, seed] of [['B', 5831001], ['C', 5831002], ['A', 5831003]] as const) {
      const decoded = decodeArenaBasisEnvelopeV1(JSON.parse(await loadFixtureText(seed)) as unknown, {
        mode: 'challenge',
      }).encounter.state;
      const base = runVariant('base', true, roomId, decoded, counters, started);
      const variantReports = variants(roomId, decoded).map((variant) =>
        runVariant(variant.id, false, roomId, variant.state, counters, started));
      rooms.push({ roomId, base, variants: variantReports });
    }
    if (rooms.length !== 3 || rooms.some((room) => room.variants.length !== 18)) throw new FeasibilityStop({
      kind: 'invariant_failure', counter: 'room_variant_completeness',
      observed: rooms.reduce((sum, room) => sum + room.variants.length, 0), limit: 54,
    });
    const wallMilliseconds = Number((performance.now() - started).toFixed(3));
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
