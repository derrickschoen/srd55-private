import { assetId, type AssetId } from './ids';
import {
  BAND_SIDES,
  FLOOR_VARIANTS,
  OVERLAY_EFFECTS,
  WALL_PIECES,
  type BandSide,
  type DoorState,
  type FloorVariant,
  type OverlayEffect,
  type WallPiece,
} from './pixel-art';
import { STARTER_ART_INPUTS_BY_ID } from './starter-art-inputs';

/**
 * An encounter art package names ONE floor, ONE wall and ONE door asset (the
 * approved fixtures pin those ids). The board needs a family behind each: four
 * slab layouts, eight wall pieces, four door sides in two states. These sets
 * are the typed bridge; they are checked against the inputs at module load so
 * a family with a missing member fails here, not on a blank cell.
 */

export interface FloorSet {
  readonly variants: Readonly<Record<FloorVariant, AssetId>>;
}

export interface WallSet {
  readonly pieces: Readonly<Record<WallPiece, AssetId>>;
}

export interface DoorSet {
  readonly pieces: Readonly<Record<DoorState, Readonly<Record<BandSide, AssetId>>>>;
}

function checked(id: string): AssetId {
  const parsed = assetId(id);
  if (!STARTER_ART_INPUTS_BY_ID.has(parsed)) throw new Error(`Art set member ${id} is not a starter-art input.`);
  return parsed;
}

export const STONE_FLOOR_SET_ID: AssetId = checked('art.map.floor.stone.v1');
export const STONE_WALL_SET_ID: AssetId = checked('art.map.wall.stone.v1');
export const WOOD_DOOR_SET_ID: AssetId = checked('art.map.door.wood.v1');

const FLOOR_SETS: ReadonlyMap<AssetId, FloorSet> = new Map([[
  STONE_FLOOR_SET_ID,
  {
    variants: Object.fromEntries(FLOOR_VARIANTS.map((variant) => [
      variant,
      checked(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`),
    ])) as Record<FloorVariant, AssetId>,
  },
]]);

const WALL_SETS: ReadonlyMap<AssetId, WallSet> = new Map([[
  STONE_WALL_SET_ID,
  {
    pieces: Object.fromEntries(WALL_PIECES.map((piece) => [
      piece,
      checked(piece === 'n' ? 'art.map.wall.stone.v1' : `art.map.wall.stone-${piece}.v1`),
    ])) as Record<WallPiece, AssetId>,
  },
]]);

const DOOR_SETS: ReadonlyMap<AssetId, DoorSet> = new Map([[
  WOOD_DOOR_SET_ID,
  {
    pieces: {
      closed: Object.fromEntries(BAND_SIDES.map((side) => [
        side,
        checked(side === 'n' ? 'art.map.door.wood.v1' : `art.map.door.wood-${side}.v1`),
      ])) as Record<BandSide, AssetId>,
      open: Object.fromEntries(BAND_SIDES.map((side) => [
        side,
        checked(`art.map.door.wood-open-${side}.v1`),
      ])) as Record<BandSide, AssetId>,
    },
  },
]]);

export function floorSetFor(floor: AssetId): FloorSet {
  const set = FLOOR_SETS.get(floor);
  if (set === undefined) throw new Error(`No floor family is registered for ${floor}.`);
  return set;
}

export function wallSetFor(wall: AssetId): WallSet {
  const set = WALL_SETS.get(wall);
  if (set === undefined) throw new Error(`No wall family is registered for ${wall}.`);
  return set;
}

export function doorSetFor(door: AssetId): DoorSet {
  const set = DOOR_SETS.get(door);
  if (set === undefined) throw new Error(`No door family is registered for ${door}.`);
  return set;
}

export const SHADE_ASSETS: Readonly<Record<BandSide, AssetId>> = Object.fromEntries(
  BAND_SIDES.map((side) => [side, checked(`art.map.shade.${side}.v1`)]),
) as Record<BandSide, AssetId>;

export const OVERLAY_ASSETS: Readonly<Record<OverlayEffect, AssetId>> = Object.fromEntries(
  OVERLAY_EFFECTS.map((effect) => [effect, checked(`art.map.overlay.${effect}.v1`)]),
) as Record<OverlayEffect, AssetId>;

export const HIDDEN_FOCUS_ASSET_ID: AssetId = checked('art.focus.hidden.v1');

/** Which wall piece a perimeter cell shows; null for interior cells. */
export function wallPieceAt(
  column: number,
  row: number,
  bounds: { readonly columns: number; readonly rows: number },
): WallPiece | null {
  const north = row === 0;
  const south = row === bounds.rows - 1;
  const west = column === 0;
  const east = column === bounds.columns - 1;
  if (north && west) return 'nw';
  if (north && east) return 'ne';
  if (south && west) return 'sw';
  if (south && east) return 'se';
  if (north) return 'n';
  if (south) return 's';
  if (west) return 'w';
  if (east) return 'e';
  return null;
}

/**
 * The band a door cell sits in, or null when the cell is a corner, interior or
 * outside the bounds: none of those can hold a drawable door. The package
 * decoder turns null into a validation issue; the render model draws no door.
 */
export function doorSideAt(
  column: number,
  row: number,
  bounds: { readonly columns: number; readonly rows: number },
): BandSide | null {
  const piece = wallPieceAt(column, row, bounds);
  switch (piece) {
    case 'n': case 's': case 'w': case 'e': return piece;
    case 'nw': case 'ne': case 'sw': case 'se': case null: return null;
  }
}

/** Stable per-cell slab layout so the same room always shows the same floor. */
export function floorVariantAt(column: number, row: number): FloorVariant {
  const mixed = (Math.imul(column + 1, 73_856_093) ^ Math.imul(row + 1, 19_349_663)) >>> 0;
  const index = ((mixed >>> 8) ^ mixed) % FLOOR_VARIANTS.length;
  return FLOOR_VARIANTS[index] ?? 0;
}

/** Interior cells touching the perimeter get an ambient-occlusion band per touched wall. */
export function shadeSidesAt(
  column: number,
  row: number,
  bounds: { readonly columns: number; readonly rows: number },
): readonly BandSide[] {
  if (wallPieceAt(column, row, bounds) !== null) return [];
  const sides: BandSide[] = [];
  if (row === 1) sides.push('n');
  if (row === bounds.rows - 2) sides.push('s');
  if (column === 1) sides.push('w');
  if (column === bounds.columns - 2) sides.push('e');
  return sides;
}
