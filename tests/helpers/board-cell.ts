import { boardCell, type BoardCell, type GridBounds, type GridCell } from '../../src/combat/grid';

/** A test's hand-placed cell, decoded as the engine decodes every movement anchor. */
export function onBoard(bounds: GridBounds, cell: GridCell): BoardCell {
  const decoded = boardCell(bounds, cell);
  if (decoded === null) throw new Error(`Test cell ${String(cell.column)},${String(cell.row)} is outside the grid.`);
  return decoded;
}
