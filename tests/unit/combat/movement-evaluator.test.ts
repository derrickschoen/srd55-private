import { describe, expect, it } from 'vitest';
import type { GridCell } from '../../../src/combat/grid';
import {
  evaluateMovementOptions,
  MOVEMENT_EVALUATOR_POLICY,
  type MovementEvaluationInput,
} from '../../../src/combat/movement-evaluator';
import type { MovementWorld } from '../../../src/combat/movement';
import { combatantId, feet, type CombatantId } from '../../../src/combat/values';

const actorId = combatantId('combatant:bandit');
const targetId = combatantId('combatant:wizard');

function key(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function movementWorld(options: {
  readonly columns: number;
  readonly rows: number;
  readonly blocked?: readonly string[];
  readonly difficult?: readonly string[];
}): MovementWorld<CombatantId> {
  const blocked = new Set(options.blocked ?? []);
  const difficult = new Set(options.difficult ?? []);
  return {
    bounds: { columns: options.columns, rows: options.rows },
    canTraverseStep: () => true,
    traversal: (_actor, _from, to) => blocked.has(key(to))
      ? { kind: 'blocked', reason: 'fixture wall' }
      : {
          kind: 'enterable',
          cost: feet(difficult.has(key(to)) ? 10 : 5),
          canEnd: true,
        },
  };
}

function input(overrides: Partial<MovementEvaluationInput> = {}): MovementEvaluationInput {
  const targetPosition = { column: 7, row: 0 };
  return {
    policy: MOVEMENT_EVALUATOR_POLICY,
    actorId,
    start: { column: 0, row: 0 },
    candidates: [{ column: 1, row: 0 }],
    world: movementWorld({ columns: 8, rows: 1 }),
    speedPerTurn: feet(30),
    currentMovementRemaining: feet(30),
    projection: {
      currentAttackActionAvailable: true,
      currentDashAvailable: true,
      futureAttackActionAvailable: true,
      futureDashAvailable: true,
    },
    opportunityAttackRisk: {
      status: 'resolved',
      cause: 'voluntary',
      reachSources: [],
    },
    hazards: { status: 'resolved', cells: [] },
    attackAt: () => ({
      status: 'resolved',
      input: {
        attackerId: actorId,
        targetId,
        targetPosition,
        range: {
          kind: 'ranged',
          normalRangeFeet: feet(30),
          longRangeFeet: feet(120),
        },
        attackBonus: 4,
        targetArmorClass: 15,
        criticalFloor: 20,
        damageTerms: [{ dice: { count: 1, sides: 8, modifier: 2 } }],
        attackerConditions: [],
        targetConditions: [],
        attackerCanSeeTarget: true,
        targetCanSeeAttacker: true,
        rollModeSources: [],
        featureRollModeInput: null,
        target: { hitPoints: 20, usesDeathSaves: true },
      },
    }),
    ...overrides,
  };
}

describe('movement-eval-v1', () => {
  it('turns one 5-foot bandit step into an exact normal-range upgrade', () => {
    const evaluation = evaluateMovementOptions(input());
    const option = evaluation.candidates[0];
    expect(evaluation.policy).toBe('movement-eval-v1');
    expect(option).toBeDefined();
    if (option === undefined) throw new Error('Missing movement option.');
    expect(option.semantic).toEqual({
      status: 'resolved',
      kind: 'move_5_to_normal_range',
    });
    expect(option.before).toMatchObject({
      status: 'resolved',
      tacticalPolicy: 'tactical-evaluator-v2',
      evaluation: {
        range: { status: 'resolved', distanceFeet: 35, band: 'long', legal: true },
        rollMode: { mode: 'disadvantage', reasons: ['long_range_disadvantage'] },
      },
    });
    expect(option.after).toMatchObject({
      status: 'resolved',
      tacticalPolicy: 'tactical-evaluator-v2',
      evaluation: {
        range: { status: 'resolved', distanceFeet: 30, band: 'normal', legal: true },
        rollMode: { mode: 'normal', reasons: [] },
      },
    });
    // Hand oracle: +4 vs AC 15 is 1/2 straight and (1/2)^2 at disadvantage.
    expect(option.deltas.hitProbability).toEqual({
      status: 'resolved', before: 0.25, after: 0.5, delta: 0.25,
    });
    // 1d8+2: long EV 1.63625; normal EV 3.475; delta 1.83875.
    expect(option.deltas.expectedDamage.status).toBe('resolved');
    if (option.deltas.expectedDamage.status !== 'resolved') {
      throw new Error('Expected a resolved damage delta.');
    }
    expect(option.deltas.expectedDamage.before).toBeCloseTo(1.63625, 12);
    expect(option.deltas.expectedDamage.after).toBeCloseTo(3.475, 12);
    expect(option.deltas.expectedDamage.delta).toBeCloseTo(1.83875, 12);
  });

  it('finds a hand-costed least-cost detour when the preferred cell is blocked', () => {
    const evaluation = evaluateMovementOptions(input({
      start: { column: 0, row: 1 },
      candidates: [{ column: 2, row: 1 }],
      world: movementWorld({
        columns: 3,
        rows: 3,
        blocked: ['1,1'],
      }),
      hazards: {
        status: 'resolved',
        cells: [{ cell: { column: 1, row: 0 }, kind: 'environmental_hazard' }],
      },
    }));
    const option = evaluation.candidates[0];
    if (option === undefined || option.path.status !== 'found') {
      throw new Error('Expected a reachable detour.');
    }
    expect(option.path.cells).toEqual([
      { column: 1, row: 0 },
      { column: 2, row: 1 },
    ]);
    expect(option.path.cost).toBe(10);
    expect(option.path.hazardRisk).toEqual({
      status: 'resolved',
      atRisk: true,
      annotations: [{
        cell: { column: 1, row: 0 },
        kinds: ['environmental_hazard'],
      }],
    });
  });

  it('changes the guard ETA when four route cells become difficult terrain', () => {
    const attackAt: MovementEvaluationInput['attackAt'] = () => ({
      status: 'resolved',
      input: {
        attackerId: actorId,
        targetId,
        targetPosition: { column: 16, row: 0 },
        range: { kind: 'melee', reachFeet: feet(5) },
        attackBonus: 3,
        targetArmorClass: 15,
        criticalFloor: 20,
        damageTerms: [{ dice: { count: 1, sides: 6, modifier: 1 } }],
        attackerConditions: [],
        targetConditions: [],
        attackerCanSeeTarget: true,
        targetCanSeeAttacker: true,
        rollModeSources: [],
        featureRollModeInput: null,
        target: { hitPoints: 20, usesDeathSaves: true },
      },
    });
    const common = {
      candidates: [] as const,
      attackAt,
      speedPerTurn: feet(30),
      currentMovementRemaining: feet(30),
    };
    const ordinary = evaluateMovementOptions(input({
      ...common,
      world: movementWorld({ columns: 18, rows: 1 }),
    }));
    const difficult = evaluateMovementOptions(input({
      ...common,
      world: movementWorld({
        columns: 18,
        rows: 1,
        difficult: ['1,0', '2,0', '3,0', '4,0'],
      }),
    }));
    // Stop at column 15: 15 ordinary entries cost 75 feet.
    expect(ordinary.earliestAttackTurn).toMatchObject({
      status: 'resolved', turns: 1, movementCost: 75,
      attackOrigin: { column: 15, row: 0 },
    });
    // Four difficult entries add 20 feet: 95 exceeds the T+1 90-foot envelope.
    expect(difficult.earliestAttackTurn).toMatchObject({
      status: 'resolved', turns: 2, movementCost: 95,
      attackOrigin: { column: 15, row: 0 },
    });
  });

  it('flags only the path that leaves an eligible enemy reach', () => {
    const reactorId = combatantId('combatant:guard');
    const evaluation = evaluateMovementOptions(input({
      start: { column: 0, row: 0 },
      candidates: [{ column: 1, row: 0 }, { column: 2, row: 0 }],
      world: movementWorld({ columns: 3, rows: 2 }),
      opportunityAttackRisk: {
        status: 'resolved',
        cause: 'voluntary',
        reachSources: [{
          reactorId,
          cell: { column: 0, row: 1 },
          reach: feet(5),
          reactionAvailable: true,
          hostile: true,
        }],
      },
    }));
    const safe = evaluation.candidates[0];
    const risky = evaluation.candidates[1];
    if (
      safe === undefined || risky === undefined ||
      safe.path.status !== 'found' || risky.path.status !== 'found'
    ) throw new Error('Expected both paths to be reachable.');
    expect(safe.path.opportunityAttackRisk).toEqual({
      status: 'resolved', atRisk: false, cells: [], reactorIds: [],
    });
    expect(risky.path.opportunityAttackRisk).toEqual({
      status: 'resolved',
      atRisk: true,
      cells: [{ column: 1, row: 0 }],
      reactorIds: [reactorId],
    });
  });

  it('returns typed unresolved results when attack context or speed is absent', () => {
    const contextUnknown = evaluateMovementOptions(input({
      attackAt: () => ({ status: 'unresolved', reason: 'visibility_unresolved' }),
    }));
    expect(contextUnknown.earliestAttackTurn).toEqual({
      status: 'unresolved', reason: 'attack_context_unresolved',
    });
    const speedUnknown = evaluateMovementOptions(input({
      speedPerTurn: null,
      currentMovementRemaining: feet(0),
      attackAt: () => ({
        status: 'resolved',
        input: {
          attackerId: actorId,
          targetId,
          targetPosition: { column: 7, row: 0 },
          range: { kind: 'melee', reachFeet: feet(5) },
          attackBonus: 3,
          targetArmorClass: 15,
          criticalFloor: 20,
          damageTerms: [{ dice: { count: 1, sides: 6, modifier: 1 } }],
          attackerConditions: [],
          targetConditions: [],
          attackerCanSeeTarget: true,
          targetCanSeeAttacker: true,
          rollModeSources: [],
          featureRollModeInput: null,
          target: { hitPoints: 20, usesDeathSaves: true },
        },
      }),
    }));
    expect(speedUnknown.earliestAttackTurn).toEqual({
      status: 'unresolved', reason: 'effective_speed_unresolved',
    });
  });
});
