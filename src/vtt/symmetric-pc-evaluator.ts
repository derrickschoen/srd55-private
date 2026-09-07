import {
  combatantSpace,
  combatantConditions,
  type EncounterState,
} from '../combat/encounter';
import { minimumSpaceLine } from '../combat/creature-space';
import type { AppliedCondition } from '../combat/conditions';
import type { Controller, ControllerDecision, ControllerRequest } from '../combat/controllers';
import type { EncounterCommand } from '../combat/events';
import { feet, type CombatantId } from '../combat/values';
import {
  evaluateConcentrationZoneIntel,
  CONCENTRATION_INTEL_POLICY,
  type ConcentrationZoneEvaluation,
} from '../combat/concentration-evaluator';
import {
  evaluateTacticalAttack,
  TACTICAL_EVALUATOR_POLICY,
  type AttackRollModeSource,
  type TacticalAttackEvaluation,
  type TacticalAttackRange,
  type TacticalDamageTerm,
} from '../combat/tactical-evaluator';
import { MOVEMENT_EVALUATOR_POLICY, type MovementEvaluation } from '../combat/movement-evaluator';
import { spellDefinition } from '../combat/spells/definitions';
import {
  projectActorKnowledge,
  type ActorKnowledgeProjection,
  type PerceivedTargetKnowledge,
} from './intel/actor-knowledge';
import {
  projectedMovementOptions,
  type EngineProjectedMovementRequest,
} from './engine-query-port';
import { canonicalJson } from '../commands/canonical-json';

/** Selectable only for arena comparison; new scripted-PC callers default to v1. */
export type ScriptedPcDecisionPolicy = 'heuristic_v0' | 'symmetric_evaluator_v1';

export const DEFAULT_SCRIPTED_PC_DECISION_POLICY: ScriptedPcDecisionPolicy = 'symmetric_evaluator_v1';
export const SYMMETRIC_PC_EVALUATOR_POLICY = 'symmetric-pc-evaluator-v1' as const;

export type SymmetricPcUnavailableReason =
  | 'target_not_perceived'
  | 'reciprocal_visibility_unknown'
  | 'movement_profile_unavailable';

export type SymmetricPcTacticalAssessment =
  | { readonly status: 'evaluated'; readonly evaluation: TacticalAttackEvaluation }
  | { readonly status: 'unresolved'; readonly reason: SymmetricPcUnavailableReason };

export type SymmetricPcMovementAssessment =
  | { readonly status: 'evaluated'; readonly evaluation: MovementEvaluation }
  | { readonly status: 'unresolved'; readonly reason: SymmetricPcUnavailableReason };

export interface SymmetricPcCommandAssessment {
  readonly command: EncounterCommand;
  readonly commandKey: string;
  readonly tactical: SymmetricPcTacticalAssessment | null;
  readonly movement: SymmetricPcMovementAssessment | null;
  readonly concentration: ConcentrationZoneEvaluation | null;
  /** Lower ranks are preferred; the canonical command key is the final tie-break. */
  readonly rank: readonly [number, number, string];
}

export interface SymmetricPcDecision {
  readonly policy: typeof SYMMETRIC_PC_EVALUATOR_POLICY;
  readonly policyVersions: {
    readonly tactical: typeof TACTICAL_EVALUATOR_POLICY;
    readonly movement: typeof MOVEMENT_EVALUATOR_POLICY;
    readonly concentration: typeof CONCENTRATION_INTEL_POLICY;
    readonly actorKnowledge: ActorKnowledgeProjection['policy'];
  };
  readonly actorKnowledge: ActorKnowledgeProjection;
  readonly assessments: readonly SymmetricPcCommandAssessment[];
  readonly selected: SymmetricPcCommandAssessment;
}

function actor(state: EncounterState, actorId: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (found === undefined || found.profile.kind !== 'player_character' || found.life !== 'living') {
    throw new TypeError(`Symmetric PC evaluation requires a living player character: ${String(actorId)}.`);
  }
  return found;
}

function actorPosition(state: EncounterState, actorId: CombatantId) {
  const position = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (position === undefined) throw new TypeError(`Symmetric PC evaluation requires a token: ${String(actorId)}.`);
  return position;
}

function projectedTarget(
  projection: ActorKnowledgeProjection,
  targetId: CombatantId,
): PerceivedTargetKnowledge | null {
  const found = projection.targets.find((candidate): candidate is PerceivedTargetKnowledge =>
    candidate.kind === 'perceived' && candidate.targetId === targetId);
  return found ?? null;
}

function projectedConditions(target: PerceivedTargetKnowledge): readonly AppliedCondition[] {
  return target.conditions.flatMap((marker): readonly AppliedCondition[] => {
    switch (marker.condition) {
      case 'Blinded':
      case 'Paralyzed':
      case 'Petrified':
      case 'Prone':
      case 'Restrained':
      case 'Stunned':
      case 'Unconscious': return [{ name: marker.condition }];
      case 'Grappled': return [];
    }
  });
}

function attackRange(
  state: EncounterState,
  actorId: CombatantId,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): TacticalAttackRange {
  return command.tacticalRange ?? {
    kind: 'melee',
    reachFeet: feet(actor(state, actorId).profile.rules.reach),
  };
}

function damageTerms(command: Extract<EncounterCommand, { readonly type: 'attack' }>): readonly TacticalDamageTerm[] {
  return command.damage.terms.map((term) => ({ dice: term.dice }));
}

function rollModeSources(
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): readonly AttackRollModeSource[] {
  switch (command.rollMode) {
    case 'normal': return [];
    case 'advantage': return [{ mode: 'advantage', reason: 'declared_advantage' }];
    case 'disadvantage': return [{ mode: 'disadvantage', reason: 'declared_disadvantage' }];
  }
}

function tacticalAssessment(
  state: EncounterState,
  projection: ActorKnowledgeProjection,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): SymmetricPcTacticalAssessment {
  const target = projectedTarget(projection, command.target);
  if (target === null) return { status: 'unresolved', reason: 'target_not_perceived' };
  if (target.reciprocalVisibility.kind === 'unknown') {
    return { status: 'unresolved', reason: 'reciprocal_visibility_unknown' };
  }
  const attacker = actor(state, command.actor);
  const selectedLine = minimumSpaceLine(
    combatantSpace(state, command.actor),
    combatantSpace(state, command.target),
  );
  return {
    status: 'evaluated',
    evaluation: evaluateTacticalAttack({
      attackerId: command.actor,
      targetId: command.target,
      attackerPosition: selectedLine.sourceCell,
      targetPosition: selectedLine.targetCell,
      range: attackRange(state, command.actor, command),
      attackBonus: command.attackBonus,
      // A perceived AC band is not an AC number. D245 requires the evaluator's
      // typed unresolved path rather than an invented representative value.
      targetArmorClass: null,
      criticalFloor: command.criticalFloor === 18 || command.criticalFloor === 19 ? command.criticalFloor : 20,
      damageTerms: damageTerms(command),
      attackerConditions: combatantConditions(state, attacker.profile.id),
      targetConditions: projectedConditions(target),
      attackerCanSeeTarget: true,
      targetCanSeeAttacker: true,
      rollModeSources: rollModeSources(command),
      featureRollModeInput: null,
      target: {
        // The actor-knowledge bands intentionally cannot be converted to HP.
        hitPoints: { kind: 'unknown' },
        usesDeathSaves: { kind: 'unknown' },
      },
    }),
  };
}

function movementRequest(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): EngineProjectedMovementRequest {
  return {
    actorId: command.actor,
    targetId: command.target,
    attack: {
      range: attackRange(state, command.actor, command),
      attackBonus: command.attackBonus,
      criticalFloor: command.criticalFloor === 18 || command.criticalFloor === 19 ? command.criticalFloor : 20,
      damageTerms: damageTerms(command),
      attackerConditions: combatantConditions(state, command.actor),
      rollModeSources: rollModeSources(command),
    },
  };
}

function movementAssessment(
  state: EncounterState,
  projection: ActorKnowledgeProjection,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
  attacks: readonly Extract<EncounterCommand, { readonly type: 'attack' }>[],
): SymmetricPcMovementAssessment {
  const profile = attacks
    .filter((attack) => projectedTarget(projection, attack.target) !== null)
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))[0];
  if (profile === undefined) return { status: 'unresolved', reason: 'movement_profile_unavailable' };
  const evaluation = projectedMovementOptions(state, projection, movementRequest(state, profile));
  return evaluation === null
    ? { status: 'unresolved', reason: 'movement_profile_unavailable' }
    : { status: 'evaluated', evaluation };
}

function concentrationRequired(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Reflect.get(value, 'concentration') === true;
}

function concentrationAssessment(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'cast_spell' }>,
): ConcentrationZoneEvaluation | null {
  const definition = spellDefinition(command.spellId);
  if (definition === null) return null;
  const subject = actor(state, command.actor);
  const ownConditions = combatantConditions(state, command.actor);
  const casterState = subject.life === 'dead'
    ? 'dead' as const
    : ownConditions.some((condition) => condition.name === 'Unconscious')
      ? 'unconscious' as const
      : ownConditions.some((condition) => condition.name === 'Incapacitated' || condition.name === 'Paralyzed' ||
        condition.name === 'Petrified' || condition.name === 'Stunned')
        ? 'incapacitated' as const
        : 'active' as const;
  const existingConcentration = [
    ...state.effects
      .filter((effect) => effect.concentrationOwner === command.actor)
      .map((effect) => ({ kind: 'encounter_effect' as const, id: effect.id, label: String(effect.id) })),
    ...state.persistentAreas
      .filter((area) => area.owner === command.actor && area.duration.kind === 'concentration')
      .map((area) => ({ kind: 'persistent_area' as const, id: area.id, label: String(area.id) })),
  ];
  return evaluateConcentrationZoneIntel({
    caster: {
      id: command.actor,
      constitutionSaveBonus: subject.profile.rules.savingThrowBonuses.constitution ?? null,
      state: casterState,
    },
    candidate: {
      spellId: command.spellId,
      requiresConcentration: concentrationRequired(definition.operation) ||
        concentrationRequired(Reflect.get(definition.operation, 'effect')) ||
        concentrationRequired(Reflect.get(definition.operation, 'riderOnFailure')),
    },
    existingConcentration,
    damage: { kind: 'none' },
    // Zone membership needs future movement choices. Its existing typed
    // unresolved result is preferable to reading unprojected enemy positions.
    zones: null,
  });
}

function tacticalRank(value: SymmetricPcTacticalAssessment): number {
  if (value.status === 'unresolved') return 6;
  if (value.evaluation.range.status !== 'resolved' || !value.evaluation.range.legal) return 5;
  switch (value.evaluation.range.band) {
    case 'melee':
    case 'normal': return value.evaluation.damage.status === 'resolved' ? 1 : 2;
    case 'long': return 4;
    case 'out': return 5;
  }
}

function movementRank(
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
  value: SymmetricPcMovementAssessment,
): number {
  if (value.status === 'unresolved') return 7;
  const destination = command.path.at(-1);
  if (destination === undefined) return 7;
  const candidate = value.evaluation.candidates.find((entry) =>
    entry.destination.column === destination.column && entry.destination.row === destination.row);
  if (candidate?.semantic.status !== 'resolved') return 7;
  switch (candidate.semantic.kind) {
    case 'move_5_to_normal_range':
    case 'move_within_speed_to_enable_attack': return 0;
    case 'maintain_range': return 3;
    case 'other_reposition': return 6;
  }
}

function commandRank(
  command: EncounterCommand,
  tactical: SymmetricPcTacticalAssessment | null,
  movement: SymmetricPcMovementAssessment | null,
  concentration: ConcentrationZoneEvaluation | null,
): readonly [number, number, string] {
  const key = canonicalJson(command);
  if (command.type === 'attack' && tactical !== null) return [tacticalRank(tactical), 0, key];
  if (command.type === 'move' && movement !== null) return [movementRank(command, movement), 0, key];
  if (command.type === 'cast_spell') {
    const startsConcentration = concentration?.start.status === 'resolved' &&
      concentration.start.kind === 'starts_concentration';
    return [startsConcentration ? 1 : 3, 0, key];
  }
  if (command.type === 'drink_healing_potion') return [1, 0, key];
  if (command.type === 'force_save') return [3, 0, key];
  if (command.type === 'dodge' || command.type === 'disengage') return [7, 0, key];
  if (command.type === 'dash') return [8, 0, key];
  if (command.type === 'end_turn') return [9, 0, key];
  return [8, 1, key];
}

function compareRank(left: readonly [number, number, string], right: readonly [number, number, string]): number {
  return left[0] - right[0] || left[1] - right[1] || left[2].localeCompare(right[2]);
}

/**
 * Evaluates legal PC commands from actor-knowledge-last-seen-v4. The full state never
 * supplies an opponent fact to a tactical decision; it is passed to the
 * projected movement provider only through its projection-restricted entrypoint.
 */
export function evaluateSymmetricPcDecision(input: {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
  readonly legalActions: readonly EncounterCommand[];
}): SymmetricPcDecision {
  actor(input.state, input.actorId);
  const actorKnowledge = projectActorKnowledge(input.state, input.actorId);
  const legal = input.legalActions.filter((command) => 'actor' in command && command.actor === input.actorId);
  if (legal.length === 0) throw new Error(`Symmetric PC evaluator has no legal actions for ${String(input.actorId)}.`);
  const attacks = legal.filter((command): command is Extract<EncounterCommand, { readonly type: 'attack' }> =>
    command.type === 'attack');
  const assessments = legal.map((command): SymmetricPcCommandAssessment => {
    const tactical = command.type === 'attack'
      ? tacticalAssessment(input.state, actorKnowledge, command)
      : null;
    const movement = command.type === 'move'
      ? movementAssessment(input.state, actorKnowledge, command, attacks)
      : null;
    const concentration = command.type === 'cast_spell'
      ? concentrationAssessment(input.state, command)
      : null;
    return {
      command,
      commandKey: canonicalJson(command),
      tactical,
      movement,
      concentration,
      rank: commandRank(command, tactical, movement, concentration),
    };
  }).sort((left, right) => compareRank(left.rank, right.rank));
  const selected = assessments[0];
  if (selected === undefined) throw new Error(`Symmetric PC evaluator has no ranked action for ${String(input.actorId)}.`);
  return {
    policy: SYMMETRIC_PC_EVALUATOR_POLICY,
    policyVersions: {
      tactical: TACTICAL_EVALUATOR_POLICY,
      movement: MOVEMENT_EVALUATOR_POLICY,
      concentration: CONCENTRATION_INTEL_POLICY,
      actorKnowledge: actorKnowledge.policy,
    },
    actorKnowledge,
    assessments,
    selected,
  };
}

/** PC controller for coordinator-based arenas such as the survival harness. */
export class SymmetricEvaluatorPcController implements Controller {
  readonly controllerKind = 'custom' as const;

  constructor(private readonly stateForRequest: () => EncounterState) {}

  async choose(request: ControllerRequest, signal: AbortSignal): Promise<ControllerDecision> {
    if (signal.aborted) throw new Error('Symmetric PC controller request was cancelled.');
    if (request.kind === 'reaction') {
      const action = [...request.legalActions.actions]
        .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))[0];
      if (action === undefined) throw new Error('Symmetric PC controller reaction has no legal actions.');
      return { requestId: request.requestId, encounterRevision: request.encounterRevision, action };
    }
    const decision = evaluateSymmetricPcDecision({
      state: this.stateForRequest(), actorId: request.actorId, legalActions: request.legalActions.actions,
    });
    return {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: decision.selected.command,
    };
  }
}
