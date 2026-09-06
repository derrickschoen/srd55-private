import { describe, expect, it } from 'vitest';
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
