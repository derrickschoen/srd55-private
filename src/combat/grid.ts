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
 * 0 <= column < columns and 0 <= row < rows. Only this module mints one (`boardCell`,
 * and `adjacentCells` for the neighbours of one), so a negative, fractional or off-grid
 * position cannot be asked a movement question: that program does not compile. Every
 * BoardCell is a fresh frozen {column, row}; no caller holds a reference through which
 * it could change.
 *
 * The brand does not name its grid, and need not: one encounter has one immutable
 * bounds. createEncounter and every decoder fix it (grid-size.ts), no reducer changes
 * it, and every movement board and BoardCell of the encounter's states is decoded
 * against it. A BoardCell from some other grid still cannot index a board out of range:
 * the movement board mints a cell index only through its square fit check against its
 * own columns and rows (movement-board.ts, squareAnchor), and no BoardCell is negative.
 */
export type BoardCell = Brand<GridCell, 'BoardCell'>;

function mintBoardCell(column: number, row: number): BoardCell {
  return Object.freeze({ column, row }) as BoardCell;
}

/** The decode-time bounds check: a fresh frozen copy of the cell when it lies inside `bounds`, otherwise null. */
export function boardCell(bounds: GridBounds, cell: GridCell): BoardCell | null {
  return isCellInside(bounds, cell) ? mintBoardCell(cell.column, cell.row) : null;
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

/** A loaded token whose anchor passed the decode-time check; every other field is as loaded. */
export type DecodedAnchorToken = { readonly [field: string]: unknown; readonly position: BoardCell };

/**
 * The decode-time anchor check of loaded tokens (D895: a malformed position is unconstructible):
 * every token must stand on a cell of its state's own grid. It returns each token with its
 * position replaced by the minted BoardCell, so a decoder installs the checked value and never
 * casts the loaded one. A footprint may still reach past the grid from an in-bounds anchor, as a
 * Huge creature's does on the last two columns; the movement board answers that step by step.
 * Throws OffGridAnchorError naming the first token that is off the grid or has no anchor,
 * TypeError when `tokens` is not an array.
 */
export function decodeTokenAnchors(bounds: GridBounds, tokens: unknown, label: string): readonly DecodedAnchorToken[] {
  if (!Array.isArray(tokens)) throw new TypeError(`${label} must be an array.`);
  return tokens.map((token: unknown, index): DecodedAnchorToken => {
    const loaded = typeof token === 'object' && token !== null ? token as { readonly [field: string]: unknown } : {};
    // A token that is not an object has no anchor, and requireBoardCell refuses it.
    const position = requireBoardCell(bounds, loaded['position'], `${label}[${String(index)}] anchor`);
    return { ...loaded, position };
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

  // `cell` is a whole-number cell of a whole-number grid, so every neighbour inside the
  // four edges is a cell of the grid.
  const cells: BoardCell[] = [];
  for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
    if (row < 0 || row >= bounds.rows) continue;
    for (let column = cell.column - 1; column <= cell.column + 1; column += 1) {
      if (column < 0 || column >= bounds.columns || (column === cell.column && row === cell.row)) continue;
      cells.push(mintBoardCell(column, row));
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
