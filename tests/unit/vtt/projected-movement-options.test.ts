import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { traceCombatantLine } from '../../../src/combat/cover';
import { closeCombatEnemies, createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand, StatedRangeAttackCommand } from '../../../src/combat/events';
import type { MovementEvaluation } from '../../../src/combat/movement-evaluator';
import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
import { terrainBlocking } from '../../../src/combat/terrain';
import { armorClass, damageType, dieSides, feet, worldObjectId } from '../../../src/combat/values';
import {
  projectedCloseCombatEnemies,
  projectedMovementOptions,
  type EngineProjectedMovementRequest,
} from '../../../src/vtt/engine-query-port';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { evaluateSymmetricPcDecision } from '../../../src/vtt/symmetric-pc-evaluator';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

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
    // Owner ruling 2026-09-24: the projected planner knows the target's AC.
    // Hand derivation (SRD "Attack Rolls" / "Rolling 20 or 1"): the fixture
    // fighter's AC is 14 and the request's attack bonus is +4, so a d20 face
    // hits when face + 4 >= 14, faces 10-19, plus the natural 20 = 11/20; the
    // natural 20 alone is the critical (1/20); the other 9 faces miss.
    expect(first.before.evaluation.probabilities).toEqual({
      status: 'resolved', hit: 0.55, critical: 0.05, miss: 0.45,
    });
    // One planning-AC helper serves both sides, so with every fact observed
    // and no cover on this one-row board, the projected hit chances equal the
    // full monster-side movement query's at every candidate.
    const probabilities = (evaluation: MovementEvaluation) => evaluation.candidates.map((candidate) => ({
      destination: candidate.destination,
      after: candidate.after.status === 'resolved' ? candidate.after.evaluation.probabilities : candidate.after,
    }));
    expect(probabilities(projected)).toEqual(probabilities(full));
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

/*
 * Owner ruling 2026-09-24 (PERF-02 unit pcac), verbatim: "Just give the pc
 * ac. A lot of players know the ac from memory or figure it out quickly".
 *
 * Board (columns 0-8, rows 0-4). A cell (c, r) is the square (c, c+1) x
 * (r, r+1). The ranger stands at (2,2); the target at (6,1); one low wall
 * with Three-Quarters Cover occupies (4,2), the square (4,5) x (2,3).
 *
 * Cover (D576 corner rule: from ONE corner of the attacker's square, a line
 * to each of the target's four corners (6,1) (7,1) (6,2) (7,2); a line is
 * obstructed only when it passes through a cell's interior; the attacker
 * uses its best corner; 1-2 obstructed lines = Half, 3-4 = Three-Quarters
 * for an object that grants Three-Quarters):
 * - (3,2) and the start (2,2): from corner (3,2), every line has y <= 2 and
 *   the two lines to (6,2) and (7,2) run along y = 2, the wall's top edge,
 *   so no line enters (4,5) x (2,3). No cover.
 * - (3,3): from corner (4,4), the line to (6,1) is (4+2t, 4-3t) and passes
 *   y in (2.5, 3) while x is in (4, 5), so it is obstructed; the other three
 *   (to (7,1), (6,2), (7,2)) stay at y > 3 while x is in (4, 5). One line =
 *   Half, and no corner of (3,3) has zero obstructed lines. Half Cover.
 * - (2,3): from corner (2,3), the line to (6,1) touches the wall only at
 *   its corner point (4,2); the lines to (7,1), (6,2), (7,2) are at y in
 *   (1.8, 2.2), (2.25, 2.5), (2.4, 2.6) while x is in (4, 5), so all three
 *   are obstructed. Every other corner of (2,3) obstructs 3 or 4 lines.
 *   Three-Quarters Cover.
 *
 * Hit chances (SRD "Attack Rolls", "Rolling 20 or 1", and the Cover table:
 * Half +2 AC, Three-Quarters +5 AC). Longbow +5, 1d8+3; target AC 12 (the
 * fixture monster statblock). A d20 face f in 2..19 hits when f + 5 >= AC;
 * 20 always hits and is the only critical; 1 always misses.
 * - no cover, AC 12: f >= 7 -> 13 faces + the 20 = 14/20 = 0.7
 * - Half, AC 14:     f >= 9 -> 11 faces + the 20 = 12/20 = 0.6
 * - Three-Quarters, AC 17: f >= 12 -> 8 faces + the 20 = 9/20 = 0.45
 * Expected damage = (hit - 1/20) x 7.5 + 1/20 x 12, where 7.5 = 4.5 + 3 is
 * the average hit and 12 = 7.5 + 4.5 adds the critical's extra die:
 * 0.65 x 7.5 + 0.6 = 5.475; 0.55 x 7.5 + 0.6 = 4.725; 0.40 x 7.5 + 0.6 = 3.6.
 */
const RANGER_START = { column: 2, row: 2 } as const;
const COVER_TARGET_CELL = { column: 6, row: 1 } as const;
const LOW_WALL_CELL = { column: 4, row: 2 } as const;
const CLEAR_SQUARE = { column: 3, row: 2 } as const;
const HALF_COVER_SQUARE = { column: 3, row: 3 } as const;
const THREE_QUARTERS_SQUARE = { column: 2, row: 3 } as const;
const LURKER_CELL = { column: 5, row: 1 } as const;

function lowWall(): EncounterState['worldObjects'][number] {
  return {
    id: worldObjectId('object:pcac-low-wall'), name: 'Low wall', kind: 'cover',
    position: LOW_WALL_CELL, footprint: [LOW_WALL_CELL],
    durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
    blocking: terrainBlocking('three_quarters_cover'), createdRevision: 0,
  };
}

function rangerBoard(lurker: 'none' | 'fogged') {
  const ranger = playerProfile('pcac-ranger');
  const target = monsterProfile('pcac-target');
  const hidden = monsterProfile('pcac-lurker');
  const created = createEncounter({
    bounds: { columns: 9, rows: 5 },
    combatants: lurker === 'fogged' ? [ranger, target, hidden] : [ranger, target],
    tokens: [
      placedToken(ranger, RANGER_START.column, RANGER_START.row),
      placedToken(target, COVER_TARGET_CELL.column, COVER_TARGET_CELL.row),
      ...(lurker === 'fogged' ? [placedToken(hidden, LURKER_CELL.column, LURKER_CELL.row)] : []),
    ],
    worldObjects: [lowWall()],
    ...(lurker === 'fogged' ? { foggedCells: [LURKER_CELL] } : {}),
  });
  const state: EncounterState = {
    ...created,
    combatants: created.combatants.map((combatant) => combatant.profile.id === ranger.id
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
  return { state, ranger, target, hidden };
}

function longbowRequest(
  actorId: ReturnType<typeof playerProfile>['id'],
  targetId: ReturnType<typeof monsterProfile>['id'],
): EngineProjectedMovementRequest {
  return {
    actorId,
    targetId,
    attack: {
      range: { kind: 'ranged', normalRangeFeet: feet(150), longRangeFeet: feet(600) },
      attackBonus: 5,
      criticalFloor: 20,
      damageTerms: [{ dice: { count: 1, sides: 8, modifier: 3 } }],
      attackerConditions: [],
      rollModeSources: [],
    },
  };
}

function candidateAt(evaluation: MovementEvaluation, cell: { readonly column: number; readonly row: number }) {
  const found = evaluation.candidates.find((candidate) =>
    candidate.destination.column === cell.column && candidate.destination.row === cell.row);
  if (found === undefined) throw new Error(`No movement candidate at ${String(cell.column)},${String(cell.row)}.`);
  return found;
}

function hitChance(verdict: MovementEvaluation['candidates'][number]['after']) {
  if (verdict.status !== 'resolved') throw new Error('Expected a resolved attack verdict.');
  return verdict.evaluation.probabilities;
}

function expectedDamage(verdict: MovementEvaluation['candidates'][number]['after']): number {
  if (verdict.status !== 'resolved' || verdict.evaluation.damage.status !== 'resolved') {
    throw new Error('Expected resolved expected damage.');
  }
  return verdict.evaluation.damage.expectedDamage;
}

describe('PCAC: projected PC movement plans against the target AC plus cover', () => {
  it('PCAC-RANGER-PREFERS-CLEAR: a ranger\'s clear square outranks the three-quarters square by hand-derived hit chance and damage', () => {
    const { state, ranger, target } = rangerBoard('none');
    // The hand-derived cover of each square (see the block comment above).
    const tierFrom = (cell: { readonly column: number; readonly row: number }) =>
      traceCombatantLine(state, ranger.id, target.id, { sourceAnchor: cell }).tier;
    expect([RANGER_START, CLEAR_SQUARE, HALF_COVER_SQUARE, THREE_QUARTERS_SQUARE].map(tierFrom))
      .toEqual(['none', 'none', 'half', 'three_quarters']);

    const evaluation = projectedMovementOptions(
      state,
      projectActorKnowledge(state, ranger.id),
      longbowRequest(ranger.id, target.id),
    );
    if (evaluation === null) throw new Error('Expected a projected movement evaluation.');
    const clear = candidateAt(evaluation, CLEAR_SQUARE);
    const half = candidateAt(evaluation, HALF_COVER_SQUARE);
    const threeQuarters = candidateAt(evaluation, THREE_QUARTERS_SQUARE);

    expect(hitChance(clear.before)).toEqual({ status: 'resolved', hit: 0.7, critical: 0.05, miss: 0.3 });
    expect(hitChance(clear.after)).toEqual({ status: 'resolved', hit: 0.7, critical: 0.05, miss: 0.3 });
    expect(hitChance(half.after)).toEqual({ status: 'resolved', hit: 0.6, critical: 0.05, miss: 0.4 });
    expect(hitChance(threeQuarters.after)).toEqual({ status: 'resolved', hit: 0.45, critical: 0.05, miss: 0.55 });
    expect(expectedDamage(clear.after)).toBeCloseTo(5.475, 12);
    expect(expectedDamage(half.after)).toBeCloseTo(4.725, 12);
    expect(expectedDamage(threeQuarters.after)).toBeCloseTo(3.6, 12);
    // Range is identical from all three squares, so cover reaches the plan
    // only through the AC: the clear square is strictly the better one.
    for (const candidate of [clear, half, threeQuarters]) {
      expect(candidate.semantic).toEqual({ status: 'resolved', kind: 'maintain_range' });
    }
    expect(clear.deltas.expectedDamage).toMatchObject({ status: 'resolved', delta: 0 });
    expect(threeQuarters.deltas.expectedDamage.status === 'resolved'
      ? threeQuarters.deltas.expectedDamage.delta
      : null).toBeCloseTo(3.6 - 5.475, 12);
  });

  it('PCAC-SYMMETRIC-PATH: the scripted-PC evaluator\'s move assessments carry the same AC-derived numbers', () => {
    const { state, ranger, target } = rangerBoard('none');
    const longbow: StatedRangeAttackCommand = {
      type: 'attack', actor: ranger.id, target: target.id, attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
      attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      tacticalRange: { kind: 'ranged', normalRangeFeet: feet(150), longRangeFeet: feet(600) },
      damage: {
        terms: [{ type: damageType('Piercing'), dice: { count: 1, sides: dieSides(8), modifier: 3 } }],
        critical: false,
        responses: [],
      },
    };
    const move = (cell: { readonly column: number; readonly row: number }): EncounterCommand => ({
      type: 'move', actor: ranger.id, path: [{ ...cell }], cause: 'voluntary',
    });
    const decision = evaluateSymmetricPcDecision({
      state,
      actorId: ranger.id,
      legalActions: [longbow, move(CLEAR_SQUARE), move(THREE_QUARTERS_SQUARE), { type: 'end_turn', actor: ranger.id }],
      attackForms: (_state, actor, attacked) => actor === ranger.id && attacked === target.id ? [longbow] : [],
    });
    const assessedHit = (cell: { readonly column: number; readonly row: number }) => {
      const assessment = decision.assessments.find((entry) => entry.command.type === 'move' &&
        entry.command.path.at(-1)?.column === cell.column && entry.command.path.at(-1)?.row === cell.row);
      if (assessment?.movement?.status !== 'evaluated') throw new Error('Expected an evaluated move assessment.');
      return hitChance(candidateAt(assessment.movement.evaluation, cell).after);
    };

    expect(assessedHit(CLEAR_SQUARE)).toEqual({ status: 'resolved', hit: 0.7, critical: 0.05, miss: 0.3 });
    expect(assessedHit(THREE_QUARTERS_SQUARE)).toEqual({ status: 'resolved', hit: 0.45, critical: 0.05, miss: 0.55 });
  });

  it('PCAC-UNPERCEIVED-COVER: a creature the ranger cannot perceive adds no cover to the planned AC', () => {
    const { state, ranger, target, hidden } = rangerBoard('fogged');
    // Hand derivation: from corner (3,2) the lines to (6,1) and (7,1) pass
    // the lurker's square (5,6) x (1,2) at y in (1, 1.33) and (1.25, 1.5);
    // the lines to (6,2) and (7,2) graze y = 2. The same holds from corners
    // (4,2) and (2,2) (y in (1, 1.5) and (1.33, 1.67); (1, 1.25) and
    // (1.2, 1.4)), and every bottom corner's lines cross the wall. So over the
    // FULL state the target has Half Cover from (3,2) and from the start.
    // The fogged lurker is not perceived, so the plan must not see it.
    for (const anchor of [RANGER_START, CLEAR_SQUARE]) {
      expect(traceCombatantLine(state, ranger.id, target.id, { sourceAnchor: anchor }))
        .toMatchObject({ tier: 'half', sourceIds: [`creature:${String(hidden.id)}`] });
    }
    const projection = projectActorKnowledge(state, ranger.id);
    expect(projection.targets.find((entry) => entry.targetId === hidden.id)?.kind).not.toBe('perceived');

    const evaluation = projectedMovementOptions(state, projection, longbowRequest(ranger.id, target.id));
    if (evaluation === null) throw new Error('Expected a projected movement evaluation.');
    const clear = candidateAt(evaluation, CLEAR_SQUARE);

    expect(hitChance(clear.before)).toEqual({ status: 'resolved', hit: 0.7, critical: 0.05, miss: 0.3 });
    expect(hitChance(clear.after)).toEqual({ status: 'resolved', hit: 0.7, critical: 0.05, miss: 0.3 });
  });

  it('PCAC-MONSTER-SAME-HELPER: the monster side plans against the same AC plus cover', () => {
    // Mirror board: a Goblin Warrior (Shortbow +4) shoots the fixture PC
    // (AC 14) at (6,1) past the same low wall. Hand derivation as above:
    // no cover AC 14, f >= 10 -> 11/20; Half AC 16, f >= 12 -> 9/20;
    // Three-Quarters AC 19, f >= 15 -> 6/20.
    const goblin = monsterCombatantProfile(GOBLIN_WARRIOR, {
      combatantId: 'combatant:pcac-goblin', tokenId: 'token:pcac-goblin',
    });
    const pc = playerProfile('pcac-pc-target');
    const hitFrom = (cell: { readonly column: number; readonly row: number }) => {
      const state = createEncounter({
        bounds: { columns: 9, rows: 5 },
        combatants: [goblin, pc],
        tokens: [
          placedToken(goblin, cell.column, cell.row),
          placedToken(pc, COVER_TARGET_CELL.column, COVER_TARGET_CELL.row),
        ],
        worldObjects: [lowWall()],
      });
      return OFFER_ENVIRONMENT.queries.tacticalAttack(state, goblin.id, pc.id, 'shortbow')?.probabilities;
    };

    expect(hitFrom(CLEAR_SQUARE)).toEqual({ status: 'resolved', hit: 0.55, critical: 0.05, miss: 0.45 });
    expect(hitFrom(HALF_COVER_SQUARE)).toEqual({ status: 'resolved', hit: 0.45, critical: 0.05, miss: 0.55 });
    expect(hitFrom(THREE_QUARTERS_SQUARE)).toEqual({ status: 'resolved', hit: 0.3, critical: 0.05, miss: 0.7 });
  });
});

/*
 * CC-PC-DESTINATION-SIGHT (review r2 P2). Ranged Attacks in Close Combat needs
 * an enemy "who can see you" (docs/srd/full/srd-5.2.1.txt:911-917). Whether an
 * enemy sees the PC is a fact of the square the PC stands on; at a square it
 * could move to, it turns on the enemy's senses against that square's light,
 * which the PC's actor-local knowledge does not hold. So the plan uses the
 * fact only on the standing square and leaves it unknown everywhere else.
 *
 * BOARD (8 x 3, bright light except (1,1), which is in darkness): the ranger
 * at (0,1); the guard, a fixture monster with normal sight only (no
 * darkvision), at (1,2), 5 feet away; the target, a Goblin Warrior (AC 15,
 * Darkvision 60 ft), at (7,0), 35 feet away and clear of the guard. Both
 * monsters see the ranger where it stands, so its knowledge records both as
 * seeing it now. The Longbow is +5, 1d8 + 3, 150/600.
 * - From the standing square (0,1) the guard is 5 feet away and seen to see
 *   the ranger: Disadvantage. One d20 hits AC 15 on faces 10-20 (11/20,
 *   critical 1/20); with Disadvantage hit 121/400, critical 1/400:
 *   ED = 120/400 x 7.5 + 1/400 x 12 = 2.28.
 * - From (1,1) (dark, the standing square's row) and (0,2) (lit, its column)
 *   the guard is 5 feet away and its sight of the ranger there is unknown:
 *   close_combat_unresolved, no expected damage.
 * - The reducer after the ranger steps to (1,1): the guard cannot see it in
 *   darkness, the goblin sees it with Darkvision (30 feet), and the ranger
 *   sees the goblin in bright light: a straight roll, one d20 (RNG 0.5). The
 *   plan claimed no Disadvantage there that the roll does not have.
 */
describe('CC-PC-DESTINATION-SIGHT: an enemy\'s sight of the PC is not carried to another square', () => {
  it('CC-PC-DESTINATION-SIGHT: stepping into darkness beside a guard without darkvision is planned unresolved, and the reducer then rolls no close-combat Disadvantage', () => {
    const ranger = playerProfile('cc-destination-ranger', { initiativeBonus: 20 });
    const guardBase = monsterProfile('cc-destination-guard', { initiativeBonus: -20 });
    const guard = { ...guardBase, rules: { ...guardBase.rules, senses: [] } };
    const goblinBase = monsterCombatantProfile(GOBLIN_WARRIOR, {
      combatantId: 'combatant:cc-destination-goblin', tokenId: 'token:cc-destination-goblin',
    });
    const goblin = { ...goblinBase, rules: { ...goblinBase.rules, initiativeBonus: -20 } };
    const standing = { column: 0, row: 1 } as const;
    const dark = { column: 1, row: 1 } as const;
    const lit = { column: 0, row: 2 } as const;
    const created = createEncounter({
      bounds: { columns: 8, rows: 3 },
      combatants: [ranger, guard, goblin],
      tokens: [placedToken(ranger, 0, 1), placedToken(guard, 1, 2), placedToken(goblin, 7, 0)],
      environment: {
        lightRegions: [{ id: 'cc-destination-dark', cells: [dark], level: 'darkness' }],
        difficultTerrainRegions: [],
        obscurementRegions: [],
        narrowOpeningRegions: [],
      },
    });
    const state = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    expect(state.activeCombatant).toBe(ranger.id);
    expect(traceCombatantLine(state, ranger.id, goblin.id).tier).toBe('none');
    const projection = projectActorKnowledge(state, ranger.id);
    for (const monster of [guard.id, goblin.id]) {
      expect(projection.targets.find((target) => target.targetId === monster)).toMatchObject({
        kind: 'perceived', reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
      });
    }

    // The plan's close-combat facts: the guard seen to see the ranger where it stands, unknown elsewhere.
    expect(projectedCloseCombatEnemies(state, projection, standing)).toEqual([
      { id: guard.id, distanceFeet: 5, seesAttacker: true, incapacitated: false },
    ]);
    for (const cell of [dark, lit]) {
      expect(projectedCloseCombatEnemies(state, projection, cell)).toEqual([
        { id: guard.id, distanceFeet: 5, seesAttacker: { kind: 'unknown' }, incapacitated: false },
      ]);
    }
    const evaluation = projectedMovementOptions(state, projection, longbowRequest(ranger.id, goblin.id));
    if (evaluation === null) throw new Error('Expected a projected movement evaluation.');
    const planned = (verdict: MovementEvaluation['candidates'][number]['after']) => {
      if (verdict.status !== 'resolved') throw new Error('Expected an evaluated attack verdict.');
      return {
        mode: verdict.evaluation.rollMode.mode,
        closeCombat: verdict.evaluation.rollMode.reasons.includes('ranged_close_combat_disadvantage'),
        unresolved: verdict.evaluation.unresolved.includes('close_combat_unresolved'),
        damage: verdict.evaluation.damage.status === 'resolved'
          ? Math.round(verdict.evaluation.damage.expectedDamage * 1e9) / 1e9
          : verdict.evaluation.damage.status,
      };
    };
    expect(planned(candidateAt(evaluation, dark).before))
      .toEqual({ mode: 'disadvantage', closeCombat: true, unresolved: false, damage: 2.28 });
    const unknownThere = { mode: 'normal', closeCombat: false, unresolved: true, damage: 'unresolved' };
    expect(planned(candidateAt(evaluation, dark).after)).toEqual(unknownThere);
    expect(planned(candidateAt(evaluation, lit).after)).toEqual(unknownThere);

    // The reducer after the step into darkness.
    const moved = reduceEncounter(state, {
      type: 'move', actor: ranger.id, path: [{ ...dark }], cause: 'voluntary',
    }, () => 0.5).state;
    expect(closeCombatEnemies(moved, ranger.id)).toEqual([
      { id: guard.id, distanceFeet: 5, seesAttacker: false, incapacitated: false },
    ]);
    const shot = reduceEncounter(moved, {
      type: 'attack', actor: ranger.id, target: goblin.id, attackBonus: 5, criticalFloor: 20, rollMode: 'normal',
      attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      tacticalRange: { kind: 'ranged', normalRangeFeet: feet(150), longRangeFeet: feet(600) },
      damage: {
        terms: [{ type: damageType('Piercing'), dice: { count: 1, sides: dieSides(8), modifier: 3 } }],
        critical: false,
        responses: [],
      },
    }, () => 0.5).events.find((event) => event.type === 'attack_resolved');
    if (shot?.type !== 'attack_resolved') throw new Error('The Longbow shot emitted no attack roll.');
    expect({ mode: shot.attack.roll.mode, faces: shot.attack.roll.faces.length }).toEqual({ mode: 'normal', faces: 1 });
  });
});
