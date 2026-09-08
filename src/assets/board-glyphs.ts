/**
 * D525 glyph vocabulary. The comprehension probe (D519) showed a vision model
 * reading one explicit mark per fact class far better than tints, and a
 * low-effort model confusing glyph families that share a corner or a
 * silhouette. So an art package names a closed `boardGlyphs` mode:
 *
 *   'none'  — the pre-D525 tint board (default; the player board is unchanged);
 *   'light' — the light glyphs only (sun / crescent / disc, top-left);
 *   'full'  — the light glyphs plus this file's vocabulary.
 *
 * Every family owns one corner of the cell and every mark has its own
 * silhouette; tests/unit/assets/board-glyphs.test.ts pins both invariants.
 * Everything here is pure and structural so the render model, the DM legend
 * and the probe's primer share one source of truth.
 */
import { neutral, ramp } from './palette';
import { squareMark, type PixelMark } from './pixel-mark';
import type { TerrainKind } from '../combat/terrain';

export const BOARD_GLYPH_MODES = ['none', 'light', 'full'] as const;
export type BoardGlyphMode = (typeof BOARD_GLYPH_MODES)[number];
export const DEFAULT_BOARD_GLYPH_MODE: BoardGlyphMode = 'none';

export function isBoardGlyphMode(value: string): value is BoardGlyphMode {
  return (BOARD_GLYPH_MODES as readonly string[]).includes(value);
}

/** Whether a mode draws the light glyphs; 'full' adds the cell vocabulary on top. */
export function drawsLightGlyphs(mode: BoardGlyphMode): boolean {
  switch (mode) {
    case 'none': return false;
    case 'light':
    case 'full': return true;
  }
}

export const GLYPH_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type GlyphCorner = (typeof GLYPH_CORNERS)[number];

/** The families that own a cell corner. The hidden mark rides the token plate's rim instead. */
export const CORNER_GLYPH_FAMILIES = ['light', 'door', 'blocked', 'veil'] as const;
export type CornerGlyphFamily = (typeof CORNER_GLYPH_FAMILIES)[number];

export const GLYPH_FAMILY_CORNER: Readonly<Record<CornerGlyphFamily, GlyphCorner>> = Object.freeze({
  light: 'top-left',
  door: 'top-right',
  blocked: 'bottom-left',
  veil: 'bottom-right',
});

export const CELL_GLYPH_SIZE = 9;
export const CELL_GLYPH_BASE_TILE_SIZE = 64;
/** Tile pixels from the cell edge to the mark; the 1-px outline ring sits one pixel closer. */
export const CELL_GLYPH_MARGIN = 2;
/**
 * The bottom corners sit this much higher than the top corners so the mark
 * and its ring clear the DM chrome's HP bar (board-chrome.ts pins the gap).
 */
export const CELL_GLYPH_HP_BAR_CLEARANCE = 8;
/** Pitch between the corner slot and the next slot inward: mark plus both ring columns. */
export const CELL_GLYPH_SLOT_PITCH = CELL_GLYPH_SIZE + 2;

export function cellGlyphScale(tileSize: number): number {
  const scale = tileSize / CELL_GLYPH_BASE_TILE_SIZE;
  if (!Number.isSafeInteger(scale) || scale < 1) {
    throw new RangeError('Cell-glyph tile size must be a positive integer multiple of 64.');
  }
  return scale;
}

export function cellGlyphSizePx(tileSize: number): number {
  return CELL_GLYPH_SIZE * cellGlyphScale(tileSize);
}

export const CELL_GLYPH_KINDS = [
  'door-closed', 'door-open', 'terrain-half', 'terrain-three-quarters', 'terrain-wall', 'fog', 'obscured',
] as const;
export type CellGlyphKind = (typeof CELL_GLYPH_KINDS)[number];
export type CellGlyphDefinitionKind = CellGlyphKind | 'blocked';

/** Slot 0 is the corner itself; slot 1 climbs the edge so the centred badge lane stays clear. */
export type GlyphSlot = 0 | 1 | 2;

export interface CellGlyph extends PixelMark {
  readonly family: CornerGlyphFamily;
  readonly slot: GlyphSlot;
  /** The legend row and the primer name the mark by this word. */
  readonly label: string;
}

const M = squareMark(CELL_GLYPH_SIZE, 'Cell glyphs');

export const CELL_GLYPHS: Readonly<Record<CellGlyphDefinitionKind, CellGlyph>> = Object.freeze({
  'door-closed': {
    family: 'door',
    slot: 0,
    label: 'DOOR CLOSED',
    // a filled door slab; the row of gaps renders in the outline ink as a dark bar across it
    rows: M(
      '.#######.',
      '.#######.',
      '.#######.',
      '.#######.',
      '.#.....#.',
      '.#######.',
      '.#######.',
      '.#######.',
      '.#######.',
    ),
    ink: ramp('wood', 5),
    outline: neutral(0),
  },
  'door-open': {
    family: 'door',
    slot: 0,
    label: 'DOOR OPEN',
    // the same frame with the right side open and the leaf swung out on an arc
    rows: M(
      '#########',
      '#.......#',
      '#........',
      '#....##..',
      '#...#....',
      '#..#.....',
      '#..#.....',
      '#.#......',
      '#.#......',
    ),
    ink: ramp('wood', 5),
    outline: neutral(0),
  },
  /** Historical D525 mark retained for immutable probe primers; D576 boards do not emit it. */
  blocked: {
    family: 'blocked',
    slot: 0,
    label: 'BLOCKED',
    rows: M(
      '#########',
      '##.....##',
      '#.#...#.#',
      '#..#.#..#',
      '#...#...#',
      '#..#.#..#',
      '#.#...#.#',
      '##.....##',
      '#########',
    ),
    ink: ramp('cloth-warm', 6),
    outline: neutral(0),
  },
  'terrain-half': {
    family: 'blocked',
    slot: 1,
    label: '1/2 COVER',
    rows: M(
      '.##....#.',
      '..#...#..',
      '..#..#...',
      '..#.#....',
      '.#####...',
      '...#.....',
      '..#......',
      '.#.......',
      '.#####...',
    ),
    ink: ramp('cloth-warm', 6),
    outline: neutral(0),
  },
  'terrain-three-quarters': {
    family: 'blocked',
    slot: 2,
    label: '3/4 COVER',
    rows: M(
      '.###...#.',
      '...#..#..',
      '.###..#..',
      '...#.#...',
      '.###.#...',
      '....#....',
      '...#..##.',
      '..#..#.#.',
      '.#....##.',
    ),
    ink: ramp('cloth-warm', 6),
    outline: neutral(0),
  },
  'terrain-wall': {
    family: 'blocked',
    slot: 0,
    label: 'WALL',
    rows: M(
      '#.......#',
      '#.......#',
      '#.......#',
      '#.#...#.#',
      '#.#...#.#',
      '#.#.#.#.#',
      '#.#.#.#.#',
      '.##...##.',
      '.#.....#.',
    ),
    ink: ramp('cloth-warm', 6),
    outline: neutral(0),
  },
  fog: {
    family: 'veil',
    slot: 0,
    label: 'FOG',
    // a hollow cloud with a flat base, weighted to the right so it shares little with the crescent
    rows: M(
      '.........',
      '.........',
      '....###..',
      '..##...#.',
      '.#......#',
      '#.......#',
      '#.......#',
      '.########',
      '.........',
    ),
    ink: neutral(8),
    outline: neutral(0),
  },
  obscured: {
    family: 'veil',
    slot: 1,
    label: 'OBSCURED - CYAN DIAMONDS AND WAVES - NOT FOG',
    rows: M(
      '.........',
      '.........',
      '.##...##.',
      '#..#.#..#',
      '....#....',
      '.........',
      '.##...##.',
      '#..#.#..#',
      '....#....',
    ),
    ink: ramp('cloth-cool', 5),
    outline: neutral(0),
  },
});

/** The tile pixel where a cell glyph's top-left lands, from its family's corner and its slot. */
export function cellGlyphOrigin(kind: CellGlyphDefinitionKind, tileSize: number): { readonly x: number; readonly y: number } {
  const glyph = CELL_GLYPHS[kind];
  const corner = GLYPH_FAMILY_CORNER[glyph.family];
  const scale = cellGlyphScale(tileSize);
  const near = CELL_GLYPH_MARGIN * scale;
  const size = CELL_GLYPH_SIZE * scale;
  const far = tileSize - CELL_GLYPH_MARGIN * scale - size;
  const low = far - CELL_GLYPH_HP_BAR_CLEARANCE * scale;
  const pitch = CELL_GLYPH_SLOT_PITCH * scale;
  switch (corner) {
    case 'top-left': return { x: near + glyph.slot * pitch, y: near };
    case 'top-right': return { x: far - glyph.slot * pitch, y: near };
    case 'bottom-left': return { x: near, y: low - glyph.slot * pitch };
    case 'bottom-right': return { x: far, y: low - glyph.slot * pitch };
  }
}

export const HIDDEN_GLYPH_LABEL = 'HIDDEN';

/** The object tag and the legend share this crate-shaped sigil. It is not a
 * cell-corner glyph: snapshot object tags live in the legend rail and print
 * the object's coordinate explicitly. */
export const OBJECT_GLYPH_LABEL = 'OBJECT';
export const OBJECT_GLYPH: PixelMark = Object.freeze({
  rows: M(
    '..#####..',
    '.#######.',
    '##.....##',
    '#########',
    '#.#.#.#.#',
    '#.......#',
    '#..###..#',
    '#.......#',
    '#########',
  ),
  ink: ramp('wood', 5),
  outline: neutral(0),
});

/** An eye crossed by a slash, on the rim of a hidden creature's dashed plate ('full' mode). */
export const HIDDEN_GLYPH: PixelMark = Object.freeze({
  rows: M(
    '........#',
    '.......#.',
    '..#####..',
    '.#...#.#.',
    '#...#...#',
    '.#.#...#.',
    '..#####..',
    '.#.......',
    '#........',
  ),
  ink: neutral(8),
  outline: neutral(0),
});

/**
 * The facts a cell can carry that the 'full' vocabulary marks. Doors are the
 * engine's door world objects (the probe's Q6 truth), never the art package's
 * decorative wall-band door tile.
 */
export interface CellGlyphFacts {
  readonly door: 'closed' | 'open' | null;
  readonly terrain: TerrainKind;
  readonly fogged: boolean;
  readonly obscured: boolean;
}

/** The marks a cell shows under a mode, in a fixed order; empty unless the mode is 'full'. */
export function cellGlyphsFor(mode: BoardGlyphMode, facts: CellGlyphFacts): readonly CellGlyphKind[] {
  switch (mode) {
    case 'none':
    case 'light':
      return [];
    case 'full':
      return [
        ...(facts.door === null ? [] : [facts.door === 'open' ? 'door-open' as const : 'door-closed' as const]),
        ...(facts.terrain === 'open' ? [] : [
          facts.terrain === 'half_cover'
            ? 'terrain-half' as const
            : facts.terrain === 'three_quarters_cover'
              ? 'terrain-three-quarters' as const
              : 'terrain-wall' as const,
        ]),
        ...(facts.fogged ? ['fog' as const] : []),
        ...(facts.obscured ? ['obscured' as const] : []),
      ];
  }
}
