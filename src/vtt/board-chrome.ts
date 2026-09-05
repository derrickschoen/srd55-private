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
 */
import { HIDDEN_FOCUS_ASSET_ID } from '../assets/art-sets';
import { neutral, paletteHex, ramp, type PaletteColorRef } from '../assets/palette';
import {
  GLYPH_HEIGHT,
  layoutPixelText,
  renderLifeGlyph,
  renderPixelText,
  type LifeGlyph,
  type PixelTextLayout,
} from '../assets/pixel-font';
import { starterArtDataUri } from '../assets/starter-art-resolver';
import type { LifeState } from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import type { EncounterBoardProjectionShape } from './encounter-board';
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
/** Sideways attempts before a colliding plate stacks vertically; bounds the placement loop. */
export const MAX_HORIZONTAL_SHIFTS = 8;
export const HP_BAR_WIDTH_PX = 40;
export const HP_BAR_HEIGHT_PX = 4;
export const HP_BAR_BORDER_PX = 1;

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

export interface NameplateRequest {
  readonly id: CombatantId;
  readonly displayName: string;
  readonly column: number;
  readonly row: number;
}

export interface NameplateLayout extends NameplateRequest {
  readonly text: PixelTextLayout;
  /** Relative to the grid's top-left (cell 0,0), in CSS px. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function nameplateSize(displayName: string): {
  readonly text: PixelTextLayout;
  readonly width: number;
  readonly height: number;
} {
  const text = layoutPixelText(displayName, NAMEPLATE_MAX_LINES);
  const frame = 2 * (NAMEPLATE_PADDING_PX + NAMEPLATE_BORDER_PX);
  return {
    text,
    width: text.width * CHROME_TEXT_SCALE + frame,
    height: text.height * CHROME_TEXT_SCALE + frame,
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
    const size = nameplateSize(request.displayName);
    const centred = request.column * CHROME_TILE_PX + CHROME_TILE_PX / 2 - size.width / 2;
    const x = Math.max(0, Math.min(Math.round(centred), Math.max(0, gridWidth - size.width)));
    const belowOccupied = occupied.has(`${String(request.column)},${String(request.row + 1)}`);
    const aboveY = request.row * CHROME_TILE_PX + 1 - size.height;
    const belowY = (request.row + 1) * CHROME_TILE_PX - 1;
    let placeAbove = belowOccupied && aboveY >= 0;
    let y = placeAbove ? aboveY : belowY;
    let candidate: NameplateLayout = { ...request, text: size.text, x, y, width: size.width, height: size.height };
    const cellLeft = request.column * CHROME_TILE_PX;
    const cellRight = cellLeft + CHROME_TILE_PX;
    const staysAttached = (nx: number): boolean =>
      nx >= 0 && nx + size.width <= gridWidth && nx < cellRight && nx + size.width > cellLeft;
    let shifts = 0;
    for (;;) {
      const blocker = [...placed, ...portraits].find((other) => overlaps(candidate, other));
      if (blocker === undefined) break;
      if (shifts < MAX_HORIZONTAL_SHIFTS) {
        // first choice: slide sideways past the blocker while still touching this plate's own cell
        const options = [blocker.x + blocker.width + NAMEPLATE_STACK_GAP_PX, blocker.x - size.width - NAMEPLATE_STACK_GAP_PX]
          .filter(staysAttached)
          .sort((left, right) => Math.abs(left - centred) - Math.abs(right - centred));
        const shifted = options[0];
        if (shifted !== undefined) {
          candidate = { ...candidate, x: shifted };
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
      candidate = { ...candidate, y };
    }
    placed.push(candidate);
  }
  return placed;
}

export function boardChromeDimensions(bounds: { readonly columns: number; readonly rows: number }): {
  readonly width: number;
  readonly height: number;
} {
  return {
    width: 2 * BOARD_BORDER_PX + 2 * COORDINATE_GUTTER_PX + bounds.columns * CHROME_TILE_PX,
    height: 2 * BOARD_BORDER_PX + 2 * COORDINATE_GUTTER_PX + bounds.rows * CHROME_TILE_PX + LEGEND_GAP_PX + LEGEND_HEIGHT_PX,
  };
}

export interface LegendEntry {
  readonly key: string;
  readonly label: string;
  readonly swatch: PaletteColorRef;
  readonly style: 'plate' | 'plate-dashed' | 'tint' | 'glyph' | 'hp';
}

export const LEGEND_ENTRIES: readonly LegendEntry[] = [
  { key: 'side-party', label: 'Party', swatch: ramp('cloth-cool', 3), style: 'plate' },
  { key: 'side-foe', label: 'Foe', swatch: ramp('cloth-warm', 3), style: 'plate' },
  { key: 'hidden', label: 'Hidden from players', swatch: neutral(8), style: 'plate-dashed' },
  { key: 'difficult', label: 'Difficult', swatch: ramp('earth', 2), style: 'tint' },
  { key: 'obscured', label: 'Obscured', swatch: neutral(6), style: 'tint' },
  { key: 'bright', label: 'Bright light', swatch: ramp('skin', 6), style: 'tint' },
  { key: 'dim', label: 'Dim light', swatch: ramp('cloth-warm', 5), style: 'tint' },
  { key: 'darkness', label: 'Darkness', swatch: neutral(0), style: 'tint' },
  { key: 'fog', label: 'Fog', swatch: neutral(1), style: 'tint' },
  { key: 'blocked', label: 'Blocked', swatch: ramp('stone', 2), style: 'glyph' },
  { key: 'object', label: 'Object', swatch: ramp('wood', 3), style: 'glyph' },
  { key: 'light-source', label: 'Light source', swatch: ramp('skin', 6), style: 'glyph' },
  { key: 'hp-uninjured', label: 'HP uninjured', swatch: HP_BAND_INK.uninjured, style: 'hp' },
  { key: 'hp-bloodied', label: 'HP bloodied', swatch: HP_BAND_INK.bloodied, style: 'hp' },
  { key: 'hp-near-death', label: 'HP near death', swatch: HP_BAND_INK.near_death, style: 'hp' },
  { key: 'hp-unknown', label: 'HP unknown', swatch: HP_BAND_INK.unknown, style: 'hp' },
];

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

function tokenChrome(
  combatants: EncounterBoardProjectionShape['combatants'],
  bounds: { readonly columns: number; readonly rows: number },
): HTMLDivElement {
  const layer = el('div', 'encounter-token-chrome');
  layer.setAttribute('aria-hidden', 'true');
  const placedCombatants = combatants.filter((combatant) => combatant.placementStatus === 'placed');
  const plates = stackLabelOffsets(
    placedCombatants.map((combatant) => ({
      id: combatant.id,
      displayName: combatant.name,
      column: combatant.position.column,
      row: combatant.position.row,
    })),
    bounds,
  );
  const byId = new Map(placedCombatants.map((combatant) => [combatant.id, combatant] as const));
  for (const plate of plates) {
    const combatant = byId.get(plate.id);
    if (combatant === undefined) continue;
    const cellLeft = COORDINATE_GUTTER_PX + combatant.position.column * CHROME_TILE_PX;
    const cellTop = COORDINATE_GUTTER_PX + combatant.position.row * CHROME_TILE_PX;
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
        width: `${String(CHROME_TILE_PX * columnSpan)}px`,
        height: `${String(CHROME_TILE_PX * rowSpan)}px`,
      });
      layer.append(ring);
    }

    const band = hpBandOf(combatant.hitPointBand);
    const bar = el('span', 'encounter-hp-bar');
    bar.dataset.combatantId = combatant.id;
    bar.dataset.hpBand = band;
    styled(bar, {
      position: 'absolute',
      left: `${String(cellLeft + Math.round((CHROME_TILE_PX - HP_BAR_WIDTH_PX) / 2) - HP_BAR_BORDER_PX)}px`,
      top: `${String(cellTop + CHROME_TILE_PX - HP_BAR_HEIGHT_PX - 2 * HP_BAR_BORDER_PX - 2)}px`,
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
    styled(lifeImage, {
      position: 'absolute',
      left: `${String(cellLeft + CHROME_TILE_PX - glyph.cssWidth - 3)}px`,
      top: `${String(cellTop + 3)}px`,
      width: `${String(glyph.cssWidth)}px`,
      height: `${String(glyph.cssHeight)}px`,
    });
    layer.append(lifeImage);

    const nameplate = el('span', 'encounter-nameplate');
    nameplate.dataset.combatantId = combatant.id;
    nameplate.dataset.displayName = combatant.name;
    nameplate.dataset.lines = String(plate.text.lines.length);
    styled(nameplate, {
      position: 'absolute',
      left: `${String(COORDINATE_GUTTER_PX + plate.x)}px`,
      top: `${String(COORDINATE_GUTTER_PX + plate.y)}px`,
      width: `${String(plate.width)}px`,
      height: `${String(plate.height)}px`,
    });
    const text = renderPixelText(plate.text, TEXT_INK, CHROME_TEXT_SCALE);
    const textImageNode = el('img', 'encounter-nameplate-text');
    textImageNode.alt = '';
    textImageNode.src = text.dataUri;
    styled(textImageNode, { width: `${String(text.cssWidth)}px`, height: `${String(text.cssHeight)}px` });
    nameplate.append(textImageNode);
    layer.append(nameplate);
  }
  return layer;
}

function legend(): HTMLElement {
  const box = el('aside', 'encounter-legend');
  box.dataset.legend = 'board-legend';
  box.setAttribute('aria-label', 'Board legend');
  styled(box, { height: `${String(LEGEND_HEIGHT_PX)}px`, 'margin-top': `${String(LEGEND_GAP_PX)}px` });
  for (const entry of LEGEND_ENTRIES) {
    const item = el('span', `encounter-legend-item encounter-legend-${entry.style}`);
    item.dataset.legendKey = entry.key;
    const swatch = el('span', 'encounter-legend-swatch');
    styled(swatch, { background: paletteHex(entry.swatch) });
    item.append(swatch, textImage(entry.label, TEXT_INK, 'encounter-legend-text'));
    box.append(item);
  }
  return box;
}

/**
 * Appends the DM chrome to a rendered `.encounter-board`. The cells and their
 * children are untouched, so a player board is byte-identical without this.
 */
export function renderBoardChrome(board: HTMLElement, projection: EncounterBoardProjectionShape): void {
  board.dataset.boardChrome = 'on';
  board.dataset.coordinateLabels = COORDINATE_CONVENTION;
  board.dataset.encounterRows = String(projection.bounds.rows);
  board.style.setProperty('--encounter-rows', String(projection.bounds.rows));
  board.append(
    coordinateLabels(projection.bounds),
    tokenChrome(projection.combatants, projection.bounds),
    legend(),
  );
}
