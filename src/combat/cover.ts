import { combatantSpace, combatantSpaceAt } from './combat-rules';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import type { CombatantId } from './values';
import type { CoverTier, WorldObject } from './world-objects';

const COVER_ORDER: Readonly<Record<CoverTier, number>> = {
  none: 0,
  half: 1,
  three_quarters: 2,
  total: 3,
};

function cellKey(cell: GridCell): string {
  return `${String(cell.column)}:${String(cell.row)}`;
}

/** The deterministic cell-line rasterizer shared by sight and cover. */
export function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));
  if (steps <= 1) return [];
  const result: GridCell[] = [];
  const seen = new Set<string>();
  for (let step = 1; step < steps; step += 1) {
    const cell = {
      column: Math.round(from.column + columnDelta * step / steps),
      row: Math.round(from.row + rowDelta * step / steps),
    };
    const key = cellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }
  return result;
}

function objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {
  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  let cover: CoverTier = 'none';
  for (const cell of rasterizeInterveningCells(from, to)) {
    for (const object of objects) {
      if (objectOccupiesCell(object, cell) && COVER_ORDER[object.blocking.cover] > COVER_ORDER[cover]) {
        cover = object.blocking.cover;
      }
    }
  }
  return cover;
}

export interface CreatureCoverOptions {
  /** Optional DM variant. The default creature contribution is always Half Cover. */
  readonly creaturesGrantThreeQuarters?: boolean;
  /** Evaluate a hypothetical source placement without changing canonical state. */
  readonly sourceAnchor?: GridCell;
}

export interface CombatantCoverResult {
  readonly tier: CoverTier;
  readonly sourceIds: readonly string[];
}

interface CornerPoint {
  readonly column: number;
  readonly row: number;
}

function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
  const minimumColumn = Math.min(...cells.map((cell) => cell.column));
  const maximumColumn = Math.max(...cells.map((cell) => cell.column)) + 1;
  const minimumRow = Math.min(...cells.map((cell) => cell.row));
  const maximumRow = Math.max(...cells.map((cell) => cell.row)) + 1;
  return [
    { column: minimumColumn, row: minimumRow },
    { column: maximumColumn, row: minimumRow },
    { column: minimumColumn, row: maximumRow },
    { column: maximumColumn, row: maximumRow },
  ];
}

function cellCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
  const corners: CornerPoint[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    for (const corner of [
      { column: cell.column, row: cell.row },
      { column: cell.column + 1, row: cell.row },
      { column: cell.column, row: cell.row + 1 },
      { column: cell.column + 1, row: cell.row + 1 },
    ]) {
      const key = `${String(corner.column)}:${String(corner.row)}`;
      if (!seen.has(key)) {
        seen.add(key);
        corners.push(corner);
      }
    }
  }
  return corners;
}

function axisIntersection(
  start: number,
  delta: number,
  minimum: number,
  maximum: number,
): readonly [number, number] | null {
  if (delta === 0) return start > minimum && start < maximum
    ? [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]
    : null;
  const first = (minimum - start) / delta;
  const second = (maximum - start) / delta;
  return first <= second ? [first, second] : [second, first];
}

/** A corner ray blocks only when it crosses a cell interior, not merely its boundary. */
function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {
  const epsilon = 1e-9;
  const column = axisIntersection(
    from.column,
    to.column - from.column,
    cell.column + epsilon,
    cell.column + 1 - epsilon,
  );
  const row = axisIntersection(
    from.row,
    to.row - from.row,
    cell.row + epsilon,
    cell.row + 1 - epsilon,
  );
  if (column === null || row === null) return false;
  const entry = Math.max(0, column[0], row[0]);
  const exit = Math.min(1, column[1], row[1]);
  return entry <= exit && exit > 0 && entry < 1;
}

/** Rasterizes a corner-to-corner ray against candidate occupied cells in their given stable order. */
function rasterizeCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  return candidates.filter((cell) => cornerLineCrossesCell(from, to, cell));
}

/** Least-obstructed occupied-cell line, with one non-stacking creature tier. */
export function coverBetweenCombatants(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureCoverOptions = {},
): CombatantCoverResult {
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const target = combatantSpace(state, targetId);
  const creatureTier: CoverTier = options.creaturesGrantThreeQuarters === true ? 'three_quarters' : 'half';
  const occupyingCreatures = state.combatants.flatMap((candidate) => {
    const id = candidate.profile.id;
    if (id === sourceId || id === targetId || candidate.life === 'dead') return [];
    if (!state.tokens.some((entry) => entry.combatantId === id)) return [];
    return [{ id, cells: combatantSpace(state, id).cells }];
  });

  let objectTier: CoverTier = 'total';
  let objectSources: readonly string[] = [];
  for (const sourceCell of source.cells) {
    for (const targetCell of target.cells) {
      const lineCells = rasterizeInterveningCells(sourceCell, targetCell);
      const tier = coverTierBetweenObjects(state.worldObjects, sourceCell, targetCell);
      const sourceIds = state.worldObjects
        .filter((object) => lineCells.some((cell) => objectOccupiesCell(object, cell)))
        .map((object) => String(object.id));
      sourceIds.sort();
      if (
        COVER_ORDER[tier] < COVER_ORDER[objectTier] ||
        (COVER_ORDER[tier] === COVER_ORDER[objectTier] && sourceIds.join('\0') < objectSources.join('\0'))
      ) {
        objectTier = tier;
        objectSources = sourceIds;
      }
    }
  }

  const targetCorners = outerCorners(target.cells);
  let creatureSources: readonly string[] = occupyingCreatures.map((creature) => String(creature.id)).sort();
  for (const sourceCorner of cellCorners(source.cells)) {
    const blockedBy = occupyingCreatures
      .filter((creature) => targetCorners.some((targetCorner) =>
        rasterizeCornerLine(sourceCorner, targetCorner, creature.cells).length > 0))
      .map((creature) => String(creature.id))
      .sort();
    if (blockedBy.length === 0) {
      creatureSources = [];
      break;
    }
    if (blockedBy.join('\0') < creatureSources.join('\0')) creatureSources = blockedBy;
  }
  const resolvedCreatureTier: CoverTier = creatureSources.length === 0 ? 'none' : creatureTier;
  const tier = COVER_ORDER[objectTier] >= COVER_ORDER[resolvedCreatureTier] ? objectTier : resolvedCreatureTier;
  const sourceIds = [
    ...(COVER_ORDER[objectTier] === COVER_ORDER[tier] ? objectSources : []),
    ...(COVER_ORDER[resolvedCreatureTier] === COVER_ORDER[tier] ? creatureSources : []),
  ].sort();
  return { tier, sourceIds };
}
