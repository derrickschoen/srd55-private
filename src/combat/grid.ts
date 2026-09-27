import type { KnownCreatureSize } from '../domain/enums';
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
 * position cannot be asked a movement question: that program does not compile. boardCell
 * and adjacentCells return fresh frozen cells, so no caller holds a reference through which
 * a minted cell could change. A copy keeps the brand and the on-grid value but not the freeze
 * (a spread, or a structured clone of a whole state, as the session stores make).
 *
 * The brand does not name its grid. One encounter has one immutable bounds: createEncounter
 * and every decoder fix it (grid-size.ts), no reducer changes it, and the encounter's token
 * anchors and movement questions are minted against it. A state can still be spread onto
 * other bounds in memory, so a BoardCell can meet a grid it was not decoded against, and the
 * type does not stop that. Two runtime guards do. The movement callers re-check the actor's
 * own anchor against the state's grid (requireBoardCell, OffGridAnchorError). And the movement
 * board's array safety rests on squareAnchor's dimension check (movement-board.ts): every
 * CellIndex a movement question reads comes from squareAnchor, which checks the whole square
 * against the board's own columns and rows (no BoardCell is negative), or is derived inside a
 * square squareAnchor accepted.
 */
export type BoardCell = Brand<GridCell, 'BoardCell'>;

/** Side of a creature's square footprint in cells: Tiny, Small and Medium 1, Large 2, Huge 3, Gargantuan 4 (D511). */
export type FootprintSide = 1 | 2 | 3 | 4;

type SidesThrough<S extends FootprintSide> =
  S extends 1 ? 'FootprintSide1'
    : S extends 2 ? 'FootprintSide1' | 'FootprintSide2'
      : S extends 3 ? 'FootprintSide1' | 'FootprintSide2' | 'FootprintSide3'
        : 'FootprintSide1' | 'FootprintSide2' | 'FootprintSide3' | 'FootprintSide4';

/**
 * A BoardCell whose side x side square lies wholly on its grid: the anchor of a creature's whole body
 * (owner D900: a body past the edge is impossible to express). A proof for a larger side is also one for
 * every smaller side, so a FootprintAnchor<3> is a FootprintAnchor<2>, a FootprintAnchor<1> and a
 * BoardCell; the converse does not compile. Only `footprintAnchor` here and the checked mints of
 * token-placement.ts produce one.
 */
export type FootprintAnchor<S extends FootprintSide> = Brand<BoardCell, SidesThrough<S>>;

function mintBoardCell(column: number, row: number): BoardCell {
  return Object.freeze({ column, row }) as BoardCell;
}

/**
 * The whole-body check: a fresh frozen anchor when the side x side square at `cell` lies inside
 * `bounds`, otherwise null (an off-grid anchor included).
 */
export function footprintAnchor<S extends FootprintSide>(bounds: GridBounds, cell: GridCell, side: S): FootprintAnchor<S> | null {
  if (!isCellInside(bounds, cell)) return null;
  if (!(cell.column + side <= bounds.columns)) return null;
  if (!(cell.row + side <= bounds.rows)) return null;
  return mintBoardCell(cell.column, cell.row) as FootprintAnchor<S>;
}

/**
 * A creature body that must lie on its grid and does not: its anchor is a cell of the grid, but the
 * side x side square it anchors reaches past an edge (owner D900).
 */
export class OffGridBodyError extends EncounterRuleError {
  override readonly name = 'OffGridBodyError' as const;

  constructor(
    readonly label: string,
    readonly anchor: GridCell,
    readonly side: FootprintSide,
    readonly size: KnownCreatureSize,
    readonly bounds: GridBounds,
  ) {
    super('validation',
      `${label}: a ${size} body (${String(side)} x ${String(side)}) anchored at ${String(anchor.column)},${String(anchor.row)} ` +
      `leaves the ${String(bounds.columns)} x ${String(bounds.rows)} grid.`);
  }
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
