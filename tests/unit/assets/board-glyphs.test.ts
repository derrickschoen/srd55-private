/**
 * D525 glyph vocabulary. The structural invariants (one corner per family,
 * distinct silhouettes) and the pixel invariants on the five new overlay
 * tiles are what license their digests in expected-art-hashes.ts.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OVERLAY_ASSETS } from '../../../src/assets/art-sets';
import { Bitmap } from '../../../src/assets/bitmap';
import {
  BOARD_GLYPH_MODES,
  CELL_GLYPHS,
  CELL_GLYPH_HP_BAR_CLEARANCE,
  CELL_GLYPH_KINDS,
  CELL_GLYPH_MARGIN,
  CELL_GLYPH_SIZE,
  CELL_GLYPH_SLOT_PITCH,
  CORNER_GLYPH_FAMILIES,
  DEFAULT_BOARD_GLYPH_MODE,
  GLYPH_CORNERS,
  GLYPH_FAMILY_CORNER,
  HIDDEN_GLYPH,
  HIDDEN_GLYPH_LABEL,
  cellGlyphOrigin,
  cellGlyphsFor,
  drawsLightGlyphs,
  isBoardGlyphMode,
  type BoardGlyphMode,
  type CellGlyphKind,
} from '../../../src/assets/board-glyphs';
import { LIGHT_GLYPHS, LIGHT_GLYPH_KINDS, LIGHT_GLYPH_SIZE } from '../../../src/assets/light-glyphs';
import { paletteRgb } from '../../../src/assets/palette';
import {
  CELL_GLYPH_EFFECTS,
  CELL_GLYPH_EFFECT_BY_KIND,
  FOG_HATCH_ALPHA,
  FOG_HATCH_PITCH,
  TILE_SIZE,
  paintRecipe,
  type CellGlyphEffect,
} from '../../../src/assets/pixel-art';
import { hammingDistance, inkCount, outlineRows, padMark } from '../../../src/assets/pixel-mark';
import { combatantId, worldObjectId } from '../../../src/combat/values';
import {
  CELL_GLYPH_RING_BOTTOM_PX,
  HP_BAR_TOP_PX,
  LIFE_GLYPH_BELOW_DOOR_PX,
  LIFE_GLYPH_INSET_PX,
  legendEntriesFor,
} from '../../../src/vtt/board-chrome';
import { renderBoard } from '../../../src/vtt/encounter-app';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import {
  boardGlyphPresence,
  encounterBoardRenderModel,
  type EncounterBoardProjectionShape,
} from '../../../src/vtt/encounter-board';
import { decodeEncounterArtPackage } from '../../../src/vtt/encounter-package';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import { installInteractiveDocument, interactiveElement, type InteractiveTestElement } from '../../fixtures/interactive-dom';

/** 30 % of a 9×9 mark, rounded up: the silhouette gate the brief sets. */
const MINIMUM_DISTANCE_PX = Math.ceil(0.3 * CELL_GLYPH_SIZE * CELL_GLYPH_SIZE);

function key(cell: { readonly column: number; readonly row: number }): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

// ---------------------------------------------------------------------------
// The closed option
// ---------------------------------------------------------------------------

describe('D525 boardGlyphs option', () => {
  it('is a closed set with none as the default, and round-trips through the art package schema', () => {
    expect(BOARD_GLYPH_MODES).toEqual(['none', 'light', 'full']);
    expect(DEFAULT_BOARD_GLYPH_MODE).toBe('none');
    for (const mode of BOARD_GLYPH_MODES) {
      expect(decodeEncounterArtPackage({ ...REFERENCE_ENCOUNTER_ART, boardGlyphs: mode }).boardGlyphs).toBe(mode);
    }
    const { boardGlyphs: _omitted, ...withoutMode } = REFERENCE_ENCOUNTER_ART;
    expect(decodeEncounterArtPackage(withoutMode).boardGlyphs).toBe('none');
    expect(REFERENCE_ENCOUNTER_ART.boardGlyphs).toBe(DEFAULT_BOARD_GLYPH_MODE);
    for (const rejected of ['symbol', 'tint', 'inverse', 'Full', 'all']) {
      expect(() => decodeEncounterArtPackage({ ...REFERENCE_ENCOUNTER_ART, boardGlyphs: rejected }), rejected).toThrow();
      expect(isBoardGlyphMode(rejected), rejected).toBe(false);
    }
    expect(isBoardGlyphMode('full')).toBe(true);
    expect(drawsLightGlyphs('none')).toBe(false);
    expect(drawsLightGlyphs('light')).toBe(true);
    expect(drawsLightGlyphs('full')).toBe(true);
  });

  it('marks cells only under full, one glyph per qualifying fact, in a fixed order', () => {
    const everything = { door: 'open' as const, blocked: true, fogged: true, obscured: true };
    for (const mode of ['none', 'light'] as const) expect(cellGlyphsFor(mode, everything)).toEqual([]);
    expect(cellGlyphsFor('full', everything)).toEqual(['door-open', 'blocked', 'fog', 'obscured']);
    expect(cellGlyphsFor('full', { ...everything, door: 'closed' })).toEqual(['door-closed', 'blocked', 'fog', 'obscured']);
    expect(cellGlyphsFor('full', { door: null, blocked: false, fogged: false, obscured: false })).toEqual([]);
    expect(cellGlyphsFor('full', { door: null, blocked: false, fogged: true, obscured: false })).toEqual(['fog']);
  });
});

// ---------------------------------------------------------------------------
// Corners and silhouettes
// ---------------------------------------------------------------------------

describe('D525 glyph families own distinct corners and silhouettes', () => {
  it('assigns every corner family its own corner: no two families share one', () => {
    const corners = CORNER_GLYPH_FAMILIES.map((family) => GLYPH_FAMILY_CORNER[family]);
    expect(new Set(corners).size).toBe(CORNER_GLYPH_FAMILIES.length);
    expect(corners.every((corner) => (GLYPH_CORNERS as readonly string[]).includes(corner))).toBe(true);
    expect(GLYPH_FAMILY_CORNER.light).toBe('top-left');
    expect(GLYPH_FAMILY_CORNER.door).toBe('top-right');
    expect(GLYPH_FAMILY_CORNER.blocked).toBe('bottom-left');
    expect(GLYPH_FAMILY_CORNER.veil).toBe('bottom-right');
    // two kinds of the same family share the corner and differ by slot only when both can appear on one cell
    expect(CELL_GLYPHS['door-closed'].slot).toBe(CELL_GLYPHS['door-open'].slot);
    expect(CELL_GLYPHS.fog.slot).not.toBe(CELL_GLYPHS.obscured.slot);
  });

  it('places each kind in its family corner, the bottom row clear of the HP bar, and no two boxes overlap on one cell', () => {
    const boxes = CELL_GLYPH_KINDS.map((kind) => {
      const origin = cellGlyphOrigin(kind, TILE_SIZE);
      return { kind, x0: origin.x - 1, y0: origin.y - 1, x1: origin.x + CELL_GLYPH_SIZE, y1: origin.y + CELL_GLYPH_SIZE };
    });
    const near = CELL_GLYPH_MARGIN;
    const far = TILE_SIZE - CELL_GLYPH_MARGIN - CELL_GLYPH_SIZE;
    expect(cellGlyphOrigin('door-closed', TILE_SIZE)).toEqual({ x: far, y: near });
    expect(cellGlyphOrigin('door-open', TILE_SIZE)).toEqual({ x: far, y: near });
    expect(cellGlyphOrigin('blocked', TILE_SIZE)).toEqual({ x: near, y: far - CELL_GLYPH_HP_BAR_CLEARANCE });
    expect(cellGlyphOrigin('fog', TILE_SIZE)).toEqual({ x: far, y: far - CELL_GLYPH_HP_BAR_CLEARANCE });
    expect(cellGlyphOrigin('obscured', TILE_SIZE)).toEqual({ x: far - CELL_GLYPH_SLOT_PITCH, y: far - CELL_GLYPH_HP_BAR_CLEARANCE });
    for (const box of boxes) {
      expect(box.x0, box.kind).toBeGreaterThanOrEqual(0);
      expect(box.y0, box.kind).toBeGreaterThanOrEqual(0);
      expect(box.x1, box.kind).toBeLessThan(TILE_SIZE);
      expect(box.y1, box.kind).toBeLessThan(TILE_SIZE);
    }
    // the light glyph's box (top-left, 7 px at origin 2 with its ring) never meets a cell glyph's box
    const lightBox = { x0: 1, y0: 1, x1: 2 + LIGHT_GLYPH_SIZE, y1: 2 + LIGHT_GLYPH_SIZE };
    const disjoint = (a: typeof lightBox, b: typeof lightBox): boolean => a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0;
    for (const box of boxes) expect(disjoint(lightBox, box), `light vs ${box.kind}`).toBe(true);
    // the only pair that can share a cell AND a corner (fog + obscured) sits in different slots
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (CELL_GLYPHS[a.kind].family === 'door' && CELL_GLYPHS[b.kind].family === 'door') continue;
        expect(disjoint(a, b), `${a.kind} vs ${b.kind}`).toBe(true);
      }
    }
    // the chrome's HP bar starts below every bottom-row ring
    expect(CELL_GLYPH_RING_BOTTOM_PX).toBeLessThan(HP_BAR_TOP_PX);
  });

  it('keeps every 9×9 silhouette at least 30 % of pixels from every other mark, light glyphs included', () => {
    const marks = new Map<string, readonly string[]>();
    for (const kind of LIGHT_GLYPH_KINDS) marks.set(`light:${kind}`, padMark(LIGHT_GLYPHS[kind].rows, CELL_GLYPH_SIZE));
    for (const kind of CELL_GLYPH_KINDS) marks.set(kind, CELL_GLYPHS[kind].rows);
    marks.set('hidden', HIDDEN_GLYPH.rows);
    const names = [...marks.keys()];
    const failures: string[] = [];
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const left = names[i]!;
        const right = names[j]!;
        // the three light glyphs are 7×7 and were probed as a set (D525 'symbol'); they are compared at their own size below
        if (left.startsWith('light:') && right.startsWith('light:')) continue;
        const distance = hammingDistance(marks.get(left)!, marks.get(right)!);
        if (distance < MINIMUM_DISTANCE_PX) failures.push(`${left} vs ${right}: ${String(distance)} px`);
      }
    }
    expect(failures, `pairs closer than ${String(MINIMUM_DISTANCE_PX)} px`).toEqual([]);
    const lightMinimum = Math.ceil(0.3 * LIGHT_GLYPH_SIZE * LIGHT_GLYPH_SIZE);
    for (let i = 0; i < LIGHT_GLYPH_KINDS.length; i += 1) {
      for (let j = i + 1; j < LIGHT_GLYPH_KINDS.length; j += 1) {
        const left = LIGHT_GLYPH_KINDS[i]!;
        const right = LIGHT_GLYPH_KINDS[j]!;
        expect(hammingDistance(LIGHT_GLYPHS[left].rows, LIGHT_GLYPHS[right].rows), `${left} vs ${right}`).toBeGreaterThanOrEqual(lightMinimum);
      }
    }
    for (const kind of CELL_GLYPH_KINDS) expect(inkCount(CELL_GLYPHS[kind].rows), kind).toBeGreaterThan(12);
    expect(inkCount(HIDDEN_GLYPH.rows)).toBeGreaterThan(12);
  });

  it('draws the shapes the primer describes: a barred slab, an open frame with an arc, an X in a square, a flat-based cloud, two waves, a slashed eye', () => {
    const closed = CELL_GLYPHS['door-closed'].rows;
    expect(closed[4]).toBe('.#.....#.');
    expect(closed.filter((row) => row === '.#######.')).toHaveLength(8);
    const open = CELL_GLYPHS['door-open'].rows;
    expect(open[0]).toBe('#########');
    expect(open.every((row) => row.startsWith('#'))).toBe(true);
    expect(open[2]?.endsWith('.')).toBe(true);
    const blocked = CELL_GLYPHS.blocked.rows;
    expect(blocked[0]).toBe('#########');
    expect(blocked[8]).toBe('#########');
    expect(blocked[4]).toBe('#...#...#');
    expect(blocked.every((row) => row.startsWith('#') && row.endsWith('#'))).toBe(true);
    const fog = CELL_GLYPHS.fog.rows;
    expect(fog[7]).toBe('.########');
    expect(fog[5]).toBe('#.......#');
    const wave = CELL_GLYPHS.obscured.rows;
    expect(wave[2]).toBe(wave[6]);
    expect(wave[3]).toBe(wave[7]);
    expect(wave[4]).toBe('....#....');
    const eye = HIDDEN_GLYPH.rows;
    expect(eye[4]).toBe('#...#...#');
    for (let index = 0; index < CELL_GLYPH_SIZE; index += 1) expect(eye[index]?.[CELL_GLYPH_SIZE - 1 - index], `slash at ${String(index)}`).toBe('#');
    expect(HIDDEN_GLYPH_LABEL).toBe('HIDDEN');
    expect(CELL_GLYPH_KINDS.map((kind) => CELL_GLYPHS[kind].label)).toEqual(['DOOR CLOSED', 'DOOR OPEN', 'BLOCKED', 'FOG', 'OBSCURED']);
  });
});

// ---------------------------------------------------------------------------
// Tiles: pixel invariants that license the five digests
// ---------------------------------------------------------------------------

function overlay(effect: CellGlyphEffect): Bitmap {
  return paintRecipe({ kind: 'overlay', effect });
}

describe('D525 cell glyph tiles: pixel invariants', () => {
  it('each tile carries exactly its mark in its family corner box, the fog tile a hatch veil elsewhere, the rest nothing', () => {
    for (const kind of CELL_GLYPH_KINDS) {
      const effect = CELL_GLYPH_EFFECT_BY_KIND[kind];
      const tile = overlay(effect);
      const glyph = CELL_GLYPHS[kind];
      const ring = outlineRows(glyph.rows);
      const origin = cellGlyphOrigin(kind, TILE_SIZE);
      const hatchInk = paletteRgb({ ramp: 'neutral', step: 1 });
      let inkPixels = 0;
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const pixel = tile.get(x, y);
          const at = `${effect} at ${String(x)},${String(y)}`;
          const gx = x - origin.x;
          const gy = y - origin.y;
          const inBox = gx >= -1 && gx <= CELL_GLYPH_SIZE && gy >= -1 && gy <= CELL_GLYPH_SIZE;
          const isInk = inBox && glyph.rows[gy]?.[gx] === '#';
          const isRing = inBox && !isInk && ring[gy + 1]?.[gx + 1] === '#';
          if (isInk) {
            inkPixels += 1;
            expect({ red: pixel.red, green: pixel.green, blue: pixel.blue, alpha: pixel.alpha }, at).toEqual({ ...paletteRgb(glyph.ink), alpha: 255 });
          } else if (isRing) {
            expect({ red: pixel.red, green: pixel.green, blue: pixel.blue, alpha: pixel.alpha }, at).toEqual({ ...paletteRgb(glyph.outline), alpha: 255 });
          } else if (kind === 'fog' && (x + y) % FOG_HATCH_PITCH === 0) {
            expect({ red: pixel.red, green: pixel.green, blue: pixel.blue, alpha: pixel.alpha }, at).toEqual({ ...hatchInk, alpha: FOG_HATCH_ALPHA });
          } else {
            expect(pixel.alpha, at).toBe(0);
          }
        }
      }
      expect(inkPixels, kind).toBe(inkCount(glyph.rows));
    }
    expect(new Set(CELL_GLYPH_EFFECTS.map((effect) => Buffer.from(overlay(effect).data).toString('base64'))).size).toBe(CELL_GLYPH_EFFECTS.length);
    expect(CELL_GLYPH_KINDS.map((kind) => CELL_GLYPH_EFFECT_BY_KIND[kind])).toEqual(CELL_GLYPH_EFFECTS);
    for (const effect of CELL_GLYPH_EFFECTS) expect(OVERLAY_ASSETS[effect]).toBe(`art.map.overlay.${effect}.v1`);
  });

  it('the fog hatch is one dark diagonal line every six pixels and the obscured tile carries no veil of its own', () => {
    const fog = overlay('glyph-fog');
    const origin = cellGlyphOrigin('fog', TILE_SIZE);
    let hatched = 0;
    let clear = 0;
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const outsideBox = x < origin.x - 1 || x > origin.x + CELL_GLYPH_SIZE || y < origin.y - 1 || y > origin.y + CELL_GLYPH_SIZE;
        if (!outsideBox) continue;
        if (fog.get(x, y).alpha > 0) hatched += 1;
        else clear += 1;
      }
    }
    // one pixel in six along every row: a veil the eye reads as hatching, not a tint
    expect(hatched / (hatched + clear)).toBeGreaterThan(1 / 6 - 0.01);
    expect(hatched / (hatched + clear)).toBeLessThan(1 / 6 + 0.01);
    expect(FOG_HATCH_PITCH).toBe(6);
    expect(FOG_HATCH_ALPHA).toBeGreaterThan(100);
    const obscured = overlay('glyph-obscured');
    let opaque = 0;
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) if (obscured.get(x, y).alpha > 0) opaque += 1;
    }
    expect(opaque).toBe(inkCount(CELL_GLYPHS.obscured.rows) + inkCount(outlineRows(CELL_GLYPHS.obscured.rows)));
  });
});

// ---------------------------------------------------------------------------
// Render model and DOM on a fixture with every fact class
// ---------------------------------------------------------------------------

const HERO = combatantId('combatant:hero');
const FOE = combatantId('combatant:foe');
const SCOUT = combatantId('combatant:scout');
const OPEN_DOOR = { column: 0, row: 2 };
const CLOSED_DOOR = { column: 5, row: 2 };
const BLOCKED_CELL = { column: 5, row: 3 };
const FOGGED_CELL = { column: 4, row: 3 };
const SMOKE_CELLS = [{ column: 3, row: 1 }, FOGGED_CELL];

function doorObject(id: string, name: string, cell: { readonly column: number; readonly row: number }, open: boolean) {
  return {
    id: worldObjectId(`world-object:${id}`),
    name,
    kind: 'door' as const,
    position: cell,
    cells: [cell],
    blocking: { movement: !open, lineOfSight: !open, cover: open ? 'none' as const : 'total' as const },
    lightClass: 'none' as const,
  };
}

const everyClass: EncounterBoardProjectionShape = {
  bounds: { columns: 6, rows: 4 },
  combatants: [
    { id: HERO, name: 'Hero', kind: 'player_character', position: { column: 1, row: 1 }, life: 'living', hitPointBand: { kind: 'perceived_band', band: 'uninjured' } },
    { id: FOE, name: 'Lurking Foe', kind: 'monster', position: { column: 2, row: 2 }, life: 'living', hitPointBand: { kind: 'unknown' }, hiddenFromPlayers: true },
    { id: SCOUT, name: 'Scout', kind: 'player_character', position: OPEN_DOOR, life: 'living', hitPointBand: { kind: 'perceived_band', band: 'bloodied' } },
  ],
  highlightedCombatant: null,
  adjudicatedTargets: [],
  blockedCells: [BLOCKED_CELL],
  foggedCells: [FOGGED_CELL],
  obscurementRegions: [{ id: 'smoke', obscurement: 'heavy', cells: SMOKE_CELLS }],
  environmentLightRegions: [
    { id: 'dim', level: 'dim', cells: [{ column: 1, row: 0 }] },
    { id: 'dark', level: 'darkness', cells: [{ column: 2, row: 0 }] },
  ],
  worldObjects: [
    doorObject('open-door', 'Open Oak Door', OPEN_DOOR, true),
    doorObject('closed-door', 'Closed Iron Door', CLOSED_DOOR, false),
  ],
};

function expectedGlyphsAt(cell: { readonly column: number; readonly row: number }): readonly CellGlyphKind[] {
  const k = key(cell);
  return [
    ...(k === key(OPEN_DOOR) ? ['door-open' as const] : []),
    ...(k === key(CLOSED_DOOR) ? ['door-closed' as const] : []),
    ...(k === key(BLOCKED_CELL) ? ['blocked' as const] : []),
    ...(k === key(FOGGED_CELL) ? ['fog' as const] : []),
    ...(SMOKE_CELLS.some((smoke) => key(smoke) === k) ? ['obscured' as const] : []),
  ];
}

describe('D525 render model under each mode on a room with every fact class', () => {
  it("full: every qualifying cell carries exactly one glyph per fact in its family's corner; none and light carry no cell glyphs", () => {
    for (const mode of ['none', 'light'] as const) {
      const cells = encounterBoardRenderModel(everyClass, encounterArtForBoard(everyClass, mode));
      expect(cells.every((cell) => cell.glyphs.length === 0), mode).toBe(true);
      expect(boardGlyphPresence(cells, everyClass.combatants)).toEqual({ cells: [], hidden: true });
    }
    const art = encounterArtForBoard(everyClass, 'full');
    const cells = encounterBoardRenderModel(everyClass, art);
    expect(cells).toHaveLength(24);
    for (const cell of cells) {
      expect(cell.glyphs.map((glyph) => glyph.kind), cell.key).toEqual(expectedGlyphsAt(cell));
      for (const glyph of cell.glyphs) expect(glyph.effect).toBe(CELL_GLYPH_EFFECT_BY_KIND[glyph.kind]);
      // one glyph per family per cell: a cell never carries two marks that would share a corner slot
      const slots = cell.glyphs.map((glyph) => `${GLYPH_FAMILY_CORNER[CELL_GLYPHS[glyph.kind].family]}/${String(CELL_GLYPHS[glyph.kind].slot)}`);
      expect(new Set(slots).size, cell.key).toBe(slots.length);
    }
    const counts = Object.fromEntries(CELL_GLYPH_KINDS.map((kind) => [kind, cells.filter((cell) => cell.glyphs.some((glyph) => glyph.kind === kind)).length]));
    expect(counts).toEqual({ 'door-closed': 1, 'door-open': 1, blocked: 1, fog: 1, obscured: 2 });
    expect(boardGlyphPresence(cells, everyClass.combatants)).toEqual({ cells: [...CELL_GLYPH_KINDS], hidden: true });
    // Door art and door glyphs have the same engine-owned source of truth.
    const drawnDoors = cells.filter((cell) => cell.layers.some((layer) => layer.role === 'door'));
    expect(drawnDoors.map((cell) => cell.key).sort()).toEqual(['0,2', '5,2']);
    expect(drawnDoors.map((cell) => cell.layers.find((layer) => layer.role === 'door')?.assetId).sort())
      .toEqual(['art.map.door.wood-e.v1', 'art.map.door.wood-open-w.v1']);
    const decorativeCell = cells.find((cell) => cell.column === art.room.doorCell.column && cell.row === art.room.doorCell.row);
    expect(decorativeCell?.layers.some((layer) => layer.role === 'door')).toBe(false);
    expect(decorativeCell?.layers.some((layer) => layer.role === 'wall')).toBe(true);
    // the light glyphs still ride alongside
    expect(cells.filter((cell) => cell.light.mark !== null).map((cell) => cell.key).sort()).toEqual(['1,0', '2,0']);
  });

  it('a door footprint wider than one cell marks every cell it covers, and the last door to claim a cell decides its state', () => {
    const wide = {
      ...everyClass,
      worldObjects: [{
        ...doorObject('double', 'Double Door', { column: 3, row: 3 }, false),
        cells: [{ column: 3, row: 3 }, { column: 4, row: 3 }],
      }],
    };
    const cells = encounterBoardRenderModel(wide, encounterArtForBoard(wide, 'full'));
    expect(cells.filter((cell) => cell.glyphs.some((glyph) => glyph.kind === 'door-closed')).map((cell) => cell.key)).toEqual(['3,3', '4,3']);
    expect(cells.find((cell) => cell.key === '4,3')?.glyphs.map((glyph) => glyph.kind)).toEqual(['door-closed', 'fog', 'obscured']);
  });
});

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

function styleOf(node: InteractiveTestElement | null | undefined, property: string): number {
  const value = node?.getAttribute('style')?.match(new RegExp(`(?:^|;)${property}:(-?\\d+)px`, 'u'))?.[1];
  if (value === undefined) throw new Error(`No ${property} on ${node?.className ?? 'nothing'}.`);
  return Number(value);
}

describe('D525 board DOM under each mode on a room with every fact class', () => {
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

  const provenance = { revision: 1, round: 1, stateDigest: 'board-glyphs-under-test' };

  it("player board: 'none' is the unmarked board, and 'full' adds nothing but glyph elements and the attribute", () => {
    const byDefault = serialize(interactiveElement(renderBoard(everyClass)));
    const explicitNone = serialize(interactiveElement(renderBoard(everyClass, new Set(), null, undefined, 'none')));
    expect(JSON.stringify(explicitNone)).toBe(JSON.stringify(byDefault));
    expect(byDefault.attributes).toContainEqual(['data-board-glyphs', 'none']);
    const count = (node: Serialized, className: string): number =>
      (node.className === className ? 1 : 0) + node.children.reduce((sum, child) => sum + count(child, className), 0);
    expect(count(byDefault, 'encounter-board-glyph')).toBe(0);
    expect(count(byDefault, 'encounter-light-mark')).toBe(0);

    const full = interactiveElement(renderBoard(everyClass, new Set(), null, undefined, 'full'));
    expect(full.getAttribute('data-board-glyphs')).toBe('full');
    for (const cell of full.querySelectorAll('.encounter-cell')) {
      const [column, row] = (cell.getAttribute('data-cell') ?? '').split(',').map(Number);
      const expected = expectedGlyphsAt({ column: column ?? -1, row: row ?? -1 });
      const marks = cell.querySelectorAll('.encounter-board-glyph');
      expect(marks.map((mark) => mark.getAttribute('data-glyph-kind')), cell.getAttribute('data-cell') ?? '').toEqual(expected);
      expect(marks.map((mark) => mark.getAttribute('data-glyph-effect'))).toEqual(expected.map((kind) => CELL_GLYPH_EFFECT_BY_KIND[kind]));
    }
    const stripped = (node: Serialized): Serialized => ({
      ...node,
      attributes: node.attributes.filter(([name]) => name !== 'data-board-glyphs'),
      children: node.children
        .filter((child) => child.className !== 'encounter-board-glyph' && child.className !== 'encounter-light-mark')
        .map(stripped),
    });
    expect(JSON.stringify(stripped(serialize(full)))).toBe(JSON.stringify(stripped(byDefault)));
  });

  it("DM board under 'full': the legend lists exactly the families present, the hidden creature gets its mark and tag, and the life glyph clears the door mark", () => {
    const dm = interactiveElement(renderBoard(everyClass, new Set(), null, provenance, 'full'));
    const legend = dm.querySelector('[data-legend]');
    expect(legend?.getAttribute('data-board-glyphs')).toBe('full');
    const keys = legend?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key')) ?? [];
    expect(keys).toEqual([
      'side-party', 'side-foe', 'hidden', 'difficult', 'obscured',
      'bright', 'dim', 'darkness', 'light-default',
      'fog', 'blocked', 'door-closed', 'door-open',
      'object', 'light-source', 'hp-uninjured', 'hp-bloodied', 'hp-near-death', 'hp-unknown',
    ]);
    const markRows = legend?.querySelectorAll('.encounter-legend-mark').map((item) => item.getAttribute('data-legend-key')) ?? [];
    expect(markRows).toEqual(['hidden', 'obscured', 'bright', 'dim', 'darkness', 'fog', 'blocked', 'door-closed', 'door-open', 'object']);
    expect(new Set(legend?.querySelectorAll('.encounter-legend-swatch-mark').map((swatch) => (swatch as StyledElement).src)).size).toBe(markRows.length);
    expect(legendEntriesFor('full', 'bright', boardGlyphPresence(
      encounterBoardRenderModel(everyClass, encounterArtForBoard(everyClass, 'full')), everyClass.combatants,
    )).map((entry) => entry.key)).toEqual(keys);

    // the hidden creature: eye-slash on the plate rim, HIDDEN inside the plate, the dashed ring as before
    const eyes = dm.querySelectorAll('.encounter-hidden-glyph');
    expect(eyes.map((eye) => eye.getAttribute('data-combatant-id'))).toEqual([FOE]);
    expect(styleOf(eyes[0], 'left')).toBe(24 + 2 * 64 + 1 - 1);
    expect(styleOf(eyes[0], 'top')).toBe(24 + 2 * 64 + 29 - 1);
    expect(styleOf(eyes[0], 'width')).toBe(CELL_GLYPH_SIZE + 2);
    expect(dm.querySelectorAll('.encounter-hidden-ring').map((ring) => ring.getAttribute('data-combatant-id'))).toEqual([FOE]);
    const plates = dm.querySelectorAll('.encounter-nameplate');
    const foePlate = plates.find((plate) => plate.getAttribute('data-combatant-id') === FOE);
    expect(foePlate?.getAttribute('data-tag')).toBe('HIDDEN');
    expect(foePlate?.className).toBe('encounter-nameplate encounter-nameplate-tagged');
    expect(foePlate?.querySelectorAll('.encounter-nameplate-tag').map((tag) => tag.getAttribute('data-tag'))).toEqual(['HIDDEN']);
    expect(plates.filter((plate) => plate.getAttribute('data-tag') !== null)).toHaveLength(1);
    expect(dm.querySelectorAll('.encounter-nameplate-tag')).toHaveLength(1);

    // the scout stands in the open doorway: its life glyph drops below the door mark; the hero's does not
    const lifeOf = (id: string) => dm.querySelectorAll('.encounter-life-glyph').find((glyph) => glyph.getAttribute('data-combatant-id') === id);
    expect(styleOf(lifeOf(SCOUT), 'top')).toBe(24 + OPEN_DOOR.row * 64 + LIFE_GLYPH_BELOW_DOOR_PX);
    expect(styleOf(lifeOf(HERO), 'top')).toBe(24 + 1 * 64 + LIFE_GLYPH_INSET_PX);
    expect(LIFE_GLYPH_BELOW_DOOR_PX).toBeGreaterThan(CELL_GLYPH_MARGIN + CELL_GLYPH_SIZE);
    // the HP bar sits below every bottom-row glyph ring
    for (const bar of dm.querySelectorAll('.encounter-hp-bar')) {
      expect((styleOf(bar, 'top') - 24) % 64).toBe(HP_BAR_TOP_PX);
    }
  });

  it("DM board under 'light': no vocabulary, no hidden mark or tag, life glyphs at the D516 inset, the D516 legend rows", () => {
    const dm = interactiveElement(renderBoard(everyClass, new Set(), null, provenance, 'light'));
    expect(dm.querySelectorAll('.encounter-board-glyph')).toHaveLength(0);
    expect(dm.querySelectorAll('.encounter-hidden-glyph')).toHaveLength(0);
    expect(dm.querySelectorAll('.encounter-nameplate-tag')).toHaveLength(0);
    expect(dm.querySelectorAll('.encounter-nameplate').every((plate) => plate.getAttribute('data-tag') === null && plate.className === 'encounter-nameplate')).toBe(true);
    expect(dm.querySelectorAll('.encounter-hidden-ring')).toHaveLength(1);
    for (const glyph of dm.querySelectorAll('.encounter-life-glyph')) expect((styleOf(glyph, 'top') - 24) % 64).toBe(LIFE_GLYPH_INSET_PX);
    const keys = dm.querySelector('[data-legend]')?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key')) ?? [];
    expect(keys).toEqual(legendEntriesFor('light', 'bright', { cells: [], hidden: false }).map((entry) => entry.key));
    expect(keys).not.toContain('door-closed');
  });

  it("DM board under 'full' on a room with nothing to mark lists no vocabulary rows, and a closed door alone lists only DOOR CLOSED", () => {
    const bare: EncounterBoardProjectionShape = {
      bounds: { columns: 6, rows: 4 },
      combatants: [{ id: HERO, name: 'Hero', kind: 'player_character', position: { column: 1, row: 1 } }],
      highlightedCombatant: null,
      adjudicatedTargets: [],
    };
    const keysOf = (projection: EncounterBoardProjectionShape): readonly (string | null)[] =>
      interactiveElement(renderBoard(projection, new Set(), null, provenance, 'full'))
        .querySelector('[data-legend]')?.querySelectorAll('.encounter-legend-item').map((item) => item.getAttribute('data-legend-key')) ?? [];
    const bareKeys = keysOf(bare);
    for (const absent of ['hidden', 'obscured', 'fog', 'blocked', 'door-closed', 'door-open']) expect(bareKeys).not.toContain(absent);
    expect(bareKeys).toEqual(['side-party', 'side-foe', 'difficult', 'bright', 'dim', 'darkness', 'light-default', 'object', 'light-source', 'hp-uninjured', 'hp-bloodied', 'hp-near-death', 'hp-unknown']);
    const closedOnly = keysOf({ ...bare, worldObjects: [doorObject('closed-door', 'Closed Iron Door', CLOSED_DOOR, false)] });
    expect(closedOnly).toContain('door-closed');
    expect(closedOnly).not.toContain('door-open');
  });
});
