/**
 * D525: how a board shows light levels. The probe (D519) showed Luna reading
 * the warm 'tint' on bright cells as shadow, so an art package now names one
 * of three closed encodings and the board says which one it used in
 * `data-light-encoding`. Everything here is pure and structural so the render
 * model, the DM legend and the probe's primer share one source of truth.
 */
import { LIGHT_GLYPHS, type LightGlyph, type LightGlyphKind } from './light-glyphs';
import type { LightGlyphEffect, LightMarkEffect, LightVeilEffect } from './pixel-art';

export const LIGHT_ENCODINGS = ['tint', 'symbol', 'inverse'] as const;
export type LightEncoding = (typeof LIGHT_ENCODINGS)[number];
export const DEFAULT_LIGHT_ENCODING: LightEncoding = 'tint';

export function isLightEncoding(value: string): value is LightEncoding {
  return (LIGHT_ENCODINGS as readonly string[]).includes(value);
}

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

/** The level most cells share; the 'symbol' encoding leaves those cells unmarked. */
export function roomDefaultLight(levels: Iterable<LightLevel>): LightLevel {
  const counts: Record<LightLevel, number> = { bright: 0, dim: 0, darkness: 0 };
  for (const level of levels) counts[level] += 1;
  let best: LightLevel = LIGHT_LEVELS[0];
  for (const level of LIGHT_LEVELS) {
    if (counts[level] > counts[best]) best = level;
  }
  return best;
}

export const LIGHT_VEIL_BY_LEVEL: Readonly<Record<Exclude<LightLevel, 'bright'>, LightVeilEffect>> = {
  dim: 'light-veil-dim',
  darkness: 'light-veil-dark',
};

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

export function lightGlyphForLevel(level: LightLevel): LightGlyph {
  return LIGHT_GLYPHS[LIGHT_GLYPH_KIND_BY_LEVEL[level]];
}

/**
 * The overlay tile a cell shows for its light level, or null for no overlay.
 * 'tint' returns null for every level: its tints ride the existing
 * illumination mechanical layers, which is what keeps the default board
 * byte-identical. 'inverse' never overlays bright cells; 'symbol' never
 * overlays the room default so the board is not carpeted with glyphs.
 */
export function lightMarkFor(
  encoding: LightEncoding,
  level: LightLevel,
  roomDefault: LightLevel,
): LightMarkEffect | null {
  switch (encoding) {
    case 'tint': return null;
    case 'inverse': return level === 'bright' ? null : LIGHT_VEIL_BY_LEVEL[level];
    case 'symbol': return level === roomDefault ? null : LIGHT_GLYPH_BY_LEVEL[level];
  }
}

export const LIGHT_LEVEL_LABELS: Readonly<Record<LightLevel, string>> = {
  bright: 'BRIGHT',
  dim: 'DIM',
  darkness: 'DARK',
};
