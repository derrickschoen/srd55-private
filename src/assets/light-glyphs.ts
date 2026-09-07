/**
 * D525 light glyphs ('light' and 'full' board-glyph modes): three original
 * 7×7 marks stamped in a cell's top-left corner. Sun = bright light,
 * crescent = dim light, filled disc = darkness. The same rows draw the board
 * tile (pixel-art.ts) and the legend swatch (board-chrome.ts).
 */
import { neutral, ramp } from './palette';
import { squareMark, type PixelMark } from './pixel-mark';

export const LIGHT_GLYPH_SIZE = 7;
/** Tile pixel where the glyph's top-left lands; the 1-px outline sits at 1,1. */
export const LIGHT_GLYPH_ORIGIN = 2;

export const LIGHT_GLYPH_KINDS = ['sun', 'crescent', 'disc'] as const;
export type LightGlyphKind = (typeof LIGHT_GLYPH_KINDS)[number];

const M = squareMark(LIGHT_GLYPH_SIZE, 'Light glyphs');

export const LIGHT_GLYPHS: Readonly<Record<LightGlyphKind, PixelMark>> = Object.freeze({
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
