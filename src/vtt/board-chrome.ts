/**
 * DM-board chrome (D533): numbered coloured creature badges bind cells to a
 * full 2x bitmap roster below the board. HP bands, life-state glyphs,
 * coordinates, hidden rings and the board legend share that chrome.
 *
 * Coordinates: the prose the AI DM reads never names cells (it speaks in
 * distances), while the engine, the DM tray ("moved from 1,1 to 2,1") and
 * every MCP payload use zero-based `column,row` numbers — so the labels are
 * the engine's column and row numbers, not letters.
 *
 * D525: under the 'full' glyph mode the legend lists exactly the glyph
 * families the board shows, a hidden creature gains an eye-slash mark on its
 * hidden ring and the word HIDDEN in its roster line, and the life glyph on
 * a door cell drops below the door mark instead of colliding with it.
 */
import { HIDDEN_FOCUS_ASSET_ID, STONE_FLOOR_SET_ID } from '../assets/art-sets';
import {
  CELL_GLYPHS,
  HIDDEN_GLYPH,
  HIDDEN_GLYPH_LABEL,
  OBJECT_GLYPH,
  cellGlyphOrigin,
  cellGlyphSizePx,
  type BoardGlyphMode,
  type CellGlyphKind,
} from '../assets/board-glyphs';
import type { AssetId } from '../assets/ids';
import {
  LIGHT_GLYPH_BY_LEVEL,
  LIGHT_LEVELS,
  LIGHT_LEVEL_LABELS,
  lightGlyphForLevel,
  type LightLevel,
} from '../assets/light-encoding';
import { OVERLAY_ASSETS } from '../assets/art-sets';
import {
  BADGE_DARK_INK,
  BADGE_LIGHT_INK,
  renderChromeSwatchBitmap,
  renderCreatureBadgeBitmap,
  renderCreatureRingBitmap,
} from '../assets/board-chrome-art';
import {
  neutral,
  paletteHex,
  ramp,
  type NeutralStep,
  type PaletteColorRef,
  type PaletteRamp,
  type RampStep,
} from '../assets/palette';
import {
  GLYPH_HEIGHT,
  layoutPixelText,
  renderLifeGlyph,
  renderPixelGlyph,
  renderPixelText,
  type LifeGlyph,
  type PixelTextLayout,
} from '../assets/pixel-font';
import type { PixelMark } from '../assets/pixel-mark';
import {
  starterArtCssUrl,
  starterArtDataUri,
} from '../assets/starter-art-resolver';
import type { LifeState } from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import {
  boardGlyphPresence,
  roomDefaultLightOf,
  type BoardGlyphPresence,
  type EncounterBoardCellModel,
  type EncounterBoardCombatant,
  type EncounterBoardPlacedCombatant,
  type EncounterBoardProjectionShape,
} from './encounter-board';
import type { ProjectedHitPointKnowledge } from './intel/contracts';
import {
  CHROME_TILE_PX,
  boardChromeMetrics,
  layoutRosterName,
  legendHeightPx,
  type BoardChromeMetrics,
  type BoardChromeTilePx,
} from './board-chrome-layout';
export {
  CHROME_BASE_TILE_PX,
  CHROME_TILE_PX,
  ROSTER_NAME_GLYPHS_PER_LINE,
  boardChromeDimensions,
  boardChromeMetrics,
  layoutRosterName,
  legendHeightPx,
  type BoardChromeDimensionContent,
  type BoardChromeMetrics,
  type BoardChromeTilePx,
} from './board-chrome-layout';

const DEFAULT_CHROME_METRICS = boardChromeMetrics();
export const CHROME_TEXT_SCALE = DEFAULT_CHROME_METRICS.textScale;
/** `.encounter-board` border width in styles.css; part of the captured size. */
export const BOARD_BORDER_PX = DEFAULT_CHROME_METRICS.boardBorder;
export const COORDINATE_GUTTER_PX = DEFAULT_CHROME_METRICS.coordinateGutter;
export const LEGEND_HEIGHT_PX = DEFAULT_CHROME_METRICS.legendHeight;
export const LEGEND_GAP_PX = DEFAULT_CHROME_METRICS.legendGap;
export const HP_BAR_WIDTH_PX = DEFAULT_CHROME_METRICS.hpBarWidth;
export const HP_BAR_HEIGHT_PX = DEFAULT_CHROME_METRICS.hpBarHeight;
export const HP_BAR_BORDER_PX = DEFAULT_CHROME_METRICS.hpBarBorder;
/** Where the HP bar's top border sits inside its cell; badge and glyph boxes end above it. */
export function hpBarTopPx(tilePx: BoardChromeTilePx = CHROME_TILE_PX): number {
  const metrics = boardChromeMetrics(tilePx);
  return tilePx - metrics.hpBarHeight - 2 * metrics.hpBarBorder - metrics.hpBarBottomInset;
}
export const HP_BAR_TOP_PX = hpBarTopPx();
/** The last tile row a bottom-corner cell glyph's outline ring touches (D525). */
export function cellGlyphRingBottomPx(
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): number {
  return cellGlyphOrigin('blocked', tilePx).y + cellGlyphSizePx(tilePx);
}
export const CELL_GLYPH_RING_BOTTOM_PX = cellGlyphRingBottomPx();
/** The life glyph's inset from the cell's top-right, and where it drops to under a door mark (D525). */
export const LIFE_GLYPH_INSET_PX = DEFAULT_CHROME_METRICS.lifeGlyphInset;
export const LIFE_GLYPH_BELOW_DOOR_PX = DEFAULT_CHROME_METRICS.lifeGlyphBelowDoor;
/** The hidden eye-slash mark's top-left inside its cell, on the hidden ring's left rim. */
export const HIDDEN_GLYPH_ORIGIN = Object.freeze({
  x: DEFAULT_CHROME_METRICS.hiddenGlyphX,
  y: DEFAULT_CHROME_METRICS.hiddenGlyphY,
});

export const CREATURE_BADGE_SLOT = 'top-centre' as const;
export const CREATURE_BADGE_WIDTH_PX = DEFAULT_CHROME_METRICS.creatureBadgeWidth;
export const CREATURE_BADGE_HEIGHT_PX = DEFAULT_CHROME_METRICS.creatureBadgeHeight;
export function creatureBadgeLeftPx(
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): number {
  return (tilePx - boardChromeMetrics(tilePx).creatureBadgeWidth) / 2;
}
export const CREATURE_BADGE_LEFT_PX = creatureBadgeLeftPx();
export const CREATURE_BADGE_TOP_PX = DEFAULT_CHROME_METRICS.creatureBadgeTop;
export const CREATURE_BADGE_STACK_PITCH_PX = DEFAULT_CHROME_METRICS.creatureBadgeStackPitch;
export const MAX_BADGES_PER_CELL = 2;
export const CREATURE_BUST_RING_INSET_PX = DEFAULT_CHROME_METRICS.creatureBustRingInset;
export const CREATURE_BUST_RING_SIZE_PX = Object.freeze([
  DEFAULT_CHROME_METRICS.creatureBustRingPrimarySize,
  DEFAULT_CHROME_METRICS.creatureBustRingSecondarySize,
] as const);
export const ROSTER_ENTRY_GAP_PX = DEFAULT_CHROME_METRICS.rosterEntryGap;
export const ROSTER_ENTRY_FRAME_PX = DEFAULT_CHROME_METRICS.rosterEntryFrame;

export const BADGE_SIDE_HUES = Object.freeze([12, 222] as const);
export const CREATURE_BADGE_HUE_EXCLUSION_DEGREES = 35;

export type CreatureBadgeRamp = Exclude<
  PaletteRamp,
  'cloth-warm' | 'cloth-cool'
>;
export type CreatureBadgeDisc =
  | { readonly ramp: CreatureBadgeRamp; readonly step: RampStep }
  | { readonly ramp: 'neutral'; readonly step: NeutralStep };

function badgeRamp(
  rampName: CreatureBadgeRamp,
  step: RampStep,
): CreatureBadgeDisc {
  return { ramp: rampName, step };
}

function badgeNeutral(step: NeutralStep): CreatureBadgeDisc {
  return { ramp: 'neutral', step };
}

function badgeColor<const Id extends string>(
  id: Id,
  disc: CreatureBadgeDisc,
  numeralInk: PaletteColorRef,
): {
  readonly id: Id;
  readonly disc: CreatureBadgeDisc;
  readonly numeralInk: PaletteColorRef;
} {
  return Object.freeze({ id, disc, numeralInk });
}

/**
 * A closed, colour-vision-tested identity vocabulary. It deliberately omits
 * the warm/cool side ramps and every saturated colour in the exclusion band
 * around their 12°/222° base hues. The numeral remains the primary identity.
 */
export const CREATURE_BADGE_COLORS = Object.freeze([
  badgeColor('deep-forest', badgeRamp('moss', 0), BADGE_LIGHT_INK),
  badgeColor('ivory', badgeRamp('skin', 6), BADGE_DARK_INK),
  badgeColor('fern', badgeRamp('moss', 5), BADGE_DARK_INK),
  badgeColor('slate', badgeRamp('stone', 4), BADGE_DARK_INK),
  badgeColor('pine', badgeRamp('moss', 2), BADGE_LIGHT_INK),
  badgeColor('charcoal', badgeNeutral(2), BADGE_LIGHT_INK),
  badgeColor('sand', badgeRamp('earth', 6), BADGE_DARK_INK),
  badgeColor('silver', badgeRamp('stone', 6), BADGE_DARK_INK),
  badgeColor('spruce', badgeRamp('moss', 1), BADGE_LIGHT_INK),
  badgeColor('iron', badgeNeutral(3), BADGE_LIGHT_INK),
  badgeColor('pearl', badgeRamp('metal', 6), BADGE_DARK_INK),
  badgeColor('graphite', badgeNeutral(1), BADGE_LIGHT_INK),
] as const);

export type CreatureBadgeColor = (typeof CREATURE_BADGE_COLORS)[number];
declare const creatureBadgeNumberBrand: unique symbol;
export type CreatureBadgeNumber = number & {
  readonly [creatureBadgeNumberBrand]: true;
};

function creatureBadgeNumber(value: number): CreatureBadgeNumber {
  if (
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > CREATURE_BADGE_COLORS.length
  ) {
    throw new RangeError(
      `Creature badge number must be 1..${String(CREATURE_BADGE_COLORS.length)}.`,
    );
  }
  return value as CreatureBadgeNumber;
}

export interface CreatureBadgeAssignment {
  readonly combatantId: CombatantId;
  readonly number: CreatureBadgeNumber;
  readonly color: CreatureBadgeColor;
  readonly column: number;
  readonly row: number;
  readonly stackIndex: 0 | 1;
}

export interface CreatureBadgeSubject {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly position: { readonly column: number; readonly row: number };
}

export interface CreatureBadgeLayout {
  readonly combatantId: CombatantId;
  /** Relative to the grid's top-left, excluding the chrome coordinate gutter. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CreatureBustRingGeometry {
  readonly inset: number;
  readonly size: number;
  readonly nativeSize: number;
}

/** Each stacked ring keeps its authored 2x scale while stepping inward inside the cell. */
export function creatureBustRingGeometry(
  stackIndex: 0 | 1,
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): CreatureBustRingGeometry {
  const metrics = boardChromeMetrics(tilePx);
  const size = stackIndex === 0
    ? metrics.creatureBustRingPrimarySize
    : metrics.creatureBustRingSecondarySize;
  return {
    inset:
      metrics.creatureBustRingInset +
      stackIndex * metrics.creatureBustRingStackInset,
    size,
    nativeSize: size / metrics.textScale,
  };
}

/** Stable roster order is the only numbering source in both live and snapshot DM views. */
export function assignCreatureBadges(
  combatants: readonly CreatureBadgeSubject[],
): readonly CreatureBadgeAssignment[] {
  if (combatants.length > CREATURE_BADGE_COLORS.length) {
    throw new RangeError(
      `The closed creature-badge palette supports ${String(CREATURE_BADGE_COLORS.length)} creatures.`,
    );
  }
  const cellCounts = new Map<string, number>();
  return combatants.map((combatant, index): CreatureBadgeAssignment => {
    const key = `${String(combatant.position.column)},${String(combatant.position.row)}`;
    const stackIndex = cellCounts.get(key) ?? 0;
    if (stackIndex >= MAX_BADGES_PER_CELL) {
      throw new RangeError(
        `Cell ${key} exceeds the ${String(MAX_BADGES_PER_CELL)}-badge column.`,
      );
    }
    cellCounts.set(key, stackIndex + 1);
    return {
      combatantId: combatant.id,
      number: creatureBadgeNumber(index + 1),
      color: CREATURE_BADGE_COLORS[index]!,
      column: combatant.position.column,
      row: combatant.position.row,
      stackIndex: stackIndex as 0 | 1,
    };
  });
}

/** Exact in-grid boxes occupied by the numbered identity badges. */
export function creatureBadgeLayouts(
  combatants: readonly CreatureBadgeSubject[],
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): readonly CreatureBadgeLayout[] {
  const metrics = boardChromeMetrics(tilePx);
  return assignCreatureBadges(combatants).map((assignment) => ({
    combatantId: assignment.combatantId,
    x: assignment.column * tilePx + creatureBadgeLeftPx(tilePx),
    y:
      assignment.row * tilePx +
      metrics.creatureBadgeTop +
      assignment.stackIndex * metrics.creatureBadgeStackPitch,
    width: metrics.creatureBadgeWidth,
    height: metrics.creatureBadgeHeight,
  }));
}

export const COORDINATE_CONVENTION = 'engine-column-row-zero-based' as const;

export type HpBand = 'uninjured' | 'bloodied' | 'near_death' | 'unknown';
export const HP_BANDS: readonly HpBand[] = [
  'uninjured',
  'bloodied',
  'near_death',
  'unknown',
];

/** The bar shows the classifier's band, not a fraction: the prose gets no more than this either. */
export function hpBandOf(
  knowledge: ProjectedHitPointKnowledge | undefined,
): HpBand {
  if (knowledge === undefined || knowledge.kind === 'unknown') return 'unknown';
  return knowledge.band;
}

export const HP_BAND_FILL_PX: Readonly<Record<HpBand, number>> = {
  uninjured: HP_BAR_WIDTH_PX,
  bloodied: HP_BAR_WIDTH_PX / 2,
  near_death: HP_BAR_WIDTH_PX / 5,
  unknown: 0,
};

export function hpBandFillPx(
  band: HpBand,
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): number {
  const width = boardChromeMetrics(tilePx).hpBarWidth;
  switch (band) {
    case 'uninjured':
      return width;
    case 'bloodied':
      return width / 2;
    case 'near_death':
      return width / 5;
    case 'unknown':
      return 0;
  }
}

export const HP_BAND_INK: Readonly<Record<HpBand, PaletteColorRef>> = {
  uninjured: ramp('moss', 4),
  bloodied: ramp('cloth-warm', 4),
  near_death: ramp('cloth-warm', 5),
  unknown: neutral(5),
};

export function lifeGlyphFor(life: LifeState): LifeGlyph {
  switch (life) {
    case 'living':
      return 'living';
    case 'dying':
      return 'dying';
    case 'stable':
      return 'stable';
    case 'dead':
      return 'dead';
  }
}

export type HiddenRosterTag = typeof HIDDEN_GLYPH_LABEL;
const HIDDEN_TAG_INK: PaletteColorRef = ramp('cloth-warm', 6);

/** Creature, object and door labels are distinct visual concepts at their DOM boundary. */
export type BoardLabelStyle = 'creature-roster' | 'object-tag' | 'door-tag';
export const CREATURE_LABEL_STYLE =
  'creature-roster' as const satisfies BoardLabelStyle;
export const OBJECT_LABEL_STYLE =
  'object-tag' as const satisfies BoardLabelStyle;
export const DOOR_LABEL_STYLE = 'door-tag' as const satisfies BoardLabelStyle;

export function boardChromeCellOrigin(
  cell: { readonly column: number; readonly row: number },
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): { readonly left: number; readonly top: number } {
  const metrics = boardChromeMetrics(tilePx);
  return {
    left: metrics.coordinateGutter + cell.column * tilePx,
    top: metrics.coordinateGutter + cell.row * tilePx,
  };
}

/**
 * A legend row. `swatch` rows show one palette colour; `art` rows show a real
 * overlay tile over the plain flagstone; `mark` rows show a pixel mark at the
 * chrome's 2× scale (D525 light glyphs and the 'full' vocabulary).
 */
export type LegendEntry =
  | {
      readonly key: string;
      readonly label: string;
      readonly style: 'plate' | 'plate-dashed' | 'tint' | 'glyph' | 'hp';
      readonly swatch: PaletteColorRef;
    }
  | {
      readonly key: string;
      readonly label: string;
      readonly style: 'art';
      readonly floor: AssetId;
      readonly overlay: AssetId | null;
    }
  | {
      readonly key: string;
      readonly label: string;
      readonly style: 'mark';
      readonly glyph: PixelMark;
      readonly floor?: AssetId;
      readonly overlay?: AssetId;
    };

const PARTY_ROW: LegendEntry = {
  key: 'side-party',
  label: 'Party cool-blue floor plate',
  swatch: ramp('cloth-cool', 3),
  style: 'plate',
};
const FOE_ROW: LegendEntry = {
  key: 'side-foe',
  label: 'Foe warm-red floor plate',
  swatch: ramp('cloth-warm', 3),
  style: 'plate',
};
const HIDDEN_PLATE_ROW: LegendEntry = {
  key: 'hidden',
  label: 'Hidden from players',
  swatch: neutral(8),
  style: 'plate-dashed',
};
const DIFFICULT_ROW: LegendEntry = {
  key: 'difficult',
  label: 'Difficult — 3 ochre ridges in each cell',
  style: 'art',
  floor: STONE_FLOOR_SET_ID,
  overlay: OVERLAY_ASSETS.difficult,
};
const OBSCURED_TINT_ROW: LegendEntry = {
  key: 'obscured',
  label: 'Obscured',
  swatch: neutral(6),
  style: 'tint',
};
const FOG_TINT_ROW: LegendEntry = {
  key: 'fog',
  label: 'Fog',
  swatch: neutral(1),
  style: 'tint',
};
const BLOCKED_ROW: LegendEntry = {
  key: 'blocked',
  label: 'Blocked — cross-braced stone pile',
  style: 'art',
  floor: STONE_FLOOR_SET_ID,
  overlay: OVERLAY_ASSETS.blocked,
};
const OBJECT_ROW: LegendEntry = {
  key: 'object',
  label: 'Object',
  glyph: OBJECT_GLYPH,
  style: 'mark',
};
const LIGHT_SOURCE_ROW: LegendEntry = {
  key: 'light-source',
  label: 'Light source',
  swatch: ramp('skin', 6),
  style: 'glyph',
};
const HP_ROWS: readonly LegendEntry[] = [
  {
    key: 'hp-uninjured',
    label: 'HP uninjured',
    swatch: HP_BAND_INK.uninjured,
    style: 'hp',
  },
  {
    key: 'hp-bloodied',
    label: 'HP bloodied',
    swatch: HP_BAND_INK.bloodied,
    style: 'hp',
  },
  {
    key: 'hp-near-death',
    label: 'HP near death',
    swatch: HP_BAND_INK.near_death,
    style: 'hp',
  },
  {
    key: 'hp-unknown',
    label: 'HP unknown',
    swatch: HP_BAND_INK.unknown,
    style: 'hp',
  },
];

/** The light rows depend on the mode (D525); the glyph modes also name the unmarked room default. */
export function lightLegendEntries(
  mode: BoardGlyphMode,
  roomDefault: LightLevel,
): readonly LegendEntry[] {
  switch (mode) {
    case 'none':
      return [
        {
          key: 'bright',
          label: 'Bright light',
          swatch: ramp('skin', 6),
          style: 'tint',
        },
        {
          key: 'dim',
          label: 'Dim light',
          swatch: ramp('cloth-warm', 5),
          style: 'tint',
        },
        {
          key: 'darkness',
          label: 'Darkness',
          swatch: neutral(0),
          style: 'tint',
        },
      ];
    case 'light':
    case 'full':
      return [
        ...LIGHT_LEVELS.map(
          (level): LegendEntry => ({
            key: level,
            label: LIGHT_LEVEL_LABELS[level],
            style: 'mark',
            glyph: lightGlyphForLevel(level),
          }),
        ),
        {
          key: 'light-default',
          label: `No glyph = ${LIGHT_LEVEL_LABELS[roomDefault]}`,
          style: 'art',
          floor: STONE_FLOOR_SET_ID,
          overlay: null,
        },
      ];
  }
}

function cellGlyphRow(kind: CellGlyphKind): LegendEntry {
  if (kind === 'blocked') {
    return {
      key: kind,
      label: 'Blocked — cross-braced stone pile and corner X',
      style: 'mark',
      glyph: CELL_GLYPHS[kind],
      floor: STONE_FLOOR_SET_ID,
      overlay: OVERLAY_ASSETS.blocked,
    };
  }
  if (kind === 'obscured') {
    return {
      key: kind,
      label: CELL_GLYPHS[kind].label,
      style: 'mark',
      glyph: CELL_GLYPHS[kind],
      floor: STONE_FLOOR_SET_ID,
      overlay: OVERLAY_ASSETS['obscurement-heavy'],
    };
  }
  return {
    key: kind,
    label: CELL_GLYPHS[kind].label,
    style: 'mark',
    glyph: CELL_GLYPHS[kind],
  };
}

/**
 * Every legend row for a board. 'none' and 'light' keep the D516 rows and swap
 * the light rows; 'full' replaces the hidden, obscured, fog and blocked rows
 * with their marks and adds the door marks — each only when the board shows
 * it, so the legend lists exactly the families present.
 */
export function legendEntriesFor(
  mode: BoardGlyphMode,
  roomDefault: LightLevel,
  presence: BoardGlyphPresence,
): readonly LegendEntry[] {
  switch (mode) {
    case 'none':
    case 'light':
      return [
        PARTY_ROW,
        FOE_ROW,
        HIDDEN_PLATE_ROW,
        DIFFICULT_ROW,
        OBSCURED_TINT_ROW,
        ...lightLegendEntries(mode, roomDefault),
        FOG_TINT_ROW,
        BLOCKED_ROW,
        OBJECT_ROW,
        LIGHT_SOURCE_ROW,
        ...HP_ROWS,
      ];
    case 'full': {
      const shown = (kind: CellGlyphKind): readonly LegendEntry[] =>
        presence.cells.includes(kind) ? [cellGlyphRow(kind)] : [];
      return [
        PARTY_ROW,
        FOE_ROW,
        ...(presence.hidden
          ? [
              {
                key: 'hidden',
                label: HIDDEN_GLYPH_LABEL,
                style: 'mark',
                glyph: HIDDEN_GLYPH,
              } satisfies LegendEntry,
            ]
          : []),
        DIFFICULT_ROW,
        ...shown('obscured'),
        ...lightLegendEntries(mode, roomDefault),
        ...shown('fog'),
        ...shown('blocked'),
        ...shown('door-closed'),
        ...shown('door-open'),
        OBJECT_ROW,
        LIGHT_SOURCE_ROW,
        ...HP_ROWS,
      ];
    }
  }
}

/** The glyph asset each light legend row stands for, so a test can tie the row to the tile. */
export function legendGlyphAssetFor(level: LightLevel): AssetId {
  return OVERLAY_ASSETS[LIGHT_GLYPH_BY_LEVEL[level]];
}

const TEXT_INK: PaletteColorRef = neutral(8);
const COORDINATE_INK: PaletteColorRef = neutral(6);
export const ROSTER_WORD_INKS = Object.freeze({
  title: TEXT_INK,
  name: TEXT_INK,
  coordinate: COORDINATE_INK,
  side: TEXT_INK,
  hidden: HIDDEN_TAG_INK,
  hpUninjured: HP_BAND_INK.uninjured,
  hpBloodied: HP_BAND_INK.bloodied,
  hpNearDeath: HP_BAND_INK.near_death,
  hpUnknown: HP_BAND_INK.unknown,
});

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function styled<T extends HTMLElement>(
  node: T,
  declarations: Readonly<Record<string, string>>,
): T {
  node.setAttribute(
    'style',
    Object.entries(declarations)
      .map(([property, value]) => `${property}:${value}`)
      .join(';'),
  );
  return node;
}

function applyBoardChromeCssMetrics(
  board: HTMLElement,
  metrics: BoardChromeMetrics,
): void {
  const dimensions = {
    '--chrome-gutter': metrics.coordinateGutter,
    '--chrome-board-border': metrics.boardBorder,
    '--chrome-legend-height': metrics.legendHeight,
    '--chrome-legend-gap': metrics.legendGap,
    '--chrome-hp-border': metrics.hpBarBorder,
    '--chrome-legend-row-gap': metrics.legendRowGap,
    '--chrome-legend-column-gap': metrics.legendColumnGap,
    '--chrome-legend-padding-y': metrics.legendPaddingY,
    '--chrome-legend-padding-x': metrics.legendPaddingX,
    '--chrome-legend-border': metrics.legendBorder,
    '--chrome-legend-item-gap': metrics.legendItemGap,
    '--chrome-legend-item-height': metrics.legendItemHeight,
    '--chrome-legend-swatch': metrics.legendSwatch,
    '--chrome-object-rail-row-gap': metrics.objectRailRowGap,
    '--chrome-object-rail-column-gap': metrics.objectRailColumnGap,
    '--chrome-tag-gap': metrics.tagGap,
    '--chrome-tag-padding-y': metrics.tagPaddingY,
    '--chrome-tag-padding-x': metrics.tagPaddingX,
    '--chrome-object-tag-border': metrics.objectTagBorder,
    '--chrome-door-tag-border': metrics.doorTagBorder,
    '--chrome-roster-box-gap': metrics.rosterBoxGap,
    '--chrome-roster-box-padding-top': metrics.rosterBoxPaddingTop,
    '--chrome-roster-box-border': metrics.rosterBoxBorder,
    '--chrome-roster-badge-column': metrics.rosterGridBadgeColumn,
    '--chrome-roster-grid-gap': metrics.rosterGridGap,
    '--chrome-roster-entry-min-height': metrics.rosterEntryMinHeight,
    '--chrome-roster-entry-padding-y': metrics.rosterEntryPaddingY,
    '--chrome-roster-entry-padding-x': metrics.rosterEntryPaddingX,
    '--chrome-roster-entry-border': metrics.rosterEntryBorder,
    '--chrome-world-object-border': metrics.worldObjectBorder,
    '--chrome-world-object-sigil-inset': metrics.worldObjectSigilInset,
  } as const;
  for (const [property, value] of Object.entries(dimensions))
    board.style.setProperty(property, `${String(value)}px`);
}

function textImage(
  text: string,
  ink: PaletteColorRef,
  className: string,
  scale: number,
): HTMLImageElement {
  const rendered = renderPixelText(
    layoutPixelText(text, 1),
    ink,
    scale,
  );
  const image = el('img', className);
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');
  image.src = rendered.dataUri;
  styled(image, {
    width: `${String(rendered.cssWidth)}px`,
    height: `${String(rendered.cssHeight)}px`,
  });
  return image;
}

function coordinateLabels(bounds: {
  readonly columns: number;
  readonly rows: number;
}, tilePx: BoardChromeTilePx): HTMLDivElement {
  const metrics = boardChromeMetrics(tilePx);
  const container = el('div', 'encounter-coordinate-labels');
  container.dataset.coordinateLabels = COORDINATE_CONVENTION;
  container.setAttribute('aria-hidden', 'true');
  const gridTop = metrics.coordinateGutter;
  const gridLeft = metrics.coordinateGutter;
  const gridBottom = gridTop + bounds.rows * tilePx;
  const gridRight = gridLeft + bounds.columns * tilePx;
  const textHeight = GLYPH_HEIGHT * metrics.textScale;
  for (let column = 0; column < bounds.columns; column += 1) {
    for (const edge of ['top', 'bottom'] as const) {
      const image = textImage(
        String(column),
        COORDINATE_INK,
        'encounter-coordinate-label',
        metrics.textScale,
      );
      const width = Number.parseInt(
        image.getAttribute('style')?.match(/width:(\d+)px/u)?.[1] ?? '0',
        10,
      );
      const x =
        gridLeft +
        column * tilePx +
        Math.round(tilePx / 2 - width / 2);
      const y =
        edge === 'top'
          ? Math.round((metrics.coordinateGutter - textHeight) / 2)
          : gridBottom + Math.round((metrics.coordinateGutter - textHeight) / 2);
      styled(image, {
        position: 'absolute',
        left: `${String(x)}px`,
        top: `${String(y)}px`,
      });
      image.dataset.axis = 'column';
      image.dataset.index = String(column);
      image.dataset.edge = edge;
      container.append(image);
    }
  }
  for (let row = 0; row < bounds.rows; row += 1) {
    for (const edge of ['left', 'right'] as const) {
      const image = textImage(
        String(row),
        COORDINATE_INK,
        'encounter-coordinate-label',
        metrics.textScale,
      );
      const width = Number.parseInt(
        image.getAttribute('style')?.match(/width:(\d+)px/u)?.[1] ?? '0',
        10,
      );
      const y =
        gridTop +
        row * tilePx +
        Math.round(tilePx / 2 - textHeight / 2);
      const x =
        edge === 'left'
          ? Math.round((metrics.coordinateGutter - width) / 2)
          : gridRight + Math.round((metrics.coordinateGutter - width) / 2);
      styled(image, {
        position: 'absolute',
        left: `${String(x)}px`,
        top: `${String(y)}px`,
      });
      image.dataset.axis = 'row';
      image.dataset.index = String(row);
      image.dataset.edge = edge;
      container.append(image);
    }
  }
  return container;
}

/** The cell eye-slash accompanies a roster HIDDEN tag only in full glyph mode. */
export function hiddenRosterTagFor(
  mode: BoardGlyphMode,
  combatant: EncounterBoardCombatant,
): HiddenRosterTag | null {
  return mode === 'full' && combatant.hiddenFromPlayers === true
    ? HIDDEN_GLYPH_LABEL
    : null;
}

function tokenIdentityUnderlay(
  combatants: readonly EncounterBoardPlacedCombatant[],
  bounds: { readonly columns: number; readonly rows: number },
  tilePx: BoardChromeTilePx,
): HTMLDivElement {
  const metrics = boardChromeMetrics(tilePx);
  const layer = el('div', 'encounter-token-underlay');
  layer.setAttribute('aria-hidden', 'true');
  const assignments = assignCreatureBadges(combatants);
  for (const [index, combatant] of combatants.entries()) {
    const assignment = assignments[index];
    if (assignment === undefined)
      throw new Error(
        `Combatant ${String(combatant.id)} lost its badge assignment.`,
      );
    if (
      combatant.position.column < 0 ||
      combatant.position.column >= bounds.columns ||
      combatant.position.row < 0 ||
      combatant.position.row >= bounds.rows
    )
      throw new RangeError(
        `Combatant ${String(combatant.id)} is outside the board.`,
      );
    const { left: cellLeft, top: cellTop } = boardChromeCellOrigin(
      combatant.position,
      tilePx,
    );
    const ringGeometry = creatureBustRingGeometry(assignment.stackIndex, tilePx);
    const ringArt = renderCreatureRingBitmap(
      assignment.color.disc,
      ringGeometry.nativeSize,
      metrics.textScale,
    );
    const bustRing = el('img', 'encounter-creature-bust-ring');
    bustRing.alt = '';
    bustRing.src = ringArt.dataUri;
    bustRing.dataset.combatantId = combatant.id;
    bustRing.dataset.badgeNumber = String(assignment.number);
    bustRing.dataset.badgeColor = assignment.color.id;
    bustRing.dataset.stackIndex = String(assignment.stackIndex);
    styled(bustRing, {
      position: 'absolute',
      left: `${String(cellLeft + ringGeometry.inset)}px`,
      top: `${String(cellTop + ringGeometry.inset)}px`,
      width: `${String(ringArt.cssWidth)}px`,
      height: `${String(ringArt.cssHeight)}px`,
    });
    layer.append(bustRing);

    const badgeArt = renderCreatureBadgeBitmap(
      assignment.number,
      assignment.color.disc,
      assignment.color.numeralInk,
      metrics.textScale,
    );
    const badge = el('img', 'encounter-creature-badge');
    badge.alt = '';
    badge.src = badgeArt.dataUri;
    badge.dataset.combatantId = combatant.id;
    badge.dataset.badgeNumber = String(assignment.number);
    badge.dataset.badgeColor = assignment.color.id;
    badge.dataset.badgeSlot = CREATURE_BADGE_SLOT;
    badge.dataset.anchorColumn = String(assignment.column);
    badge.dataset.anchorRow = String(assignment.row);
    badge.dataset.stackIndex = String(assignment.stackIndex);
    styled(badge, {
      position: 'absolute',
      left: `${String(cellLeft + creatureBadgeLeftPx(tilePx))}px`,
      top: `${String(cellTop + metrics.creatureBadgeTop + assignment.stackIndex * metrics.creatureBadgeStackPitch)}px`,
      width: `${String(badgeArt.cssWidth)}px`,
      height: `${String(badgeArt.cssHeight)}px`,
    });
    layer.append(badge);
  }
  return layer;
}

function tokenChrome(
  combatants: readonly EncounterBoardPlacedCombatant[],
  bounds: { readonly columns: number; readonly rows: number },
  mode: BoardGlyphMode,
  doorCells: ReadonlySet<string>,
  tilePx: BoardChromeTilePx,
): HTMLDivElement {
  const metrics = boardChromeMetrics(tilePx);
  const layer = el('div', 'encounter-token-chrome');
  layer.setAttribute('aria-hidden', 'true');
  for (const combatant of combatants) {
    if (
      combatant.position.column < 0 ||
      combatant.position.column >= bounds.columns ||
      combatant.position.row < 0 ||
      combatant.position.row >= bounds.rows
    )
      throw new RangeError(
        `Combatant ${String(combatant.id)} is outside the board.`,
      );
    const { left: cellLeft, top: cellTop } = boardChromeCellOrigin(
      combatant.position,
      tilePx,
    );
    const cellKey = `${String(combatant.position.column)},${String(combatant.position.row)}`;
    const columnSpan = Math.max(...combatant.footprint.map((cell) => cell.column)) -
      Math.min(...combatant.footprint.map((cell) => cell.column)) + 1;
    const rowSpan = Math.max(...combatant.footprint.map((cell) => cell.row)) -
      Math.min(...combatant.footprint.map((cell) => cell.row)) + 1;

    if (combatant.hiddenFromPlayers === true) {
      const ring = el('img', 'encounter-hidden-ring');
      ring.alt = '';
      ring.src = starterArtDataUri(HIDDEN_FOCUS_ASSET_ID);
      ring.dataset.combatantId = combatant.id;
      ring.dataset.assetId = HIDDEN_FOCUS_ASSET_ID;
      styled(ring, {
        position: 'absolute',
        left: `${String(cellLeft)}px`,
        top: `${String(cellTop)}px`,
        width: `${String(tilePx * columnSpan)}px`,
        height: `${String(tilePx * rowSpan)}px`,
      });
      layer.append(ring);
      // D525 'full': the eye-slash mark on the ring's left rim, scaled with the cell glyphs.
      if (hiddenRosterTagFor(mode, combatant) !== null) {
        const eye = renderPixelGlyph(
          'hidden',
          HIDDEN_GLYPH.rows,
          HIDDEN_GLYPH.ink,
          metrics.latticeScale,
          HIDDEN_GLYPH.outline,
        );
        const eyeImage = el('img', 'encounter-hidden-glyph');
        eyeImage.alt = '';
        eyeImage.src = eye.dataUri;
        eyeImage.dataset.combatantId = combatant.id;
        eyeImage.dataset.glyphKind = 'hidden';
        styled(eyeImage, {
          position: 'absolute',
          left: `${String(cellLeft + metrics.hiddenGlyphX - metrics.latticeScale)}px`,
          top: `${String(cellTop + metrics.hiddenGlyphY - metrics.latticeScale)}px`,
          width: `${String(eye.cssWidth)}px`,
          height: `${String(eye.cssHeight)}px`,
        });
        layer.append(eyeImage);
      }
    }

    const band = hpBandOf(combatant.hitPointBand);
    const bar = el('span', 'encounter-hp-bar');
    bar.dataset.combatantId = combatant.id;
    bar.dataset.hpBand = band;
    styled(bar, {
      position: 'absolute',
      left: `${String(cellLeft + Math.round((tilePx - metrics.hpBarWidth) / 2) - metrics.hpBarBorder)}px`,
      top: `${String(cellTop + hpBarTopPx(tilePx))}px`,
      width: `${String(metrics.hpBarWidth)}px`,
      height: `${String(metrics.hpBarHeight)}px`,
    });
    const fill = el('span', 'encounter-hp-fill');
    styled(fill, {
      width: `${String(hpBandFillPx(band, tilePx))}px`,
      height: `${String(metrics.hpBarHeight)}px`,
      background: paletteHex(HP_BAND_INK[band]),
    });
    bar.append(fill);
    layer.append(bar);

    const life = combatant.life ?? 'living';
    const glyph = renderLifeGlyph(
      lifeGlyphFor(life),
      TEXT_INK,
      metrics.textScale,
    );
    const lifeImage = el('img', 'encounter-life-glyph');
    lifeImage.alt = '';
    lifeImage.src = glyph.dataUri;
    lifeImage.dataset.combatantId = combatant.id;
    lifeImage.dataset.life = life;
    // D525: a door mark owns the top-right corner; the life glyph on a door cell drops below it.
    const lifeTop = doorCells.has(cellKey)
      ? metrics.lifeGlyphBelowDoor
      : metrics.lifeGlyphInset;
    styled(lifeImage, {
      position: 'absolute',
      left: `${String(cellLeft + tilePx - glyph.cssWidth - metrics.lifeGlyphInset)}px`,
      top: `${String(cellTop + lifeTop)}px`,
      width: `${String(glyph.cssWidth)}px`,
      height: `${String(glyph.cssHeight)}px`,
    });
    layer.append(lifeImage);
  }
  return layer;
}

export const LEGEND_SWATCH_PX = DEFAULT_CHROME_METRICS.legendSwatch;

function legendSwatch(entry: LegendEntry, metrics: BoardChromeMetrics): HTMLElement {
  switch (entry.style) {
    case 'plate':
    case 'plate-dashed':
    case 'tint':
    case 'glyph':
    case 'hp': {
      const shape =
        entry.style === 'plate'
          ? 'disc'
          : entry.style === 'plate-dashed'
            ? 'dashed-disc'
            : entry.style === 'hp'
              ? 'hp'
              : 'square';
      const rendered = renderChromeSwatchBitmap(
        entry.swatch,
        shape,
        metrics.textScale,
      );
      const swatch = el(
        'img',
        'encounter-legend-swatch encounter-legend-swatch-bitmap',
      );
      swatch.alt = '';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.src = rendered.dataUri;
      styled(swatch, {
        width: `${String(rendered.cssWidth)}px`,
        height: `${String(rendered.cssHeight)}px`,
      });
      return swatch;
    }
    case 'art': {
      const swatch = el('span', 'encounter-legend-swatch');
      const layers = [entry.overlay, entry.floor].flatMap((asset) =>
        asset === null ? [] : [starterArtCssUrl(asset)],
      );
      swatch.dataset.floorAssetId = entry.floor;
      if (entry.overlay !== null) swatch.dataset.overlayAssetId = entry.overlay;
      styled(swatch, {
        'background-image': layers.join(','),
        width: `${String(metrics.legendSwatch)}px`,
        height: `${String(metrics.legendSwatch)}px`,
        'background-size': `${String(metrics.legendSwatch)}px ${String(metrics.legendSwatch)}px`,
      });
      return swatch;
    }
    case 'mark': {
      const rendered = renderPixelGlyph(
        entry.key,
        entry.glyph.rows,
        entry.glyph.ink,
        metrics.textScale,
        entry.glyph.outline,
      );
      const swatch = el(
        'img',
        'encounter-legend-swatch encounter-legend-swatch-mark',
      );
      swatch.alt = '';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.src = rendered.dataUri;
      styled(swatch, {
        width: `${String(rendered.cssWidth)}px`,
        height: `${String(rendered.cssHeight)}px`,
        ...(entry.overlay === undefined
          ? {}
          : {
              'background-image': [
                starterArtCssUrl(entry.overlay),
                starterArtCssUrl(entry.floor ?? STONE_FLOOR_SET_ID),
              ].join(','),
              'background-size': `${String(rendered.cssWidth)}px ${String(rendered.cssHeight)}px`,
            }),
      });
      if (entry.overlay !== undefined)
        swatch.dataset.overlayAssetId = entry.overlay;
      if (entry.floor !== undefined) swatch.dataset.floorAssetId = entry.floor;
      return swatch;
    }
  }
}

type ProjectedWorldObjects = NonNullable<
  EncounterBoardProjectionShape['worldObjects']
>;

export type BoardRailEntry =
  | {
      readonly kind: 'object';
      readonly object: ProjectedWorldObjects[number];
      readonly labelStyle: typeof OBJECT_LABEL_STYLE;
      readonly label: string;
      readonly glyph: typeof OBJECT_GLYPH;
    }
  | {
      readonly kind: 'door';
      readonly state: 'open' | 'closed';
      readonly object: ProjectedWorldObjects[number];
      readonly labelStyle: typeof DOOR_LABEL_STYLE;
      readonly label: string;
      readonly glyph: (typeof CELL_GLYPHS)['door-open' | 'door-closed'];
    };

/** A closed discriminator chooses both the rail wording and its visual frame. */
export function boardRailEntries(
  objects: ProjectedWorldObjects,
): readonly BoardRailEntry[] {
  return objects.map((object): BoardRailEntry => {
    const coordinate = `(${String(object.position.column)},${String(object.position.row)})`;
    if (object.kind !== 'door') {
      return {
        kind: 'object',
        object,
        labelStyle: OBJECT_LABEL_STYLE,
        label: `${object.name} ${coordinate}`,
        glyph: OBJECT_GLYPH,
      };
    }
    const state = object.blocking.movement ? 'closed' : 'open';
    return {
      kind: 'door',
      state,
      object,
      labelStyle: DOOR_LABEL_STYLE,
      label: `DOOR ${state.toLocaleUpperCase('en-US')} ${coordinate}`,
      glyph: CELL_GLYPHS[`door-${state}`],
    };
  });
}

function objectTagRail(
  objects: ProjectedWorldObjects,
  metrics: BoardChromeMetrics,
): HTMLElement {
  const rail = el('div', 'encounter-object-tag-rail');
  rail.dataset.objectTagRail = 'snapshot';
  for (const entry of boardRailEntries(objects)) {
    const tag = el('span', `encounter-board-tag encounter-${entry.kind}-tag`);
    tag.dataset.objectId = entry.object.id;
    tag.dataset.entryKind = entry.kind;
    tag.dataset.labelStyle = entry.labelStyle;
    tag.dataset.anchorColumn = String(entry.object.position.column);
    tag.dataset.anchorRow = String(entry.object.position.row);
    if (entry.kind === 'door') tag.dataset.doorState = entry.state;
    const sigil = renderPixelGlyph(
      entry.kind,
      entry.glyph.rows,
      entry.glyph.ink,
      metrics.textScale,
      entry.glyph.outline,
    );
    const sigilImage = el(
      'img',
      `encounter-board-tag-sigil encounter-${entry.kind}-tag-sigil`,
    );
    sigilImage.alt = '';
    sigilImage.setAttribute('aria-hidden', 'true');
    sigilImage.src = sigil.dataUri;
    styled(sigilImage, {
      width: `${String(sigil.cssWidth)}px`,
      height: `${String(sigil.cssHeight)}px`,
    });
    const label = renderPixelText(
      layoutPixelText(entry.label, 2),
      TEXT_INK,
      metrics.textScale,
    );
    const labelImage = el(
      'img',
      `encounter-board-tag-text encounter-${entry.kind}-tag-text`,
    );
    labelImage.alt = '';
    labelImage.setAttribute('aria-hidden', 'true');
    labelImage.src = label.dataUri;
    labelImage.dataset.fullLabel = entry.label;
    styled(labelImage, {
      width: `${String(label.cssWidth)}px`,
      height: `${String(label.cssHeight)}px`,
    });
    tag.append(sigilImage, labelImage);
    rail.append(tag);
  }
  return rail;
}

function pixelImage(
  layout: PixelTextLayout,
  ink: PaletteColorRef,
  className: string,
  scale: number,
): HTMLImageElement {
  const rendered = renderPixelText(layout, ink, scale);
  const image = el('img', className);
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');
  image.src = rendered.dataUri;
  styled(image, {
    width: `${String(rendered.cssWidth)}px`,
    height: `${String(rendered.cssHeight)}px`,
  });
  return image;
}

export function hpBandLabel(
  band: HpBand,
): 'UNINJURED' | 'BLOODIED' | 'NEAR DEATH' | 'UNKNOWN' {
  switch (band) {
    case 'uninjured':
      return 'UNINJURED';
    case 'bloodied':
      return 'BLOODIED';
    case 'near_death':
      return 'NEAR DEATH';
    case 'unknown':
      return 'UNKNOWN';
  }
}

function rosterBox(
  combatants: readonly EncounterBoardPlacedCombatant[],
  mode: BoardGlyphMode,
  metrics: BoardChromeMetrics,
): HTMLElement {
  const box = el('section', 'encounter-roster-box');
  box.dataset.creatureRoster = 'badge-name-cell-side-hp';
  box.append(
    textImage(
      'ROSTER',
      ROSTER_WORD_INKS.title,
      'encounter-roster-title',
      metrics.textScale,
    ),
  );
  const assignments = assignCreatureBadges(combatants);
  combatants.forEach((combatant, index) => {
    const assignment = assignments[index];
    if (assignment === undefined)
      throw new Error(
        `Combatant ${String(combatant.id)} lost its roster assignment.`,
      );
    const band = hpBandOf(combatant.hitPointBand);
    const row = el('div', 'encounter-roster-entry');
    row.dataset.combatantId = combatant.id;
    row.dataset.rosterOrder = String(index + 1);
    row.dataset.badgeNumber = String(assignment.number);
    row.dataset.badgeColor = assignment.color.id;
    row.dataset.fullName = combatant.name;
    row.dataset.anchorColumn = String(combatant.position.column);
    row.dataset.anchorRow = String(combatant.position.row);
    row.dataset.labelStyle = CREATURE_LABEL_STYLE;
    row.dataset.side = combatant.kind === 'player_character' ? 'party' : 'foe';
    row.dataset.hpBand = band;
    const badgeArt = renderCreatureBadgeBitmap(
      assignment.number,
      assignment.color.disc,
      assignment.color.numeralInk,
      metrics.textScale,
    );
    const badge = el('img', 'encounter-roster-badge');
    badge.alt = '';
    badge.setAttribute('aria-hidden', 'true');
    badge.src = badgeArt.dataUri;
    badge.dataset.badgeNumber = String(assignment.number);
    badge.dataset.badgeColor = assignment.color.id;
    styled(badge, {
      width: `${String(badgeArt.cssWidth)}px`,
      height: `${String(badgeArt.cssHeight)}px`,
    });
    const name = pixelImage(
      layoutRosterName(combatant.name),
      ROSTER_WORD_INKS.name,
      'encounter-roster-name',
      metrics.textScale,
    );
    name.dataset.fullName = combatant.name;
    const coordinateText = `(${String(combatant.position.column)},${String(combatant.position.row)})`;
    const coordinate = pixelImage(
      layoutPixelText(coordinateText, 1),
      ROSTER_WORD_INKS.coordinate,
      'encounter-roster-coordinate',
      metrics.textScale,
    );
    coordinate.dataset.coordinate = coordinateText;
    const side = pixelImage(
      layoutPixelText(
        combatant.kind === 'player_character' ? 'PARTY' : 'FOE',
        1,
      ),
      ROSTER_WORD_INKS.side,
      'encounter-roster-side',
      metrics.textScale,
    );
    const hp = pixelImage(
      layoutPixelText(hpBandLabel(band), 1),
      HP_BAND_INK[band],
      'encounter-roster-hp',
      metrics.textScale,
    );
    row.append(badge, name, coordinate, side, hp);
    if (combatant.hiddenFromPlayers === true) {
      const hidden = pixelImage(
        layoutPixelText(HIDDEN_GLYPH_LABEL, 1),
        ROSTER_WORD_INKS.hidden,
        'encounter-roster-hidden',
        metrics.textScale,
      );
      hidden.dataset.tag = HIDDEN_GLYPH_LABEL;
      row.append(hidden);
    }
    if (mode !== 'full') row.dataset.hiddenMarkMode = 'ring-only';
    box.append(row);
  });
  return box;
}

function legend(
  entries: readonly LegendEntry[],
  mode: BoardGlyphMode,
  roomDefault: LightLevel,
  objects: ProjectedWorldObjects,
  combatants: readonly EncounterBoardPlacedCombatant[],
  snapshotMode: boolean,
  tilePx: BoardChromeTilePx,
): HTMLElement {
  const metrics = boardChromeMetrics(tilePx);
  const box = el('aside', 'encounter-legend');
  box.dataset.legend = 'board-legend';
  box.dataset.boardGlyphs = mode;
  box.dataset.roomDefaultLight = roomDefault;
  box.setAttribute('aria-label', 'Board legend');
  // D525: a minimum, not a fixed height. A narrow board (the 10×7 reference room) wraps the rows past
  // 120 px; a fixed height clipped its HP rows, which would confound the probe's HP class.
  styled(box, {
    'min-height': `${String(legendHeightPx({ combatants, objects }, tilePx))}px`,
    'margin-top': `${String(metrics.legendGap)}px`,
  });
  for (const entry of entries) {
    const item = el(
      'span',
      `encounter-legend-item encounter-legend-${entry.style}`,
    );
    item.dataset.legendKey = entry.key;
    item.append(
      legendSwatch(entry, metrics),
      textImage(
        entry.label,
        TEXT_INK,
        'encounter-legend-text',
        metrics.textScale,
      ),
    );
    box.append(item);
  }
  box.append(rosterBox(combatants, mode, metrics));
  if (snapshotMode && objects.length > 0)
    box.append(objectTagRail(objects, metrics));
  return box;
}

/**
 * Appends the DM chrome to a rendered `.encounter-board`. The cells and their
 * children are untouched, so a player board is byte-identical without this.
 * The legend's rows follow the board's glyph mode and, under 'full', the marks
 * the rendered cells actually show (D525).
 */
export function renderBoardChrome(
  board: HTMLElement,
  projection: EncounterBoardProjectionShape,
  mode: BoardGlyphMode,
  cells: readonly EncounterBoardCellModel[],
  snapshotMode = false,
  tilePx: BoardChromeTilePx = CHROME_TILE_PX,
): void {
  const metrics = boardChromeMetrics(tilePx);
  const placedCombatants = projection.combatants.filter(
    (combatant): combatant is EncounterBoardPlacedCombatant =>
      combatant.placementStatus === 'placed',
  );
  board.dataset.boardChrome = 'on';
  board.dataset.coordinateLabels = COORDINATE_CONVENTION;
  board.dataset.encounterRows = String(projection.bounds.rows);
  board.style.setProperty('--encounter-tile-size', `${String(tilePx)}px`);
  board.style.setProperty('--encounter-rows', String(projection.bounds.rows));
  applyBoardChromeCssMetrics(board, metrics);
  const roomDefault = roomDefaultLightOf(projection);
  const presence = boardGlyphPresence(cells, placedCombatants);
  const doorCells = new Set(
    cells
      .filter((cell) =>
        cell.glyphs.some((glyph) => CELL_GLYPHS[glyph.kind].family === 'door'),
      )
      .map((cell) => cell.key),
  );
  board.append(
    coordinateLabels(projection.bounds, tilePx),
    tokenIdentityUnderlay(placedCombatants, projection.bounds, tilePx),
    tokenChrome(placedCombatants, projection.bounds, mode, doorCells, tilePx),
    legend(
      legendEntriesFor(mode, roomDefault, presence),
      mode,
      roomDefault,
      projection.worldObjects ?? [],
      placedCombatants,
      snapshotMode,
      tilePx,
    ),
  );
}
