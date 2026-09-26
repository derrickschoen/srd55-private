import { EncounterRuleError } from './encounter-rule-error';
import type { GridBounds } from './grid';

/**
 * The engine grid-size contract: an encounter grid has positive safe-integer columns and rows
 * and at most MAX_GRID_CELLS cells.
 *
 * The movement board's per-cell structures are sized by columns x rows and allocated once per
 * state, never once per authored opening, region, area or creature: its masks and its compressed
 * opening and occupancy rows (movement-board.ts states the bytes per cell). What grows with the
 * authored content (opening and occupant cells) or with the questions asked (the movement
 * world's per-area difficult-terrain memos, which hold only the cells a traversal visited) is
 * never multiplied by the cell count. So this one number, times a small constant, bounds the
 * movement board's dense memory, and a valid encounter cannot make it allocate more. Transient
 * whole-grid passes elsewhere (an area template with no candidate list enumerates every cell,
 * templates.ts) are proportional to the cell count too, and this contract bounds them the same way.
 *
 * It is enforced with a GridSizeError wherever a grid enters the engine: `createEncounter`,
 * and every decoder that turns stored or transmitted bytes into an EncounterState (the arena
 * and session state codec, the saved-session revision decoder and the rollout-capture
 * reconstruction). No reducer changes a state's bounds, so every state reached from those
 * entry points keeps a supported grid.
 *
 * 1,048,576 cells is a 1,024 x 1,024 grid, 5,120 feet on a side. Measured over the whole
 * tracked tree on 2026-09-26: the largest grid in any committed fixture or stored sample is
 * 24 x 24 (576 cells), the largest any test builds is 80 x 80 (6,400 cells), and every
 * generator and importer caps its grid at 64 x 64 (4,096 cells) or below. The limit is 163
 * times the largest of them. The limit is on cells only: a long, thin grid inside it is
 * supported, because the structures above grow with the cell count, not with either side.
 */
export const MAX_GRID_CELLS = 1_048_576;

export type GridSizeProblem = 'not_positive_whole' | 'over_max_cells';

/** A grid outside the engine grid-size contract, refused where it entered the engine. */
export class GridSizeError extends EncounterRuleError {
  override readonly name = 'GridSizeError' as const;

  constructor(
    readonly problem: GridSizeProblem,
    readonly columns: unknown,
    readonly rows: unknown,
  ) {
    super('validation', problem === 'over_max_cells'
      ? `A ${String(columns)} x ${String(rows)} grid exceeds MAX_GRID_CELLS (${String(MAX_GRID_CELLS)} cells).`
      : `Grid bounds must be positive safe integers, not ${String(columns)} x ${String(rows)}.`);
  }
}

/** The grid-size contract check. Throws GridSizeError for any grid outside it. */
export function assertSupportedGrid(
  bounds: { readonly columns: unknown; readonly rows: unknown },
): asserts bounds is GridBounds {
  const { columns, rows } = bounds;
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || (columns as number) < 1 || (rows as number) < 1) {
    throw new GridSizeError('not_positive_whole', columns, rows);
  }
  if ((columns as number) * (rows as number) > MAX_GRID_CELLS) {
    throw new GridSizeError('over_max_cells', columns, rows);
  }
}
