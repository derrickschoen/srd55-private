import type { Brand } from '../domain/ids';
import { EncounterRuleError } from './encounter-rule-error';
import { feet, type Feet } from './values';

export interface GridCell {
  readonly column: number;
  readonly row: number;
}

export interface GridBounds {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Shared obstacle representation for movement and template sight lines.
 * A blocked cell is an impassable, opaque 5-foot square.
 */
export interface GridObstacles {
  readonly blockedCells: readonly GridCell[];
}

function isWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value);
}

/**
 * A cell inside the grid it was decoded against: whole-number coordinates with
 * 0 <= column < columns and 0 <= row < rows. `boardCell` is the only function that
 * mints one, so a negative, fractional or off-grid position cannot be asked a
 * movement question: that program does not compile. The brand exists only in the
 * type; the value is the caller's own cell object, unchanged.
 */
export type BoardCell = Brand<GridCell, 'BoardCell'>;

/** The decode-time bounds check: the cell itself when it lies inside `bounds`, otherwise null. */
export function boardCell(bounds: GridBounds, cell: GridCell): BoardCell | null {
  return isCellInside(bounds, cell) ? cell as BoardCell : null;
}

/** A position that must be a cell of its grid and is not: a loaded token anchor, an actor's own anchor. */
export class OffGridAnchorError extends EncounterRuleError {
  override readonly name = 'OffGridAnchorError' as const;

  constructor(
    readonly label: string,
    readonly position: unknown,
    readonly bounds: GridBounds,
  ) {
    super('validation',
      `${label} ${JSON.stringify(position) ?? String(position)} is not a cell of the ${String(bounds.columns)} x ${String(bounds.rows)} grid.`);
  }
}

/**
 * `boardCell` for a position the engine already holds as a creature's anchor, where an
 * off-grid value is a broken state rather than an answer: it throws OffGridAnchorError
 * instead of returning null. Accepts any value, so a decoder can hand it an unchecked one.
 */
export function requireBoardCell(bounds: GridBounds, position: unknown, label: string): BoardCell {
  const cell = typeof position === 'object' && position !== null
    ? position as { readonly column?: unknown; readonly row?: unknown }
    : {};
  const decoded = typeof cell.column === 'number' && typeof cell.row === 'number'
    ? boardCell(bounds, { column: cell.column, row: cell.row })
    : null;
  if (decoded === null) throw new OffGridAnchorError(label, position, bounds);
  return decoded;
}

/**
 * The decode-time anchor check of a loaded state (D895: a malformed position is
 * unconstructible): every token on the board must stand on a cell of the state's own
 * grid. A footprint may still reach past the grid from an in-bounds anchor, as a Huge
 * creature's does on the last two columns; the movement board answers that step by step.
 * Throws OffGridAnchorError naming the first token that does not, TypeError when `tokens`
 * is not an array.
 */
export function assertTokenAnchorsOnGrid(bounds: GridBounds, tokens: unknown, label: string): void {
  if (!Array.isArray(tokens)) throw new TypeError(`${label} must be an array.`);
  tokens.forEach((token: unknown, index) => {
    const position = typeof token === 'object' && token !== null
      ? (token as { readonly position?: unknown }).position
      : undefined;
    requireBoardCell(bounds, position, `${label}[${String(index)}] anchor`);
  });
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
): readonly BoardCell[] {
  if (!isCellInside(bounds, cell)) {
    return [];
  }

  const cells: BoardCell[] = [];
  for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
    for (
      let column = cell.column - 1;
      column <= cell.column + 1;
      column += 1
    ) {
      if (column === cell.column && row === cell.row) {
        continue;
      }
      const candidate = boardCell(bounds, { column, row });
      if (candidate !== null) {
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
