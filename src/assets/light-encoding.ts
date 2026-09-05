/**
 * D525: the light-level model behind the board's glyphs. The probe (D519)
 * showed Luna reading the warm tint on bright cells as shadow, and reading a
 * corner glyph per level well, so the 'light' and 'full' board-glyph modes
 * (board-glyphs.ts) stamp one of three marks in the top-left corner while
 * 'none' keeps the pre-D525 tints. Everything here is pure and structural so
 * the render model, the DM legend and the probe's primer share one source of
 * truth.
 */
import { drawsLightGlyphs, type BoardGlyphMode } from './board-glyphs';
import { LIGHT_GLYPHS, type LightGlyphKind } from './light-glyphs';
import type { LightGlyphEffect } from './pixel-art';
import type { PixelMark } from './pixel-mark';

/** Ordered: ties in `roomDefaultLight` resolve toward the earlier entry. */
export const LIGHT_LEVELS = ['bright', 'dim', 'darkness'] as const;
export type LightLevel = (typeof LIGHT_LEVELS)[number];

/** A cell no light region names; the engine, the prose and the probe's fact sheet all assume this. */
export const UNREGIONED_LIGHT: LightLevel = 'bright';

export interface LightRegionShape {
  readonly cells: readonly { readonly column: number; readonly row: number }[];
  readonly level: LightLevel;
}

function cellKey(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

/**
 * The effective level of every cell in the bounds, keyed `column,row`. A later
 * region overrides an earlier one on a shared cell, matching the probe's fact
 * sheet (deriveScreenshotFactSheet) so the picture and the truth agree.
 */
export function cellLightLevels(
  bounds: { readonly columns: number; readonly rows: number },
  regions: readonly LightRegionShape[],
): ReadonlyMap<string, LightLevel> {
  const levels = new Map<string, LightLevel>();
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) {
      levels.set(cellKey({ column, row }), UNREGIONED_LIGHT);
    }
  }
  for (const region of regions) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      if (levels.has(key)) levels.set(key, region.level);
    }
  }
  return levels;
}

/** The level most cells share; the glyph modes leave those cells unmarked. */
export function roomDefaultLight(levels: Iterable<LightLevel>): LightLevel {
  const counts: Record<LightLevel, number> = { bright: 0, dim: 0, darkness: 0 };
  for (const level of levels) counts[level] += 1;
  let best: LightLevel = LIGHT_LEVELS[0];
  for (const level of LIGHT_LEVELS) {
    if (counts[level] > counts[best]) best = level;
  }
  return best;
}

export const LIGHT_GLYPH_BY_LEVEL: Readonly<Record<LightLevel, LightGlyphEffect>> = {
  bright: 'light-glyph-bright',
  dim: 'light-glyph-dim',
  darkness: 'light-glyph-dark',
};

export const LIGHT_GLYPH_KIND_BY_LEVEL: Readonly<Record<LightLevel, LightGlyphKind>> = {
  bright: 'sun',
  dim: 'crescent',
  darkness: 'disc',
};

export function lightGlyphForLevel(level: LightLevel): PixelMark {
  return LIGHT_GLYPHS[LIGHT_GLYPH_KIND_BY_LEVEL[level]];
}

/**
 * The overlay tile a cell shows for its light level, or null for no overlay.
 * 'none' returns null for every level: its tints ride the existing
 * illumination mechanical layers, which is what keeps the default board
 * byte-identical. The glyph modes never mark the room default so the board is
 * not carpeted with glyphs.
 */
export function lightMarkFor(
  mode: BoardGlyphMode,
  level: LightLevel,
  roomDefault: LightLevel,
): LightGlyphEffect | null {
  if (!drawsLightGlyphs(mode)) return null;
  return level === roomDefault ? null : LIGHT_GLYPH_BY_LEVEL[level];
}

export const LIGHT_LEVEL_LABELS: Readonly<Record<LightLevel, string>> = {
  bright: 'BRIGHT',
  dim: 'DIM',
  darkness: 'DARK',
};
