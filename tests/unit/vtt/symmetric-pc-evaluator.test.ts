import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { combatToken, monsterCombatantProfile } from '../../../src/combat/combatant';
import { traceCombatantLine } from '../../../src/combat/cover';
import type { TurnAttackForms } from '../../../src/combat/coordinator';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
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
  range: Extract<EncounterCommand, { readonly type: 'attack' }>['tacticalRange'],
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  if (range === undefined) throw new Error('The test attack requires a typed tactical range.');
  return {
    type: 'attack', actor, target, attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true, tacticalRange: range,
    damage: { terms: [{ type: damageType('Piercing'), dice: { count: 1, sides: dieSides(8), modifier: 3 } }], critical: false, responses: [] },
  };
}

/** The attack forms a provider pairs with these attack commands: each command against its own target. */
function attackFormsOf(...commands: readonly Extract<EncounterCommand, { readonly type: 'attack' }>[]): TurnAttackForms {
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

    // One target lookup is the attack's tactical assessment; the decision's
    // movement profiles look the one attack's target up once more (its forms
    // then read only perceived targets, and there are none). Assessing once
    // per decision makes 1 + 1 = 2; assessing per move command would make 3.
    expect(probe.targetLookups).toBe(2);
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
      target: { hitPoints: 1, usesDeathSaves: false },
    });
    const fullBeta = evaluateTacticalAttack({
      attackerId: actor.id, targetId: beta.id, attackerPosition: { column: 0, row: 0 }, targetPosition: { column: 1, row: 1 },
      range, attackBonus: 5, targetArmorClass: 10, criticalFloor: 20,
      damageTerms: [{ dice: { count: 1, sides: 8, modifier: 3 } }], attackerConditions: [], targetConditions: [],
      attackerCanSeeTarget: true, targetCanSeeAttacker: true, rollModeSources: [], featureRollModeInput: null,
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
): Extract<EncounterCommand, { readonly type: 'attack' }> {
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

type AttackCommand = Extract<EncounterCommand, { readonly type: 'attack' }>;

function weaponForm(input: {
  readonly actor: CombatantId;
  readonly target: CombatantId;
  readonly attackId: string;
  readonly dieSides: 4 | 6 | 8 | 10;
  readonly range: NonNullable<AttackCommand['tacticalRange']>;
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
