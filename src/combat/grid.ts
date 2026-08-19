import { feet, type Feet } from './values';

export interface GridCell {
  readonly column: number;
  readonly row: number;
}

export interface GridBounds {
  readonly columns: number;
  readonly rows: number;
}

function isWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value);
}

export function isCellInside(bounds: GridBounds, cell: GridCell): boolean {
  return (
    isWholeNumber(bounds.columns) &&
    isWholeNumber(bounds.rows) &&
    bounds.columns > 0 &&
    bounds.rows > 0 &&
    isWholeNumber(cell.column) &&
    isWholeNumber(cell.row) &&
    cell.column >= 0 &&
    cell.column < bounds.columns &&
    cell.row >= 0 &&
    cell.row < bounds.rows
  );
}

/**
 * Returns eight-way neighbors in row-major order. This order is the stable
 * tie-break used by the pathfinder: top row to bottom row, then left to right.
 */
export function adjacentCells(
  bounds: GridBounds,
  cell: GridCell,
): readonly GridCell[] {
  if (!isCellInside(bounds, cell)) {
    return [];
  }

  const cells: GridCell[] = [];
  for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
    for (
      let column = cell.column - 1;
      column <= cell.column + 1;
      column += 1
    ) {
      if (column === cell.column && row === cell.row) {
        continue;
      }
      const candidate = { column, row };
      if (isCellInside(bounds, candidate)) {
        cells.push(candidate);
      }
    }
  }
  return cells;
}

/** Eight-way shortest-route distance on a 5-foot square grid. */
export function gridDistance(from: GridCell, to: GridCell): Feet {
  if (
    !isWholeNumber(from.column) ||
    !isWholeNumber(from.row) ||
    !isWholeNumber(to.column) ||
    !isWholeNumber(to.row)
  ) {
    throw new RangeError('Grid cells must use safe-integer coordinates.');
  }
  const steps = Math.max(
    Math.abs(to.column - from.column),
    Math.abs(to.row - from.row),
  );
  return feet(steps * 5);
}
