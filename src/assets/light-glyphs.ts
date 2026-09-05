/**
 * D525 'symbol' light encoding: three original 7×7 marks stamped in a cell's
 * top-left corner. Sun = bright light, crescent = dim light, filled disc =
 * darkness. The same rows draw the board tile (pixel-art.ts) and the legend
 * swatch (board-chrome.ts), so the legend can never drift from the board.
 */
import { neutral, ramp, type PaletteColorRef } from './palette';

export const LIGHT_GLYPH_SIZE = 7;
/** Tile pixel where the glyph's top-left lands; the 1-px outline sits at 1,1. */
export const LIGHT_GLYPH_ORIGIN = 2;

export const LIGHT_GLYPH_KINDS = ['sun', 'crescent', 'disc'] as const;
export type LightGlyphKind = (typeof LIGHT_GLYPH_KINDS)[number];

const M = (...rows: readonly string[]): readonly string[] => {
  if (
    rows.length !== LIGHT_GLYPH_SIZE ||
    rows.some((row) => row.length !== LIGHT_GLYPH_SIZE || /[^#.]/u.test(row))
  ) {
    throw new Error('Light glyphs are exactly 7×7 of # and .');
  }
  return Object.freeze(rows);
};

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

/**
 * The one-pixel ring around a `#`/`.` bitmap: a grid two wider and two taller
 * whose `#` cells are exactly the empty cells touching ink (8-neighbourhood).
 * The board tile and the legend swatch both draw their outline from this.
 */
export function outlineRows(rows: readonly string[]): readonly string[] {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (height === 0 || width === 0 || rows.some((row) => row.length !== width || /[^#.]/u.test(row))) {
    throw new Error('Pixel glyphs are rectangular grids of # and .');
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

export interface LightGlyph {
  readonly rows: readonly string[];
  /** Fill of the mark. */
  readonly ink: PaletteColorRef;
  /** One-pixel ring around the mark so it reads on any floor tone. */
  readonly outline: PaletteColorRef;
}

export const LIGHT_GLYPHS: Readonly<Record<LightGlyphKind, LightGlyph>> = Object.freeze({
  sun: {
    // eight rays touching a hollow core: one connected mark, so the outline ring never swallows the rays
    rows: M(
      '#..#..#',
      '.#.#.#.',
      '..###..',
      '###.###',
      '..###..',
      '.#.#.#.',
      '#..#..#',
    ),
    ink: ramp('skin', 6),
    outline: neutral(0),
  },
  crescent: {
    rows: M(
      '..####.',
      '.##....',
      '##.....',
      '##.....',
      '##.....',
      '.##....',
      '..####.',
    ),
    ink: ramp('cloth-cool', 6),
    outline: neutral(0),
  },
  disc: {
    rows: M(
      '..###..',
      '.#####.',
      '#######',
      '#######',
      '#######',
      '.#####.',
      '..###..',
    ),
    ink: neutral(0),
    outline: neutral(8),
  },
});
