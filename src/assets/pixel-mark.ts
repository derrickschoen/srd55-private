/**
 * One-ink pixel marks: the `#`/`.` bitmaps behind the light glyphs (D525
 * 'light' mode), the D525 cell-glyph vocabulary and the pixel font's life
 * glyphs. The same rows draw a board tile (pixel-art.ts) and a legend swatch
 * (board-chrome.ts), so a legend can never drift from the board it explains.
 */
import type { PaletteColorRef } from './palette';

export interface PixelMark {
  readonly rows: readonly string[];
  /** Fill of the mark. */
  readonly ink: PaletteColorRef;
  /** One-pixel ring around the mark so it reads on any floor tone. */
  readonly outline: PaletteColorRef;
}

function assertGrid(rows: readonly string[], size: number, what: string): void {
  if (rows.length !== size || rows.some((row) => row.length !== size || /[^#.]/u.test(row))) {
    throw new Error(`${what} are exactly ${String(size)}×${String(size)} of # and .`);
  }
}

/** A validator for square marks of one size; throws at module load on a malformed bitmap. */
export function squareMark(size: number, what: string): (...rows: readonly string[]) => readonly string[] {
  return (...rows) => {
    assertGrid(rows, size, what);
    return Object.freeze(rows);
  };
}

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

/**
 * The one-pixel ring around a `#`/`.` bitmap: a grid two wider and two taller
 * whose `#` cells are exactly the empty cells touching ink (8-neighbourhood).
 * Interior gaps that touch ink are part of the ring, which is how a mark can
 * carry a dark bar drawn as a row of `.`.
 */
export function outlineRows(rows: readonly string[]): readonly string[] {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (height === 0 || width === 0 || rows.some((row) => row.length !== width || /[^#.]/u.test(row))) {
    throw new Error('Pixel marks are rectangular grids of # and .');
  }
  const filled = (x: number, y: number): boolean => rows[y]?.[x] === '#';
  return Array.from({ length: height + 2 }, (_row, y) =>
    Array.from({ length: width + 2 }, (_cell, x) => {
      const gx = x - 1;
      const gy = y - 1;
      if (filled(gx, gy)) return '.';
      return NEIGHBOURS.some(([dx, dy]) => filled(gx + dx, gy + dy)) ? '#' : '.';
    }).join(''));
}

export function inkCount(rows: readonly string[]): number {
  return rows.reduce((total, row) => total + (row.match(/#/gu)?.length ?? 0), 0);
}

/**
 * A smaller square mark centred in a larger square (the 7×7 light glyphs
 * compared against the 9×9 cell glyphs). Odd differences are split with the
 * extra column and row on the right and bottom.
 */
export function padMark(rows: readonly string[], size: number): readonly string[] {
  const inner = rows.length;
  if (inner > size) throw new Error(`Cannot pad a ${String(inner)}-px mark into ${String(size)} px.`);
  const before = Math.floor((size - inner) / 2);
  const after = size - inner - before;
  const blank = '.'.repeat(size);
  return [
    ...Array.from({ length: before }, () => blank),
    ...rows.map((row) => `${'.'.repeat(before)}${row}${'.'.repeat(after)}`),
    ...Array.from({ length: after }, () => blank),
  ];
}

/** Pixels that differ between two equally sized marks. */
export function hammingDistance(left: readonly string[], right: readonly string[]): number {
  if (left.length !== right.length || left.some((row, index) => row.length !== right[index]?.length)) {
    throw new Error('Hamming distance needs two marks of the same size.');
  }
  let distance = 0;
  left.forEach((row, y) => {
    Array.from(row).forEach((cell, x) => {
      if (cell !== right[y]?.[x]) distance += 1;
    });
  });
  return distance;
}
