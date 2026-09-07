import {
  CELL_GLYPH_MARGIN,
  CELL_GLYPH_SIZE,
  cellGlyphSizePx,
} from '../assets/board-glyphs';
import {
  GLYPH_HEIGHT,
  normalizeLabelText,
  textPixelWidth,
  type PixelTextLayout,
} from '../assets/pixel-font';

export const CHROME_TILE_PX = 128;
export type BoardChromeTilePx = 64 | typeof CHROME_TILE_PX;
export const CHROME_BASE_TILE_PX = 64;

const BASE_CHROME_DIMENSIONS = Object.freeze({
  textScale: 2,
  boardBorder: 2,
  coordinateGutter: 24,
  legendHeight: 120,
  legendGap: 8,
  hpBarWidth: 40,
  hpBarHeight: 4,
  hpBarBorder: 1,
  hpBarBottomInset: 2,
  lifeGlyphInset: 3,
  lifeGlyphDoorGap: 2,
  hiddenGlyphX: 1,
  hiddenGlyphY: 29,
  creatureBadgeWidth: 30,
  creatureBadgeHeight: 22,
  creatureBadgeTop: 2,
  creatureBustRingInset: 7,
  creatureBustRingStackInset: 2,
  creatureBustRingPrimarySize: 50,
  creatureBustRingSecondarySize: 46,
  rosterEntryGap: 4,
  rosterEntryFrame: 6,
  rosterHeaderHeight: 22,
  objectHeaderHeight: 22,
  objectEntryHeight: 40,
  legendSwatch: 14,
  legendRowGap: 6,
  legendColumnGap: 14,
  legendPaddingY: 6,
  legendPaddingX: 8,
  legendBorder: 2,
  legendItemGap: 6,
  legendItemHeight: 18,
  objectRailRowGap: 4,
  objectRailColumnGap: 8,
  tagGap: 4,
  tagPaddingY: 2,
  tagPaddingX: 3,
  objectTagBorder: 1,
  doorTagBorder: 2,
  rosterBoxGap: 4,
  rosterBoxPaddingTop: 4,
  rosterBoxBorder: 2,
  rosterGridBadgeColumn: 26,
  rosterGridGap: 8,
  rosterEntryMinHeight: 20,
  rosterEntryPaddingY: 2,
  rosterEntryPaddingX: 3,
  rosterEntryBorder: 1,
  worldObjectBorder: 2,
  worldObjectSigilInset: 26,
} as const);

export interface BoardChromeMetrics {
  readonly latticeScale: number;
  readonly textScale: number;
  readonly boardBorder: number;
  readonly coordinateGutter: number;
  readonly legendHeight: number;
  readonly legendGap: number;
  readonly hpBarWidth: number;
  readonly hpBarHeight: number;
  readonly hpBarBorder: number;
  readonly hpBarBottomInset: number;
  readonly cellGlyphSize: number;
  readonly lifeGlyphInset: number;
  readonly lifeGlyphBelowDoor: number;
  readonly hiddenGlyphX: number;
  readonly hiddenGlyphY: number;
  readonly creatureBadgeWidth: number;
  readonly creatureBadgeHeight: number;
  readonly creatureBadgeTop: number;
  readonly creatureBadgeStackPitch: number;
  readonly creatureBustRingInset: number;
  readonly creatureBustRingStackInset: number;
  readonly creatureBustRingPrimarySize: number;
  readonly creatureBustRingSecondarySize: number;
  readonly rosterEntryGap: number;
  readonly rosterEntryFrame: number;
  readonly rosterHeaderHeight: number;
  readonly objectHeaderHeight: number;
  readonly objectEntryHeight: number;
  readonly legendSwatch: number;
  readonly legendRowGap: number;
  readonly legendColumnGap: number;
  readonly legendPaddingY: number;
  readonly legendPaddingX: number;
  readonly legendBorder: number;
  readonly legendItemGap: number;
  readonly legendItemHeight: number;
  readonly objectRailRowGap: number;
  readonly objectRailColumnGap: number;
  readonly tagGap: number;
  readonly tagPaddingY: number;
  readonly tagPaddingX: number;
  readonly objectTagBorder: number;
  readonly doorTagBorder: number;
  readonly rosterBoxGap: number;
  readonly rosterBoxPaddingTop: number;
  readonly rosterBoxBorder: number;
  readonly rosterGridBadgeColumn: number;
  readonly rosterGridGap: number;
  readonly rosterEntryMinHeight: number;
  readonly rosterEntryPaddingY: number;
  readonly rosterEntryPaddingX: number;
  readonly rosterEntryBorder: number;
  readonly worldObjectBorder: number;
  readonly worldObjectSigilInset: number;
}

/** All semantic chrome derives from the 64-pixel lattice, including CSS-only spacing. */
export function boardChromeMetrics(
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): BoardChromeMetrics {
  const latticeScale = tilePx / CHROME_BASE_TILE_PX;
  const px = (value: number): number => value * latticeScale;
  return Object.freeze({
    latticeScale,
    textScale: px(BASE_CHROME_DIMENSIONS.textScale),
    boardBorder: px(BASE_CHROME_DIMENSIONS.boardBorder),
    coordinateGutter: px(BASE_CHROME_DIMENSIONS.coordinateGutter),
    legendHeight: px(BASE_CHROME_DIMENSIONS.legendHeight),
    legendGap: px(BASE_CHROME_DIMENSIONS.legendGap),
    hpBarWidth: px(BASE_CHROME_DIMENSIONS.hpBarWidth),
    hpBarHeight: px(BASE_CHROME_DIMENSIONS.hpBarHeight),
    hpBarBorder: px(BASE_CHROME_DIMENSIONS.hpBarBorder),
    hpBarBottomInset: px(BASE_CHROME_DIMENSIONS.hpBarBottomInset),
    cellGlyphSize: cellGlyphSizePx(tilePx),
    lifeGlyphInset: px(BASE_CHROME_DIMENSIONS.lifeGlyphInset),
    lifeGlyphBelowDoor: px(
      CELL_GLYPH_MARGIN + CELL_GLYPH_SIZE + BASE_CHROME_DIMENSIONS.lifeGlyphDoorGap,
    ),
    hiddenGlyphX: px(BASE_CHROME_DIMENSIONS.hiddenGlyphX),
    hiddenGlyphY: px(BASE_CHROME_DIMENSIONS.hiddenGlyphY),
    creatureBadgeWidth: px(BASE_CHROME_DIMENSIONS.creatureBadgeWidth),
    creatureBadgeHeight: px(BASE_CHROME_DIMENSIONS.creatureBadgeHeight),
    creatureBadgeTop: px(BASE_CHROME_DIMENSIONS.creatureBadgeTop),
    creatureBadgeStackPitch: px(BASE_CHROME_DIMENSIONS.creatureBadgeHeight),
    creatureBustRingInset: px(BASE_CHROME_DIMENSIONS.creatureBustRingInset),
    creatureBustRingStackInset: px(BASE_CHROME_DIMENSIONS.creatureBustRingStackInset),
    creatureBustRingPrimarySize: px(BASE_CHROME_DIMENSIONS.creatureBustRingPrimarySize),
    creatureBustRingSecondarySize: px(BASE_CHROME_DIMENSIONS.creatureBustRingSecondarySize),
    rosterEntryGap: px(BASE_CHROME_DIMENSIONS.rosterEntryGap),
    rosterEntryFrame: px(BASE_CHROME_DIMENSIONS.rosterEntryFrame),
    rosterHeaderHeight: px(BASE_CHROME_DIMENSIONS.rosterHeaderHeight),
    objectHeaderHeight: px(BASE_CHROME_DIMENSIONS.objectHeaderHeight),
    objectEntryHeight: px(BASE_CHROME_DIMENSIONS.objectEntryHeight),
    legendSwatch: px(BASE_CHROME_DIMENSIONS.legendSwatch),
    legendRowGap: px(BASE_CHROME_DIMENSIONS.legendRowGap),
    legendColumnGap: px(BASE_CHROME_DIMENSIONS.legendColumnGap),
    legendPaddingY: px(BASE_CHROME_DIMENSIONS.legendPaddingY),
    legendPaddingX: px(BASE_CHROME_DIMENSIONS.legendPaddingX),
    legendBorder: px(BASE_CHROME_DIMENSIONS.legendBorder),
    legendItemGap: px(BASE_CHROME_DIMENSIONS.legendItemGap),
    legendItemHeight: px(BASE_CHROME_DIMENSIONS.legendItemHeight),
    objectRailRowGap: px(BASE_CHROME_DIMENSIONS.objectRailRowGap),
    objectRailColumnGap: px(BASE_CHROME_DIMENSIONS.objectRailColumnGap),
    tagGap: px(BASE_CHROME_DIMENSIONS.tagGap),
    tagPaddingY: px(BASE_CHROME_DIMENSIONS.tagPaddingY),
    tagPaddingX: px(BASE_CHROME_DIMENSIONS.tagPaddingX),
    objectTagBorder: px(BASE_CHROME_DIMENSIONS.objectTagBorder),
    doorTagBorder: px(BASE_CHROME_DIMENSIONS.doorTagBorder),
    rosterBoxGap: px(BASE_CHROME_DIMENSIONS.rosterBoxGap),
    rosterBoxPaddingTop: px(BASE_CHROME_DIMENSIONS.rosterBoxPaddingTop),
    rosterBoxBorder: px(BASE_CHROME_DIMENSIONS.rosterBoxBorder),
    rosterGridBadgeColumn: px(BASE_CHROME_DIMENSIONS.rosterGridBadgeColumn),
    rosterGridGap: px(BASE_CHROME_DIMENSIONS.rosterGridGap),
    rosterEntryMinHeight: px(BASE_CHROME_DIMENSIONS.rosterEntryMinHeight),
    rosterEntryPaddingY: px(BASE_CHROME_DIMENSIONS.rosterEntryPaddingY),
    rosterEntryPaddingX: px(BASE_CHROME_DIMENSIONS.rosterEntryPaddingX),
    rosterEntryBorder: px(BASE_CHROME_DIMENSIONS.rosterEntryBorder),
    worldObjectBorder: px(BASE_CHROME_DIMENSIONS.worldObjectBorder),
    worldObjectSigilInset: px(BASE_CHROME_DIMENSIONS.worldObjectSigilInset),
  });
}

export const ROSTER_NAME_GLYPHS_PER_LINE = 18;

/** Word wrapping never resamples: long words become fixed 17-glyph pieces plus '-'. */
export function layoutRosterName(displayName: string): PixelTextLayout {
  const normalized = normalizeLabelText(displayName).trim();
  const words = normalized.length === 0 ? ['?'] : normalized.split(' ');
  const pieces = words.flatMap((word): readonly string[] => {
    const result: string[] = [];
    let remainder = word;
    while (remainder.length > ROSTER_NAME_GLYPHS_PER_LINE) {
      result.push(`${remainder.slice(0, ROSTER_NAME_GLYPHS_PER_LINE - 1)}-`);
      remainder = remainder.slice(ROSTER_NAME_GLYPHS_PER_LINE - 1);
    }
    result.push(remainder);
    return result;
  });
  const lines: string[] = [];
  let current = '';
  for (const piece of pieces) {
    if (current === '') {
      current = piece;
    } else if (`${current} ${piece}`.length <= ROSTER_NAME_GLYPHS_PER_LINE) {
      current = `${current} ${piece}`;
    } else {
      lines.push(current);
      current = piece;
    }
  }
  lines.push(current);
  return {
    lines,
    width: Math.max(...lines.map(textPixelWidth), 0),
    height: lines.length * GLYPH_HEIGHT + (lines.length - 1) * 2,
  };
}

export interface BoardChromeDimensionContent {
  readonly combatants: readonly { readonly name: string }[];
  readonly objects: readonly { readonly kind: string }[];
}

export function legendHeightPx(
  content: BoardChromeDimensionContent,
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): number {
  const metrics = boardChromeMetrics(tilePx);
  const rosterHeight =
    content.combatants.length === 0
      ? 0
      : metrics.rosterHeaderHeight +
        content.combatants.reduce(
          (height, combatant) =>
            height +
            Math.max(
              GLYPH_HEIGHT * metrics.textScale,
              layoutRosterName(combatant.name).height * metrics.textScale,
            ) +
            metrics.rosterEntryFrame +
            metrics.rosterEntryGap,
          0,
        );
  const objectCount = content.objects.length;
  const objectHeight = objectCount === 0
    ? 0
    : metrics.objectHeaderHeight + objectCount * metrics.objectEntryHeight;
  return metrics.legendHeight + rosterHeight + objectHeight;
}

/**
 * The captured DM board size when the legend fits its minimum band, which
 * every arena board (17+ columns) does. Narrower boards wrap the legend past
 * the band and capture taller than this (D525).
 */
export function boardChromeDimensions(
  bounds: { readonly columns: number; readonly rows: number },
  content: BoardChromeDimensionContent = { combatants: [], objects: [] },
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): {
  readonly width: number;
  readonly height: number;
} {
  const metrics = boardChromeMetrics(tilePx);
  return {
    width:
      2 * metrics.boardBorder +
      2 * metrics.coordinateGutter +
      bounds.columns * tilePx,
    height:
      2 * metrics.boardBorder +
      2 * metrics.coordinateGutter +
      bounds.rows * tilePx +
      metrics.legendGap +
      legendHeightPx(content, tilePx),
  };
}
