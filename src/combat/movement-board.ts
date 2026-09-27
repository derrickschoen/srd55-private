import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { Brand } from '../domain/ids';
import type { EncounterState } from './encounter';
import { isCellInside, type BoardCell, type FootprintSide, type GridCell } from './grid';
import { assertSupportedGrid } from './grid-size';
import { terrainPassabilityAt } from './terrain';

/**
 * The movement board: one encounter state's movement facts on a flat, row-major grid.
 *
 * Every cell is one integer and every per-cell fact is one byte in a typed array, so a
 * movement question is arithmetic and array reads: no string keys, no `Set`s, no
 * `CreatureSpace` per step. Authored cells enter the board only through the grid's bounds
 * check (isCellInside), so an authored cell that is negative, fractional or off the grid
 * marks nothing. Such a cell can never lie under an in-bounds footprint either, so
 * dropping it changes no answer.
 *
 * The board is built once per state and never changes; states are immutable.
 *
 * Memory: every per-cell array is allocated once per board, never once per opening, region or
 * occupant. A board holds 11 bytes per cell (three one-byte masks and two four-byte compressed-row
 * offsets) plus four bytes per authored in-grid opening cell and per occupant cell, and building it
 * briefly needs eight more bytes per cell. So the grid-size contract (grid-size.ts) bounds a
 * board by the cell count, whatever the number of openings a valid encounter authors.
 */

/**
 * Row-major ordinal of a cell of one board, `row * columns + column`. Minted by this module's
 * checks: squareAnchor for a question's square, squareCell inside a square squareAnchor accepted,
 * and buildMovementBoard for authored cells after isCellInside. The movement world re-brands only
 * indices it stored from squareCell (its entered-cell scratch).
 */
export type CellIndex = Brand<number, 'CellIndex'>;

/** A cell no narrow opening covers; creature-size ordinals are 0 (Tiny) to 5 (Gargantuan). */
export const NO_OPENING = 127;

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
  /** The size each narrow opening is sized for, by opening ordinal (its position in authored order). */
  readonly openingSizes: readonly KnownCreatureSize[];
  /**
   * Opening coverage, compressed sparse rows: the openings covering cell i are
   * `openingOrdinals[openingStart[i] .. openingStart[i + 1])`, ascending (an opening that lists a
   * cell twice appears twice).
   */
  readonly openingStart: Int32Array;
  readonly openingOrdinals: Int32Array;
  /**
   * Creature occupancy, compressed sparse rows: the occupants of cell i are
   * `occupantOrdinals[occupantStart[i] .. occupantStart[i + 1])`, ascending, where an
   * ordinal is the occupant's position in the list the board was built from.
   */
  readonly occupantStart: Int32Array;
  readonly occupantOrdinals: Int32Array;
}

/**
 * The index of the anchor of the `side` x `side` square at `anchor`, or null when the
 * square does not lie on this board. A footprint that reaches past the grid from an
 * in-bounds anchor is an answer (null), not an error. Every CellIndex a movement question
 * reads starts here (squareCell only offsets inside a square this accepted), and this checks
 * the whole square against this board's own columns and rows, so no question reads out of
 * range, whatever grid the BoardCell was decoded against (a BoardCell is never negative).
 * The board's own build indexes authored cells separately, after isCellInside.
 */
export function squareAnchor(board: MovementBoard, anchor: BoardCell, side: FootprintSide): CellIndex | null {
  return anchor.column + side <= board.columns && anchor.row + side <= board.rows
    ? (anchor.row * board.columns + anchor.column) as CellIndex
    : null;
}

/**
 * The cell `columnOffset`, `rowOffset` (each below the side) inside a square `squareAnchor`
 * accepted. It derives a CellIndex from one squareAnchor gave; the offsets keep it on the board.
 */
export function squareCell(
  board: MovementBoard,
  anchor: CellIndex,
  columnOffset: number,
  rowOffset: number,
): CellIndex {
  return (anchor + rowOffset * board.columns + columnOffset) as CellIndex;
}

/** Whether narrow opening `ordinal` covers cell `index`. */
export function openingCovers(board: MovementBoard, index: CellIndex, ordinal: number): boolean {
  const end = board.openingStart[index + 1] ?? 0;
  for (let slot = board.openingStart[index] ?? 0; slot < end; slot += 1) {
    if (board.openingOrdinals[slot] === ordinal) return true;
  }
  return false;
}

/**
 * The in-grid cells of `groups` as compressed sparse rows: the ordinals of the groups listing cell
 * i are `ordinals[start[i] .. start[i + 1])`, ascending. `at` drops a cell off the grid.
 */
function compressedRows(
  cellCount: number,
  groups: readonly (readonly GridCell[])[],
  at: (cell: GridCell) => CellIndex | null,
): { readonly start: Int32Array; readonly ordinals: Int32Array } {
  const start = new Int32Array(cellCount + 1);
  if (groups.length === 0) return { start, ordinals: new Int32Array(0) };
  for (const cells of groups) {
    for (const cell of cells) {
      const index = at(cell);
      if (index !== null) start[index + 1] = (start[index + 1] ?? 0) + 1;
    }
  }
  for (let index = 0; index < cellCount; index += 1) {
    start[index + 1] = (start[index + 1] ?? 0) + (start[index] ?? 0);
  }
  const ordinals = new Int32Array(start[cellCount] ?? 0);
  const next = start.slice(0, cellCount);
  groups.forEach((cells, ordinal) => {
    for (const cell of cells) {
      const index = at(cell);
      if (index === null) continue;
      const slot = next[index] ?? 0;
      ordinals[slot] = ordinal;
      next[index] = slot + 1;
    }
  });
  return { start, ordinals };
}

/**
 * Builds the board of `state`. `occupantCells[ordinal]` is the stationary footprint of
 * occupant `ordinal`; the caller decides who occupies (living, placed creatures in token
 * order). Every array is sized by the cell count, so the board first checks the engine
 * grid-size contract (grid-size.ts) and throws GridSizeError before allocating anything
 * for a grid outside it. createEncounter and every decoder refuse such a grid already;
 * only a state spread together in memory can reach this check.
 */
export function buildMovementBoard(
  state: EncounterState,
  occupantCells: readonly (readonly GridCell[])[],
): MovementBoard {
  assertSupportedGrid(state.bounds);
  const { columns, rows } = state.bounds;
  const cellCount = columns * rows;
  const at = (cell: GridCell): CellIndex | null =>
    isCellInside(state.bounds, cell) ? (cell.row * columns + cell.column) as CellIndex : null;
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
  const regions = state.environment.narrowOpeningRegions;
  for (const opening of regions) {
    const ordinal = creatureSizes.indexOf(opening.sizedFor);
    for (const cell of opening.cells) {
      const index = at(cell);
      if (index !== null && ordinal < (narrowestOpening[index] ?? NO_OPENING)) narrowestOpening[index] = ordinal;
    }
  }
  const openings = compressedRows(cellCount, regions.map((opening) => opening.cells), at);
  const occupancy = compressedRows(cellCount, occupantCells, at);

  return {
    columns,
    rows,
    blocked,
    difficult,
    narrowestOpening,
    openingSizes: regions.map((opening) => opening.sizedFor),
    openingStart: openings.start,
    openingOrdinals: openings.ordinals,
    occupantStart: occupancy.start,
    occupantOrdinals: occupancy.ordinals,
  };
}
