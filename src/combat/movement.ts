import {
  adjacentCells,
  gridDistance,
  isCellInside,
  type GridBounds,
  type GridCell,
} from './grid';
import { feet, type Feet } from './values';

export type CellTraversal =
  | { readonly kind: 'blocked'; readonly reason: string }
  | {
      readonly kind: 'enterable';
      readonly cost: Feet;
      readonly canEnd: boolean;
    };

export interface MovementWorld<TActorId extends string> {
  readonly bounds: GridBounds;
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

export interface ReachSource<TActorId extends string> {
  readonly reactorId: TActorId;
  readonly cell: GridCell;
  readonly reach: Feet;
  readonly reactionAvailable: boolean;
  readonly hostile: boolean;
}

export type MovementCause =
  | 'voluntary'
  | 'disengaged'
  | 'forced'
  | 'teleport';

export interface MovementRequest<TActorId extends string> {
  readonly actorId: TActorId;
  readonly start: GridCell;
  /** Destination cells in travel order; the start cell is not repeated. */
  readonly path: readonly GridCell[];
  readonly budgetRemaining: Feet;
  readonly cause: MovementCause;
  readonly reachSources: readonly ReachSource<TActorId>[];
}

export interface MovementStep<TActorId extends string> {
  readonly from: GridCell;
  readonly to: GridCell;
  readonly cost: Feet;
  /** Reaction windows that must resolve before this step changes position. */
  readonly beforeLeaving: readonly {
    readonly kind: 'opportunity_attack_window';
    readonly reactorId: TActorId;
    readonly moverId: TActorId;
  }[];
}

export type MovementPlan<TActorId extends string> =
  | {
      readonly kind: 'legal';
      readonly steps: readonly MovementStep<TActorId>[];
      readonly totalCost: Feet;
      readonly remaining: Feet;
    }
  | {
      readonly kind: 'illegal';
      readonly reason:
        | 'non_adjacent_step'
        | 'blocked_step'
        | 'illegal_transition'
        | 'occupied_destination'
        | 'over_budget'
        | 'outside_grid';
      readonly stepIndex: number;
    };

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

function isAdjacent(from: GridCell, to: GridCell): boolean {
  const columnDelta = Math.abs(to.column - from.column);
  const rowDelta = Math.abs(to.row - from.row);
  return columnDelta <= 1 && rowDelta <= 1 && columnDelta + rowDelta > 0;
}

function opportunityWindows<TActorId extends string>(
  request: MovementRequest<TActorId>,
  from: GridCell,
  to: GridCell,
): MovementStep<TActorId>['beforeLeaving'] {
  if (request.cause !== 'voluntary') {
    return [];
  }

  const includedReactors = new Set<TActorId>();
  const windows: {
    readonly kind: 'opportunity_attack_window';
    readonly reactorId: TActorId;
    readonly moverId: TActorId;
  }[] = [];
  for (const source of request.reachSources) {
    if (
      !source.hostile ||
      !source.reactionAvailable ||
      includedReactors.has(source.reactorId) ||
      gridDistance(from, source.cell) > source.reach ||
      gridDistance(to, source.cell) <= source.reach
    ) {
      continue;
    }
    includedReactors.add(source.reactorId);
    windows.push({
      kind: 'opportunity_attack_window',
      reactorId: source.reactorId,
      moverId: request.actorId,
    });
  }
  return windows;
}

export function planMovement<TActorId extends string>(
  world: MovementWorld<TActorId>,
  request: MovementRequest<TActorId>,
): MovementPlan<TActorId> {
  const budget = validatedCost(request.budgetRemaining);
  if (!isCellInside(world.bounds, request.start)) {
    return { kind: 'illegal', reason: 'outside_grid', stepIndex: 0 };
  }

  const steps: MovementStep<TActorId>[] = [];
  let totalCost = 0;
  let from = request.start;
  for (let stepIndex = 0; stepIndex < request.path.length; stepIndex += 1) {
    const to = request.path[stepIndex];
    if (to === undefined || !isCellInside(world.bounds, to)) {
      return { kind: 'illegal', reason: 'outside_grid', stepIndex };
    }
    if (!isAdjacent(from, to)) {
      return { kind: 'illegal', reason: 'non_adjacent_step', stepIndex };
    }
    if (!world.canTraverseStep(request.actorId, from, to)) {
      return { kind: 'illegal', reason: 'illegal_transition', stepIndex };
    }
    const traversal = world.traversal(request.actorId, from, to);
    if (traversal.kind === 'blocked') {
      return { kind: 'illegal', reason: 'blocked_step', stepIndex };
    }
    if (
      stepIndex === request.path.length - 1 &&
      !traversal.canEnd &&
      request.cause !== 'forced'
    ) {
      return {
        kind: 'illegal',
        reason: 'occupied_destination',
        stepIndex,
      };
    }
    const cost = validatedCost(traversal.cost);
    totalCost += cost;
    if (totalCost > budget) {
      return { kind: 'illegal', reason: 'over_budget', stepIndex };
    }
    steps.push({
      from,
      to,
      cost,
      beforeLeaving: opportunityWindows(request, from, to),
    });
    from = to;
  }

  return {
    kind: 'legal',
    steps,
    totalCost: feet(totalCost),
    remaining: feet(budget - totalCost),
  };
}

export interface TurnMovement {
  readonly speed: Feet;
  readonly spent: Feet;
  readonly remaining: Feet;
}

export function startTurnMovement(speed: Feet): TurnMovement {
  const checkedSpeed = validatedCost(speed);
  return { speed: checkedSpeed, spent: feet(0), remaining: checkedSpeed };
}

export function spendMovement(
  current: TurnMovement,
  amount: Feet,
): TurnMovement {
  const checkedAmount = validatedCost(amount);
  if (checkedAmount > current.remaining) {
    throw new RangeError('Movement spend exceeds the remaining budget.');
  }
  const spent = feet(current.spent + checkedAmount);
  return {
    speed: current.speed,
    spent,
    remaining: feet(current.speed - spent),
  };
}
