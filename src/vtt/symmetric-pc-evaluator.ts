import {
  combatantSpace,
  combatantConditions,
  type EncounterState,
} from '../combat/encounter';
import { minimumSpaceLine } from '../combat/creature-space';
import type { AppliedCondition } from '../combat/conditions';
import type { Controller, ControllerDecision, ControllerRequest } from '../combat/controllers';
import type { TurnAttackForms } from '../combat/coordinator';
import type { EncounterCommand, StatedRangeAttackCommand } from '../combat/events';
import type { CombatantId } from '../combat/values';
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
  projectedAttackFromStart,
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
  | 'movement_profile_unavailable'
  /** The attack command states no range; the evaluator never assumes one (it used to assume melee reach). */
  | 'attack_range_unstated';

export type SymmetricPcTacticalAssessment =
  | { readonly status: 'evaluated'; readonly evaluation: TacticalAttackEvaluation }
  | { readonly status: 'unresolved'; readonly reason: SymmetricPcUnavailableReason };

type AttackCommand = Extract<EncounterCommand, { readonly type: 'attack' }>;
type MoveCommand = Extract<EncounterCommand, { readonly type: 'move' }>;

function statesItsRange(command: AttackCommand): command is StatedRangeAttackCommand {
  return command.tacticalRange !== undefined;
}

/**
 * Where the attack profiles that assess the PC's moves came from.
 * - `legal_attack`: the canonical-first legal attack command against a
 *   perceived target, as before.
 * - `own_attack_forms`: no legal attack command targets a perceived creature,
 *   so the PC's own attack forms (TurnAttackForms, built by the same code as
 *   its attack commands) against the target the canonical-first form command
 *   attacks. Owner ruling 2026-09-24, verbatim: "when no attack is legal,
 *   movement planning evaluates candidate squares with the PC's own attack
 *   forms (best expected damage across its attacks, AC + cover included), so
 *   approach squares with a clear shot win."
 */
export type SymmetricPcMovementProfileSource = 'legal_attack' | 'own_attack_forms';

export type SymmetricPcMovementAssessment =
  | {
      readonly status: 'evaluated';
      readonly profileSource: SymmetricPcMovementProfileSource;
      /** The attack command whose profile gave the move's destination its assessment. */
      readonly attack: StatedRangeAttackCommand;
      readonly evaluation: MovementEvaluation;
    }
  | { readonly status: 'unresolved'; readonly reason: SymmetricPcUnavailableReason };

/** A command's preference class; 0 is the most preferred. Every command kind shares this one scale. */
export type SymmetricPcRankBucket = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * The expected damage that orders squares, and attacks, within a bucket: hit
 * chance against the target's planning AC plus the cover bonus, times the
 * damage, critical hits included.
 * - A move: what its destination square offers against the move profile's
 *   target, exactly as the projected movement evaluation computed it for that
 *   candidate. Unresolved when the destination is not an evaluated candidate
 *   or its attack has no resolved expected damage (for example, the target has
 *   Total Cover).
 * - An attack: the attack itself, made from the PC's own square, on the same
 *   basis (projectedAttackFromStart). Unresolved when its range is unstated,
 *   its target is not perceived, or it has no resolved expected damage.
 * Every other command is `not_compared`.
 */
export type SymmetricPcPlannedDamage =
  | { readonly kind: 'resolved'; readonly expectedDamage: number }
  | { readonly kind: 'unresolved' }
  | { readonly kind: 'not_compared' };

/**
 * Compared element by element; the lower rank is preferred.
 * Owner ruling 2026-09-24 (PERF-02 pcac): "Within the same bucket, prefer the
 * square with higher expected damage against the target (hit chance × damage,
 * which now includes AC + cover), then the canonical text." A bucket's attacks
 * against one target are ordered the same way, among themselves; the target is
 * still chosen by the canonical text, as the third commit chooses the forms'
 * target (PERF-02 pcac, fourth commit: once PC attack commands carry their real
 * range, a Longbow and a Battleaxe are both legal in melee, and the canonical
 * text alone took the weaker Longbow).
 */
export type SymmetricPcRank = readonly [
  bucket: SymmetricPcRankBucket,
  /** 1 only for command kinds this evaluator does not assess. */
  unassessedKind: 0 | 1,
  /**
   * Where the command sits in its bucket. It is the command's canonical key,
   * except that every move of a bucket takes the smallest canonical key among
   * that bucket's moves, and every attack the smallest among the bucket's
   * attacks against the same target. The moves (and each target's attacks)
   * therefore stay together where the first of them stood, every other command
   * and every other target keeps its place relative to them, and the next
   * element decides only between moves, or between attacks on one target, of
   * one bucket.
   */
  placementKey: string,
  /** Higher expected damage first; unresolved after every resolved value. */
  plannedDamage: SymmetricPcPlannedDamage,
  /** The command's canonical JSON: the final tie-break. */
  canonicalKey: string,
];

export interface SymmetricPcCommandAssessment {
  readonly command: EncounterCommand;
  readonly commandKey: string;
  readonly tactical: SymmetricPcTacticalAssessment | null;
  readonly movement: SymmetricPcMovementAssessment | null;
  readonly concentration: ConcentrationZoneEvaluation | null;
  readonly rank: SymmetricPcRank;
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

function damageTerms(command: AttackCommand): readonly TacticalDamageTerm[] {
  return command.damage.terms.map((term) => ({ dice: term.dice }));
}

function rollModeSources(command: AttackCommand): readonly AttackRollModeSource[] {
  switch (command.rollMode) {
    case 'normal': return [];
    case 'advantage': return [{ mode: 'advantage', reason: 'declared_advantage' }];
    case 'disadvantage': return [{ mode: 'disadvantage', reason: 'declared_disadvantage' }];
  }
}

function tacticalAssessment(
  state: EncounterState,
  projection: ActorKnowledgeProjection,
  command: AttackCommand,
): SymmetricPcTacticalAssessment {
  if (!statesItsRange(command)) return { status: 'unresolved', reason: 'attack_range_unstated' };
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
      range: command.tacticalRange,
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
  command: StatedRangeAttackCommand,
): EngineProjectedMovementRequest {
  return {
    actorId: command.actor,
    targetId: command.target,
    attack: {
      range: command.tacticalRange,
      attackBonus: command.attackBonus,
      criticalFloor: command.criticalFloor === 18 || command.criticalFloor === 19 ? command.criticalFloor : 20,
      damageTerms: damageTerms(command),
      attackerConditions: combatantConditions(state, command.actor),
      rollModeSources: rollModeSources(command),
    },
  };
}

function inCanonicalOrder<T>(values: readonly T[]): readonly T[] {
  return values
    .map((value) => ({ value, key: canonicalJson(value) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((entry) => entry.value);
}

interface MovementProfile {
  readonly attack: StatedRangeAttackCommand;
  readonly evaluation: MovementEvaluation;
}

/** One decision's attack profiles for its moves, in the canonical order of their attack commands. */
interface MovementProfiles {
  readonly source: SymmetricPcMovementProfileSource;
  readonly profiles: readonly MovementProfile[];
}

/**
 * The attack profiles every move of one decision is assessed with. A legal
 * attack command against a perceived target supplies the one profile, the
 * canonical-first such command; a legal attack that states no range supplies
 * none. With none, the PC's own attack forms do: the target is the one the
 * canonical-first form command attacks (the same canonical-text rule, applied
 * to the commands the forms would build), and every distinct profile of the
 * forms against that target is evaluated. Every profile plans with the range
 * its command states.
 */
function movementProfiles(
  state: EncounterState,
  projection: ActorKnowledgeProjection,
  actorId: CombatantId,
  attacks: readonly AttackCommand[],
  attackForms: TurnAttackForms,
): MovementProfiles | null {
  const legal = inCanonicalOrder(attacks.filter((attack): attack is StatedRangeAttackCommand =>
    statesItsRange(attack) && projectedTarget(projection, attack.target) !== null));
  const profileSource: SymmetricPcMovementProfileSource = legal.length > 0 ? 'legal_attack' : 'own_attack_forms';
  const forms = legal.length > 0
    ? legal.slice(0, 1)
    : inCanonicalOrder(projection.targets.flatMap((target) =>
        target.kind === 'perceived' ? attackForms(state, actorId, target.targetId) : []));
  const target = forms[0]?.target;
  const evaluated = new Set<string>();
  const profiles: MovementProfile[] = [];
  for (const attack of forms) {
    if (attack.target !== target) continue;
    const request = movementRequest(state, attack);
    const requestKey = canonicalJson(request);
    if (evaluated.has(requestKey)) continue;
    evaluated.add(requestKey);
    const evaluation = projectedMovementOptions(state, projection, request);
    if (evaluation !== null) profiles.push({ attack, evaluation });
  }
  return profiles.length === 0 ? null : { source: profileSource, profiles };
}

type MovementCandidate = MovementEvaluation['candidates'][number];

/** The evaluated movement candidate at the move's destination, when the evaluation has one. */
function destinationCandidate(command: MoveCommand, evaluation: MovementEvaluation): MovementCandidate | null {
  const destination = command.path.at(-1);
  if (destination === undefined) return null;
  return evaluation.candidates.find((entry) =>
    entry.destination.column === destination.column && entry.destination.row === destination.row) ?? null;
}

/**
 * Each profile assesses the move's destination as the evaluator ranks moves:
 * bucket first, then expected damage. The move takes the best of those
 * assessments (the first profile on a tie), so among squares of one bucket
 * the best expected damage across the PC's attacks decides.
 */
function movementAssessment(
  command: MoveCommand,
  movement: MovementProfiles | null,
): SymmetricPcMovementAssessment {
  if (movement === null) return { status: 'unresolved', reason: 'movement_profile_unavailable' };
  let best: { readonly profile: MovementProfile; readonly candidate: MovementCandidate | null } | null = null;
  for (const profile of movement.profiles) {
    const candidate = destinationCandidate(command, profile.evaluation);
    if (best === null || compareDestination(candidate, best.candidate) < 0) best = { profile, candidate };
  }
  if (best === null) throw new Error('A resolved movement assessment has at least one profile.');
  return {
    status: 'evaluated',
    profileSource: movement.source,
    attack: best.profile.attack,
    evaluation: best.profile.evaluation,
  };
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

function tacticalRank(value: SymmetricPcTacticalAssessment): 1 | 2 | 4 | 5 | 6 {
  if (value.status === 'unresolved') return 6;
  if (value.evaluation.range.status !== 'resolved' || !value.evaluation.range.legal) return 5;
  switch (value.evaluation.range.band) {
    case 'melee':
    case 'normal': return value.evaluation.damage.status === 'resolved' ? 1 : 2;
    case 'long': return 4;
    case 'out': return 5;
  }
}

function movementRank(candidate: MovementCandidate | null): 0 | 3 | 6 | 7 {
  if (candidate?.semantic.status !== 'resolved') return 7;
  switch (candidate.semantic.kind) {
    case 'move_5_to_normal_range':
    case 'move_within_speed_to_enable_attack': return 0;
    case 'maintain_range': return 3;
    case 'other_reposition': return 6;
  }
}

/** Reads the expected damage the evaluation already carries for the destination: its attack verdict there. */
function destinationDamage(candidate: MovementCandidate | null): SymmetricPcPlannedDamage {
  if (candidate?.after.status !== 'resolved' || candidate.after.evaluation.damage.status !== 'resolved') {
    return { kind: 'unresolved' };
  }
  return { kind: 'resolved', expectedDamage: candidate.after.evaluation.damage.expectedDamage };
}

/** The expected damage of a legal attack made from the PC's own square, on the movement planner's basis. */
function attackPlannedDamage(
  state: EncounterState,
  projection: ActorKnowledgeProjection,
  command: AttackCommand,
): SymmetricPcPlannedDamage {
  if (!statesItsRange(command) || projectedTarget(projection, command.target) === null) return { kind: 'unresolved' };
  const evaluation = projectedAttackFromStart(state, projection, movementRequest(state, command));
  return evaluation?.damage.status === 'resolved'
    ? { kind: 'resolved', expectedDamage: evaluation.damage.expectedDamage }
    : { kind: 'unresolved' };
}

/** A rank before the bucket's moves, and its attacks, are placed together. */
interface CommandOrder {
  readonly bucket: SymmetricPcRankBucket;
  readonly unassessedKind: 0 | 1;
  readonly plannedDamage: SymmetricPcPlannedDamage;
}

function commandOrder(
  command: EncounterCommand,
  tactical: SymmetricPcTacticalAssessment | null,
  movement: SymmetricPcMovementAssessment | null,
  concentration: ConcentrationZoneEvaluation | null,
  attackDamage: () => SymmetricPcPlannedDamage,
): CommandOrder {
  const notAMove = (bucket: SymmetricPcRankBucket, unassessedKind: 0 | 1 = 0): CommandOrder =>
    ({ bucket, unassessedKind, plannedDamage: { kind: 'not_compared' } });
  if (command.type === 'attack' && tactical !== null) {
    return { bucket: tacticalRank(tactical), unassessedKind: 0, plannedDamage: attackDamage() };
  }
  if (command.type === 'move' && movement !== null) {
    const candidate = movement.status === 'evaluated' ? destinationCandidate(command, movement.evaluation) : null;
    return { bucket: movementRank(candidate), unassessedKind: 0, plannedDamage: destinationDamage(candidate) };
  }
  if (command.type === 'cast_spell') {
    const startsConcentration = concentration?.start.status === 'resolved' &&
      concentration.start.kind === 'starts_concentration';
    return notAMove(startsConcentration ? 1 : 3);
  }
  if (command.type === 'drink_healing_potion') return notAMove(1);
  if (command.type === 'force_save') return notAMove(3);
  if (command.type === 'dodge' || command.type === 'disengage') return notAMove(7);
  if (command.type === 'dash') return notAMove(8);
  if (command.type === 'end_turn') return notAMove(9);
  return notAMove(8, 1);
}

function plannedDamageClass(value: SymmetricPcPlannedDamage): 0 | 1 | 2 {
  switch (value.kind) {
    case 'resolved': return 0;
    case 'unresolved': return 1;
    case 'not_compared': return 2;
  }
}

function comparePlannedDamage(left: SymmetricPcPlannedDamage, right: SymmetricPcPlannedDamage): number {
  if (left.kind === 'resolved' && right.kind === 'resolved') return right.expectedDamage - left.expectedDamage;
  return plannedDamageClass(left) - plannedDamageClass(right);
}

/** A destination's order among squares: bucket, then expected damage. */
function compareDestination(left: MovementCandidate | null, right: MovementCandidate | null): number {
  return movementRank(left) - movementRank(right) ||
    comparePlannedDamage(destinationDamage(left), destinationDamage(right));
}

function compareRank(left: SymmetricPcRank, right: SymmetricPcRank): number {
  return left[0] - right[0] || left[1] - right[1] || left[2].localeCompare(right[2]) ||
    comparePlannedDamage(left[3], right[3]) || left[4].localeCompare(right[4]);
}

/**
 * Evaluates legal PC commands from actor-knowledge-last-seen-v4. The full state never
 * supplies an opponent fact to a tactical decision; it is passed to the
 * projected movement provider only through its projection-restricted entrypoint,
 * which takes exactly one opponent fact from it: the target's Armor Class
 * (owner ruling 2026-09-24, see projectedMovementOptions). `attackForms` is
 * the PC's own attack forms from the same source as `legalActions`; moves are
 * planned with them when no legal attack targets a perceived creature.
 */
export function evaluateSymmetricPcDecision(input: {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
  readonly legalActions: readonly EncounterCommand[];
  readonly attackForms: TurnAttackForms;
}): SymmetricPcDecision {
  actor(input.state, input.actorId);
  const actorKnowledge = projectActorKnowledge(input.state, input.actorId);
  const legal = input.legalActions.filter((command) => 'actor' in command && command.actor === input.actorId);
  if (legal.length === 0) throw new Error(`Symmetric PC evaluator has no legal actions for ${String(input.actorId)}.`);
  const attacks = legal.filter((command): command is AttackCommand => command.type === 'attack');
  // Every move of the decision is assessed with the same profiles, so they are
  // evaluated once, when the first move needs them.
  let profiles: { readonly value: MovementProfiles | null } | null = null;
  const decisionProfiles = (): MovementProfiles | null => {
    profiles ??= {
      value: movementProfiles(input.state, actorKnowledge, input.actorId, attacks, input.attackForms),
    };
    return profiles.value;
  };
  const evaluated = legal.map((command) => {
    const tactical = command.type === 'attack'
      ? tacticalAssessment(input.state, actorKnowledge, command)
      : null;
    const movement = command.type === 'move'
      ? movementAssessment(command, decisionProfiles())
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
      order: commandOrder(command, tactical, movement, concentration, () => command.type === 'attack'
        ? attackPlannedDamage(input.state, actorKnowledge, command)
        : { kind: 'not_compared' }),
    };
  });
  // The smallest canonical key among the moves of each bucket places them
  // all; likewise the attacks against each target, so the target keeps its
  // canonical-text place and only its weapons are reordered.
  const placementGroup = (command: EncounterCommand, order: CommandOrder) =>
    `${command.type}:${String(order.bucket)}:${command.type === 'attack' ? String(command.target) : ''}`;
  const groupPlacement = new Map<string, string>();
  for (const entry of evaluated) {
    if (entry.order.plannedDamage.kind === 'not_compared') continue;
    const group = placementGroup(entry.command, entry.order);
    const placed = groupPlacement.get(group);
    if (placed === undefined || entry.commandKey.localeCompare(placed) < 0) {
      groupPlacement.set(group, entry.commandKey);
    }
  }
  const assessments = evaluated.map(({ order, ...assessment }): SymmetricPcCommandAssessment => {
    const placementKey = order.plannedDamage.kind === 'not_compared'
      ? assessment.commandKey
      : groupPlacement.get(placementGroup(assessment.command, order));
    if (placementKey === undefined) throw new Error('Every move and attack registered its bucket placement above.');
    return {
      ...assessment,
      rank: [order.bucket, order.unassessedKind, placementKey, order.plannedDamage, assessment.commandKey],
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

  constructor(
    private readonly stateForRequest: () => EncounterState,
    private readonly attackForms: TurnAttackForms,
  ) {}

  async choose(request: ControllerRequest, signal: AbortSignal): Promise<ControllerDecision> {
    if (signal.aborted) throw new Error('Symmetric PC controller request was cancelled.');
    if (request.kind === 'reaction') {
      const action = [...request.legalActions.actions]
        .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)))[0];
      if (action === undefined) throw new Error('Symmetric PC controller reaction has no legal actions.');
      return { requestId: request.requestId, encounterRevision: request.encounterRevision, action };
    }
    const decision = evaluateSymmetricPcDecision({
      state: this.stateForRequest(),
      actorId: request.actorId,
      legalActions: request.legalActions.actions,
      attackForms: this.attackForms,
    });
    return {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: decision.selected.command,
    };
  }
}
