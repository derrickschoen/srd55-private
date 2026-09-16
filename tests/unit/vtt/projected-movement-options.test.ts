import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { MovementEvaluation } from '../../../src/combat/movement-evaluator';
import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
import { armorClass, feet, worldObjectId } from '../../../src/combat/values';
import {
  projectedMovementOptions,
  type EngineProjectedMovementRequest,
} from '../../../src/vtt/engine-query-port';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { declareTestInputs } from '../../helpers/test-inputs';
import { placedToken, playerProfile } from '../combat/fixtures';

declareTestInputs({});

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function encounter(reaction: 'observed_spent' | 'unknown'): {
  readonly state: EncounterState;
  readonly actorId: ReturnType<typeof playerProfile>['id'];
  readonly targetId: ReturnType<typeof playerProfile>['id'];
} {
  const actor = monsterCombatantProfile(GOBLIN_WARRIOR, {
    combatantId: 'combatant:projected-goblin',
    tokenId: 'token:projected-goblin',
  });
  const target = playerProfile('projected-fighter');
  const created = createEncounter({
    bounds: { columns: 4, rows: 1 },
    combatants: [actor, target],
    tokens: [placedToken(target, 0), placedToken(actor, 1)],
  });
  const state: EncounterState = {
    ...created,
    combatants: created.combatants.map((combatant) =>
      combatant.profile.id === actor.id
        ? {
            ...combatant,
            turn: {
              ...combatant.turn,
              action: { kind: 'available' },
              bonusActionAvailable: true,
              reactionAvailable: true,
              movement: { speed: feet(30), spent: feet(0), remaining: feet(30) },
            },
          }
        : combatant.profile.id === target.id
          ? {
              ...combatant,
              turn: {
                ...combatant.turn,
                reactionAvailable: reaction === 'unknown',
              },
            }
          : combatant),
    eventLog: reaction === 'observed_spent'
      ? [
          { sequence: 1, type: 'turn_started', combatant: target.id, round: 1 },
          {
            sequence: 2,
            type: 'resource_spent',
            combatant: target.id,
            resource: 'reaction',
            purpose: 'Opportunity Attack',
          },
        ]
      : [],
  };
  return { state, actorId: actor.id, targetId: target.id };
}

function request(
  actorId: ReturnType<typeof playerProfile>['id'],
  targetId: ReturnType<typeof playerProfile>['id'],
): EngineProjectedMovementRequest {
  return {
    actorId,
    targetId,
    attack: {
      range: { kind: 'melee', reachFeet: feet(5) },
      attackBonus: 4,
      criticalFloor: 20,
      damageTerms: [{ dice: { count: 1, sides: 6, modifier: 2 } }],
      attackerConditions: [],
      rollModeSources: [],
    },
  };
}

function movementDecision(evaluation: MovementEvaluation) {
  return {
    start: evaluation.start,
    earliestAttackTurn: evaluation.earliestAttackTurn,
    candidates: evaluation.candidates.map((candidate) => ({
      destination: candidate.destination,
      path: candidate.path,
      semantic: candidate.semantic,
      beforeRange: candidate.before.status === 'resolved'
        ? candidate.before.evaluation.range
        : candidate.before,
      afterRange: candidate.after.status === 'resolved'
        ? candidate.after.evaluation.range
        : candidate.after,
    })),
  };
}

describe('projected movement options', () => {
  it('uses the complete Large footprint for blocked tails, hazards, and opportunity annotations', () => {
    const baseActor = monsterCombatantProfile(GOBLIN_WARRIOR, {
      combatantId: 'combatant:large-movement-goblin',
      tokenId: 'token:large-movement-goblin',
    });
    const actor = {
      ...baseActor,
      rules: { ...baseActor.rules, sizeCategory: 'Large' as const },
    };
    const target = playerProfile('large-movement-target');
    const common = {
      bounds: { columns: 6, rows: 4 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 1, 1), placedToken(target, 0, 1)],
    };
    const blocked = createEncounter({ ...common, blockedCells: [{ column: 3, row: 2 }] });
    const blockedEvaluation = OFFER_ENVIRONMENT.queries.movementOptions(
      blocked,
      actor.id,
      target.id,
      'scimitar',
    );
    const blockedTail = blockedEvaluation?.candidates.find((candidate) =>
      candidate.destination.column === 2 && candidate.destination.row === 1);
    expect(blockedTail?.path).toMatchObject({ status: 'unreachable' });

    const exposedBase = createEncounter({
      ...common,
      worldObjects: [{
        id: worldObjectId('object:large-tail-hazard'),
        name: 'Tail-cell hazard',
        kind: 'hazard',
        position: { column: 3, row: 2 },
        footprint: [{ column: 3, row: 2 }],
        durability: { kind: 'indestructible' },
        armorClass: armorClass(10),
        damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' },
        createdRevision: 0,
      }],
    });
    const exposed: EncounterState = {
      ...exposedBase,
      combatants: exposedBase.combatants.map((combatant) =>
        combatant.profile.id === target.id
          ? { ...combatant, turn: { ...combatant.turn, reactionAvailable: true } }
          : combatant),
    };
    const exposedEvaluation = OFFER_ENVIRONMENT.queries.movementOptions(
      exposed,
      actor.id,
      target.id,
      'scimitar',
    );
    const enteredTail = exposedEvaluation?.candidates.find((candidate) =>
      candidate.destination.column === 2 && candidate.destination.row === 1);
    expect(enteredTail?.path).toMatchObject({
      status: 'found',
      hazardRisk: {
        status: 'resolved',
        atRisk: true,
        annotations: [{ cell: { column: 3, row: 2 }, kinds: ['environmental_hazard'] }],
      },
      opportunityAttackRisk: {
        status: 'resolved',
        atRisk: true,
        cells: [{ column: 1, row: 1 }],
        reactorIds: [target.id],
      },
    });
  });

  it('matches the full movement decision when every movement-sensitive fact is observed', () => {
    const setup = encounter('observed_spent');
    const projection = projectActorKnowledge(setup.state, setup.actorId);
    const projected = projectedMovementOptions(
      setup.state,
      projection,
      request(setup.actorId, setup.targetId),
    );
    const full = OFFER_ENVIRONMENT.queries.movementOptions(
      setup.state,
      setup.actorId,
      setup.targetId,
      'scimitar',
    );
    if (projected === null || full === null) throw new Error('Expected both movement evaluations.');

    expect(movementDecision(projected)).toEqual(movementDecision(full));
    expect(projected.candidates.every((candidate) => candidate.path.status !== 'found' ||
      candidate.path.opportunityAttackRisk.status === 'resolved')).toBe(true);
    const first = projected.candidates[0];
    if (first?.before.status !== 'resolved') throw new Error('Projected tactical input is absent.');
    expect(first.before.evaluation.probabilities).toEqual({
      status: 'unresolved', reason: 'target_armor_class_unresolved',
    });
    expect(first.before.evaluation.consequences).toMatchObject({
      status: 'unresolved', reason: 'target_hit_points_unresolved',
    });
  });

  it('makes opportunity risk unresolved when no reaction spend was observed', () => {
    const setup = encounter('unknown');
    const projection = projectActorKnowledge(setup.state, setup.actorId);
    const projected = projectedMovementOptions(
      setup.state,
      projection,
      request(setup.actorId, setup.targetId),
    );
    const full = OFFER_ENVIRONMENT.queries.movementOptions(
      setup.state,
      setup.actorId,
      setup.targetId,
      'scimitar',
    );
    if (projected === null || full === null) throw new Error('Expected both movement evaluations.');
    const retreat = projected.candidates.find((candidate) => candidate.destination.column === 2);
    const fullRetreat = full.candidates.find((candidate) => candidate.destination.column === 2);
    if (retreat?.path.status !== 'found' || fullRetreat?.path.status !== 'found') {
      throw new Error('Expected the one-square retreat candidate.');
    }

    expect(retreat.path.opportunityAttackRisk).toEqual({
      status: 'unresolved', reason: 'opportunity_attack_eligibility_unresolved',
    });
    expect(fullRetreat.path.opportunityAttackRisk).toMatchObject({
      status: 'resolved', atRisk: true,
    });
  });
});
