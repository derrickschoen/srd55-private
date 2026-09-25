import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { Brand } from '../domain/ids';
import type { EncounterState } from './encounter';
import { boardCell, type BoardCell, type GridCell } from './grid';
import { terrainPassabilityAt } from './terrain';

/**
 * The movement board: one encounter state's movement facts on a flat, row-major grid.
 *
 * Every cell is one integer and every per-cell fact is one byte in a typed array, so a
 * movement question is arithmetic and array reads: no string keys, no `Set`s, no
 * `CreatureSpace` per step. Cells enter the board only through `boardCell`, the
 * decode-time bounds check, so an authored cell that is negative, fractional or off the
 * grid marks nothing. Such a cell can never lie under an in-bounds footprint either, so
 * dropping it changes no answer.
 *
 * The board is built once per state and never changes; states are immutable.
 */

/** Row-major ordinal of a cell of one board, `row * columns + column`. Minted only here. */
export type CellIndex = Brand<number, 'CellIndex'>;

/** Side of a creature's square footprint in cells (SRD Creature Size table: 1, 2, 3 or 4). */
export type FootprintSide = 1 | 2 | 3 | 4;

/** A cell no narrow opening covers; creature-size ordinals are 0 (Tiny) to 5 (Gargantuan). */
export const NO_OPENING = 127;

/** One authored narrow opening, in authored order. */
export interface NarrowOpeningMask {
  readonly sizedFor: KnownCreatureSize;
  /** 1 where the opening covers the cell. */
  readonly covers: Uint8Array;
}

export interface MovementBoard {
  readonly columns: number;
  readonly rows: number;
  /** 1 = impassable: a blocked cell, a blocking world-object footprint cell or a blocked movement region. */
  readonly blocked: Uint8Array;
  /** 1 = difficult terrain from a region or a world-object footprint (creature spaces are per actor). */
  readonly difficult: Uint8Array;
  /**
   * The smallest `creatureSizes` ordinal among the narrow openings covering the cell, or
   * NO_OPENING. An opening sized for an unknown size holds -1, as `indexOf` gives it.
   */
  readonly narrowestOpening: Int8Array;
  readonly openings: readonly NarrowOpeningMask[];
  /**
   * Creature occupancy, compressed sparse rows: the occupants of cell i are
   * `occupantOrdinals[occupantStart[i] .. occupantStart[i + 1])`, ascending, where an
   * ordinal is the occupant's position in the list the board was built from.
   */
  readonly occupantStart: Int32Array;
  readonly occupantOrdinals: Int32Array;
}

/** The index of a board cell. The brand says it is inside the grid, so no check is needed here. */
export function cellIndex(board: MovementBoard, cell: BoardCell): CellIndex {
  return (cell.row * board.columns + cell.column) as CellIndex;
}

/**
 * Whether the `side` x `side` square anchored at `anchor` lies on the board. A footprint
 * that reaches past the grid from an in-bounds anchor is an answer, not an error.
 */
export function squareFits(board: MovementBoard, anchor: BoardCell, side: FootprintSide): boolean {
  return anchor.column + side <= board.columns && anchor.row + side <= board.rows;
}

/** The cell `columnOffset`, `rowOffset` inside a square that `squareFits` accepted. */
export function squareCell(
  board: MovementBoard,
  anchor: CellIndex,
  columnOffset: number,
  rowOffset: number,
): CellIndex {
  return (anchor + rowOffset * board.columns + columnOffset) as CellIndex;
}

function wholeGridCellCount(state: EncounterState): number {
  const { columns, rows } = state.bounds;
  return Number.isSafeInteger(columns) && Number.isSafeInteger(rows) && columns > 0 && rows > 0
    ? columns * rows
    : 0;
}

/**
 * Builds the board of `state`. `occupantCells[ordinal]` is the stationary footprint of
 * occupant `ordinal`; the caller decides who occupies (living, placed creatures in token
 * order). A state whose bounds are not a positive whole grid gets an empty board: no
 * `BoardCell` of such a grid exists, so no question can reach it.
 */
export function buildMovementBoard(
  state: EncounterState,
  occupantCells: readonly (readonly GridCell[])[],
): MovementBoard {
  const cellCount = wholeGridCellCount(state);
  const columns = cellCount === 0 ? 0 : state.bounds.columns;
  const rows = cellCount === 0 ? 0 : state.bounds.rows;
  const at = (cell: GridCell): CellIndex | null => {
    const decoded = boardCell(state.bounds, cell);
    return decoded === null ? null : (decoded.row * columns + decoded.column) as CellIndex;
  };
  const mark = (mask: Uint8Array, cell: GridCell): void => {
    const index = at(cell);
    if (index !== null) mask[index] = 1;
  };

  const blocked = new Uint8Array(cellCount);
  const difficult = new Uint8Array(cellCount);
  for (const cell of state.blockedCells) mark(blocked, cell);
  for (const object of state.worldObjects) {
    for (const cell of object.footprint) {
      const passability = terrainPassabilityAt(state, cell);
      if (passability === 'blocked') mark(blocked, cell);
      else if (passability === 'difficult') mark(difficult, cell);
    }
  }
  for (const region of state.environment.movementRegions ?? []) {
    if (region.entry === 'blocked') for (const cell of region.cells) mark(blocked, cell);
  }
  for (const region of state.environment.difficultTerrainRegions) {
    for (const cell of region.cells) mark(difficult, cell);
  }

  const narrowestOpening = new Int8Array(cellCount).fill(NO_OPENING);
  const openings = state.environment.narrowOpeningRegions.map((opening): NarrowOpeningMask => {
    const ordinal = creatureSizes.indexOf(opening.sizedFor);
    const covers = new Uint8Array(cellCount);
    for (const cell of opening.cells) {
      const index = at(cell);
      if (index === null) continue;
      covers[index] = 1;
      if (ordinal < (narrowestOpening[index] ?? NO_OPENING)) narrowestOpening[index] = ordinal;
    }
    return { sizedFor: opening.sizedFor, covers };
  });

  const occupantStart = new Int32Array(cellCount + 1);
  for (const cells of occupantCells) {
    for (const cell of cells) {
      const index = at(cell);
      if (index !== null) occupantStart[index + 1] = (occupantStart[index + 1] ?? 0) + 1;
    }
  }
  for (let index = 0; index < cellCount; index += 1) {
    occupantStart[index + 1] = (occupantStart[index + 1] ?? 0) + (occupantStart[index] ?? 0);
  }
  const occupantOrdinals = new Int32Array(occupantStart[cellCount] ?? 0);
  const next = occupantStart.slice(0, cellCount);
  occupantCells.forEach((cells, ordinal) => {
    for (const cell of cells) {
      const index = at(cell);
      if (index === null) continue;
      const slot = next[index] ?? 0;
      occupantOrdinals[slot] = ordinal;
      next[index] = slot + 1;
    }
  });

  return { columns, rows, blocked, difficult, narrowestOpening, openings, occupantStart, occupantOrdinals };
}
