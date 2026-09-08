/**
 * D525 light glyphs under the 'light' and 'full' board-glyph modes. The pixel
 * invariants here are what license the three glyph digests in
 * expected-art-hashes.ts: the numbers are properties of the intended
 * drawing, never a pin refreshed from output.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BOARD_GLYPH_MODES,
  CELL_GLYPH_BASE_TILE_SIZE,
  cellGlyphScale,
  type BoardGlyphMode,
} from '../../../src/assets/board-glyphs';
import {
  LIGHT_GLYPH_BY_LEVEL,
  LIGHT_LEVELS,
  cellLightLevels,
  lightGlyphForLevel,
  lightMarkFor,
  roomDefaultLight,
  type LightLevel,
} from '../../../src/assets/light-encoding';
import { LIGHT_GLYPHS, LIGHT_GLYPH_ORIGIN, LIGHT_GLYPH_SIZE } from '../../../src/assets/light-glyphs';
import { paletteRgb } from '../../../src/assets/palette';
import { outlineRows } from '../../../src/assets/pixel-mark';
import {
  LIGHT_GLYPH_EFFECTS,
  TILE_SIZE,
  paintRecipe,
  type OverlayEffect,
} from '../../../src/assets/pixel-art';
import { combatantId } from '../../../src/combat/values';
import { CHROME_TILE_PX } from '../../../src/vtt/board-chrome';
import { renderBoard } from '../../../src/vtt/encounter-app';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import {
  encounterBoardRenderModel,
  projectEncounterTerrainCells,
  roomDefaultLightOf,
  type EncounterBoardProjectionShape,
} from '../../../src/vtt/encounter-board';
import { installInteractiveDocument, interactiveElement, type InteractiveTestElement } from '../../fixtures/interactive-dom';

function overlay(effect: OverlayEffect) {
  return paintRecipe({ kind: 'overlay', material: 'semantic', effect });
}

// ---------------------------------------------------------------------------
// Fixture: a 6×4 room with an explicit bright pool, a dim band, a dark corner and unregioned cells
// ---------------------------------------------------------------------------

const BRIGHT_POOL = [{ column: 1, row: 1 }, { column: 2, row: 1 }];
const DIM_BAND = [{ column: 0, row: 3 }, { column: 1, row: 3 }, { column: 2, row: 3 }, { column: 3, row: 3 }];
const DARK_CORNER = [{ column: 4, row: 0 }, { column: 5, row: 0 }, { column: 4, row: 1 }, { column: 5, row: 1 }, { column: 5, row: 2 }];
const OVERRIDDEN = { column: 2, row: 1 };

const litRoom: EncounterBoardProjectionShape = {
  bounds: { columns: 6, rows: 4 },
  terrainCells: projectEncounterTerrainCells(
    { columns: 6, rows: 4 },
    { blockedCells: [], worldObjects: [] },
  ),
  combatants: [
    { id: combatantId('combatant:hero'), name: 'Hero', kind: 'player_character', placementStatus: 'placed', position: { column: 0, row: 0 }, effectiveSize: 'Medium', placementMode: { kind: 'normal', actual: 'Medium' }, footprint: [{ column: 0, row: 0 }] },
  ],
  highlightedCombatant: null,
  adjudicatedTargets: [],
  environmentLightRegions: [
    { id: 'pool', level: 'bright', cells: BRIGHT_POOL },
    { id: 'band', level: 'dim', cells: DIM_BAND },
    { id: 'corner', level: 'darkness', cells: DARK_CORNER },
    // a later region overrides an earlier one on a shared cell, as the probe's fact sheet reads it
    { id: 'late-dim', level: 'dim', cells: [OVERRIDDEN] },
  ],
};

function key(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function expectedLevelAt(cell: { readonly column: number; readonly row: number }): LightLevel {
  if (key(cell) === key(OVERRIDDEN)) return 'dim';
  if (DARK_CORNER.some((entry) => key(entry) === key(cell))) return 'darkness';
  if (DIM_BAND.some((entry) => key(entry) === key(cell))) return 'dim';
  return 'bright';
}

function artFor(mode: BoardGlyphMode) {
  return encounterArtForBoard(litRoom, mode);
}

// ---------------------------------------------------------------------------

describe('D525 light levels', () => {
  it('gives every cell one effective level (last region wins, unregioned is bright) and a majority room default', () => {
    const levels = cellLightLevels(litRoom.bounds, litRoom.environmentLightRegions ?? []);
    expect(levels.size).toBe(24);
    for (const [cellKey, level] of levels) {
      const [column, row] = cellKey.split(',').map(Number);
      expect(level, cellKey).toBe(expectedLevelAt({ column: column ?? -1, row: row ?? -1 }));
    }
    expect(roomDefaultLight(levels.values())).toBe('bright');
    expect(roomDefaultLightOf(litRoom)).toBe('bright');
    expect(roomDefaultLight(['dim', 'dim', 'darkness', 'bright'])).toBe('dim');
    // ties resolve toward the earlier LIGHT_LEVELS entry, never by insertion order
    expect(roomDefaultLight(['darkness', 'dim'])).toBe('dim');
    expect(roomDefaultLight(['darkness', 'bright'])).toBe('bright');
    expect(roomDefaultLight([])).toBe('bright');
    // a region cell outside the bounds is ignored rather than invented
    expect(cellLightLevels({ columns: 1, rows: 1 }, [{ level: 'dim', cells: [{ column: 3, row: 3 }] }]).get('0,0')).toBe('bright');
  });

  it('marks per mode: none never, light and full glyph everything but the room default', () => {
    for (const level of LIGHT_LEVELS) {
      for (const roomDefault of LIGHT_LEVELS) {
        expect(lightMarkFor('none', level, roomDefault)).toBeNull();
        for (const mode of ['light', 'full'] as const) {
          expect(lightMarkFor(mode, level, roomDefault)).toBe(level === roomDefault ? null : LIGHT_GLYPH_BY_LEVEL[level]);
        }
      }
    }
  });
});

describe('D525 render model per mode on a room with bright, dim and dark regions', () => {
  it('records the effective level on every cell and the expected overlay per cell class', () => {
    for (const mode of BOARD_GLYPH_MODES) {
      const cells = encounterBoardRenderModel(litRoom, artFor(mode));
      expect(cells).toHaveLength(24);
      for (const cell of cells) {
        const level = expectedLevelAt(cell);
        expect(cell.light.level, `${mode} ${cell.key}`).toBe(level);
        expect(cell.light.mark, `${mode} ${cell.key}`).toBe(lightMarkFor(mode, level, 'bright'));
      }
    }
    // the tint illumination layers are still carried (the CSS hides them under the glyph modes)
    const light = encounterBoardRenderModel(litRoom, artFor('light'));
    expect(light.flatMap((cell) => cell.mechanicalLayers).filter((layer) => layer.kind === 'illumination')).toHaveLength(12);
  });

  it('light: every non-default cell has exactly one glyph and default cells have none; a dark room flips the default', () => {
    const light = encounterBoardRenderModel(litRoom, artFor('light'));
    const glyphs = new Set<string>(LIGHT_GLYPH_EFFECTS);
    for (const cell of light) {
      const marks = [cell.light.mark].filter((mark) => mark !== null && glyphs.has(mark));
      expect(marks, cell.key).toHaveLength(cell.light.level === 'bright' ? 0 : 1);
      if (cell.light.level !== 'bright') expect(cell.light.mark).toBe(LIGHT_GLYPH_BY_LEVEL[cell.light.level]);
    }
    expect(light.filter((cell) => cell.light.mark !== null)).toHaveLength(DIM_BAND.length + DARK_CORNER.length + 1);

    const darkRoom: EncounterBoardProjectionShape = {
      ...litRoom,
      environmentLightRegions: [
        { id: 'everywhere', level: 'darkness', cells: cellsOf(litRoom.bounds) },
        { id: 'torch', level: 'bright', cells: BRIGHT_POOL },
        { id: 'ember', level: 'dim', cells: [{ column: 0, row: 3 }] },
      ],
    };
    expect(roomDefaultLightOf(darkRoom)).toBe('darkness');
    for (const mode of ['light', 'full'] as const) {
      const dark = encounterBoardRenderModel(darkRoom, encounterArtForBoard(darkRoom, mode));
      expect(dark.filter((cell) => cell.light.mark === 'light-glyph-bright').map((cell) => cell.key).sort()).toEqual(BRIGHT_POOL.map(key).sort());
      expect(dark.filter((cell) => cell.light.mark === 'light-glyph-dim').map((cell) => cell.key)).toEqual(['0,3']);
      expect(dark.filter((cell) => cell.light.mark === 'light-glyph-dark')).toHaveLength(0);
      expect(dark.filter((cell) => cell.light.mark === null)).toHaveLength(24 - 3);
    }
  });
});

function cellsOf(bounds: { readonly columns: number; readonly rows: number }): { column: number; row: number }[] {
  const cells: { column: number; row: number }[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) cells.push({ column, row });
  }
  return cells;
}

describe('D525 light glyphs: pixel invariants', () => {
  it('glyphs are palette-closed: every opaque pixel is exactly a palette colour', () => {
    const inks = new Set<string>();
    for (const rampName of ['stone', 'wood', 'earth', 'moss', 'cloth-warm', 'cloth-cool', 'metal', 'skin'] as const) {
      for (const step of [0, 1, 2, 3, 4, 5, 6] as const) inks.add(JSON.stringify(paletteRgb({ ramp: rampName, step })));
    }
    for (const step of [0, 1, 2, 3, 4, 5, 6, 7, 8] as const) inks.add(JSON.stringify(paletteRgb({ ramp: 'neutral', step })));
    for (const effect of LIGHT_GLYPH_EFFECTS) {
      const tile = overlay(effect);
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const pixel = tile.get(x, y);
          if (pixel.alpha === 0) continue;
          expect(pixel.alpha).toBe(255);
          expect(inks.has(JSON.stringify({ red: pixel.red, green: pixel.green, blue: pixel.blue })), `${effect} ${String(x)},${String(y)}`).toBe(true);
        }
      }
    }
  });

  it('each glyph tile carries exactly one scaled top-left mark and nothing anywhere else at 64 and 128 px', () => {
    for (const tilePx of [CELL_GLYPH_BASE_TILE_SIZE, CHROME_TILE_PX] as const) {
      const scale = cellGlyphScale(tilePx);
      const sourcePixelsPerCssPixel = TILE_SIZE / tilePx;
      expect(Number.isSafeInteger(sourcePixelsPerCssPixel)).toBe(true);
      const origin = LIGHT_GLYPH_ORIGIN * scale;
      const glyphSize = LIGHT_GLYPH_SIZE * scale;
      const boxStart = origin - scale;
      const boxEnd = origin + glyphSize + scale - 1;
      expect({ tilePx, scale, origin, glyphSize, boxStart, boxEnd }).toEqual(
        tilePx === 64
          ? { tilePx: 64, scale: 1, origin: 2, glyphSize: 7, boxStart: 1, boxEnd: 9 }
          : { tilePx: 128, scale: 2, origin: 4, glyphSize: 14, boxStart: 2, boxEnd: 19 },
      );

      for (const level of LIGHT_LEVELS) {
        const effect = LIGHT_GLYPH_BY_LEVEL[level];
        const tile = overlay(effect);
        const glyph = lightGlyphForLevel(level);
        const ring = outlineRows(glyph.rows);
        let inkPixels = 0;
        for (let y = 0; y < tilePx; y += 1) {
          for (let x = 0; x < tilePx; x += 1) {
            const sourceX = x * sourcePixelsPerCssPixel;
            const sourceY = y * sourcePixelsPerCssPixel;
            const pixel = tile.get(sourceX, sourceY);
            for (let dy = 0; dy < sourcePixelsPerCssPixel; dy += 1) {
              for (let dx = 0; dx < sourcePixelsPerCssPixel; dx += 1) {
                expect(
                  tile.get(sourceX + dx, sourceY + dy),
                  `${effect} ${String(tilePx)}px source block at ${String(x)},${String(y)}`,
                ).toEqual(pixel);
              }
            }
            const inBox = x >= boxStart && x <= boxEnd && y >= boxStart && y <= boxEnd;
            if (!inBox) {
              expect(
                pixel.alpha,
                `${effect} ${String(tilePx)}px outside box at ${String(x)},${String(y)}`,
              ).toBe(0);
              continue;
            }
            const glyphX = Math.floor((x - origin) / scale);
            const glyphY = Math.floor((y - origin) / scale);
            const ringX = Math.floor((x - boxStart) / scale);
            const ringY = Math.floor((y - boxStart) / scale);
            const isInk = glyph.rows[glyphY]?.[glyphX] === '#';
            const isRing = !isInk && ring[ringY]?.[ringX] === '#';
            const expected = isInk
              ? paletteRgb(glyph.ink)
              : isRing
                ? paletteRgb(glyph.outline)
                : null;
            if (expected === null) {
              expect(
                pixel.alpha,
                `${effect} ${String(tilePx)}px gap at ${String(x)},${String(y)}`,
              ).toBe(0);
            } else {
              expect(
                { red: pixel.red, green: pixel.green, blue: pixel.blue, alpha: pixel.alpha },
                `${effect} ${String(tilePx)}px at ${String(x)},${String(y)}`,
              ).toEqual({ ...expected, alpha: 255 });
            }
            if (isInk) inkPixels += 1;
          }
        }
        const baseInkPixels = glyph.rows.join('').split('#').length - 1;
        expect(inkPixels).toBe(baseInkPixels * scale * scale);
        expect(baseInkPixels).toBeGreaterThan(8);
      }
    }
    const distinct = new Set(LIGHT_GLYPH_EFFECTS.map((effect) => Buffer.from(overlay(effect).data).toString('base64')));
    expect(distinct.size).toBe(3);
  });

  it('the sun, crescent and disc are one connected mark each and the disc is a filled circle', () => {
    const components = (rows: readonly string[]): number => {
      const seen = new Set<string>();
      let count = 0;
      const filled = (x: number, y: number): boolean => rows[y]?.[x] === '#';
      for (let y = 0; y < rows.length; y += 1) {
        for (let x = 0; x < (rows[0]?.length ?? 0); x += 1) {
          if (!filled(x, y) || seen.has(`${String(x)},${String(y)}`)) continue;
          count += 1;
          const stack: { cx: number; cy: number }[] = [{ cx: x, cy: y }];
          for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
            const id = `${String(next.cx)},${String(next.cy)}`;
            if (seen.has(id) || !filled(next.cx, next.cy)) continue;
            seen.add(id);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
              stack.push({ cx: next.cx + dx, cy: next.cy + dy });
            }
          }
        }
      }
      return count;
    };
    expect(components(LIGHT_GLYPHS.sun.rows)).toBe(1);
    expect(components(LIGHT_GLYPHS.crescent.rows)).toBe(1);
    expect(components(LIGHT_GLYPHS.disc.rows)).toBe(1);
    expect(LIGHT_GLYPHS.disc.rows.join('').split('#').length - 1).toBeGreaterThan(LIGHT_GLYPHS.crescent.rows.join('').split('#').length - 1);
    expect(LIGHT_GLYPHS.disc.rows[3]).toBe('#######');
    expect(LIGHT_GLYPHS.crescent.rows[3]).toBe('##.....');
    expect(LIGHT_GLYPHS.sun.rows[3]).toBe('###.###');
    // the sun's four corner rays are what distinguish it from the disc at 7 px
    for (const [x, y] of [[0, 0], [6, 0], [0, 6], [6, 6]] as const) expect(LIGHT_GLYPHS.sun.rows[y]?.[x]).toBe('#');
    for (const [x, y] of [[0, 0], [6, 0], [0, 6], [6, 6]] as const) expect(LIGHT_GLYPHS.disc.rows[y]?.[x]).toBe('.');
  });
});

// ---------------------------------------------------------------------------
// DOM: the board names its mode; 'none' is byte-identical to the pre-D525 board
// ---------------------------------------------------------------------------

interface Serialized {
  readonly tag: string;
  readonly className: string;
  readonly attributes: readonly (readonly [string, string])[];
  readonly text: string | null;
  readonly src: string | null;
  readonly style: readonly (readonly [string, string])[];
  readonly children: readonly Serialized[];
}

type StyledElement = InteractiveTestElement & {
  src?: string;
  style?: { readonly declarations: Map<string, string>; setProperty(name: string, value: string): void };
};

function serialize(node: InteractiveTestElement): Serialized {
  const styled = node as StyledElement;
  return {
    tag: node.tagName,
    className: node.className,
    attributes: [...node.attributes.entries()].sort(([a], [b]) => a.localeCompare(b)),
    text: node.textContent,
    src: styled.src ?? null,
    style: [...(styled.style?.declarations.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b)),
    children: node.children.map(serialize),
  };
}

describe('D525 board DOM per mode', () => {
  let restoreDocument: () => void;
  let restoreCreate: () => void;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
    const original = document.createElement.bind(document);
    const patched = ((tag: string) => {
      const node = original(tag) as unknown as StyledElement;
      const declarations = new Map<string, string>();
      Object.defineProperty(node, 'style', {
        value: { declarations, setProperty: (name: string, value: string) => { declarations.set(name, value); } },
      });
      return node as unknown as HTMLElement;
    }) as typeof document.createElement;
    Object.defineProperty(document, 'createElement', { configurable: true, value: patched });
    restoreCreate = () => { Object.defineProperty(document, 'createElement', { configurable: true, value: original }); };
  });

  afterEach(() => {
    restoreCreate();
    restoreDocument();
  });

  const provenance = { revision: 1, round: 1, stateDigest: 'light-encoding-under-test' };

  it("names the mode in data-board-glyphs and leaves the player board unchanged under 'none'", () => {
    const byDefault = serialize(interactiveElement(renderBoard(litRoom)));
    const explicitNone = serialize(interactiveElement(renderBoard(litRoom, new Set(), null, undefined, 'none')));
    expect(JSON.stringify(explicitNone)).toBe(JSON.stringify(byDefault));
    expect(byDefault.attributes).toContainEqual(['data-board-glyphs', 'none']);
    const marks = (node: Serialized): number =>
      (node.className === 'encounter-light-mark' || node.className === 'encounter-board-glyph' ? 1 : 0) +
      node.children.reduce((sum, child) => sum + marks(child), 0);
    expect(marks(byDefault)).toBe(0);
    // the pre-D525 tint layers are still the only light DOM under 'none'
    const illumination = (node: Serialized): number =>
      (node.className.includes('encounter-mechanical-illumination') ? 1 : 0) + node.children.reduce((sum, child) => sum + illumination(child), 0);
    expect(illumination(byDefault)).toBe(12);

    for (const mode of ['light', 'full'] as const) {
      const board = interactiveElement(renderBoard(litRoom, new Set(), null, undefined, mode));
      expect(board.getAttribute('data-board-glyphs')).toBe(mode);
      const rendered = board.querySelectorAll('.encounter-light-mark');
      const expected = encounterBoardRenderModel(litRoom, artFor(mode)).filter((cell) => cell.light.mark !== null);
      expect(rendered.map((mark) => [mark.getAttribute('data-light-level'), mark.getAttribute('data-light-mark')]).sort())
        .toEqual(expected.map((cell) => [cell.light.level, cell.light.mark]).sort());
      // this room has no doors, blocked, fog or obscurement: the mode changes nothing but the light marks and the attribute
      expect(board.querySelectorAll('.encounter-board-glyph')).toHaveLength(0);
      const stripped = (node: Serialized): Serialized => ({
        ...node,
        attributes: node.attributes.filter(([name]) => name !== 'data-board-glyphs'),
        children: node.children.filter((child) => child.className !== 'encounter-light-mark').map(stripped),
      });
      expect(JSON.stringify(stripped(serialize(board)))).toBe(JSON.stringify(stripped(byDefault)));
    }
  });

  it('light: every non-default cell carries exactly one glyph element on the DM board, and the legend names the default', () => {
    const board = interactiveElement(renderBoard(litRoom, new Set(), null, provenance, 'light'));
    for (const cell of board.querySelectorAll('.encounter-cell')) {
      const cellKey = cell.getAttribute('data-cell') ?? '';
      const [column, row] = cellKey.split(',').map(Number);
      const level = expectedLevelAt({ column: column ?? -1, row: row ?? -1 });
      const glyphs = cell.querySelectorAll('.encounter-light-mark');
      expect(glyphs, cellKey).toHaveLength(level === 'bright' ? 0 : 1);
      if (level !== 'bright') expect(glyphs[0]?.getAttribute('data-light-mark')).toBe(LIGHT_GLYPH_BY_LEVEL[level]);
    }
    const legend = board.querySelector('[data-legend]');
    expect(legend?.getAttribute('data-board-glyphs')).toBe('light');
    expect(legend?.getAttribute('data-room-default-light')).toBe('bright');
    const keys = legend?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key')) ?? [];
    expect(keys).toContain('light-default');
    const markSwatches = legend?.querySelectorAll('.encounter-legend-swatch-mark') ?? [];
    expect(markSwatches).toHaveLength(4);
    expect(new Set(markSwatches.map((swatch) => (swatch as StyledElement).src)).size).toBe(4);
  });
});
