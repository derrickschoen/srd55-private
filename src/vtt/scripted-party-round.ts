import { canonicalJson } from '../commands/canonical-json';
import { AlgorithmController } from '../combat/controllers';
import type { TurnLegalActions } from '../combat/coordinator';
import type { EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import { gridDistance, type GridCell } from '../combat/grid';
import { decodeProjectedCreatureSpace, minimumSpaceDistance } from '../combat/creature-space';
import { dmVisibleEncounter, isPlacedVisibleCombatant, projectDmView, type DmVisibleEncounterState } from '../combat/visibility';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import { spellDefinition } from '../combat/spells/definitions';
import {
  DEFAULT_SCRIPTED_PC_DECISION_POLICY,
  evaluateSymmetricPcDecision,
  type ScriptedPcDecisionPolicy,
} from './symmetric-pc-evaluator';
import type {
  DecisionProgram,
  PlanAction,
  StatePredicate,
  TargetSelector,
} from './dm-bridge/round-plan-contract';
import { regretTurnLegalActions } from './regret/legal-actions';

export const SCRIPTED_PARTY_POLICY_VERSION = 'scripted-party-policy-v4-symmetric-evaluator' as const;
export const SCRIPTED_PARTY_PLAN_FORMAT = 'scripted-party-plan-v1' as const;
export const DEFAULT_SCRIPTED_PARTY_OBJECTIVE = 'defeat_the_hostile_team' as const;
export const SCRIPTED_PARTY_DECISION_POLICIES = [
  'heuristic_v0',
  'symmetric_evaluator_v1',
] as const satisfies readonly ScriptedPcDecisionPolicy[];
export const DEFAULT_SCRIPTED_PARTY_DECISION_POLICY: ScriptedPcDecisionPolicy =
  DEFAULT_SCRIPTED_PC_DECISION_POLICY;
export type ScriptedPartyDecisionPolicy = ScriptedPcDecisionPolicy;

export interface ScriptedPartyProgram {
  readonly actorId: CombatantId;
  readonly initiativeIndex: number;
  readonly program: DecisionProgram;
  readonly programHash: string;
}

export interface ScriptedPartyPlan {
  readonly format: typeof SCRIPTED_PARTY_PLAN_FORMAT;
  readonly policyVersion: typeof SCRIPTED_PARTY_POLICY_VERSION;
  readonly decisionPolicy: ScriptedPcDecisionPolicy;
  readonly round: number;
  readonly sharedObjective: string;
  readonly policyHash: string;
  readonly planId: string;
  readonly planHash: string;
  readonly programs: readonly ScriptedPartyProgram[];
}

export interface ScriptedPartyPlanOptions {
  /** Defaults to the actor-knowledge-last-seen-v4 symmetric evaluator; v0 remains A/B selectable. */
  readonly decisionPolicy?: ScriptedPcDecisionPolicy;
  readonly controller?: AlgorithmController;
  readonly turnLegalActions?: TurnLegalActions;
  readonly legalActionsProviderId?: string;
  readonly sharedObjective?: string;
}

export type ScriptedPartyAdherence = 'followed' | 'altered' | 'plan_invalidated';

export type ScriptedPartyAdherenceReasonCode =
  | 'PLANNED_PRIMARY_FOLLOWED'
  | 'POLICY_SELECTED_DIFFERENT_LEGAL_PROGRAM'
  | 'PLANNED_PRIMARY_NO_LONGER_LEGAL'
  | 'SCRIPTED_PROGRAM_MISSING_DEFAULT_DODGE'
  | 'SCRIPTED_PROGRAM_MISSING_DEFAULT_HOLD_POSITION';

export type ScriptedPartyDefaultTurn = 'dodge' | 'hold_position';

export interface ScriptedPartyTurnMaterialization {
  readonly actorId: CombatantId;
  readonly partyDefaultTurn: ScriptedPartyDefaultTurn | null;
  readonly adherence: ScriptedPartyAdherence;
  readonly reasonCodes: readonly ScriptedPartyAdherenceReasonCode[];
  readonly plannedProgramHash: string;
  readonly executedProgramHash: string;
  readonly executedProgram: DecisionProgram;
  readonly actionSlotUses: readonly {
    readonly slot: 'main' | 'bonus';
    readonly commandCount: number;
  }[];
  readonly reducerCommands: readonly EncounterCommand[];
}

export interface ScriptedPartyTurnInput {
  readonly state: EncounterState;
  readonly plan: ScriptedPartyPlan;
  readonly actorId: CombatantId;
  readonly controller?: AlgorithmController;
  readonly decisionPolicy?: ScriptedPcDecisionPolicy;
  readonly turnLegalActions?: TurnLegalActions;
}

interface ProgramSelection {
  readonly program: Extract<DecisionProgram, { readonly kind: 'action' }>;
  readonly command: EncounterCommand;
}

interface SemanticProgramRecord {
  readonly action: string;
  readonly target: CombatantId | GridCell | null;
}

function symmetricProgram(command: EncounterCommand): Extract<DecisionProgram, { readonly kind: 'action' }> {
  switch (command.type) {
    case 'attack': return {
      kind: 'action', action: {
        kind: 'attack', target: { kind: 'combatant', combatantId: command.target },
        ...(command.attackId === undefined ? {} : { attackId: command.attackId }),
      },
    };
    case 'force_save': return {
      kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: command.target } },
    };
    case 'cast_spell': return {
      kind: 'action', action: {
        kind: 'cast_spell', spellId: command.spellId,
        target: command.targets[0] === undefined ? null : { kind: 'combatant', combatantId: command.targets[0] },
      },
    };
    case 'move': {
      const destination = command.path.at(-1);
      if (destination === undefined) throw new Error('Symmetric PC evaluator selected an empty movement path.');
      return { kind: 'action', action: { kind: 'retreat_toward', destination } };
    }
    case 'dash': return { kind: 'action', action: { kind: 'use_action', action: 'dash' } };
    case 'disengage': return { kind: 'action', action: { kind: 'use_action', action: 'disengage' } };
    case 'dodge': return { kind: 'action', action: { kind: 'use_action', action: 'dodge' } };
    case 'end_turn': return { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } };
    case 'drink_healing_potion':
      throw new Error('Symmetric PC scripted plans cannot encode a healing-potion program.');
    default:
      throw new Error(`Symmetric PC scripted plans cannot encode ${command.type}.`);
  }
}

/** Checks the stored PC program against already-derived legal commands without a DM projection. */
function symmetricProgramIsLegal(
  program: DecisionProgram,
  legal: readonly EncounterCommand[],
): boolean {
  if (program.kind !== 'action') return false;
  const action = program.action;
  switch (action.kind) {
    case 'attack': {
      if (action.target.kind !== 'combatant') return false;
      const targetId = action.target.combatantId;
      return legal.some((command) => command.type === 'attack' && command.target === targetId &&
        (action.attackId === undefined || command.attackId === action.attackId));
    }
    case 'force_save': {
      if (action.target.kind !== 'combatant') return false;
      const targetId = action.target.combatantId;
      return legal.some((command) => command.type === 'force_save' && command.target === targetId);
    }
    case 'cast_spell': return legal.some((command) => command.type === 'cast_spell' &&
      command.spellId === action.spellId && (action.target === null ||
        action.target.kind !== 'combatant' || command.targets.includes(action.target.combatantId)));
    case 'retreat_toward': return legal.some((command) => command.type === 'move' &&
      command.path.at(-1)?.column === action.destination.column &&
      command.path.at(-1)?.row === action.destination.row);
    case 'move_toward':
    case 'bonus_attack': return false;
    case 'use_action': return legal.some((command) => command.type === action.action);
  }
}

function subject(state: DmVisibleEncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.id === id);
  if (found === undefined || found.placementStatus !== 'placed') throw new TypeError(`Scripted party program references unknown or unplaced combatant ${id}.`);
  return found;
}

function predicateValue(predicate: StatePredicate, state: DmVisibleEncounterState): boolean {
  switch (predicate.kind) {
    case 'life_is': return subject(state, predicate.combatantId).life === predicate.value;
    case 'hp_percent_below': {
      const combatant = subject(state, predicate.combatantId);
      return combatant.hitPoints * 100 < combatant.rules.hitPointMaximum * predicate.percent;
    }
    case 'distance_at_most':
      return minimumSpaceDistance(
        decodeProjectedCreatureSpace(subject(state, predicate.left)),
        decodeProjectedCreatureSpace(subject(state, predicate.right)),
      ) <= predicate.feet;
    case 'not': return !predicateValue(predicate.predicate, state);
    case 'all': return predicate.predicates.every((candidate) => predicateValue(candidate, state));
    case 'any': return predicate.predicates.some((candidate) => predicateValue(candidate, state));
  }
}

function selectedTarget(
  selector: TargetSelector,
  actorId: CombatantId,
  state: DmVisibleEncounterState,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const actor = subject(state, actorId);
  return state.combatants
    .filter(isPlacedVisibleCombatant)
    .filter((candidate) => candidate.kind !== actor.kind && candidate.life !== 'dead')
    .sort((left, right) => {
      const actorSpace = decodeProjectedCreatureSpace(actor);
      const byDistance = minimumSpaceDistance(actorSpace, decodeProjectedCreatureSpace(left)) -
        minimumSpaceDistance(actorSpace, decodeProjectedCreatureSpace(right));
      return byDistance || left.id.localeCompare(right.id);
    })[0]?.id ?? null;
}

function commandActor(command: EncounterCommand): CombatantId | null {
  return 'actor' in command ? command.actor : null;
}

function pathDistance(origin: GridCell, command: EncounterCommand): number {
  if (command.type !== 'move') return Number.POSITIVE_INFINITY;
  let previous = origin;
  let distance = 0;
  for (const cell of command.path) {
    distance += gridDistance(previous, cell);
    previous = cell;
  }
  return distance;
}

function endpointDistance(command: EncounterCommand, destination: GridCell): number {
  if (command.type !== 'move') return Number.POSITIVE_INFINITY;
  const endpoint = command.path.at(-1);
  return endpoint === undefined ? Number.POSITIVE_INFINITY : gridDistance(endpoint, destination);
}

function selectAction(
  action: PlanAction,
  actorId: CombatantId,
  state: DmVisibleEncounterState,
  legalActions: readonly EncounterCommand[],
): EncounterCommand | null {
  const legal = legalActions.filter((command) => commandActor(command) === actorId);
  const actor = subject(state, actorId);
  switch (action.kind) {
    case 'attack': {
      const target = selectedTarget(action.target, actorId, state);
      return target === null ? null : legal.find((command) =>
        command.type === 'attack' && command.target === target &&
        (action.attackId === undefined || command.attackId === action.attackId)) ?? null;
    }
    case 'bonus_attack': {
      const target = selectedTarget(action.target, actorId, state);
      return target === null ? null : legal.find((command) =>
        command.type === 'attack' && command.target === target &&
        command.bonusActionGrantEffectId !== undefined) ?? null;
    }
    case 'force_save': {
      const target = selectedTarget(action.target, actorId, state);
      return target === null ? null : legal.find((command) =>
        command.type === 'force_save' && command.target === target) ?? null;
    }
    case 'cast_spell': {
      const target = action.target === null ? null : selectedTarget(action.target, actorId, state);
      return legal.find((command) => command.type === 'cast_spell' &&
        command.spellId === action.spellId &&
        (target === null || command.targets.includes(target))) ?? null;
    }
    case 'move_toward': {
      const target = selectedTarget(action.target, actorId, state);
      if (target === null) return null;
      const destination = subject(state, target).position;
      return legal.filter((command) => command.type === 'move' &&
        (action.maximumFeet === undefined || pathDistance(actor.position, command) <= action.maximumFeet))
        .sort((left, right) => endpointDistance(left, destination) - endpointDistance(right, destination) ||
          canonicalJson(left).localeCompare(canonicalJson(right)))[0] ?? null;
    }
    case 'retreat_toward':
      return legal.filter((command) => command.type === 'move' &&
        (action.maximumFeet === undefined || pathDistance(actor.position, command) <= action.maximumFeet))
        .sort((left, right) => endpointDistance(left, action.destination) - endpointDistance(right, action.destination) ||
          canonicalJson(left).localeCompare(canonicalJson(right)))[0] ?? null;
    case 'use_action':
      return legal.find((command) => action.action === 'action_surge'
        ? command.type === 'activate_action_surge'
        : command.type === action.action) ?? null;
  }
}

function selectProgram(
  program: DecisionProgram,
  actorId: CombatantId,
  state: DmVisibleEncounterState,
  legalActions: readonly EncounterCommand[],
): ProgramSelection | null {
  switch (program.kind) {
    case 'action': {
      const command = selectAction(program.action, actorId, state, legalActions);
      return command === null ? null : { program, command };
    }
    case 'if':
      return selectProgram(
        predicateValue(program.predicate, state) ? program.then : program.else,
        actorId,
        state,
        legalActions,
      );
    case 'priority':
      for (const choice of program.choices) {
        const selected = selectProgram(choice, actorId, state, legalActions);
        if (selected !== null) return selected;
      }
      return null;
  }
}

function primaryProgram(
  program: DecisionProgram,
  state: DmVisibleEncounterState,
): DecisionProgram | null {
  switch (program.kind) {
    case 'action': return program;
    case 'if': return primaryProgram(
      predicateValue(program.predicate, state) ? program.then : program.else,
      state,
    );
    case 'priority': return program.choices[0] === undefined
      ? null
      : primaryProgram(program.choices[0], state);
  }
}

export function scriptedPartyProgramHash(program: DecisionProgram): string {
  return sha256(canonicalJson(program));
}

function semanticProgramRecord(
  selection: ProgramSelection,
  actorId: CombatantId,
  state: DmVisibleEncounterState,
): SemanticProgramRecord {
  const action = selection.program.action;
  switch (action.kind) {
    case 'attack':
      return {
        action: selection.command.type === 'attack'
          ? selection.command.attackId ?? action.attackId ?? 'attack'
          : action.attackId ?? 'attack',
        target: selectedTarget(action.target, actorId, state),
      };
    case 'bonus_attack':
      return {
        action: selection.command.type === 'attack'
          ? selection.command.attackId ?? 'bonus_attack'
          : 'bonus_attack',
        target: selectedTarget(action.target, actorId, state),
      };
    case 'force_save':
      return { action: 'force_save', target: selectedTarget(action.target, actorId, state) };
    case 'cast_spell':
      return {
        action: `cast_spell:${action.spellId}`,
        target: action.target === null ? null : selectedTarget(action.target, actorId, state),
      };
    case 'move_toward':
      return { action: 'move_toward', target: selectedTarget(action.target, actorId, state) };
    case 'retreat_toward':
      return { action: 'retreat_toward', target: action.destination };
    case 'use_action':
      return { action: action.action, target: null };
  }
}

function semanticProgramHash(
  selection: ProgramSelection,
  actorId: CombatantId,
  state: DmVisibleEncounterState,
): string {
  return sha256(canonicalJson(semanticProgramRecord(selection, actorId, state)));
}

function orderedLivingPlayers(state: EncounterState): readonly CombatantId[] {
  const initiativeIndex = new Map(state.initiative.map((entry, index) => [entry.combatant, index] as const));
  return state.combatants
    .filter((combatant) => combatant.profile.kind === 'player_character' && combatant.life === 'living')
    .map((combatant) => combatant.profile.id)
    .sort((left, right) => {
      const leftIndex = initiativeIndex.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = initiativeIndex.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.localeCompare(right);
    });
}

export function createScriptedPartyPlan(
  state: EncounterState,
  options: ScriptedPartyPlanOptions = {},
): ScriptedPartyPlan {
  if (options.controller !== undefined && options.decisionPolicy === 'symmetric_evaluator_v1') {
    throw new TypeError('A symmetric scripted party plan cannot inject the heuristic controller.');
  }
  // An injected AlgorithmController is an explicit test/arena request for the
  // retained v0 behavior; ordinary callers receive the symmetric default.
  const decisionPolicy = options.decisionPolicy ??
    (options.controller === undefined ? DEFAULT_SCRIPTED_PC_DECISION_POLICY : 'heuristic_v0');
  const controller = options.controller ?? new AlgorithmController();
  const legalActions = options.turnLegalActions ?? regretTurnLegalActions;
  const providerId = options.legalActionsProviderId ?? 'regret-turn-legal-actions-v1';
  const sharedObjective = options.sharedObjective ?? DEFAULT_SCRIPTED_PARTY_OBJECTIVE;
  if (sharedObjective.trim().length === 0) throw new TypeError('Scripted party objective must be non-empty.');
  const projection = dmVisibleEncounter(projectDmView(state));
  const actors = orderedLivingPlayers(state);
  const programs = actors.map((actorId, initiativeIndex): ScriptedPartyProgram => {
    const actorLegalActions = legalActions(state, actorId).actions;
    if (actorLegalActions.length === 0) {
      throw new Error(`Scripted party actor ${actorId} has no legal reducer commands.`);
    }
    const program = options.controller === undefined && decisionPolicy === 'symmetric_evaluator_v1'
      ? symmetricProgram(evaluateSymmetricPcDecision({
          state, actorId, legalActions: actorLegalActions,
        }).selected.command)
      : (() => {
          const proposed = controller.proposeRoundProgram(projection, actorId).program;
          const selected = selectProgram(proposed, actorId, projection, actorLegalActions);
          if (selected === null) {
            throw new Error(`Scripted party policy produced no legal reducer command for ${actorId}.`);
          }
          return selected.program;
        })();
    return { actorId, initiativeIndex, program, programHash: scriptedPartyProgramHash(program) };
  });
  const policyHash = sha256(canonicalJson({
    version: SCRIPTED_PARTY_POLICY_VERSION,
    decisionPolicy,
    controller: decisionPolicy === 'heuristic_v0'
      ? 'AlgorithmController.proposeRoundProgram'
      : 'symmetric-pc-evaluator-v1',
    legalActionsProviderId: providerId,
    sharedObjective,
  }));
  const body = {
    format: SCRIPTED_PARTY_PLAN_FORMAT,
    policyVersion: SCRIPTED_PARTY_POLICY_VERSION,
    decisionPolicy,
    round: state.round,
    sharedObjective,
    policyHash,
    programs,
  } as const;
  const planHash = sha256(canonicalJson(body));
  return {
    ...body,
    planId: `party-plan:${planHash.slice(0, 48)}`,
    planHash,
  };
}

export function materializeScriptedPartyTurn(
  input: ScriptedPartyTurnInput,
): ScriptedPartyTurnMaterialization {
  const actor = input.state.combatants.find((candidate) => candidate.profile.id === input.actorId);
  if (actor?.profile.kind !== 'player_character' || actor.life !== 'living') {
    throw new TypeError('Scripted party turns require a living player character.');
  }
  const legalProvider = input.turnLegalActions ?? regretTurnLegalActions;
  const legal = legalProvider(input.state, input.actorId).actions;
  const planned = input.plan.programs.find((candidate) => candidate.actorId === input.actorId);
  if (planned === undefined) {
    const command = legal.find((candidate) => candidate.type === 'dodge') ??
      legal.find((candidate) => candidate.type === 'end_turn');
    if (command === undefined || (command.type !== 'dodge' && command.type !== 'end_turn')) {
      throw new Error(`Scripted party default turn has no Dodge or hold-position command for ${input.actorId}.`);
    }
    const partyDefaultTurn: ScriptedPartyDefaultTurn = command.type === 'dodge'
      ? 'dodge'
      : 'hold_position';
    const program = symmetricProgram(command);
    const programHash = scriptedPartyProgramHash(program);
    return {
      actorId: input.actorId,
      partyDefaultTurn,
      adherence: 'plan_invalidated',
      reasonCodes: [partyDefaultTurn === 'dodge'
        ? 'SCRIPTED_PROGRAM_MISSING_DEFAULT_DODGE'
        : 'SCRIPTED_PROGRAM_MISSING_DEFAULT_HOLD_POSITION'],
      plannedProgramHash: programHash,
      executedProgramHash: programHash,
      executedProgram: program,
      actionSlotUses: [{ slot: 'main', commandCount: 1 }],
      reducerCommands: [command],
    };
  }
  const decisionPolicy = input.decisionPolicy ?? input.plan.decisionPolicy;
  if (decisionPolicy !== input.plan.decisionPolicy) {
    throw new Error('Scripted party turn policy must match the planned decision policy.');
  }
  if (input.controller !== undefined && decisionPolicy === 'symmetric_evaluator_v1') {
    throw new TypeError('A symmetric scripted party turn cannot inject the heuristic controller.');
  }
  if (input.controller === undefined && decisionPolicy === 'symmetric_evaluator_v1') {
    const live = evaluateSymmetricPcDecision({
      state: input.state, actorId: input.actorId, legalActions: legal,
    });
    const liveProgram = symmetricProgram(live.selected.command);
    const liveProgramHash = scriptedPartyProgramHash(liveProgram);
    const plannedIsLegal = symmetricProgramIsLegal(planned.program, legal);
    const adherence: ScriptedPartyAdherence = !plannedIsLegal
      ? 'plan_invalidated'
      : planned.programHash === liveProgramHash ? 'followed' : 'altered';
    const bonusCandidates = legal.filter((command): command is Extract<EncounterCommand, { readonly type: 'cast_spell' }> =>
      command.type === 'cast_spell' && spellDefinition(command.spellId)?.castingTime === 'bonus_action' &&
      !(live.selected.command.type === 'cast_spell' && live.selected.command.spellId === command.spellId));
    const bonusSpell = bonusCandidates.length === 0
      ? undefined
      : evaluateSymmetricPcDecision({
          state: input.state, actorId: input.actorId, legalActions: bonusCandidates,
        }).selected.command;
    const mainCommands = live.selected.command.type === 'attack'
      ? Array.from({ length: actor.profile.rules.attacksPerAction }, () => structuredClone(live.selected.command))
      : [live.selected.command];
    const reducerCommands: readonly EncounterCommand[] = bonusSpell === undefined
      ? mainCommands
      : [...mainCommands, bonusSpell];
    return {
      actorId: input.actorId,
      partyDefaultTurn: null,
      adherence,
      reasonCodes: adherence === 'followed'
        ? ['PLANNED_PRIMARY_FOLLOWED']
        : adherence === 'altered'
          ? ['POLICY_SELECTED_DIFFERENT_LEGAL_PROGRAM']
          : ['PLANNED_PRIMARY_NO_LONGER_LEGAL'],
      plannedProgramHash: planned.programHash,
      executedProgramHash: liveProgramHash,
      executedProgram: liveProgram,
      actionSlotUses: [
        { slot: 'main', commandCount: mainCommands.length },
        ...(bonusSpell === undefined ? [] : [{ slot: 'bonus' as const, commandCount: 1 }]),
      ],
      reducerCommands,
    };
  }
  const projection = dmVisibleEncounter(projectDmView(input.state));
  const plannedPrimary = primaryProgram(planned.program, projection);
  const plannedSelection = plannedPrimary === null
    ? null
    : selectProgram(plannedPrimary, input.actorId, projection, legal);
  const liveProgram = (input.controller ?? new AlgorithmController())
    .proposeRoundProgram(projection, input.actorId).program;
  const liveSelection = selectProgram(liveProgram, input.actorId, projection, legal);
  if (liveSelection === null) {
    throw new Error(`Scripted party policy produced no legal reducer command for ${input.actorId}.`);
  }

  const plannedProgramHash = plannedSelection === null
    ? planned.programHash
    : semanticProgramHash(plannedSelection, input.actorId, projection);
  const liveProgramHash = semanticProgramHash(liveSelection, input.actorId, projection);
  const adherence: ScriptedPartyAdherence = plannedSelection === null
    ? 'plan_invalidated'
    : plannedProgramHash === liveProgramHash
      ? 'followed'
      : 'altered';
  const reasonCodes: readonly ScriptedPartyAdherenceReasonCode[] = adherence === 'followed'
    ? ['PLANNED_PRIMARY_FOLLOWED']
    : adherence === 'altered'
      ? ['POLICY_SELECTED_DIFFERENT_LEGAL_PROGRAM']
      : ['PLANNED_PRIMARY_NO_LONGER_LEGAL'];
  const primaryCommand = liveSelection.command;
  const mainCommands = primaryCommand.type === 'attack'
    ? Array.from({ length: actor.profile.rules.attacksPerAction }, () => structuredClone(primaryCommand))
    : [primaryCommand];
  const bonusSpell = legal.find((command): command is Extract<EncounterCommand, { readonly type: 'cast_spell' }> =>
    command.type === 'cast_spell' && spellDefinition(command.spellId)?.castingTime === 'bonus_action' &&
    !(primaryCommand.type === 'cast_spell' && primaryCommand.spellId === command.spellId));
  const reducerCommands: readonly EncounterCommand[] = bonusSpell === undefined
    ? mainCommands
    : [...mainCommands, bonusSpell];
  return {
    actorId: input.actorId,
    partyDefaultTurn: null,
    adherence,
    reasonCodes,
    plannedProgramHash,
    executedProgramHash: liveProgramHash,
    executedProgram: liveSelection.program,
    actionSlotUses: [
      { slot: 'main', commandCount: mainCommands.length },
      ...(bonusSpell === undefined ? [] : [{ slot: 'bonus' as const, commandCount: 1 }]),
    ],
    reducerCommands,
  };
}

export const runScriptedPartyTurn = materializeScriptedPartyTurn;
