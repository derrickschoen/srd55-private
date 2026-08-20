import { describe, expect, it } from 'vitest';
import { adjacentCells, gridDistance, type GridCell } from '../../../src/combat/grid';
import {
  findPath,
  planMovement,
  spendMovement,
  startTurnMovement,
  type MovementCause,
  type MovementWorld,
} from '../../../src/combat/movement';
import { feet } from '../../../src/combat/values';

function key(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

interface WorldOptions {
  readonly columns?: number;
  readonly rows?: number;
  readonly difficult?: readonly string[];
  readonly blocked?: readonly string[];
  readonly passThroughOnly?: readonly string[];
  readonly forbiddenTransitions?: readonly string[];
}

function world(options: WorldOptions = {}): MovementWorld<string> {
  const difficult = new Set(options.difficult ?? []);
  const blocked = new Set(options.blocked ?? []);
  const passThroughOnly = new Set(options.passThroughOnly ?? []);
  const forbiddenTransitions = new Set(options.forbiddenTransitions ?? []);
  return {
    bounds: { columns: options.columns ?? 5, rows: options.rows ?? 5 },
    traversal(_actorId, _from, to) {
      const destination = key(to);
      if (blocked.has(destination)) {
        return { kind: 'blocked', reason: 'wall' };
      }
      return {
        kind: 'enterable',
        cost: feet(difficult.has(destination) ? 10 : 5),
        canEnd: !passThroughOnly.has(destination),
      };
    },
    canTraverseStep(_actorId, from, to) {
      return !forbiddenTransitions.has(`${key(from)}>${key(to)}`);
    },
  };
}

describe('checked movement values and grid geometry', () => {
  it('rejects negative and non-finite feet', () => {
    expect(() => feet(-1)).toThrow('finite, non-negative');
    expect(() => feet(Number.POSITIVE_INFINITY)).toThrow(
      'finite, non-negative',
    );
  });

  it('returns all eight adjacent cells in documented row-major order', () => {
    expect(
      adjacentCells({ columns: 3, rows: 3 }, { column: 1, row: 1 }),
    ).toEqual([
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 0, row: 1 },
      { column: 2, row: 1 },
      { column: 0, row: 2 },
      { column: 1, row: 2 },
      { column: 2, row: 2 },
    ]);
  });

  it('prices orthogonal and diagonal shortest-grid-route distance at 5 feet per step', () => {
    expect(gridDistance({ column: 0, row: 0 }, { column: 0, row: 2 })).toBe(
      10,
    );
    expect(gridDistance({ column: 0, row: 0 }, { column: 2, row: 2 })).toBe(
      10,
    );
  });
});

describe('movement planning', () => {
  it('prices ordinary cells at 5 feet and difficult cells at 10 feet', () => {
    const result = planMovement(world({ difficult: ['2,0'] }), {
      actorId: 'mover',
      start: { column: 0, row: 0 },
      path: [
        { column: 1, row: 0 },
        { column: 2, row: 0 },
      ],
      budgetRemaining: feet(20),
      cause: 'voluntary',
      reachSources: [],
    });

    expect(result).toEqual({
      kind: 'legal',
      steps: [
        {
          from: { column: 0, row: 0 },
          to: { column: 1, row: 0 },
          cost: 5,
          beforeLeaving: [],
        },
        {
          from: { column: 1, row: 0 },
          to: { column: 2, row: 0 },
          cost: 10,
          beforeLeaving: [],
        },
      ],
      totalCost: 15,
      remaining: 5,
    });
  });

  it('allows exact budget exhaustion and refuses the first over-budget step', () => {
    const exact = planMovement(world(), {
      actorId: 'mover',
      start: { column: 0, row: 0 },
      path: [
        { column: 1, row: 0 },
        { column: 2, row: 0 },
      ],
      budgetRemaining: feet(10),
      cause: 'voluntary',
      reachSources: [],
    });
    expect(exact).toMatchObject({
      kind: 'legal',
      totalCost: 10,
      remaining: 0,
    });

    const over = planMovement(world(), {
      actorId: 'mover',
      start: { column: 0, row: 0 },
      path: [
        { column: 1, row: 0 },
        { column: 2, row: 0 },
      ],
      budgetRemaining: feet(5),
      cause: 'voluntary',
      reachSources: [],
    });
    expect(over).toEqual({
      kind: 'illegal',
      reason: 'over_budget',
      stepIndex: 1,
    });
  });

  it('retains spent distance across split movement in one turn', () => {
    const started = startTurnMovement(feet(30));
    const afterFirstMove = spendMovement(started, feet(10));
    const afterSecondMove = spendMovement(afterFirstMove, feet(5));

    expect(afterSecondMove).toEqual({ speed: 30, spent: 15, remaining: 15 });
    expect(() => spendMovement(afterSecondMove, feet(20))).toThrow(
      'exceeds the remaining budget',
    );
  });

  it('distinguishes blocked cells, forbidden transitions, and outside or non-adjacent steps', () => {
    const base = {
      actorId: 'mover',
      start: { column: 0, row: 0 },
      budgetRemaining: feet(30),
      cause: 'voluntary' as const,
      reachSources: [],
    };
    expect(
      planMovement(world({ blocked: ['1,0'] }), {
        ...base,
        path: [{ column: 1, row: 0 }],
      }),
    ).toEqual({ kind: 'illegal', reason: 'blocked_step', stepIndex: 0 });
    expect(
      planMovement(world({ forbiddenTransitions: ['0,0>1,0'] }), {
        ...base,
        path: [{ column: 1, row: 0 }],
      }),
    ).toEqual({
      kind: 'illegal',
      reason: 'illegal_transition',
      stepIndex: 0,
    });
    expect(
      planMovement(world(), {
        ...base,
        path: [{ column: 2, row: 0 }],
      }),
    ).toEqual({
      kind: 'illegal',
      reason: 'non_adjacent_step',
      stepIndex: 0,
    });
    expect(
      planMovement(world(), {
        ...base,
        path: [{ column: -1, row: 0 }],
      }),
    ).toEqual({ kind: 'illegal', reason: 'outside_grid', stepIndex: 0 });
  });

  it('can cross a non-ending cell but refuses it as the destination', () => {
    const passThroughWorld = world({
      columns: 3,
      rows: 1,
      passThroughOnly: ['1,0'],
    });
    expect(
      planMovement(passThroughWorld, {
        actorId: 'mover',
        start: { column: 0, row: 0 },
        path: [
          { column: 1, row: 0 },
          { column: 2, row: 0 },
        ],
        budgetRemaining: feet(10),
        cause: 'voluntary',
        reachSources: [],
      }),
    ).toMatchObject({ kind: 'legal', totalCost: 10 });
    expect(
      planMovement(passThroughWorld, {
        actorId: 'mover',
        start: { column: 0, row: 0 },
        path: [{ column: 1, row: 0 }],
        budgetRemaining: feet(10),
        cause: 'voluntary',
        reachSources: [],
      }),
    ).toEqual({
      kind: 'illegal',
      reason: 'occupied_destination',
      stepIndex: 0,
    });
  });
});

describe('deterministic Dijkstra', () => {
  it('chooses the stable row-major minimum-cost route around difficult terrain', () => {
    const result = findPath(
      world({ columns: 3, rows: 3, difficult: ['1,1'] }),
      {
        actorId: 'mover',
        start: { column: 0, row: 1 },
        goal: { column: 2, row: 1 },
        maximumCost: feet(20),
      },
    );

    expect(result).toEqual({
      kind: 'found',
      cells: [
        { column: 1, row: 0 },
        { column: 2, row: 1 },
      ],
      cost: 10,
    });
  });

  it('honors blocked cells, injected transition rules, maximum cost, and ending policy', () => {
    expect(
      findPath(world({ columns: 3, rows: 1, blocked: ['1,0'] }), {
        actorId: 'mover',
        start: { column: 0, row: 0 },
        goal: { column: 2, row: 0 },
        maximumCost: feet(20),
      }),
    ).toEqual({ kind: 'unreachable' });
    expect(
      findPath(
        world({
          columns: 3,
          rows: 1,
          forbiddenTransitions: ['0,0>1,0'],
        }),
        {
          actorId: 'mover',
          start: { column: 0, row: 0 },
          goal: { column: 2, row: 0 },
          maximumCost: feet(20),
        },
      ),
    ).toEqual({ kind: 'unreachable' });
    expect(
      findPath(world({ columns: 3, rows: 1 }), {
        actorId: 'mover',
        start: { column: 0, row: 0 },
        goal: { column: 2, row: 0 },
        maximumCost: feet(5),
      }),
    ).toEqual({ kind: 'unreachable' });
    expect(
      findPath(
        world({ columns: 3, rows: 1, passThroughOnly: ['1,0'] }),
        {
          actorId: 'mover',
          start: { column: 0, row: 0 },
          goal: { column: 2, row: 0 },
          maximumCost: feet(10),
        },
      ),
    ).toEqual({
      kind: 'found',
      cells: [
        { column: 1, row: 0 },
        { column: 2, row: 0 },
      ],
      cost: 10,
    });
    expect(
      findPath(
        world({ columns: 3, rows: 1, passThroughOnly: ['1,0'] }),
        {
          actorId: 'mover',
          start: { column: 0, row: 0 },
          goal: { column: 1, row: 0 },
          maximumCost: feet(10),
        },
      ),
    ).toEqual({ kind: 'unreachable' });
  });
});

describe('Opportunity Attack windows', () => {
  const eligibleReachSources = [
    {
      reactorId: 'reactor',
      cell: { column: 0, row: 0 },
      reach: feet(5),
      reactionAvailable: true,
      hostile: true,
    },
    {
      reactorId: 'reactor',
      cell: { column: 0, row: 0 },
      reach: feet(5),
      reactionAvailable: true,
      hostile: true,
    },
    {
      reactorId: 'friendly',
      cell: { column: 0, row: 0 },
      reach: feet(5),
      reactionAvailable: true,
      hostile: false,
    },
    {
      reactorId: 'spent',
      cell: { column: 0, row: 0 },
      reach: feet(5),
      reactionAvailable: false,
      hostile: true,
    },
  ];

  it('records one eligible reach exit on the step before position changes', () => {
    const result = planMovement(world(), {
      actorId: 'mover',
      start: { column: 1, row: 0 },
      path: [
        { column: 2, row: 0 },
        { column: 3, row: 0 },
      ],
      budgetRemaining: feet(10),
      cause: 'voluntary',
      reachSources: eligibleReachSources,
    });

    expect(result).toMatchObject({
      kind: 'legal',
      steps: [
        {
          from: { column: 1, row: 0 },
          to: { column: 2, row: 0 },
          beforeLeaving: [
            {
              kind: 'opportunity_attack_window',
              reactorId: 'reactor',
              moverId: 'mover',
            },
          ],
        },
        {
          from: { column: 2, row: 0 },
          to: { column: 3, row: 0 },
          beforeLeaving: [],
        },
      ],
    });
  });

  it('does not emit a reach-exit window when voluntary movement enters reach', () => {
    const result = planMovement(world(), {
      actorId: 'mover',
      start: { column: 2, row: 0 },
      path: [{ column: 1, row: 0 }],
      budgetRemaining: feet(5),
      cause: 'voluntary',
      reachSources: eligibleReachSources,
    });

    expect(result).toMatchObject({
      kind: 'legal',
      steps: [{ beforeLeaving: [] }],
    });
  });

  it.each<MovementCause>(['disengaged', 'forced', 'teleport'])(
    'suppresses reach-exit windows for %s movement',
    (cause) => {
      const result = planMovement(world(), {
        actorId: 'mover',
        start: { column: 1, row: 0 },
        path: [{ column: 2, row: 0 }],
        budgetRemaining: feet(5),
        cause,
        reachSources: eligibleReachSources,
      });
      expect(result).toMatchObject({
        kind: 'legal',
        steps: [{ beforeLeaving: [] }],
      });
    },
  );
});
