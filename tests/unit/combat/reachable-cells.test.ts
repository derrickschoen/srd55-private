/**
 * PERF-02 x1r bounded permanent differential: `findReachableCells` (one search per
 * creature) against the FROZEN per-destination reference in
 * tests/helpers/reference-movement.ts. Every comparison is an ordered array
 * comparison, so the row-major output order is part of the answer. The exhaustive
 * 33-fixture blind differential is experiment evidence only
 * (tools/experiments/reachable-cells/blind-differential.ts) and never runs here.
 */
import { describe, expect, it } from 'vitest';
import type { GridCell } from '../../../src/combat/grid';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { findReachableCells, type MovementWorld } from '../../../src/combat/movement';
import { feet, type Feet } from '../../../src/combat/values';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import {
  findPath as referenceFindPath,
  findPathToAny as referenceFindPathToAny,
} from '../../helpers/reference-movement';

function key(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function edge(from: GridCell, to: GridCell): string {
  return `${key(from)}>${key(to)}`;
}

interface SyntheticWorld {
  readonly columns: number;
  readonly rows: number;
  readonly blocked?: readonly string[];
  /** Entering one of these cells costs 10 feet. */
  readonly difficult?: readonly string[];
  /** Leaving one of these cells costs 10 feet: a source-dependent price, like a Large creature's newly entered cells. */
  readonly slowExits?: readonly string[];
  /** These steps ('c,r>c,r') cost 10 feet: a direction-dependent price. */
  readonly expensiveSteps?: readonly string[];
  /** The mover may cross these cells but never end on them, whatever the direction. */
  readonly passThroughOnly?: readonly string[];
  /** The mover may not end a move that arrives by one of these steps: direction-dependent legality. */
  readonly noEndSteps?: readonly string[];
  /** canTraverseStep refuses these steps. */
  readonly forbiddenSteps?: readonly string[];
  readonly throwingTraversals?: readonly string[];
  readonly throwingSteps?: readonly string[];
  /** traversal reports an invalid (negative) cost for these steps. */
  readonly invalidCostSteps?: readonly string[];
}

function syntheticWorld(options: SyntheticWorld): MovementWorld<string> {
  const set = (values: readonly string[] | undefined): ReadonlySet<string> => new Set(values ?? []);
  const blocked = set(options.blocked);
  const difficult = set(options.difficult);
  const slowExits = set(options.slowExits);
  const expensiveSteps = set(options.expensiveSteps);
  const passThroughOnly = set(options.passThroughOnly);
  const noEndSteps = set(options.noEndSteps);
  const forbiddenSteps = set(options.forbiddenSteps);
  const throwingTraversals = set(options.throwingTraversals);
  const throwingSteps = set(options.throwingSteps);
  const invalidCostSteps = set(options.invalidCostSteps);
  return {
    bounds: { columns: options.columns, rows: options.rows },
    occupiedCells: (_actorId, anchor) => [anchor],
    canTraverseStep(_actorId, from, to) {
      if (throwingSteps.has(edge(from, to))) throw new Error(`step refused ${edge(from, to)}`);
      return !forbiddenSteps.has(edge(from, to));
    },
    traversal(_actorId, from, to) {
      const step = edge(from, to);
      if (throwingTraversals.has(step)) throw new Error(`traversal refused ${step}`);
      if (blocked.has(key(to))) return { kind: 'blocked', reason: 'wall' };
      const slow = difficult.has(key(to)) || slowExits.has(key(from)) || expensiveSteps.has(step);
      return {
        kind: 'enterable',
        cost: invalidCostSteps.has(step) ? (-5 as Feet) : feet(slow ? 10 : 5),
        canEnd: !passThroughOnly.has(key(to)) && !noEndSteps.has(step),
      };
    },
  };
}

function tracedWorld<TActorId extends string>(world: MovementWorld<TActorId>, trace: string[]): MovementWorld<TActorId> {
  return {
    bounds: world.bounds,
    occupiedCells: (actorId, anchor) => world.occupiedCells(actorId, anchor),
    canTraverseStep: (actorId, from, to) => {
      trace.push(`step ${edge(from, to)}`);
      return world.canTraverseStep(actorId, from, to);
    },
    traversal: (actorId, from, to) => {
      trace.push(`traversal ${edge(from, to)}`);
      return world.traversal(actorId, from, to);
    },
  };
}

interface Expected {
  readonly destination: GridCell;
  readonly cells: readonly GridCell[];
  readonly cost: number;
}

/** The oracle: one frozen-reference findPath per in-bounds cell, row-major. */
function perDestination<TActorId extends string>(
  world: MovementWorld<TActorId>,
  actorId: TActorId,
  start: GridCell,
  maximumCost: number,
): readonly Expected[] {
  const expected: Expected[] = [];
  for (let row = 0; row < world.bounds.rows; row += 1) {
    for (let column = 0; column < world.bounds.columns; column += 1) {
      const result = referenceFindPath(world, { actorId, start, goal: { column, row }, maximumCost: feet(maximumCost) });
      if (result.kind === 'found') expected.push({ destination: { column, row }, cells: result.cells, cost: result.cost });
    }
  }
  return expected;
}

function reachable(world: MovementWorld<string>, start: GridCell, maximumCost: number) {
  return findReachableCells(world, { actorId: 'mover', start, maximumCost: feet(maximumCost) });
}

function routeTo(results: readonly Expected[], destination: GridCell): Expected | undefined {
  return results.find((entry) => key(entry.destination) === key(destination));
}

function outcome(run: () => unknown): unknown {
  try {
    return { returned: run() };
  } catch (error) {
    return { threw: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

const cell = (column: number, row: number): GridCell => ({ column, row });

// Hand-checkable grids (PERF-02 x1r model-spec). Each literal route below is the frozen
// reference's answer, re-derived by hand in the comment; each wrong queue or tie rule gives
// the other equal-cost route named there.
describe('single-search reachable cells: hand grids against the frozen reference', () => {
  it('breaks equal-cost ties row-major, not column-major', () => {
    // 3x3, centre blocked. 2,2 costs 15 either way round; row-major settles 1,0 before 0,1,
    // so 2,1 is reached from 1,0 first. Column-major would give 0,1 -> 1,2 -> 2,2.
    const tieWorld = syntheticWorld({ columns: 3, rows: 3, blocked: ['1,1'] });
    const results = reachable(tieWorld, cell(0, 0), 20);
    expect(routeTo(results, cell(2, 2))).toEqual({ destination: cell(2, 2), cells: [cell(1, 0), cell(2, 1), cell(2, 2)], cost: 15 });
    expect(results).toEqual(perDestination(tieWorld, 'mover', cell(0, 0), 20));
  });

  it('settles equal-cost cells row-major, not in discovery order', () => {
    // 4x4, 1,0 and 2,2 blocked. At 15 feet 3,2 (row 2) settles before 2,3 (row 3) and reaches
    // 3,3 first. First-in-first-out inside a cost bucket settles 0,1's discoveries first and
    // gives 0,1 -> 1,2 -> 2,3 -> 3,3 instead.
    const fifoWorld = syntheticWorld({ columns: 4, rows: 4, blocked: ['1,0', '2,2'] });
    const results = reachable(fifoWorld, cell(0, 0), 1000);
    expect(routeTo(results, cell(3, 3))).toEqual({
      destination: cell(3, 3), cells: [cell(1, 1), cell(2, 1), cell(3, 2), cell(3, 3)], cost: 20,
    });
    expect(results).toEqual(perDestination(fifoWorld, 'mover', cell(0, 0), 1000));
  });

  it('keeps the first equal-cost predecessor, not the last', () => {
    // 2 columns x 3 rows. 0,1 and 1,1 both offer 0,2 at 10 feet; 0,1 settles first and keeps it.
    const lastWinsWorld = syntheticWorld({ columns: 2, rows: 3 });
    const results = reachable(lastWinsWorld, cell(0, 0), 1000);
    expect(routeTo(results, cell(0, 2))).toEqual({ destination: cell(0, 2), cells: [cell(0, 1), cell(0, 2)], cost: 10 });
    expect(results).toEqual(perDestination(lastWinsWorld, 'mover', cell(0, 0), 1000));
  });

  it('prices each step by its direction and keeps the predecessor that settled first', () => {
    // 3x3, 1,0 blocked, and entering 2,1 from column 1 costs 10. 2,1 costs 15 by 1,1 or 1,2 (settled
    // at 5) or by 2,0 or 2,2 (settled at 10); 1,1 offers it first, so the route is 1,1 -> 2,1. A tie
    // rule on (row, column) alone, ignoring the predecessor's cost, would pick 2,0: 1,1 -> 2,0 -> 2,1.
    const directionWorld = syntheticWorld({ columns: 3, rows: 3, blocked: ['1,0'], expensiveSteps: ['1,1>2,1', '1,2>2,1'] });
    const results = reachable(directionWorld, cell(0, 1), 1000);
    expect(routeTo(results, cell(2, 1))).toEqual({ destination: cell(2, 1), cells: [cell(1, 1), cell(2, 1)], cost: 15 });
    expect(results).toEqual(perDestination(directionWorld, 'mover', cell(0, 1), 1000));
  });

  it('takes an endpoint\'s legality from the step it settled by, not from any cheapest step', () => {
    // 3x2. 2,0 costs 10 by 1,0 or by 1,1. It settles by 1,0, and a move that arrives by that step
    // cannot end; arriving from 1,1 could, but the per-destination search never takes it.
    const canEndWorld = syntheticWorld({ columns: 3, rows: 2, noEndSteps: ['1,0>2,0'] });
    const results = reachable(canEndWorld, cell(0, 0), 1000);
    expect(routeTo(results, cell(2, 0))).toBeUndefined();
    expect(routeTo(results, cell(2, 1))).toEqual({ destination: cell(2, 1), cells: [cell(1, 0), cell(2, 1)], cost: 10 });
    expect(results).toEqual(perDestination(canEndWorld, 'mover', cell(0, 0), 1000));
  });

  it('takes an endpoint\'s legality from its cheapest offer, not from the first offer', () => {
    // 5x3 from 1,1. 2,0 settles at 5 first and, leaving a slow exit, offers 3,0 at 15 by a step
    // that may end. 2,1 then offers 3,0 at 10 by a step that may not end. The cheaper offer
    // decides, so 3,0 is crossed but never an endpoint.
    const firstOfferWorld = syntheticWorld({ columns: 5, rows: 3, slowExits: ['2,0'], noEndSteps: ['2,1>3,0'] });
    const results = reachable(firstOfferWorld, cell(1, 1), 15);
    expect(routeTo(results, cell(3, 0))).toBeUndefined();
    expect(routeTo(results, cell(4, 0))).toEqual({ destination: cell(4, 0), cells: [cell(2, 1), cell(3, 0), cell(4, 0)], cost: 15 });
    expect(results).toEqual(perDestination(firstOfferWorld, 'mover', cell(1, 1), 15));
  });

  it('keeps exact-budget endpoints, crosses but never ends on pass-through cells, and prices whole routes', () => {
    expect(reachable(syntheticWorld({ columns: 4, rows: 1, passThroughOnly: ['1,0'] }), cell(0, 0), 15)).toEqual([
      { destination: cell(0, 0), cells: [], cost: 0 },
      { destination: cell(2, 0), cells: [cell(1, 0), cell(2, 0)], cost: 10 },
      { destination: cell(3, 0), cells: [cell(1, 0), cell(2, 0), cell(3, 0)], cost: 15 },
    ]);
    // A zero budget leaves only the start, which is always legal.
    expect(reachable(syntheticWorld({ columns: 3, rows: 1, passThroughOnly: ['0,0'] }), cell(0, 0), 0))
      .toEqual([{ destination: cell(0, 0), cells: [], cost: 0 }]);
    expect(reachable(syntheticWorld({ columns: 2, rows: 1 }), cell(2, 0), 15)).toEqual([]);
  });

  it('settles a cell once when a later equal-cost neighbour offers a cheaper step', () => {
    // 2,0 and 2,1 both settle at 5 feet; 2,0 settles first and offers 3,0 at 15, then 2,1 improves it to 10.
    const staleWorld = syntheticWorld({ columns: 5, rows: 3, slowExits: ['2,0'] });
    const results = reachable(staleWorld, cell(1, 1), 15);
    expect(results.filter((entry) => key(entry.destination) === '3,0')).toEqual([
      { destination: cell(3, 0), cells: [cell(2, 1), cell(3, 0)], cost: 10 },
    ]);
    expect(results).toEqual(perDestination(staleWorld, 'mover', cell(1, 1), 15));
  });
});

const SMALL_WORLDS: readonly SyntheticWorld[] = [
  { columns: 3, rows: 3, blocked: ['1,1'] },
  {
    columns: 5,
    rows: 5,
    difficult: ['1,1', '2,2', '3,1', '4,4'],
    passThroughOnly: ['2,1', '1,3', '3,4'],
    blocked: ['3,3', '0,2'],
    forbiddenSteps: ['0,0>1,1', '2,2>3,2', '1,2>2,3'],
  },
  { columns: 5, rows: 4, slowExits: ['2,0', '1,2', '3,3'], difficult: ['4,1'] },
  {
    columns: 4,
    rows: 4,
    slowExits: ['1,0', '2,2'],
    expensiveSteps: ['1,1>2,1', '0,2>1,3', '2,1>3,2'],
    noEndSteps: ['1,1>2,0', '2,1>3,0', '1,2>2,3', '0,1>0,2'],
    blocked: ['3,1'],
  },
];

describe('single-search reachable cells: exhaustive small worlds and callbacks', () => {
  it('returns exactly the frozen per-destination answer, in row-major order, for every start, cell, and budget of small worlds', () => {
    let compared = 0;
    for (const options of SMALL_WORLDS) {
      const movementWorld = syntheticWorld(options);
      for (let row = 0; row < options.rows; row += 1) {
        for (let column = 0; column < options.columns; column += 1) {
          for (let budget = 0; budget <= 40; budget += 5) {
            expect(reachable(movementWorld, cell(column, row), budget), `${key(cell(column, row))} budget ${String(budget)}`)
              .toEqual(perDestination(movementWorld, 'mover', cell(column, row), budget));
            compared += 1;
          }
        }
      }
    }
    expect(compared).toBe((9 + 25 + 20 + 16) * 9);
  });

  it('calls the world exactly as the frozen goal-less search does, and every per-destination search is a prefix of it', () => {
    let goals = 0;
    for (const options of SMALL_WORLDS) {
      const movementWorld = syntheticWorld(options);
      for (let row = 0; row < options.rows; row += 1) {
        for (let column = 0; column < options.columns; column += 1) {
          const start = cell(column, row);
          const single: string[] = [];
          findReachableCells(tracedWorld(movementWorld, single), { actorId: 'mover', start, maximumCost: feet(20) });
          const goalLess: string[] = [];
          referenceFindPathToAny(tracedWorld(movementWorld, goalLess), {
            actorId: 'mover', start, maximumCost: feet(20), isGoal: () => false,
          });
          expect(single, `${key(start)} goal-less trace`).toEqual(goalLess);
          expect(single.length).toBeGreaterThan(0);
          for (let goalRow = 0; goalRow < options.rows; goalRow += 1) {
            for (let goalColumn = 0; goalColumn < options.columns; goalColumn += 1) {
              const perGoal: string[] = [];
              const result = referenceFindPath(tracedWorld(movementWorld, perGoal), {
                actorId: 'mover', start, goal: cell(goalColumn, goalRow), maximumCost: feet(20),
              });
              const label = `${key(start)} -> ${key(cell(goalColumn, goalRow))}`;
              expect(single.slice(0, perGoal.length), label).toEqual(perGoal);
              // A goal the reference never finds costs it the whole region: the full trace.
              if (result.kind === 'unreachable') expect(perGoal.length, label).toBe(single.length);
              goals += 1;
            }
          }
        }
      }
    }
    expect(goals).toBe(9 * 9 + 25 * 25 + 20 * 20 + 16 * 16);
  });

  it('throws exactly what the frozen goal-less search throws, after the same world calls', () => {
    const cases: readonly { readonly name: string; readonly options: SyntheticWorld; readonly maximumCost: number; readonly threw: string }[] = [
      {
        name: 'traversal throws mid-search',
        options: { columns: 5, rows: 4, difficult: ['2,2'], throwingTraversals: ['2,1>3,1'] },
        maximumCost: 40,
        threw: 'Error: traversal refused 2,1>3,1',
      },
      {
        name: 'canTraverseStep throws',
        options: { columns: 4, rows: 4, forbiddenSteps: ['1,1>2,2'], throwingSteps: ['2,1>3,2'] },
        maximumCost: 40,
        threw: 'Error: step refused 2,1>3,2',
      },
      {
        name: 'traversal reports a negative cost',
        options: { columns: 4, rows: 3, invalidCostSteps: ['1,0>2,0'] },
        maximumCost: 40,
        threw: 'RangeError: Feet must be a finite, non-negative number.',
      },
      {
        name: 'the budget is not a distance',
        options: { columns: 3, rows: 3 },
        maximumCost: Number.NaN,
        threw: 'RangeError: Feet must be a finite, non-negative number.',
      },
    ];
    for (const { name, options, maximumCost, threw } of cases) {
      const movementWorld = syntheticWorld(options);
      const single: string[] = [];
      const goalLess: string[] = [];
      const actual = outcome(() => findReachableCells(tracedWorld(movementWorld, single), {
        actorId: 'mover', start: cell(0, 0), maximumCost: maximumCost as Feet,
      }));
      const reference = outcome(() => referenceFindPathToAny(tracedWorld(movementWorld, goalLess), {
        actorId: 'mover', start: cell(0, 0), maximumCost: maximumCost as Feet, isGoal: () => false,
      }));
      expect(actual, name).toEqual({ threw });
      expect(reference, name).toEqual({ threw });
      expect(single, name).toEqual(goalLess);
    }
  });
});

describe('single-search reachable cells: a real encounter with Large creatures', () => {
  it('matches the frozen reference on brutal-b 6206001: every cell for the fighter at full budget and a Large monster at 60 feet, sampled cells for the rest', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis-brutal-b/seed-6206001.json');
    const world = encounterMovementWorld(state);
    const fullBudget = state.bounds.columns * state.bounds.rows * 10;
    const placed = (id: string) => {
      const token = state.tokens.find((candidate) => String(candidate.combatantId) === id);
      if (token === undefined) throw new Error(`Missing token ${id}.`);
      return token;
    };

    // Every cell, ordered: the fighter at the whole-grid budget (row/column ties occur here),
    // and the Large monster at 60 feet (its step cost depends on direction).
    for (const [id, budget] of [['combatant:fighter', fullBudget], ['combatant:generated-6206001-monster-1', 60]] as const) {
      const token = placed(id);
      const actual = findReachableCells(world, { actorId: token.combatantId, start: token.position, maximumCost: feet(budget) });
      const expected = perDestination(world, token.combatantId, token.position, budget);
      expect(actual, id).toEqual(expected);
      expect(expected.some((entry) => entry.cells.length > 4), id).toBe(true);
    }

    // Every other living token at its own movement budget, on a fixed sample of cells.
    let sampled = 0;
    for (const token of state.tokens) {
      const id = String(token.combatantId);
      if (id === 'combatant:fighter' || id === 'combatant:generated-6206001-monster-1') continue;
      const actor = state.combatants.find((candidate) => candidate.profile.id === token.combatantId);
      if (actor === undefined) throw new Error(`Missing combatant ${id}.`);
      if (actor.life === 'dead') continue;
      const budget = state.activeCombatant === token.combatantId ? actor.turn.movement.remaining : actor.profile.rules.speed;
      const actual = findReachableCells(world, { actorId: token.combatantId, start: token.position, maximumCost: feet(budget) });
      for (let index = 0; index < state.bounds.columns * state.bounds.rows; index += 5) {
        const goal = cell(index % state.bounds.columns, Math.floor(index / state.bounds.columns));
        const reference = referenceFindPath(world, { actorId: token.combatantId, start: token.position, goal, maximumCost: feet(budget) });
        const found = actual.find((entry) => key(entry.destination) === key(goal));
        expect(found === undefined ? { kind: 'unreachable' } : { kind: 'found', cells: found.cells, cost: found.cost }, `${id} ${key(goal)}`)
          .toEqual(reference);
        sampled += 1;
      }
      expect(actual.map((entry) => entry.destination)).toEqual(
        [...actual.map((entry) => entry.destination)].sort((left, right) => left.row - right.row || left.column - right.column),
      );
    }
    expect(sampled).toBeGreaterThan(0);
  });
});
