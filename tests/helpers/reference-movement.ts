/** Frozen copy of src/combat/movement.ts at 77cc13f0 for differential tests. Do not edit. */
import { adjacentCells, isCellInside, type GridCell } from '../../src/combat/grid';
import { feet, type Feet } from '../../src/combat/values';
import type { GridBounds } from '../../src/combat/grid';
export type CellTraversal =
  | { readonly kind: 'blocked'; readonly reason: string }
  | {
      readonly kind: 'enterable';
      readonly cost: Feet;
      readonly canEnd: boolean;
    };

export interface MovementWorld<TActorId extends string> {
  readonly bounds: GridBounds;
  occupiedCells(actorId: TActorId, anchor: GridCell): readonly GridCell[];
  traversal(
    actorId: TActorId,
    from: GridCell,
    to: GridCell,
  ): CellTraversal;
  canTraverseStep(
    actorId: TActorId,
    from: GridCell,
    to: GridCell,
  ): boolean;
}



export interface PathRequest<TActorId extends string> {
  readonly actorId: TActorId;
  readonly start: GridCell;
  readonly goal: GridCell;
  readonly maximumCost: Feet;
}

export interface PathToAnyRequest<TActorId extends string> {
  readonly actorId: TActorId;
  readonly start: GridCell;
  readonly maximumCost: Feet;
  readonly isGoal: (cell: GridCell) => boolean;
}

export interface PathToBestRequest<TActorId extends string> {
  readonly actorId: TActorId;
  readonly start: GridCell;
  readonly maximumCost: Feet;
  /** Null excludes an endpoint; otherwise lower lexicographic values are better. */
  readonly rank: (cell: GridCell) => readonly number[] | null;
}

export type PathResult =
  | {
      readonly kind: 'found';
      /** Destination cells in travel order; the start cell is not repeated. */
      readonly cells: readonly GridCell[];
      readonly cost: Feet;
    }
  | { readonly kind: 'unreachable' };

interface FrontierCell {
  readonly cell: GridCell;
  readonly cost: number;
  readonly canEnd: boolean;
}

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function sameCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

function frontierOrder(left: FrontierCell, right: FrontierCell): number {
  return (
    left.cost - right.cost ||
    left.cell.row - right.cell.row ||
    left.cell.column - right.cell.column
  );
}

function validatedCost(cost: Feet): Feet {
  return feet(cost);
}

function reconstructPath(
  start: GridCell,
  goal: GridCell,
  previous: ReadonlyMap<string, GridCell>,
): readonly GridCell[] {
  const reversed: GridCell[] = [];
  let cursor = goal;
  while (!sameCell(cursor, start)) {
    reversed.push(cursor);
    const predecessor = previous.get(cellKey(cursor));
    if (predecessor === undefined) {
      throw new Error('Path predecessor chain is incomplete.');
    }
    cursor = predecessor;
  }
  return reversed.reverse();
}

/**
 * Deterministic Dijkstra search. Equal-cost frontier cells are settled in
 * row-major order, matching `adjacentCells`; the first equal-cost predecessor
 * therefore wins reproducibly. Returned cells omit the request's start cell.
 */
export function findPath<TActorId extends string>(
  world: MovementWorld<TActorId>,
  request: PathRequest<TActorId>,
): PathResult {
  if (
    !isCellInside(world.bounds, request.start) ||
    !isCellInside(world.bounds, request.goal)
  ) {
    return { kind: 'unreachable' };
  }
  return findPathToAny(world, {
    actorId: request.actorId,
    start: request.start,
    maximumCost: request.maximumCost,
    isGoal: (cell) => sameCell(cell, request.goal),
  });
}

/** Finds the least-cost path to any legal endpoint matching a pure predicate. */
export function findPathToAny<TActorId extends string>(
  world: MovementWorld<TActorId>,
  request: PathToAnyRequest<TActorId>,
): PathResult {
  const maximumCost = validatedCost(request.maximumCost);
  if (!isCellInside(world.bounds, request.start)) return { kind: 'unreachable' };
  if (request.isGoal(request.start)) return { kind: 'found', cells: [], cost: feet(0) };

  const startKey = cellKey(request.start);
  const distances = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, GridCell>();
  const frontier: FrontierCell[] = [{ cell: request.start, cost: 0, canEnd: true }];

  while (frontier.length > 0) {
    frontier.sort(frontierOrder);
    const current = frontier.shift();
    if (current === undefined) {
      break;
    }
    if (distances.get(cellKey(current.cell)) !== current.cost) {
      continue;
    }
    if (current.canEnd && request.isGoal(current.cell)) {
      return {
        kind: 'found',
        cells: reconstructPath(request.start, current.cell, previous),
        cost: feet(current.cost),
      };
    }

    for (const neighbor of adjacentCells(world.bounds, current.cell)) {
      if (
        !world.canTraverseStep(request.actorId, current.cell, neighbor)
      ) {
        continue;
      }
      const traversal = world.traversal(
        request.actorId,
        current.cell,
        neighbor,
      );
      if (traversal.kind === 'blocked') {
        continue;
      }
      const stepCost = validatedCost(traversal.cost);
      const nextCost = current.cost + stepCost;
      if (nextCost > maximumCost) {
        continue;
      }
      const neighborKey = cellKey(neighbor);
      const knownCost = distances.get(neighborKey);
      if (knownCost !== undefined && knownCost <= nextCost) {
        continue;
      }
      distances.set(neighborKey, nextCost);
      previous.set(neighborKey, current.cell);
      frontier.push({ cell: neighbor, cost: nextCost, canEnd: traversal.canEnd });
    }
  }

  return { kind: 'unreachable' };
}

/** Explores one bounded movement region and returns its best ranked legal endpoint. */
export function findPathToBest<TActorId extends string>(
  world: MovementWorld<TActorId>,
  request: PathToBestRequest<TActorId>,
): PathResult {
  const maximumCost = validatedCost(request.maximumCost);
  if (!isCellInside(world.bounds, request.start)) return { kind: 'unreachable' };

  const compareRank = (left: readonly number[], right: readonly number[]): number => {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const difference = (left[index] ?? 0) - (right[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  };
  const startKey = cellKey(request.start);
  const distances = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, GridCell>();
  const frontier: FrontierCell[] = [{ cell: request.start, cost: 0, canEnd: true }];
  let best: { readonly cell: GridCell; readonly cost: number; readonly rank: readonly number[] } | null = null;

  while (frontier.length > 0) {
    frontier.sort(frontierOrder);
    const current = frontier.shift();
    if (current === undefined) break;
    if (distances.get(cellKey(current.cell)) !== current.cost) continue;
    const rank = current.canEnd ? request.rank(current.cell) : null;
    if (rank !== null && (best === null || compareRank(rank, best.rank) < 0 ||
      compareRank(rank, best.rank) === 0 && (current.cost < best.cost ||
        current.cost === best.cost && (current.cell.row < best.cell.row ||
          current.cell.row === best.cell.row && current.cell.column < best.cell.column)))) {
      best = { cell: current.cell, cost: current.cost, rank };
    }
    for (const neighbor of adjacentCells(world.bounds, current.cell)) {
      if (!world.canTraverseStep(request.actorId, current.cell, neighbor)) continue;
      const traversal = world.traversal(request.actorId, current.cell, neighbor);
      if (traversal.kind === 'blocked') continue;
      const nextCost = current.cost + validatedCost(traversal.cost);
      if (nextCost > maximumCost) continue;
      const neighborKey = cellKey(neighbor);
      const knownCost = distances.get(neighborKey);
      if (knownCost !== undefined && knownCost <= nextCost) continue;
      distances.set(neighborKey, nextCost);
      previous.set(neighborKey, current.cell);
      frontier.push({ cell: neighbor, cost: nextCost, canEnd: traversal.canEnd });
    }
  }
  return best === null
    ? { kind: 'unreachable' }
    : {
        kind: 'found',
        cells: reconstructPath(request.start, best.cell, previous),
        cost: feet(best.cost),
      };
}

