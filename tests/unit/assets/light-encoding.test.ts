/**
 * D525 light encodings. Pixel invariants here are what licenses the five new
 * overlay digests in expected-art-hashes.ts: the numbers are properties of
 * the intended drawing, never a pin refreshed from output.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OVERLAY_ASSETS } from '../../../src/assets/art-sets';
import { Bitmap, bayer2, bytesEqual } from '../../../src/assets/bitmap';
import {
  DEFAULT_LIGHT_ENCODING,
  LIGHT_ENCODINGS,
  LIGHT_GLYPH_BY_LEVEL,
  LIGHT_LEVELS,
  cellLightLevels,
  isLightEncoding,
  lightGlyphForLevel,
  lightMarkFor,
  roomDefaultLight,
  type LightEncoding,
  type LightLevel,
} from '../../../src/assets/light-encoding';
import { LIGHT_GLYPHS, LIGHT_GLYPH_ORIGIN, LIGHT_GLYPH_SIZE, outlineRows } from '../../../src/assets/light-glyphs';
import { paletteRgb } from '../../../src/assets/palette';
import {
  DIM_VEIL_ALPHA,
  DIM_VEIL_BAYER_LEVEL,
  FLOOR_VARIANTS,
  LIGHT_GLYPH_EFFECTS,
  LIGHT_VEIL_EFFECTS,
  TILE_SIZE,
  paintRecipe,
  type LightMarkEffect,
  type OverlayEffect,
} from '../../../src/assets/pixel-art';
import { combatantId } from '../../../src/combat/values';
import { renderBoard } from '../../../src/vtt/encounter-app';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import {
  encounterBoardRenderModel,
  roomDefaultLightOf,
  type EncounterBoardProjectionShape,
} from '../../../src/vtt/encounter-board';
import { decodeEncounterArtPackage } from '../../../src/vtt/encounter-package';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import { installInteractiveDocument, interactiveElement, type InteractiveTestElement } from '../../fixtures/interactive-dom';

// ---------------------------------------------------------------------------
// Pixel helpers (sRGB source-over as the browser composites, WCAG relative luminance)
// ---------------------------------------------------------------------------

function linearChannel(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an opaque pixel. */
function luminance(pixel: { readonly red: number; readonly green: number; readonly blue: number }): number {
  return 0.2126 * linearChannel(pixel.red) + 0.7152 * linearChannel(pixel.green) + 0.0722 * linearChannel(pixel.blue);
}

/** Absolute colourfulness (RGB max − min): what a viewer sees fade when stone is desaturated. */
function chroma(pixel: { readonly red: number; readonly green: number; readonly blue: number }): number {
  return Math.max(pixel.red, pixel.green, pixel.blue) - Math.min(pixel.red, pixel.green, pixel.blue);
}

/** Blue's share of the pixel's light; a cool cast raises it whatever the brightness. */
function blueShare(pixel: { readonly red: number; readonly green: number; readonly blue: number }): number {
  return pixel.blue / Math.max(1, pixel.red + pixel.green + pixel.blue);
}

function overlay(effect: OverlayEffect): Bitmap {
  return paintRecipe({ kind: 'overlay', effect });
}

function floorTile(variant: (typeof FLOOR_VARIANTS)[number]): Bitmap {
  return paintRecipe({ kind: 'floor', material: 'stone', variant });
}

/** The floor as the board shows it: the floor tile with the encoding's mark (if any) composited on top. */
function floorUnder(variant: (typeof FLOOR_VARIANTS)[number], mark: LightMarkEffect | null): Bitmap {
  const composite = new Bitmap(TILE_SIZE, TILE_SIZE);
  const floor = floorTile(variant);
  const top = mark === null ? null : overlay(mark);
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      composite.blendRgba(x, y, floor.get(x, y));
      if (top !== null) composite.blendRgba(x, y, top.get(x, y));
    }
  }
  return composite;
}

function meanOver(bitmap: Bitmap, measure: (pixel: ReturnType<Bitmap['get']>) => number): number {
  let total = 0;
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) total += measure(bitmap.get(x, y));
  }
  return total / (TILE_SIZE * TILE_SIZE);
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
  combatants: [
    { id: combatantId('combatant:hero'), name: 'Hero', kind: 'player_character', position: { column: 0, row: 0 } },
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

function artFor(encoding: LightEncoding) {
  return encounterArtForBoard(litRoom, encoding);
}

// ---------------------------------------------------------------------------

describe('D525 light encoding on the art package', () => {
  it('round-trips through the schema, defaults to tint when omitted, and rejects anything else', () => {
    for (const encoding of LIGHT_ENCODINGS) {
      const decoded = decodeEncounterArtPackage({ ...REFERENCE_ENCOUNTER_ART, lightEncoding: encoding });
      expect(decoded.lightEncoding).toBe(encoding);
    }
    const { lightEncoding: _omitted, ...withoutEncoding } = REFERENCE_ENCOUNTER_ART;
    expect(decodeEncounterArtPackage(withoutEncoding).lightEncoding).toBe('tint');
    expect(REFERENCE_ENCOUNTER_ART.lightEncoding).toBe(DEFAULT_LIGHT_ENCODING);
    expect(() => decodeEncounterArtPackage({ ...REFERENCE_ENCOUNTER_ART, lightEncoding: 'glow' })).toThrow();
    expect(isLightEncoding('inverse')).toBe(true);
    expect(isLightEncoding('Inverse')).toBe(false);
  });

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

  it('marks per encoding: tint never, inverse veils dim/dark only, symbol glyphs everything but the default', () => {
    for (const level of LIGHT_LEVELS) {
      for (const roomDefault of LIGHT_LEVELS) {
        expect(lightMarkFor('tint', level, roomDefault)).toBeNull();
        expect(lightMarkFor('inverse', level, roomDefault)).toBe(
          level === 'bright' ? null : level === 'dim' ? 'light-veil-dim' : 'light-veil-dark',
        );
        expect(lightMarkFor('symbol', level, roomDefault)).toBe(level === roomDefault ? null : LIGHT_GLYPH_BY_LEVEL[level]);
      }
    }
  });
});

describe('D525 render model per encoding on a room with bright, dim and dark regions', () => {
  it('records the effective level on every cell and the expected overlay per cell class', () => {
    for (const encoding of LIGHT_ENCODINGS) {
      const cells = encounterBoardRenderModel(litRoom, artFor(encoding));
      expect(cells).toHaveLength(24);
      for (const cell of cells) {
        const level = expectedLevelAt(cell);
        expect(cell.light.level, `${encoding} ${cell.key}`).toBe(level);
        expect(cell.light.mark, `${encoding} ${cell.key}`).toBe(lightMarkFor(encoding, level, 'bright'));
      }
    }
    const inverse = encounterBoardRenderModel(litRoom, artFor('inverse'));
    expect(inverse.filter((cell) => cell.light.mark === 'light-veil-dim').map((cell) => cell.key).sort())
      .toEqual([...DIM_BAND, OVERRIDDEN].map(key).sort());
    expect(inverse.filter((cell) => cell.light.mark === 'light-veil-dark').map((cell) => cell.key).sort())
      .toEqual(DARK_CORNER.map(key).sort());
    expect(inverse.filter((cell) => cell.light.level === 'bright').every((cell) => cell.light.mark === null)).toBe(true);
    // the tint illumination layers are still carried (the CSS hides them under the new encodings)
    expect(inverse.flatMap((cell) => cell.mechanicalLayers).filter((layer) => layer.kind === 'illumination')).toHaveLength(12);
  });

  it("symbol: every non-default cell has exactly one glyph and default cells have none; a dark room flips the default", () => {
    const symbol = encounterBoardRenderModel(litRoom, artFor('symbol'));
    const glyphs = new Set<string>(LIGHT_GLYPH_EFFECTS);
    for (const cell of symbol) {
      const marks = [cell.light.mark].filter((mark) => mark !== null && glyphs.has(mark));
      expect(marks, cell.key).toHaveLength(cell.light.level === 'bright' ? 0 : 1);
      if (cell.light.level !== 'bright') expect(cell.light.mark).toBe(LIGHT_GLYPH_BY_LEVEL[cell.light.level]);
    }
    expect(symbol.filter((cell) => cell.light.mark !== null)).toHaveLength(DIM_BAND.length + DARK_CORNER.length + 1);

    const darkRoom: EncounterBoardProjectionShape = {
      ...litRoom,
      environmentLightRegions: [
        { id: 'everywhere', level: 'darkness', cells: cellsOf(litRoom.bounds) },
        { id: 'torch', level: 'bright', cells: BRIGHT_POOL },
        { id: 'ember', level: 'dim', cells: [{ column: 0, row: 3 }] },
      ],
    };
    expect(roomDefaultLightOf(darkRoom)).toBe('darkness');
    const dark = encounterBoardRenderModel(darkRoom, encounterArtForBoard(darkRoom, 'symbol'));
    expect(dark.filter((cell) => cell.light.mark === 'light-glyph-bright').map((cell) => cell.key).sort()).toEqual(BRIGHT_POOL.map(key).sort());
    expect(dark.filter((cell) => cell.light.mark === 'light-glyph-dim').map((cell) => cell.key)).toEqual(['0,3']);
    expect(dark.filter((cell) => cell.light.mark === 'light-glyph-dark')).toHaveLength(0);
    expect(dark.filter((cell) => cell.light.mark === null)).toHaveLength(24 - 3);
  });
});

function cellsOf(bounds: { readonly columns: number; readonly rows: number }): { column: number; row: number }[] {
  const cells: { column: number; row: number }[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) cells.push({ column, row });
  }
  return cells;
}

describe('D525 inverse veils: pixel invariants', () => {
  it('a bright floor pixel is at least 1.6× the relative luminance of the same pixel under dark, on every floor slab', () => {
    const bright = lightMarkFor('inverse', 'bright', 'bright');
    const dark = lightMarkFor('inverse', 'darkness', 'bright');
    expect(dark).toBe('light-veil-dark');
    for (const variant of FLOOR_VARIANTS) {
      const lit = floorUnder(variant, bright);
      const veiled = floorUnder(variant, dark);
      let minimumRatio = Number.POSITIVE_INFINITY;
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          minimumRatio = Math.min(minimumRatio, luminance(lit.get(x, y)) / luminance(veiled.get(x, y)));
        }
      }
      expect(minimumRatio, `floor variant ${String(variant)}`).toBeGreaterThanOrEqual(1.6);
      // and the dim veil sits strictly between: darker than lit, brighter than dark, on average
      const dimmed = floorUnder(variant, lightMarkFor('inverse', 'dim', 'bright'));
      expect(meanOver(dimmed, luminance)).toBeLessThan(meanOver(lit, luminance));
      expect(meanOver(dimmed, luminance)).toBeGreaterThan(2 * meanOver(veiled, luminance));
    }
  });

  it('no overlay at all on bright cells: the lit floor is the plain flagstone byte for byte', () => {
    for (const variant of FLOOR_VARIANTS) {
      expect(bytesEqual(floorUnder(variant, lightMarkFor('inverse', 'bright', 'bright')).data, floorTile(variant).data)).toBe(true);
    }
  });

  it('dim veil is a 2×2 Bayer checker at 40 % cover; dark veil covers everything, desaturates and cools the stone', () => {
    const dim = overlay('light-veil-dim');
    let covered = 0;
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const pixel = dim.get(x, y);
        const expectedCovered = bayer2(x, y) < DIM_VEIL_BAYER_LEVEL;
        expect(pixel.alpha, `dim ${String(x)},${String(y)}`).toBe(expectedCovered ? DIM_VEIL_ALPHA : 0);
        if (expectedCovered) covered += 1;
      }
    }
    expect(covered).toBe((TILE_SIZE * TILE_SIZE) / 2);
    expect((covered * DIM_VEIL_ALPHA) / (TILE_SIZE * TILE_SIZE * 255)).toBeCloseTo(0.4, 2);

    const dark = overlay('light-veil-dark');
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) expect(dark.get(x, y).alpha, `dark ${String(x)},${String(y)}`).toBeGreaterThan(170);
    }
    for (const variant of FLOOR_VARIANTS) {
      const plain = floorTile(variant);
      const veiled = floorUnder(variant, 'light-veil-dark');
      expect(meanOver(veiled, chroma), `variant ${String(variant)} desaturates`).toBeLessThan(0.9 * meanOver(plain, chroma));
      expect(meanOver(veiled, blueShare), `variant ${String(variant)} cools`).toBeGreaterThan(meanOver(plain, blueShare) + 0.015);
    }
  });

  it('veils and glyphs are palette-closed: every opaque pixel is a palette colour or a blend of two of them', () => {
    // A veil pixel is one ink at one alpha, so its RGB must be exactly a palette colour.
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
    const dim = overlay('light-veil-dim');
    const dimInk = dim.get(0, 0);
    expect(dimInk.alpha).toBe(DIM_VEIL_ALPHA);
    expect(inks.has(JSON.stringify({ red: dimInk.red, green: dimInk.green, blue: dimInk.blue }))).toBe(true);
  });
});

describe('D525 symbol glyphs: pixel invariants', () => {
  it('each glyph tile carries exactly one mark in the top-left 9×9 box and nothing anywhere else', () => {
    for (const level of LIGHT_LEVELS) {
      const effect = LIGHT_GLYPH_BY_LEVEL[level];
      const tile = overlay(effect);
      const glyph = lightGlyphForLevel(level);
      const ring = outlineRows(glyph.rows);
      const boxStart = LIGHT_GLYPH_ORIGIN - 1;
      const boxEnd = LIGHT_GLYPH_ORIGIN + LIGHT_GLYPH_SIZE; // inclusive
      let inkPixels = 0;
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const pixel = tile.get(x, y);
          const inBox = x >= boxStart && x <= boxEnd && y >= boxStart && y <= boxEnd;
          if (!inBox) {
            expect(pixel.alpha, `${effect} outside box at ${String(x)},${String(y)}`).toBe(0);
            continue;
          }
          const gx = x - LIGHT_GLYPH_ORIGIN;
          const gy = y - LIGHT_GLYPH_ORIGIN;
          const isInk = glyph.rows[gy]?.[gx] === '#';
          const isRing = ring[gy + 1]?.[gx + 1] === '#';
          const expected = isInk ? paletteRgb(glyph.ink) : isRing ? paletteRgb(glyph.outline) : null;
          if (expected === null) {
            expect(pixel.alpha, `${effect} gap at ${String(x)},${String(y)}`).toBe(0);
          } else {
            expect({ red: pixel.red, green: pixel.green, blue: pixel.blue, alpha: pixel.alpha }, `${effect} at ${String(x)},${String(y)}`)
              .toEqual({ ...expected, alpha: 255 });
          }
          if (isInk) inkPixels += 1;
        }
      }
      expect(inkPixels).toBe(glyph.rows.join('').split('#').length - 1);
      expect(inkPixels).toBeGreaterThan(8);
    }
    const distinct = new Set(LIGHT_GLYPH_EFFECTS.map((effect) => Buffer.from(overlay(effect).data).toString('base64')));
    expect(distinct.size).toBe(3);
    expect(new Set(LIGHT_VEIL_EFFECTS.map((effect) => Buffer.from(overlay(effect).data).toString('base64'))).size).toBe(2);
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
// DOM: the board names its encoding; 'tint' is byte-identical to the pre-D525 board
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

describe('D525 board DOM per encoding', () => {
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

  it("names the encoding in data-light-encoding and leaves the player board unchanged under 'tint'", () => {
    const byDefault = serialize(interactiveElement(renderBoard(litRoom)));
    const explicitTint = serialize(interactiveElement(renderBoard(litRoom, new Set(), null, undefined, 'tint')));
    expect(JSON.stringify(explicitTint)).toBe(JSON.stringify(byDefault));
    expect(byDefault.attributes).toContainEqual(['data-light-encoding', 'tint']);
    const marks = (node: Serialized): number =>
      (node.className === 'encounter-light-mark' ? 1 : 0) + node.children.reduce((sum, child) => sum + marks(child), 0);
    expect(marks(byDefault)).toBe(0);
    // the pre-D525 tint layers are still the only light DOM under 'tint'
    const illumination = (node: Serialized): number =>
      (node.className.includes('encounter-mechanical-illumination') ? 1 : 0) + node.children.reduce((sum, child) => sum + illumination(child), 0);
    expect(illumination(byDefault)).toBe(12);

    for (const encoding of ['inverse', 'symbol'] as const) {
      const board = interactiveElement(renderBoard(litRoom, new Set(), null, undefined, encoding));
      expect(board.getAttribute('data-light-encoding')).toBe(encoding);
      const rendered = board.querySelectorAll('.encounter-light-mark');
      const expected = encounterBoardRenderModel(litRoom, artFor(encoding)).filter((cell) => cell.light.mark !== null);
      expect(rendered.map((mark) => [mark.getAttribute('data-light-level'), mark.getAttribute('data-light-mark')]).sort())
        .toEqual(expected.map((cell) => [cell.light.level, cell.light.mark]).sort());
      // the encoding changes nothing but the marks and the attribute
      const stripped = (node: Serialized): Serialized => ({
        ...node,
        attributes: node.attributes.filter(([name]) => name !== 'data-light-encoding'),
        children: node.children.filter((child) => child.className !== 'encounter-light-mark').map(stripped),
      });
      expect(JSON.stringify(stripped(serialize(board)))).toBe(JSON.stringify(stripped(byDefault)));
    }
  });

  it("symbol: every non-default cell carries exactly one glyph element on the DM board, and the legend names the default", () => {
    const board = interactiveElement(renderBoard(litRoom, new Set(), null, provenance, 'symbol'));
    for (const cell of board.querySelectorAll('.encounter-cell')) {
      const cellKey = cell.getAttribute('data-cell') ?? '';
      const [column, row] = cellKey.split(',').map(Number);
      const level = expectedLevelAt({ column: column ?? -1, row: row ?? -1 });
      const glyphs = cell.querySelectorAll('.encounter-light-mark');
      expect(glyphs, cellKey).toHaveLength(level === 'bright' ? 0 : 1);
      if (level !== 'bright') expect(glyphs[0]?.getAttribute('data-light-mark')).toBe(LIGHT_GLYPH_BY_LEVEL[level]);
    }
    const legend = board.querySelector('[data-legend]');
    expect(legend?.getAttribute('data-light-encoding')).toBe('symbol');
    expect(legend?.getAttribute('data-room-default-light')).toBe('bright');
    const keys = legend?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key')) ?? [];
    expect(keys).toContain('light-default');
    const markSwatches = legend?.querySelectorAll('.encounter-legend-swatch-mark') ?? [];
    expect(markSwatches).toHaveLength(3);
    expect(new Set(markSwatches.map((swatch) => (swatch as StyledElement).src)).size).toBe(3);
  });

  it('inverse: the legend rows show the veil tiles over the plain flagstone', () => {
    const board = interactiveElement(renderBoard(litRoom, new Set(), null, provenance, 'inverse'));
    const legend = board.querySelector('[data-legend]');
    const swatchOf = (legendKey: string): InteractiveTestElement | null =>
      legend?.querySelectorAll('.encounter-legend-item').find((item) => item.getAttribute('data-legend-key') === legendKey)
        ?.querySelector('.encounter-legend-swatch') ?? null;
    expect(swatchOf('bright')?.getAttribute('data-overlay-asset-id')).toBeNull();
    expect(swatchOf('dim')?.getAttribute('data-overlay-asset-id')).toBe(OVERLAY_ASSETS['light-veil-dim']);
    expect(swatchOf('darkness')?.getAttribute('data-overlay-asset-id')).toBe(OVERLAY_ASSETS['light-veil-dark']);
    expect(swatchOf('bright')?.getAttribute('data-floor-asset-id')).toBe('art.map.floor.stone.v1');
    expect(board.querySelectorAll('.encounter-light-mark').filter((mark) => mark.getAttribute('data-light-mark') === 'light-veil-dark'))
      .toHaveLength(DARK_CORNER.length);
  });
});
