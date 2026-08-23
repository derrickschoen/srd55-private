import { canonicalJson } from '../../commands/canonical-json';
import {
  AlgorithmController,
  ControllerRegistry,
  type Controller,
  type ControllerDecision,
  type ControllerRequest,
} from '../../combat/controllers';
import {
  isEncounterConfig,
  type EncounterState,
} from '../../combat/encounter';
import { TurnCoordinator, type DurableCoordinatorTransition } from '../../combat/coordinator';
import type { EncounterCommand } from '../../combat/events';
import { gridDistance } from '../../combat/grid';
import { mulberry32 } from '../../combat/random';
import {
  dmVisibleEncounter,
  projectDmView,
  type DmVisibleEncounterState,
} from '../../combat/visibility';
import { combatantId, type CombatantId } from '../../combat/values';
import { sha256 } from '../../crypto/sha256';
import type { RolloutInputCapture } from '../experiment-telemetry';
import type {
  DecisionProgram,
  MonsterRoundProgram,
  PlanAction,
  StatePredicate,
  TargetSelector,
} from '../dm-bridge/contracts';
import {
  collapseEquivalentCandidates,
  type EquivalenceCollapse,
  type RankedRoundCandidate,
} from './equivalence';
import { regretReactionLegalActions, regretTurnLegalActions } from './legal-actions';
import {
  bestUtilityCandidate,
  compareUtility,
  scalarizeUtility,
  terminalUtility,
  utilityBounds,
  utilityDifference,
  type TerminalUtility,
  type UtilityDifference,
} from './utility';

export const REGRET_ORACLE_VERSION = 'vtt-regret-v1' as const;
const MAXIMUM_ROLLOUT_STEPS = 10_000;
type StandingConditionalRider = NonNullable<
  Extract<DecisionProgram, { readonly kind: 'action' }>['riders']
>[number];

export class RolloutStateHashMismatchError extends Error {
  override readonly name = 'RolloutStateHashMismatchError' as const;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function reconstructEncounterState(capture: RolloutInputCapture): EncounterState {
  const parsed: unknown = JSON.parse(capture.serializedEncounterState);
  if (
    !isRecord(parsed) ||
    !isEncounterConfig(parsed.config) ||
    !Array.isArray(parsed.combatants) ||
    !Array.isArray(parsed.tokens) ||
    !Array.isArray(parsed.initiative) ||
    !Array.isArray(parsed.eventLog)
  ) {
    throw new TypeError(`Rollout capture ${capture.logicalCallId} has malformed encounter state.`);
  }
  const actualHash = sha256(canonicalJson(parsed));
  if (actualHash !== capture.stateHash) {
    throw new RolloutStateHashMismatchError(
      `Rollout capture ${capture.logicalCallId} state hash mismatch: expected ${capture.stateHash}, received ${actualHash}.`,
    );
  }
  return parsed as unknown as EncounterState;
}

function visibleSubject(state: DmVisibleEncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.id === id);
  if (found === undefined) throw new TypeError(`Decision program references unknown combatant ${id}.`);
  return found;
}

function predicateValue(predicate: StatePredicate, state: DmVisibleEncounterState): boolean {
  switch (predicate.kind) {
    case 'life_is':
      return visibleSubject(state, predicate.combatantId).life === predicate.value;
    case 'hp_percent_below': {
      const subject = visibleSubject(state, predicate.combatantId);
      return subject.hitPoints * 100 < subject.rules.hitPointMaximum * predicate.percent;
    }
    case 'distance_at_most':
      return gridDistance(
        visibleSubject(state, predicate.left).position,
        visibleSubject(state, predicate.right).position,
      ) <= predicate.feet;
    case 'not':
      return !predicateValue(predicate.predicate, state);
    case 'all':
      return predicate.predicates.every((entry) => predicateValue(entry, state));
    case 'any':
      return predicate.predicates.some((entry) => predicateValue(entry, state));
  }
}

function selectedTarget(
  selector: TargetSelector,
  actor: CombatantId,
  state: DmVisibleEncounterState,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const acting = visibleSubject(state, actor);
  return state.combatants
    .filter((candidate) => candidate.kind !== acting.kind && candidate.life !== 'dead')
    .sort((left, right) => {
      const distance = gridDistance(acting.position, left.position) - gridDistance(acting.position, right.position);
      return distance || left.id.localeCompare(right.id);
    })[0]?.id ?? null;
}

function endpointDistance(
  command: EncounterCommand,
  destination: { readonly column: number; readonly row: number },
): number {
  if (command.type !== 'move') return Number.POSITIVE_INFINITY;
  const endpoint = command.path.at(-1);
  return endpoint === undefined ? Number.POSITIVE_INFINITY : gridDistance(endpoint, destination);
}

function pathDistance(
  origin: { readonly column: number; readonly row: number },
  command: EncounterCommand,
): number {
  if (command.type !== 'move') return Number.POSITIVE_INFINITY;
  let previous = origin;
  let distance = 0;
  for (const cell of command.path) {
    distance += gridDistance(previous, cell);
    previous = cell;
  }
  return distance;
}

function commandActor(command: EncounterCommand): CombatantId | null {
  return 'actor' in command ? command.actor : null;
}

function selectPlanAction(
  action: PlanAction,
  actor: CombatantId,
  state: DmVisibleEncounterState,
  legal: readonly EncounterCommand[],
): EncounterCommand | null {
  const actorLegal = legal.filter((command) => commandActor(command) === actor);
  const acting = visibleSubject(state, actor);
  switch (action.kind) {
    case 'attack': {
      const target = selectedTarget(action.target, actor, state);
      return target === null
        ? null
        : actorLegal.find((command) => command.type === 'attack' && command.target === target &&
          (action.attackId === undefined || command.attackId === action.attackId)) ?? null;
    }
    case 'force_save': {
      const target = selectedTarget(action.target, actor, state);
      return target === null
        ? null
        : actorLegal.find((command) => command.type === 'force_save' && command.target === target) ?? null;
    }
    case 'cast_spell': {
      const target = action.target === null ? null : selectedTarget(action.target, actor, state);
      return actorLegal.find((command) => command.type === 'cast_spell' && command.spellId === action.spellId &&
        (target === null || command.targets.includes(target))) ?? null;
    }
    case 'bonus_attack': {
      const target = selectedTarget(action.target, actor, state);
      return target === null
        ? null
        : actorLegal.find((command) =>
          command.type === 'attack' &&
          command.bonusActionGrantEffectId !== undefined &&
          command.target === target) ?? null;
    }
    case 'move_toward': {
      const target = selectedTarget(action.target, actor, state);
      if (target === null) return null;
      const destination = visibleSubject(state, target).position;
      return actorLegal
        .filter((command) => command.type === 'move' &&
          (action.maximumFeet === undefined || pathDistance(acting.position, command) <= action.maximumFeet))
        .sort((left, right) => endpointDistance(left, destination) - endpointDistance(right, destination))[0] ?? null;
    }
    case 'retreat_toward':
      return actorLegal
        .filter((command) => command.type === 'move' &&
          (action.maximumFeet === undefined || pathDistance(acting.position, command) <= action.maximumFeet))
        .sort((left, right) => endpointDistance(left, action.destination) - endpointDistance(right, action.destination))[0] ?? null;
    case 'use_action':
      return actorLegal.find((command) =>
        action.action === 'action_surge'
          ? command.type === 'activate_action_surge'
          : command.type === action.action) ?? null;
  }
}

interface ProgramSelection {
  readonly command: EncounterCommand;
  readonly riders: readonly StandingConditionalRider[];
}

function selectProgram(
  program: DecisionProgram,
  actor: CombatantId,
  state: DmVisibleEncounterState,
  legal: readonly EncounterCommand[],
): ProgramSelection | null {
  switch (program.kind) {
    case 'action': {
      const command = selectPlanAction(program.action, actor, state, legal);
      return command === null ? null : { command, riders: program.riders ?? [] };
    }
    case 'if':
      return selectProgram(
        predicateValue(program.predicate, state) ? program.then : program.else,
        actor,
        state,
        legal,
      );
    case 'priority':
      for (const choice of program.choices) {
        const selection = selectProgram(choice, actor, state, legal);
        if (selection !== null) return selection;
      }
      return null;
  }
}

interface PendingRider {
  readonly riders: readonly StandingConditionalRider[];
}

interface RiderPolicyState {
  readonly pending: Map<CombatantId, PendingRider>;
  readonly active: Map<CombatantId, PlanAction>;
}

class InitialRoundProgramController implements Controller {
  readonly #algorithm = new AlgorithmController();

  constructor(
    private readonly actor: CombatantId,
    private readonly initialRound: number,
    private readonly program: DecisionProgram | null,
    private readonly encounterState: () => EncounterState,
    private readonly riders: RiderPolicyState,
  ) {}

  async choose(request: ControllerRequest, signal: AbortSignal): Promise<ControllerDecision> {
    const state = dmVisibleEncounter(projectDmView(this.encounterState()));
    const fixedRider = this.riders.active.get(this.actor);
    if (fixedRider !== undefined) {
      const command = selectPlanAction(fixedRider, this.actor, state, request.legalActions.actions);
      this.riders.active.delete(this.actor);
      if (command !== null) {
        return {
          requestId: request.requestId,
          encounterRevision: request.encounterRevision,
          action: command,
        };
      }
    }
    if (this.program !== null && state.round === this.initialRound) {
      const selection = selectProgram(this.program, this.actor, state, request.legalActions.actions);
      if (selection !== null) {
        if (selection.command.type === 'attack' && selection.riders.length > 0) {
          this.riders.pending.set(this.actor, { riders: selection.riders });
        }
        return {
          requestId: request.requestId,
          encounterRevision: request.encounterRevision,
          action: selection.command,
        };
      }
    }
    return this.#algorithm.choose(request, signal);
  }
}

function resolved(state: EncounterState): boolean {
  const playersSurvive = state.combatants.some(
    (combatant) => combatant.profile.kind === 'player_character' && combatant.life !== 'dead',
  );
  const monstersSurvive = state.combatants.some(
    (combatant) => combatant.profile.kind === 'monster' && combatant.life !== 'dead',
  );
  return !playersSurvive || !monstersSurvive;
}

function seedForCapture(capture: RolloutInputCapture): number {
  const digest = sha256(canonicalJson({
    oracleVersion: REGRET_ORACLE_VERSION,
    logicalCallId: capture.logicalCallId,
    stateHash: capture.stateHash,
    legalActionSetHash: capture.legalActionSetHash,
  }));
  return Number.parseInt(digest.slice(0, 8), 16) >>> 0;
}

export interface RolloutResult {
  readonly branchSeed: number;
  readonly rngDraws: number;
  readonly steps: number;
  readonly finalStateHash: string;
  readonly utility: TerminalUtility;
}

function riderTransition(
  transition: DurableCoordinatorTransition,
  riders: RiderPolicyState,
): void {
  if (transition.kind !== 'reducer_applied') return;
  for (const event of transition.events) {
    if (event.type !== 'attack_resolved') continue;
    const pending = riders.pending.get(event.actor);
    riders.pending.delete(event.actor);
    if (pending === undefined || event.attack.outcome !== 'critical') continue;
    const followUp = pending.riders.find((rider) => rider.kind === 'on_critical_hit');
    if (followUp !== undefined) riders.active.set(event.actor, followUp.followUpAction);
  }
}

export async function rolloutPrograms(
  capture: RolloutInputCapture,
  initialState: EncounterState,
  programs: readonly MonsterRoundProgram[],
): Promise<RolloutResult> {
  const state = structuredClone(initialState);
  const sideActor = programs[0]?.monsterId ?? capture.selectedAction[0]?.monsterId;
  if (sideActor === undefined) throw new Error(`Rollout capture ${capture.logicalCallId} has no acting side.`);
  const side = state.combatants.find((combatant) => combatant.profile.id === sideActor)?.profile.kind;
  if (side === undefined) throw new Error(`Rollout capture ${capture.logicalCallId} has an unknown acting side.`);
  const seed = seedForCapture(capture);
  const rng = mulberry32(seed);
  const riderPolicies: RiderPolicyState = { pending: new Map(), active: new Map() };
  let coordinator: TurnCoordinator | null = null;
  const programByActor = new Map(programs.map((entry) => [entry.monsterId, entry.program] as const));
  const registry = new ControllerRegistry(state.combatants.map((combatant) => ({
    combatantId: combatant.profile.id,
    controller: new InitialRoundProgramController(
      combatant.profile.id,
      state.round,
      programByActor.get(combatant.profile.id) ?? null,
      () => {
        if (coordinator === null) throw new Error('Regret rollout coordinator is not initialized.');
        return coordinator.state();
      },
      riderPolicies,
    ),
    controllerId: `${combatant.profile.id}:regret-algorithm`,
  })));
  coordinator = new TurnCoordinator(state, registry, rng, {
    turnLegalActions: (current, actor) =>
      regretTurnLegalActions(current, actor, riderPolicies.active.get(actor) ?? null),
    reactionLegalActions: regretReactionLegalActions,
    standingReactionPolicies: new Map(
      state.combatants.map((combatant) => [
        combatant.profile.id,
        { opportunityAttack: 'use' as const },
      ]),
    ),
    persistence: { record: ({ transition }) => riderTransition(transition, riderPolicies) },
  });
  let steps = 0;
  while (!resolved(coordinator.state()) && steps < MAXIMUM_ROLLOUT_STEPS) {
    const result = await coordinator.step();
    if (result.kind === 'refused') {
      throw new Error(`Regret rollout ${capture.logicalCallId} was refused: ${result.reason}`);
    }
    steps += 1;
  }
  if (!resolved(coordinator.state())) {
    throw new Error(
      `Regret rollout ${capture.logicalCallId} did not resolve within ${String(MAXIMUM_ROLLOUT_STEPS)} steps.`,
    );
  }
  const finalState = coordinator.state();
  return {
    branchSeed: seed,
    rngDraws: rng.snapshot().draws,
    steps,
    finalStateHash: sha256(canonicalJson(finalState)),
    utility: terminalUtility(finalState, side),
  };
}

interface CombinationNode {
  readonly indices: readonly number[];
  readonly score: number;
  readonly stableSortKey: string;
  readonly programs: readonly MonsterRoundProgram[];
}

function combinationNode(
  capture: RolloutInputCapture,
  indices: readonly number[],
): CombinationNode | null {
  const programs: MonsterRoundProgram[] = [];
  let score = 0;
  for (let index = 0; index < capture.candidateTurns.length; index += 1) {
    const turnSet = capture.candidateTurns[index];
    const candidateIndex = indices[index];
    if (turnSet === undefined || candidateIndex === undefined) return null;
    const candidate = turnSet.candidates[candidateIndex];
    if (candidate === undefined) return null;
    programs.push({ monsterId: combatantId(turnSet.monsterId), program: candidate.program });
    score += candidate.score;
  }
  return { indices, score, stableSortKey: canonicalJson(programs), programs };
}

function topCombinations(capture: RolloutInputCapture): readonly RankedRoundCandidate[] {
  if (
    capture.candidateTurns.length === 0 ||
    capture.candidateTurns.some((turnSet) => turnSet.candidates.length === 0)
  ) {
    return [];
  }
  const first = combinationNode(capture, capture.candidateTurns.map(() => 0));
  if (first === null) return [];
  const frontier: CombinationNode[] = [first];
  const seen = new Set([first.indices.join(',')]);
  const selected: RankedRoundCandidate[] = [];
  while (frontier.length > 0 && selected.length < capture.candidateTurnK) {
    frontier.sort((left, right) =>
      right.score - left.score || left.stableSortKey.localeCompare(right.stableSortKey));
    const current = frontier.shift();
    if (current === undefined) break;
    selected.push({
      programs: current.programs,
      score: current.score,
      stableSortKey: current.stableSortKey,
    });
    for (let dimension = 0; dimension < current.indices.length; dimension += 1) {
      const indices = [...current.indices];
      const currentIndex = indices[dimension];
      const turnSet = capture.candidateTurns[dimension];
      if (currentIndex === undefined || turnSet === undefined) continue;
      const nextIndex = currentIndex + 1;
      indices[dimension] = nextIndex;
      if (nextIndex >= turnSet.candidates.length) continue;
      const key = indices.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const next = combinationNode(capture, indices);
      if (next !== null) frontier.push(next);
    }
  }
  return selected;
}

function safeProduct(values: readonly number[], label: string): number {
  let product = 1;
  for (const value of values) {
    product *= value;
    if (!Number.isSafeInteger(product)) throw new RangeError(`${label} exceeds the safe integer range.`);
  }
  return product;
}

function actualLegalCandidateCount(capture: RolloutInputCapture, state: EncounterState): number {
  const projection = dmVisibleEncounter(projectDmView(state));
  const algorithm = new AlgorithmController();
  return safeProduct(capture.candidateTurns.map((turnSet) =>
    algorithm.enumerateTurnPrograms(projection, combatantId(turnSet.monsterId), Number.MAX_SAFE_INTEGER).length),
  'Actual legal candidate count');
}

export interface CandidateRolloutResult {
  readonly candidateKey: string;
  readonly score: number;
  readonly utility: TerminalUtility;
  readonly scalarUtility: number;
  readonly rollout: RolloutResult;
}

export interface CaptureRegretResult {
  readonly logicalCallId: string;
  readonly stateHash: string;
  readonly branchSeed: number;
  readonly candidateTurnK: number;
  readonly actualLegalCandidateCount: number;
  readonly evaluatedCandidateCountBeforeCollapse: number;
  readonly evaluatedCandidateCount: number;
  readonly droppedCandidateCount: number;
  readonly truncated: boolean;
  readonly collapse: Omit<EquivalenceCollapse, 'representatives'>;
  readonly selectedUtility: TerminalUtility;
  readonly selectedScalarUtility: number;
  readonly bestUtility: TerminalUtility;
  readonly bestScalarUtility: number;
  readonly regret: UtilityDifference;
  readonly scalarRegret: number;
  readonly candidates: readonly CandidateRolloutResult[];
}

export async function evaluateCapture(capture: RolloutInputCapture): Promise<CaptureRegretResult> {
  const state = reconstructEncounterState(capture);
  const selectedPrograms = capture.selectedAction.map((entry): MonsterRoundProgram => ({
    monsterId: combatantId(entry.monsterId),
    program: entry.program,
  }));
  const sideActor = selectedPrograms[0]?.monsterId;
  const side = state.combatants.find((combatant) => combatant.profile.id === sideActor)?.profile.kind;
  if (side === undefined) throw new Error(`Rollout capture ${capture.logicalCallId} has no known selected side.`);
  const bounds = utilityBounds(state, side);
  const ranked = topCombinations(capture);
  const collapse = collapseEquivalentCandidates(ranked);
  const actualCount = actualLegalCandidateCount(capture, state);
  const selectedRollout = await rolloutPrograms(capture, state, selectedPrograms);
  const selectedScalar = scalarizeUtility(selectedRollout.utility, bounds);
  const candidateResults: CandidateRolloutResult[] = [];
  for (const candidate of collapse.representatives) {
    const rollout = await rolloutPrograms(capture, state, candidate.programs);
    candidateResults.push({
      candidateKey: candidate.stableSortKey,
      score: candidate.score,
      utility: rollout.utility,
      scalarUtility: scalarizeUtility(rollout.utility, bounds),
      rollout,
    });
  }
  const best = bestUtilityCandidate(candidateResults.map((candidate) => ({
    identity: candidate,
    utility: candidate.utility,
  })));
  const bestUtility = best !== null && compareUtility(best.utility, selectedRollout.utility) > 0
    ? best.utility
    : selectedRollout.utility;
  const bestScalar = scalarizeUtility(bestUtility, bounds);
  return {
    logicalCallId: capture.logicalCallId,
    stateHash: capture.stateHash,
    branchSeed: selectedRollout.branchSeed,
    candidateTurnK: capture.candidateTurnK,
    actualLegalCandidateCount: actualCount,
    evaluatedCandidateCountBeforeCollapse: ranked.length,
    evaluatedCandidateCount: collapse.collapsedCount,
    droppedCandidateCount: Math.max(0, actualCount - ranked.length),
    truncated: actualCount > ranked.length,
    collapse: {
      originalCount: collapse.originalCount,
      collapsedCount: collapse.collapsedCount,
      collapseFactor: collapse.collapseFactor,
    },
    selectedUtility: selectedRollout.utility,
    selectedScalarUtility: selectedScalar,
    bestUtility,
    bestScalarUtility: bestScalar,
    regret: utilityDifference(bestUtility, selectedRollout.utility),
    scalarRegret: bestScalar - selectedScalar,
    candidates: candidateResults,
  };
}
