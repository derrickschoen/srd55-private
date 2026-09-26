import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { combatToken, monsterCombatantProfile } from '../../../src/combat/combatant';
import { traceCombatantLine } from '../../../src/combat/cover';
import type { TurnAttackForms } from '../../../src/combat/coordinator';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand, StatedRangeAttackCommand } from '../../../src/combat/events';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { GridCell } from '../../../src/combat/grid';
import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
import { terrainBlocking } from '../../../src/combat/terrain';
import {
  armorClass,
  damageType,
  dieSides,
  effectStackingIdentity,
  type CombatantId,
  encounterEffectId,
  feet,
  worldObjectId,
} from '../../../src/combat/values';
import { evaluateTacticalAttack } from '../../../src/combat/tactical-evaluator';
import {
  externalPartyPackSchema,
  loadExternalPartyPack,
  loadedPartyAttackForms,
  loadedPartyTurnLegalActions,
} from '../../../src/vtt/party-pack';
import { regretAttackForms, regretTurnLegalActions } from '../../../src/vtt/regret/legal-actions';
import {
  DEFAULT_SCRIPTED_PC_DECISION_POLICY,
  evaluateSymmetricPcDecision,
  symmetricPcTurnPlan,
  type SymmetricPcCommandAssessment,
  type SymmetricPcDecision,
} from '../../../src/vtt/symmetric-pc-evaluator';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

declareTestInputs({});

// Records, in call order, every projected-movement query and every tactical
// attack evaluation made outside one; both wrappers delegate unchanged. When a
// test turns it on, it also counts target lookups in the actor's projection.
// With isolate: false a worker shares its module registry across files, so it
// is reset before this file's imports and restored after its last test.
const probe = vi.hoisted(() => {
  vi.resetModules();
  const calls: string[] = [];
  return { calls, insideProjectedMovement: false, countTargetLookups: false, targetLookups: 0 };
});

vi.mock('../../../src/vtt/engine-query-port', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/vtt/engine-query-port')>();
  const projectedMovementOptions: typeof original.projectedMovementOptions = (...args) => {
    probe.calls.push('projected-movement');
    probe.insideProjectedMovement = true;
    try {
      return original.projectedMovementOptions(...args);
    } finally {
      probe.insideProjectedMovement = false;
    }
  };
  return { ...original, projectedMovementOptions };
});

vi.mock('../../../src/combat/tactical-evaluator', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/combat/tactical-evaluator')>();
  const evaluateTacticalAttack: typeof original.evaluateTacticalAttack = (input) => {
    if (!probe.insideProjectedMovement) probe.calls.push(`tactical:${String(input.targetId)}`);
    return original.evaluateTacticalAttack(input);
  };
  return { ...original, evaluateTacticalAttack };
});

vi.mock('../../../src/vtt/intel/actor-knowledge', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../src/vtt/intel/actor-knowledge')>();
  const projectActorKnowledge: typeof original.projectActorKnowledge = (...args) => {
    const projection = original.projectActorKnowledge(...args);
    if (!probe.countTargetLookups) return projection;
    const targets = [...projection.targets];
    const find = targets.find.bind(targets);
    Object.defineProperty(targets, 'find', {
      value: (predicate: Parameters<typeof find>[0]) => {
        probe.targetLookups += 1;
        return find(predicate);
      },
    });
    return { ...projection, targets };
  };
  return { ...original, projectActorKnowledge };
});

beforeEach(() => {
  probe.calls.splice(0);
  probe.insideProjectedMovement = false;
  probe.countTargetLookups = false;
  probe.targetLookups = 0;
});

afterAll(() => {
  vi.doUnmock('../../../src/vtt/engine-query-port');
  vi.doUnmock('../../../src/combat/tactical-evaluator');
  vi.doUnmock('../../../src/vtt/intel/actor-knowledge');
  vi.resetModules();
});

function attack(
  actor: ReturnType<typeof playerProfile>['id'],
  target: ReturnType<typeof monsterProfile>['id'],
  range: StatedRangeAttackCommand['tacticalRange'],
): StatedRangeAttackCommand {
  return {
    type: 'attack', actor, target, attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true, tacticalRange: range,
    damage: { terms: [{ type: damageType('Piercing'), dice: { count: 1, sides: dieSides(8), modifier: 3 } }], critical: false, responses: [] },
  };
}

/** The attack forms a provider pairs with these attack commands: each command against its own target. */
function attackFormsOf(...commands: readonly StatedRangeAttackCommand[]): TurnAttackForms {
  return (_state, actor, target) => commands.filter((command) => command.actor === actor && command.target === target);
}

function ready(state: EncounterState, actorId: ReturnType<typeof playerProfile>['id']): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) => combatant.profile.id === actorId
      ? {
          ...combatant,
          turn: {
            ...combatant.turn,
            action: { kind: 'available' },
            movement: { speed: feet(30), spent: feet(0), remaining: feet(30) },
          },
        }
      : combatant),
  };
}

describe('symmetric scripted-PC evaluator', () => {
  it('chooses the hand-computed movement-evaluator optimum through actor knowledge', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('symmetric-target');
    const state = ready(createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 3)],
    }), actor.id);
    const ranged = attack(actor.id, target.id, {
      kind: 'ranged', normalRangeFeet: feet(10), longRangeFeet: feet(20),
    });
    const move: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move', actor: actor.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    };

    // At 15 feet the attack is legal only at long range. Moving 5 feet makes
    // the distance 10 feet, exactly normal range, so movement-eval ranks it first.
    const decision = evaluateSymmetricPcDecision({
      state, actorId: actor.id, legalActions: [ranged, move, { type: 'end_turn', actor: actor.id }],
      attackForms: attackFormsOf(ranged),
    });

    expect(DEFAULT_SCRIPTED_PC_DECISION_POLICY).toBe('symmetric_evaluator_v1');
    expect(decision.policyVersions).toEqual({
      tactical: 'tactical-evaluator-v3',
      movement: 'movement-eval-v2',
      concentration: 'concentration-intel-v2',
      actorKnowledge: 'actor-knowledge-last-seen-v4',
    });
    expect(decision.selected.command).toEqual(move);
    const movement = decision.selected.movement;
    if (movement?.status !== 'evaluated') throw new Error('Expected projected movement evaluation.');
    expect(movement.evaluation.candidates.find((candidate) =>
      candidate.destination.column === 1 && candidate.destination.row === 0)?.semantic).toEqual({
      status: 'resolved', kind: 'move_5_to_normal_range',
    });
  });

  it('asks projected movement once per decision: move commands share it and other commands carry movement: null', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('symmetric-target');
    const state = ready(createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 3)],
    }), actor.id);
    const ranged = attack(actor.id, target.id, {
      kind: 'ranged', normalRangeFeet: feet(10), longRangeFeet: feet(20),
    });
    const oneStep: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move', actor: actor.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    };
    const twoSteps: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move', actor: actor.id, path: [{ column: 1, row: 0 }, { column: 2, row: 0 }], cause: 'voluntary',
    };
    const endTurn = { type: 'end_turn' as const, actor: actor.id };
    const decision = evaluateSymmetricPcDecision({
      state, actorId: actor.id, legalActions: [ranged, oneStep, endTurn, twoSteps],
      attackForms: attackFormsOf(ranged),
    });
    const byCommand = (command: EncounterCommand) => {
      const found = decision.assessments.find((assessment) => assessment.command === command);
      if (found === undefined) throw new Error('Every legal command must be assessed.');
      return found;
    };

    // Movement options never depend on which move is ranked, only on the state,
    // the actor's projection and the perceived attack, so both moves hold the
    // one answer. Attacks and end_turn are not movement and carry none. Each
    // move takes the best profile at its own destination, so each holds its own
    // assessment; with one profile (the ranged attack, which is also its only
    // form) both assess with it, and its evaluation is the one shared answer.
    const shared = byCommand(oneStep).movement;
    if (shared?.status !== 'evaluated') throw new Error('Expected projected movement evaluation.');
    const second = byCommand(twoSteps).movement;
    if (second?.status !== 'evaluated') throw new Error('Expected projected movement evaluation.');
    expect(second.evaluation).toBe(shared.evaluation);
    expect(second).toEqual(shared);
    expect(byCommand(ranged).movement).toBeNull();
    expect(byCommand(endTurn).movement).toBeNull();
  });

  it('queries projected movement exactly once per decision with move commands and never without one', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('symmetric-target');
    const state = ready(createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 3)],
    }), actor.id);
    const ranged = attack(actor.id, target.id, {
      kind: 'ranged', normalRangeFeet: feet(10), longRangeFeet: feet(20),
    });
    const endTurn = { type: 'end_turn' as const, actor: actor.id };
    const moveThrough = (...columns: readonly number[]): Extract<EncounterCommand, { readonly type: 'move' }> => ({
      type: 'move', actor: actor.id, path: columns.map((column) => ({ column, row: 0 })), cause: 'voluntary',
    });
    const queries = () => probe.calls.filter((call) => call === 'projected-movement').length;

    // Three move commands, one query: asking per move would make three.
    evaluateSymmetricPcDecision({
      state, actorId: actor.id, legalActions: [ranged, moveThrough(1), endTurn, moveThrough(1, 2), moveThrough(1)],
      attackForms: attackFormsOf(ranged),
    });
    expect(queries()).toBe(1);
    // A decision with no move command has no movement to assess, so no query.
    evaluateSymmetricPcDecision({ state, actorId: actor.id, legalActions: [ranged, endTurn], attackForms: attackFormsOf(ranged) });
    expect(queries()).toBe(1);
  });

  it('assesses an unresolved movement profile once per decision and shares it across move commands', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('fogged-target');
    // The target stands in fog, so the actor does not perceive it: the attack
    // on it gives no perceived attack profile, and movement stays unresolved
    // without ever reaching the projected-movement query.
    const state = ready(createEncounter({
      bounds: { columns: 5, rows: 1 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 3)],
      foggedCells: [{ column: 3, row: 0 }],
    }), actor.id);
    const ranged = attack(actor.id, target.id, {
      kind: 'ranged', normalRangeFeet: feet(10), longRangeFeet: feet(20),
    });
    const oneStep: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move', actor: actor.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    };
    const twoSteps: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move', actor: actor.id, path: [{ column: 1, row: 0 }, { column: 2, row: 0 }], cause: 'voluntary',
    };
    probe.countTargetLookups = true;
    const decision = evaluateSymmetricPcDecision({
      state, actorId: actor.id, legalActions: [ranged, oneStep, { type: 'end_turn', actor: actor.id }, twoSteps],
      attackForms: attackFormsOf(ranged),
    });
    const byCommand = (command: EncounterCommand) => {
      const found = decision.assessments.find((assessment) => assessment.command === command);
      if (found === undefined) throw new Error('Every legal command must be assessed.');
      return found;
    };

    // Two target lookups are the attack's: its tactical assessment and its
    // planned damage (it states its range). The decision's movement profiles
    // look the one attack's target up once more (its forms then read only
    // perceived targets, and there are none). Assessing once per decision
    // makes 2 + 1 = 3; assessing per move command would make 4.
    expect(probe.targetLookups).toBe(3);
    expect(probe.calls.filter((call) => call === 'projected-movement')).toEqual([]);
    expect(byCommand(ranged).tactical).toEqual({ status: 'unresolved', reason: 'target_not_perceived' });
    const shared = byCommand(oneStep).movement;
    expect(shared).toEqual({ status: 'unresolved', reason: 'movement_profile_unavailable' });
    expect(byCommand(twoSteps).movement).toEqual(shared);
  });

  it('assesses legal commands in order: the first move queries projected movement after the attack before it', () => {
    const actor = playerProfile('symmetric-pc');
    const alpha = monsterProfile('order-alpha');
    const beta = monsterProfile('order-beta');
    const state = ready(createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [actor, alpha, beta],
      tokens: [placedToken(actor, 0), placedToken(alpha, 3), placedToken(beta, 4)],
    }), actor.id);
    const ranged = (target: typeof alpha.id) => attack(actor.id, target, {
      kind: 'ranged', normalRangeFeet: feet(10), longRangeFeet: feet(20),
    });
    const moveThrough = (...columns: readonly number[]): Extract<EncounterCommand, { readonly type: 'move' }> => ({
      type: 'move', actor: actor.id, path: columns.map((column) => ({ column, row: 0 })), cause: 'voluntary',
    });

    evaluateSymmetricPcDecision({
      state,
      actorId: actor.id,
      legalActions: [ranged(alpha.id), moveThrough(1), ranged(beta.id), moveThrough(1, 2), { type: 'end_turn', actor: actor.id }],
      attackForms: attackFormsOf(ranged(alpha.id), ranged(beta.id)),
    });

    // Commands are assessed in legal order, so the first appearance of each
    // call follows it: alpha's attack, then the first move's query, then beta's
    // attack. (How often the query repeats is the previous test's subject.)
    expect([...new Set(probe.calls)]).toEqual([
      `tactical:${String(alpha.id)}`,
      'projected-movement',
      `tactical:${String(beta.id)}`,
    ]);
  });

  it('assesses projected movement from each decision\'s own state', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('symmetric-target');
    const ranged = attack(actor.id, target.id, {
      kind: 'ranged', normalRangeFeet: feet(10), longRangeFeet: feet(20),
    });
    const move: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move', actor: actor.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    };
    const semanticAtColumnOne = (targetColumn: number) => {
      const state = ready(createEncounter({
        bounds: { columns: 6, rows: 1 },
        combatants: [actor, target],
        tokens: [placedToken(actor, 0), placedToken(target, targetColumn)],
      }), actor.id);
      const movement = evaluateSymmetricPcDecision({
        state, actorId: actor.id, legalActions: [ranged, move, { type: 'end_turn', actor: actor.id }],
        attackForms: attackFormsOf(ranged),
      }).assessments.find((assessment) => assessment.command === move)?.movement;
      if (movement?.status !== 'evaluated') throw new Error('Expected projected movement evaluation.');
      return movement.evaluation.candidates.find((candidate) =>
        candidate.destination.column === 1 && candidate.destination.row === 0)?.semantic;
    };

    // Target 15 ft away: the 5-ft step reaches 10 ft, exactly normal range.
    expect(semanticAtColumnOne(3)).toEqual({ status: 'resolved', kind: 'move_5_to_normal_range' });
    // Target 20 ft away: the same step goes from 20 ft to 15 ft, long range both
    // times, so a later decision must not reuse the earlier decision's answer.
    expect(semanticAtColumnOne(4)).toEqual({ status: 'resolved', kind: 'maintain_range' });
  });

  it('does not use full monster AC or HP when full knowledge would pick another target', () => {
    const actor = playerProfile('symmetric-pc');
    const alphaBase = monsterProfile('alpha', { hitPoints: 10 });
    const betaBase = monsterProfile('beta', { hitPoints: 40 });
    const alpha = { ...alphaBase, rules: { ...alphaBase.rules, armorClass: armorClass(18) } };
    const beta = { ...betaBase, rules: { ...betaBase.rules, armorClass: armorClass(10) } };
    const created = createEncounter({
      bounds: { columns: 3, rows: 2 },
      combatants: [actor, alpha, beta],
      tokens: [placedToken(actor, 0), placedToken(alpha, 1, 0), placedToken(beta, 1, 1)],
    });
    const state = ready({
      ...created,
      combatants: created.combatants.map((combatant) => combatant.profile.id === alpha.id
        ? { ...combatant, hitPoints: 1 }
        : combatant),
    }, actor.id);
    const range = { kind: 'melee' as const, reachFeet: feet(5) };
    const alphaAttack = attack(actor.id, alpha.id, range);
    const betaAttack = attack(actor.id, beta.id, range);
    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: actor.id,
      legalActions: [betaAttack, alphaAttack, { type: 'end_turn', actor: actor.id }],
      attackForms: attackFormsOf(betaAttack, alphaAttack),
    });
    const fullAlpha = evaluateTacticalAttack({
      attackerId: actor.id, targetId: alpha.id, attackerPosition: { column: 0, row: 0 }, targetPosition: { column: 1, row: 0 },
      range, attackBonus: 5, targetArmorClass: 18, criticalFloor: 20,
      damageTerms: [{ dice: { count: 1, sides: 8, modifier: 3 } }], attackerConditions: [], targetConditions: [],
      attackerCanSeeTarget: true, targetCanSeeAttacker: true, rollModeSources: [], featureRollModeInput: null,
      closeCombatEnemies: [],
      target: { hitPoints: 1, usesDeathSaves: false },
    });
    const fullBeta = evaluateTacticalAttack({
      attackerId: actor.id, targetId: beta.id, attackerPosition: { column: 0, row: 0 }, targetPosition: { column: 1, row: 1 },
      range, attackBonus: 5, targetArmorClass: 10, criticalFloor: 20,
      damageTerms: [{ dice: { count: 1, sides: 8, modifier: 3 } }], attackerConditions: [], targetConditions: [],
      attackerCanSeeTarget: true, targetCanSeeAttacker: true, rollModeSources: [], featureRollModeInput: null,
      closeCombatEnemies: [],
      target: { hitPoints: 40, usesDeathSaves: false },
    });
    if (fullAlpha.damage.status !== 'resolved' || fullBeta.damage.status !== 'resolved') {
      throw new Error('Full-knowledge comparison must resolve both attacks.');
    }

    // Full knowledge favours beta's AC 10. The PC receives only AC bands and
    // never turns either band or alpha's 1 HP into a numeric evaluator input.
    expect(fullBeta.damage.expectedDamage).toBeGreaterThan(fullAlpha.damage.expectedDamage);
    expect(decision.selected.command).toEqual(alphaAttack);
    expect(decision.actorKnowledge.targets.map((targetKnowledge) => targetKnowledge.kind === 'perceived'
      ? [targetKnowledge.targetId, targetKnowledge.armorClass, targetKnowledge.hitPoints]
      : [targetKnowledge.targetId, targetKnowledge.kind])).toEqual([
      [alpha.id, { kind: 'perceived_band', band: 'heavily_defended' },
        { kind: 'perceived_band', band: 'near_death' }],
      [beta.id, { kind: 'perceived_band', band: 'lightly_defended' },
        { kind: 'perceived_band', band: 'uninjured' }],
    ]);
  });

  it('keeps unknown AC and HP in typed tactical unresolved results', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('unknown-target');
    const state = ready(createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 1)],
    }), actor.id);
    const command = attack(actor.id, target.id, { kind: 'melee', reachFeet: feet(5) });
    const decision = evaluateSymmetricPcDecision({
      state, actorId: actor.id, legalActions: [command, { type: 'end_turn', actor: actor.id }],
      attackForms: attackFormsOf(command),
    });
    const tactical = decision.selected.tactical;
    if (tactical?.status !== 'evaluated') throw new Error('Expected an evaluated tactical input.');

    expect(tactical.evaluation.probabilities).toEqual({
      status: 'unresolved', reason: 'target_armor_class_unresolved',
    });
    expect(tactical.evaluation.damage).toEqual({
      status: 'unresolved', reason: 'target_armor_class_unresolved',
    });
    expect(tactical.evaluation.consequences).toMatchObject({
      status: 'unresolved', reason: 'target_hit_points_unresolved',
    });
  });

  it('is deterministic for equal state and legal-command transcripts', () => {
    const actor = playerProfile('symmetric-pc');
    const target = monsterProfile('deterministic-target');
    const state = ready(createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [actor, target],
      tokens: [placedToken(actor, 0), placedToken(target, 1)],
    }), actor.id);
    const melee = attack(actor.id, target.id, { kind: 'melee', reachFeet: feet(5) });
    const legalActions = [
      melee,
      { type: 'dodge' as const, actor: actor.id },
      { type: 'end_turn' as const, actor: actor.id },
    ];
    const attackForms = attackFormsOf(melee);

    expect(evaluateSymmetricPcDecision({ state, actorId: actor.id, legalActions, attackForms }))
      .toEqual(evaluateSymmetricPcDecision({
        state: structuredClone(state), actorId: actor.id, legalActions: structuredClone(legalActions), attackForms,
      }));
  });
});

/*
 * PERF-02 pcac, second commit. Owner ruling 2026-09-24, the option as chosen:
 * "Within the same bucket, prefer the square with higher expected damage
 * against the target (hit chance x damage, which now includes AC + cover),
 * then the canonical text."
 *
 * Rules behind every number below (docs/srd/full/srd-5.2.1.txt):
 * - Attack Rolls, Rolling 20 or 1 (:447-454): a d20 face f hits when
 *   f + 5 >= AC; a natural 20 always hits and is the Critical Hit; a natural 1
 *   always misses. So one die hits AC 15 on faces 10-20 (p = 11/20), AC 17 on
 *   12-20 (9/20), AC 20 on 15-20 (6/20).
 * - Roll Two D20s (:493-499): Advantage keeps the higher die, Disadvantage the
 *   lower. The hitting faces are always a top run t..20, so Advantage hits with
 *   1 - (1 - p)^2 and crits with 1 - (19/20)^2 = 39/400; Disadvantage hits with
 *   p^2 and crits with (1/20)^2 = 1/400.
 * - Ranges (:827-830): count squares, diagonal ones included, 5 feet each.
 *   Long range (:901-909): Disadvantage beyond normal range; no attack beyond
 *   long range.
 * - Cover (:943-949): Half +2 AC, Three-Quarters +5 AC; Total Cover cannot be
 *   targeted, so it has no expected damage. Critical Hits (:997-1003): roll the
 *   damage dice twice.
 * - Paralyzed (:11952-11964): attack rolls against it have Advantage, and a
 *   hit from within 5 feet is a Critical Hit. It has the Incapacitated
 *   condition, so an adjacent ranged attacker takes no close-combat
 *   Disadvantage (:911-917).
 * The ranger throws Darts (:5500: 1d4 Piercing, Thrown, range 20/60) at +5 for
 * 1d4 + 3, so a hit averages 2.5 + 3 = 5.5 and a Critical Hit 2 x 2.5 + 3 = 8.
 * Expected damage = (hit - critical) x 5.5 + critical x 8. The target is the
 * SRD Goblin Warrior, AC 15 (:18985-18988).
 *
 * Cover follows the D576 corner rule: from ONE corner of the attacker's
 * square, a line to each of the goblin's four corners; a line is obstructed
 * only where it passes through a blocking cell's interior; the attacker uses
 * its best corner; 1-2 obstructed lines = Half, 3 = Three-Quarters, all four
 * lines through a wall from every corner = Total. A cell (c, r) is the square
 * (c, c+1) x (r, r+1).
 *
 * WALL-CORNER BOARD (columns 0-13, rows 0-5): the goblin at (13,5), a wall
 * filling row 4 from column 9 to 11 (its end corner (12,5) one square left of
 * the goblin's corner (13,5)), the ranger at (0,3). The ranger is 13 squares = 65 feet away, beyond the Dart's long
 * range, and each square of column 1 next to it is 12 squares = 60 feet away:
 * moving there enables the shot, at long range, with Disadvantage.
 * - (1,4): from corner (1,5) the lines to (13,5) and (14,5) run along y = 5,
 *   the wall's bottom edge, and the lines to (13,6) and (14,6) pass below it.
 *   No cover. Hit (11/20)^2 = 121/400, critical 1/400:
 *   ED = 120/400 x 5.5 + 1/400 x 8 = 668/400 = 1.67.
 * - (1,3): from corner (1,4) the line to (13,5) is y = 4 + (x - 1)/12, at
 *   y in (4.67, 4.92) while x is in (9, 12): inside the wall; the same holds
 *   for (14,5); the lines to (13,6) and (14,6) cross y = 5 before x = 9. Two
 *   lines = Half, and no corner of (1,3) obstructs fewer. AC 17: hit 81/400,
 *   ED = 80/400 x 5.5 + 8/400 = 448/400 = 1.12.
 * - (1,2): its best corner (1,3) obstructs three lines (all but the one to
 *   (13,6)); every other corner obstructs all four. Three-Quarters. AC 20:
 *   hit 36/400, ED = 35/400 x 5.5 + 8/400 = 200.5/400 = 0.50125.
 * Lengthening the wall to column 8 also puts line (1,3)-(13,6) through it
 * (y = 3 + 3(x - 1)/12 is in (4.75, 5) while x is in (8, 9)), so every corner
 * of (1,2) then obstructs all four lines: Total Cover. (1,3) and (1,4) keep
 * the tiers above: their best corners' clear lines run along y = 5 or are
 * already below row 4 (y > 5) before x = 8.
 *
 * PARALYZED BOARD (columns 0-5, rows 0-3): the goblin at (4,2) is Paralyzed,
 * a low wall granting Three-Quarters Cover fills (4,1), and the ranger stands
 * at (2,1), 10 feet away in normal range. Every square below keeps normal
 * range, so every move is "maintain range" (one bucket) and every attack has
 * Advantage.
 * - A (3,1), 5 feet: diagonal to the goblin, sharing its corner (4,2), so no
 *   cover; every hit is a Critical Hit. Hit 1 - (9/20)^2 = 319/400,
 *   ED = 319/400 x 8 = 2552/400 = 6.38.
 * - B (2,2), 10 feet: from corner (3,2) two lines run along y = 2 (the low
 *   wall's bottom edge) and two pass below the wall. No cover. Hit 319/400,
 *   critical 39/400: ED = 280/400 x 5.5 + 39/400 x 8 = 1852/400 = 4.63.
 * - C (3,0), 10 feet: from its best corner (3,1) only the line to (5,2)
 *   crosses the low wall (y = 1 + (x - 3)/2 is in (1.5, 2) while x is in
 *   (4, 5)); the other corners obstruct two lines each. Half, AC 17: hit
 *   1 - (11/20)^2 = 279/400, ED = 240/400 x 5.5 + 39/400 x 8 = 1632/400 = 4.08.
 * A and B have the SAME hit chance but different expected damage, so a
 * tie-break on hit chance alone falls through to the canonical text there.
 */
const WALL_CORNER_GOBLIN_CELL = { column: 13, row: 5 } as const;
const WALL_CORNER_RANGER_CELL = { column: 0, row: 3 } as const;
const WALL_CORNER_CELLS: readonly GridCell[] = [
  { column: 9, row: 4 }, { column: 10, row: 4 }, { column: 11, row: 4 },
];
const LENGTHENED_WALL_CELLS: readonly GridCell[] = [{ column: 8, row: 4 }, ...WALL_CORNER_CELLS];
const THREE_QUARTERS_SQUARE = { column: 1, row: 2 } as const;
const HALF_SQUARE = { column: 1, row: 3 } as const;
const CLEAR_SQUARE = { column: 1, row: 4 } as const;

const PARALYZED_GOBLIN_CELL = { column: 4, row: 2 } as const;
const PARALYZED_RANGER_CELL = { column: 2, row: 1 } as const;
const LOW_WALL_CELL = { column: 4, row: 1 } as const;
const ADJACENT_SQUARE = { column: 3, row: 1 } as const;
const CLEAR_TEN_FOOT_SQUARE = { column: 2, row: 2 } as const;
const HALF_TEN_FOOT_SQUARE = { column: 3, row: 0 } as const;

function blockingCell(
  id: string,
  cell: GridCell,
  kind: 'wall' | 'three_quarters_cover' | 'half_cover',
): EncounterState['worldObjects'][number] {
  return {
    id: worldObjectId(`object:${id}`), name: kind === 'wall' ? 'Wall' : kind === 'half_cover' ? 'Barrel' : 'Low wall',
    kind: kind === 'wall' ? 'barrier' : 'cover', position: cell, footprint: [cell],
    durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
    blocking: terrainBlocking(kind), createdRevision: 0,
  };
}

function tieBreakBoard(input: {
  readonly columns: number;
  readonly rows: number;
  readonly rangerCell: GridCell;
  readonly goblinCell: GridCell;
  readonly blocking: readonly EncounterState['worldObjects'][number][];
  readonly goblinParalyzed: boolean;
}) {
  const ranger = playerProfile('pcac-tiebreak-ranger');
  const goblin = monsterCombatantProfile(GOBLIN_WARRIOR, {
    combatantId: 'combatant:pcac-tiebreak-goblin', tokenId: 'token:pcac-tiebreak-goblin',
  });
  const created = createEncounter({
    bounds: { columns: input.columns, rows: input.rows },
    combatants: [ranger, goblin],
    tokens: [
      placedToken(ranger, input.rangerCell.column, input.rangerCell.row),
      placedToken(goblin, input.goblinCell.column, input.goblinCell.row),
    ],
    worldObjects: input.blocking,
  });
  const state = ready({
    ...created,
    effects: input.goblinParalyzed
      ? [{
          id: encounterEffectId('effect:pcac-tiebreak-paralyzed'),
          source: ranger.id,
          targets: [goblin.id],
          createdRevision: 0,
          duration: { kind: 'permanent' },
          concentrationOwner: null,
          stackingIdentity: effectStackingIdentity('pcac-tiebreak-paralyzed'),
          stacking: 'replace_same_source',
          repeatedSave: null,
          payload: { kind: 'condition', condition: 'Paralyzed' },
        }]
      : [],
  }, ranger.id);
  return { state, ranger, goblin };
}

function wallCornerBoard(wall: readonly GridCell[]) {
  return tieBreakBoard({
    columns: 14, rows: 6, rangerCell: WALL_CORNER_RANGER_CELL, goblinCell: WALL_CORNER_GOBLIN_CELL,
    blocking: wall.map((cell) => blockingCell(`pcac-wall-${String(cell.column)}`, cell, 'wall')),
    goblinParalyzed: false,
  });
}

function paralyzedBoard() {
  return tieBreakBoard({
    columns: 6, rows: 4, rangerCell: PARALYZED_RANGER_CELL, goblinCell: PARALYZED_GOBLIN_CELL,
    blocking: [blockingCell('pcac-low-wall', LOW_WALL_CELL, 'three_quarters_cover')],
    goblinParalyzed: true,
  });
}

function dart(
  actor: ReturnType<typeof playerProfile>['id'],
  target: ReturnType<typeof monsterCombatantProfile>['id'],
): StatedRangeAttackCommand {
  return {
    type: 'attack', actor, target, attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    tacticalRange: { kind: 'ranged', normalRangeFeet: feet(20), longRangeFeet: feet(60) },
    damage: { terms: [{ type: damageType('Piercing'), dice: { count: 1, sides: dieSides(4), modifier: 3 } }], critical: false, responses: [] },
  };
}

function step(actor: ReturnType<typeof playerProfile>['id'], cell: GridCell): Extract<EncounterCommand, { readonly type: 'move' }> {
  return { type: 'move', actor, path: [{ ...cell }], cause: 'voluntary' };
}

/** The ranked moves in decision order: destination, bucket, and expected damage (rounded to 1e-9). */
function rankedMoves(decision: SymmetricPcDecision) {
  return decision.assessments.flatMap((assessment) => {
    if (assessment.command.type !== 'move') return [];
    const destination = assessment.command.path.at(-1);
    const damage = assessment.rank[3];
    return [{
      destination,
      bucket: assessment.rank[0],
      damage: damage.kind === 'resolved' ? Math.round(damage.expectedDamage * 1e9) / 1e9 : damage.kind,
    }];
  });
}

function coverTiers(state: EncounterState, actorId: CombatantId, targetId: CombatantId, cells: readonly GridCell[]) {
  return cells.map((cell) => traceCombatantLine(state, actorId, targetId, { sourceAnchor: cell }).tier);
}

/** True when the commands are listed in canonical-text order, the order the tie-break replaces. */
function inCanonicalOrder(commands: readonly EncounterCommand[]): boolean {
  const keys = commands.map((command) => canonicalJson(command));
  return keys.every((key, index) => index === 0 || (keys[index - 1] ?? '').localeCompare(key) < 0);
}

describe('PCAC tie-break: within one bucket the scripted PC prefers the square with higher expected damage', () => {
  it('PCAC-TIEBREAK-CLEAR-WINS: among squares that all enable the shot, the clear square beats the Half and Three-Quarters squares', () => {
    const { state, ranger, goblin } = wallCornerBoard(WALL_CORNER_CELLS);
    const squares = [THREE_QUARTERS_SQUARE, HALF_SQUARE, CLEAR_SQUARE];
    expect(coverTiers(state, ranger.id, goblin.id, squares)).toEqual(['three_quarters', 'half', 'none']);
    const moves = squares.map((cell) => step(ranger.id, cell));
    // The canonical text alone would take the Three-Quarters square (row 2 sorts first).
    expect(inCanonicalOrder(moves)).toBe(true);

    const decision = evaluateSymmetricPcDecision({
      state, actorId: ranger.id, legalActions: [dart(ranger.id, goblin.id), ...moves, { type: 'end_turn', actor: ranger.id }],
      attackForms: attackFormsOf(dart(ranger.id, goblin.id)),
    });

    const ranked = rankedMoves(decision);
    expect(ranked.map((move) => move.destination)).toEqual([CLEAR_SQUARE, HALF_SQUARE, THREE_QUARTERS_SQUARE]);
    expect(ranked).toEqual([
      { destination: CLEAR_SQUARE, bucket: 0, damage: 1.67 },
      { destination: HALF_SQUARE, bucket: 0, damage: 1.12 },
      { destination: THREE_QUARTERS_SQUARE, bucket: 0, damage: 0.50125 },
    ]);
    expect(decision.selected.command).toEqual(step(ranger.id, CLEAR_SQUARE));
  });

  it('PCAC-TIEBREAK-DAMAGE-NOT-HIT: equal hit chances are ordered by expected damage, which counts the Paralyzed goblin\'s automatic Critical Hit', () => {
    const { state, ranger, goblin } = paralyzedBoard();
    const squares = [CLEAR_TEN_FOOT_SQUARE, HALF_TEN_FOOT_SQUARE, ADJACENT_SQUARE];
    expect(coverTiers(state, ranger.id, goblin.id, squares)).toEqual(['none', 'half', 'none']);
    const moves = squares.map((cell) => step(ranger.id, cell));
    // Canonical text order is B (2,2), C (3,0), A (3,1).
    expect(inCanonicalOrder(moves)).toBe(true);

    const decision = evaluateSymmetricPcDecision({
      state, actorId: ranger.id, legalActions: [dart(ranger.id, goblin.id), ...moves, { type: 'end_turn', actor: ranger.id }],
      attackForms: attackFormsOf(dart(ranger.id, goblin.id)),
    });

    const ranked = rankedMoves(decision);
    // Hit chance alone ties A and B, and the canonical text would then put B first.
    expect(ranked.map((move) => move.destination)).toEqual([ADJACENT_SQUARE, CLEAR_TEN_FOOT_SQUARE, HALF_TEN_FOOT_SQUARE]);
    expect(ranked).toEqual([
      { destination: ADJACENT_SQUARE, bucket: 3, damage: 6.38 },
      { destination: CLEAR_TEN_FOOT_SQUARE, bucket: 3, damage: 4.63 },
      { destination: HALF_TEN_FOOT_SQUARE, bucket: 3, damage: 4.08 },
    ]);
    // The in-range attack still outranks every move that keeps the range (bucket 2 before 3).
    expect(decision.selected.command.type).toBe('attack');
  });

  it('PCAC-TIEBREAK-TOTAL-COVER-LAST: a square whose shot has no resolved expected damage sorts after every square with one', () => {
    const { state, ranger, goblin } = wallCornerBoard(LENGTHENED_WALL_CELLS);
    const squares = [THREE_QUARTERS_SQUARE, HALF_SQUARE, CLEAR_SQUARE];
    expect(coverTiers(state, ranger.id, goblin.id, squares)).toEqual(['total', 'half', 'none']);

    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: ranger.id,
      legalActions: [dart(ranger.id, goblin.id), ...squares.map((cell) => step(ranger.id, cell)), { type: 'end_turn', actor: ranger.id }],
      attackForms: attackFormsOf(dart(ranger.id, goblin.id)),
    });

    const ranked = rankedMoves(decision);
    expect(ranked.map((move) => move.destination)).toEqual([CLEAR_SQUARE, HALF_SQUARE, THREE_QUARTERS_SQUARE]);
    expect(ranked).toEqual([
      { destination: CLEAR_SQUARE, bucket: 0, damage: 1.67 },
      { destination: HALF_SQUARE, bucket: 0, damage: 1.12 },
      { destination: THREE_QUARTERS_SQUARE, bucket: 0, damage: 'unresolved' },
    ]);
    expect(decision.selected.command).toEqual(step(ranger.id, CLEAR_SQUARE));
  });

  it('PCAC-TIEBREAK-NON-MOVE-PLACE: a non-move command in the same bucket keeps its canonical place before the moves', () => {
    const { state, ranger, goblin } = paralyzedBoard();
    const save: EncounterCommand = {
      type: 'force_save', actor: ranger.id, target: goblin.id, ability: 'dexterity', dc: 13, rollMode: 'normal',
      onSuccess: 'none', cost: 'action',
      damage: { terms: [{ type: damageType('Radiant'), dice: { count: 1, sides: dieSides(8), modifier: 0 } }], critical: false, responses: [] },
    };
    const moves = [ADJACENT_SQUARE, CLEAR_TEN_FOOT_SQUARE, HALF_TEN_FOOT_SQUARE].map((cell) => step(ranger.id, cell));

    const decision = evaluateSymmetricPcDecision({
      state, actorId: ranger.id, legalActions: [...moves, save, dart(ranger.id, goblin.id), { type: 'end_turn', actor: ranger.id }],
      attackForms: attackFormsOf(dart(ranger.id, goblin.id)),
    });

    // The save's canonical text ({"ability":...) sorts before every move's
    // ({"actor":...), and the ruling orders squares only, so the save stays
    // first in the bucket, as before the ruling.
    expect(moves.every((move) => inCanonicalOrder([save, move]))).toBe(true);
    expect(decision.assessments.filter((assessment) => assessment.rank[0] === 3)
      .map((assessment) => assessment.command.type)).toEqual(['force_save', 'move', 'move', 'move']);
  });
});

/*
 * PERF-02 pcac, third commit. Owner ruling 2026-09-24, the option as chosen:
 * "when no attack is legal, movement planning evaluates candidate squares with
 * the PC's own attack forms (best expected damage across its attacks, AC +
 * cover included), so approach squares with a clear shot win."
 *
 * Rules behind every number below (docs/srd/full/srd-5.2.1.txt), with the
 * Attack Roll, Cover and Critical Hit citations of the tie-break block above:
 * a d20 face f hits AC 15 on 10-20 (11/20), Half Cover AC 17 on 12-20 (9/20),
 * Three-Quarters AC 20 on 15-20 (6/20); a natural 20 (1/20) is the Critical
 * Hit, whose damage dice are rolled twice. Expected damage =
 * (hit - 1/20) x (normal hit) + 1/20 x (critical hit). Every target is the SRD
 * Goblin Warrior, AC 15 (:18985-18988). Weapons (:5490, :5508, :5529):
 * - Longbow, 1d8 Piercing, Range 150/600, at +5 for 1d8 + 3: a hit averages
 *   7.5 and a Critical Hit 12. Shortsword, 1d6 Piercing (melee, 5 ft).
 * - Glaive, 1d10 Slashing, Reach (:5442: +5 feet of reach, so 10 ft), at +5 for
 *   1d10 + 3: a hit averages 8.5 and a Critical Hit 14. Dagger, 1d4 Piercing
 *   (melee, 5 ft), at +5 for 1d4 + 3.
 * Every board below lists only moves and non-attacks: no attack is legal.
 *
 * RANGER BOARD (columns 0-6, rows 0-4): the goblin at (5,3), walls at (4,2)
 * and (4,3), the ranger at (3,2), which has already used its action to shoot.
 * Every square below is 10 feet from the goblin, inside the Longbow's normal
 * range, so each move keeps the range ("maintain range", one bucket), and the
 * Shortsword reaches none of them. Cover by the D576 corner rule:
 * - (4,1): from corner (5,2), the corner of the wall (4,2), the lines to (5,3)
 *   and (5,4) run down x = 5 along the walls' right edges and the lines to
 *   (6,3) and (6,4) pass right of them. No cover: ED = 10/20 x 7.5 + 1/20 x 12
 *   = 4.35.
 * - (3,1): its best corner (4,1) keeps one line clear, the one to (6,3)
 *   (y = x - 3 passes (4,1) and (5,2), neither a wall); its lines to (5,3),
 *   (5,4) and (6,4) cross the wall (4,2) or (4,3), and every other corner
 *   obstructs all four. Three-Quarters, AC 20: ED = 5/20 x 7.5 + 0.6 = 2.475.
 * - (2,2), (2,3), (3,3): from an upper corner such as (2,3) the lines to the
 *   goblin's top corners (5,3) and (6,3) run along y = 3, the edge between the
 *   two walls, and the lines to its bottom corners cross (4,3); from a lower
 *   corner it is the reverse. Two obstructed lines at best: Half, AC 17:
 *   ED = 8/20 x 7.5 + 0.6 = 3.6.
 * - (2,1): every line from every corner crosses a wall: Total Cover, so no
 *   expected damage.
 * The ranger's own square (3,2) is Half, and adding it as a creature source
 * changes no tier above (the D888 self-body geometry does not arise here).
 * Canonical text alone would take (2,1), the square with Total Cover.
 *
 * MELEE BOARD (columns 0-6, rows 0-4): the goblin at (5,2), a barrel granting
 * Half Cover at (4,1), the fighter at (2,1), 15 feet away, out of reach of both
 * the Dagger (5 ft) and the Glaive (10 ft). Its three squares in column 3 are
 * 10 feet from the goblin: the Glaive can reach from there after a 5-foot move
 * ("move within speed to enable attack", bucket 0); the Dagger still cannot
 * ("other reposition", bucket 6), and neither can reach from any other square.
 * - (3,1) and (3,2): from a bottom corner such as (4,2) no line enters the
 *   barrel's square (the lines to the goblin's top corners run along its lower
 *   edge, y = 2). No cover: ED = 10/20 x 8.5 + 1/20 x 14 = 4.95.
 * - (3,0): from every corner three or four lines cross the barrel's square,
 *   but a barrel is an object granting Half Cover, so the degree is Half,
 *   AC 17: ED = 8/20 x 8.5 + 0.7 = 4.1. The fighter's own square changes none
 *   of these tiers.
 * The Dagger is the first form in canonical text ("dagger" before "glaive"),
 * so planning with the first form alone ranks every square "other reposition"
 * and the canonical text would take (1,0), a step away from the goblin.
 *
 * TARGET BOARD (columns 0-5, rows 0-4): the fighter (Glaive only) at (1,2),
 * goblins a at (4,0) and b at (4,4), each 15 feet away. The square (2,1) is
 * within 10 feet of a only, (2,3) of b only, (2,2) of both. The target is the
 * one the canonical-first form command attacks: a (its id sorts first). So
 * (2,1) and (2,2) enable the Glaive against a, ED 4.95 each, and the canonical
 * text takes (2,1).
 */
const APPROACH_RANGER_GOBLIN_CELL = { column: 5, row: 3 } as const;
const APPROACH_RANGER_CELL = { column: 3, row: 2 } as const;
const APPROACH_WALL_CELLS: readonly GridCell[] = [{ column: 4, row: 2 }, { column: 4, row: 3 }];
const APPROACH_CLEAR_SQUARE = { column: 4, row: 1 } as const;
const APPROACH_THREE_QUARTERS_SQUARE = { column: 3, row: 1 } as const;
const APPROACH_TOTAL_SQUARE = { column: 2, row: 1 } as const;
const APPROACH_HALF_SQUARES: readonly GridCell[] = [
  { column: 2, row: 2 }, { column: 2, row: 3 }, { column: 3, row: 3 },
];

const MELEE_GOBLIN_CELL = { column: 5, row: 2 } as const;
const MELEE_FIGHTER_CELL = { column: 2, row: 1 } as const;
const MELEE_BARREL_CELL = { column: 4, row: 1 } as const;
const MELEE_HALF_SQUARE = { column: 3, row: 0 } as const;
const MELEE_CLEAR_SQUARES: readonly GridCell[] = [{ column: 3, row: 1 }, { column: 3, row: 2 }];
const MELEE_OUT_OF_REACH_SQUARES: readonly GridCell[] = [
  { column: 1, row: 0 }, { column: 1, row: 1 }, { column: 1, row: 2 }, { column: 2, row: 0 }, { column: 2, row: 2 },
];

type AttackCommand = StatedRangeAttackCommand;

function weaponForm(input: {
  readonly actor: CombatantId;
  readonly target: CombatantId;
  readonly attackId: string;
  readonly dieSides: 4 | 6 | 8 | 10;
  readonly range: AttackCommand['tacticalRange'];
}): AttackCommand {
  return {
    type: 'attack', actor: input.actor, target: input.target, attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true, tacticalRange: input.range, attackId: input.attackId,
    damage: {
      terms: [{ type: damageType('Piercing'), dice: { count: 1, sides: dieSides(input.dieSides), modifier: 3 } }],
      critical: false,
      responses: [],
    },
  };
}

const longbowForm = (actor: CombatantId, target: CombatantId) => weaponForm({
  actor, target, attackId: 'longbow', dieSides: 8,
  range: { kind: 'ranged', normalRangeFeet: feet(150), longRangeFeet: feet(600) },
});
const shortswordForm = (actor: CombatantId, target: CombatantId) => weaponForm({
  actor, target, attackId: 'shortsword', dieSides: 6, range: { kind: 'melee', reachFeet: feet(5) },
});
const glaiveForm = (actor: CombatantId, target: CombatantId) => weaponForm({
  actor, target, attackId: 'glaive', dieSides: 10, range: { kind: 'melee', reachFeet: feet(10) },
});
const daggerForm = (actor: CombatantId, target: CombatantId) => weaponForm({
  actor, target, attackId: 'dagger', dieSides: 4, range: { kind: 'melee', reachFeet: feet(5) },
});

/** A provider's forms for one PC: the given weapons against whichever target is asked for. */
function ownForms(
  pc: CombatantId,
  weapons: readonly ((actor: CombatantId, target: CombatantId) => AttackCommand)[],
): TurnAttackForms {
  return (_state, actor, target) => actor === pc ? weapons.map((weapon) => weapon(actor, target)) : [];
}

function goblin(key: string) {
  return monsterCombatantProfile(GOBLIN_WARRIOR, { combatantId: `combatant:${key}`, tokenId: `token:${key}` });
}

function approachBoard(input: {
  readonly columns: number;
  readonly rows: number;
  readonly pcKey: string;
  readonly pcCell: GridCell;
  readonly goblins: readonly { readonly key: string; readonly cell: GridCell }[];
  readonly blocking: readonly EncounterState['worldObjects'][number][];
  readonly actionSpent: boolean;
}) {
  const pc = playerProfile(input.pcKey);
  const monsters = input.goblins.map((entry) => ({ profile: goblin(entry.key), cell: entry.cell }));
  const created = createEncounter({
    bounds: { columns: input.columns, rows: input.rows },
    combatants: [pc, ...monsters.map((entry) => entry.profile)],
    tokens: [
      placedToken(pc, input.pcCell.column, input.pcCell.row),
      ...monsters.map((entry) => placedToken(entry.profile, entry.cell.column, entry.cell.row)),
    ],
    worldObjects: input.blocking,
  });
  const readied = ready(created, pc.id);
  const state = input.actionSpent
    ? {
        ...readied,
        combatants: readied.combatants.map((combatant) => combatant.profile.id === pc.id
          ? { ...combatant, turn: { ...combatant.turn, action: { kind: 'spent' as const } } }
          : combatant),
      }
    : readied;
  return { state, pc, goblins: monsters.map((entry) => entry.profile) };
}

/** Each ranked move: destination, bucket, expected damage (rounded to 1e-9), and the form that assessed it. */
function rankedApproach(decision: SymmetricPcDecision) {
  return decision.assessments.flatMap((assessment) => {
    if (assessment.command.type !== 'move') return [];
    const damage = assessment.rank[3];
    const movement = assessment.movement;
    return [{
      destination: assessment.command.path.at(-1),
      bucket: assessment.rank[0],
      damage: damage.kind === 'resolved' ? Math.round(damage.expectedDamage * 1e9) / 1e9 : damage.kind,
      form: movement?.status === 'evaluated'
        ? `${movement.profileSource}:${movement.attack.attackId ?? '?'}:${String(movement.attack.target)}`
        : movement?.reason ?? null,
    }];
  });
}

describe('PCAC approach: with no legal attack the scripted PC plans its moves with its own attack forms', () => {
  it('PCAC-APPROACH-RANGER-CLEAR-SHOT: after shooting, the ranger steps to the square with a clear Longbow shot, not the Three-Quarters or Total Cover one', () => {
    const { state, pc, goblins } = approachBoard({
      columns: 7, rows: 5, pcKey: 'pcac-approach-ranger', pcCell: APPROACH_RANGER_CELL,
      goblins: [{ key: 'pcac-approach-goblin', cell: APPROACH_RANGER_GOBLIN_CELL }],
      blocking: APPROACH_WALL_CELLS.map((cell) => blockingCell(`pcac-approach-wall-${String(cell.row)}`, cell, 'wall')),
      actionSpent: true,
    });
    const target = goblins[0];
    if (target === undefined) throw new Error('The ranger board has a goblin.');
    const squares = [APPROACH_TOTAL_SQUARE, APPROACH_THREE_QUARTERS_SQUARE, APPROACH_CLEAR_SQUARE, ...APPROACH_HALF_SQUARES];
    expect(coverTiers(state, pc.id, target.id, [APPROACH_RANGER_CELL, ...squares]))
      .toEqual(['half', 'total', 'three_quarters', 'none', 'half', 'half', 'half']);
    const moves = squares.map((cell) => step(pc.id, cell));
    // The canonical text alone takes the Total Cover square (2,1).
    expect(moves.slice(1).every((move) => inCanonicalOrder([moves[0]!, move]))).toBe(true);

    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: pc.id,
      legalActions: [...moves, { type: 'end_turn', actor: pc.id }],
      attackForms: ownForms(pc.id, [longbowForm, shortswordForm]),
    });

    const form = `own_attack_forms:longbow:${String(target.id)}`;
    expect(rankedApproach(decision)).toEqual([
      { destination: APPROACH_CLEAR_SQUARE, bucket: 3, damage: 4.35, form },
      { destination: APPROACH_HALF_SQUARES[0], bucket: 3, damage: 3.6, form },
      { destination: APPROACH_HALF_SQUARES[1], bucket: 3, damage: 3.6, form },
      { destination: APPROACH_HALF_SQUARES[2], bucket: 3, damage: 3.6, form },
      { destination: APPROACH_THREE_QUARTERS_SQUARE, bucket: 3, damage: 2.475, form },
      { destination: APPROACH_TOTAL_SQUARE, bucket: 3, damage: 'unresolved', form },
    ]);
    expect(decision.selected.command).toEqual(step(pc.id, APPROACH_CLEAR_SQUARE));
  });

  it('PCAC-APPROACH-MELEE-BEST-FORM: out of reach, the fighter steps to where its Glaive (not its canonical-first Dagger) gets a clear swing', () => {
    const { state, pc, goblins } = approachBoard({
      columns: 7, rows: 5, pcKey: 'pcac-approach-fighter', pcCell: MELEE_FIGHTER_CELL,
      goblins: [{ key: 'pcac-approach-goblin', cell: MELEE_GOBLIN_CELL }],
      blocking: [blockingCell('pcac-approach-barrel', MELEE_BARREL_CELL, 'half_cover')],
      actionSpent: false,
    });
    const target = goblins[0];
    if (target === undefined) throw new Error('The melee board has a goblin.');
    expect(coverTiers(state, pc.id, target.id, [MELEE_HALF_SQUARE, ...MELEE_CLEAR_SQUARES]))
      .toEqual(['half', 'none', 'none']);
    const squares = [...MELEE_OUT_OF_REACH_SQUARES, MELEE_HALF_SQUARE, ...MELEE_CLEAR_SQUARES];
    const moves = squares.map((cell) => step(pc.id, cell));
    expect(inCanonicalOrder(moves)).toBe(true);

    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: pc.id,
      legalActions: [...moves, { type: 'dash', actor: pc.id }, { type: 'end_turn', actor: pc.id }],
      attackForms: ownForms(pc.id, [glaiveForm, daggerForm]),
    });

    const glaive = `own_attack_forms:glaive:${String(target.id)}`;
    const dagger = `own_attack_forms:dagger:${String(target.id)}`;
    expect(rankedApproach(decision)).toEqual([
      { destination: MELEE_CLEAR_SQUARES[0], bucket: 0, damage: 4.95, form: glaive },
      { destination: MELEE_CLEAR_SQUARES[1], bucket: 0, damage: 4.95, form: glaive },
      { destination: MELEE_HALF_SQUARE, bucket: 0, damage: 4.1, form: glaive },
      // Neither form reaches from here, so the first form in canonical text assesses the square.
      ...MELEE_OUT_OF_REACH_SQUARES.map((destination) => ({ destination, bucket: 6, damage: 'unresolved', form: dagger })),
    ]);
    expect(decision.selected.command).toEqual(step(pc.id, MELEE_CLEAR_SQUARES[0]!));
  });

  /*
   * FORMS BY DAMAGE (owner ruling 2026-09-24: "best expected damage across its
   * attacks"). The fighter (Glaive: reach 10, +5, 1d10 + 3, hit 8.5, Critical
   * Hit 14; Dagger: reach 5, +5, 1d4 + 3, hit 5.5, Critical Hit 8) at (0,1),
   * its action spent, a goblin (AC 15) at (2,1), 10 feet away: the Glaive is
   * in reach, the Dagger is not. One d20 hits AC 15 on faces 10-20: 11/20,
   * critical 1/20; no square has cover.
   * - (1,0), (1,1), (1,2), 5 feet from the goblin: the Dagger becomes usable
   *   ("move within speed to enable attack", bucket 0), ED = 10/20 x 5.5 +
   *   1/20 x 8 = 3.15; the Glaive stays in reach ("maintain range", bucket 3),
   *   ED = 10/20 x 8.5 + 1/20 x 14 = 4.95. The Glaive's is the better expected
   *   damage, so it gives the square its value: bucket 3, 4.95. (Bucket first,
   *   the square would take the Dagger's bucket 0 and 3.15.)
   * - (0,0), (0,2), 10 feet away: the Dagger cannot reach (no resolved
   *   damage), the Glaive can: bucket 3, 4.95.
   */
  it('PCAC-FORMS-BY-DAMAGE: a square takes the form with the best expected damage there, the Glaive in reach (4.95) over the newly enabled Dagger (3.15)', () => {
    const { state, pc, goblins } = approachBoard({
      columns: 4, rows: 3, pcKey: 'pcac-forms-damage', pcCell: { column: 0, row: 1 },
      goblins: [{ key: 'pcac-forms-damage-goblin', cell: { column: 2, row: 1 } }],
      blocking: [],
      actionSpent: true,
    });
    const target = goblins[0];
    if (target === undefined) throw new Error('The forms board has a goblin.');
    const squares = [
      { column: 0, row: 0 }, { column: 0, row: 2 }, { column: 1, row: 0 }, { column: 1, row: 1 }, { column: 1, row: 2 },
    ];
    expect(coverTiers(state, pc.id, target.id, squares)).toEqual(['none', 'none', 'none', 'none', 'none']);

    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: pc.id,
      legalActions: [...squares.map((cell) => step(pc.id, cell)), { type: 'end_turn', actor: pc.id }],
      attackForms: ownForms(pc.id, [daggerForm, glaiveForm]),
    });

    const glaive = `own_attack_forms:glaive:${String(target.id)}`;
    const byDestination = Object.fromEntries(rankedApproach(decision).map((entry) => [
      `${String(entry.destination?.column)},${String(entry.destination?.row)}`,
      { bucket: entry.bucket, damage: entry.damage, form: entry.form },
    ]));
    const glaiveSquare = { bucket: 3, damage: 4.95, form: glaive };
    expect(byDestination).toEqual({
      '0,0': glaiveSquare, '0,2': glaiveSquare, '1,0': glaiveSquare, '1,1': glaiveSquare, '1,2': glaiveSquare,
    });
    // The Dagger alone assesses the adjacent squares at bucket 0, 3.15: the value bucket-first would have taken.
    const daggerOnly = evaluateSymmetricPcDecision({
      state,
      actorId: pc.id,
      legalActions: [...squares.map((cell) => step(pc.id, cell)), { type: 'end_turn', actor: pc.id }],
      attackForms: ownForms(pc.id, [daggerForm]),
    });
    expect(rankedApproach(daggerOnly).find((entry) => entry.destination?.column === 1 && entry.destination.row === 1))
      .toEqual({ destination: { column: 1, row: 1 }, bucket: 0, damage: 3.15, form: `own_attack_forms:dagger:${String(target.id)}` });
  });

  it('PCAC-APPROACH-TARGET-RULE: with two goblins perceived, the forms plan against the target of the canonical-first form command', () => {
    const { state, pc, goblins } = approachBoard({
      columns: 6, rows: 5, pcKey: 'pcac-approach-fighter', pcCell: { column: 1, row: 2 },
      goblins: [
        { key: 'pcac-approach-goblin-b', cell: { column: 4, row: 4 } },
        { key: 'pcac-approach-goblin-a', cell: { column: 4, row: 0 } },
      ],
      blocking: [],
      actionSpent: false,
    });
    const goblinA = goblins.find((entry) => String(entry.id).endsWith('-a'));
    const goblinB = goblins.find((entry) => String(entry.id).endsWith('-b'));
    if (goblinA === undefined || goblinB === undefined) throw new Error('The target board has two goblins.');
    const forms = ownForms(pc.id, [glaiveForm]);
    // Goblin a's command sorts first, whichever order the provider lists them in.
    expect(inCanonicalOrder([...forms(state, pc.id, goblinA.id), ...forms(state, pc.id, goblinB.id)])).toBe(true);
    const squares = [
      { column: 0, row: 1 }, { column: 0, row: 2 }, { column: 0, row: 3 }, { column: 1, row: 1 },
      { column: 1, row: 3 }, { column: 2, row: 1 }, { column: 2, row: 2 }, { column: 2, row: 3 },
    ];
    expect(coverTiers(state, pc.id, goblinA.id, [{ column: 2, row: 1 }, { column: 2, row: 2 }])).toEqual(['none', 'none']);

    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: pc.id,
      legalActions: [...squares.map((cell) => step(pc.id, cell)), { type: 'end_turn', actor: pc.id }],
      attackForms: forms,
    });

    const ranked = rankedApproach(decision);
    expect(new Set(ranked.map((entry) => entry.form))).toEqual(new Set([`own_attack_forms:glaive:${String(goblinA.id)}`]));
    expect(ranked.slice(0, 2)).toEqual([
      { destination: { column: 2, row: 1 }, bucket: 0, damage: 4.95, form: `own_attack_forms:glaive:${String(goblinA.id)}` },
      { destination: { column: 2, row: 2 }, bucket: 0, damage: 4.95, form: `own_attack_forms:glaive:${String(goblinA.id)}` },
    ]);
    // (2,3) reaches only goblin b, which is not the planned target.
    expect(ranked.find((entry) => entry.destination?.row === 3 && entry.destination.column === 2)?.bucket).toBe(6);
    expect(decision.selected.command).toEqual(step(pc.id, { column: 2, row: 1 }));
  });

  it('PCAC-APPROACH-FORMS-SINGLE-SOURCE: a provider\'s forms are exactly its attack commands against a target in range, and do not depend on range', () => {
    const member = {
      combatantId: 'combatant:pcac-forms-ranger', tokenId: 'token:pcac-forms-ranger', characterId: 20_001,
      classes: [{ classId: 'Paladin', level: 5 }],
      abilities: { strength: 12, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 12, charisma: 14 },
      armorClass: 16, hitPointMaximum: 40, sizeCategory: 'Medium', walkingSpeedFeet: 30, initiativeBonus: 3,
      savingThrowBonuses: { strength: 1, dexterity: 3, constitution: 2, intelligence: 0, wisdom: 3, charisma: 4 },
      attacksPerAction: 1,
      attacks: [
        { attackId: 'attack:pcac-shortsword', kind: 'melee', attackBonus: 6, criticalFloor: 20, reachFeet: 5, rangeFeet: 5,
          damage: [{ damageTypeId: 'Piercing', count: 1, sides: 6, modifier: 3 }] },
        { attackId: 'attack:pcac-longbow', kind: 'ranged', attackBonus: 6, criticalFloor: 20, reachFeet: 5, rangeFeet: 150,
          damage: [{ damageTypeId: 'Piercing', count: 1, sides: 8, modifier: 3 }] },
      ],
      spellcasting: {
        ability: 'charisma', spellSaveDc: 13, spellAttackBonus: 5, preparedSpellIds: [], knownSpellIds: [],
        spellSlots: [{ level: 1, count: 2, recharge: 'long_rest' }, { level: 2, count: 1, recharge: 'long_rest' }],
      },
      effects: [{
        effectId: 'effect:pcac-smite', kind: 'slot_spend_damage_rider', trigger: 'on_hit', spendGate: 'slot_spent',
        criticalGate: 'crit_confirmed', damageTypeId: 'Radiant', baseCount: 1, countPerSlotLevel: 1, sides: 8, modifier: 0,
      }],
      startingConditions: [],
    };
    // A pack holds three to five members; the other two only fill the party.
    const companion = (index: number) => ({
      ...member, combatantId: `combatant:pcac-forms-companion-${String(index)}`,
      tokenId: `token:pcac-forms-companion-${String(index)}`, characterId: 20_001 + index, effects: [],
      attacks: member.attacks.slice(0, 1),
    });
    const loaded = loadExternalPartyPack(externalPartyPackSchema.parse({
      schemaVersion: 2, partyId: 'party:pcac-forms', allowPartial: false, members: [member, companion(1), companion(2)],
    }));
    if (loaded.status !== 'loaded') throw new Error('The forms pack was refused.');
    const actor = loaded.party.members[0]!;
    const target = monsterProfile('pcac-forms-target', { initiativeBonus: -10 });
    const at = (column: number) => reduceEncounter(createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [actor.profile, target],
      tokens: [combatToken(actor.profile, { column: 0, row: 0 }), combatToken(target, { column, row: 0 })],
    }), { type: 'roll_initiative' }, () => 0.5).state;
    const legalAttacks = (state: EncounterState) => loadedPartyTurnLegalActions(loaded.party.members)(state, actor.profile.id)
      .actions.filter((command) => command.type === 'attack' && command.target === target.id);
    const forms = loadedPartyAttackForms(loaded.party.members);
    const adjacent = at(1);
    const far = at(2);

    // Adjacent, every form is in range: the forms ARE the legal attack commands,
    // smite variants included (none, 1st-level slot, 2nd-level slot, per weapon).
    expect(forms(adjacent, actor.profile.id, target.id)).toEqual(legalAttacks(adjacent));
    expect(forms(adjacent, actor.profile.id, target.id)).toHaveLength(6);
    // Ten feet away the Shortsword is out of reach: the legal set loses it, the forms do not.
    expect(legalAttacks(far).map((command) => command.type === 'attack' ? command.attackId : null))
      .toEqual(['attack:pcac-longbow', 'attack:pcac-longbow', 'attack:pcac-longbow']);
    expect(forms(far, actor.profile.id, target.id)).toEqual(legalAttacks(adjacent));

    // The regret provider's player-character form is its generic weapon attack.
    const pc = playerProfile('pcac-forms-regret-pc');
    const regretAt = (column: number) => ready(createEncounter({
      bounds: { columns: 6, rows: 1 }, combatants: [pc, target],
      tokens: [placedToken(pc, 0), placedToken(target, column)],
    }), pc.id);
    const regretLegal = regretTurnLegalActions(regretAt(1), pc.id).actions
      .filter((command) => command.type === 'attack' && command.target === target.id);
    expect(regretLegal).toHaveLength(1);
    expect(regretAttackForms(regretAt(1), pc.id, target.id)).toEqual(regretLegal);
    expect(regretTurnLegalActions(regretAt(3), pc.id).actions.some((command) => command.type === 'attack')).toBe(false);
    expect(regretAttackForms(regretAt(3), pc.id, target.id)).toEqual(regretLegal);
  });
});

/*
 * PERF-02 pcac, fourth commit. Owner rulings 2026-09-25:
 * - "Fix range inside pcac": PC attack commands carry their weapon's real
 *   range (normal and long, from the SRD weapon table), used by both the
 *   legal-attack path and the approach (forms) path; long range means
 *   Disadvantage and beyond long range is illegal.
 * - "Move + action in one turn": when the PC's best move only enables an
 *   attack, the turn plans the move and the follow-up action together; a
 *   legal save, spell or potion that needs no move keeps its place when the
 *   combined plan is not better.
 *
 * Rules behind every number below (docs/srd/full/srd-5.2.1.txt):
 * - Longbow (:5529): 1d8 Piercing, Ammunition (Range 150/600). Range property
 *   (:5434-5439, also :901-909): beyond the normal range the attack roll has
 *   Disadvantage; no attack beyond the long range. Distance counts squares,
 *   diagonals included, 5 feet each.
 * - Attack rolls (:446-453): a natural 20 always hits and is the Critical Hit,
 *   a natural 1 always misses. Advantage/Disadvantage (:494-499): the higher /
 *   lower of two d20s. Critical Hits (:997-1003): the damage dice twice.
 * - Paralyzed (:11952-11961): the creature automatically fails Strength and
 *   Dexterity saving throws; attack rolls against it have Advantage; a hit from
 *   within 5 feet is a Critical Hit.
 * - Goblin Warrior (:18985-18988): AC 15. The unit fixture monster
 *   (tests/unit/combat/fixtures.ts:27-38): AC 12, Dexterity save +0, 10 HP.
 *
 * LONGBOW RANGE. A ranger with a Longbow at +5 for 1d8 + 3 (a hit averages
 * 7.5, a Critical Hit 2 x 4.5 + 3 = 12) against a Goblin Warrior on one row.
 * One d20 hits AC 15 on faces 10-20: hit 11/20, critical 1/20.
 * - 80 feet (16 squares): normal range, no Disadvantage.
 *   ED = (11/20 - 1/20) x 7.5 + 1/20 x 12 = 3.75 + 0.6 = 4.35.
 * - 200 feet (40 squares): long range, Disadvantage: hit (11/20)^2 = 121/400,
 *   critical (1/20)^2 = 1/400. ED = 120/400 x 7.5 + 1/400 x 12 = 2.25 + 0.03
 *   = 2.28.
 * - 605 feet (121 squares): beyond the long range: no legal attack, and the
 *   reducer refuses the command.
 *
 * ATTACK BY DAMAGE. A fighter with a Battleaxe (:5506, 1d8 Slashing, no Reach)
 * at +7 for 1d8 + 4 (hit 8.5, Critical Hit 13) and a Longbow at +5 for
 * 1d8 + 2 (hit 6.5, Critical Hit 11), against a Goblin Warrior (AC 15).
 * - Adjacent, both are legal (the Longbow at normal range). Battleaxe: faces
 *   8-20 hit, 13/20: ED = 12/20 x 8.5 + 1/20 x 13 = 5.1 + 0.65 = 5.75.
 *   Longbow: a ranged attack roll within 5 feet of an enemy (this goblin) who
 *   can see the fighter and is not Incapacitated has Disadvantage (Ranged
 *   Attacks in Close Combat, :911-917). One d20 hits on faces 10-20, 11/20;
 *   with Disadvantage hit (11/20)^2 = 121/400, critical (1/20)^2 = 1/400:
 *   ED = 120/400 x 6.5 + 1/400 x 11 = 1.95 + 0.0275 = 1.9775. (Without the
 *   close-combat rule it would be 10/20 x 6.5 + 1/20 x 11 = 3.8.) Both are in
 *   bucket 2; the canonical text alone ("attackBonus":5 before 7) would take
 *   the Longbow.
 * - 30 feet away, only the Longbow is legal, no enemy is within 5 feet, and
 *   the shot (3.8) is taken over every move.
 *
 * RANGER FIRING SQUARE. The third commit's ranger board (walls (4,2) and
 * (4,3), goblin at (5,3), ranger at (3,2) after its action), now through the
 * production party-pack provider: the Longbow's stated 150/600 range keeps
 * every square 10 feet away in normal range ("maintain range"), so the clear
 * square (4,1) wins at 4.35 over Half (3.6), Three-Quarters (2.475) and Total
 * Cover. Planned at reach instead, the Longbow reaches none of them.
 *
 * COMBINED PLAN BOARD (3 columns, 1 row): the fixture monster at (0,0), the
 * regret PC (generic weapon attack +7, 1d8 + 4 Slashing, reach 5; generic
 * save DC 15 Dexterity, 2d8 Radiant, no damage on a success) at (2,0), 10
 * feet away, its action available. Its one move, to (1,0), enables the attack
 * ("move within speed to enable attack", bucket 0). One d20 hits AC 12 on
 * faces 5-20: 16/20. A hit averages 4.5 + 4 = 8.5, a Critical Hit 9 + 4 = 13.
 * - Not Paralyzed: the plan is worth 1 attack x ((16 - 1)/20 x 8.5 + 1/20 x
 *   13) = 6.375 + 0.65 = 7.025. The save's worth needs the monster's
 *   Dexterity save bonus, which the PC does not know (it knows AC only), so
 *   the plan is not shown better: the save keeps its place (as in the arena's
 *   brutal room-4 fixture, this same board).
 * - Paralyzed: Advantage, hit 1 - (4/20)^2 = 384/400 = 0.96, and every hit
 *   from (1,0) is a Critical Hit: the plan is worth 0.96 x 13 = 12.48. The
 *   monster fails the Dexterity save automatically, so the 2d8 save is worth
 *   its average, 9: the plan beats it. A 4d8 save is worth 18: it keeps its
 *   place ahead of the plan.
 */
const LONGBOW_ID = 'attack:pcac-range-longbow';
const SHORTSWORD_ID = 'attack:pcac-range-shortsword';

/** A three-member pack whose first member is a ranger with a Longbow (150/600) and a Shortsword, both +5 for 1dX + 3. */
function rangerPack(key: string) {
  const longbow = {
    attackId: LONGBOW_ID, kind: 'ranged', attackBonus: 5, criticalFloor: 20, reachFeet: 5, rangeFeet: 150,
    longRangeFeet: 600, damage: [{ damageTypeId: 'Piercing', count: 1, sides: 8, modifier: 3 }],
  };
  const shortsword = {
    attackId: SHORTSWORD_ID, kind: 'melee', attackBonus: 5, criticalFloor: 20, reachFeet: 5, rangeFeet: 5,
    damage: [{ damageTypeId: 'Piercing', count: 1, sides: 6, modifier: 3 }],
  };
  const member = (index: number, attacks: readonly Record<string, unknown>[]) => ({
    combatantId: `combatant:${key}-${String(index)}`, tokenId: `token:${key}-${String(index)}`,
    characterId: 30_000 + index, classes: [{ classId: 'Ranger', level: 4 }],
    abilities: { strength: 12, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 14, charisma: 8 },
    armorClass: 15, hitPointMaximum: 36, sizeCategory: 'Medium', walkingSpeedFeet: 30, initiativeBonus: 3,
    savingThrowBonuses: { strength: 3, dexterity: 5, constitution: 2, intelligence: 0, wisdom: 2, charisma: -1 },
    attacksPerAction: 1, attacks, startingConditions: [],
  });
  const loaded = loadExternalPartyPack(externalPartyPackSchema.parse({
    schemaVersion: 2, partyId: `party:${key}`, allowPartial: false,
    members: [member(1, [longbow, shortsword]), member(2, [shortsword]), member(3, [shortsword])],
  }));
  if (loaded.status !== 'loaded') throw new Error('The ranger pack was refused.');
  return loaded.party.members;
}

/** A three-member pack whose first member is a fighter with a Battleaxe (+7, 1d8 + 4) and a Longbow (+5, 1d8 + 2, 150/600). */
function fighterPack(key: string) {
  const battleaxe = {
    attackId: 'attack:pcac-battleaxe', kind: 'melee', attackBonus: 7, criticalFloor: 20, reachFeet: 5, rangeFeet: 5,
    damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 4 }],
  };
  const longbow = {
    attackId: 'attack:pcac-longbow', kind: 'ranged', attackBonus: 5, criticalFloor: 20, reachFeet: 5, rangeFeet: 150,
    longRangeFeet: 600, damage: [{ damageTypeId: 'Piercing', count: 1, sides: 8, modifier: 2 }],
  };
  const member = (index: number, attacks: readonly Record<string, unknown>[]) => ({
    combatantId: `combatant:${key}-${String(index)}`, tokenId: `token:${key}-${String(index)}`,
    characterId: 31_000 + index, classes: [{ classId: 'Fighter', level: 4 }],
    abilities: { strength: 18, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    armorClass: 18, hitPointMaximum: 40, sizeCategory: 'Medium', walkingSpeedFeet: 30, initiativeBonus: 2,
    savingThrowBonuses: { strength: 6, dexterity: 2, constitution: 4, intelligence: 0, wisdom: 1, charisma: -1 },
    attacksPerAction: 1, attacks, startingConditions: [],
  });
  const loaded = loadExternalPartyPack(externalPartyPackSchema.parse({
    schemaVersion: 2, partyId: `party:${key}`, allowPartial: false,
    members: [member(1, [battleaxe, longbow]), member(2, [battleaxe]), member(3, [battleaxe])],
  }));
  if (loaded.status !== 'loaded') throw new Error('The fighter pack was refused.');
  return loaded.party.members;
}

function assessmentOf(decision: SymmetricPcDecision, predicate: (command: EncounterCommand) => boolean) {
  const found = decision.assessments.find((assessment) => predicate(assessment.command));
  if (found === undefined) throw new Error('Expected an assessment for the command.');
  return found;
}

function rounded(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

describe('PCAC range: PC attack commands carry their weapon\'s real range', () => {
  it('PCAC-RANGE-LONGBOW-BANDS: the Longbow is a normal-range shot at 80 feet, a Disadvantage shot at 200 feet, and no shot at 605 feet', () => {
    const members = rangerPack('pcac-range');
    const ranger = members[0]!;
    const goblinProfile = goblin('pcac-range-goblin');
    const at = (column: number) => reduceEncounter(createEncounter({
      bounds: { columns: 122, rows: 1 },
      combatants: [ranger.profile, goblinProfile],
      tokens: [combatToken(ranger.profile, { column: 0, row: 0 }), combatToken(goblinProfile, { column, row: 0 })],
    }), { type: 'roll_initiative' }, () => 0.5).state;
    const legal = loadedPartyTurnLegalActions(members);
    const forms = loadedPartyAttackForms(members);
    const longbows = (state: EncounterState) => legal(state, ranger.profile.id).actions
      .filter((command) => command.type === 'attack' && command.attackId === LONGBOW_ID);
    const near = at(16);
    const far = at(40);
    const beyond = at(121);
    expect([near, far, beyond].map((state) => state.activeCombatant)).toEqual([ranger.profile.id, ranger.profile.id, ranger.profile.id]);
    const longbowForm = forms(near, ranger.profile.id, goblinProfile.id).find((command) => command.attackId === LONGBOW_ID);
    if (longbowForm === undefined) throw new Error('The ranger has a Longbow form.');

    // The command states the SRD range; the legal set lists it to the long range and no further.
    expect(longbowForm.tacticalRange).toEqual({ kind: 'ranged', normalRangeFeet: 150, longRangeFeet: 600 });
    expect(longbows(near)).toEqual([longbowForm]);
    expect(longbows(far)).toEqual([longbowForm]);
    expect(longbows(beyond)).toEqual([]);

    const decide = (state: EncounterState) => evaluateSymmetricPcDecision({
      state, actorId: ranger.profile.id, legalActions: legal(state, ranger.profile.id).actions, attackForms: forms,
    });
    const shot = (state: EncounterState) => {
      const decision = decide(state);
      const tactical = assessmentOf(decision, (command) => command.type === 'attack' && command.attackId === LONGBOW_ID).tactical;
      const move = assessmentOf(decision, (command) => command.type === 'move').movement;
      if (tactical?.status !== 'evaluated' || move?.status !== 'evaluated') throw new Error('Expected evaluated assessments.');
      const before = move.evaluation.candidates[0]?.before;
      if (before?.status !== 'resolved' || before.evaluation.damage.status !== 'resolved' ||
        before.evaluation.probabilities.status !== 'resolved') {
        throw new Error('Expected a resolved planning verdict from the ranger\'s square.');
      }
      return {
        range: tactical.evaluation.range,
        rollMode: tactical.evaluation.rollMode.mode,
        profile: `${move.profileSource}:${move.attack.attackId ?? '?'}`,
        hit: rounded(before.evaluation.probabilities.hit),
        critical: rounded(before.evaluation.probabilities.critical),
        expectedDamage: rounded(before.evaluation.damage.expectedDamage),
      };
    };
    expect(shot(near)).toEqual({
      range: { status: 'resolved', distanceFeet: 80, band: 'normal', legal: true },
      rollMode: 'normal', profile: `legal_attack:${LONGBOW_ID}`, hit: 0.55, critical: 0.05, expectedDamage: 4.35,
    });
    expect(shot(far)).toEqual({
      range: { status: 'resolved', distanceFeet: 200, band: 'long', legal: true },
      rollMode: 'disadvantage', profile: `legal_attack:${LONGBOW_ID}`, hit: 0.3025, critical: 0.0025, expectedDamage: 2.28,
    });

    // The reducer applies the same range: one d20 at 80 feet, the lower of two at 200 feet, a refusal at 605 feet.
    const rolled = (state: EncounterState) => reduceEncounter(state, longbowForm, () => 0.5).events.flatMap((event) =>
      event.type === 'attack_resolved' ? [{ mode: event.attack.roll.mode, dice: event.attack.roll.faces.length }] : []);
    expect(rolled(near)).toEqual([{ mode: 'normal', dice: 1 }]);
    expect(rolled(far)).toEqual([{ mode: 'disadvantage', dice: 2 }]);
    expect(() => reduceEncounter(beyond, longbowForm, () => 0.5)).toThrow('The target is out of attack range.');
  });

  it('PCAC-RANGE-ATTACK-BY-DAMAGE: adjacent, the fighter takes his Battleaxe (5.75) over his close-combat Longbow (1.9775); 30 feet away, the Longbow (3.8)', () => {
    const members = fighterPack('pcac-damage');
    const fighter = members[0]!;
    const goblinProfile = goblin('pcac-damage-goblin');
    const at = (column: number) => ready(createEncounter({
      bounds: { columns: 8, rows: 1 },
      combatants: [fighter.profile, goblinProfile],
      tokens: [combatToken(fighter.profile, { column: 0, row: 0 }), combatToken(goblinProfile, { column, row: 0 })],
    }), fighter.profile.id);
    const decide = (state: EncounterState) => evaluateSymmetricPcDecision({
      state, actorId: fighter.profile.id,
      legalActions: loadedPartyTurnLegalActions(members)(state, fighter.profile.id).actions,
      attackForms: loadedPartyAttackForms(members),
    });
    const attacks = (decision: SymmetricPcDecision) => decision.assessments.flatMap((assessment) => {
      if (assessment.command.type !== 'attack') return [];
      const damage = assessment.rank[3];
      return [{
        attackId: assessment.command.attackId,
        bucket: assessment.rank[0],
        damage: damage.kind === 'resolved' ? rounded(damage.expectedDamage) : damage.kind,
      }];
    });

    const adjacent = decide(at(1));
    expect(attacks(adjacent)).toEqual([
      { attackId: 'attack:pcac-battleaxe', bucket: 2, damage: 5.75 },
      { attackId: 'attack:pcac-longbow', bucket: 2, damage: 1.9775 },
    ]);
    // Canonical text alone would take the Longbow.
    expect(adjacent.assessments.filter((assessment) => assessment.command.type === 'attack')
      .map((assessment) => assessment.commandKey).sort((left, right) => left.localeCompare(right))[0])
      .toContain('"attackId":"attack:pcac-longbow"');
    expect(adjacent.selected.command).toMatchObject({ type: 'attack', attackId: 'attack:pcac-battleaxe' });

    const ranged = decide(at(6));
    expect(attacks(ranged)).toEqual([{ attackId: 'attack:pcac-longbow', bucket: 2, damage: 3.8 }]);
    expect(ranged.selected.command).toMatchObject({ type: 'attack', attackId: 'attack:pcac-longbow' });
  });

  /*
   * CC-PC-NON-TARGET. The ranger (Longbow +5, 1d8 + 3: hit 7.5, Critical Hit
   * 12; Shortsword +5, 1d6 + 3: hit 6.5, Critical Hit 10) at (0,0), goblin A
   * (AC 15) next to it at (1,0), goblin B at (6,2), 30 feet away and clear of
   * A (the trace from the ranger's corner (0,1) passes below A's square). One
   * d20 hits AC 15 on faces 10-20: 11/20, critical 1/20.
   * - A sees the ranger and is alert, so every Longbow shot, B's included, is
   *   a ranged attack roll within 5 feet of an enemy: Disadvantage (:911-917),
   *   hit 121/400, critical 1/400, ED = 120/400 x 7.5 + 1/400 x 12 = 2.28.
   *   The Shortsword on A is a melee attack: 10/20 x 6.5 + 1/20 x 10 = 3.75.
   * - A Paralyzed (a condition that includes Incapacitated, perceived by the
   *   ranger): B's Longbow is straight, 10/20 x 7.5 + 1/20 x 12 = 4.35.
   * - A Blinded: A cannot see the ranger, and the ranger's knowledge says only
   *   that A's sight of it is unknown: B's Longbow has no planned number.
   */
  it('CC-PC-NON-TARGET: the ranger\'s Longbow shot at a goblin 30 feet away is planned with Disadvantage while another goblin stands next to him (2.28, not 4.35)', () => {
    const members = rangerPack('cc-pc');
    const ranger = members[0]!;
    const near = goblin('cc-pc-near');
    const far = goblin('cc-pc-far');
    const board = (condition: 'Paralyzed' | 'Blinded' | null) => {
      const created = createEncounter({
        bounds: { columns: 8, rows: 3 },
        combatants: [ranger.profile, near, far],
        tokens: [
          combatToken(ranger.profile, { column: 0, row: 0 }),
          combatToken(near, { column: 1, row: 0 }),
          combatToken(far, { column: 6, row: 2 }),
        ],
      });
      return ready({
        ...created,
        effects: condition === null ? [] : [{
          id: encounterEffectId(`effect:cc-pc-${condition}`),
          source: ranger.profile.id,
          targets: [near.id],
          createdRevision: 0,
          duration: { kind: 'permanent' },
          concentrationOwner: null,
          stackingIdentity: effectStackingIdentity(`cc-pc-${condition}`),
          stacking: 'replace_same_source',
          repeatedSave: null,
          payload: { kind: 'condition', condition },
        }],
      }, ranger.profile.id);
    };
    const planned = (state: EncounterState) => {
      const decision = evaluateSymmetricPcDecision({
        state, actorId: ranger.profile.id,
        legalActions: loadedPartyTurnLegalActions(members)(state, ranger.profile.id).actions,
        attackForms: loadedPartyAttackForms(members),
      });
      return Object.fromEntries(decision.assessments.flatMap((assessment) => {
        if (assessment.command.type !== 'attack') return [];
        const damage = assessment.rank[3];
        const tactical = assessment.tactical;
        return [[
          `${assessment.command.attackId === LONGBOW_ID ? 'longbow' : 'shortsword'}@${assessment.command.target === near.id ? 'A' : 'B'}`,
          {
            damage: damage.kind === 'resolved' ? rounded(damage.expectedDamage) : damage.kind,
            closeCombat: tactical?.status === 'evaluated'
              ? tactical.evaluation.rollMode.reasons.includes('ranged_close_combat_disadvantage')
              : tactical?.reason ?? null,
          },
        ]];
      }));
    };

    expect(planned(board(null))).toEqual({
      'longbow@A': { damage: 2.28, closeCombat: true },
      'longbow@B': { damage: 2.28, closeCombat: true },
      'shortsword@A': { damage: 3.75, closeCombat: false },
    });
    expect(planned(board('Paralyzed'))['longbow@B']).toEqual({ damage: 4.35, closeCombat: false });
    expect(planned(board('Blinded'))['longbow@B']).toEqual({ damage: 'unresolved', closeCombat: false });
  });

  it('PCAC-RANGE-RANGER-FIRING-SQUARE: through the party-pack provider, the ranger steps to the clear firing square within the Longbow\'s normal range', () => {
    const members = rangerPack('pcac-firing');
    const ranger = members[0]!;
    const goblinProfile = goblin('pcac-firing-goblin');
    const created = createEncounter({
      bounds: { columns: 7, rows: 5 },
      combatants: [ranger.profile, goblinProfile],
      tokens: [
        combatToken(ranger.profile, APPROACH_RANGER_CELL),
        combatToken(goblinProfile, APPROACH_RANGER_GOBLIN_CELL),
      ],
      worldObjects: APPROACH_WALL_CELLS.map((cell) => blockingCell(`pcac-firing-wall-${String(cell.row)}`, cell, 'wall')),
    });
    const readied = ready(created, ranger.profile.id);
    // After shooting: the action is spent, movement remains.
    const state = {
      ...readied,
      combatants: readied.combatants.map((combatant) => combatant.profile.id === ranger.profile.id
        ? { ...combatant, turn: { ...combatant.turn, action: { kind: 'spent' as const } } }
        : combatant),
    };
    const legalActions = loadedPartyTurnLegalActions(members)(state, ranger.profile.id).actions;
    expect(legalActions.some((command) => command.type === 'attack')).toBe(false);

    const decision = evaluateSymmetricPcDecision({
      state, actorId: ranger.profile.id, legalActions, attackForms: loadedPartyAttackForms(members),
    });

    const form = `own_attack_forms:${LONGBOW_ID}:${String(goblinProfile.id)}`;
    expect(rankedApproach(decision)).toEqual([
      { destination: APPROACH_CLEAR_SQUARE, bucket: 3, damage: 4.35, form },
      { destination: APPROACH_HALF_SQUARES[0], bucket: 3, damage: 3.6, form },
      { destination: APPROACH_HALF_SQUARES[1], bucket: 3, damage: 3.6, form },
      { destination: APPROACH_HALF_SQUARES[2], bucket: 3, damage: 3.6, form },
      { destination: APPROACH_THREE_QUARTERS_SQUARE, bucket: 3, damage: 2.475, form },
      { destination: APPROACH_TOTAL_SQUARE, bucket: 3, damage: 'unresolved', form },
    ]);
    expect(decision.selected.command).toEqual(step(ranger.profile.id, APPROACH_CLEAR_SQUARE));
    // The action is spent, so the step enables no attack this turn: no combined plan.
    expect(decision.selected.combinedPlan).toBeNull();
  });
});

function stepBoard(input: { readonly key: string; readonly paralyzed: boolean }) {
  const pc = playerProfile(`${input.key}-pc`);
  const monster = monsterProfile(`${input.key}-monster`);
  const created = createEncounter({
    bounds: { columns: 3, rows: 1 },
    combatants: [monster, pc],
    tokens: [placedToken(monster, 0), placedToken(pc, 2)],
  });
  const state = ready({
    ...created,
    effects: input.paralyzed
      ? [{
          id: encounterEffectId(`effect:${input.key}-paralyzed`),
          source: pc.id,
          targets: [monster.id],
          createdRevision: 0,
          duration: { kind: 'permanent' },
          concentrationOwner: null,
          stackingIdentity: effectStackingIdentity(`${input.key}-paralyzed`),
          stacking: 'replace_same_source',
          repeatedSave: null,
          payload: { kind: 'condition', condition: 'Paralyzed' },
        }]
      : [],
  }, pc.id);
  return { state, pc, monster };
}

/** Each ranked command: type, bucket and bucket tail, and the value that decides between a combined plan and its alternatives. */
function rankedTurn(decision: SymmetricPcDecision) {
  const value = (assessment: SymmetricPcCommandAssessment) => {
    const worth = assessment.combinedPlan?.value ?? assessment.alternativeValue;
    if (worth === null) return null;
    return worth.kind === 'resolved' ? rounded(worth.expectedDamage) : worth.reason;
  };
  return decision.assessments.map((assessment) => ({
    type: assessment.command.type,
    bucket: assessment.rank[0],
    tail: assessment.rank[1],
    value: value(assessment),
  }));
}

describe('PCAC turn: the approach move and the attack it enables are planned as one turn', () => {
  it('PCAC-TURN-PLAN-BEATS-WORSE-SAVE: stepping in and attacking a Paralyzed monster (12.48) beats the Dexterity save it fails automatically (9)', () => {
    const { state, pc, monster } = stepBoard({ key: 'pcac-turn-beats', paralyzed: true });

    const decision = evaluateSymmetricPcDecision({
      state, actorId: pc.id, legalActions: regretTurnLegalActions(state, pc.id).actions, attackForms: regretAttackForms,
    });

    expect(rankedTurn(decision)).toEqual([
      { type: 'move', bucket: 0, tail: 0, value: 12.48 },
      { type: 'force_save', bucket: 3, tail: 0, value: 9 },
      { type: 'disengage', bucket: 7, tail: 0, value: null },
      { type: 'dodge', bucket: 7, tail: 0, value: null },
      { type: 'dash', bucket: 8, tail: 0, value: null },
      { type: 'end_turn', bucket: 9, tail: 0, value: null },
    ]);
    const [attack] = regretAttackForms(state, pc.id, monster.id);
    expect(decision.selected.combinedPlan).toEqual({ followUp: attack, attacks: 1, value: { kind: 'resolved', expectedDamage: expect.closeTo(12.48, 12) }, yieldsTo: [] });
    expect(symmetricPcTurnPlan(decision.selected)).toEqual({
      kind: 'move_then_attack', move: step(pc.id, { column: 1, row: 0 }), attack, attacks: 1,
    });
  });

  it('PCAC-TURN-SAVE-KEPT-WHEN-BETTER: a 4d8 save the Paralyzed monster fails automatically (18) keeps its place ahead of the combined plan (12.48)', () => {
    const { state, pc } = stepBoard({ key: 'pcac-turn-kept', paralyzed: true });
    const strongerSave = (command: EncounterCommand): EncounterCommand => command.type === 'force_save'
      ? { ...command, damage: { ...command.damage, terms: [{ type: damageType('Radiant'), dice: { count: 4, sides: dieSides(8), modifier: 0 } }] } }
      : command;
    const legalActions = regretTurnLegalActions(state, pc.id).actions.map(strongerSave);

    const decision = evaluateSymmetricPcDecision({ state, actorId: pc.id, legalActions, attackForms: regretAttackForms });

    expect(rankedTurn(decision)).toEqual([
      { type: 'force_save', bucket: 3, tail: 0, value: 18 },
      { type: 'move', bucket: 3, tail: 1, value: 12.48 },
      { type: 'disengage', bucket: 7, tail: 0, value: null },
      { type: 'dodge', bucket: 7, tail: 0, value: null },
      { type: 'dash', bucket: 8, tail: 0, value: null },
      { type: 'end_turn', bucket: 9, tail: 0, value: null },
    ]);
    const save = legalActions.find((command) => command.type === 'force_save');
    expect(decision.selected.command).toEqual(save);
    expect(assessmentOf(decision, (command) => command.type === 'move').combinedPlan?.yieldsTo).toEqual([canonicalJson(save)]);
  });

  it('PCAC-TURN-UNKNOWN-KEPT: a save whose failure chance the PC cannot know keeps its place ahead of the combined plan (7.025); a potion is no alternative and holds no plan back', () => {
    const { state, pc } = stepBoard({ key: 'pcac-turn-unknown', paralyzed: false });
    const potion: EncounterCommand = {
      type: 'drink_healing_potion', actor: pc.id, effectId: encounterEffectId('effect:pcac-turn-potion'),
    };
    const regret = regretTurnLegalActions(state, pc.id).actions;
    const save = regret.find((command) => command.type === 'force_save');
    if (save === undefined) throw new Error('The regret PC has a generic save.');

    const withoutPotion = evaluateSymmetricPcDecision({ state, actorId: pc.id, legalActions: regret, attackForms: regretAttackForms });
    const withPotion = evaluateSymmetricPcDecision({ state, actorId: pc.id, legalActions: [...regret, potion], attackForms: regretAttackForms });
    const potionOnly = evaluateSymmetricPcDecision({
      state, actorId: pc.id, legalActions: [...regret.filter((command) => command !== save), potion], attackForms: regretAttackForms,
    });

    // The arena's brutal room-4 decision: the save keeps its place, as it did before the approach planning.
    expect(withoutPotion.selected.command.type).toBe('force_save');
    // The potion keeps its own bucket (1); only the save holds the plan back.
    expect(rankedTurn(withPotion)).toEqual([
      { type: 'drink_healing_potion', bucket: 1, tail: 0, value: null },
      { type: 'force_save', bucket: 3, tail: 0, value: 'target_save_bonus_not_known' },
      { type: 'move', bucket: 3, tail: 1, value: 7.025 },
      { type: 'disengage', bucket: 7, tail: 0, value: null },
      { type: 'dodge', bucket: 7, tail: 0, value: null },
      { type: 'dash', bucket: 8, tail: 0, value: null },
      { type: 'end_turn', bucket: 9, tail: 0, value: null },
    ]);
    expect(assessmentOf(withPotion, (command) => command.type === 'move').combinedPlan?.yieldsTo)
      .toEqual([canonicalJson(save)]);
    // With a potion and no save or spell, the plan keeps bucket 0 and the turn is the move and its attack.
    expect(rankedTurn(potionOnly)).toEqual([
      { type: 'move', bucket: 0, tail: 0, value: 7.025 },
      { type: 'drink_healing_potion', bucket: 1, tail: 0, value: null },
      { type: 'disengage', bucket: 7, tail: 0, value: null },
      { type: 'dodge', bucket: 7, tail: 0, value: null },
      { type: 'dash', bucket: 8, tail: 0, value: null },
      { type: 'end_turn', bucket: 9, tail: 0, value: null },
    ]);
    expect(potionOnly.selected.combinedPlan?.yieldsTo).toEqual([]);
    expect(symmetricPcTurnPlan(potionOnly.selected).kind).toBe('move_then_attack');
  });

  /*
   * BETTER WEAPON (owner Q2 follow-up, 2026-09-25, supervisor's choice: compare
   * "approach and use a better weapon" against the currently legal attack on
   * the same expected-damage basis). One row: the PC at (0,0), a Goblin
   * Warrior (AC 15) at (2,0), 10 feet away; the party-pack provider offers
   * one-square steps, so the step to (1,0) is the approach. One d20 hits AC 15
   * on faces 10-20 (+5): 11/20, critical 1/20; faces 8-20 (+7): 13/20.
   * - The fighter (fighterPack, one attack per action): the Longbow is legal
   *   now, at normal range with no enemy within 5 feet: 10/20 x 6.5 + 1/20 x
   *   11 = 3.8. At (1,0) the Battleaxe comes into reach: 12/20 x 8.5 + 1/20 x
   *   13 = 5.75. The plan, 1 x 5.75, beats the Longbow's 1 x 3.8: the fighter
   *   steps in and swings.
   * - The ranger (rangerPack): the Longbow now, 10/20 x 7.5 + 1/20 x 12 = 4.35.
   *   At (1,0) the Shortsword comes into reach, 10/20 x 6.5 + 1/20 x 10 = 3.75.
   *   The plan, 3.75, does not beat 4.35: the move yields to the Longbow
   *   (bucket 2, after it), and the ranger shoots.
   * - The Longbow at (1,0) has no planned number for either PC: the goblin is
   *   within 5 feet there, and its sight of the PC on a square the PC does not
   *   stand on is unknown to the plan (CC-PC-DESTINATION-SIGHT), so the shot is
   *   close_combat_unresolved and the square takes its melee form. Were that
   *   unknown sight read as clear, the ranger's Longbow at (1,0) would be 4.35,
   *   above the Shortsword's 3.75, and would become the move's follow-up.
   */
  it('PCAC-TURN-BETTER-WEAPON: the fighter steps in to swing his Battleaxe (5.75) rather than shoot his Longbow now (3.8); the ranger keeps shooting (4.35 over a 3.75 Shortsword)', () => {
    const decide = (members: ReturnType<typeof fighterPack>, key: string) => {
      const pc = members[0]!;
      const goblinProfile = goblin(`${key}-goblin`);
      const state = ready(createEncounter({
        bounds: { columns: 3, rows: 1 },
        combatants: [pc.profile, goblinProfile],
        tokens: [combatToken(pc.profile, { column: 0, row: 0 }), combatToken(goblinProfile, { column: 2, row: 0 })],
      }), pc.profile.id);
      const decision = evaluateSymmetricPcDecision({
        state, actorId: pc.profile.id,
        legalActions: loadedPartyTurnLegalActions(members)(state, pc.profile.id).actions,
        attackForms: loadedPartyAttackForms(members),
      });
      const value = (worth: SymmetricPcCommandAssessment['alternativeValue']) =>
        worth === null ? null : worth.kind === 'resolved' ? rounded(worth.expectedDamage) : worth.reason;
      const ranked = decision.assessments.flatMap((assessment) => {
        if (assessment.command.type === 'attack') {
          return [{ type: 'attack', weapon: assessment.command.attackId ?? null, bucket: assessment.rank[0], tail: assessment.rank[1], value: value(assessment.alternativeValue) }];
        }
        if (assessment.command.type === 'move') {
          return [{ type: 'move', weapon: assessment.combinedPlan?.followUp.attackId ?? null, bucket: assessment.rank[0], tail: assessment.rank[1], value: value(assessment.combinedPlan?.value ?? null) }];
        }
        return [];
      });
      return { decision, ranked };
    };

    const fighter = decide(fighterPack('pcac-better'), 'pcac-better');
    expect(fighter.ranked).toEqual([
      { type: 'move', weapon: 'attack:pcac-battleaxe', bucket: 0, tail: 0, value: 5.75 },
      { type: 'attack', weapon: 'attack:pcac-longbow', bucket: 2, tail: 0, value: 3.8 },
    ]);
    expect(fighter.decision.selected.combinedPlan?.yieldsTo).toEqual([]);
    const fighterPlan = symmetricPcTurnPlan(fighter.decision.selected);
    expect(fighterPlan.kind).toBe('move_then_attack');
    if (fighterPlan.kind !== 'move_then_attack') throw new Error('Expected the combined plan.');
    expect([fighterPlan.move.path, fighterPlan.attack.attackId, fighterPlan.attacks])
      .toEqual([[{ column: 1, row: 0 }], 'attack:pcac-battleaxe', 1]);

    const ranger = decide(rangerPack('pcac-better-ranger'), 'pcac-better-ranger');
    expect(ranger.ranked).toEqual([
      { type: 'attack', weapon: LONGBOW_ID, bucket: 2, tail: 0, value: 4.35 },
      { type: 'move', weapon: SHORTSWORD_ID, bucket: 2, tail: 1, value: 3.75 },
    ]);
    const shot = ranger.decision.assessments.find((assessment) => assessment.command.type === 'attack');
    expect(ranger.decision.selected.command).toEqual(shot?.command);
    expect(ranger.decision.assessments.find((assessment) => assessment.command.type === 'move')?.combinedPlan?.yieldsTo)
      .toEqual([shot?.commandKey]);
  });
});
