import { describe, expect, it } from 'vitest';
import { gridDistance, type GridCell } from '../../src/combat/grid';
import {
  findPath,
  planMovement,
  type MovementWorld,
} from '../../src/combat/movement';
import { attackRangeVerdict } from '../../src/combat/range';
import { feet } from '../../src/combat/values';

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

describe('headless simulation adoption', () => {
  it('consumes the movement and range kernel with ES2022 and no browser library', () => {
    const difficult = new Set(['1,0']);
    const world: MovementWorld<'sim-actor'> = {
      bounds: { columns: 4, rows: 2 },
      traversal(_actorId, _from, to) {
        return {
          kind: 'enterable',
          cost: feet(difficult.has(cellKey(to)) ? 10 : 5),
          canEnd: true,
        };
      },
      canTraverseStep() {
        return true;
      },
    };

    const path = findPath(world, {
      actorId: 'sim-actor',
      start: { column: 0, row: 0 },
      goal: { column: 3, row: 0 },
      maximumCost: feet(20),
    });
    expect(path).toEqual({
      kind: 'found',
      cells: [
        { column: 1, row: 1 },
        { column: 2, row: 0 },
        { column: 3, row: 0 },
      ],
      cost: 15,
    });
    if (path.kind !== 'found') {
      throw new Error('The deterministic sim path must be reachable.');
    }

    expect(
      planMovement(world, {
        actorId: 'sim-actor',
        start: { column: 0, row: 0 },
        path: path.cells,
        budgetRemaining: feet(20),
        cause: 'voluntary',
        reachSources: [],
      }),
    ).toMatchObject({ kind: 'legal', totalCost: 15, remaining: 5 });
    expect(gridDistance({ column: 0, row: 0 }, { column: 3, row: 1 })).toBe(
      15,
    );
    expect(
      attackRangeVerdict(
        { column: 0, row: 0 },
        { column: 3, row: 1 },
        { kind: 'ranged', normal: feet(10), long: feet(20) },
      ),
    ).toEqual({ kind: 'legal', rollMode: 'disadvantage' });
  });
});
