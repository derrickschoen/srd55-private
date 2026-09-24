import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { armorClass, damageType, dieSides, feet } from '../../../src/combat/values';
import { evaluateTacticalAttack } from '../../../src/combat/tactical-evaluator';
import {
  DEFAULT_SCRIPTED_PC_DECISION_POLICY,
  evaluateSymmetricPcDecision,
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
    });
    const byCommand = (command: EncounterCommand) => {
      const found = decision.assessments.find((assessment) => assessment.command === command);
      if (found === undefined) throw new Error('Every legal command must be assessed.');
      return found;
    };

    // Movement options never depend on which move is ranked, only on the state,
    // the actor's projection and the perceived attack, so both moves hold the
    // one answer. Attacks and end_turn are not movement and carry none.
    const shared = byCommand(oneStep).movement;
    if (shared?.status !== 'evaluated') throw new Error('Expected projected movement evaluation.');
    expect(byCommand(twoSteps).movement).toBe(shared);
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
    });
    expect(queries()).toBe(1);
    // A decision with no move command has no movement to assess, so no query.
    evaluateSymmetricPcDecision({ state, actorId: actor.id, legalActions: [ranged, endTurn] });
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
    });
    const byCommand = (command: EncounterCommand) => {
      const found = decision.assessments.find((assessment) => assessment.command === command);
      if (found === undefined) throw new Error('Every legal command must be assessed.');
      return found;
    };

    // One target lookup is the attack's tactical assessment; each movement
    // assessment looks the one attack's target up once more. Assessing once
    // per decision makes 1 + 1 = 2; assessing per move command would make 3.
    expect(probe.targetLookups).toBe(2);
    expect(probe.calls.filter((call) => call === 'projected-movement')).toEqual([]);
    expect(byCommand(ranged).tactical).toEqual({ status: 'unresolved', reason: 'target_not_perceived' });
    const shared = byCommand(oneStep).movement;
    expect(shared).toEqual({ status: 'unresolved', reason: 'movement_profile_unavailable' });
    expect(byCommand(twoSteps).movement).toBe(shared);
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
    const legalActions = [
      attack(actor.id, target.id, { kind: 'melee', reachFeet: feet(5) }),
      { type: 'dodge' as const, actor: actor.id },
      { type: 'end_turn' as const, actor: actor.id },
    ];

    expect(evaluateSymmetricPcDecision({ state, actorId: actor.id, legalActions }))
      .toEqual(evaluateSymmetricPcDecision({ state: structuredClone(state), actorId: actor.id, legalActions: structuredClone(legalActions) }));
  });
});
