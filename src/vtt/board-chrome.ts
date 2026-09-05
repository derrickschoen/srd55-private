/**
 * DM-board chrome (D516): full display names on widened plates, an HP bar
 * driven by the prose classifier's band, a life-state glyph, coordinate
 * labels, a hidden-from-players ring and a legend. Pure layout functions are
 * exported for tests; `renderBoardChrome` only turns a layout into DOM.
 *
 * Coordinates: the prose the AI DM reads never names cells (it speaks in
 * distances), while the engine, the DM tray ("moved from 1,1 to 2,1") and
 * every MCP payload use zero-based `column,row` numbers — so the labels are
 * the engine's column and row numbers, not letters.
 *
 * D525: under the 'full' glyph mode the legend lists exactly the glyph
 * families the board shows, a hidden creature gains an eye-slash mark on its
 * plate rim and the word HIDDEN inside its name plate, and the life glyph on
 * a door cell drops below the door mark instead of colliding with it.
 */
import { HIDDEN_FOCUS_ASSET_ID, STONE_FLOOR_SET_ID } from '../assets/art-sets';
import {
  CELL_GLYPHS,
  CELL_GLYPH_MARGIN,
  CELL_GLYPH_SIZE,
  HIDDEN_GLYPH,
  HIDDEN_GLYPH_LABEL,
  cellGlyphOrigin,
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
import { neutral, paletteHex, ramp, type PaletteColorRef } from '../assets/palette';
import {
  GLYPH_HEIGHT,
  LINE_GAP,
  layoutPixelText,
  normalizeLabelText,
  renderLifeGlyph,
  renderPixelGlyph,
  renderPixelText,
  type LifeGlyph,
  type PixelTextLayout,
} from '../assets/pixel-font';
import type { PixelMark } from '../assets/pixel-mark';
import { starterArtCssUrl, starterArtDataUri } from '../assets/starter-art-resolver';
import type { LifeState } from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import {
  boardGlyphPresence,
  roomDefaultLightOf,
  type BoardGlyphPresence,
  type EncounterBoardCellModel,
  type EncounterBoardCombatant,
  type EncounterBoardProjectionShape,
} from './encounter-board';
import type { ProjectedHitPointKnowledge } from './intel/contracts';

export const CHROME_TILE_PX = 64;
export const CHROME_TEXT_SCALE = 2;
/** `.encounter-board` border width in styles.css; part of the captured size. */
export const BOARD_BORDER_PX = 2;
export const COORDINATE_GUTTER_PX = 24;
export const LEGEND_HEIGHT_PX = 120;
export const LEGEND_GAP_PX = 8;
export const NAMEPLATE_PADDING_PX = 4;
export const NAMEPLATE_BORDER_PX = 1;
export const NAMEPLATE_STACK_GAP_PX = 2;
export const NAMEPLATE_MAX_LINES = 2;
/** Names at or below this normalized character count stay on one line. */
export const NAMEPLATE_SINGLE_LINE_CHARACTER_LIMIT = 14;
export const NAMEPLATE_STEM_THICKNESS_PX = 2;
/** Sideways attempts before a colliding plate stacks vertically; bounds the placement loop. */
export const MAX_HORIZONTAL_SHIFTS = 8;
export const HP_BAR_WIDTH_PX = 40;
export const HP_BAR_HEIGHT_PX = 4;
export const HP_BAR_BORDER_PX = 1;
/** Where the HP bar's top border sits inside its cell; the bottom glyph row must end above it (D525). */
export const HP_BAR_TOP_PX = CHROME_TILE_PX - HP_BAR_HEIGHT_PX - 2 * HP_BAR_BORDER_PX - 2;
/** The last tile row a bottom-corner cell glyph's outline ring touches (D525). */
export const CELL_GLYPH_RING_BOTTOM_PX = cellGlyphOrigin('blocked', CHROME_TILE_PX).y + CELL_GLYPH_SIZE;
/** The life glyph's inset from the cell's top-right, and where it drops to under a door mark (D525). */
export const LIFE_GLYPH_INSET_PX = 3;
export const LIFE_GLYPH_BELOW_DOOR_PX = CELL_GLYPH_MARGIN + CELL_GLYPH_SIZE + 2;
/** The hidden eye-slash mark's top-left inside its cell: centred on the plate's left rim (D525). */
export const HIDDEN_GLYPH_ORIGIN = Object.freeze({ x: 1, y: 29 });

export const COORDINATE_CONVENTION = 'engine-column-row-zero-based' as const;

export type HpBand = 'uninjured' | 'bloodied' | 'near_death' | 'unknown';
export const HP_BANDS: readonly HpBand[] = ['uninjured', 'bloodied', 'near_death', 'unknown'];

/** The bar shows the classifier's band, not a fraction: the prose gets no more than this either. */
export function hpBandOf(knowledge: ProjectedHitPointKnowledge | undefined): HpBand {
  if (knowledge === undefined || knowledge.kind === 'unknown') return 'unknown';
  return knowledge.band;
}

export const HP_BAND_FILL_PX: Readonly<Record<HpBand, number>> = {
  uninjured: HP_BAR_WIDTH_PX,
  bloodied: HP_BAR_WIDTH_PX / 2,
  near_death: HP_BAR_WIDTH_PX / 5,
  unknown: 0,
};

export const HP_BAND_INK: Readonly<Record<HpBand, PaletteColorRef>> = {
  uninjured: ramp('moss', 4),
  bloodied: ramp('cloth-warm', 3),
  near_death: ramp('cloth-warm', 5),
  unknown: neutral(3),
};

export function lifeGlyphFor(life: LifeState): LifeGlyph {
  switch (life) {
    case 'living': return 'living';
    case 'dying': return 'dying';
    case 'stable': return 'stable';
    case 'dead': return 'dead';
  }
}

/** The only word a plate can carry under its name (D525 'full': hidden from players). */
export type NameplateTag = typeof HIDDEN_GLYPH_LABEL;
const NAMEPLATE_TAG_INK: PaletteColorRef = ramp('cloth-warm', 6);

/** Creature and object labels are different visual concepts, enforced at their DOM boundary. */
export type BoardLabelStyle = 'creature-plate' | 'object-tag';
export const CREATURE_LABEL_STYLE: BoardLabelStyle = 'creature-plate';
export const OBJECT_LABEL_STYLE: BoardLabelStyle = 'object-tag';

export interface NameplateRequest {
  readonly id: CombatantId;
  readonly displayName: string;
  readonly column: number;
  readonly row: number;
  readonly tag: NameplateTag | null;
}

export interface NameplateLayout extends NameplateRequest {
  readonly text: PixelTextLayout;
  /** Relative to the grid's top-left (cell 0,0), in CSS px. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly placement: 'touching-token-cell' | 'stacked-with-leader';
  /** The engine cell this plate identifies, even when collision stacking moves the plate away. */
  readonly anchorCell: { readonly column: number; readonly row: number };
  /** Grid-relative endpoints for the visible leader between plate and token-cell edge. */
  readonly stem: {
    readonly plate: { readonly x: number; readonly y: number };
    readonly token: { readonly x: number; readonly y: number };
  };
}

export function nameplateSize(displayName: string, tag: NameplateTag | null): {
  readonly text: PixelTextLayout;
  readonly width: number;
  readonly height: number;
} {
  const normalizedLength = Array.from(normalizeLabelText(displayName).trim()).length;
  const text = layoutPixelText(
    displayName,
    normalizedLength <= NAMEPLATE_SINGLE_LINE_CHARACTER_LIMIT ? 1 : NAMEPLATE_MAX_LINES,
  );
  const tagLayout = tag === null ? null : layoutPixelText(tag, 1);
  const frame = 2 * (NAMEPLATE_PADDING_PX + NAMEPLATE_BORDER_PX);
  const nativeWidth = Math.max(text.width, tagLayout?.width ?? 0);
  const nativeHeight = text.height + (tagLayout === null ? 0 : LINE_GAP + tagLayout.height);
  return {
    text,
    width: nativeWidth * CHROME_TEXT_SCALE + frame,
    height: nativeHeight * CHROME_TEXT_SCALE + frame,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, maximum));
}

function anchorGeometry(
  plate: Rect,
  cell: { readonly column: number; readonly row: number },
): Pick<NameplateLayout, 'anchorCell' | 'stem' | 'placement'> {
  const left = cell.column * CHROME_TILE_PX;
  const top = cell.row * CHROME_TILE_PX;
  const right = left + CHROME_TILE_PX;
  const bottom = top + CHROME_TILE_PX;
  const centreX = left + CHROME_TILE_PX / 2;
  const plateCentreY = plate.y + plate.height / 2;
  const plateBelow = plateCentreY >= top + CHROME_TILE_PX / 2;
  const token = {
    x: centreX,
    y: plateBelow ? bottom - 1 : top + 1,
  };
  const plateEndpoint = {
    x: clamp(token.x, plate.x + 1, plate.x + plate.width - 1),
    y: plateBelow ? plate.y + 1 : plate.y + plate.height - 1,
  };
  return {
    anchorCell: { column: cell.column, row: cell.row },
    stem: { plate: plateEndpoint, token },
    placement: plate.x < right && plate.x + plate.width > left && plate.y <= bottom && plate.y + plate.height >= top
      ? 'touching-token-cell'
      : 'stacked-with-leader',
  };
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** The portrait area of a cell; plates may not cover another combatant's. */
export const PORTRAIT_INSET_PX = 6;

export function portraitBox(cell: { readonly column: number; readonly row: number }): Rect {
  return {
    x: cell.column * CHROME_TILE_PX + PORTRAIT_INSET_PX,
    y: cell.row * CHROME_TILE_PX + PORTRAIT_INSET_PX,
    width: CHROME_TILE_PX - 2 * PORTRAIT_INSET_PX,
    height: CHROME_TILE_PX - 2 * PORTRAIT_INSET_PX,
  };
}

/**
 * Places every plate centred under its cell, clamped into the grid. Anything
 * it would cover — an earlier plate or another combatant's portrait — is an
 * obstacle: the plate first slides sideways while still touching its own
 * cell, then stacks vertically. A plate whose cell has an occupied cell
 * directly below starts ABOVE its token. Row-major order makes the result a
 * pure function of the input.
 */
export function stackLabelOffsets(
  requests: readonly NameplateRequest[],
  bounds: { readonly columns: number; readonly rows: number },
): readonly NameplateLayout[] {
  const gridWidth = bounds.columns * CHROME_TILE_PX;
  const occupied = new Set(requests.map((request) => `${String(request.column)},${String(request.row)}`));
  const ordered = [...requests].sort((left, right) =>
    left.row - right.row || left.column - right.column || String(left.id).localeCompare(String(right.id)));
  const placed: NameplateLayout[] = [];
  for (const request of ordered) {
    const portraits: readonly Rect[] = requests
      .filter((other) => other.id !== request.id)
      .map((other) => portraitBox(other));
    const size = nameplateSize(request.displayName, request.tag);
    const centred = request.column * CHROME_TILE_PX + CHROME_TILE_PX / 2 - size.width / 2;
    const x = Math.max(0, Math.min(Math.round(centred), Math.max(0, gridWidth - size.width)));
    const belowOccupied = occupied.has(`${String(request.column)},${String(request.row + 1)}`);
    const aboveY = request.row * CHROME_TILE_PX + 1 - size.height;
    const belowY = (request.row + 1) * CHROME_TILE_PX - 1;
    let placeAbove = belowOccupied && aboveY >= 0;
    let y = placeAbove ? aboveY : belowY;
    let candidateRect: Rect = { x, y, width: size.width, height: size.height };
    const cellLeft = request.column * CHROME_TILE_PX;
    const cellRight = cellLeft + CHROME_TILE_PX;
    const staysAttached = (nx: number): boolean =>
      nx >= 0 && nx + size.width <= gridWidth && nx < cellRight && nx + size.width > cellLeft;
    let shifts = 0;
    for (;;) {
      const blocker = [...placed, ...portraits].find((other) => overlaps(candidateRect, other));
      if (blocker === undefined) break;
      if (shifts < MAX_HORIZONTAL_SHIFTS) {
        // first choice: slide sideways past the blocker while still touching this plate's own cell
        const options = [blocker.x + blocker.width + NAMEPLATE_STACK_GAP_PX, blocker.x - size.width - NAMEPLATE_STACK_GAP_PX]
          .filter(staysAttached)
          .sort((left, right) => Math.abs(left - centred) - Math.abs(right - centred));
        const shifted = options[0];
        if (shifted !== undefined) {
          candidateRect = { ...candidateRect, x: shifted };
          shifts += 1;
          continue;
        }
      }
      if (placeAbove) {
        // stack upward; if the stack would leave the grid, give up on "above" and stack downward instead
        y = blocker.y - size.height - NAMEPLATE_STACK_GAP_PX;
        if (y < 0) {
          placeAbove = false;
          y = belowY;
        }
      } else {
        y = blocker.y + blocker.height + NAMEPLATE_STACK_GAP_PX;
      }
      candidateRect = { ...candidateRect, y };
    }
    placed.push({
      ...request,
      text: size.text,
      ...candidateRect,
      ...anchorGeometry(candidateRect, request),
    });
  }
  return placed;
}

/**
 * The captured DM board size when the legend fits its 120-px minimum band,
 * which every arena board (17+ columns) does. Narrower boards wrap the legend
 * past the band and capture taller than this (D525).
 */
export function boardChromeDimensions(bounds: { readonly columns: number; readonly rows: number }): {
  readonly width: number;
  readonly height: number;
} {
  return {
    width: 2 * BOARD_BORDER_PX + 2 * COORDINATE_GUTTER_PX + bounds.columns * CHROME_TILE_PX,
    height: 2 * BOARD_BORDER_PX + 2 * COORDINATE_GUTTER_PX + bounds.rows * CHROME_TILE_PX + LEGEND_GAP_PX + LEGEND_HEIGHT_PX,
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
    };

const PARTY_ROW: LegendEntry = { key: 'side-party', label: 'Party', swatch: ramp('cloth-cool', 3), style: 'plate' };
const FOE_ROW: LegendEntry = { key: 'side-foe', label: 'Foe', swatch: ramp('cloth-warm', 3), style: 'plate' };
const HIDDEN_PLATE_ROW: LegendEntry = { key: 'hidden', label: 'Hidden from players', swatch: neutral(8), style: 'plate-dashed' };
const DIFFICULT_ROW: LegendEntry = { key: 'difficult', label: 'Difficult', swatch: ramp('earth', 2), style: 'tint' };
const OBSCURED_TINT_ROW: LegendEntry = { key: 'obscured', label: 'Obscured', swatch: neutral(6), style: 'tint' };
const FOG_TINT_ROW: LegendEntry = { key: 'fog', label: 'Fog', swatch: neutral(1), style: 'tint' };
const BLOCKED_TINT_ROW: LegendEntry = { key: 'blocked', label: 'Blocked', swatch: ramp('stone', 2), style: 'glyph' };
const OBJECT_ROW: LegendEntry = { key: 'object', label: 'Object', swatch: ramp('wood', 3), style: 'glyph' };
const LIGHT_SOURCE_ROW: LegendEntry = { key: 'light-source', label: 'Light source', swatch: ramp('skin', 6), style: 'glyph' };
const HP_ROWS: readonly LegendEntry[] = [
  { key: 'hp-uninjured', label: 'HP uninjured', swatch: HP_BAND_INK.uninjured, style: 'hp' },
  { key: 'hp-bloodied', label: 'HP bloodied', swatch: HP_BAND_INK.bloodied, style: 'hp' },
  { key: 'hp-near-death', label: 'HP near death', swatch: HP_BAND_INK.near_death, style: 'hp' },
  { key: 'hp-unknown', label: 'HP unknown', swatch: HP_BAND_INK.unknown, style: 'hp' },
];

/** The light rows depend on the mode (D525); the glyph modes also name the unmarked room default. */
export function lightLegendEntries(mode: BoardGlyphMode, roomDefault: LightLevel): readonly LegendEntry[] {
  switch (mode) {
    case 'none':
      return [
        { key: 'bright', label: 'Bright light', swatch: ramp('skin', 6), style: 'tint' },
        { key: 'dim', label: 'Dim light', swatch: ramp('cloth-warm', 5), style: 'tint' },
        { key: 'darkness', label: 'Darkness', swatch: neutral(0), style: 'tint' },
      ];
    case 'light':
    case 'full':
      return [
        ...LIGHT_LEVELS.map((level): LegendEntry => ({
          key: level,
          label: LIGHT_LEVEL_LABELS[level],
          style: 'mark',
          glyph: lightGlyphForLevel(level),
        })),
        { key: 'light-default', label: `No glyph = ${LIGHT_LEVEL_LABELS[roomDefault]}`, style: 'art', floor: STONE_FLOOR_SET_ID, overlay: null },
      ];
  }
}

function cellGlyphRow(kind: CellGlyphKind): LegendEntry {
  return { key: kind, label: CELL_GLYPHS[kind].label, style: 'mark', glyph: CELL_GLYPHS[kind] };
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
        PARTY_ROW, FOE_ROW, HIDDEN_PLATE_ROW, DIFFICULT_ROW, OBSCURED_TINT_ROW,
        ...lightLegendEntries(mode, roomDefault),
        FOG_TINT_ROW, BLOCKED_TINT_ROW, OBJECT_ROW, LIGHT_SOURCE_ROW, ...HP_ROWS,
      ];
    case 'full': {
      const shown = (kind: CellGlyphKind): readonly LegendEntry[] => presence.cells.includes(kind) ? [cellGlyphRow(kind)] : [];
      return [
        PARTY_ROW,
        FOE_ROW,
        ...(presence.hidden ? [{ key: 'hidden', label: HIDDEN_GLYPH_LABEL, style: 'mark', glyph: HIDDEN_GLYPH } satisfies LegendEntry] : []),
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

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function styled<T extends HTMLElement>(node: T, declarations: Readonly<Record<string, string>>): T {
  node.setAttribute('style', Object.entries(declarations).map(([property, value]) => `${property}:${value}`).join(';'));
  return node;
}

function textImage(text: string, ink: PaletteColorRef, className: string): HTMLImageElement {
  const rendered = renderPixelText(layoutPixelText(text, 1), ink, CHROME_TEXT_SCALE);
  const image = el('img', className);
  image.alt = '';
  image.setAttribute('aria-hidden', 'true');
  image.src = rendered.dataUri;
  styled(image, { width: `${String(rendered.cssWidth)}px`, height: `${String(rendered.cssHeight)}px` });
  return image;
}

function coordinateLabels(bounds: { readonly columns: number; readonly rows: number }): HTMLDivElement {
  const container = el('div', 'encounter-coordinate-labels');
  container.dataset.coordinateLabels = COORDINATE_CONVENTION;
  container.setAttribute('aria-hidden', 'true');
  const gridTop = COORDINATE_GUTTER_PX;
  const gridLeft = COORDINATE_GUTTER_PX;
  const gridBottom = gridTop + bounds.rows * CHROME_TILE_PX;
  const gridRight = gridLeft + bounds.columns * CHROME_TILE_PX;
  const textHeight = GLYPH_HEIGHT * CHROME_TEXT_SCALE;
  for (let column = 0; column < bounds.columns; column += 1) {
    for (const edge of ['top', 'bottom'] as const) {
      const image = textImage(String(column), COORDINATE_INK, 'encounter-coordinate-label');
      const width = Number.parseInt(image.getAttribute('style')?.match(/width:(\d+)px/u)?.[1] ?? '0', 10);
      const x = gridLeft + column * CHROME_TILE_PX + Math.round(CHROME_TILE_PX / 2 - width / 2);
      const y = edge === 'top'
        ? Math.round((COORDINATE_GUTTER_PX - textHeight) / 2)
        : gridBottom + Math.round((COORDINATE_GUTTER_PX - textHeight) / 2);
      styled(image, { position: 'absolute', left: `${String(x)}px`, top: `${String(y)}px` });
      image.dataset.axis = 'column';
      image.dataset.index = String(column);
      image.dataset.edge = edge;
      container.append(image);
    }
  }
  for (let row = 0; row < bounds.rows; row += 1) {
    for (const edge of ['left', 'right'] as const) {
      const image = textImage(String(row), COORDINATE_INK, 'encounter-coordinate-label');
      const width = Number.parseInt(image.getAttribute('style')?.match(/width:(\d+)px/u)?.[1] ?? '0', 10);
      const y = gridTop + row * CHROME_TILE_PX + Math.round(CHROME_TILE_PX / 2 - textHeight / 2);
      const x = edge === 'left'
        ? Math.round((COORDINATE_GUTTER_PX - width) / 2)
        : gridRight + Math.round((COORDINATE_GUTTER_PX - width) / 2);
      styled(image, { position: 'absolute', left: `${String(x)}px`, top: `${String(y)}px` });
      image.dataset.axis = 'row';
      image.dataset.index = String(row);
      image.dataset.edge = edge;
      container.append(image);
    }
  }
  return container;
}

/** The plate tag a combatant carries under a mode: HIDDEN under 'full' for a hidden creature, else none. */
export function nameplateTagFor(mode: BoardGlyphMode, combatant: EncounterBoardCombatant): NameplateTag | null {
  return mode === 'full' && combatant.hiddenFromPlayers === true ? HIDDEN_GLYPH_LABEL : null;
}

function tokenChrome(
  combatants: readonly EncounterBoardCombatant[],
  bounds: { readonly columns: number; readonly rows: number },
  mode: BoardGlyphMode,
  doorCells: ReadonlySet<string>,
): HTMLDivElement {
  const layer = el('div', 'encounter-token-chrome');
  layer.setAttribute('aria-hidden', 'true');
  const plates = stackLabelOffsets(
    combatants.map((combatant) => ({
      id: combatant.id,
      displayName: combatant.name,
      column: combatant.position.column,
      row: combatant.position.row,
      tag: nameplateTagFor(mode, combatant),
    })),
    bounds,
  );
  const byId = new Map(combatants.map((combatant) => [combatant.id, combatant] as const));
  for (const plate of plates) {
    const combatant = byId.get(plate.id);
    if (combatant === undefined) continue;
    const cellLeft = COORDINATE_GUTTER_PX + combatant.position.column * CHROME_TILE_PX;
    const cellTop = COORDINATE_GUTTER_PX + combatant.position.row * CHROME_TILE_PX;
    const cellKey = `${String(combatant.position.column)},${String(combatant.position.row)}`;

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
        width: `${String(CHROME_TILE_PX)}px`,
        height: `${String(CHROME_TILE_PX)}px`,
      });
      layer.append(ring);
      // D525 'full': the eye-slash mark on the ring's left rim, at the tile's own 1× scale like the cell glyphs.
      if (plate.tag !== null) {
        const eye = renderPixelGlyph('hidden', HIDDEN_GLYPH.rows, HIDDEN_GLYPH.ink, 1, HIDDEN_GLYPH.outline);
        const eyeImage = el('img', 'encounter-hidden-glyph');
        eyeImage.alt = '';
        eyeImage.src = eye.dataUri;
        eyeImage.dataset.combatantId = combatant.id;
        eyeImage.dataset.glyphKind = 'hidden';
        styled(eyeImage, {
          position: 'absolute',
          left: `${String(cellLeft + HIDDEN_GLYPH_ORIGIN.x - 1)}px`,
          top: `${String(cellTop + HIDDEN_GLYPH_ORIGIN.y - 1)}px`,
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
      left: `${String(cellLeft + Math.round((CHROME_TILE_PX - HP_BAR_WIDTH_PX) / 2) - HP_BAR_BORDER_PX)}px`,
      top: `${String(cellTop + HP_BAR_TOP_PX)}px`,
      width: `${String(HP_BAR_WIDTH_PX)}px`,
      height: `${String(HP_BAR_HEIGHT_PX)}px`,
    });
    const fill = el('span', 'encounter-hp-fill');
    styled(fill, {
      width: `${String(HP_BAND_FILL_PX[band])}px`,
      height: `${String(HP_BAR_HEIGHT_PX)}px`,
      background: paletteHex(HP_BAND_INK[band]),
    });
    bar.append(fill);
    layer.append(bar);

    const life = combatant.life ?? 'living';
    const glyph = renderLifeGlyph(lifeGlyphFor(life), TEXT_INK, CHROME_TEXT_SCALE);
    const lifeImage = el('img', 'encounter-life-glyph');
    lifeImage.alt = '';
    lifeImage.src = glyph.dataUri;
    lifeImage.dataset.combatantId = combatant.id;
    lifeImage.dataset.life = life;
    // D525: a door mark owns the top-right corner; the life glyph on a door cell drops below it.
    const lifeTop = doorCells.has(cellKey) ? LIFE_GLYPH_BELOW_DOOR_PX : LIFE_GLYPH_INSET_PX;
    styled(lifeImage, {
      position: 'absolute',
      left: `${String(cellLeft + CHROME_TILE_PX - glyph.cssWidth - LIFE_GLYPH_INSET_PX)}px`,
      top: `${String(cellTop + lifeTop)}px`,
      width: `${String(glyph.cssWidth)}px`,
      height: `${String(glyph.cssHeight)}px`,
    });
    layer.append(lifeImage);

    const nameplate = el('span', plate.tag === null ? 'encounter-nameplate' : 'encounter-nameplate encounter-nameplate-tagged');
    nameplate.dataset.combatantId = combatant.id;
    nameplate.dataset.displayName = combatant.name;
    nameplate.dataset.labelStyle = CREATURE_LABEL_STYLE;
    nameplate.dataset.anchorColumn = String(plate.anchorCell.column);
    nameplate.dataset.anchorRow = String(plate.anchorCell.row);
    nameplate.dataset.lines = String(plate.text.lines.length);
    if (plate.tag !== null) nameplate.dataset.tag = plate.tag;
    styled(nameplate, {
      position: 'absolute',
      left: `${String(COORDINATE_GUTTER_PX + plate.x)}px`,
      top: `${String(COORDINATE_GUTTER_PX + plate.y)}px`,
      width: `${String(plate.width)}px`,
      height: `${String(plate.height)}px`,
    });
    const stemDx = plate.stem.token.x - plate.stem.plate.x;
    const stemDy = plate.stem.token.y - plate.stem.plate.y;
    const stem = el('span', 'encounter-nameplate-stem');
    stem.dataset.combatantId = combatant.id;
    stem.dataset.anchorColumn = String(plate.anchorCell.column);
    stem.dataset.anchorRow = String(plate.anchorCell.row);
    stem.dataset.tokenX = String(plate.stem.token.x);
    stem.dataset.tokenY = String(plate.stem.token.y);
    styled(stem, {
      position: 'absolute',
      left: `${String(COORDINATE_GUTTER_PX + plate.stem.plate.x)}px`,
      top: `${String(COORDINATE_GUTTER_PX + plate.stem.plate.y)}px`,
      width: `${String(Math.hypot(stemDx, stemDy))}px`,
      height: `${String(NAMEPLATE_STEM_THICKNESS_PX)}px`,
      transform: `rotate(${String(Math.atan2(stemDy, stemDx))}rad)`,
      'transform-origin': '0 50%',
    });
    layer.append(stem);
    const text = renderPixelText(plate.text, TEXT_INK, CHROME_TEXT_SCALE);
    const textImageNode = el('img', 'encounter-nameplate-text');
    textImageNode.alt = '';
    textImageNode.src = text.dataUri;
    styled(textImageNode, { width: `${String(text.cssWidth)}px`, height: `${String(text.cssHeight)}px` });
    nameplate.append(textImageNode);
    if (plate.tag !== null) {
      const tagImage = textImage(plate.tag, NAMEPLATE_TAG_INK, 'encounter-nameplate-tag');
      tagImage.dataset.tag = plate.tag;
      nameplate.append(tagImage);
    }
    layer.append(nameplate);
  }
  return layer;
}

export const LEGEND_SWATCH_PX = 14;

function legendSwatch(entry: LegendEntry): HTMLElement {
  switch (entry.style) {
    case 'plate':
    case 'plate-dashed':
    case 'tint':
    case 'glyph':
    case 'hp': {
      const swatch = el('span', 'encounter-legend-swatch');
      styled(swatch, { background: paletteHex(entry.swatch) });
      return swatch;
    }
    case 'art': {
      const swatch = el('span', 'encounter-legend-swatch');
      const layers = [entry.overlay, entry.floor].flatMap((asset) => asset === null ? [] : [starterArtCssUrl(asset)]);
      swatch.dataset.floorAssetId = entry.floor;
      if (entry.overlay !== null) swatch.dataset.overlayAssetId = entry.overlay;
      styled(swatch, {
        'background-image': layers.join(','),
        'background-size': `${String(LEGEND_SWATCH_PX)}px ${String(LEGEND_SWATCH_PX)}px`,
      });
      return swatch;
    }
    case 'mark': {
      const rendered = renderPixelGlyph(entry.key, entry.glyph.rows, entry.glyph.ink, CHROME_TEXT_SCALE, entry.glyph.outline);
      const swatch = el('img', 'encounter-legend-swatch encounter-legend-swatch-mark');
      swatch.alt = '';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.src = rendered.dataUri;
      styled(swatch, { width: `${String(rendered.cssWidth)}px`, height: `${String(rendered.cssHeight)}px` });
      return swatch;
    }
  }
}

function legend(entries: readonly LegendEntry[], mode: BoardGlyphMode, roomDefault: LightLevel): HTMLElement {
  const box = el('aside', 'encounter-legend');
  box.dataset.legend = 'board-legend';
  box.dataset.boardGlyphs = mode;
  box.dataset.roomDefaultLight = roomDefault;
  box.setAttribute('aria-label', 'Board legend');
  // D525: a minimum, not a fixed height. A narrow board (the 10×7 reference room) wraps the rows past
  // 120 px; a fixed height clipped its HP rows, which would confound the probe's HP class.
  styled(box, { 'min-height': `${String(LEGEND_HEIGHT_PX)}px`, 'margin-top': `${String(LEGEND_GAP_PX)}px` });
  for (const entry of entries) {
    const item = el('span', `encounter-legend-item encounter-legend-${entry.style}`);
    item.dataset.legendKey = entry.key;
    item.append(legendSwatch(entry), textImage(entry.label, TEXT_INK, 'encounter-legend-text'));
    box.append(item);
  }
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
): void {
  board.dataset.boardChrome = 'on';
  board.dataset.coordinateLabels = COORDINATE_CONVENTION;
  board.dataset.encounterRows = String(projection.bounds.rows);
  board.style.setProperty('--encounter-rows', String(projection.bounds.rows));
  const roomDefault = roomDefaultLightOf(projection);
  const presence = boardGlyphPresence(cells, projection.combatants);
  const doorCells = new Set(cells
    .filter((cell) => cell.glyphs.some((glyph) => CELL_GLYPHS[glyph.kind].family === 'door'))
    .map((cell) => cell.key));
  board.append(
    coordinateLabels(projection.bounds),
    tokenChrome(projection.combatants, projection.bounds, mode, doorCells),
    legend(legendEntriesFor(mode, roomDefault, presence), mode, roomDefault),
  );
}
